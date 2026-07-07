import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteImpGame, listImpGames } from '../lib/impStore';
import { IMP_LEADER_LIST } from '../imperium/data/leaders';
import LeaderPortrait from '../components/imp/LeaderPortrait';
import { RegionBackdrop } from '../components/imp/art';
import { PLAYER_COLORS } from '../components/imp/visuals';
import { Icon } from '../components/imp/icons';

/** Landing page: resume or start an Imperium game; the classic engine lives at /classic. */
export default function Home() {
  const navigate = useNavigate();
  const [games, setGames] = useState(listImpGames());

  return (
    <main className="min-h-screen bg-arrakis-night text-sand-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl space-y-6 py-8">
        {/* Hero */}
        <header
          className="relative overflow-hidden rounded-2xl px-6 pt-8 pb-16"
          style={{
            background: 'radial-gradient(120% 90% at 50% -20%, #3a2a1a, #17110b 72%)',
            border: '1px solid #7b422277',
            boxShadow: 'inset 0 0 60px -18px #000',
          }}
        >
          <div className="tex-spice absolute inset-0 pointer-events-none opacity-60" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-24">
            <RegionBackdrop scene="dunes" color="#cd8630" opacity={0.5} />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 text-sand-300/70">
              <Icon name="spice" size={16} />
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.3em]">Arrakis</span>
            </div>
            <h1
              className="font-display font-bold tracking-wide text-4xl sm:text-5xl mt-1"
              style={{
                background: 'linear-gradient(180deg, #f7ecd7, #e3bd78 55%, #b56b26)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Imperium Engine
            </h1>
            <p className="text-sand-100/60 text-sm mt-2 max-w-md">
              A private deck-building &amp; agent-placement companion for owners of the physical game.
              Play hotseat with bots, or async where each player takes their own seat.
            </p>

            {/* Leader gallery */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {IMP_LEADER_LIST.map((l, i) => (
                <LeaderPortrait key={l.id} leaderId={l.id} size={34} ring={PLAYER_COLORS[i % 4]} />
              ))}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Link to="/new" className="btn inline-flex items-center gap-1.5 !px-4 !py-2 !text-base">
                <Icon name="sword" size={16} color="#1c150f" /> Start a new game
              </Link>
              <Link to="/async" className="btn-secondary inline-flex items-center !px-4 !py-2 !text-base">
                Async multiplayer
              </Link>
              <Link to="/classic" className="text-sm text-sand-100/50 hover:text-sand-200 underline">
                classic engine →
              </Link>
            </div>
          </div>
        </header>

        {/* How it works */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: 'draw' as const,
              title: 'Build your deck',
              body: 'Buy Imperium cards each round to sharpen your engine of spice, coin, and combat.',
            },
            {
              icon: 'landsraad' as const,
              title: 'Place your agents',
              body: 'Send agents to board spaces for resources, influence, and troops — timing is everything.',
            },
            {
              icon: 'sword' as const,
              title: 'Win the conflict',
              body: 'Commit troops, break alliances, and race rivals to 10 victory points.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-sand-900/60 bg-dusk-850 p-4 hover:border-sand-700/70 transition-colors"
            >
              <div
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2"
                style={{ background: '#e3bd7814', boxShadow: 'inset 0 0 0 1px #e3bd7833' }}
              >
                <Icon name={f.icon} size={18} />
              </div>
              <h3 className="font-display font-semibold text-sand-200 text-sm">{f.title}</h3>
              <p className="text-xs text-sand-100/55 mt-1 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Saved games */}
        <section>
          <h2 className="panel-title">Saved games</h2>
          {games.length === 0 ? (
            <div
              className="rounded-lg border border-dashed border-sand-800/60 px-4 py-6 text-center text-sm text-sand-100/40"
            >
              No games yet — <Link to="/new" className="text-sand-300 underline">begin your first</Link>.
            </div>
          ) : (
            <div className="space-y-1.5">
              {games.map((g) => (
                <div
                  key={g.gameId}
                  className="flex items-center gap-3 rounded-lg border border-sand-900/60 bg-dusk-800 px-3 py-2 text-sm hover:border-sand-700 transition-colors"
                >
                  <button className="flex-1 flex items-center gap-3 text-left" onClick={() => navigate(`/game/${g.gameId}`)}>
                    <div className="flex -space-x-2 shrink-0">
                      {(g.leaders ?? []).slice(0, 4).map((lid, i) => (
                        <LeaderPortrait key={i} leaderId={lid} size={26} ring={PLAYER_COLORS[i % 4]} />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sand-200 truncate">{g.players.join(', ')}</div>
                      <div className="text-sand-100/40 text-xs">
                        round {g.round} · {g.phase}
                      </div>
                    </div>
                  </button>
                  <button
                    className="text-sand-100/30 hover:text-red-400 text-xs"
                    onClick={() => {
                      deleteImpGame(g.gameId);
                      setGames(listImpGames());
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
