/**
 * UI shell placeholder. Milestone 4+ adds the board renderer, panels, and
 * routing (/ , /new , /game/:gameId). The rules engine under src/game is the
 * current deliverable — see ARCHITECTURE.md.
 */
export default function App() {
  return (
    <main className="min-h-screen bg-dusk-900 text-sand-100 flex items-center justify-center">
      <div className="max-w-xl p-8 rounded-lg border border-sand-800 bg-dusk-800">
        <h1 className="text-2xl font-semibold text-sand-300">Desert Power</h1>
        <p className="mt-2 text-sand-100/80">
          Private tabletop rules engine. The UI arrives in a later milestone — for now, the
          engine lives under <code className="text-sand-300">src/game</code> and is exercised by
          the Vitest suite (<code className="text-sand-300">npm test</code>).
        </p>
      </div>
    </main>
  );
}
