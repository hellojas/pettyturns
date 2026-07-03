import { SPICE_BLOW_TERRITORY_IDS } from './territories';

/**
 * Spice deck composition — EDITABLE CONFIG.
 *
 * The deck contains one card per spice-blow territory plus the configured
 * number of worm cards. VERIFY the worm count against your copy.
 */
export const SPICE_DECK_CONFIG = {
  territoryCards: SPICE_BLOW_TERRITORY_IDS,
  wormCount: 6, // VERIFY
} as const;
