// Wheeled things (office chairs, carts): walk into one and it rolls ahead of you; press L (kick) with one in front
// and it shoots off on its casters, slamming whatever entity it meets. Runs on the kicker's own machine.
// Tunables are Savi's picks: kick 8 m/s, rolling friction 5 m/s², hit 14 + 3 per m/s of speed, a 1.2 s stagger.
import { raycast } from 'builtin/physics'
import { hitTarget } from './player.js'
import { animate } from 'builtin/tween'
import { HUMAN, humanBody } from './lib/critter-model.js'
import { attrsOf } from './lib/stats.js'
import { foeStats } from './lib/knock.js'
import { kickLoose, stepFlights } from './lib/loose.js'
// kicking a foe (Shelly: physics, ragdoll by strength/agility). Savi's picks: power = HAR + 0.6 AGI vs the foe's heft;
// under 0.8x heft barely moves it, up to 1.4x staggers, past that knocks it down for ~1.1 s, then it gets up
const HEFT = { partygoer: 6, hound: 4, smiler: 10, lurker: 8, stealer: 7, l8spider: 5, npc: 6 }
const heftOf = (e) => e.state?.heft ?? Object.entries(HEFT).find(([t]) => e.tags?.includes(t))?.[1] ?? 6
const KICK_V = 8, FRICTION = 5, PUSH_REACH = 0.95, KICK_REACH = 1.7
const FOES = ['smiler', 'lurker', 'hound', 'stealer', 'moths', 'l8spider', 'l8-hostile', 'npc', 'entity']
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const isWheeled = (o) => o.tags?.includes('wheeled') || (o.tags?.includes('chair') && o.tags?.includes('furniture') && !o.tags?.includes('sunken') && !o.tags?.includes('seat'))
const mem = (ctx) => (ctx.self.session.kick ??= { rolls: {} })

function wheeledNear(ctx, reach, f) {
  const p = ctx.self.feetPosition; let best = null, bd = reach
  for (const o of ctx.query({ anyTags: ['chair', 'wheeled'], radius: reach + 0.6 })) {
    if (!isWheeled(o)) continue
    const dx = o.feetPosition.x - p.x, dz = o.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > reach || (d > 0.3 && f && (dx * f.x + dz * f.z) / d < 0.5)) continue
    if (d < bd) { bd = d; best = o }
  }
  return best
}
// can the chair move this far this way without going into a wall?
function clear(ctx, o, dir, dist) {
  const f = o.feetPosition
  return !raycast(ctx, { x: f.x, y: f.y + 0.35, z: f.z }, { x: dir.x, y: 0, z: dir.z }, { distance: dist + 0.35, physicsOnly: true, bodies: 'static', ignoreEntities: [o.id, ctx.self.id] })
}
function fwd(ctx) { const y = ((ctx.self.camera?.rotation?.yaw ?? 0) * Math.PI) / 180; return { x: -Math.sin(y), z: -Math.cos(y) } }

