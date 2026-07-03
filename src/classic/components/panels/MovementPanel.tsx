import { useState } from 'react';
import { TERRITORIES } from '../../../game/data/territories';
import type { AllowedAction, PlayerId, PublicGameState } from '../../../game/types';
import { useGameStore, type SelectedCell } from '../../lib/store';

/** Move one force group: pick origin (own stack), destination cell, count. */
export default function MovementPanel({
  view,
  allowed,
  viewingAs,
}: {
  view: PublicGameState;
  allowed: AllowedAction[];
  viewingAs: PlayerId;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const selected = useGameStore((s) => s.selectedCell);
  const moveAction = allowed.find((a) => a.type === 'movement/move');
  const skipAction = allowed.find((a) => a.type === 'movement/skip');
  const [from, setFrom] = useState<SelectedCell | null>(null);
  const [count, setCount] = useState(1);

  if (!moveAction && !skipAction) {
    return <div className="text-xs text-sand-100/50 italic">Waiting for the current player to move…</div>;
  }
  const factionId = view.players[viewingAs]?.factionId;
  const ownStacks = view.stacks.filter((s) => s.factionId === factionId);
  const to = selected && selected.sector !== null ? selected : null;

  return (
    <div className="text-sm space-y-2">
      <div className="font-semibold text-sand-300">
        Movement <span className="text-xs text-sand-100/50">(range {moveAction?.params?.range as number})</span>
      </div>
      {moveAction && (
        <>
          <div className="flex gap-2 items-center text-xs">
            <span>From</span>
            <select
              className="input"
              value={from ? `${from.territoryId}:${from.sector}` : ''}
              onChange={(e) => {
                const [territoryId, sector] = e.target.value.split(':');
                setFrom(e.target.value ? { territoryId, sector: Number(sector) } : null);
              }}
            >
              <option value="">your stack…</option>
              {ownStacks.map((s) => (
                <option key={`${s.territoryId}:${s.sector}`} value={`${s.territoryId}:${s.sector}`}>
                  {TERRITORIES[s.territoryId].name} s{s.sector} ({s.forces + s.specialForces})
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-sand-100/50">
            {to ? `To: ${TERRITORIES[to.territoryId].name}, sector ${to.sector}` : 'Click a board cell as destination.'}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              className="input w-16"
              min={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <button
              className="btn"
              disabled={!from || !to}
              onClick={() =>
                from &&
                to &&
                dispatch({
                  type: 'movement/move',
                  playerId: viewingAs,
                  from: { territoryId: from.territoryId, sector: from.sector as number },
                  to: { territoryId: to.territoryId, sector: to.sector as number },
                  forces: count,
                  specialForces: 0,
                })
              }
            >
              Move
            </button>
          </div>
        </>
      )}
      {skipAction && (
        <button className="btn-secondary" onClick={() => dispatch({ type: 'movement/skip', playerId: viewingAs })}>
          Skip movement
        </button>
      )}
    </div>
  );
}
