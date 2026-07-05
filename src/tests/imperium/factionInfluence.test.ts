import { describe, expect, it } from 'vitest';
import { addInfluence } from '../../imperium/engine/effects';
import { IMP_FACTION_INFLUENCE_REWARDS } from '../../imperium/data/factions';
import { makeImp } from './helpers';

/**
 * Faction influence-track step rewards: reaching a level (upward crossing only)
 * grants that level's configured Gains once, on top of any VP/alliance the
 * level carries. Rewards are never clawed back on a downward crossing.
 *
 * These assertions read the current config values so they track edits made when
 * the owner VERIFIES the numbers; the mechanic — which levels fire and when — is
 * what's pinned here.
 */
describe('faction influence-track step rewards', () => {
  it('grants a level reward when first reaching it', () => {
    let s = makeImp();
    const solariBefore = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', 1); // reaches level 1
    const reward = IMP_FACTION_INFLUENCE_REWARDS.emperor[1]!;
    expect(s.players.p1.solari).toBe(solariBefore + (reward.solari ?? 0));
  });

  it('grants every level crossed in a single jump, once each', () => {
    let s = makeImp();
    const solariBefore = s.players.p1.solari;
    const garrisonBefore = s.players.p1.garrison;
    s = addInfluence(s, 'p1', 'emperor', 3); // crosses levels 1, 2, 3 at once
    const l1 = IMP_FACTION_INFLUENCE_REWARDS.emperor[1]!;
    const l3 = IMP_FACTION_INFLUENCE_REWARDS.emperor[3]!;
    expect(s.players.p1.solari).toBe(solariBefore + (l1.solari ?? 0));
    expect(s.players.p1.garrison).toBe(garrisonBefore + (l3.troops ?? 0));
    // The level-2 VP still lands alongside the resource rewards.
    expect(s.players.p1.vp).toBe(1);
  });

  it('does not re-grant a reward for influence gained above an already-passed level', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'emperor', 1); // reward at level 1
    const solariAfterL1 = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', 1); // 1 → 2: no level-1 reward, level 2 has none
    expect(s.players.p1.solari).toBe(solariAfterL1);
  });

  it('never claws a resource reward back on a downward crossing', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'emperor', 1); // +solari reward
    const solari = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', -1); // back to 0
    expect(s.players.p1.solari).toBe(solari); // resources stay; only VP is symmetric
  });

  it('re-grants when a level is genuinely re-crossed upward', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'emperor', 1);
    s = addInfluence(s, 'p1', 'emperor', -1); // drop below level 1
    const before = s.players.p1.solari;
    s = addInfluence(s, 'p1', 'emperor', 1); // cross level 1 again
    const reward = IMP_FACTION_INFLUENCE_REWARDS.emperor[1]!;
    expect(s.players.p1.solari).toBe(before + (reward.solari ?? 0));
  });

  it('draws an intrigue card for the Bene Gesserit level-1 reward', () => {
    let s = makeImp();
    const before = s.hidden.p1.intrigue.length;
    s = addInfluence(s, 'p1', 'beneGesserit', 1);
    const reward = IMP_FACTION_INFLUENCE_REWARDS.beneGesserit[1]!;
    expect(s.hidden.p1.intrigue.length).toBe(before + (reward.intrigueCards ?? 0));
  });

  it('logs an influence.reward entry for each reward claimed', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'fremen', 3); // fires the level-1 and level-3 rewards
    const rewardLogs = s.log.filter(
      (e) => e.event === 'influence.reward' && (e.data as { faction?: string })?.faction === 'fremen',
    );
    const configured = Object.keys(IMP_FACTION_INFLUENCE_REWARDS.fremen).filter((lvl) => Number(lvl) <= 3).length;
    expect(rewardLogs.length).toBe(configured);
  });
});
