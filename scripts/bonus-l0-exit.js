// The corner behind the mall's glass: round it and you are in the Lobby, at the Bonus door (Shelly Nov 17: seamless, no card).
// toSolo routes to your own Level 0 room; scripts/main-menu.js reads bonusBack and stands you at the door, facing in.
import { toSolo } from "./lib/hub.js"
export function onTriggerEnter(ctx, other) {
  if (!other?.isLocal || !String(other.id).startsWith("player/")) return
  const s = other.state; if (s.roomHop) return
  s.bonusBack = 1; s.quietArrive = ctx.now()
  toSolo(ctx, "main", other)
}
