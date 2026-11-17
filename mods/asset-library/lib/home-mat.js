// HOME-MAT — the ONE finish palette every gen-home/*.js generator paints from (09b §2).
//
//   const M = require("lib/home-mat.js");            // mod-scoped: resolves to asset-library/lib/
//   const top  = M.finish(ctx, p.finish,  "oak");     // never a literal texture path in a generator
//   const legs = M.finish(ctx, p.finish2, "black");
//   G.boxZ(ctx, ..., 0.008, top);
//
// Every opaque finish is a G.surface() paint (CDN albedo × tint × seeded grit on colour / metal /
// rough) WRAPPED so it also zeroes emissive — the material channel is sticky, and one warm bulb
// would otherwise light every face emitted after it. `glow()` is the only paint that sets emissive;
// `glass()` is the only translucent paint (alpha 0.35 → the renderer's transparent pass) and it is
// NOT a surface() def: surface() hard-codes alpha 1. Glass and glow are emitted LAST in a part —
// after every textured group — so the albedo runs stay grouped and the clear run ends them.
//
// Style family: lowpoly-cozy. Ten mints named here once (texture-home-*), plus the board's
// already-served steel / brick / stone / concrete / leaf / soil / canvas.
//
// Exports: TEX, FINISHES, ALIAS, palette(ctx), finish(ctx, name, fallback), glow(ctx, r, g, b, k),
//          glass(ctx), mirror(ctx), group(name), names(), has(name).

const G = require("scripts/lib/geom.js");

const LC = "/cdn/moodboard-lowpoly-cozy/";

const TEX = {
  // ── the ten home mints ──────────────────────────────────────────────────────
  wood: LC + "texture-home-wood-veneer-pale.png",
  // v2 re-mints (K1, 2026-09-02): the first `painted-mdf-satin` served multicolour planks, the first
  // `ceramic-glazed-white` a crazy-paving mosaic, the first `wool-rug-pile` a patterned kilim — none
  // tint to a plain finish. The old names keep serving; nothing references them.
  paint: LC + "texture-home-lacquer-satin-plain-v2.png",
  linen: LC + "texture-home-linen-weave.png",
  leather: LC + "texture-home-leather-grain.png",
  marble: LC + "texture-home-marble-white-veined.png",
  ceramic: LC + "texture-home-glaze-smooth-porcelain-v2.png",
  wool: LC + "texture-home-wool-pile-plain-v2.png",
  tile: LC + "texture-home-kitchen-tile-glossy.png",
  card: LC + "texture-home-cardboard-flatpack.png",
  rattan: LC + "texture-home-rattan-weave.png",
  // ── already served under the board, reused ─────────────────────────────────
  steel: LC + "texture-brushed-steel-panel.png",
  brick: LC + "texture-mainstreet-red-brick-wall.png",
  stone: LC + "texture-plaza-granite.png",
  concrete: LC + "texture-sidewalk-concrete.png",
  leaf: LC + "texture-park-foliage-leaves.png",
  soil: LC + "texture-packed-dirt.png",
  canvas: LC + "texture-mainstreet-awning-canvas.png",
};

