/**
 * Data models for the deck-building / worker-placement game (Imperium).
 *
 * Same engine contract as the classic game: plain-JSON GameState, pure
 * reducer, seeded RNG cursor in state, structured log, visibility filtering.
 */

export type PlayerId = string;
export type LeaderId = string;
export type CardDefId = string;
export type CardId = string; // instance id: `${defId}#${n}`
export type IntrigueDefId = string;
export type IntrigueId = string;
export type ConflictId = string;
export type SpaceId = string;

export type ImpFactionId = 'emperor' | 'spacingGuild' | 'beneGesserit' | 'fremen';
export const IMP_FACTIONS: ImpFactionId[] = ['emperor', 'spacingGuild', 'beneGesserit', 'fremen'];

/** Agent icons: a card must show the icon of the space its agent goes to. */
export type AgentIcon = ImpFactionId | 'landsraad' | 'city' | 'spiceTrade';

// ---------------------------------------------------------------------------
// Effects DSL — all card/space/reward effects are data interpreted by the engine
// ---------------------------------------------------------------------------

export interface Gains {
  spice?: number;
  solari?: number;
  water?: number;
  /** Troops recruited to the garrison. */
  troops?: number;
  drawCards?: number;
  intrigueCards?: number;
  /** Influence on specific tracks. */
  influence?: Partial<Record<ImpFactionId, number>>;
  /** Influence on one track of the player's choice. */
  anyInfluence?: number;
  vp?: number;
  persuasion?: number; // reveal only
  swords?: number; // reveal only
  /** May trash up to N of your cards (hand or discard). */
  trashCards?: number;
  /** Acquire a specific reserve card for free (e.g. the foldspace space). */
  acquireReserveCard?: CardDefId;
  /** Take a control marker for a control space (conflict rewards). */
  control?: SpaceId;
  /** Steal one intrigue card from each opponent holding at least N. */
  stealIntrigueAt?: number;
}

export interface Costs {
  spice?: number;
  solari?: number;
  water?: number;
  /** Remove troops from your garrison. */
  troops?: number;
  /** Requires influence level (does not spend it). */
  influenceRequired?: { faction: ImpFactionId; min: number };
}

// ---------------------------------------------------------------------------
// Static defs (config)
// ---------------------------------------------------------------------------

export type SpaceGroup =
  | ImpFactionId // faction rows (visiting grants influence)
  | 'landsraad'
  | 'choam'
  | 'city'
  | 'desert';

export interface BoardSpaceDef {
  id: SpaceId;
  name: string;
  group: SpaceGroup;
  /** Icon a played card must show to send an agent here. */
  icon: AgentIcon;
  cost?: Costs;
  gains?: Gains;
  /** Influence granted by visiting (faction spaces). */
  influenceGain?: ImpFactionId;
  /** Agents here may deploy troops to the conflict. */
  combat?: boolean;
  /** Desert space that accumulates bonus spice in the makers phase. */
  maker?: boolean;
  /** Control space: its controller collects this at each round start. */
  controlBonus?: Gains;
  /** Engine special-cases: 'mentat' | 'highCouncil' | 'swordmaster' | 'sellMelange'. */
  special?: string;
}

export interface ImpCardDef {
  id: CardDefId;
  name: string;
  /** Persuasion cost in the imperium row (0 = not purchasable / starting card). */
  cost: number;
  /** Copies in the imperium deck (0 for starting/reserve cards). */
  count: number;
  icons: AgentIcon[];
  /** Applied when the card is played on an agent turn. */
  agentGains?: Gains;
  agentCost?: Costs;
  /** Applied during the reveal turn. */
  revealGains?: Gains;
  /** Applied once when acquired. */
  acquireGains?: Gains;
  /** This card trashes itself after its agent effect resolves. */
  trashAfterAgent?: boolean;
  /** Plays the leader's signet ability as its agent effect. */
  signet?: boolean;
  /** Deck source. */
  source: 'starting' | 'reserve' | 'imperium';
}

export type IntrigueKind = 'plot' | 'combat' | 'endgame';

