import { IMP_SPACE_LIST, IMP_SPACES } from '../imperium/data/spaces';
import { IMP_CARD_DEFS } from '../imperium/data/cards';
import { impValidate } from '../imperium/engine/engine';
import type { ImpVisibleState, PlayerId, SpaceGroup } from '../imperium/types';
import { useImpStore } from '../lib/impStore';

const GROUPS: Array<{ key: SpaceGroup; label: string; tint: string }> = [
  { key: 'emperor', label: 'Emperor', tint: 'border-red-900/70' },
  { key: 'spacingGuild', label: 'Spacing Guild', tint: 'border-orange-800/70' },
  { key: 'beneGesserit', label: 'Bene Gesserit', tint: 'border-purple-900/70' },
  { key: 'fremen', label: 'Fremen', tint: 'border-amber-700/70' },
  { key: 'landsraad', label: 'Landsraad', tint: 'border-sand-800' },
  { key: 'choam', label: 'CHOAM', tint: 'border-sand-800' },
  { key: 'city', label: 'Cities', tint: 'border-sky-900/70' },
  { key: 'desert', label: 'Deep Desert', tint: 'border-sand-700' },
];

const PLAYER_DOTS = ['#2e7d32', '#b71c1c', '#4a148c', '#e65100'];

function costText(space: (typeof IMP_SPACE_LIST)[number]): string {
  const parts: string[] = [];
  if (space.cost?.spice) parts.push(`${space.cost.spice}◉`);
  if (space.cost?.solari) parts.push(`${space.cost.solari}$`);
  if (space.cost?.water) parts.push(`${space.cost.water}💧`);
  if (space.cost?.influenceRequired)
    parts.push(`req ${space.cost.influenceRequired.min} ${space.cost.influenceRequired.faction}`);
  if (space.special === 'sellMelange') parts.push('2–5◉');
  return parts.join(' ');
}

function gainText(space: (typeof IMP_SPACE_LIST)[number]): string {
  const g = space.gains ?? {};
  const parts: string[] = [];
  if (g.spice) parts.push(`+${g.spice}◉`);
  if (g.solari) parts.push(`+${g.solari}$`);
  if (g.water) parts.push(`+${g.water}💧`);
  if (g.troops) parts.push(`+${g.troops}⚔`);
  if (g.drawCards) parts.push(`+${g.drawCards} card`);
  if (g.intrigueCards) parts.push(`+${g.intrigueCards} intrigue`);
  if (g.trashCards) parts.push('trash 1');
  if (g.acquireReserveCard) parts.push(IMP_CARD_DEFS[g.acquireReserveCard].name);
  if (space.special === 'highCouncil') parts.push('council seat');
  if (space.special === 'swordmaster') parts.push('3rd agent');
  if (space.special === 'mentat') parts.push('mentat');
  if (space.special === 'sellMelange') parts.push('→ solari');
  return parts.join(' ');
}

/**
 * The agent board: every space from config, grouped by region. When a card is
 * selected in hand, legal destinations light up; clicking one stages the play.
 */
export default function ImpBoard({ view, viewingAs }: { view: ImpVisibleState; viewingAs: PlayerId | 'SPECTATOR' }) {
  const pending = useImpStore((s) => s.pending);
  const setPending = useImpStore((s) => s.setPending);
  const full = useImpStore((s) => s.state);

  const legalTargets = new Set<string>();
  if (pending && full && viewingAs !== 'SPECTATOR') {
    for (const space of IMP_SPACE_LIST) {
      const verdict = impValidate(full, {
        type: 'imp/playCard',
        playerId: viewingAs,
        cardId: pending.cardId,
        spaceId: space.id,
        choices: space.special === 'sellMelange' ? { sellSpice: 2 } : undefined,
      });
      if (verdict.ok) legalTargets.add(space.id);
    }
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
      {GROUPS.map((group) => (
        <div key={group.key} className={`rounded-lg border ${group.tint} bg-dusk-800 p-2`}>
          <div className="text-[10px] uppercase tracking-wider text-sand-100/50 mb-1.5">{group.label}</div>
          <div className="space-y-1.5">
            {IMP_SPACE_LIST.filter((s) => s.group === group.key).map((space) => {
              const occupant = view.occupied[space.id];
              const occupantIdx = occupant ? view.playerOrder.indexOf(occupant) : -1;
              const legal = legalTargets.has(space.id);
              const bonus = view.makerBonus[space.id] ?? 0;
              const controller = view.controlledBy[space.id];
              return (
                <button
                  key={space.id}
                  disabled={!legal}
                  onClick={() => pending && setPending({ ...pending, spaceId: space.id })}
                  className={`w-full text-left rounded px-2 py-1 text-xs border transition-colors ${
                    pending?.spaceId === space.id
                      ? 'border-sand-300 bg-dusk-900'
                      : legal
                        ? 'border-amber-500/70 bg-dusk-900 hover:border-amber-300 cursor-pointer'
                        : 'border-sand-900/40 bg-dusk-900/50'
                  } ${occupant ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sand-200 truncate">{space.name}</span>
                    {space.combat && <span title="opens the conflict">⚔</span>}
                    {bonus > 0 && <span className="text-amber-400">+{bonus}◉</span>}
                    {occupant && (
                      <span
                        className="ml-auto inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PLAYER_DOTS[occupantIdx] }}
                        title={`agent: ${view.players[occupant].name}`}
                      />
                    )}
                  </div>
                  <div className="text-sand-100/50 flex gap-2">
                    {costText(space) && <span className="text-red-300/80">{costText(space)}</span>}
                    <span>{gainText(space)}</span>
                    {space.influenceGain && <span className="text-sand-300">+1 infl</span>}
                  </div>
                  {controller && (
                    <div className="text-[10px] text-sand-100/40">
                      controlled by {view.players[controller].name}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export { IMP_SPACES };
