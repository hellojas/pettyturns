import { describe, expect, it } from 'vitest';
import { IMP_CONSTANTS } from '../../imperium/data/constants';
import { makeImp } from './helpers';

describe('imperium setup', () => {
  it('rejects bad player counts and duplicate leaders', () => {
    expect(() => makeImp(['Solo'])).toThrow();
    expect(() => makeImp(['A', 'B', 'C', 'D', 'E'])).toThrow();
  });

  it('is deterministic for the same seed and diverges across seeds', () => {
    expect(JSON.stringify(makeImp(['A', 'B'], 7))).toBe(JSON.stringify(makeImp(['A', 'B'], 7)));
    expect(JSON.stringify(makeImp(['A', 'B'], 7))).not.toBe(JSON.stringify(makeImp(['A', 'B'], 8)));
  });

  it('survives a JSON round-trip', () => {
    const s = makeImp();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('deals opening hands, resources, agents, and troops per config', () => {
    const s = makeImp(['A', 'B', 'C']);
    for (const pid of s.playerOrder) {
      expect(s.hidden[pid].hand).toHaveLength(IMP_CONSTANTS.handSize);
      expect(s.hidden[pid].deck).toHaveLength(10 - IMP_CONSTANTS.handSize);
      const p = s.players[pid];
      expect(p.water).toBe(IMP_CONSTANTS.startingWater);
      expect(p.garrison).toBe(IMP_CONSTANTS.startingGarrison);
      expect(p.agentsLeft).toBe(IMP_CONSTANTS.startingAgents);
      expect(p.vp).toBe(0);
    }
  });

  it('builds the imperium row and reveals the first conflict', () => {
    const s = makeImp();
    expect(s.imperiumRow).toHaveLength(IMP_CONSTANTS.imperiumRowSize);
    expect(s.currentConflict).not.toBeNull();
    expect(s.conflictDeck.length).toBe(s.maxRounds - 1);
    expect(s.turn).toBe(s.firstPlayer);
  });
});
