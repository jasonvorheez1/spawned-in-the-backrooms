// First-person arm: a jacket sleeve running back past the camera and a gloved fist closed around a
// vertical grip at the origin. Camera space: -Z forward, +Y up. The held weapon is a child object.
import { tube, sphere } from "./lib/shapes.js";
export function geometry(ctx) {
  const M = 14;
  ctx.smooth();
  // sleeve: worn canvas jacket, cuff rolled at the wrist
  ctx.color("oklch(0.36 0.03 85)"); ctx.roughness(0.95);
  tube(ctx, [[0.035, -0.07, 0.07], [0.07, -0.16, 0.22], [0.11, -0.28, 0.42], [0.14, -0.38, 0.6]], [0.05, 0.058, 0.066, 0.07], M);
  ctx.color("oklch(0.31 0.03 85)");
  tube(ctx, [[0.03, -0.06, 0.055], [0.04, -0.085, 0.09]], [0.055, 0.055], M);
  // hand: skin, palm wrapped round the grip, four knuckles, thumb over the top
  ctx.color("oklch(0.72 0.06 55)"); ctx.roughness(0.6);
  tube(ctx, [[0.03, -0.065, 0.06], [0.03, -0.045, 0.03]], [0.034, 0.04], M); // wrist
  sphere(ctx, [0.03, -0.02, 0.015], 0.042, M, [0.75, 1.05, 0.9]); // palm heel
  for (let k = 0; k < 4; k++) {
    const y = 0.026 - k * 0.022, r = 0.0115 - k * 0.0008;
    tube(ctx, [[0.032, y, 0.02], [0.03, y, -0.02], [0.0, y, -0.032], [-0.028, y, -0.012], [-0.022, y, 0.012]], [r, r, r * 0.95, r * 0.9, r * 0.8], 8); // curled finger
    sphere(ctx, [0.03, y, -0.022], r * 1.15, 8); // knuckle
  }
  tube(ctx, [[0.04, 0.0, 0.04], [0.02, 0.04, 0.02], [-0.008, 0.045, -0.006], [-0.022, 0.035, -0.012]], [0.016, 0.014, 0.012, 0.01], 8); // thumb
  ctx.color(null);
}
export function collider() { return null; }
