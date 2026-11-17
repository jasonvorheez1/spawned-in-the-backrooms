// THE CANAL WORKS — quay walls and a blown bridge, as ONE generator.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-military/span.js",
//                params: { part: "bridge-near" } }
//
// FRAME
//   quay      origin ON THE QUAY PAVEMENT at the run's centre. The run travels along
//             +X; the water face looks down -Z; the coping stands 0.14 m proud of the
//             pavement. Yaw the row 0 for a wall whose water is to the north, 180 for
//             a wall whose water is to the south.
//   bridge-*  THREE parts of ONE bridge that MUST SHARE AN ANCHOR: give all three spec
//             rows the SAME feetPosition — the canal centreline, y: { terrain: 0 },
//             which is the canal BED. Local +Z is the NEAR (standing) bank, local -Z
//             the FAR bank whose span is down in the water.
//
// The deck height is derived from the banks through ctx.groundY, never hardcoded, so
// the three parts agree with each other and with whatever the terrain does under them.
//
//   part: "quay"            length 6-60, height, thickness, slump 0-1, ladder 0-1
//   part: "bridge-near"     abutment, cutwater pier, one arch, deck, parapets, the break
//   part: "bridge-crossing" the laid plank over the break, the bent girder walk, far abutment
//   part: "bridge-fallen"   the far span down in the water, girders bent into it
//
// COLLISION: no collider() export — the visual mesh IS the collider, which is what
// makes the plank and the girder walk something a player actually crosses. Every spec
// row carries physics: { body: "static", collider: "mesh" }.
//
// WINDING: one law — every face counter-clockwise seen from outside. All emission goes
// through qd/bx/solidGrid, which own it.

const G = require("scripts/lib/geom.js");

const TAU = Math.PI * 2;

// THREE textures, no more. Every CDN albedo switch starts a new draw group, so a
// generator that interleaves five albedos shatters into sixty submeshes. Tint does
// the variety; the albedo stays put inside a family.
const TEX = {
  stone: "/cdn/moodboard-realistic-gritty/texture-ruin-limestone-blocks-1944.png",
  rust: "/cdn/moodboard-realistic-gritty/texture-debris-steel-rusted-1944.png",
  timber: "/cdn/moodboard-realistic-gritty/texture-armory-board-oak.png",
};

