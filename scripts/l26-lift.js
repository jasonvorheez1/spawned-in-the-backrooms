// Level 26 lifts and the endless corridor: step in and you arrive at state.to (a point in this place), facing state.yaw.
// state.loop = true: the lower decks' far end, which drops you back at the corridor's start without a seam (Liminal Echo).
export function onTriggerEnter(ctx, other) {
  if (!other?.id?.startsWith?.("player/")) return
  const s = ctx.self.state, me = getObjectSafe(ctx, other.id); if (!me || !s.to) return
  if (s.loop) { const p = me.feetPosition; me.feetPosition = { x: p.x, y: p.y, z: p.z + s.to.dz } ; return }
  me.feetPosition = { ...s.to }; if (s.yaw != null) me.rotation = { yaw: s.yaw }
  ctx.emit("screenFlash", { color: "#000000", duration: 0.5, intensity: 1 }, { audience: { player: me.id } })
  ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-old-elevator-ding-and-doors-grinding-open.mp3", position: s.to, volume: 0.8 }, { audience: { player: me.id } })
}
const getObjectSafe = (ctx, id) => ctx.getObject(id)
