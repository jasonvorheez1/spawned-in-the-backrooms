// BEDS — HYLLA's bed family, ONE generator (09b §3.4). Every bed the store sells.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/beds.js",
//                params: { part: "double", w: 1.6, d: 2.0, h: 1.0, head: "panel", bedding: true,
//                          finish: "oak", finish2: "linen-oat" } }
//
// FRAME (09b §1 `floor` mount): origin ON THE GROUND at the footprint centre, +Y up, front on +Z
//        (the FOOT of the bed — the headboard stands at −Z), body x ±w/2 · z ±d/2 · y 0→h.
//        `dims` = TOTAL extent: the rails around the mattress, headboard, guard rails, ladder.
// SCALE: real beds — rail top 0.35, mattress top 0.55, headboard 1.00, bunk upper deck 1.50.
//
//   part: "single"  0.90×2.00 mattress → dims 1.00×2.10×1.00
//   part: "double"  1.60|1.40|1.80 × 2.00 → 1.70×2.10×1.00
//   part: "bunk"    0.90×2.00 ×2 decks, upper mattress top 1.50, guard rails to 1.75, hook-on
//                   ladder on +X (the footprint is shifted so the ladder keeps x symmetric) → 1.07×2.10×1.75
//   part: "crib"    0.60×1.20, slatted rails to 0.90 → 0.69×1.29×0.90
//   part: "daybed"  2.00×0.90 mattress ALONG X, three backs (−Z, ±X), open on +Z → 2.10×1.00×0.85
//
// PARAMS: w, d (the MATTRESS width / length; the daybed's w runs along x) · h (headboard / rail /
//   guard top) · head "slat"|"panel"|"upholstered" · bedding bool (duvet + 2 pillows, default true)
//   · finish (frame wood; default oak) · finish2 (upholstered headboard + bedding; default linen-oat).
//   Mattress ticking is fixed linen-grey. Beds host nothing on top (`surface` 0 — 09b §3.15).
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — every face of `finish` (frame), then the mattress (linen), then
//   every face of `finish2` (headboard pad + bedding). No glass, no glow in this family.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("builtin/geom");
const M = require("lib/home-mat.js");

const PARTS = ["single", "double", "bunk", "crib", "daybed"];
const HEADS = ["slat", "panel", "upholstered"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  single: { w: 0.9, d: 2.0, h: 1.0, head: "panel", bedding: true, finish: "oak", finish2: "linen-oat" },
  double: { w: 1.6, d: 2.0, h: 1.0, head: "panel", bedding: true, finish: "oak", finish2: "linen-oat" },
  bunk: { w: 0.9, d: 2.0, h: 1.75, head: "panel", bedding: true, finish: "oak", finish2: "linen-oat" },
  crib: { w: 0.6, d: 1.2, h: 0.9, head: "slat", bedding: true, finish: "oak", finish2: "linen-oat" },
  daybed: { w: 2.0, d: 0.9, h: 0.85, head: "panel", bedding: true, finish: "oak", finish2: "linen-oat" },
};

const RAIL = 0.05; // rail thickness around the mattress (single / double / bunk / daybed)
const RAIL_Y0 = 0.15; // rail underside
const FRAME_H = 0.35; // rail top = mattress base
const MAT_T = 0.2; // mattress thickness → top 0.55
const LEG = 0.06; // leg / post section
const DECK2 = 1.5; // bunk: upper mattress top
const LADDER = 0.07; // bunk: ladder stand-off beyond the +X rail (0.03 air + 0.04 stile)
const CRIB_POST = 0.045; // crib: post section = rail thickness
const CRIB_MAT = 0.12; // crib mattress thickness

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}

// Resolved size params for a part (what geometry() builds and what manifest() reports).
function size(part, p) {
  const D = DEF[part] || DEF.double;
  p = p || {};
  const w = clamp(num(p.w, D.w), 0.5, 2.4);
  const d = clamp(num(p.d, D.d), 0.5, 2.4);
  const hMin = part === "bunk" ? DECK2 + 0.15 : part === "crib" ? FRAME_H + CRIB_MAT + 0.2 : FRAME_H + MAT_T + 0.1;
  const h = clamp(num(p.h, D.h), hMin, 2.2);
  const head = typeof p.head === "string" && HEADS.indexOf(p.head) >= 0 ? p.head : D.head;
  const bedding = p.bedding === undefined ? !!D.bedding : !!p.bedding;
  const rail = part === "crib" ? CRIB_POST : RAIL;
  return { w, d, h, head, bedding, rail };
}

