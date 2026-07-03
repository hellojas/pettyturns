import type { GameState, RngState } from '../types';

/**
 * Deterministic seeded PRNG (mulberry32). The cursor lives in GameState, so a
 * draw is itself a state transition: same seed + same action list ⇒ same game.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Get the float at a given cursor position for a seed (pure). */
function valueAt(seed: number, cursor: number): number {
  const next = mulberry32(seed + cursor * 0x9e3779b9);
  return next();
}

export function nextFloat(rng: RngState): { value: number; rng: RngState } {
  return {
    value: valueAt(rng.seed, rng.cursor),
    rng: { seed: rng.seed, cursor: rng.cursor + 1 },
  };
}

export function nextInt(rng: RngState, minInclusive: number, maxInclusive: number): { value: number; rng: RngState } {
  const { value, rng: next } = nextFloat(rng);
  const span = maxInclusive - minInclusive + 1;
  return { value: minInclusive + Math.floor(value * span), rng: next };
}

/** Fisher–Yates shuffle returning a new array and the advanced RNG state. */
export function shuffle<T>(rng: RngState, items: readonly T[]): { items: T[]; rng: RngState } {
  const out = items.slice();
  let cur = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const draw = nextInt(cur, 0, i);
    cur = draw.rng;
    const j = draw.value;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { items: out, rng: cur };
}

/** Convenience for reducers: draw an int and return a state with the advanced rng. */
export function withRngInt(state: GameState, min: number, max: number): { value: number; state: GameState } {
  const { value, rng } = nextInt(state.rng, min, max);
  return { value, state: { ...state, rng } };
}
