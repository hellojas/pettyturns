import type { CardDefId, ImpCardDef, SpaceId, BoardSpaceDef } from '../../imperium/types';

/**
 * Illustrative card / board art — original, generated inline SVG "scenes".
 *
 * Every Dune-Imperium card and board space gets a small hand-drawn vignette so
 * the deck reads visually, not as a wall of text. Each motif is a layered scene
 * (twin-sun sky + dune silhouettes + a subject) drawn once and tinted by the
 * card's faction accent, so the whole set feels like one illustrated deck while
 * staying recognizable at a glance. No copyrighted art ships here — these are
 * simple heraldic silhouettes built from paths.
 *
 * A motif is a component taking an `accent` color and a `uid` (to keep gradient
 * ids unique when dozens of cards render at once). All motifs draw into the same
 * 120×56 banner box so they compose identically wherever art appears.
 */

const W = 120;
const H = 56;

interface MotifProps {
  accent: string;
  uid: string;
}

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb hex by lerping to white/black. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const ch = (c: number) => Math.round((t - c) * p + c);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Shared, atmospheric sky + dune backdrop every scene is painted over. It also
 * registers a per-card `-form` gradient (top-lit accent → shadowed base) so any
 * subject drawn with `ink(uid)` reads as a modeled, lit form rather than a flat
 * silhouette.
 */
function Backdrop({ uid, accent, suns = true }: MotifProps & { suns?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(accent, 0.12)} stopOpacity="0.55" />
          <stop offset="34%" stopColor="#2c1e13" />
          <stop offset="100%" stopColor="#130c07" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe6b0" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#f0b45a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#f0b45a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6c988" stopOpacity="0" />
          <stop offset="100%" stopColor="#f6c988" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`${uid}-dfar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2817" />
          <stop offset="100%" stopColor="#261a10" />
        </linearGradient>
        <linearGradient id={`${uid}-dnear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#42301c" />
          <stop offset="100%" stopColor="#140d08" />
        </linearGradient>
        <linearGradient id={`${uid}-form`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(accent, 0.45)} />
          <stop offset="52%" stopColor={accent} />
          <stop offset="100%" stopColor={shade(accent, -0.5)} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-sky)`} />
      {/* warm horizon haze */}
      <rect x="0" y="24" width={W} height="24" fill={`url(#${uid}-haze)`} />
      {suns && (
        <>
          {/* twin suns: a soft corona, a bright primary disc, a smaller second sun */}
          <circle cx="91" cy="15" r="21" fill={`url(#${uid}-glow)`} />
          <circle cx="90" cy="15" r="6.5" fill="#ffe7b0" opacity="0.96" />
          <circle cx="90" cy="15" r="3.6" fill="#fff7e2" />
          <circle cx="104" cy="12" r="3.3" fill="#f0b45a" opacity="0.82" />
        </>
      )}
      {/* far dune ridge — hazy, low contrast */}
      <path d="M0 36 Q28 28 58 34 T120 31 V56 H0 Z" fill={`url(#${uid}-dfar)`} opacity="0.9" />
      <path d="M0 36 Q28 28 58 34 T120 31" fill="none" stroke="#f6dca6" strokeWidth="0.5" opacity="0.16" />
      {/* near dune ridge — foreground, darker, lit crest */}
      <path d="M0 46 Q40 39 74 46 T120 44 V56 H0 Z" fill={`url(#${uid}-dnear)`} />
      <path d="M0 46 Q40 39 74 46 T120 44" fill="none" stroke="#ffdca0" strokeWidth="0.6" opacity="0.32" />
      {/* wind ripples raked across the near sand */}
      <g stroke="#0c0805" strokeWidth="0.5" opacity="0.24" fill="none">
        <path d="M6 51 Q30 48 54 51" />
        <path d="M40 53 Q68 50 96 53" />
      </g>
    </>
  );
}

