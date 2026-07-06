import { IMP_LEADERS } from '../imperium/data/leaders';
import { IMP_FACTION_INFLUENCE_REWARDS } from '../imperium/data/factions';
import { IMP_CONSTANTS } from '../imperium/data/constants';
import { IMP_FACTIONS, type Gains, type ImpFactionId, type ImpVisibleState, type PlayerId } from '../imperium/types';
import { Icon, type IconName } from './imp/icons';
import { PLAYER_COLORS } from './imp/visuals';
import LeaderPortrait from './imp/LeaderPortrait';

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
  const gains = describeGains(leader.signetGains);
  const cost = leader.signetCost && Object.keys(leader.signetCost).length > 0;
  return `Signet ring: ${gains || 'special effect'}${cost ? ' (has a cost)' : ''}`;
}

/** Hover text for a leader: its signet ability, passive summaries, and any note-only ability. */
function leaderTooltip(leaderId: string): string {
  const leader = IMP_LEADERS[leaderId];
  if (!leader) return leaderId;
  const lines = [`◈ ${describeSignet(leader)}`];
  for (const pw of leader.passives ?? []) lines.push(`• ${pw.summary}`);
  if (leader.passiveNote) lines.push(`• ${leader.passiveNote}`);
  return `${leader.name}\n${lines.join('\n')}`;
}

/** A resource read-out: icon + tabular value. */
function Stat({ icon, value, title, color }: { icon: IconName; value: string; title: string; color?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={title}>
      <Icon name={icon} size={13} color={color} />
      <span className="text-[11px] font-semibold tabular-nums text-sand-100/85">{value}</span>
    </span>
  );
}

/** All player boards: portrait, leader, resources, influence, garrison, seat switcher. */
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
    <div className="space-y-2">
      {view.playerOrder.map((pid, idx) => {
        const p = view.players[pid];
        const seat = PLAYER_COLORS[idx % 4];
        const other = view.hidden.others[pid];
        const handCount = pid === viewingAs ? view.hidden.self?.hand.length ?? 0 : other?.handCount ?? 0;
        const intrigueCount =
          pid === viewingAs ? view.hidden.self?.intrigue.length ?? 0 : other?.intrigueCount ?? 0;
        const isTurn = view.turn === pid;
        const active = viewingAs === pid;
        const leader = IMP_LEADERS[p.leaderId];
        const totalAgents = p.agentsTotal + (p.hasMentat ? 1 : 0);
        return (
          <button
            key={pid}
            onClick={() => onViewAs(pid)}
            className="w-full text-left rounded-lg overflow-hidden border transition-all hover:-translate-y-px"
            style={{
              borderColor: active ? seat : `${seat}44`,
              background: active
                ? `linear-gradient(150deg, #241b13, #191108), radial-gradient(120% 120% at 0% 0%, ${seat}2e, transparent 55%)`
                : '#1c150f',
              boxShadow: isTurn ? `0 0 0 1px ${seat}, 0 0 12px -4px ${seat}` : undefined,
            }}
          >
            {/* Seat color spine */}
            <div className="flex gap-2 p-2">
              <div className="relative shrink-0">
                <LeaderPortrait leaderId={p.leaderId} size={46} ring={seat} />
                {pid === view.firstPlayer && (
                  <span
                    className="absolute -top-1 -left-1 text-[9px] leading-none px-1 py-0.5 rounded-full font-bold"
                    style={{ background: '#e3bd78', color: '#1c150f' }}
                    title="first player this round"
                  >
                    1st
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[13px] text-sand-100 truncate">{p.name}</span>
                  {isTurn && (
                    <span className="ml-auto text-[10px] font-semibold shrink-0" style={{ color: seat }}>
                      ● to act
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-sand-100/55 truncate" title={leaderTooltip(p.leaderId)}>
                  {leader?.name ?? p.leaderId}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  <span
                    className="inline-flex items-center gap-0.5 rounded px-1 font-bold text-[11px]"
                    style={{ background: '#f2c94c22', color: '#f2c94c' }}
                    title="victory points"
                  >
                    <Icon name="vp" size={13} /> {p.vp}
                  </span>
                  <Stat icon="spice" value={`${p.spice}`} title="spice" />
                  <Stat icon="solari" value={`${p.solari}`} title="solari" />
                  <Stat icon="water" value={`${p.water}`} title="water" />
                  <Stat
                    icon="troops"
                    value={`${p.garrison}${p.inConflict > 0 ? `(+${p.inConflict})` : ''}`}
                    title={`garrison ${p.garrison}${p.inConflict > 0 ? `, ${p.inConflict} in the conflict` : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Influence + tokens strip */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 pb-1.5 pt-0.5 border-t border-black/30">
              {IMP_FACTIONS.map((f) => {
                const holdsAlliance = view.alliances[f] === pid;
                return (
                  <span
                    key={f}
                    className="inline-flex items-center gap-0.5"
                    title={factionTrackTooltip(f, p.influence[f], holdsAlliance)}
                  >
                    <Icon name={f as IconName} size={12} />
                    <span
                      className={`text-[10px] font-semibold tabular-nums ${holdsAlliance ? 'text-amber-300' : 'text-sand-100/70'}`}
                    >
                      {p.influence[f]}
                      {holdsAlliance && '★'}
                    </span>
                  </span>
                );
              })}
              <span className="ml-auto inline-flex items-center gap-2">
                <Stat icon="troops" value={`${p.agentsLeft}/${totalAgents}`} title="agents left / total" color="#cdbfa8" />
                <Stat icon="draw" value={`${handCount}`} title="cards in hand" />
                <Stat icon="intrigue" value={`${intrigueCount}`} title="intrigue cards" />
              </span>
            </div>

            {(p.hasCouncilSeat || p.hasSwordmaster || p.controls.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 px-2 pb-1.5 text-[9px]">
                {p.hasCouncilSeat && (
                  <span className="rounded px-1 py-0.5 bg-sand-500/15 text-sand-200" title="High Council seat">
                    council
                  </span>
                )}
                {p.hasSwordmaster && (
                  <span className="rounded px-1 py-0.5 bg-sand-500/15 text-sand-200" title="Swordmaster: 3rd agent">
                    swordmaster
                  </span>
                )}
                {p.controls.map((c) => (
                  <span key={c} className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 bg-sky-500/15 text-sky-200" title={`controls ${c}`}>
                    <Icon name="city" size={10} /> {c}
                  </span>
                ))}
              </div>
            )}
          </button>
        );
      })}
      <button
        onClick={() => onViewAs('SPECTATOR')}
        className={`w-full text-left rounded-lg border px-2 py-1.5 text-xs transition-colors ${
          viewingAs === 'SPECTATOR' ? 'border-sand-400 bg-dusk-900' : 'border-transparent bg-dusk-900/60 hover:border-sand-800'
        }`}
      >
        <span className="text-sand-100/60">Spectator view (public info only)</span>
      </button>
    </div>
  );
}
