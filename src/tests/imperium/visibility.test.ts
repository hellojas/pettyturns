import { describe, expect, it } from 'vitest';
import { getVisibleImperiumState } from '../../imperium/engine/visibility';
import { impLog, impPrivate } from '../../imperium/engine/log';
import { makeImp } from './helpers';

describe('imperium hidden information', () => {
  it('shows own hand and intrigue; opponents reduced to counts', () => {
    const s = makeImp();
    const view = getVisibleImperiumState(s, 'p1');
    expect(view.hidden.self?.hand).toEqual(s.hidden.p1.hand);
    expect(view.hidden.others.p2.handCount).toBe(s.hidden.p2.hand.length);
    expect((view.hidden.others.p2 as Record<string, unknown>).hand).toBeUndefined();
    expect((view.hidden.others.p2 as Record<string, unknown>).intrigue).toBeUndefined();
  });

  it('never exposes deck order — only counts', () => {
    const s = makeImp();
    const view = getVisibleImperiumState(s, 'p1');
    expect((view.hidden.self as unknown as Record<string, unknown>).deck).toBeUndefined();
    expect(view.hidden.self?.deckCount).toBe(s.hidden.p1.deck.length);
    expect((view as unknown as Record<string, unknown>).imperiumDeck).toBeUndefined();
    expect(view.imperiumDeckCount).toBe(s.imperiumDeck.length);
    expect(view.rng.seed).toBe(0);
  });

  it('filters private log entries per viewer', () => {
    let s = makeImp();
    s = impLog(s, { event: 'test.secret', text: 'p1 only', visibility: impPrivate('p1') });
    expect(getVisibleImperiumState(s, 'p1').log.some((e) => e.event === 'test.secret')).toBe(true);
    expect(getVisibleImperiumState(s, 'p2').log.some((e) => e.event === 'test.secret')).toBe(false);
    expect(getVisibleImperiumState(s, 'SPECTATOR').log.some((e) => e.event === 'test.secret')).toBe(false);
  });

  it('no zone visible to an opponent contains hidden hand card ids', () => {
    const s = makeImp();
    const view = getVisibleImperiumState(s, 'p2');
    // the card-identity registry is public (it lists every instance in the game
    // without zone information); strip it and verify no *zone* leaks hand ids
    const { cardsById, ...zones } = view;
    const json = JSON.stringify(zones);
    for (const cardId of s.hidden.p1.hand) {
      expect(json.includes(`"${cardId}"`)).toBe(false);
    }
  });
});
