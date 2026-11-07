// A dark figure (Level 0's "dark figures stalking between corridors"): a tall thin silhouette, no face,
// shoulders hunched, arms long. Seen for a moment down a hallway, never up close. Faces -Z.
import { tube, sphere } from "./lib/shapes.js";
export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 16 : 8;
  ctx.smooth();
  ctx.roughness(1);
  ctx.color("oklch(0.06 0.01 280)");
  for (const s of [-1, 1]) tube(ctx, [[s * 0.1, 0, 0], [s * 0.1, 0.5, 0.01], [s * 0.11, 1.0, 0]], [0.06, 0.07, 0.09], M); // legs
  tube(ctx, [[0, 0.95, 0], [0, 1.35, 0.02], [0, 1.72, 0.06], [0, 1.86, 0.02]], [0.17, 0.15, 0.2, 0.1], M, [1, 0.6]); // torso, hunched
  sphere(ctx, [0, 2.0, -0.03], 0.13, M, [1, 1.15, 1]); // head
  for (const s of [-1, 1]) tube(ctx, [[s * 0.2, 1.76, 0.05], [s * 0.27, 1.3, 0.02], [s * 0.28, 0.85, -0.03], [s * 0.26, 0.55, -0.05]], [0.055, 0.045, 0.035, 0.02], hi ? 10 : 6); // arms past the knees
}
