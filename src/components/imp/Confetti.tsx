import { useMemo } from 'react';

/**
 * A CSS-only spice-gold confetti burst for the winner moment. Renders a fixed
 * overlay of falling flakes whose positions/colors/timings are memoised so they
 * don't re-randomise on every render. Purely decorative (`aria-hidden`) and
 * fully suppressed under `prefers-reduced-motion` (the `.anim-confetti` keyframe
 * is disabled and the flakes are `display:none`d there).
 */
const FLAKE_COLORS = ['#f2c94c', '#e3bd78', '#cd8630', '#f6dc93', '#b56b26'];

export default function Confetti({ count = 70, className = '' }: { count?: number; className?: string }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        left: Math.random() * 100,
        color: FLAKE_COLORS[i % FLAKE_COLORS.length],
        delay: Math.random() * 1.6,
        fall: 1.9 + Math.random() * 1.8,
        spin: 240 + Math.random() * 520,
        size: 5 + Math.random() * 5,
        round: Math.random() > 0.5,
      })),
    [count],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {flakes.map((f) => (
        <span
          key={f.key}
          className="anim-confetti absolute top-0"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size * (f.round ? 1 : 1.6),
            background: f.color,
            borderRadius: f.round ? '50%' : '1px',
            // custom props consumed by the imp-confetti keyframe
            ['--delay' as string]: `${f.delay}s`,
            ['--fall' as string]: `${f.fall}s`,
            ['--spin' as string]: `${f.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
