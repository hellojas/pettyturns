import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Board from '../components/Board';
import TerritoryPopover from '../components/TerritoryPopover';
import PhasePanel from '../components/PhasePanel';
import PlayerPanel from '../components/PlayerPanel';
import ActionPanel from '../components/ActionPanel';
import GameLog from '../components/GameLog';
import PrivateInfoPanel from '../components/PrivateInfoPanel';
import { useGameStore, useGameView, waitingOn } from '../lib/store';

/** Main game screen: board center, status left, actions and private info right. */
export default function Game() {
  const { gameId } = useParams();
  const loadGame = useGameStore((s) => s.loadGame);
  const setViewingAs = useGameStore((s) => s.setViewingAs);
  const selectCell = useGameStore((s) => s.selectCell);
  const selected = useGameStore((s) => s.selectedCell);
  const { full, view, allowed, viewingAs } = useGameView();

  useEffect(() => {
    if (gameId && (!full || full.gameId !== gameId)) loadGame(gameId);
  }, [gameId]);

  if (!view || !full) {
    return (
      <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div>Game not found on this device.</div>
          <Link to="/classic" className="text-sand-300 underline">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const waiting = waitingOn(full);
  const waitingNames = waiting.map((pid) => view.players[pid].name);

  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 p-4">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex items-baseline gap-4 mb-3">
          <Link to="/classic" className="text-sand-300 font-semibold hover:underline">
            Desert Power
          </Link>
          <span className="text-xs text-sand-100/40">game {view.gameId}</span>
          <span className="text-xs text-sand-100/40 ml-auto">
            viewing as{' '}
            <span className="text-sand-200">
              {viewingAs === 'SPECTATOR' ? 'spectator' : view.players[viewingAs].name}
            </span>
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4">
          {/* left: status */}
          <div className="space-y-4">
            <section className="panel">
              <PhasePanel view={view} waiting={waitingNames} />
            </section>
            <section className="panel">
              <h2 className="panel-title">Players</h2>
              <PlayerPanel view={view} viewingAs={viewingAs} waiting={waiting} onViewAs={setViewingAs} />
            </section>
            <section className="panel">
              <h2 className="panel-title">Territory</h2>
              <TerritoryPopover view={view} selected={selected} />
            </section>
          </div>

          {/* center: board */}
          <div className="flex items-start justify-center">
            <Board view={view} selected={selected} onSelect={selectCell} />
          </div>

          {/* right: actions + private info + log */}
          <div className="space-y-4">
            <section className="panel border-sand-600">
              <h2 className="panel-title">Your move</h2>
              <ActionPanel view={view} allowed={allowed} viewingAs={viewingAs} />
            </section>
            <section className="panel">
              <h2 className="panel-title">Private</h2>
              <PrivateInfoPanel view={view} />
            </section>
            <section className="panel">
              <h2 className="panel-title">Log</h2>
              <GameLog view={view} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
