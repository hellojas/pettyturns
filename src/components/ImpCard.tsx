import type { ReactNode } from 'react';
import type { ImpCardDef } from '../imperium/types';
import { Icon } from './imp/icons';
import { cardAccent, cardFaction, costChips, gainsChips, type Chip } from './imp/visuals';
import { CardArt } from './imp/cardArt';

/** A row of effect chips (icon + amount). Empty renders nothing. */
function ChipRow({ chips, muted }: { chips: Chip[]; muted?: boolean }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {chips.map((c, i) => (
        <span
          key={i}
          title={c.title}
          className={`inline-flex items-center gap-0.5 ${muted ? 'text-sand-100/70' : 'text-sand-100/90'}`}
        >
          <Icon name={c.icon} size={13} />
          {c.text && <span className="text-[11px] font-semibold tabular-nums">{c.text}</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * A Dune-Imperium card face used everywhere a card appears (hand, market,
 * reserve). It's tinted by its dominant faction, shows its agent icons, its
 * agent + reveal effects, and — in the market — its persuasion price. Interaction
 * (select / buy) is driven by the `selected`/`disabled`/`onClick`/`footer` props
 * so the same face serves every context.
 */
export default function ImpCard({
  def,
  selected = false,
  disabled = false,
  dimmed = false,
  showCost = false,
  onClick,
  footer,
  className = '',
}: {
  def: ImpCardDef;
  selected?: boolean;
  disabled?: boolean;
  dimmed?: boolean;
  /** Show the persuasion price badge (market / reserve). */
  showCost?: boolean;
  onClick?: () => void;
  footer?: ReactNode;
  className?: string;
}) {
  const accent = cardAccent(def);
  const faction = cardFaction(def);
  const agent = gainsChips(def.agentGains);
  const agentCost = costChips(def.agentCost);
  const reveal = gainsChips(def.revealGains);
  const acquire = gainsChips(def.acquireGains);
  const hasAgent = agent.length > 0 || agentCost.length > 0 || def.signet || def.trashAfterAgent;

  const clickable = !!onClick && !disabled;
  const Tag = clickable ? 'button' : 'div';

  return (
    <div className={`flex flex-col ${className}`}>
      <Tag
        type={clickable ? 'button' : undefined}
        disabled={clickable ? false : undefined}
        onClick={clickable ? onClick : undefined}
        className={`group relative flex flex-col text-left rounded-lg overflow-hidden border transition-all ${
          selected ? 'ring-2 ring-sand-200 -translate-y-0.5' : ''
        } ${clickable ? 'hover:-translate-y-0.5 cursor-pointer' : ''} ${
          dimmed ? 'opacity-45 saturate-50' : ''
        } ${disabled && !dimmed ? 'opacity-60' : ''}`}
        style={{
          borderColor: `${accent}88`,
          background: `linear-gradient(160deg, #241b13 0%, #1c150f 62%), radial-gradient(120% 90% at 50% -10%, ${accent}33, transparent 60%)`,
          boxShadow: selected ? `0 0 0 1px ${accent}` : undefined,
        }}
      >
        {/* Paper grain */}
        <span className="tex-grain absolute inset-0 pointer-events-none opacity-70" aria-hidden />
        {/* Accent spine */}
        <span className="absolute inset-y-0 left-0 w-1 z-10" style={{ background: accent }} />

        {/* Illustrated banner, following the rulebook card anatomy: art with an
            agent-icon column down the left edge, the persuasion cost top-right,
            and the name + faction band overlaid along the bottom. */}
        <div className="relative">
          <CardArt def={def} accent={accent} height={56} className="opacity-95 group-hover:opacity-100 transition-opacity" />
          {/* legibility scrim under the title */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, #0d0906aa 0%, transparent 30%, transparent 40%, #14100bf2 100%)' }}
          />
          {/* Agent-icon column, left edge (rulebook layout) */}
          <div className="absolute top-1 left-1 flex flex-col gap-0.5">
            {def.icons.length === 0 ? (
              <span className="text-[8px] uppercase tracking-wider text-sand-100/75 bg-black/50 rounded px-1 py-0.5">
                reveal
              </span>
            ) : (
              def.icons.map((ic, i) => (
                <span
                  key={i}
                  className="inline-flex items-center justify-center rounded-[3px] ring-1 ring-black/60"
                  style={{ background: '#0b0805cc', padding: 2 }}
                >
                  <Icon name={ic} size={12} title={ic} />
                </span>
              ))
            )}
          </div>
          {/* Persuasion cost, top-right */}
          {showCost && def.cost > 0 && (
            <span
              className="absolute top-1 right-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold shrink-0 ring-1 ring-black/40"
              style={{ background: '#000000aa', color: '#f2d78a' }}
              title={`costs ${def.cost} persuasion`}
            >
              <Icon name="persuasion" size={12} />
              {def.cost}
            </span>
          )}
          {/* Name + faction band, overlaid at the bottom of the art */}
          <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-0.5">
            <div className="font-semibold text-[12.5px] leading-tight text-sand-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {def.name}
            </div>
            {faction && (
              <div
                className="inline-flex items-center gap-1 mt-0.5 rounded-sm px-1 py-[1px] text-[8px] font-bold uppercase tracking-wider"
                style={{ background: `${faction.accent}33`, color: faction.accent, boxShadow: `inset 0 0 0 1px ${faction.accent}66` }}
              >
                <Icon name={faction.id} size={9} />
                {faction.label}
              </div>
            )}
          </div>
        </div>

        {/* Agent effect */}
        {hasAgent && (
          <div className="relative mx-2 mb-1 rounded bg-black/25 px-1.5 py-1">
            <div className="text-[8px] uppercase tracking-widest text-sand-100/35 mb-0.5">Agent</div>
            <div className="flex flex-col gap-0.5">
              <ChipRow chips={agent} />
              {agentCost.length > 0 && (
                <div className="flex items-center gap-1 text-red-300/80">
                  <span className="text-[9px] uppercase">pay</span>
                  <ChipRow chips={agentCost} muted />
                </div>
              )}
              {def.signet && <span className="text-[10px] text-sand-300">◈ leader signet</span>}
              {def.trashAfterAgent && <span className="text-[10px] text-sand-100/45">trashes after use</span>}
            </div>
          </div>
        )}

        {/* Reveal band */}
        <div
          className="relative mt-auto flex items-center gap-1.5 px-2.5 py-1 border-t"
          style={{ borderColor: `${accent}44`, background: `${accent}1f` }}
        >
          <span className="text-[8px] uppercase tracking-widest text-sand-100/45">Reveal</span>
          {reveal.length ? <ChipRow chips={reveal} /> : <span className="text-[10px] text-sand-100/35">—</span>}
        </div>

        {acquire.length > 0 && (
          <div className="relative flex items-center gap-1 px-2.5 py-0.5 text-[10px] text-sand-100/55 border-t border-black/30">
            <span className="uppercase tracking-wider text-[8px]">on&nbsp;acquire</span>
            <ChipRow chips={acquire} muted />
          </div>
        )}
      </Tag>
      {footer && <div className="mt-1">{footer}</div>}
    </div>
  );
}
