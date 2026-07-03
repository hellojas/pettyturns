import { TREACHERY_CARD_DEFS } from '../../game/data/treacheryCards';
import { LEADERS } from '../../game/data/leaders';
import { FACTIONS } from '../../game/data/factions';
import type { PublicGameState } from '../../game/types';
import CardHand from './CardHand';

/** Everything only the seated player may see: hand, traitors, prediction. */
export default function PrivateInfoPanel({ view }: { view: PublicGameState }) {
  const self = view.hidden.self;
  if (!self) {
    return <div className="text-xs text-sand-100/40 italic">Spectators see no private information.</div>;
  }
  return (
    <div className="space-y-2 text-xs">
      <CardHand view={view} />
      <div>
        <div className="text-sand-100/50 uppercase tracking-wide mb-1">Traitors</div>
        {self.traitors.length === 0 ? (
          <div className="text-sand-100/40 italic">None kept yet.</div>
        ) : (
          self.traitors.map((t) => {
            const leader = LEADERS[t.leaderId];
            return (
              <div key={t.leaderId} className="text-sand-200">
                {leader.name} <span className="text-sand-100/40">({FACTIONS[leader.factionId].name}, {leader.strength})</span>
              </div>
            );
          })
        )}
      </div>
      {self.prediction && (
        <div>
          <div className="text-sand-100/50 uppercase tracking-wide mb-1">Sealed prediction</div>
          <div className="text-sand-200">
            {FACTIONS[self.prediction.factionId].name} wins on round {self.prediction.round}
          </div>
        </div>
      )}
    </div>
  );
}

export { TREACHERY_CARD_DEFS };
