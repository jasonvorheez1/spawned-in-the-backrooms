// Level 22: the top floor's ceiling came down, and the rubble climbs out through a hole in Level 21's floor (Wikidot exit).
export function onTriggerEnter(ctx, other) {
  if (!other?.isLocal || !String(other.id).startsWith("player/")) return
  const o = ctx.getObject(other.id); if (!o) return
  if (o.state) o.state.notice = { text: "You haul yourself up through the floor of somewhere else.", at: ctx.now() }
  ctx.cross(o, "level21")
}
