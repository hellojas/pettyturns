import { nextInt, shuffle } from '../../game/engine/rng';
import { IMP_CONSTANTS } from '../data/constants';
import { IMP_CARD_DEFS } from '../data/cards';
import type {
  CardDefId,
  CardId,
  Costs,
  Gains,
  ImpFactionId,
  ImpGameState,
  ImpPendingDecision,
  PlayerId,
} from '../types';
import { impLog, impPrivate } from './log';

/**
 * The effects interpreter: every card, space, intrigue, and conflict reward is
 * a Gains/Costs record applied through these pure helpers, so new content is
 * config-only.
 */

function patchPlayer(state: ImpGameState, pid: PlayerId, patch: Partial<ImpGameState['players'][string]>): ImpGameState {
  return { ...state, players: { ...state.players, [pid]: { ...state.players[pid], ...patch } } };
}

/** Append a pending decision, assigning it a deterministic id from the counter. */
export function enqueueDecision(
  state: ImpGameState,
  decision: Omit<ImpPendingDecision, 'id'>,
): ImpGameState {
  const id = `dec-${state.decisionSeq}`;
  return {
    ...state,
    decisionSeq: state.decisionSeq + 1,
    pendingDecisions: [...state.pendingDecisions, { ...decision, id }],
  };
}

export function drawCards(state: ImpGameState, pid: PlayerId, n: number): ImpGameState {
  let next = state;
  for (let i = 0; i < n; i++) {
    let hidden = next.hidden[pid];
    if (hidden.deck.length === 0) {
      if (hidden.discard.length === 0) break;
      const { items, rng } = shuffle(next.rng, hidden.discard);
      next = {
        ...next,
        rng,
        hidden: { ...next.hidden, [pid]: { ...hidden, deck: items, discard: [] } },
      };
      hidden = next.hidden[pid];
    }
    const [top, ...rest] = hidden.deck;
    next = {
      ...next,
      hidden: { ...next.hidden, [pid]: { ...hidden, deck: rest, hand: [...hidden.hand, top] } },
    };
  }
  return next;
}

export function drawIntrigue(state: ImpGameState, pid: PlayerId, n: number): ImpGameState {
  let next = state;
  for (let i = 0; i < n; i++) {
    if (next.intrigueDeck.length === 0) {
      if (next.intrigueDiscard.length === 0) break;
      const { items, rng } = shuffle(next.rng, next.intrigueDiscard);
      next = { ...next, rng, intrigueDeck: items, intrigueDiscard: [] };
    }
    const [top, ...rest] = next.intrigueDeck;
    next = {
      ...next,
      intrigueDeck: rest,
      hidden: {
        ...next.hidden,
        [pid]: { ...next.hidden[pid], intrigue: [...next.hidden[pid].intrigue, top] },
      },
    };
    next = impLog(next, {
      event: 'intrigue.drawn',
      text: `${next.players[pid].name} drew an intrigue card.`,
    });
  }
  return next;
}

/** Recruit troops from the supply to the garrison (capped by supply). */
export function recruitTroops(state: ImpGameState, pid: PlayerId, n: number): { state: ImpGameState; recruited: number } {
  const p = state.players[pid];
  const recruited = Math.min(n, p.supply);
  return {
    state: patchPlayer(state, pid, { garrison: p.garrison + recruited, supply: p.supply - recruited }),
    recruited,
  };
}

/**
 * Change influence on a track, awarding/removing VP for crossed levels and
 * re-evaluating the alliance token.
 */
export function addInfluence(state: ImpGameState, pid: PlayerId, faction: ImpFactionId, delta: number): ImpGameState {
  const p = state.players[pid];
  const before = p.influence[faction];
  const after = Math.max(0, Math.min(IMP_CONSTANTS.influenceMax, before + delta));
  if (after === before) return state;

  let vpDelta = 0;
  for (const level of IMP_CONSTANTS.influenceVpLevels) {
    if (before < level && after >= level) vpDelta += 1;
    if (after < level && before >= level) vpDelta -= 1;
  }

  let next = patchPlayer(state, pid, {
    influence: { ...p.influence, [faction]: after },
    vp: p.vp + vpDelta,
  });
  next = impLog(next, {
    event: 'influence.changed',
    text: `${p.name} ${delta > 0 ? 'gains' : 'loses'} influence with the ${faction} (${before} → ${after})${
      vpDelta !== 0 ? `, ${vpDelta > 0 ? 'gaining' : 'losing'} ${Math.abs(vpDelta)} VP` : ''
    }.`,
    data: { pid, faction, before, after, vpDelta },
  });
  return reevaluateAlliance(next, faction);
}

