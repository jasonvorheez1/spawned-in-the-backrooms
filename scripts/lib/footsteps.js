// Dynamic footsteps: the floor read under your feet, a step every stride (faster walk, faster steps), left and right feet,
// loudness from speed, crouch and how much you carry, a scuff when you stop, a landing sized to the fall. Friends hear you.
import { raycast } from 'builtin/physics'
import FS from './data/footsteps.yml'
// a clip name, or "@kind": a take from the pack, never the one this kind played last
const lastTake = {}
function take(ctx, o, name) {
  if (typeof name !== 'string' || name[0] !== '@') return o.clip(name)
  const list = FS.pack?.[name.slice(1)]; if (!list?.length) return o.clip('footstep-damp-carpet-squelch-soft')
  let i = Math.floor(ctx.random() * list.length); if (list.length > 1 && i === lastTake[name]) i = (i + 1) % list.length
  lastTake[name] = i; return list[i]
}
const RX = FS.match.map(([k, re]) => [k, new RegExp(re, 'i')])

function texWords(o) {
  if (!o) return ''
  if (o.state?.floor) return String(o.state.floor)
  if (o.material?.kind === 'water') return 'water'
  let w = String(o.material?.texture ?? '') + ' ' + String(o.material?.map ?? '') + ' ' + String(o.material?.kind ?? '')
  const ms = o.model?.materials; if (ms) for (const m of Object.values(ms)) w += ' ' + String(m?.texture ?? '') + ' ' + String(m?.map ?? '')
  return w
}
export function surfaceUnder(ctx, fallback, at) {
  const p = at ?? ctx.self.feetPosition
  const h = raycast(ctx, { x: p.x, y: p.y + 0.3, z: p.z }, { x: 0, y: -1, z: 0 }, { distance: 1.0, ignoreEntities: [ctx.self.id], physicsOnly: true })
  if (!h) return fallback
  const o = h.id ? ctx.getObject(h.id) : null
  let words = texWords(o)
  if (!words.trim() && !o) { // terrain: its material, or the heaviest of a blend
    const m = ctx.place.terrain?.materialAt?.(p.x, p.z)
    words = m && typeof m === 'object' ? (Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '') : String(m ?? '')
  }
  if (words === 'water') return 'water'
  for (const [k, re] of RX) if (re.test(words)) return k
  return fallback
}

// w: the player's per-machine scratch. o: { moving, sprinting, crouched, wet, bur (1 = light, lower = loaded), fallback, clip(name)→url }
export function stepTick(ctx, w, dt, o) {
  const self = ctx.self, v = self.velocity, sp = Math.hypot(v.x, v.z), g = self.grounded
  const fs = w.fs ??= { dist: 0, walked: 0, foot: 1, air: 0, minVy: 0, surf: o.fallback, surfAt: 0 }
  if (!g) { fs.air += dt; fs.minVy = Math.min(fs.minVy, v.y); fs.lastY = null; return }
  const now = ctx.now()
  if (now >= fs.surfAt) { fs.surf = surfaceUnder(ctx, o.fallback); fs.surfAt = now + 220 }
  const surfKey = o.wet ? 'wet' : fs.surf
  const F = FS.surfaces[surfKey] ?? FS.surfaces[o.fallback] ?? FS.surfaces.carpet
  const heavy = Math.max(0, Math.min(1, (1 - (o.bur ?? 1)) * 2))
  if (fs.air > 0.15 && -fs.minVy >= FS.land.min) { // a landing: both feet, sized to the fall
    const k = Math.min(1, (-fs.minVy - FS.land.min) / (FS.land.hard - FS.land.min))
    play(ctx, take(ctx, o, FS.landings[F.land] ?? FS.landings["landing-hard"]), (0.35 + 0.55 * k) * (1 + heavy * 0.3), 1 - 0.06 * k - heavy * 0.04, 0)
    fs.dist = 0
  }
  fs.air = 0; fs.minVy = 0
  if (!o.moving || sp < 0.35) {
    if (fs.walked > FS.scuffAfter && sp < 0.35) play(ctx, o.clip(FS.scuff), F.v * 0.7 * (o.crouched ? FS.loud.crouch : 1), 0.95 + ctx.random() * 0.1, 0)
    fs.walked = 0; fs.dist = Math.max(fs.dist, 0.6 * strideOf(o, sp)); return
  }
  fs.dist += sp * dt; fs.walked += sp * dt
  const stride = strideOf(o, sp)
  if (fs.dist < stride) return
  fs.dist -= stride; fs.foot = -fs.foot
  // the planting foot reads its own ground: a step off the path onto grass sounds on the grass
  { const fp = ctx.self.feetPosition, k = FS.side * fs.foot / (sp || 1)
    const s2 = surfaceUnder(ctx, o.fallback, { x: fp.x - v.z * k + (v.x / (sp || 1)) * 0.3, y: fp.y, z: fp.z + v.x * k + (v.z / (sp || 1)) * 0.3 })
    if (!o.wet) { fs.surf = s2; fs.surfAt = now + 220 } }
  const F2 = FS.surfaces[o.wet ? 'wet' : fs.surf] ?? F
  // grade since the last step: downhill lands heavier, uphill lighter; a drop off a kerb or step gets its own soft thump
  const y = ctx.self.feetPosition.y, dy = fs.lastY == null ? 0 : y - fs.lastY; fs.lastY = y
  const grade = Math.max(-1, Math.min(1, -dy / Math.max(0.3, stride)))
  const slopeK = 1 + (grade > 0 ? grade * FS.slope.down : -grade * FS.slope.up)
  if (-dy > FS.stepDown && -dy < FS.land.min * 0.3) play(ctx, take(ctx, o, FS.landings[F2.land] ?? FS.landings["landing-soft"]), F2.v * 0.8 * (o.crouched ? FS.loud.crouch : 1), 1.05, 0)
  const run = sp >= FS.runSpeed
  const pace = Math.min(1, sp / 7)
  const vol = slopeK * F2.v * (FS.loud.walkMin + (FS.loud.runMax - FS.loud.walkMin) * pace) * (o.crouched ? FS.loud.crouch : 1) * (1 + heavy * FS.loud.heavyMax) * (0.88 + ctx.random() * 0.24)
  const pitch = 1 + fs.foot * FS.pitch.foot + (ctx.random() * 2 - 1) * FS.pitch.jitter + heavy * FS.pitch.heavy
  play(ctx, take(ctx, o, run ? F2.run : F2.walk), vol, pitch, fs.foot)
}
function strideOf(o, sp) {
  const S = FS.stride
  if (o.crouched) return S.crouch
  return sp >= FS.runSpeed ? S.run : S.walk + (S.run - S.walk) * Math.max(0, Math.min(1, (sp - 2) / (FS.runSpeed - 2))) * 0.5
}
function play(ctx, clip, volume, pitch, foot) {
  const p = ctx.self.feetPosition, v = ctx.self.velocity, sp = Math.hypot(v.x, v.z) || 1
  const sx = -v.z / sp, sz = v.x / sp // to the right of travel
  ctx.emit('playSound', { clip, volume, pitch, position: { x: p.x + sx * FS.side * foot, y: p.y + 0.05, z: p.z + sz * FS.side * foot }, maxDistance: FS.hearRange, refDistance: 2, bus: 'Footsteps', mode: 'overlap' }, { audience: { nearby: p, radius: FS.hearRange } })
}
