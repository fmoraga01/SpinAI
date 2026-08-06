// Tiny deterministic PRNG (mulberry32) shared by the pure `lego/*` modules.
// Using a seeded PRNG instead of `Math.random()` keeps `layout.ts`/`paths.ts`
// testable with Vitest (same seed -> same output) — see design.md
// "Generación de posiciones" / "Trayectorias".
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
