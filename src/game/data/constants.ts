/**
 * Global rules constants, editable in one place.
 *
 * VERIFY: numbers marked VERIFY vary between printings/editions. Check each one
 * against the rulebook of the copy you own and adjust here — the engine reads
 * everything from this file.
 */
export const GAME_CONSTANTS = {
  sectorCount: 18,
  /** Sector the storm marker starts from before its first move. VERIFY. */
  stormStartSector: 0,
  /**
   * First storm: the two players nearest the storm-start sector each secretly
   * dial a number in this range; the total is the movement. VERIFY.
   */
  firstStormDial: { min: 0, max: 20 },
  /** Later storms: same two-dialer mechanism with this range. VERIFY. */
  laterStormDial: { min: 1, max: 3 },
  /** Rounds in a full game; the transporter faction's default win triggers at the end. VERIFY. */
  maxRounds: 10,
  /** Strongholds needed to win solo. VERIFY. */
  strongholdsToWinSolo: 3,
  /** Strongholds needed jointly by an alliance. VERIFY. */
  strongholdsToWinAlliance: 4,
  /** Cost per force shipped into a stronghold. VERIFY. */
  shipCostStronghold: 1,
  /** Cost per force shipped anywhere else. VERIFY. */
  shipCostOther: 2,
  /** Base movement range in territories (without ornithopter access). VERIFY. */
  baseMoveRange: 1,
  /** Movement range when the mover controls a city with ornithopters. VERIFY. */
  ornithopterMoveRange: 3,
  /** Cities that grant ornithopter movement. VERIFY. */
  ornithopterTerritoryIds: ['arrakeen', 'carthag'],
  /** Cost in spice to revive one force beyond free revivals. VERIFY. */
  revivalCostPerForce: 2,
  /** Max forces revivable per faction per revival phase. VERIFY. */
  maxForceRevivalPerTurn: 3,
  /** Reviving a leader costs its strength in spice. VERIFY. */
  leaderRevivalCostIsStrength: true,
  /** Max co-existing factions in a territory (stronghold occupancy limit). VERIFY. */
  strongholdOccupancyLimit: 2,
  /** Traitor cards dealt to each player at setup. VERIFY. */
  traitorsDealtPerPlayer: 4,
  /** Treachery cards dealt to each player at setup (before faction bonuses). VERIFY. */
  startingTreacheryCards: 1,
} as const;

export type GameConstants = typeof GAME_CONSTANTS;
