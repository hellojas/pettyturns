import { IMP_CARD_DEFS, RESERVE_DEF_IDS } from '../data/cards';
import { IMP_CONFLICT_DEFS } from '../data/conflicts';
import { IMP_INTRIGUE_DEFS } from '../data/intrigue';
import { IMP_SPACE_LIST, IMP_SPACES } from '../data/spaces';
import type {
  BoardSpaceDef,
  CardId,
  Gains,
  ImpAction,
  ImpFactionId,
  ImpGameState,
  ImpPendingDecision,
  PlayerId,
} from '../types';
import { IMP_CONSTANTS } from '../data/constants';
import { combatStrength, impValidate } from './engine';

/**
 * A heuristic AI opponent — a PURE function of game state. Given a bot-controlled
 * player who is the current actor, it returns one legal `ImpAction` (or null if
 * it is not the bot's move). Every candidate it considers is checked with
 * `impValidate`, so the bot can never emit an illegal action regardless of rule
 * subtleties; the heuristics only decide which legal action is best.
 *
 * Strategy is deliberately simple and greedy (this is an opponent, not a solver):
 *  - resolve any owed decision sensibly (build toward influence thresholds; keep
 *    deck-peeks; decline optional trashes);
 *  - on an agent turn, place the highest-value legal agent, deploying to a
 *    conflict whose top prize is worth fighting for; otherwise reveal;
 *  - after revealing, buy the best card it can afford, else end its round;
 *  - in combat, pass (it commits troops when placing agents, not via intrigue).
 */
export function chooseBotAction(state: ImpGameState, pid: PlayerId): ImpAction | null {
  if (state.phase === 'finished' || !state.players[pid]) return null;

  const front = state.pendingDecisions[0];
  if (front) return front.playerId === pid ? resolveDecision(state, front, pid) : null;

  if (state.phase === 'combat') {
    if (state.turn !== pid) return null;
    return combatIntrigue(state, pid) ?? valid(state, { type: 'imp/combatPass', playerId: pid });
  }

  if (state.phase === 'playerTurns' && state.turn === pid) {
    const p = state.players[pid];
    if (!p.revealed) {
      return bestPlacement(state, pid) ?? valid(state, { type: 'imp/reveal', playerId: pid });
    }
    if (!p.turnDone) {
      return bestBuy(state, pid) ?? valid(state, { type: 'imp/endTurn', playerId: pid });
    }
  }
  return null;
}

/** Return the action if it validates from this state, else null. */
function valid(state: ImpGameState, action: ImpAction): ImpAction | null {
  return impValidate(state, action).ok ? action : null;
}

/** First action in `candidates` that validates. */
function firstValid(state: ImpGameState, candidates: ImpAction[]): ImpAction | null {
  for (const a of candidates) if (impValidate(state, a).ok) return a;
  return null;
}

// ---------------------------------------------------------------------------
// combat
// ---------------------------------------------------------------------------

/**
 * Play a combat intrigue only when it could change the outcome: the bot has
 * troops committed and is not already ahead. It plays the highest-swords card
 * that validates; otherwise it holds the card and passes.
 */
function combatIntrigue(state: ImpGameState, pid: PlayerId): ImpAction | null {
  const me = state.players[pid];
  if (me.inConflict <= 0) return null;
  const topOther = state.playerOrder
    .filter((p) => p !== pid && state.players[p].inConflict > 0)
    .reduce((max, p) => Math.max(max, combatStrength(state, p)), 0);
  if (combatStrength(state, pid) > topOther) return null; // already winning — save it

  // The strongest opponent still in the fight — the natural target for a
  // troop-removing combat card.
  const strongestOpponent = state.playerOrder
    .filter((p) => p !== pid && state.players[p].inConflict > 0)
    .sort((a, b) => combatStrength(state, b) - combatStrength(state, a))[0];

  const combatCards = state.hidden[pid].intrigue
    .filter((id) => IMP_INTRIGUE_DEFS[state.intrigueById[id].defId].kind === 'combat')
    .sort(
      (a, b) =>
        combatCardValue(IMP_INTRIGUE_DEFS[state.intrigueById[b].defId]) -
        combatCardValue(IMP_INTRIGUE_DEFS[state.intrigueById[a].defId]),
    );
  return firstValid(
    state,
    combatCards.map((intrigueId) => {
      const def = IMP_INTRIGUE_DEFS[state.intrigueById[intrigueId].defId];
      const base = { type: 'imp/playIntrigue' as const, playerId: pid, intrigueId };
      // A troop-removing card needs a target; aim it at the strongest opponent.
      return (def.gains?.destroyTroops ?? 0) > 0
        ? { ...base, targetPlayerId: strongestOpponent }
        : base;
    }),
  );
}

