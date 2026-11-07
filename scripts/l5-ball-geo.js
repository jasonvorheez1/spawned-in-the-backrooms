// The Beverly Room lane (Level 5): every mesh by params.part. "ball" / "salon" / "hk" draw in world metres on an entity at
// the origin; "chandelier", "mahjong" and the containers draw locally (origin = feet, front -Z; a chandelier hangs from 0).
import { face, slab, tube, prism, box, paint, loft, tri3, circ, lathe, rrect, rbox, crystal, rod, GILT, BRASS, SILVER, LINEN, CRYS, BULB, GLASS, WOOD, VELVET, STEEL, coupe, chair } from "./lib/l5-ball-kit.js";
import { sphere } from "./lib/shapes.js";

const rng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
const P3 = (o, u, v, n, a, b, c) => [o[0] + u[0] * a + v[0] * b + n[0] * c, o[1] + u[1] * a + v[1] * b + n[1] * c, o[2] + u[2] * a + v[2] * b + n[2] * c];
const neg = (a) => [-a[0], -a[1], -a[2]];
// an oriented box: origin o, unit axes u (across), v (up), n (out); ranges along each
function obox(ctx, o, u, v, n, a0, a1, b0, b1, c0, c1) {
  const p = (a, b, c) => P3(o, u, v, n, a, b, c);
  face(ctx, p(a0, b0, c1), p(a1, b0, c1), p(a1, b1, c1), p(a0, b1, c1), n);
  face(ctx, p(a1, b0, c0), p(a0, b0, c0), p(a0, b1, c0), p(a1, b1, c0), neg(n));
  face(ctx, p(a1, b0, c1), p(a1, b0, c0), p(a1, b1, c0), p(a1, b1, c1), u);
  face(ctx, p(a0, b0, c0), p(a0, b0, c1), p(a0, b1, c1), p(a0, b1, c0), neg(u));
  face(ctx, p(a0, b1, c1), p(a1, b1, c1), p(a1, b1, c0), p(a0, b1, c0), v);
  face(ctx, p(a0, b0, c0), p(a1, b0, c0), p(a1, b0, c1), p(a0, b0, c1), neg(v));
}
// a flat disc facing n, in the plane of u, v
function discN(ctx, c, r, u, v, n, M = 16) {
  for (let k = 0; k < M; k++) { const t0 = (k / M) * 6.2832, t1 = ((k + 1) / M) * 6.2832;
    tri3(ctx, c, P3(c, u, v, n, Math.cos(t0) * r, Math.sin(t0) * r, 0), P3(c, u, v, n, Math.cos(t1) * r, Math.sin(t1) * r, 0), n); }
}
// a box in a frame turned by q quarter turns (0: front -Z), local x/z ranges
function qbox(ctx, x, z, q, lx0, lx1, y0, y1, lz0, lz1, b = 0.02) {
  const m = [[1, 0, 0, 1], [0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0]][((q % 4) + 4) % 4];
  const X = (lx, lz) => [x + m[0] * lx + m[1] * lz, z + m[2] * lx + m[3] * lz];
  const a = X(lx0, lz0), c = X(lx1, lz1);
  if (b > 0) rbox(ctx, Math.min(a[0], c[0]), Math.max(a[0], c[0]), y0, y1, Math.min(a[1], c[1]), Math.max(a[1], c[1]), b);
  else box(ctx, Math.min(a[0], c[0]), Math.max(a[0], c[0]), y0, y1, Math.min(a[1], c[1]), Math.max(a[1], c[1]));
}
const tri = (ctx, a, b, c) => tri3(ctx, a, b, c, [0, 1, 0]);
function flatDisc(ctx, x, z, y, r, M = 20, up = 1) { for (let k = 0; k < M; k++) { const t0 = (k / M) * 6.2832, t1 = ((k + 1) / M) * 6.2832; tri3(ctx, [x, y, z], [x + Math.cos(t0) * r, y, z + Math.sin(t0) * r], [x + Math.cos(t1) * r, y, z + Math.sin(t1) * r], [0, up, 0]); } }

// ---------- pieces ----------
function chandelier(ctx, s) {
  const L = ctx.lod;
  BRASS(ctx);
  rod(ctx, [0, 0, 0], [0, -0.9 * s, 0], 0.02 * s);
  lathe(ctx, 0, 0, [[-0.02, 0.001], [-0.02, 0.22 * s], [-0.09, 0.18 * s], [-0.12, 0.03 * s]], 14); // ceiling rose
  const top = -0.9 * s, bot = -2.3 * s;
  lathe(ctx, 0, 0, [[bot, 0.001], [bot + 0.06 * s, 0.07 * s], [bot + 0.25 * s, 0.11 * s], [bot + 0.4 * s, 0.05 * s], [bot + 0.7 * s, 0.04 * s], [bot + 0.8 * s, 0.09 * s], [bot + 0.9 * s, 0.04 * s], [top - 0.1 * s, 0.035 * s], [top, 0.06 * s], [top + 0.03 * s, 0.001]], 12);
  const tiers = [[bot + 0.42 * s, 1.0 * s, 12], [bot + 0.95 * s, 0.62 * s, 8]];
  for (const [y, R, n] of tiers) {
    // the gilt hoop and S arms with candle bulbs
    tube(ctx, circ(0, 0, R * 0.92, 24).map(([x, z]) => [x, y, z]).concat([[R * 0.92, y, 0]]), Array(25).fill(0.014 * s), 6, [1, 1], 0, 1, 1);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 6.2832, c = Math.cos(a), sn = Math.sin(a), P = (r, dy) => [c * r, y + dy, sn * r];
      BRASS(ctx);
      tube(ctx, [P(0.05 * s, 0.1 * s), P(R * 0.45, -0.12 * s), P(R * 0.85, -0.05 * s), P(R, 0.12 * s)], [0.016 * s, 0.014 * s, 0.013 * s, 0.012 * s], 6);
      lathe(ctx, c * R, sn * R, [[y + 0.1 * s, 0.001], [y + 0.12 * s, 0.07 * s], [y + 0.15 * s, 0.075 * s], [y + 0.15 * s, 0.022 * s]], 10); // drip pan
      paint(ctx, "oklch(0.95 0.02 90)", null, 0.6); lathe(ctx, c * R, sn * R, [[y + 0.15 * s, 0.018 * s], [y + 0.3 * s, 0.018 * s], [y + 0.3 * s, 0.001]], 8);
      BULB(ctx); lathe(ctx, c * R, sn * R, [[y + 0.3 * s, 0.006 * s], [y + 0.34 * s, 0.022 * s], [y + 0.38 * s, 0.018 * s], [y + 0.42 * s, 0.001]], 8);
      // a swag of drops to the next arm and a pendant under each arm
      CRYS(ctx);
      const a2 = ((k + 1) / n) * 6.2832, steps = L <= 1 ? 7 : 4;
      for (let j = 1; j < steps; j++) { const t = j / steps, aa = a + (a2 - a) * t, sag = Math.sin(t * Math.PI) * 0.22 * s;
        crystal(ctx, Math.cos(aa) * R * 0.92, y - 0.02 * s - sag, Math.sin(aa) * R * 0.92, 0.018 * s, 0.05 * s); }
      for (let j = 0; j < (L <= 2 ? 3 : 1); j++) crystal(ctx, c * R * 0.88, y - 0.08 * s - j * 0.11 * s, sn * R * 0.88, 0.028 * s - j * 0.004 * s, 0.11 * s);
    }
  }
  // the cascade under the bowl: rings of drops to a final ball
  CRYS(ctx);
  for (let r = 0; r < 4; r++) { const R = (0.55 - r * 0.12) * s, y = bot + 0.2 * s - r * 0.12 * s, n = 16 - r * 3;
    for (let k = 0; k < n; k++) { const a = (k / n) * 6.2832 + r * 0.3; crystal(ctx, Math.cos(a) * R, y, Math.sin(a) * R, 0.022 * s, 0.09 * s); } }
  sphere(ctx, [0, bot - 0.45 * s, 0], 0.075 * s, 12);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.2832; rod(ctx, [Math.cos(a) * 0.06 * s, bot, Math.sin(a) * 0.06 * s], [Math.cos(a) * 0.45 * s, bot + 0.16 * s, Math.sin(a) * 0.45 * s], 0.004 * s, 4); }
}

// a dressing door on a wall: o = bottom centre on the wall face, u along, n out of the wall
function wallDoor(ctx, o, u, v, n, w = 1.05, h = 2.3, hue = 0, kind = 0) {
  const col = [["oklch(0.93 0.02 90)", 0.55], ["oklch(0.36 0.08 35)", 0.45], ["oklch(0.4 0.1 25)", 0.4], ["oklch(0.42 0.06 160)", 0.45], ["oklch(0.3 0.05 260)", 0.4]][hue % 5];
  paint(ctx, "oklch(0.9 0.03 85)", null, 0.5); // the casing
  const cw = 0.11;
  obox(ctx, o, u, v, n, -w / 2 - cw, -w / 2, 0, h + cw, 0, 0.07);
  obox(ctx, o, u, v, n, w / 2, w / 2 + cw, 0, h + cw, 0, 0.07);
  obox(ctx, o, u, v, n, -w / 2 - cw - 0.03, w / 2 + cw + 0.03, h + cw, h + cw + 0.07, 0, 0.09);
  obox(ctx, o, u, v, n, -w / 2 - cw - 0.05, w / 2 + cw + 0.05, h + cw + 0.07, h + cw + 0.1, 0, 0.12);
  paint(ctx, col[0], kind === 1 ? null : "cdn/texture-worn-hardwood-grain.png", col[1]);
  obox(ctx, o, u, v, n, -w / 2, w / 2, 0, h, 0, 0.035);
  const rows = kind === 2 ? [[0.12, 0.62], [0.72, 1.5], [1.6, h - 0.12]] : [[0.12, 0.9], [1.0, h - 0.12]];
  for (const [b0, b1] of rows) for (const sx of [-1, 1]) obox(ctx, o, u, v, n, sx > 0 ? 0.06 : -w / 2 + 0.1, sx > 0 ? w / 2 - 0.1 : -0.06, b0, b1, 0.035, 0.05);
  BRASS(ctx);
  const k = P3(o, u, v, n, w / 2 - 0.12, 1.0, 0.09);
  sphere(ctx, k, 0.03, 8); obox(ctx, o, u, v, n, w / 2 - 0.15, w / 2 - 0.09, 0.86, 1.14, 0.035, 0.045);
  obox(ctx, o, u, v, n, -0.08, 0.08, h - 0.32, h - 0.24, 0.035, 0.045); // a number plate
}

