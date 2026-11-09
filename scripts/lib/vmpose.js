// First-person weapon motion, posed from the camera rig (scripts/camera.js) every display frame.
// scripts/player.js spawns the arm + held weapon (player.state.vmId) and owns the rules (ammo, reload
// timers, damage); this file only moves that object. Guns: a per-gun recoil spring (muzzle climb, a shove
// back, a random twist), a brass casing out of the pistol, a keyframed magazine swap (tilt, eject flick,
// mag drop, insert slap, slide rack), a shotgun that rolls its loading port up and bucks at every shell,
// a pump stroke that throws the spent hull. Everything: sway that lags the look, strafe lean, walking bob,
// breathing at rest, a dip on landing, a lowered carry when sprinting, a raise with overshoot on equip.
// Springs and timelines run on real frame time; the object is posed with interpolation off.
import { SPLIT } from './weapon-look.js'
import W, { baseOf } from './weapons.js'
import { handling } from './stats.js'
import { cndOf } from './condition.js'
import { NV_SWINGS } from './data/nv-swings.js' // Shelly's New Vegas melee overhaul, decoded (art/nv-melee)

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
// the same swap from an empty gun (the slide is locked back): after the slap home the thumb comes up to the slide stop and lets it fly
const PISTOL_RELOAD_EMPTY = [
  [0.00, 0, 0, 0, 0, 0, 0],
  [0.14, -0.05, 0.03, -0.03, 18, -10, 38],
  [0.21, -0.05, 0.048, -0.03, 24, -11, 41],
  [0.30, -0.05, 0.0, -0.02, 13, -8, 35],
  [0.48, -0.055, -0.012, -0.02, 11, -8, 33],
  [0.54, -0.05, 0.036, -0.035, 21, -10, 36],  // slap it home
  [0.66, -0.04, 0.02, -0.03, 14, -8, 26],     // roll the gun toward you: thumb to the slide stop
  [0.76, -0.04, 0.026, -0.035, 16, -9, 24],   // press
  [0.82, -0.02, 0.0, 0.03, -5, -2, 8],        // the slide flies forward: a kick
  [0.90, -0.01, -0.006, -0.01, 2, -1, 3],
  [1.00, 0, 0, 0, 0, 0, 0],
]
// one shell going into the shotgun's port, over one reloadShell: the gun tips to meet the thumb, holds, then the shell is pushed in
const SHELL_CYCLE = [
  [0.00, 0, 0, 0, 0, 0, 0],
  [0.22, 0.004, 0.012, 0.01, -4, 1, -5],   // lifts to meet the shell
  [0.50, 0.0, 0.004, 0.0, -1, 0, -2],
  [0.80, -0.006, -0.004, -0.024, 5, -2, 4], // thumb pushes it home
  [0.92, 0.0, 0.006, 0.006, -2, 0, 0],
  [1.00, 0, 0, 0, 0, 0, 0],
]
const SHOTGUN_LOAD = [-0.045, 0.03, -0.02, 14, -9, 27] // loading port rolled up
const PUMP = [
  [0.00, 0, 0, 0, 0, 0, 0],
  [0.38, 0.0, -0.012, -0.075, 5, 1, -4],  // fore-end hauled back
  [0.62, 0.0, 0.004, 0.012, -2, 0, 1],    // and shoved home
  [1.00, 0, 0, 0, 0, 0, 0],
]

