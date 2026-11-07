// First-person weapon motion, posed from the camera rig (scripts/camera.js) every display frame.
// scripts/player.js spawns the arm + held weapon (player.state.vmId) and owns the rules (ammo, reload
// timers, damage); this file only moves that object. Guns: a per-gun recoil spring (muzzle climb, a shove
// back, a random twist), a brass casing out of the pistol, a keyframed magazine swap (tilt, eject flick,
// mag drop, insert slap, slide rack), a shotgun that rolls its loading port up and bucks at every shell,
// a pump stroke that throws the spent hull. Everything: sway that lags the look, strafe lean, walking bob,
// breathing at rest, a dip on landing, a lowered carry when sprinting, a raise with overshoot on equip.
// Springs and timelines run on real frame time; the object is posed with interpolation off.
import W from './weapons.js'

export const VM_FOV = 55
const REST = [0.19, -0.17, 0.44]
const TAU = Math.PI * 2

const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI
const ease = (x) => x * x * (3 - 2 * x)
const backOut = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
const rnd = (a, b) => a + Math.random() * (b - a) // cosmetic only: this machine's own picture

// offsets [t, x, y, depth, pitch, yaw, roll] over a normalized timeline
const PISTOL_RELOAD = [
  [0.00, 0, 0, 0, 0, 0, 0],
  [0.14, -0.05, 0.03, -0.03, 18, -10, 38],   // tip it in, magazine well toward you
  [0.21, -0.05, 0.048, -0.03, 24, -11, 41],  // flick: the empty mag drops
  [0.30, -0.05, 0.0, -0.02, 13, -8, 35],
  [0.50, -0.055, -0.012, -0.02, 11, -8, 33], // the other hand fetches a fresh one
  [0.56, -0.05, 0.036, -0.035, 21, -10, 36], // slap it home
  [0.66, -0.03, 0.01, -0.02, 9, -6, 18],
  [0.80, -0.02, 0.0, -0.065, 5, -4, 7],      // drag the slide back
  [0.86, -0.02, 0.012, 0.005, 1, -2, 3],     // and let it snap forward
  [1.00, 0, 0, 0, 0, 0, 0],
]
const SHOTGUN_LOAD = [-0.045, 0.03, -0.02, 14, -9, 27] // loading port rolled up
const PUMP = [
  [0.00, 0, 0, 0, 0, 0, 0],
  [0.38, 0.0, -0.012, -0.075, 5, 1, -4],  // fore-end hauled back
  [0.62, 0.0, 0.004, 0.012, -2, 0, 1],    // and shoved home
  [1.00, 0, 0, 0, 0, 0, 0],
]

function sample(frames, t) {
  t = Math.max(0, Math.min(1, t))
  let i = 1
  while (i < frames.length - 1 && frames[i][0] < t) i++
  const a = frames[i - 1], b = frames[i], u = ease((t - a[0]) / Math.max(1e-4, b[0] - a[0]))
  const out = []
  for (let k = 1; k < 7; k++) out.push(a[k] + (b[k] - a[k]) * Math.max(0, Math.min(1, u)))
  return out
}

// one damped spring per channel: x, y, depth, pitch, yaw, roll
const K_POS = 320, C_POS = 22, K_ROT = 240, C_ROT = 17
function stepSprings(s, v, dt) {
  for (let i = 0; i < 6; i++) {
    const k = i < 3 ? K_POS : K_ROT, c = i < 3 ? C_POS : C_ROT
    v[i] += (-k * s[i] - c * v[i]) * dt
    s[i] += v[i] * dt
  }
}

