// Ladder climbing, every level. A ladder is any object tagged "ladder" with state.ladder = { h, yaw, mat }:
// its feet at the foot of the rungs, yaw = the way a climber faces it (forward = into the ladder), h = rise to the top step-off.
// Walk into it holding W: you take hold. W climbs, S climbs down, Space lets go and drops you back. At the top, W steps you off onto
// the deck; at the bottom, S steps you off. From the top, walk back over the edge facing away and you take hold to climb down.
// Third person plays the climb clip at the pace you climb; first person hides the weapon and shows both your arms reaching rung over rung.
// Runs after scripts/swim.js and owns the body's velocity while it holds on.
const SPEED = 1.6, STAND = 0.36, RUNG = 0.32 // her picks: m/s up a ladder, how far out the chest hangs, rung spacing for sound and hands
const CLIP_UP = 'cdn/clip-climb-loop.glb', CLIP_DOWN = 'cdn/clip-climbing-down-wall-loop.glb'
const SND = {
  wood: '/cdn/moodboard-realistic-gritty/sfx-hand-and-boot-gripping-old-wooden-ladder-rung-creak.mp3',
  metal: '/cdn/moodboard-realistic-gritty/sfx-boot-stepping-on-steel-ladder-rung-hollow-clank.mp3',
}
const FP_ARM = { // first-person forearms cut from Shelly's human bodies (same meshes scripts/player.js holds weapons with)
  f: { R: '/cdn/value.2d938d9446aaeb01c15e41213e80f5a4d2c7e1507bc655714fb04eac001794fa.glb', L: '/cdn/value.7f8d66209a679e498e2b417b0accaf0b9ce819769be93f697762794ff5dc409b.glb' },
  m: { R: '/cdn/value.7217b9235387299104686cdd782ec11f1801444037bd8eceefe445e11001b020.glb', L: '/cdn/value.70fede1b834eff766531f0b51f4772832f8ac989f9f48cffe988120bba1970cb.glb' } }

const fwd = (yaw) => { const r = (yaw * Math.PI) / 180; return { x: -Math.sin(r), z: -Math.cos(r) } }
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180
const mem = (ctx) => (ctx.self.session.climb ??= { z: 0, jump: false, on: null, scanAt: 0, near: [], travel: 0, ph: 0 })

export function onInput(ctx, input) {
  const m = mem(ctx)
  m.z = input.axes?.moveZ ?? 0
  if (input.pressed?.jump) m.jump = true
}

function ladderOf(ctx, id) {
  const o = ctx.getObject(id), L = o?.state?.ladder
  if (!o || !L) return null
  const b = o.worldFeetPosition ?? o.feetPosition
  return { id, base: { x: b.x, y: b.y, z: b.z }, h: L.h ?? 3, yaw: L.yaw ?? 0, mat: L.mat ?? 'wood', top: L.top !== false, f: fwd(L.yaw ?? 0) }
}

export function update(ctx, dt) {
  if (ctx.self.isLocal === false) return
  const me = ctx.self, s = me.state, m = mem(ctx), p = me.feetPosition
  if (s.level == null || s.dead || (s.hp ?? 1) <= 0 || s.sit || s.menuOpen) { if (m.on) letGo(ctx, m); m.jump = false; return }
  const now = ctx.now()

  if (!m.on) {
    if (now - m.scanAt > 300) { m.scanAt = now; m.near = ctx.query({ tags: ['ladder'], radius: 12, select: 'ids' }) }
    if (!m.near?.length) { m.jump = false; return }
    const look = me.camera?.rotation?.yaw ?? (typeof me.rotation === 'number' ? me.rotation : me.rotation?.yaw ?? 0)
    for (const id of m.near) {
      const L = ladderOf(ctx, id); if (!L) continue
      const dx = p.x - L.base.x, dz = p.z - L.base.z, along = dx * L.f.x + dz * L.f.z, side = Math.abs(dx * L.f.z - dz * L.f.x), dy = p.y - L.base.y
      if (side > 0.55) continue
      // from below: in front of it, facing it, pushing forward
      if (m.z < -0.3 && along > -1.0 && along < 0.15 && dy > -0.5 && dy < L.h - 0.4 && Math.abs(wrap(look - L.yaw)) < 65) { grab(ctx, m, L, Math.max(dy, 0.05)); break }
      // from the top: standing on the deck behind it, facing away, walking back over the edge
      if (m.z < -0.3 && along > -0.2 && along < 1.1 && L.top && Math.abs(dy - L.h) < 0.45 && Math.abs(wrap(look - L.yaw - 180)) < 60) { grab(ctx, m, L, L.h - 1.05); break }
    }
    m.jump = false
    return
  }

  const L = ladderOf(ctx, m.on)
  if (!L) { letGo(ctx, m); return }
  const dy = p.y - L.base.y
  if (m.jump) { // let go: push off backward
    m.jump = false; letGo(ctx, m)
    me.velocity = { x: -L.f.x * 2.2, y: 2.5, z: -L.f.z * 2.2 }
    return
  }
  const want = -m.z // moveZ -1 is forward = up
  if (want > 0.3 && L.top && dy >= L.h - 0.9) { // over the top: step off onto the deck
    letGo(ctx, m)
    me.feetPosition = { x: L.base.x + L.f.x * 0.75, y: L.base.y + L.h + 0.08, z: L.base.z + L.f.z * 0.75 }
    me.velocity = { x: L.f.x * 1.5, y: 0, z: L.f.z * 1.5 }
    sound(ctx, L, p, 0.5)
    return
  }
  if (want < -0.3 && (dy <= 0.04 || me.grounded)) { letGo(ctx, m); me.velocity = { x: -L.f.x * 1.2, y: 0, z: -L.f.z * 1.2 }; return }

  // hold on: the chest hangs STAND out from the rungs, the body faces in, up or down at the climb pace
  const tx = L.base.x - L.f.x * STAND, tz = L.base.z - L.f.z * STAND
  const vy = want > 0.3 ? SPEED : want < -0.3 ? -SPEED : 0
  me.velocity = { x: (tx - p.x) * 10, y: dy > L.h - 0.9 && vy > 0 ? 0 : vy, z: (tz - p.z) * 10 }
  me.rotation = { yaw: L.yaw }
  if (s.crouch) s.crouch = false

  // the pace: the clip and the hands advance with the height gained, so a stop is a stop
  const moved = Math.abs(vy) * dt
  m.ph = (m.ph + (vy >= 0 ? 1 : -1) * moved / (RUNG * 2) + 1) % 1
  m.travel += moved
  if (m.travel > RUNG) { m.travel = 0; sound(ctx, L, p, 0.32) }
  const dir = vy > 0 ? 1 : vy < 0 ? -1 : 0
  if (dir !== m.dir) {
    m.dir = dir
    me.anim.climb = { clip: dir < 0 ? CLIP_DOWN : CLIP_UP, loop: 'loop', weight: 5, speed: dir === 0 ? 0 : 1.15, blendIn: 0.15 }
  }
  hands(ctx, m, dir)
}

