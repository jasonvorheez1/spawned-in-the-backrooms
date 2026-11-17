// KITCHEN — HYLLA's kitchen family, ONE generator (09b §3.6). Cabinets, worktops, appliances.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/kitchen.js",
//                params: { part: "base", n: 3, handles: "none", finish: "white", finish2: "oak" } }
//
// FRAMES (09b §1): floor parts — origin ON THE GROUND at the footprint centre, +Y up, front on +Z,
//   body x ±w/2 · z ±d/2 · y 0→h. Wall parts (`wall`, `hood`) — origin at the BACK-BOTTOM centre:
//   x ±w/2 · z 0→+d out from the wall · y 0→+h. `dims` = TOTAL extent (the sink tap counts).
// SCALE: counter 0.90 (bar 1.10 via h), toe-kick 0.10, worktop 0.04, unit 0.60, wall cab d 0.35.
//
//   part: "base"       n×0.60 × 0.60 × 0.90, doors + worktop      part: "hood"       0.90×0.50×0.45 (wall, 1.65)
//   part: "wall"       n×0.60 × 0.35 × 0.70 (wall, 1.40)          part: "fridge"     0.60×0.65×1.85, freezer drawer
//   part: "sink"       0.80|0.60 × 0.60 × 0.90 + basin + tap      part: "dishwasher" 0.60 housing under a worktop
//   part: "oven"       0.60 built-under, glass door, dials        part: "island"     1.80×0.90×0.90, 0.30 seat overhang +Z
//   part: "range"      0.90 freestanding, 4 rings, glass door     part: "pantry"     0.60×0.60×2.10, two doors
//
// PARAMS: n (units 1–6: base/wall/island) · w (sink 0.60–1.00, range 0.60–1.20, hood 0.60–1.20,
//   island 1.20–2.40) · h (counter 0.85–1.10 on base/sink/oven/range/dishwasher/island; wall 0.40–0.90;
//   fridge 1.60–2.00; pantry 1.80–2.40) · handles "bar"|"knob"|"none" · finish (doors / housing) ·
//   finish2 (worktop / trim / hob) · lit bool (hood lamps).
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — finish, then fixed black (plinths, knobs), then finish2, then
//   steel/chrome fittings, then glow, then glass LAST (transparent pass ends the run).
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("builtin/geom");
const M = require("lib/home-mat.js");

const PARTS = ["base", "wall", "sink", "oven", "range", "hood", "fridge", "dishwasher", "island", "pantry"];
const HANDLES = ["bar", "knob", "none"];

const DEF = {
  base: { n: 3, h: 0.9, handles: "none", finish: "white", finish2: "oak" },
  wall: { n: 3, h: 0.7, handles: "none", finish: "white", finish2: "oak" },
  sink: { w: 0.8, h: 0.9, handles: "none", finish: "white", finish2: "oak" },
  oven: { h: 0.9, handles: "bar", finish: "black", finish2: "steel" },
  range: { w: 0.9, h: 0.9, handles: "bar", finish: "steel", finish2: "black" },
  hood: { w: 0.9, finish: "steel", finish2: "black", lit: true },
  fridge: { h: 1.85, finish: "steel", finish2: "black" },
  dishwasher: { h: 0.9, handles: "bar", finish: "steel", finish2: "oak" },
  island: { w: 1.8, h: 0.9, handles: "none", finish: "white", finish2: "oak" },
  pantry: { h: 2.1, handles: "bar", finish: "white", finish2: "oak" },
};

// Wall-frame parts and their 09b mount heights (informational — the catalog is the table).
const MOUNT = { wall: { mount: "wall", mountY: 1.4 }, hood: { mount: "wall", mountY: 1.65 } };

const U = 0.6; // unit width
const TK = 0.1; // toe-kick height
const TOP = 0.04; // worktop thickness
const DOOR = 0.02; // door thickness
const GAP = 0.003; // door gap
const TAP = 0.3; // tap rise above the worktop

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}
export function pick(v, list, d) {
  return typeof v === "string" && list.indexOf(v) >= 0 ? v : d;
}

