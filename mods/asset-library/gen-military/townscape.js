// THE STREET ITSELF — the civic furniture of a shelled 1944 town, ONE generator.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-military/townscape.js",
//                params: { part: "fountain" } }
//
// FRAME: origin ON THE GROUND at the piece's footprint centre; +Y up; anything with a
//        front puts it on +Z (structures convention — yaw the spec row to aim it);
//        anything that runs in a line runs along +Z.
// SCALE: 1944 European, read against a 1.8 m soldier.
//
//   part: "fountain"    radius, dry basin heaped with rubble, one facet shot away
//   part: "statue"      the plinth still standing, the bronze face-down beside it
//   part: "crater"      radius, main 0|1 — the torn cobble lip of a shell hole and
//                       the cast-iron water main burst open across it
//   part: "barricade"   length, gap — furniture and paving stone across a street mouth
//   part: "staff-car"   a burnt-out staff car: gutted cabin, wheels down to the rims
//   part: "shopfront"   width, hole "left"|"right"|"none" — a shop with its front
//                       window blown and a hole an armoured vehicle made
//
// COLLISION: no collider() export — the visual mesh IS the collider. Spec rows carry
//   physics: { body: "static", collider: "mesh" }.
//
// DRAW GROUPS: three CDN albedos and no more (masonry / steel / timber). Every albedo
//   switch starts a new draw group, so emission is ordered by family and grids emit in
//   passes, never per-cell interleave.

const G = require("builtin/geom");

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

const TEX = {
  stone: "/cdn/moodboard-realistic-gritty/texture-ruin-limestone-blocks-1944.png",
  rust: "/cdn/moodboard-realistic-gritty/texture-debris-steel-rusted-1944.png",
  timber: "/cdn/moodboard-realistic-gritty/texture-armory-board-oak.png",
};

export function palette(ctx) {
  const s = (o) => G.surface(ctx, o);
  return {
    stone: s({ tex: TEX.stone, r: 0.6, g: 0.58, b: 0.52, rough: 0.94, jitter: 0.18, freq: 3.2 }),
    stoneIn: s({ tex: TEX.stone, r: 0.44, g: 0.42, b: 0.38, rough: 0.97, jitter: 0.2, freq: 4.4 }),
    cope: s({ tex: TEX.stone, r: 0.67, g: 0.65, b: 0.59, rough: 0.9, jitter: 0.14, freq: 5.2 }),
    grime: s({ tex: TEX.stone, r: 0.3, g: 0.29, b: 0.26, rough: 1, jitter: 0.22, freq: 6 }),
    brick: s({ tex: TEX.stone, r: 0.45, g: 0.26, b: 0.2, rough: 0.97, jitter: 0.24, freq: 3.6 }),
    brickIn: s({ tex: TEX.stone, r: 0.31, g: 0.19, b: 0.15, rough: 0.99, jitter: 0.26, freq: 4.6 }),
    rubble: s({ tex: TEX.stone, r: 0.43, g: 0.33, b: 0.27, rough: 1, jitter: 0.3, freq: 4 }),
    sett: s({ tex: TEX.stone, r: 0.38, g: 0.36, b: 0.35, rough: 0.99, jitter: 0.24, freq: 5.5 }),
    clay: s({ tex: TEX.stone, r: 0.4, g: 0.31, b: 0.22, rough: 1, jitter: 0.26, freq: 4.8 }),
    soot: s({ tex: TEX.stone, r: 0.17, g: 0.16, b: 0.15, rough: 1, jitter: 0.24, freq: 5.5 }),
    plaster: s({ tex: TEX.stone, r: 0.68, g: 0.65, b: 0.59, rough: 0.92, jitter: 0.16, freq: 5 }),
    // steel family
    steel: s({ tex: TEX.rust, r: 0.36, g: 0.36, b: 0.37, metal: 0.7, rough: 0.6, jitter: 0.16, freq: 8 }),
    rust: s({ tex: TEX.rust, r: 0.41, g: 0.24, b: 0.13, metal: 0.42, rough: 0.9, jitter: 0.28, freq: 5 }),
    rustDeep: s({ tex: TEX.rust, r: 0.2, g: 0.13, b: 0.09, metal: 0.3, rough: 1, jitter: 0.26, freq: 7 }),
    char: s({ tex: TEX.rust, r: 0.1, g: 0.095, b: 0.09, metal: 0.35, rough: 0.95, jitter: 0.2, freq: 9 }),
    charLit: s({ tex: TEX.rust, r: 0.17, g: 0.16, b: 0.15, metal: 0.5, rough: 0.78, jitter: 0.22, freq: 11 }),
    bronze: s({ tex: TEX.rust, r: 0.24, g: 0.3, b: 0.24, metal: 0.8, rough: 0.55, jitter: 0.2, freq: 6 }),
    bronzeLit: s({ tex: TEX.rust, r: 0.35, g: 0.33, b: 0.19, metal: 0.9, rough: 0.42, jitter: 0.18, freq: 9 }),
    // timber family
    wood: s({ tex: TEX.timber, r: 0.4, g: 0.31, b: 0.2, rough: 0.94, jitter: 0.24, freq: 4.2 }),
    woodPale: s({ tex: TEX.timber, r: 0.55, g: 0.45, b: 0.31, rough: 0.92, jitter: 0.22, freq: 5.4 }),
    woodDark: s({ tex: TEX.timber, r: 0.24, g: 0.18, b: 0.12, rough: 0.97, jitter: 0.24, freq: 6.2 }),
    cloth: s({ tex: TEX.timber, r: 0.42, g: 0.4, b: 0.33, rough: 0.98, jitter: 0.2, freq: 7 }),
  };
}

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
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

export function bx(ctx, x0, x1, y0, y1, z0, z1, paint) {
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  const nnn = [xa, ya, za], pnn = [xb, ya, za], npn = [xa, yb, za], ppn = [xb, yb, za];
  const nnp = [xa, ya, zb], pnp = [xb, ya, zb], npp = [xa, yb, zb], ppp = [xb, yb, zb];
  qd(ctx, paint, nnp, pnp, ppp, npp);
  qd(ctx, paint, pnn, nnn, npn, ppn);
  qd(ctx, paint, pnp, pnn, ppn, ppp);
  qd(ctx, paint, nnn, nnp, npp, npn);
  qd(ctx, paint, npp, ppp, ppn, npn);
  qd(ctx, paint, nnn, pnn, pnp, nnp);
}