export function poseViewmodel(ctx, dt) {
  const ps = ctx.player?.state
  if (!ps || ps.level == null || !ps.vmId) return
  const vm = ctx.getObject(ps.vmId)
  if (!vm) return
  const downNow = ps.downAt && ctx.now() - ps.downAt < 3200 // the death cam is third person: no arm in front of it
  if (!!downNow !== !!ctx.self.session.vmHid) { ctx.self.session.vmHid = !!downNow; vm.visible = !downNow }
  if (downNow) return
  dt = Math.min(Math.max(dt, 0.0005), 0.05)
  const m = (ctx.self.session.vm2 ??= {
    id: null, sp: [0, 0, 0, 0, 0, 0], sv: [0, 0, 0, 0, 0, 0], off: [0, 0, 0, 0, 0, 0],
    pullX: 0, pullY: 0, swayX: 0, swayY: 0, lean: 0, ads: 0, run: 0, breath: 0,
    lastSwing: 0, lastReload: 0, lastPump: 0, lastEquip: 0, lastDry: 0, equipT: 1, pumpT: 1,
    relT: 0, relOn: false, relKind: null, eject: false, lastYaw: null, lastPitch: 0, bob: 0, vy: 0,
  })
  if (m.id !== ps.vmId) { m.id = ps.vmId; m.lastEquip = ps.equipAt ?? 0; m.lastSwing = ps.swingAt ?? 0; m.lastPump = ps.pumpAt ?? 0; m.lastReload = ps.reloadN ?? 0; m.lastDry = ps.dryAt ?? 0; try { vm.interpolation = null } catch (e) { /* the engine keeps its default smoothing */ } }

  const kind = ps.equipped ?? 'fists', wp = W[kind] ?? W.fists, gun = !!wp.ranged
  const rc = wp.recoil ?? {}, aimDamp = 1 - 0.55 * m.ads
  const view = ctx.self.view

  // ---- events written by player.js
  if (ps.swingAt && ps.swingAt !== m.lastSwing) {
    m.lastSwing = ps.swingAt; m.swingT = 0
    if (gun) {
      m.sv[3] += (rc.up ?? 220) * aimDamp * rnd(0.85, 1.15)
      m.sv[2] -= (rc.back ?? 1.2) * aimDamp
      m.sv[1] += (rc.lift ?? 0.3) * aimDamp
      m.sv[4] += (rc.side ?? 50) * rnd(-1, 1) * aimDamp
      m.sv[5] += (rc.twist ?? 70) * rnd(-0.4, 1) * aimDamp
      const muzzle = ctx.getObjectSocket(ps.vmId, 'muzzle')
      if (muzzle && muzzle.position) ctx.emit('fx', { position: muzzle.position, attachTo: ps.vmId, script: wp.pellets ? FLASH_BIG : FLASH })
      if (wp.pellets) m.eject = true
      else if (muzzle && muzzle.position && view) emitCasing(ctx, muzzle.position, view.yaw, false)
    }
  }
  if ((ps.reloadN ?? 0) !== m.lastReload) {
    m.lastReload = ps.reloadN ?? 0
    if (wp.pellets && ps.reloading) { m.sv[1] += 0.55; m.sv[2] += 0.5; m.sv[3] -= 90; m.sv[5] += 40 } // thumb a shell in
  }
  if (ps.pumpAt && ps.pumpAt !== m.lastPump) { m.lastPump = ps.pumpAt; m.pumpT = 0; m.pumpEjected = false }
  if (ps.equipAt && ps.equipAt !== m.lastEquip) { m.lastEquip = ps.equipAt; m.equipT = 0 }
  if (ps.dryAt && ps.dryAt !== m.lastDry) { m.lastDry = ps.dryAt; m.sv[3] += 45; m.sv[2] -= 0.15 }

  // ---- reload clock, local to this machine
  const reloading = !!ps.reloading && gun
  if (reloading && !m.relOn) { m.relOn = true; m.relT = 0; m.relKind = kind }
  if (!reloading) m.relOn = false
  if (m.relOn) m.relT += dt

  // ---- the look drags the weapon the other way, so it trails the view
  if (view) {
    if (m.lastYaw != null) {
      m.pullX = Math.max(-0.05, Math.min(0.05, m.pullX + wrap(view.yaw - m.lastYaw) * 0.9))
      m.pullY = Math.max(-0.04, Math.min(0.04, m.pullY - (view.pitch - m.lastPitch) * 0.7))
    }
    m.lastYaw = view.yaw; m.lastPitch = view.pitch
  }

  // ---- landing and jumping
  const vel = ctx.player?.velocity ?? { x: 0, y: 0, z: 0 }, vy = vel.y ?? 0
  if (m.vy < -2.5 && vy > -0.6) { const hit = Math.min(1, -m.vy / 9); m.sv[1] -= 1.6 * hit; m.sv[3] -= 60 * hit }
  if (m.vy < 1 && vy > 3) { m.sv[1] -= 0.5; m.sv[3] += 20 }
  m.vy = vy

  // ---- springs and smoothing, all on frame time
  stepSprings(m.sp, m.sv, dt)
  const decay = Math.max(0, 1 - dt * 6)
  m.pullX *= decay; m.pullY *= decay
  const follow = Math.min(1, dt * 14)
  m.swayX += (m.pullX - m.swayX) * follow; m.swayY += (m.pullY - m.swayY) * follow
  m.equipT = Math.min(1, m.equipT + dt / 0.45)
  m.pumpT = Math.min(1, m.pumpT + dt / 0.42)
  if (m.pumpT > 0.38 && !m.pumpEjected) {
    m.pumpEjected = true
    if (m.eject) { m.eject = false; const mz = ctx.getObjectSocket(ps.vmId, 'muzzle'); if (mz?.position && view) emitCasing(ctx, mz.position, view.yaw, true) }
  }
  if (ps.swingAt !== m.heavyFor) { m.heavyFor = ps.swingAt; m.heavy = ps.swingHeavy ?? 0 }
  if (m.swingT != null && m.swingT < 1) m.swingT = Math.min(1, m.swingT + dt / ((kind === 'fists' ? 0.2 : 0.34) * (1 + 0.45 * m.heavy)))
  // the wind-up: how far into a held power attack, 0..1, eased in the pose below
  const wind = !gun && ps.chargeAt ? Math.min(1, (ctx.now() - ps.chargeAt) / ((W.power?.charge ?? 0.9) * 1000)) : 0
  m.wind = (m.wind ?? 0) + (wind - (m.wind ?? 0)) * Math.min(1, dt * (wind ? 14 : 30))
  m.ads += ((ps.ads ? 1 : 0) - m.ads) * Math.min(1, dt * 12)
  m.breath += dt

  // reload pose target: the pistol plays its timeline, the shotgun holds the loading roll
  let target = [0, 0, 0, 0, 0, 0], rate = 10
  if (m.relOn && m.relKind === kind) {
    if (wp.pellets) { target = SHOTGUN_LOAD; rate = 9 }
    else { target = sample(PISTOL_RELOAD, m.relT / (wp.reloadTime ?? 1.7)); rate = 30 }
  }
  const fr = Math.min(1, dt * rate)
  for (let i = 0; i < 6; i++) m.off[i] += (target[i] - m.off[i]) * fr
  const pump = wp.pellets ? sample(PUMP, m.pumpT) : [0, 0, 0, 0, 0, 0]

  // ---- walking bob (almost none while aiming), strafe lean, breathing, sprint carry
  const speed = Math.hypot(vel.x, vel.z)
  const walk = Math.min(1, speed / 6) * (1 - 0.85 * m.ads)
  const runGoal = Math.max(0, Math.min(1, (speed - 6.2) / 1.5)) * (1 - m.ads) * (m.relOn ? 0.3 : 1)
  m.run += (runGoal - m.run) * Math.min(1, dt * 8)
  const run = m.run
  m.bob += dt * (7.5 + 3.5 * run) * (0.3 + 0.7 * Math.min(1, speed / 4))
  const amp = 0.003 + (0.009 + 0.01 * run) * walk
  const bobX = Math.sin(m.bob) * amp, bobY = -Math.abs(Math.cos(m.bob)) * amp
  let lateral = 0
  if (view) lateral = vel.x * Math.cos(view.yaw) - vel.z * Math.sin(view.yaw)
  m.lean += (lateral - m.lean) * Math.min(1, dt * 6)
  const still = 1 - Math.min(1, speed / 1.5), bre = (1 - 0.8 * m.ads) * still
  const brY = Math.sin(m.breath * 1.7) * 0.0025 * bre, brP = Math.sin(m.breath * 1.7 + 0.6) * 0.5 * bre, brYaw = Math.sin(m.breath * 0.9) * 0.35 * bre

  // ---- compose: position
  const ads = wp.ads ?? REST, a = ease(m.ads), sway = 1 - 0.7 * m.ads
  let x = REST[0] + (ads[0] - REST[0]) * a, y = REST[1] + (ads[1] - REST[1]) * a, d = REST[2] + (ads[2] - REST[2]) * a
  if (!gun && kind !== 'fists') { x += 0.1; y -= 0.1; d += 0.3 } // a melee weapon rides out at the right edge, the fist low
  x += m.swayX * sway + bobX + m.sp[0] + m.off[0] + pump[0]
  y += m.swayY * sway + bobY + brY + m.sp[1] + m.off[1] + pump[1]
  d += -m.sp[2] + m.off[2] + pump[2]
  // ---- rotation
  let pitch = (gun ? 0 : -14) + m.sp[3] + m.swayY * 140 * sway + brP + m.off[3] + pump[3]
  let yaw = (gun ? 0 : -6) - m.swayX * 140 * sway + m.sp[4] + brYaw + m.off[4] + pump[4]
  let roll = (gun ? 0 : -14) - m.swayX * 70 * sway + m.sp[5] - m.lean * 1.4 * sway + m.off[5] + pump[5]

  // sprinting: lower it and turn it away
  y -= run * 0.07; pitch -= run * 18; yaw += run * 14; x -= run * 0.03

  // a melee chop (or a jab for the fists), eased
  if (!gun && m.swingT != null && m.swingT < 1) {
    const e = ease(Math.sin(m.swingT * Math.PI))
    const h = 1 + 0.7 * (m.heavy ?? 0)
    if (kind === 'fists') { d += 0.28 * e * h; x -= 0.07 * e * h; y += 0.03 * e }
    else { pitch -= 70 * e * h; yaw += 25 * e * h; roll -= 20 * e * h; x -= 0.1 * e * h; y -= 0.04 * e * h; d += 0.06 * e * (h - 1) }
  }
  // a held power attack: cocked back over the shoulder, trembling once it is full
  if (!gun && m.wind > 0.001) {
    const k = ease(m.wind), full = m.wind > 0.97 ? 1 : 0, tr = full ? Math.sin(m.breath * 70) : 0
    if (kind === 'fists') { d -= 0.22 * k; x += 0.1 * k; y -= 0.06 * k; roll += 28 * k + tr * 2; yaw -= 18 * k; pitch += 10 * k }
    else { pitch += 30 * k + tr * 1.5; yaw -= 25 * k; roll -= 20 * k + tr * 2; x += 0.14 * k; y += 0.14 * k; d -= 0.14 * k }
  }

  // raising a freshly equipped weapon: up from below the frame, a little past, and settle
  let up = backOut(m.equipT), lo = 1 - up
  if (ps.sheathed && ps.sheathAt) { const k = Math.min(1, Math.max(0, (Date.now() - (m.sheathSeen ??= Date.now())) / 350)); lo = Math.max(lo, k * k * 1.3); up = 1 - lo } else m.sheathSeen = undefined // holstering: the hand drops below the frame, then goes
  y -= lo * 0.3
  if (gun) { pitch -= lo * 35; roll += lo * 18; x += lo * 0.04 } else { roll += lo * 10 }

  vm.feetPosition = { attach: 'camera', x, y, depth: d, fov: VM_FOV }
  vm.rotation = { yaw, pitch, roll }
}

