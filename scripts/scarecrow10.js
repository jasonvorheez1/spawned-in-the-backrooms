// Level 10 "Bumper Crop": Anomalous Scarecrows (Entity 17 / The Watchers).
// Wooden cross stake, stuffed burlap coat, straw stuffing, stitched burlap head, and ragged straw hat.
const WOOD = "cdn/texture-worn-hardwood-grain.png";
const BURLAP = "cdn/texture-burlap-sack-weave.png";
const CANVAS = "cdn/texture-rough-canvas-fabric.png";

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
  ctx.roughness(0.95);

  // 1. Wooden Cross Stake
  ctx.albedo(WOOD);
  ctx.color("oklch(0.42 0.04 60)");
  // Vertical post (from ground y=0 to y=2.1m)
  box(ctx, -0.05, 0, -0.05, 0.05, 2.1, 0.05);
  // Horizontal arm beam at y=1.5m (width 1.4m)
  box(ctx, -0.7, 1.45, -0.04, 0.7, 1.55, 0.04);

  // 2. Draped Ragged Coat / Torso
  ctx.albedo(CANVAS);
  ctx.color("oklch(0.38 0.06 40)"); // Weathered brown/plaid coat
  // Main body torso (stuffed with straw)
  box(ctx, -0.26, 0.85, -0.16, 0.26, 1.55, 0.16);
  // Left arm over horizontal stake
  box(ctx, -0.65, 1.38, -0.11, -0.26, 1.58, 0.11);
  // Right arm over horizontal stake
  box(ctx, 0.26, 1.38, -0.11, 0.65, 1.58, 0.11);

  // 3. Straw Tufts poking out of sleeves and bottom
  ctx.albedo(null);
  ctx.color("oklch(0.82 0.12 85)"); // Bright golden straw
  // Bottom tufts
  box(ctx, -0.2, 0.75, -0.1, 0.2, 0.85, 0.1);
  // Left cuff tufts
  box(ctx, -0.75, 1.42, -0.07, -0.65, 1.54, 0.07);
  // Right cuff tufts
  box(ctx, 0.65, 1.42, -0.07, 0.75, 1.54, 0.07);

  // 4. Burlap Sack Head
  ctx.albedo(BURLAP);
  ctx.color("oklch(0.75 0.05 75)");
  box(ctx, -0.16, 1.58, -0.16, 0.16, 1.94, 0.16);

  // Stitched eyes and jagged mouth (dark stitches)
  ctx.albedo(null);
  ctx.color("oklch(0.2 0.01 250)");
  // Eyes
  box(ctx, -0.09, 1.76, -0.165, -0.04, 1.82, -0.16);
  box(ctx, 0.04, 1.76, -0.165, 0.09, 1.82, -0.16);
  // Stitched mouth
  box(ctx, -0.1, 1.64, -0.165, 0.1, 1.67, -0.16);
  for (let sx = -0.08; sx <= 0.08; sx += 0.04) {
    box(ctx, sx - 0.005, 1.62, -0.166, sx + 0.005, 1.69, -0.16);
  }

  // 5. Ragged Straw Hat
  ctx.albedo(CANVAS);
  ctx.color("oklch(0.7 0.08 80)");
  // Wide brim
  box(ctx, -0.32, 1.93, -0.32, 0.32, 1.97, 0.32);
  // Crown
  box(ctx, -0.18, 1.97, -0.18, 0.18, 2.12, 0.18);
  // Hat band (dark ribbon)
  ctx.color("oklch(0.3 0.02 30)");
  box(ctx, -0.185, 1.97, -0.185, 0.185, 2.01, 0.185);
}

export function collider(ctx) {
  return [
    { kind: "box", width: 1.5, height: 2.2, depth: 0.4, center: [0, 1.1, 0] },
  ];
}
