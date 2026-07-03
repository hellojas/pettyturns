import type { AllowedAction, GameState, TurnAction, ValidationResult } from '../../types';
import { fail } from '../../types';
import { appendLog } from '../log';
import { checkVictory } from '../winCheck';
import type { PhaseModule } from './module';

/**
 * Mentat pause: end-of-round win check and bookkeeping. If someone has won,
 * the game finishes; otherwise the round counter advances and a new storm
 * phase begins.
 */
export const mentatPausePhase: PhaseModule = {
  phase: 'mentatPause',

  onEnter(state): GameState {
    const victory = checkVictory(state);
    if (victory) {
      let next: GameState = { ...state, victory };
      return appendLog(next, {
        event: 'game.won',
        text: `Victory (${victory.kind}): ${victory.winners.map((w) => next.players[w].name).join(' and ')}. ${victory.detail}`,
        data: { victory },
      });
    }
    return appendLog(state, {
      event: 'round.ended',
      text: `Round ${state.round} ends with no victor.`,
    });
  },

  getAllowedActions(): AllowedAction[] {
    return [];
  },
  validateAction(_state, action): ValidationResult {
    return fail('wrong-phase', `Action ${action.type} is not part of the mentat pause.`);
  },
  applyAction(_state, action): GameState {
    throw new Error(`mentat pause cannot apply ${action.type}`);
  },
  isPhaseComplete(): boolean {
    return true;
  },

  advancePhase(state): GameState {
    if (state.victory) {
      return { ...state, phase: 'finished' };
    }
    const next: GameState = { ...state, round: state.round + 1, phase: 'storm' };
    return appendLog(next, { event: 'round.begin', text: `Round ${next.round} begins.` });
  },
};
