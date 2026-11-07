// Level 4 "Abandoned Office": lays the floor, lights, door plates, coolers, fountains, vending, the lift and the stairwell,
// M.E.G. Base Omega's two agents and the sound beds once (place.state.builtV); each second it watches the bare windows.
import { ROOMS, FOUNTAINS, LIFT, STAIRS, HALF, H, T, facing, roomAt } from "../../scripts/lib/level4.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { fullLook } from "../../scripts/lib/clothes.js";
import MEG from "../../scripts/lib/data/meg.yml";
import { npcState } from "../../scripts/lib/stats.js";
import { weaponBody } from "../../scripts/lib/weapon-look.js";
export const cadence = "1s";
const V = 1;
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const OMEGA = {
  "omega-okafor": { name: "Sgt. Okafor · M.E.G. Base Omega", role: "scout", voice: "reyes", gun: "shotgun", at: [-25.5, -22.6], yaw: 180, look: { species: "bear", sex: "m", topw: "jacket", top: "#b8d040", botw: "pants", bottom: "#3a3a32", shoes: "boots", shoec: "#22201c", hat: "cap", hatc: "#4a5a2a", expr: "bored" } },
  "omega-rhea": { name: "Rhea · Omega Medic", role: "medic", voice: "ito", gun: "wrench", at: [-28, -28.5], yaw: 0, look: { species: "fox", sex: "f", topw: "jacket", top: "#e8e8e0", botw: "skirt", bottom: "#2a3040", shoes: "boots", shoec: "#2a2420", expr: "smile" } },
};
const plateUi = (label) => `<div face="front" width="0.5m" style="font-family:sans-serif;text-align:center;color:#2a2620;line-height:1.05"><div style="font-size:150px;font-weight:900">${label}</div><div style="font-size:62px">{{ state.label2 }}</div></div>`;
const coolerUi = `<div face="front" facing="player" width="0.42m" style="font-family:monospace;color:#cfeeff;background:#0e1a22;padding:14px;font-size:44px;line-height:1.2">JUGS {{ state.jugs | default 3 }}/3<div style="margin-top:8px;height:40px;background:#223;position:relative"><div style="position:absolute;left:82%;width:14%;top:0;bottom:0;background:#2f6a3a"></div><div style="position:absolute;left:0;top:8px;bottom:8px;width:{{ state.fill | round }}%;background:#7fd6ff"></div></div>FILL {{ state.fill | round | default 0 }}%</div>`;
function inside(r, along, depth) { // a point in an office: along its wall from a0, depth in from the door wall
  const d = r.door.at - r.inward * depth; return r.door.ax === "z" ? { x: along, y: 0, z: d } : { x: d, y: 0, z: along }; }
