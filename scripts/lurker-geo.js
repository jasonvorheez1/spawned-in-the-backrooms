// A lurker: a tall, pale, hairless figure with long limbs and a smooth, faceless head, caught mid-stride. Faces -Z.
import { tube, sphere } from "./lib/shapes.js";
export function geometry(ctx) {
  const M = ctx.lod <= 2 ? 12 : 7, LM = ctx.lod <= 2 ? 6 : 4;
  ctx.roughness(0.85);
  ctx.color("oklch(0.86 0.02 85)");
  // legs, one forward
  tube(ctx, [[-0.11, 0.0, -0.12], [-0.12, 0.5, -0.04], [-0.1, 0.95, 0.0]], [0.04, 0.06, 0.07], LM);
  tube(ctx, [[0.11, 0.0, 0.14], [0.12, 0.5, 0.06], [0.1, 0.95, 0.0]], [0.04, 0.06, 0.07], LM);
  // narrow torso, hunched
  tube(ctx, [[0, 0.9, 0], [0, 1.3, -0.04], [0, 1.65, -0.12], [0, 1.82, -0.2]], [0.17, 0.2, 0.19, 0.1], M, [1, 0.7]);
  // smooth head, tilted forward, no face
  sphere(ctx, [0, 1.98, -0.3], 0.17, M, [0.8, 1.15, 0.9]);
  // arms, far too long, fingers nearly at the floor
  for (const s of [-1, 1]) {
    tube(ctx, [[s * 0.2, 1.7, -0.12], [s * 0.3, 1.2, -0.1], [s * 0.34, 0.6, -0.02], [s * 0.32, 0.08, 0.04]], [0.045, 0.04, 0.032, 0.02], LM);
    if (ctx.lod <= 3) for (let f = -1; f <= 1; f++) tube(ctx, [[s * 0.32, 0.08, 0.04], [s * (0.32 + f * 0.025), 0.03, 0.1], [s * (0.32 + f * 0.04), 0.0, 0.14]], [0.012, 0.008, 0.002], 3);
  }
  ctx.color(null);
}
export function collider() { return { kind: "capsule", radius: 0.34, halfHeight: 0.8, center: [0, 1.0, 0] }; }
