import { createImperiumGame } from '../../imperium/engine/setup';
import { impApply } from '../../imperium/engine/engine';
import { IMP_FACTIONS, type CardId, type ImpAction, type ImpGameState, type PlayerId, type SpaceId } from '../../imperium/types';
import { IMP_CARD_DEFS } from '../../imperium/data/cards';
import { IMP_SPACES } from '../../imperium/data/spaces';

// Default lineup deliberately keeps Paul out of the low seats: his foresight
// passive raises a pending decision on every reveal, and most tests drive plain
// reveal→act sequences. Tests that exercise Paul patch the leader explicitly.
export function makeImp(names: string[] = ['Alice', 'Bob'], seed = 42): ImpGameState {
  const leaders = ['helenaRichese', 'baronHarkonnen', 'dukeLeto', 'glossuRabban'];
  return createImperiumGame({
    gameId: 'imp-test',
    seed,
    createdAt: '2026-01-01T00:00:00.000Z',
    seats: names.map((name, i) => ({ playerId: `p${i + 1}`, name, leaderId: leaders[i] })),
  });
}

export function apply(state: ImpGameState, action: ImpAction): ImpGameState {
  return impApply(state, action);
}

/** Find a card in hand whose def has an icon matching the space. */
export function handCardFor(state: ImpGameState, pid: PlayerId, spaceId: SpaceId): CardId | undefined {
  const space = IMP_SPACES[spaceId];
  return state.hidden[pid].hand.find((cardId) =>
    IMP_CARD_DEFS[state.cardsById[cardId].defId].icons.includes(space.icon),
  );
}

/** Give a player resources/hand tweaks for focused tests. */
export function patch(state: ImpGameState, pid: PlayerId, patchObj: Partial<ImpGameState['players'][string]>): ImpGameState {
  return { ...state, players: { ...state.players, [pid]: { ...state.players[pid], ...patchObj } } };
}

/** Force a specific set of hand cards (instances must exist in cardsById). */
export function setHand(state: ImpGameState, pid: PlayerId, defIds: string[]): ImpGameState {
  const hidden = state.hidden[pid];
  const pool = [...hidden.hand, ...hidden.deck, ...hidden.discard];
  const hand: CardId[] = [];
  const remaining = [...pool];
  for (const defId of defIds) {
    const idx = remaining.findIndex((c) => state.cardsById[c].defId === defId);
    if (idx === -1) throw new Error(`no ${defId} available for ${pid}`);
    hand.push(remaining.splice(idx, 1)[0]);
  }
  return {
    ...state,
    hidden: { ...state.hidden, [pid]: { ...hidden, hand, deck: remaining, discard: [] } },
  };
}

/** Move an intrigue instance of `defId` from the deck into a player's hand. */
export function giveIntrigue(state: ImpGameState, pid: PlayerId, defId: string): ImpGameState {
  const id = state.intrigueDeck.find((i) => state.intrigueById[i].defId === defId);
  if (!id) throw new Error(`no ${defId} in the intrigue deck`);
  return {
    ...state,
    intrigueDeck: state.intrigueDeck.filter((i) => i !== id),
    hidden: { ...state.hidden, [pid]: { ...state.hidden[pid], intrigue: [...state.hidden[pid].intrigue, id] } },
  };
}

/**
 * Auto-resolve every pending decision with a neutral default: influence goes to
 * the first allowed track, optional trashes are declined, deck peeks are kept.
 * Lets flow-driving helpers step past choice prompts without changing outcomes.
 */
export function drainDecisions(state: ImpGameState): ImpGameState {
  let s = state;
  let guard = 0;
  while (s.pendingDecisions.length > 0 && guard++ < 50) {
    const d = s.pendingDecisions[0];
    if (d.kind === 'influence') {
      s = apply(s, {
        type: 'imp/resolveDecision',
        playerId: d.playerId,
        decisionId: d.id,
        faction: (d.factions ?? IMP_FACTIONS)[0],
      });
    } else {
      // trash → decline; deckPeek → keep. Both are the empty-extra resolution.
      s = apply(s, { type: 'imp/resolveDecision', playerId: d.playerId, decisionId: d.id });
    }
  }
  return s;
}

/** Play out exactly one round with no purchases or agent turns (reveal + end + pass). */
export function endRoundQuietly(state: ImpGameState): ImpGameState {
  const startRound = state.round;
  let s = drainDecisions(state);
  let guard = 0;
  while (s.phase === 'playerTurns' && s.round === startRound && s.turn && guard++ < 40) {
    const pid = s.turn;
    if (!s.players[pid].revealed) {
      s = drainDecisions(apply(s, { type: 'imp/reveal', playerId: pid }));
    }
    if (
      s.phase === 'playerTurns' &&
      s.round === startRound &&
      s.turn === pid &&
      s.pendingDecisions.length === 0
    ) {
      s = drainDecisions(apply(s, { type: 'imp/endTurn', playerId: pid }));
    }
  }
  guard = 0;
  while (s.phase === 'combat' && s.turn && guard++ < 40) {
    s = drainDecisions(apply(s, { type: 'imp/combatPass', playerId: s.turn }));
  }
  return s;
}
