// LAMPS — HYLLA's lighting family, ONE generator (09b §3.9). Every lamp the store sells; none of
// them is a real light — 09 §5 caps the place at 4 — they glow by emissive (home-mat glow()).
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/lamps.js",
//                params: { part: "floor", h: 1.6, shade: "cone", dia: 0.4, lit: true,
//                          finish: "linen-oat", finish2: "black" } }
//
// FRAMES (09b §1): `floor` and `table` and `desk` build in the floor/top frame — origin at the feet,
//   footprint centre, +Y up, front +Z, body x ±w/2 · z ±d/2 · y 0→h (floor lamp is a `floor` row,
//   table/desk lamps are `top` rows — the layout adds the host's surface). `pendant` and `string`
//   are `ceiling` parts — origin at the CEILING CONTACT (top centre), body y −h→0 grows DOWN;
//   `params.drop` is the cord drop (pendant: to the shade's bottom = dims[2]; string: the cord-pair
//   drop, dims[2] = drop + sag + 0.13 bulb hang), range 0.60–3.60 — HYLLA's layout writes it per
//   placement (09z seam 11). `sconce` is a `wall` part — origin at the BACK-BOTTOM centre: x ±w/2 ·
//   z 0→+d out from the wall · y 0→+h; mountY 1.70.
// `dims` = TOTAL extent (shade, finials, the desk head's forward reach — the desk lamp's footprint
//   is centred on its extent, so its base sits at z = −0.22 and the head reaches z +0.30).
// SCALE: floor 1.60 / shade ⌀0.40, table 0.50 / ⌀0.30, desk reach 0.45 / h 0.40, pendant ⌀0.35 drop
//   0.80, sconce 0.20×0.12×0.25, string 3.0 m / 12 bulbs / sag 0.25.
//
//   part: "floor"    h 1.60, shade ⌀0.40 on a stem + disc base      part: "pendant"  ⌀0.35 shade on a cord, drop 0.80 (ceiling)
//   part: "table"    h 0.50, shade ⌀0.30 on a turned base            part: "sconce"   half-drum on a backplate (wall 1.70)
//   part: "desk"     two-arm task lamp, reach 0.45, head tilts down  part: "string"   3.0 m catenary, 12 bulbs, sag 0.25 (ceiling)
//
// PARAMS: shade "drum"|"cone"|"globe"|"paper" (floor/table/pendant) · dia (shade ⌀) · h (floor/table
//   total height) · drop (pendant/string) · len, n, sag (string) · lit bool (glow bulb + a warm inner
//   shade sheet; default true) · finish = shade (linen-oat; desk head + string sockets default black)
//   · finish2 = stem / base / cord / plate (black).
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule: floor lamp → mesh,
//   every other lamp row "none").
// DRAW GROUPS: ordered by albedo — every face of `finish`, then every face of `finish2`, then the
//   untextured glow LAST (bulb + inner shade when lit; an unlit bulb wears the ceramic finish and joins
//   the textured groups).
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("scripts/lib/geom.js");
const M = require("lib/home-mat.js");

const PARTS = ["floor", "table", "desk", "pendant", "sconce", "string"];
const SHADES = ["drum", "cone", "globe", "paper"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  floor: { h: 1.6, shade: "cone", dia: 0.4, lit: true, finish: "linen-oat", finish2: "black" },
  table: { h: 0.5, shade: "drum", dia: 0.3, lit: true, finish: "linen-oat", finish2: "black" },
  desk: { lit: true, finish: "black", finish2: "black" },
  pendant: { drop: 0.8, shade: "cone", dia: 0.35, lit: true, finish: "linen-oat", finish2: "black" },
  sconce: { lit: true, finish: "linen-oat", finish2: "black" },
  string: { len: 3.0, n: 12, sag: 0.25, drop: 0.3, lit: true, finish: "black", finish2: "black" },
};

