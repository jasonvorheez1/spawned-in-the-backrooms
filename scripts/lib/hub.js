// The Bonus Room's rooms (johnadams2, Nov 8): one shared mall room everyone meets in, a solo room per player for the Backrooms.
// No yml here: scripts/routing.js imports this file before any world exists.
export const HUB_ROOM = "bonus"
export const HUB_PLACE = "bonus"
export const isHubRoom = (id) => /^bonus(-\d+)?$/.test(String(id ?? ""))
export function soloRoom(userId) {
  const id = String(userId || "guest").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 50)
  return "solo-" + (id || "guest")
}
// the homes the Teleport Station can drop you in, each with its own test and door
export const HOMES = [
  { key: "home11", name: "Your house", where: "Infinite City", has: (s) => !!s.home11, to: "home11#home-from-l11" },
]
// into the mall: s.roomHop tells the menu and the save-resume this was a walk, not a launch
export function toHub(ctx, who = ctx.self) {
  const s = who.state
  if (isHubRoom(ctx.getRoomId?.())) return ctx.cross(who, HUB_PLACE)
  s.roomHop = HUB_ROOM; s.hubOffer = null
  const r = ctx.cross(who, `world:${ctx.world.id}/room:${HUB_ROOM}+${HUB_PLACE}`)
  if (!r?.crossed) s.roomHop = null
  return r
}
// back into your own Backrooms, at a place's door (where = "main", "home11#home-from-l11")
export function toSolo(ctx, where, who = ctx.self) {
  const s = who.state, room = soloRoom(who.userId), place = where.split("#")[0]
  s.savePlace = place; s.savePos = null // wake where the door puts you, not where you last stood
  if (ctx.getRoomId?.() === room) return ctx.cross(who, where)
  s.roomHop = room
  const r = ctx.cross(who, `world:${ctx.world.id}/room:${room}+${where}`)
  if (!r?.crossed) s.roomHop = null
  return r
}
