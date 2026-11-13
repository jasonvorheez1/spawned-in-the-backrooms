// The Test Range's Enemy Bay (Shelly, Nov 13: "make an enemy testing area in debug room"): a walled annex east of the hall,
// one pad per foe kind, pens at the far wall. Each foe is the same row its home level spawns, run by the same manager.
// Pads write place.state.want_bay = { kind, at }; foeBayTick spawns it. Cap per kind keeps the bay sane.
import L from "./data/level0.yml";
import L1 from "./data/level1.yml";
import { npcState } from "./stats.js";
import { LURKER_MODEL, LURKER_SCALE } from "../lurkers.js";
import { MODEL as SMILER_MODEL, SCALE as SMILER_SCALE } from "../smilers.js";
import { M as M70 } from "./level70-life.js";
import { F as F70 } from "../l70-foes.js";
import { MODEL as SMILER6_MODEL, SCALE as SMILER6_SCALE } from "../l6-smiler.js";
import { TENANT, LURKER as LURKER13 } from "./level13-foes.js";
import { swarm as MOTHS } from "../../templates/deathmoths.js";
import E5 from "./data/l5-entities.json";
import L11 from "./data/l11-depths.yml";
import L13 from "./data/level13.yml";
import C3 from "./data/creatures3.yml";

export const BAY_V = 8; // 8: Custodians at Level 11 size (1.9 m, forward +x); // 7: Custodians run their real kit (scripts/custodians.js); // 6: Custodian robots; // 5: a test-dummy pad; // 4: clumps run scripts/clumps.js; // 3: the Dark Smiler runs its own revamped hunt; // 2: a pad for every enemy (Shelly: "im pretty sure theres more enemies than that")
const X0 = 24, X1 = 50, Z0 = -26, Z1 = -2, H = 6, DOOR = [-14, -10.5]; // the annex box and the doorway through the hall's east wall
const CAP = 4; // live foes per kind (my pick)
const PEN = { x: 46, z: -14 }; // where they come out
const BOX70 = { froidling: { min: { x: -0.62, y: 0, z: -0.62 }, max: { x: 0.62, y: 1.1, z: 0.62 } }, deathrat70: { min: { x: -0.45, y: 0, z: -0.45 }, max: { x: 0.45, y: 0.5, z: 0.45 } } };
export const KINDS = {
  smiler: { name: "Smiler", tag: "smiler", color: "oklch(0.62 0.2 25)" },
  lurker: { name: "Lurker", tag: "lurker", color: "oklch(0.55 0.17 300)" },
  hound: { name: "Hound", tag: "hound", color: "oklch(0.6 0.16 50)" },
  froidling: { name: "Snow Hound", tag: "froidling", color: "oklch(0.72 0.1 240)" },
  deathrat70: { name: "Snow Rat", tag: "deathrat70", color: "oklch(0.7 0.03 70)" },
  partygoer: { name: "Partygoer", tag: "partygoer", color: "oklch(0.75 0.17 90)" },
  balloon: { name: "Balloon", tag: "l26-balloon", color: "oklch(0.7 0.18 140)" },
  moths: { name: "Deathmoths", tag: "bay-moths", color: "oklch(0.55 0.04 70)" },
  smiler6: { name: "Dark Smiler", tag: "bay-smiler6", color: "oklch(0.4 0.02 260)" },
  rat5: { name: "Death Rat", tag: "bay-rat5", color: "oklch(0.45 0.1 30)" },
  sentry: { name: "Custodian Unit", tag: "bay-sentry", color: "oklch(0.7 0.12 80)" },
  smgbot: { name: "Custodian Suppressor", tag: "bay-smgbot", color: "oklch(0.55 0.18 25)" },
  clump: { name: "Clump", tag: "bay-clump", color: "oklch(0.65 0.08 40)" },
  tenant: { name: "Tenant", tag: "bay-tenant", color: "oklch(0.6 0.06 200)" },
  lurker13: { name: "Hall Lurker", tag: "bay-lurker13", color: "oklch(0.45 0.08 150)" },
};
const CLUMP_GLB = "/cdn/value.aeb91c70e11f57592fd7fe510b2e8bfd86065edacbb87155c02fa34a5761c396.glb", PARTY_GLB = "/cdn/value.26b362d316413677eaf77a390fda1afb0b1651baf57b6c1c3ba429dc3447fa2d.glb", BALLOON_GLB = "/cdn/value.bbcd28912111e39613cec71f06224b7742148d3493106c89a76f739e3003f366.glb";
// stand-ins run by scripts/bay-brain.js: their home level's model and numbers, a simple hunt
const BRAIN = {
  moths: { hp: C3.moths.hp, brain: { fly: 1, speed: 2.6, reach: 1.2, dmg: C3.moths.bite, cd: 1.1, bite: "dry-moth-wings-fluttering-burst" } },
  rat5: { hp: E5.rat.hp, brain: { speed: 4.2, reach: 0.9, dmg: Array.isArray(E5.rat.bite) ? E5.rat.bite[1] : (E5.rat.bite ?? 3), cd: 0.7, rig: 0 } },
  sentry: { hp: L11.kinds.sentry.hp, brain: { speed: L11.kinds.sentry.speed, reach: 0.8, range: L11.kinds.sentry.range, keep: L11.kinds.sentry.keep, dmg: L11.kinds.sentry.dmg, cd: L11.kinds.sentry.cd, rig: 1, bolt: 65 } },
  smgbot: { hp: L11.kinds.smgbot.hp, brain: { speed: L11.kinds.smgbot.speed, reach: 0.8, range: L11.kinds.smgbot.range, keep: L11.kinds.smgbot.keep, dmg: L11.kinds.smgbot.dmg, cd: L11.kinds.smgbot.cd, burst: L11.kinds.smgbot.burst, burstGap: L11.kinds.smgbot.burstGap, rig: 1, bolt: 200 } },
  clump: { hp: L11.kinds.clump.hp, brain: { speed: L11.kinds.clump.speed, reach: L11.kinds.clump.reach, dmg: L11.kinds.clump.dmg, cd: L11.kinds.clump.cd } },
  tenant: { hp: L13.foes.tenant.hp, brain: { rig: 1, speed: 1.8, reach: 1.4, dmg: 10, cd: 1.2 } },
  lurker13: { hp: L13.foes.lurker.hp, brain: { rig: 1, speed: 2.8, reach: 1.6, dmg: 16, cd: 1.3 } },
};
const T = (name, rep, color) => ({ texture: `cdn/texture-${name}.png`, wrap: "repeat", repeat: [rep, rep], color, roughness: 0.85 });

