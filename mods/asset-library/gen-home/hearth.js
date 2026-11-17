// HEARTH — HYLLA's fireplace family, ONE generator (09b §3.8). Surrounds, a stove, the log basket.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/hearth.js",
//                params: { part: "brick", h: 2.4, fire: true, finish: "brick", finish2: "oak" } }
//
// FRAMES (09b §1): floor parts — origin ON THE GROUND at the footprint centre, +Y up, front on +Z,
//   body x ±w/2 · z ±d/2 · y 0→h. `mantel` is a wall part — origin at the BACK-BOTTOM centre:
//   x ±w/2 · z 0→+d · y 0→+h. `dims` = TOTAL extent (mantel and hearth-slab projection, flue counted).
// SCALE: mantel at 1.10 (= `surface`), firebox sill 0.06, stove top 0.85, flue to 2.40.
//
//   part: "brick"      1.48×0.515 × 2.40|1.20 — brick surround, oak mantel at 1.10, breast above
//   part: "stone"      1.72×0.58 × 2.40|1.20 — rubble relief surround, oak beam mantel at 1.15
//   part: "modern"     1.64×0.32×1.00 — black linear firebox, glass front, oak plinth + top (surface 1.00)
//   part: "stove"      0.58×0.48×2.40 — black wood stove (box 0.85 + flue), glass door, log store
//   part: "logbasket"  ⌀0.45 × 0.50 — rattan basket, five upright logs
//   part: "mantel"     1.40×0.20×0.06 shelf (wall, mountY 1.10; surface 0.06 above its origin)
//
// PARAMS: h (brick/stone breast 1.20–2.70; modern 0.80–1.20) · fire bool (ember stack + flames) ·
//   finish (surround: brick | stone | black; basket rattan) · finish2 (mantel / plinth / logs: oak;
//   logbasket logs walnut). The stove is fixed black steel.
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — surround, then hearth stone, then finish2 timber, then log wood,
//   then black soot faces, then glow, then glass LAST.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("scripts/lib/geom.js");
const M = require("lib/home-mat.js");

const PARTS = ["brick", "stone", "modern", "stove", "logbasket", "mantel"];

const DEF = {
  brick: { h: 2.4, fire: true, finish: "brick", finish2: "oak" },
  stone: { h: 2.4, fire: true, finish: "stone", finish2: "oak" },
  modern: { h: 1.0, fire: true, finish: "black", finish2: "oak" },
  stove: { fire: true, finish: "black", finish2: "walnut" },
  logbasket: { finish: "rattan", finish2: "walnut" },
  mantel: { finish: "oak", finish2: "oak" },
};

const MOUNT = { mantel: { mount: "wall", mountY: 1.1 } };

const MANTEL_Y = 1.1; // the brick mantel's top = the catalog `surface`

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}

function size(part, p) {
  const D = DEF[part] || DEF.brick;
  p = p || {};
  const s = { fire: p.fire === undefined ? !!D.fire : !!p.fire };
  if (part === "brick") {
    s.w = 1.4;
    s.d = 0.45;
    s.proj = 0.065; // mantel + hearth slab past the front face
    s.h = clamp(num(p.h, D.h), 1.2, 2.7);
  } else if (part === "stone") {
    s.w = 1.6;
    s.d = 0.5;
    s.proj = 0.08;
    s.h = clamp(num(p.h, D.h), 1.2, 2.7);
  } else if (part === "modern") {
    s.w = 1.6;
    s.d = 0.3;
    s.proj = 0.02;
    s.h = clamp(num(p.h, D.h), 0.8, 1.2);
  } else if (part === "stove") {
    s.w = 0.55;
    s.d = 0.45;
    s.h = 2.4;
  } else if (part === "logbasket") {
    s.w = 0.45;
    s.d = 0.45;
    s.h = 0.5;
  } else {
    s.w = 1.4;
    s.d = 0.2;
    s.h = 0.06;
  }
  return s;
}

