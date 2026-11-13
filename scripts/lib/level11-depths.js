// Level 11's depths (Shelly, Nov 10: a long crawl packed with enemies to a hidden room; smash or pick your way in).
// From the dead train's pit on the 14th St platform a service tunnel runs north (A), turns east along a flooded
// pump gallery (B), then north up a cable corridor (C) to a bricked-up doorway and a padlocked shutter: the sealed
// Backrooms Robotics storeroom (D). Inside: the R-55 ad tape on the desk, the beat-up raygun behind a vent grate.
import MODELS from "./data/level11-models.yml";
import D from "./data/l11-depths.yml";
import KIT from "./data/l11-crawl-kit.yml";
const FL = D.floor, CEIL = FL + 3.3;
const CONC = { texture: "cdn/texture-stained-wet-concrete-tunnel-wall.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.62 0.02 80)", roughness: 0.9 };
const FLOOR = { texture: "cdn/texture-grimy-wet-concrete-floor-with-puddles.png", wrap: "repeat", repeat: [0.4, 0.4], color: "oklch(0.5 0.02 80)", roughness: 0.7 };
const BRICK = { texture: "cdn/texture-old-red-brick-wall-crumbling-mortar.png", wrap: "repeat", repeat: [1, 1], color: "oklch(0.7 0.05 40)", roughness: 0.9 };
const ROOMWALL = { texture: "cdn/texture-faded-1950s-mint-green-painted-plaster-wall-peeling.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.8 0.04 160)", roughness: 0.8 };
const LINO = { texture: "cdn/texture-worn-1950s-checkered-linoleum-floor-tiles.png", wrap: "repeat", repeat: [0.6, 0.6], roughness: 0.6 };
const RUST = { texture: "cdn/texture-rusted-corrugated-steel-shutter.png", wrap: "repeat", repeat: [0.8, 0.8], color: "oklch(0.6 0.05 50)", metalness: 0.6, roughness: 0.6 };
const PIPE = { color: "oklch(0.42 0.03 60)", metalness: 0.7, roughness: 0.5 };
const WATER = { kind: "water", color: "oklch(0.32 0.04 140)", opacity: 0.85, waveIntensity: 0.15 };
const AD1 = "/cdn/value.2620b5aa701569f943e6d36644895e0f3b59d528b7f3d819f84ae03f6e340bff.png", AD2 = "/cdn/value.f835a3820e4ff6b55a54f31c47ce4505c3bdc6dd7fc8cabd4e1861a060d91313.png";
const RAYGUN = "/cdn/value.f78423b01c71d65f4b04e41bf27a0b3c5f3b06820933ae52d304cad136a54db5.glb"; // the R-55 as the hand holds it (scripts/lib/weapon-look.js)
const NEW = { reel: "/cdn/value.2d037c484973cd0b26e6d4f42824e86c7ced0cb6de6365152abf1c2dceaea5e3.glb", bench: "/cdn/value.6dbfae6ddd374113031c50469a62658fbba5802bc135560bd615e510d813dce3.glb", remains: "/cdn/value.1ad9648dfba4b00ae0850e9658bf0a5213aecf5d346150840d4eeb4a3a822e19.glb", cabinet: "/cdn/value.60af0a15c90074242ff3fd8cf18189c876c72daeff7d48cc2c70977a6678f1a1.glb", cot: "/cdn/value.33c28c7c26824f91a35711a491f8c4b0f3141404981b101e0fe7d433e9abeaff.glb", barrel: "/cdn/value.adb792b5d96fdd99a2d2a43e3c8e8bed55728414e497c975828d1cb366765d6e.glb" }; // Tripo, Nov 10
const FURN = { armchair: "/cdn/value.3e7196a1233581476ede9bfcb0b38934ec50b62b9174954d055d379c63fd73b6.glb", lamp: "/cdn/value.56e857c3fa9f839e7d3406ce7a54b6caaa028f92cfc1e5b9935ed654404c7d26.glb", shelf: "/cdn/value.918584eed8336eda888580753019763471fcce0adcaf2bc66def78f53ae3fad0.glb" };
// Substation 4 remodel (Shelly, Nov 13: "the entire area"): Tripo models, fitted in place by layout boxes
const SUB = { genset: "/cdn/value.79939b0081c76ca10d9b5611beec3a13fb263c462a00880d9c9402aa2c22e74b.glb", pillar: "/cdn/value.3ce7bf633fe917f5b3f9252f29e6f7e76e73013d5a235fad84457bd8854b9658.glb", breaker: "/cdn/value.4671f162a8c7bdbb44b8199d3ff429601b57b520a6804f0db9375a76c2ce4df1.glb" };
// a caged bulkhead lamp: dim, some dead, the odd one guttering
// a caged bulkhead lamp (Blender, art/l11crawl): cast-iron dome and wire cage hung under the vault; on = brightness 0..1 (0 = dead)
const lampAt = (sp, id, x, y, z, on = 1, c = "oklch(0.9 0.08 85)") => sp(id, { feetPosition: { x, y, z }, model: { id: KIT.lamp, forward: "-z", materials: on ? undefined : { glow: { color: "oklch(0.3 0.01 60)", emissiveIntensity: 0 } } }, castShadow: false, visibleRange: { max: 60 },
  ...(on ? { light: { kind: "point", color: c, intensity: 1.6 * on, distance: 13 } } : {}) });
