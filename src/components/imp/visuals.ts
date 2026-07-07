import type { AgentIcon, Costs, Gains, ImpCardDef, SpaceGroup } from '../../imperium/types';
import { IMP_CARD_DEFS } from '../../imperium/data/cards';
import { ICON_COLORS, type IconName } from './icons';

/**
 * Player seat colors (troop cubes / agent discs / influence markers). Chosen to
 * stay off the red-green confusion axis so seats remain distinguishable for the
 * most common color-vision deficiencies; a redundant seat-number channel on
 * board tokens backs this up. VERIFY: hexes tuned for contrast on the dark board.
 */
export const PLAYER_COLORS = ['#3b82f6', '#e08a2b', '#14b8a6', '#d846b0'];

/** Region accent + label per board group, tuned to the physical board zones. */
export const GROUP_META: Record<SpaceGroup, { label: string; accent: string; icon: IconName }> = {
  emperor: { label: 'The Emperor', accent: ICON_COLORS.emperor, icon: 'emperor' },
  spacingGuild: { label: 'Spacing Guild', accent: ICON_COLORS.spacingGuild, icon: 'spacingGuild' },
  beneGesserit: { label: 'Bene Gesserit', accent: ICON_COLORS.beneGesserit, icon: 'beneGesserit' },
  fremen: { label: 'Fremen', accent: ICON_COLORS.fremen, icon: 'fremen' },
  landsraad: { label: 'Landsraad', accent: ICON_COLORS.landsraad, icon: 'landsraad' },
  choam: { label: 'CHOAM', accent: ICON_COLORS.spiceTrade, icon: 'spiceTrade' },
  city: { label: 'Cities', accent: ICON_COLORS.city, icon: 'city' },
  desert: { label: 'Deep Desert', accent: ICON_COLORS.spice, icon: 'spice' },
};

/** A renderable effect token: an icon plus an optional amount/label. */
export interface Chip {
  icon: IconName;
  text: string;
  title: string;
}

const FACTION_LABEL: Record<string, string> = {
  emperor: 'Emperor',
  spacingGuild: 'Spacing Guild',
  beneGesserit: 'Bene Gesserit',
  fremen: 'Fremen',
};

/** The card's faction (for the rulebook-style faction band), if it has one. */
export function cardFaction(def: ImpCardDef): { id: IconName; label: string; accent: string } | null {
  const f = def.icons.find(
    (i) => i === 'emperor' || i === 'spacingGuild' || i === 'beneGesserit' || i === 'fremen',
  );
  if (!f) return null;
  return { id: f as IconName, label: FACTION_LABEL[f].toUpperCase(), accent: ICON_COLORS[f as IconName] };
}

/** Turn a Gains bundle into ordered, icon-backed chips for the UI. */
export function gainsChips(g: Gains | undefined): Chip[] {
  if (!g) return [];
  const out: Chip[] = [];
  if (g.spice) out.push({ icon: 'spice', text: `+${g.spice}`, title: `gain ${g.spice} spice` });
  if (g.solari) out.push({ icon: 'solari', text: `+${g.solari}`, title: `gain ${g.solari} solari` });
  if (g.water) out.push({ icon: 'water', text: `+${g.water}`, title: `gain ${g.water} water` });
  if (g.troops) out.push({ icon: 'troops', text: `+${g.troops}`, title: `recruit ${g.troops} troops` });
  if (g.drawCards) out.push({ icon: 'draw', text: `+${g.drawCards}`, title: `draw ${g.drawCards}` });
  if (g.intrigueCards) out.push({ icon: 'intrigue', text: `+${g.intrigueCards}`, title: `draw ${g.intrigueCards} intrigue` });
  if (g.influence) {
    for (const [f, n] of Object.entries(g.influence)) {
      if (n) out.push({ icon: f as IconName, text: `+${n}`, title: `+${n} ${FACTION_LABEL[f]} influence` });
    }
  }
  if (g.anyInfluence) out.push({ icon: 'influence', text: `+${g.anyInfluence}`, title: `+${g.anyInfluence} influence (any track)` });
  if (g.persuasion) out.push({ icon: 'persuasion', text: `+${g.persuasion}`, title: `+${g.persuasion} persuasion` });
  if (g.swords) out.push({ icon: 'sword', text: `+${g.swords}`, title: `+${g.swords} swords` });
  if (g.vp) out.push({ icon: 'vp', text: `+${g.vp}`, title: `+${g.vp} victory point${g.vp > 1 ? 's' : ''}` });
  if (g.trashCards) out.push({ icon: 'trash', text: g.trashCards > 1 ? `${g.trashCards}` : '', title: `trash up to ${g.trashCards} card${g.trashCards > 1 ? 's' : ''} from hand/discard` });
  if (g.acquireReserveCard) {
    const name = IMP_CARD_DEFS[g.acquireReserveCard]?.name ?? g.acquireReserveCard;
    out.push({ icon: 'draw', text: name, title: `acquire ${name}` });
  }
  if (g.stealIntrigueAt) out.push({ icon: 'intrigue', text: '↯', title: `steal an intrigue card from rich opponents` });
  if (g.control) out.push({ icon: 'city', text: 'control', title: `take control of ${g.control}` });
  return out;
}

/** Turn a Costs bundle into ordered, icon-backed chips (rendered as a price). */
export function costChips(c: Costs | undefined): Chip[] {
  if (!c) return [];
  const out: Chip[] = [];
  if (c.spice) out.push({ icon: 'spice', text: `${c.spice}`, title: `costs ${c.spice} spice` });
  if (c.solari) out.push({ icon: 'solari', text: `${c.solari}`, title: `costs ${c.solari} solari` });
  if (c.water) out.push({ icon: 'water', text: `${c.water}`, title: `costs ${c.water} water` });
  if (c.troops) out.push({ icon: 'troops', text: `-${c.troops}`, title: `spend ${c.troops} troops` });
  if (c.influenceRequired) {
    out.push({
      icon: c.influenceRequired.faction as IconName,
      text: `≥${c.influenceRequired.min}`,
      title: `requires ${c.influenceRequired.min}+ ${FACTION_LABEL[c.influenceRequired.faction]} influence`,
    });
  }
  return out;
}

/** The dominant faction/location color for a card, used to tint its face. */
export function cardAccent(def: ImpCardDef): string {
  const primary: AgentIcon | undefined = def.icons.find(
    (i) => i === 'emperor' || i === 'spacingGuild' || i === 'beneGesserit' || i === 'fremen',
  );
  return ICON_COLORS[(primary ?? def.icons[0] ?? 'landsraad') as IconName];
}
