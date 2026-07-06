/**
 * Region backdrops: wide, edge-to-edge scenes drawn behind a whole cluster of
 * board spaces so a region reads like one continuous place (a stretch of dunes,
 * a city skyline, a colonnade, the CHOAM exchange). Each is original inline SVG
 * tinted by `color`. Per-space and per-card illustration lives in `cardArt.tsx`.
 */
export type BackdropScene = 'dunes' | 'skyline' | 'columns' | 'exchange';

const COLUMN_XS = [16, 60, 104, 148, 192, 236, 280];

export function RegionBackdrop({
  scene,
  color,
  opacity = 1,
}: {
  scene: BackdropScene;
  color: string;
  opacity?: number;
}) {
  return (
    <svg
      viewBox="0 0 320 90"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ color, opacity }}
      aria-hidden
    >
      {scene === 'dunes' && (
        <>
          <circle cx="268" cy="20" r="13" fill="currentColor" opacity="0.4" />
          <path d="M0 56 Q54 40 112 52 Q170 64 232 48 Q282 36 320 50 V90 H0 Z" fill="currentColor" opacity="0.22" />
          <path d="M0 68 Q60 54 132 64 Q204 74 262 60 Q296 54 320 62 V90 H0 Z" fill="currentColor" opacity="0.4" />
          <path d="M0 80 Q84 71 168 78 Q244 84 320 75 V90 H0 Z" fill="currentColor" opacity="0.62" />
        </>
      )}
      {scene === 'skyline' && (
        <>
          <path
            d="M0 90 V64 h12 v-8 h9 v8 h15 v-20 h9 v20 h16 v-12 h11 v12 h18 v-28 h9 v28 h15 v-10 h11 v10 h17 v-18 h9 v18 h16 v-24 h9 v24 h15 v-9 h11 v9 h17 v-16 h9 v16 h14 v-22 h9 v22 h13 V90 Z"
            fill="currentColor"
            opacity="0.4"
          />
          <path d="M0 90 V78 h300 V90 Z" fill="currentColor" opacity="0.2" />
        </>
      )}
      {scene === 'columns' && (
        <>
          <path d="M20 30 L160 12 L300 30 Z" fill="currentColor" opacity="0.22" />
          <rect x="8" y="30" width="304" height="6" fill="currentColor" opacity="0.28" />
          {COLUMN_XS.map((x) => (
            <g key={x} fill="currentColor" opacity="0.32">
              <rect x={x - 2} y="36" width="20" height="4" />
              <rect x={x} y="40" width="16" height="50" />
            </g>
          ))}
          <rect x="0" y="86" width="320" height="4" fill="currentColor" opacity="0.28" />
        </>
      )}
      {scene === 'exchange' && (
        <>
          <g stroke="currentColor" strokeWidth="1.4" opacity="0.16">
            <path d="M0 22 H320 M0 38 H320 M0 54 H320 M0 70 H320 M0 86 H320" />
          </g>
          {[46, 250].map((cx) => (
            <g key={cx} fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.34">
              <ellipse cx={cx} cy="74" rx="24" ry="6" />
              <ellipse cx={cx} cy="63" rx="24" ry="6" />
              <ellipse cx={cx} cy="52" rx="24" ry="6" />
            </g>
          ))}
          <g fill="currentColor" opacity="0.28">
            <path d="M160 20 L172 30 L160 40 L148 30 Z" />
            <circle cx="160" cy="30" r="3" fill="#00000066" />
          </g>
        </>
      )}
    </svg>
  );
}