// name → { tex (TEX key), r, g, b, metal, rough, jitter, freq }. `tex` doubles as the finish GROUP
// tag 09c writes on the shelf row (wood / paint / linen / …). Tints are 09b §2's table.
const FINISHES = {
  // wood veneer — grain from the mint, species from the tint
  birch: { tex: "wood", r: 0.92, g: 0.86, b: 0.74, rough: 0.55, jitter: 0.05, freq: 5 },
  oak: { tex: "wood", r: 0.78, g: 0.62, b: 0.42, rough: 0.6, jitter: 0.06, freq: 5 },
  pine: { tex: "wood", r: 0.86, g: 0.72, b: 0.5, rough: 0.6, jitter: 0.06, freq: 5 },
  walnut: { tex: "wood", r: 0.42, g: 0.27, b: 0.17, rough: 0.5, jitter: 0.06, freq: 5 },
  // painted MDF — satin
  white: { tex: "paint", r: 0.95, g: 0.95, b: 0.93, rough: 0.35, jitter: 0.03, freq: 7 },
  black: { tex: "paint", r: 0.12, g: 0.12, b: 0.13, rough: 0.6, jitter: 0.04, freq: 7 },
  sage: { tex: "paint", r: 0.62, g: 0.7, b: 0.58, rough: 0.4, jitter: 0.04, freq: 7 },
  navy: { tex: "paint", r: 0.16, g: 0.22, b: 0.36, rough: 0.4, jitter: 0.04, freq: 7 },
  "hylla-blue": { tex: "paint", r: 0.05, g: 0.28, b: 0.62, rough: 0.4, jitter: 0.03, freq: 7 },
  "hylla-yellow": { tex: "paint", r: 0.98, g: 0.78, b: 0.1, rough: 0.4, jitter: 0.03, freq: 7 },
  // textiles
  "linen-grey": { tex: "linen", r: 0.58, g: 0.58, b: 0.56, rough: 0.95, jitter: 0.06, freq: 9 },
  "linen-oat": { tex: "linen", r: 0.8, g: 0.74, b: 0.62, rough: 0.95, jitter: 0.06, freq: 9 },
  "linen-blue": { tex: "linen", r: 0.4, g: 0.5, b: 0.66, rough: 0.95, jitter: 0.06, freq: 9 },
  "felt-green": { tex: "linen", r: 0.13, g: 0.42, b: 0.24, rough: 1.0, jitter: 0.05, freq: 9 },
  "leather-tan": { tex: "leather", r: 0.62, g: 0.4, b: 0.22, rough: 0.5, jitter: 0.08, freq: 6 },
  "leather-black": { tex: "leather", r: 0.1, g: 0.09, b: 0.09, rough: 0.45, jitter: 0.06, freq: 6 },
  "wool-cream": { tex: "wool", r: 0.88, g: 0.84, b: 0.76, rough: 1.0, jitter: 0.06, freq: 8 },
  "wool-rust": { tex: "wool", r: 0.6, g: 0.3, b: 0.18, rough: 1.0, jitter: 0.06, freq: 8 },
  "wool-teal": { tex: "wool", r: 0.2, g: 0.44, b: 0.46, rough: 1.0, jitter: 0.06, freq: 8 },
  // hard surfaces
  marble: { tex: "marble", r: 0.92, g: 0.91, b: 0.89, rough: 0.25, jitter: 0.03, freq: 4 },
  ceramic: { tex: "ceramic", r: 0.96, g: 0.96, b: 0.95, rough: 0.15, jitter: 0.02, freq: 6 },
  "tile-white": { tex: "tile", r: 0.94, g: 0.94, b: 0.92, rough: 0.2, jitter: 0.03, freq: 6 },
  "tile-green": { tex: "tile", r: 0.55, g: 0.7, b: 0.62, rough: 0.2, jitter: 0.03, freq: 6 },
  cardboard: { tex: "card", r: 0.76, g: 0.62, b: 0.44, rough: 0.9, jitter: 0.08, freq: 6 },
  rattan: { tex: "rattan", r: 0.74, g: 0.58, b: 0.36, rough: 0.85, jitter: 0.08, freq: 8 },
  // metals
  chrome: { tex: "steel", r: 0.86, g: 0.87, b: 0.88, metal: 0.9, rough: 0.25, jitter: 0.04, freq: 9 },
  steel: { tex: "steel", r: 0.62, g: 0.63, b: 0.65, metal: 0.7, rough: 0.45, jitter: 0.06, freq: 9 },
  // masonry / ground / outdoor
  brick: { tex: "brick", r: 0.72, g: 0.42, b: 0.32, rough: 0.95, jitter: 0.12, freq: 4 },
  stone: { tex: "stone", r: 0.66, g: 0.64, b: 0.6, rough: 0.9, jitter: 0.1, freq: 4 },
  concrete: { tex: "concrete", r: 0.7, g: 0.69, b: 0.66, rough: 0.95, jitter: 0.08, freq: 4 },
  leaf: { tex: "leaf", r: 0.45, g: 0.62, b: 0.32, rough: 0.9, jitter: 0.1, freq: 8 },
  soil: { tex: "soil", r: 0.36, g: 0.27, b: 0.18, rough: 1.0, jitter: 0.1, freq: 6 },
  canvas: { tex: "canvas", r: 0.9, g: 0.88, b: 0.8, rough: 0.9, jitter: 0.05, freq: 7 },
};

