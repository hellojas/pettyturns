import type { ReactNode } from 'react';
import type { Costs, Gains, ImpCardDef } from '../imperium/types';
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
  signetLeaderName,
  signetGains,
  signetCost,
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
  /** For a signet card: the leader whose signet ability it fires. */
  signetLeaderName?: string;
  /** For a signet card: the leader's signet gains, rendered as chips. */
  signetGains?: Gains;
  /** For a signet card: the leader's signet cost, if any. */
  signetCost?: Costs;
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
  const signet = def.signet ? gainsChips(signetGains) : [];
  const signetPay = def.signet ? costChips(signetCost) : [];
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

        {/* Illustrated banner, following the rulebook card anatomy: an art-forward
            illustration with the name + faction band across the top, the
            persuasion cost as a corner tab top-right, and the agent icons in a
            column down the left edge (wrapping if a card has many). */}
        <div className="relative">
          <CardArt def={def} accent={accent} height={76} className="group-hover:scale-[1.03] transition-transform origin-center" />
          {/* legibility scrim: darker at the top for the title, mostly clear over the art */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, #0c0805e6 0%, #0c080559 32%, transparent 55%, #100c0733 100%)' }}
          />
          {/* Persuasion cost — bright corner tab, top-right */}
          {showCost && def.cost > 0 && (
            <span
              className="absolute top-0 right-0 inline-flex items-center gap-0.5 pl-1.5 pr-1 py-0.5 rounded-bl-lg text-[11px] font-bold shrink-0 z-20"
              style={{ background: '#2f6fb0', color: '#eef6ff', boxShadow: '0 1px 3px #0009' }}
              title={`costs ${def.cost} persuasion`}
            >
              <Icon name="persuasion" size={11} color="#eef6ff" />
              {def.cost}
            </span>
          )}
          {/* Agent-icon rail down the left edge (rulebook layout). Icons shrink
              when a card carries many so the column always fits the art. */}
          {def.icons.length > 0 && (
            <div className="absolute left-1.5 top-1 bottom-1 z-20 flex flex-col justify-start gap-0.5">
              {def.icons.map((ic, i) => (
                <span
                  key={i}
                  className="inline-flex items-center justify-center rounded-[3px] ring-1 ring-black/70"
                  style={{ background: '#0a0705d9', padding: 1.5 }}
                >
                  <Icon name={ic} size={def.icons.length <= 4 ? 12 : def.icons.length <= 5 ? 11 : 9} title={ic} />
                </span>
              ))}
            </div>
          )}
          {/* Name + faction band, inset to the right of the icon rail */}
          <div className={`absolute top-0.5 right-8 ${def.icons.length ? 'left-[22px]' : 'left-2'}`}>
            <div className="font-semibold text-[12px] leading-tight text-sand-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {def.name}
            </div>
            {faction ? (
              <div
                className="inline-flex items-center gap-1 mt-0.5 rounded-sm px-1 py-[1px] text-[8px] font-bold uppercase tracking-wider"
                style={{ background: `${faction.accent}40`, color: '#fff', boxShadow: `inset 0 0 0 1px ${faction.accent}` }}
              >
                <Icon name={faction.id} size={9} color="#fff" />
                {faction.label}
              </div>
            ) : def.icons.length === 0 ? (
              <span className="inline-block mt-0.5 text-[8px] uppercase tracking-wider text-sand-100/70 bg-black/50 rounded px-1 py-[1px]">
                reveal only
              </span>
            ) : null}
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
              {def.signet && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-sand-300">
                    ◈ {signetLeaderName ? `${signetLeaderName}'s signet` : 'leader signet'}
                  </span>
                  {signet.length > 0 ? (
                    <ChipRow chips={signet} />
                  ) : (
                    def.signet && !signetGains && (
                      <span className="text-[9px] text-sand-100/40 italic">fires your leader's signet power</span>
                    )
                  )}
                  {signetPay.length > 0 && (
                    <div className="flex items-center gap-1 text-red-300/80">
                      <span className="text-[9px] uppercase">pay</span>
                      <ChipRow chips={signetPay} muted />
                    </div>
                  )}
                </div>
              )}
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
