// Level 1's upper deck: a second parking floor over the hall band (Shelly's reference: wet garage, a ramp wall, daylight blown out at the open sides).
// Slab on the ground floor's ceiling, chamfered columns, puddles that hold the light, a low parapet on the long sides with glare beyond,
// solid ends, curbed holes where the two ramps come up, and the ramps themselves. Layout: scripts/lib/level1.js (DECK, RAMPS).
import { N, S, H, HALF, hasPillar, sectorOf, hash, DECK, RAMPS, rampCell, rampBox } from "./lib/level1.js";
import { slab, prism, tube, face } from "./lib/shapes.js";

const FLOOR = "cdn/texture-wet-sealed-parking-garage-concrete-floor-tire-scuffs-oil-stains-hairline-cracks.png", STALL = "cdn/texture-worn-chipped-white-road-line-paint-on-concrete.png";
const WALL = "cdn/texture-discolored-poured-concrete-wall-water-stains.png", CEIL = "cdn/texture-concrete-ceiling-panels.png", PILLAR = "cdn/texture-painted-concrete-column-scuffed.png";
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
const chamf = (x, z, r, c) => [[x - r + c, z - r], [x + r - c, z - r], [x + r, z - r + c], [x + r, z + r - c], [x + r - c, z + r], [x - r + c, z + r], [x - r, z + r - c], [x - r, z - r + c]];
const X0 = DECK.cx0 * S - HALF, X1 = (DECK.cx1 + 1) * S - HALF, Z0 = DECK.cz0 * S - HALF, Z1 = (DECK.cz1 + 1) * S - HALF, Y = DECK.y, TOP = DECK.y + DECK.h;

