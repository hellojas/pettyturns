import { describe, it, expect } from 'vitest';
import { normalizeImpState } from '../../lib/impStore';
import { stateAfter } from '../../imperium/engine/replay';
import { impApply, impValidate } from '../../imperium/engine/engine';
import type { ImpAction, ImpGameState } from '../../imperium/types';
import { makeImp } from './helpers';

/**
 * Mimic a blob written by an older build: drop the state collections added after
 * it was persisted (pending-decision system, control markers, VP ledger, …).
 * Round-trips through JSON because that's exactly how a real save is stored.
 */
function ageState(state: ImpGameState): ImpGameState {
  const s = JSON.parse(JSON.stringify(state)) as Record<string, unknown> & {
    players: Record<string, Record<string, unknown>>;
  };
  for (const key of [
    'pendingDecisions',
    'flowResume',
    'decisionSeq',
    'combatPassed',
    'occupied',
    'makerBonus',
    'alliances',
    'controlledBy',
    'finalStandings',
  ]) {
    delete s[key];
  }
  for (const p of Object.values(s.players)) {
    delete p.controls;
    delete p.vpLedger;
  }
  return s as unknown as ImpGameState;
}

const reveal: ImpAction = { type: 'imp/reveal', playerId: 'p1', at: '2026-01-01T00:00:00.000Z' };

describe('legacy save normalization', () => {
  it('reproduces the crash: reading pendingDecisions[0] on an aged save throws', () => {
    const aged = ageState(makeImp());
    // engine.ts reads state.pendingDecisions[0] first thing — undefined[0] throws
    // "Cannot read properties of undefined (reading '0')".
    expect(() => impValidate(aged, reveal)).toThrow();
  });

  it('backfills the missing collections with neutral defaults', () => {
    const norm = normalizeImpState(ageState(makeImp()));
    expect(norm.pendingDecisions).toEqual([]);
    expect(norm.flowResume).toBeNull();
    expect(norm.decisionSeq).toBe(0);
    expect(norm.combatPassed).toEqual([]);
    expect(norm.occupied).toEqual({});
    for (const p of Object.values(norm.players)) {
      expect(p.controls).toEqual([]);
      expect(p.vpLedger).toEqual([]);
    }
  });

  it('a normalized aged save validates and applies without throwing', () => {
    const norm = normalizeImpState(ageState(makeImp()));
    expect(() => impValidate(norm, reveal)).not.toThrow();
    expect(impValidate(norm, reveal).ok).toBe(true);
    expect(() => impApply(norm, reveal)).not.toThrow();
  });

  it('replays a journal from an aged initial (the loadGame path)', () => {
    const initial = normalizeImpState(ageState(makeImp()));
    const live = stateAfter(initial, [reveal], 1);
    expect(live.players.p1.revealed).toBe(true);
  });

  it('is a no-op on a complete, current save', () => {
    const fresh = makeImp();
    expect(normalizeImpState(fresh)).toEqual(fresh);
  });
});