// [w, d, hTotal] — total extent: mantel/hearth projection, the stove's wider top plate, the flue.
function dims(part, p) {
  const s = size(part, p);
  if (part === "brick" || part === "stone") return [s.w + 2 * (s.proj - 0.025), s.d + s.proj, s.h];
  if (part === "modern") return [s.w + 0.04, s.d + s.proj, s.h];
  if (part === "stove") return [0.58, 0.48, s.h];
  return [s.w, s.d, s.h];
}

// The functional top a `top` row sits at: the mantel shelf (brick/stone), the modern top, stove top.
function surface(part, p) {
  const s = size(part, p);
  if (part === "brick") return MANTEL_Y;
  if (part === "stone") return MANTEL_Y + 0.05;
  if (part === "modern") return s.h;
  if (part === "stove") return 0.85;
  if (part === "mantel") return 0.06;
  return 0;
}

function manifest() {
  const parts = {};
  for (const k of PARTS) {
    const m = MOUNT[k] || { mount: "floor", mountY: 0 };
    parts[k] = { dims: dims(k, {}), surface: surface(k, {}), mount: m.mount, mountY: m.mountY, defaults: DEF[k] };
  }
  return { family: "hearth", script: "scripts/asset-library/gen-home/hearth.js", parts };
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
export function annulus(ctx, outer, inner, paint) {
  const n = outer.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    qd(ctx, paint, outer[i], outer[j], inner[j], inner[i]);
  }
}
export function shell(ctx, rings, paint, capStart, capEnd) {
  ctx.smooth();
  G.loft(ctx, rings, { paint, capStart: !!capStart, capEnd: !!capEnd });
  ctx.flat();
}
// Up-facing fan over a ring (a log's end grain).
export function fanUp(ctx, ring, paint) {
  for (let k = 1; k < ring.length - 1; k++) tr(ctx, paint, ring[0], ring[k], ring[k + 1]);
}

// A front-opening recess into a body whose front face is at zF: inward side walls, ceiling (down),
// floor (up), back wall (+Z). `side` paints walls+ceiling, `soot` the back and floor.
// Pass null for either paint to skip that half — so the soot faces can be emitted later in their own
// albedo group.
export function recess(ctx, x0, x1, y0, y1, zBack, zF, side, soot) {
  if (side) {
    qd(ctx, side, [x0, y0, zF], [x0, y0, zBack], [x0, y1, zBack], [x0, y1, zF]);
    qd(ctx, side, [x1, y0, zBack], [x1, y0, zF], [x1, y1, zF], [x1, y1, zBack]);
    qd(ctx, side, [x0, y1, zF], [x1, y1, zF], [x1, y1, zBack], [x0, y1, zBack]);
  }
  if (soot) {
    qd(ctx, soot, [x0, y0, zBack], [x1, y0, zBack], [x1, y1, zBack], [x0, y1, zBack]);
    qd(ctx, soot, [x0, y0, zF], [x1, y0, zF], [x1, y0, zBack], [x0, y0, zBack]);
  }
}

// The front face of a body as a frame round an opening (4 quads, facing +Z).
export function frontFrame(ctx, paint, X0, X1, Y0, Y1, x0, x1, y0, y1, z) {
  qd(ctx, paint, [X0, Y0, z], [x0, Y0, z], [x0, Y1, z], [X0, Y1, z]);
  qd(ctx, paint, [x1, Y0, z], [X1, Y0, z], [X1, Y1, z], [x1, Y1, z]);
  qd(ctx, paint, [x0, Y0, z], [x1, Y0, z], [x1, y0, z], [x0, y0, z]);
  qd(ctx, paint, [x0, y1, z], [x1, y1, z], [x1, Y1, z], [x0, Y1, z]);
}

