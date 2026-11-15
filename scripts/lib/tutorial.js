// The opening follows the player's position and inventory. Later lessons use the same state as the systems they teach.
import { canOpen, hasHalogen, openWrist, screen } from "./screen.js"
import W from "./weapons.js"
import { canSaveHere } from "./save.js"

export const inOrientation = (place) => String(place ?? "").startsWith("tutorial0")
const hasSlot = (s) => Object.values(s.quickSlots ?? {}).some(Boolean)
const hasRecipe = (s) => Boolean(s.recipes || s.manuals)
// a new body already carries 2 almond water (player.js), so only what the carton gives counts as "found"
const hasSupplies = (s) => Boolean(s.scrap?.wire || s.pickedAt || (s.almonds ?? 0) > 2)
const hasKey = (s) => Object.values(s.hubKeys ?? {}).some((n) => n > 0)
const needsOn = (s) => s.run?.needs !== "off"
export const GUIDE_CHAPTERS = ["Find supplies", "Cross the hall", "Get equipped", "Check your gear", "Find the way out"]

export function orientation(s, place, p) {
  if (!inOrientation(place) || s.t0Done || !p) return null
  const chapter = s.t0n ?? 0
  if (chapter === 0) {
    if (p.z > -5.7) return { id: "wake", chapter, title: "Find the open doorway", text: "Walk toward the lit corridor. Save your breath for when you need to run.", keys: ["WASD · Move", "Shift · Sprint"] }
    if (p.z > -19.5 && !hasSupplies(s)) return { id: "search", chapter, title: "Search the supply alcove", text: "The carton is beside the desk on your left. The alcove rejoins the corridor farther down if you want to keep moving.", keys: ["E · Search", "R · Take all"] }
    return { id: "bend", chapter, title: "Check the bend", text: hasSupplies(s) ? "Keep what you found. Follow the corridor to the room where it turns." : "Keep going. The corridor turns at the room ahead.", keys: [] }
  }
  if (chapter === 1) return { id: s.crouch ? "quiet" : "hall", chapter, title: s.crouch ? "Keep low along the hall" : "Cross the long hall", text: s.crouch ? "You're moving quietly. Keep the light off when you need to stay out of sight." : "You can move more quietly by crouching. Use your flashlight only when you need to see.", keys: ["C · Crouch", "F · Light"] }
  if (chapter === 2) return { id: "issue", chapter, title: "Use the wrist terminal", text: "There's a powered unit in the room at the end of the hall. Look at its arm slot to activate it.", keys: ["E · Activate"] }
  if (chapter === 3 && !hasRecipe(s)) return { id: "manual", chapter, title: "Find a recipe", text: "The carton by the workbench has a manual. Taking it teaches a recipe. You can also follow the wall drawings and come back for supplies.", keys: ["E · Search", "Y · Crafting"] }
  if (chapter === 3 && !hasSlot(s)) return { id: "bind", chapter, title: "Set a quick slot", text: "Open your inventory and select a carried item. Click a slot or press its number to assign it. The drawings by the south doorway point onward.", keys: ["I · Inventory", "0–9 · Assign"] }
  if (chapter === 3 || chapter === 4) return { id: "follow", chapter, title: "Follow the drawings", text: "Take the narrow corridor and look for the soaked patch in the carpet. There might be a way through.", keys: ["J · Field Guide"] }
  return null
}

