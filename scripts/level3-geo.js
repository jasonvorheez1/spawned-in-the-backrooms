// Level 3 "Electrical Station": dusty brick halls, bundles of conduit along every wall, grey junction boxes,
// steel bars across some openings that never open, swung cage gates on others, low crawl halls,
// humming generator rooms, assembly lines, sealed vaults seen only through the bars. Layout: scripts/lib/level3.js.
import { SPARKS, N, S, H, TH, HALF, isOpen, isBars, isGate, openings, zoneOf, blockOf, hash, cellCenter, ceilingAt, BLOCKS, BACK, LIFT, inGamma, TW, TSP, tightArms, tightSpans } from "./lib/level3.js";
import { vault } from "./lib/level3-arch.js";
import { slab, tube } from "./lib/shapes.js";

const BRICK = "cdn/texture-aged-red-brick-wall-soot.png", FLOOR = "cdn/texture-dusty-cracked-concrete-floor.png", CEIL = "cdn/texture-dirty-concrete-ceiling-slab.png", STEEL = "cdn/texture-scratched-worn-steel.png";
const T = 0.3;
// wall skins by sector (3 x 3 cell patches, never per wall): orange-red brick, large grey brick, glazed tan tile; brown brick in the blind halls
const SKIN = {
  orange: { tex: "cdn/texture-bright-orange-red-brick-wall-dark-soot-streaks.png", col: "oklch(0.95 0.03 45)", rough: 0.85, base: "oklch(0.55 0.05 35)" },
  grey: { tex: "cdn/texture-large-grey-brick-wall-dusty-mortar.png", col: "oklch(0.9 0.01 80)", rough: 0.9, base: "oklch(0.45 0.01 80)" },
  tile: { tex: "cdn/texture-glossy-tan-brown-glazed-ceramic-wall-tiles.png", col: "oklch(0.93 0.03 70)", rough: 0.3, base: "oklch(0.2 0.02 50)" },
  brown: { tex: "cdn/texture-dark-brown-brick-wall-grimy-mortar.png", col: "oklch(0.88 0.03 55)", rough: 0.9, base: "oklch(0.35 0.03 50)" },
};
export const skinOf = (cx, cz) => { const z = zoneOf(Math.max(0, Math.min(N - 1, cx)), Math.max(0, Math.min(N - 1, cz))); if (z === "dark") return "brown"; const r = hash(Math.floor(Math.max(cx, 0) / 3), Math.floor(Math.max(cz, 0) / 3), 21); return r < 0.4 ? "orange" : r < 0.65 ? "grey" : "tile"; };
const TERRAZZO = "cdn/texture-grey-terrazzo-floor-tiles-dusty.png", PEEL = "cdn/texture-peeling-flaking-paint-dark-concrete-ceiling.png";
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
  const hi = ctx.lod <= 2, M = 4;
  // floor: terrazzo tile in the kept halls, dusty cracked concrete in the crawls and blind halls
  for (const terr of [true, false]) {
    ctx.albedo(terr ? TERRAZZO : FLOOR); ctx.roughness(terr ? 0.45 : 0.95);
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
      const x0 = cx * S - HALF, z0 = cz * S - HALF, z = zoneOf(cx, cz), r = hash(cx, cz, 5);
      if ((z === "hall" || z === "gamma" || z === "line") !== terr) continue;
      ctx.color(z === "gamma" ? "oklch(0.92 0.01 90)" : z === "gen" ? "oklch(0.7 0.02 70)" : z === "dark" ? "oklch(0.6 0.012 60)" : r < 0.2 ? "oklch(0.78 0.015 60)" : "oklch(0.88 0.01 75)");
      ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0);
    }
  }
  // ceiling: dark paint peeling off the slab in the tall halls, bare concrete over the crawls
  ctx.roughness(0.95);
  for (const peel of [true, false]) {
    ctx.albedo(peel ? PEEL : CEIL); ctx.color(peel ? "oklch(0.85 0.01 70)" : "oklch(0.5 0.01 70)");
    for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) { if ((ceilingAt(cx, cz) === H) !== peel) continue; const x0 = cx * S - HALF, z0 = cz * S - HALF, y = ceilingAt(cx, cz); ctx.quad(x0, y, z0, x0 + S, y, z0, x0 + S, y, z0 + S, x0, y, z0 + S); }
  }
  ctx.albedo(BRICK); ctx.color("oklch(0.72 0.06 40)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) for (const d of [0, 1]) {
    const nx = cx + D4[d][0], nz = cz + D4[d][1]; if (nx >= N || nz >= N || solid(cx, cz, d)) continue;
    if (ceilingAt(cx, cz) === ceilingAt(nx, nz)) continue;
    const xe = (cx + 1) * S - HALF, ze = (cz + 1) * S - HALF;
    if (d === 0) box(ctx, xe - T, xe + T, TH, H, cz * S - HALF, cz * S - HALF + S); else box(ctx, cx * S - HALF, cx * S - HALF + S, TH, H, ze - T, ze + T);
  }
  // walls on every closed edge, the outer shell too, skinned by sector; a darker grimed plinth (or the tile's dark baseboard) at the foot
  for (const k of Object.keys(SKIN)) {
    const K = SKIN[k], plinth = [];
    ctx.albedo(K.tex); ctx.color(K.col); ctx.roughness(K.rough);
    for (let cx = -1; cx < N; cx++) for (let cz = -1; cz < N; cz++) {
      if (skinOf(cx, cz) !== k) continue;
      const xe = (cx + 1) * S - HALF, ze = (cz + 1) * S - HALF;
      if (cz >= 0 && (cx < 0 || cx === N - 1 || solid(cx, cz, 0))) { box(ctx, xe - T, xe + T, 0, H, cz * S - HALF - T, cz * S - HALF + S + T); plinth.push([xe - T - 0.02, xe + T + 0.02, cz * S - HALF - T + 0.02, cz * S - HALF + S + T - 0.02]); }
      if (cx >= 0 && (cz < 0 || cz === N - 1 || solid(cx, cz, 1))) { box(ctx, cx * S - HALF - T + 0.02, cx * S - HALF + S + T - 0.02, 0, H, ze - T, ze + T); plinth.push([cx * S - HALF - T + 0.02, cx * S - HALF + S + T - 0.02, ze - T - 0.02, ze + T + 0.02]); }
    }
    ctx.color(K.base); if (k === "tile") { ctx.albedo(null); ctx.roughness(0.4); }
    for (const [x0, x1, z0, z1] of plinth) box(ctx, x0, x1, 0, k === "tile" ? 0.16 : 0.32, z0, z1);
  }
  ctx.albedo(BRICK); ctx.roughness(0.9);
  // crawl halls: thick brick liners squeeze the passage to a 1 m culvert (a 0.7 m body, 0.15 m each side), a barrel vault overhead
  ctx.color("oklch(0.6 0.06 38)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    if (zoneOf(cx, cz) !== "tight") continue; const c = cellCenter(cx, cz), h = S / 2, arms = tightArms(cx, cz);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(ctx, c.x + sx * TW, c.x + sx * h, 0, TH, c.z + sz * TW, c.z + sz * h); // corners always
    if (!arms.includes(0)) box(ctx, c.x + TW, c.x + h, 0, TH, c.z - TW, c.z + TW);
    if (!arms.includes(2)) box(ctx, c.x - h, c.x - TW, 0, TH, c.z - TW, c.z + TW);
    if (!arms.includes(1)) box(ctx, c.x - TW, c.x + TW, 0, TH, c.z + TW, c.z + h);
    if (!arms.includes(3)) box(ctx, c.x - TW, c.x + TW, 0, TH, c.z - h, c.z - TW);
    ctx.smooth(); for (const sp of tightSpans(cx, cz)) vault(ctx, cx, cz, sp, 0, hi ? 7 : 5); ctx.flat();
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
  // conduit: 3-4 grey steel pipes side by side along the ceiling edge; now and then the bundle bends down the wall together
  // into a long rounded grey box (0.25 x 1.2 m), and a black corrugated cable sags along beneath. The live wall boxes (wallbox.glb
  // at SPARKS) always get a bundle dropping into their tops.
  ctx.albedo(STEEL); ctx.color("oklch(0.82 0.008 250)"); ctx.metalness(0.6); ctx.roughness(0.4);
  const boxes = [], cables = [];
  const live = new Map(SPARKS.map((h) => [`${h.cx},${h.cz},${h.d}`, h]));
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz); if (z === "vault" || z === "tight" || inGamma(cx, cz)) continue; // conduit lives on the tall halls
    const c = cellCenter(cx, cz), top = ceilingAt(cx, cz);
    for (const d of [0, 1, 2, 3]) {
      const h = live.get(`${cx},${cz},${d}`);
      if (!solid(cx, cz, d) || (!h && hash(cx * 4 + d, cz, 31) > 0.72)) continue;
      const [nx, nz] = D4[d], tx = -nz, tz = nx, w = S / 2 - T - 0.05;
      const k = 3 + (hash(cx, cz, 33 + d) < 0.45 ? 1 : 0), y = top - 0.07;
      const P = (off, along, yy) => [c.x + nx * off + tx * along, yy, c.z + nz * off + tz * along];
      const drop = h ? { a: (h.wx - c.x) * tx + (h.wz - c.z) * tz, by: 1.62, glb: true } : hash(cx * 4 + d, cz, 37) < 0.3 ? { a: (hash(cx, cz, 39) - 0.5) * 1.8, by: 0.9 + hash(cx, cz, 41) * 0.3 } : null;
      for (let i = 0; i < k; i++) {
        const off = w - i * 0.085, r = 0.024 + (i === 0 ? 0.008 : 0);
        rod(ctx, P(off, -S / 2, y), P(off, S / 2, y), r, hi ? 5 : 3);
        if (drop) { // the bundle turns down the wall, fanning in to sit side by side over the box
          const sx = drop.a + (i - (k - 1) / 2) * (drop.glb ? 0.16 : 0.055), lo = drop.glb ? drop.by : drop.by + 0.6;
          tube(ctx, [P(off, sx, y), P(off - 0.02, sx, y - 0.12), P((off + w) / 2, sx, y - 0.32), P(w, sx, y - 0.55), P(w, sx, lo + 0.08)], [r, r, r, r, r], hi ? 5 : 3, [1, 1], 0, 1, 1);
        }
      }
      if (drop && !drop.glb) boxes.push({ ...P(w - 0.045, drop.a, 0), nx, nz, by: drop.by });
      if (hash(cx * 4 + d, cz, 43) < 0.25) cables.push({ P, w, y });
    }
  }
  // the long rounded steel boxes, flattened against the wall, a bevelled cap on the bottom
  ctx.color("oklch(0.78 0.01 240)"); ctx.metalness(0.7); ctx.roughness(0.35); ctx.smooth();
  for (const b of boxes) {
    const x = b[0], z = b[2], sq = b.nx ? [1, 0.36] : [0.36, 1];
    tube(ctx, [[x, b.by - 0.62, z], [x, b.by - 0.58, z], [x, b.by - 0.45, z], [x, b.by + 0.55, z], [x, b.by + 0.6, z], [x, b.by + 0.62, z]], [0.03, 0.1, 0.125, 0.125, 0.11, 0.06], hi ? 10 : 6, sq, 0, 1, 1);
  }
  ctx.flat();
  // black corrugated cable sagging between hangers along the beam
  ctx.albedo(null); ctx.color("oklch(0.14 0.005 250)"); ctx.metalness(0.05); ctx.roughness(0.7);
  for (const { P, w, y } of cables) {
    const pts = [], rs = []; for (let j = 0; j <= 4; j++) { const along = -S / 2 + (j / 4) * S; pts.push(P(w - 0.02, along, y - 0.28 - (j % 2 ? 0.14 : 0))); rs.push(0.022); }
    tube(ctx, pts, rs, 4, [1, 1], 0, 1, 1);
  }
  ctx.metalness(0);
  // generator rooms: three big humming generator housings with stacks of cable, a catwalk rail around the middle one
  for (const b of BLOCKS) {
    const c0 = cellCenter(b.x0, b.z0), x0 = c0.x - S / 2, z0 = c0.z - S / 2, W = b.w * S, D = b.d * S;
    if (b.type === "gen" && false) { // the generator is art/level3/generator.glb now (places/level3/sim.js)
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
    } else if (b.type === "line" && false) { // art/level3/line.glb
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
