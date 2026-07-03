import { describe, expect, it } from 'vitest';
import { nextFloat, nextInt, shuffle } from '../game/engine/rng';

describe('seeded rng', () => {
  it('is deterministic for the same seed and cursor', () => {
    const a = nextFloat({ seed: 123, cursor: 0 });
    const b = nextFloat({ seed: 123, cursor: 0 });
    expect(a.value).toBe(b.value);
    expect(a.rng.cursor).toBe(1);
  });

  it('produces different draws as the cursor advances', () => {
    const first = nextFloat({ seed: 7, cursor: 0 });
    const second = nextFloat(first.rng);
    expect(first.value).not.toBe(second.value);
  });

  it('nextInt stays within bounds across many draws', () => {
    let rng = { seed: 99, cursor: 0 };
    for (let i = 0; i < 500; i++) {
      const draw = nextInt(rng, 1, 3);
      rng = draw.rng;
      expect(draw.value).toBeGreaterThanOrEqual(1);
      expect(draw.value).toBeLessThanOrEqual(3);
    }
  });

  it('shuffle is a deterministic permutation', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const s1 = shuffle({ seed: 5, cursor: 0 }, items);
    const s2 = shuffle({ seed: 5, cursor: 0 }, items);
    expect(s1.items).toEqual(s2.items);
    expect([...s1.items].sort()).toEqual([...items].sort());
    const s3 = shuffle({ seed: 6, cursor: 0 }, items);
    expect(s3.items.join('')).not.toBe(s1.items.join(''));
  });
});
