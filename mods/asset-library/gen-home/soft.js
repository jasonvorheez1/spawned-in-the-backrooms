// SOFT — HYLLA's textile family, ONE generator (09b §3.10). Rugs, curtains, cushions, the throw
// over the sofa arm and the bedding roll.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-home/soft.js",
//                params: { part: "rug", w: 1.6, d: 2.3, pattern: "stripe", finish: "wool-cream", finish2: "wool-rust" } }
//
// FRAMES (09b §1): rugs (`rug`, `round`, `runner`) build in the `floor` frame — origin on the ground at
//   the footprint centre, +Y up, front +Z, body x ±w/2 · z ±d/2 · y 0→0.02 (the pile). `cushion` and
//   `bedroll` are `top` parts — feet at y 0, footprint centre; the layout adds the host's `surface`.
//   `curtains` is the ONE hanging wall part: origin = the rail axis on the wall plane (mountY 2.50),
//   x ±w/2 · z 0→+d out into the room · **y 0→−drop** (params.hang === true — the layout reads it from
//   row.params); the 3 cm rail is the tolerated overshoot above 0. `throw` drapes over a sofa arm:
//   origin = the arm crest (the contact point), the folded pad lies 0→+0.025 on top and the two
//   drapes hang BELOW the origin (outer −drop, inner −drop2) — also declared `hang: true` in DEF so
//   any hang-aware reader knows the body spans below the origin; the layout parents it to the sofa
//   entry and offsets to the +X arm crest (09d).
// `dims` = TOTAL extent: rug fringe inside the stated d, curtain finials, throw drapes + tassels,
//   bedroll straps.
// SCALE: rug 1.60×2.30 (2.00×3.00), round ⌀1.30 (2.00), runner 0.80×2.50, curtain pair rail 2.80 drop
//   2.50, cushion 0.50 sq × 0.12, throw over a 0.20 arm, bedroll ⌀0.29 × 0.70.
//
//   part: "rug"       w×d rect rug, pile 0.02, fringe on the short ends     part: "cushion"  0.50 sq × 0.12 puffed square
//   part: "round"     ⌀w round rug, pile 0.02                              part: "throw"    folded throw over the +X arm
//   part: "runner"    0.80×2.50 hall runner, fringe                         part: "bedroll"  rolled bedding, two leather straps
//   part: "curtains"  pleated pair on a rail, wall 2.50, hangs to the floor
//
// PARAMS: w, d (rug/runner; round takes w = ⌀) · pattern "plain"|"stripe"|"border"|"diamond" (tint bands
//   in finish2 — one albedo, the wool mint; on the curtain `stripe`/`diamond` = pleat-wise bands,
//   `border` = a hem band; on the cushion `border` = a piped seam, `diamond` = ticking) · fringe bool
//   (rug/runner) · drop, panel, gather (curtains: rail w, drop, fabric width per panel, gathered fraction)
//   · arm, drop, drop2, len (throw) · len (bedroll) · h (cushion) · finish (ground; wool-cream, curtains
//   linen-oat) · finish2 (pattern colour; wool-rust, curtain rail black).
//
// COLLISION: no collider() export — physics is a catalog-row property (09b §5 rule: every soft row is
//   "none" — rugs are under 0.30, cushions/throw/bedroll are `top`, curtains hug the wall).
// DRAW GROUPS: ordered by albedo — finish + finish2 always share ONE albedo (finish2 is coerced to the
//   ground's texture group, see patternName — tint alternates per face, the texture run never splits),
//   then the fixed rail (black lacquer) / straps (leather-tan) after it.
// Requires only builtin/geom and lib/home-mat.js (mod-scoped → asset-library/lib/home-mat.js).

const G = require("builtin/geom");
const M = require("lib/home-mat.js");

const PARTS = ["rug", "round", "runner", "curtains", "cushion", "throw", "bedroll"];
const PATTERNS = ["plain", "stripe", "border", "diamond"];

