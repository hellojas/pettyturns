import { GAME_CONSTANTS } from '../../data/constants';
import { FACTIONS } from '../../data/factions';
import { TERRITORIES } from '../../data/territories';
import type {
  AllowedAction,
  GameState,
  PlayerId,
  StormDialAction,
  TurnAction,
  ValidationResult,
} from '../../types';
import { fail, ok } from '../../types';
import { appendLog } from '../log';
import { getPlayer, normalizeSector, sendToTanks, stormPath } from '../state';
import type { PhaseModule } from './module';

/**
 * Storm phase.
 *
 * Movement: the two players seated nearest on either side of the storm-start
 * sector each secretly dial a number; the revealed total moves the storm
 * counterclockwise. Round 1 uses the wide dial range (initial placement);
 * later rounds use the narrow range. Ranges live in constants (VERIFY).
 *
 * Damage: forces in sand territories in each sector the storm enters are sent
 * to the tanks (rock, strongholds and the polar sink shelter forces). The
 * desert faction loses only half, rounded up. Spice in swept sectors is
 * removed from the board.
 */

function dialRange(state: GameState): { min: number; max: number } {
  return state.round === 1 ? GAME_CONSTANTS.firstStormDial : GAME_CONSTANTS.laterStormDial;
}

/** The two players whose seats flank the storm-start sector. */
export function stormDialers(state: GameState): PlayerId[] {
  const n = GAME_CONSTANTS.sectorCount;
  const start = GAME_CONSTANTS.stormStartSector;
  const ids = [...state.playerOrder];
  if (ids.length <= 2) return ids;
  const ccwDist = (seat: number) => (((seat - start) % n) + n) % n; // ahead of start
  const cwDist = (seat: number) => (((start - seat) % n) + n) % n; // behind start
  const ahead = ids.reduce((best, p) =>
    ccwDist(state.players[p].seatSector) < ccwDist(state.players[best].seatSector) ? p : best,
  );
  const behind = ids
    .filter((p) => p !== ahead)
    .reduce((best, p) =>
      cwDist(state.players[p].seatSector) < cwDist(state.players[best].seatSector) ? p : best,
    );
  return [ahead, behind];
}

function decision(state: GameState) {
  return state.pendingDecisions.find((d) => d.kind === 'stormDial');
}

/** Apply storm damage for every sector in the path; returns new state. */
export function applyStormDamage(state: GameState, path: number[]): GameState {
  let next = state;
  const swept = new Set(path);

  // forces: sand-territory stacks in swept sectors are destroyed
  const survivors: GameState['stacks'] = [];
  for (const stack of next.stacks) {
    const territory = TERRITORIES[stack.territoryId];
    const sheltered =
      territory.kind === 'rock' || territory.kind === 'stronghold' || territory.kind === 'polarSink';
    if (sheltered || !swept.has(stack.sector)) {
      survivors.push(stack);
      continue;
    }
    const owner = Object.values(next.players).find((p) => p.factionId === stack.factionId);
    if (!owner) {
      survivors.push(stack);
      continue;
    }
    const def = FACTIONS[stack.factionId];
    const stormHardy = def.powers.find((p) => p.id === 'storm-hardy');
    const total = stack.forces + stack.specialForces;
    let killed = total;
    if (stormHardy) killed = Math.ceil(total / 2); // half lost, rounded up (VERIFY)

    // kill normal forces first, then special
    const killedForces = Math.min(stack.forces, killed);
    const killedSpecial = killed - killedForces;
    next = sendToTanks(next, owner.id, killedForces, killedSpecial);
    next = appendLog(next, {
      event: 'storm.losses',
      text: `The storm destroyed ${killed} ${def.name} force(s) in ${TERRITORIES[stack.territoryId].name} (sector ${stack.sector}).`,
      data: { factionId: stack.factionId, territoryId: stack.territoryId, sector: stack.sector, killed },
    });
    const remaining = total - killed;
    if (remaining > 0) {
      survivors.push({
        ...stack,
        forces: stack.forces - killedForces,
        specialForces: stack.specialForces - killedSpecial,
      });
    }
  }
  next = { ...next, stacks: survivors };

  // spice in swept sectors is removed
  const keptSpice = next.spiceOnBoard.filter((s) => !swept.has(s.sector));
  for (const s of next.spiceOnBoard) {
    if (swept.has(s.sector)) {
      next = appendLog(next, {
        event: 'storm.spiceLost',
        text: `The storm scattered ${s.amount} spice in ${TERRITORIES[s.territoryId].name}.`,
        data: { territoryId: s.territoryId, sector: s.sector, amount: s.amount },
      });
    }
  }
  return { ...next, spiceOnBoard: keptSpice };
}

