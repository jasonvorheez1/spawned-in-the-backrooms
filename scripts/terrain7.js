// Level 7 "Thalassophobia": one black rock with the room on it, open grey sea, two islands on the horizon.
// Sea level 0. The entrance rock's flat top sits at y 4 around the origin.
import { shore } from "builtin/terrain";
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ss = (t) => t * t * (3 - 2 * t);
export const ISLES = [
  { x: 0, z: 0, r: 26, top: 4, flat: 0.38 },      // the entrance rock
  { x: 46, z: -120, r: 34, top: 7, flat: 0.25 },  // the near island
  { x: -70, z: -95, r: 55, top: 11, flat: 0.3 }, // the nearest island to the entrance (the wiki: Fort Surrender stands on it)
  { x: 4, z: 8, r: 46, top: -7, flat: 0.12 },      // the tall mountain on the sea floor almost directly below the entrance (the way down to Level 8)
  // sea stacks (Nov 9, "massively improve level 7"): lone basalt pillars standing out of the water, off the boat routes
  { x: 62, z: -28, r: 9, top: 13, flat: 0.04, stack: 1 },
  { x: -34, z: 44, r: 7, top: 9, flat: 0.04, stack: 1 },
  { x: -128, z: -58, r: 11, top: 16, flat: 0.04, stack: 1 },
  { x: 22, z: -178, r: 8, top: 11, flat: 0.04, stack: 1 },
  { x: 96, z: -140, r: 6, top: 7, flat: 0.04, stack: 1 },
];
// the fort's stone steps climb this line (places/level7/sim.js l7-ft-step-*): the crags stay off it so no step floats or sinks
const STAIR = [{ x: -48.5, z: -66.5 }, { x: -66.05, z: -87.95 }];
function stairDist(x, z) {
  const [a, b] = STAIR, dx = b.x - a.x, dz = b.z - a.z, t = clamp01(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  let h = -22 + 3 * noise.fbm2({ x, z, frequency: 1 / 140, octaves: 2, seed: seedOffset(0) });
  for (const s of ISLES) {
    const d = Math.hypot(x - s.x, z - s.z) / s.r;
    if (d >= 1) continue;
    const t = s.stack ? Math.pow(clamp01((d - s.flat) / (1 - s.flat)), 2.2) : ss(clamp01((d - s.flat) / (1 - s.flat))); // a stack drops sheer, an island slopes
    const bumpN = 0.6 * noise.fbm2({ x, z, frequency: 1 / 9, octaves: 2, seed: seedOffset(3) });
    const top = s.top + (d > s.flat * 0.7 ? bumpN : 0);
    let hh = top + (-22 - top) * t;
    // basalt crags on the flanks: ridged ledges and stepped columns, strongest mid-slope, none on the built tops or under the sea
    if (s.top > 0 && t > 0.02 && hh > -3) {
      const rid = 1 - Math.abs(noise.fbm2({ x, z, frequency: 1 / 7, octaves: 3, seed: seedOffset(7) }));
      const amp = (s.stack ? 2.2 : 1.6) * Math.sin(Math.PI * clamp01(t * 1.15)) * clamp01((hh + 3) / 3) * (s.stack ? 1 : clamp01((stairDist(x, z) - 3) / 4));
      let c = hh + (rid * rid - 0.35) * amp;
      const step = s.stack ? 1.1 : 0.9, q = Math.floor(c / step) * step; // columnar steps: flat ledges and short risers
      c = q + ss(clamp01((c - q) / step * 1.6 - 0.3)) * step;
      hh = hh + (c - hh) * clamp01(amp / 1.2);
    }
    h = Math.max(h, hh);
  }
  // shore() beaches the waterline but flattens every height above it (a 7 m island came out under 1 m, so the camps built on the tops hovered); keep the
  // beach where the land meets the sea and the island's own height from 3 m up, blended between
  const w = clamp01((h - 0.5) / 2.5);
  let out = shore(h, 0) * (1 - w) + (h - 0.1) * w;
  // the timber stair (l7w-stair over the l7-ft-step-* colliders) runs in a cutting: the slope is dug down under its treads so none is buried
  const sd = stairDist(x, z);
  if (sd < 4.5) {
    const [a, b] = STAIR, dx = b.x - a.x, dz = b.z - a.z, t = clamp01(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz));
    const cut = 2.27 + 0.7 * 13 * t - 1.07, k = 1 - ss(clamp01((sd - 1.9) / 2.6));
    if (out > cut) out -= (out - cut) * k;
  }
  return out;
}
export function materialAt(ctx) {
  const { worldHeight, slope, noise, x, z, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 12, octaves: 2, seed: seedOffset(5) });
  if (worldHeight < 1.2 + n * 0.8 && slope < 0.3) return { sand: 1 };
  return { rock: 1 };
}
