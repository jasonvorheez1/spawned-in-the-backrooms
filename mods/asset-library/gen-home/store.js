// STORE — HYLLA's fixtures, ONE generator (09a §8; 09z seam 12: the 27 hyphenated part names).
// Everything that is the store and not the product: shelving, racks, carts, counters, cards,
// arrows, escalators, rails, poles, plinths, set walls, frames, skylights, the roof, the letters.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/store.js",
//                params: { part: "gondola", len: 9, h: 1.8, w: 2.4, shelves: 4, bins: true } }
//
// FRAME (townscape.js contract): origin ON THE GROUND at the footprint centre, +Y up. Anything
//        with a front puts it on +Z (cart handles, counters, cards, walls, frames, boards — yaw the
//        row to aim); anything that runs in a line runs along +Z (gondola, rack, cart-row,
//        bollard-row, guard-rail, checkout-lane, column-row, escalator). Exceptions carry a front
//        AND a length: cafe-counter, set-wall, glazing-frame, canopy, letters run along X, front +Z.
// SCALE: real store — gondola 1.80, rack 4.80 (ground ceiling 5.20 − 0.40), café table 0.75,
//        counter worktop 0.90 / tray rail 1.10, escalator rise 5.47 over 25 × 0.44 treads.
//
//   part            params (defaults)                              surface   physics (row)
//   gondola         len 9, h 1.8, w 2.4, shelves 4, bins           h (1.80)  mesh
//   rack            len 11, h 4.8, w 1.1, bays 4, stacks 0.7       —         mesh
//   flatpack-stack  w 1.1, d 0.6, count 5, pallet                  —         mesh
//   cart            —                                              —         mesh
//   cart-row        count 12, spacing 0.55, handles                —         mesh
//   cart-return     bays 2                                         —         mesh
//   checkout-lane   open, belt 3.0, number                         0.90      mesh
//   cafe-counter    len 10, h 0.9, rail 1.1                        h (0.90)  mesh
//   cafe-table      shape round|square, r 0.4, w 0.8, h 0.75       h (0.75)  mesh
//   price-card      w 0.3, h 0.42, post                            —         none
//   floor-arrow     count 1, gap 6, dir 0 (deg CCW, 0 = +Z), t     —         none
//   escalator       rise 5.47, steps 25, tread 0.44, dir north     —         none (09a: ramp rows) — collider() = walkable ramp
//   guard-rail      len 4, h 1.1, panel                            —         mesh
//   flag-pole       h 14, flagW 2, flagH 1.2                       —         mesh
//   bollard         h 1.0                                          —         mesh
//   bollard-row     count 5, step 3, h 1.0                         —         mesh
//   bag-bin         —                                              —         mesh
//   plinth          w 4, d 3, h 0.12                               h (0.12)  mesh
//   set-wall        w 4, h 2.7, t 0.12, door false|true|{x,w,h}    —         mesh
//   door-frame      w 1.0, h 2.1                                   —         none
//   column-row      zs [..], h 5.17, s 0.5                         —         mesh
//   glazing-frame   w 24, h 4.5, pane 2.4, door {x,w,h}|false      —         mesh (mullions)
//   skylight        w 4, d 4, kerb 0.3                             —         none
//   roof-slab       w 95.4, d 59.4, t 0.4, holes [[x0,x1,z0,z1]]   —         none
//   letters         text "HYLLA", h 2.4, glow                      —         none
//   canopy          w 16, d 6, y 3.6, t 0.6                        —         mesh
//   bus-shelter     w 4, d 1.5, h 2.5                              —         mesh
//   store-map       —                                              —         mesh
//   trolley-flatbed —                                              —         mesh
//   aisle-board     w 1.2, h 0.6, hang 1.0                         —         none
//
// FINISHES: finish / finish2 per part (defaults in DEF), resolved through lib/home-mat.js — never
//   a literal texture path here. Fixed accents: hylla-blue, hylla-yellow, steel, black, cardboard.
// DRAW GROUPS: ordered by albedo — every face of one paint, then the next; glow and glass LAST.
// COLLISION: physics is a row property (09b §5). collider() below re-emits the visual mesh for
//   every part EXCEPT escalator, whose collider is the walkable ramp + plates + balustrade slabs
//   (the stepped picture is dressing). manifest().parts.escalator.ramp carries the derived box for
//   09a §5's invisible `esc-ramp` rows — nothing hand-types 0.22 or 5.50.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("scripts/lib/geom.js");
const M = require("lib/home-mat.js");

const D2R = Math.PI / 180;

const PARTS = [
  "gondola", "rack", "flatpack-stack", "cart", "cart-row", "cart-return", "checkout-lane",
  "cafe-counter", "cafe-table", "price-card", "floor-arrow", "escalator", "guard-rail",
  "flag-pole", "bollard", "bollard-row", "bag-bin", "plinth", "set-wall", "door-frame",
  "column-row", "glazing-frame", "skylight", "roof-slab", "letters", "canopy", "bus-shelter",
  "store-map", "trolley-flatbed", "aisle-board",
];

// Rows that stand as decor (09a §8 "none"); every other part collides as its mesh.
const NO_PHYSICS = ["price-card", "floor-arrow", "escalator", "door-frame", "skylight", "roof-slab", "letters", "aisle-board"];

// Shipped defaults per part — finish = primary paint, finish2 = secondary (frame / metal).
const DEF = {
  gondola: { len: 9, h: 1.8, w: 2.4, shelves: 4, bins: true, finish: "white", finish2: "hylla-blue" },
  rack: { len: 11, h: 4.8, w: 1.1, bays: 4, stacks: 0.7, finish: "hylla-blue", finish2: "hylla-yellow" },
  "flatpack-stack": { w: 1.1, d: 0.6, count: 5, pallet: true, finish: "cardboard", finish2: "pine" },
  cart: { finish: "steel", finish2: "hylla-blue" },
  "cart-row": { count: 12, spacing: 0.55, handles: true, finish: "steel", finish2: "hylla-blue" },
  "cart-return": { bays: 2, finish: "steel", finish2: "hylla-yellow" },
  "checkout-lane": { open: false, belt: 3.0, number: 1, finish: "white", finish2: "hylla-blue" },
  "cafe-counter": { len: 10, h: 0.9, rail: 1.1, finish: "oak", finish2: "steel" },
  "cafe-table": { shape: "round", r: 0.4, w: 0.8, h: 0.75, finish: "white", finish2: "steel" },
  "price-card": { w: 0.3, h: 0.42, post: false, finish: "hylla-blue", finish2: "steel" },
  "floor-arrow": { count: 1, gap: 6, dir: 0, t: 0.03, finish: "hylla-yellow" },
  escalator: { rise: 5.47, steps: 25, tread: 0.44, dir: "north", finish: "steel", finish2: "black" },
  "guard-rail": { len: 4, h: 1.1, panel: true, finish: "white", finish2: "steel" },
  "flag-pole": { h: 14, flagW: 2, flagH: 1.2, finish: "hylla-blue", finish2: "steel" },
  bollard: { h: 1.0, finish: "steel", finish2: "hylla-yellow" },
  "bollard-row": { count: 5, step: 3, h: 1.0, finish: "steel", finish2: "hylla-yellow" },
  "bag-bin": { finish: "hylla-yellow", finish2: "steel" },
  plinth: { w: 4, d: 3, h: 0.12, finish: "birch" },
  "set-wall": { w: 4, h: 2.7, t: 0.12, door: false, finish: "white" },
  "door-frame": { w: 1.0, h: 2.1, finish: "hylla-yellow" },
  "column-row": { zs: [-12, -31, -44], h: 5.17, s: 0.5, finish: "steel" },
  "glazing-frame": { w: 24, h: 4.5, pane: 2.4, door: { x: 0, w: 6, h: 2.6 }, finish: "black" },
  skylight: { w: 4, d: 4, kerb: 0.3, finish: "steel" },
  "roof-slab": { w: 95.4, d: 59.4, t: 0.4, holes: [], finish: "concrete", finish2: "white" },
  letters: { text: "HYLLA", h: 2.4, glow: false, finish: "hylla-yellow" },
  canopy: { w: 16, d: 6, y: 3.6, t: 0.6, finish: "hylla-yellow", finish2: "steel" },
  "bus-shelter": { w: 4, d: 1.5, h: 2.5, finish: "steel", finish2: "oak" },
  "store-map": { finish: "hylla-blue", finish2: "steel" },
  "trolley-flatbed": { finish: "hylla-blue", finish2: "steel" },
  "aisle-board": { w: 1.2, h: 0.6, hang: 1.0, finish: "hylla-blue", finish2: "hylla-yellow" },
};

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}
export function bool(v, d) {
  return v === undefined || v === null ? !!d : !!v;
}
export function int(v, d, a, b) {
  return clamp(Math.round(num(v, d)), a, b);
}

// ── sizes (what geometry() builds and what manifest() reports) ─────────────
// One owner: lib/home-esc.js (mod-scoped → asset-library/lib/home-esc.js). hall.js reads the same
// module for the invisible ramp / plate / rail box rows, so nothing types 0.22 or 5.50 twice.
const ESC = require("lib/home-esc.js");
function escSpec(p) {
  return ESC.escSpec(p || {});
}

