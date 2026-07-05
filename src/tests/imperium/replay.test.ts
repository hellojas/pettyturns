import { describe, expect, it } from 'vitest';
import { impApply } from '../../imperium/engine/engine';
import { replayImperiumGame, stateAfter } from '../../imperium/engine/replay';
import type { ImpAction, ImpGameState } from '../../imperium/types';
import { makeImp } from './helpers';

/**
 * Drive a short but varied action journal from a fresh game: each player takes
 * their reveal turn and ends their round, then combat passes resolve. Returns
 * the recorded journal plus the sequence of states before each action, so tests
 * can assert replay lands exactly on any prefix.
 */
function recordGame(): { initial: ImpGameState; journal: ImpAction[]; states: ImpGameState[] } {
  const initial = makeImp(['Alice', 'Bob'], 99);
  const journal: ImpAction[] = [];
  const states: ImpGameState[] = [initial];
  let s = initial;
  let guard = 0;
  while (s.phase !== 'finished' && s.round === 1 && guard++ < 40) {
    let action: ImpAction | null = null;
    if (s.phase === 'playerTurns' && s.turn) {
      action = s.players[s.turn].revealed
        ? { type: 'imp/endTurn', playerId: s.turn }
        : { type: 'imp/reveal', playerId: s.turn };
    } else if (s.phase === 'combat' && s.turn) {
      action = { type: 'imp/combatPass', playerId: s.turn };
    } else {
      break;
    }
    journal.push(action);
    s = impApply(s, action);
    states.push(s);
  }
  return { initial, journal, states };
}

describe('deterministic replay (undo/redo backbone)', () => {
  it('replaying the full journal reproduces the live state exactly', () => {
    const { initial, journal, states } = recordGame();
    const replayed = replayImperiumGame(initial, journal);
    expect(replayed).toEqual(states[states.length - 1]);
  });

  it('every prefix replay matches the state recorded at that step (undo targets)', () => {
    const { initial, journal, states } = recordGame();
    for (let k = 0; k <= journal.length; k++) {
      expect(stateAfter(initial, journal, k)).toEqual(states[k]);
    }
  });

  it('stateAfter(0) is the initial state and clamps out-of-range counts', () => {
    const { initial, journal, states } = recordGame();
    expect(stateAfter(initial, journal, 0)).toEqual(initial);
    expect(stateAfter(initial, journal, 999)).toEqual(states[states.length - 1]);
    expect(stateAfter(initial, journal, -5)).toEqual(initial);
  });

  it('undo-then-redo (replay k-1 then k) is stable across the whole journal', () => {
    const { initial, journal, states } = recordGame();
    for (let k = 1; k <= journal.length; k++) {
      const undone = stateAfter(initial, journal, k - 1);
      expect(undone).toEqual(states[k - 1]);
      const redone = impApply(undone, journal[k - 1]);
      expect(redone).toEqual(states[k]);
    }
  });

  it('replay is independent of object identity (survives a JSON round-trip of the journal)', () => {
    const { initial, journal, states } = recordGame();
    const initialCopy = JSON.parse(JSON.stringify(initial)) as ImpGameState;
    const journalCopy = JSON.parse(JSON.stringify(journal)) as ImpAction[];
    expect(replayImperiumGame(initialCopy, journalCopy)).toEqual(states[states.length - 1]);
  });
});
