import { describe, expect, it } from 'vitest';
import { applyAction, validateAction, autoAdvance } from '../game/engine/engine';
import { revivalPhase } from '../game/engine/phases/revival';
import type { GameState, PlayerId } from '../game/types';
import { makeGame, completeSetup, playerByFaction } from './helpers';

/** Put a game directly into the revival phase with chosen tank contents. */
function toRevival(state: GameState, tanks: Record<PlayerId, number>): GameState {
  let s = state;
  for (const [pid, count] of Object.entries(tanks)) {
    s = {
      ...s,
      players: {
        ...s.players,
        [pid]: { ...s.players[pid], tanksForces: { forces: count, specialForces: 0 } },
      },
    };
  }
  s = { ...s, phase: 'revival' };
  return revivalPhase.onEnter!(s);
}

describe('revival', () => {
  it('skips the phase automatically when nobody has anything to revive', () => {
    let s = completeSetup(makeGame(['atreides', 'harkonnen']));
    s = toRevival(s, {});
    expect(autoAdvance(s).phase).toBe('shipmentAndMovement');
  });

  it('enforces the per-turn revival maximum', () => {
    let s = completeSetup(makeGame(['atreides', 'harkonnen']));
    const at = playerByFaction(s, 'atreides');
    s = toRevival(s, { [at]: 5 });
    expect(s.revivalPhase!.queue[0]).toBe(at);
    expect(
      validateAction(s, { type: 'revival/reviveForces', playerId: at, forces: 4, specialForces: 0 }).ok,
    ).toBe(false);
    expect(
      validateAction(s, { type: 'revival/reviveForces', playerId: at, forces: 3, specialForces: 0 }).ok,
    ).toBe(true);
  });

  it('gives the free revivals then charges spice for the rest', () => {
    let s = completeSetup(makeGame(['atreides', 'harkonnen']));
    const at = playerByFaction(s, 'atreides'); // 2 free revivals, 10 spice
    s = toRevival(s, { [at]: 5 });
    const spiceBefore = s.players[at].spice;
    s = applyAction(s, { type: 'revival/reviveForces', playerId: at, forces: 3, specialForces: 0 });
    // 2 free + 1 paid at 2 spice
    expect(s.players[at].spice).toBe(spiceBefore - 2);
    expect(s.players[at].tanksForces.forces).toBe(2);
    expect(s.players[at].reserves.forces).toBe(10 + 3);
  });

  it('rejects revivals the player cannot afford', () => {
    let s = completeSetup(makeGame(['atreides', 'harkonnen']));
    const at = playerByFaction(s, 'atreides');
    s = toRevival(s, { [at]: 3 });
    s = { ...s, players: { ...s.players, [at]: { ...s.players[at], spice: 0 } } };
    expect(
      validateAction(s, { type: 'revival/reviveForces', playerId: at, forces: 3, specialForces: 0 }).ok,
    ).toBe(false); // third force costs 2, player has 0
    expect(
      validateAction(s, { type: 'revival/reviveForces', playerId: at, forces: 2, specialForces: 0 }).ok,
    ).toBe(true); // the free ones are fine
  });

  it('rejects reviving more than the tanks hold, and out-of-turn revivals', () => {
    let s = completeSetup(makeGame(['atreides', 'harkonnen']));
    const at = playerByFaction(s, 'atreides');
    const hk = playerByFaction(s, 'harkonnen');
    s = toRevival(s, { [at]: 1, [hk]: 1 });
    const first = s.revivalPhase!.queue[0];
    const second = s.revivalPhase!.queue[1];
    expect(
      validateAction(s, { type: 'revival/reviveForces', playerId: first, forces: 2, specialForces: 0 }).ok,
    ).toBe(false);
    expect(
      validateAction(s, { type: 'revival/reviveForces', playerId: second, forces: 1, specialForces: 0 }).ok,
    ).toBe(false);
  });

  it('allows leader revival only when every leader is dead', () => {
    let s = completeSetup(makeGame(['atreides', 'harkonnen']));
    const at = playerByFaction(s, 'atreides');
    s = toRevival(s, { [at]: 1 });
    const alive = s.players[at].leadersAlive;
    // with leaders alive: rejected
    expect(
      validateAction(s, { type: 'revival/reviveLeader', playerId: at, leaderId: alive[0] }).ok,
    ).toBe(false);
    // kill them all
    s = {
      ...s,
      players: {
        ...s.players,
        [at]: {
          ...s.players[at],
          leadersAlive: [],
          leadersDead: alive.map((leaderId) => ({ leaderId, faceUp: true })),
        },
      },
    };
    const target = s.players[at].leadersDead[0].leaderId;
    expect(validateAction(s, { type: 'revival/reviveLeader', playerId: at, leaderId: target }).ok).toBe(true);
    const after = applyAction(s, { type: 'revival/reviveLeader', playerId: at, leaderId: target });
    expect(after.players[at].leadersAlive).toContain(target);
    // only one leader per turn
    const target2 = after.players[at].leadersDead[0]?.leaderId;
    expect(
      validateAction(after, { type: 'revival/reviveLeader', playerId: at, leaderId: target2 }).ok,
    ).toBe(false);
  });
});
