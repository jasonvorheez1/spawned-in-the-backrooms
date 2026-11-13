// Level 1's finer detail, one static mesh, drawn from the reference photographs of an unfinished underground
// car park: downstand concrete beams, red fire-sprinkler pipes with heads and hangers, orange cable trays,
// white ducts, glossy wet stains and tyre tracks on the floor, glaring strip lights on the walls, hose-reel
// cabinets on pillars, cement bags, rebar bundles and loose cables. Placed from the seeded layout.
import { N, S, H, HALF, zoneOf, cellCenter, hash, hasPillar, ARRIVE, runs, inHole } from "./lib/level1.js";
import { face, slab, prism, tube } from "./lib/shapes.js";

const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
const open = (cx, cz) => { const z = zoneOf(cx, cz); return z === "halls" || z === "storage"; };
const blob = (x, z, r, n, seed) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.2832, k = 0.7 + 0.5 * hash(i, seed, 9); return [x + Math.cos(a) * r * k * 1.3, z + Math.sin(a) * r * k]; });

// a downstand beam along x or z at cross-position c, 0.56 wide, 0.62 deep, its two bottom edges chamfered 6 cm
function beam(ctx, axis, c, a, b) {
  const w = 0.28, yb = H - 0.62, ch = 0.06, cy = H - 0.31;
  const prof = [[-w, H], [-w, yb + ch], [-w + ch, yb], [w - ch, yb], [w, yb + ch], [w, H]];
  const P = (u, y, t) => axis === "x" ? [t, y, c + u] : [c + u, y, t];
  for (let k = 0; k < prof.length - 1; k++) {
    const [u0, y0] = prof[k], [u1, y1] = prof[k + 1], mu = (u0 + u1) / 2, my = (y0 + y1) / 2, n = axis === "x" ? [0, my - cy, mu] : [mu, my - cy, 0];
    face(ctx, P(u0, y0, a), P(u1, y1, a), P(u1, y1, b), P(u0, y0, b), n);
  }
}
export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  ctx.smooth(); ctx.metalness(0);

  // downstand beams on the pillar grid: a structural ceiling instead of a flat slab
  // (Shelly: "the ceiling is blocky too"): each beam is cast in board formwork, its bottom arrises chamfered, rust-brown drip stains under it
  ctx.albedo("cdn/texture-board-formed-cast-concrete-beam-wood-grain-imprint.png"); ctx.color("oklch(0.8 0.008 250)"); ctx.roughness(0.9);
  for (let j = 2; j < N; j += 2) for (const [a, b] of runs("x", j * S - HALF, -HALF, HALF)) beam(ctx, "x", j * S - HALF, a, b);
  for (let i = 2; i < N; i += 2) for (const [a, b] of runs("z", i * S - HALF, -HALF, HALF)) beam(ctx, "z", i * S - HALF, a, b);
  if (hi) { ctx.albedo(null); ctx.color("oklch(0.55 0.04 60)"); ctx.roughness(0.95); // seep stains on the beam soffits, where the slab above leaks
    for (let j = 2; j < N; j += 2) for (let i = 0; i < N; i++) if (hash(i, j, 77) < 0.3) { const x = i * S - HALF + hash(i, j, 78) * S, z = j * S - HALF, l = 0.4 + hash(i, j, 79) * 1.2; if (inHole(x, z)) continue; box(ctx, x - l / 2, x + l / 2, H - 0.623, H - 0.621, z - 0.14, z + 0.14); }
    ctx.albedo(null); }
  ctx.albedo(null);

  if (hi) {
    // red sprinkler mains along x, branches along z, heads and hangers
    ctx.color("oklch(0.5 0.2 28)"); ctx.roughness(0.45); ctx.metalness(0.4);
    for (let j = 1; j < N; j += 2) { const z = j * S - HALF + 1.9; for (const [a, b] of runs("x", z + 0.07, -HALF, HALF)) { tube(ctx, [[a, H - 0.66, z], [b, H - 0.66, z]], [0.042, 0.042], 10, [1, 1], 0, 1, 1); tube(ctx, [[a, H - 0.66, z + 0.14], [b, H - 0.66, z + 0.14]], [0.042, 0.042], 10, [1, 1], 0, 1, 1); } }
    for (let i = 1; i < N; i += 2) { const x = i * S - HALF - 1.5; for (const [a, b] of runs("z", x, -HALF, HALF)) tube(ctx, [[x, H - 0.62, a], [x, H - 0.62, b]], [0.035, 0.035], 10, [1, 1], 0, 1, 1); }
    // Nov 13 realism pass: a grooved coupling every 6 m and a clevis hanger (threaded rod, steel loop) every 3 m on each main, dull galvanised
    ctx.color("oklch(0.42 0.17 28)");
    for (let j = 1; j < N; j += 2) { const z = j * S - HALF + 1.9; for (const [a, b] of runs("x", z + 0.07, -HALF, HALF)) for (let x = a + 3; x < b - 0.5; x += 18) for (const dz of [0, 0.14]) tube(ctx, [[x - 0.035, H - 0.66, z + dz], [x + 0.035, H - 0.66, z + dz]], [0.056, 0.056], 10); }
    ctx.color("oklch(0.55 0.01 250)"); ctx.metalness(0.7); ctx.roughness(0.55);
    for (let j = 1; j < N; j += 2) { const z = j * S - HALF + 1.9; for (const [a, b] of runs("x", z + 0.07, -HALF, HALF)) for (let x = a + 1.5; x < b - 0.5; x += 9) { // one trapeze carries both mains
      if (inHole(x, z)) continue;
      box(ctx, x - 0.02, x + 0.02, H - 0.72, H - 0.7, z - 0.08, z + 0.22);
      for (const dz of [-0.07, 0.21]) box(ctx, x - 0.005, x + 0.005, H - 0.72, H, z + dz - 0.005, z + dz + 0.005);
    } }
    ctx.color("oklch(0.7 0.14 40)");
    for (let j = 1; j < N; j += 2) for (let i = 0; i < N; i += 2) { const x = i * S - HALF + 2, z = j * S - HALF + 1.9; if (inHole(x, z)) continue; } // Nov 13 (Shelly: "make whatever that is on the roof tripo"): the heads are Tripo sprinklers now (places/level1/sim.js l1Spr)
    ctx.color("oklch(0.45 0.02 250)");
    for (let j = 1; j < N; j += 2) for (let i = 0; i < N; i += 2) { const x = i * S - HALF + 5.6, z = j * S - HALF + 1.9; if (inHole(x, z)) continue; box(ctx, x - 0.012, x + 0.012, H - 0.62, H, z - 0.012, z + 0.012); }
    // orange cable trays and a white duct
    ctx.metalness(0.2); ctx.roughness(0.6); ctx.color("oklch(0.62 0.16 48)");
    // Nov 13 realism pass: an open ladder tray (two lipped rails, a rung every 30 cm, drop rods to the slab) with sagging black and grey cable bundles laid in it
    for (let i = 3; i < N; i += 6) { const x = i * S - HALF + 2.2, y0 = H - 0.82; for (const [a, b] of runs("z", x, -HALF, HALF)) {
      ctx.color("oklch(0.62 0.16 48)"); ctx.metalness(0.2); ctx.roughness(0.6);
      for (const sx of [-1, 1]) { const xo = x + sx * 0.205; box(ctx, xo - 0.006, xo + 0.006, y0, y0 + 0.1, a, b); box(ctx, xo - (sx > 0 ? 0.022 : 0), xo + (sx < 0 ? 0.022 : 0), y0 + 0.094, y0 + 0.1, a, b); box(ctx, xo - (sx > 0 ? 0.022 : 0), xo + (sx < 0 ? 0.022 : 0), y0, y0 + 0.006, a, b); }
      for (let z = a + 0.15; z < b; z += 1.2) box(ctx, x - 0.2, x + 0.2, y0, y0 + 0.018, z - 0.014, z + 0.014);
      ctx.color("oklch(0.5 0.01 250)"); ctx.metalness(0.7);
      for (let z = a + 1; z < b - 0.3; z += 4) for (const sx of [-1, 1]) tube(ctx, [[x + sx * 0.23, y0 - 0.02, z], [x + sx * 0.23, H, z]], [0.006, 0.006], 3);
      ctx.metalness(0); ctx.roughness(0.7);
      for (let k = 0; k < 3; k++) { const ox = x - 0.11 + k * 0.11 + (hash(i, k, 61) - 0.5) * 0.02, r = 0.012 + hash(i, k, 62) * 0.012; ctx.color(k % 2 ? "oklch(0.22 0.005 250)" : "oklch(0.45 0.01 250)");
        const pts = []; for (let z = a; z <= b + 0.01; z += 3) pts.push([ox + Math.sin(z * 0.7 + k) * 0.01, y0 + 0.018 + r + Math.abs(Math.sin(z * 0.9 + k * 1.3)) * 0.012, Math.min(z, b)]);
        tube(ctx, pts, [r, r], 4); }
    } }
    ctx.metalness(0.4); ctx.color("oklch(0.82 0.005 250)");
    // a round spiral duct (it was a square box, Shelly Nov 11: less blocky): galvanised, a joint ring and a hanger strap every 3 m
    for (let j = 5; j < N; j += 10) { const z = j * S - HALF + 3, y = H - 1.0, r = 0.22; for (const [a, b] of runs("x", z, -HALF, HALF)) {
      tube(ctx, [[a, y, z], [b, y, z]], [r, r], hi ? 16 : 8);
      if (!hi) continue;
      for (let x = a + 1.5; x < b - 0.5; x += 3) { tube(ctx, [[x - 0.03, y, z], [x + 0.03, y, z]], [r + 0.018, r + 0.018], 16); box(ctx, x - 0.02, x + 0.02, y + r, H, z - 0.012, z + 0.012); }
    } }
    ctx.metalness(0);
  }

  // floor: the paint, tracks and wet sheen live in level1-geo.js now (the old opaque black blots and white dust patches read as holes and paper)

  // glaring strip lights set into the outer walls, and a few hose-reel cabinets on pillars
  ctx.roughness(0.4);
  ctx.color("oklch(0.98 0.01 220)"); ctx.emissive("oklch(0.97 0.02 220)");
  for (let k = 3; k < N; k += 4) {
    const t = k * S - HALF + 3;
    box(ctx, -HALF + 0.12, -HALF + 0.2, 1.0, 3.0, t - 0.14, t + 0.14); box(ctx, HALF - 0.2, HALF - 0.12, 1.0, 3.0, t - 0.14, t + 0.14);
    box(ctx, t - 0.14, t + 0.14, 1.0, 3.0, -HALF + 0.12, -HALF + 0.2); box(ctx, t - 0.14, t + 0.14, 1.0, 3.0, HALF - 0.2, HALF - 0.12);
  }
  ctx.emissive(null);
  const kit = !!ctx.params?.tripo; // hose reels, cement and rebar are real models laid by places/level1/sim.js
  if (hi && !kit) for (let i = 2; i < N; i += 4) for (let j = 2; j < N; j += 4) {
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
    if (kit && r < 0.1) continue;
    if (r < 0.06) { ctx.color("oklch(0.88 0.015 85)"); for (let q = 0; q < 3; q++) box(ctx, x + q * 0.1 - 0.3, x + q * 0.1 + 0.3, 0.02 + q * 0.16, 0.16 + q * 0.16, z - 0.2 + q * 0.06, z + 0.2 + q * 0.06); }
    else if (r < 0.1) { ctx.color("oklch(0.42 0.05 40)"); ctx.metalness(0.6); for (let q = 0; q < 5; q++) box(ctx, x - 0.9, x + 0.9, 0.02 + (q % 2) * 0.04, 0.05 + (q % 2) * 0.04, z + q * 0.05, z + q * 0.05 + 0.03); ctx.metalness(0); }
    else if (hi && r < 0.15) { ctx.color("oklch(0.18 0.01 250)"); tube(ctx, [[x - 1, 0.02, z], [x - 0.4, 0.02, z + 0.5], [x + 0.2, 0.02, z - 0.3], [x + 1, 0.02, z + 0.2]], [0.02, 0.02, 0.02, 0.02], 5); }
  }
  ctx.color(null); ctx.roughness(null);
}
