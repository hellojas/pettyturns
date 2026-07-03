import { create } from 'zustand';
import { createImperiumGame, type ImpSeat } from '../imperium/engine/setup';
import { impApply, impAllowedActions, impValidate } from '../imperium/engine/engine';
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

/** Hotseat store for the Imperium game — same shape as the classic store. */

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

function readIndex(): ImpSavedMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as ImpSavedMeta[];
  } catch {
    return [];
  }
}

function persist(state: ImpGameState): void {
  localStorage.setItem(gameKey(state.gameId), JSON.stringify(state));
  const meta: ImpSavedMeta = {
    gameId: state.gameId,
    createdAt: state.createdAt,
    updatedAt: new Date().toISOString(),
    players: Object.values(state.players).map((p) => p.name),
    round: state.round,
    phase: state.phase,
  };
  localStorage.setItem(
    INDEX_KEY,
    JSON.stringify([meta, ...readIndex().filter((m) => m.gameId !== state.gameId)]),
  );
}

export const listImpGames = readIndex;
export function deleteImpGame(gameId: string): void {
  localStorage.removeItem(gameKey(gameId));
  localStorage.setItem(INDEX_KEY, JSON.stringify(readIndex().filter((m) => m.gameId !== gameId)));
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ImpDispatchable = DistributiveOmit<ImpAction, 'at'>;

/** A card selected in hand, pending a space (and choices) to complete the play. */
export interface PendingPlay {
  cardId: CardId;
  spaceId?: SpaceId;
  deploy: number;
  sellSpice?: number;
  influenceFaction?: string;
}

interface ImpStore {
  state: ImpGameState | null;
  viewingAs: PlayerId | 'SPECTATOR';
  pending: PendingPlay | null;
  lastError: string | null;

  newGame(seats: Array<{ name: string; leaderId: LeaderId }>, seed?: number): string;
  loadGame(gameId: string): boolean;
  dispatch(action: ImpDispatchable): void;
  setViewingAs(viewer: PlayerId | 'SPECTATOR'): void;
  setPending(pending: PendingPlay | null): void;
  clearError(): void;
}

export const useImpStore = create<ImpStore>((set, get) => ({
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
    const state = createImperiumGame({
      gameId,
      seed: seed ?? Math.floor(Math.random() * 2 ** 31),
      createdAt: new Date().toISOString(),
      seats,
    });
    persist(state);
    set({ state, viewingAs: seats[0].playerId, pending: null, lastError: null });
    return gameId;
  },

  loadGame(gameId) {
    const raw = localStorage.getItem(gameKey(gameId));
    if (!raw) return false;
    try {
      const state = JSON.parse(raw) as ImpGameState;
      set({ state, viewingAs: state.playerOrder[0] ?? 'SPECTATOR', pending: null, lastError: null });
      return true;
    } catch {
      return false;
    }
  },

  dispatch(action) {
    const { state } = get();
    if (!state) return;
    const stamped = { ...action, at: new Date().toISOString() } as ImpAction;
    const verdict = impValidate(state, stamped);
    if (!verdict.ok) {
      set({ lastError: verdict.message });
      return;
    }
    try {
      const next = impApply(state, stamped);
      persist(next);
      set({ state: next, lastError: null, pending: null });
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
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
} {
  const state = useImpStore((s) => s.state);
  const viewingAs = useImpStore((s) => s.viewingAs);
  if (!state) return { full: null, view: null, allowed: [], viewingAs };
  const view = getVisibleImperiumState(state, viewingAs);
  const allowed = viewingAs === 'SPECTATOR' ? [] : impAllowedActions(state, viewingAs);
  return { full: state, view, allowed, viewingAs };
}