function bandTable(ctx, x, z, r, rnd, L) {
  // the cloth: a drape with folds at the hem
  LINEN(ctx);
  const M = L <= 2 ? 28 : 14, ring = (y, R, f) => Array.from({ length: M }, (_, k) => { const t = (k / M) * 6.2832, rr = R + f * Math.sin(t * 9 + x); return [x + Math.cos(t) * rr, z + Math.sin(t) * rr]; });
  loft(ctx, [{ y: 0.01, pts: ring(0.01, r + 0.12, 0.035) }, { y: 0.35, pts: ring(0.35, r + 0.09, 0.02) }, { y: 0.7, pts: ring(0.7, r + 0.03, 0.004) }, { y: 0.755, pts: ring(0.755, r, 0) }, { y: 0.765, pts: ring(0.765, r - 0.03, 0) }]);
  // centrepiece: a brass candelabrum, three tapers; a low spray of dead white roses
  BRASS(ctx);
  lathe(ctx, x, z, [[0.765, 0.09], [0.78, 0.08], [0.8, 0.02], [1.05, 0.015], [1.08, 0.03], [1.09, 0.001]], 10);
  for (const a of [0, 3.1416]) { const cx = x + Math.cos(a + x) * 0.16, cz = z + Math.sin(a + x) * 0.16;
    rod(ctx, [x, 1.0, z], [cx, 1.08, cz], 0.008); lathe(ctx, cx, cz, [[1.08, 0.025], [1.1, 0.025], [1.1, 0.001]], 8);
    paint(ctx, "oklch(0.95 0.02 90)", null, 0.6); lathe(ctx, cx, cz, [[1.1, 0.011], [1.3 - rnd() * 0.12, 0.011], [1.3, 0.001]], 6); BRASS(ctx); }
  paint(ctx, "oklch(0.95 0.02 90)", null, 0.6); lathe(ctx, x, z, [[1.09, 0.011], [1.32, 0.011], [1.32, 0.001]], 6);
  paint(ctx, "oklch(0.82 0.03 20)", null, 0.9);
  for (let k = 0; k < 7; k++) { const a = k * 0.9 + x, rr = 0.11; sphere(ctx, [x + Math.cos(a) * rr, 0.8, z + Math.sin(a) * rr], 0.035, 6); }
}

function setting(ctx, x, z, a, r, fill, rnd, L) {
  const px = x + Math.cos(a) * (r - 0.22), pz = z + Math.sin(a) * (r - 0.22);
  paint(ctx, "oklch(0.97 0.005 90)", null, 0.25);
  lathe(ctx, px, pz, [[0.765, 0.08], [0.775, 0.12], [0.785, 0.125], [0.78, 0.09]], 14); // a plate
  if (rnd() < 0.5) { paint(ctx, "oklch(0.55 0.1 40)", null, 0.6); sphere(ctx, [px + 0.02, 0.795, pz], 0.035, 6, [1.3, 0.4, 1]); } // a half-eaten course
  SILVER(ctx);
  const fx = -Math.sin(a), fz = Math.cos(a);
  box(ctx, px + fx * 0.15 - 0.006, px + fx * 0.15 + 0.006, 0.766, 0.772, pz + fz * 0.15 - 0.006, pz + fz * 0.15 + 0.006);
  rod(ctx, [px + fx * 0.16 - Math.cos(a) * 0.08, 0.768, pz + fz * 0.16 - Math.sin(a) * 0.08], [px + fx * 0.16 + Math.cos(a) * 0.08, 0.768, pz + fz * 0.16 + Math.sin(a) * 0.08], 0.004, 4);
  rod(ctx, [px - fx * 0.16 - Math.cos(a) * 0.08, 0.768, pz - fz * 0.16 - Math.sin(a) * 0.08], [px - fx * 0.16 + Math.cos(a) * 0.08, 0.768, pz - fz * 0.16 + Math.sin(a) * 0.08], 0.004, 4);
  coupe(ctx, px - fx * 0.18 - Math.cos(a) * 0.12, 0.765, pz - fz * 0.18 - Math.sin(a) * 0.12, fill);
  if (rnd() < 0.35) { LINEN(ctx); const nx = px + fx * 0.25, nz = pz + fz * 0.25; tri(ctx, [nx, 0.767, nz - 0.08], [nx + 0.08, 0.767, nz + 0.06], [nx - 0.08, 0.767, nz + 0.05]); tri(ctx, [nx, 0.767, nz - 0.08], [nx, 0.84, nz + 0.01], [nx + 0.08, 0.767, nz + 0.06]); }
}

function cake(ctx, x, z) {
  LINEN(ctx);
  loft(ctx, [0.01, 0.4, 0.72, 0.755].map((y, i) => ({ y, pts: circ(x, z, [0.7, 0.67, 0.62, 0.6][i], 24) })));
  SILVER(ctx); lathe(ctx, x, z, [[0.755, 0.06], [0.84, 0.05], [0.86, 0.36], [0.875, 0.36], [0.875, 0.001]], 20);
  const tiers = [[0.875, 0.3, 0.18], [1.055, 0.22, 0.16], [1.215, 0.15, 0.14]];
  for (const [y, R, h] of tiers) {
    paint(ctx, "oklch(0.95 0.03 85)", null, 0.75); lathe(ctx, x, z, [[y, R], [y + h - 0.01, R], [y + h, R - 0.01], [y + h, 0.001]], 24);
    paint(ctx, "oklch(0.97 0.02 90)", null, 0.6);
    for (const yy of [y + 0.012, y + h - 0.004]) tube(ctx, circ(x, z, R + 0.004, 24).map(([a, b]) => [a, yy, b]).concat([[x + R + 0.004, yy, z]]), Array(25).fill(0.012), 5, [1, 1], 0, 1, 1);
    paint(ctx, "oklch(0.8 0.08 10)", null, 0.7); for (let k = 0; k < 6; k++) { const a = k * 1.047 + y * 9; sphere(ctx, [x + Math.cos(a) * (R + 0.01), y + h * 0.55, z + Math.sin(a) * (R + 0.01)], 0.025, 6); }
  }
  // a slice taken, on a plate with a fork laid in it
  paint(ctx, "oklch(0.97 0.005 90)", null, 0.25); lathe(ctx, x + 0.42, z - 0.25, [[0.755, 0.06], [0.762, 0.09], [0.768, 0.095], [0.765, 0.07]], 12);
  paint(ctx, "oklch(0.95 0.03 85)", null, 0.75); prism(ctx, [[x + 0.38, z - 0.27], [x + 0.48, z - 0.3], [x + 0.47, z - 0.2]], 0.768, 0.86);
  SILVER(ctx); rod(ctx, [x - 0.1, 0.9, z - 0.38], [x - 0.42, 0.765, z - 0.3], 0.006, 4);
  GILT(ctx); rod(ctx, [x, 1.355, z], [x, 1.5, z], 0.006, 4); sphere(ctx, [x, 1.5, z], 0.03, 8);
}

function piano(ctx, x, z) {
  // a grand piano, keyboard facing -X (towards the floor), body along +Z… outline in (x, z)
  const out = [[0, 0], [0, 1.45], [0.3, 1.5], [0.55, 1.48], [0.75, 1.35], [0.9, 1.1], [1.05, 0.75], [1.3, 0.45], [1.42, 0.2], [1.45, 0]].map(([a, b]) => [x - 0.72 + a, z - 0.75 + b]);
  paint(ctx, "oklch(0.13 0.01 260)", null, 0.08, 0.1);
  prism(ctx, out, 0.62, 0.98);
  paint(ctx, "oklch(0.55 0.08 70)", null, 0.6); prism(ctx, out.map(([a, b]) => [x + (a - x) * 0.94, z + (b - z) * 0.94]), 0.975, 0.985);
  paint(ctx, "oklch(0.13 0.01 260)", null, 0.08, 0.1);
  // the lid up on its stick
  const lid = out.map(([a, b]) => [a, b]);
  const hinge = x - 0.72, ang = 0.75;
  const L = lid.map(([a, b]) => { const d = a - hinge; return [hinge + d * Math.cos(ang), 1.0 + d * Math.sin(ang), b]; });
  for (let k = 1; k < L.length - 1; k++) { tri3(ctx, L[0], L[k], L[k + 1], [-Math.sin(ang), Math.cos(ang), 0]); tri3(ctx, L[0], L[k + 1], L[k], [Math.sin(ang), -Math.cos(ang), 0]); }
  rod(ctx, [x + 0.1, 0.98, z + 0.2], [x + 0.05, 1.62, z + 0.2], 0.008, 4);
  for (const [a, b] of [[0.1, 0.1], [0.1, 1.35], [1.1, 0.45]]) tube(ctx, [[x - 0.72 + a, 0.0, z - 0.75 + b], [x - 0.72 + a, 0.3, z - 0.75 + b], [x - 0.72 + a, 0.62, z - 0.75 + b]], [0.04, 0.055, 0.06], 8);
  // the keyboard on the -X side
  box(ctx, x - 0.98, x - 0.72, 0.6, 0.66, z - 0.75, z + 0.7);
  paint(ctx, "oklch(0.95 0.02 90)", null, 0.3); box(ctx, x - 0.96, x - 0.78, 0.66, 0.68, z - 0.7, z + 0.65);
  paint(ctx, "oklch(0.12 0 0)", null, 0.3); for (let k = 0; k < 30; k++) { if ([2, 6, 9, 13, 16, 20, 23, 27].includes(k % 30)) continue; const zz = z - 0.68 + k * 0.045; box(ctx, x - 0.92, x - 0.82, 0.68, 0.70, zz, zz + 0.022); }
  box(ctx, x - 1.5, x - 1.15, 0.45, 0.5, z - 0.35, z + 0.35); for (const dz of [-0.3, 0.3]) for (const dx of [-1.45, -1.2]) box(ctx, x + dx - 0.02, x + dx + 0.02, 0, 0.45, z + dz - 0.02, z + dz + 0.02);
  // sheet music, open
  paint(ctx, "oklch(0.93 0.03 85)", null, 0.9); face(ctx, [x - 0.8, 0.72, z - 0.25], [x - 0.8, 0.72, z + 0.25], [x - 0.72, 0.98, z + 0.25], [x - 0.72, 0.98, z - 0.25], [-1, 0.3, 0]);
}

