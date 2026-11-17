// STORAGE — HYLLA's storage family, ONE generator (09b §3.5). Every cabinet the store sells.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/storage.js",
//                params: { part: "wardrobe", doors: 2, d: 0.58, h: 2.01, handles: "bar", open: false,
//                          finish: "white", finish2: "chrome" } }
//
// FRAME (09b §1 `floor` mount): origin ON THE GROUND at the footprint centre, +Y up, front on +Z,
//        body x ±w/2 · z ±d/2 · y 0→h. `dims` = TOTAL extent: handles stand 3.5 cm proud of the
//        doors and an ajar door / pulled drawer (`open`) adds its swing — both counted.
// SCALE: real flat-pack — wardrobe 2.01, dresser 0.80 / tallboy 1.00, nightstand 0.55, tv 0.50.
//
//   part: "wardrobe"   doors 2|3 → w 1.00|1.50 × 0.58 × 2.01; interior shelf + chrome rail
//   part: "dresser"    drawers 3|4|6 → 0.80×0.48×0.80 | 0.80×0.48×1.00 | 1.60×0.48×0.80 (2 columns)
//   part: "nightstand" 0.45×0.40×0.55, one drawer over an open niche, on four tapered legs
//   part: "bookcase"   0.80×0.28 × h 1.06|2.02, shelves (open bays) 3|5, back panel, recessed kick
//   part: "cube"       cols×rows 4×4|2×2|4×2 open cubes at 0.37 pitch → 1.50×0.39×1.50 | 0.76 | 1.50×0.76
//   part: "tvstand"    1.60×0.42×0.50, two doors round an open centre niche, on tapered legs
//   part: "sideboard"  1.60×0.45×0.80, three doors on a plinth
//
// PARAMS: w, d, h · doors (wardrobe) · drawers (dresser) · shelves (bookcase bays) · cols, rows (cube)
//   · handles "bar"|"knob"|"none" · open bool (one door ajar 25° / the top drawer pulled)
//   · finish (carcass, doors, fronts, interior; default white) · finish2 (handles + rail; default chrome).
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — every face of `finish` first, then every face of `finish2`
//   (handles, hanging rail). No glass, no glow in this family.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("builtin/geom");
const M = require("lib/home-mat.js");

const PARTS = ["wardrobe", "dresser", "nightstand", "bookcase", "cube", "tvstand", "sideboard"];
const HANDLES = ["bar", "knob", "none"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  wardrobe: { doors: 2, d: 0.58, h: 2.01, handles: "bar", open: false, finish: "white", finish2: "chrome" },
  dresser: { drawers: 6, d: 0.48, handles: "bar", open: false, finish: "white", finish2: "chrome" },
  nightstand: { w: 0.45, d: 0.4, h: 0.55, handles: "bar", open: false, finish: "white", finish2: "chrome" },
  bookcase: { w: 0.8, d: 0.28, h: 2.02, shelves: 5, finish: "white", finish2: "chrome" },
  cube: { cols: 4, rows: 4, d: 0.39, finish: "white", finish2: "chrome" },
  tvstand: { w: 1.6, d: 0.42, h: 0.5, handles: "bar", open: false, finish: "white", finish2: "chrome" },
  sideboard: { w: 1.6, d: 0.45, h: 0.8, handles: "bar", open: false, finish: "white", finish2: "chrome" },
};

const T = 0.018; // panel thickness
const DOOR = 0.018; // door leaf / drawer front thickness (proud of the carcass)
const GAP = 0.003; // between leaves
const PL = 0.06; // plinth height
const PLIN = 0.03; // plinth front recess
const HANDLE_OUT = 0.035; // a bar handle's stand-off from the leaf face
const PITCH = 0.37; // cube cell pitch
const AJAR = (25 * Math.PI) / 180;
const PULL = 0.14; // a pulled drawer's travel

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}
export function int(v, d, a, b) {
  return clamp(Math.round(num(v, d)), a, b);
}
export function pick(v, list, d) {
  return typeof v === "string" && list.indexOf(v) >= 0 ? v : d;
}

