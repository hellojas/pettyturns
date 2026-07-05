# HANDOFF — read this first in a fresh session

Private, browser-based implementation of **Dune: Imperium** (deck-building +
worker placement, 2–4 players) for people who own the physical game. An earlier
implementation of the **classic 1979 Dune** board game also lives in this repo
and stays playable, but Imperium is the product now.

## ⟳ AUTONOMOUS BUILD LOOP — READ FIRST IF YOU WERE FIRED BY A TRIGGER

An hourly trigger named **`auto-build-imperium`** spawns a fresh session each
hour to advance this project unattended. If that's you, do **exactly ONE
iteration**, then end your turn:

1. Read this whole file. Pick the **single** highest-priority item from
   **"Next steps"** that is implementable **without external setup** (no
   Supabase account, API keys, or the GitHub Pages toggle — those are the
   user's to do).
2. **If nothing is implementable** (list empty, or only external-setup items
   remain): append a note at the top of "Current state" saying the loop
   finished, then **stop the loop** — call `list_triggers`, find
   `auto-build-imperium`, and `delete_trigger` it. Do not commit code. Done.
3. Otherwise implement that ONE feature, honoring the Ground rules below
   (mechanics-as-data, VERIFY configs, engine purity, no rulebook/card text).
   Prefer engine-first, well-tested work. Keep it to one feature.
4. Run `npx tsc --noEmit` and `npm test`. **If either fails and you can't fix
   it quickly, `git checkout -- .` (discard your work) and STOP — never commit
   or push red code.**
5. When green: commit on `claude/dune-rules-engine-u4e8vz`, then
   `git checkout master && git merge --ff-only … && git push origin master`.
   Use the same `Co-Authored-By:` + `Claude-Session:` trailers as prior commits
   (copy from `git log`). **If the master push is rejected** (a concurrent run
   advanced it): `git reset --hard origin/master` and STOP — do not force.
6. Rewrite the relevant parts of this file: mark the feature done in "Current
   state", refresh the test count, and reprioritize "Next steps". Commit + push
   that too. Then end your turn (the next hourly firing continues).

Guardrails: one feature per run; green-or-revert; never force-push; never fake a
feature that needs external setup; keep HANDOFF.md accurate — the next session
has only this file + the repo.

## Current state (as of this handoff)

- Latest work on branch `claude/dune-rules-engine-u4e8vz`; `master` is
  fast-forwarded to match (both even after this handoff commit).
- `npm test` → **325 passing** (25 files). `npx tsc --noEmit` clean. `npm run build` clean.
- HANDOFF gap #1 (leader passives) is DONE and merged.
- **Undo/redo — DONE.** The hotseat store is now JOURNAL-backed, not
  snapshot-backed: it persists `{ initial, journal, cursor }` and derives the
  live state via `engine/replay.ts` (`replayImperiumGame` / `stateAfter` fold
  `impApply` over the recorded actions). Undo moves the cursor back, redo
  forward, a fresh dispatch truncates the redo tail. Legacy raw-state saves
  still load (no history). Tests: `replay.test.ts`. This also de-risks async
  multiplayer — the server can persist the same journal and reconcile by
  replay. Undo/Redo buttons live in the `Game.tsx` header.
- Card pool grown with a `deckComposition` guard test (see below); still VERIFY.
- **Choice prompts / pending-decision system — DONE (was next step #1).**
  `anyInfluence`, optional `trashCards`, and Paul's foresight are now real
  player choices instead of auto-picks. See the section below. Also verified
  end-to-end in the browser (Decision panel renders, resolves, play continues).
- **Endgame intrigue conditions — DONE (was next step #2).** Endgame intrigue
  cards no longer all score a flat point; each may carry an `endgameCondition`
  data predicate that gates or scales its `gains.vp`. See the section below.
- **Faction influence-track step rewards — DONE.** Reaching a level on a faction
  influence track now grants that level's configured resource reward (on top of
  the VP levels and the alliance). See the section below.

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

### Endgame intrigue conditions (how it works)

- `IntrigueDef.endgameCondition?: EndgameCondition` (types.ts) is an optional
  data predicate on endgame-kind intrigue cards. No condition = the old flat
  behavior (scores `gains.vp` unconditionally).
- An `EndgameCondition` names a per-player `EndgameMetric` read purely from the
  finished state (`influence`+`faction`, `controlSpaces`, `intrigueCards`,
  `alliances`, `spice`/`solari`/`water`, `troops`=garrison+inConflict). One
  scoring shape applies, checked in order: `mostAmong` (leader-takes-it, ties
  shared, a 0 metric never scores) → `per` (VP once per N units, floored) →
  `atLeast` (VP if metric ≥ threshold) → unconditional.
- `finalScoring` in `engine.ts` evaluates every endgame card against a
  **pre-scoring snapshot** so awarded VP never changes what another card
  measures (order-independent). Logs `intrigue.endgame` with `{intrigueDefId,
  vp}`. Helpers `endgameMetricValue` / `endgameConditionVp` are the scorer.
- Config: five VERIFY placeholder conditional cards in `data/intrigue.ts`
  (`dynasticReach`, `warChest`, `spyNetwork`, `imperialFavor`, `standingArmy`).
  All values are placeholders — VERIFY metrics/thresholds against the owner's
  copy; add more the same way (a card that doesn't fit a metric = add a metric
  to `EndgameMetric` + a branch in `endgameMetricValue` + a guard/test).
- The composition guard (`deckComposition.test.ts`) validates condition shape
  (metric valid, influence needs a faction, ≤1 scoring shape, `per`>0). UI:
  `ImpHand.tsx` shows each endgame card's scoring summary via `describeEndgame`.
  Tests: `src/tests/imperium/endgameScoring.test.ts` (helper `giveIntrigue`).

### Faction influence-track step rewards (how it works)

- `IMP_FACTION_INFLUENCE_REWARDS` (`data/factions.ts`) maps each faction to a
  per-level `Gains` reward: reaching that level on the track (upward crossing
  only) grants it once. All values are VERIFY placeholders (currently rewards at
  levels 1 and 3 per faction — thematic resources/troops/cards/intrigue).
- Applied inside `addInfluence` (`effects.ts`): for every level in
  `(before, after]` on an upward move it runs the reward through `applyGains`
  and logs `influence.reward {pid, faction, level}`. These stack with the VP at
  `influenceVpLevels` and the alliance at `allianceLevel` — a single 0→4 jump
  fires both level rewards, both VPs, and the alliance in one call.
- **Asymmetry (intentional):** VP is symmetric (given up on a downward crossing),
  but resource rewards are NOT clawed back — a spent resource can't be un-spent.
  So dropping below a level and re-climbing it re-grants the reward. Documented
  and tested (`factionInfluence.test.ts`).
- **No-recursion invariant:** a step reward must not grant `influence`/
  `anyInfluence` (would recurse through `addInfluence`). The composition guard
  (`deckComposition.test.ts`) enforces this plus valid level bounds and
  reference-checks the gains. To extend: edit `data/factions.ts` only.
- UI: `ImpPlayerMat.tsx` influence chips carry a tooltip listing every track
  milestone (rewards + VP + alliance), ticking the ones the player has passed.

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
    factions.ts          per-faction influence-track step rewards (VERIFY)
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
src/lib/impStore.ts      Zustand hotseat store, JOURNAL-backed
                         ({ initial, journal, cursor }; localStorage
                         'imperium:*'); undo/redo derive state via replay
src/imperium/engine/replay.ts  replayImperiumGame / stateAfter (pure fold of
                         impApply; undo/redo + future server reconciliation)
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

1. **Async multiplayer.** Store is hotseat + localStorage, now JOURNAL-backed
   (`{ initial, journal, cursor }`). Seam: persist that journal server-side
   (Supabase); clients append validated actions and receive their
   `getVisibleImperiumState` view; the server reconciles/rebuilds by replay
   (`engine/replay.ts`). Engine needs no changes. NOTE: needs the user to set up
   Supabase (external), so it can't be fully verified in this sandbox — scope a
   local mock adapter first.
2. **`onAgentPlaced` choice-driven passives.** The pending-decision plumbing now
   supports this (a placement passive can enqueue a decision); no leader in the
   current config needs it yet, but the hook is ready.
3. **More endgame conditions.** The `EndgameCondition` predicate system is done
   (see the section above); keep adding real cards entry-by-entry — a new
   condition kind = add an `EndgameMetric` + a branch in `endgameMetricValue`.

   (Endgame intrigue conditions: DONE — see section above.)

## Environment notes

- Remote sandbox; most rules-reference sites 403 through the proxy — rely on
  config-flagging over web research (values are placeholders for the owner to
  VERIFY, so exact numbers are not blocking).
- `gh` CLI unavailable; use GitHub MCP tools if needed. Repo scope:
  `hellojas/pettyturns`.
- `playwright-core` is a dev dep (added for screenshots); that's why
  `package.json` shows it.
