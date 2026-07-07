import { describe, expect, it } from 'vitest';
import { createImperiumGame } from '../../imperium/engine/setup';
import { evaluateSubmit } from '../../imperium/net/serverLogic';
import type { StoredImpGame } from '../../imperium/net';

/**
 * Seat ↔ identity binding: a seat is claimed by the first client identity that
 * acts as it, and afterwards only that identity may act as the seat. Bot seats
 * are shared (never bound), and an absent identity skips enforcement entirely
 * (legacy clients / trusted single-device play). Enforced in `evaluateSubmit`,
 * the shared authoritative logic every transport runs.
 */
const NOW = '2026-01-01T00:00:00.000Z';

function freshGame(botSeats: string[] = []): StoredImpGame {
  const initial = createImperiumGame({
    gameId: 'g1',
    seed: 7,
    createdAt: NOW,
    seats: [
      { playerId: 'p1', name: 'Alice', leaderId: 'dukeLeto' },
      { playerId: 'p2', name: 'Bob', leaderId: 'glossuRabban' },
    ],
  });
  return { schema: 3, gameId: 'g1', initial, journal: [], botSeats, createdAt: NOW, updatedAt: NOW };
}

describe('seat-ownership binding', () => {
  it('claims a seat for the first identity that acts, then rejects a different one', () => {
    let game = freshGame();

    const first = evaluateSubmit(
      game,
      { gameId: 'g1', viewerId: 'p1', action: { type: 'imp/reveal', playerId: 'p1' }, expectedCursor: 0, identity: 'device-A' },
      NOW,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.game.seatOwners?.p1).toBe('device-A');
    game = first.game;

    // A different device trying to act as p1 is turned away.
    const intruder = evaluateSubmit(
      game,
      { gameId: 'g1', viewerId: 'p1', action: { type: 'imp/endTurn', playerId: 'p1' }, expectedCursor: 1, identity: 'device-B' },
      NOW,
    );
    expect(intruder.ok).toBe(false);
    if (intruder.ok) return;
    expect(intruder.error.code).toBe('not-your-turn');
    expect(intruder.error.message).toMatch(/claimed/i);

    // The original device is still allowed.
    const owner = evaluateSubmit(
      game,
      { gameId: 'g1', viewerId: 'p1', action: { type: 'imp/endTurn', playerId: 'p1' }, expectedCursor: 1, identity: 'device-A' },
      NOW,
    );
    expect(owner.ok).toBe(true);
  });

  it('never binds a bot seat (any identity may step it)', () => {
    const game = freshGame(['p1']);
    const out = evaluateSubmit(
      game,
      { gameId: 'g1', viewerId: 'p1', action: { type: 'imp/reveal', playerId: 'p1' }, expectedCursor: 0, identity: 'whoever' },
      NOW,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.game.seatOwners?.p1).toBeUndefined();
  });

  it('skips enforcement entirely when no identity is presented', () => {
    let game = freshGame();
    const a = evaluateSubmit(
      game,
      { gameId: 'g1', viewerId: 'p1', action: { type: 'imp/reveal', playerId: 'p1' }, expectedCursor: 0 },
      NOW,
    );
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.game.seatOwners).toBeUndefined();
    game = a.game;

    // Still no binding, so any client may continue.
    const b = evaluateSubmit(
      game,
      { gameId: 'g1', viewerId: 'p1', action: { type: 'imp/endTurn', playerId: 'p1' }, expectedCursor: 1 },
      NOW,
    );
    expect(b.ok).toBe(true);
  });
});
