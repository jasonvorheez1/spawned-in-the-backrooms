/**
 * fortify.js — the Frontline fortification kit. ONE generator, six parts, no CDN cook.
 *
 *   primitive: { kind: "scripted", script: "scripts/asset-library/gen-military/fortify.js",
 *                params: { part: "trench", kind: "straight", revetment: "timber", length: 8 } }
 *
 * PARTS (ctx.params.part)
 *   bunker     width 6-12, slits 1-3, damage 0-3, entrance "back"|"left"|"right"
 *   sandbags   shape "wall"|"ring"|"nest", length, courses 3-6
 *   trench     kind "straight"|"corner"|"dugout", length, revetment "timber"|"corrugated"|"wattle"
 *   traps      kind "hedgehog"|"teeth"|"wire", count, spacing
 *   barrier    kind "blast"|"hesco"|"gabion", length, height
 *   duckboard  length, curve
 *
 * LOCAL FRAME — every piece is authored for a 1.8 m soldier.
 *   +Y up. Linear runs (sandbag wall, trench, traps, barrier, duckboard) travel along +Z,
 *   centred on the origin, so a run of length L spans z = -L/2 .. +L/2.
 *   The enemy side of an asymmetric run — trench parapet, fire step — is +X.
 *   The bunker is the one facade piece: its firing slits look down +Z (structures convention:
 *   build the front at +Z, then yaw the root to aim it).
 *   y = 0 is what the player's boots touch: the bunker's interior floor, the trench's DUCKBOARD,
 *   the ground line under everything else. Nothing here needs the terrain cut to be usable —
 *   a trench dropped on flat ground is a revetted breastwork you walk into from either end.
 *
 * SURFACES are CDN albedo + tint through G.surface(), never flat vertex colour.
 * COLLISION: no collider() export — the visual mesh IS the collider. Place every piece with
 *   physics: { body: "static", collider: "mesh" }.
 */

const G = require("builtin/geom");

// ---- the CDN surfaces this kit dresses from -------------------------------
const TEX = {
  concrete: "/cdn/moodboard-realistic-gritty/texture-bunker-concrete-poured.png",
  hessian: "/cdn/moodboard-realistic-gritty/texture-sandbag-hessian.png",
  timber: "/cdn/moodboard-realistic-gritty/texture-armory-board-oak.png",
  steel: "/cdn/moodboard-realistic-gritty/texture-armory-steel-plate.png",
  iron: "/cdn/moodboard-realistic-gritty/texture-corrugated-iron-rusted.png",
  earth: "/cdn/moodboard-realistic-gritty/texture-terrain-churned-mud-albedo.png",
  clay: "/cdn/moodboard-realistic-gritty/texture-terrain-raw-clay-albedo.png",
  rubble: "/cdn/moodboard-realistic-gritty/texture-terrain-brick-rubble-albedo.png",
};

// ---- landmarks other scripts place against --------------------------------
export const SLIT_SILL_Y = 1.25; // embrasure sill above the bunker's interior floor
export const BUNKER_STEP_Y = 0.35; // the step inside, under the slit
export const TRENCH_DEPTH = 2.2; // duckboard to parapet lip
export const TRENCH_FIRE_STEP_Y = 0.8; // fire step tread above the duckboard
export const TRENCH_CLEAR_HALF = 0.95; // revetment face to centreline
export const BAG = { len: 0.52, wid: 0.3, hgt: 0.17 };

const BAG_CAP = 150; // hard bag budget — the vertex cap is 16,384 and a bag costs ~100

// ---------------------------------------------------------------- paint ----
export function palette(ctx) {
  const s = (def) => G.surface(ctx, def);
  return {
    concrete: s({ tex: TEX.concrete, r: 0.74, g: 0.73, b: 0.69, metal: 0, rough: 0.93, jitter: 0.1, freq: 6 }),
    concreteWorn: s({ tex: TEX.concrete, r: 0.58, g: 0.57, b: 0.53, metal: 0, rough: 0.97, jitter: 0.16, freq: 17 }),
    concreteWet: s({ tex: TEX.concrete, r: 0.46, g: 0.46, b: 0.45, metal: 0, rough: 0.99, jitter: 0.13, freq: 11 }),
    hessian: s({ tex: TEX.hessian, r: 0.82, g: 0.74, b: 0.58, metal: 0, rough: 0.96, jitter: 0.15, freq: 23 }),
    hessianDark: s({ tex: TEX.hessian, r: 0.55, g: 0.5, b: 0.4, metal: 0, rough: 0.98, jitter: 0.18, freq: 19 }),
    timber: s({ tex: TEX.timber, r: 0.62, g: 0.53, b: 0.4, metal: 0, rough: 0.92, jitter: 0.13, freq: 15 }),
    timberWet: s({ tex: TEX.timber, r: 0.44, g: 0.38, b: 0.3, metal: 0, rough: 0.95, jitter: 0.15, freq: 9 }),
    steel: s({ tex: TEX.steel, r: 0.55, g: 0.5, b: 0.45, metal: 0.72, rough: 0.62, jitter: 0.12, freq: 13 }),
    rust: s({ tex: TEX.iron, r: 0.6, g: 0.44, b: 0.32, metal: 0.45, rough: 0.85, jitter: 0.17, freq: 12 }),
    rustDark: s({ tex: TEX.iron, r: 0.42, g: 0.31, b: 0.24, metal: 0.5, rough: 0.88, jitter: 0.18, freq: 21 }),
    earth: s({ tex: TEX.earth, r: 0.66, g: 0.58, b: 0.46, metal: 0, rough: 0.99, jitter: 0.16, freq: 5 }),
    earthWet: s({ tex: TEX.earth, r: 0.44, g: 0.38, b: 0.31, metal: 0, rough: 1, jitter: 0.18, freq: 8 }),
    clay: s({ tex: TEX.clay, r: 0.68, g: 0.56, b: 0.44, metal: 0, rough: 0.98, jitter: 0.15, freq: 7 }),
    rubble: s({ tex: TEX.rubble, r: 0.66, g: 0.6, b: 0.53, metal: 0, rough: 0.97, jitter: 0.18, freq: 14 }),
  };
}

