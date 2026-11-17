// Level 11's scaffold site (the shed at 22, 31): walk in under the deck and the city lets go of you: Level 325, Boom Town.
// Shelly Nov 16 (#463086): "Entering a construction site in Level 11 will noclip wanderers to Level 325."
import { carryAcross } from "./lib/carry.js";
export function onTriggerEnter(ctx, other) {
  if (!other?.tags?.includes?.("player") || !other.state) return;
  const now = ctx.now();
  other.state.notice = { text: "Past the netting the noise gets louder. Much louder.", at: now };
  ctx.emit("screenFlash", { color: "#fff2c8", duration: 0.4, intensity: 0.8 }, { audience: { player: other.id } });
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-noclip-reality-tear-drop.mp3", position: other.feetPosition, volume: 0.8, maxDistance: 12 });
  carryAcross(ctx, other, "level325"); ctx.cross(other, "level325");
}