const SIZE = {
  gondola: (p) => {
    const len = clamp(num(p.len, 9), 1.2, 30), h = clamp(num(p.h, 1.8), 0.8, 2.6), w = clamp(num(p.w, 2.4), 0.8, 3.2);
    return { len, h, w, shelves: int(p.shelves, 4, 1, 8), bins: bool(p.bins, true), dims: [w, len, h], surface: h };
  },
  rack: (p) => {
    const len = clamp(num(p.len, 11), 2, 30), h = clamp(num(p.h, 4.8), 2, 9), w = clamp(num(p.w, 1.1), 0.8, 2.4);
    return { len, h, w, bays: int(p.bays, 4, 1, 12), stacks: clamp(num(p.stacks, 0.7), 0, 1), dims: [w, len, h] };
  },
  "flatpack-stack": (p) => {
    const w = clamp(num(p.w, 1.1), 0.4, 2.4), d = clamp(num(p.d, 0.6), 0.3, 1.6), count = int(p.count, 5, 1, 14), pallet = bool(p.pallet, true);
    const h = (pallet ? 0.14 : 0) + count * 0.11;
    return { w, d, count, pallet, dims: [pallet ? Math.max(w, 1.2) : w, pallet ? Math.max(d, 0.8) : d, h] };
  },
  cart: () => ({ dims: [0.62, 0.95, 1.0] }),
  "cart-row": (p) => {
    const count = int(p.count, 12, 1, 40), spacing = clamp(num(p.spacing, 0.55), 0.3, 1.2);
    return { count, spacing, handles: bool(p.handles, true), dims: [0.62, (count - 1) * spacing + 0.95, 1.0] };
  },
  "cart-return": (p) => {
    const bays = int(p.bays, 2, 1, 4);
    return { bays, dims: [bays * 1.4 + 0.4, 5.4, 2.4] };
  },
  "checkout-lane": (p) => {
    const belt = clamp(num(p.belt, 3.0), 1.5, 5), h = 0.9;
    return { belt, open: bool(p.open, false), number: int(p.number, 1, 1, 99), h, len: belt + 2.6, dims: [1.0, belt + 2.6, 2.7], surface: h };
  },
  "cafe-counter": (p) => {
    const len = clamp(num(p.len, 10), 1.5, 30), h = clamp(num(p.h, 0.9), 0.7, 1.2), rail = clamp(num(p.rail, 1.1), h, h + 0.4);
    return { len, h, rail, dims: [len + 0.04, 1.3, rail], surface: h };
  },
  "cafe-table": (p) => {
    const shape = p.shape === "square" ? "square" : "round", r = clamp(num(p.r, 0.4), 0.25, 0.8), w = clamp(num(p.w, 0.8), 0.5, 1.4), h = clamp(num(p.h, 0.75), 0.4, 1.1);
    const ext = shape === "round" ? r * 2 : w;
    return { shape, r, w, h, dims: [ext, ext, h], surface: h };
  },
  "price-card": (p) => {
    const w = clamp(num(p.w, 0.3), 0.15, 0.6), h = clamp(num(p.h, 0.42), 0.15, 0.8), post = bool(p.post, false);
    return { w, h, post, postH: 1.0, dims: [w, 0.16, post ? 1.0 + h : h] };
  },
  "floor-arrow": (p) => {
    const count = int(p.count, 1, 1, 20), gap = clamp(num(p.gap, 6), 1, 30), t = clamp(num(p.t, 0.03), 0.005, 0.1);
    return { count, gap, dir: num(p.dir, 0), t, dims: [0.9, (count - 1) * gap + 1.6, t] };
  },
  escalator: (p) => {
    const e = escSpec(p);
    e.dims = [e.halfW * 2, e.len, e.yHigh + e.balH + 0.1];
    return e;
  },
  "guard-rail": (p) => {
    const len = clamp(num(p.len, 4), 0.5, 40), h = clamp(num(p.h, 1.1), 0.6, 2);
    return { len, h, panel: bool(p.panel, true), dims: [0.08, len, h] };
  },
  "flag-pole": (p) => {
    const h = clamp(num(p.h, 14), 3, 30), flagW = clamp(num(p.flagW, 2), 0.5, 6), flagH = clamp(num(p.flagH, 1.2), 0.3, 4);
    return { h, flagW, flagH, dims: [flagW + 0.2, 0.4, h + 0.12] };
  },
  bollard: (p) => {
    const h = clamp(num(p.h, 1.0), 0.4, 1.6);
    return { h, dims: [0.2, 0.2, h] };
  },
  "bollard-row": (p) => {
    const count = int(p.count, 5, 1, 40), step = clamp(num(p.step, 3), 0.5, 10), h = clamp(num(p.h, 1.0), 0.4, 1.6);
    return { count, step, h, dims: [0.2, (count - 1) * step + 0.2, h] };
  },
  "bag-bin": () => ({ dims: [1.2, 0.8, 1.0] }),
  plinth: (p) => {
    const w = clamp(num(p.w, 4), 0.5, 40), d = clamp(num(p.d, 3), 0.5, 40), h = clamp(num(p.h, 0.12), 0.03, 0.6);
    return { w, d, h, dims: [w, d, h], surface: h };
  },
  "set-wall": (p) => {
    const w = clamp(num(p.w, 4), 0.5, 40), h = clamp(num(p.h, 2.7), 1, 6), t = clamp(num(p.t, 0.12), 0.05, 0.5);
    let door = null;
    if (p.door === true) door = { x: 0, w: 1.0, h: 2.1 };
    else if (p.door && typeof p.door === "object") door = { x: num(p.door.x, 0), w: clamp(num(p.door.w, 1.0), 0.6, 3), h: clamp(num(p.door.h, 2.1), 1.5, h - 0.1) };
    return { w, h, t, door, dims: [w, t, h] };
  },
  "door-frame": (p) => {
    const w = clamp(num(p.w, 1.0), 0.6, 3), h = clamp(num(p.h, 2.1), 1.5, 4);
    return { w, h, dims: [w + 0.16, 0.14, h + 0.45] };
  },
  "column-row": (p) => {
    const zs = Array.isArray(p.zs) && p.zs.length ? p.zs.map((z) => num(z, 0)) : [-12, -31, -44];
    const h = clamp(num(p.h, 5.17), 0.5, 12), s = clamp(num(p.s, 0.5), 0.2, 1.5);
    let lo = zs[0], hi = zs[0];
    for (const z of zs) {
      if (z < lo) lo = z;
      if (z > hi) hi = z;
    }
    return { zs, h, s, dims: [s, hi - lo + s, h] };
  },
  "glazing-frame": (p) => {
    const w = clamp(num(p.w, 24), 1, 60), h = clamp(num(p.h, 4.5), 1, 12), pane = clamp(num(p.pane, 2.4), 0.6, 6);
    let door = null;
    if (p.door !== false && p.door !== null) {
      const d = p.door && typeof p.door === "object" ? p.door : {};
      door = { x: num(d.x, 0), w: clamp(num(d.w, 6), 0.8, w), h: clamp(num(d.h, 2.6), 1.8, h) };
    }
    return { w, h, pane, door, dims: [w, 0.12, h] };
  },
  skylight: (p) => {
    const w = clamp(num(p.w, 4), 0.6, 40), d = clamp(num(p.d, 4), 0.6, 40), kerb = clamp(num(p.kerb, 0.3), 0.1, 1);
    return { w, d, kerb, dims: [w + 0.3, d + 0.3, kerb] };
  },
  "roof-slab": (p) => {
    const w = clamp(num(p.w, 95.4), 1, 200), d = clamp(num(p.d, 59.4), 1, 200), t = clamp(num(p.t, 0.4), 0.05, 2);
    const holes = Array.isArray(p.holes) ? p.holes.filter((r) => Array.isArray(r) && r.length >= 4).map((r) => [Math.min(r[0], r[1]), Math.max(r[0], r[1]), Math.min(r[2], r[3]), Math.max(r[2], r[3])]) : [];
    return { w, d, t, holes, dims: [w, d, t] };
  },
  letters: (p) => {
    const text = (typeof p.text === "string" && p.text.length ? p.text : "HYLLA").toUpperCase().slice(0, 24);
    const h = clamp(num(p.h, 2.4), 0.2, 6);
    const n = text.length;
    return { text, h, glow: bool(p.glow, false), width: n * 0.8 * h + (n - 1) * 0.2 * h, dims: [n * 0.8 * h + (n - 1) * 0.2 * h, 0.3 * h / 2.4, h] };
  },
  canopy: (p) => {
    const w = clamp(num(p.w, 16), 2, 40), d = clamp(num(p.d, 6), 1, 12), y = clamp(num(p.y, 3.6), 2.2, 8), t = clamp(num(p.t, 0.6), 0.1, 1.2);
    return { w, d, y, t, dims: [w, d, y + t] };
  },
  "bus-shelter": (p) => {
    const w = clamp(num(p.w, 4), 2, 8), d = clamp(num(p.d, 1.5), 1, 3), h = clamp(num(p.h, 2.5), 2.1, 3.5);
    return { w, d, h, dims: [w + 0.4, d + 0.4, h] };
  },
  "store-map": () => ({ dims: [1.7, 0.14, 2.1] }),
  "trolley-flatbed": () => ({ dims: [0.8, 1.3, 1.0] }),
  "aisle-board": (p) => {
    const w = clamp(num(p.w, 1.2), 0.4, 3), h = clamp(num(p.h, 0.6), 0.2, 1.5), hang = clamp(num(p.hang, 1.0), 0, 4);
    return { w, h, hang, dims: [w, 0.05, h + hang] };
  },
};

function size(part, p) {
  const fn = SIZE[part] || SIZE.gondola;
  return fn(p || {});
}

function dims(part, p) {
  return size(part, p).dims;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) {
    const s = size(k, {});
    const row = { dims: s.dims, surface: s.surface === undefined ? null : s.surface, physics: NO_PHYSICS.indexOf(k) >= 0 ? "none" : "mesh", defaults: DEF[k] };
    if (k === "escalator") {
      row.physics = "none | mesh (collider() = ramp + plates + balustrades)";
      row.ramp = s.ramp;
      row.rails = s.rails;
      row.riser = s.riser;
      row.thetaDeg = s.thetaDeg;
      row.plateTops = { low: s.yLow, high: s.yHigh };
    }
    parts[k] = row;
  }
  return { family: "store", script: "scripts/asset-library/gen-home/store.js", parts };
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

