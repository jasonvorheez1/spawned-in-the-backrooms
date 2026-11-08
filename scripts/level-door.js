// A threshold between levels: walk into it and you come out of the matching door on the other side,
// behind a short black transition (scripts/ui.js draws it from player.state.xfer).
// Each door's partner: the arrival marker its sim lays just inside the door you come through.
import { heard } from "./lib/hear.js";
import { bring } from "./lib/companion.js";
const PAIR = {
  "l1-back": "main#main-from-l1", "l1-onward": "level2#l2-from-l1",
  "l2-back": "level1#l1-from-l2", "l2-to-l3": "level3#l3-from-l2",
  "l3-back": "level2#l2-from-l3", "l3-lift5": "level5#l5-from-l3", "l4-stairs-down": "level5#l5-from-l4",
  "l5-lift3": "level3#l3-from-l5", "l5-stairs-up": "level4#l4-from-l5",
  "l5-to-l6": "level6#l6-from-l5", "l6-back": "level5#l5-from-l6",
  "l6-to-l7": "level7#l7-from-l6", "l7-back": "level6#l6-from-l7",
  "l2-to-l21": "level21#l21-from-l2", "l21-down": "level2#l2-from-l21", "l21-cave": "level8#l8-from-l21", "l8-to-l21": "level21#l21-from-l8",
  "l6-to-l61": "level61#l61-from-l6", "l6-wire-trip": "level61#l61-from-l6", "l61-to-l6": "level6#l6-from-l61",
  "l61-to-l11": "level11#l11-from-l61", "l11-to-l61": "level61#l61-from-l11",
  "lv10-backroad": "level10#l10-from-l11", "l10-road-north": "level11#lv10-arrive", "l10-road-south": "level11#lv10-arrive", "l10-lake-deep": "level7#l7-from-l6",
  "l10-canola-in": "level184#l184-from-l10", "l184-back": "level10#l10-from-l184",
};
// how each threshold noclips (scripts/noclip-ui.js clipCard): you fall through the floor, clip through a wall, or just glitch across
const KIND = {
  "l1-onward": "floor", "l2-to-l3": "floor", "l6-to-l7": "floor", "l6-to-l61": "floor", "l6-wire-trip": "floor", "l21-cave": "floor",
  "l2-back": "wall", "l3-back": "wall", "l6-back": "wall", "l7-back": "wall", "l61-to-l6": "wall", "l8-to-l21": "wall", "l21-down": "wall", "l5-to-l6": "wall",
  "l61-to-l11": "wall", "l11-to-l61": "wall", "l10-lake-deep": "floor", "l10-canola-in": "glitch",
};
export function onTriggerEnter(ctx, other) {
  if (!other?.state || other.state.level == null || !ctx.self.state.to) return;
  const key = String(ctx.self.id).split("/").pop();
  ctx.emit("screenFlash", { color: "#000000", duration: 0.9, intensity: 1 }, { audience: { player: other.id } });
  heard(ctx, { maxDistance: 22, refDistance: 3, clip: "/cdn/moodboard-realistic-gritty/sfx-static-burst-glitch-threshold.mp3", position: other.feetPosition, volume: 0.8 }, { audience: { player: other.id } });
  if (key === "l6-to-l61" || key === "l6-wire-trip") { // Show, don't tell: floor collapse stumble, downward camera punch, splinter crash and dust impact
    ctx.emit("screenShake", { intensity: 0.7, duration: 0.45 }, { audience: { player: other.id } });
    ctx.emit("cameraPunch", { direction: { x: 0, y: -0.8, z: 0.3 }, intensity: 0.75 }, { audience: { player: other.id } });
    heard(ctx, { maxDistance: 20, clip: "/cdn/moodboard-realistic-gritty/sfx-wooden-crate-break-splinter.mp3", position: other.feetPosition, volume: 0.85 }, { audience: { player: other.id } });
  }
  other.state.clipKind = KIND[key] ?? "glitch";
  bring(ctx, other, PAIR[key] ?? ctx.self.state.to); // the people walking with you come through too (scripts/lib/companion.js)
  ctx.cross(other, PAIR[key] ?? ctx.self.state.to);
}
