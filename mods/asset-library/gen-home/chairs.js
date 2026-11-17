// CHAIRS — HYLLA's hard-seating family, ONE generator (09b §3.2). Dining chair, stool, bar stool,
// office chair, bench, rocking chair, kids' chair, highchair.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/chairs.js",
//                params: { part: "dining", back: "panel", finish: "oak", finish2: "black" } }
//
// FRAME (09b §1 `floor` mount): origin ON THE GROUND at the footprint centre, +Y up, front on +Z
//        (the sitter faces +Z, the back is at -Z), body x ±w/2 · z ±d/2 · y 0→h. `dims` = TOTAL
//        extent (rockers, tray, castors counted).
// SCALE: real furniture — dining seat 0.45 / back 0.90, bar seat 0.75|0.65, office seat 0.52.
//
//   part: "dining"    0.45×0.50×0.90, seat 0.45, back slat|panel|round   part: "bench"     w 1.20|1.50|1.80 × 0.35 × 0.45
//   part: "stool"     ⌀0.35 × 0.45, three splayed legs                     part: "rocking"   0.62×0.95×0.95, slat back, arms, rockers
//   part: "barstool"  ⌀0.38 × seat 0.75|0.65, four legs + footring         part: "kids"      0.32×0.36×0.56, seat 0.30
//   part: "office"    5-star ⌀0.65, seat 0.48–0.56 (0.52), castors, arms   part: "highchair" 0.48×0.55×0.85, seat 0.55, tray 0.75
//
// PARAMS: back "slat"|"panel"|"round" (dining, kids) · seat (barstool 0.60–0.85; office 0.48–0.56) ·
//   arms bool (office) · w (bench 1.00–2.20) · finish (seat / back infill / tray; default oak) ·
//   finish2 (frame / legs; default black). The office gas lift is fixed chrome.
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — every `finish` face (seat, slats, panel, spindles, tray), then
//   every `finish2` face (legs, rails, hoop, base), then fixed chrome LAST.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("builtin/geom");
const M = require("lib/home-mat.js");

const PARTS = ["dining", "stool", "barstool", "office", "bench", "rocking", "kids", "highchair"];
const BACKS = ["slat", "panel", "round"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  dining: { back: "panel", finish: "oak", finish2: "black" },
  stool: { finish: "oak", finish2: "black" },
  barstool: { seat: 0.75, finish: "black", finish2: "chrome" },
  office: { seat: 0.52, arms: true, finish: "leather-black", finish2: "black" },
  bench: { w: 1.5, finish: "oak", finish2: "black" },
  rocking: { finish: "oak", finish2: "black" },
  kids: { back: "panel", finish: "sage", finish2: "birch" },
  highchair: { finish: "oak", finish2: "white" },
};

const D2R = Math.PI / 180;

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
  const D = DEF[part] || DEF.dining;
  p = p || {};
  const s = {};
  if (part === "dining") {
    s.w = 0.45;
    s.d = 0.5;
    s.seat = 0.45;
    s.h = 0.9;
    s.back = pick(p.back, BACKS, D.back);
  } else if (part === "stool") {
    s.w = 0.35;
    s.d = 0.35;
    s.seat = 0.45;
    s.h = 0.45;
  } else if (part === "barstool") {
    s.seat = clamp(num(p.seat, D.seat), 0.6, 0.85);
    s.w = 0.38;
    s.d = 0.38;
    s.h = s.seat;
  } else if (part === "office") {
    s.seat = clamp(num(p.seat, D.seat), 0.48, 0.56);
    s.w = 0.65;
    s.d = 0.65;
    s.h = s.seat + 0.5;
    s.arms = p.arms === undefined ? !!D.arms : !!p.arms;
  } else if (part === "bench") {
    s.w = clamp(num(p.w, D.w), 1.0, 2.2);
    s.d = 0.35;
    s.seat = 0.45;
    s.h = 0.45;
  } else if (part === "rocking") {
    s.w = 0.62;
    s.d = 0.95;
    s.seat = 0.42;
    s.h = 0.95;
  } else if (part === "kids") {
    s.w = 0.32;
    s.d = 0.36;
    s.seat = 0.3;
    s.h = 0.56;
    s.back = pick(p.back, BACKS, D.back);
  } else {
    s.w = 0.48;
    s.d = 0.55;
    s.seat = 0.55;
    s.h = 0.85;
  }
  return s;
}