// ── fire ────────────────────────────────────────────────────────────────────
// Three logs (wood), then embers and flame cards (glow). Centre (cx, cz), floor y0, spread w.
export function logs(ctx, paint, cx, y0, cz, w) {
  const r = Math.min(0.045, w * 0.09), L = w * 0.42;
  ctx.smooth();
  G.tube(ctx, [cx - L, y0 + r, cz + 0.02], [cx + L, y0 + r, cz + 0.05], r, r * 0.9, 8, [0, 1, 0], paint);
  G.tube(ctx, [cx - L * 0.9, y0 + r, cz - 0.08], [cx + L * 0.95, y0 + r, cz - 0.06], r * 0.9, r, 8, [0, 1, 0], paint);
  G.tube(ctx, [cx - L * 0.7, y0 + r * 2.7, cz - 0.07], [cx + L * 0.8, y0 + r * 2.7, cz + 0.04], r * 0.85, r * 0.85, 8, [0, 1, 0], paint);
  ctx.flat();
}
export function embers(ctx, ember, flame, cx, y0, cz, w, tall) {
  const n = Math.max(3, Math.round(w * 6));
  for (let i = 0; i < n; i++) {
    const x = cx - w * 0.38 + (w * 0.76 * i) / (n - 1);
    const z = cz + ((i % 2) - 0.5) * 0.06;
    bx(ctx, x - 0.03, x + 0.03, y0, y0 + 0.05, z - 0.03, z + 0.03, ember, "b");
  }
  const fh = tall || 0.28;
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * w * 0.22, b = 0.07 + (i === 1 ? 0.04 : 0), h = fh * (i === 1 ? 1 : 0.7);
    const A = [x - b, y0 + 0.03, cz], B = [x + b, y0 + 0.03, cz], T = [x + (i - 1) * 0.02, y0 + 0.03 + h, cz - 0.02];
    tr(ctx, flame, A, B, T);
    tr(ctx, flame, B, A, T);
    const A2 = [x, y0 + 0.03, cz - b], B2 = [x, y0 + 0.03, cz + b];
    tr(ctx, flame, B2, A2, T);
    tr(ctx, flame, A2, B2, T);
  }
}

// ── parts ──────────────────────────────────────────────────────────────────
// Shared surround: body with a firebox opening, hearth slab, mantel, breast above.
export function surround(ctx, C, s, o) {
  const w = s.w, d = s.d, h = s.h, zF = d / 2, zB = -d / 2;
  const ow = o.ow, oh = o.oh, sill = 0.06, depth = o.depth;
  const yM = o.mantelY, mt = o.mantelT;
  const lowTop = yM - mt;
  // surround: sides, back, front frame, recess walls + ceiling
  bx(ctx, -w / 2, w / 2, 0, lowTop, zB, zF, C.face, "ftb");
  frontFrame(ctx, C.face, -w / 2, w / 2, 0, lowTop, -ow / 2, ow / 2, sill, sill + oh, zF);
  recess(ctx, -ow / 2, ow / 2, sill, sill + oh, zF - depth, zF, C.face, null);
  if (o.relief) o.relief(lowTop);
  // breast above the mantel: narrower past 0.30 of rise, full width for the low version
  const rise = h - yM;
  if (rise > 0.005) {
    const bw = rise > 0.3 ? w * 0.82 : w, bz = rise > 0.3 ? zF - 0.12 : zF;
    bx(ctx, -bw / 2, bw / 2, yM, h, zB, bz, C.face, "b");
    if (o.reliefUpper && rise > 0.3) o.reliefUpper(yM, h, bw, bz);
  }
  // hearth slab (stone) flush with the mantel projection
  slab(ctx, -w / 2 - s.proj + 0.025, w / 2 + s.proj - 0.025, 0, 0.03, zB, zF + s.proj, C.hearth, 0.008);
  // mantel (finish2)
  slab(ctx, -w / 2 - s.proj + 0.025, w / 2 + s.proj - 0.025, lowTop, yM, zB, zF + s.proj, C.mantel, 0.008);
  // logs (wood), soot faces (black), then glow
  if (s.fire) logs(ctx, C.log, 0, sill, zF - depth * 0.55, ow);
  recess(ctx, -ow / 2, ow / 2, sill, sill + oh, zF - depth, zF, null, C.soot);
  if (s.fire) embers(ctx, C.ember, C.flame, 0, sill + 0.02, zF - depth * 0.55, ow, oh * 0.45);
}

