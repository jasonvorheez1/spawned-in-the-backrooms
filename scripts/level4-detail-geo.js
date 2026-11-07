// Level 4's lived-in layer, drawn only (no collider): the ceiling's wounds (missing and fallen tiles, water rings,
// return-air grilles, sprinkler heads), the carpet's history (a worn traffic cross, stains, drifted paper), and what
// hangs on the walls (switches, outlets, scuffs, corkboards, stopped clocks, rust streaks under the taped windows,
// steel corner guards on the columns, extinguisher cabinets). Plan in scripts/lib/level4.js; everything is seeded.
import { HALF, H, T, DOORH, ROOMS, COLUMNS } from "./lib/level4.js";
import { box, paint, cyl, rod } from "./lib/gamma-kit.js";
import { prism } from "./lib/shapes.js";
const CARPET = "cdn/texture-light-grey-beige-office-carpet-tiles-worn.png";
const rnd = (i, k = 0) => { let h = Math.imul((i + 1) * 374761393 + k * 668265263, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const nearCol = (x, z, r = 1.1) => COLUMNS.some(([cx, cz]) => Math.abs(cx - x) < r && Math.abs(cz - z) < r);
const inRoom = (x, z, pad = 0.4) => ROOMS.some((r) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad);
// a box stood off one face of a wall line: ax "z" = wall at z = at running along x; s = which face (+1 / -1); t = half thickness
function onWall(ctx, ax, at, s, a, w, y0, y1, d0, d1, t = T) {
  const f0 = at + s * (t + d0), f1 = at + s * (t + d1), lo = Math.min(f0, f1), hi = Math.max(f0, f1);
  if (ax === "z") box(ctx, a - w / 2, a + w / 2, y0, y1, lo, hi); else box(ctx, lo, hi, y0, y1, a - w / 2, a + w / 2);
}
const P = (ax, at, a, y, d) => (ax === "z" ? [a, y, at + d] : [at + d, y, a]); // a point off a wall
function blob(ctx, x, z, r, y, seed, n = 9) { // an irregular flat patch
  const pts = []; for (let k = 0; k < n; k++) { const t = (k / n) * Math.PI * 2, rr = r * (0.65 + 0.5 * rnd(seed, k)); pts.push([x + Math.cos(t) * rr, z + Math.sin(t) * rr * (0.7 + 0.3 * rnd(seed, k + 40))]); }
  prism(ctx, pts, y, y + 0.002);
}
export function geometry(ctx) {
  const hi = ctx.lod <= 1;
  // ── the ceiling ──────────────────────────────────────────────
  // missing tiles: black voids into the plenum, a few with the tile lying on the carpet beneath
  const holes = [];
  for (let i = 0; i < 26; i++) {
    const x = -26 + Math.floor(rnd(i, 1) * 13) * 4 + 2, z = -26 + Math.floor(rnd(i, 2) * 26) * 2 + 1;
    if (Math.abs(x) > 25 || Math.abs(z) > 25 || nearCol(x, z, 1.4)) continue; holes.push([x, z, i]);
  }
  paint(ctx, "oklch(0.06 0.004 80)", null, 1); for (const [x, z] of holes) box(ctx, x - 0.3, x + 0.3, H - 0.006, H - 0.001, z - 0.6, z + 0.6);
  paint(ctx, "oklch(0.86 0.012 90)", "acoustic", 0.95);
  for (const [x, z, i] of holes) if (rnd(i, 3) < 0.55) { const ox = (rnd(i, 4) - 0.5) * 1.2, oz = (rnd(i, 5) - 0.5) * 1.2, rot = rnd(i, 6) < 0.5;
    rot ? box(ctx, x + ox - 0.6, x + ox + 0.6, 0.004, 0.02, z + oz - 0.3, z + oz + 0.3) : box(ctx, x + ox - 0.3, x + ox + 0.3, 0.004, 0.02, z + oz - 0.6, z + oz + 0.6); }
  // water rings on the tiles: tea-brown blooms with a darker heart
  for (let i = 0; i < 34; i++) {
    const x = (rnd(i, 7) - 0.5) * 60, z = (rnd(i, 8) - 0.5) * 60, r = 0.35 + rnd(i, 9) * 0.9;
    paint(ctx, "oklch(0.66 0.06 70)", null, 1); blob(ctx, x, z, r, H - 0.012, i * 3);
    paint(ctx, "oklch(0.52 0.07 62)", null, 1); blob(ctx, x + 0.05, z - 0.04, r * 0.45, H - 0.016, i * 3 + 1, 7);
  }
  // return-air grilles between the troffers, and the sprinkler heads on a 3 m grid
  for (let x = -24; x <= 24; x += 8) for (let z = -22; z <= 22; z += 8) {
    if (nearCol(x, z, 1)) continue;
    paint(ctx, "oklch(0.82 0.008 90)", null, 0.6, 0.3); box(ctx, x - 0.32, x + 0.32, H - 0.03, H, z - 0.32, z + 0.32);
    paint(ctx, "oklch(0.25 0.006 90)", null, 0.9); box(ctx, x - 0.27, x + 0.27, H - 0.032, H - 0.029, z - 0.27, z + 0.27);
    paint(ctx, "oklch(0.78 0.008 90)", null, 0.6, 0.3); for (let k = -4; k <= 4; k++) box(ctx, x - 0.27, x + 0.27, H - 0.05, H - 0.03, z + k * 0.06 - 0.008, z + k * 0.06 + 0.008);
  }
  paint(ctx, "oklch(0.75 0.03 80)", null, 0.4, 0.8);
  for (let x = -30; x <= 30; x += 3) for (let z = -30; z <= 30; z += 3) { if (inRoom(x, z, -0.3) && rnd(x * 97 + z, 11) < 0.5) continue; cyl(ctx, x + 0.5, z + 0.5, H - 0.07, H, 0.022, hi ? 6 : 4); }
  // ── the carpet ───────────────────────────────────────────────
  // stains: coffee, something darker, a long-dried puddle under a ceiling ring
  for (let i = 0; i < 30; i++) {
    const x = (rnd(i, 14) - 0.5) * 58, z = (rnd(i, 15) - 0.5) * 58; if (nearCol(x, z, 0.6)) continue;
    paint(ctx, ["oklch(0.46 0.035 65)", "oklch(0.42 0.03 50)", "oklch(0.5 0.03 85)"][i % 3], null, 1); blob(ctx, x, z, 0.2 + rnd(i, 16) * 0.7, 0.002 + (i % 5) * 0.0002, i * 7 + 2);
  }
  // paper: drifts of it against walls and in doorways, single sheets in the open
  paint(ctx, "oklch(0.93 0.015 95)", null, 0.95);
  const sheet = (x, z, k) => (rnd(k, 17) < 0.5 ? box(ctx, x - 0.105, x + 0.105, 0.003, 0.0045, z - 0.148, z + 0.148) : box(ctx, x - 0.148, x + 0.148, 0.003, 0.0045, z - 0.105, z + 0.105));
  for (let i = 0; i < 70; i++) { const x = (rnd(i, 18) - 0.5) * 58, z = (rnd(i, 19) - 0.5) * 58; if (!nearCol(x, z, 0.6)) sheet(x, z, i); }
  for (const r of ROOMS) { if (!r.inward) continue; const n = 3 + Math.floor(rnd(r.no, 20) * 5);
    for (let k = 0; k < n; k++) { const a = r.door.c + (rnd(r.no * 9 + k, 21) - 0.5) * 2.4, d = r.door.at + r.inward * (0.3 + rnd(r.no * 9 + k, 22) * 1.6) * (k % 2 ? 1 : -1);
      r.door.ax === "z" ? sheet(a, d, r.no * 9 + k) : sheet(d, a, r.no * 9 + k); } }
  paint(ctx, "oklch(0.85 0.06 95)", null, 0.95); // a few yellow legal pages
  for (let i = 0; i < 14; i++) { const x = (rnd(i, 23) - 0.5) * 56, z = (rnd(i, 24) - 0.5) * 56; if (!nearCol(x, z, 0.6)) sheet(x, z, i + 300); }
  // ── the walls ────────────────────────────────────────────────
  for (const r of ROOMS) {
    const { ax, at, c } = r.door, w = (r.door.w ?? 1.2) / 2;
    const out = r.inward ?? (r.z0 < 0 ? 1 : -1); // the corridor face of the door wall
    // light switch beside the door on both faces, an outlet down low
    for (const s of [out, -out]) {
      paint(ctx, "oklch(0.94 0.01 95)", null, 0.5); onWall(ctx, ax, at, s, c - w - 0.25, 0.075, 1.15, 1.27, 0.0, 0.012);
      paint(ctx, "oklch(0.88 0.01 95)", null, 0.4); onWall(ctx, ax, at, s, c - w - 0.25, 0.012, 1.19, 1.23, 0.012, 0.022);
    }
    paint(ctx, "oklch(0.92 0.01 95)", null, 0.5);
    for (const a of [c + w + 1.6, c - w - 2.2]) { onWall(ctx, ax, at, out, a, 0.07, 0.28, 0.4, 0, 0.01); }
    paint(ctx, "oklch(0.2 0.01 80)", null, 0.8);
    for (const a of [c + w + 1.6, c - w - 2.2]) for (const dy of [0.31, 0.355]) { onWall(ctx, ax, at, out, a - 0.012, 0.006, dy, dy + 0.018, 0.01, 0.012); onWall(ctx, ax, at, out, a + 0.012, 0.006, dy, dy + 0.018, 0.01, 0.012); }
    // scuffs at shoe and cart height along the corridor face
    paint(ctx, "oklch(0.55 0.015 70)", null, 1);
    for (let k = 0; k < 4; k++) { const a = (ax === "z" ? r.x0 : r.z0) + rnd(r.no * 13 + k, 25) * 8; if (Math.abs(a - c) < w + 0.3) continue;
      onWall(ctx, ax, at, out, a, 0.3 + rnd(r.no * 13 + k, 26) * 0.9, 0.12 + rnd(r.no * 13 + k, 27) * 0.5, 0.15 + rnd(r.no * 13 + k, 27) * 0.5 + 0.04, 0, 0.002); }
    if (!r.outer) continue;
    // inside the office: a corkboard on the door wall, papers pinned crooked; a clock on the side wall, stopped
    const along = r.door.c < r.mid ? r.mid + 1.6 : r.mid - 1.6;
    if (rnd(r.no, 28) < 0.7) {
      paint(ctx, "oklch(0.42 0.04 60)", "hardwood", 0.7); onWall(ctx, ax, at, -out, along, 1.3, 1.0, 1.85, 0, 0.025);
      paint(ctx, "oklch(0.6 0.07 65)", null, 1); onWall(ctx, ax, at, -out, along, 1.2, 1.05, 1.8, 0.025, 0.03);
      for (let k = 0; k < 5; k++) { paint(ctx, k === 2 ? "oklch(0.85 0.08 95)" : "oklch(0.95 0.01 95)", null, 0.95);
        const a = along - 0.45 + k * 0.22 + (rnd(r.no * 7 + k, 29) - 0.5) * 0.08, y = 1.25 + rnd(r.no * 7 + k, 30) * 0.3; onWall(ctx, ax, at, -out, a, 0.17, y, y + 0.24, 0.03, 0.033); }
    }
    if (rnd(r.no, 31) < 0.6) { // the clock hangs on the outer wall's inside face, beside the window
      const o = r.outer, fa = o.at + r.inward * 0.2, a = r.mid + (r.door.c < r.mid ? -2.3 : 2.3), p0 = P(o.ax, fa, a, 2.35, 0), p1 = P(o.ax, fa, a, 2.35, r.inward * 0.04);
      paint(ctx, "oklch(0.25 0.01 80)", null, 0.5); rod(ctx, p0, p1, 0.16, hi ? 18 : 10);
      paint(ctx, "oklch(0.95 0.01 95)", null, 0.6); rod(ctx, p1, P(o.ax, fa, a, 2.35, r.inward * 0.042), 0.14, hi ? 18 : 10);
      paint(ctx, "oklch(0.1 0 0)", null, 0.6); const hand = (len, ang, wid) => rod(ctx, P(o.ax, fa, a, 2.35, r.inward * 0.045), P(o.ax, fa, a + Math.sin(ang) * len, 2.35 + Math.cos(ang) * len, r.inward * 0.045), wid, 4);
      hand(0.08, 2.4 + r.no, 0.006); hand(0.115, 0.7 + r.no * 2, 0.004);
    }
    // rust-brown streaks run down from the taped windows' sills
    const o = r.outer; paint(ctx, "oklch(0.6 0.05 65)", null, 1);
    for (let k = 0; k < 4; k++) { const a = r.mid - 1.1 + rnd(r.no * 5 + k, 32) * 2.2; onWall(ctx, o.ax, o.at, r.inward, a, 0.015 + rnd(r.no * 5 + k, 33) * 0.03, 0.85 - 0.2 - rnd(r.no * 5 + k, 34) * 0.55, 0.85, -0.004, -0.002, 0.2); }
  }
  // ── the columns ──────────────────────────────────────────────
  for (const [x, z] of COLUMNS) {
    paint(ctx, "oklch(0.7 0.008 250)", "steel", 0.4, 0.8);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = x + sx * 0.35, cz = z + sz * 0.35;
      box(ctx, Math.min(cx, cx - sx * 0.07), Math.max(cx, cx - sx * 0.07) + 0.003 * sx, 0.1, 1.25, Math.min(cz, cz + sz * 0.004), Math.max(cz, cz + sz * 0.004));
      box(ctx, Math.min(cx, cx + sx * 0.004), Math.max(cx, cx + sx * 0.004), 0.1, 1.25, Math.min(cz, cz - sz * 0.07), Math.max(cz, cz - sz * 0.07)); }
    paint(ctx, "oklch(0.32 0.02 60)", null, 0.6); box(ctx, x - 0.362, x + 0.362, 0, 0.1, z - 0.362, z + 0.362);
    // every other column carries an extinguisher cabinet facing the middle of the floor
    if ((Math.abs(x) + Math.abs(z)) % 20 === 16) { const fz = z > 0 ? -1 : 1, fy = z - fz * 0 + fz * 0.35;
      paint(ctx, "oklch(0.45 0.17 27)", null, 0.4, 0.3); box(ctx, x - 0.22, x + 0.22, 0.95, 1.65, Math.min(fy, fy + fz * 0.14), Math.max(fy, fy + fz * 0.14));
      paint(ctx, "oklch(0.75 0.03 220 / 0.6)", null, 0.05); box(ctx, x - 0.17, x + 0.17, 1.02, 1.55, Math.min(fy + fz * 0.14, fy + fz * 0.145), Math.max(fy + fz * 0.14, fy + fz * 0.145));
      paint(ctx, "oklch(0.5 0.2 27)", null, 0.3, 0.2); cyl(ctx, x, fy + fz * 0.07, 1.05, 1.45, 0.06, 10);
      paint(ctx, "oklch(0.97 0.01 95)", null, 0.5); box(ctx, x - 0.2, x + 0.2, 1.7, 1.8, Math.min(fy, fy + fz * 0.01), Math.max(fy, fy + fz * 0.01)); }
  }
}
