import { IMP_SPACE_LIST, IMP_SPACES } from '../imperium/data/spaces';
import { IMP_CONFLICT_DEFS } from '../imperium/data/conflicts';
import { IMP_CONSTANTS } from '../imperium/data/constants';
import { impValidate } from '../imperium/engine/engine';
import type {
  BoardSpaceDef,
  ImpFactionId,
  ImpVisibleState,
  PlayerId,
  SpaceGroup,
} from '../imperium/types';
import { IMP_FACTIONS } from '../imperium/types';
import { useImpStore } from '../lib/impStore';
import { Icon, type IconName } from './imp/icons';
import { costChips, gainsChips, GROUP_META, PLAYER_COLORS, type Chip } from './imp/visuals';
import { Meeple, TroopCube } from './imp/tokens';
import { RegionBackdrop, type BackdropScene } from './imp/art';
import { SpaceArt } from './imp/cardArt';
import VpTrack from './imp/VpTrack';
import LeaderPortrait from './imp/LeaderPortrait';
import { FlashValue } from './imp/motion';
import { combatStrength } from '../imperium/engine/engine';
import type { ImpGameState } from '../imperium/types';

const { influenceMax, allianceLevel } = IMP_CONSTANTS;
const VP_LEVELS: number[] = [...IMP_CONSTANTS.influenceVpLevels];

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

function ChipRow({ chips, tone }: { chips: Chip[]; tone?: 'cost' }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
      {chips.map((c, i) => (
        <span key={i} title={c.title} className={`inline-flex items-center gap-0.5 ${tone === 'cost' ? 'text-red-200/80' : ''}`}>
          <Icon name={c.icon} size={12} />
          {c.text && <span className="text-[10px] font-semibold tabular-nums">{c.text}</span>}
        </span>
      ))}
    </div>
  );
}

/** Crossed swords — the rulebook's Combat-space marker. */
function CrossedSwords({ size = 13, title }: { size?: number; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <g stroke="#d94f3d" strokeWidth="2.3" strokeLinecap="round">
        <line x1="5" y1="19.5" x2="18.5" y2="5" />
        <line x1="19" y1="19.5" x2="5.5" y2="5" />
      </g>
      <g fill="#b98a3a">
        <rect x="2.6" y="18" width="4.6" height="2.1" rx="1" transform="rotate(45 4.9 19)" />
        <rect x="16.8" y="18" width="4.6" height="2.1" rx="1" transform="rotate(-45 19.1 19)" />
      </g>
    </svg>
  );
}

/** A control-flag banner beneath controllable spaces; filled by its holder. */
function ControlFlag({ color, title }: { color?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} style={{ display: 'inline-block', verticalAlign: 'middle' }} role="img" aria-label={title}>
      <title>{title}</title>
      <line x1="6" y1="3" x2="6" y2="21" stroke="#8a7458" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 4 h11 l-3 3.6 l3 3.6 h-11 Z" fill={color ?? 'none'} stroke={color ?? '#8a7458'} strokeWidth="1.3" />
    </svg>
  );
}

