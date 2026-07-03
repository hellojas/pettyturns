import { GAME_CONSTANTS } from '../data/constants';
import { FACTIONS } from '../data/factions';
import { LEADERS } from '../data/leaders';
import { SPICE_DECK_CONFIG } from '../data/spiceDeck';
import { TREACHERY_CARD_DEFS } from '../data/treacheryCards';
import type {
  Decks,
  FactionId,
  GameId,
  GameState,
  HiddenPlayerState,
  Player,
  PlayerId,
  RngState,
  SpiceCard,
  TraitorCard,
  TreacheryCard,
} from '../types';
import { appendLog } from './log';
import { shuffle } from './rng';

export interface NewGameSeat {
  playerId: PlayerId;
  name: string;
  factionId: FactionId;
}

export interface NewGameOptions {
  gameId: GameId;
  seed: number;
  createdAt: string; // supplied by caller — engine stays pure
  seats: NewGameSeat[]; // 2..6, factions unique
  maxRounds?: number;
}

function buildTreacheryDeck(rng: RngState): { decks: Pick<Decks, 'treacheryDraw' | 'treacheryById'>; rng: RngState } {
  const byId: Record<string, TreacheryCard> = {};
  const ids: string[] = [];
  for (const def of Object.values(TREACHERY_CARD_DEFS)) {
    for (let i = 0; i < def.count; i++) {
      const id = `${def.id}#${i + 1}`;
      byId[id] = { id, defId: def.id };
      ids.push(id);
    }
  }
  const shuffled = shuffle(rng, ids);
  return { decks: { treacheryDraw: shuffled.items, treacheryById: byId }, rng: shuffled.rng };
}

function buildSpiceDeck(rng: RngState): { draw: string[]; byId: Record<string, SpiceCard>; rng: RngState } {
  const byId: Record<string, SpiceCard> = {};
  const ids: string[] = [];
  for (const territoryId of SPICE_DECK_CONFIG.territoryCards) {
    const id = `spice:${territoryId}`;
    byId[id] = { id, kind: 'territory', territoryId };
    ids.push(id);
  }
  for (let i = 0; i < SPICE_DECK_CONFIG.wormCount; i++) {
    const id = `worm#${i + 1}`;
    byId[id] = { id, kind: 'worm' };
    ids.push(id);
  }
  const shuffled = shuffle(rng, ids);
  return { draw: shuffled.items, byId, rng: shuffled.rng };
}

/** Evenly space player markers around the rim (players pick exact seats later if desired). */
function assignSeatSectors(count: number): number[] {
  const n = GAME_CONSTANTS.sectorCount;
  const step = Math.floor(n / count);
  return Array.from({ length: count }, (_, i) => (i * step) % n);
}

/**
 * Create a fully-initialized GameState ready for the setup phase's remaining
 * interactive steps (traitor keeps, variable placements, prediction).
 *
 * Deterministic: same options ⇒ identical state.
 */
