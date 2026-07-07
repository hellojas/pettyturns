import { useEffect, useRef, useState } from 'react';
import { IMP_SPACES } from '../../imperium/data/spaces';
import type { ImpVisibleState } from '../../imperium/types';

/** An original sandworm silhouette (self-contained so it survives art refactors). */
function WormEmblem({ size = 112, color = '#e0a52b', opacity = 0.85 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ color, opacity, display: 'block' }} aria-hidden>
      <path
        d="M6 40 C6 30 15 30 17 34 C19 39 22 22 27 17 C31 13 40 12 43 8 C37 12 33 18 31 24 C29 31 25 40 18 40 Z"
        fill="currentColor"
      />
      <path
        d="M40 8 l3 -1.5 M40.5 11 h3 M40 14 l3 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A one-shot sandworm sweep across the desert band, fired when a fresh spice
 * event lands in the log (a melange sale, or an agent harvesting on a
 * maker/desert space). Purely decorative and reduced-motion-guarded (the
 * `.anim-worm` keyframe is disabled, so the worm simply doesn't appear).
 *
 * Mount this inside a `position: relative` container (the Deep Desert band); it
 * fills that container and clips the worm to it.
 */
function latestSpiceSeq(view: ImpVisibleState): number | null {
  for (let i = view.log.length - 1; i >= 0; i--) {
    const e = view.log[i];
    if (e.event === 'melange.sold') return e.seq;
    if (e.event === 'agent.placed') {
      const sid = typeof e.data?.spaceId === 'string' ? e.data.spaceId : null;
      const sp = sid ? IMP_SPACES[sid] : null;
      if (sp && (sp.maker || sp.group === 'desert')) return e.seq;
    }
  }
  return null;
}

export default function WormSweep({ view }: { view: ImpVisibleState }) {
  const seq = latestSpiceSeq(view);
  // Don't fire for the event already present when this mounts (e.g. on reload).
  const seen = useRef<number | null>(seq);
  const [fireSeq, setFireSeq] = useState<number | null>(null);

  useEffect(() => {
    if (seq != null && seq !== seen.current) {
      seen.current = seq;
      setFireSeq(seq);
      const t = setTimeout(() => setFireSeq(null), 1900);
      return () => clearTimeout(t);
    }
  }, [seq]);

  if (fireSeq == null) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20" aria-hidden>
      {/* full-width so the keyframe's translateX % spans the whole band */}
      <div key={fireSeq} className="anim-worm absolute inset-x-0 bottom-1 h-0">
        <div className="absolute bottom-0 left-0" style={{ filter: 'drop-shadow(0 2px 6px #000a)' }}>
          <WormEmblem size={112} color="#e0a52b" opacity={0.85} />
        </div>
      </div>
    </div>
  );
}
