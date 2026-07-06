import type { IntrigueDef, IntrigueDefId } from '../types';

/**
 * Intrigue deck — EDITABLE CONFIG (representative subset; extend freely).
 *
 * VERIFY: names and effects are placeholders in the spirit of the real deck;
 * replace with the actual cards from your copy. Kinds:
 *  - plot: play on your own turn for the listed gains
 *  - combat: play during the combat phase (swords / troops)
 *  - endgame: scored automatically at final scoring
 */
export const IMP_INTRIGUE_DEFS: Record<IntrigueDefId, IntrigueDef> = {
  ambush: { id: 'ambush', name: 'Ambush', kind: 'combat', count: 3, gains: { swords: 4 } },
  rapidMobilization: { id: 'rapidMobilization', name: 'Rapid Mobilization', kind: 'combat', count: 2, gains: { swords: 2 } },
  reinforcements: { id: 'reinforcements', name: 'Reinforcements', kind: 'combat', count: 2, cost: { solari: 3 }, gains: { swords: 3 } },
  poisonedWell: { id: 'poisonedWell', name: 'Poisoned Well', kind: 'combat', count: 2, gains: { swords: 1 } },

  favoredSubject: { id: 'favoredSubject', name: 'Favored Subject', kind: 'plot', count: 2, gains: { influence: { emperor: 1 } } },
  guildAuthorization: { id: 'guildAuthorization', name: 'Guild Authorization', kind: 'plot', count: 2, gains: { influence: { spacingGuild: 1 } } },
  hiddenMissionary: { id: 'hiddenMissionary', name: 'Hidden Missionary', kind: 'plot', count: 2, gains: { influence: { beneGesserit: 1 } } },
  desertGuides: { id: 'desertGuides', name: 'Desert Guides', kind: 'plot', count: 2, gains: { influence: { fremen: 1 } } },
  bribery: { id: 'bribery', name: 'Bribery', kind: 'plot', count: 2, cost: { solari: 2 }, gains: { anyInfluence: 1 } },
  windfall: { id: 'windfall', name: 'Windfall', kind: 'plot', count: 2, gains: { solari: 3 } },
  waterPeddler: { id: 'waterPeddler', name: 'Water Peddler', kind: 'plot', count: 2, gains: { water: 1 } },
  spiceCache: { id: 'spiceCache', name: 'Spice Cache', kind: 'plot', count: 2, gains: { spice: 2 } },

  dispatchAnEnvoy: { id: 'dispatchAnEnvoy', name: 'Diplomatic Coup', kind: 'endgame', count: 2, gains: { vp: 1 } },
  masterStroke: { id: 'masterStroke', name: 'Master Stroke', kind: 'endgame', count: 1, gains: { vp: 1 } },

  // --- Second batch (all VERIFY: names/effects/counts are placeholders) ---
  feint: { id: 'feint', name: 'Feint', kind: 'combat', count: 2, gains: { swords: 2 } },
  tacticalFlanking: { id: 'tacticalFlanking', name: 'Tactical Flanking', kind: 'combat', count: 1, cost: { spice: 2 }, gains: { swords: 4 } },
  // Reinforcement: deploys a troop straight into the conflict you are fighting
  // (garrison first, then supply). VERIFY count/source against your copy.
  strategicPush: { id: 'strategicPush', name: 'Strategic Push', kind: 'combat', count: 2, gains: { deployTroops: 1 } },
  // Removes an enemy troop from the conflict (returns it to their supply); the
  // play must name a target. VERIFY name/count against your copy.
  guerrillaRaid: { id: 'guerrillaRaid', name: 'Guerrilla Raid', kind: 'combat', count: 1, gains: { destroyTroops: 1 } },

  councilBriefing: { id: 'councilBriefing', name: 'Council Briefing', kind: 'plot', count: 2, gains: { intrigueCards: 1 } },
  reallocateFunds: { id: 'reallocateFunds', name: 'Reallocate Funds', kind: 'plot', count: 2, gains: { solari: 2, water: 1 } },
  studyTheWeirwood: { id: 'studyTheWeirwood', name: 'Deep Study', kind: 'plot', count: 2, gains: { drawCards: 1 } },
  hiddenReserves: { id: 'hiddenReserves', name: 'Hidden Reserves', kind: 'plot', count: 1, gains: { troops: 2 } },
  smugglersPayoff: { id: 'smugglersPayoff', name: "Smuggler's Payoff", kind: 'plot', count: 2, cost: { spice: 1 }, gains: { solari: 4 } },

  quietTriumph: { id: 'quietTriumph', name: 'Quiet Triumph', kind: 'endgame', count: 1, gains: { vp: 1 } },

  // --- Conditional endgame cards (all VERIFY: names/metrics/thresholds are
  // placeholders modeled after the real deck's conditional scorers). Each scores
  // its `gains.vp` only when its `endgameCondition` is met. ---
  dynasticReach: {
    id: 'dynasticReach', name: 'Dynastic Reach', kind: 'endgame', count: 1, gains: { vp: 2 },
    // Scores only for the player holding the most control markers (ties shared).
    endgameCondition: { metric: 'controlSpaces', mostAmong: true },
  },
  warChest: {
    id: 'warChest', name: 'War Chest', kind: 'endgame', count: 1, gains: { vp: 1 },
    // Scores if you have amassed at least this much solari.
    endgameCondition: { metric: 'solari', atLeast: 7 },
  },
  spyNetwork: {
    id: 'spyNetwork', name: 'Spy Network', kind: 'endgame', count: 1, gains: { vp: 1 },
    // One VP per pair of intrigue cards still in hand.
    endgameCondition: { metric: 'intrigueCards', per: 2 },
  },
  imperialFavor: {
    id: 'imperialFavor', name: 'Imperial Favor', kind: 'endgame', count: 1, gains: { vp: 1 },
    // Scores with strong standing on the Emperor track.
    endgameCondition: { metric: 'influence', faction: 'emperor', atLeast: 4 },
  },
  standingArmy: {
    id: 'standingArmy', name: 'Standing Army', kind: 'endgame', count: 1, gains: { vp: 1 },
    // One VP per three troops still on the board at game end.
    endgameCondition: { metric: 'troops', per: 3 },
  },

  // --- Third batch (all VERIFY: names/effects/counts are placeholders). ---
  // combat
  feignRetreat: { id: 'feignRetreat', name: 'Feign Retreat', kind: 'combat', count: 2, gains: { swords: 2 } },
  overwhelmingForce: { id: 'overwhelmingForce', name: 'Overwhelming Force', kind: 'combat', count: 1, cost: { solari: 4 }, gains: { swords: 5 } },
  desertTactics: { id: 'desertTactics', name: 'Desert Tactics', kind: 'combat', count: 2, gains: { swords: 3 } },
  // plot
  courtIntrigue: { id: 'courtIntrigue', name: 'Court Intrigue', kind: 'plot', count: 2, gains: { intrigueCards: 1, solari: 1 } },
  spiceSpeculation: { id: 'spiceSpeculation', name: 'Spice Speculation', kind: 'plot', count: 2, gains: { spice: 1, solari: 1 } },
  emergencyRecruitment: { id: 'emergencyRecruitment', name: 'Emergency Recruitment', kind: 'plot', count: 1, cost: { solari: 2 }, gains: { troops: 2 } },
  // conditional endgame — broadens the scored metrics (spice / water / fremen)
  spiceHoard: {
    id: 'spiceHoard', name: 'Spice Hoard', kind: 'endgame', count: 1, gains: { vp: 1 },
    // Scores if you have amassed at least this much spice.
    endgameCondition: { metric: 'spice', atLeast: 6 },
  },
  desertStronghold: {
    id: 'desertStronghold', name: 'Desert Stronghold', kind: 'endgame', count: 1, gains: { vp: 1 },
    // Scores with strong standing on the Fremen track.
    endgameCondition: { metric: 'influence', faction: 'fremen', atLeast: 4 },
  },
  waterReserves: {
    id: 'waterReserves', name: 'Water Reserves', kind: 'endgame', count: 1, gains: { vp: 1 },
    // One VP per four water still on hand at game end.
    endgameCondition: { metric: 'water', per: 4 },
  },
};

export const IMP_INTRIGUE_LIST = Object.values(IMP_INTRIGUE_DEFS);
