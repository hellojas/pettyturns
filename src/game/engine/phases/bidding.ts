import { FACTIONS } from '../../data/factions';
import { TREACHERY_CARD_DEFS } from '../../data/treacheryCards';
import type {
  AllowedAction,
  BidAction,
  GameState,
  PlayerId,
  TurnAction,
  ValidationResult,
} from '../../types';
import { fail, ok } from '../../types';
import { appendLog, privateTo } from '../log';
import { getPlayer, getPlayerByFaction, stormOrder } from '../state';
import type { PhaseModule } from './module';

/**
 * Bidding phase (basic game).
 *
 * As many cards are put up for auction as there are players able to bid
 * (players at their hand limit are excluded). Cards are auctioned face down,
 * one at a time. The opening bidder rotates by one seat (in storm order) for
 * each successive card. Bidding proceeds around the table in storm order; each
 * player must raise or pass. When all but one have passed, the top bidder pays
 * their bid and takes the card. Payment goes to the imperial faction if it is
 * in the game, otherwise to the bank; the imperial faction pays the bank.
 * If every player passes on a card, the remaining cards return to the top of
 * the deck and the phase ends (VERIFY).
 *
 * Faction hooks implemented here:
 *  - prescience at auction: sees each card privately before bidding opens
 *  - auction income: receives other factions' payments
 *  - bonus card: an extra free card with each purchase (hand limit permitting)
 */

function eligibleBidders(state: GameState): PlayerId[] {
  return stormOrder(state).filter((p) => {
    const player = getPlayer(state, p);
    return state.hidden[p].hand.length < FACTIONS[player.factionId].handLimit;
  });
}

function cardName(state: GameState, cardId: string): string {
  return TREACHERY_CARD_DEFS[state.decks.treacheryById[cardId].defId].name;
}

function nextBidder(state: GameState, after: PlayerId): PlayerId | null {
  const bp = state.biddingPhase!;
  const order = stormOrder(state).filter((p) => eligibleBidders(state).includes(p));
  if (order.length === 0) return null;
  const start = order.indexOf(after);
  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(start + i) % order.length];
    if (!bp.passed.includes(candidate)) return candidate;
  }
  return null;
}

/** Announce the next card: private peek for the prescient faction, set opening bidder. */
function openCard(state: GameState): GameState {
  const bp = state.biddingPhase!;
  const cardId = bp.cardsOnAuction[bp.currentCardIndex];
  const order = eligibleBidders(state);
  if (!cardId || order.length === 0) return state;
  let next = state;

  const seer = Object.values(next.players).find((p) =>
    FACTIONS[p.factionId].powers.some((pw) => pw.id === 'bidding-prescience'),
  );
  if (seer) {
    next = appendLog(next, {
      event: 'bidding.peek',
      text: `You see the next card up for auction: ${cardName(next, cardId)}.`,
      data: { cardId },
      visibility: privateTo(seer.id),
    });
  }

  const opener = order[bp.firstBidderIndex % order.length];
  next = {
    ...next,
    biddingPhase: { ...next.biddingPhase!, currentBid: null, passed: [], turn: opener },
  };
  return appendLog(next, {
    event: 'bidding.cardUp',
    text: `Card ${bp.currentCardIndex + 1} of ${bp.cardsOnAuction.length} is up for auction. ${next.players[opener].name} opens the bidding.`,
    data: { index: bp.currentCardIndex, of: bp.cardsOnAuction.length },
  });
}

/** Award the current card to the top bidder and open the next one. */
function awardCard(state: GameState): GameState {
  const bp = state.biddingPhase!;
  const { playerId, amount } = bp.currentBid!;
  const cardId = bp.cardsOnAuction[bp.currentCardIndex];
  const buyer = getPlayer(state, playerId);
  let next = state;

  // payment: to the imperial faction unless the buyer is that faction
  const imperial = Object.values(next.players).find((p) =>
    FACTIONS[p.factionId].powers.some((pw) => pw.id === 'auction-income'),
  );
  const payee = imperial && imperial.id !== playerId ? imperial : null;
  next = {
    ...next,
    players: {
      ...next.players,
      [playerId]: { ...buyer, spice: buyer.spice - amount },
      ...(payee ? { [payee.id]: { ...next.players[payee.id], spice: next.players[payee.id].spice + amount } } : {}),
    },
  };

  // card to hand (identity private)
  next = {
    ...next,
    hidden: {
      ...next.hidden,
      [playerId]: {
        ...next.hidden[playerId],
        hand: [...next.hidden[playerId].hand, next.decks.treacheryById[cardId]],
      },
    },
  };
  next = appendLog(next, {
    event: 'bidding.won',
    text: `${buyer.name} won the card for ${amount} spice${payee ? ` (paid to ${next.players[payee.id].name})` : ''}.`,
    data: { playerId, amount },
  });
  next = appendLog(next, {
    event: 'bidding.cardIdentity',
    text: `You bought: ${cardName(next, cardId)}.`,
    data: { cardId },
    visibility: privateTo(playerId),
  });

  // bonus card power: one extra free card from the deck, hand limit permitting
  const bonus = FACTIONS[buyer.factionId].powers.find((pw) => pw.id === 'bonus-card');
  if (bonus && next.hidden[playerId].hand.length < FACTIONS[buyer.factionId].handLimit) {
    const [extraId, ...rest] = next.decks.treacheryDraw;
    if (extraId) {
      next = {
        ...next,
        decks: { ...next.decks, treacheryDraw: rest },
        hidden: {
          ...next.hidden,
          [playerId]: {
            ...next.hidden[playerId],
            hand: [...next.hidden[playerId].hand, next.decks.treacheryById[extraId]],
          },
        },
      };
      next = appendLog(next, {
        event: 'bidding.bonusCard',
        text: `${buyer.name} draws an extra card for free.`,
      });
    }
  }

  // advance to the next card
  const newIndex = bp.currentCardIndex + 1;
  next = {
    ...next,
    biddingPhase: {
      ...next.biddingPhase!,
      currentCardIndex: newIndex,
      currentBid: null,
      passed: [],
      turn: null,
      firstBidderIndex: bp.firstBidderIndex + 1,
    },
  };
  if (newIndex < bp.cardsOnAuction.length && eligibleBidders(next).length > 0) {
    next = openCard(next);
  } else {
    next = endAuction(next, newIndex);
  }
  return next;
}