// Six faces of a hexahedron from its 8 corners (bx's corner naming), minus `skip` letters:
// t(op) b(ottom) f(ront +z) k(back) l(eft −x) r(ight +x). Outward-wound for any proper frame.
export function hex(ctx, paint, c, skip) {
  const s = skip || "";
  if (s.indexOf("f") < 0) qd(ctx, paint, c.nnp, c.pnp, c.ppp, c.npp);
  if (s.indexOf("k") < 0) qd(ctx, paint, c.pnn, c.nnn, c.npn, c.ppn);
  if (s.indexOf("r") < 0) qd(ctx, paint, c.pnp, c.pnn, c.ppn, c.ppp);
  if (s.indexOf("l") < 0) qd(ctx, paint, c.nnn, c.nnp, c.npp, c.npn);
  if (s.indexOf("t") < 0) qd(ctx, paint, c.npp, c.ppp, c.ppn, c.npn);
  if (s.indexOf("b") < 0) qd(ctx, paint, c.nnn, c.pnn, c.pnp, c.nnp);
}

// Plain axis-aligned box.
export function bx(ctx, x0, x1, y0, y1, z0, z1, paint, skip) {
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  hex(ctx, paint, {
    nnn: [xa, ya, za], pnn: [xb, ya, za], npn: [xa, yb, za], ppn: [xb, yb, za],
    nnp: [xa, ya, zb], pnp: [xb, ya, zb], npp: [xa, yb, zb], ppp: [xb, yb, zb],
  }, skip);
}

// Sheared box: a slab whose bottom edge runs from (zA, yA) to (zB, yB) with VERTICAL thickness h.
// Vertical end faces at zA and zB. (Ramps, balustrades, escalator trusses.)
export function sbox(ctx, x0, x1, zA, yA, zB, yB, h, paint, skip) {
  if (zA > zB) {
    const tz = zA, ty = yA;
    zA = zB; yA = yB; zB = tz; yB = ty;
  }
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  hex(ctx, paint, {
    nnn: [xa, yA, zA], pnn: [xb, yA, zA], npn: [xa, yA + h, zA], ppn: [xb, yA + h, zA],
    nnp: [xa, yB, zB], pnp: [xb, yB, zB], npp: [xa, yB + h, zB], ppp: [xb, yB + h, zB],
  }, skip);
}

// A rigid frame: R = Ry(yaw)·Rx(pitch)·Rz(roll), then translate. Degrees.
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

// A box in an arbitrary frame: centre o, half extents h (frame-local).
export function fbox(ctx, f, o, h, paint, skip) {
  const P = (sx, sy, sz) => f(o[0] + sx * h[0], o[1] + sy * h[1], o[2] + sz * h[2]);
  hex(ctx, paint, {
    ppp: P(1, 1, 1), ppn: P(1, 1, -1), pnp: P(1, -1, 1), pnn: P(1, -1, -1),
    npp: P(-1, 1, 1), npn: P(-1, 1, -1), nnp: P(-1, -1, 1), nnn: P(-1, -1, -1),
  }, skip);
}

// Chamfered slab — tops, decks, plinths. 0.008 furniture, 0.015 architecture.
export function slab(ctx, x0, x1, y0, y1, z0, z1, paint, bevel) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.008, paint);
}

// Vertical chamfered post between two footprints (square legs, columns, mullions).
export function post(ctx, x, z, y0, y1, w, d, bevel, paint, caps) {
  const c = caps || {};
  G.loftFrames(
    ctx,
    [
      { c: [x, y0, z], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w, d, 0, 0, bevel) },
      { c: [x, y1, z], f: [0, 1, 0], up: [0, 0, -1], poly: G.rrect(w, d, 0, 0, bevel) },
    ],
    paint,
    { capStart: c.start === true, capEnd: c.end !== false }
  );
}

// Vertical round tube (poles, pedestals, rods).
export function rod(ctx, x, z, y0, y1, r0, r1, sides, paint) {
  G.tube(ctx, [x, y0, z], [x, y1, z], r0, r1 === undefined ? r0 : r1, sides, [0, 0, -1], paint);
}

// Chamfered disc standing on y0 (bases, tops, wheels laid flat).
export function disc(ctx, cx, y0, y1, cz, r, bevel, sides, paint) {
  const e = Math.min(bevel, (y1 - y0) * 0.3, r * 0.3);
  const F = (y, rr) => ({ c: [cx, y, cz], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(rr * 2, rr * 2, 0, 0, sides, 1) });
  G.loftFrames(ctx, [F(y0, r - e), F(y0 + e, r), F(y1 - e, r), F(y1, r - e)], paint);
}

// A wheel: a short cylinder on the X axis at (x, y, z), radius r, width w.
export function wheel(ctx, x, y, z, r, w, paint) {
  G.tube(ctx, [x - w / 2, y, z], [x + w / 2, y, z], r, r, 10, [0, 1, 0], paint);
}

// Both windings of a sheet quad (flags, decals seen from both sides).
export function sheet(ctx, paint, a, b, c, d) {
  qd(ctx, paint, a, b, c, d);
  qd(ctx, paint, d, c, b, a);
}

// ── paints ──────────────────────────────────────────────────────────────────
// Flat (untextured) paints — HYLLA skin review v2666: home-mat's `paint` mint serves a tan low-poly
// mosaic, so every "white" fixture (set-walls, gondola spines, lane bodies, balustrades) read as
// orange-peel stucco; the steel-panel mint's rivet seams read as flagstones on escalator treads.
// A flat tint is a finished look in lowpoly-cozy. Same emissive-reset law as home-mat's opaque().
const FLAT = {
  white: { r: 0.95, g: 0.95, b: 0.93, metal: 0, rough: 0.35 },
  steel: { r: 0.64, g: 0.65, b: 0.67, metal: 0.75, rough: 0.4 }, // brushed
};
export function flat(ctx, f) {
  return function () {
    ctx.albedo(null);
    ctx.color(f.r, f.g, f.b, 1);
    ctx.metalness(f.metal);
    ctx.roughness(f.rough);
    ctx.emissive(0, 0, 0);
  };
}
// One paint: flat white for every white; flat brushed steel on the escalator; else the palette.
export function paint(ctx, part, name, fallback) {
  const n = M.resolveName(name) || M.resolveName(fallback) || "oak";
  if (n === "white") return flat(ctx, FLAT.white);
  if (n === "steel" && part === "escalator") return flat(ctx, FLAT.steel);
  return M.finish(ctx, n, fallback);
}

export function paints(ctx, p, part) {
  const D = DEF[part] || {};
  return {
    a: paint(ctx, part, p.finish, D.finish || "white"),
    b: paint(ctx, part, p.finish2, D.finish2 || "steel"),
    blue: M.finish(ctx, "hylla-blue", "navy"),
    yellow: M.finish(ctx, "hylla-yellow", "white"),
    white: flat(ctx, FLAT.white),
    black: M.finish(ctx, "black", "black"),
    steel: M.finish(ctx, "steel", "steel"),
    chrome: M.finish(ctx, "chrome", "steel"),
    card: M.finish(ctx, "cardboard", "oak"),
    concrete: M.finish(ctx, "concrete", "stone"),
    pine: M.finish(ctx, "pine", "oak"),
    glass: M.glass(ctx),
    glow: (r, g, b, k) => M.glow(ctx, r, g, b, k),
  };
}

// ── parts ───────────────────────────────────────────────────────────────────
// Gondola: double-sided run along +Z — white spine + shelves + end panels, blue base kick + bins.
export function gondola(ctx, C, s) {
  const hl = s.len / 2, hw = s.w / 2, kick = 0.15, sp = 0.05, st = 0.03;
  // pass a: spine, end panels, shelves, top cap
  bx(ctx, -sp, sp, kick, s.h - st, -hl + 0.03, hl - 0.03, C.a, "tb");
  bx(ctx, -hw, hw, 0, s.h, -hl, -hl + 0.03, C.a);
  bx(ctx, -hw, hw, 0, s.h, hl - 0.03, hl, C.a);
  const pitch = (s.h - kick - st) / s.shelves;
  const ys = [];
  for (let k = 0; k < s.shelves - 1; k++) ys.push(kick + (k + 1) * pitch);
  for (const y of ys) {
    slab(ctx, sp, hw - 0.02, y - st, y, -hl + 0.03, hl - 0.03, C.a, 0.004);
    slab(ctx, -hw + 0.02, -sp, y - st, y, -hl + 0.03, hl - 0.03, C.a, 0.004);
  }
  slab(ctx, -hw + 0.02, hw - 0.02, s.h - st, s.h, -hl + 0.03, hl - 0.03, C.a, 0.004); // the `surface`
  // pass b: base kick, bins
  bx(ctx, -hw + 0.04, hw - 0.04, 0, kick, -hl + 0.03, hl - 0.03, C.b, "b");
  if (s.bins) {
    const levels = ys.concat([kick]);
    const binW = 0.5, binD = Math.min(0.35, hw - sp - 0.1), binH = Math.min(0.25, pitch * 0.6);
    const n = Math.floor((s.len - 0.1) / 0.6);
    for (const y of levels) {
      for (const side of [-1, 1]) {
        for (let i = 0; i < n; i++) {
          if (ctx.random() < 0.35) continue;
          const z = -hl + 0.05 + 0.3 + i * 0.6;
          const x0 = side * (sp + 0.04), x1 = side * (sp + 0.04 + binD);
          bx(ctx, x0, x1, y + 0.002, y + binH, z - binW / 2, z + binW / 2, C.b, "tb");
        }
      }
    }
  }
}

