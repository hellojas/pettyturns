import type {
  ImpAction,
  ImpAllowedAction,
  ImpGameState,
  ImpVisibleState,
  LeaderId,
  PlayerId,
} from '../types';

/**
 * Async-multiplayer scaffolding — the transport seam.
 *
 * The game is already journal-backed: the authoritative unit is `{ initial,
 * journal }`, and live state is a pure replay of the journal over the seed
 * (see engine/replay.ts). That makes a server-authoritative model cheap — the
 * server persists the same journal, reconciles by replay, validates every
 * submitted action with the same reducer a client uses, and hands each client
 * only its redacted `getVisibleImperiumState` view.
 *
 * This module defines the client-facing contract (`ImpGameTransport`) plus the
 * server-side storage contract (`JournalStore`). A LocalMockTransport
 * (net/localTransport.ts) implements the client contract in-process over a
 * JournalStore so the UI and tests can be written against the async API today;
 * a real backend (e.g. Supabase over HTTP/WebSocket) implements the same
 * `ImpGameTransport` interface later with no engine or UI changes.
 *
 * Nothing here touches the rules engine — it only orchestrates persistence,
 * validation, redaction and notification around it.
 */

/** Persisted authoritative game: seed state + append-only action log. */
export interface StoredImpGame {
  schema: 3;
  gameId: string;
  /** Deterministic seed state; the journal replays over this. */
  initial: ImpGameState;
  /** Append-only authoritative action log (each action already `at`-stamped). */
  journal: ImpAction[];
  /** Seats driven by the heuristic AI (server may step these). */
  botSeats: PlayerId[];
  createdAt: string;
  updatedAt: string;
}

/** Lightweight listing row (no full state) for lobby/menu screens. */
export interface ImpGameSummary {
  gameId: string;
  createdAt: string;
  updatedAt: string;
  players: string[];
  round: number;
  phase: string;
  /** Authoritative journal length — a client's reconcile checkpoint. */
  cursor: number;
}

/**
 * Server-side persistence adapter. The mock transport keeps everything in
 * memory; a browser build swaps in a localStorage-backed store; a real backend
 * swaps in a network/database-backed one. Kept deliberately narrow so any
 * key/value store satisfies it.
 */
export interface JournalStore {
  read(gameId: string): StoredImpGame | null;
  write(game: StoredImpGame): void;
  list(): ImpGameSummary[];
  remove(gameId: string): void;
}

export interface CreateGameInput {
  seats: Array<{ playerId: PlayerId; name: string; leaderId: LeaderId }>;
  seed?: number;
  botSeats?: PlayerId[];
}

/** A client's redacted snapshot of the game at a known authoritative cursor. */
export interface GameSnapshot {
  gameId: string;
  /** Authoritative journal length this snapshot reflects. */
  cursor: number;
  view: ImpVisibleState;
  /** Actions this viewer may legally take right now (empty for spectators). */
  allowed: ImpAllowedAction[];
  /** Whoever the engine is waiting on (decision owner, else the turn). */
  currentActor: PlayerId | null;
  /** True once the game has finished. */
  finished: boolean;
}

/** An action a client wants committed to the authoritative log. */
export interface SubmitInput {
  gameId: string;
  viewerId: PlayerId;
  /** The action, minus the server-stamped `at`. */
  action: Omit<ImpAction, 'at'>;
  /**
   * The journal length the client believed was current when it built this
   * action (optimistic concurrency). If the server has moved on, the submit is
   * rejected with `conflict` and the client should `since()` to catch up and
   * retry — the reconcile-by-replay path.
   */
  expectedCursor: number;
}

export interface SubmitOk {
  ok: true;
  /** New authoritative journal length after the action was appended. */
  cursor: number;
  /** The submitter's redacted view after the action resolved. */
  snapshot: GameSnapshot;
}

export type SubmitErrorCode =
  | 'no-game'
  | 'not-your-turn'
  | 'invalid'
  | 'conflict'
  | 'game-over';

export interface SubmitError {
  ok: false;
  code: SubmitErrorCode;
  message: string;
  /** Authoritative cursor, so a `conflict`ed client knows how far to resync. */
  cursor: number;
}

export type SubmitResult = SubmitOk | SubmitError;

/** Incremental catch-up payload: the actions a client is missing. */
export interface SinceResult {
  /** Authoritative journal length after these actions. */
  cursor: number;
  /** Actions with index in `[sinceCursor, cursor)`, in order. */
  actions: ImpAction[];
}

/**
 * The client-facing transport. Every method is async so client code is written
 * against the network contract from day one; the local mock just resolves
 * immediately. A real backend implements this same interface over HTTP/sockets.
 */
export interface ImpGameTransport {
  create(input: CreateGameInput): Promise<{ gameId: string }>;
  /** Current redacted snapshot for a viewer, or null if the game is unknown. */
  snapshot(gameId: string, viewerId: PlayerId | 'SPECTATOR'): Promise<GameSnapshot | null>;
  /** Commit an action to the authoritative log (server validates + redacts). */
  submit(input: SubmitInput): Promise<SubmitResult>;
  /** Actions after `sinceCursor`, for reconcile-by-replay; null if unknown. */
  since(gameId: string, sinceCursor: number): Promise<SinceResult | null>;
  /** Notify on every authoritative append; returns an unsubscribe function. */
  subscribe(gameId: string, listener: (cursor: number) => void): () => void;
  list(): Promise<ImpGameSummary[]>;
  remove(gameId: string): Promise<void>;
}