/** The alliance token sits with the player at the alliance level with the strictly most influence. */
export function reevaluateAlliance(state: ImpGameState, faction: ImpFactionId): ImpGameState {
  const holder = state.alliances[faction] ?? null;
  const eligible = Object.values(state.players).filter(
    (p) => p.influence[faction] >= IMP_CONSTANTS.allianceLevel,
  );
  let newHolder: PlayerId | null = holder;

  if (eligible.length === 0) {
    newHolder = null;
  } else {
    const top = Math.max(...eligible.map((p) => p.influence[faction]));
    const leaders = eligible.filter((p) => p.influence[faction] === top);
    if (holder && eligible.some((p) => p.id === holder) && state.players[holder].influence[faction] >= top) {
      newHolder = holder; // holder keeps the token on ties (VERIFY)
    } else if (leaders.length === 1) {
      newHolder = leaders[0].id;
    } else if (!holder || !eligible.some((p) => p.id === holder)) {
      newHolder = null; // contested with no incumbent — nobody holds it (VERIFY)
    }
  }

  if (newHolder === holder) return state;
  let next = state;
  if (holder) {
    next = patchPlayer(next, holder, { vp: next.players[holder].vp - 1 });
  }
  if (newHolder) {
    next = patchPlayer(next, newHolder, { vp: next.players[newHolder].vp + 1 });
  }
  next = { ...next, alliances: { ...next.alliances, [faction]: newHolder ?? undefined } };
  return impLog(next, {
    event: 'alliance.moved',
    text: newHolder
      ? `${next.players[newHolder].name} now holds the ${faction} alliance (1 VP).`
      : `The ${faction} alliance is unclaimed.`,
    data: { faction, from: holder, to: newHolder },
  });
}

export function canPay(state: ImpGameState, pid: PlayerId, costs: Costs | undefined): { ok: boolean; reason?: string } {
  if (!costs) return { ok: true };
  const p = state.players[pid];
  if ((costs.spice ?? 0) > p.spice) return { ok: false, reason: `needs ${costs.spice} spice` };
  if ((costs.solari ?? 0) > p.solari) return { ok: false, reason: `needs ${costs.solari} solari` };
  if ((costs.water ?? 0) > p.water) return { ok: false, reason: `needs ${costs.water} water` };
  if ((costs.troops ?? 0) > p.garrison) return { ok: false, reason: `needs ${costs.troops} garrisoned troops` };
  if (costs.influenceRequired) {
    const { faction, min } = costs.influenceRequired;
    if (p.influence[faction] < min) return { ok: false, reason: `needs ${min} ${faction} influence` };
  }
  return { ok: true };
}

export function payCosts(state: ImpGameState, pid: PlayerId, costs: Costs | undefined): ImpGameState {
  if (!costs) return state;
  const p = state.players[pid];
  return patchPlayer(state, pid, {
    spice: p.spice - (costs.spice ?? 0),
    solari: p.solari - (costs.solari ?? 0),
    water: p.water - (costs.water ?? 0),
    garrison: p.garrison - (costs.troops ?? 0),
    supply: p.supply + (costs.troops ?? 0),
  });
}

/**
 * Apply a Gains record. Returns the new state and troops recruited (for deploy
 * limits). Choice-requiring effects (`anyInfluence`, `trashCards`) are not
 * auto-resolved: they enqueue a pending decision for the player to answer via
 * `imp/resolveDecision`. Every other effect resolves immediately.
 */
