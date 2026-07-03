import { FACTIONS } from '../../data/factions';
import { GAME_CONSTANTS } from '../../data/constants';
import { LEADERS } from '../../data/leaders';
import type {
  AllowedAction,
  GameState,
  KeepTraitorsAction,
  PlaceStartingForcesAction,
  PlayerId,
  SubmitPredictionAction,
  TurnAction,
  ValidationResult,
} from '../../types';
import { fail, ok } from '../../types';
import { appendLog, privateTo } from '../log';
import { addForces, getPlayer } from '../state';
import type { PhaseModule } from './module';

/**
 * Interactive remainder of setup: traitor keeps, the coexistence faction's
 * secret prediction, and variable starting placements (the desert faction
 * splits its starting forces among its configured home areas).
 */

function needsPlacement(state: GameState, playerId: PlayerId): boolean {
  const def = FACTIONS[getPlayer(state, playerId).factionId];
  const variable = def.startingForces.some((sf) => sf.forces + sf.specialForces === 0);
  const totalFixed = def.startingForces.reduce((n, sf) => n + sf.forces + sf.specialForces, 0);
  const totalExpected = def.startingForces.length > 0 && totalFixed === 0;
  return variable && totalExpected && !state.setup.placementsDone.includes(playerId);
}

/** Total variable forces the faction distributes at setup (reserves hold them until placed). */
function variablePlacementBudget(state: GameState, playerId: PlayerId): number {
  // MVP: the desert faction places 10 from reserves among its home territories. VERIFY.
  return 10;
}

function pendingFor(state: GameState, playerId: PlayerId): string[] {
  return state.pendingDecisions
    .filter((d) => d.waitingFor.includes(playerId) && d.committed[playerId] === undefined)
    .map((d) => d.id);
}

