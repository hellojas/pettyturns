import type {
  AllowedAction,
  GameState,
  NexusAllianceProposalAction,
  NexusAllianceResponseAction,
  PlayerId,
  TurnAction,
  ValidationResult,
} from '../../types';
import { fail, ok } from '../../types';
import { appendLog } from '../log';
import { getPlayer, getPlayerByFaction } from '../state';
import type { PhaseModule } from './module';

/**
 * Nexus: triggered when a worm surfaces. While the nexus is open, factions may
 * break their existing alliance and/or form a new one (two factions per
 * alliance). The nexus ends when the players are done negotiating — any player
 * may declare it over once every faction has had the chance to act (MVP: an
 * explicit end action; simultaneous free-form negotiation happens in chat).
 */

function alliedWith(state: GameState, factionId: string): string | undefined {
  const alliance = state.alliances.find((a) => a.members.includes(factionId));
  return alliance?.members.find((m) => m !== factionId);
}

export const nexusPhase: PhaseModule = {
  phase: 'nexus',

  onEnter(state): GameState {
    return appendLog(state, {
      event: 'nexus.begin',
      text: 'Nexus! Alliances may now be formed or broken.',
    });
  },

  getAllowedActions(state, playerId): AllowedAction[] {
    if (!state.nexusPhase?.open) return [];
    const faction = getPlayer(state, playerId).factionId;
    const actions: AllowedAction[] = [
      { type: 'nexus/pass', label: 'Stand alone (no alliance changes)' },
      { type: 'nexus/end', label: 'Declare the nexus over' },
    ];
    if (alliedWith(state, faction)) {
      actions.push({ type: 'nexus/break', label: 'Break your alliance' });
    } else {
      const candidates = Object.values(state.players)
        .map((p) => p.factionId)
        .filter((f) => f !== faction && !alliedWith(state, f));
      if (candidates.length > 0)
        actions.push({ type: 'nexus/propose', label: 'Propose an alliance', params: { candidates } });
      const incoming = state.nexusPhase.proposals.filter((p) => p.to === faction);
      if (incoming.length > 0)
        actions.push({
          type: 'nexus/respond',
          label: 'Respond to an alliance proposal',
          params: { from: incoming.map((p) => p.from) },
        });
    }
    return actions;
  },

  validateAction(state, action): ValidationResult {
    if (!state.nexusPhase?.open) return fail('nexus-closed', 'No nexus is in progress.');
    const faction = getPlayer(state, action.playerId as PlayerId).factionId;
    switch (action.type) {
      case 'nexus/pass':
      case 'nexus/end':
        return ok();
      case 'nexus/break':
        return alliedWith(state, faction)
          ? ok()
          : fail('no-alliance', 'You have no alliance to break.');
      case 'nexus/propose': {
        const a = action as NexusAllianceProposalAction;
        if (a.withFactionId === faction) return fail('self-alliance', 'You cannot ally with yourself.');
        if (!getPlayerByFaction(state, a.withFactionId)) return fail('unknown-faction', 'That faction is not in this game.');
        if (alliedWith(state, faction)) return fail('already-allied', 'Break your current alliance first.');
        if (alliedWith(state, a.withFactionId)) return fail('target-allied', 'That faction is already allied.');
        return ok();
      }
      case 'nexus/respond': {
        const a = action as NexusAllianceResponseAction;
        const proposal = state.nexusPhase.proposals.find((p) => p.from === a.toFactionId && p.to === faction);
        if (!proposal) return fail('no-proposal', 'No such proposal is open.');
        if (a.accept && alliedWith(state, faction)) return fail('already-allied', 'Break your current alliance first.');
        if (a.accept && alliedWith(state, a.toFactionId)) return fail('target-allied', 'That faction has since allied elsewhere.');
        return ok();
      }
      default:
        return fail('wrong-phase', `Action ${action.type} is not part of the nexus.`);
    }
  },

  applyAction(state, action): GameState {
    const playerId = action.playerId as PlayerId;
    const faction = getPlayer(state, playerId).factionId;
    switch (action.type) {
      case 'nexus/pass':
        return appendLog(state, {
          event: 'nexus.pass',
          text: `${getPlayer(state, playerId).name} stands alone.`,
          at: action.at,
        });
      case 'nexus/end': {
        const next: GameState = {
          ...state,
          nexusPhase: state.nexusPhase ? { ...state.nexusPhase, open: false } : null,
        };
        return appendLog(next, { event: 'nexus.end', text: 'The nexus is over.', at: action.at });
      }
      case 'nexus/break': {
        const ally = alliedWith(state, faction)!;
        const next: GameState = {
          ...state,
          alliances: state.alliances.filter((a) => !a.members.includes(faction)),
        };
        return appendLog(next, {
          event: 'nexus.broken',
          text: `${faction} broke its alliance with ${ally}.`,
          data: { members: [faction, ally] },
          at: action.at,
        });
      }
      case 'nexus/propose': {
        const a = action as NexusAllianceProposalAction;
        const next: GameState = {
          ...state,
          nexusPhase: {
            ...state.nexusPhase!,
            proposals: [...state.nexusPhase!.proposals, { from: faction, to: a.withFactionId }],
          },
        };
        return appendLog(next, {
          event: 'nexus.proposed',
          text: `${faction} proposes an alliance with ${a.withFactionId}.`,
          at: action.at,
        });
      }
      case 'nexus/respond': {
        const a = action as NexusAllianceResponseAction;
        let next: GameState = {
          ...state,
          nexusPhase: {
            ...state.nexusPhase!,
            proposals: state.nexusPhase!.proposals.filter(
              (p) => !(p.from === a.toFactionId && p.to === faction),
            ),
          },
        };
        if (!a.accept) {
          return appendLog(next, {
            event: 'nexus.declined',
            text: `${faction} declined the alliance with ${a.toFactionId}.`,
            at: action.at,
          });
        }
        next = {
          ...next,
          alliances: [
            ...next.alliances,
            { members: [a.toFactionId, faction], formedOnRound: next.round },
          ],
        };
        return appendLog(next, {
          event: 'nexus.formed',
          text: `Alliance formed: ${a.toFactionId} and ${faction}.`,
          data: { members: [a.toFactionId, faction] },
          at: action.at,
        });
      }
      default:
        throw new Error(`nexus phase cannot apply ${action.type}`);
    }
  },

  isPhaseComplete(state): boolean {
    return state.nexusPhase?.open === false;
  },

  advancePhase(state): GameState {
    const resume = state.interruptedPhase ?? 'bidding';
    return { ...state, nexusPhase: null, interruptedPhase: null, phase: resume };
  },
};
