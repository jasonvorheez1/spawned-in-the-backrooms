// Level 31's crawl ("l31crawl"): the roller rink's maintenance underbelly. One table of areas, doors, lights, props and foes;
// buildCrawl lays it all on the instance's first tick (places/l31crawl/sim.js). A new room is a row here.
import { dress } from "./lurker-kind.js";
import { TENANT, LURKER as LURKER13 } from "./level13-foes.js";
import L13 from "./data/level13.yml";
export const M = {
  warden: "/cdn/value.94bc5632e9590c097ad196a5b83bfd4da758c1c8499e6d9a0df6dbe6625a524d.glb",
  chest: "/cdn/value.d9d66e385bb64a2251cef5e114adfd8805502ea3ed3f6e210287dc92efd74331.glb",
  boiler: "/cdn/value.54be36a686fea1057f97e4649977e4627c34006ae06d8f1ab3400d8a2fbfcdd9.glb",
  belt: "/cdn/value.29234746abf9e72659110a9da9bd0dad3e68b9ba773b5d4b7a0b92feb8427d0d.glb",
  ladder: "/cdn/value.340348bf6d5da277c45245d950f1226c4d3569cf838597556ce0ae999521896e.glb",
  gen: "/cdn/value.5efbb073f3e39f9cb6d0447365f9e0721fd3caaae08892bc5bebeb841059459b.glb",
  pipes: "/cdn/value.92249c485d0e7dedf28ee43119a4683407fc4285847944d2249922e3058ba25e.glb",
};
const WALL = { texture: "cdn/texture-grimy-painted-concrete-block-wall.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.92 0.02 90)", roughness: 0.9, pbr: true };
const FLOOR = { texture: "cdn/texture-stained-wet-concrete-floor.png", wrap: "repeat", repeat: [0.4, 0.4], color: "oklch(0.9 0.01 80)", roughness: 0.75, pbr: true };
const CEIL = { texture: "cdn/texture-rusty-corrugated-metal-ceiling-panels.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.85 0.01 80)", roughness: 0.8, pbr: true };
const DOORMAT = { texture: "cdn/texture-scuffed-grey-steel-service-door.png", color: "oklch(0.95 0.01 90)", roughness: 0.6, metalness: 0.4, pbr: true };
// areas: x0..x1, z0..z1, height; open[side] = [[centre, width]]: n = z0 side, s = z1, w = x0, e = x1
export const AREAS = [
  { id: "land", x0: -4, x1: 4, z0: -4, z1: 4, h: 3.2, open: { n: [[0, 2.2]] } },
  { id: "c1", x0: -1.1, x1: 1.1, z0: -22, z1: -4, h: 2.8, open: { n: [[0, 2.2]], s: [[0, 2.2]] } },
  { id: "skates", x0: -9, x1: 9, z0: -36, z1: -22, h: 3.6, open: { s: [[0, 2.2]], e: [[-29, 2.2]] } },
  { id: "flood", x0: 9, x1: 29, z0: -30.1, z1: -27.9, h: 2.8, open: { w: [[-29, 2.2]], e: [[-29, 2.2]] } },
  { id: "boiler", x0: 29, x1: 43, z0: -37, z1: -21, h: 4.2, open: { w: [[-29, 2.2]], n: [[36, 2.2]] } },
  { id: "c3", x0: 34.9, x1: 37.1, z0: -57, z1: -37, h: 2.8, open: { n: [[36, 2.2]], s: [[36, 2.2]] } },
  { id: "gen", x0: 27, x1: 45, z0: -71, z1: -57, h: 4, open: { s: [[36, 2.2]], w: [[-64, 2.2]] } },
  { id: "c4", x0: 11, x1: 27, z0: -65.1, z1: -62.9, h: 2.8, open: { w: [[-64, 2.2]], e: [[-64, 2.2]] } },
  { id: "vault", x0: -1, x1: 11, z0: -73, z1: -55, h: 3.4, open: { e: [[-64, 2.2]] } },
];
// a door in a corridor mouth: axis "z" = the corridor runs along z (leaf spans x)
export const DOORS = [
  { id: "d1", x: 0, z: -4.15, axis: "z" }, { id: "d2", x: 9.15, z: -29, axis: "x" }, { id: "d3", x: 36, z: -37.15, axis: "z" },
  { id: "d4", x: 26.85, z: -64, axis: "x" }, { id: "d5", x: 11.15, z: -64, axis: "x" },
];
// lights: [x, z, kind] emergency = red strip, fluoro = cold tube (flick = failing)
export const LIGHTS = [
  [0, 2.5, "fluoro"], [0, -9, "emergency"], [0, -18, "emergency"], [-5, -27, "fluoro", 1], [5, -32, "emergency"],
  [14, -29, "emergency"], [23, -29, "emergency"], [36, -25, "boiler"], [33, -33, "emergency"], [36, -46, "emergency"],
  [32, -61, "fluoro", 1], [40, -67, "emergency"], [19, -64, "emergency"], [5, -60, "vault"], [5, -69, "vault"],
];
// props: [model, x, z, yaw, [w, h, d]]
export const PROPS = [
  ["belt", -4, -33.5, 0, [9, 1.3, 1.6]], ["belt", 4.5, -24.5, 180, [6, 1.3, 1.6]], ["pipes", 0, -12, -90, [2.6, 2.4, 0.8], 1, -0.95],
  ["pipes", -8.5, -27, -90, [3, 2.6, 0.8]], ["boiler", 39.5, -31, -90, [3.2, 3.6, 3.2]], ["boiler", 39.5, -25, -90, [2.6, 3, 2.6]],
  ["pipes", 36, -51, -90, [2.6, 2.4, 0.8], 1, 0.95], ["gen", 40, -63, 0, [3.6, 2.2, 1.8]], ["gen", 32, -68, 0, [3.2, 2, 1.6]],
  ["pipes", 18, -64, 0, [3, 2.4, 0.8], 1, 0, -1], ["pipes", 10.5, -60, -90, [3, 2.6, 0.8]],
];
// foes: the Rink Wardens (scripts/l31-bot.js) and Level 13's rigged walkers run by the same manager
export const BOTS = [
  { id: "w1", x: 0, z: -29, route: [[-6, -27], [6, -27], [6, -34], [-6, -34]] },
  { id: "w2", x: 33, z: -64, route: [[30, -60], [42, -60], [42, -69], [30, -69]] },
  { id: "w3", x: 42, z: -66, route: [[42, -69], [30, -69], [30, -60], [42, -60]] },
  { id: "w4", x: 5, z: -66, route: [[2, -58], [8, -58], [8, -70], [2, -70]] },
];
export const FOES = [
  { id: "lk1", kind: "lurker13", x: 32, z: -24 }, { id: "lk2", kind: "lurker13", x: 41, z: -35 },
  { id: "tn1", kind: "tenant", x: -7, z: -35 }, { id: "tn2", kind: "tenant", x: 20, z: -64 },
];
const FOE_BRAIN = { lurker13: { hp: L13.foes.lurker.hp, model: LURKER13, height: L13.foes.lurker.height, speed: 2.8, reach: 1.6, dmg: 16, cd: 1.3, name: "Hall Lurker" },
  tenant: { hp: L13.foes.tenant.hp, model: TENANT, height: L13.foes.tenant.height, speed: 2.2, reach: 1.5, dmg: 12, cd: 1.2, name: "Tenant" } };