// [w, d, hTotal] in the floor frame — the catalog's `dims` (total extent, 09b §1).
function dims(part, p) {
  const s = size(part, p);
  return [s.w + 2 * s.rail + (part === "bunk" ? LADDER : 0), s.d + 2 * s.rail, s.h];
}

// Beds host no `top` rows (09b §3.15: a bed's price card stands on a post).
function surface() {
  return 0;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) parts[k] = { dims: dims(k, {}), surface: surface(k, {}), mount: "floor", mountY: 0, defaults: DEF[k] };
  return { family: "beds", script: "scripts/asset-library/gen-home/beds.js", parts, heads: HEADS };
}

// ── emitters (townscape.js pattern) ─────────────────────────────────────────
export function qd(ctx, paint, a, b, c, d) {
  if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
}

// Plain box, outward-wound. `skip` = letters of faces to omit: t(op) b(ottom) f(ront +z) k(back) l r.
export function bx(ctx, x0, x1, y0, y1, z0, z1, paint, skip) {
  const s = skip || "";
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  const nnn = [xa, ya, za], pnn = [xb, ya, za], npn = [xa, yb, za], ppn = [xb, yb, za];
  const nnp = [xa, ya, zb], pnp = [xb, ya, zb], npp = [xa, yb, zb], ppp = [xb, yb, zb];
  if (s.indexOf("f") < 0) qd(ctx, paint, nnp, pnp, ppp, npp);
  if (s.indexOf("k") < 0) qd(ctx, paint, pnn, nnn, npn, ppn);
  if (s.indexOf("r") < 0) qd(ctx, paint, pnp, pnn, ppn, ppp);
  if (s.indexOf("l") < 0) qd(ctx, paint, nnn, nnp, npp, npn);
  if (s.indexOf("t") < 0) qd(ctx, paint, npp, ppp, ppn, npn);
  if (s.indexOf("b") < 0) qd(ctx, paint, nnn, pnn, pnp, nnp);
}

// Chamfered slab — rails, mattresses, duvets. 0.008 is the furniture bevel.
export function slab(ctx, x0, x1, y0, y1, z0, z1, paint, bevel) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.008, paint);
}

// Vertical chamfered prism (a leg, a post). caps.end true = a visible top.
export function post(ctx, x, z, y0, y1, w, d, bevel, paint, caps) {
  const c = caps || {};
  G.loftFrames(
    ctx,
    [
      { c: [x, y0, z], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w, d, 0, 0, bevel) },
      { c: [x, y1, z], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w, d, 0, 0, bevel) },
    ],
    paint,
    { capStart: c.start !== false, capEnd: c.end === true }
  );
}

// A pillow: chamfered section lofted along its long axis, pinched at both ends; smooth-shaded.
// (cx, cz) centre on the mattress, y = mattress top, len along the long axis (x, or z when longZ).
export function pillow(ctx, paint, cx, cz, y, len, dep, ph, longZ) {
  const f = longZ ? [0, 0, 1] : [1, 0, 0];
  const F = (t, sw, sh, bev) => ({
    c: longZ ? [cx, y + ph / 2, cz + t] : [cx + t, y + ph / 2, cz],
    f: f,
    up: [0, 1, 0],
    poly: G.rrect(dep * sw, ph * sh, 0, 0, bev),
  });
  ctx.smooth();
  G.loftFrames(ctx, [F(-len / 2, 0.6, 0.3, 0.008), F(-len / 2 + 0.06, 1, 1, 0.03), F(len / 2 - 0.06, 1, 1, 0.03), F(len / 2, 0.6, 0.3, 0.008)], paint);
  ctx.flat();
}

