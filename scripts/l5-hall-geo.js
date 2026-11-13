// Level 5 Main Hall furniture: one script, one piece per params.kind (front faces -Z, back to the wall at +Z, feet at the origin).
// Every piece is turned, bevelled, tufted and textured; collider() hands back a few boxes a body bumps.
import { paint, q, t3, bx, lathe, ball, pipe, path, sheet, turned, cabriole, knob, box } from "./lib/l5-hall-kit.js";
const rng = (seed) => { let s = (seed * 2654435761) >>> 0 || 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const WOOD = (c, t = "mahog") => paint(c, t === "walnut" ? "oklch(0.95 0.02 60)" : t === "oak" ? "oklch(0.9 0.03 70)" : "oklch(0.95 0.02 35)", t, 0.42);
const BRASS = (c) => paint(c, "oklch(0.92 0.1 85)", "brass", 0.3, 0.9);
const GILT = (c) => paint(c, "oklch(0.93 0.1 85)", "gilt", 0.38, 0.75);
const CLOTH = (c, col, t) => paint(c, col, t, 0.9);
const PI = Math.PI;
// a raised panel set into a face at z = zf (front -Z)
function rpanel(c, x0, x1, y0, y1, zf, m = 0.03) {
  bx(c, x0, x1, y1 - m, y1, zf - 0.012, zf, 0.004); bx(c, x0, x1, y0, y0 + m, zf - 0.012, zf, 0.004);
  bx(c, x0, x0 + m, y0 + m, y1 - m, zf - 0.012, zf, 0.004); bx(c, x1 - m, x1, y0 + m, y1 - m, zf - 0.012, zf, 0.004);
  if (c.lod < 3) bx(c, x0 + m + 0.012, x1 - m - 0.012, y0 + m + 0.012, y1 - m - 0.012, zf - 0.018, zf, 0.012);
}
function drawer(c, x0, x1, y0, y1, zf, wood, pulls = 2) {
  WOOD(c, wood); bx(c, x0, x1, y0, y1, zf - 0.022, zf + 0.01, 0.008);
  if (c.lod < 3 && x1 - x0 > 0.25) bx(c, x0 + 0.03, x1 - 0.03, y0 + 0.025, y1 - 0.025, zf - 0.028, zf - 0.02, 0.006);
  BRASS(c); const ym = (y0 + y1) / 2;
  if (pulls === 1) knob(c, (x0 + x1) / 2, ym, zf - 0.028, 0.016);
  else for (const f of [0.25, 0.75]) { const x = x0 + (x1 - x0) * f; path(c, [[x - 0.045, ym + 0.01, zf - 0.03], [x - 0.04, ym - 0.012, zf - 0.045], [x + 0.04, ym - 0.012, zf - 0.045], [x + 0.045, ym + 0.01, zf - 0.03]], 0.005, 5); bx(c, x - 0.06, x + 0.06, ym - 0.004, ym + 0.022, zf - 0.031, zf - 0.027, 0.002); }
}
const ell = (rx, ry, N = 14) => { const p = []; for (let i = 0; i <= N; i++) { const a = -PI / 2 + (i / N) * PI; p.push([Math.cos(a) * rx, Math.sin(a) * ry + ry]); } p[0][0] = 0; p[N][0] = 0; return p; };
const puff = (c, x, y, z, ax, ay, az, M = 14) => lathe(c, x, y - ay, z, ell(1, ay, 10), M, true, ax, az);
// chesterfield tufting: a diamond-creased sheet, buttons in the creases
function tufted(c, x0, x1, y0, y1, z, nx, D, fz = -1) {
  const ny = Math.max(2, Math.round(nx * (y1 - y0) / (x1 - x0) * 1.6)), res = c.lod >= 2 ? 3 : 5;
  sheet(c, (u, v) => { const U = u * nx, V = v * ny, b = Math.sqrt(Math.abs(Math.sin(PI * (U + V) / 2) * Math.sin(PI * (U - V) / 2))); const e = Math.sin(PI * u) * Math.sin(PI * v); return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * v, z + fz * D * b * (0.4 + 0.6 * Math.sqrt(e))]; }, nx * res, ny * res, () => [0, 0, fz]);
  if (c.lod >= 2) return;
  const cc = c; paint(cc, "oklch(0.3 0.06 30)", null, 0.5);
  for (let i = 1; i < nx; i++) for (let j = 1; j < ny; j++) if ((i + j) % 2 === 0) ball(cc, x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, z + fz * 0.004, 0.011, 6);
}
function nailheads(c, a, b, n) { BRASS(c); for (let i = 0; i <= n; i++) { const f = i / n; ball(c, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, 0.008, 5); } }
// ---------- seating ----------
function sofa(c, p) {
  const w = p.w ?? 2.1, d = 0.9, h = 0.78, up = p.up ?? "leather", col = p.col ?? (up === "leather" ? "oklch(0.78 0.08 32)" : "oklch(0.85 0.06 25)");
  const U = () => CLOTH(c, col, up), hw = w / 2, z0 = -d / 2, z1 = d / 2;
  WOOD(c); for (const x of [-hw + 0.08, hw - 0.08]) for (const z of [z0 + 0.08, z1 - 0.08]) puff(c, x, 0.05, z, 0.05, 0.05, 0.05, 10);
  U(); bx(c, -hw, hw, 0.1, 0.42, z0 + 0.03, z1, 0.03);
  // arms with the roll on top and scroll faces
  for (const s of [-1, 1]) {
    const xa = s * (hw - 0.11); U(); bx(c, xa - 0.11, xa + 0.11, 0.36, 0.66, z0, z1 - 0.02, 0.02);
    pipe(c, [xa, 0.66, z0 - 0.005], [xa, 0.66, z1 - 0.03], 0.125, 14);
    if (c.lod < 2) nailheads(c, [xa - 0.11, 0.42, z0 - 0.006], [xa + 0.11, 0.42, z0 - 0.006], 8);
    if (c.lod < 3) { U(); tufted(c, xa - 0.1, xa + 0.1, 0.43, 0.64, z0 - 0.002, 2, 0.02); }
  }
  // back: frame, top roll, tufted face
  U(); bx(c, -hw + 0.1, hw - 0.1, 0.4, h - 0.06, z1 - 0.2, z1, 0.02);
  pipe(c, [-hw + 0.12, h - 0.06, z1 - 0.11], [hw - 0.12, h - 0.06, z1 - 0.11], 0.11, 14);
  tufted(c, -hw + 0.22, hw - 0.22, 0.52, h - 0.08, z1 - 0.2, Math.max(2, Math.round(w * 4)), 0.035);
  // seat cushions
  const n = w > 1.4 ? 2 : 1, sx0 = -hw + 0.22, sw = (w - 0.44) / n;
  for (let i = 0; i < n; i++) { U(); bx(c, sx0 + sw * i + 0.005, sx0 + sw * (i + 1) - 0.005, 0.42, 0.55, z0 - 0.01, z1 - 0.2, 0.05); }
  if (c.lod < 2) nailheads(c, [-hw + 0.2, 0.14, z0 + 0.025], [hw - 0.2, 0.14, z0 + 0.025], Math.round(w * 22));
}
function chair(c, p) { // dining / desk chair: turned legs, stuffed seat, fiddle-back splat, curved crest
  const w = 0.46, d = 0.46, wood = p.wood ?? "mahog";
  WOOD(c, wood); for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) { turned(c, x, -d / 2 + 0.03, 0, 0.44, 0.024); pipe(c, [x, 0, d / 2 - 0.03], [x, 0.44, d / 2 - 0.02], 0.02, 8); pipe(c, [x, 0.44, d / 2 - 0.02], [x * 0.95, 0.98, d / 2 + 0.03], 0.02, 8); ball(c, x * 0.95, 0.99, d / 2 + 0.03, 0.026, 8); }
  bx(c, -w / 2, w / 2, 0.36, 0.44, -d / 2, d / 2, 0.01);
  for (const s of [-1, 1]) pipe(c, [-w / 2 + 0.03, 0.12, s * (d / 2 - 0.03)], [w / 2 - 0.03, 0.12, s * (d / 2 - 0.03)], 0.012, 6);
  CLOTH(c, p.col ?? "oklch(0.8 0.08 25)", p.up ?? "velvet"); bx(c, -w / 2 + 0.01, w / 2 - 0.01, 0.44, 0.5, -d / 2 + 0.005, d / 2 - 0.03, 0.03);
  WOOD(c, wood); const crest = (u, v) => [(u - 0.5) * (w - 0.04), 0.86 + v * 0.1 + Math.sin(PI * u) * 0.03, d / 2 + 0.025 + Math.sin(PI * u) * 0.025];
  sheet(c, crest, 8, 1, () => [0, 0, -1]); sheet(c, (u, v) => { const a = crest(u, v); return [a[0], a[1], a[2] + 0.025]; }, 8, 1, () => [0, 0, 1]);
  sheet(c, (u, v) => { const y = 0.5 + v * 0.38, wv = 0.06 + 0.05 * Math.sin(PI * v * 1.2) + 0.03 * Math.sin(PI * v * 2.4); return [(u - 0.5) * 2 * wv, y, d / 2 - 0.0 + 0.03 * v]; }, 2, 8, () => [0, 0, -1]);
}
function stool(c, p) { WOOD(c); for (let i = 0; i < 4; i++) { const a = PI / 4 + i * PI / 2; cabriole(c, Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0, 0.4, 0.016, Math.cos(a), Math.sin(a)); } CLOTH(c, p.col ?? "oklch(0.86 0.06 350)", "velvet"); lathe(c, 0, 0.38, 0, [[0, 0], [0.2, 0], [0.21, 0.04], [0.19, 0.08], [0, 0.09]], 18); }
// ---------- tables ----------
function rtable(c, p) { // the lobby's round pedestal table with an orchid bowl
  const r = p.r ?? 0.6; WOOD(c);
  lathe(c, 0, 0.72, 0, [[0, 0], [r - 0.02, 0], [r, 0.02], [r, 0.04], [r - 0.015, 0.05], [0, 0.05]], 28);
  lathe(c, 0, 0, 0, [[0, 0.12], [0.1, 0.12], [0.07, 0.2], [0.05, 0.45], [0.09, 0.5], [0.06, 0.58], [0.05, 0.68], [0.12, 0.72], [0, 0.72]], 14);
  for (let i = 0; i < 3; i++) { const a = i * 2 * PI / 3, ca = Math.cos(a), sa = Math.sin(a); path(c, [[ca * 0.06, 0.18, sa * 0.06], [ca * 0.25, 0.12, sa * 0.25], [ca * 0.4, 0.04, sa * 0.4], [ca * 0.44, 0.02, sa * 0.44]], 0.028, 7); BRASS(c); ball(c, ca * 0.45, 0.02, sa * 0.45, 0.022, 8); WOOD(c); }
  if (p.orchid !== false) {
    paint(c, "oklch(0.92 0.02 250)", "ceramic", 0.25); lathe(c, 0, 0.77, 0, [[0, 0], [0.08, 0], [0.18, 0.08], [0.2, 0.14], [0.18, 0.15], [0, 0.15]], 18);
    paint(c, "oklch(0.35 0.05 60)", "soil"); lathe(c, 0, 0.9, 0, [[0, 0], [0.17, 0], [0, 0.01]], 14);
    const R = rng(3);
    for (let k = 0; k < 5; k++) { const a = k * 1.3, s = [Math.cos(a) * 0.05, 0.9, Math.sin(a) * 0.05], top = [Math.cos(a) * 0.16, 1.32 + R() * 0.12, Math.sin(a) * 0.16];
      paint(c, "oklch(0.45 0.08 130)"); path(c, [s, [s[0] * 1.5, 1.15, s[2] * 1.5], top], 0.004, 4);
      paint(c, "oklch(0.95 0.03 340)", null, 0.6); for (let f = 0; f < 4; f++) { const t = f / 4, fx = top[0] + Math.cos(a) * 0.06 * f, fy = top[1] - t * t * 0.08, fz = top[2] + Math.sin(a) * 0.06 * f; for (let pt = 0; pt < 5; pt++) { const b = pt * 2 * PI / 5; t3(c, [fx, fy, fz], [fx + Math.cos(b) * 0.03, fy + Math.sin(b) * 0.03, fz + 0.005], [fx + Math.cos(b + 0.6) * 0.03, fy + Math.sin(b + 0.6) * 0.03, fz + 0.005], [0, 0, -1]); } }
    }
    paint(c, "oklch(0.42 0.1 140)", null, 0.5); for (let k = 0; k < 4; k++) { const a = k * PI / 2 + 0.4; sheet(c, (u, v) => [Math.cos(a) * (0.02 + u * 0.24) + Math.sin(a) * (v - 0.5) * 0.08 * Math.sin(PI * u), 0.92 + Math.sin(PI * u * 0.8) * 0.06 - u * u * 0.05, Math.sin(a) * (0.02 + u * 0.24) - Math.cos(a) * (v - 0.5) * 0.08 * Math.sin(PI * u)], 6, 1, () => [0, 1, 0]); }
  }
}
function ctable(c, p) { const w = p.w ?? 1.2, d = p.d ?? 0.6; WOOD(c); lathe(c, 0, 0.42, 0, [[0, 0], [1, 0], [1.02, 0.02], [1, 0.045], [0, 0.045]], 28, false, w / 2, d / 2); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cabriole(c, x * (w / 2 - 0.12), z * (d / 2 - 0.08), 0, 0.42, 0.022, x * 0.7, z * 0.7);
  if (p.deco !== false) { paint(c, "oklch(0.75 0.08 30)", "leather"); bx(c, -0.25, 0.05, 0.465, 0.5, -0.1, 0.12, 0.004); paint(c, "oklch(0.7 0.08 250)", "leather"); bx(c, -0.22, 0.03, 0.5, 0.53, -0.08, 0.1, 0.004); paint(c, "oklch(0.95 0.01 90)", "ceramic", 0.2); lathe(c, 0.3, 0.465, 0, [[0, 0], [0.09, 0], [0.11, 0.025], [0, 0.02]], 14); } }
