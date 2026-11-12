// Level 0, "The Threshold": the whole maze as one mesh. Carpet, chevron wallpaper, drop ceiling,
// light panels, arch walls you can vault, pillar fields and pits. Layout from lib/maze.js.
import { N, S, H, HALF, hash, zoneOf, inHub, wallX as wallX0, wallZ as wallZ0, isArchWall, hasPit, hasPillar, hasLight } from "./lib/maze.js";
import L from "./lib/data/level0.yml";

const WALLPAPER = "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png";
const CARPET = "cdn/texture-damp-beige-berber-office-carpet.png";
const CEILING = "cdn/texture-white-acoustic-drop-ceiling-tile-grid.png";
const T = 0.1; // half wall thickness

function face(ctx, a, b, c, d, n) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) ctx.quad(...a, ...b, ...c, ...d);
  else ctx.quad(...d, ...c, ...b, ...a);
}
function box(ctx, x0, y0, z0, x1, y1, z1, skipBottom = true) {
  face(ctx, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]);
  if (!skipBottom) face(ctx, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
  face(ctx, [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1]);
  face(ctx, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
  face(ctx, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
  face(ctx, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
}

function tint(ctx, zone, cx, cz) {
  if (zone === "offices") ctx.color(hash(cx, cz, 31) < 0.3 ? "oklch(0.86 0.02 85)" : "oklch(0.92 0.02 90)");
  else if (zone === "red") ctx.color("oklch(0.93 0.07 30)");
  else if (zone === "dark") ctx.color("oklch(0.9 0.02 90)");
  else ctx.color(hash(cx, cz, 31) < 0.15 ? "oklch(0.9 0.03 80)" : "oklch(0.98 0.01 90)");
}

// a wall along an axis. axis "x": the wall stands at x = p, runs z from a to b. axis "z": at z = p, runs x from a to b.
function wall(ctx, axis, p, a, b, arch) {
  const P = (u, y, s) => (axis === "x" ? [p + s * T, y, u] : [u, y, p + s * T]);
  const nOut = (s) => (axis === "x" ? [s, 0, 0] : [0, 0, s]);
  const along = axis === "x" ? [0, 0, 1] : [1, 0, 0];
  if (!arch) {
    const [x0, z0, x1, z1] = axis === "x" ? [p - T, a, p + T, b] : [a, p - T, b, p + T];
    box(ctx, x0, 0, z0, x1, H, z1);
    return;
  }
  // arch wall: a sill at 0.6, two arched openings 1.5 wide, spring at 2.0, crown at 2.75
  const SILL = 0.6, SPRING = 2.0, R = 0.75, len = b - a;
  const centers = [a + len * 0.27, a + len * 0.73];
  const top = (u) => { for (const c of centers) if (Math.abs(u - c) < R) return SPRING + Math.sqrt(R * R - (u - c) * (u - c)); return null; };
  const cuts = [a, b];
  for (const c of centers) for (let i = 0; i <= 14; i++) cuts.push(c - R + (2 * R * i) / 14);
  cuts.sort((m, n) => m - n);
  for (let i = 0; i < cuts.length - 1; i++) {
    const u0 = cuts[i], u1 = cuts[i + 1];
    if (u1 - u0 < 1e-4) continue;
    const mid = (u0 + u1) / 2, open = top(mid) !== null;
    const t0 = open ? (top(u0 + 1e-5) ?? SPRING) : H, t1 = open ? (top(u1 - 1e-5) ?? SPRING) : H;
    for (const s of [-1, 1]) {
      if (!open) face(ctx, P(u0, 0, s), P(u1, 0, s), P(u1, H, s), P(u0, H, s), nOut(s));
      else {
        face(ctx, P(u0, 0, s), P(u1, 0, s), P(u1, SILL, s), P(u0, SILL, s), nOut(s));
        face(ctx, P(u0, t0, s), P(u1, t1, s), P(u1, H, s), P(u0, H, s), nOut(s));
      }
    }
    if (open) {
      face(ctx, P(u0, SILL, -1), P(u1, SILL, -1), P(u1, SILL, 1), P(u0, SILL, 1), [0, 1, 0]); // sill
      face(ctx, P(u0, t0, -1), P(u0, t0, 1), P(u1, t1, 1), P(u1, t1, -1), [0, -1, 0]); // soffit
    }
    face(ctx, P(u0, H, -1), P(u0, H, 1), P(u1, H, 1), P(u1, H, -1), [0, 1, 0]); // top cap
  }
  for (const c of centers) for (const [u, dir] of [[c - R, 1], [c + R, -1]]) { // jambs
    const n = along.map((v) => v * dir);
    face(ctx, P(u, SILL, -1), P(u, SPRING, -1), P(u, SPRING, 1), P(u, SILL, 1), n);
  }
  for (const [u, dir] of [[a, -1], [b, 1]]) face(ctx, P(u, 0, -1), P(u, H, -1), P(u, H, 1), P(u, 0, 1), along.map((v) => v * dir));
}

// walls broken by players (place.state.broken, synced into params.broken by places/main/sim.js) are left out until they regrow
let BRK = new Set();
const wallX = (cx, cz) => wallX0(cx, cz) && !BRK.has(`x:${cx}:${cz}`);
const wallZ = (cx, cz) => wallZ0(cx, cz) && !BRK.has(`z:${cx}:${cz}`);
// chunks knocked out of a wall: "x:cx:cz:u:v" -> the wall draws as 4 x 3 voxels with torn, uneven lips round each hole
let VOX = new Map();
function voxWall(ctx, axis, p, a, b, holes, seed) {
  const C = 4, R = 3, du = (b - a) / C, dv = H / R, gone = (u, v) => u >= 0 && u < C && v >= 0 && v < R && holes.has(`${u}:${v}`);
  for (let u = 0; u < C; u++) for (let v = 0; v < R; v++) {
    if (gone(u, v)) continue;
    const j = (k) => 0.05 + hash(seed + u * 7 + v * 13, k, 77) * 0.16; // a ragged inset only where it borders a hole
    let u0 = a + u * du + (gone(u - 1, v) ? j(1) : 0), u1 = a + (u + 1) * du - (gone(u + 1, v) ? j(2) : 0);
    let y0 = v * dv + (gone(u, v - 1) ? j(3) : 0), y1 = (v + 1) * dv - (gone(u, v + 1) ? j(4) : 0);
    const [x0, z0, x1, z1] = axis === "x" ? [p - T, u0, p + T, u1] : [u0, p - T, u1, p + T];
    box(ctx, x0, y0, z0, x1, y1, z1, false);
    // torn drywall lips and a hanging shard or two along each hole edge
    for (const [nu, nv, k] of [[-1, 0, 5], [1, 0, 6], [0, -1, 7], [0, 1, 8]]) {
      if (!gone(u + nu, v + nv)) continue;
      for (let i = 0; i < 3; i++) {
        const r1 = hash(seed + u * 11 + v * 5 + i, k, 91), r2 = hash(seed + u * 3 + v * 17 + i, k, 93), L = 0.06 + r2 * 0.14, w = 0.08 + r1 * 0.2, th = T * (0.4 + r1 * 0.5);
        let cu, cy, su, sy;
        if (nu) { cu = nu < 0 ? u0 - L / 2 : u1 + L / 2; cy = y0 + (y1 - y0) * (0.15 + 0.7 * ((i + r1) / 3)); su = L; sy = w; }
        else { cu = u0 + (u1 - u0) * (0.15 + 0.7 * ((i + r2) / 3)); cy = nv < 0 ? y0 - L / 2 : y1 + L / 2; su = w; sy = L; }
        const side = (r1 < 0.5 ? -1 : 1) * (T - th);
        const [bx0, bz0, bx1, bz1] = axis === "x" ? [p + side - th, cu - su / 2, p + side + th, cu + su / 2] : [cu - su / 2, p + side - th, cu + su / 2, p + side + th];
        box(ctx, bx0, cy - sy / 2, bz0, bx1, cy + sy / 2, bz1, false);
      }
    }
  }
}
export function geometry(ctx) {
  BRK = new Set(ctx.params?.broken ?? []);
  VOX = new Map();
  for (const k of BRK) { const q = k.split(":"); if (q.length === 5) { const w = q.slice(0, 3).join(":"); if (!VOX.has(w)) VOX.set(w, new Set()); VOX.get(w).add(`${q[3]}:${q[4]}`); } }
  const lod = ctx.lod;
  // CARPET + PITS
  ctx.albedo(CARPET);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF, x1 = x0 + S, z1 = z0 + S, zone = zoneOf(cx, cz);
    tint(ctx, zone, cx, cz);
    if (!hasPit(cx, cz)) { face(ctx, [x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [0, 1, 0]); continue; }
    const h = 0.9, mx = x0 + S / 2, mz = z0 + S / 2, a0 = mx - h, a1 = mx + h, b0 = mz - h, b1 = mz + h, D = -L.pitDepth;
    face(ctx, [x0, 0, z0], [x0, 0, b0], [x1, 0, b0], [x1, 0, z0], [0, 1, 0]);
    face(ctx, [x0, 0, b1], [x0, 0, z1], [x1, 0, z1], [x1, 0, b1], [0, 1, 0]);
    face(ctx, [x0, 0, b0], [x0, 0, b1], [a0, 0, b1], [a0, 0, b0], [0, 1, 0]);
    face(ctx, [a1, 0, b0], [a1, 0, b1], [x1, 0, b1], [x1, 0, b0], [0, 1, 0]);
    ctx.color("oklch(0.6 0.03 80)");
    face(ctx, [a0, D, b0], [a0, D, b1], [a1, D, b1], [a1, D, b0], [0, 1, 0]);
    face(ctx, [a0, D, b0], [a1, D, b0], [a1, 0, b0], [a0, 0, b0], [0, 0, 1]);
    face(ctx, [a0, D, b1], [a0, 0, b1], [a1, 0, b1], [a1, D, b1], [0, 0, -1]);
    face(ctx, [a0, D, b0], [a0, 0, b0], [a0, 0, b1], [a0, D, b1], [1, 0, 0]);
    face(ctx, [a1, D, b0], [a1, D, b1], [a1, 0, b1], [a1, 0, b0], [-1, 0, 0]);
  }
  // CEILING
  ctx.albedo(CEILING);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF, zone = zoneOf(cx, cz);
    ctx.color(zone === "red" ? "oklch(0.93 0.06 30)" : hash(cx, cz, 41) < 0.12 ? "oklch(0.88 0.04 75)" : "oklch(0.97 0.015 95)");
    face(ctx, [x0, H, z0], [x0 + S, H, z0], [x0 + S, H, z0 + S], [x0, H, z0 + S], [0, -1, 0]);
  }
  // WALLS + PILLARS
  ctx.albedo(WALLPAPER);
  for (let cx = -1; cx < N; cx++) for (let cz = -1; cz < N; cz++) {
    const zone = zoneOf(Math.max(cx, 0), Math.max(cz, 0));
    tint(ctx, zone, cx, cz);
    const xw = (cx + 1) * S - HALF, zw = (cz + 1) * S - HALF;
    const vx = VOX.get(`x:${cx}:${cz}`), vz = VOX.get(`z:${cx}:${cz}`);
    if (vx && wallX(cx, cz)) voxWall(ctx, "x", xw, cz * S - HALF - T, (cz + 1) * S - HALF + T, vx, cx * 131 + cz);
    else if (cz >= 0 && (cx === -1 ? true : wallX(cx, cz))) wall(ctx, "x", xw, cz * S - HALF - T, (cz + 1) * S - HALF + T, cx >= 0 && cx < N - 1 && isArchWall(cx, cz, "x"));
    if (vz && wallZ(cx, cz)) voxWall(ctx, "z", zw, cx * S - HALF - T, (cx + 1) * S - HALF + T, vz, cx * 137 + cz * 3);
    else if (cx >= 0 && (cz === -1 ? true : wallZ(cx, cz))) wall(ctx, "z", zw, cx * S - HALF - T, (cx + 1) * S - HALF + T, cz >= 0 && cz < N - 1 && isArchWall(cx, cz, "z"));
    if (cx >= 0 && cz >= 0 && hasPillar(cx, cz)) {
      const mx = cx * S - HALF + S / 2, mz = cz * S - HALF + S / 2, w = zone === "pillars" ? 0.75 : 0.5;
      box(ctx, mx - w, 0, mz - w, mx + w, H, mz + w);
    }
  }
  // BASEBOARDS (near detail)
  if (lod <= 2) {
    ctx.albedo("cdn/texture-scuffed-grimy-cream-painted-wood-baseboard-with-mop-marks.png"); // Nov 12 realism pass: scuffed, mop-stained, not a flat strip
    ctx.color("oklch(0.95 0.03 85)");
    ctx.roughness(0.7);
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const xw = (cx + 1) * S - HALF, zw = (cz + 1) * S - HALF;
      if (wallX(cx, cz) && !isArchWall(cx, cz, "x")) box(ctx, xw - T - 0.02, 0, cz * S - HALF, xw + T + 0.02, 0.1, (cz + 1) * S - HALF);
      if (wallZ(cx, cz) && !isArchWall(cx, cz, "z")) box(ctx, cx * S - HALF, 0, zw - T - 0.02, (cx + 1) * S - HALF, 0.1, zw + T + 0.02);
    }
    ctx.roughness(null);
  }
  // WEAR (near detail): water stains bleeding down the paper, damp carpet, dead outlets, missing tiles
  if (lod <= 2) {
    ctx.albedo(null); ctx.roughness(0.9);
    const blob = (c, ua, va, r, seed, n = 9) => { // an irregular blob in the plane spanned by ua, va round c
      const pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = r * (0.6 + 0.6 * hash(seed, i, 61)); pts.push([c[0] + (ua[0] * Math.cos(a) + va[0] * Math.sin(a)) * k, c[1] + (ua[1] * Math.cos(a) + va[1] * Math.sin(a)) * k, c[2] + (ua[2] * Math.cos(a) + va[2] * Math.sin(a)) * k]); }
      return pts;
    };
    const fan = (c, pts, nrm) => { for (let i = 0; i < pts.length; i++) face(ctx, c, pts[i], pts[(i + 1) % pts.length], pts[(i + 1) % pts.length], nrm); };
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const zone = zoneOf(cx, cz); if (zone === "hub") continue;
      const x0 = cx * S - HALF, z0 = cz * S - HALF, mx = x0 + S / 2, mz = z0 + S / 2;
      // a stain where the ceiling leaked: a tea-brown bloom under the ceiling and a run down toward the baseboard
      for (const [axis, has] of [["x", wallX(cx, cz) && !isArchWall(cx, cz, "x")], ["z", wallZ(cx, cz) && !isArchWall(cx, cz, "z")]]) {
        if (!has || hash(cx, cz, axis === "x" ? 71 : 73) > 0.22) continue;
        const u = (axis === "x" ? mz : mx) + (hash(cx, cz, 75) - 0.5) * 2.4, p = (axis === "x" ? x0 + S : z0 + S);
        for (const sd of [-1, 1]) {
          if (hash(cx, cz, 77 + sd) < 0.4) continue;
          const off = p + sd * (T + 0.004), nrm = axis === "x" ? [sd, 0, 0] : [0, 0, sd];
          const P = (uu, y) => (axis === "x" ? [off, y, uu] : [uu, y, off]);
          const ua = axis === "x" ? [0, 0, 1] : [1, 0, 0], va = [0, 1, 0], seed = cx * 97 + cz * 13 + sd;
          const r = 0.35 + hash(cx, cz, 79) * 0.5, top = H - 0.25 - hash(cx, cz, 81) * 0.25;
          ctx.color("oklch(0.42 0.06 70)", 0.16); fan(P(u, top), blob(P(u, top), ua, va, r * 1.5, seed), nrm);
          ctx.color("oklch(0.36 0.06 65)", 0.22); fan(P(u, top), blob(P(u, top), ua, va, r, seed + 5), nrm);
          const runs = 1 + Math.floor(hash(cx, cz, 83) * 3); // drips
          for (let d = 0; d < runs; d++) {
            const du = u + (hash(seed, d, 85) - 0.5) * r * 1.4, len = 0.4 + hash(seed, d, 87) * 1.4, w = 0.02 + hash(seed, d, 89) * 0.03;
            ctx.color("oklch(0.38 0.06 65)", 0.2);
            face(ctx, P(du - w, top - len), P(du + w, top - len), P(du + w * 1.6, top), P(du - w * 1.6, top), nrm);
          }
        }
      }
      // damp carpet: dark wet blooms, more in the arch rooms and the pits
      if (!hasPit(cx, cz) && hash(cx, cz, 91) < (zone === "arches" || zone === "holes" ? 0.5 : 0.12)) {
        const c = [mx + (hash(cx, cz, 93) - 0.5) * 2, 0.006, mz + (hash(cx, cz, 95) - 0.5) * 2], r = 0.5 + hash(cx, cz, 97) * 0.9;
        ctx.color("oklch(0.3 0.04 70)", 0.22); fan(c, blob(c, [1, 0, 0], [0, 0, 1], r * 1.4, cx * 31 + cz), [0, 1, 0]);
        ctx.color("oklch(0.24 0.04 70)", 0.28); fan([c[0], 0.008, c[2]], blob([c[0], 0.008, c[2]], [1, 0, 0], [0, 0, 1], r * 0.8, cx * 31 + cz + 3), [0, 1, 0]);
      }
      // a dead wall outlet, low on a plain wall
      if (wallX(cx, cz) && !isArchWall(cx, cz, "x") && hash(cx, cz, 99) < 0.12) {
        const xw = x0 + S - T - 0.006, zz = mz + (hash(cx, cz, 101) - 0.5) * 2.5;
        ctx.color("oklch(0.9 0.02 90)"); box(ctx, xw - 0.006, 0.28, zz - 0.04, xw + 0.004, 0.4, zz + 0.04);
        ctx.color("oklch(0.25 0.01 90)");
        for (const yy of [0.31, 0.36]) face(ctx, [xw - 0.0065, yy, zz - 0.012], [xw - 0.0065, yy, zz + 0.012], [xw - 0.0065, yy + 0.018, zz + 0.012], [xw - 0.0065, yy + 0.018, zz - 0.012], [-1, 0, 0]);
      }
    }
    ctx.roughness(null);
  }
  // CEILING DAMAGE: a missing tile shows the black plenum, a water-logged one sags brown
  ctx.albedo(null);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (inHub(cx, cz)) continue;
    const h = hash(cx, cz, 103); if (h > 0.07) continue;
    const tx = cx * S - HALF + 0.6 + Math.floor(hash(cx, cz, 105) * 4) * 0.6 + (hash(cx, cz, 105) < 0.5 ? 0 : 1.2), tz = cz * S - HALF + 0.6 + Math.floor(hash(cx, cz, 107) * 2) * 0.6 + (hash(cx, cz, 107) < 0.5 ? 0 : 2.0);
    if (h < 0.035) { // missing: a dark hole with the grid lip and a wire hanging out of it
      ctx.color("oklch(0.06 0.01 80)");
      box(ctx, tx, H - 0.002, tz, tx + 0.6, H + 0.4, tz + 0.6);
      ctx.color("oklch(0.2 0.01 250)");
      face(ctx, [tx + 0.3, H + 0.1, tz + 0.29], [tx + 0.31, H + 0.1, tz + 0.29], [tx + 0.36, H - 0.55, tz + 0.31], [tx + 0.35, H - 0.55, tz + 0.31], [0, 0, -1]);
      face(ctx, [tx + 0.3, H + 0.1, tz + 0.31], [tx + 0.35, H - 0.55, tz + 0.31], [tx + 0.36, H - 0.55, tz + 0.31], [tx + 0.31, H + 0.1, tz + 0.31], [0, 0, 1]);
    } else { // sagging, stained tea brown
      ctx.color("oklch(0.62 0.07 70)");
      const c = [tx + 0.3, H - 0.07, tz + 0.3], k = [[tx, tz], [tx + 0.6, tz], [tx + 0.6, tz + 0.6], [tx, tz + 0.6]];
      for (let i = 0; i < 4; i++) { const a = k[i], b = k[(i + 1) % 4]; face(ctx, c, [a[0], H - 0.003, a[1]], [b[0], H - 0.003, b[1]], [b[0], H - 0.003, b[1]], [0, -1, 0]); }
    }
  }
  // LIGHT PANELS
  ctx.albedo(null);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const zone = zoneOf(cx, cz), mx = cx * S - HALF + S / 2, mz = cz * S - HALF + S / 2;
    const lit = hasLight(cx, cz), rot = hash(cx, cz, 29) < 0.5;
    const hx = rot ? 0.32 : 0.62, hz = rot ? 0.62 : 0.32;
    ctx.color("oklch(0.85 0.01 90)");
    box(ctx, mx - hx - 0.05, H - 0.04, mz - hz - 0.05, mx + hx + 0.05, H, mz + hz + 0.05); // frame
    if (lit) {
      const boost = inHub(cx, cz) ? 1.15 : 1.0;
      ctx.emissive(zone === "red" ? [3.0, 0.25, 0.18] : [1.55 * boost, 1.45 * boost, 1.15 * boost]);
    }
    ctx.color(lit ? (zone === "red" ? "#ff4a3a" : "#fffaf0") : "oklch(0.45 0.01 90)");
    face(ctx, [mx - hx, H - 0.045, mz - hz], [mx + hx, H - 0.045, mz - hz], [mx + hx, H - 0.045, mz + hz], [mx - hx, H - 0.045, mz + hz], [0, -1, 0]);
    ctx.emissive(null);
    if (ctx.lod <= 1) { // a 2x4 troffer reads as one: a centre T-bar splitting two diffuser lenses and a grimy lip; flat faces only (10 tris a fixture)
      const Y = H - 0.047, F = (x0, z0, x1, z1) => face(ctx, [x0, Y, z0], [x1, Y, z0], [x1, Y, z1], [x0, Y, z1], [0, -1, 0]);
      ctx.color("oklch(0.74 0.012 85)");
      if (rot) F(mx - hx, mz - 0.014, mx + hx, mz + 0.014); else F(mx - 0.014, mz - hz, mx + 0.014, mz + hz);
      ctx.color("oklch(0.58 0.035 78)");
      F(mx - hx - 0.05, mz - hz - 0.05, mx + hx + 0.05, mz - hz); F(mx - hx - 0.05, mz + hz, mx + hx + 0.05, mz + hz + 0.05);
      F(mx - hx - 0.05, mz - hz, mx - hx, mz + hz); F(mx + hx, mz - hz, mx + hx + 0.05, mz + hz);
    }
    // a vent now and then
    if (hash(cx, cz, 37) < 0.08) {
      ctx.color("oklch(0.35 0.01 90)");
      const vx = mx + 1.3, vz = mz - 1.2;
      face(ctx, [vx - 0.3, H - 0.01, vz - 0.3], [vx + 0.3, H - 0.01, vz - 0.3], [vx + 0.3, H - 0.01, vz + 0.3], [vx - 0.3, H - 0.01, vz + 0.3], [0, -1, 0]);
    }
  }
  ctx.color(null);
  return { bounds: { min: [-HALF - 1, -L.pitDepth - 0.1, -HALF - 1], max: [HALF + 1, H + 0.1, HALF + 1] } };
}