// ── frame pieces ────────────────────────────────────────────────────────────
// Four rails around a mattress footprint (inner x ±mw/2, z ±md/2), y0→y1, thickness r, shifted ox.
export function rails(ctx, paint, mw, md, y0, y1, r, ox) {
  const o = ox || 0;
  const xo = mw / 2 + r, zo = md / 2 + r;
  slab(ctx, o - xo, o - mw / 2, y0, y1, -zo, zo, paint, 0.006);
  slab(ctx, o + mw / 2, o + xo, y0, y1, -zo, zo, paint, 0.006);
  slab(ctx, o - mw / 2, o + mw / 2, y0, y1, -zo, -md / 2, paint, 0.006);
  slab(ctx, o - mw / 2, o + mw / 2, y0, y1, md / 2, zo, paint, 0.006);
}

// Legs under the rails at the given corners ([sx, sz] pairs), poking 1 cm up into the rail.
export function legs(ctx, paint, mw, md, r, corners, ox) {
  const o = ox || 0;
  const xs = mw / 2 + r - LEG / 2, zs = md / 2 + r - LEG / 2;
  for (const c of corners) post(ctx, o + c[0] * xs, c[1] * zs, 0, RAIL_Y0 + 0.01, LEG, LEG, 0.005, paint, { start: true, end: false });
}

