// Samantha (Entity 26): a very small tuxedo cat who keeps the Beverly Room. A real cat on four legs (her own rig and clips:
// Idle sits with a tail flick, Groom, Walk, Run, Pounce). She ambles a slow round through the Main Hall, sits on furniture,
// now and then is simply in another room. E opens the talk card (scripts/talk.js; persona in data/talk.yml). Her card buttons
// (state.offers) ring ears.talkopt: meat buys a reading (premium = true facts from the player's world, poor = an insult);
// no meat or a refusal is warned once, then claws. She never kills (hp floors at 1) and cannot be killed (she blinks away).
// Numbers and lines: scripts/lib/data/samantha.yml.
import { findPath } from 'builtin/nav'
import { EXITS, ZONES, zoneAt, ZONE_NAMES } from './lib/level5.js'
import { describe } from './lib/items.js'
import S from './lib/data/samantha.yml'
import TK from './lib/data/talk.yml'

export const MODEL = '/cdn/value.05b6fcdb02ae0489f79f366c2285414facaa51f7639114b24430fb4ac82f5455.glb'
const ME = 'l5-samantha'
const SND = (w) => `/cdn/moodboard-realistic-gritty/sfx-${w}.mp3`
const VOX = (line) => `/cdn/voice-samantha-saying-${String(line).toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ +/g, '-').slice(0, 160)}.mp3`
const HOST = ['smiler', 'lurker', 'hound', 'stealer', 'deathmoth', 'moth', 'entity', 'hostile']
const rr = (a, ctx) => a[0] + ctx.random() * (a[1] - a[0])
// a visit off her own floor (Level 3's lift: scripts/l3-samantha.js) hands her state.home and state.spots; no perches there
const AWAYOF = (ctx) => !!ctx.self.state.spots
const HOME = (ctx) => ctx.self.state.home ?? S.home, SPOTS = (ctx) => ctx.self.state.spots ?? S.spots
const zn = (ctx, x, z) => { if (AWAYOF(ctx)) return 'the station halls'; const r = zoneAt(x, z); return r ? ZONE_NAMES[r.id] ?? r.id : 'the dark between rooms' }
const yawTo = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI
const BLINK = `fx
pop mist burst=24..32 life=.7..1.3 on=sphere(.3).c(.25) v=sdir()*(.3..0.9)+up(.4) size=.18..0.34 acc=buoy(.4)+curl(.6)+drag(1.4) col=<.35,.8,.45> a=0>.3:.3>0 sz=$size*(.5>1.7) rot=spin(.3) r=sprite(smoke-puff,add)
pop mote burst=14..20 life=.6..1.2 on=sphere(.3).c(.25) v=sdir()*(.6..1.6) size=.02..0.04 acc=drag(1.5)+curl(.5) col=hdr(1.2,3.2,1.4) a=1>0 r=sprite(mote,add)
pop glow burst=1 life=.7 g=1>0 r=light(<.5,1,.6>,$g*5,4)`
const CLAW = `fx
pop fur burst=8..12 life=.5..0.9 v=sdir()*(1..2.4)+up(.6) size=.03..0.06 spin=-8..8 acc=grav()*.5+drag(1.8) col=<.08,.08,.09> a=1>0 sz=$size rot=$age*$spin r=sprite(stalk,alpha,velocity,.02)
pop drop burst=5..8 life=.4..0.7 v=sdir()*(1.2..2.6) size=.02..0.035 acc=grav() col=<.55,.04,.04> a=1>0 floor=stick r=sprite(droplet,alpha,velocity,.02)`