/**
 * A single board location. Keeps every interaction from the original text board
 * (legal-target highlight, occupant disc, click-to-stage) but rendered as a
 * physical space tile: accent spine, cost/gain icons, combat + maker + control
 * markers, and the agent sitting on it.
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
  const special = specialLabel(space);
  const costs = costChips(space.cost);
  const gains = gainsChips(space.gains);

  return (
    <button
      disabled={!legal}
      onClick={onSelect}
      className={`relative w-full text-left rounded-md overflow-hidden border px-2 py-1.5 transition-all ${
        selected
          ? 'ring-2 ring-sand-100 -translate-y-0.5'
          : legal
            ? 'hover:-translate-y-0.5 cursor-pointer animate-none'
            : ''
      }`}
      style={{
        borderColor: occupant && !legal && !selected
          ? `${PLAYER_COLORS[occupantIdx % 4]}88`
          : legal || selected
            ? '#e3bd78'
            : `${accent}55`,
        background: legal
          ? `linear-gradient(150deg, #2c2114, #1c150f), radial-gradient(120% 120% at 50% 0%, ${accent}33, transparent 55%)`
          : `linear-gradient(150deg, #221a12, #1a130d)`,
        boxShadow: legal && !selected
          ? '0 0 0 1px #e3bd7855, 0 0 10px -2px #e3bd7877'
          : occupant && !selected
            ? `inset 0 0 0 1px ${PLAYER_COLORS[occupantIdx % 4]}55`
            : undefined,
        opacity: occupant && !legal && !selected ? 0.82 : 1,
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
            <span
              className="absolute -bottom-1.5 -right-1.5 anim-drop rounded-full"
              title={`agent placed: ${view.players[occupant].name} (${view.players[occupant].leaderId})`}
            >
              <LeaderPortrait
                leaderId={view.players[occupant].leaderId}
                size={22}
                ring={PLAYER_COLORS[occupantIdx % 4]}
                className="!rounded-full"
              />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[12px] text-sand-100 truncate">{space.name}</span>
            {space.maker && <Icon name="spiceTrade" size={12} title="Maker — harvest spice here" />}
            {space.combat && <CrossedSwords size={13} title="Combat space — deploy troops to the Conflict" />}
            {space.maker && bonus > 0 && (
              <span className="anim-pulse inline-flex items-center text-[10px] font-bold" style={{ color: '#e0a52b' }} title={`${bonus} spice waiting`}>
                <Icon name="spice" size={12} />
                {bonus}
              </span>
            )}
            {space.controlBonus && (
              <ControlFlag
                color={controller ? PLAYER_COLORS[controllerIdx % 4] : undefined}
                title={controller ? `controlled by ${view.players[controller].name}` : 'control space — win a Conflict here to claim'}
              />
            )}
            {occupant && (
              <span
                className="ml-auto text-[8px] uppercase tracking-wider font-bold rounded px-1 py-[1px]"
                style={{ background: `${PLAYER_COLORS[occupantIdx % 4]}22`, color: PLAYER_COLORS[occupantIdx % 4] }}
                title={`occupied by ${view.players[occupant].name}`}
              >
                taken
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            {costs.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <ChipRow chips={costs} tone="cost" />
                <span className="text-sand-100/45 text-[11px] font-bold" title="pay to gain">→</span>
              </span>
            )}
            <ChipRow chips={gains} />
            {space.influenceGain && (
              <span className="inline-flex items-center gap-0.5" title={`+1 ${GROUP_META[space.influenceGain].label} influence`}>
                <Icon name={space.influenceGain as IconName} size={12} />
                <span className="text-[10px] font-semibold">+1</span>
              </span>
            )}
            {special && <span className="text-[10px] text-sand-300/80">{special}</span>}
          </div>
          {controller && (
            <div className="mt-0.5 flex items-center gap-1 text-[9px] text-sand-100/50">
              <Meeple color={PLAYER_COLORS[controllerIdx % 4]} size={11} />
              controlled by {view.players[controller].name}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/** Horizontal influence track (0…max): seat pips sit on each level, VP and
 *  alliance milestones are marked with real icons, and the highest level any
 *  player has reached is lit so the standings read at a glance. */
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
            className="flex-1 min-w-0 rounded-sm flex flex-col items-center justify-between gap-[1px] pt-[2px] pb-[1px] relative"
            style={{
              background: level === 0 ? '#00000033' : reached ? '#e3bd7818' : '#ffffff0b',
              border: isAlliance ? '1px solid #e3bd7866' : reached ? '1px solid #e3bd7822' : '1px solid transparent',
            }}
          >
            {/* seat pips currently standing on this level */}
            <div className="flex flex-wrap justify-center gap-[1.5px] min-h-[9px] px-[1px]">
              {here.map((pid) => (
                <span
                  key={pid}
                  className="w-[9px] h-[9px] rounded-full"
                  style={{
                    background: PLAYER_COLORS[view.playerOrder.indexOf(pid) % 4],
                    boxShadow: `0 0 0 1px #00000066, 0 0 4px -1px ${PLAYER_COLORS[view.playerOrder.indexOf(pid) % 4]}`,
                  }}
                  title={`${view.players[pid].name}: ${level}`}
                />
              ))}
            </div>
            {/* milestone marker: VP orb, alliance star, else the level number */}
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
        <span
          className="self-center pl-1 inline-flex items-center"
          title={`${view.players[allianceHolder].name} holds the alliance`}
        >
          <span
            className="w-[9px] h-[9px] rounded-full"
            style={{
              background: PLAYER_COLORS[view.playerOrder.indexOf(allianceHolder) % 4],
              boxShadow: '0 0 0 1.5px #f2c94c',
            }}
          />
        </span>
      )}
    </div>
  );
}

