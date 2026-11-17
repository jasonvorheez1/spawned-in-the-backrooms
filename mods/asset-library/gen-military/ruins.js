// DEMOLISHED BUILDINGS — the shelled town of the Frontline kit, as ONE generator.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-military/ruins.js",
//                params: { part: "church", damage: 2 } }
//
// FRAME: origin at the FOOT of the building, footprint centred on (0, 0);
//        +Z is the street front, +Y is up. Yaw the spec row to aim the facade.
// SCALE: storey 3.2 m, door head 2.1 m, sill 0.95 m — everything read against a
//        1.8 m player. Wall thickness is real, so every opening is a way in.
//
// WALKABLE, NOT A FACADE: there is deliberately NO collider() export, so the
// engine's default trimesh collider IS the ruin — floor slabs carry you, blown
// windows and shell holes are holes you walk and see through, and the interiors
// are rooms you stand in. Give the spec row physics: "static".
//
//   part: "apartment"  storeys 2-5, bays 2-5, damage 1-3, gone "ne"|"nw"|"se"|"sw"
//   part: "townhall"   bays 4-6, damage 1-3          (roofless civic shell, clock)
//   part: "rowhouse"   units 2-4, damage 1-3         (one standing, rest pancaked)
//   part: "farmhouse"  damage 1-3                    (burnt out, rib-cage rafters)
//   part: "church"     damage 1-3                    (41 m spire — the landmark)
//
// Compass for `gone`: n = -Z, s = +Z, e = +X, w = -X.
//
// TWO LAWS THIS FILE KEEPS, because a generated building breaks on them first:
//  1. No two faces closer than 5 cm. Slabs and partitions run INTO the wall
//     bodies they meet (past the inner face, short of the outer) so their torn
//     edges are buried instead of fighting the wall's own face.
//  2. One winding law: every panel is gridPanel, whose P(u,v,n) must satisfy
//     dP/du x dP/dv = +n. Get that right once and nothing lights wrong.

const G = require("builtin/geom");

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

// Storey height — floor to floor, sized so a 1.8 m player has real headroom.
const STOREY = 3.2;

const TEX = {
  brick: "/cdn/moodboard-realistic-gritty/texture-ruin-brick-soot-1944.png",
  stucco: "/cdn/moodboard-realistic-gritty/texture-ruin-stucco-cracked-1944.png",
  concrete: "/cdn/moodboard-realistic-gritty/texture-ruin-concrete-spalled-1944.png",
  timber: "/cdn/moodboard-realistic-gritty/texture-ruin-timber-charred-1944.png",
  stone: "/cdn/moodboard-realistic-gritty/texture-ruin-limestone-blocks-1944.png",
  paper: "/cdn/moodboard-realistic-gritty/texture-ruin-wallpaper-floral-faded-1944.png",
  rubble: "/cdn/moodboard-realistic-gritty/texture-ruin-brick-rubble-1944.png",
  slate: "/cdn/moodboard-realistic-gritty/texture-ruin-slate-tiles-1944.png",
};

// ── paint ───────────────────────────────────────────────────────────────────
// CDN albedo plus seeded per-face grit on colour/rough/metal, so no two bricks
// in a wall read alike. Tints are 1944 northern Europe: wet red brick, grey-green
// lime render, bone limestone, wet ash.
export function palette(ctx) {
  const s = (o) => G.surface(ctx, o);
  return {
    brick: s({ tex: TEX.brick, r: 0.44, g: 0.24, b: 0.19, rough: 0.96, jitter: 0.22, freq: 3.2 }),
    brickIn: s({ tex: TEX.brick, r: 0.3, g: 0.18, b: 0.15, rough: 0.98, jitter: 0.26, freq: 4.1 }),
    stucco: s({ tex: TEX.stucco, r: 0.62, g: 0.58, b: 0.5, rough: 0.94, jitter: 0.19, freq: 2.6 }),
    plaster: s({ tex: TEX.stucco, r: 0.7, g: 0.67, b: 0.61, rough: 0.9, jitter: 0.16, freq: 5.2 }),
    stuccoEdge: s({ tex: TEX.stucco, r: 0.42, g: 0.39, b: 0.35, rough: 0.98, jitter: 0.22, freq: 4.8 }),
    sootS: s({ tex: TEX.stucco, r: 0.18, g: 0.16, b: 0.15, rough: 1, jitter: 0.24, freq: 5.5 }),
    sootT: s({ tex: TEX.stone, r: 0.2, g: 0.19, b: 0.18, rough: 1, jitter: 0.22, freq: 5 }),
    paper: s({ tex: TEX.paper, r: 0.66, g: 0.57, b: 0.44, rough: 0.92, jitter: 0.2, freq: 6.5 }),
    paperPale: s({ tex: TEX.paper, r: 0.68, g: 0.65, b: 0.6, rough: 0.93, jitter: 0.17, freq: 5.4 }),
    concrete: s({ tex: TEX.concrete, r: 0.55, g: 0.54, b: 0.51, rough: 0.95, jitter: 0.15, freq: 3.4 }),
    core: s({ tex: TEX.concrete, r: 0.4, g: 0.38, b: 0.35, rough: 1, jitter: 0.24, freq: 6 }),
    stone: s({ tex: TEX.stone, r: 0.6, g: 0.58, b: 0.52, rough: 0.93, jitter: 0.17, freq: 2.9 }),
    stoneIn: s({ tex: TEX.stone, r: 0.45, g: 0.43, b: 0.39, rough: 0.97, jitter: 0.2, freq: 4.4 }),
    timber: s({ tex: TEX.timber, r: 0.31, g: 0.24, b: 0.17, rough: 0.95, jitter: 0.2, freq: 5 }),
    char: s({ tex: TEX.timber, r: 0.12, g: 0.11, b: 0.1, rough: 1, jitter: 0.26, freq: 7 }),
    soot: s({ tex: TEX.brick, r: 0.17, g: 0.15, b: 0.14, rough: 1, jitter: 0.24, freq: 5.5 }),
    rubble: s({ tex: TEX.rubble, r: 0.42, g: 0.35, b: 0.29, rough: 1, jitter: 0.3, freq: 4 }),
    ash: s({ tex: TEX.rubble, r: 0.25, g: 0.23, b: 0.22, rough: 1, jitter: 0.28, freq: 5 }),
    slate: s({ tex: TEX.slate, r: 0.26, g: 0.27, b: 0.29, rough: 0.85, jitter: 0.18, freq: 4 }),
    iron: s({ tex: TEX.concrete, r: 0.24, g: 0.21, b: 0.18, metal: 0.7, rough: 0.62, jitter: 0.2, freq: 8 }),
    rust: s({ tex: TEX.concrete, r: 0.36, g: 0.2, b: 0.11, metal: 0.5, rough: 0.85, jitter: 0.26, freq: 9 }),
    enamel: s({ tex: TEX.stucco, r: 0.82, g: 0.81, b: 0.78, rough: 0.35, jitter: 0.09, freq: 7 }),
    bronze: s({ tex: TEX.concrete, r: 0.37, g: 0.31, b: 0.16, metal: 0.85, rough: 0.5, jitter: 0.18, freq: 6 }),
  };
}

// Paint chooser: `a` where the test passes, else `b`.
export function band(test, a, b) {
  return (x, y, z) => (test(x, y, z) ? a : b)(x, y, z);
}

// ── emitters ────────────────────────────────────────────────────────────────
export function qd(ctx, paint, a, b, c, d) {
  if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
}

