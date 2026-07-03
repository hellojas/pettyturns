/**
 * Core data models for the rules engine.
 *
 * Everything here must be plain-JSON-serializable: no classes, no Dates, no Maps,
 * no functions. GameState is the single source of truth; every action produces a
 * new GameState via the pure reducer in src/game/engine.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export type PlayerId = string; // stable per-seat id, e.g. "p1"
export type FactionId = string; // key into factions config, e.g. "atreides"
export type TerritoryId = string; // key into territories config
export type LeaderId = string; // key into leaders config
export type TreacheryCardId = string; // unique instance id, e.g. "shield#2"
export type TreacheryCardDefId = string; // key into treachery config
export type SpiceCardId = string; // unique instance id in the spice deck
export type GameId = string;
export type DecisionId = string;
export type BattleId = string;

/** Sectors are the 18 pie-slice wedges, numbered 0..17 going counterclockwise. */
export type Sector = number;

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

export const PHASES = [
  'setup',
  'storm',
  'spiceBlow',
  'nexus', // interrupt: only entered when a worm appears
  'bidding',
  'revival',
  'shipmentAndMovement',
  'battle',
  'spiceCollection',
  'mentatPause', // win check + end-of-round bookkeeping
  'finished',
] as const;

export type Phase = (typeof PHASES)[number];

// ---------------------------------------------------------------------------
// Board / territories
// ---------------------------------------------------------------------------

export type TerritoryKind = 'sand' | 'rock' | 'stronghold' | 'polarSink';

/** Static definition (from config), not stored in GameState. */
export interface TerritoryDef {
  id: TerritoryId;
  /** Display name — editable so it can match the owner's physical copy. */
  name: string;
  kind: TerritoryKind;
  /** The sectors this territory spans (a territory may cross several wedges). */
  sectors: Sector[];
  /** Adjacent territories (by id). Symmetric. */
  adjacent: TerritoryId[];
  /**
   * If this territory is a spice blow location, the sector the spice appears in
   * and the number of spice tokens placed per blow (per config).
   */
  spiceBlow?: { sector: Sector; amount: number };
  /** True for the handful of territories that count toward stronghold victory. */
  isVictoryStronghold?: boolean;
  /** Placeholder geometry for the SVG board renderer (refined later). */
  geometry?: { ring: number; label?: string };
}

export interface Stronghold {
  territoryId: TerritoryId;
}

/**
 * Storm position = the sector the storm marker currently occupies.
 * The storm covers exactly one sector; territories are affected in the sectors
 * the storm passes over or sits in.
 */
export interface StormPosition {
  sector: Sector;
  /** Round number of last movement, for the log. */
  movedOnRound: number;
}

/** Forces of one faction inside one sector of one territory. */
export interface UnitStack {
  factionId: FactionId;
  territoryId: TerritoryId;
  sector: Sector;
  /** Normal force tokens. */
  forces: number;
  /** Elite force tokens (e.g. the two factions with special starred forces). */
  specialForces: number;
  /**
   * Whether this stack is flagged as non-combatant "advisor" presence
   * (used by the faction with the coexistence power).
   */
  isAdvisor?: boolean;
}

/** Spice lying on the board. */
export interface SpiceOnBoard {
  territoryId: TerritoryId;
  sector: Sector;
  amount: number;
}

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

/**
 * A machine-readable faction power. Powers are switches the engine consults at
 * exact rule points — they are data, so the engine stays generic and the set is
 * editable in config.
 */
export interface FactionPower {
  id: string;
  /** Original-wording summary (never rulebook prose). */
  summary: string;
  /** Which engine hook consults this power. */
  hook:
    | 'setup'
    | 'storm'
    | 'spiceBlow'
    | 'bidding'
    | 'revival'
    | 'shipment'
    | 'movement'
    | 'battle'
    | 'spiceCollection'
    | 'nexus'
    | 'winCheck'
    | 'karama';
  /** Free-form parameters interpreted by the hook (e.g. { maxDistance: 2 }). */
  params?: Record<string, unknown>;
}

