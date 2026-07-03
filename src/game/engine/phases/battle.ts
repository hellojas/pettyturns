import { LEADERS } from '../../data/leaders';
import { TERRITORIES } from '../../data/territories';
import type {
  AllowedAction,
  BattlePlan,
  BattleResolution,
  CallTraitorAction,
  ChooseBattleAction,
  GameState,
  PendingBattle,
  PlayerId,
  SubmitBattlePlanAction,
  TurnAction,
  ValidationResult,
} from '../../types';
import { fail, ok } from '../../types';
import { forcesInBattle, validateBattlePlan } from '../combat/planLegality';
import { resolveBattle } from '../combat/resolveBattle';
import { appendLog, privateTo } from '../log';
import { getPlayer, sendToTanks, stormOrder } from '../state';
import type { PhaseModule } from './module';

/**
 * Battle phase.
 *
 * Contested territories (two or more factions with fighting forces, polar sink
 * excluded) each produce a battle. The player earliest in storm order is the
 * aggressor and chooses which of their battles to fight first. Both combatants
 * secretly commit battle plans; plans reveal simultaneously once both are in.
 * If a revealed enemy leader matches a traitor card, its holder may call the
 * traitor before resolution.
 *
 * MVP TEMPORARY SHORTCUTS (documented deviations to finish later):
 *  - battles pair off two at a time in storm order in territories with 3+ factions
 *  - a storm sector dividing a territory does not yet split the combatants
 *  - allies are not yet prevented from occupying/battling together
 */

function detectBattles(state: GameState): PendingBattle[] {
  const order = stormOrder(state);
  const byFaction = (playerId: PlayerId) => getPlayer(state, playerId).factionId;
  const battles: PendingBattle[] = [];
  const territories = new Set(state.stacks.map((s) => s.territoryId));
  let n = 0;
  for (const territoryId of territories) {
    if (TERRITORIES[territoryId].kind === 'polarSink') continue; // sanctuary: no battles here
    const present = order.filter((p) =>
      state.stacks.some(
        (s) => s.factionId === byFaction(p) && s.territoryId === territoryId && !s.isAdvisor && s.forces + s.specialForces > 0,
      ),
    );
    for (let i = 0; i + 1 < present.length; i += 1) {
      battles.push({
        id: `battle:${state.round}:${n++}`,
        territoryId,
        aggressor: present[0],
        defender: present[i + 1],
        plans: {},
        preBattleSteps: [],
        resolved: false,
      });
    }
  }
  return battles;
}

function activeBattle(state: GameState): PendingBattle | null {
  const bp = state.battlePhase;
  if (!bp) return null;
  return bp.battles.find((b) => b.id === bp.activeBattleId) ?? null;
}

function nextUnresolved(state: GameState): PendingBattle | undefined {
  return state.battlePhase?.battles.find((b) => !b.resolved);
}

function bothPlansIn(battle: PendingBattle): boolean {
  return battle.plans[battle.aggressor] !== undefined && battle.plans[battle.defender] !== undefined;
}

function traitorOptions(state: GameState, viewer: PlayerId, opponentPlan: BattlePlan): string[] {
  if (!opponentPlan.leaderId) return [];
  const traitors = state.hidden[viewer].traitors.map((t) => t.leaderId);
  return traitors.includes(opponentPlan.leaderId) ? [opponentPlan.leaderId] : [];
}

