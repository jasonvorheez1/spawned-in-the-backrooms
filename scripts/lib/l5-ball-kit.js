// The Beverly Room lane's mesh kit: lofts (lathe, rounded slabs), crystals and the house materials.
import { face, slab, tube, prism } from "./shapes.js";
import { box, paint } from "./gamma-kit.js";
export { face, slab, tube, prism, box, paint };
// a closed loft through rings { y, pts: [[x, z]…] } of equal count, bottom to top; caps where open
export function loft(ctx, rings, caps = true) {
  const n = rings[0].pts.length, cen = (r) => r.pts.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1], ca = cen(A), cb = cen(B);
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n, a = A.pts[k], b = A.pts[k2], c = B.pts[k2], d = B.pts[k];
      const ra = Math.hypot(a[0] - ca[0], a[1] - ca[1]), rb = Math.hypot(d[0] - cb[0], d[1] - cb[1]);
      const mx = (a[0] + b[0]) / 2 - ca[0], mz = (a[1] + b[1]) / 2 - ca[1], ml = Math.hypot(mx, mz) || 1, dy = B.y - A.y, dr = rb - ra;
      const hint = [(mx / ml) * dy, -dr, (mz / ml) * dy];
      if (Math.hypot(...hint) < 1e-6) continue;
      face(ctx, [a[0], A.y, a[1]], [b[0], A.y, b[1]], [c[0], B.y, c[1]], [d[0], B.y, d[1]], hint);
    }
  }
  if (!caps) return;
  const cap = (r, up) => { const c = cen(r); for (let k = 0; k < n; k++) { const a = r.pts[k], b = r.pts[(k + 1) % n]; tri3(ctx, [c[0], r.y, c[1]], [a[0], r.y, a[1]], [b[0], r.y, b[1]], [0, up, 0]); } };
  cap(rings[0], -1); cap(rings[rings.length - 1], 1);
}
export function tri3(ctx, a, b, c, n) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const x = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if (x[0] * n[0] + x[1] * n[1] + x[2] * n[2] < 0) ctx.tri(...a, ...c, ...b); else ctx.tri(...a, ...b, ...c);
}
export const circ = (cx, cz, r, M = 16, sx = 1, sz = 1, a0 = 0) => Array.from({ length: M }, (_, k) => { const t = a0 + (k / M) * Math.PI * 2; return [cx + Math.cos(t) * r * sx, cz + Math.sin(t) * r * sz]; });
// a turned form: profile [[y, r]…] bottom to top (outer surface order; a bowl goes back down inside)
export const lathe = (ctx, cx, cz, prof, M = 16, sx = 1, sz = 1) => loft(ctx, prof.map(([y, r]) => ({ y, pts: circ(cx, cz, Math.max(r, 1e-4), M, sx, sz) })), false);
// a rounded rectangle outline
export function rrect(x0, x1, z0, z1, b, seg = 2) {
  const P = [], C = [[x1 - b, z1 - b, 0], [x0 + b, z1 - b, 1], [x0 + b, z0 + b, 2], [x1 - b, z0 + b, 3]];
  for (const [cx, cz, q] of C) for (let s = 0; s <= seg; s++) { const t = (q + s / seg) * Math.PI / 2; P.push([cx + Math.cos(t) * b, cz + Math.sin(t) * b]); }
  return P;
}
// a slab with rounded corners and a bevelled top and bottom edge (the furniture-maker's box)
export function rbox(ctx, x0, x1, y0, y1, z0, z1, b = 0.02, seg = 2) {
  b = Math.min(b, (x1 - x0) / 2.2, (z1 - z0) / 2.2, (y1 - y0) / 2.2);
  const r = (i) => rrect(x0 + i, x1 - i, z0 + i, z1 - i, b, seg);
  loft(ctx, [{ y: y0, pts: r(b * 0.6) }, { y: y0 + b * 0.6, pts: r(0) }, { y: y1 - b * 0.6, pts: r(0) }, { y: y1, pts: r(b * 0.6) }]);
}
// a cut crystal drop: an elongated octahedron
export function crystal(ctx, x, y, z, w, h) {
  const t = [x, y + h * 0.35, z], bt = [x, y - h * 0.65, z], s = [[x + w, y, z], [x, y, z + w], [x - w, y, z], [x, y, z - w]];
  for (let k = 0; k < 4; k++) { const a = s[k], b = s[(k + 1) % 4], m = [(a[0] + b[0]) / 2 - x, 0, (a[2] + b[2]) / 2 - z];
    tri3(ctx, t, a, b, [m[0], 0.6, m[2]]); tri3(ctx, bt, a, b, [m[0], -0.6, m[2]]); }
}
export const rod = (ctx, a, b, r, M = 6) => tube(ctx, [a, b], [r, r], M, [1, 1], 0, 1, 1);
// house materials
export const GILT = (ctx) => paint(ctx, "oklch(0.8 0.12 85)", null, 0.28, 0.95);
export const BRASS = (ctx) => paint(ctx, "oklch(0.72 0.1 80)", null, 0.35, 0.9);
export const SILVER = (ctx) => paint(ctx, "oklch(0.86 0.01 250)", null, 0.22, 1);
export const LINEN = (ctx) => paint(ctx, "oklch(0.97 0.01 95)", "cdn/texture-white-damask-linen-tablecloth.png", 0.85);
export const CRYS = (ctx) => paint(ctx, "oklch(0.98 0.02 90)", null, 0.04, 0.35, "oklch(0.42 0.05 80)");
export const BULB = (ctx) => paint(ctx, "oklch(0.98 0.07 85)", null, 0.3, 0, "oklch(0.96 0.12 80)");
export const GLASS = (ctx) => paint(ctx, "oklch(0.95 0.02 210)", null, 0.03, 0.4);
export const WOOD = (ctx, l = 0.4) => paint(ctx, `oklch(${l} 0.07 45)`, "cdn/texture-worn-hardwood-grain.png", 0.45);
export const VELVET = (ctx, h = 20) => paint(ctx, `oklch(0.42 0.13 ${h})`, "cdn/texture-crushed-velvet-upholstery.png", 0.95);
export const STEEL = (ctx, c = "oklch(0.7 0.01 250)") => paint(ctx, c, "cdn/texture-scratched-worn-steel.png", 0.5, 0.7);
// a champagne coupe at x, y (table top), z, filled to `fill` (0..1)
export function coupe(ctx, x, y, z, fill = 0.5, tip = false) {
  GLASS(ctx); lathe(ctx, x, z, [[y, 0.001], [y, 0.035], [y + 0.006, 0.033], [y + 0.012, 0.006], [y + 0.09, 0.005], [y + 0.1, 0.03], [y + 0.125, 0.055], [y + 0.13, 0.058], [y + 0.126, 0.054], [y + 0.104, 0.028], [y + 0.096, 0.001]], 10);
  if (fill > 0) { paint(ctx, "oklch(0.88 0.11 92)", null, 0.05, 0, "oklch(0.25 0.05 90)"); const yy = y + 0.098 + 0.026 * fill; lathe(ctx, x, z, [[yy - 0.002, 0.001], [yy - 0.002, 0.028 + 0.025 * fill], [yy, 0.028 + 0.025 * fill], [yy + 0.0005, 0.001]], 10); }
}
// a gilt Chiavari chair, front -Z, seat at 0.46, at x, z turned yaw (radians)
export function chair(ctx, x, z, yaw, tilt = 0) {
  const R = (lx, ly, lz) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [x + lx * c - lz * s, ly + Math.max(0, lz) * tilt, z + lx * s + lz * c]; };
  GILT(ctx);
  for (const [lx, lz, top] of [[-0.2, -0.2, 0.46], [0.2, -0.2, 0.46], [-0.19, 0.19, 0.95], [0.19, 0.19, 0.95]]) rod(ctx, R(lx, 0, lz), R(lx * 0.95, top, lz), 0.013);
  for (const ly of [0.18, 0.46]) { rod(ctx, R(-0.2, ly, -0.2), R(0.2, ly, -0.2), 0.009); rod(ctx, R(-0.2, ly, -0.2), R(-0.19, ly, 0.19), 0.009); rod(ctx, R(0.2, ly, -0.2), R(0.19, ly, 0.19), 0.009); }
  for (const ly of [0.62, 0.76, 0.9]) rod(ctx, R(-0.185, ly, 0.19), R(0.185, ly, 0.19), 0.01);
  for (const lx of [-0.09, 0, 0.09]) rod(ctx, R(lx, 0.47, 0.19), R(lx, 0.9, 0.19), 0.007);
  paint(ctx, "oklch(0.93 0.03 85)", "cdn/texture-ivory-silk-brocade-fabric.png", 0.8);
  const c = R(0, 0.5, 0); const yawPts = rrect(-0.19, 0.19, -0.19, 0.18, 0.05).map(([px, pz]) => { const p = R(px, 0, pz); return [p[0], p[2]]; });
  loft(ctx, [{ y: 0.46, pts: yawPts }, { y: 0.5, pts: yawPts }, { y: 0.51, pts: yawPts.map(([px, pz]) => [c[0] + (px - c[0]) * 0.9, c[2] + (pz - c[2]) * 0.9]) }]);
}