// ---- speaking: into the card of the one she talks to, softly in the ears of those near ----
function say(ctx, p, line, mood = 'calm', voice = true) {
  const now = ctx.now(), me = ctx.self, pos = me.feetPosition, d = 1800 + line.length * 55
  if (p?.state) {
    p.state.sub = { who: 'Samantha', t: line, at: now, d }; p.state.talkMood = mood
    const all = { ...(p.state.talks ?? {}) }; all[ME] = [...(all[ME] ?? []), ['n', line]].slice(-(TK.memory ?? 12)); p.state.talks = all
  }
  me.state.line = { t: line, at: now, d }
  if (voice) ctx.emit('playSound', { clip: VOX(line), position: { x: pos.x, y: pos.y + 0.4, z: pos.z }, volume: 0.75, refDistance: 1.5, maxDistance: 9 }, { audience: { nearby: pos, radius: 10 } })
}
function mark(p, t) { const all = { ...(p.state.talks ?? {}) }; all[ME] = [...(all[ME] ?? []), ['x', t]].slice(-(TK.memory ?? 12)); p.state.talks = all }
const meatOf = (p) => S.order.find((m) => (p?.state?.meat?.[m] ?? 0) > 0)

function clip(ctx, name) { const ses = ctx.self.session; if (ses.clip === name) return; ses.clip = name; ctx.self.anim.body = { clip: name, loop: true } }
function strike(ctx) { ctx.self.anim.act = { clip: 'Pounce', loop: 'once', blend: 'override', weight: 4, time: 0, speed: 1.6 } }

// ---- where she goes ----
function perches(ctx) {
  const out = []
  for (const o of ctx.query({ tags: ['furniture'], center: { x: -14, y: 0, z: 0 }, radius: 40 })) {
    const z = zoneAt(o.feetPosition.x, o.feetPosition.z); if (!z || !S.perchZones.includes(z.id)) continue
    const b = ctx.getObject(o.id)?.bounds; if (!b || b.max.y > S.perchTop || b.max.y < 0.35) continue
    out.push({ x: b.center.x, z: b.center.z, y: b.max.y, r: Math.max(b.size.x, b.size.z) / 2 })
  }
  return out
}
function plan(ctx, now) {
  const ses = ctx.self.session, me = ctx.self, at = me.feetPosition
  const ps = ses.perchList ??= (AWAYOF(ctx) ? [] : perches(ctx))
  let goal, perch = null
  if (ps.length && ctx.random() < 0.35) {
    perch = ps[Math.floor(ctx.random() * ps.length)]
    const dx = at.x - perch.x, dz = at.z - perch.z, d = Math.hypot(dx, dz) || 1
    goal = { x: perch.x + dx / d * (perch.r + 0.4), y: 0, z: perch.z + dz / d * (perch.r + 0.4) }
  } else { const s = SPOTS(ctx)[Math.floor(ctx.random() * SPOTS(ctx).length)]; goal = { x: s.x, y: 0, z: s.z } }
  ses.goal = goal; ses.perch = perch; ses.path = null; ses.pi = 0; ses.mode = 'walk'; ses.until = now + 90000
}
function teleport(ctx, to, y = 0) {
  const me = ctx.self, a = me.feetPosition
  ctx.emit('fx', { position: { x: a.x, y: a.y + 0.2, z: a.z }, script: BLINK })
  ctx.emit('playSound', { clip: SND('soft-magical-whoosh-shimmer'), position: a, volume: 0.45, maxDistance: 14 })
  me.feetPosition = { x: to.x, y, z: to.z }; me.visible = true
  ctx.emit('fx', { position: { x: to.x, y: y + 0.2, z: to.z }, script: BLINK })
  ctx.emit('playSound', { clip: SND('soft-magical-whoosh-shimmer'), position: { x: to.x, y, z: to.z }, volume: 0.45, maxDistance: 14 })
  const ses = me.session; ses.y = y; ses.path = null; ses.perch = null
}
function rest(ctx, now, kind) { const ses = ctx.self.session; ses.mode = kind; ses.until = now + rr(kind === 'groom' ? S.groom : S.sit, ctx); clip(ctx, kind === 'groom' ? 'Groom' : 'Idle') }

