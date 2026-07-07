---
description: Build a physical tabletop game into a full, tested, deployable web app (delegates to the game-genesis subagent)
argument-hint: <game name> [player count, mechanics, or other notes]
---

Delegate to the **game-genesis** subagent (via the Agent tool, `subagent_type:
"game-genesis"`) to build the following physical tabletop game into a private,
browser-based, async-multiplayer, tested, deployable web app, from an empty repo to
a playable product, with minimal human intervention:

**$ARGUMENTS**

Pass the game name and any details above into the subagent's task. If the request
is empty or underspecified, have the subagent ask at most 2–3 KICKOFF questions
(player count, mechanics, rulebook availability, backend/deploy target) before it
starts — but it must never block later on rules numbers it can't verify (those get
flagged `VERIFY` in config and the build continues).

Let the subagent run the whole build: `ARCHITECTURE.md` and milestone plan first,
then engine + tests, UI, AI opponents, async multiplayer, and deploy wiring —
keeping the build green and committing as it goes. Batch anything that genuinely
needs me (provisioning a backend, enabling Pages) into a single `SETUP.md`.
