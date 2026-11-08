// Level 6.1 "The Snackrooms" (backrooms-wiki.wikidot.com/level-6-1)
// An endless 1980s mall food court and retro diner sanctuary.
// Features curved diner booths, revolving chrome pedestal stools, hot coffee urns, pie domes,
// docile Facelings serving free meals, and an authentic Wurlitzer jukebox streaming live 80s internet radio.

import { layExtra, faceling, person, PEOPLE, FACELING_IDS } from "../../scripts/lib/level61-extra.js";
import { keepPeople } from "../../scripts/lib/level-kit.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";

export const cadence = "1s";
const V = 24;
const M_TABLE = "/cdn/value.5c13c3baf678446267c70befcd2ff0bc5fcb6627960162c3ef037241bae2eeb5.glb";
const M_VEND = "/cdn/value.4eab9e798b9d50b4a15a489b3ef9281b80533de62f779d90a920e866c8f73942.glb";
const M_STOOL = "/cdn/value.aafae0e5ed4c77675ec12a25bb3f8eac5c887ceaf6219d322cd50996a57e1552.glb";
const SNACK = "/cdn/value.50b5fa3844cf9c705ca675660ef22ddb556c1cf0f31ad1cd69deeb8d8395df71.png";
const SODA = "/cdn/value.4db3afe09f392fef7c9d80e531484862384aef0ea5bcba295dc62b57197b659f.png";

const T = (name, rep) => ({ texture: `cdn/texture-${name}.png`, repeat: [rep, rep], wrap: "repeat" });
const TERRAZZO = { ...T("polished-cream-terrazzo-mall-floor-with-flecks", 0.6), color: "oklch(0.9 0.02 80)", roughness: 0.35 };
const PLASTER = { ...T("cream-painted-plaster-wall", 0.5), color: "oklch(0.93 0.02 85)", roughness: 0.85 };
const CEIL = { ...T("white-2x2-acoustic-drop-ceiling-tiles-with-aluminum-t-bar-grid", 0.83), color: "oklch(0.96 0.01 90)", roughness: 0.9 };
const WAINSCOT = { ...T("glossy-pastel-teal-square-ceramic-wall-tiles-with-white-grout", 1), color: "oklch(0.95 0.02 190)", roughness: 0.18 };
const BRASS = { color: "oklch(0.78 0.11 85)", metalness: 0.9, roughness: 0.25 };
const WOOD = { ...T("worn-hardwood-grain", 0.6), color: "oklch(0.55 0.08 55)", roughness: 0.6 };
const DARKWOOD = { ...T("worn-hardwood-grain", 0.6), color: "oklch(0.3 0.05 40)", roughness: 0.5 };
const CHECK = { ...T("black-and-white-checkerboard-vinyl-floor-tiles", 0.5), roughness: 0.4 };
const BATH = { ...T("white-square-ceramic-bathroom-wall-tiles", 1), color: "oklch(0.95 0.01 220)", roughness: 0.3 };
const STEEL = { color: "oklch(0.7 0.01 250)", metalness: 0.8, roughness: 0.3 };
const NAVY = { color: "oklch(0.3 0.1 262)", roughness: 0.45 };
const VINYL_RED = { color: "#b81c28", roughness: 0.45 };
const RUST = { ...T("scratched-worn-steel", 1), color: "oklch(0.42 0.06 45)", metalness: 0.6, roughness: 0.7 };

const M_BAR10 = "/cdn/value.f3a001b67df5932f6ab0edbee786a4fea656bbdcc4bb95fe0f8f89c834188b40.glb";
const M_BAR7 = "/cdn/value.602e0fd20886f20e7f9d268884aef45fc50293aee2da336124007503cceab7d6.glb";
const M_DINER = "/cdn/value.631d37b72621a949554ab06521366b4f7678149304b4c5ace1bc3159e9c132e8.glb";
const M_PIZZA = "/cdn/value.5c22a5f388991c20883c8482eda6ba0363d6e555148ac75b329dc228b4f20dc5.glb";
const M_OVEN = "/cdn/value.22485741e0731ddfcae9cc3ac5261175b727fc9dad7e75df605b3d3ac7091a95.glb";
const M_GRILL = "/cdn/value.52e8c951e79935129fcfb50a305e01a547c4ea962c25fb44339c09ac673636a4.glb";
const M_JUKE = "/cdn/value.eb676c37706ec7e4c3e6457d46b4a565b82fc50d9cb775ec70525a1fe3fcad67.glb";
const M_BACKBAR = "/cdn/value.d8c593de7c7b1406024e79601baece61757017658bcaf7b9bbd6da42ea716075.glb";
const M_BENCH = "/cdn/value.875f7fd721e70ac1c285cdade96da8263dc175c97f593282732e00ef66d72b83.glb";

const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const HW = 30, HD = 22, HH = 6;

const STEAM_FX = `fx
pop mist rate=6 life=1.2..2.0 on=disc(.08) v=up(.35..0.75)+sdir()*.08 size=.08..0.2 col=<.92,.92,.95> a=.3>0 sz=$size*(1>2) r=sprite(soft-disc)`;

