import { PHASES } from '../../game/types';
import type { PublicGameState } from '../../game/types';

const PHASE_LABELS: Record<string, string> = {
  setup: 'Setup',
  storm: 'Storm',
  spiceBlow: 'Spice Blow',
  nexus: 'Nexus',
  bidding: 'Bidding',
  revival: 'Revival',
  shipmentAndMovement: 'Ship & Move',
  battle: 'Battle',
  spiceCollection: 'Collection',
  mentatPause: 'Round End',
  finished: 'Finished',
};

const ROUND_PHASES = PHASES.filter((p) => !['setup', 'nexus', 'finished'].includes(p));

/** Round tracker + phase strip with the active phase highlighted. */
export default function PhasePanel({ view, waiting }: { view: PublicGameState; waiting: string[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-sand-300 font-semibold">
          Round {view.round} <span className="text-sand-100/40 text-sm">of {view.maxRounds}</span>
        </div>
        <div className="text-xs text-sand-100/60">Storm: sector {view.storm.sector}</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {ROUND_PHASES.map((phase) => (
          <span
            key={phase}
            className={`px-2 py-0.5 rounded text-xs ${
              view.phase === phase
                ? 'bg-sand-500 text-dusk-900 font-semibold'
                : 'bg-dusk-900 text-sand-100/40'
            }`}
          >
            {PHASE_LABELS[phase]}
          </span>
        ))}
        {view.phase === 'nexus' && (
          <span className="px-2 py-0.5 rounded text-xs bg-purple-700 text-white font-semibold">Nexus!</span>
        )}
        {view.phase === 'setup' && (
          <span className="px-2 py-0.5 rounded text-xs bg-sand-500 text-dusk-900 font-semibold">Setup</span>
        )}
      </div>
      {waiting.length > 0 && (
        <div className="text-xs text-sand-100/60">
          Waiting on: <span className="text-sand-200">{waiting.join(', ')}</span>
        </div>
      )}
      {view.victory && (
        <div className="text-sm text-amber-300 font-semibold border border-amber-700 rounded p-2 bg-amber-950/40">
          Game over — {view.victory.detail}
        </div>
      )}
    </div>
  );
}
