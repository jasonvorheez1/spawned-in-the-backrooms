// Level 10 "Bumper Crop": Historic farm storm cellar / root cellar entrance.
// Slanted double timber storm doors built into stone retaining walls with cast iron hardware.
const BRICK = "cdn/texture-weathered-red-brick-barn-wall-english-bond-moss-stains.png";
const WOOD = "cdn/texture-weathered-grey-barn-wood-vertical-planks.png";
const HARDWOOD = "cdn/texture-worn-hardwood-grain.png";

function box(ctx, x0, y0, z0, x1, y1, z1) {
  const q = (a, b, c, d) => ctx.quad(a, b, c, d);
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
  q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}

export function geometry(ctx) {
  try { const __q = ctx.quad.bind(ctx), __t = ctx.tri.bind(ctx); ctx.quad = (...a) => __q(...a.flat()); ctx.tri = (...a) => __t(...a.flat()); } catch (e) {} // __flat: corners as [x,y,z] arrays
  const W = 2.4, D = 2.8, H_BACK = 1.6, H_FRONT = 0.25;
  const t = 0.25;

  ctx.roughness(0.9);

  // 1. Stone/Brick Retaining Side Walls (angled from H_BACK to H_FRONT)
  ctx.albedo(BRICK);
  ctx.color("oklch(0.65 0.05 45)");
  // Back wall
  box(ctx, -W / 2, 0, D / 2 - t, W / 2, H_BACK, D / 2);

  // Left and Right angled side retaining walls
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -W / 2 : W / 2 - t;
    const x1 = s < 0 ? -W / 2 + t : W / 2;
    // Lower rectangular base
    box(ctx, x0, 0, -D / 2, x1, H_FRONT, D / 2 - t);
    // Upper triangular slope
    ctx.tri([x0, H_FRONT, -D / 2], [x0, H_BACK, D / 2 - t], [x1, H_FRONT, -D / 2]);
    ctx.tri([x1, H_FRONT, -D / 2], [x0, H_BACK, D / 2 - t], [x1, H_BACK, D / 2 - t]);
  }

  // 2. Concrete Front Threshold Sill
  box(ctx, -W / 2 + t, 0, -D / 2 - 0.15, W / 2 - t, H_FRONT, -D / 2);

  // 3. Slanted Timber Double Storm Doors
  ctx.albedo(WOOD);
  ctx.color("oklch(0.55 0.04 60)");
  const dw = (W - 2 * t) / 2;
  const z0 = -D / 2, z1 = D / 2 - t;
  const y0 = H_FRONT + 0.04, y1 = H_BACK - 0.02;

  // Left door flap
  ctx.quad([-dw, y0, z0], [0, y0, z0], [0, y1, z1], [-dw, y1, z1]);
  ctx.quad([-dw, y1, z1], [0, y1, z1], [0, y0, z0], [-dw, y0, z0]);

  // Right door flap
  ctx.quad([0, y0, z0], [dw, y0, z0], [dw, y1, z1], [0, y1, z1]);
  ctx.quad([0, y1, z1], [dw, y1, z1], [dw, y0, z0], [0, y0, z0]);

  // Central dividing batten
  ctx.color("oklch(0.45 0.04 50)");
  ctx.quad([-0.04, y0 + 0.01, z0], [0.04, y0 + 0.01, z0], [0.04, y1 + 0.01, z1], [-0.04, y1 + 0.01, z1]);

  // 4. Cast Iron Hardware: Strap Hinges & Pull Rings
  ctx.albedo(null);
  ctx.color("oklch(0.25 0.01 250)"); // Black wrought iron
  for (const s of [-1, 1]) {
    const cx = s * (dw / 2);
    // Lower hinge
    ctx.quad([cx - 0.25, y0 + 0.2, z0 + 0.4], [cx + 0.25, y0 + 0.2, z0 + 0.4], [cx + 0.25, y0 + 0.28, z0 + 0.4], [cx - 0.25, y0 + 0.28, z0 + 0.4]);
    // Upper hinge
    ctx.quad([cx - 0.25, y1 - 0.35, z1 - 0.5], [cx + 0.25, y1 - 0.35, z1 - 0.5], [cx + 0.25, y1 - 0.27, z1 - 0.5], [cx - 0.25, y1 - 0.27, z1 - 0.5]);
    // Pull ring handle
    const rx = s * 0.18, ry = (y0 + y1) / 2, rz = (z0 + z1) / 2;
    box(ctx, rx - 0.05, ry, rz - 0.05, rx + 0.05, ry + 0.1, rz + 0.05);
  }
}

export function collider(ctx) {
  return [
    { kind: "box", width: 2.4, height: 1.6, depth: 2.8, center: [0, 0.8, 0] },
  ];
}