// A rigid frame: R = Ry(yaw)·Rx(pitch)·Rz(roll), then translate. Degrees.
export function xf(px, py, pz, yaw, pitch, roll) {
  const cy = Math.cos((yaw || 0) * D2R), sy = Math.sin((yaw || 0) * D2R);
  const cp = Math.cos((pitch || 0) * D2R), sp = Math.sin((pitch || 0) * D2R);
  const cr = Math.cos((roll || 0) * D2R), sr = Math.sin((roll || 0) * D2R);
  const m = [
    cy * cr + sy * sp * sr, -cy * sr + sy * sp * cr, sy * cp,
    cp * sr, cp * cr, -sp,
    -sy * cr + cy * sp * sr, sy * sr + cy * sp * cr, cy * cp,
  ];
  const f = (x, y, z) => [
    px + m[0] * x + m[1] * y + m[2] * z,
    py + m[3] * x + m[4] * y + m[5] * z,
    pz + m[6] * x + m[7] * y + m[8] * z,
  ];
  f.dir = (x, y, z) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
  return f;
}

// A box in an arbitrary frame.
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

// A carved wall panel. Runs along `u`, stands in `y`, thickness from t0 to t1.
// axis "z": u is x, thickness in z, outward face at t1 (+Z).
// axis "x": u is z, thickness in x, outward face at t1 (+X).
// Emits outer pass, inner pass, then edges — three draw groups, not three per cell.
export function panel(ctx, o) {
  const axis = o.axis === "x" ? "x" : "z";
  const nu = Math.max(1, o.nu | 0), ny = Math.max(1, o.ny | 0);
  const U = (i) => o.u0 + ((o.u1 - o.u0) * i) / nu;
  const Y = (j) => o.y0 + ((o.y1 - o.y0) * j) / ny;
  const keep = o.keep || (() => true);
  const t0 = o.t0, t1 = o.t1;
  const alive = [];
  for (let i = 0; i < nu; i++) {
    alive.push([]);
    for (let j = 0; j < ny; j++) alive[i].push(!!keep((U(i) + U(i + 1)) / 2, (Y(j) + Y(j + 1)) / 2));
  }
  const on = (i, j) => i >= 0 && j >= 0 && i < nu && j < ny && alive[i][j];
  const P = axis === "z" ? (u, y, t) => [u, y, t] : (u, y, t) => [t, y, u];
  const emit = (paint, a, b, c, d) => {
    if (axis === "z") qd(ctx, paint, P(...a), P(...b), P(...c), P(...d));
    else qd(ctx, paint, P(...d), P(...c), P(...b), P(...a));
  };
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < ny; j++) {
      if (!alive[i][j]) continue;
      const ua = U(i), ub = U(i + 1), ya = Y(j), yb = Y(j + 1);
      emit(o.paintOut, [ua, ya, t1], [ub, ya, t1], [ub, yb, t1], [ua, yb, t1]);
    }
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < ny; j++) {
      if (!alive[i][j]) continue;
      const ua = U(i), ub = U(i + 1), ya = Y(j), yb = Y(j + 1);
      emit(o.paintIn || o.paintOut, [ub, ya, t0], [ua, ya, t0], [ua, yb, t0], [ub, yb, t0]);
    }
  }
  const edge = o.paintEdge || o.paintIn || o.paintOut;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < ny; j++) {
      if (!alive[i][j]) continue;
      const ua = U(i), ub = U(i + 1), ya = Y(j), yb = Y(j + 1);
      if (!on(i, j + 1)) emit(edge, [ua, yb, t1], [ub, yb, t1], [ub, yb, t0], [ua, yb, t0]);
      if (!on(i, j - 1)) emit(edge, [ua, ya, t0], [ub, ya, t0], [ub, ya, t1], [ua, ya, t1]);
      if (!on(i - 1, j)) emit(edge, [ua, ya, t0], [ua, ya, t1], [ua, yb, t1], [ua, yb, t0]);
      if (!on(i + 1, j)) emit(edge, [ub, ya, t1], [ub, ya, t0], [ub, yb, t0], [ub, yb, t1]);
    }
  }
}

// A heap of broken masonry that drapes over whatever ground it lands on.
export function rubbleHeap(ctx, o) {
  const n = o.count | 0;
  for (let i = 0; i < n; i++) {
    const a = ctx.random() * TAU;
    const r = Math.sqrt(ctx.random());
    const x = o.cx + Math.cos(a) * o.rx * r;
    const z = o.cz + Math.sin(a) * o.rz * r;
    const g = o.flat ? 0 : ctx.groundY(x, z);
    const s = (o.size || 0.4) * (0.45 + ctx.random() * 1.1);
    const h = (o.height || 1) * (1 - r * 0.8) * (0.3 + ctx.random() * 0.9);
    bx(ctx, x - s, x + s * 0.85, g - 0.06, g + Math.max(0.1, h), z - s * 0.9, z + s * 0.8, o.paint);
  }
}