const WARM = [1.0, 0.92, 0.78]; // 09b §3.9 glow
const SHADE_SIDES = 16;
const SKIN = 0.004; // inner glow sheet inset
const UNLIT_BULB = "ceramic";
const DESK_BASE_Z = -0.22; // desk lamp base centre — the extent is centred on z 0

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}
export function pick(v, list, d) {
  return typeof v === "string" && list.indexOf(v) >= 0 ? v : d;
}
export function bool(v, d) {
  return v === undefined ? !!d : !!v;
}

// Shade height for a kind at radius r.
export function shadeH(kind, r) {
  return kind === "drum" ? r * 1.3 : kind === "cone" ? r * 1.4 : r * 1.8;
}

// Resolved size params for a part (what geometry() builds and what manifest() reports).
function size(part, p) {
  const D = DEF[part] || DEF.floor;
  p = p || {};
  const s = { lit: bool(p.lit, D.lit) };
  if (part === "floor" || part === "table") {
    s.shade = pick(p.shade, SHADES, D.shade);
    s.dia = clamp(num(p.dia, D.dia), 0.15, 0.7);
    s.h = clamp(num(p.h, D.h), part === "floor" ? 1.0 : 0.3, part === "floor" ? 2.2 : 0.9);
    s.sh = Math.min(shadeH(s.shade, s.dia / 2), s.h * 0.45);
    s.w = s.d = Math.max(s.dia, part === "floor" ? 0.28 : 0.17);
  } else if (part === "desk") {
    s.w = 0.16;
    s.d = 0.6;
    s.h = 0.4;
  } else if (part === "pendant") {
    s.shade = pick(p.shade, SHADES, D.shade);
    s.dia = clamp(num(p.dia, D.dia), 0.15, 0.8);
    s.drop = clamp(num(p.drop, D.drop), 0.6, 3.6);
    s.sh = shadeH(s.shade, s.dia / 2);
    s.w = s.d = s.dia;
    s.h = s.drop;
  } else if (part === "sconce") {
    s.w = 0.2;
    s.d = 0.12;
    s.h = 0.25;
  } else {
    // string
    s.len = clamp(num(p.len, D.len), 1.0, 8.0);
    s.n = clamp(Math.round(num(p.n, D.n)), 3, 30);
    s.sag = clamp(num(p.sag, D.sag), 0.05, 0.8);
    s.drop = clamp(num(p.drop, D.drop), 0.05, 3.6);
    s.w = s.len;
    s.d = 0.06;
    s.h = s.drop + s.sag + 0.13;
  }
  return s;
}

// [w, d, h] in the part's frame — the catalog's `dims` (total extent).
function dims(part, p) {
  const s = size(part, p);
  return [s.w, s.d, s.h];
}

// Mount per part (the row picks); the sconce carries 09b's mountY.
function mountOf(part) {
  if (part === "pendant" || part === "string") return { mount: "ceiling", mountY: 0 };
  if (part === "sconce") return { mount: "wall", mountY: 1.7 };
  if (part === "floor") return { mount: "floor", mountY: 0 };
  return { mount: "top", mountY: 0 };
}

function manifest() {
  const parts = {};
  const add = (key, base, p) => {
    const m = mountOf(base);
    parts[key] = { dims: dims(base, p), surface: 0, mount: m.mount, mountY: m.mountY, defaults: Object.assign({}, DEF[base], p) };
  };
  for (const k of PARTS) add(k, k, {});
  add("floor-globe", "floor", { shade: "globe" });
  add("table-paper", "table", { shade: "paper" });
  add("pendant-paper", "pendant", { shade: "paper" });
  return { family: "lamps", script: "scripts/asset-library/gen-home/lamps.js", parts, shades: SHADES };
}

