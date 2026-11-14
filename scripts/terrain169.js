// Level 169 "Welcome to the Desert" (archived Wikidot version): a Southwestern desert. The entrance well sits at (0, 0)
// on a level gravel pan; north (-z) a dry wash runs toward Ferry's house; mesas, a canyon and eroded ridges all round.
const c01 = (v) => Math.min(1, Math.max(0, v));
const ss = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const HOUSE = { x: 18, z: -620 }; // Savi's pick: 620 m north stands in for the article's 5 km; travel time is what's compressed
function washDist(x, z) { // the dry wash's centre line, wandering north from the well toward the house
  const cx = Math.sin(z / 140) * 30 + Math.sin(z / 47) * 6;
  return Math.abs(x - cx);
}
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const n = (f, o, s) => noise.fbm2({ x, z, frequency: f, octaves: o, seed: seedOffset(s) });
  let h = 4 * n(1 / 420, 3, 0) + 1.2 * n(1 / 60, 2, 1); // the rolling pan
  // mesas: flat-topped buttes stepped into terraces
  const m = n(1 / 300, 3, 2);
  const mesa = ss(0.18, 0.26, m) * 34 + ss(0.32, 0.36, m) * 18;
  h += Math.round(mesa / 6) * 6 * 0.35 + mesa * 0.65;
  // a long canyon cutting east-west north of the house
  const cz = -820 + Math.sin(x / 110) * 40;
  h -= ss(42, 8, Math.abs(z - cz)) * 26;
  // the wash
  const w = washDist(x, z);
  if (z < 40) h -= ss(16, 3, w) * 2.4;
  // flat ground at the well and the house
  const dW = Math.hypot(x, z), dH = Math.hypot(x - HOUSE.x, z - HOUSE.z);
  h *= ss(22, 70, dW) ; h = h * ss(28, 70, dH) + 0 * (1 - ss(28, 70, dH));
  return h;
}
export function materialAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 35, octaves: 2, seed: seedOffset(7) });
  const m = noise.fbm2({ x, z, frequency: 1 / 300, octaves: 3, seed: seedOffset(2) });
  if (m > 0.2) return { redrock: 0.8, rubble: 0.2 + Math.max(0, n) * 0.3 };
  if (washDist(x, z) < 5 && z < 40) return { wash: 0.85, gravel: 0.15 };
  if (Math.hypot(x, z) < 20 || Math.hypot(x - HOUSE.x, z - HOUSE.z) < 26) return { hardpan: 0.7, gravel: 0.3 };
  if (n > 0.25) return { sand: 1 };
  if (n < -0.3) return { gravel: 0.6, hardpan: 0.4 };
  return { hardpan: 0.55, sand: 0.45 };
}
