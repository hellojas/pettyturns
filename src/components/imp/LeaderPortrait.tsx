import { IMP_LEADERS } from '../../imperium/data/leaders';

/**
 * A character portrait for a leader. Renders the owner-supplied image when a
 * leader def carries a `portrait` (a URL or a path under /public — people who
 * own the physical game can drop their own art in), and otherwise falls back to
 * an original, generated heraldic "cameo": a bust silhouette in the leader's
 * house colors with their monogram. No copyrighted art ships in this repo.
 */

/** Hand-tuned house palettes per leader; unknown ids fall back to a hash. */
const LEADER_STYLE: Record<string, { bg: [string, string]; ink: string }> = {
  paulAtreides: { bg: ['#2f6b4f', '#0f2016'], ink: '#bfe9cf' },
  dukeLeto: { bg: ['#3a6b3a', '#131f10'], ink: '#dfeab0' },
  baronHarkonnen: { bg: ['#8a4a1e', '#241009'], ink: '#f2c9a0' },
  glossuRabban: { bg: ['#8a2f2f', '#210b0b'], ink: '#f0b3a8' },
  arianaThorvald: { bg: ['#2f8a76', '#0d211c'], ink: '#b3ecdd' },
  memnonThorvald: { bg: ['#5e7a2f', '#171f0d'], ink: '#d9ebac' },
  helenaRichese: { bg: ['#5a5f86', '#14161f'], ink: '#c8cbe6' },
  ilbanRichese: { bg: ['#5f6b74', '#14181c'], ink: '#cdd6dd' },
};

const TITLES = new Set(['duke', 'count', 'countess', 'earl', 'baron', 'lady', 'the', 'beast', 'iv']);

/** House monogram: first letters of the two most distinctive name words. */
function monogram(name: string): string {
  const words = name
    .replace(/["'".]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !TITLES.has(w.toLowerCase()));
  const first = words[0]?.[0] ?? name[0] ?? '?';
  const second = words[words.length - 1]?.[0] ?? '';
  return (first + (words.length > 1 ? second : '')).toUpperCase();
}

function hashStyle(id: string): { bg: [string, string]; ink: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return { bg: [`hsl(${hue} 45% 34%)`, `hsl(${hue} 45% 9%)`], ink: `hsl(${hue} 55% 82%)` };
}

export default function LeaderPortrait({
  leaderId,
  size = 44,
  ring,
  className = '',
}: {
  leaderId: string;
  size?: number;
  /** Optional seat-color frame drawn around the portrait. */
  ring?: string;
  className?: string;
}) {
  const leader = IMP_LEADERS[leaderId];
  const name = leader?.name ?? leaderId;
  const style = LEADER_STYLE[leaderId] ?? hashStyle(leaderId);
  const initials = monogram(name);
  const gid = `lp-${leaderId}`;
  const frame = ring ? { boxShadow: `0 0 0 2px ${ring}, 0 1px 3px #0008` } : undefined;

  // Owner-supplied art: render it as a cover image inside the same frame.
  if (leader?.portrait) {
    return (
      <img
        src={leader.portrait}
        alt={name}
        title={name}
        width={size}
        height={size}
        className={`rounded-md object-cover shrink-0 ${className}`}
        style={{ width: size, height: size, ...frame }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={name}
      className={`rounded-md shrink-0 ${className}`}
      style={{ width: size, height: size, ...frame }}
    >
      <defs>
        <radialGradient id={`${gid}-bg`} cx="50%" cy="34%" r="78%">
          <stop offset="0%" stopColor={style.bg[0]} />
          <stop offset="100%" stopColor={style.bg[1]} />
        </radialGradient>
        <clipPath id={`${gid}-clip`}>
          <rect x="0" y="0" width="100" height="100" rx="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${gid}-clip)`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${gid}-bg)`} />
        {/* Cameo bust silhouette */}
        <g fill={style.ink} opacity="0.9">
          <circle cx="50" cy="40" r="19" />
          <path d="M18 100 C18 74 34 63 50 63 C66 63 82 74 82 100 Z" />
        </g>
        {/* Monogram badge, bottom-left */}
        <rect x="4" y="79" width={initials.length > 1 ? 30 : 20} height="17" rx="4" fill="#000000aa" />
        <text
          x={4 + (initials.length > 1 ? 15 : 10)}
          y="91.5"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill={style.ink}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {initials}
        </text>
        {/* Vignette for depth */}
        <rect x="0" y="0" width="100" height="100" fill="url(#none)" />
        <rect x="0" y="0" width="100" height="100" rx="10" fill="none" stroke="#ffffff18" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