// Wood headboard on the −Z (head) rail: two posts to h plus a panel or slats; nothing for
// `upholstered` (its pad is finish2 and comes in the soft group). Returns the corners still
// needing plain legs.
export function headWood(ctx, paint, mw, md, r, h, head) {
  if (head === "upholstered") return [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const xo = mw / 2 + r, zo = md / 2 + r;
  for (const sx of [-1, 1]) post(ctx, sx * (xo - LEG / 2), -(zo - LEG / 2), 0, h, LEG, LEG, 0.005, paint, { start: true, end: true });
  backFill(ctx, paint, -(xo - LEG), xo - LEG, -zo + 0.005, -md / 2 - 0.005, h, head);
  return [[-1, 1], [1, 1]];
}

// The infill between two posts: a chamfered top rail, then a solid panel (3 cm) or a bottom rail
// with vertical slats. x0..x1 = clear span, z0..z1 = the rail slot, top at h.
export function backFill(ctx, paint, x0, x1, z0, z1, h, head) {
  const zc = (z0 + z1) / 2;
  slab(ctx, x0 - 0.005, x1 + 0.005, h - 0.06, h - 0.008, z0, z1, paint, 0.006);
  if (head === "panel") {
    bx(ctx, x0 - 0.005, x1 + 0.005, FRAME_H - 0.005, h - 0.055, zc - 0.015, zc + 0.015, paint, "tb");
    return;
  }
  slab(ctx, x0 - 0.005, x1 + 0.005, FRAME_H - 0.005, FRAME_H + 0.05, z0, z1, paint, 0.006);
  const span = x1 - x0, n = Math.max(3, Math.round(span / 0.09)), pitch = span / n, sw = 0.04;
  for (let i = 0; i < n; i++) {
    const cx = x0 + pitch * (i + 0.5);
    bx(ctx, cx - sw / 2, cx + sw / 2, FRAME_H + 0.045, h - 0.055, zc - 0.01, zc + 0.01, paint, "tb");
  }
}

// Same infill running along z between two posts at x (daybed ends): the slot is x0..x1.
export function sideFill(ctx, paint, x0, x1, z0, z1, h, head) {
  const xc = (x0 + x1) / 2;
  slab(ctx, x0, x1, h - 0.06, h - 0.008, z0 - 0.005, z1 + 0.005, paint, 0.006);
  if (head === "panel") {
    bx(ctx, xc - 0.015, xc + 0.015, FRAME_H - 0.005, h - 0.055, z0 - 0.005, z1 + 0.005, paint, "tb");
    return;
  }
  slab(ctx, x0, x1, FRAME_H - 0.005, FRAME_H + 0.05, z0 - 0.005, z1 + 0.005, paint, 0.006);
  const span = z1 - z0, n = Math.max(3, Math.round(span / 0.09)), pitch = span / n, sw = 0.04;
  for (let i = 0; i < n; i++) {
    const cz = z0 + pitch * (i + 0.5);
    bx(ctx, xc - 0.01, xc + 0.01, FRAME_H + 0.045, h - 0.055, cz - sw / 2, cz + sw / 2, paint, "tb");
  }
}

// Upholstered headboard pad (finish2): full frame width, 7 cm thick, from the rail top to h. Its
// front overlaps 2 cm into the mattress so the two never share a face.
export function headPad(ctx, paint, mw, md, r, h) {
  const zo = -(md / 2 + r);
  slab(ctx, -(mw / 2 + r), mw / 2 + r, FRAME_H, h, zo, -md / 2 + 0.02, paint, 0.025);
  // a piped seam line a hand below the top
  slab(ctx, -(mw / 2 + r) + 0.03, mw / 2 + r - 0.03, h - 0.14, h - 0.12, -md / 2 + 0.015, -md / 2 + 0.032, paint, 0.005);
}

// Mattress: chamfered block on the rail top, inner footprint, shifted ox.
export function mattress(ctx, paint, mw, md, y0, t, ox) {
  const o = ox || 0;
  slab(ctx, o - mw / 2, o + mw / 2, y0, y0 + t, -md / 2, md / 2, paint, Math.min(0.03, t * 0.3));
}

// Duvet + pillows on a mattress top at yTop. alongX: the head is at −X (daybed) instead of −Z.
export function bedding(ctx, paint, mw, md, yTop, alongX, ox, lite) {
  const o = ox || 0;
  const L = alongX ? mw : md, W = alongX ? md : mw; // L head→foot, W across
  const pn = lite ? 1 : 2;
  const pw = Math.min(0.55, (W - 0.1 - (pn - 1) * 0.04) / pn), pd = Math.min(0.4, L * 0.2), ph = 0.1;
  const along = -L / 2 + 0.06 + pd / 2;
  for (let i = 0; i < pn; i++) {
    const across = (i - (pn - 1) / 2) * (pw + 0.04);
    if (alongX) pillow(ctx, paint, o + along, across, yTop, pw, pd, ph, true);
    else pillow(ctx, paint, o + across, along, yTop, pw, pd, ph, false);
  }
  const start = -L / 2 + 0.62, end = L / 2 + 0.03, ov = W / 2 + 0.03;
  if (alongX) {
    slab(ctx, o + start, o + end, yTop, yTop + 0.06, -W / 2 + 0.01, ov, paint, 0.025);
    if (!lite) slab(ctx, o + start, o + start + 0.16, yTop + 0.05, yTop + 0.085, -W / 2 + 0.03, ov - 0.02, paint, 0.012);
  } else {
    slab(ctx, o - ov, o + ov, yTop, yTop + 0.06, start, end, paint, 0.025);
    if (!lite) slab(ctx, o - ov + 0.02, o + ov - 0.02, yTop + 0.05, yTop + 0.085, start, start + 0.16, paint, 0.012);
  }
}

// ── parts ──────────────────────────────────────────────────────────────────
// single / double: rails on legs, headboard at −Z, mattress, bedding.
export function bed(ctx, C, s) {
  const mw = s.w, md = s.d, r = s.rail;
  // finish group: rails, legs, wood headboard
  rails(ctx, C.frame, mw, md, RAIL_Y0, FRAME_H, r);
  const corners = headWood(ctx, C.frame, mw, md, r, s.h, s.head);
  legs(ctx, C.frame, mw, md, r, corners);
  // mattress (fixed ticking)
  mattress(ctx, C.mattress, mw, md, FRAME_H, MAT_T);
  // finish2 group: pad, bedding
  if (s.head === "upholstered") headPad(ctx, C.soft, mw, md, r, s.h);
  if (s.bedding) bedding(ctx, C.soft, mw, md, FRAME_H + MAT_T, false);
}

// bunk: four posts to h, two decks, guard rails round the upper deck (ladder gap at the +X foot),
// hook-on ladder standing off the +X rail. The frame is shifted −LADDER/2 so the total footprint
// stays symmetric about x = 0.
export function bunk(ctx, C, s) {
  const mw = s.w, md = s.d, r = s.rail, ox = -LADDER / 2;
  const xo = mw / 2 + r, zo = md / 2 + r;
  const y2 = DECK2 - MAT_T; // upper mattress base 1.30
  const P = C.frame;
  // finish group
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, ox + sx * (xo - LEG / 2), sz * (zo - LEG / 2), 0, s.h, LEG, LEG, 0.005, P, { start: true, end: true });
  rails(ctx, P, mw, md, RAIL_Y0, FRAME_H, r, ox);
  rails(ctx, P, mw, md, y2 - 0.15, y2, r, ox);
  // guard bars: two heights, −X full length, both ends, +X up to the ladder gap
  const bt = 0.015, bh = 0.035, gapZ = md / 2 - 0.6;
  const zi = zo - LEG, xi = xo - LEG;
  for (const yb of [s.h - 0.17, s.h - 0.05]) {
    bx(ctx, ox - xo + LEG / 2 - bt, ox - xo + LEG / 2 + bt, yb, yb + bh, -zi - 0.005, zi + 0.005, P);
    bx(ctx, ox + xo - LEG / 2 - bt, ox + xo - LEG / 2 + bt, yb, yb + bh, -zi - 0.005, gapZ, P);
    bx(ctx, ox - xi - 0.005, ox + xi + 0.005, yb, yb + bh, -zo + LEG / 2 - bt, -zo + LEG / 2 + bt, P);
    bx(ctx, ox - xi - 0.005, ox + xi + 0.005, yb, yb + bh, zo - LEG / 2 - bt, zo - LEG / 2 + bt, P);
  }
  // mid bars under the guard on the −X side and head end (a lower rail the sleeper's knees meet)
  bx(ctx, ox - xo + LEG / 2 - bt, ox - xo + LEG / 2 + bt, y2 + 0.16, y2 + 0.195, -zi - 0.005, zi + 0.005, P);
  // ladder: two stiles standing off the +X rail, six rungs, two hooks onto the upper rail
  const sx0 = ox + xo + LADDER - 0.04, sx1 = ox + xo + LADDER;
  const lz0 = md / 2 - 0.5, lz1 = md / 2 - 0.12, st = 0.04;
  for (const lz of [lz0, lz1]) bx(ctx, sx0, sx1, 0, s.h - 0.03, lz - st / 2, lz + st / 2, P);
  const rungs = Math.max(3, Math.floor((s.h - 0.3) / 0.26));
  ctx.smooth();
  for (let i = 1; i <= rungs; i++) {
    const ry = i * 0.26;
    G.tube(ctx, [(sx0 + sx1) / 2, ry, lz0 + st / 2 - 0.005], [(sx0 + sx1) / 2, ry, lz1 - st / 2 + 0.005], 0.013, 0.013, 8, [0, 1, 0], P);
  }
  ctx.flat();
  for (const lz of [lz0, lz1]) bx(ctx, ox + xo - 0.005, sx0 + 0.005, y2 - 0.09, y2 - 0.03, lz - st / 2, lz + st / 2, P);
  // mattresses
  mattress(ctx, C.mattress, mw, md, FRAME_H, MAT_T, ox);
  mattress(ctx, C.mattress, mw, md, y2, MAT_T, ox);
  // finish2 group: bedding on both decks (lite: one pillow, no fold — the §1 large budget)
  if (s.bedding) {
    bedding(ctx, C.soft, mw, md, FRAME_H + MAT_T, false, ox, true);
    bedding(ctx, C.soft, mw, md, y2 + MAT_T, false, ox, true);
  }
}