// Shipped defaults per part — the catalog row is these plus a name and a price.
const DEF = {
  rug: { w: 1.6, d: 2.3, pattern: "stripe", fringe: true, finish: "wool-cream", finish2: "wool-rust" },
  round: { w: 1.3, pattern: "border", finish: "wool-cream", finish2: "wool-rust" },
  runner: { w: 0.8, d: 2.5, pattern: "stripe", fringe: true, finish: "wool-cream", finish2: "wool-rust" },
  curtains: { w: 2.8, drop: 2.5, panel: 1.4, gather: 0.5, hang: true, pattern: "plain", finish: "linen-oat", finish2: "linen-blue" },
  cushion: { w: 0.5, h: 0.12, pattern: "stripe", finish: "wool-cream", finish2: "wool-rust" },
  throw: { arm: 0.2, drop: 0.35, drop2: 0.12, len: 0.4, hang: true, pattern: "stripe", finish: "wool-cream", finish2: "wool-rust" },
  bedroll: { len: 0.7, pattern: "stripe", finish: "wool-cream", finish2: "wool-rust" },
};

const PILE = 0.02; // rug thickness
const FRINGE = 0.06; // fringe run at each short end, inside the stated d
const RAIL_Z = 0.09; // curtain rail axis standoff from the wall
const RAIL_R = 0.015;
const PLEAT_A = 0.05; // pleat amplitude (half depth)
const PLEAT_L = 0.14; // pleat wavelength
const CLOTH = 0.012; // curtain sheet thickness
const THROW_T = 0.025; // folded throw thickness
const THROW_RC = 0.04; // fold radius over the arm edge
const TASSEL = 0.04; // throw hem tassels
const ROLL_R = 0.135; // bedroll radius
const STRAP = 0.008; // strap proud of the roll
const FINIAL = 0.05; // rail finial length past each end
const STRAP_TEX = "leather-tan"; // bedroll straps — fixed
const RAIL_TEX = "black"; // curtain rail + finials + brackets — fixed

// Pattern bands are TINT bands on the ground's own albedo (09b §3.10 "one albedo"): a pattern colour
// from another texture group would start a new texture run on every alternating face (measured:
// a linen/lacquer curtain hem → 66 draw calls, booth truncated at 64 pieces). So finish2 is honoured
// only when it shares the ground's group; otherwise the group's contrast partner stands in.
const CONTRAST = { wool: ["wool-rust", "wool-cream"], linen: ["linen-blue", "linen-oat"], leather: ["leather-black", "leather-tan"], paint: ["navy", "white"], wood: ["walnut", "birch"] };
export function patternName(groundName, patName) {
  const g = M.resolveName(groundName);
  const q = M.resolveName(patName);
  if (g && q && g !== q && M.group(g) === M.group(q)) return q;
  const pair = CONTRAST[M.group(g)];
  if (!pair) return g;
  return pair[0] === g ? pair[1] : pair[0];
}

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

// Resolved size params for a part (what geometry() builds and what manifest() reports).
function size(part, p) {
  const D = DEF[part] || DEF.rug;
  p = p || {};
  const s = { pattern: pick(p.pattern, PATTERNS, D.pattern) };
  if (part === "rug" || part === "runner") {
    s.w = clamp(num(p.w, D.w), 0.5, 4.0);
    s.d = clamp(num(p.d, D.d), 0.8, 5.0);
    s.h = PILE;
    s.fringe = bool(p.fringe, D.fringe);
  } else if (part === "round") {
    s.w = s.d = clamp(num(p.w, D.w), 0.6, 3.0);
    s.h = PILE;
  } else if (part === "curtains") {
    const rail = clamp(num(p.w, D.w), 1.0, 5.0);
    s.rail = rail;
    s.drop = clamp(num(p.drop, D.drop), 1.0, 3.6);
    s.panel = clamp(num(p.panel, D.panel), 0.6, 2.5);
    s.gather = clamp(num(p.gather, D.gather), 0.3, 1.0);
    s.occ = Math.min(s.panel * s.gather, rail / 2 - 0.02); // width one gathered panel occupies
    s.hang = true;
    s.w = rail + 2 * FINIAL;
    s.d = RAIL_Z + PLEAT_A + CLOTH / 2 + 0.004;
    s.h = s.drop;
  } else if (part === "cushion") {
    s.w = s.d = clamp(num(p.w, D.w), 0.3, 0.7);
    s.h = clamp(num(p.h, D.h), 0.06, 0.2);
  } else if (part === "throw") {
    s.arm = clamp(num(p.arm, D.arm), 0.1, 0.4);
    s.drop = clamp(num(p.drop, D.drop), 0.15, 0.6);
    s.drop2 = clamp(num(p.drop2, D.drop2), 0.05, 0.4);
    s.len = clamp(num(p.len, D.len), 0.3, 0.6);
    s.hang = true;
    s.w = s.arm + 2 * THROW_T + 0.035; // inner flare 0.015, outer flare 0.02
    s.d = s.len;
    s.h = s.drop + TASSEL + THROW_T; // hem tassels below, pad above the origin
  } else {
    // bedroll
    s.len = clamp(num(p.len, D.len), 0.4, 1.0);
    s.w = s.len;
    s.d = s.h = 2 * (ROLL_R + STRAP);
  }
  return s;
}

