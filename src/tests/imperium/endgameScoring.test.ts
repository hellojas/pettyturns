import { describe, expect, it } from 'vitest';
import { endRoundQuietly, giveIntrigue, makeImp, patch } from './helpers';
import type { ImpGameState } from '../../imperium/types';

/**
 * Endgame intrigue conditions: cards score their `gains.vp` only when their data
 * predicate is satisfied. Every metric is read from the finished game state, so
 * these tests set the metric directly, force the final round (empty conflict
 * deck), and read the VP the scorer awarded.
 *
 * Players are patched `revealed: true` so `endRoundQuietly` steps straight to
 * end-of-turn without a reveal — reveal gains would otherwise perturb the very
 * resources/influence a condition measures.
 */
function finalRound(names = ['Alice', 'Bob']): ImpGameState {
  let s = makeImp(names);
  s = { ...s, conflictDeck: [] }; // makes this the last round → final scoring
  for (const pid of s.playerOrder) s = patch(s, pid, { revealed: true, vp: 0 });
  return s;
}

describe('endgame intrigue conditions', () => {
  it('atLeast threshold: scores only when the metric clears the bar', () => {
    // War Chest: +1 VP with at least 7 solari.
    let met = finalRound();
    met = patch(met, 'p1', { solari: 8 });
    met = giveIntrigue(met, 'p1', 'warChest');
    met = endRoundQuietly(met);
    expect(met.phase).toBe('finished');
    expect(met.players.p1.vp).toBe(1);

    let missed = finalRound();
    missed = patch(missed, 'p1', { solari: 6 });
    missed = giveIntrigue(missed, 'p1', 'warChest');
    missed = endRoundQuietly(missed);
    expect(missed.players.p1.vp).toBe(0);
  });

  it('influence threshold reads the named faction track', () => {
    // Imperial Favor: +1 VP with at least 4 Emperor influence.
    let s = finalRound();
    s = patch(s, 'p1', { influence: { emperor: 5, spacingGuild: 0, beneGesserit: 0, fremen: 0 } });
    s = giveIntrigue(s, 'p1', 'imperialFavor');
    s = endRoundQuietly(s);
    expect(s.players.p1.vp).toBe(1);

    let low = finalRound();
    low = patch(low, 'p1', { influence: { emperor: 3, spacingGuild: 9, beneGesserit: 0, fremen: 0 } });
    low = giveIntrigue(low, 'p1', 'imperialFavor');
    low = endRoundQuietly(low);
    expect(low.players.p1.vp).toBe(0); // high influence on the wrong track doesn't count
  });

  it('per: awards VP once per N units, floored', () => {
    // Standing Army: +1 VP per 3 troops on the board. (Committed troops are
    // spent in the final combat, so garrison is what survives to scoring.)
    let s = finalRound();
    s = patch(s, 'p1', { garrison: 6 }); // 6 troops → floor(6/3) = 2
    s = giveIntrigue(s, 'p1', 'standingArmy');
    s = endRoundQuietly(s);
    expect(s.players.p1.vp).toBe(2);
  });

  it('per: intrigue-card count includes the scoring card itself', () => {
    // Spy Network: +1 VP per 2 intrigue cards still in hand.
    let s = finalRound();
    s = giveIntrigue(s, 'p1', 'spyNetwork'); // 1
    s = giveIntrigue(s, 'p1', 'favoredSubject'); // 2
    s = giveIntrigue(s, 'p1', 'guildAuthorization'); // 3
    s = giveIntrigue(s, 'p1', 'windfall'); // 4 → floor(4/2) = 2
    s = endRoundQuietly(s);
    expect(s.players.p1.vp).toBe(2);
  });

  it('mostAmong: only the metric leader scores; a zero metric never scores', () => {
    // Dynastic Reach: +2 VP for the player holding the most control markers.
    let s = finalRound();
    s = patch(s, 'p1', { controls: ['x', 'y'] }); // most controls
    s = patch(s, 'p2', { controls: ['z'] });
    s = giveIntrigue(s, 'p1', 'dynasticReach');
    s = endRoundQuietly(s);
    expect(s.players.p1.vp).toBe(2);

    // Holding the card but tied at zero (nobody controls anything) scores nothing.
    let none = finalRound();
    none = patch(none, 'p1', { controls: [] });
    none = patch(none, 'p2', { controls: [] });
    none = giveIntrigue(none, 'p1', 'dynasticReach');
    none = endRoundQuietly(none);
    expect(none.players.p1.vp).toBe(0);
  });

  it('an unconditional endgame card still scores its flat VP', () => {
    // Master Stroke: no condition → always +1.
    let s = finalRound();
    s = giveIntrigue(s, 'p1', 'masterStroke');
    s = endRoundQuietly(s);
    expect(s.players.p1.vp).toBe(1);
  });

  it('multiple endgame cards on one player each score independently', () => {
    let s = finalRound();
    s = patch(s, 'p1', { solari: 8 }); // clears War Chest
    s = giveIntrigue(s, 'p1', 'warChest'); // +1
    s = giveIntrigue(s, 'p1', 'masterStroke'); // +1
    s = endRoundQuietly(s);
    expect(s.players.p1.vp).toBe(2);
  });

  it('records the VP awarded in the final-scoring log', () => {
    let s = finalRound();
    s = patch(s, 'p1', { solari: 8 });
    s = giveIntrigue(s, 'p1', 'warChest');
    s = endRoundQuietly(s);
    const entry = s.log.find((e) => e.event === 'intrigue.endgame' && e.data?.intrigueDefId === 'warChest');
    expect(entry?.data?.vp).toBe(1);
  });
});
