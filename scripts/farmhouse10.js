// Level 10 "Bumper Crop": M.E.G. Outpost Bountiful Farmhouse.
// Two-story rural farmstead with wrap-around front porch, pitched gabled roof, brick chimney, and framed windows.
const SIDING = "cdn/texture-weathered-grey-barn-wood-vertical-planks.png";
const ROOF = "cdn/texture-grey-corrugated-asbestos-cement-roof-sheets-lichen.png";
const DECK = "cdn/texture-worn-hardwood-grain.png";
const BRICK = "cdn/texture-weathered-red-brick-barn-wall-english-bond-moss-stains.png";
const DOOR = "cdn/texture-dark-grey-painted-steel-barn-door-weathered.png";

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
  const W = 13.0, D = 8.5, H = 4.8, R = 7.6, t = 0.3;
  const PW = 13.0, PD = 2.8, PH = 0.45; // Porch dimensions

  // --- Brick Plinth Foundation ---
  ctx.roughness(0.9);
  ctx.albedo(BRICK);
  ctx.color("oklch(0.7 0.05 45)");
  box(ctx, -W / 2 - 0.05, 0, -D / 2 - 0.05, W / 2 + 0.05, 0.45, D / 2 + 0.05);

  // --- Main House Walls (Wood Siding) ---
  ctx.albedo(SIDING);
  ctx.color("oklch(0.85 0.02 85)"); // Weathered farmhouse off-white

  // Back wall (+Z)
  box(ctx, -W / 2, 0.45, D / 2 - t, W / 2, H, D / 2);
  // Left wall (-X)
  box(ctx, -W / 2, 0.45, -D / 2, -W / 2 + t, H, D / 2);
  // Right wall (+X)
  box(ctx, W / 2 - t, 0.45, -D / 2, W / 2, H, D / 2);

  // Front wall (-Z) with open doorway in middle (dw = 2.4, dh = 2.6)
  const dw = 2.4, dh = 2.6;
  box(ctx, -W / 2, 0.45, -D / 2, -dw / 2, H, -D / 2 + t);
  box(ctx, dw / 2, 0.45, -D / 2, W / 2, H, -D / 2 + t);
  box(ctx, -dw / 2, dh, -D / 2, dw / 2, H, -D / 2 + t);

  // Interior floor slab
  ctx.albedo(DECK);
  ctx.color("oklch(0.7 0.04 60)");
  box(ctx, -W / 2 + t, 0.45, -D / 2 + t, W / 2 - t, 0.5, D / 2 - t);

  // Gables on East and West walls
  ctx.albedo(SIDING);
  ctx.color("oklch(0.82 0.02 85)");
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - t / 2);
    ctx.tri([x, H, D / 2], [x, H, -D / 2], [x, R, 0]);
    ctx.tri([x, H, -D / 2], [x, H, D / 2], [x, R, 0]);
  }

  // --- Gabled Roof with Overhangs ---
  ctx.albedo(ROOF);
  ctx.color("oklch(0.68 0.02 240)");
  const o = 0.5, ox = W / 2 + o, oz = D / 2 + o;
  const hy = H - o * (R - H) / (D / 2);
  // South slope
  ctx.quad([-ox, hy, -oz], [ox, hy, -oz], [ox, R + 0.1, 0], [-ox, R + 0.1, 0]);
  ctx.quad([-ox, R + 0.1, 0], [ox, R + 0.1, 0], [ox, hy, -oz], [-ox, hy, -oz]);
  // North slope
  ctx.quad([ox, hy, oz], [-ox, hy, oz], [-ox, R + 0.1, 0], [ox, R + 0.1, 0]);
  ctx.quad([ox, R + 0.1, 0], [-ox, R + 0.1, 0], [-ox, hy, oz], [ox, hy, oz]);

  // --- Brick Chimney on East Wall ---
  ctx.albedo(BRICK);
  ctx.color("oklch(0.65 0.06 40)");
  box(ctx, W / 2 - 0.2, 0, -0.6, W / 2 + 0.9, R + 1.2, 0.6);

  // --- Wrap-Around Front Porch ---
  ctx.albedo(DECK);
  ctx.color("oklch(0.6 0.04 60)");
  const pz0 = -D / 2 - PD, pz1 = -D / 2;
  // Porch deck floor
  box(ctx, -PW / 2, 0, pz0, PW / 2, PH, pz1);

  // Porch roof awning
  ctx.albedo(ROOF);
  ctx.color("oklch(0.7 0.02 240)");
  const porhH = 3.2, porhH0 = 3.6;
  ctx.quad([-PW / 2 - 0.2, porhH, pz0 - 0.2], [PW / 2 + 0.2, porhH, pz0 - 0.2], [PW / 2 + 0.2, porhH0, pz1], [-PW / 2 - 0.2, porhH0, pz1]);
  ctx.quad([-PW / 2 - 0.2, porhH0, pz1], [PW / 2 + 0.2, porhH0, pz1], [PW / 2 + 0.2, porhH, pz0 - 0.2], [-PW / 2 - 0.2, porhH, pz0 - 0.2]);

  // Porch support timber posts
  ctx.albedo(SIDING);
  ctx.color("oklch(0.85 0.02 85)");
  const postX = [-PW / 2 + 0.3, -PW / 2 + 4.1, PW / 2 - 4.1, PW / 2 - 0.3];
  for (const px of postX) {
    box(ctx, px - 0.08, PH, pz0 + 0.15, px + 0.08, porhH, pz0 + 0.31);
  }

  // Porch handrail
  ctx.color("oklch(0.8 0.02 85)");
  box(ctx, -PW / 2 + 0.3, PH + 0.85, pz0 + 0.2, -dw / 2, PH + 0.93, pz0 + 0.26);
  box(ctx, dw / 2, PH + 0.85, pz0 + 0.2, PW / 2 - 0.3, PH + 0.93, pz0 + 0.26);

  // Front porch entrance steps (middle, dw width)
  ctx.albedo(DECK);
  ctx.color("oklch(0.55 0.04 60)");
  box(ctx, -dw / 2 - 0.2, 0, pz0 - 0.8, dw / 2 + 0.2, PH * 0.5, pz0);
}

export function collider(ctx) {
  const W = 13.0, D = 8.5, H = 4.8, t = 0.3, dw = 2.4, PD = 2.8, PH = 0.45;
  return [
    // Perimeter house walls
    { kind: "box", width: W, height: H, depth: t, center: [0, H / 2, D / 2 - t / 2] },
    { kind: "box", width: t, height: H, depth: D, center: [-W / 2 + t / 2, H / 2, 0] },
    { kind: "box", width: t, height: H, depth: D, center: [W / 2 - t / 2, H / 2, 0] },
    { kind: "box", width: (W - dw) / 2, height: H, depth: t, center: [-(W + dw) / 4, H / 2, -D / 2 + t / 2] },
    { kind: "box", width: (W - dw) / 2, height: H, depth: t, center: [(W + dw) / 4, H / 2, -D / 2 + t / 2] },
    // Porch floor
    { kind: "box", width: W, height: PH, depth: PD, center: [0, PH / 2, -D / 2 - PD / 2] },
    // Steps
    { kind: "box", width: dw + 0.4, height: PH * 0.5, depth: 0.8, center: [0, PH * 0.25, -D / 2 - PD - 0.4] },
    // Chimney
    { kind: "box", width: 1.1, height: 8.5, depth: 1.2, center: [W / 2 + 0.35, 4.25, 0] },
  ];
}
