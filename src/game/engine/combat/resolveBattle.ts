import { LEADERS } from '../../data/leaders';
import { TREACHERY_CARD_DEFS } from '../../data/treacheryCards';
import type {
  BattlePlan,
  BattleResolution,
  GameState,
  PendingBattle,
  PlayerId,
  TreacheryCardId,
} from '../../types';

/**
 * Battle resolution (basic game core; faction hooks layered on top).
 *
 * Sequence implemented:
 *  1. Traitor check — if a revealed leader is a traitor for the opponent and
 *     the opponent calls it, the caller wins outright: they lose nothing, the
 *     betrayed side loses its whole battle force and the leader, and the
 *     caller collects the traitor's strength in spice from the bank.
 *     If both leaders are called traitor, both sides lose everything.
 *  2. Beam-weapon + shield — if either side plays the beam weapon and either
 *     side plays a projectile shield, everything in the battle is destroyed:
 *     both leaders, all forces both sides committed, no spice awards.
 *  3. Weapons vs defenses — a projectile weapon kills the opposing leader
 *     unless a projectile defense was played; likewise poison vs the poison
 *     defense. A dead leader adds nothing to its side's total.
 *  4. Totals — dialed forces plus surviving leader strength. Higher total
 *     wins; the aggressor wins ties (VERIFY).
 *  5. Aftermath — the loser's forces in the territory are all destroyed and
 *     the loser discards the cards they played. The winner loses only the
 *     forces they dialed, keeps or discards their played cards, and collects
 *     spice equal to the strength of every leader killed (VERIFY).
 */

export interface CombatantContext {
  playerId: PlayerId;
  plan: BattlePlan;
  /** Total forces this side has in the disputed territory. */
  forcesInTerritory: number;
  /** Opponent leader ids this side holds traitor cards for. */
  traitorLeaderIds: string[];
  /** Whether this side chose to call traitor (resolved pre-step). */
  callsTraitor: boolean;
}

export interface BattleOutcome {
  winner: PlayerId | null;
  loser: PlayerId | null;
  mutual: boolean;
  lasgunExplosion: boolean;
  traitorCalled?: { by: PlayerId; leaderId: string };
  leadersKilled: Array<{ leaderId: string; owner: PlayerId }>;
  /** Forces each side sends to the tanks. */
  forcesLost: Record<PlayerId, number>;
  /** Spice from the bank for slain leaders, to the winner. */
  spiceForLeaders: Record<PlayerId, number>;
  cardsDiscarded: TreacheryCardId[];
  detail: string;
}

function cardCategory(state: GameState, cardId: TreacheryCardId | null): string | null {
  if (!cardId) return null;
  const card = state.decks.treacheryById[cardId];
  return TREACHERY_CARD_DEFS[card.defId].category;
}

function leaderStrength(plan: BattlePlan): number {
  if (plan.leaderId) return LEADERS[plan.leaderId].strength;
  return 0; // stand-in card has zero strength
}

function weaponKills(state: GameState, attacker: BattlePlan, defender: BattlePlan): boolean {
  const weapon = cardCategory(state, attacker.weaponCardId);
  if (!weapon) return false;
  const defense = cardCategory(state, defender.defenseCardId);
  if (weapon === 'weapon-projectile') return defense !== 'defense-projectile';
  if (weapon === 'weapon-poison') return defense !== 'defense-poison';
  if (weapon === 'weapon-special') return defense !== 'defense-projectile'; // beam weapon: shield triggers the explosion path instead
  return false;
}

