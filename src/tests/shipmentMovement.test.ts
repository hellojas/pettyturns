import { describe, expect, it } from 'vitest';
import { applyAction, validateAction } from '../game/engine/engine';
import {
  shipmentAndMovementPhase,
  shipmentCost,
  movementRange,
  territoryDistance,
} from '../game/engine/phases/shipmentAndMovement';
import type { GameState } from '../game/types';
import { makeGame, completeSetup, playerByFaction } from './helpers';

function toShipping(factions: Parameters<typeof makeGame>[0]): GameState {
  let s = completeSetup(makeGame(factions));
  s = { ...s, phase: 'shipmentAndMovement' };
  return shipmentAndMovementPhase.onEnter!(s);
}

describe('shipment', () => {
  it('charges the stronghold rate and the open-desert rate', () => {
    const s = toShipping(['atreides', 'harkonnen']);
    const at = playerByFaction(s, 'atreides');
    expect(shipmentCost(s, at, 'arrakeen', 4)).toBe(4); // 1 per force into a stronghold
    expect(shipmentCost(s, at, 'red_chasm', 4)).toBe(8); // 2 per force elsewhere
  });

  it('halves (rounded up) shipping for the transporter faction', () => {
    const s = toShipping(['guild', 'harkonnen']);
    const gu = playerByFaction(s, 'guild');
    expect(shipmentCost(s, gu, 'red_chasm', 3)).toBe(3); // ceil(6/2)
    expect(shipmentCost(s, gu, 'arrakeen', 3)).toBe(2); // ceil(3/2)
  });

  it('lets the desert faction deploy free near its home region', () => {
    const s = toShipping(['fremen', 'harkonnen']);
    const fr = playerByFaction(s, 'fremen');
    expect(shipmentCost(s, fr, 'the_great_flat', 5)).toBe(0);
    expect(shipmentCost(s, fr, 'funeral_plain', 5)).toBe(0); // adjacent to the anchor
  });

  it('blocks shipping into a sector under the storm', () => {
    let s = toShipping(['atreides', 'harkonnen']);
    const current = s.shipmentMovementPhase!.current!;
    s = { ...s, storm: { sector: 6, movedOnRound: 1 } };
    const verdict = validateAction(s, {
      type: 'shipment/ship',
      playerId: current,
      territoryId: 'red_chasm',
      sector: 6,
      forces: 2,
      specialForces: 0,
    });
    expect(verdict.ok).toBe(false);
    expect((verdict as { code: string }).code).toBe('storm');
  });

  it('blocks shipping beyond reserves and executes a legal shipment with payment', () => {
    let s = toShipping(['atreides', 'guild']);
    // drive to the atreides turn
    const at = playerByFaction(s, 'atreides');
    const gu = playerByFaction(s, 'guild');
    while (s.shipmentMovementPhase!.current !== at) {
      const cur = s.shipmentMovementPhase!.current!;
      const step = s.shipmentMovementPhase!.step!;
      s = applyAction(s, { type: step === 'ship' ? 'shipment/skip' : 'movement/skip', playerId: cur });
    }
    expect(
      validateAction(s, {
        type: 'shipment/ship',
        playerId: at,
        territoryId: 'sihaya_ridge',
        sector: 8,
        forces: 99,
        specialForces: 0,
      }).ok,
    ).toBe(false);

    const guildSpiceBefore = s.players[gu].spice;
    const next = applyAction(s, {
      type: 'shipment/ship',
      playerId: at,
      territoryId: 'sihaya_ridge',
      sector: 8,
      forces: 2,
      specialForces: 0,
    });
    expect(next.stacks.find((st) => st.territoryId === 'sihaya_ridge')?.forces).toBe(2);
    expect(next.players[at].reserves.forces).toBe(8);
    expect(next.players[at].spice).toBe(10 - 4);
    expect(next.players[gu].spice).toBe(guildSpiceBefore + 4); // transporter income
  });
});

describe('movement', () => {
  it('base range is 1; ornithopter city control grants 3; the desert faction gets its configured range', () => {
    const s = toShipping(['atreides', 'fremen']);
    const at = playerByFaction(s, 'atreides'); // solely controls arrakeen
    const fr = playerByFaction(s, 'fremen');
    expect(movementRange(s, at)).toBe(3);
    expect(movementRange(s, fr)).toBe(2);
  });

  it('computes territory distances over the adjacency graph', () => {
    expect(territoryDistance('arrakeen', 'arrakeen')).toBe(0);
    expect(territoryDistance('arrakeen', 'imperial_basin')).toBe(1);
    expect(territoryDistance('arrakeen', 'carthag')).toBe(2);
  });

  it('validates a legal move and rejects out-of-range or storm-bound moves', () => {
    let s = toShipping(['harkonnen', 'guild']);
    const hk = playerByFaction(s, 'harkonnen'); // 10 forces in carthag, range 1 (no sole city? carthag is theirs)
    while (s.shipmentMovementPhase!.current !== hk) {
      const cur = s.shipmentMovementPhase!.current!;
      const step = s.shipmentMovementPhase!.step!;
      s = applyAction(s, { type: step === 'ship' ? 'shipment/skip' : 'movement/skip', playerId: cur });
    }
    s = applyAction(s, { type: 'shipment/skip', playerId: hk });

    // carthag → tsimpo is 1 territory; carthag → broken_land is 2 (legal only with ornithopters)
    expect(
      validateAction(s, {
        type: 'movement/move',
        playerId: hk,
        from: { territoryId: 'carthag', sector: 10 },
        to: { territoryId: 'tsimpo', sector: 10 },
        forces: 5,
        specialForces: 0,
      }).ok,
    ).toBe(true);

    // controlling carthag grants ornithopters (range 3) — verify a 2-step move is legal
    expect(movementRange(s, hk)).toBe(3);

    // storm on the target sector blocks the move
    const stormy = { ...s, storm: { sector: 10, movedOnRound: 1 } };
    expect(
      validateAction(stormy, {
        type: 'movement/move',
        playerId: hk,
        from: { territoryId: 'carthag', sector: 10 },
        to: { territoryId: 'tsimpo', sector: 10 },
        forces: 5,
        specialForces: 0,
      }).ok,
    ).toBe(false);

    // cannot move more forces than present
    expect(
      validateAction(s, {
        type: 'movement/move',
        playerId: hk,
        from: { territoryId: 'carthag', sector: 10 },
        to: { territoryId: 'tsimpo', sector: 10 },
        forces: 11,
        specialForces: 0,
      }).ok,
    ).toBe(false);
  });

  it('executes a move and merges stacks', () => {
    let s = toShipping(['harkonnen', 'guild']);
    const hk = playerByFaction(s, 'harkonnen');
    while (s.shipmentMovementPhase!.current !== hk) {
      const cur = s.shipmentMovementPhase!.current!;
      const step = s.shipmentMovementPhase!.step!;
      s = applyAction(s, { type: step === 'ship' ? 'shipment/skip' : 'movement/skip', playerId: cur });
    }
    s = applyAction(s, { type: 'shipment/skip', playerId: hk });
    s = applyAction(s, {
      type: 'movement/move',
      playerId: hk,
      from: { territoryId: 'carthag', sector: 10 },
      to: { territoryId: 'tsimpo', sector: 10 },
      forces: 4,
      specialForces: 0,
    });
    expect(s.stacks.find((st) => st.territoryId === 'carthag')?.forces).toBe(6);
    expect(s.stacks.find((st) => st.territoryId === 'tsimpo')?.forces).toBe(4);
  });
});
