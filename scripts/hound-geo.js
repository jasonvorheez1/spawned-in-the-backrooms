// A hound: a lean, hairless, grey quadruped with a long skull, wet black eyes and a ridge of spine. Faces -Z.
import { tube, sphere } from "./lib/shapes.js";
export function skeleton() {
  return { body: { pivot: [0, 0.75, 0] }, head: { parent: "body", pivot: [0, 0.85, -0.55] },
    legFL: { parent: "body", pivot: [-0.16, 0.7, -0.45] }, legFR: { parent: "body", pivot: [0.16, 0.7, -0.45] },
    legBL: { parent: "body", pivot: [-0.16, 0.72, 0.42] }, legBR: { parent: "body", pivot: [0.16, 0.72, 0.42] } };
}
export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 14 : 7;
  ctx.smooth(); ctx.roughness(0.55); ctx.color("oklch(0.52 0.02 40)");
  ctx.bone("body"); tube(ctx, [[0, 0.78, 0.62], [0, 0.8, 0.4], [0, 0.82, 0], [0, 0.84, -0.4], [0, 0.86, -0.55]], [0.01, 0.17, 0.2, 0.21, 0.12], M);
  ctx.color("oklch(0.4 0.02 30)"); tube(ctx, [[0, 1.0, 0.4], [0, 1.04, 0], [0, 1.02, -0.4]], [0.03, 0.05, 0.03], 6);
  ctx.color("oklch(0.52 0.02 40)"); ctx.bone("head");
  tube(ctx, [[0, 0.9, -0.55], [0, 0.9, -0.72], [0, 0.82, -0.95], [0, 0.78, -1.05]], [0.12, 0.13, 0.08, 0.01], M);
  ctx.color("oklch(0.1 0 0)"); for (const s of [-1, 1]) sphere(ctx, [s * 0.08, 0.93, -0.78], 0.035, 8);
  ctx.color("oklch(0.9 0.02 90)"); for (let i = -2; i <= 2; i++) sphere(ctx, [i * 0.025, 0.77, -0.98 + Math.abs(i) * 0.02], 0.012, 4);
  ctx.color("oklch(0.48 0.02 40)");
  for (const [n, x, z] of [["legFL", -0.16, -0.45], ["legFR", 0.16, -0.45], ["legBL", -0.16, 0.42], ["legBR", 0.16, 0.42]]) {
    ctx.bone(n); tube(ctx, [[x, 0.75, z], [x * 1.1, 0.42, z + 0.08], [x * 1.1, 0.04, z - 0.05], [x * 1.1, 0.0, z - 0.12]], [0.07, 0.05, 0.035, 0.03], hi ? 8 : 5);
  }
}
