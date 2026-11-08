// A built spike strip: a horde creature or a hostile that walks over it is cut, and the strip wears down a little each time.
import { heard } from './lib/hear.js'
export function onTriggerEnter(ctx, other) {
  const st = other?.state; if (!st || st.dead) return
  const foe = st.horde != null || other.tags?.includes('hostile') || st.hostile === true
  if (!foe) return
  const now = ctx.now(), last = ctx.self.session.hit ?? 0
  if (now - last < 600) return
  ctx.self.session.hit = now
  const d = ctx.self.state.trap ?? 30
  st.hp = (st.hp ?? 100) - d
  const p = other.feetPosition
  ctx.emit('damageNumber', { position: { x: p.x, y: p.y + 1.2, z: p.z }, value: d, color: '#ff8a5a' })
  ctx.emit('squash', { target: other.id, axis: 'y', intensity: 0.25, duration: 0.2 })
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-wooden-spike-stab-into-flesh-thud.mp3', position: p, volume: 0.7, maxDistance: 18 })
  ctx.self.state.hp = (ctx.self.state.hp ?? 80) - 4
  if (ctx.self.state.hp <= 0) ctx.destroy(ctx.self.id)
}