// [w, d, h] in the part's frame — the catalog's `dims` (total extent).
function dims(part, p) {
  const s = size(part, p);
  return [s.w, s.d, s.h];
}

// Mount per part (the row picks); curtains carry 09b's rail height.
function mountOf(part) {
  if (part === "curtains") return { mount: "wall", mountY: 2.5, hang: true };
  if (part === "cushion" || part === "throw" || part === "bedroll") return { mount: "top", mountY: 0, hang: part === "throw" };
  return { mount: "floor", mountY: 0, hang: false };
}

function manifest() {
  const parts = {};
  const add = (key, base, p) => {
    const m = mountOf(base);
    parts[key] = { dims: dims(base, p), surface: 0, mount: m.mount, mountY: m.mountY, hang: m.hang, defaults: Object.assign({}, DEF[base], p) };
  };
  for (const k of PARTS) add(k, k, {});
  add("rug-200", "rug", { w: 2.0, d: 3.0, pattern: "border" });
  add("round-200", "round", { w: 2.0, pattern: "diamond" });
  add("cushion-border", "cushion", { pattern: "border" });
  return { family: "soft", script: "scripts/asset-library/gen-home/soft.js", parts, patterns: PATTERNS };
}

// ── vector bits ─────────────────────────────────────────────────────────────
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