// Warehouse rack along +Z: blue frames, yellow beams, steel wire decks, cardboard flat-packs.
export function rack(ctx, C, s) {
  const hl = s.len / 2, hw = s.w / 2, ps = 0.09, bayL = s.len / s.bays;
  const px = hw - ps / 2;
  const levels = s.h >= 4.2 ? [1.7, 3.3, s.h - 0.15] : [s.h * 0.36, s.h * 0.7, s.h - 0.15];
  // pass a: frames (2 posts + 3 braces per frame line)
  for (let k = 0; k <= s.bays; k++) {
    const z = -hl + k * bayL;
    for (const sx of [-1, 1]) bx(ctx, sx * px - ps / 2, sx * px + ps / 2, 0, s.h, z - ps / 2, z + ps / 2, C.a, "b");
    for (const y of [0.3, s.h * 0.5, s.h - 0.25]) bx(ctx, -px + ps / 2, px - ps / 2, y, y + 0.05, z - 0.025, z + 0.025, C.a, "lr");
  }
  // pass b: beams — two per bay per level, running along z between frames
  for (let k = 0; k < s.bays; k++) {
    const z0 = -hl + k * bayL + ps / 2, z1 = -hl + (k + 1) * bayL - ps / 2;
    for (const y of levels) for (const sx of [-1, 1]) bx(ctx, sx * px - 0.025, sx * px + 0.025, y - 0.12, y, z0, z1, C.b, "fk");
  }
  // pass steel: wire decks at the two lower beam levels
  for (let k = 0; k < s.bays; k++) {
    const z0 = -hl + k * bayL + ps / 2 + 0.01, z1 = -hl + (k + 1) * bayL - ps / 2 - 0.01;
    for (let li = 0; li < 2; li++) bx(ctx, -px + 0.03, px - 0.03, levels[li] - 0.02, levels[li], z0, z1, C.steel);
  }
  // pass card: flat-pack stacks on the floor and the two decks
  const decks = [0, levels[0], levels[1]];
  const clear = [levels[0] - 0.12, levels[1] - levels[0] - 0.12, levels[2] - levels[1] - 0.12];
  for (let k = 0; k < s.bays; k++) {
    const zc = -hl + (k + 0.5) * bayL;
    for (let li = 0; li < 3; li++) {
      if (ctx.random() > s.stacks) continue;
      const room = clear[li];
      const n = 2 + Math.floor(ctx.random() * 4);
      let y = decks[li] + 0.005;
      for (let i = 0; i < n; i++) {
        const t = 0.08 + ctx.random() * 0.12;
        if (y + t > decks[li] + room - 0.05) break;
        const bw = Math.min(s.w - 0.3, 0.55 + ctx.random() * 0.4), bl = bayL * (0.55 + ctx.random() * 0.3);
        const jx = (ctx.random() - 0.5) * 0.06, jz = (ctx.random() - 0.5) * 0.08;
        bx(ctx, jx - bw / 2, jx + bw / 2, y, y + t, zc + jz - bl / 2, zc + jz + bl / 2, C.card, "b");
        y += t + 0.004;
      }
    }
  }
}

// A stack of flat-pack boxes, optionally on a pallet.
export function flatpackStack(ctx, C, s) {
  let y = 0;
  if (s.pallet) {
    const pw = Math.max(s.w, 1.2), pd = Math.max(s.d, 0.8);
    // pass b (pine): 3 runners + deck
    for (const x of [-pw / 2 + 0.05, 0, pw / 2 - 0.05]) bx(ctx, x - 0.05, x + 0.05, 0, 0.11, -pd / 2, pd / 2, C.b, "b");
    bx(ctx, -pw / 2, pw / 2, 0.11, 0.14, -pd / 2, pd / 2, C.b);
    y = 0.14;
  }
  // pass a (cardboard)
  for (let i = 0; i < s.count; i++) {
    const t = 0.07 + ctx.random() * 0.07;
    const jx = (ctx.random() - 0.5) * 0.05, jz = (ctx.random() - 0.5) * 0.05;
    bx(ctx, jx - s.w / 2, jx + s.w / 2, y, y + t, jz - s.d / 2, jz + s.d / 2, C.a, i === 0 ? "" : "b");
    y += t + 0.003;
  }
}

// One shopping cart centred at z0, nose (narrow end) −Z, handle +Z. pass: "steel" | "plastic" | "rubber".
export function cart(ctx, C, z0, pass, handles) {
  if (pass === "steel") {
    // tapered basket, open top: (u,v) = (x, −z) CCW → nose (narrow) at −z is +v
    const lo = [[-0.2, -0.28], [0.2, -0.28], [0.17, 0.34], [-0.17, 0.34]];
    const hi = [[-0.29, -0.4], [0.29, -0.4], [0.24, 0.5], [-0.24, 0.5]];
    G.loftFrames(ctx, [
      { c: [0, 0.5, z0], f: [0, 1, 0], up: [0, 0, -1], poly: lo },
      { c: [0, 0.98, z0], f: [0, 1, 0], up: [0, 0, -1], poly: hi },
    ], C.a, { capStart: true, capEnd: false });
    // chassis: 4 legs to the wheels, lower cross frame
    for (const sx of [-1, 1]) {
      G.tube(ctx, [sx * 0.22, 0.09, z0 + 0.3], [sx * 0.2, 0.5, z0 + 0.26], 0.012, 0.012, 6, [0, 0, 1], C.a);
      G.tube(ctx, [sx * 0.18, 0.09, z0 - 0.3], [sx * 0.18, 0.5, z0 - 0.26], 0.012, 0.012, 6, [0, 0, 1], C.a);
      G.tube(ctx, [sx * 0.2, 0.12, z0 - 0.32], [sx * 0.2, 0.12, z0 + 0.32], 0.012, 0.012, 6, [0, 1, 0], C.a);
    }
    // handle uprights (steel) rising from the back corners
    if (handles) for (const sx of [-1, 1]) G.tube(ctx, [sx * 0.27, 0.9, z0 + 0.42], [sx * 0.27, 1.0, z0 + 0.46], 0.012, 0.012, 6, [0, 0, 1], C.a);
  } else if (pass === "plastic") {
    if (handles) G.tube(ctx, [-0.31, 1.0, z0 + 0.46], [0.31, 1.0, z0 + 0.46], 0.02, 0.02, 8, [0, 1, 0], C.b);
    // child seat flap inside the back of the basket
    bx(ctx, -0.2, 0.2, 0.7, 0.72, z0 + 0.2, z0 + 0.36, C.b);
  } else {
    for (const sx of [-1, 1]) {
      wheel(ctx, sx * 0.22, 0.06, z0 + 0.3, 0.06, 0.03, C.black);
      wheel(ctx, sx * 0.18, 0.06, z0 - 0.3, 0.06, 0.03, C.black);
    }
  }
}

export function cartRow(ctx, C, s) {
  const zs = [];
  for (let i = 0; i < s.count; i++) zs.push((i - (s.count - 1) / 2) * s.spacing);
  for (const pass of ["steel", "plastic", "rubber"]) for (const z of zs) cart(ctx, C, z, pass, s.handles);
}

// Lot cart corral: dividers of posts + two rails per bay, a yellow roof on four corner posts.
export function cartReturn(ctx, C, s) {
  const W = s.bays * 1.4, L = 5.0;
  // pass a (steel): dividers + roof posts
  for (let k = 0; k <= s.bays; k++) {
    const x = -W / 2 + k * 1.4;
    for (const z of [-L / 2 + 0.2, 0, L / 2 - 0.2]) rod(ctx, x, z, 0, 1.0, 0.03, 0.03, 8, C.a);
    for (const y of [0.45, 0.92]) G.tube(ctx, [x, y, -L / 2 + 0.2], [x, y, L / 2 - 0.2], 0.02, 0.02, 8, [0, 1, 0], C.a);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * (W / 2 + 0.1), sz * (L / 2 + 0.1), 0, 2.3, 0.1, 0.1, 0.006, C.a);
  // pass b (yellow): roof + fascia
  slab(ctx, -W / 2 - 0.25, W / 2 + 0.25, 2.3, 2.38, -L / 2 - 0.25, L / 2 + 0.25, C.b, 0.01);
  // blue sign board on the front fascia
  bx(ctx, -0.6, 0.6, 2.4, 2.75, L / 2 + 0.1, L / 2 + 0.15, C.blue);
}

// Checkout lane along +Z: belt at the north (−Z) end, register, bagging shelf to the south exit.
export function checkoutLane(ctx, C, s) {
  const hl = s.len / 2, h = s.h;
  const zb0 = -hl, zb1 = -hl + s.belt; // belt section
  const zr0 = zb1 + 0.05, zr1 = zb1 + 0.85; // register block
  // pass a (white body): belt counter, register plinth, bagging shelf
  slab(ctx, -0.4, 0.4, 0.1, h, zb0, zb1, C.a, 0.01);
  slab(ctx, -0.4, 0.4, 0.1, h + 0.2, zr0, zr1, C.a, 0.01);
  slab(ctx, -0.4, 0.4, 0.1, h - 0.1, zr1 + 0.05, hl, C.a, 0.01);
  // pass b (blue): toe kick + lane number board + divider end panel
  bx(ctx, -0.36, 0.36, 0, 0.1, zb0 + 0.02, hl - 0.02, C.b, "b");
  bx(ctx, -0.25, 0.25, 2.2, 2.55, zb1 + 0.4, zb1 + 0.45, C.b);
  // pass steel: belt rails, register, pole
  bx(ctx, -0.34, -0.3, h, h + 0.05, zb0 + 0.02, zb1 - 0.02, C.steel, "b");
  bx(ctx, 0.3, 0.34, h, h + 0.05, zb0 + 0.02, zb1 - 0.02, C.steel, "b");
  bx(ctx, -0.18, 0.18, h + 0.2, h + 0.32, zr0 + 0.25, zr1 - 0.25, C.steel, "b");
  rod(ctx, 0, zb1 + 0.42, h + 0.2, 2.6, 0.02, 0.02, 8, C.steel);
  // pass black: belt surface (rubber)
  bx(ctx, -0.3, 0.3, h - 0.01, h + 0.01, zb0 + 0.04, zb1 - 0.04, C.black, "b");
  // glow LAST: screen + the lane lamp (green open / dim red closed)
  const f = xf(0, h + 0.5, zr0 + 0.4, 0, -20, 0);
  fbox(ctx, f, [0, 0, 0], [0.17, 0.12, 0.01], s.open ? C.glow(0.75, 0.9, 1.0, 0.9) : C.black);
  const lamp = s.open ? C.glow(0.3, 1.0, 0.45, 1.6) : C.glow(0.5, 0.12, 0.1, 0.25);
  bx(ctx, -0.07, 0.07, 2.58, 2.7, zb1 + 0.35, zb1 + 0.49, lamp);
}