// crib: four posts to h, base + top rails on all sides, vertical slats between, thin mattress,
// a small pillow and a folded blanket.
export function crib(ctx, C, s) {
  const mw = s.w, md = s.d, r = s.rail;
  const xo = mw / 2 + r, zo = md / 2 + r;
  const P = C.frame;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * (xo - r / 2), sz * (zo - r / 2), 0, s.h, r, r, 0.004, P, { start: true, end: true });
  rails(ctx, P, mw, md, FRAME_H - 0.06, FRAME_H, r);
  rails(ctx, P, mw, md, s.h - 0.065, s.h - 0.015, r);
  // slats: 2 cm square at ~7.5 cm pitch, overlapping 5 mm into both rails
  const y0 = FRAME_H - 0.005, y1 = s.h - 0.06, sw = 0.024, st = 0.02;
  const zi = zo - r, xi = xo - r;
  for (const sx of [-1, 1]) {
    const xc = sx * (xo - r / 2);
    const n = Math.max(3, Math.round((2 * zi) / 0.075)), pitch = (2 * zi) / n;
    for (let i = 0; i < n; i++) {
      const cz = -zi + pitch * (i + 0.5);
      bx(ctx, xc - st / 2, xc + st / 2, y0, y1, cz - sw / 2, cz + sw / 2, P, "tb");
    }
  }
  for (const sz of [-1, 1]) {
    const zc = sz * (zo - r / 2);
    const n = Math.max(3, Math.round((2 * xi) / 0.075)), pitch = (2 * xi) / n;
    for (let i = 0; i < n; i++) {
      const cx = -xi + pitch * (i + 0.5);
      bx(ctx, cx - sw / 2, cx + sw / 2, y0, y1, zc - st / 2, zc + st / 2, P, "tb");
    }
  }
  // mattress
  mattress(ctx, C.mattress, mw, md, FRAME_H, CRIB_MAT);
  // finish2 group: one small pillow at the head, a folded blanket over the foot
  if (s.bedding) {
    const yT = FRAME_H + CRIB_MAT;
    pillow(ctx, C.soft, 0, -md / 2 + 0.05 + 0.11, yT, Math.min(0.36, mw - 0.16), 0.22, 0.06, false);
    slab(ctx, -mw / 2 + 0.04, mw / 2 - 0.04, yT, yT + 0.03, md / 2 - 0.36, md / 2 - 0.03, C.soft, 0.012);
    slab(ctx, -mw / 2 + 0.07, mw / 2 - 0.07, yT + 0.025, yT + 0.05, md / 2 - 0.3, md / 2 - 0.09, C.soft, 0.01);
  }
}

