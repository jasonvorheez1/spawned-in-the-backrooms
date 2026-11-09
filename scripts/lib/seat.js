// Sitting on any chair, sofa or stool tagged "seat". A seat's own frame faces -Z (its sitter looks -Z, its back at +Z).
// state.seat = { d: hips depth along the seat (m, + toward the back), w: how many sit side by side, gap: their spacing }.
// E sits (scripts/interact.js), E or a move key stands. The body is PARENTED to the seat for the whole sit, so the seat's
// collider never shoves it: sitting down it glides in the seat's own frame from where it stood onto the spot and turns to
// face out while the sit pose blends in; standing it steps forward, the pose blends out, and the seat lets it go.
// scripts/camera.js pulls the eye out to third person through both glides.
import { heard } from "./hear.js";
export const SIT_S = 0.7, STAND_S = 0.55
const LIFT = 0.1 // Savi's pick: the sit clip's hips sat below the cushion; a seat's own state.seat.y overrides
export const SIT_CLIP = { m: 'cdn/clip-sit-loop.glb', f: 'cdn/clip-sit-female-loop.glb' }
const yawOf = (rot) => (typeof rot === 'number' ? rot : rot?.yaw != null ? rot.yaw : rot?.w != null ? (2 * Math.atan2(rot.y, rot.w) * 180) / Math.PI : 0)
const fwdOf = (yaw) => { const r = (yaw * Math.PI) / 180; return { x: -Math.sin(r), z: -Math.cos(r) } }
// local spots on the seat (its own frame): x across, z toward the back
function localSpots(seat) {
  const c = seat.state?.seat ?? {}, n = c.w ?? 1, gap = c.gap ?? 0.62, d = c.d ?? 0.0, out = []
  for (let i = 0; i < n; i++) out.push({ i, lx: (i - (n - 1) / 2) * gap, lz: d, ly: c.y ?? LIFT })
  return out
}
// world spots (for focus and NPCs)
export function spotsOf(seat) {
  const y = yawOf(seat.rotation), f = fwdOf(y), r = { x: -f.z, z: f.x }, p = seat.feetPosition
  return localSpots(seat).map((s) => ({ i: s.i, yaw: y, x: p.x + r.x * s.lx - f.x * s.lz, y: p.y, z: p.z + r.z * s.lx - f.z * s.lz }))
}
// world point → seat-local
function toLocal(seat, w) {
  const y = yawOf(seat.rotation), f = fwdOf(y), r = { x: -f.z, z: f.x }, p = seat.feetPosition, dx = w.x - p.x, dz = w.z - p.z
  return { x: dx * r.x + dz * r.z, z: -(dx * f.x + dz * f.z) }
}
export function seatFor(ctx, at, radius = 1.6, by = null) {
  let best = null, bd = radius
  for (const row of ctx.query({ tags: ['seat'], center: at, radius: radius + 1.5 })) {
    const seat = ctx.getObject(row.id); if (!seat) continue
    for (const s of spotsOf(seat)) { const t = seat.state?.by?.[s.i]; if (t && t !== by) continue; const dd = Math.hypot(s.x - at.x, s.z - at.z); if (dd < bd) { bd = dd; best = { id: seat.id, ...s } } }
  }
  return best
}
const claim = (ctx, id, i, who) => { const o = ctx.getObject(id); if (o) o.state.by = { ...(o.state.by ?? {}), [i]: who } }
const free = (ctx, id, i, who) => { const o = ctx.getObject(id); if (o && o.state.by?.[i] === who) { const b = { ...o.state.by }; delete b[i]; o.state.by = b } }
const sexOf = (body) => (body.state?.look?.sex === 'f' || body.state?.look?.body === 'f' ? 'f' : 'm')
const SIT_SND = '/cdn/moodboard-realistic-gritty/sfx-soft-cushion-sit-down-fabric-rustle.mp3'
const STAND_SND = '/cdn/moodboard-realistic-gritty/sfx-clothing-rustle-getting-up-from-seat.mp3'

