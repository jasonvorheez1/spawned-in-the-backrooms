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
const PRE = 10
const BED = { x: -1.95, y: 0.42, z: 0.75 } // places/intake ir-bed, on the mattress
const UP = { x: -0.85, z: 0.75 }          // beside the bed, where they stand up
const ss = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const lerp = (a, b, u) => a + (b - a) * u
function sound(ctx, n, v) { const p = ctx.self.feetPosition; ctx.emit("playSound", { clip: SND(n), position: { x: WALL.x, y: (p.y || 0) + 1.3, z: WALL.z - 0.3 }, volume: v, maxDistance: 30 }, { audience: { player: ctx.self.id } }) }

// the opening: a tuesday night, awake in bed, the hum starts behind the back wall; they get up and listen
function bedTick(ctx, c, t, y0) {
  const me = ctx.self, once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  const wall = { x: WALL.x, y: y0 + 1.3, z: WALL.z }
  if (t < 6.5) {
    me.feetPosition = { x: BED.x, y: y0 + BED.y, z: BED.z }; me.rotation = { yaw: 0 }
    once("sleep", () => { me.anim.cut = { clip: "cdn/clip-sleep-loop.glb", weight: 4, loop: "loop" } })
    const u = t / 6.5
    ctx.view.camera = { eye: { x: lerp(0.9, 0.6, u), y: y0 + lerp(2.3, 2.0, u), z: lerp(-2.2, -1.7, u) }, aim: { x: BED.x, y: y0 + 0.7, z: BED.z }, fov: 44 } // high in the corner, looking down at the bed
  } else {
    const u = (t - 6.5) / 3.5, face = Math.atan2(WALL.x - UP.x, -(WALL.z - UP.z)) * 180 / Math.PI
    me.feetPosition = { x: UP.x, y: y0, z: UP.z }; me.rotation = { yaw: lerp(90, face, ss(7.2, 8.4, t)) }
    once("up", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
    if (t > 8.4) once("point", () => { me.anim.cut = { clip: "cdn/clip-point.glb", weight: 4, clampWhenFinished: true } })
    ctx.view.camera = { eye: { x: 1.5, y: y0 + 1.45, z: lerp(2.05, 1.85, u) }, aim: { x: UP.x, y: y0 + lerp(1.1, 1.3, u), z: UP.z }, fov: lerp(42, 36, u) } // from beside the wall, back at them: they turn toward us
  }
  if (t > 2.6) once("hum1", () => sound(ctx, "electric-hum-buzz-rising", 0.22))
  if (t > 5.2) once("hum2", () => sound(ctx, "fluorescent-light-buzz-hum", 0.35))
  me.velocity = { x: 0, y: 0, z: 0 }
  return false
}

// returns true once the scene is over and the player has been sent on
export function cutTick(ctx, ses, st) {
  const raw = (ctx.now() - st.cut) / 1000, c = (ses.cut ??= { p0: { x: UP.x, y: ctx.self.feetPosition.y || 0, z: UP.z }, did: {} }), y0 = c.p0.y || 0
  // Phoebe half behind the headboard, watching them wake and wander; gone once the camera turns to the wall
  if (raw < PRE + 6.5) { if (!c.phoebe) { c.phoebe = true; spawnPhoebe(ctx, "phoebe-intro", { x: -2.75, y: y0, z: 2.2 }, 40, PRE + 8); ctx.self.faded = { ...(ctx.self.faded || {}), "phoebe-intro": 0.55 } } }
  else if (!c.phoebeGone) { c.phoebeGone = true; dropPhoebe(ctx, "phoebe-intro") }
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
  if (t > 1.5) once("walk", () => { me.anim.cut = { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop" } })
  if (t > 6.5) once("stop", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
  if (t > 8.2) once("look", () => { me.anim.cut = { clip: "cdn/clip-shrug.glb", weight: 4 } })
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
  me.anim.cut = null; me.hidden = (me.hidden || []).filter((i) => i !== me.id); ctx.view.camera = null
  st.noclipIn = ctx.now() - 600000; st.arrivePending = true; st.cut = null; ses.cut = null // the old 2D fall is skipped: scripts/lib/arrive-cut.js drops them through the Level 0 ceiling
  return true
}
