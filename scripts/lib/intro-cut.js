// The intro after the character creator (johnadams2: "my character finds a wall, tries noclipping and gets sent into level 0",
// long and cinematic, no camcorder, it just happens). Runs on the player's own machine from scripts/main-menu.js while
// state.cut (a ctx.now() stamp) stands in the intake bedroom. ~25 s: five camera shots, the body walked by hand,
// the wall goes yellow under their palm, they sink in, a yellow flash, then the existing Level 0 fall (scripts/noclip.js).
import { animate } from "builtin/tween"
import { spawnPhoebe, dropPhoebe } from "./phoebe.js"
const WALL = { x: 1.0, z: 2.5 }          // the bedroom's back wall (places/intake), right of the skate poster
const STAND = { x: 1.0, z: 1.95 }        // where they stop, a step off it
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const TOUCH = "cdn/clip-pressing-palm-flat-against-a-wall-curiously.glb" // cooks once, then plays from the library
const RIPPLE = `fx
pop motes rate=?mobile:20|45 on=disc(.55) life=.7..1.4 v=sdir()*.25+<0,0,-0.3> size=.02..0.05 acc=drag(1.2)+curl(.4) col=hdr(3.2,2.7,1.1) a=0>.2:1>0 r=sprite(soft-disc,add)
pop glow n=1 r=light(<1,.86,.45>,5,4)`
const END = 25            // the old scene's length; it now runs after a 10 s bed opening (PRE)
const PRE = 16
const BED = { x: -1.95, y: 0.42, z: 0.75 } // places/intake ir-bed, on the mattress
const UP = { x: -0.85, z: 0.75 }          // beside the bed, where they stand up
const ss = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const lerp = (a, b, u) => a + (b - a) * u
function sound(ctx, n, v) { const p = ctx.self.feetPosition; ctx.emit("playSound", { clip: SND(n), position: { x: WALL.x, y: (p.y || 0) + 1.3, z: WALL.z - 0.3 }, volume: v, maxDistance: 30 }, { audience: { player: ctx.self.id } }) }