export function sitDown(ctx, seat) {
  const me = ctx.self, s = me.state
  if (s.sit) return false
  const lp = toLocal(seat, me.feetPosition)
  let best = null, bd = 1e9
  for (const sp of localSpots(seat)) { const t = seat.state?.by?.[sp.i]; if (t && t !== me.id) continue; const dd = Math.hypot(sp.lx - lp.x, sp.lz - lp.z); if (dd < bd) { bd = dd; best = sp } }
  if (!best) return false
  claim(ctx, seat.id, best.i, me.id)
  const fromYaw = ((yawOf(me.rotation) - yawOf(seat.rotation) + 540) % 360) - 180
  me.velocity = { x: 0, y: 0, z: 0 }
  me.parent = seat.id
  me.feetPosition = { x: lp.x, y: 0, z: lp.z }
  me.rotation = { yaw: fromYaw }
  s.sit = { id: seat.id, i: best.i, lx: best.lx, lz: best.lz, ly: best.ly, fx: lp.x, fz: lp.z, fromYaw, at: ctx.now(), phase: 'down' }
  me.anim.sit = { clip: SIT_CLIP[sexOf(me)], loop: 'loop', weight: 1, blendIn: SIT_S }
  const w = spotsOf(seat)[best.i]
  heard(ctx, { clip: SIT_SND, position: { x: w.x, y: w.y + 0.5, z: w.z }, volume: 0.45, maxDistance: 8 }, { audience: { nearby: w, radius: 10 } })
  return true
}
export function standUp(ctx) {
  const me = ctx.self, s = me.state
  if (!s.sit || s.sit.phase === 'up') return
  me.state.sit = { ...s.sit, phase: 'up', at: ctx.now() }
  me.anim.sit = null
  const p = me.worldFeetPosition ?? me.feetPosition
  heard(ctx, { clip: STAND_SND, position: { x: p.x, y: p.y + 0.5, z: p.z }, volume: 0.4, maxDistance: 8 }, { audience: { nearby: p, radius: 10 } })
}
const ease = (k) => k * k * (3 - 2 * k)
const lerpYaw = (a, b, k) => a + ((((b - a) + 540) % 360) - 180) * k
// every frame on the sitter's own machine while state.sit stands
export function seatTick(ctx) {
  const me = ctx.self, s = me.state.sit
  if (!s) return false
  const seat = ctx.getObject(s.id)
  if (!seat) { me.parent = null; free(ctx, s.id, s.i, me.id); me.anim.sit = null; me.state.sit = null; return true }
  if (me.parent?.id !== s.id && s.phase !== 'up') me.parent = s.id
  const k = Math.min(1, (ctx.now() - s.at) / 1000 / (s.phase === 'up' ? STAND_S : SIT_S)), e = ease(k)
  me.velocity = { x: 0, y: 0, z: 0 }
  if (s.phase === 'down') {
    me.feetPosition = { x: s.fx + (s.lx - s.fx) * e, y: (s.ly ?? 0) * e, z: s.fz + (s.lz - s.fz) * e }
    me.rotation = { yaw: lerpYaw(s.fromYaw, 0, Math.min(1, e * 1.5)) }
    if (k >= 1) me.state.sit = { ...s, phase: 'sat', satAt: ctx.now() }
  } else if (s.phase === 'sat') {
    const p = me.feetPosition
    if (Math.abs(p.x - s.lx) + Math.abs(p.z - s.lz) > 0.01 || Math.abs(p.y - (s.ly ?? 0)) > 0.01) { me.feetPosition = { x: s.lx, y: s.ly ?? 0, z: s.lz }; me.rotation = { yaw: 0 } }
  } else {
    me.feetPosition = { x: s.lx, y: (s.ly ?? 0) * (1 - e), z: s.lz - 0.6 * e }
    if (k >= 1) { me.parent = null; free(ctx, s.id, s.i, me.id); me.state.sit = null; if (s.land) { me.feetPosition = s.land; me.velocity = { x: 0, y: 0, z: 0 }; if (me.state.swimming) me.state.swimming = false } }
  }
  return true
}
export { claim, free, yawOf }