// ── emitters (townscape.js pattern) ─────────────────────────────────────────
export function qd(ctx, paint, a, b, c, d) {
  if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
}
export function tr(ctx, paint, a, b, c) {
  if (paint) paint((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
  ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}
// Outward-checked quad / tri: winding derived from the `out` hint, never eyeballed per face.
export function qo(ctx, paint, a, b, c, d, out) {
  const n = cross(sub(b, a), sub(c, a));
  if (dot(n, out) < 0) qd(ctx, paint, a, d, c, b);
  else qd(ctx, paint, a, b, c, d);
}
export function to(ctx, paint, a, b, c, out) {
  const n = cross(sub(b, a), sub(c, a));
  if (dot(n, out) < 0) tr(ctx, paint, a, c, b);
  else tr(ctx, paint, a, b, c);
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

// Thick sheet: a centreline polyline `pts` (all in one plane ⟂ E) extruded along unit axis E from
// e0 to e1, thickness t offset ±t/2 along the in-plane normal. Emits both faces, both extrusion
// ends (as strips — never a fan over a wavy outline) and the two hems. opts.eCuts subdivides the
// extrusion (pattern bands across it); opts.segPaint(i, nSeg) picks a paint per segment (bands along
// the curve). Curtain panels, the throw, the bedroll lip all ride this.
export function sheet(ctx, paint, pts, E, e0, e1, t, opts) {
  const o = opts || {};
  const n = pts.length;
  if (n < 2) return;
  const cuts = [e0].concat(o.eCuts || [], [e1]);
  const half = t / 2;
  const nor = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    nor.push(norm(cross(norm(sub(b, a)), E)));
  }
  const P = (i, side, e) => [pts[i][0] + nor[i][0] * half * side + E[0] * e, pts[i][1] + nor[i][1] * half * side + E[1] * e, pts[i][2] + nor[i][2] * half * side + E[2] * e];
  const negE = [-E[0], -E[1], -E[2]];
  for (let i = 0; i < n - 1; i++) {
    const pt = o.segPaint ? o.segPaint(i, n - 1) : paint;
    const outA = [nor[i][0] + nor[i + 1][0], nor[i][1] + nor[i + 1][1], nor[i][2] + nor[i + 1][2]];
    const outB = [-outA[0], -outA[1], -outA[2]];
    for (let k = 0; k < cuts.length - 1; k++) {
      const ea = cuts[k], eb = cuts[k + 1];
      qo(ctx, pt, P(i, 1, ea), P(i + 1, 1, ea), P(i + 1, 1, eb), P(i, 1, eb), outA);
      qo(ctx, pt, P(i, -1, ea), P(i + 1, -1, ea), P(i + 1, -1, eb), P(i, -1, eb), outB);
    }
    qo(ctx, pt, P(i, 1, e0), P(i + 1, 1, e0), P(i + 1, -1, e0), P(i, -1, e0), negE);
    qo(ctx, pt, P(i, 1, e1), P(i + 1, 1, e1), P(i + 1, -1, e1), P(i, -1, e1), E);
  }
  const p0 = o.segPaint ? o.segPaint(0, n - 1) : paint;
  const p1 = o.segPaint ? o.segPaint(n - 2, n - 1) : paint;
  const t0 = sub(pts[0], pts[1]), t1 = sub(pts[n - 1], pts[n - 2]);
  qo(ctx, p0, P(0, 1, e0), P(0, 1, e1), P(0, -1, e1), P(0, -1, e0), t0);
  qo(ctx, p1, P(n - 1, 1, e0), P(n - 1, 1, e1), P(n - 1, -1, e1), P(n - 1, -1, e0), t1);
}

// Resample a polyline at an even step so per-segment bands land crisp.
export function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    let s = step - carry;
    while (s < L) {
      const u = s / L;
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]);
      s += step;
    }
    carry = L - (s - step);
  }
  const last = pts[pts.length - 1], prev = out[out.length - 1];
  if (Math.hypot(last[0] - prev[0], last[1] - prev[1], last[2] - prev[2]) > step * 0.35) out.push(last);
  else out[out.length - 1] = last;
  return out;
}

// ── rug bits ────────────────────────────────────────────────────────────────
// Pile shell for a rect rug: 4 walls (0 → h−e) + 4 chamfer quads to the inset top. No bottom
// (floor-flush faces only z-fight the floor). The top is the pattern's.
export function pileShell(ctx, x0, x1, z0, z1, h, e, paint) {
  const ym = h - e;
  qo(ctx, paint, [x0, 0, z1], [x1, 0, z1], [x1, ym, z1], [x0, ym, z1], [0, 0, 1]);
  qo(ctx, paint, [x0, 0, z0], [x1, 0, z0], [x1, ym, z0], [x0, ym, z0], [0, 0, -1]);
  qo(ctx, paint, [x1, 0, z0], [x1, 0, z1], [x1, ym, z1], [x1, ym, z0], [1, 0, 0]);
  qo(ctx, paint, [x0, 0, z0], [x0, 0, z1], [x0, ym, z1], [x0, ym, z0], [-1, 0, 0]);
  qo(ctx, paint, [x0, ym, z1], [x1, ym, z1], [x1 - e, h, z1 - e], [x0 + e, h, z1 - e], [0, 1, 1]);
  qo(ctx, paint, [x0, ym, z0], [x1, ym, z0], [x1 - e, h, z0 + e], [x0 + e, h, z0 + e], [0, 1, -1]);
  qo(ctx, paint, [x1, ym, z0], [x1, ym, z1], [x1 - e, h, z1 - e], [x1 - e, h, z0 + e], [1, 1, 0]);
  qo(ctx, paint, [x0, ym, z0], [x0, ym, z1], [x0 + e, h, z1 - e], [x0 + e, h, z0 + e], [-1, 1, 0]);
}

// One up-facing top cell.
export function cell(ctx, paint, x0, x1, z0, z1, y) {
  qo(ctx, paint, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0]);
}

