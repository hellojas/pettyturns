/**
 * Faction influence-track step rewards — EDITABLE CONFIG.
 *
 * Reaching a level on a faction's influence track (upward crossing only) grants
 * that level's `Gains` once. These are IN ADDITION to the VP awarded at
 * `influenceVpLevels` and the alliance token at `allianceLevel` (constants.ts);
 * a level with no entry grants nothing. Rewards are never clawed back when
 * influence drops — a spent resource can't be un-spent — so, unlike the VP
 * levels, they fire on the way up only.
 *
 * VERIFY: check every faction's rewards and the levels they sit on against the
 * faction sheets of the copy you own. Values here are thematic placeholders.
 * Original wording only — no rulebook text.
 *
 * INVARIANT (enforced by the composition guard): a step reward must not grant
 * `influence` or `anyInfluence`. Awarding influence from inside an influence
 * crossing would recurse; the real faction rewards never do this.
 */
import type { Gains, ImpFactionId } from '../types';

export type FactionInfluenceRewards = Partial<Record<number, Gains>>;

export const IMP_FACTION_INFLUENCE_REWARDS: Record<ImpFactionId, FactionInfluenceRewards> = {
  // Imperial treasury early, Sardaukar muscle deeper in. VERIFY.
  emperor: {
    1: { solari: 2 },
    3: { troops: 2 },
  },
  // Spice logistics early, a fat payout deeper in. VERIFY.
  spacingGuild: {
    1: { spice: 1 },
    3: { solari: 3 },
  },
  // Secrets first (an intrigue card), then card advantage. VERIFY.
  beneGesserit: {
    1: { intrigueCards: 1 },
    3: { drawCards: 1 },
  },
  // Water first, warriors deeper in. VERIFY.
  fremen: {
    1: { water: 1 },
    3: { troops: 2 },
  },
};
