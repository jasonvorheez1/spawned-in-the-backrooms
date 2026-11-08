// A kicked foe's fall, shared by every enemy manager (Shelly: kicks ragdoll them, they get up quickly).
// scripts/kick.js writes state.down (knocked flat) or state.kb (a stagger shove); each manager calls knocked() first
// in its per-entity step and skips its own AI while it answers true.
export function knocked(ctx, e, now, dt) {
  const s = e.state; if (!s || s.dead || (s.hp ?? 1) <= 0) return false
  const g = ctx.place.gravity?.y ?? -9.8, vy = (e.velocity?.y ?? 0) + g * dt
  const yaw = typeof e.rotation === "number" ? e.rotation : (e.rotation?.yaw ?? 0)
  if (s.heldBy) { // in someone's arms: the holder's machine places it
    if (now - (s.heldAt ?? 0) > 8000) { s.heldBy = null } else { e.velocity = { x: 0, y: 0, z: 0 }; return true }
  }
  const d = s.down
  if (d) {
    const t = now - d.at
    if (d.y0 != null && e.feetPosition.y < d.y0 - 8) { s.hp = 0; s.dead = true; s.overboard = true; s.down = null; return false } // thrown off a ledge: gone, and no xp (Shelly)
    if (d.fly && !(t > 250 && e.grounded) && t < 4000) { e.velocity = { x: d.x, y: vy, z: d.z }; e.rotation = { yaw, pitch: -80 }; d.at = now - 250; return true } // still airborne: keeps its throw
    if (t > d.ms + 450) { s.down = null; e.rotation = { yaw, pitch: 0 }; return false }
    const k = Math.max(0, 1 - t / 450)
    e.velocity = { x: d.x * k, y: vy, z: d.z * k }
    e.rotation = { yaw, pitch: t < 250 ? -80 * t / 250 : t < d.ms ? -80 : -80 * (1 - (t - d.ms) / 450) }
    return true
  }
  const kb = s.kb
  if (kb) {
    const t = now - kb.at
    if (t > kb.ms) { s.kb = null; return false }
    const k = 1 - t / kb.ms
    e.velocity = { x: kb.x * k, y: vy, z: kb.z * k }
    return true
  }
  return false
}