// ── paint ───────────────────────────────────────────────────────────────────
export function palette(ctx) {
  const s = (o) => G.surface(ctx, o);
  return {
    // masonry family — one albedo, many tints
    stone: s({ tex: TEX.stone, r: 0.58, g: 0.56, b: 0.5, rough: 0.94, jitter: 0.18, freq: 3.1 }),
    stoneWet: s({ tex: TEX.stone, r: 0.34, g: 0.34, b: 0.32, rough: 0.84, jitter: 0.22, freq: 4.6 }),
    stoneIn: s({ tex: TEX.stone, r: 0.43, g: 0.41, b: 0.37, rough: 0.97, jitter: 0.2, freq: 4.2 }),
    cope: s({ tex: TEX.stone, r: 0.66, g: 0.64, b: 0.58, rough: 0.9, jitter: 0.14, freq: 5.4 }),
    weed: s({ tex: TEX.stone, r: 0.23, g: 0.27, b: 0.16, rough: 1, jitter: 0.26, freq: 6.5 }),
    road: s({ tex: TEX.stone, r: 0.46, g: 0.45, b: 0.43, rough: 0.98, jitter: 0.2, freq: 4.4 }),
    core: s({ tex: TEX.stone, r: 0.36, g: 0.34, b: 0.32, rough: 1, jitter: 0.24, freq: 6 }),
    rubble: s({ tex: TEX.stone, r: 0.42, g: 0.32, b: 0.26, rough: 1, jitter: 0.3, freq: 4 }),
    silt: s({ tex: TEX.stone, r: 0.2, g: 0.19, b: 0.16, rough: 1, jitter: 0.22, freq: 5 }),
    // steel family
    steel: s({ tex: TEX.rust, r: 0.35, g: 0.35, b: 0.36, metal: 0.72, rough: 0.6, jitter: 0.16, freq: 8 }),
    rust: s({ tex: TEX.rust, r: 0.4, g: 0.23, b: 0.13, metal: 0.42, rough: 0.9, jitter: 0.28, freq: 5 }),
    rustDeep: s({ tex: TEX.rust, r: 0.19, g: 0.12, b: 0.08, metal: 0.3, rough: 1, jitter: 0.26, freq: 7 }),
    // timber family
    plank: s({ tex: TEX.timber, r: 0.46, g: 0.38, b: 0.26, rough: 0.95, jitter: 0.24, freq: 4.2 }),
    plankWet: s({ tex: TEX.timber, r: 0.3, g: 0.25, b: 0.18, rough: 0.98, jitter: 0.22, freq: 6 }),
    rope: s({ tex: TEX.timber, r: 0.44, g: 0.38, b: 0.26, rough: 1, jitter: 0.2, freq: 9 }),
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

// Axis-aligned closed box. Every face wound CCW from outside.
export function bx(ctx, x0, x1, y0, y1, z0, z1, paint) {
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  const P = (x, y, z) => [x, y, z];
  const nnn = P(xa, ya, za), pnn = P(xb, ya, za), npn = P(xa, yb, za), ppn = P(xb, yb, za);
  const nnp = P(xa, ya, zb), pnp = P(xb, ya, zb), npp = P(xa, yb, zb), ppp = P(xb, yb, zb);
  qd(ctx, paint, nnp, pnp, ppp, npp);
  qd(ctx, paint, pnn, nnn, npn, ppn);
  qd(ctx, paint, pnp, pnn, ppn, ppp);
  qd(ctx, paint, nnn, nnp, npp, npn);
  qd(ctx, paint, npp, ppp, ppn, npn);
  qd(ctx, paint, nnn, pnn, pnp, nnp);
}

// A solid whose top and bottom are height fields over an (x, z) grid, carved by
// `keep`. Side faces appear only where a neighbour cell is missing, so a ragged
// break edge falls out of the carve instead of being modelled.
export function solidGrid(ctx, o) {
  const nx = Math.max(1, o.nx | 0), nz = Math.max(1, o.nz | 0);
  const X = (i) => o.x0 + ((o.x1 - o.x0) * i) / nx;
  const Z = (j) => o.z0 + ((o.z1 - o.z0) * j) / nz;
  const keep = o.keep || (() => true);
  const top = o.top, bot = o.bottom;
  const alive = [];
  for (let i = 0; i < nx; i++) {
    alive.push([]);
    for (let j = 0; j < nz; j++) {
      const cx = (X(i) + X(i + 1)) / 2, cz = (Z(j) + Z(j + 1)) / 2;
      alive[i].push(keep(cx, cz) && top(cx, cz) - bot(cx, cz) > 0.03);
    }
  }
  const on = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && alive[i][j];
  const T = (x, z) => [x, top(x, z), z];
  const B = (x, z) => [x, bot(x, z), z];
  // THREE passes, not per-cell interleave: every albedo switch starts a new draw
  // group, so one grid costs three groups instead of three per cell.
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      if (!alive[i][j]) continue;
      const xa = X(i), xb = X(i + 1), za = Z(j), zb = Z(j + 1);
      qd(ctx, o.paintTop, T(xa, zb), T(xb, zb), T(xb, za), T(xa, za));
    }
  }
  if (o.paintBottom) {
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        if (!alive[i][j]) continue;
        const xa = X(i), xb = X(i + 1), za = Z(j), zb = Z(j + 1);
        qd(ctx, o.paintBottom, B(xa, za), B(xb, za), B(xb, zb), B(xa, zb));
      }
    }
  }
  const side = o.paintSide || o.paintTop;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      if (!alive[i][j]) continue;
      const xa = X(i), xb = X(i + 1), za = Z(j), zb = Z(j + 1);
      if (!on(i, j - 1)) qd(ctx, side, B(xb, za), B(xa, za), T(xa, za), T(xb, za));
      if (!on(i, j + 1)) qd(ctx, side, B(xa, zb), B(xb, zb), T(xb, zb), T(xa, zb));
      if (!on(i - 1, j)) qd(ctx, side, B(xa, za), B(xa, zb), T(xa, zb), T(xa, za));
      if (!on(i + 1, j)) qd(ctx, side, B(xb, zb), B(xb, za), T(xb, za), T(xb, zb));
    }
  }
}

// A rolled I-beam swept along a polyline: bottom flange, web, top flange.
export function girder(ctx, pts, depth, flange, web, paint) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const y0 = Math.min(a[1], b[1]) - depth / 2, y1 = Math.max(a[1], b[1]) + depth / 2;
    const za = Math.min(a[2], b[2]), zb = Math.max(a[2], b[2]);
    const x = a[0];
    const ay = a[1], by = b[1];
    // three lofted strips: the sag is carried in Y, the run in Z
    const strip = (yo, hw, ht) => {
      const fa = ay + yo, fb = by + yo;
      qd(ctx, paint, [x - hw, fa - ht, za], [x + hw, fa - ht, za], [x + hw, fb - ht, zb], [x - hw, fb - ht, zb]);
      qd(ctx, paint, [x - hw, fb + ht, zb], [x + hw, fb + ht, zb], [x + hw, fa + ht, za], [x - hw, fa + ht, za]);
      qd(ctx, paint, [x + hw, fa - ht, za], [x + hw, fa + ht, za], [x + hw, fb + ht, zb], [x + hw, fb - ht, zb]);
      qd(ctx, paint, [x - hw, fb - ht, zb], [x - hw, fb + ht, zb], [x - hw, fa + ht, za], [x - hw, fa - ht, za]);
    };
    strip(depth / 2 - flange / 2, 0.16, flange / 2);
    strip(-depth / 2 + flange / 2, 0.16, flange / 2);
    strip(0, web / 2, depth / 2 - flange);
    void y0; void y1;
  }
}

