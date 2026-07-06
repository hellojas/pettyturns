import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryJournalStore, LocalMockTransport } from '../../imperium/net';
import {
  getImpTransport,
  setImpTransport,
  stopAsyncPolling,
  useImpStore,
} from '../../lib/impStore';

/**
 * The async store path: createAsyncGame / joinAsyncGame / transport-backed
 * dispatch / refreshAsync, driven against an injected in-memory transport (the
 * default localStorage-backed one no-ops under the node test env). This pins the
 * seat-scoping, authority routing, and opponent-move reconciliation that the
 * async UI relies on.
 */

const SEATS = [
  { name: 'Alice', leaderId: 'dukeLeto' },
  { name: 'Bob', leaderId: 'glossuRabban' },
];

let clockTick = 0;
function freshTransport() {
  clockTick = 0;
  return new LocalMockTransport({
    store: new InMemoryJournalStore(),
    clock: () => `2026-01-01T00:00:${String(clockTick++).padStart(2, '0')}.000Z`,
  });
}

beforeEach(() => {
  setImpTransport(freshTransport());
});
afterEach(() => {
  stopAsyncPolling();
});

describe('async store', () => {
  it('creates an async game seated as p1', async () => {
    const gameId = await useImpStore.getState().createAsyncGame(SEATS, 7);
    const s = useImpStore.getState();
    expect(s.mode).toBe('async');
    expect(s.localSeat).toBe('p1');
    expect(s.viewingAs).toBe('p1');
    expect(s.gameId).toBe(gameId);
    expect(s.cursor).toBe(0);
    expect(s.state?.players.p1.name).toBe('Alice');
  });

  it('routes dispatch through the transport and adopts the authoritative journal', async () => {
    await useImpStore.getState().createAsyncGame(SEATS, 7);
    const actor = useImpStore.getState().state!.turn; // p1 is up at the start
    expect(actor).toBe('p1');

    useImpStore.getState().dispatch({ type: 'imp/reveal', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(1));

    const s = useImpStore.getState();
    expect(s.journal[0].type).toBe('imp/reveal');
    expect(s.state?.players.p1.revealed).toBe(true);
    expect(s.syncing).toBe(false);
    expect(s.lastError).toBeNull();
  });

  it('rejects acting out of turn without advancing the log', async () => {
    // Seat this device as p2, whose turn it is NOT at the start.
    const gameId = await useImpStore.getState().createAsyncGame(SEATS, 7);
    await useImpStore.getState().joinAsyncGame(gameId, 'p2');
    expect(useImpStore.getState().localSeat).toBe('p2');

    useImpStore.getState().dispatch({ type: 'imp/reveal', playerId: 'p2' });
    await vi.waitFor(() => expect(useImpStore.getState().lastError).not.toBeNull());
    expect(useImpStore.getState().cursor).toBe(0); // nothing committed
  });

  it('refreshAsync pulls an opponent move made directly on the transport', async () => {
    const gameId = await useImpStore.getState().createAsyncGame(SEATS, 7);
    // Tear down the live subscription so the opponent's out-of-band move stays
    // invisible until we ask — this isolates the manual reconcile path.
    stopAsyncPolling();
    // This device is p1; p2 acts through the transport out-of-band (another device).
    // First p1 must act — the opponent p2 only becomes the actor after p1 ends.
    useImpStore.getState().dispatch({ type: 'imp/reveal', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(1));
    useImpStore.getState().dispatch({ type: 'imp/endTurn', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(2));

    // Now p2 is up; simulate p2's device committing a reveal on the shared transport.
    const res = await getImpTransport().submit({
      gameId,
      viewerId: 'p2',
      action: { type: 'imp/reveal', playerId: 'p2' },
      expectedCursor: 2,
    });
    expect(res.ok).toBe(true);

    // With the live subscription torn down, p1's client only sees it on refresh.
    expect(useImpStore.getState().cursor).toBe(2);
    await useImpStore.getState().refreshAsync();
    expect(useImpStore.getState().cursor).toBe(3);
    expect(useImpStore.getState().state?.players.p2.revealed).toBe(true);
  });

  it('a stale dispatch conflicts, then refreshes to the latest state', async () => {
    const gameId = await useImpStore.getState().createAsyncGame(SEATS, 7);
    // Out-of-band, p1 reveals via the transport so the server moves to cursor 1.
    // We do NOT await it: our stale endTurn below is built on cursor 0 before the
    // live push can catch us up — exactly the optimistic-concurrency race the
    // server must reject.
    void getImpTransport().submit({
      gameId,
      viewerId: 'p1',
      action: { type: 'imp/reveal', playerId: 'p1' },
      expectedCursor: 0,
    });

    // Our stale endTurn should conflict and then reconcile to cursor 1.
    useImpStore.getState().dispatch({ type: 'imp/endTurn', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().lastError).toMatch(/moved on/i));
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(1));
  });

  it('applies an opponent move pushed through the transport subscription', async () => {
    const gameId = await useImpStore.getState().createAsyncGame(SEATS, 7);
    // Advance to p2's turn: p1 reveals then ends their turn.
    useImpStore.getState().dispatch({ type: 'imp/reveal', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(1));
    useImpStore.getState().dispatch({ type: 'imp/endTurn', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(2));

    // p2's device commits directly on the shared transport. The live
    // subscription (not a manual refresh, not the slow poll) should carry it to
    // p1's client on its own.
    const res = await getImpTransport().submit({
      gameId,
      viewerId: 'p2',
      action: { type: 'imp/reveal', playerId: 'p2' },
      expectedCursor: 2,
    });
    expect(res.ok).toBe(true);

    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(3));
    expect(useImpStore.getState().state?.players.p2.revealed).toBe(true);
  });

  it('undo and redo are inert in async mode', async () => {
    await useImpStore.getState().createAsyncGame(SEATS, 7);
    useImpStore.getState().dispatch({ type: 'imp/reveal', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(1));
    useImpStore.getState().undo();
    expect(useImpStore.getState().cursor).toBe(1); // append-only log, no undo
  });
});