// 09 §3's plain-language names → palette rows. A generator may pass either.
const ALIAS = {
  linen: "linen-grey",
  leather: "leather-tan",
  "white-lacquer": "white",
  lacquer: "white",
  "matte-black": "black",
  felt: "felt-green",
  wool: "wool-cream",
  wood: "oak",
  metal: "steel",
};

export function resolveName(name) {
  const n = typeof name === "string" ? name.trim().toLowerCase() : "";
  if (!n) return "";
  if (FINISHES[n]) return n;
  if (ALIAS[n] && FINISHES[ALIAS[n]]) return ALIAS[n];
  return "";
}

// Wrap a surface() paint so every face it paints also resets emissive (the sticky-channel law).
export function opaque(ctx, def) {
  const s = G.surface(ctx, {
    tex: TEX[def.tex] || null,
    r: def.r,
    g: def.g,
    b: def.b,
    metal: def.metal || 0,
    rough: def.rough === undefined ? 0.6 : def.rough,
    jitter: def.jitter === undefined ? 0.06 : def.jitter,
    freq: def.freq || 6,
  });
  return function (x, y, z) {
    s(x, y, z);
    ctx.emissive(0, 0, 0);
  };
}

// One palette per geometry run — built lazily, cached per ctx so finish() is free to call per face
// group. WeakMap keys die with the ctx.
const CACHE = typeof WeakMap === "function" ? new WeakMap() : null;

export function palette(ctx) {
  let P = CACHE ? CACHE.get(ctx) : null;
  if (P) return P;
  P = { TEX: TEX };
  for (const k in FINISHES) P[k] = opaque(ctx, FINISHES[k]);
  P.glass = glass(ctx);
  P.mirror = mirror(ctx);
  if (CACHE) CACHE.set(ctx, P);
  return P;
}

// The generator's one entry point: finish(ctx, p.finish, "<family default>"). Unknown names fall
// to the family default, then to oak — never to an untextured face.
export function finish(ctx, name, fallback) {
  const P = palette(ctx);
  const n = resolveName(name) || resolveName(fallback) || "oak";
  return P[n];
}

// Emissive paint — bulbs, embers, screens. Untextured; colour AND glow ride (r,g,b); k scales the
// glow (1 = a lit shade, 2+ = a bare bulb). Every opaque palette paint resets emissive after it.
export function glow(ctx, r, g, b, k) {
  const s = typeof k === "number" && isFinite(k) ? k : 1;
  return function () {
    ctx.albedo(null);
    ctx.color(r, g, b, 1);
    ctx.metalness(0);
    ctx.roughness(0.45);
    ctx.emissive(Math.min(1, r * s), Math.min(1, g * s), Math.min(1, b * s));
  };
}

// Clear glass — oven doors, shower screens, cabinet glazing, coasters, vase bulbs. Alpha 0.35 puts
// these faces in the transparent pass; albedo(null) ends whatever textured run preceded them.
// Emit last in the part.
export function glass(ctx) {
  return function () {
    ctx.albedo(null);
    ctx.color(0.8, 0.9, 0.95, 0.35);
    ctx.metalness(0.05);
    ctx.roughness(0.08);
    ctx.emissive(0, 0, 0);
  };
}

// Mirror face — opaque, untextured, near-full metal and near-zero roughness so it takes the room's
// light like polished silver (the engine has no planar reflection; this is the honest read).
export function mirror(ctx) {
  return function () {
    ctx.albedo(null);
    ctx.color(0.9, 0.93, 0.96, 1);
    ctx.metalness(0.98);
    ctx.roughness(0.04);
    ctx.emissive(0, 0, 0);
  };
}

// The finish GROUP a name belongs to (the shelf tag 09c writes): wood / paint / linen / … ; "glass"
// and "mirror" answer themselves; unknown → "".
export function group(name) {
  const n = resolveName(name);
  if (n) return FINISHES[n].tex;
  const raw = typeof name === "string" ? name.trim().toLowerCase() : "";
  return raw === "glass" || raw === "mirror" ? raw : "";
}

export function names() {
  return Object.keys(FINISHES);
}

export function has(name) {
  return !!resolveName(name);
}

module.exports = { TEX, FINISHES, ALIAS, palette, finish, glow, glass, mirror, group, names, has, resolveName };