// ── PART: quay ──────────────────────────────────────────────────────────────
export function quay(ctx, C, p) {
  const L = clamp(num(p.length, 44), 6, 60);
  const H = clamp(num(p.height, 5.4), 2, 9);
  const T = clamp(num(p.thickness, 1.5), 0.6, 3);
  const slump = clamp(num(p.slump, 0.35), 0, 1);
  const wantLadder = p.ladder !== false;
  const hx = L / 2;
  const COPE = 0.14;
  const face = -T;              // the water face
  const back = 0.15;            // buried in the bank
  const skin = face + 0.09;     // recessed mortar plane

  // the slumped bay: a length where shellfire took the coping and two courses
  const slumpAt = -hx + L * (0.28 + ctx.random() * 0.44);
  const slumpHalf = slump > 0 ? 2.2 + slump * 2.6 : 0;
  const slumped = (x) => Math.abs(x - slumpAt) < slumpHalf * (0.7 + 0.3 * Math.cos(((x - slumpAt) / Math.max(0.001, slumpHalf)) * 1.4));
  const crown = (x) => (slumped(x) ? -0.55 - 0.85 * slump * (1 - Math.abs(x - slumpAt) / Math.max(0.001, slumpHalf)) : 0);

  // core: the mass of the wall, faced later
  solidGrid(ctx, {
    x0: -hx, x1: hx, nx: Math.max(6, Math.round(L / 1.4)),
    z0: skin, z1: back, nz: 2,
    top: (x) => crown(x),
    bottom: () => -H,
    paintTop: C.stoneIn, paintBottom: C.core, paintSide: C.stoneIn,
  });

  // ashlar facing — big canal blocks with a recessed joint, battered back per course
  const CH = 0.72, BL = 1.8;
  const courses = Math.max(2, Math.floor((H - 0.35) / CH));
  for (let c = 0; c < courses; c++) {
    const y0 = -H + 0.32 + c * CH;
    const y1 = y0 + CH - 0.055;
    const batter = (courses - 1 - c) * 0.02;
    const n = Math.max(2, Math.round(L / BL));
    const phase = (c % 2) * 0.5;
    for (let i = 0; i < n; i++) {
      const x0 = -hx + (L * (i + phase)) / n + 0.045;
      const x1 = x0 + L / n - 0.09;
      if (x1 <= -hx || x0 >= hx) continue;
      const cx = (x0 + x1) / 2;
      if (y0 > crown(cx) - 0.05) continue;
      const proud = ctx.noise2d(cx * 0.7, y0 * 1.9) * 0.028;
      const wet = y0 < -H + 1.5;
      bx(ctx, Math.max(-hx, x0), Math.min(hx, x1), y0, y1, face - proud - batter, skin, wet ? C.stoneWet : C.stone);
    }
  }

  // waterline weed and silt smear
  for (let i = 0; i < Math.round(L / 2.4); i++) {
    const x = -hx + ctx.random() * L;
    const y = -H + 0.55 + ctx.random() * 0.7;
    bx(ctx, x - 0.5, x + 0.5, y, y + 0.22 + ctx.random() * 0.3, face - 0.09, face + 0.02, C.weed);
  }

  // coping stones — discrete, overhanging, a few missing
  const cn = Math.max(2, Math.round(L / 1.15));
  for (let i = 0; i < cn; i++) {
    const x0 = -hx + (L * i) / cn + 0.035;
    const x1 = x0 + L / cn - 0.07;
    const cx = (x0 + x1) / 2;
    if (crown(cx) < -0.02) continue;
    if (ctx.noise2d(cx * 1.7, 91) > 0.78) continue;
    const tip = ctx.noise2d(cx * 0.9, 12) * 0.012;
    bx(ctx, x0, x1, -0.02 + tip, COPE + tip, face - 0.11, back - 0.02, C.cope);
  }

  // mooring rings on cast bosses
  for (let x = -hx + 5.5; x < hx - 3; x += 9.5) {
    if (slumped(x)) continue;
    bx(ctx, x - 0.16, x + 0.16, -1.05, -0.72, face - 0.16, face + 0.02, C.rustDeep);
    const ring = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * TAU;
      ring.push([x + Math.sin(a) * 0.17, -1.06 + Math.cos(a) * 0.17 - 0.16, face - 0.2]);
    }
    G.polyTube(ctx, ring, 0.035, 6, [0, 0, -1], C.rust);
  }

  // an iron ladder down to the water
  if (wantLadder) {
    const lx = -hx + L * 0.22;
    for (const s of [-1, 1]) bx(ctx, lx + s * 0.24 - 0.03, lx + s * 0.24 + 0.03, -H + 0.4, -0.05, face - 0.24, face - 0.18, C.rust);
    for (let y = -H + 0.6; y < -0.2; y += 0.34) bx(ctx, lx - 0.28, lx + 0.28, y, y + 0.045, face - 0.25, face - 0.16, C.rust);
  }

  // the spill from the slumped bay, into the water
  if (slump > 0) {
    const n = Math.round(12 + slump * 16);
    for (let i = 0; i < n; i++) {
      const x = slumpAt + (ctx.random() * 2 - 1) * slumpHalf * 1.25;
      const z = face - ctx.random() * (1.4 + slump * 2.2);
      const y = -H + 0.12 + ctx.random() * ctx.random() * 1.5;
      const s = 0.2 + ctx.random() * 0.42;
      bx(ctx, x - s, x + s * 0.8, y, y + s * (0.5 + ctx.random() * 0.6), z - s, z + s * 0.7, ctx.random() > 0.55 ? C.rubble : C.stoneIn);
    }
    // the broken coping that went with it
    for (let i = 0; i < 3; i++) {
      const x = slumpAt + (ctx.random() * 2 - 1) * slumpHalf;
      const z = face - 0.8 - ctx.random() * 2.2;
      bx(ctx, x - 0.55, x + 0.55, -H + 0.18, -H + 0.36, z - 0.3, z + 0.3, C.cope);
    }
  }
}

