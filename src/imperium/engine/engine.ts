import { IMP_CONSTANTS } from '../data/constants';
import { IMP_CARD_DEFS, RESERVE_DEF_IDS } from '../data/cards';
import { IMP_CONFLICT_DEFS } from '../data/conflicts';
import { IMP_INTRIGUE_DEFS } from '../data/intrigue';
import { IMP_LEADERS } from '../data/leaders';
import { IMP_SPACES, IMP_SPACE_LIST, MAKER_SPACE_IDS, CONTROL_SPACE_IDS } from '../data/spaces';
import type {
  BoardSpaceDef,
  BuyCardAction,
  CardId,
  ImpAction,
  ImpAllowedAction,
  ImpGameState,
  ImpValidation,
  LeaderPassive,
  LeaderPassiveHook,
  PlayCardAction,
  PlayIntrigueAction,
  PlayerId,
} from '../types';
import { impFail, impOk } from '../types';
import { addInfluence, applyGains, canPay, payCosts, drawCards, acquireCard } from './effects';
import { impLog } from './log';

/**
 * Turn engine.
 *
 * A round: player turns (agent turns and one reveal turn each, clockwise from
 * the first player) → combat (intrigue window, then resolution) → makers →
 * recall / next round. Endgame at the end of the round in which someone
 * reaches the VP target, or when the conflict deck runs out.
 */

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function player(state: ImpGameState, pid: PlayerId) {
  const p = state.players[pid];
  if (!p) throw new Error(`unknown player '${pid}'`);
  return p;
}

function cardDef(state: ImpGameState, cardId: CardId) {
  const inst = state.cardsById[cardId];
  if (!inst) throw new Error(`unknown card '${cardId}'`);
  return IMP_CARD_DEFS[inst.defId];
}

/** Player order starting from the first player. */
function orderFromFirst(state: ImpGameState): PlayerId[] {
  const start = state.playerOrder.indexOf(state.firstPlayer);
  return state.playerOrder.map((_, i) => state.playerOrder[(start + i) % state.playerOrder.length]);
}

function nextActivePlayer(state: ImpGameState, after: PlayerId): PlayerId | null {
  const order = orderFromFirst(state);
  const start = order.indexOf(after);
  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(start + i) % order.length];
    if (!state.players[candidate].turnDone) return candidate;
  }
  return null;
}

function combatParticipants(state: ImpGameState): PlayerId[] {
  return orderFromFirst(state).filter((pid) => state.players[pid].inConflict > 0);
}

/** The leader's passives that fire at a given engine hook (empty if none). */
function leaderPassives(state: ImpGameState, pid: PlayerId, hook: LeaderPassiveHook): LeaderPassive[] {
  const leader = IMP_LEADERS[state.players[pid].leaderId];
  return (leader?.passives ?? []).filter((pw) => pw.hook === hook);
}

/** Does an `onAgentPlaced` passive apply to this space? */
function passiveMatchesSpace(passive: LeaderPassive, space: BoardSpaceDef): boolean {
  const { group, spaceId } = passive.params ?? {};
  if (group && space.group !== group) return false;
  if (spaceId && space.id !== spaceId) return false;
  return true;
}

/** Troops an `onAgentPlaced` passive would recruit at this space (for deploy limits). */
function placementPassiveTroops(state: ImpGameState, pid: PlayerId, space: BoardSpaceDef): number {
  return leaderPassives(state, pid, 'onAgentPlaced')
    .filter((pw) => passiveMatchesSpace(pw, space))
    .reduce((n, pw) => n + (pw.params?.gains?.troops ?? 0), 0);
}

export function combatStrength(state: ImpGameState, pid: PlayerId): number {
  const p = state.players[pid];
  let strength =
    p.inConflict * IMP_CONSTANTS.strengthPerTroop + p.swords * IMP_CONSTANTS.strengthPerSword;
  // Leader passives contribute strength only while the leader is fighting.
  if (p.inConflict > 0) {
    for (const passive of leaderPassives(state, pid, 'combatStrength')) {
      strength += passive.params?.strength ?? 0;
    }
  }
  return strength;
}

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