const bulb = (sp, id, x, z, on = 1, c) => lampAt(sp, id, x, CEIL - 0.53, z, on, c);

export function layDepths(ctx, { sp, bx, cyl }) {
  const W = (id, x, z, w, d, m = CONC, h = CEIL - FL) => bx(id, x, FL, z, w, h, d, m);
  const floor = (id, x, z, w, d, m = FLOOR) => { bx(id, x, FL - 0.3, z, w, 0.3, d, m); bx(id + "-c", x, CEIL, z, w, 0.18, d, { color: "oklch(0.22 0.01 60)", roughness: 0.95 }); };
  // A: the service tunnel north of the pit, x 7..11, z 89..140
  floor("l11d-a-floor", 9, 114.5, 4.2, 51); W("l11d-a-w", 6.8, 114.5, 0.4, 51); W("l11d-a-e", 11.2, 112.5, 0.4, 47);
  // the bore: a rounded concrete vault drawn just inside the box walls (they stay the colliders)
  const shell = (id, x, z, params) => sp(id, { feetPosition: { x, y: FL, z }, primitive: { kind: "scripted", script: "scripts/l11-crawl-geo.js", params }, physics: "none", castShadow: false, receiveShadow: true });
  shell("l11d-a-shell", 9, 89, { len: 47, w: 3.96, spring: 1.9, rise: 1.3, rib: 4, cables: 1 });
  shell("l11d-b-shell", 7, 140, { len: 39, w: 7.76, spring: 2.1, rise: 1.1, rib: 5, axis: "x", gaps: [[-1, 0, 4.2], [1, 15, 19], [1, 33, 37.2]] });
  shell("l11d-c-shell", 42, 144, { len: 14, w: 3.96, spring: 1.9, rise: 1.3, rib: 4, cables: -1 });
  shell("l11d-c-shell2", 42, 178, { len: 12, w: 3.96, spring: 1.9, rise: 1.3, rib: 4, cables: -1 });
  for (let k = 0; k < 12; k++) sp(`l11d-a-pipes-${k}`, { feetPosition: { x: 7.32, y: FL + 1.6, z: 91 + k * 4 }, model: { id: KIT.pipes, forward: "-z" }, physics: "none", castShadow: false, visibleRange: { max: 45 } });
  [[95, 1], [101, 0.7], [107, 0], [113, 1], [119, 0.9], [125, 0], [131, 1], [137, 0.8]].forEach(([z, on], i) => bulb(sp, `l11d-a-lamp-${i}`, 9, z, on));
  // a stretch of the vault came down: slabs and rebar choke the east half, the way on squeezes past along the pipes
  sp("l11d-a-collapse", { feetPosition: { x: 10.25, y: FL, z: 117 }, rotation: { yaw: 15 }, model: { id: KIT.rubble, forward: "-z", materials: { concrete: CONC } }, physics: { body: "static", collider: "box" } });
  // bulkhead frames where one section gives onto the next
  const portal = (id, x, z, yaw, label) => { sp(id, { feetPosition: { x, y: FL, z }, rotation: { yaw }, model: { id: KIT.portal, forward: "-z", materials: { concrete: CONC } }, physics: "none" });
    for (const s of [-1, 1]) { const o = 1.9 * s, a = (yaw % 180) !== 0; sp(`${id}-j${s}`, { feetPosition: { x: x + (a ? 0 : o), y: FL, z: z + (a ? o : 0) }, primitive: { kind: "box", width: a ? 0.6 : 0.6, height: 3.3, depth: 0.6 }, visible: false, physics: "static" }); }
    if (label) sp(`${id}-plate`, { feetPosition: { x, y: FL + 2.82, z: z - 0.33 }, rotation: { yaw: yaw + 180 }, vector: `<svg viewBox='0 0 180 56' width='0.88m'><rect width='180' height='56' fill='#2a2620'/><text x='90' y='37' font-family='sans-serif' font-weight='700' font-size='24' text-anchor='middle' fill='#d8c890'>${label}</text></svg>` }); };
  portal("l11d-portal-ab", 9, 135.7, 0, "PUMP GALLERY"); portal("l11d-portal-bc", 42, 144.3, 0, "RELAY HALL"); portal("l11d-portal-p2", 24, 144.3, 0, "PUMP ROOM 2");
  // a side room off the gallery, x 22..26 doorway, room x 20..28 z 144..152: an optional detour with a cache, guarded by a clump in the dark
  floor("l11d-p2-floor", 24, 148.2, 8.4, 7.8); W("l11d-p2-w", 19.8, 148.2, 0.4, 8.2); W("l11d-p2-e", 28.2, 148.2, 0.4, 8.2); W("l11d-p2-n", 24, 152.3, 8.8, 0.4);
  for (const [k, x] of [[0, 21.5], [1, 26.5]]) cyl(`l11d-p2-pump-${k}`, x, FL, 150.5, 0.7, 0.8, 1.5, { color: "oklch(0.4 0.06 150)", metalness: 0.6, roughness: 0.5 });
  sp("l11d-p2-water", { feetPosition: { x: 24, y: FL + 0.05, z: 148 }, primitive: { kind: "plane", width: 7.8, height: 7.4 }, rotation: { pitch: -90 }, material: WATER, castShadow: false });
  sp("l11d-p2-locker", { tags: ["container"], feetPosition: { x: 27.6, y: FL, z: 146.2 }, rotation: { yaw: 90 }, model: { id: KIT.locker, forward: "-z" }, physics: { body: "static", collider: "box" }, state: { name: "Pump crew locker", items: "ammo,cells,kit,almond", c: { x: 27.35, y: FL + 1.2, z: 146.2 } } });
  bulb(sp, "l11d-p2-lamp", 24, 148, 0.4, "oklch(0.75 0.12 140)");
  sp("l11d-a-sign", { feetPosition: { x: 10.95, y: FL + 1.7, z: 92 }, rotation: { yaw: -90 }, vector: "<svg viewBox='0 0 160 60' width='1m'><rect width='160' height='60' fill='#c9b24a'/><rect x='5' y='5' width='150' height='50' fill='none' stroke='#1a1a1a' stroke-width='4'/><text x='80' y='28' font-family='sans-serif' font-size='18' text-anchor='middle' fill='#1a1a1a'>NO TRAINS</text><text x='80' y='48' font-family='sans-serif' font-size='12' text-anchor='middle' fill='#1a1a1a'>SVC TUNNEL 14-N</text></svg>" });
  sp("l11d-a-pallets", { feetPosition: { x: 10, y: FL, z: 109 }, rotation: { yaw: 20 }, model: { id: MODELS.barricade_pallets, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11d-a-spool", { feetPosition: { x: 7.8, y: FL, z: 121 }, model: { id: MODELS.ot_spool, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11d-a-junk", { feetPosition: { x: 10.2, y: FL, z: 129 }, rotation: { yaw: -40 }, model: { id: MODELS.th_junk, forward: "-z" }, physics: { body: "static", collider: "box" } });
  // B: the pump gallery, z 136..144, x 7..46, a sheet of standing water
  floor("l11d-b-floor", 26.5, 140, 39.4, 8.2); W("l11d-b-s", 28.6, 135.9, 35.2, 0.4); W("l11d-b-n1", 14.4, 144.1, 15.2, 0.4); W("l11d-b-n1b", 33, 144.1, 14, 0.4); W("l11d-b-n2", 45.1, 144.1, 2.2, 0.4); W("l11d-b-e", 46.2, 140, 0.4, 8.6);
  sp("l11d-b-water", { feetPosition: { x: 28, y: FL + 0.06, z: 140 }, primitive: { kind: "plane", width: 34, height: 7.6 }, rotation: { pitch: -90 }, material: WATER, castShadow: false });
  for (const x of [15, 23, 31, 39]) sp(`l11d-b-beam-${x}`, { feetPosition: { x, y: FL, z: 136.4 }, model: { id: MODELS.ibeam, forward: "-z" }, physics: { body: "static", collider: "box" }, layout: { box: { min: { x: -0.2, y: 0, z: -0.2 }, max: { x: 0.2, y: CEIL - FL, z: 0.2 } } } });
  cyl("l11d-b-pump", 28, FL, 143, 0.8, 0.9, 1.6, { color: "oklch(0.4 0.06 150)", metalness: 0.6, roughness: 0.5 });
  for (const k of [0, 1, 2, 5, 6, 7]) sp(`l11d-b-pipes-${k}`, { feetPosition: { x: 10 + k * 4, y: FL + 1.7, z: 143.55 }, rotation: { yaw: 90 }, model: { id: KIT.pipes, forward: "-z" }, physics: "none", castShadow: false, visibleRange: { max: 45 } });
  sp("l11d-b-sheet", { feetPosition: { x: 19, y: FL, z: 142.5 }, rotation: { yaw: 70 }, model: { id: MODELS.corrugated, forward: "-z" }, physics: { body: "static", collider: "box" } });
  [[13, 0.9], [21, 0.6], [29, 1, "oklch(0.75 0.12 140)"], [37, 0], [44, 0.9]].forEach(([x, on, c], i) => bulb(sp, `l11d-b-lamp-${i}`, x, 140, on, c));
  // C: the cable corridor north to the seal, x 40..44, z 144..190
  // C: the cable corridor north to the seal, x 40..44, broken at z 158..178 by the Relay Hall
  floor("l11d-c-floor", 42, 151, 4.2, 14); floor("l11d-c-floor2", 42, 184, 4.2, 12);
  W("l11d-c-w", 39.8, 151, 0.4, 14); W("l11d-c-e", 44.2, 151, 0.4, 14); W("l11d-c-w2", 39.8, 184, 0.4, 12); W("l11d-c-e2", 44.2, 184, 0.4, 12);
  [[148, 0.8], [154, 0.5], [181, 1, "oklch(0.75 0.15 30)"], [187, 0.7]].forEach(([z, on, c], i) => bulb(sp, `l11d-c-lamp-${i}`, 42, z, on, c));
  // the Relay Hall, x 34..50, z 158..178: the substation that fed the storeroom. Pillars to hide behind, a dead diesel set in the
  // middle, and the Custodian Units Backrooms Robotics left on watch, dormant until something walks in (scripts/l11-crawlers.js wakes them)
  const HH = FL + 3.7, HALLWALL = { ...CONC, color: "oklch(0.66 0.02 85)" }, PAINT = { color: "oklch(0.42 0.06 160)", roughness: 0.75 };
  bx("l11d-h-floor", 42, FL - 0.3, 168, 16.4, 0.3, 20.4, FLOOR); bx("l11d-h-ceil", 42, HH, 168, 16.4, 0.2, 20.4, { color: "oklch(0.24 0.01 60)", roughness: 0.95 });
  bx("l11d-h-w", 33.8, FL, 168, 0.4, HH - FL, 20.4, HALLWALL); bx("l11d-h-e", 50.2, FL, 168, 0.4, HH - FL, 20.4, HALLWALL);
  for (const z of [158, 178]) { bx(`l11d-h-s${z}a`, 36.8, FL, z, 6.4, HH - FL, 0.4, HALLWALL); bx(`l11d-h-s${z}b`, 47.2, FL, z, 6.4, HH - FL, 0.4, HALLWALL); bx(`l11d-h-s${z}c`, 42, CEIL, z, 4.4, HH - CEIL, 0.4, HALLWALL); }
  for (const [id, x, z, w, d] of [["w", 34.01, 168, 0.02, 19.6], ["e", 49.99, 168, 0.02, 19.6], ["s1", 36.9, 158.21, 6.2, 0.02], ["s2", 47.1, 158.21, 6.2, 0.02], ["n1", 36.9, 177.79, 6.2, 0.02], ["n2", 47.1, 177.79, 6.2, 0.02]])
    bx(`l11d-h-dado-${id}`, x, FL, z, w, 1.2, d, PAINT, { physics: undefined, castShadow: false }); // the old substation green, to shoulder height
  for (const [k, x, z] of [[0, 37.5, 162.5], [1, 46.5, 162.5], [2, 37.5, 173.5], [3, 46.5, 173.5]])
    sp(`l11d-h-pillar-${k}`, { feetPosition: { x, y: FL, z }, model: { id: SUB.pillar }, layout: { box: { min: { x: -0.65, y: 0, z: -0.65 }, max: { x: 0.65, y: HH - FL, z: 0.65 } } }, physics: { body: "static", collider: "box" } });
  sp("l11d-h-genset", { feetPosition: { x: 42, y: FL, z: 168 }, model: { id: SUB.genset }, layout: { box: { min: { x: -1.6, y: 0, z: -0.75 }, max: { x: 1.6, y: 1.9, z: 0.75 } } }, physics: { body: "static", collider: "box" } });
  sp("l11d-h-breaker", { feetPosition: { x: 34.4, y: FL + 0.45, z: 166 }, model: { id: SUB.breaker }, layout: { box: { min: { x: -0.2, y: 0, z: -0.6 }, max: { x: 0.2, y: 1.7, z: 0.6 } } }, physics: { body: "static", collider: "box" } });
  for (let k = 0; k < 4; k++) { sp(`l11d-h-pipes-w${k}`, { feetPosition: { x: 34.32, y: FL + 2.6, z: 162 + k * 4 }, model: { id: KIT.pipes, forward: "-z" }, physics: "none", castShadow: false });
    sp(`l11d-h-pipes-e${k}`, { feetPosition: { x: 49.68, y: FL + 2.6, z: 162 + k * 4 }, rotation: { yaw: 180 }, model: { id: KIT.pipes, forward: "-z" }, physics: "none", castShadow: false }); }
  sp("l11d-h-locker-0", { feetPosition: { x: 49.55, y: FL, z: 160.4 }, rotation: { yaw: 90 }, model: { id: KIT.locker, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11d-h-locker-1", { tags: ["container"], feetPosition: { x: 49.55, y: FL, z: 161.3 }, rotation: { yaw: 90 }, model: { id: KIT.locker, forward: "-z" }, physics: { body: "static", collider: "box" }, state: { name: "Substation tool locker", items: "ammo,cells,bandage,almond", c: { x: 49.3, y: FL + 1.2, z: 161.3 } } });
  sp("l11d-c-sandbags", { feetPosition: { x: 37, y: FL, z: 175.4 }, model: { id: MODELS.sandbags, forward: "-z" }, physics: { body: "static", collider: "box" } });
  [[38, 160.6], [46, 160.6], [42, 164.2], [42, 171.8], [38, 175.4], [46, 175.4]].forEach(([x, z], i) => lampAt(sp, `l11d-h-lamp-${i}`, x, HH - 0.43, z, i === 3 ? 0.5 : 1));
  sp("l11d-h-stencil", { feetPosition: { x: 34.03, y: FL + 1.9, z: 170.5 }, rotation: { yaw: 90 }, vector: "<svg viewBox='0 0 240 90' width='1.8m'><text x='120' y='38' font-family='sans-serif' font-weight='800' font-size='34' text-anchor='middle' fill='#d8cfb4' opacity='0.85'>SUBSTATION 4</text><text x='120' y='72' font-family='sans-serif' font-weight='700' font-size='20' text-anchor='middle' fill='#c9a227' opacity='0.85'>DANGER · 2300 VOLTS</text></svg>" });
  sp("l11d-c-warn", { feetPosition: { x: 40.05, y: FL + 1.6, z: 186 }, rotation: { yaw: 90 }, vector: "<svg viewBox='0 0 200 80' width='1.2m'><rect width='200' height='80' fill='#e8e0c8'/><rect x='0' y='0' width='200' height='20' fill='#b3261e'/><text x='100' y='15' font-family='sans-serif' font-size='13' text-anchor='middle' fill='#fff'>BACKROOMS ROBOTICS</text><text x='100' y='44' font-family='serif' font-size='16' text-anchor='middle' fill='#222'>STOREROOM 7</text><text x='100' y='66' font-family='sans-serif' font-size='10' text-anchor='middle' fill='#555'>SEALED BY ORDER · OCT 1958</text></svg>" });
  // the seal at z 190: a bricked-up doorway (smash it) beside a padlocked rolling shutter (pick it)
  bx("l11d-seal-l", 40.5, FL, 190, 1.0, CEIL - FL, 0.4, CONC); bx("l11d-seal-r", 43.8, FL, 190, 0.4, CEIL - FL, 0.4, CONC); bx("l11d-seal-mid", 42.3, FL, 190, 0.2, CEIL - FL, 0.4, CONC);
  bx("l11d-seal-top", 42, FL + 2.5, 190, 4, CEIL - FL - 2.5, 0.4, CONC);
  sp("l11d-bricks", { tags: ["breakable"], feetPosition: { x: 41.6, y: FL, z: 190 }, primitive: { kind: "box", width: 1.2, height: 2.5, depth: 0.3 }, material: BRICK, physics: "static", state: { mat: "brick", name: "Bricked-up doorway", hp: 380, maxHp: 380, stayGone: true } });
  sp("l11d-shutter", { tags: ["door"], feetPosition: { x: 43.1, y: FL, z: 190 }, primitive: { kind: "box", width: 1.2, height: 2.5, depth: 0.12 }, material: RUST, physics: { body: "kinematic", collider: "box" }, behavior: "scripts/l11-shutter.js",
    state: { lock: "lockpick:50", y0: FL, name: "Padlocked shutter", c: { x: 43.1, y: FL + 1.2, z: 189.7 } },
    children: [{ feetPosition: { x: 0.3, y: 1.0, z: -0.1 }, primitive: { kind: "box", width: 0.09, height: 0.12, depth: 0.05 }, material: { color: "oklch(0.55 0.08 80)", metalness: 0.9, roughness: 0.35 } }] });
  sp("l11d-crawlers", { feetPosition: { x: 9, y: FL, z: 92 }, behavior: "scripts/l11-crawlers.js", state: {} }); // steps every foe in the crawl
  // D: the storeroom, x 34..50, z 190..202, last lit in 1958
  bx("l11d-d-floor", 42, FL - 0.3, 196, 16.4, 0.3, 12.4, LINO); bx("l11d-d-ceil", 42, CEIL, 196, 16.4, 0.18, 12.4, { color: "oklch(0.75 0.02 90)", roughness: 0.9 });
  bx("l11d-d-s1", 37, FL, 190, 6, CEIL - FL, 0.4, ROOMWALL); bx("l11d-d-s2", 47.1, FL, 190, 6, CEIL - FL, 0.4, ROOMWALL);
  bx("l11d-d-n", 42, FL, 202.1, 16.4, CEIL - FL, 0.4, ROOMWALL); bx("l11d-d-w", 33.8, FL, 196, 0.4, CEIL - FL, 12.4, ROOMWALL); bx("l11d-d-e", 50.2, FL, 196, 0.4, CEIL - FL, 12.4, ROOMWALL);
  sp("l11d-d-poster1", { feetPosition: { x: 38.5, y: FL + 1.0, z: 201.88 }, rotation: { yaw: 180 }, primitive: { kind: "plane", width: 1.0, height: 1.3 }, material: { texture: AD1, roughness: 0.8, color: "oklch(0.85 0.03 80)" }, castShadow: false });
  sp("l11d-d-poster2", { feetPosition: { x: 34.02, y: FL + 1.0, z: 196 }, rotation: { yaw: 90 }, primitive: { kind: "plane", width: 1.0, height: 1.3 }, material: { texture: AD2, roughness: 0.8, color: "oklch(0.85 0.03 80)" }, castShadow: false });
  sp("l11d-d-desk", { feetPosition: { x: 44, y: FL, z: 199.5 }, model: { id: MODELS.meg_table, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11d-d-chair", { feetPosition: { x: 37, y: FL, z: 193.5 }, rotation: { yaw: 35 }, model: { id: FURN.armchair, forward: "+x" }, physics: { body: "static", collider: "box" } });
  sp("l11d-d-shelf", { feetPosition: { x: 49.7, y: FL, z: 194 }, rotation: { yaw: -90 }, model: { id: FURN.shelf, forward: "+x" }, physics: { body: "static", collider: "box" } });
  sp("l11d-d-lamp", { feetPosition: { x: 35, y: FL, z: 200.8 }, model: { id: FURN.lamp, forward: "+x" }, physics: { body: "static", collider: "box" }, light: { kind: "point", color: "oklch(0.85 0.12 70)", intensity: 1.6, distance: 12 } });
  // the tape: a scuffed reel tin on the desk, beside a dead reel-to-reel
  sp("l11d-tape", { tags: ["container"], feetPosition: { x: 43.6, y: FL + 0.86, z: 199.4 }, model: { id: MODELS.reel_tin, forward: "+x" }, layout: { box: { min: { x: -0.11, y: 0, z: -0.11 }, max: { x: 0.11, y: 0.06, z: 0.11 } } }, physics: { body: "static", collider: "box" },
    state: { name: "Reel tin marked R-55", items: "holo:r55" } }); // tripo reel tin
  // Walt Kessler's own reel, still threaded in his recorder: test 41, the day he looked
  sp("l11d-reel", { tags: ["container"], feetPosition: { x: 44.75, y: FL + 0.78, z: 199.6 }, rotation: { yaw: 180 }, model: { id: NEW.reel, forward: "-z" }, layout: { box: { min: { x: -0.3, y: 0, z: -0.2 }, max: { x: 0.3, y: 0.3, z: 0.2 } } }, physics: { body: "static", collider: "box" },
    state: { name: "Reel-to-reel recorder", items: "holo:walt41" } });
  sp("l11d-d-calendar", { feetPosition: { x: 45.5, y: FL + 1.5, z: 201.88 }, rotation: { yaw: 180 }, vector: "<svg viewBox='0 0 100 120' width='0.4m'><rect width='100' height='120' fill='#efe6cc'/><rect width='100' height='30' fill='#2b5d8a'/><text x='50' y='21' font-family='serif' font-size='16' text-anchor='middle' fill='#fff'>OCTOBER</text><text x='50' y='80' font-family='serif' font-size='40' text-anchor='middle' fill='#333'>1958</text><line x1='20' y1='100' x2='80' y2='108' stroke='#b3261e' stroke-width='4'/></svg>" });
  // Walt's bench: the emitter still clamped, aimed at the scorched plate; he sits where he fell, facing the aperture
  sp("l11d-d-bench", { feetPosition: { x: 40.5, y: FL, z: 197.4 }, model: { id: NEW.bench, forward: "-z" }, layout: { box: { min: { x: -1.0, y: 0, z: -0.7 }, max: { x: 1.0, y: 1.7, z: 0.7 } } }, physics: { body: "static", collider: "box" } });
  sp("l11d-d-walt", { feetPosition: { x: 40.4, y: FL, z: 195.2 }, rotation: { yaw: 180 }, model: { id: NEW.remains, forward: "-z" }, layout: { box: { min: { x: -0.45, y: 0, z: -0.55 }, max: { x: 0.45, y: 1.0, z: 0.55 } } }, physics: { body: "static", collider: "box" } });
  sp("l11d-d-scorch", { feetPosition: { x: 40.4, y: FL + 0.012, z: 195.6 }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 0.9 }, material: { color: "oklch(0.12 0.01 50 / 0.8)", transparent: true, roughness: 1 }, castShadow: false });
  sp("l11d-d-cabinet", { feetPosition: { x: 34.4, y: FL, z: 191.2 }, rotation: { yaw: 90 }, model: { id: NEW.cabinet, forward: "-z" }, layout: { box: { min: { x: -0.25, y: 0, z: -0.33 }, max: { x: 0.25, y: 1.35, z: 0.33 } } }, physics: { body: "static", collider: "box" }, state: { name: "Filing cabinet", items: "cells" }, tags: ["container"] });
  sp("l11d-d-memo", { feetPosition: { x: 40.5, y: FL + 1.95, z: 201.88 }, rotation: { yaw: 180 }, vector: "<svg viewBox='0 0 100 130' width='0.32m'><rect width='100' height='130' fill='#ece3c6'/><text x='8' y='14' font-family='serif' font-size='7' fill='#2a2a2a'>BACKROOMS ROBOTICS INC.</text><text x='8' y='22' font-family='serif' font-size='5' fill='#555'>Legal Dept. · April 9, 1958</text><text x='8' y='38' font-family='serif' font-size='5.5' fill='#222'>Effective at once, all R-55</text><text x='8' y='46' font-family='serif' font-size='5.5' fill='#222'>spots carry the added safety</text><text x='8' y='54' font-family='serif' font-size='5.5' fill='#222'>line. Storeroom C is closed</text><text x='8' y='62' font-family='serif' font-size='5.5' fill='#222'>pending review of test 41.</text><text x='8' y='76' font-family='serif' font-size='5.5' fill='#222'>Do not discuss Mr. Kessler</text><text x='8' y='84' font-family='serif' font-size='5.5' fill='#222'>with the press.</text><path d='M60 110 q8 -10 16 0 q6 6 14 -4' stroke='#1d3b8a' stroke-width='1.2' fill='none'/><circle cx='50' cy='4' r='2.5' fill='#8a2a1e'/></svg>" });
  // the factory floor Walt shut down: an assembly arm frozen mid-reach, the line console, a test chassis still on its crane
  sp("l11d-d-arm", { feetPosition: { x: 47.6, y: FL, z: 199.8 }, rotation: { yaw: 210 }, model: { id: "/cdn/value.e45a8b24d4e45d56f4d2c01ad261d70d356ee5584657acb2e5d22896103ac9ed.glb", forward: "-z" }, layout: { box: { min: { x: -1.2, y: 0, z: -1.2 }, max: { x: 1.2, y: 2.5, z: 1.2 } } }, physics: { body: "static", collider: "box" } });
  sp("l11d-d-console", { feetPosition: { x: 34.7, y: FL, z: 196.4 }, rotation: { yaw: 90 }, model: { id: "/cdn/value.cccf6c2955ec7543b9b147682f6f3ab6b638f4cb587bf2030be70bd062c19919.glb", forward: "-z" }, layout: { box: { min: { x: -1, y: 0, z: -0.8 }, max: { x: 1, y: 1.4, z: 0.8 } } }, physics: { body: "static", collider: "box" }, light: { kind: "point", color: "oklch(0.8 0.15 150)", intensity: 0.25, distance: 3 } });
  sp("l11d-d-hanging", { feetPosition: { x: 45.4, y: FL + 0.25, z: 193.2 }, rotation: { yaw: 160 }, model: { id: "/cdn/value.d92617d843fc1723da8e5e7d7b98ed425c2827b80fed78be756e2455b65ff3bd.glb", forward: "-z" }, layout: { box: { min: { x: -1.6, y: 0, z: -1.6 }, max: { x: 1.6, y: CEIL - FL - 0.25, z: 1.6 } } }, physics: { body: "static", collider: "box" } });
  // the tunnel camp: someone who came down after the seal, waited, and stopped waiting
  sp("l11d-a-cot", { feetPosition: { x: 7.6, y: FL, z: 100 }, rotation: { yaw: 90 }, model: { id: NEW.cot, forward: "-z" }, layout: { box: { min: { x: -0.95, y: 0, z: -0.4 }, max: { x: 0.95, y: 0.6, z: 0.4 } } }, physics: { body: "static", collider: "box" } });
  sp("l11d-a-barrel", { feetPosition: { x: 10.3, y: FL, z: 101.6 }, model: { id: NEW.barrel, forward: "-z" }, layout: { box: { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 0.9, z: 0.3 } } }, physics: { body: "static", collider: "cylinder" } });
  sp("l11d-a-ash", { feetPosition: { x: 10.3, y: FL + 0.012, z: 101.6 }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 0.7 }, material: { color: "oklch(0.18 0.01 60 / 0.7)", transparent: true, roughness: 1 }, castShadow: false });
  sp("l11d-a-tally", { feetPosition: { x: 6.82, y: FL + 1.1, z: 100.4 }, rotation: { yaw: 90 }, vector: "<svg viewBox='0 0 200 90' width='1.3m'><g stroke='#e9e2cf' stroke-width='3' stroke-linecap='round' opacity='0.8'>" + Array.from({ length: 7 }, (_, k) => `<path d='M${10 + k * 26} 12 v28 M${16 + k * 26} 12 v28 M${22 + k * 26} 12 v28 M${28 + k * 26} 12 v28 M${6 + k * 26} 36 l26 -22'/>`).join("") + "<path d='M10 54 v24 M16 54 v24 M22 54 v24'/></g><text x='60' y='75' font-family='sans-serif' font-size='13' fill='#e9e2cf' opacity='0.85'>door wont open. lights hum back</text></svg>" });
  // the one who held the cable corridor, still behind the sandbags
  sp("l11d-c-held", { feetPosition: { x: 36.6, y: FL, z: 176.6 }, rotation: { yaw: 0 }, model: { id: NEW.remains, forward: "-z" }, layout: { box: { min: { x: -0.45, y: 0, z: -0.55 }, max: { x: 0.45, y: 1.0, z: 0.55 } } }, physics: { body: "static", collider: "box" }, state: { name: "Coveralls pockets", items: "ammo" }, tags: ["container"] });
  // the reward: the R-55 prototype under glass on Walt's walnut plinth (Blender, art/l11crawl) against the east wall, lit from above.
  // The case is the container; scripts/l11-r55-case.js takes the gun off the velvet once it is lifted, and plays the reward sting.
  sp("l11d-r55-case", { tags: ["container"], feetPosition: { x: 49.35, y: FL, z: 197.3 }, rotation: { yaw: 90 }, model: { id: KIT.case, forward: "-z" }, physics: { body: "static", collider: "box" }, behavior: "scripts/l11-r55-case.js",
    state: { name: "R-55 display case", items: "weapon:raygun,cells,cells,cells", c: { x: 49.2, y: FL + 1.1, z: 197.3 } } });
  sp("l11d-r55-gun", { feetPosition: { x: 49.35, y: FL + 1.07, z: 197.3 }, rotation: { yaw: 90, roll: 90 }, model: { id: RAYGUN, forward: "-z" }, castShadow: false });
  sp("l11d-r55-spot", { feetPosition: { x: 49.0, y: CEIL - 0.15, z: 197.3 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.1, height: 0.14 }, material: { color: "oklch(0.3 0.01 60)", metalness: 0.7, emissive: "oklch(0.9 0.06 90)", emissiveIntensity: 0.4 }, castShadow: false,
    light: { kind: "spot", color: "oklch(0.93 0.06 90)", intensity: 7, distance: 6, aim: "down" } });
  sp("l11d-r55-plaque", { feetPosition: { x: 48.995, y: FL + 0.66, z: 197.3 }, rotation: { yaw: -90 }, vector: "<svg viewBox='0 0 170 60' width='0.34m'><rect width='170' height='60' fill='#b88a3a'/><text x='85' y='25' font-family='serif' font-weight='700' font-size='19' text-anchor='middle' fill='#2a1a08'>ATOMIC RAY-GUN R-55</text><text x='85' y='47' font-family='serif' font-size='12' text-anchor='middle' fill='#2a1a08'>prototype 3 of 3 · W. Kessler</text></svg>" });
}