// ── the bridge's shared frame ───────────────────────────────────────────────
// Anchor sits on the canal bed at the centreline. Everything else is derived.
export function bridgeFrame(ctx) {
  // The banks, read off the live terrain. On dead-flat ground (the preview booth, or
  // a canal that was never cut) fall back to a nominal 5 m cut so the arch still has
  // something to spring over instead of folding inside out.
  const bankS = ctx.groundY(0, 13);
  const bankN = ctx.groundY(0, -13);
  const rise = Math.max(bankS, bankN, 5.0);
  const DECK = rise + 0.35;
  return {
    DECK,
    bankS,
    bankN,
    HW: 4.0,            // roadway half-width
    PW: 0.52,           // parapet thickness
    BRK: 0.8,           // where the standing deck ends (nominal; ragged in x)
    PIER0: 0.8, PIER1: 2.6,
    SPR: DECK - 2.55,   // arch springing
    AR0: 2.6, AR1: 9.0, // arch springs at these z
    ABS0: 9.0, ABS1: 14.2,   // near abutment
    ABN0: -14.6, ABN1: -9.5, // far abutment
    GW0: -9.5, GW1: -2.4,    // surviving girder run
  };
}

// the ragged edge of the broken deck, in x
export function breakAt(ctx, F) {
  return (x) => F.BRK + ctx.noise2d(x * 0.55, 7.3) * 0.85 + ctx.noise2d(x * 1.7, 2.1) * 0.3;
}

// the deck's underside: arch void where the arch is, buried mass elsewhere
export function underSide(ctx, F) {
  const S = F.AR1 - F.AR0, R = 1.95;
  const cz = (F.AR0 + F.AR1) / 2;
  const r = (S * S) / 4 / (2 * R) + R / 2;
  const cy = F.SPR + R - r;
  return (z) => {
    if (z >= F.AR0 && z <= F.AR1) {
      const d = z - cz;
      const inner = cy + Math.sqrt(Math.max(0, r * r - d * d));
      return Math.min(inner, F.DECK - 0.5);
    }
    if (z > F.AR1) return Math.min(ctx.groundY(0, z) - 1.4, F.SPR - 0.3);
    return 0.12; // the pier, standing on the bed
  };
}

