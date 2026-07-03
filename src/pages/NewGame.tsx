import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LobbyPanel, { type SeatDraft } from '../components/LobbyPanel';
import { useGameStore } from '../lib/store';

/** Game creation: 2–6 seats, unique factions, optional seed for reproducibility. */
export default function NewGame() {
  const navigate = useNavigate();
  const newGame = useGameStore((s) => s.newGame);
  const [seats, setSeats] = useState<SeatDraft[]>([
    { name: '', factionId: 'atreides' },
    { name: '', factionId: 'harkonnen' },
  ]);
  const [seed, setSeed] = useState('');

  const ready = seats.length >= 2 && seats.every((s) => s.factionId);

  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-start justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold text-sand-300">New game</h1>
          <Link to="/" className="text-sm text-sand-100/50 hover:text-sand-200">
            ← back
          </Link>
        </header>
        <LobbyPanel seats={seats} onChange={setSeats} />
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
              seats.map((s) => ({ name: s.name, factionId: s.factionId })),
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
