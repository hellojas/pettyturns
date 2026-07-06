/**
 * Global constants for the Imperium game — EDITABLE CONFIG.
 *
 * VERIFY: check every number against the rulebook of the copy you own; the
 * engine reads only this file for these values.
 */
export const IMP_CONSTANTS = {
  minPlayers: 2,
  maxPlayers: 4,
  vpTarget: 10,
  /** One conflict per round; the game ends after the last. */
  maxRounds: 10,
  handSize: 5,
  startingAgents: 2,
  /** Starting resources. VERIFY. */
  startingWater: 1,
  startingSolari: 0,
  startingSpice: 0,
  /** Troops: garrison at start / total supply per player. VERIFY. */
  startingGarrison: 3,
  troopSupply: 12,
  /** Combat strength. Verified: 2 per troop in the conflict, 1 per sword. */
  strengthPerTroop: 2,
  strengthPerSword: 1,
  /** Deploy allowance on a combat-icon agent turn (plus troops gained that turn). VERIFY. */
  baseDeployLimit: 2,
  /** Influence track. */
  influenceMax: 6,
  /**
   * Crossing this level upward gains 1 VP (lost if crossed downward). Confirmed
   * from the rulebook: reaching 2 Influence grants a VP. Level 4 grants the
   * track's resource bonus and (for the first to reach it) an Alliance whose
   * token carries its own VP — but no separate level VP, so only 2 is listed
   * here (listing 4 would double-count the Alliance VP).
   */
  influenceVpLevels: [2],
  /** Alliance token: held at this level+ by the player with the most influence. Verified: 4. */
  allianceLevel: 4,
  /** Imperium row size. */
  imperiumRowSize: 5,
  /** Sell-melange exchange (spice → solari). VERIFY. */
  sellMelangeRates: { 2: 6, 3: 8, 4: 10, 5: 12 } as Record<number, number>,
  /** Conflict deck composition drawn per game: [tier1, tier2, tier3]. VERIFY. */
  conflictMix: { tier1: 1, tier2: 5, tier3: 4 },
  /**
   * End-of-game tiebreakers after VP, in order. Confirmed from the rulebook:
   * spice, then Solari, then water, then garrisoned troops.
   */
  tiebreakers: ['spice', 'solari', 'water', 'garrison'] as const,
} as const;