// [w, d, hTotal] in the floor frame — the catalog's `dims`.
function dims(part, p) {
  const s = size(part, p);
  return [s.w, s.d, s.h];
}

// Functional top a `top` row could sit at: the bench hosts cushions; seats with backs are not surfaces.
function surface(part) {
  return part === "bench" ? 0.45 : 0;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) parts[k] = { dims: dims(k, {}), surface: surface(k), defaults: DEF[k] };
  return { family: "chairs", script: "scripts/asset-library/gen-home/chairs.js", parts, backs: BACKS };
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

// Chamfered slab — seats, trays, panels. 0.008 is the furniture bevel.
export function slab(ctx, x0, x1, y0, y1, z0, z1, paint, bevel) {
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.008, paint);
}

// Frame basis for a run from A to B: near-vertical runs take up [0,0,-1] (u = +x, v = -z), anything
// else up [0,1,0] (u = lateral, v = +y). `w` is the section's u size, `t` its v size.
export function upFor(f) {
  return Math.abs(f[1]) > Math.abs(f[0]) + Math.abs(f[2]) ? [0, 0, -1] : [0, 1, 0];
}

// Chamfered bar from centre A to centre B, section tapering (w0,t0) → (w1,t1); both ends capped.
// Legs, rails, stretchers, star arms — every stick in the family.
export function bar(ctx, A, B, w0, t0, w1, t1, bevel, paint, up) {
  const f = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const u = up || upFor(f);
  G.loftFrames(
    ctx,
    [
      { c: A, f: f, up: u, poly: G.rrect(w0, t0, 0, 0, bevel) },
      { c: B, f: f, up: u, poly: G.rrect(w1, t1, 0, 0, bevel) },
    ],
    paint
  );
}

// Chamfered prism from centre A to centre B with chamfered ends — a boxZ along any axis (panels,
// pads, seats that lean with their posts).
export function prism(ctx, A, B, w, t, bevel, paint, up) {
  const f = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const L = Math.hypot(f[0], f[1], f[2]);
  if (!(L > 0)) return;
  const e = Math.min(bevel, L * 0.3, w * 0.3, t * 0.3);
  const u = up || upFor(f);
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

// Round tapered leg from foot A to head B, radii r0 → r1; smooth-shaded, head open (buried).
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

// Round rod with both ends capped (spindles, stems).
export function rod(ctx, A, B, r, sides, paint) {
  ctx.smooth();
  G.tube(ctx, A, B, r, r, sides, [0, 0, -1], paint);
  ctx.flat();
}

// Chamfered disc (round seats), smooth-shaded.
export function disc(ctx, cx, y0, y1, cz, r, bevel, sides, paint) {
  const e = Math.min(bevel, (y1 - y0) * 0.3, r * 0.3);
  const F = (y, rr) => ({ c: [cx, y, cz], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(rr * 2, rr * 2, 0, 0, sides, 1) });
  ctx.smooth();
  G.loftFrames(ctx, [F(y0, r - e), F(y0 + e, r), F(y1 - e, r), F(y1, r - e)], paint);
  ctx.flat();
}

// Closed square-section ring around the y axis (the bar stool's footring).
export function band(ctx, cy, r, sec, sides, paint) {
  const rOut = r + sec / 2, rIn = r - sec / 2, y0 = cy - sec / 2, y1 = cy + sec / 2;
  const P = (rr, a, y) => [Math.cos(a) * rr, y, -Math.sin(a) * rr];
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    qd(ctx, paint, P(rOut, a0, y0), P(rOut, a1, y0), P(rOut, a1, y1), P(rOut, a0, y1)); // outer
    qd(ctx, paint, P(rOut, a0, y1), P(rOut, a1, y1), P(rIn, a1, y1), P(rIn, a0, y1)); // top
    qd(ctx, paint, P(rIn, a1, y0), P(rIn, a0, y0), P(rIn, a0, y1), P(rIn, a1, y1)); // inner
    qd(ctx, paint, P(rIn, a0, y0), P(rIn, a1, y0), P(rOut, a1, y0), P(rOut, a0, y0)); // bottom
  }
}

