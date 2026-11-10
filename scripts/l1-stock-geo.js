// Level 1 rack stock (Shelly: "the stock could be useable too"): a taped carton or a lidded paint pail, each a searchable container.
// params: { kind: "carton" | "pail", w, d, h, tint, seed }. Feet at the bottom centre.
import { slab, tube } from "./lib/shapes.js";
const CARTON = "cdn/texture-corrugated-cardboard-box-side-packing-tape.png";
export function geometry(ctx) {
  const p = ctx.params ?? {}, hi = ctx.lod <= 2;
  if (p.kind === "pail") {
    const r = 0.11, h = 0.24;
    ctx.albedo(null); ctx.color(p.tint ?? "oklch(0.88 0.01 250)"); ctx.metalness(0.35); ctx.roughness(0.45);
    tube(ctx, [[0, 0, 0], [0, h, 0]], [r * 0.94, r], hi ? 16 : 8, [1, 1], 0, 1, 1);
    ctx.color("oklch(0.32 0.01 250)"); tube(ctx, [[0, h - 0.004, 0], [0, h + 0.014, 0]], [r + 0.006, r + 0.006], hi ? 16 : 8, [1, 1], 0, 1, 1); // lid rim
    if (hi) {
      ctx.color("oklch(0.6 0.01 250)"); for (const y of [0.05, h - 0.03]) tube(ctx, [[0, y, 0], [0, y + 0.008, 0]], [r * (0.95 + y / h * 0.05) + 0.004, r * (0.95 + y / h * 0.05) + 0.004], 16, [1, 1], 0, 1, 1); // rolled ribs
      ctx.color("oklch(0.75 0.01 250)"); ctx.metalness(0.8); // wire bail handle, lying over the lid
      const pts = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8; pts.push([Math.cos(a) * (r + 0.008), h + 0.02 + Math.sin(a) * 0.05, 0]); }
      tube(ctx, pts, pts.map(() => 0.003), 5, [1, 1], 0, 1, 1);
      ctx.metalness(0); ctx.color(p.label ?? "oklch(0.8 0.12 85)"); slab(ctx, [0, h * 0.5, r * 0.98], [0.06, 0.05, 0.004]); // paper label
    }
  } else {
    const w = p.w ?? 0.4, d = p.d ?? 0.35, h = p.h ?? 0.3;
    ctx.albedo(CARTON); ctx.color(p.tint ?? "oklch(0.78 0.06 70)"); ctx.roughness(0.9); ctx.metalness(0);
    slab(ctx, [0, h / 2, 0], [w / 2, h / 2, d / 2]);
    ctx.albedo(null);
    ctx.color("oklch(0.72 0.05 75 / 0.9)"); ctx.roughness(0.35); // packing tape along the top seam and down both ends
    slab(ctx, [0, h + 0.002, 0], [0.025, 0.002, d / 2 + 0.002]);
    slab(ctx, [0, h - 0.06, d / 2 + 0.002], [0.025, 0.06, 0.002]); slab(ctx, [0, h - 0.06, -d / 2 - 0.002], [0.025, 0.06, 0.002]);
    if (hi) {
      ctx.color("oklch(0.66 0.06 65)"); ctx.roughness(0.9); slab(ctx, [0, h + 0.001, 0], [0.002, 0.001, d / 2]); // flap seam
      ctx.color("oklch(0.93 0.01 90)"); slab(ctx, [w * 0.18, h * 0.55, d / 2 + 0.003], [0.05, 0.035, 0.001]); // shipping label
      ctx.color("oklch(0.25 0.01 250)"); slab(ctx, [w * 0.18, h * 0.55, d / 2 + 0.0045], [0.035, 0.006, 0.0005]); slab(ctx, [w * 0.18, h * 0.53, d / 2 + 0.0045], [0.03, 0.004, 0.0005]);
      ctx.color("oklch(0.4 0.03 60)"); slab(ctx, [-w * 0.22, h * 0.7, d / 2 + 0.003], [0.03, 0.02, 0.0005]); // stencilled arrow
    }
  }
}
