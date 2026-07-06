import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IMP_LEADER_LIST } from '../imperium/data/leaders';
import { useImpStore } from '../lib/impStore';
import LeaderPortrait from '../components/imp/LeaderPortrait';
import { PLAYER_COLORS } from '../components/imp/visuals';

interface SeatDraft {
  name: string;
  leaderId: string;
  isBot?: boolean;
}

/** Game creation: 2–4 seats, unique leaders, optional seed. */
export default function NewGame() {
  const navigate = useNavigate();
  const newGame = useImpStore((s) => s.newGame);
  const [seats, setSeats] = useState<SeatDraft[]>([
    { name: '', leaderId: 'paulAtreides' },
    { name: '', leaderId: 'baronHarkonnen' },
  ]);
  const [seed, setSeed] = useState('');

  const taken = seats.map((s) => s.leaderId);
  const ready = seats.length >= 2 && seats.every((s) => s.leaderId) && new Set(taken).size === taken.length;
  const update = (i: number, patch: Partial<SeatDraft>) =>
    setSeats(seats.map((s, j) => (i === j ? { ...s, ...patch } : s)));

  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-start justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-bold text-sand-300 tracking-wide">New game</h1>
          <Link to="/" className="text-sm text-sand-100/50 hover:text-sand-200">
            ← back
          </Link>
        </header>
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
              <label className="flex items-center gap-1 text-xs text-sand-100/60" title="Let the AI play this seat">
                <input type="checkbox" checked={!!seat.isBot} onChange={(e) => update(i, { isBot: e.target.checked })} />
                Bot
              </label>
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
          onClick={() => {
            const gameId = newGame(
              seats.map((s) => ({ name: s.name, leaderId: s.leaderId, isBot: s.isBot })),
              seed ? Number(seed) : undefined,
            );
            navigate(`/game/${gameId}`);
          }}
        >
          Begin
        </button>
      </div>
    </main>
  );
}