/** Rough combat value: swords plus twice each troop swing (deploy or destroy). */
function combatCardValue(def: { gains?: { swords?: number; deployTroops?: number; destroyTroops?: number } }): number {
  return (
    (def.gains?.swords ?? 0) +
    2 * (def.gains?.deployTroops ?? 0) +
    2 * (def.gains?.destroyTroops ?? 0)
  );
}

// ---------------------------------------------------------------------------
// decisions
// ---------------------------------------------------------------------------

function resolveDecision(state: ImpGameState, d: ImpPendingDecision, pid: PlayerId): ImpAction | null {
  const base = { type: 'imp/resolveDecision' as const, playerId: pid, decisionId: d.id };
  if (d.kind === 'influence') {
    const order = influencePreference(state, pid, d.factions);
    return firstValid(state, [...order.map((faction) => ({ ...base, faction })), base]);
  }
  if (d.kind === 'deckPeek') {
    return firstValid(state, [base, { ...base, discardPeeked: true }]); // prefer keeping
  }
  if (d.kind === 'trash') {
    const hidden = state.hidden[pid];
    const trashables = [...hidden.hand, ...hidden.discard];
    // prefer declining; if the rules require a trash, drop the lowest-value card
    const ranked = [...trashables].sort((a, b) => cardTrashScore(state, a) - cardTrashScore(state, b));
    return firstValid(state, [base, ...ranked.map((trashCardId) => ({ ...base, trashCardId }))]);
  }
  return valid(state, base);
}

/** Factions ordered by how useful more influence is right now (thresholds first). */
function influencePreference(state: ImpGameState, pid: PlayerId, allowed?: ImpFactionId[]): ImpFactionId[] {
  const p = state.players[pid];
  const factions = (allowed ?? (['emperor', 'spacingGuild', 'beneGesserit', 'fremen'] as ImpFactionId[]))
    .filter((f) => p.influence[f] < IMP_CONSTANTS.influenceMax);
  const nextThreshold = (cur: number) =>
    [...IMP_CONSTANTS.influenceVpLevels, IMP_CONSTANTS.allianceLevel]
      .filter((lvl) => lvl > cur)
      .sort((a, b) => a - b)[0] ?? 99;
  return factions.sort((a, b) => {
    const da = nextThreshold(p.influence[a]) - p.influence[a];
    const db = nextThreshold(p.influence[b]) - p.influence[b];
    if (da !== db) return da - db; // closest to a reward first
    return p.influence[b] - p.influence[a];
  });
}

/** Lower = better to trash. Cards with no icons and little reveal value go first. */
function cardTrashScore(state: ImpGameState, cardId: CardId): number {
  const def = IMP_CARD_DEFS[state.cardsById[cardId].defId];
  const reveal = (def.revealGains?.persuasion ?? 0) + (def.revealGains?.swords ?? 0);
  return def.icons.length * 2 + reveal;
}

// ---------------------------------------------------------------------------
// placement
// ---------------------------------------------------------------------------

const WEIGHT: Record<string, number> = {
  vp: 100,
  influence: 6,
  anyInfluence: 6,
  intrigueCards: 5,
  drawCards: 4,
  troops: 3,
  spice: 3,
  solari: 2,
  water: 2,
  trashCards: 1,
};

function gainsScore(g: Gains | undefined): number {
  if (!g) return 0;
  let s = 0;
  s += (g.vp ?? 0) * WEIGHT.vp;
  s += (g.anyInfluence ?? 0) * WEIGHT.anyInfluence;
  s += (g.intrigueCards ?? 0) * WEIGHT.intrigueCards;
  s += (g.drawCards ?? 0) * WEIGHT.drawCards;
  s += (g.troops ?? 0) * WEIGHT.troops;
  s += (g.spice ?? 0) * WEIGHT.spice;
  s += (g.solari ?? 0) * WEIGHT.solari;
  s += (g.water ?? 0) * WEIGHT.water;
  s += (g.trashCards ?? 0) * WEIGHT.trashCards;
  if (g.influence) for (const v of Object.values(g.influence)) s += (v ?? 0) * WEIGHT.influence;
  if (g.acquireReserveCard) s += 5;
  return s;
}

