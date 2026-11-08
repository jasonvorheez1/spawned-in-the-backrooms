// the title (johnadams2, Nov 8): every fresh visit opens on the title over the live halls, one START.
// START walks you into the intake room (places/intake), where the critter creator opens; closing it walks you back
// to the place you came from. Backspace mid-game opens the same screen as a pause with RESUME.
// The title theme plays on this machine alone through the title and the intake room, and fades when you step out.
import { animate } from "builtin/tween";
const MUSIC = "/cdn/moodboard-lowpoly-cozy/music-soft-mellow-fingerpicked-acoustic-guitar-and-warm-rhodes-early-2000s-bedroom-calm-loop.mp3"; // the drone was exhausting (johnadams2): soft and quiet instead
const CLICK = "/cdn/moodboard-realistic-gritty/sfx-old-crt-tv-power-on-click-thunk.mp3";
const MUSIC_GAIN = 0.12; // her pick

function music(ctx, want) {
  const ses = ctx.session, have = ses.mmMusic && ctx.getObject(ses.mmMusic)
  if (want && !have) { ses.mmMusic = ctx.spawn({ audience: "local", scope: "session", feetPosition: ctx.self.feetPosition, audio: { clip: MUSIC, loop: true, spatial: false, gain: MUSIC_GAIN, bus: "Music" } }); ses.mmKill = 0 }
  else if (want && have && ses.mmKill) { ses.mmKill = 0; animate(ctx, ses.mmMusic, { "audio.gain": MUSIC_GAIN }, { duration: 0.6 }) }
  else if (!want && have && !ses.mmKill) { ses.mmKill = ctx.now() + 1800; animate(ctx, ses.mmMusic, { "audio.gain": 0 }, { duration: 1.6 }) }
  else if (!want && have && ses.mmKill && ctx.now() > ses.mmKill) { ctx.destroy(ses.mmMusic); ses.mmMusic = null; ses.mmKill = 0 }
  return !!(ses.mmMusic && ctx.getObject(ses.mmMusic))
}

export function update(ctx) {
  if (!ctx.self.isLocal && ctx.self.isLocal !== undefined) return ctx.sleep()
  const st = ctx.self.state, ses = ctx.session, place = ctx.self.place
  if (!ses.menuMark) {
    ses.menuMark = true
    if (!st.madeChar && (st.xp || st.lvl || st.level || st.visits)) st.madeChar = true // a save that already played keeps its critter
    if (place !== "intake") { st.menuOpen = true; st.menuKind = "title" }
  }
  // the intake room: the creator opens on arrival; once it closes, back out to where you came from
  if (place === "intake") {
    if (!ses.inIntake) { ses.inIntake = true; ses.leftIntake = false; st.menuOpen = false; st.wardrobeOpen = true; st.wrMenu = true; st.wrTab = "body" }
    else if (!st.wardrobeOpen && !ses.leftIntake) { ses.leftIntake = true; st.madeChar = true; ctx.cross(ctx.self, st.introFrom && st.introFrom !== "intake" ? st.introFrom : "main") }
  } else ses.inIntake = false
  const playing = music(ctx, (st.menuOpen && st.menuKind === "title") || place === "intake")
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
  ctx.sleep()
}

export function onInput(ctx, input) {
  const st = ctx.self.state
  if (input.pressed?.mainmenu && !st.talkWith && !st.mj?.seats && ctx.self.place !== "intake") {
    st.menuOpen = !st.menuOpen
    if (st.menuOpen) { st.menuKind = "pause"; st.wardrobeOpen = false; st.wrMenu = false }
  }
  const d = input.actionData?.mmenu
  if (input.pressed?.mmenu && d) {
    ctx.emit("playSound", { clip: CLICK, volume: 0.5 }, { audience: { player: ctx.self.id } })
    if (d.k === "start") { st.menuOpen = false; st.introFrom = ctx.self.place; ctx.cross(ctx.self, "intake") }
    if (d.k === "resume") st.menuOpen = false
  }
}
