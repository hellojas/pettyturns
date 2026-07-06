import type { ImpGameState, ImpVisibleState, PlayerId } from '../types';

/**
 * The hidden-information gate for the Imperium game. Everything a client
 * renders comes through here: own hand/deck-count/intrigue in full, opponents
 * reduced to counts (their discard, in-play and revealed cards are public
 * information in this game — they sit face up on the table).
 */
export function getVisibleImperiumState(
  state: ImpGameState,
  viewerId: PlayerId | 'SPECTATOR',
): ImpVisibleState {
  const isPlayer = viewerId !== 'SPECTATOR' && !!state.players[viewerId];

  const others: ImpVisibleState['hidden']['others'] = {};
  for (const [pid, hidden] of Object.entries(state.hidden)) {
    if (pid === viewerId) continue;
    others[pid] = {
      handCount: hidden.hand.length,
      deckCount: hidden.deck.length,
      discard: hidden.discard,
      inPlay: hidden.inPlay,
      revealedCards: hidden.revealedCards,
      intrigueCount: hidden.intrigue.length,
    };
  }

  const self = isPlayer
    ? {
        ...state.hidden[viewerId as PlayerId],
        deck: undefined as never,
        deckCount: state.hidden[viewerId as PlayerId].deck.length,
      }
    : null;
  if (self) delete (self as Record<string, unknown>).deck;

  const log = state.log.filter((entry) => {
    if (entry.visibility.scope === 'public') return true;
    return isPlayer && entry.visibility.playerIds.includes(viewerId as PlayerId);
  });

  // Pending decisions are public (so clients know play is blocked and on whom),
  // but a deck-peek's card identity is private to the player deciding.
  const pendingDecisions = state.pendingDecisions.map((d) =>
    d.playerId === viewerId ? d : { ...d, cardId: undefined },
  );

  return {
    gameId: state.gameId,
    schemaVersion: state.schemaVersion,
    createdAt: state.createdAt,
    round: state.round,
    maxRounds: state.maxRounds,
    phase: state.phase,
    players: state.players,
    playerOrder: state.playerOrder,
    firstPlayer: state.firstPlayer,
    turn: state.turn,
    cardsById: state.cardsById, // identity map is public; hidden zones are what's redacted
    imperiumRow: state.imperiumRow,
    reserveSupply: state.reserveSupply, // the Reserve stacks sit face up on the table

    intrigueById: state.intrigueById, // ids only reveal identity via public discards
    intrigueDiscard: state.intrigueDiscard,
    currentConflict: state.currentConflict,
    combatPassed: state.combatPassed,
    occupied: state.occupied,
    makerBonus: state.makerBonus,
    alliances: state.alliances,
    controlledBy: state.controlledBy,
    winner: state.winner,
    finalStandings: state.finalStandings,
    pendingDecisions,
    viewerId,
    hidden: { self, others },
    imperiumDeckCount: state.imperiumDeck.length,
    intrigueDeckCount: state.intrigueDeck.length,
    conflictDeckCount: state.conflictDeck.length,
    rng: { seed: 0, cursor: state.rng.cursor },
    log,
  };
}
