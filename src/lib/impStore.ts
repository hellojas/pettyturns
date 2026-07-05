import { create } from 'zustand';
import { createImperiumGame, type ImpSeat } from '../imperium/engine/setup';
import { impApply, impAllowedActions, impValidate } from '../imperium/engine/engine';
import { stateAfter } from '../imperium/engine/replay';
import { getVisibleImperiumState } from '../imperium/engine/visibility';
import type {
  CardId,
  ImpAction,
  ImpAllowedAction,
  ImpGameState,
  ImpVisibleState,
  LeaderId,
  PlayerId,
  SpaceId,
} from '../imperium/types';

/**
 * Hotseat store for the Imperium game.
 *
 * The persisted unit of truth is a journal, not a snapshot: `{ initial,
 * journal, cursor }`. The live `state` is derived by replaying the first
 * `cursor` actions over `initial` (see engine/replay.ts). This makes undo/redo
 * free — undo moves the cursor back, redo forward, and a fresh dispatch
 * truncates any redo tail before appending. Everything stays a pure function of
 * the seed + recorded actions, so a reload reproduces the game exactly.
 */

const INDEX_KEY = 'imperium:games';
const gameKey = (gameId: string) => `imperium:game:${gameId}`;

export interface ImpSavedMeta {
  gameId: string;
  createdAt: string;
  updatedAt: string;
  players: string[];
  round: number;
  phase: string;
}

interface PersistedGame {
  schema: 2;
  initial: ImpGameState;
  journal: ImpAction[];
  cursor: number;
}

function readIndex(): ImpSavedMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as ImpSavedMeta[];
  } catch {
    return [];
  }
}

function persist(gameId: string, initial: ImpGameState, journal: ImpAction[], cursor: number, live: ImpGameState): void {
  const record: PersistedGame = { schema: 2, initial, journal, cursor };
  localStorage.setItem(gameKey(gameId), JSON.stringify(record));
  const meta: ImpSavedMeta = {
    gameId,
    createdAt: live.createdAt,
    updatedAt: new Date().toISOString(),
    players: Object.values(live.players).map((p) => p.name),
    round: live.round,
    phase: live.phase,
  };
  localStorage.setItem(INDEX_KEY, JSON.stringify([meta, ...readIndex().filter((m) => m.gameId !== gameId)]));
}

/** Load a persisted game, tolerating pre-journal (schema 1, raw-state) saves. */
function loadRecord(gameId: string): { initial: ImpGameState; journal: ImpAction[]; cursor: number } | null {
  const raw = localStorage.getItem(gameKey(gameId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schema === 2 && parsed.initial) {
      const rec = parsed as PersistedGame;
      return { initial: rec.initial, journal: rec.journal ?? [], cursor: rec.cursor ?? (rec.journal?.length ?? 0) };
    }
    // legacy: the whole blob is a raw game state → load with no undo history
    if (parsed && parsed.players && parsed.playerOrder) {
      return { initial: parsed as ImpGameState, journal: [], cursor: 0 };
    }
    return null;
  } catch {
    return null;
  }
}

