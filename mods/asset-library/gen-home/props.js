// PROPS — HYLLA's small-prop family, ONE generator (09b §3.14). The marketplace half of the kit.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/props.js",
//                params: { part: "bookrow", n: 10, finish: "walnut", finish2: "navy" } }
//
// FRAMES (09b §1): `top` parts — feet at y 0, footprint centre, front +Z (x ±w/2 · z ±d/2 · y 0→h);
//   the layout adds the host's `surface`. Wall parts (frame, clock, mirror round, tv without stand) —
//   origin at the BACK-BOTTOM centre: x ±w/2 · z 0→+d · y 0→+h. The tall mirror is a `floor` part
//   leaning back 6° (params.lean). `dims` = TOTAL extent (handles, flames, the leaning glass).
// SCALE: plate ⌀0.27, mug 0.095, book 0.17–0.25, clock ⌀0.30, round mirror ⌀0.60, TV 55" = 1.23 wide.
//
//   part: "plates"    n 6 (4–8) stacked, ⌀0.27           part: "clock"     ⌀0.30 (wall 1.80 · stand: mantel top)
//   part: "bowls"     three nested, ⌀0.24                part: "mirror"    round ⌀0.60 (wall 1.20) · tall 0.40×1.50 (floor, lean 6°)
//   part: "mugs"      four, 2×2                          part: "candle"    n 3 (1|3) holders, lit flames
//   part: "bookstack" n 5 (3–7) tilted                   part: "tray"      0.45×0.30
//   part: "bookrow"   n 10 (6–14) between two bookends    part: "basket"    ⌀0.35 rattan, rope handles
//   part: "vase"      bottle · bulb (glass) · cylinder    part: "tv"        43|55|65" (0.97|1.23|1.45), stand or wall (1.00)
//   part: "frame"     small 0.30×0.40 · large 0.50×0.70 (wall 1.30 · stand: top)
//
// PARAMS: n (plates 4–8, bookstack 3–7, bookrow 6–14, candle 1|3) · shape (vase bottle|bulb|cylinder;
//   mirror round|tall) · size (frame small|large; tv 43|55|65) · stand bool (frame, clock, tv → top
//   mount with a foot) · lean bool (tall mirror) · lit bool (candle flames, tv picture) · h (vase
//   0.25–0.45) · finish / finish2 per part (see DEF). Ceramic, glass and the mirror face are fixed.
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule).
// DRAW GROUPS: ordered by albedo — finish, then finish2, then fixed paints, then glow, then glass /
//   mirror LAST.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("scripts/lib/geom.js");
const M = require("lib/home-mat.js");

const PARTS = ["plates", "bowls", "mugs", "bookstack", "bookrow", "vase", "frame", "clock", "mirror", "candle", "tray", "basket", "tv"];
const SHAPES = { vase: ["bottle", "bulb", "cylinder"], mirror: ["round", "tall"], frame: ["small", "large"] };
const TV = { 43: 0.97, 55: 1.23, 65: 1.45 };

const DEF = {
  plates: { n: 6, finish: "ceramic", finish2: "ceramic" },
  bowls: { finish: "ceramic", finish2: "sage" },
  mugs: { finish: "ceramic", finish2: "ceramic" },
  bookstack: { n: 5, finish: "navy", finish2: "sage" },
  bookrow: { n: 10, finish: "walnut", finish2: "navy" },
  vase: { shape: "bottle", h: 0.35, finish: "ceramic", finish2: "sage" },
  frame: { size: "small", stand: false, finish: "white", finish2: "oak" },
  clock: { stand: false, finish: "white", finish2: "oak" },
  mirror: { shape: "round", lean: true, finish: "oak", finish2: "oak" },
  candle: { n: 3, lit: true, finish: "white", finish2: "black" },
  tray: { finish: "black", finish2: "oak" },
  basket: { finish: "rattan", finish2: "rattan" },
  tv: { size: 55, stand: true, lit: true, finish: "black", finish2: "black" },
};

const D2R = Math.PI / 180;
const PLATE = 0.014; // one plate's stacked height
const BOOK3 = "leather-tan"; // the third book colour
const PICTURE = "linen-blue"; // what hangs in the frame

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}
export function pick(v, list, d) {
  return typeof v === "string" && list && list.indexOf(v) >= 0 ? v : d;
}
// Deterministic jitter in [0,1) from indices — used by both size() and geometry() so dims agree.
export function jit(i, k) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
// A row book's [thickness, height, depth].
export function book(i) {
  return [0.02 + jit(i, 1) * 0.025, 0.17 + jit(i, 2) * 0.08, 0.13 + jit(i, 3) * 0.03];
}

