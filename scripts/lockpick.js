// Fallout-style lockpicking: the Lockpick skill gates the lock, then you find the sweet spot.
// A/D sweeps the bobby pin (0..180°), hold W to turn the lock, S gives up. Turning off the spot strains
// the pin: hold too long and it snaps. Started by scripts/interact.js (player.state.pick); one pin per snap.
import { heard } from "./lib/hear.js";
import { openLoot } from './interact.js'
import { skillsOf, attrsOf } from './lib/stats.js'
import { gain } from './player.js'

const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
const snd = (ctx, n, v = 0.6) => heard(ctx, { maxDistance: 22, refDistance: 3, clip: SND(n), position: ctx.self.feetPosition, volume: v }, { audience: { player: ctx.self.id } })
const note = (ctx, text) => { ctx.self.state.notice = { text, at: ctx.now() } }

// Savi's picks: half-width of the sweet spot grows with skill over the lock's level; partial turn out to +40°
const spotOf = (have, lv) => Math.min(24, 4 + Math.max(0, have - lv) * 0.3)
const PIN_HP = (have) => 0.85 + have / 220 // seconds of strain a pin takes

export function onInput(ctx, input) {
  const m = ctx.self.session
  m.ax = input.axes?.moveX ?? 0; m.az = input.axes?.moveZ ?? 0

  const d = input.actionData?.pick
  if (d && typeof d.k === 'string') {
    handlePickAction(ctx, d)
  }
}

function handlePickAction(ctx, d) {
  const s = ctx.self.state, pk = s.pick
  if (!pk) return
  const target = ctx.getObject(pk.id)
  if (!target) return end(ctx, '')

  if (d.k === 'close') {
    return end(ctx, 'You put the pin away.')
  }

  const sk = skillsOf(s).lockpick ?? 0
  const attr = attrsOf(s), luck = attr.l ?? 5

  if (d.k === 'force') {
    const chance = Math.min(0.95, Math.max(0.12, 0.2 + (sk - pk.lv) * 0.012 + luck * 0.02))
    if (ctx.random() < chance) {
      target.state.lock = ''
      const xp = Math.round(pk.lv * 0.5)
      gain(ctx, xp)
      snd(ctx, 'lock-picking-click', 0.8)
      note(ctx, `[Force Lock ${Math.round(chance * 100)}%] The lock pops open! +${xp} XP`)
      s.pick = null; s.pickP = null; s.pickR = null
      if (pk.kind === 'door') {
        target.state.open = true
        heard(ctx, { clip: SND('heavy-metal-door-creak-open'), position: target.state.c ?? target.feetPosition, volume: 0.7, maxDistance: 16 }, { audience: { nearby: target.feetPosition, radius: 18 } })
      } else {
        target.state.name = 'Opened crate'
        openLoot(ctx, target)
      }
    } else {
      s.bobbypins = Math.max(0, (s.bobbypins ?? 0) - 1)
      s.pickSnap = ctx.now()
      snd(ctx, 'metal-pin-snap', 0.8)
      ctx.emit('screenShake', { intensity: 0.08, duration: 0.15 }, { audience: { player: ctx.self.id } })
      note(ctx, `[Force Lock ${Math.round(chance * 100)}%] Failed! Pin broke. (${s.bobbypins} left)`)
      if (!(s.bobbypins > 0)) end(ctx, 'Your last bobby pin snapped.')
    }
    return
  }

  if (d.k === 'auto') {
    if (sk >= pk.lv + 25) {
      target.state.lock = ''
      const xp = Math.round(pk.lv * 0.6)
      gain(ctx, xp)
      snd(ctx, 'lock-picking-click', 0.8)
      note(ctx, `[Master Lockpick] Cylinder unlatched. +${xp} XP`)
      s.pick = null; s.pickP = null; s.pickR = null
      if (pk.kind === 'door') {
        target.state.open = true
        heard(ctx, { clip: SND('heavy-metal-door-creak-open'), position: target.state.c ?? target.feetPosition, volume: 0.7, maxDistance: 16 }, { audience: { nearby: target.feetPosition, radius: 18 } })
      } else {
        target.state.name = 'Opened crate'
        openLoot(ctx, target)
      }
    }
    return
  }

  if (d.k === 'snap') {
    s.bobbypins = Math.max(0, (s.bobbypins ?? 0) - 1)
    s.pickSnap = ctx.now()
    snd(ctx, 'metal-pin-snap', 0.8)
    ctx.emit('screenShake', { intensity: 0.08, duration: 0.15 }, { audience: { player: ctx.self.id } })
    if (!(s.bobbypins > 0)) end(ctx, 'Your last bobby pin snapped.')
    return
  }

  if (d.k === 'success') {
    target.state.lock = ''
    const xp = Math.round(pk.lv * 0.8)
    gain(ctx, xp)
    snd(ctx, 'lock-picking-click', 0.8)
    note(ctx, `[Lockpick ${pk.lv}] Picked successfully! +${xp} XP`)
    s.pick = null; s.pickP = null; s.pickR = null
    if (pk.kind === 'door') {
      target.state.open = true
      heard(ctx, { clip: SND('heavy-metal-door-creak-open'), position: target.state.c ?? target.feetPosition, volume: 0.7, maxDistance: 16 }, { audience: { nearby: target.feetPosition, radius: 18 } })
    } else {
      target.state.name = 'Opened crate'
      openLoot(ctx, target)
    }
    return
  }
}

