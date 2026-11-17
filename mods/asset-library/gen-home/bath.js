// BATH — HYLLA's bathroom family, ONE generator (09b §3.7). Sanitaryware, vanity, shower, rails.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/bath.js",
//                params: { part: "vanity", w: 0.8, finish: "oak", finish2: "chrome" } }
//
// FRAMES (09b §1): floor parts — origin ON THE GROUND at the footprint centre, +Y up, front on +Z,
//   body x ±w/2 · z ±d/2 · y 0→h. Wall parts (`mirrorcab`, `towelrail`) — origin at the BACK-BOTTOM
//   centre: x ±w/2 · z 0→+d · y 0→+h. `dims` = TOTAL extent (taps and the shower head count).
// SCALE: tub rim 0.55, vanity top 0.85, toilet seat 0.42, shower glass 2.00, rail at 1.20.
//
//   part: "bathtub"    1.70×0.75, panelled, rim 0.55 + mixer     part: "vanity"     0.80|0.60|1.00 × 0.48 × 0.85 + basin + tap
//   part: "tub"        1.60×0.75 freestanding oval, rim 0.60     part: "basin"      pedestal 0.55×0.45×0.85 + tap
//   part: "shower"     0.90 sq tray, glass to 2.00, rain head    part: "mirrorcab"  0.60×0.15×0.70 (wall, 1.20)
//   part: "toilet"     0.37×0.65×0.80                            part: "towelrail"  0.60×0.10×0.08 (wall, 1.20) · ladder bool = floor 0.60×0.24×1.60
//
// PARAMS: w (vanity 0.60–1.00; shower 0.80–1.20; towelrail 0.40–0.80) · finish (cabinet / tub
//   panel; default oak, tubs white) · finish2 (frame / rail / taps; default chrome) · ladder bool
//   (towelrail). Ceramic sanitaryware, glass and mirror are fixed paints.
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — finish, then ceramic, then finish2 / chrome, then mirror, then
//   glass LAST (transparent pass ends the run).
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("builtin/geom");
const M = require("lib/home-mat.js");

const PARTS = ["bathtub", "tub", "shower", "toilet", "vanity", "basin", "mirrorcab", "towelrail"];

const DEF = {
  bathtub: { finish: "white", finish2: "chrome" },
  tub: { finish: "white", finish2: "chrome" },
  shower: { w: 0.9, finish: "white", finish2: "chrome" },
  toilet: { finish: "white", finish2: "chrome" },
  vanity: { w: 0.8, finish: "oak", finish2: "chrome" },
  basin: { finish: "white", finish2: "chrome" },
  mirrorcab: { finish: "oak", finish2: "chrome" },
  towelrail: { w: 0.6, ladder: false, finish: "oak", finish2: "chrome" },
};

const MOUNT = { mirrorcab: { mount: "wall", mountY: 1.2 }, towelrail: { mount: "wall", mountY: 1.2 } };

const TAP = 0.15; // mixer rise above a rim / vanity top
const SIDES = 16; // tub / basin rims

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}

function size(part, p) {
  const D = DEF[part] || DEF.vanity;
  p = p || {};
  const s = { ladder: p.ladder === undefined ? !!D.ladder : !!p.ladder };
  if (part === "bathtub") {
    s.w = 1.7;
    s.d = 0.75;
    s.h = 0.55;
  } else if (part === "tub") {
    s.w = 1.6;
    s.d = 0.75;
    s.h = 0.6;
  } else if (part === "shower") {
    s.w = clamp(num(p.w, D.w), 0.8, 1.2);
    s.d = s.w;
    s.h = 2.0;
  } else if (part === "toilet") {
    s.w = 0.37;
    s.d = 0.65;
    s.h = 0.8;
  } else if (part === "vanity") {
    s.w = clamp(num(p.w, D.w), 0.6, 1.0);
    s.d = 0.48;
    s.h = 0.85;
  } else if (part === "basin") {
    s.w = 0.55;
    s.d = 0.45;
    s.h = 0.85;
  } else if (part === "mirrorcab") {
    s.w = 0.6;
    s.d = 0.15;
    s.h = 0.7;
  } else {
    // towelrail
    s.w = clamp(num(p.w, D.w), 0.4, 0.8);
    if (s.ladder) {
      s.d = 0.24;
      s.h = 1.6;
    } else {
      s.d = 0.1;
      s.h = 0.08;
    }
  }
  return s;
}

