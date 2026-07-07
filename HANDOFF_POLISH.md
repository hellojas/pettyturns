# HANDOFF — visual polish, turn notifications & feature backlog

Pick-up doc for a fresh session. Read `HANDOFF.md` first for engine/architecture;
this covers **UI/UX polish**, **turn notifications**, and a **feature backlog** —
most of which is **already implemented** on this branch and pending reconciliation.

## ⚠️ Read this first — two parallel polish tracks need reconciling

There are **two independent visual-polish efforts** in the repo history:

- **This branch** (`claude/board-visual-improvements-nh4hpq`, tip ≈ `e9cb250`,
  built on a big feature commit `e6993b8`): adds a large batch of features (list
  below). Green: `npx tsc --noEmit` clean, `npm test` = **464 passing**, build clean.
- **`origin/master`** (advanced past this branch's base `e915a91`): a *separate*
  polish pass — `090c954` (cards/board/home/results), `f0d7b7d` (richer card art +
  density-aware layout), `78f53c1` (hover-to-inspect via `imp/CardDetail.tsx`).

They **overlap and conflict** — most importantly both added a card **hover** system:
- master → `imp/CardDetail.tsx` + `imp/useInspect.ts` (a text popover of card details)
- this branch → `imp/HoverPreview.tsx` (an enlarged, scaled copy of the card face)

A straight `git rebase origin/master` conflicts in ~6 files (ImpGameOver, ImpHand,
AsyncGame, AsyncNewGame, Game, NewGame). **Do not blind-merge.** The next step is a
deliberate reconciliation: pick one hover approach (or keep both intentionally),
then rebase this branch's *unique* features onto master and resolve by hand.

### What this branch (`e6993b8`) adds that master lacks
- **Winner celebration** — `imp/WinnerCelebration.tsx` + `imp/Confetti.tsx` (reduced-motion-guarded), wired in `ImpGameOver.tsx`.
- **Hover preview** — `imp/HoverPreview.tsx` (scaled card zoom) on hand + market. *(Just fixed: the preview now renders at full opacity — it used to clone a card's dimmed state and read as ~45% transparent.)*
- **Icon legend** — `imp/ImpLegend.tsx` (toggle on the game page).
- **Deck & discard piles** — `imp/DeckPiles.tsx` on the player mat.
- **Loading skeletons** — `imp/Skeleton.tsx` (`LoadingCard`) for async join/lobby.
- **Replay / history bar** — `ImpReplayBar.tsx` (journal scrubber, read-only).
- **Spice-blow worm animation** — `imp/WormSweep.tsx`.
- **Turn notifications** — `imp/useTurnNotifications.ts` (see §2; DONE).
- **Async chat** — `ImpChat.tsx` + `net` chat plumbing + `netChat.test.ts`.
- **Seat ↔ uid binding** — `seatOwners` in the net layer + `seatOwners.test.ts` (async security: a seat can only be acted by its claimant).
- **Rematch** — `rematch()` store method (new game, same seats) from the results screen.
- **PWA** — `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`, `index.html` wiring (installable, offline hotseat).
- Tests: `asyncExtras.test.ts`, `netChat.test.ts`, `seatOwners.test.ts`.

## Working agreement (don't skip)

- **Green-or-revert.** `npx tsc --noEmit`, `npm test`, `npm run build` must stay green. If you can't fix red fast, `git checkout -- .` and stop.
- **Rebase onto master, never force master.** master moves often (concurrent sessions). Commit on the branch → `git fetch origin master` → `git rebase origin/master` (resolve the overlap!) → re-verify → push branch → ff master. If a master push is rejected, re-fetch/rebase.
- **Assets must be base-relative** (Pages serves under `/pettyturns/`). Never reference `public/` assets with root-absolute paths in code (they 404 under the subpath). Import through Vite, or resolve against `import.meta.env.BASE_URL` (see `LeaderPortrait.tsx#resolvePortrait`). This bit us twice; also check the new `sw.js`/manifest paths are subpath-correct on deploy.
- **Motion respects `prefers-reduced-motion`** (guard in `src/index.css`).
- **No copyrighted art.** All emblems/portraits original (see `tools/gen-portraits.mjs`, `public/portraits/README.md`).

## Where the visual system lives (file map)

```
src/index.css                theme layer: .panel/.btn/.input, tex-* textures,
                             anim-* keyframes (drop/pulse/flash/turn/zoom-in) + reduced-motion
tailwind.config.js           sand/dusk palette (dusk 700–950), font-display = Cinzel
src/assets/fonts/            Cinzel woff2 (SIL OFL) + OFL.txt
src/components/imp/          icons, visuals (GROUP_META/PLAYER_COLORS/chips), art (emblems+backdrops),
                             cardArt/CardDetail(master) / HoverPreview(branch), tokens, LeaderPortrait,
                             VpTrack, motion, Confetti, WinnerCelebration, ImpLegend, DeckPiles,
                             Skeleton, WormSweep, useTurnNotifications
src/components/              ImpBoard, ImpCard, ImpIntrigueCard, ImpHand, ImpMarket, ImpPlayerMat,
                             ImpLog, ImpDecision, ImpGameOver, ImpReplayBar, ImpChat
src/pages/                   Home, NewGame, Game (hotseat god view),
                             AsyncLobby, AsyncNewGame, AsyncGame (per-seat; ?debug=1 god view)
tools/gen-portraits.mjs      regenerate public/portraits/*.svg
```

---

## 1) Visual polish — remaining after reconciliation

Most of the earlier backlog is built (see the list above). What's still open:

1. **Decide the hover system.** Keep the info-dense `CardDetail` popover (master) or the enlarged-card `HoverPreview` (branch), or use both (preview on the board's small tiles, detail popover on cards). Don't ship two competing systems by accident.
2. **Mobile / narrow layout.** The 3-column grid (`Game.tsx`/`AsyncGame.tsx`) is desktop-first; single-column stack `<lg`, board in an `overflow-x` container, panels as accordions. Test at 390px.
3. **Player-color legend + audit.** Confirm meeples, cubes, log, VP track, mats all pull the same `PLAYER_COLORS[idx]`; add a small persistent key.
4. **Conflict-resolution animation.** On a `combat.reward` log entry, highlight the winning row and float reward chips toward the winner (reuse `FlashValue`/`WormSweep` patterns).
5. **Accessibility pass.** Focus rings on all tiles/cards, `aria-label`s on icon-only buttons, contrast check on chip text over tinted backgrounds, confirm every new `anim-*` is under the reduced-motion guard.

## 2) Turn notifications — DONE (client-side)

Implemented in `src/components/imp/useTurnNotifications.ts`, wired in `AsyncGame.tsx`.
Three layered signals on the rising edge of `yourTurn` (guarded by a ref; only while
`active`, never spectators/finished):
1. **Tab title + favicon badge** flip while it's your turn (always on).
2. **Web Notification** when the tab is hidden (opt-in; permission requested from a
   toggle's click gesture; persisted in `localStorage 'imperium:notify'`).
3. **WebAudio chime** under the same opt-in.

Remaining/optional: verify the favicon swap coexists with the PWA icon; consider a
per-game mute. **Out of scope (needs a server):** push/email when the app is fully
closed — that's the deferred server-side path (Cloud Functions + FCM).

## 3) Feature backlog (ranked, remaining)

Several are already built on this branch (rematch, chat, replay bar, seat↔uid,
PWA). Still open / next:

1. **Server-side redaction** (owner deferred it). For tournament-grade secrecy run
   the engine in Cloud Functions or a standalone server; clients render
   `snapshot().view` only (the transport interface already supports it, and
   `seatOwners` is a first step). Revisit if opening to strangers.
2. **Bots in async** — currently human-seats-only; `chooseBotAction` exists, needs a
   stepper (client-driven or, better, server-driven).
3. **In-game rules/VERIFY surfacing** — many data values are `VERIFY` placeholders;
   a panel to review/edit active constants so owners can match their edition.
4. **Deploy hardening** — `firebase.json`/`.firebaserc` for `firebase deploy` of
   rules (currently pasted in console); confirm `sw.js` scope under the Pages subpath.

## Quick verification recipe

```
npx tsc --noEmit        # types
npm test                # engine + async + extras suites (464+ on this branch)
npm run build           # bundles; confirms fonts/portraits/PWA assets fingerprint
# subpath sanity for any public/ asset:
grep -o 'url(\./[^)]*)' dist/assets/*.css     # must be relative ./ , never /assets
```

## Current git state (as of this handoff)

- Branch `claude/board-visual-improvements-nh4hpq` @ ≈`e9cb250`: base master `e915a91`
  + `e6993b8` (feature batch) + hover-opacity fix + this doc. Green (464 tests).
- **Not fast-forwardable onto current `origin/master`** — needs the deliberate
  reconciliation described at the top. Preserve this branch on origin; do the
  reconciliation as its own focused pass before merging to master.
