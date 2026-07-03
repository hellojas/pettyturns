# HANDOFF — read this first in a fresh session

Private, browser-based implementation of **Dune: Imperium** (deck-building +
worker placement, 2–4 players) for people who own the physical game. An earlier
implementation of the **classic 1979 Dune** board game also lives in this repo
and stays playable, but Imperium is the product now.

## Ground rules (do not violate)

1. **Never copy rulebook or card text.** Mechanics are implemented exactly as
   data + code; all descriptive wording in this repo is original. Short proper
   names (spaces, cards, leaders) are fine.
2. **Every edition-sensitive number is editable config marked `VERIFY`.** The
   owner corrects values against their physical copy; the engine reads only
   config. Never hardcode a rules number outside `src/imperium/data/` or
   `src/game/data/`.
3. **Engine purity.** JSON-serializable state, pure reducer
   (`impApply(state, action) → state`), seeded RNG cursor stored in state
   (replayable), structured log with per-entry visibility, all hidden info
   gated through `getVisibleImperiumState(state, viewerId)`.
4. Simplifications must be labeled `MVP TEMPORARY SHORTCUT` in code comments.
5. Work on branch `claude/dune-rules-engine-u4e8vz`; push there. Merging to
   `master` = fast-forward on request. Never create a PR unless asked.

## Layout

```
src/imperium/            ← THE GAME (Dune: Imperium)
  types.ts               all models + actions + effects DSL (Gains/Costs)
  data/                  EDITABLE CONFIGS, all VERIFY-flagged:
    constants.ts         strength/VP/influence/sell rates/conflict mix/tiebreakers
    spaces.ts            21 board spaces (faction/landsraad/choam/city/desert)
    cards.ts             starting deck, reserve trio, imperium-deck SUBSET
    intrigue.ts          plot/combat/endgame SUBSET
    conflicts.ts         12 conflict cards in 3 tiers (placeholder rewards)
    leaders.ts           8 leaders; signet implemented, passives are TODO notes
  engine/
    setup.ts             createImperiumGame (deterministic)
    effects.ts           applyGains/payCosts/addInfluence(+alliance)/draw/acquire
    engine.ts            impValidate/impApply/impAllowedActions, turn machine,
                         combat resolution, makers/recall, endgame scoring
    visibility.ts        getVisibleImperiumState
src/lib/impStore.ts      Zustand hotseat store (localStorage 'imperium:*')
src/pages/, src/components/Imp*.tsx   Imperium UI at routes / /new /game/:id
src/tests/imperium/      44 engine tests (helpers.ts has makeImp/setHand/patch/
                         endRoundQuietly — endRoundQuietly plays exactly ONE round)

src/game/ + src/classic/ ← classic 1979 game engine + UI (frozen, keep passing)
  routes /classic /classic/new /classic/game/:id ; tests in src/tests/*.test.ts
ARCHITECTURE.md          layer diagram + invariants (written for classic; the
                         same contract applies to imperium)
```

## Commands

`npm test` (126 tests, all passing) · `npx tsc --noEmit` (clean) ·
`npm run dev` · `npm run build`. Browser check: Playwright via
`playwright-core` + executablePath `/opt/pw-browsers/chromium`, args
`['--no-sandbox']` (see git history for a drive script example).

## How the Imperium engine flows (quick mental model)

Round = `playerTurns` (each player: N agent turns via `imp/playCard`, then one
reveal via `imp/reveal` → buys via `imp/buyCard` → `imp/endTurn`) → `combat`
(participants = players with ≥1 troop `inConflict`; window of
`imp/playIntrigue`(combat)/`imp/combatPass`, a played card reopens the window;
resolution: strength = 2×troops + swords; ties demote to next-lower reward) →
makers (unvisited maker spaces +1 spice) → recall (rotate first player, redraw
hands, control bonuses, next conflict) → endgame when someone ≥10 VP at round
end or conflict deck empty; tiebreakers spice→solari→water. `state.turn` is
whoever may act; there is no auto-advance loop — every transition happens
inside `impApply`.

## Known gaps = the next steps (in priority order)

1. **Leader passives.** Only signet abilities work (fire when the signet
   starting card is played). Each leader's passive is a `passiveNote` TODO in
   `data/leaders.ts`. Design: add engine hook points (e.g. onAgentPlaced,
   onReveal, onCombatResolve, placement-rule overrides) consumed from leader
   config, mirroring how faction powers were data-driven in the classic game.
2. **Full card pool.** `cards.ts` imperium deck, `intrigue.ts`, and
   `conflicts.ts` are representative subsets. Extend entry-by-entry (owner
   verifies values). The effects DSL (`Gains`/`Costs` in types.ts) covers most
   cards; extend it (new optional fields + interpreter branch in effects.ts +
   a test) when a card doesn't fit.
3. **Choice prompts.** `anyInfluence` conflict rewards auto-pick the player's
   strongest track (logged); Selective Breeding trash target is optional via
   `choices.trashCardId`. Replace auto-picks with a pending-decision mechanism
   (classic game's `PendingDecision` pattern is the template).
4. **Async multiplayer.** Store is hotseat + localStorage. Architecture seam:
   move authoritative state server-side (Supabase), clients send actions and
   receive their `getVisibleImperiumState` view. Engine needs no changes.
5. **Endgame intrigue conditions.** Currently flat VP; real cards have
   conditions — model as data predicates.
6. Housekeeping: `master` is behind this branch (fast-forward merge on
   request).

## Environment notes

- Remote sandbox; most rules-reference sites 403 through the proxy — rely on
  config-flagging over web research.
- `gh` CLI unavailable; use GitHub MCP tools if needed.
- Commit trailers: keep using the Co-Authored-By line from prior commits.
