// Level 0, "The Threshold": the whole maze as one mesh. Carpet, chevron wallpaper, drop ceiling,
// light panels, arch walls you can vault, pillar fields and pits. Layout from lib/maze.js.
import { N, S, H, HALF, hash, zoneOf, inHub, wallX, wallZ, isArchWall, hasPit, hasPillar, hasLight } from "./lib/maze.js";
import L from "./lib/data/level0.yml";

const WALLPAPER = "cdn/texture-yellow-chevron-damask-wallpaper-aged.png";
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
  if (zone === "red") ctx.color("oklch(0.93 0.07 30)");
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

export function geometry(ctx) {
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
    if (cz >= 0 && (cx === -1 ? true : wallX(cx, cz))) wall(ctx, "x", xw, cz * S - HALF - T, (cz + 1) * S - HALF + T, cx >= 0 && cx < N - 1 && isArchWall(cx, cz, "x"));
    if (cx >= 0 && (cz === -1 ? true : wallZ(cx, cz))) wall(ctx, "z", zw, cx * S - HALF - T, (cx + 1) * S - HALF + T, cz >= 0 && cz < N - 1 && isArchWall(cx, cz, "z"));
    if (cx >= 0 && cz >= 0 && hasPillar(cx, cz)) {
      const mx = cx * S - HALF + S / 2, mz = cz * S - HALF + S / 2, w = zone === "pillars" ? 0.75 : 0.5;
      box(ctx, mx - w, 0, mz - w, mx + w, H, mz + w);
    }
  }
  // BASEBOARDS (near detail)
  if (lod <= 2) {
    ctx.albedo(null);
    ctx.color("oklch(0.72 0.05 85)");
    ctx.roughness(0.6);
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const xw = (cx + 1) * S - HALF, zw = (cz + 1) * S - HALF;
      if (wallX(cx, cz) && !isArchWall(cx, cz, "x")) box(ctx, xw - T - 0.02, 0, cz * S - HALF, xw + T + 0.02, 0.1, (cz + 1) * S - HALF);
      if (wallZ(cx, cz) && !isArchWall(cx, cz, "z")) box(ctx, cx * S - HALF, 0, zw - T - 0.02, (cx + 1) * S - HALF, 0.1, zw + T + 0.02);
    }
    ctx.roughness(null);
  }
  // LIGHT PANELS
  ctx.albedo(null);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const zone = zoneOf(cx, cz), mx = cx * S - HALF + S / 2, mz = cz * S - HALF + S / 2;
    const lit = hasLight(cx, cz), rot = hash(cx, cz, 29) < 0.5;
    const hx = rot ? 0.32 : 0.62, hz = rot ? 0.62 : 0.32;
    ctx.color("oklch(0.85 0.01 90)");
    box(ctx, mx - hx - 0.05, H - 0.04, mz - hz - 0.05, mx + hx + 0.05, H, mz + hz + 0.05); // frame
    if (lit) ctx.emissive(zone === "red" ? [3, 0.25, 0.18] : [2.4, 2.25, 1.8].map((v) => v * (inHub(cx, cz) ? 1.15 : 1)) && (zone === "red" ? "#ff2a1e" : "#fff4d6"));
    ctx.color(lit ? (zone === "red" ? "#ff4a3a" : "#fffaf0") : "oklch(0.45 0.01 90)");
    face(ctx, [mx - hx, H - 0.045, mz - hz], [mx + hx, H - 0.045, mz - hz], [mx + hx, H - 0.045, mz + hz], [mx - hx, H - 0.045, mz + hz], [0, -1, 0]);
    ctx.emissive(null);
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
