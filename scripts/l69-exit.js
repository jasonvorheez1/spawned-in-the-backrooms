// Level 69: the end of the seventeen-hour tunnel. Walking through the light lets you out into Level 11.
export function onTriggerEnter(ctx, other) {
  if (!other?.isLocal || !String(other.id).startsWith("player/")) return
  const o = ctx.getObject(other.id); if (!o) return
  if (o.state) o.state.notice = { text: "Daylight. Traffic noise. A city that goes on forever.", at: ctx.now() }
  ctx.cross(o, "level11")
}
