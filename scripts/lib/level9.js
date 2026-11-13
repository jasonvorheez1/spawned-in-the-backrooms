// Level 9's neighbourhood, rolled whole from one seed: streets (a curving collector, side streets ending in cul-de-sacs),
// house lots facing them, streetlights and which still burn. Pure: the same seed gives the same streets on every machine and after every reload.
import K from "./data/l9-houses.yml";
import P from "./data/l9-props.yml";
export const HOUSES = K.houses, PAINTS = K.paints, PROPS = P.props, TUNE = P.tune, FWD = P.forward;
export const ROAD_W = 7.4, WALK = 1.6, SETBACK = 6.5;
export const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
// Catmull-Rom through the knots, a point every ~4 m: the lots, lamps and the road spline all read the same dense line
function dense(k) {
  const out = [], g = (i) => k[Math.max(0, Math.min(k.length - 1, i))];
  for (let i = 0; i < k.length - 1; i++) {
    const a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2), n = Math.max(2, Math.round(Math.hypot(c[0] - b[0], c[1] - b[1]) / 4));
    for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((q) => 0.5 * (2 * b[q] + (c[q] - a[q]) * t + (2 * a[q] - 5 * b[q] + 4 * c[q] - d[q]) * t2 + (3 * b[q] - a[q] - 3 * c[q] + d[q]) * t3))); }
  }
  out.push(k[k.length - 1]); return out;
}
function walk(pts) { // stations by distance: at(s) -> { x, z, tx, tz }
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = L[L.length - 1];
  return { len, at(s) { s = Math.max(0, Math.min(len, s)); let i = 1; while (i < L.length - 1 && L[i] < s) i++; const a = pts[i - 1], b = pts[i], d = L[i] - L[i - 1] || 1, t = (s - L[i - 1]) / d; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / d, tz: (b[1] - a[1]) / d }; } };
}
export const yawFacing = (fx, fz) => Math.atan2(-fx, -fz) * 180 / Math.PI; // the yaw whose front (-Z) looks along (fx, fz)
export function layout(seed) {
  const r = rng(seed), kinds = Object.keys(HOUSES), streets = [], lots = [], lamps = [], bulbs = [];
  // the collector: south (the arrival, z = +60) to north, wandering
  const main = [[0, 62], [0, 20]]; let x = 0;
  for (let z = -40; z >= -400; z -= 60) { x = Math.max(-70, Math.min(70, x + (r() - 0.5) * 56)); main.push([x, z]); }
  streets.push({ id: "main", pts: dense(main) });
  // side streets: off alternating sides, bending, each ending in a cul-de-sac
  let side = r() < 0.5 ? 1 : -1;
  for (let i = 2; i < main.length - 1; i++) {
    if (r() < 0.18) continue;
    const [bx, bz] = main[i], len = 80 + r() * 70, bend = (r() - 0.5) * 60, k = [[bx, bz], [bx + side * len * 0.5, bz + bend * 0.4], [bx + side * len, bz + bend]];
    streets.push({ id: `s${i}`, pts: dense(k), bulb: true }); bulbs.push({ x: k[2][0], z: k[2][1], r: 9.5 });
    side = -side;
  }
  const all = streets.flatMap((s) => s.pts);
  const clearOfRoads = (px, pz, rad) => all.every((p) => Math.hypot(p[0] - px, p[1] - pz) > rad) && bulbs.every((b) => Math.hypot(b.x - px, b.z - pz) > rad + b.r - 3);
  const tryLot = (px, pz, fx, fz, tag) => {
    const kind = kinds[Math.floor(r() * kinds.length)], H = HOUSES[kind], rad = Math.hypot(H.w, H.d) / 2, off = SETBACK + H.d / 2;
    const cx = px - fx * off, cz = pz - fz * off; // (px, pz): the kerb point its door looks at
    if (cz > 34 && Math.abs(cx) < 26) return; // the arrival stays open ground
    if (!clearOfRoads(cx, cz, Math.min(H.w, H.d) / 2 + 3.2)) return;
    if (lots.some((l) => Math.hypot(l.x - cx, l.z - cz) < rad * 0.86 + l.rad * 0.86 + 1.5)) return;
    lots.push({ id: `h${lots.length}`, kind, x: cx, z: cz, yaw: yawFacing(fx, fz), fx, fz, rad, paint: Math.floor(r() * PAINTS.length), lit: r() < TUNE.windowLit, seed: Math.floor(r() * 1e6), kerb: { x: px, z: pz }, tag });
  };
  for (const s of streets) {
    const W = walk(s.pts), edge = ROAD_W / 2 + WALK + 0.6;
    for (const sd of [1, -1]) for (let d = 16 + r() * 8; d < W.len - (s.bulb ? 12 : 8); d += 19 + r() * 7) {
      const p = W.at(d), nx = p.tz * sd, nz = -p.tx * sd; // the kerb on this side; the house looks back at the road
      tryLot(p.x + nx * edge, p.z + nz * edge, -nx, -nz, s.id);
    }
    if (s.bulb) { const e = W.at(W.len), b = bulbs.find((q) => Math.hypot(q.x - e.x, q.z - e.z) < 1), a0 = Math.atan2(e.tz, e.tx); for (const da of [-1.15, 0, 1.15]) { const a = a0 + da, ux = Math.cos(a), uz = Math.sin(a); tryLot(b.x + ux * (b.r + WALK + 0.6), b.z + uz * (b.r + WALK + 0.6), -ux, -uz, s.id); } }
    let k = 0; for (let d = 10 + r() * 14; d < W.len - 4; d += TUNE.lampSpacing * (0.85 + r() * 0.3), k++) {
      const p = W.at(d), sd = k % 2 ? 1 : -1, nx = p.tz * sd, nz = -p.tx * sd, e = ROAD_W / 2 + 0.55;
      lamps.push({ id: `${s.id}-${k}`, x: p.x + nx * e, z: p.z + nz * e, yaw: yawFacing(-nx, -nz), lit: r() < TUNE.lampLit, flick: r() < 0.25 });
    }
  }
  if (!lamps.some((l) => l.lit && l.z > -30)) { const l = lamps.find((q) => q.z < 22 && q.z > -30) ?? lamps[0]; l.lit = true; l.flick = false; } // one lamp burns where you arrive: the first frame reads
  return { seed, streets, lots, lamps, bulbs, north: main[main.length - 1] };
}
export const zoneAt = (L, x, z) => { for (const l of L.lots) if (Math.hypot(l.x - x, l.z - z) < l.rad * 0.7) return "l9_house"; return "l9_street"; };