// Rocker: a w×h strip following [y, z] samples at fixed x; axis-aligned sections (the arc is shallow).
export function rocker(ctx, x, pts, w, h, paint) {
  const xa = x - w / 2, xb = x + w / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const y0 = pts[i][0], z0 = pts[i][1], y1 = pts[i + 1][0], z1 = pts[i + 1][1];
    qd(ctx, paint, [xa, y0, z0], [xb, y0, z0], [xb, y1, z1], [xa, y1, z1]); // bottom
    qd(ctx, paint, [xa, y1 + h, z1], [xb, y1 + h, z1], [xb, y0 + h, z0], [xa, y0 + h, z0]); // top
    qd(ctx, paint, [xb, y1, z1], [xb, y0, z0], [xb, y0 + h, z0], [xb, y1 + h, z1]); // +x
    qd(ctx, paint, [xa, y0, z0], [xa, y1, z1], [xa, y1 + h, z1], [xa, y0 + h, z0]); // -x
  }
  const s = pts[0], e = pts[pts.length - 1];
  qd(ctx, paint, [xb, s[0], s[1]], [xa, s[0], s[1]], [xa, s[0] + h, s[1]], [xb, s[0] + h, s[1]]); // back cap
  qd(ctx, paint, [xa, e[0], e[1]], [xb, e[0], e[1]], [xb, e[0] + h, e[1]], [xa, e[0] + h, e[1]]); // front cap
}

// ── the chair vocabulary ────────────────────────────────────────────────────
// Four-leg chair with a back — dining and kids. o: { w, d, seat, h, back, leg, seatT }.
// Rear posts are straight sticks leaning back from the floor; the seat's back edge is 5 cm inside
// the post tops so `d` is the true depth. The back infill (finish) is emitted before the frame.
export function chair(ctx, C, o) {
  const w = o.w, d = o.d, L = o.leg, T = o.seatT, seatY = o.seat, backH = o.h;
  const zs0 = -d / 2 + 0.05, zs1 = d / 2; // seat span
  const xl = -w / 2 + L / 2, xr = w / 2 - L / 2; // post centre lines
  const zRearFoot = zs0 + L / 2 + 0.02, zRearTop = -d / 2 + L / 2;
  const zFront = zs1 - L / 2 - 0.02;
  const zAt = (y) => zRearFoot + ((zRearTop - zRearFoot) * y) / backH;
  const round = o.back === "round";
  const yRail = seatY - T - 0.003, railH = Math.min(0.06, seatY * 0.14), railT = 0.018;
  const inner = xr - xl - L; // clear span between the posts
  // ── finish group: seat + back infill ──
  slab(ctx, -w / 2, w / 2, seatY - T, seatY, zs0, zs1, C.seat, 0.008);
  if (o.back === "panel") {
    const y0 = backH - Math.min(0.2, backH * 0.22), y1 = backH - 0.02;
    prism(ctx, [0, y0, zAt(y0)], [0, y1, zAt(y1)], inner + 0.01, 0.018, 0.006, C.seat, [0, 0, -1]);
  } else if (o.back === "slat") {
    const yLow = seatY + 0.08 + 0.015, yTop = backH - 0.04;
    const n = 3, sw = Math.min(0.045, inner / 7), pitch = inner / n;
    for (let i = 0; i < n; i++) {
      const x = xl + L / 2 + pitch * (i + 0.5);
      bar(ctx, [x, yLow - 0.01, zAt(yLow)], [x, yTop + 0.01, zAt(yTop)], sw, 0.012, sw, 0.012, 0.003, C.seat, [0, 0, -1]);
    }
  } else {
    // round back: three spindles from the seat up into the hoop
    for (let i = -1; i <= 1; i++) {
      const x = i * inner * 0.27;
      const yTop = backH - 0.03 - Math.abs(i) * 0.06;
      rod(ctx, [x, seatY - 0.005, zAt(seatY) - 0.0], [x, yTop, zAt(yTop) - 0.01], 0.008, 6, C.seat);
    }
  }
  // ── finish2 group: legs, rails, posts, back rails / hoop ──
  const foot = L * 0.8;
  for (const x of [xl, xr]) bar(ctx, [x, 0, zFront], [x, seatY - T + 0.005, zFront], foot, foot, L, L, 0.004, C.frame, [0, 0, -1]);
  const postTop = round ? seatY - T + 0.005 : backH;
  for (const x of [xl, xr]) bar(ctx, [x, 0, zRearFoot], [x, postTop, zAt(postTop)], foot, foot, L, L, 0.004, C.frame, [0, 0, -1]);
  // aprons 3 mm shy of the seat's underside, overlapping 5 mm into the legs
  bx(ctx, xl + L / 2 - 0.005, xr - L / 2 + 0.005, yRail - railH, yRail, zFront - railT / 2, zFront + railT / 2, C.frame, "t");
  const zr = zAt(yRail - railH / 2);
  bx(ctx, xl + L / 2 - 0.005, xr - L / 2 + 0.005, yRail - railH, yRail, zr - railT / 2, zr + railT / 2, C.frame, "t");
  for (const x of [xl, xr]) bx(ctx, x - railT / 2, x + railT / 2, yRail - railH, yRail, zr + L / 2 - 0.005, zFront - L / 2 + 0.005, C.frame, "t");
  if (o.back === "panel") {
    const y = seatY + 0.1;
    bar(ctx, [xl + L / 2 - 0.005, y, zAt(y)], [xr - L / 2 + 0.005, y, zAt(y)], 0.02, 0.03, 0.02, 0.03, 0.003, C.frame, [0, 1, 0]);
  } else if (o.back === "slat") {
    const yLow = seatY + 0.08, yTop = backH - 0.03;
    bar(ctx, [xl + L / 2 - 0.005, yLow, zAt(yLow)], [xr - L / 2 + 0.005, yLow, zAt(yLow)], 0.02, 0.03, 0.02, 0.03, 0.003, C.frame, [0, 1, 0]);
    bar(ctx, [xl + L / 2 - 0.005, yTop, zAt(yTop)], [xr - L / 2 + 0.005, yTop, zAt(yTop)], 0.02, 0.05, 0.02, 0.05, 0.004, C.frame, [0, 1, 0]);
  } else {
    // bent hoop: up from each rear seat corner, over the top in a half-ellipse
    const yBase = seatY - T + 0.004, yMid = seatY + (backH - seatY) * 0.55;
    const rx = (xr - xl) / 2, ry = backH - 0.014 - yMid;
    const pts = [[xl, yBase, zAt(yBase)], [xl, yMid, zAt(yMid)]];
    const n = 8;
    for (let i = 1; i < n; i++) {
      const a = Math.PI - (i / n) * Math.PI;
      const y = yMid + Math.sin(a) * ry;
      pts.push([Math.cos(a) * rx, y, zAt(y)]);
    }
    pts.push([xr, yMid, zAt(yMid)], [xr, yBase, zAt(yBase)]);
    ctx.smooth();
    G.polyTube(ctx, pts, L / 2, 8, [0, 0, 1], C.frame);
    ctx.flat();
  }
}

