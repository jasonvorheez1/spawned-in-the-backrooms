// LINE KIT — the small human truths of a position people have lived in.
//
//   primitive: { kind: "scripted", script: "scripts/asset-library/gen-military/linekit.js",
//                params: { part: "tarp", width: 5, depth: 4 } }
//
// fortify.js digs the hole and debris.js drops what got left in it. This file is
// the third leg: the things a section builds for ITSELF once the digging stops —
// a tarp over the wounded, a flue out of the dugout roof, a lamp on a hook, a
// map pinned to a board, shells stacked ready, and a washing line, because
// someone still does washing.
//
// FRAME: origin on the ground at the footprint centre, +Y up, the long axis of
//        anything long on +Z, the FRONT of anything with a front on +Z (same law
//        as the rest of gen-military). Yaw the spec row to aim it.
// SCALE: measured against a 1.8 m soldier — a stove pipe is 1.5 m of 5-inch flue,
//        a hurricane lamp 260 mm of glass, a 75 mm case 350 mm long.
// GROUND: every part reads ctx.groundY at its own contact points, so posts,
//        pegs and sleepers find the mud they are actually standing in.
//
//   part: "tarp"       width 3-8, depth 2.5-6, ridge, cross 0|1   aid-post shelter
//   part: "stovepipe"  height 0.8-2.4                              dugout flue + cowl
//   part: "lamp"       height 1.6-2.6, lit 0|1                     hanging hurricane lamp
//   part: "washline"   length 3-9, items 3-6                       posts, rope, washing
//   part: "mapboard"   width 0.7-1.4                               pinned map on a board
//   part: "shellstack" rows 2-5                                    spent 75 mm cases, stacked
//
// COLLISION: mapboard and shellstack return a box — the two you'd bark a shin on.
// Everything else emits nothing from collider(): an authored "walk under it".

const G = require("scripts/lib/geom.js");

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

const TEX = {
  timber: "/cdn/moodboard-realistic-gritty/texture-armory-board-oak.png",
  steel: "/cdn/moodboard-realistic-gritty/texture-armory-steel-plate.png",
  rust: "/cdn/moodboard-realistic-gritty/texture-debris-steel-rusted-1944.png",
  canvas: "/cdn/moodboard-realistic-gritty/texture-debris-canvas-duck-1944.png",
  hessian: "/cdn/moodboard-realistic-gritty/texture-sandbag-hessian.png",
};

// ── paint ───────────────────────────────────────────────────────────────────
// Every closure writes emissive too, so the lamp's lit glass can never leak its
// glow onto the next face the generator emits.
export function mk(ctx, o) {
  const base = G.surface(ctx, o);
  const er = o.er || 0;
  const eg = o.eg || 0;
  const eb = o.eb || 0;
  return function (x, y, z) {
    base(x, y, z);
    ctx.emissive(er, eg, eb);
  };
}