function bass(ctx, x, z) {
  // a double bass leaning on the wall, back to it, body a fiddle outline lofted thin
  WOOD(ctx, 0.42);
  const sh = (t) => 0.32 * (0.75 + 0.25 * Math.cos(t * 6.28)) * (t < 0.62 ? 1 : 0.78);
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([t * 1.15, sh(t)]); }
  const lean = 0.17, base = [x, 0.08, z];
  const at = (h, w, d) => [base[0] + h * Math.sin(lean) + d * Math.cos(lean), base[1] + h * Math.cos(lean) - d * Math.sin(lean), base[2] + w];
  for (let i = 0; i < pts.length - 1; i++) { const [h0, w0] = pts[i], [h1, w1] = pts[i + 1];
    face(ctx, at(h0, -w0, -0.11), at(h0, w0, -0.11), at(h1, w1, -0.11), at(h1, -w1, -0.11), [-1, 0.1, 0]);
    face(ctx, at(h0, w0, 0.11), at(h0, -w0, 0.11), at(h1, -w1, 0.11), at(h1, w1, 0.11), [1, 0, 0]);
    face(ctx, at(h0, w0, -0.11), at(h0, w0, 0.11), at(h1, w1, 0.11), at(h1, w1, -0.11), [0, 0, 1]);
    face(ctx, at(h0, -w0, 0.11), at(h0, -w0, -0.11), at(h1, -w1, -0.11), at(h1, -w1, 0.11), [0, 0, -1]); }
  paint(ctx, "oklch(0.12 0.01 40)", null, 0.4);
  obox(ctx, at(1.15, 0, -0.06), [0, 0, 1], [Math.sin(lean), Math.cos(lean), 0], [-Math.cos(lean), Math.sin(lean), 0], -0.03, 0.03, 0, 0.75, -0.02, 0.03);
  rod(ctx, at(0, 0, 0), at(-0.08, 0, 0), 0.01, 4);
  WOOD(ctx, 0.35); tube(ctx, [at(1.85, 0, 0), at(1.95, 0, -0.04), at(1.92, 0, -0.1)], [0.04, 0.035, 0.025], 6);
  paint(ctx, "oklch(0.85 0.02 80)", null, 0.3, 0.6); for (const w of [-0.03, -0.01, 0.01, 0.03]) rod(ctx, at(0.25, w, -0.13), at(1.85, w * 0.6, -0.1), 0.0025, 3);
}

function drums(ctx, x, z) {
  paint(ctx, "oklch(0.45 0.15 25)", null, 0.3, 0.2);
  tube(ctx, [[x, 0.3, z - 0.22], [x, 0.3, z + 0.22]], [0.29, 0.29], 18, [1, 1], 0, 1, 1);
  paint(ctx, "oklch(0.95 0.01 90)", null, 0.6); discN(ctx, [x, 0.3, z - 0.225], 0.28, [1, 0, 0], [0, 1, 0], [0, 0, -1], 18);
  paint(ctx, "oklch(0.45 0.15 25)", null, 0.3, 0.2); lathe(ctx, x + 0.35, z - 0.45, [[0.58, 0.18], [0.7, 0.18], [0.7, 0.001]], 16);
  lathe(ctx, x - 0.2, z - 0.1, [[0.7, 0.14], [0.85, 0.14], [0.85, 0.001]], 14);
  STEEL(ctx, "oklch(0.75 0.01 250)"); for (const [dx, dz, h] of [[0.35, -0.45, 0.58], [-0.55, 0.15, 1.15], [0.6, 0.2, 1.05]]) { rod(ctx, [x + dx, 0, z + dz], [x + dx, h, z + dz], 0.01, 5); for (let k = 0; k < 3; k++) { const a = k * 2.09; rod(ctx, [x + dx, 0.3, z + dz], [x + dx + Math.cos(a) * 0.2, 0, z + dz + Math.sin(a) * 0.2], 0.008, 4); } }
  BRASS(ctx); lathe(ctx, x - 0.55, z + 0.15, [[1.15, 0.24], [1.17, 0.18], [1.19, 0.03], [1.2, 0.001]], 16); lathe(ctx, x + 0.6, z + 0.2, [[1.05, 0.2], [1.07, 0.15], [1.09, 0.02], [1.1, 0.001]], 16);
  // a stick dropped on the floor
  WOOD(ctx, 0.75); rod(ctx, [x - 0.4, 0.015, z - 0.6], [x - 0.05, 0.015, z - 0.85], 0.008, 5);
}

function musicStand(ctx, x, z, a) {
  STEEL(ctx, "oklch(0.25 0.01 250)");
  rod(ctx, [x, 0, z], [x, 1.05, z], 0.01, 5); for (let k = 0; k < 3; k++) { const t = k * 2.09; rod(ctx, [x, 0.25, z], [x + Math.cos(t) * 0.25, 0, z + Math.sin(t) * 0.25], 0.007, 4); }
  const u = [-Math.sin(a), 0, Math.cos(a)], n = [Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3];
  obox(ctx, [x, 1.02, z], u, [Math.cos(a) * -0.35, 0.94, Math.sin(a) * -0.35], [Math.cos(a), 0.3, Math.sin(a)], -0.26, 0.26, 0, 0.35, -0.004, 0.004);
  paint(ctx, "oklch(0.93 0.03 85)", null, 0.9); obox(ctx, [x, 1.05, z], u, [Math.cos(a) * -0.35, 0.94, Math.sin(a) * -0.35], [Math.cos(a), 0.3, Math.sin(a)], -0.22, 0.22, 0, 0.3, 0.004, 0.008);
}

// ---------- the ballroom ----------
const TABLES = [[-2.6, -8.6], [1.8, -9.0], [10.2, -9.2], [-3.4, -4.2], [-3.4, 4.2], [-2.6, 8.6], [1.8, 9.0], [10.2, 9.0], [14.2, -3.4], [14.4, 7.0]];
export const BALL_TABLES = TABLES;
const DOORS_W = [[-5.85, -9.4, 0], [-5.85, -5.6, 2], [-5.85, 5.6, 0], [-5.85, 9.6, 1], [-5.85, -3.0, 3, 4.6]]; // x, z, style, raised
const DOORS_N = [[-3.5, -11.85, 1], [0.6, -11.85, 4], [10.3, -11.85, 0, 3.8], [1.2, -11.85, 2, 5.4]];
const DOORS_S = [[-3.6, 11.85, 2], [1.4, 11.85, 0], [9.8, 11.85, 3], [12.4, 11.85, 4, 3.6], [16.4, 11.85, 1]];
const DOORS_E = [[17.85, 5.2, 1], [17.85, 8.8, 2], [17.85, -4.6, 0, 5.0], [17.85, 3.2, 4, 6.2]];
const CEIL = [[2.2, 2.6, 0.4], [9.6, -3.2, 1.9], [13.5, 2.2, 1.1]];

