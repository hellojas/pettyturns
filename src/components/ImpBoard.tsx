import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IMP_SPACE_LIST, IMP_SPACES } from '../imperium/data/spaces';
import { IMP_CONFLICT_DEFS } from '../imperium/data/conflicts';
import { IMP_CONSTANTS } from '../imperium/data/constants';
import { impValidate, combatStrength } from '../imperium/engine/engine';
import type {
  BoardSpaceDef,
  ImpFactionId,
  ImpGameState,
  ImpVisibleState,
  PlayerId,
  SpaceGroup,
} from '../imperium/types';
import { IMP_FACTIONS } from '../imperium/types';
import { useImpStore } from '../lib/impStore';
import { Icon, type IconName } from './imp/icons';
import { costChips, gainsChips, GROUP_META, PLAYER_COLORS, type Chip } from './imp/visuals';
import { Meeple, TroopCube } from './imp/tokens';
import { RegionBackdrop } from './imp/art';
import { SpaceArt } from './imp/cardArt';
import VpTrack from './imp/VpTrack';
import LeaderPortrait from './imp/LeaderPortrait';
import { FlashValue } from './imp/motion';
import WormSweep from './imp/WormSweep';

const { influenceMax, allianceLevel } = IMP_CONSTANTS;
const VP_LEVELS: number[] = [...IMP_CONSTANTS.influenceVpLevels];

/** Desert board tokens shared across the surface. */
const SURFACE_LINE = '#4a371f';

function specialLabel(space: BoardSpaceDef): string | null {
  switch (space.special) {
    case 'highCouncil':
      return 'High Council seat';
    case 'swordmaster':
      return '3rd agent';
    case 'mentat':
      return 'extra agent';
    case 'sellMelange':
      return 'sell spice → solari';
    default:
      return null;
  }
}

/** Which kind a space reads as first — drives its frame color and corner badge.
 *  Maker outranks control (the spice waiting is the actionable state), which
 *  outranks a plain combat space. */
type SpaceKind = 'maker' | 'control' | 'combat' | null;
function primaryKind(space: BoardSpaceDef): SpaceKind {
  if (space.maker) return 'maker';
  if (space.controlBonus) return 'control';
  if (space.combat) return 'combat';
  return null;
}
const KIND_FRAME: Record<Exclude<SpaceKind, null>, string> = {
  maker: '#7a5a22',
  control: '#5a6f88',
  combat: '#7a3a2f',
};

/** Cost → gain, split by a thin divider (replaces the cramped "→"). */
function EffectLine({ costs, gains, space }: { costs: Chip[]; gains: Chip[]; space: BoardSpaceDef }) {
  const special = specialLabel(space);
  const hasCost = costs.length > 0;
  return (
    <div className="mt-0.5 flex items-center gap-x-1.5 gap-y-0.5 flex-wrap">
      {hasCost && (
        <>
          <ChipRow chips={costs} tone="cost" />
          <span className="w-px h-3.5 bg-white/20 mx-px" aria-hidden />
        </>
      )}
      <ChipRow chips={gains} />
      {space.influenceGain && (
        <span className="inline-flex items-center gap-0.5" title={`+1 ${GROUP_META[space.influenceGain].label} influence`}>
          <Icon name={space.influenceGain as IconName} size={12} />
          <span className="text-[10px] font-semibold">+1</span>
        </span>
      )}
      {special && <span className="text-[10px] text-sand-300/80 italic">{special}</span>}
    </div>
  );
}

function ChipRow({ chips, tone }: { chips: Chip[]; tone?: 'cost' }) {
  if (!chips.length) return null;
  return (
    <div className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {chips.map((c, i) => (
        <span key={i} title={c.title} className={`inline-flex items-center gap-0.5 ${tone === 'cost' ? 'text-red-200/80' : ''}`}>
          <Icon name={c.icon} size={13} />
          {c.text && <span className="text-[10.5px] font-semibold tabular-nums">{c.text}</span>}
        </span>
      ))}
    </div>
  );
}

/** Crossed swords — the rulebook's Combat-space marker. */
function CrossedSwords({ size = 13, title }: { size?: number; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle' }} role={title ? 'img' : undefined} aria-label={title}>
      {title && <title>{title}</title>}
      <g stroke="#e0604f" strokeWidth="2.3" strokeLinecap="round">
        <line x1="5" y1="19.5" x2="18.5" y2="5" />
        <line x1="19" y1="19.5" x2="5.5" y2="5" />
      </g>
    </svg>
  );
}

