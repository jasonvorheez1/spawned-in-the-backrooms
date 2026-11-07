// A smiler: a tall smear of shadow with a grin and two eyes that glow. Faces -Z.
import { tube, sphere, face } from "./lib/shapes.js";
export function geometry(ctx) {
  const M = ctx.lod <= 2 ? 14 : 8;
  ctx.roughness(1);
  ctx.color("oklch(0.11 0.012 290)");
  // the robe of shadow, ragged at the hem
  tube(ctx, [[0, 0.02, 0], [0, 0.3, 0.02], [0, 0.75, 0.03], [0, 1.15, 0], [0, 1.4, 0], [0, 1.55, 0], [0, 1.62, 0]], [0.46, 0.38, 0.3, 0.29, 0.34, 0.2, 0.1], M, [1, 0.8], 0.14, 3);
  sphere(ctx, [0, 1.86, -0.02], 0.33, M, [1, 1.08, 0.95]);
  // tendrils of shadow trailing from the hem
  const T = ctx.lod <= 2 ? 6 : 3;
  for (let i = 0; i < T; i++) {
    const a = (i / T) * Math.PI * 2 + 0.4, r = 0.34, x = Math.cos(a) * r, z = Math.sin(a) * r;
    tube(ctx, [[x, 0.3, z], [x * 1.25, 0.14, z * 1.25], [x * 1.55, 0.02, z * 1.55]], [0.05, 0.03, 0.006], 4);
  }
  // long arms, hanging past the knees, with claws
  for (const s of [-1, 1]) {
    tube(ctx, [[s * 0.3, 1.45, 0], [s * 0.42, 1.15, -0.05], [s * 0.46, 0.8, -0.1], [s * 0.44, 0.48, -0.14]], [0.075, 0.06, 0.05, 0.035], ctx.lod <= 2 ? 7 : 5);
    if (ctx.lod <= 3) for (let f = -1.5; f <= 1.5; f++) tube(ctx, [[s * 0.44, 0.48, -0.14], [s * (0.44 + f * 0.03), 0.3, -0.22], [s * (0.44 + f * 0.05), 0.14, -0.18]], [0.018, 0.011, 0.002], 4);
  }
  // the grin and the eyes: they glow
  ctx.emissive("#fff3d6");
  ctx.color("#fffaf0");
  const R = 0.335, cy = 1.86, zf = (x, y) => -0.02 - Math.sqrt(Math.max(0, R * R * 0.9 - x * x - (y - cy) * (y - cy) * 0.85)) - 0.012;
  for (const s of [-1, 1]) {
    const ex = s * 0.12, ey = 1.94, rw = 0.06, rh = 0.03, n = 8, z0 = zf(ex, ey);
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const tilt = s * 0.25;
      const p = (a) => [ex + Math.cos(a) * rw, ey + Math.sin(a) * rh + Math.cos(a) * rw * tilt, z0];
      ctx.tri(ex, ey, z0, ...p(a1), ...p(a0));
    }
  }
  const teeth = ctx.lod <= 2 ? 14 : 7;
  for (let i = 0; i < teeth; i++) {
    const x0 = -0.22 + (0.44 * i) / teeth, x1 = x0 + 0.44 / teeth - 0.004, xm = (x0 + x1) / 2;
    const base = 1.73 + 2.2 * xm * xm;
    for (const [ya, yb] of [[base + 0.035, base], [base - 0.005, base - 0.04 + 0.6 * xm * xm]]) {
      const z = zf(xm, (ya + yb) / 2);
      face(ctx, [x0, yb, z], [x1, yb, z], [x1, ya, z], [x0, ya, z], [0, 0, -1]);
    }
  }
  ctx.emissive(null);
  ctx.color(null);
}
export function collider() { return { kind: "capsule", radius: 0.38, halfHeight: 0.7, center: [0, 1.08, 0] }; }