// The rect rug's top, partitioned so every pattern edge is a real edge (no proud strips, no z-fight).
export function rugTop(ctx, C, pat, x0, x1, z0, z1, y) {
  const w = x1 - x0, d = z1 - z0;
  if (pat === "stripe") {
    let n = Math.round(d / 0.2);
    if (n % 2 === 0) n += 1;
    n = Math.max(3, n);
    for (let i = 0; i < n; i++) cell(ctx, i % 2 === 1 ? C.b : C.a, x0, x1, z0 + (d * i) / n, z0 + (d * (i + 1)) / n, y);
    return;
  }
  if (pat === "plain") {
    cell(ctx, C.a, x0, x1, z0, z1, y);
    return;
  }
  const b = Math.min(0.12, 0.2 * Math.min(w, d));
  const xs = [x0, x0 + b, x1 - b, x1], zs = [z0, z0 + b, z1 - b, z1];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== 1 || j !== 1) cell(ctx, C.b, xs[i], xs[i + 1], zs[j], zs[j + 1], y);
  if (pat === "border") {
    cell(ctx, C.a, xs[1], xs[2], zs[1], zs[2], y);
    return;
  }
  // diamond: the field's mid-edge diamond in finish2, four corner triangles in finish
  const cx = (xs[1] + xs[2]) / 2, cz = (zs[1] + zs[2]) / 2;
  const L = [xs[1], y, cz], R = [xs[2], y, cz], N = [cx, y, zs[1]], S = [cx, y, zs[2]], O = [cx, y, cz];
  const up = [0, 1, 0];
  to(ctx, C.b, O, L, N, up);
  to(ctx, C.b, O, N, R, up);
  to(ctx, C.b, O, R, S, up);
  to(ctx, C.b, O, S, L, up);
  to(ctx, C.a, [xs[1], y, zs[1]], N, L, up);
  to(ctx, C.a, [xs[2], y, zs[1]], R, N, up);
  to(ctx, C.a, [xs[2], y, zs[2]], S, R, up);
  to(ctx, C.a, [xs[1], y, zs[2]], L, S, up);
}

// Fringe: a 4 mm sheet past a short end, sawtooth outer edge. dir = +1 (+z end) | −1.
export function fringe(ctx, paint, x0, x1, zEdge, dir, run) {
  const y = 0.004, tooth = 0.03, band = run - tooth;
  const za = zEdge, zb = zEdge + dir * band, zc = zEdge + dir * run;
  cell(ctx, paint, x0, x1, Math.min(za, zb), Math.max(za, zb), y);
  const n = Math.max(6, Math.round((x1 - x0) / 0.05));
  const pitch = (x1 - x0) / n;
  for (let k = 0; k < n; k++) {
    const xa = x0 + k * pitch, xb = xa + pitch;
    to(ctx, paint, [xa, y, zb], [xb, y, zb], [(xa + xb) / 2, y, zc], [0, 1, 0]);
  }
}

export function rug(ctx, C, s) {
  const e = 0.008, h = s.h;
  const fr = s.fringe ? FRINGE : 0;
  const x0 = -s.w / 2, x1 = s.w / 2, z0 = -s.d / 2 + fr, z1 = s.d / 2 - fr;
  pileShell(ctx, x0, x1, z0, z1, h, e, C.a);
  rugTop(ctx, C, s.pattern, x0 + e, x1 - e, z0 + e, z1 - e, h);
  if (fr) {
    fringe(ctx, C.a, x0 + 0.02, x1 - 0.02, z1, 1, fr);
    fringe(ctx, C.a, x0 + 0.02, x1 - 0.02, z0, -1, fr);
  }
}

