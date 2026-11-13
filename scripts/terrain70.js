// Level 70 "Froidetown": snow. Level (y = 0) on the street and inside every zone of scripts/lib/level70.js, drifts and low hills beyond.
import { wildness, STREET, RIVER, ZONES } from "./lib/level70.js";
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const w = wildness(x, z);
  const hills = 2.6 * noise.fbm2({ x, z, frequency: 1 / 120, octaves: 3, seed: seedOffset(0) }) + 1.6;
  const drift = 0.35 * noise.fbm2({ x, z, frequency: 1 / 11, octaves: 2, seed: seedOffset(1) });
  return w * w * (hills + drift);
}
export function materialAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  if (Math.abs(z - RIVER.z) < RIVER.w / 2 - 1) return { ice: 1 };
  const n = noise.fbm2({ x, z, frequency: 1 / 6, octaves: 2, seed: seedOffset(3) });
  if (Math.abs(x - STREET.x) < STREET.w / 2 + n * 0.5 && z < STREET.z0 + 4 && z > STREET.z1) {
    const rut = Math.abs(Math.abs(x - STREET.x) - 1.6) < 0.55 + n * 0.2 ? 1 : 0; // tyre ruts down to wet asphalt
    return rut ? { asphalt: 0.85, packed: 0.15 } : { packed: 0.8 + n * 0.1, asphalt: 0.2 - n * 0.1 };
  }
  const p = ZONES.pocket; if (Math.hypot(x - p.x, z - p.z) < p.r - 3 + n * 2) return { packed: 1 };
  return { snow: 1 };
}
