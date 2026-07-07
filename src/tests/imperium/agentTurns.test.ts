import { describe, expect, it } from 'vitest';
import { impValidate } from '../../imperium/engine/engine';
import { IMP_FACTION_INFLUENCE_REWARDS } from '../../imperium/data/factions';
import { apply, makeImp, patch, setHand } from './helpers';

describe('agent turns', () => {
  it('requires a matching icon and an unoccupied space', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['dagger', 'reconnaissance', 'convincingArgument', 'diplomacy', 'desertHomeworld']);
    const dagger = s.hidden.p1.hand[0]; // landsraad icon

    // dagger cannot reach a city space
    expect(
      impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: dagger, spaceId: 'arrakeen' }).ok,
    ).toBe(false);
    // but can reach a landsraad space
    expect(
      impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: dagger, spaceId: 'rallyTroops' }).ok,
    ).toBe(false); // costs 4 solari, player has 0
    expect(
      impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: dagger, spaceId: 'hallOfOratory' }).ok,
    ).toBe(true);

    // occupied space refused
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: dagger, spaceId: 'hallOfOratory' });
    s = setHand(s, 'p2', ['dagger', 'reconnaissance', 'convincingArgument', 'diplomacy', 'desertHomeworld']);
    const dagger2 = s.hidden.p2.hand[0];
    expect(
      impValidate(s, { type: 'imp/playCard', playerId: 'p2', cardId: dagger2, spaceId: 'hallOfOratory' }).ok,
    ).toBe(false);
  });

  it('applies space costs and gains, and grants faction influence', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['diplomacy', 'dagger', 'convincingArgument', 'reconnaissance', 'desertHomeworld']);
    s = patch(s, 'p1', { water: 1 });
    const diplomacy = s.hidden.p1.hand[0];
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: diplomacy, spaceId: 'hardyWarriors' });
    const p1 = s.players.p1;
    // paid 1 water for the space; reaching fremen influence level 1 refunds the
    // level's step reward (currently +1 water — see data/factions.ts).
    expect(p1.water).toBe(0 + (IMP_FACTION_INFLUENCE_REWARDS.fremen[1]?.water ?? 0));
    expect(p1.garrison).toBe(3 + 2); // 2 troops recruited
    expect(p1.influence.fremen).toBe(1); // visit influence
    expect(p1.agentsLeft).toBe(1);
    expect(s.occupied.hardyWarriors).toBe('p1');
    expect(s.turn).toBe('p2'); // turn passed
  });

  it('enforces deployment limits on combat spaces', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['diplomacy', 'dagger', 'convincingArgument', 'reconnaissance', 'desertHomeworld']);
    const diplomacy = s.hidden.p1.hand[0];
    // hardy warriors recruits 2, but the deploy cap is a flat 2 — troops gained
    // this turn no longer raise the limit.
    const rejected = impValidate(s, {
      type: 'imp/playCard', playerId: 'p1', cardId: diplomacy, spaceId: 'hardyWarriors', deploy: 3,
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.code).toBe('deploy-limit');
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: diplomacy, spaceId: 'hardyWarriors', deploy: 2 });
    expect(s.players.p1.inConflict).toBe(2);
    expect(s.players.p1.garrison).toBe(3); // 3 + 2 recruited - 2 deployed
  });

  it('refuses deployment on non-combat spaces', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['dagger', 'diplomacy', 'convincingArgument', 'reconnaissance', 'desertHomeworld']);
    const dagger = s.hidden.p1.hand[0];
    expect(
      impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: dagger, spaceId: 'hallOfOratory', deploy: 1 }).ok,
    ).toBe(false);
  });

  it('sietch tabr requires fremen influence', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['reconnaissance', 'dagger', 'convincingArgument', 'diplomacy', 'desertHomeworld']);
    const recon = s.hidden.p1.hand[0];
    expect(
      impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: recon, spaceId: 'sietchTabr' }).ok,
    ).toBe(false);
    s = patch(s, 'p1', { influence: { ...s.players.p1.influence, fremen: 2 } });
    expect(
      impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: recon, spaceId: 'sietchTabr' }).ok,
    ).toBe(true);
  });

  it('maker spaces pay out accumulated bonus spice', () => {
    let s = makeImp();
    s = { ...s, makerBonus: { imperialBasin: 2 } };
    s = setHand(s, 'p1', ['desertHomeworld', 'dagger', 'convincingArgument', 'diplomacy', 'reconnaissance']);
    const dune = s.hidden.p1.hand[0];
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: dune, spaceId: 'imperialBasin' });
    expect(s.players.p1.spice).toBe(1 + 2); // base + bonus
    expect(s.makerBonus.imperialBasin).toBe(0);
  });

  it('the mentat grants an extra agent for the round', () => {
    let s = makeImp();
    s = patch(s, 'p1', { solari: 2 });
    s = setHand(s, 'p1', ['dagger', 'diplomacy', 'convincingArgument', 'reconnaissance', 'desertHomeworld']);
    const dagger = s.hidden.p1.hand[0];
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: dagger, spaceId: 'mentat' });
    expect(s.players.p1.agentsLeft).toBe(2); // spent 1, gained 1
    expect(s.players.p1.hasMentat).toBe(true);
    expect(s.players.p1.solari).toBe(0);
  });

  it('swordmaster and high council are once per game', () => {
    let s = makeImp();
    s = patch(s, 'p1', { solari: 20, hasSwordmaster: true, hasCouncilSeat: true });
    s = setHand(s, 'p1', ['dagger', 'diplomacy', 'convincingArgument', 'reconnaissance', 'desertHomeworld']);
    const dagger = s.hidden.p1.hand[0];
    expect(impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: dagger, spaceId: 'swordmaster' }).ok).toBe(false);
    expect(impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: dagger, spaceId: 'highCouncil' }).ok).toBe(false);
  });

  it('sell melange converts spice at configured rates', () => {
    let s = makeImp();
    s = patch(s, 'p1', { spice: 3 });
    s = setHand(s, 'p1', ['desertHomeworld', 'dagger', 'convincingArgument', 'diplomacy', 'reconnaissance']);
    const dune = s.hidden.p1.hand[0];
    expect(
      impValidate(s, { type: 'imp/playCard', playerId: 'p1', cardId: dune, spaceId: 'sellMelange', choices: { sellSpice: 4 } }).ok,
    ).toBe(false); // only has 3
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: dune, spaceId: 'sellMelange', choices: { sellSpice: 3 } });
    expect(s.players.p1.spice).toBe(0);
    expect(s.players.p1.solari).toBe(8);
  });

  it('a self-trashing card leaves the deck permanently', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['seekAllies', 'dagger', 'convincingArgument', 'diplomacy', 'reconnaissance']);
    const seekAllies = s.hidden.p1.hand[0];
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: seekAllies, spaceId: 'wealth' });
    expect(s.hidden.p1.trashed).toContain(seekAllies);
    expect(s.hidden.p1.inPlay).not.toContain(seekAllies);
  });
});