function ballroom(ctx) {
  const L = ctx.lod, R = rng(51);
  // the dance floor: polished parquet with a brass ring, a compass star inlaid at the middle
  paint(ctx, "oklch(0.62 0.09 55)", "cdn/texture-polished-herringbone-parquet-floor.png", 0.15);
  loft(ctx, [{ y: 0.004, pts: circ(6, 0, 5.2, 48) }, { y: 0.018, pts: circ(6, 0, 5.2, 48) }]);
  BRASS(ctx); lathe(ctx, 6, 0, [[0.0, 5.45], [0.02, 5.45], [0.02, 5.2]], 48); lathe(ctx, 6, 0, [[0.018, 1.62], [0.021, 1.62], [0.021, 1.5], [0.018, 1.5]], 32);
  paint(ctx, "oklch(0.35 0.07 40)", null, 0.15); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.2832, b = a + 0.39, r1 = k % 2 ? 1.0 : 1.48;
    tri(ctx, [6, 0.02, 0], [6 + Math.cos(a - 0.1) * 0.25, 0.02, Math.sin(a - 0.1) * 0.25], [6 + Math.cos(a) * r1, 0.02, Math.sin(a) * r1]); tri(ctx, [6, 0.02, 0], [6 + Math.cos(a) * r1, 0.02, Math.sin(a) * r1], [6 + Math.cos(a + 0.1) * 0.25, 0.02, Math.sin(a + 0.1) * 0.25]); }
  // the banquet: cloths, gilt chairs pushed back mid-motion, settings, coupes left at any level
  TABLES.forEach(([x, z], i) => {
    bandTable(ctx, x, z, 0.9, R, L);
    const n = 6, a0 = R() * 6.28;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * 6.2832, push = R() < 0.45 ? 0.25 + R() * 0.35 : 0, rr = 1.25 + push;
      chair(ctx, x + Math.cos(a) * rr, z + Math.sin(a) * rr, Math.atan2(-Math.cos(a), Math.sin(a)) + (push ? (R() - 0.5) * 0.9 : (R() - 0.5) * 0.15));
      if (L <= 2) setting(ctx, x, z, a, 0.9, R() < 0.2 ? 0 : 0.3 + R() * 0.65, R, L);
    }
  });
  // a coupe left on the dance floor, one on its side with its spill
  coupe(ctx, 3.2, 0.018, 2.6, 0.55); coupe(ctx, 8.9, 0.018, -2.2, 0.2);
  paint(ctx, "oklch(0.8 0.08 92)", null, 0.02, 0.1); loft(ctx, [{ y: 0.019, pts: circ(9.6, -3.3, 0.18, 12, 1.4, 0.9) }, { y: 0.021, pts: circ(9.6, -3.3, 0.17, 12, 1.4, 0.9) }]);
  GLASS(ctx); tube(ctx, [[9.4, 0.065, -3.2], [9.52, 0.065, -3.25]], [0.008, 0.008], 6, [1, 1], 0, 1, 1); lathe(ctx, 9.62, -3.3, [[0.02, 0.001], [0.03, 0.035], [0.08, 0.055], [0.1, 0.06]], 10);
  cake(ctx, 15.0, 3.4);
  // the bandstand: an elliptic stage in the north-east corner, gilt-edged, its band gone
  const sx = 5.0, sz = 3.6, cx = 17.85, cz = -11.85, oval = [[cx, cz]];
  for (let k = 0; k <= 16; k++) { const t = Math.PI / 2 + (k / 16) * (Math.PI / 2); oval.push([cx + Math.cos(t) * sx * -1 * -1 * (Math.cos(t) < 0 ? 1 : 1), cz + Math.sin(t) * sz]); }
  const stage = [[cx, cz]]; for (let k = 0; k <= 16; k++) { const t = (k / 16) * (Math.PI / 2); stage.push([cx - Math.cos(t) * sx, cz + Math.sin(t) * sz]); }
  WOOD(ctx, 0.32); prism(ctx, stage, 0, 0.45);
  paint(ctx, "oklch(0.5 0.12 25)", "cdn/texture-crushed-velvet-upholstery.png", 0.9); const skirt = stage.slice(1).map(([a, b]) => [cx + (a - cx) * 1.012, cz + (b - cz) * 1.012]);
  for (let k = 0; k < skirt.length - 1; k++) { const [a, b] = skirt[k], [c, d] = skirt[k + 1], mx = (a + c) / 2 - cx, mz = (b + d) / 2 - cz; face(ctx, [a, 0.02, b], [c, 0.02, d], [c, 0.38, d], [a, 0.38, b], [mx, 0, mz]); }
  GILT(ctx); tube(ctx, stage.slice(1).map(([a, b]) => [cx + (a - cx) * 1.015, 0.43, cz + (b - cz) * 1.015]), Array(17).fill(0.025), 6, [1, 1], 0, 1, 1);
  for (let k = 0; k < 3; k++) { const t = 0.35 + k * 0.4, y0 = 0.15 * (k + 1); } // (steps are drawn below)
  WOOD(ctx, 0.32); rbox(ctx, 13.4, 14.4, 0, 0.15, -8.75, -8.2, 0.015); rbox(ctx, 13.4, 14.4, 0.15, 0.3, -9.0, -8.45, 0.015);
  piano(ctx, 15.7, -6.6);
  // the radio's little gilt side table on the stage
  GILT(ctx); lathe(ctx, 15.5, -10.6, [[0.45, 0.18], [0.5, 0.15], [0.55, 0.04], [0.88, 0.035], [0.92, 0.1], [0.93, 0.28], [0.95, 0.28], [0.95, 0.001]], 16);
  ctx.lod <= 3 && bass(ctx, 17.55, -9.1);
  drums(ctx, 14.6, -11.2);
  for (const [x, z, a] of [[13.9, -10.3, 2.6], [14.9, -9.4, 2.4]]) { musicStand(ctx, x, z, a); }
  chair(ctx, 13.4, -10.2, 2.2, 0, 0.45); chair(ctx, 14.6, -8.9, 2.5, 0, 0.45);
  // a microphone at the front, and a trumpet left on a chair
  STEEL(ctx, "oklch(0.75 0.01 250)"); rod(ctx, [13.6, 0.45, -9.3], [13.6, 1.95, -9.3], 0.012, 6); lathe(ctx, 13.6, -9.3, [[0.45, 0.14], [0.47, 0.13], [0.48, 0.02]], 14);
  paint(ctx, "oklch(0.8 0.01 250)", null, 0.3, 0.8); obox(ctx, [13.6, 1.98, -9.3], [1, 0, 0], [0, 1, 0], [0, 0, 1], -0.05, 0.05, -0.04, 0.12, -0.03, 0.03);
  BRASS(ctx); tube(ctx, [[13.35, 0.98, -10.25], [13.55, 1.0, -10.2], [13.7, 1.0, -10.1]], [0.008, 0.012, 0.012], 6); lathe(ctx, 13.72, -10.1, [[0.92, 0.002], [0.96, 0.02], [1.0, 0.06]], 12);
  // the wall doors: dozens of ways nowhere, a few hung far too high, three in the ceiling
  for (const [x, z, s, y] of DOORS_W) wallDoor(ctx, [x, y ?? 0, z], [0, 0, -1], [0, 1, 0], [1, 0, 0], 1.0, 2.3, s, s % 3);
  for (const [x, z, s, y] of DOORS_N) wallDoor(ctx, [x, y ?? 0, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], 1.0, 2.3, s, s % 3);
  for (const [x, z, s, y] of DOORS_S) wallDoor(ctx, [x, y ?? 0, z], [-1, 0, 0], [0, 1, 0], [0, 0, -1], 1.0, 2.3, s, s % 3);
  for (const [x, z, s, y] of DOORS_E) wallDoor(ctx, [x, y ?? 0, z], [0, 0, 1], [0, 1, 0], [-1, 0, 0], 1.0, 2.3, s, s % 3);
  for (const [x, z, a] of CEIL) { const u = [Math.cos(a), 0, Math.sin(a)], v = [-Math.sin(a), 0, Math.cos(a)]; wallDoor(ctx, P3([x, 8.99, z], u, v, [0, -1, 0], 0, -1.15, 0), u, v, [0, -1, 0], 1.0, 2.3, (a * 10) | 0, 0); }
  // silver placards over the real ways in
  SILVER(ctx);
  rbox(ctx, -5.86, -5.8, 3.5, 3.95, -1.05, 1.05, 0.02); rbox(ctx, -6.2, -6.14, 3.5, 3.95, -1.05, 1.05, 0.02);
  rbox(ctx, 4.95, 7.05, 3.1, 3.5, -11.86, -11.8, 0.02); rbox(ctx, 4.95, 7.05, 3.1, 3.5, 11.8, 11.86, 0.02);
  // the coat-check: a brass rail of abandoned coats beside its counter
  BRASS(ctx); rod(ctx, [-5.55, 1.75, 6.9], [-5.55, 1.75, 8.45], 0.015, 6); rod(ctx, [-5.55, 0, 6.9], [-5.55, 1.8, 6.9], 0.02, 6); rod(ctx, [-5.55, 0, 8.45], [-5.55, 1.8, 8.45], 0.02, 6);
  const coatHue = [20, 260, 140, 60, 300, 30];
  for (let k = 0; k < 6; k++) { const z = 7.05 + k * 0.25; paint(ctx, `oklch(${0.22 + (k % 3) * 0.08} ${0.03 + (k % 2) * 0.06} ${coatHue[k]})`, "cdn/texture-wool-felt-coat-fabric.png", 0.95);
    loft(ctx, [[0.55, 0.2], [0.9, 0.22], [1.45, 0.24], [1.6, 0.18], [1.7, 0.06]].map(([y, w]) => ({ y, pts: circ(-5.55, z, 1, 10, w, 0.07) }))); }
}

