// KIDS — HYLLA's children's-room family, ONE generator (09b §3.12).
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/kids.js",
//                params: { part: "toychest", finish: "sage", finish2: "birch" } }
//
// FRAMES (09b §1): `floor` parts (toychest, playtable, tent, lowshelf, bedrail) — origin ON THE GROUND
//   at the footprint centre, +Y up, front on +Z, body x ±w/2 · z ±d/2 · y 0→h. The `wall` part (hooks)
//   — origin at the BACK-BOTTOM centre: x ±w/2 · z 0→+d · y 0→+h, mountY 1.60.
//   `dims` = TOTAL extent (lid overhang, rope handles, pole tops past the canvas apex, chair backs).
// SCALE: kids' seat 0.30, play table 0.50, toy chest 0.45, tipi canvas apex 1.50, bed guard to 0.95.
//
//   part: "toychest"  0.87×0.42×0.45 sage box, birch lid + runners, rope handles, white star  (floor)
//   part: "playtable" 1.08×0.60×0.56 birch-top table 0.50 on sage legs + 2 chairs seat 0.30   (floor)
//   part: "tent"      1.21×1.15×1.70 five-pole canvas tipi, sage band + floor, flaps tied back  (floor)
//   part: "lowshelf"  0.80×0.30×0.80 forward-facing bookshelf, 3 birch ledges, 6 books         (floor)
//   part: "hooks"     0.60×0.06×0.08 birch rail with 4 sage peg hooks                          (wall 1.60)
//   part: "bedrail"   0.90×0.45×0.95 bed guard: birch posts + arms, sage slats 0.55–0.95       (floor)
//
// PARAMS: w d h (toychest) · open bool (toychest lid up 100°) · w h (playtable top; square) · chairs
//   0–2 · w h (tent ⌀ and canvas apex) · sides 5|6 (tent poles) · w d h (lowshelf) · ledges 2–4 ·
//   books bool · w (hooks rail) · n 2–6 (hooks) · w (bedrail) · finish = the COLOUR: body, legs,
//   pegs, slats, tent band + floor (family default **sage**; white | hylla-yellow are the other
//   pictures) · finish2 = the WOOD: lid, tops, seats, ledges, poles, rail, posts (default **birch**).
//   Tent canvas, rope (linen-oat), the star and the book spines (white / hylla-yellow / hylla-blue) are fixed.
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — every face of `finish`, then every face of `finish2`, then the
//   fixed paints (canvas · linen-oat · white · hylla-yellow · hylla-blue). No glass, no glow.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("scripts/lib/geom.js");
const M = require("lib/home-mat.js");

const PARTS = ["toychest", "playtable", "tent", "lowshelf", "hooks", "bedrail"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  toychest: { w: 0.8, d: 0.4, h: 0.45, open: false, finish: "sage", finish2: "birch" },
  playtable: { w: 0.6, h: 0.5, chairs: 2, finish: "sage", finish2: "birch" },
  tent: { w: 1.2, h: 1.5, sides: 5, finish: "sage", finish2: "birch" },
  lowshelf: { w: 0.8, d: 0.3, h: 0.8, ledges: 3, books: true, finish: "sage", finish2: "birch" },
  hooks: { w: 0.6, n: 4, finish: "sage", finish2: "birch" },
  bedrail: { w: 0.9, finish: "sage", finish2: "birch" },
};

const MOUNT = {
  toychest: { mount: "floor", mountY: 0 },
  playtable: { mount: "floor", mountY: 0 },
  tent: { mount: "floor", mountY: 0 },
  lowshelf: { mount: "floor", mountY: 0 },
  hooks: { mount: "wall", mountY: 1.6 },
  bedrail: { mount: "floor", mountY: 0 },
};

const D2R = Math.PI / 180;
const ROPE_OUT = 0.035; // toychest rope handles stand this far off each end
const LID_OVER = 0.01; // lid overhang per side
const CHAIR = { seat: 0.3, size: 0.3, back: 0.56, tuck: 0.06 }; // kids' chair
const POLE_R = 0.014, POLE_PAST = 0.2, POLE_OUT = 0.02; // tipi poles: radius, run past the apex, outside the canvas
const RAIL = { d: 0.02, h: 0.08, peg: 0.04 }; // hooks rail
const GUARD = { post: 0.04, arm: 0.45, top: 0.95, lo: 0.55, frame: 0.35 }; // bed guard

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}
export function bool(v, d) {
  return v === undefined ? !!d : !!v;
}