export function tr(ctx, paint, a, b, c) {
  if (paint) paint((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
  ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}

// A rigid local frame: R = Ry(yaw)·Rx(pitch)·Rz(roll), then translate. Degrees.
export function xf(px, py, pz, yaw, pitch, roll) {
  const cy = Math.cos((yaw || 0) * D2R), sy = Math.sin((yaw || 0) * D2R);
  const cp = Math.cos((pitch || 0) * D2R), sp = Math.sin((pitch || 0) * D2R);
  const cr = Math.cos((roll || 0) * D2R), sr = Math.sin((roll || 0) * D2R);
  const m = [
    cy * cr + sy * sp * sr, -cy * sr + sy * sp * cr, sy * cp,
    cp * sr, cp * cr, -sp,
    -sy * cr + cy * sp * sr, sy * sr + cy * sp * cr, cy * cp,
  ];
  return (x, y, z) => [
    px + m[0] * x + m[1] * y + m[2] * z,
    py + m[3] * x + m[4] * y + m[5] * z,
    pz + m[6] * x + m[7] * y + m[8] * z,
  ];
}

// A closed box in a frame: centre offset `o`, half-extents `h`.
export function fbox(ctx, f, o, h, paint) {
  const P = (sx, sy, sz) => f(o[0] + sx * h[0], o[1] + sy * h[1], o[2] + sz * h[2]);
  const ppp = P(1, 1, 1), ppn = P(1, 1, -1), pnp = P(1, -1, 1), pnn = P(1, -1, -1);
  const npp = P(-1, 1, 1), npn = P(-1, 1, -1), nnp = P(-1, -1, 1), nnn = P(-1, -1, -1);
  qd(ctx, paint, nnp, pnp, ppp, npp);
  qd(ctx, paint, pnn, nnn, npn, ppn);
  qd(ctx, paint, pnp, pnn, ppn, ppp);
  qd(ctx, paint, nnn, nnp, npp, npn);
  qd(ctx, paint, npp, ppp, ppn, npn);
  qd(ctx, paint, nnn, pnn, pnp, nnp);
}

// An axis-aligned box straight in object space.
export function box(ctx, x0, x1, y0, y1, z0, z1, paint) {
  fbox(ctx, xf((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, 0, 0), [0, 0, 0],
    [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2], paint);
}

// ── the one panel emitter ───────────────────────────────────────────────────
// Every wall, floor, roof slope and spire face in this file is this function: a
// slab of real thickness `t` over a parametric surface P(u, v, n), carved by
// `keep`. u,v run 0..1; n is metres outward. Cells merge into runs, and every
// cell whose neighbour is gone grows a torn edge of full thickness — which is
// what makes a shell hole read as a hole in a WALL and not in a sheet of paper.
export function gridPanel(ctx, o) {
  const NU = Math.max(1, o.NU | 0);
  const NV = Math.max(1, o.NV | 0);
  const P = o.P;
  const h = (o.t ?? 0.35) / 2;
  const out = o.paintOut;
  const inn = o.paintIn || o.paintOut;
  const edge = o.paintEdge || o.paintIn || o.paintOut;
  const wrap = !!o.wrapU;
  const keep = o.keep;

  const K = [];
  for (let i = 0; i < NU; i++) {
    K[i] = [];
    for (let j = 0; j < NV; j++) {
      if (!keep) { K[i][j] = true; continue; }
      const u = (i + 0.5) / NU, v = (j + 0.5) / NV;
      const p = P(u, v, 0);
      K[i][j] = !!keep(p[0], p[1], p[2], u, v);
    }
  }
  const at = (i, j) => {
    if (j < 0 || j >= NV) return false;
    let ii = i;
    if (ii < 0) { if (!wrap) return false; ii = NU - 1; }
    if (ii >= NU) { if (!wrap) return false; ii = 0; }
    return K[ii][j];
  };
  const U = (i) => i / NU;
  const V = (j) => j / NV;
  // Runs may only be merged across a PLANAR panel: on a curved or wrapped one
  // (the spire) a full-circle run would collapse to a degenerate quad, and the
  // whole ring would vanish. Curved panels emit cell by cell.
  const merge = !o.wrapU && !o.curved;
  const runEnd = (test, i, N) => {
    if (!merge) return i;
    let k = i;
    while (k + 1 < N && test(k + 1)) k++;
    return k;
  };

  // Faces, merged into horizontal runs — and emitted in THREE passes, outer
  // skin, then inner skin, then torn edges. Paint is stateful and every CDN
  // albedo switch starts a new draw group, so interleaving outer/inner would
  // shatter one wall into sixty submeshes. Three passes, three groups.
  for (let j = 0; j < NV; j++) {
    let i = 0;
    while (i < NU) {
      if (!K[i][j]) { i++; continue; }
      const k = runEnd((m) => K[m][j], i, NU);
      const u0 = U(i), u1 = U(k + 1), v0 = V(j), v1 = V(j + 1);
      qd(ctx, out, P(u0, v0, h), P(u1, v0, h), P(u1, v1, h), P(u0, v1, h));
      i = k + 1;
    }
  }
  for (let j = 0; j < NV; j++) {
    let i = 0;
    while (i < NU) {
      if (!K[i][j]) { i++; continue; }
      const k = runEnd((m) => K[m][j], i, NU);
      const u0 = U(i), u1 = U(k + 1), v0 = V(j), v1 = V(j + 1);
      qd(ctx, inn, P(u1, v0, -h), P(u0, v0, -h), P(u0, v1, -h), P(u1, v1, -h));
      i = k + 1;
    }
  }

  // torn edges along v (tops and undercuts), merged along u
  for (let j = 0; j < NV; j++) {
    for (const side of [1, -1]) {
      if (side < 0 && o.skipBottom) continue;
      const need = (m) => K[m][j] && !at(m, j + side);
      let i = 0;
      while (i < NU) {
        if (!need(i)) { i++; continue; }
        const k = runEnd(need, i, NU);
        const u0 = U(i), u1 = U(k + 1), v = side > 0 ? V(j + 1) : V(j);
        if (side > 0) qd(ctx, edge, P(u0, v, h), P(u1, v, h), P(u1, v, -h), P(u0, v, -h));
        else qd(ctx, edge, P(u0, v, -h), P(u1, v, -h), P(u1, v, h), P(u0, v, h));
        i = k + 1;
      }
    }
  }

  // torn edges along u (jambs and cut ends), merged along v
  for (let i = 0; i < NU; i++) {
    for (const side of [1, -1]) {
      const need = (m) => K[i][m] && !at(i + side, m);
      let j = 0;
      while (j < NV) {
        if (!need(j)) { j++; continue; }
        const k = runEnd(need, j, NV);
        const v0 = V(j), v1 = V(k + 1), u = side > 0 ? U(i + 1) : U(i);
        if (side > 0) qd(ctx, edge, P(u, v0, h), P(u, v0, -h), P(u, v1, -h), P(u, v1, h));
        else qd(ctx, edge, P(u, v0, -h), P(u, v0, h), P(u, v1, h), P(u, v1, -h));
        j = k + 1;
      }
    }
  }
}

// A vertical wall. `facing` is the direction the OUTER face looks. `a`..`b` is
// the run in object metres (x for a ±z wall, z for a ±x wall).
export function wall(ctx, o) {
  const a = Math.min(o.a, o.b), b = Math.max(o.a, o.b);
  const y0 = o.y0, y1 = o.y1;
  const t = o.t ?? 0.35;
  const cell = o.cell ?? 0.85;
  const P = {
    "+z": (u, v, n) => [a + u * (b - a), y0 + v * (y1 - y0), o.plane + n],
    "-z": (u, v, n) => [b - u * (b - a), y0 + v * (y1 - y0), o.plane - n],
    "+x": (u, v, n) => [o.plane + n, y0 + v * (y1 - y0), b - u * (b - a)],
    "-x": (u, v, n) => [o.plane - n, y0 + v * (y1 - y0), a + u * (b - a)],
  }[o.facing];
  gridPanel(ctx, {
    NU: Math.max(1, Math.round((b - a) / cell)),
    NV: Math.max(1, Math.round((y1 - y0) / (o.cellY ?? cell))),
    P, t, keep: o.keep, skipBottom: o.skipBottom !== false,
    paintOut: o.paintOut, paintIn: o.paintIn, paintEdge: o.paintEdge,
  });
}

// A horizontal slab. `y` is the WALKING surface; the slab hangs below it.
export function slab(ctx, o) {
  const t = o.t ?? 0.24;
  const cell = o.cell ?? 1.0;
  const x0 = Math.min(o.x0, o.x1), x1 = Math.max(o.x0, o.x1);
  const z0 = Math.min(o.z0, o.z1), z1 = Math.max(o.z0, o.z1);
  const yMid = o.y - t / 2;
  gridPanel(ctx, {
    NU: Math.max(1, Math.round((x1 - x0) / cell)),
    NV: Math.max(1, Math.round((z1 - z0) / cell)),
    P: (u, v, n) => [x0 + u * (x1 - x0), yMid + n, z1 - v * (z1 - z0)],
    t, keep: o.keep,
    paintOut: o.paintTop, paintIn: o.paintBottom || o.paintTop,
    paintEdge: o.paintEdge || o.paintBottom || o.paintTop,
  });
}

// ── carving ─────────────────────────────────────────────────────────────────
// Openings: { u, w, y0, h, arch? } in the wall's run coordinate.
export function opens(list) {
  return (u, y) => {
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      const hw = o.w / 2;
      if (u < o.u - hw || u > o.u + hw) continue;
      if (y < o.y0) continue;
      if (o.arch) {
        const yc = o.y0 + o.h - hw;
        if (y <= yc) return true;
        const dx = u - o.u, dy = y - yc;
        if (dx * dx + dy * dy < hw * hw) return true;
      } else if (y < o.y0 + o.h) return true;
    }
    return false;
  };
}

// Shell holes: ragged ellipsoids of absence.
export function blasts(ctx, list) {
  return (x, y, z) => {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const dx = (x - b.x) / (b.rx || b.r);
      const dy = (y - b.y) / (b.ry || b.r);
      const dz = (z - b.z) / (b.rz || b.r);
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > 1.7) continue;
      const wob = ctx.noise3d(x * 0.45 + b.x * 0.3, y * 0.4, z * 0.45 - b.z * 0.3) * 0.3;
      if (d < 1 + wob) return true;
    }
    return false;
  };
}

// Nearness to a shell hole, 0..1 — smears soot round every tear.
export function scorch(list, reach) {
  return (x, y, z) => {
    let best = 0;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const r = (b.rx || b.r) + reach;
      const d = Math.sqrt((x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) + (z - b.z) * (z - b.z));
      const f = Math.max(0, 1 - d / (r * 1.9));
      if (f > best) best = f;
    }
    return best;
  };
}

// A broken wall head: height as a function of the run coordinate.
export function ragged(ctx, top, amp, freq, seed) {
  return (u) => top
    - amp * (0.5 + 0.5 * ctx.noise2d(u * freq + seed, seed * 0.37))
    - amp * 0.35 * Math.max(0, ctx.noise2d(u * freq * 2.7 - seed, 3.1));
}

export function groundMin(ctx, pts) {
  let m = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const g = ctx.groundY(pts[i][0], pts[i][1]);
    if (g < m) m = g;
  }
  return m === Infinity ? 0 : m;
}

