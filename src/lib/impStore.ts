import { create } from 'zustand';
import { createImperiumGame, type ImpSeat } from '../imperium/engine/setup';
import { impApply, impAllowedActions, impValidate } from '../imperium/engine/engine';
import { chooseBotAction } from '../imperium/engine/bot';
import { stateAfter } from '../imperium/engine/replay';
import { getVisibleImperiumState } from '../imperium/engine/visibility';
import { LocalMockTransport, LocalStorageJournalStore } from '../imperium/net';
import type { ImpGameSummary, ImpGameTransport } from '../imperium/net';
import { RESERVE_DEF_IDS } from '../imperium/data/cards';
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

/**
 * Async multiplayer runs against an authoritative transport. In this build the
 * transport is the in-process `LocalMockTransport` backed by localStorage, so
 * "async" games are authoritative + seat-scoped on a single device (open two
 * tabs, or switch seats, to play both sides). A networked backend implementing
 * `ImpGameTransport` drops in here with no other change — the store only ever
 * talks to the interface.
 */
let activeTransport: ImpGameTransport = new LocalMockTransport({
  store: new LocalStorageJournalStore(),
});

/** The transport async games run against (localStorage-backed mock by default). */
export const getImpTransport = (): ImpGameTransport => activeTransport;
/** Swap the transport (tests inject an in-memory mock; a real backend swaps here). */
export const setImpTransport = (t: ImpGameTransport): void => {
  activeTransport = t;
};

export async function listAsyncGames(): Promise<ImpGameSummary[]> {
  return activeTransport.list();
}
export async function deleteAsyncGame(gameId: string): Promise<void> {
  return activeTransport.remove(gameId);
}
/** Stop the background poll loop (call when leaving an async game screen). */
export function stopAsyncPolling(): void {
  stopPolling();
}

export interface ImpSavedMeta {
  gameId: string;
  createdAt: string;
  updatedAt: string;
  players: string[];
  /** Leader id per seat, aligned with `players` (added later; may be absent on old saves). */
  leaders?: string[];
  round: number;
  phase: string;
}

interface PersistedGame {
  schema: 2;
  initial: ImpGameState;
  journal: ImpAction[];
  cursor: number;
  /** Seats driven by the heuristic AI. */
  botSeats?: PlayerId[];
}

function readIndex(): ImpSavedMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as ImpSavedMeta[];
  } catch {
    return [];
  }
}

function persist(
  gameId: string,
  initial: ImpGameState,
  journal: ImpAction[],
  cursor: number,
  live: ImpGameState,
  botSeats: PlayerId[],
): void {
  const record: PersistedGame = { schema: 2, initial, journal, cursor, botSeats };
  localStorage.setItem(gameKey(gameId), JSON.stringify(record));
  const meta: ImpSavedMeta = {
    gameId,
    createdAt: live.createdAt,
    updatedAt: new Date().toISOString(),
    players: live.playerOrder.map((pid) => live.players[pid].name),
    leaders: live.playerOrder.map((pid) => live.players[pid].leaderId),
    round: live.round,
    phase: live.phase,
  };
  localStorage.setItem(INDEX_KEY, JSON.stringify([meta, ...readIndex().filter((m) => m.gameId !== gameId)]));
}

/**
 * Backfill state collections added to the schema after a save was written, so
 * games persisted by an older build still load instead of crashing. A save made
 * before the pending-decision system lacks `pendingDecisions`; the engine reads
 * `state.pendingDecisions[0]` while replaying the journal (and
 * `getVisibleImperiumState` maps over it on render), so a missing value throws
 * "Cannot read properties of undefined". Present values always win — only
 * genuinely-missing fields get a neutral default, so complete saves are a no-op.
 *
 * Normalizing `initial` is sufficient: the journal is replayed from it via the
 * pure reducer, whose output always carries these fields.
 */
/**
 * A save written before finite Reserve stacks existed was played under the old
 * "unlimited reserves" rule, so its journal may acquire a Reserve card more
 * times than the current stack holds. Replaying it against the real counts would
 * make a once-legal buy fail validation and throw on load. Backfilling a legacy
 * save with effectively-unlimited stacks preserves that game's original rules and
 * keeps replay faithful; new games always carry real counts from setup, so this
 * only ever applies to genuinely old saves.
 */
