import { shuffle } from '../../game/engine/rng';
import { IMP_CONSTANTS } from '../data/constants';
import { IMP_CARD_DEFS, IMPERIUM_DECK_DEFS, STARTING_DECK } from '../data/cards';
import { IMP_CONFLICT_LIST } from '../data/conflicts';
import { IMP_INTRIGUE_LIST } from '../data/intrigue';
import { IMP_LEADERS } from '../data/leaders';
import type {
  CardId,
  ImpFactionId,
  ImpGameState,
  ImpHidden,
  ImpPlayer,
  ImpRngState,
  LeaderId,
  PlayerId,
} from '../types';
import { impLog } from './log';
import { drawCards } from './effects';

export interface ImpSeat {
  playerId: PlayerId;
  name: string;
  leaderId: LeaderId;
}

export interface NewImperiumGameOptions {
  gameId: string;
  seed: number;
  createdAt: string;
  seats: ImpSeat[]; // 2–4, unique leaders
}

const ZERO_INFLUENCE: Record<ImpFactionId, number> = {
  emperor: 0,
  spacingGuild: 0,
  beneGesserit: 0,
  fremen: 0,
};

/** Deterministically create a game, deal decks and opening hands, reveal conflict 1. */
export function createImperiumGame(options: NewImperiumGameOptions): ImpGameState {
  const { seats } = options;
  if (seats.length < IMP_CONSTANTS.minPlayers || seats.length > IMP_CONSTANTS.maxPlayers)
    throw new Error(`${IMP_CONSTANTS.minPlayers}–${IMP_CONSTANTS.maxPlayers} players required`);
  const leaderIds = seats.map((s) => s.leaderId);
  if (new Set(leaderIds).size !== leaderIds.length) throw new Error('leaders must be unique');
  for (const l of leaderIds) if (!IMP_LEADERS[l]) throw new Error(`unknown leader '${l}'`);

  let rng: ImpRngState = { seed: options.seed, cursor: 0 };
  const cardsById: ImpGameState['cardsById'] = {};

  // imperium deck instances
  let imperiumIds: CardId[] = [];
  for (const def of IMPERIUM_DECK_DEFS) {
    for (let i = 0; i < def.count; i++) {
      const id = `${def.id}#${i + 1}`;
      cardsById[id] = { id, defId: def.id };
      imperiumIds.push(id);
    }
  }
  const impShuffle = shuffle(rng, imperiumIds);
  rng = impShuffle.rng;
  let imperiumDeck = impShuffle.items;
  const imperiumRow = imperiumDeck.slice(0, IMP_CONSTANTS.imperiumRowSize);
  imperiumDeck = imperiumDeck.slice(IMP_CONSTANTS.imperiumRowSize);

  // intrigue deck instances
  const intrigueById: ImpGameState['intrigueById'] = {};
  let intrigueIds: string[] = [];
  for (const def of IMP_INTRIGUE_LIST) {
    for (let i = 0; i < def.count; i++) {
      const id = `${def.id}#${i + 1}`;
      intrigueById[id] = { id, defId: def.id };
      intrigueIds.push(id);
    }
  }
  const intShuffle = shuffle(rng, intrigueIds);
  rng = intShuffle.rng;

  // conflict deck: sample per tier mix, tier 1 on top, then 2s, then 3s (VERIFY)
  const byTier = (tier: 1 | 2 | 3) => IMP_CONFLICT_LIST.filter((c) => c.tier === tier).map((c) => c.id);
  const pick = (ids: string[], n: number): string[] => {
    const s = shuffle(rng, ids);
    rng = s.rng;
    return s.items.slice(0, n);
  };
  const conflictDeck = [
    ...pick(byTier(1), IMP_CONSTANTS.conflictMix.tier1),
    ...pick(byTier(2), IMP_CONSTANTS.conflictMix.tier2),
    ...pick(byTier(3), IMP_CONSTANTS.conflictMix.tier3),
  ];

  // players + starting decks
  const players: Record<PlayerId, ImpPlayer> = {};
  const hidden: Record<PlayerId, ImpHidden> = {};
  for (const seat of seats) {
    players[seat.playerId] = {
      id: seat.playerId,
      name: seat.name,
      leaderId: seat.leaderId,
      spice: IMP_CONSTANTS.startingSpice,
      solari: IMP_CONSTANTS.startingSolari,
      water: IMP_CONSTANTS.startingWater,
      garrison: IMP_CONSTANTS.startingGarrison,
      supply: IMP_CONSTANTS.troopSupply - IMP_CONSTANTS.startingGarrison,
      inConflict: 0,
      agentsTotal: IMP_CONSTANTS.startingAgents,
      agentsLeft: IMP_CONSTANTS.startingAgents,
      hasMentat: false,
      vp: 0,
      influence: { ...ZERO_INFLUENCE },
      hasCouncilSeat: false,
      hasSwordmaster: false,
      controls: [],
      revealed: false,
      turnDone: false,
      persuasion: 0,
      swords: 0,
    };

    let deckIds: CardId[] = [];
    for (const { defId, copies } of STARTING_DECK) {
      if (!IMP_CARD_DEFS[defId]) throw new Error(`starting deck references unknown card '${defId}'`);
      for (let i = 0; i < copies; i++) {
        const id = `${defId}@${seat.playerId}#${i + 1}`;
        cardsById[id] = { id, defId };
        deckIds.push(id);
      }
    }
    const deckShuffle = shuffle(rng, deckIds);
    rng = deckShuffle.rng;
    hidden[seat.playerId] = {
      playerId: seat.playerId,
      deck: deckShuffle.items,
      hand: [],
      discard: [],
      inPlay: [],
      revealedCards: [],
      trashed: [],
      intrigue: [],
    };
  }

  let state: ImpGameState = {
    gameId: options.gameId,
    schemaVersion: 1,
    createdAt: options.createdAt,
    round: 1,
    maxRounds: Math.min(IMP_CONSTANTS.maxRounds, conflictDeck.length),
    phase: 'playerTurns',
    players,
    playerOrder: seats.map((s) => s.playerId),
    firstPlayer: seats[0].playerId,
    turn: seats[0].playerId,
    hidden,
    cardsById,
    imperiumDeck,
    imperiumRow,
    intrigueById,
    intrigueDeck: intShuffle.items,
    intrigueDiscard: [],
    conflictDeck: conflictDeck.slice(1),
    currentConflict: conflictDeck[0] ?? null,
    combatPassed: [],
    occupied: {},
    makerBonus: {},
    alliances: {},
    controlledBy: {},
    pendingDecisions: [],
    flowResume: null,
    decisionSeq: 0,
    rng,
    log: [],
    winner: null,
    finalStandings: null,
  };

  state = impLog(state, {
    event: 'game.created',
    text: `Game created with ${seats.length} players.`,
    data: { seats: seats.map((s) => ({ playerId: s.playerId, leaderId: s.leaderId })) },
    at: options.createdAt,
  });
  state = impLog(state, {
    event: 'round.conflict',
    text: `Round 1 conflict revealed.`,
    data: { conflictId: state.currentConflict },
  });

  // opening hands
  for (const seat of seats) {
    state = drawCards(state, seat.playerId, IMP_CONSTANTS.handSize);
  }
  return state;
}