export function foeBayBuild(ctx, pad, sign) {
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("tl-bay-")) ctx.destroy(id);
  if (ctx.place.objects["tl-wall-e"]) ctx.destroy("tl-wall-e"); // the hall's east wall gets a doorway: three pieces stand in its place
  const WALL = T("painted-cinder-block-wall-grey", 0.4, "oklch(0.78 0.01 240)"), CON = T("polished-grey-concrete-floor", 0.25, "oklch(0.55 0.01 250)"), CEIL = T("acoustic-drop-ceiling-tile-white", 0.5, "oklch(0.85 0.01 90)");
  const box = (id, x, y, z, w, h, d, mat, extra = {}) => ctx.spawn("tl-bay-" + id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material: mat, physics: "static", castShadow: false, ...extra });
  const HZ0 = -26, HZ1 = 24;
  box("hall-e1", X0, 0, (HZ0 + DOOR[0]) / 2, 0.3, H, DOOR[0] - HZ0, WALL);
  box("hall-e2", X0, 0, (DOOR[1] + HZ1) / 2, 0.3, H, HZ1 - DOOR[1], WALL);
  box("hall-lintel", X0, 2.6, (DOOR[0] + DOOR[1]) / 2, 0.3, H - 2.6, DOOR[1] - DOOR[0], WALL);
  // the annex shell
  box("floor", (X0 + X1) / 2, -0.3, (Z0 + Z1) / 2, X1 - X0, 0.3, Z1 - Z0, CON, { receiveShadow: true });
  box("ceil", (X0 + X1) / 2, H, (Z0 + Z1) / 2, X1 - X0, 0.2, Z1 - Z0, CEIL);
  box("wall-n", (X0 + X1) / 2, 0, Z0, X1 - X0, H, 0.3, WALL);
  box("wall-s", (X0 + X1) / 2, 0, Z1, X1 - X0, H, 0.3, WALL);
  box("wall-e", X1, 0, (Z0 + Z1) / 2, 0.3, H, Z1 - Z0, WALL);
  // hazard stripes: the safe strip by the door, the kill floor beyond
  const stripe = (id, x, z, w, d, c) => ctx.spawn("tl-bay-stripe-" + id, { feetPosition: { x, y: 0.003, z }, primitive: { kind: "box", width: w, height: 0.004, depth: d }, material: { color: c, roughness: 0.6 }, castShadow: false });
  for (let i = 0; i < 12; i++) stripe("h" + i, 33, Z0 + 1 + i * 2, 0.3, 1, i % 2 ? "oklch(0.2 0.01 90)" : "oklch(0.82 0.16 92)");
  stripe("pen", PEN.x, PEN.z, 5, 0.12, "oklch(0.6 0.2 25)"); stripe("pen2", PEN.x - 2.5, PEN.z, 0.12, 8, "oklch(0.6 0.2 25)");
  // light: a troffer grid and its lamps, two red cage lamps over the pen
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = 28 + i * 8, z = -20 + j * 12;
    box(`trof-${i}-${j}`, x, H - 0.06, z, 1.2, 0.05, 0.6, { color: "oklch(0.97 0.01 95)", emissive: "oklch(0.97 0.02 95)", emissiveIntensity: 2.4 }, { physics: "none", light: { kind: "point", color: "oklch(0.95 0.02 95)", intensity: 2.2, distance: 16 } }); }
  for (const [k, z] of [["a", -18], ["b", -10]]) ctx.spawn("tl-bay-cage-" + k, { feetPosition: { x: 48.6, y: 3.2, z }, primitive: { kind: "sphere", radius: 0.14 }, material: { color: "oklch(0.6 0.2 25)", emissive: "oklch(0.6 0.22 25)", emissiveIntensity: 3 }, light: { kind: "point", color: "oklch(0.65 0.2 25)", intensity: 1.4, distance: 9 }, castShadow: false });
  // signs
  ctx.spawn("tl-bay-sign-hall", { feetPosition: { x: X0 - 0.2, y: 3.6, z: (DOOR[0] + DOOR[1]) / 2 }, rotation: { yaw: -90 }, vector: sign("ENEMY BAY →") });
  ctx.spawn("tl-bay-sign", { feetPosition: { x: X1 - 0.2, y: 4.2, z: PEN.z }, rotation: { yaw: -90 }, vector: sign("ENEMY BAY") });
  ctx.spawn("tl-bay-help", { feetPosition: { x: 27, y: 2.2, z: Z1 - 0.2 }, rotation: { yaw: 180 }, vector: `<svg viewBox='0 0 520 120' width='3.2m'><rect width='520' height='120' rx='8' fill='#14161a' opacity='0.9'/><text x='20' y='44' font-family='display' font-size='28' fill='#f3d27a'>STEP ON A PAD TO RELEASE A FOE</text><text x='20' y='86' font-family='sans-serif' font-size='22' fill='#e9e2c4'>max ${CAP} of each · CLEAR wipes the bay · HEAL tops you up</text></svg>` });
  // pads, a row along the safe strip
  Object.entries(KINDS).forEach(([k, K], i) => { const col = i % 2, row = Math.floor(i / 2); pad(ctx, "tl-bay-pad-" + k, "bay:" + k, K.name.toUpperCase(), 28.8 + col * 2.4, -24.4 + row * 2.6 + col * 1.3, K.color); if (col) { const l = ctx.place.objects["tl-bay-pad-" + k + "-label"]; if (l) l.feetPosition = { ...l.feetPosition, y: 2.3 }; } });
  pad(ctx, "tl-bay-pad-clear", "bay:clear", "CLEAR BAY", 26.5, -22, "oklch(0.78 0.15 80)");
  pad(ctx, "tl-bay-pad-decoy", "bay:decoy", "TEST DUMMY", 26.5, -14, "oklch(0.75 0.1 70)");
  pad(ctx, "tl-bay-pad-heal", "heal", "FULL HEAL", 26.5, -6, "oklch(0.7 0.17 150)");
  // the packs that run them: the bay's own managers, same scripts as the levels
  ctx.spawn("tl-bay-hounds", { feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/hounds.js" });
  ctx.spawn("tl-bay-party", { feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/partygoers.js" });
  ctx.spawn("tl-bay-custodians", { feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/custodians.js" });
  ctx.spawn("tl-bay-clumps", { feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/clumps.js" });
  ctx.spawn("tl-bay-smiler6", { feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/l6-smiler.js" });
  ctx.spawn("tl-bay-brain", { feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/bay-brain.js" });
  ctx.spawn("tl-bay-l70", { tags: ["l70-mgr"], feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/l70-foes.js" });
}

function spawnFoe(ctx, kind, n) {
  const a = n * 2.4, x = PEN.x + Math.cos(a) * 1.5, z = PEN.z + Math.sin(a) * 2.5, p = { x, y: 0.05, z }, rot = { yaw: -90 };
  if (kind === "smiler") return ctx.spawn({ tags: ["smiler", "tl-bay-foe"], feetPosition: p, rotation: rot, model: SMILER_MODEL, scale: SMILER_SCALE, physics: { body: "character" }, state: { hp: L.smilerHp } });
  if (kind === "lurker") return ctx.spawn({ tags: ["lurker", "tl-bay-foe"], feetPosition: p, rotation: rot, model: LURKER_MODEL, scale: LURKER_SCALE, physics: { body: "character" }, state: { hp: L.lurkerHp, kind: "lurker" } });
  if (kind === "hound") return ctx.spawn({ tags: ["hound", "tl-bay-foe"], feetPosition: p, rotation: rot, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", L1.houndHp, { xp: L1.xpHound }) });
  if (kind === "smiler6") return ctx.spawn({ tags: ["smiler", "l6-smiler", "hostile", "bay-smiler6", "tl-bay-foe"], feetPosition: p, rotation: rot, model: SMILER6_MODEL, scale: SMILER6_SCALE, physics: { body: "character" }, state: { hp: 160, maxHp: 160, name: "Dark Smiler", arena: 1, home: { x: PEN.x, y: 0, z: PEN.z } } });
  if (kind === "sentry" || kind === "smgbot") return ctx.spawn({ tags: ["custodian-ai", "l8-hostile", "l11sentry", KINDS[kind].tag, "tl-bay-foe"], feetPosition: p, rotation: rot, model: { id: kind === "sentry" ? "/cdn/value.5a18bb1b3ab741080cf1b881ad99be1a9ace445a5e3fa9a4c7c2c6cb9dafb71d.glb" : "/cdn/value.43aa4b081f1cd7b36230499f345e1768336249a85f6e12e9e3707a38c4b5e3b7.glb", forward: "+x" }, layout: { box: { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 1.9, z: 0.5 } } }, physics: { body: "character" }, audio: { clip: "/cdn/moodboard-scifi-neon/sfx-old-vacuum-tube-electrical-hum-and-relay-ticking-loop.mp3", loop: true, gain: 0.25, spatial: true, maxDistance: 12 }, state: { hp: L11.kinds[kind].hp, maxHp: L11.kinds[kind].hp, name: L11.kinds[kind].name, kind, xp: L11.kinds[kind].xp } });
  if (kind === "clump") return ctx.spawn({ tags: ["clump-ai", "l8-hostile", "bay-clump", "tl-bay-foe"], feetPosition: p, rotation: rot, model: { id: CLUMP_GLB, forward: "+x" }, layout: { box: { min: { x: -0.8, y: 0, z: -0.8 }, max: { x: 0.8, y: 1.2, z: 0.8 } } }, physics: { body: "character", collider: "capsule" }, state: { hp: L11.kinds.clump.hp, maxHp: L11.kinds.clump.hp, name: "Clump", kind: "clump", xp: L11.kinds.clump.xp, home: { x: PEN.x, y: 0, z: PEN.z } } });
  if (kind === "partygoer") return ctx.spawn({ tags: ["partygoer", "l8-hostile", "tl-bay-foe"], feetPosition: p, rotation: rot, model: { forward: "+x", id: PARTY_GLB }, layout: { box: { min: { x: -0.55, y: 0, z: -0.55 }, max: { x: 0.55, y: 1.45, z: 0.55 } } }, physics: { body: "character", collider: "capsule" }, state: { home: { x: p.x, y: 0, z: p.z }, hp: 220 } });
  if (kind === "balloon") return ctx.spawn({ tags: ["l26-balloon", "l8-hostile", "tl-bay-foe"], feetPosition: { ...p, x: p.x - 4 }, model: { id: BALLOON_GLB }, layout: { box: { min: { x: -0.28, y: 0.15, z: -0.28 }, max: { x: 0.28, y: 1.85, z: 0.28 } } }, physics: { body: "kinematic", collider: "sphere" }, state: { home: { x: p.x - 4, y: 0, z: p.z }, hp: 10 } });
  if (BRAIN[kind]) {
    const b = BRAIN[kind], st = { hp: b.hp, maxHp: b.hp, name: KINDS[kind].name, kind, brain: b.brain, xp: 30 }, tags = ["baybrain", "l8-hostile", KINDS[kind].tag, "tl-bay-foe"];
    if (kind === "moths") return ctx.spawn({ ...MOTHS, tags: [...MOTHS.tags, ...tags], feetPosition: { ...p, y: 1.4 }, state: { ...MOTHS.state, ...st } });
    const look = { sentry: { model: "/cdn/value.5a18bb1b3ab741080cf1b881ad99be1a9ace445a5e3fa9a4c7c2c6cb9dafb71d.glb" }, smgbot: { model: "/cdn/value.43aa4b081f1cd7b36230499f345e1768336249a85f6e12e9e3707a38c4b5e3b7.glb" }, smiler6: { model: SMILER6_MODEL, scale: SMILER6_SCALE }, rat5: { model: { id: E5.rat.model, forward: "+x" }, layout: { box: { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 0.21, z: 0.5 } } } },
      clump: { model: { id: CLUMP_GLB, forward: "+x" }, layout: { box: { min: { x: -0.8, y: 0, z: -0.8 }, max: { x: 0.8, y: 1.2, z: 0.8 } } } },
      tenant: { model: { id: TENANT, forward: "+x" }, layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: L13.foes.tenant.height, z: 0.6 } } } },
      lurker13: { model: { id: LURKER13, forward: "+x" }, layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: L13.foes.lurker.height, z: 0.6 } } } } }[kind];
    return ctx.spawn({ tags, feetPosition: p, rotation: rot, ...look, physics: { body: "character", collider: "capsule" }, state: st });
  }
  const K = F70[kind];
  return ctx.spawn({ tags: ["moths", "l70foe", kind, "tl-bay-foe"], feetPosition: p, rotation: rot, model: { ...M70[kind] }, layout: { box: BOX70[kind] }, physics: { body: "character", collider: "capsule" },
    state: { ...npcState(ctx, "rat", K.hp, { xp: kind === "froidling" ? 40 : 14 }), kind, name: K.name, pack: "bay-" + kind, n, home: { x: PEN.x, y: 0, z: PEN.z } } });
}

export function foeBayTick(ctx) {
  const s = ctx.place.state, w = s.want_bay; if (!w) return;
  s.want_bay = null;
  if (w.kind === "decoy") { const n = ctx.query({ tags: ["bay-decoy"], radius: 1e4 }).length; if (n >= CAP) return;
    ctx.spawn({ tags: ["bay-decoy", "tl-bay-foe"], feetPosition: { x: PEN.x - 6 + n * 1.6, y: 0, z: PEN.z - 2 + n * 1.2 }, physics: { body: "kinematic", collider: "capsule" }, behavior: "scripts/decoy.js",
      primitive: { kind: "capsule", radius: 0.3, halfHeight: 0.55 }, material: { color: "oklch(0.72 0.09 70)", texture: "cdn/texture-burlap-sack-weave.png", roughness: 0.9 },
      state: { hp: 300, maxHp: 300, name: "Test Dummy" },
      ui: '<div face="front" at="0.5 0.92" width="0.6m" facing="player" class="px-2 py-1 bg-black/80 text-amber-200 text-center rounded" style="font-size:70px">DUMMY {{ state.hp | round }}</div>' });
    return; }
  if (w.kind === "clear") { for (const o of ctx.query({ tags: ["tl-bay-foe"], radius: 1e4 })) ctx.destroy(o.id); return; }
  const K = KINDS[w.kind]; if (!K) return;
  const live = ctx.query({ tags: [K.tag, "tl-bay-foe"], radius: 1e4 }).filter((o) => !o.state?.dead && !o.state?.corpseAt).length;
  if (live < CAP) spawnFoe(ctx, w.kind, live);
}
