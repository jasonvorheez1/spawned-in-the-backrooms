import { PLACARDS as L5NUM } from "./level5.js";
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
  { key: "home5", name: "Your hotel room", where: (s) => "Level 5 · " + (String(s.l5home ?? "").startsWith("suite") ? "Suite " : "Room ") + (L5NUM[s.l5home] ?? ""), has: (s) => !!s.l5home, to: (s) => "level5#l5-home-" + s.l5home }, // Shelly Nov 12: the booked Level 5 room is a home too; you arrive just inside its door
]
// into the mall: s.roomHop tells the menu and the save-resume this was a walk, not a launch
// the station's "last level" row: the level a player last stood in, by its place id
export const LEVEL_NAMES = { level9: "Level 9 · The Suburbs", testlab: "Test Range", main: "Level 0 · The Lobby", tutorial0: "Level 0 · The Lobby", level1: "Level 1 · Habitable Zone", level2: "Level 2 · Pipe Dreams", level31: "Level 31 · The Roller Rink", level70: "Level 70 · Froidetown", level3: "Level 3 · Electrical Station", gamma: "Base Gamma", level4: "Level 4 · Abandoned Office", level5: "Level 5 · Terror Hotel", level6: "Level 6 · Lights Out", level7: "Level 7 · Thalassophobia", level8: "Level 8 · Cave System", level10: "Level 10 · Bumper Crop", level11: "Level 11 · The Infinite City", level12: "Level 12 · Matrix", level13: "Level 13 · The Boiling Frogs", level21: "Level 2.1 · Locked", level26: "Level 26 · SS Fun =)", level27: "Level 27 · The Bunker Springs", level01: "Level 0.1 · Zenith Station", level02: "Level 0.2 · Remodeled Mess", level61: "Level 6.1 · The Snackrooms", level184: "Level 184 · Field of Forgotten Forts", home11: "Your house" }
export const lastLevel = (s) => (s.savePlace && s.savePlace !== HUB_PLACE && s.savePlace !== "intake" ? (s.savePlace === "tutorial0" ? "main" : s.savePlace) : null)
export function toHub(ctx, who = ctx.self) {
  const s = who.state
  if (isHubRoom(ctx.getRoomId?.())) return ctx.cross(who, HUB_PLACE)
  s.roomHop = HUB_ROOM; s.hubOffer = null
  const r = ctx.cross(who, `world:${ctx.world.id}/room:${HUB_ROOM}+${HUB_PLACE}`)
  if (!r?.crossed) s.roomHop = null
  return r
}
// back into your own Backrooms, at a place's door (where = "main", "home11#home-from-l11")
export function toSolo(ctx, where, who = ctx.self, keepPos = false) {
  const s = who.state, room = soloRoom(who.userId), place = where.split("#")[0]
  if (!keepPos) { s.savePlace = place; s.savePos = null } // wake where the door puts you, not where you last stood
  if (ctx.getRoomId?.() === room) return ctx.cross(who, where)
  s.roomHop = room
  const r = ctx.cross(who, `world:${ctx.world.id}/room:${room}+${where}`)
  if (!r?.crossed) s.roomHop = null
  return r
}
