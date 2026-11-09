// The early route's meeting (Shelly: "you can meet phoebe earlier in level 26"): the last party room below deck.
// Walk in before you've seen her and she's sitting at the head of the table. She talks, the green fog takes her,
// and the deck cutscene is spent (state.l26seen), the same as meeting her up top.
import { spawnPhoebe, dropPhoebe } from "./lib/phoebe.js"
import { setDinaStep } from "./lib/dina-quest.js"
const V = (w) => `/cdn/voice-soft-breathy-young-woman-whispering-amused-saying-${encodeURIComponent(w)}.mp3`
const LINES = [
  [0, "You found the stairs before they found you. Huh."],
  [4.5, "Most people get the deck first. The fog, the big reveal. You skipped my entrance."],
  [10, "Fine. Sit if you want. The cake isn't cake."],
  [15, "I can't stay. Find the poster that looks wrong, stray."],
]
const FOG = `fx
pop fog burst=60 on=sphere(1.2) life=2.5..4 v=sdir()*(1..2.5)+up(.6) size=.8..1.6 acc=drag(1.2)+curl(.4) sz=$size*(.6>2.4) col=<.35,.75,.45> a=0>.5:.45>.7:.25>0 rot=spin(.2) r=sprite(smoke-puff,alpha)
pop glow n=1 life=2 r=light(<.4,1,.5>,(1>0)*40,10)`
export function onTriggerEnter(ctx, other) {
  const pl = ctx.getObject(other?.id); if (!pl?.state || ctx.self.state.busy) return
  const quest = pl.state.dinaQ === 4 // the drive's trail: she waits here once more for whoever followed the prints
  if (pl.state.l26seen && !quest) return
  const s = ctx.self.state; s.busy = true; s.who = pl.id
  spawnPhoebe(ctx, "phoebe-l26-early", s.seat, s.yaw, 24)
  LINES.forEach(([t], i) => ctx.after(t + 0.6, "line", { i }))
  ctx.after(19.5, "gone", {})
  pl.state.l26seen = true; pl.state.l26below = false
  if (quest) setDinaStep(ctx, pl.state, 5, "Quest Updated: The Undelivered")
}
export function line(ctx, { i }) {
  const s = ctx.self.state
  ctx.emit("playSound", { clip: V(LINES[i][1]), position: s.seat, volume: 0.95, maxDistance: 30 }, { audience: { player: s.who } })
  ctx.emit("uiEvent", { name: "caption", payload: { who: "PHOEBE", text: LINES[i][1], ms: 4200 } }, { audience: { player: s.who } })
}
export function gone(ctx) {
  const s = ctx.self.state
  ctx.emit("fx", { position: { ...s.seat, y: s.seat.y + 1 }, script: FOG })
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-cold-wind-gust-rushing-fog-whoosh.mp3", position: s.seat, volume: 0.9 })
  ctx.emit("screenFlash", { color: "#5fe08a", duration: 0.6, intensity: 0.5 }, { audience: { player: s.who } })
  ctx.after(0.6, "drop", {})
}
export function drop(ctx) { dropPhoebe(ctx, "phoebe-l26-early"); ctx.self.state.busy = false }