/** A soft top rim-light + corner vignette layered over any finished motif. */
function Sheen({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3dc" stopOpacity="0.16" />
          <stop offset="22%" stopColor="#fff3dc" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-vig`} cx="50%" cy="42%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.34" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-sheen)`} />
      <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-vig)`} />
    </>
  );
}

/** A subject fill: the per-card top-lit `-form` gradient (registered by Backdrop),
 *  so silhouettes read as modeled, lit shapes instead of flat colour. */
function ink(uid: string) {
  return { fill: `url(#${uid}-form)` };
}

// ---------------------------------------------------------------------------
// Motifs — each paints a subject over the shared backdrop.
// ---------------------------------------------------------------------------

const warrior: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* two crossed blades behind */}
    <g stroke="#e8dcc4" strokeWidth="2" strokeLinecap="round" opacity="0.55">
      <line x1="44" y1="50" x2="78" y2="12" />
      <line x1="78" y1="50" x2="44" y2="12" />
    </g>
    {/* helmed warrior bust */}
    <g fill="#120c07">
      <path d="M46 56 C46 40 52 33 61 33 C70 33 76 40 76 56 Z" />
      <path d="M52 34 C52 24 58 19 61 19 C64 19 70 24 70 34 C66 31 56 31 52 34 Z" />
    </g>
    <g {...ink(uid)} opacity="0.92">
      <path d="M53 35 C53 27 57 22 61 22 C65 22 69 27 69 35 C65 32 57 32 53 35 Z" />
      <path d="M48 56 C48 42 53 36 61 36 C69 36 74 42 74 56 Z" />
    </g>
    {/* visor slit */}
    <rect x="56" y="27" width="10" height="2.4" rx="1.2" fill="#0c0805" />
  </>
);

const sister: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} suns={false} />
    <circle cx="60" cy="15" r="10" fill="#f4d78a" opacity="0.5" />
    {/* hooded figure */}
    <g fill="#100b07">
      <path d="M42 56 C42 34 50 22 61 22 C72 22 80 34 80 56 Z" />
    </g>
    <g {...ink(uid)} opacity="0.9">
      <path d="M46 56 C46 36 52 27 61 27 C70 27 76 36 76 56 Z" />
    </g>
    {/* face shadow inside the cowl */}
    <path d="M54 33 C54 44 68 44 68 33 C64 30 58 30 54 33 Z" fill="#0b0705" />
    {/* glowing eyes */}
    <circle cx="58" cy="36" r="1.5" fill="#6fd0ff" />
    <circle cx="64" cy="36" r="1.5" fill="#6fd0ff" />
  </>
);

const mentat: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} suns={false} />
    {/* profile head */}
    <g {...ink(uid)} opacity="0.92">
      <path d="M44 56 C44 40 50 30 62 30 C74 30 76 40 76 44 L74 44 C74 38 70 34 63 34 L63 56 Z" />
      <path d="M50 34 C50 26 56 22 63 22 C72 22 76 28 76 34 C74 30 68 27 62 27 C56 27 52 30 50 34 Z" />
    </g>
    {/* stained mentat lip */}
    <rect x="60" y="43" width="9" height="2" rx="1" fill="#c0392b" opacity="0.9" />
    {/* thought glyphs */}
    <g fill="#e8dcc4" opacity="0.6">
      <circle cx="40" cy="20" r="1.6" />
      <circle cx="34" cy="26" r="1.1" />
      <circle cx="30" cy="31" r="0.8" />
    </g>
  </>
);

const throne: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* rays */}
    <g stroke={accent} strokeWidth="1.6" opacity="0.35">
      <line x1="60" y1="30" x2="60" y2="6" />
      <line x1="60" y1="30" x2="40" y2="12" />
      <line x1="60" y1="30" x2="80" y2="12" />
      <line x1="60" y1="30" x2="30" y2="26" />
      <line x1="60" y1="30" x2="90" y2="26" />
    </g>
    {/* throne */}
    <g {...ink(uid)} opacity="0.95">
      <path d="M48 56 V38 H72 V56 Z" />
      <path d="M46 40 h4 v16 h-4 Z M70 40 h4 v16 h-4 Z" />
      <path d="M50 38 V26 h20 v12 Z" opacity="0.85" />
    </g>
    {/* crown */}
    <path d="M52 22 l3 6 l5 -8 l5 8 l3 -6 v6 h-16 Z" fill="#f2c94c" />
  </>
);

