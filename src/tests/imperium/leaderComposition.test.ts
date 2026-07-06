import { describe, expect, it } from 'vitest';
import { IMP_LEADERS, IMP_LEADER_LIST } from '../../imperium/data/leaders';
import { IMP_SPACE_LIST } from '../../imperium/data/spaces';
import { applyGains } from '../../imperium/engine/effects';
import { IMP_FACTIONS } from '../../imperium/types';
import type { Gains, LeaderPassiveHook, SpaceGroup } from '../../imperium/types';
import { makeImp } from './helpers';

/**
 * Guard rail for the growing leader pool: every leader's signet and passives
 * must be structurally sound (valid hook, params consistent with that hook,
 * real space groups) AND every gains payload must be interpretable by the
 * effects engine without throwing. Deepening a leader is then a data-only edit
 * that fails loudly here if a hook/param is mismatched.
 */

const VALID_HOOKS = new Set<LeaderPassiveHook>([
  'onReveal', 'onAgentPlaced', 'combatStrength', 'onRoundStart', 'onAcquireCard', 'onCombatWin',
]);
// Hooks that grant `params.gains` (combatStrength uses `strength`; deckPeek is special).
const GAINS_HOOKS = new Set<LeaderPassiveHook>([
  'onReveal', 'onAgentPlaced', 'onRoundStart', 'onAcquireCard', 'onCombatWin',
]);
const VALID_GROUPS = new Set<SpaceGroup>([
  ...IMP_FACTIONS, 'landsraad', 'choam', 'city', 'desert',
]);
const GROUPS_IN_PLAY = new Set(IMP_SPACE_LIST.map((s) => s.group));

describe('leader pool composition', () => {
  it('each leader def id matches its key and carries a signet', () => {
    for (const [key, def] of Object.entries(IMP_LEADERS)) {
      expect(def.id, `key ${key}`).toBe(key);
      expect(def.name, `${key} name`).toBeTruthy();
      expect(def.signetGains, `${key} signetGains`).toBeTruthy();
    }
  });

  it('every passive uses a real hook with params consistent with that hook', () => {
    for (const leader of IMP_LEADER_LIST) {
      for (const p of leader.passives ?? []) {
        const where = `${leader.id}/${p.id}`;
        expect(p.id, `${where}: id`).toBeTruthy();
        expect(p.summary, `${where}: summary`).toBeTruthy();
        expect(VALID_HOOKS.has(p.hook), `${where}: hook '${p.hook}'`).toBe(true);

        // group only means anything on onAgentPlaced, and must be a real group.
        if (p.params?.group) {
          expect(p.hook, `${where}: group only on onAgentPlaced`).toBe('onAgentPlaced');
          expect(VALID_GROUPS.has(p.params.group), `${where}: group '${p.params.group}'`).toBe(true);
          expect(GROUPS_IN_PLAY.has(p.params.group), `${where}: group '${p.params.group}' has no board space`).toBe(true);
        }
        // combatStrength contributes flat strength, not gains.
        if (p.hook === 'combatStrength') {
          expect(p.params?.strength, `${where}: combatStrength needs strength`).toBeGreaterThanOrEqual(1);
        }
        // A non-special gains hook should actually grant something.
        if (GAINS_HOOKS.has(p.hook) && !p.params?.deckPeek) {
          expect(p.params?.gains, `${where}: ${p.hook} should grant gains`).toBeTruthy();
        }
      }
    }
  });

  it('passive ids are unique within each leader', () => {
    for (const leader of IMP_LEADER_LIST) {
      const ids = (leader.passives ?? []).map((p) => p.id);
      expect(new Set(ids).size, `${leader.id}: duplicate passive id`).toBe(ids.length);
    }
  });

  it('every signet and passive gains payload is interpretable by the engine', () => {
    const base = makeImp(['A', 'B']);
    const pid = base.playerOrder[0];
    const run = (gains: Gains | undefined, where: string) => {
      expect(() => {
        const result = applyGains(base, pid, gains);
        JSON.parse(JSON.stringify(result.state));
      }, where).not.toThrow();
    };
    for (const leader of IMP_LEADER_LIST) {
      run(leader.signetGains, `${leader.id}.signetGains`);
      for (const p of leader.passives ?? []) {
        if (p.params?.gains) run(p.params.gains, `${leader.id}/${p.id}.gains`);
      }
    }
  });
});
