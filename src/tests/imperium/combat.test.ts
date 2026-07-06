import { describe, expect, it } from 'vitest';
import { combatStrength, impValidate } from '../../imperium/engine/engine';
import { IMP_CONFLICT_DEFS } from '../../imperium/data/conflicts';
import type { ImpGameState } from '../../imperium/types';
import { apply, giveIntrigue, makeImp, patch, setHand } from './helpers';

/** Drive the combat intrigue window round to a given player. */
function toWindow(state: ImpGameState, pid: string): ImpGameState {
  let s = state;
  let guard = 0;
  while (s.phase === 'combat' && s.turn !== pid && guard++ < 10) {
    s = apply(s, { type: 'imp/combatPass', playerId: s.turn! });
  }
  return s;
}

/** Set up a round where both players have committed troops and revealed. */
function armedRound(troops: { p1: number; p2: number }, swords: { p1: number; p2: number }): ImpGameState {
  let s = makeImp();
  s = { ...s, currentConflict: 'skirmishA' }; // 1st: 1 VP, 2nd: 1 water, 3rd: 2 solari
  s = patch(s, 'p1', { inConflict: troops.p1 });
  s = patch(s, 'p2', { inConflict: troops.p2 });

  // both take reveal turns; then patch the sword totals for a controlled test
  s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
  s = patch(s, 'p1', { swords: swords.p1 });
  s = apply(s, { type: 'imp/endTurn', playerId: 'p1' });
  s = apply(s, { type: 'imp/reveal', playerId: 'p2' });
  s = patch(s, 'p2', { swords: swords.p2 });
  return apply(s, { type: 'imp/endTurn', playerId: 'p2' });
}