// ── PART: fountain ──────────────────────────────────────────────────────────
export function fountain(ctx, C, p) {
  const R = clamp(num(p.radius, 3.1), 1.6, 6);
  const RI = R - 0.42;
  const RIM = 0.74;
  const N = 8;
  const gone = [3];                       // the facet a splinter took out
  const pt = (r, k, y) => {
    const a = (k / N) * TAU + Math.PI / N;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };

  // the step the basin stands on
  for (let k = 0; k < N; k++) {
    const a0 = pt(R + 0.4, k, 0), a1 = pt(R + 0.4, k + 1, 0);
    const b0 = pt(R + 0.4, k, 0.22), b1 = pt(R + 0.4, k + 1, 0.22);
    qd(ctx, C.stone, a0, a1, b1, b0);
    qd(ctx, C.cope, b0, b1, pt(R - 0.02, k + 1, 0.22), pt(R - 0.02, k, 0.22));
  }

  // the basin wall — outer, inner, rim
  for (let k = 0; k < N; k++) {
    if (gone.indexOf(k) >= 0) continue;
    const lo = 0.2, hi = RIM;
    const o0 = pt(R, k, lo), o1 = pt(R, k + 1, lo), o2 = pt(R, k + 1, hi), o3 = pt(R, k, hi);
    qd(ctx, C.stone, o0, o1, o2, o3);
    const i0 = pt(RI, k, lo), i1 = pt(RI, k + 1, lo), i2 = pt(RI, k + 1, hi), i3 = pt(RI, k, hi);
    qd(ctx, C.grime, i1, i0, i3, i2);
    qd(ctx, C.cope, o3, o2, i2, i3);
    // the broken ends where the missing facet was
    if (gone.indexOf(k - 1) >= 0 || gone.indexOf(k + 1) >= 0 || gone.indexOf((k + N - 1) % N) >= 0) {
      qd(ctx, C.stoneIn, o0, o3, i3, i0);
      qd(ctx, C.stoneIn, i1, i2, o2, o1);
    }
  }
  // the stub either side of the shot-away facet
  for (const k of gone) {
    for (const kk of [k, k + 1]) {
      qd(ctx, C.stoneIn, pt(R, kk, 0.2), pt(R, kk, RIM), pt(RI, kk, RIM), pt(RI, kk, 0.2));
    }
  }

  // basin floor, dished, with a dry tide line
  for (let k = 0; k < N; k++) {
    qd(ctx, C.grime, [0, 0.14, 0], pt(RI, k, 0.2), pt(RI, k + 1, 0.2), [0, 0.14, 0]);
  }

  // the pedestal, its bowl snapped off
  {
    const prof = [[0, 0.5], [0.12, 0.48], [0.3, 0.34], [0.55, 0.28], [1.05, 0.24], [1.2, 0.34], [1.34, 0.3], [1.42, 0.5], [1.5, 0.46]];
    const SEG = 10;
    for (let i = 0; i < prof.length - 1; i++) {
      const [y0, r0] = prof[i], [y1, r1] = prof[i + 1];
      for (let k = 0; k < SEG; k++) {
        const a0 = (k / SEG) * TAU, a1 = ((k + 1) / SEG) * TAU;
        const A = [Math.cos(a0) * r0, 0.16 + y0, Math.sin(a0) * r0];
        const B = [Math.cos(a1) * r0, 0.16 + y0, Math.sin(a1) * r0];
        const Cc = [Math.cos(a1) * r1, 0.16 + y1, Math.sin(a1) * r1];
        const D = [Math.cos(a0) * r1, 0.16 + y1, Math.sin(a0) * r1];
        qd(ctx, y0 < 0.4 ? C.grime : C.stone, A, B, Cc, D);
      }
    }
    // the ragged break at the top, and the lead pipe standing in it
    for (let k = 0; k < SEG; k++) {
      const a0 = (k / SEG) * TAU, a1 = ((k + 1) / SEG) * TAU;
      const br = 1.66 + ctx.noise2d(Math.cos(a0) * 3, Math.sin(a0) * 3) * 0.16;
      qd(ctx, C.stoneIn, [Math.cos(a0) * 0.46, 1.66, Math.sin(a0) * 0.46], [Math.cos(a1) * 0.46, 1.66, Math.sin(a1) * 0.46], [Math.cos(a1) * 0.1, br, Math.sin(a1) * 0.1], [Math.cos(a0) * 0.1, br, Math.sin(a0) * 0.1]);
    }
  }
  // the bowl that came off it, on its edge in the basin
  {
    const f = xf(-0.95, 0.34, 0.75, 24, 74, 0);
    const SEG = 10;
    for (let k = 0; k < SEG; k++) {
      const a0 = (k / SEG) * TAU, a1 = ((k + 1) / SEG) * TAU;
      for (const rr of [[0.86, 0.7, 0, 0.24], [0.7, 0.7, 0.24, 0.24]]) {
        const A = f(Math.cos(a0) * rr[0], rr[2], Math.sin(a0) * rr[0]);
        const B = f(Math.cos(a1) * rr[0], rr[2], Math.sin(a1) * rr[0]);
        const Cc = f(Math.cos(a1) * rr[1], rr[3], Math.sin(a1) * rr[1]);
        const D = f(Math.cos(a0) * rr[1], rr[3], Math.sin(a0) * rr[1]);
        qd(ctx, C.stone, A, B, Cc, D);
      }
    }
  }

  // what fills it now
  rubbleHeap(ctx, { cx: 0, cz: 0, rx: RI * 0.92, rz: RI * 0.92, count: 34, height: 0.62, size: 0.3, paint: C.rubble, flat: true });
  rubbleHeap(ctx, { cx: 0, cz: R + 0.9, rx: R * 0.7, rz: 1.1, count: 12, height: 0.4, size: 0.28, paint: C.rubble });

  // the lead supply pipe, snapped, in the pedestal
  G.polyTube(ctx, [[0, 0.4, 0], [0.02, 1.5, 0], [0.1, 1.78, 0.05], [0.28, 1.86, 0.12]], 0.045, 6, [0, 1, 0], C.rustDeep);
}

