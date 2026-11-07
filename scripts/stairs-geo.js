// Stairs that go nowhere: a carpeted flight that climbs straight into the drop ceiling.
// Climbs toward -Z from its feet; 1.2 m wide, 0.2 rise, 0.3 tread, wallpapered stringers.
const W = 0.6, RISE = 0.2, TREAD = 0.3, STEPS = 13;
function slab(ctx, x0, y0, z0, x1, y1, z1) {
  ctx.quad(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0); // top
  ctx.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1); // front (+z)
  ctx.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0); // back
  ctx.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0); // -x
  ctx.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1); // +x
}
export function geometry(ctx) {
  ctx.albedo("cdn/texture-damp-beige-berber-office-carpet.png");
  ctx.color("oklch(0.95 0.02 80)");
  for (let i = 0; i < STEPS; i++) {
    const z1 = 1.95 - i * TREAD, z0 = z1 - TREAD;
    slab(ctx, -W, 0, z0, W, (i + 1) * RISE, z1);
    if (ctx.lod <= 2) { ctx.color("oklch(0.9 0.03 75)"); slab(ctx, -W, (i + 1) * RISE - 0.02, z1 - 0.03, W, (i + 1) * RISE + 0.01, z1 + 0.01); ctx.color("oklch(0.95 0.02 80)"); } // worn nosing
  }
  ctx.albedo("/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png");
  ctx.color("oklch(0.98 0.01 90)");
  const top = STEPS * RISE + 0.4, back = 1.95 - STEPS * TREAD;
  for (const s of [-1, 1]) slab(ctx, s * W + (s < 0 ? -0.08 : 0), 0, back, s * W + (s < 0 ? 0 : 0.08), top, 1.95); // stringers
  ctx.albedo(null);
}
