// The Hub, first arrival (Shelly, #320257): Phoebe waits at the trunk's blind west end, just past the second lamp's pool.
// She says what she's doing (wandering, meeting people, watching who keeps getting out), that you remind her of someone
// she won't name, and where Dina went: the tenth tunnel, a radio, and the M.E.G. ledger up the road.
// Plays once (state.hubPhoebe), however you got here. Hold JUMP to skip (scripts/main-menu.js onInput). Letterbox: cutscene-ui.js hubUi.
import { spawnPhoebe, dropPhoebe } from "./phoebe.js"
import { ARRIVE, CURB } from "./thehub.js"
export const HUB_LEN = 72
// Phoebe performed (Laura, Nov 13: "give it actual voice acting because it keeps skipping"): each line waits for the last to end, 0.6 s apart
const VO = [
  "/cdn/value.e53539a862ac64009f4bd042f422b189b55940bc3eb6488a8cb481ad673e918e.mp3", "/cdn/value.460f32f5cf820ad761142533c26b321a24b0ba005e344c0402ab233465167684.mp3",
  "/cdn/value.e1693cf87d333b90cc22a68116a6e54cc30bb7ffcf0e762b110864c38cf20bf3.mp3", "/cdn/value.af68fbae7e83ace03e695c966546805e4e74dbedf314f13a8c1454cb568b884f.mp3",
  "/cdn/value.ba5c483494608be8b62568213a08b1ff9e838ab914fd359fc89f9b3d45dde10f.mp3", "/cdn/value.0726249e20d7c649309a7e5fc97ee24ef7a2fb55d17e5b423d18bd24f94a6504.mp3",
  "/cdn/value.dfa1059a9bc5b10258911b0f324bf697d20db867b5012c4a1d2346737ec4e171.mp3", "/cdn/value.3f587e215c38058edac2421bd267c6b3505e6a9d09a46bfa9cea38c214e5c432.mp3",
]
export const HUB_LINES = [ // [at s, for s, who, text]: "for" is the clip's own length
  [7.0, 5.8, "???", "Oh. You took the long way in. Nobody takes the long way in."],
  [13.4, 5.0, "PHOEBE", "Phoebe. Just Phoebe. I wear the coat, I'm not in the club."],
  [19.0, 8.4, "PHOEBE", "What am I doing down here? Same as you. Walking. Meeting people. Seeing who keeps getting out of places you don't get out of."],
  [28.0, 7.8, "PHOEBE", "I knew a guy like that once. Walked out of everything like it owed him money. You've got his look. It's annoying."],
  [36.4, 6.0, "PHOEBE", "Dina came through here. Didn't want a key. Wanted the tenth tunnel and a radio."],
  [43.0, 7.2, "PHOEBE", "Count the side tunnels from this dead end. The tenth door's never locked. The city behind it is very quiet."],
  [50.8, 6.8, "PHOEBE", "The M.E.G. post up the road wrote her down. Ask about their ledger. Be nice, they love a form."],
  [58.2, 7.2, "PHOEBE", "Anyway. I'm busy. Loads of people pass through here and basically nobody says hi. Rude."],
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
  const skip = t > 2 && ses.hcskip && ctx.now() - ses.hcskip > 1200 // a jump still held from the crossing never skips it
  if (t >= HUB_LEN || skip || ctx.self.place !== "thehub") {
    dropPhoebe(ctx, "phoebe-hub"); ctx.view.camera = null
    if (skip) { if (c.score) ctx.emit("stopSound", { soundId: c.score }, me1(ctx)); if (c.vo) ctx.emit("stopSound", { soundId: c.vo }, me1(ctx)) }
    st.hubcut = null; st.hubPhoebe = true; st.hubDinaLead = 1; ses.hc = null; ses.hcskip = null
    st.notice = { text: "New lead: Dina went through the tenth tunnel. The M.E.G. post wrote her down.", at: ctx.now() }
    return false
  }
  const p = c.p0, head = { x: p.x, y: p.y + 1.6, z: p.z }, herHead = { x: HER.x, y: HER.y + 1.5, z: HER.z }
  once("score", () => { c.score = ctx.emit("playSound", { clip: SCORE, volume: 0.55, position: p, maxDistance: 600 }, me1(ctx)) })
  for (let i = 0; i < HUB_LINES.length; i++) if (t > HUB_LINES[i][0]) once("l" + i, () => { c.vo = ctx.emit("playSound", { clip: VO[i], volume: 1, bus: "Voice", mode: "restart" }, me1(ctx)) })
  if (t > 4.8) once("her", () => spawnPhoebe(ctx, "phoebe-hub", HER, HER_YAW, 60))
  // A, 0-6: low on the asphalt at the dead end, looking east down a road that doesn't stop
  if (t < 6) {
    once("buzz", () => snd(ctx, BUZZ, 0.6, { x: -42, y: 4.4, z: 5.4 }))
    const u = ss(0, 6, t)
    ctx.view.camera = { eye: L({ x: p.x - 4, y: 0.35, z: p.z - 2.2 }, { x: p.x - 2.5, y: 0.7, z: p.z - 1.6 }, u), aim: { x: p.x + 60, y: 2.2, z: 0 }, fov: 60 }
    return true
  }
  // B, 6-13: over your shoulder. A figure on the far sidewalk, standing where the light gives out
  if (t < 13) {
    const u = ss(6, 13, t)
    ctx.view.camera = { eye: { x: p.x - 1.1, y: p.y + 1.75, z: p.z - 0.7 }, aim: L({ x: HER.x + 4, y: 1.8, z: 1 }, { x: HER.x, y: HER.y + 1.3, z: HER.z }, u), fov: 50 - 8 * u }
    return true
  }
  // C, 13-28: the side two-shot, slow dolly along the road: you small at the left, her at the right in her half-light
  if (t < 28) {
    const u = ss(13, 28, t), mid = L(p, HER, 0.6)
    ctx.view.camera = { eye: L({ x: mid.x - 2, y: 1.5, z: -4.2 }, { x: mid.x + 1.5, y: 1.45, z: -4 }, u), aim: { x: mid.x + 0.5, y: 1.3, z: 1.6 }, fov: 52 }
    return true
  }
  // D, 28-43: low and close on her: the coat, the grin, the white eyes doing all the work
  if (t < 43) {
    const u = ss(28, 43, t)
    ctx.view.camera = { eye: L({ x: HER.x - 2.6, y: HER.y + 1.05, z: HER.z - 1.3 }, { x: HER.x - 1.9, y: HER.y + 1.15, z: HER.z - 0.9 }, u), aim: { x: HER.x, y: HER.y + 1.45, z: HER.z }, fov: 40 }
    return true
  }
  // E, 43-58: the road east, lamp after lamp, past the side tunnels she means you to count
  if (t < 58) {
    const u = ss(43, 58, t)
    ctx.view.camera = { eye: L({ x: HER.x - 1.2, y: 2.2, z: 1.2 }, { x: HER.x + 6, y: 2.6, z: 0.6 }, u), aim: L({ x: 120, y: 2, z: 0 }, { x: 400, y: 2.4, z: 0 }, u), fov: 48 }
    return true
  }
  // F, 58-69: back on her, from where you stand. The lamp over her dies; when it stutters on, the sidewalk is empty
  if (t < 69) {
    ctx.view.camera = { eye: { x: p.x + 0.3, y: p.y + 1.62, z: p.z + 0.1 }, aim: herHead, fov: 44 }
    if (t > 66.6) once("die", () => { snd(ctx, DIE, 0.9, herHead); ctx.emit("screenFlash", { color: "#000000", duration: 1.0, intensity: 0.96 }, me1(ctx)) })
    if (t > 67.1) once("drop", () => dropPhoebe(ctx, "phoebe-hub"))
    return true
  }
  // G, 69-72: the lamp buzzes back on; the view comes home
  once("back", () => snd(ctx, BUZZ, 0.7, herHead))
  const u = ss(69, 72, t)
  ctx.view.camera = { eye: L({ x: p.x + 0.3, y: p.y + 1.62, z: p.z + 0.1 }, head, u), aim: L(herHead, { x: p.x + 8, y: p.y + 1.6, z: p.z }, u), fov: 44 + 18 * u }
  return true
}
