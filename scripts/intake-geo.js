// the intake room: one closed-off Level 0 room where a new wanderer is put together before the halls.
// carpet, chevron wallpaper, drop ceiling, two buzzing panels, a shut door behind you, water stains. Spawn at 0,0,0 facing -Z.
const WALLPAPER = "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png";
const CARPET = "cdn/texture-damp-beige-berber-office-carpet.png";
const CEILING = "cdn/texture-white-acoustic-drop-ceiling-tile-grid.png";
const X0 = -3.5, X1 = 3.5, Z0 = -5, Z1 = 2.5, H = 3;
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
  // carpet, a darker damp patch by the back corner
  ctx.albedo(CARPET); ctx.color("oklch(0.98 0.01 90)");
  face(ctx, [X0, 0, Z0], [X0, 0, Z1], [X1, 0, Z1], [X1, 0, Z0], [0, 1, 0]);
  ctx.color("oklch(0.72 0.04 75)");
  face(ctx, [-3.4, 0.004, -4.9], [-3.4, 0.004, -3.1], [-1.9, 0.004, -3.1], [-1.9, 0.004, -4.9], [0, 1, 0]);
  // ceiling
  ctx.albedo(CEILING); ctx.color("oklch(0.97 0.015 95)");
  face(ctx, [X0, H, Z0], [X1, H, Z0], [X1, H, Z1], [X0, H, Z1], [0, -1, 0]);
  // walls, inward faces, with thickness so the collider holds
  ctx.albedo(WALLPAPER); ctx.color("oklch(0.98 0.01 90)");
  box(ctx, X0 - 0.2, 0, Z0 - 0.2, X1 + 0.2, H, Z0);      // front
  box(ctx, X0 - 0.2, 0, Z1, X1 + 0.2, H, Z1 + 0.2);      // back
  box(ctx, X0 - 0.2, 0, Z0, X0, H, Z1);                  // left
  box(ctx, X1, 0, Z0, X1 + 0.2, H, Z1);                  // right
  // water stains bleeding down from the ceiling
  ctx.albedo(null); ctx.roughness(0.95);
  ctx.color("oklch(0.55 0.07 70 / 0.5)");
  face(ctx, [-2.6, 1.2, Z0 + 0.006], [-1.5, 1.2, Z0 + 0.006], [-1.3, H, Z0 + 0.006], [-2.9, H, Z0 + 0.006], [0, 0, 1]);
  face(ctx, [X1 - 0.006, 1.7, -1.2], [X1 - 0.006, 1.7, 0.2], [X1 - 0.006, H, 0.5], [X1 - 0.006, H, -1.5], [-1, 0, 0]);
  // baseboards
  ctx.color("oklch(0.72 0.05 85)"); ctx.roughness(0.6);
  box(ctx, X0, 0, Z0, X1, 0.1, Z0 + 0.03); box(ctx, X0, 0, Z1 - 0.03, -0.6, 0.1, Z1); box(ctx, 0.6, 0, Z1 - 0.03, X1, 0.1, Z1);
  box(ctx, X0, 0, Z0, X0 + 0.03, 0.1, Z1); box(ctx, X1 - 0.03, 0, Z0, X1, 0.1, Z1);
  // the shut door behind you: frame, slab, lever
  ctx.color("oklch(0.62 0.05 75)"); ctx.roughness(0.55);
  box(ctx, -0.6, 0, Z1 - 0.06, -0.52, 2.15, Z1); box(ctx, 0.52, 0, Z1 - 0.06, 0.6, 2.15, Z1); box(ctx, -0.6, 2.07, Z1 - 0.06, 0.6, 2.15, Z1);
  ctx.color("oklch(0.55 0.06 60)"); ctx.roughness(0.7);
  box(ctx, -0.52, 0.01, Z1 - 0.04, 0.52, 2.07, Z1 - 0.01);
  ctx.color("oklch(0.75 0.01 90)"); ctx.metalness(0.8); ctx.roughness(0.35);
  box(ctx, 0.3, 0.98, Z1 - 0.09, 0.44, 1.02, Z1 - 0.04);
  ctx.metalness(null);
  // a dead outlet on the left wall
  ctx.color("oklch(0.9 0.02 90)"); ctx.roughness(0.5);
  box(ctx, X0, 0.3, -2.06, X0 + 0.015, 0.42, -1.98);
  // light panels: frame, then the lit diffuser
  for (const [mx, mz] of [[0, -1.6], [0, 1.0]]) {
    ctx.color("oklch(0.85 0.01 90)");
    box(ctx, mx - 0.65, H - 0.04, mz - 0.35, mx + 0.65, H, mz + 0.35);
    ctx.emissive([2.4, 2.25, 1.8]); ctx.color("#fffaf0");
    face(ctx, [mx - 0.6, H - 0.045, mz - 0.3], [mx + 0.6, H - 0.045, mz - 0.3], [mx + 0.6, H - 0.045, mz + 0.3], [mx - 0.6, H - 0.045, mz + 0.3], [0, -1, 0]);
    ctx.emissive(null);
  }
  // one ceiling tile missing over the far corner
  ctx.color("oklch(0.12 0.01 80)");
  face(ctx, [2.2, H - 0.01, -4.6], [2.8, H - 0.01, -4.6], [2.8, H - 0.01, -4.0], [2.2, H - 0.01, -4.0], [0, -1, 0]);
  ctx.roughness(null);
}
