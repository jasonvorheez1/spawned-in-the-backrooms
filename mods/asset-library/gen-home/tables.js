// TABLES — HYLLA's table family, ONE generator (09b §3.3). Every table the store sells.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/tables.js",
//                params: { part: "dining", w: 1.8, d: 0.9, h: 0.75, leg: "straight",
//                          finish: "oak", finish2: "black" } }
//
// FRAME (09b §1 `floor` mount): origin ON THE GROUND at the footprint centre, +Y up, front on +Z,
//        body x ±w/2 · z ±d/2 · y 0→h. `dims` = TOTAL extent (the dressing mirror counts).
// SCALE: real furniture — dining top 0.75, coffee 0.42, console 0.80.
//
//   part: "coffee"    1.10×0.60×0.42, lower shelf          part: "round"    ⌀1.30 (w) × 0.75, pedestal
//   part: "side"      0.45×0.45×0.55, lower shelf          part: "card"     0.90 sq × 0.75, felt inlay + 4 cup rings
//   part: "console"   1.20×0.35×0.80, lower shelf          part: "desk"     1.40×0.60×0.75, one drawer
//   part: "dining"    1.80×0.90×0.75                       part: "dressing" 1.00×0.45 desk 0.75 + mirror to 1.50
//
// PARAMS: w, d, h (top height) · leg "straight"|"tapered"|"hairpin"|"pedestal" · finish (top;
//   default oak) · finish2 (legs / frame / handles; default black — hairpin forces steel, pedestal
//   takes finish) · shelf bool (coffee/side/console) · mirrorH (dressing) · canary bool (dining
//   only: glow chip + oak block + glass coaster after the textured groups — the K1 proof).
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — every face of `finish`, then every face of `finish2`, then
//   fixed paints (steel, mirror), then glow, then glass LAST (transparent pass ends the run).
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("scripts/lib/geom.js");
const M = require("lib/home-mat.js");

const PARTS = ["coffee", "side", "console", "dining", "round", "card", "desk", "dressing"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  coffee: { w: 1.1, d: 0.6, h: 0.42, leg: "straight", finish: "oak", finish2: "black", shelf: true },
  side: { w: 0.45, d: 0.45, h: 0.55, leg: "tapered", finish: "oak", finish2: "black", shelf: true },
  console: { w: 1.2, d: 0.35, h: 0.8, leg: "straight", finish: "oak", finish2: "black", shelf: true },
  dining: { w: 1.8, d: 0.9, h: 0.75, leg: "straight", finish: "oak", finish2: "black" },
  round: { w: 1.3, d: 1.3, h: 0.75, leg: "pedestal", finish: "oak", finish2: "black" },
  card: { w: 0.9, d: 0.9, h: 0.75, leg: "straight", finish: "felt-green", finish2: "walnut" },
  desk: { w: 1.4, d: 0.6, h: 0.75, leg: "straight", finish: "oak", finish2: "black" },
  dressing: { w: 1.0, d: 0.45, h: 0.75, leg: "straight", finish: "oak", finish2: "white", mirrorH: 1.5 },
};

const LEG = 0.055; // straight leg section
const LEGS = ["straight", "tapered", "hairpin", "pedestal"];

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}

// Resolved size params for a part (what geometry() builds and what manifest() reports).
function size(part, p) {
  const D = DEF[part] || DEF.dining;
  p = p || {};
  const isRound = part === "round";
  const w = clamp(num(p.w, D.w), 0.3, 3.0);
  const d = isRound ? w : clamp(num(p.d, D.d), 0.25, 1.5);
  const h = clamp(num(p.h, D.h), 0.25, 1.2);
  let leg = typeof p.leg === "string" && LEGS.indexOf(p.leg) >= 0 ? p.leg : D.leg;
  if (isRound) leg = "pedestal";
  const mirrorH = part === "dressing" ? clamp(num(p.mirrorH, D.mirrorH), h + 0.3, 2.2) : 0;
  return { w, d, h, leg, mirrorH, shelf: p.shelf === undefined ? !!D.shelf : !!p.shelf };
}

// [w, d, hTotal] in the floor frame — the catalog's `dims`; `surface` is the top height.
function dims(part, p) {
  const s = size(part, p);
  return [s.w, s.d, part === "dressing" ? s.mirrorH : s.h];
}

function manifest() {
  const parts = {};
  for (const k of PARTS) {
    const s = size(k, {});
    parts[k] = { dims: dims(k, {}), surface: s.h, defaults: DEF[k] };
  }
  return { family: "tables", script: "scripts/asset-library/gen-home/tables.js", parts, legs: LEGS };
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

// Chamfered slab — every table top and shelf. 0.008 is the furniture bevel.
export function slab(ctx, x0, x1, y0, y1, z0, z1, paint, bevel) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.008, paint);
}

