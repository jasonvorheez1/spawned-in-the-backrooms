// SMALL TRUTHS — the debris kit of the Frontline set, as ONE generator.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-military/debris.js",
//                params: { part: "ammo-crate", count: 4 } }
//
// FRAME: origin sits ON THE GROUND at the piece's footprint centre; +Y is up and
//        the long axis of anything long runs on +Z. Yaw the spec row to aim it.
// SCALE: real 1944 kit measured against a 1.8 m player — a jerrycan is 470 mm
//        tall, an oil drum 880, an ammo crate 860 long, a rifle casing 72.
// GROUND: the scatter parts (shell-casings, ration-tins, crate-pile) read
//        ctx.groundY per item, so a patch lies in the mud of whatever it is on and
//        re-drapes itself when the terrain under it is cut.
//
//   part: "ammo-crate"       count 1-6      stack of lidded .30-cal crates
//   part: "jerrycans"        count 1-6      X-panelled fuel cans, last one tipped
//   part: "helmet"           dent 0-1       one dented lid, brim down in the mud
//   part: "entrenching-tool" lean deg       folding spade struck into the ground
//   part: "stretcher"        blood 0-1      poles + sagging canvas, stained
//   part: "oil-drum"         punctures, tipped   rusted 200-litre drum, holed
//   part: "wire-spool"       —              cable drum, wire trailing off it
//   part: "crate-pile"       count 3-10     collapsed heap of broken crates
//   part: "shell-casings"    count, radius  brass scatter patch + spent 75s
//   part: "ration-tins"      count 3-14     tins, some opened, some crushed
//
// COLLISION: the pieces you'd bark a shin on carry a box (crates, cans, drum,
// spool, pile, stretcher). The litter — helmet, spade, casings, tins — emits
// nothing from collider(), an authored "walk through it" rather than a fallback.

const G = require("builtin/geom");

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

const TEX = {
  wood: "/cdn/moodboard-realistic-gritty/texture-armory-board-oak.png",
  steel: "/cdn/moodboard-realistic-gritty/texture-armory-steel-plate.png",
  rust: "/cdn/moodboard-realistic-gritty/texture-debris-steel-rusted-1944.png",
  canvas: "/cdn/moodboard-realistic-gritty/texture-debris-canvas-duck-1944.png",
};

// ── paint ───────────────────────────────────────────────────────────────────
// CDN albedo + seeded per-face grit, so no two boards of a crate read alike.
// Tints are winter 1944: wet pine, olive drab gone chalky, oxide-red rust.
export function palette(ctx) {
  const s = (o) => G.surface(ctx, o);
  return {
    crate: s({ tex: TEX.wood, r: 0.44, g: 0.34, b: 0.21, rough: 0.95, jitter: 0.22, freq: 3.4 }),
    crateRaw: s({ tex: TEX.wood, r: 0.57, g: 0.46, b: 0.31, rough: 0.93, jitter: 0.24, freq: 5.2 }),
    plank: s({ tex: TEX.wood, r: 0.37, g: 0.29, b: 0.19, rough: 0.97, jitter: 0.26, freq: 4.4 }),
    haft: s({ tex: TEX.wood, r: 0.47, g: 0.36, b: 0.23, rough: 0.88, jitter: 0.16, freq: 7.5 }),
    stencil: s({ tex: TEX.wood, r: 0.72, g: 0.7, b: 0.61, rough: 0.9, jitter: 0.12, freq: 6 }),
    olive: s({ tex: TEX.steel, r: 0.25, g: 0.27, b: 0.18, metal: 0.25, rough: 0.78, jitter: 0.18, freq: 5.5 }),
    oliveWorn: s({ tex: TEX.steel, r: 0.31, g: 0.32, b: 0.24, metal: 0.38, rough: 0.66, jitter: 0.24, freq: 9 }),
    steel: s({ tex: TEX.steel, r: 0.46, g: 0.47, b: 0.5, metal: 0.82, rough: 0.52, jitter: 0.16, freq: 8 }),
    steelDark: s({ tex: TEX.steel, r: 0.24, g: 0.24, b: 0.26, metal: 0.7, rough: 0.62, jitter: 0.18, freq: 10 }),
    rust: s({ tex: TEX.rust, r: 0.38, g: 0.21, b: 0.12, metal: 0.42, rough: 0.92, jitter: 0.3, freq: 4.5 }),
    rustDeep: s({ tex: TEX.rust, r: 0.19, g: 0.11, b: 0.07, metal: 0.3, rough: 1, jitter: 0.28, freq: 7 }),
    brass: s({ tex: TEX.steel, r: 0.66, g: 0.52, b: 0.22, metal: 0.9, rough: 0.34, jitter: 0.2, freq: 11 }),
    brassDull: s({ tex: TEX.steel, r: 0.44, g: 0.36, b: 0.18, metal: 0.75, rough: 0.55, jitter: 0.24, freq: 13 }),
    canvas: s({ tex: TEX.canvas, r: 0.45, g: 0.43, b: 0.33, rough: 0.96, jitter: 0.18, freq: 3.6 }),
    canvasDirty: s({ tex: TEX.canvas, r: 0.31, g: 0.29, b: 0.22, rough: 0.98, jitter: 0.22, freq: 5.5 }),
    blood: s({ tex: TEX.canvas, r: 0.2, g: 0.055, b: 0.045, rough: 0.8, jitter: 0.22, freq: 6.5 }),
    bloodOld: s({ tex: TEX.canvas, r: 0.12, g: 0.055, b: 0.05, rough: 0.9, jitter: 0.2, freq: 8 }),
    mud: s({ tex: TEX.rust, r: 0.22, g: 0.19, b: 0.15, rough: 1, jitter: 0.24, freq: 5 }),
    rope: s({ tex: TEX.canvas, r: 0.5, g: 0.43, b: 0.29, rough: 1, jitter: 0.2, freq: 9 }),
    wire: s({ tex: TEX.steel, r: 0.3, g: 0.3, b: 0.31, metal: 0.75, rough: 0.62, jitter: 0.2, freq: 12 }),
    dark: s({ tex: TEX.rust, r: 0.06, g: 0.055, b: 0.05, rough: 1, jitter: 0.1, freq: 6 }),
  };
}

