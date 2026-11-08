// The player's screen, named (Nov 8). Many player.state flags each say "a panel is open"; together they are ONE
// state machine: which screen owns the player's input right now. screen(s, place) names it, in the same order
// scripts/ui.js draws them, so a script, the HUD and an agent all read the same word instead of re-deriving it.
//
//   cutscene  s.cut | s.arrive | s.arrivePending | (s.t0cut && !s.sheetOpen)   scripts/lib/*-cut.js own it
//   menu      s.menuOpen                     scripts/main-menu.js (title / pause)
//   wardrobe  s.wardrobeOpen                 intake room creator
//   mahjong   s.mj.seats                     scripts/mahjong.js
//   talk      s.talkWith | s.shopOpen        scripts/talk.js
//   loot      s.lootOpen                     scripts/interact.js
//   sheet     s.sheetOpen                    scripts/stats.js     ┐
//   inventory s.invOpen                      scripts/player.js    │ the wrist panels: one swaps for another
//   craft     s.craftOpen                    scripts/craft.js     │
//   rest      s.waitOpen                     scripts/rest.js      ┘
//   play      none of the above
//
// Rule: a panel opens only from "play", or from another wrist panel (it replaces it). Closing is always allowed.
// Nothing here is written to state: it is read fresh from the flags, so no save or network cost and no drift.
export const WRIST = { sheet: "sheetOpen", inventory: "invOpen", craft: "craftOpen", rest: "waitOpen" }

export function screen(s, place) {
  if (!s) return "play"
  if (s.cut || s.arrive || s.arrivePending || (s.t0cut && !s.sheetOpen)) return "cutscene"
  if (s.menuOpen) return "menu"
  if (s.wardrobeOpen || place === "intake") return "wardrobe"
  if (s.mj?.seats) return "mahjong"
  if (s.talkWith || s.shopOpen) return "talk"
  if (s.lootOpen) return "loot"
  if (s.sheetOpen) return "sheet"
  if (s.invOpen) return "inventory"
  if (s.craftOpen) return "craft"
  if (s.waitOpen) return "rest"
  return "play"
}

// may this wrist panel open now? (true from play or from another wrist panel)
export function canOpen(s, place, want) {
  const cur = screen(s, place)
  return cur === "play" || cur === want || cur in WRIST
}

// open one wrist panel: the others close so two never draw at once
export function openWrist(s, want, value = true) {
  for (const [k, key] of Object.entries(WRIST)) if (k !== want && s[key]) s[key] = key === "craftOpen" ? "" : false
  s[WRIST[want]] = value
}
