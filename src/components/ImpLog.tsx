import type { ImpVisibleState } from '../imperium/types';

/** Viewer-filtered game log, newest first. */
export default function ImpLog({ view }: { view: ImpVisibleState }) {
  const entries = [...view.log].reverse();
  return (
    <div className="space-y-1 overflow-y-auto max-h-64 pr-1 text-xs">
      {entries.map((entry) => (
        <div key={entry.seq} className="flex gap-2">
          <span className="text-sand-100/30 shrink-0 w-8">R{entry.round}</span>
          <span className={entry.visibility.scope === 'private' ? 'text-purple-300' : 'text-sand-100/80'}>
            {entry.visibility.scope === 'private' && '🔒 '}
            {entry.text}
          </span>
        </div>
      ))}
    </div>
  );
}