// ── dressing ────────────────────────────────────────────────────────────────
export function rubbleField(ctx, o) {
  const count = o.count | 0;
  for (let i = 0; i < count; i++) {
    const a = ctx.random() * TAU;
    const rr = Math.pow(ctx.random(), o.bias ?? 0.65);
    const x = o.cx + Math.cos(a) * o.rx * rr;
    const z = o.cz + Math.sin(a) * (o.rz ?? o.rx) * rr;
    const s = (o.size ?? 0.55) * (0.45 + ctx.random() * 1.15);
    const mound = (o.height ?? 1.1) * Math.max(0, 1 - rr) * (0.35 + ctx.random() * 0.8);
    const gy = ctx.groundY(x, z) + (o.lift ?? 0);
    const f = xf(x, gy + mound, z, ctx.random() * 360, (ctx.random() - 0.5) * 55, (ctx.random() - 0.5) * 55);
    fbox(ctx, f, [0, 0, 0], [
      s * (0.7 + ctx.random() * 0.7), s * (0.3 + ctx.random() * 0.45), s * (0.7 + ctx.random() * 0.7),
    ], o.paint);
  }
}

// Reinforcement curling out of a torn concrete edge.
export function rebar(ctx, x, y, z, dx, dz, len, paint, seed) {
  const pts = [];
  const radii = [];
  const n = 5;
  const wob = ctx.noise2d(x * 0.7 + seed, z * 0.7 - seed);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const curl = Math.sin(t * 2.4 + wob) * len * 0.22;
    pts.push([
      x + dx * len * t - dz * curl,
      y - len * 0.55 * t * t + Math.sin(t * 3.4 + wob) * 0.07,
      z + dz * len * t + dx * curl,
    ]);
    radii.push(0.034 - 0.01 * t);
  }
  G.polyTube(ctx, pts, radii, 4, [0, 1, 0], paint);
}

// A ring loft about the frame's Y axis. prof = [[y, radius], ...], bottom→top.
export function lathe(ctx, f, prof, sides, paint) {
  for (let k = 0; k < prof.length - 1; k++) {
    const y0 = prof[k][0], r0 = prof[k][1];
    const y1 = prof[k + 1][0], r1 = prof[k + 1][1];
    for (let i = 0; i < sides; i++) {
      const a0 = -(i / sides) * TAU, a1 = -((i + 1) / sides) * TAU;
      qd(ctx, paint,
        f(Math.cos(a0) * r0, y0, Math.sin(a0) * r0),
        f(Math.cos(a0) * r1, y1, Math.sin(a0) * r1),
        f(Math.cos(a1) * r1, y1, Math.sin(a1) * r1),
        f(Math.cos(a1) * r0, y0, Math.sin(a1) * r0));
    }
  }
}

// A flat disc in the frame's XY plane at local z, normal +Z.
export function disc(ctx, f, cx, cy, cz, r, sides, paint) {
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * TAU, a1 = ((i + 1) / sides) * TAU;
    tr(ctx, paint,
      f(cx, cy, cz),
      f(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cz),
      f(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cz));
  }
}

// A clock with no hands: stone surround, bone dial, twelve marks, bare spindle.
// The frame sits proud of the wall; the drum runs back INTO it.
export function clockFace(ctx, f, r, stone, dial, mark) {
  const S = 20;
  for (let i = 0; i < S; i++) {
    const a0 = (i / S) * TAU, a1 = ((i + 1) / S) * TAU;
    const R0 = r, R1 = r * 1.22;
    qd(ctx, stone,
      f(Math.cos(a0) * R0, Math.sin(a0) * R0, 0.16), f(Math.cos(a1) * R0, Math.sin(a1) * R0, 0.16),
      f(Math.cos(a1) * R1, Math.sin(a1) * R1, 0.16), f(Math.cos(a0) * R1, Math.sin(a0) * R1, 0.16));
    qd(ctx, stone,
      f(Math.cos(a1) * R1, Math.sin(a1) * R1, 0.16), f(Math.cos(a1) * R1, Math.sin(a1) * R1, -0.34),
      f(Math.cos(a0) * R1, Math.sin(a0) * R1, -0.34), f(Math.cos(a0) * R1, Math.sin(a0) * R1, 0.16));
  }
  disc(ctx, f, 0, 0, 0, r, S, dial);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const w = i % 3 === 0 ? 0.09 : 0.05;
    const L = i % 3 === 0 ? 0.2 : 0.12;
    const ux = Math.cos(a), uy = Math.sin(a);
    const cx = ux * (r - L * 0.7), cy = uy * (r - L * 0.7);
    const p = (su, sv) => f(cx + ux * su * L - uy * sv * w, cy + uy * su * L + ux * sv * w, 0.03);
    qd(ctx, mark, p(-1, -1), p(1, -1), p(1, 1), p(-1, 1));
  }
  disc(ctx, f, 0, 0, 0.04, r * 0.08, 8, mark);  // the spindle the hands were on
}

// A cast-iron bath. Frame origin = tub centre at its feet.
export function bathtub(ctx, f, enamel, iron) {
  const L = 0.78, W = 0.34, H = 0.56;
  const ring = (y, ex, ez) => [
    [-L * ex, y, -W * ez], [L * ex, y, -W * ez], [L * ex, y, W * ez], [-L * ex, y, W * ez],
  ];
  const lo = ring(0.06, 0.9, 0.86), hi = ring(H, 1.0, 1.0);
  const F = (p) => f(p[0], p[1], p[2]);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    qd(ctx, enamel, F(lo[i]), F(hi[i]), F(hi[j]), F(lo[j]));
  }
  qd(ctx, iron, F(lo[3]), F(lo[2]), F(lo[1]), F(lo[0]));
  const ilo = ring(0.16, 0.8, 0.72), ihi = ring(H - 0.04, 0.92, 0.88);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    qd(ctx, enamel, F(ilo[j]), F(ihi[j]), F(ihi[i]), F(ilo[i]));
  }
  qd(ctx, enamel, F(ilo[0]), F(ilo[1]), F(ilo[2]), F(ilo[3]));
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    qd(ctx, enamel, F(hi[i]), F(ihi[i]), F(ihi[j]), F(hi[j]));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    fbox(ctx, f, [sx * L * 0.72, -0.02, sz * W * 0.66], [0.055, 0.1, 0.055], iron);
  }
  fbox(ctx, f, [-L * 0.86, H + 0.1, 0], [0.05, 0.12, 0.05], iron);
  G.tube(ctx, f(-L * 0.86, H + 0.2, 0), f(-L * 0.6, H + 0.16, 0), 0.035, 0.03, 6, [0, 1, 0], iron);
}

