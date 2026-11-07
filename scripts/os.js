// Back OS(tm): the player's side of a computer (player.state.os = { id, host, lock, user: guest | admin, app, at, sel, term }).
// The screen is scripts/os-ui.js; the machine is scripts/computer.js; what it holds is scripts/lib/os.js + data/os.yml.
// 'os' action: {k:'close'} {k:'app', v} {k:'mail', id} {k:'entry', id} {k:'file', v} {k:'cat', v} {k:'cmd', v} {k:'pw', v} {k:'hack'} {k:'login'}
import { takeToken, gain } from './player.js'
import { spawnCrate } from './lib/loot.js'
import { ROOMS } from './lib/level4.js'
import { runCmd, mailsOf, entryById } from './lib/os.js'

const BOOT_MS = 3200
const APPS = ['desktop', 'mail', 'db', 'files', 'forum', 'term', 'about']
const seen = (s, key, id) => String(s[key] ?? '').split(',').includes(id)
const mark = (s, key, id) => { s[key] = [s[key], id].filter(Boolean).join(',') }
const note = (ctx, s, text) => { s.notice = { text, at: ctx.now() } }
const close = (ctx, s) => { s.os = null; s.osClosedAt = ctx.now() }

function unlock(ctx, s) {
  const c = ctx.getObject(s.os.id); if (c) c.state.unlocked = true
  s.os = { ...s.os, user: 'admin', lock: '', app: 'desktop' }
  gain(ctx, 30); note(ctx, s, 'Access gained. Restricted files are open.')
}

function act(ctx, s, d) {
  let os = s.os; if (!os) return
  if (d.k === 'close') return close(ctx, s)
  if (os.app === 'boot') return
  if (d.k === 'app' && APPS.includes(d.v) && os.app !== 'login') { s.os = { ...os, app: d.v, sel: '', q: '' }; return }
  if (d.k === 'cat') { s.os = { ...os, cat: String(d.v || ''), sel: '' }; return }
  if (d.k === 'pw' || d.k === 'login') { // the login screen: guest, or a password
    if (d.k === 'login' || !d.v) { s.os = { ...os, app: 'desktop' }; return }
    const r = runCmd(os, 'login ' + d.v, ctx.self)
    if (r.act === 'unlock') return unlock(ctx, s)
    s.os = { ...os, err: 'Incorrect password.' }; return
  }
  if (d.k === 'hack') {
    const r = runCmd(os, 'hack', ctx.self)
    if (r.act === 'unlock') return unlock(ctx, s)
    s.os = { ...os, err: r.out[0] }; return
  }
  if (d.k === 'mail') {
    const m = mailsOf(os.host, os.user === 'admin').find((x) => x.id === d.id); if (!m) return
    s.os = { ...os, sel: m.id }
    if (m.tip && !seen(s, 'osTips', m.id)) {
      mark(s, 'osTips', m.id)
      if (m.tip === 'xp') { gain(ctx, 40); note(ctx, s, 'Something about that message stays with you. +40 XP') }
      if (m.tip === 'key') { takeToken(ctx, 'keycard'); note(ctx, s, 'The safe is in the corner. You take the keycard.') }
      if (m.tip === 'crate' && ctx.self.place === 'level4') { const r = ROOMS.filter((q) => q.kind === 'office')[Math.floor(ctx.random() * 24)]; spawnCrate(ctx, { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }); note(ctx, s, `A box under the desk in ${r.label}. Marked on your memory.`) }
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
  if (d.k === 'cmd') {
    const line = String(d.v || '').slice(0, 80), r = runCmd(os, line, ctx.self)
    let term = [...(os.term ?? []), '> ' + line, ...r.out.filter((x) => x !== '')]
    if (r.act === 'clear') term = []
    term = term.slice(-40)
    s.os = { ...os, term }
    if (r.act === 'unlock') unlock(ctx, s)
    else if (r.act === 'logout') close(ctx, s)
    else if (r.act?.startsWith('open:')) s.os = { ...s.os, app: r.act.slice(5), sel: '' }
  }
}

export function onInput(ctx, input) {
  const s = ctx.self.state
  if (!s.os) return
  if (input.pressed?.interact && ctx.now() - (s.os.at ?? 0) > 400) return close(ctx, s) // E closes it (not the same press that opened it)
  const d = input.actionData?.os
  if (input.pressed?.os && d && typeof d.k === 'string') act(ctx, s, d)
}

export function update(ctx, dt) {
  const s = ctx.self.state
  if (!s.os) return
  const os = s.os, now = ctx.now()
  if (os.app === 'boot' && now - os.at > BOOT_MS) s.os = { ...os, app: os.lock && os.user !== 'admin' ? 'login' : 'desktop' }
  const c = ctx.getObject(os.id), p = ctx.self.feetPosition // walk away and it logs out
  if (!c || Math.hypot(c.feetPosition.x - p.x, c.feetPosition.z - p.z) > 4) close(ctx, s)
}
