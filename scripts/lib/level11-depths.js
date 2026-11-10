// Level 11's depths (Shelly, Nov 10: a long crawl packed with enemies to a hidden room; smash or pick your way in).
// From the dead train's pit on the 14th St platform a service tunnel runs north (A), turns east along a flooded
// pump gallery (B), then north up a cable corridor (C) to a bricked-up doorway and a padlocked shutter: the sealed
// Backrooms Robotics storeroom (D). Inside: the R-55 ad holotape on the desk, the beat-up raygun behind a vent grate.
import MODELS from "./data/level11-models.yml";
import D from "./data/l11-depths.yml";
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
const FURN = { armchair: "/cdn/value.3e7196a1233581476ede9bfcb0b38934ec50b62b9174954d055d379c63fd73b6.glb", lamp: "/cdn/value.56e857c3fa9f839e7d3406ce7a54b6caaa028f92cfc1e5b9935ed654404c7d26.glb", shelf: "/cdn/value.918584eed8336eda888580753019763471fcce0adcaf2bc66def78f53ae3fad0.glb" };
// a caged bulkhead lamp: dim, some dead, the odd one guttering
const bulb = (sp, id, x, z, on = 1, c = "oklch(0.9 0.08 85)") => sp(id, { feetPosition: { x, y: CEIL - 0.28, z }, primitive: { kind: "sphere", radius: 0.09 }, material: { color: c, emissive: on ? c : "oklch(0.2 0 0)", emissiveIntensity: on ? 3 : 0 }, castShadow: false, visibleRange: { max: 60 },
  ...(on ? { light: { kind: "point", color: c, intensity: 1.1 * on, distance: 11 } } : {}),
  children: [{ feetPosition: { x: 0, y: 0.08, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.2, openEnded: true }, material: { color: "oklch(0.3 0.01 60)", metalness: 0.8, wireframe: true } }] });

