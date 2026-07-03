import { IMP_LEADERS } from '../imperium/data/leaders';
import { IMP_FACTIONS, type ImpVisibleState, type PlayerId } from '../imperium/types';

const PLAYER_DOTS = ['#2e7d32', '#b71c1c', '#4a148c', '#e65100'];
const FACTION_SHORT: Record<string, string> = {
  emperor: 'EMP',
  spacingGuild: 'GLD',
  beneGesserit: 'BG',
  fremen: 'FRM',
};

/** All player mats: resources, VP, influence tracks, garrison, seat switcher. */
export default function ImpPlayerMat({
  view,
  viewingAs,
  onViewAs,
}: {
  view: ImpVisibleState;
  viewingAs: PlayerId | 'SPECTATOR';
  onViewAs(viewer: PlayerId | 'SPECTATOR'): void;
}) {
  return (
    <div className="space-y-1.5">
      {view.playerOrder.map((pid, idx) => {
        const p = view.players[pid];
        const other = view.hidden.others[pid];
        const handCount = pid === viewingAs ? view.hidden.self?.hand.length ?? 0 : other?.handCount ?? 0;
        const intrigueCount =
          pid === viewingAs ? view.hidden.self?.intrigue.length ?? 0 : other?.intrigueCount ?? 0;
        const isTurn = view.turn === pid;
        return (
          <button
            key={pid}
            onClick={() => onViewAs(pid)}
            className={`w-full text-left rounded border px-2 py-1.5 text-xs transition-colors ${
              viewingAs === pid ? 'border-sand-400 bg-dusk-900' : 'border-transparent bg-dusk-900/60 hover:border-sand-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: PLAYER_DOTS[idx] }} />
              <span className="font-semibold text-sand-200 truncate">{p.name}</span>
              <span className="text-sand-100/40 truncate">{IMP_LEADERS[p.leaderId].name}</span>
              {pid === view.firstPlayer && <span title="first player">▸</span>}
              {isTurn && <span className="ml-auto text-amber-400 font-semibold shrink-0">● to act</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sand-100/60">
              <span className="text-sand-200 font-semibold">{p.vp} VP</span>
              <span>◉ {p.spice}</span>
              <span>$ {p.solari}</span>
              <span>💧 {p.water}</span>
              <span>⚔ {p.garrison}{p.inConflict > 0 ? ` (+${p.inConflict} in conflict)` : ''}</span>
              <span>agents {p.agentsLeft}/{p.agentsTotal + (p.hasMentat ? 1 : 0)}</span>
              <span>cards {handCount}</span>
              <span>intrigue {intrigueCount}</span>
            </div>
            <div className="mt-0.5 flex gap-2 text-[10px]">
              {IMP_FACTIONS.map((f) => (
                <span
                  key={f}
                  className={view.alliances[f] === pid ? 'text-amber-300 font-bold' : 'text-sand-100/50'}
                  title={`${f} influence${view.alliances[f] === pid ? ' — holds the alliance' : ''}`}
                >
                  {FACTION_SHORT[f]} {p.influence[f]}
                  {view.alliances[f] === pid ? '★' : ''}
                </span>
              ))}
              {p.hasCouncilSeat && <span className="text-sand-300">council</span>}
              {p.hasSwordmaster && <span className="text-sand-300">swordmaster</span>}
              {p.controls.map((c) => (
                <span key={c} className="text-sky-300">
                  {c}
                </span>
              ))}
            </div>
          </button>
        );
      })}
      <button
        onClick={() => onViewAs('SPECTATOR')}
        className={`w-full text-left rounded border px-2 py-1 text-xs ${
          viewingAs === 'SPECTATOR' ? 'border-sand-400 bg-dusk-900' : 'border-transparent bg-dusk-900/60 hover:border-sand-800'
        }`}
      >
        <span className="text-sand-100/60">Spectator view (public info only)</span>
      </button>
    </div>
  );
}
