import { IMP_CONFLICT_DEFS } from '../imperium/data/conflicts';
import { combatStrength } from '../imperium/engine/engine';
import type { ImpVisibleState, PlayerId } from '../imperium/types';
import { useImpStore } from '../lib/impStore';

function gainsText(g: Record<string, unknown>): string {
  const parts: string[] = [];
  if (g.vp) parts.push(`${g.vp} VP`);
  if (g.spice) parts.push(`${g.spice}◉`);
  if (g.solari) parts.push(`${g.solari}$`);
  if (g.water) parts.push(`${g.water}💧`);
  if (g.intrigueCards) parts.push(`${g.intrigueCards} intrigue`);
  if (g.anyInfluence) parts.push(`${g.anyInfluence} influence`);
  if (g.control) parts.push(`control ${g.control}`);
  return parts.join(', ') || '—';
}

/** Current conflict card, committed strength, and the combat window controls. */
export default function ImpConflict({ view, viewingAs }: { view: ImpVisibleState; viewingAs: PlayerId | 'SPECTATOR' }) {
  const dispatch = useImpStore((s) => s.dispatch);
  const full = useImpStore((s) => s.state);
  const conflict = view.currentConflict ? IMP_CONFLICT_DEFS[view.currentConflict] : null;
  if (!conflict) return <div className="text-xs text-sand-100/40 italic">No conflict.</div>;

  const combatants = view.playerOrder.filter((pid) => view.players[pid].inConflict > 0);
  const myWindow = view.phase === 'combat' && view.turn === viewingAs;

  return (
    <div className="space-y-2 text-xs">
      <div>
        <span className="font-semibold text-sand-200">{conflict.name}</span>
        <span className="text-sand-100/40 ml-2">round {view.round} of {view.maxRounds}</span>
      </div>
      <div className="space-y-0.5">
        {conflict.rewards.map((r) => (
          <div key={r.place} className="flex gap-2">
            <span className="text-sand-300 w-8">{r.place === 1 ? '1st' : r.place === 2 ? '2nd' : '3rd'}</span>
            <span className="text-sand-100/70">{gainsText(r.gains as Record<string, unknown>)}</span>
          </div>
        ))}
      </div>
      {combatants.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-sand-100/50 uppercase tracking-wide">Committed</div>
          {combatants.map((pid) => (
            <div key={pid} className="flex gap-2">
              <span className="text-sand-200">{view.players[pid].name}</span>
              <span className="text-sand-100/60">
                {view.players[pid].inConflict} troop(s)
                {full ? ` — strength ${combatStrength(full, pid)}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      {view.phase === 'combat' && (
        <div className="rounded border border-red-900/60 bg-red-950/20 p-2 space-y-1">
          <div className="text-red-300 font-semibold">Combat!</div>
          {myWindow ? (
            <button className="btn" onClick={() => dispatch({ type: 'imp/combatPass', playerId: viewingAs as PlayerId })}>
              Pass (or play a combat intrigue from your hand panel)
            </button>
          ) : (
            <div className="text-sand-100/60">
              Waiting for {view.turn ? view.players[view.turn].name : 'resolution'}…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
