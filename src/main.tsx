import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setImpTransport } from './lib/impStore';

/**
 * Point async multiplayer at Firebase when enabled. The Firebase SDK (and its
 * transport) are dynamically imported so they only load — and only bundle into
 * their own chunk — when async play is actually used; otherwise the app keeps
 * the localStorage-backed mock and stays fully offline. A failed init (bad
 * config, offline) silently leaves the mock in place.
 */
async function initTransport(): Promise<void> {
  try {
    const { firebaseEnabled } = await import('./imperium/net/firebaseConfig');
    if (!firebaseEnabled) return;
    const { FirestoreTransport } = await import('./imperium/net/firestoreTransport');
    setImpTransport(new FirestoreTransport());
  } catch (err) {
    console.warn('[async] Firebase transport unavailable; using local mock.', err);
  }
}
void initTransport();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
