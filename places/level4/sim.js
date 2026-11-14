import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
// Level 4 "Abandoned Office": lays the floor, lights, door plates, coolers, fountains, vending, the lift and the stairwell,
// M.E.G. Base Omega's two agents and the sound beds once (place.state.builtV); each second it watches the bare windows.
import { heard } from "../../scripts/lib/hear.js";
import { ROOMS, FOUNTAINS, LIFT, STAIRS, HALF, H, T, facing, roomAt } from "../../scripts/lib/level4.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { fullLook, npcLook } from "../../scripts/lib/clothes.js";
import MEG from "../../scripts/lib/data/meg.yml";
import { npcState } from "../../scripts/lib/stats.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
import { settle, tickPeople } from "../../scripts/lib/l4-people.js";
import { tickWalls, B as BRK } from "../../scripts/lib/breakables.js";
export const cadence = "1s";
const V = 2;
const KIT = { // real models at the old boxes' size (Shelly: never blocky)
  fountain: "/cdn/value.ca40f4685743a33712b754baebd3f66acb4944b92a4cce1e363ebac5669f4a93.glb",
  vend: "/cdn/value.b5e982116d78ae3868f9b9db3ccbd35f5d24d5d57451cfbb6122f9d28f2e2b53.glb",
  phone: "/cdn/value.0c816cdc27bbb95974064b42a5e4cd33049904823827e49a153522abd7d08406.glb",
  table: "/cdn/value.8f446d2c7ec3b01c3b65bebe678c95cd5d57e2dc33220316cfa50f92d04fb39e.glb",
};
const box = (w, h, d) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const KITROW = {
  fountain: { model: { id: KIT.fountain }, layout: box(0.5, 1.0, 0.4), physics: { body: "static", collider: "box" } },
  vend: { model: { id: KIT.vend }, layout: box(1, 1.85, 0.8), physics: { body: "static", collider: "box" } },
  phone: { model: { id: KIT.phone }, layout: box(0.24, 0.1, 0.2), physics: { body: "static", collider: "box" } },
  table: { model: { id: KIT.table }, layout: box(1.2, 0.74, 1.2), physics: { body: "static", collider: "box" } },
};
const FITM = { // reused fitted models (Level 5 office kit) for Level 4's open floor
  desk: "/cdn/value.fa5feab7b39ab2f4d61900132fde5cae8b1f7bb2a8eb9fecc442a5f854209765.glb",
  chair: "/cdn/value.2ec9e206b3b1212e56cf0322ecf16fdc333ddacb4a2ba21e00ddff32920705c6.glb", // swivel office chair (was the l5 leather armchair 07a9798f… for one build)
  printer: "/cdn/value.761b50dce26eee795c80dff616b78a4c7951f584c809768ccfe77f3bb50ccafa.glb",
  cabinet: "/cdn/value.4a56fcfeb8b5614f78843431da5fd4ef6eb6b8549c86a730ecd317049e04c05b.glb",
  crt: "/cdn/value.30ae8e4fd0c2e307d21943aa6fa38f3f816fcc7a10335f5a15ff865b00b84ce4.glb",
};
const FIT = {
  desk: { model: { id: FITM.desk, forward: "+z" }, layout: box(1.5, 0.75, 0.74), physics: { body: "static", collider: "box" } },
  chair: { model: { id: FITM.chair, forward: "+z" }, layout: box(0.62, 1.0, 0.62) },
  printer: { model: { id: FITM.printer }, layout: box(0.8, 1.0, 0.6), physics: { body: "static", collider: "box" } },
  cabinet: { model: { id: FITM.cabinet }, layout: box(0.5, 1.3, 0.6), physics: { body: "static", collider: "box" } },
};
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const OMEGA = {
  "omega-okafor": { name: "Sgt. Okafor · M.E.G. Base Omega", role: "scout", voice: "reyes", gun: "shotgun", at: [-25.5, -22.6], yaw: 180, look: { species: "human", sex: "m", eye: "#7a4820", topw: "jacket", top: "#b8d040", botw: "pants", bottom: "#3a3a32", shoes: "boots", shoec: "#22201c", hat: "cap", hatc: "#4a5a2a", expr: "wary" } },
  "omega-rhea": { name: "Rhea · Omega Medic", role: "medic", voice: "ito", gun: "wrench", at: [-28, -28.5], yaw: 0, look: { species: "human", sex: "f", eye: "#28a46e", topw: "jacket", top: "#e8e8e0", botw: "skirt", bottom: "#2a3040", shoes: "boots", shoec: "#2a2420", expr: "gentle" } },
};
const plateUi = (label) => `<div face="front" width="0.5m" style="font-family:sans-serif;text-align:center;color:#2a2620;line-height:1.05"><div style="font-size:150px;font-weight:900">${label}</div><div style="font-size:62px">{{ state.label2 }}</div></div>`;
const coolerUi = `<div face="front" facing="player" width="0.42m" style="font-family:monospace;color:#cfeeff;background:#0e1a22;padding:14px;font-size:44px;line-height:1.2">JUGS {{ state.jugs | default 3 }}/3<div style="margin-top:8px;height:40px;background:#223;position:relative"><div style="position:absolute;left:82%;width:14%;top:0;bottom:0;background:#2f6a3a"></div><div style="position:absolute;left:0;top:8px;bottom:8px;width:{{ state.fill | round }}%;background:#7fd6ff"></div></div>FILL {{ state.fill | round | default 0 }}%</div>`;
function inside(r, along, depth) { // a point in an office: along its wall from a0, depth in from the door wall
  const d = r.door.at - r.inward * depth; return r.door.ax === "z" ? { x: along, y: 0, z: d } : { x: d, y: 0, z: along }; }
