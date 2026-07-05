import type { ReactNode } from 'react';
import type { AgentIcon } from '../../imperium/types';

/**
 * Shared iconography for the Imperium board + cards. Every emblem is a crisp
 * inline SVG drawn with `currentColor`, so a single `color` drives its tint and
 * the whole set reads as one visual language (no emoji-font inconsistency).
 */
export type IconName =
  | AgentIcon
  | 'spice'
  | 'solari'
  | 'water'
  | 'troops'
  | 'sword'
  | 'persuasion'
  | 'intrigue'
  | 'draw'
  | 'vp'
  | 'influence'
  | 'trash';

/** Canonical tint per icon; faction/location colors double as region accents. */
export const ICON_COLORS: Record<IconName, string> = {
  emperor: '#d24b3e',
  spacingGuild: '#e08a2b',
  beneGesserit: '#a274d6',
  fremen: '#2fa88f',
  landsraad: '#d9b04b',
  city: '#6b93c0',
  spiceTrade: '#e0a52b',
  spice: '#e0a52b',
  solari: '#e6c34a',
  water: '#4aa3df',
  troops: '#d24b3e',
  sword: '#e0604f',
  persuasion: '#e3bd78',
  intrigue: '#b48be0',
  draw: '#cdbfa8',
  vp: '#f2c94c',
  influence: '#e3bd78',
  trash: '#9c8770',
};

const PATHS: Record<IconName, ReactNode> = {
  // --- Faction / location emblems ---
  emperor: (
    <>
      <path d="M3 17.5 L5.2 8 L9 12 L12 5.5 L15 12 L18.8 8 L21 17.5 Z" fill="currentColor" />
      <rect x="4" y="18.5" width="16" height="2.4" rx="1" fill="currentColor" />
    </>
  ),
  spacingGuild: (
    <>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="currentColor" opacity="0.35" />
      <path d="M12 6.5 L17.5 12 L12 17.5 L6.5 12 Z" fill="currentColor" />
    </>
  ),
  beneGesserit: (
    <>
      <path
        d="M2 12 C6 5.5 18 5.5 22 12 C18 18.5 6 18.5 2 12 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
    </>
  ),
  fremen: (
    <path
      d="M4.5 20.5 C4 12 10 5 19.5 4.5 C13.5 7 11 11.5 12.4 16 C9.5 15 6.8 16.5 4.5 20.5 Z"
      fill="currentColor"
    />
  ),
  landsraad: (
    <>
      <path d="M12 3.5 L21 9 L3 9 Z" fill="currentColor" />
      <rect x="5" y="10" width="2.4" height="8" fill="currentColor" />
      <rect x="10.8" y="10" width="2.4" height="8" fill="currentColor" />
      <rect x="16.6" y="10" width="2.4" height="8" fill="currentColor" />
      <rect x="3.5" y="18.6" width="17" height="2.2" rx="0.8" fill="currentColor" />
    </>
  ),
  city: (
    <path
      d="M4 21 V11 h3 V8 h2 v3 h3 V6 h2 v5 h3 V8 h2 v3 h1 V21 Z"
      fill="currentColor"
    />
  ),
  spiceTrade: (
    <>
      <path d="M12 2.5 L20 7 V15.4 L12 20 L4 15.4 V7 Z" fill="currentColor" opacity="0.9" />
      <circle cx="9.6" cy="10" r="1.3" fill="#2b2118" />
      <circle cx="14.4" cy="10" r="1.3" fill="#2b2118" />
      <circle cx="12" cy="14" r="1.3" fill="#2b2118" />
    </>
  ),

  // --- Resource glyphs ---
  spice: (
    <>
      <path d="M12 3 L18.5 12 L12 21 L5.5 12 Z" fill="currentColor" />
      <circle cx="12" cy="10" r="1.2" fill="#2b2118" />
      <circle cx="10.4" cy="13" r="1.1" fill="#2b2118" />
      <circle cx="13.6" cy="13" r="1.1" fill="#2b2118" />
    </>
  ),
  solari: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" />
      <circle cx="12" cy="12" r="5.6" fill="none" stroke="#2b2118" strokeWidth="1.3" opacity="0.55" />
      <path d="M12 7.5 V16.5 M9.8 9.6 h4.4 M9.8 14.4 h4.4" stroke="#2b2118" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  water: (
    <path
      d="M12 3 C12 3 5 11 5 15.2 A7 7 0 0 0 19 15.2 C19 11 12 3 12 3 Z"
      fill="currentColor"
    />
  ),
  troops: (
    <path
      d="M12 3 L20 6 V11.5 C20 16.5 16.4 19.6 12 21 C7.6 19.6 4 16.5 4 11.5 V6 Z"
      fill="currentColor"
    />
  ),
  sword: (
    <>
      <path d="M20 3 L21 4 L11.5 14 L10 11.5 Z" fill="currentColor" />
      <path d="M11 13 L11.6 13.6 L7.5 18 L5.5 18.5 L6 16.5 Z" fill="currentColor" />
      <rect x="4.4" y="17.2" width="4.4" height="1.8" rx="0.9" transform="rotate(-45 6.6 18.1)" fill="currentColor" />
    </>
  ),
  persuasion: (
    <path
      d="M12 2 L14.6 9 L22 12 L14.6 15 L12 22 L9.4 15 L2 12 L9.4 9 Z"
      fill="currentColor"
    />
  ),
  intrigue: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="1.6" fill="currentColor" opacity="0.9" />
      <path d="M4.6 7 L12 12.5 L19.4 7" fill="none" stroke="#2b2118" strokeWidth="1.4" opacity="0.7" />
    </>
  ),
  draw: (
    <>
      <rect x="6.5" y="4" width="11" height="16" rx="1.8" fill="currentColor" />
      <rect x="9" y="7" width="6" height="1.6" rx="0.8" fill="#2b2118" opacity="0.55" />
      <rect x="9" y="10.4" width="6" height="1.6" rx="0.8" fill="#2b2118" opacity="0.55" />
    </>
  ),
  vp: (
    <path
      d="M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 13.9 L18 20.4 L12 17 L6 20.4 L7.4 13.9 L2.5 9.4 L9.1 8.6 Z"
      fill="currentColor"
    />
  ),
  influence: (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.28" />
      <path d="M12 6 L18 15 H6 Z" fill="currentColor" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7 h14 l-1.2 13 a1 1 0 0 1-1 0.9 H7.2 a1 1 0 0 1-1-0.9 Z" fill="currentColor" />
      <rect x="4" y="5" width="16" height="2.4" rx="1" fill="currentColor" />
      <rect x="9.5" y="3" width="5" height="2.4" rx="1" fill="currentColor" />
    </>
  ),
};

/** A single crisp emblem tinted by `color` (defaults to its canonical tint). */
export function Icon({
  name,
  size = 16,
  color,
  className,
  title,
}: {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ color: color ?? ICON_COLORS[name], display: 'inline-block', verticalAlign: 'middle' }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
