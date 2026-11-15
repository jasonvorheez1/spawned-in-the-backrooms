// the title (johnadams2, Nov 8): every fresh visit opens on the title over the live halls, one START.
// START walks you into the intake room (places/intake), where the critter creator opens; closing it walks you back
// to the place you came from. Backspace mid-game opens the same screen as a pause with RESUME.
// The title theme plays on this machine alone through the title and the intake room, and fades when you step out.
import { screen } from "./lib/screen.js"
import { animate } from "builtin/tween";
import { cleanPick, PRESETS, KEEP, SKIP, noStory } from "./lib/run-opts.js"
import { wakePlace } from "./lib/save.js"
const MUSIC = "/cdn/moodboard-lowpoly-cozy/music-soft-mellow-fingerpicked-acoustic-guitar-and-warm-rhodes-early-2000s-bedroom-calm-loop.mp3"; // the drone was exhausting (johnadams2): soft and quiet instead
const CLICK = "/cdn/moodboard-realistic-gritty/sfx-old-crt-tv-power-on-click-thunk.mp3";
const MUSIC_GAIN = 0.12; // her pick

// Heavy quest/cutscene modules load on demand after leaving the menu or entering their trigger states.
const MODS = Object.create(null), MOD_WAIT = Object.create(null)
const lazy = (k, load) => {
  if (k in MODS) return MODS[k]
  if (!MOD_WAIT[k]) MOD_WAIT[k] = load().then((m) => (MODS[k] = m)).catch(() => (MODS[k] = {}))
  return null
}

function music(ctx, want) {
  const ses = ctx.session, have = ses.mmMusic && ctx.getObject(ses.mmMusic)
  if (have && have.audio?.clip !== MUSIC && !ses.mmKill) { have.audio = { ...have.audio, clip: MUSIC, gain: MUSIC_GAIN } } // a track left over from an older save swaps to the current one
  if (want && !have) { ses.mmMusic = ctx.spawn({ audience: "local", scope: "session", feetPosition: ctx.self.feetPosition, audio: { clip: MUSIC, loop: true, spatial: false, gain: MUSIC_GAIN, bus: "Music" } }); ses.mmKill = 0 }
  else if (want && have && ses.mmKill) { ses.mmKill = 0; animate(ctx, ses.mmMusic, { "audio.gain": MUSIC_GAIN }, { duration: 0.6 }) }
  else if (!want && have && !ses.mmKill) { ses.mmKill = ctx.now() + 1800; animate(ctx, ses.mmMusic, { "audio.gain": 0 }, { duration: 1.6 }) }
  else if (!want && have && ses.mmKill && ctx.now() > ses.mmKill) { ctx.destroy(ses.mmMusic); ses.mmMusic = null; ses.mmKill = 0 }
  return !!(ses.mmMusic && ctx.getObject(ses.mmMusic))
}