// [w, d, hTotal] — the catalog's `dims`, total extent (mixers rise TAP above the functional top).
function dims(part, p) {
  const s = size(part, p);
  const tapped = part === "bathtub" || part === "tub" || part === "vanity" || part === "basin";
  return [s.w, s.d, tapped ? s.h + TAP : s.h];
}

// The functional top a `top` row sits at (vanity top; 0 elsewhere).
function surface(part, p) {
  return part === "vanity" ? size(part, p).h : 0;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) {
    const m = MOUNT[k] || { mount: "floor", mountY: 0 };
    parts[k] = { dims: dims(k, {}), surface: surface(k, {}), mount: m.mount, mountY: m.mountY, defaults: DEF[k] };
  }
  parts["towelrail-ladder"] = { dims: dims("towelrail", { ladder: true }), surface: 0, mount: "floor", mountY: 0, defaults: { ladder: true } };
  return { family: "bath", script: "scripts/asset-library/gen-home/bath.js", parts };
}

// ── emitters (townscape.js pattern) ─────────────────────────────────────────
export function qd(ctx, paint, a, b, c, d) {
  if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
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

// Vertical chamfered prism between two footprints (a post, a cistern).
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

// Superellipse ring at height y (P convention: x = +cos, z = −sin — bottom→top lofts face outward,
// top→bottom lofts face inward with an up-facing floor cap: the cavity law).
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

// Flat annulus between two same-count rings at one height, outer → inner, facing up.
export function annulus(ctx, outer, inner, paint) {
  const n = outer.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    qd(ctx, paint, outer[i], outer[j], inner[j], inner[i]);
  }
}

// Smooth loft over stacked rings; caps optional.
export function shell(ctx, rings, paint, capStart, capEnd) {
  ctx.smooth();
  G.loft(ctx, rings, { paint, capStart: !!capStart, capEnd: !!capEnd });
  ctx.flat();
}

// A basin/tub body: outer shell rings (bottom→top), rim annulus to the inner ring, cavity down to a
// floor ring. `outer`/`inner` are arrays of [y, w, d, pow] stations; inner runs top→bottom.
export function vessel(ctx, outer, inner, outerPaint, innerPaint, n, capBottom) {
  const O = outer.map((r) => oring(0, r[4] || 0, r[0], r[1], r[2], n, r[3]));
  const I = inner.map((r) => oring(0, r[4] || 0, r[0], r[1], r[2], n, r[3]));
  shell(ctx, O, outerPaint, capBottom !== false, false);
  annulus(ctx, O[O.length - 1], I[0], innerPaint);
  shell(ctx, I, innerPaint, false, true);
}

// Chrome mixer standing on a rim / top at (x, yTop, z): riser, spout to +Z, lever. Rises TAP.
export function tap(ctx, paint, x, yTop, z, spout) {
  const L = spout || 0.14;
  ctx.smooth();
  G.tube(ctx, [x, yTop, z], [x, yTop + TAP * 0.75, z], 0.016, 0.014, 8, [0, 0, 1], paint);
  const y1 = yTop + TAP * 0.75;
  G.polyTube(ctx, [[x, y1, z], [x, yTop + TAP, z + 0.01], [x, yTop + TAP, z + L * 0.7], [x, yTop + TAP - 0.03, z + L]], [0.012, 0.011, 0.01, 0.009], 8, [0, 1, 0], paint);
  G.tube(ctx, [x, y1 - 0.02, z], [x + 0.06, y1 + 0.005, z - 0.02], 0.006, 0.005, 6, [0, 1, 0], paint);
  ctx.flat();
}