export function impValidate(state: ImpGameState, action: ImpAction): ImpValidation {
  if (state.phase === 'finished') return impFail('game-over', 'The game is over.');
  if (!state.players[action.playerId]) return impFail('unknown-player', 'Unknown player.');
  const pid = action.playerId;
  const p = player(state, pid);

  switch (action.type) {
    case 'imp/playCard': {
      if (state.phase !== 'playerTurns' || state.turn !== pid)
        return impFail('not-your-turn', 'It is not your turn.');
      if (p.revealed) return impFail('already-revealed', 'You have already revealed this round.');
      if (p.agentsLeft <= 0) return impFail('no-agents', 'You have no agents left — take your reveal turn.');
      const hidden = state.hidden[pid];
      if (!hidden.hand.includes(action.cardId)) return impFail('not-in-hand', 'That card is not in your hand.');
      const def = cardDef(state, action.cardId);
      const space = IMP_SPACES[action.spaceId];
      if (!space) return impFail('bad-space', 'Unknown board space.');
      if (!def.icons.includes(space.icon))
        return impFail('icon-mismatch', `That card cannot send an agent to a ${space.icon} space.`);
      if (state.occupied[action.spaceId])
        return impFail('occupied', 'An agent already occupies that space.');
      if (space.special === 'highCouncil' && p.hasCouncilSeat)
        return impFail('already-seated', 'You already hold a council seat.');
      if (space.special === 'swordmaster' && p.hasSwordmaster)
        return impFail('already-swordmaster', 'You already recruited your third agent.');
      if (space.special === 'sellMelange') {
        const amount = action.choices?.sellSpice ?? 0;
        if (!IMP_CONSTANTS.sellMelangeRates[amount])
          return impFail('bad-amount', 'Choose a valid amount of spice to sell.');
        if (p.spice < amount) return impFail('cannot-afford', 'Not enough spice to sell.');
      }
      const spaceCost = canPay(state, pid, space.cost);
      if (!spaceCost.ok) return impFail('cannot-afford', `You cannot pay for that space (${spaceCost.reason}).`);
      const cardCost = canPay(state, pid, def.agentCost);
      if (!cardCost.ok) return impFail('cannot-afford', `You cannot pay that card's cost (${cardCost.reason}).`);
      if (action.deploy && action.deploy > 0) {
        if (!space.combat) return impFail('no-combat', 'That space does not open the conflict.');
        const gainsTroops =
          (space.gains?.troops ?? 0) +
          (def.agentGains?.troops ?? 0) +
          placementPassiveTroops(state, pid, space);
        const limit = IMP_CONSTANTS.baseDeployLimit + gainsTroops;
        if (action.deploy > limit)
          return impFail('deploy-limit', `You may deploy at most ${limit} troops with this turn.`);
        if (action.deploy > p.garrison + Math.min(gainsTroops, p.supply))
          return impFail('not-enough-troops', 'Not enough troops to deploy.');
      }
      if (def.agentGains?.anyInfluence && !action.choices?.influenceFaction)
        return impFail('choice-required', 'Choose which faction to gain influence with.');
      return impOk();
    }

    case 'imp/reveal': {
      if (state.phase !== 'playerTurns' || state.turn !== pid)
        return impFail('not-your-turn', 'It is not your turn.');
      if (p.revealed) return impFail('already-revealed', 'You already revealed.');
      return impOk();
    }

    case 'imp/buyCard': {
      if (state.phase !== 'playerTurns' || state.turn !== pid)
        return impFail('not-your-turn', 'It is not your turn.');
      if (!p.revealed) return impFail('not-revealed', 'Reveal before buying cards.');
      if (p.turnDone) return impFail('turn-over', 'Your turn is over.');
      const a = action as BuyCardAction;
      const rowCard = state.imperiumRow.includes(a.cardId as CardId);
      const reserveDef = RESERVE_DEF_IDS.includes(a.cardId) && IMP_CARD_DEFS[a.cardId]?.cost > 0;
      if (!rowCard && !reserveDef)
        return impFail('not-for-sale', 'That card is not available to acquire.');
      const cost = rowCard ? cardDef(state, a.cardId as CardId).cost : IMP_CARD_DEFS[a.cardId].cost;
      if (cost > p.persuasion) return impFail('cannot-afford', `That card costs ${cost} persuasion.`);
      return impOk();
    }

    case 'imp/endTurn': {
      if (state.phase !== 'playerTurns' || state.turn !== pid)
        return impFail('not-your-turn', 'It is not your turn.');
      if (!p.revealed) return impFail('not-revealed', 'Reveal before ending your round.');
      return impOk();
    }

    case 'imp/playIntrigue': {
      const a = action as PlayIntrigueAction;
      if (!state.hidden[pid].intrigue.includes(a.intrigueId))
        return impFail('not-yours', 'You do not hold that intrigue card.');
      const def = IMP_INTRIGUE_DEFS[state.intrigueById[a.intrigueId].defId];
      if (def.kind === 'endgame')
        return impFail('endgame-card', 'That card scores automatically at the end of the game.');
      if (def.kind === 'plot') {
        if (state.phase !== 'playerTurns' || state.turn !== pid)
          return impFail('not-your-turn', 'Plot cards play on your own turn.');
      }
      if (def.kind === 'combat') {
        if (state.phase !== 'combat') return impFail('not-combat', 'Combat cards play during combat.');
        if (state.turn !== pid) return impFail('not-your-turn', 'Wait for your combat window.');
        if (p.inConflict <= 0) return impFail('not-fighting', 'You have no troops in the conflict.');
      }
      const cost = canPay(state, pid, def.cost);
      if (!cost.ok) return impFail('cannot-afford', `You cannot pay that card's cost (${cost.reason}).`);
      if (def.gains?.anyInfluence && !a.choices?.influenceFaction)
        return impFail('choice-required', 'Choose which faction to gain influence with.');
      return impOk();
    }

    case 'imp/combatPass': {
      if (state.phase !== 'combat') return impFail('not-combat', 'There is no combat underway.');
      if (state.turn !== pid) return impFail('not-your-turn', 'Wait for your combat window.');
      return impOk();
    }
  }
}