// ── frames ──────────────────────────────────────────────────────────────────
// One winding law for the whole file: an orthonormal basis with R x U = F, all
// cross-sections CCW in (u, v), rings ordered along +F. Every wall quad then
// faces outward and both caps wind correctly — nothing eyeballs a normal.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function rotAxis(v, axis, deg) {
  const a = deg * D2R;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const x = v[0];
  const y = v[1];
  const z = v[2];
  const ux = axis[0];
  const uy = axis[1];
  const uz = axis[2];
  const d = x * ux + y * uy + z * uz;
  return [x * c + (uy * z - uz * y) * s + ux * d * (1 - c), y * c + (uz * x - ux * z) * s + uy * d * (1 - c), z * c + (ux * y - uy * x) * s + uz * d * (1 - c)];
}

// Degrees. yaw about +Y, then pitch about the new right, then roll about forward.
export function basis(yaw, pitch, roll) {
  let R = [1, 0, 0];
  let U = [0, 1, 0];
  let F = [0, 0, 1];
  if (yaw) {
    R = rotAxis(R, U, yaw);
    F = rotAxis(F, U, yaw);
  }
  if (pitch) {
    U = rotAxis(U, R, pitch);
    F = rotAxis(F, R, pitch);
  }
  if (roll) {
    R = rotAxis(R, F, roll);
    U = rotAxis(U, F, roll);
  }
  return { R, U, F };
}

// F pointing straight up — the axis every lathe (drum, tin, helmet) stands on.
export function upright(yaw) {
  return basis(yaw, -90, 0);
}

export function at(C, B, u, v, d) {
  return [C[0] + B.R[0] * u + B.U[0] * v + B.F[0] * d, C[1] + B.R[1] * u + B.U[1] * v + B.F[1] * d, C[2] + B.R[2] * u + B.U[2] * v + B.F[2] * d];
}

// ── emitters ────────────────────────────────────────────────────────────────

// Stitch ring A to ring B (B further along +F). Outward winding is (a, b, c, d).
export function stitch(ctx, A, B, paint, opts) {
  const o = opts || {};
  const n = A.length;
  for (let i = 0; i < n; i++) {
    if (o.skip && o.skip(i)) continue;
    const j = (i + 1) % n;
    const a = A[i];
    const b = A[j];
    const c = B[j];
    const d = B[i];
    if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
    if (o.flip) ctx.quad(a[0], a[1], a[2], d[0], d[1], d[2], c[0], c[1], c[2], b[0], b[1], b[2]);
    else ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  }
}

export function cap(ctx, ring, paint, reverse) {
  const n = ring.length;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += ring[i][0];
    cy += ring[i][1];
    cz += ring[i][2];
  }
  cx /= n;
  cy /= n;
  cz /= n;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    if (paint) paint((cx + a[0] + b[0]) / 3, (cy + a[1] + b[1]) / 3, (cz + a[2] + b[2]) / 3);
    if (reverse) ctx.tri(cx, cy, cz, b[0], b[1], b[2], a[0], a[1], a[2]);
    else ctx.tri(cx, cy, cz, a[0], a[1], a[2], b[0], b[1], b[2]);
  }
}

// sections: [{ d, poly }] ascending in d, constant point count.
export function loftAt(ctx, C, B, sections, paint, opts) {
  const o = opts || {};
  const rings = sections.map((s) => s.poly.map((p) => at(C, B, p[0], p[1], s.d)));
  for (let i = 0; i < rings.length - 1; i++) stitch(ctx, rings[i], rings[i + 1], paint, o);
  if (o.capStart !== false) cap(ctx, rings[0], paint, !o.flip);
  if (o.capEnd !== false) cap(ctx, rings[rings.length - 1], paint, !!o.flip);
  return rings;
}

// A block chamfered on all twelve edges: w spans R, h spans U, l spans F.
export function block(ctx, C, B, w, h, l, bev, paint) {
  const b = Math.min(bev, w * 0.35, h * 0.35, l * 0.35);
  const full = G.rrect(w, h, 0, 0, b);
  const inset = G.rrect(Math.max(w - 2 * b, w * 0.15), Math.max(h - 2 * b, h * 0.15), 0, 0, b * 0.5);
  loftAt(
    ctx,
    C,
    B,
    [
      { d: -l / 2, poly: inset },
      { d: -l / 2 + b, poly: full },
      { d: l / 2 - b, poly: full },
      { d: l / 2, poly: inset },
    ],
    paint,
  );
}