export function brick(ctx, C, s) {
  const zF = s.d / 2;
  surround(ctx, C, s, {
    ow: 0.7,
    oh: 0.6,
    depth: 0.35,
    mantelY: MANTEL_Y,
    mantelT: 0.05,
    // a proud header course over the opening
    relief: function () {
      const y0 = 0.06 + 0.6 + 0.01, y1 = y0 + 0.075;
      for (let i = 0; i < 8; i++) {
        const x0 = -0.44 + i * 0.11;
        bx(ctx, x0 + 0.004, x0 + 0.106, y0, y1, zF, zF + 0.015, C.face, "k");
      }
    },
  });
}

// Stone: every face cell is a proud stone over a mortar body — a rubble relief that still reads
// as one mass. Cells jitter in depth (seeded).
export function stone(ctx, C, s) {
  const w = s.w, zF = s.d / 2;
  const cells = function (x0, x1, y0, y1, z, hole) {
    const cw = 0.26, ch = 0.16;
    const nx = Math.max(1, Math.round((x1 - x0) / cw)), ny = Math.max(1, Math.round((y1 - y0) / ch));
    const dx = (x1 - x0) / nx, dy = (y1 - y0) / ny;
    for (let j = 0; j < ny; j++) {
      const off = (j % 2) * dx * 0.5;
      for (let i = -1; i < nx; i++) {
        let a = x0 + i * dx + off, b = a + dx;
        if (b <= x0 + 0.01 || a >= x1 - 0.01) continue;
        a = Math.max(a, x0);
        b = Math.min(b, x1);
        const ya = y0 + j * dy, yb = ya + dy;
        if (hole && b > hole[0] && a < hole[1] && yb > hole[2] && ya < hole[3]) continue;
        const p = 0.008 + ctx.random() * 0.02, g = 0.008;
        bx(ctx, a + g, b - g, ya + g, yb - g, z, z + p, C.face, "k");
      }
    }
  };
  surround(ctx, C, s, {
    ow: 0.8,
    oh: 0.65,
    depth: 0.38,
    mantelY: MANTEL_Y + 0.05,
    mantelT: 0.1,
    relief: function (lowTop) {
      cells(-w / 2, w / 2, 0.03, lowTop, zF, [-0.4, 0.4, 0.06, 0.71]);
    },
    reliefUpper: function (yM, h, bw, bz) {
      cells(-bw / 2, bw / 2, yM, h, bz, null);
    },
  });
}

// Modern linear firebox: black body, letterbox opening, ember bed, glass front, oak plinth + top.
export function modern(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h, zF = d / 2, zB = -d / 2;
  const pl = 0.08, top = 0.04;
  const ox = 0.6, oy0 = h * 0.36, oy1 = h * 0.64;
  bx(ctx, -w / 2, w / 2, pl, h - top, zB, zF, C.face, "ftb");
  frontFrame(ctx, C.face, -w / 2, w / 2, pl, h - top, -ox, ox, oy0, oy1, zF);
  recess(ctx, -ox, ox, oy0, oy1, zF - 0.22, zF, C.face, null);
  // oak: plinth and top
  slab(ctx, -w / 2 - 0.02, w / 2 + 0.02, 0, pl, zB, zF + s.proj, C.mantel, 0.01);
  slab(ctx, -w / 2 - 0.02, w / 2 + 0.02, h - top, h, zB, zF + s.proj, C.mantel, 0.01);
  recess(ctx, -ox, ox, oy0, oy1, zF - 0.22, zF, null, C.soot);
  if (s.fire) embers(ctx, C.ember, C.flame, 0, oy0 + 0.01, zF - 0.12, ox * 1.9, (oy1 - oy0) * 0.7);
  // glass LAST
  qd(ctx, C.glass, [-ox, oy0, zF - 0.006], [ox, oy0, zF - 0.006], [ox, oy1, zF - 0.006], [-ox, oy1, zF - 0.006]);
}

