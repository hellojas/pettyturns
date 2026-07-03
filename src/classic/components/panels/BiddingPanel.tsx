import { useState } from 'react';
import type { AllowedAction, PlayerId, PublicGameState } from '../../../game/types';
import { useGameStore } from '../../lib/store';

/** Auction status + bid/pass controls for the player whose turn it is. */
export default function BiddingPanel({
  view,
  allowed,
  viewingAs,
}: {
  view: PublicGameState;
  allowed: AllowedAction[];
  viewingAs: PlayerId;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const bp = view.biddingPhase;
  const bidAction = allowed.find((a) => a.type === 'bidding/bid');
  const passAction = allowed.find((a) => a.type === 'bidding/pass');
  const [amount, setAmount] = useState<number | ''>('');

  if (!bp) return null;
  return (
    <div className="text-sm space-y-2">
      <div className="font-semibold text-sand-300">
        Card {Math.min(bp.currentCardIndex + 1, bp.cardsOnAuction.length)} of {bp.cardsOnAuction.length}
      </div>
      <div className="text-xs text-sand-100/60">
        {bp.currentBid
          ? `Top bid: ${bp.currentBid.amount} by ${view.players[bp.currentBid.playerId].name}`
          : 'No bids yet.'}
        {bp.turn && <> — {view.players[bp.turn].name} to act.</>}
      </div>
      {(bidAction || passAction) && (
        <div className="flex gap-2 items-center">
          {bidAction && (
            <>
              <input
                type="number"
                className="input w-20"
                min={bidAction.params?.min as number}
                max={bidAction.params?.max as number}
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={`≥ ${bidAction.params?.min}`}
              />
              <button
                className="btn"
                disabled={amount === ''}
                onClick={() => dispatch({ type: 'bidding/bid', playerId: viewingAs, amount: Number(amount) })}
              >
                Bid
              </button>
            </>
          )}
          {passAction && (
            <button className="btn-secondary" onClick={() => dispatch({ type: 'bidding/pass', playerId: viewingAs })}>
              Pass
            </button>
          )}
        </div>
      )}
      {!bidAction && !passAction && (
        <div className="text-xs text-sand-100/50 italic">Not your turn to bid.</div>
      )}
    </div>
  );
}