// ---------------------------------------------------------------------------
// allowed actions (drives the UI)
// ---------------------------------------------------------------------------

export function impAllowedActions(state: ImpGameState, pid: PlayerId): ImpAllowedAction[] {
  if (state.phase === 'finished' || !state.players[pid]) return [];
  const p = state.players[pid];
  const actions: ImpAllowedAction[] = [];

  if (state.phase === 'playerTurns' && state.turn === pid) {
    if (!p.revealed) {
      if (p.agentsLeft > 0) {
        const playable = state.hidden[pid].hand.filter((cardId) => {
          const def = cardDef(state, cardId);
          return IMP_SPACE_LIST.some(
            (space) =>
              def.icons.includes(space.icon) &&
              !state.occupied[space.id] &&
              impValidate(state, { type: 'imp/playCard', playerId: pid, cardId, spaceId: space.id }).ok,
          );
        });
        if (playable.length > 0)
          actions.push({ type: 'imp/playCard', label: 'Send an agent', params: { playable } });
      }
      actions.push({ type: 'imp/reveal', label: 'Take your reveal turn' });
    } else if (!p.turnDone) {
      const affordable = [
        ...state.imperiumRow.filter((c) => cardDef(state, c).cost <= p.persuasion),
        ...RESERVE_DEF_IDS.filter((d) => IMP_CARD_DEFS[d].cost > 0 && IMP_CARD_DEFS[d].cost <= p.persuasion),
      ];
      if (affordable.length > 0)
        actions.push({ type: 'imp/buyCard', label: 'Acquire a card', params: { affordable } });
      actions.push({ type: 'imp/endTurn', label: 'End your round' });
    }
    const plots = state.hidden[pid].intrigue.filter(
      (i) => IMP_INTRIGUE_DEFS[state.intrigueById[i].defId].kind === 'plot',
    );
    if (plots.length > 0)
      actions.push({ type: 'imp/playIntrigue', label: 'Play a plot intrigue', params: { plots } });
  }

  if (state.phase === 'combat' && state.turn === pid) {
    const combats = state.hidden[pid].intrigue.filter(
      (i) => IMP_INTRIGUE_DEFS[state.intrigueById[i].defId].kind === 'combat',
    );
    if (combats.length > 0)
      actions.push({ type: 'imp/playIntrigue', label: 'Play a combat intrigue', params: { combats } });
    actions.push({ type: 'imp/combatPass', label: 'Pass' });
  }
  return actions;
}