// a puddle: an irregular disc a hair over the floor, dark and glassy so the tubes stretch across it
export function puddle(ctx, x, y, z, r, seed) {
  const n = 11, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.55 + hash(seed, i, 7) * 0.6; pts.push([x + Math.cos(a) * r * k * (1 + hash(seed, 1, 3) * 0.8), z + Math.sin(a) * r * k]); }
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.tri(x, y, z, q[0], y, q[1], p[0], y, p[1]); }
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  // the slab: top at Y, its fascia where it meets the ramp holes; the underside is the ground floor's ceiling
  ctx.albedo(FLOOR);
  for (let cx = DECK.cx0; cx <= DECK.cx1; cx++) for (let cz = DECK.cz0; cz <= DECK.cz1; cz++) {
    if (rampCell(cx, cz)) continue;
    const x0 = cx * S - HALF, z0 = cz * S - HALF;
    ctx.color(hash(cx, cz, 403) < 0.25 ? "oklch(0.7 0.008 240)" : hash(cx, cz, 404) < 0.5 ? "oklch(0.8 0.007 85)" : "oklch(0.86 0.005 240)");
    ctx.roughness(hash(cx, cz, 405) < 0.45 ? 0.14 : 0.42);
    ctx.quad(x0, Y, z0, x0, Y, z0 + S, x0 + S, Y, z0 + S, x0 + S, Y, z0);
  }
  ctx.albedo(WALL); ctx.color("oklch(0.72 0.01 250)"); ctx.roughness(0.9);
  for (const r of RAMPS) { const b = rampBox(r); box(ctx, b.x0, b.x1, H, Y, b.z0 - 0.02, b.z0); box(ctx, b.x0, b.x1, H, Y, b.z1, b.z1 + 0.02); const xe = b.xl; box(ctx, xe - 0.02, xe + 0.02, H, Y, b.z0, b.z1); }
  // stall lines in pairs of bays, the drive lane down the middle of the band, a yellow lane edge
  if (hi) {
    ctx.albedo(STALL); ctx.roughness(0.6);
    for (let cx = DECK.cx0; cx <= DECK.cx1; cx++) for (const cz of [DECK.cz0, DECK.cz1]) {
      if (rampCell(cx, cz)) continue;
      const x0 = cx * S - HALF, z0 = cz * S - HALF, out = cz === DECK.cz0; // bays nose into the parapet on both long sides
      ctx.color(hash(cx, cz, 411) < 0.3 ? "oklch(0.8 0.01 90)" : "oklch(0.95 0.006 90)");
      for (let k = 0; k <= 3; k++) { const t = x0 + (k / 3) * S; const za = out ? z0 + 0.4 : z0 + S - 5.4, zb = za + 5;
        ctx.quad(t - 0.06, Y + 0.004, za, t - 0.06, Y + 0.004, zb, t + 0.06, Y + 0.004, zb, t + 0.06, Y + 0.004, za); }
    }
    ctx.color("oklch(0.78 0.15 90)");
    const zm = (Z0 + Z1) / 2;
    for (const off of [-3.2, 3.2]) { const z = zm + off; for (let x = X0 + 1; x < X1 - 1; x += 3) { if (RAMPS.some((r) => { const b = rampBox(r); return x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 && z < b.z1; })) continue; ctx.quad(x, Y + 0.004, z + 0.07, x + 1.8, Y + 0.004, z + 0.07, x + 1.8, Y + 0.004, z - 0.07, x, Y + 0.004, z - 0.07); } }
    // big painted level number on the floor at each ramp head: "P2"
    ctx.color("oklch(0.93 0.006 90)");
    for (const r of RAMPS) { const b = rampBox(r), x = b.xh + r.dir * 2.2, z = (b.za + b.zb) / 2, s = 0.9;
      const bar = (ax, az, bx, bz) => ctx.quad(x + ax * s, Y + 0.005, z + az * s, x + ax * s, Y + 0.005, z + bz * s, x + bx * s, Y + 0.005, z + bz * s, x + bx * s, Y + 0.005, z + az * s);
      // P
      bar(-1.6, -1, -1.35, 1); bar(-1.6, -1, -0.6, -0.78); bar(-1.6, -0.12, -0.6, 0.1); bar(-0.82, -1, -0.6, 0.1);
      // 2
      bar(0.2, -1, 1.2, -0.78); bar(0.98, -1, 1.2, 0.1); bar(0.2, -0.12, 1.2, 0.1); bar(0.2, -0.12, 0.42, 1); bar(0.2, 0.78, 1.2, 1);
    }
  }
  // puddles where the deck sags: dark glassy water catching the tubes
  ctx.albedo(null); ctx.metalness(0); ctx.roughness(0.03); ctx.color("oklch(0.3 0.01 240 / 0.9)");
  for (let cx = DECK.cx0; cx <= DECK.cx1; cx++) for (let cz = DECK.cz0; cz <= DECK.cz1; cz++) {
    if (rampCell(cx, cz) || hash(cx, cz, 421) > 0.55) continue;
    const x0 = cx * S - HALF, z0 = cz * S - HALF;
    for (let k = 0; k < 1 + Math.floor(hash(cx, cz, 422) * 3); k++) puddle(ctx, x0 + 1.5 + hash(cx, cz, 430 + k) * 5, Y + 0.006, z0 + 1.5 + hash(cx, cz, 440 + k) * 5, 0.6 + hash(cx, cz, 450 + k) * 1.6, cx * 97 + cz * 13 + k);
  }
  // columns on the ground floor's grid, the sector band, a tarred plinth, a big stencilled "2"-band in white above it
  for (let i = DECK.cx0; i <= DECK.cx1 + 1; i++) for (let j = DECK.cz0; j <= DECK.cz1 + 1; j++) {
    if (!hasPillar(i, j)) continue;
    const x = i * S - HALF, z = j * S - HALF, r = 0.45, c = hi ? 0.035 : 0;
    ctx.albedo(PILLAR); ctx.roughness(0.92); ctx.color("oklch(0.95 0.006 250)");
    prism(ctx, chamf(x, z, r, c), Y + 0.14, Y + 1.4); prism(ctx, chamf(x, z, r, c), Y + 1.75, TOP);
    ctx.albedo(null); ctx.roughness(0.7); ctx.color(sectorOf(Math.min(N - 1, i), Math.min(N - 1, j)).band); prism(ctx, chamf(x, z, r + 0.004, c), Y + 1.4, Y + 1.75);
    ctx.color("oklch(0.42 0.01 250)"); ctx.roughness(0.85); prism(ctx, chamf(x, z, r + 0.03, c + 0.02), Y, Y + 0.14);
    // corner guards: a Tripo model per column (places/level1/sim.js, l1-dg-*)
  }
  // ceiling with its downstand beams on the column lines, and the white service pipes
  ctx.albedo(CEIL); ctx.color("oklch(0.88 0.004 250)"); ctx.roughness(0.95);
  ctx.quad(X0, TOP, Z0 - 2, X1, TOP, Z0 - 2, X1, TOP, Z1 + 2, X0, TOP, Z1 + 2);
  ctx.albedo(WALL); ctx.color("oklch(0.8 0.006 250)");
  for (let i = DECK.cx0; i <= DECK.cx1 + 1; i++) { const x = i * S - HALF; box(ctx, x - 0.3, x + 0.3, TOP - 0.55, TOP, Z0 - 2, Z1 + 2); }
  for (let j = DECK.cz0; j <= DECK.cz1 + 1; j++) { const z = j * S - HALF; box(ctx, X0, X1, TOP - 0.4, TOP, z - 0.25, z + 0.25); }
  if (hi) { ctx.albedo(null); ctx.color("oklch(0.9 0.004 250)"); ctx.metalness(0.2); ctx.roughness(0.4);
    for (const z of [Z0 + 3.1, Z1 - 3.1]) for (const dz of [0, 0.24]) tube(ctx, [[X0, TOP - 0.75, z + dz], [X1, TOP - 0.75, z + dz]], [dz ? 0.045 : 0.075, dz ? 0.045 : 0.075], 10, [1, 1], 0, 1, 1);
    ctx.color("oklch(0.55 0.16 28)"); tube(ctx, [[X0, TOP - 0.62, (Z0 + Z1) / 2 + 1.3], [X1, TOP - 0.62, (Z0 + Z1) / 2 + 1.3]], [0.06, 0.06], 10, [1, 1], 0, 1, 1); // red sprinkler main
    ctx.metalness(0); }
  // long sides: a low cast parapet, then the open slot to a white blown-out day; the ends are solid stained walls
  ctx.albedo(WALL); ctx.roughness(0.9);
  for (const [z, out] of [[Z0, -1], [Z1, 1]]) {
    ctx.color("oklch(0.74 0.012 80)"); box(ctx, X0, X1, Y, Y + 1.05, z - 0.12 * (out < 0 ? 1 : 0) - (out > 0 ? 0 : 0.12), z + (out > 0 ? 0.24 : 0.12));
    ctx.color("oklch(0.6 0.012 80)"); box(ctx, X0, X1, Y + 1.05, Y + 1.12, z - 0.16, z + 0.28); // its coping, a shade darker
    ctx.color("oklch(0.7 0.01 250)"); box(ctx, X0, X1, TOP - 0.7, TOP, z - 0.12, z + 0.12); // the downstand over the slot
    ctx.albedo(null); ctx.color("oklch(0.98 0.01 95)"); ctx.emissive("oklch(0.97 0.02 95)"); // the day outside, too bright to see into
    box(ctx, X0, X1, H, TOP + 0.6, z + out * 2.5, z + out * 2.55); ctx.emissive(null); ctx.albedo(WALL);
    ctx.color("oklch(0.66 0.01 250)"); box(ctx, X0, X1, H, Y, z + Math.min(0, out * 2.5), z + Math.max(0, out * 2.5)); // the ledge out to it
    for (let i = DECK.cx0; i <= DECK.cx1 + 1; i++) { const x = i * S - HALF; box(ctx, x - 0.22, x + 0.22, Y, TOP, z + Math.min(0, out * 2.5), z + Math.max(0, out * 2.5)); } // mullion fins: the glare comes through in bars
  }
  ctx.color("oklch(0.7 0.014 75)");
  for (const x of [X0, X1]) { box(ctx, x - 0.15, x + 0.15, Y, TOP, Z0 - 2.5, Z1 + 2.5); }
  // ramp holes: a curb and a pipe rail on the three sides you could fall from
  for (const r of RAMPS) { const b = rampBox(r);
    ctx.albedo(WALL); ctx.color("oklch(0.74 0.012 80)");
    box(ctx, b.x0, b.x1, Y, Y + 0.25, b.z0 - 0.14, b.z0); box(ctx, b.x0, b.x1, Y, Y + 0.25, b.z1, b.z1 + 0.14); box(ctx, b.xl - 0.07, b.xl + 0.07, Y, Y + 0.25, b.z0, b.z1); // a 25 cm curb; the Tripo guard rails stand on it (l1-dr-*)
  }
  // the ramps: a solid poured wedge, ground to deck, curbed both sides with a rail, yellow chevrons at the foot
  for (const r of RAMPS) { const b = rampBox(r), dir = r.dir;
    ctx.albedo(FLOOR); ctx.color("oklch(0.8 0.007 85)"); ctx.roughness(0.35);
    face(ctx, [b.xl, 0.002, b.za], [b.xh, Y, b.za], [b.xh, Y, b.zb], [b.xl, 0.002, b.zb], [0, 1, 0]);
    ctx.albedo(WALL); ctx.color("oklch(0.72 0.012 80)"); ctx.roughness(0.9);
    const L = Math.abs(b.xh - b.xl), yAt = (x) => (Math.abs(x - b.xl) / L) * Y, xs = (t) => b.xl + dir * t; // height along the slope
    for (const [z, n] of [[b.za, -1], [b.zb, 1]]) { // the wedge's flank, and a curb with a bevelled lip (Shelly: "improve the ramps to be less blocky")
      const zo = z + n * 0.22, zc = z + n * 0.05;
      face(ctx, [b.xl, 0, zo], [b.xh, 0, zo], [b.xh, Y + 0.2, zo], [b.xl, 0.2, zo], [0, 0, n]);
      face(ctx, [b.xl, 0.002, z], [b.xh, Y, z], [b.xh, Y + 0.19, z], [b.xl, 0.19, z], [0, 0, -n]); // inner face
      face(ctx, [b.xl, 0.19, z], [b.xh, Y + 0.19, z], [b.xh, Y + 0.25, zc], [b.xl, 0.25, zc], [0, 0.7, -n * 0.7]); // the bevel
      face(ctx, [b.xl, 0.25, zc], [b.xh, Y + 0.25, zc], [b.xh, Y + 0.25, zo - n * 0.03], [b.xl, 0.25, zo - n * 0.03], [0, 1, 0]);
      face(ctx, [b.xl, 0.25, zo - n * 0.03], [b.xh, Y + 0.25, zo - n * 0.03], [b.xh, Y + 0.2, zo], [b.xl, 0.2, zo], [0, 0.7, n * 0.7]); // outer round-over
      face(ctx, [b.xl, 0, z], [b.xh, 0, z], [b.xh, Y, z], [b.xh, Y, z], [0, 0, n]);
      if (hi) { ctx.color("oklch(0.6 0.012 80)"); // pour joints down the flank every 4 m, a dark weep stain under each
        for (let t = 4; t < L - 0.5; t += 4) { const x = xs(t), y = yAt(x); face(ctx, [x - 0.02, 0.05, zo + n * 0.004], [x + 0.02, 0.05, zo + n * 0.004], [x + 0.02, y + 0.15, zo + n * 0.004], [x - 0.02, y + 0.15, zo + n * 0.004], [0, 0, n]); }
        ctx.color("oklch(0.72 0.012 80)"); }
    }
    face(ctx, [b.xh, 0, b.za - 0.22], [b.xh, 0, b.zb + 0.22], [b.xh, Y, b.zb + 0.22], [b.xh, Y, b.za - 0.22], [dir, 0, 0]); // its tall end, under the deck
    if (hi) { // anti-slip grooves across the slope, an expansion joint at mid-run, steel plates at the foot and the top, a trench drain at the foot
      ctx.albedo(null); ctx.color("oklch(0.42 0.008 80)"); ctx.roughness(0.95);
      for (let t = 1.2; t < L - 0.9; t += 0.45) { const x0 = xs(t), x1 = xs(t + 0.07), y0 = yAt(x0) + 0.006, y1 = yAt(x1) + 0.006; face(ctx, [x0, y0, b.za + 0.12], [x1, y1, b.za + 0.12], [x1, y1, b.zb - 0.12], [x0, y0, b.zb - 0.12], [0, 1, 0]); }
      ctx.color("oklch(0.18 0.01 80)"); { const x0 = xs(L / 2 - 0.03), x1 = xs(L / 2 + 0.03); face(ctx, [x0, yAt(x0) + 0.008, b.za], [x1, yAt(x1) + 0.008, b.za], [x1, yAt(x1) + 0.008, b.zb], [x0, yAt(x0) + 0.008, b.zb], [0, 1, 0]); }
      ctx.color("oklch(0.5 0.01 240)"); ctx.metalness(0.8); ctx.roughness(0.45);
      for (const [t0, t1] of [[0, 0.5], [L - 0.5, L]]) { const x0 = xs(t0), x1 = xs(t1); face(ctx, [x0, yAt(x0) + 0.012, b.za], [x1, yAt(x1) + 0.012, b.za], [x1, yAt(x1) + 0.012, b.zb], [x0, yAt(x0) + 0.012, b.zb], [0, 1, 0]); }
      ctx.color("oklch(0.12 0.005 240)"); const xd = b.xl - dir * 0.6; // the drain: a dark slot with cast bars across it
      face(ctx, [xd - 0.18, 0.01, b.za], [xd + 0.18, 0.01, b.za], [xd + 0.18, 0.01, b.zb], [xd - 0.18, 0.01, b.zb], [0, 1, 0]);
      ctx.color("oklch(0.32 0.01 240)"); for (let z = b.za + 0.1; z < b.zb; z += 0.16) box(ctx, xd - 0.18, xd + 0.18, 0.01, 0.025, z, z + 0.05);
      ctx.metalness(0);
    }
    ctx.albedo(null); ctx.color("oklch(0.8 0.16 90)"); ctx.metalness(0.3); ctx.roughness(0.5);
    for (const [z, n] of [[b.za - 0.11, -1], [b.zb + 0.11, 1]]) { // a double pipe rail on posts, its ends bent down into the curb
      const e0 = xs(-0.25), e1 = xs(L + 0.25);
      tube(ctx, [[xs(0.3), 0.25, z], [xs(0.3), 1.0, z], [xs(0.55), 1.12, z], [xs(L - 0.4), Y + 1.12, z]], [0.035, 0.035, 0.035, 0.035], 8, [1, 1], 0, 1, 1);
      tube(ctx, [[xs(0.6), 0.6, z], [xs(L - 0.4), Y + 0.6, z]], [0.028, 0.028], 8, [1, 1], 0, 1, 1);
      for (let t = 2; t < L - 0.6; t += 2) { const x = xs(t), y = yAt(x); tube(ctx, [[x, y + 0.25, z], [x, y + 1.14, z]], [0.03, 0.03], 8, [1, 1], 0, 1, 1); }
      if (hi) { ctx.color("oklch(0.25 0.01 240)"); for (let t = 2; t < L - 0.6; t += 2) { const x = xs(t), y = yAt(x); box(ctx, x - 0.07, x + 0.07, y + 0.25, y + 0.27, z - 0.07, z + 0.07); } ctx.color("oklch(0.8 0.16 90)"); } // base plates
      void e0; void e1;
    }
    ctx.metalness(0); ctx.roughness(0.6);
    if (hi) { ctx.color("oklch(0.8 0.15 88)"); const m = (b.za + b.zb) / 2; // chevrons at the foot, pointing up the slope
      for (let k = 0; k < 3; k++) { const x = b.xl + dir * (0.8 + k * 1.1), yy = (Math.abs(x - b.xl) / (2 * S)) * Y + 0.01, t = dir * 0.5;
        ctx.quad(x, yy, m - 2.2, x + t, yy + 0.15, m, x + t + dir * 0.3, yy + 0.16, m, x + dir * 0.3, yy, m - 2.2);
        ctx.quad(x + dir * 0.3, yy, m + 2.2, x + t + dir * 0.3, yy + 0.16, m, x + t, yy + 0.15, m, x, yy, m + 2.2); } }
  }
  ctx.color(null); ctx.roughness(null); ctx.albedo(null);
}
