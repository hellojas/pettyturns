import { IMP_CONSTANTS } from '../imperium/data/constants';
import { IMP_LEADERS } from '../imperium/data/leaders';
import type { ImpVisibleState, PlayerId, VpSource } from '../imperium/types';

const PLAYER_DOTS = ['#2e7d32', '#b71c1c', '#4a148c', '#e65100'];

const SOURCE_LABEL: Record<VpSource, string> = {
  influenceLevel: 'Influence levels',
  alliance: 'Alliances',
  conflict: 'Conflicts',
  control: 'Control spaces',
  card: 'Cards',
  endgameIntrigue: 'Endgame intrigue',
  other: 'Other',
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

/** Net VP per source for one player (skips sources that net to zero). */
function bySource(ledger: ImpVisibleState['players'][string]['vpLedger']): Array<{ source: VpSource; amount: number }> {
  const totals = new Map<VpSource, number>();
  for (const e of ledger) totals.set(e.source, (totals.get(e.source) ?? 0) + e.amount);
  return SOURCE_ORDER.filter((s) => (totals.get(s) ?? 0) !== 0).map((s) => ({ source: s, amount: totals.get(s)! }));
}

/**
 * Final results screen: standings ordered as the engine ranked them, each
 * player's VP broken down by source (from the vp ledger), plus the tiebreaker
 * resources the engine uses after VP.
 */
export default function ImpGameOver({ view }: { view: ImpVisibleState }) {
  if (view.phase !== 'finished' || !view.finalStandings) return null;
  const order = view.finalStandings.map((s) => s.playerId);

  return (
    <div className="space-y-3 text-xs">
      <div className="text-sand-300 font-semibold text-sm">
        {view.winner ? `${view.players[view.winner].name} wins` : 'Game over'}
        <span className="text-sand-100/40 font-normal"> — {view.round} rounds</span>
      </div>
      {order.map((pid: PlayerId, rank) => {
        const p = view.players[pid];
        const idx = view.playerOrder.indexOf(pid);
        const sources = bySource(p.vpLedger);
        return (
          <div
            key={pid}
            className={`rounded border px-2 py-1.5 ${
              rank === 0 ? 'border-amber-500/70 bg-amber-950/20' : 'border-sand-900/50 bg-dusk-900/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sand-100/40 w-4">{rank + 1}.</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PLAYER_DOTS[idx] }} />
              <span className="font-semibold text-sand-200">{p.name}</span>
              <span className="text-sand-100/40">{IMP_LEADERS[p.leaderId].name}</span>
              <span className="ml-auto text-sand-200 font-semibold">{p.vp} VP</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sand-100/60 pl-6">
              {sources.length === 0 ? (
                <span className="italic text-sand-100/30">no points scored</span>
              ) : (
                sources.map(({ source, amount }) => (
                  <span key={source}>
                    {SOURCE_LABEL[source]}: <span className="text-sand-200">{amount > 0 ? `+${amount}` : amount}</span>
                  </span>
                ))
              )}
            </div>
            <div className="mt-0.5 flex gap-3 text-[10px] text-sand-100/40 pl-6">
              {IMP_CONSTANTS.tiebreakers.map((key) => (
                <span key={key}>
                  {key} {p[key]}
                </span>
              ))}
            </div>
          </div>
        );
      })}
      <div className="text-[10px] text-sand-100/40">
        Ties are broken by {IMP_CONSTANTS.tiebreakers.join(' → ')} (in that order).
      </div>
    </div>
  );
}