// ---------- the salon ----------
function sofa(ctx, x, z, q, len, hue) {
  const h = len / 2;
  WOOD(ctx, 0.25); for (const lx of [-h + 0.08, h - 0.08]) for (const lz of [-0.36, 0.36]) qbox(ctx, x, z, q, lx - 0.04, lx + 0.04, 0, 0.12, lz - 0.04, lz + 0.04, 0.015);
  VELVET(ctx, hue);
  qbox(ctx, x, z, q, -h, h, 0.12, 0.42, -0.42, 0.42, 0.06);
  qbox(ctx, x, z, q, -h + 0.05, h - 0.05, 0.4, 0.95, 0.18, 0.44, 0.1);
  for (const s of [-1, 1]) qbox(ctx, x, z, q, s > 0 ? h - 0.2 : -h, s > 0 ? h : -h + 0.2, 0.4, 0.7, -0.44, 0.44, 0.09);
  const nC = len > 1.6 ? 3 : 2, w = (len - 0.4) / nC;
  for (let i = 0; i < nC; i++) qbox(ctx, x, z, q, -h + 0.2 + i * w + 0.01, -h + 0.2 + (i + 1) * w - 0.01, 0.42, 0.56, -0.4, 0.2, 0.07);
  paint(ctx, "oklch(0.75 0.11 85)", null, 0.6); qbox(ctx, x, z, q, -0.18, 0.06, 0.56, 0.75, 0.0, 0.16, 0.06); // a cushion knocked askew
}
function salon(ctx) {
  const R = rng(77);
  // a Persian rug under the sitting group
  paint(ctx, "oklch(0.55 0.1 30)", "cdn/texture-faded-persian-rug-red-blue.png", 0.95); rbox(ctx, 2.6, 9.4, 0, 0.012, -22.2, -15.8, 0.05);
  // the fireplace on the north wall: marble surround, iron grate, logs; a gilt mirror over it
  paint(ctx, "oklch(0.86 0.02 80)", "cdn/texture-veined-white-marble.png", 0.25);
  rbox(ctx, 4.6, 5.1, 0, 1.25, -23.85, -23.45, 0.02); rbox(ctx, 6.9, 7.4, 0, 1.25, -23.85, -23.45, 0.02);
  rbox(ctx, 4.6, 7.4, 1.0, 1.25, -23.85, -23.45, 0.02); rbox(ctx, 4.45, 7.55, 1.25, 1.33, -23.85, -23.32, 0.02);
  rbox(ctx, 4.4, 7.6, 0, 0.06, -23.85, -22.9, 0.02); // the hearth stone
  paint(ctx, "oklch(0.14 0.01 40)", null, 0.9); box(ctx, 5.1, 6.9, 0.06, 1.0, -23.86, -23.82); box(ctx, 5.1, 5.12, 0.06, 1.0, -23.85, -23.45); box(ctx, 6.88, 6.9, 0.06, 1.0, -23.85, -23.45); box(ctx, 5.1, 6.9, 0.98, 1.0, -23.85, -23.45);
  STEEL(ctx, "oklch(0.2 0.01 250)"); for (let k = 0; k < 6; k++) rod(ctx, [5.4 + k * 0.24, 0.1, -23.4], [5.4 + k * 0.24, 0.25, -23.7], 0.012, 5); rod(ctx, [5.35, 0.18, -23.45], [6.65, 0.18, -23.45], 0.015, 5);
  WOOD(ctx, 0.22); tube(ctx, [[5.5, 0.28, -23.6], [6.5, 0.3, -23.5]], [0.07, 0.06], 8, [1, 1], 0, 1, 1); tube(ctx, [[5.7, 0.38, -23.5], [6.35, 0.4, -23.65]], [0.06, 0.05], 8, [1, 1], 0, 1, 1);
  GILT(ctx); rbox(ctx, 4.9, 7.1, 1.55, 3.0, -23.86, -23.78, 0.03);
  paint(ctx, "oklch(0.6 0.02 80)", null, 0.03, 1); box(ctx, 5.05, 6.95, 1.68, 2.87, -23.79, -23.76);
  BRASS(ctx); for (const x of [5.0, 7.0]) { lathe(ctx, x, -23.6, [[1.33, 0.05], [1.36, 0.04], [1.42, 0.015], [1.55, 0.02], [1.6, 0.04], [1.61, 0.001]], 10); paint(ctx, "oklch(0.95 0.02 90)", null, 0.6); lathe(ctx, x, -23.6, [[1.6, 0.012], [1.72, 0.012], [1.72, 0.001]], 6); BRASS(ctx); }
  // the sitting group: two velvet sofas and a loveseat round a low table, a book face down
  sofa(ctx, 3.4, -19.4, 3, 2.2, 15); sofa(ctx, 8.6, -19.4, 1, 2.2, 15); sofa(ctx, 6.0, -16.7, 2, 1.6, 150);
  WOOD(ctx, 0.3); rbox(ctx, 5.2, 6.8, 0.38, 0.44, -20.0, -18.9, 0.03); for (const [x, z] of [[5.3, -19.9], [6.7, -19.9], [5.3, -19.0], [6.7, -19.0]]) tube(ctx, [[x, 0, z], [x, 0.2, z], [x, 0.38, z]], [0.02, 0.03, 0.025], 6);
  paint(ctx, "oklch(0.35 0.1 25)", null, 0.7); rbox(ctx, 5.5, 5.75, 0.44, 0.47, -19.6, -19.25, 0.005);
  coupe(ctx, 6.4, 0.44, -19.3, 0.4); coupe(ctx, 6.55, 0.44, -19.6, 0.7);
  paint(ctx, "oklch(0.7 0.06 80)", null, 0.2, 0.8); lathe(ctx, 6.1, -19.55, [[0.44, 0.06], [0.46, 0.065], [0.47, 0.055], [0.455, 0.045]], 14); // an ashtray
  paint(ctx, "oklch(0.3 0.06 50)", null, 0.8); rod(ctx, [6.06, 0.475, -19.55], [6.2, 0.475, -19.52], 0.009, 6);
  // the card table, mid-hand: baize, hands face down, the pot in chips
  WOOD(ctx, 0.28); lathe(ctx, 1.4, -15.0, [[0.0, 0.3], [0.05, 0.28], [0.08, 0.06], [0.6, 0.05], [0.68, 0.08], [0.7, 0.001]], 12);
  paint(ctx, "oklch(0.38 0.1 155)", "cdn/texture-green-baize-felt.png", 0.95); lathe(ctx, 1.4, -15.0, [[0.7, 0.62], [0.76, 0.62], [0.76, 0.001]], 28);
  WOOD(ctx, 0.28); lathe(ctx, 1.4, -15.0, [[0.69, 0.64], [0.77, 0.64], [0.77, 0.61], [0.75, 0.6]], 28);
  for (let s = 0; s < 4; s++) { const a = s * 1.5708 + 0.4, px = 1.4 + Math.cos(a) * 0.42, pz = -15.0 + Math.sin(a) * 0.42;
    chair(ctx, 1.4 + Math.cos(a) * (0.95 + (s === 1 ? 0.35 : 0)), -15.0 + Math.sin(a) * (0.95 + (s === 1 ? 0.35 : 0)), Math.atan2(-Math.cos(a), Math.sin(a)) + (s === 1 ? 0.6 : 0));
    for (let c = 0; c < 5; c++) { const b = a + 1.5708 + (c - 2) * 0.18, u = [Math.cos(b), 0, Math.sin(b)], v = [-Math.sin(b), 0, Math.cos(b)];
      paint(ctx, c % 2 ? "oklch(0.45 0.15 25)" : "oklch(0.97 0.01 90)", null, 0.5); obox(ctx, [px + Math.cos(a) * 0.02 * c, 0.762 + c * 0.0015, pz + Math.sin(a) * 0.02 * c], u, [0, 1, 0], v, -0.032, 0.032, 0, 0.0015, -0.045, 0.045); }
    paint(ctx, ["oklch(0.5 0.17 25)", "oklch(0.95 0.01 90)", "oklch(0.45 0.12 255)", "oklch(0.2 0.01 0)"][s], null, 0.5);
    for (let c = 0; c < 4 + s; c++) lathe(ctx, px - Math.sin(a) * 0.12, pz + Math.cos(a) * 0.12, [[0.762 + c * 0.006, 0.02], [0.768 + c * 0.006, 0.02], [0.768 + c * 0.006, 0.001]], 10); }
  for (let c = 0; c < 9; c++) { paint(ctx, ["oklch(0.5 0.17 25)", "oklch(0.95 0.01 90)", "oklch(0.45 0.12 255)"][c % 3], null, 0.5); const a = c * 0.7; lathe(ctx, 1.4 + Math.cos(a) * 0.08, -15.0 + Math.sin(a) * 0.08, [[0.762, 0.02], [0.768, 0.02], [0.768, 0.001]], 10); }
  paint(ctx, "oklch(0.7 0.06 80)", null, 0.2, 0.8); lathe(ctx, 1.65, -14.75, [[0.76, 0.05], [0.775, 0.055], [0.78, 0.045]], 12);
  coupe(ctx, 1.1, 0.76, -14.7, 0.3);
  // the gramophone on its cabinet in the corner, horn toward the room
  WOOD(ctx, 0.3); rbox(ctx, 12.2, 13.0, 0, 0.85, -23.4, -22.6, 0.03);
  paint(ctx, "oklch(0.15 0.01 40)", null, 0.3); lathe(ctx, 12.6, -23.0, [[0.85, 0.16], [0.87, 0.16], [0.87, 0.001]], 20);
  BRASS(ctx); rod(ctx, [12.88, 0.85, -22.75], [12.88, 0.95, -22.75], 0.012, 6); tube(ctx, [[12.88, 0.95, -22.75], [12.75, 0.95, -22.9], [12.66, 0.9, -22.98]], [0.012, 0.01, 0.008], 6);
  tube(ctx, [[12.88, 0.95, -22.75], [12.8, 1.15, -22.7], [12.5, 1.4, -22.45], [12.15, 1.6, -22.15], [11.95, 1.72, -21.95]], [0.02, 0.04, 0.09, 0.18, 0.3], 18);
  // the bar cart's back-bar: a gilt drinks shelf of decanters on the west wall
  WOOD(ctx, 0.3); rbox(ctx, -1.85, -1.45, 0.9, 0.95, -18.6, -17.0, 0.01); rbox(ctx, -1.85, -1.45, 1.4, 1.45, -18.6, -17.0, 0.01);
  for (let k = 0; k < 5; k++) { paint(ctx, ["oklch(0.6 0.13 60)", "oklch(0.85 0.03 90)", "oklch(0.45 0.13 30)"][k % 3], null, 0.05, 0.3); lathe(ctx, -1.65, -18.4 + k * 0.33, [[0.95, 0.001], [0.95, 0.06], [1.12, 0.06], [1.18, 0.025], [1.25, 0.02], [1.27, 0.03], [1.3, 0.001]], 10); }
  // portrait frames (canvases are their own planes)
  GILT(ctx);
  for (const [x, z, q] of PORTRAITS) { const w = 0.5, h = 0.62, t = 0.08;
    const u = q === 1 ? [0, 0, -1] : [1, 0, 0], n = q === 1 ? [1, 0, 0] : [0, 0, 1], o = [x, 2.3, z];
    obox(ctx, o, u, [0, 1, 0], n, -w - t, w + t, -h - t, -h, 0, 0.06); obox(ctx, o, u, [0, 1, 0], n, -w - t, w + t, h, h + t, 0, 0.06);
    obox(ctx, o, u, [0, 1, 0], n, -w - t, -w, -h, h, 0, 0.06); obox(ctx, o, u, [0, 1, 0], n, w, w + t, -h, h, 0, 0.06);
    BRASS(ctx); obox(ctx, o, u, [0, 1, 0], n, -0.18, 0.18, -h - t - 0.12, -h - t - 0.03, 0, 0.012); GILT(ctx);
    paint(ctx, "oklch(0.3 0.02 60)", null, 0.6); rod(ctx, P3(o, u, [0, 1, 0], n, -w * 0.6, h + t, 0.02), P3(o, u, [0, 1, 0], n, 0, h + 0.9, 0.0), 0.004, 3); rod(ctx, P3(o, u, [0, 1, 0], n, w * 0.6, h + t, 0.02), P3(o, u, [0, 1, 0], n, 0, h + 0.9, 0.0), 0.004, 3); GILT(ctx); }
}
export const PORTRAITS = [[-1.85, -20.5, 1], [-1.85, -14.8, 1], [2.0, -23.85, 0], [10.0, -23.85, 0]];

