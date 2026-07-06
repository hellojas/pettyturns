import type { ConflictDef, ConflictId } from '../types';

/**
 * Conflict cards — EDITABLE CONFIG.
 *
 * VERIFY: tiers and rewards are best-recall placeholders shaped like the real
 * deck (tier I mild, tier III rich, control rewards on the named battles);
 * replace with the exact cards from your copy.
 */
export const IMP_CONFLICT_DEFS: Record<ConflictId, ConflictDef> = {
  skirmishA: {
    id: 'skirmishA',
    name: 'Skirmish (I)',
    tier: 1,
    rewards: [
      { place: 1, gains: { vp: 1 } },
      { place: 2, gains: { water: 1 } },
      { place: 3, gains: { solari: 2 } },
    ],
  },
  skirmishB: {
    id: 'skirmishB',
    name: 'Desert Raid (I)',
    tier: 1,
    rewards: [
      { place: 1, gains: { spice: 2, water: 1 } },
      { place: 2, gains: { spice: 1 } },
      { place: 3, gains: { water: 1 } },
    ],
  },
  siegeOfArrakeen: {
    id: 'siegeOfArrakeen',
    name: 'Siege of Arrakeen (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { vp: 1, control: 'arrakeen' } },
      { place: 2, gains: { solari: 3 } },
      { place: 3, gains: { solari: 1 } },
    ],
  },
  siegeOfCarthag: {
    id: 'siegeOfCarthag',
    name: 'Siege of Carthag (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { vp: 1, control: 'carthag' } },
      { place: 2, gains: { intrigueCards: 1, spice: 1 } },
      { place: 3, gains: { spice: 1 } },
    ],
  },
  secureImperialBasin: {
    id: 'secureImperialBasin',
    name: 'Secure Imperial Basin (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { vp: 1, control: 'imperialBasin' } },
      { place: 2, gains: { water: 1, spice: 1 } },
      { place: 3, gains: { water: 1 } },
    ],
  },
  tradeMonopoly: {
    id: 'tradeMonopoly',
    name: 'Trade Monopoly (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { spice: 3, anyInfluence: 1 } },
      { place: 2, gains: { spice: 2 } },
      { place: 3, gains: { solari: 2 } },
    ],
  },
  cloakAndDagger: {
    id: 'cloakAndDagger',
    name: 'Cloak and Dagger (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { intrigueCards: 2, anyInfluence: 1 } },
      { place: 2, gains: { intrigueCards: 1 } },
      { place: 3, gains: { solari: 1 } },
    ],
  },
  grandVision: {
    id: 'grandVision',
    name: 'Grand Vision (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2 } },
      { place: 2, gains: { vp: 1 } },
      { place: 3, gains: { spice: 2 } },
    ],
  },
  battleForImperialBasin: {
    id: 'battleForImperialBasin',
    name: 'Battle for Imperial Basin (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2, control: 'imperialBasin' } },
      { place: 2, gains: { spice: 2 } },
      { place: 3, gains: { spice: 1 } },
    ],
  },
  economicSupremacy: {
    id: 'economicSupremacy',
    name: 'Economic Supremacy (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2 } },
      { place: 2, gains: { spice: 3 } },
      { place: 3, gains: { solari: 2 } },
    ],
  },
  battleForArrakeen: {
    id: 'battleForArrakeen',
    name: 'Battle for Arrakeen (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2, control: 'arrakeen' } },
      { place: 2, gains: { vp: 1 } },
      { place: 3, gains: { solari: 2 } },
    ],
  },
  battleForCarthag: {
    id: 'battleForCarthag',
    name: 'Battle for Carthag (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2, control: 'carthag' } },
      { place: 2, gains: { intrigueCards: 1 } },
      { place: 3, gains: { spice: 1 } },
    ],
  },

  // --- Second batch: more sampler variety per tier (all VERIFY) ---
  skirmishC: {
    id: 'skirmishC',
    name: 'Border Clash (I)',
    tier: 1,
    rewards: [
      { place: 1, gains: { solari: 2, water: 1 } },
      { place: 2, gains: { solari: 2 } },
      { place: 3, gains: { water: 1 } },
    ],
  },
  spiceHarvest: {
    id: 'spiceHarvest',
    name: 'Spice Harvest (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { spice: 2, vp: 1 } },
      { place: 2, gains: { spice: 2 } },
      { place: 3, gains: { spice: 1 } },
    ],
  },
  contestOfInfluence: {
    id: 'contestOfInfluence',
    name: 'Contest of Influence (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { anyInfluence: 1, vp: 1 } },
      { place: 2, gains: { anyInfluence: 1 } },
      { place: 3, gains: { solari: 1 } },
    ],
  },
  imperialFavor: {
    id: 'imperialFavor',
    name: 'Imperial Favor (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2, intrigueCards: 1 } },
      { place: 2, gains: { vp: 1 } },
      { place: 3, gains: { intrigueCards: 1 } },
    ],
  },

  // --- Third batch: deeper pool so each game draws a more varied conflict
  // deck (all VERIFY: names/tiers/rewards are placeholders). ---
  // Tier I
  routinePatrol: {
    id: 'routinePatrol',
    name: 'Routine Patrol (I)',
    tier: 1,
    rewards: [
      { place: 1, gains: { solari: 3 } },
      { place: 2, gains: { solari: 1 } },
      { place: 3, gains: { water: 1 } },
    ],
  },
  desertScouting: {
    id: 'desertScouting',
    name: 'Desert Scouting (I)',
    tier: 1,
    rewards: [
      { place: 1, gains: { vp: 1 } },
      { place: 2, gains: { water: 1 } },
      { place: 3, gains: { spice: 1 } },
    ],
  },
  // Tier II
  raidTheSietch: {
    id: 'raidTheSietch',
    name: 'Raid the Sietch (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { vp: 1, water: 1 } },
      { place: 2, gains: { water: 1, spice: 1 } },
      { place: 3, gains: { water: 1 } },
    ],
  },
  guildBlockade: {
    id: 'guildBlockade',
    name: 'Guild Blockade (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { vp: 1, solari: 2 } },
      { place: 2, gains: { solari: 2 } },
      { place: 3, gains: { solari: 1 } },
    ],
  },
  courtlyIntrigue: {
    id: 'courtlyIntrigue',
    name: 'Courtly Intrigue (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { intrigueCards: 2, vp: 1 } },
      { place: 2, gains: { intrigueCards: 1 } },
      { place: 3, gains: { solari: 1 } },
    ],
  },
  meleeInTheDeep: {
    id: 'meleeInTheDeep',
    name: 'Melee in the Deep Desert (II)',
    tier: 2,
    rewards: [
      { place: 1, gains: { spice: 3 } },
      { place: 2, gains: { spice: 2 } },
      { place: 3, gains: { water: 1 } },
    ],
  },
  // Tier III
  battleForSpice: {
    id: 'battleForSpice',
    name: 'Battle for the Spice (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2, spice: 2 } },
      { place: 2, gains: { vp: 1 } },
      { place: 3, gains: { spice: 2 } },
    ],
  },
  imperialAmbitions: {
    id: 'imperialAmbitions',
    name: 'Imperial Ambitions (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2, anyInfluence: 1 } },
      { place: 2, gains: { vp: 1 } },
      { place: 3, gains: { solari: 2 } },
    ],
  },
  theGreatConflict: {
    id: 'theGreatConflict',
    name: 'The Great Conflict (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 3 } },
      { place: 2, gains: { vp: 1 } },
      { place: 3, gains: { spice: 1 } },
    ],
  },
  desertSupremacy: {
    id: 'desertSupremacy',
    name: 'Desert Supremacy (III)',
    tier: 3,
    rewards: [
      { place: 1, gains: { vp: 2, water: 2 } },
      { place: 2, gains: { spice: 2 } },
      { place: 3, gains: { water: 1 } },
    ],
  },
};

export const IMP_CONFLICT_LIST = Object.values(IMP_CONFLICT_DEFS);