export function ringPoly(r, sides, mod, t) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TAU;
    const rr = mod ? mod(a, t, r) : r;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return pts;
}

// profile: [[d, radius], ...] ascending in d. Returns the world rings.
export function lathe(ctx, C, B, profile, sides, paint, opts) {
  const o = opts || {};
  const rings = profile.map((p) => ringPoly(p[1], sides, o.mod, p[0]).map((q) => at(C, B, q[0], q[1], p[0])));
  for (let i = 0; i < rings.length - 1; i++) {
    stitch(ctx, rings[i], rings[i + 1], paint, { flip: o.flip, skip: o.skip ? (k) => o.skip(i, k) : null });
  }
  if (o.capStart) cap(ctx, rings[0], paint, !o.flip);
  if (o.capEnd) cap(ctx, rings[rings.length - 1], paint, !!o.flip);
  return rings;
}

// ── ammo crate ──────────────────────────────────────────────────────────────
const CRATE = { L: 0.86, W: 0.35, H: 0.3 };

export function crate(ctx, P, C, B, detail, raw) {
  const L = CRATE.L;
  const W = CRATE.W;
  const H = CRATE.H;
  const body = raw ? P.crateRaw : P.crate;
  block(ctx, at(C, B, 0, H * 0.5, 0), B, W, H, L, 0.01, body);
  // lid, proud of the box on every side
  block(ctx, at(C, B, 0, H + 0.019, 0), B, W + 0.022, 0.038, L + 0.022, 0.008, body);
  if (!detail) return;
  // end cleats
  for (const s of [-1, 1]) block(ctx, at(C, B, 0, H * 0.5, s * (L * 0.5 - 0.045)), B, W + 0.014, H * 0.86, 0.05, 0.006, P.plank);
  // steel bands over the lid
  for (const s of [-1, 1]) block(ctx, at(C, B, 0, H + 0.038, s * 0.19), B, W + 0.03, 0.014, 0.042, 0.004, P.steelDark);
  // stencilled markings on the long face
  block(ctx, at(C, B, W * 0.5 + 0.004, H * 0.6, -0.06), B, 0.007, 0.075, 0.32, 0.003, P.stencil);
  block(ctx, at(C, B, W * 0.5 + 0.004, H * 0.34, 0.2), B, 0.007, 0.045, 0.16, 0.003, P.stencil);
  // rope handles, one at each end
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const u = (-0.1 + 0.2 * t) * s;
      const bulge = Math.sin(Math.PI * t);
      pts.push(at(C, B, u, H * 0.72 - bulge * 0.07, s * (L * 0.5 + 0.006 + bulge * 0.055)));
    }
    G.polyTube(ctx, pts, 0.013, 6, B.U, P.rope);
  }
}

export function ammoCrate(ctx, P) {
  const n = clamp(Math.round(ctx.params.count ?? 3), 1, 6);
  const step = CRATE.H + 0.058;
  for (let i = 0; i < n; i++) {
    const B = basis(ctx.randomRange(-5, 5) + (i % 2 ? 2.5 : -2.5), 0, 0);
    const C = [ctx.randomRange(-0.025, 0.025), i * step, ctx.randomRange(-0.03, 0.03)];
    crate(ctx, P, C, B, true, false);
  }
  if (n >= 3) {
    // one broken open on the ground beside the stack, lid canted off it
    const B = basis(64, 0, 0);
    const C = [-0.66, 0, 0.12];
    crate(ctx, P, C, B, true, true);
    const LB = basis(64, 0, 22);
    block(ctx, [-0.72, 0.4, 0.34], LB, CRATE.W + 0.02, 0.036, CRATE.L, 0.008, P.crateRaw);
  }
}

// ── jerrycans ───────────────────────────────────────────────────────────────
export function jerrycan(ctx, P, C, B) {
  const W = 0.34;
  const H = 0.47;
  const D = 0.165;
  block(ctx, at(C, B, 0, H * 0.5, 0), B, W, H, D, 0.03, P.olive);
  // the stamped X on both broad faces
  for (const s of [-1, 1]) {
    for (const r of [33, -33]) {
      const RB = basis(0, 0, r);
      const rb = { R: [B.R[0] * RB.R[0] + B.U[0] * RB.R[1], B.R[1] * RB.R[0] + B.U[1] * RB.R[1], B.R[2] * RB.R[0] + B.U[2] * RB.R[1]], U: [B.R[0] * RB.U[0] + B.U[0] * RB.U[1], B.R[1] * RB.U[0] + B.U[1] * RB.U[1], B.R[2] * RB.U[0] + B.U[2] * RB.U[1]], F: B.F };
      block(ctx, at(C, B, 0, H * 0.52, s * (D * 0.5 + 0.003)), rb, 0.05, 0.38, 0.014, 0.004, P.oliveWorn);
    }
  }
  // three handles across the top
  for (const k of [-1, 0, 1]) {
    block(ctx, at(C, B, k * 0.088, H + 0.021, 0), B, 0.052, 0.019, D * 0.62, 0.006, P.oliveWorn);
    for (const s of [-1, 1]) block(ctx, at(C, B, k * 0.088, H + 0.008, s * D * 0.28), B, 0.052, 0.03, 0.016, 0.004, P.olive);
  }
  // filler neck and cam lever
  const UB = upright(0);
  lathe(ctx, at(C, B, 0.115, H, 0), UB, [[0, 0.038], [0.022, 0.036], [0.03, 0.032]], 10, P.oliveWorn, { capEnd: true });
  block(ctx, at(C, B, 0.115, H + 0.042, 0.02), B, 0.02, 0.012, 0.075, 0.003, P.steel);
}

