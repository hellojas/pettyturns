import { describe, expect, it } from 'vitest';
import { fireLeaderHook } from '../../imperium/engine/effects';
import { impApply } from '../../imperium/engine/engine';
import type { ImpGameState } from '../../imperium/types';
import { makeImp, patch, setHand } from './helpers';

/** Give p1 a specific leader (helpers seed p1 with paulAtreides by default). */
function withLeader(state: ImpGameState, pid: string, leaderId: string): ImpGameState {
  return patch(state, pid, { leaderId });
}

describe('leader hooks: onAcquireCard', () => {
  it('Helena Richese gains solari when she buys a card from the imperium row', () => {
    let s = makeImp(['A', 'B'], 3);
    s = withLeader(s, 'p1', 'helenaRichese');
    // reveal to get persuasion, then buy an affordable row card
    s = setHand(s, 'p1', ['convincingArgument', 'convincingArgument', 'diplomacy', 'reconnaissance', 'desertHomeworld']);
    s = impApply(s, { type: 'imp/reveal', playerId: 'p1' });
    const target = s.imperiumRow[0];
    const solariBefore = s.players.p1.solari;
    s = patch(s, 'p1', { persuasion: 20 }); // ample persuasion so the buy is legal
    s = impApply(s, { type: 'imp/buyCard', playerId: 'p1', cardId: target });
    expect(s.players.p1.solari).toBe(solariBefore + 1); // +1 from the onAcquireCard passive
    expect(s.log.some((e) => e.event === 'leader.passive')).toBe(true);
  });

  it('fireLeaderHook is a no-op for a leader without that hook', () => {
    let s = makeImp(['A', 'B'], 3);
    s = withLeader(s, 'p1', 'dukeLeto'); // has onReveal only
    const before = JSON.stringify(s.players.p1);
    s = fireLeaderHook(s, 'p1', 'onAcquireCard');
    expect(JSON.stringify(s.players.p1)).toBe(before);
  });

  it('acquiring a reserve card also triggers onAcquireCard', () => {
    let s = makeImp(['A', 'B'], 3);
    s = withLeader(s, 'p1', 'helenaRichese');
    s = setHand(s, 'p1', ['convincingArgument', 'convincingArgument', 'diplomacy', 'reconnaissance', 'desertHomeworld']);
    s = impApply(s, { type: 'imp/reveal', playerId: 'p1' });
    s = patch(s, 'p1', { persuasion: 20 });
    const solariBefore = s.players.p1.solari;
    s = impApply(s, { type: 'imp/buyCard', playerId: 'p1', cardId: 'theSpiceMustFlow' });
    expect(s.players.p1.solari).toBe(solariBefore + 1);
  });
});

describe('leader hooks: onCombatWin', () => {
  // Duke Leto (onReveal solari — no intrigue, no decision) is a clean control
  // leader; the Baron's onCombatWin is what we isolate here.
  function armedCombat(baronSeat: 'p1' | 'p2'): ImpGameState {
    let s = makeImp(['A', 'B'], 3);
    s = withLeader(s, 'p1', baronSeat === 'p1' ? 'baronHarkonnen' : 'dukeLeto');
    s = withLeader(s, 'p2', baronSeat === 'p2' ? 'baronHarkonnen' : 'dukeLeto');
    s = { ...s, currentConflict: 'skirmishA' }; // 1st: 1 VP, 2nd: 1 water
    s = patch(s, 'p1', { inConflict: 3 }); // p1 wins (strength 6 vs 2)
    s = patch(s, 'p2', { inConflict: 1 });
    s = impApply(s, { type: 'imp/reveal', playerId: 'p1' });
    s = impApply(s, { type: 'imp/endTurn', playerId: 'p1' });
    s = impApply(s, { type: 'imp/reveal', playerId: 'p2' });
    s = impApply(s, { type: 'imp/endTurn', playerId: 'p2' });
    return s; // now in combat, both revealed (so onReveal already resolved)
  }

  it('the Baron draws an intrigue card when he takes first place', () => {
    let s = armedCombat('p1'); // Baron is p1, the winner
    expect(s.phase).toBe('combat');
    const before = s.hidden.p1.intrigue.length; // after reveal, before resolution
    let guard = 0;
    while (s.phase === 'combat' && s.turn && guard++ < 10) {
      s = impApply(s, { type: 'imp/combatPass', playerId: s.turn });
    }
    expect(s.hidden.p1.intrigue.length).toBe(before + 1); // onCombatWin only
    expect(s.log.some((e) => e.event === 'leader.passive')).toBe(true);
  });

  it('the loser does not trigger onCombatWin', () => {
    let s = armedCombat('p2'); // Baron is p2, the loser
    const before = s.hidden.p2.intrigue.length;
    let guard = 0;
    while (s.phase === 'combat' && s.turn && guard++ < 10) {
      s = impApply(s, { type: 'imp/combatPass', playerId: s.turn });
    }
    expect(s.hidden.p2.intrigue.length).toBe(before); // 2nd place reward is water, no onCombatWin
  });
});