export function palette(ctx) {
  return {
    timber: mk(ctx, { tex: TEX.timber, r: 0.46, g: 0.36, b: 0.23, rough: 0.94, jitter: 0.2, freq: 4.2 }),
    timberWet: mk(ctx, { tex: TEX.timber, r: 0.3, g: 0.24, b: 0.16, rough: 0.97, jitter: 0.22, freq: 6.5 }),
    plank: mk(ctx, { tex: TEX.timber, r: 0.55, g: 0.45, b: 0.3, rough: 0.92, jitter: 0.24, freq: 5.5 }),
    canvas: mk(ctx, { tex: TEX.canvas, r: 0.44, g: 0.42, b: 0.32, rough: 0.97, jitter: 0.19, freq: 3.2 }),
    canvasWorn: mk(ctx, { tex: TEX.canvas, r: 0.52, g: 0.49, b: 0.39, rough: 0.96, jitter: 0.22, freq: 4.8 }),
    canvasDirty: mk(ctx, { tex: TEX.canvas, r: 0.28, g: 0.26, b: 0.2, rough: 0.99, jitter: 0.24, freq: 6.2 }),
    olive: mk(ctx, { tex: TEX.canvas, r: 0.27, g: 0.29, b: 0.19, rough: 0.95, jitter: 0.2, freq: 5 }),
    oliveWorn: mk(ctx, { tex: TEX.canvas, r: 0.35, g: 0.36, b: 0.26, rough: 0.94, jitter: 0.22, freq: 7 }),
    grey: mk(ctx, { tex: TEX.canvas, r: 0.42, g: 0.42, b: 0.4, rough: 0.96, jitter: 0.18, freq: 4 }),
    white: mk(ctx, { tex: TEX.canvas, r: 0.78, g: 0.76, b: 0.7, rough: 0.93, jitter: 0.14, freq: 5.5 }),
    red: mk(ctx, { tex: TEX.canvas, r: 0.42, g: 0.07, b: 0.06, rough: 0.9, jitter: 0.14, freq: 6 }),
    paper: mk(ctx, { tex: TEX.canvas, r: 0.72, g: 0.68, b: 0.56, rough: 0.9, jitter: 0.12, freq: 9 }),
    ink: mk(ctx, { tex: TEX.canvas, r: 0.2, g: 0.21, b: 0.24, rough: 0.85, jitter: 0.12, freq: 8 }),
    inkRed: mk(ctx, { tex: TEX.canvas, r: 0.46, g: 0.13, b: 0.1, rough: 0.8, jitter: 0.14, freq: 9 }),
    steel: mk(ctx, { tex: TEX.steel, r: 0.44, g: 0.45, b: 0.47, metal: 0.8, rough: 0.5, jitter: 0.16, freq: 8 }),
    steelDark: mk(ctx, { tex: TEX.steel, r: 0.22, g: 0.22, b: 0.24, metal: 0.68, rough: 0.62, jitter: 0.18, freq: 10 }),
    rust: mk(ctx, { tex: TEX.rust, r: 0.37, g: 0.21, b: 0.13, metal: 0.4, rough: 0.93, jitter: 0.28, freq: 4.6 }),
    rustDeep: mk(ctx, { tex: TEX.rust, r: 0.19, g: 0.11, b: 0.07, metal: 0.28, rough: 1, jitter: 0.26, freq: 7 }),
    soot: mk(ctx, { tex: TEX.rust, r: 0.09, g: 0.085, b: 0.08, rough: 1, jitter: 0.16, freq: 6 }),
    brass: mk(ctx, { tex: TEX.steel, r: 0.64, g: 0.5, b: 0.21, metal: 0.9, rough: 0.36, jitter: 0.2, freq: 11 }),
    brassDull: mk(ctx, { tex: TEX.steel, r: 0.43, g: 0.35, b: 0.17, metal: 0.74, rough: 0.56, jitter: 0.24, freq: 13 }),
    glass: mk(ctx, { tex: TEX.steel, r: 0.95, g: 0.8, b: 0.52, metal: 0, rough: 0.22, jitter: 0.06, freq: 14, er: 2.6, eg: 1.5, eb: 0.6 }),
    glassCold: mk(ctx, { tex: TEX.steel, r: 0.5, g: 0.48, b: 0.44, metal: 0, rough: 0.25, jitter: 0.1, freq: 14 }),
    rope: mk(ctx, { tex: TEX.hessian, r: 0.5, g: 0.43, b: 0.29, rough: 1, jitter: 0.2, freq: 9 }),
    mud: mk(ctx, { tex: TEX.rust, r: 0.23, g: 0.2, b: 0.15, rough: 1, jitter: 0.24, freq: 5 }),
  };
}

// ── little emitters ─────────────────────────────────────────────────────────

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function num(v, d) {
  return typeof v === "number" && isFinite(v) ? v : d;
}

export function rect4(w, h, cu, cv) {
  const u0 = (cu || 0) - w / 2;
  const u1 = (cu || 0) + w / 2;
  const v0 = (cv || 0) - h / 2;
  const v1 = (cv || 0) + h / 2;
  return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
}

