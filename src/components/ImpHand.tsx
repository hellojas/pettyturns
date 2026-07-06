import { useState } from 'react';
import { IMP_CARD_DEFS } from '../imperium/data/cards';
import { IMP_INTRIGUE_DEFS } from '../imperium/data/intrigue';
import { IMP_LEADERS } from '../imperium/data/leaders';
import { IMP_SPACES } from '../imperium/data/spaces';
import type { ImpVisibleState, PlayerId } from '../imperium/types';
import { useImpStore } from '../lib/impStore';
import ImpCard from './ImpCard';
import ImpIntrigueCard from './ImpIntrigueCard';
import { Icon } from './imp/icons';

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
  // Chosen target per troop-removing combat card (keyed by intrigue instance id).
  const [combatTargets, setCombatTargets] = useState<Record<string, PlayerId>>({});
  const self = view.hidden.self;
  if (!self) return null;
  const p = view.players[viewingAs];
  const myTurn = view.turn === viewingAs && view.phase === 'playerTurns';
  // Opponents with troops still committed — the only legal targets to remove from.
  const oppInConflict = view.playerOrder.filter(
    (id) => id !== viewingAs && view.players[id].inConflict > 0,
  );
  const space = pending?.spaceId ? IMP_SPACES[pending.spaceId] : null;
  const pendingDef = pending ? defOf(view, pending.cardId) : null;
  const leader = IMP_LEADERS[p.leaderId];

  return (
    <div className="space-y-2 text-xs">
      {!p.revealed && (
        <>
          <div className="text-sand-100/50 uppercase tracking-wide">Hand ({self.hand.length})</div>
          <div className="grid grid-cols-2 gap-2">
            {self.hand.map((cardId) => {
              const def = defOf(view, cardId);
              const selected = pending?.cardId === cardId;
              return (
                <ImpCard
                  key={cardId}
                  def={def}
                  selected={selected}
                  disabled={!myTurn || p.agentsLeft <= 0}
                  dimmed={(!myTurn || p.agentsLeft <= 0) && !selected}
                  signetLeaderName={def.signet ? leader?.name : undefined}
                  signetGains={def.signet ? leader?.signetGains : undefined}
                  signetCost={def.signet ? leader?.signetCost : undefined}
                  signetNote={def.signet ? leader?.signetNote : undefined}
                  onClick={() => setPending(selected ? null : { cardId, deploy: 0 })}
                />
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
                <div className="text-sand-100/50">
                  You'll choose the influence track after playing.
                </div>
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
                      choices:
                        space?.special === 'sellMelange' ? { sellSpice: pending.sellSpice ?? 2 } : undefined,
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
        <div className="text-sand-100/60 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Revealed:</span>
          <span className="inline-flex items-center gap-1 text-sand-200 font-semibold">
            <Icon name="persuasion" size={13} />
            {p.persuasion} persuasion
          </span>
          <span className="inline-flex items-center gap-1 text-red-300">
            <Icon name="sword" size={13} />
            {p.swords} swords
          </span>
          <span className="w-full">Buy cards on the right, then end your round.</span>
        </div>
      )}

      {self.intrigue.length > 0 && (
        <div>
          <div className="text-sand-100/50 uppercase tracking-wide mb-1">Intrigue ({self.intrigue.length})</div>
          <div className="grid grid-cols-2 gap-2">
            {self.intrigue.map((intrigueId) => {
              const def = IMP_INTRIGUE_DEFS[view.intrigueById[intrigueId].defId];
              const playable =
                (def.kind === 'plot' && myTurn) ||
                (def.kind === 'combat' && view.phase === 'combat' && view.turn === viewingAs);
              const needsTarget = (def.gains?.destroyTroops ?? 0) > 0;
              const target = combatTargets[intrigueId] ?? oppInConflict[0];
              const canPlay = playable && (!needsTarget || !!target);
              return (
                <ImpIntrigueCard
                  key={intrigueId}
                  def={def}
                  footer={
                    playable ? (
                      <div className="space-y-1">
                        {needsTarget && oppInConflict.length > 0 && (
                          <select
                            className="input w-full !py-0.5 !text-xs"
                            value={target}
                            onChange={(e) => setCombatTargets({ ...combatTargets, [intrigueId]: e.target.value })}
                          >
                            {oppInConflict.map((id) => (
                              <option key={id} value={id}>
                                Remove from {view.players[id].name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          className="btn w-full !py-0.5"
                          disabled={!canPlay}
                          onClick={() =>
                            dispatch({
                              type: 'imp/playIntrigue',
                              playerId: viewingAs,
                              intrigueId,
                              targetPlayerId: needsTarget ? target : undefined,
                            })
                          }
                        >
                          {needsTarget && oppInConflict.length === 0 ? 'No target' : 'Play'}
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