// Resolved size params for a part (what geometry() builds and what manifest() reports).
function size(part, p) {
  const D = DEF[part] || DEF.base;
  p = p || {};
  const s = { handles: pick(p.handles, HANDLES, D.handles || "none"), lit: p.lit === undefined ? !!D.lit : !!p.lit };
  if (part === "base" || part === "wall") {
    s.n = clamp(Math.round(num(p.n, D.n)), 1, 6);
    s.w = s.n * U;
    s.d = part === "wall" ? 0.35 : 0.6;
    s.h = part === "wall" ? clamp(num(p.h, D.h), 0.4, 0.9) : clamp(num(p.h, D.h), 0.85, 1.1);
  } else if (part === "island") {
    s.w = clamp(num(p.w, D.w), 1.2, 2.4);
    s.n = clamp(Math.round(s.w / U), 2, 4);
    s.d = 0.9;
    s.h = clamp(num(p.h, D.h), 0.85, 1.1);
  } else if (part === "sink") {
    s.w = clamp(num(p.w, D.w), 0.6, 1.0);
    s.n = s.w > 0.7 ? 2 : 1;
    s.d = 0.6;
    s.h = clamp(num(p.h, D.h), 0.85, 1.1);
  } else if (part === "range") {
    s.w = clamp(num(p.w, D.w), 0.6, 1.2);
    s.d = 0.6;
    s.h = clamp(num(p.h, D.h), 0.85, 1.1);
  } else if (part === "hood") {
    s.w = clamp(num(p.w, D.w), 0.6, 1.2);
    s.d = 0.5;
    s.h = 0.45;
  } else if (part === "fridge") {
    s.w = 0.6;
    s.d = 0.65;
    s.h = clamp(num(p.h, D.h), 1.6, 2.0);
  } else if (part === "pantry") {
    s.w = 0.6;
    s.d = 0.6;
    s.h = clamp(num(p.h, D.h), 1.8, 2.4);
  } else {
    // oven, dishwasher
    s.w = 0.6;
    s.d = 0.6;
    s.h = clamp(num(p.h, D.h), 0.85, 1.1);
  }
  return s;
}

// [w, d, hTotal] in the part's frame — the catalog's `dims` (total extent: the sink's tap counts).
function dims(part, p) {
  const s = size(part, p);
  return [s.w, s.d, part === "sink" ? s.h + TAP : s.h];
}

// The functional top a `top` row sits at (0 = none).
function surface(part, p) {
  const s = size(part, p);
  return part === "wall" || part === "hood" || part === "fridge" || part === "pantry" ? 0 : s.h;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) {
    const m = MOUNT[k] || { mount: "floor", mountY: 0 };
    parts[k] = { dims: dims(k, {}), surface: surface(k, {}), mount: m.mount, mountY: m.mountY, defaults: DEF[k] };
  }
  return { family: "kitchen", script: "scripts/asset-library/gen-home/kitchen.js", parts, handles: HANDLES };
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

// Chamfered slab — every worktop. 0.008 is the furniture bevel.
export function slab(ctx, x0, x1, y0, y1, z0, z1, paint, bevel) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.008, paint);
}

// Superellipse ring at height y (P convention: x = +cos, z = −sin — bottom→top lofts face outward).
export function oring(cx, cz, y, w, d, n, pow) {
  const k = pow === undefined ? 1 : pow;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const sc = c < 0 ? -1 : 1, ss = s < 0 ? -1 : 1;
    pts.push([cx + sc * Math.pow(Math.abs(c), k) * w * 0.5, y, cz - ss * Math.pow(Math.abs(s), k) * d * 0.5]);
  }
  return pts;
}

// Vertical round body between two heights (a knob, a disc, a burner); smooth-shaded walls.
export function cylY(ctx, cx, cz, y0, y1, r0, r1, sides, paint, o) {
  o = o || {};
  ctx.smooth();
  G.loft(ctx, [oring(cx, cz, y0, r0 * 2, r0 * 2, sides), oring(cx, cz, y1, r1 * 2, r1 * 2, sides)], {
    paint,
    capStart: o.bottom !== false,
    capEnd: o.top !== false,
  });
  ctx.flat();
}