export const REWARD = ["recipe:shock_pad", ...Array(12).fill("shock_pad")].join(",");
const box = (w, h, d) => ({ kind: "box", width: w, height: h, depth: d });

function walls(ctx, a) {
  const T = 0.3, sides = { n: [a.x0, a.x1, a.z0, "x"], s: [a.x0, a.x1, a.z1, "x"], w: [a.z0, a.z1, a.x0, "z"], e: [a.z0, a.z1, a.x1, "z"] };
  for (const [k, [lo, hi, at, run]] of Object.entries(sides)) {
    const gaps = (a.open?.[k] ?? []).map(([c, w]) => [c - w / 2, c + w / 2]).sort((p, q) => p[0] - q[0]);
    let cur = lo, n = 0;
    for (const [g0, g1] of [...gaps, [hi, hi]]) {
      if (g0 - cur > 0.05) { const L = g0 - cur, m = (cur + g0) / 2;
        ctx.spawn(`c-${a.id}-${k}${n++}`, { feetPosition: run === "x" ? { x: m, y: 0, z: at } : { x: at, y: 0, z: m }, primitive: run === "x" ? box(L + T, a.h, T) : box(T, a.h, L + T), material: WALL, physics: "static", castShadow: false }); }
      cur = Math.max(cur, g1);
    }
  }
  const w = a.x1 - a.x0, d = a.z1 - a.z0, c = { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 };
  ctx.spawn(`c-${a.id}-floor`, { feetPosition: { ...c, y: -0.3 }, primitive: box(w + 0.3, 0.3, d + 0.3), material: FLOOR, physics: "static", castShadow: false });
  ctx.spawn(`c-${a.id}-ceil`, { feetPosition: { ...c, y: a.h }, primitive: box(w + 0.3, 0.25, d + 0.3), material: CEIL, physics: "static", castShadow: false });
}
function door(ctx, d) {
  const along = d.axis === "z", h = 2.3, H = 2.8;
  const at = (o, y = 0) => (along ? { x: d.x + o, y, z: d.z } : { x: d.x, y, z: d.z + o });
  const sz = (w, hh) => (along ? box(w, hh, 0.25) : box(0.25, hh, w));
  ctx.spawn(`c-${d.id}-l`, { feetPosition: at(-0.85), primitive: sz(0.5, H), material: WALL, physics: "static", castShadow: false });
  ctx.spawn(`c-${d.id}-r`, { feetPosition: at(0.85), primitive: sz(0.5, H), material: WALL, physics: "static", castShadow: false });
  ctx.spawn(`c-${d.id}-top`, { feetPosition: at(0, h), primitive: sz(1.2, H - h), material: WALL, physics: "static", castShadow: false });
  ctx.spawn(`c-${d.id}`, { tags: ["usable", "l31c-door"], feetPosition: at(-0.6 + 0.6), pivot: along ? [0, 0.5, 0.5] : [0.5, 0.5, 0], rotation: { yaw: 0 },
    primitive: along ? box(1.2, h, 0.06) : box(0.06, h, 1.2), material: DOORMAT, physics: "kinematic", behavior: "scripts/l31c-door.js", state: { name: "Service Door", verb: "Open", open: false, yaw: 0 } });
}
function light(ctx, [x, z, kind, flick], i) {
  const a = AREAS.find((r) => x >= r.x0 - 0.2 && x <= r.x1 + 0.2 && z >= r.z0 - 0.2 && z <= r.z1 + 0.2), y = (a?.h ?? 3) - 0.08;
  const L = { emergency: ["#ff3a22", 5, 9], fluoro: ["#cfe8ff", 9, 12], boiler: ["#ff9a3a", 10, 13], vault: ["#ffd9a0", 8, 11] }[kind];
  ctx.spawn(`c-lt${i}`, { tags: flick ? ["l31c-flicker"] : [], feetPosition: { x, y: y - 0.06, z }, primitive: kind === "emergency" ? box(0.9, 0.06, 0.12) : box(1.2, 0.06, 0.2),
    material: { color: L[0], emissive: L[0], emissiveIntensity: kind === "emergency" ? 3 : 2.2 }, castShadow: false,
    children: [{ feetPosition: { x: 0, y: -0.3, z: 0 }, light: { kind: "point", color: L[0], intensity: L[1], distance: L[2] } }], state: { base: L[1] } });
}
export function buildCrawl(ctx) {
  for (const a of AREAS) walls(ctx, a);
  for (const d of DOORS) door(ctx, d);
  LIGHTS.forEach((l, i) => light(ctx, l, i));
  PROPS.forEach(([m, x, z, yaw, [w, h, d], wallY], i) => ctx.spawn(`c-p${i}`, { feetPosition: { x, y: wallY ? 0.3 : 0, z }, rotation: { yaw }, model: { id: M[m], forward: "+x" },
    layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, physics: wallY ? undefined : { body: "static", collider: "box" } }));
  // the flood: a black sheet of water over the corridor floor
  ctx.spawn("c-water", { feetPosition: { x: 19, y: 0.22, z: -29 }, primitive: { kind: "plane", width: 20, height: 2.2 }, rotation: { pitch: -90 }, material: { kind: "water", color: "#0d1814", opacity: 0.85, waveIntensity: 0.25 } });
  // the bed: hum, drips, the rink upstairs, the boiler, the generator
  ctx.spawn("c-hum", { feetPosition: { x: 0, y: 1, z: 0 }, audio: { clip: "/cdn/moodboard-realistic-gritty/ambience-basement-fluorescent-electrical-hum-loop.mp3", gain: 0.12, loop: true, spatial: false, bus: "Ambience" } });
  ctx.spawn("c-rink", { feetPosition: { x: 0, y: 1, z: 0 }, audio: { clip: "/cdn/music-muffled-1980s-roller-rink-disco-pop-heard-through-concrete-ceiling-loop.mp3", gain: 0.08, loop: true, spatial: false, bus: "Ambience" } });
  ctx.spawn("c-drip", { feetPosition: { x: 19, y: 1.5, z: -29 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-water-drips-into-puddle-echoing-concrete-tunnel-loop.mp3", gain: 0.3, loop: true, spatial: true, maxDistance: 20 } });
  ctx.spawn("c-boil", { feetPosition: { x: 39, y: 1.5, z: -28 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-old-boiler-rumble-and-steam-hiss-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 22 } });
  ctx.spawn("c-genhum", { feetPosition: { x: 36, y: 1.2, z: -65 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-diesel-generator-idling-rumble-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 22 } });
  // in and out
  ctx.spawn("crawl-from-l31", { feetPosition: { x: 0, y: 0.1, z: 2 }, rotation: { yaw: 0 } });
  ctx.spawn("c-ladder-in", { feetPosition: { x: 0, y: 0, z: 3.7 }, rotation: { yaw: 90 }, model: { id: M.ladder, forward: "+x" }, layout: { box: { min: { x: -0.25, y: 0, z: -0.4 }, max: { x: 0.25, y: 3.2, z: 0.4 } } } });
  ctx.spawn("c-ladder-out", { feetPosition: { x: -0.6, y: 0, z: -64 }, rotation: { yaw: 0 }, model: { id: M.ladder, forward: "+x" }, layout: { box: { min: { x: -0.25, y: 0, z: -0.4 }, max: { x: 0.25, y: 3.4, z: 0.4 } } } });
  ctx.spawn("crawl-back", { tags: ["usable"], feetPosition: { x: -0.4, y: 0, z: -64 }, primitive: box(0.8, 2.4, 1.0), visible: false, physics: { body: "static" }, behavior: "scripts/level-door.js", state: { to: "level31#l31-from-crawl", name: "Service Ladder", verb: "Climb up" } });
  ctx.spawn("c-chest", { tags: ["container"], feetPosition: { x: 5, y: 0, z: -71.8 }, rotation: { yaw: 90 }, model: { id: M.chest, forward: "+x" }, layout: { box: { min: { x: -0.45, y: 0, z: -0.6 }, max: { x: 0.45, y: 0.8, z: 0.6 } } }, physics: { body: "static", collider: "box" }, state: { name: "Prize Locker", cap: 30, items: REWARD } });
  // foes, and the one manager that moves them
  ctx.spawn("c-brain", { feetPosition: { x: 0, y: 0, z: 0 }, behavior: "scripts/l31-bot.js" });
  for (const b of BOTS) ctx.spawn(`c-${b.id}`, { tags: ["l31bot", "l8-hostile", "foe"], feetPosition: { x: b.x, y: 0.05, z: b.z }, model: { id: M.warden, forward: "+x" },
    layout: { box: { min: { x: -0.45, y: 0, z: -0.45 }, max: { x: 0.45, y: 1.8, z: 0.45 } } }, physics: { body: "character", collider: "capsule" },
    state: { hp: 140, maxHp: 140, name: "Rink Warden", kind: "warden", xp: 60, route: b.route, leg: 0 } });
  for (const f of FOES) { const B = FOE_BRAIN[f.kind];
    const o = ctx.spawn(`c-${f.id}`, { tags: ["l31foe", "l8-hostile", f.kind === "lurker13" ? "bay-lurker13" : "foe"], feetPosition: { x: f.x, y: 0.05, z: f.z }, model: { id: B.model, forward: "+x" },
      layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: B.height, z: 0.6 } } }, physics: { body: "character", collider: "capsule" },
      state: { hp: B.hp, maxHp: B.hp, name: B.name, kind: f.kind, xp: 30, brain: { speed: B.speed, reach: B.reach, dmg: B.dmg, cd: B.cd, rig: 1 } } });
    if (f.kind === "lurker13") { const h = ctx.getObject(o); if (h) try { dress(ctx, h, "yellow"); } catch {} } }
}
