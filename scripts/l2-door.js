// A Level 2 side-room door: swings on its hinge (its feet) to state.yaw0 shut or yaw0 - 95 open. scripts/interact.js flips state.open.
const SWING = 150 // degrees a second
export function update(ctx, dt) {
  const st = ctx.self.state, m = ctx.self.session, goal = (st.yaw0 ?? 0) + (st.open ? -95 : 0)
  if (m.y == null) m.y = goal
  const d = goal - m.y
  if (Math.abs(d) < 0.2) { if (m.y !== goal || !m.set) { m.y = goal; m.set = true; ctx.self.rotation = { yaw: goal } } ctx.sleep(); return }
  m.y += Math.sign(d) * Math.min(Math.abs(d), SWING * dt * (0.35 + Math.min(1, Math.abs(d) / 40)))
  ctx.self.rotation = { yaw: m.y }
}
