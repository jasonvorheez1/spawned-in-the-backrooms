// Level 9: mown lawn to the horizon, level enough to pour a street anywhere (the streets are rolled per room, so the ground can't know them).
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  return 0.05 * noise.fbm2({ x, z, frequency: 1 / 40, octaves: 2, seed: seedOffset(0) });
}
export function materialAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 30, octaves: 3, seed: seedOffset(3) });
  if (n > 0.32) return { rough: 1 };
  if (n < -0.42) return { dirt: 0.6, lawn: 0.4 };
  return { lawn: 1 };
}