// A beam between two points, rectangular section, any orientation.
export function beam(ctx, a, b, w, h, paint, bevel) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  const f = [d[0] / len, d[1] / len, d[2] / len];
  const up = Math.abs(f[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
  const poly = bevel ? G.rrect(w, h, 0, 0, bevel) : rect4(w, h, 0, 0);
  G.loftFrames(ctx, [{ c: a, f: f, up: up, poly: poly }, { c: b, f: f, up: up, poly: poly }], paint);
}

// A round section swept between two points, radius r0 -> r1.
export function pipe(ctx, a, b, r0, r1, segs, paint) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  const f = [d[0] / len, d[1] / len, d[2] / len];
  const up = Math.abs(f[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
  const n = Math.max(5, segs || 8);
  G.loftFrames(ctx, [
    { c: a, f: f, up: up, poly: G.oval(r0 * 2, r0 * 2, 0, 0, n, 1) },
    { c: b, f: f, up: up, poly: G.oval(r1 * 2, r1 * 2, 0, 0, n, 1) },
  ], paint);
}

// A thin sheet seen from both sides — canvas, washing, a pinned map.
// grid(u, v) -> [x, y, z]; both windings emitted so nothing is one-sided.
export function sheet(ctx, nu, nv, grid, paint) {
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = grid(i / nu, j / nv);
      const b = grid((i + 1) / nu, j / nv);
      const c = grid((i + 1) / nu, (j + 1) / nv);
      const d = grid(i / nu, (j + 1) / nv);
      if (paint) paint((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
      ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
      ctx.quad(d[0], d[1], d[2], c[0], c[1], c[2], b[0], b[1], b[2], a[0], a[1], a[2]);
    }
  }
}

// ══════════════════════════════════════════════════════ 1. TARP ════════════
// A ridge tarp on four legs — the field aid post. Ridge along +Z, the gable you
// walk in at -Z, and the cross panel hung on that gable so it reads from a
// hundred metres away.
export function tarp(ctx, P, p) {
  const W = clamp(num(p.width, 5), 3, 8);
  const D = clamp(num(p.depth, 4), 2.5, 6);
  const Hr = clamp(num(p.ridge, 2.5), 1.9, 3.2);
  const He = Math.max(1.5, Hr - 0.78);
  const sag = clamp(num(p.sag, 0.16), 0, 0.4);
  const cross = num(p.cross, 1) > 0.5;
  const hw = W / 2;
  const hd = D / 2;

  const gy = (x, z) => ctx.groundY(x, z);

  // legs — four corners plus the two ridge posts, each standing in its own mud
  const post = (x, z, top, w) => {
    const y0 = gy(x, z) - 0.12;
    beam(ctx, [x, y0, z], [x + ctx.randomRange(-0.03, 0.03), top, z + ctx.randomRange(-0.03, 0.03)], w, w, P.timber, 0.008);
  };
  post(-hw, -hd, He, 0.09);
  post(hw, -hd, He, 0.09);
  post(-hw, hd, He - 0.06, 0.09);
  post(hw, hd, He - 0.06, 0.09);
  post(0, -hd + 0.18, Hr, 0.1);
  post(0, hd - 0.18, Hr - 0.05, 0.1);

  // ridge pole, running a little proud of the canvas at both ends
  pipe(ctx, [0, Hr, -hd - 0.34], [0, Hr - 0.05, hd + 0.34], 0.045, 0.042, 7, P.timberWet);
  // eave purlins
  for (const s of [-1, 1]) {
    beam(ctx, [s * hw, He, -hd - 0.2], [s * hw, He - 0.06, hd + 0.2], 0.06, 0.06, P.timberWet, 0.006);
  }

  // the canvas: two slopes, sagging between the ridge and the eave and again
  // along the run, plus a droop past the purlin so the edge hangs
  for (const s of [-1, 1]) {
    sheet(ctx, 7, 7, (u, v) => {
      const over = u > 1 ? 0 : 0;
      const x = s * u * hw;
      const z = -hd - 0.25 + v * (D + 0.5);
      const along = Math.sin(Math.PI * clamp((z + hd) / D, 0, 1));
      const y = Hr + (He - Hr) * u - sag * along * (0.35 + 0.65 * u) - over;
      return [x, y, z];
    }, s > 0 ? P.canvas : P.canvasWorn);
    // the hanging skirt below the purlin
    sheet(ctx, 6, 3, (u, v) => {
      const z = -hd - 0.25 + u * (D + 0.5);
      const along = Math.sin(Math.PI * clamp((z + hd) / D, 0, 1));
      const drop = v * 0.42;
      const x = s * (hw + 0.03 * v);
      const y = He - sag * along - drop + Math.sin(u * 9) * 0.02 * v;
      return [x, y, z];
    }, P.canvasDirty);
  }

  // guys — four ropes to pegs, the only thing holding this up in a wind
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const a = [sx * hw, He - 0.04, sz * hd];
      const px = sx * (hw + 0.85);
      const pz = sz * (hd + 0.7);
      const b = [px, gy(px, pz) + 0.02, pz];
      pipe(ctx, a, b, 0.014, 0.012, 5, P.rope);
      beam(ctx, [px, gy(px, pz) - 0.18, pz], [px + 0.04, gy(px, pz) + 0.16, pz + 0.03], 0.05, 0.05, P.timberWet);
    }
  }

  // the cross panel, hung on the front gable (+Z, the kit's facing law)
  if (cross) {
    const zc = hd + 0.3;
    const pw = 1.05;
    const ph = 0.9;
    const yc = He + 0.22;
    sheet(ctx, 3, 3, (u, v) => [(-0.5 + u) * pw, yc - 0.05 + (v - 0.5) * ph + Math.sin(u * 4) * 0.012, zc], P.white);
    // the cross, stood proud so it can never z-fight the panel
    const zp = zc + 0.022;
    sheet(ctx, 2, 1, (u, v) => [(-0.5 + u) * (pw * 0.62), yc - 0.05 + (v - 0.5) * (ph * 0.22), zp], P.red);
    sheet(ctx, 1, 2, (u, v) => [(-0.5 + u) * (pw * 0.22), yc - 0.05 + (v - 0.5) * (ph * 0.66), zp], P.red);
    // two ties to the ridge
    for (const s of [-1, 1]) pipe(ctx, [s * pw * 0.42, yc + ph * 0.45, zc], [s * 0.12, Hr - 0.06, hd + 0.28], 0.008, 0.008, 4, P.rope);
  }

  // a bucket-worth of trodden mud around the leg that gets used
  for (let i = 0; i < 7; i++) {
    const x = ctx.randomRange(-hw, hw);
    const z = ctx.randomRange(-hd, hd);
    const s = ctx.randomRange(0.12, 0.3);
    const y = gy(x, z);
    G.loftFrames(ctx, [
      { c: [x, y - 0.03, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(s * 1.6, s * 1.2, 0, 0, 5, 0.85) },
      { c: [x, y + 0.035, z], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(s * 0.7, s * 0.5, 0, 0, 5, 0.85) },
    ], P.mud);
  }
}

// ═════════════════════════════════════════════════ 2. STOVEPIPE ════════════
// The flue out of a dugout roof. Leans, because it was pushed through earth by
// hand and nobody came back to straighten it.
export function stovepipe(ctx, P, p) {
  const H = clamp(num(p.height, 1.5), 0.8, 2.4);
  const lean = clamp(num(p.lean, 7), -20, 20) * D2R;
  const dx = Math.sin(lean) * H;
  const dz = Math.sin(lean * 0.6) * H * 0.4;
  // grounded: 0 puts the flue's foot at the anchor itself — a roof, an earth cap,
  // anything that is not the terrain the object stands over.
  const onGround = num(p.grounded, 1) > 0.5;
  const gy = onGround ? ctx.groundY(0, 0) : 0;

  // the earth collar it comes out of
  G.loftFrames(ctx, [
    { c: [0, gy - 0.06, 0], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(0.42, 0.42, 0, 0, 8, 0.86) },
    { c: [0, gy + 0.09, 0], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(0.24, 0.24, 0, 0, 8, 0.9) },
  ], P.mud);

  const top = [dx, gy + H, dz];
  pipe(ctx, [0, gy - 0.05, 0], [dx * 0.5, gy + H * 0.55, dz * 0.5], 0.068, 0.064, 9, P.rust);
  pipe(ctx, [dx * 0.5, gy + H * 0.55, dz * 0.5], top, 0.064, 0.061, 9, P.rustDeep);
  // joint bands
  for (const t of [0.28, 0.62]) {
    const c = [dx * t, gy + H * t, dz * t];
    pipe(ctx, [c[0], c[1] - 0.025, c[2]], [c[0], c[1] + 0.025, c[2]], 0.076, 0.076, 9, P.steelDark);
  }
  // cowl: a flared collar and a rain cap on three legs
  pipe(ctx, top, [top[0] + dx * 0.06, top[1] + 0.13, top[2]], 0.061, 0.15, 9, P.rustDeep);
  const capY = top[1] + 0.30;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    pipe(ctx, [top[0] + Math.cos(a) * 0.12, top[1] + 0.13, top[2] + Math.sin(a) * 0.12], [top[0] + Math.cos(a) * 0.1, capY, top[2] + Math.sin(a) * 0.1], 0.009, 0.009, 4, P.steelDark);
  }
  G.loftFrames(ctx, [
    { c: [top[0], capY, top[2]], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(0.36, 0.36, 0, 0, 9, 1) },
    { c: [top[0], capY + 0.07, top[2]], f: [0, 1, 0], up: [0, 0, 1], poly: G.oval(0.13, 0.13, 0, 0, 9, 1) },
  ], P.soot);
  // soot on the last third, stood proud of the pipe
  for (let i = 0; i < 6; i++) {
    const t = ctx.randomRange(0.62, 0.98);
    const a = ctx.randomRange(0, TAU);
    const c = [dx * t + Math.cos(a) * 0.062, gy + H * t, dz * t + Math.sin(a) * 0.062];
    pipe(ctx, c, [c[0] + Math.cos(a) * 0.012, c[1] + ctx.randomRange(0.05, 0.16), c[2] + Math.sin(a) * 0.012], 0.024, 0.014, 5, P.soot);
  }
  // one guy wire to a peg, because it fell over once already
  if (!onGround) return;
  const pegA = ctx.randomRange(0, TAU);
  const px = Math.cos(pegA) * 0.75;
  const pz = Math.sin(pegA) * 0.75;
  const pgy = ctx.groundY(px, pz);
  pipe(ctx, [dx * 0.68, gy + H * 0.68, dz * 0.68], [px, pgy + 0.05, pz], 0.007, 0.007, 4, P.steel);
  beam(ctx, [px, pgy - 0.14, pz], [px + 0.03, pgy + 0.13, pz], 0.03, 0.03, P.rust);
}

