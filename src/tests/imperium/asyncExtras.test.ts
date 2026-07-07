import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryJournalStore, LocalMockTransport } from '../../imperium/net';
import { setImpTransport, stopAsyncPolling, useImpStore } from '../../lib/impStore';

/**
 * Async store extras: bot seats stepped through the transport, rematch
 * (same-seats new game), and the chat side-channel. Driven against an injected
 * in-memory transport, mirroring asyncStore.test.ts.
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

beforeEach(() => setImpTransport(freshTransport()));
afterEach(() => stopAsyncPolling());

describe('async bots', () => {
  it('steps a bot seat through the transport', async () => {
    // p2 is a bot; this device seats at the first human (p1).
    await useImpStore.getState().createAsyncGame([SEATS[0], { ...SEATS[1], isBot: true }], 7);
    expect(useImpStore.getState().localSeat).toBe('p1');
    expect(useImpStore.getState().botSeats).toEqual(['p2']);

    // p1 plays out and hands off to the bot.
    useImpStore.getState().dispatch({ type: 'imp/reveal', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(1));
    useImpStore.getState().dispatch({ type: 'imp/endTurn', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(2));

    // p2 (the bot) is now the actor; one explicit step commits its move.
    const before = useImpStore.getState().cursor;
    const ok = await useImpStore.getState().stepAsyncBot();
    expect(ok).toBe(true);
    expect(useImpStore.getState().cursor).toBeGreaterThan(before);
  });
});

describe('rematch', () => {
  it('starts a fresh async game with the same seats and bots', async () => {
    const first = await useImpStore.getState().createAsyncGame([SEATS[0], { ...SEATS[1], isBot: true }], 7);
    // Make a move so the base state differs from a pristine game.
    useImpStore.getState().dispatch({ type: 'imp/reveal', playerId: 'p1' });
    await vi.waitFor(() => expect(useImpStore.getState().cursor).toBe(1));

    const res = await useImpStore.getState().rematch();
    expect(res?.mode).toBe('async');
    expect(res?.gameId).not.toBe(first);

    const s = useImpStore.getState();
    expect(s.gameId).toBe(res?.gameId);
    expect(s.cursor).toBe(0); // brand-new game
    expect(s.state?.players.p1.name).toBe('Alice');
    expect(s.state?.players.p2.name).toBe('Bob');
    expect(s.botSeats).toEqual(['p2']); // bot seat preserved
  });
});

describe('chat through the store', () => {
  it('sends and receives a chat line as the local seat', async () => {
    await useImpStore.getState().createAsyncGame(SEATS, 7);
    await useImpStore.getState().sendChat('good luck');
    await vi.waitFor(() => expect(useImpStore.getState().chat.length).toBe(1));

    const msg = useImpStore.getState().chat[0];
    expect(msg.text).toBe('good luck');
    expect(msg.seat).toBe('p1');
    expect(msg.name).toBe('Alice');
  });

  it('ignores empty messages', async () => {
    await useImpStore.getState().createAsyncGame(SEATS, 7);
    await useImpStore.getState().sendChat('   ');
    expect(useImpStore.getState().chat.length).toBe(0);
  });
});
