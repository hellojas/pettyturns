import { describe, expect, it } from 'vitest';
import { addInfluence, awardVp } from '../../imperium/engine/effects';
import type { ImpGameState } from '../../imperium/types';
import { makeImp, patch } from './helpers';

/** The ledger's signed amounts must always sum to the player's VP total. */
function assertLedgerBalances(state: ImpGameState): void {
  for (const p of Object.values(state.players)) {
    const sum = p.vpLedger.reduce((n, e) => n + e.amount, 0);
    expect(sum).toBe(p.vp);
  }
}

describe('VP source ledger', () => {
  it('starts empty and balanced', () => {
    const s = makeImp();
    for (const p of Object.values(s.players)) {
      expect(p.vpLedger).toEqual([]);
      expect(p.vp).toBe(0);
    }
    assertLedgerBalances(s);
  });

  it('awardVp records source, amount, round, and detail', () => {
    let s = makeImp();
    s = { ...s, round: 4 };
    s = awardVp(s, 'p1', 2, 'conflict', 'Grand Vision (1st place)');
    const entry = s.players.p1.vpLedger.at(-1)!;
    expect(entry).toMatchObject({ round: 4, source: 'conflict', amount: 2, detail: 'Grand Vision (1st place)' });
    expect(s.players.p1.vp).toBe(2);
    assertLedgerBalances(s);
  });

  it('ignores zero-amount awards', () => {
    let s = makeImp();
    s = awardVp(s, 'p1', 0, 'other', 'noop');
    expect(s.players.p1.vpLedger).toHaveLength(0);
  });

  it('influence-level VP is attributed to influenceLevel', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'emperor', 2); // crosses the level-2 VP threshold
    const emp = s.players.p1.vpLedger.filter((e) => e.source === 'influenceLevel');
    expect(emp.length).toBeGreaterThanOrEqual(1);
    expect(s.players.p1.vp).toBeGreaterThanOrEqual(1);
    assertLedgerBalances(s);
  });

  it('alliance gain and hand-off are both recorded (net zero when transferred)', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'fremen', 4); // p1 takes the alliance (+1 alliance VP)
    expect(s.alliances.fremen).toBe('p1');
    expect(s.players.p1.vpLedger.some((e) => e.source === 'alliance' && e.amount === 1)).toBe(true);
    s = addInfluence(s, 'p2', 'fremen', 5); // p2 outranks → steals it
    expect(s.alliances.fremen).toBe('p2');
    // p1 recorded a -1 alliance entry; ledger still balances to the current total
    expect(s.players.p1.vpLedger.some((e) => e.source === 'alliance' && e.amount === -1)).toBe(true);
    assertLedgerBalances(s);
  });

  it('stays balanced across a full quiet game', async () => {
    const { endRoundQuietly } = await import('./helpers');
    let s = makeImp();
    let guard = 0;
    while (s.phase !== 'finished' && guard++ < 30) s = endRoundQuietly(s);
    assertLedgerBalances(s);
    // the winner's total equals the sum of their attributed sources
    const winner = s.players[s.winner!];
    expect(winner.vpLedger.reduce((n, e) => n + e.amount, 0)).toBe(winner.vp);
  });
});
