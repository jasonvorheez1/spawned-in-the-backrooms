// Level 1's finer detail, one static mesh, drawn from the reference photographs of an unfinished underground
// car park: downstand concrete beams, red fire-sprinkler pipes with heads and hangers, orange cable trays,
// white ducts, glossy wet stains and tyre tracks on the floor, glaring strip lights on the walls, hose-reel
// cabinets on pillars, cement bags, rebar bundles and loose cables. Placed from the seeded layout.
import { N, S, H, HALF, zoneOf, cellCenter, hash, hasPillar, ARRIVE } from "./lib/level1.js";
import { slab, prism, tube } from "./lib/shapes.js";

const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
const open = (cx, cz) => { const z = zoneOf(cx, cz); return z === "halls" || z === "storage"; };
const blob = (x, z, r, n, seed) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.2832, k = 0.7 + 0.5 * hash(i, seed, 9); return [x + Math.cos(a) * r * k * 1.3, z + Math.sin(a) * r * k]; });

export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  ctx.smooth(); ctx.metalness(0);

  // downstand beams on the pillar grid: a structural ceiling instead of a flat slab
  ctx.color("oklch(0.74 0.008 250)"); ctx.roughness(0.9);
  for (let j = 2; j < N; j += 2) box(ctx, -HALF, HALF, H - 0.62, H, j * S - HALF - 0.28, j * S - HALF + 0.28);
  for (let i = 2; i < N; i += 2) box(ctx, i * S - HALF - 0.28, i * S - HALF + 0.28, H - 0.62, H, -HALF, HALF);

  if (hi) {
    // red sprinkler mains along x, branches along z, heads and hangers
    ctx.color("oklch(0.5 0.2 28)"); ctx.roughness(0.45); ctx.metalness(0.4);
    for (let j = 1; j < N; j += 2) { const z = j * S - HALF + 1.9; box(ctx, -HALF, HALF, H - 0.7, H - 0.62, z - 0.04, z + 0.04); box(ctx, -HALF, HALF, H - 0.7, H - 0.62, z + 0.1, z + 0.18); }
    for (let i = 1; i < N; i += 2) { const x = i * S - HALF - 1.5; box(ctx, x - 0.04, x + 0.04, H - 0.66, H - 0.58, -HALF, HALF); }
    ctx.color("oklch(0.7 0.14 40)");
    for (let j = 1; j < N; j += 2) for (let i = 0; i < N; i += 2) { const x = i * S - HALF + 2, z = j * S - HALF + 1.9; box(ctx, x - 0.025, x + 0.025, H - 0.9, H - 0.7, z - 0.025, z + 0.025); box(ctx, x - 0.07, x + 0.07, H - 0.92, H - 0.9, z - 0.07, z + 0.07); }
    ctx.color("oklch(0.45 0.02 250)");
    for (let j = 1; j < N; j += 2) for (let i = 0; i < N; i += 2) { const x = i * S - HALF + 5.6, z = j * S - HALF + 1.9; box(ctx, x - 0.012, x + 0.012, H - 0.62, H, z - 0.012, z + 0.012); }
    // orange cable trays and a white duct
    ctx.metalness(0.2); ctx.roughness(0.6); ctx.color("oklch(0.62 0.16 48)");
    for (let i = 3; i < N; i += 6) { const x = i * S - HALF + 2.2; box(ctx, x - 0.22, x + 0.22, H - 0.82, H - 0.78, -HALF, HALF); box(ctx, x - 0.22, x - 0.19, H - 0.82, H - 0.66, -HALF, HALF); box(ctx, x + 0.19, x + 0.22, H - 0.82, H - 0.66, -HALF, HALF); }
    ctx.metalness(0.4); ctx.color("oklch(0.82 0.005 250)");
    for (let j = 5; j < N; j += 10) { const z = j * S - HALF + 3; box(ctx, -HALF, HALF, H - 1.05, H - 0.78, z - 0.28, z + 0.28); }
    ctx.metalness(0);
  }

  // floor: wet stains, tyre tracks and dust, so the concrete is not one flat colour
  ctx.roughness(0.12); ctx.color("oklch(0.2 0.008 250)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (!open(cx, cz)) continue;
    const c = cellCenter(cx, cz), r = hash(cx, cz, 301);
    if (r < 0.2) prism(ctx, blob(c.x + (hash(cx, cz, 303) - 0.5) * 4, c.z + (hash(cx, cz, 305) - 0.5) * 4, 0.8 + hash(cx, cz, 307) * 1.6, 10, cx * 31 + cz), 0.004, 0.006);
  }
  for (let cz = 2; cz < N; cz += 4) for (let cx = 0; cx < N - 3; cx++) {
    if (!open(cx, cz) || !open(cx + 1, cz) || hash(cx, cz, 311) < 0.35) continue;
    const c = cellCenter(cx, cz), z = c.z + (hash(cx, cz, 313) - 0.5) * 2;
    for (const dz of [-0.75, 0.75]) box(ctx, c.x - S / 2, c.x + S / 2, 0.004, 0.006, z + dz - 0.1, z + dz + 0.1);
  }
  ctx.roughness(0.98); ctx.color("oklch(0.7 0.01 80)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) if (open(cx, cz) && hash(cx, cz, 321) < 0.18) { const c = cellCenter(cx, cz); prism(ctx, blob(c.x + (hash(cx, cz, 323) - 0.5) * 3, c.z + (hash(cx, cz, 325) - 0.5) * 3, 1.2, 9, cx * 17 + cz), 0.003, 0.005); }

  // glaring strip lights set into the outer walls, and a few hose-reel cabinets on pillars
  ctx.roughness(0.4);
  ctx.color("oklch(0.98 0.01 220)"); ctx.emissive("oklch(0.97 0.02 220)");
  for (let k = 3; k < N; k += 4) {
    const t = k * S - HALF + 3;
    box(ctx, -HALF + 0.12, -HALF + 0.2, 1.0, 3.0, t - 0.14, t + 0.14); box(ctx, HALF - 0.2, HALF - 0.12, 1.0, 3.0, t - 0.14, t + 0.14);
    box(ctx, t - 0.14, t + 0.14, 1.0, 3.0, -HALF + 0.12, -HALF + 0.2); box(ctx, t - 0.14, t + 0.14, 1.0, 3.0, HALF - 0.2, HALF - 0.12);
  }
  ctx.emissive(null);
  if (hi) for (let i = 2; i < N; i += 4) for (let j = 2; j < N; j += 4) {
    if (!hasPillar(i, j) || hash(i, j, 331) > 0.45) continue;
    const x = i * S - HALF, z = j * S - HALF + 0.46;
    ctx.color("oklch(0.5 0.21 27)"); ctx.metalness(0.3);
    box(ctx, x - 0.2, x + 0.2, 1.0, 1.4, z, z + 0.1);
    ctx.color("oklch(0.85 0.02 90)"); box(ctx, x - 0.12, x + 0.12, 1.1, 1.3, z + 0.1, z + 0.12);
    ctx.metalness(0);
  }

  // clutter on the floor: cement bags, rebar bundles, loose cable
  ctx.roughness(0.95);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (!open(cx, cz) || Math.abs(cx - ARRIVE.cx) + Math.abs(cz - ARRIVE.cz) < 3) continue;
    const c = cellCenter(cx, cz), r = hash(cx, cz, 341), x = c.x + (hash(cx, cz, 343) - 0.5) * 5, z = c.z + (hash(cx, cz, 345) - 0.5) * 5;
    if (r < 0.06) { ctx.color("oklch(0.88 0.015 85)"); for (let q = 0; q < 3; q++) box(ctx, x + q * 0.1 - 0.3, x + q * 0.1 + 0.3, 0.02 + q * 0.16, 0.16 + q * 0.16, z - 0.2 + q * 0.06, z + 0.2 + q * 0.06); }
    else if (r < 0.1) { ctx.color("oklch(0.42 0.05 40)"); ctx.metalness(0.6); for (let q = 0; q < 5; q++) box(ctx, x - 0.9, x + 0.9, 0.02 + (q % 2) * 0.04, 0.05 + (q % 2) * 0.04, z + q * 0.05, z + q * 0.05 + 0.03); ctx.metalness(0); }
    else if (hi && r < 0.15) { ctx.color("oklch(0.18 0.01 250)"); tube(ctx, [[x - 1, 0.02, z], [x - 0.4, 0.02, z + 0.5], [x + 0.2, 0.02, z - 0.3], [x + 1, 0.02, z + 0.2]], [0.02, 0.02, 0.02, 0.02], 5); }
  }
  ctx.color(null); ctx.roughness(null);
}
