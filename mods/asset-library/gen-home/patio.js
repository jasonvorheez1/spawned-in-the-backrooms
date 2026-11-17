// PATIO — HYLLA's outdoor family, ONE generator (09b §3.13). Garden table, chair, lounger, parasol,
// planters, grills, the bench.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/patio.js",
//                params: { part: "lounger", finish: "rattan", finish2: "steel" } }
//
// FRAME (09b §1 `floor` mount): origin ON THE GROUND at the footprint centre, +Y up, front on +Z,
//        body x ±w/2 · z ±d/2 · y 0→h. `dims` = TOTAL extent (canopy, plants, lounger back counted).
// SCALE: table 0.74, chair seat 0.45, lounger deck 0.35, parasol rim 2.05, bench seat 0.45.
//
//   part: "table"    round ⌀1.00 × 0.74 | rect 1.60×0.90×0.74 (shape)   part: "planter"  square 0.40 × 0.45 | trough 0.90×0.35×0.40 (shape) + plants
//   part: "chair"    0.55×0.58×0.85 stacking, seat 0.45                part: "grill"    kettle ⌀0.57 × 1.00 | cart 1.20×0.60×0.95 (shape)
//   part: "lounger"  0.65×1.95, back at 35° (h 0.75)                  part: "bench"    1.50×0.60×0.90 slatted garden bench
//   part: "parasol"  ⌀2.70 × 2.40 canvas on a black pole + base
//
// PARAMS: shape ("round"|"rect" table; "square"|"trough" planter; "kettle"|"cart" grill) · w (round
//   table 0.80–1.40; bench 1.20–1.80; parasol 2.00–3.00) · finish (top / weave / canopy / planter
//   body / hood) · finish2 (frame / pole / legs). Soil and leaf paints are fixed.
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule; the parasol's
//   mesh collider is fine: its rim hangs at 2.05, over every head).
// DRAW GROUPS: ordered by albedo — finish, then finish2, then fixed soil / leaf / steel.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("scripts/lib/geom.js");
const M = require("lib/home-mat.js");

const PARTS = ["table", "chair", "lounger", "parasol", "planter", "grill", "bench"];
const SHAPES = {
  table: ["round", "rect"],
  planter: ["square", "trough"],
  grill: ["kettle", "cart"],
};

const DEF = {
  table: { shape: "round", w: 1.0, finish: "oak", finish2: "black" },
  chair: { finish: "rattan", finish2: "black" },
  lounger: { finish: "rattan", finish2: "steel" },
  parasol: { w: 2.7, finish: "canvas", finish2: "black" },
  planter: { shape: "square", finish: "concrete", finish2: "black" },
  grill: { shape: "kettle", finish: "black", finish2: "steel" },
  bench: { w: 1.5, finish: "oak", finish2: "black" },
};

const D2R = Math.PI / 180;
const TABLE_H = 0.74;
const SEAT = 0.45;

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}
export function pick(v, list, d) {
  return typeof v === "string" && list && list.indexOf(v) >= 0 ? v : d;
}

function size(part, p) {
  const D = DEF[part] || DEF.table;
  p = p || {};
  const s = { shape: pick(p.shape, SHAPES[part], D.shape || "") };
  if (part === "table") {
    if (s.shape === "rect") {
      s.w = 1.6;
      s.d = 0.9;
    } else {
      s.w = clamp(num(p.w, D.w), 0.8, 1.4);
      s.d = s.w;
    }
    s.h = TABLE_H;
  } else if (part === "chair") {
    s.w = 0.55;
    s.d = 0.58;
    s.h = 0.85;
  } else if (part === "lounger") {
    s.w = 0.65;
    s.d = 1.95;
    s.h = 0.75;
  } else if (part === "parasol") {
    s.w = clamp(num(p.w, D.w), 2.0, 3.0);
    s.d = s.w;
    s.h = 2.4;
  } else if (part === "planter") {
    if (s.shape === "trough") {
      s.w = 0.9;
      s.d = 0.35;
      s.h = 0.4;
      s.plant = 0.25;
    } else {
      s.w = 0.4;
      s.d = 0.4;
      s.h = 0.45;
      s.plant = 0.25;
    }
  } else if (part === "grill") {
    if (s.shape === "cart") {
      s.w = 1.2;
      s.d = 0.6;
      s.h = 0.95;
    } else {
      s.w = 0.57;
      s.d = 0.57;
      s.h = 1.0;
    }
  } else {
    s.w = clamp(num(p.w, D.w), 1.2, 1.8);
    s.d = 0.6;
    s.h = 0.9;
  }
  return s;
}

