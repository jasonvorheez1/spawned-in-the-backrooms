// An M.E.G. agent: a person in a lime hi-vis jacket with the eagle patch, cargo pants, boots, a cap or a beanie.
// params: role ("scout" | "medic" | "quarter"), skin, hair. Faces -Z. Rigged for the library clips' names it can't use; posed by bone.
import { tube, sphere } from "./lib/shapes.js";
export function skeleton() {
  return { spine: { pivot: [0, 1.0, 0] }, head: { parent: "spine", pivot: [0, 1.55, 0] },
    armL: { parent: "spine", pivot: [-0.22, 1.45, 0] }, armR: { parent: "spine", pivot: [0.22, 1.45, 0] } };
}
export function geometry(ctx) {
  const p = ctx.params ?? {}, role = p.role ?? "scout", hi = ctx.lod <= 2, M = hi ? 16 : 8;
  const SKIN = p.skin ?? "oklch(0.72 0.07 55)", HAIR = p.hair ?? "oklch(0.25 0.04 50)";
  const JACKET = role === "medic" ? "oklch(0.93 0.01 250)" : "oklch(0.86 0.21 125)", PANTS = "oklch(0.38 0.04 120)";
  ctx.smooth(); ctx.roughness(0.8);
  for (const s of [-1, 1]) { // legs and boots
    ctx.color(PANTS); tube(ctx, [[s * 0.11, 0.95, 0], [s * 0.11, 0.5, 0.01], [s * 0.11, 0.1, 0]], [0.085, 0.07, 0.06], M);
    if (hi) { ctx.color("oklch(0.33 0.04 120)"); sphere(ctx, [s * 0.19, 0.6, 0], 0.06, 8, [0.6, 1.2, 0.9]); } // cargo pocket
    ctx.color("oklch(0.22 0.02 50)"); tube(ctx, [[s * 0.11, 0.12, 0.03], [s * 0.11, 0.07, -0.05], [s * 0.11, 0.06, -0.15]], [0.07, 0.065, 0.055], 8, [1, 0.7]);
  }
  ctx.bone("spine");
  ctx.color(JACKET); tube(ctx, [[0, 0.88, 0], [0, 1.1, 0.01], [0, 1.38, 0.02], [0, 1.5, 0.01]], [0.19, 0.2, 0.22, 0.14], M, [1, 0.7]);
  ctx.color("oklch(0.85 0.01 250)"); for (const y of [1.05, 1.2]) tube(ctx, [[-0.2, y, 0], [0, y, -0.15], [0.2, y, 0]], [0.012, 0.012, 0.012], 6); // reflective stripes
  if (role === "medic") { ctx.color("oklch(0.6 0.22 25)"); tube(ctx, [[0, 1.2, -0.16], [0, 1.36, -0.16]], [0.025, 0.025], 4); tube(ctx, [[-0.07, 1.28, -0.16], [0.07, 1.28, -0.16]], [0.025, 0.025], 4); }
  else { ctx.color("oklch(0.3 0.06 250)"); sphere(ctx, [0.1, 1.33, -0.15], 0.045, 8, [1, 1, 0.3]); ctx.color("oklch(0.85 0.12 90)"); sphere(ctx, [0.1, 1.33, -0.165], 0.022, 6, [1.4, 0.7, 0.3]); } // the eagle patch
  if (role === "quarter" && hi) { ctx.color("oklch(0.3 0.03 60)"); tube(ctx, [[-0.2, 1.45, 0.02], [0.15, 1.0, -0.15], [0.21, 0.92, 0]], [0.02, 0.02, 0.02], 6); } // a bag strap
  for (const [n, s] of [["armL", -1], ["armR", 1]]) {
    ctx.bone(n); ctx.color(JACKET); tube(ctx, [[s * 0.22, 1.44, 0.01], [s * 0.27, 1.17, 0], [s * 0.28, 0.92, -0.04]], [0.065, 0.055, 0.05], M);
    ctx.color(SKIN); sphere(ctx, [s * 0.285, 0.86, -0.05], 0.05, 8, [0.8, 1.1, 1]);
  }
  ctx.bone("head");
  ctx.color(SKIN); tube(ctx, [[0, 1.48, 0], [0, 1.56, 0]], [0.055, 0.055], 8); sphere(ctx, [0, 1.68, -0.01], 0.115, M, [0.92, 1.1, 1]);
  sphere(ctx, [0, 1.66, -0.12], 0.022, 6, [0.8, 1, 1]); // nose
  ctx.color("oklch(0.12 0 0)"); for (const s of [-1, 1]) sphere(ctx, [s * 0.04, 1.71, -0.105], 0.013, 6);
  ctx.color("oklch(0.45 0.08 25)"); tube(ctx, [[-0.03, 1.62, -0.108], [0, 1.615, -0.112], [0.03, 1.62, -0.108]], [0.006, 0.007, 0.006], 4);
  ctx.color(HAIR); sphere(ctx, [0, 1.72, 0.015], 0.12, M, [0.97, 0.9, 1]);
  if (role === "scout") { ctx.color("oklch(0.86 0.21 125)"); sphere(ctx, [0, 1.76, 0], 0.122, M, [1, 0.55, 1]); tube(ctx, [[0, 1.76, -0.08], [0, 1.755, -0.2]], [0.08, 0.075], 8, [1, 0.15]); } // lime cap
  if (role === "quarter") { ctx.color("oklch(0.35 0.05 30)"); sphere(ctx, [0, 1.75, 0.005], 0.125, M, [1, 0.75, 1]); } // beanie
  if (role === "medic") { ctx.color(HAIR); sphere(ctx, [0, 1.68, 0.12], 0.06, 8); } // a bun
}