function sidetable(c, p) {
  const w = 0.5, d = 0.4, h = p.h ?? 0.68; WOOD(c, p.wood);
  bx(c, -w / 2, w / 2, h - 0.03, h, -d / 2, d / 2, 0.012); bx(c, -w / 2 + 0.03, w / 2 - 0.03, h - 0.12, h - 0.03, -d / 2 + 0.03, d / 2 - 0.03, 0.006);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turned(c, x * (w / 2 - 0.045), z * (d / 2 - 0.045), 0, h - 0.03, 0.022);
  bx(c, -w / 2 + 0.04, w / 2 - 0.04, 0.16, 0.18, -d / 2 + 0.04, d / 2 - 0.04, 0.004);
  deco(c, p.deco, 0, h, 0, p.seed ?? 1);
}
function deco(c, kind, x, y, z, seed) {
  if (!kind) return;
  if (kind === "lamp") { BRASS(c); lathe(c, x, y, z, [[0, 0], [0.08, 0], [0.08, 0.02], [0.03, 0.04], [0.02, 0.3], [0.035, 0.32], [0.012, 0.36], [0, 0.36]], 12);
    paint(c, "oklch(0.92 0.06 80)", "paper", 0.9, 0, "oklch(0.75 0.11 70)"); lathe(c, x, y + 0.26, z, [[0.14, 0], [0.155, 0.01], [0.08, 0.2], [0.07, 0.21]], 18, false);
    lathe(c, x, y + 0.26, z, [[0.07, 0.21], [0.08, 0.2], [0.155, 0.01], [0.14, 0]], 18, false); }
  if (kind === "vase") { paint(c, "oklch(0.93 0.02 240)", "ceramic", 0.2); lathe(c, x, y, z, [[0, 0], [0.06, 0], [0.11, 0.08], [0.1, 0.2], [0.05, 0.3], [0.045, 0.34], [0.065, 0.37], [0.055, 0.38], [0, 0.36]], 16);
    const R = rng(seed); for (let k = 0; k < 7; k++) { const a = R() * 6.28, l = 0.25 + R() * 0.2, tip = [x + Math.cos(a) * l * 0.5, y + 0.36 + l, z + Math.sin(a) * l * 0.5]; paint(c, "oklch(0.5 0.05 90)"); path(c, [[x, y + 0.3, z], [x + Math.cos(a) * 0.05, y + 0.45, z + Math.sin(a) * 0.05], tip], 0.004, 4); paint(c, k % 2 ? "oklch(0.55 0.1 20)" : "oklch(0.72 0.08 60)", null, 0.8); ball(c, ...tip, 0.035, 7, 0.8); } }
  if (kind === "tea") tea(c, x, y, z, true);
  if (kind === "book") { paint(c, "oklch(0.55 0.1 145)", "leather"); bx(c, x - 0.1, x + 0.06, y, y + 0.035, z - 0.12, z + 0.1, 0.006); paint(c, "oklch(0.95 0.03 90)", "paper"); bx(c, x - 0.095, x + 0.05, y + 0.005, y + 0.03, z - 0.115, z + 0.095, 0.002); }
  if (kind === "clock") { WOOD(c); bx(c, x - 0.08, x + 0.08, y, y + 0.17, z - 0.04, z + 0.04, 0.02); paint(c, "oklch(0.95 0.02 90)", "paper", 0.5); lathe(c, x, y + 0.1, z - 0.041, [[0, 0], [0.055, 0]], 16); }
}
function tea(c, x, y, z, pot) {
  paint(c, "oklch(0.96 0.01 240)", "ceramic", 0.15);
  lathe(c, x, y, z, [[0, 0], [0.07, 0], [0.075, 0.008], [0, 0.006]], 18);
  lathe(c, x, y + 0.006, z, [[0, 0], [0.025, 0], [0.04, 0.03], [0.045, 0.06], [0.041, 0.06], [0.036, 0.03], [0, 0.048]], 16);
  path(c, [[x + 0.04, y + 0.05, z], [x + 0.07, y + 0.045, z], [x + 0.065, y + 0.02, z], [x + 0.035, y + 0.02, z]], 0.005, 5);
  paint(c, "oklch(0.38 0.07 50)", null, 0.05); lathe(c, x, y + 0.05, z, [[0, 0], [0.039, 0]], 14); // the tea, cold, a skin on it
  if (pot) { paint(c, "oklch(0.96 0.01 240)", "ceramic", 0.15); lathe(c, x - 0.2, y, z + 0.02, [[0, 0], [0.06, 0], [0.09, 0.05], [0.085, 0.11], [0.04, 0.14], [0.02, 0.14], [0.03, 0.155], [0, 0.17]], 16); pipe(c, [x - 0.14, y + 0.05, z + 0.02], [x - 0.08, y + 0.13, z + 0.02], 0.016, 8, 0.008); path(c, [[x - 0.28, y + 0.11, z + 0.02], [x - 0.31, y + 0.1, z + 0.02], [x - 0.31, y + 0.04, z + 0.02], [x - 0.28, y + 0.04, z + 0.02]], 0.008, 5); }
}
// ---------- casework ----------
function wardrobe(c, p) {
  const w = p.w ?? 1.1, d = 0.58, h = 2.05, wood = p.wood ?? "mahog", hw = w / 2, zf = -d / 2;
  const paintC = () => p.style === "pantry" ? paint(c, "oklch(0.9 0.04 95)", "enamel", 0.6) : WOOD(c, wood);
  paintC(); bx(c, -hw, hw, 0.12, h - 0.12, zf, d / 2, 0.01); // carcass
  bx(c, -hw - 0.02, hw + 0.02, 0.06, 0.14, zf - 0.02, d / 2, 0.01); // plinth
  bx(c, -hw - 0.02, hw + 0.02, h - 0.12, h - 0.06, zf - 0.025, d / 2, 0.012); bx(c, -hw - 0.05, hw + 0.05, h - 0.06, h, zf - 0.05, d / 2, 0.015); // cornice steps
  for (const x of [-hw + 0.06, hw - 0.06]) { WOOD(c, wood); path(c, [[x, 0.0, zf + 0.04], [x + Math.sign(x) * 0.02, 0.03, zf + 0.02], [x, 0.07, zf + 0.03]], 0.03, 7); }
  const dw = (w - 0.06) / 2;
  for (const s of [-1, 1]) { const x0 = s < 0 ? -hw + 0.03 : 0.003, x1 = s < 0 ? -0.003 : hw - 0.03; paintC(); bx(c, x0, x1, 0.2, h - 0.17, zf - 0.02, zf + 0.005, 0.006);
    if (p.style === "mirror" && s > 0) { paint(c, "oklch(0.8 0.01 90)", null, 0.05, 1); bx(c, x0 + 0.06, x1 - 0.06, 0.4, h - 0.32, zf - 0.025, zf - 0.02, 0.002); }
    else { paintC(); rpanel(c, x0 + 0.05, x1 - 0.05, 0.28, 1.0, zf - 0.02); rpanel(c, x0 + 0.05, x1 - 0.05, 1.08, h - 0.25, zf - 0.02); }
    BRASS(c); knob(c, s * 0.04, 1.05, zf - 0.02, 0.016); }
  BRASS(c); bx(c, -0.015, 0.015, 1.12, 1.18, zf - 0.026, zf - 0.02, 0.004);
  void dw;
}
function dresser(c, p) {
  const w = p.w ?? 1.1, d = 0.5, h = 0.86, wood = p.wood ?? "mahog", hw = w / 2, zf = -d / 2;
  WOOD(c, wood); bx(c, -hw, hw, 0.1, h - 0.03, zf, d / 2, 0.01); bx(c, -hw - 0.025, hw + 0.025, h - 0.03, h, zf - 0.025, d / 2 + 0.005, 0.012);
  for (const x of [-hw + 0.06, hw - 0.06]) for (const z of [zf + 0.06, d / 2 - 0.06]) puff(c, x, 0.05, z, 0.045, 0.05, 0.045, 10);
  const rows = [[0.14, 0.34], [0.36, 0.56], [0.58, 0.8]];
  rows.forEach(([y0, y1], i) => { if (i === 2) { drawer(c, -hw + 0.03, -0.005, y0, y1, zf, wood, 1); drawer(c, 0.005, hw - 0.03, y0, y1, zf, wood, 1); } else drawer(c, -hw + 0.03, hw - 0.03, y0, y1, zf, wood); });
  if (p.mirror) { WOOD(c, wood); for (const s of [-1, 1]) { bx(c, s * (hw - 0.12) - 0.025, s * (hw - 0.12) + 0.025, h, h + 0.55, d / 2 - 0.12, d / 2 - 0.06, 0.008); ball(c, s * (hw - 0.12), h + 0.57, d / 2 - 0.09, 0.025, 8); }
    oval(c, 0, h + 0.42, d / 2 - 0.09, 0.3, 0.32); }
  deco(c, p.deco, -hw * 0.5, h, 0, p.seed ?? 2);
}
function oval(c, x, y, z, rx, ry) { // gilt-framed oval mirror facing -Z
  const N = c.lod >= 3 ? 12 : 28, pts = []; for (let i = 0; i <= N; i++) { const a = (i / N) * 2 * PI; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry, z]); }
  GILT(c); for (let i = 0; i < N; i++) pipe(c, pts[i], pts[i + 1], 0.02, 6, 0.02, false);
  paint(c, "oklch(0.78 0.01 90)", null, 0.04, 1); for (let i = 0; i < N; i++) t3(c, [x, y, z + 0.005], [pts[i][0] * 0.98 + x * 0.02, pts[i][1] * 0.98 + y * 0.02, z + 0.005], [pts[i + 1][0] * 0.98 + x * 0.02, pts[i + 1][1] * 0.98 + y * 0.02, z + 0.005], [0, 0, -1]);
}
function nightstand(c, p) {
  const w = 0.48, d = 0.4, h = 0.62, wood = p.wood ?? "mahog", zf = -d / 2; WOOD(c, wood);
  bx(c, -w / 2, w / 2, 0.36, h - 0.02, zf, d / 2, 0.008); bx(c, -w / 2 - 0.015, w / 2 + 0.015, h - 0.025, h, zf - 0.015, d / 2, 0.01);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turned(c, x * (w / 2 - 0.03), z * (d / 2 - 0.03), 0, 0.37, 0.02);
  bx(c, -w / 2 + 0.02, w / 2 - 0.02, 0.1, 0.12, zf + 0.02, d / 2 - 0.02, 0.004);
  drawer(c, -w / 2 + 0.03, w / 2 - 0.03, 0.4, 0.57, zf, wood, 1);
  deco(c, p.deco ?? "lamp", 0.05, h, 0.03, p.seed ?? 4); if (p.extra) deco(c, p.extra, -0.12, h, -0.05, 5);
}
function cabinet(c, p) { // glazed curio cabinet with china
  const w = 1.0, d = 0.45, h = 1.95, hw = w / 2, zf = -d / 2; WOOD(c, p.wood);
  bx(c, -hw, hw, 0.1, 0.9, zf, d / 2, 0.01); drawer(c, -hw + 0.03, hw - 0.03, 0.66, 0.86, zf, p.wood); rpanel(c, -hw + 0.05, -0.02, 0.16, 0.6, zf); rpanel(c, 0.02, hw - 0.05, 0.16, 0.6, zf);
  WOOD(c, p.wood); bx(c, -hw - 0.02, hw + 0.02, 0.9, 0.93, zf - 0.02, d / 2, 0.008);
  bx(c, -hw + 0.02, hw - 0.02, 0.93, h - 0.08, d / 2 - 0.03, d / 2, 0.004); for (const x of [-hw + 0.03, hw - 0.03, 0]) bx(c, x - 0.025, x + 0.025, 0.93, h - 0.08, zf + 0.01, zf + 0.04, 0.006);
  for (const x of [-hw + 0.03, hw - 0.03]) bx(c, x - 0.025, x + 0.025, 0.93, h - 0.08, zf + 0.04, d / 2, 0.006);
  bx(c, -hw - 0.04, hw + 0.04, h - 0.08, h, zf - 0.04, d / 2, 0.015); bx(c, -hw + 0.03, hw - 0.03, 0.08, 0.12, zf + 0.02, d / 2, 0.005);
  for (const y of [1.25, 1.6]) { paint(c, "oklch(0.85 0.01 200)", null, 0.1, 0, null); bx(c, -hw + 0.04, hw - 0.04, y, y + 0.012, zf + 0.05, d / 2 - 0.03, 0.002); }
  const R = rng(p.seed ?? 9);
  for (const y of [0.93, 1.262, 1.612]) for (let k = 0; k < 4; k++) { const x = -0.33 + k * 0.22; paint(c, R() > 0.5 ? "oklch(0.95 0.02 240)" : "oklch(0.92 0.04 60)", "ceramic", 0.2);
    if (R() > 0.4) lathe(c, x, y, 0.02, [[0, 0], [0.04, 0], [0.06, 0.06], [0.03, 0.14], [0.035, 0.18], [0, 0.17]], 12); else { lathe(c, x, y + 0.08, 0.1, [[0, 0], [0.1, 0.0], [0.1, 0.01], [0, 0.005]], 16); } }
  paint(c, "oklch(0.9 0.02 200)", null, 0.03, 0.1); c.color("oklch(0.9 0.02 200)", 0.18); bx(c, -hw + 0.04, hw - 0.04, 0.95, h - 0.1, zf + 0.022, zf + 0.026, 0);
  BRASS(c); knob(c, -0.04, 1.4, zf + 0.01, 0.012); knob(c, 0.04, 1.4, zf + 0.01, 0.012);
}
function bookshelf(c, p) {
  const w = p.w ?? 1.6, d = 0.4, h = p.h ?? 2.2, hw = w / 2, zf = -d / 2, wood = p.wood ?? "walnut", R = rng(p.seed ?? 11);
  WOOD(c, wood); bx(c, -hw, -hw + 0.04, 0.1, h - 0.08, zf, d / 2, 0.006); bx(c, hw - 0.04, hw, 0.1, h - 0.08, zf, d / 2, 0.006); bx(c, -hw, hw, 0.1, h - 0.08, d / 2 - 0.02, d / 2, 0);
  bx(c, -hw - 0.02, hw + 0.02, 0, 0.12, zf - 0.02, d / 2, 0.01); bx(c, -hw - 0.03, hw + 0.03, h - 0.1, h - 0.04, zf - 0.03, d / 2, 0.01); bx(c, -hw - 0.06, hw + 0.06, h - 0.04, h, zf - 0.06, d / 2, 0.015);
  const n = Math.max(3, Math.round((h - 0.3) / 0.38)), sp = (h - 0.25) / n;
  for (let i = 0; i < n; i++) { const y = 0.12 + i * sp; WOOD(c, wood); bx(c, -hw + 0.04, hw - 0.04, y, y + 0.025, zf + 0.005, d / 2 - 0.02, 0.006);
    if (c.lod >= 3) { paint(c, "oklch(0.55 0.08 40)", "leather"); bx(c, -hw + 0.05, hw - 0.05, y + 0.025, y + sp * 0.75, zf + 0.04, d / 2 - 0.04, 0); continue; }
    let x = -hw + 0.05; while (x < hw - 0.08) { const bw = 0.025 + R() * 0.04, bh = sp * (0.55 + R() * 0.32), bd = 0.18 + R() * 0.1; if (R() < 0.07) { x += 0.05 + R() * 0.12; continue; }
      const hue = [25, 40, 145, 250, 60, 15][Math.floor(R() * 6)]; paint(c, `oklch(${0.45 + R() * 0.35} ${0.06 + R() * 0.07} ${hue})`, "leather", 0.7);
      const lean = x > hw - 0.25 && R() < 0.5;
      if (lean) { const a = 0.25; q(c, [x, y + 0.025, zf + 0.05], [x + bw, y + 0.025, zf + 0.05], [x + bw + Math.sin(a) * bh, y + 0.025 + Math.cos(a) * bh, zf + 0.05], [x + Math.sin(a) * bh, y + 0.025 + Math.cos(a) * bh, zf + 0.05], [0, 0, -1]); bx(c, x + 0.002, x + bw + Math.sin(a) * bh, y + 0.025, y + 0.025 + bh * 0.95, zf + 0.055, zf + 0.05 + bd, 0); break; }
      bx(c, x, x + bw - 0.002, y + 0.025, y + 0.025 + bh, zf + 0.04 + (0.28 - bd) * 0.3, zf + 0.04 + bd, 0.003);
      if (c.lod < 2 && R() < 0.5) { GILT(c); bx(c, x + 0.003, x + bw - 0.005, y + 0.025 + bh * 0.75, y + 0.025 + bh * 0.8, zf + 0.037 + (0.28 - bd) * 0.3, zf + 0.04 + (0.28 - bd) * 0.3, 0); }
      x += bw; }
  }
  if (p.rail) { BRASS(c); pipe(c, [-hw, h - 0.25, zf - 0.08], [hw, h - 0.25, zf - 0.08], 0.015, 8); for (const x of [-hw + 0.1, hw - 0.1]) pipe(c, [x, h - 0.25, zf - 0.08], [x, h - 0.25, zf], 0.01, 6); }
}
// ---------- beds ----------
function bed(c, p) {
  const w = p.w ?? 1.4, L = 2.05, hw = w / 2, z0 = -L / 2, z1 = L / 2, wood = p.wood ?? "mahog", qc = p.quilt ?? "oklch(0.86 0.07 20)", qt = p.qtex ?? "quilt";
  WOOD(c, wood); bx(c, -hw, hw, 0.2, 0.42, z0 + 0.05, z1 - 0.06, 0.02);
  CLOTH(c, "oklch(0.97 0.01 90)", "linen"); bx(c, -hw + 0.02, hw - 0.02, 0.42, 0.62, z0 + 0.06, z1 - 0.09, 0.06);
  const zt = z1 - 0.62, top = 0.645, drop = 0.3;
  CLOTH(c, qc, qt);
  sheet(c, (u, v) => [(-hw - 0.03) + (w + 0.06) * u, top + 0.012 * Math.sin(u * PI * 8) * Math.sin(v * PI * 10) + 0.01 * Math.sin(PI * u), z0 + 0.04 + (zt - z0 - 0.04) * v], 16, 12, () => [0, 1, 0]);
  for (const s of [-1, 1]) sheet(c, (u, v) => [s * (hw + 0.03 + v * 0.03) + s * 0.006 * Math.sin(u * 40), top - v * drop, z0 + 0.04 + (zt - z0 - 0.04) * u], 12, 4, () => [s, 0, 0]);
  sheet(c, (u, v) => [(-hw - 0.03 - v * 0.03) + (w + 0.06 + v * 0.06) * u, top - v * drop, z0 + 0.04 - v * 0.03 + 0.006 * Math.sin(u * 30)], 12, 4, () => [0, 0, -1]);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const v0 = i / 4, v1 = (i + 1) / 4, P = (u, v) => [s * (hw + 0.03 + v * 0.03) * (1 - u) + (-hw - 0.03 - v * 0.03) * 0 + s * (hw + 0.03 + v * 0.03) * 0, top - v * drop, z0 + 0.04 - v * 0.03 * (1 - u)]; void P; }
  // the turned-down sheet: a white band folded back over the quilt with a soft roll
  CLOTH(c, "oklch(0.98 0.005 90)", "linen"); sheet(c, (u, v) => [(-hw - 0.03) + (w + 0.06) * u, top + 0.018, zt - 0.32 + 0.32 * v], 10, 3, () => [0, 1, 0]);
  pipe(c, [-hw - 0.03, top + 0.01, zt - 0.32], [hw + 0.03, top + 0.01, zt - 0.32], 0.018, 8);
  sheet(c, (u, v) => [(-hw - 0.01) + (w + 0.02) * u, 0.625, zt + (z1 - 0.1 - zt) * v], 6, 2, () => [0, 1, 0]);
  const np = w > 1.2 ? 2 : 1; for (let i = 0; i < np; i++) { const x = np === 1 ? 0 : (i - 0.5) * (w / 2); CLOTH(c, "oklch(0.98 0.005 90)", "linen"); puff(c, x, 0.7, z1 - 0.3, Math.min(0.32, w / np / 2 - 0.04), 0.075, 0.2, 14); }
  // headboard and footboard by style
  const posts = (z, hh) => { for (const s of [-1, 1]) { WOOD(c, wood); turned(c, s * (hw + 0.02), z, 0, hh, 0.04); ball(c, s * (hw + 0.02), hh + 0.04, z, 0.045, 10); } };
  const style = p.style ?? 0;
  if (style === 1) { BRASS(c); for (const [z, hh] of [[z1 - 0.03, 1.25], [z0 + 0.03, 0.85]]) { for (const s of [-1, 1]) { pipe(c, [s * (hw + 0.02), 0, z], [s * (hw + 0.02), hh, z], 0.025, 10); ball(c, s * (hw + 0.02), hh + 0.03, z, 0.04, 10); }
      const arc = []; for (let i = 0; i <= 12; i++) { const u = i / 12; arc.push([(-hw - 0.02) + (w + 0.04) * u, hh - 0.05 + Math.sin(PI * u) * 0.08, z]); } path(c, arc, 0.016, 6); pipe(c, [-hw, 0.45, z], [hw, 0.45, z], 0.014, 6);
      for (let i = 1; i < 8; i++) { const x = -hw + (w * i) / 8; pipe(c, [x, 0.45, z], [x, hh - 0.05 + Math.sin(PI * i / 8) * 0.08, z], 0.009, 6); } } }
  else { posts(z1 - 0.04, 1.25); posts(z0 + 0.04, 0.8); WOOD(c, wood);
    const arch = (z, y0, hh, rise, th) => { sheet(c, (u, v) => [(-hw + 0.02) + (w - 0.04) * u, y0 + (hh - y0 + Math.sin(PI * u) * rise) * v, z - th], 12, 1, () => [0, 0, -1], false); sheet(c, (u, v) => [(-hw + 0.02) + (w - 0.04) * u, y0 + (hh - y0 + Math.sin(PI * u) * rise) * v, z + th], 12, 1, () => [0, 0, 1], false);
      sheet(c, (u, v) => [(-hw + 0.02) + (w - 0.04) * u, hh + Math.sin(PI * u) * rise, z - th + 2 * th * v], 12, 1, () => [0, 1, 0], false); };
    if (style === 2) { arch(z1 - 0.04, 0.4, 1.1, 0.15, 0.03); CLOTH(c, p.head ?? "oklch(0.8 0.07 160)", "velvet"); tufted(c, -hw + 0.1, hw - 0.1, 0.75, 1.12, z1 - 0.075, Math.round(w * 4), 0.03); }
    else { arch(z1 - 0.04, 0.4, 1.12, 0.18, 0.03); rpanel(c, -hw + 0.12, hw - 0.12, 0.72, 1.08, z1 - 0.07); }
    arch(z0 + 0.04, 0.3, 0.68, 0.06, 0.025); rpanel(c, -hw + 0.12, hw - 0.12, 0.36, 0.62, z0 + 0.015); }
}
// ---------- luggage and personal things ----------
function suitcase(c, x, y, z, w, h, d, col, open, seed) {
  paint(c, col, "leather", 0.6);
  if (!open) { bx(c, x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2, 0.035); paint(c, "oklch(0.35 0.05 50)", "leather"); for (const f of [-0.28, 0.28]) bx(c, x + f * w - 0.02, x + f * w + 0.02, y - 0.003, y + h + 0.003, z - d / 2 - 0.004, z + d / 2 + 0.004, 0.004);
    BRASS(c); for (const sx of [-1, 1]) for (const sz of [-1, 1]) ball(c, x + sx * (w / 2 - 0.015), y + h - 0.01, z + sz * (d / 2 - 0.015), 0.016, 6); path(c, [[x - 0.07, y + h, z], [x - 0.06, y + h + 0.05, z], [x + 0.06, y + h + 0.05, z], [x + 0.07, y + h, z]], 0.012, 6); return; }
  bx(c, x - w / 2, x + w / 2, y, y + h * 0.5, z - d / 2, z + d / 2, 0.03);
  // the lid flung back against the bed: lining up
  bx(c, x - w / 2, x + w / 2, y + h * 0.48, y + h * 0.48 + d, z + d / 2 - 0.0, z + d / 2 + h * 0.45, 0.03); paint(c, "oklch(0.75 0.08 20)", "velvet"); bx(c, x - w / 2 + 0.02, x + w / 2 - 0.02, y + h * 0.5, y + h * 0.46 + d, z + d / 2 - 0.004, z + d / 2 + 0.01, 0.004);
  const R = rng(seed); for (let i = 0; i < 4; i++) { paint(c, ["oklch(0.9 0.02 90)", "oklch(0.45 0.06 250)", "oklch(0.6 0.08 20)", "oklch(0.7 0.03 80)"][i], "tweed", 0.9); bx(c, x - w / 2 + 0.03 + i * (w - 0.06) / 4, x - w / 2 + 0.02 + (i + 1) * (w - 0.06) / 4, y + 0.02, y + h * 0.5 + 0.02 + R() * 0.05, z - d / 2 + 0.03, z + d / 2 - 0.03 - R() * 0.1, 0.02); }
  paint(c, "oklch(0.92 0.02 90)", "linen"); sheet(c, (u, v) => [x + w / 2 - 0.1 + u * 0.35, y + h * 0.5 + 0.04 - u * u * (y + h * 0.5) * 0.9 * (u > 0.5 ? 1 : 0.4), z - 0.1 + v * 0.3], 6, 3, () => [0, 1, 0]);
}
function luggage(c, p) {
  if (p.open) { suitcase(c, 0, 0.42, 0, 0.7, 0.24, 0.45, p.col ?? "oklch(0.7 0.07 55)", true, p.seed ?? 3); rack(c); return; }
  suitcase(c, 0, 0, 0, 0.72, 0.24, 0.46, p.col ?? "oklch(0.66 0.08 45)", false); suitcase(c, 0.03, 0.24, -0.02, 0.56, 0.2, 0.36, p.col2 ?? "oklch(0.55 0.06 140)", false);
  if (p.hatbox !== false) { paint(c, "oklch(0.88 0.05 350)", "chintz", 0.8); lathe(c, -0.05, 0.44, 0, [[0, 0], [0.19, 0], [0.19, 0.17], [0.2, 0.17], [0.2, 0.2], [0, 0.2]], 20); paint(c, "oklch(0.4 0.08 20)", "velvet"); pipe(c, [-0.24, 0.6, 0], [0.14, 0.6, 0], 0.006, 4); }
}
function rack(c) { WOOD(c, "walnut"); for (const s of [-1, 1]) { pipe(c, [s * 0.28, 0, -0.22], [s * 0.28, 0.42, 0.22], 0.016, 7); pipe(c, [s * 0.28, 0, 0.22], [s * 0.28, 0.42, -0.22], 0.016, 7); } for (const z of [-0.22, 0.22]) pipe(c, [-0.3, 0.42, z], [0.3, 0.42, z], 0.018, 7); paint(c, "oklch(0.5 0.08 25)", "tweed"); for (const x of [-0.15, 0, 0.15]) bx(c, x - 0.03, x + 0.03, 0.41, 0.425, -0.24, 0.24, 0.002); }
function letter(c, p) { paint(c, "oklch(0.96 0.03 85)", "paper", 0.9); sheet(c, (u, v) => [(u - 0.5) * 0.21, 0.003 + 0.01 * Math.sin(PI * v) + 0.004 * Math.sin(PI * u * 2), (v - 0.5) * 0.28], 4, 6, () => [0, 1, 0]);
  paint(c, "oklch(0.25 0.03 260)", null, 0.9); for (let i = 0; i < 9; i++) bx(c, -0.08, -0.08 + 0.16 * (0.6 + 0.4 * Math.sin(i * 7.1) ** 2), 0.0035 + 0.01 * Math.sin(PI * (0.15 + i * 0.075)), 0.005 + 0.01 * Math.sin(PI * (0.15 + i * 0.075)), -0.1 + i * 0.022, -0.098 + i * 0.022, 0);
  paint(c, "oklch(0.9 0.04 80)", "paper"); bx(c, 0.06, 0.25, 0, 0.004, -0.02, 0.1, 0.001); paint(c, "oklch(0.45 0.16 25)", null, 0.5); lathe(c, 0.155, 0.004, 0.04, [[0, 0], [0.016, 0], [0.015, 0.004], [0, 0.005]], 10); }