export function update(ctx, dt) {
  const s = ctx.self.state, pk = s.pick
  if (!pk) { ctx.sleep(0.25); return }
  const m = ctx.self.session, now = ctx.now()
  const target = ctx.getObject(pk.id)
  if (!target || !target.state?.lock) return end(ctx, '')

  // Proximity check: walk away and it closes
  const p = ctx.self.feetPosition, tp = target.feetPosition ?? target.state?.c
  if (tp && Math.hypot(p.x - tp.x, p.z - tp.z) > 4.5) return end(ctx, '')

  if (!m.run || m.run !== pk.at) { // a fresh attempt
    m.run = pk.at; m.p = 90; m.r = 0; m.hp = PIN_HP(skillsOf(s).lockpick ?? 0); m.pub = 0; m.click = 0
  }
  const v = ctx.self.velocity; ctx.self.velocity = { x: 0, y: v.y, z: 0 }
  if ((m.az ?? 0) < -0.5) return end(ctx, 'You put the pin away.')
  const turning = (m.az ?? 0) > 0.5
  if (!turning) m.p = Math.max(0, Math.min(180, m.p + (m.ax ?? 0) * 85 * dt))
  const off = Math.abs(m.p - pk.sweet), w = pk.w
  const maxR = off <= w ? 90 : Math.max(0, 90 * (1 - (off - w) / 40))
  if (turning) {
    m.r = Math.min(maxR, m.r + 140 * dt)
    if (m.r >= 89.5) { // open
      const it = target; if (pk.kind === 'boiler') { const xp = Math.round(pk.lv * 0.8); gain(ctx, xp); snd(ctx, 'lock-picking-click', 0.8); note(ctx, `[Lockpick ${pk.lv}] The padlock gives! +${xp} XP`); s.pick = null; s.pickP = null; s.pickR = null; s.l5boilerPick = ctx.now(); ctx.emit('press', { by: ctx.self.id }, { to: it.id }); return }
      it.state.lock = ''
      const xp = Math.round(pk.lv * 0.8)
      gain(ctx, xp)
      snd(ctx, 'lock-picking-click', 0.8); note(ctx, `[Lockpick ${pk.lv}] The lock gives! +${xp} XP`)
      s.pick = null; s.pickP = null; s.pickR = null
      if (pk.kind === 'door') { it.state.open = true; heard(ctx, { clip: SND('heavy-metal-door-creak-open'), position: it.state.c ?? it.feetPosition, volume: 0.7, maxDistance: 16 }, { audience: { nearby: it.feetPosition, radius: 18 } }) }
      else { it.state.name = 'Opened crate'; openLoot(ctx, it) }
      return
    }
    if (m.r >= maxR - 0.5) { // straining against the pins
      m.hp -= dt
      if (now - m.click > 180) { m.click = now; snd(ctx, 'lock-picking-click', 0.25) }
      if (m.hp <= 0) {
        s.bobbypins = Math.max(0, (s.bobbypins ?? 0) - 1); m.r = 0; m.hp = PIN_HP(skillsOf(s).lockpick ?? 0)
        snd(ctx, 'metal-pin-snap', 0.8); ctx.emit('screenShake', { intensity: 0.08, duration: 0.15 }, { audience: { player: ctx.self.id } })
        s.pickSnap = now
        if (!(s.bobbypins > 0)) return end(ctx, 'Your last bobby pin snapped.')
      }
    }
  } else m.r = Math.max(0, m.r - 220 * dt)
  if (now - m.pub > 70) { m.pub = now; s.pickP = Math.round(m.p); s.pickR = Math.round(m.r) } // the dial the HUD draws
}

function end(ctx, msg) {
  const s = ctx.self.state; s.pick = null; s.pickP = null; s.pickR = null
  if (msg) note(ctx, msg)
}

// called by interact.js when E meets a lockpick lock you have the skill for
export function startPick(ctx, it, lv, kind) {
  const s = ctx.self.state
  s.bobbypins = s.bobbypins != null ? s.bobbypins : 6 // wanderers start with 6 bobby pins
  if (!(s.bobbypins > 0)) { note(ctx, `Locked · Lockpick ${lv}. You need a bobby pin.`); return false }
  const have = skillsOf(s).lockpick ?? 0
  s.pick = { id: it.id, lv, kind, name: it.state?.name ?? (kind === 'door' ? 'Locked door' : 'Supply crate'), sweet: Math.round(10 + ctx.random() * 160), w: spotOf(have, lv), at: ctx.now() }
  s.pickP = 90
  s.pickR = 0
  snd(ctx, 'lock-picking-click', 0.4)
  return true
}