// [w, d, hTotal] — total extent (planter plants included).
function dims(part, p) {
  const s = size(part, p);
  return [s.w, s.d, part === "planter" ? s.h + s.plant : s.h];
}

// The functional top a `top` row sits at: tables, the cart grill's side shelf, the bench seat (0 = none).
function surface(part, p) {
  const s = size(part, p);
  if (part === "table") return s.h;
  return 0;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) {
    parts[k] = { dims: dims(k, {}), surface: surface(k, {}), mount: "floor", mountY: 0, defaults: DEF[k] };
    const alt = SHAPES[k];
    if (alt) parts[k + "-" + alt[1]] = { dims: dims(k, { shape: alt[1] }), surface: surface(k, { shape: alt[1] }), mount: "floor", mountY: 0, defaults: { shape: alt[1] } };
  }
  return { family: "patio", script: "scripts/asset-library/gen-home/patio.js", parts, shapes: SHAPES };
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

export function slab(ctx, x0, x1, y0, y1, z0, z1, paint, bevel) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.008, paint);
}

export function post(ctx, x, z, y0, y1, w0, d0, w1, d1, bevel, paint, caps) {
  const c = caps || {};
  G.loftFrames(
    ctx,
    [
      { c: [x, y0, z], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w0, d0, 0, 0, bevel) },
      { c: [x, y1, z], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w1, d1, 0, 0, bevel) },
    ],
    paint,
    { capStart: c.start !== false, capEnd: c.end !== false }
  );
}

// A rigid frame: R = Ry(yaw)·Rx(pitch)·Rz(roll), then translate. Degrees. Positive pitch tips +Y toward +Z.
export function xf(px, py, pz, yaw, pitch, roll) {
  const cy = Math.cos((yaw || 0) * D2R), sy = Math.sin((yaw || 0) * D2R);
  const cp = Math.cos((pitch || 0) * D2R), sp = Math.sin((pitch || 0) * D2R);
  const cr = Math.cos((roll || 0) * D2R), sr = Math.sin((roll || 0) * D2R);
  const m = [cy * cr + sy * sp * sr, -cy * sr + sy * sp * cr, sy * cp, cp * sr, cp * cr, -sp, -sy * cr + cy * sp * sr, sy * sr + cy * sp * cr, cy * cp];
  const f = (x, y, z) => [px + m[0] * x + m[1] * y + m[2] * z, py + m[3] * x + m[4] * y + m[5] * z, pz + m[6] * x + m[7] * y + m[8] * z];
  f.dir = (x, y, z) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
  return f;
}

// A box in an arbitrary frame: centre o, half extents h.
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

// Superellipse ring at height y (P convention: bottom→top lofts face outward, top→bottom inward).
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
// Chamfered-rect ring at height y, same orientation as oring (8 points).
export function rring(cx, cz, y, w, d, bevel) {
  return G.pathRings([{ c: [cx, y, cz], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w, d, 0, 0, bevel) }])[0];
}
export function annulus(ctx, outer, inner, paint) {
  const n = outer.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    qd(ctx, paint, outer[i], outer[j], inner[j], inner[i]);
  }
}
export function shell(ctx, rings, paint, capStart, capEnd, flat) {
  if (!flat) ctx.smooth();
  G.loft(ctx, rings, { paint, capStart: !!capStart, capEnd: !!capEnd });
  ctx.flat();
}

// Up-facing fan over a ring in oring/rring order (a soil surface, a lid top).
export function fanUp(ctx, ring, paint) {
  for (let k = 1; k < ring.length - 1; k++) tr(ctx, paint, ring[0], ring[k], ring[k + 1]);
}

// Chamfered disc (round tops, bases).
export function disc(ctx, cx, y0, y1, cz, r, bevel, sides, paint) {
  const e = Math.min(bevel, (y1 - y0) * 0.3, r * 0.3);
  ctx.smooth();
  G.loft(ctx, [oring(cx, cz, y0, (r - e) * 2, (r - e) * 2, sides), oring(cx, cz, y0 + e, r * 2, r * 2, sides), oring(cx, cz, y1 - e, r * 2, r * 2, sides), oring(cx, cz, y1, (r - e) * 2, (r - e) * 2, sides)], { paint });
  ctx.flat();
}

