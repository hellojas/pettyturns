import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Wraps a value that should briefly flash when it changes — the cause-and-effect
 * motion that ties a log event (a VP gained, troops committed) to the number on
 * screen. Purely presentational: it compares the incoming `value` to the last
 * render and toggles the `anim-flash` class for one animation cycle. Respects
 * `prefers-reduced-motion` via the CSS (the keyframe is disabled there).
 */
export function FlashValue({
  value,
  children,
  className = '',
}: {
  /** The tracked value; a change from the previous render triggers the flash. */
  value: number | string;
  children: ReactNode;
  className?: string;
}) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`inline-flex ${flash ? 'anim-flash' : ''} ${className}`}>{children}</span>
  );
}