// the opening, no captions: asleep, the clock ticking, the lamp stutters, three knocks from inside the back wall,
// they jolt up and sit on the bed's edge listening, a fourth knock, they stand and face it
const CLOCK = "/cdn/value.00f458091b81c59e89a46f506df3eae886042cb683512c4845f80f757d3badde.mp3"  // Shelly's horror pack: Clock.wav
const KNOCK = "/cdn/value.b52c1ee2a3f897651d96f0595a38bcf939848b0db9daa16eb3da3e4cbf6d2f77.mp3"  // Door_knocking_quiet.wav
const GASP = "/cdn/value.1f5d195f954552c9304c8d13f9177b97b62b100316d004215a918c9282445aad.mp3"   // Gasp.wav
const BREATH = "/cdn/value.60bf2d4498f8ed4068160ee05c1cfd064e645f3eb921729cf5a8fd3f1d127754.mp3" // Breathing_slow.wav
const BREATHF = "/cdn/value.92bf175ed8ff7226b4ca07fa700883e57e814e1ef5cefa26e09a4a8eac38b2b6.mp3" // Breathing_fast.wav
const BUZZ = "/cdn/value.c8f3a43521c8afb4956956d5751c39b3bed2556050077273729c942df38b9a84.mp3"   // Fluorescent light bulb buzz_2.wav
const STEPS = "/cdn/value.7ed87c4d50ae869788548795b3e576f411060c207e2ef1a01a00786cae6783b5.mp3"  // Footsteps_walking.wav
const SWITCH = "/cdn/value.cfaf43a0a5d0271880b47b5bfffca5ead1c81c67b31841b642c64c05e5f0cb6e.mp3" // switch.wav
function clip(ctx, ref, v, at) { ctx.emit("playSound", { clip: ref, position: at ?? ctx.self.feetPosition, volume: v, maxDistance: 30 }, { audience: { player: ctx.self.id } }) }
function lamp(ctx, i) { const o = ctx.getObject("ir-lamp-light"); if (o?.light) { ctx.self.session.lampI ??= o.light.intensity; o.light = { ...o.light, intensity: ctx.self.session.lampI * i } } }
const EDGE = { x: -1.3, z: 0.75 } // sitting on the bed's edge, facing the room
function bedTick(ctx, c, t, y0) {
  const me = ctx.self, once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  const wallAt = { x: WALL.x, y: y0 + 1.2, z: WALL.z - 0.1 }
  const face = Math.atan2(WALL.x - UP.x, -(WALL.z - UP.z)) * 180 / Math.PI
  once("clock", () => clip(ctx, CLOCK, 0.35, { x: -1.6, y: y0 + 0.8, z: -0.4 }))
  if (t < 5.6) { // asleep; the camera drifts down from the corner
    me.feetPosition = { x: BED.x, y: y0 + BED.y, z: BED.z }; me.rotation = { yaw: 0 }
    once("sleep", () => { me.anim.cut = { clip: "cdn/clip-sleep-loop.glb", weight: 4, loop: "loop" } })
    const u = ss(0, 5.6, t)
    ctx.view.camera = { eye: { x: lerp(0.9, 0.5, u), y: y0 + lerp(2.3, 1.9, u), z: lerp(-2.2, -1.5, u) }, aim: { x: BED.x, y: y0 + 0.7, z: BED.z }, fov: lerp(46, 40, u) }
  } else if (t < 11.2) { // awake, on the edge of the bed, listening; close and low, the wall soft behind
    me.feetPosition = { x: EDGE.x, y: y0, z: EDGE.z }; me.rotation = { yaw: lerp(90, 120, ss(8.6, 9.6, t)) }
    once("sit", () => { me.anim.cut = { clip: me.state?.look?.sex === "f" ? "cdn/clip-sit-female-loop.glb" : "cdn/clip-sit-loop.glb", weight: 4, loop: "loop" }; clip(ctx, GASP, 0.6); clip(ctx, BREATHF, 0.35) })
    const u = ss(5.6, 11.2, t)
    ctx.view.camera = t < 8.6
      ? { eye: { x: EDGE.x + 1.5, y: y0 + 0.95, z: EDGE.z - lerp(0.5, 0.35, u) }, aim: { x: EDGE.x, y: y0 + 0.95, z: EDGE.z }, fov: lerp(40, 34, u) }   // their face, side-on
      : { eye: { x: EDGE.x - 0.35, y: y0 + 1.25, z: EDGE.z - 0.55 }, aim: wallAt, fov: lerp(46, 38, ss(8.6, 11.2, t)) }                               // over their shoulder: the back wall
  } else { // up, a few steps, facing it
    const u = ss(11.2, 16, t)
    me.feetPosition = { x: lerp(EDGE.x, UP.x, ss(11.4, 12.6, t)), y: y0, z: UP.z }; me.rotation = { yaw: lerp(120, face, ss(12, 13.4, t)) }
    once("up", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }; clip(ctx, SWITCH, 0.5, { x: -1.6, y: y0 + 0.8, z: -0.4 }); lamp(ctx, 1) })
    ctx.view.camera = { eye: { x: 1.5, y: y0 + 1.45, z: lerp(2.05, 1.85, u) }, aim: { x: UP.x, y: y0 + lerp(1.1, 1.3, u), z: UP.z }, fov: lerp(42, 34, u) } // from beside the wall, back at them
  }
  // the lamp stutters, then dies; the knocks; the hum comes up under everything
  for (const [k, at, i] of [["l1", 3.4, 0.2], ["l2", 3.55, 1], ["l3", 4.2, 0.1], ["l4", 4.35, 1], ["l5", 5.3, 0]]) if (t > at) once(k, () => lamp(ctx, i))
  if (t > 5.2) once("k1", () => clip(ctx, KNOCK, 0.9, wallAt))
  if (t > 9.4) once("k2", () => clip(ctx, KNOCK, 0.6, wallAt))
  if (t > 8) once("buzz", () => clip(ctx, BUZZ, 0.3, wallAt))
  if (t > 11.4) once("steps", () => clip(ctx, STEPS, 0.4))
  if (t > 13) once("hum1", () => sound(ctx, "electric-hum-buzz-rising", 0.25))
  me.velocity = { x: 0, y: 0, z: 0 }
  return false
}

