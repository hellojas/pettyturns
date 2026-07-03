import { useState } from 'react';
import { LEADERS } from '../../game/data/leaders';
import { TERRITORIES } from '../../game/data/territories';
import { TREACHERY_CARD_DEFS } from '../../game/data/treacheryCards';
import type { AllowedAction, PlayerId, PublicGameState } from '../../game/types';
import { useGameStore } from '../lib/store';

/**
 * Battle plan form (hidden commitment) + traitor call prompt. Rendered inline
 * in the action column while a battle involves the viewer.
 */
export default function BattleModal({
  view,
  allowed,
  viewingAs,
}: {
  view: PublicGameState;
  allowed: AllowedAction[];
  viewingAs: PlayerId;
}) {
  const dispatch = useGameStore((s) => s.dispatch);
  const planAction = allowed.find((a) => a.type === 'battle/submitPlan');
  const traitorAction = allowed.find((a) => a.type === 'battle/callTraitor');
  const [leaderId, setLeaderId] = useState('');
  const [dial, setDial] = useState(0);
  const [weaponCardId, setWeaponCardId] = useState('');
  const [defenseCardId, setDefenseCardId] = useState('');

  const bp = view.battlePhase;
  const active = bp?.battles.find((b) => b.id === bp.activeBattleId) ?? null;
  const hand = view.hidden.self?.hand ?? [];
  const weaponChoices = hand.filter((c) =>
    TREACHERY_CARD_DEFS[c.defId].category.startsWith('weapon'),
  );
  const defenseChoices = hand.filter((c) =>
    TREACHERY_CARD_DEFS[c.defId].category.startsWith('defense'),
  );

  if (!active) {
    return <div className="text-xs text-sand-100/50 italic">No battle underway.</div>;
  }

  const inBattle = viewingAs === active.aggressor || viewingAs === active.defender;
  return (
    <div className="text-sm space-y-2">
      <div className="font-semibold text-sand-300">
        Battle: {TERRITORIES[active.territoryId].name}
      </div>
      <div className="text-xs text-sand-100/60">
        {view.players[active.aggressor].name} (aggressor) vs {view.players[active.defender].name}
      </div>

      {traitorAction && (
        <div className="border border-amber-700 rounded p-2 bg-amber-950/30 space-y-1">
          <div className="text-amber-300 font-semibold">{traitorAction.label}</div>
          <div className="flex gap-2">
            <button
              className="btn"
              onClick={() =>
                dispatch({ type: 'battle/callTraitor', playerId: viewingAs, battleId: active.id, call: true })
              }
            >
              Call the traitor
            </button>
            <button
              className="btn-secondary"
              onClick={() =>
                dispatch({ type: 'battle/callTraitor', playerId: viewingAs, battleId: active.id, call: false })
              }
            >
              Stay silent
            </button>
          </div>
        </div>
      )}

      {planAction && (
        <div className="space-y-2">
          <div className="flex gap-2 items-center text-xs">
            <span className="w-14">Leader</span>
            <select className="input" value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
              <option value="">choose…</option>
              {(planAction.params?.leaders as string[]).map((lid) => (
                <option key={lid} value={lid}>
                  {LEADERS[lid].name} ({LEADERS[lid].strength})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 items-center text-xs">
            <span className="w-14">Dial</span>
            <input
              type="number"
              className="input w-16"
              min={0}
              max={planAction.params?.maxDial as number}
              value={dial}
              onChange={(e) => setDial(Number(e.target.value))}
            />
            <span className="text-sand-100/50">of {planAction.params?.maxDial as number} forces here</span>
          </div>
          <div className="flex gap-2 items-center text-xs">
            <span className="w-14">Weapon</span>
            <select className="input" value={weaponCardId} onChange={(e) => setWeaponCardId(e.target.value)}>
              <option value="">none</option>
              {weaponChoices.map((c) => (
                <option key={c.id} value={c.id}>
                  {TREACHERY_CARD_DEFS[c.defId].name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 items-center text-xs">
            <span className="w-14">Defense</span>
            <select className="input" value={defenseCardId} onChange={(e) => setDefenseCardId(e.target.value)}>
              <option value="">none</option>
              {defenseChoices.map((c) => (
                <option key={c.id} value={c.id}>
                  {TREACHERY_CARD_DEFS[c.defId].name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn"
            disabled={!leaderId}
            onClick={() =>
              dispatch({
                type: 'battle/submitPlan',
                playerId: viewingAs,
                battleId: active.id,
                plan: {
                  leaderId: leaderId || null,
                  cheapHeroCardId: null,
                  dial,
                  weaponCardId: weaponCardId || null,
                  defenseCardId: defenseCardId || null,
                  spiceSupport: 0,
                  extras: {},
                },
              })
            }
          >
            Lock in battle plan
          </button>
          <div className="text-xs text-sand-100/50">
            Plans stay hidden until both combatants commit, then reveal simultaneously.
          </div>
        </div>
      )}

      {!planAction && !traitorAction && inBattle && (
        <div className="text-xs text-sand-100/50 italic">Plan locked. Waiting for your opponent…</div>
      )}
      {!inBattle && <div className="text-xs text-sand-100/50 italic">You are not in this battle.</div>}
    </div>
  );
}
