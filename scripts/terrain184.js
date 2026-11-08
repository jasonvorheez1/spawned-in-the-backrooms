// Level 184 "Field of Forgotten Forts": soft rolling countryside. Big regions by low noise: canola (bright yellow),
// grain (wheat/barley) and unkempt plains (rough grass). The arrival (0, 0) sits level on a dirt track.
const clamp01 = (v) => Math.min(1, Math.max(0, v));
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = 5 * noise.fbm2({ x, z, frequency: 1 / 300, octaves: 2, seed: seedOffset(0) }) + 0.8 * noise.fbm2({ x, z, frequency: 1 / 60, octaves: 2, seed: seedOffset(1) });
  return roll * clamp01((Math.hypot(x, z) - 14) / 40);
}
export function materialAt(ctx) {
  const { x, z, noise, seedOffset, slope } = ctx;
  const r = noise.fbm2({ x, z, frequency: 1 / 170, octaves: 2, seed: seedOffset(7) }), n = noise.fbm2({ x, z, frequency: 1 / 20, octaves: 2, seed: seedOffset(8) });
  if (slope > 0.2) return { grass: 1 };
  if (r < -0.18) return { canola: 0.9 + n * 0.1, grass: 0.1 - n * 0.1 }; // the canola fields
  if (r < 0.2) return { grass: 0.85 + n * 0.15, dirt: 0.15 - n * 0.15 }; // unkempt plains
  return r < 0.45 ? { wheat: 0.9, dirt: 0.1 } : { barley: 1 };
}
