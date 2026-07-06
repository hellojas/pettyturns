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
  | 'trash'
  // --- UI affordances (replace emoji/text glyphs across the app) ---
  | 'undo'
  | 'redo'
  | 'play'
  | 'close'
  | 'refresh'
  | 'back'
  | 'lock'
  | 'crown';

/**
 * Canonical tint per icon, aligned to the Dune: Imperium rulebook: the four
 * faction agent-icons keep their box colors (Corrino red, Guild amber, Bene
 * Gesserit purple, Fremen blue), the three location icons are the printed
 * pentagon-green / circle-blue / triangle-gold, and resources match their
 * tokens — silver Solari, orange melange, blue water, red troop cubes, gold
 * Victory-point orb and gold Intrigue emblem.
 */
export const ICON_COLORS: Record<IconName, string> = {
  emperor: '#c0392b',
  spacingGuild: '#e08a2b',
  beneGesserit: '#8e5bd0',
  fremen: '#2fa3c9',
  landsraad: '#4a9d4f',
  city: '#5c7fd0',
  spiceTrade: '#d9a12b',
  spice: '#e0841f',
  solari: '#c9ccd1',
  water: '#4aa3df',
  troops: '#c0392b',
  sword: '#d94f3d',
  persuasion: '#e3bd78',
  intrigue: '#d9b64a',
  draw: '#cdbfa8',
  vp: '#e6c34a',
  influence: '#e3bd78',
  trash: '#9c8770',
  undo: '#cdbfa8',
  redo: '#cdbfa8',
  play: '#cdbfa8',
  close: '#cdbfa8',
  refresh: '#cdbfa8',
  back: '#cdbfa8',
  lock: '#b79bd8',
  crown: '#e6c34a',
};