const worm: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* sandworm rising */}
    <path
      d="M30 56 C34 40 44 30 58 26 C66 24 72 20 74 12 C78 20 76 30 68 36 C60 42 54 48 52 56 Z"
      fill="#120c07"
    />
    <path
      d="M34 56 C38 42 47 33 59 29 C66 27 70 23 72 16 C74 23 71 32 64 37 C57 42 52 48 50 56 Z"
      {...ink(uid)}
      opacity="0.9"
    />
    {/* segment rings */}
    <g stroke="#0c0805" strokeWidth="1" opacity="0.5" fill="none">
      <path d="M40 52 Q48 46 52 40" />
      <path d="M44 54 Q54 48 58 42" />
    </g>
    {/* maw teeth */}
    <g fill="#e8dcc4">
      <path d="M69 15 l1.5 4 l1.5 -4 Z" />
      <path d="M65 18 l1.4 4 l1.4 -4 Z" />
      <path d="M73 18 l1.4 4 l1.4 -4 Z" />
    </g>
    {/* dust motes */}
    <g fill="#f4d78a" opacity="0.5">
      <circle cx="80" cy="20" r="1" />
      <circle cx="84" cy="26" r="0.8" />
      <circle cx="78" cy="30" r="0.7" />
    </g>
  </>
);