// Round tube leg between two points.
export function leg(ctx, A, B, r, sides, paint) {
  ctx.smooth();
  G.tube(ctx, A, B, r, r, sides || 8, [0, 0, 1], paint);
  ctx.flat();
}

// ── parts ──────────────────────────────────────────────────────────────────
// Round: chamfered disc top on four splayed round legs with a low cross brace. Rect: slatted top on
// a square-post frame.
export function table(ctx, C, s) {
  const h = s.h;
  if (s.shape === "rect") {
    const w = s.w, d = s.d, t = 0.03, n = 7, gap = 0.012;
    const sw = (d - (n - 1) * gap) / n;
    for (let i = 0; i < n; i++) {
      const z0 = -d / 2 + i * (sw + gap);
      bx(ctx, -w / 2, w / 2, h - t, h, z0, z0 + sw, C.top, "b");
    }
    // frame: aprons + posts
    const P = 0.05, ix = w / 2 - 0.06, iz = d / 2 - 0.05, ya = h - t - 0.003;
    bx(ctx, -ix, ix, ya - 0.06, ya, iz - P, iz, C.frame, "t");
    bx(ctx, -ix, ix, ya - 0.06, ya, -iz, -iz + P, C.frame, "t");
    bx(ctx, -ix, -ix + P, ya - 0.06, ya, -iz + P, iz - P, C.frame, "t");
    bx(ctx, ix - P, ix, ya - 0.06, ya, -iz + P, iz - P, C.frame, "t");
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * (ix - P / 2), sz * (iz - P / 2), 0, ya, P, P, P, P, 0.005, C.frame, { end: false });
    return;
  }
  const R = s.w / 2, t = 0.03;
  disc(ctx, 0, h - t, h, 0, R, 0.008, 24, C.top);
  const rt = R * 0.62, rf = R * 0.8;
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const top = [Math.cos(a) * rt, h - t - 0.002, -Math.sin(a) * rt], foot = [Math.cos(a) * rf, 0, -Math.sin(a) * rf];
    leg(ctx, foot, top, 0.016, 8, C.frame);
    pts.push([Math.cos(a) * (rf - (rf - rt) * 0.2), 0.16, -Math.sin(a) * (rf - (rf - rt) * 0.2)]);
  }
  leg(ctx, pts[0], pts[2], 0.008, 6, C.frame);
  leg(ctx, pts[1], pts[3], 0.008, 6, C.frame);
}

// Stacking chair: rattan seat + tilted back on four splayed tube legs; rear legs run up as the back's uprights.
export function chair(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h;
  const yS = SEAT, t = 0.03;
  const zFront = d / 2 - 0.03, zBack = -d / 2 + 0.05;
  // finish: seat and back panel (tilted 12° back)
  slab(ctx, -w / 2 + 0.02, w / 2 - 0.02, yS - t, yS, zBack + 0.03, zFront, C.top, 0.008);
  const tilt = -12, bh = 0.34, bz = zBack + 0.02;
  const f = xf(0, yS + 0.06, bz, 0, tilt, 0);
  fbox(ctx, f, [0, bh / 2 + 0.03, 0], [w / 2 - 0.04, bh / 2, 0.012], C.top);
  // finish2: legs (front pair splayed forward, rear pair straight on to the back uprights)
  const lx = w / 2 - 0.04;
  for (const sx of [-1, 1]) {
    leg(ctx, [sx * (lx + 0.02), 0, zFront + 0.02], [sx * (lx - 0.02), yS - t, zFront - 0.05], 0.012, 8, C.frame);
    const top = f(sx * (lx - 0.03), bh + 0.1, 0);
    leg(ctx, [sx * (lx + 0.01), 0, zBack - 0.02], [sx * (lx - 0.03), yS - t, zBack + 0.03], 0.012, 8, C.frame);
    leg(ctx, [sx * (lx - 0.03), yS - t, zBack + 0.03], top, 0.012, 8, C.frame);
  }
  // seat rails
  bx(ctx, -lx, lx, yS - t - 0.03, yS - t, zFront - 0.06, zFront - 0.04, C.frame, "t");
  bx(ctx, -lx, lx, yS - t - 0.03, yS - t, zBack + 0.03, zBack + 0.05, C.frame, "t");
}

