import { describe, expect, it } from 'vitest';
import { TREACHERY_DECK_SIZE } from '../game/data/treacheryCards';
import { GAME_CONSTANTS } from '../game/data/constants';
import { makeGame, completeSetup, playerByFaction } from './helpers';

describe('createGame', () => {
  it('rejects fewer than 2 or more than 6 players', () => {
    expect(() => makeGame(['atreides'])).toThrow();
    expect(() => makeGame(['atreides', 'harkonnen', 'emperor', 'guild', 'fremen', 'beneGesserit', 'atreides' as never])).toThrow();
  });

  it('rejects duplicate factions', () => {
    expect(() => makeGame(['atreides', 'atreides'])).toThrow();
  });

  it('is deterministic: same seed produces identical JSON', () => {
    const a = makeGame(['atreides', 'harkonnen', 'guild'], 7);
    const b = makeGame(['atreides', 'harkonnen', 'guild'], 7);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds shuffle differently', () => {
    const a = makeGame(['atreides', 'harkonnen'], 1);
    const b = makeGame(['atreides', 'harkonnen'], 2);
    expect(a.decks.treacheryDraw.join(',')).not.toBe(b.decks.treacheryDraw.join(','));
  });

  it('survives a JSON round-trip', () => {
    const state = makeGame(['atreides', 'harkonnen']);
    const revived = JSON.parse(JSON.stringify(state));
    expect(revived).toEqual(state);
  });

  it('deals starting hands and keeps deck accounting exact', () => {
    const state = makeGame(['atreides', 'harkonnen', 'emperor']);
    const handTotal = Object.values(state.hidden).reduce((n, h) => n + h.hand.length, 0);
    expect(handTotal).toBe(3 * GAME_CONSTANTS.startingTreacheryCards);
    expect(state.decks.treacheryDraw.length).toBe(TREACHERY_DECK_SIZE - handTotal);
  });

  it('places configured starting forces on the board', () => {
    const state = makeGame(['atreides', 'harkonnen', 'guild']);
    const atreides = state.stacks.find((s) => s.factionId === 'atreides');
    expect(atreides).toMatchObject({ territoryId: 'arrakeen', forces: 10 });
    const guild = state.stacks.find((s) => s.factionId === 'guild');
    expect(guild).toMatchObject({ territoryId: 'tueks_sietch', forces: 5 });
  });

  it('deals 4 traitor options each; the traitor-keeping faction keeps all of them at once', () => {
    const state = makeGame(['atreides', 'harkonnen']);
    const hk = playerByFaction(state, 'harkonnen');
    const at = playerByFaction(state, 'atreides');
    expect(state.hidden[hk].traitorOptions).toHaveLength(4);
    expect(state.hidden[hk].traitors).toHaveLength(4);
    expect(state.hidden[at].traitors).toHaveLength(0); // must choose first
  });

  it('completes setup into the storm phase with a pending dial', () => {
    const state = completeSetup(makeGame(['atreides', 'harkonnen']));
    expect(state.phase).toBe('storm');
    expect(state.pendingDecisions.some((d) => d.kind === 'stormDial')).toBe(true);
  });

  it('handles variable starting placement for the desert faction', () => {
    const state = completeSetup(makeGame(['fremen', 'harkonnen']));
    const total = state.stacks
      .filter((s) => s.factionId === 'fremen')
      .reduce((n, s) => n + s.forces + s.specialForces, 0);
    expect(total).toBe(10);
    expect(state.players[playerByFaction(state, 'fremen')].reserves.forces).toBe(10);
  });
});
