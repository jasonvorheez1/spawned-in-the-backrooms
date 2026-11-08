// A threshold between levels: walk into it and you come out of the matching door on the other side,
// behind a short black transition (scripts/ui.js draws it from player.state.xfer).
// Each door's partner: the arrival marker its sim lays just inside the door you come through.
import { heard } from "./lib/hear.js";
const PAIR = {
  "l1-back": "main#main-from-l1", "l1-onward": "level2#l2-from-l1",
  "l2-back": "level1#l1-from-l2", "l2-to-l3": "level3#l3-from-l2",
  "l3-back": "level2#l2-from-l3", "l3-lift5": "level5#l5-from-l3", "l4-stairs-down": "level5#l5-from-l4",
  "l5-lift3": "level3#l3-from-l5", "l5-stairs-up": "level4#l4-from-l5",
  "l5-to-l6": "level6#l6-from-l5", "l6-back": "level5#l5-from-l6",
  "l6-to-l7": "level7#l7-from-l6", "l7-back": "level6#l6-from-l7",
  "l2-to-l21": "level21#l21-from-l2", "l21-down": "level2#l2-from-l21", "l21-cave": "level8#l8-from-l21", "l8-to-l21": "level21#l21-from-l8",
};
export function onTriggerEnter(ctx, other) {
  if (!other?.state || other.state.level == null || !ctx.self.state.to) return;
  const key = String(ctx.self.id).split("/").pop();
  ctx.emit("screenFlash", { color: "#000000", duration: 0.9, intensity: 1 }, { audience: { player: other.id } });
  heard(ctx, { maxDistance: 22, refDistance: 3, clip: "/cdn/moodboard-realistic-gritty/sfx-static-burst-glitch-threshold.mp3", position: other.feetPosition, volume: 0.8 }, { audience: { player: other.id } });
  ctx.cross(other, PAIR[key] ?? ctx.self.state.to);
}