// ── PART: statue ────────────────────────────────────────────────────────────
export function statue(ctx, C, p) {
  const HB = 1.05, HD = 0.78, TOP = 2.62;

  // plinth: base, die, cornice
  bx(ctx, -HB, HB, 0, 0.34, -HB, HB, C.stone);
  bx(ctx, -HD, HD, 0.34, TOP - 0.3, -HD, HD, C.stone);
  bx(ctx, -HD - 0.13, HD + 0.13, TOP - 0.3, TOP, -HD - 0.13, HD + 0.13, C.cope);
  // the inscription panel, recessed on the front
  bx(ctx, -0.5, 0.5, 0.9, 1.85, HD - 0.06, HD + 0.02, C.grime);
  // a shell splinter took the near corner off
  fbox(ctx, xf(HD - 0.16, 1.5, HD - 0.16, 42, 0, 18), [0, 0, 0], [0.26, 0.62, 0.26], C.stoneIn);

  // the bronze feet still bolted to the top, snapped at the ankle
  for (const s of [-1, 1]) {
    bx(ctx, s * 0.1 - 0.1, s * 0.1 + 0.12, TOP, TOP + 0.11, -0.16, 0.2, C.bronze);
    bx(ctx, s * 0.1 - 0.05, s * 0.1 + 0.05, TOP + 0.11, TOP + 0.24, -0.05, 0.06, C.bronzeLit);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    bx(ctx, Math.cos(a) * 0.34 - 0.02, Math.cos(a) * 0.34 + 0.02, TOP, TOP + 0.09, Math.sin(a) * 0.34 - 0.02, Math.sin(a) * 0.34 + 0.02, C.rust);
  }

  // THE FIGURE, face down in the cobbles beside its plinth
  {
    const f = xf(1.95, 0.34, -0.65, 118, 86, 8);
    const frames = [];
    const secs = [
      [1.12, 0.74, 0.44], [1.42, 0.8, 0.48], [1.72, 0.78, 0.47], [1.95, 0.72, 0.44],
      [2.06, 0.5, 0.36], [2.16, 0.25, 0.25], [2.3, 0.38, 0.42], [2.46, 0.35, 0.38], [2.58, 0.19, 0.21],
    ];
    for (const [y, w, d] of secs) {
      frames.push({ c: f(0, y, 0), f: f.dir(0, 1, 0), up: f.dir(0, 0, 1), poly: G.oval(w, d, 0, 0, 12, 0.85) });
    }
    G.loftFrames(ctx, frames, C.bronze);
    // greatcoat skirt and legs
    for (const s of [-1, 1]) {
      G.polyTube(ctx, [f(s * 0.19, 1.16, 0), f(s * 0.21, 0.66, 0.03), f(s * 0.2, 0.16, 0.05), f(s * 0.2, 0.02, 0.16)],
        [0.19, 0.15, 0.12, 0.1], 8, f.dir(0, 0, 1), C.bronze);
    }
    // the arm still on him, down at his side
    G.polyTube(ctx, [f(-0.35, 1.94, 0), f(-0.42, 1.5, 0.05), f(-0.38, 1.14, 0.1)], [0.13, 0.1, 0.09], 8, f.dir(0, 0, 1), C.bronze);
    // the shoulder the other arm tore out of
    fbox(ctx, xf(...f(0.34, 1.92, 0), 118, 86, 8), [0, 0, 0], [0.08, 0.08, 0.09], C.bronzeLit);
  }
  // the arm that came off, a metre away
  {
    const g = xf(3.15, 0.16, 0.85, 34, 8, 96);
    G.polyTube(ctx, [g(0, 0, 0), g(0, 0.42, 0.04), g(0.06, 0.8, 0.02), g(0.14, 1.0, -0.04)], [0.13, 0.11, 0.09, 0.1], 8, [0, 1, 0], C.bronze);
    // the hand, still holding whatever he was holding
    G.polyTube(ctx, [g(0.14, 1.0, -0.04), g(0.2, 1.16, -0.06)], [0.1, 0.06], 7, [0, 1, 0], C.bronzeLit);
  }

  // masonry chips and the wreath somebody left, long trampled
  rubbleHeap(ctx, { cx: 0.5, cz: 1.5, rx: 1.7, rz: 1.1, count: 14, height: 0.28, size: 0.24, paint: C.rubble });
}

// ── PART: crater ────────────────────────────────────────────────────────────
// The lip dressing over a shell hole the terrain already carries (a pond mark):
// torn paving, thrown setts, and the town's water main opened up across it.
export function crater(ctx, C, p) {
  const R = clamp(num(p.radius, 2.8), 1.2, 6);
  const wantMain = p.main !== false;
  const mainA = num(p.mainYaw, 205) * D2R;

  // the ring of paving the blast lifted and tipped outward
  const N = Math.round(14 + R * 3);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + ctx.random() * 0.12;
    const r = R * (0.94 + ctx.random() * 0.26);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const g = ctx.groundY(x, z);
    const w = 0.28 + ctx.random() * 0.24;
    const tilt = 22 + ctx.random() * 48;
    fbox(ctx, xf(x, g + 0.06, z, (-a / D2R) + 90, tilt, ctx.randomRange(-14, 14)), [0, 0, 0], [w, 0.055, w * 0.8], C.sett);
  }
  // setts thrown clear
  for (let i = 0; i < Math.round(R * 7); i++) {
    const a = ctx.random() * TAU;
    const r = R * (1.2 + ctx.random() * 1.5);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const g = ctx.groundY(x, z);
    const w = 0.11 + ctx.random() * 0.09;
    fbox(ctx, xf(x, g + w * 0.5, z, ctx.random() * 360, ctx.randomRange(-30, 30), ctx.randomRange(-30, 30)), [0, 0, 0], [w, w * 0.7, w], C.sett);
  }
  // the clay the blast threw up, banked on the far lip
  rubbleHeap(ctx, { cx: Math.cos(mainA + 2.4) * R * 1.1, cz: Math.sin(mainA + 2.4) * R * 1.1, rx: R * 0.8, rz: R * 0.55, count: 16, height: 0.5, size: 0.34, paint: C.clay });
  rubbleHeap(ctx, { cx: 0, cz: 0, rx: R * 0.7, rz: R * 0.7, count: 12, height: 0.3, size: 0.26, paint: C.rubble });

  if (!wantMain) return;

  // THE BURST MAIN — cast iron, opened along a joint, hanging over the hole
  const cx = Math.cos(mainA), cz = Math.sin(mainA);
  const lipX = cx * R * 1.02, lipZ = cz * R * 1.02;
  const lipY = ctx.groundY(lipX, lipZ) - 0.22;
  const pts = [
    [cx * R * 2.1, ctx.groundY(cx * R * 2.1, cz * R * 2.1) - 0.5, cz * R * 2.1],
    [lipX, lipY, lipZ],
    [cx * R * 0.55, lipY - 0.42, cz * R * 0.55],
    [cx * R * 0.2, lipY - 0.78, cz * R * 0.2],
  ];
  G.polyTube(ctx, pts, [0.17, 0.17, 0.16, 0.14], 9, [0, 1, 0], C.rustDeep);
  // the flanged joint that let go
  {
    const f = xf(lipX, lipY, lipZ, -(mainA / D2R) + 90, 0, 0);
    fbox(ctx, f, [0, 0, 0], [0.26, 0.26, 0.05], C.rust);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      fbox(ctx, f, [Math.cos(a) * 0.21, Math.sin(a) * 0.21, 0.06], [0.03, 0.03, 0.03], C.steel);
    }
  }
  // the torn mouth: petals of iron peeled back
  {
    const ex = cx * R * 0.2, ez = cz * R * 0.2, ey = lipY - 0.78;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const f = xf(ex, ey, ez, -(mainA / D2R) + 90, 0, 0);
      const o = [Math.cos(a) * 0.15, Math.sin(a) * 0.15, -0.12];
      fbox(ctx, f, o, [0.06, 0.06, 0.13], C.steel);
    }
  }
  // the other half of the main, still in its trench on the near lip
  {
    const f = xf(cx * R * 1.55, ctx.groundY(cx * R * 1.55, cz * R * 1.55) - 0.35, cz * R * 1.55, -(mainA / D2R) + 90, 0, 0);
    fbox(ctx, f, [0, 0, 0], [0.5, 0.34, 0.06], C.clay);
  }
  // a stopcock box in the pavement, lid blown off
  {
    const sx = cx * R * 2.4 + cz * 0.9, sz = cz * R * 2.4 - cx * 0.9;
    const g = ctx.groundY(sx, sz);
    bx(ctx, sx - 0.22, sx + 0.22, g - 0.3, g + 0.05, sz - 0.22, sz + 0.22, C.steel);
    fbox(ctx, xf(sx + 0.6, g + 0.04, sz + 0.35, 34, 12, 6), [0, 0, 0], [0.22, 0.02, 0.22], C.rust);
  }
}