export function update(ctx) {
  { const ss = ctx.session; if (ss.hushed && !ss.tabAway && ctx.now() - (ss.backAt ?? 0) > 1500) { ss.hushed = false; ctx.self.gains = null } } // tab-out hush lifts on its own
  if (!ctx.self.isLocal && ctx.self.isLocal !== undefined) return ctx.sleep()
  const st = ctx.self.state, ses = ctx.session, place = ctx.self.place?.startsWith("tutorial0") ? "tutorial0" : ctx.self.place // a solo copy is named tutorial0-<id>
  if (!ses.menuMark) {
    ses.menuMark = true
    if (!st.madeChar && (st.xp || st.lvl || st.level || st.visits)) st.madeChar = true // a save that already played keeps its critter
    if (place !== "intake" && !st.roomHop) { st.menuOpen = true; st.menuKind = "title" } // a walk between rooms (the Bonus Room) is no launch
  }
  // Shelly Nov 13 "still endlessly falling": a cut that ends with a crossing (the intro's fall into Level 0) left anim.cut on the body; every new place starts with no cut pose and no air pose
  if (ses.animPlace !== place) { ses.animPlace = place; if (ctx.self.anim) { ctx.self.anim.cut = null; ctx.self.anim.air = null } }
  // the intake room: the creator opens on arrival; once it closes, back out to where you came from
  if (place === "intake") {
    if (!ses.inIntake) { ses.inIntake = true; ses.leftIntake = false; if (st.cut) { st.cut = null; ses.cut = null; ctx.view.camera = null }; st.menuOpen = false; st.wardrobeOpen = true; st.wrMenu = true; st.wrTab = "body" }
    else if (!st.wardrobeOpen && !ses.leftIntake && !st.cut) { ses.leftIntake = true; st.madeChar = true; st.cut = ctx.now(); ses.cut = null } // the intro plays first (scripts/lib/intro-cut.js)
    if (st.cut && lazy("intro", () => import("./lib/intro-cut.js"))?.cutTick?.(ctx, ses, st)) { music(ctx, false); ctx.cross(ctx.self, st.t0Done ? "main" : "tutorial0"); return } // the intro lands you in the tutorial Level 0 the first time, the real one after
  } else ses.inIntake = false
  // Level 0 after the intro: the ceiling drop (scripts/lib/arrive-cut.js), then the tutorial (scripts/lib/tutorial.js)
  const story = !noStory(st) // Shelly Nov 14: a run with the main story off skips its cutscenes and trail
  const l0 = place === "main" || place === "tutorial0"
  if (l0 && st.arrivePending && !st.menuOpen) { st.arrivePending = false; st.arrive = ctx.now(); ses.arr = null; if (place === "tutorial0") { st.t0n = 0; st.t0cut = null } }
  if (st.arrive) {
    if (!l0) { st.arrive = null; ses.arr = null; ctx.view.camera = null; return }
    const tut = lazy("tut", () => import("./lib/tutorial.js"))
    if (lazy("arr", () => import("./lib/arrive-cut.js"))?.arriveTick?.(ctx, ses, st)) tut?.tutStart?.(ctx, st)
    return
  }
  if (story && !st.menuOpen && place === "tutorial0" && !st.t0cut) lazy("dina", () => import("./lib/dina-quest.js"))?.dinaTick?.(ctx, ses, st, place)
  // the tutorial Level 0's beats (scripts/lib/tut0-cut.js): a fresh visit there without the drop starts the route over
  if (ses.t0Last !== ctx.self.place) { if (place === "tutorial0" && !st.arrive) { st.t0n = 0; st.t0cut = null; ses.t0 = null; ses.inT0 = true } ses.t0Last = ctx.self.place } // every walk into the tutorial starts at the first beat, whatever a past run left
  if (place === "tutorial0" && !st.menuOpen) {
    if (!ses.inT0) { ses.inT0 = true; if (!st.arrive) { st.t0n = 0; st.t0cut = null } }
    const r = lazy("t0", () => import("./lib/tut0-cut.js"))?.t0Tick?.(ctx, ses, st)
    if (r === "level1") { st.tut = null; ctx.cross(ctx.self, "level1"); return }
    if (r) return
  } else ses.inT0 = false
  // Level 26: the first time aboard, the ship in the fog and Phoebe at the rail (scripts/lib/l26-cut.js)
  if (story && place === "level26" && !st.menuOpen && (st.l26cut || !st.l26seen)) { if (lazy("l26", () => import("./lib/l26-cut.js"))?.l26Tick?.(ctx, ses, st)) return ctx.sleep(0) }
  if (st.hubcut) st.hubcut = null
  if (story && !st.menuOpen && (place === "levelrun" || st.lrunCut)) { if (lazy("lrun", () => import("./lib/levelrun-cut.js"))?.lrunCutTick?.(ctx, ses, st, place)) return ctx.sleep(0) }
  if (!st.menuOpen && place !== "tutorial0" && place !== "intake") {
    if (story && lazy("dina", () => import("./lib/dina-quest.js"))?.dinaTick?.(ctx, ses, st, place)) return ctx.sleep(0)
    if (story && lazy("ch2", () => import("./lib/ch2-quest.js"))?.ch2Tick?.(ctx, ses, st, place)) return ctx.sleep(0)
    if (st.rep || st.squadAt) {
      const sq = lazy("squad", () => import("./lib/hit-squad.js"))
      if (sq) { sq.squadTick?.(ctx, ses, st, place); if (ctx.now() - (ses.sqFollowAt ?? 0) > 3000) { ses.sqFollowAt = ctx.now(); sq.squadFollow?.(ctx) } }
    }
    lazy("err", () => import("./lib/errands.js"))?.errandTick?.(ctx, ses, st, place) // odd jobs people hand out (scripts/lib/errands.js)
  }
  if (st.tut) lazy("tut", () => import("./lib/tutorial.js"))?.tutTick?.(ctx, st)
  const playing = music(ctx, place !== "bonus" && ((st.menuOpen && st.menuKind === "title") || (place === "intake" && !st.cut))) // the mall has its own track: the title theme never plays over it (shelly, Nov 12)
  // behind the title the camera slowly looks around the halls from head height; gone the moment it closes
  if (st.menuOpen && st.menuKind === "title") {
    const p = ctx.self.feetPosition, t = ctx.now() / 1000
    if (!ses.mmCam) { ses.mmCam = { x: p.x, y: p.y, z: p.z, t0: t }; ctx.self.hidden = [...(ctx.self.hidden || []).filter((i) => i !== ctx.self.id), ctx.self.id] }
    const c = ses.mmCam, a = (t - c.t0) * 0.07 + 0.6, bob = Math.sin((t - c.t0) * 0.21) * 0.05
    const eye = { x: c.x - Math.sin(a) * 0.35, y: c.y + 1.72 + bob, z: c.z - Math.cos(a) * 0.35 }
    const pitch = -0.04 + Math.sin((t - c.t0) * 0.13) * 0.04
    ctx.view.camera = { eye, aim: { x: eye.x - Math.sin(a) * 6, y: eye.y + pitch * 6, z: eye.z - Math.cos(a) * 6 }, fov: 62 }
    return
  }
  if (ses.mmCam) { ses.mmCam = null; ctx.view.camera = null; ctx.self.hidden = (ctx.self.hidden || []).filter((i) => i !== ctx.self.id) }
  if (playing || place === "intake") return // the theme is still fading, or the room is waiting on the creator
  if (place === "tutorial0") return ctx.sleep(0.15) // the beats poll where they stand
  if (st.tut) return ctx.sleep(0.25) // the tutorial's walking step polls
  ctx.sleep()
}

