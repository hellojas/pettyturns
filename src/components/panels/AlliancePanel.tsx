import { useState } from 'react';
import { FACTIONS } from '../../game/data/factions';
import type { AllowedAction, PlayerId, PublicGameState } from '../../game/types';
import { useGameStore } from '../../lib/store';

/** Nexus negotiation: propose / respond / break / pass / end. */
export default function AlliancePanel({
  view,
  allowed,
  viewingAs,
}: {
  view: PublicGameState;
  allowed: AllowedAction[];
  viewingAs: PlayerId;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const [target, setTarget] = useState('');
  const propose = allowed.find((a) => a.type === 'nexus/propose');
  const respond = allowed.find((a) => a.type === 'nexus/respond');
  const breakAction = allowed.find((a) => a.type === 'nexus/break');
  const endAction = allowed.find((a) => a.type === 'nexus/end');

  return (
    <div className="text-sm space-y-2">
      <div className="font-semibold text-purple-300">Nexus — alliances may form or break</div>
      {view.alliances.length > 0 && (
        <div className="text-xs text-sand-100/60">
          Current: {view.alliances.map((a) => a.members.map((m) => FACTIONS[m].name).join(' + ')).join(', ')}
        </div>
      )}
      {propose && (
        <div className="flex gap-2 items-center text-xs">
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">ally with…</option>
            {(propose.params?.candidates as string[]).map((fid) => (
              <option key={fid} value={fid}>
                {FACTIONS[fid].name}
              </option>
            ))}
          </select>
          <button
            className="btn"
            disabled={!target}
            onClick={() => dispatch({ type: 'nexus/propose', playerId: viewingAs, withFactionId: target })}
          >
            Propose alliance
          </button>
        </div>
      )}
      {respond &&
        (respond.params?.from as string[]).map((fid) => (
          <div key={fid} className="flex gap-2 items-center text-xs">
            <span>{FACTIONS[fid].name} proposes an alliance:</span>
            <button
              className="btn"
              onClick={() => dispatch({ type: 'nexus/respond', playerId: viewingAs, toFactionId: fid, accept: true })}
            >
              Accept
            </button>
            <button
              className="btn-secondary"
              onClick={() => dispatch({ type: 'nexus/respond', playerId: viewingAs, toFactionId: fid, accept: false })}
            >
              Decline
            </button>
          </div>
        ))}
      <div className="flex gap-2">
        {breakAction && (
          <button className="btn-secondary" onClick={() => dispatch({ type: 'nexus/break', playerId: viewingAs })}>
            Break alliance
          </button>
        )}
        {endAction && (
          <button className="btn-secondary" onClick={() => dispatch({ type: 'nexus/end', playerId: viewingAs })}>
            Declare nexus over
          </button>
        )}
      </div>
    </div>
  );
}