export function jerrycans(ctx, P) {
  const n = clamp(Math.round(ctx.params.count ?? 3), 1, 6);
  const span = (n - 1) * 0.385;
  for (let i = 0; i < n; i++) {
    const x = -span / 2 + i * 0.385;
    const tipped = n >= 3 && i === n - 1;
    if (tipped) {
      const B = basis(ctx.randomRange(-14, 14), 0, 90);
      jerrycan(ctx, P, [x + 0.12, 0.085, ctx.randomRange(-0.05, 0.05)], B);
    } else {
      const B = basis(ctx.randomRange(-11, 11), 0, 0);
      jerrycan(ctx, P, [x, 0, ctx.randomRange(-0.06, 0.06)], B);
    }
  }
}

// ── helmet ──────────────────────────────────────────────────────────────────
export function helmet(ctx, P) {
  const dent = clamp(ctx.params.dent ?? 0.9, 0, 1);
  const yaw = ctx.params.yaw ?? 28;
  const tilt = clamp(ctx.params.tilt ?? 29, 0, 60);
  const B = basis(yaw, -90 + tilt, 0);
  // tipped onto one edge of the rim — the low side of the brim rests in the mud
  const C = [0, 0.172 * Math.sin(tilt * D2R) + 0.006, 0];
  const prof = [
    [0.0, 0.148],
    [0.005, 0.166],
    [0.017, 0.168],
    [0.031, 0.156],
    [0.056, 0.15],
    [0.086, 0.142],
    [0.113, 0.128],
    [0.136, 0.106],
    [0.156, 0.074],
    [0.169, 0.03],
  ];
  // an M1 shell is an oval in plan, deeper front-to-back than across
  const oval = (a) => 1 + 0.11 * Math.cos(a) * Math.cos(a);
  const mod = (a, t, r) => {
    let rr = r * oval(a);
    const f = Math.max(0, Math.cos(a - 2.05) - 0.34) / 0.66;
    const g = Math.exp(-Math.pow((t - 0.105) / 0.055, 2));
    rr *= 1 - dent * 0.34 * f * g;
    // a second, shallower crease low on the far side
    const f2 = Math.max(0, Math.cos(a + 1.15) - 0.66) / 0.34;
    const g2 = Math.exp(-Math.pow((t - 0.05) / 0.03, 2));
    rr *= 1 - dent * 0.16 * f2 * g2;
    return rr;
  };
  lathe(ctx, C, B, prof, 24, P.oliveWorn, { mod, capStart: true, capEnd: true });
  // the inside of the shell — you see straight into it at this angle
  const inner = prof.filter((p) => p[0] >= 0.005).map((p) => [p[0] + 0.004, p[1] - 0.009]);
  lathe(ctx, C, B, inner, 24, P.dark, { mod, flip: true, capEnd: true });
  // liner band and the webbing shadow just inside the brim
  lathe(ctx, C, B, [[0.006, 0.146], [0.036, 0.14]], 24, P.canvasDirty, { mod, flip: true });
  // chin strap, off the rim and trailing into the mud
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const p = at(C, B, s * 0.16, 0.014 + t * 0.02, 0.004);
      pts.push([p[0] + s * t * 0.03, Math.max(p[1] - t * 0.14, 0.011), p[2] + t * (0.1 + s * 0.14)]);
    }
    G.polyTube(ctx, pts, [0.016, 0.015, 0.014, 0.013, 0.012], 5, [0, 1, 0], P.canvasDirty, 0.3);
  }
  block(ctx, [0.055, 0.014, 0.29], basis(52, 0, 0), 0.032, 0.009, 0.05, 0.003, P.steel);
}

// ── entrenching tool ────────────────────────────────────────────────────────
export function etool(ctx, P) {
  const lean = clamp(ctx.params.lean ?? 38, 8, 70);
  const yaw = ctx.params.yaw ?? 26;
  const B = basis(yaw, -90 + lean, 0);
  // struck in far enough to stand, not so far the blade disappears
  const C = [0, 0.052, 0];
  const bev = 0.004;
  loftAt(
    ctx,
    C,
    B,
    [
      { d: -0.115, poly: G.rrect(0.055, 0.011, 0, 0, bev) },
      { d: -0.06, poly: G.rrect(0.15, 0.013, 0, 0, bev) },
      { d: 0.02, poly: G.rrect(0.192, 0.014, 0, 0, bev) },
      { d: 0.12, poly: G.rrect(0.185, 0.014, 0, 0, bev) },
      { d: 0.185, poly: G.rrect(0.12, 0.016, 0, 0, bev) },
      { d: 0.215, poly: G.rrect(0.055, 0.018, 0, 0, bev) },
    ],
    P.steel,
  );
  // socket and collar
  lathe(ctx, C, B, [[0.2, 0.03], [0.26, 0.026], [0.31, 0.023]], 9, P.steelDark, { capEnd: true });
  lathe(ctx, C, B, [[0.3, 0.026], [0.325, 0.026]], 9, P.steel, {});
  // haft
  G.tube(ctx, at(C, B, 0, 0, 0.3), at(C, B, 0, 0, 0.78), 0.021, 0.018, 9, B.U, P.haft);
  // T grip
  G.tube(ctx, at(C, B, -0.07, 0, 0.79), at(C, B, 0.07, 0, 0.79), 0.017, 0.017, 8, B.F, P.haft);
  lathe(ctx, at(C, B, 0, 0, 0.775), B, [[0, 0.024], [0.022, 0.024]], 9, P.steelDark, {});
}