function size(part, p) {
  const D = DEF[part] || DEF.plates;
  p = p || {};
  const s = {
    shape: pick(p.shape, SHAPES[part], D.shape || ""),
    stand: p.stand === undefined ? !!D.stand : !!p.stand,
    lean: p.lean === undefined ? !!D.lean : !!p.lean,
    lit: p.lit === undefined ? !!D.lit : !!p.lit,
  };
  if (part === "plates") {
    s.n = clamp(Math.round(num(p.n, D.n)), 4, 8);
    s.w = s.d = 0.27;
    s.h = s.n * PLATE + 0.004;
  } else if (part === "bowls") {
    s.w = s.d = 0.24;
    s.h = 0.13;
  } else if (part === "mugs") {
    s.w = 0.3;
    s.d = 0.22;
    s.h = 0.095;
  } else if (part === "bookstack") {
    s.n = clamp(Math.round(num(p.n, D.n)), 3, 7);
    s.w = 0.26;
    s.d = 0.2;
    s.h = s.n * 0.03;
  } else if (part === "bookrow") {
    s.n = clamp(Math.round(num(p.n, D.n)), 6, 14);
    let w = 0.1, h = 0;
    for (let i = 0; i < s.n; i++) {
      const b = book(i);
      w += b[0];
      h = Math.max(h, b[1]);
    }
    s.w = w;
    s.d = 0.18;
    s.h = h;
  } else if (part === "vase") {
    s.h = clamp(num(p.h, D.h), 0.25, 0.45);
    s.w = s.d = s.shape === "bulb" ? s.h * 0.88 : s.shape === "cylinder" ? 0.1 : s.h * 0.4;
  } else if (part === "frame") {
    s.size = pick(p.size, SHAPES.frame, D.size);
    s.w = s.size === "large" ? 0.5 : 0.3;
    s.h = s.size === "large" ? 0.7 : 0.4;
    s.d = s.stand ? 0.12 : 0.03;
  } else if (part === "clock") {
    s.w = 0.3;
    s.h = s.stand ? 0.34 : 0.3;
    s.d = s.stand ? 0.1 : 0.05;
  } else if (part === "mirror") {
    if (s.shape === "tall") {
      s.w = 0.4;
      s.h = s.lean ? 1.5 * Math.cos(6 * D2R) : 1.5;
      s.d = s.lean ? 0.03 + 1.5 * Math.sin(6 * D2R) : 0.03;
    } else {
      s.w = s.h = 0.6;
      s.d = 0.03;
    }
  } else if (part === "candle") {
    s.n = num(p.n, D.n) >= 2 ? 3 : 1;
    s.w = s.n === 3 ? 0.34 : 0.08;
    s.d = 0.08;
    s.h = (s.n === 3 ? 0.22 : 0.16) + 0.1 + (s.lit ? 0.035 : 0);
  } else if (part === "tray") {
    s.w = 0.45;
    s.d = 0.3;
    s.h = 0.045;
  } else if (part === "basket") {
    s.w = s.d = 0.35;
    s.h = 0.34;
  } else {
    // tv
    const key = String(Math.round(num(p.size, D.size)));
    s.size = TV[key] ? Number(key) : D.size;
    s.w = TV[String(s.size)];
    const sh = (s.w - 0.02) * 9 / 16 + 0.02;
    s.h = s.stand ? sh + 0.06 : sh;
    s.d = s.stand ? 0.22 : 0.045;
  }
  return s;
}

function dims(part, p) {
  const s = size(part, p);
  return [s.w, s.d, s.h];
}

// Mount per part (the row picks); wall parts carry 09b's mountY.
function mountOf(part, p) {
  const s = size(part, p);
  if (part === "frame") return s.stand ? { mount: "top", mountY: 0 } : { mount: "wall", mountY: 1.3 };
  if (part === "clock") return s.stand ? { mount: "top", mountY: 0 } : { mount: "wall", mountY: 1.8 };
  if (part === "mirror") return s.shape === "tall" ? { mount: "floor", mountY: 0 } : { mount: "wall", mountY: 1.2 };
  if (part === "tv") return s.stand ? { mount: "top", mountY: 0 } : { mount: "wall", mountY: 1.0 };
  return { mount: "top", mountY: 0 };
}

