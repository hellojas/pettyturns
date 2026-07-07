import type { BoardSpaceDef, SpaceId } from '../types';

/**
 * Board spaces — EDITABLE CONFIG.
 *
 * VERIFY: costs, rewards, combat icons, and requirements were entered from
 * memory of the base game; check each against the board you own and adjust.
 * Confirmed from public rules summaries: Arrakeen (troop + card draw, control
 * pays 1 solari), Carthag (troop + intrigue, control pays 1 solari), three
 * maker desert spaces, faction spaces grant 1 influence.
 */
export const IMP_SPACES: Record<SpaceId, BoardSpaceDef> = {
  // --- Emperor ---
  conspire: {
    id: 'conspire',
    name: 'Conspire',
    group: 'emperor',
    icon: 'emperor',
    cost: { spice: 4 },
    gains: { solari: 5, troops: 2, intrigueCards: 1 },
    influenceGain: 'emperor',
  },
  wealth: {
    id: 'wealth',
    name: 'Wealth',
    group: 'emperor',
    icon: 'emperor',
    gains: { solari: 2 },
    influenceGain: 'emperor',
  },

  // --- Spacing Guild ---
  heighliner: {
    id: 'heighliner',
    name: 'Heighliner',
    group: 'spacingGuild',
    icon: 'spacingGuild',
    cost: { spice: 6 },
    gains: { troops: 5, water: 2 },
    influenceGain: 'spacingGuild',
    combat: true,
  },
  foldspaceSpace: {
    id: 'foldspaceSpace',
    name: 'Foldspace',
    group: 'spacingGuild',
    icon: 'spacingGuild',
    gains: { acquireReserveCard: 'foldspace' },
    influenceGain: 'spacingGuild',
  },

  // --- Bene Gesserit ---
  selectiveBreeding: {
    id: 'selectiveBreeding',
    name: 'Selective Breeding',
    group: 'beneGesserit',
    icon: 'beneGesserit',
    cost: { spice: 2 },
    gains: { trashCards: 1, drawCards: 2 }, // Confirmed: trash one card, draw two (also grants Bene Gesserit influence)
    influenceGain: 'beneGesserit',
  },
  secrets: {
    id: 'secrets',
    name: 'Secrets',
    group: 'beneGesserit',
    icon: 'beneGesserit',
    gains: { intrigueCards: 1, stealIntrigueAt: 4 },
    influenceGain: 'beneGesserit',
  },

  // --- Fremen ---
  hardyWarriors: {
    id: 'hardyWarriors',
    name: 'Hardy Warriors',
    group: 'fremen',
    icon: 'fremen',
    cost: { water: 1 },
    gains: { troops: 2 },
    influenceGain: 'fremen',
    combat: true,
  },
  stillsuits: {
    id: 'stillsuits',
    name: 'Stillsuits',
    group: 'fremen',
    icon: 'fremen',
    gains: { water: 1 },
    influenceGain: 'fremen',
    combat: true,
  },

  // --- Landsraad ---
  highCouncil: {
    id: 'highCouncil',
    name: 'High Council',
    group: 'landsraad',
    icon: 'landsraad',
    cost: { solari: 5 },
    special: 'highCouncil', // permanent seat: +2 persuasion every reveal; once per game
  },
  mentat: {
    id: 'mentat',
    name: 'Mentat',
    group: 'landsraad',
    icon: 'landsraad',
    cost: { solari: 2 },
    gains: { drawCards: 1 },
    special: 'mentat', // take the shared mentat as an extra agent this round
  },
  swordmaster: {
    id: 'swordmaster',
    name: 'Swordmaster',
    group: 'landsraad',
    icon: 'landsraad',
    cost: { solari: 8 },
    special: 'swordmaster', // permanent third agent; once per game
  },
  rallyTroops: {
    id: 'rallyTroops',
    name: 'Rally Troops',
    group: 'landsraad',
    icon: 'landsraad',
    cost: { solari: 4 },
    gains: { troops: 4 },
  },
  hallOfOratory: {
    id: 'hallOfOratory',
    name: 'Hall of Oratory',
    group: 'landsraad',
    icon: 'landsraad',
    gains: { troops: 1 }, // VERIFY: some printings also grant +1 persuasion at reveal
  },

  // --- CHOAM ---
  secureContract: {
    id: 'secureContract',
    name: 'Secure Contract',
    group: 'choam',
    icon: 'spiceTrade',
    gains: { solari: 3 },
  },
  sellMelange: {
    id: 'sellMelange',
    name: 'Sell Melange',
    group: 'choam',
    icon: 'spiceTrade',
    special: 'sellMelange', // choose 2–5 spice → solari per the configured rates
  },

  // --- Cities ---
  arrakeen: {
    id: 'arrakeen',
    name: 'Arrakeen',
    group: 'city',
    icon: 'city',
    gains: { troops: 1, drawCards: 1 },
    combat: true,
    controlBonus: { solari: 1 },
  },
  carthag: {
    id: 'carthag',
    name: 'Carthag',
    group: 'city',
    icon: 'city',
    gains: { troops: 1, intrigueCards: 1 },
    combat: true,
    controlBonus: { solari: 1 },
  },
  researchStation: {
    id: 'researchStation',
    name: 'Research Station',
    group: 'city',
    icon: 'city',
    cost: { water: 2 },
    gains: { drawCards: 3 },
    combat: true,
  },
  sietchTabr: {
    id: 'sietchTabr',
    name: 'Sietch Tabr',
    group: 'city',
    icon: 'city',
    cost: { influenceRequired: { faction: 'fremen', min: 2 } },
    gains: { troops: 1, water: 1 },
    combat: true,
  },

  // --- Desert (makers) ---
  imperialBasin: {
    id: 'imperialBasin',
    name: 'Imperial Basin',
    group: 'desert',
    icon: 'spiceTrade',
    gains: { spice: 1 },
    combat: true,
    maker: true,
    controlBonus: { spice: 1 },
  },
  haggaBasin: {
    id: 'haggaBasin',
    name: 'Hagga Basin',
    group: 'desert',
    icon: 'spiceTrade',
    cost: { water: 1 },
    gains: { spice: 2 },
    combat: true,
    maker: true,
  },
  theGreatFlat: {
    id: 'theGreatFlat',
    name: 'The Great Flat',
    group: 'desert',
    icon: 'spiceTrade',
    cost: { water: 2 },
    gains: { spice: 3 },
    combat: true,
    maker: true,
  },
};

export const IMP_SPACE_LIST = Object.values(IMP_SPACES);
export const CONTROL_SPACE_IDS: SpaceId[] = IMP_SPACE_LIST.filter((s) => s.controlBonus).map((s) => s.id);
export const MAKER_SPACE_IDS: SpaceId[] = IMP_SPACE_LIST.filter((s) => s.maker).map((s) => s.id);