// Café counter along X, customer face +Z: wood front, steel worktop, tray rail at `rail` height.
export function cafeCounter(ctx, C, s) {
  const hl = s.len / 2, h = s.h, d = 0.45;
  // pass a (front finish): body
  bx(ctx, -hl, hl, 0.1, h - 0.04, -d, d, C.a, "tb");
  // pass b (steel): worktop, tray rail tubes + brackets
  slab(ctx, -hl - 0.02, hl + 0.02, h - 0.04, h, -d - 0.02, d + 0.06, C.b, 0.008);
  for (const z of [d + 0.14, d + 0.24, d + 0.34]) G.tube(ctx, [-hl + 0.1, s.rail, z], [hl - 0.1, s.rail, z], 0.012, 0.012, 8, [0, 1, 0], C.b);
  const nb = Math.max(2, Math.round(s.len / 2) + 1);
  for (let i = 0; i < nb; i++) {
    const x = -hl + 0.15 + (i * (s.len - 0.3)) / (nb - 1);
    bx(ctx, x - 0.02, x + 0.02, s.rail - 0.03, s.rail - 0.012, d + 0.1, d + 0.38, C.b);
    bx(ctx, x - 0.02, x + 0.02, h, s.rail - 0.012, d + 0.08, d + 0.12, C.b, "b");
  }
  // pass black: toe kick
  bx(ctx, -hl + 0.03, hl - 0.03, 0, 0.1, -d + 0.03, d - 0.03, C.black, "b");
}

// Café table: round pedestal (default) or square on four legs. Top = `surface`.
export function cafeTable(ctx, C, s) {
  const t = 0.03;
  if (s.shape === "round") {
    ctx.smooth();
    disc(ctx, 0, s.h - t, s.h, 0, s.r, 0.006, 20, C.a);
    disc(ctx, 0, 0, 0.03, 0, s.r * 0.6, 0.008, 16, C.b);
    rod(ctx, 0, 0, 0.02, s.h - t - 0.005, 0.03, 0.03, 12, C.b);
    ctx.flat();
    return;
  }
  slab(ctx, -s.w / 2, s.w / 2, s.h - t, s.h, -s.w / 2, s.w / 2, C.a);
  const in_ = s.w / 2 - 0.06;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(ctx, sx * in_, sz * in_, 0, s.h - t - 0.003, 0.014, 0.014, 8, C.b);
}

// Price card body: a blank blue card (the `sign` child carries the text). Standing on a steel foot,
// leaning back 8°; or on a 1.0 m post when `post`.
export function priceCard(ctx, C, s) {
  const base = s.post ? s.postH : 0;
  // pass a (card)
  const f = xf(0, base + s.h / 2, 0.02, 0, -8, 0);
  fbox(ctx, f, [0, 0, 0], [s.w / 2, s.h / 2, 0.006], C.a);
  // pass b (steel): foot or post
  if (s.post) {
    disc(ctx, 0, 0, 0.012, 0, 0.09, 0.003, 12, C.b);
    rod(ctx, 0, 0, 0.01, base - 0.01, 0.012, 0.012, 8, C.b);
    bx(ctx, -s.w / 2 + 0.02, s.w / 2 - 0.02, base - 0.02, base + 0.01, -0.02, 0.05, C.b);
  } else {
    bx(ctx, -s.w / 2 + 0.02, s.w / 2 - 0.02, 0, 0.012, -0.05, 0.1, C.b, "b");
  }
}

// Floor arrows: `count` yellow glyphs `gap` apart along +Z, each pointing `dir` (deg CCW, 0 = +Z).
// Bottom face omitted — the floor is 1–3 cm under it; `t` keeps the top clear of the depth floor.
export function floorArrow(ctx, C, s) {
  const total = (s.count - 1) * s.gap;
  for (let i = 0; i < s.count; i++) {
    const zc = -total / 2 + i * s.gap;
    const f = xf(0, 0, zc, s.dir, 0, 0);
    const P = (x, y, z) => f(x, y, z);
    // shaft
    fbox(ctx, f, [0, s.t / 2, -0.35], [0.15, s.t / 2, 0.45], C.a, "b");
    // head: triangle prism, tip at +z
    const L = P(-0.45, 0, 0.1), R = P(0.45, 0, 0.1), T = P(0, 0, 0.8);
    const Lt = P(-0.45, s.t, 0.1), Rt = P(0.45, s.t, 0.1), Tt = P(0, s.t, 0.8);
    tr(ctx, C.a, Lt, Tt, Rt); // top (CCW from above)
    qd(ctx, C.a, L, R, Rt, Lt); // back edge (faces −z)
    qd(ctx, C.a, R, T, Tt, Rt); // right edge
    qd(ctx, C.a, T, L, Lt, Tt); // left edge
  }
}

// Escalator picture: plates, treads with yellow nosings, truss soffit, skirts, balustrades,
// handrails. dir "north" rises toward −Z. The collider is collider() below, not this mesh.
export function escalator(ctx, C, s) {
  const d = s.dir;
  const Z = (z) => z * d;
  const X = (x) => x * d;
  const eb = (x0, x1, y0, y1, z0, z1, paint, skip) => bx(ctx, X(x0), X(x1), y0, y1, Z(z0), Z(z1), paint, skip);
  const es = (x0, x1, zA, yA, zB, yB, h, paint, skip) => sbox(ctx, X(x0), X(x1), Z(zA), yA, Z(zB), yB, h, paint, skip);
  const hw = s.stepW / 2, bo = hw + s.bal, so = s.halfW; // step edge, balustrade outer, skirt outer
  const zPL0 = s.zLow + s.plate, zPH1 = s.zHigh - s.plate;
  const lineY = (z) => s.yLow + s.riser + (s.zLow - z) * s.slope; // nosing line
  // pass a (steel): plates, treads' risers, truss soffit, skirts, balustrade outer cladding
  eb(-so, so, 0, s.yLow, s.zLow, zPL0, C.a, "b");
  eb(-so, so, s.yHigh - s.plateT, s.yHigh, zPH1, s.zHigh, C.a, "b");
  for (let i = 0; i < s.steps; i++) {
    const zf = s.zLow - i * s.tread, zb = zf - s.tread;
    const yt = s.yLow + (i + 1) * s.riser, yb = yt - s.riser;
    // riser face (faces the low end, +z) and tread top; sides hide behind the skirts
    qd(ctx, C.a, [X(-hw), yb, Z(zf)], [X(hw), yb, Z(zf)], [X(hw), yt, Z(zf)], [X(-hw), yt, Z(zf)]);
    qd(ctx, C.a, [X(-hw), yt, Z(zf - 0.05)], [X(hw), yt, Z(zf - 0.05)], [X(hw), yt, Z(zb)], [X(-hw), yt, Z(zb)]);
  }
  // truss under the steps: a sloped box from the low plate to the high plate, 0.9 deep
  es(-so, so, s.zLow, s.yLow - 0.9, s.zHigh, s.yHigh - 0.9, 0.9 - s.riser, C.a, "t");
  eb(-so, so, s.yHigh - 0.9, s.yHigh - s.plateT, zPH1, s.zHigh, C.a, "t");
  // skirts + balustrade cladding: sloped panels either side, from step line −0.1 to +0.15 (deck)
  for (const sx of [-1, 1]) {
    es(sx * hw, sx * bo, s.zLow, lineY(s.zLow) - 0.12, s.zHigh, lineY(s.zHigh) - 0.12, 0.27, C.a);
    eb(sx * hw, sx * bo, s.yLow, s.yLow + 0.15, s.zLow, zPL0, C.a, "b");
    eb(sx * hw, sx * bo, s.yHigh, s.yHigh + 0.15, zPH1, s.zHigh, C.a, "b");
    // outer skirt deck (0.35) over the truss
    es(sx * bo, sx * so, s.zLow, lineY(s.zLow) - 0.12, s.zHigh, lineY(s.zHigh) - 0.12, 0.15, C.a);
    eb(sx * bo, sx * so, s.yLow, s.yLow + 0.03, s.zLow, zPL0, C.a, "b");
    eb(sx * bo, sx * so, s.yHigh, s.yHigh + 0.03, zPH1, s.zHigh, C.a, "b");
  }
  // pass white: balustrade panels (0.1 thick, centred in the 0.2 balustrade) rising balH above the deck
  for (const sx of [-1, 1]) {
    const x0 = sx * (hw + 0.05), x1 = sx * (bo - 0.05);
    es(x0, x1, s.zLow, lineY(s.zLow) + 0.15, s.zHigh, lineY(s.zHigh) + 0.15, s.balH - 0.2, C.white);
    eb(x0, x1, s.yLow + 0.15, s.yLow + s.balH - 0.05, s.zLow, zPL0, C.white, "b");
    eb(x0, x1, s.yHigh + 0.15, s.yHigh + s.balH - 0.05, zPH1, s.zHigh, C.white, "b");
  }
  // pass yellow: nosing stripes (0.04 proud strip at each tread front)
  for (let i = 0; i < s.steps; i++) {
    const zf = s.zLow - i * s.tread, yt = s.yLow + (i + 1) * s.riser;
    eb(-hw, hw, yt, yt + 0.006, zf - 0.05, zf, C.yellow, "bk");
  }
  // pass b (black): handrails — one polyline each side, flat over the plates, sloped over the run
  for (const sx of [-1, 1]) {
    const x = X(sx * (hw + s.bal / 2));
    const yl = s.yLow + s.balH - 0.05, yh = s.yHigh + s.balH - 0.05;
    const pts = [
      [x, yl, Z(zPL0 - 0.05)], [x, yl, Z(s.zLow + 0.15)], [x, lineY(s.zLow) + 0.15 + s.balH - 0.2 - 0.05 + 0.05, Z(s.zLow - 0.05)],
      [x, lineY(s.zHigh) + 0.15 + s.balH - 0.2 - 0.05 + 0.05, Z(s.zHigh + 0.05)], [x, yh, Z(s.zHigh - 0.15)], [x, yh, Z(zPH1 + 0.05)],
    ];
    ctx.smooth();
    G.polyTube(ctx, pts, 0.04, 8, [0, 1, 0], C.b);
    ctx.flat();
  }
}

