// The tutorial Level 0's cutscenes (johnadams2: "multiple cutscenes eg meeting an entity ... the final cutscene then
// transitions to the game name"). Runs on the player's own machine from scripts/main-menu.js in places/tutorial0.
// state.t0n = beats passed, state.t0cut = { id, at } while one plays; the frame and captions are scripts/cutscene-ui.js t0Ui.
import { animate } from "builtin/tween"
import { BEATS, SMILER, SHIFT, SOFT, ALMOND, UNIT } from "./tut0.js"
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const SMILER_MODEL = { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" } // scripts/smilers.js
export const LEN = { almond: 6.5, halogen: 6, smiler: 12, shift: 7.5, final: 21 }
const ss = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const lerp = (a, b, u) => a + (b - a) * u
const L3 = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) })
const me1 = (ctx) => ctx.self.id
function snd(ctx, n, v, at) { ctx.emit("playSound", { clip: SND(n), position: at ?? ctx.self.feetPosition, volume: v, maxDistance: 40 }, { audience: { player: me1(ctx) } }) }
function endLight(ctx, on) { // the hall's last working fixture stutters; the dead one past it never comes on
  const o = ctx.getObject("t0-light-13"); if (o?.light) o.light = { ...o.light, intensity: on ? 5 : 0.3 }
}
const inBeat = (b, p) => b.circle ? Math.hypot(p.x - b.circle.x, p.z - b.circle.z) < b.circle.r * 0.8 : p.x > b.box[0] && p.x < b.box[1] && p.z > b.box[2] && p.z < b.box[3]