// ---- temper ----
function enrage(ctx, pid, now) {
  const me = ctx.self, ses = me.session, p = ctx.getObject(pid); if (!p || ses.mode === 'gone' || ses.mode === 'rage') return
  if (ses.y > 0.01) { me.feetPosition = { ...me.feetPosition, y: 0 }; ses.y = 0 }
  ses.mode = 'rage'; ses.rage = { pid, until: now + S.rageMs, hits: 0, max: Math.round(rr(S.hits, ctx)), next: now + 350 }; ses.warn = null
  me.state.target = pid
  if (p.state?.talkWith === me.id) p.state.talkWith = null
  say(ctx, p, S.lines.rage, 'angry')
  ctx.emit('playSound', { clip: SND('angry-cat-hiss-yowl'), position: me.feetPosition, volume: 0.9, maxDistance: 18 })
}
function vanish(ctx, now) {
  const me = ctx.self, ses = me.session, a = me.feetPosition
  ctx.emit('fx', { position: { x: a.x, y: a.y + 0.2, z: a.z }, script: BLINK })
  ctx.emit('playSound', { clip: SND('soft-magical-whoosh-shimmer'), position: a, volume: 0.5, maxDistance: 14 })
  me.feetPosition = { x: HOME(ctx).x, y: -4, z: HOME(ctx).z }; me.visible = false; me.state.target = null; me.state.away = now
  ses.mode = 'gone'; ses.until = now + rr(S.awayMs, ctx); ses.rage = null; ses.y = 0
  for (const p of ctx.place.players) if (p.state?.talkWith === me.id) p.state.talkWith = null
}
function pounce(ctx, dt, now) {
  const me = ctx.self, ses = me.session, R = ses.rage, p = ctx.getObject(R.pid)
  if (!p || p.place !== me.place || p.state?.dead || now > R.until || R.hits >= R.max) { vanish(ctx, now); return }
  const a = me.feetPosition, b = p.feetPosition, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz)
  me.rotation = { yaw: yawTo(dx, dz) }
  if (d > S.reach) { const st = Math.min(d - S.reach * 0.7, S.run * dt); me.feetPosition = { x: a.x + dx / d * st, y: 0, z: a.z + dz / d * st }; clip(ctx, 'Run'); return }
  clip(ctx, 'Idle')
  if (now < R.next) return
  R.next = now + rr(S.gap, ctx); R.hits++
  strike(ctx)
  const hp = p.state.hp ?? 100, dmg = Math.round(rr(S.hit, ctx)), take = Math.max(0, Math.min(dmg, hp - 1))
  if (take > 0) p.state.hp -= take
  const hit = { x: b.x, y: b.y + 0.9, z: b.z }, bite = ctx.random() < 0.4
  ctx.emit('damageNumber', { position: hit, value: take, color: '#ff6a5a' })
  ctx.emit('fx', { position: hit, script: CLAW })
  ctx.emit('slash', { position: hit, size: 0.55, shape: 'crescent' })
  ctx.emit('playSound', { clip: SND(bite ? 'cat-bite-snarl' : 'cat-claw-scratch-flesh'), position: hit, volume: 0.9, maxDistance: 16 })
  ctx.emit('screenShake', { intensity: 0.35, duration: 0.22 }, { audience: { player: p.id } })
  ctx.emit('screenFlash', { color: '#8a0d0d', duration: 0.18, intensity: 0.35 }, { audience: { player: p.id } })
  // she lunges past and turns: a hop to the other side keeps it fast and hard to track
  const side = ctx.random() < 0.5 ? 1 : -1, ox = -dz / (d || 1) * side * 0.9, oz = dx / (d || 1) * side * 0.9
  me.feetPosition = { x: b.x + ox - dx / (d || 1) * 0.3, y: 0, z: b.z + oz - dz / (d || 1) * 0.3 }
}