// Round rug: wall ring + chamfer ring, then a fan and annuli whose radii are the pattern's.
export function roundRug(ctx, C, s) {
  const R = s.w / 2, h = s.h, e = 0.008, N = 28;
  const Ri = R - e;
  const P = (r, a, y) => [Math.cos(a) * r, y, -Math.sin(a) * r];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
    const out = [Math.cos(am), 0, -Math.sin(am)];
    qo(ctx, C.a, P(R, a0, 0), P(R, a1, 0), P(R, a1, h - e), P(R, a0, h - e), out);
    qo(ctx, C.a, P(R, a0, h - e), P(R, a1, h - e), P(Ri, a1, h), P(Ri, a0, h), [out[0], 1, out[2]]);
  }
  let stops; // [radius fraction, paint] from the centre out
  const pat = s.pattern;
  if (pat === "stripe") stops = [[0.2, C.a], [0.4, C.b], [0.6, C.a], [0.8, C.b], [1, C.a]];
  else if (pat === "border") stops = [[0.84, C.a], [1, C.b]];
  else if (pat === "diamond") stops = [[0.3, C.b], [0.84, C.a], [1, C.b]];
  else stops = [[1, C.a]];
  let rPrev = 0;
  for (const st of stops) {
    const r = st[0] * Ri, paint = st[1];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      if (rPrev === 0) to(ctx, paint, [0, h, 0], P(r, a0, h), P(r, a1, h), [0, 1, 0]);
      else qo(ctx, paint, P(rPrev, a0, h), P(r, a0, h), P(r, a1, h), P(rPrev, a1, h), [0, 1, 0]);
    }
    rPrev = r;
  }
}

// ── curtains ────────────────────────────────────────────────────────────────
// One gathered panel from the rail end inward: a sinusoidal pleat wave in plan, lofted from the
// rod pocket (y −0.012) to 5 mm off the floor. side = −1 (left) | +1 (right).
export function panel(ctx, C, s, side) {
  const occ = s.occ;
  const nW = Math.max(2, Math.round(occ / PLEAT_L));
  const N = nW * 6;
  const xEdge = side * (s.rail / 2 - 0.02);
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    pts.push([xEdge - side * occ * u, 0, RAIL_Z + PLEAT_A * Math.sin(Math.PI * 2 * u * nW)]);
  }
  const yTop = -0.012, yBot = -s.drop + 0.005;
  const pat = s.pattern;
  const opts = {};
  if (pat === "stripe") opts.segPaint = (i) => (Math.floor((i / N) * nW * 2) % 2 === 1 ? C.b : C.a);
  else if (pat === "diamond") opts.segPaint = (i) => (Math.floor((i / N) * nW) % 2 === 1 ? C.b : C.a);
  else if (pat === "border") opts.eCuts = [yBot + 0.18];
  const paint = pat === "border" ? (x, y, z) => (y < yBot + 0.18 ? C.b : C.a)(x, y, z) : C.a;
  ctx.smooth();
  sheet(ctx, paint, pts, [0, 1, 0], yBot, yTop, CLOTH, opts);
  ctx.flat();
}

export function curtains(ctx, C, s) {
  // finish group: the two panels
  panel(ctx, C, s, -1);
  panel(ctx, C, s, 1);
  // fixed group (black lacquer): rail, finials, brackets
  const hw = s.rail / 2;
  ctx.smooth();
  G.tube(ctx, [-hw, 0, RAIL_Z], [hw, 0, RAIL_Z], RAIL_R, RAIL_R, 8, [0, 1, 0], C.rail);
  for (const sd of [-1, 1]) {
    const F = (dx, r) => ({ c: [sd * (hw + dx), 0, RAIL_Z], f: [sd, 0, 0], up: [0, 1, 0], poly: G.oval(r * 2, r * 2, 0, 0, 8, 1) });
    G.loftFrames(ctx, [F(0, RAIL_R), F(0.012, 0.026), F(0.03, 0.022), F(FINIAL, 0.004)], C.rail, { capStart: false, capEnd: true });
  }
  ctx.flat();
  for (const sd of [-1, 1]) {
    const x = sd * (hw - 0.14);
    bx(ctx, x - 0.008, x + 0.008, -0.03, -0.008, 0.006, RAIL_Z, C.rail, "k");
    bx(ctx, x - 0.02, x + 0.02, -0.05, 0.012, 0, 0.008, C.rail, "k");
  }
}