// ------------------------------------------------------------- geometry ----
// Cheap 6-quad box for the pieces that repeat in the hundreds (slats, planks,
// rubble). Winding is CCW from outside on every face.
export function bx(ctx, x0, x1, y0, y1, z0, z1, paint) {
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const za = Math.min(z0, z1), zb = Math.max(z0, z1);
  const q = (ax, ay, az, bx2, by, bz, cx, cy, cz, dx, dy, dz) => {
    if (paint) paint((ax + bx2 + cx + dx) * 0.25, (ay + by + cy + dy) * 0.25, (az + bz + cz + dz) * 0.25);
    ctx.quad(ax, ay, az, bx2, by, bz, cx, cy, cz, dx, dy, dz);
  };
  q(xa, ya, zb, xb, ya, zb, xb, yb, zb, xa, yb, zb); // +Z
  q(xb, ya, za, xa, ya, za, xa, yb, za, xb, yb, za); // -Z
  q(xb, ya, zb, xb, ya, za, xb, yb, za, xb, yb, zb); // +X
  q(xa, ya, za, xa, ya, zb, xa, yb, zb, xa, yb, za); // -X
  q(xa, yb, zb, xb, yb, zb, xb, yb, za, xa, yb, za); // +Y
  q(xa, ya, za, xb, ya, za, xb, ya, zb, xa, ya, zb); // -Y
}

// Rectangular cross-section, 4 points, CCW in (u, v).
export function rect4(w, h, cu, cv) {
  const u0 = (cu || 0) - w / 2, u1 = (cu || 0) + w / 2;
  const v0 = (cv || 0) - h / 2, v1 = (cv || 0) + h / 2;
  return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
}

// A beam between two points, any orientation, rectangular section.
export function beam(ctx, a, b, w, h, paint, bevel) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  const f = [d[0] / len, d[1] / len, d[2] / len];
  const up = Math.abs(f[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
  const poly = bevel ? G.rrect(w, h, 0, 0, bevel) : rect4(w, h, 0, 0);
  G.loftFrames(ctx, [{ c: a, f, up, poly }, { c: b, f, up, poly }], paint);
}

// A vertical member whose section stays square to the run it belongs to — a
// revetment board, a post, a picket. upHint is the run direction, so boards on
// a traverse turn with the wall instead of staying locked to world X/Z.
export function upright(ctx, c, y0, y1, across, along, upHint, paint) {
  const poly = rect4(across, along, 0, 0);
  G.loftFrames(ctx, [
    { c: [c[0], y0, c[2]], f: [0, 1, 0], up: upHint, poly },
    { c: [c[0], y1, c[2]], f: [0, 1, 0], up: upHint, poly },
  ], paint);
}

// One sandbag: a squat pillow lofted along its own long axis, slumped and
// scaled so no two in a course read the same.
export function bagAt(ctx, cx, by, cz, yaw, paint, scale) {
  const k = scale || 1;
  const L = BAG.len * k * (0.88 + ctx.random() * 0.24);
  const W = BAG.wid * k * (0.9 + ctx.random() * 0.24);
  const H = BAG.hgt * k * (0.82 + ctx.random() * 0.32);
  const a = yaw + ctx.randomRange(-0.14, 0.14);
  const f = [Math.cos(a), 0, Math.sin(a)];
  const cy = by + H * 0.5;
  const sag = ctx.randomRange(-0.012, 0.012);
  const ring = (t, s) => ({
    c: [cx + f[0] * t * L, cy + (t === 0 ? sag : 0), cz + f[2] * t * L],
    f,
    up: [0, 1, 0],
    poly: G.oval(W * s, H * s, 0, 0, 8, 0.62),
  });
  G.loftFrames(ctx, [ring(-0.5, 0.44), ring(0, 1), ring(0.5, 0.44)], paint);
  return H * 0.93; // stacked course height — bags compress under the one above
}

// Stations along a 2D path ([x, z] pairs) with averaged tangents, so a lofted
// bank mitres cleanly through a traverse instead of pinching.
export function stations(path, step) {
  const pts = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / step));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      pts.push([a[0] + dx * t, a[1] + dz * t]);
    }
  }
  pts.push(path[path.length - 1]);
  const out = [];
  let run = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)];
    let fx = q[0] - p[0], fz = q[1] - p[1];
    const fl = Math.hypot(fx, fz) || 1;
    fx /= fl; fz /= fl;
    if (i > 0) run += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    out.push({ c: [pts[i][0], 0, pts[i][1]], f: [fx, 0, fz], u: [fz, 0, -fx], run });
  }
  // u = cross(up, f) — the loft's own lateral axis, so features placed with it
  // land on the same side the section polys do.
  return out;
}

export function atStation(st, lateral, y) {
  return [st.c[0] + st.u[0] * lateral, y, st.c[2] + st.u[2] * lateral];
}

// Lowest ground under a footprint, in local metres relative to the feet anchor.
export function lowGround(ctx, xs, zs) {
  let low = 0;
  for (const x of xs) for (const z of zs) low = Math.min(low, ctx.groundY(x, z));
  return low;
}