// ── emitters (townscape.js pattern) ─────────────────────────────────────────
export function qd(ctx, paint, a, b, c, d) {
  if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
}
export function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
// Outward-checked quad: winding derived from the `out` hint, never eyeballed per face.
export function qo(ctx, paint, a, b, c, d, out) {
  const n = cross(sub(b, a), sub(c, a));
  if (dot(n, out) < 0) qd(ctx, paint, a, d, c, b);
  else qd(ctx, paint, a, b, c, d);
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

// Chamfered disc (bases, ceiling roses, fitter plates).
export function disc(ctx, cx, y0, y1, cz, r, bevel, sides, paint) {
  const e = Math.min(bevel, (y1 - y0) * 0.3, r * 0.3);
  const F = (y, rr) => ({ c: [cx, y, cz], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(rr * 2, rr * 2, 0, 0, sides, 1) });
  ctx.smooth();
  G.loftFrames(ctx, [F(y0, r - e), F(y0 + e, r), F(y1 - e, r), F(y1, r - e)], paint);
  ctx.flat();
}

// Round rod between two points (stems, arms, cords). Smooth-shaded, capped.
export function rod(ctx, A, B, r, sides, paint, caps) {
  ctx.smooth();
  const f = norm(sub(B, A));
  const up = Math.abs(f[1]) > 0.9 ? [0, 0, -1] : [0, 1, 0];
  G.loftFrames(ctx, [{ c: A, f: f, up: up, poly: G.oval(r * 2, r * 2, 0, 0, sides, 1) }, { c: B, f: f, up: up, poly: G.oval(r * 2, r * 2, 0, 0, sides, 1) }], paint, {
    capStart: caps !== false,
    capEnd: caps !== false,
  });
  ctx.flat();
}

// Shade stations along +y for a kind: [[t, radius factor]] — open at both ends.
export function shadeProfile(kind) {
  if (kind === "drum") return [[0, 1], [1, 1]];
  if (kind === "cone") return [[0, 1], [1, 0.55]];
  if (kind === "globe") return [[0, 0.42], [0.12, 0.75], [0.3, 0.95], [0.5, 1], [0.7, 0.95], [0.88, 0.75], [1, 0.42]];
  return [[0, 0.6], [0.08, 0.86], [0.25, 1], [0.75, 1], [0.92, 0.86], [1, 0.6]]; // paper lantern
}

// Shade sheet: stations lofted up y around (cx, cz), radius r, open top and bottom. `inward` flips
// the ring order so the sheet faces in (the lit inner skin, inset SKIN).
export function shade(ctx, kind, cx, cz, yBot, yTop, r, paint, inward) {
  const prof = shadeProfile(kind);
  const frames = prof.map((q) => {
    const rr = Math.max(0.01, r * q[1] - (inward ? SKIN : 0));
    const poly = G.oval(rr * 2, rr * 2, 0, 0, SHADE_SIDES, 1);
    return { c: [cx, yBot + q[0] * (yTop - yBot), cz], f: [0, 1, 0], up: [0, 0, -1], poly: inward ? poly.slice().reverse() : poly };
  });
  ctx.smooth();
  G.loftFrames(ctx, frames, paint, { capStart: false, capEnd: false });
  ctx.flat();
}

// Top radius of a shade kind (where the spider spokes land).
export function shadeTopR(kind, r) {
  const prof = shadeProfile(kind);
  return r * prof[prof.length - 1][1];
}

// Three spider spokes from the stem to the shade's top ring.
export function spider(ctx, cx, cz, y, rTop, paint) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    rod(ctx, [cx, y, cz], [cx + Math.cos(a) * (rTop - 0.006), y, cz - Math.sin(a) * (rTop - 0.006)], 0.004, 4, paint, false);
  }
}

// Socket (finish2) hanging under y0, then the bulb centre 1.4 r below the socket foot.
export function socket(ctx, cx, y0, cz, r, paint) {
  rod(ctx, [cx, y0, cz], [cx, y0 - r * 1.6, cz], r * 0.55, 8, paint);
}

// Bulb: glow (or ceramic when unlit) teardrop centred at (cx, cy, cz), radius r.
export function bulb(ctx, cx, cy, cz, r, paint) {
  const F = (dy, rr) => ({ c: [cx, cy + dy, cz], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(rr * 2, rr * 2, 0, 0, 8, 1) });
  ctx.smooth();
  G.loftFrames(ctx, [F(-r * 0.95, r * 0.35), F(-r * 0.3, r), F(r * 0.45, r * 0.8), F(r * 0.95, r * 0.45)], paint);
  ctx.flat();
}

