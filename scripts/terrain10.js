// Level 10 "Bumper Crop": low rolling farmland cut into plots by hedgerows. Plots are 80 x 60 m; each is standing wheat,
// harvested stubble or barley by a hash of its cell. The spawn (0, 0) sits level on the farm track.
const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const PLOT = { w: 80, d: 60 };
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = 3.2 * noise.fbm2({ x, z, frequency: 1 / 260, octaves: 2, seed: seedOffset(0) }) + 0.6 * noise.fbm2({ x, z, frequency: 1 / 70, octaves: 2, seed: seedOffset(1) });
  const flat = clamp01((Math.hypot(x, z) - 18) / 40); // a level yard round the spawn
  return roll * flat;
}
export function materialAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const gx = ((x + PLOT.w / 2) % PLOT.w + PLOT.w) % PLOT.w, gz = ((z + PLOT.d / 2) % PLOT.d + PLOT.d) % PLOT.d;
  const edge = Math.min(gx, PLOT.w - gx, gz, PLOT.d - gz) + noise.fbm2({ x, z, frequency: 1 / 9, octaves: 2, seed: seedOffset(4) }) * 0.8;
  if (edge < 3.2) return { grass: 1 }; // the hedgerow verge between plots
  const cell = hash(Math.floor((x + PLOT.w / 2) / PLOT.w), Math.floor((z + PLOT.d / 2) / PLOT.d));
  const n = noise.fbm2({ x, z, frequency: 1 / 25, octaves: 2, seed: seedOffset(6) });
  if (cell < 0.55) return { wheat: 0.85 + n * 0.1, dirt: 0.15 - n * 0.1 };
  if (cell < 0.85) return { stubble: 0.9, dirt: 0.1 + Math.max(0, n) * 0.2 };
  return { barley: 1 };
}