export function resolveBattle(
  state: GameState,
  battle: PendingBattle,
  a: CombatantContext, // aggressor
  b: CombatantContext, // defender
): BattleOutcome {
  const discards: TreacheryCardId[] = [];
  const planCards = (p: BattlePlan) =>
    [p.weaponCardId, p.defenseCardId, p.cheapHeroCardId].filter(Boolean) as TreacheryCardId[];

  // 1. traitor calls
  const aCalls = a.callsTraitor && b.plan.leaderId !== null && a.traitorLeaderIds.includes(b.plan.leaderId);
  const bCalls = b.callsTraitor && a.plan.leaderId !== null && b.traitorLeaderIds.includes(a.plan.leaderId);

  if (aCalls && bCalls) {
    discards.push(...planCards(a.plan), ...planCards(b.plan));
    return {
      winner: null,
      loser: null,
      mutual: true,
      lasgunExplosion: false,
      leadersKilled: [
        { leaderId: a.plan.leaderId!, owner: a.playerId },
        { leaderId: b.plan.leaderId!, owner: b.playerId },
      ],
      forcesLost: { [a.playerId]: a.forcesInTerritory, [b.playerId]: b.forcesInTerritory },
      spiceForLeaders: {},
      cardsDiscarded: discards,
      detail: 'Both leaders were traitors — both battle forces are destroyed.',
    };
  }
  if (aCalls || bCalls) {
    const caller = aCalls ? a : b;
    const betrayed = aCalls ? b : a;
    discards.push(...planCards(betrayed.plan));
    return {
      winner: caller.playerId,
      loser: betrayed.playerId,
      mutual: false,
      lasgunExplosion: false,
      traitorCalled: { by: caller.playerId, leaderId: betrayed.plan.leaderId! },
      leadersKilled: [{ leaderId: betrayed.plan.leaderId!, owner: betrayed.playerId }],
      forcesLost: { [caller.playerId]: 0, [betrayed.playerId]: betrayed.forcesInTerritory },
      spiceForLeaders: { [caller.playerId]: LEADERS[betrayed.plan.leaderId!].strength },
      cardsDiscarded: discards,
      detail: 'Treachery! The revealed leader was a traitor — the battle is forfeit.',
    };
  }

  // 2. beam weapon + shield: total destruction
  const anyLasgun =
    cardCategory(state, a.plan.weaponCardId) === 'weapon-special' ||
    cardCategory(state, b.plan.weaponCardId) === 'weapon-special';
  const anyShield =
    cardCategory(state, a.plan.defenseCardId) === 'defense-projectile' ||
    cardCategory(state, b.plan.defenseCardId) === 'defense-projectile';
  if (anyLasgun && anyShield) {
    discards.push(...planCards(a.plan), ...planCards(b.plan));
    const killed: BattleOutcome['leadersKilled'] = [];
    if (a.plan.leaderId) killed.push({ leaderId: a.plan.leaderId, owner: a.playerId });
    if (b.plan.leaderId) killed.push({ leaderId: b.plan.leaderId, owner: b.playerId });
    return {
      winner: null,
      loser: null,
      mutual: true,
      lasgunExplosion: true,
      leadersKilled: killed,
      forcesLost: { [a.playerId]: a.forcesInTerritory, [b.playerId]: b.forcesInTerritory },
      spiceForLeaders: {},
      cardsDiscarded: discards,
      detail: 'The beam weapon met a shield — everything in the battle is annihilated.',
    };
  }

  // 3. weapons vs defenses
  const aLeaderDies = weaponKills(state, b.plan, a.plan) && a.plan.leaderId !== null;
  const bLeaderDies = weaponKills(state, a.plan, b.plan) && b.plan.leaderId !== null;

  const leadersKilled: BattleOutcome['leadersKilled'] = [];
  if (aLeaderDies) leadersKilled.push({ leaderId: a.plan.leaderId!, owner: a.playerId });
  if (bLeaderDies) leadersKilled.push({ leaderId: b.plan.leaderId!, owner: b.playerId });

  // 4. totals — dial plus surviving leader strength; aggressor wins ties (VERIFY)
  const aTotal = a.plan.dial + (aLeaderDies ? 0 : leaderStrength(a.plan));
  const bTotal = b.plan.dial + (bLeaderDies ? 0 : leaderStrength(b.plan));
  const aWins = aTotal >= bTotal;
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;

  // 5. aftermath
  discards.push(...planCards(loser.plan));
  const spiceForLeaders =
    leadersKilled.length > 0
      ? {
          [winner.playerId]: leadersKilled.reduce((n, l) => n + LEADERS[l.leaderId].strength, 0),
        }
      : {};

  return {
    winner: winner.playerId,
    loser: loser.playerId,
    mutual: false,
    lasgunExplosion: false,
    leadersKilled,
    forcesLost: {
      [winner.playerId]: Math.min(winner.plan.dial, winner.forcesInTerritory),
      [loser.playerId]: loser.forcesInTerritory,
    },
    spiceForLeaders,
    cardsDiscarded: discards,
    detail: `Totals — ${winner.playerId}: ${aWins ? aTotal : bTotal} vs ${loser.playerId}: ${aWins ? bTotal : aTotal}.`,
  };
}