// ── parts ──────────────────────────────────────────────────────────────────
// Panelled built-in tub: rounded-rect panel (finish) 0→0.50, ceramic rim + cavity, mixer at the −X end.
export function bathtub(ctx, C, s) {
  const w = s.w, d = s.d, rim = s.h;
  const box = 0.12; // rounded-rect corner
  shell(ctx, [oring(0, 0, 0, w, d, SIDES, box), oring(0, 0, rim - 0.05, w, d, SIDES, box)], C.panel, false, false);
  vessel(
    ctx,
    [
      [rim - 0.05, w, d, box],
      [rim - 0.008, w, d, box],
      [rim, w - 0.016, d - 0.016, box],
    ],
    [
      [rim, w - 0.2, d - 0.17, 0.5],
      [rim - 0.02, w - 0.2, d - 0.17, 0.5],
      [rim - 0.25, w - 0.32, d - 0.28, 0.6],
      [0.14, w - 0.46, d - 0.36, 0.7],
    ],
    C.ceramic,
    C.ceramic,
    SIDES,
    false
  );
  tap(ctx, C.chrome, -w / 2 + 0.16, rim, -0.02, 0.16);
}

// Freestanding oval tub: one ceramic-white shell, flared rim, cavity, rim mixer.
export function tub(ctx, C, s) {
  const w = s.w, d = s.d, rim = s.h;
  vessel(
    ctx,
    [
      [0, w - 0.36, d - 0.24, 0.7],
      [0.05, w - 0.16, d - 0.1, 0.65],
      [rim - 0.12, w, d, 0.6],
      [rim - 0.01, w, d, 0.6],
      [rim, w - 0.02, d - 0.02, 0.6],
    ],
    [
      [rim, w - 0.14, d - 0.14, 0.6],
      [rim - 0.02, w - 0.14, d - 0.14, 0.6],
      [rim - 0.28, w - 0.28, d - 0.28, 0.65],
      [0.12, w - 0.46, d - 0.4, 0.7],
    ],
    C.panel,
    C.ceramic,
    SIDES,
    true
  );
  tap(ctx, C.chrome, -w / 2 + 0.2, rim, 0, 0.16);
}

// Corner shower: ceramic tray, chrome frame (two corner posts + top rails), rain riser + head, two
// glass screens on +X and +Z (the wall sides −X / −Z are the room set's).
export function shower(ctx, C, s) {
  const w = s.w, h = s.h, x1 = w / 2, z1 = w / 2, x0 = -w / 2, z0 = -w / 2;
  // ceramic: tray + drain
  slab(ctx, x0, x1, 0, 0.05, z0, z1, C.ceramic, 0.01);
  ctx.smooth();
  G.loft(ctx, [oring(0.05, 0.05, 0.05, 0.1, 0.1, 10), oring(0.05, 0.05, 0.053, 0.1, 0.1, 10)], { paint: C.chrome, capStart: false, capEnd: true });
  ctx.flat();
  // chrome frame: posts at the open corner (+X,+Z), at (+X,−Z) and (−X,+Z); rails along the top
  const P = 0.03;
  for (const c of [
    [x1 - P / 2, z1 - P / 2],
    [x1 - P / 2, z0 + P / 2],
    [x0 + P / 2, z1 - P / 2],
  ])
    post(ctx, c[0], c[1], 0.05, h, P, P, P, P, 0.004, C.chrome, { start: false });
  bx(ctx, x1 - P, x1, h - P, h, z0 + P, z1 - P, C.chrome);
  bx(ctx, x0 + P, x1 - P, h - P, h, z1 - P, z1, C.chrome);
  // rain riser in the wall corner, arm to a ⌀0.20 head at 1.95
  ctx.smooth();
  G.tube(ctx, [x0 + 0.06, 0.05, z0 + 0.06], [x0 + 0.06, 1.9, z0 + 0.06], 0.012, 0.012, 8, [0, 0, 1], C.chrome);
  G.polyTube(ctx, [[x0 + 0.06, 1.88, z0 + 0.06], [x0 + 0.06, 1.95, z0 + 0.06], [x0 + 0.06 + 0.24, 1.95, z0 + 0.06 + 0.24]], 0.01, 8, [0, 1, 0], C.chrome);
  const hx = x0 + 0.06 + 0.24, hz = z0 + 0.06 + 0.24;
  G.loft(ctx, [oring(hx, hz, 1.93, 0.2, 0.2, 14), oring(hx, hz, 1.945, 0.2, 0.2, 14), oring(hx, hz, 1.95, 0.05, 0.05, 14)], { paint: C.chrome, capStart: true, capEnd: true });
  ctx.flat();
  // glass LAST: +X screen and +Z screen (a fixed panel and a door leaf with a 0.15 gap at the corner)
  bx(ctx, x1 - P / 2 - 0.004, x1 - P / 2 + 0.004, 0.05, h - P, z0 + P, z1 - P, C.glass);
  bx(ctx, x0 + P, x1 - P - 0.15, 0.05, h - P, z1 - P / 2 - 0.004, z1 - P / 2 + 0.004, C.glass);
}