// =========================================================== 1. BUNKER =====
export function bunker(ctx, P, p) {
  const W = clamp(num(p.width, 8), 6, 12);
  const D = clamp(num(p.depth, W * 0.68), 4.2, 8);
  const slits = Math.round(clamp(num(p.slits, 2), 1, 3));
  const dmg = Math.round(clamp(num(p.damage, 1), 0, 3));
  const entrance = String(p.entrance || "back");
  const T = 0.55; // wall thickness
  const CEIL = 2.4, ROOF = 3.0;
  const hx = W / 2, hz = D / 2;
  const ix = hx - T, iz = hz - T; // interior half-extents
  const low = lowGround(ctx, [-hx, 0, hx], [-hz, 0, hz]);

  // Foundation apron — buried, so a slope can never open daylight under a wall.
  bx(ctx, -hx - 0.25, hx + 0.25, low - 1.6, -0.02, -hz - 0.25, hz + 0.25, P.concreteWet);
  bx(ctx, -ix, ix, -0.05, 0.02, -iz, iz, P.concreteWorn); // interior floor

  // --- front wall (+Z) with splayed embrasures ---
  // Outside aperture is narrow, inside wide: a real gunner's field of fire, and
  // you can see clean through the slit from either side.
  const apOut = Math.min(1.25, (W - 2 * T) / (slits * 1.9));
  const apIn = apOut * 1.45;
  const centres = [];
  for (let i = 0; i < slits; i++) centres.push(slits === 1 ? 0 : -((slits - 1) / 2) * (apOut * 2.1) + i * (apOut * 2.1));
  const zOut = hz, zIn = hz - T;
  const sillOut = SLIT_SILL_Y, sillIn = SLIT_SILL_Y - 0.12;
  const headOut = SLIT_SILL_Y + 0.5, headIn = SLIT_SILL_Y + 0.72;
  const band = (w, cu, y0o, y1o, y0i, y1i, paint) => {
    G.loftSections(ctx, [
      { z: zIn, poly: G.rrect(w, Math.max(0.02, y1i - y0i), cu, (y0i + y1i) / 2, 0.015) },
      { z: zOut, poly: G.rrect(w, Math.max(0.02, y1o - y0o), cu, (y0o + y1o) / 2, 0.015) },
    ], paint);
  };
  // sill course and lintel course spanning the slit belt, piers between slits
  const beltL = centres[0] - apIn / 2, beltR = centres[centres.length - 1] + apIn / 2;
  const blown = dmg >= 3; // the front-left corner takes it
  const wallTop = CEIL;
  band(beltR - beltL, (beltL + beltR) / 2, 0, sillOut, 0, sillIn, P.concrete);
  band(beltR - beltL, (beltL + beltR) / 2, headOut, wallTop, headIn, wallTop, P.concrete);
  for (let i = 0; i <= slits; i++) {
    const l = i === 0 ? -hx : centres[i - 1] + apOut / 2;
    const r = i === slits ? hx : centres[i] - apOut / 2;
    const li = i === 0 ? -hx : centres[i - 1] + apIn / 2;
    const ri = i === slits ? hx : centres[i] - apIn / 2;
    if (r - l < 0.05) continue;
    const brokenPier = blown && i === 0;
    const top = brokenPier ? 1.15 : wallTop;
    G.loftSections(ctx, [
      { z: zIn, poly: G.rrect(Math.max(0.05, ri - li), top, (li + ri) / 2, top / 2, 0.015) },
      { z: zOut, poly: G.rrect(Math.max(0.05, r - l), top, (l + r) / 2, top / 2, 0.015) },
    ], P.concrete);
    if (brokenPier) jagged(ctx, P, l, r, top, hz - T, hz, 0.5);
  }

  // --- side and back walls, as segment runs so damage can eat one ---
  const sideSegs = 4;
  for (const side of [-1, 1]) {
    for (let i = 0; i < sideSegs; i++) {
      const z0 = -hz + (i / sideSegs) * D, z1 = -hz + ((i + 1) / sideSegs) * D;
      let top = CEIL;
      const doorSide = (entrance === "left" && side < 0) || (entrance === "right" && side > 0);
      const doorway = doorSide && i === Math.floor(sideSegs / 2);
      if (blown && side < 0 && i === sideSegs - 1) top = 1.45;
      if (doorway) {
        bx(ctx, side * ix, side * hx, 2.05, top, z0, z1, P.concrete); // lintel
      } else {
        bx(ctx, side * ix, side * hx, -0.05, top, z0, z1, P.concrete);
      }
      if (blown && side < 0 && i === sideSegs - 1) jagged(ctx, P, z0, z1, top, side * hx, side * ix, 0.55, true);
    }
  }
  const backSegs = 3;
  for (let i = 0; i < backSegs; i++) {
    const x0 = -hx + (i / backSegs) * W, x1 = -hx + ((i + 1) / backSegs) * W;
    const doorway = entrance === "back" && i === 1;
    if (doorway) {
      const dw = 1.05;
      bx(ctx, x0, -dw / 2, -0.05, CEIL, -hz, -iz, P.concrete);
      bx(ctx, dw / 2, x1, -0.05, CEIL, -hz, -iz, P.concrete);
      bx(ctx, -dw / 2, dw / 2, 2.05, CEIL, -hz, -iz, P.concrete);
    } else {
      bx(ctx, x0, x1, -0.05, CEIL, -hz, -iz, P.concrete);
    }
  }

  // --- roof: overhanging slab, split so damage can take a corner ---
  const rx = hx + 0.35, rz = hz + 0.35;
  if (blown) {
    bx(ctx, -rx + 2.1, rx, CEIL, ROOF, -rz, rz, P.concrete);
    bx(ctx, -rx, -rx + 2.1, CEIL, ROOF, -rz, rz - 2.4, P.concrete);
    jagged(ctx, P, -rz, rz - 2.4, ROOF, -rx + 2.1, -rx + 2.35, 0.35);
  } else {
    bx(ctx, -rx, rx, CEIL, ROOF, -rz, rz, P.concrete);
  }
  bx(ctx, -rx, rx, ROOF - 0.06, ROOF + 0.05, rz - 0.18, rz, P.concreteWorn); // drip lip

  // --- the step inside, under the slits ---
  bx(ctx, -ix + 0.15, ix - 0.15, 0, BUNKER_STEP_Y, iz - 0.7, iz, P.concreteWorn);
  bx(ctx, -ix + 0.15, ix - 0.15, BUNKER_STEP_Y - 0.05, BUNKER_STEP_Y, iz - 0.72, iz - 0.66, P.timberWet); // worn nosing

  // --- sandbags along the roof edge ---
  let bags = 0;
  const bagRow = (x0, x1, z, yaw) => {
    const n = Math.floor(Math.abs(x1 - x0) / (BAG.len * 0.96));
    for (let c = 0; c < 2; c++) {
      let y = ROOF + c * BAG.hgt * 0.93;
      for (let i = 0; i < n && bags < BAG_CAP; i++) {
        const t = (i + 0.5 + (c % 2) * 0.5) / n;
        const x = x0 + (x1 - x0) * t;
        bagAt(ctx, x, y + ctx.randomRange(-0.01, 0.01), z + ctx.randomRange(-0.04, 0.04),
          yaw, c % 2 ? P.hessianDark : P.hessian);
        bags++;
      }
    }
  };
  bagRow(-rx + 0.3, rx - 0.3, rz - 0.28, 0);
  bagRow(-rx + 0.3, rx - 0.3, -rz + 0.28, 0);

  // --- damage ---
  if (dmg >= 1) {
    for (let i = 0; i < 14; i++) {
      const s = ctx.randomRange(0.18, 0.5);
      const x = ctx.randomRange(-rx, rx), z = ctx.random() < 0.6 ? hz + ctx.randomRange(0.2, 1.9) : -hz - ctx.randomRange(0.2, 1.5);
      const y = ctx.groundY(x, z);
      bx(ctx, x - s / 2, x + s / 2, y, y + s * ctx.randomRange(0.4, 0.9), z - s / 2, z + s / 2, i % 3 ? P.rubble : P.concreteWorn);
    }
    // chipped arris — proud enough (>8 cm) never to z-fight the wall face
    for (let i = 0; i < 8; i++) {
      const y = ctx.randomRange(0.5, CEIL - 0.3);
      const x = ctx.random() < 0.5 ? -hx : hx;
      bx(ctx, x - 0.1, x + 0.1, y, y + ctx.randomRange(0.15, 0.4), ctx.randomRange(-hz, hz), 0, P.concreteWet);
    }
  }
  if (dmg >= 2) {
    for (let i = 0; i < 9; i++) {
      const x = -hx + 0.4 + i * 0.22;
      const a = [x, CEIL + 0.1, hz - 0.2 + ctx.randomRange(-0.1, 0.1)];
      const b = [x + ctx.randomRange(-0.25, 0.25), ROOF + ctx.randomRange(0.05, 0.5), hz + ctx.randomRange(0.1, 0.7)];
      G.tube(ctx, a, b, 0.014, 0.012, 5, [0, 1, 0], P.rustDark);
    }
  }
  if (dmg >= 3) {
    for (let i = 0; i < 7; i++) {
      const z = hz - 0.4 + ctx.randomRange(-0.3, 0.3);
      G.tube(ctx, [-hx + 0.2, 1.15, z], [-hx + ctx.randomRange(0.1, 1.4), 1.15 + ctx.randomRange(0.4, 1.2), z + ctx.randomRange(-0.4, 0.5)], 0.016, 0.013, 5, [0, 1, 0], P.rustDark);
    }
    for (let i = 0; i < 16; i++) {
      const x = -hx - ctx.randomRange(0, 3), z = hz + ctx.randomRange(-0.5, 2.6);
      const s = ctx.randomRange(0.25, 0.85);
      const y = ctx.groundY(x, z);
      bx(ctx, x, x + s, y, y + s * ctx.randomRange(0.35, 0.8), z, z + s * ctx.randomRange(0.5, 1), i % 2 ? P.concreteWorn : P.rubble);
    }
  }
}