// ── parts ──────────────────────────────────────────────────────────────────
export function floorLamp(ctx, C, s) {
  const r = s.dia / 2, yTop = s.h, yBot = s.h - s.sh;
  // finish group: shade
  shade(ctx, s.shade, 0, 0, yBot, yTop, r, C.shade, false);
  // finish2 group: base, stem, spider, socket
  disc(ctx, 0, 0, 0.02, 0, 0.14, 0.006, 12, C.stem);
  rod(ctx, [0, 0.02, 0], [0, yTop - 0.03, 0], 0.012, 8, C.stem);
  spider(ctx, 0, 0, yTop - 0.02, shadeTopR(s.shade, r), C.stem);
  const ySock = yBot + s.sh * 0.62;
  socket(ctx, 0, ySock, 0, 0.03, C.stem);
  // glow group
  if (s.lit) shade(ctx, s.shade, 0, 0, yBot, yTop, r, C.inner, true);
  bulb(ctx, 0, ySock - 0.03 * 1.6 - 0.032, 0, 0.032, s.lit ? C.bulb : C.unlit);
}

export function tableLamp(ctx, C, s) {
  const r = s.dia / 2, yTop = s.h, yBot = s.h - s.sh;
  const bodyH = yBot - 0.04;
  // finish group: shade
  shade(ctx, s.shade, 0, 0, yBot, yTop, r, C.shade, false);
  // finish2 group: turned body, neck, spider, socket
  const R = Math.min(0.09, r * 0.6);
  const prof = [[0, 0.7], [0.03, 0.95], [0.3, 1], [0.6, 0.78], [0.85, 0.42], [1, 0.22]];
  ctx.smooth();
  G.loftFrames(
    ctx,
    prof.map((q) => ({ c: [0, q[0] * bodyH, 0], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(R * q[1] * 2, R * q[1] * 2, 0, 0, 12, 1) })),
    C.stem,
    { capStart: true, capEnd: false }
  );
  ctx.flat();
  rod(ctx, [0, bodyH - 0.005, 0], [0, yTop - 0.03, 0], 0.01, 8, C.stem);
  spider(ctx, 0, 0, yTop - 0.02, shadeTopR(s.shade, r), C.stem);
  const ySock = yBot + s.sh * 0.6;
  socket(ctx, 0, ySock, 0, 0.026, C.stem);
  // glow group
  if (s.lit) shade(ctx, s.shade, 0, 0, yBot, yTop, r, C.inner, true);
  bulb(ctx, 0, ySock - 0.026 * 1.6 - 0.028, 0, 0.028, s.lit ? C.bulb : C.unlit);
}

