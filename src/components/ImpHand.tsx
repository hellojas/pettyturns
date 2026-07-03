import { IMP_CARD_DEFS } from '../imperium/data/cards';
import { IMP_INTRIGUE_DEFS } from '../imperium/data/intrigue';
import { IMP_SPACES } from '../imperium/data/spaces';
import { IMP_FACTIONS, type ImpVisibleState, type PlayerId } from '../imperium/types';
import { useImpStore } from '../lib/impStore';

const ICON_SHORT: Record<string, string> = {
  emperor: 'E',
  spacingGuild: 'G',
  beneGesserit: 'B',
  fremen: 'F',
  landsraad: 'L',
  city: 'C',
  spiceTrade: 'S',
};

function defOf(view: ImpVisibleState, cardId: string) {
  return IMP_CARD_DEFS[view.cardsById[cardId].defId];
}

/**
 * The seated player's hand plus the staged agent play. Selecting a card arms
 * the board; once a space is chosen, choices (deploy / sell amount / faction)
 * appear here and the play confirms as one action.
 */
export default function ImpHand({ view, viewingAs }: { view: ImpVisibleState; viewingAs: PlayerId }) {
  const pending = useImpStore((s) => s.pending);
  const setPending = useImpStore((s) => s.setPending);
  const dispatch = useImpStore((s) => s.dispatch);
  const self = view.hidden.self;
  if (!self) return null;
  const p = view.players[viewingAs];
  const myTurn = view.turn === viewingAs && view.phase === 'playerTurns';
  const space = pending?.spaceId ? IMP_SPACES[pending.spaceId] : null;
  const pendingDef = pending ? defOf(view, pending.cardId) : null;

  return (
    <div className="space-y-2 text-xs">
      {!p.revealed && (
        <>
          <div className="text-sand-100/50 uppercase tracking-wide">Hand ({self.hand.length})</div>
          <div className="space-y-1">
            {self.hand.map((cardId) => {
              const def = defOf(view, cardId);
              const selected = pending?.cardId === cardId;
              return (
                <button
                  key={cardId}
                  disabled={!myTurn || p.agentsLeft <= 0}
                  onClick={() => setPending(selected ? null : { cardId, deploy: 0 })}
                  className={`w-full text-left rounded border px-2 py-1 transition-colors ${
                    selected
                      ? 'border-amber-400 bg-dusk-900'
                      : 'border-sand-900/50 bg-dusk-900/60 hover:border-sand-700 disabled:opacity-50'
                  }`}
                >
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-sand-200">{def.name}</span>
                    <span className="text-sand-100/40">{def.icons.map((i) => ICON_SHORT[i]).join('')}</span>
                    {def.revealGains?.persuasion && <span className="ml-auto text-sand-300">{def.revealGains.persuasion}◈</span>}
                    {def.revealGains?.swords && <span className="text-red-300">{def.revealGains.swords}⚔</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {pending && (
            <div className="rounded border border-amber-700/60 bg-amber-950/20 p-2 space-y-1.5">
              <div className="text-sand-200">
                {pendingDef!.name} → {space ? space.name : 'pick a highlighted space on the board'}
              </div>
              {space?.combat && (
                <label className="flex items-center gap-2">
                  Deploy troops
                  <input
                    type="number"
                    className="input w-14"
                    min={0}
                    value={pending.deploy}
                    onChange={(e) => setPending({ ...pending, deploy: Number(e.target.value) })}
                  />
                </label>
              )}
              {space?.special === 'sellMelange' && (
                <label className="flex items-center gap-2">
                  Sell spice
                  <select
                    className="input"
                    value={pending.sellSpice ?? 2}
                    onChange={(e) => setPending({ ...pending, sellSpice: Number(e.target.value) })}
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {(pendingDef?.agentGains?.anyInfluence ?? 0) > 0 && (
                <label className="flex items-center gap-2">
                  Influence with
                  <select
                    className="input"
                    value={pending.influenceFaction ?? ''}
                    onChange={(e) => setPending({ ...pending, influenceFaction: e.target.value })}
                  >
                    <option value="">choose…</option>
                    {IMP_FACTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex gap-2">
                <button
                  className="btn"
                  disabled={!space}
                  onClick={() =>
                    dispatch({
                      type: 'imp/playCard',
                      playerId: viewingAs,
                      cardId: pending.cardId,
                      spaceId: pending.spaceId!,
                      deploy: pending.deploy || undefined,
                      choices: {
                        sellSpice: space?.special === 'sellMelange' ? (pending.sellSpice ?? 2) : undefined,
                        influenceFaction: pending.influenceFaction as never,
                      },
                    })
                  }
                >
                  Send agent
                </button>
                <button className="btn-secondary" onClick={() => setPending(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {myTurn && (
            <button className="btn-secondary w-full" onClick={() => dispatch({ type: 'imp/reveal', playerId: viewingAs })}>
              Reveal remaining hand ({self.hand.length}) — end agent turns
            </button>
          )}
        </>
      )}

      {p.revealed && !p.turnDone && myTurn && (
        <div className="text-sand-100/60">
          Revealed: <span className="text-sand-200 font-semibold">{p.persuasion}◈ persuasion</span>,{' '}
          <span className="text-red-300">{p.swords}⚔ swords</span>. Buy cards on the right, then end your round.
        </div>
      )}

      {self.intrigue.length > 0 && (
        <div>
          <div className="text-sand-100/50 uppercase tracking-wide mb-1">Intrigue ({self.intrigue.length})</div>
          {self.intrigue.map((intrigueId) => {
            const def = IMP_INTRIGUE_DEFS[view.intrigueById[intrigueId].defId];
            const playable =
              (def.kind === 'plot' && myTurn) ||
              (def.kind === 'combat' && view.phase === 'combat' && view.turn === viewingAs);
            return (
              <div key={intrigueId} className="flex items-center gap-2 py-0.5">
                <span className="text-sand-200">{def.name}</span>
                <span className="text-sand-100/40">{def.kind}</span>
                {playable && (
                  <button
                    className="btn-secondary ml-auto !py-0.5"
                    onClick={() => dispatch({ type: 'imp/playIntrigue', playerId: viewingAs, intrigueId })}
                  >
                    Play
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
