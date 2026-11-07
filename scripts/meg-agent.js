// An M.E.G. agent at the waypoint: idles, turns to face whoever comes near, waves the first time they do.
// Talking (E) is scripts/interact.js reading state.role.
export function onSpawn(ctx) { ctx.self.anim.idle = { clip: "Idle", loop: "loop", weight: 1 } }
export function update(ctx, dt) {
  const me = ctx.self, p = me.feetPosition, m = (me.session.m ??= { waved: {} });
  if (!me.anim.idle) me.anim.idle = { clip: "Idle", loop: "loop", weight: 1 };
  let near = null, best = 7;
  for (const pl of ctx.place.players) { const d = Math.hypot(pl.feetPosition.x - p.x, pl.feetPosition.z - p.z); if (d < best) { best = d; near = pl; } }
  if (!near) { ctx.sleep(1); return; }
  const want = Math.atan2(-(near.feetPosition.x - p.x), -(near.feetPosition.z - p.z)) * 57.2958;
  const cur = me.rotation?.yaw ?? 0, d = ((want - cur + 540) % 360) - 180;
  if (Math.abs(d) > 4) me.rotation = { yaw: cur + d * Math.min(1, dt * 3) };
  if (!m.waved[near.id] && best < 5) {
    m.waved[near.id] = true;
    me.anim.wave = { clip: "cdn/clip-wave-loop.glb", loop: "once", weight: 1, blendIn: 0.25, blendOut: 0.4 };
  }
}