// ---------- housekeeping ----------
function washer(ctx, x) {
  const z0 = 22.75, z1 = 23.8;
  STEEL(ctx, "oklch(0.82 0.01 240)"); rbox(ctx, x - 0.58, x + 0.58, 0.1, 1.55, z0, z1, 0.04);
  paint(ctx, "oklch(0.3 0.01 250)", null, 0.6); rbox(ctx, x - 0.56, x + 0.56, 0, 0.12, z0 + 0.03, z1 - 0.03, 0.01);
  paint(ctx, "oklch(0.35 0.03 250)", null, 0.5); rbox(ctx, x - 0.56, x + 0.56, 1.3, 1.5, z0 - 0.02, z0 + 0.06, 0.01);
  paint(ctx, "oklch(0.9 0.02 80)", null, 0.3); for (let k = 0; k < 4; k++) lathe(ctx, x - 0.4 + k * 0.18, z0 - 0.04, [[1.38, 0.02], [1.42, 0.02], [1.42, 0.001]], 8);
  STEEL(ctx, "oklch(0.88 0.005 240)"); const c = [x, 0.72, z0 - 0.01];
  tube(ctx, circ(0, 0, 0.33, 20).map(([a, b]) => [x + a, 0.72 + b, z0 - 0.03]).concat([[x + 0.33, 0.72, z0 - 0.03]]), Array(21).fill(0.045), 8, [1, 1], 0, 1, 1);
  paint(ctx, "oklch(0.35 0.03 220)", null, 0.03, 0.2); discN(ctx, [x, 0.72, z0 - 0.04], 0.3, [1, 0, 0], [0, 1, 0], [0, 0, -1], 20);
  paint(ctx, "oklch(0.92 0.01 90)", null, 0.9); sphere(ctx, [x + 0.05, 0.62, z0 + 0.15], 0.24, 8, [1, 0.7, 0.6]);
  STEEL(ctx); rbox(ctx, x + 0.25, x + 0.33, 0.66, 0.8, z0 - 0.1, z0 - 0.05, 0.01);
}
function cot(ctx, x0, z) {
  STEEL(ctx, "oklch(0.4 0.05 130)"); for (const x of [x0 + 0.1, x0 + 1.85]) { rod(ctx, [x, 0, z - 0.36], [x, 0.42, z + 0.36], 0.012, 5); rod(ctx, [x, 0, z + 0.36], [x, 0.42, z - 0.36], 0.012, 5); }
  for (const dz of [-0.36, 0.36]) rod(ctx, [x0, 0.42, z + dz], [x0 + 1.95, 0.42, z + dz], 0.015, 6);
  paint(ctx, "oklch(0.5 0.05 125)", "cdn/texture-olive-canvas-cloth.png", 0.95); rbox(ctx, x0 + 0.02, x0 + 1.93, 0.4, 0.44, z - 0.36, z + 0.36, 0.01);
  paint(ctx, "oklch(0.4 0.06 130)", "cdn/texture-wool-felt-coat-fabric.png", 0.95); loft(ctx, [0.44, 0.5, 0.52].map((y, i) => ({ y, pts: rrect(x0 + 0.5 + i * 0.02, x0 + 1.9 - i * 0.02, z - 0.37 + i * 0.03, z + 0.37 - i * 0.03, 0.08) })));
  paint(ctx, "oklch(0.93 0.01 90)", null, 0.9); sphere(ctx, [x0 + 0.25, 0.5, z], 0.2, 8, [1, 0.35, 1.5]);
}
function shelf(ctx, x0, x1, z0, z1, R) {
  STEEL(ctx, "oklch(0.55 0.01 240)"); for (const x of [x0, x1 - 0.04]) for (const z of [z0, z1 - 0.04]) box(ctx, x, x + 0.04, 0, 2.1, z, z + 0.04);
  for (const y of [0.1, 0.6, 1.1, 1.6, 2.05]) rbox(ctx, x0, x1, y, y + 0.03, z0, z1, 0.008);
  for (const y of [0.13, 0.63, 1.13, 1.63]) { let x = x0 + 0.06; while (x < x1 - 0.3) { const w = 0.22 + R() * 0.25, k = R();
    if (k < 0.4) { paint(ctx, "oklch(0.6 0.07 70)", "cdn/texture-cardboard-box.png", 0.9); rbox(ctx, x, x + w, y, y + 0.2 + R() * 0.15, z0 + 0.05, z1 - 0.05, 0.01); }
    else if (k < 0.7) { paint(ctx, "oklch(0.95 0.01 90)", null, 0.9); for (let s = 0; s < 4; s++) rbox(ctx, x, x + w, y + s * 0.07, y + s * 0.07 + 0.065, z0 + 0.06, z1 - 0.06, 0.02); }
    else { paint(ctx, "oklch(0.92 0.05 85)", null, 0.08, 0.1); for (let s = 0; s < 3; s++) lathe(ctx, x + 0.05 + s * 0.08, (z0 + z1) / 2, [[y, 0.001], [y, 0.035], [y + 0.18, 0.035], [y + 0.22, 0.015], [y + 0.25, 0.015], [y + 0.25, 0.001]], 8); }
    x += w + 0.05; } }
}
function tubeLight(ctx, x, z) {
  STEEL(ctx, "oklch(0.75 0.01 240)"); rod(ctx, [x - 0.5, 3.6, z], [x - 0.5, 3.36, z], 0.004, 3); rod(ctx, [x + 0.5, 3.6, z], [x + 0.5, 3.36, z], 0.004, 3);
  rbox(ctx, x - 0.66, x + 0.66, 3.3, 3.36, z - 0.09, z + 0.09, 0.01);
  paint(ctx, "oklch(0.97 0.02 120)", null, 0.3, 0, "oklch(0.95 0.04 110)"); for (const dz of [-0.04, 0.04]) tube(ctx, [[x - 0.6, 3.27, z + dz], [x + 0.6, 3.27, z + dz]], [0.016, 0.016], 8, [1, 1], 0, 1, 1);
}
function housekeeping(ctx) {
  const R = rng(9);
  for (const x of [-5.0, -3.75, -2.5, -1.25]) washer(ctx, x);
  // sorting tables, a basket of laundry left mid-fold
  STEEL(ctx); rbox(ctx, 0.4, 2.6, 0.85, 0.9, 22.9, 23.7, 0.01); for (const [x, z] of [[0.45, 22.95], [2.5, 22.95], [0.45, 23.6], [2.5, 23.6]]) box(ctx, x, x + 0.04, 0, 0.85, z, z + 0.04);
  paint(ctx, "oklch(0.95 0.01 90)", null, 0.9); for (let s = 0; s < 5; s++) rbox(ctx, 0.6, 1.2, 0.9 + s * 0.05, 0.945 + s * 0.05, 23.0, 23.5, 0.02); sphere(ctx, [1.9, 0.98, 23.3], 0.3, 8, [1.3, 0.4, 0.9]);
  // the field desk: two folding tables, a field radio, maps of the floor, a lamp, a mug gone cold
  for (const [x0, x1, z0, z1] of [[6.2, 8.0, 19.2, 19.95], [8.1, 9.9, 19.2, 19.95]]) { paint(ctx, "oklch(0.55 0.05 130)", null, 0.6); rbox(ctx, x0, x1, 0.72, 0.76, z0, z1, 0.01);
    STEEL(ctx, "oklch(0.3 0.01 250)"); for (const x of [x0 + 0.1, x1 - 0.1]) { rod(ctx, [x, 0, z0 + 0.05], [x, 0.72, z1 - 0.1], 0.012, 5); rod(ctx, [x, 0, z1 - 0.05], [x, 0.72, z0 + 0.1], 0.012, 5); } }
  paint(ctx, "oklch(0.35 0.05 130)", null, 0.6, 0.2); rbox(ctx, 6.4, 6.95, 0.76, 1.05, 19.4, 19.8, 0.02);
  paint(ctx, "oklch(0.15 0.01 250)", null, 0.5); for (let k = 0; k < 3; k++) lathe(ctx, 6.5 + k * 0.15, 19.38, [[0.85, 0.02], [0.9, 0.02], [0.9, 0.001]], 8);
  rod(ctx, [6.9, 1.05, 19.7], [7.1, 2.0, 19.75], 0.004, 3);
  paint(ctx, "oklch(0.9 0.05 85)", "cdn/texture-old-hand-drawn-floor-plan-map.png", 0.9); box(ctx, 7.2, 8.4, 0.76, 0.762, 19.25, 19.9); box(ctx, 8.5, 9.4, 0.76, 0.763, 19.3, 19.85);
  paint(ctx, "oklch(0.55 0.15 30)", null, 0.6); sphere(ctx, [7.6, 0.77, 19.5], 0.012, 6); sphere(ctx, [8.0, 0.77, 19.7], 0.012, 6);
  paint(ctx, "oklch(0.4 0.05 140)", null, 0.5, 0.4); lathe(ctx, 9.6, 19.6, [[0.76, 0.07], [0.78, 0.06], [0.8, 0.01], [1.1, 0.01], [1.12, 0.06], [1.25, 0.12], [1.25, 0.11], [1.13, 0.05]], 12);
  paint(ctx, "oklch(0.92 0.01 90)", null, 0.4); lathe(ctx, 9.2, 19.35, [[0.76, 0.001], [0.76, 0.035], [0.86, 0.04], [0.86, 0.035]], 10);
  STEEL(ctx, "oklch(0.35 0.03 140)"); chair(ctx, 7.6, 18.6, Math.PI);
  // M.E.G. banner rods (the cloth is a vector)
  BRASS(ctx); rod(ctx, [5.6, 2.95, 23.82], [10.4, 2.95, 23.82], 0.015, 6);
  // cots along the west wall, kit at their feet
  for (const z of [13.9, 15.5, 17.1]) cot(ctx, -5.8, z);
  paint(ctx, "oklch(0.4 0.06 130)", "cdn/texture-olive-canvas-cloth.png", 0.95); for (const z of [13.9, 17.1]) sphere(ctx, [-3.55, 0.2, z], 0.22, 8, [0.8, 1, 1.3]);
  // supply shelves on the north wall
  shelf(ctx, 9.2, 11.2, 12.17, 12.75, R); shelf(ctx, 11.4, 13.4, 12.17, 12.75, R);
  // a clothesline of sheets across the west half
  paint(ctx, "oklch(0.8 0.02 80)", null, 0.9); rod(ctx, [-5.85, 2.3, 20.2], [3.6, 2.3, 20.2], 0.005, 3);
  paint(ctx, "oklch(0.96 0.01 90)", null, 0.95);
  for (const [a, b] of [[-5.0, -3.6], [-3.3, -2.0], [-0.6, 0.8], [1.6, 3.0]]) { const pts = []; for (let i = 0; i <= 6; i++) pts.push(a + (b - a) * (i / 6));
    for (let i = 0; i < 6; i++) { const w0 = Math.sin(i * 1.7) * 0.05, w1 = Math.sin((i + 1) * 1.7) * 0.05;
      face(ctx, [pts[i], 1.0, 20.2 + w0], [pts[i + 1], 1.0, 20.2 + w1], [pts[i + 1], 2.3, 20.2], [pts[i], 2.3, 20.2], [0, 0, -1]);
      face(ctx, [pts[i + 1], 1.0, 20.2 + w1], [pts[i], 1.0, 20.2 + w0], [pts[i], 2.3, 20.2], [pts[i + 1], 2.3, 20.2], [0, 0, 1]); } }
  for (const x of [-2, 6, 14]) tubeLight(ctx, x, 18);
}

