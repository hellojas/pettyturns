import type { ReactNode } from 'react';
import type { Costs, Gains, ImpCardDef } from '../imperium/types';
import { Icon } from './imp/icons';
import { cardAccent, cardFaction, costChips, gainsChips } from './imp/visuals';
import { ChipRow } from './imp/Chips';
import { CardArt } from './imp/cardArt';
import { CardDetailPopover, cardDetail, useInspectHover } from './imp/CardDetail';

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
  signetLeaderId,
  signetGains,
  signetCost,
  signetNote,
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
  /** For a signet card: the leader id, so the inspect popover can show the full
   *  signet ability + passives. */
  signetLeaderId?: string;
  /** For a signet card: the leader's signet gains, rendered as chips. */
  signetGains?: Gains;
  /** For a signet card: the leader's signet cost, if any. */
  signetCost?: Costs;
  /** For a signet card: a note used when the signet can't be shown as chips. */
  signetNote?: string;
  onClick?: () => void;
  footer?: ReactNode;
  className?: string;
}) {
  // Hovering a card reveals a full plain-language detail popover (after a short
  // dwell, or instantly while the inspect key is held). Called before any early
  // return so hook order stays stable.
  const { ref: wrapRef, handlers, show } = useInspectHover<HTMLDivElement>();

  // A card whose definition no longer exists (e.g. a game saved before a deck
  // rebuild renamed cards) must not crash the whole app — show a placeholder.
  if (!def) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="rounded-lg border border-dashed border-sand-800/60 bg-dusk-900 px-2 py-3 text-center text-[11px] italic text-sand-100/45">
          Unknown card
        </div>
        {footer && <div className="mt-1">{footer}</div>}
      </div>
    );
  }

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
    <div ref={wrapRef} className={`flex flex-col ${className}`} {...handlers}>
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
        <div className="relative overflow-hidden">
          <CardArt def={def} accent={accent} height={76} className="group-hover:scale-[1.03] transition-transform origin-center" />
          {/* Title scrim: a solid dark band across the top third so the name
              always reads on its own strip, then clears to show the art below.
              A soft bottom vignette anchors the art into the card body. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, #0b0704f2 0%, #0b0704e0 26%, #0b070466 46%, transparent 62%, #0b070466 100%)',
            }}
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
          {/* Agent-icon rail down the left edge (rulebook layout). Icon size, gap,
              and padding tighten as a card carries more icons so the whole column
              always fits inside the banner and never spills onto the effects. */}
          {def.icons.length > 0 && (
            <div
              className="absolute left-1.5 top-1 bottom-1 z-20 flex flex-col justify-start"
              style={{ gap: def.icons.length >= 5 ? 0 : 2 }}
            >
              {def.icons.map((ic, i) => (
                <span
                  key={i}
                  className="inline-flex items-center justify-center rounded-[3px] ring-1 ring-black/70"
                  style={{ background: '#0a0705d9', padding: def.icons.length >= 6 ? 1 : 1.5 }}
                >
                  <Icon
                    name={ic}
                    size={def.icons.length <= 4 ? 12 : def.icons.length === 5 ? 10 : def.icons.length === 6 ? 8 : 7}
                    title={ic}
                  />
                </span>
              ))}
            </div>
          )}
          {/* Name + faction band, inset to the right of the icon rail. The name
              is clamped to two lines so a long title never bleeds down over the
              illustration; the balanced wrap keeps two-line names even. */}
          <div className={`absolute top-1 right-8 ${def.icons.length ? 'left-[22px]' : 'left-2'}`}>
            <div className="text-balance font-display font-semibold text-[12px] leading-[1.05] text-sand-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] line-clamp-2">
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
                  ) : signetNote ? (
                    <span className="text-[9px] text-sand-100/55 leading-snug">{signetNote}</span>
                  ) : (
                    !signetGains && (
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
      {show && wrapRef.current && (
        <CardDetailPopover anchor={wrapRef.current} model={cardDetail(def, signetLeaderId)} />
      )}
    </div>
  );
}