export function applyGains(
  state: ImpGameState,
  pid: PlayerId,
  gains: Gains | undefined,
): { state: ImpGameState; troopsRecruited: number } {
  if (!gains) return { state, troopsRecruited: 0 };
  let next = state;
  const p = () => next.players[pid];
  let troopsRecruited = 0;

  if (gains.spice || gains.solari || gains.water) {
    next = patchPlayer(next, pid, {
      spice: p().spice + (gains.spice ?? 0),
      solari: p().solari + (gains.solari ?? 0),
      water: p().water + (gains.water ?? 0),
    });
  }
  if (gains.troops) {
    const r = recruitTroops(next, pid, gains.troops);
    next = r.state;
    troopsRecruited = r.recruited;
  }
  if (gains.drawCards) next = drawCards(next, pid, gains.drawCards);
  if (gains.intrigueCards) next = drawIntrigue(next, pid, gains.intrigueCards);
  if (gains.influence) {
    for (const [faction, amount] of Object.entries(gains.influence)) {
      next = addInfluence(next, pid, faction as ImpFactionId, amount ?? 0);
    }
  }
  if (gains.anyInfluence) {
    // The player chooses the track: raise a decision rather than auto-picking.
    next = enqueueDecision(next, {
      playerId: pid,
      kind: 'influence',
      prompt: `Gain ${gains.anyInfluence} influence with a faction of your choice.`,
      amount: gains.anyInfluence,
    });
  }
  if (gains.vp) {
    next = patchPlayer(next, pid, { vp: p().vp + gains.vp });
    next = impLog(next, { event: 'vp.gained', text: `${p().name} gains ${gains.vp} VP.` });
  }
  if (gains.persuasion) next = patchPlayer(next, pid, { persuasion: p().persuasion + gains.persuasion });
  if (gains.swords) next = patchPlayer(next, pid, { swords: p().swords + gains.swords });

  if (gains.trashCards) {
    // Optional: the player picks which card(s) to trash, or declines.
    const hidden = next.hidden[pid];
    if (hidden.hand.length > 0 || hidden.discard.length > 0) {
      next = enqueueDecision(next, {
        playerId: pid,
        kind: 'trash',
        prompt: `You may trash up to ${gains.trashCards} card(s) from your hand or discard.`,
        amount: gains.trashCards,
        optional: true,
      });
    }
  }

  if (gains.acquireReserveCard) {
    next = acquireCard(next, pid, gains.acquireReserveCard);
  }

  if (gains.control) {
    const prev = next.controlledBy[gains.control];
    if (prev && prev !== pid) {
      next = patchPlayer(next, prev, {
        controls: next.players[prev].controls.filter((s) => s !== gains.control),
      });
    }
    if (prev !== pid) {
      next = patchPlayer(next, pid, { controls: [...p().controls, gains.control] });
      next = { ...next, controlledBy: { ...next.controlledBy, [gains.control]: pid } };
      next = impLog(next, {
        event: 'control.taken',
        text: `${p().name} takes control of ${gains.control}.`,
        data: { spaceId: gains.control, from: prev ?? null },
      });
    }
  }

  if (gains.stealIntrigueAt) {
    for (const other of Object.values(next.players)) {
      if (other.id === pid) continue;
      const theirs = next.hidden[other.id].intrigue;
      if (theirs.length >= gains.stealIntrigueAt) {
        const draw = nextInt(next.rng, 0, theirs.length - 1);
        next = { ...next, rng: draw.rng };
        const stolen = theirs[draw.value];
        next = {
          ...next,
          hidden: {
            ...next.hidden,
            [other.id]: { ...next.hidden[other.id], intrigue: theirs.filter((i) => i !== stolen) },
            [pid]: { ...next.hidden[pid], intrigue: [...next.hidden[pid].intrigue, stolen] },
          },
        };
        next = impLog(next, {
          event: 'intrigue.stolen',
          text: `${p().name} takes an intrigue card from ${other.name}.`,
          visibility: impPrivate(pid, other.id),
        });
      }
    }
  }

  return { state: next, troopsRecruited };
}

/** Move one card from a player's hand or discard to the trash pile (no-op if absent). */
export function trashOneCard(state: ImpGameState, pid: PlayerId, cardId: CardId): ImpGameState {
  const hidden = state.hidden[pid];
  if (!hidden.hand.includes(cardId) && !hidden.discard.includes(cardId)) return state;
  let next: ImpGameState = {
    ...state,
    hidden: {
      ...state.hidden,
      [pid]: {
        ...hidden,
        hand: hidden.hand.filter((c) => c !== cardId),
        discard: hidden.discard.filter((c) => c !== cardId),
        trashed: [...hidden.trashed, cardId],
      },
    },
  };
  next = impLog(next, {
    event: 'card.trashed',
    text: `${next.players[pid].name} trashes a card from their deck.`,
    data: { cardId },
  });
  return next;
}

/** Create an instance of a def (reserve buys / grants) and put it in the player's discard. */
export function acquireCard(state: ImpGameState, pid: PlayerId, defId: CardDefId): ImpGameState {
  const def = IMP_CARD_DEFS[defId];
  if (!def) throw new Error(`unknown card def '${defId}'`);
  const serial = Object.keys(state.cardsById).filter((id) => state.cardsById[id].defId === defId).length + 1;
  const id = `${defId}+${serial}`;
  let next: ImpGameState = {
    ...state,
    cardsById: { ...state.cardsById, [id]: { id, defId } },
    hidden: {
      ...state.hidden,
      [pid]: { ...state.hidden[pid], discard: [...state.hidden[pid].discard, id] },
    },
  };
  next = impLog(next, {
    event: 'card.acquired',
    text: `${next.players[pid].name} acquired ${def.name}.`,
    data: { defId },
  });
  if (def.acquireGains) {
    next = applyGains(next, pid, def.acquireGains).state;
  }
  return next;
}