export function lay(ctx) {
  ctx.spawn("l4-geo", { feetPosition: { x: 0, y: 0, z: 0 }, physics: { body: "static", collider: "mesh" }, receiveShadow: true, castShadow: false, primitive: { kind: "scripted", script: "scripts/level4-geo.js" }, material: { roughness: 0.9 } });
  // light: a lamp per 8 m in the open, one per room; the bare windows throw cold light in
  for (let x = -24; x <= 24; x += 8) for (let z = -24; z <= 24; z += 8) ctx.spawn({ tags: ["l4-light"], feetPosition: { x, y: H - 0.15, z }, light: { kind: "point", color: "oklch(0.97 0.02 95)", intensity: 3, distance: 12, shadow: { enabled: false } } });
  for (const r of ROOMS) { const c = { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 };
    ctx.spawn({ tags: ["l4-light"], feetPosition: { x: c.x, y: H - 0.15, z: c.z }, light: r.kind === "trap" ? { kind: "point", color: "oklch(0.9 0.05 220)", intensity: 5, distance: 9 } : { kind: "point", color: "oklch(0.96 0.02 95)", intensity: 2.6, distance: 9, shadow: { enabled: false } } }); }
  for (const r of ROOMS) {
    const yaw = facing(r.door.ax === "x" ? r.inward : 0, r.door.ax === "z" ? r.inward : 0), off = r.inward * (T + 0.03);
    const pos = r.door.ax === "z" ? { x: r.door.c + 1.05, y: 1.35, z: r.door.at + off } : { x: r.door.at + off, y: 1.35, z: r.door.c + 1.05 };
    if (r.kind === "office") {
      const a0 = r.door.ax === "z" ? r.x0 : r.z0, a1 = a0 + 8, coolerA = r.door.c < r.mid ? a1 - 0.6 : a0 + 0.6, kitA = r.door.c < r.mid ? a1 - 2.4 : a0 + 2.4;
      const plate = ctx.spawn(`${r.id}-plate`, { tags: ["usable", "l4-plate"], feetPosition: pos, rotation: { yaw }, primitive: { kind: "box", width: 0.5, height: 0.32, depth: 0.03 }, material: { color: "oklch(0.86 0.03 85)", roughness: 0.5 },
        behavior: "scripts/l4-home.js", ui: plateUi(r.label),
        state: { kind: "claim", label: r.label, label2: "vacant", name: `Office ${r.label}`, verb: "Claim", info: "Vacant office · make it your home", tint: "#f2c14e",
          room: { id: r.id, kit: { cot: inside(r, kitA, 4.6), desk: inside(r, r.door.c < r.mid ? a0 + 1.6 : a1 - 1.6, 4.9), yaw: yaw + 180 } } } });
      const cp = inside(r, coolerA, 0.55);
      ctx.spawn(`${r.id}-cooler`, { tags: ["usable", "l4-cooler"], feetPosition: cp, rotation: { yaw: yaw + 180 }, physics: "static", primitive: { kind: "box", width: 0.36, height: 0.95, depth: 0.36 }, material: { color: "oklch(0.93 0.01 90)", roughness: 0.5 },
        behavior: "scripts/l4-home.js", state: { kind: "cooler", plate: plate, jugs: 3, fill: 0, name: "Water cooler", verb: "Fill a bottle", info: "Your office's almond water", tint: "#7fd6ff", c: { x: cp.x, y: 1.1, z: cp.z } },
        children: [{ feetPosition: { x: 0, y: 0.95, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.15, radiusBottom: 0.16, height: 0.42 }, material: { color: "oklch(0.8 0.08 230 / 0.55)", roughness: 0.1, transparent: true } },
          { feetPosition: { x: 0, y: 1.45, z: 0 }, primitive: { kind: "box", width: 0.01, height: 0.01, depth: 0.01 }, visible: true, ui: coolerUi }] });
    } else if (r.kind === "trap") {
      ctx.spawn({ feetPosition: pos, rotation: { yaw }, primitive: { kind: "box", width: 0.5, height: 0.32, depth: 0.03 }, material: { color: "oklch(0.86 0.03 85)" }, ui: plateUi(r.label).replace("{{ state.label2 }}", "DO NOT LOOK OUT") });
      // caution tape across the doorway, sagging
      for (const y of [0.9, 1.4]) ctx.spawn({ feetPosition: r.door.ax === "z" ? { x: r.door.c, y, z: r.door.at + r.inward * 0.15 } : { x: r.door.at + r.inward * 0.15, y, z: r.door.c }, rotation: { yaw, roll: y > 1 ? 4 : -3 }, primitive: { kind: "box", width: 1.25, height: 0.07, depth: 0.005 }, material: { color: "oklch(0.85 0.17 95)", emissive: "oklch(0.4 0.1 95)" } });
    }
  }
  // fountains on the open floor
  for (const [x, z, yaw] of FOUNTAINS) {
    const dx = yaw === -90 ? 0.55 : yaw === 90 ? -0.55 : 0, dz = yaw === 0 ? -0.55 : yaw === 180 ? 0.55 : 0, p = { x: x + dx, y: 0, z: z + dz };
    ctx.spawn({ tags: ["usable", "l4-fountain"], feetPosition: p, rotation: { yaw }, physics: "static", primitive: { kind: "box", width: 0.5, height: 0.9, depth: 0.4 }, material: { color: "oklch(0.75 0.01 250)", metalness: 0.7, roughness: 0.3, texture: "cdn/texture-scratched-worn-steel.png" },
      behavior: "scripts/l4-home.js", state: { kind: "fountain", name: "Drinking fountain", verb: "Drink", info: "Almond water, cold", tint: "#7fd6ff" },
      children: [{ feetPosition: { x: 0, y: 0.9, z: 0 }, primitive: { kind: "box", width: 0.46, height: 0.06, depth: 0.36 }, material: { color: "oklch(0.85 0.01 250)", metalness: 0.8, roughness: 0.2 } }] });
  }
  // break room: three vending machines on its south wall, a table
  for (const i of [0, 1, 2]) {
    const x = HALF - 7 + i * 1.3;
    ctx.spawn({ tags: ["usable", "l4-vend"], feetPosition: { x, y: 0, z: HALF - 0.75 }, rotation: { yaw: 0 }, physics: "static", primitive: { kind: "box", width: 1, height: 1.85, depth: 0.8 }, material: { color: ["oklch(0.45 0.15 25)", "oklch(0.4 0.1 250)", "oklch(0.55 0.13 140)"][i], roughness: 0.4, metalness: 0.3 },
      behavior: "scripts/l4-home.js", state: { kind: "vend", name: "Vending machine", verb: "Push the button", info: "Restocks itself. Nobody knows how.", tint: "#f2c14e" },
      children: [{ feetPosition: { x: -0.12, y: 0.55, z: -0.405 }, primitive: { kind: "box", width: 0.62, height: 1.1, depth: 0.01 }, material: { color: "oklch(0.85 0.04 90)", emissive: "oklch(0.8 0.05 90)", emissiveIntensity: 0.9 } },
        { feetPosition: { x: 0, y: 0.6, z: -0.6 }, light: { kind: "point", color: "oklch(0.9 0.05 90)", intensity: 1.2, distance: 3.5 } }] });
  }
  ctx.spawn({ feetPosition: { x: HALF - 4, y: 0, z: HALF - 4.5 }, physics: "static", primitive: { kind: "cylinder", radiusTop: 0.6, radiusBottom: 0.6, height: 0.74 }, material: { color: "oklch(0.85 0.01 90)", roughness: 0.5 } });
  // the lift home to Level 3, its lit call button, a sign; where you step out
  ctx.spawn("l4-lift-door", { tags: ["door"], feetPosition: { x: LIFT.x - 0.6, y: 0, z: LIFT.z }, physics: { body: "static", trigger: true }, primitive: { kind: "box", width: 0.6, height: 2.3, depth: 1.6 }, visible: false, behavior: "scripts/level-door.js", state: { to: "level3#l3-lift-arrive" } });
  ctx.spawn("l4-lift-arrive", { feetPosition: { x: LIFT.x - 3.2, y: 0.1, z: LIFT.z + 1 }, rotation: { yaw: 180 } });
  ctx.spawn({ feetPosition: { x: LIFT.x - 0.27, y: 2.55, z: LIFT.z }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 1.4, height: 0.3, depth: 0.02 }, material: { color: "oklch(0.2 0.01 250)" },
    ui: '<div face="front" width="1.4m" style="font-size:150px;font-weight:900;color:#ffd890;text-align:center">▼ LEVEL 3</div>' });
  ctx.spawn({ feetPosition: { x: LIFT.x - 0.26, y: 1.25, z: LIFT.z + 1.27 }, primitive: { kind: "sphere", radius: 0.035 }, material: { color: "#ffb040", emissive: "#ffb040", emissiveIntensity: 3 } });
  // the stairwell: EXIT over the chained door
  ctx.spawn({ tags: ["usable"], feetPosition: { x: STAIRS.x, y: 0.9, z: STAIRS.z - 0.35 }, primitive: { kind: "box", width: 0.9, height: 0.3, depth: 0.05 }, visible: false, behavior: "scripts/l4-home.js", state: { kind: "stairs", name: "Stairwell", verb: "Push", info: "Level 5", tint: "#ff8060" } });
  ctx.spawn({ feetPosition: { x: STAIRS.x, y: 2.3, z: STAIRS.z - 0.24 }, primitive: { kind: "box", width: 0.7, height: 0.25, depth: 0.06 }, material: { color: "oklch(0.25 0.01 30)" },
    ui: '<div face="front" width="0.7m" style="font-size:160px;font-weight:900;color:#ff5040;text-align:center">EXIT</div>', light: { kind: "point", color: "oklch(0.6 0.2 25)", intensity: 1.2, distance: 4 } });
  ctx.spawn({ feetPosition: { x: STAIRS.x, y: 1.7, z: STAIRS.z - 0.25 }, primitive: { kind: "box", width: 0.9, height: 0.25, depth: 0.01 }, material: { color: "oklch(0.88 0.02 90)" },
    ui: '<div face="front" width="0.9m" style="font-size:90px;font-weight:800;color:#222;text-align:center">LEVEL 5 · STAIRS</div>' });
  for (const [dy, roll] of [[1.2, 18], [1.25, -18]]) ctx.spawn({ feetPosition: { x: STAIRS.x, y: dy, z: STAIRS.z - 0.32 }, rotation: { yaw: 0, roll }, primitive: { kind: "box", width: 1.05, height: 0.05, depth: 0.04 }, material: { color: "oklch(0.4 0.02 60)", metalness: 0.8, roughness: 0.4 } });
  // Base Omega: a plate, sandbags at its door, two agents
  ctx.spawn({ feetPosition: { x: -27.5, y: 2.45, z: -HALF + 8 + T + 0.03 }, rotation: { yaw: 180 }, primitive: { kind: "box", width: 2.6, height: 0.5, depth: 0.04 }, material: { color: "oklch(0.25 0.04 140)" },
    ui: '<div face="front" width="2.6m" style="font-size:150px;font-weight:900;color:#d8f0a0;text-align:center;line-height:1">M.E.G. BASE OMEGA<div style="font-size:70px;color:#b8d080">wanderers welcome · weapons lowered</div></div>' });
  for (let i = 0; i < 4; i++) ctx.spawn({ feetPosition: { x: -23.3, y: (i % 2) * 0.32, z: -23.2 + (i >> 1) * 0.0 + (i >> 1) * 0.6 }, primitive: { kind: "capsule", radius: 0.16, halfHeight: 0.3 }, rotation: { yaw: 90, roll: 90 }, physics: "static", material: { color: "oklch(0.6 0.05 85)", roughness: 1 } });
  for (const [id, g] of Object.entries(OMEGA)) {
    ctx.spawn(id, { tags: ["npc", "omega"], feetPosition: { x: g.at[0], y: 0, z: g.at[1] }, rotation: { yaw: g.yaw }, physics: "character", ...critterSpec(fullLook(g.look)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"], state: { name: g.name, role: g.role, voice: g.voice, ...npcState(ctx, "agent", MEG.hp) } });
    ctx.spawn({ parent: id, attachment: { bone: "RightHand" }, ...weaponBody(g.gun) });
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
    ctx.spawn({ tags: ["l4-island"], feetPosition: { x, y: 0, z }, physics: { body: "static", collider: "mesh" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/l4-office-geo.js", params: { kind: "island" } } });
    for (const [cx, face] of [[0.82, 1], [-0.82, -1], [-0.82, 1], [0.82, -1]]) ctx.spawn({ tags: ["l4-island"], feetPosition: { x: x + cx, y: 0, z: z + face * 1.25 }, rotation: { yaw: face > 0 ? 180 : 0 }, primitive: { kind: "scripted", script: "scripts/l4-prop-geo.js", params: { kind: "chair" } } });
    for (const [cx, face] of [[0.82, 1], [-0.82, -1]]) ctx.spawn({ tags: ["usable", "l4-phone"], feetPosition: { x: x + cx + 0.42, y: 0.75, z: z + face * 0.3 }, physics: "static", behavior: "scripts/l4-office.js",
      primitive: { kind: "box", width: 0.22, height: 0.08, depth: 0.18 }, material: { color: "oklch(0.82 0.03 85)", roughness: 0.6 },
      children: [{ feetPosition: { x: 0, y: 0.08, z: 0 }, primitive: { kind: "box", width: 0.2, height: 0.04, depth: 0.05 }, material: { color: "oklch(0.78 0.03 85)" } }],
      state: { kind: "phone", name: "Desk phone", verb: "Pick up", info: "Desk phone" } });
    ctx.spawn({ tags: ["usable", "l4-printer"], feetPosition: { x: x + 2.15, y: 0, z }, rotation: { yaw: 90 }, physics: "static", behavior: "scripts/l4-office.js",
      primitive: { kind: "scripted", script: "scripts/l4-office-geo.js", params: { kind: "printer" } }, state: { kind: "printer", name: "Printer", verb: "Read", info: "Something is half printed" } });
  }
  ctx.spawn("l4-office-mgr", { feetPosition: { x: 0, y: 0, z: 0 }, behavior: "scripts/l4-office.js", state: { kind: "manager" } });
}
export function tick(ctx) {
  const s = ctx.place.state;
  if (s.builtV !== V) { s.builtV = V; lay(ctx); }
  if (!s.officeV) { s.officeV = 1; layOffice(ctx); }
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
    ctx.emit("playSound", { clip: "/cdn/voice-dry-breathy-close-whispering-stranger-saying-come-closer-its-warm-out-here.mp3", position: { ...p.feetPosition, y: 1.6 }, volume: 0.8, maxDistance: 6 }, { audience: { player: p.id } });
    ctx.emit("screenFlash", { color: "#dff0ff", duration: 0.5, intensity: 0.35 }, { audience: { player: p.id } });
  }
}
