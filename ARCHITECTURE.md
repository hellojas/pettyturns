# Architecture Plan

A private, browser-based, async-multiplayer implementation of a classic 2–6 player
desert-planet conflict board game, built as an **exact rules engine** for private play
among people who own the physical game.

> **Content policy for this repo:** game *mechanics* (numbers, sequences, interactions)
> are implemented exactly, as data and code. Rulebook prose is **never copied** — all
> descriptions in this repo are original wording. Proper names (factions, territories,
> leaders, cards) live in editable config files under `src/game/data/` so you can enter
> or adjust them to match your own copy of the game, and every numeric constant that
> can differ between editions is a config value marked `VERIFY` for you to check
> against your rulebook.

## Layers

```
┌─────────────────────────────────────────────────────┐
│ UI (React + Tailwind + Zustand)                     │
│   pages: /  /new  /game/:gameId                     │
│   components: Board, PhasePanel, ActionPanel, ...   │
│   Reads ONLY PublicGameState / visible state.       │
└──────────────────────┬──────────────────────────────┘
                       │ dispatch(TurnAction)
┌──────────────────────▼──────────────────────────────┐
│ Rules engine (pure functions, no React, no I/O)     │
│   src/game/engine                                   │
│   validateAction(state, action) -> ValidationResult │
│   applyAction(state, action)    -> GameState        │
│   getAllowedActions(state, playerId) -> spec[]      │
│   getVisibleGameState(state, viewerId) -> view      │
└──────────────────────┬──────────────────────────────┘
                       │ reads
┌──────────────────────▼──────────────────────────────┐
│ Game data (editable configs)                        │
│   src/game/data: territories, factions, leaders,    │
│   treachery deck, spice deck, global constants      │
└─────────────────────────────────────────────────────┘
```

### Invariants

1. `GameState` is plain JSON — serializable, diffable, persistable (Supabase/Firebase later).
2. Every user action is a `TurnAction`; the engine is a reducer:
   `next = applyAction(prev, action)` — `prev` is never mutated.
3. Every action is validated before being applied. `applyAction` throws on invalid input;
   UI must call `validateAction` first (optimistic UI only after local validation).
4. All randomness flows through a **seeded RNG whose cursor lives in GameState**
   (`state.rng`). Replaying the action list from the seed reproduces the game exactly.
5. Every state transition appends structured `GameLogEntry` records. Entries carry a
   `visibility` field so the log can be filtered per viewer.
6. Hidden information (hands, traitors, battle plans, face-down decks, predictions) is
   only ever exposed through `getVisibleGameState(state, viewerId)`. The server (later)
   sends each client only their visible view; hotseat uses the same function.
7. Simultaneous secret commitments (battle plans, storm dials, traitor picks) are stored
   in `state.pendingDecisions` and revealed only when all required players have
   committed.

## Folder structure

```
src/
  game/
    types/          # all TypeScript model types (no logic)
    data/           # editable game data: territories, factions, decks, constants
    engine/
      rng.ts        # seeded PRNG (state stored in GameState)
      log.ts        # GameLogEntry helpers
      setup.ts      # createGame / seed GameState
      state.ts      # small pure helpers over GameState
      engine.ts     # top-level dispatch: validate/apply/allowed-actions
      winCheck.ts   # pure victory evaluation
      phases/       # one module per phase, common PhaseModule interface
      actions/      # TurnAction type guards + shared action helpers
      combat/       # battle plan legality + battle resolution
      validation/   # cross-cutting validators (occupancy, storm, spice)
      visibility/   # getVisibleGameState + log filtering
  components/       # UI (later milestone)
  pages/            # /  /new  /game/:gameId
  lib/              # client-side utilities (store, persistence adapter)
  tests/            # vitest suites against the engine only
```

## Phase system

`state.phase` is a value of the `Phase` union. Each phase module implements:

```ts
interface PhaseModule {
  phase: Phase;
  getAllowedActions(state: GameState, playerId: PlayerId): AllowedAction[];
  validateAction(state: GameState, action: TurnAction): ValidationResult;
  applyAction(state: GameState, action: TurnAction): GameState;
  isPhaseComplete(state: GameState): boolean;
  advancePhase(state: GameState): GameState; // performs end-of-phase bookkeeping and sets next phase
}
```

Round order (after one-time `setup`):
`storm → spiceBlow → biddingChoam? → bidding → revival → shipmentAndMovement (per player: ship then move) → battle → spiceCollection → mentatPause (win check / end round)`.
A `nexus` interrupt phase is pushed whenever the rules trigger one (worm on a spice blow),
and resolved at the point the rules dictate.

The top-level engine routes `TurnAction`s to the current phase module, then loops
`while (module.isPhaseComplete(state)) state = module.advancePhase(state)` so that
phases with nothing to do (e.g. no battles) pass through automatically and
deterministically.

## Async multiplayer path

- MVP: local hotseat. The Zustand store holds the full `GameState` plus a
  `viewingAs: PlayerId` switch; all rendering goes through `getVisibleGameState`.
- Later: move authoritative state to Supabase. Client sends `TurnAction`s; an edge
  function validates + applies + persists; clients subscribe to their filtered view.
  Because the engine is pure and JSON-in/JSON-out, this is a transport change only.
- `PendingDecision` records `waitingFor: PlayerId[]` — that drives both the
  "waiting for player" UI and (later) notification hooks.
- Every applied action stores `at` (ISO timestamp) in the log entry; timestamps are
  supplied by the caller, never generated inside the engine, to keep it pure.

## Milestones (implementation order)

1. ✅ Data models (`src/game/types`)
2. ✅ Editable game data + seed GameState (`src/game/data`, `engine/setup.ts`)
3. ✅ Phase engine skeleton + storm + spice blow implemented
4. Board renderer (data-driven SVG, clickable sectors)
5. Hotseat action dispatch (Zustand store)
6. Bidding, revival, shipment/movement
7. Battle planning (hidden commitment) + resolution + traitors
8. Nexus/alliances, win checks wired to every trigger point
9. Persistence + async permissions
10. Test hardening + UI polish

## Testing strategy

Engine only, via Vitest (`src/tests`). Every rule gets: a happy-path test, an
illegal-action test, and (where editions differ) a config-override test. Determinism
test: same seed + same action list ⇒ identical final state JSON.
