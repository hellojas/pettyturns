import { describe, expect, it } from 'vitest';
import { applyAction } from '../game/engine/engine';
import { battlePhase } from '../game/engine/phases/battle';
import { resolveBattle, type CombatantContext } from '../game/engine/combat/resolveBattle';
import { validateBattlePlan } from '../game/engine/combat/planLegality';
import type { BattlePlan, GameState, PendingBattle } from '../game/types';
import { makeGame, completeSetup, playerByFaction } from './helpers';

function basePlan(overrides: Partial<BattlePlan>): BattlePlan {
  return {
    playerId: 'px',
    leaderId: null,
    cheapHeroCardId: null,
    dial: 0,
    weaponCardId: null,
    defenseCardId: null,
    spiceSupport: 0,
    extras: {},
    ...overrides,
  };
}

function combatant(overrides: Partial<CombatantContext>): CombatantContext {
  return {
    playerId: 'px',
    plan: basePlan({}),
    forcesInTerritory: 5,
    traitorLeaderIds: [],
    callsTraitor: false,
    ...overrides,
  };
}

const dummyBattle: PendingBattle = {
  id: 'battle:test',
  territoryId: 'red_chasm',
  aggressor: 'p1',
  defender: 'p2',
  plans: {},
  preBattleSteps: [],
  resolved: false,
};

/** A state with contested territory: both factions have forces in red chasm. */
function contested(): GameState {
  let s = completeSetup(makeGame(['atreides', 'harkonnen']));
  s = {
    ...s,
    stacks: [
      ...s.stacks,
      { factionId: 'atreides', territoryId: 'red_chasm', sector: 6, forces: 6, specialForces: 0 },
      { factionId: 'harkonnen', territoryId: 'red_chasm', sector: 6, forces: 4, specialForces: 0 },
    ],
    phase: 'battle',
  };
  return battlePhase.onEnter!(s);
}

describe('battle resolution (pure)', () => {
  it('higher total (dial + leader strength) wins; loser loses everything, winner loses the dial', () => {
    const state = contested();
    const a = combatant({
      playerId: 'p1',
      plan: basePlan({ playerId: 'p1', leaderId: 'at_thufir', dial: 3 }), // 3 + 5 = 8
      forcesInTerritory: 6,
    });
    const b = combatant({
      playerId: 'p2',
      plan: basePlan({ playerId: 'p2', leaderId: 'hk_umman', dial: 4 }), // 4 + 1 = 5
      forcesInTerritory: 4,
    });
    const outcome = resolveBattle(state, dummyBattle, a, b);
    expect(outcome.winner).toBe('p1');
    expect(outcome.forcesLost['p1']).toBe(3);
    expect(outcome.forcesLost['p2']).toBe(4);
    expect(outcome.leadersKilled).toHaveLength(0);
  });

  it('the aggressor wins ties', () => {
    const state = contested();
    const a = combatant({ playerId: 'p1', plan: basePlan({ playerId: 'p1', leaderId: 'at_duncan', dial: 3 }) }); // 5
    const b = combatant({ playerId: 'p2', plan: basePlan({ playerId: 'p2', leaderId: 'hk_piter', dial: 2 }) }); // 5
    const outcome = resolveBattle(state, dummyBattle, a, b);
    expect(outcome.winner).toBe('p1');
  });

  it('a projectile weapon kills the leader unless a projectile defense is played', () => {
    const state = contested();
    const weaponId = state.decks.treacheryDraw.find((id) => id.startsWith('crysknife'))!;
    const shieldId = state.decks.treacheryDraw.find((id) => id.startsWith('shield'))!;

    const attack = combatant({
      playerId: 'p1',
      plan: basePlan({ playerId: 'p1', leaderId: 'at_thufir', dial: 0, weaponCardId: weaponId }),
    });
    const undefended = combatant({
      playerId: 'p2',
      plan: basePlan({ playerId: 'p2', leaderId: 'hk_feyd', dial: 2 }),
    });
    const out1 = resolveBattle(state, dummyBattle, attack, undefended);
    expect(out1.leadersKilled).toEqual([{ leaderId: 'hk_feyd', owner: 'p2' }]);
    expect(out1.winner).toBe('p1'); // 0+5 vs 2+0
    expect(out1.spiceForLeaders['p1']).toBe(6); // slain leader strength from the bank

    const defended = combatant({
      playerId: 'p2',
      plan: basePlan({ playerId: 'p2', leaderId: 'hk_feyd', dial: 2, defenseCardId: shieldId }),
    });
    const out2 = resolveBattle(state, dummyBattle, attack, defended);
    expect(out2.leadersKilled).toHaveLength(0);
    expect(out2.winner).toBe('p2'); // 5 vs 8
  });

  it('a poison defense does not stop a projectile weapon', () => {
    const state = contested();
    const weaponId = state.decks.treacheryDraw.find((id) => id.startsWith('crysknife'))!;
    const snooperId = state.decks.treacheryDraw.find((id) => id.startsWith('snooper'))!;
    const attack = combatant({
      playerId: 'p1',
      plan: basePlan({ playerId: 'p1', leaderId: 'at_thufir', dial: 0, weaponCardId: weaponId }),
    });
    const wrongDefense = combatant({
      playerId: 'p2',
      plan: basePlan({ playerId: 'p2', leaderId: 'hk_feyd', dial: 2, defenseCardId: snooperId }),
    });
    const out = resolveBattle(state, dummyBattle, attack, wrongDefense);
    expect(out.leadersKilled).toEqual([{ leaderId: 'hk_feyd', owner: 'p2' }]);
  });

  it('the beam weapon meeting a shield annihilates both sides', () => {
    const state = contested();
    const lasgunId = state.decks.treacheryDraw.find((id) => id.startsWith('lasgun'))!;
    const shieldId = state.decks.treacheryDraw.find((id) => id.startsWith('shield'))!;
    const a = combatant({
      playerId: 'p1',
      plan: basePlan({ playerId: 'p1', leaderId: 'at_thufir', dial: 5, weaponCardId: lasgunId }),
      forcesInTerritory: 6,
    });
    const b = combatant({
      playerId: 'p2',
      plan: basePlan({ playerId: 'p2', leaderId: 'hk_feyd', dial: 4, defenseCardId: shieldId }),
      forcesInTerritory: 4,
    });
    const out = resolveBattle(state, dummyBattle, a, b);
    expect(out.lasgunExplosion).toBe(true);
    expect(out.winner).toBeNull();
    expect(out.forcesLost).toEqual({ p1: 6, p2: 4 });
    expect(out.leadersKilled).toHaveLength(2);
    expect(out.spiceForLeaders).toEqual({});
  });

  it('a called traitor forfeits the battle: caller loses nothing and collects the strength', () => {
    const state = contested();
    const a = combatant({
      playerId: 'p1',
      plan: basePlan({ playerId: 'p1', leaderId: 'at_duncan', dial: 1 }),
      traitorLeaderIds: ['hk_feyd'],
      callsTraitor: true,
      forcesInTerritory: 6,
    });
    const b = combatant({
      playerId: 'p2',
      plan: basePlan({ playerId: 'p2', leaderId: 'hk_feyd', dial: 4 }),
      forcesInTerritory: 4,
    });
    const out = resolveBattle(state, dummyBattle, a, b);
    expect(out.traitorCalled).toEqual({ by: 'p1', leaderId: 'hk_feyd' });
    expect(out.winner).toBe('p1');
    expect(out.forcesLost['p1']).toBe(0);
    expect(out.forcesLost['p2']).toBe(4);
    expect(out.spiceForLeaders['p1']).toBe(6);
  });
});

