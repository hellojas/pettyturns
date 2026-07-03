import { useState } from 'react';
import { TERRITORIES } from '../../../game/data/territories';
import { shipmentCost } from '../../../game/engine/phases/shipmentAndMovement';
import type { AllowedAction, PlayerId } from '../../../game/types';
import { useGameStore, useGameView } from '../../lib/store';

/** Ship reserves to the selected board cell, or skip. */
export default function ShipmentPanel({
  allowed,
  viewingAs,
}: {
  allowed: AllowedAction[];
  viewingAs: PlayerId;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const selected = useGameStore((s) => s.selectedCell);
  const { full } = useGameView();
  const shipAction = allowed.find((a) => a.type === 'shipment/ship');
  const skipAction = allowed.find((a) => a.type === 'shipment/skip');
  const [count, setCount] = useState(1);

  if (!shipAction && !skipAction) {
    return <div className="text-xs text-sand-100/50 italic">Waiting for the current player to ship…</div>;
  }
  const target = selected && selected.sector !== null ? selected : null;
  const cost =
    full && target && shipAction ? shipmentCost(full, viewingAs, target.territoryId, count) : null;

  return (
    <div className="text-sm space-y-2">
      <div className="font-semibold text-sand-300">Shipment</div>
      {shipAction && (
        <>
          <div className="text-xs text-sand-100/50">
            {target
              ? `Target: ${TERRITORIES[target.territoryId].name}, sector ${target.sector}`
              : 'Click a board cell to choose the landing zone.'}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              className="input w-16"
              min={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <span className="text-xs text-sand-100/50">forces{cost !== null && ` — cost ${cost} spice`}</span>
            <button
              className="btn"
              disabled={!target}
              onClick={() =>
                target &&
                dispatch({
                  type: 'shipment/ship',
                  playerId: viewingAs,
                  territoryId: target.territoryId,
                  sector: target.sector as number,
                  forces: count,
                  specialForces: 0,
                })
              }
            >
              Ship
            </button>
          </div>
        </>
      )}
      {skipAction && (
        <button className="btn-secondary" onClick={() => dispatch({ type: 'shipment/skip', playerId: viewingAs })}>
          Skip shipment
        </button>
      )}
    </div>
  );
}