function spaceBaseScore(state: ImpGameState, space: BoardSpaceDef): number {
  let s = gainsScore(space.gains);
  if (space.influenceGain) s += WEIGHT.influence;
  if (space.maker) s += (state.makerBonus[space.id] ?? 0) * WEIGHT.spice;
  switch (space.special) {
    case 'swordmaster':
      s += 16;
      break;
    case 'highCouncil':
      s += 12;
      break;
    case 'mentat':
      s += 8;
      break;
    case 'sellMelange':
      s += 4;
      break;
  }
  return s;
}

/** True if the current conflict's first prize is worth committing troops to. */
function conflictWorthFighting(state: ImpGameState): boolean {
  const c = state.currentConflict ? IMP_CONFLICT_DEFS[state.currentConflict] : null;
  const first = c?.rewards.find((r) => r.place === 1);
  return !!first && ((first.gains.vp ?? 0) > 0 || !!first.gains.control);
}

/** Largest legal deploy for this placement action (0 if none legal). */
function maxDeploy(state: ImpGameState, pid: PlayerId, cardId: CardId, spaceId: string): number {
  const upper = state.players[pid].garrison + 6;
  for (let d = upper; d >= 1; d--) {
    if (impValidate(state, { type: 'imp/playCard', playerId: pid, cardId, spaceId, deploy: d }).ok) return d;
  }
  return 0;
}

function bestPlacement(state: ImpGameState, pid: PlayerId): ImpAction | null {
  const hidden = state.hidden[pid];
  const cardDef = (cardId: CardId) => IMP_CARD_DEFS[state.cardsById[cardId].defId];

  let best: { action: ImpAction; score: number } | null = null;
  for (const cardId of hidden.hand) {
    const def = cardDef(cardId);
    for (const space of IMP_SPACE_LIST) {
      if (!def.icons.includes(space.icon)) continue;
      // sell-melange needs an amount; try the max the bot can afford
      const candidates: ImpAction[] = [];
      if (space.special === 'sellMelange') {
        for (const amt of [5, 4, 3, 2]) {
          candidates.push({ type: 'imp/playCard', playerId: pid, cardId, spaceId: space.id, choices: { sellSpice: amt } });
        }
      } else {
        candidates.push({ type: 'imp/playCard', playerId: pid, cardId, spaceId: space.id });
      }
      const action = firstValid(state, candidates);
      if (!action) continue;
      let score = spaceBaseScore(state, space) + gainsScore(def.agentGains) + def.icons.length;
      if (best === null || score > best.score) best = { action, score };
    }
  }
  if (!best) return null;

  // if the chosen space opens the conflict and it's worth it, deploy hard
  const chosen = best.action as Extract<ImpAction, { type: 'imp/playCard' }>;
  const space = IMP_SPACES[chosen.spaceId];
  if (space.combat && conflictWorthFighting(state) && state.players[pid].garrison > 0) {
    const deploy = maxDeploy(state, pid, chosen.cardId, chosen.spaceId);
    if (deploy > 0) {
      const withDeploy: ImpAction = { ...chosen, deploy };
      if (impValidate(state, withDeploy).ok) return withDeploy;
    }
  }
  return best.action;
}

// ---------------------------------------------------------------------------
// buying
// ---------------------------------------------------------------------------

function bestBuy(state: ImpGameState, pid: PlayerId): ImpAction | null {
  const persuasion = state.players[pid].persuasion;
  const options: Array<{ id: string; cost: number }> = [];
  for (const cardId of state.imperiumRow) {
    const def = IMP_CARD_DEFS[state.cardsById[cardId].defId];
    options.push({ id: cardId, cost: def.cost });
  }
  for (const defId of RESERVE_DEF_IDS) {
    const def = IMP_CARD_DEFS[defId];
    if (def.cost > 0) options.push({ id: defId, cost: def.cost });
  }
  // buy the most expensive card it can afford (a rough value proxy)
  const affordable = options
    .filter((o) => o.cost > 0 && o.cost <= persuasion)
    .sort((a, b) => b.cost - a.cost);
  for (const o of affordable) {
    const action: ImpAction = { type: 'imp/buyCard', playerId: pid, cardId: o.id };
    if (impValidate(state, action).ok) return action;
  }
  return null;
}