export function createGame(options: NewGameOptions): GameState {
  const { seats } = options;
  if (seats.length < 2 || seats.length > 6) throw new Error('2–6 players required');
  const factionIds = seats.map((s) => s.factionId);
  if (new Set(factionIds).size !== factionIds.length) throw new Error('factions must be unique');
  for (const f of factionIds) if (!FACTIONS[f]) throw new Error(`unknown faction '${f}'`);

  let rng: RngState = { seed: options.seed, cursor: 0 };

  // decks
  const treachery = buildTreacheryDeck(rng);
  rng = treachery.rng;
  const spice = buildSpiceDeck(rng);
  rng = spice.rng;

  // seats
  const seatSectors = assignSeatSectors(seats.length);
  const players: Record<PlayerId, Player> = {};
  const hidden: Record<PlayerId, HiddenPlayerState> = {};
  let treacheryDraw = treachery.decks.treacheryDraw.slice();

  // traitor deal: shuffle every leader of factions in play, deal 4 to each seat
  const allLeaderIds = factionIds.flatMap((f) => FACTIONS[f].leaders);
  const traitorShuffle = shuffle(rng, allLeaderIds);
  rng = traitorShuffle.rng;
  let traitorPool = traitorShuffle.items.slice();

  seats.forEach((seat, i) => {
    const def = FACTIONS[seat.factionId];

    // starting fixed placements from config (entries with forces > 0 only)
    players[seat.playerId] = {
      id: seat.playerId,
      name: seat.name,
      factionId: seat.factionId,
      seatSector: seatSectors[i],
      spice: def.startingSpice,
      reserves: { ...def.startingReserves },
      tanksForces: { forces: 0, specialForces: 0 },
      leadersAlive: [...def.leaders],
      leadersDead: [],
      hasConnected: false,
    };

    // starting treachery card(s)
    const hand: TreacheryCard[] = [];
    for (let c = 0; c < GAME_CONSTANTS.startingTreacheryCards; c++) {
      const cardId = treacheryDraw.shift();
      if (!cardId) throw new Error('treachery deck exhausted during setup');
      hand.push(treachery.decks.treacheryById[cardId]);
    }

    const traitorOptions: TraitorCard[] = traitorPool
      .splice(0, GAME_CONSTANTS.traitorsDealtPerPlayer)
      .map((leaderId) => ({ leaderId }));

    hidden[seat.playerId] = {
      playerId: seat.playerId,
      hand,
      traitors: def.traitorsKept >= GAME_CONSTANTS.traitorsDealtPerPlayer ? [...traitorOptions] : [],
      traitorOptions,
      privateFlags: {},
    };
  });

  // fixed starting forces on the board
  let stacks: GameState['stacks'] = [];
  for (const seat of seats) {
    const def = FACTIONS[seat.factionId];
    for (const sf of def.startingForces) {
      if (sf.forces + sf.specialForces <= 0) continue; // variable placements happen in setup phase
      if (sf.territoryId === 'ANY' || sf.sector === 'ANY') continue;
      stacks.push({
        factionId: seat.factionId,
        territoryId: sf.territoryId,
        sector: sf.sector as number,
        forces: sf.forces,
        specialForces: sf.specialForces,
      });
    }
  }

  const decks: Decks = {
    treacheryDraw,
    treacheryDiscard: [],
    treacheryById: treachery.decks.treacheryById,
    spiceDraw: spice.draw,
    spiceDiscardA: [],
    spiceDiscardB: [],
    spiceById: spice.byId,
  };

  let state: GameState = {
    gameId: options.gameId,
    schemaVersion: 1,
    createdAt: options.createdAt,
    round: 1,
    maxRounds: options.maxRounds ?? GAME_CONSTANTS.maxRounds,
    phase: 'setup',
    interruptedPhase: null,
    players,
    playerOrder: seats.map((s) => s.playerId),
    hidden,
    storm: { sector: GAME_CONSTANTS.stormStartSector, movedOnRound: 0 },
    stacks,
    spiceOnBoard: [],
    decks,
    alliances: [],
    setup: {
      factionChoices: Object.fromEntries(seats.map((s) => [s.playerId, s.factionId])),
      traitorsDealt: true,
      placementsDone: [],
      predictionsDone: [],
      complete: false,
    },
    stormPhase: null,
    spiceBlowPhase: null,
    revivalPhase: null,
    biddingPhase: null,
    shipmentMovementPhase: null,
    battlePhase: null,
    nexusPhase: null,
    pendingDecisions: [],
    rng,
    log: [],
    victory: null,
  };

  state = appendLog(state, {
    event: 'game.created',
    text: `Game created with ${seats.length} players.`,
    data: { seats: seats.map((s) => ({ playerId: s.playerId, factionId: s.factionId })) },
    at: options.createdAt,
  });

  // pending interactive setup decisions
  const traitorChoosers = seats
    .filter((s) => FACTIONS[s.factionId].traitorsKept < GAME_CONSTANTS.traitorsDealtPerPlayer)
    .map((s) => s.playerId);
  if (traitorChoosers.length > 0) {
    state = {
      ...state,
      pendingDecisions: [
        ...state.pendingDecisions,
        {
          id: 'setup:traitors',
          kind: 'traitorSelection',
          waitingFor: traitorChoosers,
          committed: {},
          createdOnRound: 1,
        },
      ],
    };
  }
  const predictor = seats.find((s) =>
    FACTIONS[s.factionId].powers.some((p) => p.id === 'prediction'),
  );
  if (predictor) {
    state = {
      ...state,
      pendingDecisions: [
        ...state.pendingDecisions,
        {
          id: 'setup:prediction',
          kind: 'prediction',
          waitingFor: [predictor.playerId],
          committed: {},
          createdOnRound: 1,
        },
      ],
    };
  }

  return state;
}
