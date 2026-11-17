// The tutorial Level 0's cutscenes (johnadams2: "multiple cutscenes eg meeting an entity ... the final cutscene then
// transitions to the game name"). Runs on the player's own machine from scripts/main-menu.js in places/tutorial0.
// state.t0n = beats passed, state.t0cut = { id, at } while one plays; the frame and captions are scripts/cutscene-ui.js t0Ui.
import { animate } from "builtin/tween"
import { BEATS, SOFT, ENC, HALO, PACE } from "./tut0.js"
import { dinaLead } from "./dina-quest.js"
import { spawnPhoebe, dropPhoebe } from "./phoebe.js"
import { noStory } from "./run-opts.js"
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const SMILER_MODEL = { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" } // scripts/smilers.js
export const LEN = { encounter: 20.7, final: 10.8 } // Shelly Nov 16: the cut ends once the name is fully up (12 s); the card then holds through the crossing (cutscene-ui t0Fade)
const GASP = "/cdn/value.1f5d195f954552c9304c8d13f9177b97b62b100316d004215a918c9282445aad.mp3"   // johnadams2 (Nov 9): "the cutscenes feel like bootleg mobile games": every shot is held by a person, never a tripod.
// Savi's picks: a slow breathing drift (~1.5 cm at the eye, ~0.35 deg of aim) made of three sines, so no two seconds repeat
const wob = (t, s) => Math.sin(t * 0.83 + s) * 0.6 + Math.sin(t * 2.1 + s * 2.3) * 0.3 + Math.sin(t * 4.7 + s * 3.7) * 0.1
function handheld(ctx, t) {
  const cam = ctx.view.camera
  if (!cam?.eye || !cam.aim || typeof cam.aim !== "object" || cam.aim.x == null) return
  const e = cam.eye, a = cam.aim, d = Math.hypot(a.x - e.x, a.y - e.y, a.z - e.z) || 1, k = d * 0.006
  ctx.view.camera = { ...cam, eye: { x: e.x + wob(t, 1) * 0.012, y: e.y + wob(t, 2) * 0.009, z: e.z + wob(t, 3) * 0.012 }, aim: { x: a.x + wob(t, 4) * k, y: a.y + wob(t, 5) * k * 0.7, z: a.z + wob(t, 6) * k } }
}
// Shelly's horror pack: Gasp.wav
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
const inBeat = (b, p) => b.circle ? Math.hypot(p.x - b.circle.x, p.z - b.circle.z) < b.circle.r * 0.8 : p.x > b.box[0] && p.x < b.box[1] && p.z > b.box[2] && p.z < b.box[3]

// true while a cutscene owns the player
export function t0Tick(ctx, ses, st) {
  const me = ctx.self, p = me.feetPosition
  if (!st.t0cut) {
    const b = BEATS[st.t0n ?? 0]
    if (!b || b.interactive || !inBeat(b, p)) return false
    if (b.id === "smiler") { walkHall(ctx, ses, st, p); return false }
    if (b.id === "drawings") { st.t0n = 4; return false }
    st.t0cut = { id: b.id, at: ctx.now() }; ses.t0 = null
  }
  const id = st.t0cut.id, t = (ctx.now() - st.t0cut.at) / 1000 / PACE
  const c = (ses.t0 ??= { p0: { x: p.x, y: p.y || 0, z: p.z }, yaw: me.rotation?.yaw ?? 0, did: {} })
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  if (id !== "final" || t < 3) { me.feetPosition = c.p0 }
  me.velocity = { x: 0, y: 0, z: 0 }
  if (CUE[id] && (id !== "encounter" || t >= 4.2)) once("cue", () => raw(ctx, CUE[id], 0.75)) // the encounter's score waits out the radio call
  const done = BEAT[id]?.(ctx, c, t, once, st) ?? true // an old room may still be playing a retired cut
  handheld(ctx, t)
  if (!done) return true
  if (id === "halogen") me.bones.RightHand.reach = null
  if (id === "halogen") { st.creating = false; st.sheetOpen = false; if (!noStory(st)) dinaLead(ctx, st) }
  if (id === "smiler") hallLights(ctx, false)
  for (const k of ["smiler", "glint", "dust", "leg", "ent"]) if (c[k]) ctx.destroy(c[k])
  me.anim.cut = null; ctx.view.camera = null; me.hidden = (me.hidden || []).filter((i) => i !== me.id)
  st.t0n = (st.t0n ?? 0) + 1; st.t0cut = null; ses.t0 = null
  return id === "final" ? "level1" : true
}
// Shelly's horror pack (scripts/lib/data/sfx-library.yml), Nov 8: "the sounds are stupid as hell": the pack carries the tutorial
const H = { snap: "/cdn/value.d2518fac095f995e2626438e4d8f582ed04878e448ed62ddd2e45c89e704aa57.mp3", scrape: "/cdn/value.77203ab709373e37101914a819bdb0c3c22ef5f8e40e1211d5e1e1605e64085d.mp3", moan: "/cdn/value.c3763d37a43bab87a54590b4a584b45f56ce2ecf25f4eb2c5e3d645da318cbe3.mp3", rhiss: "/cdn/value.5ff97cbae7433fbe0550c6a16411314a7c725c995893b7e33dbd5ce593baf17e.mp3", switch: "/cdn/value.30ab43703195a3d308cce6e2ea7b32a92438c9e3dff74eb60205f5b9442e02d8.mp3", doom: "/cdn/value.ce9496b9dbf80ca37ab231135330442e462480dc39cf020f0d3e654e12e13361.mp3", slowst: "/cdn/value.e41c59fc8a105919b1a1c930c25409968c1f2d41422ddc584c5625d034e0be64.mp3", cresc: "/cdn/value.d1ae3ebefefdf17be753a4c379970ea2fe9b63f0de9e0797195e92a0c4bc6743.mp3", twang: "/cdn/value.5c93f7a5f22a8eea6e6327bc6710a6be6d1551eb393575c54c144d2b2fdfe908.mp3", growl: "/cdn/value.eff7b4c4645715b8686565c6211d50b2b9e416267f58c3d912e5857768ad366a.mp3", grunt: "/cdn/value.d0066beac8550b339a3eec0d5532997fde8cf394856f8ad3041c909659bea09a.mp3", mbreath: "/cdn/value.783cfc4c74e9c314ae36d9305103e6e8794cf0493ca86f23facf3f4c10d25b1d.mp3", scream: "/cdn/value.e7a73d3533435fe19d5140141081aa76bfe425f66affd0fb7653cd9afc7a7844.mp3", sting1: "/cdn/value.3220d45eae556d4b712b075cd8f883e150c941f2fb8cfbd774f388eebe7c9432.mp3", sting2: "/cdn/value.8c4011cd8c3d14bfeff784df9c17be809b21b0beccfafbea8271a0bc409125bd.mp3", run: "/cdn/value.14f7bc36d15cfcd8449842041089164a319c2ca1ff4917294b7ed2156179b62f.mp3", flashoff: "/cdn/value.6d88ccc0b16b07ffd52f328835bad9d9bf3239d8146e88b2266ff673fbfbde94.mp3", buzz: "/cdn/value.eb34f5496883ceba559e80813abd255098c4a18b2f5d2dbcd6465447d4afa7f2.mp3" }
// Each remaining scene has a score cut to its PACE-stretched length.
const M = (n) => `/cdn/moodboard-realistic-gritty/music-${n}.mp3`
const CUE = { encounter: M("horror-film-cue-28-seconds-low-cello-drone-creeping-heartbeat-pulse-rising-strings-hit-at-17-seconds-then-frantic-chase-percussion"), halogen: M("horror-film-cue-10-seconds-cold-analog-synth-hum-mechanical-ticking-ominous-low-brass") }
const GRIN_SVG = `<svg viewBox='0 0 100 60' width='0.9m' billboard='full'><g filter='drop-shadow(0 0 3px #fffbe8)'><ellipse cx='30' cy='14' rx='7' ry='4.5' fill='#f4f1e2'/><ellipse cx='70' cy='14' rx='7' ry='4.5' fill='#f4f1e2'/><path d='M10 30 Q50 64 90 30 Q50 45 10 30 Z' fill='#f4f1e2'/><path d='M20 34 L22 42 M30 37 L31 47 M40 39 L40 50 M50 40 L50 51 M60 39 L60 50 M70 37 L69 47 M80 34 L78 42' stroke='#17150f' stroke-width='1.8'/></g></svg>`
function hallLights(ctx, dark) {
  for (const i of [9, 10, 11, 12, 13]) {
    const o = ctx.getObject(`t0-light-${i}`)
    if (o?.light) o.light = { ...o.light, intensity: dark ? (i % 2 ? 0.26 : 0.08) : 5 }
  }
  const panels = ctx.getObject("tut0-hallpanels")
  if (panels?.material) panels.material = { ...panels.material, emissiveIntensity: dark ? 0.1 : 2.4 }
}

function walkHall(ctx, ses, st, p) {
  const hall = (ses.t0Hall ??= {})
  if (p.x >= 36) {
    if (hall.grin && ctx.getObject(hall.grin)) ctx.destroy(hall.grin)
    hallLights(ctx, false)
    raw(ctx, H.buzz, 0.65, p)
    ses.t0Hall = null
    st.t0n = 2
    return
  }
  if (!hall.dark) {
    hall.dark = true
    hallLights(ctx, true)
    raw(ctx, H.flashoff, 0.8, p)
  }
  if (p.x >= 22 && !hall.warned) {
    hall.warned = true
    const quiet = st.crouch && !st.light
    const pos = { x: quiet ? 34 : Math.min(36, p.x + 5.5), y: 1.45, z: -28.2 }
    hall.grin = ctx.spawn({ audience: "local", scope: "session", lifetime: 5, feetPosition: pos, vector: GRIN_SVG })
    raw(ctx, quiet ? H.mbreath : H.sting1, quiet ? 0.42 : 0.7, pos)
  }
}

const BEAT = {
  // unarmed. something crawls out of hall C; they back into the corner; the broken desk; a leg on the floor; one swing; run
  encounter(ctx, c, t, once, st) {
    // Shelly Nov 17: "new context". Before anything moves: a walkie on the floor of hall C, a tired man's last call, then static,
    // and the shape slumped beside it, which you took for him, lifts its head. Then the old beats, 4.2 s later.
    const PRE = 4.2
    if (t < PRE) {
      const me = ctx.self, from = { x: ENC.from.x, y: 0, z: ENC.from.z }
      me.feetPosition = { x: c.p0.x, y: 0, z: c.p0.z }; me.rotation = { yaw: yawTo(c.p0, from) }
      once("pre", () => {
        me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }
        for (const i of [7, 8]) { const o = ctx.getObject(`t0-light-${i}`); if (o?.light) o.light = { ...o.light, intensity: 1.2 } }
        c.ent = ctx.spawn({ audience: "local", scope: "session", lifetime: 60, feetPosition: from, rotation: 90, scale: 1.6, model: SMILER_MODEL, children: [{ feetPosition: { x: 0, y: 0.75, z: 0 }, light: { kind: "point", color: "#f4f1e6", intensity: 0, distance: 3 } }] })
        const e = ctx.getObject(c.ent); if (e) e.anim.body = { clip: "cdn/clip-crouch-idle-loop.glb", loop: "loop", weight: 1 }
        raw(ctx, `/cdn/voice-tired-hoarse-man-on-a-crackling-walkie-talkie-saying-${encodeURIComponent("Anyone on this channel... if you can hear me, don't go toward the lights.")}.mp3`, 0.85, { x: from.x - 0.6, y: 0.2, z: from.z })
      })
      if (t > 3.3) once("static", () => {
        raw(ctx, "/cdn/moodboard-realistic-gritty/sfx-walkie-talkie-squelch-cutting-to-dead-static.mp3", 0.7, { x: from.x - 0.6, y: 0.2, z: from.z })
        const l = ctx.getObject(c.ent)?.children?.[0]; if (l?.light) l.light = { ...l.light, intensity: 0.7 } // its face catches the light
      })
      if (t < 2.4) ctx.view.camera = { eye: { x: c.p0.x - 0.35, y: 1.55, z: c.p0.z + 0.6 }, aim: { x: from.x, y: 0.5, z: from.z }, fov: 50 - 8 * ss(0, 2.4, t), cut: t < 0.05 }
      else ctx.view.camera = { eye: { x: from.x - 2.2, y: 0.55, z: from.z + 0.9 }, aim: { x: from.x, y: 0.75, z: from.z }, fov: 38 - 6 * ss(2.4, PRE, t) } // low on the floor: the walkie, then it
      return false
    }
    t -= PRE
    const me = ctx.self, cor = { x: ENC.corner.x, y: 0, z: ENC.corner.z }, legAt = { x: ENC.leg.x, y: 0.05, z: ENC.leg.z }
    const stop = { x: -0.9, z: -29.5 }, lunge = { x: -2.05, z: -29.85 }, out = { x: 6.5, y: 0, z: -28 }
    once("set", () => {
      c.leg = ctx.spawn({ audience: "local", scope: "session", feetPosition: legAt, rotation: { yaw: 70, roll: 90 }, model: LEG_MODEL, layout: { box: { min: { x: -0.04, y: 0, z: -0.04 }, max: { x: 0.04, y: 0.72, z: 0.04 } } } })
      for (const i of [7, 8]) { const o = ctx.getObject(`t0-light-${i}`); if (o?.light) o.light = { ...o.light, intensity: 1.2 } } // the bend goes dim
      raw(ctx, H.mbreath, 0.7, { x: ENC.from.x, y: 0.4, z: ENC.from.z })
    })
    // the entity: crawls in, stops short, lunges, gets hit, goes down
    if (t > 1.0) once("ent", () => {
      c.ent ??= ctx.spawn({ audience: "local", scope: "session", lifetime: 60, feetPosition: { x: ENC.from.x, y: 0, z: ENC.from.z }, rotation: 90, scale: 1.6, model: SMILER_MODEL, children: [{ feetPosition: { x: 0, y: 0.75, z: 0 }, light: { kind: "point", color: "#f4f1e6", intensity: 0.7, distance: 3 } }] })
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
    if (t > 6.2) once("bump", () => { raw(ctx, H.scrape, 0.6); raw(ctx, GASP, 0.6); fx1(ctx, "screenShake", { intensity: 0.15, duration: 0.25 }) })
    if (t > 7.6) once("grab", () => { me.anim.cut = { clip: "cdn/clip-pickup.glb", weight: 4 }; raw(ctx, H.snap, 0.9, legAt) })
    if (t > 8.4) once("hold", () => {
      if (c.leg) { ctx.destroy(c.leg); c.leg = null }
      const list = String(st.weapons ?? "").split(",").filter(Boolean); if (!list.includes("table_leg")) list.push("table_leg")
      st.weapons = list.join(","); st.equipped = "table_leg"; st.cnd_table_leg ??= 55 // splintered, but it swings
      me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }
    })
    if (t > 9.3) once("lunge", () => { raw(ctx, H.growl, 1.0, { x: lunge.x, y: 1, z: lunge.z }); const e = ctx.getObject(c.ent); if (e) e.anim.body = { clip: "cdn/clip-run-loop.glb", loop: "loop", weight: 1 } })
    if (t > 8.8) once("windup", () => { raw(ctx, BREATHF, 0.8); fx1(ctx, "slowMo", { scale: 0.5, duration: 0.6 }) })
    if (t > 9.55) once("swing", () => { me.anim.cut = { clip: "cdn/clip-attack.glb", weight: 4 }; raw(ctx, H.twang, 0.4) })
    if (t > 10.0) once("hit", () => {
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
    if (t > LEN.encounter - 4.2) { me.feetPosition = out; me.rotation = { yaw: -90 }; return true }
    return false
  },
  // room D: the Backrooms Robotics HALOGEN issue machine, still powered; an arm in the port, a clamp, a unit on the wrist, the sheet
  halogen(ctx, c, t, once, st) {
    const me = ctx.self, scr = { x: HALO.x - 0.35, y: 1.55, z: HALO.z }, port = { x: HALO.x - 0.35, y: 1.05, z: HALO.z }, sp = { x: HALO.stand.x, y: 0, z: HALO.stand.z }
    me.feetPosition = L3({ x: c.p0.x, y: 0, z: c.p0.z }, sp, ss(0, 1.6, t)); me.rotation = { yaw: -90 }
    if (t < 1.6) me.anim.cut = { clip: "cdn/clip-walk-loop.glb", weight: 4, loop: "loop" }
    once("power", () => {
      raw(ctx, H.moan, 0.8, scr)
      const m = ctx.getObject("t0-halogen"); if (m) m.state = { ...(m.state || {}), on: true }
      c.glint = ctx.spawn({ audience: "local", scope: "session", feetPosition: { x: HALO.x - 0.6, y: 1.4, z: HALO.z }, light: { kind: "point", color: "#ffb347", intensity: 0, distance: 3.5 } })
      animate(ctx, c.glint, { "light.intensity": 2.2 }, { duration: 1.6, easing: "easeInQuad" })
    })
    if (t > 1.7) once("arm", () => { me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" }; me.bones.RightHand.reach = { to: port, blendIn: 0.6 } }) // the hand goes into the port itself
    if (t > 2.6) once("clamp", () => { raw(ctx, H.rhiss, 1.0, port); fx1(ctx, "screenShake", { intensity: 0.18, duration: 0.3 }); fx1(ctx, "screenFlash", { color: "#ffb347", duration: 0.25, intensity: 0.35 }) })
    if (t > 3.6) once("open", () => { raw(ctx, H.switch, 0.8); st.creating = true; st.sheetOpen = true; me.anim.cut = { clip: "cdn/clip-idle-loop.glb", weight: 4, loop: "loop" } })
    if (t < 1.6) ctx.view.camera = { eye: { x: 43.2, y: 1.7, z: -25.2 }, aim: L3({ x: 46, y: 1.3, z: -27.5 }, scr, ss(0, 1.6, t)), fov: 55 } // the machine across the room
    else if (t < 2.5) ctx.view.camera = { eye: { x: HALO.x - 1.2, y: 1.5, z: HALO.z + 0.7 }, aim: scr, fov: 30 } // the screen wakes
    else ctx.view.camera = { eye: { x: HALO.x - 1.0, y: 1.3, z: HALO.z - 0.85 }, aim: port, fov: lerp(40, 30, ss(2.5, 3.6, t)) } // the arm in the port
    return t > 4 && !st.sheetOpen
  },
  // the far wall of room F won't sit still (Shelly Nov 17, no Phoebe): behind them the hall's lamps die one by one, coming closer, and they walk into the wallpaper and through it
  // Shelly Nov 17: "the ending part should be more interesting with better sounds". The wet patch is the laundromat calling
  // you back: the dryer you left thumps up through the carpet, the lights go, the floor takes you, black on its end-of-cycle buzzer.
  final(ctx, c, t, once, st) {
    const me = ctx.self, at = { x: SOFT.x, y: 0, z: SOFT.z }, W = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
    const SINK0 = 5.0, SINK1 = 8.0
    const y = t < SINK0 ? 0 : -1.9 * ss(SINK0, SINK1, t)
    me.feetPosition = { x: lerp(c.p0.x, at.x, ss(0, 1.2, t)), y, z: lerp(c.p0.z, at.z, ss(0, 1.2, t)) }
    me.rotation = { yaw: 180 }
    once("crouch", () => { me.anim.cut = { clip: "cdn/clip-crouch-idle-loop.glb", weight: 4, loop: "loop" } })
    once("seep", () => {
      raw(ctx, W("water-seeping-up-through-soaked-carpet-squelch"), 0.7, at)
      c.pool = ctx.spawn({ audience: "local", scope: "session", lifetime: 60, feetPosition: { x: at.x, y: 0.015, z: at.z }, scale: 0.3,
        primitive: { kind: "circle", radius: SOFT.r * 1.3, segments: 40 }, rotation: { pitch: -90 }, material: { kind: "water", color: "#141008", opacity: 0.92, waveIntensity: 0.25 } })
      animate(ctx, c.pool, { scale: [0.3, 1.0] }, { duration: SINK1 * PACE, easing: "easeOutQuad" })
    })
    if (t > 0.8) once("thump", () => raw(ctx, W("muffled-tumble-dryer-thumping-a-shoe-heard-through-a-floor"), 0.85, { ...at, y: -1 }))
    const dark = (i) => { const o = ctx.getObject(`t0-light-${i}`); if (o?.light) { o.light = { ...o.light, intensity: 0 }; raw(ctx, H.switch, 0.55, o.feetPosition) } }
    for (const [i, a] of [[17, 2.4], [18, 3.1], [19, 3.7]]) if (t > a) once("dark" + i, () => dark(i))
    // the two lamps over the patch hang on, dim and stuttering, so you watch it take you; they go with the last bubble
    const dim = (k) => { for (const i of [20, 21]) { const o = ctx.getObject(`t0-light-${i}`); if (o?.light) o.light = { ...o.light, intensity: k } } }
    if (t > 4.2 && t < 9.4) dim(1.1 + (Math.sin(t * 23) > 0.6 ? -0.8 : 0) + Math.sin(t * 7.3) * 0.2)
    if (t > 9.4) once("dark20", () => { dim(0); raw(ctx, H.switch, 0.6, { x: 45, y: 2.7, z: 0 }) })
    if (t > 3.0) once("breath", () => raw(ctx, BREATH, 0.45))
    if (t > SINK0) once("give", () => {
      raw(ctx, W("wet-carpet-tearing-floor-giving-way-into-deep-water-gulp"), 1.0, at)
      fx1(ctx, "screenShake", { intensity: 0.12, duration: 0.9 })
      ctx.emit("fx", { position: { ...at, y: 0.05 }, script: `fx
pop ring burst=3 life=1.6..2.2 size=.4 sz=$size*(1>6) col=<.2,.17,.1> a=.5>0 r=sprite(soft-disc,alpha)
pop drip burst=24 life=.5..0.9 on=disc(.6) v=up(1.2..2.4)+sdir()*.4 size=.02..0.04 acc=grav() col=<.18,.15,.09> a=.8 floor=die r=sprite(droplet,alpha)` }, { audience: { player: me.id } })
    })
    if (t > SINK0 + 0.8) once("under", () => raw(ctx, W("muffled-underwater-rumble-fluorescent-hum-fading-away"), 0.8, { ...at, y: -1 }))
    if (t > SINK1 - 0.4) once("gone", () => { me.hidden = [...(me.hidden || []), me.id] })
    if (t > 8.6) once("bubbles", () => raw(ctx, W("last-air-bubbles-breaking-a-still-dark-surface"), 0.6, at))
    if (t > 10.4) once("buzzer", () => raw(ctx, W("old-laundromat-dryer-end-of-cycle-buzzer-far-away"), 0.7))
    // shots: the carpet at the patch, low; the hall from the far end going dark; straight down on them as it takes them; the water closing
    if (t < 2.4) { const u = ss(0, 2.4, t); ctx.view.camera = { eye: { x: at.x + 1.3, y: 0.22, z: at.z + 0.9 }, aim: { x: at.x, y: lerp(0.05, 0.5, u), z: at.z }, fov: lerp(46, 38, u) } }
    else if (t < SINK0) { const u = ss(2.4, SINK0, t); ctx.view.camera = { eye: { x: 44.3, y: 1.55, z: lerp(-6.5, -5.2, u) }, aim: { x: at.x, y: 0.7, z: at.z }, fov: 40 } }
    else if (t < 9.6) { const u = ss(SINK0, 9.6, t); ctx.view.camera = { eye: { x: at.x + 0.02, y: lerp(2.6, 1.9, u), z: at.z + 0.05 }, aim: { x: at.x, y: -2, z: at.z }, fov: lerp(62, 34, u) } }
    else ctx.view.camera = { eye: { x: at.x + 0.02, y: 1.9, z: at.z + 0.05 }, aim: { x: at.x, y: -2, z: at.z }, fov: 34 }
    if (t > LEN.final) { if (c.pool) ctx.destroy(c.pool); st.t0Done = true; st.t0fade = ctx.now(); return true }
    return false
  },
}