// daybed: mattress along x, four posts to h, backs on −Z and both ends, open on +Z; the head
// end is −X (pillows there), the duvet runs along x.
export function daybed(ctx, C, s) {
  const mw = s.w, md = s.d, r = s.rail;
  const xo = mw / 2 + r, zo = md / 2 + r;
  const P = C.frame;
  rails(ctx, P, mw, md, RAIL_Y0, FRAME_H, r);
  if (s.head === "upholstered") {
    legs(ctx, P, mw, md, r, [[-1, -1], [1, -1], [-1, 1], [1, 1]]);
  } else {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * (xo - LEG / 2), sz * (zo - LEG / 2), 0, s.h, LEG, LEG, 0.005, P, { start: true, end: true });
    backFill(ctx, P, -(xo - LEG), xo - LEG, -zo + 0.005, -md / 2 - 0.005, s.h, s.head);
    sideFill(ctx, P, -xo + 0.005, -mw / 2 - 0.005, -(zo - LEG), zo - LEG, s.h, s.head);
    sideFill(ctx, P, mw / 2 + 0.005, xo - 0.005, -(zo - LEG), zo - LEG, s.h, s.head);
  }
  mattress(ctx, C.mattress, mw, md, FRAME_H, MAT_T);
  if (s.head === "upholstered") {
    // three pads: the long back and both ends, meeting at the back corners
    slab(ctx, -xo, xo, FRAME_H, s.h, -zo, -md / 2 + 0.02, C.soft, 0.025);
    slab(ctx, -xo, -mw / 2 + 0.02, FRAME_H, s.h, -md / 2 + 0.03, zo, C.soft, 0.025);
    slab(ctx, mw / 2 - 0.02, xo, FRAME_H, s.h, -md / 2 + 0.03, zo, C.soft, 0.025);
  }
  if (s.bedding) bedding(ctx, C.soft, mw, md, FRAME_H + MAT_T, true);
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "double";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    frame: M.finish(ctx, p.finish, D.finish),
    soft: M.finish(ctx, p.finish2, D.finish2),
    mattress: M.finish(ctx, "linen-grey", "linen-grey"),
  };
  if (part === "bunk") bunk(ctx, C, s);
  else if (part === "crib") crib(ctx, C, s);
  else if (part === "daybed") daybed(ctx, C, s);
  else bed(ctx, C, s);
}

export { PARTS, DEF, HEADS, size, dims, surface, manifest };