const LEGACY_UNLIMITED_RESERVE = 999;
const legacyReserveSupply = (): Record<string, number> =>
  Object.fromEntries(RESERVE_DEF_IDS.map((d) => [d, LEGACY_UNLIMITED_RESERVE]));

export function normalizeImpState(state: ImpGameState): ImpGameState {
  const players = Object.fromEntries(
    Object.entries(state.players).map(([pid, p]) => [
      pid,
      { ...p, controls: p.controls ?? [], vpLedger: p.vpLedger ?? [] },
    ]),
  ) as ImpGameState['players'];
  const hidden = Object.fromEntries(
    Object.entries(state.hidden).map(([pid, h]) => [
      pid,
      {
        ...h,
        deck: h.deck ?? [],
        hand: h.hand ?? [],
        discard: h.discard ?? [],
        inPlay: h.inPlay ?? [],
        revealedCards: h.revealedCards ?? [],
        trashed: h.trashed ?? [],
        intrigue: h.intrigue ?? [],
      },
    ]),
  ) as ImpGameState['hidden'];
  return {
    ...state,
    players,
    hidden,
    imperiumRow: state.imperiumRow ?? [],
    reserveSupply: state.reserveSupply ?? legacyReserveSupply(),
    intrigueDiscard: state.intrigueDiscard ?? [],
    combatPassed: state.combatPassed ?? [],
    occupied: state.occupied ?? {},
    makerBonus: state.makerBonus ?? {},
    alliances: state.alliances ?? {},
    controlledBy: state.controlledBy ?? {},
    pendingDecisions: state.pendingDecisions ?? [],
    flowResume: state.flowResume ?? null,
    decisionSeq: state.decisionSeq ?? 0,
    finalStandings: state.finalStandings ?? null,
  };
}

/** Load a persisted game, tolerating pre-journal (schema 1, raw-state) saves. */
function loadRecord(
  gameId: string,
): { initial: ImpGameState; journal: ImpAction[]; cursor: number; botSeats: PlayerId[] } | null {
  const raw = localStorage.getItem(gameKey(gameId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schema === 2 && parsed.initial) {
      const rec = parsed as PersistedGame;
      return {
        initial: normalizeImpState(rec.initial),
        journal: rec.journal ?? [],
        cursor: rec.cursor ?? (rec.journal?.length ?? 0),
        botSeats: rec.botSeats ?? [],
      };
    }
    // legacy: the whole blob is a raw game state → load with no undo history
    if (parsed && parsed.players && parsed.playerOrder) {
      return { initial: normalizeImpState(parsed as ImpGameState), journal: [], cursor: 0, botSeats: [] };
    }
    return null;
  } catch {
    return null;
  }
}

/** The player the engine is currently waiting on (decision owner, else the turn). */
export function currentActor(state: ImpGameState): PlayerId | null {
  if (state.phase === 'finished') return null;
  return state.pendingDecisions[0]?.playerId ?? state.turn;
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
  botSeats: PlayerId[];
  /** When true, bot moves play themselves (paced) after each human action. */
  autoRun: boolean;
  viewingAs: PlayerId | 'SPECTATOR';
  pending: PendingPlay | null;
  lastError: string | null;
  /** 'hotseat' = local pass-and-play (undo/redo, bots); 'async' = transport-backed. */
  mode: 'hotseat' | 'async';
  /** In async mode, the one seat this device controls (null = hotseat/spectator). */
  localSeat: PlayerId | null;
  /** True while an async submit/refresh is in flight. */
  syncing: boolean;
  /**
   * Async only: when false (default), the rendered view is pinned to `localSeat`
   * so a browser can only see its own hand. When true (a debug/god view enabled
   * via `?debug=1`), the seat switcher works and every seat's hand is visible.
   */
  debugReveal: boolean;

  newGame(seats: Array<{ name: string; leaderId: LeaderId; isBot?: boolean }>, seed?: number): string;
  loadGame(gameId: string): boolean;
  /** Create an authoritative async game (human seats only) and seat this device first. */
  createAsyncGame(seats: Array<{ name: string; leaderId: LeaderId }>, seed?: number): Promise<string>;
  /** Join an existing async game as `seat`; starts polling for opponents' moves. */
  joinAsyncGame(gameId: string, seat: PlayerId): Promise<boolean>;
  /** Pull any authoritative actions this client is missing and rebuild state. */
  refreshAsync(): Promise<void>;
  dispatch(action: ImpDispatchable): void;
  /** Advance every consecutive bot move until a human is up or the game ends. */
  runBots(): void;
  /** Apply exactly one bot move if a bot is the current actor; returns whether it did. */
  stepBot(): boolean;
  setAutoRun(on: boolean): void;
  undo(): void;
  redo(): void;
  setViewingAs(viewer: PlayerId | 'SPECTATOR'): void;
  /** Async: enable/disable the god view (see every seat's hand). Debug only. */
  setDebugReveal(on: boolean): void;
  setPending(pending: PendingPlay | null): void;
  clearError(): void;
}