function birdcage(c, p) { BRASS(c); lathe(c, 0, 0, 0, [[0, 0], [0.16, 0], [0.17, 0.03], [0.15, 0.05], [0, 0.05]], 18); const N = 16, H = 0.38;
  for (let i = 0; i < N; i++) { const a = (i / N) * 2 * PI, ca = Math.cos(a), sa = Math.sin(a); if (i === 3 || i === 4) continue; const pts = [[ca * 0.15, 0.05, sa * 0.15], [ca * 0.15, H, sa * 0.15]]; for (let k = 1; k <= 5; k++) { const t = k / 5; pts.push([ca * 0.15 * Math.cos(t * PI / 2), H + Math.sin(t * PI / 2) * 0.16, sa * 0.15 * Math.cos(t * PI / 2)]); } path(c, pts, 0.003, 4); }
  for (const y of [0.06, 0.2, H]) { const pts = []; for (let i = 0; i <= N; i++) { const a = (i / N) * 2 * PI; pts.push([Math.cos(a) * 0.15, y, Math.sin(a) * 0.15]); } path(c, pts, 0.004, 4); }
  path(c, [[0, 0.54, 0], [0, 0.6, 0], [0.03, 0.63, 0], [0, 0.66, 0], [-0.03, 0.63, 0]], 0.006, 5); pipe(c, [-0.13, 0.17, 0], [0.13, 0.17, 0], 0.006, 5);
  // the little door hangs open
  const a0 = (3 / N) * 2 * PI; path(c, [[Math.cos(a0) * 0.15, 0.08, Math.sin(a0) * 0.15], [Math.cos(a0) * 0.3, 0.08, Math.sin(a0) * 0.2], [Math.cos(a0) * 0.3, 0.24, Math.sin(a0) * 0.2], [Math.cos(a0) * 0.15, 0.24, Math.sin(a0) * 0.15]], 0.004, 4);
  paint(c, "oklch(0.95 0.02 90)", null, 0.9); for (let i = 0; i < 3; i++) t3(c, [0.05 * i - 0.05, 0.055, 0.03 * i], [0.05 * i - 0.02, 0.056, 0.03 * i + 0.01], [0.05 * i - 0.045, 0.056, 0.03 * i + 0.04], [0, 1, 0]); }