// Resolved size params for a part (what geometry() builds and what manifest() reports).
function size(part, p) {
  const D = DEF[part] || DEF.toychest;
  p = p || {};
  const s = { part: part };
  if (part === "toychest") {
    s.w = clamp(num(p.w, D.w), 0.5, 1.2);
    s.d = clamp(num(p.d, D.d), 0.3, 0.6);
    s.h = clamp(num(p.h, D.h), 0.3, 0.7);
    s.open = bool(p.open, D.open);
    s.lidT = 0.03;
    const lidLen = s.d + 2 * LID_OVER;
    // total extents: rope handles on the ends, lid overhang, an open lid rising past the back
    s.wTotal = s.w + 2 * ROPE_OUT;
    s.dTotal = s.open ? s.d + 2 * LID_OVER + lidLen * Math.cos(80 * D2R) : s.d + 2 * LID_OVER;
    s.hTotal = s.open ? s.h - s.lidT + lidLen * Math.sin(80 * D2R) : s.h;
  } else if (part === "playtable") {
    s.w = clamp(num(p.w, D.w), 0.5, 0.9);
    s.d = s.w;
    s.h = clamp(num(p.h, D.h), 0.42, 0.6);
    s.chairs = clamp(Math.round(num(p.chairs, D.chairs)), 0, 2);
    s.chairX = s.w / 2 - CHAIR.tuck + CHAIR.size / 2; // chair seat centre
    s.wTotal = s.chairs > 0 ? 2 * (s.chairX + CHAIR.size / 2) : s.w;
    s.hTotal = s.chairs > 0 ? Math.max(s.h, CHAIR.back) : s.h;
  } else if (part === "tent") {
    s.w = clamp(num(p.w, D.w), 0.9, 1.8);
    s.h = clamp(num(p.h, D.h), 1.1, 2.0);
    s.sides = clamp(Math.round(num(p.sides, D.sides)), 5, 6);
    s.R = s.w / 2;
    // true extents from the point set the emitter uses (pole tops, feet, folded flaps)
    const T = tentPoints(s);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y1 = 0;
    const eat = (Q, r) => {
      x0 = Math.min(x0, Q[0] - r); x1 = Math.max(x1, Q[0] + r);
      z0 = Math.min(z0, Q[2] - r); z1 = Math.max(z1, Q[2] + r);
      y1 = Math.max(y1, Q[1] + r);
    };
    for (const pl of T.poles) { eat(pl.foot, POLE_R); eat(pl.top, POLE_R); }
    for (const fl of T.flaps) { eat(fl.mb, 0); eat(fl.mt, 0); }
    s.wTotal = Math.max(x1 - x0, 2 * Math.max(-x0, x1));
    s.dTotal = z1 - z0;
    s.zCentre = (z0 + z1) / 2;
    s.hTotal = y1;
  } else if (part === "lowshelf") {
    s.w = clamp(num(p.w, D.w), 0.5, 1.2);
    s.d = clamp(num(p.d, D.d), 0.22, 0.4);
    s.h = clamp(num(p.h, D.h), 0.5, 1.2);
    s.ledges = clamp(Math.round(num(p.ledges, D.ledges)), 2, 4);
    s.books = bool(p.books, D.books);
  } else if (part === "hooks") {
    s.w = clamp(num(p.w, D.w), 0.3, 1.2);
    s.n = clamp(Math.round(num(p.n, D.n)), 2, 6);
    s.d = RAIL.d + RAIL.peg;
    s.h = RAIL.h;
  } else {
    // bedrail
    s.w = clamp(num(p.w, D.w), 0.6, 1.4);
    s.d = GUARD.arm;
    s.h = GUARD.top;
  }
  return s;
}

// [w, d, hTotal] in the part's frame — the catalog's `dims` (total extent law).
function dims(part, p) {
  const s = size(part, p);
  if (part === "toychest") return [s.wTotal, s.dTotal, s.hTotal];
  if (part === "playtable") return [s.wTotal, s.d, s.hTotal];
  if (part === "tent") return [s.wTotal, s.dTotal, s.hTotal];
  return [s.w, s.d, s.h];
}

