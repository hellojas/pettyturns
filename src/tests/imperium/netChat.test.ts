import { describe, expect, it } from 'vitest';
import { InMemoryJournalStore, LocalMockTransport } from '../../imperium/net';

/**
 * The optional chat side-channel on the transport: post, incremental catch-up
 * via chatSince, and a live subscribe notification. Backed by the in-memory
 * journal store's chat log.
 */
const SEATS = [
  { playerId: 'p1' as const, name: 'Alice', leaderId: 'dukeLeto' },
  { playerId: 'p2' as const, name: 'Bob', leaderId: 'glossuRabban' },
];

function fresh() {
  return new LocalMockTransport({ store: new InMemoryJournalStore(), clock: () => '2026-01-01T00:00:00.000Z' });
}

describe('transport chat', () => {
  it('posts and reads back messages incrementally', async () => {
    const t = fresh();
    const { gameId } = await t.create({ seats: SEATS, seed: 1 });

    await t.postChat!(gameId, { seat: 'p1', name: 'Alice', text: 'hi' });
    await t.postChat!(gameId, { seat: 'p2', name: 'Bob', text: 'hey' });

    const all = await t.chatSince!(gameId, 0);
    expect(all?.cursor).toBe(2);
    expect(all?.messages.map((m) => m.text)).toEqual(['hi', 'hey']);
    expect(all?.messages[0].seq).toBe(0);
    expect(all?.messages[1].seat).toBe('p2');

    const tail = await t.chatSince!(gameId, 1);
    expect(tail?.messages.map((m) => m.text)).toEqual(['hey']);
  });

  it('notifies subscribers on each post and stops after unsubscribe', async () => {
    const t = fresh();
    const { gameId } = await t.create({ seats: SEATS, seed: 1 });
    const counts: number[] = [];
    const unsub = t.subscribeChat!(gameId, (c) => counts.push(c));

    await t.postChat!(gameId, { seat: 'p1', name: 'Alice', text: 'one' });
    await t.postChat!(gameId, { seat: 'p1', name: 'Alice', text: 'two' });
    expect(counts).toEqual([1, 2]);

    unsub();
    await t.postChat!(gameId, { seat: 'p1', name: 'Alice', text: 'three' });
    expect(counts).toEqual([1, 2]); // no further notifications
  });

  it('chat is removed with the game', async () => {
    const t = fresh();
    const { gameId } = await t.create({ seats: SEATS, seed: 1 });
    await t.postChat!(gameId, { seat: 'p1', name: 'Alice', text: 'hi' });
    await t.remove(gameId);
    const after = await t.chatSince!(gameId, 0);
    expect(after?.messages ?? []).toEqual([]);
  });
});