// Vertical chamfered prism between two footprints (a square leg, a column).
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

// Round tapered leg from foot A to head B, radii r0 → r1; smooth-shaded.
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

// Chamfered disc (round tops, pedestal bases, coasters).
export function disc(ctx, cx, y0, y1, cz, r, bevel, sides, paint) {
  const e = Math.min(bevel, (y1 - y0) * 0.3, r * 0.3);
  const F = (y, rr) => ({ c: [cx, y, cz], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(rr * 2, rr * 2, 0, 0, sides, 1) });
  G.loftFrames(ctx, [F(y0, r - e), F(y0 + e, r), F(y1 - e, r), F(y1, r - e)], paint);
}

// An open ring standing on y0: outer wall, top annulus, inner wall (card-table cup ring).
export function ring(ctx, cx, cz, y0, y1, rOut, rIn, sides, paint) {
  const P = (r, a, y) => [cx + Math.cos(a) * r, y, cz - Math.sin(a) * r];
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    // outer wall (faces out)
    qd(ctx, paint, P(rOut, a0, y0), P(rOut, a1, y0), P(rOut, a1, y1), P(rOut, a0, y1));
    // top annulus (faces up)
    qd(ctx, paint, P(rOut, a0, y1), P(rOut, a1, y1), P(rIn, a1, y1), P(rIn, a0, y1));
    // inner wall (faces in)
    qd(ctx, paint, P(rIn, a1, y0), P(rIn, a0, y0), P(rIn, a0, y1), P(rIn, a1, y1));
  }
}

// ── legs: the four styles ──────────────────────────────────────────────────
// yTop = underside of the top. Emits the finish2 group (or steel for hairpin, finish for pedestal).
export function legs(ctx, C, s, yTop, opts) {
  const o = opts || {};
  const inset = num(o.inset, 0.08);
  const w = s.w, d = s.d;
  if (s.leg === "pedestal") return pedestal(ctx, o.pedestalPaint || C.top, w, d, yTop, !!o.round);
  const xs = w / 2 - inset - LEG / 2, zs = d / 2 - inset - LEG / 2;
  if (s.leg === "hairpin") {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) hairpin(ctx, C.steel, sx * xs, sz * zs, yTop);
    return;
  }
  const paint = C.legs;
  // apron rails between the legs, 3 mm shy of the top's underside
  if (o.apron !== false) {
    const ah = Math.min(0.075, yTop * 0.2), at = 0.02, ya = yTop - 0.003;
    bx(ctx, -xs + LEG / 2, xs - LEG / 2, ya - ah, ya, zs - LEG / 2 - at, zs - LEG / 2, paint, "t");
    bx(ctx, -xs + LEG / 2, xs - LEG / 2, ya - ah, ya, -zs + LEG / 2, -zs + LEG / 2 + at, paint, "t");
    bx(ctx, xs - LEG / 2 - at, xs - LEG / 2, ya - ah, ya, -zs + LEG / 2, zs - LEG / 2, paint, "t");
    bx(ctx, -xs + LEG / 2, -xs + LEG / 2 + at, ya - ah, ya, -zs + LEG / 2, zs - LEG / 2, paint, "t");
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * xs, z = sz * zs;
      if (s.leg === "tapered") {
        // round cone, splayed 3 cm outward at the foot
        roundLeg(ctx, [x + sx * 0.03, 0, z + sz * 0.03], [x, yTop, z], 0.015, 0.03, 12, paint);
      } else {
        post(ctx, x, z, 0, yTop, LEG, LEG, LEG, LEG, 0.005, paint);
      }
    }
  }
}

// Steel hairpin: two 5.5 mm rods meet at the floor and splay up to a plate under the top.
export function hairpin(ctx, paint, x, z, yTop) {
  const sx = x < 0 ? -1 : 1, sz = z < 0 ? -1 : 1;
  const sp = 0.11;
  const T1 = [x - sx * sp, yTop, z], T2 = [x, yTop, z - sz * sp];
  const F = [x + sx * 0.02, 0.012, z + sz * 0.02];
  const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  ctx.smooth();
  G.polyTube(ctx, [T1, L(T1, F, 0.9), F, L(F, T2, 0.1), T2], 0.0055, 8, [0, 1, 0], paint);
  ctx.flat();
  bx(ctx, x - sx * (sp + 0.03), x + sx * 0.03, yTop - 0.005, yTop - 0.001, z - sz * (sp + 0.03), z + sz * 0.03, paint, "t");
}