// ── cushion ─────────────────────────────────────────────────────────────────
// Puffed square: superellipse stations lofted up y, open bottom (host-flush), fan top.
export function cushion(ctx, C, s) {
  const w = s.w, h = s.h, N = 16;
  const st = [[0, 0.88], [0.1, 1.0], [0.18, 1.04], [0.26, 1.02], [0.55, 0.98], [0.78, 0.86], [0.93, 0.66], [1, 0.3]];
  const frames = st.map((q) => ({ c: [0, q[0] * h, 0], f: [0, 1, 0], up: [0, 0, -1], poly: G.oval(w * q[1], w * q[1], 0, 0, N, 0.72) }));
  const pat = s.pattern;
  let paint = C.a;
  if (pat === "stripe") paint = (x, y, z) => ((y >= 0.1 * h && y < 0.26 * h) || (y >= 0.55 * h && y < 0.78 * h) ? C.b : C.a)(x, y, z);
  else if (pat === "border") paint = (x, y, z) => (y >= 0.1 * h && y < 0.26 * h ? C.b : C.a)(x, y, z);
  else if (pat === "diamond")
    paint = (x, y, z) => {
      const a = Math.atan2(-z, x) + Math.PI * 2;
      const k = Math.floor((a / (Math.PI * 2)) * N + 0.5);
      return (k % 2 === 1 ? C.b : C.a)(x, y, z);
    };
  ctx.smooth();
  G.loftFrames(ctx, frames, paint, { capStart: false, capEnd: true });
  ctx.flat();
}

// ── throw ───────────────────────────────────────────────────────────────────
// Folded throw over the +X arm: a Π-shaped thick sheet in the x-y plane extruded along z. Origin =
// the arm crest; the pad lies 0→THROW_T on top, drapes hang to −drop (outer, +x) and −drop2 (inner).
export function throw_(ctx, C, s) {
  const t = THROW_T, half = t / 2, rc = THROW_RC;
  const xi = -(s.arm / 2 + half), xo = s.arm / 2 + half, yT = half;
  const pts = [[xi - 0.015, -s.drop2, 0], [xi, -s.drop2 + 0.06, 0], [xi, yT - rc, 0]];
  for (let k = 1; k < 4; k++) {
    const a = Math.PI - (k * Math.PI) / 8;
    pts.push([xi + rc + rc * Math.cos(a), yT - rc + rc * Math.sin(a), 0]);
  }
  pts.push([xi + rc, yT, 0], [xo - rc, yT, 0]);
  for (let k = 1; k < 4; k++) {
    const a = Math.PI / 2 - (k * Math.PI) / 8;
    pts.push([xo - rc + rc * Math.cos(a), yT - rc + rc * Math.sin(a), 0]);
  }
  pts.push([xo, yT - rc, 0], [xo, -s.drop + 0.08, 0], [xo + 0.02, -s.drop, 0]);
  const line = resample(pts, 0.04);
  const nSeg = line.length - 1;
  const pat = s.pattern;
  const opts = {};
  if (pat === "stripe") opts.segPaint = (i) => (Math.floor(i / 2) % 2 === 1 ? C.b : C.a);
  else if (pat === "border") opts.segPaint = (i) => (i < 2 || i >= nSeg - 2 ? C.b : C.a);
  else if (pat === "diamond") opts.segPaint = (i) => (i % 3 === 1 ? C.b : C.a);
  ctx.smooth();
  sheet(ctx, C.a, line, [0, 0, 1], -s.len / 2, s.len / 2, t, opts);
  ctx.flat();
  // tassels below both hems — thin triangles hanging in the hem's plane (double-sided render)
  const tas = (x, yH, out) => {
    const n = Math.max(6, Math.round(s.len / 0.04));
    const pitch = s.len / n;
    for (let k = 0; k < n; k++) {
      const za = -s.len / 2 + k * pitch, zb = za + pitch;
      to(ctx, C.a, [x, yH, za], [x, yH, zb], [x, yH - TASSEL, (za + zb) / 2], out);
    }
  };
  tas(xo + 0.02, -s.drop, [1, 0, 0]);
  tas(xi - 0.015, -s.drop2, [-1, 0, 0]);
}

