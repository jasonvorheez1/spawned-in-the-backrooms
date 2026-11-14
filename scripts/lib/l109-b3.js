// Level 109 "B3": the sealed sub-basement under the arrival hall (Shelly, Nov 14: a small dungeon with a rocket launcher, in tune with the lore).
// The story it tells: M.E.G. ran a forward cache down here while they mapped the hospital, lost the floor to hounds breeding
// in the morgue drawers, shut the morgue door behind them and left the armory cage as it stood. The hounds are still shut in
// (the level's containment rule: only a player's hand opens a door); the cage still holds the M72 and a crate of rockets.
// Built once per room at a fixed spot 14 m under the arrival corridor; the stairwell door above stands on its west wall.
import { rotate } from "builtin/vec3";
import { corridor, segInfo, SEG, W, WALL, DOOR_W, DOOR_H } from "./level109.js";
import { weaponBody } from "./weapon-look.js";
export const O = { x: 8, y: -14, z: 40 }; // B3's origin: the foot of the stairs
const GEO = "scripts/levelrun-geo.js", CON = "cdn/texture-stained-grey-poured-concrete-wall-with-water-streaks.png", FLOOR = "cdn/texture-cracked-grey-concrete-floor-with-dark-drain-stains.png";
const CRATE = "/cdn/value.64a96b8ea948f646874ae3d6f6e3f8139fcef1699363a1eb7523a8d82f929995.glb", GURNEY = "/cdn/value.b1dc5ac5f129a0ca27a2aa8cf1add8087d64608161472c14347ebd5d390680e2.glb";
const WHEEL = "/cdn/value.dc40bdd97768cd902f5f5dbea8acfadc2c2eba260056263a501dea2748271c87.glb", BARRIER = "/cdn/value.6fd26f2cc265c1174759fccdad8b29f8f296ca33a021036e7aa953c658e3749b.glb";
const EXT = "/cdn/value.3ef36fc8ed3797c2da4a033df5cbd59dae385b6c2480e1adc53495d0939d0267.glb", LAMP = "/cdn/value.56e857c3fa9f839e7d3406ce7a54b6caaa028f92cfc1e5b9935ed654404c7d26.glb";
export const MORGUE = { x0: O.x - 8.5, x1: O.x - 1.5, z0: O.z + 10, z1: O.z + 18 };
export const LANDING = { x: O.x, y: O.y + 0.1, z: O.z + 1.6 };
const INV = { visible: false, physics: "static", castShadow: false };
const P = (x, y, z) => ({ x: O.x + x, y: O.y + y, z: O.z + z });
let YAW = null;
export function yawFor(dx, dz) { YAW ??= [0, 90, 180, 270].map((y) => ({ y, d: rotate({ yaw: y }, { x: 1, y: 0, z: 0 }) })); let b = YAW[0], bd = -9; for (const c of YAW) { const d = c.d.x * dx + c.d.z * dz; if (d > bd) { bd = d; b = c; } } return b.y; }
const box = (x0, x1, y0, y1, z0, z1) => ({ ...INV, feetPosition: P((x0 + x1) / 2, y0, (z0 + z1) / 2), primitive: { kind: "box", width: x1 - x0, height: y1 - y0, depth: z1 - z0 } });
// where the stairwell door stands upstairs: the first plain stretch of the arrival corridor's west wall past the spawn
export function stairDoorAt(seed) {
  const c = corridor(seed, "ns", 0);
  for (let k = 1; k < 8; k++) { const g = segInfo(seed, c, k).gaps; if (!g.some((q) => q.side < 0)) return { x: c.c - W / 2 - WALL / 2, z: k * SEG + SEG / 2 + 3, k }; }
  return { x: c.c - W / 2 - WALL / 2, z: 27 };
}
const RED = (on) => ({ kind: "point", color: "#ff3a26", intensity: on, distance: 9, shadow: { enabled: false } });
const WARM = { kind: "point", color: "#ffe2b0", intensity: 1.6, distance: 9, shadow: { enabled: false } };
export function buildB3(ctx, seed) {
  const sp = (id, spec) => ctx.spawn("b3-" + id, { audience: "all", ...spec, tags: ["l109-b3", ...(spec.tags ?? [])] });
  const hall = (id, at, w, d, walls, gaps, ch = 2.7) => sp(id, { feetPosition: P(at.x, 0, at.z), castShadow: false, physics: "none", material: { pbr: true },
    primitive: { kind: "scripted", script: GEO, params: { part: "hall", w, d, h: 3.0, ceil: ch, walls, gaps, seed: 11 + w, tone: "b3", conduit: true, trail: false, floorTex: FLOOR, wallTex: CON } } });
  // the shells: stair hall (3 x 30), morgue (7 x 8) off its west wall, armory (9 x 10) at its far end
  hall("hall", { x: 0, z: 15 }, 3, 30, "nsew", [{ wall: "w", c: 16, w: DOOR_W, h: DOOR_H, kind: "thru" }, { wall: "s", c: 1.5, w: 2.2, h: 2.5, kind: "pass" }]);
  hall("morgue", { x: -5, z: 14 }, 7, 8, "nsew", [{ wall: "e", c: 4, w: DOOR_W, h: DOOR_H, kind: "thru" }], 2.6);
  hall("armory", { x: 0, z: 40 }, 20, 20, "nsew", [{ wall: "n", c: 10, w: 2.2, h: 2.5, kind: "pass" }], 2.9);
  // colliders: floors, ceilings, walls split round each opening
  const C = [box(-1.5, 1.5, -0.3, 0, 0, 30), box(-1.5, 1.5, 2.7, 2.9, 0, 30), box(-8.5, -1.5, -0.3, 0, 10, 18), box(-8.5, -1.5, 2.6, 2.8, 10, 18), box(-10, 10, -0.3, 0, 30, 50), box(-10, 10, 2.9, 3.1, 30, 50),
    box(-1.7, 1.7, 0, 2.7, -0.2, 0), box(1.5, 1.7, 0, 2.7, 0, 30), box(-1.7, -1.5, 0, 2.7, 0, 13.5), box(-1.7, -1.5, 0, 2.7, 14.5, 30), box(-1.7, -1.5, DOOR_H, 2.7, 13.5, 14.5),
    box(-8.7, -1.7, 0, 2.6, 9.8, 10), box(-8.7, -1.7, 0, 2.6, 18, 18.2), box(-8.7, -8.5, 0, 2.6, 10, 18),
    box(-10.2, -1.1, 0, 2.9, 29.8, 30), box(1.1, 10.2, 0, 2.9, 29.8, 30), box(-10.2, 10.2, 0, 2.9, 50, 50.2), box(-10.2, -10, 0, 2.9, 30, 50), box(10, 10.2, 0, 2.9, 30, 50)];
  C.forEach((c, i) => sp("c" + i, c));
  // light: dead troffers, red emergency cages that breathe, one warm work lamp M.E.G. left burning in the armory
  for (const z of [3, 9, 15, 21, 27]) sp("lt" + z, { feetPosition: P(0, 2.66, z), castShadow: false, primitive: { kind: "box", width: 0.6, height: 0.04, depth: 1.2 }, material: { color: "#5f5d55", roughness: 0.8 } });
  for (const [i, z] of [[0, 2], [1, 12], [2, 22], [3, 28.6]].map(([i, z]) => [i, z])) sp("em" + i, { feetPosition: P(1.42, 2.25, z), castShadow: false, behavior: "scripts/b3-use.js", state: { kind: "emergency", base: 1.1, ph: i * 1.7 },
    primitive: { kind: "box", width: 0.12, height: 0.14, depth: 0.28 }, material: { color: "#ff3a26", emissive: "#ff2a16", emissiveIntensity: 2.2 }, light: RED(1.1) });
  sp("em-m", { feetPosition: P(-8.4, 2.1, 14), castShadow: false, behavior: "scripts/b3-use.js", state: { kind: "emergency", base: 0.7, ph: 4 }, primitive: { kind: "box", width: 0.12, height: 0.14, depth: 0.28 }, material: { color: "#ff3a26", emissive: "#ff2a16", emissiveIntensity: 2 }, light: RED(0.7) });
  sp("worklamp", { feetPosition: P(3.4, 0, 38.6), rotation: { yaw: 210 }, model: { id: LAMP }, layout: { box: { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 1.7, z: 0.3 } } }, physics: "static", light: { ...WARM, intensity: 2.4, distance: 12 } });
  for (const [x, z] of [[-3, 33], [3, 33], [-3, 37.5], [0, 31.5]]) sp(`at${x}_${z}`, { feetPosition: P(x, 2.86, z), castShadow: false, primitive: { kind: "box", width: 1.2, height: 0.04, depth: 0.6 }, material: x === 0 ? { color: "#fffbe8", emissive: "#fff3d0", emissiveIntensity: 1.8 } : { color: "#5f5d55" }, ...(x === 0 ? { light: { ...WARM, intensity: 1.2, distance: 8 } } : {}) });
  // the stairs' foot: the door back up, the floor stencil, the M.E.G. order taped to the wall
  sp("updoor", { tags: ["usable"], feetPosition: P(-0.5, 0, 0.06), rotation: { yaw: yawFor(1, 0) }, physics: { body: "static", collider: "box" }, material: { pbr: true }, behavior: "scripts/b3-use.js",
    primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "metal", part: "leaf", w: DOOR_W, h: DOOR_H, hingeSide: "left", swing: 1, seed: 3 } }, state: { kind: "b3-up", name: "Stairwell", verb: "Go Up", info: "back to the hospital" } });
  sp("stencil", { feetPosition: P(1.48, 1.55, 3), rotation: { yaw: yawFor(0, -1) }, castShadow: false, vector: "<svg viewBox='0 0 200 120' width='1.1m'><text x='100' y='92' text-anchor='middle' font-family='display' font-size='104' font-weight='900' fill='#cfc9b4' fill-opacity='0.78'>B3</text></svg>" });
  sp("order", { tags: ["usable"], feetPosition: P(-1.47, 1.35, 8), rotation: { yaw: yawFor(0, 1) }, castShadow: false, behavior: "scripts/b3-use.js", state: { kind: "b3-order", name: "Taped notice", verb: "Read" },
    vector: "<svg viewBox='0 0 210 280' width='0.42m'><rect x='4' y='6' width='202' height='270' fill='#e8e2cc'/><rect x='70' y='0' width='70' height='16' fill='#c9bf8a' fill-opacity='0.8'/><text x='105' y='52' text-anchor='middle' font-family='sans-serif' font-size='26' font-weight='900' fill='#1d2a1d'>M.E.G.</text><text x='105' y='86' text-anchor='middle' font-family='sans-serif' font-size='17' font-weight='700' fill='#5a1410'>SUB-LEVEL B3 CLOSED</text><text x='105' y='122' text-anchor='middle' font-family='sans-serif' font-size='13' fill='#2a2a22'>Cache compromised.</text><text x='105' y='142' text-anchor='middle' font-family='sans-serif' font-size='13' fill='#2a2a22'>Armed survivor ahead.</text><text x='105' y='162' text-anchor='middle' font-family='sans-serif' font-size='13' fill='#2a2a22'>Use the cover.</text><text x='105' y='182' text-anchor='middle' font-family='sans-serif' font-size='13' fill='#2a2a22'>Morgue stays shut.</text><text x='105' y='240' text-anchor='middle' font-family='sans-serif' font-size='11' fill='#55554a'>ORDER 109-C</text></svg>" });
  // the hall as they left it: a gurney shoved against the wall, a tipped wheelchair, the barrier they never finished
  sp("gurney", { feetPosition: P(0.9, 0, 6.5), rotation: { yaw: 92 }, model: { id: GURNEY }, layout: { box: { min: { x: -0.35, y: 0, z: -1 }, max: { x: 0.35, y: 0.9, z: 1 } } }, physics: "static" });
  sp("wheel", { feetPosition: P(-0.9, 0, 19.5), rotation: { yaw: 140, roll: 78 }, pivot: "center", model: { id: WHEEL }, layout: { box: { min: { x: -0.33, y: 0, z: -0.4 }, max: { x: 0.33, y: 0.95, z: 0.4 } } }, physics: "static" });
  sp("barrier", { feetPosition: P(0.75, 0, 26.5), rotation: { yaw: 20 }, model: { id: BARRIER }, layout: { box: { min: { x: -0.6, y: 0, z: -0.25 }, max: { x: 0.6, y: 1.0, z: 0.25 } } }, physics: "static" });
  sp("ext", { feetPosition: P(1.3, 0, 13.2), model: { id: EXT }, layout: { box: { min: { x: -0.1, y: 0, z: -0.1 }, max: { x: 0.1, y: 0.55, z: 0.1 } } }, physics: "static" });
  // the morgue: the door they shut (a containment door like the floors above), the drawer wall, a slab
  const md = { x: O.x - 1.5 - WALL / 2 + 0.1, z: O.z + 14 };
  sp("mdoor", { tags: ["usable", "pen-door"], feetPosition: { x: md.x, y: O.y, z: md.z - DOOR_W / 2 }, rotation: { yaw: yawFor(0, 1) + 0 }, physics: { body: "kinematic", collider: "box" }, material: { pbr: true }, behavior: "scripts/pen-door.js",
    primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { style: "metal", part: "leaf", w: DOOR_W, h: DOOR_H, hingeSide: "left", swing: 1, seed: 9 } },
    state: { pen: "b3-morgue", open: false, baseYaw: yawFor(0, 1), openYaw: (() => { let d = yawFor(-1, 0) - yawFor(0, 1); if (d > 180) d -= 360; if (d < -180) d += 360; return d; })(), c: { x: md.x, y: O.y, z: md.z }, kind: "metal", name: "Morgue", verb: "Open Door" } });
  sp("mplate", { feetPosition: P(-1.38, 2.25, 14), rotation: { yaw: yawFor(0, -1) }, castShadow: false, vector: "<svg viewBox='0 0 220 50' width='0.55m'><rect x='2' y='2' width='216' height='46' rx='4' fill='#2a2f28' stroke='#9fa58f' stroke-width='3'/><text x='110' y='35' text-anchor='middle' font-family='sans-serif' font-size='26' font-weight='800' fill='#d8d4c0'>MORGUE</text></svg>" });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const openD = r === 1 && c === 2;
    sp(`dr${r}_${c}`, { feetPosition: P(-8.42, 0.35 + r * 0.72, 11.2 + c * 0.82), castShadow: false, primitive: { kind: "box", width: 0.08, height: 0.64, depth: 0.74 }, material: { color: openD ? "#5b5f5a" : "#9aa09a", metalness: 0.8, roughness: 0.35 },
      ...(openD ? { tags: ["container"], feetPosition: P(-8.0, 0.35 + r * 0.72, 11.2 + c * 0.82), state: { items: "bandage,battery,bobbypin,page:102,cash:25", name: "Open Morgue Drawer", verb: "Search", kind: "metal" } } : {}) });
  }
  sp("slab", { feetPosition: P(-5, 0, 14), physics: "static", primitive: { kind: "box", width: 0.8, height: 0.9, depth: 2.0 }, material: { color: "#a7aca6", metalness: 0.85, roughness: 0.3 } });
  // the armory: chain-link cage across the back, rack, launcher, the rocket crate, the cache's last tape
  // Broken cage panels provide cover with a clear route through the middle.
  // cover: road barriers M.E.G. dragged down here, two per side (Shelly: nothing blocky)
  for (const [i, x] of [-6.7, 6.7].entries()) for (const k of [0, 1]) sp("cover" + i + (k ? "b" : ""), { feetPosition: P(x + (k ? 0.95 : -0.95), 0, 39 + (k ? 0.15 : -0.1)), rotation: { yaw: k ? 6 : -4 }, model: { id: BARRIER }, layout: { box: { min: { x: -0.95, y: 0, z: -0.25 }, max: { x: 0.95, y: 1.0, z: 0.25 } } }, physics: "static" });
  sp("stencil2", { feetPosition: P(0, 1.95, 49.78), rotation: { yaw: yawFor(0, -1) }, castShadow: false, vector: "<svg viewBox='0 0 300 60' width='1.4m'><text x='150' y='46' text-anchor='middle' font-family='display' font-size='44' font-weight='900' fill='#e6e0c8' fill-opacity='0.85'>M.E.G. ARMORY 109</text></svg>" });
  sp("crate", { tags: ["container"], feetPosition: P(6.8, 0, 47.4), rotation: { yaw: 12 }, model: { id: CRATE }, layout: { box: { min: { x: -0.5, y: 0, z: -0.35 }, max: { x: 0.5, y: 0.65, z: 0.35 } } }, physics: "static",
    state: { items: "rockets,rockets,rockets,ammo", name: "M.E.G. munitions crate", verb: "Search", kind: "metal" } });
  sp("crate2", { tags: ["container"], feetPosition: P(-6.8, 0, 47.2), rotation: { yaw: -80 }, model: { id: CRATE }, layout: { box: { min: { x: -0.5, y: 0, z: -0.35 }, max: { x: 0.5, y: 0.65, z: 0.35 } } }, physics: "static",
    state: { items: "bandage,battery,ration", name: "M.E.G. field crate", verb: "Search", kind: "metal" } });
  sp("tape", { tags: ["usable"], feetPosition: P(-6.4, 0.66, 46.0), castShadow: false, behavior: "scripts/b3-use.js", primitive: { kind: "box", width: 0.12, height: 0.03, depth: 0.08 }, material: { color: "#1b1b1b", roughness: 0.5 }, state: { kind: "b3-tape", name: "Tape", verb: "Play", info: "B3 cache log" } });
  sp("table", { feetPosition: P(-6.4, 0, 46.2), physics: "static", primitive: { kind: "box", width: 1.4, height: 0.66, depth: 0.7 }, material: { color: "#55594a", metalness: 0.4, roughness: 0.6 } });
  sp("breaker", { tags: ["usable"], feetPosition: P(9.92, 1.07, 34.0), rotation: { yaw: yawFor(0, -1) }, castShadow: false, behavior: "scripts/b3-use.js",
    model: { id: "/cdn/value.98cc7a5e38b998052fe8227c519a305f173d1ae956e559356ebe72214dccef4c.glb", forward: "+z" }, layout: { box: { min: { x: -0.22, y: 0, z: -0.12 }, max: { x: 0.22, y: 0.56, z: 0 } } },
    state: { kind: "b3-breaker", name: "Armory Flood Switch", verb: "Restore Lights", info: "dead ceiling bank", on: false, c: P(9.85, 1.35, 34.0) } });
}
// the launcher itself rides apart: placed once in the room's life, gone for good once a hand lifts it
export function placeLauncher(ctx) {
  return; // Shelly Nov 14: the launcher board "isnt needed anymore"
  ctx.spawn("b3-m72", { audience: "all", tags: ["weapon", "l109-b3"], state: { kind: "m72" }, feetPosition: P(0, 1.2, 49.0), rotation: { yaw: yawFor(1, 0), roll: 0 }, castShadow: false, ...weaponBody("m72") });
}


