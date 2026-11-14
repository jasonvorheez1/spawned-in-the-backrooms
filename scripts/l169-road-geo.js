// Level 169 road pieces: one scripted geometry, params.kind picks the piece. Entrances face +Z (south, where walkers come from).
// shade | container | house | leanto | cairn | cairnfield | balanced | windmill | grove | boardposts | locker | hatch | stove | wall | boots | logpost | bedroll | bench
const T = {
  wood: "cdn/texture-sun-bleached-grey-desert-timber.png", tin: "cdn/texture-rusty-corrugated-tin-roof-sheet.png",
  steel: "cdn/texture-scuffed-olive-painted-steel.png", rust: "cdn/texture-rusted-red-shipping-container-steel.png",
  stone: "cdn/texture-rough-stacked-sandstone-well-masonry.png", adobe: "cdn/texture-sun-baked-adobe-mud-plaster.png",
  canvas: "cdn/texture-faded-tan-canvas-tarp.png", leather: "cdn/texture-worn-brown-boot-leather.png",
  sand: "cdn/texture-terrain-wind-rippled-pale-desert-sand.png", rock: "cdn/texture-terrain-layered-red-sandstone-cliff-strata.png",
};
let C, XF = null, COL = false;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function E(p) { if (XF) p = p.map(XF); if (p.length === 3) C.tri(...p[0], ...p[1], ...p[2]); else C.quad(...p[0], ...p[1], ...p[2], ...p[3]); }
function Q(p, o) { if (dot(crs(sub(p[1], p[0]), sub(p[2], p[0])), sub(p[0], o)) < 0) p = [...p].reverse(); E(p); }
function paint(tex, col) { if (COL) return; C.albedo(tex ?? null); C.color(col ?? "oklch(0.95 0 0)"); }
function tube(a, b, r0, r1 = r0, n = 8, caps = true) {
  if (COL) n = Math.min(n, 6); else C.smooth();
  const d = nrm(sub(b, a)), u = nrm(Math.abs(d[1]) < 0.99 ? crs(d, [0, 1, 0]) : crs(d, [1, 0, 0])), v = crs(d, u);
  const ring = (c, r, i) => { const t = (i / n) * 6.2832; return add(c, add(mul(u, Math.cos(t) * r), mul(v, Math.sin(t) * r))); };
  for (let i = 0; i < n; i++) {
    E([ring(a, r0, i), ring(a, r0, i + 1), ring(b, r1, i + 1), ring(b, r1, i)]);
    if (caps) { E([b, ring(b, r1, i), ring(b, r1, i + 1)]); E([a, ring(a, r0, i + 1), ring(a, r0, i)]); }
  }
  if (!COL) C.flat();
}
function bbox(x0, y0, z0, x1, y1, z1, b = 0.02) {
  if (COL) b = 0;
  const lo = [x0, y0, z0], hi = [x1, y1, z1], o = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  const P = (s, ax) => [0, 1, 2].map((i) => (s[i] > 0 ? hi[i] - (i === ax ? 0 : b) : lo[i] + (i === ax ? 0 : b)));
  const S = (ax, sa, i1, s1, i2, s2) => { const s = [0, 0, 0]; s[ax] = sa; s[i1] = s1; s[i2] = s2; return s; };
  for (let ax = 0; ax < 3; ax++) for (const sa of [-1, 1]) { const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3; Q([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => P(S(ax, sa, a1, p, a2, q), ax)), o); }
  if (!b) return;
  for (let az = 0; az < 3; az++) { const ax = (az + 1) % 3, ay = (az + 2) % 3; for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const s = (k) => S(az, k, ax, sx, ay, sy); Q([P(s(-1), ax), P(s(1), ax), P(s(1), ay), P(s(-1), ay)], o); } }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) Q([0, 1, 2].map((ax) => P([sx, sy, sz], ax)), o);
}
function lump(cx, cy, cz, rx, ry, rz, seed = 1, nu = 9, nv = 6, rough = 0.2) {
  if (COL) { nu = 6; nv = 4; } else C.smooth();
  const o = [cx, cy, cz];
  const pt = (i, j) => { const a = (i / nu) * 6.2832, b = (j / nv) * 3.1416, d = [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)];
    const k = 1 + rough * (Math.sin(d[0] * 3.1 + seed) + Math.sin(d[1] * 4.3 + seed * 1.7) + Math.sin(d[2] * 3.7 + seed * 2.3) + 0.6 * Math.sin(d[0] * 7 + d[2] * 6 + seed * 3.1)) / 3;
    return [cx + d[0] * rx * k, cy + d[1] * ry * k, cz + d[2] * rz * k]; };
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    if (j === 0) Q([pt(i, 0), pt(i, 1), pt(i + 1, 1)], o); else if (j === nv - 1) Q([pt(i, j), pt(i + 1, j), pt(i, nv)], o); else Q([pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)], o);
  }
  if (!COL) C.flat();
}
function sheet(p0, U, V, N, waves, amp = 0.03) { // corrugated: waves run along V, ripple across U
  if (COL) return E([p0, add(p0, U), add(add(p0, U), V), add(p0, V)]);
  C.smooth(); const n = Math.max(2, Math.round(waves * (C.lod > 2 ? 2 : 4)));
  const at = (i) => add(add(p0, mul(U, i / n)), mul(N, amp * Math.sin((i / n) * waves * 6.2832)));
  for (let i = 0; i < n; i++) { const a = at(i), b = at(i + 1); E([a, b, add(b, V), add(a, V)]); }
  C.flat();
}
const rotX = (deg, piv) => { const c = Math.cos(deg * 0.01745), s = Math.sin(deg * 0.01745); return (p) => { const y = p[1] - piv[1], z = p[2] - piv[2]; return [p[0], piv[1] + y * c - z * s, piv[2] + y * s + z * c]; }; };
const rotY = (deg, piv, sc = 1) => { const c = Math.cos(deg * 0.01745), s = Math.sin(deg * 0.01745); return (p) => { const x = (p[0]) * sc, z = (p[2]) * sc; return [piv[0] + x * c + z * s, piv[1] + p[1] * sc, piv[2] - x * s + z * c]; }; };
const WOODC = "oklch(0.93 0.03 75)", TINC = "oklch(0.92 0.03 60)";

