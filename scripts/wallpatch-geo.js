// What is left of a broken wall below Level 0: the level mesh leaves this edge out (params.cut) and this draws it back,
// chunk by chunk (cols x rows voxels), the broken chunks gone and the edges round each hole bitten ragged.
// Local frame: feet at the wall's centre on the floor; the wall runs along local z (yaw turns it for "z" walls).
import { slab } from "./lib/shapes.js";
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const h3 = (a, b, c) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return v - Math.floor(v); };
export function geometry(ctx) {
  const P = ctx.params ?? {}, L = P.len ?? 4, H = P.H ?? 3, T = P.T ?? 0.2, C = P.cols ?? 4, R = P.rows ?? 3, seed = P.seed ?? 1;
  const gone = new Set(P.broken ?? []), dead = (u, v) => u >= 0 && u < C && v >= 0 && v < R && gone.has(`${u}:${v}`);
  const cw = L / C, rh = H / R, SUB = ctx.lod <= 2 ? 4 : 2, sw = cw / SUB, sh = rh / SUB;
  ctx.albedo(P.tex ?? null); ctx.color(P.col ?? "oklch(0.8 0.01 80)"); ctx.roughness(P.rough ?? 0.85);
  const core = [];
  for (let u = 0; u < C; u++) for (let v = 0; v < R; v++) {
    if (dead(u, v)) continue;
    const z0 = -L / 2 + u * cw, y0 = v * rh;
    const nearHole = dead(u - 1, v) || dead(u + 1, v) || dead(u, v - 1) || dead(u, v + 1);
    if (!nearHole) { box(ctx, -T, T, y0, y0 + rh, z0, z0 + cw); continue; }
    // bitten: sub-blocks along the edges facing a hole drop out at random, the next row in thins a little
    for (let i = 0; i < SUB; i++) for (let j = 0; j < SUB; j++) {
      const dl = dead(u - 1, v) ? i : 99, dr = dead(u + 1, v) ? SUB - 1 - i : 99, db = dead(u, v - 1) ? j : 99, dt = dead(u, v + 1) ? SUB - 1 - j : 99;
      const edge = Math.min(dl, dr, db, dt), r = h3(seed + u * 7 + i, v * 5 + j, 3);
      if ((edge === 0 && r < 0.55) || (edge === 1 && r < 0.2)) continue;
      const bz0 = z0 + i * sw, by0 = y0 + j * sh, thin = edge === 0 ? 0.25 + 0.5 * h3(i, j, seed) : 0;
      box(ctx, -T + thin * T, T - thin * T * h3(j, i, seed + 1), by0, by0 + sh, bz0, bz0 + sw);
      if (edge <= 1) core.push([bz0, by0]);
    }
  }
  // the broken core: raw grey grit where the face came off, and for concrete a few bent rebar stubs
  ctx.albedo(null); ctx.color(P.core ?? "oklch(0.55 0.01 80)"); ctx.roughness(1);
  for (const [z, y] of core) if (h3(z, y, seed + 2) < 0.5) box(ctx, -T * 0.45, T * 0.45, y + sh * 0.1, y + sh * 0.9, z + sw * 0.1, z + sw * 0.9);
  if (P.rebar) {
    ctx.color("oklch(0.38 0.05 45)"); ctx.metalness(0.6);
    for (let u = 0; u < C; u++) for (let v = 0; v < R; v++) if (dead(u, v)) for (const k of [0.33, 0.66]) {
      const z = -L / 2 + (u + k) * cw, y = v * rh + rh * 0.5, l = rh * (0.2 + 0.25 * h3(u, v, k * 9));
      if (!dead(u, v - 1) || v === 0) box(ctx, -0.012, 0.012, v * rh, v * rh + l, z - 0.012, z + 0.012);
      if (!dead(u, v + 1) && v < R - 1) box(ctx, -0.012, 0.012, (v + 1) * rh - l, (v + 1) * rh, z - 0.012, z + 0.012);
      void y;
    }
    ctx.metalness(0);
  }
  ctx.albedo(null);
}
