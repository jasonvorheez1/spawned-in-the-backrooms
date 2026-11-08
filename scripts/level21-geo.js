// Level 2.1 "Locked": white painted block halls under a ceiling of beige conduit, orange wooden doors, EXIT signs, grimy floors, checkered tile in the locker rooms,
// and in the east The Edges: rock-cut tunnels under silver ducts, white block rooms down the south side, a cave mouth at the far wall. Layout: scripts/lib/level21.js.
import { N, S, H, HALF, isOpen, zoneOf, roomAt, hash, cellCenter, heightOf, isEdge, laneCell, DOWN, CAVE, LANE, EDGE_X } from "./lib/level21.js";
import { slab, tube, prism } from "./lib/shapes.js";

const FLOOR = "cdn/texture-grimy-wet-utility-concrete-floor.png", WALL = "cdn/texture-chalky-stained-concrete-wall.png", CEIL = "cdn/texture-dirty-concrete-ceiling-slab.png", RUSTY = "cdn/texture-scratched-worn-steel.png";
const T = 0.18; // half wall thickness: the walls of this level are thin
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const closed = (cx, cz, d) => !isOpen(cx, cz, d);
const TILED = new Set(["lockers", "restroom", "break", "base"]);

export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 6 : 4;
  // ---- floors and ceilings, a cell at a time: tiles in the locker rooms, carpet runners in some halls, poured concrete in The Edges
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF, z = zoneOf(cx, cz), h = heightOf(cx, cz), r = hash(cx, cz, 5);
    ctx.albedo(FLOOR);
    if (TILED.has(z)) { // black and grey vinyl, in 1 m squares like a school
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const a = x0 + i, b = z0 + j; ctx.color((i + j + cx + cz) % 2 ? "oklch(0.3 0.01 270)" : "oklch(0.78 0.01 250)"); ctx.quad(a, 0, b, a, 0, b + 1, a + 1, 0, b + 1, a + 1, 0, b); }
    } else if (z === "edge" || z === "edgecave") { ctx.color("oklch(0.74 0.035 105)"); ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0); }
    else if (z === "fridges") { ctx.color("oklch(0.86 0.01 95)"); ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0); }
    else { ctx.color(r < 0.18 ? "oklch(0.42 0.025 220)" : r < 0.3 ? "oklch(0.5 0.02 60)" : "oklch(0.6 0.012 80)"); ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0); } // a threadbare carpet, or bare grime
    ctx.albedo(CEIL); ctx.color(isEdge(cx, cz) ? "oklch(0.32 0.01 150)" : z === "fridges" || z === "restroom" ? "oklch(0.88 0.01 90)" : "oklch(0.78 0.012 85)");
    ctx.quad(x0, h, z0, x0 + S, h, z0, x0 + S, h, z0 + S, x0, h, z0 + S);
  }

  // ---- walls on every closed edge. Hall walls are painted block; The Edges are rock, except the white block rooms down the south side of the lane
  const wallH = (cx, cz, nx, nz) => Math.max(heightOf(cx, cz), heightOf(nx, nz));
  const rockWall = (xa, xb, za, zb, h, seed) => { // a stretch of raw rock: a few jittered prisms, some wider at the foot
    const along = Math.abs(xb - xa) > Math.abs(zb - za) ? "x" : "z", len = along === "x" ? Math.abs(xb - xa) : Math.abs(zb - za), n = Math.max(2, Math.round(len / 1.1));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n; if (along === "z" && Math.abs(xa - CAVE.x) < 0.01 && Math.abs(za + (zb - za) * (t0 + t1) / 2 - CAVE.z) < 1.6) continue; // the cave mouth is open
      const r1 = hash(seed + k, 1, 71), r2 = hash(seed + k, 2, 72), r3 = hash(seed + k, 3, 73), r4 = hash(seed + k, 4, 74);
      const A = (t, o) => along === "x" ? [xa + (xb - xa) * t, za + o] : [xa + o, za + (zb - za) * t];
      const th = 0.25 + r1 * 0.45; // how far the rock bulges either side of the plane
      const pts = [A(t0, -th * (0.6 + r2 * 0.6)), A((t0 + t1) / 2, -th * (0.8 + r3 * 0.9)), A(t1, -th * (0.6 + r4 * 0.6)), A(t1, th * (0.6 + r2 * 0.6)), A((t0 + t1) / 2, th * (0.8 + r4 * 0.9)), A(t0, th * (0.6 + r3 * 0.6))];
      prism(ctx, pts, 0, h * (0.82 + r1 * 0.18));
      if (r2 > 0.4) prism(ctx, pts.map(([x, z]) => [x + (hash(seed + k, 5, 75) - 0.5) * 0.3, z + (hash(seed + k, 6, 76) - 0.5) * 0.3]), h * 0.5, h); // an upper lip, so the roof line is never flat
    }
  };
  for (let cx = -1; cx < N; cx++) for (let cz = -1; cz < N; cz++) {
    for (const d of [0, 1]) { // the +x edge and the +z edge of this cell
      const nx = cx + (d === 0 ? 1 : 0), nz = cz + (d === 1 ? 1 : 0);
      if ((d === 0 && cz < 0) || (d === 1 && cx < 0)) continue;
      if (!(cx < 0 || cz < 0 || closed(cx, cz, d))) continue;
      if (cx < 0 && d === 1) continue;
      if (cz < 0 && d === 0) continue;
      const xe = (cx + 1) * S - HALF, ze = (cz + 1) * S - HALF, x0 = cx * S - HALF, z0 = cz * S - HALF;
      const rock = (isEdge(cx, cz) || isEdge(nx, nz)) && !(cz === LANE.z0 + LANE.d - 1 && d === 1 && cx >= 21) && !(cx === 20 && d === 0);
      const h = wallH(cx, cz, nx, nz);
      if (rock) { ctx.albedo(WALL); ctx.color("oklch(0.5 0.012 110)"); ctx.roughness(0.95); if (d === 0) rockWall(xe, xe, z0, z0 + S, h, cx * 131 + cz * 17 + 3); else rockWall(x0, x0 + S, ze, ze, h, cx * 91 + cz * 31 + 9); }
      else {
        ctx.albedo(WALL); ctx.color(isEdge(cx, cz) || isEdge(nx, nz) ? "oklch(0.93 0.008 95)" : "oklch(0.9 0.014 95)"); ctx.roughness(0.9);
        if (d === 0) box(ctx, xe - T, xe + T, 0, h, z0 - T, z0 + S + T); else box(ctx, x0 - T, x0 + S + T, 0, h, ze - T, ze + T);
      }
    }
  }
  // the world's edge: the stairwell door in the west wall, the cave mouth in the east wall
  ctx.albedo(RUSTY); ctx.color("oklch(0.45 0.01 250)"); ctx.metalness(0.4); box(ctx, DOWN.x + T, DOWN.x + T + 0.06, 0, 2.4, DOWN.z - 0.8, DOWN.z + 0.8);
  ctx.color("oklch(0.4 0.02 140)"); box(ctx, DOWN.x + T, DOWN.x + T + 0.1, 0, 2.25, DOWN.z - 0.68, DOWN.z + 0.68); ctx.metalness(0);
  ctx.albedo(null); ctx.color("oklch(0.01 0 0)"); box(ctx, CAVE.x - 0.1, CAVE.x + 0.3, 0, 3.4, CAVE.z - 1.7, CAVE.z + 1.7); // the dark of the cave

  // ---- the ceiling: bundles of beige conduit down every hall, a cable tray, and big silver ducts over The Edges
  const run = (c, d, y, off, r) => { const a = d === 0 ? [[c.x, y, c.z + off], [c.x + S, y, c.z + off]] : [[c.x + off, y, c.z], [c.x + off, y, c.z + S]]; tube(ctx, a, [r, r], M, [1, 1], 0, 1, 1); };
  ctx.albedo(null); ctx.metalness(0.2); ctx.roughness(0.7);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz), c = cellCenter(cx, cz), h = heightOf(cx, cz);
    if (z === "fridges" || z === "restroom" || z === "landing") continue;
    if (isEdge(cx, cz)) {
      if (!isOpen(cx, cz, 0)) continue;
      ctx.color("oklch(0.7 0.01 230)"); ctx.metalness(0.7); ctx.roughness(0.4);
      if (laneCell(cx, cz) && cz === LANE.z0 + LANE.d - 1) { run(c, 0, h - 0.9, 1.2, 0.5); run(c, 0, h - 0.5, 0.2, 0.28); }
      ctx.color("oklch(0.4 0.01 250)"); box(ctx, c.x, c.x + S, h - 0.12, h - 0.06, c.z + 0.55, c.z + 1.0); ctx.metalness(0.2); ctx.roughness(0.7);
      continue;
    }
    for (const d of [0, 1]) if (isOpen(cx, cz, d)) for (let k = 0; k < 5; k++) {
      ctx.color(["oklch(0.68 0.04 80)", "oklch(0.64 0.05 70)", "oklch(0.72 0.03 85)"][(k + cx) % 3]);
      run(c, d, h - 0.14 - (k % 2) * 0.06, (k - 2) * 0.17, 0.07);
    }
    if (hash(cx, cz, 15) < 0.14) { ctx.color("oklch(0.45 0.18 28)"); const d = isOpen(cx, cz, 0) ? 0 : 1; run(c, d, h - 0.32, 1.1, 0.1); } // a red sprinkler main
  }

  // ---- doors: closed wooden doors in the hall walls (orange), the occasional frame with the leaf standing open; EXIT signs over some
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz); if (z !== "hall" && z !== "base") continue; const c = cellCenter(cx, cz);
    for (const d of [0, 1, 2, 3]) {
      if (!closed(cx, cz, d) || hash(cx * 4 + d, cz, 51) > 0.16) continue;
      const [nx, nz] = [[1, 0], [0, 1], [-1, 0], [0, -1]][d], tx = -nz, tz = nx, w = S / 2 - T, fx = c.x + nx * w, fz = c.z + nz * w;
      const plate = (a, b, y0, y1, out, color) => { ctx.color(color); const p = [fx + tx * a - nx * out, fz + tz * a - nz * out], q = [fx + tx * b, fz + tz * b]; box(ctx, Math.min(p[0], q[0]), Math.max(p[0], q[0]), y0, y1, Math.min(p[1], q[1]), Math.max(p[1], q[1])); };
      ctx.albedo(null); ctx.roughness(0.7);
      plate(-0.55, 0.55, 0, 2.2, 0.04, "oklch(0.88 0.02 90)"); // the frame
      plate(-0.47, 0.47, 0, 2.12, 0.07, hash(cx, cz, 53) < 0.8 ? "oklch(0.62 0.13 58)" : "oklch(0.55 0.04 150)"); // the leaf: orange wood, now and then a green steel one
      plate(0.3, 0.4, 0.95, 1.02, 0.12, "oklch(0.7 0.01 250)"); // the lever
      if (hash(cx, cz, 57) < 0.5) plate(-0.2, 0.2, 1.4, 1.7, 0.08, "oklch(0.1 0.005 250)"); // a narrow window
    }
    if (hash(cx, cz, 61) < 0.07 && isOpen(cx, cz, 0) !== isOpen(cx, cz, 1)) { // an EXIT sign, red, over the way on
      const d = isOpen(cx, cz, 0) ? 0 : 1; ctx.albedo(null); ctx.color("oklch(0.55 0.25 28)"); ctx.emissive("oklch(0.6 0.26 28)");
      if (d === 0) box(ctx, c.x + 1.4 - 0.03, c.x + 1.4 + 0.03, 2.5, 2.75, c.z - 0.25, c.z + 0.25); else box(ctx, c.x - 0.25, c.x + 0.25, 2.5, 2.75, c.z + 1.4 - 0.03, c.z + 1.4 + 0.03);
      ctx.emissive(null);
    }
  }
  // the lane's green exit signs, down the roof of The Edges
  for (let cx = EDGE_X + 1; cx < N; cx += 3) { const c = cellCenter(cx, LANE.z0 + LANE.d - 1); ctx.albedo(null); ctx.color("oklch(0.7 0.25 150)"); ctx.emissive("oklch(0.7 0.25 150)"); box(ctx, c.x - 0.22, c.x + 0.22, 3.4, 3.58, c.z + 1.4, c.z + 1.46); ctx.emissive(null); }
  // windows and doors in the white block rooms along the lane's south wall
  for (let cx = EDGE_X + 1; cx < N - 1; cx++) { const c = cellCenter(cx, LANE.z0 + LANE.d - 1), zf = c.z + S / 2 - T - 0.03;
    ctx.albedo(null); ctx.color("oklch(0.12 0.01 230)"); ctx.roughness(0.2); if (cx % 3 === 0) box(ctx, c.x - 0.9, c.x + 0.9, 1.2, 2.0, zf - 0.02, zf); else if (cx % 3 === 1) { ctx.color("oklch(0.55 0.02 200)"); ctx.roughness(0.6); box(ctx, c.x - 0.5, c.x + 0.5, 0, 2.2, zf - 0.04, zf); } }
  // the dark mouth of the cave: a crack in the rock the lane runs into, edged with wet-looking stones
  ctx.albedo(WALL); ctx.color("oklch(0.42 0.012 110)");
  for (let k = 0; k < 7; k++) { const a = hash(k, 3, 91) * 0.5, b = k < 3 ? -1.4 - a : 1.4 + a, y1 = 1.2 + hash(k, 4, 92) * 2.6; prism(ctx, [[CAVE.x - 0.9, CAVE.z + b - 0.3], [CAVE.x + 0.1, CAVE.z + b - 0.3], [CAVE.x + 0.1, CAVE.z + b + 0.3], [CAVE.x - 0.9, CAVE.z + b + 0.3]], 0, y1); }
  ctx.albedo(null); ctx.color(null); ctx.metalness(0); ctx.roughness(0.85);
}
