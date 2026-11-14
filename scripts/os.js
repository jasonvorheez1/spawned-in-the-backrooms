// Back OS(tm): the player's side of a computer (player.state.os = { id, host, lock, user: guest | admin, app, at, sel, term }).
import { CTRL, OPENS } from './lib/os.js'
// The screen is scripts/os-ui.js; the machine is scripts/computer.js; what it holds is scripts/lib/os.js + data/os.yml.
// 'os' action: {k:'close'} {k:'app', v} {k:'mail', id} {k:'entry', id} {k:'file', v} {k:'cat', v} {k:'cmd', v} {k:'pw', v} {k:'hack'} {k:'login'}
import { takeToken, gain } from './player.js'
import { spawnCrate } from './lib/loot.js'
import { ROOMS } from './lib/level4.js'
import { runCmd, mailsOf, entryById } from './lib/os.js'
import { heard } from './lib/hear.js'
import { skillsOf } from './lib/stats.js'
import { initHacking, guessPassword, activateBracket } from './lib/fallout-hack.js'
import { setSedcoStep } from './lib/level11-quests.js'

const BOOT_MS = 3200
const APPS = ['ctrl', 'desktop', 'mail', 'db', 'files', 'forum', 'term', 'about', 'notes', 'bin', 'hack']
const OFF_MS = 2200 // the shut-down screen, then you stand
const seen = (s, key, id) => String(s[key] ?? '').split(',').includes(id)
const mark = (s, key, id) => { s[key] = [s[key], id].filter(Boolean).join(',') }
const note = (ctx, s, text) => { s.notice = { text, at: ctx.now() } }
const close = (ctx, s) => { s.os = null; s.osClosedAt = ctx.now() }
// leaving is in-world: Start > Shut Down (or E, or the terminal's shutdown) plays the power-off, then you stand up
const shutdown = (ctx, s) => { if (s.os && s.os.app !== 'off') s.os = { ...s.os, app: 'off', menu: false, at: ctx.now() } }

// Level 11 unlockables (Shelly: "hacking some stuff and pressing the right thing can unlock some stuff"): getting in is half of it.
// The security panel holds a row of switches; one releases the door, the harmless ones just do their thing, the alarm locks you out.
function unlock(ctx, s) {
  const c = ctx.getObject(s.os.id); if (c) c.state.unlocked = true
  const opens = OPENS[s.os.host], uk = s.os.host || s.os.id
  const first = uk ? !seen(s, 'osUnlock', uk) : true
  if (first && uk) mark(s, 'osUnlock', uk)
  s.os = { ...s.os, user: 'admin', lock: '', app: opens ? 'ctrl' : 'desktop' }
  if (first) gain(ctx, 30)
  note(ctx, s, opens ? 'Admin access. The security panel is open.' : 'Access gained. Restricted files are open.')
}
function ctrl(ctx, s, id) {
  const os = s.os, key = OPENS[os.host], C = CTRL[key], r = C?.rows.find((x) => x.id === id)
  if (!r || os.user !== 'admin') return
  if (r.ok) {
    const g = r.grant ?? key
    if (!String(s.l11Access ?? '').split(',').includes(g)) { s.l11Access = [s.l11Access, g].filter(Boolean).join(','); gain(ctx, 40) }
    s.os = { ...os, done: { ...(os.done ?? {}), [id]: true } }
    note(ctx, s, r.say ?? (key === 'sub' ? 'Gate 07 released. The station gate under the subway stair is open to you.' : 'Timelock overridden. The Sedco vault door below the street is open to you.'))
    if (os.host === "SEDCO-SEC-01") {
      setSedcoStep(ctx, ctx.self, 2, "Objective Complete: Sedco Security Overridden · Enter Sedco Spotlight")
    }
    return
  }
  if (r.alarm) { // the wrong switch: the alarm screams and the terminal locks itself again
    const c = ctx.getObject(os.id); if (c) { delete c.state.unlocked; c.state.lock = c.state.lock || 'science:10' }
    note(ctx, s, 'ALARM. The terminal locks you out. You\'ll have to break in again.')
    ctx.emit('screenShake', { intensity: 0.25, duration: 0.3 }, { audience: { player: ctx.self.id } })
    ctx.emit('playSound', { clip: '/cdn/moodboard-realistic-gritty/sfx-building-security-alarm-bell-ringing-short.mp3', position: ctx.self.feetPosition, volume: 0.8, maxDistance: 40 })
    shutdown(ctx, s); return
  }
  s.os = { ...os, done: { ...(os.done ?? {}), [id]: true } }
  note(ctx, s, r.say)
}