// Resolved size params for a part (what geometry() builds and what manifest() reports).
function size(part, p) {
  const D = DEF[part] || DEF.wardrobe;
  p = p || {};
  const s = { handles: pick(p.handles, HANDLES, D.handles || "none"), open: p.open === undefined ? !!D.open : !!p.open };
  if (part === "wardrobe") {
    s.doors = int(p.doors, D.doors, 1, 4);
    s.w = clamp(num(p.w, s.doors * 0.5), 0.4, 2.4);
    s.d = clamp(num(p.d, D.d), 0.35, 0.8);
    s.h = clamp(num(p.h, D.h), 1.2, 2.5);
  } else if (part === "dresser") {
    s.drawers = int(p.drawers, D.drawers, 2, 8);
    s.cols = s.drawers >= 6 ? 2 : 1;
    s.rows = Math.ceil(s.drawers / s.cols);
    s.w = clamp(num(p.w, s.cols * 0.8), 0.4, 2.4);
    s.d = clamp(num(p.d, D.d), 0.3, 0.7);
    s.h = clamp(num(p.h, 0.2 + s.rows * 0.2), 0.4, 1.6);
  } else if (part === "bookcase") {
    s.shelves = int(p.shelves, D.shelves, 1, 8);
    s.w = clamp(num(p.w, D.w), 0.3, 2.0);
    s.d = clamp(num(p.d, D.d), 0.2, 0.5);
    s.h = clamp(num(p.h, D.h), 0.5, 2.5);
    s.handles = "none";
  } else if (part === "cube") {
    s.cols = int(p.cols, D.cols, 1, 6);
    s.rows = int(p.rows, D.rows, 1, 6);
    s.w = s.cols * PITCH + T;
    s.h = s.rows * PITCH + T;
    s.d = clamp(num(p.d, D.d), 0.25, 0.5);
    s.handles = "none";
  } else {
    s.w = clamp(num(p.w, D.w), 0.3, 2.4);
    s.d = clamp(num(p.d, D.d), 0.25, 0.7);
    s.h = clamp(num(p.h, D.h), 0.3, 1.2);
  }
  return s;
}

// Door leaf width for the door parts (what `open` swings).
export function leafW(part, s) {
  if (part === "wardrobe") return (s.w - 2 * T) / s.doors;
  if (part === "sideboard") return (s.w - 2 * T) / 3;
  if (part === "tvstand") return (s.w - 2 * T) * 0.34;
  return 0;
}

// [w, d, hTotal] in the floor frame — the catalog's `dims` (total extent, 09b §1).
function dims(part, p) {
  const s = size(part, p);
  let d = s.d + (s.handles !== "none" ? HANDLE_OUT : 0);
  if (s.open) {
    if (part === "dresser") d = Math.max(d, s.d + PULL + (s.handles !== "none" ? HANDLE_OUT : 0));
    else if (part === "nightstand") d = Math.max(d, s.d + 0.1 + (s.handles !== "none" ? HANDLE_OUT : 0));
    else if (leafW(part, s) > 0) d = Math.max(d, s.d + leafW(part, s) * Math.sin(AJAR));
  }
  return [s.w, Math.round(d * 1000) / 1000, s.h];
}

// The functional top a `top` row sits at (0 = none): every low unit's top; nothing over 1.10.
function surface(part, p) {
  const s = size(part, p);
  if (part === "wardrobe") return 0;
  return s.h <= 1.1 ? s.h : 0;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) parts[k] = { dims: dims(k, {}), surface: surface(k, {}), mount: "floor", mountY: 0, defaults: DEF[k] };
  return { family: "storage", script: "scripts/asset-library/gen-home/storage.js", parts, handles: HANDLES };
}

// ── emitters (townscape.js pattern; every point may pass through a transform T) ─────────────
const ID = (v) => v;

export function qd(ctx, paint, a, b, c, d) {
  if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
}

// Plain box, outward-wound. `skip` = letters of faces to omit: t(op) b(ottom) f(ront +z) k(back) l r.
export function bx(ctx, x0, x1, y0, y1, z0, z1, paint, skip, X) {
  const s = skip || "", F = X || ID;
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  const nnn = F([xa, ya, za]), pnn = F([xb, ya, za]), npn = F([xa, yb, za]), ppn = F([xb, yb, za]);
  const nnp = F([xa, ya, zb]), pnp = F([xb, ya, zb]), npp = F([xa, yb, zb]), ppp = F([xb, yb, zb]);
  if (s.indexOf("f") < 0) qd(ctx, paint, nnp, pnp, ppp, npp);
  if (s.indexOf("k") < 0) qd(ctx, paint, pnn, nnn, npn, ppn);
  if (s.indexOf("r") < 0) qd(ctx, paint, pnp, pnn, ppn, ppp);
  if (s.indexOf("l") < 0) qd(ctx, paint, nnn, nnp, npp, npn);
  if (s.indexOf("t") < 0) qd(ctx, paint, npp, ppp, ppn, npn);
  if (s.indexOf("b") < 0) qd(ctx, paint, nnn, pnn, pnp, nnp);
}

