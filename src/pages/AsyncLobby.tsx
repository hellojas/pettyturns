import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteAsyncGame, listAsyncGames } from '../lib/impStore';
import type { ImpGameSummary } from '../imperium/net';

/** Async multiplayer lobby: create a game, or resume/join an existing one. */
export default function AsyncLobby() {
  const navigate = useNavigate();
  const [games, setGames] = useState<ImpGameSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = () =>
    listAsyncGames()
      .then((g) => {
        setGames(g);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="min-h-screen bg-dusk-950 text-sand-100 flex items-start justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold text-sand-300">Async multiplayer</h1>
          <Link to="/" className="text-sm text-sand-100/50 hover:text-sand-200">
            ← home
          </Link>
        </header>
        <p className="text-sm text-sand-100/50">
          Authoritative games persisted on this device. Each seat plays from its own tab; the game validates
          every move server-side and reveals only your own hand. Open a game and pick your seat to play.
        </p>
        <Link to="/async/new" className="btn inline-block">
          Create async game
        </Link>
        {error && (
          <div className="text-xs text-red-300 border border-red-800/60 rounded p-2 bg-red-950/40">
            Game server unavailable — {error}. Check that Firestore and Anonymous auth are enabled for this
            Firebase project (see firestore.rules).
          </div>
        )}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sand-100/50 uppercase text-xs tracking-wide">Games</h2>
            <button className="text-xs text-sand-100/40 hover:text-sand-200" onClick={refresh}>
              refresh
            </button>
          </div>
          {games.length === 0 ? (
            <div className="text-sm text-sand-100/40 italic">No async games yet.</div>
          ) : (
            <div className="space-y-1">
              {games.map((g) => (
                <div key={g.gameId} className="flex items-center gap-3 bg-dusk-800 rounded px-3 py-2 text-sm">
                  <button className="flex-1 text-left" onClick={() => navigate(`/async/game/${g.gameId}`)}>
                    <span className="text-sand-200">{g.players.join(', ')}</span>
                    <span className="text-sand-100/40 ml-2">
                      round {g.round} · {g.phase} · {g.cursor} moves
                    </span>
                  </button>
                  <button
                    className="text-sand-100/30 hover:text-red-400"
                    onClick={async () => {
                      await deleteAsyncGame(g.gameId);
                      await refresh();
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