// ---------------------------------------------------------------------------
// apply
// ---------------------------------------------------------------------------

export function impApply(state: ImpGameState, action: ImpAction): ImpGameState {
  const verdict = impValidate(state, action);
  if (!verdict.ok) throw new Error(`Illegal action ${action.type}: [${verdict.code}] ${verdict.message}`);
  const pid = action.playerId;

  switch (action.type) {
    case 'imp/playCard':
      return afterPlayerTurn(applyPlayCard(state, action), pid);
    case 'imp/reveal':
      return applyReveal(state, pid, action.at);
    case 'imp/buyCard':
      return applyBuy(state, action);
    case 'imp/endTurn': {
      let next = impLog(state, { event: 'turn.done', text: `${state.players[pid].name} ends their round.`, at: action.at });
      next = { ...next, players: { ...next.players, [pid]: { ...next.players[pid], turnDone: true } } };
      return afterPlayerTurn(next, pid);
    }
    case 'imp/playIntrigue':
      return applyIntrigue(state, action);
    case 'imp/combatPass': {
      let next = impLog(state, { event: 'combat.pass', text: `${state.players[pid].name} passes.`, at: action.at });
      next = { ...next, combatPassed: [...next.combatPassed, pid] };
      const participants = combatParticipants(next);
      if (participants.every((x) => next.combatPassed.includes(x))) {
        return resolveCombat(next);
      }
      return { ...next, turn: nextCombatWindow(next, pid) };
    }
  }
}

