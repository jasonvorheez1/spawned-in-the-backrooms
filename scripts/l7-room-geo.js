// Level 7 entrance-room furnishings and sea-rock dressing: coffee table, fluorescent troffer, boulders.
import { tube, slab } from "./lib/shapes.js";
const HARDWOOD = "cdn/texture-worn-hardwood-grain.png";
const ROCK = "cdn/texture-terrain-wet-dark-basalt-rock.png";
export function geometry(ctx) {
  const k = ctx.params?.kind ?? "table", M = ctx.lod <= 2 ? 12 : 7;
  if (k === "table") { // low coffee table, water-swollen veneer, one ring stain
    ctx.albedo(HARDWOOD); ctx.roughness(0.55); ctx.color("oklch(0.36 0.05 50)");
    slab(ctx, [0, 0.42, 0], [0.55, 0.025, 0.32]);
    ctx.color("oklch(0.3 0.04 50)"); slab(ctx, [0, 0.36, 0], [0.5, 0.04, 0.27]);
    for (const sx of [-0.47, 0.47]) for (const sz of [-0.24, 0.24]) tube(ctx, [[sx, 0.34, sz], [sx, 0, sz]], [0.03, 0.022], 6);
    ctx.albedo(null); ctx.color("oklch(0.25 0.03 50)"); ctx.roughness(0.9); slab(ctx, [0, 0.12, 0], [0.45, 0.012, 0.22]);
    ctx.color("oklch(0.85 0.02 90)"); ctx.roughness(0.3); tube(ctx, [[0.2, 0.445, 0.05], [0.2, 0.54, 0.05]], [0.04, 0.045], M); // a mug, left
    ctx.color("oklch(0.75 0.03 80)"); ctx.roughness(0.8); slab(ctx, [-0.2, 0.455, -0.05], [0.11, 0.012, 0.15]); // a swollen book
    return;
  }
  if (k === "troffer") { // the one fluorescent panel, buzzing
    ctx.albedo(null); ctx.color("oklch(0.75 0.01 90)"); ctx.metalness(0.4); ctx.roughness(0.5);
    slab(ctx, [0, 0.04, 0], [0.62, 0.04, 0.32]);
    ctx.metalness(0); ctx.color("#ffffff"); ctx.emissive("oklch(0.93 0.05 95)");
    slab(ctx, [0, -0.005, 0], [0.56, 0.006, 0.26]);
    ctx.emissive(null); ctx.color("oklch(0.6 0.01 90)");
    for (const x of [-0.19, 0.19]) slab(ctx, [x, -0.012, 0], [0.008, 0.006, 0.26]);
    return;
  }
  if (k === "boulder") { // wet basalt, slumped, barnacled at the foot
    const s = ctx.params.seed ?? 1;
    ctx.albedo(ROCK); ctx.roughness(0.6); ctx.color("oklch(0.34 0.012 240)"); ctx.flat();
    tube(ctx, [[0, -0.4, 0], [0, 0.25, 0], [0, 0.7, 0], [0, 0.95, 0]], [1.0, 1.05, 0.7, 0.08], M, [1, 0.8], 0.22, s);
    ctx.albedo(null); ctx.color("oklch(0.3 0.05 140)"); ctx.roughness(1);
    tube(ctx, [[0, -0.42, 0], [0, -0.1, 0]], [1.06, 1.1], M, [1, 0.8], 0.2, s);
  }
}