// ---------- the mahjong table (local) ----------
function mahjong(ctx) {
  // a small fanciful lacquer table: gilt cabriole legs, carved apron, green baize
  GILT(ctx);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tube(ctx, [[sx * 0.36, 0.0, sz * 0.36], [sx * 0.43, 0.12, sz * 0.43], [sx * 0.35, 0.4, sz * 0.35], [sx * 0.4, 0.66, sz * 0.4]], [0.025, 0.03, 0.022, 0.035], 8);
  paint(ctx, "oklch(0.22 0.07 25)", null, 0.12, 0.1); rbox(ctx, -0.46, 0.46, 0.6, 0.7, -0.46, 0.46, 0.02);
  GILT(ctx); for (let k = 0; k < 4; k++) { const q = k; qbox(ctx, 0, 0, q, -0.3, 0.3, 0.6, 0.63, -0.475, -0.46, 0.005); }
  paint(ctx, "oklch(0.22 0.07 25)", null, 0.12, 0.1); rbox(ctx, -0.5, 0.5, 0.7, 0.74, -0.5, 0.5, 0.015);
  paint(ctx, "oklch(0.4 0.1 160)", "cdn/texture-green-baize-felt.png", 0.95); box(ctx, -0.44, 0.44, 0.74, 0.744, -0.44, 0.44);
  const Y = 0.744, tw = 0.026, td = 0.019, th = 0.035, R = rng(888);
  const tile = (x, z, q, up, face = true) => { // up: standing; else lying face-up (face) or face-down
    paint(ctx, "oklch(0.95 0.025 90)", null, 0.25);
    if (up) { qbox(ctx, x, z, q, -tw / 2, tw / 2, Y, Y + th, -td / 2, td / 2 - 0.006, 0.003); paint(ctx, "oklch(0.55 0.13 150)", null, 0.3); qbox(ctx, x, z, q, -tw / 2, tw / 2, Y, Y + th, td / 2 - 0.006, td / 2, 0); }
    else { if (face) { qbox(ctx, x, z, q, -tw / 2, tw / 2, Y, Y + td, -th / 2, th / 2, 0.003); paint(ctx, ["oklch(0.5 0.18 25)", "oklch(0.45 0.13 150)", "oklch(0.35 0.12 260)", "oklch(0.2 0 0)"][(R() * 4) | 0], null, 0.4); qbox(ctx, x, z, q, -0.007, 0.007, Y + td, Y + td + 0.001, -0.012, 0.012, 0); }
      else { paint(ctx, "oklch(0.55 0.13 150)", null, 0.3); qbox(ctx, x, z, q, -tw / 2, tw / 2, Y, Y + td, -th / 2, th / 2, 0.003); } } };
  // the wall: a square of face-down tiles two high, broken where the deal was taken
  for (let side = 0; side < 4; side++) for (let i = 0; i < 12; i++) { if (side === 1 && i > 3 && i < 9) continue; const t = -0.155 + i * tw * 1.0;
    const pos = [[t, -0.2], [0.2, t], [-t, 0.2], [-0.2, -t]][side]; tile(pos[0], pos[1], side, false, false); }
  // four hands standing toward their seats, one of them fanned open (the player who left mid-turn)
  for (let side = 0; side < 4; side++) for (let i = 0; i < 13; i++) { const t = -0.17 + i * (tw + 0.001); const pos = [[t, -0.37], [0.37, t], [-t, 0.37], [-0.37, -t]][side];
    if (side === 2) tile(pos[0], pos[1], side, false, true); else tile(pos[0], pos[1], side, true); }
  // discards scattered face-up in the middle
  for (let i = 0; i < 18; i++) tile(-0.11 + (i % 6) * 0.04, -0.07 + ((i / 6) | 0) * 0.05, (R() * 4) | 0, false, true);
  // dice, a drink each, an ashtray with a cigarette still burning
  paint(ctx, "oklch(0.97 0.01 90)", null, 0.3); rbox(ctx, 0.08, 0.1, Y, Y + 0.02, 0.08, 0.1, 0.004); rbox(ctx, 0.12, 0.14, Y, Y + 0.02, 0.06, 0.08, 0.004);
  coupe(ctx, 0.42, 0.74, -0.42, 0.6); coupe(ctx, -0.42, 0.74, 0.42, 0.25);
  GLASS(ctx); lathe(ctx, 0.42, 0.42, [[0.74, 0.001], [0.74, 0.03], [0.85, 0.032], [0.85, 0.028], [0.75, 0.026]], 10); paint(ctx, "oklch(0.6 0.13 55)", null, 0.05); lathe(ctx, 0.42, 0.42, [[0.75, 0.025], [0.8, 0.027], [0.8, 0.001]], 10);
  paint(ctx, "oklch(0.7 0.06 80)", null, 0.2, 0.8); lathe(ctx, -0.42, -0.42, [[0.74, 0.04], [0.755, 0.045], [0.76, 0.035], [0.75, 0.03]], 12);
  paint(ctx, "oklch(0.95 0.01 90)", null, 0.8); rod(ctx, [-0.42, 0.758, -0.42], [-0.34, 0.762, -0.4], 0.004, 5);
  paint(ctx, "oklch(0.7 0.18 40)", null, 0.5, 0, "oklch(0.7 0.2 40)"); sphere(ctx, [-0.338, 0.762, -0.4], 0.005, 5);
  // four gilt stools, one pushed back
  for (let s = 0; s < 4; s++) { const a = s * 1.5708 - 1.5708, r = s === 2 ? 0.95 : 0.7; chair(ctx, Math.cos(a) * r, Math.sin(a) * r, Math.atan2(-Math.cos(a), Math.sin(a)) + (s === 2 ? 0.5 : 0)); }
}