// Functional top a `top` row can sit at (0 = none).
function surface(part, p) {
  const s = size(part, p);
  if (part === "toychest") return s.open ? 0 : s.h;
  if (part === "playtable") return s.h;
  if (part === "lowshelf") return s.h;
  return 0;
}

function mountOf(part) {
  return MOUNT[part] || MOUNT.toychest;
}

function manifest() {
  const parts = {};
  const add = (key, part, p) => {
    const m = mountOf(part);
    parts[key] = { part: part, dims: dims(part, p), surface: surface(part, p), mount: m.mount, mountY: m.mountY, defaults: Object.assign({}, DEF[part], p) };
  };
  for (const k of PARTS) add(k, k, {});
  add("toychest-open", "toychest", { open: true });
  add("playtable-solo", "playtable", { chairs: 0 });
  add("tent-6", "tent", { sides: 6 });
  return { family: "kids", script: "scripts/asset-library/gen-home/kids.js", parts };
}

// ── emitters (townscape.js pattern) ─────────────────────────────────────────
export function qd(ctx, paint, a, b, c, d) {
  if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
}

export function tr(ctx, paint, a, b, c) {
  if (paint) paint((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
  ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
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

// Chamfered slab — tops, lids, ledges. 0.008 is the furniture bevel.
export function slab(ctx, x0, x1, y0, y1, z0, z1, paint, bevel) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.008, paint);
}

// A rigid frame: R = Ry(yaw)·Rx(pitch)·Rz(roll), then translate. Degrees. +pitch tips +Y toward +Z.
export function xf(px, py, pz, yaw, pitch, roll) {
  const cy = Math.cos((yaw || 0) * D2R), sy = Math.sin((yaw || 0) * D2R);
  const cp = Math.cos((pitch || 0) * D2R), sp = Math.sin((pitch || 0) * D2R);
  const cr = Math.cos((roll || 0) * D2R), sr = Math.sin((roll || 0) * D2R);
  const m = [
    cy * cr + sy * sp * sr, -cy * sr + sy * sp * cr, sy * cp,
    cp * sr, cp * cr, -sp,
    -sy * cr + cy * sp * sr, sy * sr + cy * sp * cr, cy * cp,
  ];
  const f = (x, y, z) => [
    px + m[0] * x + m[1] * y + m[2] * z,
    py + m[3] * x + m[4] * y + m[5] * z,
    pz + m[6] * x + m[7] * y + m[8] * z,
  ];
  f.dir = (x, y, z) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
  return f;
}

// A box in an arbitrary frame: centre o, half-extents h (both local). Same skip letters as bx.
export function fbox(ctx, f, o, h, paint, skip) {
  const s = skip || "";
  const P = (sx, sy, sz) => f(o[0] + sx * h[0], o[1] + sy * h[1], o[2] + sz * h[2]);
  const ppp = P(1, 1, 1), ppn = P(1, 1, -1), pnp = P(1, -1, 1), pnn = P(1, -1, -1);
  const npp = P(-1, 1, 1), npn = P(-1, 1, -1), nnp = P(-1, -1, 1), nnn = P(-1, -1, -1);
  if (s.indexOf("f") < 0) qd(ctx, paint, nnp, pnp, ppp, npp);
  if (s.indexOf("k") < 0) qd(ctx, paint, pnn, nnn, npn, ppn);
  if (s.indexOf("r") < 0) qd(ctx, paint, pnp, pnn, ppn, ppp);
  if (s.indexOf("l") < 0) qd(ctx, paint, nnn, nnp, npp, npn);
  if (s.indexOf("t") < 0) qd(ctx, paint, npp, ppp, ppn, npn);
  if (s.indexOf("b") < 0) qd(ctx, paint, nnn, pnn, pnp, nnp);
}

// Chamfered slab in a frame (an open lid): local x0..x1 × y0..y1 × z0..z1 lofted through f.
export function fslab(ctx, f, x0, x1, y0, y1, z0, z1, bevel, paint) {
  const b = Math.min(bevel, (x1 - x0) / 3, (y1 - y0) / 3, (z1 - z0) / 3);
  const poly = G.rrect(x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, b);
  const inner = G.rrect(x1 - x0 - 2 * b, y1 - y0 - 2 * b, (x0 + x1) / 2, (y0 + y1) / 2, b);
  const F = (z, pl) => ({ c: f(0, 0, z), f: f.dir(0, 0, 1), up: f.dir(0, 1, 0), poly: pl });
  G.loftFrames(ctx, [F(z0, inner), F(z0 + b, poly), F(z1 - b, poly), F(z1, inner)], paint);
}

// Round rod between two points, smooth-shaded, capped both ends unless told otherwise.
export function rod(ctx, A, B, r, sides, paint, caps) {
  const c = caps || {};
  const f = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const up = Math.abs(f[1]) > Math.abs(f[0]) + Math.abs(f[2]) ? [0, 0, -1] : [0, 1, 0];
  ctx.smooth();
  G.loftFrames(
    ctx,
    [
      { c: A, f: f, up: up, poly: G.oval(r * 2, r * 2, 0, 0, sides, 1) },
      { c: B, f: f, up: up, poly: G.oval(r * 2, r * 2, 0, 0, sides, 1) },
    ],
    paint,
    { capStart: c.start !== false, capEnd: c.end !== false }
  );
  ctx.flat();
}

// Vertical chamfered post between two footprints (legs).
export function post(ctx, x, z, y0, y1, w0, d0, w1, d1, bevel, paint, caps) {
  const c = caps || {};
  G.loftFrames(
    ctx,
    [
      { c: [x, y0, z], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w0, d0, 0, 0, bevel) },
      { c: [x, y1, z], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w1, d1, 0, 0, bevel) },
    ],
    paint,
    { capStart: c.start !== false, capEnd: c.end === true }
  );
}