// A worktop with a rectangular hole (sink / vanity): outer walls, top chamfer, top frame. Bottom omitted.
export function frameTop(ctx, x0, x1, y0, y1, z0, z1, hx0, hx1, hz0, hz1, e, paint) {
  const ye = y1 - e;
  qd(ctx, paint, [x0, y0, z1], [x1, y0, z1], [x1, ye, z1], [x0, ye, z1]);
  qd(ctx, paint, [x1, y0, z0], [x0, y0, z0], [x0, ye, z0], [x1, ye, z0]);
  qd(ctx, paint, [x1, y0, z1], [x1, y0, z0], [x1, ye, z0], [x1, ye, z1]);
  qd(ctx, paint, [x0, y0, z0], [x0, y0, z1], [x0, ye, z1], [x0, ye, z0]);
  const X0 = x0 + e, X1 = x1 - e, Z0 = z0 + e, Z1 = z1 - e;
  qd(ctx, paint, [x0, ye, z1], [x1, ye, z1], [X1, y1, Z1], [X0, y1, Z1]);
  qd(ctx, paint, [x1, ye, z0], [x0, ye, z0], [X0, y1, Z0], [X1, y1, Z0]);
  qd(ctx, paint, [x1, ye, z1], [x1, ye, z0], [X1, y1, Z0], [X1, y1, Z1]);
  qd(ctx, paint, [x0, ye, z0], [x0, ye, z1], [X0, y1, Z1], [X0, y1, Z0]);
  qd(ctx, paint, [X0, y1, Z1], [X1, y1, Z1], [hx1, y1, hz1], [hx0, y1, hz1]);
  qd(ctx, paint, [hx0, y1, hz0], [hx1, y1, hz0], [X1, y1, Z0], [X0, y1, Z0]);
  qd(ctx, paint, [hx1, y1, hz1], [X1, y1, Z1], [X1, y1, Z0], [hx1, y1, hz0]);
  qd(ctx, paint, [X0, y1, Z1], [hx0, y1, hz1], [hx0, y1, hz0], [X0, y1, Z0]);
}

// Rectangular cavity: four inward walls + a floor facing up (a sink basin, a drawer well).
export function cavityBox(ctx, x0, x1, y0, y1, z0, z1, paint) {
  qd(ctx, paint, [x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]);
  qd(ctx, paint, [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]);
  qd(ctx, paint, [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]);
  qd(ctx, paint, [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]);
  qd(ctx, paint, [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]);
}

// ── fittings ────────────────────────────────────────────────────────────────
// A door leaf standing proud of a carcass face at zBack (front +Z). Back face omitted.
export function door(ctx, paint, x0, x1, y0, y1, zBack) {
  bx(ctx, x0 + GAP, x1 - GAP, y0 + GAP, y1 - GAP, zBack, zBack + DOOR, paint, "k");
}
// Same leaf on a −Z face (island backs): front face omitted instead.
export function doorBack(ctx, paint, x0, x1, y0, y1, zFront) {
  bx(ctx, x0 + GAP, x1 - GAP, y0 + GAP, y1 - GAP, zFront - DOOR, zFront, paint, "f");
}

// Handle on a +Z door face at zFace. dir 1 = out of +Z, −1 = out of −Z.
export function handle(ctx, paint, style, cx, cy, zFace, vertical, len, dir) {
  const s = dir < 0 ? -1 : 1;
  const z0 = zFace, z1 = zFace + s * 0.03, z2 = zFace + s * 0.042;
  if (style === "none") return;
  if (style === "knob") {
    ctx.smooth();
    G.tube(ctx, [cx, cy, z0], [cx, cy, zFace + s * 0.012], 0.006, 0.006, 8, [0, 1, 0], paint);
    G.tube(ctx, [cx, cy, zFace + s * 0.012], [cx, cy, zFace + s * 0.03], 0.015, 0.013, 8, [0, 1, 0], paint);
    ctx.flat();
    return;
  }
  const t = 0.006, a = len / 2 - 0.012;
  const skip = s > 0 ? "k" : "f";
  if (vertical) {
    bx(ctx, cx - t, cx + t, cy - a - t, cy - a + t, z0, z1, paint, skip);
    bx(ctx, cx - t, cx + t, cy + a - t, cy + a + t, z0, z1, paint, skip);
    bx(ctx, cx - t, cx + t, cy - len / 2, cy + len / 2, Math.min(z1, z2), Math.max(z1, z2), paint);
  } else {
    bx(ctx, cx - a - t, cx - a + t, cy - t, cy + t, z0, z1, paint, skip);
    bx(ctx, cx + a - t, cx + a + t, cy - t, cy + t, z0, z1, paint, skip);
    bx(ctx, cx - len / 2, cx + len / 2, cy - t, cy + t, Math.min(z1, z2), Math.max(z1, z2), paint);
  }
}

