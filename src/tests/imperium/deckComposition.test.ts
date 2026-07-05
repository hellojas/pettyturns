import { describe, expect, it } from 'vitest';
import {
  IMP_CARD_DEFS,
  IMPERIUM_DECK_DEFS,
  RESERVE_DEF_IDS,
  STARTING_DECK,
} from '../../imperium/data/cards';
import { IMP_INTRIGUE_DEFS, IMP_INTRIGUE_LIST } from '../../imperium/data/intrigue';
import { IMP_CONFLICT_LIST } from '../../imperium/data/conflicts';
import { CONTROL_SPACE_IDS } from '../../imperium/data/spaces';
import { IMP_CONSTANTS } from '../../imperium/data/constants';
import { IMP_FACTION_INFLUENCE_REWARDS } from '../../imperium/data/factions';
import { applyGains } from '../../imperium/engine/effects';
import { IMP_FACTIONS } from '../../imperium/types';
import type { Costs, Gains } from '../../imperium/types';
import { makeImp } from './helpers';

/**
 * Guard rail for the growing content pool: every card / intrigue / conflict def
 * must be structurally sound (valid references, sane counts) AND actually
 * interpretable by the effects engine without throwing. This lets the pool be
 * extended entry-by-entry with confidence that a typo or an unsupported field
 * fails loudly here rather than at runtime.
 */

const VALID_ICONS = new Set([...IMP_FACTIONS, 'landsraad', 'city', 'spiceTrade']);
const VALID_METRICS = new Set([
  'influence', 'controlSpaces', 'intrigueCards', 'alliances', 'spice', 'solari', 'water', 'troops',
]);
const FACTION_SET = new Set<string>(IMP_FACTIONS);
const CONTROL_SET = new Set(CONTROL_SPACE_IDS);

const isNonNegInt = (n: number) => Number.isInteger(n) && n >= 0;

function checkGainsReferences(gains: Gains | undefined, where: string): void {
  if (!gains) return;
  if (gains.influence) {
    for (const faction of Object.keys(gains.influence)) {
      expect(FACTION_SET.has(faction), `${where}: influence faction '${faction}'`).toBe(true);
    }
  }
  if (gains.control) {
    expect(CONTROL_SET.has(gains.control), `${where}: control space '${gains.control}'`).toBe(true);
  }
  if (gains.acquireReserveCard) {
    const def = IMP_CARD_DEFS[gains.acquireReserveCard];
    expect(def, `${where}: acquireReserveCard '${gains.acquireReserveCard}'`).toBeTruthy();
    expect(def.source, `${where}: acquireReserveCard must be a reserve def`).toBe('reserve');
  }
}

function checkCostsReferences(cost: Costs | undefined, where: string): void {
  if (!cost) return;
  if (cost.influenceRequired) {
    expect(
      FACTION_SET.has(cost.influenceRequired.faction),
      `${where}: influenceRequired faction '${cost.influenceRequired.faction}'`,
    ).toBe(true);
  }
}