// Pedestal: base + column + spreader. Round tables: discs; rect tables: chamfered blocks, two
// columns past 1.5 m of width (a trestle read).
export function pedestal(ctx, paint, w, d, yTop, round) {
  const bh = 0.04;
  if (round) {
    const R = Math.min(w, d) / 2;
    ctx.smooth();
    disc(ctx, 0, 0, bh, 0, R * 0.62, 0.012, 16, paint);
    G.loftFrames(
      ctx,
      [
        { c: [0, bh - 0.01, 0], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(0.13, 0.13, 0, 0, 12, 1) },
        { c: [0, yTop - 0.03, 0], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(0.1, 0.1, 0, 0, 12, 1) },
      ],
      paint,
      { capStart: false, capEnd: false }
    );
    disc(ctx, 0, yTop - 0.03, yTop - 0.001, 0, R * 0.42, 0.006, 12, paint);
    ctx.flat();
    return;
  }
  const n = w >= 1.5 ? 2 : 1;
  const bw = (w / n) * 0.5, bd = d * 0.62;
  for (let i = 0; i < n; i++) {
    const cx = n === 1 ? 0 : (i === 0 ? -1 : 1) * w * 0.28;
    slab(ctx, cx - bw / 2, cx + bw / 2, 0, bh, -bd / 2, bd / 2, paint, 0.01);
    post(ctx, cx, 0, bh - 0.01, yTop - 0.03, 0.12, 0.12, 0.12, 0.12, 0.008, paint, { start: false, end: false });
    slab(ctx, cx - bw * 0.42, cx + bw * 0.42, yTop - 0.03, yTop - 0.001, -bd * 0.4, bd * 0.4, paint, 0.006);
  }
}

// ── parts ──────────────────────────────────────────────────────────────────
// Rect top on legs, optional lower shelf (coffee / side / console / dining / desk share this).
export function rectTable(ctx, C, s, t, shelfY, inset) {
  // finish group: top (+ shelf)
  slab(ctx, -s.w / 2, s.w / 2, s.h - t, s.h, -s.d / 2, s.d / 2, C.top);
  const xs = s.w / 2 - inset - LEG / 2, zs = s.d / 2 - inset - LEG / 2;
  if (s.shelf && shelfY > 0 && s.leg !== "pedestal") {
    const sy = Math.min(shelfY, s.h - t - 0.1);
    slab(ctx, -xs + LEG / 2 + 0.005, xs - LEG / 2 - 0.005, sy, sy + 0.02, -zs + LEG / 2 + 0.005, zs - LEG / 2 - 0.005, C.top, 0.005);
  }
  // finish2 group: legs + apron
  legs(ctx, C, s, s.h - t, { inset: inset, apron: s.h - t > 0.25 });
}

export function coffee(ctx, C, s) {
  rectTable(ctx, C, s, 0.03, 0.12, 0.06);
}
export function side(ctx, C, s) {
  rectTable(ctx, C, s, 0.025, 0.15, 0.05);
}
export function console_(ctx, C, s) {
  rectTable(ctx, C, s, 0.03, 0.15, 0.06);
}
export function dining(ctx, C, s, p) {
  rectTable(ctx, C, s, 0.04, 0, 0.08);
  if (p.canary) canary(ctx, C, s);
}

// K1 canary (09b §6 step 1): after the textured groups — a glow chip (emissive on), an oak block
// (emissive must be OFF again), then one glass coaster LAST (albedo(null) ends the veneer run;
// alpha 0.35 rides the transparent pass).
export function canary(ctx, C, s) {
  const y = s.h;
  const bulb = M.glow(ctx, 1.0, 0.92, 0.78, 1.0);
  bx(ctx, -0.32, -0.2, y, y + 0.06, 0.12, 0.24, bulb, "b");
  bx(ctx, -0.12, 0.08, y, y + 0.09, 0.1, 0.26, C.top, "b");
  disc(ctx, 0.3, y + 0.001, y + 0.009, 0.18, 0.06, 0.002, 16, C.glass);
}

export function round(ctx, C, s) {
  const R = s.w / 2, t = 0.04;
  ctx.smooth();
  disc(ctx, 0, s.h - t, s.h, 0, R, 0.008, 24, C.top);
  ctx.flat();
  pedestal(ctx, C.top, s.w, s.d, s.h - t, true);
}