// ---- readings ----
function facts(ctx, p) {
  const s = p.state ?? {}, at = p.feetPosition, f = []
  f.push(`They stand in ${zn(ctx, at.x, at.z)} on ${AWAYOF(ctx) ? 'Level 3, the Electrical Station, by the brass lift to my hotel' : 'Level 5, the Terror Hotel'}.`)
  f.push(`Health ${Math.round(s.hp ?? 100)}, sanity ${Math.round(s.sanity ?? 100)}, level ${s.level ?? 1}, hunger ${Math.round(s.hunger ?? 100)}, thirst ${Math.round(s.thirst ?? 100)} (out of 100; low is bad).`)
  const cons = ctx.query({ tags: ['container'], center: at, radius: 140 })
  const lock = cons.find((c) => String(c.state?.lock ?? '').startsWith('lockpick'))
  if (lock) f.push(`The nearest locked container: the ${lock.state.name ?? lock.state.kind ?? 'cabinet'} in ${zn(ctx, lock.feetPosition.x, lock.feetPosition.z)}, lock difficulty ${String(lock.state.lock).split(':')[1]}; inside: ${itemsOf(lock)}.`)
  const full = cons.filter((c) => !c.state?.lock && String(c.state?.items ?? '').trim()).slice(0, 2)
  for (const c of full) f.push(`Unsearched: the ${c.state.name ?? c.state.kind ?? 'drawer'} in ${zn(ctx, c.feetPosition.x, c.feetPosition.z)} holds ${itemsOf(c)}.`)
  const ex = EXITS.filter((e) => !AWAYOF(ctx) && e.to && !e.sealed).map((e) => `${e.label} by ${zn(ctx, e.at.x, e.at.z)}`)
  f.push(`Ways out: ${ex.join('; ')}. Sealed doors hint at other levels but do not open.`)
  const foe = ctx.query({ anyTags: HOST, center: at, radius: 90 }).find((o) => !o.state?.dead)
  if (foe) f.push(`A danger nearby: a ${foe.tags.find((t) => HOST.includes(t)) ?? 'thing'} in ${zn(ctx, foe.feetPosition.x, foe.feetPosition.z)}.`)
  const npc = ctx.query({ tags: ['npc'], center: at, radius: 90 }).find((o) => o.id !== ctx.self.id && !o.state?.dead)
  if (npc) f.push(`Someone else close: ${String(npc.state?.name ?? 'a stranger').split(' ·')[0]} in ${zn(ctx, npc.feetPosition.x, npc.feetPosition.z)}.`)
  f.push(`Their past: died ${s.deaths ?? 0} times, killed ${s.kills ?? 0} things, ${Object.keys(s.visited ?? {}).length || 'few'} places walked, came here from ${s.lastPlace ?? s.from ?? 'the levels above'}.`)
  return f
}
function itemsOf(c) { return String(c.state?.items ?? '').split(',').filter(Boolean).slice(0, 3).map((t) => { try { return describe(t).name } catch { return t } }).join(', ') || 'little' }
function plainReading(f) {
  return `I see you clearly now. ${f.slice(2, 5).join(' ')} Mind yourself: ${f[1]} And the dead you have left behind have not forgotten you. Neither have I.`.slice(0, 600)
}

