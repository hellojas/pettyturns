import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Client-only "it's your move" signals for async play, layered so a backgrounded
 * tab still nudges the player:
 *   1. Tab title + favicon badge flip while it's your turn (always on).
 *   2. A Web Notification on the false→true turn transition when the tab is
 *      hidden (opt-in; permission requested from the toggle's click gesture).
 *   3. A short WebAudio chime under the same opt-in.
 *
 * Everything fires only on the rising edge of `yourTurn` (guarded by a ref), and
 * only while `active` (never for spectators or finished games). Nothing here
 * needs a server — push/email when the app is fully closed is out of scope.
 */
const LS_KEY = 'imperium:notify';

const FAVICON_BASE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%231c150f'/%3E%3Ccircle cx='16' cy='16' r='10' fill='%23cd8630'/%3E%3Ccircle cx='16' cy='16' r='4' fill='%231c150f'/%3E%3C/svg%3E";
const FAVICON_ALERT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%231c150f'/%3E%3Ccircle cx='16' cy='16' r='10' fill='%23f2c94c'/%3E%3Ccircle cx='23' cy='9' r='7' fill='%2334d399' stroke='%231c150f' stroke-width='2'/%3E%3C/svg%3E";

function setFavicon(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

/** A short two-note chime via WebAudio (no asset). Best-effort; ignores failures. */
function playChime(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
    setTimeout(() => void ctx.close().catch(() => {}), 900);
  } catch {
    /* audio is best-effort */
  }
}

export interface TurnNotificationsResult {
  supported: boolean;
  enabled: boolean;
  permission: NotificationPermission;
  toggle(): void;
}

export function useTurnNotifications({
  yourTurn,
  active,
  title,
  body,
}: {
  yourTurn: boolean;
  /** false for spectators / finished games — suppresses every signal. */
  active: boolean;
  title: string;
  body: string;
}): TurnNotificationsResult {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  );
  const baseTitle = useRef<string>(typeof document !== 'undefined' ? document.title : 'Imperium');
  const prevTurn = useRef<boolean>(yourTurn && active);

  const toggle = useCallback(() => {
    const next = !enabled;
    if (next && supported && Notification.permission === 'default') {
      // Permission must be requested from a user gesture — this toggle is one.
      void Notification.requestPermission().then(setPermission).catch(() => {});
    }
    setEnabled(next);
    try {
      localStorage.setItem(LS_KEY, next ? '1' : '0');
    } catch {
      /* private mode / storage disabled — the toggle still works in-session */
    }
  }, [enabled, supported]);

  // Tab title + favicon badge follow the live turn state; restored on unmount.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (active && yourTurn) {
      document.title = '● Your move — Imperium';
      setFavicon(FAVICON_ALERT);
    } else {
      document.title = baseTitle.current;
      setFavicon(FAVICON_BASE);
    }
    return () => {
      document.title = baseTitle.current;
      setFavicon(FAVICON_BASE);
    };
  }, [active, yourTurn]);

  // Push + chime fire once, on the rising edge, only while the tab is hidden.
  useEffect(() => {
    const was = prevTurn.current;
    prevTurn.current = yourTurn && active;
    if (!active || !enabled) return;
    if (was || !yourTurn) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') return;
    if (supported && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch {
        /* some browsers require a service worker for Notification — ignore */
      }
    }
    playChime();
  }, [yourTurn, active, enabled, supported, title, body]);

  return { supported, enabled, permission, toggle };
}
