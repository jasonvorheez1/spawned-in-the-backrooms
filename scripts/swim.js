// Swimming in the scripted water volumes (tag "swimwater": Level 8's lake and flooded cavern). Runs after scripts/player.js and overrides its fall:
// deep water floats you chest-high, Space strokes up (and out onto a ledge), Ctrl/C dives; the eye under the surface tints the screen (scripts/ui.js),
// muffles the mix (scripts/underwater-audio.js) and spends breath: 20 s of it, then the water takes hp.
const FLOAT = 1.25, ENTER = 1.05, LEAVE = 0.85, SWIM_MAX = 2.6, UP = 2.6, DOWN = -2.4, BREATH_S = 20, DROWN_HP = 6 // her picks
const SPLASH = 'cdn/sfx-body-plunging-into-cold-cave-water-splash.mp3', STROKE = 'cdn/sfx-swimmer-arm-stroke-sloshing-dark-water.mp3', GASP = 'cdn/sfx-swimmer-surfacing-gasping-breath.mp3'

export function onInput(ctx, input) {
  const m = (ctx.self.session.swim ??= {})
  m.up = !!input.held?.jump; m.down = !!input.held?.crouch
}

function waterAt(ctx, m, p) {
  if (!m.ids || ctx.now() - (m.at ?? 0) > 3000) { m.at = ctx.now(); m.ids = ctx.query({ tags: ['swimwater'] }).map((r) => r.id) }
  for (const id of m.ids) {
    const b = ctx.getObject(id)?.bounds; if (!b) continue
    if (p.x < b.min.x || p.x > b.max.x || p.z < b.min.z || p.z > b.max.z || p.y > b.max.y || p.y < b.min.y - 0.6) continue
    const o = b.obb; if (o) { const dx = p.x - b.center.x, dz = p.z - b.center.z; if (Math.abs(dx * o.axes.x.x + dz * o.axes.x.z) > o.halfExtents.x || Math.abs(dx * o.axes.z.x + dz * o.axes.z.z) > o.halfExtents.z) continue }
    return b.max.y
  }
  return null
}

const snd = (ctx, clip, volume, p) => ctx.emit('playSound', { clip, volume, position: p, maxDistance: 18 })

export function update(ctx, dt) {
  if (ctx.self.isLocal === false) return
  const me = ctx.self, s = me.state, m = (me.session.swim ??= {}), p = me.feetPosition
  if (s.level == null || s.dead || (s.hp ?? 1) <= 0) { if (m.on) stop(ctx, m); return }
  const surf = waterAt(ctx, m, p), depth = surf == null ? 0 : surf - p.y
  const on = surf != null && depth > (m.on ? LEAVE : ENTER)
  if (on && !m.on) { m.on = true; s.swimming = true; if (s.crouch) s.crouch = false; snd(ctx, SPLASH, 0.5, p) }
  if (!on && m.on) stop(ctx, m)
  if (!m.on) return

  const v = me.velocity, h = Math.hypot(v.x, v.z), k = h > SWIM_MAX ? SWIM_MAX / h : 1
  const want = m.up ? UP : m.down ? DOWN : Math.max(-1.5, Math.min(1.5, (surf - FLOAT - p.y) * 2.5))
  me.velocity = { x: v.x * k, y: v.y + (want - v.y) * Math.min(1, dt * 6), z: v.z * k }
  if (s.crouch) s.crouch = false

  const moving = h > 0.4 || m.up || m.down, clip = moving ? 'cdn/clip-swim-loop.glb' : 'cdn/clip-swim-idle-loop.glb'
  if (m.clip !== clip) { m.clip = clip; me.anim.swim = { clip, loop: 'loop', weight: 5, blendIn: 0.25 } }
  if (moving) { m.stroke = (m.stroke ?? 0) + dt; if (m.stroke > 0.95) { m.stroke = 0; snd(ctx, STROKE, 0.22, p) } }

  // under the surface: the eye, not the feet
  const under = p.y + 1.45 < surf
  if (under !== !!s.underwater) { s.underwater = under; if (!under && (m.breath ?? BREATH_S) < BREATH_S * 0.6) snd(ctx, GASP, 0.45, p) }
  if (under && !m.audio) m.audio = ctx.spawn({ audience: 'local', scope: 'session', feetPosition: { x: p.x, y: p.y, z: p.z }, audio: { kind: 'program', script: 'scripts/underwater-audio.js', input: 'Master', spatial: false } })
  if (!under && m.audio) { ctx.destroy(m.audio); m.audio = null }
  breathe(ctx, m, s, under, dt)
}

function breathe(ctx, m, s, under, dt) {
  m.breath = Math.max(0, Math.min(BREATH_S, (m.breath ?? BREATH_S) + (under ? -dt : dt * 6)))
  if (under && m.breath <= 0) s.hp -= DROWN_HP * dt
  const shown = Math.round((m.breath / BREATH_S) * 20) * 5
  if (shown !== s.breath) s.breath = shown
}

function stop(ctx, m) {
  const me = ctx.self, s = me.state
  m.on = false; m.clip = null; me.anim.swim = null
  if (m.audio) { ctx.destroy(m.audio); m.audio = null }
  if (s.swimming) s.swimming = false
  if (s.underwater) s.underwater = false
  m.breath = BREATH_S; if (s.breath !== 100) s.breath = 100
}
