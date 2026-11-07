// A smiler: a gaunt, hunched smear of shadow, arms too long, a grin too wide. Faces -Z.
import { tube, sphere, face } from "./lib/shapes.js";
export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 22 : 10;
  ctx.roughness(1);
  ctx.smooth();
  ctx.color("oklch(0.09 0.012 290)");
  // ragged robe of shadow: wide torn hem, narrow waist, hunched back
  tube(ctx, [[0, 0.0, 0.02], [0, 0.18, 0.03], [0, 0.55, 0.05], [0, 0.95, 0.06], [0, 1.3, 0.1], [0, 1.6, 0.06], [0, 1.78, -0.04]], [0.5, 0.42, 0.3, 0.22, 0.27, 0.3, 0.14], M, [1, 0.75], 0.22, 7);
  // tattered wisps trailing off the hem
  if (ctx.lod <= 3) for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3, r = 0.44 + 0.05 * Math.sin(i * 3.1);
    tube(ctx, [[Math.cos(a) * r * 0.85, 0.22, Math.sin(a) * r * 0.65], [Math.cos(a) * (r + 0.06), 0.06, Math.sin(a) * (r * 0.75)], [Math.cos(a) * (r + 0.1), 0.0, Math.sin(a) * (r * 0.8)]], [0.06, 0.035, 0.004], hi ? 8 : 5); }
  // neck craning forward, head jutting
  tube(ctx, [[0, 1.72, -0.02], [0, 1.86, -0.1], [0, 1.95, -0.16]], [0.09, 0.07, 0.08], hi ? 12 : 6);
  sphere(ctx, [0, 2.05, -0.2], 0.27, M, [1, 1.18, 0.92]);
  // long jointed arms, elbows out, hanging past the knees
  for (const s of [-1, 1]) {
    tube(ctx, [[s * 0.26, 1.62, 0.04], [s * 0.4, 1.58, 0.02], [s * 0.52, 1.25, 0.0], [s * 0.6, 1.0, -0.08], [s * 0.54, 0.62, -0.18], [s * 0.5, 0.4, -0.22]], [0.07, 0.065, 0.05, 0.045, 0.035, 0.03], hi ? 12 : 6);
    if (ctx.lod <= 3) for (let f = -2; f <= 2; f++) tube(ctx, [[s * 0.5, 0.4, -0.22], [s * (0.5 + f * 0.025), 0.28, -0.26], [s * (0.5 + f * 0.04), 0.15, -0.24], [s * (0.5 + f * 0.045), 0.08, -0.19]], [0.016, 0.012, 0.007, 0.001], hi ? 6 : 4);
  }
  ctx.flat();
  // the eyes and grin: white-hot, the only light it has
  ctx.emissive("oklch(1 0.03 90)");
  ctx.color("#fffaf0");
  const C = [0, 2.05, -0.2], R = 0.27, zf = (x, y) => C[2] - Math.sqrt(Math.max(0, R * R - x * x - ((y - C[1]) / 1.18) ** 2)) * 0.92 - 0.012;
  for (const s of [-1, 1]) {
    const ex = s * 0.1, ey = 2.13, rw = 0.055, rh = 0.032, n = 10;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const p = (a) => { const x = ex + Math.cos(a) * rw, y = ey + Math.sin(a) * rh - s * Math.cos(a) * rw * 0.35; return [x, y, zf(x, y)]; };
      ctx.tri(ex, ey, zf(ex, ey) - 0.003, ...p(a1), ...p(a0));
    }
  }
  // a grin wider than the face: two rows of thin pointed teeth on a curve
  const teeth = hi ? 18 : 9, W = 0.22;
  for (let i = 0; i < teeth; i++) {
    const x0 = -W + (2 * W * i) / teeth, x1 = x0 + (2 * W) / teeth - 0.003, xm = (x0 + x1) / 2;
    const mid = 1.97 + 2.4 * xm * xm, gap = 0.012 * (1 - (xm / W) ** 2) + 0.002;
    const up = 0.045 * (1 - 0.6 * (xm / W) ** 2), dn = 0.05 * (1 - 0.6 * (xm / W) ** 2);
    const zt = zf(xm, mid);
    ctx.tri(x0, mid + gap + up * 0.15, zt, x1, mid + gap + up * 0.15, zt, xm, mid + gap - up * 0.55, zt - 0.002);
    face(ctx, [x0, mid + gap + up * 0.15, zt], [x1, mid + gap + up * 0.15, zt], [x1, mid + gap + up, zt], [x0, mid + gap + up, zt], [0, 0, -1]);
    ctx.tri(x1, mid - gap - dn * 0.15, zt, x0, mid - gap - dn * 0.15, zt, xm, mid - gap + dn * 0.55, zt - 0.002);
    face(ctx, [x0, mid - gap - dn, zt], [x1, mid - gap - dn, zt], [x1, mid - gap - dn * 0.15, zt], [x0, mid - gap - dn * 0.15, zt], [0, 0, -1]);
  }
  ctx.emissive(null);
  ctx.color(null);
}
export function collider() { return { kind: "capsule", radius: 0.38, halfHeight: 0.7, center: [0, 1.08, 0] }; }