// Chamfered slab — tops and shelves. 0.008 is the furniture bevel.
export function slab(ctx, x0, x1, y0, y1, z0, z1, paint, bevel) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.008, paint);
}

// Rotation about a vertical hinge axis through (hx, hz) by angle a (radians, +a swings +x toward +z).
export function hinge(hx, hz, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return (v) => {
    const dx = v[0] - hx, dz = v[2] - hz;
    return [hx + dx * c - dz * s, v[1], hz + dx * s + dz * c];
  };
}
export function shift(dz) {
  return (v) => [v[0], v[1], v[2] + dz];
}

// Round tapered leg from foot A to head B, radii r0 → r1; smooth-shaded (tables.js).
export function roundLeg(ctx, A, B, r0, r1, sides, paint) {
  const f = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  ctx.smooth();
  G.loftFrames(
    ctx,
    [
      { c: A, f: f, up: [0, 0, -1], poly: G.oval(r0 * 2, r0 * 2, 0, 0, sides, 1) },
      { c: B, f: f, up: [0, 0, -1], poly: G.oval(r1 * 2, r1 * 2, 0, 0, sides, 1) },
    ],
    paint,
    { capStart: true, capEnd: false }
  );
  ctx.flat();
}

// ── cabinet anatomy ─────────────────────────────────────────────────────────
// An open-fronted carcass: outer shell (no front), the panel rim seen at the front, and the
// interior cavity (back wall, two sides, floor, ceiling) — so door gaps and open bays read deep.
export function carcass(ctx, paint, x0, x1, y0, y1, zB, zF) {
  bx(ctx, x0, x1, y0, y1, zB, zF, paint, "f");
  const X0 = x0 + T, X1 = x1 - T, Y0 = y0 + T, Y1 = y1 - T, ZB = zB + T;
  qd(ctx, paint, [x0, Y1, zF], [x1, Y1, zF], [x1, y1, zF], [x0, y1, zF]);
  qd(ctx, paint, [x0, y0, zF], [x1, y0, zF], [x1, Y0, zF], [x0, Y0, zF]);
  qd(ctx, paint, [x0, Y0, zF], [X0, Y0, zF], [X0, Y1, zF], [x0, Y1, zF]);
  qd(ctx, paint, [X1, Y0, zF], [x1, Y0, zF], [x1, Y1, zF], [X1, Y1, zF]);
  cavity(ctx, paint, X0, X1, Y0, Y1, ZB, zF);
}

// Interior faces of a box open toward +Z: back wall, both sides, floor, ceiling.
export function cavity(ctx, paint, x0, x1, y0, y1, zB, zF) {
  qd(ctx, paint, [x0, y0, zB], [x1, y0, zB], [x1, y1, zB], [x0, y1, zB]);
  qd(ctx, paint, [x0, y0, zF], [x0, y0, zB], [x0, y1, zB], [x0, y1, zF]);
  qd(ctx, paint, [x1, y0, zB], [x1, y0, zF], [x1, y1, zF], [x1, y1, zB]);
  qd(ctx, paint, [x0, y0, zF], [x1, y0, zF], [x1, y0, zB], [x0, y0, zB]);
  qd(ctx, paint, [x0, y1, zB], [x1, y1, zB], [x1, y1, zF], [x0, y1, zF]);
}