export function onInput(ctx, input) {
  if (!input.pressed?.kick) return
  const s = ctx.self.state; if (s.menuOpen || s.lootOpen || s.sit || s.sheetOpen) return
  const f = fwd(ctx), o = wheeledNear(ctx, KICK_REACH, f), p = ctx.self.feetPosition
  const hold = s.lurkHold, lk = hold && ctx.getObject(hold.by)
  if (lk) { // grabbed: the kick lands on the lurker, it lets go and reels
    s.lurkHold = null; s.crouch = false
    hitTarget(ctx, s, lk, 12, { x: lk.feetPosition.x - p.x, y: 0, z: lk.feetPosition.z - p.z }, true, 1)
    lk.state.stunUntil = ctx.now() + 1500
    ctx.emit('playSound', { clip: SND('office-chair-kicked-casters-rolling'), position: lk.feetPosition, volume: 0.6 })
    ctx.emit('squash', { target: lk.id, axis: 'z', intensity: 0.25, duration: 0.2 })
    ctx.emit('cameraPunch', { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.3 }, { audience: { player: ctx.self.id } })
  }
  ctx.self.anim.kick = { clip: 'cdn/clip-kick.glb', loop: false, weight: 1 }
  ctx.after(0.6, 'kickEnd')
  // first person: your leg swings up from below the screen and snaps forward, then drops away
  const l = s.look ?? {}
  // an empty hip joint rides the camera; the leg hangs 1.02 m below it, so turning the hip swings the foot up into view
  // one piece on the camera, its top (the hip) the pivot: the leg hangs below the view and swings up and forward into it
  const hb = !l.modelUrl && HUMAN ? humanBody(l) : null, skin = hb?.materials?.Body_Skin?.color
  const leg = s.tp ? null : ctx.spawn({ audience: 'local', scope: 'session', lifetime: 0.55, feetPosition: { attach: 'camera', x: 0.16, y: -1.38, depth: 0.1 }, pivot: 'top', rotation: { pitch: -8 },
    visibleInFirstPerson: true, castShadow: false,
    primitive: { kind: 'scripted', script: 'scripts/kick-leg-geo.js', params: { species: hb ? null : l.species, fur: skin || l.fur, botw: l.botw, bottom: l.bottom, shoes: l.shoes, shoec: l.shoec } } })
  ctx.log('[kickleg]', leg, JSON.stringify(ctx.getObject(leg)?.worldFeetPosition), JSON.stringify(ctx.self.camera?.position))
  if (leg) animate(ctx, leg, { 'rotation.pitch': [-8, 78, 72, -8] }, { duration: 0.5, easing: 'easeOutCubic' })
  ctx.emit('cameraPunch', { direction: { x: 0, y: -1, z: 0 }, intensity: 0.12 }, { audience: { player: ctx.self.id } })
  if (!o && kickFoe(ctx, s, f, p)) return
  if (!o && kickLoose(ctx, f, s)) return
  if (!o) { ctx.emit('playSound', { clip: SND('cloth-whoosh-swing'), position: p, volume: 0.4 }); return }
  mem(ctx).rolls[o.id] = { vx: f.x * KICK_V, vz: f.z * KICK_V, spin: (ctx.random() - 0.5) * 720, hit: false }
  const at = { x: o.feetPosition.x, y: o.feetPosition.y + 0.5, z: o.feetPosition.z }
  ctx.emit('playSound', { clip: SND('office-chair-kicked-casters-rolling'), position: at, volume: 0.9, maxDistance: 25 })
  ctx.emit('cameraPunch', { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.25 }, { audience: { player: ctx.self.id } })
  ctx.emit('squash', { target: o.id, axis: 'z', intensity: 0.2, duration: 0.18 })
  ctx.emit('noise', { position: at, radius: 14, kind: 'kick' }, { audience: { nearby: at, radius: 14 } })
}
export function kickEnd(ctx) {

export function update(ctx, dt) {
  const m = mem(ctx), p = ctx.self.feetPosition, v = ctx.self.velocity
  // shove: walking into a chair rolls it ahead of you at your pace
  const sp = Math.hypot(v.x, v.z)
  if (sp > 0.6) {
    const dir = { x: v.x / sp, z: v.z / sp }, o = wheeledNear(ctx, PUSH_REACH, dir)
    if (o && !m.rolls[o.id] && clear(ctx, o, dir, sp * dt)) {
      const f = o.feetPosition; o.feetPosition = { x: f.x + v.x * dt, y: f.y, z: f.z + v.z * dt }
      if (!m.pushSnd || ctx.now() - m.pushSnd > 1400) { m.pushSnd = ctx.now(); ctx.emit('playSound', { clip: SND('office-chair-casters-rolling-on-carpet'), position: f, volume: 0.45, maxDistance: 14 }) }
    }
  }
  // a kicked chair: rolls, spins, slows, stops at walls, and slams the first entity it meets
  for (const [id, r] of Object.entries(m.rolls)) {
    const o = ctx.getObject(id); const s = Math.hypot(r.vx, r.vz)
    if (!o || s < 0.3) { delete m.rolls[id]; continue }
    const dir = { x: r.vx / s, z: r.vz / s }, step = s * dt
    if (!clear(ctx, o, dir, step)) { // the wall stops it with a bang and a little bounce back
      ctx.emit('playSound', { clip: SND('office-chair-crash-into-wall'), position: o.feetPosition, volume: Math.min(1, s / KICK_V), maxDistance: 20 })
      r.vx = -r.vx * 0.25; r.vz = -r.vz * 0.25; continue
    }
    const f = o.feetPosition; o.feetPosition = { x: f.x + r.vx * dt, y: f.y, z: f.z + r.vz * dt }
    const yaw = (typeof o.rotation === 'number' ? o.rotation : o.rotation?.yaw ?? 0) + r.spin * dt * (s / KICK_V)
    o.rotation = { yaw }
    if (!r.hit) for (const e of ctx.query({ anyTags: FOES, radius: 0.95, center: o.feetPosition })) {
      if (e.id === ctx.self.id || e.state?.dead || (e.state?.hp ?? 1) <= 0 || e.state?.follow) continue
      r.hit = true
      hitTarget(ctx, ctx.self.state, e, 14 + s * 3, dir, true, 1)
      e.state.stunUntil = ctx.now() + 1200
      ctx.emit('impulse', { target: e.id, impulse: { x: dir.x * s * 40, y: 60, z: dir.z * s * 40 } })
      const at = { x: e.feetPosition.x, y: e.feetPosition.y + 0.6, z: e.feetPosition.z }
      ctx.emit('playSound', { clip: SND('office-chair-slams-into-body-thud'), position: at, volume: 1, maxDistance: 24 })
      ctx.emit('fx', { position: at, script: `fx\npop dust burst=10..16 life=.5..0.9 v=sdir()*(1..2.5)+up(.6) size=.15..0.3 acc=buoy(.3)+drag(2) col=<.62,.55,.38> a=0>.4:.4>.7:.2>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)` })
      ctx.emit('hitstop', { duration: 0.05 }, { audience: { player: ctx.self.id } })
      r.vx *= 0.15; r.vz *= 0.15
      break
    }
    const ns = Math.max(0, s - FRICTION * dt); r.vx = dir.x * ns; r.vz = dir.z * ns
  }
  if (sp < 0.1 && !Object.keys(m.rolls).length) ctx.sleep(0.25)
}

function kickFoe(ctx, s, f, p) {
  let e = null, bd = 1.9
  for (const c of ctx.query({ anyTags: FOES, radius: 2.4 })) {
    if (c.id === ctx.self.id || c.state?.dead || (c.state?.hp ?? 1) <= 0 || c.state?.follow) continue
    const dx = c.feetPosition.x - p.x, dz = c.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > bd || (d > 0.4 && (dx * f.x + dz * f.z) / d < 0.55)) continue
    bd = d; e = c
  }
  if (!e) return false
  const at = attrsOf(s), fs = foeStats(ctx, e), power = at.h + 0.6 * at.a, r = power / (fs.kg / 12 + (fs.a - 5) * 0.2), now = ctx.now() // its own weight, and a nimble one keeps its feet
  const tier = r < 0.8 ? 0 : r < 1.4 ? 1 : 2
  const dir = { x: f.x, z: f.z }, push = [1.2, 3.5, 7 + at.a * 0.4][tier]
  hitTarget(ctx, s, e, Math.round(4 + at.h * 1.2 + (tier === 2 ? 6 : 0)), dir, true, tier === 2 ? 1 : 0)
  const hitAt = { x: e.feetPosition.x, y: e.feetPosition.y + 0.8, z: e.feetPosition.z }
  if (tier === 0) { // too heavy for you: it rocks, shrugs, keeps coming
    ctx.emit('squash', { target: e.id, axis: 'z', intensity: 0.1, duration: 0.15 })
    ctx.emit('damageNumber', { position: { ...hitAt, y: hitAt.y + 1 }, text: 'BARELY', color: '#bbbbbb', size: 0.8 })
    ctx.emit('playSound', { clip: SND('heavy-body-shrugs-off-kick-thud'), position: hitAt, volume: 0.7 })
  } else if (tier === 1) { // a stagger: shoved back a step or two, arms out
    e.state.stunUntil = now + 650
    e.state.kb = { x: dir.x * push, z: dir.z * push, at: now, ms: 350 }
    ctx.emit('impulse', { target: e.id, impulse: { x: dir.x * push * 30, y: 40, z: dir.z * push * 30 } })
    ctx.emit('damageNumber', { position: { ...hitAt, y: hitAt.y + 1 }, text: 'STAGGER', color: '#ffd27a', size: 0.9 })
    ctx.emit('playSound', { clip: SND('solid-kick-into-body-thump'), position: hitAt, volume: 0.9 })
  } else { // knocked flat: it flies, tumbles, lies a beat, then scrambles up
    e.state.stunUntil = now + 1500
    e.state.down = { x: dir.x * push, z: dir.z * push, at: now, ms: 1100 }
    ctx.emit('impulse', { target: e.id, impulse: { x: dir.x * push * 45, y: 180, z: dir.z * push * 45 } })
    ctx.emit('damageNumber', { position: { ...hitAt, y: hitAt.y + 1 }, text: 'KNOCKDOWN', color: '#ff9a3c', size: 1.2 })
    ctx.emit('playSound', { clip: SND('brutal-kick-body-flies-and-crashes'), position: hitAt, volume: 1, maxDistance: 25 })
    ctx.emit('screenShake', { intensity: 0.3, duration: 0.2 }, { audience: { player: ctx.self.id } })
    ctx.emit('fx', { position: { ...e.feetPosition, y: e.feetPosition.y + 0.1 }, script: `fx\npop dust burst=14..20 life=.5..0.9 v=sdir()*(1..2.5)+up(.6) size=.15..0.3 acc=buoy(.3)+drag(2) col=<.62,.55,.38> a=0>.4:.4>.7:.2>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)` })
  }
  ctx.emit('cameraPunch', { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.2 + tier * 0.15 }, { audience: { player: ctx.self.id } })
  ctx.emit('noise', { position: hitAt, radius: 12, kind: 'kick' }, { audience: { nearby: hitAt, radius: 12 } })
  return true
}