/**
 * Auto-run bookkeeping lives outside the store: a single pending timer and a
 * generation token. Any state change that should cancel auto-play bumps the
 * generation, so a timer that fires late is ignored. Auto-run is only ever
 * (re)scheduled from a human `dispatch` or a fresh load — never from undo/redo —
 * so undo always leaves the human in control.
 */
const BOT_STEP_MS = 500;
let botTimer: ReturnType<typeof setTimeout> | null = null;
let botGeneration = 0;
function cancelBots(): void {
  botGeneration++;
  if (botTimer) {
    clearTimeout(botTimer);
    botTimer = null;
  }
}

/** If auto-run is on and a bot is up, play one move after a pause, then chain. */
function scheduleBots(): void {
  const st = useImpStore.getState();
  if (st.mode === 'async' || !st.autoRun || !st.state) return;
  const actor = currentActor(st.state);
  if (!actor || !st.botSeats.includes(actor)) return;
  cancelBots();
  const gen = botGeneration;
  botTimer = setTimeout(() => {
    if (gen !== botGeneration) return; // superseded by a newer action/undo
    botTimer = null;
    if (useImpStore.getState().stepBot()) scheduleBots();
  }, BOT_STEP_MS);
}

/**
 * Async sync: while an async game is open, keep the client in step with the
 * authoritative log through three channels, fastest first:
 *   1. `transport.subscribe` — a real-time push (Firestore `onSnapshot`, or the
 *      mock's in-process notify). This is the primary path: an opponent's move
 *      lands within a round-trip, and it costs one persistent listener rather
 *      than a read per interval.
 *   2. A `storage` listener — near-instant cross-tab updates for same-device
 *      play against the localStorage-backed mock (where an in-process subscribe
 *      can't cross the tab boundary).
 *   3. A slow poll — a backstop that recovers if a push is dropped or the
 *      subscription silently dies (e.g. a transient Firestore disconnect).
 * A generation token cancels a stale loop when the game changes or a hotseat
 * game loads; `liveUnsub` tears down the real-time subscription.
 */
const POLL_MS = 15000; // backstop only — real-time push handles the fast path
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollGeneration = 0;
let storageBound = false;
let liveUnsub: (() => void) | null = null;
function stopPolling(): void {
  pollGeneration++;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (liveUnsub) {
    liveUnsub();
    liveUnsub = null;
  }
}
function onStorage(): void {
  const st = useImpStore.getState();
  if (st.mode === 'async' && st.gameId) void st.refreshAsync();
}
function startPolling(): void {
  stopPolling();
  const gen = pollGeneration;
  const gameId = useImpStore.getState().gameId;

  // 1. Real-time push. The callback carries the server's cursor; only refresh
  //    when it's ahead of us, so our own committed moves don't self-trigger.
  if (gameId) {
    try {
      liveUnsub = activeTransport.subscribe(gameId, (cursor) => {
        if (gen !== pollGeneration) return;
        const st = useImpStore.getState();
        if (st.mode === 'async' && st.gameId === gameId && cursor > st.journal.length) {
          void st.refreshAsync();
        }
      });
    } catch {
      liveUnsub = null; // a transport without a live channel falls back to poll
    }
  }

  // 2. Cross-tab (same-device mock).
  if (typeof window !== 'undefined' && !storageBound) {
    window.addEventListener('storage', onStorage);
    storageBound = true;
  }

  // 3. Slow poll backstop.
  const tick = () => {
    if (gen !== pollGeneration) return;
    const st = useImpStore.getState();
    if (st.mode !== 'async' || !st.gameId) return;
    void st.refreshAsync().finally(() => {
      if (gen === pollGeneration) pollTimer = setTimeout(tick, POLL_MS);
    });
  };
  pollTimer = setTimeout(tick, POLL_MS);
}

