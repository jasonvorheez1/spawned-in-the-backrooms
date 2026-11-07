// First-person weapon motion, posed from the camera rig (scripts/camera.js) every display frame.
// scripts/player.js spawns the arm + held weapon (player.state.vmId) and owns the rules (ammo, reload
// timers, damage); this file only moves that object: sway that lags the look, walking bob, a kick when
// you fire, a chop when you strike, a dip and tilt while you reload, a lowered carry when you sprint,
// a raise when you switch weapons, and the slide to the centre of the screen when you aim down sights.
// Everything is a spring on the real frame time, and the object is posed with interpolation off, so the
// motion is continuous instead of stepping with the game tick.
import W from './data/weapons.yml'

export const VM_FOV = 55
const REST = [0.19, -0.17, 0.44]
const TAU = Math.PI * 2

const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI
const ease = (x) => x * x * (3 - 2 * x)

export function poseViewmodel(ctx, dt) {
  const ps = ctx.player?.state
  if (!ps || ps.level == null || !ps.vmId) return
  const vm = ctx.getObject(ps.vmId)
  if (!vm) return
  dt = Math.min(Math.max(dt, 0.0005), 0.05)
  const m = (ctx.self.session.vmpose ??= { id: null, kick: 0, kickV: 0, pullX: 0, pullY: 0, swayX: 0, swayY: 0, ads: 0, rel: 0, pulse: 0, lastSwing: 0, lastReload: 0, lastPump: 0, lastEquip: 0, equipT: 1, lastYaw: null, lastPitch: 0, bob: 0 })
  if (m.id !== ps.vmId) { m.id = ps.vmId; try { vm.interpolation = null } catch (e) { /* the engine keeps its default smoothing */ } }

  const kind = ps.equipped ?? 'fists', wp = W[kind] ?? W.fists, gun = !!wp.ranged, now = ctx.now()

  // ---- events written by player.js
  if (ps.swingAt && ps.swingAt !== m.lastSwing) {
    m.lastSwing = ps.swingAt; m.swingT = 0
    if (gun) {
      m.kickV += wp.pellets ? 16 : 9
      const muzzle = ctx.getObjectSocket(ps.vmId, 'muzzle')
      if (muzzle && muzzle.position) ctx.emit('fx', { position: muzzle.position, attachTo: ps.vmId, script: FLASH })
    }
  }
  if ((ps.reloadN ?? 0) !== m.lastReload) { m.lastReload = ps.reloadN ?? 0; m.pulse = 1 }
  if (ps.pumpAt && ps.pumpAt !== m.lastPump) { m.lastPump = ps.pumpAt; m.pulse = 0.8 }
  if (ps.equipAt && ps.equipAt !== m.lastEquip) { m.lastEquip = ps.equipAt; m.equipT = 0 }

  // ---- the look drags the weapon the other way, so it trails the view
  const view = ctx.self.view
  if (view) {
    if (m.lastYaw != null) {
      m.pullX = Math.max(-0.05, Math.min(0.05, m.pullX + wrap(view.yaw - m.lastYaw) * 0.9))
      m.pullY = Math.max(-0.04, Math.min(0.04, m.pullY - (view.pitch - m.lastPitch) * 0.7))
    }
    m.lastYaw = view.yaw; m.lastPitch = view.pitch
  }

  // ---- springs, all on frame time
  m.kickV += (-180 * m.kick - 14 * m.kickV) * dt; m.kick += m.kickV * dt
  const decay = Math.max(0, 1 - dt * 6)
  m.pullX *= decay; m.pullY *= decay
  const follow = Math.min(1, dt * 14)
  m.swayX += (m.pullX - m.swayX) * follow; m.swayY += (m.pullY - m.swayY) * follow
  m.pulse = Math.max(0, m.pulse - dt * 4)
  m.equipT = Math.min(1, m.equipT + dt / 0.35)
  if (m.swingT != null && m.swingT < 1) m.swingT = Math.min(1, m.swingT + dt / (kind === 'fists' ? 0.2 : 0.34))
  m.ads += ((ps.ads ? 1 : 0) - m.ads) * Math.min(1, dt * 12)
  m.rel += ((ps.reloading ? 1 : 0) - m.rel) * Math.min(1, dt * 9)

  // ---- walking bob (almost none while aiming) and a lowered carry while sprinting
  const vel = ctx.player?.velocity ?? { x: 0, z: 0 }, speed = Math.hypot(vel.x, vel.z)
  const walk = Math.min(1, speed / 6) * (1 - 0.85 * m.ads), run = Math.max(0, Math.min(1, (speed - 6.2) / 1.5)) * (1 - m.ads)
  m.bob += dt * (7.5 + 3.5 * run) * (0.3 + 0.7 * Math.min(1, speed / 4))
  const amp = 0.003 + (0.009 + 0.01 * run) * walk
  const bobX = Math.sin(m.bob) * amp, bobY = -Math.abs(Math.cos(m.bob)) * amp

  // ---- compose: position
  const ads = wp.ads ?? REST, a = ease(m.ads), sway = 1 - 0.7 * m.ads
  let x = REST[0] + (ads[0] - REST[0]) * a, y = REST[1] + (ads[1] - REST[1]) * a, d = REST[2] + (ads[2] - REST[2]) * a
  x += m.swayX * sway + bobX; y += m.swayY * sway + bobY
  const kickScale = 1 - 0.4 * m.ads
  y += m.kick * 0.12 * kickScale; d -= m.kick * 0.35 * kickScale
  // ---- rotation
  let pitch = (gun ? 0 : -42) + m.kick * 45 + m.swayY * 140 * sway
  let yaw = (gun ? 0 : 8) - m.swayX * 140 * sway
  let roll = (gun ? 0 : 18) - m.swayX * 70 * sway

  // reloading: the weapon drops and rolls toward you, with a bounce at each magazine / shell step
  const dip = m.rel * (wp.pellets ? 0.1 : 0.2) + m.pulse * 0.05
  y -= dip; x -= m.rel * 0.05; d += m.rel * 0.02
  pitch += m.rel * (wp.pellets ? 28 : 40) - m.pulse * 10
  roll += m.rel * (wp.pellets ? 18 : 28)

  // sprinting: lower it and turn it away
  y -= run * 0.07; pitch -= run * 18; yaw += run * 14; x -= run * 0.03

  // a melee chop (or a jab for the fists), eased
  if (!gun && m.swingT != null && m.swingT < 1) {
    const e = ease(Math.sin(m.swingT * Math.PI))
    if (kind === 'fists') { d += 0.28 * e; x -= 0.07 * e; y += 0.03 * e }
    else { pitch -= 70 * e; yaw += 25 * e; roll -= 20 * e; x -= 0.1 * e; y -= 0.04 * e }
  }

  // raising a freshly equipped weapon
  y -= (1 - ease(m.equipT)) * 0.3

  vm.feetPosition = { attach: 'camera', x, y, depth: d, fov: VM_FOV }
  vm.rotation = { yaw, pitch, roll }
}

const FLASH = `fx
pop flash burst=6 life=.04..0.09 on=point() v=sdir()*(1..3) size=.06..0.15 col=hdr(5,4,2.5) a=1>0 r=sprite(ember,add)
pop smoke burst=2..3 life=.4..0.7 on=point() v=sdir()*(.2..0.5)+up(.4) size=.05..0.1 acc=buoy(.3)+drag(1.5) col=<.5,.5,.5> a=0>.22:.6>0 sz=$size*(1>2) r=sprite(smoke-puff,alpha)`
