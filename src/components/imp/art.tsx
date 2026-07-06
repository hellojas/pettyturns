import type { ReactNode } from 'react';
import type { ImpCardDef, SpaceId } from '../../imperium/types';

/**
 * Original scene emblems used as the "art" on board spaces and cards — a
 * throne, a heighliner, dunes, a sandworm, crossed blades, and so on. Each is a
 * compact silhouette drawn with `currentColor` so one tint drives it; they sit
 * faded behind a tile's text, giving every location and card a bit of
 * illustration the way the physical board does. All emblems are original, not
 * reproductions of the game's art.
 */
export type Motif =
  | 'throne' | 'coins' | 'heighliner' | 'portal' | 'helix' | 'eye' | 'crysknife'
  | 'drop' | 'columns' | 'swords' | 'banner' | 'podium' | 'scroll' | 'spiceCoin'
  | 'city' | 'fortress' | 'flask' | 'cave' | 'dunes' | 'spiceField' | 'worm' | 'ring';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const MOTIFS: Record<Motif, ReactNode> = {
  throne: (
    <>
      <path d="M18 13 l1.6-4 2.4 2.6 2-3 2 3 2.4-2.6 1.6 4 Z" fill="currentColor" />
      <rect x="18" y="13" width="12" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="24" width="20" height="5" rx="1" fill="currentColor" />
      <rect x="16" y="29" width="3" height="9" fill="currentColor" />
      <rect x="29" y="29" width="3" height="9" fill="currentColor" />
    </>
  ),
  coins: (
    <g {...S} strokeWidth={1.6}>
      <ellipse cx="24" cy="32" rx="11" ry="3.4" />
      <ellipse cx="24" cy="27" rx="11" ry="3.4" />
      <ellipse cx="24" cy="22" rx="11" ry="3.4" />
    </g>
  ),
  heighliner: (
    <>
      <ellipse cx="24" cy="26" rx="18" ry="5" fill="currentColor" />
      <rect x="20" y="15" width="8" height="8" rx="1.5" fill="currentColor" />
      <rect x="7" y="25" width="34" height="1.8" rx="0.9" fill="currentColor" opacity="0.6" />
    </>
  ),
  portal: (
    <>
      <path fillRule="evenodd" d="M24 9 a15 15 0 1 0 0.01 0 Z M24 16 a8 8 0 1 1 -0.01 0 Z" fill="currentColor" />
      <circle cx="24" cy="24" r="3.5" fill="currentColor" />
    </>
  ),
  helix: (
    <g {...S}>
      <path d="M17 9 Q31 16.5 17 24 Q3 31.5 17 39" />
      <path d="M31 9 Q17 16.5 31 24 Q45 31.5 31 39" />
      <path d="M19 12 h10 M16.5 18 h15 M16.5 30 h15 M19 36 h10" strokeWidth={1.5} />
    </g>
  ),
  eye: (
    <>
      <path {...S} d="M6 24 Q24 11 42 24 Q24 37 6 24 Z" />
      <circle cx="24" cy="24" r="5" fill="currentColor" />
    </>
  ),
  crysknife: (
    <path d="M13 37 C22 28 33 16 39 9 C34 22 25 33 17 40 C15 40.5 13.5 39.5 13 37 Z" fill="currentColor" />
  ),
  drop: (
    <path d="M24 8 C24 8 13 22 13 30 a11 11 0 0 0 22 0 C35 22 24 8 24 8 Z" fill="currentColor" />
  ),
  columns: (
    <>
      <path d="M11 13 L24 6 L37 13 Z" fill="currentColor" />
      <rect x="10" y="14" width="28" height="3" fill="currentColor" />
      <rect x="13" y="18" width="3.5" height="17" fill="currentColor" />
      <rect x="22.2" y="18" width="3.5" height="17" fill="currentColor" />
      <rect x="31.5" y="18" width="3.5" height="17" fill="currentColor" />
      <rect x="10" y="35" width="28" height="3" rx="1" fill="currentColor" />
    </>
  ),
  swords: (
    <>
      <g {...S} strokeWidth={2.6}>
        <path d="M12 13 L34 35" />
        <path d="M36 13 L14 35" />
      </g>
      <circle cx="12" cy="13" r="2.2" fill="currentColor" />
      <circle cx="36" cy="13" r="2.2" fill="currentColor" />
    </>
  ),
  banner: (
    <>
      <rect x="14" y="8" width="2.6" height="32" rx="1" fill="currentColor" />
      <path d="M16.6 9 h18 l-4.5 5.5 4.5 5.5 h-18 Z" fill="currentColor" />
    </>
  ),
  podium: (
    <>
      <circle cx="24" cy="12" r="3.2" fill="currentColor" />
      <path d="M18 18 h12 l-2.2 8 h-7.6 Z" fill="currentColor" />
      <rect x="22" y="26" width="4" height="9" fill="currentColor" />
      <rect x="16" y="35" width="16" height="3" rx="1" fill="currentColor" />
    </>
  ),
  scroll: (
    <>
      <rect x="13" y="12" width="19" height="21" rx="2" fill="currentColor" />
      <path d="M17 18 h11 M17 22 h11 M17 26 h8" {...S} stroke="#00000055" strokeWidth={1.3} />
      <circle cx="30" cy="34" r="3.4" fill="currentColor" />
    </>
  ),
  spiceCoin: (
    <>
      <path d="M17 12 L26 17 L26 27 L17 32 L8 27 L8 17 Z" fill="currentColor" transform="translate(2 2)" />
      <circle cx="32" cy="30" r="8" fill="currentColor" />
    </>
  ),
  city: (
    <path
      d="M8 38 V22 h4 v-4 h3 v4 h4 V15 h3 v7 h4 v-9 h3 v9 h4 v-4 h3 v4 h4 v16 Z"
      fill="currentColor"
    />
  ),
  fortress: (
    <>
      <path d="M9 38 V17 h4 v-4 h4 v4 h3 v-6 h4 v6 h3 v-4 h4 v4 h4 v21 Z" fill="currentColor" />
      <rect x="21" y="28" width="6" height="10" fill="#00000055" />
    </>
  ),
  flask: (
    <path
      d="M20 9 h8 v2 h-2 v8 l6.5 13 a2.2 2.2 0 0 1 -2 3.2 H17.5 a2.2 2.2 0 0 1 -2 -3.2 L22 19 v-8 h-2 Z"
      fill="currentColor"
    />
  ),
  cave: (
    <path
      d="M9 38 V26 a15 15 0 0 1 30 0 V38 h-9 V27 a6 6 0 0 0 -12 0 V38 Z"
      fill="currentColor"
    />
  ),
  dunes: (
    <>
      <circle cx="34" cy="15" r="5" fill="currentColor" />
      <path d="M4 34 Q14 26 22 32 Q30 38 44 30 V40 H4 Z" fill="currentColor" />
      <path d="M6 27 Q16 21 24 26 Q32 31 42 25" {...S} strokeWidth={1.5} opacity="0.6" />
    </>
  ),
  spiceField: (
    <>
      <circle cx="34" cy="14" r="4" fill="currentColor" />
      <path d="M6 32 Q24 24 42 32 Q24 40 6 32 Z" fill="currentColor" />
      <circle cx="18" cy="31" r="1.4" fill="#00000066" />
      <circle cx="24" cy="33" r="1.4" fill="#00000066" />
      <circle cx="30" cy="31" r="1.4" fill="#00000066" />
    </>
  ),
  worm: (
    <>
      <path
        d="M6 40 C6 30 15 30 17 34 C19 39 22 22 27 17 C31 13 40 12 43 8 C37 12 33 18 31 24 C29 31 25 40 18 40 Z"
        fill="currentColor"
      />
      <path d="M40 8 l3 -1.5 M40.5 11 h3 M40 14 l3 1.5" {...S} strokeWidth={1.4} />
    </>
  ),
  ring: (
    <>
      <circle cx="24" cy="27" r="10" fill="none" stroke="currentColor" strokeWidth={4} />
      <path d="M18 17 l6 -7 6 7 -3 4 h-6 Z" fill="currentColor" />
    </>
  ),
};

