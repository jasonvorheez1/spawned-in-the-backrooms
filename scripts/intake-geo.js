// the intake room (johnadams2, Nov 8): a 2000s bedroom you make yourself in. Periwinkle paint, berber carpet,
// popcorn ceiling, white trim, a window east, the bedroom door behind you. Spawn 0,0,0 facing -Z.
const PAINT = "cdn/texture-eggshell-painted-drywall-light-orange-peel.png";
const CARPET = "cdn/texture-beige-berber-loop-carpet-slightly-worn.png";
const CEILING = "cdn/texture-white-popcorn-acoustic-ceiling-texture.png";
const X0 = -3, X1 = 3, Z0 = -4, Z1 = 2.5, H = 2.6;
const WZ0 = -2.1, WZ1 = -0.9, WY0 = 0.95, WY1 = 2.05; // the window in the east wall
function face(ctx, a, b, c, d, n) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) ctx.quad(...a, ...b, ...c, ...d); else ctx.quad(...d, ...c, ...b, ...a);
}
function box(ctx, x0, y0, z0, x1, y1, z1) {
  face(ctx, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]);
  face(ctx, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
  face(ctx, [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1]);
  face(ctx, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
  face(ctx, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
  face(ctx, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
}
export function geometry(ctx) {
  const near = (ctx.lod ?? 1) <= 2;
  ctx.albedo(CARPET); ctx.color("oklch(0.9 0.02 80)"); ctx.roughness(0.98);
  face(ctx, [X0, 0, Z0], [X0, 0, Z1], [X1, 0, Z1], [X1, 0, Z0], [0, 1, 0]);
  ctx.albedo(CEILING); ctx.color("oklch(0.96 0.005 90)");
  face(ctx, [X0, H, Z0], [X1, H, Z0], [X1, H, Z1], [X0, H, Z1], [0, -1, 0]);
  ctx.albedo(PAINT); ctx.color("oklch(0.8 0.05 265)"); ctx.roughness(0.85); // periwinkle, a 2003 paint-chip blue
  box(ctx, X0 - 0.2, 0, Z0 - 0.2, X1 + 0.2, H, Z0);
  box(ctx, X0 - 0.2, 0, Z1, X1 + 0.2, H, Z1 + 0.2);
  box(ctx, X0 - 0.2, 0, Z0, X0, H, Z1);
  // east wall with its window hole
  box(ctx, X1, 0, Z0, X1 + 0.2, H, WZ0); box(ctx, X1, 0, WZ1, X1 + 0.2, H, Z1);
  box(ctx, X1, 0, WZ0, X1 + 0.2, WY0, WZ1); box(ctx, X1, WY1, WZ0, X1 + 0.2, H, WZ1);
  ctx.albedo(null);
  // daylight in the glass: a soft overcast afternoon, too bright to see past
  ctx.emissive([1.6, 1.7, 1.85]); ctx.color("#eef3ff");
  face(ctx, [X1 + 0.12, WY0, WZ0], [X1 + 0.12, WY0, WZ1], [X1 + 0.12, WY1, WZ1], [X1 + 0.12, WY1, WZ0], [-1, 0, 0]);
  ctx.emissive(null);
  // trim: window casing, sill, sash bar, baseboards, door casing (all white semi-gloss)
  ctx.color("oklch(0.95 0.01 90)"); ctx.roughness(0.4);
  box(ctx, X1 - 0.03, WY0 - 0.06, WZ0 - 0.07, X1 + 0.01, WY1 + 0.06, WZ0);
  box(ctx, X1 - 0.03, WY0 - 0.06, WZ1, X1 + 0.01, WY1 + 0.06, WZ1 + 0.07);
  box(ctx, X1 - 0.03, WY1, WZ0, X1 + 0.01, WY1 + 0.06, WZ1);
  box(ctx, X1 - 0.09, WY0 - 0.03, WZ0 - 0.1, X1 + 0.01, WY0, WZ1 + 0.1);
  box(ctx, X1 + 0.1, (WY0 + WY1) / 2 - 0.02, WZ0, X1 + 0.13, (WY0 + WY1) / 2 + 0.02, WZ1);
  box(ctx, X0, 0, Z0, X1, 0.11, Z0 + 0.018);
  box(ctx, X0, 0, Z1 - 0.018, -0.55, 0.11, Z1); box(ctx, 0.55, 0, Z1 - 0.018, X1, 0.11, Z1);
  box(ctx, X0, 0, Z0, X0 + 0.018, 0.11, Z1);
  box(ctx, X1 - 0.018, 0, Z0, X1, 0.11, Z1);
  box(ctx, -0.6, 0, Z1 - 0.025, -0.52, 2.12, Z1); box(ctx, 0.52, 0, Z1 - 0.025, 0.6, 2.12, Z1); box(ctx, -0.6, 2.04, Z1 - 0.025, 0.6, 2.12, Z1);
  // crown moulding
  if (near) { box(ctx, X0, H - 0.06, Z0, X1, H, Z0 + 0.04); box(ctx, X0, H - 0.06, Z1 - 0.04, X1, H, Z1); box(ctx, X0, H - 0.06, Z0, X0 + 0.04, H, Z1); box(ctx, X1 - 0.04, H - 0.06, Z0, X1, H, Z1); }
  // the six-panel door, shut, brass knob
  ctx.color("oklch(0.93 0.012 85)"); ctx.roughness(0.45);
  box(ctx, -0.52, 0.01, Z1 - 0.045, 0.52, 2.04, Z1 - 0.005);
  if (near) {
    ctx.color("oklch(0.89 0.012 85)");
    for (const [y0, y1] of [[0.12, 0.8], [0.9, 1.45], [1.55, 1.95]]) for (const [x0, x1] of [[-0.42, -0.06], [0.06, 0.42]]) box(ctx, x0, y0, Z1 - 0.055, x1, y1, Z1 - 0.045);
    ctx.color("oklch(0.78 0.11 85)"); ctx.metalness(0.9); ctx.roughness(0.3);
    box(ctx, 0.36, 0.93, Z1 - 0.1, 0.42, 0.99, Z1 - 0.045);
    ctx.metalness(null);
    // light switch and an outlet
    ctx.color("oklch(0.95 0.015 90)"); ctx.roughness(0.4);
    box(ctx, 0.75, 1.15, Z1 - 0.012, 0.83, 1.27, Z1);
    box(ctx, X0, 0.3, -2.0, X0 + 0.012, 0.42, -1.93);
  }
  ctx.roughness(null);
}