const spiceField: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* spice bloom shimmer on the sand */}
    <defs>
      <radialGradient id={`${uid}-bloom`} cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
        <stop offset="100%" stopColor={accent} stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="50" rx="46" ry="9" fill={`url(#${uid}-bloom)`} />
    {/* glints */}
    <g fill="#f7e6b0">
      {[
        [40, 48],
        [54, 51],
        [68, 49],
        [82, 52],
        [48, 53],
        [74, 46],
        [60, 47],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 2} l1 2 l-1 2 l-1 -2 Z M${x - 2} ${y} l2 1 l-2 1 Z`} opacity="0.9" />
      ))}
    </g>
  </>
);

const thopter: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* ornithopter */}
    <g transform="translate(60 26)">
      <g {...ink(uid)} opacity="0.95">
        <ellipse cx="0" cy="0" rx="12" ry="4.4" />
        <path d="M8 0 l10 3 l-10 1 Z" />
      </g>
      {/* dragonfly wings */}
      <g fill="#e8dcc4" opacity="0.75">
        <path d="M-4 -2 C-14 -16 -30 -16 -34 -10 C-24 -8 -12 -6 -4 -1 Z" />
        <path d="M2 -2 C-6 -18 -22 -20 -28 -14 C-18 -10 -6 -8 2 -1 Z" opacity="0.6" />
        <path d="M-4 2 C-14 12 -28 12 -32 8 C-22 6 -12 4 -4 1 Z" opacity="0.5" />
      </g>
      {/* cockpit glass */}
      <ellipse cx="-6" cy="-0.5" rx="3.4" ry="2" fill="#8fd0ef" opacity="0.85" />
    </g>
  </>
);

const heighliner: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} suns={false} />
    {/* star field */}
    <g fill="#f4e8c8">
      {[
        [20, 10],
        [34, 20],
        [50, 8],
        [70, 16],
        [92, 10],
        [104, 22],
        [16, 26],
        [86, 26],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.2 : 0.7} opacity="0.85" />
      ))}
    </g>
    {/* colossal cylindrical guild ship */}
    <g {...ink(uid)} opacity="0.95">
      <path d="M16 30 h88 l-6 8 h-76 Z" />
      <rect x="22" y="38" width="76" height="4" fill="#120c07" />
      <path d="M22 42 h76 l-8 6 h-60 Z" opacity="0.85" />
    </g>
    {/* running lights */}
    <g fill="#8fd0ef">
      {[30, 46, 60, 74, 90].map((x, i) => (
        <circle key={i} cx={x} cy="34" r="1" />
      ))}
    </g>
  </>
);

const cityscape: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* domed desert city */}
    <g {...ink(uid)} opacity="0.95">
      <rect x="30" y="34" width="8" height="22" />
      <rect x="42" y="26" width="10" height="30" />
      <path d="M42 26 a5 5 0 0 1 10 0 Z" />
      <rect x="56" y="30" width="7" height="26" />
      <rect x="67" y="22" width="11" height="34" />
      <path d="M67 22 a5.5 5.5 0 0 1 11 0 Z" />
      <rect x="82" y="32" width="8" height="24" />
    </g>
    {/* lit windows */}
    <g fill="#f4d78a" opacity="0.85">
      {[
        [45, 32],
        [45, 38],
        [70, 30],
        [70, 38],
        [70, 46],
        [34, 40],
        [85, 40],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="2" height="2.4" />
      ))}
    </g>
  </>
);

const blade: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} suns={false} />
    <circle cx="60" cy="20" r="12" fill="#f4d78a" opacity="0.45" />
    {/* crysknife: milky curved blade + hilt */}
    <g transform="rotate(28 60 30)">
      <path d="M60 6 C66 14 66 30 60 40 C54 30 54 14 60 6 Z" fill="#f2ead2" />
      <path d="M60 8 C64 15 64 28 60 37 C58 28 58 15 60 8 Z" fill="#ffffff" opacity="0.7" />
      <rect x="55.5" y="40" width="9" height="4" rx="2" {...ink(uid)} />
      <rect x="57.5" y="43" width="5" height="9" rx="2.5" fill="#3a2a19" />
    </g>
  </>
);

const sietch: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* rock massif with cave openings */}
    <path d="M22 56 L34 24 L52 30 L64 18 L84 30 L98 56 Z" fill="#120c07" />
    <path d="M28 56 L38 28 L54 33 L64 24 L82 33 L92 56 Z" {...ink(uid)} opacity="0.85" />
    {/* sietch entrances glowing */}
    <g fill="#f4d78a" opacity="0.85">
      <path d="M50 56 C50 48 58 48 58 56 Z" />
      <ellipse cx="70" cy="44" rx="3" ry="4" />
      <ellipse cx="40" cy="46" rx="2.2" ry="3" />
    </g>
  </>
);

const banner: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} suns={false} />
    {/* twin house banners on poles */}
    <g stroke="#3a2a19" strokeWidth="2">
      <line x1="46" y1="12" x2="46" y2="54" />
      <line x1="74" y1="12" x2="74" y2="54" />
    </g>
    <path d="M46 12 h18 l-4 6 l4 6 h-18 Z" {...ink(uid)} opacity="0.95" />
    <path d="M74 12 h-18 l4 6 l-4 6 h18 Z" fill="#f2c94c" opacity="0.55" />
    {/* seal */}
    <circle cx="55" cy="18" r="2.4" fill="#f4e8c8" />
  </>
);

const coins: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} suns={false} />
    {/* stacked solari */}
    <g>
      {[
        [50, 50, 5],
        [50, 44, 4],
        [50, 39, 3],
        [66, 50, 4],
        [66, 45, 3],
        [58, 52, 3],
      ].map(([x, y, n], i) => (
        <g key={i}>
          {Array.from({ length: n as number }).map((_, k) => (
            <ellipse
              key={k}
              cx={x}
              cy={(y as number) - k * 3}
              rx="8"
              ry="3"
              fill="#e6c34a"
              stroke="#a8842a"
              strokeWidth="0.8"
            />
          ))}
        </g>
      ))}
    </g>
    <circle cx="80" cy="26" r="7" fill="#e6c34a" stroke="#a8842a" strokeWidth="1" />
    <circle cx="80" cy="26" r="4" fill="none" stroke="#a8842a" strokeWidth="0.9" />
  </>
);

const stars: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <defs>
      <radialGradient id={`${uid}-void`} cx="50%" cy="45%" r="70%">
        <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
        <stop offset="100%" stopColor="#0a0710" />
      </radialGradient>
    </defs>
    <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-void)`} />
    {/* folded-space warp streaks */}
    <g stroke="#cdbfe8" strokeWidth="1" opacity="0.7">
      {[10, 22, 34, 50, 70, 88, 104, 112].map((x, i) => (
        <line key={i} x1={x} y1={(i * 13) % 50} x2={x + 6} y2={((i * 13) % 50) + 3} />
      ))}
    </g>
    <g fill="#f4e8ff">
      {[
        [30, 20],
        [60, 30],
        [88, 18],
        [46, 40],
        [74, 44],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 1.4 : 0.9} />
      ))}
    </g>
    {/* wormhole ring */}
    <ellipse cx="60" cy="28" rx="16" ry="9" fill="none" stroke={accent} strokeWidth="2" opacity="0.8" />
    <ellipse cx="60" cy="28" rx="8" ry="4.5" fill="none" stroke="#f4e8ff" strokeWidth="1" opacity="0.6" />
  </>
);