// A broken concrete edge: a row of stubs of random height along a break line.
export function jagged(ctx, P, a0, a1, top, b0, b1, drop, alongZ) {
  const n = Math.max(3, Math.round(Math.abs(a1 - a0) / 0.28));
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    const h = top + ctx.randomRange(-drop, drop * 0.35);
    if (alongZ) bx(ctx, Math.min(b0, b1), Math.max(b0, b1), h - 0.35, h, Math.min(t0, t1), Math.max(t0, t1), P.concreteWorn);
    else bx(ctx, Math.min(t0, t1), Math.max(t0, t1), h - 0.35, h, Math.min(b0, b1), Math.max(b0, b1), P.concreteWorn);
  }
}

// ========================================================= 2. SANDBAGS =====
export function sandbags(ctx, P, p) {
  const shape = String(p.shape || "wall");
  const courses = Math.round(clamp(num(p.courses, num(p.height, 5)), 3, 6));
  const length = clamp(num(p.length, 6), 1.5, 14);
  let bags = 0;
  const put = (x, y, z, yaw, c) => {
    if (bags >= BAG_CAP) return 0;
    bags++;
    return bagAt(ctx, x, y + ctx.groundY(x, z), z, yaw, c % 2 ? P.hessian : P.hessianDark);
  };

  if (shape === "ring" || shape === "nest") {
    const R = shape === "ring" ? Math.max(1.3, length / 2) : Math.max(1.5, length / 2);
    const open = shape === "ring" ? 1.05 : 1.9; // radians of gap, facing +Z (the fire bay)
    const span = Math.PI * 2 - open;
    for (let c = 0; c < courses; c++) {
      const rr = R - c * 0.035;
      const n = Math.max(6, Math.round((span * rr) / (BAG.len * 0.92)));
      const phase = (c % 2) * 0.5;
      for (let i = 0; i < n; i++) {
        const a = open / 2 + (span * (i + 0.5 + phase)) / n + Math.PI / 2;
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        put(x, c * BAG.hgt * 0.93, z, a + Math.PI / 2, c + i);
      }
    }
    if (shape === "nest") {
      // a low front lip across the fire bay, two courses, with the gun's gap
      for (let c = 0; c < 2; c++) {
        for (const side of [-1, 1]) {
          const n = 3;
          for (let i = 0; i < n; i++) {
            const x = side * (0.55 + i * BAG.len * 0.95);
            put(x, c * BAG.hgt * 0.93, R - 0.12, 0, c + i);
          }
        }
      }
      // ammo shelf: a stack of three inside the back of the nest
      for (let i = 0; i < 3; i++) put(ctx.randomRange(-0.3, 0.3), i * BAG.hgt * 0.93, -R + 0.55, Math.PI / 2, i);
    }
    return;
  }

  // wall — running bond along +Z, stretcher courses two bags thick, header
  // courses laid across to tie them, each course battered back a little.
  for (let c = 0; c < courses; c++) {
    const y = c * BAG.hgt * 0.93;
    const batter = c * 0.035;
    if (c % 2 === 0) {
      const n = Math.max(2, Math.round(length / (BAG.len * 0.97)));
      for (let i = 0; i < n; i++) {
        const z = -length / 2 + (length * (i + 0.5)) / n;
        put(-BAG.wid / 2 + batter, y, z, Math.PI / 2, c + i);
        put(BAG.wid / 2 - batter, y, z, Math.PI / 2, c + i + 1);
      }
    } else {
      const n = Math.max(2, Math.round(length / (BAG.wid * 1.12)));
      for (let i = 0; i < n; i++) {
        const z = -length / 2 + (length * (i + 0.5)) / n;
        put(ctx.randomRange(-0.03, 0.03), y, z, 0, c + i);
      }
    }
  }
}

// =========================================================== 3. TRENCH =====
export function trench(ctx, P, p) {
  const kind = String(p.kind || "straight");
  const revet = String(p.revetment || "timber");
  const L = clamp(num(p.length, kind === "corner" ? 11 : 9), 4, 18);
  const H = clamp(num(p.depth, TRENCH_DEPTH), 1.8, 3);
  const CH = TRENCH_CLEAR_HALF; // revetment face
  const BANK = CH + 0.1; // earth face behind the boards
  const path = kind === "corner"
    ? [[0, -L / 2], [0, -L * 0.12], [2.3, L * 0.1], [2.3, L / 2]]
    : [[0, -L / 2], [0, L / 2]];
  const sts = stations(path, 0.55);

  // --- the two earth banks, one continuous loft each (parapet +X, parados -X)
  for (const side of [1, -1]) {
    const crest = side > 0 ? H + 0.42 : H + 0.24;
    const frames = sts.map((st, i) => {
      const jitter = ctx.noise2d(st.c[0] * 0.6 + side * 9, st.c[2] * 0.6) * 0.16;
      const gy = Math.min(-0.1, ctx.groundY(st.c[0] + st.u[0] * side * 3.1, st.c[2] + st.u[2] * side * 3.1));
      const s = side;
      return {
        c: st.c,
        f: st.f,
        up: [0, 1, 0],
        poly: [
          [s * BANK, -0.62],
          [s * 3.2, gy - 0.5],
          [s * 3.2, gy + 0.06],
          [s * (2.05 + jitter * 2), crest - 0.16 + jitter],
          [s * (BANK + 0.28), crest + jitter * 0.6],
          [s * BANK, H],
        ].map((q) => (s > 0 ? q : [q[0], q[1]])),
      };
    });
    // For the -X bank the point order must reverse to stay CCW in (u, v).
    const fixed = side > 0 ? frames : frames.map((f) => Object.assign({}, f, { poly: f.poly.slice().reverse() }));
    if (kind === "dugout" && side < 0) {
      const cut = sts.length;
      const a = fixed.slice(0, Math.max(2, Math.floor(cut * 0.34)));
      const b = fixed.slice(Math.min(cut - 2, Math.floor(cut * 0.66)));
      G.loftFrames(ctx, a, P.earth);
      G.loftFrames(ctx, b, P.earth);
    } else {
      G.loftFrames(ctx, fixed, side > 0 ? P.earth : P.earthWet);
    }
  }

  // --- floor slab under the boards (wide, buried under both banks)
  G.loftFrames(ctx, sts.map((st) => ({
    c: st.c, f: st.f, up: [0, 1, 0], poly: rect4(3.4, 0.34, 0, -0.27),
  })), P.earthWet);

  // --- revetment, fire step, duckboards, spoil
  revetment(ctx, P, sts, revet, H, CH, kind);
  fireStep(ctx, P, sts, CH, revet);
  duckboardRun(ctx, P, sts, -0.9, 0.3, 0.3);
  spoil(ctx, P, sts, H);

  if (kind === "dugout") dugout(ctx, P, sts, H, CH);
}

