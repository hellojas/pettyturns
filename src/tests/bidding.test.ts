import { describe, expect, it } from 'vitest';
import { applyAction, validateAction } from '../game/engine/engine';
import type { GameState } from '../game/types';
import { makeGame, passAllBidding, playerByFaction, throughFirstStorm } from './helpers';

function toBidding(factions: Parameters<typeof makeGame>[0]): GameState {
  const state = throughFirstStorm(makeGame(factions), [3, 4]);
  if (state.phase !== 'bidding') throw new Error(`expected bidding, got ${state.phase}`);
  return state;
}

describe('bidding', () => {
  it('puts one card up per eligible bidder', () => {
    const state = toBidding(['atreides', 'harkonnen', 'emperor']);
    expect(state.biddingPhase?.cardsOnAuction).toHaveLength(3);
    expect(state.biddingPhase?.turn).not.toBeNull();
  });

  it('rejects out-of-turn bids, low bids, and bids beyond spice', () => {
    const state = toBidding(['atreides', 'harkonnen', 'emperor']);
    const turn = state.biddingPhase!.turn!;
    const other = state.playerOrder.find((p) => p !== turn)!;
    expect(validateAction(state, { type: 'bidding/bid', playerId: other, amount: 1 }).ok).toBe(false);
    expect(validateAction(state, { type: 'bidding/bid', playerId: turn, amount: 0 }).ok).toBe(false);
    expect(validateAction(state, { type: 'bidding/bid', playerId: turn, amount: 999 }).ok).toBe(false);
    expect(validateAction(state, { type: 'bidding/bid', playerId: turn, amount: 1 }).ok).toBe(true);

    const afterBid = applyAction(state, { type: 'bidding/bid', playerId: turn, amount: 3 });
    const nextTurn = afterBid.biddingPhase!.turn!;
    expect(validateAction(afterBid, { type: 'bidding/bid', playerId: nextTurn, amount: 3 }).ok).toBe(false);
    expect(validateAction(afterBid, { type: 'bidding/bid', playerId: nextTurn, amount: 4 }).ok).toBe(true);
  });

  it('awards the card to the last bidder standing and moves spice', () => {
    const state = toBidding(['atreides', 'harkonnen', 'emperor']);
    const bidder = state.biddingPhase!.turn!;
    const spiceBefore = state.players[bidder].spice;
    const handBefore = state.hidden[bidder].hand.length;

    let s = applyAction(state, { type: 'bidding/bid', playerId: bidder, amount: 2 });
    // everyone else passes
    while (s.biddingPhase!.currentBid?.playerId === bidder && s.biddingPhase!.turn !== null && s.biddingPhase!.turn !== bidder) {
      s = applyAction(s, { type: 'bidding/pass', playerId: s.biddingPhase!.turn! });
      if (s.biddingPhase!.currentCardIndex > 0) break; // card awarded
    }
    expect(s.players[bidder].spice).toBe(spiceBefore - 2);
    expect(s.hidden[bidder].hand.length).toBeGreaterThan(handBefore);
  });

  it('pays the imperial faction for other factions\' purchases', () => {
    let state = toBidding(['atreides', 'harkonnen', 'emperor']);
    const emperor = playerByFaction(state, 'emperor');
    // let the current turn player win the first card for 2 (skip if it's the imperial player)
    const bidder = state.biddingPhase!.turn!;
    const emperorSpiceBefore = state.players[emperor].spice;
    let s = applyAction(state, { type: 'bidding/bid', playerId: bidder, amount: 2 });
    while (s.biddingPhase!.currentCardIndex === 0 && s.biddingPhase!.turn) {
      s = applyAction(s, { type: 'bidding/pass', playerId: s.biddingPhase!.turn! });
    }
    if (bidder !== emperor) {
      expect(s.players[emperor].spice).toBe(emperorSpiceBefore + 2);
    } else {
      expect(s.players[emperor].spice).toBe(emperorSpiceBefore - 2);
    }
  });

  it('gives the bonus-card faction an extra card on purchase', () => {
    const state = toBidding(['atreides', 'harkonnen']);
    const hk = playerByFaction(state, 'harkonnen');
    let s = state;
    // drive turns until the bonus-card faction can win a card
    let guard = 0;
    while (s.phase === 'bidding' && s.biddingPhase?.turn && guard++ < 50) {
      const turn = s.biddingPhase.turn;
      if (turn === hk && !s.biddingPhase.currentBid) {
        const handBefore = s.hidden[hk].hand.length;
        s = applyAction(s, { type: 'bidding/bid', playerId: hk, amount: 1 });
        while (s.biddingPhase?.turn && s.biddingPhase.currentBid?.playerId === hk) {
          s = applyAction(s, { type: 'bidding/pass', playerId: s.biddingPhase.turn });
        }
        expect(s.hidden[hk].hand.length).toBe(handBefore + 2); // bought card + free bonus card
        return;
      }
      s = applyAction(s, { type: 'bidding/pass', playerId: turn });
    }
    throw new Error('bonus-card faction never got to buy');
  });

  it('ends the auction when everyone passes and returns cards to the deck', () => {
    const state = toBidding(['atreides', 'harkonnen', 'emperor']);
    const deckBefore = state.decks.treacheryDraw.length;
    const onAuction = state.biddingPhase!.cardsOnAuction.length;
    const s = passAllBidding(state);
    expect(s.phase).not.toBe('bidding');
    expect(s.decks.treacheryDraw.length).toBe(deckBefore + onAuction);
  });
});
