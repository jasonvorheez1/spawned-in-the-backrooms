// Level 3 ceiling lamp: a bare bulb in a wire cage on a porcelain socket, hung from a short conduit stem off a steel box.
// Origin = the bulb's centre; params.drop = metres from bulb up to the ceiling; params.cold = a cold tube-white bulb tint;
// params.dead = a dark, broken bulb (cage still there).
import { slab, tube, sphere } from "./lib/shapes.js";

export function geometry(ctx) {
  const p = ctx.params || {}, drop = p.drop ?? 0.25, hi = ctx.lod <= 2, M = hi ? 8 : 5;
  // ceiling box and stem
  ctx.metalness(0.6); ctx.roughness(0.45); ctx.color("oklch(0.62 0.01 240)");
  slab(ctx, [0, drop - 0.03, 0], [0.09, 0.03, 0.09]);
  tube(ctx, [[0, drop - 0.06, 0], [0, 0.14, 0]], [0.014, 0.014], M, [1, 1], 0, 1, 1);
  // porcelain socket
  ctx.metalness(0); ctx.roughness(0.3); ctx.color("oklch(0.9 0.01 90)");
  tube(ctx, [[0, 0.14, 0], [0, 0.12, 0], [0, 0.06, 0]], [0.03, 0.045, 0.04], M, [1, 1], 0, 1, 1);
  // wire cage: a top ring, a bottom cap, six ribs bowing round the bulb
  ctx.metalness(0.5); ctx.roughness(0.6); ctx.color("oklch(0.3 0.01 250)");
  const n = hi ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    tube(ctx, [[c * 0.045, 0.07, s * 0.045], [c * 0.09, 0.0, s * 0.09], [c * 0.085, -0.08, s * 0.085], [c * 0.02, -0.12, s * 0.02]], [0.004, 0.004, 0.004, 0.004], 3, [1, 1], 0, 1, hi ? 2 : 1);
  }
  if (hi) for (const [y, r] of [[0.0, 0.09], [-0.07, 0.087]]) {
    const pts = []; for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI * 2; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
    tube(ctx, pts, pts.map(() => 0.004), 3, [1, 1], 0, 1, 1);
  }
  // the bulb
  if (p.dead) { ctx.color("oklch(0.25 0.01 80)"); ctx.roughness(0.2); }
  else { const col = p.cold ? "oklch(0.95 0.03 210)" : "oklch(0.92 0.1 70)"; ctx.color(col); ctx.emissive(col); }
  sphere(ctx, [0, -0.01, 0], 0.055, M, [1, 1.25, 1]);
  ctx.emissive(null);
}
