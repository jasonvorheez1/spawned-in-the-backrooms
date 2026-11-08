// Critter v2: rubberhose cartoon x kemono animal folk, built from scratch.
// A wide soft kemono head (jaw flaring into cheek tufts, forehead fluff, a short rounded snout with a button nose),
// huge white eyes ringed in thick ink with solid black pupils (never a shine), tall ears with inner colour and base tufts,
// a pale chest bib, a bushy two-tone tail, plush arms with real paw hands (separate rounded fingers), sturdy legs, paw feet.
// Adults: head ~36% of height; females with bust, narrow waist, wide hips and full thighs; males broader in the chest.
// Clothes are offset shells of this exact body (the top's hem always covers the waistband).
// Params: species sex fur belly eye eyes marks expr topw top botw bottom shoes shoec hat hatc eyew neck neckc
//         outfit/acc (legacy), sliders earS snoutS waistS hipS bustS (headS/tailS ride the bones), hidden.
// Rig: same bone names and pivots as v1 (T-pose); LidL/LidR blink lids are modelled 1/1000 size (critter.js scales them).

const HC = [0, 1.335, 0];
const RX = 0.435, RY = 0.305, RZ = 0.33;
const EX = 0.14, EY = 1.39, LIDZ = -0.3;

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
  LeftUpLeg: { parent: "Hips", pivot: [-0.095, 0.6, 0] },
  LeftLeg: { parent: "LeftUpLeg", pivot: [-0.09, 0.33, 0] },
  LeftFoot: { parent: "LeftLeg", pivot: [-0.088, 0.09, 0] },
  LeftToeBase: { parent: "LeftFoot", pivot: [-0.088, 0.03, -0.1] },
  RightUpLeg: { parent: "Hips", pivot: [0.095, 0.6, 0] },
  RightLeg: { parent: "RightUpLeg", pivot: [0.09, 0.33, 0] },
  RightFoot: { parent: "RightLeg", pivot: [0.088, 0.09, 0] },
  RightToeBase: { parent: "RightFoot", pivot: [0.088, 0.03, -0.1] },
  Tail: { parent: "Hips", pivot: [0, 0.6, 0.13] },
  Tail1: { parent: "Tail", pivot: [0, 0.68, 0.3] },
  EarL: { parent: "Head", pivot: [-0.2, 1.56, 0] },
  EarR: { parent: "Head", pivot: [0.2, 1.56, 0] },
  LidL: { parent: "Head", pivot: [-EX, EY, LIDZ] },
  LidR: { parent: "Head", pivot: [EX, EY, LIDZ] },
};
export function skeleton() { return BONES; }
const NAMES = Object.keys(BONES);
const IDX = Object.fromEntries(NAMES.map((n, i) => [n, i]));
export function collider() { return { kind: "capsule", radius: 0.3, halfHeight: 0.55, center: [0, 0.86, 0] }; }

// ears: point long round leaf flop pig | tail: bushy cat thin stub puff flag ringed curly lion otter
export const SPECIES = {
  cat:      { fur: "#f2a65a", belly: "#fff1dc", nose: "#ff8fa3", ears: "point", earL: 0.25, tail: "cat", tip: "#fff1dc", snout: 0.06, fangs: true, whisk: true, muzzle: true },
  dog:      { fur: "#c98b55", belly: "#fbe8cf", nose: "#2a1c18", ears: "flop", earL: 0.24, tail: "bushy", tip: "#fbe8cf", snout: 0.12, muzzle: true, paw: "#8a5a36", bridge: true },
  fox:      { noBlush: true, fur: "#f07a2e", belly: "#ffffff", nose: "#231816", ears: "point", earL: 0.34, earTip: "#2c1c18", tail: "bushy", tip: "#ffffff", snout: 0.13, fangs: true, muzzle: true, paw: "#2c1c18", bridge: true },
  bunny:    { fur: "#f4efe9", belly: "#ffffff", nose: "#ff9fb4", ears: "long", earL: 0.42, tail: "puff", snout: 0.06, buck: true, muzzle: true, earIn: "#ffc2d1" },
  bear:     { fur: "#9a6440", belly: "#e8c79e", nose: "#2a1c18", ears: "round", earL: 0.13, tail: "stub", snout: 0.11, snoutW: 0.08, muzzle: true, chunky: true, paw: "#6e4329", bridge: true },
  deer:     { fur: "#a8703f", belly: "#f1d4ae", nose: "#2a1612", ears: "leaf", earL: 0.22, tail: "flag", tip: "#ffffff", snout: 0.11, muzzle: true, antlers: true, antler: "#e9d8b4", spots: "#f1d4ae", paw: "#4a2a1c", freck: true, bridge: true },
  reindeer: { fur: "#8a5a3a", belly: "#f1e0c8", nose: "#e0404c", ears: "leaf", earL: 0.22, tail: "stub", tip: "#f6efe4", snout: 0.11, muzzle: true, antlers: true, antler: "#efe0bd", spots: "#f1e0c8", paw: "#4a2e20", freck: true, bridge: true },
  mouse:    { fur: "#b9b3c2", belly: "#f6eef4", nose: "#ff8fa3", ears: "round", earL: 0.2, earW: 1.5, tail: "thin", snout: 0.08, whisk: true, muzzle: true, earIn: "#ffc2d1" },
  wolf:     { fur: "#4f6f9f", belly: "#a9bfdc", nose: "#16141c", ears: "point", earL: 0.36, earTip: "#26406c", tail: "bushy", tip: "#a9bfdc", snout: 0.14, fangs: true, muzzle: true, paw: "#26406c", bridge: true },
  raccoon:  { fur: "#8b8a92", belly: "#e9e6ea", nose: "#1c1a20", ears: "point", earL: 0.17, tail: "ringed", tip: "#2a2830", snout: 0.11, muzzle: true, mask: "#2c2a32", paw: "#2c2a32", whisk: true, bridge: true },
  panda:    { fur: "#f7f3ee", belly: "#ffffff", nose: "#1c1a20", ears: "round", earL: 0.13, earCol: "#2b2530", tail: "stub", snout: 0.08, chunky: true, limbs: "#2b2530", patch: "#2b2530" },
  pig:      { fur: "#ffb3c1", belly: "#ffd9e0", nose: "#ff8ca2", ears: "pig", earL: 0.15, tail: "curly", snout: 0.12, pig: true, muzzle: false },
  sheep:    { fur: "#f6f1e7", belly: "#ffffff", headFur: "#5d5560", nose: "#2a1c18", ears: "flop", earL: 0.14, tail: "puff", snout: 0.08, wool: true, paw: "#5d5560", earIn: "#8a7f8c" },
  lion:     { fur: "#ebb04e", belly: "#fbe3b0", nose: "#8a4a2a", ears: "round", earL: 0.11, tail: "lion", tip: "#a3592a", snout: 0.11, muzzle: true, mane: "#a3592a", fangs: true, whisk: true, bridge: true },
  tiger:    { fur: "#f08a24", belly: "#fff6ea", nose: "#ff8fa3", ears: "round", earL: 0.12, earSpot: "#ffffff", tail: "ringed", tip: "#2a1c18", snout: 0.09, fangs: true, whisk: true, muzzle: true, stripes: "#2a1c18" },
  redpanda: { fur: "#c4532a", belly: "#3a2018", nose: "#1c1a20", ears: "point", earL: 0.17, earCol: "#f4ece2", tail: "ringed", tip: "#7a2e16", snout: 0.09, fangs: true, muzzle: true, face: "#f4ece2", tear: "#7a2e16", paw: "#2b1a14" },
  skunk:    { fur: "#2e2c36", belly: "#f4f1ea", nose: "#16141c", ears: "round", earL: 0.12, tail: "bushy", tip: "#f4f1ea", snout: 0.10, muzzle: false, skunk: "#f4f1ea", bridge: true },
  hamster:  { fur: "#e8b77a", belly: "#fff4e0", nose: "#ff8fa3", ears: "round", earL: 0.12, tail: "stub", snout: 0.05, buck: true, chunky: true, whisk: true, muzzle: true, cheek: 1.8, earIn: "#ffc2d1" },
  otter:    { fur: "#7a5236", belly: "#e8d2b4", nose: "#2a1c18", ears: "round", earL: 0.08, tail: "otter", snout: 0.09, whisk: true, muzzle: true, paw: "#5a3a24" },
  koala:    { fur: "#9a9aa4", belly: "#ececf0", nose: "#2a2830", ears: "round", earL: 0.2, earW: 1.45, earIn: "#f4f4f6", tail: "stub", snout: 0.05, chunky: true, bignose: true, muzzle: false, fluffEar: true },
};

// the Nov 8 species: the scripted fallback and the first-person hands read these (the Blender heads are the real thing: art/critter-cute/build.py)
Object.assign(SPECIES, {
  rat: { ...SPECIES.mouse, fur: "#8a8078", belly: "#d8cfc4", nose: "#e8929e", ears: "round", earL: 0.17, earW: 0.95, tail: "thin", snout: 0.13, whisk: true, muzzle: true, earIn: "#f0b8b8", bridge: true },
  squirrel: { ...SPECIES.hamster, fur: "#b8683a", belly: "#f4e4cf", tail: "bushy", ears: "point", earL: 0.16, tip: "#f4e4cf", snout: 0.07 },
  leopard: { ...SPECIES.tiger, fur: "#e8b24a", belly: "#fff1d4", stripes: undefined, spots: "#2a1c18", tail: "cat", snout: 0.09 },
  jackal: { ...SPECIES.wolf, fur: "#c89a5a", belly: "#f1dcb8", earTip: "#2a1c18", tip: "#2a1c18", paw: "#5a3a22", snout: 0.14, bridge: true },
  badger: { fur: "#5c5864", belly: "#2e2c36", nose: "#16141c", ears: "round", earL: 0.11, earTip: "#e8e4dc", tail: "stub", snout: 0.11, muzzle: true, mask: "#2e2c36", cheek: 1.15, face: "#f1ece4", bridge: true },
  ferret: { fur: "#c9a47c", belly: "#efe0c8", nose: "#e8929e", ears: "round", earL: 0.09, tail: "otter", tip: "#5a4030", snout: 0.10, muzzle: true, earIn: "#f0c8c0" },
  beaver: { ...SPECIES.otter, fur: "#7a4a2c", belly: "#d8b88c", buck: true, snout: 0.10, snoutW: 0.08, bridge: true },
  capybara: { fur: "#a07848", belly: "#d8b88a", nose: "#2a1c18", ears: "round", earL: 0.09, earW: 0.95, tail: "stub", snout: 0.15, snoutW: 0.12, muzzle: true, chunky: true, earIn: "#d8a888", bridge: true },
  lop: { ...SPECIES.bunny, fur: "#d8c4a8", ears: "flop", earL: 0.3 },
  fennec: { ...SPECIES.fox, fur: "#e8c898", earL: 0.5, earTip: "#7a5a38", snout: 0.12, bridge: true },
});