function typewriter(c, p) { paint(c, "oklch(0.25 0.01 260)", "iron", 0.35, 0.4); bx(c, -0.17, 0.17, 0, 0.09, -0.12, 0.14, 0.03); sheet(c, (u, v) => [(u - 0.5) * 0.32, 0.03 + v * 0.07, -0.16 + v * 0.1], 1, 1, () => [0, 1, -1]);
  paint(c, "oklch(0.92 0.02 90)", null, 0.4); for (let r = 0; r < 4; r++) for (let k = 0; k < 10 - (r === 3 ? 2 : 0); k++) lathe(c, -0.13 + k * 0.028 + r * 0.007, 0.035 + r * 0.018, -0.15 + r * 0.025, [[0, 0], [0.008, 0], [0.009, 0.012], [0, 0.014]], 8);
  paint(c, "oklch(0.2 0.01 260)", null, 0.6); pipe(c, [-0.2, 0.13, 0.1], [0.2, 0.13, 0.1], 0.028, 12); paint(c, "oklch(0.8 0.01 90)", "steel", 0.3, 0.9); pipe(c, [0.2, 0.13, 0.1], [0.25, 0.13, 0.1], 0.012, 8); path(c, [[-0.2, 0.13, 0.1], [-0.24, 0.17, 0.08], [-0.27, 0.17, 0.05]], 0.006, 5);
  paint(c, "oklch(0.96 0.02 85)", "paper"); sheet(c, (u, v) => [(u - 0.5) * 0.21, 0.13 + v * 0.22, 0.12 + Math.sin(v * 1.3) * 0.04], 2, 4, () => [0, 0, -1]); }
function hatstand(c, p) { WOOD(c, "walnut"); turned(c, 0, 0, 0.05, 1.8, 0.03); for (let i = 0; i < 3; i++) { const a = i * 2.09; path(c, [[0, 0.1, 0], [Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2], [Math.cos(a) * 0.3, 0.0, Math.sin(a) * 0.3]], 0.02, 6); }
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + 0.4; BRASS(c); path(c, [[0, 1.68, 0], [Math.cos(a) * 0.12, 1.7, Math.sin(a) * 0.12], [Math.cos(a) * 0.16, 1.78, Math.sin(a) * 0.16]], 0.008, 5); ball(c, Math.cos(a) * 0.16, 1.79, Math.sin(a) * 0.16, 0.014, 6); }
  paint(c, "oklch(0.55 0.04 60)", "tweed", 0.95); lathe(c, 0.05, 0.75, 0, [[0.02, 0.95], [0.12, 0.9], [0.2, 0.7], [0.21, 0.3], [0.26, 0.0], [0.2, 0.0], [0.15, 0.3], [0.13, 0.7], [0.05, 0.9]], 14, true, 1, 0.7);
  paint(c, "oklch(0.38 0.03 40)", "tweed"); lathe(c, -0.07, 1.78, 0.05, [[0, 0], [0.17, 0], [0.18, 0.01], [0.1, 0.02], [0.09, 0.12], [0.06, 0.14], [0, 0.13]], 16); }
