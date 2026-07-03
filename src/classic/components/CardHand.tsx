import { TREACHERY_CARD_DEFS } from '../../game/data/treacheryCards';
import type { PublicGameState } from '../../game/types';

const CATEGORY_BADGE: Record<string, string> = {
  'weapon-projectile': 'text-red-300',
  'weapon-poison': 'text-emerald-300',
  'weapon-special': 'text-red-400',
  'defense-projectile': 'text-sky-300',
  'defense-poison': 'text-teal-300',
  special: 'text-amber-300',
  worthless: 'text-sand-100/40',
};

/** The viewer's own treachery hand. */
export default function CardHand({ view }: { view: PublicGameState }) {
  const hand = view.hidden.self?.hand ?? [];
  return (
    <div>
      <div className="text-sand-100/50 uppercase tracking-wide mb-1">Your hand ({hand.length})</div>
      {hand.length === 0 ? (
        <div className="text-sand-100/40 italic">Empty.</div>
      ) : (
        hand.map((card) => {
          const def = TREACHERY_CARD_DEFS[card.defId];
          return (
            <div key={card.id} className="flex justify-between gap-2">
              <span className="text-sand-200">{def.name}</span>
              <span className={CATEGORY_BADGE[def.category]}>{def.category}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