export function onInput(ctx, input) {
  const st = ctx.self.state
  if (st.tut) lazy("tut", () => import("./lib/tutorial.js"))?.tutInput?.(ctx, st, input)
  if (st.dcut) { const ss = ctx.session; if (input.held?.jump) ss.dskip ??= ctx.now(); else ss.dskip = null } // hold jump 1.2 s skips the diary cutscene
  if (st.l26cut) { const ss = ctx.session; if (input.held?.jump) ss.l26skip ??= ctx.now(); else ss.l26skip = null }
  if (st.lrunCut?.phase === "intro") { const ss = ctx.session; if (input.held?.jump) ss.lrunskip ??= ctx.now(); else ss.lrunskip = null } // hold jump 1.2 s skips Level 26's cutscene
  if (input.pressed?.mainmenu && ctx.self.place !== "intake" && (st.menuOpen || !['talk', 'mahjong', 'cutscene'].includes(screen(st, ctx.self.place)))) { // pause never stacks on a talk, the mahjong table or a cutscene it couldn't draw over
    st.menuOpen = !st.menuOpen
    if (st.menuOpen) { st.menuKind = "pause"; st.wardrobeOpen = false; st.wrMenu = false }
  }
  // tab-out (Shelly Nov 13): a key still held as the window lost focus kept an axis non-zero, and that read as "they're back" the same tick, so the pause never held.
  // Now only the focus event or a fresh key press a second after leaving brings you back; held axes are ignored.
  const ss = ctx.session
  if (input.pressed?.tabaway) { const away = !!input.actionData?.tabaway?.away && !(ctx.self.tags ?? []).includes("helper"); if (away && !ss.tabAway) ss.awayAt = ctx.now(); if (!away && ss.tabAway) ss.backAt = ctx.now(); ss.tabAway = away }
  else if (ss.tabAway && ctx.now() - (ss.awayAt ?? 0) > 1000 && Object.keys(input.pressed ?? {}).some((k) => input.pressed[k])) { ss.tabAway = false; ss.backAt = ctx.now() }
  // while away the voices and effects are muted for you alone, so nothing that slipped through piles up and plays at once on return; they come back 1.5 s after you do
  if (ss.tabAway && !ss.hushed) { ss.hushed = true; ctx.self.gains = { Voice: 0, SFX: 0, Ambience: 0 } }
  const d = input.actionData?.mmenu
  if (input.pressed?.mmenu && d) {
    ctx.emit("playSound", { clip: CLICK, volume: 0.5 }, { audience: { player: ctx.self.id } })
    if (st.bodyStyle !== "furry") st.bodyStyle = "furry"; if (ctx.world.state.bodyStyle !== "furry") ctx.world.state.bodyStyle = "furry" // locked to furry (Shelly, Nov 15) // their saved pick rides into whichever room they wake in
    if (d.k === "start") { st.menuOpen = false; st.menuView = ""; if (!st.run && !st.madeChar) st.run = cleanPick(null); if (st.t0Done && st.madeChar && ctx.self.place !== "bonus") (lazy("hub", () => import("./lib/hub.js"))?.toHub?.(ctx) ?? import("./lib/hub.js").then((m) => { MODS.hub = m; m.toHub(ctx) })); else if (ctx.self.place !== "bonus") { st.introFrom = ctx.self.place; ctx.cross(ctx.self, "intake") } } // after the tutorial, launch lands in the Bonus Room (johnadams2)
    if (d.k === "resume") { st.menuOpen = false; st.menuView = "" }
    if (d.k === "title") { st.menuKind = "title"; st.menuView = "" }
    if (d.k === "view") { st.menuView = ["settings", "controls", "newgame", "saves"].includes(d.v) ? d.v : ""; if (d.v === "newgame") st.newRun = { ...cleanPick(st.newRun), confirm: false }; if (d.v === "saves") listSaves(ctx) }
    if (d.k === "opt" && d.key) st.newRun = { ...cleanPick({ ...st.newRun, [d.key]: d.v }), confirm: false }
    if (d.k === "preset" && PRESETS[d.v]) st.newRun = { ...PRESETS[d.v].v, confirm: false }
    if (d.k === "begin") beginRun(ctx, st, !!d.sure)
    if (d.k === "save" && d.slot >= 1 && d.slot <= SLOTS) saveSlot(ctx, d.slot | 0)
    if (d.k === "load" && d.slot >= 1 && d.slot <= SLOTS) loadSlot(ctx, d.slot | 0)
    if (d.k === "del" && d.slot >= 1 && d.slot <= SLOTS) delSlot(ctx, d.slot | 0)
    if (d.k === "pref" && d.key) {
      const p = { ...(st.uiPrefs ?? {}) }
      if (d.key === "scale" && ["compact", "normal", "large"].includes(d.val)) p.scale = d.val
      else if (d.key === "contrast" && ["standard", "high"].includes(d.val)) p.contrast = d.val
      else if (d.key === "motion" && ["system", "reduced"].includes(d.val)) p.motion = d.val
      else if (d.key === "hudMinimal") p.hudMinimal = !!d.val
      st.uiPrefs = p
    }
    if (d.k === "style") return; // body style is locked to furry
    if (d.k === "style") { st.bodyStyle = d.v === "human" || d.v === "furry" ? d.v : ((st.bodyStyle ?? ctx.world.state.bodyStyle) === "human" ? "furry" : "human"); ctx.world.state.bodyStyle = st.bodyStyle } // BODIES: the player's pick, saved; the room's characters follow it
  }
  holdTime(ctx, st)
}

