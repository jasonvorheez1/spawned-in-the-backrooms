// walk into the Bonus Rooms door in Level 0 and the mall takes you (scripts/lib/hub.js toHub)
import { toHub } from "./lib/hub.js"
export function onTriggerEnter(ctx, other) {
  if (!other?.isLocal || !String(other.id).startsWith("player/")) return
  const s = other.state; if (s.roomHop) return
  ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-soft-retro-mall-chime-two-tone.mp3", volume: 0.6 }, { audience: { player: other.id } })
  toHub(ctx, other)
}