const spy: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} suns={false} />
    {/* cloaked informant, eyes in shadow */}
    <g fill="#0e0906">
      <path d="M40 56 C40 32 50 22 61 22 C72 22 82 32 82 56 Z" />
    </g>
    <g {...ink(uid)} opacity="0.85">
      <path d="M45 56 C45 34 53 26 61 26 C69 26 77 34 77 56 Z" />
    </g>
    {/* mask band */}
    <rect x="50" y="34" width="22" height="6" rx="3" fill="#0b0705" />
    <circle cx="56" cy="37" r="1.4" fill={accent} />
    <circle cx="66" cy="37" r="1.4" fill={accent} />
    {/* whisper glyphs */}
    <g fill="#e8dcc4" opacity="0.5">
      <circle cx="88" cy="22" r="1.2" />
      <circle cx="94" cy="28" r="0.9" />
    </g>
  </>
);

const water: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* precious water drops falling into a catch basin */}
    <g fill="#4aa3df">
      <path d="M60 14 C60 14 54 22 54 26 a6 6 0 0 0 12 0 C66 22 60 14 60 14 Z" />
      <path d="M46 22 C46 22 42 27 42 30 a4 4 0 0 0 8 0 C50 27 46 22 46 22 Z" opacity="0.8" />
      <path d="M74 24 C74 24 71 28 71 30.5 a3 3 0 0 0 6 0 C77 28 74 24 74 24 Z" opacity="0.7" />
    </g>
    {/* stillsuit catch basin */}
    <path d="M40 46 Q60 40 80 46 L78 52 Q60 47 42 52 Z" {...ink(uid)} opacity="0.9" />
    <ellipse cx="60" cy="46" rx="20" ry="3" fill="#4aa3df" opacity="0.55" />
  </>
);

const desert: (p: MotifProps) => JSX.Element = ({ accent, uid }) => (
  <>
    <Backdrop uid={uid} accent={accent} />
    {/* lone figure crossing the open sand, no rhythm */}
    <g fill="#120c07">
      <ellipse cx="60" cy="52" rx="3" ry="1.4" opacity="0.5" />
      <path d="M59 40 l2 0 l1 10 l-2 0 l-1 3 l-1 -3 l-2 0 Z" />
      <circle cx="60" cy="38" r="2.2" />
    </g>
    {/* footprints trail */}
    <g fill="#1a120b" opacity="0.7">
      {[70, 76, 82, 88].map((x, i) => (
        <ellipse key={i} cx={x} cy={50 + (i % 2)} rx="1.4" ry="0.8" />
      ))}
    </g>
  </>
);

// ---------------------------------------------------------------------------

const MOTIFS = {
  warrior,
  sister,
  mentat,
  throne,
  worm,
  spice: spiceField,
  thopter,
  heighliner,
  city: cityscape,
  blade,
  sietch,
  banner,
  coins,
  stars,
  spy,
  water,
  desert,
} as const;

export type MotifName = keyof typeof MOTIFS;