// Close-coupled toilet: ceramic pedestal + bowl, seat ring, cistern with a chrome flush button.
export function toilet(ctx, C, s) {
  const d = s.d, h = s.h, zb = 0.075; // bowl centre (bowl spans −0.175..0.325, cistern −0.325..−0.155)
  const zc = -d / 2 + 0.085; // cistern centre (0.17 deep)
  // pedestal → bowl: outward shell
  shell(
    ctx,
    [
      oring(0, zb - 0.05, 0, 0.26, 0.34, SIDES, 0.7),
      oring(0, zb - 0.05, 0.05, 0.24, 0.34, SIDES, 0.7),
      oring(0, zb - 0.02, 0.25, 0.28, 0.4, SIDES, 0.75),
      oring(0, zb, 0.37, 0.37, 0.5, SIDES, 0.8),
      oring(0, zb, 0.4, 0.37, 0.5, SIDES, 0.8),
    ],
    C.ceramic,
    true,
    false
  );
  // seat: outer wall 0.40→0.43, top annulus, inner cavity down to the bowl floor
  const So = oring(0, zb, 0.43, 0.37, 0.5, SIDES, 0.8), Si = oring(0, zb, 0.43, 0.25, 0.36, SIDES, 0.85);
  shell(ctx, [oring(0, zb, 0.4, 0.37, 0.5, SIDES, 0.8), So], C.ceramic, false, false);
  annulus(ctx, So, Si, C.ceramic);
  shell(ctx, [Si, oring(0, zb, 0.36, 0.25, 0.36, SIDES, 0.85), oring(0, zb + 0.01, 0.24, 0.14, 0.2, SIDES, 0.9)], C.ceramic, false, true);
  // cistern + lid
  post(ctx, 0, zc, 0.4, h - 0.03, 0.37, 0.17, 0.37, 0.17, 0.01, C.ceramic, { start: false, end: false });
  slab(ctx, -0.19, 0.19, h - 0.03, h, zc - 0.09, zc + 0.09, C.ceramic, 0.008);
  // chrome flush button
  ctx.smooth();
  G.loft(ctx, [oring(0, zc, h, 0.06, 0.06, 10), oring(0, zc, h + 0.005, 0.06, 0.06, 10)], { paint: C.chrome, capStart: false, capEnd: true });
  ctx.flat();
}

// Vanity: cabinet on a plinth with two drawers (finish), ceramic top + inset basin, chrome handles + tap.
export function vanity(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h, yTop = h - 0.04;
  const zB = -d / 2, zF = d / 2 - 0.02;
  // finish: carcass, plinth, two drawer fronts
  bx(ctx, -w / 2, w / 2, 0.1, yTop, zB, zF, C.panel, "b");
  bx(ctx, -w / 2 + 0.02, w / 2 - 0.02, 0, 0.1, zB + 0.02, zF - 0.04, C.panel, "tb");
  const ym = 0.1 + (yTop - 0.1) / 2;
  bx(ctx, -w / 2 + 0.003, w / 2 - 0.003, 0.103, ym - 0.003, zF, zF + 0.02, C.panel, "k");
  bx(ctx, -w / 2 + 0.003, w / 2 - 0.003, ym + 0.003, yTop - 0.003, zF, zF + 0.02, C.panel, "k");
  // ceramic: top with basin hole, then the basin cavity (rounded rect, 0.13 deep)
  const bw = Math.min(0.42, w - 0.2), bd = 0.3, bz = 0.01;
  frameTop(ctx, -w / 2, w / 2, yTop, h, zB, zF + 0.02, -bw / 2, bw / 2, bz - bd / 2, bz + bd / 2, 0.008, C.ceramic);
  shell(
    ctx,
    [
      oring(0, bz, h, bw, bd, SIDES, 0.4),
      oring(0, bz, h - 0.03, bw - 0.02, bd - 0.02, SIDES, 0.45),
      oring(0, bz, h - 0.11, bw - 0.12, bd - 0.1, SIDES, 0.7),
      oring(0, bz, h - 0.13, bw - 0.3, bd - 0.2, SIDES, 0.9),
    ],
    C.ceramic,
    false,
    true
  );
  // chrome: two bar handles, tap behind the basin
  for (const cy of [ym - 0.05, yTop - 0.05]) {
    bx(ctx, -0.09, -0.078, cy - 0.006, cy + 0.006, zF + 0.02, zF + 0.045, C.chrome, "k");
    bx(ctx, 0.078, 0.09, cy - 0.006, cy + 0.006, zF + 0.02, zF + 0.045, C.chrome, "k");
    bx(ctx, -0.1, 0.1, cy - 0.006, cy + 0.006, zF + 0.045, zF + 0.057, C.chrome);
  }
  tap(ctx, C.chrome, 0, h, bz - bd / 2 - 0.05, 0.13);
}

