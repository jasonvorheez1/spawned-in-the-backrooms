// An automatic sliding glass door (the Snackrooms' way out to the restaurant on Level 11): each panel slides apart when anyone walks within 3.5 m, and closes again a few seconds after.
// Put this behavior on a panel with state { slide: <metres it travels along its own x>, axis: "x" | "z" , home: { x, z } }. Panels are kinematic, so they push nothing and block until open.
const SPEED = 2.2;
export function update(ctx, dt) {
  const me = ctx.self, s = me.state, m = (me.session.d ??= { t: 0 }), now = ctx.now(), h = s.home ?? me.feetPosition;
  const near = ctx.place.players.some((p) => Math.hypot(p.feetPosition.x - (s.sense?.x ?? h.x), p.feetPosition.z - (s.sense?.z ?? h.z)) < 3.5);
  if (near) m.openUntil = now + 3500;
  const want = now < (m.openUntil ?? 0) ? 1 : 0;
  if (Math.abs(m.t - want) < 0.001) return;
  m.t += Math.sign(want - m.t) * Math.min(Math.abs(want - m.t), (SPEED * dt) / Math.max(0.1, Math.abs(s.slide ?? 1)));
  const o = (s.slide ?? 1) * m.t;
  me.feetPosition = s.axis === "z" ? { x: h.x, y: me.feetPosition.y, z: h.z + o } : { x: h.x + o, y: me.feetPosition.y, z: h.z };
}
