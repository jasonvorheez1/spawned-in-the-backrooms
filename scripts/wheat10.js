// One tuft of ripe wheat for Level 10's fields: params { h, n, head } = height, stalks, ear length. Feet at y 0.
export function geometry(ctx) {
  const h = ctx.params.h ?? 0.95, n = ctx.params.n ?? 7, head = ctx.params.head ?? 0.13, R = () => ctx.random();
  for (let i = 0; i < n; i++) {
    const a = R() * 6.283, r = R() * 0.12, x = Math.cos(a) * r, z = Math.sin(a) * r, hh = h * (0.8 + R() * 0.3);
    const lx = (R() - 0.5) * 0.14, lz = (R() - 0.5) * 0.14, w = 0.008, yaw = R() * 3.14, cx = Math.cos(yaw) * w, cz = Math.sin(yaw) * w;
    ctx.color(`oklch(${0.66 + R() * 0.08} 0.09 ${82 + R() * 8})`);
    ctx.quad(x - cx, 0, z - cz, x + cx, 0, z + cz, x + lx + cx, hh, z + lz + cz, x + lx - cx, hh, z + lz - cz);
    ctx.quad(x + cx, 0, z + cz, x - cx, 0, z - cz, x + lx - cx, hh, z + lz - cz, x + lx + cx, hh, z + lz + cz);
    // the ear: two crossed cards, nodding a little
    const tx = x + lx, tz = z + lz, ew = 0.028, dx = lx * 0.6, dz = lz * 0.6;
    ctx.color(`oklch(${0.74 + R() * 0.06} 0.11 ${78 + R() * 6})`);
    for (const [ux, uz] of [[ew, 0], [0, ew]]) {
      ctx.quad(tx - ux, hh, tz - uz, tx + ux, hh, tz + uz, tx + dx + ux * 0.4, hh + head, tz + dz + uz * 0.4, tx + dx - ux * 0.4, hh + head, tz + dz - uz * 0.4);
      ctx.quad(tx + ux, hh, tz + uz, tx - ux, hh, tz - uz, tx + dx - ux * 0.4, hh + head, tz + dz - uz * 0.4, tx + dx + ux * 0.4, hh + head, tz + dz + uz * 0.4);
    }
  }
}