// true while a cutscene owns the player
export function t0Tick(ctx, ses, st) {
  const me = ctx.self, p = me.feetPosition
  if (!st.t0cut) {
    const b = BEATS[st.t0n ?? 0]
    if (!b || !inBeat(b, p)) return false
    st.t0cut = { id: b.id, at: ctx.now() }; ses.t0 = null
  }
  const id = st.t0cut.id, t = (ctx.now() - st.t0cut.at) / 1000
  const c = (ses.t0 ??= { p0: { x: p.x, y: p.y || 0, z: p.z }, yaw: me.rotation?.yaw ?? 0, did: {} })
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  if (id !== "final" || t < 3) { me.feetPosition = c.p0 }
  me.velocity = { x: 0, y: 0, z: 0 }
  const done = BEAT[id](ctx, c, t, once, st)
  if (!done) return true
  if (id === "halogen") { st.creating = false; st.sheetOpen = false }
  for (const k of ["smiler", "glint", "dust"]) if (c[k]) ctx.destroy(c[k])
  me.anim.cut = null; ctx.view.camera = null; me.hidden = (me.hidden || []).filter((i) => i !== me.id)
  st.t0n = (st.t0n ?? 0) + 1; st.t0cut = null; ses.t0 = null
  return id === "final" ? "level1" : true
}
const BEAT = {
  // the bottle on the desk catches the light; the camera finds it before they do
  almond(ctx, c, t, once) {
    const me = ctx.self, a = { x: ALMOND.x, y: ALMOND.y + 0.16, z: ALMOND.z }
    once("go", () => {
      snd(ctx, "soft-pda-beep-confirm", 0.4)
      ctx.emit("highlightSet", { target: "t0-almond", color: "#ffe9a8", style: "glow", duration: 7 }, { audience: { player: me.id } })
      c.glint = ctx.spawn({ audience: "local", scope: "session", feetPosition: a, light: { kind: "point", color: "#fff1c4", intensity: 1.6, distance: 2.5 } })
    })
    me.rotation = { yaw: 125 }
    const u = ss(0, 4.2, t), eye = L3({ x: c.p0.x + 0.6, y: 1.65, z: c.p0.z + 1.6 }, { x: -1.6, y: 1.25, z: -15.2 }, u)
    ctx.view.camera = t < 5 ? { eye, aim: L3({ x: c.p0.x - 1, y: 1.4, z: c.p0.z - 3 }, a, ss(0, 2.6, t)), fov: lerp(60, 32, u) }
      : { eye: L3({ x: -1.6, y: 1.25, z: -15.2 }, { x: c.p0.x, y: 1.6, z: c.p0.z }, ss(5, 6.4, t)), aim: L3(a, { x: c.p0.x - 2, y: 1.5, z: c.p0.z - 3 }, ss(5, 6.4, t)), fov: lerp(32, 70, ss(5, 6.4, t)) }
    return t > LEN.almond
  },
  // they pick up the wrist unit; it boots amber; the sheet opens and the scene waits on their stats (Fallout's "you're SPECIAL")
  halogen(ctx, c, t, once, st) {
    const me = ctx.self, u = { x: UNIT.x, y: UNIT.y + 0.03, z: UNIT.z }
    me.rotation = { yaw: Math.atan2(-(u.x - c.p0.x), -(u.z - c.p0.z)) * 180 / Math.PI }
    once("pick", () => { me.anim.cut = { clip: "cdn/clip-pickup.glb", weight: 4 }; snd(ctx, "soft-pda-beep-confirm", 0.3) })
    if (t > 1.3) once("take", () => { const o = ctx.getObject("t0-unit"); if (o) o.visible = false; snd(ctx, "wrist-device-raise-click-crt-power-on", 0.8) })
    if (t > 2.2) once("look", () => { me.anim.cut = { clip: "cdn/clip-cast.glb", weight: 4 } })
    if (t > 3.6) once("open", () => { st.creating = true; st.sheetOpen = true; me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
    const k = ss(0, 2.2, t)
    ctx.view.camera = { eye: L3({ x: c.p0.x + 1.1, y: 1.7, z: c.p0.z + 1.3 }, { x: c.p0.x + 0.9, y: 1.3, z: c.p0.z - 0.4 }, k), aim: L3(u, { x: c.p0.x - 0.3, y: 1.15, z: c.p0.z - 0.3 }, ss(1.2, 3.4, t)), fov: lerp(48, 34, ss(2, 3.6, t)) }
    return t > 4 && !st.sheetOpen
  },
  // the hall's last light stutters; something at the far end smiles; it comes; the lights slam back and it's gone
  smiler(ctx, c, t, once) {
    const me = ctx.self, eyeH = { x: c.p0.x - 0.6, y: 1.65, z: c.p0.z + 0.5 }, face = { x: SMILER.x, y: 1.1, z: SMILER.z }
    me.rotation = { yaw: -90 }
    once("flick", () => snd(ctx, "fluorescent-light-buzz-hum", 0.8))
    for (const [k, at, on] of [["f1", 0.6, false], ["f2", 0.75, true], ["f3", 1.3, false], ["f4", 1.45, true], ["f5", 1.9, false], ["f6", 2.0, true], ["f7", 2.6, false]]) if (t > at) once(k, () => endLight(ctx, on))
    if (t > 2.6) once("dim", () => snd(ctx, "power-down-electrical-hum-cut", 0.6))
    if (t > 3.4) once("smiler", () => {
      c.smiler = ctx.spawn({ audience: "local", scope: "session", feetPosition: { x: SMILER.x, y: 0, z: SMILER.z }, rotation: 90, scale: 1.6, model: SMILER_MODEL, children: [{ feetPosition: { x: 0, y: 0.75, z: 0 }, light: { kind: "point", color: "#f4f1e6", intensity: 0.8, distance: 3 } }] })
      ctx.getObject(c.smiler).anim.body = { clip: "cdn/clip-crouch-idle-loop.glb", loop: "loop", weight: 1 }
      snd(ctx, "creepy-whisper-breath-close", 0.7, face)
    })
    if (t > 7.6) once("lunge", () => {
      const s = ctx.getObject(c.smiler); if (s) { s.anim.body = { clip: "cdn/clip-crouch-walk-loop.glb", loop: "loop", weight: 1 }; animate(ctx, c.smiler, { "feetPosition.x": c.p0.x + 6 }, { duration: 1.1, easing: "easeInQuad" }) }
      snd(ctx, "horror-scream-sting", 1.0, face)
    })
    if (t > 8.7) once("back", () => {
      if (c.smiler) { ctx.destroy(c.smiler); c.smiler = null }
      endLight(ctx, true); snd(ctx, "fluorescent-light-buzz-hum", 1.0)
      ctx.emit("screenFlash", { color: "#fff6d8", duration: 0.35, intensity: 0.9 }, { audience: { player: me.id } })
      ctx.emit("screenShake", { intensity: 0.5, duration: 0.45 }, { audience: { player: me.id } })
    })
    const sx = c.smiler && ctx.getObject(c.smiler)?.feetPosition?.x
    let cam
    if (t < 3.4) cam = { eye: eyeH, aim: { x: c.p0.x + 12, y: 1.5, z: SMILER.z }, fov: 62 }
    else if (t < 7.6) { const u = ss(3.6, 7.2, t); cam = { eye: eyeH, aim: L3({ x: c.p0.x + 12, y: 1.5, z: SMILER.z }, face, ss(3.4, 4.6, t)), fov: lerp(62, 13, u) } } // the slow zoom into the grin
    else if (t < 8.7) cam = { eye: eyeH, aim: { x: sx ?? face.x, y: 1.0, z: SMILER.z }, fov: lerp(13, 70, ss(7.6, 8.5, t)) }
    else cam = { eye: { x: c.p0.x, y: 1.6, z: c.p0.z }, aim: { x: c.p0.x + 8, y: 1.55, z: c.p0.z }, fov: 70 }
    ctx.view.camera = cam
    return t > LEN.smiler
  },
  // behind them the hall closes: the wall comes up out of the carpet with a grinding groan
  shift(ctx, c, t, once) {
    const me = ctx.self, w = { x: SHIFT.x, y: 1.4, z: (SHIFT.z0 + SHIFT.z1) / 2 }
    me.rotation = { yaw: Math.atan2(-(w.x - c.p0.x), -(w.z - c.p0.z)) * 180 / Math.PI }
    if (t > 1.2) once("rise", () => {
      animate(ctx, "tut0-shift", { "feetPosition.y": 0 }, { duration: 3.6, easing: "easeInOutQuad" })
      snd(ctx, "stone-wall-grinding-rumble", 1.0, w)
      ctx.emit("screenShake", { intensity: 0.25, duration: 3.4 }, { audience: { player: me.id } })
      c.dust = ctx.spawn({ audience: "local", scope: "session", feetPosition: { x: w.x + 0.15, y: 0.02, z: w.z }, fx: { script: `fx
pop dust rate=26 on=box(<.1,0,1.5>) life=1..1.8 v=up(.3..0.7)+sdir()*.4 size=.15..0.3 acc=drag(1.8)+buoy(.2) col=<.62,.55,.36> a=0>.4:.3>.6:.15>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)` } })
    })
    if (t > 5.2 && c.dust) { ctx.destroy(c.dust); c.dust = null }
    const u = ss(0, 1.2, t)
    ctx.view.camera = { eye: L3({ x: c.p0.x, y: 1.65, z: c.p0.z }, { x: 44.5, y: 1.5, z: -25 }, u), aim: L3({ x: c.p0.x - 2, y: 1.6, z: c.p0.z }, w, u), fov: lerp(70, 50, u) }
    if (t > 6.2) ctx.view.camera = { eye: L3({ x: 44.5, y: 1.5, z: -25 }, { x: c.p0.x, y: 1.65, z: c.p0.z }, ss(6.2, 7.3, t)), aim: L3(w, { x: 44, y: 1.6, z: -14 }, ss(6.2, 7.3, t)), fov: lerp(50, 70, ss(6.2, 7.3, t)) }
    return t > LEN.shift
  },
  // the wet patch gives: they sink through the carpet, black, the fall, then the title
  final(ctx, c, t, once, st) {
    const me = ctx.self, at = { x: SOFT.x, y: 0, z: SOFT.z }
    if (t < 3) me.feetPosition = { x: lerp(c.p0.x, at.x, ss(0, 0.8, t)), y: 0, z: lerp(c.p0.z, at.z, ss(0, 0.8, t)) }
    else me.feetPosition = { x: at.x, y: -2.6 * Math.pow(ss(3, 6.4, t), 1.6), z: at.z }
    once("squelch", () => { snd(ctx, "wet-squelch-mud-step", 0.9); me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
    if (t > 1.4) once("look", () => { me.anim.cut = { clip: "cdn/clip-shrug.glb", weight: 4 }; snd(ctx, "deep-rumble-groan", 0.8) })
    if (t > 3) once("sink", () => { me.anim.cut = { clip: "cdn/clip-fall-loop.glb", weight: 4, loop: "loop" }; snd(ctx, "wet-squelch-mud-step", 1.0); ctx.emit("screenShake", { intensity: 0.3, duration: 3 }, { audience: { player: me.id } }) })
    if (t > 6.4) once("gone", () => { me.hidden = [...(me.hidden || []), me.id]; snd(ctx, "deep-wind-rushing-fall", 0.9) })
    if (t > 9.2) once("thud", () => snd(ctx, "heavy-impact-thud-boom", 0.9))
    if (t > 11.5) once("title", () => snd(ctx, "dark-ambient-drone-swell", 0.8))
    if (t < 3) { const u = ss(0, 3, t); ctx.view.camera = { eye: L3({ x: at.x + 2.6, y: 1.7, z: at.z + 2.4 }, { x: at.x + 1.9, y: 0.6, z: at.z + 1.6 }, u), aim: { x: at.x, y: lerp(1.2, 0.5, u), z: at.z }, fov: 50 } }
    else ctx.view.camera = { eye: { x: at.x + 1.6, y: lerp(0.6, 2.2, ss(3, 6.4, t)), z: at.z + 1.3 }, aim: { x: at.x, y: lerp(0.4, 0, ss(3, 6.4, t)), z: at.z }, fov: lerp(50, 64, ss(3, 6.4, t)) }
    if (t > LEN.final) { st.t0Done = true; st.t0fade = ctx.now(); return true }
    return false
  },
}