/** After both plans are in: either queue traitor calls or resolve immediately. */
function onPlansComplete(state: GameState, battle: PendingBattle): GameState {
  const agg = battle.plans[battle.aggressor]!;
  const def = battle.plans[battle.defender]!;
  let next = appendLog(state, {
    event: 'battle.revealed',
    text: `Battle plans revealed in ${TERRITORIES[battle.territoryId].name}.`,
    data: {
      battleId: battle.id,
      plans: {
        [battle.aggressor]: { leaderId: agg.leaderId, dial: agg.dial, weapon: agg.weaponCardId, defense: agg.defenseCardId },
        [battle.defender]: { leaderId: def.leaderId, dial: def.dial, weapon: def.weaponCardId, defense: def.defenseCardId },
      },
    },
  });

  const callers: PlayerId[] = [];
  if (traitorOptions(next, battle.aggressor, def).length > 0) callers.push(battle.aggressor);
  if (traitorOptions(next, battle.defender, agg).length > 0) callers.push(battle.defender);
  if (callers.length > 0) {
    return {
      ...next,
      pendingDecisions: [
        ...next.pendingDecisions,
        {
          id: `traitor:${battle.id}`,
          kind: 'traitorCall',
          waitingFor: callers,
          committed: {},
          context: { battleId: battle.id },
          createdOnRound: next.round,
        },
      ],
    };
  }
  return applyResolution(next, battle, { [battle.aggressor]: false, [battle.defender]: false });
}

function applyResolution(
  state: GameState,
  battle: PendingBattle,
  calls: Record<PlayerId, boolean>,
): GameState {
  const agg = battle.plans[battle.aggressor]!;
  const def = battle.plans[battle.defender]!;
  const outcome = resolveBattle(
    state,
    battle,
    {
      playerId: battle.aggressor,
      plan: agg,
      forcesInTerritory: forcesInBattle(state, battle.aggressor, battle.territoryId),
      traitorLeaderIds: state.hidden[battle.aggressor].traitors.map((t) => t.leaderId),
      callsTraitor: calls[battle.aggressor] ?? false,
    },
    {
      playerId: battle.defender,
      plan: def,
      forcesInTerritory: forcesInBattle(state, battle.defender, battle.territoryId),
      traitorLeaderIds: state.hidden[battle.defender].traitors.map((t) => t.leaderId),
      callsTraitor: calls[battle.defender] ?? false,
    },
  );

  let next = state;

  // force losses: remove from the territory, send to tanks
  for (const pid of [battle.aggressor, battle.defender]) {
    const lost = outcome.forcesLost[pid] ?? 0;
    if (lost <= 0) continue;
    const faction = getPlayer(next, pid).factionId;
    let remaining = lost;
    const stacks = next.stacks.map((s) => {
      if (s.factionId !== faction || s.territoryId !== battle.territoryId || remaining <= 0) return s;
      const takeForces = Math.min(s.forces, remaining);
      remaining -= takeForces;
      const takeSpecial = Math.min(s.specialForces, remaining);
      remaining -= takeSpecial;
      return { ...s, forces: s.forces - takeForces, specialForces: s.specialForces - takeSpecial };
    });
    next = { ...next, stacks: stacks.filter((s) => s.forces + s.specialForces > 0) };
    next = sendToTanks(next, pid, lost, 0); // MVP: tanks do not yet distinguish special forces lost in battle
  }

  // leader deaths
  for (const killed of outcome.leadersKilled) {
    const owner = next.players[killed.owner];
    next = {
      ...next,
      players: {
        ...next.players,
        [killed.owner]: {
          ...owner,
          leadersAlive: owner.leadersAlive.filter((l) => l !== killed.leaderId),
          leadersDead: [...owner.leadersDead, { leaderId: killed.leaderId, faceUp: true }],
        },
      },
    };
  }

  // spice for slain leaders (from the bank)
  for (const [pid, amount] of Object.entries(outcome.spiceForLeaders)) {
    if (amount > 0) {
      next = {
        ...next,
        players: { ...next.players, [pid]: { ...next.players[pid], spice: next.players[pid].spice + amount } },
      };
    }
  }

  // discards: remove from hands, add to discard pile
  for (const cardId of outcome.cardsDiscarded) {
    next = {
      ...next,
      hidden: Object.fromEntries(
        Object.entries(next.hidden).map(([pid, h]) => [pid, { ...h, hand: h.hand.filter((c) => c.id !== cardId) }]),
      ),
      decks: { ...next.decks, treacheryDiscard: [...next.decks.treacheryDiscard, cardId] },
    };
  }

  const resolution: BattleResolution = {
    battleId: battle.id,
    territoryId: battle.territoryId,
    winner: outcome.winner,
    loser: outcome.loser,
    traitorCalled: outcome.traitorCalled
      ? { by: outcome.traitorCalled.by, leaderId: outcome.traitorCalled.leaderId }
      : undefined,
    leadersKilled: outcome.leadersKilled.map((l) => l.leaderId),
    forcesLost: outcome.forcesLost,
    cardsDiscarded: outcome.cardsDiscarded,
    spicePaid: Object.entries(outcome.spiceForLeaders).map(([to, amount]) => ({
      from: 'bank' as const,
      to,
      amount,
      reason: 'slain leaders',
    })),
    detail: outcome.detail,
  };

  next = {
    ...next,
    battlePhase: {
      ...next.battlePhase!,
      battles: next.battlePhase!.battles.map((b) => (b.id === battle.id ? { ...b, resolved: true } : b)),
      activeBattleId: null,
      resolutions: [...next.battlePhase!.resolutions, resolution],
    },
    pendingDecisions: next.pendingDecisions.filter((d) => d.id !== `traitor:${battle.id}`),
  };

  const winnerName = outcome.winner ? next.players[outcome.winner].name : 'no one';
  next = appendLog(next, {
    event: 'battle.resolved',
    text: `Battle in ${TERRITORIES[battle.territoryId].name}: ${winnerName} prevails. ${outcome.detail}${
      outcome.leadersKilled.length > 0
        ? ` Leaders slain: ${outcome.leadersKilled.map((l) => LEADERS[l.leaderId].name).join(', ')}.`
        : ''
    }`,
    data: { resolution },
  });

  // stage the next battle, if any
  const upNext = nextUnresolved(next);
  if (upNext) {
    next = { ...next, battlePhase: { ...next.battlePhase!, activeBattleId: upNext.id } };
    next = appendLog(next, {
      event: 'battle.next',
      text: `Next battle: ${TERRITORIES[upNext.territoryId].name} — ${next.players[upNext.aggressor].name} vs ${next.players[upNext.defender].name}.`,
    });
  }
  return next;
}

