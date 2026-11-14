// Level 169 "Welcome to the Desert" (archived Wikidot version): a Southwestern desert. The entrance well sits at (0, 0)
// on a level gravel pan; north (-z) a dry wash runs toward Ferry's house; mesas, a canyon and eroded ridges all round.
const c01 = (v) => Math.min(1, Math.max(0, v));
const ss = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const HOUSE = { x: 18, z: -500 }; // Savi's pick: the whole desert is laid out at 1:10 (1 km of the article = 100 m here), so the house is 500 m north
export const SITES = [[0, -6000], [0, -15000], [0, -19000], [0, -23000], [-170, -300]]; // checkpoints A, B, B 1/2, C and the dry lakebed where the ship grounds: level pads
export const EDGE = 25000;
const TRACK = [[0, -14], [6, -120], [-10, -260], [14, -400], [18, -488]]; // the track-north mark's points (places/level169/config.yaml) // the boundary cliffs: 250 km at 1:10
function washDist(x, z) { // the dry wash's centre line, wandering north from the well toward the house
  const cx = Math.sin(z / 140) * 30 + Math.sin(z / 47) * 6;
  return Math.abs(x - cx);
}
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const n = (f, o, s) => noise.fbm2({ x, z, frequency: f, octaves: o, seed: seedOffset(s) });
  let h = 4 * n(1 / 420, 3, 0) + 1.2 * n(1 / 60, 2, 1); // the rolling pan
  // dunes: long wind-ridged swells lying across the 250° wind, sharper on the lee side; fade out under the mesas
  const dn = n(1 / 260, 2, 4), along = x * 0.34 + z * 0.94, wob = n(1 / 90, 2, 5) * 18;
  const ph = ((along + wob) / 70) % 1, crest = ph < 0 ? ph + 1 : ph, dshape = crest < 0.75 ? crest / 0.75 : (1 - crest) / 0.25;
  const duneAmt = ss(-0.05, 0.35, dn);
  // mesas: flat-topped buttes, each wall a cliff band over a long talus apron, never a sheer smeared sheet
  const m = n(1 / 300, 3, 2);
  const apron = ss(0.03, 0.2, m) * 10, wall = ss(0.17, 0.27, m) * 18, cap = ss(0.3, 0.4, m) * 12;
  const mesa = apron + wall + cap;
  h += mesa + 1.2 * n(1 / 22, 2, 6) * ss(0.1, 0.25, m); // weathered ledges on the walls
  // the track to Ferry's runs in a trough between the dunes, never on top of one
  let dt = 1e9; for (let i = 0; i < TRACK.length - 1; i++) { const [ax, az] = TRACK[i], [bx, bz] = TRACK[i + 1], vx = bx - ax, vz = bz - az; const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); dt = Math.min(dt, Math.hypot(x - ax - vx * t, z - az - vz * t)); }
  h += duneAmt * ss(6, 22, dt) * (1 - ss(0.04, 0.16, m)) * (dshape * dshape * (3 - 2 * dshape)) * 4.2;
  // a long canyon cutting east-west north of the house
  const cz = -900 + Math.sin(x / 110) * 40;
  h -= ss(42, 8, Math.abs(z - cz)) * 26;
  // the wash
  const w = washDist(x, z);
  if (z < 40) h -= ss(16, 3, w) * 2.4;
  // flat ground at the well and the house
  const dW = Math.hypot(x, z), dH = Math.hypot(x - HOUSE.x, z - HOUSE.z);
  h *= ss(22, 70, dW) ; h = h * ss(28, 70, dH) + 0 * (1 - ss(28, 70, dH));
  for (const [sx, sz] of SITES) { const d = Math.hypot(x - sx, z - sz); if (d < 90) h *= ss(30, 90, d); }
  const r = Math.hypot(x, z);
  if (r > EDGE - 400) h += ss(EDGE - 400, EDGE - 40, r) * 22; // the land climbs to a rim
  if (r > EDGE) h -= ss(EDGE, EDGE + 6, r) * 400; // then drops into the void
  return h;
}
export function materialAt(ctx) {
  // weights ramp across a band, never a threshold: a hard `if` here draws a straight seam on the ground
  const { x, z, noise, seedOffset } = ctx;
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const n = noise.fbm2({ x, z, frequency: 1 / 35, octaves: 3, seed: seedOffset(7) });
  const m = noise.fbm2({ x, z, frequency: 1 / 300, octaves: 3, seed: seedOffset(2) });
  const slope = ctx.slope ?? 0;
  const rock = Math.max(ss(0.17, 0.24, m), ss(0.12, 0.3, slope + n * 0.05) * ss(0.02, 0.1, m)); // cliff band and steep ledges
  const talus = ss(0.03, 0.12, m) * (1 - rock);
  const wash = z < 40 ? 1 - ss(3, 9, washDist(x, z)) : 0;
  const yard = Math.max(1 - ss(12, 26, Math.hypot(x, z)), 1 - ss(18, 34, Math.hypot(x - HOUSE.x, z - HOUSE.z)));
  const dune = ss(0.05, 0.4, n), stony = ss(-0.1, -0.45, n);
  const rest = (1 - rock) * (1 - talus * 0.9) * (1 - wash);
  return {
    redrock: rock * 0.8,
    rubble: rock * (0.2 + Math.max(0, n) * 0.3) + talus * 0.9,
    wash: (1 - rock) * wash * 0.85,
    gravel: (1 - rock) * wash * 0.15 + rest * (yard * 0.3 + (1 - yard) * stony * 0.35),
    hardpan: rest * (yard * 0.7 + (1 - yard) * (1 - dune) * stony * 0.5),
    sand: rest * (1 - yard) * (dune + (1 - dune) * (1 - stony * 0.7)),
  };
}