export function dining(ctx, C, s) {
  chair(ctx, C, { w: s.w, d: s.d, seat: s.seat, h: s.h, back: s.back, leg: 0.035, seatT: 0.025 });
}

export function kids(ctx, C, s) {
  chair(ctx, C, { w: s.w, d: s.d, seat: s.seat, h: s.h, back: s.back, leg: 0.028, seatT: 0.02 });
}

// Stool: round seat on three splayed round legs.
export function stool(ctx, C, s) {
  const R = s.w / 2, T = 0.035;
  disc(ctx, 0, s.seat - T, s.seat, 0, R, 0.008, 16, C.seat);
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3; // one leg straight back (-z), two forward
    const ux = Math.cos(a), uz = -Math.sin(a);
    roundLeg(ctx, [ux * (R - 0.02), 0, uz * (R - 0.02)], [ux * (R - 0.07), s.seat - T + 0.01, uz * (R - 0.07)], 0.014, 0.019, 10, C.frame);
  }
}

// Bar stool: padded round seat, four splayed legs, a footring at 36 % of the seat height.
export function barstool(ctx, C, s) {
  const R = s.w / 2, T = 0.05, seat = s.seat;
  disc(ctx, 0, seat - T, seat, 0, R, 0.014, 16, C.seat);
  const rTop = R - 0.045, rFoot = R - 0.015, rLeg = 0.011;
  const yRing = seat * 0.36;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const ux = Math.cos(a), uz = -Math.sin(a);
    roundLeg(ctx, [ux * rFoot, 0, uz * rFoot], [ux * rTop, seat - T + 0.01, uz * rTop], rLeg, rLeg, 10, C.frame);
  }
  const rAt = rFoot + ((rTop - rFoot) * yRing) / (seat - T); // leg radius at the ring height
  band(ctx, yRing, rAt - rLeg - 0.004, 0.012, 16, C.frame);
}