export function layDepths(ctx, { sp, bx, cyl }) {
  const W = (id, x, z, w, d, m = CONC, h = CEIL - FL) => bx(id, x, FL, z, w, h, d, m);
  const floor = (id, x, z, w, d, m = FLOOR) => { bx(id, x, FL - 0.3, z, w, 0.3, d, m); bx(id + "-c", x, CEIL, z, w, 0.18, d, { color: "oklch(0.22 0.01 60)", roughness: 0.95 }); };
  // A: the service tunnel north of the pit, x 7..11, z 89..140
  floor("l11d-a-floor", 9, 114.5, 4.2, 51); W("l11d-a-w", 6.8, 114.5, 0.4, 51); W("l11d-a-e", 11.2, 112.5, 0.4, 47);
  for (let z = 92; z < 136; z += 4) { bx(`l11d-a-rib-${z}`, 9, CEIL - 0.25, z, 4.4, 0.25, 0.3, PIPE, { physics: "none", castShadow: false, visibleRange: { max: 50 } }); }
  cyl("l11d-a-pipe", 7.3, CEIL - 0.45, 114.5, 0.12, 0.12, 51, PIPE, { rotation: { pitch: 90 }, physics: "none", castShadow: false });
  [[95, 1], [103, 0], [111, 0.6], [119, 1], [127, 0], [134, 0.8]].forEach(([z, on], i) => bulb(sp, `l11d-a-lamp-${i}`, 9, z, on));
  sp("l11d-a-sign", { feetPosition: { x: 10.95, y: FL + 1.7, z: 92 }, rotation: { yaw: -90 }, vector: "<svg viewBox='0 0 160 60' width='1m'><rect width='160' height='60' fill='#c9b24a'/><rect x='5' y='5' width='150' height='50' fill='none' stroke='#1a1a1a' stroke-width='4'/><text x='80' y='28' font-family='sans-serif' font-size='18' text-anchor='middle' fill='#1a1a1a'>NO TRAINS</text><text x='80' y='48' font-family='sans-serif' font-size='12' text-anchor='middle' fill='#1a1a1a'>SVC TUNNEL 14-N</text></svg>" });
  sp("l11d-a-pallets", { feetPosition: { x: 10, y: FL, z: 109 }, rotation: { yaw: 20 }, model: { id: MODELS.barricade_pallets, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11d-a-spool", { feetPosition: { x: 7.8, y: FL, z: 121 }, model: { id: MODELS.ot_spool, forward: "-z" }, physics: { body: "static", collider: "box" } });
  sp("l11d-a-junk", { feetPosition: { x: 10.2, y: FL, z: 129 }, rotation: { yaw: -40 }, model: { id: MODELS.th_junk, forward: "-z" }, physics: { body: "static", collider: "box" } });
  // B: the pump gallery, z 136..144, x 7..46, a sheet of standing water
  floor("l11d-b-floor", 26.5, 140, 39.4, 8.2); W("l11d-b-s", 28.6, 135.9, 35.2, 0.4); W("l11d-b-n1", 23.4, 144.1, 33.2, 0.4); W("l11d-b-n2", 45.1, 144.1, 2.2, 0.4); W("l11d-b-e", 46.2, 140, 0.4, 8.6);
  sp("l11d-b-water", { feetPosition: { x: 28, y: FL + 0.06, z: 140 }, primitive: { kind: "plane", width: 34, height: 7.6 }, rotation: { pitch: -90 }, material: WATER, castShadow: false });
  for (const x of [15, 23, 31, 39]) sp(`l11d-b-beam-${x}`, { feetPosition: { x, y: FL, z: 136.4 }, model: { id: MODELS.ibeam, forward: "-z" }, physics: { body: "static", collider: "box" }, layout: { box: { min: { x: -0.2, y: 0, z: -0.2 }, max: { x: 0.2, y: CEIL - FL, z: 0.2 } } } });
  cyl("l11d-b-pump", 28, FL, 143, 0.8, 0.9, 1.6, { color: "oklch(0.4 0.06 150)", metalness: 0.6, roughness: 0.5 });
  cyl("l11d-b-main", 27, CEIL - 0.6, 143.4, 0.25, 0.25, 38, PIPE, { rotation: { roll: 90 }, physics: "none", castShadow: false });
  sp("l11d-b-sheet", { feetPosition: { x: 19, y: FL, z: 142.5 }, rotation: { yaw: 70 }, model: { id: MODELS.corrugated, forward: "-z" }, physics: { body: "static", collider: "box" } });
  [[13, 0.5], [21, 0], [29, 1, "oklch(0.75 0.12 140)"], [37, 0], [44, 0.7]].forEach(([x, on, c], i) => bulb(sp, `l11d-b-lamp-${i}`, x, 140, on, c));
  // C: the cable corridor north to the seal, x 40..44, z 144..190
  floor("l11d-c-floor", 42, 167, 4.2, 46); W("l11d-c-w", 39.8, 167, 0.4, 46); W("l11d-c-e", 44.2, 167, 0.4, 46);
  for (const y of [0.6, 1.0, 1.4]) cyl(`l11d-c-cable-${y}`, 43.85, FL + y, 167, 0.05, 0.05, 46, { color: "oklch(0.18 0.01 0)", roughness: 0.7 }, { rotation: { pitch: 90 }, physics: "none", castShadow: false });
  [[150, 0], [158, 0.7], [166, 0], [174, 0.5], [182, 1, "oklch(0.75 0.15 30)"], [188, 0]].forEach(([z, on, c], i) => bulb(sp, `l11d-c-lamp-${i}`, 42, z, on, c));
  sp("l11d-c-sandbags", { feetPosition: { x: 41, y: FL, z: 171 }, model: { id: MODELS.sandbags, forward: "-z" }, physics: { body: "static", collider: "box" } });
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
  // the holotape: a scuffed reel tin on the desk, beside a dead reel-to-reel
  sp("l11d-tape", { tags: ["container"], feetPosition: { x: 43.6, y: FL + 0.78, z: 199.4 }, primitive: { kind: "cylinder", radiusTop: 0.11, radiusBottom: 0.11, height: 0.04 }, material: { color: "oklch(0.6 0.04 70)", metalness: 0.8, roughness: 0.45 }, physics: { body: "static", collider: "box" },
    state: { name: "Reel tin marked R-55", items: "holo:r55" },
    children: [{ feetPosition: { x: 0, y: 0.041, z: 0 }, rotation: { pitch: -90 }, primitive: { kind: "circle", radius: 0.1 }, material: { color: "oklch(0.75 0.12 40)", roughness: 0.7 } }] });
  bx("l11d-reel", 44.6, FL + 0.78, 199.6, 0.5, 0.3, 0.32, { color: "oklch(0.3 0.03 60)", roughness: 0.6 }, { children: [-0.12, 0.12].map((x) => ({ feetPosition: { x, y: 0.3, z: 0.17 }, rotation: { pitch: 90 }, primitive: { kind: "cylinder", radiusTop: 0.1, radiusBottom: 0.1, height: 0.02 }, material: { color: "oklch(0.2 0 0)" } })) });
  sp("l11d-d-calendar", { feetPosition: { x: 45.5, y: FL + 1.5, z: 201.88 }, rotation: { yaw: 180 }, vector: "<svg viewBox='0 0 100 120' width='0.4m'><rect width='100' height='120' fill='#efe6cc'/><rect width='100' height='30' fill='#2b5d8a'/><text x='50' y='21' font-family='serif' font-size='16' text-anchor='middle' fill='#fff'>OCTOBER</text><text x='50' y='80' font-family='serif' font-size='40' text-anchor='middle' fill='#333'>1958</text><line x1='20' y1='100' x2='80' y2='108' stroke='#b3261e' stroke-width='4'/></svg>" });
  // the raygun: behind a loose vent grate low in the east wall
  bx("l11d-niche", 50.5, FL, 198.5, 0.6, 0.7, 0.9, { color: "oklch(0.12 0.01 60)", roughness: 1 });
  sp("l11d-vent", { tags: ["breakable"], feetPosition: { x: 50.0, y: FL + 0.05, z: 198.5 }, primitive: { kind: "box", width: 0.06, height: 0.6, depth: 0.8 }, material: { color: "oklch(0.55 0.02 90)", metalness: 0.7, roughness: 0.5, wireframe: false }, physics: "static", state: { mat: "fixture", name: "Loose vent grate", hp: 25, maxHp: 25, stayGone: true },
    children: [0, 1, 2, 3, 4].map((i) => ({ feetPosition: { x: -0.035, y: 0.08 + i * 0.1, z: 0 }, primitive: { kind: "box", width: 0.02, height: 0.03, depth: 0.74 }, material: { color: "oklch(0.25 0.01 90)" } })) });
  sp("l11d-raygun", { tags: ["container"], feetPosition: { x: 50.45, y: FL + 0.02, z: 198.5 }, primitive: { kind: "box", width: 0.36, height: 0.12, depth: 0.5 }, material: { color: "oklch(0.4 0.05 60)", roughness: 0.95 }, physics: { body: "static", collider: "box" },
    state: { name: "Oilcloth bundle", items: "weapon:raygun,cells,cells" } });
}