// Wood stove: legs, chamfered body, wider top plate, glass door, log store, flue with collars.
export function stove(ctx, C, s) {
  const w = s.w, d = s.d, h = s.h, zF = d / 2, zB = -d / 2;
  const yLeg = 0.12, yBody = 0.8, yTop = 0.85;
  // black: legs, body (front face framed), top plate, door frame, flue
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(ctx, sx * (w / 2 - 0.05), sz * (d / 2 - 0.05), 0, yLeg + 0.01, 0.04, 0.04, 0.04, 0.04, 0.004, C.face, { start: true, end: false });
  const fx = 0.18, fy0 = 0.36, fy1 = 0.66; // firebox window
  const lx = 0.18, ly0 = yLeg + 0.02, ly1 = 0.27; // log store (same width, below)
  bx(ctx, -w / 2, w / 2, yLeg, yBody, zB, zF, C.face, "f");
  // front face = frame round the union of both openings + the band between them
  frontFrame(ctx, C.face, -w / 2, w / 2, yLeg, yBody, -lx, lx, ly0, fy1, zF);
  qd(ctx, C.face, [-lx, ly1, zF], [lx, ly1, zF], [lx, fy0, zF], [-lx, fy0, zF]);
  recess(ctx, -fx, fx, fy0, fy1, zF - 0.3, zF, C.face, null);
  recess(ctx, -lx, lx, ly0, ly1, zF - 0.28, zF, C.face, null);
  slab(ctx, -w / 2 - 0.015, w / 2 + 0.015, yBody, yTop, zB - 0.015, zF + 0.015, C.face, 0.01);
  // door leaf: four bars proud of the front, round the window
  const dz = zF + 0.02;
  bx(ctx, -fx - 0.05, fx + 0.05, fy1, fy1 + 0.05, zF, dz, C.face, "k");
  bx(ctx, -fx - 0.05, fx + 0.05, fy0 - 0.05, fy0, zF, dz, C.face, "k");
  bx(ctx, -fx - 0.05, -fx, fy0, fy1, zF, dz, C.face, "k");
  bx(ctx, fx, fx + 0.05, fy0, fy1, zF, dz, C.face, "k");
  // flue: collar, pipe, top collar
  ctx.smooth();
  G.loft(ctx, [oring(0, 0, yTop, 0.2, 0.2, 12), oring(0, 0, yTop + 0.05, 0.2, 0.2, 12), oring(0, 0, yTop + 0.06, 0.15, 0.15, 12)], { paint: C.face, capStart: false, capEnd: true });
  G.loft(ctx, [oring(0, 0, yTop + 0.05, 0.15, 0.15, 12), oring(0, 0, h, 0.15, 0.15, 12)], { paint: C.face, capStart: false, capEnd: true });
  G.loft(ctx, [oring(0, 0, h - 0.12, 0.15, 0.15, 12), oring(0, 0, h - 0.11, 0.19, 0.19, 12), oring(0, 0, h - 0.07, 0.19, 0.19, 12), oring(0, 0, h - 0.06, 0.15, 0.15, 12)], { paint: C.face, capStart: false, capEnd: false });
  ctx.flat();
  // logs in the store (wood)
  ctx.smooth();
  for (let i = 0; i < 3; i++) {
    const x = -0.11 + i * 0.11, y = ly0 + 0.045;
    G.tube(ctx, [x, y, zF - 0.02], [x, y, zF - 0.26], 0.04, 0.038, 8, [0, 1, 0], C.log);
  }
  ctx.flat();
  // soot faces of both recesses, then the steel handle on the door's right bar
  recess(ctx, -fx, fx, fy0, fy1, zF - 0.3, zF, null, C.soot);
  recess(ctx, -lx, lx, ly0, ly1, zF - 0.28, zF, null, C.soot);
  bx(ctx, fx + 0.015, fx + 0.035, 0.44, 0.58, dz, dz + 0.03, C.steel, "k");
  // fire behind the glass, then the pane LAST
  if (s.fire) embers(ctx, C.ember, C.flame, 0, fy0 + 0.01, zF - 0.17, fx * 1.8, (fy1 - fy0) * 0.75);
  qd(ctx, C.glass, [-fx, fy0, zF + 0.012], [fx, fy0, zF + 0.012], [fx, fy1, zF + 0.012], [-fx, fy1, zF + 0.012]);
}