// Rotate Q about the axis through O with unit direction u by `ang` radians (Rodrigues).
export function rotAbout(Q, O, u, ang) {
  const v = [Q[0] - O[0], Q[1] - O[1], Q[2] - O[2]];
  const c = Math.cos(ang), s = Math.sin(ang);
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return [
    O[0] + v[0] * c + cr[0] * s + u[0] * dot * (1 - c),
    O[1] + v[1] * c + cr[1] * s + u[1] * dot * (1 - c),
    O[2] + v[2] * c + cr[2] * s + u[2] * dot * (1 - c),
  ];
}

export function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// ── parts ──────────────────────────────────────────────────────────────────
// Toy chest: chamfered colour box on two birch runners, birch lid overhanging 1 cm (hinged at the
// back, `open` lifts it 100°), a rope loop on each end, a white star on the front.
export function toychest(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h, t = s.lidT;
  const yBody = h - t;
  // finish group (colour): the body
  G.boxZ(ctx, -w / 2, w / 2, 0.04, yBody, -d / 2, d / 2, 0.006, C.a);
  // finish2 group (wood): runners, lid
  bx(ctx, -w / 2 + 0.03, w / 2 - 0.03, 0, 0.04, -d / 2 + 0.02, -d / 2 + 0.06, C.b, "t");
  bx(ctx, -w / 2 + 0.03, w / 2 - 0.03, 0, 0.04, d / 2 - 0.06, d / 2 - 0.02, C.b, "t");
  if (!s.open) slab(ctx, -w / 2 - LID_OVER, w / 2 + LID_OVER, yBody, h, -d / 2 - LID_OVER, d / 2 + LID_OVER, C.b);
  else {
    const f = xf(0, yBody, -d / 2 - LID_OVER, 0, -100, 0); // hinge at the back edge; +Z local swings up and back
    fslab(ctx, f, -w / 2 - LID_OVER, w / 2 + LID_OVER, 0, t, 0, d + 2 * LID_OVER, 0.008, C.b);
  }
  // fixed: rope loops (linen-oat), then the star (white)
  const yr = yBody * 0.62;
  for (const sx of [-1, 1]) {
    const x0 = sx * w / 2, x1 = sx * (w / 2 + ROPE_OUT - 0.008);
    ctx.smooth();
    G.polyTube(ctx, [[x0, yr + 0.01, -0.07], [x1, yr - 0.03, -0.055], [x1, yr - 0.03, 0.055], [x0, yr + 0.01, 0.07]], 0.008, 6, [0, 1, 0], C.rope);
    ctx.flat();
  }
  const cx = 0, cy = yBody * 0.5, zs = d / 2 + 0.002, R1 = Math.min(0.08, yBody * 0.22), R2 = R1 * 0.42;
  const S = (i) => {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 === 0 ? R1 : R2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, zs];
  };
  for (let i = 0; i < 10; i++) tr(ctx, C.white, [cx, cy, zs], S(i), S(i + 1));
}

