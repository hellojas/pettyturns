import { IMP_CARD_DEFS, RESERVE_DEF_IDS } from '../imperium/data/cards';
import type { ImpVisibleState, PlayerId } from '../imperium/types';
import { useImpStore } from '../lib/impStore';

const ICON_SHORT: Record<string, string> = {
  emperor: 'E',
  spacingGuild: 'G',
  beneGesserit: 'B',
  fremen: 'F',
  landsraad: 'L',
  city: 'C',
  spiceTrade: 'S',
};

/** The imperium row + reserve stacks; buyable during the viewer's reveal turn. */
export default function ImpMarket({ view, viewingAs }: { view: ImpVisibleState; viewingAs: PlayerId | 'SPECTATOR' }) {
  const dispatch = useImpStore((s) => s.dispatch);
  const isPlayer = viewingAs !== 'SPECTATOR';
  const p = isPlayer ? view.players[viewingAs] : null;
  const canBuy = !!p && view.turn === viewingAs && p.revealed && !p.turnDone && view.phase === 'playerTurns';

  const CardRow = ({ id, defId, note }: { id: string; defId: string; note?: string }) => {
    const def = IMP_CARD_DEFS[defId];
    const affordable = canBuy && p!.persuasion >= def.cost && def.cost > 0;
    return (
      <div className="flex items-center gap-2 rounded border border-sand-900/50 bg-dusk-900/60 px-2 py-1">
        <span className="text-sand-300 font-semibold w-5 text-right">{def.cost}◈</span>
        <span className="text-sand-200 truncate">{def.name}</span>
        <span className="text-sand-100/40">{def.icons.map((i) => ICON_SHORT[i]).join('')}</span>
        {note && <span className="text-sand-100/40">{note}</span>}
        {affordable && (
          <button
            className="btn ml-auto !py-0.5"
            onClick={() => dispatch({ type: 'imp/buyCard', playerId: viewingAs as PlayerId, cardId: id })}
          >
            Buy
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1.5 text-xs">
      <div className="text-sand-100/50 uppercase tracking-wide">
        Imperium row <span className="normal-case">({view.imperiumDeckCount} in deck)</span>
      </div>
      {view.imperiumRow.map((cardId) => (
        <CardRow key={cardId} id={cardId} defId={view.cardsById[cardId].defId} />
      ))}
      <div className="text-sand-100/50 uppercase tracking-wide pt-1">Reserve</div>
      {RESERVE_DEF_IDS.filter((d) => IMP_CARD_DEFS[d].cost > 0).map((defId) => (
        <CardRow key={defId} id={defId} defId={defId} note="unlimited" />
      ))}
      {canBuy && (
        <button className="btn w-full mt-1" onClick={() => dispatch({ type: 'imp/endTurn', playerId: viewingAs as PlayerId })}>
          End round ({p!.persuasion}◈ left)
        </button>
      )}
    </div>
  );
}
