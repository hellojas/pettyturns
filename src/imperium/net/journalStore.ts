import { stateAfter } from '../engine/replay';
import type { ChatMessage, ImpGameSummary, JournalStore, StoredImpGame } from './types';

/**
 * JournalStore implementations for the async-multiplayer scaffolding.
 *
 * - `InMemoryJournalStore`: a Map, for the local mock server and tests.
 * - `LocalStorageJournalStore`: the browser fallback (single-device async play,
 *   or offline persistence for the authoritative server when it runs client-side
 *   during development).
 *
 * Both derive a summary by replaying the stored journal, so a listing never
 * persists a stale snapshot of round/phase — it is always computed from the log.
 */

function summarize(game: StoredImpGame): ImpGameSummary {
  const live = stateAfter(game.initial, game.journal, game.journal.length);
  return {
    gameId: game.gameId,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    players: Object.values(live.players).map((p) => p.name),
    round: live.round,
    phase: live.phase,
    cursor: game.journal.length,
  };
}

export class InMemoryJournalStore implements JournalStore {
  private games = new Map<string, StoredImpGame>();
  private chats = new Map<string, ChatMessage[]>();

  read(gameId: string): StoredImpGame | null {
    const g = this.games.get(gameId);
    // Return a structural copy so callers can't mutate stored state in place.
    return g ? (JSON.parse(JSON.stringify(g)) as StoredImpGame) : null;
  }

  write(game: StoredImpGame): void {
    this.games.set(game.gameId, JSON.parse(JSON.stringify(game)) as StoredImpGame);
  }

  list(): ImpGameSummary[] {
    return [...this.games.values()]
      .map(summarize)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  remove(gameId: string): void {
    this.games.delete(gameId);
    this.chats.delete(gameId);
  }

  readChat(gameId: string): ChatMessage[] {
    return [...(this.chats.get(gameId) ?? [])];
  }

  appendChat(gameId: string, msg: Omit<ChatMessage, 'seq'>): ChatMessage[] {
    const log = this.chats.get(gameId) ?? [];
    const next = [...log, { ...msg, seq: log.length }];
    this.chats.set(gameId, next);
    return [...next];
  }
}

const KEY_PREFIX = 'imperium:net:game:';
const INDEX_KEY = 'imperium:net:index';
const CHAT_PREFIX = 'imperium:net:chat:';

/** Guards against SSR / non-browser test contexts where localStorage is absent. */
function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export class LocalStorageJournalStore implements JournalStore {
  private ids(): string[] {
    if (!hasLocalStorage()) return [];
    try {
      return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  }

  private setIds(ids: string[]): void {
    if (!hasLocalStorage()) return;
    localStorage.setItem(INDEX_KEY, JSON.stringify([...new Set(ids)]));
  }

  read(gameId: string): StoredImpGame | null {
    if (!hasLocalStorage()) return null;
    const raw = localStorage.getItem(KEY_PREFIX + gameId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredImpGame;
    } catch {
      return null;
    }
  }

  write(game: StoredImpGame): void {
    if (!hasLocalStorage()) return;
    localStorage.setItem(KEY_PREFIX + game.gameId, JSON.stringify(game));
    this.setIds([game.gameId, ...this.ids()]);
  }

  list(): ImpGameSummary[] {
    return this.ids()
      .map((id) => this.read(id))
      .filter((g): g is StoredImpGame => g !== null)
      .map(summarize)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  remove(gameId: string): void {
    if (!hasLocalStorage()) return;
    localStorage.removeItem(KEY_PREFIX + gameId);
    localStorage.removeItem(CHAT_PREFIX + gameId);
    this.setIds(this.ids().filter((id) => id !== gameId));
  }

  readChat(gameId: string): ChatMessage[] {
    if (!hasLocalStorage()) return [];
    try {
      return JSON.parse(localStorage.getItem(CHAT_PREFIX + gameId) ?? '[]') as ChatMessage[];
    } catch {
      return [];
    }
  }

  appendChat(gameId: string, msg: Omit<ChatMessage, 'seq'>): ChatMessage[] {
    const log = this.readChat(gameId);
    const next = [...log, { ...msg, seq: log.length }];
    if (hasLocalStorage()) localStorage.setItem(CHAT_PREFIX + gameId, JSON.stringify(next));
    return next;
  }
}
