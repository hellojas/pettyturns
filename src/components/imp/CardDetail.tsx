import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Costs, Gains, ImpCardDef, IntrigueDef } from '../../imperium/types';
import { IMP_LEADERS } from '../../imperium/data/leaders';
import { cardFaction, costChips, gainsChips } from './visuals';
import { Icon, type IconName } from './icons';
import { useInspecting } from './useInspect';

// ---------------------------------------------------------------------------
// Describing a card/intrigue in full prose (the cramped icon chips, spelled out)
// ---------------------------------------------------------------------------

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function gainsText(g?: Gains): string {
  return cap(gainsChips(g).map((c) => c.title).join(', '));
}
function costsText(c?: Costs): string {
  return cap(costChips(c).map((c) => c.title).join(', '));
}
/** Effects the chip helpers don't cover (combat troop moves). */
function extraLines(g?: Gains): string[] {
  if (!g) return [];
  const out: string[] = [];
  if (g.deployTroops) out.push(`Deploy ${g.deployTroops} of your troops into the current conflict.`);
  if (g.destroyTroops) out.push(`Remove ${g.destroyTroops} of an opponent's committed troop${g.destroyTroops > 1 ? 's' : ''} from the conflict.`);
  return out;
}

const FACTION_SHORT: Record<string, string> = {
  emperor: 'Emperor',
  spacingGuild: 'Spacing Guild',
  beneGesserit: 'Bene Gesserit',
  fremen: 'Fremen',
};
const METRIC_LABEL: Record<string, string> = {
  influence: 'influence',
  controlSpaces: 'control markers',
  intrigueCards: 'intrigue cards',
  alliances: 'alliance tokens',
  spice: 'spice',
  solari: 'solari',
  water: 'water',
  troops: 'troops',
};
function describeEndgame(def: IntrigueDef): string {
  const vp = def.gains?.vp ?? 0;
  const cond = def.endgameCondition;
  if (!cond) return `Scores ${vp} VP.`;
  const metric = cond.metric === 'influence' && cond.faction ? `${FACTION_SHORT[cond.faction]} influence` : METRIC_LABEL[cond.metric];
  if (cond.mostAmong) return `${vp} VP if you hold the most ${metric}.`;
  if (cond.per) return `${vp} VP per ${cond.per} ${metric}.`;
  if (cond.atLeast !== undefined) return `${vp} VP with ${cond.atLeast}+ ${metric}.`;
  return `Scores ${vp} VP.`;
}

interface Section {
  label: string;
  lines: string[];
}
export interface DetailModel {
  name: string;
  sub: string;
  faction?: { id: IconName; label: string; accent: string };
  sections: Section[];
}

/** Full detail model for a deck/starting card. */
export function cardDetail(def: ImpCardDef, signetLeaderId?: string): DetailModel {
  if (!def) return { name: 'Unknown card', sub: 'definition not found', sections: [] };
  const faction = cardFaction(def) ?? undefined;
  const sections: Section[] = [];

  const agent: string[] = [];
  const ag = gainsText(def.agentGains);
  if (ag) agent.push(ag + '.');
  agent.push(...extraLines(def.agentGains));
  const ac = costsText(def.agentCost);
  if (ac) agent.push(`${ac}.`);
  if (def.signet) {
    const leader = signetLeaderId ? IMP_LEADERS[signetLeaderId] : undefined;
    agent.push(leader ? `Fires ${leader.name}'s signet-ring ability (below).` : `Fires your leader's signet-ring ability.`);
  }
  if (def.trashAfterAgent) agent.push('Then trash this card.');
  if (agent.length) sections.push({ label: 'Agent turn', lines: agent });

  const rev = gainsText(def.revealGains);
  if (rev) sections.push({ label: 'Reveal', lines: [rev + '.'] });

  const acq = gainsText(def.acquireGains);
  if (acq) sections.push({ label: 'When acquired', lines: [acq + '.'] });

  if (def.signet && signetLeaderId) {
    const leader = IMP_LEADERS[signetLeaderId];
    if (leader) {
      const gains = gainsText(leader.signetGains);
      const cost = costsText(leader.signetCost);
      const line = leader.signetNote ?? (gains ? (cost ? `${gains} (${cost.toLowerCase()}).` : gains + '.') : 'A special effect resolved by hand.');
      sections.push({ label: `${leader.name}'s signet`, lines: [line] });
      const passives = (leader.passives ?? []).map((p) => p.summary);
      if (leader.passiveNote) passives.push(leader.passiveNote);
      if (passives.length) sections.push({ label: 'Leader passives', lines: passives });
    }
  }

  return {
    name: def.name,
    sub: `${def.source === 'imperium' ? 'Imperium card' : def.source === 'reserve' ? 'Reserve card' : 'Starting card'}${def.cost > 0 ? ` · ${def.cost} persuasion` : ''}`,
    faction,
    sections,
  };
}