// Task lamp: disc base at z −0.22, post, two arms with an elbow ball, a cone head tilted down and
// forward over the desk. Head = finish, everything else finish2.
export function deskLamp(ctx, C, s) {
  const zb = DESK_BASE_Z;
  const E = [0, 0.36, zb + 0.14], H = [0, 0.3, zb + 0.4];
  const dir = norm([0, -0.8, 0.45]);
  const headL = 0.13, rMouth = 0.065, rNeck = 0.022;
  const mouth = [H[0] + dir[0] * headL, H[1] + dir[1] * headL, H[2] + dir[2] * headL];
  // finish group: the head cone (open mouth, closed neck)
  ctx.smooth();
  G.loftFrames(
    ctx,
    [
      { c: H, f: dir, up: [0, 1, 0], poly: G.oval(rNeck * 2, rNeck * 2, 0, 0, 12, 1) },
      { c: [H[0] + dir[0] * 0.03, H[1] + dir[1] * 0.03, H[2] + dir[2] * 0.03], f: dir, up: [0, 1, 0], poly: G.oval(rNeck * 2.6, rNeck * 2.6, 0, 0, 12, 1) },
      { c: mouth, f: dir, up: [0, 1, 0], poly: G.oval(rMouth * 2, rMouth * 2, 0, 0, 12, 1) },
    ],
    C.shade,
    { capStart: true, capEnd: false }
  );
  ctx.flat();
  // finish2 group: base, post, arms, elbow, head pivot
  disc(ctx, 0, 0, 0.02, zb, 0.08, 0.005, 12, C.stem);
  rod(ctx, [0, 0.02, zb], [0, 0.07, zb], 0.014, 8, C.stem);
  rod(ctx, [0, 0.06, zb], E, 0.008, 8, C.stem);
  rod(ctx, E, H, 0.008, 8, C.stem);
  ctx.smooth();
  const ball = (c, r) =>
    G.loftFrames(
      ctx,
      [
        { c: [c[0], c[1] - r, c[2]], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(r * 0.6, r * 0.6, 0, 0, 8, 1) },
        { c: [c[0], c[1], c[2]], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(r * 2, r * 2, 0, 0, 8, 1) },
        { c: [c[0], c[1] + r, c[2]], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(r * 0.6, r * 0.6, 0, 0, 8, 1) },
      ],
      C.stem
    );
  ball(E, 0.018);
  ball(H, 0.016);
  ctx.flat();
  // glow group: inner head skin + bulb in the mouth
  if (s.lit) {
    G.loftFrames(
      ctx,
      [
        { c: [H[0] + dir[0] * 0.035, H[1] + dir[1] * 0.035, H[2] + dir[2] * 0.035], f: dir, up: [0, 1, 0], poly: G.oval(rNeck * 2.6 - SKIN * 2, rNeck * 2.6 - SKIN * 2, 0, 0, 12, 1).reverse() },
        { c: mouth, f: dir, up: [0, 1, 0], poly: G.oval(rMouth * 2 - SKIN * 2, rMouth * 2 - SKIN * 2, 0, 0, 12, 1).reverse() },
      ],
      C.inner,
      { capStart: false, capEnd: false }
    );
  }
  const bc = [H[0] + dir[0] * 0.085, H[1] + dir[1] * 0.085, H[2] + dir[2] * 0.085];
  bulb(ctx, bc[0], bc[1], bc[2], 0.022, s.lit ? C.bulb : C.unlit);
}

// Pendant: ceiling rose at 0, cord, fitter plate + socket, shade with its bottom at −drop.
export function pendant(ctx, C, s) {
  const r = s.dia / 2, yBot = -s.drop, yTop = yBot + s.sh;
  // finish group: shade
  shade(ctx, s.shade, 0, 0, yBot, yTop, r, C.shade, false);
  // finish2 group: rose, cord, fitter, socket
  disc(ctx, 0, -0.02, 0, 0, 0.05, 0.005, 12, C.stem);
  rod(ctx, [0, -0.02, 0], [0, yTop + 0.004, 0], 0.004, 8, C.stem, false);
  const rTop = shadeTopR(s.shade, r);
  disc(ctx, 0, yTop - 0.004, yTop + 0.004, 0, Math.min(0.05, rTop * 0.9), 0.002, 12, C.stem);
  const ySock = yTop - 0.004;
  socket(ctx, 0, ySock, 0, 0.026, C.stem);
  // glow group
  if (s.lit) shade(ctx, s.shade, 0, 0, yBot, yTop, r, C.inner, true);
  bulb(ctx, 0, ySock - 0.026 * 1.6 - 0.03, 0, 0.03, s.lit ? C.bulb : C.unlit);
}

