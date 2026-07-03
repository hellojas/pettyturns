import { useState } from 'react';
import type { AllowedAction, PlayerId } from '../../game/types';
import { useGameStore } from '../../lib/store';

/** Secret storm dial. */
export default function StormPanel({
  allowed,
  viewingAs,
}: {
  allowed: AllowedAction[];
  viewingAs: PlayerId;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const dialAction = allowed.find((a) => a.type === 'storm/dial');
  const [value, setValue] = useState<number | ''>('');

  if (!dialAction) {
    return <div className="text-xs text-sand-100/50 italic">Waiting for the dialers to set the storm…</div>;
  }
  const min = dialAction.params?.min as number;
  const max = dialAction.params?.max as number;
  return (
    <div className="text-sm space-y-2">
      <div className="font-semibold text-sand-300">{dialAction.label}</div>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          className="input w-20"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={`${min}–${max}`}
        />
        <button
          className="btn"
          disabled={value === ''}
          onClick={() => dispatch({ type: 'storm/dial', playerId: viewingAs, value: Number(value) })}
        >
          Lock in dial
        </button>
      </div>
      <div className="text-xs text-sand-100/50">
        Your dial stays hidden until both dialers commit; the storm moves the revealed total.
      </div>
    </div>
  );
}
