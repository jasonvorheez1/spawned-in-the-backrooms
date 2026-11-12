// The window entity in Level 11's alley. To anyone who hasn't learned Harris's ritual it is what it looks like:
// a window entity, and walking into it is the end. To someone who has, it's the noclip into Level 12.
import { heard } from "./lib/hear.js";
import { endQuest } from "./lib/quests.js";
import { carryAcross } from "./lib/carry.js";
export function onTriggerEnter(ctx, other) {
  const p = ctx.place.players.find((q) => q.id === other?.id); if (!p) return;
  const pos = { ...(ctx.self.worldFeetPosition ?? ctx.self.feetPosition), y: 1.2 };
  if (p.state.know12) {
    heard(ctx, { clip: "cdn/moodboard-realistic-gritty/sfx-glitch-static-burst-into-silent-white-room-tone.mp3", position: pos, volume: 0.9, maxDistance: 10 });
    ctx.emit("screenFlash", { color: "#ffffff", duration: 1.6, intensity: 1 }, { audience: { player: p.id } });
    endQuest(p.state, "the-lit-window", "You walked through the window into Level 12");
    carryAcross(ctx, p, "level12"); ctx.cross(p, "level12");
    return;
  }
  heard(ctx, { clip: "cdn/moodboard-realistic-gritty/sfx-glass-shatter-inward-and-wet-crunch-shriek.mp3", position: pos, volume: 1, maxDistance: 16 });
  ctx.emit("screenFlash", { color: "#000000", duration: 1.2, intensity: 1 }, { audience: { player: p.id } });
  ctx.emit("screenShake", { intensity: 0.8, duration: 0.4 }, { audience: { player: p.id } });
  p.state.hp = 0;
}
