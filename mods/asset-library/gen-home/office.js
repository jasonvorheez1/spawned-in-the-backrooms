// OFFICE — HYLLA's office family, ONE generator (09b §3.11). Everything for the home desk.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/office.js",
//                params: { part: "filing", drawers: 2, finish: "black", finish2: "oak" } }
//
// FRAMES (09b §1): `floor` parts (return, filing) — origin ON THE GROUND at the footprint centre, +Y
//   up, front on +Z, body x ±w/2 · z ±d/2 · y 0→h. `top` parts (monitor, mat, laptop) — feet at y 0,
//   footprint centre, front +Z; the layout adds the host's `surface` (the SKRIVBO desk's 0.75). The
//   `wall` part (pinboard) — origin at the BACK-BOTTOM centre: x ±w/2 · z 0→+d · y 0→+h, mountY 1.30.
//   `dims` = TOTAL extent (handle bars, the leaning laptop lid, pins on the board all count).
// SCALE: desk return top 0.75, filing 0.72 | 1.32, 27" monitor 0.62 wide topping 0.45, laptop 13".
//
//   part: "return"    1.20×0.60×0.75 desk return: oak top, black frame, 3-drawer pedestal    (floor)
//   part: "filing"    0.40×0.57 × 0.72|1.32, drawers 2|4, oak fronts on a black carcass       (floor)
//   part: "monitor"   0.62×0.37×0.45 27" screen on a black riser + oak foot, oak keyboard     (top)
//   part: "pinboard"  0.90×0.034×0.60 cork in an oak frame, 5 pinned notes                   (wall 1.30)
//   part: "mat"       0.80×0.40×0.022 leather desk mat + oak pen tray, pen + pencil            (top)
//   part: "laptop"    0.32×0.29×0.21 13" laptop open 110°                                      (top)
//
// PARAMS: w d h (return) · drawers 1–5 (filing) · w (monitor screen width: 0.545 = 24", 0.62 = 27",
//   0.73 = 32"; h = total height) · keyboard bool (monitor) · notes 0–6 (pinboard) · tray bool (mat) ·
//   open 90–130 (laptop lid angle, degrees) · lit bool (monitor, laptop → glowing screen, LAST group;
//   shipped rows leave it false) · finish = FRAME / carcass / body (family default **black**; pinboard
//   defaults `cardboard` = the cork, mat defaults `leather-black`) · finish2 = the WOOD accents: tops,
//   drawer fronts, monitor foot + keyboard deck, pinboard frame, pen tray (family default **oak**;
//   unused on laptop, named for the contract). Steel handles, white notes, yellow/blue pins are fixed.
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — every face of `finish`, then every face of `finish2`, then the
//   fixed paints (steel · white · hylla-yellow · hylla-blue), then glow LAST when `lit`.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("scripts/lib/geom.js");
const M = require("lib/home-mat.js");

const PARTS = ["return", "filing", "monitor", "pinboard", "mat", "laptop"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  return: { w: 1.2, d: 0.6, h: 0.75, finish: "black", finish2: "oak" },
  filing: { w: 0.4, d: 0.55, drawers: 2, finish: "black", finish2: "oak" },
  monitor: { w: 0.62, h: 0.45, keyboard: true, lit: false, finish: "black", finish2: "oak" },
  pinboard: { w: 0.9, h: 0.6, notes: 5, finish: "cardboard", finish2: "oak" },
  mat: { w: 0.8, d: 0.4, tray: true, finish: "leather-black", finish2: "oak" },
  laptop: { w: 0.32, open: 110, lit: false, finish: "black", finish2: "oak" },
};

// Mount per part (09b §1 frames); the pinboard is the one wall row.
const MOUNT = {
  return: { mount: "floor", mountY: 0 },
  filing: { mount: "floor", mountY: 0 },
  monitor: { mount: "top", mountY: 0 },
  pinboard: { mount: "wall", mountY: 1.3 },
  mat: { mount: "top", mountY: 0 },
  laptop: { mount: "top", mountY: 0 },
};

