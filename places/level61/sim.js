// Level 6.1 "The Snackrooms" (backrooms-wiki.wikidot.com/level-6-1): an endless 1980s mall food court under skylights that show only black, lit like daylight anyway.
// Navy cafeteria tables, snack bars from every era (Clippers, the 1950s red bar where it was found; Liquorette; Slice Palace; Burger Bop), a room of vending machines piled
// on each other, restrooms. Everything is free (scripts/l61-use.js, scripts/lib/data/snacks.yml). Ways out: the M.E.G.-guarded rusty steel door to Level 6, the vent that sucks you to Level 3.
// Ways in: the tripwire in Level 6, a vending machine on Level 4. Hall x -30..30, z -22..22, roof 6 m; stores 14 wide, 10 deep off the north wall.
import { layExtra, faceling, person, PEOPLE, FACELING_IDS } from "../../scripts/lib/level61-extra.js";
import { keepPeople } from "../../scripts/lib/level-kit.js";
export const cadence = "1s";
const V = 7;
const M_TABLE = "/cdn/value.5c13c3baf678446267c70befcd2ff0bc5fcb6627960162c3ef037241bae2eeb5.glb", M_VEND = "/cdn/value.4eab9e798b9d50b4a15a489b3ef9281b80533de62f779d90a920e866c8f73942.glb", M_STOOL = "/cdn/value.aafae0e5ed4c77675ec12a25bb3f8eac5c887ceaf6219d322cd50996a57e1552.glb"; // art/snackrooms/build.py
const SNACK = "/cdn/value.50b5fa3844cf9c705ca675660ef22ddb556c1cf0f31ad1cd69deeb8d8395df71.png", SODA = "/cdn/value.4db3afe09f392fef7c9d80e531484862384aef0ea5bcba295dc62b57197b659f.png";
const T = (name, rep) => ({ texture: `cdn/texture-${name}.png`, repeat: [rep, rep], wrap: "repeat" });
const TERRAZZO = { ...T("polished-cream-terrazzo-mall-floor-with-flecks", 0.3), color: "oklch(0.9 0.02 80)", roughness: 0.35 };
const PLASTER = { ...T("cream-painted-plaster-wall", 0.5), color: "oklch(0.93 0.02 85)", roughness: 0.85 };
const CEIL = { ...T("acoustic-drop-ceiling-tiles-water-stained", 0.4), color: "oklch(0.95 0.01 90)" };
const WOOD = { ...T("worn-hardwood-grain", 0.6), color: "oklch(0.55 0.08 55)", roughness: 0.6 };
const DARKWOOD = { ...T("worn-hardwood-grain", 0.6), color: "oklch(0.3 0.05 40)", roughness: 0.5 };
const CHECK = { ...T("black-and-white-checkerboard-vinyl-floor-tiles", 0.5), roughness: 0.4 };
const BATH = { ...T("white-square-ceramic-bathroom-wall-tiles", 1), color: "oklch(0.95 0.01 220)", roughness: 0.3 };
const STEEL = { color: "oklch(0.7 0.01 250)", metalness: 0.8, roughness: 0.3 };
const NAVY = { color: "oklch(0.3 0.1 262)", roughness: 0.45 };
const RUST = { ...T("scratched-worn-steel", 1), color: "oklch(0.42 0.06 45)", metalness: 0.6, roughness: 0.7 };
const M_BAR10 = "/cdn/value.f3a001b67df5932f6ab0edbee786a4fea656bbdcc4bb95fe0f8f89c834188b40.glb";
const M_BAR7 = "/cdn/value.602e0fd20886f20e7f9d268884aef45fc50293aee2da336124007503cceab7d6.glb";
const M_DINER = "/cdn/value.631d37b72621a949554ab06521366b4f7678149304b4c5ace1bc3159e9c132e8.glb";
const M_PIZZA = "/cdn/value.5c22a5f388991c20883c8482eda6ba0363d6e555148ac75b329dc228b4f20dc5.glb";
const M_OVEN = "/cdn/value.22485741e0731ddfcae9cc3ac5261175b727fc9dad7e75df605b3d3ac7091a95.glb", M_GRILL = "/cdn/value.52e8c951e79935129fcfb50a305e01a547c4ea962c25fb44339c09ac673636a4.glb", M_JUKE = "/cdn/value.eb676c37706ec7e4c3e6457d46b4a565b82fc50d9cb775ec70525a1fe3fcad67.glb", M_BACKBAR = "/cdn/value.d8c593de7c7b1406024e79601baece61757017658bcaf7b9bbd6da42ea716075.glb"; // art/snackrooms/kitchen.py
const M_BENCH = "/cdn/value.875f7fd721e70ac1c285cdade96da8263dc175c97f593282732e00ef66d72b83.glb";
const MUSIC = "cdn/music-upbeat-1980s-shopping-mall-synth-pop-soft-rock-through-ceiling-speakers-loop.mp3";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const HW = 30, HD = 22, HH = 6;