// ── PART: bridge-near ───────────────────────────────────────────────────────
export function bridgeNear(ctx, C, p) {
  const F = bridgeFrame(ctx);
  const brk = breakAt(ctx, F);
  const under = underSide(ctx, F);
  const camber = (x) => F.DECK - Math.pow(Math.abs(x) / F.HW, 2) * 0.09;

  // deck + arch + abutment as ONE carved solid
  solidGrid(ctx, {
    x0: -F.HW, x1: F.HW, nx: 16,
    z0: F.PIER0 - 0.6, z1: F.ABS1 + 3.4, nz: 38,
    top: (x, z) => {
      if (z <= F.ABS1) return camber(x);
      const t = Math.min(1, (z - F.ABS1) / 3.4);
      return camber(x) + (ctx.groundY(0, z) + 0.06 - camber(x)) * t;
    },
    bottom: (x, z) => (z > F.ABS1 ? Math.min(under(z), ctx.groundY(0, z) - 0.9) : under(z)) + Math.abs(x) * 0.01,
    keep: (x, z) => z > brk(x),
    paintTop: (x, y, z) => (z > F.ABS1 - 1.2 ? C.road : C.road)(x, y, z),
    paintBottom: C.stoneIn,
    paintSide: C.stone,
  });

  // ring stones on both faces of the arch — the archivolt that says masonry
  {
    const N = 15;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const z0 = F.AR0 + (F.AR1 - F.AR0) * t0, z1 = F.AR0 + (F.AR1 - F.AR0) * t1;
      const y0 = under(z0), y1 = under(z1);
      for (const s of [-1, 1]) {
        const xa = s > 0 ? F.HW - 0.02 : -F.HW - 0.26;
        const xb = s > 0 ? F.HW + 0.26 : -F.HW + 0.02;
        qd(ctx, C.cope, [xa, y0, z0], [xb, y0, z0], [xb, y1, z1], [xa, y1, z1]);
        qd(ctx, C.cope, [xa, y0 + 0.62, z0], [xa, y0, z0], [xa, y1, z1], [xa, y1 + 0.62, z1]);
        qd(ctx, C.cope, [xb, y0, z0], [xb, y0 + 0.62, z0], [xb, y1 + 0.62, z1], [xb, y1, z1]);
        qd(ctx, C.cope, [xb, y0 + 0.62, z0], [xa, y0 + 0.62, z0], [xa, y1 + 0.62, z1], [xb, y1 + 0.62, z1]);
      }
    }
  }

  // the cutwater pier, standing in the water with its nose split
  {
    const px = 3.05;
    bx(ctx, -px, px, 0.05, F.SPR - 0.28, F.PIER0, F.PIER1, C.stone);
    for (const s of [-1, 1]) {
      const zc = s > 0 ? F.PIER1 : F.PIER0;
      const zt = zc + s * 1.15;
      qd(ctx, C.stone, [-px, 0.05, zc], [px, 0.05, zc], [0, 0.05, zt], [0, 0.05, zt]);
      const top = F.SPR - 0.28;
      qd(ctx, C.stone, [0, top, zt], [px, top, zc], [-px, top, zc], [0, top, zt]);
      if (s > 0) {
        qd(ctx, C.stone, [px, 0.05, zc], [0, 0.05, zt], [0, top, zt], [px, top, zc]);
        qd(ctx, C.stone, [0, 0.05, zt], [-px, 0.05, zc], [-px, top, zc], [0, top, zt]);
      } else {
        qd(ctx, C.stone, [0, 0.05, zt], [px, 0.05, zc], [px, top, zc], [0, top, zt]);
        qd(ctx, C.stone, [-px, 0.05, zc], [0, 0.05, zt], [0, top, zt], [-px, top, zc]);
      }
    }
    // the cap the arch springs off, chipped
    bx(ctx, -px - 0.22, px + 0.22, F.SPR - 0.32, F.SPR - 0.05, F.PIER0 - 0.3, F.PIER1 + 0.3, C.cope);
  }

  // parapets — broken back from the blast, coping gone at the break
  for (const s of [-1, 1]) {
    const x0 = s * F.HW, x1 = s * (F.HW + F.PW);
    solidGrid(ctx, {
      x0: Math.min(x0, x1), x1: Math.max(x0, x1), nx: 2,
      z0: F.BRK, z1: F.ABS1 - 0.4, nz: 30,
      top: (x, z) => {
        const lean = Math.max(0, 3.6 - (z - F.BRK)) / 3.6;
        return F.DECK + 0.98 - lean * (0.55 + 0.42 * ctx.noise2d(z * 0.9, s * 4));
      },
      bottom: () => F.DECK - 0.16,
      keep: (x, z) => z > brk(x) + 0.6 && !(z < F.BRK + 5.2 && ctx.noise2d(z * 0.8, s * 13) > 0.62),
      paintTop: C.cope, paintSide: C.stone,
    });
  }

  // spalled concrete and rebar hanging off the broken end
  for (let i = 0; i < 9; i++) {
    const x = -F.HW + ctx.random() * F.HW * 2;
    const z = brk(x) - 0.1 - ctx.random() * 0.5;
    const y = F.DECK - 0.35 - ctx.random() * 0.9;
    const s = 0.16 + ctx.random() * 0.3;
    bx(ctx, x - s, x + s, y - s * 0.7, y + s * 0.7, z - s, z + s * 0.6, C.core);
  }
  for (let i = 0; i < 7; i++) {
    const x = -F.HW + 0.5 + ctx.random() * (F.HW * 2 - 1);
    const z = brk(x);
    const y = F.DECK - 0.28 - ctx.random() * 0.35;
    const pts = [[x, y, z], [x + ctx.randomRange(-0.2, 0.2), y - 0.25, z - 0.7], [x + ctx.randomRange(-0.5, 0.5), y - 0.75, z - 1.1]];
    G.polyTube(ctx, pts, 0.022, 5, [0, 1, 0], C.rust);
  }

  // masonry that fell off the broken end into the water below
  for (let i = 0; i < 16; i++) {
    const x = ctx.randomRange(-F.HW, F.HW);
    const z = ctx.randomRange(-0.4, 2.4);
    const s = 0.22 + ctx.random() * 0.5;
    bx(ctx, x - s, x + s * 0.8, 0.06, 0.06 + s * (0.5 + ctx.random()), z - s, z + s * 0.75, ctx.random() > 0.5 ? C.stoneIn : C.rubble);
  }
}