const D2R = Math.PI / 180;
const KEYB_W = 0.44, KEYB_D = 0.14; // the monitor's keyboard footprint
const PIN_D = 0.034; // pinboard total depth with notes + pins (board alone 0.03)

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
  const D = DEF[part] || DEF.filing;
  p = p || {};
  const s = { part: part };
  if (part === "return") {
    s.w = clamp(num(p.w, D.w), 0.8, 1.8);
    s.d = clamp(num(p.d, D.d), 0.5, 0.8);
    s.h = clamp(num(p.h, D.h), 0.6, 0.8);
  } else if (part === "filing") {
    s.drawers = clamp(Math.round(num(p.drawers, D.drawers)), 1, 5);
    s.w = clamp(num(p.w, D.w), 0.35, 0.5);
    s.d = clamp(num(p.d, D.d), 0.45, 0.65);
    s.h = 0.12 + 0.3 * s.drawers; // 2 → 0.72, 4 → 1.32
  } else if (part === "monitor") {
    s.w = clamp(num(p.w, D.w), 0.45, 0.9);
    s.sh = s.w * 0.6; // 16:10 panel incl. bezel
    s.h = clamp(num(p.h, D.h), s.sh + 0.06, 0.75);
    s.keyboard = bool(p.keyboard, D.keyboard);
    s.lit = bool(p.lit, D.lit);
    // z layout: foot plate ±0.10 about zb, keyboard 0.13..0.27 in front → total 0.37, centred
    s.zb = s.keyboard ? -0.085 : 0;
    s.d = s.keyboard ? 0.37 : 0.2;
    s.wTotal = s.keyboard ? Math.max(s.w, KEYB_W) : s.w;
  } else if (part === "pinboard") {
    s.w = clamp(num(p.w, D.w), 0.4, 1.8);
    s.h = clamp(num(p.h, D.h), 0.3, 1.2);
    s.notes = clamp(Math.round(num(p.notes, D.notes)), 0, 6);
    s.d = s.notes > 0 ? PIN_D : 0.03;
  } else if (part === "mat") {
    s.w = clamp(num(p.w, D.w), 0.4, 1.2);
    s.d = clamp(num(p.d, D.d), 0.25, 0.6);
    s.tray = bool(p.tray, D.tray);
    s.h = s.tray ? 0.022 : 0.004;
  } else {
    // laptop
    s.w = clamp(num(p.w, D.w), 0.28, 0.4);
    s.base = s.w * 0.6875; // 0.32 → 0.22
    s.open = clamp(num(p.open, D.open), 90, 130);
    s.lit = bool(p.lit, D.lit);
    s.lidH = s.base - 0.012;
    const lean = (s.open - 90) * D2R; // lid past vertical, leaning back (−Z)
    s.overhang = Math.sin(lean) * s.lidH + 0.004; // how far the lid top reaches behind the hinge
    s.hingeZ = -s.base / 2 + 0.006;
    s.d = s.base + Math.max(0, s.overhang - 0.006); // total footprint incl. the lid
    s.zShift = (s.d - s.base) / 2; // centre the TOTAL extent on z 0
    s.h = 0.016 + Math.cos(lean) * s.lidH + Math.sin(lean) * 0.004;
  }
  return s;
}

// [w, d, hTotal] in the part's frame — the catalog's `dims` (total extent law).
function dims(part, p) {
  const s = size(part, p);
  if (part === "filing") return [s.w, s.d + 0.02, s.h]; // handle bars stand 2 cm proud
  if (part === "monitor") return [s.wTotal, s.d, s.h];
  return [s.w, s.d, s.h];
}

// Functional top a `top` row can sit at (0 = none).
function surface(part, p) {
  const s = size(part, p);
  return part === "return" || part === "filing" ? s.h : 0;
}