// Chrome mixer tap standing on a worktop at (x, yTop, z): riser, swan-neck spout to +Z, lever.
export function tap(ctx, paint, x, yTop, z) {
  ctx.smooth();
  G.tube(ctx, [x, yTop, z], [x, yTop + TAP * 0.8, z], 0.016, 0.014, 8, [0, 0, 1], paint);
  const y1 = yTop + TAP * 0.8;
  G.polyTube(ctx, [[x, y1, z], [x, yTop + TAP, z + 0.01], [x, yTop + TAP, z + 0.12], [x, yTop + TAP - 0.04, z + 0.18]], [0.012, 0.011, 0.01, 0.009], 8, [0, 1, 0], paint);
  G.tube(ctx, [x, y1 - 0.02, z], [x + 0.07, y1 + 0.01, z - 0.03], 0.006, 0.005, 6, [0, 1, 0], paint);
  ctx.flat();
}

// ── carcass builders ────────────────────────────────────────────────────────
// A base run: carcass + doors (finish), toe-kick (black), worktop (finish2), handles (steel).
// zBack..zFront is the CARCASS depth; the door face sits at zFront + DOOR, the worktop 0.02 past that.
export function baseRun(ctx, C, s, o) {
  o = o || {};
  const w = s.w, h = s.h, zBack = o.zBack, zFront = o.zFront;
  const yTop = h - TOP;
  const nDoors = o.doors || s.n;
  // finish group
  bx(ctx, -w / 2, w / 2, TK, yTop, zBack, zFront, C.door, "b");
  const dw = w / nDoors;
  for (let i = 0; i < nDoors; i++) door(ctx, C.door, -w / 2 + i * dw, -w / 2 + (i + 1) * dw, TK, yTop, zFront);
  // fixed black: toe-kick, recessed 0.05
  bx(ctx, -w / 2 + 0.01, w / 2 - 0.01, 0, TK, zBack + 0.02, zFront - 0.05, C.black, "tb");
  // finish2: worktop (unless the caller draws its own)
  if (o.worktop !== false) slab(ctx, -w / 2, w / 2, yTop, h, zBack, zFront + DOOR + 0.02, C.top);
  // steel handles, horizontal near the door top
  for (let i = 0; i < nDoors; i++) handle(ctx, C.steel, s.handles, -w / 2 + (i + 0.5) * dw, yTop - 0.06, zFront + DOOR, false, Math.min(0.16, dw * 0.4), 1);
}

// ── parts ──────────────────────────────────────────────────────────────────
export function base(ctx, C, s) {
  baseRun(ctx, C, s, { zBack: -0.3, zFront: 0.26 });
}

// Wall cabinet in the wall frame: x ±w/2 · z 0→0.35 · y 0→h. Doors on +Z, handles at the door foot.
export function wallCab(ctx, C, s) {
  const w = s.w, h = s.h, zF = 0.33;
  bx(ctx, -w / 2, w / 2, 0.03, h, 0, zF, C.door, "k");
  const dw = w / s.n;
  for (let i = 0; i < s.n; i++) door(ctx, C.door, -w / 2 + i * dw, -w / 2 + (i + 1) * dw, 0.03, h, zF);
  // finish2: light rail along the bottom front + bottom plate
  bx(ctx, -w / 2, w / 2, 0, 0.03, 0, zF + DOOR, C.top, "k");
  for (let i = 0; i < s.n; i++) handle(ctx, C.steel, s.handles, -w / 2 + (i + 0.5) * dw, 0.09, zF + DOOR, false, Math.min(0.16, dw * 0.4), 1);
}