// ---------- lobby pieces ----------
function frontdesk(c, p) {
  const w = p.w ?? 3.6, d = 0.72, h = p.h ?? 1.12, hb = h - 0.07, hw = w / 2, zf = -d / 2;
  WOOD(c); bx(c, -hw, hw, 0.12, hb, zf + 0.02, d / 2 - 0.05, 0.01); bx(c, -hw - 0.03, hw + 0.03, 0, 0.13, zf - 0.01, d / 2 - 0.03, 0.015);
  const n = Math.round(w / 0.6); for (let i = 0; i < n; i++) { const x0 = -hw + (w * i) / n, x1 = -hw + (w * (i + 1)) / n; WOOD(c); bx(c, x0 - 0.02, x0 + 0.04, 0.12, hb, zf - 0.015, zf + 0.02, 0.008); rpanel(c, x0 + 0.08, x1 - 0.06, 0.22, hb - 0.1, zf + 0.02); }
  WOOD(c); bx(c, hw - 0.04, hw + 0.02, 0.12, hb, zf - 0.015, zf + 0.02, 0.008);
  paint(c, "oklch(0.96 0.01 90)", "marble", 0.18); bx(c, -hw - 0.05, hw + 0.05, hb, h, zf - 0.06, d / 2, 0.015);
  BRASS(c); pipe(c, [-hw, 0.2, zf - 0.12], [hw, 0.2, zf - 0.12], 0.02, 10); for (const x of [-hw + 0.1, 0, hw - 0.1]) pipe(c, [x, 0.2, zf - 0.12], [x, 0.2, zf + 0.02], 0.012, 6);
  // the bell, the guest ledger open on a page that never ends, a pen in its stand
  BRASS(c); lathe(c, 0.9, h, 0, [[0, 0], [0.06, 0], [0.06, 0.012], [0.055, 0.015], [0.05, 0.04], [0.025, 0.065], [0, 0.07]], 18); pipe(c, [0.9, h + 0.07, 0], [0.9, h + 0.085, 0], 0.006, 6); ball(c, 0.9, h + 0.09, 0, 0.01, 6);
  paint(c, "oklch(0.55 0.1 25)", "leather"); bx(c, -0.05, 0.55, h, h + 0.02, -0.22, 0.18, 0.006);
  paint(c, "oklch(0.95 0.03 85)", "paper"); for (const s of [-1, 1]) sheet(c, (u, v) => [0.25 + s * (0.02 + u * 0.27), h + 0.022 + Math.sin(u * PI * 0.5) * 0.02 * (1 - u * 0.6), -0.2 + v * 0.36], 6, 2, () => [0, 1, 0]);
  paint(c, "oklch(0.3 0.03 260)", null, 0.9); for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 12; i++) bx(c, 0.25 + s * 0.06, 0.25 + s * (0.06 + 0.18 * (0.5 + 0.5 * Math.sin(i * 3.7) ** 2)), h + 0.034, h + 0.036, -0.17 + i * 0.027, -0.168 + i * 0.027, 0);
  BRASS(c); lathe(c, 0.65, h, 0.1, [[0, 0], [0.04, 0], [0.03, 0.03], [0, 0.03]], 12); paint(c, "oklch(0.15 0.01 0)", null, 0.3); pipe(c, [0.65, h + 0.03, 0.1], [0.6, h + 0.17, 0.14], 0.005, 6, 0.003);
}
function cubbies(c, p) { // the brass key cubbies behind the desk, every room's key home but one
  const w = p.w ?? 1.9, d = 0.36, hw = w / 2, zf = -d / 2, R = rng(17);
  WOOD(c); bx(c, -hw, hw, 0.1, 0.95, zf, d / 2, 0.01); drawer(c, -hw + 0.03, -0.01, 0.6, 0.9, zf, "mahog"); drawer(c, 0.01, hw - 0.03, 0.6, 0.9, zf, "mahog"); rpanel(c, -hw + 0.05, -0.02, 0.16, 0.55, zf); rpanel(c, 0.02, hw - 0.05, 0.16, 0.55, zf);
  WOOD(c); bx(c, -hw - 0.03, hw + 0.03, 0.95, 0.99, zf - 0.04, d / 2, 0.01); bx(c, -hw + 0.02, hw - 0.02, 1.4, 2.5, d / 2 - 0.02, d / 2, 0);
  const nx = 8, ny = 5, x0 = -hw + 0.06, cw = (w - 0.12) / nx, y0 = 1.4, ch = 0.21, z1 = d / 2 - 0.12;
  for (let i = 0; i <= nx; i++) bx(c, x0 + i * cw - 0.008, x0 + i * cw + 0.008, y0, y0 + ny * ch, z1 - 0.2, d / 2 - 0.02, 0.003);
  for (let j = 0; j <= ny; j++) bx(c, x0, x0 + nx * cw, y0 + j * ch - 0.008, y0 + j * ch + 0.008, z1 - 0.2, d / 2 - 0.02, 0.003);
  for (const x of [-hw, hw - 0.06]) bx(c, x, x + 0.06, 0.99, 2.55, zf + 0.1, d / 2, 0.01); bx(c, -hw - 0.05, hw + 0.05, 2.5, 2.62, zf + 0.06, d / 2, 0.015);
  GILT(c); bx(c, -0.35, 0.35, 2.62, 2.72, z1 - 0.12, z1 - 0.08, 0.01);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const cx = x0 + (i + 0.5) * cw, cy = y0 + j * ch + 0.14; BRASS(c); bx(c, cx - 0.03, cx + 0.03, y0 + j * ch + 0.012, y0 + j * ch + 0.032, z1 - 0.205, z1 - 0.2, 0.002);
    if (c.lod >= 3 || (i === 5 && j === 2)) continue; // one hook empty: somebody still has that key
    path(c, [[cx, cy, z1 - 0.21], [cx, cy, z1 - 0.23], [cx, cy - 0.015, z1 - 0.23]], 0.003, 4); if (R() < 0.85) { pipe(c, [cx, cy - 0.02, z1 - 0.23], [cx, cy - 0.08, z1 - 0.23], 0.004, 5); paint(c, "oklch(0.7 0.12 85)", "brass", 0.4, 0.8); lathe(c, cx, cy - 0.13, z1 - 0.23, [[0, 0], [0.018, 0], [0.018, 0.05], [0, 0.05]], 8); }
    if (R() < 0.25) { paint(c, "oklch(0.94 0.03 85)", "paper"); bx(c, cx - 0.06, cx + 0.06, y0 + j * ch + 0.02, y0 + j * ch + 0.11, z1 - 0.1, z1 - 0.095, 0); } }
}
function palm(c, p) {
  const R = rng(p.seed ?? 5), ph = p.pot ?? 0.62;
  paint(c, p.potcol ?? "oklch(0.93 0.02 245)", p.pottex ?? "ceramic", 0.2); lathe(c, 0, 0, 0, [[0, 0], [0.18, 0], [0.2, 0.06], [0.26, 0.3], [0.28, ph - 0.06], [0.31, ph - 0.03], [0.3, ph], [0.26, ph], [0, ph - 0.02]], 20);
  paint(c, "oklch(0.35 0.04 60)", "soil"); lathe(c, 0, ph - 0.04, 0, [[0, 0], [0.26, 0], [0, 0.02]], 14);
  const nf = c.lod >= 3 ? 6 : 11;
  for (let k = 0; k < nf; k++) { const a = (k / nf) * 2 * PI + R() * 0.4, len = 0.9 + R() * 0.6, rise = 0.6 + R() * 0.8, ca = Math.cos(a), sa = Math.sin(a), base = [ca * 0.04, ph + 0.1 + R() * 0.3, sa * 0.04];
    const sp = (t) => [base[0] + ca * len * t, base[1] + rise * Math.sin(t * PI * 0.62) - len * 0.35 * t * t, base[2] + sa * len * t];
    paint(c, "oklch(0.42 0.07 120)"); const pts = []; for (let i = 0; i <= 6; i++) pts.push(sp(-0.2 + 1.2 * i / 6 * 0.0 + i / 6)); path(c, [[0, ph, 0], ...pts], 0.008, 4);
    paint(c, `oklch(${0.45 + R() * 0.1} 0.11 ${135 + R() * 15})`, null, 0.6);
    const nl = c.lod >= 2 ? 7 : 14; for (let i = 1; i <= nl; i++) { const t = i / (nl + 1), P = sp(t), wl = 0.32 * Math.sin(PI * t) + 0.05; for (const s of [-1, 1]) { const dir = [-sa * s, -0.35, ca * s]; const tip = [P[0] + dir[0] * wl + ca * 0.08, P[1] + dir[1] * wl, P[2] + dir[2] * wl + sa * 0.08], b2 = sp(t + 0.04);
      t3(c, P, b2, tip, [0, 1, 0]); } } }
}
function rug(c, p) { const w = p.w ?? 4, d = p.d ?? 6; paint(c, p.col ?? "oklch(0.92 0.03 40)", p.tex ?? "persian", 0.95);
  bx(c, -w / 2, w / 2, 0, 0.012, -d / 2, d / 2, 0.004); if (c.lod < 3) { paint(c, "oklch(0.88 0.03 85)", "linen", 1); for (const s of [-1, 1]) for (let i = 0; i < Math.round(w / 0.04); i++) { const x = -w / 2 + 0.02 + i * 0.04; q(c, [x, 0.004, s * d / 2], [x + 0.012, 0.004, s * d / 2], [x + 0.012, 0.002, s * (d / 2 + 0.06)], [x, 0.002, s * (d / 2 + 0.06)], [0, 1, 0]); } } }
function clock(c, p) { // the grandfather clock: thirteen hours on its face, stopped at the thirteenth
  const w = 0.56, d = 0.36, zf = -d / 2; WOOD(c);
  bx(c, -w / 2, w / 2, 0, 0.55, zf, d / 2, 0.015); bx(c, -w / 2 - 0.03, w / 2 + 0.03, 0, 0.08, zf - 0.03, d / 2, 0.015); rpanel(c, -w / 2 + 0.06, w / 2 - 0.06, 0.12, 0.48, zf);
  bx(c, -w / 2 - 0.02, w / 2 + 0.02, 0.55, 0.6, zf - 0.02, d / 2, 0.01); bx(c, -w / 2 + 0.05, w / 2 - 0.05, 0.6, 1.5, zf + 0.03, d / 2, 0.012);
  for (const s of [-1, 1]) turned(c, s * (w / 2 - 0.06), zf + 0.04, 0.6, 1.5, 0.028);
  paint(c, "oklch(0.85 0.02 200)", null, 0.05); c.color("oklch(0.85 0.02 200)", 0.2); bx(c, -w / 2 + 0.11, w / 2 - 0.11, 0.65, 1.45, zf + 0.04, zf + 0.045, 0);
  BRASS(c); pipe(c, [0, 1.42, zf + 0.12], [0, 0.85, zf + 0.12], 0.004, 5); lathe(c, 0, 0.8, zf + 0.12, [[0, 0], [0.07, 0.04], [0, 0.08]], 16, true, 1, 0.25); for (const x of [-0.06, 0.06]) { pipe(c, [x, 1.42, zf + 0.15], [x, 0.95, zf + 0.15], 0.003, 4); lathe(c, x, 0.82, zf + 0.15, [[0, 0], [0.025, 0], [0.025, 0.13], [0, 0.13]], 10); }
  WOOD(c); bx(c, -w / 2 - 0.04, w / 2 + 0.04, 1.5, 1.56, zf - 0.04, d / 2, 0.012); bx(c, -w / 2, w / 2, 1.56, 2.06, zf, d / 2, 0.015);
  const hood = (u, v) => [(u - 0.5) * (w + 0.06), 2.06 + v * (0.1 + Math.sin(PI * u) * 0.14), zf - 0.03]; sheet(c, hood, 12, 1, () => [0, 0, -1], false); sheet(c, (u, v) => [...hood(u, v).slice(0, 2), d / 2], 12, 1, () => [0, 0, 1], false); sheet(c, (u, v) => [(u - 0.5) * (w + 0.06), 2.16 + Math.sin(PI * u) * 0.14, zf - 0.03 + v * (d + 0.03)], 12, 1, () => [0, 1, 0], false);
  for (const s of [-1, 1]) { BRASS(c); lathe(c, s * (w / 2 + 0.01), 2.16, zf + 0.02, [[0, 0], [0.025, 0], [0.03, 0.03], [0.012, 0.07], [0, 0.11]], 10); } BRASS(c); lathe(c, 0, 2.3, zf + 0.02, [[0, 0], [0.03, 0], [0.04, 0.04], [0.015, 0.09], [0, 0.14]], 10);
  // dial: arched brass face, cream chapter ring with thirteen marks
  BRASS(c); bx(c, -w / 2 + 0.05, w / 2 - 0.05, 1.6, 2.02, zf - 0.006, zf, 0.004); const cy = 1.8, z = zf - 0.008;
  paint(c, "oklch(0.95 0.03 85)", "paper", 0.6); const N = 32; for (let i = 0; i < N; i++) { const a0 = i / N * 2 * PI, a1 = (i + 1) / N * 2 * PI; q(c, [Math.cos(a0) * 0.12, cy + Math.sin(a0) * 0.12, z], [Math.cos(a1) * 0.12, cy + Math.sin(a1) * 0.12, z], [Math.cos(a1) * 0.19, cy + Math.sin(a1) * 0.19, z], [Math.cos(a0) * 0.19, cy + Math.sin(a0) * 0.19, z], [0, 0, -1]); t3(c, [0, cy, z], [Math.cos(a0) * 0.12, cy + Math.sin(a0) * 0.12, z], [Math.cos(a1) * 0.12, cy + Math.sin(a1) * 0.12, z], [0, 0, -1]); }
  paint(c, "oklch(0.15 0.01 260)", null, 0.6); for (let i = 0; i < 13; i++) { const a = PI / 2 - i * 2 * PI / 13, ca = Math.cos(a), sa = Math.sin(a); q(c, [ca * 0.155 - sa * 0.006, cy + sa * 0.155 + ca * 0.006, z - 0.001], [ca * 0.155 + sa * 0.006, cy + sa * 0.155 - ca * 0.006, z - 0.001], [ca * 0.185 + sa * 0.006, cy + sa * 0.185 - ca * 0.006, z - 0.001], [ca * 0.185 - sa * 0.006, cy + sa * 0.185 + ca * 0.006, z - 0.001], [0, 0, -1]); }
  const hand = (a, l, wd, zz) => { const ca = Math.cos(a), sa = Math.sin(a); q(c, [-sa * wd, cy + ca * wd, zz], [ca * l, cy + sa * l, zz], [sa * wd, cy - ca * wd, zz], [-ca * 0.03, cy - sa * 0.03, zz], [0, 0, -1]); };
  hand(PI / 2 - 12.2 * 2 * PI / 13, 0.11, 0.012, z - 0.004); hand(PI / 2 - 0.12 * 2 * PI, 0.16, 0.008, z - 0.006); BRASS(c); ball(c, 0, cy, z - 0.007, 0.01, 6);
  paint(c, "oklch(0.85 0.02 200)", null, 0.05); c.color("oklch(0.85 0.02 200)", 0.2); bx(c, -w / 2 + 0.04, w / 2 - 0.04, 1.58, 2.04, zf - 0.025, zf - 0.02, 0);
}
// paintings: an oil, brushed as small cells of paint; a portrait's eyes are hollows, so they turn to follow you
function painting(c, p) {
  const w = p.w ?? 0.7, h = p.h ?? 0.9, style = p.style ?? "portrait", R = rng(p.seed ?? 1), fw = p.frame ?? 0.09;
  GILT(c); const hw = w / 2, hh = h / 2;
  bx(c, -hw - fw, hw + fw, hh, hh + fw, -0.03, 0.02, 0.02); bx(c, -hw - fw, hw + fw, -hh - fw, -hh, -0.03, 0.02, 0.02); bx(c, -hw - fw, -hw, -hh, hh, -0.03, 0.02, 0.02); bx(c, hw, hw + fw, -hh, hh, -0.03, 0.02, 0.02);
  if (c.lod < 3) { pipe(c, [-hw - fw * 0.5, hh + fw * 0.5, -0.04], [hw + fw * 0.5, hh + fw * 0.5, -0.04], 0.012, 6); pipe(c, [-hw - fw * 0.5, -hh - fw * 0.5, -0.04], [hw + fw * 0.5, -hh - fw * 0.5, -0.04], 0.012, 6); pipe(c, [-hw - fw * 0.5, -hh - fw * 0.5, -0.04], [-hw - fw * 0.5, hh + fw * 0.5, -0.04], 0.012, 6); pipe(c, [hw + fw * 0.5, -hh - fw * 0.5, -0.04], [hw + fw * 0.5, hh + fw * 0.5, -0.04], 0.012, 6); }
  const sp = p.sp ?? R(), coat = [`oklch(0.3 0.06 ${250 + R() * 60})`, `oklch(0.28 0.05 25)`, `oklch(0.32 0.06 150)`][Math.floor(R() * 3)], fur = [`oklch(0.62 0.09 60)`, `oklch(0.85 0.02 80)`, `oklch(0.45 0.05 50)`, `oklch(0.3 0.02 60)`][Math.floor(R() * 4)];
  const cat = sp < 0.5, eyes = [[-0.07, 0.13], [0.07, 0.13]], er = 0.032;
  const col = (u, v) => { const x = (u - 0.5) * 1, y = v - 0.5; // portrait space, head at (0, 0.12)
    if (style === "land") { const hz = 0.02 * Math.sin(u * 9 + 1) + 0.05 * Math.sin(u * 3); if (y > hz + 0.05) return `oklch(${0.55 + y * 0.4} ${0.06 - y * 0.05} ${70 + y * 120})`; if (y > hz - 0.05) return `oklch(${0.42 + R() * 0.03} 0.06 ${140 + u * 20})`; if (Math.abs(x + 0.2) < 0.015 && y < 0.25 && y > -0.1) return "oklch(0.2 0.02 50)"; if ((x + 0.2) ** 2 + (y - 0.25) ** 2 < 0.012) return "oklch(0.3 0.06 140)"; return `oklch(${0.38 + y * 0.3} 0.05 ${90 + u * 30})`; }
    if (style === "sea") { const wv = -0.1 + 0.02 * Math.sin(u * 30); if (y > wv) { if (Math.abs(x) < 0.12 && y < 0.05 && y > wv - 0.02 + 0.06 * (x * x * 10)) return "oklch(0.25 0.03 40)"; if (Math.abs(x - 0.02) < 0.006 && y < 0.35) return "oklch(0.2 0.02 40)"; if (y > 0.05 && y < 0.32 && Math.abs(x - 0.02) < 0.15 * (0.4 - y)) return "oklch(0.88 0.03 85)"; return `oklch(${0.45 + y * 0.35} 0.05 ${60 + y * 100})`; } return `oklch(${0.3 + (y + 0.5) * 0.3} 0.06 220)`; }
    const head = (x / 0.19) ** 2 + ((y - 0.12) / 0.2) ** 2, ear = cat ? (Math.abs(Math.abs(x) - 0.13) < 0.07 - (y - 0.28) * 0.6 && y > 0.25 && y < 0.38) : ((Math.abs(x) - 0.19) ** 2 / 0.003 + (y - 0.1) ** 2 / 0.03 < 1);
    if (head < 1 || ear) { const sn = (x / 0.09) ** 2 + ((y - 0.02) / 0.07) ** 2; if (sn < 0.25 && y > 0.03) return "oklch(0.12 0.01 0)"; if (sn < 1) return "oklch(0.88 0.03 80)"; if (ear && head >= 1 && cat && Math.abs(Math.abs(x) - 0.13) < 0.035 - (y - 0.28) * 0.3) return "oklch(0.7 0.07 10)"; return fur; }
    const sh = y < -0.12 - 0.4 * x * x; if (sh) { if (Math.abs(x) < 0.08 - (y + 0.12) * -0.3 && y > -0.35) return "oklch(0.92 0.01 90)"; return coat; }
    return `oklch(${0.22 + 0.06 * (1 - Math.hypot(x, y)) } 0.03 ${70 + v * 20})`; };
  const n = c.lod >= 3 ? 10 : c.lod >= 2 ? 26 : 44, m = Math.round(n * h / w);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const u = (i + 0.5) / n, v = (j + 0.5) / m;
    if (style === "portrait" && c.lod < 3) { const xx = (u - 0.5) * 1, yy = v - 0.5; if (eyes.some(([ex, ey]) => Math.hypot((xx - ex) * w, (yy - ey) * h) < er * 0.98)) continue; }
    const jit = (R() - 0.5) * 0.04; c.albedo(null); c.roughness(0.55); c.metalness(0); c.emissive(null); c.color(col(u, v)); const k = 1 + jit;
    q(c, [-hw + w * i / n, -hh + h * j / m, 0.0 - jit * 0.02], [-hw + w * (i + 1) / n, -hh + h * j / m, 0.0], [-hw + w * (i + 1) / n, -hh + h * (j + 1) / m, 0.0 - jit * 0.02], [-hw + w * i / n, -hh + h * (j + 1) / m, 0.0], [0, 0, -1]); void k; }
  if (style !== "portrait" || c.lod >= 3) return;
  for (const [ex, ey] of eyes) { const cx = ex * w, cy = ey * h, N = 12, M = 5, D = er * 1.1; // a hollow eye: the pupil at its deepest point
    const P = (a, f) => { const rr = er * Math.sin(f * PI / 2); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, D * Math.cos(f * PI / 2)]; };
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a0 = i / N * 2 * PI, a1 = (i + 1) / N * 2 * PI, f0 = j / M, f1 = (j + 1) / M, fm = (f0 + f1) / 2;
      c.color(fm < 0.35 ? "oklch(0.06 0 0)" : fm < 0.62 ? (cat ? "oklch(0.55 0.13 140)" : "oklch(0.4 0.08 60)") : "oklch(0.9 0.02 90)");
      const cen = [cx, cy, 0]; const a = P(a0, f0), b = P(a1, f0), cc = P(a1, f1), dd = P(a0, f1), mid = [(a[0] + cc[0]) / 2, (a[1] + cc[1]) / 2, (a[2] + cc[2]) / 2];
      q(c, a, b, cc, dd, [cen[0] - mid[0], cen[1] - mid[1], -0.5 * er - mid[2]]); }
  }
}
// ---------- library ----------
function ladder(c, p) { const h = p.h ?? 3.1, lean = 0.55; WOOD(c, "oak"); const top = (s) => [s * 0.24, h, 0.0], bot = (s) => [s * 0.27, 0.04, -lean];
  for (const s of [-1, 1]) { pipe(c, bot(s), top(s), 0.025, 8); BRASS(c); ball(c, bot(s)[0], 0.04, -lean, 0.04, 8); WOOD(c, "oak"); }
  const nr = Math.round(h / 0.3); for (let i = 1; i < nr; i++) { const t = i / nr, a = bot(-1), b = top(-1), y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t, xw = 0.27 - 0.03 * t; bx(c, -xw, xw, y - 0.015, y + 0.015, z - 0.04, z + 0.04, 0.006); }
  BRASS(c); for (const s of [-1, 1]) path(c, [top(s), [s * 0.24, h + 0.05, 0.05], [s * 0.24, h + 0.02, 0.1]], 0.012, 6); }
