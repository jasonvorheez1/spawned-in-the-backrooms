// A lurker: tall, pale, hairless, ribs under the skin, arms that reach past its knees and a smooth
// head with two sunken hollows where eyes should be. Rigged for a stalking walk. Faces -Z.
import { tube, sphere } from "./lib/shapes.js";

export function skeleton() {
  return {
    hips: { pivot: [0, 0.98, 0] },
    spine: { parent: "hips", pivot: [0, 1.1, 0] },
    neck: { parent: "spine", pivot: [0, 1.76, -0.14] },
    head: { parent: "neck", pivot: [0, 1.88, -0.22] },
    armL: { parent: "spine", pivot: [-0.21, 1.7, -0.11] }, foreL: { parent: "armL", pivot: [-0.3, 1.18, -0.1] },
    armR: { parent: "spine", pivot: [0.21, 1.7, -0.11] }, foreR: { parent: "armR", pivot: [0.3, 1.18, -0.1] },
    thighL: { parent: "hips", pivot: [-0.11, 0.98, 0] }, shinL: { parent: "thighL", pivot: [-0.11, 0.5, 0.01] },
    thighR: { parent: "hips", pivot: [0.11, 0.98, 0] }, shinR: { parent: "thighR", pivot: [0.11, 0.5, 0.01] },
  };
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 20 : 9, LM = hi ? 12 : 6;
  ctx.smooth(); ctx.roughness(0.7);
  const SKIN = "oklch(0.86 0.025 85)", SHADE = "oklch(0.74 0.03 70)";
  ctx.color(SKIN);
  for (const s of [-1, 1]) {
    const L = s < 0 ? "L" : "R", x = s * 0.11;
    ctx.bone("thigh" + L); tube(ctx, [[x, 1.0, 0], [x * 1.05, 0.75, -0.01], [x, 0.5, 0.01]], [0.085, 0.07, 0.055], LM);
    ctx.bone({ ["thigh" + L]: 0.5, ["shin" + L]: 0.5 }); sphere(ctx, [x, 0.5, 0.0], 0.058, LM);
    ctx.bone("shin" + L); tube(ctx, [[x, 0.5, 0.01], [x, 0.25, 0.03], [x, 0.06, 0.02]], [0.055, 0.045, 0.035], LM);
    tube(ctx, [[x, 0.05, 0.05], [x, 0.03, -0.06], [x * 1.1, 0.015, -0.17]], [0.04, 0.035, 0.018], LM, [1, 0.55]); // long foot
  }
  ctx.bone("hips"); sphere(ctx, [0, 0.92, 0], 0.13, M, [1, 0.75, 0.75]); tube(ctx, [[0, 0.88, 0], [0, 1.02, 0], [0, 1.12, -0.01]], [0.12, 0.15, 0.14], M, [1, 0.7]);
  ctx.bone("spine");
  tube(ctx, [[0, 1.1, -0.01], [0, 1.35, -0.04], [0, 1.6, -0.1], [0, 1.74, -0.14]], [0.13, 0.17, 0.2, 0.14], M, [1, 0.62]);
  if (hi) { ctx.color(SHADE); for (let r = 0; r < 5; r++) { const y = 1.36 + r * 0.06; tube(ctx, [[-0.15, y, -0.05 - r * 0.01], [0, y + 0.03, -0.15 - r * 0.012], [0.15, y, -0.05 - r * 0.01]], [0.012, 0.015, 0.012], 6); } ctx.color(SKIN); } // ribs
  for (const s of [-1, 1]) sphere(ctx, [s * 0.19, 1.69, -0.11], 0.065, LM); // shoulders
  sphere(ctx, [0, 1.72, -0.13], 0.1, M, [1.25, 0.45, 0.8]); // collar caps the torso
  ctx.bone("neck"); tube(ctx, [[0, 1.72, -0.13], [0, 1.82, -0.18], [0, 1.9, -0.22]], [0.05, 0.045, 0.05], LM);
  ctx.bone("head");
  sphere(ctx, [0, 2.0, -0.28], 0.16, M, [0.82, 1.2, 0.95]);
  if (ctx.lod <= 3) { ctx.color("oklch(0.25 0.02 60)"); ctx.roughness(1); for (const s of [-1, 1]) sphere(ctx, [s * 0.055, 2.03, -0.418], 0.03, hi ? 10 : 6, [1.3, 0.75, 0.22]); ctx.color(SKIN); ctx.roughness(0.7); } // eye hollows
  for (const s of [-1, 1]) {
    const L = s < 0 ? "L" : "R";
    ctx.bone("arm" + L); tube(ctx, [[s * 0.21, 1.7, -0.11], [s * 0.27, 1.45, -0.11], [s * 0.3, 1.18, -0.1]], [0.05, 0.042, 0.036], LM);
    ctx.bone({ ["arm" + L]: 0.5, ["fore" + L]: 0.5 }); sphere(ctx, [s * 0.3, 1.18, -0.1], 0.04, LM);
    ctx.bone("fore" + L); tube(ctx, [[s * 0.3, 1.18, -0.1], [s * 0.33, 0.75, -0.06], [s * 0.33, 0.36, -0.02]], [0.036, 0.03, 0.024], LM);
    sphere(ctx, [s * 0.33, 0.32, -0.02], 0.04, LM, [0.7, 1.2, 1]); // palm
    if (ctx.lod <= 3) for (let f = -2; f <= 1; f++) tube(ctx, [[s * (0.33 + f * 0.012), 0.29, -0.02], [s * (0.33 + f * 0.022), 0.17, -0.01 + f * 0.01], [s * (0.33 + f * 0.03), 0.05, 0.02 + f * 0.012]], [0.011, 0.008, 0.003], hi ? 6 : 4);
  }
  ctx.bone(null); ctx.color(null);
}
export function collider() { return { kind: "capsule", radius: 0.34, halfHeight: 0.8, center: [0, 1.0, 0] }; }
