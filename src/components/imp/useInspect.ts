import { useSyncExternalStore } from 'react';

/**
 * "Hold to inspect": while the inspect key is held, hovering a card reveals a
 * full, plain-language detail popover (see CardDetail). We track the key once at
 * the module level and fan it out via useSyncExternalStore, so any number of
 * cards share a single pair of window listeners.
 */

/** The key you hold to reveal card details. Shift is safe in-browser (no menu
 *  focus stealing like Alt, types nothing like a letter key). */
export const INSPECT_KEY = 'Shift';
export const INSPECT_KEY_LABEL = 'Shift';

let held = false;
const listeners = new Set<() => void>();

function set(v: boolean) {
  if (held !== v) {
    held = v;
    for (const l of listeners) l();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === INSPECT_KEY) set(true);
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === INSPECT_KEY) set(false);
  });
  // A missed keyup (e.g. focus left the tab) would leave it stuck on — release
  // whenever the window loses focus.
  window.addEventListener('blur', () => set(false));
}

/** True while the inspect key is held down. */
export function useInspecting(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => held,
    () => false,
  );
}