function maptable(c, p) { const w = 2.2, d = 1.2, h = 0.82; WOOD(c, "walnut");
  bx(c, -w / 2, w / 2, h - 0.05, h, -d / 2, d / 2, 0.02); bx(c, -w / 2 + 0.06, w / 2 - 0.06, h - 0.16, h - 0.05, -d / 2 + 0.06, d / 2 - 0.06, 0.01);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turned(c, x * (w / 2 - 0.1), z * (d / 2 - 0.1), 0, h - 0.05, 0.05);
  bx(c, -w / 2 + 0.1, w / 2 - 0.1, 0.12, 0.16, -0.03, 0.03, 0.008);
  paint(c, "oklch(0.95 0.03 80)", "map", 0.9); sheet(c, (u, v) => [-0.85 + 1.7 * u, h + 0.004 + 0.01 * Math.sin(PI * u) * Math.sin(PI * v) + (u < 0.06 ? (0.06 - u) * 0.8 : u > 0.94 ? (u - 0.94) * 0.8 : 0), -0.45 + 0.9 * v], 12, 6, () => [0, 1, 0]);
  BRASS(c); for (const [x, z] of [[-0.8, -0.4], [0.8, 0.4], [-0.8, 0.4]]) lathe(c, x, h + 0.01, z, [[0, 0], [0.03, 0], [0.03, 0.03], [0.012, 0.05], [0.015, 0.07], [0, 0.07]], 10);
  lathe(c, 0.35, h + 0.012, -0.1, [[0, 0], [0.06, 0], [0.06, 0.015], [0, 0.015]], 16); pipe(c, [0.2, h + 0.03, 0.2], [0.05, h + 0.02, 0.1], 0.01, 6); lathe(c, 0.22, h + 0.02, 0.22, [[0.05, 0], [0.055, 0.005], [0.05, 0.01]], 16, false);
  const R = rng(31); for (let i = 0; i < 4; i++) { paint(c, `oklch(${0.4 + R() * 0.2} 0.08 ${[25, 145, 60, 250][i]})`, "leather"); bx(c, -0.95 + R() * 0.05, -0.62, h + i * 0.065, h + (i + 1) * 0.065 - 0.004, 0.15 - R() * 0.06, 0.45, 0.01); }
  paint(c, "oklch(0.98 0.01 90)", null, 0.6, 0, "oklch(0.7 0.1 70)"); lathe(c, 0.7, h, -0.3, [[0, 0], [0.03, 0], [0.03, 0.12], [0, 0.12]], 10); paint(c, "oklch(0.15 0 0)"); pipe(c, [0.7, h + 0.12, -0.3], [0.7, h + 0.14, -0.3], 0.003, 4); BRASS(c); lathe(c, 0.7, h, -0.3, [[0, 0], [0.07, 0], [0.07, 0.015], [0.035, 0.02], [0, 0.02]], 12); }
function lectern(c, p) { WOOD(c, "walnut"); lathe(c, 0, 0, 0, [[0, 0], [0.28, 0], [0.26, 0.06], [0.08, 0.1], [0.06, 0.9], [0.1, 0.95], [0, 0.95]], 12);
  sheet(c, (u, v) => [(u - 0.5) * 0.6, 0.95 + v * 0.25, 0.2 - v * 0.4], 1, 1, () => [0, 1, -0.5], false); sheet(c, (u, v) => [(u - 0.5) * 0.6, 0.93 + v * 0.25, 0.2 - v * 0.4], 1, 1, () => [0, -1, 0.5], false);
  paint(c, "oklch(0.45 0.1 25)", "leather"); const ang = Math.atan2(0.25, 0.4); for (const s of [-1, 1]) sheet(c, (u, v) => [s * (0.01 + u * 0.24), 0.98 + v * 0.22 + Math.sin(u * PI * 0.5) * 0.03, 0.18 - v * 0.36 - Math.sin(u * PI * 0.5) * 0.03 * Math.tan(ang)], 5, 2, () => [0, 1, -0.6]);
  paint(c, "oklch(0.92 0.04 80)", "paper"); for (const s of [-1, 1]) sheet(c, (u, v) => [s * (0.015 + u * 0.22), 0.995 + v * 0.2 + Math.sin(u * PI * 0.5) * 0.04, 0.165 - v * 0.33 - Math.sin(u * PI * 0.5) * 0.025], 5, 2, () => [0, 1, -0.6]); }
function tomes(c, p) { const R = rng(p.seed ?? 41); let y = 0; for (let i = 0; i < 5; i++) { const w = 0.3 + R() * 0.15, d = 0.22 + R() * 0.08, t = 0.05 + R() * 0.05, a = (R() - 0.5) * 0.6, ca = Math.cos(a), sa = Math.sin(a);
  paint(c, `oklch(${0.35 + R() * 0.25} 0.08 ${[25, 145, 60, 250, 300][i]})`, "leather"); const corner = (x, z) => [x * ca - z * sa, z * ca + x * sa];
  const P = [corner(-w / 2, -d / 2), corner(w / 2, -d / 2), corner(w / 2, d / 2), corner(-w / 2, d / 2)]; for (const yy of [y, y + t]) q(c, [P[0][0], yy, P[0][1]], [P[1][0], yy, P[1][1]], [P[2][0], yy, P[2][1]], [P[3][0], yy, P[3][1]], [0, yy === y ? -1 : 1, 0]);
  for (let k = 0; k < 4; k++) { const A = P[k], B = P[(k + 1) % 4]; if (k === 1) paint(c, "oklch(0.92 0.04 85)", "paper"); q(c, [A[0], y, A[1]], [B[0], y, B[1]], [B[0], y + t, B[1]], [A[0], y + t, A[1]], [(A[0] + B[0]) / 2, 0, (A[1] + B[1]) / 2]); if (k === 1) paint(c, `oklch(0.4 0.08 ${i * 60})`, "leather"); } y += t; } }
