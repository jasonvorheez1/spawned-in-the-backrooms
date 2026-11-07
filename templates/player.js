// spawn6 native template "player"
export const player = {
  behavior: ["scripts/humanoid-locomotion.js", "scripts/player.js", "scripts/interact.js", "scripts/talk.js", "scripts/build.js", "scripts/noclip.js", "scripts/stats.js", "scripts/critter.js"],
  feetPosition: { x: 0, y: 2, z: 0 },
  physics: { body: "character" },
  tags: ["player"],
  model: "/cdn/value.c6e19f7ca72c3661f7702cebb7be2504e25141ea823fb146a2a616483ae85891.glb", // the Blender critter body; scripts/critter.js dresses it from player.state.look and adds the species head
  jiggle: { amount: 0.6, bounce: 0.5, gravity: 0.5, bones: ["EarL", "EarR", "Tail", "Tail1"] }, // ears and tail swing when the body moves
  material: { outline: { color: "#1d1420", width: 2.4 } }, // the cartoon ink line round every critter
};