// melee: how each weapon is swung. Offsets [t, x, y, depth, pitch, yaw, roll] from the carried pose, for a right-handed swing; the
// next swing in a combo is mirrored. club: a diagonal haul across the body; slash: a wide flat sweep; stab: draw and thrust;
// chop: a short overhand; heavy: lifted overhead, held, then slammed down and left to bounce.
const SWING = {
  club: { dur: 0.34, f: [
    [0, 0, 0, 0, 0, 0, 0], [0.18, 0.12, 0.1, -0.1, 35, -30, -35], [0.4, -0.16, -0.08, 0.18, -55, 40, 25],
    [0.55, -0.22, -0.12, 0.12, -70, 55, 35], [0.78, -0.1, -0.05, 0.04, -30, 22, 12], [1, 0, 0, 0, 0, 0, 0]] },
  slash: { dur: 0.3, f: [
    [0, 0, 0, 0, 0, 0, 0], [0.15, 0.14, 0, -0.08, 5, -55, -45], [0.38, -0.2, -0.03, 0.2, -8, 60, 40],
    [0.55, -0.24, -0.04, 0.14, -10, 72, 46], [0.8, -0.1, -0.02, 0.05, -4, 30, 18], [1, 0, 0, 0, 0, 0, 0]] },
  stab: { dur: 0.22, f: [
    [0, 0, 0, 0, 0, 0, 0], [0.22, 0.02, 0.02, -0.16, 8, -6, -10], [0.42, -0.02, -0.01, 0.34, -4, 4, 6],
    [0.62, -0.02, -0.01, 0.3, -3, 3, 5], [1, 0, 0, 0, 0, 0, 0]] },
  chop: { dur: 0.36, f: [
    [0, 0, 0, 0, 0, 0, 0], [0.2, 0.1, 0.16, -0.12, 55, -10, -15], [0.42, -0.08, -0.12, 0.2, -75, 20, -10],
    [0.58, -0.1, -0.15, 0.16, -88, 24, -12], [0.8, -0.04, -0.05, 0.05, -30, 8, -4], [1, 0, 0, 0, 0, 0, 0]] },
  heavy: { dur: 0.64, f: [
    [0, 0, 0, 0, 0, 0, 0], [0.3, 0.06, 0.26, -0.18, 80, 0, -8], [0.46, 0.06, 0.28, -0.2, 86, 0, -8],
    [0.56, -0.04, -0.2, 0.24, -80, 6, 5], [0.64, -0.04, -0.25, 0.2, -90, 6, 5], [0.8, -0.02, -0.12, 0.1, -40, 3, 2], [1, 0, 0, 0, 0, 0, 0]] },
  cast: { dur: 0.65, f: [
    [0, 0, 0, 0, 0, 0, 0],
    [0.22, 0.04, 0.14, -0.16, 52, -12, 12],
    [0.44, 0.05, 0.18, -0.22, 68, -8, 10],
    [0.66, -0.02, -0.12, 0.28, -55, 6, -14],
    [0.82, -0.01, -0.08, 0.18, -32, 4, -8],
    [1, 0, 0, 0, 0, 0, 0]] },
}
const STYLE = { table_leg: 'club', pipe_scrap: 'club', crowbar: 'club', bat: 'club', rebar: 'club', wrench: 'club', stun_baton: 'club',
  hatchet: 'chop', fire_axe: 'heavy', sledgehammer: 'heavy', knife: 'stab', screwdriver: 'stab', lineman_machete: 'slash', fishing_rod: 'cast' }

const NV_PACE = 0.55 // NV's takes run long with their recovery: played at 55% of their length so a swing keeps this game's rhythm (my pick)
const ZERO_POSE = [0, 0, 0, 0, 0, 0]
const SAMPLE_BUF = [0, 0, 0, 0, 0, 0]
const PUMP_BUF = [0, 0, 0, 0, 0, 0]

