import { describe, expect, it } from 'vitest';
import { validateAction, applyAction } from '../game/engine/engine';
import { applyStormDamage } from '../game/engine/phases/storm';
import { stormPath, normalizeSector } from '../game/engine/state';
import { makeGame, completeSetup, playerByFaction, throughFirstStorm } from './helpers';

describe('storm movement', () => {
  it('sector arithmetic wraps around the map', () => {
    expect(normalizeSector(18)).toBe(0);
    expect(normalizeSector(-1)).toBe(17);
    expect(stormPath(16, 4)).toEqual([17, 0, 1, 2]);
  });

  it('rejects dials outside the configured range', () => {
    const state = completeSetup(makeGame(['atreides', 'harkonnen']));
    const dialer = state.pendingDecisions.find((d) => d.kind === 'stormDial')!.waitingFor[0];
    expect(validateAction(state, { type: 'storm/dial', playerId: dialer, value: 21 }).ok).toBe(false);
    expect(validateAction(state, { type: 'storm/dial', playerId: dialer, value: -1 }).ok).toBe(false);
    expect(validateAction(state, { type: 'storm/dial', playerId: dialer, value: 2.5 }).ok).toBe(false);
    expect(validateAction(state, { type: 'storm/dial', playerId: dialer, value: 5 }).ok).toBe(true);
  });

  it('rejects a dial from a non-dialer and double dialing', () => {
    const state = completeSetup(makeGame(['atreides', 'harkonnen', 'emperor']));
    const decision = state.pendingDecisions.find((d) => d.kind === 'stormDial')!;
    const outsider = state.playerOrder.find((p) => !decision.waitingFor.includes(p))!;
    expect(validateAction(state, { type: 'storm/dial', playerId: outsider, value: 3 }).ok).toBe(false);

    const dialer = decision.waitingFor[0];
    const after = applyAction(state, { type: 'storm/dial', playerId: dialer, value: 3 });
    expect(validateAction(after, { type: 'storm/dial', playerId: dialer, value: 2 }).ok).toBe(false);
  });

  it('moves the storm by the revealed total and advances to the spice blow', () => {
    const state = throughFirstStorm(makeGame(['atreides', 'harkonnen']), [3, 4]);
    expect(state.storm.sector).toBe(7);
    expect(state.storm.movedOnRound).toBe(1);
    // spice blow is automatic; the game settles in bidding (or nexus never on round 1)
    expect(state.phase).toBe('bidding');
  });

  it('destroys forces on sand but shelters strongholds and rock', () => {
    let state = completeSetup(makeGame(['atreides', 'harkonnen']));
    // put forces in harm's way: sand in sector 2, rock in sector 3, stronghold arrakeen sector 9
    state = {
      ...state,
      stacks: [
        ...state.stacks, // includes arrakeen + carthag strongholds
        { factionId: 'atreides', territoryId: 'cielago_north', sector: 2, forces: 4, specialForces: 0 },
        { factionId: 'harkonnen', territoryId: 'false_wall_south', sector: 3, forces: 5, specialForces: 0 },
      ],
    };
    const swept = applyStormDamage(state, [1, 2, 3]);
    expect(swept.stacks.find((s) => s.territoryId === 'cielago_north')).toBeUndefined();
    expect(swept.stacks.find((s) => s.territoryId === 'false_wall_south')?.forces).toBe(5);
    expect(swept.stacks.find((s) => s.territoryId === 'arrakeen')?.forces).toBe(10);
    const at = playerByFaction(swept, 'atreides');
    expect(swept.players[at].tanksForces.forces).toBe(4);
  });

  it('the desert faction loses only half, rounded up', () => {
    let state = completeSetup(makeGame(['fremen', 'harkonnen']));
    state = {
      ...state,
      stacks: [{ factionId: 'fremen', territoryId: 'cielago_north', sector: 1, forces: 5, specialForces: 0 }],
    };
    const swept = applyStormDamage(state, [1]);
    const remaining = swept.stacks.find((s) => s.territoryId === 'cielago_north');
    expect(remaining?.forces).toBe(2); // ceil(5/2) = 3 killed
    expect(swept.players[playerByFaction(swept, 'fremen')].tanksForces.forces).toBe(3);
  });

  it('removes spice from swept sectors', () => {
    let state = completeSetup(makeGame(['atreides', 'harkonnen']));
    state = {
      ...state,
      spiceOnBoard: [
        { territoryId: 'cielago_north', sector: 1, amount: 8 },
        { territoryId: 'red_chasm', sector: 6, amount: 8 },
      ],
    };
    const swept = applyStormDamage(state, [0, 1, 2]);
    expect(swept.spiceOnBoard).toEqual([{ territoryId: 'red_chasm', sector: 6, amount: 8 }]);
  });
});