// Shelly Nov 14: "i would like the big open space to feel more lively". M.E.G.'s last camp in the armory, the building still breathing around it.
const COT = "/cdn/value.8bdde9f497a06819a0029f9df982d9a2a35c190e91291c4e23ac390e0b66af17.glb", WETSIGN = "/cdn/value.742c7982fd6cd877888746f4dc24cb56395f26e7d33b01a46d4455a0cdc6a39c.glb";
const LANTERN = "/cdn/value.c10572b2de804fd98cf1690adb38d1337fc5d9a43e100401319716ff9611058b.glb", CANISTER = "/cdn/value.f6da85fb2964fae153be333cecccc61db1a0a412645c25de98f495b18824ec7b.glb";
const DUST = `fx
pop motes n=?mobile:40|90 on=box(3.5,1.2,3.5).c(1.3) life=6..10 v=sdir()*.03 size=.006..0.014 acc=curl(.15)*.05+drag(.5) col=<1.5,1.25,.9> a=0>.2:.55>.8:.55>0 r=sprite(mote,add)`;
const DRIP = `fx
pop drop rate=flick(.6,.5)*1.6 on=point() life=.76 v=up(-.2) size=.012..0.016 acc=grav() col=<.65,.7,.75> a=.85 r=sprite(droplet,alpha,velocity,.03)
pop ring on=@drop life=.6..0.9 v=sdir()*.01 size=.06 sz=$size*(.4>3.4) col=<.55,.6,.65> a=.45>0 r=sprite(soft-disc,alpha)`;
const STEAM = `fx
pop jet rate=flick(.3,.5)*24 on=point() life=1..1.8 v=<-1,0,0>*(1.4..2.4)+sdir()*.2 size=.07..0.12 acc=buoy(.6)+curl(.4)+drag(1.4) sz=$size*(.5>5) col=<.82,.82,.8> a=0>.1:.32>.6:.12>0 rot=spin(.2) r=sprite(smoke-puff,alpha)`;
const SPARK = `fx
pop spit rate=flick(.35,1)*14 on=point() life=.3..0.7 v=up(-.4)+sdir()*(1..2.4) size=.01..0.02 acc=grav() col=hdr(6,3.6,1.3) a=1>0 r=sprite(ember,add,velocity,.03)
pop arc n=1 at=point() r=light(<.6,.75,1>,1.6*flick(.35,1),3)`;
const FLAME = `fx
pop wick n=1 at=point() r=light(<1,.6,.3>,1.1*flick(3,.12),5)`;
const TALLY = "<svg viewBox='0 0 420 200' width='1.6m'><g stroke='#2b2a24' stroke-width='6' stroke-linecap='round' opacity='0.85'>" +
  Array.from({ length: 8 }, (_, g) => { const x = 14 + g * 50; return `<path d='M${x} 20 L${x} 90 M${x + 9} 22 L${x + 9} 92 M${x + 18} 20 L${x + 18} 88 M${x + 27} 21 L${x + 27} 90 M${x - 4} 80 L${x + 33} 30'/>`; }).join("") +
  "<path d='M14 120 L14 186 M23 122 L23 184'/></g><text x='300' y='180' font-family='sans-serif' font-size='30' font-weight='700' fill='#2b2a24' fill-opacity='0.8'>DAY 42</text></svg>";
