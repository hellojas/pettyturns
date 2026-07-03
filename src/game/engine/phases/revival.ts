import { GAME_CONSTANTS } from '../../data/constants';
import { FACTIONS } from '../../data/factions';
import { LEADERS } from '../../data/leaders';
import type {
  AllowedAction,
  GameState,
  PlayerId,
  ReviveForcesAction,
  ReviveLeaderAction,
  TurnAction,
  ValidationResult,
} from '../../types';
import { fail, ok } from '../../types';
import { appendLog } from '../log';
import { getPlayer, stormOrder } from '../state';
import type { PhaseModule } from './module';

/**
 * Revival phase (basic game).
 *
 * Forces: each faction may revive up to the per-turn maximum from the tanks.
 * The faction's free-revival number come back at no cost; the remainder cost
 * the configured spice per force, paid to the bank.
 *
 * Leaders: a faction may revive one dead leader per turn, but only once all
 * five of its leaders are dead (VERIFY — edition-dependent face-up rule).
 * Cost is the leader's strength, paid to the bank.
 *
 * Players act in storm order; a skip ends the player's revivals.
 */

export const revivalPhase: PhaseModule = {
  phase: 'revival',

  onEnter(state): GameState {
    const queue = stormOrder(state).filter((p) => {
      const player = getPlayer(state, p);
      return (
        player.tanksForces.forces + player.tanksForces.specialForces > 0 ||
        player.leadersDead.length > 0
      );
    });
    let next: GameState = {
      ...state,
      revivalPhase: { queue, revivedCount: {}, leaderRevived: [] },
    };
    return appendLog(next, {
      event: 'revival.begin',
      text: queue.length > 0 ? 'Revival phase begins.' : 'Revival phase: nothing to revive.',
    });
  },

  getAllowedActions(state, playerId): AllowedAction[] {
    const rp = state.revivalPhase;
    if (!rp || rp.queue[0] !== playerId) return [];
    const player = getPlayer(state, playerId);
    const def = FACTIONS[player.factionId];
    const already = rp.revivedCount[playerId] ?? 0;
    const maxMore = Math.min(
      def.maxRevivalPerTurn - already,
      player.tanksForces.forces + player.tanksForces.specialForces,
    );
    const actions: AllowedAction[] = [];
    if (maxMore > 0) {
      actions.push({
        type: 'revival/reviveForces',
        label: 'Revive forces from the tanks',
        params: {
          max: maxMore,
          freeRemaining: Math.max(0, def.freeRevival - already),
          costPerForce: GAME_CONSTANTS.revivalCostPerForce,
        },
      });
    }
    if (
      player.leadersAlive.length === 0 &&
      player.leadersDead.length > 0 &&
      !rp.leaderRevived.includes(playerId)
    ) {
      actions.push({
        type: 'revival/reviveLeader',
        label: 'Revive a fallen leader (cost: their strength)',
        params: { leaders: player.leadersDead.map((l) => l.leaderId) },
      });
    }
    actions.push({ type: 'revival/skip', label: 'Finish revivals' });
    return actions;
  },

  validateAction(state, action): ValidationResult {
    const rp = state.revivalPhase;
    if (!rp) return fail('no-revival', 'The revival phase is not active.');
    const playerId = action.playerId as PlayerId;
    if (rp.queue[0] !== playerId) return fail('not-your-turn', 'It is not your revival turn.');
    const player = getPlayer(state, playerId);
    const def = FACTIONS[player.factionId];

    switch (action.type) {
      case 'revival/reviveForces': {
        const a = action as ReviveForcesAction;
        const total = a.forces + a.specialForces;
        if (total <= 0) return fail('nothing', 'Revive at least one force.');
        const already = rp.revivedCount[playerId] ?? 0;
        if (already + total > def.maxRevivalPerTurn)
          return fail('over-limit', `You may revive at most ${def.maxRevivalPerTurn} forces per turn.`);
        if (a.forces > player.tanksForces.forces || a.specialForces > player.tanksForces.specialForces)
          return fail('not-in-tanks', 'You cannot revive more forces than you have in the tanks.');
        const paidCount = Math.max(0, already + total - def.freeRevival) - Math.max(0, already - def.freeRevival);
        const cost = paidCount * GAME_CONSTANTS.revivalCostPerForce;
        if (cost > player.spice) return fail('cannot-afford', `Those revivals cost ${cost} spice.`);
        return ok();
      }
      case 'revival/reviveLeader': {
        const a = action as ReviveLeaderAction;
        if (player.leadersAlive.length > 0)
          return fail('leaders-alive', 'You may revive leaders only when all of yours are dead. (VERIFY)');
        if (!player.leadersDead.some((l) => l.leaderId === a.leaderId))
          return fail('not-dead', 'That leader is not in the tanks.');
        if (rp.leaderRevived.includes(playerId))
          return fail('once-per-turn', 'You already revived a leader this turn.');
        const cost = LEADERS[a.leaderId].strength;
        if (cost > player.spice) return fail('cannot-afford', `Reviving that leader costs ${cost} spice.`);
        return ok();
      }
      case 'revival/skip':
        return ok();
      default:
        return fail('wrong-phase', `Action ${action.type} is not part of revival.`);
    }
  },

  applyAction(state, action): GameState {
    const playerId = action.playerId as PlayerId;
    const rp = state.revivalPhase!;
    const player = getPlayer(state, playerId);
    const def = FACTIONS[player.factionId];

    switch (action.type) {
      case 'revival/reviveForces': {
        const a = action as ReviveForcesAction;
        const total = a.forces + a.specialForces;
        const already = rp.revivedCount[playerId] ?? 0;
        const paidCount =
          Math.max(0, already + total - def.freeRevival) - Math.max(0, already - def.freeRevival);
        const cost = paidCount * GAME_CONSTANTS.revivalCostPerForce;
        let next: GameState = {
          ...state,
          players: {
            ...state.players,
            [playerId]: {
              ...player,
              spice: player.spice - cost,
              reserves: {
                forces: player.reserves.forces + a.forces,
                specialForces: player.reserves.specialForces + a.specialForces,
              },
              tanksForces: {
                forces: player.tanksForces.forces - a.forces,
                specialForces: player.tanksForces.specialForces - a.specialForces,
              },
            },
          },
          revivalPhase: {
            ...rp,
            revivedCount: { ...rp.revivedCount, [playerId]: already + total },
          },
        };
        return appendLog(next, {
          event: 'revival.forces',
          text: `${player.name} revived ${total} force(s)${cost > 0 ? ` paying ${cost} spice` : ' for free'}. They return to reserves.`,
          data: { playerId, forces: a.forces, specialForces: a.specialForces, cost },
          at: action.at,
        });
      }
      case 'revival/reviveLeader': {
        const a = action as ReviveLeaderAction;
        const cost = LEADERS[a.leaderId].strength;
        let next: GameState = {
          ...state,
          players: {
            ...state.players,
            [playerId]: {
              ...player,
              spice: player.spice - cost,
              leadersAlive: [...player.leadersAlive, a.leaderId],
              leadersDead: player.leadersDead.filter((l) => l.leaderId !== a.leaderId),
            },
          },
          revivalPhase: { ...rp, leaderRevived: [...rp.leaderRevived, playerId] },
        };
        return appendLog(next, {
          event: 'revival.leader',
          text: `${player.name} revived ${LEADERS[a.leaderId].name} for ${cost} spice.`,
          data: { playerId, leaderId: a.leaderId, cost },
          at: action.at,
        });
      }
      case 'revival/skip': {
        const next: GameState = {
          ...state,
          revivalPhase: { ...rp, queue: rp.queue.slice(1) },
        };
        return next;
      }
      default:
        throw new Error(`revival phase cannot apply ${action.type}`);
    }
  },

  isPhaseComplete(state): boolean {
    return state.revivalPhase !== null && state.revivalPhase.queue.length === 0;
  },

  advancePhase(state): GameState {
    return { ...state, revivalPhase: null, phase: 'shipmentAndMovement' };
  },
};