export function revetment(ctx, P, sts, style, H, CH, kind) {
  const total = sts[sts.length - 1].run;
  for (const side of [1, -1]) {
    if (kind === "dugout" && side < 0) continue; // the shelter takes that wall
    if (style === "corrugated") {
      // vertical corrugations: a thin sheet, both windings, so it reads from
      // inside the trench and through the gaps behind the boards alike
      const pitch = 0.17;
      for (let i = 0; i < sts.length - 1; i++) {
        const a = sts[i], b = sts[i + 1];
        const segLen = b.run - a.run;
        const n = Math.max(1, Math.round(segLen / pitch));
        for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n;
          const w0 = (k % 2 ? 0.05 : -0.02) * side, w1 = ((k + 1) % 2 ? 0.05 : -0.02) * side;
          const p0 = lerpSt(a, b, t0), p1 = lerpSt(a, b, t1);
          const A0 = atStation(p0, side * CH + w0, 0), A1 = atStation(p1, side * CH + w1, 0);
          const paint = P.rust;
          paint(A0[0], H / 2, A0[2]);
          ctx.quad(A0[0], -0.12, A0[2], A1[0], -0.12, A1[2], A1[0], H, A1[2], A0[0], H, A0[2]);
          paint(A0[0], H / 2, A0[2]);
          ctx.quad(A0[0], H, A0[2], A1[0], H, A1[2], A1[0], -0.12, A1[2], A0[0], -0.12, A0[2]);
        }
      }
      // angle-iron pickets holding the sheets
      for (let d = 0.6; d < total; d += 1.5) {
        const st = stationAt(sts, d);
        upright(ctx, atStation(st, side * (CH - 0.04), 0), -0.15, H + 0.06, 0.1, 0.1, st.f, P.rustDark);
      }
    } else if (style === "wattle") {
      for (let d = 0.4; d < total; d += 0.85) {
        const st = stationAt(sts, d);
        upright(ctx, atStation(st, side * (CH - 0.02), 0), -0.2, H + 0.12, 0.09, 0.09, st.f, P.timberWet);
      }
      for (let r = 0; r < Math.floor(H / 0.24); r++) {
        const y = 0.05 + r * 0.24;
        const pts = [];
        for (let d = 0; d <= total; d += 0.42) {
          const st = stationAt(sts, d);
          const weave = Math.sin(d / 0.85 * Math.PI + (r % 2) * Math.PI) * 0.055;
          pts.push(atStation(st, side * (CH + weave), y));
        }
        G.polyTube(ctx, pts, 0.035, 5, [0, 1, 0], r % 2 ? P.timber : P.timberWet);
      }
    } else {
      // timber: butted vertical boards, two wales, posts every 1.7 m
      const pitch = 0.26;
      for (let d = 0.02; d < total; d += pitch) {
        const st = stationAt(sts, d);
        upright(ctx, atStation(st, side * (CH + 0.03), 0), -0.15, H + ctx.randomRange(-0.06, 0.06), 0.055, pitch * 0.92, st.f, ctx.random() < 0.3 ? P.timberWet : P.timber);
      }
      for (const wy of [0.62, 1.62]) {
        G.loftFrames(ctx, sts.map((st) => ({ c: atStation(st, side * (CH + 0.09), wy), f: st.f, up: [0, 1, 0], poly: rect4(0.09, 0.15, 0, 0) })), P.timberWet);
      }
      for (let d = 0.5; d < total; d += 1.7) {
        const st = stationAt(sts, d);
        upright(ctx, atStation(st, side * (CH - 0.05), 0), -0.2, H + 0.1, 0.13, 0.13, st.f, P.timber);
      }
    }
  }
}

export function fireStep(ctx, P, sts, CH, style) {
  const total = sts[sts.length - 1].run;
  const FS = TRENCH_FIRE_STEP_Y;
  // packed earth core, faced with a riser board and capped with a timber tread:
  // step up 0.8 m and the parapet lip is chest height instead of over your head.
  G.loftFrames(ctx, sts.map((st) => ({ c: st.c, f: st.f, up: [0, 1, 0], poly: rect4(0.53, FS - 0.12, CH - 0.265, (FS - 0.12) / 2) })), P.earthWet);
  G.loftFrames(ctx, sts.map((st) => ({ c: st.c, f: st.f, up: [0, 1, 0], poly: rect4(0.06, FS - 0.08, CH - 0.56, (FS - 0.08) / 2) })), P.timberWet);
  G.loftFrames(ctx, sts.map((st) => ({ c: st.c, f: st.f, up: [0, 1, 0], poly: rect4(0.63, 0.12, CH - 0.3, FS - 0.06) })), P.timber);
  for (let d = 0.35; d < total; d += 1.35) {
    const st = stationAt(sts, d);
    upright(ctx, atStation(st, CH - 0.6, 0), -0.1, FS - 0.06, 0.09, 0.12, st.f, P.timberWet);
  }
}