const K = {
  shade(P) { // timber posts, mono-pitch tin roof, a plank wind screen on the north side, a bench
    paint(T.wood, WOODC);
    for (const x of [-2.8, 0, 2.8]) { tube([x, 0, 2], [x, 2.72, 2], 0.09, 0.075, 8); tube([x, 0, -2], [x, 2.32, -2], 0.09, 0.075, 8); if (!COL) tube([x, 2.74, 2.3], [x, 2.28, -2.3], 0.055, 0.055, 6); }
    if (!COL) { tube([-3.1, 2.68, 2], [3.1, 2.68, 2], 0.07, 0.07, 6); tube([-3.1, 2.28, -2], [3.1, 2.28, -2], 0.07, 0.07, 6);
      tube([-2.8, 1.5, -2], [-2.8 + 0.9, 2.26, -2], 0.04, 0.04, 5); tube([2.8, 1.5, -2], [2.8 - 0.9, 2.26, -2], 0.04, 0.04, 5); }
    for (let i = 0; i < 6; i++) bbox(-2.75 + i * 0.92, 0.12 + (i % 2) * 0.05, -2.07, -1.9 + i * 0.92, 1.45 - (i % 3) * 0.07, -2.02, 0.012); // screen planks
    bbox(-2.3, 0.42, -1.55, 0.2, 0.48, -1.2, 0.015); if (!COL) { tube([-2.0, 0, -1.37], [-2.0, 0.42, -1.37], 0.11, 0.1, 8); tube([-0.1, 0, -1.37], [-0.1, 0.42, -1.37], 0.11, 0.1, 8); }
    paint(T.tin, TINC);
    sheet([-3.3, 2.86, 2.6], [6.6, 0, 0], [0, -0.52, -5.2], [0, 1, 0.1], 22, 0.028);
  },
  container(P) { // a shipping container with a doorway cut in its south side, sand banked on the weather sides, a tarp awning
    const y0 = 0.15, y1 = 2.6;
    paint(T.wood, "oklch(0.85 0.03 70)"); bbox(-3, 0, -1.2, 3, y0, 1.2, 0.01); bbox(-1.5, 0, 1.2, -0.5, 0.08, 1.7, 0.015);
    paint(T.rust, "oklch(0.92 0.05 40)");
    const wall = (x0, x1, ya, yb, z, n) => sheet([x0, ya, z], [x1 - x0, 0, 0], [0, yb - ya, 0], [0, 0, n], (x1 - x0) * 3.4, 0.032);
    wall(-3, -1.6, y0, y1, 1.2, 1); wall(-0.4, 3, y0, y1, 1.2, 1); wall(-1.6, -0.4, 2.15, y1, 1.2, 1); wall(-3, 3, y0, y1, -1.2, -1);
    sheet([-3, y0, -1.2], [0, 0, 2.4], [0, y1 - y0, 0], [-1, 0, 0], 8, 0.032);
    sheet([-3, y1, -1.2], [6, 0, 0], [0, 0, 2.4], [0, 1, 0], 20, 0.025);
    if (COL) { E([[3, y0, -1.2], [3, y0, 1.2], [3, y1, 1.2], [3, y1, -1.2]]); E([[-1.7, 2.5, 1.2], [-0.3, 2.5, 1.2], [-0.3, 2.12, 2.7], [-1.7, 2.12, 2.7]]); return; }
    paint(T.rust, "oklch(0.8 0.05 38)");
    for (const z of [-1.2, 1.2]) for (const x of [-3, 3]) bbox(x - 0.07, 0, z - 0.07, x + 0.07, y1 + 0.03, z + 0.07, 0.015);
    for (const z of [-1.2, 1.2]) for (const y of [0.1, y1]) bbox(-3, y - 0.06, z - 0.06, 3, y + 0.06, z + 0.06, 0.015);
    for (const y of [0.1, y1]) for (const x of [-3, 3]) bbox(x - 0.06, y - 0.06, -1.2, x + 0.06, y + 0.06, 1.2, 0.015);
    bbox(2.97, y0, -1.13, 3.03, y1 - 0.06, -0.01, 0.012); bbox(2.97, y0, 0.01, 3.03, y1 - 0.06, 1.13, 0.012); // the end doors, shut
    for (const z of [-0.75, -0.3, 0.3, 0.75]) tube([3.06, 0.2, z], [3.06, 2.5, z], 0.018, 0.018, 5);
    for (const x of [-1.6, -0.4]) bbox(x - 0.04, y0, 1.16, x + 0.04, 2.15, 1.25, 0.01); bbox(-1.64, 2.11, 1.16, -0.36, 2.19, 1.25, 0.01); // the cut, framed with angle iron
    paint(T.canvas, "oklch(0.93 0.04 80)"); sheet([-1.7, 2.5, 1.2], [1.4, 0, 0], [0, -0.38, 1.5], [0, 1, 0.2], 2, 0.05);
    paint(T.wood, WOODC); for (const x of [-1.65, -0.35]) tube([x, 0, 2.65], [x, 2.14, 2.65], 0.04, 0.035, 6);
    paint(T.sand, "oklch(0.95 0.05 75)"); lump(0.3, -0.25, -2.0, 3.9, 1.5, 1.5, 3, 12, 6, 0.1); lump(-3.7, -0.2, -0.2, 1.4, 1.25, 2.0, 7, 10, 6, 0.1); lump(3.4, -0.2, -1.3, 1.2, 0.8, 1.2, 9, 8, 5, 0.1);
  },
  house(P) { // one adobe room and a porch: door south, a shuttered window east and west, tin gable roof
    const wall = () => paint(T.adobe, "oklch(0.93 0.04 70)");
    paint(T.wood, "oklch(0.88 0.03 70)"); bbox(-2.5, 0, -2, 2.5, 0.2, 3.8, 0.015); bbox(-1, 0, 3.8, 1, 0.1, 4.2, 0.015);
    wall(); bbox(-2.5, 0.2, -2, 2.5, 2.7, -1.8, 0.03); bbox(-2.5, 0.2, 1.8, -0.6, 2.7, 2, 0.03); bbox(0.6, 0.2, 1.8, 2.5, 2.7, 2, 0.03); bbox(-0.6, 2.3, 1.8, 0.6, 2.7, 2, 0.02);
    for (const s of [-1, 1]) { const xa = s > 0 ? 2.3 : -2.5, xb = xa + 0.2;
      bbox(xa, 0.2, -1.8, xb, 2.7, -0.5, 0.03); bbox(xa, 0.2, 0.5, xb, 2.7, 1.8, 0.03); bbox(xa, 0.2, -0.5, xb, 1.1, 0.5, 0.02); bbox(xa, 2.0, -0.5, xb, 2.7, 0.5, 0.02);
      E([[s * 2.4, 2.7, -2], [s * 2.4, 2.7, 2], [s * 2.4, 3.52, 0]]); }
    paint(T.tin, TINC);
    sheet([-2.9, 3.62, 0], [5.8, 0, 0], [0, -1.0, 2.5], [0, 1, 0.4], 19, 0.028); sheet([-2.9, 3.62, 0], [5.8, 0, 0], [0, -1.0, -2.5], [0, 1, -0.4], 19, 0.028);
    sheet([-2.7, 2.52, 2.2], [5.4, 0, 0], [0, -0.3, 1.9], [0, 1, 0.15], 18, 0.028);
    paint(T.wood, WOODC);
    for (const x of [-2.3, 2.3]) tube([x, 0.2, 3.7], [x, 2.26, 3.7], 0.07, 0.06, 8);
    bbox(-0.66, 0.2, 0.7, -0.6, 2.28, 1.8, 0.012); // the door, stood open inward
    if (COL) return;
    tube([-2.6, 2.26, 3.7], [2.6, 2.26, 3.7], 0.055, 0.055, 6); tube([-2.95, 3.6, 0], [2.95, 3.6, 0], 0.05, 0.05, 6);
    for (const s of [-1, 1]) { const x = s * 2.5; for (const z of [-1.03, 0.53]) { bbox(Math.min(x, x + s * 0.05), 1.05, z, Math.max(x, x + s * 0.05), 2.05, z + 0.5, 0.01); for (const y of [1.25, 1.85]) bbox(Math.min(x + s * 0.05, x + s * 0.07), y, z + 0.03, Math.max(x + s * 0.05, x + s * 0.07), y + 0.07, z + 0.47, 0.005); }
      bbox(Math.min(x - s * 0.22, x + s * 0.04), 1.06, -0.52, Math.max(x - s * 0.22, x + s * 0.04), 1.11, 0.52, 0.01); }
    bbox(-0.68, 2.28, 1.76, 0.68, 2.36, 2.04, 0.01);
    paint(T.rust, "oklch(0.6 0.02 60)"); tube([1.85, 2.4, -1.35], [1.85, 4.25, -1.35], 0.07, 0.07, 8); tube([1.85, 4.25, -1.35], [1.85, 4.33, -1.35], 0.13, 0.05, 8);
  },
  leanto(P) { // a tarp and poles leaned on a boulder
    paint(T.rock, "oklch(0.95 0.05 45)"); lump(0, 1.2, -3.4, 3.2, 2.6, 2.4, 4, 12, 8, 0.22); lump(2.6, 0.3, -2.2, 1.1, 0.9, 1.0, 8, 8, 5, 0.25);
    paint(T.canvas, "oklch(0.9 0.05 75)"); sheet([-1.7, 2.75, -1.5], [3.4, 0, 0], [0, -1.45, 3.4], [0, 1, 0.42], 3, 0.06);
    paint(T.wood, WOODC);
    for (const x of [-1.6, 0, 1.6]) { if (x) tube([x, 0, 1.85], [x, 1.3, 1.85], 0.05, 0.045, 6); if (!COL) tube([x, 2.72, -1.6], [x, 1.22, 1.95], 0.04, 0.035, 6); }
    if (!COL) { tube([-1.75, 1.27, 1.85], [1.75, 1.27, 1.85], 0.04, 0.04, 6); paint(T.stone, "oklch(0.9 0.04 60)"); for (let i = 0; i < 7; i++) lump(Math.cos(i * 0.9) * 0.42, 0.06, 0.2 + Math.sin(i * 0.9) * 0.42, 0.13, 0.09, 0.12, i, 6, 4); paint(null, "oklch(0.2 0.01 60)"); lump(0, 0.03, 0.2, 0.3, 0.05, 0.3, 2, 8, 4, 0.1); }
  },
  cairn(P) { // stacked stones; arrow: a slab at the foot with a painted arrow pointing on up the track
    const n = P.n ?? 5, sd = P.sd ?? 1;
    if (COL) return tube([0, 0, 0], [0, n * 0.22, 0], 0.45, 0.2, 6);
    paint(T.stone, "oklch(0.9 0.05 55)"); let y = 0;
    for (let i = 0; i < n; i++) { const r = 0.46 - i * (0.3 / n) + hash(sd + i) * 0.05, h = r * 0.48; lump((hash(sd * 3 + i) - 0.5) * 0.1, y + h * 0.8, (hash(sd * 5 + i) - 0.5) * 0.1, r, h, r * 0.88, sd + i * 2.7, 8, 5, 0.16); y += h * 1.45; }
    if (!P.arrow) return;
    XF = rotX(-14, [0, 0, 0.6]); bbox(-0.3, 0, 0.56, 0.3, 0.72, 0.66, 0.03);
    paint(null, "oklch(0.95 0.01 90)"); const z = 0.662;
    E([[-0.05, 0.12, z], [0.05, 0.12, z], [0.05, 0.42, z], [-0.05, 0.42, z]]); E([[-0.17, 0.4, z], [0.17, 0.4, z], [0, 0.62, z]]); XF = null;
  },
  cairnfield(P) { // one stone each
    const n = COL ? 0 : (P.n ?? 70); paint(T.stone, "oklch(0.9 0.05 50)");
    for (let i = 0; i < n; i++) { const a = hash(i * 1.7) * 6.2832, d = 1.5 + Math.sqrt(hash(i * 2.9)) * 9, r = 0.1 + hash(i * 4.1) * 0.14; lump(Math.cos(a) * d, r * 0.4, Math.sin(a) * d * 0.7, r, r * 0.6, r * 0.85, i, 6, 4, 0.2); if (i % 9 === 0) lump(Math.cos(a) * d, r * 1.25, Math.sin(a) * d * 0.7, r * 0.6, r * 0.4, r * 0.55, i + 3, 6, 4, 0.2); }
  },
  balanced(P) { paint(T.rock, "oklch(0.95 0.06 42)"); lump(0, 1.3, 0, 1.0, 2.0, 0.9, 5, 10, 8, 0.2); lump(0.25, 4.3, 0.1, 2.3, 1.5, 1.9, 11, 12, 8, 0.18); lump(-1.6, 0.2, 1.2, 0.8, 0.6, 0.7, 2, 8, 5, 0.2); },
  windmill(P) { // a farm wind pump, leaning, half its vanes on the ground
    paint(T.rust, "oklch(0.75 0.03 60)"); const top = 7.2, legs = [[-1.3, -1.3], [1.3, -1.3], [1.3, 1.3], [-1.3, 1.3]], at = (l, y) => [l[0] * (1 - (y / top) * 0.85), y, l[1] * (1 - (y / top) * 0.85)];
    for (let i = 0; i < 4; i++) { tube(at(legs[i], 0), at(legs[i], top), 0.05, 0.035, 6); if (COL) continue; for (let k = 0; k < 4; k++) { const ya = k * 1.75, yb = ya + 1.75, j = (i + 1) % 4; tube(at(legs[i], yb), at(legs[j], yb), 0.022, 0.022, 4, false); tube(at(legs[i], ya), at(legs[j], yb), 0.016, 0.016, 4, false); } }
    if (COL) return;
    tube([0, top, -0.3], [0, top, 0.9], 0.12, 0.09, 8); tube([0, top, 0.9], [0, top - 1.5, 2.4], 0.025, 0.02, 5);
    paint(T.tin, TINC); E([[0, top - 1.3, 2.2], [0, top - 2.2, 3.3], [0, top - 2.6, 2.9], [0, top - 1.8, 2.0]]);
    for (let i = 0; i < 12; i++) { if ([2, 3, 7, 8, 9].includes(i)) continue; const a = (i / 12) * 6.2832, b = a + 0.3, c = Math.cos, s = Math.sin; E([[c(a) * 0.3, top + s(a) * 0.3, -0.34], [c(b) * 0.3, top + s(b) * 0.3, -0.3], [c(b) * 1.5, top + s(b) * 1.5, -0.22], [c(a) * 1.5, top + s(a) * 1.5, -0.42]]); }
    paint(T.rust, "oklch(0.75 0.03 60)"); for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.2832, b = ((i + 1) / 24) * 6.2832; if (i > 3 && i < 9) continue; tube([Math.cos(a) * 1.5, top + Math.sin(a) * 1.5, -0.32], [Math.cos(b) * 1.5, top + Math.sin(b) * 1.5, -0.32], 0.015, 0.015, 4, false); }
    paint(T.tin, TINC); for (let i = 0; i < 4; i++) { const x = 1.5 + i * 0.5, z = -2 + hash(i) * 1.5; E([[x, 0.03, z], [x + 0.3, 0.05, z + 0.1], [x + 0.5, 0.04, z + 1.2], [x + 0.1, 0.03, z + 1.1]]); }
  },
  grove(P) { // dead joshua trees
    if (COL) return; const n = P.n ?? 6;
    const branch = (a, dir, len, r, depth, sd) => { const b = add(a, mul(dir, len)); tube(a, b, r, r * 0.72, 7, depth === 0);
      if (depth === 0) { paint(T.wood, "oklch(0.75 0.03 85)"); lump(b[0], b[1], b[2], r * 2.2, r * 2.6, r * 2.2, sd, 6, 4, 0.35); paint(T.wood, "oklch(0.8 0.03 60)"); return; }
      const k = 2 + (hash(sd) > 0.6 ? 1 : 0); for (let i = 0; i < k; i++) { const an = hash(sd + i * 3.3) * 6.2832, sp = 0.5 + hash(sd + i * 7.1) * 0.5; branch(b, nrm([dir[0] + Math.cos(an) * sp, dir[1] + 0.25, dir[2] + Math.sin(an) * sp]), len * 0.68, r * 0.72, depth - 1, sd + i * 13.7 + 1); } };
    paint(T.wood, "oklch(0.8 0.03 60)");
    for (let i = 0; i < n; i++) { const a = hash(i * 9.1) * 6.2832, d = 2 + hash(i * 5.3) * 11, fallen = i % 4 === 3; branch([Math.cos(a) * d, fallen ? 0.2 : -0.1, Math.sin(a) * d], fallen ? nrm([Math.cos(a * 3), 0.08, Math.sin(a * 3)]) : nrm([hash(i) * 0.2 - 0.1, 1, hash(i + 5) * 0.2 - 0.1]), 1.5 + hash(i * 2.2) * 0.9, 0.2, fallen ? 1 : 2, i * 31.3); }
  },
  boardposts(P) { paint(T.wood, WOODC); for (const x of [-0.82, 0.82]) tube([x, 0, 0], [x, 2.4, 0], 0.055, 0.045, 8); if (COL) return; bbox(-0.95, 2.3, -0.12, 0.95, 2.35, 0.16, 0.012); bbox(-0.8, 0.95, -0.035, 0.8, 1.0, 0.035, 0.01); },
  locker(P) { // a steel supply locker
    paint(T.steel, "oklch(0.92 0.04 130)"); bbox(-0.45, 0.06, -0.25, 0.45, 1.8, 0.25, 0.025); if (COL) return;
    for (const x of [-0.4, 0.4]) for (const z of [-0.2, 0.2]) tube([x, 0, z], [x, 0.07, z], 0.03, 0.03, 6);
    paint(T.steel, "oklch(0.86 0.04 130)"); bbox(-0.42, 0.1, 0.25, -0.01, 1.76, 0.262, 0.008); bbox(0.01, 0.1, 0.25, 0.42, 1.76, 0.262, 0.008);
    paint(null, "oklch(0.15 0.01 100)"); for (const x of [-0.215, 0.215]) for (let i = 0; i < 4; i++) bbox(x - 0.12, 1.5 + i * 0.05, 0.26, x + 0.12, 1.52 + i * 0.05, 0.265, 0);
    paint(null, "oklch(0.7 0.01 250)"); C.metalness(0.8); for (const x of [-0.05, 0.05]) tube([x, 0.9, 0.28], [x, 1.05, 0.28], 0.012, 0.012, 5); C.metalness(0);
  },
  hatch(P) { // the cool store: a stone curb round the dug pit, a plank lid propped open
    paint(T.stone, "oklch(0.9 0.05 55)"); for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.2832; lump(Math.cos(a) * 0.95, 0.18, Math.sin(a) * 0.95, 0.28, 0.26, 0.22, i * 1.9, 7, 5, 0.18); }
    if (COL) return; paint(null, "oklch(0.07 0.01 60)"); tube([0, 0.02, 0], [0, 0.05, 0], 0.9, 0.9, 14);
    XF = rotX(-38, [0, 0.42, -0.8]); paint(T.wood, WOODC); for (let i = 0; i < 4; i++) bbox(-0.8 + i * 0.41, 0.42, -0.8, -0.42 + i * 0.41, 0.47, 0.85, 0.01); bbox(-0.8, 0.47, -0.3, 0.8, 0.51, -0.2, 0.008); bbox(-0.8, 0.47, 0.4, 0.8, 0.51, 0.5, 0.008); XF = null;
    tube([0.6, 0.3, 0.75], [0.6, 1.3, 0.35], 0.025, 0.025, 5);
  },
  stove(P) { // a fuel drum cut into a stove
    paint(T.rust, "oklch(0.7 0.04 45)"); tube([0, 0.18, 0], [0, 1.06, 0], 0.29, 0.29, 16); if (COL) return;
    for (const y of [0.2, 0.48, 0.76, 1.04]) tube([0, y, 0], [0, y + 0.03, 0], 0.305, 0.305, 16); for (const a of [0.5, 2.6, 4.7]) tube([Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22], [Math.cos(a) * 0.2, 0.2, Math.sin(a) * 0.2], 0.02, 0.02, 5);
    tube([0, 1.06, -0.1], [0, (P.flue ?? 2.6), -0.1], 0.06, 0.06, 8);
    paint(null, "oklch(0.1 0.01 50)"); XF = (p) => [p[0], p[1], p[2] + 0.292 - 0.04 * p[0] * p[0] * 12]; E([[-0.14, 0.34, 0], [0.14, 0.34, 0], [0.14, 0.62, 0], [-0.14, 0.62, 0]]);
    C.emissive("oklch(0.7 0.19 50)"); paint(null, "oklch(0.6 0.18 50)"); XF = (p) => [p[0], p[1], p[2] + 0.296]; E([[-0.09, 0.36, 0], [0.09, 0.36, 0], [0.06, 0.46, 0], [-0.06, 0.46, 0]]); C.emissive(null); XF = null;
  },
  wall(P) { // a wind wall of stacked stone, curved to the weather side
    paint(T.stone, "oklch(0.9 0.05 55)"); const len = P.len ?? 9, rows = COL ? 1 : 4, per = Math.round(len / 0.62);
    if (COL) { for (let i = 0; i < per; i += 2) { const t = i / per - 0.5; bbox(t * len - 0.65, 0, -t * t * 3 - 0.3, t * len + 0.65, 1.3, -t * t * 3 + 0.3, 0); } return; }
    for (let r = 0; r < rows; r++) for (let i = 0; i < per - (r % 2); i++) { const t = (i + (r % 2) * 0.5) / per - 0.5, sd = r * 37 + i; if (r === 3 && hash(sd) > 0.6) continue; lump(t * len, 0.16 + r * 0.33, -t * t * 3 + (hash(sd) - 0.5) * 0.08, 0.36, 0.2, 0.3, sd, 7, 5, 0.16); }
  },
  boots(P) { // pairs of boots left in a row, toes to the drop (toes point -Z)
    if (COL) return; const n = P.n ?? 9;
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const sc = 0.85 + hash(i * 3.3) * 0.3; XF = rotY((hash(i * 7 + s) - 0.5) * 16, [(i - (n - 1) / 2) * 0.62 + s * 0.11 * sc, 0, (hash(i) - 0.5) * 0.12], sc);
      paint(null, "oklch(0.18 0.01 60)"); bbox(-0.05, 0, -0.16, 0.05, 0.025, 0.13, 0.008);
      paint(T.leather, `oklch(${0.6 + hash(i * 2) * 0.3} 0.06 ${40 + hash(i) * 45})`); lump(0, 0.07, -0.07, 0.052, 0.05, 0.095, 2, 7, 5, 0.05); lump(0, 0.07, 0.07, 0.05, 0.05, 0.06, 4, 7, 5, 0.05);
      tube([0, 0.06, 0.07], [0, 0.2 + hash(i * 5) * 0.08, 0.075], 0.05, 0.056, 8, false); }
    XF = null;
  },
  logpost(P) { // a post with a tin-lidded shelf and the logbook on it
    paint(T.wood, WOODC); tube([0, 0, 0], [0, 1.25, 0], 0.06, 0.05, 8); if (COL) return;
    XF = rotX(18, [0, 1.15, 0]); bbox(-0.22, 1.13, -0.16, 0.22, 1.16, 0.2, 0.008); paint(null, "oklch(0.35 0.07 30)"); bbox(-0.15, 1.16, -0.1, 0.15, 1.2, 0.14, 0.008); paint(null, "oklch(0.9 0.03 90)"); bbox(-0.14, 1.165, -0.095, 0.14, 1.195, 0.145, 0);
    XF = rotX(-25, [0, 1.42, -0.16]); paint(T.tin, TINC); bbox(-0.26, 1.42, -0.18, 0.26, 1.43, 0.24, 0); XF = null; paint(T.wood, WOODC); tube([0, 1.2, -0.05], [0, 1.45, -0.12], 0.02, 0.02, 5);
  },
  bedroll(P) { if (COL) return; paint(T.canvas, "oklch(0.75 0.05 140)"); bbox(-0.35, 0, -0.9, 0.35, 0.07, 0.9, 0.03); paint(T.canvas, "oklch(0.85 0.04 60)"); tube([-0.3, 0.14, -0.78], [0.3, 0.14, -0.78], 0.11, 0.11, 10); },
  bench(P) { paint(T.wood, WOODC); bbox(-0.9, 0.42, -0.18, 0.9, 0.48, 0.18, 0.015); if (COL) return; for (const x of [-0.7, 0.7]) tube([x, 0, 0], [x, 0.42, 0], 0.1, 0.09, 8); },
};
function run(ctx, col) { C = ctx; COL = col; XF = null; const P = ctx.params ?? {}; (K[P.kind] ?? K.cairn)(P); if (!col) { ctx.albedo(null); ctx.color(null); } }
export function geometry(ctx) { run(ctx, false); }
export function collider(ctx) { const k = ctx.params?.kind; if (["cairnfield", "boots", "grove", "bedroll"].includes(k)) return null; run(ctx, true); }
