// Level 26, the SS Fun =) (Shelly, Nov 8): the first time you no-clip onto the ship, a cutscene. The Adventure in green fog,
// you on the bow deck, and up at the sun deck rail, Phoebe: the first time anyone gets a real look at her. She talks, she
// leaves in the fog. Plays once (state.l26seen), however early you got here. Hold SPACE to skip (scripts/main-menu.js onInput).
// state.l26cut = { at } while it plays; the letterbox and lines are scripts/cutscene-ui.js l26Ui.
import { spawnPhoebe, dropPhoebe } from "./phoebe.js"
export const L26_LEN = 38
export const L26_LINES = [] // Shelly, Nov 14: Phoebe says nothing here now; she is only seen at the rail
const V = (w) => `/cdn/voice-soft-breathy-young-woman-whispering-amused-saying-${encodeURIComponent(w)}.mp3` // her one voice, the tutorial's too
const SCORE = "/cdn/moodboard-realistic-gritty/music-horror-film-cue-38-seconds-ghostly-ocean-drone-warped-distant-calliope-swell-at-8-seconds-music-box-enters-at-16-seconds-strings-sting-at-31-seconds-then-fading.mp3"
const HORN = "/cdn/moodboard-realistic-gritty/sfx-huge-ship-horn-long-low-blast-in-thick-fog.mp3"
const WARP = "/cdn/moodboard-realistic-gritty/sfx-static-burst-glitch-threshold.mp3"
const WHOOSH = "/cdn/moodboard-realistic-gritty/sfx-cold-wind-gust-rushing-fog-whoosh.mp3"
const HER = { x: 2.6, y: 3.45, z: -17.3 }  // the sun deck's bow rail, beside the reversed poster
const SHIP = { x: 420, y: 8, z: 0 }       // l26-ship-far, out in the fog
const FOG = `fx
pop fog burst=60 on=sphere(1.2) life=2.5..4 v=sdir()*(1..2.5)+up(.6) size=.8..1.6 acc=drag(1.2)+curl(.4) sz=$size*(.6>2.4) col=<.35,.75,.45> a=0>.5:.45>.7:.25>0 rot=spin(.2) r=sprite(smoke-puff,alpha)
pop glow n=1 life=2 r=light(<.4,1,.5>,(1>0)*40,10)`
const ss = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const L = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u })
const me1 = (ctx) => ({ audience: { player: ctx.self.id } })
function snd(ctx, clip, v, at) { ctx.emit("playSound", { clip, position: at ?? ctx.self.feetPosition, volume: v, maxDistance: 600 }, me1(ctx)) }