// ── PART: apartment ─────────────────────────────────────────────────────────
export function apartment(ctx, P, C) {
  const storeys = Math.max(2, Math.min(5, Math.round(P.storeys ?? 4)));
  const bays = Math.max(2, Math.min(5, Math.round(P.bays ?? 4)));
  const dmg = Math.max(1, Math.min(3, Math.round(P.damage ?? 2)));
  const gone = String(P.gone ?? "ne").toLowerCase();
  const sx = gone.indexOf("e") >= 0 ? 1 : -1;
  const sz = gone.indexOf("s") >= 0 ? 1 : -1;

  const BW = 3.4, D = 9.4, T = 0.36;
  const W = bays * BW;
  const hx = W / 2, hz = D / 2;
  const y0 = ctx.groundY(0, 0);
  const H = y0 + storeys * STOREY;
  const base = groundMin(ctx, [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz], [0, 0]]) - 0.8;

  // the sheared corner: a diagonal plane that bites deeper the higher it goes
  const reachTop = Math.min(W * 0.5, BW * 2.1);
  const reachAt = (y) => reachTop * Math.max(0, (y - y0) / (H - y0) - 0.22) / 0.78;
  const shear = (x, y, z) => {
    const reach = reachAt(y);
    if (reach <= 0) return false;
    const inX = sx * x - (hx - reach);
    const inZ = sz * z - (hz - reach * 0.72);
    return inX + inZ + ctx.noise3d(x * 0.33, y * 0.28, z * 0.33) * 0.85 > 0;
  };

  const holes = [
    { x: -sx * hx * 0.35, y: y0 + STOREY * 1.55, z: hz, r: 1.9 + dmg * 0.35, rz: 3.4 },
    { x: -sx * hx, y: y0 + STOREY * Math.max(1, storeys - 1.3), z: hz * 0.1, r: 1.5 + dmg * 0.3, rx: 3.0 },
  ];
  if (dmg >= 2) holes.push({ x: sx * hx * 0.1, y: y0 + STOREY * 0.62, z: -hz, r: 1.7, rz: 3.0 });
  if (dmg >= 3) {
    holes.push({ x: -sx * hx * 0.62, y: y0 + STOREY * Math.min(2.4, storeys - 0.6), z: hz * 0.55, r: 2.2, rz: 4.5 });
    holes.push({ x: sx * hx * 0.5, y: y0 + STOREY * 0.4, z: hz, r: 1.4, rz: 2.6 });
  }
  const blast = blasts(ctx, holes);
  const near = scorch(holes, 1.4);
  const roof = ragged(ctx, H, 0.55 + dmg * 0.45, 0.42, 13);
  const brickPaint = (x, y, z) => (near(x, y, z) > 0.45 + ctx.noise2d(x, z) * 0.2 ? C.soot : C.brick)(x, y, z);
  const stuccoPaint = (x, y, z) => (near(x, y, z) > 0.5 ? C.sootS : C.stucco)(x, y, z);

  // openings
  const frontList = [], backList = [], sideList = [];
  for (let k = 0; k < storeys; k++) {
    for (let b = 0; b < bays; b++) {
      const u = -hx + BW * (b + 0.5);
      if (k === 0 && b === Math.floor(bays / 2)) frontList.push({ u, w: 1.35, y0: y0, h: 2.45 });
      else frontList.push({ u, w: 1.2, y0: y0 + k * STOREY + 0.95, h: 1.7 });
      backList.push({ u, w: 1.15, y0: y0 + k * STOREY + 0.95, h: 1.65 });
    }
    for (const u of [-2.7, 0.3, 3.0]) sideList.push({ u, w: 1.05, y0: y0 + k * STOREY + 1.0, h: 1.55 });
  }
  const frontOpen = opens(frontList), backOpen = opens(backList), sideOpen = opens(sideList);
  const shell = (openFn, runOf) => (x, y, z) => {
    if (shear(x, y, z) || blast(x, y, z)) return false;
    const u = runOf(x, z);
    if (y > roof(u)) return false;
    if (y > y0 - 0.05 && openFn(u, y)) return false;
    return true;
  };

  wall(ctx, { facing: "+z", plane: hz, a: -hx, b: hx, y0: base, y1: H + 1.0, t: T, cell: 0.85,
    keep: shell(frontOpen, (x) => x), paintOut: brickPaint, paintIn: C.brickIn, paintEdge: C.brickIn });
  wall(ctx, { facing: "-z", plane: -hz, a: -hx, b: hx, y0: base, y1: H + 1.0, t: T, cell: 0.85,
    keep: shell(backOpen, (x) => x), paintOut: brickPaint, paintIn: C.brickIn, paintEdge: C.brickIn });
  for (const s of [1, -1]) {
    wall(ctx, { facing: s > 0 ? "+x" : "-x", plane: s * hx, a: -hz, b: hz, y0: base, y1: H + 1.0, t: T, cell: 0.85,
      keep: shell(sideOpen, (x, z) => z), paintOut: stuccoPaint, paintIn: C.plaster, paintEdge: C.stuccoEdge });
  }

  // ── the spine: the interior wall that still has its wallpaper
  const doorList = [];
  for (let k = 0; k < storeys; k++) {
    for (let b = 0; b < bays; b++) doorList.push({ u: -hx + BW * (b + 0.5), w: 0.95, y0: y0 + k * STOREY, h: 2.1, arch: true });
  }
  const doors = opens(doorList);
  const spineTop = ragged(ctx, H - 0.6, 1.4 + dmg * 0.5, 0.55, 41);
  const paperFace = band((x, y) => y > y0 + STOREY * 0.9 && y < y0 + STOREY * 3.1, C.paper, C.paperPale);
  wall(ctx, {
    facing: "+z", plane: -0.9, a: -hx + 0.1, b: hx - 0.1, y0: base + 0.4, y1: H, t: 0.16, cell: 0.7,
    keep: (x, y, z) => !shear(x, y, z) && !blast(x, y, z) && y < spineTop(x) && !(y > y0 && doors(x, y)),
    paintOut: paperFace, paintIn: C.paperPale, paintEdge: C.paperPale,
  });
  for (let b = 1; b < bays; b += 2) {
    const px = -hx + BW * b;
    const top = ragged(ctx, y0 + STOREY * Math.min(storeys, 2.4), 1.6, 0.7, 60 + b);
    wall(ctx, {
      facing: "+x", plane: px, a: -hz + 0.1, b: -0.9, y0: base + 0.4, y1: y0 + STOREY * Math.min(storeys, 3), t: 0.14, cell: 0.7,
      keep: (x, y, z) => !shear(x, y, z) && !blast(x, y, z) && y < top(z)
        && !(y > y0 && y < y0 + 2.05 && z > -hz + 1.4 && z < -hz + 2.4),
      paintOut: C.paperPale, paintIn: paperFace, paintEdge: C.paperPale,
    });
  }

  // ── floors, sheared through so the rooms read in cross-section
  const IN = 0.06;   // slabs run into the wall bodies, never flush to their faces
  for (let k = 1; k < storeys; k++) {
    slab(ctx, {
      y: y0 + k * STOREY, t: 0.26, x0: -hx + IN, x1: hx - IN, z0: -hz + IN, z1: hz - IN, cell: 1.0,
      keep: (x, y, z) => {
        if (shear(x, y, z) || blast(x, y, z)) return false;
        const bx = -hx + BW * (((k * 2 + 1) % bays) + 0.5);
        const bz = (k % 2 === 0 ? 1 : -1) * hz * 0.45;
        const d = Math.hypot((x - bx) / (BW * 0.85), (z - bz) / 2.6);
        return d > 1 + ctx.noise2d(x * 0.6 + k, z * 0.6) * 0.28;
      },
      paintTop: C.concrete, paintBottom: C.core, paintEdge: C.core,
    });
  }
  slab(ctx, {
    y: y0 + 0.14, t: 0.34, x0: -hx + IN, x1: hx - IN, z0: -hz + IN, z1: hz - IN, cell: 1.1,
    keep: (x, y, z) => Math.hypot((x + hx * 0.55) / 1.5, (z - 1.8) / 1.2) > 1,   // cellar mouth
    paintTop: C.concrete, paintBottom: C.core, paintEdge: C.core,
  });

  // ── rebar out of every torn slab edge
  for (let k = 1; k < storeys; k++) {
    const y = y0 + k * STOREY - 0.13;
    const reach = reachAt(y0 + k * STOREY);
    for (let i = 0; i < 3; i++) {
      const t = 0.2 + i * 0.3;
      rebar(ctx, sx * (hx - reach * (0.25 + t * 0.7)), y, sz * (hz - reach * 0.72 * (0.9 - t * 0.6)),
        sx * 0.7, sz * 0.7, 1.1 + ctx.random() * 0.7, C.rust, k * 3 + i);
    }
  }

  // ── the bathtub, still hooked on a sheared slab
  {
    const k = Math.min(2, storeys - 1);
    const reach = reachAt(y0 + k * STOREY);
    bathtub(ctx, xf(sx * (hx - reach * 0.62), y0 + k * STOREY + 0.02, sz * (hz - reach * 0.55), sx * 34, 0, sx * -21), C.enamel, C.iron);
  }

  // ── the spill at the base, and slabs ramped against it
  rubbleField(ctx, { cx: sx * hx * 0.85, cz: sz * hz * 1.15, rx: W * 0.42, rz: 5.4, count: 24 + dmg * 8, height: 1.5 + dmg * 0.3, size: 0.62, paint: C.rubble });
  rubbleField(ctx, { cx: -sx * hx * 0.5, cz: hz + 1.6, rx: W * 0.36, rz: 2.4, count: 12, height: 0.8, size: 0.5, paint: C.rubble });
  {
    const gx = sx * (hx - 1.2), gz = sz * (hz + 2.2);
    fbox(ctx, xf(gx, ctx.groundY(gx, gz) + 1.15, gz, sx * 18, -34 * sz, 0), [0, 0, 0], [2.1, 0.13, 1.5], C.concrete);
    fbox(ctx, xf(gx - sx * 3.0, ctx.groundY(gx, gz) + 0.6, gz + sz * 1.1, sx * 55, -22 * sz, 8), [0, 0, 0], [1.6, 0.12, 1.2], C.concrete);
  }
  for (let i = 0; i < 4 + dmg; i++) {
    const t = i / (4 + dmg);
    const x = sx * (hx - 0.6 - t * W * 0.3);
    const z = sz * (hz + 0.4 + ctx.random() * 1.6);
    const g = ctx.groundY(x, z);
    G.tube(ctx, [x, g + 0.15, z], [x - sx * (1.4 + ctx.random()), g + 1.6 + ctx.random() * 1.6, z - sz * (0.6 + ctx.random())], 0.09, 0.07, 4, [0, 1, 0], C.char);
  }
}

