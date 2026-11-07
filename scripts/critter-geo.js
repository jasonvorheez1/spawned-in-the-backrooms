// Custom character base: a CalArts-style animal critter. Big round head, noodle limbs, mitten hands,
// huge eyes and a toothy grin, drawn right onto the head. One script, every combination is params:
//   species: cat dog fox bunny bear deer mouse wolf raccoon
//   sex: m | f        (f: curvier hips, a bust, lashes)
//   fur, belly, eye: colours      outfit: none tee hoodie dress overalls skirt sweater
//   top, bottom: outfit colours   acc: none bow cap glasses scarf flower tuft
//   expr: grin smile joy surprised sad angry smug scared sleepy love wink
// Rig: Mixamo-style bone names in a T-pose so the gait and library clips can drive it. Faces -Z.
const HC = [0, 1.3, 0], HR = [0.36, 0.33, 0.33]; // head centre and radii (her pick: head is ~40% of height)

const BONES = {
  Hips: { pivot: [0, 0.64, 0] },
  Spine: { parent: "Hips", pivot: [0, 0.72, 0] },
  Spine1: { parent: "Spine", pivot: [0, 0.83, 0] },
  Spine2: { parent: "Spine1", pivot: [0, 0.92, 0] },
  Neck: { parent: "Spine2", pivot: [0, 1.0, 0] },
  Head: { parent: "Neck", pivot: [0, 1.06, 0] },
  LeftShoulder: { parent: "Spine2", pivot: [-0.07, 0.97, 0] },
  LeftArm: { parent: "LeftShoulder", pivot: [-0.15, 0.97, 0] },
  LeftForeArm: { parent: "LeftArm", pivot: [-0.35, 0.97, 0] },
  LeftHand: { parent: "LeftForeArm", pivot: [-0.53, 0.97, 0] },
  RightShoulder: { parent: "Spine2", pivot: [0.07, 0.97, 0] },
  RightArm: { parent: "RightShoulder", pivot: [0.15, 0.97, 0] },
  RightForeArm: { parent: "RightArm", pivot: [0.35, 0.97, 0] },
  RightHand: { parent: "RightForeArm", pivot: [0.53, 0.97, 0] },
  LeftUpLeg: { parent: "Hips", pivot: [-0.085, 0.6, 0] },
  LeftLeg: { parent: "LeftUpLeg", pivot: [-0.085, 0.33, 0] },
  LeftFoot: { parent: "LeftLeg", pivot: [-0.085, 0.08, 0] },
  LeftToeBase: { parent: "LeftFoot", pivot: [-0.085, 0.03, -0.1] },
  RightUpLeg: { parent: "Hips", pivot: [0.085, 0.6, 0] },
  RightLeg: { parent: "RightUpLeg", pivot: [0.085, 0.33, 0] },
  RightFoot: { parent: "RightLeg", pivot: [0.085, 0.08, 0] },
  RightToeBase: { parent: "RightFoot", pivot: [0.085, 0.03, -0.1] },
  Tail: { parent: "Hips", pivot: [0, 0.6, 0.13] },
  Tail1: { parent: "Tail", pivot: [0, 0.68, 0.3] },
  EarL: { parent: "Head", pivot: [-0.2, 1.55, 0] },
  EarR: { parent: "Head", pivot: [0.2, 1.55, 0] },
  // blink lids: a closed-eye patch per eye, built a thousand times too small so it is invisible at rest;
  // scripts/critter.js scales the bone up for a tenth of a second to blink
  LidL: { parent: "Head", pivot: [-0.132, 1.365, -0.3] },
  LidR: { parent: "Head", pivot: [0.132, 1.365, -0.3] },
};
export function skeleton() { return BONES; }
const NAMES = Object.keys(BONES);
const IDX = Object.fromEntries(NAMES.map((n, i) => [n, i]));

export function collider() { return { kind: "capsule", radius: 0.3, halfHeight: 0.55, center: [0, 0.86, 0] }; }

// ---------- species ----------
const SPECIES = {
  cat:     { fangs: true, fur: "#f2a65a", belly: "#fff1dc", ears: "point", earS: 1.0, tail: "thin", nose: "#ff8fa3", whisk: true },
  dog:     { fur: "#c98b55", belly: "#fbe8cf", ears: "flop", tail: "wag", nose: "#2a1c18", muzzle: true },
  fox:     { fangs: true, fur: "#f07a2e", belly: "#ffffff", ears: "point", earS: 1.35, tail: "bushy", tip: "#ffffff", nose: "#231816", muzzle: true, socks: "#3a2622", cheeks: true },
  bunny:   { fur: "#f4efe9", belly: "#ffffff", ears: "long", tail: "puff", nose: "#ff9fb4", buck: true },
  bear:    { fur: "#9a6440", belly: "#e8c79e", ears: "round", earS: 1.0, tail: "stub", nose: "#2a1c18", muzzle: true },
  deer:    { fur: "#b9804e", belly: "#fff3e2", ears: "leaf", tail: "stub", nose: "#3a1f1a", muzzle: true, antlers: true, spots: true },
  mouse:   { fur: "#b9b3c2", belly: "#f6eef4", ears: "round", earS: 1.7, tail: "thin", nose: "#ff8fa3", whisk: true },
  wolf:    { fangs: true, fur: "#6f7d93", belly: "#e3e8f0", ears: "point", earS: 1.2, tail: "bushy", tip: "#e3e8f0", nose: "#1c1a20", muzzle: true, cheeks: true },
  panda:   { fur: "#f7f3ee", belly: "#ffffff", ears: "round", earS: 1.0, earCol: "#2b2530", tail: "stub", nose: "#1c1a20", muzzle: true, dark: "#2b2530", patch: "#2b2530" },
  pig:     { fur: "#ffb3c1", belly: "#ffd9e0", ears: "point", earS: 0.62, tail: "stub", nose: "#ff97aa", snout: true },
  sheep:   { fur: "#f6f1e7", belly: "#ffffff", headFur: "#5d5560", ears: "flop", earS: 0.5, ear2: "#5d5560", tail: "puff", nose: "#2a1c18", muzzle: true, wool: true, socks: "#5d5560" },
  lion:    { fur: "#ebb04e", belly: "#fbe3b0", ears: "round", earS: 0.9, tail: "thin", nose: "#8a4a2a", muzzle: true, mane: "#a3592a", fangs: true, tailTuft: "#a3592a" },
  raccoon: { fur: "#8b8a92", belly: "#e9e6ea", ears: "round", earS: 1.0, tail: "ringed", tip: "#3a3840", nose: "#1c1a20", muzzle: true, mask: "#3a3840" },
};