function act(ctx, s, d) {
  let os = s.os; if (!os) return
  if (d.k === 'close' || d.k === 'off') return shutdown(ctx, s)
  if (os.app === 'off') return
  if (d.k === 'menu') { s.os = { ...os, menu: !os.menu }; return }
  if (os.app === 'boot') return
  if (d.k === 'app' && APPS.includes(d.v) && os.app !== 'login') { s.os = { ...os, app: d.v, sel: '', q: '', menu: false }; return }
  if (d.k === 'ctrl') return ctrl(ctx, s, String(d.v || ''))
  if (d.k === 'cat') { s.os = { ...os, cat: String(d.v || ''), sel: '' }; return }
  if (d.k === 'pw' || d.k === 'login') { // the login screen: guest, or a password
    if (d.k === 'login' || !d.v) { s.os = { ...os, app: 'desktop' }; return }
    const r = runCmd(os, 'login ' + d.v, ctx.self)
    if (r.act === 'unlock') return unlock(ctx, s)
    s.os = { ...os, err: 'Incorrect password.' }; return
  }
  if (d.k === 'hack') {
    if (os.user === 'admin') return
    const lock = os.lock || ''
    if (!lock.startsWith('science:')) {
      s.os = { ...os, err: 'Nothing here to hack. Try login.' }
      return
    }
    const need = Number(lock.split(':')[1] || 10)
    const have = skillsOf(ctx.self.state ?? {}).science ?? 0
    if (have < need) {
      s.os = { ...os, err: `[Science ${have}/${need}] Access Denied. Insufficient Science skill.` }
      return
    }
    s.os = {
      ...os,
      app: 'hack',
      err: '',
      hack: initHacking(os.host, need, have, Math.floor(ctx.random() * 1000000))
    }
    return
  }
  if (d.k === 'hack_guess' && os.hack) {
    const res = guessPassword(os.hack, d.v, ctx.now())
    if (res.result === 'win') {
      heard(ctx, { clip: 'cdn/sfx-soft-bright-two-note-success-chime.mp3', position: ctx.self.feetPosition, volume: 0.8 }, { audience: { player: ctx.self.id } })
      unlock(ctx, s)
      return
    }
    if (res.result === 'miss') {
      heard(ctx, { clip: 'cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3', position: ctx.self.feetPosition, volume: 0.65 }, { audience: { player: ctx.self.id } })
      ctx.emit('screenShake', { intensity: 0.08, duration: 0.15 }, { audience: { player: ctx.self.id } })
    } else if (res.result === 'lockout') {
      heard(ctx, { clip: 'cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3', position: ctx.self.feetPosition, volume: 0.95 }, { audience: { player: ctx.self.id } })
      ctx.emit('screenShake', { intensity: 0.22, duration: 0.35 }, { audience: { player: ctx.self.id } })
    }
    s.os = { ...os }
    return
  }
  if (d.k === 'hack_bracket' && os.hack) {
    activateBracket(os.hack, d.v, ctx.now())
    heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-brass-elevator-button-click.mp3', position: ctx.self.feetPosition, volume: 0.75, pitch: 1.3 }, { audience: { player: ctx.self.id } })
    s.os = { ...os }
    return
  }
  if (d.k === 'hack_abort') {
    s.os = { ...os, app: os.lock && os.user !== 'admin' ? 'login' : 'desktop' }
    return
  }
  if (d.k === 'mail') {
    const m = mailsOf(os.host, os.user === 'admin').find((x) => x.id === d.id); if (!m) return
    s.os = { ...os, sel: m.id }
    if (m.tip && !seen(s, 'osTips', m.id)) {
      mark(s, 'osTips', m.id)
      if (m.tip === 'xp') { gain(ctx, 40); note(ctx, s, 'Something about that message stays with you. +40 XP') }
      if (m.tip === 'key') { takeToken(ctx, 'keycard'); note(ctx, s, 'The safe is in the corner. You take the keycard.') }
      if (m.tip === 'crate' && ctx.self.place === 'level4') { const r = ROOMS.filter((q) => q.kind === 'office')[Math.floor(ctx.random() * 24)]; spawnCrate(ctx, { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }, 'l4'); note(ctx, s, `A box under the desk in ${r.label}. Marked on your memory.`) }
    }
    return
  }
  if (d.k === 'entry') {
    const e = entryById(d.id); if (!e || (e.restricted && os.user !== 'admin')) return
    s.os = { ...os, sel: e.id }
    if (!seen(s, 'osRead', e.id)) {
      mark(s, 'osRead', e.id); gain(ctx, 8)
      if (e.studied && !seen(s, 'studied', e.studied)) { mark(s, 'studied', e.studied); note(ctx, s, `You study the ${e.title} file. You will hit it harder.`) }
    }
    return
  }
  if (d.k === 'file') { s.os = { ...os, sel: String(d.v || '') }; return }
  if (d.k === 'bin') { s.os = { ...os, sel: String(d.id || '') }; return }
  if (d.k === 'note') { s.osNote = String(d.v ?? '').slice(0, 800); s.os = { ...os, saved: ctx.now() }; return }
  if (d.k === 'cmd') {
    const line = String(d.v || '').slice(0, 80), r = runCmd(os, line, ctx.self)
    let term = [...(os.term ?? []), '> ' + line, ...r.out.filter((x) => x !== '')]
    if (r.act === 'clear') term = []
    term = term.slice(-40)
    s.os = { ...os, term }
    if (r.act === 'unlock') unlock(ctx, s)
    else if (r.act === 'logout') shutdown(ctx, s)
    else if (r.act === 'open:hack') {
      const lock = os.lock || ''
      const need = Number(lock.split(':')[1] || 10)
      const have = skillsOf(ctx.self.state ?? {}).science ?? 0
      s.os = { ...os, app: 'hack', err: '', hack: initHacking(os.host, need, have, Math.floor(ctx.random() * 1000000)) }
    }
    else if (r.act?.startsWith('open:')) s.os = { ...s.os, app: r.act.slice(5), sel: '' }
  }
}

