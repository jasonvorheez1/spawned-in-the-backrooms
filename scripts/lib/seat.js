// Sitting on any chair, sofa or stool tagged "seat". A seat's own frame faces -Z (its sitter looks -Z, its back at +Z).
// state.seat = { d: hips depth along the seat (m, + toward the back), w: how many sit side by side, gap: their spacing }.
// E sits (scripts/interact.js), E or a move key stands. The body is PARENTED to the seat for the whole sit, so the seat's
// collider never shoves it: sitting down it glides in the seat's own frame from where it stood onto the spot and turns to
// face out while the sit pose blends in; standing it steps forward, the pose blends out, and the seat lets it go.
// scripts/camera.js pulls the eye out to third person through both glides.
import { heard } from "./hear.js";
import { raycast } from "builtin/physics";
export const SIT_S = 0.7, STAND_S = 0.55
const LIFT = 0.1 // Savi's pick: the sit clip's hips sat below the cushion; a seat's own state.seat.y overrides
export const SIT_CLIP = { m: 'cdn/clip-sit-loop.glb', f: 'cdn/clip-sit-female-loop.glb' }
const yawOf = (rot) => (typeof rot === 'number' ? rot : rot?.yaw != null ? rot.yaw : rot?.w != null ? (2 * Math.atan2(rot.y, rot.w) * 180) / Math.PI : 0)
const fwdOf = (yaw) => { const r = (yaw * Math.PI) / 180; return { x: -Math.sin(r), z: -Math.cos(r) } }
// local spots on the seat (its own frame): x across, z toward the back
function localSpots(seat) {
  const c = seat.state?.seat ?? {}, n = c.w ?? 1, gap = c.gap ?? 0.62, d = c.d ?? 0.0, out = []
  for (let i = 0; i < n; i++) out.push({ i, lx: (i - (n - 1) / 2) * gap, lz: d, ly: c.y ?? LIFT, ox: c.out?.x ?? 0, oz: c.out?.z ?? -0.6 }) // out: where standing up steps to, in the seat's frame (a mirror chair steps aside, never into its vanity)
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
// who holds spot i: a claim whose sitter left the room, crossed away or sits elsewhere is no claim (a stale chair never reads taken)
export function holder(ctx, seat, i) {
  const t = seat.state?.by?.[i]; if (!t) return null
  const p = ctx.getObject(t)
  return p && p.state?.sit?.id === seat.id ? t : null
}
export function seatFor(ctx, at, radius = 1.6, by = null) {
  let best = null, bd = radius
  for (const row of ctx.query({ tags: ['seat'], center: at, radius: radius + 1.5 })) {
    const seat = ctx.getObject(row.id); if (!seat) continue
    for (const s of spotsOf(seat)) { const t = holder(ctx, seat, s.i); if (t && t !== by) continue; const dd = Math.hypot(s.x - at.x, s.z - at.z); if (dd < bd) { bd = dd; best = { id: seat.id, ...s } } }
  }
  return best
}
const claim = (ctx, id, i, who) => { const o = ctx.getObject(id); if (o) o.state.by = { ...(o.state.by ?? {}), [i]: who } }
const free = (ctx, id, i, who) => { const o = ctx.getObject(id); if (o && o.state.by?.[i] === who) { const b = { ...o.state.by }; delete b[i]; o.state.by = b } }
const sexOf = (body) => (body.state?.look?.sex === 'f' || body.state?.look?.body === 'f' ? 'f' : 'm')
const SIT_SND = '/cdn/moodboard-realistic-gritty/sfx-soft-cushion-sit-down-fabric-rustle.mp3'
const STAND_SND = '/cdn/moodboard-realistic-gritty/sfx-clothing-rustle-getting-up-from-seat.mp3'

// Shelly Nov 13: "they usually are too low": the sit clip's hips ride HIP above the feet, so the feet go to the cushion's
// own height minus HIP. The cushion is measured on the seat's mesh: rays down across the spot, the lowest surface of the seat
// between 0.25 and 0.95 m (armrests and backs stand higher). A seat's state.seat.y still wins.
export const HIP = 0.12 // Savi's pick, read off a seated customer: hips sat 0.13 m over the feet
export function cushionLift(ctx, seat, sp, ignore) {
  const y = yawOf(seat.rotation), f = fwdOf(y), r = { x: -f.z, z: f.x }, p = seat.worldFeetPosition ?? seat.feetPosition
  const top = (seat.bounds?.max?.y ?? p.y + 1.5) + 0.05
  let best = null
  for (const dz of [0, 0.12, -0.12, 0.24]) for (const dx of [0, 0.12, -0.12]) {
    const lx = sp.lx + dx, lz = sp.lz + dz
    const o = { x: p.x + r.x * lx - f.x * lz, y: top, z: p.z + r.z * lx - f.z * lz }
    const hit = raycast(ctx, o, { x: 0, y: -1, z: 0 }, { distance: top - p.y + 0.1, hits: 'geometry', ignoreEntities: ignore })
    if (!hit || !String(hit.id ?? '').startsWith(seat.id)) continue
    const h = hit.position.y - p.y
    if (h > 0.25 && h < 0.95 && (best == null || h < best)) best = h
  }
  return best == null ? null : Math.max(LIFT, best - HIP)
}

export function sitDown(ctx, seat) {
  const me = ctx.self, s = me.state
  if (s.sit) return false
  const lp = toLocal(seat, me.feetPosition)
  let best = null, bd = 1e9
  for (const sp of localSpots(seat)) { const t = holder(ctx, seat, sp.i); if (t && t !== me.id) continue; const dd = Math.hypot(sp.lx - lp.x, sp.lz - lp.z); if (dd < bd) { bd = dd; best = sp } }
  if (!best) return false
  if (seat.state?.seat?.y == null) { const ly = cushionLift(ctx, seat, best, [me.id]); if (ly != null) best = { ...best, ly } }
  claim(ctx, seat.id, best.i, me.id)
  const fromYaw = ((yawOf(me.rotation) - yawOf(seat.rotation) + 540) % 360) - 180
  me.velocity = { x: 0, y: 0, z: 0 }
  me.parent = seat.id
  me.feetPosition = { x: lp.x, y: 0, z: lp.z }
  me.rotation = { yaw: fromYaw }
  s.sit = { id: seat.id, i: best.i, lx: best.lx, lz: best.lz, ly: best.ly, ox: best.ox, oz: best.oz, fx: lp.x, fz: lp.z, fromYaw, at: ctx.now(), phase: 'down' }
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
    if (seat.state?.by?.[s.i] && seat.state.by[s.i] !== me.id && ctx.now() - (s.satAt ?? 0) > 400) { me.parent = null; me.anim.sit = null; me.state.sit = null; me.state.notice = { text: 'Someone beat you to that seat', at: ctx.now() }; if (me.state.salonOpen) { me.state.salonOpen = false; me.state.wardrobeOpen = false } return true } // two sat in the same instant: the claim that landed last keeps it
    const p = me.feetPosition
    if (Math.abs(p.x - s.lx) + Math.abs(p.z - s.lz) > 0.01 || Math.abs(p.y - (s.ly ?? 0)) > 0.01) { me.feetPosition = { x: s.lx, y: s.ly ?? 0, z: s.lz }; me.rotation = { yaw: 0 } }
  } else {
    me.feetPosition = { x: s.lx + (s.ox ?? 0) * e, y: (s.ly ?? 0) * (1 - e), z: s.lz + (s.oz ?? -0.6) * e }
    if (k >= 1) { me.parent = null; free(ctx, s.id, s.i, me.id); me.state.sit = null; if (s.land) { me.feetPosition = s.land; me.velocity = { x: 0, y: 0, z: 0 }; if (me.state.swimming) me.state.swimming = false } }
  }
  return true
}
export { claim, free, yawOf }
