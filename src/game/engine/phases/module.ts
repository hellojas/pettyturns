import type { AllowedAction, GameState, Phase, PlayerId, TurnAction, ValidationResult } from '../../types';

/**
 * Common interface every phase implements. The top-level engine routes actions
 * to the module for `state.phase`, then auto-advances while `isPhaseComplete`.
 *
 * `onEnter` runs exactly once when the phase becomes current (called by the
 * engine, not by other phases) — it performs any automatic work the phase
 * begins with (drawing spice cards, detecting battles, queueing players).
 */
export interface PhaseModule {
  phase: Phase;
  onEnter?(state: GameState): GameState;
  getAllowedActions(state: GameState, playerId: PlayerId): AllowedAction[];
  validateAction(state: GameState, action: TurnAction): ValidationResult;
  applyAction(state: GameState, action: TurnAction): GameState;
  isPhaseComplete(state: GameState): boolean;
  /** End-of-phase bookkeeping; must set state.phase to the next phase. */
  advancePhase(state: GameState): GameState;
}

/** Shared guard: the game is over — nothing is allowed. */
export function gameOver(state: GameState): boolean {
  return state.victory !== null || state.phase === 'finished';
}