// Rattan log basket with two rope handles; five upright logs poke above the rim.
export function logbasket(ctx, C, s) {
  const N = 16, R = s.w;
  const yRim = 0.36;
  const O = [oring(0, 0, 0, R * 0.8, R * 0.8, N), oring(0, 0, 0.04, R * 0.9, R * 0.9, N), oring(0, 0, yRim - 0.02, R, R, N), oring(0, 0, yRim, R, R, N)];
  const I = [oring(0, 0, yRim, R - 0.04, R - 0.04, N), oring(0, 0, 0.06, R * 0.78, R * 0.78, N)];
  shell(ctx, O, C.face, true, false);
  annulus(ctx, O[3], I[0], C.face);
  shell(ctx, I, C.face, false, true);
  ctx.smooth();
  for (const sx of [-1, 1]) {
    const x = sx * (R / 2 - 0.01);
    G.polyTube(ctx, [[x, yRim - 0.08, -0.07], [x + sx * 0.06, yRim + 0.02, -0.04], [x + sx * 0.06, yRim + 0.02, 0.04], [x, yRim - 0.08, 0.07]], 0.012, 8, [0, 1, 0], C.face);
  }
  // logs (wood walls, pale end grain)
  const P = [
    [0, 0, 0.05, 0.47],
    [0.1, 0.04, 0.045, 0.43],
    [-0.09, 0.06, 0.042, 0.5],
    [0.04, -0.1, 0.04, 0.45],
    [-0.06, -0.08, 0.038, 0.41],
  ];
  for (const l of P) G.loft(ctx, [oring(l[0], l[1], 0.06, l[2] * 2, l[2] * 2, 8), oring(l[0], l[1], l[3], l[2] * 2, l[2] * 2, 8)], { paint: C.log, capStart: false, capEnd: false });
  ctx.flat();
  for (const l of P) fanUp(ctx, oring(l[0], l[1], l[3], l[2] * 2, l[2] * 2, 8), C.grain);
}

// Mantel shelf in the wall frame: x ±0.70 · z 0→0.20 · y 0→0.06.
export function mantel(ctx, C, s) {
  slab(ctx, -s.w / 2, s.w / 2, 0, s.h, 0, s.d, C.mantel, 0.008);
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "brick";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    face: M.finish(ctx, p.finish, D.finish),
    mantel: M.finish(ctx, p.finish2, D.finish2),
    log: M.finish(ctx, part === "logbasket" || part === "stove" ? p.finish2 : "walnut", "walnut"),
    grain: M.finish(ctx, "pine", "pine"),
    hearth: M.finish(ctx, "stone", "stone"),
    soot: M.finish(ctx, "black", "black"),
    steel: M.finish(ctx, "steel", "steel"),
    ember: M.glow(ctx, 1.0, 0.42, 0.08, 1.6),
    flame: M.glow(ctx, 1.0, 0.72, 0.22, 1.3),
    glass: M.glass(ctx),
  };
  if (part === "stone") stone(ctx, C, s);
  else if (part === "modern") modern(ctx, C, s);
  else if (part === "stove") stove(ctx, C, s);
  else if (part === "logbasket") logbasket(ctx, C, s);
  else if (part === "mantel") mantel(ctx, C, s);
  else brick(ctx, C, s);
}

export { PARTS, DEF, MOUNT, size, dims, surface, manifest };