describe('card pool composition', () => {
  it('each def id matches its key and declares a valid source', () => {
    for (const [key, def] of Object.entries(IMP_CARD_DEFS)) {
      expect(def.id, `key ${key}`).toBe(key);
      expect(['starting', 'reserve', 'imperium']).toContain(def.source);
    }
  });

  it('has sane costs, counts, and icons per source', () => {
    for (const def of Object.values(IMP_CARD_DEFS)) {
      expect(isNonNegInt(def.cost), `${def.id} cost`).toBe(true);
      expect(isNonNegInt(def.count), `${def.id} count`).toBe(true);
      for (const icon of def.icons) {
        expect(VALID_ICONS.has(icon), `${def.id} icon '${icon}'`).toBe(true);
      }
      // Only imperium cards populate the deck; starting/reserve are dealt/granted.
      if (def.source === 'imperium') {
        expect(def.count, `imperium ${def.id} needs count >= 1`).toBeGreaterThanOrEqual(1);
        expect(def.cost, `imperium ${def.id} needs a purchase cost`).toBeGreaterThanOrEqual(1);
      } else {
        expect(def.count, `${def.source} ${def.id} count must be 0`).toBe(0);
      }
      // A card with an agent-turn effect must be placeable (have at least one icon).
      if (def.agentGains || def.agentCost) {
        expect(def.icons.length, `${def.id} has an agent effect but no icon`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('has valid faction / control / reserve references on every card effect', () => {
    for (const def of Object.values(IMP_CARD_DEFS)) {
      checkGainsReferences(def.agentGains, `${def.id}.agentGains`);
      checkGainsReferences(def.revealGains, `${def.id}.revealGains`);
      checkGainsReferences(def.acquireGains, `${def.id}.acquireGains`);
      checkCostsReferences(def.agentCost, `${def.id}.agentCost`);
    }
  });

  it('starting deck and reserve lists reference real defs of the right source', () => {
    for (const { defId, copies } of STARTING_DECK) {
      const def = IMP_CARD_DEFS[defId];
      expect(def, `starting deck '${defId}'`).toBeTruthy();
      expect(def.source).toBe('starting');
      expect(copies).toBeGreaterThanOrEqual(1);
    }
    for (const defId of RESERVE_DEF_IDS) {
      const def = IMP_CARD_DEFS[defId];
      expect(def, `reserve '${defId}'`).toBeTruthy();
      expect(def.source).toBe('reserve');
    }
  });

  it('provides an imperium deck large enough to fill the row with headroom', () => {
    const totalInstances = IMPERIUM_DECK_DEFS.reduce((n, d) => n + d.count, 0);
    expect(totalInstances).toBeGreaterThan(IMP_CONSTANTS.imperiumRowSize);
  });
});

describe('intrigue pool composition', () => {
  it('each def id matches its key with a valid kind and count', () => {
    for (const [key, def] of Object.entries(IMP_INTRIGUE_DEFS)) {
      expect(def.id, `key ${key}`).toBe(key);
      expect(['plot', 'combat', 'endgame']).toContain(def.kind);
      expect(def.count, `${def.id} count`).toBeGreaterThanOrEqual(1);
      checkGainsReferences(def.gains, `${def.id}.gains`);
      checkCostsReferences(def.cost, `${def.id}.cost`);
    }
  });

  it('combat cards affect combat and endgame cards score VP', () => {
    for (const def of IMP_INTRIGUE_LIST) {
      if (def.kind === 'combat') {
        expect(
          (def.gains?.swords ?? 0) + (def.gains?.troops ?? 0),
          `${def.id} combat card should add swords or troops`,
        ).toBeGreaterThanOrEqual(1);
      }
      if (def.kind === 'endgame') {
        expect(def.gains?.vp ?? 0, `${def.id} endgame card should score VP`).toBeGreaterThanOrEqual(1);
      }
      // A condition only belongs on an endgame card, and its metric must be valid.
      if (def.endgameCondition) {
        expect(def.kind, `${def.id}: endgameCondition only on endgame cards`).toBe('endgame');
        const cond = def.endgameCondition;
        expect(VALID_METRICS.has(cond.metric), `${def.id}: metric '${cond.metric}'`).toBe(true);
        if (cond.metric === 'influence') {
          expect(cond.faction, `${def.id}: influence metric needs a faction`).toBeTruthy();
          expect(FACTION_SET.has(cond.faction!), `${def.id}: metric faction '${cond.faction}'`).toBe(true);
        }
        // Exactly one scoring shape (mostAmong / per / atLeast), or none (flat).
        const shapes = [cond.mostAmong ? 1 : 0, cond.per !== undefined ? 1 : 0, cond.atLeast !== undefined ? 1 : 0];
        expect(shapes.reduce((a, b) => a + b, 0), `${def.id}: one scoring shape`).toBeLessThanOrEqual(1);
        if (cond.per !== undefined) expect(cond.per, `${def.id}: per > 0`).toBeGreaterThan(0);
      }
    }
  });
});

describe('conflict pool composition', () => {
  it('each conflict has a valid tier and a full, ordered reward ladder', () => {
    for (const def of IMP_CONFLICT_LIST) {
      expect([1, 2, 3]).toContain(def.tier);
      const places = def.rewards.map((r) => r.place).sort();
      expect(places, `${def.id} reward places`).toEqual([1, 2, 3]);
      for (const reward of def.rewards) {
        checkGainsReferences(reward.gains, `${def.id} place ${reward.place}`);
      }
    }
  });

  it('has enough conflicts per tier to satisfy the configured mix', () => {
    const countTier = (tier: 1 | 2 | 3) => IMP_CONFLICT_LIST.filter((c) => c.tier === tier).length;
    expect(countTier(1)).toBeGreaterThanOrEqual(IMP_CONSTANTS.conflictMix.tier1);
    expect(countTier(2)).toBeGreaterThanOrEqual(IMP_CONSTANTS.conflictMix.tier2);
    expect(countTier(3)).toBeGreaterThanOrEqual(IMP_CONSTANTS.conflictMix.tier3);
  });
});

describe('faction influence-track rewards composition', () => {
  it('every reward sits on a valid track level and grants no influence', () => {
    for (const faction of IMP_FACTIONS) {
      const rewards = IMP_FACTION_INFLUENCE_REWARDS[faction];
      for (const [levelKey, gains] of Object.entries(rewards)) {
        const level = Number(levelKey);
        expect(Number.isInteger(level) && level >= 1 && level <= IMP_CONSTANTS.influenceMax,
          `${faction} reward level '${levelKey}'`).toBe(true);
        expect(gains, `${faction} L${level}: reward gains`).toBeTruthy();
        if (!gains) continue;
        // Awarding influence from inside an influence crossing would recurse.
        expect(gains.influence, `${faction} L${level}: reward must not grant influence`).toBeUndefined();
        expect(gains.anyInfluence, `${faction} L${level}: reward must not grant anyInfluence`).toBeUndefined();
        checkGainsReferences(gains, `${faction} influence reward L${level}`);
      }
    }
  });
});

describe('every effect is interpretable by the engine', () => {
  // A live game gives applyGains real players, decks and intrigue to act on.
  const base = makeImp(['A', 'B']);
  const pid = base.playerOrder[0];

  const run = (gains: Gains | undefined, where: string) => {
    it(`applies ${where} without throwing`, () => {
      expect(() => {
        // Choice-requiring effects enqueue a pending decision rather than
        // resolving inline; either way the interpreter must not throw.
        const result = applyGains(base, pid, gains);
        // engine state must stay JSON-serializable after any effect
        JSON.parse(JSON.stringify(result.state));
      }).not.toThrow();
    });
  };

  for (const def of Object.values(IMP_CARD_DEFS)) {
    if (def.agentGains) run(def.agentGains, `${def.id}.agentGains`);
    if (def.revealGains) run(def.revealGains, `${def.id}.revealGains`);
    if (def.acquireGains) run(def.acquireGains, `${def.id}.acquireGains`);
  }
  for (const def of IMP_INTRIGUE_LIST) {
    if (def.gains) run(def.gains, `intrigue ${def.id}`);
  }
  for (const def of IMP_CONFLICT_LIST) {
    for (const reward of def.rewards) run(reward.gains, `conflict ${def.id} place ${reward.place}`);
  }
});
