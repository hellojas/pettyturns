import { TERRITORIES } from '../../game/data/territories';
import { FACTIONS } from '../../game/data/factions';
import type { PublicGameState } from '../../game/types';
import type { SelectedCell } from '../lib/store';

/** Details for the currently selected board cell. */
export default function TerritoryPopover({
  view,
  selected,
}: {
  view: PublicGameState;
  selected: SelectedCell | null;
}) {
  if (!selected) {
    return (
      <div className="text-sm text-sand-100/50 italic">
        Click a territory on the board to inspect it (and to target shipments and moves).
      </div>
    );
  }
  const territory = TERRITORIES[selected.territoryId];
  const stacks = view.stacks.filter((s) => s.territoryId === territory.id);
  const spice = view.spiceOnBoard.filter((s) => s.territoryId === territory.id);
  const underStorm = territory.sectors.includes(view.storm.sector) && territory.kind === 'sand';

  return (
    <div className="text-sm space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-sand-300">{territory.name}</span>
        <span className="text-xs uppercase tracking-wide text-sand-100/50">{territory.kind}</span>
        {selected.sector !== null && (
          <span className="text-xs text-sand-100/50">sector {selected.sector}</span>
        )}
      </div>
      {underStorm && <div className="text-xs text-purple-300">⚠ Part of this territory is under the storm.</div>}
      {territory.spiceBlow && (
        <div className="text-xs text-sand-100/60">
          Blow site: {territory.spiceBlow.amount} spice in sector {territory.spiceBlow.sector}
        </div>
      )}
      {spice.map((s) => (
        <div key={s.sector} className="text-amber-400 text-xs">
          ◉ {s.amount} spice (sector {s.sector})
        </div>
      ))}
      {stacks.length === 0 ? (
        <div className="text-xs text-sand-100/40">Unoccupied.</div>
      ) : (
        stacks.map((s) => (
          <div key={`${s.factionId}:${s.sector}`} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: FACTIONS[s.factionId].color }} />
            {FACTIONS[s.factionId].name}: {s.forces}
            {s.specialForces > 0 ? ` + ${s.specialForces}★` : ''} (sector {s.sector})
            {s.isAdvisor ? ' — advisors' : ''}
          </div>
        ))
      )}
    </div>
  );
}