// The walkable escalator collider: low plate, ramp slab, high plate, two balustrade slabs.
export function escalatorCollider(ctx, s) {
  const d = s.dir;
  const Z = (z) => z * d;
  const hw = s.stepW / 2, bo = hw + s.bal;
  const zPL0 = s.zLow + s.plate, zPH1 = s.zHigh - s.plate;
  const t = 0.2;
  bx(ctx, -hw, hw, s.yLow - t, s.yLow, Z(s.zFoot), Z(zPL0));
  sbox(ctx, -hw, hw, Z(s.zFoot), s.yLow - t, Z(s.zHead), s.yHigh - t, t);
  bx(ctx, -hw, hw, s.yHigh - t, s.yHigh, Z(zPH1), Z(s.zHead));
  for (const sx of [-1, 1]) sbox(ctx, sx * hw, sx * bo, Z(s.zFoot), s.yLow, Z(s.zHead), s.yHigh, s.balH + 0.2);
}

// Guard rail along +Z: steel posts + top tube, solid painted panel (no glass — 09a §7).
export function guardRail(ctx, C, s) {
  const hl = s.len / 2;
  const n = Math.max(2, Math.ceil(s.len / 1.5) + 1);
  // pass a: panel
  if (s.panel) bx(ctx, -0.01, 0.01, 0.08, s.h - 0.08, -hl + 0.04, hl - 0.04, C.a, "fk");
  // pass b (steel): posts, top rail, bottom rail
  for (let i = 0; i < n; i++) {
    const z = -hl + 0.03 + (i * (s.len - 0.06)) / (n - 1);
    post(ctx, 0, z, 0, s.h - 0.03, 0.05, 0.05, 0.004, C.b);
  }
  G.tube(ctx, [0, s.h - 0.03, -hl], [0, s.h - 0.03, hl], 0.03, 0.03, 10, [0, 1, 0], C.b);
  bx(ctx, -0.03, 0.03, 0.03, 0.08, -hl + 0.02, hl - 0.02, C.b);
}

// Flag pole: tapered steel pole, base collar, finial; a blue flag with a yellow band, flying +X.
export function flagPole(ctx, C, s) {
  // pass b (steel)
  ctx.smooth();
  rod(ctx, 0, 0, 0, s.h, 0.06, 0.035, 12, C.b);
  G.tube(ctx, [0, 0, 0], [0, 0.4, 0], 0.11, 0.08, 12, [0, 0, -1], C.b);
  G.tube(ctx, [0, s.h, 0], [0, s.h + 0.12, 0], 0.07, 0.01, 10, [0, 0, -1], C.b);
  ctx.flat();
  // pass a (flag) + yellow band: three waved strips, both windings
  const y1 = s.h - 0.2, y0 = y1 - s.flagH;
  const cols = 4;
  const zw = (i) => Math.sin(i * 1.9) * 0.12 * (i / cols);
  const bands = [[y0, y0 + s.flagH * 0.4, C.a], [y0 + s.flagH * 0.4, y0 + s.flagH * 0.6, C.yellow], [y0 + s.flagH * 0.6, y1, C.a]];
  for (const b of bands) {
    for (let i = 0; i < cols; i++) {
      const xa = 0.04 + (i * s.flagW) / cols, xb = 0.04 + ((i + 1) * s.flagW) / cols;
      sheet(ctx, b[2], [xa, b[0], zw(i)], [xb, b[0], zw(i + 1)], [xb, b[1], zw(i + 1)], [xa, b[1], zw(i)]);
    }
  }
}

export function bollardAt(ctx, C, z, h) {
  ctx.smooth();
  rod(ctx, 0, z, 0, h - 0.12, 0.08, 0.08, 12, C.a);
  G.tube(ctx, [0, h - 0.12, z], [0, h, z], 0.08, 0.06, 12, [0, 0, -1], C.a);
  ctx.flat();
}
export function bollardBand(ctx, C, z, h) {
  ctx.smooth();
  rod(ctx, 0, z, h - 0.4, h - 0.25, 0.085, 0.085, 12, C.b);
  ctx.flat();
}
export function bollard(ctx, C, s) {
  bollardAt(ctx, C, 0, s.h);
  bollardBand(ctx, C, 0, s.h);
}
export function bollardRow(ctx, C, s) {
  const zs = [];
  for (let i = 0; i < s.count; i++) zs.push((i - (s.count - 1) / 2) * s.step);
  for (const z of zs) bollardAt(ctx, C, z, s.h);
  for (const z of zs) bollardBand(ctx, C, z, s.h);
}

// Yellow bag bin on a steel frame, 1.2 × 0.8 × 1.0, open top with a dark bag stack inside.
export function bagBin(ctx, C, s) {
  // pass a (yellow): bin, open top
  bx(ctx, -0.6, 0.6, 0.45, 1.0, -0.4, 0.4, C.a, "t");
  // pass b (steel): legs + rails
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * 0.52, sz * 0.32, 0, 0.45, 0.04, 0.04, 0.003, C.b);
  for (const sz of [-1, 1]) bx(ctx, -0.52, 0.52, 0.12, 0.15, sz * 0.32 - 0.015, sz * 0.32 + 0.015, C.b);
  // pass blue: the bags
  bx(ctx, -0.5, 0.5, 0.6, 0.9, -0.3, 0.3, C.blue, "b");
}

// Showroom plinth: one chamfered pale slab; its top is the `surface`.
export function plinth(ctx, C, s) {
  slab(ctx, -s.w / 2, s.w / 2, 0, s.h, -s.d / 2, s.d / 2, C.a, 0.015);
}

// Set wall along X, front +Z, optional door opening (piers + lintel; no coplanar pair).
export function setWall(ctx, C, s) {
  const hw = s.w / 2, ht = s.t / 2;
  if (!s.door) {
    slab(ctx, -hw, hw, 0, s.h, -ht, ht, C.a, 0.015);
    return;
  }
  const x0 = clamp(s.door.x - s.door.w / 2, -hw + 0.1, hw - s.door.w - 0.1), x1 = x0 + s.door.w;
  bx(ctx, -hw, x0, 0, s.h, -ht, ht, C.a, "b");
  bx(ctx, x1, hw, 0, s.h, -ht, ht, C.a, "b");
  bx(ctx, x0, x1, s.door.h, s.h, -ht, ht, C.a, "lr");
}

// Shortcut door frame (1.0 × 2.1): jambs + head in the marker colour, a chevron plate over it.
export function doorFrame(ctx, C, s) {
  const hw = s.w / 2, j = 0.08, dz = 0.07;
  bx(ctx, -hw - j, -hw, 0, s.h + j, -dz, dz, C.a, "b");
  bx(ctx, hw, hw + j, 0, s.h + j, -dz, dz, C.a, "b");
  bx(ctx, -hw, hw, s.h, s.h + j, -dz, dz, C.a, "lr");
  // chevron decal: a "down-and-through" arrow plate on the head, pointing +Z (the way through)
  const y = s.h + j + 0.02;
  const P = (x, yy, z) => [x, yy, z];
  tr(ctx, C.a, P(-0.25, y, -0.2), P(0, y, 0.2), P(0.25, y, -0.2));
  tr(ctx, C.a, P(-0.25, y + 0.03, -0.2), P(0.25, y + 0.03, -0.2), P(0, y + 0.03, 0.2));
  qd(ctx, C.a, P(-0.25, y, -0.2), P(0.25, y, -0.2), P(0.25, y + 0.03, -0.2), P(-0.25, y + 0.03, -0.2));
  qd(ctx, C.a, P(0.25, y, -0.2), P(0, y, 0.2), P(0, y + 0.03, 0.2), P(0.25, y + 0.03, -0.2));
  qd(ctx, C.a, P(0, y, 0.2), P(-0.25, y, -0.2), P(-0.25, y + 0.03, -0.2), P(0, y + 0.03, 0.2));
}

// Columns 0.5 sq at (0, z) for every z in `zs`.
export function columnRow(ctx, C, s) {
  for (const z of s.zs) post(ctx, 0, z, 0, s.h, s.s, s.s, 0.012, C.a, { start: false, end: false });
}