function feed(ctx, p) {
  const me = ctx.self, ses = me.session, now = ctx.now(), t = meatOf(p)
  if (!t) { say(ctx, p, S.lines.none, 'annoyed'); warn(ctx, p, now); return }
  if (ses.reading && now - ses.reading < 15000) return
  p.state.meat = { ...p.state.meat, [t]: p.state.meat[t] - 1 }
  const premium = S.premium.includes(t), name = describe(`meat:${t}`)?.name ?? t
  if (ses.warn?.pid === p.id) ses.warn = null
  mark(p, `you gave Samantha ${name.toLowerCase()}`)
  say(ctx, p, premium ? S.lines.premium : S.lines.poor, premium ? 'happy' : 'annoyed')
  ctx.emit('playSound', { clip: SND('cat-eating-chewing-purr'), position: me.feetPosition, volume: 0.6, maxDistance: 8 })
  if (premium) {
    p.state.sanity = Math.min(100, (p.state.sanity ?? 0) + 50)
    p.state.hp = Math.min(100, (p.state.hp ?? 100) + 30)
  } else {
    p.state.sanity = Math.min(100, (p.state.sanity ?? 0) + 15)
  }
  rest(ctx, now, 'groom'); ses.until = now + 4000
  if (!premium) { ctx.after(2.2, 'poorRead', { by: p.id, i: Math.floor(ctx.random() * S.poorReadings.length) }); return }
  ses.reading = now; p.state.talkBusy = now
  const f = facts(ctx, p), fb = plainReading(f)
  const system = [TK.personas[ME], 'You have just eaten good meat and now give the psychic reading you promised. Speak as Samantha to the wanderer, second person.',
    'Use ONLY these true facts and name the real places in them; turn them into a vision that is genuinely useful (where supplies wait, which lock to pick, which way out, what to fear, what to mend).',
    '4-6 sentences, eloquent and amused, perhaps one French or Italian word. End with one eerie line about their past drawn from the past facts. Never mention numbers as stats, games or facts; reply with the reading only, no quotes, no JSON.'].join('\n')
  ctx.job('llm:chat', { system, message: `Facts you see:\n- ${f.join('\n- ')}\n\nThe reading:`, model: TK.model }, 'read', { by: p.id, fb })
}
export function read(ctx, r, pay) {
  const p = ctx.getObject(pay?.by); ctx.self.session.reading = 0; if (!p?.state) return
  p.state.talkBusy = 0
  let text = r?.ok === false ? null : (r?.data?.text ?? r?.text ?? (typeof r?.data === 'string' ? r.data : null))
  text = String(text ?? '').replace(/\s+/g, ' ').replace(/^["']|["']$/g, '').trim()
  if (text.length < 40 || text.startsWith('{')) text = pay.fb
  say(ctx, p, text.slice(0, 700), 'happy', false)
}
export function poorRead(ctx, pay) { const p = ctx.getObject(pay?.by); if (p?.state) say(ctx, p, S.poorReadings[pay.i] ?? S.poorReadings[0], 'annoyed') }
function warn(ctx, p, now, refused) { const ses = ctx.self.session; if (!ses.warn || ses.warn.pid !== p.id) ses.warn = { pid: p.id, at: now, refused: !!refused }; else if (refused) ses.warn.refused = true }

export const ears = {
  press: (ctx, d) => { const p = ctx.getObject(d?.by), ses = ctx.self.session; if (!p?.state || ses.mode === 'gone' || ses.mode === 'rage') return; p.state.talkWith = ctx.self.id; p.state.shopOpen = null },
  talkopt: (ctx, d) => {
    const p = ctx.getObject(d?.by), ses = ctx.self.session; if (!p?.state || ses.mode === 'gone' || ses.mode === 'rage') return
    if (d.k === 'feed') feed(ctx, p)
    else if (d.k === 'refuse') { say(ctx, p, S.lines.refuse, 'annoyed'); warn(ctx, p, ctx.now(), true) }
  },
  hit: (ctx, d) => { if (d?.by) enrage(ctx, d.by, ctx.now()) },
}

export function onSpawn(ctx) { ctx.self.scale = S.scale ?? 1.1; ctx.self.session.mode = null }

export function update(ctx, dt) {
  const me = ctx.self, st = me.state, ses = me.session, now = ctx.now()
  if (!ses.mode && (me.visible === false || me.feetPosition.y < -1)) { const h = HOME(ctx); me.feetPosition = { x: h.x, y: 0, z: h.z }; me.visible = true; me.state.target = null } // a fresh machine forgets she was away: bring her home, seen
  if (!ses.mode) { ses.y = me.feetPosition.y > 0.05 ? me.feetPosition.y : 0; rest(ctx, now, 'sit'); ses.blinkAt = now + rr(S.blinkEvery, ctx); ses.talkers = {} }
  // struck or crossed in words: whoever it was, she remembers in claws
  const ang = st.angry && Object.keys(st.angry).find((k) => st.angry[k])
  if (ang) { st.angry = {}; st.fresh = {}; enrage(ctx, ang, now) }
  if (st.dead) st.dead = false
  if ((st.hp ?? 1000) < 1000 - S.blinkHp) { st.hp = 1000; if (ses.mode !== 'gone') vanish(ctx, now) }
  if (ses.mode === 'gone') {
    if (now < ses.until) return
    ses.mode = null; teleport(ctx, HOME(ctx)); clip(ctx, 'Idle'); ses.mode = 'sit'; ses.until = now + 8000; st.away = 0
    for (const p of ctx.place.players) if (Math.hypot(p.feetPosition.x - HOME(ctx).x, p.feetPosition.z - HOME(ctx).z) < 8) { say(ctx, null, S.lines.return); break }
    return
  }
  if (ses.mode === 'rage') { pounce(ctx, dt, now); return }
  // the rude one has had their warning
  if (ses.warn && now - ses.warn.at > S.warnMs) { const w = ses.warn, p = ctx.getObject(w.pid); ses.warn = null; if (p?.state && (w.refused || !meatOf(p))) enrage(ctx, p.id, now); return }
  // whoever holds her card: greet once, stay put, look at them
  let talker = null
  for (const p of ctx.place.players) {
    if (p.state?.talkWith !== me.id) { if (ses.talkers[p.id]) delete ses.talkers[p.id]; continue }
    talker = p
    if (!ses.talkers[p.id]) {
      ses.talkers[p.id] = 1
      if (meatOf(p)) say(ctx, p, S.lines.meat)
      else { say(ctx, p, S.lines.none, 'annoyed'); warn(ctx, p, now) }
    }
  }
  st.offers = [['o:feed', 'Offer meat'], ['o:refuse', 'Refuse']]
  if (talker) {
    const a = me.feetPosition, b = talker.feetPosition; me.rotation = { yaw: yawTo(b.x - a.x, b.z - a.z) }
    if (ses.mode === 'walk') rest(ctx, now, 'sit')
    if (ses.mode === 'perched' || ses.mode === 'sit' || ses.mode === 'groom') ses.until = Math.max(ses.until, now + 3000)
    return
  }
  // a psychic hop, now and then, when nobody is looking at her closely
  if (now > ses.blinkAt && ses.mode !== 'walk') {
    ses.blinkAt = now + rr(S.blinkEvery, ctx)
    const s = SPOTS(ctx)[Math.floor(ctx.random() * SPOTS(ctx).length)]; teleport(ctx, s); rest(ctx, now, 'sit'); return
  }
  if (ses.mode === 'sit' || ses.mode === 'groom' || ses.mode === 'perched') {
    if (now < ses.until) return
    if (ses.mode !== 'groom' && ctx.random() < 0.3) { rest(ctx, now, 'groom'); return }
    if (ses.y > 0.01) { const a = me.feetPosition; me.feetPosition = { x: a.x + (ses.offX ?? 0), y: 0, z: a.z + (ses.offZ ?? 0) }; ses.y = 0 } // hops down
    plan(ctx, now); return
  }
  if (ses.mode === 'walk') {
    if (!ses.path) {
      const r = findPath(ctx, me.feetPosition, ses.goal, { radius: 0.2 })
      if (r?.partial) return
      ses.path = r?.points?.length ? r.points : [ses.goal]; ses.pi = 0
    }
    const pt = ses.path[ses.pi] ?? ses.goal, a = me.feetPosition, dx = pt.x - a.x, dz = pt.z - a.z, d = Math.hypot(dx, dz)
    if (d < 0.12) {
      if (++ses.pi < ses.path.length) return
      const pc = ses.perch
      if (pc) { ses.offX = a.x - pc.x; ses.offZ = a.z - pc.z; me.feetPosition = { x: pc.x, y: pc.y, z: pc.z }; ses.y = pc.y; rest(ctx, now, 'sit'); ses.mode = 'perched'; ses.perch = null; ctx.emit('playSound', { clip: SND('soft-cat-jump-landing-thump'), position: me.feetPosition, volume: 0.35, maxDistance: 8 }) }
      else rest(ctx, now, ctx.random() < 0.25 ? 'groom' : 'sit')
      return
    }
    if (now > ses.until) { rest(ctx, now, 'sit'); return }
    const step = Math.min(d, S.walk * dt)
    me.feetPosition = { x: a.x + dx / d * step, y: 0, z: a.z + dz / d * step }
    me.rotation = { yaw: yawTo(dx, dz) }
    clip(ctx, 'Walk')
  }
}