// the surviving girder's sag: y of the top flange centre, z from GW1 (torn) to GW0 (abutment)
export function girderTop(F) {
  return (z) => {
    const t = clamp((z - F.GW1) / (F.GW0 - F.GW1), 0, 1);
    return F.DECK - 0.2 - 1.3 * Math.pow(1 - t, 1.8);
  };
}

// ── PART: bridge-crossing ───────────────────────────────────────────────────
export function bridgeCrossing(ctx, C, p) {
  const F = bridgeFrame(ctx);
  const brk = breakAt(ctx, F);
  const gy = girderTop(F);
  const WX0 = -3.25, WX1 = -1.0;      // the walkway, laid down one side
  const deckTop = (z) => gy(z) + 0.15;  // top of the boards on the girders

  // far abutment + its approach ramp
  solidGrid(ctx, {
    x0: -F.HW - F.PW, x1: F.HW + F.PW, nx: 12,
    z0: F.ABN0 - 3.6, z1: F.ABN1, nz: 20,
    top: (x, z) => (z < F.ABN0 + 0.9 ? Math.min(F.DECK, ctx.groundY(0, z) + 0.2 + (z - (F.ABN0 - 3.6)) * 0.55) : F.DECK),
    bottom: (x, z) => Math.min(ctx.groundY(0, z) - 1.4, 0.1),
    paintTop: C.road, paintBottom: C.core, paintSide: C.stone,
  });
  // its parapets, what's left of them
  for (const s of [-1, 1]) {
    solidGrid(ctx, {
      x0: Math.min(s * F.HW, s * (F.HW + F.PW)), x1: Math.max(s * F.HW, s * (F.HW + F.PW)), nx: 2,
      z0: F.ABN0, z1: F.ABN1, nz: 12,
      top: (x, z) => F.DECK + 0.98 - Math.max(0, 2.6 - (z - F.ABN0)) / 2.6 * 0.7,
      bottom: () => F.DECK - 0.16,
      keep: (x, z) => ctx.noise2d(z * 0.8, s * 21) < 0.68,
      paintTop: C.cope, paintSide: C.stone,
    });
  }

  // the two surviving girders, bent down toward the break
  const N = 12;
  for (const gx of [-2.95, -1.3]) {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const z = F.GW1 + ((F.GW0 - F.GW1) * i) / N;
      pts.push([gx, gy(z), z]);
    }
    girder(ctx, pts, 0.44, 0.055, 0.045, C.rust);
  }
  // cross-bracing between them
  for (let i = 1; i < N; i += 2) {
    const z = F.GW1 + ((F.GW0 - F.GW1) * i) / N;
    bx(ctx, -2.95, -1.3, gy(z) - 0.2, gy(z) - 0.15, z - 0.04, z + 0.04, C.rustDeep);
  }

  // decking someone laid along the girder: boards across the run, some missing
  {
    const step = 0.34;
    for (let z = F.GW1 - 0.05; z > F.GW0 - 0.55; z -= step) {
      if (ctx.noise2d(z * 2.1, 5) > 0.74) continue;      // a board gone
      const t = deckTop(z);
      const jit = ctx.noise2d(z * 3.3, 9) * 0.02;
      bx(ctx, WX0 - 0.1, WX1 + 0.1, t - 0.09 + jit, t + jit, z - step * 0.44, z + step * 0.44, ctx.noise2d(z, 3) > 0 ? C.plank : C.plankWet);
    }
    // the two bearers under them
    for (const bxx of [WX0 + 0.25, WX1 - 0.25]) {
      for (let i = 0; i < N; i++) {
        const z0 = F.GW1 + ((F.GW0 - F.GW1) * i) / N;
        const z1 = F.GW1 + ((F.GW0 - F.GW1) * (i + 1)) / N;
        bx(ctx, bxx - 0.06, bxx + 0.06, Math.min(gy(z0), gy(z1)) + 0.05, Math.max(gy(z0), gy(z1)) + 0.16, Math.min(z0, z1), Math.max(z0, z1), C.plankWet);
      }
    }
    // a fillet up onto the abutment so the last step isn't a lip
    const zEnd = F.GW0 - 0.5;
    bx(ctx, WX0 - 0.1, WX1 + 0.1, deckTop(zEnd) - 0.1, F.DECK, zEnd - 0.75, zEnd + 0.05, C.plankWet);
  }

  // THE PLANK — four heavy boards laid over the break, cleated, sagging
  {
    const zS = 2.25, zN = -3.05;
    const yS = F.DECK + 0.11, yN = deckTop(zN) + 0.06;
    const boards = 4, bw = 0.33, gap = 0.055;
    const span = boards * bw + (boards - 1) * gap;
    const bx0 = (WX0 + WX1) / 2 - span / 2;
    const yAt = (t) => yS + (yN - yS) * t - Math.sin(Math.PI * t) * 0.09;
    const STEPS = 9;
    for (let b = 0; b < boards; b++) {
      const xa = bx0 + b * (bw + gap), xb = xa + bw;
      for (let i = 0; i < STEPS; i++) {
        const t0 = i / STEPS, t1 = (i + 1) / STEPS;
        const z0 = zS + (zN - zS) * t0, z1 = zS + (zN - zS) * t1;
        const y0 = yAt(t0), y1 = yAt(t1);
        // top
        qd(ctx, C.plank, [xa, y0, z0], [xb, y0, z0], [xb, y1, z1], [xa, y1, z1]);
        // bottom
        qd(ctx, C.plankWet, [xa, y1 - 0.1, z1], [xb, y1 - 0.1, z1], [xb, y0 - 0.1, z0], [xa, y0 - 0.1, z0]);
        // sides
        qd(ctx, C.plankWet, [xb, y0 - 0.1, z0], [xb, y0, z0], [xb, y1, z1], [xb, y1 - 0.1, z1]);
        qd(ctx, C.plankWet, [xa, y1 - 0.1, z1], [xa, y1, z1], [xa, y0, z0], [xa, y0 - 0.1, z0]);
      }
      // ends
      qd(ctx, C.plankWet, [xa, yS - 0.1, zS], [xb, yS - 0.1, zS], [xb, yS, zS], [xa, yS, zS]);
      qd(ctx, C.plankWet, [xb, yN - 0.1, zN], [xa, yN - 0.1, zN], [xa, yN, zN], [xb, yN, zN]);
    }
    // cleats nailed across, and a chock at each landing
    for (const t of [0.06, 0.5, 0.94]) {
      const z = zS + (zN - zS) * t, y = yAt(t);
      bx(ctx, bx0 - 0.06, bx0 + span + 0.06, y - 0.19, y - 0.1, z - 0.07, z + 0.07, C.plankWet);
    }
    bx(ctx, bx0 - 0.1, bx0 + span + 0.1, F.DECK, yS - 0.1, zS - 0.35, zS + 0.5, C.plankWet);

    // a rope handline on rebar stanchions, all the way across
    const rail = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const z = 3.0 + (F.GW0 - 0.4 - 3.0) * t;
      const base = z > zN ? yAt(clamp((z - zS) / (zN - zS), 0, 1)) : deckTop(z);
      rail.push([WX1 + 0.16, base + 1.02 - Math.sin(Math.PI * t) * 0.13, z]);
    }
    G.polyTube(ctx, rail, 0.028, 5, [0, 1, 0], C.rope);
    for (let i = 0; i <= 14; i += 3) {
      const p0 = rail[i];
      const base = p0[2] > zN ? yAt(clamp((p0[2] - zS) / (zN - zS), 0, 1)) : deckTop(p0[2]);
      bx(ctx, p0[0] - 0.025, p0[0] + 0.025, base - 0.05, p0[1] + 0.06, p0[2] - 0.025, p0[2] + 0.025, C.rust);
    }
  }

  // a warning board wired to the parapet stub
  {
    const x = F.HW - 0.1, z = F.ABN1 + 0.4;
    bx(ctx, x - 0.5, x + 0.06, F.DECK + 0.75, F.DECK + 1.28, z - 0.03, z + 0.03, C.plank);
    bx(ctx, x - 0.05, x + 0.02, F.DECK - 0.1, F.DECK + 0.8, z - 0.03, z + 0.03, C.rust);
  }
}

