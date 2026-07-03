import { describe, expect, it } from 'vitest';
import { getVisibleGameState } from '../game/engine/visibility/getVisibleGameState';
import { appendLog, privateTo } from '../game/engine/log';
import { makeGame, completeSetup, playerByFaction } from './helpers';

describe('hidden information filtering', () => {
  it('shows a player their own hand but only counts for others', () => {
    const state = completeSetup(makeGame(['atreides', 'harkonnen']));
    const at = playerByFaction(state, 'atreides');
    const hk = playerByFaction(state, 'harkonnen');
    const view = getVisibleGameState(state, at);

    expect(view.hidden.self?.hand).toEqual(state.hidden[at].hand);
    expect(view.hidden.others[hk].handCount).toBe(state.hidden[hk].hand.length);
    expect((view.hidden.others[hk] as Record<string, unknown>).hand).toBeUndefined();
  });

  it('never exposes other players\' traitors or predictions', () => {
    const state = completeSetup(makeGame(['beneGesserit', 'harkonnen']));
    const bg = playerByFaction(state, 'beneGesserit');
    const hk = playerByFaction(state, 'harkonnen');
    const hkView = getVisibleGameState(state, hk);
    expect(hkView.hidden.others[bg].hasPrediction).toBe(true);
    expect((hkView.hidden.others[bg] as Record<string, unknown>).prediction).toBeUndefined();
    expect((hkView.hidden.others[bg] as Record<string, unknown>).traitors).toBeUndefined();
  });

  it('replaces draw piles with counts and hides the seed', () => {
    const state = completeSetup(makeGame(['atreides', 'harkonnen']));
    const view = getVisibleGameState(state, playerByFaction(state, 'atreides'));
    expect(view.decks.treacheryDrawCount).toBe(state.decks.treacheryDraw.length);
    expect((view.decks as Record<string, unknown>).treacheryDraw).toBeUndefined();
    expect(view.rng.seed).toBe(0);
  });

  it('only reveals treachery card identities the viewer may know', () => {
    const state = completeSetup(makeGame(['atreides', 'harkonnen']));
    const at = playerByFaction(state, 'atreides');
    const view = getVisibleGameState(state, at);
    const knownIds = new Set([
      ...state.hidden[at].hand.map((c) => c.id),
      ...state.decks.treacheryDiscard,
    ]);
    expect(new Set(Object.keys(view.decks.treacheryById))).toEqual(knownIds);
  });

  it('filters private log entries per viewer; spectators see only public entries', () => {
    let state = completeSetup(makeGame(['atreides', 'harkonnen']));
    const at = playerByFaction(state, 'atreides');
    const hk = playerByFaction(state, 'harkonnen');
    state = appendLog(state, { event: 'test.secret', text: 'for atreides only', visibility: privateTo(at) });

    const atView = getVisibleGameState(state, at);
    const hkView = getVisibleGameState(state, hk);
    const specView = getVisibleGameState(state, 'SPECTATOR');
    expect(atView.log.some((e) => e.event === 'test.secret')).toBe(true);
    expect(hkView.log.some((e) => e.event === 'test.secret')).toBe(false);
    expect(specView.log.some((e) => e.event === 'test.secret')).toBe(false);
    expect(specView.log.every((e) => e.visibility.scope === 'public')).toBe(true);
  });

  it('shows who committed to a pending decision but never the payload', () => {
    let state = completeSetup(makeGame(['atreides', 'harkonnen']));
    const decision = state.pendingDecisions.find((d) => d.kind === 'stormDial')!;
    const [d1, d2] = decision.waitingFor;
    state = {
      ...state,
      pendingDecisions: state.pendingDecisions.map((d) =>
        d.kind === 'stormDial' ? { ...d, committed: { [d1]: 17 } } : d,
      ),
    };
    const otherView = getVisibleGameState(state, d2);
    const pd = otherView.pendingDecisions.find((d) => d.kind === 'stormDial')!;
    expect(pd.committedBy).toEqual([d1]);
    expect((pd as Record<string, unknown>).committed).toBeUndefined();
    expect(pd.ownCommitment).toBeUndefined();

    const ownView = getVisibleGameState(state, d1);
    expect(ownView.pendingDecisions.find((d) => d.kind === 'stormDial')!.ownCommitment).toBe(17);
  });

  it('is serializable and does not leak via JSON round-trip', () => {
    const state = completeSetup(makeGame(['atreides', 'harkonnen']));
    const hk = playerByFaction(state, 'harkonnen');
    const json = JSON.stringify(getVisibleGameState(state, hk));
    const at = playerByFaction(state, 'atreides');
    // no card in the atreides hand should appear in the harkonnen view JSON
    for (const card of state.hidden[at].hand) {
      expect(json.includes(`"${card.id}"`)).toBe(false);
    }
  });
});
