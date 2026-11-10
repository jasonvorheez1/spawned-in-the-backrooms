// Level 1 "The Habitable Zone": concrete floor and ceiling, banded pillars, corridor walls with push-door gaps
// and green EXIT signs, steel storage racks, ceiling pipes, the flickering wall home. Layout: scripts/lib/level1.js.
import { N, S, H, HALF, DOOR, zoneOf, edge, hasPillar, sectorOf, cellCenter, RACK, hash, BACK, ARRIVE } from "./lib/level1.js";
import { slab, prism, tube } from "./lib/shapes.js";

const FLOOR = "cdn/texture-wet-sealed-parking-garage-concrete-floor-tire-scuffs-oil-stains-hairline-cracks.png", STALL = "cdn/texture-worn-chipped-white-road-line-paint-on-concrete.png", WALL = "cdn/texture-discolored-poured-concrete-wall-water-stains.png", CEIL = "cdn/texture-smooth-cast-concrete-slab-soffit-formwork-joints-water-stains.png";
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
const T = 0.12;
const STEELTEX = "cdn/texture-scratched-worn-steel.png";
const PILLAR = "cdn/texture-painted-concrete-column-scuffed.png";
// a square column with chamfered arrises (c = chamfer), as cast concrete has
const chamf = (x, z, r, c) => [[x - r + c, z - r], [x + r - c, z - r], [x + r, z - r + c], [x + r, z + r - c], [x + r - c, z + r], [x - r + c, z + r], [x - r, z + r - c], [x - r, z - r + c]]; // half wall thickness

