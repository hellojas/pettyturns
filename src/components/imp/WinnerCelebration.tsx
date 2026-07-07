import type { ImpVisibleState } from '../../imperium/types';
import { Icon } from './icons';
import LeaderPortrait from './LeaderPortrait';
import { PLAYER_COLORS } from './visuals';
import Confetti from './Confetti';

/**
 * The victory moment: a hero banner crowning the winner with a large glowing
 * portrait and a spice-gold confetti burst. Shown once a game reaches
 * `finished`. Confetti + glow are CSS-only and reduced-motion-guarded, so under
 * reduced motion this degrades to a static, still-celebratory crest.
 *
 * A finished game with no winner (e.g. a tie the engine resolved to standings
 * without a `winner`) renders a calmer "game over" crest instead of a crowning.
 */
export default function WinnerCelebration({ view }: { view: ImpVisibleState }) {
  if (view.phase !== 'finished') return null;
  const winner = view.winner ? view.players[view.winner] : null;
  const seat = view.winner ? PLAYER_COLORS[view.playerOrder.indexOf(view.winner) % 4] : '#e3bd78';

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-5 text-center"
      style={{
        background: 'radial-gradient(120% 120% at 50% -10%, #3a2a12, #17110b 74%)',
        border: '1px solid #7a5a2488',
        boxShadow: 'inset 0 0 60px -22px #000',
      }}
      role="status"
    >
      <div className="tex-spice absolute inset-0 pointer-events-none opacity-50" aria-hidden />
      {winner && <Confetti />}
      <div className="relative flex flex-col items-center gap-2">
        <div className="text-[10px] uppercase tracking-[0.35em] text-amber-200/70">
          {winner ? 'Victor of Arrakis' : 'The dust settles'}
        </div>
        {winner ? (
          <>
            <div className="anim-win-glow rounded-full">
              <LeaderPortrait leaderId={winner.leaderId} size={84} ring={seat} className="!rounded-full" />
            </div>
            <div
              className="font-display text-2xl font-bold tracking-wide"
              style={{
                background: 'linear-gradient(180deg, #f7ecd7, #f2c94c 55%, #b56b26)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {winner.name} wins
            </div>
            <div className="inline-flex items-center gap-1.5 text-sm text-amber-200 font-semibold">
              <Icon name="vp" size={16} />
              <span className="tabular-nums">{winner.vp}</span> victory points
              <span className="text-sand-100/40 font-normal">· {view.round} rounds</span>
            </div>
          </>
        ) : (
          <div className="font-display text-xl font-bold text-sand-200">Game over — {view.round} rounds</div>
        )}
      </div>
    </div>
  );
}
