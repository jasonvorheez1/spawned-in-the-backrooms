// debug room: step on the pad to flip everyone between human and furry bodies (same switch as the menu's BODIES)
export function onTriggerEnter(ctx, other) {
  if (!other?.userId) return
  const now = ctx.now(); if (now < (ctx.self.session.until ?? 0)) return
  ctx.self.session.until = now + 1500
  const next = (other.state.bodyStyle ?? ctx.world.state.bodyStyle) === "human" ? "furry" : "human"
  other.state.bodyStyle = next; ctx.world.state.bodyStyle = next
  ctx.self.state.label = next.toUpperCase()
  ctx.emit("playSound", { clip: "/cdn/moodboard-scifi-neon/sfx-soft-digital-toggle-click.mp3", position: ctx.self.feetPosition, volume: 0.6 })
  ctx.emit("flash", { target: ctx.self.id, color: "#ffd9a0", duration: 0.3 })
}
