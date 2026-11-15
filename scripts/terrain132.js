// Level 132 "The Duchy of Morigont": Lumiria sits dead level (y = 0) out to 70 m, warm rolling countryside beyond,
// the Duke's rise to the north-east, and past 380 m the duchy ends in chalk cliffs over the white void.
// Numbers mirror scripts/lib/data/level132.yml (town, keep, edge).
const TOWN = 70, KEEP = { x: 110, z: -110, r: 34, h: 9 }, EDGE = 380;
const c01 = (v) => Math.min(1, Math.max(0, v));
const ss = (v) => { v = c01(v); return v * v * (3 - 2 * v); };
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const r = Math.hypot(x, z), out = ss((r - TOWN) / 90);
  const roll = 5 * noise.fbm2({ x, z, frequency: 1 / 240, octaves: 2, seed: seedOffset(1) }) + 1.2 * noise.fbm2({ x, z, frequency: 1 / 70, octaves: 2, seed: seedOffset(2) });
  const dk = Math.hypot(x - KEEP.x, z - KEEP.z), rise = KEEP.h * ss(1 - (dk - KEEP.r) / 60);
  const h = Math.max((roll + 1.5) * out, rise * ss((r - TOWN) / 30));
  const fall = ss((r - EDGE) / 26);
  return h * (1 - fall) - 220 * fall * fall;
}
export function materialAt(ctx) {
  const { x, z, noise, seedOffset, slope } = ctx;
  const r = Math.hypot(x, z), n = noise.fbm2({ x, z, frequency: 1 / 9, octaves: 3, seed: seedOffset(3) });
  if (r > EDGE - 4 + n * 3 || slope > 0.3) return { chalk: 1 };
  if (r < 27 + n * 1.2) return { cobble: 1 };
  const k = c01((r - 27 - n * 1.2) / 2.5);
  return { cobble: 1 - k, grass: k };
}