function applyPlayCard(state: ImpGameState, action: PlayCardAction): ImpGameState {
  const pid = action.playerId;
  const def = cardDef(state, action.cardId);
  const space = IMP_SPACES[action.spaceId];
  let next = state;

  // agent + card out of hand
  const hidden = next.hidden[pid];
  next = {
    ...next,
    occupied: { ...next.occupied, [space.id]: pid },
    players: {
      ...next.players,
      [pid]: { ...next.players[pid], agentsLeft: next.players[pid].agentsLeft - 1 },
    },
    hidden: {
      ...next.hidden,
      [pid]: {
        ...hidden,
        hand: hidden.hand.filter((c) => c !== action.cardId),
        [def.trashAfterAgent ? 'trashed' : 'inPlay']: [
          ...(def.trashAfterAgent ? hidden.trashed : hidden.inPlay),
          action.cardId,
        ],
      },
    },
  };
  next = impLog(next, {
    event: 'agent.placed',
    text: `${next.players[pid].name} plays ${def.name} and sends an agent to ${space.name}.`,
    data: { cardId: action.cardId, spaceId: space.id },
    at: action.at,
  });

  // costs
  next = payCosts(next, pid, space.cost);
  next = payCosts(next, pid, def.agentCost);

  // specials
  if (space.special === 'sellMelange') {
    const amount = action.choices!.sellSpice!;
    const solari = IMP_CONSTANTS.sellMelangeRates[amount];
    next = {
      ...next,
      players: {
        ...next.players,
        [pid]: { ...next.players[pid], spice: next.players[pid].spice - amount, solari: next.players[pid].solari + solari },
      },
    };
    next = impLog(next, { event: 'melange.sold', text: `${next.players[pid].name} sells ${amount} spice for ${solari} solari.` });
  }
  if (space.special === 'highCouncil') {
    next = { ...next, players: { ...next.players, [pid]: { ...next.players[pid], hasCouncilSeat: true } } };
    next = impLog(next, { event: 'council.seated', text: `${next.players[pid].name} takes a council seat (+2 persuasion each reveal).` });
  }
  if (space.special === 'swordmaster') {
    next = {
      ...next,
      players: {
        ...next.players,
        [pid]: {
          ...next.players[pid],
          hasSwordmaster: true,
          agentsTotal: next.players[pid].agentsTotal + 1,
          agentsLeft: next.players[pid].agentsLeft + 1,
        },
      },
    };
    next = impLog(next, { event: 'swordmaster.hired', text: `${next.players[pid].name} recruits a third agent.` });
  }
  if (space.special === 'mentat') {
    next = {
      ...next,
      players: {
        ...next.players,
        [pid]: { ...next.players[pid], hasMentat: true, agentsLeft: next.players[pid].agentsLeft + 1 },
      },
    };
    next = impLog(next, { event: 'mentat.taken', text: `${next.players[pid].name} takes the mentat as an extra agent this round.` });
  }

  // maker bonus spice
  let spaceGains = { ...space.gains };
  if (space.maker) {
    const bonus = next.makerBonus[space.id] ?? 0;
    if (bonus > 0) {
      spaceGains = { ...spaceGains, spice: (spaceGains.spice ?? 0) + bonus };
      next = { ...next, makerBonus: { ...next.makerBonus, [space.id]: 0 } };
    }
  }

  // gains: space, card, signet
  const ctx = {
    influenceFaction: action.choices?.influenceFaction,
    trashCardId: action.choices?.trashCardId,
  };
  const fromSpace = applyGains(next, pid, spaceGains, ctx);
  next = fromSpace.state;
  const fromCard = applyGains(next, pid, def.agentGains, ctx);
  next = fromCard.state;
  let troopsRecruited = fromSpace.troopsRecruited + fromCard.troopsRecruited;
  if (def.signet) {
    const leader = IMP_LEADERS[next.players[pid].leaderId];
    const paid = canPay(next, pid, leader.signetCost);
    if (paid.ok) {
      next = payCosts(next, pid, leader.signetCost);
      const fromSignet = applyGains(next, pid, leader.signetGains, ctx);
      next = fromSignet.state;
      troopsRecruited += fromSignet.troopsRecruited;
      next = impLog(next, { event: 'signet.used', text: `${next.players[pid].name} uses their signet ring ability.` });
    }
  }

  // faction influence for visiting
  if (space.influenceGain) {
    next = addInfluence(next, pid, space.influenceGain, 1);
  }

  // leader passive: fires when this agent is placed (optionally on a group/space)
  for (const passive of leaderPassives(next, pid, 'onAgentPlaced')) {
    if (!passiveMatchesSpace(passive, space)) continue;
    const r = applyGains(next, pid, passive.params?.gains, ctx);
    next = r.state;
    troopsRecruited += r.troopsRecruited;
    next = impLog(next, {
      event: 'leader.passive',
      text: `${next.players[pid].name}'s leader ability triggers at ${space.name}.`,
      data: { passiveId: passive.id },
    });
  }

  // deployment
  if (action.deploy && action.deploy > 0) {
    const p = next.players[pid];
    const deploy = Math.min(action.deploy, p.garrison);
    next = {
      ...next,
      players: {
        ...next.players,
        [pid]: { ...p, garrison: p.garrison - deploy, inConflict: p.inConflict + deploy },
      },
    };
    next = impLog(next, {
      event: 'troops.deployed',
      text: `${p.name} deploys ${deploy} troop(s) to the conflict.`,
      data: { deploy },
    });
  }

  return next;
}