function sample(frames, t, out) {
  t = Math.max(0, Math.min(1, t))
  let i = 1
  while (i < frames.length - 1 && frames[i][0] < t) i++
  const a = frames[i - 1], b = frames[i], u = ease((t - a[0]) / Math.max(1e-4, b[0] - a[0]))
  const res = out || [0, 0, 0, 0, 0, 0]
  const clampedU = Math.max(0, Math.min(1, u))
  for (let k = 1; k < 7; k++) res[k - 1] = a[k] + (b[k] - a[k]) * clampedU
  return res
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
  if (m.id !== ps.vmId) { m.id = ps.vmId; if (!m.seeded) { m.lastEquip = ps.equipAt ?? 0; m.seeded = true } /* a draw rebuilds the viewmodel: keep the old equip stamp so the new one still rises */ m.lastSwing = ps.swingAt ?? 0; m.lastPump = ps.pumpAt ?? 0; m.lastReload = ps.reloadN ?? 0; m.lastDry = ps.dryAt ?? 0; try { vm.interpolation = null } catch (e) { /* the engine keeps its default smoothing */ } }

  const kind = ps.equipped ?? 'fists', wp = W[kind] ?? W.fists, gun = !!wp.ranged
  const rc = wp.recoil ?? {}, hd = handling(ps, wp), aimDamp = (1 - 0.55 * m.ads) * hd.recoil // a heavy gun in weak arms kicks harder
  const view = ctx.self.view

  // ---- events written by player.js
  if (ps.swingAt && ps.swingAt !== m.lastSwing) {
    m.lastSwing = ps.swingAt; m.swingT = 0; m.thud = false
    if (!gun) { const n = ctx.now(); m.combo = n - (m.lastHit ?? 0) > 1100 ? 0 : (m.combo ?? 0) + 1; m.lastHit = n } // a quick second swing comes back the other way
    if (gun) {
      m.sv[3] += (rc.up ?? 220) * aimDamp * rnd(0.85, 1.15)
      m.sv[2] -= (rc.back ?? 1.2) * aimDamp
      m.sv[1] += (rc.lift ?? 0.3) * aimDamp
      m.sv[4] += (rc.side ?? 50) * rnd(-1, 1) * aimDamp
      m.sv[5] += (rc.twist ?? 70) * rnd(-0.4, 1) * aimDamp
      const muzzle = ctx.getObjectSocket(ps.vmId, 'muzzle')
      if (muzzle && muzzle.position) ctx.emit('fx', { position: muzzle.position, attachTo: ps.vmId, script: wp.pellets ? FLASH_BIG : FLASH })
      m.shotT = 0 // the slide's blowback
      if (wp.pellets || wp.tube) m.eject = true // the pump or lever throws the spent case
      else if (muzzle && muzzle.position && view) emitCasing(ctx, muzzle.position, view.yaw, false)
    }
  }
  if ((ps.reloadN ?? 0) !== m.lastReload) {
    m.lastReload = ps.reloadN ?? 0
    if ((wp.pellets || wp.tube) && ps.reloading) { m.sv[1] += 0.55; m.sv[2] += 0.5; m.sv[3] -= 90; m.sv[5] += 40 } // thumb a shell in
  }
  if (ps.pumpAt && ps.pumpAt !== m.lastPump) { m.lastPump = ps.pumpAt; m.pumpT = 0; m.pumpEjected = false }
  if (ps.equipAt && ps.equipAt !== m.lastEquip) { m.lastEquip = ps.equipAt; m.equipT = 0 }
  if (ps.dryAt && ps.dryAt !== m.lastDry) { m.lastDry = ps.dryAt; m.sv[3] += 45; m.sv[2] -= 0.15 }

  // ---- reload clock, local to this machine
  const reloading = !!ps.reloading && gun
  if (reloading && !m.relOn) { m.relOn = true; m.relT = 0; m.relKind = kind; m.relEmpty = (ps['loaded_' + kind] ?? 1) <= 0 }
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
    if (m.eject) { m.eject = false; const mz = ctx.getObjectSocket(ps.vmId, 'muzzle'); if (mz?.position && view) emitCasing(ctx, mz.position, view.yaw, !!wp.pellets) }
  }
  if (ps.swingAt !== m.heavyFor) { m.heavyFor = ps.swingAt; m.heavy = ps.swingHeavy ?? 0 }
  const style = SWING[STYLE[baseOf(kind)]] ?? SWING.club
  // the New Vegas take for this style: a combo's next swing plays NV's own left-hand-side swing instead of a mirror
  const nvKey = kind === 'fists' ? 'fists' : (STYLE[baseOf(kind)] ?? 'club'), nv = NV_SWINGS[(m.combo ?? 0) % 2 && NV_SWINGS[nvKey + '2'] ? nvKey + '2' : nvKey] ?? null
  m.nv = nv
  if (m.swingT != null && m.swingT < 1) m.swingT = Math.min(1, m.swingT + dt / ((nv ? nv.dur * NV_PACE : kind === 'fists' ? 0.2 : style.dur) * (1 + 0.45 * m.heavy)))
  // the wind-up: how far into a held power attack, 0..1, eased in the pose below
  const wind = !gun && ps.chargeAt ? Math.min(1, (ctx.now() - ps.chargeAt) / ((W.power?.charge ?? 0.9) * 1000)) : 0
  m.wind = (m.wind ?? 0) + (wind - (m.wind ?? 0)) * Math.min(1, dt * (wind ? 14 : 30))
  m.ads += ((ps.ads ? 1 : 0) - m.ads) * Math.min(1, dt * 12 * hd.raise) // and comes up to the eye slower
  m.breath += dt

  // reload pose target: the pistol plays its timeline, the shotgun holds the loading roll
  let target = ZERO_POSE, rate = 10
  if (m.relOn && m.relKind === kind) {
    if (wp.pellets || wp.tube) {
      const start = wp.reloadStart ?? 0.4, per = wp.reloadShell ?? 0.55, ph = (m.relT - start) / per
      if (ph < 0) { const k = ease(Math.max(0, m.relT / start)); for (let i = 0; i < 6; i++) SAMPLE_BUF[i] = SHOTGUN_LOAD[i] * k; target = SAMPLE_BUF; rate = 14 }
      else { const c = sample(SHELL_CYCLE, ph - Math.floor(ph), PUMP_BUF); for (let i = 0; i < 6; i++) SAMPLE_BUF[i] = SHOTGUN_LOAD[i] + c[i]; target = SAMPLE_BUF; rate = 22 }
    }
    else { target = sample(m.relEmpty ? PISTOL_RELOAD_EMPTY : PISTOL_RELOAD, m.relT / (ps.reloadDur || wp.reloadTime || 1.7), SAMPLE_BUF); rate = 30 }
  }
  const fr = Math.min(1, dt * rate)
  for (let i = 0; i < 6; i++) m.off[i] += (target[i] - m.off[i]) * fr
  const pump = (wp.pellets || wp.tube) && m.pumpT < 1 ? sample(PUMP, m.pumpT, PUMP_BUF) : ZERO_POSE

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
  if (!gun && kind !== 'fists') { x += wp.two ? 0.03 : 0.1; y -= 0.1; d += 0.3 } // a melee weapon rides out at the right edge, the fist low; two hands bring it to the middle
  else if (gun && wp.two) { x -= 0.07 * (1 - m.ads); y += 0.015 } // a long gun is held in both hands, nearer the centre of the screen
  x += m.swayX * sway + bobX + m.sp[0] + m.off[0] + pump[0]
  y += m.swayY * sway + bobY + brY + m.sp[1] + m.off[1] + pump[1]
  d += -m.sp[2] + m.off[2] + pump[2]
  // ---- rotation
  let pitch = (gun ? 0 : -14) + m.sp[3] + m.swayY * 140 * sway + brP + m.off[3] + pump[3]
  let yaw = (gun ? 0 : -6) - m.swayX * 140 * sway + m.sp[4] + brYaw + m.off[4] + pump[4]
  let roll = (gun ? 0 : -14) - m.swayX * 70 * sway + m.sp[5] - m.lean * 1.4 * sway + m.off[5] + pump[5]
  if (gun && ads[3]) pitch += ads[3] * a // weapons.yml ads[3]: the muzzle lifts so the rear sight and the bead stack on the crosshair (a sight line that falls toward the muzzle)

  // too heavy for your Hardiness: the gun sags and the muzzle wanders in your hands
  if (hd.hold > 0 && (gun || kind !== 'fists')) { const wob = Math.sin(m.breath * 1.3) * Math.cos(m.breath * 0.8); y -= hd.hold * 0.035 * (1 - 0.5 * m.ads); pitch -= hd.hold * 5; yaw += wob * hd.hold * 2.2; roll += Math.sin(m.breath * 1.9) * hd.hold * 2 }
  // worn weapon mechanical wear: loose pins, rattling receiver, looser tolerances
  const cndVal = kind !== 'fists' ? cndOf(ps, kind) : 100
  if (cndVal < 50) {
    const loose = (50 - cndVal) / 50
    const rat = Math.sin(m.breath * 32) * loose
    pitch += rat * 0.45 * (1 - 0.5 * m.ads)
    yaw += Math.cos(m.breath * 26) * 0.35 * (1 - 0.5 * m.ads) * loose
    y += rat * 0.0012
  }
  // sprinting: lower it and turn it away
  y -= run * 0.07; pitch -= run * 18; yaw += run * 14; x -= run * 0.03

  // a melee chop (or a jab for the fists), eased
  if (!gun && m.swingT != null && m.swingT < 1) {
    const e = ease(Math.sin(m.swingT * Math.PI))
    const h = 1 + 0.7 * (m.heavy ?? 0), side = (m.combo ?? 0) % 2 ? -1 : 1
    if (m.nv) { // the decoded NV path, unmirrored (its own left swing rides the combo)
      const o = sample(m.nv.f, m.swingT, SAMPLE_BUF), g = 1 + 0.45 * (m.heavy ?? 0)
      x += o[0] * g; y += o[1] * g; d += o[2] * g; pitch += o[3]; yaw += o[4]; roll += o[5]
      if (style === SWING.heavy && m.swingT > 0.4 && !m.thud) { m.thud = true; ctx.emit('cameraPunch', { direction: { x: 0, y: -1, z: -0.3 }, intensity: 0.22 + 0.3 * (m.heavy ?? 0) }, { audience: { player: ctx.self.id } }) }
    } else if (kind === 'fists') { d += 0.28 * e * h; x -= 0.07 * e * h * side; y += 0.03 * e; roll -= 10 * e * side; yaw += 8 * e * side }
    else {
      const o = sample(style.f, m.swingT, SAMPLE_BUF), g = 1 + 0.45 * (m.heavy ?? 0)
      x += o[0] * g * side; y += o[1] * g; d += o[2] * g; pitch += o[3] * g; yaw += o[4] * g * side; roll += o[5] * g * side
      if (style === SWING.heavy && m.swingT > 0.56 && !m.thud) { m.thud = true; ctx.emit('cameraPunch', { direction: { x: 0, y: -1, z: -0.3 }, intensity: 0.22 + 0.3 * (m.heavy ?? 0) }, { audience: { player: ctx.self.id } }) } // the slam lands
    }
  }
  // a held power attack: cocked back over the shoulder, trembling once it is full
  if (!gun && m.wind > 0.001) {
    const k = ease(m.wind), full = m.wind > 0.97 ? 1 : 0, tr = full ? Math.sin(m.breath * 70) : 0
    if (kind === 'fists') { d -= 0.22 * k; x += 0.1 * k; y -= 0.06 * k; roll += 28 * k + tr * 2; yaw -= 18 * k; pitch += 10 * k }
    else { pitch += 30 * k + tr * 1.5; yaw -= 25 * k; roll -= 20 * k + tr * 2; x += 0.14 * k; y += 0.14 * k; d -= 0.14 * k }
  }

  // active fishing line in the water: elevated waiting angle, sudden strike dip, or reel-in haul
  if (baseOf(kind) === 'fishing_rod' && ps.fishingState) {
    const fs = ps.fishingState;
    if (fs.phase === 'bite') {
      const biteShake = Math.sin(m.breath * 38) * 3;
      pitch -= 18; y -= 0.07; roll += biteShake; yaw += biteShake * 0.4;
    } else if (fs.phase === 'reeling') {
      pitch += 24; y += 0.08; d -= 0.06;
    } else if (fs.phase === 'nibble') {
      const nibbleShake = Math.sin(m.breath * 24) * 1.5;
      pitch += 12 + nibbleShake; y += 0.02; roll -= 4;
    } else {
      const gentleSway = Math.sin(m.breath * 2.2) * 1.4;
      pitch += 16 + gentleSway; y += 0.03; roll -= 5;
    }
  }

  // raising a freshly equipped weapon: up from below the frame, a little past, and settle
  let up = backOut(m.equipT), lo = 1 - up
  if (ps.sheathed && ps.sheathAt) { const k = Math.min(1, Math.max(0, (Date.now() - (m.sheathSeen ??= Date.now())) / 350)); lo = Math.max(lo, k * k * 1.3); up = 1 - lo } else m.sheathSeen = undefined // holstering: the hand drops below the frame, then goes
  y -= lo * 0.3
  if (gun) { pitch -= lo * 35; roll += lo * 18; x += lo * 0.04 } else { roll += lo * 10 }

  // a weapon's own carry: weapons.yml hold: [x, y, depth, pitch, yaw, roll] added to the rest pose, eased out while aiming (vmTune.hold tunes it live)
  const hold = ps.vmTune?.hold ?? wp.hold
  if (hold) { const k = 1 - m.ads; x += hold[0] * k; y += hold[1] * k; d += hold[2] * k; pitch += hold[3] * k; yaw += hold[4] * k; roll += hold[5] * k }
  vm.feetPosition = { attach: 'camera', x, y, depth: d, fov: VM_FOV }
  partsPose(ctx, ps, kind, dt, m)
  vm.rotation = { yaw, pitch, roll }
}

