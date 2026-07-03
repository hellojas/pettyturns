import { GAME_CONSTANTS } from '../data/constants';
import { TERRITORIES } from '../data/territories';
import type {
  FactionId,
  GameState,
  Player,
  PlayerId,
  Sector,
  TerritoryId,
  UnitStack,
} from '../types';

/** Sector arithmetic: sectors run 0..N-1 counterclockwise (storm direction). */
export function normalizeSector(sector: number): Sector {
  const n = GAME_CONSTANTS.sectorCount;
  return ((sector % n) + n) % n;
}

/** Sectors the storm passes through moving `distance` counterclockwise from `from` (exclusive of start, inclusive of end). */
export function stormPath(from: Sector, distance: number): Sector[] {
  const path: Sector[] = [];
  for (let i = 1; i <= distance; i++) path.push(normalizeSector(from + i));
  return path;
}

export function getPlayer(state: GameState, playerId: PlayerId): Player {
  const p = state.players[playerId];
  if (!p) throw new Error(`Unknown player '${playerId}'`);
  return p;
}

export function getPlayerByFaction(state: GameState, factionId: FactionId): Player | undefined {
  return Object.values(state.players).find((p) => p.factionId === factionId);
}

export function stacksIn(state: GameState, territoryId: TerritoryId, sector?: Sector): UnitStack[] {
  return state.stacks.filter(
    (s) => s.territoryId === territoryId && (sector === undefined || s.sector === sector),
  );
}

/** Factions with fighting (non-advisor) presence in a territory. */
export function occupantsOf(state: GameState, territoryId: TerritoryId): FactionId[] {
  const set = new Set<FactionId>();
  for (const s of stacksIn(state, territoryId)) {
    if (!s.isAdvisor && s.forces + s.specialForces > 0) set.add(s.factionId);
  }
  return [...set];
}

/** A faction controls a stronghold if it is the only fighting occupant. */
export function controlsTerritory(state: GameState, factionId: FactionId, territoryId: TerritoryId): boolean {
  const occ = occupantsOf(state, territoryId);
  return occ.length === 1 && occ[0] === factionId;
}

/** Add forces to the board, merging with an existing stack of the same faction/territory/sector. */
export function addForces(
  state: GameState,
  factionId: FactionId,
  territoryId: TerritoryId,
  sector: Sector,
  forces: number,
  specialForces: number,
  isAdvisor = false,
): GameState {
  const stacks = state.stacks.slice();
  const idx = stacks.findIndex(
    (s) =>
      s.factionId === factionId &&
      s.territoryId === territoryId &&
      s.sector === sector &&
      !!s.isAdvisor === isAdvisor,
  );
  if (idx >= 0) {
    stacks[idx] = {
      ...stacks[idx],
      forces: stacks[idx].forces + forces,
      specialForces: stacks[idx].specialForces + specialForces,
    };
  } else {
    stacks.push({ factionId, territoryId, sector, forces, specialForces, isAdvisor });
  }
  return { ...state, stacks: stacks.filter((s) => s.forces + s.specialForces > 0) };
}

/** Remove forces from the board (caller must have validated availability). */
export function removeForces(
  state: GameState,
  factionId: FactionId,
  territoryId: TerritoryId,
  sector: Sector,
  forces: number,
  specialForces: number,
): GameState {
  const stacks = state.stacks.map((s) => {
    if (s.factionId === factionId && s.territoryId === territoryId && s.sector === sector) {
      return { ...s, forces: s.forces - forces, specialForces: s.specialForces - specialForces };
    }
    return s;
  });
  for (const s of stacks) {
    if (s.forces < 0 || s.specialForces < 0) {
      throw new Error(`removeForces would make a negative stack in ${territoryId}/${sector}`);
    }
  }
  return { ...state, stacks: stacks.filter((s) => s.forces + s.specialForces > 0) };
}

/** Send forces to the tanks (dead pool) of their owner. */
export function sendToTanks(state: GameState, playerId: PlayerId, forces: number, specialForces: number): GameState {
  const p = getPlayer(state, playerId);
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...p,
        tanksForces: {
          forces: p.tanksForces.forces + forces,
          specialForces: p.tanksForces.specialForces + specialForces,
        },
      },
    },
  };
}

/** Territory ids whose area includes the given sector. */
export function territoriesInSector(sector: Sector): TerritoryId[] {
  return Object.values(TERRITORIES)
    .filter((t) => t.sectors.includes(sector))
    .map((t) => t.id);
}

/** True if any part of the territory is under the storm sector — but rock and strongholds shelter forces. */
export function sectorIsStormProtected(territoryId: TerritoryId): boolean {
  const t = TERRITORIES[territoryId];
  return t.kind === 'rock' || t.kind === 'stronghold' || t.kind === 'polarSink';
}

/**
 * Storm order: players act starting from the first player marker the storm
 * will next reach, proceeding counterclockwise. The player whose seat sector is
 * closest ahead of the storm (in storm direction) goes first.
 */
export function stormOrder(state: GameState): PlayerId[] {
  const n = GAME_CONSTANTS.sectorCount;
  const ids = [...state.playerOrder];
  const dist = (seat: Sector) => {
    // distance counterclockwise from the storm sector to the seat, minimum 1
    const d = (((seat - state.storm.sector) % n) + n) % n;
    return d === 0 ? n : d;
  };
  return ids.sort((a, b) => dist(state.players[a].seatSector) - dist(state.players[b].seatSector));
}

export function firstPlayer(state: GameState): PlayerId {
  return stormOrder(state)[0];
}
