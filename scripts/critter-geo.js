// Custom character base: adorable, consistent, high-craft cartoon animal critters.
// Features squishy chubby cheeks, soft 3D curved muzzles, sparkling anime/chibi eyes with
// glossy specular glints, dynamic blink eyelids, rounded shoulders, mitten paws with wrist cuffs
// and soft toe beans, bean feet with sole pads, smooth lofted body curves, species-tailored
// ears and tails, and beautifully fitted outfits and accessories.
//
// Supported params:
//   species: cat dog fox bunny bear deer mouse wolf raccoon panda pig sheep lion
//   sex: m | f (f: curvier hips, feminine waist & bust contour, elegant winged eyelashes)
//   fur, belly, eye: colors
//   outfit: none tee hoodie sweater jacket overalls apron pajamas skirt dress
//   topw, botw, shoes, hat, eyew, neck: clothing slots; top, bottom, shoec, hatc, neckc: their colours
//   acc: none bow flower cap beanie crown headphones partyhat glasses shades scarf tuft
//   expr: grin smile joy laugh wink blep love sparkle kiss shy smug pout evil bored surprised scared sad cry angry dizzy sleepy
//   eyes: round tall wide
//   marks: none freckles stripes patch heart
//
// Rig: Mixamo-compatible bone hierarchy in T-pose with EarL/EarR and LidL/LidR bones.
// Coordinate space: +Y up, -Z forward.

const HC = [0, 1.3, 0]; // head center
const HR = [0.372, 0.358, 0.346]; // dandy's world base: a big round head on a small bean body // head radii (cute chibi proportion: ~40% of height)

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
  // Dynamic blink lids driven by scripts/critter.js scaling
  LidL: { parent: "Head", pivot: [-0.134, 1.365, -0.3] },
  LidR: { parent: "Head", pivot: [0.134, 1.365, -0.3] },
};

export function skeleton() { return BONES; }
const NAMES = Object.keys(BONES);
const IDX = Object.fromEntries(NAMES.map((n, i) => [n, i]));

export function collider() {
  return { kind: "capsule", radius: 0.3, halfHeight: 0.55, center: [0, 0.86, 0] };
}

// ---------- Species configurations ----------
const SPECIES = {
  cat:     { fangs: true, fur: "#f2a65a", belly: "#fff1dc", ears: "point", earS: 1.05, tail: "cat", nose: "#ff8fa3", whisk: true, cheeks: true },
  dog:     { fur: "#c98b55", belly: "#fbe8cf", ears: "flop", earS: 1.0, tail: "wag", nose: "#2a1c18", muzzle: true },
  fox:     { fangs: true, fur: "#f07a2e", belly: "#ffffff", ears: "fox", earS: 1.35, tail: "fox", tip: "#ffffff", nose: "#231816", muzzle: true, socks: "#2c1c18", cheeks: true },
  bunny:   { fur: "#f4efe9", belly: "#ffffff", ears: "long", earS: 1.15, tail: "puff", nose: "#ff9fb4", buck: true },
  bear:    { fur: "#9a6440", belly: "#e8c79e", ears: "round", earS: 1.0, tail: "stub", nose: "#2a1c18", muzzle: true, chunky: true },
  deer:    { fur: "#b9804e", belly: "#fff3e2", ears: "leaf", earS: 1.1, tail: "stub", nose: "#3a1f1a", muzzle: true, antlers: true, spots: true },
  mouse:   { fur: "#b9b3c2", belly: "#f6eef4", ears: "round", earS: 1.7, tail: "thin", nose: "#ff8fa3", whisk: true },
  wolf:    { fangs: true, fur: "#6f7d93", belly: "#e3e8f0", ears: "wolf", earS: 1.25, tail: "fox", tip: "#e3e8f0", nose: "#1c1a20", muzzle: true, cheeks: true },
  raccoon: { fur: "#8b8a92", belly: "#e9e6ea", ears: "round", earS: 1.05, tail: "ringed", tip: "#2a2830", nose: "#1c1a20", muzzle: true, mask: "#2c2a32" },
  panda:   { fur: "#f7f3ee", belly: "#ffffff", ears: "round", earS: 1.0, earCol: "#2b2530", tail: "stub", nose: "#1c1a20", muzzle: true, dark: "#2b2530", patch: "#2b2530", chunky: true },
  pig:     { fur: "#ffb3c1", belly: "#ffd9e0", ears: "point", earS: 0.7, tail: "curly", nose: "#ff97aa", snout: true },
  sheep:   { fur: "#f6f1e7", belly: "#ffffff", headFur: "#5d5560", ears: "flop", earS: 0.6, ear2: "#5d5560", tail: "puff", nose: "#2a1c18", muzzle: true, wool: true, socks: "#5d5560" },
  lion:    { fur: "#ebb04e", belly: "#fbe3b0", ears: "round", earS: 0.95, tail: "lion", nose: "#8a4a2a", muzzle: true, mane: "#a3592a", fangs: true, tailTuft: "#a3592a" },
};

