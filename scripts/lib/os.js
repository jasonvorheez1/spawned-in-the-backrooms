// BackOS logic shared by scripts/os.js (the actions) and scripts/os-ui.js (the screen): what a computer holds, and its terminal.
import O from './data/os.yml'
import { skillsOf } from './stats.js'

export const PROFILE = (host) => { for (const [k, p] of Object.entries(O.profiles)) if (p.prefix && host.startsWith(p.prefix)) return k; return 'office' } // a host's prefix picks its profile (data/os.yml)
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const pickN = (list, host, n, seed) => { const a = list.map((m, i) => [m, hash(host + seed + i)]).sort((x, y) => x[1] - y[1]); return a.slice(0, n).map((x) => x[0]) }

// the mail a machine holds: its own profile's, a few from the office pool, and the welcome
export function mailsOf(host, admin) {
  const p = PROFILE(host)
  const own = O.mails.filter((m) => m.where === p && (admin || p === 'office' || m.tip !== 'key'))
  const mails = p === 'office' ? pickN(own, host, 3, 'm') : own.filter((m) => admin || m.from !== 'Overseer B' || p !== 'omega' || m.subj === 'Omega log')
  return [...mails, ...O.mails.filter((m) => m.where === 'any')].map((m, i) => ({ ...m, id: host + ':' + i }))
}
export const filesOf = (host) => [...O.files.filter((f) => f.where === PROFILE(host) || f.where === 'any')]
export const entriesOf = (admin) => O.entries.filter((e) => admin || !e.restricted)
export const entryById = (id) => O.entries.find((e) => e.id === id)
export const binOf = () => O.bin ?? []
export const forumOf = (host) => pickN(O.forum, host, 4, 'f')
export const passwordOf = (host) => O.passwords[PROFILE(host)] ?? null

// the terminal: returns { out: [lines], act?: 'logout' | 'hack' | 'unlock' | 'clear' | 'open:<app>' }
export function runCmd(os, line, who) {
  const [cmd, ...rest] = String(line).trim().split(/\s+/), arg = rest.join(' '), c = (cmd || '').toLowerCase(), admin = os.user === 'admin'
  const files = filesOf(os.host)
  const out = (...l) => ({ out: l })
  if (!c) return out()
  if (c === 'help') return out('help  ls  cat <file>  ver  whoami  hostname  level  entities  db <word>  mail  forum  login <password>  hack  logout  clear', 'also: date  ping  almond  blink  sudo  uptime  who  last  shutdown')
  if (c === 'clear') return { out: [], act: 'clear' }
  if (c === 'ls' || c === 'dir') return out(...files.map((f) => f.name), admin ? 'restricted/' : '')
  if (c === 'cat' || c === 'type') { const f = files.find((x) => x.name === arg); return f ? out(...f.text.split('\n')) : out(`cat: ${arg || '?'}: no such file`) }
  if (c === 'whoami') return out(admin ? 'admin' : 'guest')
  if (c === 'hostname') return out(os.host)
  if (c === 'ver' || c === 'about') return out(O.version, O.about.origin)
  if (c === 'uptime') return out('up 11,402 days, 15:40. load average: you')
  if (c === 'who') return out(admin ? 'admin    tty0   15:40' : 'guest    tty0   15:40', 'temp04   tty1   15:40   (idle 4 years)')
  if (c === 'last') return out(...O.about.users.map((u, i) => `${u.padEnd(12)} ${os.host}   15:40   ${i === O.about.users.length - 1 ? 'still logged in' : 'gone'}`))
  if (c === 'shutdown' || c === 'halt' || c === 'poweroff') return { out: ['shutting down...'], act: 'logout' }
  if (c === 'level') return out(O.profiles[PROFILE(os.host)]?.level ?? 'a desk somewhere')
  if (c === 'entities') return out(...entriesOf(admin).filter((e) => e.cat === 'Entities').map((e) => `${e.title.padEnd(14)} ${e.sc}`))
  if (c === 'db' || c === 'search') { const q = arg.toLowerCase(); const hits = entriesOf(admin).filter((e) => !q || e.title.toLowerCase().includes(q) || e.text.toLowerCase().includes(q)); return hits.length ? out(...hits.map((e) => `${e.cat}/${e.title}`), '(open the Database to read)') : out('no entries') }
  if (c === 'mail') return { out: ['opening Backmail...'], act: 'open:mail' }
  if (c === 'forum') return { out: ['opening Backdoor...'], act: 'open:forum' }
  if (c === 'date') return out('date: clock stopped at 15:40')
  if (c === 'ping') return out(arg === 'meg' || !arg ? 'meg: reply from somewhere, 4 ms' : `${arg}: host not found`)
  if (c === 'almond') return out('almond water is the common currency. this machine cannot drink it.')
  if (c === 'blink') return out('you are now blinking manually')
  if (c === 'sudo') return out('sudo: you are not in the sudoers file. this incident will be reported (nobody will read it).')
  if (c === 'logout' || c === 'exit') return { out: ['logging out...'], act: 'logout' }
  if (c === 'hack') {
    if (admin) return out('already admin.')
    const lock = os.lock || ''
    if (!lock.startsWith('science:')) return out('hack: nothing here to hack. try login.')
    const need = Number(lock.split(':')[1]), have = skillsOf(who?.state ?? {}).science ?? 0
    return have >= need ? { out: [`[Science ${have}/${need}] launching terminal intrusion protocol...`], act: 'open:hack' } : out(`hack: access denied. needs Science ${need}. you have ${have}.`)
  }
  if (c === 'login') {
    const pw = passwordOf(os.host)
    return pw && arg.toLowerCase() === pw ? { out: ['password accepted.', 'welcome, admin.'], act: 'unlock' } : out('login: incorrect password.')
  }
  return out(`${c}: command not found`)
}

// Level 11 security panels (scripts/os.js ctrl, scripts/os-ui.js)
export const CTRL = {
  sub: { title: 'MTA Station Control · Gate 07', rows: [
    { id: 'light', label: 'Platform lighting', act: 'CYCLE', say: 'The platform lights stutter off and on. Nothing else moves.' },
    { id: 'fare', label: 'Fare gates', act: 'FREE ENTRY', say: 'Turnstiles click to free entry. The steel gate stays shut.' },
    { id: 'rail', label: 'Third rail, track 2', act: 'ENERGIZE', say: 'Somewhere below, the rail hums. Better not walk the tracks.' },
    { id: 'gate', label: 'Gate 07 maglock', act: 'RELEASE', ok: true },
    { id: 'alarm', label: 'Station alarm', act: 'TEST', alarm: true } ] },
  sedco: { title: 'Sedco Closed-Circuit Security', rows: [
    { id: 'cctv', label: 'CCTV loop, cams 1-9', act: 'RECORD', say: 'The cameras start recording. Smile.' },
    { id: 'shut', label: 'Lobby shutters', act: 'LOWER', say: 'A shutter rattles down somewhere upstairs.' },
    { id: 'lift', label: 'Service elevator', act: 'LOCK', say: 'The elevator locks at B1.' },
    { id: 'vault', label: 'Vault B2 timelock', act: 'OVERRIDE', ok: true },
    { id: 'silent', label: 'Silent alarm', act: 'ARM', alarm: true } ] },
}
export const OPENS = { 'MTA-GATE-07': 'sub', 'SEDCO-SEC-01': 'sedco', 'BETA-DISPATCH-01': 'sub' }