// Office chair: 5-star base on castors, chrome gas lift, padded seat and leaning back, loop arms.
export function office(ctx, C, s) {
  const seat = s.seat;
  // ── finish group: seat pad + back pad ──
  slab(ctx, -0.24, 0.24, seat - 0.08, seat, -0.22, 0.26, C.seat, 0.03);
  prism(ctx, [0, seat + 0.1, -0.21], [0, seat + 0.5, -0.27], 0.44, 0.06, 0.025, C.seat, [0, 0, -1]);
  // ── finish2 group: star, castors, hub, plate, stem, arms ──
  const rTip = 0.29;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5; // one arm straight back
    const ux = Math.cos(a), uz = Math.sin(a);
    bar(ctx, [0, 0.07, 0], [ux * rTip, 0.05, uz * rTip], 0.05, 0.045, 0.03, 0.03, 0.004, C.frame, [0, 1, 0]);
    // castor wheel, axle perpendicular to the arm
    const ax = -uz, az = ux, cx = ux * 0.3, cz = uz * 0.3;
    ctx.smooth();
    G.loftFrames(
      ctx,
      [
        { c: [cx - ax * 0.012, 0.03, cz - az * 0.012], f: [ax, 0, az], up: [0, 1, 0], poly: G.oval(0.06, 0.06, 0, 0, 6, 1) },
        { c: [cx + ax * 0.012, 0.03, cz + az * 0.012], f: [ax, 0, az], up: [0, 1, 0], poly: G.oval(0.06, 0.06, 0, 0, 6, 1) },
      ],
      C.frame
    );
    ctx.flat();
  }
  rod(ctx, [0, 0.045, 0], [0, 0.12, 0], 0.055, 10, C.frame); // hub
  bx(ctx, -0.13, 0.13, seat - 0.11, seat - 0.08, -0.25, 0.01, C.frame, "t"); // mechanism plate
  bar(ctx, [0, seat - 0.1, -0.235], [0, seat + 0.14, -0.27], 0.07, 0.025, 0.06, 0.025, 0.004, C.frame, [0, 0, -1]); // back stem
  if (s.arms) {
    for (const sx of [-1, 1]) {
      const x = sx * 0.27;
      ctx.smooth();
      G.polyTube(ctx, [[sx * 0.2, seat - 0.06, 0.02], [x, seat + 0.02, 0.02], [x, seat + 0.215, 0.02]], 0.012, 6, [0, 0, 1], C.frame);
      ctx.flat();
      bx(ctx, x - 0.03, x + 0.03, seat + 0.215, seat + 0.245, -0.1, 0.16, C.frame);
    }
  }
  // ── fixed: chrome gas lift ──
  rod(ctx, [0, 0.11, 0], [0, seat - 0.1, 0], 0.024, 10, C.chrome);
}

// Bench: slab on four tapered legs, aprons, two end stretchers and one long H-stretcher.
export function bench(ctx, C, s) {
  const w = s.w, d = s.d, T = 0.04, L = 0.045, inset = 0.08;
  slab(ctx, -w / 2, w / 2, s.seat - T, s.seat, -d / 2, d / 2, C.seat, 0.008);
  const xs = w / 2 - inset - L / 2, zs = d / 2 - 0.03 - L / 2, yTop = s.seat - T + 0.005;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(ctx, [sx * xs, 0, sz * zs], [sx * xs, yTop, sz * zs], L * 0.75, L * 0.75, L, L, 0.004, C.frame, [0, 0, -1]);
  const ya = s.seat - T - 0.003, ah = 0.06, at = 0.018;
  bx(ctx, -xs + L / 2 - 0.005, xs - L / 2 + 0.005, ya - ah, ya, zs - at / 2, zs + at / 2, C.frame, "t");
  bx(ctx, -xs + L / 2 - 0.005, xs - L / 2 + 0.005, ya - ah, ya, -zs - at / 2, -zs + at / 2, C.frame, "t");
  for (const sx of [-1, 1]) bx(ctx, sx * xs - at / 2, sx * xs + at / 2, ya - ah, ya, -zs + L / 2 - 0.005, zs - L / 2 + 0.005, C.frame, "t");
  const ys = 0.12;
  for (const sx of [-1, 1]) bx(ctx, sx * xs - 0.012, sx * xs + 0.012, ys, ys + 0.03, -zs + L / 2 - 0.005, zs - L / 2 + 0.005, C.frame);
  bx(ctx, -xs + 0.012, xs - 0.012, ys + 0.003, ys + 0.027, -0.012, 0.012, C.frame);
}

