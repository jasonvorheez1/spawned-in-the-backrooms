// Level 2's finer detail, one static mesh, built from the reference photographs of old steam and utility tunnels:
// fat cream-lagged pipes with dark bandage wraps, bundles of grey conduit on clamps, scaffold-red handrails along
// the pipe runs, ribbed lagged ducts and sagging cables hanging from the ceiling, caged wall lamps, steel tread
// plates and wet stains on the floor, peeling paint, hazard signs and padlocked hasps. Placed from the seeded layout.
import { N, S, H, HALF, isOpen, openings, zoneOf, cellCenter, hash, inHall, inPipes, sideOf } from "./lib/level2.js";
import { slab, tube, prism } from "./lib/shapes.js";

const T = 0.4;
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const ok = (cx, cz) => { const z = zoneOf(cx, cz); return z === "tunnel" || z === "dark"; };

export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  ctx.smooth(); ctx.metalness(0);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (!ok(cx, cz) || inHall(cx, cz) || inPipes(cx, cz) || sideOf(cx, cz)) continue;
    const c = cellCenter(cx, cz), zone = zoneOf(cx, cz), dead = zone === "dark";
    const open = openings(cx, cz);
    for (const d of [0, 1, 2, 3]) {
      if (isOpen(cx, cz, d)) continue;
      const [nx, nz] = D4[d], tx = -nz, tz = nx, w = S / 2 - T, wx = c.x + nx * w, wz = c.z + nz * w;
      // a box in (along the wall, out from the wall, height) space
      const wb = (a0, a1, o0, o1, y0, y1) => { const p = [wx + tx * a0 - nx * o0, wz + tz * a0 - nz * o0], q = [wx + tx * a1 - nx * o1, wz + tz * a1 - nz * o1]; box(ctx, Math.min(p[0], q[0]), Math.max(p[0], q[0]), y0, y1, Math.min(p[1], q[1]), Math.max(p[1], q[1])); };
      const P = (a, o, y) => [wx + tx * a - nx * o, y, wz + tz * a - nz * o];
      const half = S / 2 - T - 0.2, r = hash(cx * 4 + d, cz, 301);
      // a fat lagged pipe: cream wrap, dark bandage rings every metre, a brass-coloured collar at the wall
      if (r < 0.5) {
        const y = 1.7 + hash(cx, cz, 303) * 0.5, off = 0.5;
        ctx.roughness(0.95); ctx.color("oklch(0.84 0.03 85)");
        tube(ctx, [P(-half, off, y), P(half, off, y)], [0.2, 0.2], hi ? 12 : 7, [1, 1], 0.03, cx + cz, 1);
        ctx.color("oklch(0.45 0.04 55)");
        for (let a = -half + 0.4; a < half; a += 1.1) tube(ctx, [P(a, off, y), P(a + 0.1, off, y)], [0.215, 0.215], hi ? 12 : 7, [1, 1], 0, 1, 1);
        ctx.color("oklch(0.35 0.02 250)"); ctx.metalness(0.6);
        for (let a = -half + 1; a < half; a += 2.3) wb(a - 0.04, a + 0.04, 0, off, y - 0.04, y + 0.04);
        ctx.metalness(0);
        if (hash(cx, cz, 305) < 0.18) { ctx.color("oklch(0.55 0.2 27)"); wb(0.5, 0.58, off - 0.01, off + 0.21, y - 0.12, y + 0.12); ctx.color("oklch(0.96 0.01 90)"); wb(0.5, 0.58, off + 0.21, off + 0.22, y - 0.08, y + 0.08); } // a DANGER tag
      }
      // scaffold-red handrail posts and rail beside the pipe run
      if (hi && hash(cx * 4 + d, cz, 307) < 0.3) {
        ctx.color("oklch(0.35 0.08 25)"); ctx.metalness(0.5); ctx.roughness(0.6);
        for (let a = -half; a <= half + 0.01; a += 1.25) wb(a - 0.025, a + 0.025, 0.95, 1.0, 0, 1.05);
        wb(-half, half, 0.95, 1.0, 0.95, 1.0); wb(-half, half, 0.95, 1.0, 0.5, 0.54);
        ctx.metalness(0);
      }
      // a bundle of grey conduit on clamps along the upper wall
      if (hash(cx * 4 + d, cz, 309) < 0.55) {
        ctx.color("oklch(0.62 0.01 250)"); ctx.metalness(0.7); ctx.roughness(0.45);
        for (let k = 0; k < 4; k++) wb(-half, half, 0.07 + k * 0.07, 0.07 + k * 0.07 + 0.04, 2.45 + (k % 2) * 0.07, 2.49 + (k % 2) * 0.07);
        ctx.color("oklch(0.35 0.01 250)"); for (let a = -half + 0.5; a < half; a += 1.4) wb(a - 0.03, a + 0.03, 0.04, 0.34, 2.4, 2.58);
        ctx.metalness(0);
      }
      // peeling paint: pale and dark patches on the wall face
      ctx.roughness(0.95);
      for (let i = 0; i < 3; i++) {
        if (hash(cx * 4 + d, cz, 311 + i) > 0.55) continue;
        const a = (hash(cx * 4 + d, cz, 321 + i) - 0.5) * 3.4, hh = 0.4 + hash(cx, cz, 331 + i) * 0.9, y = 0.4 + hash(cz, cx * 4 + d, 341 + i) * 1.5, ww = 0.3 + hash(cx, cz, 351 + i) * 0.7;
        ctx.color(i % 2 ? "oklch(0.88 0.015 90)" : "oklch(0.36 0.03 55)"); wb(a - ww / 2, a + ww / 2, -0.005, 0.012, y, y + hh);
      }
      // a caged wall lamp: wire cage over a tube, warm or cold
      if (hash(cx * 4 + d, cz, 361) < (dead ? 0.03 : 0.1)) {
        const warm = hash(cx, cz, 363) < 0.6, col = warm ? "oklch(0.88 0.13 75)" : "oklch(0.95 0.03 230)";
        ctx.color(col); ctx.emissive(col); wb(-0.45, 0.45, 0.04, 0.12, 2.0, 2.16); ctx.emissive(null);
        ctx.color("oklch(0.4 0.01 250)"); ctx.metalness(0.6);
        for (let a = -0.45; a <= 0.451; a += 0.15) wb(a - 0.008, a + 0.008, 0.1, 0.2, 1.97, 2.19);
        wb(-0.47, 0.47, 0.18, 0.2, 1.97, 1.99); wb(-0.47, 0.47, 0.18, 0.2, 2.17, 2.19);
        ctx.metalness(0);
      }
    }
    // ceiling: a lagged duct hanging along the way through, ribbed; cables sagging; a conduit box
    if (hi && open.length >= 1) {
      const along = open.some((d) => d === 0 || d === 2) ? 0 : 1, ex = along === 0 ? 1 : 0, ez = 1 - ex;
      if (hash(cx, cz, 371) < 0.4) {
        ctx.color("oklch(0.3 0.015 80)"); ctx.roughness(0.95);
        box(ctx, c.x - ex * S / 2 - ez * 0.55, c.x + ex * S / 2 + ez * 0.55, H - 0.95, H - 0.4, c.z - ez * S / 2 - ex * 0.55, c.z + ez * S / 2 + ex * 0.55);
        ctx.color("oklch(0.2 0.01 80)");
        for (let a = -S / 2 + 0.2; a < S / 2; a += 0.38) box(ctx, c.x + ex * a - ez * 0.58, c.x + ex * a + 0.05 * ex + ez * 0.58, H - 0.98, H - 0.37, c.z + ez * a - ex * 0.58, c.z + ez * a + 0.05 * ez + ex * 0.58);
      }
      if (hash(cx, cz, 373) < 0.35) {
        ctx.color("oklch(0.16 0.01 250)");
        const off = (hash(cx, cz, 375) - 0.5) * 2;
        const pts = [[c.x - ex * S / 2 + ez * off, H - 0.06, c.z - ez * S / 2 + ex * off], [c.x - ex * S / 4 + ez * off, H - 0.34, c.z - ez * S / 4 + ex * off], [c.x + ez * off, H - 0.4, c.z + ex * off], [c.x + ex * S / 4 + ez * off, H - 0.34, c.z + ez * S / 4 + ex * off], [c.x + ex * S / 2 + ez * off, H - 0.06, c.z + ez * S / 2 + ex * off]];
        tube(ctx, pts, [0.03, 0.03, 0.03, 0.03, 0.03], 5, [1, 1], 0, 1, 1);
      }
    }
    // floor: a steel tread plate, a wet dark stain
    ctx.roughness(0.4); ctx.metalness(0.6);
    if (hash(cx, cz, 381) < 0.14) { ctx.color("oklch(0.55 0.01 250)"); const ox = (hash(cx, cz, 383) - 0.5) * 2, oz = (hash(cx, cz, 385) - 0.5) * 2; box(ctx, c.x + ox - 0.7, c.x + ox + 0.7, 0, 0.018, c.z + oz - 0.5, c.z + oz + 0.5); ctx.color("oklch(0.4 0.01 250)"); for (let g = -0.45; g <= 0.46; g += 0.18) box(ctx, c.x + ox + g - 0.02, c.x + ox + g + 0.02, 0.018, 0.024, c.z + oz - 0.45, c.z + oz + 0.45); }
    ctx.metalness(0); ctx.roughness(0.1); ctx.color("oklch(0.14 0.008 70)");
    if (hash(cx, cz, 387) < 0.22) { const ox = (hash(cx, cz, 389) - 0.5) * 2.4, oz = (hash(cx, cz, 391) - 0.5) * 2.4, rr = 0.5 + hash(cx, cz, 393) * 1.1; prism(ctx, Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 6.2832, k = 0.75 + 0.5 * hash(i, cx + cz, 9); return [c.x + ox + Math.cos(a) * rr * k * 1.3, c.z + oz + Math.sin(a) * rr * k]; }), 0.004, 0.007); }
  }
  ctx.color(null); ctx.roughness(null);
}