// A lesson can be added here without changing the opening or teaching newer saves the same lesson again.
export const GUIDE_LESSONS = [
  // Moment-of-need prompts (now: true): one line, shown the moment its state first holds, ahead of the slower lessons. A new one is a row.
  { id: "now-search", now: true, group: "Survival", title: "Search it", keys: ["E · Search", "R · Take all"], text: "Look at a container and press E. Nothing is used until you pick it in Inventory.", when: (s) => s.focus?.verb === "Search" },
  { id: "now-weapon", now: true, group: "Equipment", title: "Draw and holster", keys: ["Hold R · Holster / draw", "Left mouse · Swing"], text: "Hold R to put your weapon away or draw it. A click draws it too. People talk easier with it away.", when: (s) => Boolean(s.weapons) || Boolean(s.equipped && s.equipped !== "fists") || Boolean(s.holstered) },
  { id: "now-key", now: true, group: "Navigation", title: "Match the key's bow", keys: ["I · Inventory"], text: "A Level Key opens one Hub door: the one wearing the same ring mark as the key's bow. Crossing spends it.", when: (s) => hasKey(s) },
  { id: "now-sanity", now: true, group: "Survival", title: "Sanity is slipping", keys: ["I · Aid"], text: "The SAN bar drops in the dark and near entities. Low, you start seeing things. At 0 every attribute drops. Almond water brings it back.", when: (s, place, ses) => (ses?.guideSanTop ?? 0) - (s.sanity ?? 0) >= 5 },
  { id: "now-thirst", now: true, group: "Survival", title: "Water is dropping", keys: ["I · Aid"], text: "WATER falls with time. Empty, you waste away to 1 HP. Almond water fills it most.", when: (s) => needsOn(s) && (s.thirst ?? 100) < 92 },
  { id: "now-hunger", now: true, group: "Survival", title: "Food is dropping", keys: ["I · Aid"], text: "FOOD falls with time. Empty, you waste away to 1 HP. Eat from Inventory.", when: (s) => needsOn(s) && (s.hunger ?? 100) < 92 },
  { id: "now-save", now: true, group: "Survival", title: "Save what you found", keys: ["Backspace · Menu"], text: "Open the menu and pick Save Manager to keep this expedition in a slot. You can save in any level that stays put.", when: (s, place) => Boolean(s.pickedAt) && canSaveHere(place) },
  { id: "now-oldcompass", now: true, group: "Navigation", title: "Wind the old compass", keys: ["I · Misc"], text: "Use it from Inventory or a quick slot to open it. Use it again to switch what the needle seeks. Each read spends a winding.", when: (s) => (s.compass ?? 0) > 0 },
  { id: "now-compass", now: true, group: "Navigation", title: "Read the compass strip", keys: ["P · Journal"], text: "The strip by your health shows where you face. A pip on it points to your tracked objective.", when: (s) => Boolean(s.t0Done || s.madeChar) },
  { id: "now-phone", now: true, group: "Equipment", title: "Your phone is on M", keys: ["M · Phone"], text: "Mail, notes, camera, flashlight and radio live on the phone. Raise it with M, lower it the same way.", when: (s, place) => Boolean(s.t0Done) && Boolean(s.phone || (s.l132?.bag?.phones ?? 0) > 0) && hasHalogen(s, place) },
  { id: "hub", group: "Navigation", title: "Read the Hub doors", keys: [], text: "Check the destination and key requirement before crossing. A keyed door spends one matching Level Key. Keep a return route in mind.", when: (s, place) => place === "thehub" },
  { id: "tracking", group: "Navigation", title: "Track a route", keys: ["P · Journal"], text: "Select a quest and read its current objective. Track up to three. For a quest in another area, the marker points to the next exit on the route.", when: (s) => Object.keys(s.quests ?? {}).length > 0 },
  { id: "movement", group: "Navigation", title: "Move and change the view", keys: ["WASD · Move", "Space · Jump", "Middle mouse · View"], text: "Use Shift for short sprints. Tap the middle mouse button to change camera view. Hold and drag it to look around your character." },
  { id: "throwkick", group: "Survival", title: "Grab, throw and kick", keys: ["Z · Grab", "G · Throw", "H · Kick"], text: "Z picks up almost anything, or drags a body. G throws what you hold. Heavy things take a struggle. H kicks: it shoves people, pushes carts and breaks weak stuff. Heavier things push back." },
  { id: "quick", group: "Equipment", title: "Put supplies on quick slots", keys: ["I · Inventory", "0–9 · Quick slots"], text: "Select an aid item, weapon, or piece of apparel in your inventory. Click a slot or press its number to assign it. In the field, the same number uses or equips it.", when: (s) => !hasSlot(s) && Boolean(s.pickedAt || s.equipped && s.equipped !== "fists") },
  { id: "condition", group: "Equipment", title: "Keep your gear working", keys: ["I · Inventory"], text: "Select a weapon or worn piece to check its condition. Use the Repair tab for the appropriate kit and read how much it restores.", when: (s) => s.equipped && s["cnd_" + s.equipped] < 50 },
  { id: "guns", group: "Equipment", title: "Check your firearm", keys: ["Aim · Right mouse", "R · Reload"], text: "Check the magazine and reserve in your HUD. Inspect the weapon in Inventory for skill and attribute requirements. In play, aim to steady the sights and reload from reserve.", when: (s) => Boolean(W[s.equipped]?.ranged) },
  { id: "crafting", group: "Crafting", title: "Discover recipes", keys: ["Y · Crafting", "E · Use station"], text: "A manual teaches one unknown recipe of its type. The recipe then shows its materials, skill requirement, and where it can be made. Check cooking fires, reloading benches, and workbenches for their own lists.", when: (s) => hasRecipe(s) || /workbench|reloading bench|cooking fire/i.test(s.focus?.name ?? "") },
  { id: "building", group: "Crafting", title: "Place a buildable", keys: ["B · Build"], text: "Check the material cost in the build menu. Move the preview onto a clear surface and confirm when the build menu shows a valid placement." },
  { id: "needs", group: "Survival", title: "Watch food and water", keys: ["I · Aid"], text: "The food and water bars show when you're running low. Select an item in Inventory to check what it restores before you use it.", when: (s) => s.run?.needs !== "off" && (s.hunger < 58 || s.thirst < 58) },
  { id: "heat", group: "Survival", title: "Plan for the desert", keys: ["I · Supplies"], text: "Direct sun builds exposure. Rest under a roof during the day and travel after sundown. Keep Ferry's water cold or it turns to sand.", when: (s, place) => place === "level169" && (s.l169sun ?? 0) > 0 },
  { id: "sneak", group: "Survival", title: "Break line of sight", keys: ["C · Crouch", "F · Light"], text: "Crouch and slow down when you think something has heard you. Put a solid wall between you and it before changing direction. Stay clear of the last place it saw you." },
  { id: "locks", group: "Survival", title: "Work a lock", keys: ["E · Pick lock", "A / D · Pin", "W · Turn"], text: "A lock checks your Lockpick skill first. If you meet the requirement, angle the bobby pin and try a short turn. Back off when the lock binds so you don't snap the pin.", when: (s) => s.focus?.verb === "Pick Lock" },
  { id: "factions", group: "People", title: "Check your standing", keys: ["K · Character"], text: "Fame and infamy are tracked separately for each faction. Check your recent reputation changes in Character. Keep your weapon lowered when approaching people you want to speak with.", when: (s) => Boolean(s.repHistory?.length) },
  { id: "dialogue", group: "People", title: "Ask what the job involves", keys: ["E · Talk", "P · Journal"], text: "Read the dialogue choices before accepting a job. A skill check can open another approach. Once you take a job, its journal entry gives you the next objective.", when: (s) => s.focus?.verb === "Talk" },
]
const BY_ID = Object.fromEntries(GUIDE_LESSONS.map((lesson) => [lesson.id, lesson]))
const TIP_MS = 16000
const TIP_GAP = 18000
const TIP_GLANCE = 3500
const NOW_GAP = 4000
const ready = (lesson, seen, s, place, ses) => lesson.when && !seen.includes(lesson.id) && lesson.when(s, place, ses)
export const tipsMuted = (s) => s.guideMuted ?? (s.run?.tutorial === "skip")
const canShow = (s, place, now) => screen(s, place) === "play" && !s.dead && !s.ads &&
  !s.pick && !s.building && !s.os && !s.l26cut && !s.noclip &&
  now - (s.downAt ?? -Infinity) > 3500 &&
  now - (s.hitAt ?? -Infinity) > 3500 && now - (s.xfer?.at ?? -Infinity) > 2500

