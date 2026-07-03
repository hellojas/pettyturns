import { GAME_CONSTANTS } from '../../data/constants';
import { FACTIONS } from '../../data/factions';
import { TERRITORIES } from '../../data/territories';
import type {
  AllowedAction,
  FactionId,
  GameState,
  MoveForcesAction,
  PlayerId,
  ShipForcesAction,
  TerritoryId,
  TurnAction,
  ValidationResult,
} from '../../types';
import { fail, ok } from '../../types';
import { appendLog } from '../log';
import { addForces, getPlayer, occupantsOf, removeForces, stormOrder } from '../state';
import type { PhaseModule } from './module';

/**
 * Shipment & movement: players act one at a time in storm order. On their
 * turn a player may make one shipment from off-planet reserves, then one
 * movement of a single force group. Either sub-step may be skipped.
 *
 * Costs: shipping into a stronghold costs the low rate per force, anywhere
 * else the high rate (constants, VERIFY). Payments go to the transporter
 * faction if it is in the game (which itself pays half, rounded up, to the
 * bank). The desert faction instead deploys for free into its home region
 * (within the configured range of its anchor territory).
 *
 * Restrictions implemented: no shipping into a sector under the storm, no
 * entering a stronghold already held by the configured occupancy limit of
 * other factions.
 *
 * MVP TEMPORARY SHORTCUT (documented deviation, fix with sector-path routing):
 * movement range is computed over the territory adjacency graph; storm
 * blocking is enforced on the destination sector and on sand territories
 * wholly under the storm, but not yet on individual pass-through sectors.
 */

function smState(state: GameState) {
  return state.shipmentMovementPhase;
}

function hasPower(factionId: FactionId, powerId: string) {
  return FACTIONS[factionId].powers.find((p) => p.id === powerId);
}

export function shipmentCost(state: GameState, playerId: PlayerId, territoryId: TerritoryId, count: number): number {
  const player = getPlayer(state, playerId);
  const territory = TERRITORIES[territoryId];
  const perForce =
    territory.kind === 'stronghold' ? GAME_CONSTANTS.shipCostStronghold : GAME_CONSTANTS.shipCostOther;
  let cost = perForce * count;

  const halfPrice = hasPower(player.factionId, 'half-price-shipping');
  if (halfPrice) cost = Math.ceil(cost / 2);

  const native = hasPower(player.factionId, 'native-deployment');
  if (native && isWithinNativeRange(territoryId, native.params as { anchorTerritoryId: string; maxDistance: number })) {
    cost = 0;
  }
  return cost;
}

function isWithinNativeRange(territoryId: TerritoryId, params: { anchorTerritoryId: string; maxDistance: number }): boolean {
  const dist = territoryDistance(params.anchorTerritoryId, territoryId);
  return dist !== null && dist <= params.maxDistance;
}

/** BFS distance over the territory adjacency graph (no storm awareness). */
export function territoryDistance(from: TerritoryId, to: TerritoryId): number | null {
  if (from === to) return 0;
  const seen = new Set<TerritoryId>([from]);
  let frontier: TerritoryId[] = [from];
  let depth = 0;
  while (frontier.length > 0 && depth < 20) {
    depth++;
    const next: TerritoryId[] = [];
    for (const t of frontier) {
      for (const adj of TERRITORIES[t].adjacent) {
        if (seen.has(adj)) continue;
        if (adj === to) return depth;
        seen.add(adj);
        next.push(adj);
      }
    }
    frontier = next;
  }
  return null;
}

/** Movement range for a faction: base 1; 3 with ornithopter city control; desert power per config. */
export function movementRange(state: GameState, playerId: PlayerId): number {
  const player = getPlayer(state, playerId);
  const desert = hasPower(player.factionId, 'desert-mobility');
  let range: number = GAME_CONSTANTS.baseMoveRange;
  if (desert && typeof desert.params?.maxDistance === 'number') range = desert.params.maxDistance as number;
  const hasOrni = GAME_CONSTANTS.ornithopterTerritoryIds.some((t) => {
    const occ = occupantsOf(state, t);
    return occ.length === 1 && occ[0] === player.factionId;
  });
  if (hasOrni) range = Math.max(range, GAME_CONSTANTS.ornithopterMoveRange);
  return range;
}

function strongholdBlocked(state: GameState, factionId: FactionId, territoryId: TerritoryId): boolean {
  const territory = TERRITORIES[territoryId];
  if (territory.kind !== 'stronghold') return false;
  const occ = occupantsOf(state, territoryId).filter((f) => f !== factionId);
  return occ.length >= GAME_CONSTANTS.strongholdOccupancyLimit;
}

