import { CardBack } from './tokens';

/**
 * The player's physical draw + discard piles rendered as little card stacks, so
 * a mat reads like the components on the table rather than a bare count. The
 * draw pile is a face-down back; the discard is a dimmed, slightly-tilted back
 * (its cards sit face up in play, but a compact stack keeps the mat legible).
 * Counts are public information for every seat.
 */
export default function DeckPiles({ deckCount, discardCount }: { deckCount: number; discardCount: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex items-center gap-1">
        <CardBack count={deckCount} width={18} sigil="spiceTrade" title={`${deckCount} cards in draw deck`} />
        <span className="text-[8px] uppercase tracking-wide text-sand-100/40 leading-none">draw</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="-rotate-3 opacity-75">
          <CardBack count={discardCount} width={18} sigil="draw" title={`${discardCount} cards in discard`} />
        </span>
        <span className="text-[8px] uppercase tracking-wide text-sand-100/40 leading-none">discard</span>
      </span>
    </span>
  );
}