export function currentTip(s, place, now) {
  const tip = s.guideTip
  return !tipsMuted(s) && tip?.place === place && now - tip.at < TIP_MS && canShow(s, place, now) ? BY_ID[tip.id] : null
}

export function guideTick(ctx, s) {
  const place = ctx.self.place
  if (inOrientation(place) || !place || place === "intake" || place === "bonus" || s.level == null || !(s.t0Done || s.madeChar) || tipsMuted(s) || s.uiPrefs?.hudMinimal) return false
  const seen = s.guideSeen ?? [], now = ctx.now(), tip = s.guideTip, ses = ctx.session
  if ((s.sanity ?? 0) > (ses.guideSanTop ?? 0)) ses.guideSanTop = s.sanity
  if (tip) {
    const age = now - tip.at
    // a slower lesson on screen gives way to a moment-of-need prompt
    const bump = !BY_ID[tip.id]?.now && age >= TIP_GLANCE && canShow(s, place, now) && GUIDE_LESSONS.find((lesson) => lesson.now && ready(lesson, seen, s, place, ses))
    if (bump) { s.guideSeen = seen.includes(tip.id) ? seen : [...seen, tip.id]; s.guideTip = { id: bump.id, at: now, place }; return true }
    if (age >= TIP_MS || tip.place !== place || !canShow(s, place, now)) {
      if (age >= TIP_GLANCE && BY_ID[tip.id] && !seen.includes(tip.id)) s.guideSeen = [...seen, tip.id]
      s.guideTip = null
      ctx.session.guideNext = now + (age >= TIP_GLANCE ? TIP_GAP : 2500)
      ctx.session.guideNowNext = now + (age >= TIP_GLANCE ? NOW_GAP : 1500)
    }
    return true
  }
  const pending = GUIDE_LESSONS.some((lesson) => lesson.when && !seen.includes(lesson.id))
  if (pending && canShow(s, place, now)) {
    const slow = now >= (ses.guideNext ?? 0)
    const lesson = now >= (ses.guideNowNext ?? 0) ? GUIDE_LESSONS.find((row) => (row.now || slow) && ready(row, seen, s, place, ses)) : null
    if (lesson) s.guideTip = { id: lesson.id, at: now, place }
  }
  return pending
}

export function guideInput(ctx, s, input) {
  if (!input.pressed?.fieldGuide || s.menuOpen || !hasHalogen(s, ctx.self.place)) return
  const action = input.actionData?.fieldGuide?.k
  if (action === "mute") {
    if (s.jrnOpen === "guide") { s.guideMuted = !tipsMuted(s); s.guideTip = null }
  } else if (action === "quests") {
    if (s.jrnOpen === "guide") s.jrnOpen = true
  } else if ((!action || action === "open") && canOpen(s, ctx.self.place, "journal")) {
    if (s.jrnOpen === "guide") { s.jrnOpen = false; return }
    openWrist(s, "journal", "guide")
    if (s.guideTip && BY_ID[s.guideTip.id]) {
      const id = s.guideTip.id, seen = s.guideSeen ?? []
      if (!seen.includes(id)) s.guideSeen = [...seen, id]
      s.guideTip = null
      ctx.session.guideNext = ctx.now() + TIP_GAP
    }
  }
}
