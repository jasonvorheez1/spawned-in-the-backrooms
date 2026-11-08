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
const V = 45;
const M_TABLE = "/cdn/value.37bc916755294f1e83c29bbcb3a608074b6069e8c1dc9a683f1e9bbfaedbd705.glb"; // art/l61-table/build.py + turn.py: chairs pushed out, seats facing the table
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
const MOSAIC = { ...T("blue-and-grey-victorian-mosaic-floor-tiles-with-diamond-pattern", 0.5), color: "oklch(0.7 0.03 250)", roughness: 0.35 };
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
// Liquorette's tavern set (art/liquorette/build.py): front is +Y in Blender, so forward "-z"
const L_BACK = "/cdn/value.a187daf06bff17c55643ef0aac588b4e96b9c44c4945786fa799a31f2af8f47d.glb", L_BAR = "/cdn/value.5a499eb1ef735837567954e269e9ad617fae6023a287348669deccdac310175d.glb";
const L_STOOL = "/cdn/value.0bbf170e907b58d9b64bfe662e63bede4a9e6a6195ea676256b89545252b6b67.glb", L_CHAIR = "/cdn/value.99cd616ba78a4e1c69efcdc0ef0050d8da906cecb5c558e97c79adfd2a3a6ab2.glb";
const L_TABLE = "/cdn/value.33a726ced14757e5e3948ed28a5fea36e2dec90fbdeb755fcfe483434e6e6eb5.glb", L_BOILER = "/cdn/value.8ea6672f48e73b727ed727651d920b8505a90819258f886d4df6f23da68d7f30.glb";
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
  const BOOTH_GLB = "/cdn/value.16e718586e8a4ad9bc8fee6f9deb9a8a0783a3d7735609809865f55591915948.glb" // art/l61-booth/build.py: tripo booth, benches slid out from the table
  // sit spots read off the build (booth-local x, z; the sitter faces the table): the side bench and the back bench
  const BOOTH_SEATS = [{ k: "a", x: -0.76, z: 0.47, yaw: -90, w: 2, gap: 0.55 }, { k: "b", x: 0.56, z: -0.59, yaw: 180, w: 2, gap: 0.62 }];
  const spawnBooth = (id, x, z, yaw) => { boothSeats(id, x, z, yaw); return boothBody(id, x, z, yaw); };
  const boothSeats = (id, x, z, yaw) => { const r = (yaw * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); for (const b of BOOTH_SEATS) sp(`${id}-seat-${b.k}`, { feetPosition: { x: x + b.x * c + b.z * s, y: 0, z: z - b.x * s + b.z * c }, rotation: { yaw: yaw + b.yaw }, tags: ["seat"], state: { seat: { w: b.w, gap: b.gap, d: 0.04, y: 0.28 }, verb: "Sit", name: "Diner booth" } }); };
  const boothBody = (id, x, z, yaw) => sp(id, {
    feetPosition: { x, y: 0, z },
    rotation: { yaw },
    physics: { body: "static", collider: "box" },
    model: BOOTH_GLB,
    layout: { box: { min: { x: -1.264, y: 0, z: -1.042 }, max: { x: 1.264, y: 1.35, z: 1.042 } } },
    children: [
      { feetPosition: { x: 0, y: 2.5, z: 0 }, light: { kind: "point", color: "oklch(0.92 0.08 75)", intensity: 2.2, distance: 7 } },
      { feetPosition: { x: 0, y: 2.6, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.24, height: 0.16 }, material: { color: "#1e5238", roughness: 0.4 } },
    ],
  });

  // ---- The Hall: Continuous polished terrazzo, brass expansion joints, drop ceiling with skylights
  box("l61-floor-main", 0, -0.3, 0, 2 * HW + 12, 0.3, 2 * HD + 26, TERRAZZO);
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
  for (let x = -28; x <= 28; x += 4) for (const [z0, z1] of (Math.abs(x) < 5.8 ? [[-HD, -6.2], [6.2, HD]] : [[-HD, HD]])) box(`l61-brass-${bs++}`, x, -0.003, (z0 + z1) / 2, 0.035, 0.006, z1 - z0, BRASS, { physics: undefined, receiveShadow: true });
  for (let z = -20; z <= 20; z += 4) for (const [x0, x1] of (Math.abs(z) < 5.8 ? [[-HW, -6.2], [6.2, HW]] : [[-HW, HW]])) box(`l61-brass-${bs++}`, (x0 + x1) / 2, -0.003, z, x1 - x0, 0.006, 0.035, BRASS, { physics: undefined, receiveShadow: true });

  // the two trim bands follow the wainscot: broken at every doorway, never across one
  const DOORS = { "z-1": [[-21, 4], [-7, 4], [7, 4], [21, 4]], "z1": [[-14, 3], [14, 2.2]], "x-1": [[0, 1.6]], "x1": [[-9, 2.2]] };
  for (const [n, y, c] of [[0, 1.0, "oklch(0.62 0.09 190)"], [1, 1.2, "oklch(0.74 0.11 350)"]]) {
    for (const [ax, sg] of [["z", -1], ["z", 1], ["x", -1], ["x", 1]]) {
      const half = ax === "z" ? HW : HD, fixed = sg * ((ax === "z" ? HD : HW) - 0.17);
      let a = -half + 0.2, k = 0;
      const seg = (u, v) => { const m = (u + v) / 2, len = v - u; if (len < 0.05) return; box(`l61-band-${ax}${n}${sg}-${k++}`, ax === "z" ? m : fixed, y, ax === "z" ? fixed : m, ax === "z" ? len : 0.04, 0.12, ax === "z" ? 0.04 : len, { color: c, roughness: 0.5 }, { physics: undefined }); };
      for (const [cc, w] of [...DOORS[ax + sg]].sort((p, q) => p[0] - q[0])) { const l = cc - w / 2; if (l > a) seg(a, l); a = Math.max(a, cc + w / 2); }
      if (half - 0.2 > a) seg(a, half - 0.2);
    }
  }

  for (let k = 0; k < 4; k++) {
    const z = -12 + k * 8, X = HW - 0.18, F = { color: "oklch(0.88 0.01 90)", metalness: 0.6, roughness: 0.35 }, np = { physics: undefined };
    // a modelled sash window (art/l61-window/build.py): casing, two sashes of three lites, deep sill; warm glass + daylight spill
    sp(`l61-win-${k}`, { feetPosition: { x: X - 0.14, y: 1.3, z }, rotation: { yaw: -90 }, model: { id: "/cdn/value.1955fac0b54d9d89e37c8561ef6c6ceed252e01659f6e154d655cc7213ea7e16.glb", forward: "+z", materials: { Glass: { color: "oklch(0.95 0.05 75)", emissive: "oklch(0.93 0.07 70)", emissiveIntensity: 1.5, roughness: 0.1 } } },
      children: [{ feetPosition: { x: 0, y: 1.2, z: 0 }, light: { kind: "rect", color: "oklch(0.93 0.07 70)", intensity: 2.2, width: 3.0, height: 1.9, aim: "forward" } }] });
  }

  // ---- Central Fountain & Garden Rotunda (The Main Centerpiece at 0, 0)
  // Outer circular marble retaining wall & rounded brass coping
  sp("l61-rotunda-wall", {
    feetPosition: { x: 0, y: 0, z: 0 },
    physics: { body: "static", collider: "cylinder" },
    primitive: { kind: "cylinder", radiusTop: 4.6, radiusBottom: 4.8, height: 0.52 },
    material: { ...TERRAZZO, color: "oklch(0.92 0.02 85)", roughness: 0.3 },
  });
  sp("l61-rotunda-rim", {
    feetPosition: { x: 0, y: 0.52, z: 0 },
    rotation: { pitch: 90 },
    primitive: { kind: "torus", radius: 4.65, tube: 0.045 },
    material: BRASS,
    physics: undefined,
  });
  // Circular polished honey-oak seating ledge around the rotunda rim
  sp("l61-rotunda-bench", {
    feetPosition: { x: 0, y: 0.44, z: 0 },
    rotation: { pitch: 90 },
    primitive: { kind: "torus", radius: 4.88, tube: 0.11 },
    material: WOOD,
    physics: undefined,
  });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    sp(`l61-rotunda-seat-${k}`, {
      feetPosition: { x: Math.sin(a) * 4.9, y: 0, z: Math.cos(a) * 4.9 },
      rotation: { yaw: (a * 180) / Math.PI + 180 },
      tags: ["seat", "chair"],
      state: { seat: { w: 1.2, d: 0.3, y: 0.44 }, verb: "Sit by the fountain", name: "Fountain ledge" },
    });
  }
  // Soft teal under-glow beneath seating overhang
  sp("l61-rotunda-glow", {
    feetPosition: { x: 0, y: 0.12, z: 0 },
    rotation: { pitch: 90 },
    primitive: { kind: "torus", radius: 4.5, tube: 0.02 },
    material: { color: "oklch(0.8 0.14 195)", emissive: "oklch(0.8 0.14 195)", emissiveIntensity: 2.2, roughness: 0.3 },
    physics: undefined,
  });

  // Concentric brass floor inlay ring & geometric quadrant medallions on the terrazzo
  sp("l61-rotunda-inlay-ring", {
    feetPosition: { x: 0, y: 0.004, z: 0 },
    rotation: { pitch: 90 },
    primitive: { kind: "torus", radius: 5.4, tube: 0.02 },
    material: BRASS,
    physics: undefined,
  });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    sp(`l61-medallion-${i}`, {
      feetPosition: { x: Math.sin(a) * 5.7, y: 0.003, z: Math.cos(a) * 5.7 },
      rotation: { yaw: (a * 180) / Math.PI + 45 },
      primitive: { kind: "box", width: 0.9, height: 0.005, depth: 0.9 },
      material: { ...TERRAZZO, color: i % 2 === 0 ? "oklch(0.65 0.1 190)" : "oklch(0.72 0.12 350)" },
      physics: undefined,
    });
  }

  // Inner pool basin: aquatic mosaic floor, rippling water, underwater spotlights, wishing coins
  sp("l61-pool-floor", {
    feetPosition: { x: 0, y: 0.04, z: 0 },
    primitive: { kind: "cylinder", radiusTop: 4.25, radiusBottom: 4.25, height: 0.04 },
    material: { ...MOSAIC, color: "oklch(0.72 0.06 215)", roughness: 0.3 },
    physics: undefined,
  });
  sp("l61-pool-water", {
    feetPosition: { x: 0, y: 0.40, z: 0 },
    primitive: { kind: "cylinder", radiusTop: 4.25, radiusBottom: 4.25, height: 0.02 },
    material: { kind: "water", color: "oklch(0.82 0.08 200)", opacity: 0.74, roughness: 0.08, waveIntensity: 0.06 },
    physics: undefined,
  });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    sp(`l61-pool-light-${k}`, {
      feetPosition: { x: Math.sin(a) * 2.8, y: 0.15, z: Math.cos(a) * 2.8 },
      light: { kind: "point", color: "oklch(0.85 0.14 195)", intensity: 3.5, distance: 8, shadow: { enabled: false } },
    });
  }
  const COIN_BRASS = { color: "oklch(0.78 0.12 85)", metalness: 0.95, roughness: 0.2 };
  const COIN_COPPER = { color: "oklch(0.65 0.14 45)", metalness: 0.9, roughness: 0.25 };
  const COINS = [
    [1.8, 1.2, 0], [-2.1, 1.5, 1], [0.8, -2.4, 0], [-1.4, -1.9, 1],
    [2.4, -1.1, 0], [-0.7, 2.6, 1], [2.2, 2.0, 1], [-2.5, -0.9, 0],
    [0.4, 1.9, 0], [-1.9, 0.7, 1], [1.5, -1.8, 1], [-0.5, -2.8, 0]
  ];
  COINS.forEach(([cx, cz, ct], i) => {
    sp(`l61-coin-${i}`, {
      feetPosition: { x: cx, y: 0.045, z: cz },
      primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.04, height: 0.006 },
      material: ct === 0 ? COIN_BRASS : COIN_COPPER,
      physics: undefined,
    });
  });

  // Central fluted pedestal & upper overflow spill basin with weeping fig tree
  sp("l61-fountain-pedestal", {
    feetPosition: { x: 0, y: 0, z: 0 },
    physics: { body: "static", collider: "cylinder" },
    primitive: { kind: "cylinder", radiusTop: 1.5, radiusBottom: 1.65, height: 0.95 },
    material: { ...TERRAZZO, color: "oklch(0.94 0.02 85)", roughness: 0.25 },
    children: [
      { feetPosition: { x: 0, y: 0.45, z: 0 }, primitive: { kind: "torus", radius: 1.58, tube: 0.035 }, rotation: { pitch: 90 }, material: BRASS },
    ],
  });
  sp("l61-fountain-bowl", {
    feetPosition: { x: 0, y: 0.95, z: 0 },
    primitive: { kind: "cylinder", radiusTop: 1.85, radiusBottom: 1.45, height: 0.38 },
    material: BRASS,
    children: [
      { feetPosition: { x: 0, y: 0.38, z: 0 }, primitive: { kind: "torus", radius: 1.86, tube: 0.04 }, rotation: { pitch: 90 }, material: BRASS },
      { feetPosition: { x: 0, y: 0.34, z: 0 }, primitive: { kind: "cylinder", radiusTop: 1.78, radiusBottom: 1.78, height: 0.02 }, material: { kind: "water", color: "oklch(0.85 0.09 200)", opacity: 0.8, waveIntensity: 0.08 } },
      { feetPosition: { x: 0, y: 0.36, z: 0 }, primitive: { kind: "cylinder", radiusTop: 1.3, radiusBottom: 1.3, height: 0.08 }, material: { ...T("dark-potting-soil-with-bark-mulch", 1), color: "oklch(0.38 0.04 50)", roughness: 1 } },
      { feetPosition: { x: 0, y: 0.42, z: 0 }, primitive: { kind: "scripted", script: "scripts/tree61.js", params: { h: 4.8 }, seed: 61 }, material: { alphaTest: 0.5, side: "double", roughness: 0.55 } },
    ],
  });
  const FOUNTAIN_FX = `fx
pop spray rate=12 on=ring(1.3,1.7) life=.7..1.2 v=up(.7..1.2)+sdir()*.18 size=.03..0.06 acc=grav() floor=die col=<.75,.9,1> a=0>.6:1>.8:.8>0 sz=$size r=sprite(soft-disc,alpha)
pop mist rate=5 on=ring(1.2,1.6) life=1.2..2.0 v=up(.3)+sdir()*.1 size=.1..0.22 col=<.85,.95,1> a=0>.4:.2>.4:.8>0 sz=$size*(.8>1.8) r=sprite(smoke-puff,alpha)`;
  sp("l61-fountain-spray", {
    feetPosition: { x: 0, y: 1.32, z: 0 },
    fx: { script: FOUNTAIN_FX },
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-calm-sea-water-lapping-against-small-wooden-boat-hull-loop.mp3", loop: true, gain: 0.18, spatial: true, maxDistance: 18 },
  });

  // 4 Outer promenade curved benches & fluted ficus planters facing outward from the rotunda
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const bx = Math.sin(a) * 6.0, bz = Math.cos(a) * 6.0;
    sp(`l61-fountain-bench-${k}`, {
      feetPosition: { x: bx, y: 0, z: bz },
      rotation: { yaw: (a * 180) / Math.PI + 180 },
      physics: { body: "static", collider: "box" },
      model: { id: M_BENCH, forward: "+z" },
    });
    for (const side of [-1, 1]) {
      const pAngle = a + side * 0.22;
      const px = Math.sin(pAngle) * 5.85, pz = Math.cos(pAngle) * 5.85;
      sp(`l61-fountain-pot-${k}-${side}`, {
        feetPosition: { x: px, y: 0, z: pz },
        physics: "static",
        primitive: { kind: "cylinder", radiusTop: 0.38, radiusBottom: 0.30, height: 0.58 },
        material: BRASS,
        children: [
          { feetPosition: { x: 0, y: 0.55, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.35, radiusBottom: 0.35, height: 0.05 }, material: { ...T("dark-potting-soil-with-bark-mulch", 1), color: "oklch(0.38 0.04 50)", roughness: 1 } },
          { feetPosition: { x: 0, y: 0.58, z: 0 }, primitive: { kind: "scripted", script: "scripts/tree61.js", params: { h: 2.2 }, seed: 70 + k * 2 + (side > 0 ? 1 : 0) }, material: { alphaTest: 0.5, side: "double", roughness: 0.55 } },
        ],
      });
    }
  }

  // ---- The Dining Terraces: West Bistro & East Fast-Casual Wings
  // Perimeter curved diner booths
  spawnBooth("l61-booth-w0", -23, -12, 90);
  spawnBooth("l61-booth-w1", -23, 0, 90);
  spawnBooth("l61-booth-w2", -23, 12, 90);
  spawnBooth("l61-booth-e0", 23, -12, -90);
  spawnBooth("l61-booth-e1", 23, 0, -90);
  spawnBooth("l61-booth-e2", 23, 12, -90);
  spawnBooth("l61-booth-s0", -6, 15, 0);
  spawnBooth("l61-booth-s1", 6, 15, 0);

  // Booth privacy dividers along West & East walls
  for (const bz of [-6, 6]) {
    sp(`l61-booth-divider-w-${bz}`, {
      feetPosition: { x: -23.0, y: 0, z: bz },
      physics: { body: "static", collider: "box" },
      primitive: { kind: "box", width: 0.14, height: 1.45, depth: 2.4 },
      material: DARKWOOD,
      children: [
        { feetPosition: { x: 0, y: 1.45, z: 0 }, primitive: { kind: "box", width: 0.08, height: 0.75, depth: 2.2 }, material: { color: "oklch(0.85 0.04 70 / 0.4)", transparent: true, opacity: 0.45, roughness: 0.2 } },
        { feetPosition: { x: 0, y: 2.22, z: 0 }, primitive: { kind: "box", width: 0.14, height: 0.06, depth: 2.4 }, material: BRASS },
      ],
    });
    sp(`l61-booth-divider-e-${bz}`, {
      feetPosition: { x: 23.0, y: 0, z: bz },
      physics: { body: "static", collider: "box" },
      primitive: { kind: "box", width: 0.14, height: 1.45, depth: 2.4 },
      material: WOOD,
      children: [
        { feetPosition: { x: 0, y: 1.45, z: 0 }, primitive: { kind: "box", width: 0.08, height: 0.75, depth: 2.2 }, material: { color: "oklch(0.85 0.04 70 / 0.4)", transparent: true, opacity: 0.45, roughness: 0.2 } },
        { feetPosition: { x: 0, y: 2.22, z: 0 }, primitive: { kind: "box", width: 0.14, height: 0.06, depth: 2.4 }, material: BRASS },
      ],
    });
  }

  // 14 Sensibly positioned Dining Tables
  const DINING_TABLES = [
    // West Dining Terrace (Bistro & Lounge)
    [-16.5, -13.5, 15],
    [-12.0, -8.5, -20],
    [-16.5, -5.0, 0],
    [-16.5, 5.0, 10],
    [-12.0, 8.5, -15],
    [-16.5, 13.5, 25],
    // East Dining Terrace (Fast-Casual Family)
    [16.5, -13.5, -10],
    [12.0, -8.5, 15],
    [16.5, -5.0, -5],
    [16.5, 5.0, 20],
    [12.0, 8.5, -10],
    [16.5, 13.5, 10],
    // North Quick-Bite tables
    [-7.5, -14.0, 0],
    [7.5, -14.0, 0],
  ];
  DINING_TABLES.forEach(([tx, tz, tyaw], idx) => {
    tableSet(`l61-table-${idx}`, tx, tz, tyaw);
  });

  // West Lounge: 2 High-Top Cocktail Tables near Clippers with chrome swivel barstools
  const HIGH_TOPS = [
    [-19.5, -19.0],
    [-15.0, -19.0],
  ];
  HIGH_TOPS.forEach(([hx, hz], hi) => {
    sp(`l61-hightop-${hi}`, {
      feetPosition: { x: hx, y: 0, z: hz },
      physics: { body: "static", collider: "cylinder" },
      primitive: { kind: "cylinder", radiusTop: 0.55, radiusBottom: 0.55, height: 0.05 },
      material: DARKWOOD,
      children: [
        { feetPosition: { x: 0, y: -0.55, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.05, height: 1.0 }, material: STEEL },
        { feetPosition: { x: 0, y: -1.03, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.32, radiusBottom: 0.34, height: 0.04 }, material: STEEL },
        { feetPosition: { x: 0, y: 0.03, z: 0 }, primitive: { kind: "torus", radius: 0.54, tube: 0.02 }, rotation: { pitch: 90 }, material: BRASS },
      ],
    });
    stool(`l61-hightop-stool-${hi}-0`, hx - 0.72, hz, "oklch(0.45 0.18 25)");
    stool(`l61-hightop-stool-${hi}-1`, hx + 0.72, hz, "oklch(0.45 0.18 25)");
  });

  // Suspended Frosted Opal Sphere Pendant Lights over dining clusters
  const PENDANT_SPOTS = [
    [-16.5, -13.5], [-12.0, -8.5], [-16.5, -5.0],
    [-16.5, 5.0], [-12.0, 8.5], [-16.5, 13.5],
    [16.5, -13.5], [12.0, -8.5], [16.5, -5.0],
    [16.5, 5.0], [12.0, 8.5], [16.5, 13.5],
  ];
  PENDANT_SPOTS.forEach(([lx, lz], li) => {
    sp(`l61-pendant-${li}`, {
      feetPosition: { x: lx, y: 3.1, z: lz },
      primitive: { kind: "sphere", radius: 0.22 },
      material: { color: "oklch(0.96 0.02 85)", emissive: "oklch(0.92 0.08 75)", emissiveIntensity: 1.4, roughness: 0.2 },
      light: { kind: "point", color: "oklch(0.92 0.08 75)", intensity: 2.2, distance: 7, shadow: { enabled: false } },
      children: [
        { feetPosition: { x: 0, y: 0.21, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.07, height: 0.08 }, material: BRASS },
        { feetPosition: { x: 0, y: 0.29, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: HH - 3.4 }, material: { color: "oklch(0.18 0 0)" } },
      ],
    });
  });

  // ---- Authentic Food Court Amenities
  // 1. Central 3-Sided Illuminated Mall Directory & Map Lightbox Kiosk at (0, 8.5)
  sp("l61-directory-kiosk", {
    feetPosition: { x: 0, y: 0, z: 8.5 },
    rotation: { yaw: 0 },
    physics: { body: "static", collider: "cylinder" },
    primitive: { kind: "cylinder", radiusTop: 0.85, radiusBottom: 0.9, height: 2.4 },
    material: { color: "oklch(0.25 0.01 250)", metalness: 0.7, roughness: 0.35 },
    tags: ["usable"],
    behavior: "scripts/l61-use.js",
    state: { kind: "directory", name: "Mall Directory & Map", verb: "Inspect directory", info: "Illuminated 3-sided directory kiosk.", tint: "#ffd84a" },
    ui: `<div face="front" width="1.4m" style="width:1400px;height:2200px;box-sizing:border-box;padding:40px 30px;background:#0d1217;color:#f0f4f8;font-family:Arial,sans-serif;border:16px solid #d4af37;border-radius:12px;text-align:center;display:flex;flex-direction:column;justify-content:space-between">
      <div style="background:#162432;border:4px solid #5ad8e0;padding:24px 16px;border-radius:8px">
        <div style="font-size:74px;font-weight:900;letter-spacing:4px;color:#ff7ab8">LEVEL 6.1 DIRECTORY</div>
        <div style="font-size:36px;color:#5ad8e0;margin-top:6px;letter-spacing:2px">THE SNACKROOMS · SANCTUARY</div>
      </div>
      <div style="margin:20px 0;padding:20px;background:#141a20;border:2px dashed #445566;border-radius:6px;text-align:left">
        <div style="font-size:42px;font-weight:bold;color:#ffd84a;margin-bottom:14px">DINING &amp; LIBATIONS [NORTH]</div>
        <div style="font-size:32px;color:#ffe0d0;margin-bottom:8px">✦ CLIPPERS · Red 50s Bar &amp; Live 80s Jukebox</div>
        <div style="font-size:32px;color:#f2d98a;margin-bottom:8px">✦ LIQUORETTE · Tavern, Stained Glass &amp; Almond Water</div>
        <div style="font-size:32px;color:#ff8a7a;margin-bottom:8px">✦ SLICE PALACE · Pizza Warming Case &amp; Oven</div>
        <div style="font-size:32px;color:#ff9ad0;margin-bottom:8px">✦ BURGER BOP · Griddle, Shakes &amp; Chef Sal</div>
        <div style="font-size:42px;font-weight:bold;color:#7affb0;margin:18px 0 10px">SANCTUARY AMENITIES</div>
        <div style="font-size:32px;color:#e8f4f8;margin-bottom:8px">✦ RESTROOMS &amp; VENDING · South Hall Wing</div>
        <div style="font-size:32px;color:#88e0ff;margin-bottom:8px">✦ LEVEL 11 RESTAURANT · Automatic Glass Doors [East]</div>
        <div style="font-size:32px;color:#ffaa50;margin-bottom:8px">✦ M.E.G. CHECKPOINT · Level 6 Access Outpost [West]</div>
      </div>
      <div style="background:#281618;border:3px solid #ff4a4a;padding:16px;border-radius:6px">
        <div style="font-size:34px;font-weight:900;color:#ff6b6b">★ YOU ARE HERE · ALL FOOD &amp; DRINK FREE ★</div>
        <div style="font-size:26px;color:#cccccc;margin-top:4px">Rest safely. Entity 9 Faceling staff are non-hostile.</div>
      </div>
    </div>`,
    children: [
      { feetPosition: { x: 0, y: 2.4, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.95, radiusBottom: 0.95, height: 0.08 }, material: BRASS },
      { feetPosition: { x: 0, y: 2.2, z: 0.8 }, light: { kind: "point", color: "oklch(0.95 0.05 85)", intensity: 2.4, distance: 5 } },
    ],
  });

  // 2. Dual Waste & Tray Return stations with Stainless Condiment Pump Carousels
  for (const [side, sx] of [[-1, -8.8], [1, 8.8]]) {
    sp(`l61-waste-condiment-${side}`, {
      feetPosition: { x: sx, y: 0, z: -1.0 },
      rotation: { yaw: side > 0 ? -90 : 90 },
      physics: { body: "static", collider: "box" },
      primitive: { kind: "box", width: 1.4, height: 1.05, depth: 0.75 },
      material: DARKWOOD,
      tags: ["usable"],
      behavior: "scripts/l61-use.js",
      state: { kind: "condiment", name: "Condiment & Waste Station", verb: "Pump ketchup or mustard", line: "PUMP SQUIRT! (Extra Heinz & French's on your napkin)", tint: "#ff4a3a" },
      children: [
        { feetPosition: { x: 0, y: 1.05, z: 0 }, primitive: { kind: "box", width: 1.42, height: 0.04, depth: 0.77 }, material: STEEL },
        { feetPosition: { x: 0, y: 1.09, z: -0.32 }, primitive: { kind: "box", width: 1.42, height: 0.45, depth: 0.12 }, material: DARKWOOD },
        { feetPosition: { x: -0.35, y: 0.5, z: 0.38 }, primitive: { kind: "box", width: 0.52, height: 0.42, depth: 0.02 }, material: { color: "oklch(0.35 0.08 40)", roughness: 0.6 } },
        { feetPosition: { x: 0.35, y: 0.5, z: 0.38 }, primitive: { kind: "box", width: 0.52, height: 0.42, depth: 0.02 }, material: { color: "oklch(0.35 0.08 40)", roughness: 0.6 } },
        { feetPosition: { x: -0.42, y: 1.09, z: 0.05 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.18 }, material: STEEL, children: [
          { feetPosition: { x: 0, y: 0.18, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.02, height: 0.08 }, material: { color: "#c82020", roughness: 0.3 } },
        ] },
        { feetPosition: { x: -0.22, y: 1.09, z: 0.05 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.18 }, material: STEEL, children: [
          { feetPosition: { x: 0, y: 0.18, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.02, height: 0.08 }, material: { color: "#d8a810", roughness: 0.3 } },
        ] },
        { feetPosition: { x: -0.02, y: 1.09, z: 0.05 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.18 }, material: STEEL, children: [
          { feetPosition: { x: 0, y: 0.18, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.02, height: 0.08 }, material: { color: "#288830", roughness: 0.3 } },
        ] },
        { feetPosition: { x: 0.28, y: 1.09, z: 0.05 }, primitive: { kind: "box", width: 0.16, height: 0.22, depth: 0.14 }, material: STEEL, children: [
          { feetPosition: { x: 0, y: 0.04, z: 0.072 }, primitive: { kind: "box", width: 0.12, height: 0.06, depth: 0.01 }, material: { color: "#f8f8f8", roughness: 0.9 } },
        ] },
        { feetPosition: { x: 0, y: 1.54, z: -0.32 }, primitive: { kind: "box", width: 0.5, height: 0.08, depth: 0.35 }, material: { color: "#8a2020", roughness: 0.5 } },
      ],
    });
  }

  // 3. Retro South Wall Chrome Payphone Bank at (5.0, HD - 0.25)
  sp("l61-payphone-bank", {
    feetPosition: { x: 5.0, y: 0, z: HD - 0.25 },
    rotation: { yaw: 0 },
    physics: { body: "static", collider: "box" },
    primitive: { kind: "box", width: 2.6, height: 2.2, depth: 0.5 },
    material: { color: "oklch(0.3 0.02 240)", metalness: 0.7, roughness: 0.3 },
    tags: ["usable"],
    behavior: "scripts/l61-use.js",
    state: { kind: "payphone", name: "Public Payphones", verb: "Pick up receiver", tint: "#9fe8ff" },
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-radio-click-static-burst.mp3", gain: 0.04, loop: true, spatial: true, maxDistance: 4 },
    children: [
      { feetPosition: { x: -0.85, y: 0.7, z: 0.25 }, primitive: { kind: "box", width: 0.04, height: 1.4, depth: 0.45 }, material: STEEL },
      { feetPosition: { x: 0, y: 0.7, z: 0.25 }, primitive: { kind: "box", width: 0.04, height: 1.4, depth: 0.45 }, material: STEEL },
      { feetPosition: { x: 0.85, y: 0.7, z: 0.25 }, primitive: { kind: "box", width: 0.04, height: 1.4, depth: 0.45 }, material: STEEL },
      ...[-0.55, 0.42].flatMap((px) => [
        { feetPosition: { x: px, y: 1.1, z: 0.26 }, primitive: { kind: "box", width: 0.32, height: 0.65, depth: 0.16 }, material: STEEL },
        { feetPosition: { x: px, y: 1.25, z: 0.345 }, primitive: { kind: "box", width: 0.18, height: 0.18, depth: 0.02 }, material: { color: "#111111", roughness: 0.5 } },
        { feetPosition: { x: px - 0.12, y: 1.18, z: 0.36 }, primitive: { kind: "capsule", radius: 0.035, halfHeight: 0.14 }, material: { color: "#151515", roughness: 0.4 } },
      ]),
      { feetPosition: { x: 0, y: 2.22, z: 0.25 }, primitive: { kind: "box", width: 2.5, height: 0.3, depth: 0.06 }, material: { color: "oklch(0.2 0.08 240)" },
        ui: `<div face="front" width="2.5m" style="width:2500px;height:300px;display:flex;align-items:center;justify-content:center;background:#0c1e38;color:#9fe8ff;font-family:Arial,sans-serif;font-weight:900;letter-spacing:6px"><span style="font-size:110px">PUBLIC PHONES</span></div>` },
    ],
  });

  // Corner Planters: Realistic weeping fig ficus trees in fluted pots
  for (const [k, [x, z]] of [[-27, -18], [27, -18], [-27, 18], [27, 18], [-10, 19], [10, 19]].entries()) {
    sp(`l61-pot-${k}`, {
      feetPosition: { x, y: 0, z },
      physics: "static",
      primitive: { kind: "cylinder", radiusTop: 0.48, radiusBottom: 0.38, height: 0.65 },
      material: { color: "oklch(0.55 0.08 40)", roughness: 0.6 },
      children: [
        { feetPosition: { x: 0, y: 0.62, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.45, radiusBottom: 0.45, height: 0.06 }, material: { ...T("dark-potting-soil-with-bark-mulch", 1), color: "oklch(0.38 0.04 50)", roughness: 1 } },
        { feetPosition: { x: 0, y: 0.65, z: 0 }, primitive: { kind: "torus", radius: 0.48, tube: 0.03 }, rotation: { pitch: 90 }, material: BRASS },
        { feetPosition: { x: 0, y: 0.68, z: 0 }, primitive: { kind: "scripted", script: "scripts/tree61.js", params: { h: 3.2 }, seed: 80 + k * 3 }, material: { alphaTest: 0.5, side: "double", roughness: 0.55 } },
      ],
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
    [-7, "liquorette", MOSAIC, "oklch(0.26 0.075 28)", `<div style="font-size:280px;color:#f2d98a;font-family:serif">Liquorette</div><div style="font-size:80px;color:#b8e0a8">BEER · WHISKEY · ALMOND WATER</div>`, "oklch(0.2 0.04 40)", "oklch(0.85 0.1 85)"],
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
  for (let k = 0; k < 5; k++) stool(`l61-clip-stool-${k}`, -25 + k * 2.0, -29.2, "oklch(0.45 0.18 25)");
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

  // 2. Liquorette: an old-world tavern. A carved arched back bar with stained glass and a clock, a long panelled bar with a brass rail, bentwood stools and chairs,
  //    wooden tables, a mosaic floor, wood-panelled walls, a coffered ceiling, pendant lamps, a copper boiler. (Shelly: massively overhaul it from a photo of an old bar)
  const prop = (id, m, x, z, yaw, extra = {}, y = 0) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, physics: { body: "static", collider: extra.collider ?? "box" }, model: { id: m, forward: "-z" }, ...extra.spec });
  prop("l61-liq-bar", L_BAR, -11.8, -27, -90, { spec: { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "almond,corona,millerlite,margarita,whiskey,jackcoke", name: "Liquorette bar", verb: "Order what the menu shows", info: "Liquorette drink counter." } } });
  prop("l61-liq-back", L_BACK, -13.45, -27, -90);
  prop("l61-liq-boiler", L_BOILER, -12.1, -29.75, -90, { collider: "cylinder" }, 1.1);
  sp("l61-liq-boiler-steam", { feetPosition: { x: -12.1, y: 2.35, z: -29.75 }, fx: { script: STEAM_FX } });
  for (let k = 0; k < 6; k++) sp(`l61-liq-stool-${k}`, { feetPosition: { x: -10.85, y: 0, z: -29.55 + k * 1.05 }, rotation: { yaw: 90 }, tags: ["seat", "chair"], physics: { body: "static", collider: "cylinder" }, model: { id: L_STOOL, forward: "-z" }, state: { seat: { w: 1, d: 0.0, y: 0.62 }, verb: "Sit", name: "Bar stool" } });
  const TABLES = [[-6.6, -25.2], [-2.6, -25.2], [-6.6, -29.2], [-2.6, -29.2]];
  TABLES.forEach(([tx, tz], k) => {
    sp(`l61-liq-table-${k}`, { feetPosition: { x: tx, y: 0, z: tz }, rotation: { yaw: k * 17 }, physics: { body: "static", collider: "box" }, model: { id: L_TABLE, forward: "-z" } });
    for (const [dx, yaw, n] of [[-0.78, -90, "w"], [0.78, 90, "e"]]) sp(`l61-liq-chair-${k}${n}`, { feetPosition: { x: tx + dx, y: 0, z: tz + (k % 2 ? 0.05 : -0.05) }, rotation: { yaw }, tags: ["seat", "chair"], physics: { body: "static", collider: "box" }, model: { id: L_CHAIR, forward: "-z" }, state: { seat: { w: 1, d: 0.02, y: 0.3 }, verb: "Sit", name: "Tavern chair" } });
    sp(`l61-liq-candle-${k}`, { feetPosition: { x: tx + 0.05, y: 0.86, z: tz + 0.05 }, light: { kind: "point", color: "oklch(0.85 0.16 70)", intensity: 0.9, distance: 3.5 }, primitive: { kind: "sphere", radius: 0.012 }, material: { color: "#ffcc66", emissive: "#ffb040", emissiveIntensity: 4 } });
  });
  // wood-panelled walls: a dado of dark wood with a brass-edged rail, round the back and both sides (the open side faces the hall)
  const dado = (id, x, z, w, d) => { box(id, x, 0, z, w, 1.25, d, DARKWOOD); box(`${id}-rail`, x, 1.25, z, w + (d < w ? 0 : 0.06), 0.07, d + (d < w ? 0.06 : 0), WOOD); };
  dado("l61-liq-dado-b", -7, -31.86, 13.6, 0.1); dado("l61-liq-dado-l", -13.82, -27.1, 0.1, 9.7); dado("l61-liq-dado-r", -0.18, -27.1, 0.1, 9.7);
  // a coffered ceiling: dark beams across the plaster
  box("l61-liq-ceil", -7, 3.88, -27.1, 13.7, 0.12, 9.8, { color: "oklch(0.22 0.04 30)", roughness: 0.8 });
  for (let k = 0; k < 5; k++) box(`l61-liq-beam-${k}`, -12 + k * 3, 3.7, -27.1, 0.22, 0.2, 9.8, DARKWOOD, { physics: undefined });
  for (let k = 0; k < 3; k++) box(`l61-liq-xbeam-${k}`, -7, 3.7, -23.9 - k * 3.2, 13.7, 0.2, 0.2, DARKWOOD, { physics: undefined });
  // pendant lamps on short cords: warm glass globes over the bar and the tables
  [[-10.2, -29.2], [-10.2, -27], [-10.2, -24.8], [-6.6, -25.2], [-2.6, -25.2], [-6.6, -29.2], [-2.6, -29.2]].forEach(([lx, lz], k) => {
    box(`l61-liq-cord-${k}`, lx, 3.0, lz, 0.015, 0.7, 0.015, { color: "oklch(0.15 0 0)" }, { physics: undefined });
    sp(`l61-liq-lamp-${k}`, { feetPosition: { x: lx, y: 2.78, z: lz }, primitive: { kind: "sphere", radius: 0.16 }, material: { color: "oklch(0.92 0.1 80)", emissive: "oklch(0.8 0.14 70)", emissiveIntensity: 1.1, roughness: 0.2 }, light: { kind: "point", color: "oklch(0.8 0.14 62)", intensity: 1.5, distance: 6 } });
  });
  // the stained glass throws its own green-gold glow over the bar
  sp("l61-liq-glass-glow", { feetPosition: { x: -12.6, y: 3.0, z: -27 }, light: { kind: "point", color: "oklch(0.86 0.15 120)", intensity: 3, distance: 7 } });
  // a back door into the dark, a lamp glowing over it, tin signs and portraits on the walls
  box("l61-liq-door", -2.6, 0, -31.92, 1.3, 2.3, 0.1, { color: "oklch(0.1 0.02 30)", roughness: 0.9 });
  box("l61-liq-doorf-l", -3.32, 0, -31.86, 0.14, 2.45, 0.2, DARKWOOD); box("l61-liq-doorf-r", -1.88, 0, -31.86, 0.14, 2.45, 0.2, DARKWOOD); box("l61-liq-doorf-t", -2.6, 2.3, -31.86, 1.58, 0.16, 0.2, DARKWOOD);
  sp("l61-liq-doorlamp", { feetPosition: { x: -2.6, y: 2.75, z: -31.7 }, primitive: { kind: "sphere", radius: 0.1 }, material: { color: "#ffb347", emissive: "#ff9a2a", emissiveIntensity: 3 }, light: { kind: "point", color: "oklch(0.8 0.17 55)", intensity: 2.6, distance: 5 } });
  sign("l61-liq-tin", -5.2, 1.8, -31.85, 0, 0.75, 0.75, `<div style="width:92%;height:92%;border-radius:50%;background:#b3231d;border:14px solid #e8d8b0;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:92px;color:#f2e6c0;font-family:serif">ALMOND</div><div style="font-size:84px;color:#f2e6c0;font-family:serif">WATER</div></div>`, "oklch(0.2 0.04 40)");
  sign("l61-liq-portrait", -0.3, 1.9, -26.5, -90, 0.9, 1.1, `<div style="font-size:70px;color:#d8c9a0;font-family:serif;font-style:italic;text-align:center">The<br>Proprietor</div><div style="font-size:36px;color:#9a8a68;font-family:serif;margin-top:10px">EST. 1954</div>`, "oklch(0.14 0.03 40)");
  sign("l61-liq-hours", -0.3, 1.9, -29.2, -90, 0.9, 0.6, `<div style="font-size:64px;color:#f2d98a;font-family:serif">OPEN</div><div style="font-size:30px;color:#b8e0a8;font-family:serif">ALL HOURS · NO TAB</div>`, "oklch(0.14 0.04 30)");
  sp("l61-liq-murmur", { feetPosition: { x: -7, y: 1.5, z: -27 }, audio: { clip: "cdn/sfx-quiet-tavern-murmur-with-glasses-clinking-room-tone-loop.mp3", loop: true, gain: 0.16, spatial: true, maxDistance: 12 } });

  // 3. Slice Palace: Pizza warming case, oven, menu board, soda machine
  counter("l61-slice-counter", 7, -29.4, 180, M_PIZZA, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "pizza", name: "Slice Palace counter", verb: "Order what the menu shows", info: "Slice Palace pizza counter." } });
  counter("l61-slice-oven", 9.5, -31.3, 180, M_OVEN);
  sign("l61-slice-menu", 4.5, 2.2, -31.8, 180, 3.2, 1.2, `<div style="font-size:120px;color:#ffd84a">MENU</div><div style="font-size:70px;color:#fff">PEPPERONI · CHEESE · SUPREME</div><div style="font-size:60px;color:#9f9">ALL SLICES FREE · FACELING STAFF</div>`, "oklch(0.2 0.02 150)");
  vend("l61-slice-soda", 12.8, -25, 90, true);
  for (let k = 0; k < 2; k++) tableSet(`l61-slice-table-${k}`, 3 + k * 4, -25.5, 0);

  // 4. Burger Bop: Curved diner counter, sizzling grill, revolving stools, fresh coffee urn, cherry pie cloche & Chef Sal
  counter("l61-burger-counter", 21, -28.6, 180, M_DINER, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "burger", name: "Burger Bop counter", verb: "Order what the menu shows", info: "Burger Bop diner counter." } });
  counter("l61-burger-grill", 21, -31.3, 180, M_GRILL, { audio: { clip: "cdn/sfx-burgers-sizzling-on-flat-top-griddle-loop.mp3", loop: true, gain: 0.18, spatial: true, maxDistance: 11 } });
  for (let k = 0; k < 5; k++) stool(`l61-burger-stool-${k}`, 17 + k * 2.0, -27.5, "oklch(0.7 0.13 195)");
  vend("l61-burger-soda", 27.3, -25, 90, true);

  // Fresh hot coffee urn on the counter
  sp("l61-coffee-urn", {
    feetPosition: { x: 25.2, y: 1.05, z: -28.6 },
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
    feetPosition: { x: 16.8, y: 1.05, z: -28.6 },
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
