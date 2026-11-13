// The Hub, first arrival (Shelly, #320257): Phoebe waits at the trunk's blind west end, just past the second lamp's pool.
// She says what she's doing (wandering, meeting people, watching who keeps getting out), that you remind her of someone
// she won't name, and where Dina went: the tenth tunnel, a radio, and the M.E.G. ledger up the road.
// Plays once (state.hubPhoebe), however you got here. Hold JUMP to skip (scripts/main-menu.js onInput). Letterbox: cutscene-ui.js hubUi.
import { spawnPhoebe, dropPhoebe } from "./phoebe.js"
import { ARRIVE, CURB } from "./thehub.js"
export const HUB_LEN = 52
export const HUB_LINES = [ // [at s, for s, who, text]
  [7.0, 4.0, "???", "Oh. You took the long way in. Nobody takes the long way in."],
  [11.6, 4.4, "PHOEBE", "Phoebe. Just Phoebe. I wear the coat, I'm not in the club."],
  [16.6, 6.6, "PHOEBE", "What am I doing down here? Same as you. Walking. Meeting people. Seeing who keeps getting out of places you don't get out of."],
  [24.6, 5.0, "PHOEBE", "I knew a guy like that once. Walked out of everything like it owed him money. You've got his look. It's annoying."],
  [30.4, 4.4, "PHOEBE", "Dina came through here. Didn't want a key. Wanted the tenth tunnel and a radio."],
  [35.4, 4.6, "PHOEBE", "Count the side tunnels from this dead end. The tenth door's never locked. The city behind it is very quiet."],
  [40.6, 4.2, "PHOEBE", "The M.E.G. post up the road wrote her down. Ask about their ledger. Be nice, they love a form."],
  [45.4, 4.4, "PHOEBE", "Anyway. I'm busy. Loads of people pass through here and basically nobody says hi. Rude."],
]
const V = (w) => `/cdn/voice-soft-breathy-young-woman-whispering-amused-saying-${encodeURIComponent(w)}.mp3` // her one voice
const SCORE = "/cdn/moodboard-realistic-gritty/music-film-cue-52-seconds-hollow-concrete-tunnel-drone-faint-sodium-lamp-hum-soft-music-box-enters-at-11-seconds-warm-low-strings-at-30-seconds-music-box-falters-at-46-seconds-then-silence.mp3"
const BUZZ = "/cdn/moodboard-realistic-gritty/sfx-sodium-tunnel-lamp-ballast-buzz-flicker-stutter.mp3"
const DIE = "/cdn/moodboard-realistic-gritty/sfx-electrical-breaker-clunk-power-dies-hum-cuts-out.mp3"
export const HER = { x: -37.6, y: CURB, z: 3.7 } // the south sidewalk, two steps past lamp 1's pool: lit from behind, face half in shadow
const HER_YAW = 90 // facing west, back toward the dead end and you
const ss = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const L = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u })
const me1 = (ctx) => ({ audience: { player: ctx.self.id } })
const snd = (ctx, clip, v, at) => ctx.emit("playSound", { clip, position: at ?? ctx.self.feetPosition, volume: v, maxDistance: 200, bus: clip.includes("/voice-") ? "Voice" : undefined }, me1(ctx))