/** The corner insignia that names a space's kind at a glance. */
const BADGE_CLASS = 'inline-flex items-center gap-0.5 text-[9px] font-bold tracking-wide px-1.5 py-[2px] rounded-full whitespace-nowrap max-w-[92px] truncate';
function KindBadge({ kind, bonus, controllerName, controllerColor }: {
  kind: Exclude<SpaceKind, null>;
  bonus: number;
  controllerName?: string;
  controllerColor?: string;
}) {
  if (kind === 'maker') {
    return (
      <span className={BADGE_CLASS} style={{ background: '#6a4e1c30', color: '#ecc266', boxShadow: 'inset 0 0 0 1px #7a5a22' }}
        title={bonus > 0 ? `${bonus} spice waiting to be harvested` : 'Maker — harvest spice here'}>
        <Icon name="spice" size={10} />{bonus > 0 ? `+${bonus}` : 'Maker'}
      </span>
    );
  }
  if (kind === 'control') {
    return (
      <span className={BADGE_CLASS} style={{ background: '#4a627e30', color: controllerColor ?? '#b9d0e8', boxShadow: `inset 0 0 0 1px ${controllerColor ?? '#5a6f88'}` }}
        title={controllerName ? `controlled by ${controllerName}` : 'control space — win a Conflict here to claim'}>
        ⚑ {controllerName ? controllerName : 'open'}
      </span>
    );
  }
  return (
    <span className={BADGE_CLASS} style={{ background: '#7a2f2630', color: '#f0a091', boxShadow: 'inset 0 0 0 1px #7a3a2f' }} title="Combat space — deploy troops to the Conflict">
      <CrossedSwords size={10} />Combat
    </span>
  );
}

/**
 * A single board location. Keeps every interaction from the original board
 * (legal-target highlight, occupant standee, click-to-stage) and now wears a
 * frame + corner badge that names its kind (combat / control / maker), so
 * contested and high-value spaces read without scanning each line.
 */
