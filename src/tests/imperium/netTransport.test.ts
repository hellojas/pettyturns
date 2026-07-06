import { describe, expect, it } from 'vitest';
import { InMemoryJournalStore, LocalMockTransport } from '../../imperium/net';
import type { CreateGameInput } from '../../imperium/net';

/**
 * Async-multiplayer scaffolding: the local mock transport is the authoritative
 * "server". These tests pin the contract a real backend must also satisfy —
 * turn/ownership enforcement, optimistic-concurrency conflict, redaction per
 * viewer, incremental catch-up, and subscription — all resolved by replaying
 * the same journal the engine already uses.
 */

// Leaders with a clean reveal (no deckPeek decision), so a reveal → endTurn
// sequence isn't interrupted by a pending choice we don't model here.
const SEATS: CreateGameInput['seats'] = [
  { playerId: 'p1', name: 'Alice', leaderId: 'dukeLeto' },
  { playerId: 'p2', name: 'Bob', leaderId: 'glossuRabban' },
];

/** Deterministic transport: fixed clock + counted ids, in-memory store. */
function makeTransport() {
  let tick = 0;
  const clock = () => `2026-01-01T00:00:${String(tick++).padStart(2, '0')}.000Z`;
  let n = 0;
  const newId = () => `game-${n++}`;
  return new LocalMockTransport({ store: new InMemoryJournalStore(), clock, newId });
}

describe('LocalMockTransport: lifecycle & snapshots', () => {
  it('creates a game and reports the opening snapshot for each viewer', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    expect(gameId).toBe('game-0');

    const snap = await t.snapshot(gameId, 'p1');
    expect(snap).not.toBeNull();
    expect(snap!.cursor).toBe(0);
    expect(snap!.finished).toBe(false);
    expect(snap!.currentActor).toBe(snap!.view.turn);
    // p1 sees its own private info; p2 is reduced to counts.
    expect(snap!.view.viewerId).toBe('p1');
    expect(snap!.view.hidden.self).not.toBeNull();
    expect(snap!.view.hidden.others.p2).toBeDefined();
    expect((snap!.view.hidden.others as Record<string, unknown>).p1).toBeUndefined();
  });

  it('returns null snapshot for an unknown game', async () => {
    const t = makeTransport();
    expect(await t.snapshot('nope', 'p1')).toBeNull();
  });
});

describe('LocalMockTransport: submit authority', () => {
  it('accepts a legal action from the seat that is up and advances the cursor', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    const actor = (await t.snapshot(gameId, 'p1'))!.currentActor!;

    const res = await t.submit({
      gameId,
      viewerId: actor,
      action: { type: 'imp/reveal', playerId: actor },
      expectedCursor: 0,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cursor).toBe(1);
      expect(res.snapshot.view.viewerId).toBe(actor);
    }
    // the authoritative journal grew by one
    expect((await t.snapshot(gameId, actor))!.cursor).toBe(1);
  });

  it('rejects a client acting as a seat that is not its own', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    const actor = (await t.snapshot(gameId, 'p1'))!.currentActor!;
    const other = actor === 'p1' ? 'p2' : 'p1';

    const res = await t.submit({
      gameId,
      viewerId: other,
      action: { type: 'imp/reveal', playerId: actor }, // impersonation attempt
      expectedCursor: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('not-your-turn');
  });

  it('rejects a legal-shaped action from the seat that is not up as not-your-turn', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    const actor = (await t.snapshot(gameId, 'p1'))!.currentActor!;
    const other = actor === 'p1' ? 'p2' : 'p1';

    const res = await t.submit({
      gameId,
      viewerId: other,
      action: { type: 'imp/reveal', playerId: other },
      expectedCursor: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('not-your-turn');
  });

  it('rejects a stale submit with conflict and reports the authoritative cursor', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    const actor = (await t.snapshot(gameId, 'p1'))!.currentActor!;
    await t.submit({ gameId, viewerId: actor, action: { type: 'imp/reveal', playerId: actor }, expectedCursor: 0 });

    // a second client still thinks the cursor is 0
    const res = await t.submit({
      gameId,
      viewerId: actor,
      action: { type: 'imp/endTurn', playerId: actor },
      expectedCursor: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('conflict');
      expect(res.cursor).toBe(1);
    }
  });

  it('reports no-game for a submit against an unknown game', async () => {
    const t = makeTransport();
    const res = await t.submit({
      gameId: 'nope',
      viewerId: 'p1',
      action: { type: 'imp/reveal', playerId: 'p1' },
      expectedCursor: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('no-game');
  });
});

describe('LocalMockTransport: reconciliation & notification', () => {
  it('since() returns only the actions after the given cursor', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    const actor = (await t.snapshot(gameId, 'p1'))!.currentActor!;
    await t.submit({ gameId, viewerId: actor, action: { type: 'imp/reveal', playerId: actor }, expectedCursor: 0 });

    const all = await t.since(gameId, 0);
    expect(all!.cursor).toBe(1);
    expect(all!.actions).toHaveLength(1);
    expect(all!.actions[0].type).toBe('imp/reveal');

    const caughtUp = await t.since(gameId, 1);
    expect(caughtUp!.actions).toHaveLength(0);
    expect(await t.since('nope', 0)).toBeNull();
  });

  it('notifies subscribers on every append and stops after unsubscribe', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    const actor = (await t.snapshot(gameId, 'p1'))!.currentActor!;

    const cursors: number[] = [];
    const off = t.subscribe(gameId, (c) => cursors.push(c));
    await t.submit({ gameId, viewerId: actor, action: { type: 'imp/reveal', playerId: actor }, expectedCursor: 0 });
    expect(cursors).toEqual([1]);

    off();
    await t.submit({ gameId, viewerId: actor, action: { type: 'imp/endTurn', playerId: actor }, expectedCursor: 1 });
    expect(cursors).toEqual([1]); // no further notifications after unsubscribe
  });

  it('lists and removes games', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    let summaries = await t.list();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].gameId).toBe(gameId);
    expect(summaries[0].players).toEqual(['Alice', 'Bob']);
    expect(summaries[0].round).toBe(1);

    await t.remove(gameId);
    summaries = await t.list();
    expect(summaries).toHaveLength(0);
    expect(await t.snapshot(gameId, 'p1')).toBeNull();
  });
});

describe('LocalMockTransport: two clients reconcile by replay', () => {
  it('a behind client catches up via since() then submits successfully', async () => {
    const t = makeTransport();
    const { gameId } = await t.create({ seats: SEATS, seed: 42 });
    const p1 = (await t.snapshot(gameId, 'p1'))!.currentActor!;

    // Client A commits an action.
    const a = await t.submit({ gameId, viewerId: p1, action: { type: 'imp/reveal', playerId: p1 }, expectedCursor: 0 });
    expect(a.ok).toBe(true);

    // Client B (same seat, another device) is stale at cursor 0; its endTurn conflicts.
    let bCursor = 0;
    let res = await t.submit({ gameId, viewerId: p1, action: { type: 'imp/endTurn', playerId: p1 }, expectedCursor: bCursor });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('conflict');

    // B reconciles by pulling missing actions, then retries at the fresh cursor.
    const delta = await t.since(gameId, bCursor);
    bCursor = delta!.cursor;
    res = await t.submit({ gameId, viewerId: p1, action: { type: 'imp/endTurn', playerId: p1 }, expectedCursor: bCursor });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.cursor).toBe(2);
  });
});