// true while the cutscene owns the player
export function l26Tick(ctx, ses, st) {
  const me = ctx.self
  if (!st.l26cut) {
    if (st.l26seen) return false
    if (st.l26via === "poster") { // the early route: a fun poster drops you below deck; she waits in the last party room (scripts/l26-phoebe-early.js)
      st.l26via = null; me.feetPosition = { x: 300, y: -79.9, z: 2.5 }; me.rotation = { yaw: 0 }; st.l26below = true
      snd(ctx, WARP, 0.8); ctx.emit("screenFlash", { color: "#5fe08a", duration: 1.2, intensity: 1 }, me1(ctx))
      return false
    }
    if (st.l26below) return false // still down there hunting for her: the deck scene waits
    st.l26cut = { at: ctx.now() }; ses.l26 = null; ses.l26skip = null
  }
  const t = (ctx.now() - st.l26cut.at) / 1000
  const c = (ses.l26 ??= { p0: { ...me.feetPosition }, did: {} })
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  me.feetPosition = c.p0; me.velocity = { x: 0, y: 0, z: 0 }
  c.hp0 ??= st.hp; if (typeof c.hp0 === "number" && st.hp < c.hp0) st.hp = c.hp0 // Shelly, Nov 14: nothing hurts you while the cutscene owns the camera
  const skip = ses.l26skip && ctx.now() - ses.l26skip > 1200
  if (t >= L26_LEN || skip) {
    dropPhoebe(ctx, "phoebe-l26"); ctx.view.camera = null
    me.hidden = (me.hidden || []).filter((i) => i !== me.id)
    st.l26cut = null; st.l26seen = true; ses.l26 = null; ses.l26skip = null
    if (skip) ctx.emit("stopSound", { soundId: c.score }, me1(ctx))
    return false
  }
  const p = c.p0, head = { x: p.x, y: p.y + 1.5, z: p.z }, herHead = { x: HER.x, y: HER.y + 1.45, z: HER.z }
  once("score", () => { c.score = ctx.emit("playSound", { clip: SCORE, volume: 0.7, position: p, maxDistance: 600 }, me1(ctx)) })
  // A, 0-8: the ship out in the fog, the camera drifting in over the water; its horn
  if (t < 8) {
    once("horn", () => snd(ctx, HORN, 0.9, SHIP))
    const u = ss(0, 8, t)
    ctx.view.camera = { eye: L({ x: 330, y: -8, z: -52 }, { x: 350, y: -7, z: -40 }, u), aim: L({ x: 420, y: 6, z: 0 }, SHIP, u), fov: 48 }
    if (t > 7.2) once("noclip", () => { ctx.emit("screenFlash", { color: "#5fe08a", duration: 0.9, intensity: 1 }, me1(ctx)); snd(ctx, WARP, 0.8) })
    return true
  }
  // B, 8-15: behind you on the deck, the camera low on the planks and rising to the fog ahead
  if (t < 15) {
    const u = ss(8, 15, t)
    ctx.view.camera = { eye: L({ x: p.x + 1.6, y: p.y + 0.3, z: p.z + 2.4 }, { x: p.x + 0.9, y: p.y + 1.7, z: p.z + 1.6 }, u), aim: L({ x: p.x - 3, y: p.y + 0.6, z: p.z - 14 }, { x: p.x, y: p.y + 1.4, z: p.z - 12 }, u), fov: 55 } // low on the planks behind you, rising to look up the trashed deck into the fog
    return true
  }
  once("phoebe", () => spawnPhoebe(ctx, "phoebe-l26", HER, 0, 40))
  // C, 15-24: over your shoulder, up to the sun deck rail. Someone's already there
  if (t < 24) {
    const u = ss(15, 23, t)
    const eye = { x: p.x + 0.5, y: p.y + 1.75, z: p.z - 0.9 }
    ctx.view.camera = { eye, aim: L({ x: p.x + 0.8, y: p.y + 1.9, z: p.z + 6 }, { x: HER.x + 2.2, y: HER.y + 0.9, z: HER.z }, u), fov: 58 - 6 * u } // she drifts into the corner of the frame, never centered (Shelly: you shouldn't see her fully yet)
    return true
  }
  // D, 24-31: close, from below: her, smug, looking down at you
  if (t < 31) {
    const u = ss(24, 31, t)
    ctx.view.camera = { eye: L(head, { x: p.x + 0.3, y: p.y + 1.55, z: p.z - 0.6 }, u), aim: { x: HER.x + 2.4, y: HER.y + 0.7, z: HER.z }, fov: 50 } // still from the deck below: a figure up at the rail, half out of frame
    return true
  }
  // E, 31-36: the green fog rolls over the rail and she is gone; one more line from nowhere
  if (t < 36) {
    once("gone", () => {
      ctx.emit("fx", { position: { x: HER.x, y: HER.y + 1, z: HER.z }, script: FOG }, me1(ctx))
      ctx.emit("screenFlash", { color: "#5fe08a", duration: 0.6, intensity: 0.5 }, me1(ctx)); snd(ctx, WHOOSH, 0.8, HER)
    })
    if (t > 31.6) once("drop", () => dropPhoebe(ctx, "phoebe-l26"))
    ctx.view.camera = { eye: { x: p.x + 0.3, y: p.y + 1.55, z: p.z - 0.6 }, aim: { x: HER.x + 2.4, y: HER.y + 0.7, z: HER.z }, fov: 50 }
    return true
  }
  // F, 36-38: back down to you, handing the view back
  const u = ss(36, 38, t)
  ctx.view.camera = { eye: L({ x: p.x + 0.5, y: p.y + 1.75, z: p.z - 0.9 }, { x: p.x, y: p.y + 1.6, z: p.z - 0.05 }, u), aim: L(herHead, { x: p.x, y: p.y + 1.6, z: p.z + 6 }, u), fov: 62 }
  return true
}
