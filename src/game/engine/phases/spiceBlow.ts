import { FACTIONS } from '../../data/factions';
import { TERRITORIES } from '../../data/territories';
import type { AllowedAction, GameState, SpiceCard, TurnAction, ValidationResult } from '../../types';
import { fail } from '../../types';
import { appendLog } from '../log';
import { shuffle } from '../rng';
import { sendToTanks } from '../state';
import type { PhaseModule } from './module';

/**
 * Spice blow (basic game, single blow).
 *
 * Draw the top spice card:
 *  - Territory card: the printed amount of spice appears at that territory's
 *    blow sector — unless that sector is currently under the storm, in which
 *    case no spice appears this round (VERIFY). Card goes to the discard pile.
 *  - Worm: on round 1 it is set aside and a replacement is drawn (set-aside
 *    worms are shuffled back afterwards, VERIFY). On later rounds it devours
 *    all forces and spice in the territory of the most recent territory blow
 *    (the desert faction's forces are spared), a nexus follows this phase, and
 *    drawing continues until a territory card appears.
 *  - An empty draw pile is rebuilt by reshuffling the discards.
 */

function reshuffleIfEmpty(state: GameState): GameState {
  if (state.decks.spiceDraw.length > 0) return state;
  const combined = [...state.decks.spiceDiscardA, ...state.decks.spiceDiscardB];
  const { items, rng } = shuffle(state.rng, combined);
  let next: GameState = {
    ...state,
    rng,
    decks: { ...state.decks, spiceDraw: items, spiceDiscardA: [], spiceDiscardB: [] },
  };
  return appendLog(next, { event: 'spiceBlow.reshuffled', text: 'The spice deck was reshuffled from its discards.' });
}

function lastBlowTerritory(state: GameState): string | undefined {
  for (let i = state.decks.spiceDiscardA.length - 1; i >= 0; i--) {
    const card = state.decks.spiceById[state.decks.spiceDiscardA[i]];
    if (card.kind === 'territory') return card.territoryId;
  }
  return undefined;
}

function devour(state: GameState, territoryId: string): GameState {
  let next = state;
  const territory = TERRITORIES[territoryId];

  const survivors: GameState['stacks'] = [];
  for (const stack of next.stacks) {
    if (stack.territoryId !== territoryId) {
      survivors.push(stack);
      continue;
    }
    const spared = FACTIONS[stack.factionId]?.powers.some((p) => p.id === 'worm-riders');
    if (spared) {
      survivors.push(stack);
      continue;
    }
    const owner = Object.values(next.players).find((p) => p.factionId === stack.factionId);
    if (!owner) {
      survivors.push(stack);
      continue;
    }
    next = sendToTanks(next, owner.id, stack.forces, stack.specialForces);
    next = appendLog(next, {
      event: 'spiceBlow.devoured',
      text: `The worm devoured ${stack.forces + stack.specialForces} ${FACTIONS[stack.factionId].name} force(s) in ${territory.name}.`,
      data: { factionId: stack.factionId, territoryId },
    });
  }
  next = { ...next, stacks: survivors };

  const spiceEaten = next.spiceOnBoard.filter((s) => s.territoryId === territoryId);
  for (const s of spiceEaten) {
    next = appendLog(next, {
      event: 'spiceBlow.spiceDevoured',
      text: `The worm swallowed ${s.amount} spice in ${territory.name}.`,
      data: { territoryId, amount: s.amount },
    });
  }
  return { ...next, spiceOnBoard: next.spiceOnBoard.filter((s) => s.territoryId !== territoryId) };
}

