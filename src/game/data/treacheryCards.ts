import type { TreacheryCardDef, TreacheryCardDefId } from '../types';

/**
 * Treachery deck composition — EDITABLE CONFIG.
 *
 * VERIFY: card names and copy counts should be checked against the deck in the
 * copy you own. `effect` fields are machine-readable switches consumed by the
 * combat engine; wording is original.
 */
export const TREACHERY_CARD_DEFS: Record<TreacheryCardDefId, TreacheryCardDef> = {
  // weapons — projectile
  crysknife: { id: 'crysknife', name: 'Crysknife', category: 'weapon-projectile', count: 1 },
  maula_pistol: { id: 'maula_pistol', name: 'Maula Pistol', category: 'weapon-projectile', count: 1 },
  slip_tip: { id: 'slip_tip', name: 'Slip Tip', category: 'weapon-projectile', count: 1 },
  stunner: { id: 'stunner', name: 'Stunner', category: 'weapon-projectile', count: 1 },

  // weapons — poison
  chaumas: { id: 'chaumas', name: 'Chaumas', category: 'weapon-poison', count: 1 },
  chaumurky: { id: 'chaumurky', name: 'Chaumurky', category: 'weapon-poison', count: 1 },
  ellaca_drug: { id: 'ellaca_drug', name: 'Ellaca Drug', category: 'weapon-poison', count: 1 },
  gom_jabbar: { id: 'gom_jabbar', name: 'Gom Jabbar', category: 'weapon-poison', count: 1 },

  // the unique beam weapon: destroys everything if it meets a shield
  lasgun: {
    id: 'lasgun',
    name: 'Lasgun',
    category: 'weapon-special',
    count: 1,
    effect: { explodesWithShield: true, killsLeaderUnlessShield: true },
  },

  // defenses
  shield: { id: 'shield', name: 'Shield', category: 'defense-projectile', count: 4 },
  snooper: { id: 'snooper', name: 'Snooper', category: 'defense-poison', count: 4 },

  // specials
  cheap_hero: {
    id: 'cheap_hero',
    name: 'Cheap Hero',
    category: 'special',
    count: 3,
    effect: { standsInForLeader: true, strength: 0 },
  },
  hajr: { id: 'hajr', name: 'Hajr', category: 'special', count: 1, effect: { extraMove: true } },
  karama: {
    id: 'karama',
    name: 'Karama',
    category: 'special',
    count: 2,
    effect: { nullifiesFactionPower: true },
  },
  truthtrance: { id: 'truthtrance', name: 'Truthtrance', category: 'special', count: 2, effect: { askYesNo: true } },
  tleilaxu_ghola: {
    id: 'tleilaxu_ghola',
    name: 'Tleilaxu Ghola',
    category: 'special',
    count: 1,
    effect: { freeRevive: true },
  },
  weather_control: {
    id: 'weather_control',
    name: 'Weather Control',
    category: 'special',
    count: 1,
    effect: { controlStorm: true },
  },
  family_atomics: {
    id: 'family_atomics',
    name: 'Family Atomics',
    category: 'special',
    count: 1,
    effect: { destroyShieldWall: true },
  },

  // worthless
  baliset: { id: 'baliset', name: 'Baliset', category: 'worthless', count: 1 },
  jubba_cloak: { id: 'jubba_cloak', name: 'Jubba Cloak', category: 'worthless', count: 1 },
  kulon: { id: 'kulon', name: 'Kulon', category: 'worthless', count: 1 },
  la_la_la: { id: 'la_la_la', name: 'La, La, La', category: 'worthless', count: 1 },
  trip_to_gamont: { id: 'trip_to_gamont', name: 'Trip to Gamont', category: 'worthless', count: 1 },
};

export const TREACHERY_DEF_LIST = Object.values(TREACHERY_CARD_DEFS);

/** Total instances the shuffled deck should contain. */
export const TREACHERY_DECK_SIZE = TREACHERY_DEF_LIST.reduce((n, d) => n + d.count, 0);
