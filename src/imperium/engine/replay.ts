import type { ImpAction, ImpGameState } from '../types';
import { impApply } from './engine';

/**
 * Deterministic replay — the backbone of undo/redo and (later) server-side
 * reconciliation.
 *
 * Because the engine is a pure reducer with its RNG cursor stored in state,
 * folding `impApply` over a recorded action journal from the initial game state
 * reproduces any point in the game exactly. Undo is therefore "replay all but
 * the last k actions"; no inverse operations are needed.
 *
 * The journal stores whole `ImpAction`s (payload included), so replaying an
 * action that was legal when first applied is legal again from the same
 * reconstructed predecessor state. A malformed journal surfaces as a thrown
 * error from `impApply`, which callers can catch.
 */
export function replayImperiumGame(initial: ImpGameState, actions: readonly ImpAction[]): ImpGameState {
  let state = initial;
  for (const action of actions) {
    state = impApply(state, action);
  }
  return state;
}

/**
 * Rebuild the state after the first `count` actions of the journal. `count`
 * is clamped to the journal length, so `stateAfter(initial, journal, 0)` is the
 * initial state and `stateAfter(initial, journal, journal.length)` is current.
 */
export function stateAfter(
  initial: ImpGameState,
  journal: readonly ImpAction[],
  count: number,
): ImpGameState {
  const n = Math.max(0, Math.min(count, journal.length));
  return replayImperiumGame(initial, journal.slice(0, n));
}