function grab(ctx, m, L, y) {
  const me = ctx.self, s = me.state
  m.on = L.id; m.dir = null; m.travel = 0; m.ph = 0
  s.climbing = true // scripts/player.js hides the weapon, scripts/humanoid-locomotion.js holds the air/landing clips
  me.feetPosition = { x: L.base.x - L.f.x * STAND, y: L.base.y + y, z: L.base.z - L.f.z * STAND }
  me.velocity = { x: 0, y: 0, z: 0 }
  sound(ctx, L, me.feetPosition, 0.5)
}

function letGo(ctx, m) {
  const me = ctx.self
  m.on = null; m.dir = null
  if (me.state.climbing) me.state.climbing = false
  me.anim.climb = null
  if (m.fp) { ctx.destroy(m.fp); m.fp = null; m.fpL = m.fpR = null }
}

function sound(ctx, L, p, volume) {
  ctx.emit('playSound', { clip: SND[L.mat] ?? SND.wood, position: { x: p.x, y: p.y + 1, z: p.z }, volume, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 14 })
}

// first person: both forearms in front of the eye, fists on the rungs, one reaching up while the other pulls down (camera-attached, this machine only)
function hands(ctx, m, dir) {
  const me = ctx.self, s = me.state
  if (s.tp) { if (m.fp) { ctx.destroy(m.fp); m.fp = null } return }
  const sx = s.look?.sex === 'f' || s.look?.sex == null ? 'f' : 'm'
  if (!m.fp) {
    m.fp = ctx.spawn({ feetPosition: { attach: 'camera', x: 0, y: 0, depth: 0.45 }, audience: 'local', scope: 'session', castShadow: false, visibleInFirstPerson: true,
      children: [
        { id: 'r', feetPosition: { x: 0.17, y: -0.05, z: 0 }, rotation: { pitch: 70, yaw: 10, roll: 0 }, model: FP_ARM[sx].R, castShadow: false, visibleInFirstPerson: true, audience: 'local' },
        { id: 'l', feetPosition: { x: -0.17, y: -0.05, z: 0 }, rotation: { pitch: 70, yaw: -10, roll: 0 }, model: FP_ARM[sx].L, castShadow: false, visibleInFirstPerson: true, audience: 'local' },
      ] })
    m.fpR = m.fp + '/r'; m.fpL = m.fp + '/l'
  }
  // a hand reaches up a rung while the other pulls down, swapping every rung; at rest both hold where they are
  const a = Math.sin(m.ph * Math.PI * 2), lift = 0.11
  const R = ctx.getObject(m.fpR), Lh = ctx.getObject(m.fpL)
  if (R) R.feetPosition = { x: 0.17, y: -0.05 + a * lift, z: -Math.max(0, a) * 0.04 }
  if (Lh) Lh.feetPosition = { x: -0.17, y: -0.05 - a * lift, z: -Math.max(0, -a) * 0.04 }
}