export const useImpStore = create<ImpStore>((set, get) => ({
  gameId: null,
  initial: null,
  journal: [],
  cursor: 0,
  state: null,
  botSeats: [],
  autoRun: true,
  viewingAs: 'SPECTATOR',
  debugReveal: false,
  pending: null,
  lastError: null,
  mode: 'hotseat',
  localSeat: null,
  syncing: false,

  newGame(seatInputs, seed) {
    stopPolling(); // leaving any async game
    const gameId = `i${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const seats: ImpSeat[] = seatInputs.map((s, i) => ({
      playerId: `p${i + 1}`,
      name: s.name || `Player ${i + 1}`,
      leaderId: s.leaderId,
    }));
    const botSeats = seatInputs
      .map((s, i) => (s.isBot ? `p${i + 1}` : null))
      .filter((x): x is string => x !== null);
    const initial = createImperiumGame({
      gameId,
      seed: seed ?? Math.floor(Math.random() * 2 ** 31),
      createdAt: new Date().toISOString(),
      seats,
    });
    persist(gameId, initial, [], 0, initial, botSeats);
    // prefer to view as the first human seat
    const firstHuman = seats.map((s) => s.playerId).find((pid) => !botSeats.includes(pid)) ?? seats[0].playerId;
    set({
      gameId,
      initial,
      journal: [],
      cursor: 0,
      state: initial,
      botSeats,
      viewingAs: firstHuman,
      pending: null,
      lastError: null,
      mode: 'hotseat',
      localSeat: null,
      syncing: false,
    });
    scheduleBots(); // e.g. a bot is first player
    return gameId;
  },

  loadGame(gameId) {
    stopPolling();
    const rec = loadRecord(gameId);
    if (!rec) return false;
    const state = stateAfter(rec.initial, rec.journal, rec.cursor);
    const firstHuman =
      state.playerOrder.find((pid) => !rec.botSeats.includes(pid)) ?? state.playerOrder[0] ?? 'SPECTATOR';
    set({
      gameId,
      initial: rec.initial,
      journal: rec.journal,
      cursor: rec.cursor,
      state,
      botSeats: rec.botSeats,
      viewingAs: firstHuman,
      pending: null,
      lastError: null,
      mode: 'hotseat',
      localSeat: null,
      syncing: false,
    });
    scheduleBots(); // resume auto-play if a bot is up on load
    return true;
  },

  async createAsyncGame(seatInputs, seed) {
    stopPolling();
    const seats = seatInputs.map((s, i) => ({
      playerId: `p${i + 1}`,
      name: s.name || `Player ${i + 1}`,
      leaderId: s.leaderId,
    }));
    let gameId: string;
    try {
      ({ gameId } = await activeTransport.create({ seats, seed, botSeats: [] }));
    } catch (err) {
      const message = `Could not reach the game server: ${err instanceof Error ? err.message : String(err)}`;
      set({ lastError: message });
      throw new Error(message);
    }
    await get().joinAsyncGame(gameId, 'p1');
    return gameId;
  },

  async joinAsyncGame(gameId, seat) {
    stopPolling();
    let co;
    try {
      co = await activeTransport.checkout(gameId);
    } catch (err) {
      set({ lastError: `Could not reach the game server: ${err instanceof Error ? err.message : String(err)}` });
      return false;
    }
    if (!co || !co.initial.players[seat]) {
      set({ lastError: `Cannot join ${gameId} as ${seat}.` });
      return false;
    }
    const state = stateAfter(co.initial, co.journal, co.journal.length);
    set({
      gameId,
      initial: co.initial,
      journal: co.journal,
      cursor: co.journal.length,
      state,
      botSeats: [],
      viewingAs: seat,
      localSeat: seat,
      mode: 'async',
      pending: null,
      lastError: null,
      syncing: false,
    });
    startPolling();
    return true;
  },

  async refreshAsync() {
    const { gameId, initial, journal, mode } = get();
    if (mode !== 'async' || !gameId || !initial) return;
    let delta;
    try {
      delta = await activeTransport.since(gameId, journal.length);
    } catch {
      return; // transient fetch error; the next poll retries
    }
    if (!delta || delta.actions.length === 0) return;
    const merged = [...journal, ...delta.actions];
    const state = stateAfter(initial, merged, merged.length);
    set({ journal: merged, cursor: merged.length, state });
  },

  dispatch(action) {
    const { state, initial, journal, cursor, gameId, botSeats, mode, localSeat } = get();
    if (!state || !initial || !gameId) return;

    if (mode === 'async') {
      // Authoritative path: submit to the transport; adopt its journal on success.
      if (!localSeat) {
        set({ lastError: 'Spectators cannot act.' });
        return;
      }
      set({ syncing: true, lastError: null });
      void (async () => {
        try {
          const res = await activeTransport.submit({
            gameId,
            viewerId: localSeat,
            action: { ...action, playerId: localSeat } as Omit<ImpAction, 'at'>,
            expectedCursor: journal.length,
          });
          if (res.ok) {
            await get().refreshAsync(); // pull the just-appended action(s) authoritatively
            set({ pending: null, lastError: null, syncing: false });
          } else if (res.code === 'conflict') {
            await get().refreshAsync();
            set({ syncing: false, lastError: 'The game moved on — refreshed to the latest state.' });
          } else {
            set({ syncing: false, lastError: res.message });
          }
        } catch (err) {
          set({ syncing: false, lastError: err instanceof Error ? err.message : String(err) });
        }
      })();
      return;
    }

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
      persist(gameId, initial, newJournal, newCursor, next, botSeats);
      set({ journal: newJournal, cursor: newCursor, state: next, lastError: null, pending: null });
      scheduleBots(); // after a human action, let any bots that are now up play
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  runBots() {
    cancelBots();
    const s0 = get();
    if (!s0.state || !s0.initial || !s0.gameId || s0.botSeats.length === 0) return;
    let { state, journal, cursor } = s0;
    const { initial, gameId, botSeats } = s0;
    let advanced = false;
    // bounded: a full game is a few hundred actions; the cap only guards bugs
    for (let i = 0; i < 2000; i++) {
      const actor = currentActor(state);
      if (!actor || !botSeats.includes(actor)) break;
      const action = chooseBotAction(state, actor);
      if (!action) break;
      const stamped = { ...action, at: new Date().toISOString() } as ImpAction;
      if (!impValidate(state, stamped).ok) break;
      state = impApply(state, stamped);
      journal = [...journal.slice(0, cursor), stamped];
      cursor = journal.length;
      advanced = true;
    }
    if (advanced) {
      persist(gameId, initial, journal, cursor, state, botSeats);
      set({ journal, cursor, state, pending: null, lastError: null });
    }
  },

  stepBot() {
    const { state, initial, journal, cursor, gameId, botSeats } = get();
    if (!state || !initial || !gameId) return false;
    const actor = currentActor(state);
    if (!actor || !botSeats.includes(actor)) return false;
    const action = chooseBotAction(state, actor);
    if (!action) return false;
    const stamped = { ...action, at: new Date().toISOString() } as ImpAction;
    if (!impValidate(state, stamped).ok) return false;
    const next = impApply(state, stamped);
    const newJournal = [...journal.slice(0, cursor), stamped];
    persist(gameId, initial, newJournal, newJournal.length, next, botSeats);
    set({ journal: newJournal, cursor: newJournal.length, state: next, pending: null, lastError: null });
    return true;
  },

  setAutoRun(on) {
    set({ autoRun: on });
    if (on) scheduleBots();
    else cancelBots();
  },

  undo() {
    if (get().mode === 'async') return; // authoritative log is append-only
    cancelBots(); // stepping back must not trigger auto-play
    const { initial, journal, cursor, gameId, viewingAs, botSeats } = get();
    if (!initial || !gameId || cursor <= 0) return;
    const newCursor = cursor - 1;
    const state = stateAfter(initial, journal, newCursor);
    persist(gameId, initial, journal, newCursor, state, botSeats);
    const stillSeated = viewingAs === 'SPECTATOR' || state.players[viewingAs] ? viewingAs : 'SPECTATOR';
    set({ cursor: newCursor, state, viewingAs: stillSeated, pending: null, lastError: null });
  },

  redo() {
    if (get().mode === 'async') return; // authoritative log is append-only
    cancelBots();
    const { initial, journal, cursor, gameId, botSeats } = get();
    if (!initial || !gameId || cursor >= journal.length) return;
    const newCursor = cursor + 1;
    const state = stateAfter(initial, journal, newCursor);
    persist(gameId, initial, journal, newCursor, state, botSeats);
    set({ cursor: newCursor, state, pending: null, lastError: null });
  },

  setViewingAs(viewer) {
    set({ viewingAs: viewer, pending: null, lastError: null });
  },
  setDebugReveal(on) {
    set({ debugReveal: on });
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
  botToMove: boolean;
  botSeats: PlayerId[];
  autoRun: boolean;
  mode: 'hotseat' | 'async';
  localSeat: PlayerId | null;
  syncing: boolean;
  /** async: true when the god view is on (see all seats). */
  debugReveal: boolean;
  /** async: whose move the game is waiting on (decision owner else the turn). */
  actor: PlayerId | null;
  /** async: true when this device's seat is the one to move. */
  yourTurn: boolean;
} {
  const state = useImpStore((s) => s.state);
  const viewingAs = useImpStore((s) => s.viewingAs);
  const cursor = useImpStore((s) => s.cursor);
  const journalLen = useImpStore((s) => s.journal.length);
  const botSeats = useImpStore((s) => s.botSeats);
  const autoRun = useImpStore((s) => s.autoRun);
  const mode = useImpStore((s) => s.mode);
  const localSeat = useImpStore((s) => s.localSeat);
  const syncing = useImpStore((s) => s.syncing);
  const debugReveal = useImpStore((s) => s.debugReveal);
  if (!state)
    return {
      full: null,
      view: null,
      allowed: [],
      viewingAs,
      canUndo: false,
      canRedo: false,
      botToMove: false,
      botSeats,
      autoRun,
      mode,
      localSeat,
      syncing,
      debugReveal,
      actor: null,
      yourTurn: false,
    };
  // Security: in async, pin the rendered view to this device's own seat so it
  // can only ever see its own hand. A `?debug=1` god view (debugReveal) unpins it
  // and re-enables the seat switcher. Hotseat is always the free god view.
  const effectiveViewer: PlayerId | 'SPECTATOR' =
    mode === 'async' && !debugReveal && localSeat ? localSeat : viewingAs;
  const view = getVisibleImperiumState(state, effectiveViewer);
  const allowed = effectiveViewer === 'SPECTATOR' ? [] : impAllowedActions(state, effectiveViewer);
  const actor = currentActor(state);
  const botToMove = actor !== null && botSeats.includes(actor);
  const hotseat = mode === 'hotseat';
  return {
    full: state,
    view,
    allowed,
    viewingAs: effectiveViewer,
    canUndo: hotseat && cursor > 0,
    canRedo: hotseat && cursor < journalLen,
    botToMove,
    botSeats,
    autoRun,
    mode,
    localSeat,
    syncing,
    debugReveal,
    actor,
    yourTurn: mode === 'async' && actor !== null && actor === localSeat,
  };
}