// ── PART: barricade ─────────────────────────────────────────────────────────
// Runs along +Z. Whatever the street had in it, dragged out and stacked.
export function barricade(ctx, C, p) {
  const L = clamp(num(p.length, 7.5), 3, 16);
  const gap = clamp(num(p.gap, 0), 0, 2.2);          // the way through, at the +Z end
  const hz = L / 2;
  const zEnd = hz - gap;
  const gY = (x, z) => ctx.groundY(x, z);

  // --- masonry: kerbstones and paving setts, the base course ---
  {
    let z = -hz;
    let course = 0;
    while (z < zEnd - 0.2) {
      const w = 0.36 + ctx.random() * 0.2;
      const rows = 2 + Math.round(ctx.random() * 2);
      for (let r = 0; r < rows; r++) {
        const y = gY(0, z) + r * 0.16;
        const jx = ctx.randomRange(-0.12, 0.12) + (r % 2) * 0.06;
        bx(ctx, jx - 0.34, jx + 0.34, y, y + 0.15, z, z + w, C.sett);
      }
      z += w + 0.02;
      course++;
    }
    void course;
    // kerbstones stood on end at the ends of the run
    for (const zz of [-hz + 0.3, zEnd - 0.35]) {
      bx(ctx, -0.24, 0.24, gY(0, zz), gY(0, zz) + 0.9, zz - 0.18, zz + 0.18, C.stone);
    }
    rubbleHeap(ctx, { cx: 0.55, cz: 0, rx: 0.5, rz: hz * 0.9, count: 16, height: 0.35, size: 0.24, paint: C.rubble });
  }

  // --- timber: the furniture out of the houses ---
  {
    // an overturned wardrobe
    const f = xf(-0.1, gY(0, -hz + 1.5) + 0.34, -hz + 1.5, 8, 0, 90);
    fbox(ctx, f, [0, 0, 0], [0.31, 1.0, 0.62], C.wood);
    fbox(ctx, f, [0.33, 0, -0.2], [0.03, 0.9, 0.36], C.woodDark);   // a door hanging
    fbox(ctx, f, [0.33, 0, 0.28], [0.03, 0.9, 0.3], C.woodPale);
    // a chest of drawers on its face, drawers spilled
    const g = xf(0.14, gY(0, -hz + 3.3) + 0.3, -hz + 3.3, -14, 0, 74);
    fbox(ctx, g, [0, 0, 0], [0.28, 0.52, 0.44], C.woodDark);
    fbox(ctx, xf(0.6, gY(0.6, -hz + 3.9) + 0.09, -hz + 3.9, 26, 0, 6), [0, 0, 0], [0.36, 0.09, 0.26], C.woodPale);
    fbox(ctx, xf(-0.55, gY(-0.55, -hz + 2.9) + 0.1, -hz + 2.9, -38, 0, 10), [0, 0, 0], [0.34, 0.1, 0.24], C.woodPale);
    // a panelled door laid over the top as a fire step
    const d = xf(0.0, gY(0, 0.2) + 0.86, 0.2, 4, 0, -22);
    fbox(ctx, d, [0, 0, 0], [0.42, 0.05, 1.0], C.wood);
    // a table on its back
    const t = xf(-0.2, gY(0, hz - 2.6) + 0.42, hz - 2.6, 20, 0, 176);
    fbox(ctx, t, [0, 0, 0], [0.42, 0.05, 0.66], C.woodPale);
    for (const s of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) {
      fbox(ctx, t, [s[0], -0.32, s[1]], [0.04, 0.3, 0.04], C.wood);
    }
    // shutters and floorboards jammed into the gaps
    for (let i = 0; i < 7; i++) {
      const z = -hz + 0.5 + ctx.random() * (L - 1.2);
      const h = gY(0, z);
      fbox(ctx, xf(ctx.randomRange(-0.4, 0.4), h + 0.4 + ctx.random() * 0.6, z, ctx.randomRange(-25, 25), ctx.randomRange(-40, 40), ctx.randomRange(60, 120)),
        [0, 0, 0], [0.09, 0.55 + ctx.random() * 0.4, 0.04], C.woodDark);
    }
  }

  // --- steel: the bedstead, the wheel, the wire ---
  {
    // an iron bedstead stood on end — the barricade's spine
    const bz = -hz + 5.2 < zEnd ? -hz + 5.2 : zEnd - 1.2;
    const by = gY(0, bz);
    const f = xf(-0.12, by, bz, 6, 0, 0);
    for (const s of [-1, 1]) G.polyTube(ctx, [f(s * 0.52, 0, 0), f(s * 0.55, 1.3, 0.06)], 0.035, 6, [0, 1, 0], C.rustDeep);
    for (const y of [0.28, 0.72, 1.16]) fbox(ctx, f, [0, y, 0.03], [0.55, 0.022, 0.022], C.rust);
    for (let i = 0; i < 6; i++) fbox(ctx, f, [-0.45 + i * 0.18, 0.72, 0.03], [0.016, 0.45, 0.016], C.rust);
    // a cart wheel leaning on it
    {
      const w = xf(0.52, by + 0.52, bz + 0.75, 82, 0, 12);
      const ring = [];
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * TAU;
        ring.push(w(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0));
      }
      G.polyTube(ctx, ring, 0.05, 6, w.dir(0, 0, 1), C.rustDeep);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        G.polyTube(ctx, [w(0, 0, 0), w(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0)], 0.022, 5, w.dir(0, 0, 1), C.rust);
      }
    }
    // barbed wire drooping along the crest
    const wire = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const z = -hz + 0.3 + (L - gap - 0.6) * t;
      wire.push([Math.sin(t * 7.3) * 0.35, gY(0, z) + 1.15 + Math.sin(t * 5.1) * 0.16, z]);
    }
    G.polyTube(ctx, wire, 0.018, 4, [0, 1, 0], C.rust);
    for (let i = 1; i < 16; i += 2) {
      const q = wire[i];
      fbox(ctx, xf(q[0], q[1], q[2], i * 37, 0, 45), [0, 0, 0], [0.055, 0.012, 0.012], C.rust);
    }
  }
}

