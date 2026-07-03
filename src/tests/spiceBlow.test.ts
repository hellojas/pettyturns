import { describe, expect, it } from 'vitest';
import { spiceBlowPhase } from '../game/engine/phases/spiceBlow';
import { autoAdvance } from '../game/engine/engine';
import type { GameState } from '../game/types';
import { makeGame, completeSetup, playerByFaction, throughFirstStorm } from './helpers';

/** Force a known card order onto the spice draw pile. */
function stackDeck(state: GameState, topFirst: string[]): GameState {
  const rest = state.decks.spiceDraw.filter((id) => !topFirst.includes(id));
  return { ...state, decks: { ...state.decks, spiceDraw: [...topFirst, ...rest] } };
}

function enter(state: GameState): GameState {
  return spiceBlowPhase.onEnter!({ ...state, phase: 'spiceBlow' });
}

describe('spice blow', () => {
  it('places the printed amount at the blow sector for a territory card', () => {
    let state = stackDeck(completeSetup(makeGame(['atreides', 'harkonnen'])), ['spice:red_chasm']);
    state = enter(state);
    expect(state.spiceOnBoard).toContainEqual({ territoryId: 'red_chasm', sector: 6, amount: 8 });
    expect(state.decks.spiceDiscardA).toContain('spice:red_chasm');
    expect(state.spiceBlowPhase).toMatchObject({ resolved: true, wormAppeared: false });
  });

  it('smothers the blow when its sector is under the storm', () => {
    let state = stackDeck(completeSetup(makeGame(['atreides', 'harkonnen'])), ['spice:red_chasm']);
    state = { ...state, storm: { sector: 6, movedOnRound: 1 } };
    state = enter(state);
    expect(state.spiceOnBoard).toHaveLength(0);
    expect(state.decks.spiceDiscardA).toContain('spice:red_chasm'); // still discarded
  });

  it('sets aside worms on round 1 and draws replacements', () => {
    let state = stackDeck(completeSetup(makeGame(['atreides', 'harkonnen'])), ['worm#1', 'spice:red_chasm']);
    state = enter(state);
    expect(state.spiceBlowPhase?.wormAppeared).toBe(false);
    expect(state.spiceOnBoard).toContainEqual({ territoryId: 'red_chasm', sector: 6, amount: 8 });
    // the set-aside worm went back into the draw pile, not the discards
    expect(state.decks.spiceDiscardA).not.toContain('worm#1');
    expect(state.decks.spiceDraw).toContain('worm#1');
  });

  it('after round 1, a worm devours the last blow territory and triggers a nexus', () => {
    let state = stackDeck(completeSetup(makeGame(['atreides', 'harkonnen'])), ['worm#1', 'spice:cielago_north']);
    state = {
      ...state,
      round: 2,
      decks: { ...state.decks, spiceDiscardA: ['spice:red_chasm'] }, // last blow was red chasm
      spiceOnBoard: [{ territoryId: 'red_chasm', sector: 6, amount: 8 }],
      stacks: [
        ...state.stacks,
        { factionId: 'atreides', territoryId: 'red_chasm', sector: 6, forces: 3, specialForces: 0 },
      ],
    };
    state = enter(state);
    expect(state.spiceBlowPhase?.wormAppeared).toBe(true);
    // forces and spice devoured
    expect(state.stacks.find((s) => s.territoryId === 'red_chasm')).toBeUndefined();
    expect(state.spiceOnBoard.find((s) => s.territoryId === 'red_chasm')).toBeUndefined();
    expect(state.players[playerByFaction(state, 'atreides')].tanksForces.forces).toBe(3);
    // drawing continued to the next territory card
    expect(state.spiceOnBoard).toContainEqual({ territoryId: 'cielago_north', sector: 1, amount: 8 });
    // advancing lands in nexus, resuming at bidding afterwards
    const advanced = autoAdvance(state);
    expect(advanced.phase).toBe('nexus');
    expect(advanced.interruptedPhase).toBe('bidding');
  });

  it('spares the desert faction from the worm', () => {
    let state = stackDeck(completeSetup(makeGame(['fremen', 'harkonnen'])), ['worm#1', 'spice:cielago_north']);
    state = {
      ...state,
      round: 2,
      decks: { ...state.decks, spiceDiscardA: ['spice:red_chasm'] },
      stacks: [{ factionId: 'fremen', territoryId: 'red_chasm', sector: 6, forces: 4, specialForces: 0 }],
    };
    state = enter(state);
    expect(state.stacks.find((s) => s.territoryId === 'red_chasm')?.forces).toBe(4);
  });

  it('reaches the spice blow automatically after the storm resolves', () => {
    const state = throughFirstStorm(makeGame(['atreides', 'harkonnen']));
    // a blow (or smothered blow) was logged and the phase moved on
    expect(state.log.some((e) => e.event.startsWith('spiceBlow.'))).toBe(true);
  });
});
