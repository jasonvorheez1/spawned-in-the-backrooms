// Level 4's open-plan furniture (params.kind): "island" = four desks back to back behind fabric partitions, each with a beige CRT,
// keyboard, papers and a mug, a wall clock stopped on the spine; "printer" = a tired office printer on its stand.
// Feet at the floor centre; the island runs along x. The ringing phones are their own objects (scripts/l4-office.js).
import { slab } from "./lib/shapes.js";

const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const FAB = "cdn/texture-worn-canvas-fabric.png";

function desk(ctx, cx, cz, face, hi, seed) { // face: +1 = the desk's user sits on +z
  ctx.albedo(null); ctx.color("oklch(0.62 0.04 70)"); ctx.roughness(0.6); box(ctx, cx - 0.78, cx + 0.78, 0.71, 0.75, cz - 0.38, cz + 0.38); // top
  ctx.color("oklch(0.35 0.01 250)"); ctx.metalness(0.4);
  for (const sx of [-0.72, 0.72]) box(ctx, cx + sx - 0.02, cx + sx + 0.02, 0, 0.71, cz - 0.34, cz + 0.34);
  box(ctx, cx + 0.3, cx + 0.72, 0.1, 0.68, cz - 0.34, cz + 0.32); ctx.metalness(0);                                     // drawer pedestal
  ctx.color("oklch(0.55 0.005 250)"); for (const y of [0.25, 0.45, 0.62]) box(ctx, cx + 0.42, cx + 0.6, y, y + 0.02, cz + face * 0.33, cz + face * 0.345);
  // CRT monitor, pushed to the back of the desk
  const mz = cz - face * 0.12;
  ctx.color("oklch(0.82 0.03 85)"); ctx.roughness(0.5); box(ctx, cx - 0.22, cx + 0.22, 0.76, 1.12, mz - 0.17, mz + 0.17); box(ctx, cx - 0.15, cx + 0.15, 0.75, 0.79, mz - 0.12, mz + 0.12);
  ctx.color("oklch(0.18 0.03 160)"); ctx.emissive("oklch(0.35 0.08 155)"); box(ctx, cx - 0.17, cx + 0.17, 0.82, 1.08, mz + face * 0.17, mz + face * 0.175); ctx.emissive(null);
  if (hi) { ctx.color("oklch(0.75 0.15 150)"); ctx.emissive("oklch(0.7 0.16 150)"); for (let i = 0; i < 4; i++) box(ctx, cx - 0.14, cx - 0.14 + 0.08 + ((seed * 7 + i * 3) % 5) * 0.035, 1.03 - i * 0.04, 1.045 - i * 0.04, mz + face * 0.176, mz + face * 0.178); ctx.emissive(null); }
  // keyboard, papers, a mug
  ctx.color("oklch(0.78 0.02 85)"); box(ctx, cx - 0.2, cx + 0.2, 0.75, 0.775, cz + face * 0.14, cz + face * 0.28);
  ctx.color("oklch(0.95 0.01 90)"); box(ctx, cx - 0.62, cx - 0.36, 0.75, 0.758, cz + face * 0.02, cz + face * 0.3); box(ctx, cx - 0.6, cx - 0.4, 0.758, 0.762, cz + face * 0.06, cz + face * 0.26);
  ctx.color(["oklch(0.6 0.15 25)", "oklch(0.6 0.1 250)", "oklch(0.85 0.05 90)"][seed % 3]); box(ctx, cx + 0.5, cx + 0.58, 0.75, 0.85, cz + face * 0.18, cz + face * 0.26);
}

export function geometry(ctx) {
  const kind = ctx.params?.kind ?? "island", hi = ctx.lod <= 2;
  ctx.smooth(); ctx.metalness(0);
  if (kind === "printer") {
    ctx.color("oklch(0.4 0.01 250)"); ctx.metalness(0.4); box(ctx, -0.35, 0.35, 0, 0.62, -0.28, 0.28); ctx.metalness(0);
    ctx.color("oklch(0.85 0.01 90)"); box(ctx, -0.32, 0.32, 0.62, 0.95, -0.26, 0.26);
    ctx.color("oklch(0.3 0.01 250)"); box(ctx, -0.26, 0.26, 0.95, 0.98, -0.2, 0.1);
    ctx.color("oklch(0.95 0.01 90)"); box(ctx, -0.18, 0.18, 0.8, 0.805, 0.26, 0.45); // a page half out
    ctx.color("oklch(0.65 0.18 145)"); ctx.emissive("oklch(0.6 0.2 145)"); box(ctx, 0.2, 0.24, 0.9, 0.92, 0.26, 0.265); ctx.emissive(null);
    ctx.color(null); return;
  }
  // the spine and the side partitions, faded blue-grey fabric on steel feet
  ctx.albedo(FAB); ctx.color("oklch(0.58 0.03 240)"); ctx.roughness(0.95);
  box(ctx, -1.65, 1.65, 0, 1.25, -0.03, 0.03);
  for (const x of [-1.65, 0, 1.65]) box(ctx, x - 0.03, x + 0.03, 0, 1.15, -0.85, 0.85);
  ctx.albedo(null); ctx.color("oklch(0.4 0.01 250)"); ctx.metalness(0.5);
  box(ctx, -1.68, 1.68, 1.25, 1.28, -0.05, 0.05); for (const x of [-1.65, 0, 1.65]) box(ctx, x - 0.05, x + 0.05, 1.15, 1.18, -0.87, 0.87);
  ctx.metalness(0);
  let seed = 0;
  for (const face of [-1, 1]) for (const cx of [-0.82, 0.82]) desk(ctx, cx, face * 0.45, face, hi, seed++);
  // a wall clock on the spine, stopped at twenty to four
  ctx.color("oklch(0.95 0.01 90)"); box(ctx, -0.13, 0.13, 1.33, 1.59, 0.03, 0.06); ctx.color("oklch(0.2 0.01 250)");
  box(ctx, -0.005, 0.005, 1.46, 1.56, 0.06, 0.065); box(ctx, -0.07, 0, 1.43, 1.465, 0.06, 0.065);
  // pinned notes on the partitions
  for (const [x, z, c] of [[-1.2, 0.04, "oklch(0.9 0.12 95)"], [0.5, -0.04, "oklch(0.85 0.1 200)"], [1.1, 0.04, "oklch(0.9 0.1 20)"]]) { ctx.color(c); box(ctx, x - 0.07, x + 0.07, 0.95, 1.09, z - 0.003, z + 0.003); }
  ctx.color(null); ctx.roughness(null);
}