function manifest() {
  const parts = {};
  const add = (key, p) => {
    const m = mountOf(key.split("-")[0], p);
    parts[key] = { dims: dims(key.split("-")[0], p), surface: 0, mount: m.mount, mountY: m.mountY, defaults: Object.assign({}, DEF[key.split("-")[0]], p) };
  };
  for (const k of PARTS) add(k, {});
  add("vase-bulb", { shape: "bulb" });
  add("vase-cylinder", { shape: "cylinder" });
  add("frame-large", { size: "large" });
  add("frame-stand", { stand: true });
  add("clock-stand", { stand: true });
  add("mirror-tall", { shape: "tall" });
  add("candle-1", { n: 1 });
  add("tv-wall", { stand: false });
  return { family: "props", script: "scripts/asset-library/gen-home/props.js", parts, shapes: SHAPES, tv: TV };
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
  G.boxZ(ctx, x0, x1, y0, y1, z0, z1, bevel || 0.004, paint);
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
const ID = xf(0, 0, 0, 0, 0, 0);

// A box in an arbitrary frame: corner-pair in local coords.
export function fbx(ctx, f, x0, x1, y0, y1, z0, z1, paint, skip) {
  const s = skip || "";
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  const nnn = f(xa, ya, za), pnn = f(xb, ya, za), npn = f(xa, yb, za), ppn = f(xb, yb, za);
  const nnp = f(xa, ya, zb), pnp = f(xb, ya, zb), npp = f(xa, yb, zb), ppp = f(xb, yb, zb);
  if (s.indexOf("f") < 0) qd(ctx, paint, nnp, pnp, ppp, npp);
  if (s.indexOf("k") < 0) qd(ctx, paint, pnn, nnn, npn, ppn);
  if (s.indexOf("r") < 0) qd(ctx, paint, pnp, pnn, ppn, ppp);
  if (s.indexOf("l") < 0) qd(ctx, paint, nnn, nnp, npp, npn);
  if (s.indexOf("t") < 0) qd(ctx, paint, npp, ppp, ppn, npn);
  if (s.indexOf("b") < 0) qd(ctx, paint, nnn, pnn, pnp, nnp);
}
// A +Z-facing quad in a frame: local x0..x1 × y0..y1 at local z.
export function fquad(ctx, f, paint, x0, x1, y0, y1, z) {
  qd(ctx, paint, f(x0, y0, z), f(x1, y0, z), f(x1, y1, z), f(x0, y1, z));
}
// A +Z-facing frame of four quads round an inner rect (mat round a picture).
export function fring(ctx, f, paint, X0, X1, Y0, Y1, x0, x1, y0, y1, z) {
  qd(ctx, paint, f(X0, Y0, z), f(x0, Y0, z), f(x0, Y1, z), f(X0, Y1, z));
  qd(ctx, paint, f(x1, Y0, z), f(X1, Y0, z), f(X1, Y1, z), f(x1, Y1, z));
  qd(ctx, paint, f(x0, Y0, z), f(x1, Y0, z), f(x1, y0, z), f(x0, y0, z));
  qd(ctx, paint, f(x0, y1, z), f(x1, y1, z), f(x1, Y1, z), f(x0, Y1, z));
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
// Ring in a plane facing +Z (clock rims, round mirrors): CCW about +z, centre (cx, cy), at depth z.
export function zring(cx, cy, z, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
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
export function fan(ctx, ring, paint) {
  for (let k = 1; k < ring.length - 1; k++) tr(ctx, paint, ring[0], ring[k], ring[k + 1]);
}
export function shell(ctx, rings, paint, capStart, capEnd) {
  ctx.smooth();
  G.loft(ctx, rings, { paint, capStart: !!capStart, capEnd: !!capEnd });
  ctx.flat();
}
// Round vessel: outer rings up, rim annulus, inner rings down to a floor.
export function vessel(ctx, outer, inner, outerPaint, innerPaint, capBottom) {
  if (outer.length > 1) shell(ctx, outer, outerPaint, capBottom !== false, false);
  annulus(ctx, outer[outer.length - 1], inner[0], innerPaint);
  shell(ctx, inner, innerPaint, false, true);
}

// ── parts ──────────────────────────────────────────────────────────────────
export function plates(ctx, C, s) {
  const N = 12, r = s.w / 2;
  for (let i = 0; i < s.n; i++) {
    const y0 = i * PLATE;
    shell(ctx, [oring(0, 0, y0, r * 1.6, r * 1.6, N), oring(0, 0, y0 + PLATE - 0.002, r * 2, r * 2, N), oring(0, 0, y0 + PLATE + 0.004, r * 1.96, r * 1.96, N)], C.a, i === 0, false);
    // the well: a shallow dish inside the rim
    fan(ctx, oring(0, 0, y0 + PLATE + 0.001, r * 1.7, r * 1.7, N), C.a);
    annulus(ctx, oring(0, 0, y0 + PLATE + 0.004, r * 1.96, r * 1.96, N), oring(0, 0, y0 + PLATE + 0.001, r * 1.7, r * 1.7, N), C.a);
  }
}

// Three nested bowls: the outer bowl's shell, then rim + cavity for each.
export function bowls(ctx, C, s) {
  const N = 10, R = s.w / 2;
  const B = [
    [0, R, 0.07],
    [0.03, R * 0.85, 0.06],
    [0.055, R * 0.7, 0.055],
  ];
  for (let i = 0; i < 3; i++) {
    const y0 = B[i][0], r = B[i][1], h = B[i][2], yTop = y0 + h;
    // the outer bowl gets a full shell; the nested two show only the lip that stands above the bowl below
    const outer = i === 0 ? [oring(0, 0, y0, r * 0.7, r * 0.7, N), oring(0, 0, y0 + 0.01, r * 0.8, r * 0.8, N), oring(0, 0, yTop - 0.02, r * 1.95, r * 1.95, N), oring(0, 0, yTop, r * 2, r * 2, N)] : [oring(0, 0, yTop - 0.025, r * 1.9, r * 1.9, N), oring(0, 0, yTop, r * 2, r * 2, N)];
    const inner = i === 0 ? [oring(0, 0, yTop, r * 1.84, r * 1.84, N), oring(0, 0, yTop - 0.025, r * 1.7, r * 1.7, N), oring(0, 0, y0 + 0.012, r * 0.6, r * 0.6, N)] : [oring(0, 0, yTop, r * 1.84, r * 1.84, N), oring(0, 0, y0 + 0.012, r * 0.6, r * 0.6, N)];
    vessel(ctx, outer, inner, C.a, C.b, i === 0);
  }
}

// Four mugs in a 2×2, handles out on ±X; the top disc is the coffee.
export function mugs(ctx, C, s) {
  const N = 8, r = 0.04, h = s.h, p = 0.055;
  const P = [
    [-p, -p, -1],
    [p, -p, 1],
    [-p, p, -1],
    [p, p, 1],
  ];
  for (const m of P) shell(ctx, [oring(m[0], m[1], 0, r * 1.9, r * 1.9, N), oring(m[0], m[1], h, r * 2, r * 2, N)], C.a, true, false);
  ctx.smooth();
  for (const m of P) {
    const x = m[0] + m[2] * r;
    G.polyTube(ctx, [[x, h * 0.74, m[1]], [x + m[2] * 0.035, h * 0.52, m[1]], [x, h * 0.3, m[1]]], 0.0065, 6, [0, 0, 1], C.b);
  }
  ctx.flat();
  // the coffee: a dark disc closing the rim (a full mug reads at any distance)
  for (const m of P) fan(ctx, oring(m[0], m[1], h, r * 2, r * 2, N), C.coffee);
}

// A tilted stack of n books, three cover colours grouped, cream page blocks last.
export function bookstack(ctx, C, s) {
  const n = s.n;
  const dim = (i) => [0.2 - i * 0.008 + jit(i, 4) * 0.02, 0.026 + jit(i, 5) * 0.008, 0.14 - i * 0.004 + jit(i, 6) * 0.02];
  const frames = [];
  let y = 0;
  for (let i = 0; i < n; i++) {
    const d = dim(i);
    frames.push({ f: xf(jit(i, 7) * 0.02 - 0.01, y, jit(i, 8) * 0.02 - 0.01, (jit(i, 9) - 0.5) * 24, 0, 0), d });
    y += d[1];
  }
  // each book = two boards + a spine (cover colour) round a page block (cream) inset 4 mm
  const bd = 0.004;
  for (let c = 0; c < 3; c++) {
    const paint = c === 0 ? C.a : c === 1 ? C.b : C.c;
    for (let i = c; i < n; i += 3) {
      const F = frames[i], d = F.d;
      fbx(ctx, F.f, -d[0] / 2, d[0] / 2, 0, bd, -d[2] / 2, d[2] / 2, paint, "b");
      fbx(ctx, F.f, -d[0] / 2, d[0] / 2, d[1] - bd, d[1], -d[2] / 2, d[2] / 2, paint);
      fbx(ctx, F.f, -d[0] / 2, d[0] / 2, bd, d[1] - bd, -d[2] / 2, -d[2] / 2 + 0.006, paint, "ftb");
    }
  }
  for (let i = 0; i < n; i++) {
    const F = frames[i], d = F.d;
    fbx(ctx, F.f, -d[0] / 2 + bd, d[0] / 2 - bd, bd, d[1] - bd, -d[2] / 2 + 0.006, d[2] / 2 - bd, C.pages, "ktb");
  }
}

// A row of n upright books between two L-shaped bookends (finish); covers cycle three colours.
export function bookrow(ctx, C, s) {
  const n = s.n, w = s.w, end = 0.05;
  let x = -w / 2 + end;
  const B = [];
  for (let i = 0; i < n; i++) {
    const b = book(i);
    B.push({ x0: x, x1: x + b[0], h: b[1], d: b[2] });
    x += b[0];
  }
  // finish: the two bookends
  for (const sx of [-1, 1]) {
    const x0 = sx * (w / 2) - (sx > 0 ? end : 0), x1 = x0 + end;
    bx(ctx, x0, x1, 0, 0.008, -0.09, 0.09, C.a);
    const ux0 = sx > 0 ? x1 - 0.008 : x0, ux1 = ux0 + 0.008;
    bx(ctx, ux0, ux1, 0.008, 0.16, -0.085, 0.085, C.a, "b");
  }
  // covers in three grouped colours
  for (let c = 0; c < 3; c++) {
    const paint = c === 0 ? C.b : c === 1 ? C.c : C.d;
    for (let i = c; i < n; i += 3) {
      const b = B[i];
      bx(ctx, b.x0 + 0.001, b.x1 - 0.001, 0.008, 0.008 + b.h, -b.d / 2 + 0.01, b.d / 2 + 0.01, paint, "tb");
    }
  }
  // page blocks: the top of every book is its page edge
  for (const b of B) qd(ctx, C.pages, [b.x0 + 0.001, 0.008 + b.h, b.d / 2 + 0.01], [b.x1 - 0.001, 0.008 + b.h, b.d / 2 + 0.01], [b.x1 - 0.001, 0.008 + b.h, -b.d / 2 + 0.01], [b.x0 + 0.001, 0.008 + b.h, -b.d / 2 + 0.01]);
}

// Vase: bottle (ceramic, finish2 neck band) · bulb (glass) · cylinder (finish, open top).
export function vase(ctx, C, s) {
  const h = s.h, N = 12;
  if (s.shape === "bulb") {
    shell(ctx, [oring(0, 0, 0, h * 0.24, h * 0.24, N), oring(0, 0, h * 0.28, h * 0.8, h * 0.8, N), oring(0, 0, h * 0.5, h * 0.88, h * 0.88, N), oring(0, 0, h * 0.8, h * 0.5, h * 0.5, N), oring(0, 0, h, h * 0.28, h * 0.28, N)], C.glass, true, false);
    annulus(ctx, oring(0, 0, h, h * 0.28, h * 0.28, N), oring(0, 0, h, h * 0.22, h * 0.22, N), C.glass);
    return;
  }
  if (s.shape === "cylinder") {
    const r = s.w / 2;
    vessel(ctx, [oring(0, 0, 0, r * 1.9, r * 1.9, N), oring(0, 0, 0.006, r * 2, r * 2, N), oring(0, 0, h, r * 2, r * 2, N)], [oring(0, 0, h, r * 1.8, r * 1.8, N), oring(0, 0, 0.012, r * 1.8, r * 1.8, N)], C.a, C.a, true);
    return;
  }
  const r = s.w / 2;
  shell(ctx, [oring(0, 0, 0, r * 1.4, r * 1.4, N), oring(0, 0, h * 0.08, r * 2, r * 2, N), oring(0, 0, h * 0.5, r * 2, r * 2, N), oring(0, 0, h * 0.72, r * 0.9, r * 0.9, N)], C.a, true, false);
  shell(ctx, [oring(0, 0, h * 0.72, r * 0.9, r * 0.9, N), oring(0, 0, h * 0.94, r * 0.7, r * 0.7, N), oring(0, 0, h, r * 0.8, r * 0.8, N)], C.b, false, false);
  annulus(ctx, oring(0, 0, h, r * 0.8, r * 0.8, N), oring(0, 0, h, r * 0.5, r * 0.5, N), C.b);
  fan(ctx, oring(0, 0, h - 0.01, r * 0.5, r * 0.5, N), C.soot);
}

// Picture frame: moulding (finish2), mat (finish) round a picture. Wall frame, or standing tilted
// 8° on a strut (`stand`).
export function frame(ctx, C, s) {
  const w = s.w, h = s.h, t = 0.025, m = 0.025;
  const tilt = s.stand ? -8 : 0;
  const f = s.stand ? xf(0, 0, 0.045, 0, tilt, 0) : ID;
  // finish: the mat
  fring(ctx, f, C.a, -w / 2 + m, w / 2 - m, m, h - m, -w / 2 + m + w * 0.12, w / 2 - m - w * 0.12, m + h * 0.12, h - m - h * 0.12, t - 0.006);
  // finish2: four moulding bars, back board
  fbx(ctx, f, -w / 2, w / 2, h - m, h, 0, t, C.b, "k");
  fbx(ctx, f, -w / 2, w / 2, 0, m, 0, t, C.b, "k");
  fbx(ctx, f, -w / 2, -w / 2 + m, m, h - m, 0, t, C.b, "k");
  fbx(ctx, f, w / 2 - m, w / 2, m, h - m, 0, t, C.b, "k");
  fquad(ctx, f, C.b, -w / 2, w / 2, 0, h, 0);
  if (s.stand) {
    // strut: from the frame's back at 0.20 up, down to the ground 4 cm behind the footprint centre
    ctx.smooth();
    G.tube(ctx, [0, 0, -0.04], f(0, 0.2, 0), 0.01, 0.008, 6, [0, 0, 1], C.b);
    ctx.flat();
  }
  // the picture
  fquad(ctx, f, C.c, -w / 2 + m + w * 0.12, w / 2 - m - w * 0.12, m + h * 0.12, h - m - h * 0.12, t - 0.006);
}

// Round wall clock — or a mantel clock on a foot (`stand`). Rim (finish2), face (finish), black hands.
export function clock(ctx, C, s) {
  const R = 0.15, N = 20, depth = 0.05;
  const cy = s.stand ? 0.19 : R, cz = s.stand ? -depth / 2 : 0;
  const O0 = zring(0, cy, cz, R, N), O1 = zring(0, cy, cz + depth, R, N);
  const I1 = zring(0, cy, cz + depth, R - 0.014, N), I0 = zring(0, cy, cz + 0.012, R - 0.014, N);
  // finish: the face
  fan(ctx, I0, C.a);
  // finish2: rim outer wall, front annulus, inner wall, back disc (+ foot)
  ctx.smooth();
  G.loft(ctx, [O0, O1], { paint: C.b, capStart: true, capEnd: false });
  annulus(ctx, O1, I1, C.b);
  G.loft(ctx, [I1, I0], { paint: C.b, capStart: false, capEnd: false });
  ctx.flat();
  if (s.stand) slab(ctx, -0.1, 0.1, 0, 0.04, -0.05, 0.05, C.b, 0.006);
  // black: four ticks, two hands, the centre boss
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const tx = Math.cos(a) * (R - 0.03), ty = cy + Math.sin(a) * (R - 0.03);
    bx(ctx, tx - 0.006, tx + 0.006, ty - 0.006, ty + 0.006, cz + 0.012, cz + 0.016, C.soot, "k");
  }
  for (const hd of [
    [0.105, 100, 0.005],
    [0.075, -20, 0.007],
  ]) {
    const f = xf(0, cy, cz + 0.014, 0, 0, hd[1]);
    fbx(ctx, f, -hd[2], hd[2], -0.015, hd[0], 0, 0.004, C.soot, "k");
  }
  ctx.smooth();
  G.tube(ctx, [0, cy, cz + 0.012], [0, cy, cz + 0.022], 0.008, 0.007, 8, [0, 1, 0], C.soot);
  ctx.flat();
}

// Mirror: round (wall) — oak rim ring, glass face; tall (floor) — framed panel leaning 6° back.
export function mirror(ctx, C, s) {
  if (s.shape === "tall") {
    const w = 0.4, h = 1.5, t = 0.03, bar = 0.035;
    // pivot at the front-bottom edge so the leaning glass stays inside the footprint
    const f = s.lean ? xf(0, 0.002, s.d / 2 - t / 2, 0, -6, 0) : xf(0, 0, 0, 0, 0, 0);
    // finish: back board (its front is inside the frame)
    fbx(ctx, f, -w / 2, w / 2, 0, h, -t / 2, -t / 2 + 0.008, C.a, "f");
    // finish2: frame bars
    fbx(ctx, f, -w / 2, w / 2, h - bar, h, -t / 2, t / 2, C.b, "k");
    fbx(ctx, f, -w / 2, w / 2, 0, bar, -t / 2, t / 2, C.b, "k");
    fbx(ctx, f, -w / 2, -w / 2 + bar, bar, h - bar, -t / 2, t / 2, C.b, "k");
    fbx(ctx, f, w / 2 - bar, w / 2, bar, h - bar, -t / 2, t / 2, C.b, "k");
    // mirror face, 6 mm inside the frame's front
    fquad(ctx, f, C.mirror, -w / 2 + bar, w / 2 - bar, bar, h - bar, t / 2 - 0.006);
    return;
  }
  const R = 0.3, N = 24, depth = 0.03, cy = R;
  const O0 = zring(0, cy, 0, R, N), O1 = zring(0, cy, depth, R, N), I1 = zring(0, cy, depth, R - 0.03, N), I0 = zring(0, cy, 0.018, R - 0.03, N);
  ctx.smooth();
  G.loft(ctx, [O0, O1], { paint: C.b, capStart: true, capEnd: false });
  annulus(ctx, O1, I1, C.b);
  G.loft(ctx, [I1, I0], { paint: C.b, capStart: false, capEnd: false });
  ctx.flat();
  fan(ctx, I0, C.mirror);
}

// Candlesticks: black holders of three heights, white candles, lit flames (glow).
export function candle(ctx, C, s) {
  const H = s.n === 3 ? [[-0.11, 0.16], [0, 0.22], [0.11, 0.1]] : [[0, 0.16]];
  const N = 8;
  // finish: candles
  for (const c of H) shell(ctx, [oring(c[0], 0, c[1], 0.024, 0.024, N), oring(c[0], 0, c[1] + 0.1, 0.024, 0.024, N)], C.a, false, true);
  // finish2: holders — base disc, stem, drip cup
  for (const c of H) {
    shell(ctx, [oring(c[0], 0, 0, 0.06, 0.06, N), oring(c[0], 0, 0.008, 0.07, 0.07, N), oring(c[0], 0, 0.018, 0.04, 0.04, N)], C.b, true, true);
    ctx.smooth();
    G.tube(ctx, [c[0], 0.018, 0], [c[0], c[1] - 0.012, 0], 0.008, 0.007, 6, [0, 0, 1], C.b);
    G.tube(ctx, [c[0], c[1] - 0.012, 0], [c[0], c[1] + 0.006, 0], 0.012, 0.017, 6, [0, 0, 1], C.b);
    ctx.flat();
  }
  // glow: flames — two crossed cards, both windings
  if (s.lit)
    for (const c of H) {
      const y0 = c[1] + 0.1, T = [c[0], y0 + 0.035, 0];
      tr(ctx, C.flame, [c[0] - 0.008, y0, 0], [c[0] + 0.008, y0, 0], T);
      tr(ctx, C.flame, [c[0] + 0.008, y0, 0], [c[0] - 0.008, y0, 0], T);
      tr(ctx, C.flame, [c[0], y0, 0.008], [c[0], y0, -0.008], T);
      tr(ctx, C.flame, [c[0], y0, -0.008], [c[0], y0, 0.008], T);
    }
}

// Tray: oak base + rims (finish2), lacquered inner floor (finish); handle cut-outs in the end rims.
export function tray(ctx, C, s) {
  const w = s.w, d = s.d, b = 0.012, rim = 0.012, h = s.h;
  bx(ctx, -w / 2, w / 2, 0, b, -d / 2, d / 2, C.b, "t");
  bx(ctx, -w / 2, w / 2, b, h, d / 2 - rim, d / 2, C.b, "b");
  bx(ctx, -w / 2, w / 2, b, h, -d / 2, -d / 2 + rim, C.b, "b");
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? w / 2 - rim : -w / 2, x1 = x0 + rim;
    bx(ctx, x0, x1, b, h, -d / 2 + rim, -0.05, C.b, "b");
    bx(ctx, x0, x1, b, h, 0.05, d / 2 - rim, C.b, "b");
    bx(ctx, x0, x1, b, b + 0.012, -0.05, 0.05, C.b, "b");
  }
  qd(ctx, C.a, [-w / 2 + rim, b, d / 2 - rim], [w / 2 - rim, b, d / 2 - rim], [w / 2 - rim, b, -d / 2 + rim], [-w / 2 + rim, b, -d / 2 + rim]);
}

// Rattan basket: tapered body, rim, cavity, two rope handles.
export function basket(ctx, C, s) {
  const N = 12, R = s.w / 2, yRim = 0.27;
  vessel(
    ctx,
    [oring(0, 0, 0, R * 1.6, R * 1.6, N), oring(0, 0, 0.03, R * 1.75, R * 1.75, N), oring(0, 0, yRim, R * 2, R * 2, N)],
    [oring(0, 0, yRim, R * 1.85, R * 1.85, N), oring(0, 0, 0.02, R * 1.5, R * 1.5, N)],
    C.a,
    C.a,
    true
  );
  ctx.smooth();
  for (const sx of [-1, 1]) {
    const x = sx * (R - 0.02);
    G.polyTube(ctx, [[x, yRim - 0.05, -0.05], [x + sx * 0.03, yRim + 0.05, -0.02], [x + sx * 0.03, yRim + 0.05, 0.02], [x, yRim - 0.05, 0.05]], 0.009, 6, [0, 1, 0], C.b);
  }
  ctx.flat();
}

// TV: chamfered black body, screen (lit glow or dark navy), foot + neck (finish2) or a wall bracket.
export function tv(ctx, C, s) {
  const w = s.w, bezel = 0.01, sh = (w - 2 * bezel) * 9 / 16, bh = sh + 2 * bezel, t = 0.03;
  const y0 = s.stand ? 0.06 : 0, z0 = s.stand ? -t / 2 : 0.015;
  slab(ctx, -w / 2, w / 2, y0, y0 + bh, z0, z0 + t, C.a, 0.004);
  if (s.stand) {
    slab(ctx, -0.22, 0.22, 0, 0.015, -0.11, 0.11, C.b, 0.004);
    bx(ctx, -0.07, 0.07, 0.015, y0 + 0.02, -0.02, 0.01, C.b, "b");
  } else {
    bx(ctx, -0.12, 0.12, y0 + bh * 0.3, y0 + bh * 0.7, 0, 0.015, C.b, "k");
  }
  const scr = s.lit ? C.screen : C.dark;
  // the glass stands 3 mm proud of the bezel (never coplanar with the body's front)
  const zs = z0 + t + 0.003;
  qd(ctx, scr, [-w / 2 + bezel, y0 + bezel, zs], [w / 2 - bezel, y0 + bezel, zs], [w / 2 - bezel, y0 + bh - bezel, zs], [-w / 2 + bezel, y0 + bh - bezel, zs]);
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "plates";
  const D = DEF[part];
  const s = size(part, p);
  const C = {
    a: M.finish(ctx, p.finish, D.finish),
    b: M.finish(ctx, p.finish2, D.finish2),
    c: M.finish(ctx, part === "frame" ? PICTURE : BOOK3, "leather-tan"),
    d: M.finish(ctx, "sage", "sage"),
    pages: M.finish(ctx, "linen-oat", "linen-oat"),
    coffee: M.finish(ctx, "walnut", "walnut"),
    soot: M.finish(ctx, "black", "black"),
    dark: M.finish(ctx, "navy", "navy"),
    screen: M.glow(ctx, 0.55, 0.62, 0.72, 0.9),
    flame: M.glow(ctx, 1.0, 0.8, 0.35, 1.6),
    mirror: M.mirror(ctx),
    glass: M.glass(ctx),
  };
  if (part === "bowls") bowls(ctx, C, s);
  else if (part === "mugs") mugs(ctx, C, s);
  else if (part === "bookstack") bookstack(ctx, C, s);
  else if (part === "bookrow") bookrow(ctx, C, s);
  else if (part === "vase") vase(ctx, C, s);
  else if (part === "frame") frame(ctx, C, s);
  else if (part === "clock") clock(ctx, C, s);
  else if (part === "mirror") mirror(ctx, C, s);
  else if (part === "candle") candle(ctx, C, s);
  else if (part === "tray") tray(ctx, C, s);
  else if (part === "basket") basket(ctx, C, s);
  else if (part === "tv") tv(ctx, C, s);
  else plates(ctx, C, s);
}

export { PARTS, DEF, SHAPES, TV, size, dims, mountOf, manifest };
