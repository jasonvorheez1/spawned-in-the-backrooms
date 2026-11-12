// A Backrooms Remodeling Co. employee: a pitch-black featureless figure, two big white circle eyes,
// in the crew uniform: blue-grey trench coat, red pauldrons, white apron, black belt, brown trousers,
// black rain boots, dark grey beret with a rank badge. Faces -Z. params.badge: copper | silver | gold
import { tube, sphere } from "./lib/shapes.js";
const BADGE = { copper: "oklch(0.6 0.12 50)", silver: "oklch(0.85 0.01 250)", gold: "oklch(0.82 0.14 85)" };
export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 18 : 8, p = ctx.params ?? {};
  ctx.smooth(); ctx.roughness(0.9);
  ctx.color("oklch(0.12 0.01 40)"); // boots
  for (const s of [-1, 1]) tube(ctx, [[s * 0.11, 0, -0.03], [s * 0.11, 0.32, 0]], [0.08, 0.075], M);
  ctx.color("oklch(0.4 0.06 55)"); // wool trousers
  for (const s of [-1, 1]) tube(ctx, [[s * 0.11, 0.3, 0], [s * 0.11, 0.62, 0], [s * 0.11, 0.9, 0]], [0.075, 0.08, 0.09], M);
  ctx.color("oklch(0.62 0.03 240)"); // trench coat
  tube(ctx, [[0, 0.5, 0], [0, 0.95, 0], [0, 1.3, 0], [0, 1.5, 0]], [0.24, 0.21, 0.2, 0.17], M, [1, 0.72]);
  ctx.color("oklch(0.95 0.005 90)"); // apron
  tube(ctx, [[0, 0.55, -0.075], [0, 1.0, -0.085], [0, 1.38, -0.075]], [0.17, 0.16, 0.12], M, [1, 0.3]);
  ctx.color("oklch(0.1 0 0)"); // belt
  tube(ctx, [[0, 1.0, 0], [0, 1.05, 0]], [0.215, 0.215], M, [1, 0.75]);
  ctx.color("oklch(0.5 0.17 27)"); // pauldrons
  for (const s of [-1, 1]) sphere(ctx, [s * 0.19, 1.47, 0], 0.075, M, [1.3, 0.6, 1.1]);
  ctx.color("oklch(0.62 0.03 240)"); // sleeves
  for (const s of [-1, 1]) tube(ctx, [[s * 0.2, 1.45, 0], [s * 0.25, 1.15, 0], [s * 0.24, 0.88, -0.04]], [0.06, 0.055, 0.05], M);
  ctx.color("oklch(0.08 0.005 280)"); // black hands, neck, featureless head
  for (const s of [-1, 1]) sphere(ctx, [s * 0.24, 0.84, -0.05], 0.05, M);
  tube(ctx, [[0, 1.5, 0], [0, 1.6, 0]], [0.06, 0.06], M);
  sphere(ctx, [0, 1.74, 0], 0.15, M, [0.95, 1.08, 1]);
  ctx.roughness(0.4); ctx.color("oklch(0.98 0 0)"); // the eyes: big white circles
  for (const s of [-1, 1]) sphere(ctx, [s * 0.058, 1.76, -0.13], 0.045, M, [1, 1, 0.35]);
  ctx.roughness(0.9); ctx.color("oklch(0.3 0.01 250)"); // beret
  sphere(ctx, [0.03, 1.87, 0], 0.15, M, [1.1, 0.35, 1.05]);
  ctx.roughness(0.3); ctx.color(BADGE[p.badge] ?? BADGE.copper);
  sphere(ctx, [-0.05, 1.89, -0.135], 0.022, M, [1, 1, 0.4]);
}
