// The Test Range (Shelly, Nov 10): one hall, six stations. Built once (builtV), then every test item refills a few seconds after it's taken.
// West: the armory, every weapon in weapons.yml on tables + the ammo locker. North: the firing lane with smiler/lurker pads.
// East: the physics bay (loose props, reset pad). South-east: workbench + parts bin. South-west: the break fridge with every consumable.
// Centre-south: interactables (hinged door, light switch, seat, cabinet) and the range terminal that runs the Range Check quest.
import W from "../../scripts/lib/weapons.js";
import SNACKS from "../../scripts/lib/data/snacks.yml";
import L from "../../scripts/lib/data/level0.yml";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
import { spawnProp, PROPS, fitBox } from "../../scripts/lib/l2props.js";
import { LURKER_MODEL, LURKER_SCALE } from "../../scripts/lurkers.js";
import { MODEL as SMILER_MODEL, SCALE as SMILER_SCALE } from "../../scripts/smilers.js";
import { stepQuest } from "../../scripts/testlab-use.js";
export const cadence = "250ms";
const V = 1, REFILL = 4000; // ms before a taken thing comes back (my pick)
const HX = 24, HZ0 = -26, HZ1 = 24, H = 6; // the hall: x -24..24, z -26..24, 6 m to the ceiling
const WEAPONS = W.order.slice(1);
const AMMO = "ammo,ammo,ammo,shells,shells,shells,cells,cells,cells,frag,frag,frag,molotov,molotov,molotov";
const FOOD = Object.keys(SNACKS).join(",");
const PARTS = Object.entries({ scrap_metal: 8, bolts: 8, nails: 8, wire: 8, scrap_wood: 8, drywall: 6, steel_pipe: 4, springs: 4, gears: 4, rebar_rod: 3, copper_wire: 4, sheet_steel: 3, circuit: 2 }).flatMap(([k, n]) => Array(n).fill(k)).join(",");
const CABINET = "bandage,firstaid,battery,bobbypin,tape,compass";
export const WEAPON_SLOT = (i) => { const col = i % 2, row = Math.floor(i / 2), t = Math.floor(row / 2); return { x: col ? -15.6 : -20.4, z: -15 + t * 2.1, dx: (row % 2 ? 0.35 : -0.35) }; }; // two weapons a table, two columns of tables
const PHYS = [ // [id, l2props kind, x, z, yaw]
  ["d0", "drum", 11, -4, 0], ["d1", "drum", 11.8, -4.4, 40], ["d2", "drum", 11.4, -3.3, 80],
  ["p0", "canister", 18, -4, 0], ["p1", "canister", 18.6, -4.2, 0],
  ["c0", "chair", 12, 2, 0], ["c1", "chair", 13.5, 2.6, 120], ["c2", "chair", 15, 1.8, 250],
  ["s0", "stackchair", 17, 3, 30], ["s1", "stackchair", 17.6, 3.6, 200],
  ["m0", "mop", 20, 0, 0], ["l0", "lantern", 15.5, -1, 0], ["w0", "microwave", 19.5, 6, 90],
  ["t0", "table", 15, 6, 0],
];
const BOX = [["/cdn/value.bd7c0cbac7eefbb5c1584bd63005a7c39bfacfb2beb3d4e60a47252820cf552e.glb", 0.677, 0.461, 0.991], ["/cdn/value.b38dc81280c35d3f87435921844ff0ee4594c8f1609dc3b020faf26416d137c6.glb", 0.552, 0.421, 0.766], ["/cdn/value.d4da0db276e9457c56a83cce2ef518cccc8065d0f8e158c7c82f747f45c97b2f.glb", 0.467, 0.318, 0.554]];
const BOXES = [[10, 7, 0], [10.9, 7.2, 1], [10.4, 8.3, 2], [21, -1, 0], [21.2, -2.2, 2]];
const T = (name, rep, color) => ({ texture: `cdn/texture-${name}.png`, wrap: "repeat", repeat: [rep, rep], color, roughness: 0.85 });
const sign = (text, w = 3.2) => `<svg viewBox='0 0 400 70' width='${w}m'><rect x='0' y='0' width='400' height='70' rx='6' fill='#14161a' opacity='0.85'/><rect x='6' y='6' width='388' height='58' rx='4' fill='none' stroke='#e8c25a' stroke-width='3'/><text x='200' y='47' text-anchor='middle' font-family='display' font-size='34' fill='#f3d27a'>${text}</text></svg>`;
const label = (text) => `<svg viewBox='0 0 300 40' width='0.9m'><rect x='0' y='0' width='300' height='40' fill='#101010' opacity='0.8'/><text x='150' y='28' text-anchor='middle' font-family='sans-serif' font-size='22' fill='#e9e2c4'>${text}</text></svg>`;