function applyReveal(state: ImpGameState, pid: PlayerId, at?: string): ImpGameState {
  let next = state;
  const hidden = next.hidden[pid];
  const revealedIds = [...hidden.hand];
  next = {
    ...next,
    hidden: {
      ...next.hidden,
      [pid]: { ...hidden, hand: [], revealedCards: [...hidden.revealedCards, ...revealedIds] },
    },
    players: { ...next.players, [pid]: { ...next.players[pid], revealed: true } },
  };

  // reveal effects of every revealed card
  for (const cardId of revealedIds) {
    const def = cardDef(next, cardId);
    next = applyGains(next, pid, def.revealGains).state;
  }
  // council seat bonus
  if (next.players[pid].hasCouncilSeat) {
    next = { ...next, players: { ...next.players, [pid]: { ...next.players[pid], persuasion: next.players[pid].persuasion + 2 } } };
  }

  // leader passive: fires on the reveal turn
  for (const passive of leaderPassives(next, pid, 'onReveal')) {
    if (revealedIds.length < (passive.params?.minRevealedCards ?? 0)) continue;
    next = applyGains(next, pid, passive.params?.gains).state;
    next = impLog(next, {
      event: 'leader.passive',
      text: `${next.players[pid].name}'s leader ability triggers on reveal.`,
      data: { passiveId: passive.id },
    });
  }

  const p = next.players[pid];
  return impLog(next, {
    event: 'turn.revealed',
    text: `${p.name} reveals ${revealedIds.length} card(s): ${p.persuasion} persuasion, ${p.swords} sword(s).`,
    data: { cards: revealedIds.map((c) => cardDef(next, c).name), persuasion: p.persuasion, swords: p.swords },
    at,
  });
}

function applyBuy(state: ImpGameState, action: BuyCardAction): ImpGameState {
  const pid = action.playerId;
  let next = state;
  const isRowCard = state.imperiumRow.includes(action.cardId as CardId);

  if (isRowCard) {
    const cardId = action.cardId as CardId;
    const def = cardDef(next, cardId);
    // pay persuasion, move to discard, refill the row
    next = {
      ...next,
      players: { ...next.players, [pid]: { ...next.players[pid], persuasion: next.players[pid].persuasion - def.cost } },
      imperiumRow: next.imperiumRow.filter((c) => c !== cardId),
      hidden: { ...next.hidden, [pid]: { ...next.hidden[pid], discard: [...next.hidden[pid].discard, cardId] } },
    };
    const [refill, ...rest] = next.imperiumDeck;
    if (refill) next = { ...next, imperiumRow: [...next.imperiumRow, refill], imperiumDeck: rest };
    next = impLog(next, {
      event: 'card.bought',
      text: `${next.players[pid].name} acquires ${def.name} for ${def.cost} persuasion.`,
      data: { cardId, cost: def.cost },
      at: action.at,
    });
    if (def.acquireGains) next = applyGains(next, pid, def.acquireGains).state;
    return next;
  }

  // reserve purchase by def id
  const def = IMP_CARD_DEFS[action.cardId];
  next = {
    ...next,
    players: { ...next.players, [pid]: { ...next.players[pid], persuasion: next.players[pid].persuasion - def.cost } },
  };
  next = impLog(next, {
    event: 'card.bought',
    text: `${next.players[pid].name} acquires ${def.name} for ${def.cost} persuasion.`,
    at: action.at,
  });
  return acquireCard(next, pid, def.id);
}

function applyIntrigue(state: ImpGameState, action: PlayIntrigueAction): ImpGameState {
  const pid = action.playerId;
  const def = IMP_INTRIGUE_DEFS[state.intrigueById[action.intrigueId].defId];
  let next: ImpGameState = {
    ...state,
    hidden: {
      ...state.hidden,
      [pid]: { ...state.hidden[pid], intrigue: state.hidden[pid].intrigue.filter((i) => i !== action.intrigueId) },
    },
    intrigueDiscard: [...state.intrigueDiscard, action.intrigueId],
  };
  next = payCosts(next, pid, def.cost);
  next = impLog(next, {
    event: 'intrigue.played',
    text: `${next.players[pid].name} plays intrigue: ${def.name}.`,
    at: action.at,
  });
  next = applyGains(next, pid, def.gains, { influenceFaction: action.choices?.influenceFaction }).state;

  if (def.kind === 'combat') {
    // playing a card reopens everyone's response window
    next = { ...next, combatPassed: [], turn: nextCombatWindow(next, pid) };
  }
  return next;
}

