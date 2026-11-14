// Level ! kit: one scripted geometry, params.part picks the piece.
// hall   { w, d, h, ceil, walls:"ew"|"nsew", gaps:[{wall,c,w,h,kind:"door"|"ajar"|"open"}], seed, tone:"red"|"warm", conduit, trail }
//        origin = floor centre. Draws floor, walls (wainscot, crash rail, skirt), drop ceiling (missing + hanging tiles),
//        conduit, vents, door frames + ward plates, dried trail and smears. No collider: the place keeps its own box colliders.
// strobe  caged red emergency fixture hanging from the ceiling (origin = ceiling mount, hangs down)
// spill   { w, d, seed } glossy dark puddle
// smiler  tall smoke-black shadow body with white eyes and grin (emissive)
// ibeam   { len } steel I-beam along X, origin = centre of its bottom flange
// chain   { a:[x,y,z], b:[x,y,z], sag, n } links between two points
// padlock brass padlock, origin = shackle top
import { face, tube, sphere } from "./lib/shapes.js";
let C, L;
function tri(a, b, c, n) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] >= 0) C.tri(...a, ...b, ...c); else C.tri(...c, ...b, ...a);
}
const quad = (a, b, c, d, n) => { tri(a, b, c, n); tri(a, c, d, n); };
function bev(x0, y0, z0, x1, y1, z1, b = 0.01) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  if (L > 2) b = 0; b = Math.min(b, (x1 - x0) * 0.45, (y1 - y0) * 0.45, (z1 - z0) * 0.45);
  const lo = [x0, y0, z0], hi = [x1, y1, z1];
  const V = (s, i) => [0, 1, 2].map((a) => (s[a] < 0 ? lo[a] + i[a] * b : hi[a] - i[a] * b));
  for (let a = 0; a < 3; a++) for (const sa of [-1, 1]) {
    const u = (a + 1) % 3, v = (a + 2) % 3, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => { const s = [0, 0, 0], i = [1, 1, 1]; s[a] = sa; s[u] = su; s[v] = sv; i[a] = 0; return V(s, i); });
    const n = [0, 0, 0]; n[a] = sa; quad(...pts, n);
  }
  if (b <= 0) return;
  for (let a = 0; a < 3; a++) { const u = (a + 1) % 3, v = (a + 2) % 3;
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      const P = (sa, iu) => { const s = [0, 0, 0], i = [1, 1, 1]; s[a] = sa; s[u] = su; s[v] = sv; i[u] = iu ? 0 : 1; i[v] = iu ? 1 : 0; return V(s, i); };
      const n = [0, 0, 0]; n[u] = su; n[v] = sv; quad(P(-1, 1), P(1, 1), P(1, 0), P(-1, 0), n);
    } }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const s = [sx, sy, sz]; tri(V(s, [0, 1, 1]), V(s, [1, 0, 1]), V(s, [1, 1, 0]), s); }
}
let seedS = 1;
const rnd = () => { seedS = (seedS * 16807) % 2147483647; return (seedS - 1) / 2147483646; };
const TX = {
  floor: "cdn/texture-worn-hospital-vinyl-floor-tiles.png",
  lower: "cdn/texture-scuffed-hospital-wall-vinyl-panel.png",
  upper: "cdn/texture-dirty-painted-plaster-wall.png",
  tile: "cdn/texture-acoustic-ceiling-tile.png",
  steel: "cdn/texture-brushed-steel.png",
  vent: "cdn/texture-metal-vent-grille.png",
};
const TONE = {
  red: { floor: "oklch(0.86 0.03 20)", lower: "oklch(0.72 0.1 22)", upper: "oklch(0.92 0.03 25)", tile: "oklch(0.94 0.01 60)", rail: "oklch(0.55 0.04 20)", trim: "oklch(0.42 0.05 20)" },
  l109: { floor: "oklch(0.6 0.035 75)", lower: "oklch(0.9 0.045 92)", upper: "oklch(0.9 0.045 92)", tile: "oklch(0.93 0.012 90)", rail: "oklch(0.5 0.05 60)", trim: "oklch(0.42 0.045 55)" }, // Level 109: cream plaster, brown skirt and frames, carpet
  b3: { floor: "oklch(0.55 0.01 90)", lower: "oklch(0.6 0.012 95)", upper: "oklch(0.66 0.012 95)", tile: "oklch(0.7 0.01 90)", rail: "oklch(0.42 0.02 60)", trim: "oklch(0.36 0.03 140)" }, // Level 109 B3: raw poured concrete, M.E.G. green trim
  warm: { floor: "oklch(0.93 0.02 75)", lower: "oklch(0.9 0.03 160)", upper: "oklch(0.96 0.02 85)", tile: "oklch(0.96 0.01 80)", rail: "oklch(0.7 0.03 160)", trim: "oklch(0.6 0.03 80)" },
};
// a wall frame: origin, tangent, inward normal, length
function wallsOf(w, d) {
  return {
    w: { o: [-w / 2, 0, d / 2], t: [0, 0, -1], n: [1, 0, 0], len: d },
    e: { o: [w / 2, 0, -d / 2], t: [0, 0, 1], n: [-1, 0, 0], len: d },
    n: { o: [-w / 2, 0, -d / 2], t: [1, 0, 0], n: [0, 0, 1], len: w },
    s: { o: [w / 2, 0, d / 2], t: [-1, 0, 0], n: [0, 0, -1], len: w },
  };
}
const P = (W, s, y, off) => [W.o[0] + W.t[0] * s + W.n[0] * off, y, W.o[2] + W.t[2] * s + W.n[2] * off];
function wq(W, s0, s1, y0, y1, off) { quad(P(W, s0, y0, off), P(W, s1, y0, off), P(W, s1, y1, off), P(W, s0, y1, off), W.n); }
function wbox(W, s0, s1, y0, y1, o0, o1, b) { const a = P(W, s0, y0, o0), c = P(W, s1, y1, o1); bev(a[0], y0, a[2], c[0], y1, c[2], b); }
function spans(len, gs) { // wall stretches between gaps
  const out = []; let s = 0;
  for (const g of [...gs].sort((a, b) => a.c - b.c)) { const a = g.c - g.w / 2 - 0.09, b = g.c + g.w / 2 + 0.09; if (a > s) out.push([s, a]); s = Math.max(s, b); }
  if (s < len) out.push([s, len]); return out;
}
function hall(p) {
  const w = p.w ?? 5.8, d = p.d ?? 26, h = p.h ?? 3.6, ch = p.ceil ?? 3.3, T = TONE[p.tone ?? "red"];
  seedS = Math.max(1, Math.floor((p.seed ?? 7) * 9973) % 2147483646);
  const WS = wallsOf(w, d), walls = (p.walls ?? "ew").split("");
  // floor
  C.albedo(p.floorTex ?? TX.floor); C.color(T.floor); C.roughness(p.floorTex ? 0.95 : 0.38);
  quad([-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2], [0, 1, 0]);
  C.albedo(null); C.roughness(0.9);
  if (L <= 2 && !p.clean) { // scuffs: dark heel marks and cart tracks
    for (let i = 0; i < d * 1.6; i++) { const x = (rnd() - 0.5) * (w - 0.6), z = (rnd() - 0.5) * d, a = rnd() * 3.14, l = 0.1 + rnd() * 0.5, t = 0.02 + rnd() * 0.03;
      const cx = Math.cos(a), sz = Math.sin(a); C.color("oklch(0.12 0.02 20)", 0.25 + rnd() * 0.35);
      quad([x - cx * l, 0.002, z - sz * l], [x + cx * l, 0.002, z + sz * l], [x + cx * l - sz * t, 0.002, z + sz * l + cx * t], [x - cx * l - sz * t, 0.002, z - sz * l + cx * t], [0, 1, 0]); }
    if (p.trail) { let x = (rnd() - 0.5) * 2, prev = null; C.color("oklch(0.2 0.07 25)", 0.6); // a dried drag trail down the run
      for (let z = -d / 2; z <= d / 2; z += 0.5) { x += (rnd() - 0.5) * 0.3; x = Math.max(-1.8, Math.min(1.8, x)); const hw = 0.12 + rnd() * 0.12;
        if (prev && rnd() > 0.15) quad([prev[0] - prev[1], 0.003, z - 0.5], [prev[0] + prev[1], 0.003, z - 0.5], [x + hw, 0.003, z], [x - hw, 0.003, z], [0, 1, 0]); prev = [x, hw]; } }
  }
  for (const k of walls) {
    const W = WS[k], gs = (p.gaps ?? []).filter((g) => g.wall === k);
    for (const [s0, s1] of spans(W.len, gs)) {
      C.albedo(p.clean ? (p.wallTex ?? TX.upper) : TX.lower); C.color(T.lower); C.roughness(p.clean ? 0.85 : 0.55); wq(W, s0, s1, 0, 1.15, 0);
      C.albedo(p.wallTex ?? TX.upper); C.color(T.upper); C.roughness(0.85); wq(W, s0, s1, 1.15, ch, 0);
      C.albedo(TX.steel); C.color(T.rail); C.metalness(0.4); C.roughness(0.4);
      if (L <= 3 && p.clean) wbox(W, s0, s1, 0, 0.11, 0, 0.014, 0.004); // a plain skirting board
      else if (L <= 3) { wbox(W, s0, s1, 0, 0.12, 0, 0.018, 0.006); wbox(W, s0, s1, 1.13, 1.17, 0, 0.012, 0.004); // skirt, panel cap
        wbox(W, s0 + 0.05, s1 - 0.05, 0.86, 1.0, 0.045, 0.085, 0.018); // crash rail
        if (L <= 2) for (let s = s0 + 0.25; s < s1 - 0.2; s += 1.6) wbox(W, s - 0.03, s + 0.03, 0.88, 0.98, 0, 0.05, 0.008); }
      C.metalness(0); C.albedo(null);
      if (L <= 2 && !p.clean) for (let s = s0 + 0.6; s < s1 - 0.6; s += 0.4 + rnd() * 1.6) { if (rnd() > 0.35) continue; // smears and drips
        const y0 = 0.2 + rnd() * 1.4, hh = 0.2 + rnd() * 0.9, ww = 0.1 + rnd() * 0.35; C.color("oklch(0.17 0.06 25)", 0.35 + rnd() * 0.35);
        quad(P(W, s, y0, 0.004), P(W, s + ww, y0 + hh * 0.2, 0.004), P(W, s + ww * 0.7, y0 + hh, 0.004), P(W, s - ww * 0.2, y0 + hh * 0.8, 0.004), W.n); }
    }
    for (const g of gs) { // door frames, ward plates, ajar voids
      const a = g.c - g.w / 2, b = g.c + g.w / 2, gh = g.h ?? 2.25;
      wq(W, a - 0.09, b + 0.09, gh + 0.09, ch, 0); C.albedo(p.wallTex ?? TX.upper); C.color(T.upper); wq(W, a - 0.09, b + 0.09, gh + 0.09, ch, 0); C.albedo(null);
      if (g.kind !== "open" && g.kind !== "pass") { C.albedo(TX.steel); C.color(T.trim); C.metalness(0.5); C.roughness(0.45);
        wbox(W, a - 0.09, a, 0, gh + 0.09, -0.02, 0.06, 0.012); wbox(W, b, b + 0.09, 0, gh + 0.09, -0.02, 0.06, 0.012); wbox(W, a, b, gh, gh + 0.09, -0.02, 0.06, 0.012);
        C.metalness(0); C.albedo(null);
        if (L <= 2) { C.color("oklch(0.8 0.02 90)"); wbox(W, b + 0.16, b + 0.42, 1.55, 1.71, 0, 0.012, 0.004); } }
      if (g.kind === "thru" || g.kind === "pass") continue; // a real doorway: you see and walk through it
      C.color("oklch(0.03 0.005 20)"); C.roughness(1); // the dark room beyond
      wq(W, a, b, 0, gh, -0.24); quad(P(W, a, 0, 0), P(W, a, gh, 0), P(W, a, gh, -0.24), P(W, a, 0, -0.24), W.t); quad(P(W, b, 0, 0), P(W, b, gh, 0), P(W, b, gh, -0.24), P(W, b, 0, -0.24), W.t.map((v) => -v));
      quad(P(W, a, gh, 0), P(W, b, gh, 0), P(W, b, gh, -0.24), P(W, a, gh, -0.24), [0, -1, 0]); quad(P(W, a, 0.001, 0), P(W, b, 0.001, 0), P(W, b, 0.001, -0.24), P(W, a, 0.001, -0.24), [0, 1, 0]);
      if (g.kind === "ajar" && L <= 3) { C.color("oklch(0.07 0.01 20)"); wbox(W, a + 0.1, a + 0.5, 0, 0.9, -0.24, -0.15, 0.02); wbox(W, a + 0.12, b - 0.1, 0.55, 0.62, -0.24, -0.04, 0.01); } // a bed's edge in the dark
    }
    if (p.conduit && L <= 3 && (k === "w" || k === "e")) { C.albedo(TX.steel); C.color("oklch(0.62 0.01 230)"); C.metalness(0.7); C.roughness(0.35);
      const off = k === "w" ? 0.07 : 0.06, y = k === "w" ? 3.12 : 3.05;
      tube(C, [P(W, 0.05, y, off), P(W, W.len - 0.05, y, off)], [0.028, 0.028], L <= 2 ? 8 : 5);
      if (k === "e") tube(C, [P(W, 0.05, y + 0.1, 0.05), P(W, W.len - 0.05, y + 0.1, 0.05)], [0.018, 0.018], 6);
      if (L <= 2) for (let s = 0.5; s < W.len; s += 1.5) wbox(W, s - 0.02, s + 0.02, y - 0.04, y + 0.04, 0, off + 0.035, 0.004);
      C.metalness(0); C.albedo(null); }
    if (L <= 3 && (k === "w" || k === "e")) for (let s = 3 + rnd() * 4; s < W.len - 1; s += 6 + rnd() * 6) { // vent grilles
      if (gs.some((g) => Math.abs(g.c - s) < 1)) continue;
      C.albedo(TX.steel); C.color("oklch(0.7 0.01 230)"); C.metalness(0.6); wbox(W, s - 0.33, s + 0.33, 2.42, 2.78, 0, 0.025, 0.008);
      C.color("oklch(0.06 0 0)"); wbox(W, s - 0.28, s + 0.28, 2.47, 2.73, 0.025, 0.027, 0); C.color("oklch(0.55 0.01 230)");
      if (L <= 2) for (let y = 2.49; y < 2.72; y += 0.035) wbox(W, s - 0.28, s + 0.28, y, y + 0.012, 0.02, 0.045, 0.002);
      C.metalness(0); C.albedo(null); }
  }
  // drop ceiling: 1.2 x 0.6 tiles in a T-bar grid, some missing, some hanging
  const nx = Math.round(w / 0.6), nz = Math.round(d / 1.2), tw = w / nx, td = d / nz;
  C.color("oklch(0.04 0 0)"); quad([-w / 2, h - 0.01, -d / 2], [w / 2, h - 0.01, -d / 2], [w / 2, h - 0.01, d / 2], [-w / 2, h - 0.01, d / 2], [0, -1, 0]); // the plenum dark
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x0 = -w / 2 + i * tw, z0 = -d / 2 + j * td, r = rnd();
    if (p.clean && r < 0.09) { C.albedo(TX.tile); C.color(T.tile); C.roughness(0.95); quad([x0, ch, z0], [x0 + tw, ch, z0], [x0 + tw, ch, z0 + td], [x0, ch, z0 + td], [0, -1, 0]); continue; }
    if (r < 0.05) continue; // missing
    C.albedo(TX.tile); C.color(T.tile); C.roughness(0.95);
    if (r < 0.09 && L <= 3) { const dr = 0.3 + rnd() * 0.5; // hanging from one edge
      quad([x0 + 0.01, ch, z0 + 0.01], [x0 + tw - 0.01, ch, z0 + 0.01], [x0 + tw - 0.01, ch - dr, z0 + td * 0.85], [x0 + 0.01, ch - dr * 1.1, z0 + td * 0.85], [0, -1, 0.3]);
      quad([x0 + 0.01, ch + 0.01, z0 + 0.01], [x0 + tw - 0.01, ch + 0.01, z0 + 0.01], [x0 + tw - 0.01, ch - dr + 0.01, z0 + td * 0.85], [x0 + 0.01, ch - dr * 1.1 + 0.01, z0 + td * 0.85], [0, 1, -0.3]);
      continue; }
    if (r > 0.93) C.color("oklch(0.62 0.05 60)"); // water stain
    quad([x0, ch, z0], [x0 + tw, ch, z0], [x0 + tw, ch, z0 + td], [x0, ch, z0 + td], [0, -1, 0]);
  }
  C.albedo(TX.steel); C.color("oklch(0.7 0.01 230)"); C.metalness(0.5);
  if (L <= 3) { for (let i = 0; i <= nx; i++) { const x = -w / 2 + i * tw; bev(x - 0.012, ch - 0.02, -d / 2, x + 0.012, ch, d / 2, 0); }
    for (let j = 0; j <= nz; j++) { const z = -d / 2 + j * td; bev(-w / 2, ch - 0.02, z - 0.012, w / 2, ch, z + 0.012, 0); } }
  C.metalness(0); C.albedo(null); C.color(null);
  return { uvProjection: "box" };
}
function strobe() {
  C.albedo(TX.steel); C.color("oklch(0.32 0.01 230)"); C.metalness(0.6); C.roughness(0.4);
  bev(-0.13, -0.05, -0.13, 0.13, 0, 0.13, 0.012); // mount plate
  tube(C, [[0, -0.05, 0], [0, -0.2, 0]], [0.015, 0.015], 6); // stem
  bev(-0.1, -0.24, -0.1, 0.1, -0.2, 0.1, 0.01); // base
  C.albedo(null); C.metalness(0); C.emissive("oklch(0.6 0.25 28)"); C.color("oklch(0.55 0.22 28)"); C.roughness(0.2);
  const M = L <= 2 ? 14 : 8, pts = [], rads = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([0, -0.24 - t * 0.14, 0]); rads.push(Math.max(0.005, 0.085 * Math.sqrt(1 - t * t * 0.92))); }
  C.smooth(); tube(C, pts, rads, M); C.flat(); C.emissive(null);
  C.albedo(TX.steel); C.color("oklch(0.25 0.01 230)"); C.metalness(0.7);
  if (L <= 3) { for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283, c = Math.cos(a), s = Math.sin(a);
      tube(C, [[c * 0.1, -0.24, s * 0.1], [c * 0.11, -0.3, s * 0.11], [c * 0.07, -0.39, s * 0.07], [0, -0.41, 0]], [0.005, 0.005, 0.005, 0.005], 4); }
    const ring = []; for (let k = 0; k <= 16; k++) { const a = (k / 16) * 6.283; ring.push([Math.cos(a) * 0.11, -0.31, Math.sin(a) * 0.11]); }
    tube(C, ring, ring.map(() => 0.005), 4); }
  C.metalness(0); C.albedo(null); C.color(null);
  return { uvProjection: "box" };
}
function spill(p) {
  const w = p.w ?? 2.4, d = p.d ?? 2.2; seedS = Math.max(1, Math.floor((p.seed ?? 3) * 7919));
  C.color("oklch(0.16 0.07 24)", 0.92); C.roughness(0.04); C.metalness(0.2);
  const N = 40, ph = [rnd() * 6, rnd() * 6, rnd() * 6], ring = [];
  for (let k = 0; k < N; k++) { const a = (k / N) * 6.283, f = 0.72 + 0.14 * Math.sin(a * 3 + ph[0]) + 0.09 * Math.sin(a * 5 + ph[1]) + 0.05 * Math.sin(a * 9 + ph[2]);
    ring.push([Math.cos(a) * w / 2 * f, 0.004, Math.sin(a) * d / 2 * f]); }
  for (let k = 0; k < N; k++) tri([0, 0.006, 0], ring[k], ring[(k + 1) % N], [0, 1, 0]);
  for (let i = 0; i < 6; i++) { const a = rnd() * 6.283, r = 0.6 + rnd() * 0.4, cx = Math.cos(a) * w / 2 * r, cz = Math.sin(a) * d / 2 * r, s = 0.06 + rnd() * 0.12; // satellite drops
    for (let k = 0; k < 8; k++) { const a0 = (k / 8) * 6.283, a1 = ((k + 1) / 8) * 6.283; tri([cx, 0.005, cz], [cx + Math.cos(a0) * s, 0.005, cz + Math.sin(a0) * s], [cx + Math.cos(a1) * s, 0.005, cz + Math.sin(a1) * s], [0, 1, 0]); } }
  C.color(null); C.metalness(0); return {};
}
function smiler() {
  const H = 2.55; C.color("oklch(0.06 0.005 20)"); C.roughness(1); C.smooth();
  // the body: a thin wavering column of smoke-dark, wider at the shoulders, frayed at the feet
  const pts = [], rads = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14, y = t * H; pts.push([Math.sin(t * 7) * 0.05, y, Math.cos(t * 5) * 0.04]);
    rads.push(t < 0.1 ? 0.05 + t * 1.4 : t < 0.68 ? 0.13 + Math.sin(t * 9) * 0.015 : t < 0.76 ? 0.2 : t < 0.8 ? 0.09 : 0.15 * Math.sin(Math.min(1, (1 - t) / 0.2) * 1.57) + 0.01); }
  tube(C, pts, rads, L <= 2 ? 12 : 7, [1, 0.7], 0.18, 5);
  for (const s of [-1, 1]) tube(C, [[s * 0.18, H * 0.74, 0], [s * 0.3, H * 0.5, -0.05], [s * 0.33, H * 0.26, -0.12], [s * 0.3, H * 0.12, -0.18]], [0.05, 0.035, 0.025, 0.012], L <= 2 ? 7 : 5, [1, 1], 0.2, s + 3);
  for (let k = 0; k < (L <= 2 ? 6 : 2); k++) { const a = k * 1.05; tube(C, [[Math.cos(a) * 0.04, 0.25, Math.sin(a) * 0.04], [Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.2]], [0.04, 0.008], 5); } // wisps at the feet
  C.flat();
  // face: eyes and a wide grin, glowing white, on the head's front (-Z)
  const hy = H * 0.885, fz = -0.14; C.emissive("oklch(1 0 0)"); C.color("oklch(1 0 0)");
  for (const s of [-1, 1]) { const N = 10, ex = s * 0.055; for (let k = 0; k < N; k++) { const a0 = (k / N) * 6.283, a1 = ((k + 1) / N) * 6.283;
      tri([ex, hy + 0.04, fz - 0.012], [ex + Math.cos(a0) * 0.028, hy + 0.04 + Math.sin(a0) * 0.022, fz - 0.005], [ex + Math.cos(a1) * 0.028, hy + 0.04 + Math.sin(a1) * 0.022, fz - 0.005], [0, 0, -1]); } }
  const G = 16, gw = 0.13; let prev = null; // grin: crescent of teeth, uneven
  for (let k = 0; k <= G; k++) { const u = k / G, x = (u - 0.5) * 2 * gw, curve = -0.045 * Math.cos((u - 0.5) * 3.14), y0 = hy - 0.03 + curve * 0.35, y1 = hy - 0.065 + curve, zz = fz + Math.abs(u - 0.5) * 0.09;
    if (prev) quad([prev[0], prev[1], prev[3]], [x, y0, zz], [x, y1, zz], [prev[0], prev[2], prev[3]], [0, 0, -1]); prev = [x, y0, y1, zz]; }
  C.emissive(null); C.color("oklch(0.05 0 0)");
  if (L <= 2) for (let k = 1; k < G; k += 2) { const u = k / G, x = (u - 0.5) * 2 * gw, curve = -0.045 * Math.cos((u - 0.5) * 3.14), zz = fz + Math.abs(u - 0.5) * 0.09 - 0.002;
    quad([x - 0.002, hy - 0.03 + curve * 0.35, zz], [x + 0.002, hy - 0.03 + curve * 0.35, zz], [x + 0.002, hy - 0.065 + curve, zz], [x - 0.002, hy - 0.065 + curve, zz], [0, 0, -1]); } // tooth gaps
  C.color(null); return {};
}
function ibeam(p) {
  const len = p.len ?? 5.4, hh = 0.36, fw = 0.2, tf = 0.022, tw = 0.014, seg = L <= 2 ? 6 : 2;
  C.albedo(TX.steel); C.color("oklch(0.55 0.03 40)"); C.metalness(0.75); C.roughness(0.5);
  for (let i = 0; i < seg; i++) { const x0 = -len / 2 + (i / seg) * len, x1 = -len / 2 + ((i + 1) / seg) * len, sg = (x) => -0.08 * (1 - (2 * x / len) ** 2); // sagging, bent in the fall
    const y0 = (sg(x0) + sg(x1)) / 2;
    bev(x0, y0, -fw / 2, x1, y0 + tf, fw / 2, 0.004); bev(x0, y0 + hh - tf, -fw / 2, x1, y0 + hh, fw / 2, 0.004); bev(x0, y0 + tf, -tw / 2, x1, y0 + hh - tf, tw / 2, 0); }
  if (L <= 2) { C.color("oklch(0.4 0.08 45)"); for (let x = -len / 2 + 0.3; x < len / 2; x += 0.5) for (const s of [-1, 1]) sphere(C, [x, 0.2, s * 0.02], 0.012, 6); // rivets, rust
    C.albedo(null); C.color("oklch(0.3 0.08 45)", 0.7); for (let i = 0; i < 10; i++) { const x = (Math.sin(i * 7.1) * 0.45) * len, y = 0.08 + (i % 3) * 0.08; face(C, [x, y, -tw / 2 - 0.002], [x + 0.25, y, -tw / 2 - 0.002], [x + 0.22, y + 0.07, -tw / 2 - 0.002], [x + 0.03, y + 0.09, -tw / 2 - 0.002], [0, 0, -1]); } }
  C.albedo(null); C.metalness(0); C.color(null); return { uvProjection: "box" };
}
function chain(p) {
  const a = p.a ?? [-1, 1.3, 0], b = p.b ?? [1, 1.3, 0], sag = p.sag ?? 0.12, n = p.n ?? 24, r = 0.022, wr = 0.006;
  C.albedo(TX.steel); C.color("oklch(0.5 0.01 230)"); C.metalness(0.9); C.roughness(0.3);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    const dx = b[0] - a[0], dy = (b[1] - a[1]) - sag * 4 * (1 - 2 * t), dz = b[2] - a[2], dl = Math.hypot(dx, dy, dz), u = [dx / dl, dy / dl, dz / dl];
    const v = i % 2 ? [0, 0, 1] : [-u[1], u[0], 0], M = L <= 2 ? 10 : 6, ring = [];
    for (let k = 0; k <= M; k++) { const q = (k / M) * 6.283; ring.push([c[0] + u[0] * Math.cos(q) * r * 1.5 + v[0] * Math.sin(q) * r, c[1] + u[1] * Math.cos(q) * r * 1.5 + v[1] * Math.sin(q) * r, c[2] + u[2] * Math.cos(q) * r * 1.5 + v[2] * Math.sin(q) * r]); }
    tube(C, ring, ring.map(() => wr), L <= 2 ? 5 : 3, [1, 1], 0, 1, 1); }
  C.albedo(null); C.metalness(0); C.color(null); return { uvProjection: "box" };
}
function padlock() {
  C.albedo(TX.steel); C.color("oklch(0.75 0.01 230)"); C.metalness(0.9); C.roughness(0.25);
  const arc = []; for (let k = 0; k <= 10; k++) { const q = (k / 10) * 3.1416; arc.push([Math.cos(q) * 0.03, -0.04 + Math.sin(q) * 0.035, 0]); }
  arc.unshift([0.03, -0.07, 0]); arc.push([-0.03, -0.07, 0]); tube(C, arc, arc.map(() => 0.006), 6, [1, 1], 0, 1, 1);
  C.color("oklch(0.72 0.12 85)"); C.metalness(0.85); C.roughness(0.35); bev(-0.045, -0.15, -0.016, 0.045, -0.065, 0.016, 0.008);
  C.color("oklch(0.15 0.02 85)"); bev(-0.004, -0.13, -0.0175, 0.004, -0.1, -0.016, 0);
  C.albedo(null); C.metalness(0); C.color(null); return { uvProjection: "box" };
}
export function geometry(ctx) {
  C = ctx; L = ctx.lod ?? 1; const p = ctx.params ?? {};
  switch (p.part) {
    case "strobe": return strobe();
    case "spill": return spill(p);
    case "smiler": return smiler();
    case "ibeam": return ibeam(p);
    case "chain": return chain(p);
    case "padlock": return padlock();
    default: return hall(p);
  }
}