// The basin hole's frame: a rectangular top with a rounded-rect hole. The hole edge is the first
// ring of the basin cavity (same SIDES-point superellipse), so the seam is shared.
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
  // top: outer inset rect → the hole's superellipse ring, one quad per ring segment
  const ring = oring((hx0 + hx1) / 2, (hz0 + hz1) / 2, y1, hx1 - hx0, hz1 - hz0, SIDES, 0.4);
  const n = ring.length;
  const outer = [];
  const cx = (hx0 + hx1) / 2, cz = (hz0 + hz1) / 2;
  for (let i = 0; i < n; i++) {
    // project the ring point's direction from the hole centre onto the inset rectangle
    const dx = ring[i][0] - cx, dz = ring[i][2] - cz;
    const tx = dx > 0 ? (X1 - cx) / dx : dx < 0 ? (X0 - cx) / dx : Infinity;
    const tz = dz < 0 ? (Z0 - cz) / dz : dz > 0 ? (Z1 - cz) / dz : Infinity;
    const t = Math.min(tx, tz);
    outer.push([cx + dx * t, y1, cz + dz * t]);
  }
  // rectangle corners are not among the 16 directions: splice them in as extra fan quads
  annulus(ctx, outer, ring, paint);
  const corners = [
    [X1, y1, Z1],
    [X1, y1, Z0],
    [X0, y1, Z0],
    [X0, y1, Z1],
  ];
  for (const c of corners) {
    // find the two outer points bracketing this corner (the nearest by angle either side)
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const m = [(outer[i][0] + outer[j][0]) / 2, (outer[i][2] + outer[j][2]) / 2];
      const dd = (m[0] - c[0]) * (m[0] - c[0]) + (m[1] - c[2]) * (m[1] - c[2]);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    }
    const j = (best + 1) % n;
    tri(ctx, paint, outer[best], c, outer[j]);
  }
}