export const listImpGames = readIndex;
export function deleteImpGame(gameId: string): void {
  localStorage.removeItem(gameKey(gameId));
  localStorage.setItem(INDEX_KEY, JSON.stringify(readIndex().filter((m) => m.gameId !== gameId)));
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ImpDispatchable = DistributiveOmit<ImpAction, 'at'>;

/** A card selected in hand, pending a space (and the sell amount) to complete the play. */
export interface PendingPlay {
  cardId: CardId;
  spaceId?: SpaceId;
  deploy: number;
  sellSpice?: number;
}

interface ImpStore {
  gameId: string | null;
  initial: ImpGameState | null;
  journal: ImpAction[];
  cursor: number;
  state: ImpGameState | null;
  viewingAs: PlayerId | 'SPECTATOR';
  pending: PendingPlay | null;
  lastError: string | null;

  newGame(seats: Array<{ name: string; leaderId: LeaderId }>, seed?: number): string;
  loadGame(gameId: string): boolean;
  dispatch(action: ImpDispatchable): void;
  undo(): void;
  redo(): void;
  setViewingAs(viewer: PlayerId | 'SPECTATOR'): void;
  setPending(pending: PendingPlay | null): void;
  clearError(): void;
}

export const useImpStore = create<ImpStore>((set, get) => ({
  gameId: null,
  initial: null,
  journal: [],
  cursor: 0,
  state: null,
  viewingAs: 'SPECTATOR',
  pending: null,
  lastError: null,

  newGame(seatInputs, seed) {
    const gameId = `i${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const seats: ImpSeat[] = seatInputs.map((s, i) => ({
      playerId: `p${i + 1}`,
      name: s.name || `Player ${i + 1}`,
      leaderId: s.leaderId,
    }));
    const initial = createImperiumGame({
      gameId,
      seed: seed ?? Math.floor(Math.random() * 2 ** 31),
      createdAt: new Date().toISOString(),
      seats,
    });
    persist(gameId, initial, [], 0, initial);
    set({
      gameId,
      initial,
      journal: [],
      cursor: 0,
      state: initial,
      viewingAs: seats[0].playerId,
      pending: null,
      lastError: null,
    });
    return gameId;
  },

  loadGame(gameId) {
    const rec = loadRecord(gameId);
    if (!rec) return false;
    const state = stateAfter(rec.initial, rec.journal, rec.cursor);
    set({
      gameId,
      initial: rec.initial,
      journal: rec.journal,
      cursor: rec.cursor,
      state,
      viewingAs: state.playerOrder[0] ?? 'SPECTATOR',
      pending: null,
      lastError: null,
    });
    return true;
  },

  dispatch(action) {
    const { state, initial, journal, cursor, gameId } = get();
    if (!state || !initial || !gameId) return;
    const stamped = { ...action, at: new Date().toISOString() } as ImpAction;
    const verdict = impValidate(state, stamped);
    if (!verdict.ok) {
      set({ lastError: verdict.message });
      return;
    }
    try {
      const next = impApply(state, stamped);
      // truncate any redo tail, then append this action
      const newJournal = [...journal.slice(0, cursor), stamped];
      const newCursor = newJournal.length;
      persist(gameId, initial, newJournal, newCursor, next);
      set({ journal: newJournal, cursor: newCursor, state: next, lastError: null, pending: null });
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  undo() {
    const { initial, journal, cursor, gameId, viewingAs } = get();
    if (!initial || !gameId || cursor <= 0) return;
    const newCursor = cursor - 1;
    const state = stateAfter(initial, journal, newCursor);
    persist(gameId, initial, journal, newCursor, state);
    const stillSeated = viewingAs === 'SPECTATOR' || state.players[viewingAs] ? viewingAs : 'SPECTATOR';
    set({ cursor: newCursor, state, viewingAs: stillSeated, pending: null, lastError: null });
  },

  redo() {
    const { initial, journal, cursor, gameId } = get();
    if (!initial || !gameId || cursor >= journal.length) return;
    const newCursor = cursor + 1;
    const state = stateAfter(initial, journal, newCursor);
    persist(gameId, initial, journal, newCursor, state);
    set({ cursor: newCursor, state, pending: null, lastError: null });
  },

  setViewingAs(viewer) {
    set({ viewingAs: viewer, pending: null, lastError: null });
  },
  setPending(pending) {
    set({ pending });
  },
  clearError() {
    set({ lastError: null });
  },
}));

export function useImpView(): {
  full: ImpGameState | null;
  view: ImpVisibleState | null;
  allowed: ImpAllowedAction[];
  viewingAs: PlayerId | 'SPECTATOR';
  canUndo: boolean;
  canRedo: boolean;
} {
  const state = useImpStore((s) => s.state);
  const viewingAs = useImpStore((s) => s.viewingAs);
  const cursor = useImpStore((s) => s.cursor);
  const journalLen = useImpStore((s) => s.journal.length);
  if (!state) return { full: null, view: null, allowed: [], viewingAs, canUndo: false, canRedo: false };
  const view = getVisibleImperiumState(state, viewingAs);
  const allowed = viewingAs === 'SPECTATOR' ? [] : impAllowedActions(state, viewingAs);
  return { full: state, view, allowed, viewingAs, canUndo: cursor > 0, canRedo: cursor < journalLen };
}
