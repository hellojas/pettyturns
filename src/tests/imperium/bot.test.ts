import { describe, expect, it } from 'vitest';
import { chooseBotAction } from '../../imperium/engine/bot';
import { impApply, impValidate } from '../../imperium/engine/engine';
import type { ImpGameState, PlayerId } from '../../imperium/types';
import { makeImp } from './helpers';

/** Drive a game where every seat is a bot until it finishes (or a safety cap). */
function playAllBots(seed: number, names = ['A', 'B']): { state: ImpGameState; actions: number } {
  let s = makeImp(names, seed);
  let actions = 0;
  let guard = 0;
  while (s.phase !== 'finished' && guard++ < 5000) {
    const actor = currentActor(s);
    if (!actor) break;
    const action = chooseBotAction(s, actor);
    if (!action) break;
    // the bot must never propose an illegal action
    expect(impValidate(s, action).ok, `illegal bot action ${JSON.stringify(action)}`).toBe(true);
    s = impApply(s, action);
    actions++;
  }
  return { state: s, actions };
}

/** Whoever the engine is currently waiting on. */
function currentActor(s: ImpGameState): PlayerId | null {
  if (s.pendingDecisions[0]) return s.pendingDecisions[0].playerId;
  return s.turn;
}

describe('heuristic bot', () => {
  it('is pure — same state yields the same choice', () => {
    const s = makeImp(['A', 'B'], 3);
    const a1 = chooseBotAction(s, s.turn!);
    const a2 = chooseBotAction(JSON.parse(JSON.stringify(s)), s.turn!);
    expect(a1).toEqual(a2);
  });

  it('returns null when it is not the bot\'s move', () => {
    const s = makeImp(['A', 'B'], 3);
    const other = s.playerOrder.find((p) => p !== s.turn)!;
    expect(chooseBotAction(s, other)).toBeNull();
  });

  it('never emits an illegal action and drives a 2-player game to a winner', () => {
    const { state, actions } = playAllBots(1);
    expect(state.phase).toBe('finished');
    expect(state.winner).not.toBeNull();
    expect(actions).toBeGreaterThan(10);
  });

  it('terminates for a range of seeds and player counts', () => {
    for (const seed of [2, 5, 8]) {
      const { state } = playAllBots(seed, ['A', 'B', 'C']);
      expect(state.phase).toBe('finished');
      expect(state.winner).not.toBeNull();
    }
  });

  it('actually contests conflicts (bots commit troops at least once)', () => {
    // scan the log of a full game for a combat reward going to a bot
    const { state } = playAllBots(4);
    const fought = state.log.some((e) => e.event === 'combat.reward');
    expect(fought).toBe(true);
  });

  it('plays a combat intrigue when it is not already winning, then passes', () => {
    // craft a combat where the bot (p1) is behind and holds an ambush (+swords)
    let s = makeImp(['A', 'B'], 3);
    const ambushId = Object.keys(s.intrigueById).find((i) => s.intrigueById[i].defId === 'ambush')!;
    s = {
      ...s,
      phase: 'combat',
      turn: 'p1',
      combatPassed: [],
      intrigueDeck: s.intrigueDeck.filter((i) => i !== ambushId),
      players: {
        ...s.players,
        p1: { ...s.players.p1, inConflict: 1 }, // strength 2
        p2: { ...s.players.p2, inConflict: 2 }, // strength 4 — p1 is behind
      },
      hidden: { ...s.hidden, p1: { ...s.hidden.p1, intrigue: [ambushId] } },
    };
    const action = chooseBotAction(s, 'p1');
    expect(action).toMatchObject({ type: 'imp/playIntrigue', intrigueId: ambushId });
    expect(impValidate(s, action!).ok).toBe(true);

    // after playing it the bot is ahead (2 + 4 swords = 6 vs 4) → it should pass
    const after = impApply(s, action!);
    if (after.phase === 'combat' && after.turn === 'p1') {
      expect(chooseBotAction(after, 'p1')).toMatchObject({ type: 'imp/combatPass' });
    }
  });

  it('does not waste a combat intrigue when already winning', () => {
    let s = makeImp(['A', 'B'], 3);
    const ambushId = Object.keys(s.intrigueById).find((i) => s.intrigueById[i].defId === 'ambush')!;
    s = {
      ...s,
      phase: 'combat',
      turn: 'p1',
      combatPassed: [],
      players: {
        ...s.players,
        p1: { ...s.players.p1, inConflict: 3 }, // strength 6 — ahead
        p2: { ...s.players.p2, inConflict: 1 }, // strength 2
      },
      hidden: { ...s.hidden, p1: { ...s.hidden.p1, intrigue: [ambushId] } },
    };
    expect(chooseBotAction(s, 'p1')).toMatchObject({ type: 'imp/combatPass' });
  });

  it('buys cards when it has persuasion (deck grows beyond the starting 10)', () => {
    const { state } = playAllBots(6);
    const grew = state.playerOrder.some((pid) => {
      const h = state.hidden[pid];
      return h.deck.length + h.hand.length + h.discard.length + h.inPlay.length + h.revealedCards.length > 10;
    });
    expect(grew).toBe(true);
  });
});