const PATHS: Record<IconName, ReactNode> = {
  // --- Faction agent-icons (rulebook symbols) ---
  // Emperor — Sardaukar / House Corrino helm.
  emperor: (
    <>
      <path d="M11 2.5 h2 v4.2 h-2 Z" fill="currentColor" />
      <path d="M5 13.5 C5 8.4 8 5 12 5 C16 5 19 8.4 19 13.5 L16.4 13.5 C16.4 9.6 14.7 7.6 12 7.6 C9.3 7.6 7.6 9.6 7.6 13.5 Z" fill="currentColor" />
      <path d="M8 13.2 h8 l-1.3 4.6 L12 21.4 L9.3 17.8 Z" fill="currentColor" />
      <path d="M10.4 14 h3.2 v1.8 h-3.2 Z" fill="#1a120b" opacity="0.7" />
    </>
  ),
  // Spacing Guild — foldspace infinity.
  spacingGuild: (
    <g fill="none" stroke="currentColor" strokeWidth="2.6">
      <circle cx="8" cy="12" r="3.7" />
      <circle cx="16" cy="12" r="3.7" />
    </g>
  ),
  // Bene Gesserit — mirrored crescents around a central almond.
  beneGesserit: (
    <>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9.3 4.3 C4.4 8 4.4 16 9.3 19.7" />
        <path d="M14.7 4.3 C19.6 8 19.6 16 14.7 19.7" />
      </g>
      <ellipse cx="12" cy="12" rx="2.1" ry="3.6" fill="currentColor" />
    </>
  ),
  // Fremen — maker hook / crescent inside a ring.
  fremen: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <path
        d="M7.5 6.5 C12.5 6 16.5 9 16.5 13.4 C16.5 16.6 14.2 18.6 11.4 18.2 C13 16.6 13.3 14 11.8 12.1 C10.4 10.3 8.4 9.6 6.2 10 C6.4 8.6 6.8 7.4 7.5 6.5 Z"
        fill="currentColor"
      />
    </>
  ),

  // --- Location agent-icons (rulebook shapes) ---
  landsraad: <path d="M12 2.8 L20.5 9 L17.2 19.2 H6.8 L3.5 9 Z" fill="currentColor" />,
  city: (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="#12100c" strokeWidth="1.6" opacity="0.5" />
    </>
  ),
  spiceTrade: <path d="M12 3.5 L21 19.5 H3 Z" fill="currentColor" />,

  // --- Resource glyphs (match the physical tokens) ---
  // Spice / melange — orange hexagon with grains.
  spice: (
    <>
      <path d="M12 2.6 L20.1 7.3 V16.7 L12 21.4 L3.9 16.7 V7.3 Z" fill="currentColor" />
      <circle cx="12" cy="9.6" r="1.15" fill="#2b1a0b" opacity="0.85" />
      <circle cx="10.2" cy="13" r="1.05" fill="#2b1a0b" opacity="0.85" />
      <circle cx="13.8" cy="13" r="1.05" fill="#2b1a0b" opacity="0.85" />
    </>
  ),
  // Solari — silver coin.
  solari: (
    <>
      <circle cx="12" cy="12" r="8.6" fill="currentColor" />
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="#5c5f66" strokeWidth="1" opacity="0.5" />
      <circle cx="12" cy="12" r="5.4" fill="none" stroke="#5c5f66" strokeWidth="1.1" opacity="0.6" />
      <path d="M12 8.4 L13 11 L15.6 11 L13.5 12.7 L14.3 15.3 L12 13.7 L9.7 15.3 L10.5 12.7 L8.4 11 L11 11 Z" fill="#6b6f77" opacity="0.75" />
    </>
  ),
  // Water — teardrop.
  water: <path d="M12 2.8 C12 2.8 5 11 5 15.4 A7 7 0 0 0 19 15.4 C19 11 12 2.8 12 2.8 Z" fill="currentColor" />,
  // Troops — red garrison cube (isometric).
  troops: (
    <>
      <path d="M12 3 L20 7 L12 11 L4 7 Z" fill="currentColor" />
      <path d="M4 7 L12 11 V20.5 L4 16.5 Z" fill="currentColor" opacity="0.72" />
      <path d="M20 7 L12 11 V20.5 L20 16.5 Z" fill="currentColor" opacity="0.5" />
    </>
  ),
  // Sword — combat / swords count (a kindjal blade).
  sword: (
    <>
      <path d="M12 2.5 L14 6 V15 L12 17.5 L10 15 V6 Z" fill="currentColor" />
      <rect x="8.5" y="15.4" width="7" height="1.8" rx="0.9" fill="currentColor" />
      <rect x="11" y="17" width="2" height="4.2" rx="0.8" fill="currentColor" />
    </>
  ),
  // Persuasion — influence swirl.
  persuasion: (
    <path
      d="M12 3.4 C16.9 3.4 20.4 7.2 19.4 12 C18.5 16.3 14.3 18.5 11 16.6 C8.7 15.3 8.3 12 10.2 10.4 C11.7 9.1 13.9 9.5 14.6 11.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
    />
  ),
  // Intrigue — gold pinwheel emblem (matches the card back).
  intrigue: (
    <g fill="currentColor">
      <path d="M12 12 C12 7.5 13.4 4.5 16.5 4 C15.4 6.6 14 9.4 12 12 Z" />
      <path d="M12 12 C16.5 12 19.5 13.4 20 16.5 C17.4 15.4 14.6 14 12 12 Z" />
      <path d="M12 12 C12 16.5 10.6 19.5 7.5 20 C8.6 17.4 10 14.6 12 12 Z" />
      <path d="M12 12 C7.5 12 4.5 10.6 4 7.5 C6.6 8.6 9.4 10 12 12 Z" />
      <circle cx="12" cy="12" r="1.7" />
    </g>
  ),
  draw: (
    <>
      <rect x="6.5" y="4" width="11" height="16" rx="1.8" fill="currentColor" />
      <rect x="9" y="7" width="6" height="1.6" rx="0.8" fill="#2b2118" opacity="0.55" />
      <rect x="9" y="10.4" width="6" height="1.6" rx="0.8" fill="#2b2118" opacity="0.55" />
    </>
  ),
  // Victory point — gilded globe.
  vp: (
    <>
      <circle cx="12" cy="12" r="8.6" fill="currentColor" />
      <g fill="none" stroke="#8a6d1e" strokeWidth="1" opacity="0.7">
        <ellipse cx="12" cy="12" rx="3.4" ry="8.6" />
        <line x1="3.4" y1="12" x2="20.6" y2="12" />
        <path d="M4.6 8 H19.4 M4.6 16 H19.4" />
      </g>
    </>
  ),
  // Influence — faction cube marker.
  influence: (
    <>
      <path d="M12 3.5 L19.5 7.3 L12 11.1 L4.5 7.3 Z" fill="currentColor" />
      <path d="M4.5 7.3 L12 11.1 V19.5 L4.5 15.7 Z" fill="currentColor" opacity="0.72" />
      <path d="M19.5 7.3 L12 11.1 V19.5 L19.5 15.7 Z" fill="currentColor" opacity="0.5" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7 h14 l-1.2 13 a1 1 0 0 1-1 0.9 H7.2 a1 1 0 0 1-1-0.9 Z" fill="currentColor" />
      <rect x="4" y="5" width="16" height="2.4" rx="1" fill="currentColor" />
      <rect x="9.5" y="3" width="5" height="2.4" rx="1" fill="currentColor" />
    </>
  ),

  // --- UI affordances ---
  // Undo — counter-clockwise arrow.
  undo: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 9.5 H14 a5 5 0 0 1 0 10 H8.5" />
      <path d="M9.5 5.5 L5 9.5 L9.5 13.5" />
    </g>
  ),
  // Redo — clockwise arrow (mirror of undo).
  redo: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 9.5 H10 a5 5 0 0 0 0 10 H15.5" />
      <path d="M14.5 5.5 L19 9.5 L14.5 13.5" />
    </g>
  ),
  // Play — solid triangle.
  play: <path d="M8 5.5 L18.5 12 L8 18.5 Z" fill="currentColor" />,
  // Close — X.
  close: (
    <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
      <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
    </g>
  ),
  // Refresh — circular arrow.
  refresh: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 6.5 V11 H14.5" />
      <path d="M18.4 11 A7 7 0 1 0 19 15.5" />
    </g>
  ),
  // Back — leftward arrow.
  back: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <path d="M10.5 6.5 L5 12 L10.5 17.5" />
    </g>
  ),
  // Lock — padlock (private log entries).
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="1.6" fill="currentColor" />
      <path d="M8 10.5 V8 a4 4 0 0 1 8 0 v2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="14.6" r="1.5" fill="#1a120b" opacity="0.65" />
    </>
  ),
  // Crown — winner marker.
  crown: (
    <>
      <path d="M3.5 8.5 L7.5 13 L12 6 L16.5 13 L20.5 8.5 L18.5 19 H5.5 Z" fill="currentColor" />
      <rect x="5.5" y="19" width="13" height="2.2" rx="0.6" fill="currentColor" />
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
