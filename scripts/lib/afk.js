// afk: 45 s with no key, click, stick or look turn. Shelly Nov 17: afking should not drain food, water or sanity
export const AFK_AFTER = 45000 // my pick
const any = (o) => !!o && Object.values(o).some((v) => v === true || (typeof v === "number" && Math.abs(v) > 0.05))
export function markInput(ctx, input) {
  if (any(input?.axes) || any(input?.held) || any(input?.pressed)) ctx.self.session.inputAt = ctx.now()
}
export function isAfk(ctx) {
  const s = ctx.self.session, yaw = Math.round(ctx.self.camera?.rotation?.yaw ?? 0)
  if (s.afkYaw !== yaw) { s.afkYaw = yaw; s.inputAt = ctx.now() } // turning the view counts as being there
  if (s.inputAt == null) s.inputAt = ctx.now()
  return ctx.now() - s.inputAt > AFK_AFTER
}