// Sun lounger: rattan deck + back at 35° on a tube frame; four legs, three cross rails.
export function lounger(ctx, C, s) {
  const w = s.w, d = s.d, yD = 0.33; // deck top
  const zFoot = d / 2, zHinge = -0.15, back = 0.74, ang = 40; // back raised 40° above the deck
  const zHead = zHinge - Math.cos(ang * D2R) * back, yHead = yD + Math.sin(ang * D2R) * back;
  const rx = w / 2 - 0.025;
  // finish: flat deck, tilted back
  bx(ctx, -w / 2 + 0.04, w / 2 - 0.04, yD - 0.04, yD, zHinge + 0.02, zFoot - 0.03, C.top);
  const f = xf(0, yD - 0.02, zHinge, 0, -(90 - ang), 0);
  fbox(ctx, f, [0, back / 2 + 0.02, 0], [w / 2 - 0.04, back / 2 - 0.01, 0.02], C.top);
  // finish2: side rails (foot → hinge → head), cross rails, legs
  for (const sx of [-1, 1]) {
    ctx.smooth();
    G.polyTube(ctx, [[sx * rx, yD - 0.02, zFoot - 0.01], [sx * rx, yD - 0.02, zHinge], [sx * rx, yHead - 0.02, zHead]], 0.016, 8, [0, 1, 0], C.frame);
    ctx.flat();
    leg(ctx, [sx * rx, 0, zFoot - 0.15], [sx * rx, yD - 0.03, zFoot - 0.15], 0.014, 8, C.frame);
    leg(ctx, [sx * rx, 0, zHinge + 0.12], [sx * rx, yD - 0.03, zHinge + 0.12], 0.014, 8, C.frame);
  }
  for (const z of [zFoot - 0.02, zHinge]) leg(ctx, [-rx, yD - 0.02, z], [rx, yD - 0.02, z], 0.012, 8, C.frame);
  leg(ctx, [-rx, yHead - 0.02, zHead], [rx, yHead - 0.02, zHead], 0.012, 8, C.frame);
}

// Parasol: eight canvas panels from a tip at 2.40 to a rim at 2.05 with a short valance; black pole
// and a weighted base disc. Both windings on the sheet — it is seen from below and above.
export function parasol(ctx, C, s) {
  const R = s.w / 2, yTip = s.h, yRim = yTip - 0.35, val = 0.1, n = 8;
  const P = (i, y, r) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    return [Math.cos(a) * r, y, -Math.sin(a) * r];
  };
  const tip = [0, yTip, 0];
  for (let i = 0; i < n; i++) {
    const a = P(i, yRim, R), b = P(i + 1, yRim, R);
    const a2 = P(i, yRim - val, R * 0.99), b2 = P(i + 1, yRim - val, R * 0.99);
    tr(ctx, C.top, a, b, tip);
    tr(ctx, C.top, b, a, tip);
    qd(ctx, C.top, a2, b2, b, a);
    qd(ctx, C.top, b2, a2, a, b);
  }
  // finish2: base disc, pole, finial
  disc(ctx, 0, 0, 0.05, 0, 0.25, 0.01, 16, C.frame);
  leg(ctx, [0, 0.05, 0], [0, yRim + 0.28, 0], 0.022, 10, C.frame);
  ctx.smooth();
  G.tube(ctx, [0, yTip - 0.08, 0], [0, yTip, 0], 0.03, 0.01, 8, [0, 0, 1], C.frame);
  ctx.flat();
}