export function lay(ctx) {
  ctx.spawn("l4-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level4-geo.js" }, material: { roughness: 0.9 } });
  // light: a lamp per 8 m in the open, one per room; the bare windows throw cold light in
  for (let x = -24; x <= 24; x += 8) for (let z = -24; z <= 24; z += 8) ctx.spawn({ tags: ["l4-light"], feetPosition: { x, y: H - 0.15, z }, light: { kind: "point", color: "oklch(0.97 0.02 95)", intensity: 3, distance: 12, shadow: { enabled: false }, visibleRange: { max: 40 } } });
  for (const r of ROOMS) { const c = { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 };
    ctx.spawn({ tags: ["l4-light"], feetPosition: { x: c.x, y: H - 0.15, z: c.z }, light: r.kind === "trap" ? { kind: "point", color: "oklch(0.9 0.05 220)", intensity: 5, distance: 9, shadow: { enabled: false }, visibleRange: { max: 40 } } : { kind: "point", color: "oklch(0.96 0.02 95)", intensity: 2.6, distance: 9, shadow: { enabled: false }, visibleRange: { max: 40 } } }); }
  for (const r of ROOMS) {
    const yaw = facing(r.door.ax === "x" ? r.inward : 0, r.door.ax === "z" ? r.inward : 0), off = r.inward * (T + 0.03);
    const pos = r.door.ax === "z" ? { x: r.door.c + 1.05, y: 1.35, z: r.door.at + off } : { x: r.door.at + off, y: 1.35, z: r.door.c + 1.05 };
    if (r.kind === "office") {
      const a0 = r.door.ax === "z" ? r.x0 : r.z0, a1 = a0 + 8, coolerA = r.door.c < r.mid ? a1 - 0.6 : a0 + 0.6, kitA = r.door.c < r.mid ? a1 - 2.4 : a0 + 2.4;
      const plate = ctx.spawn(`${r.id}-plate`, { tags: ["usable", "l4-plate"], feetPosition: pos, rotation: { yaw }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: 0.5, height: 0.32, depth: 0.03 }, material: { color: "oklch(0.86 0.03 85)", roughness: 0.5 },
        behavior: "scripts/l4-home.js", ui: plateUi(r.label),
        state: { kind: "claim", label: r.label, label2: "vacant", name: `Office ${r.label}`, verb: "Claim", info: "Vacant office · make it your home", tint: "#f2c14e",
          room: { id: r.id, kit: { cot: inside(r, kitA, 4.6), desk: inside(r, r.door.c < r.mid ? a0 + 1.6 : a1 - 1.6, 4.9), yaw: yaw + 180 } } } });
      const cp = inside(r, coolerA, 0.55);
      ctx.spawn(`${r.id}-cooler`, { tags: ["usable", "l4-cooler"], feetPosition: cp, rotation: { yaw: yaw + 180 }, physics: "static", visibleRange: { max: 40 }, castShadow: false, model: { id: "/cdn/value.40b1e114cdbad77d13350e630508cf974d8b20422cbfbe323ad5769a7fed6014.glb" }, layout: { box: { min: { x: -0.18, y: 0, z: -0.18 }, max: { x: 0.18, y: 1.2, z: 0.18 } } },
        behavior: "scripts/l4-home.js", state: { kind: "cooler", plate: plate, jugs: 3, fill: 0, name: "Water cooler", verb: "Fill a bottle", info: "Your office's almond water", tint: "#7fd6ff", c: { x: cp.x, y: 1.1, z: cp.z } },
        children: [{ feetPosition: { x: 0, y: 0.95, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.15, radiusBottom: 0.16, height: 0.42 }, material: { color: "oklch(0.8 0.08 230 / 0.55)", roughness: 0.1, transparent: true } },
          { feetPosition: { x: 0, y: 1.45, z: 0 }, primitive: { kind: "box", width: 0.01, height: 0.01, depth: 0.01 }, visible: true, ui: coolerUi }] });
    } else if (r.kind === "trap") {
      ctx.spawn({ feetPosition: pos, rotation: { yaw }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: 0.5, height: 0.32, depth: 0.03 }, material: { color: "oklch(0.86 0.03 85)" }, ui: plateUi(r.label).replace("{{ state.label2 }}", "DO NOT LOOK OUT") });
      // caution tape across the doorway, sagging
      for (const y of [0.9, 1.4]) ctx.spawn({ feetPosition: r.door.ax === "z" ? { x: r.door.c, y, z: r.door.at + r.inward * 0.15 } : { x: r.door.at + r.inward * 0.15, y, z: r.door.c }, rotation: { yaw, roll: y > 1 ? 4 : -3 }, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "box", width: 1.25, height: 0.07, depth: 0.005 }, material: { color: "oklch(0.85 0.17 95)", emissive: "oklch(0.4 0.1 95)" } });
    }
  }
  // fountains on the open floor
  for (const [x, z, yaw] of FOUNTAINS) {
    const dx = yaw === -90 ? 0.55 : yaw === 90 ? -0.55 : 0, dz = yaw === 0 ? -0.55 : yaw === 180 ? 0.55 : 0, p = { x: x + dx, y: 0, z: z + dz };
    ctx.spawn({ tags: ["usable", "l4-fountain"], feetPosition: p, rotation: { yaw }, visibleRange: { max: 40 }, castShadow: false, ...KITROW.fountain,
      behavior: "scripts/l4-home.js", state: { kind: "fountain", name: "Drinking fountain", verb: "Drink", info: "Almond water, cold", tint: "#7fd6ff" } });
  }
  // break room: three vending machines on its south wall, a table
  for (const i of [0, 1, 2]) {
    const x = HALF - 7 + i * 1.3;
    ctx.spawn({ tags: ["usable", "l4-vend"], feetPosition: { x, y: 0, z: HALF - 0.75 }, rotation: { yaw: 0 }, visibleRange: { max: 45 }, castShadow: false, ...KITROW.vend,
      behavior: "scripts/l4-home.js", state: { kind: "vend", name: "Vending machine", verb: "Push the button", info: "Restocks itself. Nobody knows how.", tint: "#f2c14e" },
      children: [{ feetPosition: { x: 0, y: 0.6, z: -0.6 }, light: { kind: "point", color: "oklch(0.9 0.05 90)", intensity: 1.2, distance: 3.5, shadow: { enabled: false }, visibleRange: { max: 30 } } }] });
  }
  ctx.spawn({ tags: ["l4-break-table"], feetPosition: { x: HALF - 4, y: 0, z: HALF - 4.5 }, visibleRange: { max: 40 }, castShadow: false, ...KITROW.table });
  // the lift home to Level 3, its lit call button, a sign; where you step out
  ctx.spawn("l4-lift-door", { tags: ["door"], feetPosition: { x: LIFT.x - 0.6, y: 0, z: LIFT.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.3, depth: 1.6 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level3#l3-lift-arrive" } });
  ctx.spawn("l4-lift-arrive", { feetPosition: { x: LIFT.x - 3.2, y: 0.1, z: LIFT.z + 1 }, rotation: { yaw: 180 } });
  ctx.spawn({ feetPosition: { x: LIFT.x - 0.27, y: 2.55, z: LIFT.z }, rotation: { yaw: 90 }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 1.4, height: 0.3, depth: 0.02 }, material: { color: "oklch(0.2 0.01 250)" },
    ui: '<div face="front" width="1.4m" style="font-size:150px;font-weight:900;color:#ffd890;text-align:center">▼ LEVEL 3</div>' });
  ctx.spawn({ feetPosition: { x: LIFT.x - 0.26, y: 1.25, z: LIFT.z + 1.27 }, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "sphere", radius: 0.035 }, material: { color: "#ffb040", emissive: "#ffb040", emissiveIntensity: 3 } });
  // the stairwell: EXIT over the chained door
  ctx.spawn({ tags: ["usable"], feetPosition: { x: STAIRS.x, y: 0.9, z: STAIRS.z - 0.35 }, primitive: { kind: "box", width: 0.9, height: 0.3, depth: 0.05 }, visible: false, behavior: "scripts/l4-home.js", state: { kind: "stairs", name: "Stairwell", verb: "Push", info: "Level 5", tint: "#ff8060" } });
  ctx.spawn({ feetPosition: { x: STAIRS.x, y: 2.3, z: STAIRS.z - 0.24 }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: 0.7, height: 0.25, depth: 0.06 }, material: { color: "oklch(0.25 0.01 30)" },
    ui: '<div face="front" width="0.7m" style="font-size:160px;font-weight:900;color:#ff5040;text-align:center">EXIT</div>', light: { kind: "point", color: "oklch(0.6 0.2 25)", intensity: 1.2, distance: 4, shadow: { enabled: false }, visibleRange: { max: 30 } } });
  ctx.spawn({ feetPosition: { x: STAIRS.x, y: 1.7, z: STAIRS.z - 0.25 }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "box", width: 0.9, height: 0.25, depth: 0.01 }, material: { color: "oklch(0.88 0.02 90)" },
    ui: '<div face="front" width="0.9m" style="font-size:90px;font-weight:800;color:#222;text-align:center">LEVEL 5 · STAIRS</div>' });
  for (const [dy, roll] of [[1.2, 18], [1.25, -18]]) ctx.spawn({ feetPosition: { x: STAIRS.x, y: dy, z: STAIRS.z - 0.32 }, rotation: { yaw: 0, roll }, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "box", width: 1.05, height: 0.05, depth: 0.04 }, material: { color: "oklch(0.4 0.02 60)", metalness: 0.8, roughness: 0.4 } });
  // Base Omega: a plate, sandbags at its door, two agents
  ctx.spawn({ feetPosition: { x: -27.5, y: 2.45, z: -HALF + 8 + T + 0.03 }, rotation: { yaw: 180 }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "box", width: 2.6, height: 0.5, depth: 0.04 }, material: { color: "oklch(0.25 0.04 140)" },
    ui: '<div face="front" width="2.6m" style="font-size:150px;font-weight:900;color:#d8f0a0;text-align:center;line-height:1">M.E.G. BASE OMEGA<div style="font-size:70px;color:#b8d080">wanderers welcome · weapons lowered</div></div>' });
  for (let i = 0; i < 4; i++) ctx.spawn({ feetPosition: { x: -23.3, y: (i % 2) * 0.32, z: -23.2 + (i >> 1) * 0.0 + (i >> 1) * 0.6 }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "capsule", radius: 0.16, halfHeight: 0.3 }, rotation: { yaw: 90, roll: 90 }, physics: "static", material: { color: "oklch(0.6 0.05 85)", roughness: 1 } });
  for (const [id, g] of Object.entries(OMEGA)) {
    ctx.spawn(id, { tags: ["npc", "omega"], feetPosition: { x: g.at[0], y: 0, z: g.at[1] }, rotation: { yaw: g.yaw }, physics: "character", ...critterSpec(npcLook(id, g.look, "meg", g.level ?? 14, g.role)), ...(g.build ? { scale: { x: g.build.w ?? 1, y: g.build.h ?? 1, z: g.build.w ?? 1 } } : {}), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"], state: { name: g.name, role: g.role, voice: g.voice, ...npcState(ctx, "agent", MEG.hp) } });
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
  }
  // sound beds: the buzz, a far hvac, the lift's hum, the break room's fridge
  const bed = (x, z, clip, gain, maxDistance) => ctx.spawn({ tags: ["l4-bed"], feetPosition: { x, y: 2.6, z }, audio: { clip: G(clip), gain, loop: true, spatial: true, maxDistance } });
  for (const [x, z] of [[-12, -12], [12, 12], [-12, 12], [12, -12]]) bed(x, z, "fluorescent-light-buzz-loop", 0.08, 18);
  bed(0, 0, "distant-hvac-hum-room-tone-loop", 0.14, 45);
  bed(HALF - 4, HALF - 4, "old-refrigerator-hum-loop", 0.12, 9);
}
// the open floor's life: four cubicle islands, two desk phones each that ring in turn, a printer of memos (scripts/l4-office.js)
function layOffice(ctx) {
  for (const [x, z] of [[0, 13], [0, -13], [13, 0], [-13, 0]]) {
    ctx.spawn({ tags: ["l4-island"], feetPosition: { x, y: 0, z }, physics: { body: "static", collider: "mesh" }, visibleRange: { max: 50 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l4-office-geo.js", params: { kind: "island" } } });
    for (const [cx, face] of [[0.82, 1], [-0.82, -1], [-0.82, 1], [0.82, -1]]) ctx.spawn({ tags: ["l4-island"], feetPosition: { x: x + cx, y: 0, z: z + face * 1.25 }, rotation: { yaw: face > 0 ? 0 : 180 }, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l4-prop-geo.js", params: { kind: "chair" } } });
    for (const [cx, face] of [[0.82, 1], [-0.82, -1]]) ctx.spawn({ tags: ["usable", "l4-phone"], feetPosition: { x: x + cx + 0.42, y: 0.75, z: z + face * 0.3 }, rotation: { yaw: face > 0 ? 180 : 0 }, visibleRange: { max: 35 }, castShadow: false, behavior: "scripts/l4-office.js", ...KITROW.phone,
      state: { kind: "phone", name: "Desk phone", verb: "Pick up", info: "Desk phone" } });
    ctx.spawn({ tags: ["usable", "l4-printer"], feetPosition: { x: x + 2.15, y: 0, z }, rotation: { yaw: 90 }, physics: "static", visibleRange: { max: 40 }, castShadow: false, behavior: "scripts/l4-office.js",
      primitive: { kind: "scripted", script: "scripts/l4-office-geo.js", params: { kind: "printer" } }, state: { kind: "printer", name: "Printer", verb: "Read", info: "Something is half printed" } });
  }
  ctx.spawn("l4-office-mgr", { feetPosition: { x: 0, y: 0, z: 0 }, behavior: "scripts/l4-office.js", state: { kind: "manager" } });
}
export function tick(ctx) {
  restyleSigns(ctx, "level4"); // every sign dressed as its own board (scripts/lib/sign-style.js)
  if (ctx.place.state.posterV !== 1 && ctx.place.players?.length) { const o = ctx.place.objects["l4-fun-poster"]; if (o) { ctx.place.state.posterV = 1; o.feetPosition = { x: 30.4, y: 0.02, z: 25.8 }; } } // Nov 11: the =) poster lay outside the lift's outer wall where nobody could reach it; now it's on the break room floor (cells/x0z0.scene)
  dressThresholds(ctx); // the ways in and out, dressed with what people left there (scripts/lib/thresholds.js)
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  if (!ctx.place.state.dinaIndex) { ctx.place.state.dinaIndex = true; // The Way Back detour (Nov 13): River's carbon copy, left in the lift lobby's out-tray
    ctx.spawn("dina-carbon-copy", { tags: ["usable"], feetPosition: { x: LIFT.x - 2.2, y: 0, z: LIFT.z + 2.4 }, physics: "static", visibleRange: { max: 40 }, castShadow: false, behavior: "scripts/dina-record.js",
      primitive: { kind: "box", width: 0.5, height: 0.9, depth: 0.4 }, material: { color: "oklch(0.55 0.02 90)", metalness: 0.4, roughness: 0.6 },
      children: [{ feetPosition: { x: 0, y: 0.92, z: 0 }, primitive: { kind: "box", width: 0.3, height: 0.03, depth: 0.22 }, material: { color: "oklch(0.9 0.02 90)", roughness: 0.9 } }],
      state: { kind: "carbon", name: "Out-tray on a filing cabinet", verb: "Read the carbon copy" } });
  }
  if (ctx.place.state.stairsV !== 1) { ctx.place.state.stairsV = 1; // the stairwell's chain came off: down to Level 5
    ctx.spawn("l4-stairs-down", { tags: ["door"], feetPosition: { x: STAIRS.x, y: 0, z: STAIRS.z - 0.5 }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 1.4, height: 2.4, depth: 0.6 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level5#l5-from-l4" } });
    ctx.spawn("l4-from-l5", { feetPosition: { x: STAIRS.x, y: 0.1, z: STAIRS.z - 3 }, rotation: { yaw: 0 } });
    ctx.spawn({ feetPosition: { x: STAIRS.x, y: 2.45, z: STAIRS.z - 0.12 }, rotation: { yaw: 180 }, primitive: { kind: "box", width: 1.1, height: 0.32, depth: 0.03 }, material: { color: "oklch(0.25 0.04 50)" },
      ui: '<div face="front" width="1.1m" style="font-family:serif;font-size:120px;font-weight:900;color:#e8c983;text-align:center;line-height:1.05">LEVEL 5<div style="font-size:60px;font-style:italic">▼ the hotel</div></div>' });
  }
  const s = ctx.place.state;
  if (s.builtV !== V) { s.builtV = V; lay(ctx); }
  // Level 4's people (scripts/lib/l4-people.js): homes, the floor's day and night, meetups, phones, greetings, the mold room
  if (s.peopleV !== 2) { s.peopleV = 2; settle(ctx, (id, g, rounds) => {
    const home = rounds[0] ?? { x: 0, z: 0 };
    ctx.spawn(id, { tags: ["npc", "l4-person", g.faction], feetPosition: { x: home.x, y: 0, z: home.z }, physics: "character", ...critterSpec(npcLook(id, g.look, g.faction === "omega" ? "meg" : g.faction, g.level ?? 10, g.role)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { name: g.name, role: g.role, voice: g.voice, rounds, ...npcState(ctx, "agent", MEG.hp) } });
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, state: { kind: g.gun }, ...weaponBody(g.gun) });
  }); }
  try { tickPeople(ctx); } catch (e) { if (!ctx.session.pErr) { ctx.session.pErr = 1; ctx.log("[l4] people", String(e?.stack ?? e).slice(0, 300)); } }
  // breakables: smashed office walls (lib/wallgrid.js level4) grow back after a while; every loose prop takes a material and hp
  if (!(Math.abs(ctx.now() - (ctx.session.wallTick ?? -1e9)) < 3000)) { ctx.session.wallTick = ctx.now(); try { tickWalls(ctx, "level4"); breakProps(ctx); } catch (e) { ctx.log("[l4] breakables", String(e?.stack ?? e).slice(0, 300)); } }
  if (!s.officeV) { s.officeV = 1; layOffice(ctx); }
  if (s.kitV !== 1) { s.kitV = 1; // rooms laid before the real models: swap the boxes in place by tag
    const all = (t) => ctx.query({ tags: [t], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
    const swap = (o, k, extra) => { const h = ctx.place.objects[o.id]; if (!h) return; h.primitive = null; h.material = null; const { children: kids, ...rest } = extra ?? {}; if (kids) for (const c of [...(h.children ?? [])]) if (!kids.some((k2) => k2.light && c.light)) ctx.destroy(c.id); Object.assign(h, KITROW[k], rest); };
    for (const o of all("l4-fountain")) swap(o, "fountain", { children: [] });
    for (const o of all("l4-vend")) { const h = ctx.place.objects[o.id]; swap(o, "vend", { children: (h?.children ?? []).filter((c) => c.light).map((c) => ({ feetPosition: c.feetPosition, light: c.light })) }); }
    for (const o of all("l4-phone")) { swap(o, "phone", { children: [], rotation: { yaw: o.feetPosition.z - Math.round(o.feetPosition.z) > 0 ? 180 : 0 } }); }
    for (const o of ctx.query({ radius: 0.3, center: { x: HALF - 4, y: 0, z: HALF - 4.5 } })) { const h = ctx.place.objects[o.id]; if (h?.primitive?.kind === "cylinder") { swap(o, "table"); h.tags = ["l4-break-table"]; } }
  }
  if (s.officeV < 3) { // working computers (scripts/computer.js, Back OS): every island desk, and the locked one in Base Omega
    s.officeV = 3; let n = 1;
    for (const [x, z] of [[0, 13], [0, -13], [13, 0], [-13, 0]]) for (const [cx, face] of [[0.82, 1], [-0.82, -1], [-0.82, 1], [0.82, -1]])
      ctx.spawn({ tags: ["usable", "computer"], feetPosition: { x: x + cx, y: 0.76, z: z + face * 0.33 }, rotation: { yaw: face > 0 ? 0 : 180 }, visible: false, behavior: "scripts/computer.js", physics: "static",
        primitive: { kind: "box", width: 0.46, height: 0.36, depth: 0.36 }, state: { kind: "computer", host: `OFC4-${String(n++).padStart(2, "0")}`, lock: "", name: "Computer", verb: "Use", info: "Back OS", tint: "#f2c200" } });
    ctx.spawn({ tags: ["l4-terminal"], feetPosition: { x: -28.5, y: 0, z: -30.8 }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l4-office-geo.js", params: { kind: "terminal" } } });
    ctx.spawn({ tags: ["usable", "computer"], feetPosition: { x: -28.5, y: 0.76, z: -30.5 }, visible: false, behavior: "scripts/computer.js", physics: "static", primitive: { kind: "box", width: 0.46, height: 0.36, depth: 0.36 },
      state: { kind: "computer", host: "OMEGA-OVERSEER", lock: "science:35", name: "Overseer's computer", verb: "Log in", info: "Locked · Science 35 or a password", tint: "#f2c200" } });
  }
  if ((s.officeV ?? 0) >= 3 && !s.islandSplit) { // Shelly: the cubicle islands were one blocky mesh; each island is now its partitions plus four desks, each its own object
    s.islandSplit = 1;
    for (const o of ctx.query({ tags: ["l4-island"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
      const h = ctx.getObject(o.id); if (h?.primitive?.params?.kind !== "island") continue;
      const { x, z } = o.feetPosition; ctx.destroy(o.id);
      ctx.spawn({ tags: ["l4-island", "l4-partition"], feetPosition: { x, y: 0, z }, physics: { body: "static", collider: "mesh" }, visibleRange: { max: 50 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l4-office-geo.js", params: { kind: "partition" } } });
      let seed = 0;
      for (const face of [-1, 1]) for (const cx of [-0.82, 0.82]) ctx.spawn({ tags: ["l4-island", "l4-desk"], feetPosition: { x: x + cx, y: 0, z: z + face * 0.45 }, rotation: { yaw: face > 0 ? 0 : 180 }, physics: { body: "static", collider: "mesh" }, visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l4-office-geo.js", params: { kind: "desk", seed: seed++ } } });
    }
  }
  if ((s.officeV ?? 0) >= 3 && s.islandSplit && s.fitV !== 3) { // 2026-11-14 v3: armchairs caught by model string too. v2: the armchairs became swivel chairs. (Shelly: nothing blocky): island desks, chairs, printers and the carbon-copy cabinet wear fitted models, same ids, tags and behaviors
    s.fitV = 3;
    const all = (t) => ctx.query({ tags: [t], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
    const wear = (id, row) => { const h = ctx.place.objects[id]; if (!h) return null; for (const c of [...(h.children ?? [])]) ctx.destroy(c.id); h.primitive = null; h.material = null; Object.assign(h, row); return h; };
    for (const o of all("l4-island")) { const h = ctx.getObject(o.id), k = h?.primitive?.params?.kind;
      if (k === "chair" || /07a9798f6eec/.test(String(h?.model?.id ?? h?.model ?? ""))) wear(o.id, { ...FIT.chair });
      else if (k === "desk") { wear(o.id, { ...FIT.desk }); ctx.spawn({ parent: o.id, feetPosition: { x: 0.18, y: 0.75, z: -0.14 }, rotation: { yaw: 180 }, castShadow: false, visibleRange: { max: 35 }, model: { id: FITM.crt }, layout: box(0.42, 0.38, 0.4) }); } }
    for (const o of all("l4-printer")) wear(o.id, { ...FIT.printer });
    if (ctx.place.objects["dina-carbon-copy"]) { wear("dina-carbon-copy", { ...FIT.cabinet }); ctx.spawn({ parent: "dina-carbon-copy", feetPosition: { x: 0, y: 1.3, z: 0 }, primitive: { kind: "box", width: 0.3, height: 0.03, depth: 0.22 }, material: { color: "oklch(0.9 0.02 90)", roughness: 0.9 } }); }
  }
  if (s.officeV < 2) { // the shift board: a corkboard on legs by the north desks, handing out office tasks (scripts/l4-office.js)
    s.officeV = 2;
    ctx.spawn("l4-shift-board", { tags: ["usable", "l4-board"], feetPosition: { x: -3.2, y: 0, z: 13 }, rotation: { yaw: 90 }, physics: "static", behavior: "scripts/l4-office.js",
      primitive: { kind: "box", width: 1.3, height: 0.95, depth: 0.06 }, material: { color: "oklch(0.55 0.08 60)", roughness: 1 },
      children: [{ feetPosition: { x: 0, y: -0.95, z: 0 }, primitive: { kind: "box", width: 0.08, height: 0.95, depth: 0.3 }, material: { color: "oklch(0.35 0.01 250)", metalness: 0.4 } },
        ...[[-0.4, 0.62, "#fff3a8"], [-0.05, 0.5, "#ffffff"], [0.32, 0.66, "#bfe3ff"], [0.15, 0.25, "#ffd0d6"], [-0.38, 0.2, "#ffffff"]].map(([x, y, c]) => ({ feetPosition: { x, y, z: 0.035 }, primitive: { kind: "box", width: 0.24, height: 0.28, depth: 0.004 }, material: { color: c } }))],
      ui: '<div face="front" width="1.2m" style="font-family:sans-serif;font-weight:800;font-size:90px;color:#2a2018;text-align:center;margin-top:-6px">SHIFT BOARD</div>',
      state: { kind: "board", name: "Shift board", verb: "Take a task", info: "Office work for supplies", tint: "#f2c14e" } });
    // the board stands on 0.95 m legs: lift the panel to eye height
    const b = ctx.getObject("l4-shift-board"); if (b) b.feetPosition = { x: -3.2, y: 0.95, z: 13 };
  }
  // the bare windows: stand near one and something out there notices you (sanity drains in player.js; this is the voice)
  for (const p of ctx.place.players) {
    const r = roomAt(p.feetPosition.x, p.feetPosition.z); if (!r || r.kind !== "trap") continue;
    const k = `win${p.id}`, sess = ctx.self?.session ?? (ctx.place.session ??= {});
    if (ctx.now() - (s[k] ?? 0) < 9000) continue; s[k] = ctx.now();
    heard(ctx, { clip: "/cdn/voice-dry-breathy-close-whispering-stranger-saying-come-closer-its-warm-out-here.mp3", position: { ...p.feetPosition, y: 1.6 }, volume: 0.8, maxDistance: 6 }, { audience: { player: p.id } });
    ctx.emit("screenFlash", { color: "#dff0ff", duration: 0.5, intensity: 0.35 }, { audience: { player: p.id } });
  }
}

// what each Level 4 prop breaks as (Savi's picks); hp is the material's, scaled
const PROP4 = { chair: ["metal", 0.4], box: ["wood", 0.5], boxes: ["wood", 0.8], plant: ["wood", 0.4], panel: ["wood", 0.9], cabinet: ["sheet_steel", 0.6], island: ["wood", 2.2], desk: ["wood", 0.9], partition: ["wood", 1.4], printer: ["machine", 0.8] };
function breakProps(ctx) {
  for (const r of ctx.query({ excludeTags: ["breakable"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const o = ctx.getObject(r.id); if (!o || !o.physics) continue;
    const kind = /l4-(prop|office)-geo/.test(o.primitive?.script ?? "") ? o.primitive.params?.kind : o.tags?.some((t) => t === "homekit" || t === "l4-npc-home") ? "kit" : null;
    const [mat, k] = kind === "kit" ? ["wood", 1.2] : PROP4[kind] ?? [];
    if (!mat) continue;
    const hp = Math.round((BRK.materials[mat]?.hp ?? 80) * k);
    o.tags = [...o.tags, "breakable"]; o.state.mat = mat; o.state.hp = hp; o.state.maxHp = hp;
  }
}