function weaponSpec(kind, i) { const p = WEAPON_SLOT(i); return { tags: ["weapon"], state: { kind }, feetPosition: { x: p.x + p.dx, y: 0.8, z: p.z }, rotation: 90, castShadow: false, ...weaponBody(kind) }; }
function physSpawn(ctx) {
  for (const [id, kind, x, z, yaw] of PHYS) spawnProp(ctx, kind, { x, z }, yaw, { id: "tl-phys-" + id, tags: ["tl-phys", "l2prop", "breakable", ...(PROPS.kinds[kind].tags ?? [])] });
  BOXES.forEach(([x, z, k], i) => { const [m, w, h, d] = BOX[k]; ctx.spawn("tl-phys-box" + i, { tags: ["tl-phys", "breakable"], feetPosition: { x, y: 0, z }, rotation: { yaw: i * 37 }, model: { id: m }, layout: fitBox([w, h, d]), physics: { body: "static", collider: "box" }, castShadow: false, state: { name: "Cardboard Box", loose: "wood", mat: "wood", hp: 20, maxHp: 20, home: { x, y: 0, z } } }); });
}
const container = (ctx, id, kind, name, items, x, z, yaw, size) => ctx.spawn(id, { tags: ["container", "storage", "tl-refill"], feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: PROPS.containers[kind], forward: PROPS.forward }, layout: fitBox(size), physics: { body: "static", collider: "box" }, state: { name, items, full: items } });
const pad = (ctx, id, act, text, x, z, color) => {
  ctx.spawn(id, { feetPosition: { x, y: 0.005, z }, primitive: { kind: "cylinder", radiusTop: 0.75, radiusBottom: 0.75, height: 0.04, radialSegments: 40 }, material: { color, emissive: color, emissiveIntensity: 1.6, roughness: 0.4 }, castShadow: false });
  ctx.spawn(id + "-trigger", { feetPosition: { x, y: 0, z }, primitive: { kind: "cylinder", radiusTop: 0.7, radiusBottom: 0.7, height: 1.2 }, physics: { body: "static", trigger: true }, visible: false, behavior: "scripts/testlab-pad.js", state: { act } });
  ctx.spawn(id + "-label", { feetPosition: { x, y: 1.6, z }, vector: sign(text, 1.9).replace("<svg ", "<svg billboard='yaw' ") });
};

