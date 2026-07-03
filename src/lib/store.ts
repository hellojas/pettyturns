import { create } from 'zustand';
import { createGame, type NewGameSeat } from '../game/engine/setup';
import { applyAction, autoAdvance, getAllowedActions, validateAction } from '../game/engine/engine';
import { getVisibleGameState } from '../game/engine/visibility/getVisibleGameState';
import type {
  AllowedAction,
  FactionId,
  GameState,
  PlayerId,
  PublicGameState,
  Sector,
  TerritoryId,
  TurnAction,
} from '../game/types';

/**
 * Hotseat client store (milestone 5).
 *
 * The full GameState lives here because hotseat is trusted; every render goes
 * through getVisibleGameState(state, viewingAs) so the UI only ever sees what
 * the seated player may see — the exact seam where a server slots in later
 * (the server would hold `state` and send each client its visible view).
 */

const INDEX_KEY = 'dune:games';
const gameKey = (gameId: string) => `dune:game:${gameId}`;

export interface SavedGameMeta {
  gameId: string;
  createdAt: string;
  updatedAt: string;
  players: string[];
  round: number;
  phase: string;
}

function readIndex(): SavedGameMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as SavedGameMeta[];
  } catch {
    return [];
  }
}

function persist(state: GameState): void {
  localStorage.setItem(gameKey(state.gameId), JSON.stringify(state));
  const meta: SavedGameMeta = {
    gameId: state.gameId,
    createdAt: state.createdAt,
    updatedAt: new Date().toISOString(),
    players: Object.values(state.players).map((p) => p.name),
    round: state.round,
    phase: state.phase,
  };
  const index = readIndex().filter((m) => m.gameId !== state.gameId);
  localStorage.setItem(INDEX_KEY, JSON.stringify([meta, ...index]));
}

export function listSavedGames(): SavedGameMeta[] {
  return readIndex();
}

export function deleteSavedGame(gameId: string): void {
  localStorage.removeItem(gameKey(gameId));
  localStorage.setItem(INDEX_KEY, JSON.stringify(readIndex().filter((m) => m.gameId !== gameId)));
}

export interface SelectedCell {
  territoryId: TerritoryId;
  sector: Sector | null;
}

/** Omit that distributes over a discriminated union (plain Omit collapses it). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type DispatchableAction = DistributiveOmit<TurnAction, 'at'>;

interface GameStore {
  state: GameState | null;
  viewingAs: PlayerId | 'SPECTATOR';
  selectedCell: SelectedCell | null;
  lastError: string | null;

  newGame(seats: Array<{ name: string; factionId: FactionId }>, seed?: number): string;
  loadGame(gameId: string): boolean;
  dispatch(action: DispatchableAction): void;
  setViewingAs(viewer: PlayerId | 'SPECTATOR'): void;
  selectCell(cell: SelectedCell | null): void;
  clearError(): void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  viewingAs: 'SPECTATOR',
  selectedCell: null,
  lastError: null,

  newGame(seatInputs, seed) {
    const gameId = `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const seats: NewGameSeat[] = seatInputs.map((s, i) => ({
      playerId: `p${i + 1}`,
      name: s.name || `Player ${i + 1}`,
      factionId: s.factionId,
    }));
    let state = createGame({
      gameId,
      seed: seed ?? Math.floor(Math.random() * 2 ** 31),
      createdAt: new Date().toISOString(),
      seats,
    });
    state = autoAdvance(state);
    persist(state);
    set({ state, viewingAs: seats[0].playerId, selectedCell: null, lastError: null });
    return gameId;
  },

  loadGame(gameId) {
    const raw = localStorage.getItem(gameKey(gameId));
    if (!raw) return false;
    try {
      const state = JSON.parse(raw) as GameState;
      set({ state, viewingAs: state.playerOrder[0] ?? 'SPECTATOR', selectedCell: null, lastError: null });
      return true;
    } catch {
      return false;
    }
  },

  dispatch(action) {
    const { state } = get();
    if (!state) return;
    const stamped = { ...action, at: new Date().toISOString() } as TurnAction;
    const verdict = validateAction(state, stamped);
    if (!verdict.ok) {
      set({ lastError: verdict.message });
      return;
    }
    try {
      const next = applyAction(state, stamped);
      persist(next);
      set({ state: next, lastError: null, selectedCell: null });
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  setViewingAs(viewer) {
    set({ viewingAs: viewer, lastError: null });
  },

  selectCell(cell) {
    set({ selectedCell: cell });
  },

  clearError() {
    set({ lastError: null });
  },
}));

/** Everything a page needs: the viewer-filtered state plus the viewer's legal actions. */
export function useGameView(): {
  full: GameState | null;
  view: PublicGameState | null;
  allowed: AllowedAction[];
  viewingAs: PlayerId | 'SPECTATOR';
} {
  const state = useGameStore((s) => s.state);
  const viewingAs = useGameStore((s) => s.viewingAs);
  if (!state) return { full: null, view: null, allowed: [], viewingAs };
  const view = getVisibleGameState(state, viewingAs);
  const allowed = viewingAs === 'SPECTATOR' ? [] : getAllowedActions(state, viewingAs);
  return { full: state, view, allowed, viewingAs };
}

/** Which players the game is currently waiting on (drives the "waiting" UI). */
export function waitingOn(state: GameState): PlayerId[] {
  return state.playerOrder.filter((pid) => getAllowedActions(state, pid).length > 0);
}
