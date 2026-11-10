// The storeroom's rolling shutter: interact.js / lockpick.js flip state.open; it rattles up 2.3 m or rolls down.
export function update(ctx, dt) {
  const st = ctx.self.state, m = ctx.self.session, goal = (st.y0 ?? ctx.self.feetPosition.y) + (st.open ? 2.3 : 0)
  if (m.y == null) m.y = goal
  const d = goal - m.y
  if (Math.abs(d) < 0.005) { if (!m.set) { m.set = true; ctx.self.feetPosition = { ...ctx.self.feetPosition, y: goal } } ctx.sleep(); return }
  m.set = false; m.y += Math.sign(d) * Math.min(Math.abs(d), 1.4 * dt)
  ctx.self.feetPosition = { ...ctx.self.feetPosition, y: m.y }
}