// the split pistol's own parts: the slide blows back on a shot and racks in the reload, the magazine drops out and slides home
const PARTS = { pistol: Object.fromEntries(SPLIT.pistol.map(([id, , at]) => [id, at])) }
function partsPose(ctx, ps, kind, dt, m) {
  const base = PARTS[kind]; if (!base) return
  const gun = ctx.getObject(ps.vmId + '/gun'); if (!gun) return
  const kids = (gun.children ?? []).map((c) => (typeof c === 'string' ? ctx.getObject(c) : c)).filter(Boolean)
  const part = (n) => kids.find((c) => c.id === n || c.id?.endsWith('/' + n))
  m.shotT = (m.shotT ?? 9) + dt
  const empty = (ps['loaded_' + kind] ?? 1) <= 0
  let back = m.shotT < 0.03 ? m.shotT / 0.03 : Math.max(0, 1 - (m.shotT - 0.03) / 0.07) // 10 cm/s snap back, spring home
  let magDown = 0, magHide = false
  if (m.relOn) {
    const t = m.relT / (ps.reloadDur || (W[kind] ?? {}).reloadTime || 1.7)
    if (t > 0.17 && t < 0.3) magDown = (t - 0.17) / 0.13
    else if (t >= 0.3 && t < 0.48) { magDown = 1; magHide = true }
    else if (t >= 0.48 && t < 0.56) magDown = 1 - (t - 0.48) / 0.08
    if (m.relEmpty) back = t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.03)
    else if (t > 0.74 && t < 0.86) back = t < 0.8 ? (t - 0.74) / 0.06 : 1 - (t - 0.8) / 0.06
  } else if (empty) back = 1 // locked back on the last round
  const sl = part('slide'), mg = part('mag'), sb = base.slide, mb = base.mag
  if (sl) { const z = sb[2] + back * 0.032; if (Math.abs((m.slideZ ?? sb[2]) - z) > 1e-4) { m.slideZ = z; sl.feetPosition = { x: sb[0], y: sb[1], z } } }
  if (mg) {
    const y = mb[1] - magDown * magDown * 0.16, z = mb[2] + magDown * 0.02
    if (Math.abs((m.magY ?? mb[1]) - y) > 1e-4) { m.magY = y; mg.feetPosition = { x: mb[0], y, z } }
    if (mg.visible !== !magHide) mg.visible = !magHide
  }
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