// A door leaf / drawer front: front face inside a 4 mm chamfer, four chamfer strips, four sides
// (no back — it sits against the carcass) unless X is a transform (an ajar door shows its back).
export function leaf(ctx, paint, x0, x1, y0, y1, zB, zF, X) {
  const F = X || ID, b = 0.004, zc = zF - b;
  const P = (x, y, z) => F([x, y, z]);
  qd(ctx, paint, P(x0 + b, y0 + b, zF), P(x1 - b, y0 + b, zF), P(x1 - b, y1 - b, zF), P(x0 + b, y1 - b, zF));
  qd(ctx, paint, P(x0, y0, zc), P(x1, y0, zc), P(x1 - b, y0 + b, zF), P(x0 + b, y0 + b, zF));
  qd(ctx, paint, P(x1, y1, zc), P(x0, y1, zc), P(x0 + b, y1 - b, zF), P(x1 - b, y1 - b, zF));
  qd(ctx, paint, P(x0, y1, zc), P(x0, y0, zc), P(x0 + b, y0 + b, zF), P(x0 + b, y1 - b, zF));
  qd(ctx, paint, P(x1, y0, zc), P(x1, y1, zc), P(x1 - b, y1 - b, zF), P(x1 - b, y0 + b, zF));
  qd(ctx, paint, P(x0, y0, zB), P(x0, y0, zc), P(x0, y1, zc), P(x0, y1, zB));
  qd(ctx, paint, P(x1, y0, zc), P(x1, y0, zB), P(x1, y1, zB), P(x1, y1, zc));
  qd(ctx, paint, P(x0, y1, zc), P(x1, y1, zc), P(x1, y1, zB), P(x0, y1, zB));
  qd(ctx, paint, P(x0, y0, zB), P(x1, y0, zB), P(x1, y0, zc), P(x0, y0, zc));
  if (X) qd(ctx, paint, P(x1, y0, zB), P(x0, y0, zB), P(x0, y1, zB), P(x1, y1, zB));
}

// Handle on a +Z leaf face at zF, centred (cx, cy). bar: two stand-offs + a rod; knob: a stem + cap.
export function handle(ctx, paint, style, cx, cy, zF, vertical, len, X) {
  if (style === "none") return;
  const F = X || ID;
  if (style === "knob") {
    const A = F([cx, cy, zF - 0.002]), B = F([cx, cy, zF + 0.012]), C = F([cx, cy, zF + 0.03]);
    ctx.smooth();
    G.tube(ctx, A, B, 0.006, 0.006, 8, [0, 1, 0], paint);
    G.tube(ctx, B, C, 0.015, 0.012, 8, [0, 1, 0], paint);
    ctx.flat();
    return;
  }
  const t = 0.006, a = len / 2 - 0.012, z1 = zF + 0.022, z2 = zF + HANDLE_OUT;
  if (vertical) {
    bx(ctx, cx - t, cx + t, cy - a - t, cy - a + t, zF - 0.002, z1, paint, "k", F);
    bx(ctx, cx - t, cx + t, cy + a - t, cy + a + t, zF - 0.002, z1, paint, "k", F);
    bx(ctx, cx - t, cx + t, cy - len / 2, cy + len / 2, z1 - 0.002, z2, paint, "", F);
  } else {
    bx(ctx, cx - a - t, cx - a + t, cy - t, cy + t, zF - 0.002, z1, paint, "k", F);
    bx(ctx, cx + a - t, cx + a + t, cy - t, cy + t, zF - 0.002, z1, paint, "k", F);
    bx(ctx, cx - len / 2, cx + len / 2, cy - t, cy + t, z1 - 0.002, z2, paint, "", F);
  }
}

// Recessed plinth under a carcass that starts at PL: inset 2 cm at the sides and back, PLIN at the front.
export function plinth(ctx, paint, x0, x1, zB, zF) {
  bx(ctx, x0 + 0.02, x1 - 0.02, 0, PL + 0.005, zB + 0.02, zF - PLIN, paint, "t");
}

// Lipped top: a chamfered slab flush at the sides, `lip` proud at the front, sunk 5 mm into the
// body (the sides stay flush so dims w is the nominal width).
export function lipTop(ctx, paint, x0, x1, yTop, zB, zF, lip) {
  const l = lip === undefined ? 0.01 : lip;
  slab(ctx, x0, x1, yTop - 0.025, yTop, zB, zF + l, paint, 0.006);
}

// Four splayed tapered legs under a body whose underside is at yB (nightstand, tv stand).
export function legs4(ctx, paint, x0, x1, zB, zF, yB) {
  const inset = 0.06;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx > 0 ? x1 - inset : x0 + inset, z = sz > 0 ? zF - inset : zB + inset;
      roundLeg(ctx, [x + sx * 0.02, 0.004, z + sz * 0.02], [x, yB + 0.01, z], 0.014, 0.022, 12, paint);
    }
  }
}

