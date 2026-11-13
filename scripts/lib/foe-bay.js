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

export const BAY_V = 1;
const X0 = 24, X1 = 50, Z0 = -26, Z1 = -2, H = 6, DOOR = [-14, -10.5]; // the annex box and the doorway through the hall's east wall
const CAP = 4; // live foes per kind (my pick)
const PEN = { x: 46, z: -14 }; // where they come out
const BOX70 = { froidling: { min: { x: -0.62, y: 0, z: -0.62 }, max: { x: 0.62, y: 1.1, z: 0.62 } }, deathrat70: { min: { x: -0.45, y: 0, z: -0.45 }, max: { x: 0.45, y: 0.5, z: 0.45 } } };
export const KINDS = {
  smiler: { name: "Smiler", tag: "smiler", color: "oklch(0.62 0.2 25)" },
  lurker: { name: "Lurker", tag: "lurker", color: "oklch(0.55 0.17 300)" },
  hound: { name: "Hound", tag: "hound", color: "oklch(0.6 0.16 50)" },
  froidling: { name: "Snow Hound", tag: "froidling", color: "oklch(0.72 0.1 240)" },
  deathrat70: { name: "Death Rat", tag: "deathrat70", color: "oklch(0.7 0.03 70)" },
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
  Object.entries(KINDS).forEach(([k, K], i) => pad(ctx, "tl-bay-pad-" + k, "bay:" + k, "SPAWN " + K.name.toUpperCase(), 29.5, -22 + i * 3, K.color));
  pad(ctx, "tl-bay-pad-clear", "bay:clear", "CLEAR BAY", 26.5, -22, "oklch(0.78 0.15 80)");
  pad(ctx, "tl-bay-pad-heal", "heal", "FULL HEAL", 26.5, -6, "oklch(0.7 0.17 150)");
  // the packs that run them: the bay's own managers, same scripts as the levels
  ctx.spawn("tl-bay-hounds", { feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/hounds.js" });
  ctx.spawn("tl-bay-l70", { tags: ["l70-mgr"], feetPosition: { x: PEN.x, y: 0, z: PEN.z }, behavior: "scripts/l70-foes.js" });
  ctx.spawn("tl-bay-growl", { feetPosition: { x: PEN.x, y: 1, z: PEN.z }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-low-distant-creature-growl-loop.mp3", gain: 0.08, loop: true, maxDistance: 18 } });
}

function spawnFoe(ctx, kind, n) {
  const a = n * 2.4, x = PEN.x + Math.cos(a) * 1.5, z = PEN.z + Math.sin(a) * 2.5, p = { x, y: 0.05, z }, rot = { yaw: -90 };
  if (kind === "smiler") return ctx.spawn({ tags: ["smiler", "tl-bay-foe"], feetPosition: p, rotation: rot, model: SMILER_MODEL, scale: SMILER_SCALE, physics: { body: "character" }, state: { hp: L.smilerHp } });
  if (kind === "lurker") return ctx.spawn({ tags: ["lurker", "tl-bay-foe"], feetPosition: p, rotation: rot, model: LURKER_MODEL, scale: LURKER_SCALE, physics: { body: "character" }, state: { hp: L.lurkerHp, kind: "lurker" } });
  if (kind === "hound") return ctx.spawn({ tags: ["hound", "tl-bay-foe"], feetPosition: p, rotation: rot, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", L1.houndHp, { xp: L1.xpHound }) });
  const K = F70[kind];
  return ctx.spawn({ tags: ["moths", "l70foe", kind, "tl-bay-foe"], feetPosition: p, rotation: rot, model: { ...M70[kind] }, layout: { box: BOX70[kind] }, physics: { body: "character", collider: "capsule" },
    state: { ...npcState(ctx, "rat", K.hp, { xp: kind === "froidling" ? 40 : 14 }), kind, name: K.name, pack: "bay-" + kind, n, home: { x: PEN.x, y: 0, z: PEN.z } } });
}

export function foeBayTick(ctx) {
  const s = ctx.place.state, w = s.want_bay; if (!w) return;
  s.want_bay = null;
  if (w.kind === "clear") { for (const o of ctx.query({ tags: ["tl-bay-foe"], radius: 1e4 })) ctx.destroy(o.id); return; }
  const K = KINDS[w.kind]; if (!K) return;
  const live = ctx.query({ tags: [K.tag, "tl-bay-foe"], radius: 1e4 }).filter((o) => !o.state?.dead && !o.state?.corpseAt).length;
  if (live < CAP) spawnFoe(ctx, w.kind, live);
}