export function onInput(ctx, input) {
  const s = ctx.self.state
  if (!s.os) return
  if (input.pressed?.interact && s.os.app !== 'off' && ctx.now() - (s.os.at ?? 0) > 400) return shutdown(ctx, s) // E shuts it down (not the same press that opened it)
  const d = input.actionData?.os
  if (input.pressed?.os && d && typeof d.k === 'string') act(ctx, s, d)
}

export function update(ctx, dt) {
  const s = ctx.self.state
  const sit = !!s.os // everyone sees you sit at the desk while Back OS is up
  if (sit !== !!ctx.self.session.osSit) { ctx.self.session.osSit = sit; ctx.self.anim.os = sit ? { clip: 'cdn/clip-sit-loop.glb', weight: 1, loop: true } : null }
  if (sit) { const c = ctx.getObject(s.os.id); if (c) { const p = ctx.self.feetPosition; ctx.self.rotation = { yaw: Math.atan2(-(c.feetPosition.x - p.x), -(c.feetPosition.z - p.z)) * 180 / Math.PI }; const v = ctx.self.velocity; ctx.self.velocity = { x: 0, y: v.y, z: 0 } } }
  if (!s.os) return
  const os = s.os, now = ctx.now()
  if (os.app === 'off') { if (now - os.at > OFF_MS) close(ctx, s); return }
  if (os.app === 'boot' && now - os.at > BOOT_MS) s.os = { ...os, app: os.lock && os.user !== 'admin' ? 'login' : 'desktop' }
  const c = ctx.getObject(os.id), p = ctx.self.feetPosition // walk away and it logs out
  if (!c || Math.hypot(c.feetPosition.x - p.x, c.feetPosition.z - p.z) > 4) close(ctx, s)
}
