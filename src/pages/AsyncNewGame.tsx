import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IMP_LEADER_LIST } from '../imperium/data/leaders';
import { useImpStore } from '../lib/impStore';
import LeaderPortrait from '../components/imp/LeaderPortrait';
import { PLAYER_COLORS } from '../components/imp/visuals';

interface SeatDraft {
  name: string;
  leaderId: string;
}

/**
 * Create an authoritative async game (human seats only). Each seat is played
 * from its own device/tab; the creator is seated first and lands in the game,
 * others join from the lobby by picking their seat.
 */
export default function AsyncNewGame() {
  const navigate = useNavigate();
  const createAsyncGame = useImpStore((s) => s.createAsyncGame);
  const [seats, setSeats] = useState<SeatDraft[]>([
    { name: '', leaderId: 'paulAtreides' },
    { name: '', leaderId: 'baronHarkonnen' },
  ]);
  const [seed, setSeed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taken = seats.map((s) => s.leaderId);
  const ready =
    !busy && seats.length >= 2 && seats.every((s) => s.leaderId) && new Set(taken).size === taken.length;
  const update = (i: number, patch: Partial<SeatDraft>) =>
    setSeats(seats.map((s, j) => (i === j ? { ...s, ...patch } : s)));

  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-start justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold text-sand-300">New async game</h1>
          <Link to="/async" className="text-sm text-sand-100/50 hover:text-sand-200">
            ← lobby
          </Link>
        </header>
        <p className="text-sm text-sand-100/50">
          Authoritative, seat-scoped play: each player acts only on their own turn and sees only their own
          hand. Play every seat on this device by opening the game in separate tabs.
        </p>
        <div className="space-y-2">
          {seats.map((seat, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-sand-100/40 w-6">P{i + 1}</span>
              <LeaderPortrait leaderId={seat.leaderId} size={40} ring={PLAYER_COLORS[i % 4]} />
              <input
                className="input flex-1"
                placeholder={`Player ${i + 1}`}
                value={seat.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <select className="input" value={seat.leaderId} onChange={(e) => update(i, { leaderId: e.target.value })}>
                {IMP_LEADER_LIST.map((l) => (
                  <option key={l.id} value={l.id} disabled={taken.includes(l.id) && l.id !== seat.leaderId}>
                    {l.name}
                  </option>
                ))}
              </select>
              {seats.length > 2 && (
                <button className="btn-secondary" onClick={() => setSeats(seats.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {seats.length < 4 && (
            <button
              className="btn-secondary"
              onClick={() =>
                setSeats([
                  ...seats,
                  { name: '', leaderId: IMP_LEADER_LIST.find((l) => !taken.includes(l.id))?.id ?? '' },
                ])
              }
            >
              + Add seat
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center text-sm">
          <span className="text-sand-100/50">Seed (optional)</span>
          <input
            className="input w-32"
            placeholder="random"
            value={seed}
            onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <button
          className="btn"
          disabled={!ready}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const gameId = await createAsyncGame(
                seats.map((s) => ({ name: s.name, leaderId: s.leaderId })),
                seed ? Number(seed) : undefined,
              );
              navigate(`/async/game/${gameId}?seat=p1`);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Creating…' : 'Create game'}
        </button>
        {error && (
          <div className="text-xs text-red-300 border border-red-800/60 rounded p-2 bg-red-950/40">
            Couldn’t create the game — {error}. Ensure Firestore and Anonymous auth are enabled for this
            Firebase project (see firestore.rules), or set VITE_USE_FIREBASE=false to play locally.
          </div>
        )}
      </div>
    </main>
  );
}
