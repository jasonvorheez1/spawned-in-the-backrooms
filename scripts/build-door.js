// A built door (scripts/lib/build-piece.js): interact.js flips state.open on E; this swings the leaf about its hinge.
const SWING = 100, SPEED = 260 // her pick: degrees open, degrees a second
export function update(ctx, dt) {
  const s = ctx.self.state, target = (s.yaw0 ?? 0) + (s.open ? SWING : 0)
  const m = ctx.self.session
  m.yaw ??= target
  const d = target - m.yaw
  if (Math.abs(d) < 0.5) { if (m.yaw !== target) { m.yaw = target; ctx.self.rotation = { yaw: target } } ctx.sleep(); return }
  m.yaw += Math.sign(d) * Math.min(Math.abs(d), SPEED * dt)
  ctx.self.rotation = { yaw: m.yaw }
}