// Sink unit: base run with a worktop cut for a steel basin and a chrome mixer behind it.
export function sink(ctx, C, s) {
  const w = s.w, h = s.h, zBack = -0.3, zFront = 0.26, yTop = h - TOP;
  baseRun(ctx, C, s, { zBack, zFront, worktop: false });
  const bw = w > 0.7 ? 0.5 : 0.4, bd = 0.4, bz = -0.03;
  frameTop(ctx, -w / 2, w / 2, yTop, h, zBack, zFront + DOOR + 0.02, -bw / 2, bw / 2, bz - bd / 2, bz + bd / 2, 0.008, C.top);
  // steel basin, 0.18 deep, then the chrome tap
  cavityBox(ctx, -bw / 2, bw / 2, h - 0.18, h, bz - bd / 2, bz + bd / 2, C.steel);
  cylY(ctx, 0, bz, h - 0.18, h - 0.176, 0.02, 0.02, 8, C.steel, { bottom: false });
  tap(ctx, C.chrome, 0, h, bz - bd / 2 - 0.05);
}

// Glass-fronted appliance door: a frame of four bars (paint) round a window; the pane is emitted by
// the caller LAST via C.glass.
export function glassDoor(ctx, paint, x0, x1, y0, y1, zBack, win) {
  const wx0 = win[0], wx1 = win[1], wy0 = win[2], wy1 = win[3];
  bx(ctx, x0 + GAP, x1 - GAP, wy1, y1 - GAP, zBack, zBack + DOOR, paint, "k");
  bx(ctx, x0 + GAP, x1 - GAP, y0 + GAP, wy0, zBack, zBack + DOOR, paint, "k");
  bx(ctx, x0 + GAP, wx0, wy0, wy1, zBack, zBack + DOOR, paint, "k");
  bx(ctx, wx1, x1 - GAP, wy0, wy1, zBack, zBack + DOOR, paint, "k");
}
export function pane(ctx, paint, x0, x1, y0, y1, z) {
  qd(ctx, paint, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]);
}

// Dial strip: n knobs (knobPaint, emitted first so they group with the black run) standing out of a
// bar across the front (paint).
export function dials(ctx, paint, knobPaint, x0, x1, y0, y1, zF, n) {
  const cy = (y0 + y1) / 2, pitch = (x1 - x0) / (n + 1);
  ctx.smooth();
  for (let i = 0; i < n; i++) G.tube(ctx, [x0 + (i + 1) * pitch, cy, zF + 0.012], [x0 + (i + 1) * pitch, cy, zF + 0.03], 0.013, 0.012, 6, [0, 1, 0], knobPaint);
  ctx.flat();
  bx(ctx, x0, x1, y0, y1, zF, zF + 0.012, paint, "k");
}

// Built-under oven: housing + drawer + glass door (finish), dials, worktop segment (finish2), steel handle.
export function oven(ctx, C, s) {
  const h = s.h, yTop = h - TOP, zBack = -0.3, zF = 0.26;
  const yDoor0 = 0.25, yDoor1 = yTop - 0.08;
  bx(ctx, -0.3, 0.3, TK, yTop, zBack, zF, C.door, "b");
  door(ctx, C.door, -0.3, 0.3, TK, yDoor0, zF);
  glassDoor(ctx, C.door, -0.3, 0.3, yDoor0, yDoor1, zF, [-0.22, 0.22, yDoor0 + 0.07, yDoor1 - 0.07]);
  // black: toe-kick + dial strip knobs
  bx(ctx, -0.29, 0.29, 0, TK, zBack + 0.02, zF - 0.05, C.black, "tb");
  dials(ctx, C.top, C.black, -0.3 + GAP, 0.3 - GAP, yDoor1 + GAP, yTop - GAP, zF, 4);
  slab(ctx, -0.3, 0.3, yTop, h, zBack, zF + DOOR + 0.02, C.top);
  handle(ctx, C.steel, "bar", 0, yDoor1 - 0.045, zF + DOOR, false, 0.5, 1);
  pane(ctx, C.glass, -0.22, 0.22, yDoor0 + 0.07, yDoor1 - 0.07, zF + DOOR * 0.6);
}

