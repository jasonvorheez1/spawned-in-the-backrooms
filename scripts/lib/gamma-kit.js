// Base Gamma's mesh kit: textures by name and a few solid forms shared by the gamma geometries.
import { slab, tube, prism, face, sphere } from "./shapes.js";
export const TX = {
  terrazzo: "cdn/texture-grey-terrazzo-floor-tiles-dusty.png", tile: "cdn/texture-glossy-tan-brown-glazed-ceramic-wall-tiles.png",
  cinder: "cdn/texture-painted-cinder-block-wall-clean.png", brick: "cdn/texture-dark-brown-brick-wall-grimy-mortar.png",
  hardwood: "cdn/texture-worn-hardwood-grain.png", carpet: "cdn/texture-damp-beige-berber-office-carpet.png",
  concrete: "cdn/texture-stained-concrete-floor.png", ceiling: "cdn/texture-dirty-concrete-ceiling-slab.png",
  steel: "cdn/texture-scratched-worn-steel.png", planks: "cdn/texture-weathered-wood-planks.png", canvas: "cdn/texture-worn-canvas-fabric.png",
  tin: "cdn/texture-corrugated-rusty-metal-sheet.png", plaster: "cdn/texture-chalky-stained-concrete-wall.png",
  asphalt: "cdn/texture-cracked-dark-asphalt-road.png", fortress: "cdn/texture-brown-and-yellow-brick-wall.png",
  rustwhite: "cdn/texture-peeling-white-paint-rusty-steel.png", rock: "cdn/texture-rough-dark-rock-mine-wall.png",
  siding: "cdn/texture-painted-wood-clapboard-siding.png", shingle: "cdn/texture-asphalt-roof-shingles.png", acoustic: "cdn/texture-white-acoustic-drop-ceiling-tile-grid.png",
};
export const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
// paint: colour, optional texture, roughness, metalness, glow
export function paint(ctx, color, tex = null, rough = 0.85, metal = 0, glow = null) {
  ctx.albedo(tex ? TX[tex] ?? tex : null); ctx.color(color); ctx.roughness(rough); ctx.metalness(metal); ctx.emissive(glow);
}
// a bar from a to b of radius r (sides: 4 square-ish, 6+ round)
export const rod = (ctx, a, b, r, M = 6) => tube(ctx, [a, b], [r, r], M, [1, 1], 0, 1, 1);
// a cylinder standing at x,z from y0 to y1
export const post = (ctx, x, z, y0, y1, r, M = 8) => tube(ctx, [[x, y0, z], [x, y1, z]], [r, r], M, [1, 1], 0, 1, 1);
// a closed disc cap: a flat polygon at height y
export function disc(ctx, x, z, y, r, M = 12, up = true) {
  const pts = []; for (let k = 0; k < M; k++) { const t = (k / M) * Math.PI * 2; pts.push([x + Math.cos(t) * r, z + Math.sin(t) * r]); }
  prism(ctx, pts, y - 0.01, y);
}
export const cyl = (ctx, x, z, y0, y1, r, M = 12) => { const pts = []; for (let k = 0; k < M; k++) { const t = (k / M) * Math.PI * 2; pts.push([x + Math.cos(t) * r, z + Math.sin(t) * r]); } prism(ctx, pts, y0, y1); };
// a gable roof prism along x (ridge along x) or z
export function gable(ctx, x0, x1, z0, z1, y0, ridge, alongX = true) {
  if (alongX) { const zm = (z0 + z1) / 2;
    face(ctx, [x0, y0, z0], [x1, y0, z0], [x1, ridge, zm], [x0, ridge, zm], [0, 1, -1]);
    face(ctx, [x0, y0, z1], [x1, y0, z1], [x1, ridge, zm], [x0, ridge, zm], [0, 1, 1]);
    ctx.tri(x0, y0, z0, x0, y0, z1, x0, ridge, zm); ctx.tri(x1, y0, z0, x1, ridge, zm, x1, y0, z1);
  } else { const xm = (x0 + x1) / 2;
    face(ctx, [x0, y0, z0], [x0, y0, z1], [xm, ridge, z1], [xm, ridge, z0], [-1, 1, 0]);
    face(ctx, [x1, y0, z0], [x1, y0, z1], [xm, ridge, z1], [xm, ridge, z0], [1, 1, 0]);
    ctx.tri(x0, y0, z0, xm, ridge, z0, x1, y0, z0); ctx.tri(x0, y0, z1, x1, y0, z1, xm, ridge, z1);
  }
}
// concertina barbed wire: a helix of wire along a straight line at height y
export function wire(ctx, a, b, r = 0.3, turnsPerM = 2.2) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(8, Math.round(L * turnsPerM * (ctx.lod <= 1 ? 10 : 5)));
  const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L], u = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  const pts = [], rads = [];
  for (let i = 0; i <= n; i++) { const t = i / n, th = t * L * turnsPerM * Math.PI * 2; const s = r * (0.92 + 0.08 * Math.sin(th * 3.1));
    pts.push([0, 1, 2].map((k) => a[k] + d[k] * t * L + u[k] * Math.cos(th) * s + v[k] * Math.sin(th) * s)); rads.push(0.008); }
  tube(ctx, pts, rads, 3, [1, 1], 0, 1, 1);
}
export { slab, tube, prism, face, sphere };
