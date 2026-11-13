// pedestal diner table: boomerang formica top with a ribbed chrome edge band, cast-iron cross foot; top 0.76 m
import { tube, plate } from "./lib/diner-shapes.js";
export function geometry(ctx) {
  const lod = ctx.lod, r = ctx.params.size ?? 0.42;
  ctx.albedo("cdn/texture-cream-boomerang-pattern-formica-laminate-1950s-diner.png"); ctx.color("#fff8ec"); ctx.roughness(0.35);
  plate(ctx, { w: r, d: r, th: 0.03, n: ctx.params.round ? 2 : 4.5, rings: lod < 3 ? 4 : 1, seg: lod < 3 ? 48 : 16, map: (x, z, h) => [x, 0.73 + h, z],
    rim: { color: "#e3e7ea", metal: 0.95, rough: 0.15 } });
  ctx.albedo(null);
  // column, flared at the foot
  ctx.color("#202124"); ctx.metalness(0.6); ctx.roughness(0.45);
  tube(ctx, [0, 0.05, 0], [0, 0.72, 0], 0.035, lod < 3 ? 14 : 6);
  if (lod < 3) { ctx.color("#cfd4d8"); ctx.metalness(0.95); ctx.roughness(0.2); tube(ctx, [0, 0.69, 0], [0, 0.73, 0], 0.08, 18); ctx.color("#202124"); ctx.metalness(0.6); ctx.roughness(0.45); }
  // cross foot: two bars with rounded pads
  for (const a of [45, 135]) {
    const c = Math.cos(a * Math.PI / 180) * 0.3, s = Math.sin(a * Math.PI / 180) * 0.3;
    tube(ctx, [-c, 0.035, -s], [c, 0.035, s], 0.028, lod < 3 ? 8 : 4);
    if (lod < 3) for (const k of [-1, 1]) { ctx.color("#111"); tube(ctx, [k * c, 0, k * s], [k * c, 0.02, k * s], 0.04, 10); ctx.color("#202124"); }
  }
}
export function collider() { return [{ kind: "cylinder", radiusTop: 0.42, radiusBottom: 0.42, height: 0.04, center: [0, 0.745, 0] }, { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.05, height: 0.72, center: [0, 0.36, 0] }]; }