// ── PART: staff-car ─────────────────────────────────────────────────────────
// A burnt-out 1944 staff car. Long axis +Z, nose at +Z. Everything the fire could
// take is gone: no glass, no upholstery, tyres down to the rims, roof curled off.
export function staffCar(ctx, C, p) {
  const CH = C.char, LIT = C.charLit;

  // --- steel family: everything ---
  // bonnet, closed and buckled
  {
    const secs = [
      [0.72, 1.58, 0.80, 0.74], [1.10, 1.50, 0.80, 0.75], [1.70, 1.36, 0.76, 0.76],
      [2.15, 1.26, 0.72, 0.76], [2.44, 1.14, 0.60, 0.73],
    ];
    G.loftSections(ctx, secs.map(([z, w, h, cy]) => ({ z, poly: G.rrect(w, h, 0, cy, 0.05) })), CH);
  }
  // boot
  {
    const secs = [
      [-2.44, 1.48, 0.64, 0.72], [-2.12, 1.66, 0.72, 0.72], [-1.88, 1.72, 0.74, 0.72],
    ];
    G.loftSections(ctx, secs.map(([z, w, h, cy]) => ({ z, poly: G.rrect(w, h, 0, cy, 0.05) })), CH);
  }
  // cabin: an open tub — sides, floor, bulkheads
  bx(ctx, -0.84, 0.84, 0.30, 0.41, -1.9, 0.74, CH);                        // floor
  bx(ctx, -0.84, 0.84, 0.41, 1.04, -1.96, -1.86, CH);                      // rear bulkhead
  bx(ctx, -0.84, 0.84, 0.41, 1.12, 0.68, 0.78, CH);                        // scuttle
  bx(ctx, 0.78, 0.87, 0.36, 1.03, -1.9, 0.72, CH);                          // right side
  bx(ctx, -0.87, -0.78, 0.36, 1.03, -1.9, -0.24, CH);                       // left side, rear of the door
  bx(ctx, -0.87, -0.78, 0.36, 0.62, -0.24, 0.72, CH);                       // left sill under the open door
  // the driver's door, hanging open on its hinge
  {
    const f = xf(-0.86, 0.36, -0.2, -54, 0, 2);
    fbox(ctx, f, [-0.28, 0.34, 0], [0.3, 0.34, 0.05], CH);
    fbox(ctx, f, [-0.28, 0.72, 0], [0.28, 0.05, 0.04], LIT);
  }
  // seat frames, burnt to springs
  for (const sz of [-1.35, 0.1]) {
    bx(ctx, -0.7, 0.7, 0.41, 0.5, sz - 0.24, sz + 0.24, LIT);
    bx(ctx, -0.7, 0.7, 0.5, 1.0, sz - 0.3, sz - 0.22, LIT);
    for (let i = 0; i < 5; i++) {
      const x = -0.55 + i * 0.28;
      const coil = [];
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * TAU * 2.2;
        coil.push([x + Math.cos(a) * 0.06, 0.5 + (k / 10) * 0.22, sz + Math.sin(a) * 0.06]);
      }
      G.polyTube(ctx, coil, 0.011, 4, [0, 1, 0], LIT);
    }
  }
  // dash and wheel
  bx(ctx, -0.78, 0.78, 0.9, 1.1, 0.5, 0.68, CH);
  {
    const w = xf(-0.42, 1.06, 0.34, 0, 66, 0);
    const ring = [];
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * TAU;
      ring.push(w(Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0));
    }
    G.polyTube(ctx, ring, 0.02, 5, w.dir(0, 0, 1), LIT);
    G.polyTube(ctx, [w(0, 0, 0), w(0, 0, -0.28)], 0.03, 6, [0, 1, 0], LIT);
  }
  // windscreen frame, buckled forward; B-pillars snapped
  {
    const f = xf(0, 1.1, 0.72, 0, -16, 3);
    for (const s of [-1, 1]) fbox(ctx, f, [s * 0.72, 0.24, 0], [0.045, 0.26, 0.045], LIT);
    fbox(ctx, f, [0, 0.48, 0], [0.76, 0.05, 0.05], LIT);
    for (const s of [-1, 1]) fbox(ctx, xf(s * 0.82, 1.03, -1.05, 0, 24, s * 12), [0, 0.16, 0], [0.04, 0.2, 0.04], LIT);
  }
  // the roof panel, curled off onto the boot
  {
    const f = xf(0.1, 1.02, -1.9, 12, -22, 6);
    for (let i = 0; i < 6; i++) {
      const t0 = i / 6, t1 = (i + 1) / 6;
      const c0 = Math.sin(t0 * 1.9) * 0.34, c1 = Math.sin(t1 * 1.9) * 0.34;
      const a = f(-0.72, c0, -0.9 + t0 * 1.7), b = f(0.72, c0, -0.9 + t0 * 1.7);
      const c = f(0.72, c1, -0.9 + t1 * 1.7), d = f(-0.72, c1, -0.9 + t1 * 1.7);
      qd(ctx, CH, a, b, c, d);
      qd(ctx, LIT, d, c, b, a);
    }
  }
  // chassis rails and axles
  for (const s of [-1, 1]) bx(ctx, s * 0.5 - 0.07, s * 0.5 + 0.07, 0.3, 0.42, -2.36, 2.3, LIT);
  for (const az of [1.52, -1.48]) G.tube(ctx, [-0.9, 0.36, az], [0.9, 0.36, az], 0.06, 0.06, 8, [0, 1, 0], LIT);
  // running boards
  for (const s of [-1, 1]) bx(ctx, s * 0.86, s * 1.02, 0.42, 0.5, -1.35, 1.0, CH);
  // fenders — arcs over each wheel
  for (const s of [-1, 1]) {
    for (const az of [1.52, -1.48]) {
      const arc = [];
      for (let i = 0; i <= 7; i++) {
        const a = Math.PI * (0.06 + (i / 7) * 0.88);
        arc.push([s * 0.9, 0.36 + Math.sin(a) * 0.56, az + Math.cos(a) * 0.56]);
      }
      G.polyTube(ctx, arc, 0.13, 6, [1, 0, 0], CH, 0.42);
    }
  }
  // wheels: steel rims, tyres burnt to shreds
  for (const s of [-1, 1]) {
    for (const az of [1.52, -1.48]) {
      G.tube(ctx, [s * 0.78, 0.36, az], [s * 0.96, 0.36, az], 0.35, 0.35, 14, [0, 1, 0], LIT);
      G.tube(ctx, [s * 0.76, 0.36, az], [s * 0.98, 0.36, az], 0.12, 0.12, 8, [0, 1, 0], CH);
      for (let i = 0; i < 3; i++) {
        const a = ctx.random() * TAU;
        fbox(ctx, xf(s * 0.87, 0.36 + Math.sin(a) * 0.37, az + Math.cos(a) * 0.37, 0, 0, (a / D2R)), [0, 0, 0], [0.1, 0.05, 0.09], CH);
      }
    }
  }
  // radiator shell, grille slats, lamps, bumper — the face of the thing
  bx(ctx, -0.56, 0.56, 0.62, 1.16, 2.42, 2.5, LIT);
  for (let i = 0; i < 9; i++) {
    const x = -0.47 + i * 0.118;
    bx(ctx, x - 0.022, x + 0.022, 0.66, 1.12, 2.5, 2.54, CH);
  }
  for (const s of [-1, 1]) {
    G.tube(ctx, [s * 0.62, 1.02, 2.16], [s * 0.62, 1.02, 2.34], 0.17, 0.19, 10, [0, 1, 0], LIT);
    G.tube(ctx, [s * 0.62, 1.02, 2.2], [s * 0.62, 1.02, 2.33], 0.13, 0.145, 9, [0, 1, 0], CH);
  }
  G.polyTube(ctx, [[-0.82, 0.66, 2.5], [-0.3, 0.62, 2.62], [0.36, 0.68, 2.6], [0.8, 0.78, 2.42]], 0.055, 6, [0, 1, 0], LIT, 0.5);
  // the pennant staff a staff car carries, bent over the wing
  G.polyTube(ctx, [[0.78, 1.02, 1.9], [0.86, 1.5, 1.82], [1.02, 1.72, 1.6]], [0.022, 0.016, 0.012], 5, [0, 1, 0], LIT);

  // --- masonry family last: the ash and the glass under it ---
  rubbleHeap(ctx, { cx: 0, cz: 0, rx: 1.4, rz: 2.6, count: 14, height: 0.14, size: 0.2, paint: C.soot });
}

