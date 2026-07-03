import { TREACHERY_CARD_DEFS } from '../../data/treacheryCards';
import type { BattlePlan, GameState, PendingBattle, PlayerId, ValidationResult } from '../../types';
import { fail, ok } from '../../types';
import { getPlayer } from '../state';

/** Total fighting forces a player has in the disputed territory. */
export function forcesInBattle(state: GameState, playerId: PlayerId, territoryId: string): number {
  const faction = getPlayer(state, playerId).factionId;
  return state.stacks
    .filter((s) => s.factionId === faction && s.territoryId === territoryId && !s.isAdvisor)
    .reduce((n, s) => n + s.forces + s.specialForces, 0);
}

/**
 * Battle plan legality:
 *  - dial between 0 and forces present in the territory
 *  - a leader must be committed if any are alive; a stand-in card may replace
 *    one; with no leaders and no stand-in, the plan goes leaderless
 *  - weapon/defense cards must be in hand, of the correct category, and distinct
 */
export function validateBattlePlan(
  state: GameState,
  battle: PendingBattle,
  playerId: PlayerId,
  plan: Omit<BattlePlan, 'playerId'>,
): ValidationResult {
  const player = getPlayer(state, playerId);
  const hand = state.hidden[playerId].hand;
  const inHand = (cardId: string | null) => cardId === null || hand.some((c) => c.id === cardId);
  const category = (cardId: string | null) =>
    cardId ? TREACHERY_CARD_DEFS[state.decks.treacheryById[cardId].defId].category : null;

  const maxDial = forcesInBattle(state, playerId, battle.territoryId);
  if (!Number.isInteger(plan.dial) || plan.dial < 0 || plan.dial > maxDial)
    return fail('bad-dial', `Dial must be between 0 and ${maxDial}.`);

  if (plan.leaderId && plan.cheapHeroCardId)
    return fail('leader-conflict', 'Commit a leader or a stand-in card, not both.');
  if (plan.leaderId && !player.leadersAlive.includes(plan.leaderId))
    return fail('bad-leader', 'That leader is not available.');
  if (plan.cheapHeroCardId) {
    if (!inHand(plan.cheapHeroCardId)) return fail('not-in-hand', 'That stand-in card is not in your hand.');
    if (!TREACHERY_CARD_DEFS[state.decks.treacheryById[plan.cheapHeroCardId].defId].effect?.standsInForLeader)
      return fail('not-a-hero', 'That card cannot stand in for a leader.');
  }
  if (!plan.leaderId && !plan.cheapHeroCardId && player.leadersAlive.length > 0)
    return fail('leader-required', 'You must commit a leader (or a stand-in card) if you have one.');

  // without a leader or stand-in, no treachery cards may be played
  if (!plan.leaderId && !plan.cheapHeroCardId && (plan.weaponCardId || plan.defenseCardId))
    return fail('no-leader-no-cards', 'Without a leader you may not play weapon or defense cards.');

  if (plan.weaponCardId) {
    if (!inHand(plan.weaponCardId)) return fail('not-in-hand', 'That weapon is not in your hand.');
    const cat = category(plan.weaponCardId);
    if (cat !== 'weapon-projectile' && cat !== 'weapon-poison' && cat !== 'weapon-special' && cat !== 'worthless')
      return fail('not-a-weapon', 'That card cannot be played as a weapon.');
  }
  if (plan.defenseCardId) {
    if (!inHand(plan.defenseCardId)) return fail('not-in-hand', 'That defense is not in your hand.');
    const cat = category(plan.defenseCardId);
    if (cat !== 'defense-projectile' && cat !== 'defense-poison' && cat !== 'worthless')
      return fail('not-a-defense', 'That card cannot be played as a defense.');
  }
  if (plan.weaponCardId && plan.weaponCardId === plan.defenseCardId)
    return fail('same-card', 'You cannot play the same card as weapon and defense.');

  return ok();
}