function mountOf(part) {
  return MOUNT[part] || MOUNT.filing;
}

function manifest() {
  const parts = {};
  const add = (key, part, p) => {
    const m = mountOf(part);
    parts[key] = { part: part, dims: dims(part, p), surface: surface(part, p), mount: m.mount, mountY: m.mountY, defaults: Object.assign({}, DEF[part], p) };
  };
  for (const k of PARTS) add(k, k, {});
  add("filing-4", "filing", { drawers: 4 });
  add("monitor-24", "monitor", { w: 0.545 });
  add("monitor-32", "monitor", { w: 0.73, h: 0.52 });
  return { family: "office", script: "scripts/asset-library/gen-home/office.js", parts };
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

// Chamfered slab — tops, foot plates, the mat. 0.008 is the furniture bevel.
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

// One quad in a frame (local corners a→d, CCW seen from the face's outside).
export function fq(ctx, f, paint, a, b, c, d) {
  qd(ctx, paint, f(a[0], a[1], a[2]), f(b[0], b[1], b[2]), f(c[0], c[1], c[2]), f(d[0], d[1], d[2]));
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

// Steel bar handle on a drawer front at (cx, cy), standing off the face at z: two posts + a bar.
export function handle(ctx, paint, cx, cy, z, len) {
  const h = len / 2;
  bx(ctx, cx - h, cx - h + 0.008, cy - 0.004, cy + 0.004, z, z + 0.012, paint, "k");
  bx(ctx, cx + h - 0.008, cx + h, cy - 0.004, cy + 0.004, z, z + 0.012, paint, "k");
  bx(ctx, cx - h - 0.004, cx + h + 0.004, cy - 0.005, cy + 0.005, z + 0.012, z + 0.02, paint);
}

// Drawer front stack: fills x0..x1 × y0..y1 on the face at z with `heights` fronts (bottom → top),
// 5 mm gaps; returns the fronts' centre y's for the handles. Fronts stand `proud` off the face.
export function fronts(ctx, paint, x0, x1, y0, y1, z, heights, proud) {
  const gap = 0.005;
  const sum = heights.reduce((a, b) => a + b, 0);
  const k = (y1 - y0 - gap * (heights.length + 1)) / sum; // scale to fill the opening exactly
  const cys = [];
  let y = y0 + gap;
  for (const hh of heights) {
    const fh = hh * k;
    bx(ctx, x0, x1, y, y + fh, z, z + proud, paint, "k");
    cys.push(y + fh / 2);
    y += fh + gap;
  }
  return cys;
}

// ── parts ──────────────────────────────────────────────────────────────────
// Desk return: oak top on a black frame — panel leg at −X, 3-drawer pedestal at +X, modesty panel
// along the back, one cable grommet. Handles steel.
export function returnUnit(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h, t = 0.03;
  const yU = h - t - 0.002; // underside of the top, 2 mm shy
  const pw = Math.min(0.42, w * 0.38);
  const px1 = w / 2 - 0.02, px0 = px1 - pw;
  const zk = -d / 2 + 0.04, zf = d / 2 - 0.04; // carcass depth
  // finish group (black): end panel, pedestal carcass + plinth, modesty panel, grommet
  bx(ctx, -w / 2 + 0.02, -w / 2 + 0.045, 0, yU, -d / 2 + 0.05, d / 2 - 0.05, C.a, "t");
  bx(ctx, px0, px1, 0.06, yU, zk, zf, C.a, "t");
  bx(ctx, px0 + 0.015, px1 - 0.015, 0, 0.06, zk + 0.015, zf - 0.02, C.a, "tb");
  bx(ctx, -w / 2 + 0.045, px0, 0.1, yU, -d / 2 + 0.05, -d / 2 + 0.068, C.a);
  rod(ctx, [-w / 2 + w * 0.32, h, -d / 2 + 0.09], [-w / 2 + w * 0.32, h + 0.004, -d / 2 + 0.09], 0.032, 10, C.a, { start: false });
  // finish2 group (oak): top, drawer fronts (two box drawers over one file drawer)
  slab(ctx, -w / 2, w / 2, h - t, h, -d / 2, d / 2, C.b);
  const cys = fronts(ctx, C.b, px0 + 0.005, px1 - 0.005, 0.06 + 0.006, yU - 0.006, zf, [0.3, 0.15, 0.15], 0.018);
  // steel: one bar handle per front
  for (const cy of cys) handle(ctx, C.steel, (px0 + px1) / 2, cy, zf + 0.018, 0.12);
}

// Filing cabinet: chamfered black carcass on a recessed plinth, `drawers` oak fronts, each with a
// steel label holder and bar handle. dims d = body + 2 cm of handle.
export function filing(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h;
  const zf = d / 2 - 0.02; // carcass front; fronts reach d/2
  // finish group (black): carcass, plinth
  G.boxZ(ctx, -w / 2, w / 2, 0.05, h, -d / 2, zf, 0.008, C.a);
  bx(ctx, -w / 2 + 0.015, w / 2 - 0.015, 0, 0.05, -d / 2 + 0.015, zf - 0.02, C.a, "tb");
  // finish2 group (oak): fronts
  const heights = [];
  for (let i = 0; i < s.drawers; i++) heights.push(1);
  const cys = fronts(ctx, C.b, -w / 2 + 0.006, w / 2 - 0.006, 0.05 + 0.006, h - 0.008, zf, heights, 0.02);
  // steel: label holder above each handle
  for (const cy of cys) {
    bx(ctx, -0.035, 0.035, cy + 0.03, cy + 0.065, d / 2, d / 2 + 0.002, C.steel, "k");
    handle(ctx, C.steel, 0, cy - 0.02, d / 2, 0.12);
  }
}

// 27" monitor: black bezel panel tilted back 5° on a black riser and a chamfered oak foot; an oak
// keyboard with four black key rows in front. `lit` paints the screen face as a pale-blue glow LAST.
export function monitor(ctx, C, s) {
  const w = s.w, sh = s.sh, h = s.h, zb = s.zb;
  const yBot = h - sh; // screen bottom edge
  const riserZ = zb - 0.03, riserD = 0.03;
  const zp = riserZ + riserD / 2 + 0.012; // panel centre; its back sits on the riser's front
  const f = xf(0, yBot, zp, 0, -5, 0); // panel frame at the bottom-centre, tilted back
  const bz = 0.012; // bezel
  const screen = s.lit ? null : C.a;
  // finish group (black): riser, panel, unlit screen face, key rows
  bx(ctx, -0.03, 0.03, 0.012, yBot + sh * 0.35, riserZ - riserD / 2, riserZ + riserD / 2, C.a, "b");
  fbox(ctx, f, [0, sh / 2, 0], [w / 2, sh / 2, 0.012], C.a);
  if (screen) fq(ctx, f, screen, [-w / 2 + bz, bz + 0.008, 0.0125], [w / 2 - bz, bz + 0.008, 0.0125], [w / 2 - bz, sh - bz, 0.0125], [-w / 2 + bz, sh - bz, 0.0125]);
  const zk0 = zb + 0.13;
  if (s.keyboard) {
    for (let i = 0; i < 4; i++) {
      const z0 = zk0 + 0.014 + i * 0.029;
      bx(ctx, -KEYB_W / 2 + 0.02, KEYB_W / 2 - 0.02, 0.012, 0.02, z0, z0 + 0.023, C.a, "b");
    }
  }
  // finish2 group (oak): foot plate, keyboard deck
  slab(ctx, -0.13, 0.13, 0, 0.012, zb - 0.1, zb + 0.1, C.b, 0.004);
  if (s.keyboard) slab(ctx, -KEYB_W / 2, KEYB_W / 2, 0, 0.012, zk0, zk0 + KEYB_D, C.b, 0.003);
  // glow LAST: the lit screen
  if (s.lit) {
    const g = M.glow(ctx, 0.55, 0.7, 0.88, 1.0);
    fq(ctx, f, g, [-w / 2 + bz, bz + 0.008, 0.0125], [w / 2 - bz, bz + 0.008, 0.0125], [w / 2 - bz, sh - bz, 0.0125], [-w / 2 + bz, sh - bz, 0.0125]);
  }
}

// Pinboard (wall frame: back-bottom origin, grows +Y and +Z): cork panel recessed in an oak frame,
// `notes` white paper squares at seeded tilts, each held by a yellow or blue pin.
export function pinboard(ctx, C, s) {
  const w = s.w, h = s.h, bar = 0.035, fd = 0.03;
  // finish group (cork): the panel, front face 8 mm behind the frame's
  bx(ctx, -w / 2 + bar, w / 2 - bar, bar, h - bar, 0.005, 0.022, C.a, "k");
  // finish2 group (oak): four frame bars
  bx(ctx, -w / 2, w / 2, 0, bar, 0, fd, C.b, "k");
  bx(ctx, -w / 2, w / 2, h - bar, h, 0, fd, C.b, "k");
  bx(ctx, -w / 2, -w / 2 + bar, bar, h - bar, 0, fd, C.b, "k");
  bx(ctx, w / 2 - bar, w / 2, bar, h - bar, 0, fd, C.b, "k");
  if (s.notes <= 0) return;
  // notes: a 3×2 grid of slots, seeded jitter and tilt
  // slot centres keep a note's half-size (0.06 × 0.07) plus a margin inside the cork
  const iw = Math.max(0.1, w - 2 * bar - 0.18), ih = Math.max(0.05, h - 2 * bar - 0.19);
  const cols = 3, rows = 2;
  const slots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push([(-iw / 2) + (iw / (cols - 1)) * c, bar + 0.095 + ih - (ih / (rows - 1)) * r]);
  const order = [0, 4, 2, 3, 1, 5];
  const notes = [];
  for (let i = 0; i < s.notes; i++) {
    const sl = slots[order[i]];
    const nw = 0.075 + ctx.random() * 0.03, nh = 0.09 + ctx.random() * 0.03;
    const jx = (ctx.random() - 0.5) * Math.max(0, Math.min(0.06, iw / (cols - 1) - nw)), jy = (ctx.random() - 0.5) * 0.04;
    notes.push({ x: sl[0] + jx, y: sl[1] + jy, w: nw, h: nh, roll: (ctx.random() - 0.5) * 16 });
  }
  // fixed: white paper (paint group), then yellow pins, then blue pins
  for (const n of notes) fbox(ctx, xf(n.x, n.y, 0.02325, 0, 0, n.roll), [0, 0, 0], [n.w / 2, n.h / 2, 0.00125], C.white, "k");
  for (let k = 0; k < 2; k++) {
    const paint = k === 0 ? C.yellow : C.blue;
    for (let i = k; i < notes.length; i += 2) {
      const n = notes[i];
      const px = n.x - Math.sin(n.roll * D2R) * (n.h / 2 - 0.012), py = n.y + Math.cos(n.roll * D2R) * (n.h / 2 - 0.012);
      rod(ctx, [px, py, 0.0245], [px, py, PIN_D], 0.005, 6, paint, { start: false });
    }
  }
}

// Desk mat: chamfered leather sheet; `tray` adds an oak pen channel along the back edge holding a
// black pen and a yellow pencil.
export function mat(ctx, C, s) {
  const w = s.w, d = s.d;
  // finish group (leather): the mat
  slab(ctx, -w / 2, w / 2, 0, 0.004, -d / 2, d / 2, C.a, 0.002);
  if (!s.tray) return;
  // finish2 group (oak): the channel — floor, two long rails, two end blocks
  const tx0 = -w / 2 + 0.06, tx1 = w / 2 - 0.06, tz0 = -d / 2 + 0.012, tz1 = tz0 + 0.06, y0 = 0.004, y1 = 0.022;
  bx(ctx, tx0, tx1, y0, y0 + 0.006, tz0, tz1, C.b, "b");
  bx(ctx, tx0, tx1, y0 + 0.006, y1, tz0, tz0 + 0.008, C.b, "b");
  bx(ctx, tx0, tx1, y0 + 0.006, y1, tz1 - 0.008, tz1, C.b, "b");
  bx(ctx, tx0, tx0 + 0.008, y0 + 0.006, y1, tz0 + 0.008, tz1 - 0.008, C.b, "b");
  bx(ctx, tx1 - 0.008, tx1, y0 + 0.006, y1, tz0 + 0.008, tz1 - 0.008, C.b, "b");
  // fixed (paint group): black pen, yellow pencil lying in the channel
  const zc = (tz0 + tz1) / 2, yp = y0 + 0.006 + 0.0045;
  rod(ctx, [-0.12, yp, zc - 0.012], [0.05, yp, zc - 0.012], 0.0045, 8, C.black);
  rod(ctx, [-0.06, yp, zc + 0.014], [0.13, yp, zc + 0.014], 0.0035, 6, C.yellow);
}

// 13" laptop, lid open `open` degrees: chamfered black base with a key deck and trackpad, thin lid
// hinged at the back leaning past vertical, screen inset in the bezel (glow LAST when `lit`).
export function laptop(ctx, C, s) {
  const w = s.w, bd = s.base, zs = s.zShift, lidH = s.lidH;
  const zA = -bd / 2 + zs, zB = bd / 2 + zs;
  // finish group (black): base, key deck, trackpad, lid, unlit screen
  G.boxZ(ctx, -w / 2, w / 2, 0, 0.016, zA, zB, 0.003, C.a);
  bx(ctx, -w / 2 + 0.018, w / 2 - 0.018, 0.016, 0.018, zA + 0.018, zA + 0.018 + bd * 0.5, C.a, "b");
  bx(ctx, -0.05, 0.05, 0.016, 0.0165, zB - 0.012 - bd * 0.28, zB - 0.012, C.a, "b");
  const f = xf(0, 0.016, s.hingeZ + zs, 0, -(s.open - 90), 0);
  fbox(ctx, f, [0, lidH / 2, 0], [w / 2, lidH / 2, 0.004], C.a);
  const bz = 0.01;
  const face = (paint) => fq(ctx, f, paint, [-w / 2 + bz, bz + 0.006, 0.0045], [w / 2 - bz, bz + 0.006, 0.0045], [w / 2 - bz, lidH - bz, 0.0045], [-w / 2 + bz, lidH - bz, 0.0045]);
  if (!s.lit) face(C.a);
  // finish2: unused on the laptop (contract slot only)
  // glow LAST
  if (s.lit) face(M.glow(ctx, 0.55, 0.7, 0.88, 1.0));
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "filing";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    a: M.finish(ctx, p.finish, D.finish), // frame / carcass / body
    b: M.finish(ctx, p.finish2, D.finish2), // wood accents
    steel: M.finish(ctx, "steel", "steel"),
    black: M.finish(ctx, "black", "black"),
    white: M.finish(ctx, "white", "white"),
    yellow: M.finish(ctx, "hylla-yellow", "hylla-yellow"),
    blue: M.finish(ctx, "hylla-blue", "hylla-blue"),
  };
  if (part === "return") returnUnit(ctx, C, s);
  else if (part === "monitor") monitor(ctx, C, s);
  else if (part === "pinboard") pinboard(ctx, C, s);
  else if (part === "mat") mat(ctx, C, s);
  else if (part === "laptop") laptop(ctx, C, s);
  else filing(ctx, C, s);
}

export { PARTS, DEF, MOUNT, size, dims, surface, mountOf, manifest };
