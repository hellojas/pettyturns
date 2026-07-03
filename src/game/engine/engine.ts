import type {
  AllowedAction,
  GameState,
  PlayerId,
  TurnAction,
  ValidationResult,
} from '../types';
import { fail } from '../types';
import { phaseModule } from './phases';

/**
 * Top-level engine facade. The UI (and later, the server) talks only to this:
 *
 *   validateAction(state, action)  — cheap, never throws
 *   applyAction(state, action)     — validates, applies, then auto-advances
 *   getAllowedActions(state, id)   — drives the ActionPanel / permissions
 *
 * Auto-advance: after every applied action the engine advances through any
 * phases that report complete (phases with nothing to decide run their
 * automatic work in onEnter). This keeps clients trivially in sync: state is
 * always resting at a point where some player has something to do, or the
 * game is finished.
 */

export function validateAction(state: GameState, action: TurnAction): ValidationResult {
  if (state.victory || state.phase === 'finished') return fail('game-over', 'The game is over.');
  if (action.playerId !== 'SYSTEM' && !state.players[action.playerId])
    return fail('unknown-player', 'Unknown player.');
  return phaseModule(state.phase).validateAction(state, action);
}

export function getAllowedActions(state: GameState, playerId: PlayerId): AllowedAction[] {
  if (state.victory || state.phase === 'finished') return [];
  if (!state.players[playerId]) return [];
  return phaseModule(state.phase).getAllowedActions(state, playerId);
}

/** Advance through phases whose work is done (bounded to guarantee progress). */
export function autoAdvance(state: GameState): GameState {
  let current = state;
  for (let guard = 0; guard < 64; guard++) {
    if (current.victory && current.phase === 'finished') return current;
    const mod = phaseModule(current.phase);
    if (!mod.isPhaseComplete(current)) return current;
    const before = current.phase;
    current = mod.advancePhase(current);
    if (current.phase === 'finished') return current;
    if (current.phase === before) {
      throw new Error(`Phase '${before}' advanced to itself — refusing to loop.`);
    }
    const entered = phaseModule(current.phase);
    if (entered.onEnter) current = entered.onEnter(current);
  }
  throw new Error('autoAdvance exceeded its safety bound — a phase is failing to make progress.');
}

/** Validate and apply a player action, then settle the game at the next decision point. */
export function applyAction(state: GameState, action: TurnAction): GameState {
  const verdict = validateAction(state, action);
  if (!verdict.ok) {
    throw new Error(`Illegal action ${action.type}: [${verdict.code}] ${verdict.message}`);
  }
  const next = phaseModule(state.phase).applyAction(state, action);
  return autoAdvance(next);
}

/** Start a freshly-created game: run setup's automatic completion if nothing is pending. */
export function startGame(state: GameState): GameState {
  const entered = phaseModule(state.phase);
  const withEnter = state.phase === 'setup' ? state : entered.onEnter ? entered.onEnter(state) : state;
  return autoAdvance(withEnter);
}
