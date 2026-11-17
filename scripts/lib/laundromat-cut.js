// The opening (Shelly Nov 17: "not AI slop, not grandiose, a completely different setting"): a laundromat at 2 am.
// Plain shots, no music swell. Rain, a dryer thumping a shoe round, you folding a shirt; the lights go out from the back
// forward, the dryer stops, and the floor lets go of you. Lands in the tutorial. Hold JUMP to skip.
const LEN = 24
const S = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const L = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u })
const lerp = (a, b, u) => a + (b - a) * u
const SND = {
  flick: "/cdn/moodboard-realistic-gritty/sfx-fluorescent-tube-flicker-tick.mp3",
  off: "/cdn/moodboard-realistic-gritty/sfx-big-breaker-switch-clunk-off.mp3",
  stop: "/cdn/moodboard-realistic-gritty/sfx-dryer-drum-winding-down-and-stopping.mp3",
  creak: "/cdn/moodboard-realistic-gritty/sfx-floor-tiles-cracking-low-groan.mp3",
  fall: "/cdn/moodboard-realistic-gritty/sfx-deep-wind-rushing-fall.mp3",
}
const LIGHTS = [6, 5, 4, 3, 2, 1, 0] // back to front
const ME = { x: 0.15, y: 0, z: -5.2 } // at the folding counter, facing it (-x)
const DRYER = { x: 3.1, y: 1.2, z: -4.42 }

export function lmTick(ctx, ses, st) {
  const me = ctx.self, now = ctx.now()
  const c = (ses.lm ??= { at: now, done: {} })
  const t = (now - c.at) / 1000
  const once = (k, f) => { if (!c.done[k]) { c.done[k] = 1; f() } }
  const snd = (clip, v = 0.8, pos) => ctx.emit("playSound", { clip, volume: v, ...(pos ? { position: pos, maxDistance: 20 } : {}) }, { audience: { player: me.id } })
  const light = (i, k) => { const o = ctx.getObject(`lm-light-${i}`); if (o?.light) o.light = { ...o.light, intensity: k } }
  if (t > LEN || ses.lmSkip) {
    for (const i of LIGHTS) light(i, 2.2)
    ctx.view.camera = null; me.anim && (me.anim.cut = null); ses.lm = null; ses.lmSkip = false
    st.lmDone = true; st.arrivePending = true; ctx.cross(me, "tutorial0")
    return true
  }
  st.cut = st.cut ?? now // the HUD reads a cutscene (letterbox, no prompts)
  // the body: folding at the counter, then a few steps to the stopped dryer
  if (t < 15) { me.feetPosition = ME; me.rotation = { yaw: 90 }; once("fold", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } }) }
  else if (t < 19.5) { const u = S(15, 18.5, t); me.feetPosition = L(ME, { x: 2.35, y: 0, z: -4.42 }, u); me.rotation = { yaw: -90 }; once("walk", () => { me.anim.cut = { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop", speed: 0.7 } }) }
  else once("stand", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })

  // beats
  if (t > 9) once("f1", () => { light(6, 0.4); snd(SND.flick, 0.5, { x: -1.6, y: 2.8, z: -10.2 }) })
  if (t > 9.4) once("f2", () => light(6, 2.2))
  if (t > 11.5) for (let k = 0; k < LIGHTS.length; k++) if (t > 11.5 + k * 0.45) once("off" + k, () => { light(LIGHTS[k], 0); snd(SND.off, 0.35 + k * 0.06) })
  if (t > 12.2) once("stop", () => { snd(SND.stop, 0.9, DRYER); const o = ctx.getObject("lm-dryer-thump"); if (o) o.audio = null; const h = ctx.getObject("lm-hum"); if (h) h.audio = null })
  if (t > 15) once("dim", () => light(0, 0.35)) // the one by the door comes back, weak
  if (t > 19.6) once("creak", () => { snd(SND.creak, 0.9); ctx.emit("screenShake", { intensity: 0.12, duration: 1.2 }, { audience: { player: me.id } }) })
  if (t > 21.4) once("fall", () => { snd(SND.fall, 1); me.hidden = [...(me.hidden || []), me.id]; ctx.emit("screenFlash", { color: "#e8d27a", duration: 0.9, intensity: 0.5 }, { audience: { player: me.id } }) })

  // shots
  let cam
  if (t < 4.5) { const u = S(0, 4.5, t); cam = { eye: { x: lerp(-2.6, -2.3, u), y: 1.25, z: -0.7 }, aim: { x: -2.4, y: 0.9, z: -9 }, fov: 50 } } // down the row of washers, the street light on the floor
  else if (t < 8.5) { const u = S(4.5, 8.5, t); cam = { eye: { x: lerp(1.9, 2.1, u), y: 1.25, z: -4.42 }, aim: { x: 3.1, y: 1.2, z: -4.42 }, fov: lerp(34, 28, u) } } // the porthole, something knocking round inside
  else if (t < 12) { cam = { eye: { x: -1.2, y: 1.55, z: -6.1 }, aim: { x: 0.2, y: 1.0, z: -5.0 }, fov: 45 } } // across the counter: you, folding, the far light ticking
  else if (t < 15) { const u = S(12, 15, t); cam = { eye: { x: 0.2, y: 2.4, z: -0.6 }, aim: { x: 0.2, y: 0.8, z: lerp(-10, -5, u) }, fov: 55 } } // from the door: the room going dark, back to front, onto you
  else if (t < 19.5) { const u = S(15, 19.5, t); cam = { eye: { x: 1.2, y: 0.5, z: lerp(-1.6, -2.0, u) }, aim: { x: me.feetPosition.x, y: 0.8, z: me.feetPosition.z }, fov: 50 } } // low by the dryers as you walk over
  else { const k = S(19.6, 22.5, t); cam = { eye: { x: 1.6, y: lerp(1.65, -1.5, S(21.4, 23.5, t)), z: -4.42 }, aim: { x: 3.1, y: lerp(1.2, -2, k), z: -4.42 }, fov: lerp(40, 75, S(21.4, 23.5, t)) } } // over the shoulder at the dark porthole, then the floor goes and the camera goes with it
  const shot = t < 4.5 ? 0 : t < 8.5 ? 1 : t < 12 ? 2 : t < 15 ? 3 : t < 19.5 ? 4 : 5
  cam.cut = c.shot !== shot; c.shot = shot // the first write of each shot is a hard cut
  ctx.view.camera = cam
  return true
}
