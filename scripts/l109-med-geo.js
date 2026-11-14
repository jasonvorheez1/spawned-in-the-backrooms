// Level 109 medical kit: the pieces the world has no fitted model for. params.part picks one. Origin = floor point unless said.
// ivstand | monitor {on} | surglamp {on} (origin = lamp head, mount 1.05 m above) | curtain {len, drawn} (rail along X)
// shutter {w, y0, y1, open} (along X) | cage {w, d, h} (gate on -Z) | sheet {w, h, strips} (along X) | tray | gas
// tiles {w, d} floor | tilewall {w, h} (faces -Z) | tape {w} floor line along X | paper {r, n}
import { face, tube, sphere } from "./lib/shapes.js";
import D from "./lib/data/l109-rooms.yml";
const STEEL = "#aab0b3", DARK = "#3a3d40", WHITE = "#e9e9e4";
let C;
function box(x0, y0, z0, x1, y1, z1) {
  face(C, [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1]); face(C, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
  face(C, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]); face(C, [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0]);
  face(C, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]); face(C, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0]);
}
function cyl(cx, cz, y0, y1, r0, r1 = r0, n = 12) {
  C.smooth();
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    face(C, [cx + ca * r0, y0, cz + sa * r0], [cx + cb * r0, y0, cz + sb * r0], [cx + cb * r1, y1, cz + sb * r1], [cx + ca * r1, y1, cz + sa * r1], [ca + cb, 0, sa + sb]); }
  C.flat();
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832;
    C.tri(cx, y1, cz, cx + Math.cos(b) * r1, y1, cz + Math.sin(b) * r1, cx + Math.cos(a) * r1, y1, cz + Math.sin(a) * r1);
    C.tri(cx, y0, cz, cx + Math.cos(a) * r0, y0, cz + Math.sin(a) * r0, cx + Math.cos(b) * r0, y0, cz + Math.sin(b) * r0); }
}
const rod = (a, b, r = 0.012) => { C.smooth(); tube(C, [a, b], [r, r], 6); C.flat(); };
function star(r, n = 5) { // a rolling base: legs and casters
  C.color(DARK); C.metalness(0.5); C.roughness(0.45);
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832 + 0.3, x = Math.cos(a) * r, z = Math.sin(a) * r; rod([0, 0.09, 0], [x, 0.06, z], 0.016); C.color("#1c1c1e"); sphere(C, [x, 0.03, z], 0.03, 8); C.color(DARK); }
  cyl(0, 0, 0.06, 0.12, 0.04);
}
function ivstand() {
  star(0.3); C.color(STEEL); C.metalness(0.8); C.roughness(0.3);
  cyl(0, 0, 0.12, 1.15, 0.016); cyl(0, 0, 1.15, 1.95, 0.011); cyl(0, 0, 1.12, 1.18, 0.024);
  for (const s of [-1, 1]) { rod([0, 1.94, 0], [s * 0.16, 1.97, 0], 0.006); rod([s * 0.16, 1.97, 0], [s * 0.16, 1.9, 0], 0.006); }
  C.metalness(0); C.roughness(0.25); C.color("#e6f3f6", 0.5); box(0.1, 1.62, -0.018, 0.22, 1.88, 0.018);
  C.color("#dfe7e9", 0.7); rod([0.16, 1.62, 0], [0.16, 1.5, 0], 0.004); rod([0.16, 1.5, 0], [0.03, 1.05, 0.02], 0.004);
  C.color(WHITE); box(0.14, 1.47, -0.012, 0.18, 1.53, 0.012);
}
function monitor(on) {
  star(0.26); C.color(STEEL); C.metalness(0.7); C.roughness(0.35); cyl(0, 0, 0.12, 1.12, 0.018);
  C.metalness(0.1); C.roughness(0.6); C.color("#d9d6c8"); box(-0.17, 0.62, -0.13, 0.17, 0.64, 0.13); box(-0.19, 1.12, -0.09, 0.19, 1.42, 0.07); box(-0.08, 1.06, -0.05, 0.08, 1.12, 0.05);
  C.color("#0b100e"); C.roughness(0.15); if (on) C.emissive(0.02, 0.07, 0.04);
  face(C, [-0.16, 1.16, -0.092], [0.1, 1.16, -0.092], [0.1, 1.39, -0.092], [-0.16, 1.39, -0.092], [0, 0, -1]); C.emissive(null);
  if (on) { const rows = [[1.33, [0.3, 3.2, 0.5]], [1.27, [3, 2.4, 0.3]], [1.21, [2.6, 1.6, 0.25]]];
    for (const [y, e] of rows) { C.color(e[0] > 2 ? "#ffd24a" : "#4dff8a"); C.emissive(...e); let px = -0.15, py = y;
      for (let i = 1; i <= 16; i++) { const x = -0.15 + i * 0.015, k = i % 8, ny = y + (k === 3 ? 0.03 : k === 4 ? -0.015 : 0); C.quad(px, py - 0.003, -0.094, x, ny - 0.003, -0.094, x, ny + 0.003, -0.094, px, py + 0.003, -0.094); px = x; py = ny; } }
    C.emissive(null); }
  C.color("#8a8f92"); for (let i = 0; i < 3; i++) box(0.115, 1.19 + i * 0.07, -0.096, 0.16, 1.23 + i * 0.07, -0.09);
  C.color(DARK); rod([0.19, 1.2, 0], [0.26, 0.9, 0.05], 0.005); rod([0.26, 0.9, 0.05], [0.12, 0.66, 0.08], 0.005);
}
function surglamp(on) {
  C.color(WHITE); C.metalness(0.2); C.roughness(0.4); cyl(0, 0, 1.0, 1.05, 0.14); cyl(0, 0, 0.62, 1.0, 0.03);
  rod([0, 0.64, 0], [0.62, 0.56, 0], 0.028); sphere(C, [0.62, 0.56, 0], 0.05, 10); rod([0.62, 0.56, 0], [0.3, 0.26, 0], 0.024); sphere(C, [0.3, 0.26, 0], 0.045, 10); rod([0.3, 0.26, 0], [0, 0.16, 0], 0.022);
  cyl(0, 0, 0.02, 0.1, 0.38, 0.36, 20); cyl(0, 0, 0.1, 0.18, 0.36, 0.14, 20);
  C.color("#f4f1e4"); if (on) C.emissive(3.2, 3.0, 2.5); else C.color("#9c9a90");
  for (let i = 0; i < 7; i++) { const a = (i / 6) * 6.2832, r = i === 6 ? 0 : 0.22, x = Math.cos(a) * r, z = Math.sin(a) * r, n = 12, rr = 0.085;
    for (let k = 0; k < n; k++) { const p = (k / n) * 6.2832, q = ((k + 1) / n) * 6.2832; C.tri(x, 0.018, z, x + Math.cos(p) * rr, 0.018, z + Math.sin(p) * rr, x + Math.cos(q) * rr, 0.018, z + Math.sin(q) * rr); } }
  C.emissive(null); C.color(STEEL); C.metalness(0.8); cyl(0, 0, -0.1, 0.02, 0.018);
}
function curtain(len, drawn) {
  const h = len / 2; C.color(STEEL); C.metalness(0.7); C.roughness(0.35); box(-h, 2.1, -0.015, h, 2.13, 0.015);
  for (const x of [-h + 0.2, 0, h - 0.2]) rod([x, 2.13, 0], [x, 3.0, 0], 0.008);
  C.metalness(0); C.roughness(0.85); const span = len * drawn, n = Math.max(4, Math.round(span / 0.11)), x0 = -h + 0.05;
  for (let i = 0; i < n; i++) { const xa = x0 + (i / n) * span, xb = x0 + ((i + 1) / n) * span, za = i % 2 ? 0.045 : -0.045, zb = -za, sway = 0.02 * Math.sin(i * 1.7);
    C.color(i % 2 ? "#b4d2ca" : "#a6c6bd"); C.quad(xa, 0.32, za + sway, xb, 0.32, zb + sway, xb, 2.08, zb, xa, 2.08, za);
    C.color(STEEL); if (i % 2 === 0) box(xa - 0.006, 2.07, -0.006, xa + 0.006, 2.1, 0.006); }
}
function shutter(w, y0, y1, open) {
  const h = w / 2, bot = y0 + (y1 - y0) * open; C.color("#8d9296"); C.metalness(0.6); C.roughness(0.45);
  box(-h - 0.05, y0, -0.04, -h, y1, 0.04); box(h, y0, -0.04, h + 0.05, y1, 0.04); box(-h - 0.05, y1, -0.14, h + 0.05, y1 + 0.26, 0.14);
  C.color("#a3a8ab"); const n = Math.round((y1 - bot) / 0.075);
  for (let i = 0; i < n; i++) { const ya = bot + i * 0.075, ym = ya + 0.0375, yb = ya + 0.075; C.quad(-h, ya, 0.012, h, ya, 0.012, h, ym, -0.016, -h, ym, -0.016); C.quad(-h, ym, -0.016, h, ym, -0.016, h, yb, 0.012, -h, yb, 0.012); }
  C.color(DARK); box(-h, bot - 0.04, -0.025, h, bot, 0.025); box(-0.09, bot - 0.02, -0.05, 0.09, bot + 0.05, -0.02);
}
function meshPanel(ax, a0, a1, c, h) { // diamond wire between a0..a1 on the plane (ax === "x": along X at z = c)
  const P = (u, y) => (ax === "x" ? [u, y, c] : [c, y, u]), step = 0.14, t = 0.006, L = a1 - a0;
  for (const dir of [1, -1]) for (let s = -h; s < L; s += step) {
    let u0 = s, y0 = 0.08, u1 = s + h, y1 = h; if (u0 < 0) { y0 += -u0; u0 = 0; } if (u1 > L) { y1 -= u1 - L; u1 = L; } if (y1 <= y0) continue;
    const A = dir > 0 ? a0 + u0 : a1 - u0, B = dir > 0 ? a0 + u1 : a1 - u1; C.quad(...P(A - t, y0), ...P(A + t, y0), ...P(B + t, y1), ...P(B - t, y1)); }
}
const GATE = 1.1;
function cage(w, d, h) {
  const x = w / 2, z = d / 2, g = GATE / 2; C.color("#6f7578"); C.metalness(0.7); C.roughness(0.4);
  for (const [px, pz] of [[-x, -z], [x, -z], [-x, z], [x, z], [-g, -z], [g, -z]]) box(px - 0.03, 0, pz - 0.03, px + 0.03, h, pz + 0.03);
  for (const y of [0.05, h - 0.03]) { box(-x, y, z - 0.02, x, y + 0.04, z + 0.02); box(-x - 0.02, y, -z, -x + 0.02, y + 0.04, z); box(x - 0.02, y, -z, x + 0.02, y + 0.04, z); if (y > 1) box(-x, y, -z - 0.02, x, y + 0.04, -z + 0.02); else { box(-x, y, -z - 0.02, -g, y + 0.04, -z + 0.02); box(g, y, -z - 0.02, x, y + 0.04, -z + 0.02); } }
  C.color("#8b9194"); meshPanel("x", -x, x, z, h); meshPanel("z", -z, z, -x, h); meshPanel("z", -z, z, x, h); meshPanel("x", -x, -g, -z, h); meshPanel("x", g, x, -z, h);
  // the gate, swung outward on its left post
  const ca = Math.cos(1.25), sa = Math.sin(1.25), G = (u, y) => [-g + u * ca, y, -z - u * sa]; C.color("#6f7578");
  for (const u of [0, GATE - 0.04]) face(C, G(u, 0.06), G(u + 0.04, 0.06), G(u + 0.04, 2.05), G(u, 2.05), [sa, 0, -ca]);
  for (const y of [0.06, 1.05, 2.01]) face(C, G(0, y), G(GATE, y), G(GATE, y + 0.04), G(0, y + 0.04), [sa, 0, -ca]);
  C.color("#8b9194"); for (let s = 0.1; s < GATE; s += 0.14) face(C, G(s, 0.1), G(s + 0.012, 0.1), G(s + 0.012, 2.0), G(s, 2.0), [sa, 0, -ca]);
  for (let y = 0.2; y < 2; y += 0.14) face(C, G(0.04, y), G(GATE - 0.04, y), G(GATE - 0.04, y + 0.012), G(0.04, y + 0.012), [sa, 0, -ca]);
  C.color("#c9a227"); C.metalness(0.8); box(-g + GATE * ca - 0.04, 1.0, -z - GATE * sa - 0.03, -g + GATE * ca + 0.04, 1.1, -z - GATE * sa + 0.03);
}
function sheet(w, h, strips) {
  const x = w / 2; C.color("#c9ccc8"); C.metalness(0.4); C.roughness(0.5); cyl(-x, 0, 0, h, 0.022); cyl(x, 0, 0, h, 0.022); box(-x, h - 0.04, -0.02, x, h, 0.02);
  for (const px of [-x, x]) cyl(px, 0, 0, 0.02, 0.09);
  C.metalness(0); C.roughness(0.12);
  if (strips) { const n = Math.round(w / 0.19); for (let i = 0; i < n; i++) { const xa = -x + 0.03 + (i / n) * (w - 0.06), xb = xa + (w - 0.06) / n + 0.03, k = C.random(), zb = (k - 0.5) * 0.12, lift = k > 0.85 ? 0.5 : 0.04;
      C.color(i % 2 ? "#e4efe9" : "#d6e6df", 0.3); C.quad(xa, lift, zb + (i % 2 ? 0.012 : -0.012), xb, lift, zb + (i % 2 ? 0.012 : -0.012), xb, h - 0.04, i % 2 ? 0.012 : -0.012, xa, h - 0.04, i % 2 ? 0.012 : -0.012); } }
  else { const n = Math.max(6, Math.round(w / 0.4)); for (let i = 0; i < n; i++) { const xa = -x + (i / n) * w, xb = -x + ((i + 1) / n) * w, za = 0.035 * Math.sin(i * 1.9), zb = 0.035 * Math.sin((i + 1) * 1.9);
      C.color(i % 3 ? "#dbe8e2" : "#e8f1ec", 0.26); C.quad(xa, 0.02, za * 1.6, xb, 0.02, zb * 1.6, xb, h - 0.04, zb, xa, h - 0.04, za); }
    C.color("#b8bcb6", 0.8); for (const y of [0.9, 1.8]) C.quad(-x, y, 0.04, x, y, 0.04, x, y + 0.04, 0.04, -x, y + 0.04, 0.04); }
}
function tray() {
  C.color(STEEL); C.metalness(0.85); C.roughness(0.28);
  for (const z of [-0.18, 0.18]) { rod([-0.24, 0.06, z], [0.24, 0.06, z], 0.014); for (const xx of [-0.24, 0.24]) { C.color("#1c1c1e"); sphere(C, [xx, 0.03, z], 0.028, 8); C.color(STEEL); } }
  rod([0.24, 0.06, -0.18], [0.24, 0.06, 0.18], 0.014); cyl(0.24, 0, 0.06, 0.95, 0.017); rod([0.24, 0.95, 0], [0, 0.95, 0], 0.014);
  box(-0.27, 0.96, -0.19, 0.27, 0.975, 0.19); for (const [a, b, c, d] of [[-0.27, -0.19, 0.27, -0.18], [-0.27, 0.18, 0.27, 0.19], [-0.27, -0.19, -0.26, 0.19], [0.26, -0.19, 0.27, 0.19]]) box(a, 0.975, b, c, 1.0, d);
  C.metalness(0); C.roughness(0.9); C.color("#6d9fb5"); box(-0.23, 0.975, -0.15, 0.2, 0.981, 0.15);
  C.metalness(0.9); C.roughness(0.2); C.color("#c9ced1"); for (let i = 0; i < 6; i++) { const z = -0.12 + i * 0.045, l = 0.1 + C.random() * 0.07; box(-0.18, 0.981, z, -0.18 + l, 0.988, z + 0.012); }
  cyl(0.12, 0.06, 0.981, 1.02, 0.05, 0.055, 12);
}
function gas() {
  C.color(DARK); C.metalness(0.4); C.roughness(0.5); box(-0.26, 0.08, -0.18, 0.26, 0.13, 0.18);
  for (const xx of [-0.22, 0.22]) for (const z of [-0.15, 0.15]) { C.color("#1c1c1e"); sphere(C, [xx, 0.04, z], 0.04, 8); }
  const tanks = [[-0.13, "#eeeeea", "#2f8f5b"], [0.13, "#eeeeea", "#3b6fb0"]];
  for (const [x, body, top] of tanks) { C.metalness(0.3); C.roughness(0.35); C.color(body); cyl(x, 0, 0.13, 1.02, 0.095, 0.095, 14); C.color(top); cyl(x, 0, 1.02, 1.12, 0.095, 0.04, 14); C.color(STEEL); C.metalness(0.8); cyl(x, 0, 1.12, 1.2, 0.025); box(x - 0.05, 1.17, -0.012, x + 0.05, 1.19, 0.012); }
  C.color("#d9d6c8"); C.metalness(0.1); C.roughness(0.6); box(-0.12, 1.2, -0.1, 0.12, 1.42, -0.02); C.color("#cfe3ea", 0.6); for (const x of [-0.06, 0, 0.06]) cyl(x, -0.11, 1.24, 1.39, 0.012, 0.014, 8);
  C.color("#20262a"); C.roughness(0.7); rod([0.1, 1.25, -0.06], [0.3, 0.95, -0.12], 0.012); sphere(C, [0.32, 0.86, -0.12], 0.09, 10, [0.8, 1.2, 0.8]);
  C.color(STEEL); C.metalness(0.8); rod([-0.26, 0.13, 0.17], [-0.26, 1.05, 0.2], 0.012); rod([0.26, 0.13, 0.17], [0.26, 1.05, 0.2], 0.012); rod([-0.26, 1.05, 0.2], [0.26, 1.05, 0.2], 0.012);
}
function paper(r, n) {
  C.roughness(0.9);
  for (let i = 0; i < n; i++) { const a = C.random() * 6.2832, d = Math.sqrt(C.random()) * r, x = Math.cos(a) * d, z = Math.sin(a) * d, t = C.random() * 6.2832, y = 0.004 + i * 0.0007, c = Math.cos(t), s = Math.sin(t), w = 0.105, l = 0.1485;
    const p = (u, v) => [x + u * c - v * s, y, z + u * s + v * c]; C.color(["#eeeadc", "#e3dfd0", "#f3f0e6", "#d9d4c0"][i % 4]);
    face(C, p(-w, -l), p(w, -l), p(w, l), p(-w, l), [0, 1, 0]);
    if (i % 3 === 0) { C.color("#8c8a82"); for (let k = 0; k < 4; k++) face(C, p(-w * 0.75, -l * 0.6 + k * 0.05), p(w * 0.6, -l * 0.6 + k * 0.05), p(w * 0.6, -l * 0.6 + k * 0.05 + 0.008), p(-w * 0.75, -l * 0.6 + k * 0.05 + 0.008), [0, 1, 0].map((v, j) => (j === 1 ? 1 : 0))); } }
}
function tape(w) {
  const h = w / 2, n = Math.round(w / 0.3); C.roughness(0.6);
  for (let i = 0; i < n; i++) { const xa = -h + (i / n) * w, xb = -h + ((i + 1) / n) * w; C.color(i % 2 ? "#17150f" : "#e8c21a"); C.quad(xa, 0.006, -0.07, xa + 0.07, 0.006, 0.07, xb + 0.07, 0.006, 0.07, xb, 0.006, -0.07); }
}
export function geometry(ctx) {
  C = ctx; const p = ctx.params ?? {};
  switch (p.part) {
    case "ivstand": ivstand(); break;
    case "monitor": monitor(!!p.on); break;
    case "surglamp": surglamp(!!p.on); break;
    case "curtain": curtain(p.len ?? 3, p.drawn ?? 0.6); break;
    case "shutter": shutter(p.w ?? 4, p.y0 ?? 0.95, p.y1 ?? 2.3, p.open ?? 0); break;
    case "cage": cage(p.w ?? 4, p.d ?? 4, p.h ?? 2.4); break;
    case "sheet": sheet(p.w ?? 4, p.h ?? 2.5, !!p.strips); break;
    case "tray": tray(); break;
    case "gas": gas(); break;
    case "paper": paper(p.r ?? 1.5, p.n ?? 12); return;
    case "tape": tape(p.w ?? 10); return;
    case "tiles": { const x = (p.w ?? 8) / 2, z = (p.d ?? 8) / 2; C.albedo(D.tile); C.roughness(0.25); C.color("#f2f2ee"); C.quad(-x, 0.008, z, x, 0.008, z, x, 0.008, -z, -x, 0.008, -z); C.albedo(null); return; }
    case "tilewall": { const x = (p.w ?? 6) / 2, h = p.h ?? 1.8; C.albedo(D.tile); C.roughness(0.25); C.color("#f2f2ee"); C.quad(x, 0, 0, -x, 0, 0, -x, h, 0, x, h, 0); C.albedo(null); C.color("#cfd2d0"); box(-x, h, -0.02, x, h + 0.04, 0); return; }
  }
}
export function collider(ctx) {
  const p = ctx.params ?? {};
  if (p.part === "cage") { const w = p.w ?? 4, d = p.d ?? 4, h = p.h ?? 2.4, s = (w - GATE) / 2; return [
    { kind: "box", width: w, height: h, depth: 0.08, center: [0, h / 2, d / 2] }, { kind: "box", width: 0.08, height: h, depth: d, center: [-w / 2, h / 2, 0] }, { kind: "box", width: 0.08, height: h, depth: d, center: [w / 2, h / 2, 0] },
    { kind: "box", width: s, height: h, depth: 0.08, center: [-w / 2 + s / 2, h / 2, -d / 2] }, { kind: "box", width: s, height: h, depth: 0.08, center: [w / 2 - s / 2, h / 2, -d / 2] }]; }
  if (p.part === "shutter") { const y0 = p.y0 ?? 0.95, y1 = p.y1 ?? 2.3, bot = y0 + (y1 - y0) * (p.open ?? 0); return { kind: "box", width: p.w ?? 4, height: y1 + 0.26 - bot, depth: 0.08, center: [0, (y1 + 0.26 + bot) / 2, 0] }; }
  if (p.part === "sheet" && !p.strips) return { kind: "box", width: p.w ?? 4, height: p.h ?? 2.5, depth: 0.08, center: [0, (p.h ?? 2.5) / 2, 0] };
  if (p.part === "gas") return { kind: "box", width: 0.55, height: 1.3, depth: 0.4, center: [0, 0.65, 0] };
  return [];
}
