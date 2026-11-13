// Level 1 "The Habitable Zone": concrete floor and ceiling, banded pillars, corridor walls with push-door gaps
// and green EXIT signs, steel storage racks, ceiling pipes, the flickering wall home. Layout: scripts/lib/level1.js.
import { N, S, H, HALF, DOOR, zoneOf, edge, hasPillar, sectorOf, cellCenter, RACK, hash, BACK, ARRIVE, rampCell, runs, inHole } from "./lib/level1.js";
import { puddle } from "./level1-deck-geo.js";
import { slab, prism, tube } from "./lib/shapes.js";

const CFLOOR = "cdn/texture-sealed-epoxy-coated-concrete-service-corridor-floor-scuffed-worn-patches.png";
const CMU = "cdn/texture-painted-concrete-block-wall-cream-paint-scuffed-damp-grime-low.png";
const FLOOR = "cdn/texture-wet-sealed-parking-garage-concrete-floor-tire-scuffs-oil-stains-hairline-cracks.png", STALL = "cdn/texture-worn-chipped-white-road-line-paint-on-concrete.png", WALL = "cdn/texture-discolored-poured-concrete-wall-water-stains.png", CEIL = "cdn/texture-concrete-ceiling-panels.png";
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
    ctx.color(grime[1]); if (axis === "x") box(ctx, fixed - t, fixed + t, 0, 0.14, a, b); else box(ctx, a, b, 0, 0.14, fixed - t, fixed + t); ctx.color(col);
  }
  if (grime && y0 === 0 && grime[2] && b - a > 0.8) { // Nov 13 realism pass: what a real car-park wall carries
    const k = grime[2], t2 = T + 0.006, X = (u0, u1, v0, v1, w0, w1) => axis === "x" ? box(ctx, w0, w1, v0, v1, u0, u1) : box(ctx, u0, u1, v0, v1, w0, w1), col = grime[0];
    ctx.albedo(null);
    if (k.dado) { // a painted grey dado to 1.2 m and a yellow pinstripe above it, both faces
      ctx.color("oklch(0.52 0.012 250)"); ctx.roughness(0.7); X(a, b, 0.14, 1.2, fixed - t2, fixed + t2);
      ctx.color("oklch(0.74 0.15 90)"); X(a, b, 1.2, 1.28, fixed - t2, fixed + t2);
    }
    if (k.conduit) { // one grey conduit at 2.7 m on the +side, a saddle clip every 1.5 m, a junction box at the run's middle
      const w = fixed + T + 0.03, y = 2.7, pts = axis === "x" ? [[w, y, a], [w, y, b]] : [[a, y, w], [b, y, w]];
      ctx.color("oklch(0.62 0.006 250)"); ctx.roughness(0.5); ctx.metalness(0.5);
      tube(ctx, pts, [0.016, 0.016], 6);
      for (let u = a + 0.75; u < b - 0.2; u += 1.5) X(u - 0.015, u + 0.015, y - 0.022, y + 0.022, fixed + T, fixed + T + 0.05);
      const m = (a + b) / 2; ctx.color("oklch(0.55 0.008 250)"); X(m - 0.1, m + 0.1, y - 0.1, y + 0.1, fixed + T, fixed + T + 0.07);
      if (k.drop) { tube(ctx, axis === "x" ? [[w, y - 0.1, m], [w, 1.45, m]] : [[m, y - 0.1, w], [m, 1.45, w]], [0.014, 0.014], 6); ctx.color("oklch(0.8 0.01 90)"); X(m - 0.045, m + 0.045, 1.33, 1.45, fixed + T, fixed + T + 0.04); } // a switch box
      ctx.metalness(0);
    }
    ctx.albedo(k.tex); ctx.color(col); ctx.roughness(0.9);
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
    if (zone === "corridors") { ctx.albedo(CFLOOR); ctx.color("oklch(0.78 0.02 160)"); ctx.roughness(0.32); } // Nov 13 corridor pass: sealed service-corridor floor, a step greener than the car park
    ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0);
    if (zone === "corridors") ctx.albedo(FLOOR);
  }
  // Nov 13 corridor pass (Shelly: "this area looks like garbage" / "improve this area"): each back-corridor room gets a
  // yellow safety line inset from its walls, a caged bulkhead lamp on the ceiling (its light: places/level1/sim.js corrV),
  // a pipe run on hangers and a fire-hose cabinet or breaker panel on one wall
  if (hi) for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "corridors") continue;
    const x0 = cx * S - HALF, z0 = cz * S - HALF, x1 = x0 + S, z1 = z0 + S, mx = x0 + S / 2, mz = z0 + S / 2, i = 0.45, w = 0.07;
    ctx.albedo(STALL); ctx.color("oklch(0.78 0.15 88)"); ctx.roughness(0.55);
    for (const [ax0, ax1, az0, az1] of [[x0 + i, x1 - i, z0 + i, z0 + i + w], [x0 + i, x1 - i, z1 - i - w, z1 - i], [x0 + i, x0 + i + w, z0 + i, z1 - i], [x1 - i - w, x1 - i, z0 + i, z1 - i]])
      ctx.quad(ax0, 0.004, az0, ax0, 0.004, az1, ax1, 0.004, az1, ax1, 0.004, az0);
    ctx.albedo(null);
    // bulkhead: a cast base, a frosted dome, a wire cage over it, hung on a short conduit drop
    ctx.color("oklch(0.4 0.01 250)"); ctx.metalness(0.6); ctx.roughness(0.45);
    tube(ctx, [[mx, H, mz], [mx, H - 0.32, mz]], [0.018, 0.018], 6);
    box(ctx, mx - 0.13, mx + 0.13, H - 0.38, H - 0.32, mz - 0.13, mz + 0.13);
    ctx.metalness(0); ctx.color("oklch(0.97 0.03 90)"); ctx.emissive("oklch(0.95 0.06 85)");
    box(ctx, mx - 0.1, mx + 0.1, H - 0.5, H - 0.38, mz - 0.1, mz + 0.1);
    ctx.emissive(null); ctx.color("oklch(0.3 0.01 250)"); ctx.metalness(0.7);
    for (const d of [-0.11, 0, 0.11]) { box(ctx, mx + d - 0.006, mx + d + 0.006, H - 0.52, H - 0.38, mz - 0.115, mz + 0.115); box(ctx, mx - 0.115, mx + 0.115, H - 0.52, H - 0.38, mz + d - 0.006, mz + d + 0.006); }
    // a pair of insulated pipes along one side on drop hangers
    const alongX = hash(cx, cz, 601) < 0.5, side = hash(cx, cz, 602) < 0.5 ? 0.55 : S - 0.55;
    for (const [k, r, col] of [[0, 0.07, "oklch(0.86 0.01 90)"], [0.2, 0.045, "oklch(0.5 0.12 30)"]]) {
      ctx.color(col); ctx.metalness(k ? 0.4 : 0); ctx.roughness(k ? 0.5 : 0.85);
      const y = H - 0.42, o = side + (side < S / 2 ? k : -k);
      tube(ctx, alongX ? [[x0, y, z0 + o], [x1, y, z0 + o]] : [[x0 + o, y, z0], [x0 + o, y, z1]], [r, r], 8);
    }
    ctx.color("oklch(0.35 0.01 250)"); ctx.metalness(0.6);
    for (let u = 1; u < S; u += 2) { const y = H - 0.42; if (alongX) box(ctx, x0 + u - 0.01, x0 + u + 0.01, y, H, z0 + side - 0.02, z0 + side + 0.02); else box(ctx, x0 + side - 0.02, x0 + side + 0.02, y, H, z0 + u - 0.01, z0 + u + 0.01); }
    // one wall fixture: a red hose cabinet or a grey breaker panel, set against a wall that is there
    const kind = hash(cx, cz, 603);
    if (kind < 0.6) {
      const ex = edge(cx, cz, "x"), wx = x1 - 0.12; // the cell's +x wall
      if (ex && ex.door == null) {
        const red = kind < 0.25, zc = mz + (hash(cx, cz, 604) - 0.5) * 3;
        ctx.metalness(0.5); ctx.roughness(0.4); ctx.color(red ? "oklch(0.5 0.18 27)" : "oklch(0.62 0.01 240)");
        box(ctx, wx - 0.2, wx, red ? 0.9 : 1.1, red ? 1.75 : 1.95, zc - (red ? 0.35 : 0.25), zc + (red ? 0.35 : 0.25));
        ctx.color("oklch(0.2 0.01 250)"); box(ctx, wx - 0.205, wx - 0.195, red ? 1.3 : 1.5, red ? 1.36 : 1.56, zc + (red ? 0.25 : 0.17), zc + (red ? 0.31 : 0.21));
        if (!red) { ctx.color("oklch(0.62 0.006 250)"); tube(ctx, [[wx - 0.1, 1.95, zc], [wx - 0.1, H, zc]], [0.02, 0.02], 6); }
        if (red) { ctx.color("oklch(0.95 0.01 90)"); ctx.metalness(0); box(ctx, wx - 0.206, wx - 0.2, 1.62, 1.7, zc - 0.22, zc + 0.22); }
      }
    }
    ctx.metalness(0); ctx.roughness(0.85);
  }
  ctx.albedo(FLOOR);
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
  // standing water: glassy puddles in the low spots of the halls and storage, the tubes smeared across them (Shelly's wet-garage reference)
  ctx.albedo(null); ctx.metalness(0); ctx.roughness(0.02); ctx.color("oklch(0.5 0.012 230 / 0.28)"); // Nov 13 (Shelly's "improve this" shot): was 0.3 / 0.9, opaque black blots; now a thin film the floor shows through
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const zone = zoneOf(cx, cz); if ((zone !== "halls" && zone !== "storage") || rampCell(cx, cz) || hash(cx, cz, 461) > 0.4) continue;
    if (zone === "halls" && hash(cx, cz, 201) >= 0.19 && hash(cx, cz, 201) < 0.23) continue; // a fallen slab stands in this cell: dry ground under it (Shelly: no black puddle)
    const x0 = cx * S - HALF, z0 = cz * S - HALF;
    for (let k = 0; k < 1 + Math.floor(hash(cx, cz, 462) * 3); k++) puddle(ctx, x0 + 1.2 + hash(cx, cz, 470 + k) * 5.6, 0.006, z0 + 1.2 + hash(cx, cz, 480 + k) * 5.6, 0.5 + hash(cx, cz, 490 + k) * 1.8, cx * 131 + cz * 17 + k);
  }
  ctx.roughness(null); ctx.albedo(CEIL); ctx.color("oklch(0.93 0.004 250)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF;
    if (rampCell(cx, cz)) continue; // the ramps climb through here to the upper deck
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
    const gr = [wcol, corridor ? "oklch(0.66 0.02 80)" : "oklch(0.6 0.015 70)", hi ? { tex: corridor ? CMU : WALL, dado: !corridor, conduit: hash(cx, cz, axis === "x" ? 21 : 23) < 0.55, drop: hash(cx, cz, 25) < 0.25 } : null]; // the kick band a step darker than the wall, not a black strip
    ctx.albedo(corridor ? CMU : WALL); ctx.color(wcol); // Nov 13 (Shelly: "this area looks like garbage"): corridors are painted block, not the smeared pour
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
    const x = i * S - HALF, z = j * S - HALF, r = 0.45, c = hi ? 0.07 : 0; // Nov 13 (Shelly: "revamp level 1 ... more realistic"): deeper cast chamfer
    ctx.albedo(PILLAR); ctx.roughness(0.92); ctx.color("oklch(0.95 0.006 250)");
    if (hi) { prism(ctx, chamf(x, z, r, c), 0.14, 1.4); prism(ctx, chamf(x, z, r, c), 1.75, H); } else box(ctx, x - r, x + r, 0, H, z - r, z + r);
    ctx.albedo(null); ctx.roughness(0.7);
    ctx.color(sectorOf(Math.min(N - 1, i), Math.min(N - 1, j)).band); if (hi) prism(ctx, chamf(x, z, r + 0.004, c), 1.4, 1.75); else box(ctx, x - r - 0.01, x + r + 0.01, 1.4, 1.75, z - r - 0.01, z + r + 0.01);
    if (hi) { ctx.color("oklch(0.42 0.01 250)"); ctx.roughness(0.85); prism(ctx, chamf(x, z, r + 0.03, c + 0.02), 0, 0.14); } // tarred kick plinth where the forklifts scuff
    if (hi) { // the cast capital: a stepped drop head that carries the slab, as poured car-park columns have, and a chipped arris low down where bumpers hit
      ctx.albedo(PILLAR); ctx.roughness(0.93); ctx.color("oklch(0.9 0.006 250)");
      prism(ctx, chamf(x, z, r + 0.08, c + 0.04), H - 0.55, H - 0.3); prism(ctx, chamf(x, z, r + 0.2, c + 0.08), H - 0.3, H);
      const k = Math.floor(hash(i, j, 977) * 4), sx = k & 1 ? 1 : -1, sz = k & 2 ? 1 : -1, cy = 0.35 + hash(i, j, 979) * 0.4; // one knocked corner per column, seeded
      ctx.color("oklch(0.62 0.01 70)"); prism(ctx, [[x + sx * (r - 0.09), z + sz * (r + 0.001)], [x + sx * (r + 0.001), z + sz * (r + 0.001)], [x + sx * (r + 0.001), z + sz * (r - 0.09)]], cy, cy + 0.12 + hash(i, j, 981) * 0.1);
      ctx.albedo(null);
    }
    ctx.roughness(null);
  }
  // storage racks (Shelly: "this area could be less blocky and have better detail"): warehouse pallet racking.
  // blue punched C-section uprights braced in a zig-zag, orange step beams on connector plates, bolted foot plates,
  // OSB decks over wire mesh, a yellow end guard, and stock on the shelves: taped cartons, paint pails, a shrink-wrapped stack
  const OSB = "cdn/texture-osb-oriented-strand-board-plywood.png", CARTON = "cdn/texture-corrugated-cardboard-box-side-packing-tape.png", MESH = "cdn/texture-galvanized-steel-wire-mesh-grid.png";
  // Nov 13: the racks are Tripo models now (l1rack rows, places/level1/sim.js); this drawn set stays off
  if (false) for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
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
    for (let cz = 0; cz < N; cz += 3) { const z = cz * S - HALF + 1.17; for (const dz of [0, 0.22]) for (const [ra, rb] of runs("x", z + dz, -HALF, HALF)) tube(ctx, [[ra, H - 0.285, z + dz], [rb, H - 0.285, z + dz]], [dz ? 0.04 : 0.065, dz ? 0.04 : 0.065], 10, [1, 1], 0, 1, 1);
      ctx.color("oklch(0.4 0.01 250)"); for (let x = -HALF + 2; x < HALF; x += 4) { if (inHole(x, z)) continue; box(ctx, x - 0.012, x + 0.012, H - 0.36, H, z - 0.012, z + 0.012); box(ctx, x - 0.02, x + 0.02, H - 0.37, H - 0.35, z - 0.08, z + 0.3); } ctx.color("oklch(0.9 0.004 250)"); }
    ctx.metalness(0);
  }
  // the flickering wall home: a warped panel of level 0 wallpaper on a freestanding wall
  const b = BACK;
  void b; // the wall itself is the modelled l1-backwall (art/level1/build.py), spawned by places/level1/sim.js
  ctx.color(null); ctx.roughness(null);
}
