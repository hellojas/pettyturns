import { describe, expect, it } from 'vitest';
import { combatStrength } from '../../imperium/engine/engine';
import { apply, endRoundQuietly, makeImp, patch, setHand } from './helpers';

/**
 * Leader passives — data-driven abilities fired at named engine hooks
 * (combatStrength / onReveal / onAgentPlaced / onRoundStart). Values come from
 * data/leaders.ts, so these tests pin the hook wiring rather than the (VERIFY)
 * numbers.
 */
describe('leader passives', () => {
  describe('combatStrength hook (Rabban)', () => {
    it('adds fixed strength while committed to the conflict', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'glossuRabban', inConflict: 3, swords: 0 });
      // base 2×3 = 6, plus the +2 passive
      expect(combatStrength(s, 'p1')).toBe(8);
    });

    it('does not apply when the leader has no troops in the conflict', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'glossuRabban', inConflict: 0, swords: 1 });
      // only the sword counts; the passive stays dormant
      expect(combatStrength(s, 'p1')).toBe(1);
    });

    it('leaves a leader without a combatStrength passive unchanged', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'dukeLeto', inConflict: 3, swords: 0 });
      expect(combatStrength(s, 'p1')).toBe(6);
    });

    it('adds Paul a small flat strength while committed', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'paulAtreides', inConflict: 3, swords: 0 });
      // base 2×3 = 6, plus Paul's +1 desert-fighter passive
      expect(combatStrength(s, 'p1')).toBe(7);
    });
  });

  describe('onReveal hook (Duke Leto)', () => {
    it('grants solari on the reveal turn', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'dukeLeto', solari: 0 });
      s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
      // no starting card grants solari on reveal, so this is the passive alone
      expect(s.players.p1.solari).toBe(1);
      expect(s.log.some((e) => e.event === 'leader.passive')).toBe(true);
    });

    it('does not fire for a leader without an onReveal passive', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'glossuRabban', solari: 0 });
      s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
      expect(s.players.p1.solari).toBe(0);
      expect(s.pendingDecisions).toHaveLength(0);
    });
  });

  describe('onReveal deckPeek hook (Paul)', () => {
    it('raises a foresight decision to keep or discard the top of the deck', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'paulAtreides' });
      const topBefore = s.hidden.p1.deck[0];
      s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
      // reveal is blocked on a private deck-peek decision owned by p1
      const d = s.pendingDecisions[0];
      expect(d?.kind).toBe('deckPeek');
      expect(d?.playerId).toBe('p1');
      expect(d?.cardId).toBe(topBefore);

      // keeping leaves the deck untouched
      const kept = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: d.id, discardPeeked: false });
      expect(kept.hidden.p1.deck[0]).toBe(topBefore);
      expect(kept.pendingDecisions).toHaveLength(0);

      // setting aside moves it to the discard
      const set = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: d.id, discardPeeked: true });
      expect(set.hidden.p1.deck[0]).not.toBe(topBefore);
      expect(set.hidden.p1.discard).toContain(topBefore);
    });
  });

  describe('onAgentPlaced hook', () => {
    it('fires when Ariana sends an agent into the desert', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'arianaThorvald', spice: 0 });
      s = setHand(s, 'p1', ['desertHomeworld']);
      const card = s.hidden.p1.hand[0];
      s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: 'imperialBasin' });
      // imperialBasin grants 1 spice, the desert passive grants 1 more
      expect(s.players.p1.spice).toBe(2);
      expect(s.log.some((e) => e.event === 'leader.passive')).toBe(true);
    });

    it('does not fire when the space is outside the passive group', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'arianaThorvald', spice: 0, solari: 0 });
      s = setHand(s, 'p1', ['reconnaissance']);
      const card = s.hidden.p1.hand[0];
      // a city space, not a desert space
      s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: 'arrakeen' });
      expect(s.players.p1.spice).toBe(0);
    });

    it('fires when Memnon sends an agent to a Landsraad space', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'memnonThorvald', solari: 0 });
      s = setHand(s, 'p1', ['dagger']);
      const card = s.hidden.p1.hand[0];
      s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: 'hallOfOratory' });
      expect(s.players.p1.solari).toBe(1);
    });

    it('fires when Helena sends an agent to a city space', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'helenaRichese', solari: 0 });
      s = setHand(s, 'p1', ['reconnaissance']);
      const card = s.hidden.p1.hand[0];
      s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: 'arrakeen' });
      expect(s.players.p1.solari).toBe(1);
    });
  });

  describe('onRoundStart hook (Ilban)', () => {
    it('collects a bonus at the start of each round', () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'ilbanRichese', solari: 0 });
      s = patch(s, 'p2', { leaderId: 'paulAtreides', solari: 0 });
      s = endRoundQuietly(s);
      expect(s.round).toBe(2);
      // p1 collects the round-start bonus; p2 (no such passive) does not
      expect(s.players.p1.solari).toBe(1);
      expect(s.players.p2.solari).toBe(0);
    });
  });
});