function build(ctx) {
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("tl-")) ctx.destroy(id);
  const CON = T("polished-grey-concrete-floor", 0.25, "oklch(0.62 0.01 250)"), WALL = T("painted-cinder-block-wall-grey", 0.4, "oklch(0.78 0.01 240)"), CEIL = T("acoustic-drop-ceiling-tile-white", 0.5, "oklch(0.85 0.01 90)");
  ctx.spawn("tl-floor", { feetPosition: { x: 0, y: -0.3, z: (HZ0 + HZ1) / 2 }, primitive: { kind: "box", width: HX * 2, height: 0.3, depth: HZ1 - HZ0 }, material: CON, physics: "static", castShadow: false, receiveShadow: true });
  ctx.spawn("tl-ceil", { feetPosition: { x: 0, y: H, z: (HZ0 + HZ1) / 2 }, primitive: { kind: "box", width: HX * 2, height: 0.2, depth: HZ1 - HZ0 }, material: CEIL, physics: "static", castShadow: false });
  for (const [id, x, z, w, d] of [["n", 0, HZ0, HX * 2, 0.3], ["s", 0, HZ1, HX * 2, 0.3], ["w", -HX, 2 - 1, 0.3, HZ1 - HZ0], ["e", HX, 2 - 1, 0.3, HZ1 - HZ0]])
    ctx.spawn("tl-wall-" + id, { feetPosition: { x, y: 0, z: id === "w" || id === "e" ? (HZ0 + HZ1) / 2 : z }, primitive: { kind: "box", width: w, height: H, depth: d }, material: WALL, physics: "static", castShadow: false });
  // floor stripes: a yellow lane line around each station
  const stripe = (id, x, z, w, d) => ctx.spawn("tl-stripe-" + id, { feetPosition: { x, y: 0.003, z }, primitive: { kind: "box", width: w, height: 0.004, depth: d }, material: { color: "oklch(0.82 0.16 92)", roughness: 0.6 }, castShadow: false });
  stripe("arm", -12.5, 0, 0.12, 34); stripe("phys", 8.5, 2, 0.12, 20); stripe("lane", 0, -10, 18, 0.12); stripe("lane-w", -9, -18, 0.12, 16); stripe("lane-e", 9, -18, 0.12, 16);
  // light: troffer panels and the lamps that light them, a 4 x 4 grid
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = -18 + i * 12, z = -20 + j * 13;
    ctx.spawn(`tl-troffer-${i}-${j}`, { feetPosition: { x, y: H - 0.06, z }, primitive: { kind: "box", width: 1.2, height: 0.05, depth: 0.6 }, material: { color: "oklch(0.97 0.01 95)", emissive: "oklch(0.97 0.02 95)", emissiveIntensity: 2.4 }, castShadow: false, light: { kind: "point", color: "oklch(0.96 0.02 95)", intensity: 4, distance: 20 } }); }
  // zone signs
  for (const [id, text, x, z, yaw] of [["arm", "ARMORY", -23.8, 0, 90], ["lane", "FIRING LANE", 0, -25.8, 0], ["phys", "PHYSICS BAY", 23.8, 2, -90], ["craft", "WORKSHOP", 16, 23.8, 180], ["food", "BREAK ROOM", -16, 23.8, 180], ["inter", "INTERACTABLES", 0, 6.5, 180]])
    ctx.spawn("tl-sign-" + id, { feetPosition: { x, y: 3.6, z }, rotation: { yaw }, vector: sign(text) });
  // armory: tables, a label per weapon
  WEAPONS.forEach((k, i) => { const p = WEAPON_SLOT(i);
    if (i % 2 === 0) spawnProp(ctx, "table", { x: p.x, z: p.z }, 90, { id: "tl-plinth-" + (i / 2), tags: ["tl-table"], state: { name: "Armory table", mat: "wood", hp: 99999, maxHp: 99999 } });
    ctx.spawn("tl-wlabel-" + k, { feetPosition: { x: p.x + p.dx + (p.x < -18 ? 0.5 : -0.5) * 0 , y: 0.81, z: p.z + 0.48 }, rotation: { yaw: p.x < -18 ? 0 : 0, pitch: -70 }, vector: label((W[k]?.name ?? k).slice(0, 24)) }); });
  container(ctx, "tl-ammo", "locker", "Ammo & throwables locker", AMMO, -23.3, 15, 90, [0.5, 1.9, 0.5]);
  container(ctx, "tl-ammo2", "locker", "Ammo & throwables locker", AMMO, -23.3, 16, 90, [0.5, 1.9, 0.5]);
  // break room
  container(ctx, "tl-fridge", "fridge", "Every consumable", FOOD, -20, 23.4, 180, [0.8, 1.85, 0.75]);
  container(ctx, "tl-fridge2", "fridge", "Every consumable", FOOD, -19, 23.4, 180, [0.8, 1.85, 0.75]);
  spawnProp(ctx, "counter", { x: -15.5, z: 23.4 }, 180, { id: "tl-counter", state: { hp: 99999, maxHp: 99999 } });
  spawnProp(ctx, "microwave", { x: -15.8, y: 0.96, z: 23.4 }, 180, { id: "tl-kitchen-mw" });
  spawnProp(ctx, "table", { x: -15.5, z: 19.5 }, 0, { id: "tl-food-table", state: { hp: 99999, maxHp: 99999 } });
  // workshop: a real bench the craft menu sees + the parts bin
  ctx.spawn("tl-bench", { tags: ["bench", "furniture"], feetPosition: { x: 16, y: 0, z: 23.2 }, rotation: { yaw: 180 }, model: { id: PROPS.kinds.bench.id, forward: PROPS.forward }, layout: fitBox(PROPS.kinds.bench.size), physics: { body: "static", collider: "box" }, state: { name: "Workbench", mat: "wood", hp: 99999, maxHp: 99999 } });
  container(ctx, "tl-parts", "cagecrate", "Parts bin", PARTS, 19, 23, 180, [0.9, 0.7, 0.7]);
  container(ctx, "tl-parts2", "cagecrate", "Parts bin", PARTS, 13, 23, 180, [0.9, 0.7, 0.7]);
  spawnProp(ctx, "shelf", { x: 22.5, z: 21 }, -90, { id: "tl-shelf", state: { hp: 99999, maxHp: 99999 } });
  // interactables: a partition wall with a working door, a light switch and its lamp, a seat, a cabinet, the terminal
  ctx.spawn("tl-part-w", { feetPosition: { x: -3.5, y: 0, z: 9 }, primitive: { kind: "box", width: 5, height: 2.8, depth: 0.15 }, material: WALL, physics: "static" });
  ctx.spawn("tl-part-e", { feetPosition: { x: 3.5, y: 0, z: 9 }, primitive: { kind: "box", width: 5, height: 2.8, depth: 0.15 }, material: WALL, physics: "static" });
  ctx.spawn("tl-part-top", { feetPosition: { x: 0, y: 2.15, z: 9 }, primitive: { kind: "box", width: 2, height: 0.65, depth: 0.15 }, material: WALL, physics: "static" });
  const dp = { style: "office", w: 0.98, h: 2.1, hingeSide: "left", swing: 1, d: 0.12, seed: 3 };
  ctx.spawn("tl-door", { feetPosition: { x: -0.49, y: 0, z: 9 }, rotation: { yaw: 0 }, physics: "kinematic", tags: ["usable"], behavior: "scripts/home11-door.js", state: { open: false, openYaw: 95, kind: "door", name: "Test door", verb: "Open", hinge: "tl-door" },
    children: [{ id: "leaf", tags: ["usable"], feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "leaf" } }, material: { pbr: true }, physics: "static", behavior: "scripts/home11-door.js", state: { kind: "door", name: "Test door", verb: "Open", hinge: "tl-door" } }] });
  ctx.spawn("tl-door-frame", { feetPosition: { x: 0, y: 0, z: 9 }, physics: { body: "static", collider: "auto" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "frame" } }, material: { pbr: true } });
  ctx.spawn("tl-switch", { tags: ["usable"], feetPosition: { x: 3, y: 1.2, z: 8.9 }, primitive: { kind: "box", width: 0.09, height: 0.13, depth: 0.03 }, material: { color: "oklch(0.95 0.01 90)", roughness: 0.5 }, behavior: "scripts/testlab-use.js", state: { kind: "switch", name: "Light switch", verb: "Flip", on: true, c: { x: 3, y: 1.25, z: 8.9 } } });
  ctx.spawn("tl-lamp", { feetPosition: { x: 3, y: 2.5, z: 8.6 }, primitive: { kind: "sphere", radius: 0.12 }, material: { color: "oklch(0.95 0.05 90)", emissive: "oklch(0.9 0.1 90)", emissiveIntensity: 3 }, light: { kind: "point", color: "oklch(0.92 0.09 85)", intensity: 3, distance: 9 }, castShadow: false });
  spawnProp(ctx, "stackchair", { x: -3, z: 11 }, 180, { id: "tl-seat", tags: ["seat"], state: { name: "Chair", hp: 99999, maxHp: 99999, c: { x: -3, y: 0.5, z: 11 }, seat: { d: 0.05, out: { x: 0, z: 0.7 }, y: 0.02 } } });
  container(ctx, "tl-cabinet", "cabinet", "Supply cabinet", CABINET, 5, 11.5, 180, [0.9, 1.1, 0.42]);
  ctx.spawn("tl-terminal", { tags: ["usable"], feetPosition: { x: 0, y: 0, z: 15 }, rotation: { yaw: 0 }, model: { id: PROPS.kinds.fuse.id, forward: PROPS.forward }, layout: fitBox([0.6, 1.4, 0.3]), physics: { body: "static", collider: "box" }, behavior: "scripts/testlab-use.js", state: { kind: "terminal", name: "Range terminal", verb: "Use", c: { x: 0, y: 1, z: 15 } } });
  ctx.spawn("tl-terminal-sign", { feetPosition: { x: 0, y: 1.9, z: 15 }, rotation: { yaw: 180 }, vector: sign("RANGE CHECK · E", 1.6) });
  // physics bay
  physSpawn(ctx);
  ctx.spawn("tl-ramp", { feetPosition: { x: 20, y: 0, z: 10 }, rotation: { yaw: 0, roll: 0, pitch: 0 }, primitive: { kind: "wedge", width: 3, height: 1.2, depth: 4 }, material: CON, physics: { body: "static", collider: "mesh" } });
  // firing lane: drums downrange as targets, pens at the far wall, the packs that run spawned foes
  ["a", "b", "c"].forEach((k, i) => spawnProp(ctx, "drum", { x: -5 + i * 5, z: -22 }, 0, { id: "tl-target-" + k }));
  ctx.spawn("tl-smiler-pack", { feetPosition: { x: -4, y: 0, z: -18 }, behavior: "scripts/smilers.js" });
  ctx.spawn("tl-lurker-pack", { feetPosition: { x: 4, y: 0, z: -18 }, behavior: "scripts/lurkers.js" });
  // pads
  pad(ctx, "tl-pad-smiler", "smiler", "SPAWN SMILER", -4, -12, "oklch(0.6 0.2 25)");
  pad(ctx, "tl-pad-lurker", "lurker", "SPAWN LURKER", 4, -12, "oklch(0.6 0.2 25)");
  pad(ctx, "tl-pad-heal", "heal", "FULL HEAL", -3, 20, "oklch(0.7 0.17 150)");
  pad(ctx, "tl-pad-lv10", "lv10", "LEVEL 10", 3, 20, "oklch(0.7 0.14 250)");
  pad(ctx, "tl-pad-reset", "resetphys", "RESET PHYSICS", 14, 12, "oklch(0.78 0.15 80)");
  pad(ctx, "tl-pad-exit", "exit", "BACK TO BONUS", 0, 22.6, "oklch(0.75 0.03 250)");
  ctx.spawn("tl-hum", { feetPosition: { x: 0, y: 4, z: 0 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-fluorescent-light-hum-loop.mp3", gain: 0.12, loop: true, spatial: false } });
}

const snackTotal = (s) => Object.values(s.snacks ?? {}).reduce((a, b) => a + (b || 0), 0);
const wCount = (s) => (s.weapons ? String(s.weapons).split(",").filter(Boolean).length : 0);
const physMoved = (ctx) => { for (const [id] of PHYS) { const o = ctx.place.objects["tl-phys-" + id]; if (!o) return true; const h = o.state?.home; if (o.state?.hp != null && o.state.hp < o.state.maxHp) return true; if (h && Math.hypot(o.feetPosition.x - h.x, o.feetPosition.z - h.z) > 0.6) return true; } for (let i = 0; i < BOXES.length; i++) if (!ctx.place.objects["tl-phys-box" + i]) return true; return false; };
function due(s, key, now) { if (!s[key]) { s[key] = now + REFILL; return false; } if (now < s[key]) return false; delete s[key]; return true; }

export function tick(ctx) {
  const s = ctx.place.state, now = ctx.now();
  if (s.builtV !== V) { build(ctx); s.builtV = V; s.seeded = false; }
  if (!ctx.place.players?.length) return;
  // refills: weapons, containers, physics on request, foes on request
  const R = (s.refill ??= {});
  WEAPONS.forEach((k, i) => { const id = "tl-w-" + k; if (ctx.place.objects[id]) { delete R[id]; return; } if (s.seeded && !due(R, id, now)) return; ctx.spawn(id, weaponSpec(k, i)); });
  for (const id of ["tl-ammo", "tl-ammo2", "tl-fridge", "tl-fridge2", "tl-parts", "tl-parts2", "tl-cabinet"]) { const c = ctx.place.objects[id]; if (!c) continue; if (c.state.items === c.state.full) { delete R[id]; continue; } if (due(R, id, now)) c.state.items = c.state.full; }
  if (s.want_resetphys) { s.want_resetphys = 0; for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("tl-phys-")) ctx.destroy(id); s.physRespawn = now + 300; }
  if (s.physRespawn && now > s.physRespawn) { s.physRespawn = 0; physSpawn(ctx); }
  if (s.want_smiler) { s.want_smiler = 0; if (ctx.query({ tags: ["smiler"] }).filter((m) => !m.state?.dead).length < 3) ctx.spawn({ tags: ["smiler"], feetPosition: { x: -4, y: 0.05, z: -22 }, model: SMILER_MODEL, scale: SMILER_SCALE, physics: { body: "character" }, state: { hp: L.smilerHp } }); }
  if (s.want_lurker) { s.want_lurker = 0; if (ctx.query({ tags: ["lurker"] }).filter((m) => !m.state?.dead).length < 3) ctx.spawn({ tags: ["lurker"], feetPosition: { x: 4, y: 0.05, z: -22 }, model: LURKER_MODEL, scale: LURKER_SCALE, physics: { body: "character" }, state: { hp: L.lurkerHp, kind: "lurker" } }); }
  s.seeded = true;
  // Range Check: each step is read off the player's own save
  let moved = null;
  for (const p of ctx.place.players) {
    const st = p.state, q = st?.rangeQ; if (!q || q.stage >= 5) continue;
    if (q.base == null) { st.rangeQ = { ...q, base: q.stage === 0 ? wCount(st) : q.stage === 2 ? (st.kills ?? 0) : q.stage === 4 ? snackTotal(st) : 0, at: now }; continue; }
    let done = false, max = q.max ?? q.base;
    if (q.stage === 0) done = wCount(st) > q.base;
    else if (q.stage === 1) done = moved ??= physMoved(ctx);
    else if (q.stage === 2) done = (st.kills ?? 0) > q.base;
    else if (q.stage === 3) done = !!st.notice && st.notice.at > q.at && /^Made /.test(st.notice.text ?? "");
    else if (q.stage === 4) { const t = snackTotal(st); if (t > max) { st.rangeQ = { ...q, max: t }; continue; } done = t < max; }
    if (!done) continue;
    const n = q.stage + 1; st.rangeQ = { stage: n }; stepQuest(st, n);
    st.notice = { text: n >= 5 ? "Every station checks out. Report to the range terminal" : `Range Check ${n}/5 done`, at: now };
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-eerie-low-chime-level-up.mp3", volume: 0.5 }, { audience: { player: p.id } });
  }
}
