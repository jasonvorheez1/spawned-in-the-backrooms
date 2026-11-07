// A melee weapon lying on the carpet: a rod in the weapon's colour with a darker grip. params.kind picks which.
import { tube } from "./lib/shapes.js";
import W from "./lib/data/weapons.yml";
export function geometry(ctx) {
  const w = W[ctx.params?.kind] ?? W.table_leg, len = w.length ?? 0.7, M = ctx.lod <= 2 ? 8 : 5;
  ctx.roughness(0.6);
  ctx.color(w.color ?? "oklch(0.55 0.08 60)");
  tube(ctx, [[0, 0.04, 0], [0, 0.04, len * 0.7], [0, 0.04, len]], [0.025, 0.03, 0.04], M);
  ctx.color("oklch(0.25 0.02 80)");
  tube(ctx, [[0, 0.04, 0], [0, 0.04, len * 0.25]], [0.03, 0.03], M);
  ctx.color(null);
}
export function collider() { return null; }
