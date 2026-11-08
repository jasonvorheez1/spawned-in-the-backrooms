// The tutorial Level 0's cutscenes (johnadams2: "multiple cutscenes eg meeting an entity ... the final cutscene then
// transitions to the game name"). Runs on the player's own machine from scripts/main-menu.js in places/tutorial0.
// state.t0n = beats passed, state.t0cut = { id, at } while one plays; the frame and captions are scripts/cutscene-ui.js t0Ui.
import { animate } from "builtin/tween"
import { BEATS, SOFT, ENC, HALO, DRAWINGS, PACE } from "./tut0.js"
import { spawnPhoebe, dropPhoebe } from "./phoebe.js"
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const SMILER_MODEL = { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" } // scripts/smilers.js
export const LEN = { encounter: 16.5, smiler: 11, halogen: 6, drawings: 10, final: 23 }
const GASP = "/cdn/value.1f5d195f954552c9304c8d13f9177b97b62b100316d004215a918c9282445aad.mp3"   // Shelly's horror pack: Gasp.wav
const BREATHF = "/cdn/value.92bf175ed8ff7226b4ca07fa700883e57e814e1ef5cefa26e09a4a8eac38b2b6.mp3" // Breathing_fast.wav
const PHOEBE_WHISPER = `/cdn/voice-soft-breathy-young-woman-whispering-amused-saying-${encodeURIComponent("Found another one.")}.mp3`
const BREATH = "/cdn/value.60bf2d4498f8ed4068160ee05c1cfd064e645f3eb921729cf5a8fd3f1d127754.mp3"  // Breathing_slow.wav
function raw(ctx, ref, v, at) { ctx.emit("playSound", { clip: ref, position: at ?? ctx.self.feetPosition, volume: v, maxDistance: 400 }, { audience: { player: ctx.self.id } }) }
const ss = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const lerp = (a, b, u) => a + (b - a) * u
const L3 = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) })
const N = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3` // the new set (johnadams2, Nov 8: "new sounds, new music ... fantastic and horrifying")
const SCORE = "/cdn/moodboard-realistic-gritty/music-spawn-in-the-backrooms-title-awe-and-dread-choir-swell.mp3"
const LEG_MODEL = "/cdn/value.4aaf9c7c64978c958d23a7a8a6304f31accb3d391d52f3043893a6d990453b17.glb" // the game's own table leg (weapon-look.js)
const yawTo = (a, b) => Math.atan2(-(b.x - a.x), -(b.z - a.z)) * 180 / Math.PI
const fx1 = (ctx, name, p) => ctx.emit(name, p, { audience: { player: ctx.self.id } })
function snd(ctx, n, v, at) { ctx.emit("playSound", { clip: SND(n), position: at ?? ctx.self.feetPosition, volume: v, maxDistance: 40 }, { audience: { player: ctx.self.id } }) }
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
  const id = st.t0cut.id, t = (ctx.now() - st.t0cut.at) / 1000 / PACE
  const c = (ses.t0 ??= { p0: { x: p.x, y: p.y || 0, z: p.z }, yaw: me.rotation?.yaw ?? 0, did: {} })
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  if (id !== "final" || t < 3) { me.feetPosition = c.p0 }
  me.velocity = { x: 0, y: 0, z: 0 }
  if (CUE[id]) once("cue", () => raw(ctx, CUE[id], 0.75))
  const done = BEAT[id](ctx, c, t, once, st)
  if (!done) return true
  if (id === "halogen") { st.creating = false; st.sheetOpen = false }
  for (const k of ["smiler", "glint", "dust", "leg", "ent"]) if (c[k]) ctx.destroy(c[k]) // the knocked-down entity (c.ent) stays where it fell
  me.anim.cut = null; ctx.view.camera = null; me.hidden = (me.hidden || []).filter((i) => i !== me.id)
  st.t0n = (st.t0n ?? 0) + 1; st.t0cut = null; ses.t0 = null
  return id === "final" ? "level1" : true
}
// Shelly's horror pack (scripts/lib/data/sfx-library.yml), Nov 8: "the sounds are stupid as hell": the pack carries the tutorial
const H = { growl: "/cdn/value.eff7b4c4645715b8686565c6211d50b2b9e416267f58c3d912e5857768ad366a.mp3", grunt: "/cdn/value.d0066beac8550b339a3eec0d5532997fde8cf394856f8ad3041c909659bea09a.mp3", mbreath: "/cdn/value.783cfc4c74e9c314ae36d9305103e6e8794cf0493ca86f23facf3f4c10d25b1d.mp3", scream: "/cdn/value.e7a73d3533435fe19d5140141081aa76bfe425f66affd0fb7653cd9afc7a7844.mp3", sting1: "/cdn/value.3220d45eae556d4b712b075cd8f883e150c941f2fb8cfbd774f388eebe7c9432.mp3", sting2: "/cdn/value.8c4011cd8c3d14bfeff784df9c17be809b21b0beccfafbea8271a0bc409125bd.mp3", run: "/cdn/value.14f7bc36d15cfcd8449842041089164a319c2ca1ff4917294b7ed2156179b62f.mp3", flashoff: "/cdn/value.6d88ccc0b16b07ffd52f328835bad9d9bf3239d8146e88b2266ff673fbfbde94.mp3", buzz: "/cdn/value.eb34f5496883ceba559e80813abd255098c4a18b2f5d2dbcd6465447d4afa7f2.mp3" }
// each scene's own score, cut to its length (PACE-stretched seconds in the name)
const M = (n) => `/cdn/moodboard-realistic-gritty/music-${n}.mp3`
const CUE = { encounter: M("horror-film-cue-28-seconds-low-cello-drone-creeping-heartbeat-pulse-rising-strings-hit-at-17-seconds-then-frantic-chase-percussion"), smiler: M("horror-film-cue-19-seconds-near-silence-sub-drone-dissonant-piano-notes-swelling-to-a-scream-of-strings-cut-dead-at-16-seconds"), halogen: M("horror-film-cue-10-seconds-cold-analog-synth-hum-mechanical-ticking-ominous-low-brass"), drawings: M("horror-film-cue-17-seconds-music-box-melody-detuned-over-distant-hum-slow-and-sad") }
const GRIN_SVG = `<svg viewBox='0 0 100 60' width='0.9m' billboard='full'><g filter='drop-shadow(0 0 3px #fffbe8)'><ellipse cx='30' cy='14' rx='7' ry='4.5' fill='#f4f1e2'/><ellipse cx='70' cy='14' rx='7' ry='4.5' fill='#f4f1e2'/><path d='M10 30 Q50 64 90 30 Q50 45 10 30 Z' fill='#f4f1e2'/><path d='M20 34 L22 42 M30 37 L31 47 M40 39 L40 50 M50 40 L50 51 M60 39 L60 50 M70 37 L69 47 M80 34 L78 42' stroke='#17150f' stroke-width='1.8'/></g></svg>`
const BEAT = {
  // hall C: the panels die one by one from the far end toward them; in the black, a grin. It comes closer in jumps. The lights bang back on: nothing there
  smiler(ctx, c, t, once) {
    const me = ctx.self, x0 = c.p0.x, z = -28
    const p = { x: lerp(x0, x0 - 2.2, ss(4.2, 9, t)), y: 0, z: c.p0.z }
    me.feetPosition = p; me.rotation = { yaw: -90 }
    me.anim.cut = t > 4.2 && t < 9 ? { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop", speed: -0.6 } : { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }
    c.orig ??= {}
    ;[13, 12, 11, 10, 9].forEach((i, k) => { if (t > 0.7 + k * 0.6) once("die" + i, () => {
      const o = ctx.getObject(`t0-light-${i}`); if (o?.light) { c.orig[i] = o.light.intensity; o.light = { ...o.light, intensity: 0 } }
      raw(ctx, H.flashoff, 0.8, o?.feetPosition ?? p)
    }) })
    const spots = [[4.0, 13], [6.3, 7.5], [8.1, 3.6]] // [when, metres ahead of where they started]
    for (const [when, ahead] of spots) if (t > when) once("grin" + when, () => {
      if (c.smiler) ctx.destroy(c.smiler)
      c.smiler = ctx.spawn({ audience: "local", scope: "session", lifetime: 30, feetPosition: { x: x0 + ahead, y: 1.45, z }, vector: GRIN_SVG, children: [{ feetPosition: { x: 0, y: 0, z: 0 }, light: { kind: "point", color: "#fffbe8", intensity: 0.25, distance: 1.6 } }] })
      raw(ctx, (when < 5 ? H.mbreath : when > 8 ? H.sting2 : H.sting1), when < 5 ? 0.7 : 0.9, { x: x0 + ahead, y: 1.4, z })
      if (when > 5) fx1(ctx, "screenShake", { intensity: when > 8 ? 0.35 : 0.18, duration: 0.3 })
      if (when > 8) { raw(ctx, GASP, 0.8); fx1(ctx, "cameraPunch", { direction: { x: -1, y: 0, z: 0 }, intensity: 0.6 }) }
    })
    if (t > 5) once("breathf", () => raw(ctx, BREATHF, 0.6))
    if (t > 9.3) once("on", () => {
      if (c.smiler) { ctx.destroy(c.smiler); c.smiler = null }
      for (const [i, v] of Object.entries(c.orig)) { const o = ctx.getObject(`t0-light-${i}`); if (o?.light) o.light = { ...o.light, intensity: v } }
      raw(ctx, H.buzz, 1.0, p); fx1(ctx, "screenFlash", { color: "#fff6c8", duration: 0.2, intensity: 0.6 })
    })
    const head = { x: p.x, y: 1.6, z: p.z }
    ctx.view.camera = { eye: head, aim: { x: p.x + 10, y: 1.45, z }, fov: t < 4 ? 62 : lerp(62, 44, ss(4, 8.4, t)) }
    if (t > LEN.smiler) return true
    return false
  },
  // unarmed. something crawls out of hall C; they back into the corner; the broken desk; a leg on the floor; one swing; run
  encounter(ctx, c, t, once, st) {
    const me = ctx.self, cor = { x: ENC.corner.x, y: 0, z: ENC.corner.z }, legAt = { x: ENC.leg.x, y: 0.05, z: ENC.leg.z }
    const stop = { x: -0.9, z: -29.5 }, lunge = { x: -2.05, z: -29.85 }, out = { x: 6.5, y: 0, z: -28 }
    once("set", () => {
      c.leg = ctx.spawn({ audience: "local", scope: "session", feetPosition: legAt, rotation: { yaw: 70, roll: 90 }, model: LEG_MODEL, layout: { box: { min: { x: -0.04, y: 0, z: -0.04 }, max: { x: 0.04, y: 0.72, z: 0.04 } } } })
      for (const i of [7, 8]) { const o = ctx.getObject(`t0-light-${i}`); if (o?.light) o.light = { ...o.light, intensity: 1.2 } } // the bend goes dim
      raw(ctx, H.mbreath, 0.7, { x: ENC.from.x, y: 0.4, z: ENC.from.z })
    })
    // the entity: crawls in, stops short, lunges, gets hit, goes down
    if (t > 1.0) once("ent", () => {
      c.ent = ctx.spawn({ audience: "local", scope: "session", lifetime: 60, feetPosition: { x: ENC.from.x, y: 0, z: ENC.from.z }, rotation: 90, scale: 1.6, model: SMILER_MODEL, children: [{ feetPosition: { x: 0, y: 0.75, z: 0 }, light: { kind: "point", color: "#f4f1e6", intensity: 0.7, distance: 3 } }] })
      const e = ctx.getObject(c.ent); if (e) e.anim.body = { clip: "cdn/clip-crouch-walk-loop.glb", loop: "loop", weight: 1 }
    })
    const E = c.ent && ctx.getObject(c.ent)
    if (E && t < 10.2) {
      const a = t < 7 ? L3({ x: ENC.from.x, y: 0, z: ENC.from.z }, { x: stop.x, y: 0, z: stop.z }, ss(1.0, 7, t)) : L3({ x: stop.x, y: 0, z: stop.z }, { x: lunge.x, y: 0, z: lunge.z }, ss(9.3, 10.2, t))
      E.feetPosition = a; E.rotation = { yaw: yawTo(a, cor) + 90 } // the model faces +x
    }
    if (t > 2.4) once("snarl", () => { raw(ctx, H.growl, 0.9, { x: 2, y: 1, z: -28.3 }); raw(ctx, BREATHF, 0.55) })
    // they: back away into the corner, eyes on it
    if (t < 6.4) { const u = ss(2.6, 6.2, t); me.feetPosition = { x: lerp(c.p0.x, cor.x, u), y: 0, z: lerp(c.p0.z, cor.z, u) }; me.anim.cut = u > 0 && u < 1 ? { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop", speed: -0.7 } : { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } }
    else if (t < 13) me.feetPosition = cor
    if (t < 12.2) me.rotation = { yaw: yawTo(me.feetPosition, E?.feetPosition ?? { x: ENC.from.x, z: ENC.from.z }) }
    if (t > 6.2) once("bump", () => { snd(ctx, "wooden-chair-creak-scrape", 0.7); raw(ctx, GASP, 0.6); fx1(ctx, "screenShake", { intensity: 0.15, duration: 0.25 }) })
    if (t > 7.6) once("grab", () => { me.anim.cut = { clip: "cdn/clip-pickup.glb", weight: 4 }; raw(ctx, N("wooden-table-leg-snap-break"), 0.9, legAt) })
    if (t > 8.4) once("hold", () => {
      if (c.leg) { ctx.destroy(c.leg); c.leg = null }
      const list = String(st.weapons ?? "").split(",").filter(Boolean); if (!list.includes("table_leg")) list.push("table_leg")
      st.weapons = list.join(","); st.equipped = "table_leg"; st.cnd_table_leg ??= 55 // splintered, but it swings
      me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }
    })
    if (t > 9.3) once("lunge", () => { raw(ctx, H.growl, 1.0, { x: lunge.x, y: 1, z: lunge.z }); const e = ctx.getObject(c.ent); if (e) e.anim.body = { clip: "cdn/clip-run-loop.glb", loop: "loop", weight: 1 } })
    if (t > 9.0) once("windup", () => { raw(ctx, BREATHF, 0.8); fx1(ctx, "slowMo", { scale: 0.5, duration: 0.6 }) })
    if (t > 9.75) once("swing", () => { me.anim.cut = { clip: "cdn/clip-attack.glb", weight: 4 }; snd(ctx, "sword-whoosh-swing", 0.6) })
    if (t > 10.2) once("hit", () => {
      const hit = { x: lunge.x, y: 1.0, z: lunge.z }
      raw(ctx, H.sting1, 1.0, hit)
      
      fx1(ctx, "hitstop", { duration: 0.12 }); fx1(ctx, "slowMo", { scale: 0.3, duration: 1.1 })
      fx1(ctx, "cameraPunch", { direction: { x: 0.6, y: 0, z: 0.3 }, intensity: 1.0 }); fx1(ctx, "screenShake", { intensity: 0.4, duration: 0.4 }) // it barely notices
      fx1(ctx, "squash", { target: c.ent, axis: "x", intensity: 0.35, duration: 0.3 })
      ctx.emit("fx", { position: hit, script: `fx