// Card table: finish2 frame + legs, felt (finish) inlay 4 mm proud, four cup rings on the felt.
export function card(ctx, C, s) {
  const t = 0.04, rim = 0.06;
  // finish group: the felt inlay (top + 4 sides; its underside is buried in the frame slab)
  bx(ctx, -s.w / 2 + rim, s.w / 2 - rim, s.h - 0.02, s.h + 0.004, -s.d / 2 + rim, s.d / 2 - rim, C.top, "b");
  // finish2 group: frame slab, legs, cup rings
  slab(ctx, -s.w / 2, s.w / 2, s.h - t, s.h, -s.d / 2, s.d / 2, C.legs);
  legs(ctx, C, s, s.h - t, { inset: 0.07, apron: true, pedestalPaint: C.legs });
  const cx = s.w / 2 - rim - 0.09, cz = s.d / 2 - rim - 0.09;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ring(ctx, sx * cx, sz * cz, s.h + 0.004, s.h + 0.018, 0.048, 0.038, 12, C.legs);
}

// Desk: top on legs, one drawer box under the right-hand end, bar handle in finish2.
export function desk(ctx, C, s) {
  const t = 0.03, inset = 0.06;
  slab(ctx, -s.w / 2, s.w / 2, s.h - t, s.h, -s.d / 2, s.d / 2, C.top);
  const dw = Math.min(0.45, s.w * 0.36), dh = 0.12;
  const x1 = s.w / 2 - inset - 0.02, x0 = x1 - dw;
  const yb = s.h - t - 0.003;
  bx(ctx, x0, x1, yb - dh, yb, -s.d / 2 + 0.04, s.d / 2 - 0.03, C.top, "t");
  legs(ctx, C, s, s.h - t, { inset: inset, apron: true });
  // handle
  const hz = s.d / 2 - 0.03;
  bx(ctx, (x0 + x1) / 2 - 0.07, (x0 + x1) / 2 + 0.07, yb - dh / 2 - 0.006, yb - dh / 2 + 0.006, hz, hz + 0.02, C.legs, "k");
}

// Dressing table: desk with two drawers + a framed mirror standing at the back. dims h = mirror top.
export function dressing(ctx, C, s) {
  const t = 0.03, inset = 0.06;
  const yb = s.h - t - 0.003, dh = 0.13;
  // finish group: top, two drawer fronts
  slab(ctx, -s.w / 2, s.w / 2, s.h - t, s.h, -s.d / 2, s.d / 2, C.top);
  const gx = 0.006, x0 = -s.w / 2 + inset + 0.02, x1 = s.w / 2 - inset - 0.02, xm = (x0 + x1) / 2;
  bx(ctx, x0, xm - gx, yb - dh, yb, -s.d / 2 + 0.04, s.d / 2 - 0.03, C.top, "t");
  bx(ctx, xm + gx, x1, yb - dh, yb, -s.d / 2 + 0.04, s.d / 2 - 0.03, C.top, "t");
  // finish2 group: legs, handles, mirror frame
  legs(ctx, C, s, s.h - t, { inset: inset, apron: false });
  const hz = s.d / 2 - 0.03, hy = yb - dh / 2;
  for (const cx of [(x0 + xm) / 2, (xm + x1) / 2]) bx(ctx, cx - 0.06, cx + 0.06, hy - 0.006, hy + 0.006, hz, hz + 0.02, C.legs, "k");
  const mw = Math.min(0.6, s.w * 0.6), bar = 0.035, th = 0.025;
  const z0 = -s.d / 2 + 0.05, z1 = z0 + th;
  const yTop = s.mirrorH, yBot = s.h + 0.06;
  bx(ctx, -mw / 2, -mw / 2 + bar, s.h, yTop, z0, z1, C.legs, "b");
  bx(ctx, mw / 2 - bar, mw / 2, s.h, yTop, z0, z1, C.legs, "b");
  bx(ctx, -mw / 2 + bar, mw / 2 - bar, yTop - bar, yTop, z0, z1, C.legs);
  bx(ctx, -mw / 2 + bar, mw / 2 - bar, yBot, yBot + bar, z0, z1, C.legs);
  // fixed: the mirror face, 8 mm behind the frame's front
  bx(ctx, -mw / 2 + bar, mw / 2 - bar, yBot + bar, yTop - bar, z0 + 0.008, z1 - 0.008, C.mirror, "k");
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "dining";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    top: M.finish(ctx, p.finish, D.finish),
    legs: M.finish(ctx, p.finish2, D.finish2),
    steel: M.finish(ctx, "steel", "steel"),
    mirror: M.mirror(ctx),
    glass: M.glass(ctx),
  };
  if (part === "coffee") coffee(ctx, C, s);
  else if (part === "side") side(ctx, C, s);
  else if (part === "console") console_(ctx, C, s);
  else if (part === "round") round(ctx, C, s);
  else if (part === "card") card(ctx, C, s);
  else if (part === "desk") desk(ctx, C, s);
  else if (part === "dressing") dressing(ctx, C, s);
  else dining(ctx, C, s, p);
}

export { PARTS, DEF, LEGS, size, dims, manifest };
