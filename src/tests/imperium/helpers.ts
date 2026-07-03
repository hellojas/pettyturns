import { createImperiumGame } from '../../imperium/engine/setup';
import { impApply } from '../../imperium/engine/engine';
import type { CardId, ImpAction, ImpGameState, PlayerId, SpaceId } from '../../imperium/types';
import { IMP_CARD_DEFS } from '../../imperium/data/cards';
import { IMP_SPACES } from '../../imperium/data/spaces';

export function makeImp(names: string[] = ['Alice', 'Bob'], seed = 42): ImpGameState {
  const leaders = ['paulAtreides', 'baronHarkonnen', 'dukeLeto', 'glossuRabban'];
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

/** Play out exactly one round with no purchases or agent turns (reveal + end + pass). */
export function endRoundQuietly(state: ImpGameState): ImpGameState {
  const startRound = state.round;
  let s = state;
  let guard = 0;
  while (s.phase === 'playerTurns' && s.round === startRound && s.turn && guard++ < 20) {
    const pid = s.turn;
    if (!s.players[pid].revealed) {
      s = apply(s, { type: 'imp/reveal', playerId: pid });
    }
    if (s.phase === 'playerTurns' && s.round === startRound && s.turn === pid) {
      s = apply(s, { type: 'imp/endTurn', playerId: pid });
    }
  }
  guard = 0;
  while (s.phase === 'combat' && s.turn && guard++ < 20) {
    s = apply(s, { type: 'imp/combatPass', playerId: s.turn });
  }
  return s;
}