// expressions: eyes, mouth, brows, extras
const EXPR = {
  grin: { e: "open", m: "grin", b: 0 }, smile: { e: "open", m: "smile", b: 0 }, beam: { e: "happy", m: "beam", b: 0.4 },
  fang: { e: "open", m: "fang", b: 0 }, shock: { e: "wide", m: "o", b: 1, sweat: true }, teary: { e: "open", m: "wobble", b: -0.6, tear: 1 },
  joy: { e: "happy", m: "beam", b: 0.4, blush: true }, laugh: { e: "squint", m: "laugh", b: 0.5 }, wink: { e: "wink", m: "grin", b: 0.2 },
  blep: { e: "open", m: "blep", b: 0 }, love: { e: "heart", m: "grin", b: 0.3, blush: true, hearts: true }, sparkle: { e: "star", m: "beam", b: 0.5, sparks: true },
  kiss: { e: "happy", m: "kiss", b: 0.2, blush: true, hearts: true }, shy: { e: "down", m: "small", b: -0.5, blush: true }, smug: { e: "half", m: "smirk", b: 0.5, uneven: true },
  lidded: { e: "half", m: "smile", b: 0 }, sideeye: { e: "side", m: "flat", b: -0.2 }, unimpressed: { e: "heavy", m: "flat", b: 0 },
  cocky: { e: "half", m: "smirkfang", b: 0.6, uneven: true }, pout: { e: "open", m: "pout", b: -0.8, blush: true }, evil: { e: "angry", m: "evil", b: -1 },
  bored: { e: "heavy", m: "flatslant", b: 0 }, surprised: { e: "wide", m: "o", b: 1 }, scared: { e: "wide", m: "scream", b: -0.9, sweat: true },
  sad: { e: "sad", m: "frown", b: -0.9 }, cry: { e: "cryshut", m: "wail", b: -1, tear: 2 }, angry: { e: "angry", m: "shout", b: -1 },
  dizzy: { e: "spiral", m: "wobble", b: 0.3 }, sleepy: { e: "shut", m: "o-small", b: 0 },
  catmouth: { e: "happy", m: "smile", b: 0.2, blush: true },
  curious: { e: "wide", m: "small", b: 0.4 },
  nervous: { e: "wide", m: "wobble", b: -0.4, sweat: true, blush: true },
  flustered: { e: "spiral", m: "o", b: 0.6, blush: true, sweat: true },
  determined: { e: "angry", m: "smirk", b: -0.5 },
  disgusted: { e: "heavy", m: "wobble", b: -0.7 },
  relieved: { e: "happy", m: "smile", b: -0.2 },
};
  cocky: { e: "half", m: "smirkfang", b: 0.6, uneven: true }, pout: { e: "open", m: "pout", b: -0.8, blush: true }, evil: { e: "angry", m: "evil", b: -1 },
  bored: { e: "heavy", m: "flatslant", b: 0 }, surprised: { e: "wide", m: "o", b: 1 }, scared: { e: "wide", m: "scream", b: -0.9, sweat: true },
  sad: { e: "sad", m: "frown", b: -0.9 }, cry: { e: "cryshut", m: "wail", b: -1, tear: 2 }, angry: { e: "angry", m: "shout", b: -1 },
  dizzy: { e: "spiral", m: "wobble", b: 0.3 }, sleepy: { e: "shut", m: "o-small", b: 0 },
};

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
const norm3 = (a) => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex2 = (h) => { if (!h || h[0] !== "#" || h.length < 7) return [200, 200, 200]; const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixc = (h1, h2, f) => { const a = hex2(h1), b = hex2(h2); return "#" + a.map((x, i) => Math.round(x + (b[i] - x) * f).toString(16).padStart(2, "0")).join(""); };
const TAU = Math.PI * 2;
// smooth interpolation through [y, v] keys
const prof = (keys, y) => {
  if (y <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (y <= keys[i][0]) { const [y0, v0] = keys[i - 1], [y1, v1] = keys[i]; const t = (y - y0) / (y1 - y0); return lerp(v0, v1, t * t * (3 - 2 * t)); }
  return keys[keys.length - 1][1];
};
const crom = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return [0, 1, 2].map((i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)); };

export function geometry(ctx) {
  const P = ctx.params || {};
  if (P.hidden) { ctx.tri(0, 0, 0, 0.0001, 0, 0, 0, 0.0001, 0); return; }
  const SPK = SPECIES[P.species] ? P.species : "cat";
  const sp = SPECIES[SPK];
  const fem = P.sex === "f";
  const SZ = (k, lo, hi) => clamp(Number(P[k]) || 1, lo, hi);
  const FUR = P.fur || sp.fur, BELLY = P.belly || sp.belly, HFUR = sp.headFur || FUR;
  const PAW = sp.paw || mixc(FUR, "#000000", 0.12), LIMB = sp.limbs || FUR;
  const INK = "#141018", MOUTH = "#4a0f1c", TONGUE = "#ff7d92", WHITE = "#ffffff", BLUSH = "#ff8fae";
  const EYEC = P.eye || "#2b2233";
  const outfit = P.outfit || "tee", acc = P.acc || "none";
  const LEGACY = { tee: ["tee", "pants"], hoodie: ["hoodie", "pants"], sweater: ["sweater", "pants"], jacket: ["jacket", "pants"], overalls: ["tee", "overalls"], apron: ["apron", "pants"], pajamas: ["pajamas", "pjpants"], skirt: ["tee", "skirt"], dress: ["dress", "none"], none: ["none", "none"] };
  const topw = P.topw || (LEGACY[outfit] || LEGACY.tee)[0];
  const botw = P.botw || (LEGACY[outfit] || LEGACY.tee)[1];
  const hat = P.hat || (["bow", "flower", "cap", "beanie", "crown", "headphones", "partyhat", "tuft"].includes(acc) ? acc : "none");
  const eyew = P.eyew || (["glasses", "shades"].includes(acc) ? acc : "none");
  const neck = P.neck || (acc === "scarf" ? "scarf" : "none");
  const shoes = P.shoes || "none";
  const TOP = P.top || "#e85d75", BOT = P.bottom || "#3d5a98";
  const HATC = P.hatc || TOP, NECKC = P.neckc || "#f3c64a", SHOEC = P.shoec || "#f4f1ea";
  let E = EXPR[P.expr] || EXPR.grin;
  if (P.talking || P.speech) {
    const t = ((P.talkTime ? P.talkTime * 1000 : Date.now()) / 160) % 3;
    if (t < 1) E = { ...E, m: "beam" };
    else if (t < 2) E = { ...E, m: "o" };
    else E = { ...E, m: "smile" };
  }
  const marks = P.marks || "none";
  const LOD = ctx.lod || 1, hi = LOD <= 1, mid = LOD <= 2, low = LOD >= 4;
  const M = hi ? 14 : mid ? 12 : LOD === 3 ? 9 : 6; // ring segments for limbs

  // ---------- emit with skin weights ----------
  const J = [], Wt = [];
  let WO = null, SH = null;
  const autoW = (p) => {
    const [x, y, z] = p, side = x < 0 ? "Left" : "Right", ax = Math.abs(x);
    if (y > 1.06) return { Head: 1 };
    if (y > 0.86 && ax > 0.14) {
      if (ax < 0.21) return { Spine2: 1 - sstep(0.14, 0.21, ax), [side + "Arm"]: sstep(0.14, 0.21, ax) };
      const e = sstep(0.31, 0.39, ax), h = sstep(0.49, 0.55, ax);
      if (h > 0) return { [side + "ForeArm"]: 1 - h, [side + "Hand"]: h };
      return { [side + "Arm"]: 1 - e, [side + "ForeArm"]: e };
    }
    if (y > 0.97) return { Spine2: 1 - sstep(0.98, 1.06, y), Head: sstep(0.98, 1.06, y) };
    if (y < 0.6 && ax > 0.02) {
      if (y > 0.5) { const t = sstep(0.6, 0.5, y); return { Hips: 1 - t, [side + "UpLeg"]: t }; }
      if (y > 0.26) { const k = sstep(0.38, 0.28, y); return { [side + "UpLeg"]: 1 - k, [side + "Leg"]: k }; }
      if (y > 0.13) return { [side + "Leg"]: 1 };
      const f = sstep(0.13, 0.09, y);
      return z < -0.08 ? { [side + "Foot"]: 0.4, [side + "ToeBase"]: 0.6 } : { [side + "Leg"]: 1 - f, [side + "Foot"]: f };
    }
    if (y < 0.68) return { Hips: 1 };
    if (y < 0.78) { const t = sstep(0.68, 0.78, y); return { Hips: 1 - t, Spine: t }; }
    if (y < 0.88) { const t = sstep(0.78, 0.88, y); return { Spine: 1 - t, Spine1: t }; }
    const t = sstep(0.88, 0.95, y); return { Spine1: 1 - t, Spine2: t };
  };
  const pushW = (p) => {
    const w = WO ? (typeof WO === "function" ? WO(p) : WO) : autoW(p);
    const es = Object.entries(w).filter(([, v]) => v > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = 0; for (const [, v] of es) s += v;
    for (let i = 0; i < 4; i++) { J.push(es[i] ? IDX[es[i][0]] : 0); Wt.push(es[i] ? es[i][1] / (s || 1) : (i === 0 && !es.length ? 1 : 0)); }
  };
  const T = (a, b, c, ref) => {
    if (ref) { const n = cross3(sub3(b, a), sub3(c, a)); const m = mul3(add3(add3(a, b), c), 1 / 3); if (dot3(n, sub3(m, ref)) < 0) { const t = b; b = c; c = t; } }
    if (SH) { const f = (p) => add3(SH.c, mul3(sub3(p, SH.c), SH.k)); a = f(a); b = f(b); c = f(c); }
    ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    pushW(a); pushW(b); pushW(c);
  };
  const Q = (a, b, c, d, ref) => { T(a, b, c, ref); T(a, c, d, ref); };
  const col = (c) => ctx.color(c);

  // rings: R[i] = points, C[i] = centres; colFn(i/(n-1), k/m, mid)
  const ringsOut = (R, C, colFn, capA, capB) => {
    const n = R.length, m = R[0].length;
    for (let i = 0; i < n - 1; i++) {
      const ref = lerp3(C[i], C[i + 1], 0.5);
      for (let k = 0; k < m; k++) {
        const k2 = (k + 1) % m, a = R[i][k], b = R[i + 1][k], c = R[i + 1][k2], d = R[i][k2];
        if (colFn) colFn((i + 0.5) / (n - 1), (k + 0.5) / m, mul3(add3(add3(a, b), add3(c, d)), 0.25));
        Q(a, b, c, d, ref);
      }
    }
    if (capA) { if (colFn) colFn(0, 0, C[0]); for (let k = 0; k < m; k++) T(C[0], R[0][k], R[0][(k + 1) % m], C[1]); }
    if (capB) { if (colFn) colFn(1, 0, C[n - 1]); for (let k = 0; k < m; k++) T(C[n - 1], R[n - 1][k], R[n - 1][(k + 1) % m], C[n - 2]); }
  };
  // ellipsoid blob; deform(dir) scales radius
  const blob = (c, r, colFn, o = {}) => {
    const U = o.seg || (hi ? 16 : mid ? 10 : 7), V = Math.max(4, Math.round(U / 2));
    const pt = (i, j) => { const th = (i / U) * TAU, ph = (j / V) * Math.PI, d = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; const s = o.deform ? o.deform(d) : 1; let p = [c[0] + r[0] * d[0] * s, c[1] + r[1] * d[1] * s, c[2] + r[2] * d[2] * s]; if (o.floor !== undefined && p[1] < o.floor) p[1] = o.floor; return p; };
    for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) {
      const a = pt(i, j), b = pt(i + 1, j), cc = pt(i + 1, j + 1), d = pt(i, j + 1);
      if (colFn) colFn(mul3(add3(add3(a, b), add3(cc, d)), 0.25));
      if (j === 0) T(a, cc, d, c); else if (j === V - 1) T(a, b, cc, c); else Q(a, b, cc, d, c);
    }
  };
  // sample a smooth path through control points [[p, r]] (r number or [ra, rb])
  const path = (ctrl, steps) => {
    const out = [], n = ctrl.length, P_ = (i) => ctrl[clamp(i, 0, n - 1)][0];
    const RR = (i) => { const r = ctrl[i][1]; return Array.isArray(r) ? r : [r, r]; };
    for (let i = 0; i < n - 1; i++) for (let s = 0; s < steps; s++) {
      const t = s / steps, e = t * t * (3 - 2 * t), a = RR(i), b = RR(i + 1);
      out.push({ p: crom(P_(i - 1), P_(i), P_(i + 1), P_(i + 2), t), r: [lerp(a[0], b[0], e), lerp(a[1], b[1], e)] });
    }
    out.push({ p: ctrl[n - 1][0], r: RR(n - 1) });
    return out;
  };
  // a tube over sampled path; o: { m, up, domeA, domeB, off, colFn, flatFront }
  const tube = (S, o = {}) => {
    const m = o.m || M, up0 = o.up || [0, 1, 0], off = o.off || 0, n = S.length;
    const R = [], C = [], frames = [];
    for (let i = 0; i < n; i++) {
      const Tn = norm3(sub3(S[Math.min(n - 1, i + 1)].p, S[Math.max(0, i - 1)].p));
      let up = up0; if (Math.abs(dot3(up, Tn)) > 0.95) up = [0, 0, -1];
      const Sx = norm3(cross3(Tn, up)), Ny = cross3(Sx, Tn);
      frames.push([Tn, Sx, Ny]);
    }
    const ring = (c, fr, ra, rb) => { const out = []; for (let k = 0; k < m; k++) { const a = (k / m) * TAU; let sn = Math.sin(a); if (o.flatFront && sn > 0) sn *= o.flatFront; out.push(add3(c, add3(mul3(fr[1], Math.cos(a) * ra), mul3(fr[2], sn * rb)))); } return out; };
    const K = hi ? 4 : 2;
    if (o.domeA) for (let k = K; k >= 1; k--) { const f = (k / K) * Math.PI / 2, s = S[0], c = add3(s.p, mul3(frames[0][0], -Math.sin(f) * (s.r[0] + off))); R.push(ring(c, frames[0], (s.r[0] + off) * Math.cos(f) + 0.0005, (s.r[1] + off) * Math.cos(f) + 0.0005)); C.push(c); }
    for (let i = 0; i < n; i++) { R.push(ring(S[i].p, frames[i], S[i].r[0] + off, S[i].r[1] + off)); C.push(S[i].p); }
    if (o.domeB) for (let k = 1; k <= K; k++) { const f = (k / K) * Math.PI / 2, s = S[n - 1], c = add3(s.p, mul3(frames[n - 1][0], Math.sin(f) * (s.r[0] + off))); R.push(ring(c, frames[n - 1], (s.r[0] + off) * Math.cos(f) + 0.0005, (s.r[1] + off) * Math.cos(f) + 0.0005)); C.push(c); }
    ringsOut(R, C, o.colFn, o.capA, o.capB);
    return { R, C };
  };
  const cone = (base, tip, r, c, m = hi ? 7 : 5) => { if (c) col(c); tube(path([[base, r], [lerp3(base, tip, 0.55), r * 0.62], [tip, 0.003]], hi ? 3 : 2), { m, domeA: true }); };

  // ---------- the head: a wide soft kemono head as one radial surface ----------
  const SNL = (0.04 + (sp.snout || 0.08) * 1.05) * SZ("snoutS", 0.3, 1.8);
  const SNW = (0.36 + (sp.snoutW || (sp.chunky ? 0.06 : 0.02))) * Math.sqrt(SZ("snoutS", 0.3, 1.8));
  const SNH = 0.27, SNY = -0.34;
  const CHK = sp.cheek || 1;
  const headR = (d) => {
    const [x, y, z] = d;
    const rx = RX * (1 + 0.16 * CHK * Math.exp(-(((y + 0.34) / 0.34) ** 2)));
    let r = 1 / Math.sqrt((x / rx) ** 2 + (y / RY) ** 2 + (z / RZ) ** 2);
    if (y > 0) r *= 1 - 0.04 * y ** 2;
    if (y < -0.48) r *= 1 - 0.08 * (-0.48 - y) * (1 - Math.abs(x) * 0.7); // soft rounded chin, not blocky
    if (z < 0) {
      const u = x / SNW, v = (y - SNY) / SNH, q = u * u + v * v;
      if (q < 1) { const t = 1 - q; r += SNL * Math.sqrt(t) * (0.65 + 0.35 * t) * Math.min(1, -z * 2.1); }
      // Kemono whisker pads (cats, rabbits, foxes, rodents)
      if (sp.whisk || sp.catnose || sp.snout == null || sp.snout < 0.12) {
        const padX = 0.14 * SNW;
        for (const s of [-1, 1]) {
          const pu = (x - s * padX) / (SNW * 0.52), pv = (y - (SNY - 0.02)) / (SNH * 0.65), pq = pu * pu + pv * pv;
          if (pq < 1) r += SNL * 0.40 * ((1 - pq) ** 1.5) * Math.min(1, -z * 2.2);
        }
      }
      // Sculpted nasal bridge: smooth anatomical ridge from forehead down to the nose tip
      const hasBridge = (sp.snout && sp.snout >= 0.09) || sp.bridge;
      if (hasBridge) {
        const bridgeTaper = 0.32 + 0.14 * Math.max(0, (y - SNY) / (SNH * 1.8));
        const bu = x / (SNW * bridgeTaper), bv = (y - SNY) / (SNH * 1.85);
        if (Math.abs(bu) < 1 && bv >= 0 && bv <= 1) {
          r += SNL * 0.50 * (1 - bu * bu) * Math.sin(bv * Math.PI) * Math.min(1, -z * 2.1);
        }
      }
      // Lower mandibular support: subtle chin contour supporting the muzzle
      const cu = x / (SNW * 0.48), cv = (y - (SNY - SNH * 0.65)) / (SNH * 0.55);
      if (cu * cu + cv * cv < 1 && y < SNY - 0.04) {
        const ct = 1 - (cu * cu + cv * cv);
        r += SNL * 0.28 * Math.sqrt(ct) * Math.min(1, -z * 1.8);
      }
    }
    return r;
  };
  const headPt = (d, off = 0) => add3(HC, mul3(d, headR(d) + off));
  const inside = (p) => { const d = sub3(p, HC), l = len3(d) || 1e-6; return l < headR(mul3(d, 1 / l)); };
  const surf = (x, y, off = 0) => { // front projection onto the head
    let lo = HC[2] - 0.9, hz = HC[2] + 0.05;
    if (!inside([x, y, hz])) hz = HC[2] + 0.3;
    for (let i = 0; i < 20; i++) { const mz = (lo + hz) / 2; if (inside([x, y, mz])) hz = mz; else lo = mz; }
    const p = [x, y, hz], n = norm3(add3(norm3(sub3(p, HC)), [0, 0, -0.35]));
    return add3(p, mul3(n, off));
  };
  const mask = sp.mask, patch = sp.patch;
  const headCol = (d) => {
    const [x, y, z] = d, ax = Math.abs(x);
    if (sp.skunk && ax < 0.13 && y > 0.25 && z > -0.75) return sp.skunk;
    if (sp.stripes && ((y > 0.55 && ax < 0.3 && ((ax * 9 + y * 2) % 1) < 0.32 && z < 0.2) || (ax > 0.72 && y > -0.35 && y < 0.25 && ((y * 6 + 10) % 1) < 0.34))) return sp.stripes;
    const pale = z < 0.1 && (((x / 0.46) ** 2 + ((y + 0.36) / 0.3) ** 2 < 1) || (y < -0.3 && ax > 0.3 && y < -0.3 - 0.15 * (ax - 0.3)) || y < -0.62);
    if (sp.face && (pale || (ax > 0.75 && y < -0.1))) return sp.face;
    if (sp.muzzle && pale) return BELLY;
    if (sp.cheek && y < -0.05 && ax > 0.45 && z < 0.3) return BELLY;
    return HFUR;
  };
  {
    const U = hi ? 56 : mid ? 36 : LOD === 3 ? 24 : 14, V = Math.round(U * 0.65);
    const pt = (i, j) => { const th = (i / U) * TAU, ph = (j / V) * Math.PI; return headPt([Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]); };
    ctx.smooth();
    for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
      col(headCol(norm3(sub3(mul3(add3(add3(a, b), add3(c, d)), 0.25), HC))));
      if (j === 0) T(a, c, d, HC); else if (j === V - 1) T(a, b, c, HC); else Q(a, b, c, d, HC);
    }
  }
  // cheek tufts flaring at the jaw, forehead fluff
  if (!low) {
    for (const s of [-1, 1]) {
      const tc = headCol(norm3([s, -0.3, -0.2]));
      const tufts = sp.wool ? [] : [[-0.22, 0.09, -12], [-0.42, 0.12, -38], [-0.6, 0.09, -62]];
      col(tc);
      for (const [dy, l, ang] of tufts) {
        const d = norm3([s * 0.95, dy, -0.12]), b = headPt(d, -0.04), a = (ang * Math.PI) / 180, tip = add3(b, [s * l * Math.cos(a), l * Math.sin(a), 0.015]);
        tube(path([[b, [0.06, 0.024]], [lerp3(b, tip, 0.5), [0.04, 0.018]], [tip, [0.004, 0.003]]], hi ? 3 : 2), { m: hi ? 8 : 5, domeA: true, up: [0, 0, -1] });
      }
    }
    if (!sp.wool && !sp.mane) for (const [x, l, lean] of [[-0.06, 0.08, -0.4], [0.03, 0.1, 0.2], [0.1, 0.07, 0.6]]) {
      const b = headPt(norm3([x, 0.86, -0.42]), -0.02); col(HFUR); tube(path([[b, [0.035, 0.016]], [add3(b, [lean * l * 0.3, l * 0.5, -l * 0.25]), [0.024, 0.012]], [add3(b, [lean * l * 0.6, l * 0.8, -l * 0.15]), [0.003, 0.003]]], hi ? 3 : 2), { m: hi ? 8 : 5, domeA: true, up: [0, 0, -1] });
    }
  }
  // lion mane / sheep wool
  if (sp.mane && !low) { const n = hi ? 16 : 10; for (let i = 0; i < n; i++) { const a = (i / n) * TAU, d = norm3([Math.cos(a), Math.sin(a) * 0.95, 0.25]), b = headPt(d, -0.03); cone(b, add3(b, mul3(norm3([d[0], d[1], 0.4]), 0.13)), 0.075, sp.mane); } }
  if (sp.wool) { col(FUR); const n = hi ? 11 : 7; for (let i = 0; i < n; i++) { const a = (i / (n - 1)) * Math.PI, d = norm3([Math.cos(a) * 0.95, 0.35 + Math.sin(a) * 0.65, 0.1]); blob(headPt(d, -0.01), [0.085, 0.07, 0.085]); } blob(headPt(norm3([0, 0.6, -0.6]), -0.02), [0.1, 0.07, 0.07]); }

  // ---------- face decals ----------
  const fill = (pts, off, rings = 2) => {
    let c = [0, 0]; for (const p of pts) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; }
    const L = (r, p) => surf(lerp(c[0], p[0], r), lerp(c[1], p[1], r), off);
    const ctr = surf(c[0], c[1], off);
    for (let r = 1; r <= rings; r++) for (let k = 0; k < pts.length; k++) {
      const p = pts[k], q = pts[(k + 1) % pts.length];
      if (r === 1) T(ctr, L(1 / rings, p), L(1 / rings, q), HC);
      else Q(L((r - 1) / rings, p), L(r / rings, p), L(r / rings, q), L((r - 1) / rings, q), HC);
    }
  };
  const ellipse = (cx, cy, rx, ry, n = hi ? 28 : 16, rot = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return o; };
  const stroke = (pts, w, off, closed = false) => {
    const n = pts.length, L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const ww = Array.isArray(w) ? lerp(w[0], w[1], Math.sin((i / (n - 1)) * Math.PI)) : w;
      L.push(surf(pts[i][0] - ty * ww / 2, pts[i][1] + tx * ww / 2, off)); Rr.push(surf(pts[i][0] + ty * ww / 2, pts[i][1] - tx * ww / 2, off));
    }
    for (let i = 0; i < (closed ? n : n - 1); i++) { const j = (i + 1) % n; Q(L[i], L[j], Rr[j], Rr[i], HC); }
  };
  const curve = (fn, n = hi ? 14 : 8) => { const o = []; for (let i = 0; i <= n; i++) o.push(fn(i / n)); return o; };
  const heartPts = (cx, cy, s, n = 20) => curve((t) => { const a = t * TAU; return [cx + s * 16 * Math.sin(a) ** 3 / 17, cy + s * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17]; }, n).slice(0, n);
  const starPts = (cx, cy, r, k = 4) => { const o = []; for (let i = 0; i < k * 2; i++) { const a = (i / (k * 2)) * TAU + Math.PI / 2, rr = i % 2 ? r * 0.38 : r; o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return o; };
  ctx.flat();

  // nose and mouth anchors
  const nd = norm3([0, SNY + 0.32 * SNH, -Math.sqrt(1 - (SNY + 0.32 * SNH) ** 2)]), noseP = headPt(nd);
  const NY = noseP[1], MY = NY - 0.05 - SNL * 0.15;
  const ERU0 = { round: 0.088, tall: 0.078, wide: 0.1 }[P.eyes] || 0.088, ERV0 = { round: 0.104, tall: 0.118, wide: 0.088 }[P.eyes] || 0.104;
  const ERU = ERU0, ERV = ERV0;

  if (!low) {
    // species face marks
    if (patch) { col(patch); for (const s of [-1, 1]) fill(ellipse(s * (EX + 0.01), EY - 0.025, ERU + 0.05, ERV + 0.045, hi ? 24 : 14, s * -0.5), 0.002); }
    if (mask) { col(mask); const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, x = lerp(-0.3, 0.3, t); pts.push([x, EY + 0.03 - 0.02 * Math.cos(t * TAU)]); } for (let i = 16; i >= 0; i--) { const t = i / 16, x = lerp(-0.3, 0.3, t); pts.push([x, EY - 0.085 - 0.05 * Math.sin(t * Math.PI) + 0.06 * Math.abs(x) * 2]); } fill(pts, 0.002, 2); }
    if (sp.face) { col(sp.face); for (const s of [-1, 1]) fill(ellipse(s * 0.12, EY + 0.135, 0.05, 0.03, 14), 0.002); if (sp.tear) { col(sp.tear); for (const s of [-1, 1]) stroke(curve((t) => [s * (EX + 0.01 + 0.01 * t), EY - ERV - 0.01 - 0.12 * t]), [0.03, 0.022], 0.003); } }
    if (sp.freck) { col(mixc(FUR, "#ffffff", 0.45)); for (const [x, y] of [[-0.05, 0.215], [0, 0.23], [0.05, 0.215], [-0.025, 0.25], [0.025, 0.25]]) fill(ellipse(x, EY + y - 0.04, 0.011, 0.011, 8), 0.002, 1); }
    if (sp.spots && !sp.antlers) { // leopard spots on cheek and forehead
      col(sp.spots);
      for (const s of [-1, 1]) {
        fill(ellipse(s * 0.22, EY - 0.08, 0.013, 0.010, 8, s * 0.2), 0.003);
        fill(ellipse(s * 0.25, EY - 0.045, 0.014, 0.011, 8, s * -0.3), 0.003);
        fill(ellipse(s * 0.19, EY - 0.115, 0.012, 0.009, 8, s * 0.1), 0.003);
        fill(ellipse(s * 0.08, EY + 0.18, 0.012, 0.010, 8), 0.003);
      }
    }
    if (marks === "freckles") { col(mixc(FUR, "#5a2a1a", 0.5)); for (const s of [-1, 1]) for (const [x, y] of [[0.17, -0.13], [0.2, -0.115], [0.23, -0.135], [0.2, -0.15]]) fill(ellipse(s * x, EY + y, 0.008, 0.008, 6), 0.004, 1); }
    if (marks === "stripes") { col(mixc(FUR, "#000000", 0.6)); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) stroke(curve((t) => [s * (0.3 + 0.06 * t), EY - 0.05 - k * 0.045 + 0.01 * t]), [0.025, 0.01], 0.004); }
    if (marks === "patch") { col(mixc(FUR, "#000000", 0.45)); fill(ellipse(EX + 0.02, EY + 0.01, ERU + 0.055, ERV + 0.05, 20, 0.4), 0.002); }
    if (marks === "heart") { col("#ff7a93"); fill(heartPts(0, EY + 0.165, 0.045), 0.004); }
    if (marks === "moon") { col("#ff8a8a"); const pts = []; for (let i = 0; i <= 14; i++) { const a = -2.3 + (i / 14) * 4.6; pts.push([0.045 * Math.cos(a + Math.PI), EY + 0.17 + 0.045 * Math.sin(a + Math.PI)]); } for (let i = 14; i >= 0; i--) { const a = -1.9 + (i / 14) * 3.8; pts.push([-0.016 + 0.038 * Math.cos(a + Math.PI), EY + 0.185 + 0.036 * Math.sin(a + Math.PI)]); } stroke(pts.slice(0, 15), [0.012, 0.03], 0.004); }
    if (sp.stripes) { col(sp.stripes); for (const s of [-1, 0, 1]) stroke(curve((t) => [s * 0.06 + s * 0.02 * t, EY + 0.23 - 0.07 * t]), [0.026, 0.006], 0.003); }
  }

  // eyes
  const ex = (s) => s * EX;
  const lidCol = (s) => (patch ? patch : headCol(norm3(sub3([ex(s), EY + 0.1, -0.3], HC))));
  const eyeOpen = (s) => !(["happy", "squint", "shut", "cryshut"].includes(E.e) || (E.e === "wink" && s > 0));
  const lid = (s, h, slope, low_ = false) => { // fur lid over the eye above (or below) a line
    const cu = ex(s), line = (x) => EY + h + slope * (x - cu) * s;
    const o = ellipse(cu, EY, ERU + 0.026, ERV + 0.026, hi ? 28 : 16).map(([x, y]) => [x, low_ ? Math.min(y, line(x)) : Math.max(y, line(x))]);
    col(lidCol(s)); fill(o, 0.012);
    col(INK); const xs = []; for (let i = 0; i <= 10; i++) { const x = cu - ERU - 0.008 + (i / 10) * (ERU * 2 + 0.016), dy = (x - cu) / (ERU + 0.012), yy = line(x); if (Math.abs(yy - EY) / (ERV + 0.012) <= Math.sqrt(Math.max(0, 1 - dy * dy)) + 0.02) xs.push([x, yy]); }
    if (xs.length > 1) stroke(xs, 0.016, 0.014);
  };
  for (const s of [-1, 1]) {
    const cu = ex(s);
    if (eyeOpen(s) || E.e === "spiral") {
      const sq = E.e === "wide" ? 1.08 : 1;
      col(INK); fill(ellipse(cu, EY, (ERU + 0.017) * sq, (ERV + 0.017) * sq, hi ? 30 : 16), 0.004);
      col(WHITE); fill(ellipse(cu, EY, ERU * sq, ERV * sq, hi ? 30 : 16), 0.007);
      col(INK);
      let px = cu - s * 0.012, py = EY - 0.012, pr = [ERU * 0.62, ERV * 0.66];
      if (E.e === "wide") pr = [ERU * 0.32, ERV * 0.34];
      if (E.e === "side") px = cu + 0.035;
      if (E.e === "down") py = EY - 0.035;
      if (E.e === "heart") fill(heartPts(px, py + 0.01, 0.07), 0.01);
      else if (E.e === "star") fill(starPts(px, py, 0.075, 4), 0.01, 1);
      else if (E.e === "spiral") stroke(curve((t) => [cu + Math.cos(t * 16 * s) * 0.075 * (1 - t * 0.9), EY + Math.sin(t * 16 * s) * 0.085 * (1 - t * 0.9)], hi ? 40 : 20), 0.011, 0.01);
      else {
        const pupilCol = EYEC && EYEC !== "#2b2233" ? EYEC : INK;
        col(pupilCol); fill(ellipse(px, py, pr[0], pr[1], hi ? 24 : 14), 0.009);
      }
      if (E.e === "half") lid(s, E.uneven && s > 0 ? 0.0 : 0.025, E.uneven && s > 0 ? -0.1 : 0.05);
      if (E.e === "heavy" || E.e === "side") lid(s, -0.005, 0.0);
      if (E.e === "angry") lid(s, 0.035, -0.55);
      if (E.e === "sad") lid(s, 0.05, 0.45);
      // Eyeliner flick and lashes
      col(INK);
      stroke(curve((t) => [cu + s * (ERU * 0.7 + t * 0.038), EY + ERV * (0.62 + t * 0.32)], 6), [0.014, 0.004], 0.008);
      if (fem) { for (let k = 0; k < 3; k++) { const a = 0.55 + k * 0.32, b = [cu + s * Math.cos(a) * (ERU + 0.012), EY + Math.sin(a) * (ERV + 0.012)]; stroke([b, [b[0] + s * (0.026 + 0.004 * k) * Math.cos(a + 0.25), b[1] + 0.03 * Math.sin(a + 0.3)]], [0.012, 0.004], 0.005); } }
      // blink lid, modelled 1/1000 size about its bone pivot
      if (!low) {
        WO = { [s < 0 ? "LidL" : "LidR"]: 1 }; SH = { c: [cu, EY, LIDZ], k: 1 / 1000 };
        col(lidCol(s)); fill(ellipse(cu, EY, ERU + 0.03, ERV + 0.03, hi ? 24 : 14), 0.02);
        col(INK); stroke(curve((t) => [cu + (t - 0.5) * 2 * (ERU + 0.006), EY - 0.015 - 0.03 * Math.sin(Math.PI * t)], 10), 0.02, 0.024);
        SH = null; WO = null;
      }
    } else {
      col(INK);
      if (E.e === "squint") stroke([[cu - s * 0.07, EY + 0.05], [cu + s * 0.05, EY], [cu - s * 0.07, EY - 0.05]], 0.024, 0.006);
      else if (E.e === "shut" || E.e === "cryshut") stroke(curve((t) => [cu + (t - 0.5) * 0.16, EY - 0.01 - (E.e === "cryshut" ? -0.03 : 0.03) * Math.sin(Math.PI * t)]), 0.022, 0.006);
      else stroke(curve((t) => [cu + (t - 0.5) * 0.16, EY - 0.025 + 0.055 * Math.sin(Math.PI * t)]), 0.024, 0.006);
      if (fem) for (let k = 0; k < 2; k++) stroke([[cu + s * 0.075, EY + (E.e === "happy" ? -0.02 : -0.01)], [cu + s * (0.1 + 0.005 * k), EY + 0.01 - k * 0.025]], [0.012, 0.004], 0.006);
    }
    // brows
    if (!low) {
      col(mixc(HFUR, "#000000", 0.55));
      const b = E.b || 0, by = EY + ERV + 0.045 + Math.max(0, b) * 0.025, tilt = b < 0 ? -b * 0.035 : 0, up = E.uneven && s > 0 ? 0.03 : 0;
      stroke(curve((t) => [cu + (t - 0.5) * 0.09, by + up + (t - 0.5) * s * -tilt * 2 * (E.e === "sad" || E.m === "wobble" || E.m === "frown" || E.m === "wail" || E.m === "scream" || E.e === "down" ? -1 : 1) + 0.01 * Math.sin(Math.PI * t)], 6), [0.024, 0.012], 0.006);
    }
    if (E.tear && !low) { col("#8fd3ff"); if (E.tear === 1) fill(ellipse(cu + s * 0.06, EY - ERV - 0.01, 0.018, 0.028, 12), 0.016); else { stroke(curve((t) => [cu + s * 0.02 + s * 0.01 * Math.sin(t * 5), EY - 0.03 - t * 0.2], 8), 0.035, 0.016); } }
    const hasBlushSticker = !sp.noBlush && P.blush && P.blush !== "none" && P.blush !== "false";
    const showBlush = !low && !sp.noBlush && (hasBlushSticker || E.blush);
    if (showBlush) {
      const bCol = (typeof P.blush === "string" && P.blush.startsWith("#")) ? P.blush : (fem ? "#ff6588" : "#ff7b94");
      const bStyle = P.blushStyle || (["heart", "star", "hash", "soft"].includes(P.blush) ? P.blush : (E.blush && !hasBlushSticker ? "hash" : "soft"));
      const cx = s * 0.245, cy = EY - 0.115;
      if (bStyle === "heart") {
        col(bCol); fill(heartPts(cx, cy, 0.038), 0.006);
      } else if (bStyle === "star") {
        col(bCol); fill(starPts(cx, cy, 0.036, 4), 0.006, 1);
      } else if (bStyle === "hash") {
        col(mixc(bCol, "#b02a48", 0.4));
        for (let k = -1; k <= 1; k++) {
          stroke([[cx + k * 0.020 - 0.007, cy - 0.020], [cx + k * 0.020 + 0.007, cy + 0.018]], 0.008, 0.006);
        }
      } else {
        // "soft" cute dual-tone pill blush
        col(mixc(bCol, FUR, 0.22));
        fill(ellipse(cx, cy, 0.050, 0.028, hi ? 18 : 10), 0.004);
        col(bCol);
        fill(ellipse(cx, cy, 0.036, 0.020, hi ? 16 : 8), 0.006);
      }
    }
  }
  if (E.sweat && !low) { col("#8fd3ff"); fill([...ellipse(0.29, EY + 0.12, 0.025, 0.03, 12).filter((p) => p[1] <= EY + 0.12), [0.29, EY + 0.19]], 0.008); }
  if (E.hearts && !low) { col("#ff5d84"); fill(heartPts(0.3, EY + 0.2, 0.04), 0.01); fill(heartPts(-0.33, EY + 0.13, 0.03), 0.01); }
  if (E.sparks && !low) { col("#ffd93d"); fill(starPts(0.32, EY + 0.17, 0.04), 0.01, 1); fill(starPts(-0.31, EY + 0.21, 0.03), 0.01, 1); }

  // nose: a black (or pink) button
  if (sp.pig) {
    col(mixc(FUR, "#ff6688", 0.25)); tube(path([[add3(noseP, [0, 0, 0.03]), [0.07, 0.05]], [add3(noseP, [0, 0, -0.025]), [0.07, 0.05]]], 1), { up: [0, 1, 0], capB: true, m: hi ? 16 : 10 });
    col(MOUTH); for (const s of [-1, 1]) blob(add3(noseP, [s * 0.025, 0, -0.026]), [0.012, 0.022, 0.004], null, { seg: 8 });
  } else {
    col(sp.nose); const big = sp.bignose ? 1.9 : 1;
    blob(add3(noseP, [0, 0.008, -0.004]), [0.034 * big, 0.024 * big, 0.024], null, { seg: hi ? 14 : 8, deform: (d) => 1 - 0.18 * Math.max(0, -d[1]) });
  }
  // mouth
  if (!low) {
    const W0 = 0.082;
    col(INK);
    if (!sp.pig) stroke([[0, NY - 0.02], [0, MY]], 0.012, 0.005);
    const openM = (w, top0, curv, depth, opt = {}) => { // open mouth: top curve, bottom bowl
      const n = hi ? 16 : 10, topP = [], botP = [];
      for (let i = 0; i <= n; i++) { const u = -1 + (2 * i) / n, x = u * w; topP.push([x, MY + top0 + curv * u * u + (opt.skew || 0) * u]); }
      for (let i = n; i >= 0; i--) { const u = -1 + (2 * i) / n, x = u * w; botP.push([x, MY + top0 + curv * u * u + (opt.skew || 0) * u - depth * Math.pow(Math.max(0, 1 - u * u), opt.sq || 0.5)]); }
      const poly = [...topP, ...botP.slice(1, -1)];
      col(MOUTH); fill(poly, 0.005, 2);
      if (opt.tongue !== false) { col(TONGUE); const tp = []; for (let i = 0; i <= 10; i++) { const u = -0.62 + (1.24 * i) / 10; tp.push([u * w, MY + top0 + curv * u * u - depth * Math.pow(Math.max(0, 1 - u * u), opt.sq || 0.5) * 0.92]); } for (let i = 10; i >= 0; i--) { const u = -0.62 + (1.24 * i) / 10; tp.push([u * w, MY + top0 + curv * u * u - depth * (0.45 + 0.12 * (1 - Math.abs(u) / 0.62))]); } fill(tp, 0.007, 1); }
      col(WHITE);
      if (opt.teeth) { for (let i = 0; i < 6; i++) { const u0 = -0.8 + i * 0.32, x = u0 * w, y = MY + top0 + curv * u0 * u0; T(surf(x - 0.012, y - 0.002, 0.008), surf(x + 0.012, y - 0.002, 0.008), surf(x, y - 0.024, 0.008), HC); } }
      else if (opt.fangs !== false && (sp.fangs || opt.fangs)) for (const s of [-1, 1]) { const u0 = s * 0.55, x = u0 * w, y = MY + top0 + curv * u0 * u0; T(surf(x - 0.012, y - 0.003, 0.008), surf(x + 0.012, y - 0.003, 0.008), surf(x, y - 0.026, 0.008), HC); }
      if (sp.buck && opt.buck !== false) { const y = MY + top0; fill([[-0.02, y - 0.002], [0.02, y - 0.002], [0.02, y - 0.03], [-0.02, y - 0.03]], 0.008, 1); col(INK); stroke([[0, y], [0, y - 0.03]], 0.004, 0.009); }
      col(INK); stroke(poly, 0.012, 0.011, true);
    };
    const line = (pts, w = 0.013) => { col(INK); stroke(pts, w, 0.006); };
    const catW = (w, up) => line(curve((t) => { const u = -1 + 2 * t; return [u * w, MY + up * Math.abs(u) ** 1.2 - 0.022 * Math.sin(Math.PI * Math.abs(u)) * (1 - 0.3 * Math.abs(u))]; }, hi ? 20 : 10));
    const fang1 = () => { col(WHITE); const x = 0.03, y = MY - 0.012; T(surf(x - 0.01, y + 0.002, 0.009), surf(x + 0.01, y + 0.002, 0.009), surf(x + 0.002, y - 0.022, 0.009), HC); };
    switch (E.m) {
      case "grin": openM(W0 * 1.1, 0, 0.022, 0.06); break;
      case "beam": openM(W0 * 1.25, 0, 0.026, 0.085); break;
      case "laugh": openM(W0 * 1.35, 0.005, 0.03, 0.105); break;
      case "smile": catW(W0 * 0.95, 0.02); if (sp.buck) { col(WHITE); fill([[-0.018, MY - 0.004], [0.018, MY - 0.004], [0.018, MY - 0.03], [-0.018, MY - 0.03]], 0.007, 1); } break;
      case "fang": catW(W0 * 0.95, 0.02); fang1(); break;
      case "small": line(curve((t) => [(t - 0.5) * 0.06, MY - 0.01 - 0.012 * Math.sin(Math.PI * t)], 8)); break;
      case "o": { col(MOUTH); const o = ellipse(0, MY - 0.035, 0.03, 0.04, 18); fill(o, 0.005); col(INK); stroke(o, 0.012, 0.01, true); break; }
      case "o-small": { col(MOUTH); const o = ellipse(0, MY - 0.02, 0.015, 0.018, 12); fill(o, 0.005); col(INK); stroke(o, 0.01, 0.01, true); break; }
      case "scream": openM(W0 * 0.95, -0.005, -0.012, 0.1, { sq: 0.8, wob: true }); break;
      case "wail": openM(W0 * 1.15, -0.01, -0.03, 0.09, { sq: 0.7 }); break;
      case "shout": openM(W0 * 1.15, -0.005, -0.02, 0.07, { sq: 0.7, fangs: true }); break;
      case "evil": openM(W0 * 1.45, 0.005, 0.045, 0.045, { teeth: true, tongue: false, sq: 0.9 }); break;
      case "blep": catW(W0 * 0.9, 0.018); col(TONGUE); { const tp = ellipse(0.012, MY - 0.045, 0.024, 0.032, 16).filter((p) => p[1] < MY - 0.022); fill(tp, 0.007, 1); col(INK); stroke(tp, 0.009, 0.01, true); } break;
      case "kiss": { col(INK); stroke(curve((t) => { const a = -Math.PI / 2 + t * Math.PI; return [0.005 + Math.cos(a) * 0.022 * (1 - 0.5 * Math.abs(Math.sin(a * 2))), MY - 0.03 + Math.sin(a) * 0.03]; }, 12), 0.013, 0.006); break; }
      case "smirk": line(curve((t) => { const u = -1 + 2 * t; return [u * W0 * 0.9, MY - 0.02 + 0.03 * (u + 1) ** 2 / 4 - 0.015 * Math.sin(Math.PI * t)]; })); break;
      case "smirkfang": line(curve((t) => { const u = -1 + 2 * t; return [u * W0 * 0.9, MY - 0.02 + 0.03 * (u + 1) ** 2 / 4 - 0.015 * Math.sin(Math.PI * t)]; })); fang1(); break;
      case "flat": line([[-0.045, MY - 0.022], [0.045, MY - 0.022]]); break;
      case "flatslant": line([[-0.045, MY - 0.026], [0.045, MY - 0.014]]); break;
      case "frown": line(curve((t) => { const u = -1 + 2 * t; return [u * 0.055, MY - 0.035 + 0.02 * Math.sin(Math.PI * t)]; })); break;
      case "pout": line(curve((t) => { const u = -1 + 2 * t; return [u * 0.03, MY - 0.03 + 0.012 * Math.sin(Math.PI * t)]; }, 8), 0.014); break;
      case "wobble": line(curve((t) => { const u = -1 + 2 * t; return [u * 0.06, MY - 0.025 + 0.008 * Math.sin(t * TAU * 2.5)]; }, hi ? 22 : 12)); break;
      default: openM(W0, 0, 0.02, 0.055);
    }
    if (sp.whisk && hi) { col(INK); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) for (let j = 0; j < 1; j++) fill(ellipse(s * (0.05 + k * 0.022), NY - 0.03 - (k % 2) * 0.012, 0.0045, 0.0045, 6), 0.004, 1); }
  }

  // eyewear
  if (eyew === "glasses") { col(INK); for (const s of [-1, 1]) stroke(ellipse(ex(s), EY, ERU + 0.04, ERV + 0.035, hi ? 28 : 16), 0.018, 0.03, true); stroke([[-EX + ERU + 0.035, EY + 0.02], [EX - ERU - 0.035, EY + 0.02]], 0.014, 0.03); }
  if (eyew === "shades") { col("#1a1a22"); ctx.metalness(0.3); ctx.roughness(0.2); for (const s of [-1, 1]) fill(ellipse(ex(s), EY - 0.005, ERU + 0.045, ERV * 0.8 + 0.035, hi ? 26 : 14), 0.032); ctx.metalness(null); ctx.roughness(null); col(INK); stroke([[-EX, EY + 0.06], [EX, EY + 0.06]], 0.016, 0.035); }
  ctx.smooth();

  // ---------- ears ----------
  const earS = SZ("earS", 0.5, 1.6), EL = sp.earL * earS;
  const earIn = sp.earIn || mixc(sp.earCol || HFUR, "#ffd6e0", 0.55), earOut = sp.earCol || HFUR;
  for (const s of [-1, 1]) {
    WO = (p) => { const t = clamp((p[1] - 1.5) / 0.1, 0, 1); return { Head: 1 - t, [s < 0 ? "EarL" : "EarR"]: t }; };
    const type = sp.ears, wM = sp.earW || 1;
    let ctrl, front = norm3([s * 0.15, 0.1, -1]), w0 = 0.085 * wM, th = 0.03;
    if (type === "point") { const b = headPt(norm3([s * 0.55, 0.78, -0.05]), -0.04); ctrl = [[b, [w0 * 1.15, th]], [add3(b, [s * EL * 0.18, EL * 0.45, 0]), [w0 * 0.85, th * 0.9]], [add3(b, [s * EL * 0.32, EL * 0.85, 0.01]), [w0 * 0.3, th * 0.6]], [add3(b, [s * EL * 0.36, EL, 0.015]), [0.008, 0.006]]]; }
    else if (type === "long") { const b = headPt(norm3([s * 0.3, 0.92, 0]), -0.04); ctrl = [[b, [0.045, th]], [add3(b, [s * 0.03, EL * 0.35, 0]), [0.07, th]], [add3(b, [s * 0.08, EL * 0.8, 0.02]), [0.06, th * 0.8]], [add3(b, [s * 0.1, EL, 0.03]), [0.012, 0.01]]]; }
    else if (type === "round") { const b = headPt(norm3([s * 0.62, 0.72, 0.02]), -0.05); w0 = 0.09 * wM * (0.6 + EL * 3); ctrl = [[b, [w0 * 0.85, th]], [add3(b, [s * EL * 0.25, EL * 0.55, 0]), [w0, th]], [add3(b, [s * EL * 0.4, EL * 0.95, 0]), [w0 * 0.55, th * 0.8]], [add3(b, [s * EL * 0.45, EL * 1.1, 0]), [0.01, 0.01]]]; }
    else if (type === "leaf") { const b = headPt(norm3([s * 0.85, 0.42, 0.05]), -0.04); ctrl = [[b, [0.04, th]], [add3(b, [s * EL * 0.4, EL * 0.14, 0]), [0.075, th]], [add3(b, [s * EL * 0.85, EL * 0.22, 0.01]), [0.04, th * 0.8]], [add3(b, [s * EL, EL * 0.24, 0.015]), [0.008, 0.008]]]; front = norm3([s * 0.2, 0.9, -0.6]); }
    else if (type === "flop") { const b = headPt(norm3([s * 0.7, 0.62, 0.05]), -0.04); ctrl = [[b, [0.06, th]], [add3(b, [s * 0.09, 0.02, 0]), [0.08, th]], [add3(b, [s * 0.14, -EL * 0.55, -0.01]), [0.075, th]], [add3(b, [s * 0.14, -EL, -0.01]), [0.02, 0.02]]]; front = norm3([s * 1, 0, -0.3]); }
    else { const b = headPt(norm3([s * 0.6, 0.72, -0.1]), -0.04); ctrl = [[b, [0.06, th]], [add3(b, [s * EL * 0.4, EL * 0.6, -0.03]), [0.05, th]], [add3(b, [s * EL * 0.6, EL * 0.75, -0.08]), [0.008, 0.008]]]; }
    const S = path(ctrl, hi ? 4 : 2), fr = front;
    const tipC = sp.earTip;
    tube(S, { up: fr, m: hi ? 14 : 8, domeA: true, flatFront: 0.25, colFn: (t, k, p) => {
      const a = k * TAU, isFront = Math.sin(a) > 0.25 && Math.abs(Math.cos(a)) < 0.85;
      col(tipC && t > 0.72 ? tipC : isFront && t > 0.08 && t < 0.86 ? earIn : earOut);
    } });
    if (sp.earSpot) { col(sp.earSpot); }
    if (!low && type !== "flop") { // base tufts
      const b = ctrl[0][0], tc = sp.fluffEar ? (sp.earIn || BELLY) : mixc(earIn, "#ffffff", 0.4);
      for (const [dx, dy, l] of [[-0.02, 0.03, 0.06], [0.015, 0.05, 0.075], [0.04, 0.02, 0.05]]) { const bb = add3(b, [s * dx, dy, -0.035]); cone(bb, add3(bb, [s * (0.01 - dx), l, -0.03]), 0.016, tc); }
      if (sp.fluffEar) for (let k = 0; k < 5; k++) { const q = S[Math.floor((k + 1) * S.length / 7)]; cone(q.p, add3(q.p, [s * 0.07, 0.01 + k * 0.012, 0.005]), 0.03, sp.earIn); }
    }
  }
  WO = null;
  // antlers: natural bone/horn tones with gradient
  if (sp.antlers && !low) {
    WO = { Head: 1 };
    const antCol = sp.antler || "#e9d8b4", antTip = mixc(antCol, "#ffffff", 0.25);
    for (const s of [-1, 1]) {
      const b = headPt(norm3([s * 0.35, 0.92, 0.02]), -0.02);
      const main = path([[b, 0.025], [add3(b, [s * 0.02, 0.12, 0]), 0.022], [add3(b, [s * 0.07, 0.22, 0.01]), 0.02], [add3(b, [s * 0.13, 0.25, 0.02]), 0.017]], hi ? 5 : 3);
      tube(main, { m: hi ? 9 : 6, domeB: true, colFn: (t) => col(mixc(antCol, antTip, t * 0.7)) });
      const mb = main[Math.floor(main.length * 0.45)].p;
      tube(path([[mb, 0.016], [add3(mb, [-s * 0.035, 0.08, 0]), 0.013]], hi ? 4 : 2), { m: hi ? 8 : 5, domeB: true, colFn: (t) => col(mixc(antCol, antTip, t * 0.7)) });
    }
    WO = null;
  }

  // ---------- body ----------
  const waistS = SZ("waistS", 0.75, 1.35), hipS = SZ("hipS", 0.75, 1.3), bustS = SZ("bustS", 0.6, 1.3);
  const ch = sp.chunky ? 1.1 : 1;
  const RXK = fem
    ? [[0.46, 0.142 * hipS], [0.52, 0.188 * hipS], [0.6, 0.202 * hipS], [0.68, 0.165 * lerp(1, waistS, 0.5) * ch], [0.76, 0.124 * waistS * ch], [0.85, 0.138 * ch], [0.93, 0.150 * ch], [1.0, 0.122], [1.07, 0.070]]
    : [[0.46, 0.13 * hipS], [0.52, 0.158 * hipS], [0.6, 0.165 * hipS], [0.7, 0.152 * waistS * ch], [0.78, 0.155 * waistS * ch], [0.86, 0.178 * ch], [0.94, 0.19 * ch], [1.0, 0.15], [1.07, 0.072]];
  const RZK = fem
    ? [[0.46, 0.118], [0.52, 0.144 * hipS], [0.6, 0.146 * hipS], [0.68, 0.122], [0.76, 0.100 * waistS * ch], [0.85, 0.104 * ch], [0.93, 0.108 * ch], [1.0, 0.098], [1.07, 0.070]]
    : [[0.46, 0.1], [0.52, 0.12], [0.6, 0.125], [0.7, 0.118 * ch], [0.78, 0.12 * waistS * ch], [0.86, 0.128 * ch], [0.94, 0.13 * ch], [1.0, 0.11], [1.07, 0.072]];
  const BUST = fem ? 0.075 * bustS : 0.014, BY = fem ? 0.865 : 0.89, BX = fem ? 0.070 : 0.075;
  const torsoPt = (y, a, off, bridged) => {
    const rx = prof(RXK, y) + off, rz = prof(RZK, y) + off; let x = Math.cos(a) * rx, z = Math.sin(a) * rz;
    if (z < 0) { const gy = Math.exp(-(((y - BY) / (fem ? 0.075 : 0.07)) ** 2)), dx = bridged ? Math.max(0, Math.abs(x) - BX) : Math.min(Math.abs(x - BX), Math.abs(x + BX)); z -= BUST * gy * Math.exp(-((dx / 0.072) ** 2)) * Math.min(1, -Math.sin(a) * 1.25); }
    else { const gy = Math.exp(-(((y - 0.555) / 0.07) ** 2)); z += (fem ? 0.032 : 0.018) * hipS * gy * Math.min(1, Math.sin(a) * 1.3) * (1 - 0.35 * Math.exp(-((x / 0.025) ** 2))); }
    return [x, y, z];
  };
  const TM = hi ? 26 : mid ? 18 : 10;
  const torsoShell = (y0, y1, off, colFn, o = {}) => {
    const n = o.n || Math.max(3, Math.round((y1 - y0) / (hi ? 0.034 : 0.05))), R = [], C = [];
    for (let i = 0; i <= n; i++) { const y = lerp(y0, y1, i / n), ring = []; for (let k = 0; k < TM; k++) { const a = o.a0 !== undefined ? lerp(o.a0, o.a1, k / (TM - 1)) : (k / TM) * TAU; ring.push(torsoPt(y, a, off + (o.offFn ? o.offFn(y, a) : 0), o.bridged)); } R.push(ring); C.push([0, y, 0]); }
    if (o.a0 !== undefined) { // open strip
      for (let i = 0; i < n; i++) for (let k = 0; k < TM - 1; k++) { const a = R[i][k], b = R[i + 1][k], c = R[i + 1][k + 1], d = R[i][k + 1]; if (colFn) colFn(i / n, k / TM, a); Q(a, b, c, d, lerp3(C[i], C[i + 1], 0.5)); }
      return R;
    }
    ringsOut(R, C, colFn, o.capA, o.capB); return R;
  };
  const bibCol = (y, p) => { const w = 0.055 + 0.035 * sstep(0.62, 0.95, y) + (fem ? 0.02 * Math.exp(-(((y - BY) / 0.07) ** 2)) : 0); return p[2] < -0.02 && Math.abs(p[0]) < w && y > 0.6 && y < 1.03; };
  const bodyCol = (p) => {
    if (sp.stripes && p[2] > -0.05 && ((p[1] * 13) % 1) < 0.28 && Math.abs(p[0]) > 0.02) return sp.stripes;
    if (sp.skunk && p[2] > 0 && Math.abs(p[0]) < 0.05) return sp.skunk;
    if (sp.spots && p[2] > 0.06 && p[1] > 0.66 && (Math.sin(p[0] * 70) * Math.sin(p[1] * 60)) > 0.82) return sp.spots;
    return FUR;
  };
  torsoShell(0.46, 1.07, 0, (t, k, p) => col(bibCol(p[1], p) ? BELLY : bodyCol(p)), { capA: true });
  // neck
  col(FUR); tube(path([[[0, 0.98, 0.0], 0.075], [[0, 1.13, 0.0], 0.085]], 2), { m: hi ? 16 : 10, colFn: (t, k, p) => col(p[2] < -0.03 ? BELLY : HFUR) });
  // bib fluff tufts at the collar
  if (!low) for (const x of [-0.05, 0, 0.05]) { const b = torsoPt(1.0, -Math.PI / 2 + x * 3, -0.01, true); cone(b, add3(b, [x * 0.4, -0.06, -0.04]), 0.03, BELLY); }

  // arms (T-pose along x), plush with paw hands
  const armR = fem ? 0.88 : sp.chunky ? 1.08 : 1;
  const armPath = (s) => path([[[s * 0.12, 0.965, 0], 0.07 * armR], [[s * 0.24, 0.97, 0], 0.062 * armR], [[s * 0.36, 0.97, 0], 0.053 * armR], [[s * 0.47, 0.97, 0.0], 0.05 * armR], [[s * 0.515, 0.968, 0], 0.046 * armR]], hi ? 4 : 2);
  const legR = fem ? 1.0 : sp.chunky ? 1.05 : 0.95;
  const legPath = (s) => path([[[s * 0.095, 0.66, 0.0], fem ? 0.112 * hipS : 0.1], [[s * 0.098, 0.5, 0.0], fem ? 0.108 * lerp(1, hipS, 0.5) : 0.094 * legR], [[s * 0.092, 0.33, -0.01], 0.07 * legR], [[s * 0.09, 0.22, 0.0], 0.072 * legR], [[s * 0.088, 0.11, 0.0], 0.058 * legR]], hi ? 4 : 2);
  const shoeOn = shoes !== "none";
  for (const s of [-1, 1]) {
    const A = armPath(s);
    tube(A, { m: M, colFn: (t, k, p) => col(sp.limbs ? LIMB : sp.stripes && ((Math.abs(p[0]) * 14) % 1) < 0.25 && p[1] > 0.96 ? sp.stripes : FUR), up: [0, 0, -1] });
    // hand: palm + three rounded fingers + opposable thumb (4 digits total, with pink paw pads)
    const hc = s * 0.555, hy = 0.962, hcol = sp.paw || LIMB;
    col(hcol); blob([hc, hy, 0], [0.052 * armR, 0.038 * armR, 0.056 * armR], null, { seg: hi ? 14 : 8 });
    const fz = [-0.026, 0.0, 0.026];
    const BEAN = sp.bean || P.pad || "#ff9fb4";
    if (!low) {
      for (let f = 0; f < 3; f++) {
        const z = fz[f] * armR, l = (f === 1 ? 0.068 : 0.060) * armR;
        const a = [hc + s * 0.03, hy - 0.002, z], b = [hc + s * (0.03 + l), hy - 0.008, z * 1.15];
        col(hcol); tube(path([[a, 0.0185 * armR], [lerp3(a, b, 0.6), 0.017 * armR], [b, 0.016 * armR]], hi ? 2 : 1), { m: hi ? 8 : 6, domeA: true, domeB: true });
        col(BEAN); blob([b[0] - s * 0.004, hy - 0.020, b[2]], [0.010 * armR, 0.004, 0.010 * armR], null, { seg: 6 });
      }
      const ta = [hc - s * 0.005, hy - 0.006, -0.035 * armR], tb = [hc + s * 0.022, hy - 0.016, -0.072 * armR];
      col(hcol); tube(path([[ta, 0.020 * armR], [tb, 0.017 * armR]], hi ? 2 : 1), { m: hi ? 8 : 6, domeA: true, domeB: true });
      col(BEAN); blob([tb[0], hy - 0.022, tb[2]], [0.010 * armR, 0.004, 0.010 * armR], null, { seg: 6 });
      // Sculpted 3-lobed pink metacarpal palm pad
      col(BEAN);
      blob([hc + s * 0.004, hy - 0.032, 0], [0.024 * armR, 0.005, 0.026 * armR], null, { seg: 8 });
      blob([hc + s * 0.014, hy - 0.030, -0.018 * armR], [0.014 * armR, 0.004, 0.014 * armR], null, { seg: 6 });
      blob([hc + s * 0.014, hy - 0.030, 0.018 * armR], [0.014 * armR, 0.004, 0.014 * armR], null, { seg: 6 });
    }
    // leg + paw foot with 3 distinct rounded toes and pink pads
    const L = legPath(s);
    tube(L, { m: M + 2, colFn: (t, k, p) => col(sp.limbs ? LIMB : sp.paw && p[1] < 0.15 ? sp.paw : bodyCol(p)), up: [0, 0, -1] });
    const fx = s * 0.088, fcol = sp.paw || LIMB;
    col(fcol); blob([fx, 0.06, -0.035], [0.068 * legR, 0.06, 0.108], null, { floor: 0.0, seg: hi ? 16 : 9 });
    if (!shoeOn && !low) {
      for (const dx of [-0.028, 0, 0.028]) {
        col(fcol); blob([fx + dx * legR, 0.032, -0.126], [0.022 * legR, 0.026, 0.028], null, { floor: 0, seg: 8 });
        col(BEAN); blob([fx + dx * legR, 0.004, -0.124], [0.014 * legR, 0.004, 0.014], null, { floor: 0, seg: 6 });
      }
      col(BEAN); blob([fx, 0.003, -0.03], [0.036 * legR, 0.004, 0.046], null, { seg: 8 });
    }
  }
  // tail: bushy and two-toned
  {
    const tS = sp.tail;
    WO = (p) => { const t = clamp((p[2] - 0.13) / 0.25, 0, 1); return { Hips: Math.max(0, 0.3 - t), Tail: 1 - t, Tail1: t }; };
    let ctrl = null, tipFrom = 0.68, ringed = false;
    const b = [0, 0.57, 0.12];
    if (tS === "bushy") ctrl = [[b, 0.04], [[0, 0.52, 0.24], 0.09], [[0, 0.6, 0.4], 0.115], [[0, 0.78, 0.5], 0.09], [[0, 0.93, 0.52], 0.02]];
    else if (tS === "ringed") { ctrl = [[b, 0.04], [[0, 0.52, 0.24], 0.075], [[0, 0.6, 0.4], 0.085], [[0, 0.76, 0.5], 0.07], [[0, 0.9, 0.52], 0.02]]; ringed = true; }
    else if (tS === "cat") ctrl = [[b, 0.035], [[0, 0.5, 0.24], 0.045], [[0, 0.62, 0.38], 0.045], [[0, 0.82, 0.42], 0.042], [[0, 0.94, 0.36], 0.035]];
    else if (tS === "thin") { ctrl = [[b, 0.025], [[0, 0.45, 0.25], 0.02], [[0, 0.5, 0.42], 0.015], [[0, 0.66, 0.5], 0.01]]; tipFrom = 2; }
    else if (tS === "otter") { ctrl = [[b, 0.06], [[0, 0.42, 0.24], 0.06], [[0, 0.3, 0.38], 0.04], [[0, 0.24, 0.5], 0.012]]; tipFrom = 2; }
    else if (tS === "lion") { ctrl = [[b, 0.03], [[0, 0.48, 0.25], 0.03], [[0, 0.56, 0.42], 0.028], [[0, 0.74, 0.48], 0.026]]; tipFrom = 2; }
    else if (tS === "flag") { ctrl = [[b, 0.05], [[0, 0.64, 0.19], 0.065], [[0, 0.72, 0.21], 0.02]]; tipFrom = 2; }
    else if (tS === "curly") { ctrl = []; for (let i = 0; i <= 8; i++) { const a = i * 0.9; ctrl.push([[Math.sin(a) * 0.04, 0.6 + Math.cos(a) * 0.04 - i * 0.004, 0.14 + i * 0.012], 0.017]); } tipFrom = 2; }
    if (ctrl) {
      const tipC = sp.tip || mixc(FUR, "#ffffff", 0.5);
      tube(path(ctrl, hi ? 5 : 3), { m: hi ? 14 : 8, domeA: true, domeB: true, up: [1, 0, 0], colFn: (t, k, p) => col(ringed ? (Math.floor(t * 7) % 2 && t > 0.1 ? tipC : FUR) : tS === "flag" ? (Math.cos(k * TAU) < 0 ? tipC : FUR) && (Math.sin(k * TAU) < 0 ? tipC : FUR) : t > tipFrom ? tipC : FUR) });
      if (tS === "lion") { col(sp.tip); blob([0, 0.78, 0.48], [0.05, 0.065, 0.05]); }
    } else { col(tS === "puff" ? WHITE : FUR); blob([0, 0.58, 0.16], tS === "puff" ? [0.07, 0.065, 0.065] : [0.05, 0.045, 0.045], null, { deform: tS === "puff" && hi ? (d) => 1 + 0.12 * Math.sin(d[0] * 9) * Math.sin(d[1] * 9) : null }); }
    WO = null;
  }

  // ---------- clothes: offset shells of this body ----------
  const fab = (c, t) => col(c);
  const darker = (c, f = 0.22) => mixc(c, "#000000", f);
  const hemBand = (y, off, c, h = 0.022) => { col(darker(c, 0.12)); torsoShell(y, y + h, off + 0.006, null, { n: 1, bridged: true }); };
  const sleeve = (s, tEnd, off, c, cuff = true) => {
    const A = armPath(s), n = Math.max(2, Math.round(A.length * tEnd)), S = A.slice(0, n).map((q) => ({ p: q.p, r: [q.r[0], q.r[1]] }));
    col(c); tube(S, { m: M, off, up: [0, 0, -1] });
    if (cuff) { const e = S[S.length - 1], d = S[S.length - 2]; col(darker(c, 0.12)); tube([{ p: lerp3(d.p, e.p, 0.4), r: e.r }, { p: e.p, r: e.r }], { m: M, off: off + 0.007, up: [0, 0, -1] }); }
  };
  const TOFF = { sweater: 0.03, hoodie: 0.03, jacket: 0.034 }[topw] || 0.022;
  const BOFF = 0.012;
  const hasTop = topw !== "none";
  if (hasTop) {
    const c = TOP, yHem = topw === "dress" ? 0.6 : topw === "apron" ? 0.42 : 0.525, yNeck = topw === "tank" ? 0.975 : 1.03;
    if (topw === "apron") {
      col(c); torsoShell(0.5, 0.93, 0.035, null, { a0: -Math.PI * 0.82, a1: -Math.PI * 0.18, bridged: true });
      col(darker(c, 0.15)); torsoShell(0.66, 0.69, 0.04, null, { n: 1, bridged: true });
      col(darker(c, 0.15)); for (const s of [-1, 1]) tube(path([[torsoPt(0.93, -Math.PI / 2 + s * 0.45, 0.04, true), 0.008], [[s * 0.09, 1.03, -0.02], 0.008], [[s * 0.07, 1.06, 0.06], 0.008]], 2), { m: 6 });
    } else {
      const pjStripe = topw === "pajamas", ribbed = topw === "sweater";
      const flare = (y) => 0.03 * sstep(0.68, 0.53, y);
      torsoShell(yHem, yNeck, TOFF, (t, k, p) => {
        let cc = c;
        if (pjStripe && Math.floor((Math.atan2(p[2], p[0]) + 7) * 6) % 2) cc = mixc(c, "#ffffff", 0.3);
        if (ribbed && Math.floor(k * TM) % 2) cc = darker(c, 0.06);
        if (topw === "hoodie" && p[2] < 0 && p[1] > 0.6 && p[1] < 0.72 && Math.abs(p[0]) < 0.11) cc = darker(c, 0.1);
        if (topw === "jacket" && p[2] < 0 && Math.abs(p[0]) < 0.012) cc = "#c8c8d0";
        col(cc);
      }, { bridged: true, offFn: (y) => flare(y) });
      hemBand(yHem, TOFF + flare(yHem), c, ribbed ? 0.04 : 0.022);
      col(darker(c, 0.12)); torsoShell(yNeck - 0.022, yNeck, TOFF + 0.004, null, { n: 1, bridged: true }); // collar band
      if (topw !== "tank" && topw !== "dress") sleeve(-1, ["tee", "apron"].includes(topw) ? 0.36 : 0.93, TOFF * 0.6, c, true), sleeve(1, ["tee", "apron"].includes(topw) ? 0.36 : 0.93, TOFF * 0.6, c, true);
      if (topw === "dress") { sleeve(-1, 0.22, TOFF * 0.6, c, true); sleeve(1, 0.22, TOFF * 0.6, c, true); }
      if (topw === "hoodie") { col(darker(c, 0.08)); blob([0, 1.04, 0.12], [0.17, 0.07, 0.1]); col("#f4f1ea"); for (const s of [-1, 1]) tube(path([[torsoPt(1.0, -Math.PI / 2 + s * 0.25, TOFF, true), 0.006], [torsoPt(0.86, -Math.PI / 2 + s * 0.22, TOFF + 0.008, true), 0.006]], 2), { m: 5, domeB: true }); }
      if (topw === "jacket") { col(darker(c, 0.1)); for (const s of [-1, 1]) tube(path([[torsoPt(1.03, -Math.PI / 2 + s * 0.5, TOFF + 0.01, true), [0.035, 0.008]], [torsoPt(1.06, s * 0.3 - Math.PI / 2 + s * 1.2, TOFF + 0.03, true), [0.04, 0.008]]], 2), { m: 6 }); }
      if (topw === "pajamas" && !low) { col("#f4f1ea"); for (let i = 0; i < 4; i++) blob(torsoPt(0.62 + i * 0.1, -Math.PI / 2, TOFF + 0.004, true), [0.012, 0.012, 0.006], null, { seg: 8 }); }
    }
    if (topw === "dress") {
      const R = [], C = [], n = hi ? 10 : 5;
      for (let i = 0; i <= n; i++) { const t = i / n, y = lerp(0.62, 0.3, t); const ring = []; for (let k = 0; k < TM; k++) { const a = (k / TM) * TAU, p0 = torsoPt(Math.max(0.47, y), a, TOFF, true), fl = lerp(1, 1.55, t ** 0.9), wav = 1 + (hi ? 0.03 * t * Math.sin(a * 8) : 0); ring.push([p0[0] * fl * wav, y, p0[2] * fl * wav]); } R.push(ring); C.push([0, y, 0]); }
      ringsOut(R, C, (t, k, p) => col(t > 0.88 ? darker(c, 0.12) : c));
    }
  }
  if (botw !== "none") {
    const c = BOT;
    const skirtish = botw === "skirt" || botw === "longskirt";
    if (!skirtish) {
      col(c); torsoShell(0.47, 0.66, BOFF, null, { capA: true });
      const yEnd = botw === "shorts" ? 0.42 : 0.12, off = botw === "pjpants" ? 0.024 : BOFF;
      for (const s of [-1, 1]) {
        const L = legPath(s).filter((q) => q.p[1] >= yEnd - 0.001);
        tube(L, { m: M + 2, off, up: [0, 0, -1], colFn: (t, k, p) => col(botw === "pjpants" && Math.floor((p[1] + 1) * 18) % 2 ? mixc(c, "#ffffff", 0.25) : c) });
        const e = L[L.length - 1], d = L[L.length - 2]; col(darker(c, 0.15)); tube([{ p: lerp3(e.p, d.p, 0.5), r: e.r }, { p: e.p, r: e.r }], { m: M + 2, off: off + 0.007, up: [0, 0, -1] });
      }
      col(darker(c, 0.15)); torsoShell(0.64, 0.665, BOFF + 0.005, null, { n: 1 }); // waistband
      if (botw === "overalls") {
        col(c); torsoShell(0.52, 0.86, TOFF + 0.012, null, { a0: -Math.PI * 0.78, a1: -Math.PI * 0.22, bridged: true });
        for (const s of [-1, 1]) { col(darker(c, 0.1)); tube(path([[torsoPt(0.86, -Math.PI / 2 + s * 0.42, TOFF + 0.014, true), [0.016, 0.004]], [torsoPt(1.0, -Math.PI / 2 + s * 0.6, TOFF + 0.012, true), [0.016, 0.004]], [[s * 0.1, 1.04, 0.0], [0.016, 0.004]], [torsoPt(0.98, Math.PI / 2 + s * 0.4, TOFF + 0.012, true), [0.016, 0.004]], [torsoPt(0.7, Math.PI / 2 + s * 0.3, TOFF + 0.012, true), [0.016, 0.004]]], 3), { m: 6 }); col("#f3c64a"); blob(torsoPt(0.84, -Math.PI / 2 + s * 0.42, TOFF + 0.02, true), [0.012, 0.012, 0.006], null, { seg: 8 }); }
      }
    } else {
      // skirt: fitted down to just under the top's hem, then flares clear of the thighs
      const yB = botw === "longskirt" ? 0.08 : 0.4, R = [], C = [], n = hi ? 12 : 6, yF = hasTop ? 0.53 : 0.6;
      for (let i = 0; i <= n; i++) { const y = lerp(0.665, yB, i / n), ring = []; const tf = clamp((yF - y) / (yF - yB), 0, 1); for (let k = 0; k < TM; k++) { const a = (k / TM) * TAU, p0 = torsoPt(Math.max(0.5, Math.min(y, yF)), a, BOFF + 0.004, true), fl = 1 + tf ** 0.8 * (botw === "longskirt" ? 0.75 : 0.5), wav = 1 + (hi ? 0.035 * tf * Math.sin(a * 9) : 0); ring.push([p0[0] * fl * wav, y, p0[2] * fl * wav]); } R.push(ring); C.push([0, y, 0]); }
      ringsOut(R, C, (t, k, p) => col(t > 0.9 ? darker(c, 0.15) : c));
      col(darker(c, 0.15)); torsoShell(0.64, 0.665, BOFF + 0.008, null, { n: 1, bridged: true });
    }
  }
  // shoes
  if (shoeOn) for (const s of [-1, 1]) {
    const fx = s * 0.088, c = SHOEC;
    if (shoes === "slippers") { col(c); blob([fx, 0.065, -0.035], [0.085 * legR, 0.07, 0.125], null, { floor: 0, seg: hi ? 16 : 9, deform: hi ? (d) => 1 + 0.05 * Math.sin(d[0] * 13) * Math.sin(d[2] * 11) : null }); col(mixc(c, "#ff8fc7", 0.4)); blob([fx, 0.12, -0.13], [0.03, 0.03, 0.03]); continue; }
    col(c); blob([fx, 0.064, -0.035], [0.078 * legR, 0.068, 0.12], null, { floor: 0.022, seg: hi ? 16 : 9 });
    col(shoes === "boots" ? "#2a2420" : "#ffffff"); blob([fx, 0.022, -0.035], [0.082 * legR, 0.024, 0.125], null, { floor: 0, seg: hi ? 16 : 9 });
    if (shoes === "sneakers" && !low) { col("#ffffff"); for (let i = 0; i < 3; i++) { const z = -0.08 - i * 0.022; stroke && tube(path([[[fx - 0.03, 0.115 - i * 0.012, z], 0.005], [[fx + 0.03, 0.115 - i * 0.012, z], 0.005]], 1), { m: 5 }); } }
    if (shoes === "boots") { const L = legPath(s).filter((q) => q.p[1] <= 0.32); col(c); tube(L, { m: M + 2, off: 0.022, up: [0, 0, -1] }); col(darker(c, 0.18)); tube(L.slice(0, 2), { m: M + 2, off: 0.03, up: [0, 0, -1] }); }
  }
  // hats
  const HSHELL = (yMin, off, colFn) => { // shell over the head's top above direction y
    const U = hi ? 36 : 20, V = hi ? 10 : 6, phMax = Math.acos(yMin);
    const pt = (i, j) => { const th = (i / U) * TAU, ph = (j / V) * phMax; return headPt([Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)], off); };
    for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) { const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1); if (colFn) colFn(j / V); if (j === 0) T(a, c, d, HC); else Q(a, b, c, d, HC); }
  };
  const top = headPt([0, 1, 0]);
  WO = { Head: 1 };
  if (hat === "beanie") { HSHELL(0.42, 0.025, () => col(HATC)); col(darker(HATC, 0.12)); { const U = hi ? 36 : 20; for (let i = 0; i < U; i++) { const f = (ph, th) => headPt([Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)], 0.04); const p1 = Math.acos(0.5), p2 = Math.acos(0.36), t1 = (i / U) * TAU, t2 = ((i + 1) / U) * TAU; Q(f(p1, t1), f(p1, t2), f(p2, t2), f(p2, t1), HC); } } col(mixc(HATC, "#ffffff", 0.5)); blob(add3(top, [0, 0.04, 0]), [0.055, 0.05, 0.055]); }
  else if (hat === "cap") { HSHELL(0.45, 0.018, () => col(HATC)); col(darker(HATC, 0.1)); const bp = headPt(norm3([0, 0.5, -1]), 0.02); blob(add3(bp, [0, -0.005, -0.08]), [0.17, 0.012, 0.11], null, { seg: hi ? 16 : 10 }); blob(add3(top, [0, 0.018, 0]), [0.02, 0.012, 0.02], null, { seg: 8 }); }
  else if (hat === "tophat") { col("#22202a"); const b = add3(top, [0.04, -0.03, 0.02]); tube(path([[b, 0.13], [add3(b, [0.0, 0.22, 0]), 0.14]], 2), { m: hi ? 20 : 12, capB: true }); col(HATC); tube(path([[add3(b, [0, 0.02, 0]), 0.135], [add3(b, [0, 0.06, 0]), 0.138]], 1), { m: hi ? 20 : 12 }); col("#22202a"); tube(path([[add3(b, [0, -0.012, 0]), 0.23], [add3(b, [0, 0.008, 0]), 0.23]], 1), { m: hi ? 22 : 12, capA: true, capB: true }); }
  else if (hat === "crown") { col("#f3c64a"); ctx.metalness(0.6); ctx.roughness(0.3); const b = add3(top, [0, -0.035, 0]); tube(path([[b, 0.13], [add3(b, [0, 0.05, 0]), 0.13]], 1), { m: hi ? 20 : 12 }); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, pb = add3(b, [Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.12]); cone(pb, add3(pb, [Math.cos(a) * 0.02, 0.08, Math.sin(a) * 0.02]), 0.03, "#f3c64a"); } ctx.metalness(null); ctx.roughness(null); col(HATC); blob(add3(b, [0, 0.025, -0.13]), [0.022, 0.022, 0.012], null, { seg: 8 }); }
  else if (hat === "headphones") { col("#2b2b33"); const arc = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); arc.push([headPt(norm3([Math.cos(a), Math.sin(a) * 1.0, 0.1]), 0.035), 0.016]); } tube(path(arc, 2), { m: 8 }); for (const s of [-1, 1]) { col(HATC); const c = headPt(norm3([s, 0.05, 0.05]), 0.02); tube(path([[add3(c, [-s * 0.02, 0, 0]), 0.075], [add3(c, [s * 0.04, 0, 0]), 0.07]], 1), { m: hi ? 16 : 10, capA: true, capB: true, up: [0, 0, -1] }); } }
  else if (hat === "partyhat") { const b = add3(top, [0.05, -0.04, 0]); col(HATC); tube(path([[b, 0.1], [add3(b, [0.04, 0.24, 0]), 0.006]], 6), { m: hi ? 16 : 10, capA: true, colFn: (t) => col(Math.floor(t * 6) % 2 ? mixc(HATC, "#ffffff", 0.55) : HATC) }); col("#ffd93d"); blob(add3(b, [0.04, 0.25, 0]), [0.035, 0.035, 0.035]); }
  else if (hat === "bow") { col(HATC); const b = headPt(norm3([0.5, 0.82, -0.25]), 0.02); for (const s of [-1, 1]) blob(add3(b, [s * 0.065, 0.01, 0]), [0.065, 0.045, 0.025], null, { deform: (d) => 1 - 0.35 * Math.max(0, -d[0] * s) }); col(darker(HATC, 0.15)); blob(b, [0.025, 0.028, 0.025]); }
  else if (hat === "flower") { const b = headPt(norm3([0.55, 0.75, -0.3]), 0.02); col(HATC); for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; blob(add3(b, [Math.cos(a) * 0.04, Math.sin(a) * 0.04, -0.004]), [0.035, 0.035, 0.014], null, { seg: 10 }); } col("#ffd93d"); blob(add3(b, [0, 0, -0.012]), [0.025, 0.025, 0.015], null, { seg: 10 }); }
  else if (hat === "tuft") { for (const [x, l, lean] of [[-0.04, 0.16, -0.5], [0.0, 0.2, 0.3], [0.05, 0.14, 0.8]]) { const b = headPt(norm3([x, 1, -0.1]), -0.02); cone(b, add3(b, [lean * 0.07, l, -0.02]), 0.04, HATC); } }
  WO = null;
  // neckwear
  if (neck !== "none") {
    WO = (p) => ({ Spine2: 0.5, Neck: 0.5 });
    if (neck === "scarf") { col(NECKC); const loop = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU; loop.push([[Math.cos(a) * 0.125, 1.035 + 0.01 * Math.sin(a * 2), Math.sin(a) * 0.12], 0.04]); } tube(path(loop, 2), { m: hi ? 12 : 8, colFn: (t) => col(Math.floor(t * 10) % 2 ? NECKC : mixc(NECKC, "#ffffff", 0.35)) }); WO = { Spine2: 1 }; col(NECKC); tube(path([[[0.07, 1.0, -0.12], [0.04, 0.015]], [[0.1, 0.9, -0.15], [0.045, 0.015]], [[0.11, 0.78, -0.15], [0.045, 0.015]]], 3), { m: 8, capB: true, up: [0, 0, -1] }); }
    else if (neck === "bowtie") { col(NECKC); const b = [0, 1.0, -0.115]; for (const s of [-1, 1]) blob(add3(b, [s * 0.045, 0, 0]), [0.045, 0.032, 0.018], null, { deform: (d) => 1 - 0.4 * Math.max(0, -d[0] * s) }); col(darker(NECKC, 0.2)); blob(b, [0.016, 0.02, 0.018], null, { seg: 8 }); }
    else if (neck === "bell") { col("#c0392b"); const loop = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU; loop.push([[Math.cos(a) * 0.1, 1.025, Math.sin(a) * 0.1], 0.014]); } tube(path(loop, 2), { m: 6 }); col(NECKC); ctx.metalness(0.7); ctx.roughness(0.25); blob([0, 0.985, -0.12], [0.032, 0.032, 0.032]); ctx.metalness(null); ctx.roughness(null); col(INK); blob([0, 0.975, -0.15], [0.012, 0.005, 0.004], null, { seg: 6 }); }
    else if (neck === "cape") {
      WO = (p) => p[1] > 0.84 ? { Spine2: 1 } : { Spine2: 0.4, Spine1: 0.4, Spine: 0.2 };
      col(NECKC); torsoShell(0.5, 1.02, 0.05, (t) => col(t > 0.93 || t < 0.06 ? mixc(NECKC, "#ff6b6b", 0.6) : NECKC), { a0: 0.12, a1: Math.PI - 0.12, bridged: true, offFn: (y) => (1.02 - y) * 0.16 + (y < 0.6 ? 0.03 : 0) });
      col(darker(NECKC, 0.35)); torsoShell(0.5, 1.02, 0.042, null, { a0: 0.14, a1: Math.PI - 0.14, bridged: true, offFn: (y) => (1.02 - y) * 0.16 + (y < 0.6 ? 0.03 : 0) });
      col(mixc(NECKC, "#ff6b6b", 0.6)); const loop = []; for (let i = 0; i <= 14; i++) { const a = (i / 14) * TAU; loop.push([[Math.cos(a) * 0.15, 1.02, Math.sin(a) * 0.13 - 0.005], 0.026]); } tube(path(loop, 2), { m: 8, up: [0, 1, 0] });
    }
    WO = null;
  }
  return { joints: J, weights: Wt };
}
