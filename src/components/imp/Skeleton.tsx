/**
 * Desert-palette skeleton placeholders for loading states (async join, lobby
 * fetch). A dim block with a moving shimmer sweep; the shimmer keyframe is
 * reduced-motion-guarded, so it degrades to a plain dim block.
 */
export function SkeletonBlock({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md ${className}`}
      style={{ background: '#241b1399', border: '1px solid #7b422233', ...style }}
      aria-hidden
    >
      <div className="anim-shimmer absolute inset-0" />
    </div>
  );
}

/** A themed "loading a game" card matching the "Lost to the sands" not-found panel. */
export function LoadingCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-center justify-center p-6">
      <div
        className="relative overflow-hidden rounded-2xl px-8 py-10 w-full max-w-md"
        style={{
          background: 'radial-gradient(120% 90% at 50% -20%, #3a2a1a, #17110b 72%)',
          border: '1px solid #7b422277',
          boxShadow: 'inset 0 0 60px -18px #000',
        }}
      >
        <div className="tex-spice absolute inset-0 pointer-events-none opacity-60" aria-hidden />
        <div className="relative space-y-4">
          <div className="text-center space-y-1">
            <div className="font-display text-xl font-bold text-sand-300 tracking-wide">{title}</div>
            {subtitle && <p className="text-sm text-sand-100/50">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-11 h-11 !rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBlock className="h-3 w-2/3" />
              <SkeletonBlock className="h-2.5 w-1/3" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
          </div>
        </div>
      </div>
    </main>
  );
}
