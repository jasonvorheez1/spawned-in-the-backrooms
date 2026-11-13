// one rink-cafe booth bench: tufted green vinyl seat and tall back on a white laminate plinth. 1.4 m long (X),
// seat 0.46 m high, 0.5 m deep, back 1.05 m. The sitter faces -Z; the back is at +Z.
import { plate } from "./lib/diner-shapes.js";
export function geometry(ctx) {
  const lod = ctx.lod, seg = lod < 3 ? 36 : 12, W = 0.7;
  const green = ctx.params.color ?? "#2f9a4a";
  // plinth
  ctx.color("#e9e6dc"); ctx.roughness(0.5);
  plate(ctx, { w: W, d: 0.25, th: 0.36, n: 10, rings: 1, seg, map: (x, z, h) => [x, h + 0.0, z + 0.02] });
  plate(ctx, { w: W, d: 0.07, th: 0.62, n: 10, rings: 1, seg, map: (x, z, h) => [x, 0.36 + h, z + 0.21] });
  // cushion: a soft, crowned seat with a rolled front
  ctx.color(green); ctx.roughness(0.38);
  const crown = (x, z) => 0.025 * (1 - (x / W) ** 8) * (1 - (z / 0.25) ** 4);
  plate(ctx, { w: W - 0.01, d: 0.25, th: 0.1, n: 6, rings: lod < 3 ? 5 : 2, seg, map: (x, z, h) => [x, 0.36 + h * (1 + crown(x, z) * 10 / 0.1 * 0.1) , z - 0.01] });
  // back cushion in three channel-tufted rolls
  for (let i = 0; i < 3; i++) {
    const y0 = 0.5 + i * 0.18;
    plate(ctx, { w: W - 0.02, d: 0.085, th: 0.09, n: 5, rings: lod < 3 ? 3 : 1, seg, map: (x, y, h) => [x, y0 + 0.085 + y, 0.17 - h - 0.02 * (1 - (x / W) ** 6)] });
  }
  // a darker piping along the top
  ctx.color("#1d6a32");
  plate(ctx, { w: W, d: 0.11, th: 0.04, n: 10, rings: 1, seg, map: (x, z, h) => [x, 1.0 + h, z + 0.2] });
}
export function collider() {
  return [{ kind: "box", width: 1.4, height: 0.46, depth: 0.52, center: [0, 0.23, 0] }, { kind: "box", width: 1.4, height: 1.04, depth: 0.14, center: [0, 0.52, 0.21] }];
}