/** A single scene emblem, tinted by `color`, for use as faded tile/card art. */
export function ArtEmblem({
  motif,
  size = 44,
  color = 'currentColor',
  opacity = 1,
  className,
}: {
  motif: Motif;
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      style={{ color, opacity, display: 'block' }}
      aria-hidden
    >
      {MOTIFS[motif]}
    </svg>
  );
}

/** Per-space scene art (covers every board space). */
export const SPACE_ART: Record<SpaceId, Motif> = {
  conspire: 'throne',
  wealth: 'coins',
  heighliner: 'heighliner',
  foldspaceSpace: 'portal',
  selectiveBreeding: 'helix',
  secrets: 'eye',
  hardyWarriors: 'crysknife',
  stillsuits: 'drop',
  highCouncil: 'columns',
  mentat: 'eye',
  swordmaster: 'swords',
  rallyTroops: 'banner',
  hallOfOratory: 'podium',
  secureContract: 'scroll',
  sellMelange: 'spiceCoin',
  arrakeen: 'city',
  carthag: 'fortress',
  researchStation: 'flask',
  sietchTabr: 'cave',
  imperialBasin: 'spiceField',
  haggaBasin: 'dunes',
  theGreatFlat: 'worm',
};

/** Named-card overrides where the faction fallback would pick a weaker motif. */
const CARD_ART: Record<string, Motif> = {
  sardaukarLegion: 'swords',
  fedaykinDeathCommando: 'swords',
  gurneyHalleck: 'swords',
  duncanIdaho: 'swords',
  crysknife: 'crysknife',
  desertPower: 'worm',
  theSpiceMustFlow: 'spiceField',
  spiceHunter: 'spiceField',
  spiceSmugglers: 'spiceField',
  smugglersThopter: 'heighliner',
  spiceRefinery: 'spiceField',
  chani: 'crysknife',
  stilgar: 'crysknife',
  choamDirectorship: 'scroll',
  shaddamCorrino: 'throne',
  piterDeVries: 'eye',
  arrakisLiaison: 'city',
  foldspace: 'portal',
};

/** Choose a scene emblem for any card: explicit override, then by faction/type. */
export function cardMotif(def: ImpCardDef): Motif {
  if (CARD_ART[def.id]) return CARD_ART[def.id];
  if (def.signet) return 'ring';
  const ic = def.icons;
  if (ic.includes('emperor')) return 'throne';
  if (ic.includes('spacingGuild')) return 'heighliner';
  if (ic.includes('beneGesserit')) return 'eye';
  if (ic.includes('fremen')) return 'crysknife';
  if (ic.includes('city')) return 'city';
  if (ic.includes('spiceTrade')) return 'spiceField';
  if (ic.includes('landsraad')) return 'banner';
  return 'scroll';
}