// ---------- Vector & math utilities ----------
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const hex2 = (h) => {
  if (!h || h[0] !== "#") return [200, 200, 200];
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixc = (h1, h2, f) => {
  const a = hex2(h1), b = hex2(h2);
  return "#" + a.map((x, i) => Math.round(x + (b[i] - x) * f).toString(16).padStart(2, "0")).join("");
};

export function geometry(ctx) {
  const P = ctx.params || {};
  const sp = SPECIES[P.species] || SPECIES.cat;
  const fem = P.sex === "f";
  const FUR = P.fur || sp.fur;
  const BELLY = P.belly || sp.belly;
  const EYE = P.eye || "#3f7fd9";
  const TOP = P.top || "#e85d75";
  const BOT = P.bottom || "#3d5a98";
  const outfit = P.outfit || "tee";
  const acc = P.acc || "none";
  // clothing slots (old outfit/acc rows still read through)
  const LEGACY = { tee: ["tee", "pants"], hoodie: ["hoodie", "pants"], sweater: ["sweater", "pants"], jacket: ["jacket", "pants"], overalls: ["tee", "overalls"], apron: ["apron", "pants"], pajamas: ["pajamas", "pjpants"], skirt: ["tee", "skirt"], dress: ["dress", "none"], none: ["none", "none"] };
  const topw = P.topw || (LEGACY[outfit] || LEGACY.tee)[0];
  const botw = P.botw || (LEGACY[outfit] || LEGACY.tee)[1];
  const hat = P.hat || (["bow", "flower", "cap", "beanie", "crown", "headphones", "partyhat", "tuft"].includes(acc) ? acc : "none");
  const eyew = P.eyew || (["glasses", "shades"].includes(acc) ? acc : "none");
  const neck = P.neck || (acc === "scarf" ? "scarf" : "none");
  const shoes = P.shoes || "none";
  const HATC = P.hatc || TOP, NECKC = P.neckc || (TOP === "#e85d75" ? "#f3c64a" : TOP), SHOEC = P.shoec || "#f4f1ea";
  const expr = P.expr || "grin";
  const hi = ctx.lod <= 1;
  const mid = ctx.lod <= 2;
  const lowest = ctx.lod >= 4;
  const SEG = hi ? 28 : mid ? 18 : ctx.lod === 3 ? 12 : 8;

  // Vertex skin weights
  const J = [];
  const W = [];
  let wOverride = null;

  function autoW(p) {
    if (wOverride) return wOverride;
    const [x, y, z] = p, side = x < 0 ? "Left" : "Right", ax = Math.abs(x);
    if (y > 1.04) return { Head: 1 };
    if (y > 0.86 && ax > 0.13) {
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
      const f = sstep(0.12, 0.08, y);
      return z < -0.07 ? { [side + "Foot"]: 0.5, [side + "ToeBase"]: 0.5 } : { [side + "Leg"]: 1 - f, [side + "Foot"]: f };
    }
    if (y < 0.68) return { Hips: 1 };
    if (y < 0.78) { const t = sstep(0.68, 0.78, y); return { Hips: 1 - t, Spine: t }; }
    if (y < 0.88) { const t = sstep(0.78, 0.88, y); return { Spine: 1 - t, Spine1: t }; }
    const t = sstep(0.88, 0.95, y); return { Spine1: 1 - t, Spine2: t };
  }

  function pushW(p) {
    const w = autoW(p);
    const es = Object.entries(w).filter(([, v]) => v > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = 0; for (const [, v] of es) s += v;
    if (s <= 0) {
      for (let i = 0; i < 4; i++) { J.push(0); W.push(i === 0 ? 1 : 0); }
      return;
    }
    for (let i = 0; i < 4; i++) {
      J.push(es[i] ? (IDX[es[i][0]] ?? 0) : 0);
      W.push(es[i] ? es[i][1] / s : 0);
    }
  }

  let SHRINK = null;
  const shr = (p) => [SHRINK.c[0] + (p[0] - SHRINK.c[0]) * SHRINK.k, SHRINK.c[1] + (p[1] - SHRINK.c[1]) * SHRINK.k, SHRINK.c[2] + (p[2] - SHRINK.c[2]) * SHRINK.k];

  const tri = (a, b, c) => {
    if (SHRINK) { a = shr(a); b = shr(b); c = shr(c); }
    ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    pushW(a); pushW(b); pushW(c);
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };

  // Ellipsoid generator with optional clipping and face coloring
  function ell(c, r, colorAt, opts = {}) {
    const U = opts.seg || SEG, V = Math.max(6, Math.round(U / 2));
    const pt = (i, j) => {
      const th = (i / U) * Math.PI * 2, ph = (j / V) * Math.PI;
      const s = Math.sin(ph);
      return [c[0] + r[0] * s * Math.cos(th), c[1] + r[1] * Math.cos(ph), c[2] + r[2] * s * Math.sin(th)];
    };
    for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) {
      const a = pt(i, j), b = pt(i + 1, j), cc = pt(i + 1, j + 1), d = pt(i, j + 1);
      const m = mul3(add3(add3(a, b), add3(cc, d)), 0.25);
      if (opts.clip && opts.clip(m)) continue;
      if (colorAt) colorAt(m, norm3(sub3(m, c)));
      if (j === 0) tri(a, cc, d);
      else if (j === V - 1) tri(a, b, cc);
      else quad(a, b, cc, d);
    }
  }

  // Loft along a 3D path with elliptical sections
  function loft(path, radius, upHint, colorAt, M = hi ? 14 : 9) {
    const n = path.length, rings = [];
    for (let i = 0; i < n; i++) {
      const T = norm3(sub3(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]));
      const S = norm3(cross3(T, upHint)), N = cross3(S, T);
      const t = i / (n - 1), [ra, rb] = radius(t);
      const ring = [];
      for (let k = 0; k < M; k++) {
        const a = (k / M) * Math.PI * 2;
        ring.push(add3(path[i], add3(mul3(S, Math.cos(a) * ra), mul3(N, Math.sin(a) * rb))));
      }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) {
      if (colorAt) colorAt(i / (n - 1));
      for (let k = 0; k < M; k++) {
        const k2 = (k + 1) % M;
        quad(rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2]);
      }
    }
    if (colorAt) colorAt(0);
    for (let k = 0; k < M; k++) tri(path[0], rings[0][k], rings[0][(k + 1) % M]);
    if (colorAt) colorAt(1);
    for (let k = 0; k < M; k++) tri(path[n - 1], rings[n - 1][(k + 1) % M], rings[n - 1][k]);
  }

  // Capsule limb between two points with smooth rounded ends
  function limb(a, b, ra, rb, M) {
    const L = 10, path = [];
    for (let i = 0; i <= L; i++) path.push([lerp(a[0], b[0], i / L), lerp(a[1], b[1], i / L), lerp(a[2], b[2], i / L)]);
    const up = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) ? [0, 0, -1] : [0, 1, 0];
    loft(path, (t) => {
      const r = lerp(ra, rb, t);
      const e = Math.min(t, 1 - t) * L / 1.2;
      const k = e >= 1 ? 1 : Math.sqrt(Math.max(0.05, 1 - (1 - e) * (1 - e)));
      return [r * k, r * k];
    }, up, null, M);
  }

  // ---------- Head geometry: squishy chubby cheeks and soft 3D muzzle ----------
  function sculptedHead(opts = {}) {
    wOverride = { Head: 1 };
    const U = opts.seg || (hi ? 36 : SEG), V = Math.max(10, Math.round(U / 2));
    const pt = (i, j) => {
      const th = (i / U) * Math.PI * 2, ph = (j / V) * Math.PI;
      const s = Math.sin(ph), cPh = Math.cos(ph);
      let rx = HR[0], ry = HR[1], rz = HR[2];
      // Squishy chubby cheeks: wider at lower equator (ph ~ 1.8 to 2.1 rad)
      const cheekFactor = Math.exp(-Math.pow((ph - 1.95) / 0.45, 2));
      const cheekOut = cheekFactor * (Math.abs(Math.cos(th)) ** 1.3) * 0.042;
      rx += cheekOut;
      // Soft 3D muzzle protrusion forward (-Z direction, th near 3*PI/2)
      const forwardMuzzle = Math.max(0, -Math.sin(th));
      const muzzleFactor = Math.exp(-Math.pow((ph - 2.0) / 0.35, 2)) * (forwardMuzzle ** 2.2);
      const muzzleOut = muzzleFactor * (sp.snout ? 0.055 : sp.muzzle ? 0.045 : 0.024);

      const px = HC[0] + (rx * s) * Math.cos(th);
      const py = HC[1] + (ry * cPh);
      const pz = HC[2] + (rz * s) * Math.sin(th) - muzzleOut;
      return [px, py, pz];
    };

    for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) {
      const a = pt(i, j), b = pt(i + 1, j), c2 = pt(i + 1, j + 1), d = pt(i, j + 1);
      const m = mul3(add3(add3(a, b), add3(c2, d)), 0.25);
      const nrm = norm3(sub3(m, HC));
      let col = sp.headFur || FUR;
      if (sp.cheeks && nrm[2] < -0.15 && m[1] < 1.25 && Math.abs(m[0]) > 0.15) col = BELLY;
      if (sp.muzzle && nrm[2] < -0.45 && m[1] > 1.14 && m[1] < 1.28 && Math.abs(m[0]) < 0.14) col = BELLY;
      ctx.color(col);

      if (j === 0) tri(a, c2, d);
      else if (j === V - 1) tri(a, b, c2);
      else quad(a, b, c2, d);
    }
    wOverride = null;
  }

  // Projection of 2D face elements onto the sculpted 3D head surface
  const onHead = (u, v, e = 0) => {
    const k = Math.max(0.0004, 1 - (u / (HR[0] + 0.03)) ** 2 - (v / HR[1]) ** 2);
    const zBase = -HR[2] * Math.sqrt(k);
    const dMuzzle = Math.exp(-((u / 0.16) ** 2 + ((v + 0.11) / 0.12) ** 2));
    const muz = dMuzzle * (sp.snout ? 0.055 : sp.muzzle ? 0.045 : 0.024);
    return [HC[0] + u * (1 + e), HC[1] + v * (1 + e), HC[2] + (zBase - muz) * (1 + e)];
  };

  const fill = (poly, e, rings = hi ? 3 : 2) => {
    let cu = 0, cv = 0;
    for (const [u, v] of poly) { cu += u; cv += v; }
    cu /= poly.length; cv /= poly.length;
    for (let i = 0; i < poly.length; i++) {
      const p0 = poly[i], p1 = poly[(i + 1) % poly.length];
      for (let r = 0; r < rings; r++) {
        const t0 = r / rings, t1 = (r + 1) / rings;
        const a = onHead(lerp(cu, p0[0], t0), lerp(cv, p0[1], t0), e);
        const b = onHead(lerp(cu, p1[0], t0), lerp(cv, p1[1], t0), e);
        const c = onHead(lerp(cu, p1[0], t1), lerp(cv, p1[1], t1), e);
        const d = onHead(lerp(cu, p0[0], t1), lerp(cv, p0[1], t1), e);
        if (r === 0) tri(a, d, c);
        else quad(a, d, c, b);
      }
    }
  };

  const ellipse = (cu, cv, ru, rv, n = hi ? 28 : 16, rot = 0) => {
    const o = [];
    for (let i = 0; i < n; i++) {
      const a = -(i / n) * Math.PI * 2, x = Math.cos(a) * ru, y = Math.sin(a) * rv;
      o.push([cu + x * Math.cos(rot) - y * Math.sin(rot), cv + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return o;
  };

  const band = (top, bot, e, n = hi ? 20 : 10) => {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, a = top(t0), b = top(t1), c = bot(t1), d = bot(t0);
      quad(onHead(a[0], a[1], e), onHead(d[0], d[1], e), onHead(c[0], c[1], e), onHead(b[0], b[1], e));
    }
  };

  const stroke = (f, w, e, n) => band(
    (t) => { const p = f(t); return [p[0], p[1] + w / 2]; },
    (t) => { const p = f(t); return [p[0], p[1] - w / 2]; },
    e, n
  );

  const INK = "#1a121e";

  // ---------- Material setups ----------
  ctx.smooth();
  ctx.roughness(1);
  ctx.metalness(0);

  // ---------- Body: continuous lofted pear/chibi torso ----------
  const HIP_R = fem ? [0.18, 0.145] : [0.14, 0.128];
  const WAIST_R = fem ? [0.132, 0.122] : (sp.chunky ? [0.165, 0.15] : [0.148, 0.138]);
  const CHEST_R = fem ? [0.155, 0.146] : [0.15, 0.132];

  // Lofted torso sections from hips to neck
  {
    const torsoPath = [
      [0, 0.58, 0.005],  // base of pelvis
      [0, 0.65, 0.005],  // hips
      [0, 0.73, 0.0],    // lower waist / tummy
      [0, 0.82, 0.0],    // mid waist
      [0, 0.90, -0.005], // chest / bust
      [0, 0.97, 0.0]     // shoulders / base of neck
    ];
    const torsoRadius = (t) => {
      if (t < 0.2) return [lerp(0.12, HIP_R[0], t / 0.2), lerp(0.1, HIP_R[1], t / 0.2)];
      if (t < 0.45) { const f = (t - 0.2) / 0.25; return [lerp(HIP_R[0], WAIST_R[0], f), lerp(HIP_R[1], WAIST_R[1], f)]; }
      if (t < 0.75) { const f = (t - 0.45) / 0.3; return [lerp(WAIST_R[0], CHEST_R[0], f), lerp(WAIST_R[1], CHEST_R[1], f)]; }
      const f = (t - 0.75) / 0.25; return [lerp(CHEST_R[0], 0.11, f), lerp(CHEST_R[1], 0.095, f)];
    };
    loft(torsoPath, torsoRadius, [0, 0, -1], (t) => {
      ctx.color(sp.dark && t > 0.4 && t < 0.85 ? sp.dark : FUR);
    }, hi ? 24 : 14);

    // Soft curved belly patch on front of torso
    {
      const bellyPath = [
        [0, 0.64, -HIP_R[1] * 0.98],
        [0, 0.74, -WAIST_R[1] * 0.99],
        [0, 0.85, -CHEST_R[1] * 0.98],
        [0, 0.92, -0.1]
      ];
      ctx.color(BELLY);
      loft(bellyPath, (t) => {
        const w = (t < 0.5 ? lerp(0.075, 0.09, t / 0.5) : lerp(0.09, 0.05, (t - 0.5) / 0.5));
        return [w, 0.008];
      }, [0, 1, 0], null, 8);
    }

    // Feminine bust curve if sex === 'f'
    if (fem) {
      for (const s of [-1, 1]) {
        ctx.color(sp.dark ? sp.dark : FUR);
        ell([s * 0.062, 0.875, -0.09], [0.065, 0.058, 0.058], null, { seg: hi ? 14 : 9 });
      }
    }

    // Deer dappled fawn spots on flank and back
    if (sp.spots && !lowest) {
      ctx.color("#fdf5eb");
      for (const s of [-1, 1]) {
        ell([s * 0.09, 0.76, 0.08], [0.018, 0.024, 0.012], null, { seg: 8 });
        ell([s * 0.075, 0.82, 0.07], [0.016, 0.022, 0.01], null, { seg: 8 });
        ell([s * 0.1, 0.70, 0.09], [0.015, 0.02, 0.01], null, { seg: 8 });
      }
    }
  }

  // Neck
  ctx.color(FUR);
  limb([0, 0.94, 0], [0, 1.06, 0], 0.065, 0.072, hi ? 12 : 8);

  // ---------- Arms with round shoulders, wrist cuffs, and paddle mitten paws with toe beans ----------
  for (const s of [-1, 1]) {
    ctx.color(sp.dark || FUR);
    // Rounded shoulder nub for seamless anatomical connection
    ell([s * 0.118, 0.955, 0], [0.046, 0.045, 0.045], null, { seg: hi ? 14 : 9 });

    const armPath = [
      [s * 0.11, 0.965, 0],
      [s * 0.28, 0.965, 0.004],
      [s * 0.44, 0.965, 0.006],
      [s * 0.52, 0.965, 0.002]
    ];
    loft(armPath, (t) => {
      const r = lerp(fem ? 0.033 : 0.036, 0.028, t); // noodle arms, base proportions
      return [r, r];
    }, [0, 1, 0], null, hi ? 12 : 8);

    // Rolled wrist cuff
    ctx.color(sp.dark || sp.socks || FUR);
    ell([s * 0.548, 0.965, 0], [0.026, 0.04, 0.04], null, { seg: hi ? 14 : 9 });

    // Cute paddle mitten paw
    const pawCenter = [s * 0.63, 0.965, 0];
    ell(pawCenter, [0.098, 0.052, 0.078], null, { seg: hi ? 18 : 10 });

    // Thumb nub
    ell([s * 0.588, 0.96, -0.07], [0.032, 0.024, 0.036], null, { seg: hi ? 12 : 8 });

    // Cute paw bean pads (toe beans!) on underside (-Y)
    if (mid) {
      const beanCol = sp.nose === "#2a1c18" || sp.dark ? "#e0b094" : "#ff9fb4";
      ctx.color(beanCol);
      // Main heart/oval palm bean
      ell([s * 0.625, 0.942, 0.002], [0.028, 0.006, 0.026], null, { seg: 10 });
      // 3 toe bean dots
      for (let b = 0; b < 3; b++) {
        const ang = (b - 1) * 0.45;
        ell([s * (0.675 + 0.01 * Math.cos(ang)), 0.944, Math.sin(ang) * 0.024], [0.01, 0.005, 0.01], null, { seg: 8 });
      }
    }
  }

  // ---------- Chubby chibi legs and bean feet with sole pads ----------
  for (const s of [-1, 1]) {
    const x = s * 0.085;
    const legPath = [
      [x, 0.62, 0],
      [x, 0.46, 0],
      [x, 0.28, 0],
      [x, 0.10, 0]
    ];
    ctx.color(sp.dark || FUR);
    loft(legPath, (t) => {
      const r = lerp(fem ? 0.058 : 0.05, 0.04, t); // slim base legs
      return [r, r];
    }, [1, 0, 0], (t) => {
      if (sp.dark) ctx.color(sp.dark);
      else if (sp.socks && t > 0.45) ctx.color(sp.socks);
      else ctx.color(FUR);
    }, hi ? 14 : 8);

    // Big round bean foot
    const footCenter = [x, 0.058, -0.04];
    ctx.color(sp.dark || sp.socks || FUR);
    ell(footCenter, [0.078, 0.062, 0.125], null, { seg: hi ? 18 : 10 });

    // Paw pads on sole
    if (mid) {
      const beanCol = sp.nose === "#2a1c18" || sp.dark ? "#e0b094" : "#ff9fb4";
      ctx.color(beanCol);
      // Main heel pad
      ell([x, 0.028, -0.01], [0.034, 0.006, 0.038], null, { seg: 10 });
      // 3 front toe pads
      for (let b = 0; b < 3; b++) {
        const xo = (b - 1) * 0.024;
        ell([x + xo, 0.03, -0.09], [0.012, 0.005, 0.015], null, { seg: 8 });
      }
    }
  }

  // ---------- Sculpted Head with squishy cheeks and soft 3D muzzle ----------
  sculptedHead({ seg: hi ? 36 : SEG });

  // Sheep wool puffs framing the head
  if (sp.wool) {
    wOverride = { Head: 1 };
    ctx.color(FUR);
    for (const [x, y, z, r] of [
      [0, 1.62, -0.03, 0.10], [-0.14, 1.60, -0.05, 0.088], [0.14, 1.60, -0.05, 0.088],
      [-0.25, 1.50, -0.02, 0.078], [0.25, 1.50, -0.02, 0.078], [0, 1.64, 0.07, 0.092]
    ]) {
      ell([x, y, z], [r, r, r], null, { seg: hi ? 14 : 9 });
    }
    wOverride = null;
  }

  // Lion majestic mane encircling neck and head
  if (sp.mane) {
    wOverride = { Head: 0.7, Spine2: 0.3 };
    ctx.color(sp.mane);
    ell([0, 1.28, 0.08], [0.46, 0.40, 0.28], null, { seg: hi ? 24 : SEG });
    wOverride = null;
  }

  // Layered fluffy cheek tufts for species with cheek fur
  if (sp.cheeks && mid) {
    wOverride = { Head: 1 };
    for (const s of [-1, 1]) {
      ctx.color(BELLY);
      for (let n = 0; n < 3; n++) {
        const a = -0.32 + n * 0.32;
        const base = [s * 0.28, 1.24 + a * 0.12, -0.1];
        const tip = [s * (0.42 + (n === 1 ? 0.04 : 0)), 1.20 + a * 0.14, -0.04];
        const lower = [s * 0.29, 1.16 + a * 0.12, -0.02];
        tri(base, tip, lower);
        if (s < 0) tri(base, lower, tip);
      }
    }
    wOverride = null;
  }

  // ---------- Ears: Species-specific high-craft curves ----------
  const earBase = (s) => [s * 0.2, 1.55, 0.0];
  const ear = sp.ears, eS = sp.earS || 1;
  for (const s of [-1, 1]) {
    wOverride = { [s < 0 ? "EarL" : "EarR"]: 1 };
    const b = earBase(s);

    if (ear === "point" || ear === "fox" || ear === "wolf") {
      const h = 0.22 * eS, tilt = ear === "fox" ? 0.32 : 0.24;
      const tip = [b[0] + s * h * Math.sin(tilt), b[1] + h * Math.cos(tilt), b[2] - 0.01];
      const path = [];
      for (let i = 0; i <= 8; i++) {
        path.push([lerp(b[0], tip[0], i / 8), lerp(b[1] - 0.03, tip[1], i / 8), lerp(b[2], tip[2], i / 8)]);
      }
      ctx.color(sp.earCol || FUR);
      loft(path, (t) => [0.1 * eS * Math.pow(1 - t, 0.85) + 0.005, 0.036 * (1 - t) + 0.005], [0, 0, -1], null, 10);

      // Inner ear: plush pink or white fluff with depth
      ctx.color(ear === "fox" || ear === "wolf" ? "#fff5ee" : "#ffb3c6");
      const inn = [];
      for (let i = 0; i <= 6; i++) {
        inn.push([lerp(b[0], tip[0], i / 6), lerp(b[1], tip[1], i / 6) - 0.015, lerp(b[2], tip[2], i / 6) - 0.024]);
      }
      loft(inn, (t) => [0.065 * eS * Math.pow(1 - t, 0.9) + 0.004, 0.014], [0, 0, -1], null, 8);

      // Dark ear tip for fox / wolf
      if (ear === "fox" && sp.tip) {
        ctx.color("#281c18");
        const tp = [];
        for (let i = 0; i <= 4; i++) {
          tp.push([lerp(path[5][0], tip[0], i / 4), lerp(path[5][1], tip[1], i / 4), lerp(path[5][2], tip[2], i / 4) + 0.004]);
        }
        loft(tp, (t) => [0.032 * (1 - t) + 0.004, 0.014 * (1 - t) + 0.004], [0, 0, -1], null, 8);
      }
    } else if (ear === "round") {
      const c = [s * 0.24, 1.58, 0.02], r = 0.088 * eS;
      ctx.color(sp.earCol || FUR);
      ell(c, [r, r, 0.035], null, { seg: hi ? 16 : 10 });
      if (!sp.earCol) {
        ctx.color(P.species === "mouse" ? "#ffb3c6" : BELLY);
        ell([c[0], c[1] - 0.005, c[2] - 0.026], [r * 0.65, r * 0.65, 0.012], null, { seg: hi ? 14 : 8 });
      }
    } else if (ear === "long") {
      const path = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        path.push([s * (0.13 + 0.08 * t + 0.04 * t * t), 1.55 + 0.44 * t, 0.02 + 0.05 * t * t]);
      }
      ctx.color(FUR);
      loft(path, (t) => [0.058 * Math.sin(Math.PI * (0.15 + 0.8 * t)) + 0.014, 0.024], [0, 0, -1], null, 10);
      ctx.color("#ffb3c6");
      loft(path.map((p) => [p[0], p[1], p[2] - 0.018]), (t) => [0.036 * Math.sin(Math.PI * (0.2 + 0.7 * t)) + 0.004, 0.012], [0, 0, -1], null, 8);
    } else if (ear === "flop") {
      const path = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        path.push([s * (0.29 + 0.07 * Math.sin(t * 2.2)), 1.52 - 0.32 * t, 0.02 - 0.03 * t]);
      }
      ctx.color(sp.ear2 || P.ear2 || FUR);
      loft(path, (t) => [0.032, 0.078 * Math.sin(Math.PI * (0.2 + 0.75 * t)) + 0.022], [1, 0, 0], null, 10);
    } else if (ear === "leaf") {
      const h = 0.2 * eS;
      const tip = [b[0] + s * h * 0.85, b[1] + h * 0.5, b[2] + 0.02];
      const path = [];
      for (let i = 0; i <= 8; i++) path.push([lerp(b[0], tip[0], i / 8), lerp(b[1], tip[1], i / 8), lerp(b[2], tip[2], i / 8)]);
      ctx.color(FUR);
      loft(path, (t) => [0.08 * Math.sin(Math.PI * t) + 0.006, 0.025], [0, 0, -1], null, 8);
      ctx.color("#f3c3b8");
      loft(path.map((p) => [p[0], p[1], p[2] - 0.018]), (t) => [0.05 * Math.sin(Math.PI * t) + 0.003, 0.01], [0, 0, -1], null, 8);
    }
    wOverride = null;
  }

  // Antlers for deer
  if (sp.antlers && !lowest) {
    ctx.color("#e9d9b8");
    for (const s of [-1, 1]) {
      wOverride = { Head: 1 };
      const base = [s * 0.12, 1.6, 0.02], mid1 = [s * 0.18, 1.78, 0.04], top = [s * 0.14, 1.92, 0.02];
      limb(base, mid1, 0.022, 0.017, 8);
      limb(mid1, top, 0.017, 0.01, 8);
      limb(mid1, [s * 0.29, 1.86, 0.02], 0.014, 0.008, 8);
      limb([s * 0.15, 1.69, 0.03], [s * 0.06, 1.78, 0.0], 0.013, 0.008, 8);
      wOverride = null;
    }
  }

  // ---------- Tails: Rich, expressive species curves ----------
  {
    wOverride = { Tail: 0.35, Tail1: 0.65 };
    const T = sp.tail, path = [];
    const pathOf = (n, f) => { for (let i = 0; i <= n; i++) path.push(f(i / n)); };

    if (T === "cat") {
      pathOf(14, (t) => [
        0.05 * Math.sin(t * 3.5),
        0.6 + 0.36 * t + 0.08 * Math.sin(t * Math.PI),
        0.13 + 0.28 * Math.sin(t * 1.5)
      ]);
      ctx.color(FUR);
      loft(path, (t) => {
        const r = 0.03 * (1 - t * 0.32);
        return [r, r];
      }, [1, 0, 0], null, 10);
    } else if (T === "fox") {
      pathOf(14, (t) => [
        0.04 * Math.sin(t * 2.8),
        0.58 + 0.36 * Math.sin(t * 1.5),
        0.12 + 0.36 * t
      ]);
      loft(path, (t) => {
        const r = 0.115 * Math.sin(Math.PI * (0.12 + 0.82 * t)) + 0.024;
        return [r, r];
      }, [1, 0, 0], (t) => {
        ctx.color(t > 0.70 ? (sp.tip || "#ffffff") : FUR);
      }, 14);
    } else if (T === "wag") {
      pathOf(10, (t) => [
        0,
        0.6 + 0.28 * t + 0.04 * Math.sin(t * Math.PI),
        0.13 + 0.16 * t - 0.06 * t * t
      ]);
      ctx.color(FUR);
      loft(path, (t) => {
        const r = 0.038 * (1 - 0.45 * t) + 0.01;
        return [r, r];
      }, [1, 0, 0], null, 10);
    } else if (T === "ringed") {
      pathOf(14, (t) => [
        0.04 * Math.sin(t * 2.2),
        0.58 + 0.32 * Math.sin(t * 1.4),
        0.12 + 0.34 * t
      ]);
      loft(path, (t) => {
        const r = 0.085 * Math.sin(Math.PI * (0.12 + 0.82 * t)) + 0.022;
        return [r, r];
      }, [1, 0, 0], (t) => {
        const ring = Math.floor(t * 8);
        ctx.color(ring % 2 === 1 ? (sp.tip || "#2a2830") : FUR);
      }, 12);
    } else if (T === "curly") {
      pathOf(14, (t) => [
        0.03 * Math.cos(t * Math.PI * 4),
        0.62 + 0.03 * Math.sin(t * Math.PI * 4),
        0.14 + 0.12 * t
      ]);
      ctx.color(FUR);
      loft(path, () => [0.016, 0.016], [0, 1, 0], null, 8);
    } else if (T === "lion") {
      pathOf(12, (t) => [0.03 * Math.sin(t * 3), 0.6 + 0.35 * t, 0.13 + 0.2 * t]);
      ctx.color(FUR);
      loft(path, (t) => [0.025 * (1 - t * 0.4), 0.025 * (1 - t * 0.4)], [1, 0, 0], null, 8);
      ctx.color(sp.tailTuft || "#a3592a");
      ell([path[12][0], path[12][1] + 0.02, path[12][2]], [0.045, 0.055, 0.045], null, { seg: 10 });
    } else if (T === "puff") {
      ctx.color("#ffffff");
      ell([0, 0.62, 0.16], [0.075, 0.075, 0.07], null, { seg: hi ? 14 : 8 });
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        ell([Math.cos(a) * 0.04, 0.62 + Math.sin(a) * 0.04, 0.18], [0.035, 0.035, 0.03], null, { seg: 8 });
      }
    } else if (T === "thin") {
      pathOf(14, (t) => [
        0.07 * Math.sin(t * 3.2),
        0.6 + 0.40 * t,
        0.13 + 0.24 * Math.sin(t * 1.7)
      ]);
      ctx.color(sp.nose || FUR);
      loft(path, (t) => {
        const r = 0.025 * (1 - t * 0.5) + 0.005;
        return [r, r];
      }, [1, 0, 0], null, 8);
    } else {
      ctx.color(sp.dark || FUR);
      ell([0, 0.63, 0.14], [0.055, 0.065, 0.055], null, { seg: hi ? 12 : 8 });
    }
    wOverride = null;
  }

  // ---------- Clothes: Tailored shells smoothly wrapping the new body curves ----------
  const sleeve = (len, col, r0 = 0.046) => {
    ctx.color(col);
    for (const s of [-1, 1]) {
      limb([s * 0.1, 0.965, 0], [s * (0.15 + len), 0.965, 0], r0, r0 - 0.004, hi ? 12 : 8);
    }
  };

  const shirt = (col, low = 0.6) => {
    ctx.color(col);
    const path = [
      [0, Math.max(0.6, low), 0.005],
      [0, 0.73, 0.0],
      [0, 0.82, 0.0],
      [0, 0.90, -0.005],
      [0, 0.97, 0.0]
    ];
    loft(path, (t) => {
      const y = lerp(Math.max(0.6, low), 0.97, t);
      const tf = (y - 0.58) / (0.97 - 0.58);
      let rx = lerp(HIP_R[0], CHEST_R[0], tf) + 0.014;
      let rz = lerp(HIP_R[1], CHEST_R[1], tf) + 0.014;
      if (fem) { const pinch = Math.exp(-((tf - 0.42) ** 2) / 0.02) * 0.03; rx -= pinch; rz -= pinch * 0.4; } // waist between hips and bust
      return [rx, rz];
    }, [0, 0, -1], null, hi ? 20 : 12);
    if (fem) for (const sd of [-1, 1]) ell([sd * 0.062, 0.872, -0.1], [0.072, 0.063, 0.062], null, { seg: hi ? 14 : 9 }); // the top follows her bust, modest and soft
  };

  const pants = (col, knee = 0.12, shorts = false) => {
    ctx.color(col);
    ell([0, 0.66, 0.005], [HIP_R[0] + 0.016, 0.115, HIP_R[1] + 0.016], null, { clip: (p) => p[1] > 0.72 });
    for (const s of [-1, 1]) {
      const x = s * 0.085;
      limb([x, 0.66, 0], [x, shorts ? 0.38 : knee, 0], (fem ? 0.058 : 0.05) + 0.016, shorts ? 0.06 : 0.05, hi ? 12 : 8);
    }
  };

  const skirt = (col, top = 0.72, bottom = 0.40, flare = 0.28) => {
    wOverride = { Hips: 1 };
    ctx.color(col);
    const M = hi ? 32 : 16, R = hi ? 6 : 3;
    const ring = (t) => {
      const y = lerp(top, bottom, t);
      const rx = lerp(fem ? 0.19 : 0.16, flare, t);
      const rz = lerp(0.155, flare * 0.85, t);
      const o = [];
      for (let k = 0; k < M; k++) {
        const a = (k / M) * Math.PI * 2;
        const wav = t * 0.014 * Math.sin(a * 8);
        o.push([Math.cos(a) * (rx + wav), y, Math.sin(a) * (rz + wav) + 0.005]);
      }
      return o;
    };
    for (let r = 0; r < R; r++) {
      const A = ring(r / R), B = ring((r + 1) / R);
      for (let k = 0; k < M; k++) {
        const k2 = (k + 1) % M;
        quad(A[k], A[k2], B[k2], B[k]);
      }
    }
    wOverride = null;
  };

  // ---- TOP ----
  if (topw === "tee") { shirt(TOP); sleeve(0.10, TOP); }
  else if (topw === "tank") { shirt(TOP); }
  else if (topw === "longsleeve") { shirt(TOP); sleeve(0.36, TOP, 0.056); }
  else if (topw === "hoodie") {
    shirt(TOP, 0.58); sleeve(0.35, TOP);
    wOverride = { Spine2: 1 };
    ctx.color(mixc(TOP, "#000000", 0.1));
    ell([0, 0.98, 0.13], [0.155, 0.08, 0.09], null, { seg: 12 });
    ctx.color(mixc(TOP, "#ffffff", 0.06));
    ell([0, 0.68, -WAIST_R[1] - 0.014], [0.085, 0.05, 0.02], null, { seg: 10 });
    for (const sd of [-1, 1]) {
      ctx.color("#ffffff"); limb([sd * 0.035, 0.95, -CHEST_R[1] - 0.015], [sd * 0.035, 0.82, -CHEST_R[1] - 0.018], 0.004, 0.004, 6);
      ctx.color("#e0e0e0"); ell([sd * 0.035, 0.816, -CHEST_R[1] - 0.018], [0.006, 0.008, 0.006], null, { seg: 6 });
    }
    wOverride = null;
  } else if (topw === "sweater") {
    shirt(TOP, 0.60); sleeve(0.36, TOP, 0.058);
    wOverride = { Spine2: 1 }; ctx.color(mixc(TOP, "#000000", 0.15));
    ell([0, 0.97, 0], [0.12, 0.028, 0.11], null, { clip: (q) => q[1] > 0.985 }); wOverride = null;
  } else if (topw === "jacket") {
    shirt("#ffffff", 0.62); shirt(TOP, 0.60); sleeve(0.36, TOP, 0.058);
    ctx.color(mixc(TOP, "#000000", 0.2));
    for (const sd of [-1, 1]) limb([sd * 0.07, 0.95, -CHEST_R[1] - 0.016], [sd * 0.06, 0.72, -WAIST_R[1] - 0.016], 0.014, 0.012, 6);
  } else if (topw === "apron") {
    shirt(TOP); sleeve(0.10, TOP);
    ctx.color("#fdf6e3"); ell([0, 0.58, -0.125], [0.15, 0.13, 0.04], null, { seg: hi ? 16 : 10 });
    ctx.color("#e8d9b5"); ell([0, 0.73, 0], [0.172, 0.018, 0.15], null, { seg: hi ? 20 : 12 });
    ctx.color(TOP); ell([0, 0.55, -0.16], [0.05, 0.04, 0.012], null, { seg: 10 });
  } else if (topw === "pajamas") {
    shirt(TOP, 0.56); sleeve(0.38, TOP, 0.056);
    ctx.color("#ffffff");
    for (let k = 0; k < 3; k++) ell([0, 0.93 - k * 0.07, -0.138], [0.012, 0.012, 0.006], null, { seg: 8 });
  } else if (topw === "dress") {
    shirt(TOP, 0.66); sleeve(0.08, TOP); skirt(TOP, 0.68, 0.38, 0.30);
    wOverride = { Hips: 1 }; ctx.color(BOT);
    ell([0, 0.68, 0.005], [WAIST_R[0] + 0.018, 0.025, WAIST_R[1] + 0.018], null, { seg: 14 }); wOverride = null;
  }
  // ---- BOTTOM ----
  if (botw === "pants") pants(BOT, 0.13);
  else if (botw === "shorts") pants(BOT, 0.13, true);
  else if (botw === "pjpants") pants(BOT, 0.07);
  else if (botw === "skirt") skirt(BOT, 0.71, 0.40, 0.28);
  else if (botw === "longskirt") skirt(BOT, 0.71, 0.18, 0.30);
  else if (botw === "overalls") {
    pants(BOT, 0.12); ctx.color(BOT); wOverride = { Spine1: 1 };
    ell([0, 0.84, -CHEST_R[1] - 0.01], [0.095, 0.075, 0.012], null, { seg: 10 });
    for (const sd of [-1, 1]) {
      ctx.color(BOT);
      limb([sd * 0.065, 0.74, -WAIST_R[1] - 0.01], [sd * 0.075, 0.97, 0.02], 0.016, 0.016, 6);
      limb([sd * 0.075, 0.97, 0.02], [sd * 0.065, 0.74, WAIST_R[1] + 0.01], 0.016, 0.016, 6);
      ctx.color("#ffd700"); ell([sd * 0.065, 0.88, -CHEST_R[1] - 0.018], [0.009, 0.009, 0.006], null, { seg: 8 });
    }
    wOverride = null;
  }
  // ---- SHOES ----
  for (const sd of [-1, 1]) {
    const x = sd * 0.085;
    if (shoes === "sneakers") {
      ctx.color(SHOEC); ell([x, 0.064, -0.045], [0.088, 0.07, 0.138], null, { seg: hi ? 16 : 10 });
      ctx.color("#ffffff"); ell([x, 0.024, -0.045], [0.093, 0.024, 0.143], null, { seg: hi ? 16 : 10 });
      ctx.color(mixc(SHOEC, "#000000", 0.35)); ell([x, 0.118, -0.09], [0.04, 0.014, 0.05], null, { seg: 8 });
    } else if (shoes === "boots") {
      ctx.color(SHOEC); ell([x, 0.064, -0.045], [0.09, 0.07, 0.14], null, { seg: hi ? 16 : 10 });
      limb([x, 0.07, 0], [x, 0.26, 0], 0.062, 0.058, hi ? 12 : 8);
      ctx.color(mixc(SHOEC, "#000000", 0.45)); ell([x, 0.022, -0.045], [0.094, 0.022, 0.145], null, { seg: hi ? 16 : 10 });
      ell([x, 0.26, 0], [0.066, 0.018, 0.066], null, { seg: 10 });
    } else if (shoes === "slippers") {
      ctx.color(SHOEC); ell([x, 0.06, -0.05], [0.095, 0.072, 0.145], null, { seg: hi ? 16 : 10 });
      ctx.color("#ffffff"); ell([x, 0.11, -0.16], [0.03, 0.03, 0.03], null, { seg: 10 });
    }
  }
  // ---- NECK ----
  wOverride = { Spine2: 0.5, Neck: 0.5 };
  if (neck === "bowtie") {
    ctx.color(NECKC);
    for (const sd of [-1, 1]) ell([sd * 0.045, 0.985, -0.135], [0.045, 0.032, 0.016], null, { seg: 10 });
    ell([0, 0.985, -0.142], [0.018, 0.018, 0.014], null, { seg: 8 });
  } else if (neck === "bell") {
    ctx.color(NECKC); ell([0, 1.0, 0], [0.12, 0.022, 0.115], null, { seg: 16 });
    ctx.color("#ffd23f"); ctx.metalness(0.6); ell([0, 0.965, -0.125], [0.032, 0.032, 0.032], null, { seg: 10 }); ctx.metalness(null);
  } else if (neck === "cape") {
    wOverride = { Spine2: 0.7, Spine1: 0.3 };
    ctx.color(NECKC); ell([0, 1.0, 0], [0.14, 0.03, 0.13], null, { seg: 16 });
    const M = 10, R = 5;
    const pt = (u, v) => { const x = (u - 0.5) * lerp(0.34, 0.5, v); return [x, lerp(0.99, 0.5, v), 0.16 + 0.05 * v + 0.05 * (1 - Math.cos((u - 0.5) * 3)) * -1 + 0.02]; };
    for (let r = 0; r < R; r++) for (let k = 0; k < M; k++) {
      const A = pt(k / M, r / R), B = pt((k + 1) / M, r / R), C2 = pt((k + 1) / M, (r + 1) / R), D = pt(k / M, (r + 1) / R);
      ctx.color(r === R - 1 ? mixc(NECKC, "#ffffff", 0.35) : NECKC);
      quad(A, B, C2, D); quad(D, C2, B, A);
    }
  }
  wOverride = null;

  // ---------- Face: Sparkling anime eyes, expressive mouths, cute blush ----------
  ctx.flat();
  wOverride = { Head: 1 };

  // Panda eye patches
  if (sp.patch) {
    ctx.color(sp.patch);
    for (const s of [-1, 1]) {
      fill(ellipse(s * 0.134, 0.053, 0.155, 0.17, hi ? 28 : 16, s * 0.45), 0.004);
    }
  }

  // Muzzle marking & Bandit mask
  if (sp.mask) {
    ctx.color(sp.mask);
    fill([
      [-0.30, 0.12], [-0.05, 0.06], [0.0, 0.03], [0.05, 0.06], [0.30, 0.12],
      [0.32, -0.04], [0.15, -0.06], [0.0, -0.03], [-0.15, -0.06], [-0.32, -0.04]
    ], 0.003);
  }

  // Expression profile configuration
  const E = (() => {
    const t = {
      eye: "open", pupil: 1, lid: 0, lidTilt: 0, brow: 0, browY: 0,
      mouth: "grin", blush: false, tear: false, look: 0, sweat: false, wide: false
    };
    switch (expr) {
      case "smile":     t.mouth = "smile"; t.blush = true; break;
      case "joy":       Object.assign(t, { eye: "closed", mouth: "grin", blush: true, browY: 0.02 }); break;
      case "laugh":     Object.assign(t, { eye: "closed", mouth: "laugh", blush: true, browY: 0.03, tear: "joy" }); break;
      case "surprised": Object.assign(t, { pupil: 0.55, browY: 0.035, mouth: "o" }); break;
      case "sad":       Object.assign(t, { brow: -0.4, lid: 0.15, lidTilt: -0.12, mouth: "frown", tear: true, pupil: 1.1 }); break;
      case "cry":       Object.assign(t, { brow: -0.5, lid: 0.1, lidTilt: -0.1, mouth: "wail", tear: "stream", pupil: 1.15 }); break;
      case "angry":     Object.assign(t, { brow: 0.52, lid: 0.32, lidTilt: 0.25, mouth: "gritted", pupil: 0.8 }); break;
      case "evil":      Object.assign(t, { brow: 0.55, lid: 0.36, lidTilt: 0.3, mouth: "grin", wide: true, pupil: 0.65 }); break;
      case "smug":      Object.assign(t, { lid: 0.45, brow: 0.12, mouth: "smirk", blush: true }); break;
      case "scared":    Object.assign(t, { pupil: 0.45, brow: -0.45, browY: 0.02, mouth: "wavy", sweat: true }); break;
      case "sleepy":    Object.assign(t, { lid: 0.62, brow: -0.1, mouth: "o_small" }); break;
      case "bored":     Object.assign(t, { lid: 0.52, pupil: 0.82, mouth: "flat" }); break;
      case "love":      Object.assign(t, { eye: "heart", mouth: "grin", blush: true }); break;
      case "sparkle":   Object.assign(t, { eye: "star", mouth: "grin", blush: true, browY: 0.03 }); break;
      case "wink":      Object.assign(t, { eye: "wink", mouth: "tongue", blush: true }); break;
      case "blep":      Object.assign(t, { mouth: "blep", blush: true, browY: 0.015, pupil: 1.05 }); break;
      case "pout":      Object.assign(t, { lid: 0.14, brow: 0.3, mouth: "pout", blush: true, pupil: 0.95 }); break;
      case "shy":       Object.assign(t, { look: 1, brow: -0.25, lid: 0.08, mouth: "smile_small", blush: true, pupil: 0.95 }); break;
      case "kiss":      Object.assign(t, { eye: "closed", mouth: "kiss", blush: true }); break;
      case "dizzy":     Object.assign(t, { eye: "x", mouth: "wavy" }); break;
    }
    return t;
  })();

  // Eye geometry metrics
  const ESH = { round: [1, 1], tall: [0.88, 1.22], wide: [1.2, 0.88] }[P.eyes] || [1, 1];
  const EX = 0.134, EY = 0.065 + (ESH[1] - 1) * 0.06, ERU = 0.106 * ESH[0], ERV = 0.126 * ESH[1];
  const star = (cu, cv, R, r, pts = 4) => {
    const o = [];
    for (let i = 0; i < pts * 2; i++) {
      const a = -(i / (pts * 2)) * Math.PI * 2 + Math.PI / 2, rad = i % 2 ? r : R;
      o.push([cu + Math.cos(a) * rad, cv + Math.sin(a) * rad]);
    }
    return o;
  };

  const brow = (s, cu) => {
    ctx.color(INK);
    const by = EY + ERV + 0.036 + E.browY;
    stroke((t) => {
      const u = cu + (t - 0.5) * 0.14;
      return [u, by - E.brow * (u - cu) * s * -0.5 + 0.014 * Math.sin(Math.PI * t)];
    }, 0.024, 0.008, 8);
  };

  for (const s of [-1, 1]) {
    const cu = s * EX;
    const closed = E.eye === "closed" || (E.eye === "wink" && s > 0);

    if (closed) {
      ctx.color(INK);
      stroke((t) => [cu + (t - 0.5) * 0.22, EY - 0.02 + 0.075 * Math.sin(Math.PI * t)], 0.032, 0.012);
      if (fem) {
        tri(onHead(cu + s * 0.10, EY + 0.01, 0.014), onHead(cu + s * 0.14, EY + 0.045, 0.014), onHead(cu + s * 0.08, EY + 0.03, 0.014));
      }
      if (E.tear === "joy") {
        ctx.color("#8fd3ff");
        fill(ellipse(cu + s * 0.12, EY - 0.01, 0.014, 0.025), 0.02);
      }
      brow(s, cu);
      continue;
    }

    if (E.eye === "x") {
      ctx.color(INK);
      for (const sg of [-1, 1]) {
        stroke((t) => { const d = (t - 0.5) * 0.11; return [cu + d, EY + sg * d]; }, 0.024, 0.012, 6);
      }
      brow(s, cu);
      continue;
    }

    // Eye ink border and white sclera
    ctx.color(INK);
    fill(ellipse(cu, EY, ERU + 0.02, ERV + 0.02), 0.006);
    ctx.color("#ffffff");
    fill(ellipse(cu, EY, ERU, ERV), 0.009);

    const pr = E.pupil;
    const pu = cu - s * 0.006 + E.look * 0.032;
    const pv = EY - 0.012;

    if (E.eye === "heart") {
      ctx.color("#ff3366");
      const h = [];
      for (let i = 0; i < 24; i++) {
        const a = -(i / 24) * Math.PI * 2;
        const x = 16 * Math.sin(a) ** 3;
        const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        h.push([pu + x * 0.0054, pv + 0.01 + y * 0.0054]);
      }
      fill(h, 0.012);
      ctx.color("#ffffff");
      fill(ellipse(pu - s * 0.018, pv + 0.032, 0.016, 0.016), 0.018);
    } else {
      ctx.color(mixc(EYE, "#08040d", 0.6));
      fill(ellipse(pu, pv + 0.015, 0.076 * pr, 0.082 * pr), 0.011);
      ctx.color(EYE);
      fill(ellipse(pu, pv - 0.01, 0.076 * pr, 0.082 * pr), 0.012);
      ctx.color("#100818");
      fill(ellipse(pu, pv - 0.005, 0.046 * pr, 0.055 * pr), 0.013);

      if (E.eye === "star") {
        ctx.color("#ffffff");
        fill(star(pu, pv, 0.065, 0.019), 0.018);
      } else {
        // Specular highlights
        ctx.color("#ffffff");
        fill(ellipse(pu - s * 0.022, pv + 0.032, 0.025, 0.032), 0.018);
        fill(ellipse(pu + s * 0.024, pv - 0.032, 0.014, 0.014), 0.018);
      }
    }

    if (E.lid > 0) {
      ctx.color(FUR);
      const cut = EY + ERV + 0.016 - E.lid * 2 * (ERV + 0.016);
      const poly = [];
      const tiltAt = (u) => cut + E.lidTilt * (u - cu) * s * -1;
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI * (i / 14);
        const u = cu + Math.cos(a) * (ERU + 0.03);
        const v = EY + Math.sin(a) * (ERV + 0.03);
        poly.push([u, Math.max(v, tiltAt(u))]);
      }
      fill(poly.reverse().concat([]), 0.021);
      ctx.color(INK);
      stroke((t) => {
        const u = cu + (t - 0.5) * 2 * (ERU + 0.018);
        const kk = 1 - ((u - cu) / (ERU + 0.02)) ** 2;
        return [u, Math.min(tiltAt(u), EY + Math.sqrt(Math.max(0, kk)) * (ERV + 0.02))];
      }, 0.016, 0.022);
    }

    if (fem) {
      ctx.color(INK);
      for (let n = 0; n < 2; n++) {
        const a = 0.44 + n * 0.38;
        const bu = cu + s * Math.cos(a) * (ERU + 0.015);
        const bv = EY + Math.sin(a) * (ERV + 0.015);
        const tipLash = [bu + s * 0.06 * Math.cos(a - 0.12), bv + 0.055 * Math.sin(a + 0.5) + 0.014];
        tri(onHead(bu, bv + 0.008, 0.02), onHead(tipLash[0], tipLash[1], 0.02), onHead(bu - s * 0.006, bv - 0.008, 0.02));
        if (s < 0) tri(onHead(bu, bv + 0.008, 0.02), onHead(bu - s * 0.006, bv - 0.008, 0.02), onHead(tipLash[0], tipLash[1], 0.02));
      }
    }

    if (E.tear === true) {
      ctx.color("#8fd3ff");
      fill(ellipse(cu + s * 0.05, EY - ERV - 0.01, 0.02, 0.032), 0.02);
    }
    if (E.tear === "stream") {
      ctx.color("#8fd3ff");
      fill(ellipse(cu + s * 0.03, EY - ERV - 0.03, 0.028, 0.048), 0.02);
      fill(ellipse(cu + s * 0.045, EY - ERV - 0.105, 0.022, 0.042), 0.02);
    }

    // Dynamic blink lid: skin over the eye with a soft closed-eye line, scaled up by critter.js to blink
    {
      wOverride = { [s < 0 ? "LidL" : "LidR"]: 1 };
      SHRINK = { c: [s * EX, 1.365, -0.3], k: 1 / 1000 };
      ctx.color(sp.patch || sp.headFur || FUR);
      fill(ellipse(cu, EY, ERU + 0.028, ERV + 0.026, hi ? 24 : 14), 0.03);
      ctx.color(INK);
      stroke((t) => [cu + (t - 0.5) * 2 * (ERU + 0.005), EY - 0.012 - 0.032 * Math.sin(Math.PI * t)], 0.028, 0.034, 10);
      SHRINK = null;
      wOverride = null;
    }

    brow(s, cu);
  }

  // Blushing cheeks with anime diagonal blush lines
  if (E.blush) {
    ctx.color("#ff7f9f");
    for (const s of [-1, 1]) {
      fill(ellipse(s * 0.23, -0.075, 0.062, 0.034), 0.008);
      ctx.color("#ff4d79");
      for (let n = -1; n <= 1; n++) {
        stroke((t) => {
          const u = s * (0.23 + n * 0.022) + (t - 0.5) * 0.015 * s;
          const v = -0.075 + (t - 0.5) * 0.028;
          return [u, v];
        }, 0.005, 0.012, 4);
      }
    }
  }

  if (E.sweat) {
    ctx.color("#8fd3ff");
    fill(ellipse(0.25, 0.17, 0.022, 0.038), 0.022);
  }

  // 3D Dimensional Button Nose or Pig Snout
  if (sp.snout) {
    ctx.smooth();
    ctx.color(sp.nose);
    ell([0, HC[1] - 0.062, onHead(0, -0.062, 0)[2] - 0.014], [0.065, 0.046, 0.03], null, { seg: hi ? 16 : 10 });
    ctx.flat();
    ctx.color(INK);
    for (const s of [-1, 1]) {
      fill(ellipse(s * 0.022, -0.062, 0.009, 0.015, 8), 0.016);
    }
  } else {
    ctx.smooth();
    ctx.color(sp.nose);
    ell([0, HC[1] - 0.05, onHead(0, -0.05, 0)[2] - 0.01], [0.034, 0.026, 0.028], null, { seg: hi ? 14 : 8 });
    ctx.color("#ffffff");
    ell([0.008, HC[1] - 0.044, onHead(0, -0.05, 0)[2] - 0.022], [0.008, 0.008, 0.008], null, { seg: 6 });
  }

  // Whiskers for cat/mouse
  if (sp.whisk && mid) {
    ctx.flat();
    ctx.color(INK);
    for (const s of [-1, 1]) {
      for (let n = 0; n < 2; n++) {
        stroke((t) => [
          s * (0.16 + t * 0.15),
          -0.10 + n * 0.035 + t * (0.012 - n * 0.032)
        ], 0.006, 0.008, 4);
      }
    }
  }

  // Face Markings
  {
    const dark = mixc(FUR, "#1d1420", 0.45);
    if (P.marks === "freckles") {
      ctx.color(dark);
      for (const s of [-1, 1]) for (let n = 0; n < 5; n++) {
        fill(ellipse(s * (0.17 + (n % 3) * 0.032 + (n > 2 ? 0.016 : 0)), -0.04 - (n > 2 ? 0.026 : 0) - 0.006 * (n % 2), 0.0085, 0.0085, 8), 0.005);
      }
    } else if (P.marks === "stripes") {
      ctx.color(dark);
      for (const [u, h] of [[-0.075, 0.05], [0, 0.07], [0.075, 0.05]]) {
        fill(ellipse(u, 0.255 - (0.07 - h) * 0.4, 0.011, h * 0.5, 10), 0.005);
      }
    } else if (P.marks === "patch") {
      ctx.color(dark);
      fill(ellipse(-EX, EY - 0.005, 0.15, 0.17), 0.003);
    } else if (P.marks === "heart") {
      ctx.color("#ff6f9a");
      const h = [];
      for (let i = 0; i < 20; i++) {
        const a = -(i / 20) * Math.PI * 2;
        const x = 16 * Math.sin(a) ** 3;
        const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        h.push([-0.255 + x * 0.0016, -0.012 + y * 0.0016]);
      }
      fill(h, 0.005);
    }
  }

  // Mouth & Expressions
  const MY = -0.135;
  ctx.flat();
  ctx.color(INK);
  const MO = E.mouth;

  if (MO === "grin" || MO === "laugh" || MO === "tongue" || MO === "gritted") {
    const w = MO === "gritted" ? 0.1 : MO === "laugh" ? 0.135 : E.wide ? 0.138 : 0.125;
    const D = MO === "laugh" ? 0.13 : E.wide ? 0.105 : 0.095;
    const cv = MO === "laugh" ? 1.3 : 1.1;
    const up = (t) => { const u = (t - 0.5) * 2 * w; return [u, MY + 0.03 + cv * u * u]; };
    const lo = (t) => {
      const u = (t - 0.5) * 2 * w;
      return MO === "gritted" ? [u, MY - 0.035 + 0.8 * u * u] : [u, MY + 0.03 + cv * u * u - D * Math.sin(Math.PI * t) ** 0.8];
    };
    band((t) => { const p = up(t); return [p[0] * 1.07, p[1] + 0.013]; }, (t) => { const p = lo(t); return [p[0] * 1.07, p[1] - 0.013]; }, 0.007);
    ctx.color("#561626");
    band(up, lo, 0.01);

    if (MO !== "gritted") {
      const tv = MY - 0.035 - (D - 0.09) * 0.55;
      const tr = MO === "laugh" ? 0.072 : 0.058;
      ctx.color("#ff6f8e");
      fill(ellipse(0.005, tv, tr, MO === "tongue" ? 0.046 : MO === "laugh" ? 0.052 : 0.038), 0.012);
      ctx.color("#ff90ab");
      fill(ellipse(0.005, tv + 0.008, tr * 0.58, 0.016), 0.013);
    }
    if (MO !== "tongue") {
      ctx.color("#ffffff");
      const len = MO === "gritted" ? 0.038 : 0.024;
      band(up, (t) => { const p = up(t); return [p[0], p[1] - len]; }, 0.013);
      if (sp.buck) {
        for (const sg of [-1, 1]) {
          fill([[sg * 0.004, MY + 0.028], [sg * 0.032, MY + 0.028], [sg * 0.032, MY - 0.015], [sg * 0.004, MY - 0.015]], 0.015);
        }
      }
      if (sp.fangs) {
        for (const t of [0.26, 0.74]) {
          const a = up(t - 0.045), b = up(t + 0.045), m = up(t);
          fill([[a[0], a[1] + 0.004], [b[0], b[1] + 0.004], [m[0] + 0.001, m[1] - len - 0.032]], 0.016);
        }
      }
    }
  } else if (MO === "smile" || MO === "frown" || MO === "smirk") {
    const kk = MO === "frown" ? -1 : 1;
    stroke((t) => {
      const u = (t - 0.5) * 0.16 + (MO === "smirk" ? 0.02 : 0);
      const lift = MO === "smirk" ? (t > 0.5 ? 2.6 : 0.6) : 1.6;
      return [u, MY + 0.01 + kk * (lift * u * u) - (kk < 0 ? -0.02 : 0)];
    }, 0.016, 0.01, 12);
    if (MO === "smirk" && !sp.buck) {
      ctx.color("#ffffff");
      tri(onHead(0.06, MY + 0.022, 0.014), onHead(0.068, MY - 0.004, 0.014), onHead(0.078, MY + 0.028, 0.014));
    }
  } else if (MO === "smile_small") {
    stroke((t) => { const u = (t - 0.5) * 0.095; return [u, MY + 0.016 + 2.2 * u * u]; }, 0.015, 0.01, 8);
  } else if (MO === "blep") {
    stroke((t) => { const u = (t - 0.5) * 0.17; return [u, MY + 0.02 + 1.9 * u * u]; }, 0.016, 0.01, 12);
    ctx.color("#ff6f8e");
    fill(ellipse(0.025, MY - 0.012, 0.032, 0.044), 0.013);
    ctx.color("#ff90ab");
    fill(ellipse(0.025, MY - 0.008, 0.016, 0.02), 0.015);
  } else if (MO === "wail") {
    const w = 0.12, up = (t) => { const u = (t - 0.5) * 2 * w; return [u, MY + 0.03 - 1.0 * u * u]; };
    const lo = (t) => { const p = up(t); return [p[0], p[1] - 0.09 * Math.sin(Math.PI * t) ** 0.8]; };
    band((t) => { const p = up(t); return [p[0] * 1.07, p[1] + 0.013]; }, (t) => { const p = lo(t); return [p[0] * 1.07, p[1] - 0.013]; }, 0.007);
    ctx.color("#561626"); band(up, lo, 0.01);
    ctx.color("#ff6f8e"); fill(ellipse(0, MY - 0.05, 0.052, 0.024), 0.013);
  } else if (MO === "pout") {
    stroke((t) => { const u = (t - 0.5) * 0.11; return [u, MY + 0.005 - 3 * u * u + 0.004 * Math.sin(t * Math.PI * 3)]; }, 0.015, 0.01, 10);
  } else if (MO === "flat") {
    stroke((t) => [(t - 0.5) * 0.1, MY + 0.008], 0.014, 0.01, 4);
  } else if (MO === "kiss") {
    ctx.color("#ff7a9a"); fill(ellipse(0, MY + 0.005, 0.036, 0.03), 0.01);
    ctx.color(INK); fill(ellipse(0.004, MY + 0.005, 0.012, 0.008, 8), 0.012);
  } else if (MO === "o" || MO === "o_small") {
    const r = MO === "o" ? 1 : 0.55;
    fill(ellipse(0, MY - 0.01, 0.044 * r, 0.052 * r), 0.008);
    ctx.color("#561626"); fill(ellipse(0, MY - 0.01, 0.032 * r, 0.04 * r), 0.011);
  } else if (MO === "wavy") {
    band((t) => { const u = (t - 0.5) * 0.18; return [u, MY + 0.012 * Math.sin(t * Math.PI * 4) + 0.02]; },
         (t) => { const u = (t - 0.5) * 0.18; return [u, MY + 0.012 * Math.sin(t * Math.PI * 4) - 0.03]; }, 0.008);
    ctx.color("#ffffff");
    band((t) => { const u = (t - 0.5) * 0.16; return [u, MY + 0.012 * Math.sin(t * Math.PI * 4) + 0.012]; },
         (t) => { const u = (t - 0.5) * 0.16; return [u, MY + 0.012 * Math.sin(t * Math.PI * 4) - 0.022]; }, 0.011);
    ctx.color(INK);
    stroke((t) => [(t - 0.5) * 0.16, MY + 0.012 * Math.sin(t * Math.PI * 4) - 0.005], 0.005, 0.014);
  }

  // ---------- Accessories: 3D Bow, Flower, Cap, Beanie, Crown, Headphones, Partyhat, Glasses, Shades, Scarf, Tuft ----------
  ctx.smooth();
  wOverride = { Head: 1 };

  if (hat === "bow") {
    ctx.color(HATC);
    const c = [-0.17, 1.60, -0.12];
    ell(c, [0.03, 0.034, 0.034], null, { seg: 10 });
    ell([c[0] - 0.065, c[1] + 0.01, c[2]], [0.07, 0.048, 0.028], null, { seg: 12 });
    ell([c[0] + 0.065, c[1] + 0.01, c[2]], [0.07, 0.048, 0.028], null, { seg: 12 });
    limb([c[0] - 0.02, c[1] - 0.02, c[2]], [c[0] - 0.05, c[1] - 0.10, c[2] - 0.01], 0.02, 0.024, 6);
    limb([c[0] + 0.02, c[1] - 0.02, c[2]], [c[0] + 0.05, c[1] - 0.10, c[2] - 0.01], 0.02, 0.024, 6);
  } else if (hat === "flower") {
    const c = [0.20, 1.57, -0.16];
    ctx.color("#ffd1e3");
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ell([c[0] + Math.cos(a) * 0.042, c[1] + Math.sin(a) * 0.042, c[2]], [0.032, 0.032, 0.014], null, { seg: 10 });
    }
    ctx.color("#ffd84a");
    ell([c[0], c[1], c[2] - 0.01], [0.024, 0.024, 0.014], null, { seg: 10 });
    ctx.color("#6bc877");
    ell([c[0] + 0.05, c[1] - 0.04, c[2] + 0.01], [0.03, 0.018, 0.01], null, { seg: 8 });
  } else if (hat === "cap") {
    ctx.color(HATC);
    ell([0, 1.48, 0.0], [0.34, 0.18, 0.32], null, { clip: (p) => p[1] < 1.50 });
    ell([0, 1.50, -0.34], [0.21, 0.014, 0.15], null, { clip: (p) => p[2] > -0.24 });
    ctx.color("#ffffff");
    ell([0, 1.67, 0], [0.026, 0.014, 0.026], null, { seg: 8 });
  } else if (hat === "beanie") {
    ctx.color(HATC);
    ell([0, 1.47, 0], [0.352, 0.20, 0.332], null, { clip: (p) => p[1] < 1.47 });
    ctx.color(HATC === "#ffffff" ? "#dddddd" : "#ffffff");
    {
      const ring = [];
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        ring.push([Math.cos(a) * 0.345, 1.46, Math.sin(a) * 0.325]);
      }
      loft(ring, () => [0.03, 0.03], [0, 1, 0], null, 8);
    }
    ctx.color("#ffffff");
    ell([0, 1.69, 0], [0.055, 0.055, 0.055], null, { seg: 12 });
  } else if (hat === "crown") {
    ctx.color("#ffd23f");
    {
      const ring = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ring.push([Math.cos(a) * 0.2, 1.64, Math.sin(a) * 0.2]);
      }
      loft(ring, () => [0.022, 0.03], [0, 1, 0], null, 8);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2;
      loft([[x, 1.64, z], [x, 1.76, z]], (t) => [0.034 * (1 - t) + 0.006, 0.034 * (1 - t) + 0.006], [0, 0, 1], null, 8);
    }
    ctx.color("#ff5d8f");
    ell([0, 1.66, -0.2], [0.02, 0.02, 0.012], null, { seg: 8 });
  } else if (hat === "headphones") {
    ctx.color("#2b2b33");
    {
      const arc = [];
      for (let i = 0; i <= 20; i++) {
        const a = Math.PI - (i / 20) * Math.PI;
        arc.push([Math.cos(a) * 0.375, 1.30 + Math.sin(a) * 0.39, 0]);
      }
      loft(arc, () => [0.02, 0.02], [0, 0, 1], null, 8);
    }
    ctx.color(HATC);
    for (const s of [-1, 1]) {
      ell([s * 0.375, 1.30, 0], [0.065, 0.10, 0.10], null, { seg: 14 });
    }
  } else if (hat === "partyhat") {
    ctx.color(HATC);
    loft([[0.04, 1.58, 0.0], [0.07, 1.82, 0.02]], (t) => [0.12 * (1 - t) + 0.006, 0.12 * (1 - t) + 0.006], [0, 0, 1], null, 14);
    ctx.color("#ffffff");
    ell([0.07, 1.83, 0.02], [0.03, 0.03, 0.03], null, { seg: 10 });
    ctx.color("#ffd23f");
    for (const [x, y] of [[0.02, 1.64], [0.06, 1.70], [0.04, 1.76]]) {
      ell([x, y, -0.085], [0.014, 0.014, 0.008], null, { seg: 8 });
    }
  } else if (hat === "tophat") {
    ctx.color(HATC);
    ell([0, 1.6, 0], [0.27, 0.014, 0.26], null, { seg: hi ? 20 : 12 });
    loft([[0, 1.6, 0], [0, 1.86, 0]], () => [0.17, 0.165], [0, 0, 1], null, hi ? 18 : 10);
    ell([0, 1.86, 0], [0.17, 0.012, 0.165], null, { seg: hi ? 18 : 10 });
    ctx.color("#e85d75"); loft([[0, 1.62, 0], [0, 1.66, 0]], () => [0.176, 0.171], [0, 0, 1], null, hi ? 18 : 10);
  } else if (hat === "tuft") {
    ctx.color(sp.headFur || FUR);
    const ahogePath = [
      [0.0, 1.62, -0.04],
      [0.02, 1.70, -0.08],
      [0.08, 1.76, -0.05],
      [0.12, 1.80, -0.01]
    ];
    loft(ahogePath, (t) => [0.028 * (1 - t) + 0.005, 0.018 * (1 - t) + 0.004], [0, 0, -1], null, 8);
    for (let k = -1; k <= 1; k++) {
      const x = k * 0.05;
      loft([[x, 1.60, -0.03], [x + 0.02, 1.67, -0.06], [x + 0.05, 1.71, -0.02]], (t) => [0.024 * (1 - t) + 0.004, 0.016 * (1 - t) + 0.003], [0, 0, -1], null, 8);
    }
  }
  if (eyew === "glasses") {
    ctx.flat();
    ctx.color(INK);
    ctx.metalness(0.2);
    for (const s of [-1, 1]) {
      const cu = s * EX;
      band((t) => {
        const a = t * Math.PI * 2;
        return [cu + Math.cos(a) * (ERU + 0.032), EY + Math.sin(a) * (ERU + 0.032)];
      }, (t) => {
        const a = t * Math.PI * 2;
        return [cu + Math.cos(a) * (ERU + 0.014), EY + Math.sin(a) * (ERU + 0.014)];
      }, 0.03, hi ? 28 : 14);
    }
    stroke((t) => [(t - 0.5) * 0.05, EY + 0.02], 0.012, 0.03, 3);
    ctx.metalness(null);
  } else if (eyew === "shades") {
    ctx.flat();
    ctx.color(INK);
    for (const s of [-1, 1]) {
      fill(ellipse(s * EX, EY, ERU + 0.04, ERV * 0.78 + 0.03, hi ? 28 : 14), 0.03);
    }
    stroke((t) => [(t - 0.5) * 0.06, EY + 0.02], 0.014, 0.03, 3);
  }
  if (neck === "scarf") {
    ctx.color(NECKC);
    wOverride = { Spine2: 0.5, Neck: 0.5 };
    ell([0, 1.01, 0], [0.125, 0.045, 0.12], null);
    limb([0.05, 0.99, -0.11], [0.07, 0.81, -0.14], 0.032, 0.026, 8);
    wOverride = null;
  }
  wOverride = null;

  return { joints: J, weights: W };
}
