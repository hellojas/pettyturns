import type { PublicGameState } from '../game/types';

/** Viewer-filtered game log, newest first. Private entries are marked. */
export default function GameLog({ view }: { view: PublicGameState }) {
  const entries = [...view.log].reverse();
  return (
    <div className="space-y-1 overflow-y-auto max-h-72 pr-1 text-xs">
      {entries.map((entry) => (
        <div key={entry.seq} className="flex gap-2">
          <span className="text-sand-100/30 shrink-0 w-14">
            R{entry.round}·{entry.phase.slice(0, 5)}
          </span>
          <span className={entry.visibility.scope === 'private' ? 'text-purple-300' : 'text-sand-100/80'}>
            {entry.visibility.scope === 'private' && '🔒 '}
            {entry.text}
          </span>
        </div>
      ))}
      {entries.length === 0 && <div className="text-sand-100/40 italic">Nothing yet.</div>}
    </div>
  );
}
