import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { createImperiumGame } from '../engine/setup';
import type { ImpAction, ImpGameState, PlayerId } from '../types';
import { ensureAuth, getDb } from './firebaseConfig';
import { buildSnapshot, evaluateSubmit, liveState } from './serverLogic';
import type {
  ChatMessage,
  ChatSinceResult,
  CreateGameInput,
  GameSnapshot,
  ImpGameSummary,
  ImpGameTransport,
  SinceResult,
  StoredImpGame,
  SubmitInput,
  SubmitResult,
} from './types';

/**
 * Networked authoritative transport over Cloud Firestore.
 *
 * One document per game holds the append-only journal. `submit` runs inside a
 * Firestore transaction: it re-reads the document, runs the SAME
 * `evaluateSubmit` the local mock uses (optimistic-concurrency + engine
 * validation via replay), and appends only if valid — so two devices racing a
 * move can never both win. `subscribe` is a live `onSnapshot`. Security rules
 * (firestore.rules) require an anonymous session and freeze the seed + shrinking
 * of the log; full move legality is enforced here in the transaction.
 *
 * `initial` and `journal` are stored as JSON strings to dodge Firestore's
 * no-nested-array / no-undefined constraints on arbitrary game state; summary
 * fields (players/round/phase/cursor) are denormalised so the lobby lists games
 * without parsing every blob.
 */

const COLLECTION = 'imperiumGames';

interface FireDoc {
  schema: 3;
  gameId: string;
  initialJson: string;
  journalJson: string;
  cursor: number;
  botSeats: PlayerId[];
  /** Seat → owning identity map (see StoredImpGame.seatOwners). */
  seatOwners: Partial<Record<PlayerId, string>>;
  createdAt: string;
  updatedAt: string;
  // Denormalised summary (recomputed on every write).
  players: string[];
  round: number;
  phase: string;
}

function toFireDoc(game: StoredImpGame, live: ImpGameState): FireDoc {
  return {
    schema: 3,
    gameId: game.gameId,
    initialJson: JSON.stringify(game.initial),
    journalJson: JSON.stringify(game.journal),
    cursor: game.journal.length,
    botSeats: game.botSeats,
    seatOwners: game.seatOwners ?? {},
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    players: Object.values(live.players).map((p) => p.name),
    round: live.round,
    phase: live.phase,
  };
}

function fromFireDoc(d: FireDoc): StoredImpGame {
  return {
    schema: 3,
    gameId: d.gameId,
    initial: JSON.parse(d.initialJson) as ImpGameState,
    journal: JSON.parse(d.journalJson) as ImpAction[],
    botSeats: d.botSeats ?? [],
    seatOwners: d.seatOwners ?? {},
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function summaryOf(d: FireDoc): ImpGameSummary {
  return {
    gameId: d.gameId,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    players: d.players ?? [],
    round: d.round ?? 1,
    phase: d.phase ?? 'playerTurns',
    cursor: d.cursor ?? 0,
  };
}

export class FirestoreTransport implements ImpGameTransport {
  private newId(): string {
    return `g${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  }

  async create(input: CreateGameInput): Promise<{ gameId: string }> {
    await ensureAuth();
    const gameId = this.newId();
    const seed = input.seed ?? (Math.floor(Math.random() * 2 ** 31) >>> 0);
    const now = new Date().toISOString();
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
    await setDoc(doc(getDb(), COLLECTION, gameId), toFireDoc(game, initial));
    return { gameId };
  }

  private async read(gameId: string): Promise<StoredImpGame | null> {
    await ensureAuth();
    const snap = await getDoc(doc(getDb(), COLLECTION, gameId));
    return snap.exists() ? fromFireDoc(snap.data() as FireDoc) : null;
  }

  async snapshot(gameId: string, viewerId: PlayerId | 'SPECTATOR'): Promise<GameSnapshot | null> {
    const game = await this.read(gameId);
    if (!game) return null;
    return buildSnapshot(game, liveState(game), viewerId);
  }

  async checkout(gameId: string): Promise<StoredImpGame | null> {
    return this.read(gameId);
  }

  async submit(input: SubmitInput): Promise<SubmitResult> {
    await ensureAuth();
    const ref = doc(getDb(), COLLECTION, input.gameId);
    try {
      const outcome = await runTransaction(getDb(), async (tx) => {
        const snap = await tx.get(ref);
        const game = snap.exists() ? fromFireDoc(snap.data() as FireDoc) : null;
        const res = evaluateSubmit(game, input, new Date().toISOString());
        if (res.ok) tx.set(ref, toFireDoc(res.game, liveState(res.game)));
        return res;
      });
      if (!outcome.ok) return outcome.error;
      return { ok: true, cursor: outcome.game.journal.length, snapshot: outcome.snapshot };
    } catch (err) {
      // A transaction abort (e.g. contention) surfaces as a retryable error.
      return {
        ok: false,
        code: 'conflict',
        message: err instanceof Error ? err.message : 'Write conflict — please retry.',
        cursor: -1,
      };
    }
  }

  async since(gameId: string, sinceCursor: number): Promise<SinceResult | null> {
    const game = await this.read(gameId);
    if (!game) return null;
    const from = Math.max(0, sinceCursor);
    return { cursor: game.journal.length, actions: game.journal.slice(from) };
  }

  subscribe(gameId: string, listener: (cursor: number) => void): () => void {
    // Fire-and-forget auth; onSnapshot below will start delivering once ready.
    void ensureAuth();
    return onSnapshot(
      doc(getDb(), COLLECTION, gameId),
      (snap) => {
        if (snap.exists()) listener((snap.data() as FireDoc).cursor ?? 0);
      },
      () => {
        /* swallow permission/transient errors; polling in the store recovers */
      },
    );
  }

  async list(): Promise<ImpGameSummary[]> {
    await ensureAuth();
    const q = query(collection(getDb(), COLLECTION), orderBy('updatedAt', 'desc'));
    const docs = await getDocs(q);
    return docs.docs.map((d) => summaryOf(d.data() as FireDoc));
  }

  async remove(gameId: string): Promise<void> {
    await ensureAuth();
    await deleteDoc(doc(getDb(), COLLECTION, gameId));
  }

  // --- Side-channel chat as a per-game subcollection. Ordering is by client
  //     ISO timestamp; seq is the index in that order, so `chatSince` is a
  //     simple slice. Eventually-consistent, which is fine for a chat feed. ---
  async postChat(gameId: string, msg: Omit<ChatMessage, 'seq' | 'at'>): Promise<void> {
    await ensureAuth();
    await addDoc(collection(getDb(), COLLECTION, gameId, 'chat'), { ...msg, at: new Date().toISOString() });
  }

  async chatSince(gameId: string, sinceCount: number): Promise<ChatSinceResult | null> {
    await ensureAuth();
    const q = query(collection(getDb(), COLLECTION, gameId, 'chat'), orderBy('at', 'asc'));
    const docs = await getDocs(q);
    const all = docs.docs.map((d, i) => ({ seq: i, ...(d.data() as Omit<ChatMessage, 'seq'>) }));
    const from = Math.max(0, sinceCount);
    return { cursor: all.length, messages: all.slice(from) };
  }

  subscribeChat(gameId: string, listener: (count: number) => void): () => void {
    void ensureAuth();
    return onSnapshot(
      query(collection(getDb(), COLLECTION, gameId, 'chat'), orderBy('at', 'asc')),
      (snap) => listener(snap.size),
      () => {
        /* swallow permission/transient errors; the store's poll recovers */
      },
    );
  }
}