export function duckboardRun(ctx, P, sts, from, to, pitch) {
  const total = sts[sts.length - 1].run;
  const mid = (from + to) / 2;
  // two bearers under the slats
  for (const off of [from + 0.18, to - 0.18]) {
    G.loftFrames(ctx, sts.map((st) => ({ c: st.c, f: st.f, up: [0, 1, 0], poly: rect4(0.11, 0.09, off, -0.095) })), P.timberWet);
  }
  const w = to - from;
  for (let d = 0.05; d < total; d += pitch) {
    const st = stationAt(sts, d);
    const a = atStation(st, from + 0.02, 0), b = atStation(st, to - 0.02, 0);
    const drop = ctx.random() < 0.08 ? ctx.randomRange(0.01, 0.04) : 0; // a slat sunk in the mud
    const yaw = ctx.randomRange(-0.02, 0.02);
    const cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2;
    const ux = st.u[0], uz = st.u[2];
    const half = w / 2;
    const dx = ux * half * Math.cos(yaw) - uz * half * Math.sin(yaw);
    const dz = uz * half * Math.cos(yaw) + ux * half * Math.sin(yaw);
    beam(ctx, [cx - dx, -0.026 - drop, cz - dz], [cx + dx, -0.026 - drop, cz + dz], 0.17, 0.052, ctx.random() < 0.25 ? P.timberWet : P.timber);
  }
}

export function spoil(ctx, P, sts, H) {
  const total = sts[sts.length - 1].run;
  for (let i = 0; i < 26; i++) {
    const d = ctx.randomRange(0, total);
    const st = stationAt(sts, d);
    const side = ctx.random() < 0.65 ? 1 : -1;
    const lat = side * ctx.randomRange(1.3, 2.8);
    const c = atStation(st, lat, H + ctx.randomRange(0.18, 0.45));
    const s = ctx.randomRange(0.16, 0.42);
    G.loftFrames(ctx, [
      { c: [c[0], c[1] - s * 0.5, c[2]], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(s * 1.5, s * 1.5, 0, 0, 5, 0.8) },
      { c: [c[0] + ctx.randomRange(-0.05, 0.05), c[1] + s * 0.35, c[2]], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(s * 0.6, s * 0.6, 0, 0, 5, 0.8) },
    ], i % 3 ? P.earth : P.clay);
  }
}

// A covered shelter cut into the parados side, mid-run.
export function dugout(ctx, P, sts, H, CH) {
  const st = stationAt(sts, sts[sts.length - 1].run * 0.5);
  const u = st.u, f = st.f;
  const pt = (lat, along, y) => [st.c[0] + u[0] * lat + f[0] * along, y, st.c[2] + u[2] * lat + f[2] * along];
  const W = 1.35, DEP = 2.5, HGT = 1.95;
  // frame: two door posts, a lintel, and roof beams running back into the bank
  beam(ctx, pt(-CH, -W, -0.1), pt(-CH, -W, HGT), 0.16, 0.16, P.timber);
  beam(ctx, pt(-CH, W, -0.1), pt(-CH, W, HGT), 0.16, 0.16, P.timber);
  beam(ctx, pt(-CH, -W - 0.1, HGT), pt(-CH, W + 0.1, HGT), 0.2, 0.22, P.timber);
  for (let i = 0; i <= 5; i++) {
    const along = -W + (2 * W * i) / 5;
    beam(ctx, pt(-CH, along, HGT + 0.05), pt(-CH - DEP - 0.3, along, HGT + 0.05), 0.14, 0.16, P.timberWet);
  }
  // walls and floor of the room
  for (const s of [-1, 1]) beam(ctx, pt(-CH, s * W, HGT * 0.5), pt(-CH - DEP, s * W, HGT * 0.5), 0.12, HGT, P.timberWet);
  const into = [-u[0], 0, -u[2]]; // frames must travel mouth → back or the loft inverts
  G.loftFrames(ctx, [
    { c: pt(-CH, 0, HGT / 2), f: into, up: [0, 1, 0], poly: rect4(2 * W + 0.5, 0.28, 0, HGT / 2 + 0.28) },
    { c: pt(-CH - DEP - 0.5, 0, HGT / 2), f: into, up: [0, 1, 0], poly: rect4(2 * W + 0.5, 0.28, 0, HGT / 2 + 0.28) },
  ], P.earth); // earth cap over the roof beams
  beam(ctx, pt(-CH - 0.1, 0, -0.09), pt(-CH - DEP, 0, -0.09), 2 * W - 0.1, 0.1, P.timber); // plank floor
  beam(ctx, pt(-CH - DEP, -W + 0.1, HGT / 2), pt(-CH - DEP, W - 0.1, HGT / 2), 0.12, HGT, P.timberWet); // back wall
  // a bunk and a sandbag blast wall at the mouth
  beam(ctx, pt(-CH - 0.6, W - 0.45, 0.55), pt(-CH - DEP + 0.25, W - 0.45, 0.55), 0.72, 0.1, P.timber);
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < 3; i++) {
      const q = pt(-CH + 0.42, -W - 0.2 - i * BAG.len * 0.95, c * BAG.hgt * 0.93);
      bagAt(ctx, q[0], q[1], q[2], Math.atan2(f[2], f[0]), c % 2 ? P.hessian : P.hessianDark);
    }
  }
}