/** One faction region: emblem, influence track, and its two agent spaces. */
function FactionRegion({
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
    <div className="rounded-lg p-1.5 flex flex-col gap-1.5" style={{ background: `${meta.accent}12`, border: `1px solid ${meta.accent}44` }}>
      <div
        className="relative overflow-hidden rounded-md px-1.5 py-1"
        style={{ background: `linear-gradient(90deg, ${meta.accent}30, ${meta.accent}08 70%, transparent)` }}
      >
        <span className="absolute -right-1 -top-2 pointer-events-none" aria-hidden>
          <Icon name={meta.icon} size={42} color={meta.accent} className="opacity-20" />
        </span>
        <div className="relative flex items-center gap-1.5">
          <Icon name={meta.icon} size={16} />
          <span className="font-display text-[13px] font-bold tracking-wide" style={{ color: meta.accent }}>
            {meta.label}
          </span>
        </div>
      </div>
      <InfluenceTrack faction={faction} view={view} />
      <div className="flex flex-col gap-1">
        {spaces.map((s) => (
          <SpaceTile
            key={s.id}
            space={s}
            view={view}
            legal={legalTargets.has(s.id)}
            selected={selectedSpace === s.id}
            onSelect={() => onSelect(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** A titled cluster of non-faction spaces (Landsraad / CHOAM / Cities / Desert). */
function SpaceCluster({
  group,
  view,
  legalTargets,
  selectedSpace,
  onSelect,
  cols = 1,
  scene,
}: {
  group: SpaceGroup;
  view: ImpVisibleState;
  legalTargets: Set<string>;
  selectedSpace?: string;
  onSelect: (id: string) => void;
  cols?: number;
  /** Optional continuous region backdrop tying the cluster into one place. */
  scene?: BackdropScene;
}) {
  const meta = GROUP_META[group];
  const spaces = IMP_SPACE_LIST.filter((s) => s.group === group);
  return (
    <div
      className="relative overflow-hidden rounded-lg p-1.5"
      style={{ background: `${meta.accent}10`, border: `1px solid ${meta.accent}3a` }}
    >
      {scene && <RegionBackdrop scene={scene} color={meta.accent} opacity={0.5} />}
      <div className="relative flex items-center gap-1.5 px-0.5 mb-1.5">
        <Icon name={meta.icon} size={15} />
        <span className="font-display text-[12px] font-bold tracking-wide" style={{ color: meta.accent }}>
          {meta.label}
        </span>
      </div>
      <div
        className="relative grid gap-1"
        style={{
          // Multi-column clusters wrap by available width (min tile ~190px) so
          // cities/desert reflow gracefully in a narrow board column.
          gridTemplateColumns: cols > 1 ? 'repeat(auto-fit, minmax(190px, 1fr))' : '1fr',
        }}
      >
        {spaces.map((s) => (
          <SpaceTile
            key={s.id}
            space={s}
            view={view}
            legal={legalTargets.has(s.id)}
            selected={selectedSpace === s.id}
            onSelect={() => onSelect(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** One combatant's line in the conflict: seat disc, troops, and a strength bar. */
function CombatantRow({
  pid,
  view,
  strength,
  maxStrength,
  leading,
}: {
  pid: PlayerId;
  view: ImpVisibleState;
  strength: number;
  maxStrength: number;
  leading: boolean;
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
          {leading && (
            <Icon name="vp" size={9} color="#f2c94c" title="currently leading the conflict" />
          )}
          <span className="ml-auto inline-flex items-center gap-0.5 shrink-0" title={`${p.inConflict} troop(s) committed`}>
            <TroopCube color={seat} size={11} />
            <span className="text-[9px] font-bold tabular-nums text-sand-100/70">{p.inConflict}</span>
          </span>
        </div>
        {/* strength bar */}
        <div className="mt-[1px] h-[6px] rounded-full overflow-hidden" style={{ background: '#00000055' }}>
          <FlashValue value={strength} className="block h-full">
            <span
              className="block h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: leading ? seat : `${seat}aa`,
                boxShadow: leading ? `0 0 8px -1px ${seat}` : undefined,
              }}
            />
          </FlashValue>
        </div>
      </div>
      <span
        className="text-[11px] font-bold tabular-nums shrink-0 w-5 text-right"
        style={{ color: leading ? '#f2c94c' : '#cdbfa8' }}
        title="combat strength"
      >
        {strength}
      </span>
    </div>
  );
}

/** The board's beating heart: the current conflict, live strengths, and combat. */
function ConflictMedallion({
  view,
  viewingAs,
  full,
  onPass,
}: {
  view: ImpVisibleState;
  viewingAs: PlayerId | 'SPECTATOR';
  full: ImpGameState | null;
  onPass: () => void;
}) {
  const conflict = view.currentConflict ? IMP_CONFLICT_DEFS[view.currentConflict] : null;
  const tierColor = conflict ? ['#8a8f98', '#c98a2b', '#d24b3e'][conflict.tier - 1] : '#8a8f98';
  const combatants = view.playerOrder.filter((pid) => view.players[pid].inConflict > 0);
  const strengthOf = (pid: PlayerId) =>
    full ? combatStrength(full, pid) : view.players[pid].inConflict * IMP_CONSTANTS.strengthPerTroop;
  const strengths = Object.fromEntries(combatants.map((pid) => [pid, strengthOf(pid)]));
  const maxStrength = Math.max(0, ...combatants.map((pid) => strengths[pid]));
  const inCombat = view.phase === 'combat';
  const myWindow = inCombat && view.turn === viewingAs;
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden h-full"
      style={{
        background: 'radial-gradient(120% 100% at 50% 0%, #3a281b, #1a130d 70%)',
        border: '1px solid #7b4222aa',
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(60% 50% at 50% 45%, #e0a52b22, transparent 70%)' }} />
      {/* Crossed-swords battlefield backdrop with garrison rings (the board's center). */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g stroke="#e0a52b" strokeWidth="0.5" fill="none" opacity="0.18">
          <circle cx="24" cy="30" r="12" />
          <circle cx="76" cy="30" r="12" />
          <circle cx="24" cy="72" r="12" />
          <circle cx="76" cy="72" r="12" />
        </g>
        <g stroke="#d94f3d" strokeWidth="2.4" strokeLinecap="round" opacity="0.16">
          <line x1="28" y1="80" x2="72" y2="24" />
          <line x1="72" y1="80" x2="28" y2="24" />
        </g>
      </svg>
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-sand-100/45">Conflict</span>
        <span className="text-[10px] text-sand-100/50 tabular-nums">
          round {view.round}/{view.maxRounds}
        </span>
      </div>
      {conflict ? (
        <>
          <div className="relative flex items-center gap-2">
            <Icon name="sword" size={20} />
            <span className="font-display font-bold text-sand-100 text-[16px] leading-tight">{conflict.name}</span>
            <span
              className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${tierColor}33`, color: tierColor, border: `1px solid ${tierColor}77` }}
            >
              {['I', 'II', 'III'][conflict.tier - 1]}
            </span>
          </div>
          {/* Reward ladder */}
          <div className="relative flex flex-col gap-1 mt-0.5">
            {conflict.rewards.map((r) => (
              <div key={r.place} className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold w-6 h-5 rounded flex items-center justify-center shrink-0"
                  style={{
                    background: r.place === 1 ? '#e3bd7833' : '#ffffff0f',
                    color: r.place === 1 ? '#f2c94c' : '#cdbfa8',
                  }}
                >
                  {r.place === 1 ? '1st' : r.place === 2 ? '2nd' : '3rd'}
                </span>
                <ChipRow chips={gainsChips(r.gains)} />
              </div>
            ))}
          </div>

          {/* Committed forces: seat, troops, and a live strength bar per combatant */}
          <div className="relative mt-auto pt-1.5 border-t border-black/30 flex flex-col gap-1.5">
            {combatants.length > 0 ? (
              combatants
                .slice()
                .sort((a, b) => strengths[b] - strengths[a])
                .map((pid) => (
                  <CombatantRow
                    key={pid}
                    pid={pid}
                    view={view}
                    strength={strengths[pid]}
                    maxStrength={maxStrength}
                    leading={maxStrength > 0 && strengths[pid] === maxStrength}
                  />
                ))
            ) : (
              <span className="text-[9px] text-sand-100/35 italic py-1">no troops committed yet</span>
            )}
          </div>

          {/* Combat window controls (merged in from the old sidebar panel) */}
          {inCombat && (
            <div className="relative rounded-md border border-red-900/60 bg-red-950/25 p-1.5 flex items-center gap-2">
              <span className="anim-pulse text-[11px] font-bold text-red-300 inline-flex items-center gap-1">
                <Icon name="sword" size={13} /> Combat!
              </span>
              {myWindow ? (
                <button className="btn !py-0.5 !px-2 !text-[11px] ml-auto" onClick={onPass}>
                  Pass
                </button>
              ) : (
                <span className="ml-auto text-[10px] text-sand-100/60">
                  {view.turn ? `waiting for ${view.players[view.turn].name}` : 'resolving…'}
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-sand-100/40 text-sm italic">No active conflict.</div>
      )}
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
        {/* twin suns of Arrakis */}
        <circle cx="470" cy="26" r="16" fill="#f6dc93" opacity="0.9" />
        <circle cx="505" cy="20" r="9" fill="#f0b45a" opacity="0.8" />
        {/* Coriolis storm wall sweeping in from the right */}
        <rect x="380" y="0" width="220" height="90" fill="url(#bh-storm)" />
        <g stroke="#e8c27a" strokeWidth="1" opacity="0.35">
          {[8, 24, 40, 56, 72].map((y, i) => (
            <path key={i} d={`M420 ${y} q60 -6 170 2`} fill="none" />
          ))}
        </g>
        {/* distant sandworm cresting a dune */}
        <path d="M120 78 C140 52 168 44 190 50 C205 54 214 44 218 30 C224 46 218 62 200 68 C182 74 168 78 160 90 Z" fill="#120c07" opacity="0.9" />
        <path d="M128 80 C146 58 170 51 190 56 C202 59 210 51 214 40 C218 53 212 66 196 71 C180 76 168 80 162 90 Z" fill="#7a4a22" opacity="0.85" />
        {/* dune ridges */}
        <path d="M0 62 Q150 46 300 60 T600 54 V90 H0 Z" fill="#2a1c10" />
        <path d="M0 74 Q160 62 340 74 T600 70 V90 H0 Z" fill="#1c130b" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70">Imperium</div>
          <div className="font-display text-lg font-bold tracking-wide text-sand-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            Arrakis
          </div>
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

/** A collapsible key for the custom glyphs, so a first-time viewer can decode them. */
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
      <summary className="cursor-pointer list-none select-none rounded-md border border-[#7b422255] bg-black/30 px-2 py-1 text-[10px] uppercase tracking-wider text-sand-100/60 hover:text-sand-200 hover:border-[#7b4222aa]">
        ? Legend
      </summary>
      <div className="absolute right-0 mt-1 w-56 rounded-lg border border-[#7b4222aa] bg-[#1a130d] p-2 shadow-xl grid grid-cols-1 gap-1">
        {LEGEND.map((e) => (
          <div key={e.icon} className="flex items-center gap-2 text-[11px] text-sand-100/75">
            <Icon name={e.icon} size={14} />
            <span>{e.label}</span>
          </div>
        ))}
        <div className="mt-1 pt-1 border-t border-black/40 text-[10px] text-sand-100/45 leading-snug">
          Colored discs are each player's seat color — agents on spaces, troops in
          the conflict, and markers on the influence tracks.
        </div>
      </div>
    </details>
  );
}

/**
 * The agent board, laid out like the physical Dune: Imperium board — four
 * faction regions with influence tracks along the top, the Landsraad and CHOAM
 * flanking the conflict at the center, cities and the deep desert below. When a
 * card is armed in hand, legal destinations light up; clicking one stages the
 * play (unchanged from the original engine wiring).
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

  // Turn affordance: pulse the board while it's this seat's placement turn.
  const me = viewingAs !== 'SPECTATOR' ? view.players[viewingAs] : null;
  const yourPlacementTurn =
    !!me && view.phase === 'playerTurns' && view.turn === viewingAs && !me.revealed && me.agentsLeft > 0;

  return (
    <div
      className={`relative rounded-2xl p-2.5 sm:p-3 overflow-hidden ${yourPlacementTurn ? 'anim-turn' : ''}`}
      style={{
        background: 'radial-gradient(120% 80% at 50% -10%, #2a2016, #17110b 75%)',
        border: '1px solid #7b422277',
        boxShadow: 'inset 0 0 60px -20px #000',
      }}
    >
      <div className="tex-spice absolute inset-0 pointer-events-none opacity-70" aria-hidden />
      {/* Arrakis panorama header + icon legend */}
      <div className="relative flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <BoardHeader view={view} />
        </div>
        <BoardLegend />
      </div>
      {yourPlacementTurn && (
        <div className="relative -mt-1 mb-1.5 text-[11px] text-amber-200/80 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 anim-pulse" />
          Your turn — pick a card, then a highlighted space.
        </div>
      )}
      {/* Victory track across the top edge */}
      <div className="relative mb-2">
        <VpTrack view={view} />
      </div>
      {/* Faction regions — a roomy 2×2 at typical widths, going 4-wide only on
          large screens so they never cram into four narrow columns. */}
      <div className="relative grid gap-2 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4">
        {IMP_FACTIONS.map((f) => (
          <FactionRegion key={f} faction={f} {...common} />
        ))}
      </div>

      {/* Landsraad · Conflict · CHOAM */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.15fr_1fr_0.85fr] gap-2 mt-2 items-stretch">
        <SpaceCluster group="landsraad" cols={1} scene="columns" {...common} />
        <ConflictMedallion
          view={view}
          viewingAs={viewingAs}
          full={full}
          onPass={() => viewingAs !== 'SPECTATOR' && dispatch({ type: 'imp/combatPass', playerId: viewingAs })}
        />
        <SpaceCluster group="choam" cols={1} scene="exchange" {...common} />
      </div>

      {/* Cities */}
      <div className="relative mt-2">
        <SpaceCluster group="city" cols={2} scene="skyline" {...common} />
      </div>

      {/* Deep desert */}
      <div className="relative mt-2">
        <SpaceCluster group="desert" cols={3} scene="dunes" {...common} />
      </div>
    </div>
  );
}

export { IMP_SPACES };