function resolveBlow(state: GameState): GameState {
  let next = state;
  let wormAppeared = false;
  const setAsideWorms: string[] = [];

  // draw until a territory card resolves
  for (let guard = 0; guard < 64; guard++) {
    next = reshuffleIfEmpty(next);
    const [cardId, ...rest] = next.decks.spiceDraw;
    if (!cardId) break;
    const card: SpiceCard = next.decks.spiceById[cardId];
    next = { ...next, decks: { ...next.decks, spiceDraw: rest } };

    if (card.kind === 'worm') {
      if (next.round === 1) {
        setAsideWorms.push(cardId);
        next = appendLog(next, {
          event: 'spiceBlow.wormSetAside',
          text: 'A worm surfaced on the first round — it is set aside and a new card is drawn.',
        });
        continue;
      }
      wormAppeared = true;
      next = { ...next, decks: { ...next.decks, spiceDiscardA: [...next.decks.spiceDiscardA, cardId] } };
      const target = lastBlowTerritory(next);
      next = appendLog(next, {
        event: 'spiceBlow.worm',
        text: target
          ? `A worm surfaced in ${TERRITORIES[target].name}! A nexus will follow.`
          : 'A worm surfaced, but there was no previous blow territory to strike.',
        data: { territoryId: target ?? null },
      });
      if (target) next = devour(next, target);
      continue; // keep drawing until a territory card appears
    }

    // territory card
    const territory = TERRITORIES[card.territoryId!];
    const blow = territory.spiceBlow!;
    const underStorm = next.storm.sector === blow.sector;
    next = {
      ...next,
      decks: { ...next.decks, spiceDiscardA: [...next.decks.spiceDiscardA, cardId] },
    };
    if (underStorm) {
      next = appendLog(next, {
        event: 'spiceBlow.smothered',
        text: `The blow card shows ${territory.name}, but its blow sector is under the storm — no spice appears.`,
        data: { territoryId: territory.id },
      });
    } else {
      const existing = next.spiceOnBoard.find(
        (s) => s.territoryId === territory.id && s.sector === blow.sector,
      );
      const spiceOnBoard = existing
        ? next.spiceOnBoard.map((s) =>
            s === existing ? { ...s, amount: s.amount + blow.amount } : s,
          )
        : [...next.spiceOnBoard, { territoryId: territory.id, sector: blow.sector, amount: blow.amount }];
      next = { ...next, spiceOnBoard };
      next = appendLog(next, {
        event: 'spiceBlow.spice',
        text: `Spice blow: ${blow.amount} spice appears in ${territory.name} (sector ${blow.sector}).`,
        data: { territoryId: territory.id, sector: blow.sector, amount: blow.amount },
      });
    }
    break;
  }

  // round-1 set-aside worms go back into the draw pile, reshuffled (VERIFY)
  if (setAsideWorms.length > 0) {
    const { items, rng } = shuffle(next.rng, [...next.decks.spiceDraw, ...setAsideWorms]);
    next = { ...next, rng, decks: { ...next.decks, spiceDraw: items } };
  }

  return { ...next, spiceBlowPhase: { resolved: true, wormAppeared } };
}

export const spiceBlowPhase: PhaseModule = {
  phase: 'spiceBlow',

  onEnter(state): GameState {
    return resolveBlow({ ...state, spiceBlowPhase: { resolved: false, wormAppeared: false } });
  },

  getAllowedActions(): AllowedAction[] {
    return []; // fully automatic in the basic game (worm riding is an advanced hook)
  },

  validateAction(_state, action): ValidationResult {
    return fail('wrong-phase', `Action ${action.type} is not part of the spice blow phase.`);
  },

  applyAction(_state, action): GameState {
    throw new Error(`spice blow phase cannot apply ${action.type}`);
  },

  isPhaseComplete(state): boolean {
    return state.spiceBlowPhase?.resolved === true;
  },

  advancePhase(state): GameState {
    const worm = state.spiceBlowPhase?.wormAppeared === true;
    const next: GameState = { ...state, spiceBlowPhase: null };
    if (worm) {
      return {
        ...next,
        phase: 'nexus',
        interruptedPhase: 'bidding',
        nexusPhase: { cause: 'worm', open: true, proposals: [], resumeSpiceBlow: false },
      };
    }
    return { ...next, phase: 'bidding' };
  },
};