// ============================================================ 4. TRAPS =====
export function traps(ctx, P, p) {
  const kind = String(p.kind || "hedgehog");
  const count = Math.round(clamp(num(p.count, kind === "teeth" ? 12 : 5), 1, 30));
  const spacing = clamp(num(p.spacing, kind === "teeth" ? 1.6 : 3), 0.8, 8);

  if (kind === "teeth") {
    // dragon's teeth: truncated concrete pyramids on a poured raft, in rows
    const rows = 3, per = Math.max(1, Math.ceil(count / rows));
    const span = (per - 1) * spacing;
    const gy0 = lowGround(ctx, [-1.2, 1.2 + rows * 1.5], [-span / 2 - 1, span / 2 + 1]);
    bx(ctx, -1.3, 1.3 + (rows - 1) * 1.45, gy0 - 0.55, gy0 + 0.12, -span / 2 - 0.9, span / 2 + 0.9, P.concreteWet);
    let made = 0;
    for (let r = 0; r < rows && made < count; r++) {
      const x = r * 1.45;
      const h = 0.95 + r * 0.22;
      for (let i = 0; i < per && made < count; i++) {
        const z = -span / 2 + i * spacing + (r % 2 ? spacing * 0.5 : 0);
        const gy = ctx.groundY(x, z);
        const b = 0.92, t = 0.34;
        const chip = ctx.random() < 0.25;
        G.loftFrames(ctx, [
          { c: [x, gy + 0.06, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(b, b, 0, 0, 0.02) },
          { c: [x, gy + h * 0.55, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(b * 0.66, b * 0.66, 0, 0, 0.02) },
          { c: [x + (chip ? 0.05 : 0), gy + h * (chip ? 0.82 : 1), z], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(t, t, 0, 0, 0.015) },
        ], chip ? P.concreteWorn : P.concrete);
        if (chip) {
          for (let k = 0; k < 3; k++) {
            const s = ctx.randomRange(0.1, 0.25);
            bx(ctx, x + ctx.randomRange(-0.7, 0.7), x + s, gy + 0.1, gy + 0.1 + s, z + ctx.randomRange(-0.7, 0.7), z + s, P.rubble);
          }
        }
        made++;
      }
    }
    return;
  }

  if (kind === "wire") {
    // concertina on screw pickets, plus the ground wires that keep it staked
    const run = (count - 1) * spacing;
    for (let i = 0; i < count; i++) {
      const z = -run / 2 + i * spacing;
      const gy = ctx.groundY(0, z);
      beam(ctx, [0, gy - 0.35, z], [ctx.randomRange(-0.06, 0.06), gy + 1.15, z], 0.05, 0.05, P.rustDark);
      G.polyTube(ctx, [
        [0, gy + 1.15, z], [0.06, gy + 1.22, z + 0.05], [0, gy + 1.24, z + 0.11], [-0.06, gy + 1.19, z + 0.06],
      ], 0.018, 4, [0, 1, 0], P.rustDark); // the picket's eye
    }
    const coil = (radius, yBase, turns) => {
      const pts = [];
      const steps = Math.max(8, Math.round(turns * 6));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = t * turns * Math.PI * 2;
        const z = -run / 2 + t * run;
        const gy = ctx.groundY(Math.cos(a) * radius, z);
        pts.push([Math.cos(a) * radius, gy + yBase + Math.sin(a) * radius, z]);
      }
      G.polyTube(ctx, pts, 0.016, 4, [0, 1, 0], P.rustDark);
    };
    coil(0.46, 0.52, Math.max(4, run / 0.6));
    coil(0.3, 1.05, Math.max(3, run / 0.9));
    for (let i = 0; i < count - 1; i++) {
      const z0 = -run / 2 + i * spacing, z1 = z0 + spacing;
      const g0 = ctx.groundY(0, z0), g1 = ctx.groundY(0, z1);
      G.polyTube(ctx, [[0.5, g0 + 0.08, z0], [0.2, g0 + 0.5, (z0 + z1) / 2], [-0.5, g1 + 0.08, z1]], 0.012, 4, [0, 1, 0], P.rust);
    }
    return;
  }

  // czech hedgehog: three lengths of rail welded through one gusset
  const run = (count - 1) * spacing;
  for (let i = 0; i < count; i++) {
    const z = -run / 2 + i * spacing + ctx.randomRange(-0.35, 0.35);
    const x = ctx.randomRange(-0.7, 0.7);
    const gy = ctx.groundY(x, z);
    const yaw = ctx.randomRange(0, Math.PI);
    const cy = gy + 0.78;
    const b1 = [Math.cos(yaw), 0.9, Math.sin(yaw)];
    const n1 = norm3(b1);
    const b2 = norm3([-Math.sin(yaw), 0.34, Math.cos(yaw)]);
    const a2 = norm3(sub3(b2, scale3(n1, dot3(b2, n1))));
    const a3 = cross3(n1, a2);
    const arm = 0.85;
    for (const ax of [n1, a2, a3]) {
      const A = [x - ax[0] * arm, cy - ax[1] * arm, z - ax[2] * arm];
      const B = [x + ax[0] * arm, cy + ax[1] * arm, z + ax[2] * arm];
      beam(ctx, A, B, 0.11, 0.15, P.rust, 0.008);
      // rail web plates, so it reads as girder and not a stick
      beam(ctx, [A[0] * 0.6 + x * 0.4, A[1] * 0.6 + cy * 0.4, A[2] * 0.6 + z * 0.4], [B[0] * 0.6 + x * 0.4, B[1] * 0.6 + cy * 0.4, B[2] * 0.6 + z * 0.4], 0.2, 0.04, P.rustDark);
    }
    bx(ctx, x - 0.16, x + 0.16, cy - 0.16, cy + 0.16, z - 0.16, z + 0.16, P.rustDark); // weld boss
  }
}

// ========================================================== 5. BARRIER =====
export function barrier(ctx, P, p) {
  const kind = String(p.kind || "blast");
  const L = clamp(num(p.length, 8), 1.5, 20);
  const H = clamp(num(p.height, kind === "gabion" ? 1.1 : 2.6), 0.6, 4);

  if (kind === "hesco") {
    const cell = 1.06;
    const n = Math.max(1, Math.round(L / cell));
    const courses = H > 1.6 ? 2 : 1;
    for (let c = 0; c < courses; c++) {
      const ch = courses === 2 ? H / 2 : H;
      const inset = c * 0.09;
      for (let i = 0; i < n; i++) {
        const z = -L / 2 + cell * (i + 0.5);
        const gy = ctx.groundY(0, z);
        const y0 = gy + c * ch;
        const half = cell / 2 - 0.03 - inset;
        // the earth fill, slightly bellied like a full cell
        G.loftFrames(ctx, [
          { c: [0, y0 + 0.02, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(cell - 0.06 - inset * 2, cell - 0.06, 0, 0, 0.02) },
          { c: [0, y0 + ch * 0.5, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(cell + 0.03 - inset * 2, cell + 0.03, 0, 0, 0.02) },
          { c: [0, y0 + ch, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(cell - 0.1 - inset * 2, cell - 0.1, 0, 0, 0.02) },
        ], c % 2 ? P.clay : P.earth);
        // the mesh cage: verticals and horizontals on both faces
        for (const s of [-1, 1]) {
          for (let k = 0; k <= 4; k++) {
            const t = -half + (2 * half * k) / 4;
            beam(ctx, [s * (half + 0.03), y0, z + t], [s * (half + 0.03), y0 + ch, z + t], 0.022, 0.022, P.rustDark);
          }
          for (let k = 0; k <= 3; k++) {
            const y = y0 + (ch * k) / 3 + 0.04;
            beam(ctx, [s * (half + 0.03), y, z - half], [s * (half + 0.03), y, z + half], 0.022, 0.022, P.rustDark);
          }
        }
      }
    }
    return;
  }

  if (kind === "gabion") {
    const dia = 0.95;
    const n = Math.max(1, Math.round(L / (dia * 1.02)));
    const courses = H > 1.4 ? 2 : 1;
    for (let c = 0; c < courses; c++) {
      const ch = courses === 2 ? H / 2 : H;
      for (let i = 0; i < n; i++) {
        const z = -L / 2 + dia * 1.02 * (i + 0.5) + (c % 2 ? dia * 0.5 : 0);
        if (z > L / 2) continue;
        const gy = ctx.groundY(0, z);
        const y0 = gy + c * ch;
        const r = dia / 2;
        G.loftFrames(ctx, [
          { c: [0, y0 + 0.02, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(dia, dia, 0, 0, 9, 0.95) },
          { c: [0, y0 + ch * 0.55, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(dia * 1.06, dia * 1.06, 0, 0, 9, 0.95) },
          { c: [0, y0 + ch, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(dia * 0.96, dia * 0.96, 0, 0, 9, 0.95) },
        ], P.rubble);
        // woven hoops and uprights
        for (let h = 0; h < 4; h++) {
          const y = y0 + 0.08 + (ch - 0.16) * (h / 3);
          const pts = [];
          for (let k = 0; k <= 9; k++) {
            const a = (k / 9) * Math.PI * 2;
            pts.push([Math.cos(a) * (r + 0.045), y + Math.sin(a * 3) * 0.02, z + Math.sin(a) * (r + 0.045)]);
          }
          G.polyTube(ctx, pts, 0.022, 4, [0, 1, 0], h % 2 ? P.timberWet : P.timber);
        }
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          beam(ctx, [Math.cos(a) * r, y0, z + Math.sin(a) * r], [Math.cos(a) * r, y0 + ch + 0.07, z + Math.sin(a) * r], 0.03, 0.03, P.timber);
        }
        // rubble heaped proud of the rim
        for (let k = 0; k < 5; k++) {
          const s = ctx.randomRange(0.12, 0.24);
          bx(ctx, ctx.randomRange(-r * 0.6, r * 0.6), ctx.randomRange(-r * 0.6, r * 0.6) + s, y0 + ch - 0.02, y0 + ch + s * 0.7, z + ctx.randomRange(-r * 0.6, r * 0.6), z + ctx.randomRange(-r * 0.6, r * 0.6) + s, P.rubble);
        }
      }
    }
    return;
  }

  // blast wall — precast sections, battered foot, chamfered cap, 8 cm daylight
  const secW = 2.35;
  const n = Math.max(1, Math.round(L / secW));
  for (let i = 0; i < n; i++) {
    const z0 = -L / 2 + (L / n) * i + 0.04, z1 = -L / 2 + (L / n) * (i + 1) - 0.04;
    const zc = (z0 + z1) / 2;
    const gy = lowGround(ctx, [-0.7, 0.7], [z0, zc, z1]);
    const lean = ctx.randomRange(-0.03, 0.03);
    G.loftFrames(ctx, [
      { c: [0, gy - 0.5, zc], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(0.78, z1 - z0 + 0.1, 0, 0, 0.02) },
      { c: [0, gy + 0.12, zc], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(0.62, z1 - z0, 0, 0, 0.02) },
      { c: [lean * 0.4, gy + H * 0.6, zc], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(0.34, z1 - z0, 0, 0, 0.02) },
      { c: [lean, gy + H, zc], f: [0, 1, 0], up: [0, 0, 1], poly: G.rrect(0.26, z1 - z0 - 0.02, 0, 0, 0.02) },
    ], P.concrete);
    // a lifting eye and a stencilled band, in worn concrete
    bx(ctx, -0.2, 0.2, gy + H - 0.24, gy + H - 0.06, zc - 0.14, zc + 0.14, P.concreteWorn);
    if (ctx.random() < 0.5) {
      for (let k = 0; k < 3; k++) {
        const s = ctx.randomRange(0.12, 0.3);
        const y = gy + ctx.randomRange(0.1, H - 0.4);
        const zs = zc + ctx.randomRange(-0.8, 0.8);
        bx(ctx, 0.28, 0.28 + s * 0.45, y, y + s, zs, zs + s, P.concreteWet); // shell scars, stood proud so nothing z-fights the face
      }
    }
  }
}

// ======================================================== 6. DUCKBOARD =====
export function duckboard(ctx, P, p) {
  const L = clamp(num(p.length, 7), 1.5, 20);
  const curve = clamp(num(p.curve, 0.35), -1.5, 1.5);
  const path = [];
  const segs = 6;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    path.push([Math.sin(t * Math.PI) * curve * 1.9, -L / 2 + L * t]);
  }
  const sts = stations(path, 0.5);
  // the boards ride the ground, so a crater lip doesn't leave them floating
  const grounded = sts.map((st) => ({ ...st, c: [st.c[0], ctx.groundY(st.c[0], st.c[2]) + 0.12, st.c[2]] }));
  duckboardRun(ctx, P, grounded, -0.55, 0.55, 0.28);
  // trodden mud thrown up along the edges
  const total = grounded[grounded.length - 1].run;
  for (let i = 0; i < 18; i++) {
    const st = stationAt(grounded, ctx.randomRange(0, total));
    const lat = (ctx.random() < 0.5 ? -1 : 1) * ctx.randomRange(0.58, 0.95);
    const c = atStation(st, lat, st.c[1] - 0.1);
    const s = ctx.randomRange(0.12, 0.3);
    G.loftFrames(ctx, [
      { c: [c[0], c[1], c[2]], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(s * 1.6, s * 1.6, 0, 0, 5, 0.85) },
      { c: [c[0], c[1] + s * 0.5, c[2]], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(s * 0.5, s * 0.5, 0, 0, 5, 0.85) },
    ], i % 2 ? P.earthWet : P.clay);
  }
}

// ----------------------------------------------------------- utilities ----
export function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function norm3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
export function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
export function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
export function lerpSt(a, b, t) {
  return {
    c: [a.c[0] + (b.c[0] - a.c[0]) * t, 0, a.c[2] + (b.c[2] - a.c[2]) * t],
    f: a.f,
    u: a.u,
    run: a.run + (b.run - a.run) * t,
  };
}
export function stationAt(sts, d) {
  const total = sts[sts.length - 1].run;
  const t = clamp(d, 0, total);
  for (let i = 0; i < sts.length - 1; i++) {
    if (t <= sts[i + 1].run) {
      const span = sts[i + 1].run - sts[i].run || 1;
      return lerpSt(sts[i], sts[i + 1], (t - sts[i].run) / span);
    }
  }
  return sts[sts.length - 1];
}

// ------------------------------------------------------------- the hook ---
export function geometry(ctx) {
  const p = ctx.params || {};
  const P = palette(ctx);
  const part = String(p.part || "sandbags");
  if (part === "bunker") bunker(ctx, P, p);
  else if (part === "trench") trench(ctx, P, p);
  else if (part === "traps") traps(ctx, P, p);
  else if (part === "barrier") barrier(ctx, P, p);
  else if (part === "duckboard") duckboard(ctx, P, p);
  else sandbags(ctx, P, p);
}