// ── parts ──────────────────────────────────────────────────────────────────
// A row of side-hung doors across x0..x1 between yB..yT on a carcass front at zB. hingeSide[i]
// = -1 (left) | 1 (right). `ajar` = index of the door swung 25°. Handles queue into `later`.
export function doorRow(ctx, C, s, x0, x1, yB, yT, zB, hinges, ajar, handleY, handleLen, later) {
  const n = hinges.length, dw = (x1 - x0) / n, zF = zB + DOOR;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * dw + GAP, b = x0 + (i + 1) * dw - GAP;
    const hs = hinges[i];
    let X = null;
    if (i === ajar) X = hs < 0 ? hinge(a, zB, AJAR) : hinge(b, zB, -AJAR);
    leaf(ctx, C.body, a, b, yB + GAP, yT - GAP, zB, zF, X);
    const hx = hs < 0 ? b - 0.05 : a + 0.05;
    later.push(() => handle(ctx, C.metal, s.handles, hx, handleY, zF, true, handleLen, X));
  }
}

export function wardrobe(ctx, C, s, later) {
  const x0 = -s.w / 2, x1 = s.w / 2, zB = -s.d / 2, zF = s.d / 2 - DOOR;
  carcass(ctx, C.body, x0, x1, PL, s.h, zB, zF);
  plinth(ctx, C.body, x0, x1, zB, zF);
  lipTop(ctx, C.body, x0, x1, s.h, zB, zF, 0);
  // interior: a shelf a hand under the top, the hanging rail below it (finish2, queued)
  const X0 = x0 + T, X1 = x1 - T, ZB = zB + T;
  const ys = s.h - 0.32;
  bx(ctx, X0 - 0.002, X1 + 0.002, ys, ys + T, ZB - 0.002, zF - 0.03, C.body);
  const ry = ys - 0.06, rz = (ZB + zF) / 2;
  later.push(() => {
    ctx.smooth();
    G.tube(ctx, [X0 - 0.002, ry, rz], [X1 + 0.002, ry, rz], 0.012, 0.012, 8, [0, 1, 0], C.metal);
    ctx.flat();
  });
  // doors: the leftmost hinges left, the rest hinge right (handles meet in pairs)
  const hinges = [];
  for (let i = 0; i < s.doors; i++) hinges.push(i === 0 ? -1 : 1);
  doorRow(ctx, C, s, X0, X1, PL, s.h - 0.026, zF, hinges, s.open ? 0 : -1, Math.min(1.05, s.h * 0.52), 0.3, later);
}

export function sideboard(ctx, C, s, later) {
  const x0 = -s.w / 2, x1 = s.w / 2, zB = -s.d / 2, zF = s.d / 2 - DOOR;
  const yTop = s.h;
  carcass(ctx, C.body, x0, x1, PL, yTop - 0.02, zB, zF);
  plinth(ctx, C.body, x0, x1, zB, zF);
  lipTop(ctx, C.body, x0, x1, yTop, zB, zF, 0.01);
  const X0 = x0 + T, X1 = x1 - T, ZB = zB + T;
  const ys = PL + (yTop - 0.02 - PL) / 2;
  bx(ctx, X0 - 0.002, X1 + 0.002, ys, ys + T, ZB - 0.002, zF - 0.03, C.body);
  const n = s.w >= 1.3 ? 3 : 2;
  const hinges = [];
  for (let i = 0; i < n; i++) hinges.push(i === 0 ? -1 : 1);
  doorRow(ctx, C, s, X0, X1, PL, yTop - 0.02 - 0.006, zF, hinges, s.open ? 0 : -1, PL + (yTop - PL) * 0.5, 0.2, later);
}

