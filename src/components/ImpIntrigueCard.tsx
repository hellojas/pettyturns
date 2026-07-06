import type { ReactNode } from 'react';
import type { IntrigueDef } from '../imperium/types';
import { Icon } from './imp/icons';
import { gainsChips, costChips } from './imp/visuals';

const KIND_META: Record<IntrigueDef['kind'], { label: string; color: string }> = {
  plot: { label: 'Plot', color: '#b48be0' },
  combat: { label: 'Combat', color: '#e0604f' },
  endgame: { label: 'Endgame', color: '#f2c94c' },
};

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

/** Original-wording summary of how an endgame intrigue card scores. */
function describeEndgame(def: IntrigueDef): string {
  const vp = def.gains?.vp ?? 0;
  const cond = def.endgameCondition;
  if (!cond) return `Scores ${vp} VP`;
  const metric = cond.metric === 'influence' && cond.faction
    ? `${FACTION_SHORT[cond.faction]} influence`
    : METRIC_LABEL[cond.metric];
  if (cond.mostAmong) return `${vp} VP if you hold the most ${metric}`;
  if (cond.per) return `${vp} VP per ${cond.per} ${metric}`;
  if (cond.atLeast !== undefined) return `${vp} VP with ${cond.atLeast}+ ${metric}`;
  return `Scores ${vp} VP`;
}

/**
 * A compact intrigue-card face: a kind badge (plot / combat / endgame) tinted to
 * match, the card name, and its effect — resource chips for plot/combat, or a
 * scoring summary for endgame. A `footer` (e.g. a Play button) slots below.
 */
export default function ImpIntrigueCard({ def, footer }: { def: IntrigueDef; footer?: ReactNode }) {
  const meta = KIND_META[def.kind];
  const gains = gainsChips(def.gains);
  const cost = costChips(def.cost);
  return (
    <div className="flex flex-col">
      <div
        className="relative flex flex-col rounded-lg overflow-hidden border"
        style={{
          borderColor: `${meta.color}88`,
          background: `linear-gradient(160deg, #241b13 0%, #1c150f 62%), radial-gradient(120% 90% at 50% -10%, ${meta.color}30, transparent 60%)`,
        }}
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: meta.color }} />
        <span className="tex-grain absolute inset-0 pointer-events-none opacity-70" aria-hidden />
        <span className="absolute -right-1 top-4 pointer-events-none opacity-[0.14]">
          <Icon name="intrigue" size={54} color={meta.color} />
        </span>

        <div className="relative pl-2.5 pr-1.5 pt-1.5 pb-1">
          <div className="flex items-center gap-1">
            <Icon name="intrigue" size={13} color={meta.color} />
            <span
              className="text-[8px] font-bold uppercase tracking-widest rounded px-1 py-0.5"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              {meta.label}
            </span>
          </div>
          <div className="mt-1 font-semibold text-[13px] leading-tight text-sand-100">{def.name}</div>
        </div>

        <div
          className="relative flex items-center gap-1.5 px-2.5 py-1 border-t"
          style={{ borderColor: `${meta.color}33`, background: `${meta.color}14` }}
        >
          {def.kind === 'endgame' ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-sand-100/80">
              <Icon name="vp" size={12} /> {describeEndgame(def)}
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {gains.map((c, i) => (
                <span key={i} title={c.title} className="inline-flex items-center gap-0.5 text-sand-100/90">
                  <Icon name={c.icon} size={12} />
                  {c.text && <span className="text-[10px] font-semibold tabular-nums">{c.text}</span>}
                </span>
              ))}
              {cost.map((c, i) => (
                <span key={`c${i}`} title={c.title} className="inline-flex items-center gap-0.5 text-red-300/80">
                  <span className="text-[8px] uppercase">pay</span>
                  <Icon name={c.icon} size={12} />
                  {c.text && <span className="text-[10px] font-semibold tabular-nums">{c.text}</span>}
                </span>
              ))}
              {!gains.length && !cost.length && <span className="text-[10px] text-sand-100/40">—</span>}
            </div>
          )}
        </div>
      </div>
      {footer && <div className="mt-1">{footer}</div>}
    </div>
  );
}
