import { describe, expect, it } from 'vitest';
import type { ImpGameState, PlayerId } from '../../imperium/types';
import { apply, makeImp, patch, setHand } from './helpers';

/**
 * The three leader signets the flat Gains DSL can't express, now enforced by the
 * engine via a pending decision (see `applySignetSpecial`):
 *  - Duke Leto: gain influence with a faction where an opponent leads.
 *  - Glossu Rabban: deploy up to 2 troops to the current conflict.
 *  - Helena Richese: trash an Imperium-Row card and refill the slot.
 *
 * Each is fired by placing the Signet Ring on a space. `secureContract` (CHOAM,
 * spiceTrade icon) is a clean host: it matches the ring's icon and its only
 * effect is +solari, so it never perturbs troops, influence, or the row.
 */

const SIGNET_SPACE = 'secureContract';

/** Seat p1 as `leaderId`, hand them only the Signet Ring; it's p1's turn at start. */
function armSignet(leaderId: string): { s: ImpGameState; card: string } {
  let s = makeImp(['A', 'B', 'C', 'D'], 3);
  s = patch(s, 'p1', { leaderId });
  s = setHand(s, 'p1', ['signetRing']);
  return { s, card: s.hidden.p1.hand[0] };
}

const setInfluence = (s: ImpGameState, pid: PlayerId, faction: string, value: number): ImpGameState =>
  patch(s, pid, { influence: { ...s.players[pid].influence, [faction]: value } });

describe('signet: Duke Leto — conditional influence', () => {
  it('auto-gains on the only track where an opponent leads', () => {
    let { s, card } = armSignet('dukeLeto');
    s = setInfluence(s, 'p2', 'emperor', 2); // only Emperor has an opponent ahead of p1
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: SIGNET_SPACE });
    // exactly one eligible faction → applied directly, no decision
    expect(s.pendingDecisions).toHaveLength(0);
    expect(s.players.p1.influence.emperor).toBe(1);
  });

  it('offers a choice when several tracks qualify', () => {
    let { s, card } = armSignet('dukeLeto');
    s = setInfluence(s, 'p2', 'emperor', 2);
    s = setInfluence(s, 'p3', 'fremen', 2);
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: SIGNET_SPACE });
    const d = s.pendingDecisions[0];
    expect(d?.kind).toBe('influence');
    expect(new Set(d.factions)).toEqual(new Set(['emperor', 'fremen']));
    s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: d.id, faction: 'fremen' });
    expect(s.players.p1.influence.fremen).toBe(1);
    expect(s.players.p1.influence.emperor).toBe(0);
  });

  it('does nothing when the player leads or ties every track', () => {
    let { s, card } = armSignet('dukeLeto'); // everyone starts at 0 influence
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: SIGNET_SPACE });
    expect(s.pendingDecisions).toHaveLength(0);
    for (const f of ['emperor', 'spacingGuild', 'beneGesserit', 'fremen'] as const) {
      expect(s.players.p1.influence[f]).toBe(0);
    }
  });
});

describe('signet: Glossu Rabban — deploy troops', () => {
  it('deploys the chosen number from the garrison to the conflict', () => {
    let { s, card } = armSignet('glossuRabban');
    s = patch(s, 'p1', { garrison: 3, inConflict: 0 });
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: SIGNET_SPACE });
    const d = s.pendingDecisions[0];
    expect(d?.kind).toBe('deploy');
    expect(d.amount).toBe(2); // capped at 2 even with 3 in the garrison
    s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: d.id, deployCount: 2 });
    expect(s.players.p1.inConflict).toBe(2);
    expect(s.players.p1.garrison).toBe(1);
  });

  it('may decline (deploy zero)', () => {
    let { s, card } = armSignet('glossuRabban');
    s = patch(s, 'p1', { garrison: 3, inConflict: 0 });
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: SIGNET_SPACE });
    const d = s.pendingDecisions[0];
    s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: d.id, deployCount: 0 });
    expect(s.players.p1.inConflict).toBe(0);
    expect(s.players.p1.garrison).toBe(3);
  });

  it('raises no decision with an empty garrison and no supply', () => {
    let { s, card } = armSignet('glossuRabban');
    s = patch(s, 'p1', { garrison: 0, supply: 0, inConflict: 0 });
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: SIGNET_SPACE });
    expect(s.pendingDecisions).toHaveLength(0);
    expect(s.players.p1.inConflict).toBe(0);
  });
});

describe('signet: Helena Richese — trash & refill an Imperium-Row card', () => {
  it('removes the chosen row card and refills the slot from the deck', () => {
    let { s, card } = armSignet('helenaRichese');
    const rowBefore = [...s.imperiumRow];
    const deckBefore = s.imperiumDeck.length;
    const target = rowBefore[0];
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: SIGNET_SPACE });
    const d = s.pendingDecisions[0];
    expect(d?.kind).toBe('rowTrash');
    expect(d.cardChoices).toEqual(rowBefore);
    s = apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: d.id, rowCardId: target });
    expect(s.imperiumRow).not.toContain(target);
    expect(s.imperiumRow).toHaveLength(rowBefore.length); // refilled
    expect(s.imperiumDeck).toHaveLength(deckBefore - 1);
  });

  it('rejects trashing a card that is not in the row', () => {
    let { s, card } = armSignet('helenaRichese');
    s = apply(s, { type: 'imp/playCard', playerId: 'p1', cardId: card, spaceId: SIGNET_SPACE });
    const d = s.pendingDecisions[0];
    expect(() =>
      apply(s, { type: 'imp/resolveDecision', playerId: 'p1', decisionId: d.id, rowCardId: 'not-a-real-card' }),
    ).toThrow();
  });
});
