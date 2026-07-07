import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Shows an enlarged, readable copy of small grid content (market / hand cards)
 * in a body-level portal while the anchor is hovered or keyboard-focused. The
 * clone is a true transform-`scale` of the inline element captured at its live
 * size, so text and chips enlarge uniformly rather than merely getting wider.
 *
 * The preview is `pointer-events-none` (it never steals hover) and decorative
 * (`aria-hidden`) — the real, interactive card stays in the flow underneath. The
 * appear keyframe is reduced-motion-guarded, so it snaps instead of animating
 * for users who ask for less motion.
 */
const SCALE = 1.65;
const GAP = 12;

interface Anchor {
  left: number;
  right: number;
  top: number;
  width: number;
  height: number;
}

export default function HoverPreview({
  children,
  preview,
  className = '',
  disabled = false,
}: {
  children: ReactNode;
  /** The node to enlarge (usually the same card face rendered again). */
  preview: ReactNode;
  className?: string;
  /** Skip the preview entirely (e.g. on touch / narrow screens). */
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const show = () => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    setAnchor({ left: r.left, right: r.right, top: r.top, width: r.width, height: r.height });
  };
  const hide = () => setAnchor(null);

  // A stale rect after scrolling would float the preview in the wrong place —
  // just dismiss it; the next hover re-measures.
  useEffect(() => {
    if (!anchor) return;
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [anchor]);

  let portal: ReactNode = null;
  if (anchor && typeof document !== 'undefined') {
    const pw = anchor.width * SCALE;
    const ph = anchor.height * SCALE;
    let left = anchor.right + GAP;
    if (left + pw > window.innerWidth - 8) left = anchor.left - GAP - pw;
    left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - pw - 8));
    let top = anchor.top + anchor.height / 2 - ph / 2;
    top = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - ph - 8));
    portal = createPortal(
      <div
        className="anim-zoom-in pointer-events-none fixed z-[90]"
        style={{ left, top, width: pw, height: ph, filter: 'drop-shadow(0 14px 32px rgba(0,0,0,0.72))' }}
        aria-hidden
      >
        <div style={{ width: anchor.width, height: anchor.height, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
          {preview}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {portal}
    </div>
  );
}