// ── stretcher ───────────────────────────────────────────────────────────────
export function stretcher(ctx, P) {
  const sag = clamp(ctx.params.sag ?? 0.055, 0, 0.14);
  const blood = clamp(ctx.params.blood ?? 0.9, 0, 1);
  const B = basis(0, 0, 0);
  const C = [0, 0, 0];
  const halfL = 1.14;
  const pu = 0.288;
  const py = 0.086;
  // poles, running past the canvas as handles
  for (const s of [-1, 1]) {
    G.tube(ctx, [s * pu, py, -halfL], [s * pu, py, halfL], 0.023, 0.023, 8, [0, 1, 0], P.haft);
    for (const e of [-1, 1]) {
      // ferrules and the little feet that keep it off the mud
      lathe(ctx, [s * pu, py, e * (halfL - 0.11)], basis(0, -90, 0), [[-0.024, 0.026], [0.024, 0.026]], 8, P.steelDark, {});
      block(ctx, [s * pu, py * 0.5, e * (halfL - 0.28)], B, 0.026, py, 0.05, 0.005, P.steelDark);
    }
  }
  // cross braces
  for (const e of [-1, 1]) G.tube(ctx, [-pu, py - 0.01, e * 0.85], [pu, py - 0.01, e * 0.85], 0.014, 0.014, 7, [0, 1, 0], P.steelDark);
  // canvas, sagging between the poles and stained through
  const stain = (x, z) => {
    const n = ctx.noise2d(x * 3.4, z * 3.4) * 0.055;
    const d1 = Math.sqrt((x - 0.03) * (x - 0.03) + (z - 0.2) * (z - 0.2)) + n;
    const d2 = Math.sqrt((x + 0.14) * (x + 0.14) + (z + 0.44) * (z + 0.44)) + n;
    return Math.min(d1 / 0.31, d2 / 0.19);
  };
  const cloth = (x, y, z) => {
    if (blood <= 0) return P.canvas(x, y, z);
    const t = stain(x, z);
    if (t < 0.72 * blood) return P.blood(x, y, z);
    if (t < 1.0 * blood) return P.bloodOld(x, y, z);
    return ctx.noise2d(x * 1.7 + 4, z * 1.7) > 0.25 ? P.canvasDirty(x, y, z) : P.canvas(x, y, z);
  };
  const nz = 22;
  const nu = 9;
  const z0 = -0.86;
  const z1 = 0.86;
  const pt = (i, k) => {
    const tu = k / nu;
    const tz = i / nz;
    const u = -pu + tu * 2 * pu;
    const z = z0 + tz * (z1 - z0);
    const y = py - 0.012 - sag * Math.sin(Math.PI * tz) * (1 - Math.abs(u / pu) * 0.62) - sag * 0.5 * Math.cos((u / pu) * 1.4);
    return [u, y, z];
  };
  for (let i = 0; i < nz; i++) {
    for (let k = 0; k < nu; k++) {
      const a = pt(i, k);
      const b = pt(i, k + 1);
      const c = pt(i + 1, k + 1);
      const d = pt(i + 1, k);
      cloth((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
      ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
      ctx.quad(d[0], d[1], d[2], c[0], c[1], c[2], b[0], b[1], b[2], a[0], a[1], a[2]);
    }
  }
}

// ── oil drum ────────────────────────────────────────────────────────────────
export function oilDrum(ctx, P) {
  const punctures = clamp(Math.round(ctx.params.punctures ?? 4), 0, 10);
  const tipped = !!ctx.params.tipped;
  const yaw = ctx.params.yaw ?? 18;
  const R = 0.292;
  const B = tipped ? basis(yaw, 0, 0) : upright(yaw);
  const C = tipped ? [0, R + 0.004, 0] : [0, 0, 0];
  const sides = 20;
  // Body spans are subdivided so a puncture tears a hand-sized hole rather than
  // a full-height window — the band height IS the hole height.
  const prof = [
    [0.0, 0.268],
    [0.014, 0.296],
    [0.036, 0.3],
  ];
  const span = (from, to) => {
    const steps = Math.max(1, Math.round((to - from) / 0.048));
    for (let i = 1; i <= steps; i++) prof.push([from + ((to - from) * i) / steps, R]);
  };
  span(0.036, 0.215);
  prof.push([0.243, 0.306], [0.277, 0.306], [0.305, R]);
  span(0.305, 0.575);
  prof.push([0.603, 0.306], [0.637, 0.306], [0.665, R]);
  span(0.665, 0.818);
  prof.push([0.846, 0.3], [0.866, 0.296], [0.88, 0.268]);
  const mod = (a, t, r) => {
    const f = Math.max(0, Math.cos(a - 4.15) - 0.42) / 0.58;
    const g = Math.exp(-Math.pow((t - 0.46) / 0.16, 2));
    return r * (1 - 0.11 * f * g);
  };
  const holes = [];
  for (let i = 0; i < punctures; i++) {
    // most are single tears; one in four is a ragged two-wide gash
    holes.push([3 + Math.floor(ctx.random() * (prof.length - 6)), Math.floor(ctx.random() * sides), ctx.random() < 0.25 ? 2 : 1]);
  }
  const skip = (ri, k) => {
    for (let i = 0; i < holes.length; i++) {
      if (holes[i][0] !== ri) continue;
      for (let w = 0; w < holes[i][2]; w++) if ((holes[i][1] + w) % sides === k) return true;
    }
    return false;
  };
  const outer = lathe(ctx, C, B, prof, sides, P.rust, { mod, skip });
  // inner wall — what you see through the holes
  const inner = lathe(ctx, C, B, prof.map((p) => [p[0], p[1] - 0.015]), sides, P.rustDeep, { mod, flip: true });
  // rims: outer chime to the recessed lid, both ends
  const lidTop = lathe(ctx, C, B, [[0.856, 0.262], [0.868, 0.256]], sides, P.rust, { capEnd: true });
  stitch(ctx, outer[outer.length - 1], lidTop[0], P.rust, {});
  const lidBot = lathe(ctx, C, B, [[0.012, 0.256], [0.024, 0.262]], sides, P.rustDeep, { capStart: true });
  stitch(ctx, lidBot[lidBot.length - 1], outer[0], P.rustDeep, {});
  stitch(ctx, inner[inner.length - 1], lidTop[0], P.rustDeep, {});
  // bungs on the lid
  lathe(ctx, at(C, B, 0.185, 0, 0.868), B, [[0, 0.042], [0.014, 0.04]], 6, P.steelDark, { capEnd: true });
  lathe(ctx, at(C, B, -0.13, 0.13, 0.868), B, [[0, 0.026], [0.011, 0.024]], 6, P.steelDark, { capEnd: true });
}

// ── wire spool ──────────────────────────────────────────────────────────────
export function wireSpool(ctx, P) {
  const yaw = ctx.params.yaw ?? 12;
  const B = basis(yaw + 90, 0, 0);
  const RAD = 0.5;
  const C = [0, RAD, 0];
  const sides = 22;
  // flange discs
  for (const s of [-1, 1]) {
    lathe(ctx, C, B, [[s * 0.19 - s * 0.056, RAD], [s * 0.19, RAD]].sort((a, b) => a[0] - b[0]), sides, P.crate, { capStart: true, capEnd: true });
    // hub boss and axle hole
    lathe(ctx, C, B, [[s * 0.196, 0.075], [s * 0.212, 0.07]].sort((a, b) => a[0] - b[0]), 10, P.steelDark, { capStart: s < 0, capEnd: s > 0 });
    lathe(ctx, C, B, [[s * 0.2, 0.036], [s * 0.214, 0.034]].sort((a, b) => a[0] - b[0]), 8, P.dark, { capStart: s < 0, capEnd: s > 0 });
  }
  // core drum
  lathe(ctx, C, B, [[-0.14, 0.2], [0.14, 0.2]], 16, P.plank, {});
  // wound cable, groove by groove
  const coil = [];
  const turns = 11;
  for (let i = 0; i <= turns; i++) {
    const d = -0.132 + (i / turns) * 0.264;
    coil.push([d, i % 2 === 0 ? 0.44 : 0.428]);
  }
  lathe(ctx, C, B, coil, 18, P.wire, {});
  // the loose end, off the drum and into the mud
  const pts = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    const p = at(C, B, t * 1.75, 0.44 - t * t * 1.05, 0.06 + Math.sin(t * 4.2) * 0.14);
    const gy = ctx.groundY(p[0], p[2]) + 0.016;
    pts.push([p[0], Math.max(p[1], gy), p[2]]);
  }
  G.polyTube(ctx, pts, 0.014, 6, [0, 1, 0], P.wire);
}

// ── crate pile ──────────────────────────────────────────────────────────────
export function brokenCrate(ctx, P, C, B) {
  const L = CRATE.L;
  const W = CRATE.W;
  const H = CRATE.H;
  // one standing side, one collapsed lid, loose slats where the rest was
  block(ctx, at(C, B, -W * 0.5, H * 0.45, 0), B, 0.022, H * 0.9, L, 0.005, P.crate);
  block(ctx, at(C, B, 0, 0.012, 0), B, W, 0.024, L, 0.005, P.crateRaw);
  for (let i = 0; i < 3; i++) {
    const SB = basis(0, 0, ctx.randomRange(-26, 26));
    const sb = { R: [B.R[0] * SB.R[0] + B.U[0] * SB.R[1], B.R[1] * SB.R[0] + B.U[1] * SB.R[1], B.R[2] * SB.R[0] + B.U[2] * SB.R[1]], U: [B.R[0] * SB.U[0] + B.U[0] * SB.U[1], B.R[1] * SB.U[0] + B.U[1] * SB.U[1], B.R[2] * SB.U[0] + B.U[2] * SB.U[1]], F: B.F };
    block(ctx, at(C, B, ctx.randomRange(-0.1, 0.16), 0.05 + i * 0.045, ctx.randomRange(-0.12, 0.12)), sb, 0.09, 0.02, L * ctx.randomRange(0.55, 0.95), 0.004, i === 1 ? P.crateRaw : P.plank);
  }
  block(ctx, at(C, B, W * 0.42, H * 0.3, L * 0.2), basis(0, 0, 0), 0.02, 0.13, 0.42, 0.004, P.plank);
}

export function cratePile(ctx, P) {
  const n = clamp(Math.round(ctx.params.count ?? 7), 3, 10);
  const ground = Math.ceil(n * 0.6);
  for (let i = 0; i < n; i++) {
    const lower = i < ground;
    const a = ctx.random() * TAU;
    const rad = lower ? ctx.randomRange(0.3, 1.15) : ctx.randomRange(0.05, 0.5);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad * 0.8;
    const gy = ctx.groundY(x, z);
    const B = basis(ctx.random() * 360, ctx.randomRange(-13, 13), ctx.randomRange(-16, 16));
    const y = gy + (lower ? 0.0 : ctx.randomRange(0.27, 0.42));
    if (ctx.random() < 0.55) brokenCrate(ctx, P, [x, y, z], B);
    else crate(ctx, P, [x, y, z], B, false, ctx.random() < 0.4);
  }
  // boards knocked loose around the heap
  for (let i = 0; i < 6; i++) {
    const a = ctx.random() * TAU;
    const rad = ctx.randomRange(0.9, 1.9);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad * 0.85;
    const B = basis(ctx.random() * 360, 0, ctx.randomRange(-6, 6));
    block(ctx, [x, ctx.groundY(x, z) + 0.014, z], B, 0.11, 0.022, ctx.randomRange(0.5, 1.0), 0.004, ctx.random() < 0.4 ? P.crateRaw : P.plank);
  }
  // spilled rounds
  for (let i = 0; i < 7; i++) {
    const x = ctx.randomRange(-1.3, 1.3);
    const z = ctx.randomRange(-1.1, 1.1);
    casing(ctx, P, [x, ctx.groundY(x, z) + 0.012, z], basis(ctx.random() * 360, 0, 0), 1);
  }
}

// ── shell casings ───────────────────────────────────────────────────────────
export function casing(ctx, P, C, B, scale) {
  const s = scale || 1;
  lathe(
    ctx,
    C,
    B,
    [
      [-0.036 * s, 0.0122 * s],
      [-0.03 * s, 0.0138 * s],
      [-0.022 * s, 0.0126 * s],
      [0.012 * s, 0.0122 * s],
      [0.03 * s, 0.0097 * s],
      [0.036 * s, 0.0094 * s],
    ],
    6,
    ctx.random() < 0.35 ? P.brassDull : P.brass,
    { capStart: true, capEnd: true },
  );
}

export function bigCase(ctx, P, C, B) {
  lathe(
    ctx,
    C,
    B,
    [
      [-0.175, 0.0355],
      [-0.164, 0.0392],
      [-0.15, 0.0372],
      [0.07, 0.0368],
      [0.15, 0.0322],
      [0.175, 0.0316],
    ],
    12,
    P.brassDull,
    { capStart: true, capEnd: true },
  );
}

export function shellCasings(ctx, P) {
  const n = clamp(Math.round(ctx.params.count ?? 34), 4, 90);
  const radius = clamp(ctx.params.radius ?? 1.25, 0.4, 4);
  for (let i = 0; i < n; i++) {
    const a = ctx.random() * TAU;
    const rr = radius * Math.sqrt(ctx.random());
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const sunk = ctx.random() < 0.3;
    const B = basis(ctx.random() * 360, ctx.randomRange(-9, 9), 0);
    casing(ctx, P, [x, ctx.groundY(x, z) + (sunk ? 0.004 : 0.0118), z], B, 1);
  }
  // the gunner's spent 75s, dumped clear of the pit
  const spots = [
    [radius * 0.62, radius * 0.36, 88, false],
    [-radius * 0.5, radius * 0.72, 24, false],
    [radius * 0.15, -radius * 0.66, 0, true],
  ];
  for (let i = 0; i < spots.length; i++) {
    const x = spots[i][0];
    const z = spots[i][1];
    const gy = ctx.groundY(x, z);
    if (spots[i][3]) bigCase(ctx, P, [x, gy + 0.176, z], upright(spots[i][2]));
    else bigCase(ctx, P, [x, gy + 0.039, z], basis(spots[i][2], ctx.randomRange(-4, 4), 0));
  }
}

// ── ration tins ─────────────────────────────────────────────────────────────
export function tin(ctx, P, C, B, opened, crushed) {
  const h = crushed ? 0.032 : 0.055;
  const prof = [
    [0, 0.0332],
    [0.006, 0.0385],
    [h - 0.006, 0.0385],
    [h, 0.0332],
  ];
  const mod = crushed ? (a, t, r) => r * (1 - 0.22 * Math.max(0, Math.cos(a - 1.1) - 0.3) / 0.7) : null;
  lathe(ctx, C, B, prof, 11, P.steel, { mod, capStart: true, capEnd: !opened });
  if (opened) {
    // dark interior and a lid peeled back off the rim
    lathe(ctx, C, B, [[0.008, 0.031], [h - 0.004, 0.031]], 11, P.dark, { flip: true, capStart: true });
    const LB = basis(0, 0, 0);
    const lidB = { R: B.R, U: B.U, F: B.F };
    lathe(ctx, at(C, B, 0.052, 0.03, h * 0.6), rollLike(lidB, 74), [[0, 0.0355], [0.004, 0.0355]], 10, P.steel, { capStart: true, capEnd: true });
    void LB;
  }
}

// A basis rolled about its own F by deg — used for lids and canted slats.
export function rollLike(B, deg) {
  const c = Math.cos(deg * D2R);
  const s = Math.sin(deg * D2R);
  return {
    R: [B.R[0] * c + B.U[0] * s, B.R[1] * c + B.U[1] * s, B.R[2] * c + B.U[2] * s],
    U: [-B.R[0] * s + B.U[0] * c, -B.R[1] * s + B.U[1] * c, -B.R[2] * s + B.U[2] * c],
    F: B.F,
  };
}

export function rationTins(ctx, P) {
  const n = clamp(Math.round(ctx.params.count ?? 9), 3, 14);
  // a small stack somebody left standing
  for (let i = 0; i < 3; i++) {
    const x = 0.14 + ctx.randomRange(-0.008, 0.008);
    const z = -0.1 + ctx.randomRange(-0.008, 0.008);
    tin(ctx, P, [x, ctx.groundY(x, z) + i * 0.056, z], upright(ctx.random() * 360), false, false);
  }
  for (let i = 0; i < n; i++) {
    const a = ctx.random() * TAU;
    const rr = 0.55 * Math.sqrt(ctx.random());
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const gy = ctx.groundY(x, z);
    const roll = ctx.random();
    if (roll < 0.32) {
      // on its side, lid off
      tin(ctx, P, [x, gy + 0.0385, z], basis(ctx.random() * 360, 0, 0), true, false);
    } else if (roll < 0.5) {
      tin(ctx, P, [x, gy + 0.002, z], upright(ctx.random() * 360), false, true);
    } else {
      tin(ctx, P, [x, gy + 0.002, z], upright(ctx.random() * 360), roll > 0.78, false);
    }
  }
}

// ── entry points ────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const P = palette(ctx);
  const part = String(ctx.params.part || "ammo-crate");
  if (part === "jerrycans") return jerrycans(ctx, P);
  if (part === "helmet") return helmet(ctx, P);
  if (part === "entrenching-tool") return etool(ctx, P);
  if (part === "stretcher") return stretcher(ctx, P);
  if (part === "oil-drum") return oilDrum(ctx, P);
  if (part === "wire-spool") return wireSpool(ctx, P);
  if (part === "crate-pile") return cratePile(ctx, P);
  if (part === "shell-casings") return shellCasings(ctx, P);
  if (part === "ration-tins") return rationTins(ctx, P);
  return ammoCrate(ctx, P);
}

