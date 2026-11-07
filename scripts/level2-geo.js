// Level 2 "Abandoned Utility Halls": chalky concrete tunnels with 45 degree corners, banks of pipe along the walls
// that bend out of the concrete and back in, dead machines in the dead ends, locked steel doors, barrels and
// trolleys in the warehouse rooms, the Survivors' corner by the door home. Layout: scripts/lib/level2.js.
import { N, S, H, HALF, isOpen, openings, zoneOf, roomOf, hash, cellCenter, ARRIVE, BACK, SEALED } from "./lib/level2.js";
import { slab, tube, prism } from "./lib/shapes.js";

const FLOOR = "cdn/texture-grimy-wet-utility-concrete-floor.png", WALL = "cdn/texture-chalky-stained-concrete-wall.png";
const BRICK = "cdn/texture-soot-dark-brown-industrial-brick.png", CEIL = "cdn/texture-dirty-concrete-ceiling-slab.png", RUSTY = "cdn/texture-scratched-worn-steel.png";
const T = 0.4, CH = 1.0; // half wall thickness, 45 degree corner leg
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const closed = (cx, cz, d) => !isOpen(cx, cz, d);

export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 10 : 6;
  // floor and ceiling, one quad a cell, tinted by zone
  ctx.albedo(FLOOR);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF, z = zoneOf(cx, cz);
    ctx.color(z === "camp" ? "oklch(0.72 0.02 70)" : z === "room" ? "oklch(0.66 0.012 80)" : hash(cx, cz, 5) < 0.2 ? "oklch(0.5 0.02 60)" : "oklch(0.6 0.012 70)");
    ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0);
  }
  ctx.albedo(CEIL); ctx.color("oklch(0.55 0.01 70)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) { const x0 = cx * S - HALF, z0 = cz * S - HALF; ctx.quad(x0, H, z0, x0 + S, H, z0, x0 + S, H, z0 + S, x0, H, z0 + S); }

  // walls on every closed edge; brick in some sectors, chalky concrete elsewhere
  const wallTone = (cx, cz) => hash(Math.floor(cx / 3), Math.floor(cz / 3), 21) < 0.3;
  for (const brick of [false, true]) {
    ctx.albedo(brick ? BRICK : WALL); ctx.color(brick ? "oklch(0.62 0.04 45)" : "oklch(0.78 0.012 85)");
    for (let cx = -1; cx < N; cx++) for (let cz = -1; cz < N; cz++) {
      if (wallTone(Math.max(cx, 0), Math.max(cz, 0)) !== brick) continue;
      const xe = (cx + 1) * S - HALF, ze = (cz + 1) * S - HALF;
      if (cz >= 0 && (cx < 0 ? true : closed(cx, cz, 0))) box(ctx, xe - T, xe + T, 0, H, cz * S - HALF - T, cz * S - HALF + S + T);
      if (cx >= 0 && (cz < 0 ? true : closed(cx, cz, 1))) box(ctx, cx * S - HALF - T, cx * S - HALF + S + T, 0, H, ze - T, ze + T);
    }
  }
  // 45 degree corners: wherever two walls of a cell meet, a diagonal face cuts the corner
  ctx.albedo(WALL); ctx.color("oklch(0.74 0.012 85)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) === "camp") continue;
    const x0 = cx * S - HALF + T, x1 = (cx + 1) * S - HALF - T, z0 = cz * S - HALF + T, z1 = (cz + 1) * S - HALF - T;
    for (const [dx, dz, X, Z, sx, sz] of [[0, 1, x1, z1, -1, -1], [0, 3, x1, z0, -1, 1], [2, 1, x0, z1, 1, -1], [2, 3, x0, z0, 1, 1]])
      if (closed(cx, cz, dx) && closed(cx, cz, dz)) prism(ctx, [[X, Z], [X + sx * CH, Z], [X, Z + sz * CH]], 0, H);
  }

  // pipes along the tunnel walls: each comes out of the concrete, runs the cell and goes back in
  const pipe = (cx, cz, d, k) => {
    const c = cellCenter(cx, cz), half = S / 2 - T, off = 0.18 + k * 0.05, y = [2.55, 2.2, 0.45][k], r = [0.11, 0.07, 0.15][k];
    const [nx, nz] = [[1, 0], [0, 1], [-1, 0], [0, -1]][d], tx = -nz, tz = nx, wx = c.x + nx * half, wz = c.z + nz * half;
    const P = (along, out) => [wx + tx * along - nx * out, y, wz + tz * along - nz * out];
    const L = half - CH * 0.2;
    tube(ctx, [P(-L - 0.3, -0.2), P(-L, off * 0.5), P(-L + 0.3, off), P(L - 0.3, off), P(L, off * 0.5), P(L + 0.3, -0.2)], [r, r, r, r, r, r], M, [1, 1], 0, 1, 1);
    if (k === 0) for (const a of [-L * 0.5, L * 0.5]) box(ctx, ...[P(a, 0)[0] - 0.04, P(a, 0)[0] + 0.04].sort((p, q) => p - q), y - 0.16, y + 0.03, ...[P(a, 0)[2] - 0.04, P(a, off + 0.05)[2] + 0.04].sort((p, q) => p - q)); // bracket
  };
  const PIPE = ["oklch(0.62 0.03 150)", "oklch(0.5 0.07 40)", "oklch(0.72 0.01 250)"];
  ctx.albedo(RUSTY);
  for (let k = 0; k < 3; k++) {
    ctx.color(PIPE[k]); ctx.metalness(0.45); ctx.roughness(0.7);
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const z = zoneOf(cx, cz); if (z === "camp" || z === "room") continue;
      for (const d of [0, 1, 2, 3]) if (closed(cx, cz, d) && hash(cx * 4 + d, cz, 31 + k) < [0.75, 0.55, 0.4][k]) pipe(cx, cz, d, k);
    }
  }
  // a cable tray down the middle of every tunnel ceiling
  ctx.albedo(null); ctx.color("oklch(0.35 0.01 250)"); ctx.metalness(0.6); ctx.roughness(0.5);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) === "camp") continue; const c = cellCenter(cx, cz);
    if (isOpen(cx, cz, 0)) box(ctx, c.x, c.x + S, H - 0.12, H - 0.06, c.z - 0.15, c.z + 0.15);
    if (isOpen(cx, cz, 1)) box(ctx, c.x - 0.15, c.x + 0.15, H - 0.12, H - 0.06, c.z, c.z + S);
  }
  ctx.metalness(0);

  // dead machines in the dead ends, against the closed wall facing the way in
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const o = openings(cx, cz); if (o.length !== 1 || zoneOf(cx, cz) === "camp") continue;
    const back = (o[0] + 2) % 4, c = cellCenter(cx, cz), [nx, nz] = [[1, 0], [0, 1], [-1, 0], [0, -1]][back], tx = -nz, tz = nx;
    const w = S / 2 - T - 0.5, cxm = c.x + nx * w, czm = c.z + nz * w, kind = hash(cx, cz, 41);
    const along = 1.6 + kind * 0.8, deep = 0.9;
    ctx.albedo(RUSTY); ctx.color(kind < 0.5 ? "oklch(0.5 0.05 160)" : "oklch(0.6 0.02 80)"); ctx.metalness(0.5); ctx.roughness(0.6);
    box(ctx, cxm - (tx * along + nx * deep) / 2, cxm + (tx * along + nx * deep) / 2, 0, 1.9 + kind * 0.5, czm - (tz * along + nz * deep) / 2, czm + (tz * along + nz * deep) / 2);
    ctx.color("oklch(0.25 0.01 250)");
    for (let i = 0; i < 5; i++) { const fx = cxm - nx * (deep / 2 + 0.01), fz = czm - nz * (deep / 2 + 0.01); box(ctx, fx - tx * 0.4 - nx * 0.02, fx + tx * 0.4, 1.2 + i * 0.1, 1.23 + i * 0.1, fz - tz * 0.4 - nz * 0.02, fz + tz * 0.4); } // vents
    ctx.albedo(null); ctx.color("oklch(0.55 0.2 25)"); ctx.metalness(0.3); // red valve wheel
    const vx = cxm - nx * (deep / 2 + 0.08) + tx * along * 0.3, vz = czm - nz * (deep / 2 + 0.08) + tz * along * 0.3, ring = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12 * 6.283; ring.push([vx + tx * Math.cos(a) * 0.2, 0.95 + Math.sin(a) * 0.2, vz + tz * Math.cos(a) * 0.2]); }
    tube(ctx, ring, ring.map(() => 0.025), 6, [1, 1], 0, 1, 1);
    ctx.color("oklch(0.9 0.02 90)"); box(ctx, vx - tx * 0.6 - nx * 0.01 - 0.06, vx - tx * 0.6 + 0.06, 1.55, 1.7, vz - tz * 0.6 - nz * 0.01 - 0.06, vz - tz * 0.6 + 0.06); // a gauge face
    ctx.metalness(0);
  }

  // locked steel doors on some tunnel walls: cream paint, a darker frame, a black window, a handle
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) === "camp") continue;
    for (const d of [0, 1, 2, 3]) {
      if (!closed(cx, cz, d) || hash(cx * 4 + d, cz, 51) > 0.07) continue;
      const c = cellCenter(cx, cz), [nx, nz] = [[1, 0], [0, 1], [-1, 0], [0, -1]][d], tx = -nz, tz = nx, w = S / 2 - T;
      const fx = c.x + nx * w, fz = c.z + nz * w, col = ["oklch(0.88 0.02 90)", "oklch(0.8 0.01 250)", "oklch(0.7 0.04 60)"][Math.floor(hash(cx, cz, 53) * 3)];
      const plate = (a, b, y0, y1, out, color) => { ctx.color(color); const p = [fx + tx * a - nx * out, fz + tz * a - nz * out], q = [fx + tx * b, fz + tz * b]; box(ctx, Math.min(p[0], q[0]) - (tx ? 0 : 0), Math.max(p[0], q[0]), y0, y1, Math.min(p[1], q[1]), Math.max(p[1], q[1])); };
      ctx.albedo(RUSTY); ctx.metalness(0.3); ctx.roughness(0.6);
      plate(-0.62, 0.62, 0, 2.25, 0.05, "oklch(0.4 0.01 250)");
      plate(-0.52, 0.52, 0, 2.12, 0.08, col);
      ctx.albedo(null);
      plate(-0.2, 0.2, 1.45, 1.8, 0.09, "oklch(0.06 0 0)");
      plate(0.32, 0.42, 1.0, 1.06, 0.14, "oklch(0.6 0.01 250)");
      ctx.metalness(0);
    }
  }

  // warehouse rooms: barrels and stacked boxes along the walls; trolleys in some tunnels
  ctx.roughness(0.7);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz), c = cellCenter(cx, cz), r = hash(cx, cz, 61);
    if ((z === "room" || (z === "dark" && roomOf(cx, cz) >= 0)) && r < 0.6) {
      ctx.albedo(RUSTY); ctx.color(["oklch(0.45 0.12 30)", "oklch(0.45 0.08 240)", "oklch(0.5 0.1 140)"][Math.floor(r * 5) % 3]); ctx.metalness(0.4);
      for (let i = 0; i < 3; i++) { const bx = c.x - 1.4 + i * 0.65, bz = c.z + 1.3; tube(ctx, [[bx, 0, bz], [bx, 0.9, bz]], [0.29, 0.29], M, [1, 1], 0, 1, 1); ctx.quad(bx - 0.2, 0.9, bz - 0.2, bx - 0.2, 0.9, bz + 0.2, bx + 0.2, 0.9, bz + 0.2, bx + 0.2, 0.9, bz - 0.2); }
      ctx.albedo("cdn/texture-worn-hardwood-grain.png"); ctx.color("oklch(0.7 0.06 65)"); ctx.metalness(0);
      box(ctx, c.x + 0.4, c.x + 1.5, 0, 0.8, c.z - 1.8, c.z - 0.9); box(ctx, c.x + 0.6, c.x + 1.4, 0.8, 1.45, c.z - 1.7, c.z - 1.0);
    } else if (z === "tunnel" && r < 0.06 && openings(cx, cz).length === 2) { // a flatbed trolley pushed to one side
      ctx.albedo(RUSTY); ctx.color("oklch(0.5 0.12 250)"); ctx.metalness(0.5);
      box(ctx, c.x - 0.5, c.x + 0.5, 0.18, 0.24, c.z - 0.3, c.z + 0.3);
      box(ctx, c.x + 0.46, c.x + 0.5, 0.24, 1.0, c.z - 0.3, c.z + 0.3);
      ctx.color("oklch(0.15 0 0)"); for (const [ox, oz] of [[-0.42, -0.24], [-0.42, 0.24], [0.42, -0.24], [0.42, 0.24]]) box(ctx, c.x + ox - 0.05, c.x + ox + 0.05, 0, 0.16, c.z + oz - 0.03, c.z + oz + 0.03);
      ctx.metalness(0);
    }
  }

  // the Survivors' corner: cots, a work table, sandbags round the door home
  { const a = cellCenter(1, ARRIVE.cz);
    ctx.albedo(null); ctx.color("oklch(0.45 0.06 130)");
    for (let i = 0; i < 3; i++) box(ctx, a.x + 3 + i * 1.1, a.x + 3.8 + i * 1.1, 0.3, 0.42, a.z + 4.0, a.z + 6.0); // cots
    ctx.color("oklch(0.3 0.01 250)"); for (let i = 0; i < 3; i++) for (const ox of [3.05, 3.75]) for (const oz of [4.05, 5.95]) box(ctx, a.x + ox + i * 1.1, a.x + ox + 0.03 + i * 1.1, 0, 0.3, a.z + oz - 0.015, a.z + oz + 0.015);
    ctx.albedo("cdn/texture-worn-hardwood-grain.png"); ctx.color("oklch(0.7 0.06 60)");
    box(ctx, a.x + 4, a.x + 6, 0.78, 0.84, a.z - 5.2, a.z - 4.2);
    for (const [ox, oz] of [[4.05, -5.15], [5.9, -5.15], [4.05, -4.3], [5.9, -4.3]]) box(ctx, a.x + ox, a.x + ox + 0.05, 0, 0.78, a.z + oz, a.z + oz + 0.05);
    ctx.albedo(null); ctx.color("oklch(0.6 0.05 80)");
    for (let i = 0; i < 6; i++) { const z0 = BACK.z - 2.6 + (i < 3 ? 0 : 4.1) + (i % 3) * 0.4; tube(ctx, [[BACK.x + T + 0.3, 0.15 + Math.floor(i / 3) * 0, z0], [BACK.x + T + 1.0, 0.15, z0]], [0.16, 0.16], 6, [1, 0.6], 0.1, i, 1); }
  }
  // the doors out: the green door home in the west wall; the sealed door stencilled 3 in the east wall
  ctx.albedo(RUSTY); ctx.metalness(0.4);
  ctx.color("oklch(0.4 0.01 250)"); box(ctx, BACK.x + T, BACK.x + T + 0.06, 0, 2.4, BACK.z - 0.75, BACK.z + 0.75);
  ctx.color("oklch(0.5 0.11 150)"); box(ctx, BACK.x + T, BACK.x + T + 0.1, 0, 2.25, BACK.z - 0.62, BACK.z + 0.62);
  ctx.color("oklch(0.35 0.01 250)"); box(ctx, SEALED.x - T - 0.08, SEALED.x - T, 0, 2.6, SEALED.z - 0.95, SEALED.z + 0.95);
  ctx.color("oklch(0.55 0.13 60)"); box(ctx, SEALED.x - T - 0.14, SEALED.x - T, 0, 2.45, SEALED.z - 0.8, SEALED.z + 0.8);
  ctx.color("oklch(0.3 0.08 40)"); for (let i = 0; i < 3; i++) box(ctx, SEALED.x - T - 0.2, SEALED.x - T, 0.5 + i * 0.7, 0.62 + i * 0.7, SEALED.z - 0.85, SEALED.z + 0.85); // bars welded across
  ctx.albedo(null); ctx.color(null); ctx.metalness(0);
}