pop dust burst=18..26 life=.5..0.9 v=sdir()*(1..2.4)+up(.6) size=.05..0.11 acc=grav()*.5+drag(1.5) col=<.55,.5,.4> a=1>.6:1>0 sz=$size r=sprite(soft-disc,alpha)
pop chips burst=8..12 life=.6..1 v=sdir()*(2..3.5)+up(1) size=.02..0.04 acc=grav()+drag(.6) col=<.35,.24,.14> a=1 sz=$size floor=stick r=sprite(stalk,alpha,velocity,.02)` }, { audience: { player: me.id } })
      const e = ctx.getObject(c.ent)
      if (e) { e.anim.body = { clip: "cdn/clip-crouch-walk-loop.glb", loop: "loop", weight: 1 }; animate(ctx, c.ent, { "feetPosition.x": lunge.x + 0.9, "feetPosition.z": lunge.z + 0.4 }, { duration: 0.5, easing: "easeOutCubic" }) } // a stagger, not a kill
    })
    if (t > 11.0) once("fall", () => { raw(ctx, H.grunt, 0.9, { x: lunge.x + 1, y: 0.2, z: lunge.z }); fx1(ctx, "screenShake", { intensity: 0.2, duration: 0.3 }); const e = ctx.getObject(c.ent); const l = e?.children?.[0]; if (l?.light) l.light = { ...l.light, intensity: 0.15 } })
    if (t > 12.0) once("rise", () => { raw(ctx, H.growl, 1.0, { x: lunge.x + 0.9, y: 1, z: lunge.z + 0.4 }); fx1(ctx, "screenShake", { intensity: 0.25, duration: 0.4 }); const e = ctx.getObject(c.ent); if (e) e.anim.body = { clip: "cdn/clip-run-loop.glb", loop: "loop", weight: 1 } })
    if (E && t > 12.4) { const q = me.feetPosition, a = L3({ x: lunge.x + 0.9, y: 0, z: lunge.z + 0.4 }, { x: q.x - 1.7, y: 0, z: q.z }, ss(12.4, 16.2, t)); E.feetPosition = a; E.rotation = { yaw: yawTo(a, q) + 90 } } // right behind them the whole way out
    if (t > 14.5) once("breath", () => raw(ctx, BREATHF, 0.7))
    // and run: past it, out the east door into hall C
    if (t > 13) {
      const u = ss(13, 16.2, t), mid = { x: 0.6, y: 0, z: -28.4 }
      me.feetPosition = u < 0.5 ? L3(cor, mid, u * 2) : L3(mid, out, (u - 0.5) * 2)
      me.rotation = { yaw: yawTo(me.feetPosition, out) }
      once("run", () => { me.anim.cut = { clip: "cdn/clip-run-loop.glb", weight: 4, loop: "loop" }; raw(ctx, H.run, 0.8) })
    }
    // the camera
    const eFoot = E?.feetPosition ?? { x: ENC.from.x, y: 0, z: ENC.from.z }, eHead = { x: eFoot.x, y: 0.75, z: eFoot.z }
    if (t < 2.6) ctx.view.camera = { eye: { x: c.p0.x, y: 1.62, z: c.p0.z }, aim: L3({ x: c.p0.x, y: 1.5, z: c.p0.z - 4 }, { x: 6, y: 1.0, z: -28 }, ss(0.4, 2.2, t)), fov: lerp(70, 40, ss(1, 2.6, t)) } // their eyes find the doorway
    else if (t < 6.4) ctx.view.camera = { eye: { x: -3.75, y: 1.15, z: -30.75 }, aim: L3({ x: c.p0.x, y: 1.2, z: c.p0.z }, eHead, ss(2.6, 5.4, t)), fov: 52 } // from the corner they're backing into
    else if (t < 8.6) { const hd = { x: cor.x + 0.1, y: 1.55, z: cor.z + 0.1 }; ctx.view.camera = { eye: hd, aim: L3(eHead, legAt, ss(6.5, 7.3, t)), fov: lerp(55, 38, ss(6.5, 7.3, t)) } } // the leg on the floor
    else if (t < 11.6) ctx.view.camera = { eye: { x: 0.9, y: 1.35, z: -30.7 }, aim: L3({ x: cor.x, y: 1.1, z: cor.z }, { x: lunge.x, y: 0.9, z: lunge.z }, ss(9, 10.2, t)), fov: lerp(46, 34, ss(9.4, 10.3, t)) } // side on: the lunge, the swing
    else if (t < 13) ctx.view.camera = { eye: { x: cor.x + 0.2, y: 1.6, z: cor.z + 0.1 }, aim: { x: lunge.x + 1.1, y: 0.15, z: lunge.z + 0.5 }, fov: 50 } // it's down
    else { const p = me.feetPosition; ctx.view.camera = { eye: { x: p.x - 1.4, y: 1.7, z: p.z - 0.6 }, aim: { x: p.x + 4, y: 1.3, z: p.z + 0.2 }, fov: 72 } }
    if (t > LEN.encounter) { me.feetPosition = out; me.rotation = { yaw: -90 }; return true }
    return false
  },
  // room D: the Backrooms Robotics HALOGEN issue machine, still powered; an arm in the port, a clamp, a unit on the wrist, the sheet
  halogen(ctx, c, t, once, st) {
    const me = ctx.self, scr = { x: HALO.x - 0.35, y: 1.55, z: HALO.z }, port = { x: HALO.x - 0.35, y: 1.05, z: HALO.z }, sp = { x: HALO.stand.x, y: 0, z: HALO.stand.z }
    me.feetPosition = L3({ x: c.p0.x, y: 0, z: c.p0.z }, sp, ss(0, 1.6, t)); me.rotation = { yaw: -90 }
    if (t < 1.6) me.anim.cut = { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop" }
    once("power", () => {
      raw(ctx, N("old-machine-power-up-crt-whine-relay-clunk"), 0.9, scr)
      const m = ctx.getObject("t0-halogen"); if (m) m.state = { ...(m.state || {}), on: true }
      c.glint = ctx.spawn({ audience: "local", scope: "session", feetPosition: { x: HALO.x - 0.6, y: 1.4, z: HALO.z }, light: { kind: "point", color: "#ffb347", intensity: 0, distance: 3.5 } })
      animate(ctx, c.glint, { "light.intensity": 2.2 }, { duration: 1.6, easing: "easeInQuad" })
    })
    if (t > 1.7) once("arm", () => { me.anim.cut = { clip: "cdn/clip-cast.glb", weight: 4 } })
    if (t > 2.6) once("clamp", () => { raw(ctx, N("servo-clamp-lock-wrist-hiss"), 1.0, port); fx1(ctx, "screenShake", { intensity: 0.18, duration: 0.3 }); fx1(ctx, "screenFlash", { color: "#ffb347", duration: 0.25, intensity: 0.35 }) })
    if (t > 3.6) once("open", () => { snd(ctx, "wrist-device-raise-click-crt-power-on", 0.8); st.creating = true; st.sheetOpen = true; me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
    if (t < 1.6) ctx.view.camera = { eye: { x: 43.2, y: 1.7, z: -25.2 }, aim: L3({ x: 46, y: 1.3, z: -27.5 }, scr, ss(0, 1.6, t)), fov: 55 } // the machine across the room
    else if (t < 2.5) ctx.view.camera = { eye: { x: HALO.x - 1.2, y: 1.5, z: HALO.z + 0.7 }, aim: scr, fov: 30 } // the screen wakes
    else ctx.view.camera = { eye: { x: HALO.x - 1.0, y: 1.3, z: HALO.z - 0.85 }, aim: port, fov: lerp(40, 30, ss(2.5, 3.6, t)) } // the arm in the port
    return t > 4 && !st.sheetOpen
  },
  // corridor E: someone came through before them and left notes the whole way down
  drawings(ctx, c, t, once) {
    const me = ctx.self, at = (n) => { const d = DRAWINGS.find((r) => r[0] === n); return { x: d[1], y: 1.45, z: d[2] } }
    me.rotation = { yaw: 180 }; me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }
    for (const [k, when] of [["p1", 0.3], ["p2", 3], ["p3", 5.6]]) if (t > when) once(k, () => raw(ctx, N("paper-flutter-taped-note"), 0.6))
    const eye = { x: 44, y: 1.6, z: lerp(c.p0.z, -15, ss(0, 8, t)) }
    let aim, fov = 42
    if (t < 2.8) aim = at(2)
    else if (t < 5.4) aim = L3(at(2), at(1), ss(2.8, 3.6, t))
    else if (t < 7.6) aim = L3(at(1), at(3), ss(5.4, 6.2, t))
    else { aim = L3(at(3), at(4), ss(7.6, 8.6, t)); fov = lerp(42, 16, ss(7.8, 9.4, t)) } // all the way down the hall to the last one, over the wet spot
    ctx.view.camera = { eye, aim, fov }
    if (t > LEN.drawings) { me.feetPosition = { x: 44, y: 0, z: -15 }; return true }
    return false
  },
  // the far wall of room F won't sit still: Phoebe watches from the corridor mouth, they turn back, walk into the wallpaper and through it
  final(ctx, c, t, once, st) {
    const me = ctx.self, at = { x: SOFT.x, y: 0, z: SOFT.z }, her = { x: 45.55, y: 1.15, z: -23.35 }, S = 5.2 // the walk starts
    const wall = { x: 45, y: 1.35, z: 4 }, past = { x: 45, y: 0, z: 4.6 }
    if (t < S) me.feetPosition = { x: lerp(c.p0.x, at.x, ss(0, 0.8, t)), y: 0, z: lerp(c.p0.z, at.z, ss(0, 0.8, t)) }
    else me.feetPosition = L3(at, past, ss(S, S + 3.0, t))
    me.rotation = { yaw: 180 } // eyes on the wall the whole time: they never know she's there
    once("phoebe", () => {
      spawnPhoebe(ctx, "phoebe-end", { x: her.x, y: 0, z: her.z }, 180, 11 * PACE) // half of her round the corridor mouth's east corner, the rest behind the wall, watching
      for (const [i, v] of [[18, 0.15], [19, 0.6], [20, 0.6]]) { const o = ctx.getObject(`t0-light-${i}`); if (o?.light) o.light = { ...o.light, intensity: v } }
      const h = ctx.getObject("t0-light-17"); if (h?.light) h.light = { ...h.light, intensity: 9 } // the lamp behind her burns: a shape, no face
    })
    if (t > 4.9) once("phoebeGone", () => dropPhoebe(ctx, "phoebe-end")) // gone in the cut, never seen leaving
    once("hum", () => { raw(ctx, H.buzz, 0.7, wall); me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
    if (t > 2.0) once("breath", () => raw(ctx, BREATH, 0.5))
    if (t > 3.0) once("whisper", () => raw(ctx, PHOEBE_WHISPER, 0.5, her)) // under the hum, from down the hall
    if (t > 4.2) once("groan", () => snd(ctx, "deep-rumble-groan", 0.8))
    if (t > S) once("walk", () => { me.anim.cut = { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop", speed: 0.8 } })
    if (t > S + 2.2) once("score", () => raw(ctx, SCORE, 1.0)) // the score comes up as they touch the wall and carries the fall and the title
    if (t > S + 2.4) once("through", () => {
      raw(ctx, H.sting2, 1.0, wall); raw(ctx, GASP, 0.8)
      fx1(ctx, "screenFlash", { color: "#fffbe0", duration: 0.35, intensity: 0.7 }); fx1(ctx, "screenShake", { intensity: 0.35, duration: 1.2 })
      fx1(ctx, "shockwave", { position: wall, speed: 6, thickness: 0.5, intensity: 0.7 })
    })
    if (t > S + 2.7) once("gone", () => { me.hidden = [...(me.hidden || []), me.id]; raw(ctx, H.scream, 0.35) })
    if (t > S + 6.2) once("thud", () => snd(ctx, "heavy-impact-thud-boom", 0.7))
    if (t > 13.4) once("title", () => raw(ctx, N("title-reveal-massive-reverse-swell-boom"), 1.0)) // lands with the name (cutscene-ui: 13.7 s)
    if (t < 2) { const u = ss(0, 2, t); ctx.view.camera = { eye: { x: at.x + 0.4, y: 1.6, z: at.z + 0.6 }, aim: wall, fov: lerp(55, 32, u) } } // the wallpaper ahead, crawling
    else if (t < S) { const u = ss(2, S, t); ctx.view.camera = { eye: { x: 44.2, y: 1.5, z: 2.8 }, aim: L3({ x: 44.9, y: 1.45, z: -4 }, { x: 44.95, y: 1.4, z: -12 }, u), fov: lerp(46, 36, u) } } // from the wall: their face, oblivious, and far up the hall behind them half a shape round the corner
    else { const p = me.feetPosition, k = ss(S + 2.7, S + 3.4, t); ctx.view.camera = { eye: { x: at.x + 0.5, y: 1.75, z: lerp(Math.min(p.z - 2.2, 1.6), 4.4, k) }, aim: { x: wall.x, y: wall.y, z: wall.z + 1 }, fov: lerp(50, 80, k) } } // behind them as they press in, then the lens goes through after them
    if (t > LEN.final) { st.t0Done = true; st.t0fade = ctx.now(); return true }
    return false
  },
}
