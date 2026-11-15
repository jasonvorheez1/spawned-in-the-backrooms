// A threshold between levels: walk into it and you come out of the matching door on the other side,
// behind a short black transition (scripts/ui.js draws it from player.state.xfer).
// Each door's partner: the arrival marker its sim lays just inside the door you come through.
import { heard } from "./lib/hear.js";
import { carryAcross } from "./lib/carry.js";
import { funGate } from "./lib/dina-quest.js";
const PAIR = {
  "l1-back": "main#main-from-l1", "l178-to-hub": "thehub#hub-from-l178", "l1-to-hub": "thehub#hub-from-l1", "hub-to-l1": "level1#l1-from-hub", "l12-to-l13": "level13#l13-from-l12", "l0-to-l02": "level02#l02-from-l0", "l02-back": "main#main-from-l02", "l1-onward": "level2#l2-from-l1",
  "l2-back": "level1#l1-from-l2", "l2-to-l3": "level3#l3-from-l2",
  "l3-back": "level2#l2-from-l3", "l3-lift5": "level5#l5-from-l3", "l4-stairs-down": "level5#l5-from-l4",
  "l5-lift3": "level3#l3-from-l5", "l5-stairs-up": "level4#l4-from-l5",
  "l5-to-l6": "level6#l6-from-l5", "l6-back": "level5#l5-from-l6",
  "l6-to-l7": "level7#l7-from-l6", "l7-back": "level6#l6-from-l7",
  "l2-to-l31": "level31#l31-from-l2", "l31-to-l70": "level70#l70-from-l31", "l70-back": "level31#l31-from-l70", "l31-back": "level2#l2-from-l31", "l2-to-l21": "level21#l21-from-l2", "l21-down": "level2#l2-from-l21", "l21-cave": "level8#l8-from-l21", "l8-to-l21": "level21#l21-from-l8",
  "l6-to-l61": "level61#l61-from-l6", "l6-wire-trip": "level61#l61-from-l6", "l61-to-l6": "level6#l6-from-l61",
  "l61-to-l11": "level11#l11-from-l61", "l11-to-l61": "level61#l61-from-l11",
  "l9-to-l8": "level8#l8-from-l9", "l8-to-l9": "level9#l9-from-l8", "l9-to-l11": "level11#lv10-arrive", "l9-to-l10": "level10#l10-from-l11",
  "lv10-backroad": "level10#l10-from-l11", "l10-road-north": "level11#lv10-arrive", "l10-road-south": "level11#lv10-arrive", "l10-lake-deep": "level7#l7-from-l10",
  "l132-tree-exit": "level10#l10-from-l132", "l10-to-l132": "level132#l132-arrive", "l10-tower-132": "level132#l132-arrive", // Lumiria's hollow tree lets you out on the Level 10 road
};
// how each threshold noclips (scripts/noclip-ui.js clipCard): you fall through the floor, clip through a wall, or just glitch across
const KIND = {
  "l1-to-hub": "glitch", "hub-to-l1": "glitch", "l178-to-hub": "glitch", "l132-tree-exit": "glitch", "l10-to-l132": "glitch", "l10-tower-132": "glitch",
  "l1-onward": "floor", "l2-to-l3": "floor", "l6-to-l7": "floor", "l6-to-l61": "floor", "l6-wire-trip": "floor", "l21-cave": "floor",
  "l2-back": "wall", "l3-back": "wall", "l6-back": "wall", "l7-back": "wall", "l61-to-l6": "wall", "l8-to-l21": "wall", "l21-down": "wall", "l5-to-l6": "wall",
  "l61-to-l11": "wall", "l11-to-l61": "wall", "l61-vent-in": "floor", "l10-lake-deep": "water", "l10-canola-in": "glitch",
  "l26-overboard": "water", "l34-pool-down": "water", // Level 34: dive the junction pool and come up in Level 7
 // Level 26: jump the rail and the sea takes you to Level 7

};
const PRESS_ONLY = new Set(["l178-to-hub"]);
export const ears = {
  "press": (ctx, p) => {
    const id = p?.by ?? p?.player ?? p?.playerId ?? p?.id;
    const who = id && ctx.getObject(id);
    if (!who) return;
    ctx.self.session.pressed = true;
    try { onTriggerEnter(ctx, who); } finally { ctx.self.session.pressed = false; }
  },
};
export function onTriggerEnter(ctx, other) {
  if (!other?.state || other.state.level == null || !ctx.self.state.to) return;
  const key = String(ctx.self.id).split("/").pop();
  if (PRESS_ONLY.has(key) && !ctx.self.session.pressed) return; // these doors open to E alone
  if (ctx.self.state.to === "level26" && !funGate(ctx, other)) return; // the ship takes passengers: no pass, no boarding (three ways round, scripts/lib/dina-quest.js)
  ctx.emit("screenFlash", { color: "#000000", duration: 0.9, intensity: 1 }, { audience: { player: other.id } });
  heard(ctx, { maxDistance: 22, refDistance: 3, clip: "/cdn/moodboard-realistic-gritty/sfx-static-burst-glitch-threshold.mp3", position: other.feetPosition, volume: 0.8 }, { audience: { player: other.id } });
  if (key === "l6-to-l61" || key === "l6-wire-trip") { // Show, don't tell: floor collapse stumble, downward camera punch, splinter crash and dust impact
    ctx.emit("screenShake", { intensity: 0.7, duration: 0.45 }, { audience: { player: other.id } });
    ctx.emit("cameraPunch", { direction: { x: 0, y: -0.8, z: 0.3 }, intensity: 0.75 }, { audience: { player: other.id } });
    heard(ctx, { maxDistance: 20, clip: "/cdn/moodboard-realistic-gritty/sfx-wooden-crate-break-splinter.mp3", position: other.feetPosition, volume: 0.85 }, { audience: { player: other.id } });
  }
  other.state.clipKind = KIND[key] ?? "glitch";
  if (ctx.self.state.to === "level26" && !other.state.l26seen) other.state.l26via = "poster"; // early route: lands below deck (scripts/lib/l26-cut.js)
  carryAcross(ctx, other, PAIR[key] ?? ctx.self.state.to); // held items and companions cross with you (scripts/lib/carry.js)
  // The remodel sim can go idle before it gets a tick with no players.
  if (key === "l02-back" && !ctx.place.players.some((p) => p.id !== other.id)) ctx.place.state.emptyAt = ctx.now();
  ctx.cross(other, PAIR[key] ?? ctx.self.state.to);
}
