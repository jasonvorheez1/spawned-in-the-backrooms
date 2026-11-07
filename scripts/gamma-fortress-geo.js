// Base Gamma's fortress face in Level 3, world coordinates: a brown-and-yellow brick wall across the outpost's north side
// (x -52..-36, against z -12), buttress piers, a yellow brick band, a steel cap, barbed wire coils under the ceiling,
// floodlight housings on brackets, a guard tower stub in the west corner with a lit gun slit, hazard jambs by the great door.
import { box, paint, rod, post, wire } from "./lib/gamma-kit.js";
const X0 = -52, X1 = -36, ZB = -12, ZF = -11.3, TOP = 2.97, DX = -44, DW = 1.55; // door opening half width incl. frame
const PIERS = [-50.8, -47.6, -40.4, -37.2];
function build(ctx, vis) {
  const hi = ctx.lod <= 2;
  if (!vis) {
    box(ctx, X0, DX - DW, 0, TOP, ZB, ZF); box(ctx, DX + DW, X1, 0, TOP, ZB, ZF);
    for (const px of PIERS) box(ctx, px - 0.3, px + 0.3, 0, TOP, ZF, ZF + 0.45);
    box(ctx, X0, X0 + 2.5, 0, TOP, ZF, ZF + 2.4); return;
  }
  // the wall: grimy brown-yellow brick
  paint(ctx, "oklch(0.95 0.03 80)", "fortress", 0.92);
  box(ctx, X0, DX - DW, 0, TOP, ZB, ZF); box(ctx, DX + DW, X1, 0, TOP, ZB, ZF);
  box(ctx, DX - DW, DX + DW, 2.86, TOP, ZB, ZF);
  // buttress piers, slightly darker
  paint(ctx, "oklch(0.82 0.04 70)", "fortress", 0.95);
  for (const px of PIERS) { box(ctx, px - 0.3, px + 0.3, 0, TOP, ZF, ZF + 0.45); if (hi) box(ctx, px - 0.36, px + 0.36, 0, 0.5, ZF, ZF + 0.52); }
  // plinth course: dark brick, and the yellow band at chest height
  paint(ctx, "oklch(0.55 0.04 50)", "brick", 0.95); box(ctx, X0, DX - DW, 0, 0.42, ZF, ZF + 0.08); box(ctx, DX + DW, X1, 0, 0.42, ZF, ZF + 0.08);
  paint(ctx, "oklch(0.97 0.11 92)", "fortress", 0.85); box(ctx, X0, DX - DW, 1.55, 1.85, ZF, ZF + 0.05); box(ctx, DX + DW, X1, 1.55, 1.85, ZF, ZF + 0.05);
  // steel cap lip and a rail of wire stanchions
  paint(ctx, "oklch(0.38 0.02 240)", "steel", 0.5, 0.7);
  box(ctx, X0, X1, 2.5, 2.58, ZF, ZF + 0.32);
  for (let x = X0 + 0.6; x < X1; x += 1.6) rod(ctx, [x, 2.58, ZF + 0.25], [x, 2.92, ZF + 0.42], 0.018, 4);
  paint(ctx, "oklch(0.62 0.01 240)", null, 0.4, 0.9);
  wire(ctx, [X0 + 2.6, 2.75, ZF + 0.42], [X1, 2.75, ZF + 0.42], 0.15, 2.4);
  wire(ctx, [X0 + 0.2, 0.25, ZF + 2.7], [X0 + 2.6, 0.25, ZF + 2.7], 0.2, 2.2); // a coil on the floor along the tower's foot
  // hazard jambs either side of the great door
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
    paint(ctx, i % 2 ? "oklch(0.2 0.01 80)" : "oklch(0.8 0.16 88)", null, 0.6);
    const x = DX + s * (DW + 0.06); box(ctx, x - 0.06, x + 0.06, i * 0.4, i * 0.4 + 0.4, ZF, ZF + 0.1);
  }
  // guard tower stub, west corner: brick block, steel-banded top, a lit gun slit, sandbags at its parapet
  paint(ctx, "oklch(0.88 0.04 75)", "fortress", 0.93);
  box(ctx, X0, X0 + 2.5, 0, TOP, ZF, ZF + 2.4);
  paint(ctx, "oklch(0.36 0.02 240)", "steel", 0.5, 0.7); box(ctx, X0, X0 + 2.58, 2.3, 2.42, ZF, ZF + 2.48);
  paint(ctx, "oklch(0.08 0.01 60)", null, 0.9); box(ctx, X0 + 0.5, X0 + 2.0, 1.75, 1.95, ZF + 2.4, ZF + 2.43); box(ctx, X0 + 2.5, X0 + 2.53, 1.75, 1.95, ZF + 0.6, ZF + 1.9);
  paint(ctx, "oklch(0.9 0.12 80)", null, 0.5, 0, "oklch(1.1 0.12 80)"); box(ctx, X0 + 0.7, X0 + 1.8, 1.8, 1.9, ZF + 2.38, ZF + 2.39);
  ctx.emissive(null);
  if (hi) { paint(ctx, "oklch(0.62 0.05 85)", "canvas", 0.95); for (let i = 0; i < 5; i++) box(ctx, X0 + 0.1 + i * 0.48, X0 + 0.54 + i * 0.48, 0, 0.26, ZF + 2.4, ZF + 2.75); for (let i = 0; i < 4; i++) box(ctx, X0 + 0.34 + i * 0.48, X0 + 0.78 + i * 0.48, 0.26, 0.5, ZF + 2.42, ZF + 2.72); }
  // floodlight brackets and housings on two piers
  for (const px of [PIERS[1], PIERS[2]]) {
    paint(ctx, "oklch(0.3 0.02 240)", "steel", 0.5, 0.8);
    rod(ctx, [px, 2.4, ZF + 0.45], [px, 2.4, ZF + 0.85], 0.03, 6);
    box(ctx, px - 0.28, px + 0.28, 2.18, 2.48, ZF + 0.8, ZF + 1.05);
    paint(ctx, "oklch(0.98 0.04 90)", null, 0.2, 0, "oklch(2.2 0.06 90)"); box(ctx, px - 0.24, px + 0.24, 2.2, 2.46, ZF + 1.05, ZF + 1.06);
    ctx.emissive(null);
  }
}
export function geometry(ctx) { build(ctx, true); }
export function collider(ctx) { build(ctx, false); }
