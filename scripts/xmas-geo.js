// Christmas Area props, one scripted mesh per kind (params.kind). Smooth lathes, bent tubes, chamfered boxes; −Z is the front.
import { paint, bx, lathe, ball, pipe, q, t3 } from "./lib/l5-hall-kit.js";
const T = (n) => `cdn/texture-${n}.png`;
const P2 = Math.PI * 2;
function needleCone(ctx, y0, R, h, M, sd) { // a ragged, drooping bough layer
  ctx.smooth();
  const r = (a) => R * (1 + 0.14 * Math.sin(a * 7 + sd) + 0.06 * Math.sin(a * 13 + sd * 2)), dr = (a) => y0 - 0.07 * (1 + Math.sin(a * 7 + sd));
  for (let k = 0; k < M; k++) {
    const a0 = (k / M) * P2, a1 = ((k + 1) / M) * P2, am = (a0 + a1) / 2;
    const p0 = [Math.cos(a0) * r(a0), dr(a0), Math.sin(a0) * r(a0)], p1 = [Math.cos(a1) * r(a1), dr(a1), Math.sin(a1) * r(a1)];
    const m0 = [p0[0] * 0.55, y0 + h * 0.4, p0[2] * 0.55], m1 = [p1[0] * 0.55, y0 + h * 0.4, p1[2] * 0.55], out = [Math.cos(am), 0.7, Math.sin(am)];
    q(ctx, p0, p1, m1, m0, out); t3(ctx, m0, m1, [0, y0 + h, 0], out); t3(ctx, p0, p1, [0, y0 + 0.08, 0], [0, -1, 0]);
  }
  ctx.flat();
}
function disc(ctx, cx, cy, cz, R, M = 24) { for (let k = 0; k < M; k++) { const a0 = (k / M) * P2, a1 = ((k + 1) / M) * P2; t3(ctx, [cx, cy, cz], [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cz], [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, cz], [0, 0, -1]); } }
function striped(ctx, pts, rad, seg = 0.07) { // candy stripe: alternating red / white lengths along a bent path
  const L = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const n = Math.max(1, Math.round(d / seg)); for (let j = 0; j < n; j++) L.push([a.map((v, k) => v + (b[k] - v) * (j / n)), a.map((v, k) => v + (b[k] - v) * ((j + 1) / n))]); }
  L.forEach(([a, b], i) => { paint(ctx, i % 3 === 0 ? "#f4efe8" : i % 3 === 1 ? "#c41a22" : "#f4efe8", null, 0.28, 0); pipe(ctx, a, b, rad, 12, rad, false); });
  paint(ctx, "#f4efe8", null, 0.28); ball(ctx, ...pts[0], rad, 12); ball(ctx, ...pts[pts.length - 1], rad, 12);
}
const hook = (h, R = 0.15) => { const p = [[0, 0, 0], [0, h - R, 0]]; for (let i = 1; i <= 10; i++) { const a = Math.PI - (i / 10) * Math.PI * 1.15; p.push([R + Math.cos(a) * R, h - R + Math.sin(a) * R, 0]); } return p; };
const B = {
  tree(ctx) {
    paint(ctx, "#5a3a22", T("rough-dark-tree-bark"), 0.9); lathe(ctx, 0, 0.05, 0, [[0, 0], [0.07, 0], [0.06, 0.5], [0, 0.5]], 10);
    paint(ctx, "#8a2a20", null, 0.7); lathe(ctx, 0, 0, 0, [[0, 0], [0.24, 0], [0.27, 0.18], [0.2, 0.22], [0, 0.22]], 16); // the stand
    paint(ctx, "#ffffff", T("dense-dark-green-pine-needles"), 0.85);
    const LY = [[0.38, 0.95, 0.85], [0.78, 0.8, 0.75], [1.12, 0.64, 0.65], [1.44, 0.48, 0.55], [1.72, 0.32, 0.5]];
    const M = ctx.lod >= 3 ? 10 : 24; LY.forEach(([y, R, h], i) => needleCone(ctx, y, R, h, M, i * 1.7));
    if (ctx.lod <= 2) {
      const cols = ["#b0141c", "#d4a02a", "#1f6a3a", "#b0141c", "#2a4aa8", "#d8d0c8"];
      LY.forEach(([y, R], i) => { const n = 7 - i; for (let k = 0; k < n; k++) { const a = (k / n) * P2 + i; paint(ctx, cols[(k + i) % cols.length], null, 0.18, 0.7); ball(ctx, Math.cos(a) * R * 0.78, y + 0.02, Math.sin(a) * R * 0.78, 0.045, 10); } });
      // garland: a gold bead spiral
      paint(ctx, "#e6b84a", null, 0.3, 0.8, "#3a2a08"); for (let i = 0; i < 90; i++) { const t = i / 90, y = 0.45 + t * 1.6, R = 0.9 * (1 - t) + 0.12, a = t * P2 * 4; ball(ctx, Math.cos(a) * R, y, Math.sin(a) * R, 0.018, 6); }
    }
    paint(ctx, "#fff2b0", null, 0.3, 0.2, "#ffe08a"); // the star
    for (let k = 0; k < 10; k++) { const a0 = (k / 10) * P2, a1 = ((k + 1) / 10) * P2, r0 = k % 2 ? 0.07 : 0.17, r1 = k % 2 ? 0.17 : 0.07; for (const s of [-1, 1]) t3(ctx, [0, 2.38, s * 0.03], [Math.sin(a0) * r0, 2.38 + Math.cos(a0) * r0, 0], [Math.sin(a1) * r1, 2.38 + Math.cos(a1) * r1, 0], [0, 0, s]); }
  },
  skirt(ctx) { paint(ctx, "#ffffff", T("deep-red-velvet-upholstery-fabric"), 0.8); ctx.smooth(); const M = 40, R = 1.05; for (let k = 0; k < M; k++) { const a0 = (k / M) * P2, a1 = ((k + 1) / M) * P2, f = (a) => R * (1 + 0.05 * Math.sin(a * 9)), y = (a) => 0.02 + 0.03 * Math.sin(a * 9) ** 2; t3(ctx, [0, 0.06, 0], [Math.cos(a1) * f(a1), y(a1), Math.sin(a1) * f(a1)], [Math.cos(a0) * f(a0), y(a0), Math.sin(a0) * f(a0)], [0, 1, 0]); } ctx.flat(); paint(ctx, "#f2ece2", null, 0.9); lathe(ctx, 0, 0, 0, [[R * 0.98, 0], [R * 1.08, 0.02], [R * 1.08, 0.05], [R * 0.98, 0.06]], 40); },
  cane(ctx) { const p = ctx.params, h = p.h ?? 1.8, r = p.r ?? 0.04; striped(ctx, p.hook ? hook(h, 0.17) : [[0, 0, 0], [0, h, 0]], r, 0.09); },
  crook(ctx) { striped(ctx, hook(1.0, 0.12), 0.026, 0.06); },
  clock(ctx) {
    paint(ctx, "#ffffff", T("rich-walnut-wood-grain-varnished"), 0.5);
    bx(ctx, -0.3, 0.3, 0, 0.18, -0.2, 0.2, 0.02); bx(ctx, -0.24, 0.24, 0.18, 1.6, -0.16, 0.16, 0.015); bx(ctx, -0.29, 0.29, 1.6, 2.2, -0.19, 0.19, 0.02); lathe(ctx, 0, 2.2, 0, [[0.27, 0], [0.3, 0.04], [0.18, 0.18], [0, 0.22]], 18, true, 1, 0.6);
    paint(ctx, "#1a1008", null, 0.15, 0.3); bx(ctx, -0.15, 0.15, 0.4, 1.45, -0.17, -0.16, 0.004); // dark glass
    paint(ctx, "#c8a050", null, 0.3, 0.9); pipe(ctx, [0, 1.5, -0.12], [0.03, 0.75, -0.12], 0.008, 6); lathe(ctx, 0.03, 0.62, -0.12, [[0, 0], [0.07, 0.04], [0.07, 0.06], [0, 0.1]], 14);
    paint(ctx, "#f2e0b0", null, 0.4, 0, "#ffc870"); disc(ctx, 0, 1.9, -0.195, 0.2, 28);
    paint(ctx, "#2a1a0c", null, 0.5); pipe(ctx, [0, 1.9, -0.2], [0.11, 1.95, -0.2], 0.007, 6); pipe(ctx, [0, 1.9, -0.2], [-0.04, 1.75, -0.2], 0.007, 6);
    paint(ctx, "#c8a050", null, 0.3, 0.9); pipe(ctx, [0, 1.9, -0.2], [0, 1.9, -0.201], 0.215, 28, 0.215, false);
  },
  present(ctx) {
    const p = ctx.params, w = p.w ?? 0.4, h = p.h ?? 0.3, d = p.d ?? 0.35;
    paint(ctx, p.col ?? "#b01c22", T("glossy-christmas-wrapping-paper-pattern"), 0.5); bx(ctx, -w / 2, w / 2, 0, h, -d / 2, d / 2, 0.012);
    paint(ctx, p.rib ?? "#e8c050", null, 0.3, 0.5); bx(ctx, -0.03, 0.03, -0.004, h + 0.004, -d / 2 - 0.004, d / 2 + 0.004, 0.004); bx(ctx, -w / 2 - 0.004, w / 2 + 0.004, -0.004, h + 0.004, -0.03, 0.03, 0.004);
    for (const s of [-1, 1]) ball(ctx, s * 0.06, h + 0.035, 0, 0.055, 10, 0.5, 1); ball(ctx, 0, h + 0.02, 0, 0.03, 8);
  },
  house(ctx) {
    paint(ctx, "#ffffff", T("white-vinyl-house-siding"), 0.8); bx(ctx, -0.32, 0.32, 0, 0.36, -0.24, 0.24, 0.01);
    paint(ctx, "#ffffff", T("dark-asphalt-roof-shingles"), 0.9); const R = (s) => q(ctx, [-0.36, 0.34, s * 0.28], [0.36, 0.34, s * 0.28], [0.36, 0.58, 0], [-0.36, 0.58, 0], [0, 1, s]); R(-1); R(1);
    paint(ctx, "#ffffff", T("white-vinyl-house-siding"), 0.8); for (const s of [-1, 1]) t3(ctx, [s * 0.32, 0.36, -0.24], [s * 0.32, 0.36, 0.24], [s * 0.32, 0.56, 0], [s, 0, 0]);
    paint(ctx, "#7a3a2a", T("red-clay-brick-wall"), 0.9); bx(ctx, 0.14, 0.22, 0.42, 0.66, 0.02, 0.1, 0.006);
    paint(ctx, "#ffcf7a", null, 0.4, 0, "#ff9a3a"); for (const x of [-0.18, 0.18]) bx(ctx, x - 0.06, x + 0.06, 0.15, 0.27, -0.248, -0.24, 0.003);
    paint(ctx, "#5a2a1a", null, 0.6); bx(ctx, -0.05, 0.05, 0, 0.22, -0.25, -0.24, 0.003);
  },
  wreath(ctx) {
    paint(ctx, "#ffffff", T("dense-dark-green-pine-needles"), 0.85); for (let k = 0; k < 22; k++) { const a = (k / 22) * P2; ball(ctx, Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0, 0.1, 8, 0.8, 1); }
    const cols = ["#ff5040", "#ffd060", "#60ff90", "#fff0c0"]; for (let k = 0; k < 16; k++) { const a = (k / 16) * P2 + 0.1; paint(ctx, cols[k % 4], null, 0.3, 0, cols[k % 4]); ball(ctx, Math.cos(a) * 0.38, Math.sin(a) * 0.38, -0.06, 0.022, 6); }
    paint(ctx, "#b0141c", T("deep-red-velvet-upholstery-fabric"), 0.6); for (const s of [-1, 1]) ball(ctx, s * 0.09, -0.34, -0.08, 0.08, 10, 0.6, 1); pipe(ctx, [0, -0.36, -0.08], [-0.06, -0.58, -0.08], 0.022, 6); pipe(ctx, [0, -0.36, -0.08], [0.07, -0.56, -0.08], 0.022, 6);
  },
  string(ctx) { // floor Christmas lights along +X
    const L = ctx.params.len ?? 6, cols = ["#ff3a30", "#ffc040", "#40ff70", "#4a7aff", "#ff60c0"];
    paint(ctx, "#102010", null, 0.7); pipe(ctx, [0, 0.015, 0], [L, 0.015, 0], 0.005, 4, 0.005, false);
    for (let i = 0, n = Math.floor(L / 0.25); i <= n; i++) { const c = cols[i % 5]; paint(ctx, c, null, 0.3, 0, c); lathe(ctx, i * 0.25, 0.012, 0.012 * Math.sin(i * 2.1), [[0, 0], [0.016, 0.01], [0.012, 0.04], [0, 0.05]], 8); }
  },
  chair(ctx) { // a wheelchair with its floor lamp grown through the frame
    paint(ctx, "#9aa0a6", null, 0.35, 0.8);
    for (const s of [-1, 1]) { const ring = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * P2; ring.push([s * 0.32, 0.3 + Math.sin(a) * 0.29, 0.05 + Math.cos(a) * 0.29]); } for (let k = 0; k < 24; k++) pipe(ctx, ring[k], ring[k + 1], 0.016, 8, 0.016, false);
      pipe(ctx, [s * 0.24, 0.48, -0.25], [s * 0.24, 0.48, 0.2], 0.014, 8); pipe(ctx, [s * 0.24, 0.48, 0.2], [s * 0.24, 1.0, 0.25], 0.014, 8); pipe(ctx, [s * 0.24, 0.48, -0.25], [s * 0.2, 0.1, -0.32], 0.012, 8); lathe(ctx, s * 0.2, 0, -0.32, [[0, 0], [0.05, 0], [0.05, 0.08], [0, 0.08]], 10); }
    paint(ctx, "#3a2a26", T("worn-black-vinyl-upholstery"), 0.6); bx(ctx, -0.23, 0.23, 0.46, 0.53, -0.24, 0.2, 0.02); bx(ctx, -0.23, 0.23, 0.55, 0.98, 0.2, 0.24, 0.02);
    paint(ctx, "#6a5a40", null, 0.4, 0.7); pipe(ctx, [0.42, 0, 0.1], [0.42, 1.75, 0.1], 0.015, 8); lathe(ctx, 0.42, 0, 0.1, [[0, 0], [0.16, 0], [0.16, 0.03], [0, 0.04]], 16);
    pipe(ctx, [0.42, 1.75, 0.1], [0.28, 1.85, -0.05], 0.012, 8);
    paint(ctx, "#ffffff", T("cream-silk-lampshade-fabric"), 0.8, 0, "#3a2810"); lathe(ctx, 0.28, 1.68, -0.05, [[0.2, 0], [0.11, 0.2], [0, 0.2]], 18);
  },
  table(ctx) { paint(ctx, "#ffffff", T("dark-mahogany-wood-grain-polished"), 0.4); lathe(ctx, 0, 0, 0, [[0, 0], [0.22, 0], [0.24, 0.04], [0.05, 0.1], [0.04, 0.6], [0.3, 0.64], [0.3, 0.68], [0, 0.69]], 20); },
  thermos(ctx) { paint(ctx, "#2a5a3a", T("scratched-worn-steel"), 0.4, 0.6); lathe(ctx, 0, 0, 0, [[0, 0], [0.045, 0], [0.047, 0.02], [0.047, 0.22], [0.035, 0.25], [0, 0.25]], 16); paint(ctx, "#c8c8c0", null, 0.3, 0.9); lathe(ctx, 0, 0.24, 0, [[0, 0], [0.04, 0], [0.04, 0.06], [0, 0.065]], 14); },
  cone(ctx) { paint(ctx, "#e85a14", null, 0.6); bx(ctx, -0.18, 0.18, 0, 0.03, -0.18, 0.18, 0.01); lathe(ctx, 0, 0.03, 0, [[0.13, 0], [0.03, 0.66], [0, 0.67]], 18); paint(ctx, "#f0f0f0", null, 0.3, 0, "#303030"); lathe(ctx, 0, 0.03, 0, [[0.105, 0.17], [0.075, 0.33], [0.074, 0.33], [0.104, 0.17]], 18, false); },
  sign(ctx) {
    paint(ctx, "#8a8e90", null, 0.4, 0.8); pipe(ctx, [0, 0, 0], [0, 2.0, 0], 0.025, 8); bx(ctx, -0.2, 0.2, 0, 0.04, -0.2, 0.2, 0.01);
    const d = (r, z) => q(ctx, [0, 1.95 - r, z], [r, 1.95, z], [0, 1.95 + r, z], [-r, 1.95, z], [0, 0, -1]);
    paint(ctx, "#111111", null, 0.5); d(0.36, -0.03); paint(ctx, "#f0c020", null, 0.45); d(0.33, -0.032); paint(ctx, "#111111", null, 0.5); bx(ctx, -0.025, 0.025, 1.9, 2.12, -0.04, -0.033, 0.003); bx(ctx, -0.025, 0.025, 1.8, 1.85, -0.04, -0.033, 0.003);
  },
  window(ctx) { const w = ctx.params.w ?? 2, h = ctx.params.h ?? 1.3; paint(ctx, "#ffffff", T("matte-white-painted-plaster-wall"), 0.8); bx(ctx, -w / 2 - 0.08, w / 2 + 0.08, -0.08, 0, -0.05, 0.05, 0.01); bx(ctx, -w / 2 - 0.08, w / 2 + 0.08, h, h + 0.08, -0.05, 0.05, 0.01); for (const s of [-1, 1]) bx(ctx, s * (w / 2 + 0.04) - 0.04, s * (w / 2 + 0.04) + 0.04, 0, h, -0.05, 0.05, 0.01); bx(ctx, -0.025, 0.025, 0, h, -0.04, 0.04, 0.005);
    paint(ctx, "#fffaf0", null, 0.9, 0, "#fff4dc"); q(ctx, [-w / 2, 0, 0.02], [w / 2, 0, 0.02], [w / 2, h, 0.02], [-w / 2, h, 0.02], [0, 0, -1]); },
  frame(ctx) { const w = ctx.params.w ?? 2, h = ctx.params.h ?? 2.3; paint(ctx, "#ffffff", T("worn-hardwood-grain"), 0.6); for (const s of [-1, 1]) bx(ctx, s * w / 2 - 0.06, s * w / 2 + 0.06, 0, h, -0.17, 0.17, 0.012); bx(ctx, -w / 2 - 0.06, w / 2 + 0.06, h, h + 0.1, -0.17, 0.17, 0.012); },
  seam(ctx) { // a split seam: white stuffing bulging between dark cross-stitches
    paint(ctx, "#f4f1ea", T("white-cotton-bed-linen-wrinkled"), 1); for (let i = 0; i < 9; i++) ball(ctx, (i % 3 - 1) * 0.035, (Math.floor(i / 3) - 1) * 0.04, -0.01 * (i % 2), 0.035 + 0.01 * (i % 3), 8);
    paint(ctx, "#1a1412", null, 0.7); for (let i = 0; i < 6; i++) { const y = -0.15 + i * 0.06; pipe(ctx, [-0.05, y - 0.012, -0.02], [0.05, y + 0.012, -0.02], 0.004, 4); }
  },
};
export function geometry(ctx) { (B[ctx.params?.kind] ?? B.present)(ctx); }