// a spent case thrown out to the right (brass for the pistol, a red hull from the shotgun's pump)
function emitCasing(ctx, at, viewYaw, shell) {
  const r = { x: Math.cos(viewYaw), y: 0, z: -Math.sin(viewYaw) }
  ctx.emit('fx', { position: at, script: shell ? HULL : CASING, params: { side: r } })
}

const FLASH = `fx
pop flash burst=6 life=.04..0.09 on=point() v=sdir()*(1..3) size=.06..0.15 col=hdr(5,4,2.5) a=1>0 r=sprite(ember,add)
pop smoke burst=2..3 life=.4..0.7 on=point() v=sdir()*(.2..0.5)+up(.4) size=.05..0.1 acc=buoy(.3)+drag(1.5) col=<.5,.5,.5> a=0>.22:.6>0 sz=$size*(1>2) r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.06 on=point() r=light(<1,.75,.4>,6,5)`
const FLASH_BIG = `fx
pop flash burst=12 life=.05..0.11 on=point() v=sdir()*(1.5..4) size=.1..0.24 col=hdr(5,3.8,2.2) a=1>0 r=sprite(ember,add)
pop smoke burst=5..7 life=.6..1.1 on=point() v=sdir()*(.3..0.8)+up(.5) size=.08..0.16 acc=buoy(.35)+curl(.4)+drag(1.4) col=<.55,.53,.5> a=0>.3:.7>0 sz=$size*(1>2.6) r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.08 on=point() r=light(<1,.7,.35>,12,7)`
const CASING = `fx
pop case burst=1 life=1.2 on=point() v=<%side|1,0,0>*(1.6..2.2)+up(1.4..1.9) size=.016 acc=grav() col=hdr(1.6,1.2,.45) a=1>.9:1>0 rot=$age*30 floor=bounce(.35) r=sprite(soft-disc,alpha)`
const HULL = `fx
pop hull burst=1 life=1.4 on=point() v=<%side|1,0,0>*(1.4..1.9)+up(1.6..2.1) size=.026 acc=grav() col=<.7,.12,.08> a=1>.9:1>0 rot=$age*24 floor=bounce(.3) r=sprite(soft-disc,alpha)`