// solo pause (Shelly, Nov 9: "when im in solo play i should be able to pause the game"): the pause menu holds the whole place, every body, timer and effect,
// while you're the only one in it; the Bonus Room is shared and never stops
function holdTime(ctx, st) {
  const solo = ctx.self.place !== "bonus" && (ctx.place.playerCount ?? 1) <= 1
  const ss = ctx.session
  if (ss.hushed && !ss.tabAway && ctx.now() - (ss.backAt ?? 0) > 1500) { ss.hushed = false; ctx.self.gains = null }
  const want = ((st.menuOpen && st.menuKind === "pause") || (ctx.session.tabAway && !(ctx.self.tags ?? []).includes("helper"))) && solo ? 0 : 1 // a hidden tab holds a solo place too
  if ((ctx.place.timeScale ?? 1) !== want) ctx.place.timeScale = want
}

// ---- new expedition with options (Shelly Nov 14) ----
const NEW_KEEP = ["uiPrefs", "menuOpen", "menuKind", "menuView", "newRun", "saveList", "saveMsg"] // screen settings only: no look, no madeChar, so the critter room runs fresh
const returningRun = (st) => !!(st.madeChar || st.t0Done || (st.level ?? 1) > 1 || (st.xp ?? 0) > 0)
function beginRun(ctx, st, sure) {
  const pick = cleanPick(st.newRun)
  if (returningRun(st) && !sure) { st.newRun = { ...pick, confirm: true }; return } // the menu asks once: this replaces the current expedition
  for (const k of Object.keys(st)) if (!NEW_KEEP.includes(k)) delete st[k] // Shelly Nov 15: a new expedition resets EVERYTHING about the character, look included
  st.run = pick; st.saveV = undefined
  if (pick.god === "on") st.god = true
  if (pick.tutorial === "skip") st.t0Done = true
  st.menuOpen = false; st.menuView = ""; st.newRun = null; st.menuKind = "title"
  if (ctx.self.place === "bonus") return
  if (!st.madeChar || pick.tutorial !== "skip") { st.introFrom = ctx.self.place; ctx.cross(ctx.self, "intake") } // the critter room, then the intro; skip lands you in Level 0 after it
  else { st.arrivePending = true; ctx.cross(ctx.self, "main") }
}
// ---- save manager: five named slots per player in the game's SQL (scripts/db.js) ----
const SLOTS = 5
function owner(ctx) { return ctx.self.userId ?? ctx.self.id }
function note(me, text) { me.state.saveMsg = { text, at: Date.now() } }
function listSaves(ctx) {
  const me = ctx.self, who = owner(ctx)
  ctx.sql`SELECT slot, name, place, level, at FROM saves WHERE owner = ${who} ORDER BY slot`.then((r) => {
    me.state.saveList = (r?.rows ?? []).map((x) => ({ slot: x.slot, name: x.name, place: x.place, level: x.level, at: x.at }))
  }).catch(() => note(me, "Couldn't read your saves."))
}
function snapshot(st) { const o = {}; for (const [k, v] of Object.entries(st)) if (!SKIP.has(k) && v !== undefined) o[k] = v; return o }
function saveSlot(ctx, slot) {
  const me = ctx.self, st = me.state, who = owner(ctx), data = snapshot(st)
  const place = st.savePlace ?? (String(me.place).startsWith("tutorial0") ? "main" : me.place)
  if (place && !String(place).startsWith("tutorial0") && place !== "intake" && place !== "bonus") { data.savePlace = place; if (me.place === place) data.savePos = { ...me.feetPosition } }
  const name = `Level ${st.level ?? 1} · ${place ?? "Level 0"}`, at = new Date().toISOString()
  ctx.sql`INSERT INTO saves (owner, slot, name, place, level, at, data) VALUES (${who}, ${slot}, ${name}, ${place}, ${st.level ?? 1}, ${at}, ${JSON.stringify(data)}) ON CONFLICT (owner, slot) DO UPDATE SET name = excluded.name, place = excluded.place, level = excluded.level, at = excluded.at, data = excluded.data`
    .then(() => { note(me, `Saved to slot ${slot}.`); listSaves(ctx) }).catch(() => note(me, "That save didn't go through."))
}
function loadSlot(ctx, slot) {
  const me = ctx.self, who = owner(ctx)
  ctx.sql`SELECT data FROM saves WHERE owner = ${who} AND slot = ${slot}`.then((r) => {
    const row = r?.rows?.[0]; if (!row) return note(me, `Slot ${slot} is empty.`)
    let data; try { data = JSON.parse(row.data) } catch { return note(me, "That save is damaged.") }
    const st = me.state
    for (const k of Object.keys(st)) if (!KEEP.includes(k)) delete st[k]
    for (const [k, v] of Object.entries(data)) if (!KEEP.includes(k) || k === "look") st[k] = v
    st.menuOpen = false; st.menuView = ""; st.saveMsg = null
    const to = wakePlace(ctx, st) ?? "main"
    if (to !== me.place) ctx.cross(me, to); else if (st.savePos) me.feetPosition = st.savePos
  }).catch(() => note(me, "Couldn't load that save."))
}
function delSlot(ctx, slot) {
  const me = ctx.self, who = owner(ctx)
  ctx.sql`DELETE FROM saves WHERE owner = ${who} AND slot = ${slot}`.then(() => { note(me, `Slot ${slot} cleared.`); listSaves(ctx) }).catch(() => note(me, "Couldn't clear that slot."))
}
export { SLOTS }
