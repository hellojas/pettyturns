import type { ImpCardDef, CardDefId } from '../types';

/**
 * Card pool — EDITABLE CONFIG.
 *
 * All entries carry only machine-readable mechanics (costs, icons, numeric
 * effects) plus a short name; there is intentionally no card text here.
 * VERIFY every entry against the cards in the copy you own — especially the
 * imperium deck, which ships here as a representative subset you can extend
 * card-by-card in this file (add a def with `source: 'imperium'` and a count).
 */

const ALL_ICONS: ImpCardDef['icons'] = [
  'emperor',
  'spacingGuild',
  'beneGesserit',
  'fremen',
  'landsraad',
  'city',
  'spiceTrade',
];
const FACTION_ICONS: ImpCardDef['icons'] = ['emperor', 'spacingGuild', 'beneGesserit', 'fremen'];

export const IMP_CARD_DEFS: Record<CardDefId, ImpCardDef> = {
  // --------------------------------------------------------------------
  // Starting deck (10 per player). VERIFY icons and reveal values.
  // --------------------------------------------------------------------
  convincingArgument: {
    id: 'convincingArgument',
    name: 'Convincing Argument',
    cost: 0,
    count: 0,
    icons: [], // reveal-only card
    revealGains: { persuasion: 2 },
    source: 'starting',
  },
  dagger: {
    id: 'dagger',
    name: 'Dagger',
    cost: 0,
    count: 0,
    icons: ['landsraad'],
    revealGains: { swords: 1 },
    source: 'starting',
  },
  desertHomeworld: {
    id: 'desertHomeworld',
    name: 'Dune, the Desert Planet',
    cost: 0,
    count: 0,
    icons: ['spiceTrade'],
    revealGains: { persuasion: 1 },
    source: 'starting',
  },
  diplomacy: {
    id: 'diplomacy',
    name: 'Diplomacy',
    cost: 0,
    count: 0,
    icons: FACTION_ICONS,
    revealGains: { persuasion: 1 },
    source: 'starting',
  },
  reconnaissance: {
    id: 'reconnaissance',
    name: 'Reconnaissance',
    cost: 0,
    count: 0,
    icons: ['city'],
    revealGains: { persuasion: 1 },
    source: 'starting',
  },
  seekAllies: {
    id: 'seekAllies',
    name: 'Seek Allies',
    cost: 0,
    count: 0,
    icons: FACTION_ICONS,
    trashAfterAgent: true, // leaves the deck after its first agent use
    source: 'starting',
  },
  signetRing: {
    id: 'signetRing',
    name: 'Signet Ring',
    cost: 0,
    count: 0,
    icons: ['landsraad', 'city', 'spiceTrade'],
    signet: true, // plays the leader's signet ability
    revealGains: { persuasion: 1 },
    source: 'starting',
  },

  /** Copies of each starting card per player. */
  // (see STARTING_DECK below)

  // --------------------------------------------------------------------
  // Reserve (always purchasable / granted). VERIFY.
  // --------------------------------------------------------------------
  foldspace: {
    id: 'foldspace',
    name: 'Foldspace',
    cost: 0, // acquired via the Foldspace space, not bought
    count: 0,
    icons: ALL_ICONS,
    agentGains: { drawCards: 1 },
    trashAfterAgent: true,
    source: 'reserve',
  },
  arrakisLiaison: {
    id: 'arrakisLiaison',
    name: 'Arrakis Liaison',
    cost: 2,
    count: 0,
    icons: ['landsraad', 'city'],
    revealGains: { persuasion: 2 },
    source: 'reserve',
  },
  theSpiceMustFlow: {
    id: 'theSpiceMustFlow',
    name: 'The Spice Must Flow',
    cost: 9,
    count: 0,
    icons: [],
    acquireGains: { vp: 1 },
    revealGains: { spice: 1 },
    source: 'reserve',
  },

  // --------------------------------------------------------------------
  // Imperium deck (base game). Rebuilt from the DI_Card_Inventory_v3.0
  // reference in /assets: names, costs, counts, icons, and directly-
  // expressible effects. A TODO(fidelity) note marks effects that need
  // an engine primitive the Gains/Costs model does not yet have
  // (OR-choices, alliance/influence conditionals, on-trash triggers,
  // retreat, per-affiliation counts, optional pay-for-bonus).
  // --------------------------------------------------------------------
  // TODO(fidelity): unique: +4 Solari When Trashed
  assassinationMission: {
    id: 'assassinationMission',
    name: "Assassination Mission",
    cost: 1,
    count: 2,
    icons: [],
    revealGains: { solari: 1, swords: 1 },
    source: 'imperium',
  },
  drYueh: {
    id: 'drYueh',
    name: "Dr. Yueh",
    cost: 1,
    count: 1,
    icons: ['city'],
    agentGains: { drawCards: 1 },
    revealGains: { persuasion: 1 },
    source: 'imperium',
  },
  missionariaProtectiva: {
    id: 'missionariaProtectiva',
    name: "Missionaria Protectiva",
    cost: 1,
    count: 2,
    icons: ['city'],
    revealGains: { persuasion: 1 },
    source: 'imperium',
  },
  sardaukarInfantry: {
    id: 'sardaukarInfantry',
    name: "Sardaukar Infantry",
    cost: 1,
    count: 2,
    icons: [],
    revealGains: { persuasion: 1, swords: 2 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: Retreat up to 2 Troops from Conflict
  scout: {
    id: 'scout',
    name: "Scout",
    cost: 1,
    count: 2,
    icons: ['city', 'spiceTrade'],
    revealGains: { persuasion: 1, swords: 1 },
    source: 'imperium',
  },
  arrakisRecruiter: {
    id: 'arrakisRecruiter',
    name: "Arrakis Recruiter",
    cost: 2,
    count: 2,
    icons: ['city'],
    agentGains: { troops: 1 },
    revealGains: { persuasion: 1, swords: 1 },
    source: 'imperium',
  },
  guildAdministrator: {
    id: 'guildAdministrator',
    name: "Guild Administrator",
    cost: 2,
    count: 2,
    icons: ['spiceTrade', 'spacingGuild'],
    agentGains: { trashCards: 1 },
    revealGains: { persuasion: 1 },
    source: 'imperium',
  },
  imperialSpy: {
    id: 'imperialSpy',
    name: "Imperial Spy",
    cost: 2,
    count: 2,
    icons: ['emperor'],
    agentGains: { trashCards: 1 },
    revealGains: { persuasion: 1, swords: 1 },
    source: 'imperium',
  },
  spiceHunter: {
    id: 'spiceHunter',
    name: "Spice Hunter",
    cost: 2,
    count: 2,
    icons: ['spiceTrade', 'fremen'],
    revealGains: { persuasion: 1, swords: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: Pay 2 spice: +1 Spacing Guild Influence
  spiceSmugglers: {
    id: 'spiceSmugglers',
    name: "Spice Smugglers",
    cost: 2,
    count: 2,
    icons: ['city'],
    agentGains: { solari: 3 },
    revealGains: { persuasion: 1, swords: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: Block 1 board space for Opponents this round
  theVoice: {
    id: 'theVoice',
    name: "The Voice",
    cost: 2,
    count: 2,
    icons: ['city', 'spiceTrade'],
    revealGains: { persuasion: 2 },
    source: 'imperium',
  },
  beneGesseritInitiate: {
    id: 'beneGesseritInitiate',
    name: "Bene Gesserit Initiate",
    cost: 3,
    count: 2,
    icons: ['landsraad', 'city', 'spiceTrade'],
    agentGains: { drawCards: 1 },
    revealGains: { persuasion: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: +2 Persuation Or +2 Swords
  beneGesseritSister: {
    id: 'beneGesseritSister',
    name: "Bene Gesserit Sister",
    cost: 3,
    count: 3,
    icons: ['landsraad', 'beneGesserit'],
    source: 'imperium',
  },
  crysknife: {
    id: 'crysknife',
    name: "Crysknife",
    cost: 3,
    count: 1,
    icons: ['spiceTrade', 'fremen'],
    agentGains: { solari: 1 },
    revealGains: { swords: 1 },
    source: 'imperium',
  },
  fedaykinDeathCommando: {
    id: 'fedaykinDeathCommando',
    name: "Fedaykin Death Commando",
    cost: 3,
    count: 2,
    icons: ['city', 'spiceTrade'],
    agentGains: { trashCards: 1 },
    revealGains: { persuasion: 1 },
    source: 'imperium',
  },
  geneManipulation: {
    id: 'geneManipulation',
    name: "Gene Manipulation",
    cost: 3,
    count: 2,
    icons: ['landsraad', 'city'],
    agentGains: { trashCards: 1 },
    revealGains: { persuasion: 2 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: The Spice Must Flow costs 3 less this turn
  guildBankers: {
    id: 'guildBankers',
    name: "Guild Bankers",
    cost: 3,
    count: 1,
    icons: ['landsraad', 'emperor', 'spacingGuild'],
    source: 'imperium',
  },
  // TODO(fidelity): agent: Pay 1 Influence and 2 Spice to gain +2 other Influence
  shiftingAllegiances: {
    id: 'shiftingAllegiances',
    name: "Shifting Allegiances",
    cost: 3,
    count: 2,
    icons: ['landsraad', 'spiceTrade'],
    revealGains: { persuasion: 2 },
    source: 'imperium',
  },
  spaceTravel: {
    id: 'spaceTravel',
    name: "Space Travel",
    cost: 3,
    count: 2,
    icons: ['spacingGuild'],
    agentGains: { drawCards: 1 },
    revealGains: { persuasion: 2 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: Opponents discard 1 card or lose 1 deployed Troop
  testOfHumanity: {
    id: 'testOfHumanity',
    name: "Test of Humanity",
    cost: 3,
    count: 1,
    icons: ['landsraad', 'city', 'beneGesserit'],
    revealGains: { persuasion: 2 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: Pay 1 water: +1 Troop
  duncanIdaho: {
    id: 'duncanIdaho',
    name: "Duncan Idaho",
    cost: 4,
    count: 1,
    icons: ['city'],
    agentGains: { drawCards: 1 },
    revealGains: { water: 1, swords: 2 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: Pay 2 Solari: +1 Influence with: Spacing Guild OR Bene Gesserit OR Fremen; reveal: Having Emperor Alliance: +4 Persuasion
  firmGrip: {
    id: 'firmGrip',
    name: "Firm Grip",
    cost: 4,
    count: 1,
    icons: ['landsraad', 'emperor'],
    source: 'imperium',
  },
  // TODO(fidelity): agent: Pay 2 Spice: +3 Troops
  fremenCamp: {
    id: 'fremenCamp',
    name: "Fremen Camp",
    cost: 4,
    count: 2,
    icons: ['spiceTrade'],
    revealGains: { persuasion: 2, swords: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: +1 Spacing Guild Influence or +2 Spice; reveal: Having Spacing Guild Alliance: Pay 3 Spice for +1 VP
  guildAmbassador: {
    id: 'guildAmbassador',
    name: "Guild Ambassador",
    cost: 4,
    count: 1,
    icons: ['landsraad'],
    source: 'imperium',
  },
  // TODO(fidelity): agent: Each opponent loses 1 Garrisoned Troop; reveal: You may deploy a troop from your Garrison to the Conflict
  gunThopter: {
    id: 'gunThopter',
    name: "Gun Thopter",
    cost: 4,
    count: 2,
    icons: ['city', 'spiceTrade'],
    revealGains: { swords: 3 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: Draw 1 card or Draw 1 Bene Gesserit card from your discard pile
  otherMemory: {
    id: 'otherMemory',
    name: "Other Memory",
    cost: 4,
    count: 1,
    icons: ['city', 'spiceTrade'],
    revealGains: { persuasion: 2 },
    source: 'imperium',
  },
  sietchReverendMother: {
    id: 'sietchReverendMother',
    name: "Sietch Reverend Mother",
    cost: 4,
    count: 1,
    icons: ['beneGesserit', 'fremen'],
    agentGains: { trashCards: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: With 2 Spacing Guild Influence: Draw 2 cards
  smugglersThopter: {
    id: 'smugglersThopter',
    name: "Smuggler's Thopter",
    cost: 4,
    count: 2,
    icons: ['spiceTrade'],
    revealGains: { spice: 1, persuasion: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: Double base spice harvest (not bonus)
  carryall: {
    id: 'carryall',
    name: "Carryall",
    cost: 5,
    count: 1,
    icons: ['spiceTrade'],
    revealGains: { spice: 1, persuasion: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: Retreat any number of Troops
  chani: {
    id: 'chani',
    name: "Chani",
    cost: 5,
    count: 1,
    icons: ['city', 'spiceTrade', 'fremen'],
    revealGains: { persuasion: 2 },
    acquireGains: { water: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: +2 Persuation for each Fremen card in play and including this one
  lietKynes: {
    id: 'lietKynes',
    name: "Liet Kynes",
    cost: 5,
    count: 1,
    icons: ['city', 'fremen'],
    acquireGains: { influence: { emperor: 1 } },
    source: 'imperium',
  },
  piterDeVries: {
    id: 'piterDeVries',
    name: "Piter De Vries",
    cost: 5,
    count: 1,
    icons: ['landsraad', 'city'],
    agentGains: { intrigueCards: 1 },
    revealGains: { persuasion: 3, swords: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): agent: +2 Influence instead of +1 Influence
  powerPlay: {
    id: 'powerPlay',
    name: "Power Play",
    cost: 5,
    count: 3,
    icons: ['emperor', 'spacingGuild', 'beneGesserit', 'fremen'],
    agentGains: { trashCards: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: Deploy up to 3 troops from Garrison to Conflict
  sardaukarLegion: {
    id: 'sardaukarLegion',
    name: "Sardaukar Legion",
    cost: 5,
    count: 2,
    icons: ['landsraad', 'emperor'],
    agentGains: { troops: 2 },
    revealGains: { persuasion: 1 },
    source: 'imperium',
  },
  stilgar: {
    id: 'stilgar',
    name: "Stilgar",
    cost: 5,
    count: 1,
    icons: ['city', 'spiceTrade', 'fremen'],
    agentGains: { water: 1 },
    revealGains: { persuasion: 2, swords: 3 },
    source: 'imperium',
  },
  thufirHawat: {
    id: 'thufirHawat',
    name: "Thufir Hawat",
    cost: 5,
    count: 1,
    icons: ['city', 'spiceTrade', 'emperor', 'spacingGuild', 'beneGesserit', 'fremen'],
    agentGains: { drawCards: 1 },
    revealGains: { intrigueCards: 1, persuasion: 1 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: Pay 3 solari: +2 Troops to Garrison or Conflict
  gurneyHalleck: {
    id: 'gurneyHalleck',
    name: "Gurney Halleck",
    cost: 6,
    count: 1,
    icons: ['city'],
    agentGains: { troops: 2, drawCards: 1 },
    revealGains: { persuasion: 2 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: Pay 6 Solari for +1 VP
  opulence: {
    id: 'opulence',
    name: "Opulence",
    cost: 6,
    count: 1,
    icons: ['emperor'],
    agentGains: { solari: 3 },
    revealGains: { persuasion: 1 },
    source: 'imperium',
  },
  reverendMotherMohaim: {
    id: 'reverendMotherMohaim',
    name: "Reverend Mother Mohaim",
    cost: 6,
    count: 1,
    icons: ['emperor', 'beneGesserit'],
    revealGains: { spice: 2, persuasion: 2 },
    source: 'imperium',
  },
  // TODO(fidelity): reveal: Having 2 Fremen Influence: +4 Swords and Having Fremen Alliance: +2 swords
  wormRiders: {
    id: 'wormRiders',
    name: "Worm Riders",
    cost: 6,
    count: 2,
    icons: ['city', 'spiceTrade'],
    agentGains: { spice: 2 },
    source: 'imperium',
  },
  ladyJessica: {
    id: 'ladyJessica',
    name: "Lady Jessica",
    cost: 7,
    count: 1,
    icons: ['landsraad', 'city', 'spiceTrade', 'beneGesserit'],
    agentGains: { drawCards: 2 },
    revealGains: { persuasion: 3, swords: 1 },
    acquireGains: { anyInfluence: 1 },
    source: 'imperium',
  },
  choamDirectorship: {
    id: 'choamDirectorship',
    name: "Choam Directorship",
    cost: 8,
    count: 1,
    icons: [],
    revealGains: { solari: 3 },
    acquireGains: { influence: { emperor: 1, spacingGuild: 1, beneGesserit: 1, fremen: 1 } },
    source: 'imperium',
  },
  // TODO(fidelity): agent: Send one of your agents from anywhere to any board space
  kwisatzHaderach: {
    id: 'kwisatzHaderach',
    name: "Kwisatz Haderach",
    cost: 8,
    count: 1,
    icons: ['landsraad', 'city', 'spiceTrade', 'emperor', 'spacingGuild', 'beneGesserit', 'fremen'],
    agentGains: { drawCards: 1 },
    source: 'imperium',
  },
};

/** Each player's starting deck: defId → copies. VERIFY. */
export const STARTING_DECK: Array<{ defId: CardDefId; copies: number }> = [
  { defId: 'convincingArgument', copies: 2 },
  { defId: 'dagger', copies: 2 },
  { defId: 'desertHomeworld', copies: 2 },
  { defId: 'diplomacy', copies: 1 },
  { defId: 'reconnaissance', copies: 1 },
  { defId: 'seekAllies', copies: 1 },
  { defId: 'signetRing', copies: 1 },
];

export const RESERVE_DEF_IDS: CardDefId[] = ['foldspace', 'arrakisLiaison', 'theSpiceMustFlow'];

/**
 * Copies of each Reserve card available at game start (a limited stack, not an
 * infinite supply). Confirmed from the rulebook components list: 8 Arrakis
 * Liaison, 10 The Spice Must Flow, 6 Foldspace. A depleted stack can no longer
 * be acquired; a trashed Reserve card returns to its stack.
 */
export const RESERVE_SUPPLY: Record<CardDefId, number> = {
  arrakisLiaison: 8,
  theSpiceMustFlow: 10,
  foldspace: 6,
};

export const IMPERIUM_DECK_DEFS = Object.values(IMP_CARD_DEFS).filter((d) => d.source === 'imperium');
