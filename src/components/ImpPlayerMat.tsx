import { IMP_LEADERS } from '../imperium/data/leaders';
import { IMP_FACTION_INFLUENCE_REWARDS } from '../imperium/data/factions';
import { IMP_CONSTANTS } from '../imperium/data/constants';
import { IMP_FACTIONS, type Gains, type ImpFactionId, type ImpVisibleState, type PlayerId } from '../imperium/types';

const PLAYER_DOTS = ['#2e7d32', '#b71c1c', '#4a148c', '#e65100'];
const FACTION_SHORT: Record<string, string> = {
  emperor: 'EMP',
  spacingGuild: 'GLD',
  beneGesserit: 'BG',
  fremen: 'FRM',
};

/** Short original-wording summary of a step reward's Gains. */
function describeGains(g: Gains): string {
  const parts: string[] = [];
  if (g.solari) parts.push(`+${g.solari} solari`);
  if (g.spice) parts.push(`+${g.spice} spice`);
  if (g.water) parts.push(`+${g.water} water`);
  if (g.troops) parts.push(`+${g.troops} troops`);
  if (g.drawCards) parts.push(`draw ${g.drawCards}`);
  if (g.intrigueCards) parts.push(`+${g.intrigueCards} intrigue`);
  if (g.vp) parts.push(`+${g.vp} VP`);
  return parts.join(', ');
}

/** Tooltip listing a faction track's milestones, marking which the player has passed. */
function factionTrackTooltip(faction: ImpFactionId, current: number, hasAlliance: boolean): string {
  const rewards = IMP_FACTION_INFLUENCE_REWARDS[faction];
  const lines = [`${faction} influence: ${current}`];
  const vpLevels: number[] = [...IMP_CONSTANTS.influenceVpLevels];
  const levels = new Set<number>([
    ...Object.keys(rewards).map(Number),
    ...vpLevels,
    IMP_CONSTANTS.allianceLevel,
  ]);
  for (const level of [...levels].sort((a, b) => a - b)) {
    const bits: string[] = [];
    if (rewards[level]) bits.push(describeGains(rewards[level]!));
    if (vpLevels.includes(level)) bits.push('+1 VP');
    if (level === IMP_CONSTANTS.allianceLevel) bits.push('alliance');
    lines.push(`${current >= level ? '✓' : '•'} L${level}: ${bits.join(', ')}`);
  }
  if (hasAlliance) lines.push('— holds the alliance');
  return lines.join('\n');
}

/** Original-wording summary of a leader's signet-ring ability. */
function describeSignet(leader: (typeof IMP_LEADERS)[string]): string {
  if (leader.signetNote) return `Signet ring: ${leader.signetNote}`;
  const gains = describeGains(leader.signetGains);
  const payParts: string[] = [];
  const c = leader.signetCost ?? {};
  if (c.solari) payParts.push(`${c.solari} solari`);
  if (c.spice) payParts.push(`${c.spice} spice`);
  if (c.water) payParts.push(`${c.water} water`);
  const pay = payParts.length ? ` (pay ${payParts.join(', ')})` : '';
  return `Signet ring: ${gains || 'special effect'}${pay}`;
}

/** Hover text for a leader: its signet ability, passive summaries, and any note-only ability. */
function leaderTooltip(leaderId: string): string {
  const leader = IMP_LEADERS[leaderId];
  const lines = [`◈ ${describeSignet(leader)}`];
  for (const pw of leader.passives ?? []) lines.push(`• ${pw.summary}`);
  if (leader.passiveNote) lines.push(`• ${leader.passiveNote}`);
  return `${leader.name}\n${lines.join('\n')}`;
}

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
              <span className="text-sand-100/40 truncate" title={leaderTooltip(p.leaderId)}>
                {IMP_LEADERS[p.leaderId].name}
              </span>
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
                  title={factionTrackTooltip(f, p.influence[f], view.alliances[f] === pid)}
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
