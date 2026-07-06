import { IMP_CARD_DEFS, RESERVE_DEF_IDS } from '../imperium/data/cards';
import type { ImpVisibleState, PlayerId } from '../imperium/types';
import { useImpStore } from '../lib/impStore';
import ImpCard from './ImpCard';
import { Icon } from './imp/icons';
import { CardBack } from './imp/tokens';

/** The imperium row + reserve stacks; buyable during the viewer's reveal turn. */
export default function ImpMarket({ view, viewingAs }: { view: ImpVisibleState; viewingAs: PlayerId | 'SPECTATOR' }) {
  const dispatch = useImpStore((s) => s.dispatch);
  const isPlayer = viewingAs !== 'SPECTATOR';
  const p = isPlayer ? view.players[viewingAs] : null;
  const canBuy = !!p && view.turn === viewingAs && p.revealed && !p.turnDone && view.phase === 'playerTurns';

  const CardCell = ({ id, defId, note, soldOut }: { id: string; defId: string; note?: string; soldOut?: boolean }) => {
    const def = IMP_CARD_DEFS[defId];
    const affordable = canBuy && !soldOut && p!.persuasion >= def.cost && def.cost > 0;
    const tooRich = canBuy && !soldOut && p!.persuasion < def.cost && def.cost > 0;
    return (
      <ImpCard
        def={def}
        showCost
        dimmed={tooRich || soldOut}
        footer={
          <div className="flex items-center gap-1">
            {note && <span className="text-[9px] uppercase tracking-wide text-sand-100/35">{note}</span>}
            {affordable && (
              <button
                className="btn ml-auto !py-0.5 !px-2 !text-xs"
                onClick={() => dispatch({ type: 'imp/buyCard', playerId: viewingAs as PlayerId, cardId: id })}
              >
                Buy
              </button>
            )}
          </div>
        }
      />
    );
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <CardBack count={view.imperiumDeckCount} width={26} title={`${view.imperiumDeckCount} cards left in the imperium deck`} />
        <span className="text-sand-100/50 uppercase tracking-wide">
          Imperium row <span className="normal-case">({view.imperiumDeckCount} in deck)</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {view.imperiumRow.map((cardId) => (
          <CardCell key={cardId} id={cardId} defId={view.cardsById[cardId].defId} />
        ))}
      </div>
      <div className="text-sand-100/50 uppercase tracking-wide pt-1">Reserve</div>
      <div className="grid grid-cols-2 gap-2">
        {RESERVE_DEF_IDS.filter((d) => IMP_CARD_DEFS[d].cost > 0).map((defId) => {
          const left = view.reserveSupply[defId] ?? 0;
          return (
            <CardCell
              key={defId}
              id={defId}
              defId={defId}
              soldOut={left <= 0}
              note={left <= 0 ? 'sold out' : `${left} left`}
            />
          );
        })}
      </div>
      {canBuy && (
        <button
          className="btn w-full mt-1 inline-flex items-center justify-center gap-1"
          onClick={() => dispatch({ type: 'imp/endTurn', playerId: viewingAs as PlayerId })}
        >
          End round <Icon name="persuasion" size={13} color="#1c150f" /> {p!.persuasion} left
        </button>
      )}
    </div>
  );
}
