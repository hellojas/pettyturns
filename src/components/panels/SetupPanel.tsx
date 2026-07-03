import { useState } from 'react';
import { FACTIONS } from '../../game/data/factions';
import { LEADERS } from '../../game/data/leaders';
import { TERRITORIES } from '../../game/data/territories';
import type { AllowedAction, PlayerId, PublicGameState } from '../../game/types';
import { useGameStore } from '../../lib/store';

/** Interactive setup steps: traitor keeps, prediction, variable placement. */
export default function SetupPanel({
  view,
  allowed,
  viewingAs,
}: {
  view: PublicGameState;
  allowed: AllowedAction[];
  viewingAs: PlayerId;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const traitorAction = allowed.find((a) => a.type === 'setup/keepTraitors');
  const predictionAction = allowed.find((a) => a.type === 'setup/submitPrediction');
  const placementAction = allowed.find((a) => a.type === 'setup/placeStartingForces');

  const [kept, setKept] = useState<string[]>([]);
  const [predFaction, setPredFaction] = useState('');
  const [predRound, setPredRound] = useState(1);
  const [placement, setPlacement] = useState<Record<string, number>>({});

  if (!traitorAction && !predictionAction && !placementAction) {
    return <div className="text-xs text-sand-100/50 italic">Waiting for the other players to finish setup…</div>;
  }

  return (
    <div className="space-y-4 text-sm">
      {traitorAction && (
        <div>
          <div className="font-semibold text-sand-300 mb-1">{traitorAction.label}</div>
          {(traitorAction.params?.options as string[]).map((leaderId) => {
            const leader = LEADERS[leaderId];
            const keepCount = traitorAction.params?.keep as number;
            return (
              <label key={leaderId} className="flex items-center gap-2 text-xs py-0.5">
                <input
                  type="checkbox"
                  checked={kept.includes(leaderId)}
                  onChange={(e) =>
                    setKept((prev) =>
                      e.target.checked ? [...prev, leaderId].slice(-keepCount) : prev.filter((l) => l !== leaderId),
                    )
                  }
                />
                {leader.name}
                <span className="text-sand-100/40">
                  ({FACTIONS[leader.factionId].name}, strength {leader.strength})
                </span>
              </label>
            );
          })}
          <button
            className="btn mt-1"
            disabled={kept.length !== (traitorAction.params?.keep as number)}
            onClick={() => dispatch({ type: 'setup/keepTraitors', playerId: viewingAs, leaderIds: kept })}
          >
            Keep selected
          </button>
        </div>
      )}

      {predictionAction && (
        <div>
          <div className="font-semibold text-sand-300 mb-1">{predictionAction.label}</div>
          <div className="flex gap-2 items-center text-xs">
            <select className="input" value={predFaction} onChange={(e) => setPredFaction(e.target.value)}>
              <option value="">faction…</option>
              {view.playerOrder
                .map((pid) => view.players[pid].factionId)
                .map((fid) => (
                  <option key={fid} value={fid}>
                    {FACTIONS[fid].name}
                  </option>
                ))}
            </select>
            <span>wins on round</span>
            <input
              type="number"
              className="input w-16"
              min={1}
              max={view.maxRounds}
              value={predRound}
              onChange={(e) => setPredRound(Number(e.target.value))}
            />
            <button
              className="btn"
              disabled={!predFaction}
              onClick={() =>
                dispatch({ type: 'setup/submitPrediction', playerId: viewingAs, factionId: predFaction, round: predRound })
              }
            >
              Seal prediction
            </button>
          </div>
        </div>
      )}

      {placementAction && (
        <div>
          <div className="font-semibold text-sand-300 mb-1">{placementAction.label}</div>
          {(placementAction.params?.territories as string[]).map((territoryId) => (
            <label key={territoryId} className="flex items-center gap-2 text-xs py-0.5">
              <span className="w-40">{TERRITORIES[territoryId].name}</span>
              <input
                type="number"
                className="input w-16"
                min={0}
                value={placement[territoryId] ?? 0}
                onChange={(e) => setPlacement((p) => ({ ...p, [territoryId]: Number(e.target.value) }))}
              />
            </label>
          ))}
          <div className="text-xs text-sand-100/50 mt-1">
            Placed {Object.values(placement).reduce((a, b) => a + b, 0)} of {placementAction.params?.total as number}
          </div>
          <button
            className="btn mt-1"
            onClick={() =>
              dispatch({
                type: 'setup/placeStartingForces',
                playerId: viewingAs,
                placements: Object.entries(placement)
                  .filter(([, n]) => n > 0)
                  .map(([territoryId, forces]) => ({
                    territoryId,
                    sector: TERRITORIES[territoryId].sectors[0],
                    forces,
                    specialForces: 0,
                  })),
              })
            }
          >
            Deploy
          </button>
        </div>
      )}
    </div>
  );
}