// Planter: tapered chamfered-rect pot (finish) with a rim, soil surface and leafy shrubs.
export function planter(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h, wall = 0.03;
  const O = [rring(0, 0, 0, w - 0.05, d - 0.05, 0.02), rring(0, 0, 0.03, w - 0.03, d - 0.03, 0.02), rring(0, 0, h, w, d, 0.02)];
  const I = [rring(0, 0, h, w - 2 * wall, d - 2 * wall, 0.015), rring(0, 0, h - 0.06, w - 2 * wall - 0.01, d - 2 * wall - 0.01, 0.015)];
  shell(ctx, O, C.top, true, false, true);
  annulus(ctx, O[2], I[0], C.top);
  shell(ctx, I, C.top, false, false, true);
  // soil surface (fixed)
  fanUp(ctx, I[1], C.soil);
  // leaf: shrubs — three on a square pot, five along a trough
  const shrubs = s.shape === "trough" ? [[-0.3, 0.02], [-0.15, -0.05], [0, 0.04], [0.16, -0.03], [0.31, 0.02]] : [[-0.07, 0.05], [0.08, 0.03], [0, -0.08]];
  const y0 = h - 0.06, r = s.shape === "trough" ? 0.11 : 0.13, up = s.plant;
  for (const p of shrubs) {
    const rr = r * (0.85 + ctx.random() * 0.3), hh = up * (0.8 + ctx.random() * 0.25);
    shell(ctx, [oring(p[0], p[1], y0, rr * 0.9, rr * 0.9, 8, 0.8), oring(p[0], p[1], y0 + hh * 0.55, rr * 2, rr * 2, 8, 0.8), oring(p[0], p[1], y0 + hh, rr * 0.9, rr * 0.9, 8, 0.8)], C.leaf, false, true);
  }
}

// Grill. Kettle: bowl + domed lid on three splayed legs with a bar tray. Cart: black hood on a firebox
// over a steel cart with two side shelves and wheels.
export function grill(ctx, C, s) {
  if (s.shape === "cart") {
    const w = s.w, d = s.d, h = s.h;
    const bw = 0.6, bd = 0.46, yLeg = 0.42, yBox = 0.7;
    // finish (black): firebox, hood, knobs, wheels
    bx(ctx, -bw / 2, bw / 2, yLeg, yBox, -bd / 2, bd / 2, C.top, "b");
    slab(ctx, -bw / 2, bw / 2, yBox + 0.004, h, -bd / 2, bd / 2, C.top, 0.02);
    ctx.smooth();
    for (let i = 0; i < 3; i++) G.tube(ctx, [-0.15 + i * 0.15, yLeg + 0.08, bd / 2], [-0.15 + i * 0.15, yLeg + 0.08, bd / 2 + 0.03], 0.02, 0.018, 8, [0, 1, 0], C.top);
    // two wheels on the left end, axle along x (travel outward so the kit winds them for us)
    for (const zw of [-bd / 2 + 0.08, bd / 2 - 0.08])
      G.loftFrames(
        ctx,
        [
          { c: [-bw / 2 + 0.02, 0.1, zw], f: [-1, 0, 0], up: [0, 1, 0], poly: G.oval(0.2, 0.2, 0, 0, 10, 1) },
          { c: [-bw / 2 - 0.015, 0.1, zw], f: [-1, 0, 0], up: [0, 1, 0], poly: G.oval(0.2, 0.2, 0, 0, 10, 1) },
        ],
        C.top
      );
    ctx.flat();
    // finish2 (steel): side shelves, legs, bottom shelf, hood handle
    for (const sx of [-1, 1]) slab(ctx, sx * (bw / 2 + 0.01), sx * (w / 2), yBox - 0.02, yBox, -bd / 2 + 0.02, bd / 2 - 0.02, C.frame, 0.006);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * (bw / 2 - 0.03), sz * (bd / 2 - 0.03), 0.1, yLeg, 0.03, 0.03, 0.03, 0.03, 0.004, C.frame, { start: false, end: false });
    bx(ctx, -bw / 2 + 0.02, bw / 2 - 0.02, 0.14, 0.16, -bd / 2 + 0.02, bd / 2 - 0.02, C.frame);
    leg(ctx, [-0.2, h - 0.12, bd / 2 + 0.06], [0.2, h - 0.12, bd / 2 + 0.06], 0.012, 8, C.frame);
    for (const sx of [-1, 1]) leg(ctx, [sx * 0.2, h - 0.12, bd / 2], [sx * 0.2, h - 0.12, bd / 2 + 0.06], 0.008, 6, C.frame);
    return;
  }
  const R = s.w / 2, yB = 0.5, yRim = 0.72, N = 12;
  // finish (black): bowl + lid
  shell(ctx, [oring(0, 0, yB, 0.24, 0.24, N), oring(0, 0, yB + 0.08, R * 1.5, R * 1.5, N), oring(0, 0, yRim, R * 2, R * 2, N)], C.top, true, false);
  shell(ctx, [oring(0, 0, yRim + 0.005, R * 2, R * 2, N), oring(0, 0, yRim + 0.1, R * 1.75, R * 1.75, N), oring(0, 0, yRim + 0.2, R * 1.05, R * 1.05, N), oring(0, 0, yRim + 0.245, R * 0.35, R * 0.35, N)], C.top, false, true);
  ctx.smooth();
  G.polyTube(ctx, [[-0.07, yRim + 0.24, 0], [-0.05, yRim + 0.28, 0], [0.05, yRim + 0.28, 0], [0.07, yRim + 0.24, 0]], 0.009, 8, [0, 0, 1], C.top);
  ctx.flat();
  // finish2 (steel): three legs, bar tray
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const top = [Math.cos(a) * 0.15, yB + 0.06, -Math.sin(a) * 0.15], foot = [Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25];
    leg(ctx, foot, top, 0.011, 8, C.frame);
    pts.push([Math.cos(a) * 0.215, 0.2, -Math.sin(a) * 0.215]);
  }
  for (let i = 0; i < 3; i++) leg(ctx, pts[i], pts[(i + 1) % 3], 0.006, 6, C.frame);
}