const KIND_LABEL: Record<IntrigueDef['kind'], string> = { plot: 'Plot', combat: 'Combat', endgame: 'Endgame' };

/** Full detail model for an intrigue card. */
export function intrigueDetail(def: IntrigueDef): DetailModel {
  const sections: Section[] = [];
  if (def.kind === 'endgame') {
    sections.push({ label: 'Scoring', lines: [describeEndgame(def)] });
  } else {
    const lines: string[] = [];
    const g = gainsText(def.gains);
    if (g) lines.push(g + '.');
    lines.push(...extraLines(def.gains));
    const c = costsText(def.cost);
    if (c) lines.push(`${c}.`);
    if (!lines.length) lines.push('A special effect.');
    sections.push({ label: def.kind === 'combat' ? 'During combat' : 'On your turn', lines });
  }
  return { name: def.name, sub: `Intrigue · ${KIND_LABEL[def.kind]}`, sections };
}

// ---------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------

/** Fixed, viewport-clamped detail panel anchored beside its trigger element. */
export function CardDetailPopover({ anchor, model }: { anchor: HTMLElement; model: DetailModel }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = anchor.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const m = 8;
    let left = a.right + m;
    if (left + box.width > window.innerWidth - 4) left = a.left - box.width - m;
    if (left < 4) left = 4;
    let top = a.top;
    if (top + box.height > window.innerHeight - 4) top = window.innerHeight - box.height - 4;
    if (top < 4) top = 4;
    setPos({ left, top });
  }, [anchor, model]);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[999] pointer-events-none w-60 rounded-lg border border-sand-700/70 bg-dusk-950 shadow-2xl p-2.5 text-xs"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? 'visible' : 'hidden' }}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-display font-semibold text-sand-100 text-[13px] leading-tight">{model.name}</span>
        {model.faction && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: model.faction.accent }}>
            <Icon name={model.faction.id} size={10} /> {model.faction.label}
          </span>
        )}
      </div>
      <div className="text-[10px] text-sand-100/55 mb-1.5">{model.sub}</div>
      {model.sections.map((s) => (
        <div key={s.label} className="mt-1.5 first:mt-0">
          <div className="text-[8.5px] uppercase tracking-widest text-sand-100/50">{s.label}</div>
          {s.lines.map((line, i) => (
            <div key={i} className="text-[11px] text-sand-100/85 leading-snug">{line}</div>
          ))}
        </div>
      ))}
      {model.sections.length === 0 && <div className="text-[11px] text-sand-100/50 italic">No special effects.</div>}
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Hover behaviour: plain hover reveals after a short dwell; Shift shows at once
// ---------------------------------------------------------------------------

const DWELL_MS = 420;

export function useInspectHover<T extends HTMLElement>() {
  const inspecting = useInspecting();
  const ref = useRef<T>(null);
  const [hovered, setHovered] = useState(false);
  const [dwelled, setDwelled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const onMouseEnter = () => {
    setHovered(true);
    timer.current = setTimeout(() => setDwelled(true), DWELL_MS);
  };
  const onMouseLeave = () => {
    setHovered(false);
    setDwelled(false);
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { ref, handlers: { onMouseEnter, onMouseLeave }, show: hovered && (inspecting || dwelled) };
}

/**
 * An inline reference to a card you can't otherwise see (e.g. "Top of deck: X").
 * Reveals full details immediately on hover — no key or dwell, since the whole
 * point is that the card isn't on the table to look at.
 */
export function CardRef({
  def,
  signetLeaderId,
  className,
  children,
}: {
  def: ImpCardDef;
  signetLeaderId?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  return (
    <span ref={ref} className={className} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
      {hovered && ref.current && <CardDetailPopover anchor={ref.current} model={cardDetail(def, signetLeaderId)} />}
    </span>
  );
}
