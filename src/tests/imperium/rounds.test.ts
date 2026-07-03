import { describe, expect, it } from 'vitest';
import { IMP_CONSTANTS } from '../../imperium/data/constants';
import { MAKER_SPACE_IDS } from '../../imperium/data/spaces';
import { endRoundQuietly, makeImp, patch, setHand } from './helpers';
import { apply } from './helpers';

describe('round flow and endgame', () => {
  it('recall starts the next round: fresh hands, agents, rotated first player', () => {
    let s = makeImp();
    const oldFirst = s.firstPlayer;
    s = endRoundQuietly(s);
    expect(s.round).toBe(2);
    expect(s.firstPlayer).not.toBe(oldFirst);
    expect(s.turn).toBe(s.firstPlayer);
    for (const pid of s.playerOrder) {
      expect(s.hidden[pid].hand).toHaveLength(IMP_CONSTANTS.handSize);
      expect(s.players[pid].agentsLeft).toBe(s.players[pid].agentsTotal);
      expect(s.players[pid].revealed).toBe(false);
      expect(s.players[pid].persuasion).toBe(0);
    }
    expect(s.occupied).toEqual({});
  });

  it('unvisited maker spaces accumulate bonus spice each round', () => {
    let s = makeImp();
    s = endRoundQuietly(s); // nobody visited any maker space
    for (const spaceId of MAKER_SPACE_IDS) {
      expect(s.makerBonus[spaceId]).toBe(1);
    }
    s = endRoundQuietly(s);
    for (const spaceId of MAKER_SPACE_IDS) {
      expect(s.makerBonus[spaceId]).toBe(2);
    }
  });

  it('ends the game at the end of the round when someone hits the VP target', () => {
    let s = makeImp();
    s = patch(s, 'p1', { vp: IMP_CONSTANTS.vpTarget });
    s = endRoundQuietly(s);
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe('p1');
    expect(s.finalStandings?.[0]).toEqual({ playerId: 'p1', vp: IMP_CONSTANTS.vpTarget });
  });

  it('ends after the last conflict and breaks ties by configured resources', () => {
    let s = makeImp();
    s = { ...s, conflictDeck: [] }; // this is the final round
    s = patch(s, 'p1', { vp: 5, spice: 0 });
    s = patch(s, 'p2', { vp: 5, spice: 3 });
    s = endRoundQuietly(s);
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe('p2'); // spice tiebreaker
  });

  it('endgame intrigue scores at final scoring', () => {
    let s = makeImp();
    const endgameId = Object.keys(s.intrigueById).find((i) => s.intrigueById[i].defId === 'masterStroke')!;
    s = {
      ...s,
      conflictDeck: [],
      intrigueDeck: s.intrigueDeck.filter((i) => i !== endgameId),
      hidden: { ...s.hidden, p2: { ...s.hidden.p2, intrigue: [endgameId] } },
    };
    s = patch(s, 'p1', { vp: 3 });
    s = patch(s, 'p2', { vp: 3 });
    s = endRoundQuietly(s);
    expect(s.phase).toBe('finished');
    expect(s.players.p2.vp).toBe(4);
    expect(s.winner).toBe('p2');
  });

  it('a full game driven with skip-turns terminates', () => {
    let s = makeImp();
    let guard = 0;
    while (s.phase !== 'finished' && guard++ < 30) {
      s = endRoundQuietly(s);
    }
    expect(s.phase).toBe('finished');
    expect(s.round).toBe(s.maxRounds);
    expect(s.winner).not.toBeNull();
  });

  it('plot intrigue plays on your own turn', () => {
    let s = makeImp();
    const windfallId = Object.keys(s.intrigueById).find((i) => s.intrigueById[i].defId === 'windfall')!;
    s = {
      ...s,
      intrigueDeck: s.intrigueDeck.filter((i) => i !== windfallId),
      hidden: { ...s.hidden, p1: { ...s.hidden.p1, intrigue: [windfallId] } },
    };
    s = apply(s, { type: 'imp/playIntrigue', playerId: 'p1', intrigueId: windfallId });
    expect(s.players.p1.solari).toBe(3);
    expect(s.intrigueDiscard).toContain(windfallId);
  });
});
