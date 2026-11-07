// A skin-stealer. params.revealed false: a stooped wanderer in a drab coat, face a little too smooth.
// revealed: the skin hangs open off a gaunt black body, long fingers, a slit mouth. Faces -Z.
import { tube, sphere } from "./lib/shapes.js";
export function skeleton() {
  return { spine: { pivot: [0, 1.0, 0] }, head: { parent: "spine", pivot: [0, 1.6, -0.02] },
    armL: { parent: "spine", pivot: [-0.22, 1.48, 0] }, armR: { parent: "spine", pivot: [0.22, 1.48, 0] },
    legL: { parent: "spine", pivot: [-0.1, 0.95, 0] }, legR: { parent: "spine", pivot: [0.1, 0.95, 0] } };
}
export function geometry(ctx) {
  // RETIRED: the skin-stealer is a Blender mesh now (art/stealer/build.py), swapped in by scripts/stealers.js on its first tick.
  // A row still spawned with this primitive draws only a speck for that tick.
  ctx.color("oklch(0.1 0 0)"); sphere(ctx, [0, 0.01, 0], 0.005, 4); return;
  const rev = !!ctx.params?.revealed, hi = ctx.lod <= 2, M = hi ? 16 : 8;
  ctx.smooth(); ctx.roughness(0.85);
  const SKIN = "oklch(0.78 0.04 60)", COAT = "oklch(0.38 0.03 80)", PANTS = "oklch(0.3 0.02 250)", BODY = "oklch(0.12 0.01 20)";
  // legs
  for (const [n, s] of [["legL", -1], ["legR", 1]]) { ctx.bone(n); ctx.color(rev ? BODY : PANTS); tube(ctx, [[s * 0.1, 0.95, 0], [s * 0.1, 0.5, 0.02], [s * 0.1, 0.04, 0]], [0.08, 0.06, 0.05], M); ctx.color("oklch(0.2 0.01 40)"); tube(ctx, [[s * 0.1, 0.06, 0.05], [s * 0.1, 0.05, -0.14]], [0.05, 0.045], 8); }
  ctx.bone("spine");
  if (rev) { ctx.color(BODY); tube(ctx, [[0, 0.95, 0], [0, 1.25, 0.04], [0, 1.5, 0.06]], [0.13, 0.11, 0.15], M, [1, 0.6]);
    ctx.color(SKIN); for (const s of [-1, 1]) tube(ctx, [[s * 0.18, 1.5, 0.05], [s * 0.26, 1.15, 0.1], [s * 0.3, 0.8, 0.14], [s * 0.28, 0.6, 0.12]], [0.05, 0.07, 0.06, 0.01], M, [0.4, 1]); // the skin, peeled open and hanging
  } else { ctx.color(COAT); tube(ctx, [[0, 0.82, 0], [0, 1.1, 0.02], [0, 1.4, 0.04], [0, 1.52, 0.03]], [0.2, 0.19, 0.21, 0.13], M, [1, 0.7]); }
  for (const [n, s] of [["armL", -1], ["armR", 1]]) {
    ctx.bone(n); ctx.color(rev ? BODY : COAT);
    const L = rev ? 0.5 : 0.75; tube(ctx, [[s * 0.22, 1.48, 0.02], [s * 0.27, 1.15, 0], [s * 0.28, L + 0.1, -0.03]], [0.06, 0.05, 0.04], M);
    ctx.color(rev ? BODY : SKIN);
    if (rev) for (let f = -1; f <= 1; f++) tube(ctx, [[s * 0.28, L + 0.1, -0.03], [s * (0.28 + f * 0.02), L - 0.15, -0.06], [s * (0.28 + f * 0.03), L - 0.32, -0.04]], [0.015, 0.01, 0.002], 6);
    else sphere(ctx, [s * 0.28, L + 0.05, -0.03], 0.045, 8);
  }
  ctx.bone("head");
  if (rev) { ctx.color(BODY); sphere(ctx, [0, 1.72, -0.02], 0.12, M, [0.85, 1.35, 1]); ctx.color("oklch(0.85 0.02 90)"); tube(ctx, [[-0.06, 1.66, -0.12], [0, 1.64, -0.13], [0.06, 1.66, -0.12]], [0.006, 0.008, 0.006], 6); ctx.color(SKIN); tube(ctx, [[0, 1.6, 0.06], [0.02, 1.4, 0.14], [0.03, 1.25, 0.16]], [0.09, 0.07, 0.01], 10, [1, 0.3]); }
  else { ctx.color(SKIN); sphere(ctx, [0, 1.72, -0.02], 0.12, M, [0.92, 1.12, 1]); ctx.color("oklch(0.1 0 0)"); for (const s of [-1, 1]) sphere(ctx, [s * 0.04, 1.75, -0.12], 0.012, 6); ctx.color("oklch(0.5 0.06 25)"); tube(ctx, [[-0.03, 1.66, -0.12], [0.03, 1.66, -0.12]], [0.005, 0.005], 6); ctx.color("oklch(0.25 0.03 50)"); sphere(ctx, [0, 1.79, 0.01], 0.12, M, [0.95, 0.6, 1]); }
}
