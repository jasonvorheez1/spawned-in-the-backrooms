// Level 178 "Kyoto Dreams": dead-level ground (y = 0) so nobody ever falls; one cut under the hot spring basin (art/kyoto) so its bed can sit below grade.
// Moss in the courtyard with raked gravel paths; gravel around the house. Numbers mirror scripts/lib/data/level178.yml (pool).
const POOL = { hx: 2.75, hz: 1.55, cut: -1.7 };
export function heightAt(ctx) {
  const { x, z } = ctx;
  return Math.abs(x) < POOL.hx && Math.abs(z) < POOL.hz ? POOL.cut : 0;
}
export function materialAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 5, octaves: 3, seed: seedOffset(3) });
  const yard = Math.max(Math.abs(x), Math.abs(z)) < 7.4;
  if (!yard) return { gravel: 1 };
  const path = Math.abs(x) < 0.9 + n * 0.3 && z > 2 || Math.abs(Math.hypot(x, z) - 5.6) < 0.45 + n * 0.3;
  return path ? { gravel: 1 } : { moss: 1 };
}
