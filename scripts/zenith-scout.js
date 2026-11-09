// the space in front of the B.N.T.G. seal on Level 0's east wall: the first time a player on Kade's job walks up to it, the quest moves on (scripts/lib/zenith-quest.js)
import { setZen } from "./lib/zenith-quest.js";
export function onTriggerEnter(ctx, other) {
  const s = other?.state; if (!s || s.level == null) return;
  if (s.zenQ === 1) { setZen(ctx, other, 2, "Found it. A B.N.T.G. seal on a torn-open wall. Kade has the keycard."); ctx.emit("playSound", { clip: "cdn/sfx-low-ominous-metal-groan-reveal-sting.mp3", volume: 0.5 }); return; }
  if (!s.zenKey && !s.zenSeenSeal) { s.zenSeenSeal = true; s.notice = { text: "Steel behind the wallpaper, and a B.N.T.G. seal on it. Someone in the safe room might know.", at: ctx.now() }; }
}
