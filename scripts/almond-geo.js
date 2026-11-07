// A bottle of almond water: cloudy plastic, an amber label, a white cap that catches light.
import { tube } from "./lib/shapes.js";
export function geometry(ctx) {
  const M = ctx.lod <= 2 ? 12 : 7;
  ctx.roughness(0.25);
  ctx.color("oklch(0.94 0.03 85)");
  tube(ctx, [[0, 0, 0], [0, 0.005, 0], [0, 0.06, 0]], [0.001, 0.045, 0.05], M);
  ctx.color("oklch(0.7 0.12 65)");
  tube(ctx, [[0, 0.06, 0], [0, 0.14, 0]], [0.051, 0.051], M);
  ctx.color("oklch(0.94 0.03 85)");
  tube(ctx, [[0, 0.14, 0], [0, 0.17, 0], [0, 0.21, 0], [0, 0.235, 0]], [0.05, 0.05, 0.03, 0.019], M);
  ctx.color("#ffffff"); ctx.emissive("oklch(0.75 0.05 90)");
  tube(ctx, [[0, 0.235, 0], [0, 0.27, 0], [0, 0.271, 0]], [0.021, 0.021, 0.001], M);
  ctx.emissive(null); ctx.color(null);
}
export function collider() { return null; }
