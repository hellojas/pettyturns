import type { FactionDef, FactionId } from '../types';
import { GAME_CONSTANTS } from './constants';

/**
 * Faction definitions — EDITABLE CONFIG.
 *
 * VERIFY: starting spice, starting forces, revival numbers, and hand limits
 * should be checked against the faction sheets in your copy. Every power is a
 * machine-readable switch consumed by a specific engine hook; `summary` text is
 * original wording, never rulebook prose.
 */
export const FACTIONS: Record<FactionId, FactionDef> = {
  atreides: {
    id: 'atreides',
    name: 'Atreides',
    color: '#2e7d32',
    startingSpice: 10,
    startingReserves: { forces: 10, specialForces: 0 },
    startingForces: [{ territoryId: 'arrakeen', sector: 9, forces: 10, specialForces: 0 }],
    leaders: ['at_thufir', 'at_gurney', 'at_duncan', 'at_wellington', 'at_jessica'],
    freeRevival: 2,
    maxRevivalPerTurn: GAME_CONSTANTS.maxForceRevivalPerTurn,
    handLimit: 4,
    traitorsKept: 1,
    powers: [
      { id: 'bidding-prescience', hook: 'bidding', summary: 'May privately see each treachery card before anyone bids on it.' },
      { id: 'spice-prescience', hook: 'spiceBlow', summary: 'May privately look at the next spice deck card during their turn.' },
      { id: 'battle-prescience', hook: 'battle', summary: 'Before plans are revealed, may force the opponent to disclose one chosen element of their battle plan.' },
    ],
  },

  harkonnen: {
    id: 'harkonnen',
    name: 'Harkonnen',
    color: '#37474f',
    startingSpice: 10,
    startingReserves: { forces: 10, specialForces: 0 },
    startingForces: [{ territoryId: 'carthag', sector: 10, forces: 10, specialForces: 0 }],
    leaders: ['hk_feyd', 'hk_beast', 'hk_piter', 'hk_iakin', 'hk_umman'],
    freeRevival: 2,
    maxRevivalPerTurn: GAME_CONSTANTS.maxForceRevivalPerTurn,
    handLimit: 8,
    traitorsKept: 4, // keeps every traitor card dealt at setup
    powers: [
      { id: 'bonus-card', hook: 'bidding', summary: 'Whenever they buy a treachery card at auction, they draw one extra card free (hand limit permitting).', params: { extraCardsPerPurchase: 1 } },
      { id: 'all-traitors', hook: 'setup', summary: 'Keeps all traitor cards dealt at setup instead of choosing one.' },
      { id: 'leader-capture', hook: 'battle', summary: 'After winning a battle, may take or eliminate one random leader of the defeated faction (advanced rule hook).', params: { advancedOnly: true } },
    ],
  },

  emperor: {
    id: 'emperor',
    name: 'Emperor',
    color: '#b71c1c',
    startingSpice: 10,
    startingReserves: { forces: 15, specialForces: 5 }, // 5 elite starred forces
    startingForces: [],
    leaders: ['em_bashar', 'em_burseg', 'em_caid', 'em_aramsham', 'em_irulan'],
    freeRevival: 1,
    maxRevivalPerTurn: GAME_CONSTANTS.maxForceRevivalPerTurn,
    handLimit: 4,
    traitorsKept: 1,
    powers: [
      { id: 'auction-income', hook: 'bidding', summary: 'Receives the spice other factions pay for treachery cards at auction.' },
      { id: 'elite-forces', hook: 'battle', summary: 'Starred elite forces count double when dialed in battle (advanced rule hook).', params: { multiplier: 2, advancedOnly: true } },
    ],
  },

  guild: {
    id: 'guild',
    name: 'Spacing Guild',
    color: '#e65100',
    startingSpice: 5,
    startingReserves: { forces: 15, specialForces: 0 },
    startingForces: [{ territoryId: 'tueks_sietch', sector: 4, forces: 5, specialForces: 0 }],
    leaders: ['gu_repr', 'gu_sook', 'gu_esmar', 'gu_bewt', 'gu_staban'],
    freeRevival: 1,
    maxRevivalPerTurn: GAME_CONSTANTS.maxForceRevivalPerTurn,
    handLimit: 4,
    traitorsKept: 1,
    powers: [
      { id: 'shipping-income', hook: 'shipment', summary: 'Receives the spice other factions pay for shipments.' },
      { id: 'half-price-shipping', hook: 'shipment', summary: 'Pays half (rounded up) for their own shipments.', params: { divisor: 2, roundUp: true } },
      { id: 'flexible-shipping', hook: 'shipment', summary: 'May ship site-to-site on the board, or from the board back to reserves, instead of a normal shipment.' },
      { id: 'off-schedule', hook: 'shipment', summary: 'May delay their ship-and-move turn and take it later in the storm order.' },
      { id: 'default-win', hook: 'winCheck', summary: 'If no faction has met a victory condition when the last round ends, this faction wins.' },
    ],
  },

  fremen: {
    id: 'fremen',
    name: 'Fremen',
    color: '#f9a825',
    startingSpice: 3,
    // 20 total: 10 placed at setup (drawn from these reserves), 10 stay off-planet.
    startingReserves: { forces: 20, specialForces: 0 }, // VERIFY: advanced game uses elite Fedaykin
    startingForces: [
      // 10 forces split freely among these three areas at setup ('ANY' handled in setup UI)
      { territoryId: 'sietch_tabr', sector: 13, forces: 0, specialForces: 0 },
      { territoryId: 'false_wall_south', sector: 3, forces: 0, specialForces: 0 },
      { territoryId: 'false_wall_west', sector: 16, forces: 0, specialForces: 0 },
    ],
    leaders: ['fr_jamis', 'fr_shadout', 'fr_otheym', 'fr_chani', 'fr_stilgar'],
    freeRevival: 3,
    maxRevivalPerTurn: GAME_CONSTANTS.maxForceRevivalPerTurn,
    handLimit: 4,
    traitorsKept: 1,
    powers: [
      { id: 'native-deployment', hook: 'shipment', summary: 'Instead of paid shipment, may place reserves for free in the deep-desert home region or within the configured range of it.', params: { anchorTerritoryId: 'the_great_flat', maxDistance: 2 } },
      { id: 'desert-mobility', hook: 'movement', summary: 'Force groups may move the configured extended range instead of one territory.', params: { maxDistance: 2 } },
      { id: 'storm-hardy', hook: 'storm', summary: 'Loses only half (rounded up) of forces caught by the storm, and may move under storm restrictions others cannot (per config).', params: { lossFraction: 0.5, roundUp: true } },
      { id: 'worm-riders', hook: 'spiceBlow', summary: 'Their forces are not devoured by a worm appearing where they are; may ride the worm to relocate (advanced hook).' },
      { id: 'special-victory', hook: 'winCheck', summary: 'Wins at end of last round if the specified stronghold occupancy conditions favoring the desert power are met.', params: { advancedOnly: false } },
    ],
  },

  beneGesserit: {
    id: 'beneGesserit',
    name: 'Bene Gesserit',
    color: '#4a148c',
    startingSpice: 5,
    startingReserves: { forces: 19, specialForces: 0 },
    startingForces: [{ territoryId: 'polar_sink', sector: -1, forces: 1, specialForces: 0 }],
    leaders: ['bg_alia', 'bg_margot', 'bg_mohiam', 'bg_irulan', 'bg_wanna'],
    freeRevival: 1,
    maxRevivalPerTurn: GAME_CONSTANTS.maxForceRevivalPerTurn,
    handLimit: 4,
    traitorsKept: 1,
    powers: [
      { id: 'prediction', hook: 'winCheck', summary: 'Secretly predicts at setup which faction will win and on which round; if exactly right, this faction wins instead.' },
      { id: 'voice', hook: 'battle', summary: 'Before battle plans are made, may command the opponent to use or not use one kind of card in their plan.' },
      { id: 'coexistence', hook: 'shipment', summary: 'May send a free spiritual advisor to any territory another faction ships into; advisors coexist and do not battle (advanced hook).' },
      { id: 'worthless-karama', hook: 'karama', summary: 'May play any worthless card as if it were the power-nullifier card.' },
    ],
  },
};

export const FACTION_LIST = Object.values(FACTIONS);