// ════════════════════════════════════════════════════ 3. LAMP ══════════════
// A hurricane lamp on a hook, on a post. `lit` swaps the glass between a warm
// emissive and cold dead glass — the light itself is a spec row beside this one.
export function lamp(ctx, P, p) {
  const H = clamp(num(p.height, 2.15), 1.6, 2.6);
  const lit = num(p.lit, 1) > 0.5;
  const gy = ctx.groundY(0, 0);
  const glass = lit ? P.glass : P.glassCold;

  // post, braced
  beam(ctx, [0, gy - 0.3, 0], [0.03, gy + H, -0.02], 0.09, 0.09, P.timber, 0.008);
  beam(ctx, [0, gy + H * 0.45, -0.04], [-0.34, gy + H * 0.05, -0.3], 0.055, 0.055, P.timberWet, 0.006);
  // arm out over the trench, and its knee brace
  const armEnd = [0.01, gy + H - 0.06, 0.52];
  beam(ctx, [0, gy + H - 0.1, 0], armEnd, 0.06, 0.075, P.timber, 0.006);
  beam(ctx, [0, gy + H - 0.46, 0.02], [0.01, gy + H - 0.11, 0.34], 0.045, 0.045, P.timberWet, 0.005);
  // hook and chain
  pipe(ctx, [armEnd[0], armEnd[1] - 0.03, armEnd[2] - 0.04], [armEnd[0], armEnd[1] - 0.19, armEnd[2] - 0.02], 0.009, 0.009, 5, P.steelDark);
  const bx0 = armEnd[0];
  const bz0 = armEnd[2] - 0.02;
  const bailTop = armEnd[1] - 0.19;

  // lantern: brass base, glass chimney, vented cap, three guard bars
  const baseY = bailTop - 0.44;
  pipe(ctx, [bx0, baseY, bz0], [bx0, baseY + 0.055, bz0], 0.088, 0.082, 9, P.brassDull);
  pipe(ctx, [bx0, baseY + 0.055, bz0], [bx0, baseY + 0.085, bz0], 0.082, 0.068, 9, P.brass);
  pipe(ctx, [bx0, baseY + 0.085, bz0], [bx0, baseY + 0.30, bz0], 0.072, 0.062, 10, glass);
  pipe(ctx, [bx0, baseY + 0.30, bz0], [bx0, baseY + 0.35, bz0], 0.086, 0.062, 9, P.brass);
  pipe(ctx, [bx0, baseY + 0.35, bz0], [bx0, baseY + 0.40, bz0], 0.052, 0.038, 9, P.brassDull);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.4;
    pipe(ctx, [bx0 + Math.cos(a) * 0.078, baseY + 0.06, bz0 + Math.sin(a) * 0.078], [bx0 + Math.cos(a) * 0.072, baseY + 0.34, bz0 + Math.sin(a) * 0.072], 0.008, 0.008, 4, P.brassDull);
  }
  // the bail, a wire arc from cap to hook
  const arc = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const a = Math.PI * t;
    arc.push([bx0 + Math.cos(a) * 0.075, baseY + 0.40 + Math.sin(a) * 0.055, bz0]);
  }
  G.polyTube(ctx, arc, 0.008, 4, [0, 0, 1], P.steelDark);
  pipe(ctx, [bx0, baseY + 0.455, bz0], [bx0, bailTop, bz0], 0.008, 0.008, 4, P.steelDark);

  // a nail-board of small comforts under it: a shelf and a mug-sized tin
  beam(ctx, [-0.26, gy + 1.02, 0.02], [0.26, gy + 1.0, 0.04], 0.24, 0.035, P.plank, 0.005);
  pipe(ctx, [0.1, gy + 1.02, 0.03], [0.1, gy + 1.11, 0.03], 0.043, 0.041, 8, P.steel);
}

