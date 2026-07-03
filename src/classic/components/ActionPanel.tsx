import type { AllowedAction, PlayerId, PublicGameState } from '../../game/types';
import { useGameStore } from '../lib/store';
import SetupPanel from './panels/SetupPanel';
import StormPanel from './panels/StormPanel';
import BiddingPanel from './panels/BiddingPanel';
import RevivalPanel from './panels/RevivalPanel';
import ShipmentPanel from './panels/ShipmentPanel';
import MovementPanel from './panels/MovementPanel';
import AlliancePanel from './panels/AlliancePanel';
import BattleModal from './BattleModal';

/** Routes the current phase to its interaction panel for the seated viewer. */
export default function ActionPanel({
  view,
  allowed,
  viewingAs,
}: {
  view: PublicGameState;
  allowed: AllowedAction[];
  viewingAs: PlayerId | 'SPECTATOR';
}) {
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);

  if (view.victory) {
    return <div className="text-sm text-amber-300">The game is over.</div>;
  }
  if (viewingAs === 'SPECTATOR') {
    return <div className="text-xs text-sand-100/50 italic">Pick a seat in the player list to act.</div>;
  }

  const panel = (() => {
    switch (view.phase) {
      case 'setup':
        return <SetupPanel view={view} allowed={allowed} viewingAs={viewingAs} />;
      case 'storm':
        return <StormPanel allowed={allowed} viewingAs={viewingAs} />;
      case 'bidding':
        return <BiddingPanel view={view} allowed={allowed} viewingAs={viewingAs} />;
      case 'revival':
        return <RevivalPanel allowed={allowed} viewingAs={viewingAs} />;
      case 'shipmentAndMovement':
        return view.shipmentMovementPhase?.step === 'move' &&
          view.shipmentMovementPhase.current === viewingAs ? (
          <MovementPanel view={view} allowed={allowed} viewingAs={viewingAs} />
        ) : (
          <ShipmentPanel allowed={allowed} viewingAs={viewingAs} />
        );
      case 'battle':
        return <BattleModal view={view} allowed={allowed} viewingAs={viewingAs} />;
      case 'nexus':
        return <AlliancePanel view={view} allowed={allowed} viewingAs={viewingAs} />;
      default:
        return <div className="text-xs text-sand-100/50 italic">This phase resolves automatically.</div>;
    }
  })();

  return (
    <div className="space-y-2">
      {panel}
      {lastError && (
        <button
          onClick={clearError}
          className="w-full text-left text-xs text-red-300 border border-red-800 rounded p-2 bg-red-950/40"
        >
          {lastError} <span className="text-red-400/60">(click to dismiss)</span>
        </button>
      )}
    </div>
  );
}
