import { createImperiumGame } from '../engine/setup';
import { impAllowedActions, impApply, impValidate } from '../engine/engine';
import { stateAfter } from '../engine/replay';
import { getVisibleImperiumState } from '../engine/visibility';
import type { ImpAction, ImpGameState, PlayerId } from '../types';
import { InMemoryJournalStore } from './journalStore';
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

/** Whoever the engine is waiting on: the front decision's owner, else the turn. */
function actorOf(state: ImpGameState): PlayerId | null {
  if (state.phase === 'finished') return null;
  return state.pendingDecisions[0]?.playerId ?? state.turn;
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

  private live(game: StoredImpGame): ImpGameState {
    return stateAfter(game.initial, game.journal, game.journal.length);
  }

  private snapshotFrom(
    game: StoredImpGame,
    live: ImpGameState,
    viewerId: PlayerId | 'SPECTATOR',
  ): GameSnapshot {
    return {
      gameId: game.gameId,
      cursor: game.journal.length,
      view: getVisibleImperiumState(live, viewerId),
      allowed: viewerId === 'SPECTATOR' ? [] : impAllowedActions(live, viewerId),
      currentActor: actorOf(live),
      finished: live.phase === 'finished',
    };
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
    return this.snapshotFrom(game, this.live(game), viewerId);
  }

  async submit(input: SubmitInput): Promise<SubmitResult> {
    const game = this.store.read(input.gameId);
    if (!game) {
      return { ok: false, code: 'no-game', message: 'Unknown game.', cursor: 0 };
    }
    const cursor = game.journal.length;

    // Optimistic concurrency: a client that fell behind must resync and retry.
    if (input.expectedCursor !== cursor) {
      return {
        ok: false,
        code: 'conflict',
        message: `Out of date: expected cursor ${input.expectedCursor}, server is at ${cursor}.`,
        cursor,
      };
    }

    // Authorization: a client may only act as its own seat.
    if (input.action.playerId !== input.viewerId) {
      return { ok: false, code: 'not-your-turn', message: 'You can only act as your own seat.', cursor };
    }

    const live = this.live(game);
    if (live.phase === 'finished') {
      return { ok: false, code: 'game-over', message: 'The game is over.', cursor };
    }

    const stamped = { ...input.action, at: this.clock() } as ImpAction;
    const verdict = impValidate(live, stamped);
    if (!verdict.ok) {
      // Distinguish "wrong player is up" from a genuinely illegal move so the
      // client can surface a clearer message / decide whether to resync.
      const code = actorOf(live) !== input.viewerId ? 'not-your-turn' : 'invalid';
      return { ok: false, code, message: verdict.message, cursor };
    }

    const next = impApply(live, stamped);
    const updated: StoredImpGame = {
      ...game,
      journal: [...game.journal, stamped],
      updatedAt: stamped.at ?? this.clock(),
    };
    this.store.write(updated);
    this.notify(input.gameId, updated.journal.length);
    return { ok: true, cursor: updated.journal.length, snapshot: this.snapshotFrom(updated, next, input.viewerId) };
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
