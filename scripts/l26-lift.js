// Level 26 lifts and the endless corridor: step in and you arrive at state.to (a point in this place), facing state.yaw.
// state.loop = true: the lower decks' far end, which drops you back at the corridor's start without a seam (Liminal Echo).
export function onTriggerEnter(ctx, other) {
  if (!other?.id?.startsWith?.("player/")) return
  const s = ctx.self.state, me = getObjectSafe(ctx, other.id); if (!me || !s.to) return
  if (s.loop) { const p = me.feetPosition; me.feetPosition = { x: p.x, y: p.y, z: p.z + s.to.dz } ; return }
  if (ctx.self.id === "l26d-lift-up" && ctx.place.state.pgLiftLocked) { // lockdown (scripts/lib/pg-society.js): the technician holds it from the panel until the alarm runs out or it dies
    const at = { ...ctx.self.feetPosition, y: ctx.self.feetPosition.y + 2 }
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-elevator-call-button-dead-buzz-and-cable-groan.mp3", position: at, volume: 0.9 }, { audience: { player: me.id } })
    ctx.emit("damageNumber", { position: at, text: "LOCKED FROM THE PANEL", color: "#ffb347" }, { audience: { player: me.id } })
    return
  }
  me.feetPosition = { ...s.to }; if (s.yaw != null) me.rotation = { yaw: s.yaw }
  ctx.emit("screenFlash", { color: "#000000", duration: 0.5, intensity: 1 }, { audience: { player: me.id } })
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-old-elevator-ding-and-doors-grinding-open.mp3", position: s.to, volume: 0.8 }, { audience: { player: me.id } })
}
const getObjectSafe = (ctx, id) => ctx.getObject(id)
