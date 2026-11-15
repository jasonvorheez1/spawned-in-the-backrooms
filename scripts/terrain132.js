// Level 132 "The Duchy of Morigont": Lumiria sits dead level (y = 0) out to 70 m, warm rolling countryside beyond,
// the Duke's rise to the north-east, and about 380 m out the duchy ends in sheer chalk cliffs over the sea (config.yaml sea mark, level -24).
// Numbers mirror scripts/lib/data/level132.yml (town, keep, edge).
const TOWN = 70, KEEP = { x: 110, z: -110, r: 34, h: 9 }, EDGE = 380, WOBBLE = 6, FACE = 9, FLOOR = -46;
const c01 = (v) => Math.min(1, Math.max(0, v));
const ss = (v) => { v = c01(v); return v * v * (3 - 2 * v); };
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const r = Math.hypot(x, z), out = ss((r - TOWN) / 90);
  const roll = 5 * noise.fbm2({ x, z, frequency: 1 / 240, octaves: 2, seed: seedOffset(1) }) + 1.2 * noise.fbm2({ x, z, frequency: 1 / 70, octaves: 2, seed: seedOffset(2) });
  const dk = Math.hypot(x - KEEP.x, z - KEEP.z), rise = KEEP.h * ss(1 - (dk - KEEP.r) / 60);
  const h = Math.max((roll + 1.5) * out, rise * ss((r - TOWN) / 30));
  const d = r - lip(ctx), fall = ss(d / FACE);
  const rib = 1.6 * noise.fbm2({ x, z, frequency: 1 / 7, octaves: 2, seed: seedOffset(5) }) * fall * (1 - fall) * 4; // fluted chalk face
  return h * (1 - fall) + FLOOR * fall + rib;
}
// where the cliff begins: a wandering coastline, never a circle; never closer than EDGE - WOBBLE (the rim wall stands at 368)
function lip(ctx) { return EDGE + WOBBLE * Math.max(-1, Math.min(1, ctx.noise.fbm2({ x: ctx.x, z: ctx.z, frequency: 1 / 60, octaves: 2, seed: ctx.seedOffset(4) }))); }
export function materialAt(ctx) {
  const { x, z, noise, seedOffset, slope } = ctx;
  const r = Math.hypot(x, z), n = noise.fbm2({ x, z, frequency: 1 / 9, octaves: 3, seed: seedOffset(3) });
  if (r > lip(ctx) - 3 + n * 2 || slope > 0.3) return { chalk: 1 };
  if (r < 27 + n * 1.2) return { cobble: 1 };
  const k = c01((r - 27 - n * 1.2) / 2.5);
  return { cobble: 1 - k, grass: k };
}
