// The early route's meeting (Shelly: "you can meet phoebe earlier in level 26"): the last party room below deck.
// Walk in and the lights die; when they stutter back she is standing right behind you. Three whispers, a second blackout, gone.
// and the deck cutscene is spent (state.l26seen), the same as meeting her up top.
import { spawnPhoebe, dropPhoebe } from "./lib/phoebe.js"
import { setDinaStep } from "./lib/dina-quest.js"
const V = (w) => `/cdn/voice-soft-breathy-young-woman-whispering-amused-saying-${encodeURIComponent(w)}.mp3`
const LINES = [ // (Shelly, Nov 9: a completely different meeting; she never sends you back to the poster you came through)
  [1.7, "Don't turn around."],
  [4.6, "Somebody took Dina's case off that table before you got here. Wasn't me."],
  [9.2, "They're still on this ship, stray. So am I."],
]
const FOG = `fx
pop fog burst=60 on=sphere(1.2) life=2.5..4 v=sdir()*(1..2.5)+up(.6) size=.8..1.6 acc=drag(1.2)+curl(.4) sz=$size*(.6>2.4) col=<.35,.75,.45> a=0>.5:.45>.7:.25>0 rot=spin(.2) r=sprite(smoke-puff,alpha)`
const BREAKER = "/cdn/moodboard-realistic-gritty/sfx-electrical-breaker-clunk-power-dies-hum-cuts-out.mp3"
const BUZZ = "/cdn/moodboard-realistic-gritty/sfx-fluorescent-lights-flicker-back-on-buzz-stutter.mp3"
// the party room's lamps: found once around the seat, dimmed and given back by intensity alone
function lamps(ctx, s) {
  if (!s.lamps) {
    s.lamps = {}
    for (const r of ctx.query({ center: s.seat, radius: 9 })) { const o = ctx.getObject(r.id); if (o?.light) s.lamps[r.id] = o.light.intensity ?? 1 }
  }
  return s.lamps
}
function setLights(ctx, on) {
  const L = lamps(ctx, ctx.self.state)
  for (const [id, k] of Object.entries(L)) { const o = ctx.getObject(id); if (o?.light) o.light = { ...o.light, intensity: on ? k : 0 } }
}
export function onTriggerEnter(ctx, other) {
  const pl = ctx.getObject(other?.id); if (!pl?.state || ctx.self.state.busy) return
  const quest = pl.state.dinaQ === 4 // the drive's trail: she waits here once more for whoever followed the prints
  if (pl.state.l26seen && !quest) return
  const s = ctx.self.state; s.busy = true; s.who = pl.id
  // the blackout: the room dies the moment you step in
  setLights(ctx, false)
  ctx.emit("playSound", { clip: BREAKER, position: pl.feetPosition, volume: 1 }, { audience: { player: s.who } })
  ctx.emit("screenFlash", { color: "#000000", duration: 1.4, intensity: 0.95 }, { audience: { player: s.who } })
  // where she will stand: a step behind you, back toward the door you came through, facing you
  const p = pl.feetPosition, dx = p.x - s.seat.x, dz = p.z - s.seat.z, d = Math.hypot(dx, dz) || 1
  s.behind = { x: p.x + dx / d * 1.1, y: p.y, z: p.z + dz / d * 1.1 }
  s.faceYaw = Math.atan2(dx / d, dz / d) * 180 / Math.PI // turned back toward you
  ctx.after(1.4, "lightsBack", {})
  LINES.forEach(([t], i) => ctx.after(t, "line", { i }))
  ctx.after(12.6, "gone", {})
  pl.state.l26seen = true; pl.state.l26below = false
  { const cy = pl.camera?.rotation?.yaw, py = pl.rotation?.yaw ?? 0; pl.state.freeze = { until: ctx.now() + 13600, yaw: typeof cy === 'number' ? cy : py, pitch: 0 } } // Shelly: you freeze at "don't turn around" and stay frozen until she's gone
  if (quest) setDinaStep(ctx, pl.state, 5, "Quest Updated: The Undelivered")
}
export function lightsBack(ctx) {
  const s = ctx.self.state
  spawnPhoebe(ctx, "phoebe-l26-early", s.behind, s.faceYaw, 16) // standing, close enough to hear her breathe
  setLights(ctx, true)
  ctx.emit("playSound", { clip: BUZZ, position: s.seat, volume: 0.9 }, { audience: { player: s.who } })
}
export function line(ctx, { i }) {
  const s = ctx.self.state
  ctx.emit("playSound", { clip: V(LINES[i][1]), position: s.behind ?? s.seat, volume: 0.95, maxDistance: 30 }, { audience: { player: s.who } })
  ctx.emit("uiEvent", { name: "caption", payload: { who: "PHOEBE", text: LINES[i][1], ms: 3800 } }, { audience: { player: s.who } })
}
export function gone(ctx) { // the second blackout takes her
  const s = ctx.self.state
  setLights(ctx, false)
  ctx.emit("playSound", { clip: BREAKER, position: s.behind ?? s.seat, volume: 1 }, { audience: { player: s.who } })
  ctx.emit("screenFlash", { color: "#000000", duration: 1, intensity: 0.95 }, { audience: { player: s.who } })
  ctx.after(0.5, "drop", {})
}
export function drop(ctx) {
  const s = ctx.self.state
  dropPhoebe(ctx, "phoebe-l26-early")
  ctx.emit("fx", { position: { ...(s.behind ?? s.seat), y: (s.behind ?? s.seat).y + 1 }, script: FOG })
  ctx.after(0.5, "restore", {})
}
export function restore(ctx) {
  setLights(ctx, true)
  ctx.emit("playSound", { clip: BUZZ, position: ctx.self.state.seat, volume: 0.9 }, { audience: { player: ctx.self.state.who } })
  ctx.self.state.busy = false
}
