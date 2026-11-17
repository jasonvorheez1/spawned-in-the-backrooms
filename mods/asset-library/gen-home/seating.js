// SEATING — HYLLA's soft-seating family, ONE generator (09b §3.1). Every sofa the store sells,
// the corner, the loveseat, the armchair, the chaise, the ottoman.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/seating.js",
//                params: { part: "sofa", seats: 3, cushions: 2, lowback: false,
//                          finish: "linen-grey", finish2: "oak" } }
//
// FRAME (09b §1 `floor` mount): origin ON THE GROUND at the footprint centre, +Y up, front on +Z,
//        body x ±w/2 · z ±d/2 · y 0→h. `dims` = TOTAL extent (the corner's return counts).
// SCALE: real furniture — seat 0.45, back 0.85 (lowback 0.72), arm 0.62, feet 0.12, deck 0.33.
//
//   part: "sofa"      seats 2|3|4 → w 1.70|2.35|3.00 × 0.90 × 0.85     part: "armchair"  0.85×0.90×0.85, one seat
//   part: "corner"    3-seat 2.35 + 1.60 return on the -X end (L opens +X)   part: "chaise"    0.80×1.65×0.85, head back at -Z, arm on -X
//   part: "loveseat"  1.45×0.90×0.85, two seats                          part: "ottoman"   0.60×0.60×0.42 padded cube
//
// PARAMS: seats 2|3|4 (sofa) · cushions 1|2 (2 = loose back cushions on a slab back; 1 = tight
//   two-pad back, no loose cushions) · lowback bool (back 0.72) · finish (upholstery; default
//   linen-grey) · finish2 (feet; default oak).
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — every upholstered face (`finish`) first, then the feet (`finish2`).
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("builtin/geom");
const M = require("lib/home-mat.js");

const PARTS = ["sofa", "corner", "loveseat", "armchair", "chaise", "ottoman"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  sofa: { seats: 3, cushions: 2, lowback: false, finish: "linen-grey", finish2: "oak" },
  corner: { cushions: 2, lowback: false, finish: "linen-grey", finish2: "oak" },
  loveseat: { cushions: 2, lowback: false, finish: "linen-oat", finish2: "oak" },
  armchair: { cushions: 2, lowback: false, finish: "linen-blue", finish2: "oak" },
  chaise: { cushions: 2, lowback: false, finish: "leather-tan", finish2: "black" },
  ottoman: { finish: "linen-grey", finish2: "oak" },
};

// The family's fixed heights (m).
const FEET = 0.12; // foot height — every upholstered box starts here
const DECK = 0.33; // seat deck (cushion underside)
const SEAT = 0.45; // seat cushion top
const ARM_H = 0.62; // arm top
const BACK_H = 0.85; // back top
const LOW_H = 0.72; // lowback top
const BACK_T = 0.2; // slab back thickness (loose-cushion sofas)
const TIGHT_T = 0.24; // tight (padded) back thickness
const CUSH_T = 0.15; // loose back cushion thickness
const LEAN = 8; // back cushion lean, degrees
const GAP = 0.012; // between cushions
const SEAT_W = 0.65; // one seat's width
const ARM_W = 0.2; // sofa arm width (armchair 0.15)

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}

// Resolved size params for a part (what geometry() builds and what manifest() reports).
function size(part, p) {
  const D = DEF[part] || DEF.sofa;
  p = p || {};
  const lowback = p.lowback === undefined ? !!D.lowback : !!p.lowback;
  const cushions = part === "ottoman" ? 0 : Math.round(num(p.cushions, D.cushions)) <= 1 ? 1 : 2;
  const backH = lowback ? LOW_H : BACK_H;
  const s = { cushions, lowback, backH, armW: ARM_W, seats: 1 };
  if (part === "sofa") {
    s.seats = clamp(Math.round(num(p.seats, D.seats)), 2, 4);
    s.w = s.seats * SEAT_W + 2 * ARM_W;
    s.d = 0.9;
    s.h = backH;
  } else if (part === "corner") {
    s.seats = 3;
    s.w = 3 * SEAT_W + 2 * ARM_W;
    s.d = 1.6;
    s.h = backH;
  } else if (part === "loveseat") {
    s.seats = 2;
    s.w = 1.45;
    s.d = 0.9;
    s.h = backH;
  } else if (part === "armchair") {
    s.seats = 1;
    s.w = 0.85;
    s.d = 0.9;
    s.h = backH;
    s.armW = 0.15;
  } else if (part === "chaise") {
    s.w = 0.8;
    s.d = 1.65;
    s.h = backH;
    s.armW = 0.15;
  } else {
    s.w = 0.6;
    s.d = 0.6;
    s.h = 0.42;
  }
  return s;
}