// Freestanding range: body + glass oven door (finish), hob + burner discs (finish2), pan supports,
// dials and handle (steel).
export function range(ctx, C, s) {
  const w = s.w, h = s.h, zBack = -0.3, zF = 0.26, yHob = h - TOP;
  const yDoor0 = 0.22, yDoor1 = yHob - 0.08;
  bx(ctx, -w / 2, w / 2, TK, yHob, zBack, zF, C.door, "b");
  glassDoor(ctx, C.door, -w / 2, w / 2, yDoor0, yDoor1, zF, [-w * 0.34, w * 0.34, yDoor0 + 0.08, yDoor1 - 0.07]);
  door(ctx, C.door, -w / 2, w / 2, TK, yDoor0, zF);
  // fixed black toe-kick
  bx(ctx, -w / 2 + 0.01, w / 2 - 0.01, 0, TK, zBack + 0.02, zF - 0.05, C.black, "tb");
  // finish2: hob plate + 4 burner discs
  slab(ctx, -w / 2, w / 2, yHob, h, zBack, zF + DOOR, C.top);
  const bxs = w * 0.24, bzs = 0.13, r = Math.min(0.09, w * 0.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylY(ctx, sx * bxs, -0.02 + sz * bzs, h, h + 0.008, r, r, 10, C.top, { bottom: false });
  // steel: dial strip + knobs, pan supports, handle
  dials(ctx, C.steel, C.top, -w / 2 + GAP, w / 2 - GAP, yDoor1 + GAP, yHob - GAP, zF, 5);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const cx = sx * bxs, cz = -0.02 + sz * bzs, L = r * 1.25, t = 0.006, y0 = h + 0.008, y1 = h + 0.02;
      bx(ctx, cx - L, cx + L, y0, y1, cz - t, cz + t, C.steel, "b");
      bx(ctx, cx - t, cx + t, y0, y1, cz - L, cz + L, C.steel, "b");
    }
  handle(ctx, C.steel, "bar", 0, yDoor1 - 0.045, zF + DOOR, false, w * 0.8, 1);
  pane(ctx, C.glass, -w * 0.34, w * 0.34, yDoor0 + 0.08, yDoor1 - 0.07, zF + DOOR * 0.6);
}

// Chimney hood in the wall frame: x ±w/2 · z 0→0.50 · y 0→0.45. Canopy lofts to a 0.30 duct.
export function hood(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h;
  const R = (y, ww, dd, zc) => ({ c: [0, y, 0], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(ww, dd, 0, -zc, 0.012) });
  // finish: canopy (lip, then the slope) + duct
  G.loftFrames(ctx, [R(0.015, w, d - 0.02, d / 2), R(0.075, w, d - 0.02, d / 2), R(0.24, 0.3, 0.3, 0.16)], C.door, { capStart: true, capEnd: false });
  bx(ctx, -0.15, 0.15, 0.24, h, 0.01, 0.31, C.door, "b");
  // finish2 (black): filter panel under the canopy
  bx(ctx, -w / 2 + 0.05, w / 2 - 0.05, 0.005, 0.016, 0.06, d - 0.06, C.top, "t");
  // glow: two lamps at the front corners of the underside
  if (s.lit) for (const sx of [-1, 1]) bx(ctx, sx * (w / 2 - 0.12) - 0.03, sx * (w / 2 - 0.12) + 0.03, 0, 0.006, d - 0.14, d - 0.08, C.bulb, "t");
}

// Fridge-freezer: chamfered body + two door leaves (finish), plinth + handles (finish2).
export function fridge(ctx, C, s) {
  const h = s.h, zF = 0.3;
  const ySplit = h * 0.31;
  slab(ctx, -0.3, 0.3, 0.05, h, -0.325, zF, C.door);
  door(ctx, C.door, -0.3, 0.3, 0.05, ySplit, zF);
  door(ctx, C.door, -0.3, 0.3, ySplit + 0.004, h, zF);
  bx(ctx, -0.28, 0.28, 0, 0.05, -0.3, zF - 0.03, C.top, "tb");
  handle(ctx, C.top, "bar", -0.24, (ySplit + h) / 2 + 0.1, zF + DOOR, true, Math.min(0.8, (h - ySplit) * 0.6), 1);
  handle(ctx, C.top, "bar", 0, ySplit - 0.06, zF + DOOR, false, 0.4, 1);
}

