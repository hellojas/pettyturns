import { IMP_CONSTANTS } from '../imperium/data/constants';
import { IMP_LEADERS } from '../imperium/data/leaders';
import type { ImpVisibleState, PlayerId, VpSource } from '../imperium/types';
import { Icon, type IconName } from './imp/icons';
import { PLAYER_COLORS } from './imp/visuals';
import LeaderPortrait from './imp/LeaderPortrait';

const SOURCE_LABEL: Record<VpSource, string> = {
  influenceLevel: 'Influence',
  alliance: 'Alliances',
  conflict: 'Conflicts',
  control: 'Control',
  card: 'Cards',
  endgameIntrigue: 'Endgame intrigue',
  other: 'Other',
};

/** A distinct hue per VP source, used for the stacked breakdown bar + legend. */
const SOURCE_COLOR: Record<VpSource, string> = {
  conflict: '#d94f3d',
  influenceLevel: '#e3bd78',
  alliance: '#e6c34a',
  card: '#5c9fd0',
  endgameIntrigue: '#b79bd8',
  control: '#4a9d4f',
  other: '#9c8770',
};

const SOURCE_ORDER: VpSource[] = [
  'conflict',
  'influenceLevel',
  'alliance',
  'card',
  'endgameIntrigue',
  'control',
  'other',
];

/** An icon per tiebreaker resource key. */
const TIEBREAK_ICON: Record<string, IconName> = {
  spice: 'spice',
  solari: 'solari',
  water: 'water',
  troops: 'troops',
  garrison: 'troops',
};

/** Net VP per source for one player (skips sources that net to zero). */
function bySource(ledger: ImpVisibleState['players'][string]['vpLedger']): Array<{ source: VpSource; amount: number }> {
  const totals = new Map<VpSource, number>();
  for (const e of ledger) totals.set(e.source, (totals.get(e.source) ?? 0) + e.amount);
  return SOURCE_ORDER.filter((s) => (totals.get(s) ?? 0) !== 0).map((s) => ({ source: s, amount: totals.get(s)! }));
}

/**
 * Final results screen: standings ordered as the engine ranked them. Each
 * player shows a leader portrait, a VP breakdown bar coloured by source (from
 * the vp ledger), and the tiebreaker resources the engine uses after VP.
 */
export default function ImpGameOver({ view }: { view: ImpVisibleState }) {
  if (view.phase !== 'finished' || !view.finalStandings) return null;
  const order = view.finalStandings.map((s) => s.playerId);
  const topVp = Math.max(1, ...order.map((pid) => view.players[pid].vp));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-sm">
        {view.winner && <Icon name="crown" size={18} />}
        <span className="font-display font-bold text-sand-200">
          {view.winner ? `${view.players[view.winner].name} wins` : 'Game over'}
        </span>
        <span className="text-sand-100/45 text-xs">· {view.round} rounds</span>
      </div>

      {order.map((pid: PlayerId, rank) => {
        const p = view.players[pid];
        const idx = view.playerOrder.indexOf(pid);
        const seat = PLAYER_COLORS[idx % 4];
        const sources = bySource(p.vpLedger);
        const positive = sources.filter((s) => s.amount > 0);
        const isWinner = rank === 0;
        return (
          <div
            key={pid}
            className="rounded-lg border overflow-hidden"
            style={{
              borderColor: isWinner ? '#e6c34a99' : `${seat}44`,
              background: isWinner
                ? `linear-gradient(150deg, #2a2113, #1c150f), radial-gradient(120% 120% at 0% 0%, ${seat}26, transparent 55%)`
                : '#1c150f',
              boxShadow: isWinner ? '0 0 16px -6px #e6c34a88' : undefined,
            }}
          >
            <div className="flex items-center gap-2 px-2.5 pt-2">
              <span className="text-sand-100/45 font-bold tabular-nums w-4 text-center text-sm">{rank + 1}</span>
              <div className="relative shrink-0">
                <LeaderPortrait leaderId={p.leaderId} size={34} ring={seat} />
                {isWinner && (
                  <span className="absolute -top-2 -left-1.5 rotate-[-18deg]">
                    <Icon name="crown" size={15} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sand-100 text-[13px] truncate">{p.name}</div>
                <div className="text-[11px] text-sand-100/50 truncate">{IMP_LEADERS[p.leaderId].name}</div>
              </div>
              <span className="inline-flex items-center gap-1 shrink-0" title="victory points">
                <Icon name="vp" size={16} />
                <span className="font-display font-bold text-lg text-sand-100 tabular-nums leading-none">{p.vp}</span>
              </span>
            </div>

            {/* VP breakdown bar, scaled to the leading score for comparability. */}
            <div className="px-2.5 mt-1.5">
              <div className="flex h-2 rounded-full overflow-hidden bg-black/40" style={{ width: `${(p.vp / topVp) * 100}%`, minWidth: '10%' }}>
                {positive.map(({ source, amount }) => (
                  <span
                    key={source}
                    style={{ flex: amount, background: SOURCE_COLOR[source] }}
                    title={`${SOURCE_LABEL[source]}: +${amount}`}
                  />
                ))}
              </div>
            </div>

            {/* Legend + tiebreakers */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 px-2.5 pt-1.5 pb-2 text-[10px]">
              {sources.length === 0 ? (
                <span className="italic text-sand-100/35">no points scored</span>
              ) : (
                sources.map(({ source, amount }) => (
                  <span key={source} className="inline-flex items-center gap-1 text-sand-100/70">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: SOURCE_COLOR[source] }} />
                    {SOURCE_LABEL[source]}
                    <span className="text-sand-200 font-semibold tabular-nums">{amount > 0 ? `+${amount}` : amount}</span>
                  </span>
                ))
              )}
              <span className="ml-auto inline-flex items-center gap-2 text-sand-100/50">
                {IMP_CONSTANTS.tiebreakers.map((key) =>
                  TIEBREAK_ICON[key] ? (
                    <span key={key} className="inline-flex items-center gap-0.5" title={`tiebreaker: ${key}`}>
                      <Icon name={TIEBREAK_ICON[key]} size={11} />
                      <span className="tabular-nums">{p[key]}</span>
                    </span>
                  ) : (
                    <span key={key} className="tabular-nums" title={`tiebreaker: ${key}`}>
                      {key} {p[key]}
                    </span>
                  ),
                )}
              </span>
            </div>
          </div>
        );
      })}

      <div className="text-[10px] text-sand-100/40">
        Ties broken by {IMP_CONSTANTS.tiebreakers.join(' → ')} (in that order).
      </div>
    </div>
  );
}
