import { describe, expect, it } from 'vitest';
import { impAllowedActions, impValidate } from '../../imperium/engine/engine';
import { applyGains } from '../../imperium/engine/effects';
import { getVisibleImperiumState } from '../../imperium/engine/visibility';
import { IMP_CONSTANTS } from '../../imperium/data/constants';
import { apply, makeImp, patch } from './helpers';

/**
 * The choice-prompt (pending-decision) system. Effects that need a player choice
 * — `anyInfluence`, optional `trashCards`, Paul's deck peek — raise a pending
 * decision instead of auto-picking; the engine blocks until the owed player
 * resolves it, then resumes the parked flow.
 */
describe('pending decisions', () => {
  describe('influence choice', () => {
    it('raises a decision instead of auto-picking a track', () => {
      let s = makeImp();
      s = applyGains(s, 'p1', { anyInfluence: 2 }).state;
      const d = s.pendingDecisions[0];
      expect(d.kind).toBe('influence');
      expect(d.playerId).toBe('p1');
      expect(d.amount).toBe(2);
      // no influence is granted until the choice is made
      expect(s.players.p1.influence.emperor).toBe(0);
    });

    it('grants influence on the resolved track', () => {
      let s = makeImp();
      s = applyGains(s, 'p1', { anyInfluence: 2 }).state;
      const d = s.pendingDecisions[0];
      s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: d.id, faction: 'fremen' });
      expect(s.players.p1.influence.fremen).toBe(2);
      expect(s.pendingDecisions).toHaveLength(0);
    });

    it('rejects an unlisted faction when the decision restricts the options', () => {
      let s = makeImp();
      s = { ...s, pendingDecisions: [{ id: 'd0', playerId: 'p1', kind: 'influence', prompt: 'x', amount: 1, factions: ['emperor'] }] };
      expect(impValidate(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: 'd0', faction: 'fremen' }).ok).toBe(false);
      expect(impValidate(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: 'd0', faction: 'emperor' }).ok).toBe(true);
    });
  });

  describe('optional trash choice', () => {
    it('trashes the chosen card, or leaves the deck alone when declined', () => {
      let s = makeImp();
      const target = s.hidden.p1.hand[0];
      s = applyGains(s, 'p1', { trashCards: 1 }).state;
      expect(s.pendingDecisions[0].kind).toBe('trash');
      const id = s.pendingDecisions[0].id;

      const trashed = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: id, trashCardId: target });
      expect(trashed.hidden.p1.trashed).toContain(target);
      expect(trashed.hidden.p1.hand).not.toContain(target);

      const declined = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: id });
      expect(declined.hidden.p1.trashed).not.toContain(target);
      expect(declined.hidden.p1.hand).toContain(target);
    });

    it('rejects trashing a card the player does not hold', () => {
      let s = makeImp();
      s = applyGains(s, 'p1', { trashCards: 1 }).state;
      const id = s.pendingDecisions[0].id;
      expect(
        impValidate(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: id, trashCardId: 'nope#1' }).ok,
      ).toBe(false);
    });
  });

  describe('blocking and turn order', () => {
    it('a plot intrigue with anyInfluence blocks the turn until resolved', () => {
      let s = makeImp();
      const briberyId = Object.keys(s.intrigueById).find((i) => s.intrigueById[i].defId === 'bribery')!;
      s = {
        ...s,
        intrigueDeck: s.intrigueDeck.filter((i) => i !== briberyId),
        hidden: { ...s.hidden, p1: { ...s.hidden.p1, intrigue: [briberyId] } },
      };
      s = patch(s, 'p1', { solari: 2 });
      s = apply(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: briberyId });

      // decision owed to p1; still p1's turn
      expect(s.pendingDecisions[0].kind).toBe('influence');
      expect(s.turn).toBe('p1');

      // nobody may act except p1 resolving the front decision
      expect(impValidate(s, { type: 'imp/reveal', playerId: 'p1' }).ok).toBe(false);
      expect(impValidate(s, { type: 'imp/reveal', playerId: 'p2' }).ok).toBe(false);
      expect(impValidate(s, { type: 'imp/resolveDecision', playerId: 'p2', decisionId: s.pendingDecisions[0].id, faction: 'emperor' }).ok).toBe(false);

      // impAllowedActions surfaces the resolve only to the owed player
      expect(impAllowedActions(s, 'p1').map((a) => a.type)).toEqual(['imp/resolveDecision']);
      expect(impAllowedActions(s, 'p2')).toEqual([]);

      s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: s.pendingDecisions[0].id, faction: 'emperor' });
      expect(s.players.p1.influence.emperor).toBe(1);
      expect(s.turn).toBe('p1'); // plot intrigue does not end the turn
    });

    it('a card play does not pass to the next player until its decision resolves', () => {
      let s = makeImp();
      // stage an influence decision as if a just-played card raised it, mid-turn
      s = applyGains(s, 'p1', { anyInfluence: 1 }).state;
      s = { ...s, flowResume: { kind: 'afterPlayerTurn', pid: 'p1' } };
      expect(s.turn).toBe('p1');
      s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: s.pendingDecisions[0].id, faction: 'emperor' });
      // the parked afterPlayerTurn continuation now advances the turn
      expect(s.turn).toBe('p2');
    });
  });

  describe('combat rewards', () => {
    it('a combat reward influence is deferred and can still end the game that round', () => {
      let s = makeImp();
      s = { ...s, currentConflict: 'cloakAndDagger' }; // 1st place: 2 intrigue + anyInfluence 1
      s = patch(s, 'p1', { vp: IMP_CONSTANTS.vpTarget - 1, inConflict: 2, influence: { ...s.players.p1.influence, emperor: 1 } });

      // p1 is the sole participant; drive both players through their turns
      s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
      s = apply(s, { type: 'imp/endTurn', playerId: 'p1' });
      s = apply(s, { type: 'imp/reveal', playerId: 'p2' });
      s = apply(s, { type: 'imp/endTurn', playerId: 'p2' });

      // combat resolved its non-choice rewards but parked on the influence choice
      expect(s.pendingDecisions[0]?.kind).toBe('influence');
      expect(s.phase).toBe('combat');
      expect(s.round).toBe(1); // makers/recall have NOT run yet

      // resolving onto emperor crosses influence level 2 → +1 VP → hits the target
      // (the reward also handed p1 intrigue cards; any endgame one among them
      // scores at final scoring, so assert the target is met, not an exact total)
      s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: s.pendingDecisions[0].id, faction: 'emperor' });
      expect(s.players.p1.influence.emperor).toBe(2);
      expect(s.players.p1.vp).toBeGreaterThanOrEqual(IMP_CONSTANTS.vpTarget);
      expect(s.phase).toBe('finished');
      expect(s.winner).toBe('p1');
    });

    it('queues one decision per rewarded player, each owed to that player', () => {
      let s = makeImp();
      s = { ...s, currentConflict: 'contestOfInfluence' }; // 1st and 2nd both grant anyInfluence
      s = patch(s, 'p1', { inConflict: 3 });
      s = patch(s, 'p2', { inConflict: 1 });
      s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
      s = apply(s, { type: 'imp/endTurn', playerId: 'p1' });
      s = apply(s, { type: 'imp/reveal', playerId: 'p2' });
      s = apply(s, { type: 'imp/endTurn', playerId: 'p2' });
      // combat window then both pass
      while (s.phase === 'combat' && s.turn) s = apply(s, { type: 'imp/combatPass', playerId: s.turn });

      // p1 (stronger) is first in the FIFO queue, p2 second
      expect(s.pendingDecisions.map((d) => d.playerId)).toEqual(['p1', 'p2']);
      expect(s.round).toBe(1);

      s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: s.pendingDecisions[0].id, faction: 'emperor' });
      s = apply(s, { type: 'imp/resolveDecision', playerId: 'p2', decisionId: s.pendingDecisions[0].id, faction: 'fremen' });
      expect(s.players.p1.influence.emperor).toBe(1);
      expect(s.players.p2.influence.fremen).toBe(1);
      // both resolved → recall ran → round 2
      expect(s.round).toBe(2);
    });
  });

  describe('visibility', () => {
    it("hides another player's peeked card but shows the owner theirs", () => {
      let s = makeImp();
      s = patch(s, 'p1', { leaderId: 'paulAtreides' });
      s = apply(s, { type: 'imp/reveal', playerId: 'p1' });
      const top = s.hidden.p1.deck[0];

      const own = getVisibleImperiumState(s, 'p1');
      expect(own.pendingDecisions[0].cardId).toBe(top);

      const other = getVisibleImperiumState(s, 'p2');
      expect(other.pendingDecisions[0].cardId).toBeUndefined();
      expect(other.pendingDecisions[0].kind).toBe('deckPeek'); // existence is public
    });
  });
});