export function hubCutTick(ctx, ses, st) {
  const me = ctx.self
  if (!st.hubcut) {
    if (st.hubPhoebe) return false
    ses.hubIn ??= ctx.now(); if (ctx.now() - ses.hubIn < 2500) return false // let them stand up first
    if (Math.hypot(me.feetPosition.x - ARRIVE.x, me.feetPosition.z - ARRIVE.z) > 30) { st.hubPhoebe = true; return false } // arrived somewhere else (a saved spot): she isn't at the dead end any more
    st.hubcut = { at: ctx.now() }; ses.hc = null; ses.hcskip = null
  }
  const t = (ctx.now() - st.hubcut.at) / 1000
  const c = (ses.hc ??= { p0: { ...me.feetPosition }, did: {} })
  const once = (k, fn) => { if (!c.did[k]) { c.did[k] = true; fn() } }
  me.feetPosition = c.p0; me.velocity = { x: 0, y: 0, z: 0 }
  const skip = ses.hcskip && ctx.now() - ses.hcskip > 1200
  if (t >= HUB_LEN || skip || ctx.self.place !== "thehub") {
    dropPhoebe(ctx, "phoebe-hub"); ctx.view.camera = null
    if (skip && c.score) ctx.emit("stopSound", { soundId: c.score }, me1(ctx))
    st.hubcut = null; st.hubPhoebe = true; st.hubDinaLead = 1; ses.hc = null; ses.hcskip = null
    st.notice = { text: "New lead: Dina went through the tenth tunnel. The M.E.G. post wrote her down.", at: ctx.now() }
    return false
  }
  const p = c.p0, head = { x: p.x, y: p.y + 1.6, z: p.z }, herHead = { x: HER.x, y: HER.y + 1.5, z: HER.z }
  once("score", () => { c.score = ctx.emit("playSound", { clip: SCORE, volume: 0.55, position: p, maxDistance: 600 }, me1(ctx)) })
  for (let i = 0; i < HUB_LINES.length; i++) if (t > HUB_LINES[i][0]) once("l" + i, () => snd(ctx, V(HUB_LINES[i][3]), 0.95, herHead))
  if (t > 4.8) once("her", () => spawnPhoebe(ctx, "phoebe-hub", HER, HER_YAW, 60))
  // A, 0-6: low on the asphalt at the dead end, looking east down a road that doesn't stop
  if (t < 6) {
    once("buzz", () => snd(ctx, BUZZ, 0.6, { x: -42, y: 4.4, z: 5.4 }))
    const u = ss(0, 6, t)
    ctx.view.camera = { eye: L({ x: p.x - 4, y: 0.35, z: p.z - 2.2 }, { x: p.x - 2.5, y: 0.7, z: p.z - 1.6 }, u), aim: { x: p.x + 60, y: 2.2, z: 0 }, fov: 60 }
    return true
  }
  // B, 6-11: over your shoulder. A figure on the far sidewalk, standing where the light gives out
  if (t < 11) {
    const u = ss(6, 11, t)
    ctx.view.camera = { eye: { x: p.x - 1.1, y: p.y + 1.75, z: p.z - 0.7 }, aim: L({ x: HER.x + 4, y: 1.8, z: 1 }, { x: HER.x, y: HER.y + 1.3, z: HER.z }, u), fov: 50 - 8 * u }
    return true
  }
  // C, 11-24: the side two-shot, slow dolly along the road: you small at the left, her at the right in her half-light
  if (t < 24) {
    const u = ss(11, 24, t), mid = L(p, HER, 0.6)
    ctx.view.camera = { eye: L({ x: mid.x - 2, y: 1.5, z: -4.2 }, { x: mid.x + 1.5, y: 1.45, z: -4 }, u), aim: { x: mid.x + 0.5, y: 1.3, z: 1.6 }, fov: 52 }
    return true
  }
  // D, 24-35: low and close on her: the coat, the grin, the white eyes doing all the work
  if (t < 35) {
    const u = ss(24, 35, t)
    ctx.view.camera = { eye: L({ x: HER.x - 2.6, y: HER.y + 1.05, z: HER.z - 1.3 }, { x: HER.x - 1.9, y: HER.y + 1.15, z: HER.z - 0.9 }, u), aim: { x: HER.x, y: HER.y + 1.45, z: HER.z }, fov: 40 }
    return true
  }
  // E, 35-45: the road east, lamp after lamp, past the side tunnels she means you to count
  if (t < 45) {
    const u = ss(35, 45, t)
    ctx.view.camera = { eye: L({ x: HER.x - 1.2, y: 2.2, z: 1.2 }, { x: HER.x + 6, y: 2.6, z: 0.6 }, u), aim: L({ x: 120, y: 2, z: 0 }, { x: 400, y: 2.4, z: 0 }, u), fov: 48 }
    return true
  }
  // F, 45-50: back on her, from where you stand. The lamp over her dies; when it stutters on, the sidewalk is empty
  if (t < 50) {
    ctx.view.camera = { eye: { x: p.x + 0.3, y: p.y + 1.62, z: p.z + 0.1 }, aim: herHead, fov: 44 }
    if (t > 48.6) once("die", () => { snd(ctx, DIE, 0.9, herHead); ctx.emit("screenFlash", { color: "#000000", duration: 1.0, intensity: 0.96 }, me1(ctx)) })
    if (t > 49.1) once("drop", () => dropPhoebe(ctx, "phoebe-hub"))
    return true
  }
  // G, 50-52: the lamp buzzes back on; the view comes home
  once("back", () => snd(ctx, BUZZ, 0.7, herHead))
  const u = ss(50, 52, t)
  ctx.view.camera = { eye: L({ x: p.x + 0.3, y: p.y + 1.62, z: p.z + 0.1 }, head, u), aim: L(herHead, { x: p.x + 8, y: p.y + 1.6, z: p.z }, u), fov: 44 + 18 * u }
  return true
}
