// First-person kick: the wearer's own leg from the critter look (params: species fur botw bottom shoes shoec).
// Leg space: +Y runs from the hip (y 0) down to the foot (y -0.95); the foot points -Z. Smooth tapered tubes, no boxes.
import { tube, sphere } from "./lib/shapes.js";
import { SPECIES } from "./critter2-geo.js";
const BARE = new Set(["shorts", "skirt", "none", "", undefined]);
export function geometry(ctx) {
  const P = ctx.params ?? {}, sp = SPECIES[P.species] ?? null, M = ctx.lod <= 2 ? 16 : 9
  const FUR = P.fur || sp?.fur || "oklch(0.74 0.055 55)", CLOTH = P.bottom || "#3d5a98"
  const pants = !BARE.has(P.botw), shoe = P.shoes && P.shoes !== "none"
  ctx.smooth()
  // thigh then shin, a slight bend at the knee
  ctx.color(pants ? CLOTH : FUR)
  tube(ctx, [[0, 1.02, 0.02], [0, 0.72, 0], [0, 0.49, -0.03]], [0.115, 0.1, 0.085], M)
  sphere(ctx, [0, 0.49, -0.03], 0.088, M)
  ctx.color(pants && P.botw !== "capris" ? CLOTH : FUR)
  tube(ctx, [[0, 0.49, -0.03], [0, 0.29, -0.01], [0, 0.13, 0]], [0.085, 0.072, 0.062], M)
  // foot: a shoe in its colour with a white sole, or a soft paw
  if (shoe) {
    ctx.color(P.shoec || "#c0392b"); sphere(ctx, [0, 0.07, -0.06], 0.075, M, [1, 0.8, 1.7])
    ctx.color(P.shoes === "boots" ? "#2a2420" : "#ffffff"); sphere(ctx, [0, 0.02, -0.06], 0.078, M, [1.05, 0.32, 1.75])
  } else {
    ctx.color(FUR); sphere(ctx, [0, 0.07, -0.05], 0.07, M, [1, 0.75, 1.6])
  }
  ctx.color(null)
}
