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

/**
 * A per-player quantity measured at final scoring. Every metric is derived
 * purely from the finished game state, so endgame conditions are replayable and
 * order-independent.
 *
 * - `influence`      influence on `faction` (requires `faction`).
 * - `controlSpaces`  number of control markers the player holds.
 * - `intrigueCards`  intrigue cards still in the player's hand at scoring.
 * - `alliances`      faction alliance tokens the player holds.
 * - `spice`/`solari`/`water`  that resource on hand.
 * - `troops`         troops on the board (garrison + committed to conflict).
 */
export type EndgameMetric =
  | 'influence'
  | 'controlSpaces'
  | 'intrigueCards'
  | 'alliances'
  | 'spice'
  | 'solari'
  | 'water'
  | 'troops';

/**
 * A data predicate that gates or scales an endgame intrigue card's VP. Real
 * endgame cards rarely score a flat point — they reward a threshold, a per-unit
 * count, or being the leader in some metric. Modeling them as data keeps the
 * scorer generic; an endgame card with no condition scores its flat `gains.vp`.
 *
 * Exactly one scoring shape applies, checked in this order: `mostAmong`
 * (leader-takes-it, ties shared) → `per` (VP once per N units) → `atLeast`
 * (VP if the metric clears a threshold) → unconditional. Every value is VERIFY.
 */
export interface EndgameCondition {
  metric: EndgameMetric;
  /** Required for the `influence` metric: which faction track to read. */
  faction?: ImpFactionId;
  /** Award the card's VP only if the metric is at least this. */
  atLeast?: number;
  /** Award the card's VP once per this many units of the metric (floor division). */
  per?: number;
  /** Award only to the player(s) with the highest metric among all players (ties shared); a value of 0 never scores. */
  mostAmong?: boolean;
}

export interface IntrigueDef {
  id: IntrigueDefId;
  name: string;
  kind: IntrigueKind;
  count: number;
  /** plot: on your turn; combat: during combat (swords etc.); endgame: at scoring. */
  gains?: Gains;
  cost?: Costs;
  /**
   * endgame only: a condition that gates or scales `gains.vp` at final scoring.
   * Omit for a flat, unconditional endgame card.
   */
  endgameCondition?: EndgameCondition;
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
 * - `onAcquireCard`   fires whenever the leader acquires a card (buys from the
 *                     imperium row or reserve, or gains one from a space).
 * - `onCombatWin`     fires when the leader takes first place in a conflict.
 *
 * `onAcquireCard` and `onCombatWin` grant their `params.gains` (like the income
 * hooks); they carry no other params.
 */
export type LeaderPassiveHook =
  | 'onReveal'
  | 'onAgentPlaced'
  | 'combatStrength'
  | 'onRoundStart'
  | 'onAcquireCard'
  | 'onCombatWin';

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
  /**
   * onReveal only: instead of granting gains, let the leader inspect the top of
   * their own deck and keep or discard it (foresight). Raises a `deckPeek`
   * pending decision. VERIFY the trigger against your leader sheet.
   */
  deckPeek?: boolean;
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
  /**
   * Optional owner-supplied portrait: a URL or a path under `/public` (e.g.
   * `/portraits/paul.jpg`). People who own the physical game can point this at
   * their own art and the UI renders it as the leader's face; when absent the UI
   * draws an original generated cameo. No copyrighted art ships in this repo.
   */
  portrait?: string;
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

/** Where a victory point came from — powers the end-game score breakdown. */
export type VpSource =
  | 'influenceLevel'
  | 'alliance'
  | 'conflict'
  | 'control'
  | 'card'
  | 'endgameIntrigue'
  | 'other';

export interface VpLedgerEntry {
  round: number;
  source: VpSource;
  /** Signed: positive for a gain, negative when a VP is lost (e.g. alliance handed off). */
  amount: number;
  /** Original-wording note for the UI. */
  detail: string;
}

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
  /** Append-only record of every VP change and its cause. */
  vpLedger: VpLedgerEntry[];
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

// ---------------------------------------------------------------------------
// Pending decisions — the choice-prompt system
// ---------------------------------------------------------------------------

/**
 * A choice the engine is waiting on before it can continue. Mirrors the classic
 * game's `PendingDecision` pattern: an effect that needs a player choice records
 * a decision instead of silently auto-picking, the engine blocks on it, and the
 * owed player resolves it with an `imp/resolveDecision` action.
 *
 * Decisions are a FIFO queue; only the front decision (owned by its `playerId`)
 * may be resolved at a time. Every deferred effect is self-contained and
 * order-independent, so applying it when resolved yields the same result as
 * applying it inline would have.
 */
export type ImpDecisionKind = 'influence' | 'trash' | 'deckPeek';

export interface ImpPendingDecision {
  id: string;
  playerId: PlayerId;
  kind: ImpDecisionKind;
  /** Original-wording prompt for the UI. */
  prompt: string;
  /** influence: amount to gain on the chosen track. trash: max cards to trash. */
  amount?: number;
  /** influence: tracks the player may choose among (omit = all four). */
  factions?: ImpFactionId[];
  /** trash / deckPeek: the choice may be declined. */
  optional?: boolean;
  /** deckPeek: the top-of-deck card under inspection (visible only to its owner). */
  cardId?: CardId;
}

/**
 * The engine transition to run once the decision queue drains. Player-turn and
 * combat flows can't advance while a choice is owed, so they park their
 * continuation here and it resumes when the last decision is resolved.
 */
export type ImpFlowResume =
  | { kind: 'afterPlayerTurn'; pid: PlayerId }
  | { kind: 'afterCombat' }
  | { kind: 'afterCombatIntrigue'; pid: PlayerId };

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

  /** Choices the engine is blocked on; only the front one may be resolved. */
  pendingDecisions: ImpPendingDecision[];
  /** Transition to run when the decision queue drains (null when not blocked). */
  flowResume: ImpFlowResume | null;
  /** Monotonic counter for deterministic pending-decision ids. */
  decisionSeq: number;

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
    sellSpice?: number; // sell-melange amount (a placement parameter, not a post-effect choice)
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
}

export interface CombatPassAction extends ImpActionBase {
  type: 'imp/combatPass';
}

/** Resolve the front pending decision (choice prompt). */
export interface ResolveDecisionAction extends ImpActionBase {
  type: 'imp/resolveDecision';
  decisionId: string;
  /** influence: the track to gain on. */
  faction?: ImpFactionId;
  /** trash: the card to trash (omit to decline). */
  trashCardId?: CardId;
  /** deckPeek: keep the top card in place, or discard it (omit = keep). */
  discardPeeked?: boolean;
}

export type ImpAction =
  | PlayCardAction
  | RevealAction
  | BuyCardAction
  | EndTurnAction
  | PlayIntrigueAction
  | CombatPassAction
  | ResolveDecisionAction;

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
  extends Omit<
    ImpGameState,
    | 'hidden'
    | 'imperiumDeck'
    | 'intrigueDeck'
    | 'conflictDeck'
    | 'log'
    | 'rng'
    | 'flowResume'
    | 'decisionSeq'
    | 'pendingDecisions'
  > {
  viewerId: PlayerId | 'SPECTATOR';
  /** Pending decisions with the peeked card hidden from everyone but its owner. */
  pendingDecisions: ImpPendingDecision[];
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