/** Static faction definition from config. */
export interface FactionDef {
  id: FactionId;
  /** Editable display name. */
  name: string;
  color: string; // UI hint
  startingSpice: number;
  /** Reserve forces off-planet at start (normal / special). */
  startingReserves: { forces: number; specialForces: number };
  /** Forces placed on the board at setup. */
  startingForces: Array<{
    territoryId: TerritoryId | 'ANY'; // 'ANY' = player chooses at setup
    sector: Sector | 'ANY';
    forces: number;
    specialForces: number;
  }>;
  /** Leader discs owned by this faction (5 each in the classic set). */
  leaders: LeaderId[];
  freeRevival: number;
  /** Max forces revivable per revival phase (free + paid), per config. */
  maxRevivalPerTurn: number;
  handLimit: number;
  /** Number of traitor cards kept at setup (one faction keeps all four dealt). */
  traitorsKept: number;
  powers: FactionPower[];
}

export interface Leader {
  id: LeaderId;
  factionId: FactionId;
  /** Editable display name. */
  name: string;
  strength: number;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export type TreacheryCategory =
  | 'weapon-projectile'
  | 'weapon-poison'
  | 'weapon-special' // the unique beam weapon
  | 'defense-projectile' // shield
  | 'defense-poison' // poison antidote
  | 'special' // faction-nullifier card, truce card, etc.
  | 'worthless';

export interface TreacheryCardDef {
  id: TreacheryCardDefId;
  /** Editable display name to match the owner's copy. */
  name: string;
  category: TreacheryCategory;
  /** Copies of this card in the deck. */
  count: number;
  /** Machine-readable effect switches consumed by the combat/phase engines. */
  effect?: Record<string, unknown>;
}

/** A concrete card instance (deck has multiple copies of some defs). */
export interface TreacheryCard {
  id: TreacheryCardId;
  defId: TreacheryCardDefId;
}

export type SpiceCardKind = 'territory' | 'worm';

export interface SpiceCard {
  id: SpiceCardId;
  kind: SpiceCardKind;
  /** For territory cards. */
  territoryId?: TerritoryId;
}

export interface TraitorCard {
  leaderId: LeaderId;
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export interface Player {
  id: PlayerId;
  /** Display name of the human. */
  name: string;
  factionId: FactionId;
  /** Seat position 0..17 sector index of the player marker on the rim. */
  seatSector: Sector;
  spice: number;
  /** Off-planet reserves. */
  reserves: { forces: number; specialForces: number };
  /** Dead forces available for revival. */
  tanksForces: { forces: number; specialForces: number };
  /** Leader discs currently alive and usable. */
  leadersAlive: LeaderId[];
  /** Leader discs in the tanks (dead), with face-up/down state for revival rules. */
  leadersDead: Array<{ leaderId: LeaderId; faceUp: boolean }>;
  hasConnected: boolean;
}

/** Per-player hidden info, only ever exposed via getVisibleGameState. */
export interface HiddenPlayerState {
  playerId: PlayerId;
  hand: TreacheryCard[];
  traitors: TraitorCard[];
  /** Traitor options dealt at setup (before keeping). */
  traitorOptions: TraitorCard[];
  /** The coexistence faction's secret turn/faction prediction, if applicable. */
  prediction?: { factionId: FactionId; round: number };
  /** Arbitrary per-faction private flags (e.g. special-leader earned). */
  privateFlags: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Alliances / nexus
// ---------------------------------------------------------------------------

export interface Alliance {
  /** Exactly two factions in the classic game. */
  members: [FactionId, FactionId];
  formedOnRound: number;
}

// ---------------------------------------------------------------------------
// Battle
// ---------------------------------------------------------------------------

export interface BattlePlan {
  playerId: PlayerId;
  leaderId: LeaderId | null; // null only when a cheap-hero style card stands in
  cheapHeroCardId: TreacheryCardId | null;
  /** Number of forces dialed on the wheel. */
  dial: number;
  weaponCardId: TreacheryCardId | null;
  defenseCardId: TreacheryCardId | null;
  /** Spice committed to support forces (advanced-game hook; 0 in basic). */
  spiceSupport: number;
  /** Faction-specific extras (e.g. prescience answer, voice command compliance). */
  extras: Record<string, unknown>;
}

export interface PendingBattle {
  id: BattleId;
  territoryId: TerritoryId;
  /** Aggressor = player whose turn ordering makes them attacker per the rules. */
  aggressor: PlayerId;
  defender: PlayerId;
  /** Submitted plans, hidden until both present. */
  plans: Partial<Record<PlayerId, BattlePlan>>;
  /** Voice / prescience style pre-battle steps that must resolve first. */
  preBattleSteps: Array<{ kind: string; by: PlayerId; resolved: boolean; data?: unknown }>;
  resolved: boolean;
}

export interface BattleResolution {
  battleId: BattleId;
  territoryId: TerritoryId;
  winner: PlayerId | null; // null = mutual annihilation
  loser: PlayerId | null;
  traitorCalled?: { by: PlayerId; leaderId: LeaderId };
  leadersKilled: LeaderId[];
  forcesLost: Record<PlayerId, number>;
  cardsDiscarded: TreacheryCardId[];
  spicePaid: Array<{ from: PlayerId | 'bank'; to: PlayerId | 'bank'; amount: number; reason: string }>;
  detail: string; // original-wording human summary for the log
}

// ---------------------------------------------------------------------------
// Actions & decisions
// ---------------------------------------------------------------------------

/**
 * Every mutation of GameState is a TurnAction dispatched by a player (or by
 * 'SYSTEM' for automatic steps like deck reshuffles that still deserve a log line).
 */
export interface TurnActionBase {
  type: string;
  playerId: PlayerId | 'SYSTEM';
  /** ISO timestamp supplied by the caller (engine stays pure). */
  at?: string;
}

// --- setup phase ---
export interface ChooseFactionAction extends TurnActionBase {
  type: 'setup/chooseFaction';
  factionId: FactionId;
}
export interface KeepTraitorsAction extends TurnActionBase {
  type: 'setup/keepTraitors';
  leaderIds: LeaderId[];
}
export interface PlaceStartingForcesAction extends TurnActionBase {
  type: 'setup/placeStartingForces';
  placements: Array<{ territoryId: TerritoryId; sector: Sector; forces: number; specialForces: number }>;
}
export interface SubmitPredictionAction extends TurnActionBase {
  type: 'setup/submitPrediction';
  factionId: FactionId;
  round: number;
}

// --- storm phase ---
export interface StormDialAction extends TurnActionBase {
  type: 'storm/dial';
  value: number;
}

// --- spice blow / nexus ---
export interface NexusAllianceProposalAction extends TurnActionBase {
  type: 'nexus/propose';
  withFactionId: FactionId;
}
export interface NexusAllianceResponseAction extends TurnActionBase {
  type: 'nexus/respond';
  toFactionId: FactionId;
  accept: boolean;
}
export interface NexusBreakAllianceAction extends TurnActionBase {
  type: 'nexus/break';
}
export interface NexusPassAction extends TurnActionBase {
  type: 'nexus/pass';
}
export interface NexusEndAction extends TurnActionBase {
  type: 'nexus/end';
}

// --- bidding ---
export interface BidAction extends TurnActionBase {
  type: 'bidding/bid';
  amount: number;
}
export interface PassBidAction extends TurnActionBase {
  type: 'bidding/pass';
}

// --- revival ---
export interface ReviveForcesAction extends TurnActionBase {
  type: 'revival/reviveForces';
  forces: number;
  specialForces: number;
}
export interface ReviveLeaderAction extends TurnActionBase {
  type: 'revival/reviveLeader';
  leaderId: LeaderId;
}
export interface SkipRevivalAction extends TurnActionBase {
  type: 'revival/skip';
}

// --- shipment & movement ---
export interface ShipForcesAction extends TurnActionBase {
  type: 'shipment/ship';
  territoryId: TerritoryId;
  sector: Sector;
  forces: number;
  specialForces: number;
  /** Faction-specific shipment modes (e.g. cross-board, board-to-reserves). */
  mode?: 'normal' | 'crossPlanet' | 'toReserves' | 'siteToSite';
  fromTerritoryId?: TerritoryId;
  fromSector?: Sector;
}
export interface SkipShipmentAction extends TurnActionBase {
  type: 'shipment/skip';
}
export interface MoveForcesAction extends TurnActionBase {
  type: 'movement/move';
  from: { territoryId: TerritoryId; sector: Sector };
  to: { territoryId: TerritoryId; sector: Sector };
  forces: number;
  specialForces: number;
}
export interface SkipMovementAction extends TurnActionBase {
  type: 'movement/skip';
}

// --- battle ---
export interface ChooseBattleAction extends TurnActionBase {
  type: 'battle/chooseBattle';
  battleId: BattleId;
}
export interface SubmitBattlePlanAction extends TurnActionBase {
  type: 'battle/submitPlan';
  battleId: BattleId;
  plan: Omit<BattlePlan, 'playerId'>;
}
export interface CallTraitorAction extends TurnActionBase {
  type: 'battle/callTraitor';
  battleId: BattleId;
  call: boolean;
}

// --- generic / system ---
export interface SystemAdvanceAction extends TurnActionBase {
  type: 'system/advance';
}

export type TurnAction =
  | ChooseFactionAction
  | KeepTraitorsAction
  | PlaceStartingForcesAction
  | SubmitPredictionAction
  | StormDialAction
  | NexusAllianceProposalAction
  | NexusAllianceResponseAction
  | NexusBreakAllianceAction
  | NexusPassAction
  | NexusEndAction
  | BidAction
  | PassBidAction
  | ReviveForcesAction
  | ReviveLeaderAction
  | SkipRevivalAction
  | ShipForcesAction
  | SkipShipmentAction
  | MoveForcesAction
  | SkipMovementAction
  | ChooseBattleAction
  | SubmitBattlePlanAction
  | CallTraitorAction
  | SystemAdvanceAction;

/** What a given player may do right now (drives the ActionPanel). */
export interface AllowedAction {
  type: TurnAction['type'];
  /** Original-wording label for the UI. */
  label: string;
  /** Optional parameter hints (legal territories, max bid, etc.). */
  params?: Record<string, unknown>;
}

/**
 * A simultaneous / out-of-order commitment the game is waiting on
 * (battle plans, storm dials, traitor keeps, predictions...).
 */
export interface PendingDecision {
  id: DecisionId;
  kind:
    | 'stormDial'
    | 'traitorSelection'
    | 'prediction'
    | 'battlePlan'
    | 'traitorCall'
    | 'startingPlacement'
    | 'factionChoice';
  waitingFor: PlayerId[];
  /** Committed payloads, hidden from other players until reveal. */
  committed: Partial<Record<PlayerId, unknown>>;
  /** Context (battleId, etc.). */
  context?: Record<string, unknown>;
  createdOnRound: number;
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

export type LogVisibility =
  | { scope: 'public' }
  | { scope: 'private'; playerIds: PlayerId[] };

export interface GameLogEntry {
  seq: number;
  round: number;
  phase: Phase;
  /** Machine-readable event key, e.g. 'storm.moved', 'battle.resolved'. */
  event: string;
  /** Original-wording human text. */
  text: string;
  data?: Record<string, unknown>;
  visibility: LogVisibility;
  at?: string;
}

// ---------------------------------------------------------------------------
// RNG
// ---------------------------------------------------------------------------

/** Seeded PRNG cursor stored in GameState — advancing it is a state change. */
export interface RngState {
  seed: number;
  /** Number of draws taken so far (cursor). */
  cursor: number;
}

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------

export interface Decks {
  treacheryDraw: TreacheryCardId[];
  treacheryDiscard: TreacheryCardId[];
  /** Two spice discard piles exist in editions with the double blow variant; A only for basic. */
  spiceDraw: SpiceCardId[];
  spiceDiscardA: SpiceCardId[];
  spiceDiscardB: SpiceCardId[];
  /** All card instances by id (identity lookup — contents are hidden by visibility layer). */
  treacheryById: Record<TreacheryCardId, TreacheryCard>;
  spiceById: Record<SpiceCardId, SpiceCard>;
}

// ---------------------------------------------------------------------------
// Phase-specific transient state
// ---------------------------------------------------------------------------

export interface StormPhaseState {
  /** Players who must dial this storm phase. */
  dialers: PlayerId[];
  decisionId?: DecisionId;
}

export interface SpiceBlowPhaseState {
  resolved: boolean;
  /** A worm surfaced this phase → nexus follows the blow. */
  wormAppeared: boolean;
}

export interface RevivalPhaseState {
  /** Storm-order queue of players who have not finished their revivals. */
  queue: PlayerId[];
  /** Forces already revived this phase, per player (free + paid). */
  revivedCount: Record<PlayerId, number>;
  /** Players who already revived a leader this phase. */
  leaderRevived: PlayerId[];
}

export interface BiddingPhaseState {
  /** Card instances up for auction this round (count = players eligible to buy). */
  cardsOnAuction: TreacheryCardId[];
  currentCardIndex: number;
  currentBid: { playerId: PlayerId; amount: number } | null;
  /** Next player to act in the bidding rotation. */
  turn: PlayerId | null;
  passed: PlayerId[];
  /** First bidder rotates each card per the rules. */
  firstBidderIndex: number;
}

export interface ShipmentMovementPhaseState {
  /** Storm-order queue of players still to take their ship+move turn. */
  queue: PlayerId[];
  current: PlayerId | null;
  /** Sub-step for the current player. */
  step: 'ship' | 'move' | null;
}

export interface BattlePhaseState {
  battles: PendingBattle[];
  /** Battle currently being fought (aggressor picks order). */
  activeBattleId: BattleId | null;
  resolutions: BattleResolution[];
}

export interface NexusPhaseState {
  /** Cause of this nexus, for the log. */
  cause: 'worm';
  /** Factions that still get to negotiate. */
  open: boolean;
  proposals: Array<{ from: FactionId; to: FactionId }>;
  /** Set while a worm interrupt is pending so spice blow resumes correctly. */
  resumeSpiceBlow: boolean;
}

// ---------------------------------------------------------------------------
// GameState
// ---------------------------------------------------------------------------

export interface GameSetupState {
  /** Seats that have chosen factions. */
  factionChoices: Partial<Record<PlayerId, FactionId>>;
  traitorsDealt: boolean;
  placementsDone: PlayerId[];
  predictionsDone: PlayerId[];
  complete: boolean;
}

export interface VictoryResult {
  winners: PlayerId[];
  kind: 'stronghold' | 'alliance' | 'prediction' | 'special-fremen' | 'special-guild' | 'default';
  round: number;
  detail: string;
}

export interface GameState {
  gameId: GameId;
  /** Engine schema version for forward-compatible persistence. */
  schemaVersion: 1;
  createdAt: string;
  /** Round counter, 1-based. The classic game ends after the configured max round. */
  round: number;
  maxRounds: number;
  phase: Phase;
  /** Which phase to return to after a nexus interrupt. */
  interruptedPhase: Phase | null;

