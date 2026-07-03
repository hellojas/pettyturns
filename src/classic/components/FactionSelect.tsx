import { FACTION_LIST } from '../../game/data/factions';

/** Faction dropdown that hides options already taken by other seats. */
export default function FactionSelect({
  value,
  taken,
  onChange,
}: {
  value: string;
  taken: string[];
  onChange(factionId: string): void;
}) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">faction…</option>
      {FACTION_LIST.map((f) => (
        <option key={f.id} value={f.id} disabled={taken.includes(f.id) && f.id !== value}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