// ── bedroll ─────────────────────────────────────────────────────────────────
// Rolled bedding lying along x: banded cylinder, layered end caps, the outer wrap's lip, two leather
// straps. Feet at y 0 (the roll's underside).
export function bedroll(ctx, C, s) {
  const r = ROLL_R, L = s.len, cy = r, N = 12, slices = 5;
  const pat = s.pattern;
  // body — sliced along x so bands are real faces
  const frames = [];
  for (let i = 0; i <= slices; i++) frames.push({ c: [-L / 2 + (L * i) / slices, cy, 0], f: [1, 0, 0], up: [0, 1, 0], poly: G.oval(r * 2, r * 2, 0, 0, N, 1) });
  let body = C.a;
  if (pat === "stripe" || pat === "diamond") body = (x, y, z) => (Math.floor(((x + L / 2) / L) * slices) % 2 === 1 ? C.b : C.a)(x, y, z);
  else if (pat === "border") body = (x, y, z) => (Math.abs(x) > L / 2 - L / slices ? C.b : C.a)(x, y, z);
  ctx.smooth();
  G.loftFrames(ctx, frames, body, { capStart: false, capEnd: false });
  ctx.flat();
  // end caps — concentric layers (the rolled turns seen end-on)
  const layers = pat === "plain" ? [[1, C.a]] : pat === "border" ? [[0.7, C.a], [1, C.b]] : [[0.35, C.a], [0.68, C.b], [1, C.a]];
  for (const sd of [-1, 1]) {
    const xe = sd * L / 2;
    const Q = (rad, a) => [xe, cy + rad * Math.sin(a), rad * Math.cos(a)];
    const out = [sd, 0, 0];
    let rPrev = 0;
    for (const ly of layers) {
      const rr = ly[0] * r;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        if (rPrev === 0) to(ctx, ly[1], [xe, cy, 0], Q(rr, a0), Q(rr, a1), out);
        else qo(ctx, ly[1], Q(rPrev, a0), Q(rr, a0), Q(rr, a1), Q(rPrev, a1), out);
      }
      rPrev = rr;
    }
  }
  // the outer wrap's lip — a ridge along the roll at 215°
  const th = (215 * Math.PI) / 180, rad = [0, Math.sin(th), Math.cos(th)];
  const LF = (x) => ({ c: [x, cy + rad[1] * (r + 0.006), rad[2] * (r + 0.006)], f: [1, 0, 0], up: rad, poly: G.rrect(0.035, 0.014, 0, 0, 0.003) });
  G.loftFrames(ctx, [LF(-L / 2 + 0.012), LF(L / 2 - 0.012)], C.a);
  // leather straps
  const rs = r + STRAP, sw = 0.04;
  for (const sd of [-1, 1]) {
    const xc = sd * (L / 2 - 0.14);
    const Q = (rad2, a, x) => [x, cy + rad2 * Math.sin(a), rad2 * Math.cos(a)];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
      const out = [0, Math.sin(am), Math.cos(am)];
      qo(ctx, C.strap, Q(rs, a0, xc - sw / 2), Q(rs, a1, xc - sw / 2), Q(rs, a1, xc + sw / 2), Q(rs, a0, xc + sw / 2), out);
      qo(ctx, C.strap, Q(r, a0, xc - sw / 2), Q(rs, a0, xc - sw / 2), Q(rs, a1, xc - sw / 2), Q(r, a1, xc - sw / 2), [-1, 0, 0]);
      qo(ctx, C.strap, Q(r, a0, xc + sw / 2), Q(rs, a0, xc + sw / 2), Q(rs, a1, xc + sw / 2), Q(r, a1, xc + sw / 2), [1, 0, 0]);
    }
  }
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const part = PARTS.indexOf(String(p.part)) >= 0 ? String(p.part) : "rug";
  const D = DEF[part];
  const s = size(part, p);
  const ground = M.resolveName(p.finish) || M.resolveName(D.finish) || "oak";
  const C = {
    a: M.finish(ctx, ground, D.finish),
    b: M.finish(ctx, patternName(ground, M.resolveName(p.finish2) || D.finish2), D.finish2),
    strap: M.finish(ctx, STRAP_TEX, STRAP_TEX),
    rail: M.finish(ctx, RAIL_TEX, RAIL_TEX),
  };
  if (part === "round") roundRug(ctx, C, s);
  else if (part === "runner") rug(ctx, C, s);
  else if (part === "curtains") curtains(ctx, C, s);
  else if (part === "cushion") cushion(ctx, C, s);
  else if (part === "throw") throw_(ctx, C, s);
  else if (part === "bedroll") bedroll(ctx, C, s);
  else rug(ctx, C, s);
}

export { PARTS, DEF, PATTERNS, size, dims, mountOf, manifest };
