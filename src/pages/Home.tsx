import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteSavedGame, listSavedGames } from '../lib/store';

/** Landing page: resume a saved game or start a new one. */
export default function Home() {
  const navigate = useNavigate();
  const [games, setGames] = useState(listSavedGames());

  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-start justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-sand-300">Desert Power</h1>
          <p className="text-sand-100/60 text-sm mt-1">
            Private tabletop engine for owners of the physical game. Hotseat now; async multiplayer later.
          </p>
        </header>
        <Link to="/new" className="btn inline-block">
          Start a new game
        </Link>
        <section>
          <h2 className="text-sand-100/50 uppercase text-xs tracking-wide mb-2">Saved games</h2>
          {games.length === 0 ? (
            <div className="text-sm text-sand-100/40 italic">No games yet.</div>
          ) : (
            <div className="space-y-1">
              {games.map((g) => (
                <div key={g.gameId} className="flex items-center gap-3 bg-dusk-800 rounded px-3 py-2 text-sm">
                  <button className="flex-1 text-left" onClick={() => navigate(`/game/${g.gameId}`)}>
                    <span className="text-sand-200">{g.players.join(', ')}</span>
                    <span className="text-sand-100/40 ml-2">
                      round {g.round} · {g.phase}
                    </span>
                  </button>
                  <button
                    className="text-sand-100/30 hover:text-red-400"
                    onClick={() => {
                      deleteSavedGame(g.gameId);
                      setGames(listSavedGames());
                    }}
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
