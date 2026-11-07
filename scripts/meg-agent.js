// An M.E.G. agent standing at the waypoint: turns to face whoever is near, breathes, waves the first time you come close.
// Talking (E) is handled by scripts/interact.js reading state.role; this script only keeps them alive to look at.
export function update(ctx, dt) {
  const me = ctx.self, p = me.feetPosition, m = (me.session.m ??= { t: ctx.random() * 6, waved: {} });
  m.t += dt;
  let near = null, best = 7;
  for (const pl of ctx.place.players) { const d = Math.hypot(pl.feetPosition.x - p.x, pl.feetPosition.z - p.z); if (d < best) { best = d; near = pl; } }
  const breathe = Math.sin(m.t * 1.6) * 1.5;
  let armR = 0;
  if (near) {
    const want = Math.atan2(-(near.feetPosition.x - p.x), -(near.feetPosition.z - p.z)) * 57.2958;
    const cur = me.rotation?.yaw ?? 0, d = ((want - cur + 540) % 360) - 180;
    if (Math.abs(d) > 4) me.rotation = { yaw: cur + d * Math.min(1, dt * 3) };
    if (!m.waved[near.id] && best < 5) { m.waved[near.id] = true; m.wave = m.t; }
  } else ctx.sleep(1);
  if (m.wave != null && m.t - m.wave < 1.6) armR = -150 + Math.sin((m.t - m.wave) * 12) * 18;
  me.bones = { spine: { pitch: breathe }, head: { pitch: -breathe }, armR: { roll: armR ? -armR * 0.15 : 0, pitch: armR } };
}
