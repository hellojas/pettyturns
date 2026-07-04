# HANDOFF — read this first in a fresh session

Private, browser-based implementation of **Dune: Imperium** (deck-building +
worker placement, 2–4 players) for people who own the physical game. An earlier
implementation of the **classic 1979 Dune** board game also lives in this repo
and stays playable, but Imperium is the product now.

## Current state (as of this handoff)

- Latest work on branch `claude/dune-rules-engine-u4e8vz`; `master` is
  fast-forwarded to match (both even after this handoff commit).
- `npm test` → **299 passing** (22 files). `npx tsc --noEmit` clean. `npm run build` clean.
- HANDOFF gap #1 (leader passives) is DONE and merged.
- Card pool grown with a `deckComposition` guard test (see below); still VERIFY.
- **Choice prompts / pending-decision system — DONE (was next step #1).**
  `anyInfluence`, optional `trashCards`, and Paul's foresight are now real
  player choices instead of auto-picks. See the section below. Also verified
  end-to-end in the browser (Decision panel renders, resolves, play continues).

### Pending-decision system (how it works)

- `state.pendingDecisions: ImpPendingDecision[]` is a FIFO queue; only the
  **front** decision (owned by its `playerId`) may be resolved, via the new
  `imp/resolveDecision` action. While the queue is non-empty every other action
  is rejected (`impValidate` → `decision-pending`) and `impAllowedActions`
  surfaces only the resolve for the owed player.
- Effects that need a choice **enqueue** a decision instead of resolving inline
  (`applyGains` in `effects.ts`): `anyInfluence` → `influence` decision,
  `trashCards` → optional `trash` decision. Paul's `onReveal` passive with
  `params.deckPeek` → a `deckPeek` decision (keep or set-aside the top card).
- Flows that can't finish while a choice is owed **park a continuation** on
  `state.flowResume` and block; it runs when the queue drains
  (`settle`/`runResume` in `engine.ts`). Three resume points: `afterPlayerTurn`
  (agent play / end turn), `afterCombat` (combat rewards → makers/recall), and
  `afterCombatIntrigue` (reopen the combat window). This is what keeps a
  combat-reward influence that crosses a VP level ending the game in the correct
  round — makers/recall + the endgame check run only after it resolves.
- Every deferred effect is self-contained and order-independent, so resolving
  it later yields the same result as inline would have.
- `decisionSeq` gives deterministic ids (`dec-N`); visibility redacts a
  `deckPeek`'s `cardId` for everyone but its owner. UI: `ImpDecision.tsx`
  (mounted in `Game.tsx`). Tests: `src/tests/imperium/decisions.test.ts` plus a
  Paul deckPeek case in `leaderPassives.test.ts`. Test helper `drainDecisions`
  auto-resolves with neutral defaults; `makeImp`'s default lineup deliberately
  keeps Paul out of the low seats (his reveal always raises a decision).

## DEPLOY — GitHub Pages (user deploys this themselves)

The user hosts the app on **GitHub Pages** (not a Claude Artifact). The repo is
already wired for it:
- `vite.config.ts` sets `base: './'` → assets load from relative paths, so the
  SPA works under the Pages project subpath `https://<user>.github.io/pettyturns/`.
  `App.tsx` uses `HashRouter`, so client routing needs no server rewrites.
- `.github/workflows/deploy-pages.yml` builds (`npm ci` → `npm test` →
  `npm run build`) and publishes `dist/` on every push to `master`, plus
  manual `workflow_dispatch`.

**One-time setup the USER must do in GitHub:** Settings → Pages → Source →
"GitHub Actions". After that, each push to `master` auto-deploys. The live URL
is `https://<user>.github.io/pettyturns/` (shown in the workflow's deploy step
output). If you change routing/base, keep `base: './'` — an absolute `/foo/`
base breaks under the project subpath.

Do NOT try to deploy from this sandbox; the user drives the Pages setup. Your
job is only to keep `master` green and Pages-buildable (relative base, tests
passing in CI). If assets 404 on the live site, the cause is almost always a
non-relative `base`.

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
6. Commit trailers: keep the `Co-Authored-By: Claude ...` + `Claude-Session:`
   lines from prior commits. Do NOT put the model id in commits/PRs/code.

## Layout

```
src/imperium/            ← THE GAME (Dune: Imperium)
  types.ts               all models + actions + effects DSL (Gains/Costs) +
                         LeaderPassive types
  data/                  EDITABLE CONFIGS, all VERIFY-flagged:
    constants.ts         strength/VP/influence/sell rates/conflict mix/tiebreakers
    spaces.ts            21 board spaces (faction/landsraad/choam/city/desert)
    cards.ts             starting deck + reserve trio + imperium-deck SUBSET
                         (~21 imperium cards — representative, meant to grow)
    intrigue.ts          plot/combat/endgame SUBSET (~14 cards)
    conflicts.ts         12 conflict cards in 3 tiers (placeholder rewards)
    leaders.ts           8 leaders; signet + data-driven passives IMPLEMENTED
                         (all 8 machine-enforced; Paul = onReveal deckPeek via
                         the pending-decision system)
  engine/
    setup.ts             createImperiumGame (deterministic)
    effects.ts           applyGains/payCosts/addInfluence/draw/acquire +
                         enqueueDecision/trashOneCard (choice prompts)
    engine.ts            impValidate/impApply/impAllowedActions, turn machine,
                         combat resolution, makers/recall, endgame scoring,
                         leaderPassives() hooks
    visibility.ts        getVisibleImperiumState
src/lib/impStore.ts      Zustand hotseat store (localStorage 'imperium:*')
src/pages/, src/components/Imp*.tsx   Imperium UI at routes / /new /game/:id
src/tests/imperium/      9 files (setup/agentTurns/revealAndBuy/influence/combat/
                         rounds/visibility/leaderPassives + helpers.ts).
                         helpers: makeImp/setHand/patch/endRoundQuietly
                         (endRoundQuietly plays exactly ONE round).

src/game/ + src/classic/ ← classic 1979 game engine + UI (frozen, keep passing)
  routes /classic /classic/new /classic/game/:id ; tests in src/tests/*.test.ts
ARCHITECTURE.md          layer diagram + invariants (written for classic; the
                         same contract applies to imperium)
```

## Commands

`npm test` (136 tests) · `npx tsc --noEmit` (clean) · `npm run dev` ·
`npm run build`. Browser check: Playwright via `playwright-core` +
executablePath `/opt/pw-browsers/chromium`, args `['--no-sandbox']`. Write the
drive script to a file INSIDE the repo root (ESM resolves `playwright-core`
from `node_modules` relative to the script, not cwd) and delete it after; see
git history for an example.

## How the Imperium engine flows (quick mental model)

Round = `playerTurns` (each player: N agent turns via `imp/playCard`, then one
reveal via `imp/reveal` → buys via `imp/buyCard` → `imp/endTurn`) → `combat`
(participants = players with ≥1 troop `inConflict`; window of
`imp/playIntrigue`(combat)/`imp/combatPass`, a played card reopens the window;
resolution: strength = 2×troops + swords + leader `combatStrength` passives;
ties demote to next-lower reward) → makers (unvisited maker spaces +1 spice) →
recall (rotate first player, redraw hands, control bonuses, `onRoundStart`
passives, next conflict) → endgame when someone ≥10 VP at round end or conflict
deck empty; tiebreakers spice→solari→water. `state.turn` is whoever may act;
there is no auto-advance loop — every transition happens inside `impApply`.

Leader passives are consumed via `leaderPassives(state, pid, hook)` in
`engine.ts` at four hooks: `combatStrength`, `onReveal`, `onAgentPlaced`
(optionally gated by space `group`/`spaceId`; troop grants feed the deploy
limit), `onRoundStart`. Data lives in `data/leaders.ts` as `passives[]`.

A choice a card/space/reward needs is a **pending decision** (see the section
up top): the effect enqueues one, the engine blocks the queue, and
`imp/resolveDecision` applies it. To add a new choice-driven effect, enqueue a
decision in `effects.ts`/`engine.ts` and (if the flow can't finish while it's
owed) park a `flowResume` continuation via `settle`.

## Next steps (priority order)

   (Card pool + choice prompts: DONE. Keep extending
   `cards.ts`/`intrigue.ts`/`conflicts.ts` entry-by-entry against the owner's
   copy; all values VERIFY, original wording only, no card text. When a card
   doesn't fit the `Gains`/`Costs` DSL, add an optional field + an interpreter
   branch in `effects.ts` + a test; the composition guard fails loudly on a
   structurally bad def. A card needing a player choice enqueues a pending
   decision — see the pending-decision section.)

1. **Async multiplayer.** Store is hotseat + localStorage. Seam: move
   authoritative state server-side (Supabase); clients send actions and receive
   their `getVisibleImperiumState` view. Engine needs no changes.
2. **Endgame intrigue conditions.** Currently flat VP; real cards have
   conditions — model as data predicates.
3. **`onAgentPlaced` choice-driven passives.** The pending-decision plumbing now
   supports this (a placement passive can enqueue a decision); no leader in the
   current config needs it yet, but the hook is ready.

## Environment notes

- Remote sandbox; most rules-reference sites 403 through the proxy — rely on
  config-flagging over web research (values are placeholders for the owner to
  VERIFY, so exact numbers are not blocking).
- `gh` CLI unavailable; use GitHub MCP tools if needed. Repo scope:
  `hellojas/pettyturns`.
- `playwright-core` is a dev dep (added for screenshots); that's why
  `package.json` shows it.
