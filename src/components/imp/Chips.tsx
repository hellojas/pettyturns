import { Icon } from './icons';
import type { Chip } from './visuals';

/**
 * A row of effect chips (icon + amount) — the shared card vocabulary used on
 * deck cards, conflict cards, and anywhere a Gains/Costs bundle is shown, so
 * every surface reads with the same crisp SVG iconography.
 */
export function ChipRow({
  chips,
  muted,
  size = 13,
  empty,
}: {
  chips: Chip[];
  muted?: boolean;
  size?: number;
  /** Rendered when there are no chips (e.g. an em dash). Omit to render nothing. */
  empty?: React.ReactNode;
}) {
  if (!chips.length) return empty ? <>{empty}</> : null;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {chips.map((c, i) => (
        <span
          key={i}
          title={c.title}
          className={`inline-flex items-center gap-0.5 ${muted ? 'text-sand-100/70' : 'text-sand-100/90'}`}
        >
          <Icon name={c.icon} size={size} />
          {c.text && <span className="text-[11px] font-semibold tabular-nums">{c.text}</span>}
        </span>
      ))}
    </div>
  );
}