// ════════════════════════════════════════════════ 4. WASHLINE ══════════════
// Two posts, a rope with a real catenary, and washing on it. Nothing else on the
// position says "months" this fast.
export function washline(ctx, P, p) {
  const L = clamp(num(p.length, 5.2), 3, 9);
  const H = clamp(num(p.height, 1.85), 1.4, 2.3);
  const items = Math.round(clamp(num(p.items, 4), 3, 6));
  const sag = L * 0.055;

  for (const s of [-1, 1]) {
    const z = s * (L / 2);
    const gy = ctx.groundY(0, z);
    beam(ctx, [0, gy - 0.3, z], [s * 0.08, gy + H, z + s * 0.06], 0.085, 0.085, P.timber, 0.008);
    // a stay, driven in on the outside
    const pz = z + s * 0.85;
    const pgy = ctx.groundY(0.05, pz);
    beam(ctx, [s * 0.06, gy + H - 0.2, z + s * 0.05], [0.05, pgy - 0.1, pz], 0.05, 0.05, P.timberWet, 0.005);
  }

  const ropePt = (t) => {
    const z = -L / 2 + L * t;
    const gy = ctx.groundY(0, z);
    return [0.06 * Math.sin(t * Math.PI), gy + H - 0.04 - sag * Math.sin(Math.PI * t), z];
  };
  const rope = [];
  for (let i = 0; i <= 14; i++) rope.push(ropePt(i / 14));
  G.polyTube(ctx, rope, 0.011, 5, [0, 1, 0], P.rope);

  const cloth = [P.oliveWorn, P.grey, P.canvasWorn, P.olive, P.canvasDirty, P.white];
  for (let k = 0; k < items; k++) {
    const t = 0.13 + (0.74 * (k + 0.5)) / items + ctx.randomRange(-0.03, 0.03);
    const hang = ropePt(t);
    const w = ctx.randomRange(0.4, 0.66);
    const h = ctx.randomRange(0.5, 0.92);
    const twist = ctx.randomRange(-0.22, 0.22);
    const paint = cloth[k % cloth.length];
    sheet(ctx, 4, 5, (u, v) => {
      const zz = hang[2] + (u - 0.5) * w;
      // hangs from the rope, narrows a touch at the shoulder, waves at the hem
      const pinch = 1 - 0.22 * (1 - v) * Math.abs(u - 0.5) * 2;
      const yy = hang[1] - 0.02 - v * h;
      const xx = hang[0] + Math.sin(v * 3.1 + u * 2.4) * 0.035 * v + twist * v * 0.35;
      return [xx, yy - (1 - pinch) * 0.05, zz];
    }, paint);
    // two pegs
    for (const s of [-1, 1]) {
      const pz = hang[2] + s * w * 0.36;
      beam(ctx, [hang[0] - 0.02, hang[1] + 0.035, pz], [hang[0] - 0.02, hang[1] - 0.055, pz], 0.02, 0.028, P.plank);
    }
  }
}