// ---------- kitchen and dining ----------
function range(c, p) { const w = 1.3, d = 0.7, h = 0.9; paint(c, "oklch(0.95 0.03 95)", "enamel", 0.3);
  bx(c, -w / 2, w / 2, 0.14, h, -d / 2, d / 2, 0.03); paint(c, "oklch(0.2 0.01 60)", "iron", 0.4, 0.5); bx(c, -w / 2 - 0.01, w / 2 + 0.01, h - 0.03, h + 0.01, -d / 2 - 0.01, d / 2, 0.01); bx(c, -w / 2, w / 2, 0.14, 0.2, -d / 2 - 0.005, d / 2, 0.01);
  for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) for (const z of [-d / 2 + 0.06, d / 2 - 0.06]) cabriole(c, x, z, 0, 0.15, 0.025, Math.sign(x), Math.sign(z));
  for (const [x0, x1] of [[-w / 2 + 0.04, -0.02], [0.02, w / 2 - 0.04]]) { paint(c, "oklch(0.95 0.03 95)", "enamel", 0.25); bx(c, x0, x1, 0.25, 0.75, -d / 2 - 0.025, -d / 2 + 0.005, 0.02); paint(c, "oklch(0.85 0.01 90)", "steel", 0.2, 0.95); pipe(c, [x0 + 0.08, 0.7, -d / 2 - 0.06], [x1 - 0.08, 0.7, -d / 2 - 0.06], 0.012, 8); for (const x of [x0 + 0.08, x1 - 0.08]) pipe(c, [x, 0.7, -d / 2 - 0.06], [x, 0.7, -d / 2 - 0.02], 0.01, 6); paint(c, "oklch(0.2 0.01 60)", null, 0.2); bx(c, (x0 + x1) / 2 - 0.08, (x0 + x1) / 2 + 0.08, 0.42, 0.6, -d / 2 - 0.03, -d / 2 - 0.025, 0.005); }
  paint(c, "oklch(0.18 0.01 60)", "iron", 0.5, 0.6); for (const x of [-0.4, -0.05, 0.3]) for (const z of [-0.15, 0.15]) { lathe(c, x + (x > 0 ? 0.08 : 0), h + 0.01, z, [[0.1, 0], [0.11, 0.01], [0.1, 0.02], [0.08, 0.02], [0.08, 0.005]], 16, false); for (let k = 0; k < 4; k++) { const a = k * PI / 4; pipe(c, [x + (x > 0 ? 0.08 : 0) - Math.cos(a) * 0.1, h + 0.022, z - Math.sin(a) * 0.1], [x + (x > 0 ? 0.08 : 0) + Math.cos(a) * 0.1, h + 0.022, z + Math.sin(a) * 0.1], 0.006, 4); } }
  paint(c, "oklch(0.95 0.03 95)", "enamel", 0.3); bx(c, -w / 2, w / 2, h, h + 0.55, d / 2 - 0.06, d / 2, 0.01); paint(c, "oklch(0.2 0.01 60)", "iron", 0.4, 0.5); bx(c, -w / 2 - 0.02, w / 2 + 0.02, h + 0.4, h + 0.44, d / 2 - 0.25, d / 2, 0.01);
  paint(c, "oklch(0.85 0.01 90)", "steel", 0.3, 0.9); for (let i = 0; i < 6; i++) { const x = -0.45 + i * 0.18; lathe(c, x, h + 0.13, -d / 2 - 0.03, [[0, 0], [0.02, 0], [0.02, 0.025], [0, 0.03]], 8); }
  paint(c, "oklch(0.25 0.01 60)", "iron", 0.5, 0.6); lathe(c, -0.32, h + 0.03, -0.15, [[0, 0], [0.13, 0], [0.14, 0.05], [0.13, 0.05], [0.12, 0.01], [0, 0.01]], 18); pipe(c, [-0.18, h + 0.05, -0.15], [0.05, h + 0.06, -0.3], 0.012, 6);
  paint(c, "oklch(0.75 0.05 60)", "brass", 0.4, 0.8); lathe(c, 0.33, h + 0.03, 0.15, [[0, 0], [0.12, 0], [0.13, 0.18], [0.14, 0.19], [0.12, 0.19], [0, 0.18]], 16); }
function counter(c, p) { const w = p.w ?? 2.0, d = 0.65, h = p.h ?? 1.0, hw = w / 2, zf = -d / 2;
  paint(c, "oklch(0.88 0.04 150)", "enamel", 0.5); bx(c, -hw, hw, 0.1, h - 0.05, zf + 0.02, d / 2, 0.01); paint(c, "oklch(0.25 0.02 60)", null, 0.6); bx(c, -hw + 0.02, hw - 0.02, 0, 0.1, zf + 0.06, d / 2, 0.005);
  const n = Math.max(1, Math.round(w / 0.55)); for (let i = 0; i < n; i++) { const x0 = -hw + 0.03 + i * (w - 0.06) / n, x1 = -hw + 0.03 + (i + 1) * (w - 0.06) / n - 0.01; paint(c, "oklch(0.88 0.04 150)", "enamel", 0.45); bx(c, x0, x1, h - 0.24, h - 0.08, zf - 0.005, zf + 0.02, 0.008); bx(c, x0, x1, 0.14, h - 0.27, zf - 0.005, zf + 0.02, 0.008); paint(c, "oklch(0.85 0.01 90)", "steel", 0.2, 0.95); pipe(c, [(x0 + x1) / 2 - 0.06, h - 0.16, zf - 0.03], [(x0 + x1) / 2 + 0.06, h - 0.16, zf - 0.03], 0.008, 6); knob(c, x1 - 0.05, h - 0.4, zf - 0.005, 0.014); }
  WOOD(c, "oak"); bx(c, -hw - 0.02, hw + 0.02, h - 0.05, h, zf - 0.02, d / 2, 0.012);
  if (p.deco !== false) { paint(c, "oklch(0.9 0.02 90)", "steel", 0.3, 0.9); lathe(c, -hw + 0.3, h, 0.05, [[0, 0], [0.12, 0], [0.13, 0.14], [0.14, 0.15], [0, 0.14]], 16); WOOD(c, "oak"); bx(c, -0.1, 0.3, h, h + 0.03, -0.15, 0.1, 0.008); paint(c, "oklch(0.92 0.04 95)", "ceramic", 0.3); for (let i = 0; i < 3; i++) lathe(c, hw - 0.15 - i * 0.14, h, 0.2, [[0, 0], [0.05, 0], [0.055, 0.15 - i * 0.03], [0.04, 0.17 - i * 0.03], [0, 0.17 - i * 0.03]], 12); } }
function icebox(c, p) { const w = 0.85, d = 0.6, h = 1.5; WOOD(c, "oak"); bx(c, -w / 2, w / 2, 0.08, h, -d / 2, d / 2, 0.02); bx(c, -w / 2 - 0.02, w / 2 + 0.02, h - 0.04, h + 0.02, -d / 2 - 0.02, d / 2, 0.01);
  for (const [y0, y1] of [[0.12, 0.7], [0.76, h - 0.06]]) { rpanel(c, -w / 2 + 0.05, w / 2 - 0.05, y0, y1, -d / 2); BRASS(c); bx(c, w / 2 - 0.16, w / 2 - 0.06, (y0 + y1) / 2 - 0.04, (y0 + y1) / 2 + 0.04, -d / 2 - 0.03, -d / 2 - 0.015, 0.006); path(c, [[w / 2 - 0.14, (y0 + y1) / 2, -d / 2 - 0.035], [w / 2 - 0.05, (y0 + y1) / 2 + 0.01, -d / 2 - 0.05], [w / 2 + 0.0, (y0 + y1) / 2, -d / 2 - 0.035]], 0.008, 5); for (const y of [y0 + 0.08, y1 - 0.08]) bx(c, -w / 2 + 0.01, -w / 2 + 0.07, y - 0.03, y + 0.03, -d / 2 - 0.03, -d / 2 + 0.005, 0.004); WOOD(c, "oak"); }
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) puff(c, x, 0.04, z, 0.035, 0.04, 0.035, 8); }
function dtable(c, p) { const w = p.w ?? 1.8, d = 0.9, h = 0.76, hw = w / 2; WOOD(c);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turned(c, x * (hw - 0.08), z * (d / 2 - 0.08), 0, h - 0.05, 0.035);
  bx(c, -hw, hw, h - 0.05, h - 0.02, -d / 2, d / 2, 0.01);
  CLOTH(c, "oklch(0.97 0.01 90)", "cloth"); sheet(c, (u, v) => [-hw - 0.01 + (w + 0.02) * u, h + 0.002, -d / 2 - 0.01 + (d + 0.02) * v], 8, 4, () => [0, 1, 0]);
  for (const s of [-1, 1]) { sheet(c, (u, v) => [-hw - 0.01 - v * 0.02 + (w + 0.02 + v * 0.04) * u, h + 0.002 - v * 0.28, s * (d / 2 + 0.01 + v * 0.02 + 0.012 * Math.sin(u * 26) * v)], 26, 3, () => [0, 0, s]); sheet(c, (u, v) => [s * (hw + 0.01 + v * 0.02 + 0.012 * Math.sin(u * 14) * v), h + 0.002 - v * 0.28, -d / 2 - 0.01 - v * 0.02 + (d + 0.02 + v * 0.04) * u], 14, 3, () => [s, 0, 0]); }
  const places = []; for (let i = 0; i < Math.round(w / 0.6); i++) { const x = -hw + 0.3 + i * (w - 0.6) / Math.max(1, Math.round(w / 0.6) - 1); places.push([x, -d / 2 + 0.2, 1], [x, d / 2 - 0.2, -1]); }
  for (const [x, z, s] of places) { paint(c, "oklch(0.97 0.01 240)", "ceramic", 0.15); lathe(c, x, h + 0.004, z, [[0, 0], [0.09, 0], [0.13, 0.015], [0.125, 0.018], [0, 0.008]], 18); paint(c, "oklch(0.85 0.01 90)", "steel", 0.2, 0.95); for (const dx of [-0.16, 0.16, 0.19]) bx(c, x + dx - 0.006, x + dx + 0.006, h + 0.003, h + 0.008, z - 0.09, z + 0.09, 0.002);
    paint(c, "oklch(0.95 0.01 200)", null, 0.05); c.color("oklch(0.95 0.01 200)", 0.35); lathe(c, x + 0.14, h + 0.003, z + s * 0.14, [[0, 0], [0.03, 0], [0.004, 0.01], [0.004, 0.08], [0.035, 0.1], [0.04, 0.17], [0, 0.12]], 10); }
  BRASS(c); for (const x of [-0.2, 0.2]) { lathe(c, x, h + 0.003, 0, [[0, 0], [0.06, 0], [0.05, 0.02], [0.015, 0.05], [0.02, 0.18], [0.03, 0.2], [0, 0.2]], 12); paint(c, "oklch(0.95 0.02 90)", null, 0.6); lathe(c, x, h + 0.2, 0, [[0, 0], [0.012, 0], [0.012, 0.12 + x * 0.2], [0, 0.12 + x * 0.2]], 8); BRASS(c); } }
function wdesk(c, p) { const w = 1.25, d = 0.62, h = 0.76, hw = w / 2, zf = -d / 2, wood = p.wood ?? "walnut"; WOOD(c, wood);
  for (const s of [-1, 1]) { const x0 = s < 0 ? -hw : hw - 0.4, x1 = s < 0 ? -hw + 0.4 : hw; bx(c, x0, x1, 0.06, h - 0.04, zf, d / 2, 0.01); for (let i = 0; i < 3; i++) drawer(c, x0 + 0.025, x1 - 0.025, 0.1 + i * 0.2, 0.28 + i * 0.2, zf, wood, 1); }
  drawer(c, -hw + 0.42, hw - 0.42, h - 0.16, h - 0.05, zf + 0.02, wood, 1);
  WOOD(c, wood); bx(c, -hw - 0.02, hw + 0.02, h - 0.04, h, zf - 0.02, d / 2 + 0.01, 0.01); bx(c, -hw + 0.4, hw - 0.4, 0.1, h - 0.17, d / 2 - 0.03, d / 2, 0.004);
  paint(c, "oklch(0.55 0.1 150)", "leather", 0.6); bx(c, -hw + 0.06, hw - 0.06, h, h + 0.003, zf + 0.04, d / 2 - 0.04, 0.001);
  BRASS(c); lathe(c, 0.45, h, 0.15, [[0, 0], [0.09, 0], [0.09, 0.015], [0.02, 0.03], [0.015, 0.33], [0, 0.33]], 12); pipe(c, [0.45, h + 0.33, 0.15], [0.45, h + 0.36, 0.07], 0.008, 6);
  paint(c, "oklch(0.55 0.13 150)", null, 0.15, 0, "oklch(0.25 0.06 150)"); c.color("oklch(0.55 0.13 150)", 0.85); sheet(c, (u, v) => [0.45 + (u - 0.5) * 0.38, h + 0.33 + Math.sin(PI * v) * 0.06, 0.07 + (v - 0.5) * 0.16], 6, 6, () => [0, 1, 0]);
  paint(c, "oklch(0.98 0.02 85)", null, 0.6, 0, "oklch(1.4 0.08 80)"); puff(c, 0.45, h + 0.31, 0.07, 0.03, 0.03, 0.03, 8);
  paint(c, "oklch(0.95 0.03 85)", "paper"); bx(c, -0.25, 0.05, h + 0.003, h + 0.008, -0.1, 0.18, 0.001); paint(c, "oklch(0.2 0.02 260)", null, 0.1); lathe(c, -0.4, h, 0.12, [[0, 0], [0.04, 0], [0.04, 0.05], [0.015, 0.06], [0.012, 0.075], [0, 0.075]], 10);
  paint(c, "oklch(0.95 0.02 90)"); path(c, [[-0.4, h + 0.07, 0.12], [-0.33, h + 0.2, 0.08], [-0.3, h + 0.26, 0.06]], 0.006, 4); }
