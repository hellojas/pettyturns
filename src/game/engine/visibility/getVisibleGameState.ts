import type {
  GameLogEntry,
  GameState,
  PlayerId,
  PublicGameState,
  TreacheryCard,
} from '../../types';

/**
 * The single gate for hidden information. Everything a client renders must
 * come through here; the raw GameState never leaves the trusted side once the
 * game moves to a server.
 *
 * Redactions:
 *  - other players' hands → counts
 *  - other players' traitors and predictions → counts / booleans
 *  - draw piles → counts (discards stay public)
 *  - treachery card identities → only revealed instances (own hand + discards)
 *  - pending decisions → who has committed, never the payloads (own payload visible)
 *  - log → entries whose visibility includes the viewer
 */
export function getVisibleGameState(
  state: GameState,
  viewerId: PlayerId | 'SPECTATOR',
): PublicGameState {
  const isPlayer = viewerId !== 'SPECTATOR' && !!state.players[viewerId];
  const self = isPlayer ? state.hidden[viewerId] : null;

  const others: PublicGameState['hidden']['others'] = {};
  for (const [pid, hidden] of Object.entries(state.hidden)) {
    if (pid === viewerId) continue;
    others[pid] = {
      handCount: hidden.hand.length,
      traitorCount: hidden.traitors.length,
      hasPrediction: hidden.prediction !== undefined,
    };
  }

  // card identities the viewer may know: own hand + all discards
  const revealed: Record<string, TreacheryCard> = {};
  for (const cardId of state.decks.treacheryDiscard) {
    revealed[cardId] = state.decks.treacheryById[cardId];
  }
  if (self) {
    for (const card of self.hand) revealed[card.id] = card;
  }

  const log: GameLogEntry[] = state.log.filter((entry) => {
    if (entry.visibility.scope === 'public') return true;
    return isPlayer && entry.visibility.playerIds.includes(viewerId as PlayerId);
  });

  const pendingDecisions: PublicGameState['pendingDecisions'] = state.pendingDecisions.map((d) => ({
    id: d.id,
    kind: d.kind,
    waitingFor: d.waitingFor,
    context: d.context,
    createdOnRound: d.createdOnRound,
    committedBy: d.waitingFor.filter((p) => d.committed[p] !== undefined),
    ownCommitment: isPlayer ? d.committed[viewerId as PlayerId] : undefined,
  }));

  // battle plans are hidden until revealed: strip unrevealed plans
  const battlePhase = state.battlePhase
    ? {
        ...state.battlePhase,
        battles: state.battlePhase.battles.map((b) => {
          const bothIn = b.plans[b.aggressor] !== undefined && b.plans[b.defender] !== undefined;
          if (bothIn || b.resolved) return b;
          const visiblePlans: typeof b.plans = {};
          if (isPlayer && b.plans[viewerId as PlayerId]) {
            visiblePlans[viewerId as PlayerId] = b.plans[viewerId as PlayerId];
          }
          return { ...b, plans: visiblePlans };
        }),
      }
    : null;

  return {
    gameId: state.gameId,
    schemaVersion: state.schemaVersion,
    createdAt: state.createdAt,
    round: state.round,
    maxRounds: state.maxRounds,
    phase: state.phase,
    interruptedPhase: state.interruptedPhase,
    players: state.players,
    playerOrder: state.playerOrder,
    storm: state.storm,
    stacks: state.stacks,
    spiceOnBoard: state.spiceOnBoard,
    alliances: state.alliances,
    setup: state.setup,
    stormPhase: state.stormPhase,
    spiceBlowPhase: state.spiceBlowPhase,
    revivalPhase: state.revivalPhase,
    biddingPhase: state.biddingPhase,
    shipmentMovementPhase: state.shipmentMovementPhase,
    battlePhase,
    nexusPhase: state.nexusPhase,
    rng: { seed: 0, cursor: state.rng.cursor }, // seed is secret — it determines every future draw
    victory: state.victory,
    viewerId,
    hidden: { self, others },
    decks: {
      treacheryDrawCount: state.decks.treacheryDraw.length,
      treacheryDiscard: state.decks.treacheryDiscard,
      treacheryById: revealed,
      spiceDrawCount: state.decks.spiceDraw.length,
      spiceDiscardA: state.decks.spiceDiscardA,
      spiceDiscardB: state.decks.spiceDiscardB,
      spiceById: state.decks.spiceById, // spice cards are public once drawn; ids alone leak nothing material (MVP)
    },
    pendingDecisions,
    log,
  };
}
