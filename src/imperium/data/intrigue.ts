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
  strategicPush: { id: 'strategicPush', name: 'Strategic Push', kind: 'combat', count: 2, gains: { troops: 1 } },

  councilBriefing: { id: 'councilBriefing', name: 'Council Briefing', kind: 'plot', count: 2, gains: { intrigueCards: 1 } },
  reallocateFunds: { id: 'reallocateFunds', name: 'Reallocate Funds', kind: 'plot', count: 2, gains: { solari: 2, water: 1 } },
  studyTheWeirwood: { id: 'studyTheWeirwood', name: 'Deep Study', kind: 'plot', count: 2, gains: { drawCards: 1 } },
  hiddenReserves: { id: 'hiddenReserves', name: 'Hidden Reserves', kind: 'plot', count: 1, gains: { troops: 2 } },
  smugglersPayoff: { id: 'smugglersPayoff', name: "Smuggler's Payoff", kind: 'plot', count: 2, cost: { spice: 1 }, gains: { solari: 4 } },

  quietTriumph: { id: 'quietTriumph', name: 'Quiet Triumph', kind: 'endgame', count: 1, gains: { vp: 1 } },
};

export const IMP_INTRIGUE_LIST = Object.values(IMP_INTRIGUE_DEFS);