// Glazing frame along X, front +Z: mullions every `pane`, sill + head rails, door header.
export function glazingFrame(ctx, C, s) {
  const hw = s.w / 2, mt = 0.08, md = 0.12;
  const d = s.door;
  const dx0 = d ? d.x - d.w / 2 : 0, dx1 = d ? d.x + d.w / 2 : 0;
  const inDoor = (x) => d && x > dx0 + 0.01 && x < dx1 - 0.01;
  // mullions: at both ends, the door edges, and every `pane` from each end toward the door
  const xs = [-hw + mt / 2, hw - mt / 2];
  if (d) xs.push(dx0 + mt / 2, dx1 - mt / 2);
  const segs = d ? [[-hw, dx0], [dx1, hw]] : [[-hw, hw]];
  for (const sg of segs) {
    const span = sg[1] - sg[0];
    const n = Math.max(1, Math.round(span / s.pane));
    for (let i = 1; i < n; i++) xs.push(sg[0] + (i * span) / n);
  }
  for (const x of xs) post(ctx, x, 0, 0, s.h, mt, md, 0.006, C.a, { start: false, end: false });
  // head rail full width; sill except the door; transom over the door
  bx(ctx, -hw, hw, s.h - mt, s.h, -md / 2, md / 2, C.a);
  if (d) {
    bx(ctx, -hw, dx0, 0, mt, -md / 2, md / 2, C.a, "b");
    bx(ctx, dx1, hw, 0, mt, -md / 2, md / 2, C.a, "b");
    bx(ctx, dx0, dx1, d.h, d.h + mt, -md / 2, md / 2, C.a, "lr");
  } else {
    bx(ctx, -hw, hw, 0, mt, -md / 2, md / 2, C.a, "b");
  }
  void inDoor;
}

// Skylight kerb + mullions around a w × d hole (the pane is a box row).
export function skylight(ctx, C, s) {
  const hw = s.w / 2, hd = s.d / 2, kt = 0.15, k = s.kerb;
  // pass a (steel)
  bx(ctx, -hw - kt, hw + kt, 0, k, -hd - kt, -hd, C.a, "b");
  bx(ctx, -hw - kt, hw + kt, 0, k, hd, hd + kt, C.a, "b");
  bx(ctx, -hw - kt, -hw, 0, k, -hd, hd, C.a, "bfk");
  bx(ctx, hw, hw + kt, 0, k, -hd, hd, C.a, "bfk");
  const along = s.w >= s.d; // mullions cross the shorter span
  const span = along ? s.w : s.d, n = Math.max(1, Math.round(span / 2));
  for (let i = 1; i < n; i++) {
    const u = -span / 2 + (i * span) / n;
    if (along) bx(ctx, u - 0.03, u + 0.03, k - 0.06, k, -hd, hd, C.a, "fk");
    else bx(ctx, -hw, hw, k - 0.06, k, u - 0.03, u + 0.03, C.a, "lr");
  }
}

// Roof slab with rectangular holes: z-band sweep into rectangles; side faces only where they
// border a hole or the slab's edge (no interior coplanar pairs). Top concrete, soffit white.
function rectsAround(x0, x1, z0, z1, holes) {
  const zs = [z0, z1];
  for (const h of holes) zs.push(h[2], h[3]);
  const bands = zs.filter((z, i, a) => z >= z0 && z <= z1 && a.indexOf(z) === i).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < bands.length; i++) {
    const za = bands[i], zb = bands[i + 1];
    if (zb - za < 1e-6) continue;
    const cut = holes.filter((h) => h[2] < zb - 1e-6 && h[3] > za + 1e-6).sort((a, b) => a[0] - b[0]);
    let x = x0;
    for (const h of cut) {
      if (h[0] > x + 1e-6) out.push([x, Math.min(h[0], x1), za, zb]);
      x = Math.max(x, h[1]);
    }
    if (x < x1 - 1e-6) out.push([x, x1, za, zb]);
  }
  return out;
}

export function roofSlab(ctx, C, s) {
  const hw = s.w / 2, hd = s.d / 2;
  const rects = rectsAround(-hw, hw, -hd, hd, s.holes);
  const inHole = (x, z) => s.holes.some((h) => x > h[0] && x < h[1] && z > h[2] && z < h[3]);
  const open = (x, z) => x < -hw + 1e-6 || x > hw - 1e-6 || z < -hd + 1e-6 || z > hd - 1e-6 || inHole(x, z);
  const sides = rects.map((r) => {
    let skip = "";
    const mx = (r[0] + r[1]) / 2, mz = (r[2] + r[3]) / 2, e = 0.01;
    if (!open(r[0] - e, mz)) skip += "l";
    if (!open(r[1] + e, mz)) skip += "r";
    if (!open(mx, r[2] - e)) skip += "k";
    if (!open(mx, r[3] + e)) skip += "f";
    return skip;
  });
  // pass a (concrete): tops + edges
  rects.forEach((r, i) => bx(ctx, r[0], r[1], 0, s.t, r[2], r[3], C.a, sides[i] + "b"));
  // pass b (white soffit)
  for (const r of rects) qd(ctx, C.b, [r[0], 0, r[2]], [r[1], 0, r[2]], [r[1], 0, r[3]], [r[0], 0, r[3]]);
}

// Dimensional letters: a stroke font (cell 0.8 × 1, stroke 0.18), layers step the depth so
// overlapping diagonals never share a face. Reads left→right from +Z. Baseline y 0, back z 0.
const STROKE_T = 0.18;
const FONT = {
  A: [[[0.09, 0], [0.4, 1], 1], [[0.71, 0], [0.4, 1], 2], [[0.19, 0.36], [0.61, 0.36], 0]],
  C: [[[0.09, 0.18], [0.09, 0.82], 0], [[0, 0.09], [0.8, 0.09], 0], [[0, 0.91], [0.8, 0.91], 0]],
  D: [[[0.09, 0.18], [0.09, 0.82], 0], [[0.71, 0.18], [0.71, 0.82], 0], [[0, 0.09], [0.8, 0.09], 0], [[0, 0.91], [0.8, 0.91], 0]],
  E: [[[0.09, 0], [0.09, 1], 0], [[0.18, 0.09], [0.8, 0.09], 0], [[0.18, 0.91], [0.8, 0.91], 0], [[0.18, 0.5], [0.66, 0.5], 0]],
  F: [[[0.09, 0], [0.09, 1], 0], [[0.18, 0.91], [0.8, 0.91], 0], [[0.18, 0.5], [0.66, 0.5], 0]],
  H: [[[0.09, 0], [0.09, 1], 0], [[0.71, 0], [0.71, 1], 0], [[0.18, 0.5], [0.62, 0.5], 0]],
  I: [[[0.4, 0], [0.4, 1], 0]],
  K: [[[0.09, 0], [0.09, 1], 0], [[0.16, 0.5], [0.71, 1], 1], [[0.16, 0.5], [0.71, 0], 2]],
  L: [[[0.09, 0], [0.09, 1], 0], [[0.18, 0.09], [0.8, 0.09], 0]],
  M: [[[0.09, 0], [0.09, 1], 0], [[0.71, 0], [0.71, 1], 0], [[0.09, 1], [0.4, 0.45], 1], [[0.71, 1], [0.4, 0.45], 2]],
  N: [[[0.09, 0], [0.09, 1], 0], [[0.71, 0], [0.71, 1], 0], [[0.09, 1], [0.71, 0], 1]],
  O: [[[0.09, 0.18], [0.09, 0.82], 0], [[0.71, 0.18], [0.71, 0.82], 0], [[0, 0.09], [0.8, 0.09], 0], [[0, 0.91], [0.8, 0.91], 0]],
  T: [[[0.4, 0], [0.4, 0.82], 0], [[0, 0.91], [0.8, 0.91], 0]],
  U: [[[0.09, 0.18], [0.09, 1], 0], [[0.71, 0.18], [0.71, 1], 0], [[0, 0.09], [0.8, 0.09], 0]],
  V: [[[0.09, 1], [0.4, 0], 1], [[0.71, 1], [0.4, 0], 2]],
  W: [[[0.06, 1], [0.22, 0], 1], [[0.22, 0], [0.4, 0.6], 2], [[0.4, 0.6], [0.58, 0], 1], [[0.58, 0], [0.74, 1], 2]],
  X: [[[0.09, 0], [0.71, 1], 1], [[0.09, 1], [0.71, 0], 2]],
  Y: [[[0.09, 1], [0.4, 0.55], 1], [[0.71, 1], [0.4, 0.55], 2], [[0.4, 0], [0.4, 0.62], 0]],
  Z: [[[0, 0.91], [0.8, 0.91], 0], [[0, 0.09], [0.8, 0.09], 0], [[0.09, 0.18], [0.71, 0.82], 1]],
};

export function letters(ctx, C, s) {
  const h = s.h, cell = 0.8 * h, gap = 0.2 * h, t = STROKE_T * h, D = 0.3 * (h / 2.4);
  const paint = s.glow ? C.glow(0.98, 0.8, 0.15, 0.9) : C.a;
  let x = -s.width / 2;
  for (let i = 0; i < s.text.length; i++) {
    const strokes = FONT[s.text[i]];
    if (strokes) {
      for (const st of strokes) {
        const a = st[0], b = st[1], layer = st[2];
        const ax = x + a[0] * h, ay = a[1] * h, bx_ = x + b[0] * h, by = b[1] * h;
        const dx = bx_ - ax, dy = by - ay;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ext = layer > 0 ? t / 2 : 0;
        const z0 = 0.2 * D * layer, z1 = D - 0.2 * D * layer;
        const f = xf((ax + bx_) / 2, (ay + by) / 2, (z0 + z1) / 2, 0, 0, Math.atan2(dy, dx) / D2R);
        fbox(ctx, f, [0, 0, 0], [len / 2 + ext, t / 2, (z1 - z0) / 2], paint);
      }
    }
    x += cell + gap;
  }
}