// [w, d, hTotal] in the floor frame — the catalog's `dims`.
function dims(part, p) {
  const s = size(part, p);
  return [s.w, s.d, s.h];
}

// Functional top a `top` row could sit at: the ottoman is a tray host; seats are not surfaces.
function surface(part) {
  return part === "ottoman" ? 0.42 : 0;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) parts[k] = { dims: dims(k, {}), surface: surface(k), defaults: DEF[k] };
  return { family: "seating", script: "scripts/asset-library/gen-home/seating.js", parts };
}

// ── emitters (townscape.js / tables.js pattern) ─────────────────────────────
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

// Upholstered block — a chamfered box. Frames (base, back slab, arms) take 0.015–0.02; anything a
// body sinks into takes 0.03–0.04 so the edge reads stuffed, not milled.
export function pad(ctx, x0, x1, y0, y1, z0, z1, bevel, paint) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel, paint);
}

// Chamfered prism from centre A to centre B — a boxZ along any axis. Cross-section `w` along the
// frame's u axis and `t` along v: for near-vertical runs (up [0,0,-1]) u = +x, v = -z, so w is the
// x-width and t the z-thickness; that is every leaning back cushion here.
export function prism(ctx, A, B, w, t, bevel, paint, up) {
  const f = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const L = Math.hypot(f[0], f[1], f[2]);
  if (!(L > 0)) return;
  const e = Math.min(bevel, L * 0.3, w * 0.3, t * 0.3);
  const u = up || (Math.abs(f[1]) > Math.abs(f[0]) + Math.abs(f[2]) ? [0, 0, -1] : [0, 1, 0]);
  const P = (k) => [A[0] + (f[0] * k) / L, A[1] + (f[1] * k) / L, A[2] + (f[2] * k) / L];
  const inner = G.rrect(w - 2 * e, t - 2 * e, 0, 0, bevel);
  const full = G.rrect(w, t, 0, 0, bevel);
  G.loftFrames(
    ctx,
    [
      { c: P(0), f: f, up: u, poly: inner },
      { c: P(e), f: f, up: u, poly: full },
      { c: P(L - e), f: f, up: u, poly: full },
      { c: P(L), f: f, up: u, poly: inner },
    ],
    paint
  );
}

// Round tapered leg from foot A to head B, radii r0 → r1; smooth-shaded, open at the head (buried).
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

// ── the upholstery vocabulary ───────────────────────────────────────────────
// Back slab (loose cushions lean on it) or a tight two-pad back (no loose cushions).
export function backPanel(ctx, paint, x0, x1, z0, z1, yTop, tight) {
  if (tight) {
    const ym = SEAT + (yTop - SEAT) * 0.5;
    pad(ctx, x0, x1, FEET, ym - 0.006, z0, z1, 0.03, paint);
    pad(ctx, x0, x1, ym + 0.006, yTop, z0, z1, 0.03, paint);
  } else {
    pad(ctx, x0, x1, FEET, yTop, z0, z1, 0.02, paint);
  }
}

// Loose back cushion leaning LEAN° against a back whose front plane is at zFront, resting on the
// seat cushion; x-centred on cx, width w, from SEAT up to yTop.
export function backCushionZ(ctx, paint, cx, w, zFront, yTop) {
  const h = yTop - SEAT;
  const lean = h * Math.tan((LEAN * Math.PI) / 180);
  const A = [cx, SEAT, zFront + CUSH_T / 2 + 0.004];
  const B = [cx, yTop, A[2] - lean];
  prism(ctx, A, B, w, CUSH_T, 0.035, paint, [0, 0, -1]);
}

// The same cushion against a back that faces +X (the corner's return): front plane at xFront,
// z-centred on cz, length len along z.
export function backCushionX(ctx, paint, cz, len, xFront, yTop) {
  const h = yTop - SEAT;
  const lean = h * Math.tan((LEAN * Math.PI) / 180);
  const A = [xFront + CUSH_T / 2 + 0.004, SEAT, cz];
  const B = [A[0] - lean, yTop, cz];
  prism(ctx, A, B, CUSH_T, len, 0.035, paint, [0, 0, -1]);
}

// Seat cushion on the deck, 8 mm shy of the back, 1 cm proud of the front.
export function seatCushion(ctx, paint, x0, x1, zBack, zFront) {
  pad(ctx, x0 + 0.004, x1 - 0.004, DECK, SEAT, zBack + 0.008, zFront + 0.01, 0.035, paint);
}

