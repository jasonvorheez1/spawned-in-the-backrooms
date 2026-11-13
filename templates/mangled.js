// The Mangled: Level 9's fog entity. Tripo mesh + mixamo rig, cleaned in art/level9/mangled.py (2.5 m, front +Z in the file).
// "l8-hostile" is the tag every gun, swing, kick and grenade looks for (scripts/player.js SWING_TAGS, lib/ballistics.js TARGETS).
import M from "../scripts/lib/data/l9-mangled.yml";
export const MODEL = "/cdn/value.6fba914baef9f8b57939a5d49081a33526f32d96e3543cf8e4e7e4fd2a5816c8.glb";
export const mangled = {
  tags: ["mangled", "hostile", "entity", "l8-hostile"],
  model: { id: MODEL, forward: "+z", materials: { skin: { roughness: 0.3 } } },
  physics: { body: "character" },
  state: { hp: M.hp, maxHp: M.hp, name: "The Mangled" },
  visibleRange: { max: 70 },
  audio: { clip: M.sounds.rasp, gain: 0.2, loop: true, spatial: true, maxDistance: 14 },
};