export interface IntrigueDef {
  id: IntrigueDefId;
  name: string;
  kind: IntrigueKind;
  count: number;
  /** plot: on your turn; combat: during combat (swords etc.); endgame: at scoring. */
  gains?: Gains;
  cost?: Costs;
}

export interface ConflictReward {
  place: 1 | 2 | 3;
  gains: Gains;
}

export interface ConflictDef {
  id: ConflictId;
  name: string;
  tier: 1 | 2 | 3;
  rewards: ConflictReward[];
}

/**
 * Which engine hook consults a leader passive. Mirrors the classic game's
 * data-driven faction powers: each passive is a machine-readable switch fired
 * at exactly one rule point, so the engine stays generic and the set is
 * editable in config.
 *
 * - `onReveal`        fires during a player's reveal turn (after reveal gains).
 * - `onAgentPlaced`   fires when the leader places an agent (optionally on a
 *                     given space group / space).
 * - `combatStrength`  contributes flat strength while the leader has troops in
 *                     the current conflict.
 * - `onRoundStart`    fires at recall, once per new round (control-bonus style
 *                     passive income).
 */
export type LeaderPassiveHook = 'onReveal' | 'onAgentPlaced' | 'combatStrength' | 'onRoundStart';

export interface LeaderPassiveParams {
  /** Gains granted by the hook (onReveal / onAgentPlaced / onRoundStart). */
  gains?: Gains;
  /** onAgentPlaced only: restrict to this space group (omit = any space). */
  group?: SpaceGroup;
  /** onAgentPlaced only: restrict to this specific space (omit = any space). */
  spaceId?: SpaceId;
  /** combatStrength only: flat strength added while committed to the conflict. */
  strength?: number;
  /** onReveal only: require at least this many cards revealed to fire. */
  minRevealedCards?: number;
}

export interface LeaderPassive {
  id: string;
  /** Original-wording summary (never rulebook prose). */
  summary: string;
  hook: LeaderPassiveHook;
  /** Parameters interpreted by the hook. Every value is VERIFY. */
  params?: LeaderPassiveParams;
}

export interface ImpLeaderDef {
  id: LeaderId;
  name: string;
  /** Signet ring ability as data (played via the signet starting card). */
  signetGains: Gains;
  signetCost?: Costs;
  /**
   * Machine-enforced passive abilities, consumed at named engine hooks. Every
   * value is VERIFY; original-wording summaries only.
   */
  passives?: LeaderPassive[];
  /**
   * Original-wording note for any passive not yet machine-enforced (e.g. one
   * that needs a player choice prompt). Kept alongside `passives`.
   */
  passiveNote?: string;
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

export interface ImpPlayer {
  id: PlayerId;
  name: string;
  leaderId: LeaderId;
  spice: number;
  solari: number;
  water: number;
  /** Troops in the garrison (ready to deploy). */
  garrison: number;
  /** Troops still in the supply (recruitable). */
  supply: number;
  /** Troops committed to the current conflict. */
  inConflict: number;
  agentsTotal: number;
  agentsLeft: number;
  hasMentat: boolean; // holds the shared mentat agent this round
  vp: number;
  influence: Record<ImpFactionId, number>;
  hasCouncilSeat: boolean;
  hasSwordmaster: boolean;
  /** Control markers held (control spaces). */
  controls: SpaceId[];
  /** Reveal-turn tallies. */
  revealed: boolean;
  turnDone: boolean; // finished buying after reveal
  persuasion: number;
  swords: number;
}

export interface ImpHidden {
  playerId: PlayerId;
  deck: CardId[]; // top = index 0
  hand: CardId[];
  discard: CardId[];
  inPlay: CardId[]; // agent-played this round
  revealedCards: CardId[];
  trashed: CardId[];
  intrigue: IntrigueId[];
}

export type ImpPhase = 'playerTurns' | 'combat' | 'finished';

export interface ImpLogEntry {
  seq: number;
  round: number;
  phase: ImpPhase;
  event: string;
  text: string;
  data?: Record<string, unknown>;
  visibility: { scope: 'public' } | { scope: 'private'; playerIds: PlayerId[] };
  at?: string;
}

export interface ImpRngState {
  seed: number;
  cursor: number;
}

export interface ImpGameState {
  gameId: string;
  schemaVersion: 1;
  createdAt: string;
  round: number;
  maxRounds: number;
  phase: ImpPhase;

