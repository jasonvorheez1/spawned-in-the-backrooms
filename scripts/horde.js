// Blackout (horde night), the 7 Days to Die clock for this game. A countdown shows on the HUD; when it ends the lights go and a horde
// is spawned round you in bursts, all hunting you (state.horde on each creature, read by smilers.js, lurkers.js and hounds.js) and tearing
// at any piece you built (B) they press against. Survive it and you are paid in XP, scrap and supplies. Numbers: lib/data/horde.yml.
// State on the player: horde ('' | 'warn' | 'night'), hordeT (seconds to the next one), hordeIn (the shown countdown), hordeAlive, hordeResult.
import H from './lib/data/horde.yml'
import { npcState } from './lib/stats.js'
import { takeToken, gain } from './player.js'
import { rollItem } from './lib/loot.js'
import { raycast, overlapPoint } from 'builtin/physics'

const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const SAFE = /hub|camp|gamma/
const KINDS_ALL = ['smiler', 'lurker', 'hound']
const mem = (ctx) => (ctx.self.session.horde ??= { acc: 0, wave: 0, nextWave: 0, left: 0, night: 0, downAt: 0 })

function say(ctx, name, volume = 0.8) {
  const p = ctx.self.feetPosition
  ctx.emit('playSound', { clip: SND(name), position: { x: p.x, y: p.y + 1.4, z: p.z }, volume, maxDistance: 60 }, { audience: { player: ctx.self.id } })
}

const mine = (ctx) => KINDS_ALL.flatMap((k) => ctx.query({ tags: [k], radius: 1e5, center: { x: 0, y: 0, z: 0 } })).filter((e) => e.state?.horde === ctx.self.id)

// a clear spot on your level, a ring away from you
function spot(ctx) {
  const p = ctx.self.feetPosition
  for (let i = 0; i < 40; i++) {
    const a = ctx.random() * Math.PI * 2, d = H.ring[0] + ctx.random() * (H.ring[1] - H.ring[0]), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d
    const down = raycast(ctx, { x, y: p.y + 2, z }, { x: 0, y: -1, z: 0 }, { distance: 4, physicsOnly: true })
    if (!down || Math.abs(down.position.y - p.y) > 1.2) continue
    const o = overlapPoint(ctx, { x, y: down.position.y + 1, z })
    if ((o?.objects ?? []).length) continue
    return { x, y: down.position.y + 0.05, z }
  }
  return null
}

function spawnOne(ctx, kind, level) {
  const t = ctx.query({ tags: [kind], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).find((e) => !e.state?.dead && e.state?.horde == null)
  const at = t && spot(ctx)
  if (!t || !at) return false
  const base = (t.state?.maxHp ?? t.state?.hp ?? 60) * (1 + H.hpPerLevel * level)
  const st = npcState(ctx, kind, base, { kind: t.state?.kind, xp: t.state?.xp, mdl: t.state?.mdl, mesh: t.state?.mesh })
  for (const k of Object.keys(st)) if (st[k] === undefined) delete st[k]
  ctx.spawn({ tags: [...t.tags], feetPosition: at, ...(t.model ? { model: t.model } : {}), ...(t.primitive ? { primitive: t.primitive } : {}), ...(t.scale ? { scale: t.scale } : {}), ...(t.material ? { material: t.material } : {}),
    physics: { body: 'character' }, state: { ...st, horde: ctx.self.id } })
  return true
}

function wave(ctx, s, m) {
  const kinds = H.kinds[ctx.self.place] ?? H.kinds.main, total = Math.min(H.cap, Math.round(H.base + H.perLevel * (s.level - 1))), n = Math.ceil(total / H.waves)
  let made = 0
  for (let i = 0; i < n; i++) if (spawnOne(ctx, kinds[Math.floor(ctx.random() * kinds.length)], s.level)) made++
  m.wave++; m.nextWave = m.night + H.waveGap
  say(ctx, 'distant-monster-roar-echo', 0.7)
}

function end(ctx, s, m, won) {
  for (const e of mine(ctx)) ctx.destroy(e.id)
  s.horde = ''; s.hordeAlive = 0; m.wave = 0
  s.hordeT = H.every[0] + ctx.random() * (H.every[1] - H.every[0])
  if (won) {
    const R = H.reward, sc = { ...(s.scrap ?? {}) }
    for (const [k, n] of Object.entries(R.scrap)) sc[k] = (sc[k] ?? 0) + n
    s.scrap = sc
    gain(ctx, R.xp + R.xpPerLevel * s.level)
    for (let i = 0; i < R.rolls; i++) takeToken(ctx, rollItem(ctx))
    s.hordeResult = { text: 'You held out. The lights come back.', sub: `+${R.xp + R.xpPerLevel * s.level} XP · scrap and supplies`, at: ctx.now() }
    say(ctx, 'power-restored-lights-hum-on', 0.8)
  } else s.hordeResult = { text: 'The blackout passes.', sub: '', at: ctx.now() }
}

export function update(ctx, dt) {
  const s = ctx.self.state, m = mem(ctx)
  if (s.level == null || !ctx.self.feetPosition) return
  s.hordeT ??= H.firstAt
  const now = ctx.now()
  if (!s.horde) {
    s.hordeT -= dt
    if (s.hordeT <= H.warn) {
      if (SAFE.test(s.zone ?? '') && s.hordeT <= H.warn) { s.hordeT = H.warn + H.postpone; return }
      s.horde = 'warn'; m.left = Math.max(1, s.hordeT); s.hordeIn = Math.ceil(m.left)
      say(ctx, 'emergency-alarm-siren-warning', 0.7); ctx.emit('screenFlash', { color: '#ffb347', duration: 0.5, intensity: 0.4 }, { audience: { player: ctx.self.id } })
    }
    return
  }
  m.acc += dt
  if (s.downAt && s.downAt !== m.downAt) { if (m.downAt && s.horde === 'night') end(ctx, s, m, false); m.downAt = s.downAt; if (!s.horde) return } // you were taken: it is over
  if (s.horde === 'warn') {
    m.left -= dt
    const c = Math.max(0, Math.ceil(m.left)); if (c !== s.hordeIn) s.hordeIn = c
    if (m.left <= 0) {
      s.horde = 'night'; m.night = 0; m.wave = 0; m.nextWave = 0
      say(ctx, 'power-down-blackout-thunk', 1); ctx.emit('screenFlash', { color: '#000000', duration: 1.4, intensity: 1 }, { audience: { player: ctx.self.id } })
    }
    return
  }
  // night
  m.night += dt
  s.sanity = Math.max(0, (s.sanity ?? 0) - H.sanityDrain * dt)
  if (m.wave < H.waves && m.night >= m.nextWave) wave(ctx, s, m)
  if (m.acc < 1) return
  m.acc = 0
  const live = mine(ctx).filter((e) => !e.state?.dead)
  if (live.length !== s.hordeAlive) s.hordeAlive = live.length
  // they tear at what you built
  for (const e of live) {
    const b = ctx.query({ tags: ['built'], radius: H.buildReach, center: e.feetPosition }).find((o) => (o.state?.hp ?? 0) > 0)
    if (!b) continue
    b.state.hp -= H.buildHit
    ctx.emit('playSound', { clip: SND('wood-plank-crack-hit'), position: b.feetPosition, volume: 0.6, maxDistance: 25 })
    if (b.state.hp <= 0) ctx.destroy(b.id)
  }
  if (m.wave >= H.waves && !live.length) return end(ctx, s, m, true)
  if (m.night >= H.night) end(ctx, s, m, true && live.length === 0)
}
