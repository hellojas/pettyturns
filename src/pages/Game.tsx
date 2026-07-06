import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ImpBoard from '../components/ImpBoard';
import ImpConflict from '../components/ImpConflict';
import ImpDecision from '../components/ImpDecision';
import ImpGameOver from '../components/ImpGameOver';
import ImpHand from '../components/ImpHand';
import ImpLog from '../components/ImpLog';
import ImpMarket from '../components/ImpMarket';
import ImpPlayerMat from '../components/ImpPlayerMat';
import LeaderPortrait from '../components/imp/LeaderPortrait';
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
  const runBots = useImpStore((s) => s.runBots);
  const setAutoRun = useImpStore((s) => s.setAutoRun);
  const { full, view, viewingAs, canUndo, canRedo, botToMove, botSeats, autoRun } = useImpView();

  useEffect(() => {
    if (gameId && (!full || full.gameId !== gameId)) loadGame(gameId);
  }, [gameId]);

  if (!view || !full) {
    return (
      <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-center justify-center p-6">
        <div
          className="relative overflow-hidden rounded-2xl px-8 py-10 max-w-sm text-center"
          style={{
            background: 'radial-gradient(120% 90% at 50% -20%, #3a2a1a, #17110b 72%)',
            border: '1px solid #7b422277',
            boxShadow: 'inset 0 0 60px -18px #000',
          }}
        >
          <div className="tex-spice absolute inset-0 pointer-events-none opacity-60" aria-hidden />
          <div className="relative space-y-3">
            <div className="font-display text-2xl font-bold text-sand-300 tracking-wide">Lost to the sands</div>
            <p className="text-sm text-sand-100/60">
              No game with this id lives on this device. Saved games are stored locally in this browser.
            </p>
            <Link to="/" className="btn inline-block mt-1">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 p-4">
      <div className="max-w-[1500px] mx-auto">
        <header className="flex items-baseline gap-4 mb-3">
          <Link to="/" className="font-display text-lg font-bold text-sand-300 hover:underline tracking-wide">
            Imperium Engine
          </Link>
          <span className="text-xs text-sand-100/40">game {view.gameId}</span>
          {view.phase === 'finished' && view.winner && (
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-300 font-semibold">
              <LeaderPortrait leaderId={view.players[view.winner].leaderId} size={22} />
              Game over — {view.players[view.winner].name} wins!
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {botSeats.length > 0 && (
              <label className="flex items-center gap-1 text-xs text-sand-100/60" title="Bots play their turns automatically">
                <input type="checkbox" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} />
                Auto bots
              </label>
            )}
            {botToMove && view.phase !== 'finished' && (
              <button className="btn !py-0.5 !px-2" onClick={runBots} title="Let the AI take its turn(s) now">
                {autoRun ? '▶ Bot thinking…' : '▶ Play bot turn'}
              </button>
            )}
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
            <span className="inline-flex items-center gap-1.5 text-xs text-sand-100/40">
              viewing as
              {viewingAs !== 'SPECTATOR' && <LeaderPortrait leaderId={view.players[viewingAs].leaderId} size={20} />}
              <span className="text-sand-200">
                {viewingAs === 'SPECTATOR' ? 'spectator' : view.players[viewingAs].name}
              </span>
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_300px] gap-4">
          <div className="space-y-4">
            {view.phase === 'finished' && (
              <section className="panel border-amber-600">
                <h2 className="panel-title">Final results</h2>
                <ImpGameOver view={view} />
              </section>
            )}
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
