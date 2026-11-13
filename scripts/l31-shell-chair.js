// molded fiberglass shell chair on a chrome sled frame (Level 31 snack bar), front −Z, seat 0.46 m
import { tube, plate } from "./lib/diner-shapes.js";
export function geometry(ctx) {
  const col = ctx.params.color ?? "#d9661e", lod = ctx.lod;
  const bend = (x, z) => 0.025 * (x / 0.22) ** 2 + 0.012 * (z / 0.21) ** 2; // the dish of the seat
  ctx.color(col); ctx.roughness(0.32);
  plate(ctx, { w: 0.225, d: 0.215, th: 0.028, rings: lod < 3 ? 5 : 2, seg: lod < 3 ? 40 : 16, map: (x, z, h) => [x, 0.445 + bend(x, z) + h, z - 0.01] });
  // backrest: curved around the sitter, raked back 12°
  const rake = 12 * Math.PI / 180;
  plate(ctx, { w: 0.215, d: 0.16, th: 0.024, rings: lod < 3 ? 4 : 2, seg: lod < 3 ? 40 : 16, map: (x, y, h) => {
    const yy = y + 0.16, wrap = 0.06 * (x / 0.215) ** 2; const z = 0.2 + wrap - h + Math.sin(rake) * yy;
    return [x, 0.53 + Math.cos(rake) * yy, z]; } });
  if (lod < 3) { // the two struts that hold the back
    ctx.color(col); for (const s of [-1, 1]) tube(ctx, [s * 0.14, 0.47, 0.17], [s * 0.15, 0.6, 0.21], 0.018, 8);
  }
  // chrome legs, splayed
  ctx.color("#d8dde2"); ctx.metalness(0.95); ctx.roughness(0.18);
  const seg = lod < 3 ? 10 : 5;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    tube(ctx, [sx * 0.165, 0.45, sz * 0.15], [sx * 0.21, 0.012, sz * 0.2], 0.011, seg);
    if (lod < 2) { ctx.color("#1a1a1a"); ctx.metalness(0); ctx.roughness(0.8); tube(ctx, [sx * 0.21, 0.0, sz * 0.2], [sx * 0.21, 0.014, sz * 0.2], 0.014, 8); ctx.color("#d8dde2"); ctx.metalness(0.95); ctx.roughness(0.18); }
  }
  if (lod < 3) for (const sx of [-1, 1]) tube(ctx, [sx * 0.19, 0.16, -0.18], [sx * 0.19, 0.16, 0.18], 0.008, seg); // side stretchers
}
export function collider() { return [{ kind: "box", width: 0.46, height: 0.47, depth: 0.44, center: [0, 0.235, 0] }, { kind: "box", width: 0.44, height: 0.4, depth: 0.06, center: [0, 0.7, 0.22] }]; }
