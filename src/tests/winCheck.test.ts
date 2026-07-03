import { describe, expect, it } from 'vitest';
import { checkVictory } from '../game/engine/winCheck';
import type { GameState } from '../game/types';
import { makeGame, completeSetup, playerByFaction } from './helpers';

function holding(state: GameState, factionId: string, territoryIds: string[]): GameState {
  const extra = territoryIds.map((territoryId) => ({
    factionId,
    territoryId,
    sector: 0,
    forces: 1,
    specialForces: 0,
  }));
  // clear other occupants of those territories first
  const stacks = state.stacks.filter((s) => !territoryIds.includes(s.territoryId));
  return { ...state, stacks: [...stacks, ...extra] };
}

describe('win checks', () => {
  it('no winner in the opening state', () => {
    const state = completeSetup(makeGame(['atreides', 'harkonnen']));
    expect(checkVictory(state)).toBeNull();
  });

  it('a faction solely controlling three strongholds wins', () => {
    let state = completeSetup(makeGame(['atreides', 'harkonnen']));
    state = holding(state, 'atreides', ['arrakeen', 'carthag', 'sietch_tabr']);
    const result = checkVictory(state);
    expect(result?.kind).toBe('stronghold');
    expect(result?.winners).toEqual([playerByFaction(state, 'atreides')]);
  });

  it('shared occupancy is not control', () => {
    let state = completeSetup(makeGame(['atreides', 'harkonnen']));
    state = holding(state, 'atreides', ['arrakeen', 'carthag', 'sietch_tabr']);
    state = {
      ...state,
      stacks: [
        ...state.stacks,
        { factionId: 'harkonnen', territoryId: 'sietch_tabr', sector: 13, forces: 1, specialForces: 0 },
      ],
    };
    expect(checkVictory(state)).toBeNull();
  });

  it('an alliance wins with four strongholds between them', () => {
    let state = completeSetup(makeGame(['atreides', 'harkonnen', 'emperor']));
    state = holding(state, 'atreides', ['arrakeen', 'carthag']);
    state = holding(state, 'emperor', ['sietch_tabr', 'habbanya_sietch']);
    state = { ...state, alliances: [{ members: ['atreides', 'emperor'], formedOnRound: 2 }] };
    const result = checkVictory(state);
    expect(result?.kind).toBe('alliance');
    expect(new Set(result?.winners)).toEqual(
      new Set([playerByFaction(state, 'atreides'), playerByFaction(state, 'emperor')]),
    );
    // two strongholds each is NOT enough solo
    state = { ...state, alliances: [] };
    expect(checkVictory(state)).toBeNull();
  });

  it('an exact secret prediction steals the win', () => {
    let state = completeSetup(makeGame(['atreides', 'beneGesserit']));
    const bg = playerByFaction(state, 'beneGesserit');
    state = {
      ...state,
      round: 4,
      hidden: {
        ...state.hidden,
        [bg]: { ...state.hidden[bg], prediction: { factionId: 'atreides', round: 4 } },
      },
    };
    state = holding(state, 'atreides', ['arrakeen', 'carthag', 'sietch_tabr']);
    const result = checkVictory(state);
    expect(result?.kind).toBe('prediction');
    expect(result?.winners).toEqual([bg]);
  });

  it('a wrong-round prediction does not fire', () => {
    let state = completeSetup(makeGame(['atreides', 'beneGesserit']));
    const bg = playerByFaction(state, 'beneGesserit');
    state = {
      ...state,
      round: 4,
      hidden: {
        ...state.hidden,
        [bg]: { ...state.hidden[bg], prediction: { factionId: 'atreides', round: 5 } },
      },
    };
    state = holding(state, 'atreides', ['arrakeen', 'carthag', 'sietch_tabr']);
    expect(checkVictory(state)?.kind).toBe('stronghold');
  });

  it('the transporter faction wins by default when the final round ends without a victor', () => {
    let state = completeSetup(makeGame(['atreides', 'guild']));
    state = { ...state, round: state.maxRounds };
    const result = checkVictory(state);
    expect(result?.kind).toBe('special-guild');
    expect(result?.winners).toEqual([playerByFaction(state, 'guild')]);
  });

  it('the desert faction takes its special end-game victory when its conditions hold', () => {
    let state = completeSetup(makeGame(['fremen', 'guild']));
    state = { ...state, round: state.maxRounds };
    state = holding(state, 'fremen', ['sietch_tabr', 'habbanya_sietch']);
    // tuek's sietch is held by the transporter, which is not a blocking faction
    const result = checkVictory(state);
    expect(result?.kind).toBe('special-fremen');
    expect(result?.winners).toEqual([playerByFaction(state, 'fremen')]);
  });

  it('no default win before the final round', () => {
    let state = completeSetup(makeGame(['atreides', 'guild']));
    state = { ...state, round: state.maxRounds - 1 };
    expect(checkVictory(state)).toBeNull();
  });
});