// Play table: square birch top on four colour legs, plus `chairs` little chairs tucked in at ±X
// facing the table (seat 0.30, back 0.56).
export function playtable(ctx, C, s) {
  const w = s.w, h = s.h, t = 0.025;
  // finish group (colour): table legs, chair frames
  const li = 0.06, lw = 0.04;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * (w / 2 - li), sz * (w / 2 - li), 0, h - t - 0.002, lw, lw, lw, lw, 0.004, C.a);
  const chairs = [];
  if (s.chairs >= 1) chairs.push(xf(s.chairX, 0, 0, -90, 0, 0)); // at +X, facing −X
  if (s.chairs >= 2) chairs.push(xf(-s.chairX, 0, 0, 90, 0, 0)); // at −X, facing +X
  const hs = CHAIR.size / 2, ls = 0.015, li2 = 0.03;
  for (const f of chairs) {
    // legs: front pair to the seat, back pair up to the back rail
    for (const sx of [-1, 1]) {
      fbox(ctx, f, [sx * (hs - li2), (CHAIR.seat - 0.02) / 2, hs - li2], [ls, (CHAIR.seat - 0.02) / 2, ls], C.a, "t");
      fbox(ctx, f, [sx * (hs - li2), CHAIR.back / 2, -(hs - li2)], [ls, CHAIR.back / 2, ls], C.a);
    }
  }
  // finish2 group (wood): table top, chair seats + back panels
  slab(ctx, -w / 2, w / 2, h - t, h, -w / 2, w / 2, C.b);
  for (const f of chairs) {
    fbox(ctx, f, [0, CHAIR.seat - 0.01, 0], [hs, 0.01, hs], C.b);
    fbox(ctx, f, [0, CHAIR.back - 0.09, -(hs - li2)], [hs - li2 - ls, 0.06, 0.008], C.b);
  }
}

// The tipi's point set — shared by size() (true extents) and tent() (the emitter): canvas foot ring
// B[0..N], apex A, door lintel E0/E1, pole feet + tops, and the two door flaps folded back 95°
// about their pole edges toward the neighbouring panels.
export function tentPoints(s) {
  const N = s.sides, R = s.R, H = s.h;
  const P = (a, r, y) => [Math.cos(a) * r, y, -Math.sin(a) * r];
  const ang = (i) => (-90 - 180 / N + (360 / N) * i) * D2R; // panel 0 centred on +Z
  const A = [0, H, 0];
  const B = [];
  for (let i = 0; i <= N; i++) B.push(P(ang(i), R, 0));
  const poles = [];
  for (let i = 0; i < N; i++) {
    const foot = P(ang(i), R + POLE_OUT, 0);
    const dir = [A[0] - foot[0], A[1] - foot[1], A[2] - foot[2]];
    const L = Math.hypot(dir[0], dir[1], dir[2]);
    poles.push({ foot: foot, top: [A[0] + (dir[0] / L) * POLE_PAST, A[1] + (dir[1] / L) * POLE_PAST, A[2] + (dir[2] / L) * POLE_PAST] });
  }
  const yd = Math.min(0.95, H * 0.62);
  const E0 = lerp3(B[0], A, yd / H), E1 = lerp3(B[1], A, yd / H);
  const Mb = lerp3(B[0], B[1], 0.5), Mt = lerp3(E0, E1, 0.5);
  const rad = (Q) => Math.hypot(Q[0], Q[2]);
  const flap = (Bp, Ep) => {
    const u = [Ep[0] - Bp[0], Ep[1] - Bp[1], Ep[2] - Bp[2]];
    const L = Math.hypot(u[0], u[1], u[2]);
    u[0] /= L; u[1] /= L; u[2] /= L;
    // fold the free edge INWARD (tied back inside, 18° off the neighbouring panel — no z-fight, no
    // footprint growth): the rotation sense that carries it closer to the axis
    const k = rad(rotAbout(Mb, Bp, u, 70 * D2R)) < rad(rotAbout(Mb, Bp, u, -70 * D2R)) ? 1 : -1;
    const mb = rotAbout(Mb, Bp, u, k * 90 * D2R), mt = rotAbout(Mt, Bp, u, k * 90 * D2R);
    mb[1] = Math.max(mb[1], 0.004); // the slanted hinge would dip the ground corner 3 cm under
    return { B: Bp, E: Ep, mb: mb, mt: mt };
  };
  return { N: N, A: A, B: B, poles: poles, E0: E0, E1: E1, flaps: [flap(B[0], E0), flap(B[1], E1)] };
}

