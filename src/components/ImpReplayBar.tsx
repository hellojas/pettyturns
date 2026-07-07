import { useMemo, useState } from 'react';
import { stateAfter } from '../imperium/engine/replay';
import { getVisibleImperiumState } from '../imperium/engine/visibility';
import { IMP_CONSTANTS } from '../imperium/data/constants';
import { useImpStore } from '../lib/impStore';
import LeaderPortrait from './imp/LeaderPortrait';
import { PLAYER_COLORS } from './imp/visuals';
import { Icon } from './imp/icons';
import ImpLog from './ImpLog';

/**
 * A read-only move-history scrubber. The game is journal-backed, so any prior
 * position is just `stateAfter(initial, journal, cursor)`; this overlay lets you
 * slide to any move and watch the standings + log rewind/advance without
 * touching the live game. Spectator visibility only (no hidden hands revealed).
 */
export default function ImpReplayBar({ onClose }: { onClose: () => void }) {
  const initial = useImpStore((s) => s.initial);
  const journal = useImpStore((s) => s.journal);
  const total = journal.length;
  const [cursor, setCursor] = useState(total);

  const view = useMemo(() => {
    if (!initial) return null;
    return getVisibleImperiumState(stateAfter(initial, journal, cursor), 'SPECTATOR');
  }, [initial, journal, cursor]);

  if (!initial || !view) return null;
  const target = IMP_CONSTANTS.vpTarget;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Move history"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-5"
        style={{
          background: 'radial-gradient(120% 90% at 50% -10%, #2c2016, #16100a 78%)',
          border: '1px solid #7b422288',
          boxShadow: '0 24px 60px -20px #000',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tex-spice absolute inset-0 pointer-events-none opacity-40 rounded-2xl" aria-hidden />
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-wide text-sand-200">Move history</h2>
            <button className="btn-secondary !py-0.5 !px-2 !text-sm" onClick={onClose} aria-label="Close move history">
              ✕ Close
            </button>
          </div>

          {/* Scrubber */}
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary !py-0.5 !px-2 disabled:opacity-40"
              disabled={cursor <= 0}
              onClick={() => setCursor((c) => Math.max(0, c - 1))}
              aria-label="Previous move"
            >
              ◀
            </button>
            <input
              type="range"
              min={0}
              max={total}
              value={cursor}
              onChange={(e) => setCursor(Number(e.target.value))}
              className="flex-1 accent-amber-400"
              aria-label="Move slider"
            />
            <button
              className="btn-secondary !py-0.5 !px-2 disabled:opacity-40"
              disabled={cursor >= total}
              onClick={() => setCursor((c) => Math.min(total, c + 1))}
              aria-label="Next move"
            >
              ▶
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-sand-100/50">
            <span className="tabular-nums">move {cursor} / {total}</span>
            <span>round {view.round} · {view.phase}</span>
          </div>

          {/* Standings at this move */}
          <div className="flex flex-wrap gap-2">
            {view.playerOrder.map((pid, idx) => (
              <span
                key={pid}
                className="inline-flex items-center gap-1.5 rounded px-1.5 py-1 bg-dusk-900/70 border border-sand-900/50"
                title={`${view.players[pid].name}: ${view.players[pid].vp} VP`}
              >
                <LeaderPortrait leaderId={view.players[pid].leaderId} size={20} ring={PLAYER_COLORS[idx % 4]} />
                <span className="text-[11px] text-sand-200 truncate max-w-[90px]">{view.players[pid].name}</span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: '#f2c94c' }}>
                  <Icon name="vp" size={12} />
                  <span className="tabular-nums">
                    {view.players[pid].vp}
                    <span className="text-sand-100/30">/{target}</span>
                  </span>
                </span>
              </span>
            ))}
          </div>

          {/* Log up to this move */}
          <div>
            <div className="panel-title">Log</div>
            <ImpLog view={view} />
          </div>
        </div>
      </div>
    </div>
  );
}