const WARN = "<svg viewBox='0 0 520 120' width='2.4m'><text x='260' y='78' text-anchor='middle' font-family='display' font-size='62' font-weight='900' fill='#8a1d12' fill-opacity='0.82'>THEY HEAR THE DOORS</text></svg>";
const MAP = "<svg viewBox='0 0 300 220' width='0.75m'><rect x='4' y='4' width='292' height='212' fill='#ddd5b8'/><g stroke='#3a4a6a' stroke-width='3' fill='none'><path d='M30 180 L30 40 L140 40 L140 110 L260 110'/><path d='M140 75 L200 75 L200 30'/><circle cx='200' cy='30' r='9'/></g><path d='M190 20 L210 40 M210 20 L190 40' stroke='#a01c12' stroke-width='4'/><text x='34' y='206' font-family='sans-serif' font-size='18' fill='#3a3a32'>B3 / ARMORY / EXIT?</text></svg>";
export function dressB3(ctx) {
  const sp = (id, spec) => ctx.spawn("b3-" + id, { audience: "all", ...spec, tags: ["l109-b3", "b3-dress", ...(spec.tags ?? [])] });
  const m = (id, model, x, z, yaw, size, extra = {}) => sp(id, { feetPosition: P(x, extra.y ?? 0, z), rotation: { yaw }, model: { id: model }, layout: { box: { min: { x: -size[0] / 2, y: 0, z: -size[2] / 2 }, max: { x: size[0] / 2, y: size[1], z: size[2] / 2 } } }, physics: "static", ...extra, y: undefined });
  // the camp against the west wall: two cots, a lantern still lit on the floor between them, the gas they cooked on
  m("cot0", COT, -8.6, 43.6, 90, [1.9, 0.5, 0.68]); m("cot1", COT, -8.6, 41.2, 84, [1.9, 0.5, 0.68]);
  m("lantern", LANTERN, -8.5, 42.4, 30, [0.2, 0.34, 0.2], { physics: "none", fx: { script: FLAME } });
  m("can0", CANISTER, -9.4, 45.4, 0, [0.32, 0.6, 0.32]); m("can1", CANISTER, -9.1, 45.9, 40, [0.32, 0.6, 0.32]);
  sp("tally", { feetPosition: P(-9.96, 1.5, 42.4), rotation: { yaw: yawFor(1, 0) }, castShadow: false, vector: TALLY });
  sp("map", { feetPosition: P(-9.96, 1.55, 38.6), rotation: { yaw: yawFor(1, 0) }, castShadow: false, vector: MAP });
  sp("warn", { feetPosition: P(9.96, 1.75, 40), rotation: { yaw: yawFor(-1, 0) }, castShadow: false, vector: WARN });
  // the leak: water through the ceiling tiles into a spreading puddle, a wet-floor sign somebody still bothered with
  sp("puddle", { feetPosition: P(2.2, 0.012, 45.2), rotation: { pitch: -90 }, castShadow: false, receiveShadow: false, primitive: { kind: "circle", radius: 1.15, segments: 40 }, material: { kind: "water", color: "#2c3134", opacity: 0.72, waveIntensity: 0.15 } });
  sp("drip", { feetPosition: P(2.2, 2.86, 45.2), castShadow: false, fx: { script: DRIP }, audio: { clip: "cdn/sfx-slow-water-drips-into-shallow-puddle-on-concrete-echo-loop.mp3", loop: true, gain: 0.35, spatial: true, refDistance: 1.5, maxDistance: 14 } });
  m("wet", WETSIGN, 3.6, 44.1, 205, [0.3, 0.62, 0.4]);
  // a pipe run down the east wall, cracked at one flange and hissing
  sp("pipe", { feetPosition: P(9.72, 2.5, 40), rotation: { pitch: 90 }, pivot: "center", castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 20, radialSegments: 14 }, material: { color: "#4f534c", metalness: 0.7, roughness: 0.45 } });
  for (const z of [33, 38, 43.5, 48]) sp("flange" + z, { feetPosition: P(9.72, 2.5, z), rotation: { pitch: 90 }, pivot: "center", castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.1, radiusBottom: 0.1, height: 0.05, radialSegments: 14 }, material: { color: "#3e413b", metalness: 0.75, roughness: 0.4 } });
  sp("steam", { feetPosition: P(9.62, 2.5, 43.5), castShadow: false, fx: { script: STEAM }, audio: { clip: "cdn/sfx-steam-hissing-from-cracked-pipe-flange-loop.mp3", loop: true, gain: 0.28, spatial: true, refDistance: 1.5, maxDistance: 16 } });
  // a ceiling cable torn loose, still live
  sp("cable", { feetPosition: P(-4, 2.2, 36.5), castShadow: false, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: 0.7, radialSegments: 6 }, material: { color: "#151515", roughness: 0.6 } });
  sp("spark", { feetPosition: P(-4, 2.2, 36.5), castShadow: false, fx: { script: SPARK }, audio: { clip: "cdn/sfx-live-electrical-wire-crackle-and-buzz-short-arcs-loop.mp3", loop: true, gain: 0.22, spatial: true, refDistance: 1, maxDistance: 12 } });
  // dust hanging in the work lamp's cone; the room's own bed: the building settling around a sub-basement
  sp("dust", { feetPosition: P(2.6, 0.2, 39.4), castShadow: false, fx: { script: DUST } });
  sp("bed", { feetPosition: P(0, 1.5, 40), castShadow: false, audio: { clip: "cdn/ambience-flooded-hospital-sub-basement-air-handler-drone-distant-pipe-groans-loop.mp3", loop: true, gain: 0.18, spatial: true, refDistance: 8, maxDistance: 26 } });
}