function sectorUnderStorm(state: GameState, territoryId: TerritoryId, sector: number): boolean {
  const territory = TERRITORIES[territoryId];
  if (territory.kind !== 'sand') return false; // sheltered kinds ignore the storm
  return state.storm.sector === sector;
}

export const shipmentAndMovementPhase: PhaseModule = {
  phase: 'shipmentAndMovement',

  onEnter(state): GameState {
    const queue = stormOrder(state);
    let next: GameState = {
      ...state,
      shipmentMovementPhase: { queue: queue.slice(1), current: queue[0] ?? null, step: 'ship' },
    };
    return appendLog(next, {
      event: 'shipment.begin',
      text: `Shipment & movement begins. ${queue.length > 0 ? next.players[queue[0]].name + ' is first in storm order.' : ''}`,
    });
  },

  getAllowedActions(state, playerId): AllowedAction[] {
    const sm = smState(state);
    if (!sm || sm.current !== playerId) return [];
    if (sm.step === 'ship') {
      return [
        {
          type: 'shipment/ship',
          label: 'Ship forces from your reserves',
          params: {
            reserves: getPlayer(state, playerId).reserves,
            costStronghold: GAME_CONSTANTS.shipCostStronghold,
            costOther: GAME_CONSTANTS.shipCostOther,
          },
        },
        { type: 'shipment/skip', label: 'Skip shipment' },
      ];
    }
    return [
      { type: 'movement/move', label: 'Move one force group', params: { range: movementRange(state, playerId) } },
      { type: 'movement/skip', label: 'Skip movement' },
    ];
  },

  validateAction(state, action): ValidationResult {
    const sm = smState(state);
    if (!sm) return fail('not-active', 'Shipment & movement is not active.');
    const playerId = action.playerId as PlayerId;
    if (sm.current !== playerId) return fail('not-your-turn', 'It is not your ship-and-move turn.');
    const player = getPlayer(state, playerId);

    switch (action.type) {
      case 'shipment/ship': {
        if (sm.step !== 'ship') return fail('wrong-step', 'Your shipment step is over.');
        const a = action as ShipForcesAction;
        const count = a.forces + a.specialForces;
        if (count <= 0) return fail('nothing', 'Ship at least one force.');
        if (a.forces > player.reserves.forces || a.specialForces > player.reserves.specialForces)
          return fail('not-in-reserves', 'You cannot ship more forces than you hold in reserve.');
        const territory = TERRITORIES[a.territoryId];
        if (!territory) return fail('bad-territory', 'Unknown territory.');
        if (territory.kind !== 'polarSink' && !territory.sectors.includes(a.sector))
          return fail('bad-sector', 'That sector is not part of the territory.');
        if (sectorUnderStorm(state, a.territoryId, a.sector))
          return fail('storm', 'You may not ship into a sector under the storm.');
        if (strongholdBlocked(state, player.factionId, a.territoryId))
          return fail('occupied', 'That stronghold is already contested by the maximum number of factions.');
        if (a.mode && a.mode !== 'normal' && !hasPower(player.factionId, 'flexible-shipping'))
          return fail('no-power', 'Only the transporter faction can make that kind of shipment.');
        const cost = shipmentCost(state, playerId, a.territoryId, count);
        if (cost > player.spice) return fail('cannot-afford', `That shipment costs ${cost} spice.`);
        return ok();
      }
      case 'shipment/skip':
        return sm.step === 'ship' ? ok() : fail('wrong-step', 'Your shipment step is over.');
      case 'movement/move': {
        if (sm.step !== 'move') return fail('wrong-step', 'Finish your shipment step first.');
        const a = action as MoveForcesAction;
        const count = a.forces + a.specialForces;
        if (count <= 0) return fail('nothing', 'Move at least one force.');
        const stack = state.stacks.find(
          (s) =>
            s.factionId === player.factionId &&
            s.territoryId === a.from.territoryId &&
            s.sector === a.from.sector,
        );
        if (!stack || stack.forces < a.forces || stack.specialForces < a.specialForces)
          return fail('not-there', 'You do not have that many forces in the starting sector.');
        const to = TERRITORIES[a.to.territoryId];
        if (!to) return fail('bad-territory', 'Unknown destination.');
        if (to.kind !== 'polarSink' && !to.sectors.includes(a.to.sector))
          return fail('bad-sector', 'That sector is not part of the destination territory.');
        if (sectorUnderStorm(state, a.from.territoryId, a.from.sector))
          return fail('storm', 'Forces under the storm may not move.');
        if (sectorUnderStorm(state, a.to.territoryId, a.to.sector))
          return fail('storm', 'You may not move into a sector under the storm.');
        if (strongholdBlocked(state, player.factionId, a.to.territoryId))
          return fail('occupied', 'That stronghold is already contested by the maximum number of factions.');
        const dist = territoryDistance(a.from.territoryId, a.to.territoryId);
        if (dist === null || dist > movementRange(state, playerId) || dist === 0)
          return fail('out-of-range', `That destination is out of range (${movementRange(state, playerId)}).`);
        return ok();
      }
      case 'movement/skip':
        return sm.step === 'move' ? ok() : fail('wrong-step', 'Finish your shipment step first.');
      default:
        return fail('wrong-phase', `Action ${action.type} is not part of shipment & movement.`);
    }
  },

  applyAction(state, action): GameState {
    const sm = smState(state)!;
    const playerId = action.playerId as PlayerId;
    const player = getPlayer(state, playerId);

    const advanceTurn = (s: GameState): GameState => {
      const cur = smState(s)!;
      if (cur.step === 'ship') {
        return { ...s, shipmentMovementPhase: { ...cur, step: 'move' } };
      }
      const [nextPlayer, ...rest] = cur.queue;
      return {
        ...s,
        shipmentMovementPhase: {
          queue: rest,
          current: nextPlayer ?? null,
          step: nextPlayer ? 'ship' : null,
        },
      };
    };

    switch (action.type) {
      case 'shipment/ship': {
        const a = action as ShipForcesAction;
        const count = a.forces + a.specialForces;
        const cost = shipmentCost(state, playerId, a.territoryId, count);

        let next = addForces(state, player.factionId, a.territoryId, a.sector, a.forces, a.specialForces);

        // payment: to the transporter faction unless the shipper is that faction
        const transporter = Object.values(next.players).find((p) =>
          hasPower(p.factionId, 'shipping-income'),
        );
        const payee = transporter && transporter.id !== playerId ? transporter : null;
        next = {
          ...next,
          players: {
            ...next.players,
            [playerId]: {
              ...next.players[playerId],
              spice: next.players[playerId].spice - cost,
              reserves: {
                forces: player.reserves.forces - a.forces,
                specialForces: player.reserves.specialForces - a.specialForces,
              },
            },
            ...(payee
              ? { [payee.id]: { ...next.players[payee.id], spice: next.players[payee.id].spice + cost } }
              : {}),
          },
        };
        next = appendLog(next, {
          event: 'shipment.shipped',
          text: `${player.name} shipped ${count} force(s) to ${TERRITORIES[a.territoryId].name} for ${cost} spice.`,
          data: { playerId, territoryId: a.territoryId, sector: a.sector, count, cost },
          at: action.at,
        });
        return advanceTurn(next);
      }
      case 'shipment/skip':
        return advanceTurn(
          appendLog(state, { event: 'shipment.skipped', text: `${player.name} ships nothing.`, at: action.at }),
        );
      case 'movement/move': {
        const a = action as MoveForcesAction;
        let next = removeForces(state, player.factionId, a.from.territoryId, a.from.sector, a.forces, a.specialForces);
        next = addForces(next, player.factionId, a.to.territoryId, a.to.sector, a.forces, a.specialForces);
        next = appendLog(next, {
          event: 'movement.moved',
          text: `${player.name} moved ${a.forces + a.specialForces} force(s) from ${TERRITORIES[a.from.territoryId].name} to ${TERRITORIES[a.to.territoryId].name}.`,
          data: { playerId, from: a.from, to: a.to, forces: a.forces, specialForces: a.specialForces },
          at: action.at,
        });
        return advanceTurn(next);
      }
      case 'movement/skip':
        return advanceTurn(
          appendLog(state, { event: 'movement.skipped', text: `${player.name} does not move.`, at: action.at }),
        );
      default:
        throw new Error(`shipment & movement cannot apply ${action.type}`);
    }
  },

  isPhaseComplete(state): boolean {
    const sm = smState(state);
    return sm !== null && sm.current === null;
  },

  advancePhase(state): GameState {
    return { ...state, shipmentMovementPhase: null, phase: 'battle' };
  },
};