/** Return unsold cards to the top of the deck and close the phase. */
function endAuction(state: GameState, fromIndex: number): GameState {
  const bp = state.biddingPhase!;
  const unsold = bp.cardsOnAuction.slice(fromIndex);
  let next: GameState = {
    ...state,
    decks: { ...state.decks, treacheryDraw: [...unsold, ...state.decks.treacheryDraw] },
    biddingPhase: { ...bp, cardsOnAuction: bp.cardsOnAuction.slice(0, fromIndex), turn: null, currentBid: null },
  };
  if (unsold.length > 0) {
    next = appendLog(next, {
      event: 'bidding.closed',
      text: `${unsold.length} unsold card(s) return to the top of the deck.`,
    });
  }
  return appendLog(next, { event: 'bidding.done', text: 'Bidding is over.' });
}

export const biddingPhase: PhaseModule = {
  phase: 'bidding',

  onEnter(state): GameState {
    const bidders = eligibleBidders(state);
    const count = Math.min(bidders.length, state.decks.treacheryDraw.length);
    const cardsOnAuction = state.decks.treacheryDraw.slice(0, count);
    let next: GameState = {
      ...state,
      decks: { ...state.decks, treacheryDraw: state.decks.treacheryDraw.slice(count) },
      biddingPhase: {
        cardsOnAuction,
        currentCardIndex: 0,
        currentBid: null,
        turn: null,
        passed: [],
        firstBidderIndex: 0,
      },
    };
    next = appendLog(next, {
      event: 'bidding.begin',
      text: `Bidding phase: ${count} card(s) up for auction.`,
      data: { count },
    });
    if (count > 0) next = openCard(next);
    return next;
  },

  getAllowedActions(state, playerId): AllowedAction[] {
    const bp = state.biddingPhase;
    if (!bp || bp.turn !== playerId) return [];
    const player = getPlayer(state, playerId);
    const minBid = (bp.currentBid?.amount ?? 0) + 1;
    const actions: AllowedAction[] = [];
    if (player.spice >= minBid)
      actions.push({ type: 'bidding/bid', label: 'Bid spice', params: { min: minBid, max: player.spice } });
    actions.push({ type: 'bidding/pass', label: 'Pass' });
    return actions;
  },

  validateAction(state, action): ValidationResult {
    const bp = state.biddingPhase;
    if (!bp) return fail('no-auction', 'No auction is in progress.');
    if (action.type !== 'bidding/bid' && action.type !== 'bidding/pass')
      return fail('wrong-phase', `Action ${action.type} is not part of bidding.`);
    if (bp.turn !== action.playerId) return fail('not-your-turn', 'It is not your turn to bid.');
    if (action.type === 'bidding/bid') {
      const a = action as BidAction;
      const player = getPlayer(state, a.playerId as PlayerId);
      const minBid = (bp.currentBid?.amount ?? 0) + 1;
      if (!Number.isInteger(a.amount) || a.amount < minBid)
        return fail('bid-too-low', `Bid must be at least ${minBid}.`);
      if (a.amount > player.spice) return fail('cannot-afford', 'You cannot bid more spice than you have.');
    }
    return ok();
  },

  applyAction(state, action): GameState {
    const playerId = action.playerId as PlayerId;
    const bp = state.biddingPhase!;
    let next = state;

    if (action.type === 'bidding/bid') {
      const a = action as BidAction;
      next = {
        ...next,
        biddingPhase: { ...bp, currentBid: { playerId, amount: a.amount } },
      };
      next = appendLog(next, {
        event: 'bidding.bid',
        text: `${getPlayer(state, playerId).name} bids ${a.amount}.`,
        data: { playerId, amount: a.amount },
        at: action.at,
      });
    } else {
      next = { ...next, biddingPhase: { ...bp, passed: [...bp.passed, playerId] } };
      next = appendLog(next, {
        event: 'bidding.pass',
        text: `${getPlayer(state, playerId).name} passes.`,
        at: action.at,
      });
    }

    const bp2 = next.biddingPhase!;
    const active = eligibleBidders(next).filter((p) => !bp2.passed.includes(p));

    // everyone passed with no bid: the whole auction ends (VERIFY)
    if (!bp2.currentBid && active.length === 0) {
      return endAuction(next, bp2.currentCardIndex);
    }
    // one player left holding the top bid: award
    if (bp2.currentBid && (active.length === 0 || (active.length === 1 && active[0] === bp2.currentBid.playerId))) {
      return awardCard(next);
    }
    // otherwise pass the turn along
    const turn = nextBidder(next, playerId);
    return { ...next, biddingPhase: { ...next.biddingPhase!, turn } };
  },

  isPhaseComplete(state): boolean {
    const bp = state.biddingPhase;
    if (!bp) return false;
    if (bp.cardsOnAuction.length === 0) return true;
    return bp.currentCardIndex >= bp.cardsOnAuction.length || bp.turn === null;
  },

  advancePhase(state): GameState {
    return { ...state, biddingPhase: null, phase: 'revival' };
  },
};
