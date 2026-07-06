import { describe, expect, it } from 'vitest';
import { addInfluence } from '../../imperium/engine/effects';
import { makeImp, patch } from './helpers';

describe('influence and alliances', () => {
  it('grants VP when crossing configured levels and removes it when dropping back', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'emperor', 1);
    expect(s.players.p1.vp).toBe(0);
    s = addInfluence(s, 'p1', 'emperor', 1); // reaches 2
    expect(s.players.p1.vp).toBe(1);
    s = addInfluence(s, 'p1', 'emperor', -1); // back to 1
    expect(s.players.p1.vp).toBe(0);
  });

  it('clamps influence to the track bounds', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'fremen', 10);
    expect(s.players.p1.influence.fremen).toBe(6);
    s = addInfluence(s, 'p1', 'fremen', -10);
    expect(s.players.p1.influence.fremen).toBe(0);
  });

  it('awards the alliance to the sole player at the alliance level', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'spacingGuild', 4); // crosses level 2 (1 VP) + alliance VP
    expect(s.alliances.spacingGuild).toBe('p1');
    expect(s.players.p1.vp).toBe(2); // 1 for reaching level 2, 1 for the alliance
  });

  it('a rival must exceed the holder to take the alliance', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'fremen', 4);
    expect(s.alliances.fremen).toBe('p1');
    const vpBefore = s.players.p2.vp;
    s = addInfluence(s, 'p2', 'fremen', 4); // ties the holder — no steal
    expect(s.alliances.fremen).toBe('p1');
    s = addInfluence(s, 'p2', 'fremen', 1); // now 5 > 4
    expect(s.alliances.fremen).toBe('p2');
    expect(s.players.p2.vp).toBe(vpBefore + 1 /* level 2 */ + 1 /* alliance */);
    expect(s.players.p1.vp).toBe(1); // kept the level-2 VP, lost the alliance VP
  });

  it('losing the qualifying level forfeits the alliance token', () => {
    let s = makeImp();
    s = addInfluence(s, 'p1', 'beneGesserit', 4);
    expect(s.alliances.beneGesserit).toBe('p1');
    s = addInfluence(s, 'p1', 'beneGesserit', -1); // below the alliance level
    expect(s.alliances.beneGesserit).toBeUndefined();
  });
});