// Tipi: `sides` birch poles crossing above a canvas cone (apex at h), door on +Z with both flaps
// folded back, a colour band round the base and a colour floor inside.
export function tent(ctx, C, s) {
  const T = tentPoints(s);
  const N = T.N, H = s.h, A = T.A, B = T.B;
  const out = (Q, e) => {
    const r = Math.hypot(Q[0], Q[2]);
    return r < 1e-6 ? Q : [Q[0] * (1 + e / r), Q[1], Q[2] * (1 + e / r)];
  };
  // finish group (colour): floor, band on the closed panels
  for (let i = 0; i < N; i++) tr(ctx, C.a, out(B[i], -0.02), out(B[i + 1], -0.02), [0, 0.006, 0]);
  const y0 = 0.28, y1 = 0.4;
  for (let i = 1; i < N; i++) {
    const b0 = out(lerp3(B[i], A, y0 / H), 0.004), b1 = out(lerp3(B[i + 1], A, y0 / H), 0.004);
    const t0 = out(lerp3(B[i], A, y1 / H), 0.004), t1 = out(lerp3(B[i + 1], A, y1 / H), 0.004);
    qd(ctx, C.a, b0, b1, t1, t0);
  }
  // finish2 group (wood): poles from outside the canvas foot, through the apex, POLE_PAST beyond
  for (const pl of T.poles) rod(ctx, pl.foot, pl.top, POLE_R, 8, C.b);
  // fixed (canvas): closed panels both windings, door lintel, two folded flaps
  for (let i = 1; i < N; i++) {
    tr(ctx, C.canvas, B[i], B[i + 1], A);
    tr(ctx, C.canvas, B[i + 1], B[i], A);
  }
  tr(ctx, C.canvas, T.E0, T.E1, A);
  tr(ctx, C.canvas, T.E1, T.E0, A);
  for (const fl of T.flaps) {
    qd(ctx, C.canvas, fl.B, fl.mb, fl.mt, fl.E); // both windings — a sheet seen from both sides
    qd(ctx, C.canvas, fl.mb, fl.B, fl.E, fl.mt);
  }
}

// Forward-facing bookshelf: colour carcass (sides, back, base, top) with `ledges` birch shelves,
// each with a front lip; `books` leans two spines on every ledge (white / yellow / blue).
export function lowshelf(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h, t = 0.018;
  // finish group (colour): sides, back, base, top
  bx(ctx, -w / 2, -w / 2 + t, 0, h - t, -d / 2, d / 2, C.a);
  bx(ctx, w / 2 - t, w / 2, 0, h - t, -d / 2, d / 2, C.a);
  bx(ctx, -w / 2 + t, w / 2 - t, 0.02, h - t, -d / 2, -d / 2 + 0.012, C.a, "lr");
  bx(ctx, -w / 2 + t, w / 2 - t, 0.02, 0.02 + t, -d / 2 + 0.012, d / 2 - 0.02, C.a, "lrk");
  // finish2 group (wood): top, ledges + lips
  slab(ctx, -w / 2, w / 2, h - t, h, -d / 2, d / 2, C.b, 0.006);
  const inner = h - t - 0.02 - t;
  const pitch = inner / s.ledges;
  const lipH = 0.05, sd = d - 0.012 - 0.02;
  const ledgeY = [];
  for (let i = 1; i < s.ledges; i++) {
    const y = 0.02 + t + pitch * i;
    ledgeY.push(y);
    bx(ctx, -w / 2 + t, w / 2 - t, y - t, y, -d / 2 + 0.012, d / 2 - 0.02, C.b, "lrk");
  }
  ledgeY.unshift(0.02 + t);
  for (const y of ledgeY) bx(ctx, -w / 2 + t, w / 2 - t, y, y + lipH, d / 2 - 0.035, d / 2 - 0.02, C.b, "lrb");
  // fixed: book spines leaning back 12° against the back panel, alternating white / yellow / blue
  if (!s.books) return;
  const bw = Math.min(0.17, (w - 2 * t - 0.12) / 2), bh = Math.min(0.22, pitch - 0.06), bt = 0.012;
  const paints = [C.white, C.yellow, C.blue];
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < ledgeY.length; i++) {
      for (let j = 0; j < 2; j++) {
        if ((i * 2 + j) % 3 !== k) continue;
        const x = (j === 0 ? -1 : 1) * (bw / 2 + 0.03);
        const f = xf(x, ledgeY[i], d / 2 - 0.035 - 0.004, 0, -12, 0);
        fbox(ctx, f, [0, bh / 2, -bt / 2], [bw / 2, bh / 2, bt / 2], paints[k], "b");
      }
    }
  }
}