function lay(ctx) {
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l61-/.test(id) && !id.includes("/")) ctx.destroy(id);
  const sp = (id, spec) => ctx.spawn(id, spec);
  const box = (id, x, y, z, w, h, d, material, extra = {}) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, physics: "static", ...extra });
  const light = (id, x, y, z, color, intensity, distance) => sp(id, { feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance, shadow: { enabled: false } } });

  const wallZ = (id, z, x0, x1, holes, h, mat, t = 0.3) => {
    let a = x0;
    holes.sort((p, q) => p[0] - q[0]).forEach(([c, w, hh], k) => {
      const l = c - w / 2;
      if (l > a) box(`${id}-${k}`, (a + l) / 2, 0, z, l - a, h, t, mat);
      box(`${id}-${k}h`, c, hh, z, w, h - hh, t, mat);
      a = c + w / 2;
    });
    if (x1 > a) box(`${id}-e`, (a + x1) / 2, 0, z, x1 - a, h, t, mat);
  };

  const wallX = (id, x, z0, z1, holes, h, mat, t = 0.3) => {
    let a = z0;
    holes.sort((p, q) => p[0] - q[0]).forEach(([c, w, hh], k) => {
      const l = c - w / 2;
      if (l > a) box(`${id}-${k}`, x, 0, (a + l) / 2, t, h, l - a, mat);
      box(`${id}-${k}h`, x, hh, c, t, h - hh, w, mat);
      a = c + w / 2;
    });
    if (z1 > a) box(`${id}-e`, x, 0, (a + z1) / 2, t, h, z1 - a, mat);
  };

  const sign = (id, x, y, z, yaw, w, h, html, bg) => sp(id, {
    feetPosition: { x, y, z },
    rotation: { yaw },
    primitive: { kind: "box", width: w, height: h, depth: 0.08 },
    material: { color: bg, roughness: 0.6 },
    ui: `<div face="front" width="${w}m" style="width:${w * 1000}px;height:${h * 1000}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:Arial,sans-serif;font-weight:900;line-height:1.05">${html}</div>`,
  });

  const M_SNACK_TRIPO = "/cdn/value.476807d8db2aec3bb854b6d000cd2fdb511d419ea6ff6260eda3d5109ff0e058.glb"; // tripo snack machine, re-seated in art/l61-vend/build.py: 1.83 m, feet origin, front +z
  const vend = (id, x, z, yaw, soda, extra = {}) => sp(id, {
    feetPosition: { x, y: extra.y ?? 0, z },
    rotation: { yaw, ...(extra.rot ?? {}) },
    physics: { body: "static", collider: "box" },
    model: soda ? { id: M_VEND, forward: "+z", materials: { cabinet: { color: "oklch(0.5 0.2 27)", roughness: 0.4, metalness: 0.35 } } } : { id: M_SNACK_TRIPO, forward: "+z" },
    tags: extra.dead ? [] : ["usable"],
    behavior: extra.dead ? undefined : "scripts/l61-use.js",
    state: extra.dead ? {} : { kind: "vend", sells: soda ? "soda" : "snack", name: soda ? "Soda machine" : "Snack machine", verb: "Press a button", info: soda ? "Chilled soda machine." : "Packaged snack machine." },
    children: soda ? [{ feetPosition: { x: 0.1, y: 0.38, z: -0.447 }, primitive: { kind: "box", width: 0.72, height: 1.32, depth: 0.01 }, material: { texture: soda ? SODA : SNACK, roughness: 0.15, emissive: "oklch(0.35 0 0)", emissiveIntensity: 0.4 } }] : [],
  });

  const tableSet = (id, x, z, yaw) => sp(id, { feetPosition: { x, y: 0, z }, rotation: { yaw }, physics: { body: "static", collider: "mesh" }, model: { id: M_TABLE, forward: "+z" } });
  const counter = (id, x, z, yaw, m, extra) => sp(id, { feetPosition: { x, y: 0, z }, rotation: { yaw }, physics: { body: "static", collider: "box" }, model: { id: m, forward: "+z" }, ...extra });

  // Chrome pedestal bar stool with circular padded leather seat and footrest
  const stool = (id, x, z, vinyl) => sp(id, {
    feetPosition: { x, y: 0, z },
    tags: ["seat", "chair"],
    physics: { body: "static", collider: "cylinder" },
    primitive: { kind: "cylinder", radiusTop: 0.24, radiusBottom: 0.26, height: 0.12 },
    material: STEEL,
    children: [
      { feetPosition: { x: 0, y: 0.1, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.035, radiusBottom: 0.035, height: 0.68 }, material: STEEL },
      { feetPosition: { x: 0, y: 0.28, z: 0 }, primitive: { kind: "torus", radius: 0.18, tube: 0.016 }, rotation: { pitch: 90 }, material: STEEL },
      { feetPosition: { x: 0, y: 0.72, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.26, radiusBottom: 0.26, height: 0.04 }, material: STEEL },
      { feetPosition: { x: 0, y: 0.76, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.27, radiusBottom: 0.25, height: 0.12 }, material: { color: vinyl, roughness: 0.4 } },
    ],
  });

  // Curved 1980s diner booth with red leather banquettes, formica table with chrome edging, and condiments
  const BOOTH_GLB = "/cdn/value.bc27142d58376e6d19cb25699d0a58a713302c81a9fc7f60a167c89f32831d20.glb" // tripo: red vinyl tufted booth, wood base
  const spawnBooth = (id, x, z, yaw) => sp(id, {
    feetPosition: { x, y: 0, z },
    rotation: { yaw },
    physics: { body: "static", collider: "box" },
    model: BOOTH_GLB,
    layout: { box: { min: { x: -1.1, y: 0, z: -0.9 }, max: { x: 1.1, y: 1.35, z: 0.9 } } },
    children: [
      { feetPosition: { x: 0, y: 2.5, z: 0 }, light: { kind: "point", color: "oklch(0.92 0.08 75)", intensity: 2.2, distance: 7 } },
      { feetPosition: { x: 0, y: 2.6, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.24, height: 0.16 }, material: { color: "#1e5238", roughness: 0.4 } },
    ],
  });

  // ---- The Hall: Terrazzo, cream plaster with teal and pink bands, drop ceiling with skylights
  box("l61-floor-w", -19, -0.3, 0, 24, 0.3, 2 * HD + 26, TERRAZZO);
  box("l61-floor-e", 19, -0.3, 0, 24, 0.3, 2 * HD + 26, TERRAZZO);
  box("l61-floor-n", 0, -0.3, -21, 14, 0.3, 28, TERRAZZO);
  box("l61-floor-s", 0, -0.3, 21, 14, 0.3, 28, TERRAZZO);

  for (const s of [-1, 1]) {
    box(`l61-step-z${s}`, 0, -0.6, s * 6.25, 14, 0.3, 1.5, { ...TERRAZZO, color: "oklch(0.8 0.04 350)" });
    box(`l61-step-x${s}`, s * 6.25, -0.6, 0, 1.5, 0.3, 11, { ...TERRAZZO, color: "oklch(0.8 0.04 190)" });
  }
  box("l61-pit-floor", 0, -0.9, 0, 11, 0.3, 11, { ...TERRAZZO, color: "oklch(0.55 0.1 30)" });
  box("l61-roof", 0, HH, 0, 2 * HW, 0.3, 2 * HD, CEIL);

  for (const [i, sx] of [-18, 0, 18].entries()) {
    for (const [j, sz] of [-9, 9].entries()) {
      const k = `${i}${j}`;
      box(`l61-sky-${k}`, sx, HH - 0.02, sz, 9, 0.05, 7, { color: "oklch(0.97 0.02 230)", emissive: "oklch(0.95 0.03 225)", emissiveIntensity: 1.3, roughness: 0.6 }, { physics: undefined });
      for (const m of [-1.5, 1.5]) box(`l61-skym-${k}-x${m}`, sx + m * 1.5, HH - 0.1, sz, 0.08, 0.08, 7, { color: "oklch(0.86 0.01 90)", metalness: 0.5, roughness: 0.4 }, { physics: undefined });
      box(`l61-skym-${k}-z`, sx, HH - 0.1, sz, 9, 0.08, 0.08, { color: "oklch(0.86 0.01 90)", metalness: 0.5, roughness: 0.4 }, { physics: undefined });
      for (const [n, f] of [[0, [0, -3.5, 9.4, 0.25]], [1, [0, 3.5, 9.4, 0.25]], [2, [-4.5, 0, 0.25, 7.2]], [3, [4.5, 0, 0.25, 7.2]]]) {
        box(`l61-skyf-${k}-${n}`, sx + f[0], HH - 0.2, sz + f[1], f[2], 0.2, f[3], { color: "oklch(0.86 0.01 90)", metalness: 0.5, roughness: 0.4 }, { physics: undefined });
      }
      light(`l61-skyl-${k}`, sx, HH - 0.6, sz, "oklch(0.98 0.03 85)", 9, 24);
    }
  }

  wallZ("l61-wn", -HD, -HW, HW, [[-21, 4, 3.2], [-7, 4, 3.2], [7, 4, 3.2], [21, 4, 3.2]], HH, PLASTER);
  wallZ("l61-ws", HD, -HW, HW, [[-14, 3, 3], [14, 2.2, 2.6]], HH, PLASTER);
  wallX("l61-ww", -HW, -HD, HD, [[0, 1.6, 2.3]], HH, PLASTER);
  wallX("l61-we", HW, -HD, HD, [[-9, 2.2, 2.7]], HH, PLASTER);

  // glossy tile wainscot under the bands, broken at every doorway; brass divider strips set in the terrazzo
  const wain = (id, along, fixed, a0, a1, holes) => {
    let a = a0, k = 0;
    for (const [c, w] of [...holes].sort((p, q) => p[0] - q[0])) { const l = c - w / 2; if (l > a) seg(a, l); a = c + w / 2; }
    if (a1 > a) seg(a, a1);
    function seg(u, v) { const m = (u + v) / 2, len = v - u; box(`${id}-${k++}`, along === "x" ? m : fixed, 0, along === "x" ? fixed : m, along === "x" ? len : 0.05, 1.0, along === "x" ? 0.05 : len, WAINSCOT, { physics: undefined }); }
  };
  wain("l61-wain-n", "x", -HD + 0.19, -HW + 0.2, HW - 0.2, [[-21, 4], [-7, 4], [7, 4], [21, 4]]);
  wain("l61-wain-s", "x", HD - 0.19, -HW + 0.2, HW - 0.2, [[-14, 3], [14, 2.2]]);
  wain("l61-wain-w", "z", -HW + 0.19, -HD + 0.2, HD - 0.2, [[0, 1.6], [-21, 0.01]]);
  wain("l61-wain-e", "z", HW - 0.19, -HD + 0.2, HD - 0.2, [[-9, 2.2]]);
  let bs = 0;
  for (let x = -28; x <= 28; x += 4) for (const [z0, z1] of (Math.abs(x) < 7.5 ? [[-HD, -7.2], [7.2, HD]] : [[-HD, HD]])) box(`l61-brass-${bs++}`, x, -0.003, (z0 + z1) / 2, 0.035, 0.006, z1 - z0, BRASS, { physics: undefined, receiveShadow: true });
  for (let z = -20; z <= 20; z += 4) for (const [x0, x1] of (Math.abs(z) < 7.5 ? [[-HW, -7.2], [7.2, HW]] : [[-HW, HW]])) box(`l61-brass-${bs++}`, (x0 + x1) / 2, -0.003, z, x1 - x0, 0.006, 0.035, BRASS, { physics: undefined, receiveShadow: true });

  for (const [n, y, c] of [[0, 1.0, "oklch(0.62 0.09 190)"], [1, 1.2, "oklch(0.74 0.11 350)"]]) {
    for (const s of [-1, 1]) box(`l61-band-z${n}${s}`, 0, y, s * (HD - 0.17), 2 * HW - 0.4, 0.12, 0.04, { color: c, roughness: 0.5 }, { physics: undefined });
    for (const s of [-1, 1]) box(`l61-band-x${n}${s}`, s * (HW - 0.17), y, 0, 0.04, 0.12, 2 * HD - 0.4, { color: c, roughness: 0.5 }, { physics: undefined });
  }

  for (let k = 0; k < 4; k++) {
    const z = -12 + k * 8, X = HW - 0.18, F = { color: "oklch(0.88 0.01 90)", metalness: 0.6, roughness: 0.35 }, np = { physics: undefined };
    box(`l61-win-${k}`, X, 1.55, z, 0.04, 2.1, 3.2, { color: "oklch(0.93 0.03 225)", emissive: "oklch(0.9 0.04 220)", emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.2 }, np);
    box(`l61-winf-${k}-t`, X - 0.04, 3.62, z, 0.1, 0.1, 3.4, F, np); box(`l61-winf-${k}-b`, X - 0.06, 1.42, z, 0.16, 0.12, 3.4, F, np);
    for (const dz of [-1.65, -0.55, 0.55, 1.65]) box(`l61-winf-${k}-m${dz}`, X - 0.04, 1.55, z + dz, 0.08, 2.1, 0.07, F, np);
    box(`l61-winf-${k}-h`, X - 0.04, 2.55, z, 0.06, 0.05, 3.3, F, np);
  }

  // ---- The Dining Court: Cozy curved diner booths along walls + center conversation pit
  // West perimeter curved booths
  spawnBooth("l61-booth-w0", -23, -12, 90);
  spawnBooth("l61-booth-w1", -23, 0, 90);
  spawnBooth("l61-booth-w2", -23, 12, 90);

  // East perimeter curved booths
  spawnBooth("l61-booth-e0", 23, -12, -90);
  spawnBooth("l61-booth-e1", 23, 0, -90);
  spawnBooth("l61-booth-e2", 23, 12, -90);

  // South perimeter curved booths
  spawnBooth("l61-booth-s0", -6, 15, 0);
  spawnBooth("l61-booth-s1", 6, 15, 0);

  // Intermediate dining tables scattered naturally in the court
  let t = 0;
  for (const [x, z] of [[-14, -13], [-14, -7], [-14, 7], [-14, 13], [14, -13], [14, -7], [14, 7], [14, 13], [-7, -13], [7, -13], [-7, 13], [7, 13]]) {
    tableSet(`l61-table-${t++}`, x, z, (x * 19 + z * 7) % 36);
  }

  // Conversation pit benches & central planter
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    sp(`l61-pbench-${k}`, { feetPosition: { x: Math.sin(a) * 4.4, y: -0.6, z: Math.cos(a) * 4.4 }, rotation: { yaw: (a * 180) / Math.PI }, physics: { body: "static", collider: "box" }, model: { id: M_BENCH, forward: "+z" } });
  }

  sp("l61-planter", {
    feetPosition: { x: 0, y: -0.6, z: 0 },
    physics: "static",
    primitive: { kind: "cylinder", radiusTop: 1.6, radiusBottom: 1.6, height: 0.7 },
    material: { color: "oklch(0.8 0.03 70)", roughness: 0.6 },
    children: [
      { feetPosition: { x: 0, y: 0.62, z: 0 }, primitive: { kind: "cylinder", radiusTop: 1.5, radiusBottom: 1.5, height: 0.06 }, material: { ...T("dark-potting-soil-with-bark-mulch", 1), color: "oklch(0.4 0.04 50)", roughness: 1 } },
      { feetPosition: { x: 0, y: 0.66, z: 0 }, primitive: { kind: "scripted", script: "scripts/tree61.js", params: { h: 4.6 }, seed: 61 }, material: { alphaTest: 0.5, side: "double", roughness: 0.55 } },
    ],
  });

  for (const [k, [x, z]] of [[-27, -18], [27, -18], [-27, 18], [27, 18], [-10, 19], [10, 19]].entries()) {
    sp(`l61-pot-${k}`, {
      feetPosition: { x, y: 0, z },
      physics: "static",
      primitive: { kind: "cylinder", radiusTop: 0.45, radiusBottom: 0.35, height: 0.6 },
      material: { color: "oklch(0.55 0.08 40)" },
      children: [{ feetPosition: { x: 0, y: 0.6, z: 0 }, primitive: { kind: "cone", radius: 0.5, height: 1.8 }, material: { color: "oklch(0.42 0.11 150)", roughness: 0.9 } }],
    });
  }

  // ceiling speakers across the hall, all on Heart 80s (Shelly's pick); a grille ring with a dark cone so it reads as a speaker
  const HEART = "https://media-ssl.musicradio.com/Heart80sMP3"
  const SPK = [[-20, -14], [0, -14], [20, -14], [-20, 0], [20, 0], [-20, 14], [0, 14], [20, 14]]
  for (const [k, [x, z]] of SPK.entries()) {
    sp(`l61-speaker-${k}`, {
      feetPosition: { x, y: HH - 0.08, z },
      primitive: { kind: "cylinder", radiusTop: 0.3, radiusBottom: 0.3, height: 0.05 },
      material: { color: "oklch(0.9 0.01 90)", roughness: 0.6 },
      children: [
        { feetPosition: { x: 0, y: -0.02, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.22, radiusBottom: 0.22, height: 0.03 }, material: { color: "oklch(0.32 0.01 90)", roughness: 0.9 } },
        { feetPosition: { x: 0, y: -0.03, z: 0 }, primitive: { kind: "torus", radius: 0.22, tube: 0.015 }, rotation: { pitch: 90 }, material: { color: "oklch(0.75 0.01 90)", metalness: 0.6, roughness: 0.4 } },
      ],
      audio: { clip: HEART, loop: true, gain: 0.07, spatial: true, maxDistance: 16, bus: "Music" },
    });
  }

  // ---- The Stores off North Wall
  const STORES = [
    [-21, "clippers", WOOD, "oklch(0.42 0.17 25)", `<div style="font-size:300px;color:#ffe0d0;font-family:serif;font-style:italic">Clippers</div><div style="font-size:90px;color:#ffb0a0">COCKTAILS · EST. 1954</div>`, "oklch(0.3 0.14 25)", "oklch(0.8 0.12 30)"],
    [-7, "liquorette", CHECK, "oklch(0.3 0.06 40)", `<div style="font-size:280px;color:#f2d98a;font-family:serif">Liquorette</div><div style="font-size:80px;color:#b8e0a8">BEER · WHISKEY · ALMOND WATER</div>`, "oklch(0.2 0.04 40)", "oklch(0.85 0.1 85)"],
    [7, "slice", { ...TERRAZZO, color: "oklch(0.85 0.04 30)" }, "oklch(0.9 0.03 90)", `<div style="font-size:250px;color:#ff4a3a">SLICE PALACE</div><div style="font-size:90px;color:#2a7a3a">PIZZA BY THE SLICE · FREE</div>`, "oklch(0.96 0.01 90)", "oklch(0.95 0.04 80)"],
    [21, "burger", CHECK, "oklch(0.7 0.11 195)", `<div style="font-size:260px;color:#ff7ab8">BURGER BOP</div><div style="font-size:90px;color:#ffffff">SHAKES · FRIES · '86 PRICES</div>`, "oklch(0.35 0.1 280)", "oklch(0.92 0.05 330)"],
  ];

  for (const [cx, k, floor, wall, html, bg, lc] of STORES) {
    const wm = { ...T("faded-cream-1980s-damask-vinyl-wallpaper-with-pinstripes", 0.7), color: wall, roughness: 0.7 }, z0 = -HD - 0.15, z1 = -HD - 10;
    box(`l61-${k}-floor`, cx, -0.29, (z0 + z1) / 2, 14, 0.3, 10, floor);
    box(`l61-${k}-roof`, cx, 4, (z0 + z1) / 2, 14, 0.3, 10, { ...CEIL, color: "oklch(0.88 0.01 90)" });
    box(`l61-${k}-back`, cx, 0, z1, 14, 4, 0.3, wm);
    box(`l61-${k}-wl`, cx - 7, 0, (z0 + z1) / 2, 0.3, 4, 10, wm);
    box(`l61-${k}-wr`, cx + 7, 0, (z0 + z1) / 2, 0.3, 4, 10, wm);
    box(`l61-${k}-front`, cx, 0, z0 - 0.3, 14, 4, 0.05, wm, { physics: undefined, visible: false });
    sign(`l61-${k}-sign`, cx, 3.6, -HD + 0.2, 180, 4.6, 1.4, html, bg);
    light(`l61-${k}-l0`, cx - 3, 3.5, -HD - 5, lc, 4, 12);
    light(`l61-${k}-l1`, cx + 3, 3.5, -HD - 5, lc, 4, 12);
  }

  // 1. Clippers: Red 1950s bar, stools, back shelves, and the interactive Wurlitzer 80s Internet Radio Jukebox
  counter("l61-clip-bar", -21, -30.2, 180, M_BAR10, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "budweiser,budweiser,jackcoke,whiskey,smirnoffice,coke", name: "Clippers bar", verb: "Order what the menu shows", info: "Clippers drink counter." } });
  for (let k = 0; k < 6; k++) stool(`l61-clip-stool-${k}`, -25 + k * 1.6, -29.2, "oklch(0.45 0.18 25)");
  for (const [n, y] of [[0, 1.4], [1, 2.0]]) {
    sp(`l61-clip-shelf-${n}`, {
      feetPosition: { x: -21, y, z: -31.6 },
      primitive: { kind: "box", width: 9, height: 0.05, depth: 0.3 },
      material: DARKWOOD,
      children: Array.from({ length: 16 }, (_, i) => ({
        feetPosition: { x: -4.2 + i * 0.56, y: 0.05, z: 0 },
        primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.05, height: 0.3 + ((i * 7) % 3) * 0.05 },
        material: { color: ["oklch(0.4 0.1 145)", "oklch(0.55 0.12 60)", "oklch(0.3 0.08 30)", "oklch(0.8 0.03 90)"][i % 4], roughness: 0.1, opacity: 0.85, transparent: true },
      })),
    });
  }

  // THE WURLITZER 80s INTERNET RADIO JUKEBOX in Clippers
  sp("l61-clip-jukebox", {
    feetPosition: { x: -26.4, y: 0, z: -25 },
    rotation: { yaw: -90 },
    physics: { body: "static", collider: "box" },
    model: { id: M_JUKE, forward: "+z" },
    tags: ["usable", "jukebox"],
    behavior: "scripts/l61-jukebox.js",
    audio: {
      clip: "https://media-ssl.musicradio.com/Heart80sMP3",
      gain: 0.75,
      loop: true,
      spatial: true,
      refDistance: 4.0,
      maxDistance: 48,
      bus: "Music",
    },
    state: {
      kind: "jukebox",
      name: "Wurlitzer jukebox",
      verb: "Pick a record",
      playing: true,
      stationIndex: 0,
      info: "1980s retro jukebox.",
      tint: "#ff3888",
    },
    ui: `<div face="front" width="0.75m" style="font-family:Arial,sans-serif;font-weight:900;background:#0d0d18;color:#ffffff;padding:12px;border:2px solid #ff3888;text-align:center;line-height:1.15;box-shadow:inset 0 0 15px rgba(255,255,255,0.2)">
      <div style="font-size:22px;color:#ff6bb0;letter-spacing:1px;margin-bottom:4px">★ NOW PLAYING ★</div>
      <div style="font-size:42px;color:#ffffff;font-weight:900;border-bottom:1px solid #ff3888;padding-bottom:4px;margin-bottom:6px">A1 · SIDE A</div>
      <div style="font-size:24px;color:#ff6bb0;margin-bottom:6px">POP HITS &amp; NEW WAVE</div>
      <div style="font-size:20px;color:#88ff88;letter-spacing:2px">● PLAYING ●</div>
      <div style="font-size:18px;color:#ffd700;margin-top:4px">[E: NEXT RECORD / OFF]</div>
    </div>`,
    children: [
      { feetPosition: { x: 0, y: 1.45, z: 0.5 }, light: { kind: "point", color: "oklch(0.72 0.26 340)", intensity: 4.8, distance: 16 } },
      { feetPosition: { x: 0, y: 1.82, z: 0.05 }, primitive: { kind: "torus", radius: 0.44, tube: 0.035 }, rotation: { pitch: 90 }, material: { color: "#ff2066", emissive: "#ff1860", emissiveIntensity: 3.0 } },
      { feetPosition: { x: 0, y: 1.82, z: 0.1 }, primitive: { kind: "torus", radius: 0.36, tube: 0.028 }, rotation: { pitch: 90 }, material: { color: "#00f0ff", emissive: "#00d8f0", emissiveIntensity: 3.0 } },
    ],
  });

  sign("l61-juke-neon", -26.4, 2.7, -25, -90, 1.9, 0.5, `<div style="font-size:68px;letter-spacing:2px;color:#00f0ff;text-shadow:0 0 12px #00d8f0">JUKEBOX HITS</div><div style="font-size:26px;color:#ff3888;text-shadow:0 0 10px #ff3888">80s INTERNET RADIO · LIVE</div>`, "rgba(10,12,20,0.85)");
  box("l61-clip-wire", -21, 0.06, -23.2, 3.6, 0.015, 0.015, { color: "oklch(0.2 0 0)" }, { physics: undefined });

  // 2. Liquorette: Long dark bar, glowing backbar, green glass lamps
  counter("l61-liq-bar", -12.2, -27, -90, M_BAR7, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "almond,corona,millerlite,margarita,whiskey,jackcoke", name: "Liquorette bar", verb: "Order what the menu shows", info: "Liquorette drink counter." } });
  counter("l61-liq-back", -13.6, -27, -90, M_BACKBAR);
  for (let k = 0; k < 3; k++) {
    sp(`l61-liq-lamp-${k}`, {
      feetPosition: { x: -11.6, y: 2.6, z: -29.5 + k * 2.5 },
      primitive: { kind: "sphere", radius: 0.18 },
      material: { color: "oklch(0.6 0.14 150)", emissive: "oklch(0.7 0.16 150)", emissiveIntensity: 1.5 },
      light: { kind: "point", color: "oklch(0.85 0.1 140)", intensity: 1.5, distance: 6 },
    });
  }
  for (let k = 0; k < 4; k++) tableSet(`l61-liq-table-${k}`, -6 + (k % 2) * 3.4, -25.5 - Math.floor(k / 2) * 3.4, k * 20);

  // 3. Slice Palace: Pizza warming case, oven, menu board, soda machine
  counter("l61-slice-counter", 7, -29.4, 180, M_PIZZA, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "pizza", name: "Slice Palace counter", verb: "Order what the menu shows", info: "Slice Palace pizza counter." } });
  counter("l61-slice-oven", 9.5, -31.3, 180, M_OVEN);
  sign("l61-slice-menu", 4.5, 2.2, -31.8, 180, 3.2, 1.2, `<div style="font-size:120px;color:#ffd84a">MENU</div><div style="font-size:70px;color:#fff">PEPPERONI · CHEESE · SUPREME</div><div style="font-size:60px;color:#9f9">ALL SLICES FREE · FACELING STAFF</div>`, "oklch(0.2 0.02 150)");
  vend("l61-slice-soda", 12.8, -25, 90, true);
  for (let k = 0; k < 2; k++) tableSet(`l61-slice-table-${k}`, 3 + k * 4, -25.5, 0);

  // 4. Burger Bop: Curved diner counter, sizzling grill, revolving stools, fresh coffee urn, cherry pie cloche & Chef Sal
  counter("l61-burger-counter", 21, -28.6, 180, M_DINER, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "burger", name: "Burger Bop counter", verb: "Order what the menu shows", info: "Burger Bop diner counter." } });
  counter("l61-burger-grill", 21, -31.3, 180, M_GRILL, { audio: { clip: "cdn/sfx-burgers-sizzling-on-flat-top-griddle-loop.mp3", loop: true, gain: 0.18, spatial: true, maxDistance: 11 } });
  for (let k = 0; k < 6; k++) stool(`l61-burger-stool-${k}`, 17 + k * 1.6, -27.5, "oklch(0.7 0.13 195)");
  vend("l61-burger-soda", 27.3, -25, 90, true);

  // Fresh hot coffee urn on the counter
  sp("l61-coffee-urn", {
    feetPosition: { x: 25.2, y: 0.95, z: -28.6 },
    tags: ["usable"],
    behavior: "scripts/l61-diner.js",
    physics: "static",
    primitive: { kind: "cylinder", radiusTop: 0.16, radiusBottom: 0.18, height: 0.46 },
    material: STEEL,
    state: {
      kind: "coffee",
      name: "Fresh Diner Coffee Urn",
      verb: "Pour a cup of hot coffee",
      info: "Piping hot diner coffee.",
      tint: "#f2d870",
    },
    children: [
      { feetPosition: { x: 0, y: 0.46, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.04, height: 0.06 }, material: { color: "#d4af37", metalness: 0.8 } },
      { feetPosition: { x: 0, y: 0.52, z: 0 }, fx: { script: STEAM_FX } },
    ],
  });

  // Fresh baked cherry pie cloche dome on the counter
  sp("l61-pie-stand", {
    feetPosition: { x: 16.8, y: 0.95, z: -28.6 },
    tags: ["usable"],
    behavior: "scripts/l61-diner.js",
    physics: "static",
    primitive: { kind: "cylinder", radiusTop: 0.22, radiusBottom: 0.06, height: 0.14 },
    material: STEEL,
    state: {
      kind: "pie",
      name: "Fresh Baked Pie & Donut Dome",
      verb: "Take a slice of warm pie",
      info: "Freshly baked cherry pie.",
      tint: "#ff88a0",
    },
    children: [
      { feetPosition: { x: 0, y: 0.14, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.18, radiusBottom: 0.18, height: 0.06 }, material: { color: "#c82030", roughness: 0.5 } },
      { feetPosition: { x: 0, y: 0.22, z: 0 }, primitive: { kind: "sphere", radius: 0.22, sq: [1, 1.2, 1] }, material: { color: "#ffffff", opacity: 0.35, transparent: true, roughness: 0.1 } },
      { feetPosition: { x: 0, y: 0.44, z: 0 }, primitive: { kind: "sphere", radius: 0.035 }, material: STEEL },
    ],
  });

  // Sal the Snackrooms Chef
  sp("l61-sal", {
    feetPosition: { x: 21.0, y: 0, z: -29.8 },
    rotation: { yaw: 0 },
    tags: ["npc", "diner-chef", "usable"],
    behavior: ["scripts/humanoid-locomotion.js", "scripts/l61-diner.js"],
    ...critterSpec(npcLook("l61-sal", { species: "cat", sex: "m", topw: "jacket", top: "#ffffff", botw: "pants", bottom: "#1a2430", shoes: "boots", shoec: "#181818", hat: "cap", hatc: "#ffffff", expr: "smile" }, "survivor", 15, "trader")),
    state: {
      kind: "sal",
      name: "Sal · The Snackrooms Chef",
      verb: "Talk to Sal",
      role: "chef",
      ...npcState(ctx, "survivor", 120),
    },
  });

  // ---- The South Vending Room (x: -22..-6)
  const vz0 = HD + 0.15, vz1 = HD + 10;
  box("l61-vend-roof", -14, 4, (vz0 + vz1) / 2, 16, 0.3, 10, CEIL);
  box("l61-vend-back", -14, 0, vz1, 16, 4, 0.3, PLASTER);
  box("l61-vend-wl", -22, 0, (vz0 + vz1) / 2, 0.3, 4, 10, PLASTER);
  box("l61-vend-wr", -6, 0, (vz0 + vz1) / 2, 0.3, 4, 10, PLASTER);
  sign("l61-vend-sign", -14, 3.4, HD - 0.2, 0, 3.6, 0.9, `<div style="font-size:140px;color:#ffffff">VENDING</div><div style="font-size:70px;color:#ffe08a">FREE · TAKE WHAT YOU NEED · M.E.G.</div>`, "oklch(0.35 0.12 260)");
  for (let k = 0; k < 7; k++) vend(`l61-vend-b${k}`, -20.5 + k * 2.1, vz1 - 0.6, 0, k % 2 === 1);
  for (let k = 0; k < 4; k++) vend(`l61-vend-l${k}`, -21.3, vz0 + 2 + k * 1.6, -90, k % 2 === 0);
  for (let k = 0; k < 3; k++) vend(`l61-vend-r${k}`, -6.7, vz0 + 2 + k * 1.6, 90, k !== 1);
  vend("l61-vend-pile0", -18.4, vz1 - 0.7, -8, false, { y: 1.85, dead: true, rot: { roll: 6 } });
  vend("l61-vend-pile1", -14.2, vz1 - 0.6, 6, true, { y: 1.85, dead: true });
  vend("l61-vend-fall", -8.4, vz1 - 1.8, 130, true, { y: 0.45, dead: true, rot: { pitch: 90 } });
  light("l61-vend-l0", -17, 3.6, HD + 5, "oklch(0.95 0.02 230)", 5, 12);
  light("l61-vend-l1", -11, 3.6, HD + 5, "oklch(0.95 0.02 230)", 5, 12);
  sp("l61-vend-hum", { feetPosition: { x: -14, y: 1.5, z: HD + 6 }, audio: { clip: G("vending-machine-compressor-hum-loop"), loop: true, gain: 0.15, spatial: true, maxDistance: 12 } });

  // ---- Restrooms (x: 8..20)
  const rz1 = HD + 8;
  box("l61-rest-floor", 14, -0.29, HD + 4, 12, 0.3, 8, { ...BATH, color: "oklch(0.85 0.01 220)" });
  box("l61-rest-roof", 14, 3.2, HD + 4, 12, 0.3, 8, CEIL);
  box("l61-rest-back", 14, 0, rz1, 12, 3.2, 0.3, BATH);
  box("l61-rest-wl", 8, 0, HD + 4, 0.3, 3.2, 8, BATH);
  box("l61-rest-wr", 20, 0, HD + 4, 0.3, 3.2, 8, BATH);
  sign("l61-rest-sign", 14, 2.75, HD - 0.2, 0, 1.6, 0.4, `<div style="font-size:150px;color:#fff">RESTROOMS</div>`, "oklch(0.4 0.09 230)");
  for (let k = 0; k < 4; k++) box(`l61-rest-stallw-${k}`, 14 + k * 1.6, 0.15, rz1 - 0.9, 0.05, 1.9, 1.6, { color: "oklch(0.7 0.06 200)", metalness: 0.3, roughness: 0.4 });
  for (let k = 0; k < 3; k++) box(`l61-rest-door-${k}`, 14.8 + k * 1.6, 0.15, rz1 - 1.7, 1.4, 1.9, 0.04, { color: "oklch(0.7 0.06 200)", metalness: 0.3, roughness: 0.4 }, { physics: undefined, rotation: { yaw: k === 1 ? 35 : 0 } });
  box("l61-rest-sinks", 9.0, 0, HD + 4, 0.6, 0.85, 5, { color: "oklch(0.9 0.01 90)", roughness: 0.2 });
  box("l61-rest-mirror", 8.2, 1.2, HD + 4, 0.03, 1.1, 5, { color: "oklch(0.85 0.01 230)", metalness: 1, roughness: 0.05 }, { physics: undefined });
  light("l61-rest-l", 14, 2.9, HD + 4, "oklch(0.97 0.01 220)", 4, 10);

  // ---- Exits and Outposts
  // Rusty steel door to Level 6 with M.E.G. outpost
  box("l61-meg-door", -HW + 0.2, 0, 0, 0.1, 2.2, 1.5, RUST, { physics: undefined });
  // the outpost: framed steel door, enamel plate, booth, barrier arm, sandbags, fence, desk, crates
  {
    const X = -HW, OLIVE = { color: "oklch(0.38 0.05 125)", roughness: 0.85 }, SAND = { ...T("rough-burlap-sack-weave", 2), color: "oklch(0.64 0.05 80)", roughness: 1 };
    const PAINT = { color: "oklch(0.32 0.02 140)", metalness: 0.5, roughness: 0.6 }, PLY = { ...T("worn-plywood-sheet", 1), color: "oklch(0.62 0.06 70)", roughness: 0.9 };
    const nf = { physics: undefined };
    // door frame, push bar, kick plate
    box("l61-meg-jamb-a", X + 0.2, 0, -0.85, 0.22, 2.35, 0.14, PAINT); box("l61-meg-jamb-b", X + 0.2, 0, 0.85, 0.22, 2.35, 0.14, PAINT);
    box("l61-meg-head", X + 0.2, 2.2, 0, 0.22, 0.16, 1.84, PAINT);
    box("l61-meg-bar", X + 0.3, 1.0, 0, 0.06, 0.06, 1.1, STEEL, nf); box("l61-meg-kick", X + 0.26, 0.02, 0, 0.02, 0.28, 1.4, STEEL, nf);
    // enamel plate: cream steel, stencilled, four bolts, a rust bleed
    sp("l61-meg-sign", { feetPosition: { x: X + 0.18, y: 2.5, z: 0 }, rotation: { yaw: -90 }, primitive: { kind: "box", width: 1.7, height: 0.62, depth: 0.02 }, material: { color: "oklch(0.9 0.03 90)", metalness: 0.3, roughness: 0.55 },
      ui: `<div face="front" width="1.7m" style="width:1700px;height:620px;box-sizing:border-box;border:22px solid #8a1c14;outline:6px solid #e9e1c8;outline-offset:-40px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Courier New',monospace;font-weight:700;color:#1d1b17;background:linear-gradient(180deg,rgba(0,0,0,0) 70%,rgba(110,60,20,.25) 100%)"><div style="font-size:66px;letter-spacing:10px;color:#8a1c14">M.E.G. · RESTRICTED</div><div style="font-size:120px;letter-spacing:6px;margin:6px 0">LEVEL 6</div><div style="font-size:40px;letter-spacing:4px">NO ENTRY WITHOUT CLEARANCE</div><div style="position:absolute;left:46px;top:46px;width:26px;height:26px;border-radius:50%;background:#5c5850"></div><div style="position:absolute;right:46px;top:46px;width:26px;height:26px;border-radius:50%;background:#5c5850"></div><div style="position:absolute;left:46px;bottom:46px;width:26px;height:26px;border-radius:50%;background:#5c5850"></div><div style="position:absolute;right:46px;bottom:46px;width:26px;height:26px;border-radius:50%;background:#5c5850"></div></div>` });
    // caged bulb over the door
    box("l61-meg-cage", X + 0.35, 3.25, 0, 0.18, 0.2, 0.18, { color: "oklch(0.2 0 0)", metalness: 0.7, roughness: 0.5 }, nf);
    sp("l61-meg-bulb", { feetPosition: { x: X + 0.4, y: 3.2, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.09 70)", intensity: 3, distance: 9 } });
    // yellow-black hazard line on the terrazzo
    for (let i = 0; i < 16; i++) box(`l61-meg-haz-${i}`, X + 3.6, 0.005, -3.75 + i * 0.5, 0.25, 0.01, 0.5, { color: i % 2 ? "oklch(0.2 0 0)" : "oklch(0.8 0.16 90)", roughness: 0.7 }, nf);
    // sandbag walls either side of the lane, three rows, staggered
    for (const sd of [-1, 1]) for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
      const z = sd * (1.35 + i * 0.55 + (r % 2) * 0.27);
      if (Math.abs(z) > 3.6) continue;
      sp(`l61-meg-bag-${sd}-${r}-${i}`, { feetPosition: { x: X + 3.1 + (r % 2) * 0.04, y: 0.12 + r * 0.21, z }, rotation: { pitch: 90, yaw: 4 * Math.sin(i * 3 + r) }, primitive: { kind: "capsule", radius: 0.12, halfHeight: 0.16 }, scale: { x: 1.5, y: 1, z: 0.85 }, material: SAND, physics: r === 0 ? { body: "static", collider: "box" } : undefined });
    }
    // barrier arm: striped pole on a post, lowered half across
    box("l61-meg-armpost", X + 4.2, 0, -1.6, 0.18, 1.0, 0.18, PAINT);
    for (let i = 0; i < 6; i++) box(`l61-meg-arm-${i}`, X + 4.2, 0.92, -1.35 + i * 0.25, 0.07, 0.07, 0.25, { color: i % 2 ? "oklch(0.95 0.01 90)" : "oklch(0.5 0.2 27)", roughness: 0.5 }, nf);
    // guard booth: plywood, window band, roof, lamp inside
    const bx0 = X + 1.6, bz0 = -5.6;
    box("l61-meg-booth-b", bx0, 0, bz0 - 0.9, 2.2, 2.3, 0.08, PLY); box("l61-meg-booth-l", bx0 - 1.1, 0, bz0, 0.08, 2.3, 1.8, PLY); box("l61-meg-booth-r", bx0 + 1.1, 0, bz0, 0.08, 2.3, 1.8, PLY);
    box("l61-meg-booth-f", bx0, 0, bz0 + 0.9, 2.2, 1.05, 0.08, PLY); box("l61-meg-booth-ft", bx0, 1.95, bz0 + 0.9, 2.2, 0.35, 0.08, PLY);
    box("l61-meg-booth-glass", bx0, 1.05, bz0 + 0.9, 2.1, 0.9, 0.02, { color: "oklch(0.85 0.02 200 / 0.25)", transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1 }, nf);
    box("l61-meg-booth-roof", bx0, 2.3, bz0, 2.4, 0.08, 2.0, PAINT);
    box("l61-meg-booth-sill", bx0, 1.02, bz0 + 0.98, 2.2, 0.04, 0.22, PLY, nf);
    sp("l61-meg-booth-lamp", { feetPosition: { x: bx0, y: 2.1, z: bz0 }, light: { kind: "point", color: "oklch(0.9 0.06 80)", intensity: 2, distance: 5 } });
    // desk: logbook, clipboard, radio crackling, mug, folding chair
    box("l61-meg-desk", X + 2.4, 0, 4.2, 1.4, 0.74, 0.7, { color: "oklch(0.5 0.01 250)", metalness: 0.6, roughness: 0.5 });
    box("l61-meg-log", X + 2.2, 0.74, 4.1, 0.32, 0.03, 0.24, { color: "oklch(0.35 0.08 25)", roughness: 0.8 }, nf);
    box("l61-meg-clip", X + 2.7, 0.74, 4.3, 0.22, 0.012, 0.3, { color: "oklch(0.55 0.05 60)" }, nf);
    sp("l61-meg-radio", { feetPosition: { x: X + 2.9, y: 0.74, z: 4.0 }, primitive: { kind: "box", width: 0.18, height: 0.24, depth: 0.08 }, material: { color: "oklch(0.18 0 0)", roughness: 0.6 },
      audio: { clip: G("military-handheld-radio-static-chatter-squelch-loop"), loop: true, gain: 0.08, spatial: true, maxDistance: 7 } });
    box("l61-meg-mug", X + 1.9, 0.74, 4.35, 0.08, 0.1, 0.08, { color: "oklch(0.9 0.01 90)" }, nf);
    box("l61-meg-chair-s", X + 2.4, 0.42, 4.95, 0.42, 0.04, 0.42, PAINT, nf); box("l61-meg-chair-b", X + 2.4, 0.46, 5.15, 0.42, 0.45, 0.04, PAINT, nf);
    // olive crates stacked by the wall
    box("l61-meg-crate-0", X + 0.6, 0, 3.2, 0.9, 0.55, 0.6, OLIVE); box("l61-meg-crate-1", X + 0.6, 0.55, 3.25, 0.8, 0.5, 0.55, OLIVE); box("l61-meg-crate-2", X + 0.6, 0, 4.0, 0.9, 0.55, 0.6, OLIVE);
    // corkboard with pinned notices
    box("l61-meg-cork", X + 0.17, 1.3, 3.6, 0.03, 0.8, 1.1, { color: "oklch(0.55 0.07 60)", roughness: 1 }, nf);
    [[3.3, 1.75, "CLEARANCE LIST"], [3.75, 1.65, "ESCORT ONLY"], [3.5, 1.4, "MISSING"], [3.9, 1.4, "SHIFT ROTA"]].forEach(([z, y, t], k) =>
      sp(`l61-meg-note-${k}`, { feetPosition: { x: X + 0.19, y, z }, rotation: { yaw: -90, roll: (k % 2 ? 3 : -4) }, primitive: { kind: "box", width: 0.26, height: 0.32, depth: 0.004 }, material: { color: "oklch(0.95 0.02 95)", roughness: 1 },
        ui: `<div face="front" width="0.26m" style="width:260px;height:320px;padding:14px;box-sizing:border-box;font-family:'Courier New',monospace;color:#2a2622;font-size:22px;font-weight:700">${t}<div style="margin-top:12px;height:3px;background:#3335"></div><div style="margin-top:14px;height:3px;background:#3335"></div><div style="margin-top:14px;height:3px;background:#3335;width:70%"></div><div style="margin-top:14px;height:3px;background:#3335;width:85%"></div></div>` }));
    // chain-link fence runs: posts, top and mid rails
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 3; i++) box(`l61-meg-fp-${sd}-${i}`, X + 1.0 + i * 1.4, 0, sd * 7.0, 0.06, 2.0, 0.06, STEEL);
      box(`l61-meg-fr-${sd}`, X + 2.4, 1.95, sd * 7.0, 2.9, 0.04, 0.04, STEEL, nf); box(`l61-meg-fm-${sd}`, X + 2.4, 1.0, sd * 7.0, 2.9, 0.04, 0.04, STEEL, nf);
      box(`l61-meg-mesh-${sd}`, X + 2.4, 0.05, sd * 7.0, 2.8, 1.9, 0.01, { texture: "cdn/texture-chain-link-fence-galvanized-diamond-mesh.png", repeat: [5, 3], wrap: "repeat", transparent: true, alphaTest: 0.4, metalness: 0.6, roughness: 0.5 });
    }
  }
  sp("l61-meg-scream", { feetPosition: { x: -HW + 0.5, y: 1.2, z: 0 }, audio: { clip: G("distant-muffled-screaming-behind-heavy-steel-door-loop"), loop: true, gain: 0.12, spatial: true, maxDistance: 9 } });
  sp("l61-to-l6", { tags: ["door"], feetPosition: { x: -HW + 0.45, y: 0, z: 0 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.5, height: 2.2, depth: 1.4 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level6#l6-from-l61" } });
  sp("l61-from-l6", { feetPosition: { x: -20.5, y: 1.4, z: -26.2 }, rotation: { yaw: 0 } }); // the tripwire drops you into Clippers, the red bar 6.1 was found in

  // East suction vent to Level 3
  box("l61-vent", HW - 0.2, 0.15, 8, 0.1, 0.7, 1.1, { color: "oklch(0.25 0.005 250)", metalness: 0.6, roughness: 0.5 }, {
    physics: undefined,
    children: Array.from({ length: 6 }, (_, i) => ({ feetPosition: { x: -0.06, y: 0.06 + i * 0.1, z: 0 }, primitive: { kind: "box", width: 0.03, height: 0.03, depth: 1.05 }, material: STEEL })),
    audio: { clip: G("strong-air-suction-whistle-through-metal-vent-loop"), loop: true, gain: 0.14, spatial: true, maxDistance: 6 },
  });
  sp("l61-vent-in", { tags: ["door"], feetPosition: { x: HW - 0.4, y: 0, z: 8 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.5, height: 0.9, depth: 1.0 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level3" } });

  // Spawn arrivals
  sp("l61-arrive", { feetPosition: { x: 0, y: 0.1, z: 14 }, rotation: { yaw: 0 } });
  sp("l61-from-l4", { feetPosition: { x: -14, y: 0.1, z: 18.5 }, rotation: { yaw: 0 } });

  // Extra mall features: mirror ball, banners, swaying palms, sliding glass doors to Level 11, Blue Channel wall
  layExtra(ctx, { HW, HD, HH });

  sign("l61-welcome", 0, 3.8, HD - 0.2, 0, 5, 1.0, `<div style="font-size:150px;color:#ff7ab8;font-style:italic">The Snackrooms</div><div style="font-size:70px;color:#5ad8e0">EAT · DRINK · STAY AS LONG AS YOU LIKE</div>`, "oklch(0.22 0.06 280)");
}

export function tick(ctx) {
  const st = ctx.place.state;
  if ((st.builtV ?? 0) < V) {
    lay(ctx);
    st.builtV = V;
    st.crewV = 0;
  }
  if ((st.crewV ?? 0) < 1) {
    st.crewV = 1;
    for (const id of FACELING_IDS) faceling(ctx, id);
    for (const id of PEOPLE) person(ctx, id);
  }
  keepPeople(ctx, PEOPLE, person);

  // Sanctuary effect: The Snackrooms restores player sanity and health over time
  const now = ctx.now();
  if (now - (st.sanctuaryAt ?? 0) > 3500) {
    st.sanctuaryAt = now;
    for (const p of ctx.place.players) {
      if (!p.state) continue;
      const curSan = p.state.sanity ?? 80;
      if (curSan < 100) p.state.sanity = Math.min(100, curSan + 3);
      const curHp = p.state.hp ?? 80;
      if (curHp < (p.state.maxHp ?? 100)) p.state.hp = Math.min(p.state.maxHp ?? 100, curHp + 1);
    }
  }
}