// ════════════════════════════════════════════════ 5. MAPBOARD ══════════════
// A plank board on splayed legs with the sector map pinned to it, a grease
// pencil on the ledge, and two red pins where the trouble is.
export function mapboard(ctx, P, p) {
  const W = clamp(num(p.width, 0.98), 0.7, 1.4);
  const Hb = clamp(num(p.height, 0.74), 0.5, 1.0);
  const top = clamp(num(p.top, 1.5), 1.1, 1.8);
  const tilt = 16 * D2R;
  const hw = W / 2;

  // two posts driven into the ground, board nailed to their front faces
  for (const s of [-1, 1]) {
    const px = s * (hw - 0.07);
    const g = ctx.groundY(px, -0.07);
    beam(ctx, [px, g - 0.35, -0.07], [px + s * 0.02, top, -0.05], 0.07, 0.07, P.timber, 0.006);
  }
  // a diagonal brace across the back
  beam(ctx, [-(hw - 0.07), top - Hb - 0.12, -0.11], [hw - 0.07, top - 0.14, -0.11], 0.05, 0.04, P.timberWet, 0.005);

  // the board itself, tilted back at the top; front normal is (0, sin, cos)
  const cy = top - Hb / 2 - 0.03;
  const boardPt = (u, v, d) => [
    u * W,
    cy + v * Hb * Math.cos(tilt) + d * Math.sin(tilt),
    0.035 - v * Hb * Math.sin(tilt) + d * Math.cos(tilt),
  ];
  // one clean slab lofted along its own normal — no hand-wound faces
  beam(ctx, boardPt(0, 0, -0.04), boardPt(0, 0, 0.001), W, Hb, P.plank, 0.008);
  // two battens across the back, so it reads as boards on a frame
  for (const v of [-0.36, 0.36]) {
    beam(ctx, boardPt(-0.48, v, -0.055), boardPt(0.48, v, -0.055), 0.035, 0.11, P.timberWet, 0.004);
  }

  // the map: paper proud of the boards, cockled at one corner
  const mw = 0.82;
  const mh = 0.78;
  sheet(ctx, 4, 4, (u, v) => {
    const cockle = Math.max(0, u - 0.72) * Math.max(0, v - 0.7) * 1.6;
    return boardPt((u - 0.5) * mw, (v - 0.5) * mh, 0.014 + cockle * 0.12);
  }, P.paper);

  // roads and a contour or two, drawn on top and stood proud so nothing fights
  const line = (u0, v0, u1, v1, wgt, paint) => {
    const a = boardPt(u0 * mw, v0 * mh, 0.021);
    const b = boardPt(u1 * mw, v1 * mh, 0.021);
    pipe(ctx, a, b, wgt, wgt, 4, paint);
  };
  line(-0.02, -0.46, 0.03, 0.46, 0.006, P.ink);
  line(-0.44, 0.12, 0.44, 0.2, 0.005, P.ink);
  line(-0.42, -0.2, 0.2, -0.3, 0.004, P.ink);
  line(-0.3, 0.34, 0.36, 0.3, 0.004, P.ink);
  line(-0.36, -0.06, 0.34, -0.02, 0.005, P.inkRed);

  // pins: four brass at the corners, two red where the trouble is
  const pin = (u, v, paint, r) => {
    const a = boardPt(u * mw, v * mh, 0.016);
    const b = boardPt(u * mw, v * mh, 0.05);
    pipe(ctx, a, b, r * 0.35, r, 6, paint);
  };
  pin(-0.46, 0.46, P.brassDull, 0.012);
  pin(0.46, 0.46, P.brassDull, 0.012);
  pin(-0.46, -0.46, P.brassDull, 0.012);
  pin(0.46, -0.46, P.brassDull, 0.012);
  pin(0.12, 0.06, P.inkRed, 0.016);
  pin(-0.2, -0.16, P.inkRed, 0.016);

  // ledge and a grease pencil
  const l0 = boardPt(-0.5, -0.5, 0.0);
  const l1 = boardPt(0.5, -0.5, 0.0);
  beam(ctx, [l0[0], l0[1] - 0.03, l0[2] + 0.03], [l1[0], l1[1] - 0.03, l1[2] + 0.03], 0.075, 0.03, P.timberWet, 0.004);
  const pl = boardPt(-0.16, -0.5, 0.0);
  pipe(ctx, [pl[0] - 0.09, pl[1] + 0.005, pl[2] + 0.045], [pl[0] + 0.09, pl[1] + 0.005, pl[2] + 0.045], 0.008, 0.008, 5, P.inkRed);
}