// one wall segment along the edge; axis "x" = a wall at fixed x running along z
function wallSeg(ctx, axis, fixed, a, b, y0 = 0, y1 = H, grime = null) {
  if (b - a < 0.01) return;
  if (axis === "x") box(ctx, fixed - T, fixed + T, y0, y1, a, b); else box(ctx, a, b, y0, y1, fixed - T, fixed + T);
  if (grime && y0 === 0) { // a damp, scuffed kick band where the floor water wicks up
    const t = T + 0.012, col = grime[0];
    ctx.color(grime[1]); if (axis === "x") box(ctx, fixed - t, fixed + t, 0, 0.28, a, b); else box(ctx, a, b, 0, 0.28, fixed - t, fixed + t); ctx.color(col);
  }
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  // floor and ceiling
  ctx.albedo(FLOOR);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF, zone = zoneOf(cx, cz);
    // light poured concrete like the reference garages: pale and even, a few cells darker where water sits (Shelly: "the floor textures need improvement")
    ctx.color(zone === "corridors" ? "oklch(0.86 0.01 80)" : hash(cx, cz, 3) < 0.18 ? "oklch(0.74 0.008 240)" : hash(cx, cz, 4) < 0.5 ? "oklch(0.84 0.007 85)" : "oklch(0.9 0.005 240)");
    ctx.roughness(hash(cx, cz, 5) < 0.35 ? 0.16 : 0.48); // wet patches catch the tubes
    ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0);
  }
  // painted floor: parking stall lines along the hall cells, a yellow walkway edge, tire tracks darkening the drive lanes
  if (hi) {
    ctx.albedo(STALL); ctx.roughness(0.6);
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      if (zoneOf(cx, cz) !== "halls") continue;
      const x0 = cx * S - HALF, z0 = cz * S - HALF, along = hash(cx, cz, 21) < 0.5, worn = hash(cx, cz, 22);
      ctx.color(worn < 0.3 ? "oklch(0.8 0.01 90)" : "oklch(0.95 0.006 90)");
      const n = Math.max(2, Math.floor(S / 2.6));
      for (let k = 0; k <= n; k++) { // stall dividers, 2.6 m apart, 5 m long, from one side of the cell
        const t = (k / n) * S;
        if (along) ctx.quad(x0 + t - 0.06, 0.004, z0 + 0.3, x0 + t - 0.06, 0.004, z0 + 5.3, x0 + t + 0.06, 0.004, z0 + 5.3, x0 + t + 0.06, 0.004, z0 + 0.3);
        else ctx.quad(x0 + 0.3, 0.004, z0 + t + 0.06, x0 + 5.3, 0.004, z0 + t + 0.06, x0 + 5.3, 0.004, z0 + t - 0.06, x0 + 0.3, 0.004, z0 + t - 0.06);
      }
      if (hash(cx, cz, 23) < 0.35) { // a yellow pedestrian edge line across the cell
        ctx.color("oklch(0.78 0.15 90)"); const m = z0 + S * 0.72;
        ctx.quad(x0 + 0.2, 0.004, m + 0.08, x0 + S - 0.2, 0.004, m + 0.08, x0 + S - 0.2, 0.004, m - 0.08, x0 + 0.2, 0.004, m - 0.08);
      }
    }
    ctx.albedo(null); ctx.roughness(0.9);
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      if (zoneOf(cx, cz) !== "halls" || hash(cx, cz, 24) > 0.55) continue;
      const x0 = cx * S - HALF, z0 = cz * S - HALF, along = hash(cx, cz, 21) < 0.5;
      ctx.color("oklch(0.42 0.01 250 / 0.5)");
      for (const off of [S * 0.62, S * 0.62 + 1.6]) { // two tire tracks down the drive lane, a little wavy
        for (let k = 0; k < 4; k++) { const a = (k / 4) * S, b = ((k + 1) / 4) * S, w = 0.09 + hash(cx, cz, 30 + k) * 0.05, d = (hash(cx, cz, 40 + k) - 0.5) * 0.25;
          if (along) ctx.quad(x0 + a, 0.003, z0 + off + d - w, x0 + a, 0.003, z0 + off + d + w, x0 + b, 0.003, z0 + off + d + w, x0 + b, 0.003, z0 + off + d - w);
          else ctx.quad(x0 + off + d + w, 0.003, z0 + a, x0 + off + d + w, 0.003, z0 + b, x0 + off + d - w, 0.003, z0 + b, x0 + off + d - w, 0.003, z0 + a);
        }
      }
    }
  }
  ctx.roughness(null); ctx.albedo(CEIL); ctx.color("oklch(0.93 0.004 250)");
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
    const wcol = corridor ? "oklch(0.84 0.014 85)" : ["oklch(0.76 0.01 250)", "oklch(0.7 0.014 75)", "oklch(0.8 0.006 240)", "oklch(0.66 0.012 90)"][Math.floor(hash(cx, cz, axis === "x" ? 11 : 13) * 4)];
    const gr = [wcol, corridor ? "oklch(0.5 0.02 80)" : "oklch(0.42 0.015 70)"];
    ctx.color(wcol);
    const fixed = axis === "x" ? (cx + 1) * S - HALF : (cz + 1) * S - HALF, start = axis === "x" ? cz * S - HALF : cx * S - HALF;
    if (e.door == null) { wallSeg(ctx, axis, fixed, start, start + S, 0, H, gr); continue; }
    const d0 = start + e.door - DOOR / 2, d1 = start + e.door + DOOR / 2;
    wallSeg(ctx, axis, fixed, start, d0, 0, H, gr); wallSeg(ctx, axis, fixed, d1, start + S, 0, H, gr); wallSeg(ctx, axis, fixed, d0, d1, 2.3, H);
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
    const x = i * S - HALF, z = j * S - HALF, r = 0.45, c = hi ? 0.035 : 0;
    ctx.albedo(PILLAR); ctx.roughness(0.92); ctx.color("oklch(0.95 0.006 250)");
    if (hi) { prism(ctx, chamf(x, z, r, c), 0.14, 1.4); prism(ctx, chamf(x, z, r, c), 1.75, H); } else box(ctx, x - r, x + r, 0, H, z - r, z + r);
    ctx.albedo(null); ctx.roughness(0.7);
    ctx.color(sectorOf(Math.min(N - 1, i), Math.min(N - 1, j)).band); if (hi) prism(ctx, chamf(x, z, r + 0.004, c), 1.4, 1.75); else box(ctx, x - r - 0.01, x + r + 0.01, 1.4, 1.75, z - r - 0.01, z + r + 0.01);
    if (hi) { ctx.color("oklch(0.42 0.01 250)"); ctx.roughness(0.85); prism(ctx, chamf(x, z, r + 0.03, c + 0.02), 0, 0.14); } // tarred kick plinth where the forklifts scuff
    ctx.roughness(null);
  }
  // storage racks (Shelly: "this area could be less blocky and have better detail"): warehouse pallet racking.
  // blue punched C-section uprights braced in a zig-zag, orange step beams on connector plates, bolted foot plates,
  // OSB decks over wire mesh, a yellow end guard, and stock on the shelves: taped cartons, paint pails, a shrink-wrapped stack
  const OSB = "cdn/texture-osb-oriented-strand-board-plywood.png", CARTON = "cdn/texture-corrugated-cardboard-box-side-packing-tape.png", MESH = "cdn/texture-galvanized-steel-wire-mesh-grid.png";
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "storage") continue;
    const c = cellCenter(cx, cz);
    for (const r of RACK.rows) {
      const z0 = c.z + r - RACK.depth / 2, z1 = c.z + r + RACK.depth / 2, x0 = c.x - RACK.len / 2, x1 = c.x + RACK.len / 2, bays = [x0, c.x, x1];
      // uprights: a C-section (web + two flanges) with a punched slot strip, a foot plate and two anchor bolts
      ctx.albedo(STEELTEX); ctx.metalness(0.55); ctx.roughness(0.45);
      for (const x of bays) for (const z of [z0, z1]) {
        const out = z === z0 ? -1 : 1;
        ctx.color("oklch(0.48 0.13 255)");
        box(ctx, x - 0.045, x + 0.045, 0, RACK.top, z - 0.008 + out * 0.035, z + 0.008 + out * 0.035); // web, on the aisle face
        box(ctx, x - 0.045, x - 0.037, 0, RACK.top, z - 0.035, z + 0.035); box(ctx, x + 0.037, x + 0.045, 0, RACK.top, z - 0.035, z + 0.035); // flanges
        ctx.color("oklch(0.4 0.02 250)"); box(ctx, x - 0.08, x + 0.08, 0, 0.008, z - 0.07, z + 0.07); // foot plate
      }
      // frame bracing between the front and back upright: horizontals at the foot and top, diagonals in between
      ctx.color("oklch(0.5 0.12 255)");
      for (const x of bays) {
        const brace = (ya, za, yb, zb) => tube(ctx, [[x, ya, za], [x, yb, zb]], [0.014, 0.014], 4, [1, 1], 0, 1, 1);
        brace(0.15, z0 + 0.03, 0.15, z1 - 0.03); if (hi) brace(RACK.top - 0.08, z0 + 0.03, RACK.top - 0.08, z1 - 0.03);
        if (hi) for (let y = 0.15, k = 0; y < RACK.top - 0.4; y += 0.6, k++) brace(y, k % 2 ? z1 - 0.03 : z0 + 0.03, y + 0.6, k % 2 ? z0 + 0.03 : z1 - 0.03);
      }
      // step beams, front and back, at each level: a boxed orange beam with a stepped lip and connector plates at the ends
      for (const y of RACK.levels) for (const z of [z0, z1]) {
        const out = z === z0 ? -1 : 1, by = Math.max(0.06, y);
        ctx.color("oklch(0.66 0.17 50)"); box(ctx, x0 + 0.045, x1 - 0.045, by - 0.11, by - 0.01, z + out * 0.03 - 0.025, z + out * 0.03 + 0.025);
        if (hi) { ctx.color("oklch(0.6 0.16 48)"); box(ctx, x0 + 0.045, x1 - 0.045, by - 0.03, by, z - out * 0.0 - 0.02, z + 0.02); // the step the deck sits on
}
      }
      // decks: wire mesh on the lowest level, OSB above, each bay its own board with a gap at the upright
      ctx.metalness(0); ctx.roughness(0.8);
      for (const [li, y] of RACK.levels.entries()) for (let k = 0; k < 2; k++) {
        const a = bays[k] + 0.05, b2 = bays[k + 1] - 0.05;
        if (li === 0) { ctx.albedo(MESH); ctx.color("oklch(0.8 0.01 250)"); ctx.metalness(0.6); box(ctx, a, b2, y - 0.02, y, z0 + 0.02, z1 - 0.02); ctx.metalness(0); }
        else { ctx.albedo(OSB); ctx.color("oklch(0.86 0.04 75)"); box(ctx, a, b2, y - 0.018, y, z0 + 0.02, z1 - 0.02); }
      }
      // a yellow end guard bolted at the aisle end
      ctx.albedo(null); ctx.color("oklch(0.8 0.16 90)"); ctx.metalness(0.3); ctx.roughness(0.5);
      if (hi) { tube(ctx, [[x1 + 0.18, 0, z0 - 0.05], [x1 + 0.18, 0.45, z0 - 0.05], [x1 + 0.18, 0.45, z1 + 0.05], [x1 + 0.18, 0, z1 + 0.05]], [0.04, 0.04, 0.04, 0.04], 10, [1, 1], 0, 1, 1); }
      // stock: the cartons and pails on these decks are searchable containers, laid by places/level1/sim.js (layStock)
      ctx.albedo(null); ctx.metalness(0); ctx.roughness(null);
    }
  }
  // pipes along the ceiling, every other row
  if (hi) {
    ctx.color("oklch(0.9 0.004 250)"); ctx.metalness(0.2); ctx.roughness(0.4); // white service pipes, paired, on drop hangers, as in the photographs
    for (let cz = 0; cz < N; cz += 3) { const z = cz * S - HALF + 1.17; for (const dz of [0, 0.22]) tube(ctx, [[-HALF, H - 0.285, z + dz], [HALF, H - 0.285, z + dz]], [dz ? 0.04 : 0.065, dz ? 0.04 : 0.065], 10, [1, 1], 0, 1, 1);
      ctx.color("oklch(0.4 0.01 250)"); for (let x = -HALF + 2; x < HALF; x += 4) { box(ctx, x - 0.012, x + 0.012, H - 0.36, H, z - 0.012, z + 0.012); box(ctx, x - 0.02, x + 0.02, H - 0.37, H - 0.35, z - 0.08, z + 0.3); } ctx.color("oklch(0.9 0.004 250)"); }
    ctx.metalness(0);
  }
  // the flickering wall home: a warped panel of level 0 wallpaper on a freestanding wall
  const b = BACK;
  void b; // the wall itself is the modelled l1-backwall (art/level1/build.py), spawned by places/level1/sim.js
  ctx.color(null); ctx.roughness(null);
}
