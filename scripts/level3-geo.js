// Level 3 "Electrical Station": dusty brick halls, bundles of conduit along every wall, grey junction boxes,
// steel bars across some openings that never open, swung cage gates on others, low crawl halls,
// humming generator rooms, assembly lines, sealed vaults seen only through the bars. Layout: scripts/lib/level3.js.
import { N, S, H, TH, HALF, isOpen, isBars, isGate, openings, zoneOf, blockOf, hash, cellCenter, ceilingAt, BLOCKS, BACK, LIFT, inGamma } from "./lib/level3.js";
import { slab, tube } from "./lib/shapes.js";

const BRICK = "cdn/texture-aged-red-brick-wall-soot.png", FLOOR = "cdn/texture-dusty-cracked-concrete-floor.png", CEIL = "cdn/texture-dirty-concrete-ceiling-slab.png", STEEL = "cdn/texture-scratched-worn-steel.png";
const T = 0.3;
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const solid = (cx, cz, d) => !isOpen(cx, cz, d) && !isBars(cx, cz, d);
const rod = (ctx, a, b, r, M) => tube(ctx, [a, b], [r, r], M, [1, 1], 0, 1, 1);

// a row of bars across one cell edge: (x0,z0)->(x1,z1), floor to h, cross rails top and middle
function barRow(ctx, x0, z0, x1, z1, h, M, gap = 0.17) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / gap));
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; rod(ctx, [x, 0, z], [x, h, z], 0.018, M); }
  for (const y of [0.12, h * 0.55, h - 0.08]) { const ux = (x1 - x0) / L * 0.03, uz = (z1 - z0) / L * 0.03; box(ctx, Math.min(x0, x1) - Math.abs(uz) - 0.02, Math.max(x0, x1) + Math.abs(uz) + 0.02, y - 0.03, y + 0.03, Math.min(z0, z1) - Math.abs(ux) - 0.02, Math.max(z0, z1) + Math.abs(ux) + 0.02); }
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 6 : 4;
  // floor: dusty concrete, a little darker in the blind halls, oil-stained in the generator rooms
  ctx.albedo(FLOOR);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF, z = zoneOf(cx, cz), r = hash(cx, cz, 5);
    ctx.color(z === "gamma" ? "oklch(0.7 0.015 90)" : z === "gen" ? "oklch(0.48 0.02 70)" : z === "dark" ? "oklch(0.5 0.012 60)" : r < 0.2 ? "oklch(0.55 0.02 60)" : "oklch(0.62 0.015 75)");
    ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0);
  }
  // ceiling at each cell's height; a brick header where a low crawl hall meets a tall one
  ctx.albedo(CEIL); ctx.color("oklch(0.5 0.01 70)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) { const x0 = cx * S - HALF, z0 = cz * S - HALF, y = ceilingAt(cx, cz); ctx.quad(x0, y, z0, x0 + S, y, z0, x0 + S, y, z0 + S, x0, y, z0 + S); }
  ctx.albedo(BRICK); ctx.color("oklch(0.72 0.06 40)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) for (const d of [0, 1]) {
    const nx = cx + D4[d][0], nz = cz + D4[d][1]; if (nx >= N || nz >= N || solid(cx, cz, d)) continue;
    if (ceilingAt(cx, cz) === ceilingAt(nx, nz)) continue;
    const xe = (cx + 1) * S - HALF, ze = (cz + 1) * S - HALF;
    if (d === 0) box(ctx, xe - T, xe + T, TH, H, cz * S - HALF, cz * S - HALF + S); else box(ctx, cx * S - HALF, cx * S - HALF + S, TH, H, ze - T, ze + T);
  }
  // brick walls on every closed edge, the outer shell too; two tones by sector
  for (const dark of [false, true]) {
    ctx.color(dark ? "oklch(0.55 0.06 35)" : "oklch(0.72 0.07 40)");
    for (let cx = -1; cx < N; cx++) for (let cz = -1; cz < N; cz++) {
      if ((hash(Math.floor(Math.max(cx, 0) / 3), Math.floor(Math.max(cz, 0) / 3), 21) < 0.35) !== dark) continue;
      const xe = (cx + 1) * S - HALF, ze = (cz + 1) * S - HALF;
      if (cz >= 0 && (cx < 0 || cx === N - 1 || solid(cx, cz, 0))) box(ctx, xe - T, xe + T, 0, H, cz * S - HALF - T, cz * S - HALF + S + T);
      if (cx >= 0 && (cz < 0 || cz === N - 1 || solid(cx, cz, 1))) box(ctx, cx * S - HALF - T, cx * S - HALF + S + T, 0, H, ze - T, ze + T);
    }
  }
  // crawl halls: thick brick liners squeeze the passage to a shoulder's width
  ctx.color("oklch(0.6 0.06 38)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "tight") continue; const c = cellCenter(cx, cz), o = openings(cx, cz), ns = o.every((d) => d === 1 || d === 3), ew = o.every((d) => d === 0 || d === 2);
    if (ns) { box(ctx, c.x - S / 2, c.x - 0.75, 0, TH, c.z - S / 2, c.z + S / 2); box(ctx, c.x + 0.75, c.x + S / 2, 0, TH, c.z - S / 2, c.z + S / 2); }
    else if (ew) { box(ctx, c.x - S / 2, c.x + S / 2, 0, TH, c.z - S / 2, c.z - 0.75); box(ctx, c.x - S / 2, c.x + S / 2, 0, TH, c.z + 0.75, c.z + S / 2); }
    else for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(ctx, c.x + sx * 0.75, c.x + sx * S / 2, 0, TH, c.z + sz * 0.75, c.z + sz * S / 2); // a junction keeps its arms, loses its corners
  }
  // bars: across the barred edges, floor to ceiling, never a gate
  ctx.albedo(STEEL); ctx.color("oklch(0.84 0.014 90)"); ctx.metalness(0.25); ctx.roughness(0.8);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) for (const d of [0, 1]) {
    if (!isBars(cx, cz, d)) continue;
    const h = Math.min(ceilingAt(cx, cz), ceilingAt(cx + D4[d][0], cz + D4[d][1]));
    if (d === 0) { const x = (cx + 1) * S - HALF; barRow(ctx, x, cz * S - HALF + T, x, (cz + 1) * S - HALF - T, h, M); }
    else { const z = (cz + 1) * S - HALF; barRow(ctx, cx * S - HALF + T, z, (cx + 1) * S - HALF - T, z, h, M); }
  }
  // cage gates: a barred frame around the opening and a gate swung back flat against the wall
  ctx.color("oklch(0.8 0.016 90)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) for (const d of [0, 1]) {
    if (!isGate(cx, cz, d)) continue;
    const h = Math.min(ceilingAt(cx, cz), ceilingAt(cx + D4[d][0], cz + D4[d][1]));
    if (d === 0) { const x = (cx + 1) * S - HALF, z0 = cz * S - HALF; barRow(ctx, x, z0 + T, x, z0 + 1.0, h, M); barRow(ctx, x, z0 + S - 1.0, x, z0 + S - T, h, M); box(ctx, x - 0.05, x + 0.05, h - 0.5, h, z0 + 1, z0 + S - 1); barRow(ctx, x + 0.12, z0 + S - 1.0, x + 2.0, z0 + S - 1.0 + 0.1, h - 0.55, M, 0.2); }
    else { const z = (cz + 1) * S - HALF, x0 = cx * S - HALF; barRow(ctx, x0 + T, z, x0 + 1.0, z, h, M); barRow(ctx, x0 + S - 1.0, z, x0 + S - T, z, h, M); box(ctx, x0 + 1, x0 + S - 1, h - 0.5, h, z - 0.05, z + 0.05); barRow(ctx, x0 + S - 1.0, z + 0.12, x0 + S - 1.0 + 0.1, z + 2.0, h - 0.55, M, 0.2); }
  }
  // conduit: two or three grey pipes along the top of closed walls, dropping into a junction box now and then
  ctx.color("oklch(0.68 0.01 250)"); ctx.metalness(0.6); ctx.roughness(0.4);
  const boxes = [];
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz); if (z === "vault") continue;
    const c = cellCenter(cx, cz), top = ceilingAt(cx, cz);
    for (const d of [0, 1, 2, 3]) {
      if (!solid(cx, cz, d) || hash(cx * 4 + d, cz, 31) > 0.62) continue;
      const [nx, nz] = D4[d], tx = -nz, tz = nx, w = S / 2 - T - 0.06 - (z === "tight" ? 1.2 : 0);
      if (z === "tight" && Math.abs(nx) + Math.abs(nz) && !openings(cx, cz).every((o) => o % 2 !== d % 2)) continue;
      const k = 2 + (hash(cx, cz, 33 + d) < 0.4 ? 1 : 0);
      for (let i = 0; i < k; i++) {
        const y = top - 0.18 - i * 0.11, off = w - i * 0.02, px = c.x + nx * off, pz = c.z + nz * off;
        rod(ctx, [px - tx * S / 2, y, pz - tz * S / 2], [px + tx * S / 2, y, pz + tz * S / 2], 0.03 + (i === 0 ? 0.012 : 0), M);
      }
      if (hash(cx * 4 + d, cz, 37) < 0.3) { // drops down to a grey junction box, like the photographs
        const a = (hash(cx, cz, 39) - 0.5) * 1.6, px = c.x + nx * w + tx * a, pz = c.z + nz * w + tz * a, by = 1.1 + hash(cx, cz, 41) * 0.5;
        for (const s of [-0.05, 0.05]) rod(ctx, [px + tx * s, top - 0.18, pz + tz * s], [px + tx * s, by + 0.45, pz + tz * s], 0.02, M);
        boxes.push([px, pz, nx, nz, tx, tz, by]);
      }
    }
  }
  ctx.color("oklch(0.62 0.008 240)");
  for (const [px, pz, nx, nz, tx, tz, by] of boxes) {
    const cxm = px - nx * 0.08, czm = pz - nz * 0.08;
    box(ctx, cxm - Math.abs(tx) * 0.18 - Math.abs(nx) * 0.08, cxm + Math.abs(tx) * 0.18 + Math.abs(nx) * 0.08, by - 0.4, by + 0.45, czm - Math.abs(tz) * 0.18 - Math.abs(nz) * 0.08, czm + Math.abs(tz) * 0.18 + Math.abs(nz) * 0.08);
  }
  // generator rooms: three big humming generator housings with stacks of cable, a catwalk rail around the middle one
  for (const b of BLOCKS) {
    const c0 = cellCenter(b.x0, b.z0), x0 = c0.x - S / 2, z0 = c0.z - S / 2, W = b.w * S, D = b.d * S;
    if (b.type === "gen") {
      ctx.albedo(STEEL); ctx.metalness(0.5); ctx.roughness(0.55);
      const gx = x0 + W / 2, gz = z0 + D / 2;
      ctx.color("oklch(0.45 0.06 150)"); box(ctx, gx - 2.2, gx + 2.2, 0, 2.2, gz - 1.1, gz + 1.1); // main housing, dull green
      ctx.color("oklch(0.3 0.01 250)"); box(ctx, gx - 2.4, gx + 2.4, 0, 0.25, gz - 1.3, gz + 1.3); // plinth
      for (let i = 0; i < 6; i++) box(ctx, gx - 1.9 + i * 0.7, gx - 1.6 + i * 0.7, 0.6, 1.9, gz + 1.1, gz + 1.14); // cooling fins
      ctx.color("oklch(0.55 0.13 85)"); box(ctx, gx - 2.21, gx + 2.21, 2.0, 2.08, gz - 1.11, gz + 1.11); // hazard band
      ctx.color("oklch(0.4 0.01 250)"); rod(ctx, [gx + 1.5, 2.2, gz], [gx + 1.5, H, gz], 0.22, M); // exhaust stack into the ceiling
      for (const [ox, oz] of [[-W / 2 + 0.7, -D / 2 + 0.6], [W / 2 - 0.7, D / 2 - 0.6], [-W / 2 + 0.7, D / 2 - 0.6]]) { // switch cabinets in the corners
        ctx.color("oklch(0.58 0.01 240)"); box(ctx, gx + ox - 0.45, gx + ox + 0.45, 0, 2.0, gz + oz - 0.3, gz + oz + 0.3);
        ctx.color("oklch(0.25 0.01 250)"); box(ctx, gx + ox - 0.3, gx + ox + 0.3, 1.2, 1.7, gz + oz - 0.31, gz + oz + 0.31);
      }
      ctx.color("oklch(0.2 0.01 250)"); ctx.metalness(0.1); ctx.roughness(0.9); // fat black cables snaking across the floor
      for (let k = 0; k < 4; k++) { const a = hash(b.i, k, 51) * 6.28; tube(ctx, [[gx - 2.2, 0.06, gz - 0.5 + k * 0.3], [gx - 3.5, 0.06, gz - 0.6 + k * 0.35 + Math.sin(a) * 0.4], [gx - W / 2 + 0.7, 0.06, gz + D / 2 - 1.2 + k * 0.1], [gx - W / 2 + 0.7, 1.2, gz + D / 2 - 0.9]], [0.05, 0.05, 0.05, 0.05], M, [1, 1], 0, 1, 1); }
    } else if (b.type === "line") {
      // an assembly line: a long conveyor on legs, rollers, a hopper at the start, a press halfway, a bin at the end
      ctx.albedo(STEEL); ctx.metalness(0.6); ctx.roughness(0.5);
      const zc = z0 + D / 2 - 0.25, xa = x0 + 1.2, xb = x0 + W - 1.2;
      ctx.color("oklch(0.4 0.01 250)"); box(ctx, xa, xb, 0.82, 0.9, zc - 0.5, zc + 0.5); // bed
      ctx.color("oklch(0.18 0.005 250)"); box(ctx, xa, xb, 0.9, 0.93, zc - 0.42, zc + 0.42); // belt
      ctx.color("oklch(0.55 0.13 85)"); box(ctx, xa, xb, 0.84, 0.96, zc - 0.55, zc - 0.5); box(ctx, xa, xb, 0.84, 0.96, zc + 0.5, zc + 0.55); // yellow rails
      ctx.color("oklch(0.35 0.01 250)"); for (let x = xa + 0.4; x < xb; x += 1.6) for (const s of [-0.45, 0.45]) box(ctx, x - 0.05, x + 0.05, 0, 0.82, zc + s - 0.05, zc + s + 0.05);
      ctx.color("oklch(0.5 0.08 30)"); box(ctx, xa - 0.4, xa + 0.9, 0.95, 2.2, zc - 0.7, zc + 0.7); ctx.color("oklch(0.3 0.01 250)"); box(ctx, xa - 0.1, xa + 0.6, 2.2, 2.5, zc - 0.5, zc + 0.5); // hopper
      const xm = (xa + xb) / 2; ctx.color("oklch(0.45 0.06 250)"); for (const s of [-0.75, 0.75]) box(ctx, xm - 0.15, xm + 0.15, 0, 2.4, zc + s - 0.15, zc + s + 0.15); box(ctx, xm - 0.5, xm + 0.5, 2.0, 2.4, zc - 0.9, zc + 0.9); ctx.color("oklch(0.3 0.01 250)"); box(ctx, xm - 0.4, xm + 0.4, 1.35, 1.6, zc - 0.45, zc + 0.45); // the press
      ctx.color("oklch(0.42 0.05 150)"); box(ctx, xb + 0.05, xb + 1.0, 0, 0.7, zc - 0.6, zc + 0.6); // the bin at the end
    } else if (b.type === "vault") {
      // behind the bars: something waits in every vault
      const vx = x0 + W / 2, vz = z0 + D / 2;
      ctx.albedo(null); ctx.metalness(0); ctx.roughness(0.9);
      if (b.content === "statue") { ctx.color("oklch(0.85 0.01 90)"); // drawn in level3-details-geo.js
      } else if (false) {
        ctx.color("oklch(0.85 0.01 90)"); box(ctx, vx - 0.35, vx + 0.35, 0, 0.3, vz - 0.35, vz + 0.35);
        tube(ctx, [[vx, 0.3, vz], [vx, 0.9, vz], [vx, 1.5, vz], [vx, 1.75, vz], [vx, 2.0, vz]], [0.2, 0.22, 0.2, 0.08, 0.14], 10, [1, 0.8], 0, 1, 1);
      } else if (b.content === "shadow") { // a heap of something dark that is not quite a coat
        ctx.color("oklch(0.12 0.005 250)"); tube(ctx, [[vx - 0.8, 0.05, vz], [vx - 0.3, 0.4, vz + 0.2], [vx + 0.4, 0.3, vz - 0.1], [vx + 0.9, 0.05, vz]], [0.05, 0.45, 0.4, 0.05], 10, [1, 0.6], 0, 1, 1);
      } else if (b.content === "purple") { // walls covered in a faint violet bloom
        ctx.color("oklch(0.45 0.18 305)"); for (let k = 0; k < 14; k++) { const a = hash(b.i, k, 61) * 6.28, r = 1.5 + hash(b.i, k, 62) * 1.5; box(ctx, vx + Math.cos(a) * r - 0.2, vx + Math.cos(a) * r + 0.2, 0.3 + hash(b.i, k, 63) * 2, 0.6 + hash(b.i, k, 63) * 2, vz + Math.sin(a) * r - 0.2, vz + Math.sin(a) * r + 0.2); }
      } else { // a chair facing the wall, and the wall drawn on
        ctx.color("oklch(0.35 0.05 50)"); box(ctx, vx - 0.25, vx + 0.25, 0.45, 0.5, vz - 0.25, vz + 0.25); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(ctx, vx + sx * 0.22 - 0.025, vx + sx * 0.22 + 0.025, 0, 0.45, vz + sz * 0.22 - 0.025, vz + sz * 0.22 + 0.025); box(ctx, vx - 0.25, vx + 0.25, 0.5, 1.0, vz + 0.22, vz + 0.27);
      }
    }
  }
  // the checkpoint: sandbag line, a folding table, crates; the freight lift's frame in the far east wall
  ctx.albedo(null); ctx.metalness(0); ctx.roughness(0.95);
  const g = cellCenter(3, 12);
  ctx.color("oklch(0.6 0.04 85)"); for (let i = 0; i < 6; i++) box(ctx, g.x + 1.4, g.x + 1.95, 0, 0.55 + (i % 2) * 0.1, g.z - 4 + i * 1.5, g.z - 3 + i * 1.5); // sandbags on the gamma line
  ctx.albedo(STEEL); ctx.metalness(0.6); ctx.roughness(0.45); ctx.color("oklch(0.5 0.01 250)");
  const lz = LIFT.z, lx = HALF - T;
  box(ctx, lx - 0.25, lx, 0, H, lz - 1.5, lz - 1.3); box(ctx, lx - 0.25, lx, 0, H, lz + 1.3, lz + 1.5); box(ctx, lx - 0.25, lx, 2.5, H, lz - 1.3, lz + 1.3);
  ctx.color("oklch(0.35 0.01 250)"); for (let i = 0; i < 9; i++) rod(ctx, [lx - 0.12, 0, lz - 1.2 + i * 0.3], [lx - 0.12, 2.5, lz - 1.2 + i * 0.3], 0.015, M); // its scissor gate, pulled shut
  const bz = BACK.z, bx = -HALF + T; ctx.color("oklch(0.55 0.03 150)");
  box(ctx, bx, bx + 0.2, 0, 2.5, bz - 0.85, bz - 0.7); box(ctx, bx, bx + 0.2, 0, 2.5, bz + 0.7, bz + 0.85); box(ctx, bx, bx + 0.2, 2.35, 2.5, bz - 0.85, bz + 0.85); // the door frame home
  ctx.color("oklch(0.1 0.005 250)"); box(ctx, bx - 0.01, bx + 0.02, 0, 2.35, bz - 0.7, bz + 0.7); // dark doorway
  ctx.metalness(0);
}