export function dresser(ctx, C, s, later) {
  const x0 = -s.w / 2, x1 = s.w / 2, zB = -s.d / 2, zF = s.d / 2 - DOOR;
  const yTop = s.h;
  carcass(ctx, C.body, x0, x1, PL, yTop - 0.02, zB, zF);
  plinth(ctx, C.body, x0, x1, zB, zF);
  lipTop(ctx, C.body, x0, x1, yTop, zB, zF, 0.01);
  const X0 = x0 + T, X1 = x1 - T;
  const cw = (X1 - X0) / s.cols, y0 = PL, y1 = yTop - 0.02 - 0.006, rh = (y1 - y0) / s.rows;
  const hl = Math.min(0.18, cw * 0.35);
  let k = 0;
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (k >= s.drawers) break;
      const a = X0 + c * cw + GAP, b = X0 + (c + 1) * cw - GAP;
      const yb = y1 - (r + 1) * rh + GAP, yt = y1 - r * rh - GAP;
      const pulled = s.open && r === 0 && c === s.cols - 1;
      const X = pulled ? shift(PULL) : null;
      if (pulled) {
        // the drawer box riding out with its front: outer sides + an open-topped interior
        const dz0 = zF - Math.min(0.3, s.d * 0.6), dz1 = zF + PULL;
        bx(ctx, a + 0.012, b - 0.012, yb + 0.012, yt - 0.025, dz0, dz1, C.body, "ft");
        cavity(ctx, C.body, a + 0.012 + 0.008, b - 0.012 - 0.008, yb + 0.02, yt - 0.025, dz0 + 0.008, dz1);
        qd(ctx, C.body, [a + 0.012, yt - 0.025, dz1], [b - 0.012, yt - 0.025, dz1], [b - 0.012 - 0.008, yt - 0.025, dz1], [a + 0.012 + 0.008, yt - 0.025, dz1]);
      }
      leaf(ctx, C.body, a, b, yb, yt, zF, zF + DOOR, X);
      const hy = (yb + yt) / 2;
      later.push(() => handle(ctx, C.metal, s.handles, (a + b) / 2, hy, zF + DOOR, false, hl, X));
      k++;
    }
  }
}

export function nightstand(ctx, C, s, later) {
  const x0 = -s.w / 2, x1 = s.w / 2, zB = -s.d / 2, zF = s.d / 2 - DOOR;
  const legH = 0.1, yB = legH, yTop = s.h;
  legs4(ctx, C.body, x0, x1, zB, zF, yB);
  carcass(ctx, C.body, x0, x1, yB, yTop - 0.02, zB, zF);
  lipTop(ctx, C.body, x0, x1, yTop, zB, zF, 0.01);
  const X0 = x0 + T, X1 = x1 - T;
  // one drawer front on top, an open niche below it
  const dh = 0.15, y1 = yTop - 0.02 - 0.006, yb = y1 - dh;
  const X = s.open ? shift(0.1) : null;
  if (s.open) {
    const dz0 = zF - s.d * 0.6, dz1 = zF + 0.1;
    bx(ctx, X0 + 0.012, X1 - 0.012, yb + 0.012, y1 - 0.025, dz0, dz1, C.body, "ft");
    cavity(ctx, C.body, X0 + 0.02, X1 - 0.02, yb + 0.02, y1 - 0.025, dz0 + 0.008, dz1);
  }
  leaf(ctx, C.body, X0 + GAP, X1 - GAP, yb + GAP, y1 - GAP, zF, zF + DOOR, X);
  // the niche floor is the carcass floor; a divider board under the drawer
  bx(ctx, X0 - 0.002, X1 + 0.002, yb - T, yb, zB + T - 0.002, zF, C.body, "k");
  later.push(() => handle(ctx, C.metal, s.handles, 0, (yb + y1) / 2, zF + DOOR, false, Math.min(0.16, s.w * 0.4), X));
}

export function tvstand(ctx, C, s, later) {
  const x0 = -s.w / 2, x1 = s.w / 2, zB = -s.d / 2, zF = s.d / 2 - DOOR;
  const legH = 0.12, yB = legH, yTop = s.h;
  legs4(ctx, C.body, x0, x1, zB, zF, yB);
  carcass(ctx, C.body, x0, x1, yB, yTop - 0.02, zB, zF);
  lipTop(ctx, C.body, x0, x1, yTop, zB, zF, 0.01);
  const X0 = x0 + T, X1 = x1 - T, ZB = zB + T;
  const inner = X1 - X0, dw = inner * 0.34;
  // centre niche: a divider on each side of it and a half-height shelf in it
  for (const xd of [X0 + dw, X1 - dw]) bx(ctx, xd - T / 2, xd + T / 2, yB + T - 0.002, yTop - 0.02 - T + 0.002, ZB - 0.002, zF, C.body, "k");
  const ys = yB + (yTop - 0.02 - yB) / 2;
  bx(ctx, X0 + dw + T / 2 - 0.002, X1 - dw - T / 2 + 0.002, ys, ys + T, ZB - 0.002, zF - 0.02, C.body);
  // two doors: left hinges left, right hinges right; horizontal bar handles high on each
  const yb = yB, yt = yTop - 0.02 - 0.006;
  const XL = s.open ? hinge(X0 + GAP, zF, AJAR) : null;
  leaf(ctx, C.body, X0 + GAP, X0 + dw - GAP, yb + GAP, yt - GAP, zF, zF + DOOR, XL);
  leaf(ctx, C.body, X1 - dw + GAP, X1 - GAP, yb + GAP, yt - GAP, zF, zF + DOOR, null);
  const hl = Math.min(0.18, dw * 0.4), hy = yt - 0.05;
  later.push(() => handle(ctx, C.metal, s.handles, X0 + dw / 2, hy, zF + DOOR, false, hl, XL));
  later.push(() => handle(ctx, C.metal, s.handles, X1 - dw / 2, hy, zF + DOOR, false, hl, null));
}

