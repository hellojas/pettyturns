import { FACTIONS } from '../data/factions';
import { STRONGHOLD_IDS } from '../data/territories';
import { GAME_CONSTANTS } from '../data/constants';
import type { FactionId, GameState, PlayerId, VictoryResult } from '../types';
import { controlsTerritory, getPlayerByFaction, occupantsOf } from './state';

/**
 * Pure victory evaluation, called at the end of every round (mentat pause).
 *
 * Order of checks:
 *  1. Solo stronghold control (threshold from constants).
 *  2. Alliance stronghold control (combined threshold from constants).
 *  3. If this is the final round and nothing above triggered:
 *     transporter default win, then the desert faction's special condition.
 *  4. Any winner found is filtered through the coexistence faction's secret
 *     prediction — an exact (faction, round) match steals the win.
 */

function strongholdsControlled(state: GameState, factionId: FactionId): string[] {
  return STRONGHOLD_IDS.filter((t) => controlsTerritory(state, factionId, t));
}

function allyOf(state: GameState, factionId: FactionId): FactionId | undefined {
  return state.alliances.find((a) => a.members.includes(factionId))?.members.find((m) => m !== factionId);
}

function playerIdOf(state: GameState, factionId: FactionId): PlayerId | undefined {
  return getPlayerByFaction(state, factionId)?.id;
}

function applyPrediction(state: GameState, candidate: VictoryResult): VictoryResult {
  for (const hidden of Object.values(state.hidden)) {
    const prediction = hidden.prediction;
    if (!prediction) continue;
    const predictedPlayer = playerIdOf(state, prediction.factionId);
    if (!predictedPlayer) continue;
    if (candidate.winners.includes(predictedPlayer) && prediction.round === state.round) {
      return {
        winners: [hidden.playerId],
        kind: 'prediction',
        round: state.round,
        detail: 'The secret prediction named the exact winner and round — the seer takes the victory instead.',
      };
    }
  }
  return candidate;
}

export function checkVictory(state: GameState): VictoryResult | null {
  const factionIds = Object.values(state.players).map((p) => p.factionId);

  // 1. solo stronghold win
  for (const factionId of factionIds) {
    const held = strongholdsControlled(state, factionId);
    if (held.length >= GAME_CONSTANTS.strongholdsToWinSolo) {
      const candidate: VictoryResult = {
        winners: [playerIdOf(state, factionId)!],
        kind: 'stronghold',
        round: state.round,
        detail: `${FACTIONS[factionId].name} controls ${held.length} strongholds.`,
      };
      return applyPrediction(state, candidate);
    }
  }

  // 2. alliance stronghold win
  for (const alliance of state.alliances) {
    const [f1, f2] = alliance.members;
    const held = new Set([...strongholdsControlled(state, f1), ...strongholdsControlled(state, f2)]);
    if (held.size >= GAME_CONSTANTS.strongholdsToWinAlliance) {
      const candidate: VictoryResult = {
        winners: [playerIdOf(state, f1)!, playerIdOf(state, f2)!],
        kind: 'alliance',
        round: state.round,
        detail: `The alliance of ${FACTIONS[f1].name} and ${FACTIONS[f2].name} controls ${held.size} strongholds together.`,
      };
      return applyPrediction(state, candidate);
    }
  }

  // 3. final-round defaults
  if (state.round >= state.maxRounds) {
    // desert faction special condition (params in config, VERIFY)
    const desert = factionIds.find((f) => FACTIONS[f].powers.some((p) => p.id === 'special-victory'));
    if (desert) {
      const holdsTabr = controlsTerritory(state, desert, 'sietch_tabr');
      const holdsHabbanya = controlsTerritory(state, desert, 'habbanya_sietch');
      const hostiles: FactionId[] = ['atreides', 'harkonnen', 'emperor'];
      const tueksOcc = occupantsOf(state, 'tueks_sietch');
      const tueksClear = !tueksOcc.some((f) => hostiles.includes(f));
      if (holdsTabr && holdsHabbanya && tueksClear) {
        const winners = [playerIdOf(state, desert)!];
        const ally = allyOf(state, desert);
        if (ally) winners.push(playerIdOf(state, ally)!);
        return applyPrediction(state, {
          winners,
          kind: 'special-fremen',
          round: state.round,
          detail: `${FACTIONS[desert].name} holds the desert at the end of the final round.`,
        });
      }
    }

    // transporter default win
    const transporter = factionIds.find((f) => FACTIONS[f].powers.some((p) => p.id === 'default-win'));
    if (transporter) {
      const winners = [playerIdOf(state, transporter)!];
      const ally = allyOf(state, transporter);
      if (ally) winners.push(playerIdOf(state, ally)!);
      return applyPrediction(state, {
        winners,
        kind: 'special-guild',
        round: state.round,
        detail: `No faction met a victory condition by the end of the final round — ${FACTIONS[transporter].name} wins by default.`,
      });
    }

    // nobody at all: shared draw among everyone (house fallback, VERIFY)
    return {
      winners: [...state.playerOrder],
      kind: 'default',
      round: state.round,
      detail: 'The final round ended with no victor — the game ends in a shared draw.',
    };
  }

  return null;
}