export const stormPhase: PhaseModule = {
  phase: 'storm',

  onEnter(state): GameState {
    const dialers = stormDialers(state);
    let next: GameState = {
      ...state,
      stormPhase: { dialers },
      pendingDecisions: [
        ...state.pendingDecisions,
        {
          id: `storm:${state.round}`,
          kind: 'stormDial',
          waitingFor: dialers,
          committed: {},
          createdOnRound: state.round,
        },
      ],
    };
    const range = dialRange(next);
    return appendLog(next, {
      event: 'storm.dialing',
      text: `Storm phase: ${dialers.map((p) => next.players[p].name).join(' and ')} secretly dial ${range.min}–${range.max}.`,
    });
  },

  getAllowedActions(state, playerId): AllowedAction[] {
    const d = decision(state);
    if (!d || !d.waitingFor.includes(playerId) || d.committed[playerId] !== undefined) return [];
    const range = dialRange(state);
    return [{ type: 'storm/dial', label: 'Secretly dial the storm movement', params: range }];
  },

  validateAction(state, action): ValidationResult {
    if (action.type !== 'storm/dial') return fail('wrong-phase', `Action ${action.type} is not part of the storm phase.`);
    const a = action as StormDialAction;
    const d = decision(state);
    if (!d) return fail('no-decision', 'No storm dial is pending.');
    if (!d.waitingFor.includes(a.playerId as PlayerId)) return fail('not-a-dialer', 'You are not dialing this storm.');
    if (d.committed[a.playerId as PlayerId] !== undefined) return fail('already-dialed', 'You already dialed.');
    const range = dialRange(state);
    if (!Number.isInteger(a.value) || a.value < range.min || a.value > range.max)
      return fail('out-of-range', `Dial must be a whole number between ${range.min} and ${range.max}.`);
    return ok();
  },

  applyAction(state, action): GameState {
    const a = action as StormDialAction;
    const playerId = a.playerId as PlayerId;
    let next: GameState = {
      ...state,
      pendingDecisions: state.pendingDecisions.map((d) =>
        d.kind === 'stormDial' ? { ...d, committed: { ...d.committed, [playerId]: a.value } } : d,
      ),
    };
    next = appendLog(next, {
      event: 'storm.dialed',
      text: `${getPlayer(state, playerId).name} locked in a storm dial.`,
      visibility: { scope: 'private', playerIds: [playerId] },
      at: a.at,
    });

    // reveal + move once everyone has dialed
    const d = next.pendingDecisions.find((x) => x.kind === 'stormDial')!;
    const allIn = d.waitingFor.every((p) => d.committed[p] !== undefined);
    if (!allIn) return next;

    const total = d.waitingFor.reduce((n, p) => n + (d.committed[p] as number), 0);
    const from = next.storm.sector;
    const path = stormPath(from, total);
    const to = path.length > 0 ? path[path.length - 1] : from;

    next = appendLog(next, {
      event: 'storm.moved',
      text: `Dials revealed (${d.waitingFor.map((p) => `${next.players[p].name}: ${d.committed[p]}`).join(', ')}). The storm moves ${total} sector(s) to sector ${to}.`,
      data: { from, to, total, dials: d.committed },
    });
    next = {
      ...next,
      storm: { sector: to, movedOnRound: next.round },
      pendingDecisions: next.pendingDecisions.filter((x) => x.kind !== 'stormDial'),
    };
    return applyStormDamage(next, path);
  },

  isPhaseComplete(state): boolean {
    return decision(state) === undefined && state.storm.movedOnRound === state.round;
  },

  advancePhase(state): GameState {
    return { ...state, stormPhase: null, phase: 'spiceBlow' };
  },
};