// Entrance canopy: yellow slab at height y, steel fascia edge, two front posts.
export function canopy(ctx, C, s) {
  const hw = s.w / 2, hd = s.d / 2;
  // pass a (yellow)
  slab(ctx, -hw, hw, s.y, s.y + s.t, -hd, hd, C.a, 0.015);
  // pass b (steel): posts at the front corners + a fascia strip under the front edge
  for (const sx of [-1, 1]) post(ctx, sx * (hw - 0.4), hd - 0.3, 0, s.y, 0.15, 0.15, 0.008, C.b, { start: false, end: false });
  bx(ctx, -hw + 0.02, hw - 0.02, s.y - 0.06, s.y, hd - 0.1, hd - 0.02, C.b, "t");
}

// Bus shelter, open front +Z: steel posts + roof, glass back and sides, a wood bench.
export function busShelter(ctx, C, s) {
  const hw = s.w / 2, hd = s.d / 2;
  // pass a (steel): posts, roof, back rail
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * hw, sz * hd, 0, s.h - 0.1, 0.08, 0.08, 0.005, C.a, { start: false, end: false });
  slab(ctx, -hw - 0.2, hw + 0.2, s.h - 0.1, s.h, -hd - 0.2, hd + 0.2, C.a, 0.01);
  bx(ctx, -hw, hw, 0.15, 0.2, -hd + 0.02, -hd + 0.06, C.a);
  // pass b (wood): bench
  slab(ctx, -hw + 0.3, hw - 0.3, 0.42, 0.46, -hd + 0.15, -hd + 0.55, C.b, 0.006);
  for (const sx of [-1, 1]) bx(ctx, sx * (hw - 0.45) - 0.03, sx * (hw - 0.45) + 0.03, 0, 0.42, -hd + 0.2, -hd + 0.5, C.a);
  // blue sign board on the roof front
  bx(ctx, -0.5, 0.5, s.h, s.h + 0.35, hd + 0.1, hd + 0.16, C.blue);
  // glass LAST: back pane + two side panes, 1 cm thick
  bx(ctx, -hw + 0.04, hw - 0.04, 0.2, s.h - 0.1, -hd - 0.005, -hd + 0.005, C.glass);
  for (const sx of [-1, 1]) bx(ctx, sx * hw - 0.005, sx * hw + 0.005, 0.2, s.h - 0.1, -hd + 0.04, hd - 0.04, C.glass);
}

// Store map: blue board on two posts with a proud yellow frame, white room blocks, a yellow loop.
export function storeMap(ctx, C) {
  const y0 = 0.9, y1 = 2.1, hw = 0.8, z0 = -0.025, z1 = 0.025;
  // pass a (blue)
  bx(ctx, -hw, hw, y0, y1, z0, z1, C.a);
  // pass b (steel): posts
  for (const sx of [-1, 1]) post(ctx, sx * 0.7, -0.03, 0, y0 + 0.02, 0.05, 0.05, 0.004, C.b);
  // pass yellow: frame strips (2 cm proud), the loop path
  const p = z1 + 0.02;
  bx(ctx, -hw, hw, y1 - 0.04, y1, z1, p, C.yellow, "k");
  bx(ctx, -hw, hw, y0, y0 + 0.04, z1, p, C.yellow, "k");
  bx(ctx, -hw, -hw + 0.04, y0 + 0.04, y1 - 0.04, z1, p, C.yellow, "k");
  bx(ctx, hw - 0.04, hw, y0 + 0.04, y1 - 0.04, z1, p, C.yellow, "k");
  const loop = [[-0.55, 1.05, -0.55, 1.85], [-0.55, 1.85, 0.55, 1.85], [0.55, 1.85, 0.55, 1.05], [0.55, 1.05, -0.2, 1.05]];
  for (const l of loop) bx(ctx, Math.min(l[0], l[2]) - 0.015, Math.max(l[0], l[2]) + 0.015, Math.min(l[1], l[3]) - 0.015, Math.max(l[1], l[3]) + 0.015, z1, p + 0.005, C.yellow, "k");
  // pass white: room blocks
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) bx(ctx, -0.42 + i * 0.3, -0.2 + i * 0.3, 1.2 + j * 0.35, 1.42 + j * 0.35, z1, p, C.white, "k");
  // glow LAST: you-are-here
  bx(ctx, -0.32, -0.26, 1.02, 1.08, z1, p + 0.01, C.glow(1.0, 0.3, 0.25, 1.4), "k");
}

// Flatbed trolley: blue deck on four wheels, steel push frame at +Z.
export function trolleyFlatbed(ctx, C) {
  // pass a (blue): deck
  slab(ctx, -0.4, 0.4, 0.22, 0.27, -0.6, 0.6, C.a, 0.006);
  // pass b (steel): frame + handle
  for (const sx of [-1, 1]) {
    G.tube(ctx, [sx * 0.36, 0.27, 0.55], [sx * 0.36, 1.0, 0.62], 0.015, 0.015, 8, [0, 0, 1], C.b);
    bx(ctx, sx * 0.36 - 0.02, sx * 0.36 + 0.02, 0.12, 0.22, -0.55, 0.55, C.b);
  }
  G.tube(ctx, [-0.36, 1.0, 0.62], [0.36, 1.0, 0.62], 0.02, 0.02, 8, [0, 1, 0], C.b);
  G.tube(ctx, [-0.36, 0.65, 0.585], [0.36, 0.65, 0.585], 0.015, 0.015, 8, [0, 1, 0], C.b);
  // pass black: wheels
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(ctx, sx * 0.34, 0.07, sz * 0.45, 0.07, 0.04, C.black);
}

// Aisle board: blue board with a yellow frame hanging from two wires. Origin at the board's bottom.
export function aisleBoard(ctx, C, s) {
  const hw = s.w / 2, z0 = -0.02, z1 = 0.02;
  bx(ctx, -hw, hw, 0, s.h, z0, z1, C.a);
  const p = 0.02;
  for (const sz of [-1, 1]) {
    const za = sz > 0 ? z1 : z0 - p, zb = sz > 0 ? z1 + p : z0;
    const skip = sz > 0 ? "k" : "f";
    bx(ctx, -hw, hw, s.h - 0.04, s.h, za, zb, C.b, skip);
    bx(ctx, -hw, hw, 0, 0.04, za, zb, C.b, skip);
    bx(ctx, -hw, -hw + 0.04, 0.04, s.h - 0.04, za, zb, C.b, skip);
    bx(ctx, hw - 0.04, hw, 0.04, s.h - 0.04, za, zb, C.b, skip);
  }
  if (s.hang > 0) for (const sx of [-1, 1]) rod(ctx, sx * (hw - 0.1), 0, s.h, s.h + s.hang, 0.006, 0.006, 5, C.black);
}

// ── entry points ────────────────────────────────────────────────────────────
export function resolvePart(p) {
  return PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "gondola";
}

export function geometry(ctx) {
  const p = ctx.params || {};
  const part = resolvePart(p);
  const s = size(part, p);
  const C = paints(ctx, p, part);
  if (part === "gondola") gondola(ctx, C, s);
  else if (part === "rack") rack(ctx, C, s);
  else if (part === "flatpack-stack") flatpackStack(ctx, C, s);
  else if (part === "cart") for (const pass of ["steel", "plastic", "rubber"]) cart(ctx, C, 0, pass, true);
  else if (part === "cart-row") cartRow(ctx, C, s);
  else if (part === "cart-return") cartReturn(ctx, C, s);
  else if (part === "checkout-lane") checkoutLane(ctx, C, s);
  else if (part === "cafe-counter") cafeCounter(ctx, C, s);
  else if (part === "cafe-table") cafeTable(ctx, C, s);
  else if (part === "price-card") priceCard(ctx, C, s);
  else if (part === "floor-arrow") floorArrow(ctx, C, s);
  else if (part === "escalator") escalator(ctx, C, s);
  else if (part === "guard-rail") guardRail(ctx, C, s);
  else if (part === "flag-pole") flagPole(ctx, C, s);
  else if (part === "bollard") bollard(ctx, C, s);
  else if (part === "bollard-row") bollardRow(ctx, C, s);
  else if (part === "bag-bin") bagBin(ctx, C, s);
  else if (part === "plinth") plinth(ctx, C, s);
  else if (part === "set-wall") setWall(ctx, C, s);
  else if (part === "door-frame") doorFrame(ctx, C, s);
  else if (part === "column-row") columnRow(ctx, C, s);
  else if (part === "glazing-frame") glazingFrame(ctx, C, s);
  else if (part === "skylight") skylight(ctx, C, s);
  else if (part === "roof-slab") roofSlab(ctx, C, s);
  else if (part === "letters") letters(ctx, C, s);
  else if (part === "canopy") canopy(ctx, C, s);
  else if (part === "bus-shelter") busShelter(ctx, C, s);
  else if (part === "store-map") storeMap(ctx, C);
  else if (part === "trolley-flatbed") trolleyFlatbed(ctx, C);
  else if (part === "aisle-board") aisleBoard(ctx, C, s);
}

// Collision: the escalator's collider is its walkable ramp + plates + balustrade slabs (the steps
// are a picture); every other part collides as its visual mesh — identical to the engine's
// no-export fallback, kept explicit so one script can carry both. Rows still decide with `physics`.
export function collider(ctx) {
  const p = ctx.params || {};
  const part = resolvePart(p);
  if (part === "escalator") escalatorCollider(ctx, size(part, p));
  else geometry(ctx);
}

export { PARTS, DEF, NO_PHYSICS, size, dims, manifest, escSpec, rectsAround };