// Rocking chair: two arced rockers, seat on four posts, slat back on leaning rear posts, arms.
export function rocking(ctx, C, s) {
  const RK = 1.25, half = s.d / 2, rw = 0.03, rh = 0.04, xr = 0.24;
  const yArc = (z) => RK - Math.sqrt(RK * RK - z * z);
  const seat = s.seat, T = 0.03;
  const zLeg = 0.2, backH = s.h;
  const zRearTop = -0.3;
  const zAt = (y) => -zLeg + ((zRearTop + zLeg) * (y - 0.03)) / (backH - 0.03);
  // ── finish group: seat, slats, arm pads ──
  slab(ctx, -0.25, 0.25, seat - T, seat, -0.22, 0.25, C.seat, 0.008);
  const yLow = seat + 0.1, yTop = backH - 0.045;
  for (let i = 0; i < 5; i++) {
    const x = -0.16 + i * 0.08;
    bar(ctx, [x, yLow, zAt(yLow)], [x, yTop + 0.01, zAt(yTop)], 0.035, 0.012, 0.035, 0.012, 0.003, C.seat, [0, 0, -1]);
  }
  const yArm = 0.66;
  for (const sx of [-1, 1]) bx(ctx, sx * 0.27 - 0.04, sx * 0.27 + 0.04, yArm, yArm + 0.025, zAt(yArm) - 0.02, 0.27, C.seat);
  // ── finish2 group: rockers, posts, rails ──
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const z = -half + (i / 8) * s.d;
    pts.push([yArc(z), z]);
  }
  for (const sx of [-1, 1]) rocker(ctx, sx * xr, pts, rw, rh, C.frame);
  const yFoot = yArc(zLeg) + rh - 0.005;
  for (const sx of [-1, 1]) {
    // front post: rocker → arm
    bar(ctx, [sx * xr, yFoot, zLeg], [sx * xr, yArm + 0.005, zLeg], 0.035, 0.035, 0.03, 0.03, 0.004, C.frame, [0, 0, -1]);
    // rear post: rocker → back top, leaning
    bar(ctx, [sx * xr, yFoot, -zLeg], [sx * xr, backH, zRearTop], 0.035, 0.035, 0.03, 0.03, 0.004, C.frame, [0, 0, -1]);
  }
  const ya = seat - T - 0.003;
  bx(ctx, -xr, xr, ya - 0.06, ya, zLeg - 0.009, zLeg + 0.009, C.frame, "t");
  bx(ctx, -xr, xr, ya - 0.06, ya, zAt(ya - 0.03) - 0.009, zAt(ya - 0.03) + 0.009, C.frame, "t");
  for (const sx of [-1, 1]) bx(ctx, sx * xr - 0.009, sx * xr + 0.009, ya - 0.06, ya, zAt(ya - 0.03), zLeg, C.frame, "t");
  bar(ctx, [-xr, yLow - 0.015, zAt(yLow - 0.015)], [xr, yLow - 0.015, zAt(yLow - 0.015)], 0.02, 0.03, 0.02, 0.03, 0.003, C.frame, [0, 1, 0]);
  bar(ctx, [-xr, backH - 0.025, zAt(backH - 0.025)], [xr, backH - 0.025, zAt(backH - 0.025)], 0.025, 0.05, 0.025, 0.05, 0.004, C.frame, [0, 1, 0]);
}