export function bookcase(ctx, C, s) {
  const x0 = -s.w / 2, x1 = s.w / 2, zB = -s.d / 2, zF = s.d / 2;
  const P = C.body;
  // sides full height, top slab, bottom board over a recessed kick, thin back
  bx(ctx, x0, x0 + T, 0, s.h - T + 0.002, zB, zF, P);
  bx(ctx, x1 - T, x1, 0, s.h - T + 0.002, zB, zF, P);
  slab(ctx, x0, x1, s.h - T, s.h, zB, zF, P, 0.006);
  const X0 = x0 + T, X1 = x1 - T;
  bx(ctx, X0 - 0.002, X1 + 0.002, PL, PL + T, zB, zF, P);
  bx(ctx, X0 - 0.002, X1 + 0.002, 0, PL + 0.002, zF - PLIN - T, zF - PLIN, P, "tb");
  bx(ctx, X0 - 0.002, X1 + 0.002, PL + T - 0.002, s.h - T + 0.002, zB + 0.004, zB + 0.012, P, "lrtb");
  // shelves: `shelves` open bays between the bottom board and the top
  const yA = PL + T, yZ = s.h - T, bay = (yZ - yA) / s.shelves;
  for (let i = 1; i < s.shelves; i++) {
    const y = yA + i * bay - T / 2;
    bx(ctx, X0 - 0.002, X1 + 0.002, y, y + T, zB + 0.012, zF - 0.01, P, "k");
  }
}

export function cube(ctx, C, s) {
  const x0 = -s.w / 2, x1 = s.w / 2, zB = -s.d / 2, zF = s.d / 2;
  const P = C.body;
  bx(ctx, x0, x1, 0, T, zB, zF, P);
  slab(ctx, x0, x1, s.h - T, s.h, zB, zF, P, 0.006);
  bx(ctx, x0, x0 + T, T - 0.002, s.h - T + 0.002, zB, zF, P, "tb");
  bx(ctx, x1 - T, x1, T - 0.002, s.h - T + 0.002, zB, zF, P, "tb");
  bx(ctx, x0 + T - 0.002, x1 - T + 0.002, T - 0.002, s.h - T + 0.002, zB + 0.004, zB + 0.012, P, "lrtb");
  for (let c = 1; c < s.cols; c++) {
    const x = x0 + c * PITCH + T / 2;
    bx(ctx, x - T / 2, x + T / 2, T - 0.002, s.h - T + 0.002, zB + 0.012, zF - 0.006, P, "tb");
  }
  for (let r = 1; r < s.rows; r++) {
    const y = r * PITCH + T / 2;
    bx(ctx, x0 + T - 0.002, x1 - T + 0.002, y - T / 2, y + T / 2, zB + 0.012, zF - 0.006, P, "lr");
  }
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "wardrobe";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    body: M.finish(ctx, p.finish, D.finish),
    metal: M.finish(ctx, p.finish2, D.finish2),
  };
  const later = []; // finish2 emitters, run after every finish face (albedo-ordered groups)
  if (part === "dresser") dresser(ctx, C, s, later);
  else if (part === "nightstand") nightstand(ctx, C, s, later);
  else if (part === "bookcase") bookcase(ctx, C, s);
  else if (part === "cube") cube(ctx, C, s);
  else if (part === "tvstand") tvstand(ctx, C, s, later);
  else if (part === "sideboard") sideboard(ctx, C, s, later);
  else wardrobe(ctx, C, s, later);
  for (const f of later) f();
}

export { PARTS, DEF, HANDLES, size, dims, surface, manifest };
