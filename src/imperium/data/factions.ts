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
 * VERIFIED against the 2020 rulebook: the base game grants a single track bonus,
 * on the level-4 (Alliance) space — reaching 4 Influence earns "the bonus shown
 * on that space," and it is never given back on a drop (it can even be earned
 * again by dropping and re-crossing). Levels 1-3 grant no resource bonus (level 2
 * grants a VP, handled in constants.ts). The exact level-4 payloads below are
 * still placeholders except Fremen (water) — VERIFY each amount against the
 * board. Original wording only — no rulebook text.
 *
 * INVARIANT (enforced by the composition guard): a step reward must not grant
 * `influence` or `anyInfluence`. Awarding influence from inside an influence
 * crossing would recurse; the real faction rewards never do this.
 */
import type { Gains, ImpFactionId } from '../types';

export type FactionInfluenceRewards = Partial<Record<number, Gains>>;

export const IMP_FACTION_INFLUENCE_REWARDS: Record<ImpFactionId, FactionInfluenceRewards> = {
  // Emperor ~ Solari/Sardaukar. Payload placeholder — VERIFY the icon on the board.
  emperor: {
    4: { solari: 2 },
  },
  // Spacing Guild ~ spice/board access. Payload placeholder — VERIFY on the board.
  spacingGuild: {
    4: { spice: 1 },
  },
  // Bene Gesserit ~ secrets/cards. Payload placeholder — VERIFY on the board.
  beneGesserit: {
    4: { intrigueCards: 1 },
  },
  // Fremen level-4 bonus is water (attested). VERIFY the amount against the board.
  fremen: {
    4: { water: 1 },
  },
};