// ---------- containers (local, front -Z) ----------
function locker(ctx) {
  STEEL(ctx, "oklch(0.5 0.05 150)"); rbox(ctx, -0.45, 0.45, 0, 1.9, -0.25, 0.25, 0.015);
  paint(ctx, "oklch(0.45 0.05 150)", "cdn/texture-scratched-worn-steel.png", 0.5, 0.6);
  for (const sx of [-1, 1]) { rbox(ctx, sx > 0 ? 0.01 : -0.43, sx > 0 ? 0.43 : -0.01, 0.08, 1.85, -0.27, -0.25, 0.006);
    paint(ctx, "oklch(0.2 0.01 250)", null, 0.6); for (let k = 0; k < 5; k++) box(ctx, sx * 0.22 - 0.12, sx * 0.22 + 0.12, 1.55 + k * 0.045, 1.57 + k * 0.045, -0.275, -0.27);
    STEEL(ctx, "oklch(0.75 0.01 250)"); rbox(ctx, sx * 0.04 - 0.012, sx * 0.04 + 0.012, 0.9, 1.1, -0.3, -0.27, 0.004); paint(ctx, "oklch(0.45 0.05 150)", "cdn/texture-scratched-worn-steel.png", 0.5, 0.6); }
  paint(ctx, "oklch(0.95 0.02 90)", null, 0.9); box(ctx, -0.35, -0.1, 1.3, 1.42, -0.275, -0.272);
}
function linencart(ctx) {
  STEEL(ctx, "oklch(0.7 0.01 240)"); for (const [x, z] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]]) { rod(ctx, [x, 0.12, z], [x, 0.85, z], 0.012, 5); paint(ctx, "oklch(0.15 0 0)", null, 0.8); tube(ctx, [[x - 0.02, 0.06, z], [x + 0.02, 0.06, z]], [0.06, 0.06], 10, [1, 1], 0, 1, 1); STEEL(ctx, "oklch(0.7 0.01 240)"); }
  for (const y of [0.15, 0.85]) tube(ctx, rrect(-0.5, 0.5, -0.32, 0.32, 0.04, 2).map(([x, z]) => [x, y, z]).concat([[0.5, y, 0.28]]), Array(13).fill(0.012), 5, [1, 1], 0, 1, 1);
  paint(ctx, "oklch(0.6 0.04 240)", "cdn/texture-olive-canvas-cloth.png", 0.95);
  loft(ctx, [{ y: 0.17, pts: rrect(-0.46, 0.46, -0.28, 0.28, 0.08) }, { y: 0.84, pts: rrect(-0.49, 0.49, -0.31, 0.31, 0.06) }], false);
  paint(ctx, "oklch(0.95 0.01 90)", null, 0.95); for (const [x, z, r] of [[-0.2, -0.05, 0.3], [0.2, 0.08, 0.28], [0.0, -0.1, 0.25]]) sphere(ctx, [x, 0.82, z], r, 8, [1, 0.45, 0.8]);
}
function barcart(ctx) {
  BRASS(ctx); for (const [x, z] of [[-0.38, -0.22], [0.38, -0.22], [-0.38, 0.22], [0.38, 0.22]]) rod(ctx, [x, 0.1, z], [x, 0.85, z], 0.012, 6);
  tube(ctx, [[0.42, 0.85, -0.22], [0.52, 0.9, -0.22], [0.52, 0.9, 0.22], [0.42, 0.85, 0.22]], [0.012, 0.012, 0.012, 0.012], 6);
  for (const [x, z] of [[-0.38, -0.22], [-0.38, 0.22]]) { paint(ctx, "oklch(0.15 0 0)", null, 0.6); tube(ctx, [[x, 0.1, z - 0.02], [x, 0.1, z + 0.02]], [0.1, 0.1], 14, [1, 1], 0, 1, 1); BRASS(ctx); }
  GLASS(ctx); for (const y of [0.35, 0.8]) rbox(ctx, -0.4, 0.4, y, y + 0.015, -0.24, 0.24, 0.01);
  for (let k = 0; k < 4; k++) { paint(ctx, ["oklch(0.6 0.13 60)", "oklch(0.9 0.02 90)", "oklch(0.4 0.13 25)", "oklch(0.45 0.1 150)"][k], null, 0.05, 0.3); lathe(ctx, -0.25 + k * 0.16, 0.06 * (k % 2 ? 1 : -1), [[0.815, 0.001], [0.815, 0.045], [1.0, 0.045], [1.05, 0.018], [1.12, 0.016], [1.12, 0.001]], 10); }
  coupe(ctx, 0.25, 0.365, 0.1, 0); coupe(ctx, 0.1, 0.365, -0.08, 0); SILVER(ctx); lathe(ctx, -0.2, 0.0, [[0.365, 0.07], [0.38, 0.075], [0.5, 0.09], [0.52, 0.095], [0.51, 0.085]], 14);
  paint(ctx, "oklch(0.92 0.02 220)", null, 0.1, 0.1); for (let k = 0; k < 3; k++) rbox(ctx, -0.25 + k * 0.04, -0.21 + k * 0.04, 0.48, 0.51, -0.03, 0.01, 0.006);
}
function coatcheck(ctx) {
  WOOD(ctx, 0.3); rbox(ctx, -0.9, 0.9, 0, 1.0, -0.3, 0.3, 0.02);
  paint(ctx, "oklch(0.2 0.04 30)", null, 0.2); rbox(ctx, -0.98, 0.98, 1.0, 1.06, -0.36, 0.36, 0.02);
  WOOD(ctx, 0.36); for (let k = 0; k < 3; k++) rbox(ctx, -0.8 + k * 0.55, -0.35 + k * 0.55, 0.15, 0.85, -0.32, -0.3, 0.01);
  BRASS(ctx); lathe(ctx, 0.5, -0.1, [[1.06, 0.05], [1.08, 0.05], [1.12, 0.012], [1.13, 0.02], [1.14, 0.001]], 12); // a bell
  paint(ctx, "oklch(0.85 0.04 85)", null, 0.6); for (let k = 0; k < 4; k++) rbox(ctx, -0.6 + k * 0.08, -0.55 + k * 0.08, 1.06, 1.065, -0.2, -0.12, 0.003); // claim tickets
  paint(ctx, "oklch(0.2 0.02 20)", "cdn/texture-wool-felt-coat-fabric.png", 0.9); sphere(ctx, [-0.2, 1.12, 0.05], 0.18, 8, [1.4, 0.35, 0.8]); // a fur stole left on the counter
}
function sideboard(ctx) {
  WOOD(ctx, 0.33); rbox(ctx, -1.0, 1.0, 0.12, 0.9, -0.28, 0.28, 0.02); for (const x of [-0.95, 0.95]) for (const z of [-0.22, 0.22]) tube(ctx, [[x, 0, z], [x, 0.06, z], [x, 0.12, z]], [0.03, 0.04, 0.035], 8);
  WOOD(ctx, 0.4); for (let k = 0; k < 4; k++) rbox(ctx, -0.95 + k * 0.48, -0.53 + k * 0.48, 0.2, 0.82, -0.3, -0.28, 0.01);
  BRASS(ctx); for (let k = 0; k < 4; k++) sphere(ctx, [-0.74 + k * 0.48, 0.55, -0.31], 0.015, 6);
  LINEN(ctx); rbox(ctx, -1.02, 1.02, 0.9, 0.92, -0.3, 0.3, 0.005);
  SILVER(ctx); for (const x of [-0.5, 0.35]) { lathe(ctx, x, 0, [[0.92, 0.2], [0.98, 0.22], [1.04, 0.22], [1.04, 0.2]], 18); lathe(ctx, x, 0, [[1.04, 0.21], [1.14, 0.19], [1.2, 0.08], [1.22, 0.03], [1.25, 0.001]], 18); }
  paint(ctx, "oklch(0.97 0.005 90)", null, 0.25); for (let k = 0; k < 6; k++) lathe(ctx, 0.85, 0.05, [[0.92 + k * 0.012, 0.11], [0.93 + k * 0.012, 0.12], [0.93 + k * 0.012, 0.001]], 14);
}
function instcase(ctx) {
  paint(ctx, "oklch(0.2 0.02 40)", "cdn/texture-worn-leather.png", 0.6); rbox(ctx, -0.42, 0.42, 0, 0.16, -0.18, 0.18, 0.05);
  BRASS(ctx); for (const x of [-0.25, 0.25]) rbox(ctx, x - 0.03, x + 0.03, 0.06, 0.12, -0.19, -0.175, 0.005); tube(ctx, [[-0.08, 0.08, -0.19], [-0.06, 0.1, -0.24], [0.06, 0.1, -0.24], [0.08, 0.08, -0.19]], [0.01, 0.01, 0.01, 0.01], 5);
}

const PARTS = { ball: ballroom, salon, hk: housekeeping, mahjong, locker, linencart, barcart, coatcheck, sideboard, instcase };
export function geometry(ctx) {
  const p = ctx.params?.part ?? "ball";
  if (p === "chandelier") return chandelier(ctx, ctx.params.size ?? 1);
  PARTS[p]?.(ctx);
}
// what a body touches: the big furniture only (chairs, glasses, cloths of the dressing are passed through)
export function collider(ctx) {
  const p = ctx.params?.part ?? "ball";
  if (p === "ball") {
    for (const [x, z] of TABLES) prism(ctx, circ(x, z, 0.95, 12), 0, 0.77);
    prism(ctx, circ(15.0, 3.4, 0.68, 12), 0, 0.9);
    const st = [[17.85, -11.85]]; for (let k = 0; k <= 8; k++) { const t = (k / 8) * (Math.PI / 2); st.push([17.85 - Math.cos(t) * 5.0, -11.85 + Math.sin(t) * 3.6]); } prism(ctx, st, 0, 0.45);
    box(ctx, 13.4, 14.4, 0, 0.15, -8.75, -8.2); box(ctx, 13.4, 14.4, 0.15, 0.3, -9.0, -8.45);
    box(ctx, 14.98, 16.45, 0, 0.98, -7.35, -5.85); prism(ctx, circ(15.5, -10.6, 0.28, 10), 0.45, 0.95);
  } else if (p === "salon") {
    box(ctx, 4.4, 7.6, 0, 1.33, -23.85, -23.3);
    box(ctx, 2.95, 3.85, 0, 0.95, -20.5, -18.3); box(ctx, 8.15, 9.05, 0, 0.95, -20.5, -18.3); box(ctx, 5.2, 6.8, 0, 0.95, -17.15, -16.25);
    box(ctx, 5.2, 6.8, 0, 0.44, -20.0, -18.9); prism(ctx, circ(1.4, -15.0, 0.64, 12), 0, 0.77); box(ctx, 12.2, 13.0, 0, 0.9, -23.4, -22.6);
  } else if (p === "hk") {
    box(ctx, -5.6, -0.65, 0, 1.55, 22.75, 23.8); box(ctx, 0.4, 2.6, 0, 0.9, 22.9, 23.7); box(ctx, 6.2, 9.9, 0, 0.76, 19.2, 19.95);
    box(ctx, -5.8, -3.85, 0, 0.45, 13.5, 17.5); box(ctx, 9.2, 13.4, 0, 2.1, 12.17, 12.75);
  } else if (p === "mahjong") box(ctx, -0.5, 0.5, 0, 0.74, -0.5, 0.5);
}
