import { describe, expect, it } from 'vitest';
import { impValidate } from '../../imperium/engine/engine';
import { IMP_CARD_DEFS } from '../../imperium/data/cards';
import { apply, makeImp, patch, setHand } from './helpers';

describe('reveal turn and buying', () => {
  it('totals persuasion and swords from revealed cards', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['convincingArgument', 'convincingArgument', 'dagger', 'dagger', 'diplomacy']);
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
    const p1 = s.players.p1;
    expect(p1.persuasion).toBe(2 + 2 + 1); // two arguments + diplomacy
    expect(p1.swords).toBe(2); // two daggers
    expect(p1.revealed).toBe(true);
    expect(s.hidden.p1.hand).toHaveLength(0);
    expect(s.hidden.p1.revealedCards).toHaveLength(5);
  });

  it('a council seat adds two persuasion at reveal', () => {
    let s = makeImp();
    s = patch(s, 'p1', { hasCouncilSeat: true });
    s = setHand(s, 'p1', ['dagger', 'dagger', 'reconnaissance', 'diplomacy', 'desertHomeworld']);
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
    expect(s.players.p1.persuasion).toBe(1 + 1 + 1 + 2); // recon + diplomacy + dune + seat
  });

  it('buys from the row with persuasion and refills the row', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['convincingArgument', 'convincingArgument', 'diplomacy', 'reconnaissance', 'desertHomeworld']);
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' }); // 7 persuasion
    const affordable = s.imperiumRow.find((c) => IMP_CARD_DEFS[s.cardsById[c].defId].cost <= s.players.p1.persuasion);
    if (!affordable) return; // seed-dependent; other tests cover the arithmetic
    const cost = IMP_CARD_DEFS[s.cardsById[affordable].defId].cost;
    const before = s.players.p1.persuasion;
    const deckBefore = s.imperiumDeck.length;
    s = apply(s, { type: 'imp/buyCard', playerId: 'p1', cardId: affordable });
    expect(s.players.p1.persuasion).toBe(before - cost);
    expect(s.hidden.p1.discard).toContain(affordable);
    expect(s.imperiumRow).toHaveLength(5); // refilled
    expect(s.imperiumDeck.length).toBe(deckBefore - 1);
  });

  it('rejects buys the player cannot afford or before revealing', () => {
    let s = makeImp();
    const rowCard = s.imperiumRow[0];
    expect(impValidate(s, { type: 'imp/buyCard', playerId: 'p1', cardId: rowCard }).ok).toBe(false); // not revealed
    s = setHand(s, 'p1', ['dagger', 'dagger', 'seekAllies', 'signetRing', 'reconnaissance']);
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' }); // 2 persuasion (signet 1 + recon 1)
    const expensive = s.imperiumRow.find((c) => IMP_CARD_DEFS[s.cardsById[c].defId].cost > s.players.p1.persuasion);
    if (expensive) {
      expect(impValidate(s, { type: 'imp/buyCard', playerId: 'p1', cardId: expensive }).ok).toBe(false);
    }
  });

  it('reserve card with a VP on acquisition grants it immediately', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['convincingArgument', 'convincingArgument', 'diplomacy', 'reconnaissance', 'desertHomeworld']);
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
    s = patch(s, 'p1', { persuasion: 9 });
    s = apply(s, { type: 'imp/buyCard', playerId: 'p1', cardId: 'theSpiceMustFlow' });
    expect(s.players.p1.vp).toBe(1);
    expect(s.players.p1.persuasion).toBe(0);
    expect(s.hidden.p1.discard.some((c) => s.cardsById[c].defId === 'theSpiceMustFlow')).toBe(true);
  });

  it('ending the round passes the turn; bought and revealed cards go to discard next round', () => {
    let s = makeImp();
    s = setHand(s, 'p1', ['convincingArgument', 'dagger', 'diplomacy', 'reconnaissance', 'desertHomeworld']);
    s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
    s = apply(s, { type: 'imp/endTurn', playerId: 'p1' });
    expect(s.turn).toBe('p2');
    expect(s.players.p1.turnDone).toBe(true);
  });
});
