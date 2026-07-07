import { describe, expect, it } from 'vitest';
import { addInfluence } from '../../imperium/engine/effects';
import { IMP_FACTION_INFLUENCE_REWARDS } from '../../imperium/data/factions';
import { makeImp } from './helpers';

/**
 * Faction influence-track step rewards. Verified against the 2020 rulebook: the
 * base game grants a single track bonus, on the level-4 (Alliance) space. It
 * fires on the upward crossing only, is never clawed back on a drop, and can be
 * earned again by dropping below 4 and re-crossing.
 *
 * These assertions read the current config values so they track edits made when
 * the owner VERIFIES the payloads; the mechanic — the level-4 bonus fires once
 * per upward crossing and never reverses — is what's pinned here.
 */
describe('faction influence-track step rewards', () => {
  it('grants the level-4 reward when first reaching it', () => {
    let s = makeImp();
    const solariBefore = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', 4); // reaches level 4
    const reward = IMP_FACTION_INFLUENCE_REWARDS.emperor[4]!;
    expect(s.players.p1.solari).toBe(solariBefore + (reward.solari ?? 0));
  });

  it('grants the reward once when the level is crossed in a single jump', () => {
    let s = makeImp();
    const solariBefore = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', 4); // crosses levels 1-4 at once
    const l4 = IMP_FACTION_INFLUENCE_REWARDS.emperor[4]!;
    expect(s.players.p1.solari).toBe(solariBefore + (l4.solari ?? 0));
    // Reaching 4 lands the level-2 VP and the alliance VP.
    expect(s.players.p1.vp).toBe(2);
  });

  it('does not re-grant the reward for influence gained above the level', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'emperor', 4); // level-4 reward
    const solariAfter = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', 1); // 4 → 5: no further reward
    expect(s.players.p1.solari).toBe(solariAfter);
  });

  it('never claws a resource reward back on a downward crossing', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'emperor', 4); // +solari reward
    const solari = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', -1); // back to 3
    expect(s.players.p1.solari).toBe(solari); // resources stay; only VP is symmetric
  });

  it('re-grants when the level is genuinely re-crossed upward', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'emperor', 4);
    s = addInfluence(s, 'p1', 'emperor', -1); // drop below level 4
    const before = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', 1); // cross level 4 again
    const reward = IMP_FACTION_INFLUENCE_REWARDS.emperor[4]!;
    expect(s.players.p1.solari).toBe(before + (reward.solari ?? 0));
  });

  it('draws an intrigue card for the Bene Gesserit level-4 reward', () => {
    let s = makeImp();
    const before = s.hidden.p1.intrigue.length;
    s = addInfluence(s, 'p1', 'beneGesserit', 4);
    const reward = IMP_FACTION_INFLUENCE_REWARDS.beneGesserit[4]!;
    expect(s.hidden.p1.intrigue.length).toBe(before + (reward.intrigueCards ?? 0));
  });

  it('logs an influence.reward entry for each reward claimed', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'fremen', 4); // fires the single level-4 reward
    const rewardLogs = s.log.filter(
      (e) => e.event === 'influence.reward' && (e.data as { faction?: string })?.faction === 'fremen',
    );
    const configured = Object.keys(IMP_FACTION_INFLUENCE_REWARDS.fremen).length;
    expect(rewardLogs.length).toBe(configured);
  });
});