function SpaceTile({
  space,
  view,
  legal,
  selected,
  onSelect,
}: {
  space: BoardSpaceDef;
  view: ImpVisibleState;
  legal: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const accent = GROUP_META[space.group].accent;
  const occupant = view.occupied[space.id];
  const occupantIdx = occupant ? view.playerOrder.indexOf(occupant) : -1;
  const controller = view.controlledBy[space.id];
  const controllerIdx = controller ? view.playerOrder.indexOf(controller) : -1;
  const bonus = view.makerBonus[space.id] ?? 0;
  const costs = costChips(space.cost);
  const gains = gainsChips(space.gains);
  const kind = primaryKind(space);
  const frame = kind ? KIND_FRAME[kind] : `${accent}55`;

  return (
    <button
      disabled={!legal}
      onClick={onSelect}
      className={`space-tile relative w-full text-left rounded-md overflow-hidden border pl-2 pr-2 py-1.5 transition-all ${
        selected ? 'ring-2 ring-sand-100 -translate-y-0.5' : legal ? 'hover:-translate-y-0.5 cursor-pointer' : ''
      }`}
      style={{
        borderColor: occupant && !legal && !selected ? `${PLAYER_COLORS[occupantIdx % 4]}99` : legal || selected ? '#e3bd78' : frame,
        background: legal
          ? `linear-gradient(150deg, #33260f, #201607), radial-gradient(120% 120% at 50% 0%, ${accent}33, transparent 55%)`
          : `linear-gradient(150deg, #241a0f, #191108)`,
        boxShadow: legal && !selected
          ? '0 0 0 1px #e3bd7855, 0 0 14px -3px #f4cf6a99'
          : occupant && !selected
            ? `inset 0 0 0 1px ${PLAYER_COLORS[occupantIdx % 4]}55`
            : undefined,
        opacity: occupant && !legal && !selected ? 0.85 : 1,
      }}
    >
      <span className="absolute inset-y-0 left-0 w-1 z-10" style={{ background: accent }} />
      <div className="relative flex gap-1.5 pl-1">
        {/* Space illustration + the agent standee sitting on it */}
        <div className="relative shrink-0 self-start mt-0.5">
          <div className="rounded-md overflow-hidden ring-1 ring-black/40">
            <SpaceArt space={space} accent={accent} size={38} />
          </div>
          {occupant && (
            <span className="absolute -bottom-1.5 -right-1.5 anim-drop rounded-full" title={`agent placed: ${view.players[occupant].name}`}>
              <LeaderPortrait leaderId={view.players[occupant].leaderId} size={22} ring={PLAYER_COLORS[occupantIdx % 4]} className="!rounded-full" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {/* Name + kind badge share a wrapping row: when the tile is too narrow
              the badge drops to its own line instead of overlapping the name. */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-semibold text-[12px] leading-[1.15] text-sand-100">{space.name}</span>
            {kind && (
              <KindBadge
                kind={kind}
                bonus={bonus}
                controllerName={controller ? view.players[controller].name : undefined}
                controllerColor={controller ? PLAYER_COLORS[controllerIdx % 4] : undefined}
              />
            )}
          </div>
          <EffectLine costs={costs} gains={gains} space={space} />
          {controller && (
            <div className="mt-0.5 flex items-center gap-1 text-[9px] text-sand-100/50">
              <Meeple color={PLAYER_COLORS[controllerIdx % 4]} size={11} seatIndex={controllerIdx + 1} />
              held by {view.players[controller].name}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/** Horizontal influence ladder (0…max): chunky rungs, seat pips standing on
 *  their level, VP (✦) and alliance (★) gates lit. */
function InfluenceTrack({ faction, view }: { faction: ImpFactionId; view: ImpVisibleState }) {
  const allianceHolder = view.alliances[faction];
  const cells = Array.from({ length: influenceMax + 1 }, (_, level) => level);
  const topReached = Math.max(0, ...view.playerOrder.map((pid) => view.players[pid].influence[faction] ?? 0));
  return (
    <div className="flex items-stretch gap-[2px]">
      {cells.map((level) => {
        const here = view.playerOrder.filter((pid) => (view.players[pid].influence[faction] ?? 0) === level);
        const isVp = VP_LEVELS.includes(level);
        const isAlliance = level === allianceLevel;
        const reached = level > 0 && level <= topReached;
        return (
          <div
            key={level}
            title={`influence ${level}${isVp ? ' · +1 VP' : ''}${isAlliance ? ' · alliance' : ''}${here.length ? ` · ${here.map((p) => view.players[p].name).join(', ')}` : ''}`}
            className="flex-1 min-w-0 rounded-[3px] flex flex-col items-center justify-between gap-[1px] pt-[3px] pb-[1px] relative min-h-[26px]"
            style={{
              background: level === 0 ? '#00000040' : reached ? '#e3bd7818' : '#ffffff0b',
              boxShadow: isAlliance
                ? 'inset 0 0 0 1.5px #8a6a24, inset 0 0 8px -3px #f2c94c'
                : isVp
                  ? 'inset 0 0 0 1px #6a531f'
                  : reached
                    ? 'inset 0 0 0 1px #e3bd7822'
                    : 'inset 0 0 0 1px #362717',
            }}
          >
            <div className="flex flex-wrap justify-center gap-[1.5px] min-h-[10px] px-[1px]">
              {here.map((pid) => {
                const seatIdx = view.playerOrder.indexOf(pid);
                return (
                  <span
                    key={pid}
                    className="relative w-[10px] h-[10px] rounded-full inline-flex items-center justify-center"
                    style={{
                      background: PLAYER_COLORS[seatIdx % 4],
                      boxShadow: `0 0 0 1px #00000088, inset 0 1px 0 #ffffff55, 0 0 4px -1px ${PLAYER_COLORS[seatIdx % 4]}`,
                    }}
                    title={`${view.players[pid].name}: ${level}`}
                  >
                    <span
                      className="text-[7px] leading-none font-bold tabular-nums"
                      style={{ color: '#ffffff', textShadow: '0 0 1px #000, 0 0 1px #000' }}
                    >
                      {seatIdx + 1}
                    </span>
                  </span>
                );
              })}
            </div>
            {isAlliance ? (
              <Icon name="vp" size={9} color="#f2c94c" title="alliance level" />
            ) : isVp ? (
              <Icon name="vp" size={8} color="#e3bd78" title="+1 VP at this level" />
            ) : (
              <span
                className="text-[9px] leading-none font-bold tabular-nums"
                style={{ color: reached ? '#f0d9a8cc' : '#f7ecd77a' }}
              >
                {level}
              </span>
            )}
          </div>
        );
      })}
      {allianceHolder && (
        <span className="self-center pl-1 inline-flex items-center" title={`${view.players[allianceHolder].name} holds the alliance`}>
          <span className="w-[10px] h-[10px] rounded-full" style={{ background: PLAYER_COLORS[view.playerOrder.indexOf(allianceHolder) % 4], boxShadow: '0 0 0 1.5px #f2c94c' }} />
        </span>
      )}
    </div>
  );
}

/** One great-power cell inside the unified faction surface (no outer box — the
 *  surface supplies the frame; a faction wash bleeds from the crest). */
function FactionCell({
  faction,
  view,
  legalTargets,
  selectedSpace,
  onSelect,
}: {
  faction: ImpFactionId;
  view: ImpVisibleState;
  legalTargets: Set<string>;
  selectedSpace?: string;
  onSelect: (id: string) => void;
}) {
  const meta = GROUP_META[faction];
  const spaces = IMP_SPACE_LIST.filter((s) => s.group === faction);
  return (
    <div className="relative p-2 flex flex-col gap-1.5" style={{ background: `${meta.accent}0e` }}>
      <span className="absolute inset-0 pointer-events-none" aria-hidden style={{ background: `radial-gradient(90% 55% at 50% -10%, ${meta.accent}22, transparent 62%)` }} />
      <div className="relative flex items-center gap-1.5">
        <span className="grid place-items-center rounded-md" style={{ width: 24, height: 24, background: '#0d0a0699', boxShadow: `inset 0 0 0 1.5px ${meta.accent}` }}>
          <Icon name={meta.icon} size={15} />
        </span>
        <span className="font-display text-[13px] font-bold tracking-wide leading-none" style={{ color: meta.accent }}>{meta.label}</span>
      </div>
      <InfluenceTrack faction={faction} view={view} />
      <div className="relative flex flex-col gap-1.5">
        {spaces.map((s) => (
          <SpaceTile key={s.id} space={s} view={view} legal={legalTargets.has(s.id)} selected={selectedSpace === s.id} onSelect={() => onSelect(s.id)} />
        ))}
      </div>
    </div>
  );
}

/** A flanking zone (Landsraad / CHOAM) — a light titled cluster beside the hero. */
/** The CHOAM spice-exchange rates (Sell Melange), rendered as a compact
 *  reference that fills the zone's height instead of leaving dead space. */
function SpiceExchange() {
  const entries = Object.entries(IMP_CONSTANTS.sellMelangeRates)
    .map(([spice, solari]) => [Number(spice), solari] as const)
    .sort((a, b) => a[0] - b[0]);
  return (
    <div className="relative rounded-lg p-2" style={{ background: '#00000033', border: '1px solid #d9a12b2e' }}>
      <div className="text-[9px] uppercase tracking-widest text-sand-100/40 mb-1.5">Spice Exchange</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {entries.map(([spice, solari]) => (
          <div key={spice} className="flex items-center gap-1 text-[11px] font-semibold" title={`sell ${spice} spice for ${solari} solari`}>
            <span className="inline-flex items-center gap-0.5 tabular-nums">
              <Icon name="spice" size={13} />{spice}
            </span>
            <span className="text-sand-100/35">→</span>
            <span className="inline-flex items-center gap-0.5 tabular-nums text-sand-100/90">
              <Icon name="solari" size={13} />{solari}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlankZone({
  group,
  view,
  legalTargets,
  selectedSpace,
  onSelect,
  scene,
  footer,
}: {
  group: SpaceGroup;
  view: ImpVisibleState;
  legalTargets: Set<string>;
  selectedSpace?: string;
  onSelect: (id: string) => void;
  scene?: 'columns' | 'exchange';
  /** Optional content pinned to the bottom, filling any spare height. */
  footer?: ReactNode;
}) {
  const meta = GROUP_META[group];
  const spaces = IMP_SPACE_LIST.filter((s) => s.group === group);
  return (
    <div className="relative overflow-hidden rounded-xl p-2 flex flex-col h-full" style={{ background: `${meta.accent}0d`, border: `1px solid ${meta.accent}33` }}>
      {scene && <RegionBackdrop scene={scene} color={meta.accent} opacity={0.45} />}
      <div className="relative flex items-center gap-1.5 px-0.5 mb-1.5">
        <Icon name={meta.icon} size={15} />
        <span className="font-display text-[12px] font-bold tracking-wide leading-none" style={{ color: meta.accent }}>{meta.label}</span>
      </div>
      <div className="relative flex flex-col gap-1.5">
        {spaces.map((s) => (
          <SpaceTile key={s.id} space={s} view={view} legal={legalTargets.has(s.id)} selected={selectedSpace === s.id} onSelect={() => onSelect(s.id)} />
        ))}
      </div>
      {footer && <div className="relative mt-auto pt-2">{footer}</div>}
    </div>
  );
}

/** One band (Cities / Deep Desert) of the lower surface. */
function SurfaceBand({
  group,
  cols,
  scene,
  tint,
  view,
  legalTargets,
  selectedSpace,
  onSelect,
}: {
  group: SpaceGroup;
  cols: number;
  scene: 'skyline' | 'dunes';
  tint: string;
  view: ImpVisibleState;
  legalTargets: Set<string>;
  selectedSpace?: string;
  onSelect: (id: string) => void;
}) {
  const meta = GROUP_META[group];
  const spaces = IMP_SPACE_LIST.filter((s) => s.group === group);
  return (
    <div className="relative overflow-hidden p-2.5" style={{ background: tint }}>
      <RegionBackdrop scene={scene} color={meta.accent} opacity={0.4} />
      {group === 'desert' && <WormSweep view={view} />}
      <div className="relative flex items-center gap-1.5 px-0.5 mb-2">
        <Icon name={meta.icon} size={15} />
        <span className="font-display text-[12px] font-bold tracking-wide leading-none" style={{ color: meta.accent }}>{meta.label}</span>
      </div>
      <div
        className="relative grid gap-1.5"
        style={{
          // Reflow by available width (min tile ~200px) so the Cities / Deep
          // Desert bands never crowd in a narrow board column.
          gridTemplateColumns: cols > 1 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
        }}
      >
        {spaces.map((s) => (
          <SpaceTile key={s.id} space={s} view={view} legal={legalTargets.has(s.id)} selected={selectedSpace === s.id} onSelect={() => onSelect(s.id)} />
        ))}
      </div>
    </div>
  );
}

/** One combatant's line in the conflict: portrait, troops, and a strength bar. */
function CombatantRow({ pid, view, strength, maxStrength, leading }: {
  pid: PlayerId; view: ImpVisibleState; strength: number; maxStrength: number; leading: boolean;
}) {
  const seat = PLAYER_COLORS[view.playerOrder.indexOf(pid) % 4];
  const p = view.players[pid];
  const pct = maxStrength > 0 ? Math.max(6, Math.round((strength / maxStrength) * 100)) : 6;
  return (
    <div className="flex items-center gap-1.5">
      <LeaderPortrait leaderId={p.leaderId} size={18} ring={seat} className="!rounded-full shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-sand-100/90 truncate">{p.name}</span>
          {leading && <Icon name="vp" size={9} color="#f2c94c" title="currently leading the conflict" />}
          <span className="ml-auto inline-flex items-center gap-0.5 shrink-0" title={`${p.inConflict} troop(s) committed`}>
            <TroopCube color={seat} size={11} seatIndex={view.playerOrder.indexOf(pid) + 1} />
            <span className="text-[9px] font-bold tabular-nums text-sand-100/70">{p.inConflict}</span>
          </span>
        </div>
        <div className="mt-[1px] h-[6px] rounded-full overflow-hidden" style={{ background: '#00000055' }}>
          <FlashValue value={strength} className="block h-full">
            <span className="block h-full rounded-full transition-all" style={{ width: `${pct}%`, background: leading ? seat : `${seat}aa`, boxShadow: leading ? `0 0 8px -1px ${seat}` : undefined }} />
          </FlashValue>
        </div>
      </div>
      <span className="text-[11px] font-bold tabular-nums shrink-0 w-5 text-right" style={{ color: leading ? '#f2c94c' : '#cdbfa8' }} title="combat strength">{strength}</span>
    </div>
  );
}

/**
 * A one-shot "conflict resolved" moment: when a fresh burst of `combat.reward`
 * log entries appears, it briefly overlays the hero with each winner, their
 * placement, and the reward they took. Self-contained and reduced-motion-guarded
 * (the `.anim-rise` entrance is disabled → it just appears then dismisses).
 */
function CombatFlash({
  view,
  conflict,
}: {
  view: ImpVisibleState;
  conflict: (typeof IMP_CONFLICT_DEFS)[string] | null;
}) {
  const rewards = view.log.filter((e) => e.event === 'combat.reward');
  const latestRound = rewards.length ? Math.max(...rewards.map((e) => e.round)) : null;
  const latest = latestRound != null ? rewards.filter((e) => e.round === latestRound) : [];
  const key = latest.length ? Math.max(...latest.map((e) => e.seq)) : null;
  const seen = useRef<number | null>(key);
  const [show, setShow] = useState<number | null>(null);

  useEffect(() => {
    if (key != null && key !== seen.current) {
      seen.current = key;
      setShow(key);
      const t = setTimeout(() => setShow(null), 2600);
      return () => clearTimeout(t);
    }
  }, [key]);

  if (show == null || latest.length === 0) return null;
  const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : '3rd');
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 pointer-events-none" aria-hidden>
      <div
        className="anim-rise rounded-xl px-4 py-3 text-center max-w-full"
        style={{ background: '#17110bee', border: '1px solid #7a5a2488', boxShadow: '0 14px 34px -12px #000' }}
      >
        <div className="text-[11px] uppercase tracking-[0.2em] text-amber-200/85 mb-2 inline-flex items-center gap-1">
          <Icon name="sword" size={13} /> Conflict resolved
        </div>
        <div className="flex flex-col gap-1.5">
          {latest
            .slice()
            .sort((a, b) => Number(a.data?.place) - Number(b.data?.place))
            .map((e) => {
              const pid = String(e.data?.pid);
              const place = Number(e.data?.place);
              const idx = view.playerOrder.indexOf(pid);
              const reward = conflict?.rewards.find((r) => r.place === place);
              return (
                <div key={e.seq} className="flex items-center gap-2">
                  {idx >= 0 && (
                    <LeaderPortrait
                      leaderId={view.players[pid].leaderId}
                      size={20}
                      ring={PLAYER_COLORS[idx % 4]}
                      className="!rounded-full"
                    />
                  )}
                  <span className="text-[11px] font-semibold text-sand-100 truncate max-w-[110px]">
                    {idx >= 0 ? view.players[pid].name : pid}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1 rounded"
                    style={{ color: place === 1 ? '#f2c94c' : '#cdbfa8', background: place === 1 ? '#f2c94c1f' : '#ffffff10' }}
                  >
                    {ordinal(place)}
                  </span>
                  {reward && <ChipRow chips={gainsChips(reward.gains)} />}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

/** The board's hero: the round's conflict, raised, with a tier-graded top edge,
 *  a leader-takes-it reward ladder, and live committed strengths. */
function ConflictHero({ view, viewingAs, full, onPass }: {
  view: ImpVisibleState; viewingAs: PlayerId | 'SPECTATOR'; full: ImpGameState | null; onPass: () => void;
}) {
  const conflict = view.currentConflict ? IMP_CONFLICT_DEFS[view.currentConflict] : null;
  const tierColor = conflict ? ['#8a8f98', '#c98a2b', '#d24b3e'][conflict.tier - 1] : '#8a8f98';
  const tierEdge = conflict
    ? ['linear-gradient(90deg,#7d838c,#aeb4bd)', 'linear-gradient(90deg,#c98a2b,#e7b45c)', 'linear-gradient(90deg,#d24b3e,#f2c94c)'][conflict.tier - 1]
    : '#8a8f98';
  const combatants = view.playerOrder.filter((pid) => view.players[pid].inConflict > 0);
  const strengthOf = (pid: PlayerId) => (full ? combatStrength(full, pid) : view.players[pid].inConflict * IMP_CONSTANTS.strengthPerTroop);
  const strengths = Object.fromEntries(combatants.map((pid) => [pid, strengthOf(pid)]));
  const maxStrength = Math.max(0, ...combatants.map((pid) => strengths[pid]));
  const inCombat = view.phase === 'combat';
  const myWindow = inCombat && view.turn === viewingAs;
  return (
    <div
      className="relative rounded-2xl overflow-hidden h-full flex flex-col"
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #3d2a15, #17100a 72%)',
        boxShadow: '0 0 0 1px #7a5a24, 0 18px 44px -22px #000, inset 0 0 60px -26px #000',
      }}
    >
      <span className="block h-[5px] w-full shrink-0" style={{ background: tierEdge }} aria-hidden />
      <CombatFlash view={view} conflict={conflict} />
      {/* Battlefield backdrop: a warm glow, dune ridges, and a crossed-kindjal
          clash emblem behind the content — subtle enough to keep text legible. */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="ch-glow" cx="50%" cy="6%" r="62%">
            <stop offset="0%" stopColor="#f0b45a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f0b45a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ch-blade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4e2b0" />
            <stop offset="100%" stopColor="#b98a3a" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#ch-glow)" />
        <path d="M0 72 Q28 63 55 70 T100 66 V100 H0 Z" fill="#2a1c10" opacity="0.5" />
        <path d="M0 84 Q34 77 62 84 T100 80 V100 H0 Z" fill="#160f08" opacity="0.72" />
        <g opacity="0.16" transform="translate(50 52)">
          {[36, -36].map((deg, i) => (
            <g key={i} transform={`rotate(${deg})`}>
              <path d="M0 -34 L2.6 -27 L2 12 L-2 12 L-2.6 -27 Z" fill="url(#ch-blade)" />
              <path d="M0 -32 L0.8 -27 L0.5 10 L-0.5 10 L-0.8 -27 Z" fill="#fff" opacity="0.45" />
              <rect x="-7.5" y="11" width="15" height="3" rx="1.2" fill="#8a6a2e" />
              <rect x="-1.8" y="13.5" width="3.6" height="10" rx="1.4" fill="#5a4020" />
              <circle cx="0" cy="24.5" r="2" fill="#8a6a2e" />
            </g>
          ))}
        </g>
      </svg>
      <div className="relative p-3.5 flex flex-col gap-2.5 h-full">
        {conflict ? (
          <>
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#c8a45a]">This round's conflict</div>
                <h3 className="font-display font-bold text-[20px] leading-[1.05] text-[#f7ead0] mt-0.5 text-balance">{conflict.name}</h3>
              </div>
              <span className="ml-auto shrink-0 text-[12px] font-extrabold tracking-widest px-2.5 py-1 rounded-lg text-[#12100c]"
                style={{ background: `linear-gradient(180deg, ${tierColor}, ${tierColor}bb)`, boxShadow: '0 2px 5px -1px #000a, inset 0 1px 0 #ffffff66' }}>
                {['I', 'II', 'III'][conflict.tier - 1]}
              </span>
            </div>
            {/* reward ladder */}
            <div className="flex flex-col gap-1">
              {conflict.rewards.map((r) => (
                <div key={r.place} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold w-9 text-center py-0.5 rounded-md shrink-0"
                    style={{ background: r.place === 1 ? '#f2c94c1f' : '#ffffff10', color: r.place === 1 ? '#f2c94c' : '#cdbfa8', boxShadow: r.place === 1 ? 'inset 0 0 0 1px #f2c94c55' : 'inset 0 0 0 1px #ffffff18' }}>
                    {r.place === 1 ? '1st' : r.place === 2 ? '2nd' : '3rd'}
                  </span>
                  <ChipRow chips={gainsChips(r.gains)} />
                </div>
              ))}
            </div>
            {/* committed forces */}
            <div className="mt-auto pt-2 border-t border-white/10 flex flex-col gap-1.5">
              {combatants.length > 0 ? (
                combatants.slice().sort((a, b) => strengths[b] - strengths[a]).map((pid) => (
                  <CombatantRow key={pid} pid={pid} view={view} strength={strengths[pid]} maxStrength={maxStrength} leading={maxStrength > 0 && strengths[pid] === maxStrength} />
                ))
              ) : (
                <span className="text-[9px] text-sand-100/35 italic py-0.5">no troops committed yet</span>
              )}
            </div>
            {inCombat && (
              <div className="rounded-md border border-red-900/60 bg-red-950/30 p-1.5 flex items-center gap-2">
                <span className="anim-pulse text-[11px] font-bold text-red-300 inline-flex items-center gap-1"><Icon name="sword" size={13} /> Combat!</span>
                {myWindow ? (
                  <button className="btn !py-0.5 !px-2 !text-[11px] ml-auto" onClick={onPass}>Pass</button>
                ) : (
                  <span className="ml-auto text-[10px] text-sand-100/60">{view.turn ? `waiting for ${view.players[view.turn].name}` : 'resolving…'}</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-sand-100/40 text-sm italic m-auto">No active conflict.</div>
        )}
      </div>
    </div>
  );
}

/** A wide desert panorama title strip — twin suns, dune ridges, a distant worm. */
function BoardHeader({ view }: { view: ImpVisibleState }) {
  return (
    <div className="relative rounded-xl overflow-hidden mb-2.5 ring-1 ring-[#7b422255]">
      <svg viewBox="0 0 600 90" width="100%" height="72" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="block">
        <defs>
          <linearGradient id="bh-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c98a3e" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#2a1c11" />
            <stop offset="100%" stopColor="#140d08" />
          </linearGradient>
          <linearGradient id="bh-storm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0a52b" stopOpacity="0" />
            <stop offset="100%" stopColor="#8a5a1e" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="600" height="90" fill="url(#bh-sky)" />
        <circle cx="470" cy="26" r="16" fill="#f6dc93" opacity="0.9" />
        <circle cx="505" cy="20" r="9" fill="#f0b45a" opacity="0.8" />
        <rect x="380" y="0" width="220" height="90" fill="url(#bh-storm)" />
        <g stroke="#e8c27a" strokeWidth="1" opacity="0.35">
          {[8, 24, 40, 56, 72].map((y, i) => (<path key={i} d={`M420 ${y} q60 -6 170 2`} fill="none" />))}
        </g>
        <path d="M120 78 C140 52 168 44 190 50 C205 54 214 44 218 30 C224 46 218 62 200 68 C182 74 168 78 160 90 Z" fill="#120c07" opacity="0.9" />
        <path d="M128 80 C146 58 170 51 190 56 C202 59 210 51 214 40 C218 53 212 66 196 71 C180 76 168 80 162 90 Z" fill="#7a4a22" opacity="0.85" />
        <path d="M0 62 Q150 46 300 60 T600 54 V90 H0 Z" fill="#2a1c10" />
        <path d="M0 74 Q160 62 340 74 T600 70 V90 H0 Z" fill="#1c130b" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70">Imperium</div>
          <div className="font-display text-lg font-bold tracking-[0.15em] uppercase text-sand-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">Arrakis</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-sand-100/60">Round</div>
          <div className="text-base font-bold tabular-nums text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {view.round}<span className="text-sand-100/45 text-xs"> / {view.maxRounds}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const LEGEND: Array<{ icon: IconName; label: string }> = [
  { icon: 'persuasion', label: 'Persuasion (buy cards)' },
  { icon: 'sword', label: 'Swords (combat strength)' },
  { icon: 'spice', label: 'Spice (melange)' },
  { icon: 'solari', label: 'Solari (money)' },
  { icon: 'water', label: 'Water' },
  { icon: 'troops', label: 'Troops' },
  { icon: 'draw', label: 'Draw cards' },
  { icon: 'intrigue', label: 'Intrigue card' },
  { icon: 'vp', label: 'Victory point' },
  { icon: 'influence', label: 'Influence (any track)' },
  { icon: 'spiceTrade', label: 'Maker — harvest spice' },
  { icon: 'city', label: 'Control space' },
];

function BoardLegend() {
  return (
    <details className="relative z-20 shrink-0 group">
      <summary className="cursor-pointer list-none select-none rounded-md border border-[#7b422255] bg-black/30 px-2 py-1 text-[10px] uppercase tracking-wider text-sand-100/60 hover:text-sand-200 hover:border-[#7b4222aa]">? Legend</summary>
      <div className="absolute right-0 mt-1 w-56 rounded-lg border border-[#7b4222aa] bg-[#1a130d] p-2 shadow-xl grid grid-cols-1 gap-1">
        {LEGEND.map((e) => (
          <div key={e.icon} className="flex items-center gap-2 text-[11px] text-sand-100/75"><Icon name={e.icon} size={14} /><span>{e.label}</span></div>
        ))}
        <div className="mt-1 pt-1 border-t border-black/40 text-[10px] text-sand-100/45 leading-snug">
          Colored discs are each player's seat color — agents on spaces, troops in the conflict, and markers on the influence tracks.
        </div>
      </div>
    </details>
  );
}

/**
 * The agent board, laid out like the physical Dune: Imperium board — one
 * continuous surface. The four great powers share a single framed panel with
 * their influence ladders; the Landsraad and CHOAM flank the round's Conflict,
 * promoted to a hero card at the center; the Cities and Deep Desert form the
 * lower surface. Every space wears a frame + corner badge naming its kind. When
 * a card is armed in hand, legal destinations light up; clicking one stages the
 * play (unchanged engine wiring).
 */
export default function ImpBoard({ view, viewingAs }: { view: ImpVisibleState; viewingAs: PlayerId | 'SPECTATOR' }) {
  const pending = useImpStore((s) => s.pending);
  const setPending = useImpStore((s) => s.setPending);
  const dispatch = useImpStore((s) => s.dispatch);
  const full = useImpStore((s) => s.state);

  const legalTargets = new Set<string>();
  if (pending && full && viewingAs !== 'SPECTATOR') {
    for (const space of IMP_SPACE_LIST) {
      const verdict = impValidate(full, {
        type: 'imp/playCard',
        playerId: viewingAs,
        cardId: pending.cardId,
        spaceId: space.id,
        choices: space.special === 'sellMelange' ? { sellSpice: 2 } : undefined,
      });
      if (verdict.ok) legalTargets.add(space.id);
    }
  }

  const onSelect = (id: string) => pending && setPending({ ...pending, spaceId: id });
  const common = { view, legalTargets, selectedSpace: pending?.spaceId, onSelect };

  const me = viewingAs !== 'SPECTATOR' ? view.players[viewingAs] : null;
  const yourPlacementTurn = !!me && view.phase === 'playerTurns' && view.turn === viewingAs && !me.revealed && me.agentsLeft > 0;

  return (
    <div
      className={`relative rounded-2xl p-2.5 sm:p-3 overflow-hidden ${yourPlacementTurn ? 'anim-turn' : ''}`}
      style={{
        background: 'radial-gradient(130% 90% at 50% -10%, #2c2016, #16100a 78%)',
        border: '1px solid #7b422277',
        boxShadow: 'inset 0 0 70px -22px #000',
      }}
    >
      <div className="tex-spice absolute inset-0 pointer-events-none opacity-70" aria-hidden />
      <div className="relative flex items-start gap-2">
        <div className="flex-1 min-w-0"><BoardHeader view={view} /></div>
        <BoardLegend />
      </div>
      {yourPlacementTurn && (
        <div className="relative -mt-1 mb-1.5 text-[11px] text-amber-200/80 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 anim-pulse" />
          Your turn — pick a card, then a highlighted space.
        </div>
      )}
      <div className="relative mb-2"><VpTrack view={view} /></div>

      {/* Great powers — one unified surface; grid gap reveals the divider lines */}
      <div className="relative rounded-2xl overflow-hidden" style={{ border: `1px solid ${SURFACE_LINE}`, background: SURFACE_LINE }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-px">
          {IMP_FACTIONS.map((f) => (<FactionCell key={f} faction={f} {...common} />))}
        </div>
      </div>

      {/* Landsraad · Conflict (hero) · CHOAM */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_1.25fr_1fr] gap-2 mt-2 items-stretch">
        <FlankZone group="landsraad" scene="columns" {...common} />
        <div className="lg:order-none order-first"><ConflictHero view={view} viewingAs={viewingAs} full={full} onPass={() => viewingAs !== 'SPECTATOR' && dispatch({ type: 'imp/combatPass', playerId: viewingAs })} /></div>
        <FlankZone group="choam" scene="exchange" footer={<SpiceExchange />} {...common} />
      </div>

      {/* Lower surface — Cities and the Deep Desert as one continuous strip */}
      <div className="relative rounded-2xl overflow-hidden mt-2" style={{ border: `1px solid ${SURFACE_LINE}` }}>
        <SurfaceBand group="city" cols={2} scene="skyline" tint="linear-gradient(180deg, #16202b, #10161d)" {...common} />
        <div style={{ height: 1, background: SURFACE_LINE }} />
        <SurfaceBand group="desert" cols={3} scene="dunes" tint="linear-gradient(180deg, #2b2011, #1b1409)" {...common} />
      </div>
    </div>
  );
}

export { IMP_SPACES };
