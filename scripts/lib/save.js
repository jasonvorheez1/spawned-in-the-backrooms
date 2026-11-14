// The save's one shared door (Shelly Nov 13: "fix once, apply everywhere"). player.state IS the save: Spawn writes it whole per player,
// so this file owns its shape: a version, a migration for older saves, and which places a save may wake you in.
export const SAVE_V = 3
// places that never hold a resume point: the bedroom creator runs once, the tutorial is a throwaway copy per visit
const TRANSIENT = (pl) => !pl || pl === "intake" || pl === "bonus" || String(pl).startsWith("tutorial0")
export const canSaveHere = (place) => !TRANSIENT(place)
// a saved place that no longer exists (a minted copy's name, a removed level) is no place to wake
export const wakePlace = (ctx, s) => (s.savePlace && !TRANSIENT(s.savePlace) && ctx.world.places?.[s.savePlace] ? s.savePlace : null)
// older saves to this shape: fills only what is missing, never overwrites what the player earned
export function migrate(ctx, s) {
  const from = s.saveV ?? 1
  if (from >= SAVE_V) return null
  if (s.savePlace && TRANSIENT(s.savePlace)) { s.savePlace = null; s.savePos = null } // v1 saved the tutorial copy's name: it can never be crossed to again
  if (!s.books || typeof s.books !== "object") s.books = {}
  if (!s.mags || typeof s.mags !== "object") s.mags = {}
  if (!s.readBooks || typeof s.readBooks !== "object") s.readBooks = {}
  if (!s.genericBooksRead || typeof s.genericBooksRead !== "object") s.genericBooksRead = {}
  if (!s.bookBonuses || typeof s.bookBonuses !== "object") s.bookBonuses = {}
  if (!Array.isArray(s.effects)) s.effects = []
  s.saveV = SAVE_V
  return from
}
// one quiet diagnostic line per wake, for getLogs; nothing the player sees
export function wakeLog(ctx, s, migratedFrom) {
  ctx.log("[save] wake", { v: s.saveV, migratedFrom, place: ctx.self.place, savePlace: s.savePlace ?? null, level: s.level ?? 1, xp: s.xp ?? 0,
    quests: Object.keys(s.quests ?? {}).length, done: Object.keys(s.qdone ?? {}).length, errands: Object.keys(s.errands ?? {}).length })
}
