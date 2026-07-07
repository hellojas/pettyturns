---
name: game-genesis
description: >
  Build a physical tabletop game into a private, browser-based, async-multiplayer,
  tested, deployable web app from an empty repo, with minimal human intervention.
  Use when the user wants to turn a board/card game they own into a digital
  implementation — "build me a version of <game>", "make a playable app for
  <boardgame>", "one-shot a game engine". Encodes the pure-engine + editable-data +
  UI architecture, the nine invariants, the milestone build order, and the
  VERIFY/IP content policy proven out on the pettyturns (Dune: Imperium) build.
---

# Game Genesis

Take a physical tabletop game and build a **private, browser-based,
async-multiplayer rules engine + UI** — from an empty repo to a playable, tested,
deployable product — with the least possible human intervention. The engine (a
faithful, machine-enforced implementation of the rules) is the real deliverable;
the UI makes it playable.

If the user hasn't provided them, gather the KICKOFF fields (game name, player
count, mechanics, rulebook availability, backend/deploy targets) — asking at most
2–3 quick questions — then follow the method below. Do **not** ask about anything
you can default; and never block later on rules numbers you can't verify.

## Operating mode (autonomy)

- Max plan: spend quota on quality. Use subagents in parallel — a research agent
  to digest the rulebook, a planning agent per subsystem, implementer agents
  across independent milestones, and a skeptical review agent after each
  subsystem to find defects and rules gaps. Prefer high reasoning for engine
  design and adversarial review.
- **Never block on unverifiable facts.** Exact rules numbers and per-edition
  values are encoded as editable config marked `VERIFY` and you keep going; the
  owner reconciles later. The only things that need the human: provisioning an
  external account (backend/hosting) and a genuine product decision with no
  default. Batch those into `SETUP.md`, never interrupt mid-build.
- Prefer doing over asking. Keep the build green (`test` + `typecheck` + `build`)
  at every small, described commit on a feature branch. No PR unless asked.
- Engine-first: ship the rules engine + test suite before any UI. UI, AI,
  multiplayer, and polish are later, separable phases that never force an engine
  rewrite.

## Definition of done

A single-repo web app that: plays a complete game end-to-end for the supported
player counts (hotseat); makes illegal actions impossible; hides hidden info per
seat; supports async multiplayer via a swappable transport with a working local
fallback (fully playable with zero backend); has AI opponents that finish a legal
game; supports undo/redo + reproducible replay; deploys as a static site; and
ships `ARCHITECTURE.md`, `HANDOFF.md`, `SETUP.md` plus a green test suite, clean
typecheck, and clean build.

## Non-negotiable architecture

Separate a **pure rules engine** from **editable game data** from the **UI**. The
engine is pure functions — no React, no I/O, no clocks, randomness only through
the seeded cursor.

Engine contract (rename to fit the game, keep the shapes):
```
validateAction(state, action)      -> ValidationResult   // never throws
applyAction(state, action)         -> state              // pure reducer, no mutation
getAllowedActions(state, playerId) -> AllowedAction[]
getVisibleState(state, viewerId)   -> VisibleState        // the only path to hidden info
```

The nine invariants (all load-bearing):
1. State is plain JSON (serializable, no classes/Maps/Dates/functions).
2. The engine is a reducer; `prev` is never mutated; every intent is one
   serializable `Action`.
3. Validate before apply; `applyAction` may assume legality.
4. All randomness flows through a seeded RNG whose cursor lives in state —
   replaying actions from the seed reproduces the game exactly; no wall-clock in
   the engine (timestamps passed in).
5. Every transition appends a structured log entry with a `visibility` field.
6. Hidden info is exposed only through `getVisibleState`; hotseat and network use
   the same function.
7. Simultaneous/secret commitments and mid-resolution single-player choices both
   go through a `pendingDecisions` queue: enqueue a decision, block the queue,
   resolve, resume a parked continuation. Deferred effects are self-contained and
   order-independent.
8. The authoritative unit is a journal, not a snapshot: `{ initial, journal,
   cursor }`; live state is a pure replay fold. This yields undo/redo, replays,
   and server-authoritative multiplayer almost for free.
9. Data-driven rules: every number and every card/space/faction effect lives in
   `data/` via a small effects DSL (`Gains`/`Costs`) the engine interprets — never
   bespoke code per card. Extend the DSL (one field + one interpreter branch + a
   test) rather than special-casing. Never hardcode a rules number outside `data/`.

