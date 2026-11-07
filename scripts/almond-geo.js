// A bottle of almond water: clear plastic with the water inside, a paper label and a blue cap that glows faintly so it reads in the dark.
import { tube } from "./lib/shapes.js";
export function geometry(ctx) {
  const M = ctx.lod <= 2 ? 14 : 8;
  ctx.roughness(0.2);
  // the plastic shell, ribbed at the base
  ctx.color("oklch(0.93 0.03 215)");
  tube(ctx, [[0, 0, 0], [0, 0.004, 0], [0, 0.05, 0], [0, 0.06, 0], [0, 0.07, 0]], [0.012, 0.04, 0.046, 0.04, 0.047], M);
  // the water, slightly warm
  ctx.color("oklch(0.88 0.07 85)");
  tube(ctx, [[0, 0.07, 0], [0, 0.15, 0], [0, 0.19, 0]], [0.0475, 0.0475, 0.045], M);
  // the paper label
  ctx.roughness(0.9); ctx.color("oklch(0.72 0.14 62)");
  tube(ctx, [[0, 0.085, 0], [0, 0.135, 0]], [0.0495, 0.0495], M);
  ctx.color("oklch(0.97 0.01 90)");
  tube(ctx, [[0, 0.102, 0], [0, 0.118, 0]], [0.0502, 0.0502], M);
  // shoulder, neck, cap
  ctx.roughness(0.2); ctx.color("oklch(0.93 0.03 215)");
  tube(ctx, [[0, 0.19, 0], [0, 0.215, 0], [0, 0.235, 0], [0, 0.255, 0]], [0.045, 0.034, 0.02, 0.018], M);
  ctx.roughness(0.4); ctx.color("oklch(0.6 0.15 245)"); ctx.emissive("oklch(0.55 0.12 245)");
  tube(ctx, [[0, 0.252, 0], [0, 0.262, 0], [0, 0.285, 0], [0, 0.287, 0]], [0.024, 0.026, 0.026, 0.02], M);
  ctx.emissive(null); ctx.color(null);
}
export function collider() { return null; }