// ---------------------------------------------------------------------------
// round flow
// ---------------------------------------------------------------------------

function afterPlayerTurn(state: ImpGameState, current: PlayerId): ImpGameState {
  const next = nextActivePlayer(state, current);
  if (next !== null) return { ...state, turn: next };
  return beginCombat({ ...state, turn: null });
}

function nextCombatWindow(state: ImpGameState, after: PlayerId): PlayerId | null {
  const participants = combatParticipants(state);
  if (participants.length === 0) return null;
  const start = participants.indexOf(after);
  for (let i = 1; i <= participants.length; i++) {
    const candidate = participants[(start + i) % participants.length];
    if (!state.combatPassed.includes(candidate)) return candidate;
  }
  return null;
}

function beginCombat(state: ImpGameState): ImpGameState {
  let next: ImpGameState = { ...state, phase: 'combat', combatPassed: [] };
  const participants = combatParticipants(next);
  const conflict = next.currentConflict ? IMP_CONFLICT_DEFS[next.currentConflict] : null;
  next = impLog(next, {
    event: 'combat.begin',
    text:
      participants.length > 0
        ? `Combat over ${conflict?.name ?? 'the conflict'}: ${participants
            .map((p) => `${next.players[p].name} (${combatStrength(next, p)})`)
            .join(' vs ')}.`
        : 'No one committed troops — the conflict goes unclaimed.',
  });
  if (participants.length <= 1) return resolveCombat(next);
  return { ...next, turn: participants[0] };
}

function resolveCombat(state: ImpGameState): ImpGameState {
  let next: ImpGameState = { ...state, turn: null };
  const conflict = next.currentConflict ? IMP_CONFLICT_DEFS[next.currentConflict] : null;
  const participants = combatParticipants(next);

  if (conflict && participants.length > 0) {
    // rank by strength; tied players each take the next-lower reward (VERIFY)
    const byStrength = participants
      .map((pid) => ({ pid, strength: combatStrength(next, pid) }))
      .sort((a, b) => b.strength - a.strength);
    const groups: Array<{ strength: number; pids: PlayerId[] }> = [];
    for (const entry of byStrength) {
      const g = groups.find((x) => x.strength === entry.strength);
      if (g) g.pids.push(entry.pid);
      else groups.push({ strength: entry.strength, pids: [entry.pid] });
    }
    let placeCursor = 1;
    for (const group of groups) {
      const rewardPlace = group.pids.length === 1 ? placeCursor : placeCursor + 1;
      const reward = conflict.rewards.find((r) => r.place === rewardPlace);
      for (const pid of group.pids) {
        if (reward) {
          next = impLog(next, {
            event: 'combat.reward',
            text: `${next.players[pid].name} takes the ${ordinal(rewardPlace)}-place reward (strength ${group.strength}${group.pids.length > 1 ? ', tied' : ''}).`,
            data: { pid, place: rewardPlace, strength: group.strength },
          });
          next = applyGains(next, pid, reward.gains).state;
        } else {
          next = impLog(next, {
            event: 'combat.noReward',
            text: `${next.players[pid].name} gains nothing from the conflict (strength ${group.strength}).`,
          });
        }
      }
      placeCursor += group.pids.length;
    }
  }

  // all committed troops are lost to the supply
  for (const pid of Object.keys(next.players)) {
    const p = next.players[pid];
    if (p.inConflict > 0) {
      next = {
        ...next,
        players: {
          ...next.players,
          [pid]: { ...p, supply: p.supply + p.inConflict, inConflict: 0 },
        },
      };
    }
  }

  return makersAndRecall(next);
}