export const battlePhase: PhaseModule = {
  phase: 'battle',

  onEnter(state): GameState {
    const battles = detectBattles(state);
    let next: GameState = {
      ...state,
      battlePhase: { battles, activeBattleId: battles[0]?.id ?? null, resolutions: [] },
    };
    next = appendLog(next, {
      event: 'battle.begin',
      text:
        battles.length > 0
          ? `Battle phase: ${battles.length} battle(s) to fight.`
          : 'Battle phase: no contested territories.',
      data: { battles: battles.map((b) => ({ id: b.id, territoryId: b.territoryId, aggressor: b.aggressor, defender: b.defender })) },
    });
    if (battles.length > 0) {
      const b = battles[0];
      next = appendLog(next, {
        event: 'battle.next',
        text: `First battle: ${TERRITORIES[b.territoryId].name} — ${next.players[b.aggressor].name} vs ${next.players[b.defender].name}.`,
      });
    }
    return next;
  },

  getAllowedActions(state, playerId): AllowedAction[] {
    const battle = activeBattle(state);
    if (!battle) return [];
    const pendingCall = state.pendingDecisions.find((d) => d.id === `traitor:${battle.id}`);
    if (pendingCall) {
      if (pendingCall.waitingFor.includes(playerId) && pendingCall.committed[playerId] === undefined)
        return [{ type: 'battle/callTraitor', label: 'The enemy leader is your traitor — call it?', params: { battleId: battle.id } }];
      return [];
    }
    if ((playerId === battle.aggressor || playerId === battle.defender) && !battle.plans[playerId]) {
      return [
        {
          type: 'battle/submitPlan',
          label: 'Secretly commit your battle plan',
          params: {
            battleId: battle.id,
            maxDial: forcesInBattle(state, playerId, battle.territoryId),
            leaders: getPlayer(state, playerId).leadersAlive,
          },
        },
      ];
    }
    return [];
  },

  validateAction(state, action): ValidationResult {
    const playerId = action.playerId as PlayerId;
    switch (action.type) {
      case 'battle/submitPlan': {
        const a = action as SubmitBattlePlanAction;
        const battle = activeBattle(state);
        if (!battle || battle.id !== a.battleId) return fail('no-battle', 'That battle is not being fought right now.');
        if (playerId !== battle.aggressor && playerId !== battle.defender)
          return fail('not-a-combatant', 'You are not in this battle.');
        if (battle.plans[playerId]) return fail('already-committed', 'Your plan is already locked in.');
        return validateBattlePlan(state, battle, playerId, a.plan);
      }
      case 'battle/callTraitor': {
        const a = action as CallTraitorAction;
        const d = state.pendingDecisions.find((x) => x.id === `traitor:${a.battleId}`);
        if (!d) return fail('no-call', 'No traitor call is pending for that battle.');
        if (!d.waitingFor.includes(playerId)) return fail('not-you', 'You have no traitor to call here.');
        if (d.committed[playerId] !== undefined) return fail('already-answered', 'You already answered.');
        return ok();
      }
      case 'battle/chooseBattle':
        return fail('not-implemented', 'Choosing battle order is not implemented yet (battles run in storm order).');
      default:
        return fail('wrong-phase', `Action ${action.type} is not part of the battle phase.`);
    }
  },

  applyAction(state, action): GameState {
    const playerId = action.playerId as PlayerId;
    switch (action.type) {
      case 'battle/submitPlan': {
        const a = action as SubmitBattlePlanAction;
        const battle = activeBattle(state)!;
        const plan: BattlePlan = { ...a.plan, playerId };
        let next: GameState = {
          ...state,
          battlePhase: {
            ...state.battlePhase!,
            battles: state.battlePhase!.battles.map((b) =>
              b.id === battle.id ? { ...b, plans: { ...b.plans, [playerId]: plan } } : b,
            ),
          },
        };
        next = appendLog(next, {
          event: 'battle.planCommitted',
          text: `${getPlayer(state, playerId).name} locked in a battle plan.`,
          at: action.at,
        });
        next = appendLog(next, {
          event: 'battle.planDetail',
          text: `Your plan: leader ${plan.leaderId ? LEADERS[plan.leaderId].name : 'none'}, dial ${plan.dial}.`,
          visibility: privateTo(playerId),
        });
        const updated = next.battlePhase!.battles.find((b) => b.id === battle.id)!;
        if (bothPlansIn(updated)) next = onPlansComplete(next, updated);
        return next;
      }
      case 'battle/callTraitor': {
        const a = action as CallTraitorAction;
        const battle = state.battlePhase!.battles.find((b) => b.id === a.battleId)!;
        let next: GameState = {
          ...state,
          pendingDecisions: state.pendingDecisions.map((d) =>
            d.id === `traitor:${a.battleId}` ? { ...d, committed: { ...d.committed, [playerId]: a.call } } : d,
          ),
        };
        const d = next.pendingDecisions.find((x) => x.id === `traitor:${a.battleId}`)!;
        if (d.waitingFor.every((p) => d.committed[p] !== undefined)) {
          const calls = Object.fromEntries(d.waitingFor.map((p) => [p, d.committed[p] as boolean]));
          next = applyResolution(next, battle, calls);
        }
        return next;
      }
      default:
        throw new Error(`battle phase cannot apply ${action.type}`);
    }
  },

  isPhaseComplete(state): boolean {
    const bp = state.battlePhase;
    return bp !== null && bp.battles.every((b) => b.resolved);
  },

  advancePhase(state): GameState {
    return { ...state, battlePhase: null, phase: 'spiceCollection' };
  },
};
