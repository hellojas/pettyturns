import { useEffect } from 'react';
import { IMP_CONSTANTS } from '../../imperium/data/constants';
import { Icon, type IconName } from './icons';
import { PLAYER_COLORS } from './visuals';
import { Meeple } from './tokens';

const C = IMP_CONSTANTS;
/** The active rule numbers, so owners can compare against their physical copy. */
const RULE_VALUES: Array<{ label: string; value: string }> = [
  { label: 'Victory target', value: `${C.vpTarget} VP` },
  { label: 'Rounds', value: `${C.maxRounds}` },
  { label: 'Players', value: `${C.minPlayers}–${C.maxPlayers}` },
  { label: 'Hand size', value: `${C.handSize}` },
  { label: 'Starting agents', value: `${C.startingAgents}` },
  { label: 'Start water / solari / spice', value: `${C.startingWater} / ${C.startingSolari} / ${C.startingSpice}` },
  { label: 'Garrison / troop supply', value: `${C.startingGarrison} / ${C.troopSupply}` },
  { label: 'Strength per troop / sword', value: `${C.strengthPerTroop} / ${C.strengthPerSword}` },
  { label: 'Base deploy limit', value: `${C.baseDeployLimit}` },
  { label: 'Influence max', value: `${C.influenceMax}` },
  { label: 'Influence VP levels', value: C.influenceVpLevels.join(', ') },
  { label: 'Alliance level', value: `${C.allianceLevel}` },
  { label: 'Imperium row', value: `${C.imperiumRowSize}` },
  { label: 'Conflict mix (I/II/III)', value: `${C.conflictMix.tier1} / ${C.conflictMix.tier2} / ${C.conflictMix.tier3}` },
  { label: 'Sell melange (2/3/4/5)', value: Object.values(C.sellMelangeRates).join(' / ') },
  { label: 'Tiebreakers', value: [...C.tiebreakers].join(' → ') },
];

/**
 * A newcomer-facing iconography + rules cheat-sheet, opened from the game
 * header's "?" button. It maps every board/card glyph to its meaning and
 * explains the space kinds, seat colors, and scoring gates, so the dense visual
 * language is legible without the rulebook. Original wording only.
 */
const RESOURCES: Array<{ icon: IconName; label: string; desc: string }> = [
  { icon: 'persuasion', label: 'Persuasion', desc: 'Spent on your reveal turn to buy cards from the market.' },
  { icon: 'sword', label: 'Swords', desc: 'Add to your strength in the round’s conflict.' },
  { icon: 'spice', label: 'Spice (melange)', desc: 'The desert currency; sell it for solari, or spend it as a cost.' },
  { icon: 'solari', label: 'Solari', desc: 'Money — pays for high-value spaces and cards.' },
  { icon: 'water', label: 'Water', desc: 'A scarce resource some spaces and cards require.' },
  { icon: 'troops', label: 'Troops', desc: 'Deploy from your garrison into the conflict to fight.' },
  { icon: 'draw', label: 'Draw', desc: 'Draw cards into your hand from your deck.' },
  { icon: 'intrigue', label: 'Intrigue', desc: 'Secret cards played for plots, combat tricks, or endgame points.' },
  { icon: 'vp', label: 'Victory point', desc: 'First to the target VP at a round’s end wins.' },
  { icon: 'influence', label: 'Influence', desc: 'Rise on a faction track for rewards, VP, and its alliance.' },
];

const FACTIONS: Array<{ icon: IconName; label: string; desc: string }> = [
  { icon: 'emperor', label: 'The Emperor', desc: 'Corrino — solari and Sardaukar might.' },
  { icon: 'spacingGuild', label: 'Spacing Guild', desc: 'Foldspace transport and spice logistics.' },
  { icon: 'beneGesserit', label: 'Bene Gesserit', desc: 'Secrets, intrigue, and hidden influence.' },
  { icon: 'fremen', label: 'Fremen', desc: 'Desert power — water and hardened warriors.' },
];

const KINDS: Array<{ icon: IconName; label: string; desc: string }> = [
  { icon: 'spiceTrade', label: 'Maker', desc: 'Harvest spice here; unvisited makers bank a bonus each round.' },
  { icon: 'city', label: 'Control space', desc: 'Win a conflict while holding it to claim its recurring bonus.' },
  { icon: 'sword', label: 'Combat space', desc: 'Deploy troops here to join the round’s conflict.' },
];

export default function ImpLegend({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const Row = ({ icon, label, desc }: { icon: IconName; label: string; desc: string }) => (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid place-items-center w-6 h-6 rounded bg-black/30 shrink-0">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-sand-100">{label}</div>
        <div className="text-[11px] text-sand-100/60 leading-snug">{desc}</div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Iconography and rules cheat-sheet"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-5"
        style={{
          background: 'radial-gradient(120% 90% at 50% -10%, #2c2016, #16100a 78%)',
          border: '1px solid #7b422288',
          boxShadow: '0 24px 60px -20px #000',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tex-spice absolute inset-0 pointer-events-none opacity-40 rounded-2xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold tracking-wide text-sand-200">Icon & rules key</h2>
            <button
              className="btn-secondary !py-0.5 !px-2 !text-sm"
              onClick={onClose}
              aria-label="Close the cheat-sheet"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <section>
              <h3 className="panel-title">Resources &amp; scoring</h3>
              <div className="space-y-2">
                {RESOURCES.map((r) => (
                  <Row key={r.icon} {...r} />
                ))}
              </div>
            </section>
            <div className="space-y-4">
              <section>
                <h3 className="panel-title">Great powers</h3>
                <div className="space-y-2">
                  {FACTIONS.map((r) => (
                    <Row key={r.icon} {...r} />
                  ))}
                </div>
              </section>
              <section>
                <h3 className="panel-title">Board spaces</h3>
                <div className="space-y-2">
                  {KINDS.map((r) => (
                    <Row key={r.label} {...r} />
                  ))}
                </div>
              </section>
              <section>
                <h3 className="panel-title">Seat colors</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {PLAYER_COLORS.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] text-sand-100/70">
                      <Meeple color={c} size={14} /> Player {i + 1}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-sand-100/50 leading-snug">
                  Each seat’s color rides its agents, troop cubes, influence markers, and log entries.
                </p>
              </section>
            </div>
          </div>

          <section className="mt-4 pt-3 border-t border-black/40">
            <h3 className="panel-title">Rule values in play</h3>
            <p className="text-[11px] text-sand-100/45 leading-snug mb-2">
              These are the numbers the engine is using. They’re editable config (owners tune them to match
              their edition); this panel just shows the active values.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {RULE_VALUES.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-2 border-b border-white/5 py-0.5">
                  <span className="text-[11px] text-sand-100/60">{r.label}</span>
                  <span className="text-[11px] font-semibold text-sand-200 tabular-nums text-right">{r.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