// ═══════════════════════════════════════════════ 6. SHELLSTACK ═════════════
// Spent 75 mm brass, stacked on sleepers the way a gun crew stacks it — a
// pyramid that gets shorter as the day goes on, and a few stood on end.
export function shellstack(ctx, P, p) {
  const rows = Math.round(clamp(num(p.rows, 4), 2, 5));
  const CASE_L = 0.35;
  const R = 0.039;

  const gy0 = ctx.groundY(0, 0);
  // two sleepers under it
  for (const bx0 of [-0.42, 0.42]) {
    const g = ctx.groundY(bx0, 0);
    beam(ctx, [bx0, g - 0.06, -0.52], [bx0, g + 0.05, 0.52], 0.14, 0.11, P.timberWet, 0.006);
  }

  // one horizontal case lying along +Z at (x, y, zc)
  const lay = (x, y, zc, paint) => {
    const f = [0, 0, 1];
    const up = [0, 1, 0];
    const ring = (d, r) => ({ c: [x, y, zc + d], f: f, up: up, poly: G.oval(r * 2, r * 2, 0, 0, 9, 1) });
    G.loftFrames(ctx, [
      ring(-CASE_L / 2, R * 0.86),
      ring(-CASE_L / 2 + 0.018, R * 1.16),
      ring(-CASE_L / 2 + 0.045, R),
      ring(CASE_L * 0.18, R * 0.99),
      ring(CASE_L / 2 - 0.05, R * 0.74),
      ring(CASE_L / 2, R * 0.78),
    ], paint);
  };

  const base = gy0 + 0.11 + R;
  for (let bank = 0; bank < 2; bank++) {
    const zc = -0.21 + bank * 0.42;
    for (let r = 0; r < rows; r++) {
      const n = rows + 1 - r;
      const y = base + r * (R * 1.72);
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * (R * 2.06);
        lay(x + ctx.randomRange(-0.005, 0.005), y, zc + ctx.randomRange(-0.012, 0.012), (i + r + bank) % 3 === 0 ? P.brassDull : P.brass);
      }
    }
  }

  // four stood on end beside the stack, and one on its side in the mud
  for (let i = 0; i < 4; i++) {
    const x = 0.72 + (i % 2) * 0.09;
    const z = -0.28 + Math.floor(i / 2) * 0.1 + ctx.randomRange(-0.02, 0.02);
    const g = ctx.groundY(x, z);
    const f = [0, 1, 0];
    const up = [0, 0, 1];
    const ring = (d, r) => ({ c: [x, g + d, z], f: f, up: up, poly: G.oval(r * 2, r * 2, 0, 0, 9, 1) });
    G.loftFrames(ctx, [
      ring(0, R * 0.86),
      ring(0.018, R * 1.16),
      ring(0.045, R),
      ring(CASE_L * 0.68, R * 0.99),
      ring(CASE_L - 0.05, R * 0.74),
      ring(CASE_L, R * 0.78),
    ], i % 2 ? P.brass : P.brassDull);
  }
  const mx = -0.78;
  const mz = 0.34;
  lay(mx, ctx.groundY(mx, mz) + R * 0.8, mz, P.brassDull);

  // a scrap of the crate the fuzes came in
  const cg = ctx.groundY(0.1, 0.72);
  beam(ctx, [-0.3, cg + 0.02, 0.72], [0.42, cg + 0.03, 0.78], 0.26, 0.045, P.plank, 0.005);
}

// ─────────────────────────────────────────────────────────── the hooks ─────
export function geometry(ctx) {
  const p = ctx.params || {};
  const P = palette(ctx);
  const part = String(p.part || "tarp");
  if (part === "stovepipe") stovepipe(ctx, P, p);
  else if (part === "lamp") lamp(ctx, P, p);
  else if (part === "washline") washline(ctx, P, p);
  else if (part === "mapboard") mapboard(ctx, P, p);
  else if (part === "shellstack") shellstack(ctx, P, p);
  else tarp(ctx, P, p);
}

// Only the two you'd bark a shin on carry a shape. Everything else returns
// nothing — an authored "walk under it", not a fallback.
export function collider(ctx) {
  const p = ctx.params || {};
  const part = String(p.part || "tarp");
  if (part === "mapboard") return { kind: "box", width: clamp(num(p.width, 0.98), 0.7, 1.4), height: 1.5, depth: 0.5 };
  if (part === "shellstack") return { kind: "box", width: 1.1, height: 0.7, depth: 1.1 };
  return undefined;
}
