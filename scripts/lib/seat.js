// Sitting on any chair, sofa or stool tagged "seat". A seat's own frame faces -Z (its sitter looks -Z, its back at +Z).
// state.seat = { d: hips depth along the seat (m, + toward the back), w: how many sit side by side, gap: their spacing }.
// The player sits with E (scripts/interact.js), stands with E or any move key. Sitting down: the body turns to the seat's
// facing and glides back onto it while the sit pose blends in over SIT_S; standing: the pose blends out and the body
// steps forward off it. NPCs sit with seatFor + pose (scripts/lib/l4-people.js).
export const SIT_S = 0.55, STAND_S = 0.4
export const SIT_CLIP = { m: 'cdn/clip-sit-loop.glb', f: 'cdn/clip-sit-female-loop.glb' }
const fwdOf = (yaw) => { const r = (yaw * Math.PI) / 180; return { x: -Math.sin(r), z: -Math.cos(r) } }
const yawOf = (rot) => (typeof rot === 'number' ? rot : rot?.yaw != null ? rot.yaw : rot?.w != null ? (2 * Math.atan2(rot.y, rot.w) * 180) / Math.PI : 0)
// every place a body can sit on this seat: the floor point under the hips and the yaw to face
export function spotsOf(seat) {
  const y = yawOf(seat.rotation), f = fwdOf(y), r = { x: -f.z, z: f.x }, c = seat.state?.seat ?? {}, n = c.w ?? 1, gap = c.gap ?? 0.62, d = c.d ?? 0.04
  const p = seat.feetPosition, out = []
  for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * gap; out.push({ i, yaw: y, x: p.x - f.x * d + r.x * o, y: p.y, z: p.z - f.z * d + r.z * o }) }
  return out
}
// the nearest free spot on a seat within reach of a point (NPCs keep their seat in state.sitOn)
export function seatFor(ctx, at, radius = 1.6, by = null) {
  const rows = ctx.query({ tags: ['seat'], center: at, radius: radius + 1.5 })
  let best = null, bd = radius
  for (const row of rows) {
    const seat = ctx.getObject(row.id); if (!seat) continue
    const taken = seat.state?.by ?? {}
    for (const s of spotsOf(seat)) {
      if (taken[s.i] && taken[s.i] !== by) continue
      const dd = Math.hypot(s.x - at.x, s.z - at.z); if (dd < bd) { bd = dd; best = { id: seat.id, ...s } }
    }
  }
  return best
}
const claim = (ctx, id, i, who) => { const o = ctx.getObject(id); if (o) o.state.by = { ...(o.state.by ?? {}), [i]: who } }
const free = (ctx, id, i, who) => { const o = ctx.getObject(id); if (o && o.state.by?.[i] === who) { const b = { ...o.state.by }; delete b[i]; o.state.by = b } }
const sexOf = (body) => (body.state?.look?.sex === 'f' ? 'f' : 'm')
// the player presses E on a seat
export function sitDown(ctx, seat) {
  const me = ctx.self, s = me.state
  if (s.sit) return
  const at = me.feetPosition
  let best = null, bd = 1e9
  for (const sp of spotsOf(seat)) { if (seat.state?.by?.[sp.i] && seat.state.by[sp.i] !== me.id) continue; const dd = Math.hypot(sp.x - at.x, sp.z - at.z); if (dd < bd) { bd = dd; best = sp } }
  if (!best) return false
  claim(ctx, seat.id, best.i, me.id)
  s.sit = { id: seat.id, i: best.i, x: best.x, y: best.y, z: best.z, yaw: best.yaw, from: { x: at.x, y: at.y, z: at.z }, fromYaw: yawOf(me.rotation), at: ctx.now(), phase: 'down' }
  me.anim.sit = { clip: SIT_CLIP[sexOf(me)], loop: 'loop', weight: 1, blendIn: SIT_S }
  ctx.emit('playSound', { clip: '/cdn/moodboard-realistic-gritty/sfx-old-chair-creak-sit-down.mp3', position: { x: best.x, y: best.y + 0.5, z: best.z }, volume: 0.6, maxDistance: 10 }, { audience: { nearby: best, radius: 12 } })
  return true
}
export function standUp(ctx) {
  const me = ctx.self, s = me.state
  if (!s.sit || s.sit.phase === 'up') return
  const f = fwdOf(s.sit.yaw)
  s.sit = { ...s.sit, phase: 'up', at: ctx.now(), to: { x: s.sit.x + f.x * 0.55, y: s.sit.y, z: s.sit.z + f.z * 0.55 } }
  me.anim.sit = null
  ctx.emit('playSound', { clip: '/cdn/moodboard-realistic-gritty/sfx-wooden-chair-scrape-stand-up.mp3', position: { x: s.sit.x, y: s.sit.y + 0.5, z: s.sit.z }, volume: 0.5, maxDistance: 10 }, { audience: { nearby: s.sit, radius: 12 } })
}
const ease = (k) => k * k * (3 - 2 * k)
const lerpYaw = (a, b, k) => { let d = ((b - a + 540) % 360) - 180; return a + d * k }
// held every frame while seated or moving onto / off the seat (the player's own machine)
export function seatTick(ctx) {
  const me = ctx.self, s = me.state.sit
  if (!s) return false
  const seat = ctx.getObject(s.id)
  if (!seat && s.phase !== 'up') { standUp(ctx); return true }
  const k = Math.min(1, (ctx.now() - s.at) / 1000 / (s.phase === 'up' ? STAND_S : SIT_S)), e = ease(k)
  const v = me.velocity
  if (s.phase === 'down') {
    me.feetPosition = { x: s.from.x + (s.x - s.from.x) * e, y: s.y, z: s.from.z + (s.z - s.from.z) * e }
    me.rotation = { yaw: lerpYaw(s.fromYaw, s.yaw, Math.min(1, e * 1.6)) }
    me.velocity = { x: 0, y: 0, z: 0 }
    if (k >= 1) me.state.sit = { ...s, phase: 'sat' }
  } else if (s.phase === 'sat') {
    const p = me.feetPosition
    if (Math.abs(p.x - s.x) + Math.abs(p.z - s.z) > 0.02) me.feetPosition = { x: s.x, y: s.y, z: s.z }
    me.velocity = { x: 0, y: Math.min(0, v.y), z: 0 }
  } else {
    me.feetPosition = { x: s.x + (s.to.x - s.x) * e, y: s.y, z: s.z + (s.to.z - s.z) * e }
    me.velocity = { x: 0, y: 0, z: 0 }
    if (k >= 1) { free(ctx, s.id, s.i, me.id); me.state.sit = null }
  }
  return true
}
export { claim, free, yawOf }
