import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useImpStore } from '../lib/impStore';
import type { ImpVisibleState, PlayerId } from '../imperium/types';
import { PLAYER_COLORS } from './imp/visuals';

/**
 * Async side-channel chat. Reads the store's `chat` log (kept in sync by the
 * transport's chat push + poll) and posts as this device's seat. Sender names
 * are tinted with the seat color so the feed matches the rest of the board.
 * Rendered only when the active transport supports chat (see `chatEnabled`).
 */
export default function ImpChat({ view }: { view: ImpVisibleState }) {
  const chat = useImpStore((s) => s.chat);
  const sendChat = useImpStore((s) => s.sendChat);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const seatColor = (seat: PlayerId | 'SPECTATOR'): string => {
    if (seat === 'SPECTATOR') return '#9c8770';
    const idx = view.playerOrder.indexOf(seat);
    return idx >= 0 ? PLAYER_COLORS[idx % 4] : '#9c8770';
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    void sendChat(text);
    setText('');
  };

  return (
    <div className="text-xs">
      <div ref={listRef} className="space-y-1 overflow-y-auto max-h-40 pr-1 mb-2">
        {chat.length === 0 ? (
          <div className="text-sand-100/40 italic">No messages yet — say hello.</div>
        ) : (
          chat.map((m) => (
            <div key={m.seq} className="leading-snug">
              <span className="font-semibold" style={{ color: seatColor(m.seat) }}>
                {m.name}:{' '}
              </span>
              <span className="text-sand-100/85 break-words">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={submit} className="flex gap-1.5">
        <input
          className="input flex-1"
          value={text}
          maxLength={500}
          placeholder="Say something…"
          onChange={(e) => setText(e.target.value)}
          aria-label="Chat message"
        />
        <button className="btn !py-1 !px-2" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
