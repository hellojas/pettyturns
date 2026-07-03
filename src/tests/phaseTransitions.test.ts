import { describe, expect, it } from 'vitest';
import { applyAction, getAllowedActions } from '../game/engine/engine';
import type { GameState } from '../game/types';
import { makeGame, completeSetup, passAllBidding, throughFirstStorm } from './helpers';

/** Drive one full round with minimal choices: pass bidding, skip everything skippable. */
function playRound(state: GameState, dials: [number, number]): GameState {
  let s = state;
  // storm
  expect(s.phase).toBe('storm');
  const decision = s.pendingDecisions.find((d) => d.kind === 'stormDial')!;
  decision.waitingFor.forEach((pid, i) => {
    s = applyAction(s, { type: 'storm/dial', playerId: pid, value: dials[i] ?? 1 });
  });
  // spice blow is automatic; a worm would interpose a nexus
  if (s.phase === 'nexus') {
    s = applyAction(s, { type: 'nexus/end', playerId: s.playerOrder[0] });
  }
  // bidding
  s = passAllBidding(s);
  // revival (queue may be empty and skipped automatically)
  let guard = 0;
  while (s.phase === 'revival' && guard++ < 20) {
    s = applyAction(s, { type: 'revival/skip', playerId: s.revivalPhase!.queue[0] });
  }
  // shipment & movement: everyone skips both steps
  guard = 0;
  while (s.phase === 'shipmentAndMovement' && guard++ < 40) {
    const cur = s.shipmentMovementPhase!.current!;
    const step = s.shipmentMovementPhase!.step!;
    s = applyAction(s, { type: step === 'ship' ? 'shipment/skip' : 'movement/skip', playerId: cur });
  }
  // battle/spice collection/mentat pause are automatic without contested territories
  return s;
}

describe('phase engine', () => {
  it('walks a full round in exact phase order and starts the next round', () => {
    let s = completeSetup(makeGame(['atreides', 'harkonnen']));
    expect(s.round).toBe(1);
    s = playRound(s, [2, 3]);
    expect(s.round).toBe(2);
    expect(s.phase).toBe('storm');
    // new round created a fresh storm dial
    expect(s.pendingDecisions.some((d) => d.kind === 'stormDial')).toBe(true);
    // phase order was respected in the log
    const phaseEvents = s.log.filter((e) => e.round === 1).map((e) => e.phase);
    const order = ['setup', 'storm', 'spiceBlow', 'bidding', 'revival', 'shipmentAndMovement', 'battle', 'spiceCollection', 'mentatPause'];
    let cursor = 0;
    for (const phase of phaseEvents) {
      const idx = order.indexOf(phase);
      if (idx === -1) continue; // nexus may interpose
      expect(idx).toBeGreaterThanOrEqual(cursor === 0 ? 0 : cursor - 1);
      cursor = Math.max(cursor, idx);
    }
  });

  it('rejects actions from the wrong phase', () => {
    const s = completeSetup(makeGame(['atreides', 'harkonnen']));
    expect(() =>
      applyAction(s, { type: 'bidding/bid', playerId: s.playerOrder[0], amount: 1 }),
    ).toThrow();
  });

  it('getAllowedActions matches the pending decision', () => {
    const s = completeSetup(makeGame(['atreides', 'harkonnen']));
    const dialers = s.pendingDecisions.find((d) => d.kind === 'stormDial')!.waitingFor;
    for (const pid of dialers) {
      expect(getAllowedActions(s, pid).map((a) => a.type)).toContain('storm/dial');
    }
  });

  it('same seed and same action list reproduce the identical game', () => {
    const run = () => {
      let s = completeSetup(makeGame(['atreides', 'harkonnen'], 1234));
      s = playRound(s, [1, 2]);
      return s;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('two games with different seeds diverge', () => {
    const a = throughFirstStorm(makeGame(['atreides', 'harkonnen'], 1), [3, 3]);
    const b = throughFirstStorm(makeGame(['atreides', 'harkonnen'], 2), [3, 3]);
    expect(JSON.stringify(a.decks.treacheryDraw)).not.toBe(JSON.stringify(b.decks.treacheryDraw));
  });
});