// ── PART: townhall ──────────────────────────────────────────────────────────
export function townhall(ctx, P, C) {
  const bays = Math.max(4, Math.min(6, Math.round(P.bays ?? 5)));
  const dmg = Math.max(1, Math.min(3, Math.round(P.damage ?? 2)));
  const BW = 3.9, D = 12.4, T = 0.62;
  const W = bays * BW;
  const hx = W / 2, hz = D / 2;
  const y0 = ctx.groundY(0, 0);
  const HW = y0 + 9.4;                  // wall head, where the roof used to sit
  const base = groundMin(ctx, [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) - 0.9;

  const holes = [
    { x: -hx * 0.45, y: y0 + 7.2, z: hz, r: 2.4, rz: 3.6 },
    { x: hx * 0.72, y: y0 + 5.4, z: -hz, r: 1.9 + dmg * 0.3, rz: 3.2 },
  ];
  if (dmg >= 2) holes.push({ x: hx, y: y0 + 6.6, z: -hz * 0.3, r: 2.1, rx: 3.4 });
  if (dmg >= 3) holes.push({ x: -hx, y: y0 + 4.2, z: hz * 0.4, r: 1.8, rx: 3.0 });
  const blast = blasts(ctx, holes);
  const near = scorch(holes, 1.6);
  const stonePaint = (x, y, z) => (near(x, y, z) > 0.5 ? C.sootT : C.stone)(x, y, z);
  const head = ragged(ctx, HW, 1.2 + dmg * 0.5, 0.5, 7);

  const longList = [];
  for (let b = 0; b < bays; b++) {
    const u = -hx + BW * (b + 0.5);
    longList.push({ u, w: 1.55, y0: y0 + 1.1, h: 3.3, arch: true });
    longList.push({ u, w: 1.35, y0: y0 + 5.5, h: 2.6, arch: true });
  }
  const longOpen = opens(longList);
  const doorOpen = opens([{ u: 0, w: 2.4, y0: y0, h: 3.9, arch: true }]);
  const frontOpen = (u, y) => doorOpen(u, y) || (Math.abs(u) > 2.1 && longOpen(u, y));
  const endOpen = opens([
    { u: 0, w: 1.5, y0: y0 + 1.2, h: 3.2, arch: true },
    { u: -3.4, w: 1.3, y0: y0 + 5.6, h: 2.3, arch: true },
    { u: 3.4, w: 1.3, y0: y0 + 5.6, h: 2.3, arch: true },
  ]);
  const shell = (openFn, runOf) => (x, y, z) => {
    if (blast(x, y, z)) return false;
    const u = runOf(x, z);
    if (y > head(u)) return false;
    if (y > y0 - 0.05 && openFn(u, y)) return false;
    return true;
  };

  wall(ctx, { facing: "+z", plane: hz, a: -hx, b: hx, y0: base, y1: HW + 1.4, t: T, cell: 0.9, keep: shell(frontOpen, (x) => x), paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn });
  wall(ctx, { facing: "-z", plane: -hz, a: -hx, b: hx, y0: base, y1: HW + 1.4, t: T, cell: 0.9, keep: shell(longOpen, (x) => x), paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn });
  for (const s of [1, -1]) {
    wall(ctx, { facing: s > 0 ? "+x" : "-x", plane: s * hx, a: -hz, b: hz, y0: base, y1: HW + 1.4, t: T, cell: 0.9, keep: shell(endOpen, (x, z) => z), paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn });
  }

  // cornice: overlapping 1.1 m segments, skipped where the wall under them is gone
  const yc = y0 + 8.35;
  for (let x = -hx + 0.6; x < hx; x += 1.1) {
    for (const s of [1, -1]) {
      if (blast(x, yc, s * hz) || head(x) < yc + 0.45) continue;
      const z0 = s > 0 ? hz : -hz - 0.56, z1 = s > 0 ? hz + 0.56 : -hz;
      box(ctx, x - 0.6, x + 0.6, yc, yc + 0.42, z0, z1, C.stone);
    }
  }
  for (let z = -hz + 0.6; z < hz; z += 1.1) {
    for (const s of [1, -1]) {
      if (blast(s * hx, yc, z) || head(z) < yc + 0.45) continue;
      const x0 = s > 0 ? hx : -hx - 0.56, x1 = s > 0 ? hx + 0.56 : -hx;
      box(ctx, x0, x1, yc, yc + 0.42, z - 0.6, z + 0.6, C.stone);
    }
  }

  // ── the portico: four columns, an entablature, a pediment, a stopped clock
  const pz = hz + 2.5;
  for (let i = 0; i < 4; i++) {
    const cx = -4.5 + i * 3.0;
    const g = ctx.groundY(cx, pz);
    const broken = dmg >= 2 && i === 3;
    const top = broken ? g + 3.1 : g + 5.6;
    box(ctx, cx - 0.55, cx + 0.55, g - 0.5, g + 0.35, pz - 0.55, pz + 0.55, C.stone);
    lathe(ctx, xf(cx, g + 0.3, pz, 0, 0, 0), [[0, 0.44], [0.3, 0.4], [top - g - 0.6, 0.36], [top - g - 0.35, 0.44], [top - g, 0.42]], 10, C.stone);
    if (!broken) box(ctx, cx - 0.58, cx + 0.58, top - 0.08, top + 0.34, pz - 0.58, pz + 0.58, C.stone);
  }
  if (dmg < 3) {
    box(ctx, -5.4, 5.4, y0 + 5.95, y0 + 6.85, hz - 0.1, pz + 0.75, C.stone);
    const apexF = [0, y0 + 8.9, pz + 0.3], apexB = [0, y0 + 8.9, hz - 0.1];
    const L = [-5.4, y0 + 6.85, pz + 0.3], R = [5.4, y0 + 6.85, pz + 0.3];
    const Lb = [-5.4, y0 + 6.85, hz - 0.1], Rb = [5.4, y0 + 6.85, hz - 0.1];
    tr(ctx, C.stone, L, R, apexF);
    tr(ctx, C.stoneIn, apexB, Rb, Lb);
    qd(ctx, C.stone, L, apexF, apexB, Lb);
    qd(ctx, C.stone, apexF, R, Rb, apexB);
    qd(ctx, C.stone, Lb, Rb, R, L);
  }
  // the clock: in the tympanum when the pediment survives, on the wall when it
  // doesn't — either way it faces the square, and either way it has no hands
  if (dmg < 3) clockFace(ctx, xf(0, y0 + 7.7, pz + 0.44, 0, 0, 0), 0.95, C.stone, C.enamel, C.iron);
  else clockFace(ctx, xf(0, y0 + 7.35, hz + 0.42, 0, 0, 0), 1.35, C.stone, C.enamel, C.iron);

  // ── inside: flagstones, a half-fallen gallery, the roof on the floor
  const IN = 0.1;
  slab(ctx, { y: y0 + 0.16, t: 0.42, x0: -hx + IN, x1: hx - IN, z0: -hz + IN, z1: hz - IN, cell: 1.2, paintTop: C.stone, paintBottom: C.stoneIn, paintEdge: C.stoneIn });
  slab(ctx, {
    y: y0 + 5.2, t: 0.3, x0: -hx + IN, x1: hx - IN, z0: -hz + IN, z1: -1.2, cell: 1.0,
    keep: (x, y, z) => !blast(x, y, z) && Math.hypot((x - hx * 0.3) / 4.4, (z + 4.2) / 2.8) > 1 + ctx.noise2d(x * 0.5, z * 0.5) * 0.2,
    paintTop: C.timber, paintBottom: C.char, paintEdge: C.char,
  });
  for (let i = 0; i < 3; i++) {
    const f = xf(ctx.random() * 2 - 1, y0 + 0.55 + i * 0.15, -hz + 3.0 + i * 4.2, i * 23 - 20, i === 1 ? -14 : 9, i * 7);
    fbox(ctx, f, [0, 0, 0], [hx * 0.75, 0.13, 0.16], C.char);
    fbox(ctx, f, [-2.2, 0.6, 0], [1.9, 0.11, 0.13], C.char);
    fbox(ctx, f, [2.4, 0.7, 0], [2.1, 0.11, 0.13], C.char);
  }
  rubbleField(ctx, { cx: 0, cz: 0, rx: hx * 0.9, rz: hz * 0.8, count: 22 + dmg * 5, height: 0.6, size: 0.5, lift: 0.2, paint: C.rubble });
  rubbleField(ctx, { cx: -hx * 0.5, cz: hz + 1.4, rx: W * 0.4, rz: 2.6, count: 16, height: 1.0, size: 0.6, paint: C.rubble });
}

// ── PART: rowhouse ──────────────────────────────────────────────────────────
export function rowhouse(ctx, P, C) {
  const units = Math.max(2, Math.min(4, Math.round(P.units ?? 3)));
  const dmg = Math.max(1, Math.min(3, Math.round(P.damage ?? 2)));
  const UW = 5.3, D = 8.2, T = 0.32;
  const W = units * UW;
  const hx = W / 2, hz = D / 2;
  const y0 = ctx.groundY(0, 0);
  const EAVE = y0 + 2 * STOREY;
  const RIDGE = y0 + 9.1;
  const base = groundMin(ctx, [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) - 0.8;
  const ux = (i) => -hx + UW * (i + 0.5);

  const holes = [
    { x: ux(units - 1), y: y0 + 5.0, z: 0, r: 2.6 + dmg * 0.4, rx: 3.6, rz: 4.4 },
    { x: ux(Math.max(1, units - 2)), y: y0 + 4.2, z: hz, r: 2.0 + dmg * 0.3, rz: 3.2 },
  ];
  const blast = blasts(ctx, holes);
  const near = scorch(holes, 1.8);
  const brickPaint = (x, y, z) => (near(x, y, z) > 0.5 ? C.soot : C.brick)(x, y, z);

  // full over the one that survived, fallen away over the rest
  const headAt = (x) => {
    const i = Math.max(0, Math.min(units - 1, Math.floor((x + hx) / UW)));
    if (i === 0) return EAVE + 0.2;
    const fall = 1.6 + i * 0.55 + dmg * 0.35;
    return Math.max(y0 + 1.2, EAVE - fall - 1.2 * (0.5 + 0.5 * ctx.noise2d(x * 0.5, 3)));
  };

  const frontList = [], backList = [];
  for (let i = 0; i < units; i++) {
    frontList.push({ u: ux(i) - 1.35, w: 1.15, y0: y0, h: 2.15 });
    frontList.push({ u: ux(i) + 1.15, w: 1.5, y0: y0 + 0.85, h: 1.75 });
    frontList.push({ u: ux(i) - 1.3, w: 1.15, y0: y0 + STOREY + 0.85, h: 1.6 });
    frontList.push({ u: ux(i) + 1.2, w: 1.3, y0: y0 + STOREY + 0.85, h: 1.6 });
    backList.push({ u: ux(i), w: 1.3, y0: y0 + 0.9, h: 1.6 });
    backList.push({ u: ux(i) - 1.4, w: 1.0, y0: y0 + STOREY + 0.9, h: 1.5 });
  }
  const frontOpen = opens(frontList), backOpen = opens(backList);
  const shell = (openFn) => (x, y, z) => {
    if (blast(x, y, z)) return false;
    if (y > headAt(x)) return false;
    if (y > y0 - 0.05 && openFn(x, y)) return false;
    return true;
  };

  wall(ctx, { facing: "+z", plane: hz, a: -hx, b: hx, y0: base, y1: EAVE + 1.0, t: T, cell: 0.7, keep: shell(frontOpen), paintOut: brickPaint, paintIn: C.brickIn, paintEdge: C.brickIn });
  wall(ctx, { facing: "-z", plane: -hz, a: -hx, b: hx, y0: base, y1: EAVE + 1.0, t: T, cell: 0.7, keep: shell(backOpen), paintOut: brickPaint, paintIn: C.brickIn, paintEdge: C.brickIn });
  for (const s of [-1, 1]) {
    wall(ctx, {
      facing: s > 0 ? "+x" : "-x", plane: s * hx, a: -hz, b: hz, y0: base, y1: RIDGE + 0.2, t: T, cell: 0.7,
      keep: (x, y, z) => !blast(x, y, z) && y < (s < 0
        ? Math.min(RIDGE, y0 + 9.05 - Math.abs(z) * (2.6 / hz))
        : headAt(x)),
      paintOut: brickPaint, paintIn: C.brickIn, paintEdge: C.brickIn,
    });
  }

  // party-wall fins between the units
  for (let i = 1; i < units; i++) {
    const px = -hx + UW * i;
    const finTop = (z) => Math.min(y0 + 8.2, EAVE - 0.8 + 1.4 * (0.5 + 0.5 * ctx.noise2d(z * 0.6 + i, 9)) - i * 0.5);
    wall(ctx, {
      facing: "+x", plane: px, a: -hz + 0.08, b: hz - 0.08, y0: base, y1: y0 + 8.4, t: 0.24, cell: 0.7,
      keep: (x, y, z) => !blast(x, y, z) && y < finTop(z) && !(y > y0 && y < y0 + 2.05 && Math.abs(z - 1.1) < 0.5),
      paintOut: C.brickIn, paintIn: C.brickIn, paintEdge: C.brickIn,
    });
  }
  // chimney stacks — every one of them still up. Brick first, then all the
  // pots, so the brick and the clay never trade the albedo back and forth.
  const stackTop = (i) => y0 + 9.3 - (i === units ? 1.5 : 0) - (i === 1 ? 0.7 : 0);
  for (let i = 0; i <= units; i++) {
    const px = -hx + UW * i;
    box(ctx, px - 0.75, px + 0.75, base, stackTop(i), -1.15, 1.05, C.brick);
    box(ctx, px - 0.92, px + 0.92, stackTop(i) - 0.16, stackTop(i) + 0.36, -1.32, 1.22, C.brick);
  }
  for (let i = 0; i <= units; i++) {
    const px = -hx + UW * i;
    for (const cz of [-0.45, 0.4]) lathe(ctx, xf(px, stackTop(i) + 0.3, cz, 0, 0, 0), [[0, 0.2], [0.55, 0.19], [0.62, 0.22], [0.66, 0.2]], 8, C.rust);
  }

  // ── the standing unit keeps its floors and its slate roof
  const IN = 0.06;
  slab(ctx, { y: y0 + 0.14, t: 0.3, x0: -hx + IN, x1: hx - IN, z0: -hz + IN, z1: hz - IN, cell: 1.1,
    keep: (x, y, z) => !blast(x, y, z), paintTop: C.timber, paintBottom: C.char, paintEdge: C.char });
  slab(ctx, { y: y0 + STOREY, t: 0.24, x0: -hx + IN, x1: -hx + UW, z0: -hz + IN, z1: hz - IN, cell: 0.95,
    keep: (x, y, z) => !blast(x, y, z), paintTop: C.timber, paintBottom: C.char, paintEdge: C.char });
  {
    const x0 = -hx - 0.2, x1 = -hx + UW;
    const rise = RIDGE - EAVE + 0.35;
    for (const s of [1, -1]) {
      const eaveZ = s * (hz + 0.35);
      const len = Math.hypot(hz + 0.35, rise);
      const ny = (hz + 0.35) / len, nz = s * (rise / len);
      gridPanel(ctx, {
        NU: Math.round((x1 - x0) / 0.8), NV: 6, t: 0.14,
        P: (u, v, n) => {
          const x = s > 0 ? x0 + u * (x1 - x0) : x1 - u * (x1 - x0);
          return [x, EAVE - 0.35 + v * rise + n * ny, eaveZ * (1 - v) + n * nz];
        },
        keep: (x, y, z) => !blast(x, y, z) && ctx.noise2d(x * 0.9, z * 0.9 + s) > -0.55,
        paintOut: C.slate, paintIn: C.char, paintEdge: C.char,
      });
    }
    box(ctx, x0, x1, RIDGE - 0.16, RIDGE + 0.1, -0.18, 0.18, C.slate);
    for (let r = 0; r < 4; r++) {
      const rx = -hx + 1.0 + r * 1.1;
      G.tube(ctx, [rx, RIDGE - 0.2, 0], [rx, EAVE - 0.3, hz + 0.3], 0.08, 0.07, 4, [0, 1, 0], C.timber);
      G.tube(ctx, [rx, RIDGE - 0.2, 0], [rx, EAVE - 0.3, -hz - 0.3], 0.08, 0.07, 4, [0, 1, 0], C.timber);
    }
  }

  // ── the pancaked units: slabs dropped like cards onto a rubble mound
  for (let i = 1; i < units; i++) {
    const cx = ux(i);
    rubbleField(ctx, { cx, cz: 0, rx: UW * 0.48, rz: hz * 0.85, count: 22, height: 1.9, size: 0.62, paint: C.rubble });
    for (let s = 0; s < 3; s++) {
      const f = xf(cx + (ctx.random() - 0.5) * 2.0, ctx.groundY(cx, 0) + 0.5 + s * 0.85, (ctx.random() - 0.5) * 3.6,
        ctx.random() * 60 - 30, (ctx.random() - 0.5) * 34, (ctx.random() - 0.5) * 30);
      fbox(ctx, f, [0, 0, 0], [UW * 0.36, 0.11, hz * 0.5], s === 1 ? C.timber : C.concrete);
    }
    for (let r = 0; r < 4; r++) {
      const bx = cx + (ctx.random() - 0.5) * UW * 0.8;
      const bz = (ctx.random() - 0.5) * D * 0.7;
      const g = ctx.groundY(bx, bz);
      G.tube(ctx, [bx, g + 0.2, bz], [bx + (ctx.random() - 0.5) * 3, g + 1.4 + ctx.random() * 2.2, bz + (ctx.random() - 0.5) * 3], 0.09, 0.07, 4, [0, 1, 0], C.char);
    }
  }
  rubbleField(ctx, { cx: hx * 0.35, cz: hz + 2.0, rx: W * 0.35, rz: 2.6, count: 16, height: 1.0, size: 0.55, paint: C.rubble });
}

// ── PART: farmhouse ─────────────────────────────────────────────────────────
export function farmhouse(ctx, P, C) {
  const dmg = Math.max(1, Math.min(3, Math.round(P.damage ?? 2)));
  const W = 11.6, D = 7.6, T = 0.46;
  const hx = W / 2, hz = D / 2;
  const y0 = ctx.groundY(0, 0);
  const EAVE = y0 + 4.5;
  const RIDGE = y0 + 7.1;
  const base = groundMin(ctx, [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) - 0.8;

  const holes = [{ x: hx * 0.55, y: y0 + 3.6, z: -hz, r: 1.9 + dmg * 0.3, rz: 3.0 }];
  if (dmg >= 2) holes.push({ x: -hx, y: y0 + 2.6, z: hz * 0.3, r: 1.7, rx: 2.8 });
  const blast = blasts(ctx, holes);

  // the fire climbed the walls: soot heaviest at the eaves, licking up from heads
  const sooty = (x, y, z) => {
    const t = (y - y0) / (RIDGE - y0);
    return (t + ctx.noise2d(x * 0.55, z * 0.55 + y * 0.3) * 0.22 > 0.5 ? C.sootS : C.stucco)(x, y, z);
  };
  const head = ragged(ctx, EAVE + 0.25, 0.9 + dmg * 0.3, 0.65, 5);
  const gable = (z) => RIDGE - Math.abs(z) * ((RIDGE - EAVE) / hz) - 0.35 * (0.5 + 0.5 * ctx.noise2d(z * 0.9, 17));

  const frontOpen = opens([
    { u: 0, w: 1.25, y0: y0, h: 2.15 },
    { u: -3.3, w: 1.35, y0: y0 + 0.95, h: 1.5 },
    { u: 3.4, w: 1.35, y0: y0 + 0.95, h: 1.5 },
  ]);
  const backOpen = opens([
    { u: -2.2, w: 1.2, y0: y0 + 1.0, h: 1.4 },
    { u: 2.6, w: 1.2, y0: y0 + 1.0, h: 1.4 },
  ]);
  const endOpen = opens([{ u: 0.6, w: 1.0, y0: y0 + 1.1, h: 1.3 }]);

  wall(ctx, { facing: "+z", plane: hz, a: -hx, b: hx, y0: base, y1: EAVE + 1.2, t: T, cell: 0.7,
    keep: (x, y, z) => !blast(x, y, z) && y < head(x) && !(y > y0 - 0.05 && frontOpen(x, y)),
    paintOut: sooty, paintIn: C.stuccoEdge, paintEdge: C.stuccoEdge });
  wall(ctx, { facing: "-z", plane: -hz, a: -hx, b: hx, y0: base, y1: EAVE + 1.2, t: T, cell: 0.7,
    keep: (x, y, z) => !blast(x, y, z) && y < head(x) && !(y > y0 - 0.05 && backOpen(x, y)),
    paintOut: sooty, paintIn: C.stuccoEdge, paintEdge: C.stuccoEdge });
  for (const s of [-1, 1]) {
    wall(ctx, {
      facing: s > 0 ? "+x" : "-x", plane: s * hx, a: -hz, b: hz, y0: base, y1: RIDGE + 0.4, t: T, cell: 0.7,
      keep: (x, y, z) => !blast(x, y, z) && y < gable(z) && !(y > y0 && s > 0 && endOpen(z, y)),
      paintOut: sooty, paintIn: C.stuccoEdge, paintEdge: C.stuccoEdge,
    });
  }

  // ── the rib cage: what the roof burnt down to
  for (let i = 0; i < 9; i++) {
    const rx = -hx + 0.9 + i * ((W - 1.8) / 8);
    const broken = i === 2 || i === 5 || (dmg >= 3 && i === 7);
    const rtop = broken ? RIDGE - 1.4 - ctx.random() * 0.8 : RIDGE;
    for (const s of [-1, 1]) {
      const frac = broken ? 0.55 + ctx.random() * 0.25 : 1;
      G.tube(ctx, [rx, rtop, 0],
        [rx + (broken ? (ctx.random() - 0.5) * 0.5 : 0), rtop - (rtop - (EAVE - 0.2)) * frac, s * (hz + 0.25) * frac],
        0.085, 0.07, 4, [0, 1, 0], C.char);
    }
    if (!broken && i % 2 === 1) G.tube(ctx, [rx, RIDGE - 1.5, -1.5], [rx, RIDGE - 1.5, 1.5], 0.06, 0.06, 4, [0, 1, 0], C.char);
  }
  G.tube(ctx, [-hx + 0.6, RIDGE, 0], [-0.9, RIDGE - 0.12, 0], 0.1, 0.09, 4, [0, 1, 0], C.char);
  G.tube(ctx, [0.5, RIDGE - 0.55, 0.15], [hx - 0.7, RIDGE - 0.05, 0], 0.1, 0.09, 4, [0, 1, 0], C.char);
  for (let i = 0; i < 3; i++) {
    fbox(ctx, xf(-2.5 + i * 2.6, y0 + 0.55 + i * 0.1, (i - 1) * 1.4, 18 + i * 40, 11 - i * 8, 6), [0, 0, 0], [2.4, 0.09, 0.11], C.char);
  }

  // ── ash floor, hearth, and the stove that outlived the house
  slab(ctx, { y: y0 + 0.12, t: 0.3, x0: -hx + 0.08, x1: hx - 0.08, z0: -hz + 0.08, z1: hz - 0.08, cell: 1.1,
    paintTop: C.ash, paintBottom: C.ash, paintEdge: C.ash });
  box(ctx, -hx + 0.1, -hx + 1.7, base, y0 + 8.6, -1.35, 1.35, C.stone);
  box(ctx, -hx - 0.05, -hx + 1.9, y0 + 8.45, y0 + 8.95, -1.5, 1.5, C.stone);
  box(ctx, -hx + 0.5, -hx + 1.75, y0 + 0.12, y0 + 1.55, -0.75, 0.75, C.char);
  rubbleField(ctx, { cx: 0, cz: 0, rx: hx * 0.85, rz: hz * 0.75, count: 20, height: 0.45, size: 0.42, lift: 0.14, paint: C.ash });

  // the stove: cast-iron range, plate top, two hobs, flue bent to the breast
  {
    const g = ctx.groundY(1.9, -1.4) + 0.12;
    const f = xf(1.9, g, -1.4, -16, 0, 0);
    fbox(ctx, f, [0, 0.42, 0], [0.56, 0.42, 0.34], C.iron);
    fbox(ctx, f, [0, 0.9, 0], [0.62, 0.05, 0.38], C.iron);
    fbox(ctx, f, [0, 0.1, 0.36], [0.5, 0.1, 0.03], C.rust);
    fbox(ctx, f, [-0.18, 0.45, 0.35], [0.26, 0.24, 0.03], C.rust);
    fbox(ctx, f, [0.3, 0.45, 0.35], [0.16, 0.2, 0.03], C.rust);
    for (const ox of [-0.26, 0.24]) {
      for (let i = 0; i < 8; i++) {
        const a0 = -(i / 8) * TAU, a1 = -((i + 1) / 8) * TAU;
        tr(ctx, C.rust, f(ox, 0.96, 0),
          f(ox + Math.cos(a0) * 0.15, 0.96, Math.sin(a0) * 0.15),
          f(ox + Math.cos(a1) * 0.15, 0.96, Math.sin(a1) * 0.15));
      }
    }
    G.tube(ctx, f(0.25, 0.95, -0.12), f(0.25, 2.15, -0.12), 0.09, 0.085, 6, [0, 1, 0], C.rust);
    G.tube(ctx, f(0.25, 2.15, -0.12), f(-1.4, 2.45, -0.12), 0.085, 0.08, 6, [0, 1, 0], C.rust);
  }
}

// ── PART: church — the landmark ─────────────────────────────────────────────
export function church(ctx, P, C) {
  const dmg = Math.max(1, Math.min(3, Math.round(P.damage ?? 2)));
  const NHX = 5.6;                   // nave half-width
  const NZ0 = -14.2, NZ1 = 7.0;      // nave; its front end IS the tower's south wall
  const THX = 3.8;                   // tower half-width
  const TZ1 = 14.6;
  const T = 0.78;
  const cz = (NZ1 + TZ1) / 2;
  const y0 = ctx.groundY(0, 0);
  const NAVE = y0 + 9.6;             // nave wall head
  const TOWER = y0 + 23.4;           // tower head, under the belfry
  const BELF = y0 + 28.0;            // belfry head, where the spire springs
  const APEX = y0 + 41.5;            // the cross — this is what reads from 200 m
  const base = groundMin(ctx, [[-NHX, NZ0], [NHX, NZ0], [-NHX, NZ1], [NHX, NZ1], [0, TZ1]]) - 1.0;

  const holes = [
    { x: -NHX, y: y0 + 6.2, z: -4.5, r: 2.3 + dmg * 0.4, rx: 3.4, rz: 3.6 },
    { x: 1.6, y: y0 + 17.6, z: TZ1, r: 1.9 + dmg * 0.35, rz: 4.2 },
    { x: THX, y: y0 + 31.6, z: cz - 0.4, r: 1.25, rx: 3.0 },
  ];
  if (dmg >= 2) holes.push({ x: NHX, y: y0 + 7.4, z: 2.2, r: 2.0, rx: 3.2 });
  if (dmg >= 3) holes.push({ x: -1.2, y: y0 + 34.6, z: cz + 0.8, r: 1.1, rx: 2.6, rz: 2.6 });
  const blast = blasts(ctx, holes);
  const near = scorch(holes, 1.8);
  const stonePaint = (x, y, z) => (near(x, y, z) > 0.55 ? C.sootT : C.stone)(x, y, z);
  const naveHead = ragged(ctx, NAVE, 1.1 + dmg * 0.5, 0.42, 3);

  // ── the nave: five lancets a side, every one blown out, buttressed
  const lancets = [];
  for (let i = 0; i < 5; i++) lancets.push({ u: NZ0 + 2.6 + i * 4.1, w: 1.7, y0: y0 + 2.5, h: 5.4, arch: true });
  const sideOpen = opens(lancets);
  for (const s of [-1, 1]) {
    wall(ctx, {
      facing: s > 0 ? "+x" : "-x", plane: s * NHX, a: NZ0, b: NZ1, y0: base, y1: NAVE + 1.2, t: T, cell: 0.95,
      keep: (x, y, z) => !blast(x, y, z) && y < naveHead(z) && !(y > y0 && sideOpen(z, y)),
      paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn,
    });
    for (let i = 0; i < 6; i++) {
      const bz = NZ0 + 0.9 + i * 4.1;
      const g = ctx.groundY(s * (NHX + 0.7), bz);
      const bTop = Math.min(naveHead(bz) - 1.6, y0 + 7.4);
      if (bTop < g + 1.5) continue;
      const bx0 = s > 0 ? NHX - 0.1 : -NHX - 1.05, bx1 = s > 0 ? NHX + 1.05 : -NHX + 0.1;
      box(ctx, bx0, bx1, g - 0.7, bTop, bz - 0.55, bz + 0.55, C.stone);
      const a = [s > 0 ? bx1 : bx0, bTop, bz - 0.55], b = [s > 0 ? bx1 : bx0, bTop, bz + 0.55];
      const c = [s > 0 ? NHX : -NHX, bTop + 1.0, bz + 0.55], d = [s > 0 ? NHX : -NHX, bTop + 1.0, bz - 0.55];
      if (s > 0) qd(ctx, C.stone, a, b, c, d); else qd(ctx, C.stone, d, c, b, a);
    }
  }
  // the chancel end: the great east window blown into one ragged mouth
  wall(ctx, {
    facing: "-z", plane: NZ0, a: -NHX, b: NHX, y0: base, y1: NAVE + 2.6, t: T, cell: 0.9,
    keep: (x, y, z) => {
      if (blast(x, y, z)) return false;
      const gableTop = NAVE + 2.4 - Math.abs(x) * 0.42 - 0.7 * (0.5 + 0.5 * ctx.noise2d(x * 0.8, 31));
      if (y > gableTop) return false;
      if (Math.abs(x) < 2.6 && y > y0 + 2.0 && y < y0 + 8.2) return false;
      const dx = x / 2.6, dy = (y - (y0 + 8.2)) / 4.6;
      if (y > y0 + 2.6 && Math.hypot(dx, dy) < 1 + ctx.noise2d(x * 0.7, y * 0.7) * 0.22) return false;
      return true;
    },
    paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn,
  });

  // ── ONE panel at z = NZ1: the nave's front gable flanks AND the tower's south
  //    wall with its arch — authored together so no two faces ever share a plane.
  const arch = opens([{ u: 0, w: 3.4, y0: y0, h: 6.6, arch: true }]);
  wall(ctx, {
    facing: "+z", plane: NZ1, a: -NHX, b: NHX, y0: base, y1: TOWER, t: T, cell: 0.9,
    keep: (x, y, z) => {
      if (blast(x, y, z)) return false;
      if (Math.abs(x) <= THX) return !(y > y0 - 0.05 && arch(x, y));
      return y < naveHead(x) - 0.5;
    },
    paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn,
  });
  // the other three tower walls
  const towerN = opens([
    { u: 0, w: 2.3, y0: y0, h: 4.2, arch: true },
    { u: 0, w: 2.6, y0: y0 + 6.0, h: 4.4, arch: true },
    { u: 0, w: 1.1, y0: y0 + 14.2, h: 2.2, arch: true },
  ]);
  const towerE = opens([
    { u: cz - 0.2, w: 1.0, y0: y0 + 8.4, h: 2.0, arch: true },
    { u: cz - 0.2, w: 1.0, y0: y0 + 15.0, h: 2.0, arch: true },
  ]);
  wall(ctx, {
    facing: "+z", plane: TZ1, a: -THX, b: THX, y0: base, y1: TOWER, t: T, cell: 0.9,
    keep: (x, y, z) => !blast(x, y, z) && !(y > y0 - 0.05 && towerN(x, y)),
    paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn,
  });
  for (const s of [-1, 1]) {
    wall(ctx, {
      facing: s > 0 ? "+x" : "-x", plane: s * THX, a: NZ1, b: TZ1, y0: base, y1: TOWER, t: T, cell: 0.9,
      keep: (x, y, z) => !blast(x, y, z) && !(y > y0 && towerE(z, y)),
      paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn,
    });
  }
  // string course at the belfry floor — sunk into the wall so nothing is flush
  box(ctx, -(THX + 0.57), THX + 0.57, TOWER - 0.55, TOWER - 0.12, NZ1, TZ1 + 0.57, C.stone);

  // ── the belfry: tall louvred openings, the louvres long gone
  const belfX = opens([{ u: -1.5, w: 1.15, y0: TOWER + 0.7, h: 3.1, arch: true }, { u: 1.5, w: 1.15, y0: TOWER + 0.7, h: 3.1, arch: true }]);
  const belfZ = opens([{ u: cz - 1.5, w: 1.15, y0: TOWER + 0.7, h: 3.1, arch: true }, { u: cz + 1.5, w: 1.15, y0: TOWER + 0.7, h: 3.1, arch: true }]);
  wall(ctx, { facing: "+z", plane: TZ1, a: -THX, b: THX, y0: TOWER, y1: BELF, t: T, cell: 0.62,
    keep: (x, y, z) => !blast(x, y, z) && !belfX(x, y), paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn });
  wall(ctx, { facing: "-z", plane: NZ1, a: -THX, b: THX, y0: TOWER, y1: BELF, t: T, cell: 0.62,
    keep: (x, y, z) => !blast(x, y, z) && !belfX(x, y), paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn });
  for (const s of [-1, 1]) {
    wall(ctx, { facing: s > 0 ? "+x" : "-x", plane: s * THX, a: NZ1, b: TZ1, y0: TOWER, y1: BELF, t: T, cell: 0.62,
      keep: (x, y, z) => !blast(x, y, z) && !belfZ(z, y), paintOut: stonePaint, paintIn: C.stoneIn, paintEdge: C.stoneIn });
  }
  // parapet + corner pinnacles: the silhouette that says CHURCH at 200 m
  box(ctx, -(THX + 0.69), THX + 0.69, BELF - 0.3, BELF + 0.8, NZ1 - 0.69, TZ1 + 0.69, C.stone);
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    lathe(ctx, xf(s1 * (THX + 0.3), BELF + 0.7, cz + s2 * 3.5, 0, 0, 0),
      [[0, 0.42], [0.5, 0.38], [1.5, 0.3], [2.4, 0.1], [2.6, 0.02]], 6, C.stone);
  }

  // ── the spire: an octagon, holed, still standing
  const R0 = 3.15, R1 = 0.28;
  const spireY0 = BELF + 0.8, spireY1 = APEX - 1.4;
  gridPanel(ctx, {
    NU: 8, NV: 12, t: 0.26, wrapU: true,
    P: (u, v, n) => {
      const a = -u * TAU + Math.PI / 8;
      const r = R0 + (R1 - R0) * v + n;
      return [Math.cos(a) * r, spireY0 + v * (spireY1 - spireY0), cz + Math.sin(a) * r];
    },
    keep: (x, y, z) => !blast(x, y, z),
    paintOut: C.slate, paintIn: C.timber, paintEdge: C.timber,
  });
  // the timber frame you glimpse through the shell holes
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    for (const lv of [0.26, 0.54]) {
      const y = spireY0 + lv * (spireY1 - spireY0);
      const r = R0 + (R1 - R0) * lv - 0.32;
      G.tube(ctx, [Math.cos(a) * r, y, cz + Math.sin(a) * r], [-Math.cos(a) * r, y, cz - Math.sin(a) * r], 0.07, 0.07, 4, [0, 1, 0], C.timber);
    }
  }
  {
    const f = xf(0, spireY1 - 0.2, cz, 12, 9, 14);
    fbox(ctx, f, [0, 0.9, 0], [0.07, 0.95, 0.07], C.rust);
    fbox(ctx, f, [0, 1.25, 0], [0.42, 0.07, 0.07], C.rust);
  }

  // ── floors: flagstones, the ringing chamber the bell came through, the belfry
  const IN = 0.12;
  slab(ctx, { y: y0 + 0.16, t: 0.42, x0: -NHX + IN, x1: NHX - IN, z0: NZ0 + IN, z1: NZ1 + 0.2, cell: 1.2,
    paintTop: C.stone, paintBottom: C.stoneIn, paintEdge: C.stoneIn });
  slab(ctx, { y: y0 + 0.16, t: 0.42, x0: -THX + IN, x1: THX - IN, z0: NZ1 - 0.2, z1: TZ1 - IN, cell: 1.1,
    keep: (x, y, z) => Math.hypot((x + 1.0) / 1.5, (z - (cz + 0.6)) / 1.5) > 1,
    paintTop: C.stone, paintBottom: C.stoneIn, paintEdge: C.stoneIn });
  slab(ctx, { y: y0 + 8.4, t: 0.3, x0: -THX + IN, x1: THX - IN, z0: NZ1 + IN, z1: TZ1 - IN, cell: 0.85,
    keep: (x, y, z) => Math.hypot((x + 0.6) / 1.9, (z - cz) / 1.9) > 1 + ctx.noise2d(x, z) * 0.2,
    paintTop: C.timber, paintBottom: C.char, paintEdge: C.char });
  slab(ctx, { y: TOWER - 0.6, t: 0.3, x0: -THX + IN, x1: THX - IN, z0: NZ1 + IN, z1: TZ1 - IN, cell: 0.85,
    keep: (x, y, z) => Math.hypot((x - 0.8) / 1.5, (z - cz - 0.4) / 1.5) > 1,
    paintTop: C.timber, paintBottom: C.char, paintEdge: C.char });

  // ── the bell: through two floors, lying in the rubble at the tower foot
  {
    const bx = -1.1, bz = cz + 0.7;
    const f = xf(bx, ctx.groundY(bx, bz) + 0.25, bz, 28, 74, 0);
    lathe(ctx, f, [[0, 0.98], [0.06, 1.0], [0.12, 0.9], [0.5, 0.8], [1.0, 0.66], [1.45, 0.5], [1.72, 0.38], [1.84, 0.36], [1.92, 0.2], [2.0, 0.22]], 12, C.bronze);
    fbox(ctx, f, [0, 2.2, 0], [0.5, 0.2, 0.22], C.char);
    rubbleField(ctx, { cx: bx, cz: bz, rx: 2.6, rz: 2.6, count: 14, height: 0.5, size: 0.45, lift: 0.18, paint: C.rubble });
  }
  // broken trusses down the open nave, and masonry across the flags
  for (let i = 0; i < 3; i++) {
    const f = xf((ctx.random() - 0.5) * 2.4, y0 + 0.6 + i * 0.12, NZ0 + 3.4 + i * 5.6, i * 31 - 18, i === 1 ? -12 : 8, i * 9);
    fbox(ctx, f, [0, 0, 0], [NHX * 0.8, 0.14, 0.17], C.char);
    fbox(ctx, f, [-1.8, 0.62, 0], [1.7, 0.11, 0.14], C.char);
  }
  rubbleField(ctx, { cx: 0, cz: -4, rx: NHX * 0.85, rz: 7.5, count: 26, height: 0.55, size: 0.55, lift: 0.22, paint: C.rubble });
  rubbleField(ctx, { cx: -NHX - 1.4, cz: -4.5, rx: 3.0, rz: 4.2, count: 14, height: 1.2, size: 0.6, paint: C.rubble });
  rubbleField(ctx, { cx: 0.5, cz: TZ1 + 2.2, rx: 4.2, rz: 2.6, count: 14, height: 1.0, size: 0.62, paint: C.rubble });
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const P = ctx.params || {};
  const C = palette(ctx);
  const part = String(P.part || "apartment");
  if (part === "townhall") townhall(ctx, P, C);
  else if (part === "rowhouse") rowhouse(ctx, P, C);
  else if (part === "farmhouse") farmhouse(ctx, P, C);
  else if (part === "church") church(ctx, P, C);
  else apartment(ctx, P, C);
}
