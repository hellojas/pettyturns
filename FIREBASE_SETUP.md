# Firebase setup (async multiplayer)

Async multiplayer uses **Cloud Firestore** as the authoritative backend: one
document per game holds an append-only action journal; every move is validated
by the game engine inside a Firestore transaction, and clients subscribe to live
updates. When Firebase isn't reachable the app falls back to the local
(localStorage) mock, so hotseat and single-device play always work.

## One-time project setup (console)

1. **Firestore** — Firebase console → *Firestore Database* → **Create database**
   (production mode, any region).
2. **Rules** — *Firestore → Rules* tab → paste the contents of
   [`firestore.rules`](./firestore.rules) → **Publish**.
3. **Anonymous auth** — *Authentication → Sign-in method* → enable **Anonymous**.
   The rules require a signed-in session; the app signs each device in
   anonymously on first use.

That's it — no schema or index setup is needed (games are listed by a single
`updatedAt` order, which Firestore indexes automatically).

## Configuration

The web config ships as defaults in `src/imperium/net/firebaseConfig.ts`. These
values are **public identifiers** for a Firebase web app (security is enforced by
the rules, not by hiding the key). Override any of them — or rotate keys, or
point at a different project — with env vars (see `.env.example`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Set `VITE_USE_FIREBASE=false` to disable Firebase entirely and play async against
the local mock only (useful offline or in CI).

## Trust model

Rules enforce **structure** and **append-only history** (the seed, id and
creation time are frozen; the journal cursor only grows). Move *legality* is
enforced client-side inside the transaction — sufficient for a private game
among trusted players. Hardening move validation server-side would mean moving
`evaluateSubmit` (`src/imperium/net/serverLogic.ts`) into a Cloud Function; the
transport interface wouldn't change.

## Cross-device play

Open the game URL on each device, pick your seat, and play your turns — the board
shows only your own hand and updates live as opponents move. The same flow works
across browser tabs on one device.
