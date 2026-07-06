import { describe, expect, it } from 'vitest';
import { impApply, impValidate } from '../../imperium/engine/engine';
import { applyGains, trashOneCard } from '../../imperium/engine/effects';
import { getVisibleImperiumState } from '../../imperium/engine/visibility';
import { RESERVE_SUPPLY } from '../../imperium/data/cards';
import { apply, makeImp, patch } from './helpers';

/**
 * The Reserve is a set of limited stacks (rulebook components: 8 Arrakis
 * Liaison, 10 The Spice Must Flow, 6 Foldspace), not an infinite supply. A
 * depleted stack can no longer be acquired, and trashing a Reserve card returns
 * it to its stack rather than removing it from the game.
 */
describe('reserve supply', () => {
  it('a new game seeds the reserve stacks from the rulebook counts', () => {
    const s = makeImp();
    expect(s.reserveSupply.arrakisLiaison).toBe(8);
    expect(s.reserveSupply.theSpiceMustFlow).toBe(10);
    expect(s.reserveSupply.foldspace).toBe(6);
    expect(s.reserveSupply).toEqual(RESERVE_SUPPLY);
  });

  it('buying a reserve card decrements its stack and exhausts it after the last copy', () => {
    let s = makeImp();
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
    s = patch(s, 'p1', { persuasion: 200 });

    for (let i = 0; i < 10; i++) {
      s = apply(s, { type: 'imp/buyCard', playerId: 'p1', cardId: 'theSpiceMustFlow' });
    }
    expect(s.reserveSupply.theSpiceMustFlow).toBe(0);
    // The Spice Must Flow scores 1 VP each time it is acquired.
    expect(s.players.p1.vp).toBe(10);

    // The 11th purchase is illegal — the stack is empty.
    expect(
      impValidate(s, { type: 'imp/buyCard', playerId: 'p1', cardId: 'theSpiceMustFlow' }),
    ).toMatchObject({ ok: false, code: 'sold-out' });
  });

  it('a free grant (Foldspace board space) stops giving cards once the stack is empty', () => {
    let s = makeImp();
    const discardBefore = s.hidden.p1.discard.length;
    for (let i = 0; i < 6; i++) {
      s = applyGains(s, 'p1', { acquireReserveCard: 'foldspace' }).state;
    }
    expect(s.reserveSupply.foldspace).toBe(0);
    expect(s.hidden.p1.discard.length).toBe(discardBefore + 6);

    // Seventh grant: reserve empty → no card added.
    s = applyGains(s, 'p1', { acquireReserveCard: 'foldspace' }).state;
    expect(s.reserveSupply.foldspace).toBe(0);
    expect(s.hidden.p1.discard.length).toBe(discardBefore + 6);
    expect(s.log.some((e) => e.event === 'reserve.empty')).toBe(true);
  });

  it('trashing a reserve card returns it to its stack, not the game box', () => {
    let s = makeImp();
    s = applyGains(s, 'p1', { acquireReserveCard: 'arrakisLiaison' }).state;
    expect(s.reserveSupply.arrakisLiaison).toBe(7);
    const cardId = s.hidden.p1.discard.find((c) => s.cardsById[c].defId === 'arrakisLiaison')!;

    s = trashOneCard(s, 'p1', cardId);
    expect(s.reserveSupply.arrakisLiaison).toBe(8); // returned to the stack
    expect(s.hidden.p1.trashed).not.toContain(cardId);
    expect(s.hidden.p1.discard).not.toContain(cardId);
  });

  it('a self-trashing reserve card (Foldspace) returns to its stack when played', () => {
    let s = makeImp();
    s = applyGains(s, 'p1', { acquireReserveCard: 'foldspace' }).state;
    expect(s.reserveSupply.foldspace).toBe(5);
    const fid = s.hidden.p1.discard.find((c) => s.cardsById[c].defId === 'foldspace')!;
    // stage it into hand so it can be played as an agent
    s = {
      ...s,
      hidden: {
        ...s.hidden,
        p1: {
          ...s.hidden.p1,
          hand: [...s.hidden.p1.hand, fid],
          discard: s.hidden.p1.discard.filter((c) => c !== fid),
        },
      },
    };
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: fid, spaceId: 'wealth' });
    expect(s.reserveSupply.foldspace).toBe(6); // back on the stack, not in the trash
    expect(s.hidden.p1.trashed).not.toContain(fid);
    expect(s.hidden.p1.inPlay).not.toContain(fid);
  });

  it('trashing a non-reserve card still removes it from the game', () => {
    let s = makeImp();
    const before = s.reserveSupply.arrakisLiaison;
    const cardId = s.hidden.p1.hand[0];
    s = trashOneCard(s, 'p1', cardId);
    expect(s.hidden.p1.trashed).toContain(cardId);
    expect(s.reserveSupply.arrakisLiaison).toBe(before);
  });

  it('exposes the reserve stacks to every viewer (they sit face up)', () => {
    const s = impApply(makeImp(), { type: 'imp/reveal', playerId: 'p1' });
    const view = getVisibleImperiumState(s, 'p2');
    expect(view.reserveSupply.theSpiceMustFlow).toBe(10);
  });
});
