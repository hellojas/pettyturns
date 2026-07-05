import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ImpBoard from '../components/ImpBoard';
import ImpConflict from '../components/ImpConflict';
import ImpDecision from '../components/ImpDecision';
import ImpHand from '../components/ImpHand';
import ImpLog from '../components/ImpLog';
import ImpMarket from '../components/ImpMarket';
import ImpPlayerMat from '../components/ImpPlayerMat';
import { useImpStore, useImpView } from '../lib/impStore';

/** Main game screen: players/conflict left, board center, hand/market/log right. */
export default function Game() {
  const { gameId } = useParams();
  const loadGame = useImpStore((s) => s.loadGame);
  const setViewingAs = useImpStore((s) => s.setViewingAs);
  const lastError = useImpStore((s) => s.lastError);
  const clearError = useImpStore((s) => s.clearError);
  const undo = useImpStore((s) => s.undo);
  const redo = useImpStore((s) => s.redo);
  const { full, view, viewingAs, canUndo, canRedo } = useImpView();

  useEffect(() => {
    if (gameId && (!full || full.gameId !== gameId)) loadGame(gameId);
  }, [gameId]);

  if (!view || !full) {
    return (
      <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div>Game not found on this device.</div>
          <Link to="/" className="text-sand-300 underline">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 p-4">
      <div className="max-w-[1500px] mx-auto">
        <header className="flex items-baseline gap-4 mb-3">
          <Link to="/" className="text-sand-300 font-semibold hover:underline">
            Imperium Engine
          </Link>
          <span className="text-xs text-sand-100/40">game {view.gameId}</span>
          {view.phase === 'finished' && view.winner && (
            <span className="text-sm text-amber-300 font-semibold">
              Game over — {view.players[view.winner].name} wins!
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex gap-1">
              <button
                className="btn-secondary !py-0.5 !px-2 disabled:opacity-40"
                disabled={!canUndo}
                onClick={undo}
                title="Undo the last action"
              >
                ↶ Undo
              </button>
              <button
                className="btn-secondary !py-0.5 !px-2 disabled:opacity-40"
                disabled={!canRedo}
                onClick={redo}
                title="Redo"
              >
                ↷ Redo
              </button>
            </div>
            <span className="text-xs text-sand-100/40">
              viewing as{' '}
              <span className="text-sand-200">
                {viewingAs === 'SPECTATOR' ? 'spectator' : view.players[viewingAs].name}
              </span>
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4">
          <div className="space-y-4">
            <section className="panel">
              <h2 className="panel-title">Players</h2>
              <ImpPlayerMat view={view} viewingAs={viewingAs} onViewAs={setViewingAs} />
            </section>
            <section className="panel">
              <h2 className="panel-title">Conflict</h2>
              <ImpConflict view={view} viewingAs={viewingAs} />
            </section>
          </div>

          <div>
            <ImpBoard view={view} viewingAs={viewingAs} />
          </div>

          <div className="space-y-4">
            {view.pendingDecisions.length > 0 && (
              <section className="panel border-amber-600">
                <h2 className="panel-title">Decision</h2>
                <ImpDecision view={view} viewingAs={viewingAs} />
              </section>
            )}
            {viewingAs !== 'SPECTATOR' && (
              <section className="panel border-sand-600">
                <h2 className="panel-title">Your cards</h2>
                <ImpHand view={view} viewingAs={viewingAs} />
              </section>
            )}
            <section className="panel">
              <h2 className="panel-title">Market</h2>
              <ImpMarket view={view} viewingAs={viewingAs} />
            </section>
            <section className="panel">
              <h2 className="panel-title">Log</h2>
              <ImpLog view={view} />
            </section>
          </div>
        </div>

        {lastError && (
          <button
            onClick={clearError}
            className="fixed bottom-4 right-4 text-left text-xs text-red-300 border border-red-800 rounded p-2 bg-red-950/90 max-w-sm"
          >
            {lastError} <span className="text-red-400/60">(click to dismiss)</span>
          </button>
        )}
      </div>
    </main>
  );
}