function lay(ctx) {
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l61-/.test(id) && !id.includes("/")) ctx.destroy(id);
  const sp = (id, spec) => ctx.spawn(id, spec);
  const box = (id, x, y, z, w, h, d, material, extra = {}) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, physics: "static", ...extra });
  const light = (id, x, y, z, color, intensity, distance) => sp(id, { feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance, shadow: { enabled: false } } });
  // a wall along x at z, from x0 to x1, with door holes [centre, width, height]; the header above each hole closes it to h
  const wallZ = (id, z, x0, x1, holes, h, mat, t = 0.3) => {
    let a = x0; holes.sort((p, q) => p[0] - q[0]).forEach(([c, w, hh], k) => { const l = c - w / 2; if (l > a) box(`${id}-${k}`, (a + l) / 2, 0, z, l - a, h, t, mat); box(`${id}-${k}h`, c, hh, z, w, h - hh, t, mat); a = c + w / 2; });
    if (x1 > a) box(`${id}-e`, (a + x1) / 2, 0, z, x1 - a, h, t, mat);
  };
  const wallX = (id, x, z0, z1, holes, h, mat, t = 0.3) => {
    let a = z0; holes.sort((p, q) => p[0] - q[0]).forEach(([c, w, hh], k) => { const l = c - w / 2; if (l > a) box(`${id}-${k}`, x, 0, (a + l) / 2, t, h, l - a, mat); box(`${id}-${k}h`, x, hh, c, t, h - hh, w, mat); a = c + w / 2; });
    if (z1 > a) box(`${id}-e`, x, 0, (a + z1) / 2, t, h, z1 - a, mat);
  };
  const sign = (id, x, y, z, yaw, w, h, html, bg) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, primitive: { kind: "box", width: w, height: h, depth: 0.08 }, material: { color: bg, roughness: 0.6 },
    ui: `<div face="front" width="${w}m" style="width:${w * 1000}px;height:${h * 1000}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:Arial,sans-serif;font-weight:900;line-height:1.05">${html}</div>` });
  const vend = (id, x, z, yaw, soda, extra = {}) => sp(id, { feetPosition: { x, y: extra.y ?? 0, z }, rotation: { yaw, ...(extra.rot ?? {}) }, physics: { body: "static", collider: "box" },
    model: { id: M_VEND, forward: "+z", materials: { cabinet: { color: soda ? "oklch(0.5 0.2 27)" : "oklch(0.16 0.005 250)", roughness: 0.4, metalness: 0.35 } } },
    tags: extra.dead ? [] : ["usable"], behavior: extra.dead ? undefined : "scripts/l61-use.js",
    state: extra.dead ? {} : { kind: "vend", sells: soda ? "soda" : "snack", name: soda ? "Soda machine" : "Snack machine", verb: "Press a button", info: soda ? "Coca-Cola, Pepsi, Mountain Dew. Free, it never asks for coins." : "Doritos and the rest of 2003. Free." },
    children: [{ feetPosition: { x: 0.1, y: 0.38, z: -0.447 }, primitive: { kind: "box", width: 0.72, height: 1.32, depth: 0.01 }, material: { texture: soda ? SODA : SNACK, roughness: 0.15, emissive: "oklch(0.35 0 0)", emissiveIntensity: 0.4 } }] });
  const tableSet = (id, x, z, yaw) => sp(id, { feetPosition: { x, y: 0, z }, rotation: { yaw }, physics: { body: "static", collider: "mesh" }, model: { id: M_TABLE, forward: "+z" } });
  const counter = (id, x, z, yaw, m, extra) => sp(id, { feetPosition: { x, y: 0, z }, rotation: { yaw }, physics: { body: "static", collider: "box" }, model: { id: m, forward: "+z" }, ...extra });
  const stool = (id, x, z, vinyl) => sp(id, { feetPosition: { x, y: 0, z }, physics: { body: "static", collider: "cylinder" }, model: { id: M_STOOL, forward: "+z", materials: { vinyl: { color: vinyl, roughness: 0.35 } } } });

  // ---- the hall: terrazzo, cream plaster with a teal and pink 80s band, a drop ceiling broken by six skylights of pure black
  // the floor is four slabs round a square hole: the conversation pit, two steps down (the wiki: a circular dip in the middle with benches round it)
  box("l61-floor-w", -19, -0.3, 0, 24, 0.3, 2 * HD + 26, TERRAZZO); box("l61-floor-e", 19, -0.3, 0, 24, 0.3, 2 * HD + 26, TERRAZZO);
  box("l61-floor-n", 0, -0.3, -21, 14, 0.3, 28, TERRAZZO); box("l61-floor-s", 0, -0.3, 21, 14, 0.3, 28, TERRAZZO);
  for (const s of [-1, 1]) { box(`l61-step-z${s}`, 0, -0.6, s * 6.25, 14, 0.3, 1.5, { ...TERRAZZO, color: "oklch(0.8 0.04 350)" }); box(`l61-step-x${s}`, s * 6.25, -0.6, 0, 1.5, 0.3, 11, { ...TERRAZZO, color: "oklch(0.8 0.04 190)" }); }
  box("l61-pit-floor", 0, -0.9, 0, 11, 0.3, 11, { ...TERRAZZO, color: "oklch(0.55 0.1 30)" });
  box("l61-roof", 0, HH, 0, 2 * HW, 0.3, 2 * HD, CEIL);
  for (const [i, sx] of [-18, 0, 18].entries()) for (const [j, sz] of [-9, 9].entries()) {
    const k = `${i}${j}`;
    box(`l61-sky-${k}`, sx, HH - 0.02, sz, 9, 0.05, 7, { color: "oklch(0.02 0 0)", roughness: 0.05, metalness: 0.4 }, { physics: undefined }); // the glass: nothing behind it
    for (const [n, f] of [[0, [0, -3.5, 9.4, 0.25]], [1, [0, 3.5, 9.4, 0.25]], [2, [-4.5, 0, 0.25, 7.2]], [3, [4.5, 0, 0.25, 7.2]]]) box(`l61-skyf-${k}-${n}`, sx + f[0], HH - 0.2, sz + f[1], f[2], 0.2, f[3], { color: "oklch(0.86 0.01 90)", metalness: 0.5, roughness: 0.4 }, { physics: undefined });
    light(`l61-skyl-${k}`, sx, HH - 0.6, sz, "oklch(0.98 0.03 85)", 9, 24); // the daylight that comes from nowhere
  }
  wallZ("l61-wn", -HD, -HW, HW, [[-21, 4, 3.2], [-7, 4, 3.2], [7, 4, 3.2], [21, 4, 3.2]], HH, PLASTER);
  wallZ("l61-ws", HD, -HW, HW, [[-14, 3, 3], [14, 2.2, 2.6]], HH, PLASTER);
  wallX("l61-ww", -HW, -HD, HD, [[0, 1.6, 2.3]], HH, PLASTER);
  wallX("l61-we", HW, -HD, HD, [[-9, 2.2, 2.7]], HH, PLASTER);
  for (const [n, y, c] of [[0, 1.0, "oklch(0.62 0.09 190)"], [1, 1.2, "oklch(0.74 0.11 350)"]]) {
    for (const s of [-1, 1]) box(`l61-band-z${n}${s}`, 0, y, s * (HD - 0.17), 2 * HW - 0.4, 0.12, 0.04, { color: c, roughness: 0.5 }, { physics: undefined });
    for (const s of [-1, 1]) box(`l61-band-x${n}${s}`, s * (HW - 0.17), y, 0, 0.04, 0.12, 2 * HD - 0.4, { color: c, roughness: 0.5 }, { physics: undefined });
  }
  // windows of orange-white "daylight" high on the east wall
  for (let k = 0; k < 4; k++) box(`l61-win-${k}`, HW - 0.18, 2.6, -12 + k * 8, 0.05, 2.2, 3.2, { color: "oklch(0.96 0.05 70)", emissive: "oklch(0.95 0.07 70)", emissiveIntensity: 1.6 }, { physics: undefined });

  // ---- the court: navy tables in loose rows, the round sunken-look pit with benches, planters, the ceiling speakers playing 80s hits
  let t = 0;
  for (let x = -24; x <= 24; x += 6) for (let z = -15; z <= 15; z += 6) {
    if (Math.abs(x) < 9 && Math.abs(z) < 9) continue; // the pit
    tableSet(`l61-table-${t++}`, x + Math.sin(x * 3.1 + z) * 0.6, z + Math.cos(x + z * 2.3) * 0.5, (x * 37 + z * 11) % 40);
  }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; sp(`l61-pbench-${k}`, { feetPosition: { x: Math.sin(a) * 4.4, y: -0.6, z: Math.cos(a) * 4.4 }, rotation: { yaw: (a * 180) / Math.PI }, physics: { body: "static", collider: "box" }, model: { id: M_BENCH, forward: "+z" } }); }
  sp("l61-planter", { feetPosition: { x: 0, y: -0.6, z: 0 }, physics: "static", primitive: { kind: "cylinder", radiusTop: 1.6, radiusBottom: 1.6, height: 0.7 }, material: { color: "oklch(0.8 0.03 70)", roughness: 0.6 },
    children: [{ feetPosition: { x: 0, y: 0.7, z: 0 }, primitive: { kind: "sphere", radius: 1.3 }, material: { color: "oklch(0.45 0.12 145)", roughness: 0.9 } }, { feetPosition: { x: 0.6, y: 1.5, z: 0.3 }, primitive: { kind: "sphere", radius: 0.8 }, material: { color: "oklch(0.5 0.13 140)", roughness: 0.9 } }] });
  for (const [k, [x, z]] of [[-27, -18], [27, -18], [-27, 18], [27, 18], [-10, 19], [10, 19]].entries()) sp(`l61-pot-${k}`, { feetPosition: { x, y: 0, z }, physics: "static", primitive: { kind: "cylinder", radiusTop: 0.45, radiusBottom: 0.35, height: 0.6 }, material: { color: "oklch(0.55 0.08 40)" },
    children: [{ feetPosition: { x: 0, y: 0.6, z: 0 }, primitive: { kind: "cone", radius: 0.5, height: 1.8 }, material: { color: "oklch(0.42 0.11 150)", roughness: 0.9 } }] });
  for (const [k, [x, z]] of [[-15, -12], [15, -12], [-15, 12], [15, 12]].entries()) sp(`l61-speaker-${k}`, { feetPosition: { x, y: HH - 0.1, z }, primitive: { kind: "cylinder", radiusTop: 0.25, radiusBottom: 0.25, height: 0.06 }, material: { color: "oklch(0.92 0.01 90)" },
    audio: { clip: MUSIC, loop: true, gain: 0.22, spatial: true, maxDistance: 28, bus: "Music" } });

  // ---- the stores off the north wall: [centre x, name, floor, wall colour, sign html, sign bg, light colour]
  const STORES = [
    [-21, "clippers", WOOD, "oklch(0.42 0.17 25)", `<div style="font-size:300px;color:#ffe0d0;font-family:serif;font-style:italic">Clippers</div><div style="font-size:90px;color:#ffb0a0">COCKTAILS · EST. 1954</div>`, "oklch(0.3 0.14 25)", "oklch(0.8 0.12 30)"],
    [-7, "liquorette", CHECK, "oklch(0.3 0.06 40)", `<div style="font-size:280px;color:#f2d98a;font-family:serif">Liquorette</div><div style="font-size:80px;color:#b8e0a8">ALMOND · CASHEW · DISTILLED</div>`, "oklch(0.2 0.04 40)", "oklch(0.85 0.1 85)"],
    [7, "slice", { ...TERRAZZO, color: "oklch(0.85 0.04 30)" }, "oklch(0.9 0.03 90)", `<div style="font-size:250px;color:#ff4a3a">SLICE PALACE</div><div style="font-size:90px;color:#2a7a3a">PIZZA BY THE SLICE · FREE</div>`, "oklch(0.96 0.01 90)", "oklch(0.95 0.04 80)"],
    [21, "burger", CHECK, "oklch(0.7 0.11 195)", `<div style="font-size:260px;color:#ff7ab8">BURGER BOP</div><div style="font-size:90px;color:#ffffff">SHAKES · FRIES · '86 PRICES</div>`, "oklch(0.35 0.1 280)", "oklch(0.92 0.05 330)"],
  ];
  for (const [cx, k, floor, wall, html, bg, lc] of STORES) {
    const wm = { ...PLASTER, color: wall }, z0 = -HD - 0.15, z1 = -HD - 10;
    box(`l61-${k}-floor`, cx, -0.29, (z0 + z1) / 2, 14, 0.3, 10, floor);
    box(`l61-${k}-roof`, cx, 4, (z0 + z1) / 2, 14, 0.3, 10, { ...CEIL, color: "oklch(0.88 0.01 90)" });
    box(`l61-${k}-back`, cx, 0, z1, 14, 4, 0.3, wm);
    box(`l61-${k}-wl`, cx - 7, 0, (z0 + z1) / 2, 0.3, 4, 10, wm); box(`l61-${k}-wr`, cx + 7, 0, (z0 + z1) / 2, 0.3, 4, 10, wm);
    box(`l61-${k}-front`, cx, 0, z0 - 0.3, 14, 4, 0.05, wm, { physics: undefined, visible: false });
    sign(`l61-${k}-sign`, cx, 3.6, -HD + 0.2, 180, 4.6, 1.4, html, bg);
    light(`l61-${k}-l0`, cx - 3, 3.5, -HD - 5, lc, 4, 12); light(`l61-${k}-l1`, cx + 3, 3.5, -HD - 5, lc, 4, 12);
  }
  // Clippers: the red bar it was found in. bar along the back, stools, bottles, a jukebox, and the wire across the floor
  counter("l61-clip-bar", -21, -30.2, 180, M_BAR10, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "coke,coke,almond", name: "Clippers bar", verb: "Ask for a drink", info: "Red walls, wood floor. The bartender is a faceling in a bow tie." } });
  for (let k = 0; k < 6; k++) stool(`l61-clip-stool-${k}`, -25 + k * 1.6, -29.2, "oklch(0.45 0.18 25)");
  for (const [n, y] of [[0, 1.4], [1, 2.0]]) sp(`l61-clip-shelf-${n}`, { feetPosition: { x: -21, y, z: -31.6 }, primitive: { kind: "box", width: 9, height: 0.05, depth: 0.3 }, material: DARKWOOD,
    children: Array.from({ length: 16 }, (_, i) => ({ feetPosition: { x: -4.2 + i * 0.56, y: 0.05, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.05, height: 0.3 + ((i * 7) % 3) * 0.05 }, material: { color: ["oklch(0.4 0.1 145)", "oklch(0.55 0.12 60)", "oklch(0.3 0.08 30)", "oklch(0.8 0.03 90)"][i % 4], roughness: 0.1, opacity: 0.85, transparent: true } })) });
  counter("l61-clip-jukebox", -26.4, -25, -90, M_JUKE, { light: { kind: "point", color: "oklch(0.8 0.15 55)", intensity: 0.8, distance: 4 } });
  box("l61-clip-wire", -21, 0.06, -23.2, 3.6, 0.015, 0.015, { color: "oklch(0.2 0 0)" }, { physics: undefined });
  // Liquorette: long dark bar down the left, back bar of glowing bottles, green-glass lamps
  counter("l61-liq-bar", -12.2, -27, -90, M_BAR7, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "almond,almond,coke", name: "Liquorette bar", verb: "Order", info: "Almond water, cashew water, real distilled water. Pay nothing." } });
  counter("l61-liq-back", -13.6, -27, -90, M_BACKBAR);
  for (let k = 0; k < 3; k++) sp(`l61-liq-lamp-${k}`, { feetPosition: { x: -11.6, y: 2.6, z: -29.5 + k * 2.5 }, primitive: { kind: "sphere", radius: 0.18 }, material: { color: "oklch(0.6 0.14 150)", emissive: "oklch(0.7 0.16 150)", emissiveIntensity: 1.5 }, light: { kind: "point", color: "oklch(0.85 0.1 140)", intensity: 1.5, distance: 6 } });
  for (let k = 0; k < 4; k++) tableSet(`l61-liq-table-${k}`, -6 + (k % 2) * 3.4, -25.5 - Math.floor(k / 2) * 3.4, k * 20);
  // Slice Palace: counter with a warm glass case, the oven, a menu board, a soda machine
  counter("l61-slice-counter", 7, -29.4, 180, M_PIZZA, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "pizza", name: "Slice Palace counter", verb: "Take a slice", info: "Pepperoni under a heat lamp. A faceling in a paper hat waves." } });
  counter("l61-slice-oven", 9.5, -31.3, 180, M_OVEN);
  sign("l61-slice-menu", 4.5, 2.2, -31.8, 180, 3.2, 1.2, `<div style="font-size:120px;color:#ffd84a">MENU</div><div style="font-size:70px;color:#fff">PEPPERONI · CHEESE · SUPREME</div><div style="font-size:60px;color:#9f9">ALL SLICES FREE · FACELING STAFF</div>`, "oklch(0.2 0.02 150)");
  vend("l61-slice-soda", 12.8, -25, 90, true);
  for (let k = 0; k < 2; k++) tableSet(`l61-slice-table-${k}`, 3 + k * 4, -25.5, 0);
  // Burger Bop: diner counter with stools, the grill, a soda machine
  counter("l61-burger-counter", 21, -28.6, 180, M_DINER, { tags: ["usable"], behavior: "scripts/l61-use.js", state: { kind: "counter", gives: "burger", name: "Burger Bop counter", verb: "Order a burger", info: "The grill hisses. It smells exactly like 1986." } });
  counter("l61-burger-grill", 21, -31.3, 180, M_GRILL, { audio: { clip: "cdn/sfx-burgers-sizzling-on-flat-top-griddle-loop.mp3", loop: true, gain: 0.18, spatial: true, maxDistance: 11 } });
  for (let k = 0; k < 6; k++) stool(`l61-burger-stool-${k}`, 17 + k * 1.6, -27.5, "oklch(0.7 0.13 195)");
  vend("l61-burger-soda", 27.3, -25, 90, true);

  // ---- the vending room (south, x -22..-6): rows of machines, some stacked, one toppled across the far corner
  const vz0 = HD + 0.15, vz1 = HD + 10;
  box("l61-vend-roof", -14, 4, (vz0 + vz1) / 2, 16, 0.3, 10, CEIL);
  box("l61-vend-back", -14, 0, vz1, 16, 4, 0.3, PLASTER); box("l61-vend-wl", -22, 0, (vz0 + vz1) / 2, 0.3, 4, 10, PLASTER); box("l61-vend-wr", -6, 0, (vz0 + vz1) / 2, 0.3, 4, 10, PLASTER);
  sign("l61-vend-sign", -14, 3.4, HD - 0.2, 0, 3.6, 0.9, `<div style="font-size:140px;color:#ffffff">VENDING</div><div style="font-size:70px;color:#ffe08a">FREE · TAKE WHAT YOU NEED · M.E.G.</div>`, "oklch(0.35 0.12 260)");
  for (let k = 0; k < 7; k++) vend(`l61-vend-b${k}`, -20.5 + k * 2.1, vz1 - 0.6, 0, k % 2 === 1);
  for (let k = 0; k < 4; k++) vend(`l61-vend-l${k}`, -21.3, vz0 + 2 + k * 1.6, -90, k % 2 === 0);
  for (let k = 0; k < 3; k++) vend(`l61-vend-r${k}`, -6.7, vz0 + 2 + k * 1.6, 90, k !== 1);
  vend("l61-vend-pile0", -18.4, vz1 - 0.7, -8, false, { y: 1.85, dead: true, rot: { roll: 6 } });
  vend("l61-vend-pile1", -14.2, vz1 - 0.6, 6, true, { y: 1.85, dead: true });
  vend("l61-vend-fall", -8.4, vz1 - 1.8, 130, true, { y: 0.45, dead: true, rot: { pitch: 90 } });
  light("l61-vend-l0", -17, 3.6, HD + 5, "oklch(0.95 0.02 230)", 5, 12); light("l61-vend-l1", -11, 3.6, HD + 5, "oklch(0.95 0.02 230)", 5, 12);
  sp("l61-vend-hum", { feetPosition: { x: -14, y: 1.5, z: HD + 6 }, audio: { clip: G("vending-machine-compressor-hum-loop"), loop: true, gain: 0.15, spatial: true, maxDistance: 12 } });

  // ---- restrooms (south, x 8..20): tiled, three stalls, a row of sinks under a long mirror
  const rz1 = HD + 8;
  box("l61-rest-floor", 14, -0.29, HD + 4, 12, 0.3, 8, { ...BATH, color: "oklch(0.85 0.01 220)" });
  box("l61-rest-roof", 14, 3.2, HD + 4, 12, 0.3, 8, CEIL);
  box("l61-rest-back", 14, 0, rz1, 12, 3.2, 0.3, BATH); box("l61-rest-wl", 8, 0, HD + 4, 0.3, 3.2, 8, BATH); box("l61-rest-wr", 20, 0, HD + 4, 0.3, 3.2, 8, BATH);
  sign("l61-rest-sign", 14, 2.75, HD - 0.2, 0, 1.6, 0.4, `<div style="font-size:150px;color:#fff">RESTROOMS</div>`, "oklch(0.4 0.09 230)");
  for (let k = 0; k < 4; k++) box(`l61-rest-stallw-${k}`, 14 + k * 1.6, 0.15, rz1 - 0.9, 0.05, 1.9, 1.6, { color: "oklch(0.7 0.06 200)", metalness: 0.3, roughness: 0.4 });
  for (let k = 0; k < 3; k++) box(`l61-rest-door-${k}`, 14.8 + k * 1.6, 0.15, rz1 - 1.7, 1.4, 1.9, 0.04, { color: "oklch(0.7 0.06 200)", metalness: 0.3, roughness: 0.4 }, { physics: undefined, rotation: { yaw: k === 1 ? 35 : 0 } });
  box("l61-rest-sinks", 9.0, 0, HD + 4, 0.6, 0.85, 5, { color: "oklch(0.9 0.01 90)", roughness: 0.2 });
  box("l61-rest-mirror", 8.2, 1.2, HD + 4, 0.03, 1.1, 5, { color: "oklch(0.85 0.01 230)", metalness: 1, roughness: 0.05 }, { physics: undefined });
  light("l61-rest-l", 14, 2.9, HD + 4, "oklch(0.97 0.01 220)", 4, 10);

  // ---- ways out. the rusty steel door to Level 6 (M.E.G. Level 6 Access Outpost), screaming faintly behind it
  box("l61-meg-door", -HW + 0.2, 0, 0, 0.1, 2.2, 1.5, RUST, { physics: undefined });
  sign("l61-meg-sign", -HW + 0.25, 2.6, 0, -90, 2.6, 0.7, `<div style="font-size:110px;color:#e8e0c0">M.E.G. LEVEL 6 ACCESS OUTPOST</div><div style="font-size:70px;color:#ff8a6a">AUTHORIZED PERSONNEL · SCREAMING IS NORMAL</div>`, "oklch(0.25 0.04 150)");
  for (let k = 0; k < 2; k++) box(`l61-meg-sand-${k}`, -HW + 1.6, 0, k ? 2.2 : -2.2, 0.8, 0.9, 1.6, { color: "oklch(0.62 0.05 80)", roughness: 1 });
  sp("l61-meg-scream", { feetPosition: { x: -HW + 0.5, y: 1.2, z: 0 }, audio: { clip: G("distant-muffled-screaming-behind-heavy-steel-door-loop"), loop: true, gain: 0.12, spatial: true, maxDistance: 9 } });
  sp("l61-to-l6", { tags: ["door"], feetPosition: { x: -HW + 0.45, y: 0, z: 0 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.5, height: 2.2, depth: 1.4 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level6#l6-from-l61" } });
  sp("l61-from-l6", { feetPosition: { x: -HW + 2.6, y: 0.1, z: 0 }, rotation: { yaw: -90 } });
  // the vent low in the east wall: lean in and it pulls you through to Level 3
  box("l61-vent", HW - 0.2, 0.15, 8, 0.1, 0.7, 1.1, { color: "oklch(0.25 0.005 250)", metalness: 0.6, roughness: 0.5 }, { physics: undefined,
    children: Array.from({ length: 6 }, (_, i) => ({ feetPosition: { x: -0.06, y: 0.06 + i * 0.1, z: 0 }, primitive: { kind: "box", width: 0.03, height: 0.03, depth: 1.05 }, material: STEEL })),
    audio: { clip: G("strong-air-suction-whistle-through-metal-vent-loop"), loop: true, gain: 0.14, spatial: true, maxDistance: 6 } });
  sp("l61-vent-in", { tags: ["door"], feetPosition: { x: HW - 0.4, y: 0, z: 8 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.5, height: 0.9, depth: 1.0 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level3" } });
  // arrivals: the hall, and where Level 4's vending machine drops you
  sp("l61-arrive", { feetPosition: { x: 0, y: 0.1, z: 14 }, rotation: { yaw: 0 } });
  sp("l61-from-l4", { feetPosition: { x: -14, y: 0.1, z: 18.5 }, rotation: { yaw: 0 } });
  layExtra(ctx, { HW, HD, HH });
  sign("l61-welcome", 0, 3.8, HD - 0.2, 0, 5, 1.0, `<div style="font-size:150px;color:#ff7ab8;font-style:italic">The Snackrooms</div><div style="font-size:70px;color:#5ad8e0">EAT · DRINK · STAY AS LONG AS YOU LIKE</div>`, "oklch(0.22 0.06 280)");
}

export function tick(ctx) {
  const st = ctx.place.state;
  if ((st.builtV ?? 0) < V) { lay(ctx); st.builtV = V; st.crewV = 0; }
  if ((st.crewV ?? 0) < 1) { st.crewV = 1; for (const id of FACELING_IDS) faceling(ctx, id); for (const id of PEOPLE) person(ctx, id); }
  keepPeople(ctx, PEOPLE, person); // the Faceling crew is the level's own: a fallen one is replaced the next time the level is rebuilt
}
