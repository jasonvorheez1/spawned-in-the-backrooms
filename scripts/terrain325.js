// Level 325 "Boom Town": the city floor. Roads at y 0 on every cell border, kerb up to 0.15 for sidewalk and lot.
// A basement tower's core pit is sunk so its stair can go down. Map: scripts/lib/level325.js.
import { CELL, ROAD, LOT, GROUND, cellInfo } from "./lib/level325.js";
function local(x, z) { const ix = Math.round(x / CELL), iz = Math.round(z / CELL); return { ix, iz, dx: Math.abs(x - ix * CELL), dz: Math.abs(z - iz * CELL) }; }
export function heightAt(ctx) {
  const { x, z } = ctx, c = local(x, z), edge = CELL / 2 - ROAD / 2, m = Math.max(c.dx, c.dz);
  if (m > edge + 0.25) return 0;
  if (m > edge) return GROUND * (edge + 0.25 - m) / 0.25; // kerb face
  if (m < 6.6) { const i = cellInfo(c.ix, c.iz); if (i.basement) return -3.35; }
  return GROUND;
}
export function materialAt(ctx) {
  const { x, z, noise, seedOffset } = ctx, c = local(x, z), edge = CELL / 2 - ROAD / 2, m = Math.max(c.dx, c.dz);
  const n = noise.fbm2({ x, z, frequency: 1 / 7, octaves: 2, seed: seedOffset(1) });
  if (m > edge) return { asphalt: 0.85 - n * 0.1, sitedirt: 0.15 + n * 0.1 };
  if (m > LOT / 2) return { paving: 0.9, sitedirt: 0.1 };
  return { sitedirt: 0.8 + n * 0.15, paving: 0.2 - n * 0.15 };
}