  players: Record<PlayerId, ImpPlayer>;
  /** Seat order; first player rotates each round. */
  playerOrder: PlayerId[];
  firstPlayer: PlayerId;
  /** Whose turn it is during playerTurns (skips finished players). */
  turn: PlayerId | null;

  hidden: Record<PlayerId, ImpHidden>;

  /** All card instances by id. */
  cardsById: Record<CardId, { id: CardId; defId: CardDefId }>;
  imperiumDeck: CardId[];
  imperiumRow: CardId[];
  intrigueById: Record<IntrigueId, { id: IntrigueId; defId: IntrigueDefId }>;
  intrigueDeck: IntrigueId[];
  intrigueDiscard: IntrigueId[];

  conflictDeck: ConflictId[]; // top = index 0; current conflict = currentConflict
  currentConflict: ConflictId | null;
  /** Combat sub-state: players who passed consecutively. */
  combatPassed: PlayerId[];

  /** Agent occupancy for the round. */
  occupied: Partial<Record<SpaceId, PlayerId>>;
  /** Accumulated bonus spice on maker spaces. */
  makerBonus: Partial<Record<SpaceId, number>>;
  /** Alliance token holder per faction track. */
  alliances: Partial<Record<ImpFactionId, PlayerId>>;
  /** Controller of each control space. */
  controlledBy: Partial<Record<SpaceId, PlayerId>>;

  rng: ImpRngState;
  log: ImpLogEntry[];
  winner: PlayerId | null;
  finalStandings: Array<{ playerId: PlayerId; vp: number }> | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ImpActionBase {
  playerId: PlayerId;
  at?: string;
}

export interface PlayCardAction extends ImpActionBase {
  type: 'imp/playCard';
  cardId: CardId;
  spaceId: SpaceId;
  /** Troops moved from garrison (plus any just recruited) into the conflict. */
  deploy?: number;
  choices?: {
    sellSpice?: number; // sell-melange amount
    influenceFaction?: ImpFactionId; // for anyInfluence gains
    trashCardId?: CardId; // for trashCards gains
  };
}

export interface RevealAction extends ImpActionBase {
  type: 'imp/reveal';
}

export interface BuyCardAction extends ImpActionBase {
  type: 'imp/buyCard';
  cardId: CardId | CardDefId; // row instance id, or a reserve def id
}

export interface EndTurnAction extends ImpActionBase {
  type: 'imp/endTurn';
}

export interface PlayIntrigueAction extends ImpActionBase {
  type: 'imp/playIntrigue';
  intrigueId: IntrigueId;
  choices?: { influenceFaction?: ImpFactionId };
}

export interface CombatPassAction extends ImpActionBase {
  type: 'imp/combatPass';
}

export type ImpAction =
  | PlayCardAction
  | RevealAction
  | BuyCardAction
  | EndTurnAction
  | PlayIntrigueAction
  | CombatPassAction;

export interface ImpAllowedAction {
  type: ImpAction['type'];
  label: string;
  params?: Record<string, unknown>;
}

export type ImpValidation = { ok: true } | { ok: false; code: string; message: string };
export const impOk = (): ImpValidation => ({ ok: true });
export const impFail = (code: string, message: string): ImpValidation => ({ ok: false, code, message });

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

export interface ImpVisibleState
  extends Omit<ImpGameState, 'hidden' | 'imperiumDeck' | 'intrigueDeck' | 'conflictDeck' | 'log' | 'rng'> {
  viewerId: PlayerId | 'SPECTATOR';
  hidden: {
    self:
      | (Omit<ImpHidden, 'deck'> & { deckCount: number })
      | null;
    others: Record<
      PlayerId,
      { handCount: number; deckCount: number; discard: CardId[]; inPlay: CardId[]; revealedCards: CardId[]; intrigueCount: number }
    >;
  };
  imperiumDeckCount: number;
  intrigueDeckCount: number;
  conflictDeckCount: number;
  rng: ImpRngState; // seed zeroed
  log: ImpLogEntry[];
}