// Round tapered feet (finish2 group), splayed 2 cm outward at the floor, heads buried in the base.
export function feet(ctx, paint, pts) {
  for (const P of pts) {
    const sx = P[0] < 0 ? -1 : 1, sz = P[2] < 0 ? -1 : 1;
    roundLeg(ctx, [P[0] + sx * 0.02, 0, P[2] + sz * 0.02], [P[0], FEET + 0.01, P[2]], 0.02, 0.03, 10, paint);
  }
}

// ── parts ──────────────────────────────────────────────────────────────────
// Straight sofa body: arms full depth, back slab between the arms, base between the arms, one seat
// cushion per seat (+ one loose back cushion per seat unless tight). sofa / loveseat / armchair.
export function sofaBody(ctx, C, s) {
  const w = s.w, d = s.d, tight = s.cushions === 1;
  const z0 = -d / 2, z1 = d / 2;
  const backT = tight ? TIGHT_T : BACK_T;
  const zb = z0 + backT; // back front plane
  const xi0 = -w / 2 + s.armW, xi1 = w / 2 - s.armW; // inner span between the arms
  // ── finish group: upholstery ──
  pad(ctx, xi0, xi1, FEET + 0.005, DECK, zb, z1 - 0.01, 0.015, C.up); // base
  backPanel(ctx, C.up, xi0, xi1, z0, zb, s.backH, tight);
  pad(ctx, -w / 2, xi0, FEET, ARM_H, z0, z1, 0.03, C.up); // arms, full depth
  pad(ctx, xi1, w / 2, FEET, ARM_H, z0, z1, 0.03, C.up);
  const inner = xi1 - xi0, cw = (inner - (s.seats - 1) * GAP) / s.seats;
  for (let i = 0; i < s.seats; i++) {
    const x0 = xi0 + i * (cw + GAP), x1 = x0 + cw;
    seatCushion(ctx, C.up, x0, x1, zb, z1);
    if (!tight) backCushionZ(ctx, C.up, (x0 + x1) / 2, cw - 0.02, zb, s.backH - 0.03);
  }
  // ── finish2 group: feet (a third pair under the middle past 2.8 m) ──
  const fx = w / 2 - 0.09, fz = d / 2 - 0.09;
  const pts = [[-fx, 0, -fz], [fx, 0, -fz], [-fx, 0, fz], [fx, 0, fz]];
  if (w >= 2.8) pts.push([0, 0, -fz], [0, 0, fz]);
  feet(ctx, C.legs, pts);
}

// Corner: the 3-seat body along x plus a 0.90-wide return down the -X end to z +d/2. The L opens
// toward +X. Backs run along the main body's -Z face and the return's -X face; arms close the
// two free ends.
export function corner(ctx, C, s) {
  const w = s.w, d = s.d, tight = s.cushions === 1;
  const RW = 0.9; // return width (x)
  const z0 = -d / 2, z1 = d / 2;
  const zf = z0 + 0.9; // main body front plane
  const backT = tight ? TIGHT_T : BACK_T;
  const zb = z0 + backT; // main back front plane
  const xb = -w / 2 + backT; // return back front plane (faces +X)
  const xr = -w / 2 + RW; // return's inner edge (x)
  const xi1 = w / 2 - ARM_W; // right arm inner face
  const ze = z1 - ARM_W; // end arm back face
  // ── finish group ──
  pad(ctx, xb, xi1, FEET + 0.005, DECK, zb, zf - 0.01, 0.015, C.up); // main base
  pad(ctx, xb, xr - 0.01, FEET + 0.005, DECK, zf - 0.01, ze, 0.015, C.up); // return base
  backPanel(ctx, C.up, -w / 2, xi1, z0, zb, s.backH, tight); // main back (to the outer corner)
  backPanel(ctx, C.up, -w / 2, xb, zb, ze, s.backH, tight); // return back
  pad(ctx, xi1, w / 2, FEET, ARM_H, z0, zf, 0.03, C.up); // right arm
  pad(ctx, xb, xr, FEET, ARM_H, ze, z1, 0.03, C.up); // end arm on the return
  // seats: the corner cushion spans the return's width; two more fill the main body
  seatCushion(ctx, C.up, xb, xr, zb, zf);
  const rest = xi1 - xr - GAP, cw = (rest - GAP) / 2;
  for (let i = 0; i < 2; i++) {
    const x0 = xr + GAP + i * (cw + GAP);
    seatCushion(ctx, C.up, x0, x0 + cw, zb, zf);
  }
  // return seat: from the main front to the end arm
  pad(ctx, xb + 0.004, xr - 0.004 + 0.01, DECK, SEAT, zf + 0.01 + GAP, ze - 0.008, 0.035, C.up);
  if (!tight) {
    const yTop = s.backH - 0.03;
    backCushionZ(ctx, C.up, (xb + xr) / 2, xr - xb - 0.02, zb, yTop);
    for (let i = 0; i < 2; i++) {
      const x0 = xr + GAP + i * (cw + GAP);
      backCushionZ(ctx, C.up, x0 + cw / 2, cw - 0.02, zb, yTop);
    }
    // return side: one beside the corner's main cushion, one for the return seat
    const za = zb + CUSH_T + 0.012, zc = zf + 0.005;
    backCushionX(ctx, C.up, (za + zc) / 2, zc - za - 0.02, xb, yTop);
    const zd = zf + 0.01 + GAP + 0.01, zg = ze - 0.012;
    backCushionX(ctx, C.up, (zd + zg) / 2, zg - zd - 0.02, xb, yTop);
  }
  // ── finish2 group: six feet ──
  const fx = w / 2 - 0.09, fz0 = z0 + 0.09, fz1 = zf - 0.09, fz2 = z1 - 0.09;
  feet(ctx, C.legs, [[-fx, 0, fz0], [fx, 0, fz0], [xr - 0.09, 0, fz1], [fx, 0, fz1], [-fx, 0, fz2], [xr - 0.09, 0, fz2]]);
}