describe('battle plan legality', () => {
  it('rejects dialing more forces than are present', () => {
    const state = contested();
    const battle = state.battlePhase!.battles[0];
    const verdict = validateBattlePlan(state, battle, battle.aggressor, {
      leaderId: state.players[battle.aggressor].leadersAlive[0],
      cheapHeroCardId: null,
      dial: 99,
      weaponCardId: null,
      defenseCardId: null,
      spiceSupport: 0,
      extras: {},
    });
    expect(verdict.ok).toBe(false);
  });

  it('requires a leader when one is available and rejects cards not in hand', () => {
    const state = contested();
    const battle = state.battlePhase!.battles[0];
    const noLeader = validateBattlePlan(state, battle, battle.aggressor, {
      leaderId: null,
      cheapHeroCardId: null,
      dial: 1,
      weaponCardId: null,
      defenseCardId: null,
      spiceSupport: 0,
      extras: {},
    });
    expect(noLeader.ok).toBe(false);

    const notInHand = validateBattlePlan(state, battle, battle.aggressor, {
      leaderId: state.players[battle.aggressor].leadersAlive[0],
      cheapHeroCardId: null,
      dial: 1,
      weaponCardId: 'crysknife#1',
      defenseCardId: null,
      spiceSupport: 0,
      extras: {},
    });
    // the card is in the draw pile, not the player's hand
    expect(notInHand.ok).toBe(false);
  });
});

describe('battle phase flow (hidden commitment)', () => {
  it('detects contested territories and resolves after both secret plans arrive', () => {
    let s = contested();
    expect(s.battlePhase!.battles).toHaveLength(1);
    const battle = s.battlePhase!.battles[0];
    const aggressor = battle.aggressor;
    const defender = battle.defender;

    s = applyAction(s, {
      type: 'battle/submitPlan',
      playerId: aggressor,
      battleId: battle.id,
      plan: {
        leaderId: s.players[aggressor].leadersAlive[0],
        cheapHeroCardId: null,
        dial: 2,
        weaponCardId: null,
        defenseCardId: null,
        spiceSupport: 0,
        extras: {},
      },
    });
    // still waiting on the defender: no resolution yet
    expect(s.battlePhase!.battles[0].resolved).toBe(false);

    s = applyAction(s, {
      type: 'battle/submitPlan',
      playerId: defender,
      battleId: battle.id,
      plan: {
        leaderId: s.players[defender].leadersAlive[0],
        cheapHeroCardId: null,
        dial: 1,
        weaponCardId: null,
        defenseCardId: null,
        spiceSupport: 0,
        extras: {},
      },
    });

    // resolution may pause for a traitor call; answer any pending calls with "no"
    const pending = s.pendingDecisions.find((d) => d.kind === 'traitorCall');
    if (pending) {
      for (const pid of pending.waitingFor) {
        s = applyAction(s, { type: 'battle/callTraitor', playerId: pid, battleId: battle.id, call: false });
      }
    }

    expect(s.log.some((e) => e.event === 'battle.resolved')).toBe(true);
    // the phase auto-advanced once every battle resolved
    expect(s.phase).not.toBe('battle');
    // exactly one faction remains in the territory
    const remaining = new Set(
      s.stacks.filter((st) => st.territoryId === 'red_chasm').map((st) => st.factionId),
    );
    expect(remaining.size).toBeLessThanOrEqual(1);
  });
});
