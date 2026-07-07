import { Icon, type IconName } from './icons';

/**
 * Physical-token props: agent standees (meeples), troop cubes, and a face-down
 * card back. All are original inline SVG tinted by a seat color, so the digital
 * board reads like the components you'd push around the physical one.
 */

/** A small centered seat-number glyph, a redundant (non-color) identity channel. */
function SeatGlyph({ seatIndex }: { seatIndex: number }) {
  return (
    <text
      x="12"
      y="13.5"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="11"
      fontWeight="700"
      fill="#ffffff"
      stroke="#000000"
      strokeWidth="1.4"
      paintOrder="stroke"
      style={{ pointerEvents: 'none' }}
    >
      {seatIndex}
    </text>
  );
}

/** An agent standee in a player's seat color (the worker placed on a space). */
export function Meeple({ color, size = 14, title, seatIndex }: { color: string; size?: number; title?: string; seatIndex?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'inline-block', verticalAlign: 'middle', filter: 'drop-shadow(0 1px 1px #0007)' }}
    >
      {title && <title>{title}</title>}
      <path
        d="M12 2.2 A3.3 3.3 0 1 1 11.99 2.2 Z M12 8.4 C15.2 8.4 17.4 11.3 18 15.2 C18.2 16.4 16.9 16.9 15.9 16.2 C15.4 18.8 14 21.4 12 21.4 C10 21.4 8.6 18.8 8.1 16.2 C7.1 16.9 5.8 16.4 6 15.2 C6.6 11.3 8.8 8.4 12 8.4 Z"
        fill={color}
        stroke="#00000070"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {seatIndex !== undefined && <SeatGlyph seatIndex={seatIndex} />}
    </svg>
  );
}

/** An isometric troop cube in a seat color; shaded faces give it depth. */
export function TroopCube({ color, size = 13, title, seatIndex }: { color: string; size?: number; title?: string; seatIndex?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'inline-block', verticalAlign: 'middle', filter: 'drop-shadow(0 1px 1px #0006)' }}
    >
      {title && <title>{title}</title>}
      {/* top */}
      <path d="M12 3 L20 7.4 L12 11.8 L4 7.4 Z" fill={color} />
      {/* left (darker) */}
      <path d="M4 7.4 L12 11.8 L12 20.4 L4 16 Z" fill={color} />
      <path d="M4 7.4 L12 11.8 L12 20.4 L4 16 Z" fill="#00000055" />
      {/* right (mid) */}
      <path d="M20 7.4 L12 11.8 L12 20.4 L20 16 Z" fill={color} />
      <path d="M20 7.4 L12 11.8 L12 20.4 L20 16 Z" fill="#0000002b" />
      <path
        d="M12 3 L20 7.4 L20 16 L12 20.4 L4 16 L4 7.4 Z M12 11.8 L12 20.4 M4 7.4 L12 11.8 L20 7.4"
        fill="none"
        stroke="#00000066"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {seatIndex !== undefined && <SeatGlyph seatIndex={seatIndex} />}
    </svg>
  );
}

/** A count of troop cubes: one cube plus a tally (keeps small counts readable). */
export function TroopCount({ color, count, size = 13 }: { color: string; count: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${count} troop${count === 1 ? '' : 's'}`}>
      <TroopCube color={color} size={size} />
      <span className="text-[10px] font-bold tabular-nums text-sand-100/80">{count}</span>
    </span>
  );
}

/**
 * A face-down card back for deck / draw piles: dark stock, a woven border, and a
 * faint faction-neutral sigil watermark. `count` overlays the number of cards.
 */
export function CardBack({
  count,
  width = 34,
  sigil = 'spiceTrade',
  title,
}: {
  count?: number;
  width?: number;
  sigil?: IconName;
  title?: string;
}) {
  const height = Math.round(width * 1.4);
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-md overflow-hidden shrink-0 tex-weave"
      style={{
        width,
        height,
        background: 'linear-gradient(150deg, #2a2016, #150f0a)',
        border: '1px solid #7b422288',
        boxShadow: '0 1px 3px #0007, inset 0 0 0 1px #e3bd7818',
      }}
      title={title}
    >
      <span className="absolute inset-1 rounded-sm" style={{ border: '1px solid #e3bd7822' }} />
      <span className="opacity-25">
        <Icon name={sigil} size={Math.round(width * 0.5)} color="#e3bd78" />
      </span>
      {count !== undefined && (
        <span
          className="absolute bottom-0 inset-x-0 text-center text-[10px] font-bold tabular-nums py-0.5"
          style={{ background: '#000000aa', color: '#e3bd78' }}
        >
          {count}
        </span>
      )}
    </span>
  );
}