Phase engine: `state.phase` union; each phase a module with
`getAllowedActions`/`validateAction`/`applyAction`/`isPhaseComplete`/
`advancePhase`; the top level routes an action then loops
`while (phase.isPhaseComplete) advancePhase` so empty phases pass through
deterministically. No hidden auto-advance — every transition is a reducer call.

Transport seam: one async `GameTransport` interface + a server-side `JournalStore`.
Ship an in-process, localStorage-backed **authoritative** mock (same reducer to
validate, same visibility to redact, seat/turn ownership, optimistic-concurrency
resync). The real backend later implements the same interface with no engine/UI
changes. UI reads opponents fastest-first: subscription → cross-tab storage →
slow poll backstop.

## Content / IP policy (strict)

Private tool for people who own the game. Never copy rulebook prose or card text —
implement mechanics as data + code, write all wording originally (short proper
names as labels are fine). Every edition-sensitive number is editable config
marked `VERIFY`. Generate original stylized SVG art (geometric/heraldic from house
colors), never copyrighted likenesses. Label deliberate simplifications
`MVP TEMPORARY SHORTCUT` in comments.

## Tech stack (pinned unless overridden)

Vite + React 18 + TypeScript, Tailwind, Zustand, React Router (HashRouter).
Vitest for the engine suite; `playwright-core` (system Chromium, `--no-sandbox`)
for headless flow checks. Firestore/Supabase only for the async backend,
lazy-loaded, anonymous auth, append-only rules — the engine never imports it.
Deploy a static SPA to GitHub Pages via an Actions workflow with `base: './'`.
Engine has zero runtime dependencies.

## Build order (each milestone ends green and committed)

1. `ARCHITECTURE.md` first (layers, invariants, phases, folders, milestones).
2. Types only (models, actions, effects DSL, decisions, log).
3. Editable `data/` configs, all `VERIFY`; a composition-guard test that
   structurally validates every def.
4. Engine core (seeded RNG, log, deterministic `createGame`, phase modules,
   combat/resolution, win checks, `getVisibleState`) + engine Vitest suite.
5. Board renderer + hotseat store; dispatch through validate/apply; `viewingAs`
   routed through `getVisibleState`.
6. Remaining subsystems one at a time (economy/bidding, `pendingDecisions`,
   alliances, every win trigger) with tests.
7. Undo/redo + replay: journal-backed store; derive state by replay; keep loading
   legacy saves.
8. AI opponents: pure `chooseBotAction`, every candidate `validateAction`-checked
   (never illegal); paced, undo-safe auto-run stepper; tests incl. all-bot game
   reaches a winner.
9. Async multiplayer: transport seam + authoritative local mock; store submits
   through it; lobby/seat-picker/turn-gated board; verify cross-seat in a browser.
10. Backend (needs the human): real transport behind the same interface,
    lazy-loaded, graceful fallback to the mock; console steps in `SETUP.md`.
11. Deploy wiring: relative base, HashRouter, Pages Actions workflow
    (install → test → build → publish); enable-Pages step in `SETUP.md`.
12. Visual polish last (SVG iconography, generated portraits/tokens, legibility,
    motion, end-game results + score ledger). Polish never touches the engine.

## Testing & quality gates

Every rule: happy-path + illegal-action + (where editions differ) config-override
test, plus a determinism test (same seed + actions ⇒ identical state JSON) and
invariant tests (score ledger sums to total; journal replays to live state).
`test`/`typecheck`/`build` gate every commit and CI. Drive real UI flows headless,
don't just screenshot.

## Living docs

- `ARCHITECTURE.md` — design, written before code, kept current.
- `HANDOFF.md` — "read first in a fresh session": state, done-vs-next
  (prioritized), ground rules, layout, round mental model, env gotchas. Update
  every session.
- `SETUP.md` — the only home for human action (accounts, console toggles, one-time
  repo settings), short and mechanical.

## Commit discipline

Small described commits on a feature branch; green per commit; fast-forward to
main only when asked; never PR unless asked. If main moves under you, rebase and
force-with-lease your branch — never force main.

---

The full paste-as-a-system-prompt version of this method (with a fill-in KICKOFF
block) lives at `GAME_GENESIS_PROMPT.md` in the repo root.