// ── PART: bridge-fallen ─────────────────────────────────────────────────────
export function bridgeFallen(ctx, C, p) {
  const F = bridgeFrame(ctx);

  // the deck slabs of the far span, tipped into the water on the east half
  const slabs = [
    { z: 0.4, x: 2.4, w: 4.6, l: 4.4, tilt: 0.42, roll: 0.16, y: 0.35 },
    { z: -3.1, x: 3.6, w: 4.2, l: 4.0, tilt: -0.3, roll: -0.22, y: 0.28 },
    { z: -6.0, x: 2.0, w: 3.4, l: 3.2, tilt: 0.22, roll: 0.34, y: 0.5 },
  ];
  const frameOf = (s) => (u, v, n) => {
    const th = 0.52, hw = s.w / 2, hl = s.l / 2;
    const y = s.y + n * th + v * Math.sin(s.tilt) + u * Math.sin(s.roll);
    return [s.x + u * hw, y, s.z + v * hl * Math.cos(s.tilt)];
  };
  for (const s of slabs) {
    const P = frameOf(s);
    const a = P(-1, -1, 1), b = P(1, -1, 1), c = P(1, 1, 1), d = P(-1, 1, 1);
    const e = P(-1, -1, -1), f = P(1, -1, -1), g = P(1, 1, -1), h = P(-1, 1, -1);
    qd(ctx, C.road, a, b, c, d);
    qd(ctx, C.core, h, g, f, e);
    qd(ctx, C.core, b, f, g, c);
    qd(ctx, C.core, e, a, d, h);
    qd(ctx, C.core, d, c, g, h);
    qd(ctx, C.core, e, f, b, a);
  }
  // rebar torn out of their edges — its own pass, so the steel albedo lands once
  for (const s of slabs) {
    const P = frameOf(s);
    for (let i = 0; i < 4; i++) {
      const u = -0.8 + i * 0.55;
      G.polyTube(ctx, [P(u, 1, 0.2), P(u, 1.35, 0.2), P(u + 0.2, 1.7, -0.4)], 0.024, 5, [0, 1, 0], C.rust);
    }
  }

  // the girders that carried it, bent down off the pier and into the water
  for (let k = 0; k < 3; k++) {
    const gx = 0.9 + k * 1.55;
    const pts = [
      [gx, F.SPR - 0.35, F.PIER0 + 0.3],
      [gx + 0.1, F.SPR - 1.35, -0.6],
      [gx + 0.25, 1.15, -2.6],
      [gx + 0.35, 0.42, -4.6],
      [gx + 0.3, 0.3, -6.8],
    ];
    girder(ctx, pts, 0.4, 0.05, 0.04, C.rustDeep);
  }
  // a cross-brace still hanging between two of them
  bx(ctx, 0.9, 2.45, 1.0, 1.06, -2.5, -2.42, C.rust);
  bx(ctx, 2.45, 4.0, 0.5, 0.56, -4.4, -4.32, C.rust);

  // the far span's parapet, in pieces on the bed
  for (let i = 0; i < 5; i++) {
    const x = 0.6 + ctx.random() * 5.4;
    const z = 1.0 - ctx.random() * 8.5;
    const s = 0.45 + ctx.random() * 0.7;
    bx(ctx, x - s, x + s * 0.7, 0.08, 0.08 + 0.42 + ctx.random() * 0.3, z - 0.28, z + 0.3, C.cope);
  }

  // silt, rubble and the general mess of a demolished span
  for (let i = 0; i < 30; i++) {
    const x = ctx.randomRange(-1.5, 7.5);
    const z = ctx.randomRange(-9, 2.2);
    const s = 0.18 + ctx.random() * 0.46;
    bx(ctx, x - s, x + s * 0.85, 0.05, 0.05 + s * (0.45 + ctx.random() * 0.8), z - s, z + s * 0.8,
      ctx.random() > 0.62 ? C.stoneIn : ctx.random() > 0.4 ? C.rubble : C.silt);
  }

  // a shattered lamp standard, half in the water
  {
    const pts = [[5.6, 0.35, -1.1], [5.9, 1.6, -2.0], [6.1, 2.05, -3.2], [6.05, 1.75, -4.1]];
    G.polyTube(ctx, pts, [0.11, 0.09, 0.075, 0.06], 7, [0, 1, 0], C.rustDeep);
    bx(ctx, 5.75, 6.35, 1.6, 2.0, -4.4, -3.85, C.steel);
  }
}

// ── entry point ─────────────────────────────────────────────────────────────
export function geometry(ctx) {
  const p = ctx.params || {};
  const C = palette(ctx);
  const part = String(p.part || "quay");
  if (part === "bridge-near") bridgeNear(ctx, C, p);
  else if (part === "bridge-crossing") bridgeCrossing(ctx, C, p);
  else if (part === "bridge-fallen") bridgeFallen(ctx, C, p);
  else quay(ctx, C, p);
}
