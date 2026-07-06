import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';

/**
 * Firebase wiring for the networked async transport.
 *
 * The web config below identifies the Firebase project; for Firebase web apps
 * these values are PUBLIC (not secrets) — access is enforced by Firestore
 * security rules, not by hiding the apiKey. They ship as defaults but every
 * field is overridable via `VITE_FIREBASE_*` env vars so the project can be
 * pointed elsewhere (or keys rotated) without a code change.
 *
 * Anonymous auth gives each device a stable uid so the security rules can
 * require a signed-in session (see firestore.rules). Nothing here is imported
 * by the engine, the hotseat store, or the tests — the Firebase SDK is loaded
 * lazily from `main.tsx` only when async play is enabled.
 */

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'AIzaSyB-InVxvIJb8d6rnzZZsQTS0Z13oypts50',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'pettyturns.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'pettyturns',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? 'pettyturns.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '751799786898',
  appId: env.VITE_FIREBASE_APP_ID ?? '1:751799786898:web:d1b52d4c2eeac38225754b',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-XKH7QJC5WN',
};

/** Async play uses Firebase unless explicitly disabled (VITE_USE_FIREBASE=false). */
export const firebaseEnabled = (env.VITE_USE_FIREBASE ?? 'true') !== 'false';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let authReady: Promise<Auth> | null = null;

function getApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

/** The Firestore handle, created once. */
export function getDb(): Firestore {
  if (!db) db = getFirestore(getApp());
  return db;
}

/**
 * Ensure an anonymous session exists before any Firestore call, so writes carry
 * a uid the rules can check. Idempotent — the sign-in promise is memoised.
 */
export function ensureAuth(): Promise<Auth> {
  if (!authReady) {
    const auth = getAuth(getApp());
    authReady = auth.currentUser
      ? Promise.resolve(auth)
      : signInAnonymously(auth).then(() => auth);
  }
  return authReady;
}