export function boxMesh(ctx, cx, cy, cz, hx, hy, hz) {
  const x0 = cx - hx;
  const x1 = cx + hx;
  const y0 = cy - hy;
  const y1 = cy + hy;
  const z0 = cz - hz;
  const z1 = cz + hz;
  ctx.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
  ctx.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);
  ctx.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1);
  ctx.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0);
  ctx.quad(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0);
  ctx.quad(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
}

export function collider(ctx) {
  const part = String(ctx.params.part || "ammo-crate");
  if (part === "ammo-crate") {
    const n = clamp(Math.round(ctx.params.count ?? 3), 1, 6);
    const h = (n * (CRATE.H + 0.058)) / 2;
    boxMesh(ctx, n >= 3 ? -0.16 : 0, h, 0, n >= 3 ? 0.72 : 0.24, h, 0.5);
    return;
  }
  if (part === "jerrycans") {
    const n = clamp(Math.round(ctx.params.count ?? 3), 1, 6);
    boxMesh(ctx, 0, 0.235, 0, (n - 1) * 0.2 + 0.19, 0.235, 0.12);
    return;
  }
  if (part === "oil-drum") {
    if (ctx.params.tipped) boxMesh(ctx, 0, 0.296, 0, 0.3, 0.296, 0.45);
    else boxMesh(ctx, 0, 0.44, 0, 0.3, 0.44, 0.3);
    return;
  }
  if (part === "wire-spool") {
    boxMesh(ctx, 0, 0.5, 0, 0.2, 0.5, 0.5);
    return;
  }
  if (part === "crate-pile") {
    boxMesh(ctx, 0, 0.32, 0, 1.25, 0.32, 1.05);
    return;
  }
  if (part === "stretcher") {
    boxMesh(ctx, 0, 0.055, 0, 0.31, 0.055, 1.16);
    return;
  }
  // helmet, entrenching-tool, shell-casings, ration-tins: litter, not obstacle.
}