function makersAndRecall(state: ImpGameState): ImpGameState {
  let next = state;

  // makers: unvisited maker spaces accumulate a bonus spice (VERIFY)
  for (const spaceId of MAKER_SPACE_IDS) {
    if (!next.occupied[spaceId]) {
      next = { ...next, makerBonus: { ...next.makerBonus, [spaceId]: (next.makerBonus[spaceId] ?? 0) + 1 } };
    }
  }

  // endgame?
  const someoneWon = Object.values(next.players).some((p) => p.vp >= IMP_CONSTANTS.vpTarget);
  const deckDone = next.conflictDeck.length === 0;
  if (someoneWon || deckDone) return finalScoring(next);

  // recall: next round
  const order = next.playerOrder;
  const firstIdx = order.indexOf(next.firstPlayer);
  const newFirst = order[(firstIdx + 1) % order.length];
  const players = Object.fromEntries(
    Object.entries(next.players).map(([pid, p]) => [
      pid,
      {
        ...p,
        agentsLeft: p.agentsTotal,
        hasMentat: false,
        revealed: false,
        turnDone: false,
        persuasion: 0,
        swords: 0,
      },
    ]),
  );
  const hidden = Object.fromEntries(
    Object.entries(next.hidden).map(([pid, h]) => [
      pid,
      { ...h, discard: [...h.discard, ...h.inPlay, ...h.revealedCards], inPlay: [], revealedCards: [] },
    ]),
  );
  const [nextConflict, ...restConflicts] = next.conflictDeck;

  next = {
    ...next,
    round: next.round + 1,
    phase: 'playerTurns',
    players,
    hidden,
    occupied: {},
    combatPassed: [],
    firstPlayer: newFirst,
    turn: newFirst,
    currentConflict: nextConflict,
    conflictDeck: restConflicts,
  };
  next = impLog(next, {
    event: 'round.begin',
    text: `Round ${next.round} begins. ${next.players[newFirst].name} is first player.`,
    data: { conflictId: nextConflict },
  });

  // control bonuses
  for (const spaceId of CONTROL_SPACE_IDS) {
    const controller = next.controlledBy[spaceId];
    if (controller) {
      next = applyGains(next, controller, IMP_SPACES[spaceId].controlBonus).state;
      next = impLog(next, {
        event: 'control.bonus',
        text: `${next.players[controller].name} collects the ${IMP_SPACES[spaceId].name} control bonus.`,
      });
    }
  }

  // leader passives: per-round passive income (in seat order from the first player)
  for (const pid of orderFromFirst(next)) {
    for (const passive of leaderPassives(next, pid, 'onRoundStart')) {
      next = applyGains(next, pid, passive.params?.gains).state;
      next = impLog(next, {
        event: 'leader.passive',
        text: `${next.players[pid].name}'s leader ability grants a round-start bonus.`,
        data: { passiveId: passive.id },
      });
    }
  }

  // fresh hands
  for (const pid of next.playerOrder) {
    next = drawCards(next, pid, IMP_CONSTANTS.handSize);
  }
  return next;
}

function finalScoring(state: ImpGameState): ImpGameState {
  let next = state;

  // endgame intrigue scores automatically
  for (const pid of next.playerOrder) {
    for (const intrigueId of next.hidden[pid].intrigue) {
      const def = IMP_INTRIGUE_DEFS[next.intrigueById[intrigueId].defId];
      if (def.kind === 'endgame' && def.gains) {
        next = impLog(next, {
          event: 'intrigue.endgame',
          text: `${next.players[pid].name} reveals an endgame intrigue: ${def.name}.`,
        });
        next = applyGains(next, pid, def.gains).state;
      }
    }
  }

  const standings = [...next.playerOrder]
    .map((pid) => next.players[pid])
    .sort((a, b) => {
      if (b.vp !== a.vp) return b.vp - a.vp;
      for (const key of IMP_CONSTANTS.tiebreakers) {
        if (b[key] !== a[key]) return b[key] - a[key];
      }
      return 0;
    });

  next = {
    ...next,
    phase: 'finished',
    turn: null,
    winner: standings[0].id,
    finalStandings: standings.map((p) => ({ playerId: p.id, vp: p.vp })),
  };
  return impLog(next, {
    event: 'game.finished',
    text: `Game over. ${standings[0].name} wins with ${standings[0].vp} VP.`,
    data: { standings: next.finalStandings },
  });
}

function ordinal(n: number): string {
  return n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`;
}