// Sconce: backplate on the wall, a short arm, a half-drum shade open to the room, bulb inside.
export function sconce(ctx, C, s) {
  const R = 0.1, zc = 0.02, y0 = 0.13, y1 = 0.25, N = 10;
  const P = (rr, a, y) => [Math.cos(a) * rr, y, zc + Math.sin(a) * rr];
  // finish group: half-drum sheet (angles 0..π sweep from +x through +z to −x)
  const half = (rr, paint, inward) => {
    ctx.smooth();
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI, a1 = ((i + 1) / N) * Math.PI, am = (a0 + a1) / 2;
      const out = inward ? [-Math.cos(am), 0, -Math.sin(am)] : [Math.cos(am), 0, Math.sin(am)];
      qo(ctx, paint, P(rr, a0, y0), P(rr, a1, y0), P(rr, a1, y1), P(rr, a0, y1), out);
    }
    ctx.flat();
  };
  half(R, C.shade, false);
  // finish2 group: backplate, arm, socket
  G.boxZ(ctx, -0.03, 0.03, 0, s.h, 0, 0.012, 0.004, C.stem);
  rod(ctx, [0, 0.19, 0.012], [0, 0.19, 0.055], 0.007, 8, C.stem);
  socket(ctx, 0, 0.215, 0.06, 0.02, C.stem);
  // glow group
  if (s.lit) half(R - SKIN, C.inner, true);
  bulb(ctx, 0, 0.215 - 0.02 * 1.6 - 0.024, 0.06, 0.024, s.lit ? C.bulb : C.unlit);
}

// String lights: two drop cords from ceiling roses, a sagging catenary between them, n bulbs on
// short pigtails. Sockets = finish, cords/roses = finish2.
export function stringLights(ctx, C, s) {
  const hx = s.len / 2, yC = -s.drop;
  const cordY = (x) => yC - s.sag * (1 - (x / hx) * (x / hx));
  const N = 18;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = -hx + (s.len * i) / N;
    pts.push([x, cordY(x), 0]);
  }
  const bulbs = [];
  for (let i = 0; i < s.n; i++) {
    const x = -hx + (s.len * (i + 0.5)) / s.n;
    bulbs.push([x, cordY(x)]);
  }
  // finish group: sockets (caps hidden inside pigtail / bulb — none emitted)
  for (const b of bulbs) rod(ctx, [b[0], b[1] - 0.03, 0], [b[0], b[1] - 0.06, 0], 0.012, 6, C.shade, false);
  // finish2 group: roses, drop cords, catenary, pigtails
  for (const sx of [-1, 1]) {
    rod(ctx, [sx * hx, -0.012, 0], [sx * hx, 0, 0], 0.02, 8, C.stem);
    rod(ctx, [sx * hx, -0.012, 0], [sx * hx, yC, 0], 0.004, 5, C.stem, false);
  }
  ctx.smooth();
  G.polyTube(ctx, pts, 0.004, 4, [0, 0, 1], C.stem);
  ctx.flat();
  for (const b of bulbs) rod(ctx, [b[0], b[1], 0], [b[0], b[1] - 0.03, 0], 0.003, 3, C.stem, false);
  // glow group: bulbs
  for (const b of bulbs) {
    const cy = b[1] - 0.06 - 0.03;
    const F = (dy, rr) => ({ c: [b[0], cy + dy, 0], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(rr * 2, rr * 2, 0, 0, 5, 1) });
    ctx.smooth();
    G.loftFrames(ctx, [F(-0.03, 0.012), F(-0.008, 0.026), F(0.03, 0.013)], s.lit ? C.bulb : C.unlit, { capStart: true, capEnd: false });
    ctx.flat();
  }
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "floor";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    shade: M.finish(ctx, p.finish, D.finish),
    stem: M.finish(ctx, p.finish2, D.finish2),
    unlit: M.finish(ctx, UNLIT_BULB, UNLIT_BULB),
    inner: M.glow(ctx, WARM[0], WARM[1], WARM[2], 0.85),
    bulb: M.glow(ctx, WARM[0], WARM[1], WARM[2], 2.2),
  };
  if (part === "table") tableLamp(ctx, C, s);
  else if (part === "desk") deskLamp(ctx, C, s);
  else if (part === "pendant") pendant(ctx, C, s);
  else if (part === "sconce") sconce(ctx, C, s);
  else if (part === "string") stringLights(ctx, C, s);
  else floorLamp(ctx, C, s);
}

export { PARTS, DEF, SHADES, size, dims, mountOf, manifest };
