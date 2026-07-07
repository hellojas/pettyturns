import { IMP_CONSTANTS } from '../../imperium/data/constants';
import type { ImpVisibleState } from '../../imperium/types';
import { Icon } from './icons';
import LeaderPortrait from './LeaderPortrait';
import { PLAYER_COLORS } from './visuals';

/**
 * A race-to-victory track: 0…vpTarget with each player's leader portrait riding
 * along at their current VP. Tokens slide (CSS transition) as scores change and
 * fan out horizontally when several players share a score.
 */
export default function VpTrack({ view }: { view: ImpVisibleState }) {
  const target = IMP_CONSTANTS.vpTarget;
  const ticks = Array.from({ length: target + 1 }, (_, i) => i);
  const order = view.playerOrder;

  return (
    <div
      className="relative rounded-xl px-3 pt-1.5 pb-6 overflow-hidden"
      style={{ background: 'linear-gradient(90deg, #241b1288, #1a130d88)', border: '1px solid #7b422255' }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon name="vp" size={13} />
        <span className="font-display text-[11px] font-bold tracking-wide text-sand-200/80">
          Race to {target}
        </span>
      </div>

      <div className="relative h-2.5 rounded-full" style={{ background: '#00000066', boxShadow: 'inset 0 1px 2px #000a' }}>
        {/* gold fill up to the current leader */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{
            width: `${(Math.max(0, ...order.map((p) => view.players[p].vp)) / target) * 100}%`,
            background: 'linear-gradient(90deg, #b56b26, #f2c94c)',
            boxShadow: 'inset 0 1px 0 #ffffff55, 0 0 8px -1px #f2c94c66',
          }}
        />
        {/* tick marks + labels */}
        {ticks.map((t) => (
          <div key={t} className="absolute -top-0.5 flex flex-col items-center" style={{ left: `${(t / target) * 100}%` }}>
            <span
              className="w-px h-2.5 -translate-x-1/2"
              style={{ background: t === target ? '#f2c94c' : '#f7ecd733' }}
            />
            {(t === 0 || t === target || t % 2 === 0) && (
              <span className="absolute top-3 -translate-x-1/2 text-[8px] tabular-nums text-sand-100/40">
                {t === target ? `★${t}` : t}
              </span>
            )}
          </div>
        ))}
        {/* player tokens */}
        {order.map((pid, idx) => {
          const vp = Math.min(view.players[pid].vp, target);
          const peers = order.filter((q) => Math.min(view.players[q].vp, target) === vp);
          const sub = peers.indexOf(pid);
          const nudge = (sub - (peers.length - 1) / 2) * 9;
          return (
            <div
              key={pid}
              className="absolute top-1/2 transition-[left] duration-500 z-10"
              style={{ left: `calc(${(vp / target) * 100}% + ${nudge}px)`, transform: 'translate(-50%, -50%)' }}
              title={`${view.players[pid].name}: ${view.players[pid].vp} VP`}
            >
              <LeaderPortrait leaderId={view.players[pid].leaderId} size={20} ring={PLAYER_COLORS[idx % 4]} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