// Coat hooks (wall frame: back-bottom origin): chamfered birch rail, `n` colour peg hooks with
// knob ends standing +Z off the rail.
export function hooks(ctx, C, s) {
  const w = s.w, n = s.n;
  // finish group (colour): pegs
  const pitch = w / (n + 1);
  const y = RAIL.h * 0.55;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + pitch * (i + 1);
    const F = (z, r) => ({ c: [x, y, z], f: [0, 0, 1], up: [0, 1, 0], poly: G.oval(r * 2, r * 2, 0, 0, 6, 1) });
    ctx.smooth();
    G.loftFrames(ctx, [F(RAIL.d - 0.002, 0.008), F(RAIL.d + RAIL.peg - 0.014, 0.008), F(RAIL.d + RAIL.peg - 0.012, 0.014), F(RAIL.d + RAIL.peg, 0.014)], C.a, { capStart: false, capEnd: true });
    ctx.flat();
  }
  // finish2 group (wood): the rail
  G.boxZ(ctx, -w / 2, w / 2, 0, RAIL.h, 0, RAIL.d, 0.004, C.b);
}

// Bed guard: two birch posts with flat arms that slide under a mattress (frame height 0.35), birch
// top and bottom rails, colour slats between 0.55 and 0.95. Front (+Z) is the room side.
export function bedrail(ctx, C, s) {
  const w = s.w, p = GUARD.post, zf = GUARD.arm / 2; // panel plane centred so the arms reach −d/2
  const xp = w / 2 - p / 2;
  // finish group (colour): slats
  const n = Math.max(4, Math.round((w - 2 * p) / 0.12));
  const span = w - 2 * p - 0.03, sw = 0.03;
  const gap = (span - n * sw) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + p + 0.015 + i * (sw + gap);
    bx(ctx, x0, x0 + sw, GUARD.lo + 0.03, GUARD.top - 0.03, zf - p + 0.012, zf - 0.012, C.a, "tb");
  }
  // finish2 group (wood): posts, arms, rails, feet pads
  for (const sx of [-1, 1]) {
    post(ctx, sx * xp, zf - p / 2, 0, GUARD.top, p, p, p, p, 0.004, C.b, { end: true });
    bx(ctx, sx * xp - p / 2, sx * xp + p / 2, GUARD.frame, GUARD.frame + 0.03, -zf, zf - p, C.b, "f");
  }
  bx(ctx, -xp + p / 2, xp - p / 2, GUARD.lo, GUARD.lo + 0.03, zf - p, zf, C.b, "lr");
  bx(ctx, -xp + p / 2, xp - p / 2, GUARD.top - 0.03, GUARD.top, zf - p, zf, C.b, "lr");
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "toychest";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    a: M.finish(ctx, p.finish, D.finish), // the colour
    b: M.finish(ctx, p.finish2, D.finish2), // the wood
    canvas: M.finish(ctx, "canvas", "canvas"),
    rope: M.finish(ctx, "linen-oat", "linen-oat"),
    white: M.finish(ctx, "white", "white"),
    yellow: M.finish(ctx, "hylla-yellow", "hylla-yellow"),
    blue: M.finish(ctx, "hylla-blue", "hylla-blue"),
  };
  if (part === "playtable") playtable(ctx, C, s);
  else if (part === "tent") tent(ctx, C, s);
  else if (part === "lowshelf") lowshelf(ctx, C, s);
  else if (part === "hooks") hooks(ctx, C, s);
  else if (part === "bedrail") bedrail(ctx, C, s);
  else toychest(ctx, C, s);
}

export { PARTS, DEF, MOUNT, size, dims, surface, mountOf, manifest };
