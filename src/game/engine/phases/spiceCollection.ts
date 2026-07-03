import { TERRITORIES } from '../../data/territories';
import type { AllowedAction, GameState, TurnAction, ValidationResult } from '../../types';
import { fail } from '../../types';
import { appendLog } from '../log';
import { occupantsOf, stormOrder } from '../state';
import type { PhaseModule } from './module';

/**
 * Spice collection: forces sitting on spice harvest it automatically.
 * Rate per force is configured here — the base rate, or the boosted rate for a
 * faction that solely controls an ornithopter city (VERIFY).
 */
const BASE_RATE = 2; // VERIFY
const CITY_RATE = 3; // VERIFY
const CITY_IDS = ['arrakeen', 'carthag']; // VERIFY

export const spiceCollectionPhase: PhaseModule = {
  phase: 'spiceCollection',

  onEnter(state): GameState {
    let next = state;
    let collectedAnything = false;

    for (const playerId of stormOrder(next)) {
      const faction = next.players[playerId].factionId;
      const rate = CITY_IDS.some(
        (c) => occupantsOf(next, c).length === 1 && occupantsOf(next, c)[0] === faction,
      )
        ? CITY_RATE
        : BASE_RATE;

      for (const stack of next.stacks.filter((s) => s.factionId === faction && !s.isAdvisor)) {
        const spice = next.spiceOnBoard.find(
          (sp) => sp.territoryId === stack.territoryId && sp.sector === stack.sector && sp.amount > 0,
        );
        if (!spice) continue;
        const capacity = (stack.forces + stack.specialForces) * rate;
        const taken = Math.min(capacity, spice.amount);
        if (taken <= 0) continue;
        collectedAnything = true;
        next = {
          ...next,
          players: {
            ...next.players,
            [playerId]: { ...next.players[playerId], spice: next.players[playerId].spice + taken },
          },
          spiceOnBoard: next.spiceOnBoard
            .map((sp) => (sp === spice ? { ...sp, amount: sp.amount - taken } : sp))
            .filter((sp) => sp.amount > 0),
        };
        next = appendLog(next, {
          event: 'spiceCollection.collected',
          text: `${next.players[playerId].name} harvested ${taken} spice in ${TERRITORIES[stack.territoryId].name}.`,
          data: { playerId, territoryId: stack.territoryId, sector: stack.sector, taken, rate },
        });
      }
    }
    if (!collectedAnything) {
      next = appendLog(next, { event: 'spiceCollection.none', text: 'No spice was harvested this round.' });
    }
    return next;
  },

  getAllowedActions(): AllowedAction[] {
    return []; // automatic
  },
  validateAction(_state, action): ValidationResult {
    return fail('wrong-phase', `Action ${action.type} is not part of spice collection.`);
  },
  applyAction(_state, action): GameState {
    throw new Error(`spice collection cannot apply ${action.type}`);
  },
  isPhaseComplete(): boolean {
    return true;
  },
  advancePhase(state): GameState {
    return { ...state, phase: 'mentatPause' };
  },
};
