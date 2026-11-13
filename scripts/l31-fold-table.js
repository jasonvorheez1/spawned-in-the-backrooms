// cafeteria folding table with its two benches, the rink-party kind: white blow-molded top 2.44 x 0.76 m at 0.74 m,
// white bench planks at 0.45 m either side, black steel A-frame legs and the cross rails that join them. Long axis X.
import { tube, plate } from "./lib/diner-shapes.js";
export function geometry(ctx) {
  const lod = ctx.lod, L = 1.22, seg = lod < 3 ? 40 : 14;
  const off = ctx.params.wear ?? 0;
  ctx.color(off ? "#e7e3d8" : "#f1efe8"); ctx.roughness(0.55);
  plate(ctx, { w: L, d: 0.38, th: 0.045, n: 9, rings: lod < 3 ? 3 : 1, seg, map: (x, z, h) => [x, 0.695 + h, z] });
  for (const s of [-1, 1]) plate(ctx, { w: L, d: 0.14, th: 0.04, n: 9, rings: lod < 3 ? 2 : 1, seg, map: (x, z, h) => [x, 0.41 + h, s * 0.64 + z] });
  ctx.color("#18181a"); ctx.metalness(0.55); ctx.roughness(0.45);
  const r = 0.019, sides = lod < 3 ? 8 : 4;
  for (const x of [-0.95, 0.95]) {
    tube(ctx, [x, 0.69, -0.28], [x, 0.69, 0.28], r, sides); // under-top rail
    for (const s of [-1, 1]) {
      tube(ctx, [x, 0.69, s * 0.2], [x, 0.0, s * 0.72], r, sides); // splayed leg out to the bench foot
      tube(ctx, [x, 0.41, s * 0.57], [x, 0.41, s * 0.71], r, sides); // bench bracket
      if (lod < 3) { ctx.color("#0c0c0c"); tube(ctx, [x, 0, s * 0.72], [x, 0.02, s * 0.72], 0.03, 8); ctx.color("#18181a"); }
    }
  }
  tube(ctx, [-0.95, 0.3, 0], [0.95, 0.3, 0], 0.016, sides); // the long stretcher
  for (const x of [-0.95, 0.95]) tube(ctx, [x, 0.3, -0.42], [x, 0.3, 0.42], 0.016, sides);
}
export function collider() {
  return [{ kind: "box", width: 2.44, height: 0.05, depth: 0.76, center: [0, 0.72, 0] }, { kind: "box", width: 2.44, height: 0.04, depth: 0.28, center: [0, 0.43, -0.64] }, { kind: "box", width: 2.44, height: 0.04, depth: 0.28, center: [0, 0.43, 0.64] }];
}