// Highchair: four splayed round legs (rear pair rising as back posts), seat 0.55, panel back, tray
// at 0.75 on two side arms, footrest, side stretchers.
export function highchair(ctx, C, s) {
  const seat = s.seat, T = 0.02, backH = s.h;
  const xF = 0.22, zF = 0.24, xS = 0.165, zS = 0.165; // feet / seat-level leg centres
  const legAt = (y, sx, front) => {
    const t = y / seat;
    return [sx * (xF + (xS - xF) * t), y, front ? zF + (zS - zF) * t : -(zF + (zS - zF) * t)];
  };
  const back = (y) => legAt(y, 1, false); // +x rear post line, any height
  // ── finish group: seat, tray, back panel, footrest ──
  slab(ctx, -0.18, 0.18, seat - T, seat, -0.17, 0.17, C.seat, 0.008);
  slab(ctx, -0.2, 0.2, 0.73, 0.75, 0.03, 0.31, C.seat, 0.01);
  const yb0 = 0.68, yb1 = backH - 0.015;
  prism(ctx, [0, yb0, back(yb0)[2]], [0, yb1, back(yb1)[2]], back(yb0)[0] * 2 - 0.03, 0.016, 0.005, C.seat, [0, 0, -1]);
  const zFoot = legAt(0.28, 1, true)[2], xFoot = legAt(0.28, 1, true)[0];
  bx(ctx, -xFoot + 0.008, xFoot - 0.008, 0.27, 0.3, zFoot - 0.03, zFoot + 0.03, C.seat);
  // ── finish2 group: legs, posts, tray arms, back rail, stretchers ──
  for (const sx of [-1, 1]) {
    roundLeg(ctx, legAt(0, sx, true), legAt(seat - T + 0.01, sx, true), 0.015, 0.019, 10, C.frame);
    const top = legAt(backH, sx, false);
    ctx.smooth();
    G.loftFrames(
      ctx,
      [
        { c: legAt(0, sx, false), f: [top[0] - legAt(0, sx, false)[0], backH, top[2] - legAt(0, sx, false)[2]], up: [0, 0, -1], poly: G.oval(0.03, 0.03, 0, 0, 10, 1) },
        { c: top, f: [top[0] - legAt(0, sx, false)[0], backH, top[2] - legAt(0, sx, false)[2]], up: [0, 0, -1], poly: G.oval(0.036, 0.036, 0, 0, 10, 1) },
      ],
      C.frame
    );
    ctx.flat();
    // tray arm: rear post → tray underside
    const a = legAt(0.7, sx, false);
    bar(ctx, [a[0], 0.7, a[2] + 0.01], [sx * 0.175, 0.725, 0.29], 0.034, 0.03, 0.034, 0.03, 0.003, C.frame, [0, 1, 0]);
    // side stretcher
    const f2 = legAt(0.2, sx, true), r2 = legAt(0.2, sx, false);
    bar(ctx, [r2[0], 0.2, r2[2] + 0.01], [f2[0], 0.2, f2[2] - 0.01], 0.02, 0.025, 0.02, 0.025, 0.003, C.frame, [0, 1, 0]);
  }
  const yr = 0.61, r0 = legAt(yr, -1, false), r1 = legAt(yr, 1, false);
  bar(ctx, [r0[0] + 0.01, yr, r0[2]], [r1[0] - 0.01, yr, r1[2]], 0.02, 0.03, 0.02, 0.03, 0.003, C.frame, [0, 1, 0]);
  // seat aprons between the legs at seat level
  const ya = seat - T - 0.003, ah = 0.05;
  const fl = legAt(ya - ah / 2, -1, true), fr = legAt(ya - ah / 2, 1, true), rl = legAt(ya - ah / 2, -1, false), rr = legAt(ya - ah / 2, 1, false);
  bar(ctx, [fl[0] + 0.01, ya - ah / 2, fl[2]], [fr[0] - 0.01, ya - ah / 2, fr[2]], 0.016, ah, 0.016, ah, 0.003, C.frame, [0, 1, 0]);
  bar(ctx, [rl[0] + 0.01, ya - ah / 2, rl[2]], [rr[0] - 0.01, ya - ah / 2, rr[2]], 0.016, ah, 0.016, ah, 0.003, C.frame, [0, 1, 0]);
  for (const sx of [-1, 1]) {
    const f = legAt(ya - ah / 2, sx, true), r = legAt(ya - ah / 2, sx, false);
    bar(ctx, [r[0], ya - ah / 2, r[2] + 0.01], [f[0], ya - ah / 2, f[2] - 0.01], 0.016, ah, 0.016, ah, 0.003, C.frame, [0, 1, 0]);
  }
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "dining";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    seat: M.finish(ctx, p.finish, D.finish),
    frame: M.finish(ctx, p.finish2, D.finish2),
    chrome: M.finish(ctx, "chrome", "chrome"),
  };
  if (part === "stool") stool(ctx, C, s);
  else if (part === "barstool") barstool(ctx, C, s);
  else if (part === "office") office(ctx, C, s);
  else if (part === "bench") bench(ctx, C, s);
  else if (part === "rocking") rocking(ctx, C, s);
  else if (part === "kids") kids(ctx, C, s);
  else if (part === "highchair") highchair(ctx, C, s);
  else dining(ctx, C, s);
}

export { PARTS, DEF, BACKS, size, dims, surface, manifest };
