import { impAllowedActions, impApply, impValidate } from '../engine/engine';
import { stateAfter } from '../engine/replay';
import { getVisibleImperiumState } from '../engine/visibility';
import type { ImpAction, ImpGameState, PlayerId } from '../types';
import type { GameSnapshot, StoredImpGame, SubmitError, SubmitInput } from './types';

/**
 * Authoritative server logic shared by every transport implementation.
 *
 * Both the in-process `LocalMockTransport` and the networked `FirestoreTransport`
 * run the SAME validation/redaction here, so "the server" behaves identically
 * whether it's a Map, localStorage, or Firestore behind a transaction. Keeping
 * this pure (no I/O) is what lets Firestore run it inside `runTransaction`.
 */

/** Whoever the engine is waiting on: the front decision's owner, else the turn. */
export function actorOf(state: ImpGameState): PlayerId | null {
  if (state.phase === 'finished') return null;
  return state.pendingDecisions[0]?.playerId ?? state.turn;
}

/** Live state derived by replaying a stored game's journal over its seed. */
export function liveState(game: StoredImpGame): ImpGameState {
  return stateAfter(game.initial, game.journal, game.journal.length);
}

/** A viewer's redacted snapshot at the game's current cursor. */
export function buildSnapshot(
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

export type SubmitOutcome =
  | { ok: true; game: StoredImpGame; snapshot: GameSnapshot }
  | { ok: false; error: SubmitError };

/**
 * Validate and apply a submitted action against a stored game, returning either
 * the updated game + submitter snapshot or a typed error. Pure: callers persist
 * `outcome.game` however they store data. `now` stamps the action and updatedAt.
 */
export function evaluateSubmit(
  game: StoredImpGame | null,
  input: SubmitInput,
  now: string,
): SubmitOutcome {
  if (!game) {
    return { ok: false, error: { ok: false, code: 'no-game', message: 'Unknown game.', cursor: 0 } };
  }
  const cursor = game.journal.length;

  // Optimistic concurrency: a client that fell behind must resync and retry.
  if (input.expectedCursor !== cursor) {
    return {
      ok: false,
      error: {
        ok: false,
        code: 'conflict',
        message: `Out of date: expected cursor ${input.expectedCursor}, server is at ${cursor}.`,
        cursor,
      },
    };
  }

  // Authorization: a client may only act as its own seat.
  if (input.action.playerId !== input.viewerId) {
    return {
      ok: false,
      error: { ok: false, code: 'not-your-turn', message: 'You can only act as your own seat.', cursor },
    };
  }

  // Seat-ownership binding: when the client presents an identity, a seat is
  // bound to the first identity that acts as it, and afterwards only that
  // identity may act as the seat. Bot seats are shared (any client may step
  // them), so they are never bound. Absent identity = enforcement skipped
  // (legacy clients / trusted single-device tests).
  const seat = input.viewerId;
  const isBotSeat = game.botSeats.includes(seat);
  let seatOwners = game.seatOwners;
  if (input.identity && !isBotSeat) {
    const owner = game.seatOwners?.[seat];
    if (owner && owner !== input.identity) {
      return {
        ok: false,
        error: {
          ok: false,
          code: 'not-your-turn',
          message: 'This seat is claimed by another player on this game.',
          cursor,
        },
      };
    }
    if (!owner) seatOwners = { ...(game.seatOwners ?? {}), [seat]: input.identity };
  }

  const live = liveState(game);
  if (live.phase === 'finished') {
    return { ok: false, error: { ok: false, code: 'game-over', message: 'The game is over.', cursor } };
  }

  const stamped = { ...input.action, at: now } as ImpAction;
  const verdict = impValidate(live, stamped);
  if (!verdict.ok) {
    // Distinguish "wrong player is up" from a genuinely illegal move.
    const code = actorOf(live) !== input.viewerId ? 'not-your-turn' : 'invalid';
    return { ok: false, error: { ok: false, code, message: verdict.message, cursor } };
  }

  const next = impApply(live, stamped);
  const updated: StoredImpGame = {
    ...game,
    journal: [...game.journal, stamped],
    seatOwners,
    updatedAt: now,
  };
  return { ok: true, game: updated, snapshot: buildSnapshot(updated, next, input.viewerId) };
}
