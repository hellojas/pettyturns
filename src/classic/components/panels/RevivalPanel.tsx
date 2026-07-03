import { useState } from 'react';
import { LEADERS } from '../../../game/data/leaders';
import type { AllowedAction, PlayerId } from '../../../game/types';
import { useGameStore } from '../../lib/store';

/** Revive forces / a leader, or finish. */
export default function RevivalPanel({
  allowed,
  viewingAs,
}: {
  allowed: AllowedAction[];
  viewingAs: PlayerId;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const forcesAction = allowed.find((a) => a.type === 'revival/reviveForces');
  const leaderAction = allowed.find((a) => a.type === 'revival/reviveLeader');
  const skipAction = allowed.find((a) => a.type === 'revival/skip');
  const [count, setCount] = useState(1);
  const [leaderId, setLeaderId] = useState('');

  if (!forcesAction && !leaderAction && !skipAction) {
    return <div className="text-xs text-sand-100/50 italic">Waiting for other players to revive…</div>;
  }
  return (
    <div className="text-sm space-y-3">
      {forcesAction && (
        <div className="space-y-1">
          <div className="font-semibold text-sand-300">{forcesAction.label}</div>
          <div className="text-xs text-sand-100/50">
            Up to {forcesAction.params?.max as number} — first {forcesAction.params?.freeRemaining as number} free,
            then {forcesAction.params?.costPerForce as number} spice each.
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              className="input w-16"
              min={1}
              max={forcesAction.params?.max as number}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <button
              className="btn"
              onClick={() =>
                dispatch({ type: 'revival/reviveForces', playerId: viewingAs, forces: count, specialForces: 0 })
              }
            >
              Revive forces
            </button>
          </div>
        </div>
      )}
      {leaderAction && (
        <div className="space-y-1">
          <div className="font-semibold text-sand-300">{leaderAction.label}</div>
          <div className="flex gap-2 items-center">
            <select className="input" value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
              <option value="">leader…</option>
              {(leaderAction.params?.leaders as string[]).map((lid) => (
                <option key={lid} value={lid}>
                  {LEADERS[lid].name} ({LEADERS[lid].strength} spice)
                </option>
              ))}
            </select>
            <button
              className="btn"
              disabled={!leaderId}
              onClick={() => dispatch({ type: 'revival/reviveLeader', playerId: viewingAs, leaderId })}
            >
              Revive leader
            </button>
          </div>
        </div>
      )}
      {skipAction && (
        <button className="btn-secondary" onClick={() => dispatch({ type: 'revival/skip', playerId: viewingAs })}>
          Finish revivals
        </button>
      )}
    </div>
  );
}
