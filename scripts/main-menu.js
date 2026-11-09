// the title (johnadams2, Nov 8): every fresh visit opens on the title over the live halls, one START.
// START walks you into the intake room (places/intake), where the critter creator opens; closing it walks you back
// to the place you came from. Backspace mid-game opens the same screen as a pause with RESUME.
// The title theme plays on this machine alone through the title and the intake room, and fades when you step out.
import { screen } from "./lib/screen.js"
import { cutTick } from "./lib/intro-cut.js"
import { arriveTick } from "./lib/arrive-cut.js"
import { tutStart, tutTick, tutInput } from "./lib/tutorial.js"
import { t0Tick } from "./lib/tut0-cut.js"
import { l26Tick } from "./lib/l26-cut.js"
import { dinaTick } from "./lib/dina-quest.js"
import { animate } from "builtin/tween";
import { toHub } from "./lib/hub.js"
const MUSIC = "/cdn/moodboard-lowpoly-cozy/music-soft-mellow-fingerpicked-acoustic-guitar-and-warm-rhodes-early-2000s-bedroom-calm-loop.mp3"; // the drone was exhausting (johnadams2): soft and quiet instead
const CLICK = "/cdn/moodboard-realistic-gritty/sfx-old-crt-tv-power-on-click-thunk.mp3";
const MUSIC_GAIN = 0.12; // her pick

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
  if (!ctx.self.isLocal && ctx.self.isLocal !== undefined) return ctx.sleep()
  const st = ctx.self.state, ses = ctx.session, place = ctx.self.place?.startsWith("tutorial0") ? "tutorial0" : ctx.self.place // a solo copy is named tutorial0-<id>
  if (!ses.menuMark) {
    ses.menuMark = true
    if (!st.madeChar && (st.xp || st.lvl || st.level || st.visits)) st.madeChar = true // a save that already played keeps its critter
    if (place !== "intake" && !st.roomHop) { st.menuOpen = true; st.menuKind = "title" } // a walk between rooms (the Bonus Room) is no launch
  }
  // the intake room: the creator opens on arrival; once it closes, back out to where you came from
  if (place === "intake") {
    if (!ses.inIntake) { ses.inIntake = true; ses.leftIntake = false; if (st.cut) { st.cut = null; ses.cut = null; ctx.view.camera = null }; st.menuOpen = false; st.wardrobeOpen = true; st.wrMenu = true; st.wrTab = "body" }
    else if (!st.wardrobeOpen && !ses.leftIntake && !st.cut) { ses.leftIntake = true; st.madeChar = true; st.cut = ctx.now(); ses.cut = null } // the intro plays first (scripts/lib/intro-cut.js)
    if (st.cut && cutTick(ctx, ses, st)) { music(ctx, false); ctx.cross(ctx.self, st.t0Done ? "main" : "tutorial0"); return } // the intro lands you in the tutorial Level 0 the first time, the real one after
  } else ses.inIntake = false
  // Level 0 after the intro: the ceiling drop (scripts/lib/arrive-cut.js), then the tutorial (scripts/lib/tutorial.js)
  const l0 = place === "main" || place === "tutorial0"
  if (l0 && st.arrivePending && !st.menuOpen) { st.arrivePending = false; st.arrive = ctx.now(); ses.arr = null; if (place === "tutorial0") { st.t0n = 0; st.t0cut = null } }
  if (st.arrive) { if (!l0) { st.arrive = null; ses.arr = null; ctx.view.camera = null; return } if (arriveTick(ctx, ses, st)) tutStart(ctx, st); return }
  // the tutorial Level 0's beats (scripts/lib/tut0-cut.js): a fresh visit there without the drop starts the route over
  if (ses.t0Last !== ctx.self.place) { if (place === "tutorial0" && !st.arrive) { st.t0n = 0; st.t0cut = null; ses.t0 = null; ses.inT0 = true } ses.t0Last = ctx.self.place } // every walk into the tutorial starts at the first beat, whatever a past run left
  if (place === "tutorial0" && !st.menuOpen) {
    if (!ses.inT0) { ses.inT0 = true; if (!st.arrive) { st.t0n = 0; st.t0cut = null } }
    const r = t0Tick(ctx, ses, st)
    if (r === "level1") { st.tut = null; ctx.cross(ctx.self, "level1"); return }
    if (r) return
  } else ses.inT0 = false
  // Level 26: the first time aboard, the ship in the fog and Phoebe at the rail (scripts/lib/l26-cut.js)
  if (place === "level26" && !st.menuOpen && (st.l26cut || !st.l26seen)) { if (l26Tick(ctx, ses, st)) return ctx.sleep(0) }
  if ((place === "level1" || st.dcut || (place === "level26" && st.dinaQ === 2) || (st.dinaQ === 2 && st.quests?.["the-undelivered"]?.mark == null) || (st.dinaQ && !st.quests?.["the-undelivered"])) && dinaTick(ctx, ses, st)) return ctx.sleep(0) // Dina's camp and her diary (scripts/lib/dina-quest.js)
  if (st.tut) tutTick(ctx, st)
  const playing = music(ctx, (st.menuOpen && st.menuKind === "title") || (place === "intake" && !st.cut))
  // behind the title the camera slowly looks around the halls from head height; gone the moment it closes
  if (st.menuOpen) {
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
  if (st.tut) tutInput(ctx, st, input)
  if (st.dcut) { const ss = ctx.session; if (input.held?.jump) ss.dskip ??= ctx.now(); else ss.dskip = null } // hold jump 1.2 s skips the diary cutscene
  if (st.l26cut) { const ss = ctx.session; if (input.held?.jump) ss.l26skip ??= ctx.now(); else ss.l26skip = null } // hold jump 1.2 s skips Level 26's cutscene
  if (input.pressed?.mainmenu && ctx.self.place !== "intake" && (st.menuOpen || !['talk', 'mahjong', 'cutscene'].includes(screen(st, ctx.self.place)))) { // pause never stacks on a talk, the mahjong table or a cutscene it couldn't draw over
    st.menuOpen = !st.menuOpen
    if (st.menuOpen) { st.menuKind = "pause"; st.wardrobeOpen = false; st.wrMenu = false }
  }
  const d = input.actionData?.mmenu
  if (input.pressed?.mmenu && d) {
    ctx.emit("playSound", { clip: CLICK, volume: 0.5 }, { audience: { player: ctx.self.id } })
    if (st.bodyStyle && ctx.world.state.bodyStyle !== st.bodyStyle) ctx.world.state.bodyStyle = st.bodyStyle // their saved pick rides into whichever room they wake in
    if (d.k === "start") { st.menuOpen = false; if (st.t0Done && st.madeChar && ctx.self.place !== "bonus") toHub(ctx); else if (ctx.self.place !== "bonus") { st.introFrom = ctx.self.place; ctx.cross(ctx.self, "intake") } } // after the tutorial, launch lands in the Bonus Room (johnadams2)
    if (d.k === "resume") st.menuOpen = false
    if (d.k === "style") { st.bodyStyle = (st.bodyStyle ?? ctx.world.state.bodyStyle) === "furry" ? "human" : "furry"; ctx.world.state.bodyStyle = st.bodyStyle } // BODIES: the player's pick, saved; the room's characters follow it
  }
  holdTime(ctx, st)
}

// solo pause (Shelly, Nov 9: "when im in solo play i should be able to pause the game"): the pause menu holds the whole place, every body, timer and effect,
// while you're the only one in it; the Bonus Room is shared and never stops
function holdTime(ctx, st) {
  const solo = ctx.self.place !== "bonus" && (ctx.place.playerCount ?? 1) <= 1
  const want = st.menuOpen && st.menuKind === "pause" && solo ? 0 : 1
  if ((ctx.place.timeScale ?? 1) !== want) ctx.place.timeScale = want
}
