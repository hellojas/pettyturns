import FactionSelect from './FactionSelect';

export interface SeatDraft {
  name: string;
  factionId: string;
}

/** Seat editor for a new game: 2–6 named seats with unique factions. */
export default function LobbyPanel({
  seats,
  onChange,
}: {
  seats: SeatDraft[];
  onChange(seats: SeatDraft[]): void;
}) {
  const taken = seats.map((s) => s.factionId).filter(Boolean);
  const update = (i: number, patch: Partial<SeatDraft>) =>
    onChange(seats.map((s, j) => (i === j ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-2">
      {seats.map((seat, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-sand-100/40 w-6">P{i + 1}</span>
          <input
            className="input flex-1"
            placeholder={`Player ${i + 1}`}
            value={seat.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <FactionSelect value={seat.factionId} taken={taken} onChange={(factionId) => update(i, { factionId })} />
          {seats.length > 2 && (
            <button className="btn-secondary" onClick={() => onChange(seats.filter((_, j) => j !== i))}>
              ✕
            </button>
          )}
        </div>
      ))}
      {seats.length < 6 && (
        <button className="btn-secondary" onClick={() => onChange([...seats, { name: '', factionId: '' }])}>
          + Add seat
        </button>
      )}
    </div>
  );
}
