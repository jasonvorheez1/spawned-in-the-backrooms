// Level 1 "The Habitable Zone": concrete floor and ceiling, banded pillars, corridor walls with push-door gaps
// and green EXIT signs, steel storage racks, ceiling pipes, the flickering wall home. Layout: scripts/lib/level1.js.
import { N, S, H, HALF, DOOR, zoneOf, edge, hasPillar, sectorOf, cellCenter, RACK, hash, BACK, ARRIVE } from "./lib/level1.js";
import { slab } from "./lib/shapes.js";

const FLOOR = "cdn/texture-stained-concrete-floor.png", WALL = "cdn/texture-painted-cinder-block-wall-clean.png", CEIL = "cdn/texture-concrete-ceiling-panels.png";
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
const T = 0.12; // half wall thickness

// one wall segment along the edge; axis "x" = a wall at fixed x running along z
function wallSeg(ctx, axis, fixed, a, b, y0 = 0, y1 = H) {
  if (b - a < 0.01) return;
  if (axis === "x") box(ctx, fixed - T, fixed + T, y0, y1, a, b); else box(ctx, a, b, y0, y1, fixed - T, fixed + T);
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  // floor and ceiling
  ctx.albedo(FLOOR);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF, zone = zoneOf(cx, cz);
    ctx.color(zone === "corridors" ? "oklch(0.93 0.01 80)" : hash(cx, cz, 3) < 0.15 ? "oklch(0.86 0.015 250)" : "oklch(0.97 0.006 250)");
    ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0);
  }
  ctx.albedo(CEIL); ctx.color("oklch(0.9 0.005 250)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF;
    ctx.quad(x0, H, z0, x0 + S, H, z0, x0 + S, H, z0 + S, x0, H, z0 + S);
  }
  // walls: every cell edge, the outer ring included
  ctx.albedo(WALL);
  const signs = [], cut = new Set(ctx.params?.cut ?? []); // broken walls: scripts/wallpatch-geo.js draws what is left
  for (let cx = -1; cx < N; cx++) for (let cz = -1; cz < N; cz++) for (const axis of ["x", "z"]) {
    if ((axis === "x" && (cz < 0)) || (axis === "z" && (cx < 0))) continue;
    const e = edge(cx, cz, axis); if (!e) continue;
    if (cut.has(`${axis}:${cx}:${cz}`)) continue;
    const corridor = zoneOf(cx, cz) === "corridors" || zoneOf(axis === "x" ? cx + 1 : cx, axis === "z" ? cz + 1 : cz) === "corridors";
    ctx.color(corridor ? "oklch(0.95 0.01 85)" : "oklch(0.8 0.012 250)");
    const fixed = axis === "x" ? (cx + 1) * S - HALF : (cz + 1) * S - HALF, start = axis === "x" ? cz * S - HALF : cx * S - HALF;
    if (e.door == null) { wallSeg(ctx, axis, fixed, start, start + S); continue; }
    const d0 = start + e.door - DOOR / 2, d1 = start + e.door + DOOR / 2;
    wallSeg(ctx, axis, fixed, start, d0); wallSeg(ctx, axis, fixed, d1, start + S); wallSeg(ctx, axis, fixed, d0, d1, 2.3, H);
    if (e.sign) signs.push([axis, fixed, (d0 + d1) / 2]);
  }
  ctx.albedo(null);
  // door frames and the green signs that mark the corridors
  for (const [axis, f, m] of signs) {
    ctx.color("oklch(0.35 0.01 250)"); ctx.roughness(0.5); ctx.metalness(0.6);
    if (axis === "x") { box(ctx, f - 0.16, f + 0.16, 0, 2.36, m - DOOR / 2 - 0.08, m - DOOR / 2); box(ctx, f - 0.16, f + 0.16, 0, 2.36, m + DOOR / 2, m + DOOR / 2 + 0.08); box(ctx, f - 0.16, f + 0.16, 2.28, 2.36, m - DOOR / 2, m + DOOR / 2); }
    else { box(ctx, m - DOOR / 2 - 0.08, m - DOOR / 2, 0, 2.36, f - 0.16, f + 0.16); box(ctx, m + DOOR / 2, m + DOOR / 2 + 0.08, 0, 2.36, f - 0.16, f + 0.16); box(ctx, m - DOOR / 2, m + DOOR / 2, 2.28, 2.36, f - 0.16, f + 0.16); }
    ctx.metalness(0); ctx.color("oklch(0.25 0.05 150)"); ctx.emissive("oklch(0.75 0.25 150)");
    if (axis === "x") box(ctx, f - 0.2, f + 0.2, 2.5, 2.72, m - 0.32, m + 0.32); else box(ctx, m - 0.32, m + 0.32, 2.5, 2.72, f - 0.2, f + 0.2);
    ctx.emissive(null);
  }
  // pillars: concrete, a sector-coloured band at eye height, chipped feet
  for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
    if (!hasPillar(i, j)) continue;
    const x = i * S - HALF, z = j * S - HALF, r = 0.45;
    ctx.color("oklch(0.82 0.008 250)"); box(ctx, x - r, x + r, 0, H, z - r, z + r);
    ctx.color(sectorOf(Math.min(N - 1, i), Math.min(N - 1, j)).band); box(ctx, x - r - 0.01, x + r + 0.01, 1.4, 1.75, z - r - 0.01, z + r + 0.01);
    if (hi) { ctx.color("oklch(0.55 0.01 250)"); box(ctx, x - r - 0.04, x + r + 0.04, 0, 0.12, z - r - 0.04, z + r + 0.04); }
  }
  // storage racks: steel uprights and plank shelves
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "storage") continue;
    const c = cellCenter(cx, cz);
    for (const r of RACK.rows) {
      const z0 = c.z + r - RACK.depth / 2, z1 = c.z + r + RACK.depth / 2, x0 = c.x - RACK.len / 2, x1 = c.x + RACK.len / 2;
      ctx.color("oklch(0.5 0.12 45)"); ctx.metalness(0.5); ctx.roughness(0.6);
      for (const x of [x0, c.x, x1]) for (const z of [z0, z1]) box(ctx, x - 0.04, x + 0.04, 0, RACK.top, z - 0.04, z + 0.04);
      ctx.metalness(0); ctx.color("oklch(0.62 0.05 70)");
      for (const y of RACK.levels) box(ctx, x0, x1, y - 0.05, y, z0, z1);
    }
  }
  // pipes along the ceiling, every other row
  if (hi) {
    ctx.color("oklch(0.45 0.02 60)"); ctx.metalness(0.7); ctx.roughness(0.45);
    for (let cz = 0; cz < N; cz += 3) box(ctx, -HALF, HALF, H - 0.35, H - 0.22, cz * S - HALF + 1.1, cz * S - HALF + 1.24);
    ctx.metalness(0);
  }
  // the flickering wall home: a warped panel of level 0 wallpaper on a freestanding wall
  const b = BACK;
  ctx.color("oklch(0.8 0.012 250)"); box(ctx, b.x - 0.3, b.x - 0.1, 0, H, b.z - 2.4, b.z + 2.4);
  ctx.color("oklch(0.8 0.12 92)"); ctx.emissive("oklch(0.55 0.1 92)"); box(ctx, b.x - 0.1, b.x, 0.05, 2.6, b.z - 1.2, b.z + 1.2); ctx.emissive(null);
  ctx.color(null); ctx.roughness(null);
}