  players: Record<PlayerId, Player>;
  /** Seat order clockwise; storm order is derived from seatSector vs storm. */
  playerOrder: PlayerId[];
  hidden: Record<PlayerId, HiddenPlayerState>;

  storm: StormPosition;
  /** Board occupancy: list of stacks (sparse). */
  stacks: UnitStack[];
  spiceOnBoard: SpiceOnBoard[];

  decks: Decks;
  alliances: Alliance[];

  setup: GameSetupState;
  stormPhase: StormPhaseState | null;
  spiceBlowPhase: SpiceBlowPhaseState | null;
  revivalPhase: RevivalPhaseState | null;
  biddingPhase: BiddingPhaseState | null;
  shipmentMovementPhase: ShipmentMovementPhaseState | null;
  battlePhase: BattlePhaseState | null;
  nexusPhase: NexusPhaseState | null;

  pendingDecisions: PendingDecision[];
  rng: RngState;
  log: GameLogEntry[];
  victory: VictoryResult | null;
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

/**
 * What one viewer is allowed to see. Same shape as GameState except hidden
 * zones are redacted to counts / opaque placeholders for other players.
 */
export interface PublicGameState
  extends Omit<GameState, 'hidden' | 'decks' | 'pendingDecisions' | 'log'> {
  viewerId: PlayerId | 'SPECTATOR';
  /** Own hidden state in full; others reduced to counts. */
  hidden: {
    self: HiddenPlayerState | null;
    others: Record<PlayerId, { handCount: number; traitorCount: number; hasPrediction: boolean }>;
  };
  decks: {
    treacheryDrawCount: number;
    treacheryDiscard: TreacheryCardId[]; // discards are public
    treacheryById: Record<TreacheryCardId, TreacheryCard>; // only revealed instances
    spiceDrawCount: number;
    spiceDiscardA: SpiceCardId[];
    spiceDiscardB: SpiceCardId[];
    spiceById: Record<SpiceCardId, SpiceCard>;
  };
  pendingDecisions: Array<
    Omit<PendingDecision, 'committed'> & {
      /** Only whether each player has committed, never the payload. */
      committedBy: PlayerId[];
      /** Own committed payload is visible to self. */
      ownCommitment?: unknown;
    }
  >;
  log: GameLogEntry[]; // filtered by visibility
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export const ok = (): ValidationResult => ({ ok: true });
export const fail = (code: string, message: string): ValidationResult => ({
  ok: false,
  code,
  message,
});
