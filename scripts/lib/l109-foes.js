// Level 109's bodies for the containment books (scripts/lib/containment.js spawnFoe contract).
// spawnFoe(ctx, kind, pos, state): kind is "hound" | "skinstealer" | "clump" | "deathmoth". Returns the spawned id, or null.
// The bodies are the world's own (Level 11's hound and clump, the skin-stealer, the deathmoth swarm); one keeper,
// scripts/l109-pen.js (id "l109-pen-mgr"), moves them all by the level's rule: shut in until a door is opened.
import D from "./data/l109-foes.yml";
import { npcState } from "./stats.js";
const HOUND = "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb";
const CLUMP = "/cdn/value.aeb91c70e11f57592fd7fe510b2e8bfd86065edacbb87155c02fa34a5761c396.glb";
export const MGR = "l109-pen-mgr";
const NAMES = { hound: "Hound", skinstealer: "Skin-Stealer", clump: "Clump", deathmoth: "Deathmoths" };
export function spawnFoe(ctx, kind, pos, state) {
  const K = D.kinds[kind]; if (!K) return null;
  if (!ctx.place.objects[MGR]) ctx.spawn(MGR, { feetPosition: { x: pos.x, y: 0, z: pos.z }, behavior: "scripts/l109-pen.js", audience: "all", tags: ["l109-keeper"] });
  const S = D.sounds[kind], feet = { x: pos.x, y: pos.y ?? 0.1, z: pos.z };
  const st = { kind: kind === "deathmoth" ? "moths" : kind, name: NAMES[kind], hp: K.hp, maxHp: K.hp, xp: K.xp, ...state };
  const loop = S.loop ? { audio: { clip: S.loop, loop: true, gain: 0.22, spatial: true, maxDistance: 12 } } : {};
  if (kind === "hound") return ctx.spawn({ tags: ["pen-foe", "l8-hostile", "hound"], feetPosition: feet, physics: { body: "character" }, model: { id: HOUND }, scale: 1, state: st, ...loop });
  if (kind === "clump") return ctx.spawn({ tags: ["pen-foe", "l8-hostile"], feetPosition: feet, physics: { body: "character" }, model: { id: CLUMP, forward: "+x" }, layout: { box: { min: { x: -0.8, y: 0, z: -0.8 }, max: { x: 0.8, y: 1.2, z: 0.8 } } }, scale: 1, state: st, ...loop });
  if (kind === "skinstealer") return ctx.spawn({ tags: ["pen-foe", "stealer"], feetPosition: feet, physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/stealer-geo.js", params: { revealed: true } }, state: { ...npcState(ctx, "stealer", K.hp, { xp: K.xp }), ...st } });
  return ctx.spawn({ template: "templates/deathmoths.js#swarm", tags: ["pen-foe", "moths"], physics: { body: "character", collider: "sphere" }, feetPosition: { ...feet, y: K.hover }, state: st });
}