// Garden bench: five seat slats + three back slats (finish) on two cast end frames (finish2).
export function bench(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h, t = 0.03;
  const yS = SEAT, zF = d / 2 - 0.04, zB = -d / 2 + 0.1;
  const n = 5, gap = 0.014, sw = (zF - zB - (n - 1) * gap) / n;
  for (let i = 0; i < n; i++) {
    const z0 = zB + i * (sw + gap);
    bx(ctx, -w / 2 + 0.03, w / 2 - 0.03, yS - t, yS, z0, z0 + sw, C.top, "b");
  }
  const tilt = -10, f = xf(0, yS, zB - 0.02, 0, tilt, 0);
  for (let i = 0; i < 3; i++) fbox(ctx, f, [0, 0.12 + i * 0.12, 0], [w / 2 - 0.03, 0.045, 0.012], C.top);
  // end frames: front post, raked back post, arm, seat rail
  const P = 0.045, ex = w / 2 - 0.03 - P / 2, rake = Math.sin(-tilt * D2R);
  const L = h / Math.cos(tilt * D2R); // raked post length so its top reaches h
  for (const sx of [-1, 1]) {
    post(ctx, sx * ex, zF - P / 2, 0, yS - t, P, P, P, P, 0.005, C.frame, { end: false });
    // back post: a tilted box from the floor to the top rail
    const bp = xf(sx * ex, 0, zB - 0.02, 0, tilt, 0);
    fbox(ctx, bp, [0, L / 2, 0], [P / 2, L / 2, P / 2], C.frame);
    // seat rail and arm both run back into the raked post
    bx(ctx, sx * ex - P / 2, sx * ex + P / 2, yS - t - 0.05, yS - t, zB - 0.02 - (yS - t) * rake, zF, C.frame, "t");
    bx(ctx, sx * ex - P / 2 - 0.01, sx * ex + P / 2 + 0.01, yS + 0.2, yS + 0.24, zB - 0.02 - (yS + 0.22) * rake, zF - 0.02, C.frame);
    post(ctx, sx * ex, zF - P / 2 - 0.02, yS, yS + 0.2, 0.025, 0.025, 0.025, 0.025, 0.003, C.frame, { start: false, end: false });
  }
  bx(ctx, -ex + P / 2, ex - P / 2, 0.12, 0.15, zF - P - 0.01, zF - P + 0.01, C.frame);
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "table";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    top: M.finish(ctx, p.finish, D.finish),
    frame: M.finish(ctx, p.finish2, D.finish2),
    soil: M.finish(ctx, "soil", "soil"),
    leaf: M.finish(ctx, "leaf", "leaf"),
  };
  if (part === "chair") chair(ctx, C, s);
  else if (part === "lounger") lounger(ctx, C, s);
  else if (part === "parasol") parasol(ctx, C, s);
  else if (part === "planter") planter(ctx, C, s);
  else if (part === "grill") grill(ctx, C, s);
  else if (part === "bench") bench(ctx, C, s);
  else table(ctx, C, s);
}

export { PARTS, DEF, SHAPES, size, dims, surface, manifest };
