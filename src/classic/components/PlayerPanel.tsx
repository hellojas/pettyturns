import { FACTIONS } from '../../game/data/factions';
import type { PlayerId, PublicGameState } from '../../game/types';

interface PlayerPanelProps {
  view: PublicGameState;
  viewingAs: PlayerId | 'SPECTATOR';
  waiting: PlayerId[];
  onViewAs(viewer: PlayerId | 'SPECTATOR'): void;
}

/** All seats: public resources, hand counts, whose move it is, and the hotseat switcher. */
export default function PlayerPanel({ view, viewingAs, waiting, onViewAs }: PlayerPanelProps) {
  return (
    <div className="space-y-1.5">
      {view.playerOrder.map((pid) => {
        const player = view.players[pid];
        const faction = FACTIONS[player.factionId];
        const other = view.hidden.others[pid];
        const handCount = pid === viewingAs ? view.hidden.self?.hand.length ?? 0 : other?.handCount ?? 0;
        const isTurn = waiting.includes(pid);
        return (
          <button
            key={pid}
            onClick={() => onViewAs(pid)}
            className={`w-full text-left rounded border px-2 py-1.5 text-xs transition-colors ${
              viewingAs === pid
                ? 'border-sand-400 bg-dusk-900'
                : 'border-transparent bg-dusk-900/60 hover:border-sand-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: faction.color }} />
              <span className="font-semibold text-sand-200 truncate">{player.name}</span>
              <span className="text-sand-100/40">{faction.name}</span>
              {isTurn && <span className="ml-auto text-amber-400 font-semibold shrink-0">● to act</span>}
            </div>
            <div className="mt-0.5 flex gap-3 text-sand-100/60">
              <span>◉ {player.spice}</span>
              <span>
                reserves {player.reserves.forces}
                {player.reserves.specialForces > 0 ? `+${player.reserves.specialForces}★` : ''}
              </span>
              <span>tanks {player.tanksForces.forces + player.tanksForces.specialForces}</span>
              <span>cards {handCount}</span>
              <span>leaders {player.leadersAlive.length}</span>
            </div>
          </button>
        );
      })}
      <button
        onClick={() => onViewAs('SPECTATOR')}
        className={`w-full text-left rounded border px-2 py-1 text-xs ${
          viewingAs === 'SPECTATOR' ? 'border-sand-400 bg-dusk-900' : 'border-transparent bg-dusk-900/60 hover:border-sand-800'
        }`}
      >
        <span className="text-sand-100/60">Spectator view (public info only)</span>
      </button>
    </div>
  );
}
