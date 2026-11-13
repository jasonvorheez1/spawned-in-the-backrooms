// shoe-fitting stool (Shelly Nov 13 "de ai slop this"): the clerk's low tufted vinyl seat with the slanted foot rest out front,
// chrome tube legs on rubber feet, a ribbed rubber tread on the slant where the sizer sits. Seat top 0.42 m, slant 0.24 -> 0.36 m.
import { tube, plate } from "./lib/diner-shapes.js";
export function geometry(ctx) {
  const lod = ctx.lod, seg = lod < 3 ? 36 : 14;
  // seat: oxblood vinyl cushion over a dark base board, a little worn toward the front edge
  ctx.color("#1e1a18"); ctx.roughness(0.7);
  plate(ctx, { w: 0.2, d: 0.17, th: 0.025, n: 4, rings: 1, seg, map: (x, z, h) => [x, 0.37 + h, 0.12 + z] });
  ctx.color("#6e1b1d"); ctx.roughness(0.38);
  plate(ctx, { w: 0.205, d: 0.175, th: 0.03, n: 3.2, rings: lod < 3 ? 4 : 1, seg, map: (x, z, h) => {
    const r = Math.min(1, Math.hypot(x / 0.205, z / 0.175)); return [x, 0.395 + h * (1 - r * r * 0.6) + (h ? 0.012 * (1 - r) : 0), 0.12 + z]; } });
  if (lod < 2) { ctx.color("#3a0e10"); for (const [bx, bz] of [[-0.08, 0.06], [0.08, 0.06], [-0.08, 0.18], [0.08, 0.18], [0, 0.12]]) tube(ctx, [bx, 0.43, bz], [bx, 0.437, bz], 0.009, 8); }
  // slant: steel tray with a ribbed rubber tread, front edge low
  const slope = 0.4, sy = 0.3, sz = -0.25;
  ctx.color("#2b2d30"); ctx.metalness(0.7); ctx.roughness(0.35);
  plate(ctx, { w: 0.15, d: 0.18, th: 0.02, n: 6, rings: 1, seg, map: (x, z, h) => [x, sy + z * slope + h, sz + z],
    rim: { color: "#c9ced2", metal: 0.95, rough: 0.18 } });
  ctx.metalness(0); ctx.color("#151515"); ctx.roughness(0.95);
  if (lod < 3) for (let i = -6; i <= 6; i++) { const z = i * 0.026; tube(ctx, [-0.12, sy + z * slope + 0.024, sz + z], [0.12, sy + z * slope + 0.024, sz + z], 0.005, 5); }
  // toe stop at the low end
  ctx.color("#c9ced2"); ctx.metalness(0.95); ctx.roughness(0.18);
  tube(ctx, [-0.14, sy - 0.18 * slope + 0.035, sz - 0.18], [0.14, sy - 0.18 * slope + 0.035, sz - 0.18], 0.012, 10);
  // chrome legs: four under the seat, two under the slant's toe, one cross rail
  const lg = lod < 3 ? 10 : 6;
  for (const [x, z] of [[-0.15, 0.0], [0.15, 0.0], [-0.15, 0.24], [0.15, 0.24]]) tube(ctx, [x * 1.12, 0.02, z + (z > 0.1 ? 0.03 : -0.02)], [x, 0.37, z], 0.012, lg);
  for (const x of [-0.12, 0.12]) tube(ctx, [x * 1.1, 0.02, sz - 0.2], [x, sy - 0.17 * slope, sz - 0.16], 0.011, lg);
  tube(ctx, [-0.16, 0.12, 0.0], [0.16, 0.12, 0.0], 0.008, lg); tube(ctx, [-0.13, 0.1, sz - 0.18], [0.13, 0.1, sz - 0.18], 0.008, lg);
  for (const x of [-0.16, 0.16]) tube(ctx, [x, 0.12, 0.0], [x * 0.85, 0.1, sz - 0.18], 0.008, lg);
  // rubber feet
  ctx.metalness(0); ctx.color("#0d0d0d"); ctx.roughness(0.9);
  for (const [x, z] of [[-0.168, -0.02], [0.168, -0.02], [-0.168, 0.27], [0.168, 0.27], [-0.132, sz - 0.2], [0.132, sz - 0.2]]) tube(ctx, [x, 0, z], [x, 0.022, z], 0.02, 10);
}
export function collider() { return [{ kind: "box", width: 0.42, height: 0.44, depth: 0.78, center: [0, 0.22, -0.02] }]; }
