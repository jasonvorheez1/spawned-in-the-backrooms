// spawn6 native template "player"
export const player = {
  behavior: ["scripts/fall-guard.js", "scripts/humanoid-locomotion.js", "scripts/player.js", "scripts/foe-steps.js", "scripts/swim.js", "scripts/climb.js", "scripts/crawl.js", "scripts/interact.js", "scripts/grab.js", "scripts/kick.js", "scripts/rest.js", "scripts/mahjong.js", "scripts/talk.js", "scripts/build.js", "scripts/noclip.js", "scripts/stats.js", "scripts/e19.js", "scripts/craft.js", "scripts/os.js", "scripts/arcade-play.js", "scripts/smoothie-player.js", "scripts/lockpick.js", "scripts/spamton-fight.js", "scripts/horde.js", "scripts/critter.js", "scripts/main-menu.js", "scripts/hub.js", "scripts/view3.js", "scripts/quest-marker.js", "scripts/duller-spawn.js", "scripts/cctv.js"],
  feetPosition: { x: 0, y: 2, z: 0 },
  physics: { body: "character" },
  tags: ["player"],
  primitive: { kind: "scripted", script: "scripts/critter2-geo.js", params: { species: "cat" } },
  jiggle: { amount: 0.6, bounce: 0.5, gravity: 0.5, bones: ["EarL", "EarR", "Tail", "Tail1"] }, // ears and tail swing when the body moves
  material: { outline: { color: "#1d1420", width: 2.4 } }, // the cartoon ink line round every critter
};
