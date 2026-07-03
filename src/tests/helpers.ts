import { createGame, type NewGameSeat } from '../game/engine/setup';
import { applyAction, autoAdvance } from '../game/engine/engine';
import type { FactionId, GameState, PlayerId } from '../game/types';
import { FACTIONS } from '../game/data/factions';

/** Build a game with the given factions; playerIds are p1..pN. */
export function makeGame(factionIds: FactionId[], seed = 42): GameState {
  const seats: NewGameSeat[] = factionIds.map((factionId, i) => ({
    playerId: `p${i + 1}`,
    name: `Player ${i + 1} (${FACTIONS[factionId].name})`,
    factionId,
  }));
  return createGame({ gameId: 'test-game', seed, createdAt: '2026-01-01T00:00:00.000Z', seats });
}

export function playerByFaction(state: GameState, factionId: FactionId): PlayerId {
  const p = Object.values(state.players).find((pl) => pl.factionId === factionId);
  if (!p) throw new Error(`no player for faction ${factionId}`);
  return p.id;
}

/** Auto-complete all interactive setup steps with deterministic choices. */
export function completeSetup(state: GameState): GameState {
  let s = autoAdvance(state);
  // traitor keeps: everyone waiting keeps their first dealt option
  const traitorDecision = s.pendingDecisions.find((d) => d.id === 'setup:traitors');
  if (traitorDecision) {
    for (const pid of traitorDecision.waitingFor) {
      const def = FACTIONS[s.players[pid].factionId];
      const keep = s.hidden[pid].traitorOptions.slice(0, def.traitorsKept).map((t) => t.leaderId);
      s = applyAction(s, { type: 'setup/keepTraitors', playerId: pid, leaderIds: keep });
    }
  }
  // prediction: first faction in seat order, round 3
  const predictionDecision = s.pendingDecisions.find((d) => d.id === 'setup:prediction');
  if (predictionDecision) {
    for (const pid of predictionDecision.waitingFor) {
      const target = Object.values(s.players).find((p) => p.id !== pid)!;
      s = applyAction(s, {
        type: 'setup/submitPrediction',
        playerId: pid,
        factionId: target.factionId,
        round: 3,
      });
    }
  }
  // variable placements: everything into the first allowed territory
  for (const pid of s.playerOrder) {
    const actions = s.phase === 'setup' ? s : s;
    const def = FACTIONS[s.players[pid].factionId];
    const variable =
      def.startingForces.length > 0 &&
      def.startingForces.every((sf) => sf.forces + sf.specialForces === 0);
    if (variable && s.phase === 'setup' && !s.setup.placementsDone.includes(pid)) {
      const home = def.startingForces[0];
      s = applyAction(s, {
        type: 'setup/placeStartingForces',
        playerId: pid,
        placements: [
          {
            territoryId: home.territoryId as string,
            sector: home.sector as number,
            forces: 10,
            specialForces: 0,
          },
        ],
      });
    }
  }
  return s;
}

/** Complete setup and the round-1 storm with fixed dials; lands in bidding (or nexus). */
export function throughFirstStorm(state: GameState, dials: number[] = [3, 4]): GameState {
  let s = completeSetup(state);
  if (s.phase !== 'storm') throw new Error(`expected storm phase, got ${s.phase}`);
  const decision = s.pendingDecisions.find((d) => d.kind === 'stormDial')!;
  decision.waitingFor.forEach((pid, i) => {
    s = applyAction(s, { type: 'storm/dial', playerId: pid, value: dials[i] ?? 0 });
  });
  return s;
}

/** Pass every player through the current bidding phase (no purchases). */
export function passAllBidding(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (s.phase === 'bidding' && s.biddingPhase?.turn && guard++ < 100) {
    s = applyAction(s, { type: 'bidding/pass', playerId: s.biddingPhase.turn });
  }
  return s;
}
