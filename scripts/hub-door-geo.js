// A Hub level door. Local frame: the tunnel wall's face is z = 0, the recess runs back to +z; the body faces -z.
// part "frame": the cast surround, its lintel and the dark behind. part "leaf": the slab that slides aside.
import { slab, rounded, tube } from "./lib/shapes.js";
import { CURB, DOOR_W, DOOR_H, OPEN_W, OPEN_H, rnd } from "./lib/thehub.js";
const CONC = "cdn/texture-board-formed-cast-concrete-tunnel-wall-panel-soot-streaks-weathered.png";
const STEEL = "cdn/texture-dark-oiled-steel-plate-scuffed-rust-edges.png";
const B = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
function frame(ctx, solid) {
  const hw = DOOR_W / 2, ow = OPEN_W / 2, top = CURB + OPEN_H, T = DOOR_H;
  if (!solid) { ctx.albedo(CONC); ctx.color("oklch(0.86 0.008 78)"); ctx.roughness(0.9); }
  B(ctx, -hw, -ow, CURB, T, 0.5, 0.75); B(ctx, ow, hw, CURB, T, 0.5, 0.75); B(ctx, -ow, ow, top, T, 0.5, 0.75);
  if (solid) return;
  // chamfered reveal round the opening, a raised lintel block for the mark, a worn sill
  ctx.color("oklch(0.8 0.008 75)");
  B(ctx, -ow - 0.16, -ow, CURB, top + 0.16, 0.42, 0.5); B(ctx, ow, ow + 0.16, CURB, top + 0.16, 0.42, 0.5); B(ctx, -ow - 0.16, ow + 0.16, top, top + 0.16, 0.42, 0.5);
  ctx.color("oklch(0.9 0.008 82)"); B(ctx, -1.25, 1.25, top + 0.25, T - 0.1, 0.4, 0.5);
  ctx.albedo(STEEL); ctx.color("oklch(0.8 0.01 70)"); ctx.metalness(0.7); ctx.roughness(0.55);
  B(ctx, -ow, ow, CURB, CURB + 0.025, 0.45, 1.1); // sill plate and the track the slab rides
  B(ctx, -ow, hw + 0.5, top - 0.02, top + 0.06, 0.77, 1.06);
  ctx.metalness(0); ctx.albedo(null); ctx.color("oklch(0.02 0 0)"); ctx.roughness(1); B(ctx, -ow - 0.2, ow + 0.2, CURB, top + 0.2, 1.22, 1.26); // the dark past the slab
}
function leaf(ctx, solid) {
  const w = OPEN_W / 2 + 0.12, h = OPEN_H + 0.1;
  if (solid) { B(ctx, -w, w, 0, h, 0, 0.26); return; }
  const R = (k) => rnd(ctx.seed >>> 0, k);
  ctx.albedo(CONC); ctx.color("oklch(0.93 0.008 84)"); ctx.roughness(0.9);
  rounded(ctx, [0, h / 2, 0.13], [w, h / 2, 0.13], 0.03);
  ctx.color("oklch(0.86 0.008 80)"); // three cast panels, recessed joints between
  for (let i = 0; i < 3; i++) rounded(ctx, [0, 0.25 + (i + 0.5) * ((h - 0.4) / 3), -0.012], [w - 0.18, (h - 0.4) / 6 - 0.04, 0.02], 0.015);
  ctx.albedo(STEEL); ctx.color("oklch(0.78 0.012 65)"); ctx.metalness(0.75); ctx.roughness(0.5);
  B(ctx, -w - 0.01, -w + 0.09, 0, h, -0.02, 0.28); B(ctx, w - 0.09, w + 0.01, 0, h, -0.02, 0.28); B(ctx, -w, w, 0, 0.1, -0.02, 0.28); B(ctx, -w, w, h - 0.1, h, -0.02, 0.28); // edge banding
  // the escutcheon, off-centre at hand height, and its keyhole
  const kx = w - 0.42, ky = 1.15;
  rounded(ctx, [kx, ky, -0.03], [0.11, 0.2, 0.018], 0.012);
  if (ctx.lod <= 2) for (const [dx, dy] of [[-0.075, 0.16], [0.075, 0.16], [-0.075, -0.16], [0.075, -0.16]]) B(ctx, kx + dx - 0.012, kx + dx + 0.012, ky + dy - 0.012, ky + dy + 0.012, -0.056, -0.045);
  ctx.metalness(0); ctx.albedo(null); ctx.color("oklch(0.03 0 0)"); ctx.roughness(1);
  B(ctx, kx - 0.018, kx + 0.018, ky - 0.01, ky + 0.045, -0.052, -0.047); B(ctx, kx - 0.008, kx + 0.008, ky - 0.07, ky, -0.052, -0.047);
  // form-tie holes and a rust weep or two
  if (ctx.lod <= 2) for (let i = 0; i < 6; i++) { const x = (i % 2 ? 1 : -1) * (w - 0.45), y = 0.55 + Math.floor(i / 2) * 1.12; if (Math.abs(x - kx) < 0.3 && Math.abs(y - ky) < 0.4) continue; B(ctx, x - 0.02, x + 0.02, y - 0.02, y + 0.02, -0.034, -0.03); }
  ctx.color("oklch(0.34 0.07 50)"); for (let i = 0; i < 3; i++) if (R(i) > 0.45) { const x = (R(10 + i) - 0.5) * 2 * (w - 0.3); B(ctx, x - 0.012, x + 0.012, h - 0.1 - 0.3 - R(20 + i) * 0.8, h - 0.1, -0.035, -0.033); }
}
export function geometry(ctx) { (ctx.params.part === "leaf" ? leaf : frame)(ctx, false); }
export function collider(ctx) { (ctx.params.part === "leaf" ? leaf : frame)(ctx, true); }
