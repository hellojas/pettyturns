import { IMP_CARD_DEFS } from '../imperium/data/cards';
import { IMP_FACTIONS, type ImpVisibleState, type PlayerId } from '../imperium/types';
import { useImpStore } from '../lib/impStore';
import { CardRef } from './imp/CardDetail';

const FACTION_LABEL: Record<string, string> = {
  emperor: 'Emperor',
  spacingGuild: 'Spacing Guild',
  beneGesserit: 'Bene Gesserit',
  fremen: 'Fremen',
};

/**
 * The choice-prompt panel. When the engine is blocked on a pending decision
 * owed by the seated player, this renders the options and dispatches an
 * `imp/resolveDecision`. Other players just see that play is waiting on someone.
 */
export default function ImpDecision({ view, viewingAs }: { view: ImpVisibleState; viewingAs: PlayerId | 'SPECTATOR' }) {
  const dispatch = useImpStore((s) => s.dispatch);
  const self = view.hidden.self;
  const decision = view.pendingDecisions[0];
  if (!decision) return null;

  const owner = view.players[decision.playerId];
  const mine = decision.playerId === viewingAs;

  if (!mine) {
    return (
      <div className="rounded border border-amber-700/60 bg-amber-950/20 p-2 text-xs text-sand-200">
        Waiting on {owner.name} to make a choice…
      </div>
    );
  }

  const resolve = (extra: Record<string, unknown>) =>
    dispatch({ type: 'imp/resolveDecision', playerId: decision.playerId, decisionId: decision.id, ...extra });

  return (
    <div className="rounded border border-amber-500 bg-amber-950/30 p-2 space-y-2 text-xs">
      <div className="text-sand-100">{decision.prompt}</div>

      {decision.kind === 'influence' && (
        <div className="flex flex-wrap gap-1.5">
          {(decision.factions ?? IMP_FACTIONS).map((f) => (
            <button key={f} className="btn !py-0.5" onClick={() => resolve({ faction: f })}>
              {FACTION_LABEL[f] ?? f}
            </button>
          ))}
        </div>
      )}

      {decision.kind === 'trash' && self && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            {[...self.hand, ...self.discard].map((cardId, i) => (
              <button
                key={`${cardId}-${i}`}
                className="btn-secondary !py-0.5"
                onClick={() => resolve({ trashCardId: cardId })}
              >
                Trash {IMP_CARD_DEFS[view.cardsById[cardId].defId].name}
              </button>
            ))}
          </div>
          <button className="btn !py-0.5" onClick={() => resolve({})}>
            Keep all
          </button>
        </div>
      )}

      {decision.kind === 'deckPeek' && (
        <div className="space-y-1.5">
          <div className="text-sand-200">
            Top of deck:{' '}
            {decision.cardId ? (
              (() => {
                const peekDef = IMP_CARD_DEFS[view.cardsById[decision.cardId].defId];
                return (
                  <CardRef
                    def={peekDef}
                    className="font-semibold text-sand-100 underline decoration-dotted decoration-sand-100/40 underline-offset-2 cursor-help"
                  >
                    {peekDef.name}
                  </CardRef>
                );
              })()
            ) : (
              <span className="font-semibold">(hidden)</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button className="btn !py-0.5" onClick={() => resolve({ discardPeeked: false })}>
              Keep on top
            </button>
            <button className="btn-secondary !py-0.5" onClick={() => resolve({ discardPeeked: true })}>
              Set aside (discard)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