function vanity(c, p) { const w = 1.15, d = 0.48, h = 0.74, hw = w / 2, zf = -d / 2, wood = p.wood ?? "walnut"; WOOD(c, wood);
  for (const s of [-1, 1]) { const x0 = s < 0 ? -hw : hw - 0.34, x1 = s < 0 ? -hw + 0.34 : hw; bx(c, x0, x1, 0.12, h - 0.04, zf, d / 2, 0.01); for (let i = 0; i < 2; i++) drawer(c, x0 + 0.025, x1 - 0.025, 0.18 + i * 0.27, 0.42 + i * 0.27, zf, wood, 1); for (const x of [x0 + 0.04, x1 - 0.04]) cabriole(c, x, zf + 0.04, 0, 0.13, 0.02, Math.sign(x), -1); }
  WOOD(c, wood); bx(c, -hw - 0.02, hw + 0.02, h - 0.04, h, zf - 0.02, d / 2, 0.012); bx(c, -0.22, 0.22, h - 0.04, h + 0.62, d / 2 - 0.05, d / 2, 0.01);
  oval(c, 0, h + 0.38, d / 2 - 0.06, 0.2, 0.26);
  for (const s of [-1, 1]) { WOOD(c, wood); const cx = s * 0.36; bx(c, cx - 0.13, cx + 0.13, h + 0.02, h + 0.5, d / 2 - 0.12 + (s < 0 ? 0 : 0), d / 2 - 0.09, 0.008); paint(c, "oklch(0.78 0.01 90)", null, 0.04, 1); bx(c, cx - 0.11, cx + 0.11, h + 0.04, h + 0.48, d / 2 - 0.125, d / 2 - 0.12, 0); }
  const R = rng(p.seed ?? 51); for (let i = 0; i < 4; i++) { paint(c, `oklch(0.85 0.08 ${R() * 360})`, null, 0.05); c.color(`oklch(0.85 0.08 ${R() * 360})`, 0.6); const x = -0.15 + i * 0.1; lathe(c, x, h, -0.05, [[0, 0], [0.03, 0], [0.035, 0.04], [0.02, 0.08], [0.008, 0.09], [0, 0.09]], 10); BRASS(c); ball(c, x, h + 0.1, -0.05, 0.012, 6); }
  paint(c, "oklch(0.92 0.06 350)", "velvet"); puff(c, 0.32, h + 0.012, -0.08, 0.04, 0.012, 0.04, 10); }
function console(c, p) { const w = p.w ?? 1.2, d = 0.4, h = 0.84, hw = w / 2; WOOD(c, p.wood ?? "mahog");
  bx(c, -hw, hw, h - 0.035, h, -d / 2, d / 2, 0.012); const ap = (u, v) => [(u - 0.5) * (w - 0.08), h - 0.035 - v * (0.1 + 0.05 * Math.cos(PI * (u - 0.5) * 2) ** 2), -d / 2 + 0.03];
  sheet(c, ap, 12, 1, () => [0, 0, -1], false); bx(c, -hw + 0.04, hw - 0.04, h - 0.12, h - 0.035, -d / 2 + 0.035, d / 2 - 0.02, 0.004); drawer(c, -0.25, 0.25, h - 0.115, h - 0.045, -d / 2 + 0.03, p.wood, 1);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cabriole(c, x * (hw - 0.07), z * (d / 2 - 0.06), 0, h - 0.035, 0.024, x * 0.8, z * 0.4);
  GILT(c); for (const x of [-hw + 0.07, hw - 0.07]) ball(c, x, h - 0.08, -d / 2 + 0.02, 0.025, 8);
  deco(c, p.deco ?? "vase", -0.25, h, 0, p.seed ?? 6); if (p.deco2) deco(c, p.deco2, 0.3, h, 0, 8);
  if (p.mirror) { oval(c, 0, h + 0.85, d / 2 - 0.02, 0.32, 0.42); } }
function urn(c, p) { paint(c, p.col ?? "oklch(0.92 0.03 240)", "ceramic", 0.18); lathe(c, 0, 0, 0, [[0, 0], [0.14, 0], [0.12, 0.05], [0.09, 0.1], [0.2, 0.3], [0.24, 0.5], [0.2, 0.72], [0.1, 0.84], [0.09, 0.9], [0.14, 0.96], [0.12, 0.98], [0, 0.95]], 22);
  for (const s of [-1, 1]) { GILT(c); path(c, [[s * 0.11, 0.86, 0], [s * 0.2, 0.86, 0], [s * 0.22, 0.75, 0], [s * 0.2, 0.68, 0]], 0.012, 6); } }
function cart(c, p) { // the room-service trolley: cloth, a silver cloche (still warm?), a single rose
  const w = 0.9, d = 0.52, h = 0.8; paint(c, "oklch(0.85 0.01 90)", "steel", 0.25, 0.95);
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) { pipe(c, [x, 0.08, z], [x, h, z], 0.014, 8); lathe(c, x, 0, z, [[0, 0], [0.04, 0.0], [0.04, 0.06], [0, 0.06]], 10); }
  for (const y of [0.25, h]) { paint(c, "oklch(0.85 0.01 90)", "steel", 0.25, 0.95); bx(c, -w / 2, w / 2, y - 0.02, y, -d / 2, d / 2, 0.008); }
  path(c, [[-w / 2 - 0.02, h + 0.0, -d / 2 + 0.05], [-w / 2 - 0.1, h + 0.08, -d / 2 + 0.05], [-w / 2 - 0.1, h + 0.08, d / 2 - 0.05], [-w / 2 - 0.02, h, d / 2 - 0.05]], 0.012, 6);
  CLOTH(c, "oklch(0.97 0.01 90)", "cloth"); sheet(c, (u, v) => [(u - 0.5) * (w + 0.04), h + 0.003, (v - 0.5) * (d + 0.04)], 6, 3, () => [0, 1, 0]); for (const s of [-1, 1]) sheet(c, (u, v) => [(u - 0.5) * (w + 0.04 + v * 0.03), h + 0.003 - v * 0.3, s * (d / 2 + 0.02 + v * 0.015 + 0.01 * Math.sin(u * 20) * v)], 14, 2, () => [0, 0, s]);
  paint(c, "oklch(0.9 0.01 90)", "steel", 0.15, 1); lathe(c, -0.12, h + 0.003, 0, [[0, 0], [0.17, 0], [0.17, 0.01], [0.16, 0.06], [0.11, 0.13], [0.04, 0.16], [0, 0.165]], 22); lathe(c, -0.12, h + 0.16, 0, [[0, 0], [0.015, 0.0], [0.018, 0.025], [0, 0.03]], 10);
  paint(c, "oklch(0.95 0.01 200)", null, 0.05); c.color("oklch(0.95 0.01 200)", 0.4); lathe(c, 0.25, h + 0.003, 0.1, [[0, 0], [0.035, 0], [0.04, 0.2], [0.03, 0.22], [0, 0.21]], 10);
  paint(c, "oklch(0.35 0.08 140)"); pipe(c, [0.25, h + 0.05, 0.1], [0.27, h + 0.35, 0.1], 0.004, 4); paint(c, "oklch(0.35 0.15 20)", "velvet"); ball(c, 0.27, h + 0.37, 0.1, 0.03, 8, 0.9);
  paint(c, "oklch(0.97 0.01 240)", "ceramic", 0.15); for (const x of [0.1, 0.3]) lathe(c, x, 0.25, -0.05, [[0, 0], [0.11, 0], [0.12, 0.01], [0, 0.005]], 16); tea(c, 0.15, h + 0.003, -0.13, false); }
// ---------- dispatch ----------
// a faux window: cased frame, mullioned panes on a dark night beyond, sill, pelmet and two pleated velvet drapes
function window(c, p) { const w = p.w ?? 1.1, h = 1.3, hw = w / 2, rnd = ((p.seed ?? 1) * 9301 + 49297) % 233280 / 233280;
  paint(c, "oklch(0.2 0.03 250)", null, 0.1, 0, "oklch(0.16 0.04 250)"); bx(c, -hw, hw, 0, h, -0.03, -0.01, 0);
  paint(c, "oklch(0.93 0.02 85)", "paint", 0.5); bx(c, -hw - 0.08, -hw, -0.04, h + 0.06, -0.06, 0); bx(c, hw, hw + 0.08, -0.04, h + 0.06, -0.06, 0); bx(c, -hw - 0.08, hw + 0.08, h, h + 0.08, -0.06, 0);
  bx(c, -hw - 0.12, hw + 0.12, -0.06, 0, -0.14, 0, 0.015); bx(c, -0.02, 0.02, 0, h, -0.045, -0.02, 0.004); for (const f of [0.34, 0.67]) bx(c, -hw, hw, h * f - 0.018, h * f + 0.018, -0.045, -0.02, 0.004);
  WOODP(c); bx(c, -hw - 0.3, hw + 0.3, h + 0.22, h + 0.42, -0.2, 0, 0.02);
  paint(c, p.col ?? "oklch(0.55 0.12 25)", "velvet", 0.85); const cw = 0.34 + rnd * 0.08, n = 6;
  for (const sd of [-1, 1]) { const xo = sd * (hw + 0.24); for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, dz = i % 2 ? -0.11 : -0.06, a = xo - sd * cw * t0, b = xo - sd * cw * t1; bx(c, Math.min(a, b), Math.max(a, b), -0.85, h + 0.24, dz - 0.04, dz, 0.012); }
    paint(c, "oklch(0.85 0.1 85)", "brass", 0.35, 0.8); bx(c, xo - sd * cw * 0.5 - 0.02, xo - sd * cw * 0.5 + 0.02, 0.2, 0.25, -0.16, -0.05, 0.005); paint(c, p.col ?? "oklch(0.55 0.12 25)", "velvet", 0.85); } }
const WOODP = (c) => paint(c, "oklch(0.95 0.02 40)", "mahog", 0.42);
const K = { window, sofa, chair, stool, rtable, ctable, sidetable, wardrobe, dresser, nightstand, cabinet, bookshelf, bed, luggage, letter, birdcage, typewriter, hatstand, frontdesk, cubbies, palm, rug, clock, painting, ladder, maptable, lectern, tomes, range, counter, icebox, dtable, wdesk, vanity, console, urn, cart,
  armchair: (c, p) => sofa(c, { ...p, w: 1.0 }), teatray: (c, p) => tea(c, 0.15, 0, 0, true), openbag: (c, p) => luggage(c, { ...p, open: true }) };
export function geometry(ctx) { const p = ctx.params ?? {}; (K[p.kind] ?? K.dresser)(ctx, p); }
const B = (w, h, d, cx = 0, cz = 0, y0 = 0) => box([cx - w / 2, cx + w / 2, y0, y0 + h, cz - d / 2, cz + d / 2]);
export function collider(ctx) {
  const p = ctx.params ?? {};
  switch (p.kind) {
    case "sofa": return B(p.w ?? 2.1, 0.78, 0.9); case "armchair": return B(1.0, 0.78, 0.9); case "chair": return B(0.46, 0.95, 0.46); case "stool": return B(0.4, 0.46, 0.4);
    case "rtable": return [B(0.9, 0.2, 0.9), B(0.3, 0.7, 0.3), B(2 * (p.r ?? 0.6), 0.06, 2 * (p.r ?? 0.6), 0, 0, 0.71)]; case "ctable": return B(p.w ?? 1.2, 0.47, p.d ?? 0.6);
    case "sidetable": return B(0.5, p.h ?? 0.68, 0.4); case "wardrobe": return B(p.w ?? 1.1, 2.05, 0.6); case "dresser": return B(p.w ?? 1.1, 0.86, 0.52); case "nightstand": return B(0.5, 0.62, 0.42);
    case "cabinet": return B(1.0, 1.95, 0.46); case "bookshelf": return B(p.w ?? 1.6, p.h ?? 2.2, 0.42); case "bed": return [B((p.w ?? 1.4) + 0.08, 0.66, 2.05), B((p.w ?? 1.4) + 0.08, 1.25, 0.1, 0, 0.98)];
    case "luggage": case "openbag": return B(0.72, 0.5, 0.48); case "hatstand": return { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.25, height: 1.8 };
    case "frontdesk": return B(p.w ?? 3.6, p.h ?? 1.12, 0.78); case "cubbies": return B(p.w ?? 1.9, 2.6, 0.36); case "palm": return { kind: "cylinder", radiusTop: 0.3, radiusBottom: 0.22, height: 0.65 };
    case "clock": return B(0.6, 2.2, 0.4); case "ladder": return null; case "maptable": return B(2.2, 0.82, 1.2); case "lectern": return B(0.6, 1.1, 0.5); case "tomes": return null;
    case "range": return B(1.3, 0.95, 0.72); case "counter": return B(p.w ?? 2.0, p.h ?? 1.0, 0.67); case "icebox": return B(0.9, 1.52, 0.62); case "dtable": return B((p.w ?? 1.8) + 0.04, 0.78, 0.94);
    case "wdesk": return B(1.27, 0.76, 0.64); case "vanity": return B(1.17, 0.76, 0.5); case "console": return B(p.w ?? 1.2, 0.84, 0.4); case "urn": return { kind: "cylinder", radiusTop: 0.15, radiusBottom: 0.22, height: 0.95 };
    case "cart": return B(1.0, 0.82, 0.56); case "birdcage": return B(0.34, 0.6, 0.34);
    default: return null; // rugs, paintings, letters, typewriters, tea: nothing to stub a toe on
  }
}
