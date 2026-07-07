import type { ImpVisibleState } from '../imperium/types';
import { Icon, type IconName } from './imp/icons';
import { PLAYER_COLORS } from './imp/visuals';

/** Pick a glyph for a log entry from its event name. */
function eventIcon(event: string): IconName {
  if (/^(combat|troops)/.test(event) || event === 'round.conflict') return 'sword';
  if (/^intrigue/.test(event)) return 'intrigue';
  if (/^(influence|alliance)/.test(event)) return 'influence';
  if (/^vp/.test(event) || event === 'game.finished') return 'vp';
  if (event === 'melange.sold') return 'spice';
  if (/^control/.test(event)) return 'city';
  if (/^(council|swordmaster|leader)/.test(event)) return 'persuasion';
  return 'draw';
}

/** Viewer-filtered game log, newest first, with per-event glyphs + seat colors. */
export default function ImpLog({ view }: { view: ImpVisibleState }) {
  const entries = [...view.log].reverse();
  return (
    <div className="space-y-0.5 overflow-y-auto max-h-[560px] pr-1 text-xs">
      {entries.map((entry) => {
        const pid = typeof entry.data?.pid === 'string' ? (entry.data.pid as string) : undefined;
        const seatIdx = pid ? view.playerOrder.indexOf(pid) : -1;
        const seat = seatIdx >= 0 ? PLAYER_COLORS[seatIdx % 4] : undefined;
        const isPrivate = entry.visibility.scope === 'private';
        return (
          <div
            key={entry.seq}
            className="flex gap-1.5 items-start rounded pl-1.5 py-0.5"
            style={{ borderLeft: `2px solid ${seat ?? '#7b422255'}`, background: seat ? `${seat}0e` : undefined }}
          >
            <span className="w-5 shrink-0 text-[9px] text-sand-100/30 pt-[3px] tabular-nums">R{entry.round}</span>
            <Icon name={eventIcon(entry.event)} size={12} className="mt-[2px] shrink-0 opacity-75" />
            <span className={isPrivate ? 'text-purple-300' : 'text-sand-100/80'}>
              {isPrivate && <Icon name="lock" size={10} className="mr-0.5 mb-[1px]" />}
              {entry.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