// Chaise: a méridienne — padded head back leaning at the -Z end, one full-length arm down the -X
// side, a long seat cushion, a loose back cushion at the head.
export function chaise(ctx, C, s) {
  const w = s.w, d = s.d, tight = s.cushions === 1;
  const z0 = -d / 2, z1 = d / 2;
  const headT = 0.2, headLean = 0.1;
  const xa = -w / 2 + s.armW; // arm inner face
  // ── finish group ──
  // head back: leaning pad, back face at z0 at the top, 0.10 forward at the foot
  prism(ctx, [0, FEET, z0 + headLean + headT / 2], [0, s.backH, z0 + headT / 2], w, headT, 0.035, C.up, [0, 0, -1]);
  pad(ctx, -w / 2, w / 2, FEET + 0.005, DECK, z0 + headT, z1 - 0.01, 0.015, C.up); // base, full width
  pad(ctx, -w / 2, xa, DECK, ARM_H, z0 + headT + headLean * 0.7, z1, 0.03, C.up); // arm on the deck
  const zc = z0 + headT + headLean * ((DECK - FEET) / (s.backH - FEET)) + 0.02; // where the head meets the deck
  pad(ctx, xa + 0.006, w / 2 + 0.006, DECK, SEAT, zc + 0.004, z1 + 0.01, 0.035, C.up); // seat cushion
  if (!tight) {
    // head cushion leans on the head back, follows its slope
    const yTop = s.backH - 0.04, h = yTop - SEAT;
    const zf = z0 + headT + headLean * ((SEAT - FEET) / (s.backH - FEET));
    const A = [(xa + w / 2) / 2 + 0.003, SEAT, zf + CUSH_T / 2 + 0.004];
    const B = [A[0], yTop, A[2] - h * Math.tan(((LEAN + 6) * Math.PI) / 180)];
    prism(ctx, A, B, w / 2 - xa - 0.03, CUSH_T, 0.035, C.up, [0, 0, -1]);
  }
  // ── finish2 group ──
  const fx = w / 2 - 0.08, fz = d / 2 - 0.09;
  feet(ctx, C.legs, [[-fx, 0, -fz], [fx, 0, -fz], [-fx, 0, fz], [fx, 0, fz]]);
}

// Ottoman: a padded cube — base block, stuffed top 1 cm proud, four feet.
export function ottoman(ctx, C, s) {
  const w = s.w, d = s.d;
  const top = s.h - 0.12;
  pad(ctx, -w / 2 + 0.01, w / 2 - 0.01, FEET, top, -d / 2 + 0.01, d / 2 - 0.01, 0.015, C.up);
  pad(ctx, -w / 2, w / 2, top, s.h, -d / 2, d / 2, 0.04, C.up);
  const fx = w / 2 - 0.07, fz = d / 2 - 0.07;
  feet(ctx, C.legs, [[-fx, 0, -fz], [fx, 0, -fz], [-fx, 0, fz], [fx, 0, fz]]);
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "sofa";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    up: M.finish(ctx, p.finish, D.finish),
    legs: M.finish(ctx, p.finish2, D.finish2),
  };
  if (part === "corner") corner(ctx, C, s);
  else if (part === "chaise") chaise(ctx, C, s);
  else if (part === "ottoman") ottoman(ctx, C, s);
  else sofaBody(ctx, C, s);
}

export { PARTS, DEF, size, dims, surface, manifest };
