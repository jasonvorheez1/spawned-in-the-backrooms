// The arrival in Level 0 after the bedroom intro (johnadams2: "animations for dropping from the ceiling").
// Runs on the player's own machine from scripts/main-menu.js while state.arrive (a ctx.now() stamp) stands in places/main.
// ~18 s: the yellow fades off a ceiling tile, the tile shakes loose, they drop through it, slam into the damp carpet,
// sit there dazed, get up, look around at the halls, and the camera settles into their eyes. Then the tutorial starts.
import { animate } from "builtin/tween"
import { raycast } from "builtin/physics"
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const END = 18
const GASP = "/cdn/value.1f5d195f954552c9304c8d13f9177b97b62b100316d004215a918c9282445aad.mp3"   // Shelly's horror pack: Gasp.wav
const BREATHF = "/cdn/value.92bf175ed8ff7226b4ca07fa700883e57e814e1ef5cefa26e09a4a8eac38b2b6.mp3" // Breathing_fast.wav
const DUST = `fx
pop dust burst=40..55 on=disc(.35) life=.9..1.8 v=sdir()*(.6..1.6)+up(.3..0.7) size=.18..0.34 acc=drag(2.2)+buoy(.15) col=<.62,.55,.36> a=0>.45:.3>.6:.15>0 sz=$size*(.6>2.2) rot=spin(.3) r=sprite(smoke-puff,alpha)
pop fibers burst=18..26 on=disc(.25) life=.6..1.1 v=sdir()*(1..2.2)+up(1..2) size=.02..0.04 acc=grav()*.7+drag(1) col=<.7,.6,.35> a=1>.6:1>0 floor=stick r=sprite(soft-disc,alpha)`
const GRIT = `fx
pop grit rate=?mobile:14|28 on=disc(.28) life=.8..1.3 v=<0,-1,0>*(.4..1) size=.015..0.035 acc=grav()*.6 col=<.75,.7,.55> a=.9>.8:.9>0 r=sprite(soft-disc,alpha)`
const ss = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const lerp = (a, b, u) => a + (b - a) * u
function sound(ctx, n, v, at) { ctx.emit("playSound", { clip: SND(n), position: at, volume: v, maxDistance: 30 }, { audience: { player: ctx.self.id } }) }

