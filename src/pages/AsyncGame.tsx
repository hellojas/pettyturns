import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ImpBoard from '../components/ImpBoard';
import ImpDecision from '../components/ImpDecision';
import ImpGameOver from '../components/ImpGameOver';
import ImpHand from '../components/ImpHand';
import ImpLog from '../components/ImpLog';
import ImpMarket from '../components/ImpMarket';
import ImpPlayerMat from '../components/ImpPlayerMat';
import LeaderPortrait from '../components/imp/LeaderPortrait';
import { PLAYER_COLORS } from '../components/imp/visuals';
import { Icon } from '../components/imp/icons';
import { getImpTransport, stopAsyncPolling, useImpStore, useImpView } from '../lib/impStore';
import type { PlayerId } from '../imperium/types';

interface SeatOption {
  playerId: PlayerId;
  name: string;
  leaderId: string;
}

/** Seat picker shown when a client opens an async game without choosing a seat. */
function SeatPicker({ gameId }: { gameId: string }) {
  const [seats, setSeats] = useState<SeatOption[] | null>(null);
  useEffect(() => {
    let live = true;
    getImpTransport().checkout(gameId).then((g) => {
      if (!live) return;
      setSeats(
        g
          ? g.initial.playerOrder.map((pid) => ({
              playerId: pid,
              name: g.initial.players[pid].name,
              leaderId: g.initial.players[pid].leaderId,
            }))
          : [],
      );
    });
    return () => {
      live = false;
    };
  }, [gameId]);

  return (
    <main className="min-h-screen bg-dusk-950 text-sand-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <header className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold text-sand-300">Pick your seat</h1>
          <Link to="/async" className="text-sm text-sand-100/50 hover:text-sand-200">
            ← lobby
          </Link>
        </header>
        {seats === null ? (
          <div className="text-sm text-sand-100/40">Loading…</div>
        ) : seats.length === 0 ? (
          <div className="text-sm text-sand-100/40">Game not found on this device.</div>
        ) : (
          <div className="space-y-2">
            {seats.map((s, i) => (
              <Link
                key={s.playerId}
                to={`/async/game/${gameId}?seat=${s.playerId}`}
                className="flex items-center gap-3 bg-dusk-800 rounded px-3 py-2 hover:bg-dusk-700"
              >
                <LeaderPortrait leaderId={s.leaderId} size={36} ring={PLAYER_COLORS[i % 4]} />
                <span className="text-sand-200">{s.name}</span>
                <span className="text-xs text-sand-100/40 ml-auto">play as {s.playerId}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/** Async game screen: same board as hotseat, but seat-scoped and turn-gated. */
export default function AsyncGame() {
  const { gameId } = useParams();
  const [params] = useSearchParams();
  const seat = params.get('seat') as PlayerId | null;

  const debug = params.get('debug') === '1';
  const joinAsyncGame = useImpStore((s) => s.joinAsyncGame);
  const refreshAsync = useImpStore((s) => s.refreshAsync);
  const setViewingAs = useImpStore((s) => s.setViewingAs);
  const setDebugReveal = useImpStore((s) => s.setDebugReveal);
  const lastError = useImpStore((s) => s.lastError);
  const clearError = useImpStore((s) => s.clearError);
  const { full, view, viewingAs, mode, localSeat, syncing, actor, yourTurn } = useImpView();

  useEffect(() => {
    if (gameId && seat) void joinAsyncGame(gameId, seat);
    return () => stopAsyncPolling();
  }, [gameId, seat]);

  // The god view (see every seat's hand) is opt-in via ?debug=1; off by default
  // so each browser only ever sees its own player's cards.
  useEffect(() => {
    setDebugReveal(debug);
    return () => setDebugReveal(false);
  }, [debug]);

  if (!seat) return <SeatPicker gameId={gameId ?? ''} />;

  const joined = mode === 'async' && !!view && !!full && full.gameId === gameId && localSeat === seat;
  if (!joined) {
    return (
      <main className="min-h-screen bg-dusk-950 text-sand-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div>Joining game…</div>
          <Link to="/async" className="text-sand-300 underline">
            Back to lobby
          </Link>
        </div>
      </main>
    );
  }

  const finished = view.phase === 'finished';
  const actorName = actor ? view.players[actor]?.name : null;
  // Gate interaction to this seat's turn (a pending decision you own counts as your turn).
  const interactive = yourTurn && !finished;

  return (
    <main className="min-h-screen bg-arrakis-night text-sand-100 p-4">
      <div className="max-w-[1760px] mx-auto">
        <header className="flex items-baseline gap-4 mb-3 flex-wrap">
          <Link to="/async" className="text-sand-300 font-semibold hover:underline">
            Async · Imperium
          </Link>
          <span className="text-xs text-sand-100/40">game {view.gameId}</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-sand-100/50">
            you are
            <LeaderPortrait leaderId={view.players[seat].leaderId} size={20} />
            <span className="text-sand-200">{view.players[seat].name}</span>
          </span>
          {finished && view.winner ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-300 font-semibold">
              <LeaderPortrait leaderId={view.players[view.winner].leaderId} size={22} />
              Game over — {view.players[view.winner].name} wins!
            </span>
          ) : yourTurn ? (
            <span className="text-sm text-emerald-300 font-semibold">● Your move</span>
          ) : (
            <span className="text-sm text-sand-100/50">Waiting for {actorName ?? '…'}</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {debug && (
              <span
                className="text-[11px] font-semibold text-amber-300 border border-amber-600/60 rounded px-1.5 py-0.5"
                title="?debug=1 — every seat's hand is visible on this device. Remove ?debug=1 for the real per-seat view."
              >
                👁 DEBUG: all hands visible
              </span>
            )}
            {syncing && <span className="text-xs text-sand-100/40">syncing…</span>}
            <button
              className="btn-secondary !py-0.5 !px-2 inline-flex items-center gap-1"
              onClick={() => void refreshAsync()}
              title="Check for opponents' moves now"
            >
              <Icon name="refresh" size={12} /> Refresh
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_320px] gap-4">
          <div className="space-y-4">
            {finished && (
              <section className="panel border-amber-600">
                <h2 className="panel-title">Final results</h2>
                <ImpGameOver view={view} />
              </section>
            )}
            <section className="panel">
              <h2 className="panel-title">Players</h2>
              <ImpPlayerMat view={view} viewingAs={viewingAs} onViewAs={debug ? setViewingAs : () => {}} />
            </section>
          </div>

          <div className={interactive ? '' : 'pointer-events-none opacity-90'}>
            <ImpBoard view={view} viewingAs={viewingAs} />
          </div>

          <div className="space-y-4">
            {view.pendingDecisions.length > 0 && (
              <section className={`panel border-amber-600 ${interactive ? '' : 'pointer-events-none opacity-90'}`}>
                <h2 className="panel-title">Decision</h2>
                <ImpDecision view={view} viewingAs={viewingAs} />
              </section>
            )}
            <section className={`panel border-sand-600 ${interactive ? '' : 'pointer-events-none opacity-70'}`}>
              <h2 className="panel-title">Your cards</h2>
              <ImpHand view={view} viewingAs={viewingAs} />
            </section>
            <section className={`panel ${interactive ? '' : 'pointer-events-none opacity-70'}`}>
              <h2 className="panel-title">Market</h2>
              <ImpMarket view={view} viewingAs={viewingAs} />
            </section>
            <section className="panel">
              <h2 className="panel-title">Log</h2>
              <ImpLog view={view} />
            </section>
          </div>
        </div>

        {!yourTurn && !finished && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-sand-100/60 bg-dusk-800/90 border border-dusk-700 rounded-full px-4 py-1.5">
            Waiting for {actorName ?? 'another player'} — this updates automatically.
          </div>
        )}

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
