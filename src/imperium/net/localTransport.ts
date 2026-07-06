import { createImperiumGame } from '../engine/setup';
import type { PlayerId } from '../types';
import { InMemoryJournalStore } from './journalStore';
import { buildSnapshot, evaluateSubmit, liveState } from './serverLogic';
import type {
  CreateGameInput,
  GameSnapshot,
  ImpGameSummary,
  ImpGameTransport,
  JournalStore,
  SinceResult,
  StoredImpGame,
  SubmitInput,
  SubmitResult,
} from './types';

/**
 * In-process authoritative "server" implementing the client transport.
 *
 * It owns the journal, validates every submitted action with the same reducer
 * clients use (`impValidate`/`impApply`), redacts each response through
 * `getVisibleImperiumState`, and notifies subscribers on every append. Swapping
 * this for a networked backend that implements `ImpGameTransport` needs no
 * engine or UI change — the contract is identical, only the wire is different.
 *
 * The clock and id generator are injected so tests are fully deterministic; the
 * default clock uses wall time and the default id generator a random suffix.
 */

export interface LocalTransportOptions {
  store?: JournalStore;
  /** Returns an ISO timestamp for `at` stamps and created/updated bookkeeping. */
  clock?: () => string;
  /** Generates a fresh game id. */
  newId?: () => string;
}

export class LocalMockTransport implements ImpGameTransport {
  private store: JournalStore;
  private clock: () => string;
  private newId: () => string;
  private listeners = new Map<string, Set<(cursor: number) => void>>();
  private idSeq = 0;

  constructor(opts: LocalTransportOptions = {}) {
    this.store = opts.store ?? new InMemoryJournalStore();
    this.clock = opts.clock ?? (() => new Date().toISOString());
    this.newId = opts.newId ?? (() => `g${Math.random().toString(36).slice(2, 10)}`);
  }

  private notify(gameId: string, cursor: number): void {
    for (const l of this.listeners.get(gameId) ?? []) l(cursor);
  }

  async create(input: CreateGameInput): Promise<{ gameId: string }> {
    const gameId = this.newId();
    // A deterministic default seed keeps a game reproducible when the caller
    // omits one; two ids in the same instance never collide on their seed.
    const seed = input.seed ?? (0x9e3779b1 ^ this.idSeq++) >>> 0;
    const now = this.clock();
    const initial = createImperiumGame({ gameId, seed, createdAt: now, seats: input.seats });
    const game: StoredImpGame = {
      schema: 3,
      gameId,
      initial,
      journal: [],
      botSeats: input.botSeats ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.write(game);
    return { gameId };
  }

  async snapshot(
    gameId: string,
    viewerId: PlayerId | 'SPECTATOR',
  ): Promise<GameSnapshot | null> {
    const game = this.store.read(gameId);
    if (!game) return null;
    return buildSnapshot(game, liveState(game), viewerId);
  }

  async submit(input: SubmitInput): Promise<SubmitResult> {
    const game = this.store.read(input.gameId);
    const outcome = evaluateSubmit(game, input, this.clock());
    if (!outcome.ok) return outcome.error;
    this.store.write(outcome.game);
    this.notify(input.gameId, outcome.game.journal.length);
    return { ok: true, cursor: outcome.game.journal.length, snapshot: outcome.snapshot };
  }

  async checkout(gameId: string): Promise<StoredImpGame | null> {
    return this.store.read(gameId);
  }

  async since(gameId: string, sinceCursor: number): Promise<SinceResult | null> {
    const game = this.store.read(gameId);
    if (!game) return null;
    const from = Math.max(0, sinceCursor);
    return { cursor: game.journal.length, actions: game.journal.slice(from) };
  }

  subscribe(gameId: string, listener: (cursor: number) => void): () => void {
    let set = this.listeners.get(gameId);
    if (!set) {
      set = new Set();
      this.listeners.set(gameId, set);
    }
    set.add(listener);
    return () => {
      const s = this.listeners.get(gameId);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) this.listeners.delete(gameId);
    };
  }

  async list(): Promise<ImpGameSummary[]> {
    return this.store.list();
  }

  async remove(gameId: string): Promise<void> {
    this.store.remove(gameId);
    this.listeners.delete(gameId);
  }
}