export function arriveTick(ctx, ses, st) {
  const t = (ctx.now() - st.arrive) / 1000, me = ctx.self
  let c = ses.arr
  if (!c) {
    const p = me.feetPosition, hit = raycast(ctx, { x: p.x, y: p.y + 0.5, z: p.z }, { x: 0, y: 1, z: 0 }, { distance: 8, ignoreEntities: [me.id], physicsOnly: true })
    c = ses.arr = { p0: { x: p.x, y: p.y || 0, z: p.z }, ceil: hit ? hit.position.y : (p.y || 0) + 3, did: {}, yaw: me.rotation?.yaw ?? 0 }
  }
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  const { p0, ceil } = c, y0 = p0.y, yaw = c.yaw, rad = yaw * Math.PI / 180
  const fwd = { x: -Math.sin(rad), z: -Math.cos(rad) }, right = { x: Math.cos(rad), z: -Math.sin(rad) }
  const off = (f, r, y) => ({ x: p0.x + fwd.x * f + right.x * r, y: y0 + y, z: p0.z + fwd.z * f + right.z * r })
  const tileAt = { x: p0.x, y: ceil - 0.03, z: p0.z }
  // the body: hidden above the ceiling, then the drop (gravity curve), the slam, dazed on the floor, up, a look around
  const DROP0 = 3.6, DROP1 = 4.3
  let y = y0
  if (t < DROP0) y = ceil + 0.2
  else if (t < DROP1) { const u = (t - DROP0) / (DROP1 - DROP0); y = lerp(ceil - 0.6, y0, u * u) }
  me.feetPosition = { x: p0.x, y, z: p0.z }
  me.velocity = { x: 0, y: 0, z: 0 }
  const look = t < 11 ? 0 : Math.sin((t - 11) * 0.9) * 55 * (1 - ss(14.5, 16, t))
  me.rotation = { yaw: yaw + look }
  once("hide", () => { me.hidden = [...(me.hidden || []).filter((i) => i !== me.id), me.id] })
  if (t > DROP0) once("show", () => { me.hidden = (me.hidden || []).filter((i) => i !== me.id); me.anim.cut = { clip: "cdn/clip-fall-loop.glb", weight: 4, loop: "loop" } })
  if (t > DROP1) once("land", () => {
    me.anim.cut = { clip: "cdn/clip-land.glb", weight: 4, clampWhenFinished: true }
    sound(ctx, "heavy-impact-thud-boom", 1.0, { ...p0, y: y0 + 0.3 })
    ctx.emit("screenShake", { intensity: 0.55, duration: 0.7 }, { audience: { player: me.id } })
    ctx.emit("fx", { position: { ...p0, y: y0 + 0.05 }, script: DUST }, { audience: { player: me.id } })
  })
  if (t > 4.9) once("daze", () => { me.anim.cut = { clip: "cdn/clip-sit-floor-loop.glb", weight: 4, loop: "loop" } })
  if (t > 5.2) once("gasp", () => ctx.emit("playSound", { clip: GASP, position: { ...p0, y: y0 + 0.6 }, volume: 0.7 }, { audience: { player: me.id } }))
  if (t > 6.2) once("breath", () => ctx.emit("playSound", { clip: BREATHF, position: { ...p0, y: y0 + 0.6 }, volume: 0.45 }, { audience: { player: me.id } }))
  if (t > 8.6) once("stand", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
    if (t > 13.2) once("idle2", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
  // the ceiling tile: it rattles, grit sifts down, then it drops ahead of them and cracks on the carpet
  once("tile", () => {
    c.tile = ctx.spawn({ audience: "local", scope: "session", feetPosition: tileAt, pivot: "center", primitive: { kind: "box", width: 0.6, height: 0.025, depth: 0.6 }, material: { color: "#d9cfae", roughness: 0.95 } })
    sound(ctx, "fluorescent-light-buzz-hum", 0.55, { ...tileAt })
  })
  if (t > 1.8) once("rattle", () => {
    c.grit = ctx.spawn({ audience: "local", scope: "session", feetPosition: { ...tileAt, y: ceil - 0.08 }, fx: { script: GRIT } })
    sound(ctx, "static-burst-glitch", 0.6, tileAt)
    animate(ctx, c.tile, { "rotation.roll": [0, 3, -3, 4, -2, 5, 0] }, { duration: 1.6 })
  })
  if (t > 3.1) once("wind", () => sound(ctx, "deep-wind-rushing-fall", 0.9, tileAt))
  if (t > DROP0 - 0.15) once("tilefall", () => {
    if (c.grit) { ctx.destroy(c.grit); c.grit = null }
    const land = off(0.9, 0.5, 0.02)
    animate(ctx, c.tile, { "feetPosition.x": land.x, "feetPosition.y": land.y, "feetPosition.z": land.z, "rotation.pitch": 8, "rotation.roll": -6 }, { duration: 0.55, easing: "easeInQuad" })
  })
  // the camera, five shots
  let cam
  if (t < DROP0) { const u = t / DROP0; cam = { eye: off(2.4, 1.3, lerp(0.45, 0.6, u)), aim: { x: p0.x, y: ceil, z: p0.z }, fov: lerp(58, 46, u) } }             // flat on the carpet, looking up at one tile
  else if (t < 4.9) { cam = { eye: off(2.6, 1.6, 0.5), aim: { x: p0.x, y: lerp(ceil - 0.8, y0 + 0.8, ss(DROP0, DROP1, t)), z: p0.z }, fov: 52 } }              // the drop, the camera follows them down
  else if (t < 8.6) { const u = (t - 4.9) / 3.7; cam = { eye: off(lerp(1.7, 1.25, u), -0.35, 0.65), aim: off(0, 0, 0.6), fov: lerp(46, 38, u) } }           // dazed on the floor, slow push in
  else if (t < 14) { const u = (t - 8.6) / 5.4, a = rad + Math.PI * 0.85 + u * 1.6; cam = { eye: { x: p0.x + Math.sin(a) * 2.7, y: y0 + 1.8, z: p0.z + Math.cos(a) * 2.7 }, aim: off(0, 0, 1.2), fov: 55 } } // a slow orbit: the halls go on forever
  else { const u = ss(14, END - 0.4, t), a = rad + Math.PI * 0.85 + 1.6, eyeA = { x: p0.x + Math.sin(a) * 2.7, y: y0 + 1.8, z: p0.z + Math.cos(a) * 2.7 }, eyeB = off(0.15, 0, 1.6)
    cam = { eye: { x: lerp(eyeA.x, eyeB.x, u), y: lerp(eyeA.y, eyeB.y, u), z: lerp(eyeA.z, eyeB.z, u) }, aim: off(lerp(0, 6, u), 0, lerp(1.2, 1.55, u)), fov: lerp(55, 70, u) } } // into their eyes
  ctx.view.camera = cam
  if (t < END) return false
  if (c.tile) ctx.destroy(c.tile); if (c.grit) ctx.destroy(c.grit)
  me.anim.cut = null; me.hidden = (me.hidden || []).filter((i) => i !== me.id); ctx.view.camera = null
  st.arrive = null; ses.arr = null
  return true
}