describe('combat', () => {
  it('computes strength as 2 per committed troop plus 1 per sword', () => {
    let s = makeImp();
    s = patch(s, 'p1', { inConflict: 3, swords: 2 });
    expect(combatStrength(s, 'p1')).toBe(8);
  });

  it('players without troops in the conflict do not participate', () => {
    let s = makeImp();
    s = patch(s, 'p1', { inConflict: 2 });
    // p2 never deploys → combat should auto-resolve without an intrigue window for p2
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
    s = apply(s, { type: 'imp/endTurn', playerId: 'p1' });
    s = apply(s, { type: 'imp/reveal', playerId: 'p2' });
    s = apply(s, { type: 'imp/endTurn', playerId: 'p2' });
    // single participant → resolved immediately, next round started
    expect(s.round).toBe(2);
    expect(s.log.some((e) => e.event === 'combat.reward' && (e.data as { pid: string }).pid === 'p1')).toBe(true);
  });

  it('awards first and second place rewards by strength', () => {
    let s = armedRound({ p1: 2, p2: 1 }, { p1: 0, p2: 0 }); // 4 vs 2
    expect(s.phase).toBe('combat');
    // both pass the intrigue window
    s = apply(s, { type: 'imp/combatPass', playerId: s.turn! });
    s = apply(s, { type: 'imp/combatPass', playerId: s.turn! });
    // resolved: p1 gets 1 VP, p2 gets 1 water
    expect(s.players.p1.vp).toBe(1);
    expect(s.players.p2.water).toBe(1 + 1);
    // committed troops are lost to the supply
    expect(s.players.p1.inConflict).toBe(0);
    expect(s.players.p2.inConflict).toBe(0);
    expect(s.round).toBe(2);
  });

  it('ties demote to the next-lower reward', () => {
    let s = armedRound({ p1: 2, p2: 2 }, { p1: 0, p2: 0 }); // 4 vs 4
    s = apply(s, { type: 'imp/combatPass', playerId: s.turn! });
    s = apply(s, { type: 'imp/combatPass', playerId: s.turn! });
    // nobody takes first: both take the second-place reward (1 water)
    expect(s.players.p1.vp).toBe(0);
    expect(s.players.p2.vp).toBe(0);
    expect(s.players.p1.water).toBe(2);
    expect(s.players.p2.water).toBe(2);
  });

  it('combat intrigue adds swords and reopens the response window', () => {
    let s = armedRound({ p1: 1, p2: 1 }, { p1: 0, p2: 0 });
    // hand p1 an ambush intrigue (+4 swords)
    const ambushId = Object.keys(s.intrigueById).find((i) => s.intrigueById[i].defId === 'ambush')!;
    s = {
      ...s,
      intrigueDeck: s.intrigueDeck.filter((i) => i !== ambushId),
      hidden: { ...s.hidden, p1: { ...s.hidden.p1, intrigue: [ambushId] } },
    };
    // whoever's window it is, drive to p1
    while (s.turn !== 'p1') s = apply(s, { type: 'imp/combatPass', playerId: s.turn! });
    s = apply(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: ambushId });
    expect(s.players.p1.swords).toBe(4);
    expect(s.phase).toBe('combat'); // window reopened for p2
    s = apply(s, { type: 'imp/combatPass', playerId: s.turn! });
    s = apply(s, { type: 'imp/combatPass', playerId: s.turn! });
    expect(s.players.p1.vp).toBe(1); // 6 vs 2
  });

  it('rejects combat intrigue from non-participants and outside combat', () => {
    let s = makeImp();
    const ambushId = Object.keys(s.intrigueById).find((i) => s.intrigueById[i].defId === 'ambush')!;
    s = {
      ...s,
      intrigueDeck: s.intrigueDeck.filter((i) => i !== ambushId),
      hidden: { ...s.hidden, p1: { ...s.hidden.p1, intrigue: [ambushId] } },
    };
    expect(impValidate(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: ambushId }).ok).toBe(false);
  });

  it('a deployTroops combat card reinforces the conflict from the garrison', () => {
    let s = armedRound({ p1: 1, p2: 1 }, { p1: 0, p2: 0 });
    s = giveIntrigue(s, 'p1', 'strategicPush'); // combat: deployTroops 1
    s = patch(s, 'p1', { garrison: 2, supply: 5 });
    s = toWindow(s, 'p1');
    const cardId = s.hidden.p1.intrigue.find((i) => s.intrigueById[i].defId === 'strategicPush')!;

    s = apply(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: cardId });
    expect(s.players.p1.inConflict).toBe(2); // reinforced 1 → 2
    expect(s.players.p1.garrison).toBe(1); // pulled from the garrison first
    expect(s.players.p1.supply).toBe(5); // supply untouched while the garrison had troops
    expect(s.phase).toBe('combat'); // a played combat card reopens the window
    expect(combatStrength(s, 'p1')).toBe(4);
  });

  it('a destroyTroops combat card needs a target and removes an opponent troop to supply', () => {
    let s = armedRound({ p1: 1, p2: 3 }, { p1: 0, p2: 0 }); // p1 loses on raw troops
    s = giveIntrigue(s, 'p1', 'guerrillaRaid'); // combat: destroyTroops 1
    s = toWindow(s, 'p1');
    const cardId = s.hidden.p1.intrigue.find((i) => s.intrigueById[i].defId === 'guerrillaRaid')!;

    // A targetless play is illegal.
    expect(impValidate(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: cardId })).toMatchObject({
      ok: false,
      code: 'target-required',
    });
    // As is targeting yourself.
    expect(
      impValidate(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: cardId, targetPlayerId: 'p1' }).ok,
    ).toBe(false);

    const p2SupplyBefore = s.players.p2.supply;
    s = apply(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: cardId, targetPlayerId: 'p2' });
    expect(s.players.p2.inConflict).toBe(2); // 3 → 2
    expect(s.players.p2.supply).toBe(p2SupplyBefore + 1); // returned to supply, not garrison
    expect(s.phase).toBe('combat');
  });

  it('removing an opponent’s last troop drops them out of the conflict', () => {
    let s = armedRound({ p1: 2, p2: 1 }, { p1: 0, p2: 0 });
    s = giveIntrigue(s, 'p1', 'guerrillaRaid');
    s = toWindow(s, 'p1');
    const cardId = s.hidden.p1.intrigue.find((i) => s.intrigueById[i].defId === 'guerrillaRaid')!;
    s = apply(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: cardId, targetPlayerId: 'p2' });
    expect(s.players.p2.inConflict).toBe(0);
    expect(combatStrength(s, 'p2')).toBe(0); // no troops → no strength
    // p1 is now the only combatant; passing resolves and p1 takes first place.
    s = toWindow(s, 'p1');
    s = apply(s, { type: 'imp/combatPass', playerId: 'p1' });
    expect(s.players.p1.vp).toBe(1);
  });

  it('control rewards persist and pay a bonus at the next round start', () => {
    let s = makeImp();
    s = { ...s, currentConflict: 'siegeOfArrakeen' };
    s = patch(s, 'p1', { inConflict: 2 });
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
    s = apply(s, { type: 'imp/endTurn', playerId: 'p1' });
    s = apply(s, { type: 'imp/reveal', playerId: 'p2' });
    s = apply(s, { type: 'imp/endTurn', playerId: 'p2' });
    // p1 won control of arrakeen; round 2 began and paid 1 solari
    expect(s.controlledBy.arrakeen).toBe('p1');
    expect(s.players.p1.controls).toContain('arrakeen');
    expect(s.round).toBe(2);
    // the round-2 control bonus for the city pays 1 solari
    expect(s.players.p1.solari).toBe(1);
  });
});