// returns true once the scene is over and the player has been sent on
export function cutTick(ctx, ses, st) {
  const raw = (ctx.now() - st.cut) / 1000, c = (ses.cut ??= { p0: { x: UP.x, y: ctx.self.feetPosition.y || 0, z: UP.z }, did: {} }), y0 = c.p0.y || 0
  // Shelly #: no Phoebe in the first scene (disabled). Phoebe half behind the headboard, watching them wake and wander; gone once the camera turns to the wall
  if (false && raw > 5.6 && raw < PRE + 6.5) { if (!c.phoebe) { c.phoebe = true; spawnPhoebe(ctx, "phoebe-intro", { x: -2.75, y: y0, z: 2.2 }, 40, PRE + 8); ctx.self.faded = { ...(ctx.self.faded || {}), "phoebe-intro": 0.55 } } }
  else if (raw >= PRE + 6.5 && !c.phoebeGone) { c.phoebeGone = true; dropPhoebe(ctx, "phoebe-intro") }
  if (raw < PRE) return bedTick(ctx, c, raw, y0)
  const t = raw - PRE
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  const me = ctx.self
  // the body: stand, wander over, stop, look, touch, lean, sink
  const walk = ss(1.5, 6.5, t)
  let x = lerp(c.p0.x, STAND.x, walk), z = lerp(c.p0.z, STAND.z, walk)
  const sink = ss(15.5, 19.5, t); z = lerp(z, WALL.z + 0.2, sink)
  me.feetPosition = { x, y: y0, z }
  me.velocity = { x: 0, y: 0, z: 0 }
  const face = Math.atan2(STAND.x - c.p0.x, -(STAND.z - c.p0.z)) * 180 / Math.PI
  me.rotation = { yaw: t < 1.5 ? 0 : t < 6.5 ? lerp(0, face, ss(1.5, 2.6, t)) : lerp(face, 180, ss(6.5, 7.6, t)) }
  once("idle0", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
  if (t > 1.5) once("walk", () => { me.anim.cut = { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop" }; clip(ctx, STEPS, 0.35) })
  if (t > 9.2) once("k3", () => clip(ctx, KNOCK, 1.0, { x: WALL.x, y: y0 + 1.2, z: WALL.z - 0.1 })) // one more, right under where their hand will go
  if (t > 6.5) once("stop", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
  if (t > 8.2) once("look", () => clip(ctx, BREATH, 0.5))
  if (t > 10) once("touch", () => { me.anim.cut = { clip: TOUCH, weight: 4, clampWhenFinished: true } })
  if (t > 13.4) once("glitch2", () => { me.anim.cut = { clip: "cdn/clip-hit-react.glb", weight: 4 } })
  if (t > 15.5) once("fall", () => { me.anim.cut = { clip: "cdn/clip-fall-loop.glb", weight: 4, loop: "loop" } })
  if (t > 18.6) once("gone", () => { me.hidden = [...(me.hidden || []).filter((i) => i !== me.id), me.id] })
  // the wall: a patch of yellow chevron wallpaper spreads out from under their palm, motes, a hum
  if (t > 10.6) once("bleed", () => {
    sound(ctx, "electric-hum-buzz-rising", 0.55)
    c.patch = ctx.spawn({ audience: "local", scope: "session", feetPosition: { x: WALL.x, y: y0 + 1.25, z: WALL.z - 0.012 }, rotation: 180, pivot: "center", scale: 0.05,
      primitive: { kind: "plane", width: 1.6, height: 2.4 }, material: { texture: "cdn/texture-aged-yellow-chevron-wallpaper-damp-stained.png", color: "#e8d27a", emissive: "#3a2c0a", emissiveIntensity: 0.25, transparent: true, opacity: 0.95, roughness: 0.9 } })
    animate(ctx, c.patch, { scale: [0.05, 0.3, 0.7] }, { duration: 6, easing: "easeInOutSine" })
    c.fx = ctx.spawn({ audience: "local", scope: "session", feetPosition: { x: WALL.x, y: y0 + 1.3, z: WALL.z - 0.05 }, rotation: { yaw: 0, pitch: 90 }, fx: { script: RIPPLE } })
  })
  if (t > 13.4) once("glitch", () => { sound(ctx, "static-burst-glitch", 0.7); ctx.emit("screenShake", { intensity: 0.15, duration: 0.6 }, { audience: { player: me.id } }) })
  if (t > 16) once("wind", () => sound(ctx, "deep-wind-rushing-fall", 0.8))
  if (t > 20.6) once("flash", () => { ctx.emit("screenFlash", { color: "#fff3b0", duration: 0.8, intensity: 1 }, { audience: { player: me.id } }); ctx.emit("screenShake", { intensity: 0.4, duration: 0.8 }, { audience: { player: me.id } }) })
  // the camera, five shots
  const head = { x, y: y0 + 1.15, z }, aimWall = { x: WALL.x, y: y0 + 1.3, z: WALL.z }
  let cam
  if (t < 6.5) { const u = t / 6.5; cam = { eye: { x: lerp(-2.5, -2.1, u), y: y0 + 0.9, z: lerp(-3.3, -2.9, u) }, aim: head, fov: 46 } }            // wide from the corner: the room, them wandering
  else if (t < 10) { const u = (t - 6.5) / 3.5; cam = { eye: { x: x - 0.9, y: y0 + 1.75, z: z - lerp(1.9, 1.6, u) }, aim: aimWall, fov: 44 } }   // over the shoulder: the wall
  else if (t < 15.5) { const u = (t - 10) / 5.5; cam = { eye: { x: -0.75, y: y0 + 1.3, z: lerp(1.25, 1.6, u) }, aim: { x: 1.0, y: y0 + 1.2, z: 2.3 }, fov: lerp(40, 30, u) } } // profile: the palm, the yellow spreading
  else if (t < 20.6) { const u = (t - 15.5) / 5.1; cam = { eye: { x: 0.55, y: y0 + 1.45, z: lerp(-0.6, 0.6, u) }, aim: aimWall, fov: lerp(56, 40, u) } } // behind: they sink in, we push after them
  else { const u = (t - 20.6) / (END - 20.6); cam = { eye: { x: 1.0, y: y0 + 1.3, z: lerp(0.8, 2.3, u) }, aim: aimWall, fov: lerp(40, 22, u) } }     // into the wallpaper
  ctx.view.camera = cam
  if (t < END) return false
  // over: clean up and send them through; the Level 0 fall (scripts/noclip.js) plays on arrival
  if (c.patch) ctx.destroy(c.patch); if (c.fx) ctx.destroy(c.fx)
  lamp(ctx, 1); me.anim.cut = null; me.hidden = (me.hidden || []).filter((i) => i !== me.id); ctx.view.camera = null
  st.noclipIn = ctx.now() - 600000; st.arrivePending = true; st.cut = null; ses.cut = null // the old 2D fall is skipped: scripts/lib/arrive-cut.js drops them through the Level 0 ceiling
  return true
}