// Dishwasher: full-height appliance door (finish) under a worktop segment (finish2), black control
// strip, steel handle.
export function dishwasher(ctx, C, s) {
  const h = s.h, yTop = h - TOP, zBack = -0.3, zF = 0.26;
  bx(ctx, -0.3, 0.3, TK, yTop, zBack, zF, C.door, "b");
  door(ctx, C.door, -0.3, 0.3, TK, yTop - 0.065, zF);
  bx(ctx, -0.29, 0.29, 0, TK, zBack + 0.02, zF - 0.05, C.black, "tb");
  bx(ctx, -0.3 + GAP, 0.3 - GAP, yTop - 0.062, yTop - GAP, zF, zF + 0.012, C.black, "k");
  slab(ctx, -0.3, 0.3, yTop, h, zBack, zF + DOOR + 0.02, C.top);
  handle(ctx, C.steel, "bar", 0, yTop - 0.11, zF + DOOR, false, 0.5, 1);
  // two standby LEDs on the strip
  bx(ctx, 0.18, 0.19, yTop - 0.037, yTop - 0.028, zF + 0.012, zF + 0.014, C.bulb, "k");
  bx(ctx, 0.21, 0.22, yTop - 0.037, yTop - 0.028, zF + 0.012, zF + 0.014, C.bulb, "k");
}

// Island: 0.60 carcass at the back of a 0.90 worktop, 0.30 seat overhang on +Z; doors face −Z.
export function island(ctx, C, s) {
  const w = s.w, h = s.h, yTop = h - TOP;
  const zBack = -0.45, zFront = 0.15; // carcass; doors stand proud on the −Z face
  bx(ctx, -w / 2, w / 2, TK, yTop, zBack + DOOR, zFront, C.door, "b");
  const dw = w / s.n;
  for (let i = 0; i < s.n; i++) doorBack(ctx, C.door, -w / 2 + i * dw, -w / 2 + (i + 1) * dw, TK, yTop, zBack + DOOR);
  bx(ctx, -w / 2 + 0.01, w / 2 - 0.01, 0, TK, zBack + 0.07, zFront - 0.02, C.black, "tb");
  slab(ctx, -w / 2, w / 2, yTop, h, -0.45, 0.45, C.top);
  for (let i = 0; i < s.n; i++) handle(ctx, C.steel, s.handles, -w / 2 + (i + 0.5) * dw, yTop - 0.06, zBack, false, Math.min(0.16, dw * 0.4), -1);
}

// Pantry: tall carcass, two stacked doors, vertical bar handles at the split.
export function pantry(ctx, C, s) {
  const h = s.h, zBack = -0.3, zF = 0.26, ySplit = h * 0.62;
  bx(ctx, -0.3, 0.3, TK, h, zBack, zF, C.door, "b");
  door(ctx, C.door, -0.3, 0.3, TK, ySplit, zF);
  door(ctx, C.door, -0.3, 0.3, ySplit, h, zF);
  bx(ctx, -0.29, 0.29, 0, TK, zBack + 0.02, zF - 0.05, C.black, "tb");
  bx(ctx, -0.3, 0.3, h - 0.02, h, zBack, zF + DOOR, C.top, "b");
  handle(ctx, C.steel, s.handles, 0.22, ySplit - 0.13, zF + DOOR, true, 0.18, 1);
  handle(ctx, C.steel, s.handles, 0.22, ySplit + 0.13, zF + DOOR, true, 0.18, 1);
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "base";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    door: M.finish(ctx, p.finish, D.finish),
    top: M.finish(ctx, p.finish2, D.finish2),
    black: M.finish(ctx, "black", "black"),
    steel: M.finish(ctx, "steel", "steel"),
    chrome: M.finish(ctx, "chrome", "chrome"),
    bulb: M.glow(ctx, 1.0, 0.95, 0.85, 1.4),
    glass: M.glass(ctx),
  };
  if (part === "wall") wallCab(ctx, C, s);
  else if (part === "sink") sink(ctx, C, s);
  else if (part === "oven") oven(ctx, C, s);
  else if (part === "range") range(ctx, C, s);
  else if (part === "hood") hood(ctx, C, s);
  else if (part === "fridge") fridge(ctx, C, s);
  else if (part === "dishwasher") dishwasher(ctx, C, s);
  else if (part === "island") island(ctx, C, s);
  else if (part === "pantry") pantry(ctx, C, s);
  else base(ctx, C, s);
}

export { PARTS, DEF, HANDLES, MOUNT, size, dims, surface, manifest };