export function tri(ctx, paint, a, b, c) {
  if (paint) paint((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
  ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}

// Pedestal basin: ceramic column, flared bowl, rim, cavity, chrome tap at the back.
export function basin(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h;
  shell(
    ctx,
    [
      oring(0, -0.03, 0, 0.2, 0.16, SIDES, 0.7),
      oring(0, -0.03, 0.03, 0.18, 0.14, SIDES, 0.7),
      oring(0, -0.03, 0.55, 0.14, 0.12, SIDES, 0.7),
      oring(0, -0.03, 0.66, 0.2, 0.16, SIDES, 0.7),
    ],
    C.ceramic,
    true,
    false
  );
  vessel(
    ctx,
    [
      [0.66, 0.22, 0.18, 0.7],
      [0.74, 0.42, 0.34, 0.65],
      [h - 0.02, w, d, 0.6],
      [h, w - 0.02, d - 0.02, 0.6],
    ],
    [
      [h, w - 0.09, d - 0.09, 0.6],
      [h - 0.02, w - 0.09, d - 0.09, 0.6],
      [h - 0.09, w - 0.2, d - 0.18, 0.7],
      [h - 0.13, w - 0.36, d - 0.3, 0.9],
    ],
    C.ceramic,
    C.ceramic,
    SIDES,
    false
  );
  tap(ctx, C.chrome, 0, h, -d / 2 + 0.05, 0.13);
}

// Mirror cabinet in the wall frame: x ±0.30 · z 0→0.15 · y 0→0.70. Carcass (finish), mirror door.
export function mirrorcab(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h;
  bx(ctx, -w / 2, w / 2, 0, h, 0, d - 0.02, C.panel, "k");
  bx(ctx, -w / 2 + 0.003, w / 2 - 0.003, 0.003, h - 0.003, d - 0.02, d, C.panel, "fk");
  // chrome knob on the right edge
  ctx.smooth();
  G.tube(ctx, [w / 2 - 0.04, h / 2, d], [w / 2 - 0.04, h / 2, d + 0.012], 0.006, 0.006, 8, [0, 1, 0], C.chrome);
  G.tube(ctx, [w / 2 - 0.04, h / 2, d + 0.012], [w / 2 - 0.04, h / 2, d + 0.028], 0.014, 0.012, 8, [0, 1, 0], C.chrome);
  ctx.flat();
  // mirror face: the door front, 2 mm inside the door's edge
  qd(ctx, C.mirror, [-w / 2 + 0.005, 0.005, d], [w / 2 - 0.005, 0.005, d], [w / 2 - 0.005, h - 0.005, d], [-w / 2 + 0.005, h - 0.005, d]);
}

// Towel rail — wall frame (x ±w/2 · z 0→0.10 · y 0→0.08): two chrome brackets + one bar. With
// `ladder: true` it is a floor-standing ladder rail leaning back 8°: rails + four rungs, oak (finish)
// treads on chrome (finish2) is not a thing — the whole ladder wears finish2.
export function towelrail(ctx, C, s) {
  const w = s.w;
  if (!s.ladder) {
    for (const sx of [-1, 1]) {
      bx(ctx, sx * (w / 2 - 0.03) - 0.015, sx * (w / 2 - 0.03) + 0.015, 0.02, 0.06, 0, 0.012, C.chrome, "k");
      ctx.smooth();
      G.tube(ctx, [sx * (w / 2 - 0.03), 0.04, 0.012], [sx * (w / 2 - 0.03), 0.04, 0.086], 0.008, 0.008, 8, [0, 1, 0], C.chrome);
      ctx.flat();
    }
    ctx.smooth();
    G.tube(ctx, [-w / 2, 0.04, 0.086], [w / 2, 0.04, 0.086], 0.012, 0.012, 10, [0, 1, 0], C.chrome);
    ctx.flat();
    return;
  }
  const h = s.h, d = s.d;
  const zFoot = d / 2 - 0.02, zTop = -d / 2 + 0.02;
  ctx.smooth();
  for (const sx of [-1, 1]) G.tube(ctx, [sx * (w / 2 - 0.015), 0, zFoot], [sx * (w / 2 - 0.015), h, zTop], 0.015, 0.015, 10, [0, 0, 1], C.chrome);
  for (const t of [0.28, 0.5, 0.72, 0.94]) {
    const y = h * t, z = zFoot + (zTop - zFoot) * t;
    G.tube(ctx, [-w / 2 + 0.015, y, z], [w / 2 - 0.015, y, z], 0.011, 0.011, 8, [0, 1, 0], C.chrome);
  }
  ctx.flat();
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "vanity";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    panel: M.finish(ctx, p.finish, D.finish),
    chrome: M.finish(ctx, p.finish2, D.finish2),
    ceramic: M.finish(ctx, "ceramic", "ceramic"),
    mirror: M.mirror(ctx),
    glass: M.glass(ctx),
  };
  if (part === "bathtub") bathtub(ctx, C, s);
  else if (part === "tub") tub(ctx, C, s);
  else if (part === "shower") shower(ctx, C, s);
  else if (part === "toilet") toilet(ctx, C, s);
  else if (part === "basin") basin(ctx, C, s);
  else if (part === "mirrorcab") mirrorcab(ctx, C, s);
  else if (part === "towelrail") towelrail(ctx, C, s);
  else vanity(ctx, C, s);
}

export { PARTS, DEF, MOUNT, size, dims, surface, manifest };
