// spawn6 native template "player"
export const player = {
  behavior: ["scripts/humanoid-locomotion.js", "scripts/player.js", "scripts/critter.js"],
  feetPosition: { x: 0, y: 2, z: 0 },
  physics: { body: "character" },
  tags: ["player"],
  primitive: { kind: "scripted", script: "scripts/critter-geo.js", params: { species: "cat" } },
};