// ---------- tiny vector kit ----------
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function geometry(ctx) {
  const P = ctx.params || {};
  const sp = SPECIES[P.species] || SPECIES.cat;
  const fem = P.sex === "f";
  const FUR = P.fur || sp.fur, BELLY = P.belly || sp.belly, EYE = P.eye || "#2b2233";
  const TOP = P.top || "#e85d75", BOT = P.bottom || "#3d5a98";
  const outfit = P.outfit || "tee", acc = P.acc || "none", expr = P.expr || "grin";
  const hi = ctx.lod <= 1, mid = ctx.lod <= 2, lowest = ctx.lod >= 4;
  const SEG = hi ? 28 : mid ? 18 : ctx.lod === 3 ? 12 : 8;

  // skin weights, one record per emitted vertex
  const J = [], W = [];
  let wOverride = null; // a fixed weight map for a whole part (ears, tail, skirt)
  function autoW(p) {
    if (wOverride) return wOverride;
    const [x, y, z] = p, side = x < 0 ? "Left" : "Right", ax = Math.abs(x);
    if (y > 1.04) return { Head: 1 };
    if (y > 0.86 && ax > 0.13) { // arms (T-pose along X)
      if (ax < 0.2) return { Spine2: 1 - sstep(0.13, 0.2, ax), [side + "Arm"]: sstep(0.13, 0.2, ax) };
      const e = sstep(0.31, 0.39, ax), h = sstep(0.5, 0.56, ax);
      if (h > 0) return { [side + "ForeArm"]: 1 - h, [side + "Hand"]: h };
      return { [side + "Arm"]: 1 - e, [side + "ForeArm"]: e };
    }
    if (y > 0.97) return { Spine2: 1 - sstep(0.97, 1.04, y), Head: sstep(0.97, 1.04, y) };
    if (y < 0.6 && ax > 0.015) {
      if (y > 0.5) { const t = sstep(0.6, 0.5, y); return { Hips: 1 - t, [side + "UpLeg"]: t }; }
      if (y > 0.26) { const k = sstep(0.38, 0.28, y); return { [side + "UpLeg"]: 1 - k, [side + "Leg"]: k }; }
      if (y > 0.12) return { [side + "Leg"]: 1 };
      const f = sstep(0.12, 0.08, y); return z < -0.07 ? { [side + "Foot"]: 0.5, [side + "ToeBase"]: 0.5 } : { [side + "Leg"]: 1 - f, [side + "Foot"]: f };
    }
    if (y < 0.68) return { Hips: 1 };
    if (y < 0.78) { const t = sstep(0.68, 0.78, y); return { Hips: 1 - t, Spine: t }; }
    if (y < 0.88) { const t = sstep(0.78, 0.88, y); return { Spine: 1 - t, Spine1: t }; }
    const t = sstep(0.88, 0.95, y); return { Spine1: 1 - t, Spine2: t };
  }
  function pushW(p) {
    const w = autoW(p), es = Object.entries(w).filter(([, v]) => v > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = 0; for (const [, v] of es) s += v;
    for (let i = 0; i < 4; i++) { J.push(es[i] ? IDX[es[i][0]] : 0); W.push(es[i] ? es[i][1] / s : 0); }
  }
  let SHRINK = null; // while a blink lid is built: shrink every vertex toward its bone pivot
  const shr = (p) => [SHRINK.c[0] + (p[0] - SHRINK.c[0]) * SHRINK.k, SHRINK.c[1] + (p[1] - SHRINK.c[1]) * SHRINK.k, SHRINK.c[2] + (p[2] - SHRINK.c[2]) * SHRINK.k];
  let REV = false; // true while the ink outline shell is built: its faces point inward
  const HIP = fem ? [0.17, 0.11, 0.14] : [0.135, 0.1, 0.12];
  const tri = (a, b, c) => { if (REV) { const x = b; b = c; c = x; } if (SHRINK) { a = shr(a); b = shr(b); c = shr(c); } ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); pushW(a); pushW(b); pushW(c); };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };

  // ellipsoid; colorAt(p, n) may switch paint per face; clip(p) drops faces
  function ell(c, r, colorAt, opts = {}) {
    const U = opts.seg || SEG, V = Math.max(6, Math.round(U / 2));
    const pt = (i, j) => { const th = (i / U) * Math.PI * 2, ph = (j / V) * Math.PI; const s = Math.sin(ph); return [c[0] + r[0] * s * Math.cos(th), c[1] + r[1] * Math.cos(ph), c[2] + r[2] * s * Math.sin(th)]; };
    for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) {
      const a = pt(i, j), b = pt(i + 1, j), cc = pt(i + 1, j + 1), d = pt(i, j + 1);
      const m = mul3(add3(add3(a, b), add3(cc, d)), 0.25);
      if (opts.clip && opts.clip(m)) continue;
      if (colorAt) colorAt(m, norm3(sub3(m, c)));
      if (j === 0) tri(a, cc, d); else if (j === V - 1) tri(a, b, cc); else quad(a, b, cc, d);
    }
  }
  // loft: a tube along a path with elliptical sections; radius(t) -> [a, b]; capped
  function loft(path, radius, upHint, colorAt, M = hi ? 14 : 9) {
    const n = path.length, rings = [];
    for (let i = 0; i < n; i++) {
      const T = norm3(sub3(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]));
      const S = norm3(cross3(T, upHint)), N = cross3(S, T), t = i / (n - 1), [ra, rb] = radius(t);
      const ring = [];
      for (let k = 0; k < M; k++) { const a = (k / M) * Math.PI * 2; ring.push(add3(path[i], add3(mul3(S, Math.cos(a) * ra), mul3(N, Math.sin(a) * rb)))); }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) {
      if (colorAt) colorAt(i / (n - 1));
      for (let k = 0; k < M; k++) { const k2 = (k + 1) % M; quad(rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2]); }
    }
    if (colorAt) colorAt(0);
    for (let k = 0; k < M; k++) tri(path[0], rings[0][k], rings[0][(k + 1) % M]);
    if (colorAt) colorAt(1);
    for (let k = 0; k < M; k++) tri(path[n - 1], rings[n - 1][(k + 1) % M], rings[n - 1][k]);
  }
  // a limb: a capsule between two points
  function limb(a, b, ra, rb, M) {
    const L = 10, path = [];
    for (let i = 0; i <= L; i++) path.push([lerp(a[0], b[0], i / L), lerp(a[1], b[1], i / L), lerp(a[2], b[2], i / L)]);
    const up = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) ? [0, 0, -1] : [0, 1, 0];
    // round ends: the radius closes like a hemisphere over the last few rings
    loft(path, (t) => { const r = lerp(ra, rb, t), e = Math.min(t, 1 - t) * L / 1.2; const k = e >= 1 ? 1 : Math.sqrt(Math.max(0.05, 1 - (1 - e) * (1 - e))); return [r * k, r * k]; }, up, null, M);
  }

  // ---------- the face: shapes drawn onto the head's surface ----------
  const onHead = (u, v, e) => {
    const k = 1 - (u / HR[0]) ** 2 - (v / HR[1]) ** 2;
    return [HC[0] + u * (1 + e), HC[1] + v * (1 + e), HC[2] - HR[2] * (1 + e) * Math.sqrt(Math.max(0.0004, k))];
  };
  const fill = (poly, e, rings = hi ? 3 : 2) => { // star-shaped polygon in face (u, v)
    let cu = 0, cv = 0; for (const [u, v] of poly) { cu += u; cv += v; } cu /= poly.length; cv /= poly.length;
    for (let i = 0; i < poly.length; i++) {
      const p0 = poly[i], p1 = poly[(i + 1) % poly.length];
      for (let r = 0; r < rings; r++) {
        const t0 = r / rings, t1 = (r + 1) / rings;
        const a = onHead(lerp(cu, p0[0], t0), lerp(cv, p0[1], t0), e), b = onHead(lerp(cu, p1[0], t0), lerp(cv, p1[1], t0), e);
        const c = onHead(lerp(cu, p1[0], t1), lerp(cv, p1[1], t1), e), d = onHead(lerp(cu, p0[0], t1), lerp(cv, p0[1], t1), e);
        if (r === 0) tri(a, d, c); else quad(a, d, c, b);
      }
    }
  };
  const ellipse = (cu, cv, ru, rv, n = hi ? 28 : 16, rot = 0) => {
    const o = []; for (let i = 0; i < n; i++) { const a = -(i / n) * Math.PI * 2, x = Math.cos(a) * ru, y = Math.sin(a) * rv; o.push([cu + x * Math.cos(rot) - y * Math.sin(rot), cv + x * Math.sin(rot) + y * Math.cos(rot)]); } return o;
  };
  // a stroke between two curves: top(t) and bottom(t) -> [u, v]
  const band = (top, bot, e, n = hi ? 20 : 10) => {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, a = top(t0), b = top(t1), c = bot(t1), d = bot(t0);
      quad(onHead(a[0], a[1], e), onHead(d[0], d[1], e), onHead(c[0], c[1], e), onHead(b[0], b[1], e));
    }
  };
  const stroke = (f, w, e, n) => band((t) => { const p = f(t); return [p[0], p[1] + w / 2]; }, (t) => { const p = f(t); return [p[0], p[1] - w / 2]; }, e, n);
  const INK = "#1d1420";

  // ---------- body ----------
  // The cartoon ink line comes from the material's native `outline` (set where the critter is placed: templates/player.js, scripts/critter.js).
  // An inverted-hull shell (every part built a second time, larger, with its faces flipped) is kept behind INK_SHELL, but this engine draws
  // both sides of a face, so the shell covers the fur: leave it off.
  const INK_SHELL = false;
  ctx.smooth();
  ctx.roughness(1);
  ctx.metalness(0);
  const furPaint = (p, nrm) => {
    let col = FUR;
    if (nrm[2] < -0.45 && Math.abs(p[0]) < 0.11 && p[1] > 0.62 && p[1] < 0.98) col = BELLY; // tummy patch
    if (sp.spots && nrm[2] > 0.3 && p[1] > 0.7 && ((Math.sin(p[0] * 61) + Math.sin(p[1] * 53)) > 1.3)) col = "#f6e7cf";
    ctx.color(col);
  };
  const tw = fem ? 0.135 : 0.15; // a small torso under a big head, like the reference bases
  const OUT = 0.011; // outline thickness in metres
  for (const inkPass of INK_SHELL ? [false, true] : [false]) {
    REV = inkPass;
    const k = inkPass ? OUT : 0;
    const col = (c) => ctx.color(inkPass ? INK : c);
    const EL = (c, r, colorAt, o) => ell(c, r.map((x) => x + k), inkPass ? null : colorAt, o);
    const LB = (a, b, ra, rb, M) => limb(a, b, ra + k, rb + k, M);
    const LF = (path, radius, up, colorAt, M) => loft(path, inkPass ? (t) => radius(t).map((x) => x + k) : radius, up, inkPass ? null : colorAt, M);
    col(FUR);
    // torso: chest, waist, hips
    EL([0, 0.84, 0], [tw, 0.17, 0.125], furPaint);
    EL([0, 0.66, 0.005], HIP, furPaint);
    if (fem) for (const s of [-1, 1]) EL([s * 0.06, 0.875, -0.085], [0.068, 0.062, 0.06], () => ctx.color(FUR), { seg: hi ? 16 : 10 });
    // neck
    col(FUR); LB([0, 0.94, 0], [0, 1.06, 0], 0.065, 0.07, hi ? 12 : 8);
    // arms (T-pose), mitten hands with a thumb
    for (const s of [-1, 1]) {
      col(sp.dark || FUR); LB([s * 0.1, 0.965, 0], [s * 0.56, 0.965, 0], fem ? 0.04 : 0.044, 0.034, hi ? 12 : 8);
      col(sp.dark || sp.socks || FUR);
      EL([s * 0.6, 0.965, 0], [0.075, 0.058, 0.052], null, { seg: hi ? 16 : 10 });
      EL([s * 0.565, 0.975, -0.052], [0.026, 0.024, 0.034], null, { seg: hi ? 10 : 6 });
    }
    // legs, round feet
    for (const s of [-1, 1]) {
      const x = s * 0.085;
      col(sp.dark || FUR); LB([x, 0.64, 0], [x, sp.socks ? 0.3 : 0.06, 0], fem ? 0.068 : 0.06, 0.045, hi ? 12 : 8);
      if (sp.socks) { col(sp.socks); LB([x, 0.34, 0], [x, 0.06, 0], 0.049, 0.045, hi ? 12 : 8); }
      EL([x, 0.055, -0.035], [0.072, 0.058, 0.115], null, { seg: hi ? 16 : 10 });
    }
    // head
    col(sp.headFur || FUR);
    EL(HC, HR, (p, n) => ctx.color(sp.cheeks && n[2] < -0.2 && p[1] < 1.24 && Math.abs(p[0]) > 0.17 ? BELLY : (sp.headFur || FUR)), { seg: hi ? 36 : SEG });
    if (sp.wool) { col(FUR); for (const [x, y, z, r] of [[0, 1.62, -0.03, 0.1], [-0.14, 1.6, -0.05, 0.088], [0.14, 1.6, -0.05, 0.088], [-0.25, 1.5, -0.02, 0.078], [0.25, 1.5, -0.02, 0.078], [0, 1.64, 0.07, 0.092]]) EL([x, y, z], [r, r, r], null, { seg: hi ? 14 : 9 }); }
    if (sp.mane) { col(sp.mane); EL([0, 1.3, 0.1], [0.47, 0.41, 0.27], null, { seg: hi ? 24 : SEG }); }
    if (!inkPass && sp.cheeks && mid) for (const s of [-1, 1]) { // fluffy cheek tufts
      ctx.color(BELLY);
      for (let n = 0; n < 3; n++) { const a = -0.35 + n * 0.35; tri([s * 0.3, 1.22 + a * 0.12, -0.12], [s * (0.43 + 0.03 * (n === 1)), 1.18 + a * 0.15, -0.05], [s * 0.31, 1.15 + a * 0.12, -0.02]); }
    }

    // ears
    const earBase = (s) => [s * 0.2, 1.56, 0.0];
    const ear = sp.ears, eS = sp.earS || 1;
    for (const s of [-1, 1]) {
      wOverride = { [s < 0 ? "EarL" : "EarR"]: 1 };
      const b = earBase(s);
      if (ear === "point" || ear === "leaf") {
        const h = 0.2 * eS, tilt = ear === "leaf" ? 0.9 : 0.25;
        const tip = [b[0] + s * h * Math.sin(tilt), b[1] + h * Math.cos(tilt), b[2] + 0.02];
        const path = []; for (let i = 0; i <= 8; i++) path.push([lerp(b[0], tip[0], i / 8), lerp(b[1] - 0.04, tip[1], i / 8), lerp(b[2], tip[2], i / 8)]);
        col(FUR); LF(path, (t) => [0.1 * eS * Math.pow(1 - t, 0.85) + 0.004, 0.035 * (1 - t) + 0.004], [0, 0, -1], null);
        if (!inkPass) {
          // pink inner ear on the front
          ctx.color(ear === "leaf" ? "#f3c3b8" : "#ffb3c6");
          const inn = []; for (let i = 0; i <= 6; i++) inn.push([lerp(b[0], tip[0], i / 6) * 1.0, lerp(b[1], tip[1], i / 6) - 0.01, lerp(b[2], tip[2], i / 6) - 0.022]);
          loft(inn, (t) => [0.062 * eS * Math.pow(1 - t, 0.9) + 0.003, 0.012], [0, 0, -1], null, 8);
          if (ear === "point" && sp.tip && P.species === "fox") { ctx.color("#2a1c18"); const tp = []; for (let i = 0; i <= 4; i++) tp.push([lerp(path[6][0], tip[0], i / 4), lerp(path[6][1], tip[1], i / 4), lerp(path[6][2], tip[2], i / 4) + 0.003]); loft(tp, (t) => [0.03 * (1 - t) + 0.004, 0.012 * (1 - t) + 0.003], [0, 0, -1], null, 8); }
        }
      } else if (ear === "round") {
        const c = [s * 0.24, 1.58, 0.02], r = 0.085 * eS;
        col(sp.earCol || FUR); EL(c, [r, r, 0.035], null, { seg: hi ? 16 : 10 });
        if (!inkPass && !sp.earCol) { ctx.color(P.species === "mouse" ? "#ffb3c6" : BELLY); ell([c[0], c[1] - 0.005, c[2] - 0.028], [r * 0.62, r * 0.62, 0.012], null, { seg: hi ? 14 : 8 }); }
      } else if (ear === "long") {
        const path = []; for (let i = 0; i <= 10; i++) { const t = i / 10; path.push([s * (0.12 + 0.07 * t + 0.05 * t * t), 1.55 + 0.42 * t, 0.03 + 0.06 * t * t]); }
        col(FUR); LF(path, (t) => [0.055 * Math.sin(Math.PI * (0.15 + 0.8 * t)) + 0.012, 0.022], [0, 0, -1], null);
        if (!inkPass) { ctx.color("#ffb3c6"); loft(path.map((p) => [p[0], p[1], p[2] - 0.016]), (t) => [0.034 * Math.sin(Math.PI * (0.2 + 0.7 * t)) + 0.004, 0.01], [0, 0, -1], null, 8); }
      } else if (ear === "flop") {
        const path = []; for (let i = 0; i <= 10; i++) { const t = i / 10; path.push([s * (0.3 + 0.08 * Math.sin(t * 2.4) * eS), 1.5 - 0.3 * eS * t, 0.02 - 0.02 * t]); }
        col(P.ear2 || sp.ear2 || "#7a4f32"); LF(path, (t) => [0.03, (0.075 * Math.sin(Math.PI * (0.2 + 0.75 * t)) + 0.02) * (0.6 + 0.4 * eS)], [1, 0, 0], null);
      }
      wOverride = null;
    }
    // antlers
    if (sp.antlers && !lowest) {
      col("#e9d9b8");
      for (const s of [-1, 1]) {
        wOverride = { Head: 1 };
        const base = [s * 0.12, 1.6, 0.02], mid1 = [s * 0.18, 1.78, 0.04], top = [s * 0.14, 1.92, 0.02];
        LB(base, mid1, 0.022, 0.017, 8); LB(mid1, top, 0.017, 0.01, 8);
        LB(mid1, [s * 0.29, 1.86, 0.02], 0.014, 0.008, 8); LB([s * 0.15, 1.69, 0.03], [s * 0.06, 1.78, 0.0], 0.013, 0.008, 8);
        wOverride = null;
      }
    }
    // tail
    {
      wOverride = { Tail: 0.35, Tail1: 0.65 };
      const T = sp.tail, path = [];
      const pathOf = (n, f) => { for (let i = 0; i <= n; i++) path.push(f(i / n)); };
      if (T === "thin") { pathOf(12, (t) => [0.06 * Math.sin(t * 3), 0.6 + 0.38 * t, 0.13 + 0.22 * Math.sin(t * 1.6)]); col(FUR); LF(path, (t) => [0.028 * (1 - t * 0.4), 0.028 * (1 - t * 0.4)], [1, 0, 0], null, 8); if (sp.tailTuft) { col(sp.tailTuft); EL([0.0085, 0.99, 0.35], [0.042, 0.062, 0.042], null, { seg: hi ? 12 : 8 }); } }
      else if (T === "bushy" || T === "ringed") {
        pathOf(12, (t) => [0.05 * Math.sin(t * 2.5), 0.58 + 0.32 * Math.sin(t * 1.4), 0.12 + 0.34 * t]);
        LF(path, (t) => { const r = (T === "bushy" ? 0.105 : 0.075) * Math.sin(Math.PI * (0.12 + 0.82 * t)) + 0.02; return [r, r]; }, [1, 0, 0],
          (t) => ctx.color(T === "ringed" ? (Math.floor(t * 7) % 2 ? sp.tip : FUR) : (t > 0.72 ? sp.tip : FUR)), 12);
      } else if (T === "wag") { pathOf(8, (t) => [0, 0.6 + 0.22 * t, 0.13 + 0.12 * t - 0.04 * t * t]); col(FUR); LF(path, (t) => [0.035 * (1 - 0.5 * t) + 0.01, 0.035 * (1 - 0.5 * t) + 0.01], [1, 0, 0], null, 8); }
      else if (T === "puff") { col("#ffffff"); EL([0, 0.62, 0.16], [0.07, 0.07, 0.065], null, { seg: hi ? 14 : 8 }); }
      else { col(FUR); EL([0, 0.63, 0.14], [0.05, 0.06, 0.05], null, { seg: hi ? 12 : 8 }); }
      wOverride = null;
    }
  }
  REV = false;

  // ---------- clothes: shells a hair outside the body ----------
  const inflate = (c, r, k) => [c, r.map((x) => x + k)];
  const sleeve = (len, col, r0 = 0.052) => { ctx.color(col); for (const s of [-1, 1]) limb([s * 0.1, 0.965, 0], [s * (0.15 + len), 0.965, 0], r0, r0 - 0.004, hi ? 12 : 8); };
  const shirt = (col, low = 0.6) => {
    ctx.color(col);
    ell(...inflate([0, 0.84, 0], [tw, 0.17, 0.125], 0.012), null, { clip: (p) => p[1] < low });
    ell(...inflate([0, 0.66, 0.005], HIP, 0.012), null, { clip: (p) => p[1] < low || p[1] > 0.74 });
    if (fem) for (const s of [-1, 1]) ell([s * 0.06, 0.876, -0.09], [0.078, 0.071, 0.068], null, { seg: hi ? 16 : 10 });
  };
  const pants = (col, knee = 0.12, shorts = false) => {
    ctx.color(col);
    ell(...inflate([0, 0.66, 0.005], HIP, 0.016), null, { clip: (p) => p[1] > 0.7 });
    for (const s of [-1, 1]) { const x = s * 0.085; limb([x, 0.66, 0], [x, shorts ? 0.38 : knee, 0], (fem ? 0.07 : 0.062) + 0.016, shorts ? 0.07 : 0.06, hi ? 12 : 8); }
  };
  const skirt = (col, top = 0.7, bottom = 0.42, flare = 0.27) => {
    wOverride = { Hips: 1 };
    ctx.color(col);
    const M = hi ? 32 : 16, R = hi ? 6 : 3;
    const ring = (t) => { const y = lerp(top, bottom, t), rx = lerp(fem ? 0.185 : 0.15, flare, t), rz = lerp(0.15, flare * 0.85, t), o = []; for (let k = 0; k < M; k++) { const a = (k / M) * Math.PI * 2, wav = t * 0.012 * Math.sin(a * 8); o.push([Math.cos(a) * (rx + wav), y, Math.sin(a) * (rz + wav) + 0.005]); } return o; };
    for (let r = 0; r < R; r++) { const A = ring(r / R), B = ring((r + 1) / R); for (let k = 0; k < M; k++) { const k2 = (k + 1) % M; quad(A[k], A[k2], B[k2], B[k]); } }
    wOverride = null;
  };
  if (outfit === "tee") { shirt(TOP); sleeve(0.09, TOP); pants(BOT, 0.13); }
  else if (outfit === "hoodie") {
    shirt(TOP, 0.58); sleeve(0.37, TOP, 0.054); pants(BOT, 0.13);
    ctx.color(TOP); wOverride = { Spine2: 0.5, Head: 0.5 }; ell([0, 1.04, 0.07], [0.15, 0.06, 0.12], null, { seg: hi ? 18 : 10 }); wOverride = null; // hood bunched behind the neck
    ctx.color("#ffffff"); for (const s of [-1, 1]) limb([s * 0.035, 0.98, -0.135], [s * 0.04, 0.88, -0.145], 0.006, 0.006, 6); // drawstrings
    ctx.color(BOT); ell([0, 0.72, -0.15], [0.09, 0.04, 0.012], null, { seg: 12 }); // pocket
  }
  else if (outfit === "dress") { shirt(TOP, 0.66); sleeve(0.05, TOP, 0.056); skirt(TOP, 0.72, 0.38, 0.3); ctx.color("#ffffff"); ell([0, 0.73, 0], [0.165, 0.018, 0.145], null); }
  else if (outfit === "skirt") { shirt(TOP); sleeve(0.09, TOP); skirt(BOT, 0.7, 0.44, 0.25); }
  else if (outfit === "overalls") {
    shirt(TOP); sleeve(0.1, TOP); pants(BOT, 0.13);
    ctx.color(BOT); ell([0, 0.8, -0.115], [0.11, 0.1, 0.035], null, { seg: 14 }); // bib
    for (const s of [-1, 1]) limb([s * 0.08, 0.86, -0.135], [s * 0.09, 1.0, 0.0], 0.016, 0.016, 6), limb([s * 0.09, 1.0, 0], [s * 0.08, 0.8, 0.14], 0.016, 0.016, 6);
    ctx.color("#f5d36a"); for (const s of [-1, 1]) ell([s * 0.09, 0.945, -0.06], [0.014, 0.014, 0.008], null, { seg: 8 });
  }
  else if (outfit === "sweater") { shirt(TOP, 0.56); sleeve(0.38, TOP, 0.056); pants(BOT, 0.13, true); ctx.color("#ffffff"); for (let k = 0; k < 2; k++) ell([0, 0.8 + k * 0.07, 0], [tw + 0.016, 0.009, 0.141], null, { clip: (p) => p[2] > 0 }); }

  else if (outfit === "jacket") {
    shirt(TOP, 0.56); sleeve(0.38, TOP, 0.056); pants(BOT, 0.13);
    ctx.color(INK); limb([0, 0.97, -0.13], [0, 0.6, -0.135], 0.006, 0.006, 6); // zip
    ctx.color(TOP); ell([0, 0.99, 0.0], [0.1, 0.03, 0.09], null, { seg: hi ? 16 : 10 }); // collar
  }
  else if (outfit === "apron") { // a half apron from the waist down, so nothing sits on the chest
    shirt(TOP); sleeve(0.09, TOP); pants(BOT, 0.13);
    ctx.color("#fdf6e3"); ell([0, 0.58, -0.125], [0.15, 0.13, 0.04], null, { seg: hi ? 16 : 10 });
    ctx.color("#e8d9b5"); ell([0, 0.73, 0], [0.172, 0.018, 0.15], null, { seg: hi ? 20 : 12 }); // waistband
    ctx.color(TOP); ell([0, 0.55, -0.16], [0.05, 0.04, 0.012], null, { seg: 10 }); // pocket
  }
  else if (outfit === "pajamas") {
    shirt(TOP, 0.56); sleeve(0.38, TOP, 0.056); pants(BOT, 0.07);
    ctx.color("#ffffff"); for (let k = 0; k < 3; k++) ell([0, 0.93 - k * 0.07, -0.138], [0.012, 0.012, 0.006], null, { seg: 8 });
  }

  // accessories (body side)
  if (acc === "scarf") { ctx.color(TOP === "#e85d75" ? "#f3c64a" : TOP); wOverride = { Spine2: 0.5, Neck: 0.5 }; ell([0, 1.0, 0], [0.105, 0.04, 0.1], null); limb([0.05, 0.98, -0.09], [0.07, 0.8, -0.13], 0.03, 0.026, 8); wOverride = null; }

  // ---------- face ----------
  ctx.flat();
  // muzzle patch and markings sit lowest
  if (sp.mask) { ctx.color(sp.mask); fill([[-0.3, 0.12], [-0.05, 0.06], [0.0, 0.03], [0.05, 0.06], [0.3, 0.12], [0.32, -0.04], [0.15, -0.06], [0.0, -0.03], [-0.15, -0.06], [-0.32, -0.04]], 0.003); }
  if (sp.muzzle) { ctx.color(BELLY); fill(ellipse(0, -0.11, 0.135, 0.095), 0.004); }

  const E = (() => { // expression table
    const t = { eye: "open", pupil: 1, lid: 0, lidTilt: 0, brow: 0, browY: 0, mouth: "grin", blush: false, tear: false, look: 0, sweat: false, wide: false };
    switch (expr) {
      case "smile": t.mouth = "smile"; break;
      case "joy": Object.assign(t, { eye: "closed", mouth: "grin", blush: true, browY: 0.02 }); break;
      case "laugh": Object.assign(t, { eye: "closed", mouth: "laugh", blush: true, browY: 0.03, tear: "joy" }); break;
      case "surprised": Object.assign(t, { pupil: 0.55, browY: 0.03, mouth: "o" }); break;
      case "sad": Object.assign(t, { brow: -0.4, lid: 0.15, lidTilt: -0.12, mouth: "frown", tear: true, pupil: 1.1 }); break;
      case "cry": Object.assign(t, { brow: -0.5, lid: 0.1, lidTilt: -0.1, mouth: "wail", tear: "stream", pupil: 1.15 }); break;
      case "angry": Object.assign(t, { brow: 0.5, lid: 0.32, lidTilt: 0.25, mouth: "gritted", pupil: 0.8 }); break;
      case "evil": Object.assign(t, { brow: 0.55, lid: 0.36, lidTilt: 0.3, mouth: "grin", wide: true, pupil: 0.62 }); break;
      case "smug": Object.assign(t, { lid: 0.45, brow: 0.12, mouth: "smirk", blush: true }); break;
      case "scared": Object.assign(t, { pupil: 0.45, brow: -0.45, browY: 0.02, mouth: "wavy", sweat: true }); break;
      case "sleepy": Object.assign(t, { lid: 0.6, brow: -0.1, mouth: "o_small" }); break;
      case "bored": Object.assign(t, { lid: 0.5, pupil: 0.8, mouth: "flat" }); break;
      case "love": Object.assign(t, { eye: "heart", mouth: "grin", blush: true }); break;
      case "sparkle": Object.assign(t, { eye: "star", mouth: "grin", blush: true, browY: 0.03 }); break;
      case "wink": Object.assign(t, { eye: "wink", mouth: "tongue", blush: true }); break;
      case "blep": Object.assign(t, { mouth: "blep", blush: true, browY: 0.015, pupil: 1.05 }); break;
      case "pout": Object.assign(t, { lid: 0.12, brow: 0.3, mouth: "pout", blush: true, pupil: 0.95 }); break;
      case "shy": Object.assign(t, { look: 1, brow: -0.25, lid: 0.08, mouth: "smile_small", blush: true, pupil: 0.95 }); break;
      case "kiss": Object.assign(t, { eye: "closed", mouth: "kiss", blush: true }); break;
      case "dizzy": Object.assign(t, { eye: "x", mouth: "wavy" }); break;
    }
    return t;
  })();

  // the eyes: a thick ink ring round a white, and one flat pupil (the references: big ringed eyes, no shine)
  const ESH = { round: [1, 1], tall: [0.88, 1.2], wide: [1.18, 0.86] }[P.eyes] || [1, 1];
  const EX = 0.132, EY = 0.065 + (ESH[1] - 1) * 0.07, ERU = 0.104 * ESH[0], ERV = 0.124 * ESH[1];
  const vmax = (u) => HR[1] * Math.sqrt(Math.max(0, 1 - (u / HR[0]) ** 2)) * 0.9;
  const hex2 = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixc = (h, to, f) => { const a = hex2(h), b = hex2(to); return "#" + a.map((x, i) => Math.round(x + (b[i] - x) * f).toString(16).padStart(2, "0")).join(""); };
  const star = (cu, cv, R, r, pts = 4) => { const o = []; for (let i = 0; i < pts * 2; i++) { const a = -(i / (pts * 2)) * Math.PI * 2 + Math.PI / 2, rad = i % 2 ? r : R; o.push([cu + Math.cos(a) * rad, cv + Math.sin(a) * rad]); } return o; };
  const brow = (s, cu) => {
    ctx.color(INK);
    const by = EY + ERV + 0.036 + E.browY;
    stroke((t) => { const u = cu + (t - 0.5) * 0.14; return [u, Math.min(by - E.brow * (u - cu) * s * -0.5 + 0.014 * Math.sin(Math.PI * t), vmax(u))]; }, 0.024, 0.008, 8);
  };
  if (sp.patch) { ctx.color(sp.patch); for (const s of [-1, 1]) fill(ellipse(s * EX, EY - 0.012, ERU + 0.05, ERV + 0.045, hi ? 28 : 16, s * 0.45), 0.004); }
  for (const s of [-1, 1]) {
    const cu = s * EX, closed = E.eye === "closed" || (E.eye === "wink" && s > 0);
    if (closed) { // a happy ^ arc, thick and round
      ctx.color(INK);
      stroke((t) => [cu + (t - 0.5) * 0.21, EY - 0.02 + 0.07 * Math.sin(Math.PI * t)], 0.032, 0.012);
      if (E.tear === "joy") { ctx.color("#8fd3ff"); fill(ellipse(cu + s * 0.12, EY - 0.01, 0.013, 0.024), 0.02); }
      brow(s, cu);
      continue;
    }
    if (E.eye === "x") { // knocked-out cross eyes
      ctx.color(INK);
      for (const sg of [-1, 1]) stroke((t) => { const d = (t - 0.5) * 0.105; return [cu + d, EY + sg * d]; }, 0.022, 0.012, 6);
      brow(s, cu);
      continue;
    }
    ctx.color(INK); fill(ellipse(cu, EY, ERU + 0.02, ERV + 0.02), 0.006);
    ctx.color("#ffffff"); fill(ellipse(cu, EY, ERU, ERV), 0.009);
    const pr = E.pupil, pu = cu - s * 0.006 + E.look * 0.032, pv = EY - 0.012;
    if (E.eye === "heart") {
      ctx.color("#ff3d6e");
      const h = []; for (let i = 0; i < 24; i++) { const a = -(i / 24) * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); h.push([pu + x * 0.0052, pv + 0.01 + y * 0.0052]); }
      fill(h, 0.012);
    } else {
      // one big flat pupil in the eye colour, darkened, like the reference bases: no rings, no glints
      ctx.color(mixc(EYE, "#0b0710", 0.4)); fill(ellipse(pu, pv, 0.074 * pr, 0.094 * pr), 0.012);
      if (E.eye === "star") { ctx.color("#ffffff"); fill(star(pu, pv, 0.062, 0.018), 0.018); }
    }
    if (E.lid > 0) { // a fur-coloured lid closing from the top, tilted
      ctx.color(FUR);
      const cut = EY + ERV + 0.016 - E.lid * 2 * (ERV + 0.016), poly = [];
      const tiltAt = (u) => cut + E.lidTilt * (u - cu) * s * -1;
      for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14), u = cu + Math.cos(a) * (ERU + 0.03), v = EY + Math.sin(a) * (ERV + 0.03); poly.push([u, Math.max(v, tiltAt(u))]); }
      fill(poly.reverse().concat([]), 0.021);
      ctx.color(INK); stroke((t) => { const u = cu + (t - 0.5) * 2 * (ERU + 0.018); const kk = 1 - ((u - cu) / (ERU + 0.02)) ** 2; return [u, Math.min(tiltAt(u), EY + Math.sqrt(Math.max(0, kk)) * (ERV + 0.02))]; }, 0.016, 0.022);
    }
    if (fem) { // lashes flicking out at the outer corner
      ctx.color(INK);
      for (let n = 0; n < 2; n++) {
        const a = 0.45 + n * 0.36, bu = cu + s * Math.cos(a) * (ERU + 0.014), bv = EY + Math.sin(a) * (ERV + 0.014);
        tri(onHead(bu, bv + 0.008, 0.02), onHead(bu + s * 0.055 * Math.cos(a - 0.1), bv + 0.05 * Math.sin(a + 0.5) + 0.012, 0.02), onHead(bu - s * 0.006, bv - 0.008, 0.02));
        if (s < 0) tri(onHead(bu, bv + 0.008, 0.02), onHead(bu - s * 0.006, bv - 0.008, 0.02), onHead(bu + s * 0.055 * Math.cos(a - 0.1), bv + 0.05 * Math.sin(a + 0.5) + 0.012, 0.02));
      }
    }
    if (E.tear === true) { ctx.color("#8fd3ff"); fill(ellipse(cu + s * 0.05, EY - ERV - 0.01, 0.018, 0.03), 0.02); }
    if (E.tear === "stream") {
      ctx.color("#8fd3ff");
      fill(ellipse(cu + s * 0.03, EY - ERV - 0.03, 0.026, 0.045), 0.02); fill(ellipse(cu + s * 0.045, EY - ERV - 0.105, 0.02, 0.04), 0.02);
    }
    { // the blink lid: skin over the eye with a soft closed-eye line, tiny at rest and scaled up by scripts/critter.js
      wOverride = { [s < 0 ? "LidL" : "LidR"]: 1 };
      SHRINK = { c: [s * 0.132, 1.365, -0.3], k: 1 / 1000 };
      ctx.color(sp.patch || sp.headFur || FUR); fill(ellipse(cu, EY, ERU + 0.028, ERV + 0.026, hi ? 24 : 14), 0.03);
      ctx.color(INK); stroke((t) => [cu + (t - 0.5) * 2 * (ERU + 0.005), EY - 0.012 - 0.032 * Math.sin(Math.PI * t)], 0.028, 0.034, 10);
      SHRINK = null; wOverride = null;
    }
    brow(s, cu);
  }
  if (E.blush) { ctx.color("#ff8aa8"); for (const s of [-1, 1]) fill(ellipse(s * 0.225, -0.075, 0.055, 0.03), 0.006); }
  if (E.sweat) { ctx.color("#8fd3ff"); fill(ellipse(0.245, 0.17, 0.02, 0.034), 0.02); }

  // nose
  if (sp.snout) { // a round pig snout with two nostrils
    ctx.color(sp.nose); fill(ellipse(0, -0.062, 0.064, 0.046), 0.012);
    ctx.color(INK); for (const s of [-1, 1]) fill(ellipse(s * 0.022, -0.062, 0.009, 0.015, 8), 0.016);
  } else {
    ctx.color(sp.nose);
    fill([[-0.034, -0.035], [0.034, -0.035], [0.02, -0.06], [0, -0.068], [-0.02, -0.06]], 0.012);
  }
  if (sp.whisk && mid) { ctx.color(INK); for (const s of [-1, 1]) for (let n = 0; n < 2; n++) stroke((t) => [s * (0.17 + t * 0.14), -0.1 + n * 0.03 + t * (0.01 - n * 0.03)], 0.007, 0.008, 4); }

  // markings (a wardrobe choice)
  {
    const dark = mixc(FUR, "#1d1420", 0.45);
    if (P.marks === "freckles") { ctx.color(dark); for (const s of [-1, 1]) for (let n = 0; n < 5; n++) fill(ellipse(s * (0.17 + (n % 3) * 0.032 + (n > 2 ? 0.016 : 0)), -0.04 - (n > 2 ? 0.026 : 0) - 0.006 * (n % 2), 0.0085, 0.0085, 8), 0.005); }
    else if (P.marks === "stripes") { ctx.color(dark); for (const [u, h] of [[-0.075, 0.05], [0, 0.07], [0.075, 0.05]]) fill(ellipse(u, 0.255 - (0.07 - h) * 0.4, 0.011, h * 0.5, 10), 0.005); }
    else if (P.marks === "patch") { ctx.color(dark); fill(ellipse(-EX, EY - 0.005, 0.15, 0.17), 0.003); }
    else if (P.marks === "heart") {
      ctx.color("#ff6f9a");
      const h = []; for (let i = 0; i < 20; i++) { const a = -(i / 20) * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); h.push([-0.255 + x * 0.0016, -0.012 + y * 0.0016]); }
      fill(h, 0.005);
    }
  }

  // mouth
  const MY = -0.135;
  ctx.color(INK);
  const MO = E.mouth;
  if (MO === "grin" || MO === "laugh" || MO === "tongue" || MO === "gritted") {
    const w = MO === "gritted" ? 0.1 : MO === "laugh" ? 0.13 : E.wide ? 0.135 : 0.122, D = MO === "laugh" ? 0.125 : E.wide ? 0.1 : 0.09, cv = MO === "laugh" ? 1.3 : 1.1;
    const up = (t) => { const u = (t - 0.5) * 2 * w; return [u, MY + 0.03 + cv * u * u]; };
    const lo = (t) => { const u = (t - 0.5) * 2 * w; return MO === "gritted" ? [u, MY - 0.035 + 0.8 * u * u] : [u, MY + 0.03 + cv * u * u - D * Math.sin(Math.PI * t) ** 0.8]; };
    // ink outline, then the dark mouth
    band((t) => { const p = up(t); return [p[0] * 1.07, p[1] + 0.013]; }, (t) => { const p = lo(t); return [p[0] * 1.07, p[1] - 0.013]; }, 0.007);
    ctx.color("#5a1a2a"); band(up, lo, 0.01);
    if (MO !== "gritted") { // the tongue, with a lighter middle
      const tv = MY - 0.035 - (D - 0.09) * 0.55, tr = MO === "laugh" ? 0.07 : 0.055;
      ctx.color("#ff6f8e"); fill(ellipse(0.005, tv, tr, MO === "tongue" ? 0.045 : MO === "laugh" ? 0.04 : 0.028), 0.013);
    }
    if (MO === "tongue") { ctx.color("#ff6f8e"); fill(ellipse(0.02, MY - 0.075, 0.035, 0.035), 0.016); }
    ctx.color("#ffffff");
    if (MO === "gritted") {
      band((t) => up(0.04 + t * 0.92), (t) => lo(0.04 + t * 0.92), 0.014);
      ctx.color(INK); stroke((t) => [(t - 0.5) * 2 * w * 0.94, MY - 0.002 + 0.95 * ((t - 0.5) * 2 * w) ** 2], 0.006, 0.017);
      for (let n = 1; n < 6; n++) { const u = (n / 6 - 0.5) * 2 * w; band(() => [u - 0.003, MY + 0.03 + 1.1 * u * u], () => [u - 0.003, MY - 0.035 + 0.8 * u * u], 0.017, 1); }
    } else if (sp.buck) {
      for (const s of [-1, 1]) fill([[s * 0.002, MY + 0.03], [s * 0.036, MY + 0.031], [s * 0.034, MY - 0.018], [s * 0.004, MY - 0.018]], 0.016);
    } else {
      // a row of small round teeth under the top lip, and longer fangs on the sharp-toothed species
      const N = 6, len = MO === "laugh" ? 0.036 : 0.03;
      for (let n = 0; n < N; n++) {
        const t0 = 0.09 + (n / N) * 0.82, t1 = 0.09 + ((n + 1) / N) * 0.82, a = up(t0), b = up(t1), m = up((t0 + t1) / 2), g = 0.0035;
        fill([[a[0] + g, a[1] + 0.004], [b[0] - g, b[1] + 0.004], [b[0] - g * 1.4, b[1] - len * 0.7], [m[0], m[1] - len], [a[0] + g * 1.4, a[1] - len * 0.7]], 0.014);
      }
      if (sp.fangs) for (const t of [0.27, 0.73]) { const a = up(t - 0.045), b = up(t + 0.045), m = up(t); fill([[a[0], a[1] + 0.004], [b[0], b[1] + 0.004], [m[0] + 0.001, m[1] - len - 0.03]], 0.0155); }
    }
  } else if (MO === "smile" || MO === "frown" || MO === "smirk") {
    const kk = MO === "frown" ? -1 : 1;
    stroke((t) => { const u = (t - 0.5) * 0.15 + (MO === "smirk" ? 0.02 : 0); const lift = MO === "smirk" ? (t > 0.5 ? 2.6 : 0.6) : 1.6; return [u, MY + 0.01 + kk * (lift * u * u) - (kk < 0 ? -0.02 : 0)]; }, 0.016, 0.01, 12);
    if (MO === "smirk" && !sp.buck) { ctx.color("#ffffff"); tri(onHead(0.06, MY + 0.022, 0.014), onHead(0.068, MY - 0.002, 0.014), onHead(0.078, MY + 0.028, 0.014)); }
  } else if (MO === "smile_small") {
    stroke((t) => { const u = (t - 0.5) * 0.09; return [u, MY + 0.016 + 2.2 * u * u]; }, 0.015, 0.01, 8);
  } else if (MO === "blep") { // a small smile and the tongue poking out
    stroke((t) => { const u = (t - 0.5) * 0.17; return [u, MY + 0.02 + 1.9 * u * u]; }, 0.016, 0.01, 12);
    ctx.color("#ff6f8e"); fill(ellipse(0.025, MY - 0.012, 0.032, 0.042), 0.013);
  } else if (MO === "wail") { // a wide open frown, tongue sliding out the bottom
    const w = 0.115, up = (t) => { const u = (t - 0.5) * 2 * w; return [u, MY + 0.03 - 1.0 * u * u]; };
    const lo = (t) => { const p = up(t); return [p[0], p[1] - 0.085 * Math.sin(Math.PI * t) ** 0.8]; };
    band((t) => { const p = up(t); return [p[0] * 1.07, p[1] + 0.013]; }, (t) => { const p = lo(t); return [p[0] * 1.07, p[1] - 0.013]; }, 0.007);
    ctx.color("#5a1a2a"); band(up, lo, 0.01);
    ctx.color("#ff6f8e"); fill(ellipse(0, MY - 0.05, 0.05, 0.022), 0.013);
  } else if (MO === "pout") { // a tiny wobbly downturned line
    stroke((t) => { const u = (t - 0.5) * 0.11; return [u, MY + 0.005 - 3 * u * u + 0.004 * Math.sin(t * Math.PI * 3)]; }, 0.015, 0.01, 10);
  } else if (MO === "flat") {
    stroke((t) => [(t - 0.5) * 0.1, MY + 0.008], 0.013, 0.01, 4);
  } else if (MO === "kiss") {
    ctx.color("#ff7a9a"); fill(ellipse(0, MY + 0.005, 0.034, 0.028), 0.01);
    ctx.color(INK); fill(ellipse(0.004, MY + 0.005, 0.012, 0.008, 8), 0.012);
  } else if (MO === "o" || MO === "o_small") {
    const r = MO === "o" ? 1 : 0.55;
    fill(ellipse(0, MY - 0.01, 0.042 * r, 0.05 * r), 0.008); ctx.color("#5a1a2a"); fill(ellipse(0, MY - 0.01, 0.03 * r, 0.038 * r), 0.011);
  } else if (MO === "wavy") {
    band((t) => { const u = (t - 0.5) * 0.18; return [u, MY + 0.012 * Math.sin(t * Math.PI * 4) + 0.02]; }, (t) => { const u = (t - 0.5) * 0.18; return [u, MY + 0.012 * Math.sin(t * Math.PI * 4) - 0.03]; }, 0.008);
    ctx.color("#ffffff"); band((t) => { const u = (t - 0.5) * 0.16; return [u, MY + 0.012 * Math.sin(t * Math.PI * 4) + 0.012]; }, (t) => { const u = (t - 0.5) * 0.16; return [u, MY + 0.012 * Math.sin(t * Math.PI * 4) - 0.022]; }, 0.011);
    ctx.color(INK); stroke((t) => [(t - 0.5) * 0.16, MY + 0.012 * Math.sin(t * Math.PI * 4) - 0.005], 0.005, 0.014);
  }

  // head accessories
  ctx.smooth();
  wOverride = { Head: 1 };
  if (acc === "bow") {
    ctx.color(TOP); const c = [-0.17, 1.6, -0.12];
    ell([c[0] - 0.06, c[1], c[2]], [0.065, 0.045, 0.025], null, { seg: 12 }); ell([c[0] + 0.06, c[1], c[2]], [0.065, 0.045, 0.025], null, { seg: 12 }); ell(c, [0.025, 0.028, 0.03], null, { seg: 10 });
  } else if (acc === "flower") {
    const c = [0.2, 1.57, -0.16];
    ctx.color("#ffd1e3"); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ell([c[0] + Math.cos(a) * 0.04, c[1] + Math.sin(a) * 0.04, c[2]], [0.03, 0.03, 0.012], null, { seg: 10 }); }
    ctx.color("#ffd84a"); ell([c[0], c[1], c[2] - 0.008], [0.022, 0.022, 0.012], null, { seg: 10 });
  } else if (acc === "cap") {
    ctx.color(TOP); ell([0, 1.48, 0.0], [0.33, 0.17, 0.31], null, { clip: (p) => p[1] < 1.5 });
    ell([0, 1.5, -0.32], [0.2, 0.012, 0.14], null, { clip: (p) => p[2] > -0.24 });
    ctx.color("#ffffff"); ell([0, 1.66, 0], [0.025, 0.012, 0.025], null, { seg: 8 });
  } else if (acc === "tuft") {
    ctx.color(FUR); for (let k = 0; k < 3; k++) { const x = (k - 1) * 0.05; loft([[x, 1.6, -0.03], [x + 0.02, 1.68, -0.06], [x + 0.06, 1.72, -0.02]], (t) => [0.03 * (1 - t) + 0.004, 0.02 * (1 - t) + 0.003], [0, 0, -1], null, 8); }
  } else if (acc === "glasses") {
    ctx.flat(); ctx.color(INK); ctx.metalness(0.2);
    for (const s of [-1, 1]) { const cu = s * EX; band((t) => { const a = t * Math.PI * 2; return [cu + Math.cos(a) * (ERU + 0.03), EY + Math.sin(a) * (ERU + 0.03)]; }, (t) => { const a = t * Math.PI * 2; return [cu + Math.cos(a) * (ERU + 0.012), EY + Math.sin(a) * (ERU + 0.012)]; }, 0.03, hi ? 28 : 14); }
    stroke((t) => [(t - 0.5) * 0.05, EY + 0.02], 0.012, 0.03, 3);
    ctx.metalness(null);
  } else if (acc === "beanie") {
    ctx.color(TOP); ell([0, 1.47, 0], [0.352, 0.2, 0.332], null, { clip: (p) => p[1] < 1.47 });
    ctx.color(TOP === "#ffffff" ? "#dddddd" : "#ffffff"); { const ring = []; for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; ring.push([Math.cos(a) * 0.345, 1.46, Math.sin(a) * 0.325]); } loft(ring, () => [0.03, 0.03], [0, 1, 0], null, 8); }
    ctx.color("#ffffff"); ell([0, 1.69, 0], [0.055, 0.055, 0.055], null, { seg: 12 });
  } else if (acc === "crown") {
    ctx.color("#ffd23f"); { const ring = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; ring.push([Math.cos(a) * 0.2, 1.64, Math.sin(a) * 0.2]); } loft(ring, () => [0.022, 0.03], [0, 1, 0], null, 8); }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2; loft([[x, 1.64, z], [x, 1.76, z]], (t) => [0.034 * (1 - t) + 0.006, 0.034 * (1 - t) + 0.006], [0, 0, 1], null, 8); }
    ctx.color("#ff5d8f"); ell([0, 1.66, -0.2], [0.02, 0.02, 0.012], null, { seg: 8 });
  } else if (acc === "headphones") {
    ctx.color("#2b2b33"); { const arc = []; for (let i = 0; i <= 20; i++) { const a = Math.PI - (i / 20) * Math.PI; arc.push([Math.cos(a) * 0.375, 1.3 + Math.sin(a) * 0.39, 0]); } loft(arc, () => [0.02, 0.02], [0, 0, 1], null, 8); }
    ctx.color(TOP); for (const s of [-1, 1]) ell([s * 0.375, 1.3, 0], [0.065, 0.1, 0.1], null, { seg: 14 });
  } else if (acc === "partyhat") {
    ctx.color(TOP); loft([[0.04, 1.58, 0.0], [0.07, 1.82, 0.02]], (t) => [0.12 * (1 - t) + 0.006, 0.12 * (1 - t) + 0.006], [0, 0, 1], null, 14);
    ctx.color("#ffffff"); ell([0.07, 1.83, 0.02], [0.03, 0.03, 0.03], null, { seg: 10 });
    ctx.color("#ffd23f"); for (const [x, y] of [[0.02, 1.64], [0.06, 1.7], [0.04, 1.76]]) ell([x, y, -0.085], [0.014, 0.014, 0.008], null, { seg: 8 });
  } else if (acc === "shades") {
    ctx.flat(); ctx.color(INK);
    for (const s of [-1, 1]) fill(ellipse(s * EX, EY, ERU + 0.04, ERV * 0.78 + 0.03, hi ? 28 : 14), 0.03);
    stroke((t) => [(t - 0.5) * 0.06, EY + 0.02], 0.014, 0.03, 3);
  }
  wOverride = null;

  return { joints: J, weights: W };
}