// ── PART: shopfront ─────────────────────────────────────────────────────────
export function shopfront(ctx, C, p) {
  const W = clamp(num(p.width, 9.4), 6, 14);
  const D = clamp(num(p.depth, 6.4), 4, 9);
  const hx = W / 2, hz = D / 2;
  const T = 0.34;
  const hole = String(p.hole || "left");
  const hs = hole === "right" ? 1 : -1;
  const holeOn = hole !== "none";
  // the wound: everything below 3.0 m across a 3.4 m bite of the shop front
  const holeC = hs * (hx - 1.9);
  const bite = (x, y) => holeOn && Math.abs(x - holeC) < 1.75 + ctx.noise2d(y * 0.6, x * 0.4) * 0.45 && y < 3.0 + ctx.noise2d(x * 0.5, 3) * 0.6;

  const y0 = ctx.groundY(0, 0);
  const base = y0 - 1.2;

  // --- masonry: floor slab, party walls, back wall, shop front, fascia, upper storey ---
  // ground slab
  bx(ctx, -hx, hx, base, y0 + 0.06, -hz, hz, C.stoneIn);
  // party walls
  for (const s of [-1, 1]) {
    panel(ctx, {
      axis: "x", u0: -hz, u1: hz, nu: 14, y0: base, y1: y0 + 6.4, ny: 16,
      t0: s > 0 ? hx - T : -hx, t1: s > 0 ? hx : -hx + T,
      keep: (z, y) => {
        const top = y0 + 5.4 - Math.abs(z) * 0.12 + ctx.noise2d(z * 0.7, s * 5) * 1.1;
        if (y > top) return false;
        if (holeOn && s === hs && y < y0 + 2.2 && z > hz - 2.6 && ctx.noise2d(z * 0.8, 11) > -0.1) return false;
        return true;
      },
      paintOut: C.brick, paintIn: C.brickIn, paintEdge: C.brickIn,
    });
  }
  // back wall with its yard door
  panel(ctx, {
    axis: "z", u0: -hx, u1: hx, nu: 14, y0: base, y1: y0 + 4.4, ny: 11,
    t0: -hz, t1: -hz + T,
    keep: (x, y) => {
      if (y > y0 + 3.9 + ctx.noise2d(x * 0.6, 7) * 0.6) return false;
      if (x > -1.2 && x < 0.0 && y > y0 && y < y0 + 2.1) return false;
      return true;
    },
    paintOut: C.brickIn, paintIn: C.brick, paintEdge: C.brickIn,
  });
  // the shop front: stall riser, plate window, door, and the hole
  panel(ctx, {
    axis: "z", u0: -hx, u1: hx, nu: 22, y0: base, y1: y0 + 3.5, ny: 13,
    t0: hz - T, t1: hz,
    keep: (x, y) => {
      if (bite(x, y - y0)) return false;
      const w = y - y0;
      if (x > -hx + 0.55 && x < hx - 2.9 && w > 0.62 && w < 2.72) return false;   // plate window
      if (x > hx - 2.5 && x < hx - 1.4 && w > 0 && w < 2.32) return false;        // the door
      return true;
    },
    paintOut: C.plaster, paintIn: C.brickIn, paintEdge: C.brickIn,
  });
  // fascia board over the window, sagging where the hole took it
  panel(ctx, {
    axis: "z", u0: -hx - 0.12, u1: hx + 0.12, nu: 16, y0: y0 + 3.5, y1: y0 + 4.24, ny: 3,
    t0: hz - T - 0.12, t1: hz + 0.14,
    keep: (x, y) => !(holeOn && Math.abs(x - holeC) < 1.5 && y > y0 + 3.95),
    paintOut: C.grime, paintIn: C.brickIn, paintEdge: C.brickIn,
  });
  // upper storey, blown open
  panel(ctx, {
    axis: "z", u0: -hx, u1: hx, nu: 18, y0: y0 + 4.24, y1: y0 + 6.5, ny: 8,
    t0: hz - T, t1: hz,
    keep: (x, y) => {
      const top = y0 + 6.1 - Math.max(0, hs * x) * 0.34 + ctx.noise2d(x * 0.55, 17) * 0.85;
      if (y > top) return false;
      if (x > -1.5 && x < 0.4 && y > y0 + 4.9 && y < y0 + 6.0) return false;
      return true;
    },
    paintOut: C.plaster, paintIn: C.brickIn, paintEdge: C.brickIn,
  });
  // the first floor, half of it gone with the front — top pass, then edges
  {
    const nx = 12, nz = 9, cw = W / nx, cd = D / nz;
    const live = [];
    for (let i = 0; i < nx; i++) {
      live.push([]);
      for (let j = 0; j < nz; j++) {
        const x = -hx + cw * (i + 0.5), z = -hz + cd * (j + 0.5);
        const d = Math.hypot((x - holeC) / 3.4, (z - hz) / 3.0);
        live[i].push(!(holeOn && d < 1 + ctx.noise2d(x * 0.5, z * 0.5) * 0.25));
      }
    }
    const on = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && live[i][j];
    const YT = y0 + 3.62, YB = y0 + 3.42;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (!live[i][j]) continue;
      const xa = -hx + cw * i, xb = xa + cw, za = -hz + cd * j, zb = za + cd;
      qd(ctx, C.stone, [xa, YT, zb], [xb, YT, zb], [xb, YT, za], [xa, YT, za]);
      qd(ctx, C.stoneIn, [xa, YB, za], [xb, YB, za], [xb, YB, zb], [xa, YB, zb]);
      if (!on(i, j - 1)) qd(ctx, C.stoneIn, [xb, YB, za], [xa, YB, za], [xa, YT, za], [xb, YT, za]);
      if (!on(i, j + 1)) qd(ctx, C.stoneIn, [xa, YB, zb], [xb, YB, zb], [xb, YT, zb], [xa, YT, zb]);
      if (!on(i - 1, j)) qd(ctx, C.stoneIn, [xa, YB, za], [xa, YB, zb], [xa, YT, zb], [xa, YT, za]);
      if (!on(i + 1, j)) qd(ctx, C.stoneIn, [xb, YB, zb], [xb, YB, za], [xb, YT, za], [xb, YT, zb]);
    }
  }
  // stall riser and the pavement kerb
  bx(ctx, -hx, hx, y0, y0 + 0.62, hz - 0.06, hz + 0.28, C.stone);
  // the brick spill out of the hole
  if (holeOn) {
    rubbleHeap(ctx, { cx: holeC, cz: hz + 1.5, rx: 2.6, rz: 1.9, count: 30, height: 1.15, size: 0.4, paint: C.rubble });
    rubbleHeap(ctx, { cx: holeC, cz: hz - 1.4, rx: 2.2, rz: 1.6, count: 20, height: 0.8, size: 0.36, paint: C.rubble });
  }
  rubbleHeap(ctx, { cx: -hs * (hx - 1.2), cz: hz + 1.1, rx: 1.5, rz: 0.9, count: 10, height: 0.4, size: 0.28, paint: C.rubble });

  // --- timber: counter, shelving, the shutter, the awning's shreds ---
  bx(ctx, -hx + 0.8, hx - 3.2, y0, y0 + 1.02, -0.6, 0.1, C.wood);            // the counter
  bx(ctx, -hx + 0.75, hx - 3.15, y0 + 1.02, y0 + 1.1, -0.66, 0.16, C.woodPale);
  for (let i = 0; i < 4; i++) {
    bx(ctx, -hx + 0.5, -hx + 3.4, y0 + 0.6 + i * 0.62, y0 + 0.66 + i * 0.62, -hz + 0.4, -hz + 0.86, C.woodDark);
  }
  for (let i = 0; i < 5; i++) {
    const x = ctx.randomRange(-hx + 0.6, hx - 0.6);
    const z = ctx.randomRange(hz + 0.4, hz + 2.4);
    fbox(ctx, xf(x, ctx.groundY(x, z) + 0.06, z, ctx.random() * 360, ctx.randomRange(-8, 8), ctx.randomRange(-6, 6)), [0, 0, 0], [0.5, 0.03, 0.09], C.wood);
  }

  // --- steel: window frame, awning brackets, the sign irons ---
  {
    const wx0 = -hx + 0.55, wx1 = hx - 2.9;
    for (const x of [wx0, wx1, (wx0 + wx1) / 2]) {
      if (bite(x, 1.6)) continue;
      bx(ctx, x - 0.04, x + 0.04, y0 + 0.62, y0 + 2.74, hz - 0.24, hz - 0.16, C.rustDeep);
    }
    for (const y of [0.62, 2.72]) {
      const a = Math.max(wx0, holeOn ? holeC + 1.8 : wx0);
      bx(ctx, a, wx1, y0 + y - 0.04, y0 + y + 0.04, hz - 0.24, hz - 0.16, C.rustDeep);
    }
    // awning brackets and a shredded canvas roll
    for (const s of [-1, 1]) {
      const x = s * (hx - 1.5);
      if (holeOn && Math.abs(x - holeC) < 1.9) continue;
      G.polyTube(ctx, [[x, y0 + 3.4, hz + 0.05], [x, y0 + 3.05, hz + 1.1]], 0.035, 5, [0, 1, 0], C.rust);
      G.polyTube(ctx, [[x, y0 + 3.4, hz + 0.05], [x, y0 + 3.02, hz + 1.08]], 0.02, 4, [0, 1, 0], C.rust);
    }
    G.tube(ctx, [-hx + 1.4, y0 + 3.06, hz + 1.05], [hx - 1.4, y0 + 3.06, hz + 1.05], 0.06, 0.06, 7, [0, 1, 0], C.rust);
    // a hanging sign bracket, its board gone
    G.polyTube(ctx, [[hx - 0.5, y0 + 3.9, hz + 0.1], [hx - 0.5, y0 + 3.88, hz + 0.85], [hx - 0.5, y0 + 3.5, hz + 0.8]], 0.028, 5, [0, 1, 0], C.rust);
  }
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const C = palette(ctx);
  const part = String(p.part || "fountain");
  if (part === "statue") statue(ctx, C, p);
  else if (part === "crater") crater(ctx, C, p);
  else if (part === "barricade") barricade(ctx, C, p);
  else if (part === "staff-car") staffCar(ctx, C, p);
  else if (part === "shopfront") shopfront(ctx, C, p);
  else fountain(ctx, C, p);
}
