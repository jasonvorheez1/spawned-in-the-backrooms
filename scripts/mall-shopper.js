// A Bonus Room shopper: strolls between walkway waypoints, stops to look at shop windows, then moves on.
// Kinematic, one per critter; it sleeps when no player is in the mall.
const PTS = [
  [7.5, 28], [7.5, 18], [7.5, 8], [7.5, -4], [7.5, -12], [7.5, -20],
  [-7.5, 28], [-7.5, 18], [-7.5, 8], [-7.5, -4], [-7.5, -12], [-7.5, -20],
  [2.5, 28], [-2.5, 28], [2.5, -4], [-2.5, -4], [2.5, -12], [-2.5, -12],
]
const LINKS = { 0: [1, 12], 1: [0, 2], 2: [1, 3], 3: [2, 4, 14], 4: [3, 5, 16], 5: [4],
  6: [7, 13], 7: [6, 8], 8: [7, 9], 9: [8, 10, 15], 10: [9, 11, 17], 11: [10],
  12: [0, 13], 13: [12, 6], 14: [3, 15], 15: [14, 9], 16: [4, 17], 17: [16, 10] }
const SPEED = 1.15 // m/s, her pick: an unhurried mall stroll

export function shopperFeet(at) {
  const [x, z] = PTS[at]
  return { x, y: 0.05, z }
}

export function onSpawn(ctx) {
  const st = ctx.self.state
  if (st.at == null) st.at = Math.floor(ctx.random() * PTS.length)
  ctx.self.feetPosition = shopperFeet(st.at)
  ctx.self.session.pause = ctx.now() + ctx.random() * 4000
}

export function update(ctx, dt) {
  if (!ctx.place.players.length) return ctx.sleep(5)
  const s = ctx.self.session, st = ctx.self.state
  if (s.pause && ctx.now() < s.pause) return
  if (s.pause) { // pick the next stop
    s.pause = 0
    const nb = LINKS[st.at] ?? [0]
    st.at = nb[Math.floor(ctx.random() * nb.length)]
    ctx.self.anim.walk = { clip: "cdn/clip-walk-loop.glb", loop: true, weight: 1 }
    ctx.self.anim.idle = { clip: "cdn/clip-idle-loop.glb", loop: true, weight: 0 }
  }
  const g = PTS[st.at], f = ctx.self.feetPosition
  const dx = g[0] - f.x, dz = g[1] - f.z, d = Math.hypot(dx, dz)
  if (d < 0.15) {
    ctx.self.anim.walk = { clip: "cdn/clip-walk-loop.glb", loop: true, weight: 0 }
    ctx.self.anim.idle = { clip: "cdn/clip-idle-loop.glb", loop: true, weight: 1 }
    // at a lane end beside the shops, turn to face the window
    if (Math.abs(g[0]) > 7) ctx.self.rotation = { yaw: g[0] > 0 ? -90 : 90 }
    s.pause = ctx.now() + 2500 + ctx.random() * 6000
    return
  }
  const step = Math.min(d, SPEED * dt)
  ctx.self.feetPosition = { x: f.x + dx / d * step, y: 0.05, z: f.z + dz / d * step }
  ctx.self.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI }
}