export const setupPhase: PhaseModule = {
  phase: 'setup',

  getAllowedActions(state, playerId): AllowedAction[] {
    const actions: AllowedAction[] = [];
    const pending = pendingFor(state, playerId);
    if (pending.includes('setup:traitors')) {
      const options = state.hidden[playerId].traitorOptions.map((t) => t.leaderId);
      actions.push({
        type: 'setup/keepTraitors',
        label: 'Choose which traitor card to keep',
        params: { options, keep: FACTIONS[getPlayer(state, playerId).factionId].traitorsKept },
      });
    }
    if (pending.includes('setup:prediction')) {
      actions.push({
        type: 'setup/submitPrediction',
        label: 'Secretly predict the winning faction and round',
        params: { rounds: state.maxRounds },
      });
    }
    if (needsPlacement(state, playerId)) {
      const def = FACTIONS[getPlayer(state, playerId).factionId];
      actions.push({
        type: 'setup/placeStartingForces',
        label: 'Distribute your starting forces among your home territories',
        params: {
          territories: def.startingForces.map((sf) => sf.territoryId),
          total: variablePlacementBudget(state, playerId),
        },
      });
    }
    return actions;
  },

  validateAction(state, action): ValidationResult {
    switch (action.type) {
      case 'setup/keepTraitors': {
        const a = action as KeepTraitorsAction;
        if (!pendingFor(state, a.playerId as PlayerId).includes('setup:traitors'))
          return fail('not-waiting', 'No traitor selection is pending for this player.');
        const def = FACTIONS[getPlayer(state, a.playerId as PlayerId).factionId];
        if (a.leaderIds.length !== def.traitorsKept)
          return fail('wrong-count', `You must keep exactly ${def.traitorsKept} traitor card(s).`);
        const options = state.hidden[a.playerId as PlayerId].traitorOptions.map((t) => t.leaderId);
        if (!a.leaderIds.every((l) => options.includes(l)))
          return fail('not-dealt', 'You can only keep traitor cards you were dealt.');
        return ok();
      }
      case 'setup/submitPrediction': {
        const a = action as SubmitPredictionAction;
        if (!pendingFor(state, a.playerId as PlayerId).includes('setup:prediction'))
          return fail('not-waiting', 'No prediction is pending for this player.');
        if (!Object.values(state.players).some((p) => p.factionId === a.factionId))
          return fail('unknown-faction', 'Predicted faction is not in this game.');
        if (a.round < 1 || a.round > state.maxRounds)
          return fail('bad-round', `Round must be between 1 and ${state.maxRounds}.`);
        return ok();
      }
      case 'setup/placeStartingForces': {
        const a = action as PlaceStartingForcesAction;
        const playerId = a.playerId as PlayerId;
        if (!needsPlacement(state, playerId))
          return fail('not-waiting', 'No starting placement is pending for this player.');
        const def = FACTIONS[getPlayer(state, playerId).factionId];
        const allowed = def.startingForces.map((sf) => sf.territoryId);
        const total = a.placements.reduce((n, p) => n + p.forces + p.specialForces, 0);
        if (total !== variablePlacementBudget(state, playerId))
          return fail('wrong-total', `You must place exactly ${variablePlacementBudget(state, playerId)} forces.`);
        for (const p of a.placements) {
          if (!allowed.includes(p.territoryId))
            return fail('bad-territory', `You may not place starting forces in ${p.territoryId}.`);
          if (p.forces < 0 || p.specialForces < 0) return fail('negative', 'Force counts must be non-negative.');
        }
        return ok();
      }
      default:
        return fail('wrong-phase', `Action ${action.type} is not part of setup.`);
    }
  },

  applyAction(state, action): GameState {
    switch (action.type) {
      case 'setup/keepTraitors': {
        const a = action as KeepTraitorsAction;
        const playerId = a.playerId as PlayerId;
        const hidden = state.hidden[playerId];
        let next: GameState = {
          ...state,
          hidden: {
            ...state.hidden,
            [playerId]: {
              ...hidden,
              traitors: a.leaderIds.map((leaderId) => ({ leaderId })),
            },
          },
          pendingDecisions: state.pendingDecisions.map((d) =>
            d.id === 'setup:traitors' ? { ...d, committed: { ...d.committed, [playerId]: a.leaderIds } } : d,
          ),
        };
        return appendLog(next, {
          event: 'setup.traitorsKept',
          text: `${getPlayer(state, playerId).name} kept ${a.leaderIds.length} traitor card(s): ${a.leaderIds
            .map((l) => LEADERS[l].name)
            .join(', ')}.`,
          visibility: privateTo(playerId),
          at: a.at,
        });
      }
      case 'setup/submitPrediction': {
        const a = action as SubmitPredictionAction;
        const playerId = a.playerId as PlayerId;
        let next: GameState = {
          ...state,
          hidden: {
            ...state.hidden,
            [playerId]: {
              ...state.hidden[playerId],
              prediction: { factionId: a.factionId, round: a.round },
            },
          },
          setup: { ...state.setup, predictionsDone: [...state.setup.predictionsDone, playerId] },
          pendingDecisions: state.pendingDecisions.map((d) =>
            d.id === 'setup:prediction'
              ? { ...d, committed: { ...d.committed, [playerId]: { factionId: a.factionId, round: a.round } } }
              : d,
          ),
        };
        return appendLog(next, {
          event: 'setup.predictionMade',
          text: `${getPlayer(state, playerId).name} sealed a secret prediction.`,
          at: a.at,
        });
      }
      case 'setup/placeStartingForces': {
        const a = action as PlaceStartingForcesAction;
        const playerId = a.playerId as PlayerId;
        const player = getPlayer(state, playerId);
        let next = state;
        let placedForces = 0;
        let placedSpecial = 0;
        for (const p of a.placements) {
          if (p.forces + p.specialForces === 0) continue;
          next = addForces(next, player.factionId, p.territoryId, p.sector, p.forces, p.specialForces);
          placedForces += p.forces;
          placedSpecial += p.specialForces;
        }
        next = {
          ...next,
          players: {
            ...next.players,
            [playerId]: {
              ...next.players[playerId],
              reserves: {
                forces: player.reserves.forces - placedForces,
                specialForces: player.reserves.specialForces - placedSpecial,
              },
            },
          },
          setup: { ...next.setup, placementsDone: [...next.setup.placementsDone, playerId] },
        };
        return appendLog(next, {
          event: 'setup.forcesPlaced',
          text: `${player.name} deployed starting forces.`,
          data: { placements: a.placements },
          at: a.at,
        });
      }
      default:
        throw new Error(`setup phase cannot apply ${action.type}`);
    }
  },

  isPhaseComplete(state): boolean {
    const allDecided = state.pendingDecisions
      .filter((d) => d.id.startsWith('setup:'))
      .every((d) => d.waitingFor.every((p) => d.committed[p] !== undefined));
    const allPlaced = state.playerOrder.every((p) => !needsPlacement(state, p));
    return allDecided && allPlaced;
  },

  advancePhase(state): GameState {
    let next: GameState = {
      ...state,
      setup: { ...state.setup, complete: true },
      pendingDecisions: state.pendingDecisions.filter((d) => !d.id.startsWith('setup:')),
      phase: 'storm',
    };
    return appendLog(next, { event: 'setup.complete', text: 'Setup complete. Round 1 begins with the storm.' });
  },
};