/** Explicit per-card art assignment (best-fitting scene for each card). */
const CARD_ART: Partial<Record<CardDefId, MotifName>> = {
  // starting deck
  convincingArgument: 'banner',
  dagger: 'blade',
  desertHomeworld: 'desert',
  diplomacy: 'banner',
  reconnaissance: 'thopter',
  seekAllies: 'banner',
  signetRing: 'coins',
  // reserve
  foldspace: 'stars',
  arrakisLiaison: 'city',
  theSpiceMustFlow: 'spice',
  // imperium
  sardaukarLegion: 'warrior',
  imperialSpy: 'spy',
  guildAdministrator: 'mentat',
  guildBankers: 'coins',
  spaceTravel: 'heighliner',
  beneGesseritSister: 'sister',
  missionariaProtectiva: 'sister',
  fremenCamp: 'sietch',
  fedaykinDeathCommando: 'warrior',
  crysknife: 'blade',
  chani: 'sister',
  stilgar: 'warrior',
  smugglersThopter: 'thopter',
  spiceSmugglers: 'thopter',
  choamDirectorship: 'coins',
  duncanIdaho: 'warrior',
  thufirHawat: 'mentat',
  ladyJessica: 'sister',
  gurneyHalleck: 'warrior',
  otherMemory: 'sister',
  spiceHunter: 'worm',
  desertMouse: 'desert',
  imperialBureaucrat: 'mentat',
  guildEnvoy: 'heighliner',
  truthsayer: 'sister',
  landsraadCouncil: 'banner',
  shaddamCorrino: 'throne',
  piterDeVries: 'mentat',
  sietchReverendMother: 'sister',
  spiceRefinery: 'spice',
  weirdingWay: 'sister',
  desertPower: 'worm',
};

/** Fallback: pick a motif from a card's icons when it isn't mapped explicitly. */
function motifFromDef(def: ImpCardDef): MotifName {
  const has = (i: string) => def.icons.includes(i as ImpCardDef['icons'][number]);
  if (has('fremen')) return 'worm';
  if (has('emperor')) return 'throne';
  if (has('spacingGuild')) return 'heighliner';
  if (has('beneGesserit')) return 'sister';
  if (has('spiceTrade')) return 'spice';
  if (has('city')) return 'city';
  if (has('landsraad')) return 'banner';
  return 'desert';
}

/** The illustrative banner for a card, tinted by `accent`. */
export function CardArt({
  def,
  accent,
  className,
  height = 52,
}: {
  def: ImpCardDef;
  accent: string;
  className?: string;
  height?: number;
}) {
  const motif = CARD_ART[def.id] ?? motifFromDef(def);
  const Motif = MOTIFS[motif];
  const uid = `art-${def.id}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <Motif accent={accent} uid={uid} />
      <Sheen uid={uid} />
    </svg>
  );
}

/** Per-space motif assignment for the board tiles. */
const SPACE_ART: Partial<Record<SpaceId, MotifName>> = {
  conspire: 'throne',
  wealth: 'coins',
  heighliner: 'heighliner',
  foldspaceSpace: 'stars',
  selectiveBreeding: 'sister',
  secrets: 'spy',
  hardyWarriors: 'warrior',
  stillsuits: 'water',
  highCouncil: 'banner',
  mentat: 'mentat',
  swordmaster: 'blade',
  rallyTroops: 'warrior',
  hallOfOratory: 'banner',
  secureContract: 'coins',
  sellMelange: 'spice',
  arrakeen: 'city',
  carthag: 'city',
  researchStation: 'city',
  sietchTabr: 'sietch',
  imperialBasin: 'spice',
  haggaBasin: 'spice',
  theGreatFlat: 'worm',
};

/** A compact square art thumbnail for a board space. */
export function SpaceArt({
  space,
  accent,
  size = 34,
  className,
}: {
  space: BoardSpaceDef;
  accent: string;
  size?: number;
  className?: string;
}) {
  const motif = SPACE_ART[space.id] ?? 'desert';
  const Motif = MOTIFS[motif];
  const uid = `sp-${space.id}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      style={{ display: 'block', borderRadius: 6 }}
    >
      <Motif accent={accent} uid={uid} />
      <Sheen uid={uid} />
    </svg>
  );
}
