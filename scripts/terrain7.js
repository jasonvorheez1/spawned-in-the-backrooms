// Level 7 "Thalassophobia": one black rock with the room on it, open grey sea, two islands on the horizon.
// Sea level 0. The entrance rock's flat top sits at y 4 around the origin.
import { shore } from "builtin/terrain";
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ss = (t) => t * t * (3 - 2 * t);
export const ISLES = [
  { x: 0, z: 0, r: 26, top: 4, flat: 0.38 },      // the entrance rock
  { x: 46, z: -120, r: 34, top: 7, flat: 0.25 },  // the near island
  { x: -95, z: -230, r: 55, top: 11, flat: 0.3 }, // the far island (Savi's pick: where Fort Surrender will stand)
];
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  let h = -22 + 3 * noise.fbm2({ x, z, frequency: 1 / 140, octaves: 2, seed: seedOffset(0) });
  for (const s of ISLES) {
    const d = Math.hypot(x - s.x, z - s.z) / s.r;
    if (d >= 1) continue;
    const t = ss(clamp01((d - s.flat) / (1 - s.flat)));
    const bumpN = 0.6 * noise.fbm2({ x, z, frequency: 1 / 9, octaves: 2, seed: seedOffset(3) });
    const top = s.top + (d > s.flat * 0.7 ? bumpN : 0);
    h = Math.max(h, top + (-22 - top) * t);
  }
  return shore(h, 0);
}
export function materialAt(ctx) {
  const { worldHeight, slope, noise, x, z, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 12, octaves: 2, seed: seedOffset(5) });
  if (worldHeight < 1.2 + n * 0.8 && slope < 0.3) return { sand: 1 };
  return { rock: 1 };
}
