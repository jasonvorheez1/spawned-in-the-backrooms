import CANNED from './lib/data/canned-talk.yml'
// Free talk with NPCs, on the player. E on an M.E.G. agent or Survivor opens the card (interact.js sets
// state.talkWith); what you type goes to the built-in model as 'talk', its JSON comes back to heard().
// The model only ever picks words, a mood, a rapport nudge and one whitelisted intent; every check is rolled here.
// Traders open a shop from the card. Numbers: lib/data/talk.yml, lib/data/shops.yml.
import { heard as hearAt } from "./lib/hear.js";
import T from './lib/data/talk.yml'
import { nameOf, keyOf, isTrader, voiceOf, VO, systemPrompt, userMessage, parseReply, rollCheck, freshStock, buyPrice, sellPrice, sellables, removeOne, SHOPS, repairables, repairPrice } from './lib/npc-talk.js'
import { takeToken } from './player.js'
import { talk as service } from './interact.js'
import { skillsOf, SKILLS } from './lib/stats.js'
import { describe } from './lib/items.js'
import { repDisc, isHated, repKind, repTrade } from './lib/rep.js'
import { recruit, adopt, dismiss, order, giveWeapon, takeWeapon, PERKS, perkOf } from './lib/companion.js'
import { addressFor, saysName } from './lib/address.js'
import { lineFor } from './lib/personality.js'
import { raycast } from 'builtin/physics'
import { handleDialogueQuest } from './lib/level11-quests.js'

const getStartersLib = (ctx) => ((ctx.session ??= {}).startersP ??= import('./lib/npc-starters.js'))

const short = (it) => String(it.id).split('/').pop()
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const BYE = ["oh. okay then.", "rude.", "...guess we're done.", "fine, go.", "hey, i wasn't finished."]
const HI = (n, mood) => mood < -20 ? [`you again.`, `${n}. keep walking.`] : mood > 40 ? [`${n}! you're back.`, `hey ${n}, good to see you breathing.`, `${n}! over here.`] : [`oh, ${n}.`, `${n}. still alive, huh.`, `hey, ${n}.`]
// once a second: someone who knows you looks up when you come close (once every 3 min each); people who know you tell the ones beside them
function social(ctx, ses) {
  const now = ctx.now(); if (now < (ses.socAt ?? 0)) return; ses.socAt = now + 1000
  const me = ctx.self, k = keyOf(me), hi = (ses.hiAt ??= {})
  const near = ctx.query({ tags: ['npc'], radius: 8 })
  for (const row of near) {
    const o = ctx.getObject(row.id); if (!o || o.state?.dead) continue
    const mem = o.state.mem?.[k]
    const dd = flat(o.feetPosition, me.feetPosition), quiet = now - (o.state.line?.at ?? 0) > 4000 && !ctx.self.state.talkWith && !o.state.hostile && !o.state.fleeing
    const sees = (quiet && dd < 5) && canSee(ctx, o, me)
    if (mem && quiet && sees && dd < 3.5 && now - (hi[o.id] ?? -1e9) > 180000) {
      hi[o.id] = now; const r = o.state.rapport?.[k] ?? 0
      o.state.talkTo = me.id; o.state.talkAt = now; say(ctx, o, r < -20 ? HI(addressFor(o, me, mem), r)[0] : lineFor(o, 'hi', addressFor(o, me, mem)), r < -20 ? 'annoyed' : 'happy')
    } else if (quiet && sees) react(ctx, ses, o, me, mem, dd, now)
    if (mem?.notes?.length && ctx.random() < 0.02) for (const r2 of near) { // gossip: one thing they know about you, passed on as hearsay
      if (r2.id === o.id || flat(r2.feetPosition, o.feetPosition) > 4) continue
      const b = ctx.getObject(r2.id); if (!b || b.state?.dead) continue
      const n = mem.notes[Math.floor(ctx.random() * mem.notes.length)].replace(/^heard: /, ''), bm = b.state.mem?.[k] ?? { met: 0, notes: [] }
      if (bm.notes?.some((x) => x.endsWith(n))) continue
      b.state.mem = { ...(b.state.mem ?? {}), [k]: { ...bm, notes: [...(bm.notes ?? []), `heard: ${n}`].slice(-6) } }; break
    }
  }
}
// eye to eye: a wall, a shut door or a shelf between you and they see nothing
function canSee(ctx, o, me) {
  const a = { x: o.feetPosition.x, y: o.feetPosition.y + 1.5, z: o.feetPosition.z }, b = { x: me.feetPosition.x, y: me.feetPosition.y + 1.2, z: me.feetPosition.z }
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, l = Math.hypot(dx, dy, dz) || 1
  return !raycast(ctx, a, { x: dx / l, y: dy / l, z: dz / l }, { distance: l, physicsOnly: true, bodies: 'all', excludeTags: ['npc', 'player', 'weapon', 'almond'], ignoreEntities: [o.id, me.id] })
}
// what they notice about you, each in their own temperament: a drawn weapon, your wounds, you creeping, you crowding them; once a minute per kind per person
function react(ctx, ses, o, me, mem, dd, now) {
  const st = me.state, ra = (ses.react ??= {}), hpF = (st.hp ?? 100) / (st.maxHp ?? 100)
  const kind = !st.sheathed && st.equipped && st.equipped !== 'fists' && dd < 4.5 ? 'drawn' : hpF < 0.35 && dd < 4.5 ? 'hurt' : st.crouch && dd < 3 ? 'sneak' : dd < 1.1 ? 'close' : null
  if (!kind) return
  const key = o.id + ':' + kind; if (now - (ra[key] ?? -1e9) < 60000) return
  if (now - (ses.reactAny ?? -1e9) < 6000) return // one voice at a time near you
  ra[key] = now; ses.reactAny = now
  o.state.talkTo = me.id; o.state.talkAt = now
  say(ctx, o, lineFor(o, kind, addressFor(o, me, mem)), kind === 'drawn' ? 'scared' : kind === 'hurt' ? 'calm' : 'annoyed')
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const note = (ctx, text) => { ctx.self.state.notice = { text, at: ctx.now() } }
const skn = (k) => SKILLS.find((x) => x.k === k)?.name ?? (k[0].toUpperCase() + k.slice(1))
function live(ctx, id) { const it = id && ctx.getObject(id); return it && !it.state?.dead && (it.state?.hp ?? 1) > 0 ? it : null }
const rapportOf = (ctx, it) => it.state?.rapport?.[keyOf(ctx.self)] ?? (it.state?.angry?.[ctx.self.id] ? -60 : 0)
function setRapport(ctx, it, v) { it.state.rapport = { ...(it.state.rapport ?? {}), [keyOf(ctx.self)]: clamp(Math.round(v), -100, 100) } }

function logLine(ctx, it, w, t) {
  const s = ctx.self.state, k = short(it), all = { ...(s.talks ?? {}) }
  all[k] = [...(all[k] ?? []), [w, t]].slice(-T.memory); s.talks = all
}
// the reply: a voice at the npc everyone near hears, their speech bubble, your subtitle
function say(ctx, it, line, mood) {
  const now = ctx.now(), p = it.feetPosition, d = 1600 + line.length * 60
  ctx.self.state.sub = { who: nameOf(it), t: line, at: now, d }
  it.state.line = { t: line, at: now, d }; it.state.talkAt = now; it.state.talkTo = ctx.self.id
  if (mood) ctx.self.state.talkMood = mood
  hearAt(ctx, { clip: VO(voiceOf(it), line), position: { x: p.x, y: p.y + 1.6, z: p.z }, volume: 0.9, maxDistance: 14 }, { audience: { nearby: p, radius: 16 } })
}
function close(ctx) { const s = ctx.self.state; ctx.self.session.tkHp = null; ctx.self.session.tkIhp = null; s.talkWith = null; s.shopOpen = null; s.talkBusy = 0; s.talkChoices = null; ctx.self.session.talkingTo = null }

export function openDialogue(ctx, it) {
  const s = ctx.self.state, ses = ctx.self.session, now = ctx.now()
  if (!it || it.state?.dead || (it.state?.hp ?? 1) <= 0) return
  s.talkWith = it.id
  s.shopOpen = null
  ses.talkingTo = it.id
  it.state.talkAt = now
  it.state.talkTo = ctx.self.id

  const hist = s.talks?.[short(it)] ?? []
  const lastLine = hist[hist.length - 1]
  const recent = lastLine && now - (ses.lastGreetAt ?? -1e9) < 60000

  getStartersLib(ctx).then(({ getStarter, getChoices }) => {
    if (!live(ctx, s.talkWith)) return
    const starter = getStarter(ctx, it, s)
    if (starter && (!hist.length || !recent)) {
      ses.lastGreetAt = now
      say(ctx, it, starter.text, starter.mood)
      logLine(ctx, it, 'n', starter.text)
    }
    s.talkChoices = getChoices(ctx, it, s, starter?.text)
  })
}

function send(ctx, d) {
  const s = ctx.self.state, it = live(ctx, s.talkWith), now = ctx.now(), ses = ctx.self.session
  if (!it || d.id !== it.id) return
  const text = String(d.text ?? '').replace(/\s+/g, ' ').trim().slice(0, T.maxText)
  if (!text) return
  ses.lastText = text
  if (s.talkBusy && now - s.talkBusy < 15000) return
  if (now - (ses.talkAt ?? -1e9) < T.rate * 1000) { note(ctx, `${nameOf(it)} is still answering.`); return }
  if (it.state?.angry?.[ctx.self.id]) { service(ctx, it); return }

  const qRes = handleDialogueQuest(ctx, ctx.self, it, text)
  if (qRes) {
    s.talkBusy = 0
    ses.talkAt = now
    logLine(ctx, it, 'p', text)
    say(ctx, it, qRes.reply, qRes.mood ?? 'happy')
    logLine(ctx, it, 'n', qRes.reply)
    getStartersLib(ctx).then(({ getChoices }) => { s.talkChoices = getChoices(ctx, it, s, qRes.reply, null) })
    return
  }

  ses.talkAt = now; s.talkBusy = now
  const hist = s.talks?.[short(it)] ?? []
  const system = systemPrompt({ it, place: ctx.self.place, pl: ctx.self, rapport: rapportOf(ctx, it), following: it.state?.follow === ctx.self.id })
  let message = userMessage(hist, text, ctx.self.displayName ?? 'Wanderer')
  ses.preCheck = null
  const pc = d.check && SKILLS.some((x) => x.k === String(d.check.skill).toLowerCase()) ? { skill: String(d.check.skill).toLowerCase(), difficulty: Math.max(5, Math.min(110, Number(d.check.difficulty) || 50)) } : null
  if (pc) { // the roll happens the moment they pick it, and the npc is told how it went
    const c = rollCheck(ctx, s, pc), v = skillsOf(s)[pc.skill] ?? 0
    const pct = Math.max(0, Math.min(100, Math.round((T.roll - (pc.difficulty - v) + 1) / T.roll * 100)))
    ses.preCheck = { ok: c.ok }
    logLine(ctx, it, 'x', `[${skn(pc.skill)} ${pct}%] ${c.ok ? 'SUCCEEDED' : 'FAILED'}`)
    hearAt(ctx, { clip: c.ok ? 'cdn/sfx-soft-bright-two-note-success-chime.mp3' : 'cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3', volume: 0.5 })
    message += `\n(The wanderer attempted a ${pc.skill} check and ${c.ok ? 'SUCCEEDED: you are convinced or impressed, and react warmly to it' : 'FAILED: you are unconvinced, put off or see through it'}. Do not include a check field.)`
  }
  logLine(ctx, it, 'p', text)
  if (saysName(text, ctx.self.displayName)) (ses.toldName ??= {})[it.id] = true // they introduced themselves: the reply's memory write keeps it
  it.state.talkAt = now; it.state.talkTo = ctx.self.id
  ses.lastAsk = { system, message }
  ctx.job('llm:chat', { system, message, model: T.model }, 'heard', { id: it.id })
  // the wait for a reply is filled at once: a short thinking sound in their own voice (one of three, cached per character after first use)
  const fill = ['hold on', 'well', 'let me think'][Math.floor(ctx.random() * 3)], fp = it.feetPosition
  hearAt(ctx, { clip: VO(voiceOf(it), fill), position: { x: fp.x, y: fp.y + 1.6, z: fp.z }, volume: 0.7, maxDistance: 10 }, { audience: { nearby: fp, radius: 12 } })
}

// the model's answer comes back here; only whitelisted intents touch the world
export function heard(ctx, r, pay) {
  const s = ctx.self.state; if (!s.talkBusy) return; s.talkBusy = 0 // already answered by the fallback, or the talk closed
  const it = live(ctx, pay?.id); if (!it) return
  const text = r?.data?.text ?? r?.text ?? (typeof r?.data === 'string' ? r.data : null)
  const o = r?.ok === false ? null : parseReply(text)
  if (!o && !pay?.retry && ctx.self.session.lastAsk) { // a dropped or garbled reply: ask once more before they fumble
    ctx.log('talk: reply failed, retrying', r?.error?.code ?? r?.error?.message ?? String(text ?? '').slice(0, 120))
    s.talkBusy = ctx.now(); const A = ctx.self.session.lastAsk
    ctx.job('llm:chat', { system: A.system, message: A.message + '\n(Answer with the JSON object only.)', model: T.model }, 'heard', { id: it.id, retry: true }); return
  }
  if (!o) { const line = canned(ctx); say(ctx, it, line, 'calm'); logLine(ctx, it, 'n', line); getStartersLib(ctx).then(({ getChoices }) => { s.talkChoices = getChoices(ctx, it, s, line, null) }); return }
  let { reply: line, rapportDelta: delta, intent } = o, passed = false
  if (ctx.self.session.preCheck) { passed = ctx.self.session.preCheck.ok; if (!passed) { delta = Math.min(delta, T.failHit); if (intent !== 'hostile' && intent !== 'leave') intent = 'none' } ctx.self.session.preCheck = null }
  else if (o.check) {
    const c = rollCheck(ctx, s, o.check); passed = c.ok
    logLine(ctx, it, 'x', `[${skn(o.check.skill)} ${o.check.difficulty}] ${c.ok ? 'passed' : 'failed'}`)
    if (!c.ok) { line = o.failReply || "nah. not buying that."; delta = Math.min(delta, T.failHit); if (intent !== 'hostile' && intent !== 'leave') intent = 'none' }
  }
  const r1 = clamp(rapportOf(ctx, it) + delta, -100, 100); setRapport(ctx, it, r1)
  const key = keyOf(ctx.self), who = nameOf(it), now = ctx.now()
  // memory: meetings counted once per conversation, a short fact kept per exchange (newest 6), on the npc so every player's talk with them builds the same person
  { const m0 = it.state.mem?.[key] ?? { met: 0, notes: [] }, ses2 = ctx.self.session, fresh = ses2.memWith !== it.id
    if (fresh) ses2.memWith = it.id
    const notes = o.remember ? [...(m0.notes ?? []).filter((n) => n !== o.remember), o.remember].slice(-6) : (m0.notes ?? [])
    const named = !!m0.named || !!ctx.self.session.toldName?.[it.id]
    it.state.mem = { ...(it.state.mem ?? {}), [key]: { met: m0.met + (fresh ? 1 : 0), notes, at: now, named } } }
  // a spoken yes to come along counts even when the model forgot to mark it: their words are the promise
  const ESCORT = /\b(follow me|stay (close|behind me)|come with me|i('ll| will| can) (walk|take|lead|escort|show) you|let'?s (go|move)|we move|lead the way|i'?m coming with you|right behind you)\b/i
  if (intent === 'none' && line && ESCORT.test(line) && !/\b(won'?t|not going|no way|can'?t)\b.{0,20}\b(come|walk|go|lead)\b/i.test(line)) intent = 'join'
  if (intent === 'join' && it.state.follow !== ctx.self.id) {
    const mine = ctx.query({ tags: ['npc'] }).filter((q) => q.state?.follow === ctx.self.id).length
    if (r1 < T.join.rapport && !passed && o.intent !== 'join' && !ESCORT.test(line ?? '')) {}
    else if (mine >= T.join.max) logLine(ctx, it, 'x', `${T.join.max} people already follow you`)
    else { adopt(ctx.self, it); logLine(ctx, it, 'x', `${who} is coming with you`); note(ctx, `${who} is coming with you. ${PERKS[perkOf(it)]?.name}: ${PERKS[perkOf(it)]?.info}.`) }
  }
  if (intent === 'leave' && it.state.follow === ctx.self.id) { dismiss(ctx, ctx.self, it); logLine(ctx, it, 'x', `${who} stopped following you`) }
  if (intent === 'trade_discount' && isTrader(it) && (r1 >= T.discount.rapport || passed)) {
    const old = it.state.discount?.[key] ?? 0, disc = Math.min(T.discount.max, Math.max(old, r1 * T.discount.per + (passed ? T.discount.check : 0)))
    it.state.discount = { ...(it.state.discount ?? {}), [key]: Math.round(disc * 100) / 100 }
    logLine(ctx, it, 'x', `${who} knocks ${Math.round(disc * 100)}% off for you`)
  }
  if (intent === 'gift' && (r1 >= T.gift.rapport || passed) && now - (it.state.gifted?.[key] ?? -1e12) > T.gift.every * 1000) {
    const tok = T.gift.items[Math.floor(ctx.random() * T.gift.items.length)], got = takeToken(ctx, tok)
    if (got?.ok) { it.state.gifted = { ...(it.state.gifted ?? {}), [key]: now }; logLine(ctx, it, 'x', `${who} gave you ${describe(tok).name.toLowerCase()}`) }
  }
  if (intent === 'hostile' && r1 <= T.hostile) {
    it.state.angry = { ...(it.state.angry ?? {}), [ctx.self.id]: true }; it.state.fresh = { ...(it.state.fresh ?? {}), [ctx.self.id]: true }
    if (it.state.follow === ctx.self.id) dismiss(ctx, ctx.self, it)
    say(ctx, it, line, 'angry'); logLine(ctx, it, 'n', line); logLine(ctx, it, 'x', `${who} turns on you`); close(ctx); return
  }
  if (r1 < 0 && it.state.follow === ctx.self.id) { it.state.follow = null; logLine(ctx, it, 'x', `${who} stopped following you`) }
  say(ctx, it, line, o.mood); logLine(ctx, it, 'n', line)
  getStartersLib(ctx).then(({ getChoices }) => { s.talkChoices = getChoices(ctx, it, s, line, o) })
}

function act(ctx, d) {
  const s = ctx.self.state, it = live(ctx, s.talkWith)
  if (d.k === 'leave' || !it) { close(ctx); return }
  if (d.k === 'choice' && d.text) { send(ctx, { id: it.id, text: d.text }); return }
  if (String(d.k).startsWith('o:')) { ctx.emit('talkopt', { by: ctx.self.id, k: String(d.k).slice(2) }, { to: it.id }); return } // an npc's own card buttons (state.offers) ring its ears.talkopt
  if (d.k === 'svc') { const before = s.sub?.at; service(ctx, it); if (s.sub?.at !== before) logLine(ctx, it, 'n', s.sub.t); return }
  if (d.k === 'trade' && isTrader(it)) { if (isHated(s, it)) { note(ctx, 'They will not deal with you. Your name is mud with their people.'); return } restock(ctx, it); s.shopOpen = it.id; return }
  if (['wave', 'gift', 'dance', 'insult'].includes(d.k)) { gesture(ctx, it, d.k); return }
  if (String(d.k).startsWith('c') && ['crecruit', 'cwait', 'cfollow', 'chold', 'cfree', 'cgive', 'ctake', 'cdismiss'].includes(d.k)) { // a companion's orders (scripts/lib/companion.js)
    if (d.k === 'crecruit') { const bad = recruit(ctx, ctx.self, it); note(ctx, bad || `${nameOf(it)} is coming with you. ${PERKS[perkOf(it)]?.name}: ${PERKS[perkOf(it)]?.info}.`); if (!bad) logLine(ctx, it, 'x', `${nameOf(it)} is coming with you`); return }
    if (d.k === 'cdismiss') { dismiss(ctx, ctx.self, it); note(ctx, `${nameOf(it)} stays here.`); logLine(ctx, it, 'x', `${nameOf(it)} stopped following you`); return }
    if (d.k === 'cgive') { note(ctx, giveWeapon(ctx, ctx.self, it)); return }
    if (d.k === 'ctake') { note(ctx, takeWeapon(ctx, ctx.self, it)); return }
    note(ctx, order(ctx, ctx.self, it, { cwait: 'wait', cfollow: 'follow', chold: 'hold', cfree: 'free' }[d.k])); return
  }
  if (d.k === 'back') s.shopOpen = null
  if (d.k === 'stab') s.shopTab = ['buy', 'sell', 'repair'].includes(d.t) ? d.t : 'buy'
}

// the small social moves beside the talk box: each moves rapport, plays on the body, and the npc answers it in its own words
function gesture(ctx, it, k) {
  const s = ctx.self.state, now = ctx.now(), ses = ctx.self.session
  if (now - (ses.gestAt ?? -1e9) < 2500) return
  ses.gestAt = now
  const r = rapportOf(ctx, it)
  if (k === 'wave') {
    ctx.self.anim.gest = { clip: 'cdn/clip-wave-loop.glb', weight: 0.9, loop: 'once', mask: { from: 'Spine' }, blendIn: 0.15, blendOut: 0.3 }
    setRapport(ctx, it, r + 2)
    send(ctx, { id: it.id, text: '*waves at you*' }); return
  }
  if (k === 'gift') {
    const snack = Object.entries(s.snacks ?? {}).find(([, n]) => n > 0)
    let name
    if (snack) { s.snacks = { ...s.snacks, [snack[0]]: snack[1] - 1 }; name = describe(snack[0])?.name ?? snack[0] }
    else if ((s.almonds ?? 0) > 0) { s.almonds -= 1; name = 'bottle of Almond Water' }
    else { note(ctx, 'You have nothing to give.'); return }
    setRapport(ctx, it, r + 10); repKind(ctx, ctx.self, it, 2, 3)
    note(ctx, `Gave ${name}.`)
    send(ctx, { id: it.id, text: `*hands you a ${name}, free*` }); return
  }
  if (k === 'dance') {
    const willing = r > -10 && !it.state?.angry?.[ctx.self.id] && ctx.random() < 0.55 + r / 200
    if (willing) {
      const clip = 'cdn/clip-dance-loop.glb'
      it.anim.groove = { clip, loop: 'loop', weight: 0.85, blendIn: 0.3, blendOut: 0.4 }
      ctx.self.anim.groove = { clip, loop: 'loop', weight: 0.85, blendIn: 0.3, blendOut: 0.4 }
      s.grooveEnd = now + 10000
      ctx.after(10, 'stopDance', { id: it.id })
      setRapport(ctx, it, r + 5)
    }
    send(ctx, { id: it.id, text: willing ? '*asks you to dance, and you start dancing together*' : '*asks you to dance* (you are not in the mood, turn them down)' }); return
  }
  if (k === 'insult') {
    setRapport(ctx, it, r - 15)
    send(ctx, { id: it.id, text: '*sneers and insults you to your face*' }); return
  }
}
export function stopDance(ctx, p) {
  const it = ctx.getObject(p?.id); if (it?.anim?.groove) it.anim.groove = null
  if (ctx.self.anim?.groove) ctx.self.anim.groove = null
}

function restock(ctx, it) {
  const now = ctx.now()
  if (!it.state.stock || now - (it.state.stockAt ?? -1e12) > SHOPS.restock * 1000) { it.state.stock = freshStock(it); it.state.stockAt = now }
}
function shop(ctx, d) {
  const s = ctx.self.state, it = live(ctx, s.shopOpen)
  if (!it || !isTrader(it) || it.state?.angry?.[ctx.self.id]) { s.shopOpen = null; return }
  restock(ctx, it)
  const t = String(d.t ?? ''), barter = skillsOf(s).barter ?? 0, disc = (it.state.discount?.[keyOf(ctx.self)] ?? 0) + repDisc(s, it)
  const stock = { ...it.state.stock }
  if (d.k === 'buy') {
    const row = stock[t]; if (!row || row[0] < 1) { note(ctx, 'Sold out.'); return }
    const price = buyPrice(row[1], barter, disc)
    const cents = price * 100 // Backdollars only: traders don't take almond water as money any more
    if ((s.cents ?? 0) < cents) { note(ctx, `Not enough Backdollars: $${price}.00`); return }
    s.cents -= cents
    const got = takeToken(ctx, t)
    if (!got?.ok) { s.cents += cents; note(ctx, got?.msg ?? (got?.why ? `Can't take it: ${got.why}` : "You can't carry that.")); return }
    stock[t] = [row[0] - 1, row[1]]; it.state.stock = stock
    repTrade(ctx, ctx.self, it); note(ctx, `Bought ${describe(t).name} for $${price}.00.`)
  } else if (d.k === 'repair') {
    if (it.state?.role !== 'smith') { note(ctx, 'I do not repair gear. Find a smith.'); return } // a trader mends it to 100% for Backdollars (Fallout: New Vegas)
    const row = repairables(s).find((x) => x[0] === t); if (!row) { note(ctx, 'That does not need repairing.'); return }
    const price = repairPrice(row[2], row[1], barter)
    if ((s.cents ?? 0) < price * 100) { note(ctx, `Not enough Backdollars: $${price}.00`); return }
    s.cents -= price * 100
    if (t.startsWith('weapon:')) s['cnd_' + t.slice(7)] = 100; else s.look = { ...s.look, cnd: { ...(s.look?.cnd ?? {}), [t]: 100 } }
    note(ctx, `Repaired ${describe(t).name} for $${price}.00.`)
  } else if (d.k === 'sell') {
    const row = sellables(s).find((x) => x[0] === t); if (!row || !removeOne(s, t)) return
    const pay = sellPrice(row[2], barter); s.cents = (s.cents ?? 0) + pay * 100
    if (t !== 'almond') { stock[t] = [(stock[t]?.[0] ?? 0) + 1, stock[t]?.[1] ?? Math.round(row[2] * 2)]; it.state.stock = stock }
    repTrade(ctx, ctx.self, it); note(ctx, `Sold ${describe(t).name} for $${pay}.00.`)
  }
}

export function onInput(ctx, input) {
  const P = input.pressed ?? {}, A = input.actionData ?? {}
  if (P.talk && A.talk) send(ctx, A.talk)
  if (P.talkdo && A.talkdo) act(ctx, A.talkdo)
  if (P.shop && A.shop) shop(ctx, A.shop)
}

// the conversation is a shot: the camera eases over your shoulder onto their face, and gives itself back when you leave
function cine(ctx, s) {
  if (!ctx.self.isLocal || !ctx.view) return
  const ses = ctx.self.session, id = s.talkWith && !s.shopOpen ? s.talkWith : null
  if (id === ses.cineFor) return
  ses.cineFor = id
  if (!id) { ctx.view.camera = null; return }
  const it = live(ctx, id); if (!it) { ctx.view.camera = null; return }
  const a = ctx.self.feetPosition, b = it.feetPosition, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1
  const ux = dx / d, uz = dz / d, back = Math.min(1.1, d * 0.5)
  const head = (it.bounds?.size?.y ?? 1.6) * 0.85
  ctx.view.camera = {
    eye: { x: b.x - ux * (back + 0.9) - uz * 0.45, y: b.y + head + 0.05, z: b.z - uz * (back + 0.9) + ux * 0.45 },
    aim: { x: b.x, y: b.y + head - 0.05, z: b.z }, fov: 42,
  }
}

// combat breaks a conversation (like New Vegas): you get hurt, the one you talk to is fighting or hurt, or a hostile closes in
const FOES = ['hound', 'stealer', 'smiler', 'lurker', 'l5rat', 'l3rat', 'l5staff', 'hostile', 'moth']
function combat(ctx, it, ses) {
  const s = ctx.self.state, hp = s.hp ?? 0, ihp = it.state?.hp ?? 0
  const hurt = ses.tkHp != null && hp < ses.tkHp - 0.5, ihurt = ses.tkIt === it.id && ses.tkIhp != null && ihp < ses.tkIhp - 0.5
  ses.tkHp = hp; ses.tkIhp = ihp; ses.tkIt = it.id
  if (hurt || ihurt || it.state?.target) return true
  for (const f of ctx.query({ anyTags: FOES, radius: 9 })) {
    if (f.state?.dead || (f.state?.hp ?? 1) <= 0 || f.state?.disguised || f.state?.corpseAt) continue
    return true
  }
  return false
}
export function update(ctx, dt) {
  const s = ctx.self.state, m = (ctx.self.session.tk ??= { acc: 0 }), ses = ctx.self.session
  cine(ctx, s)
  if (s.talkWith && ses.talkingTo !== s.talkWith) {
    const it = live(ctx, s.talkWith)
    if (it) openDialogue(ctx, it)
  } else if (!s.talkWith && ses.talkingTo) {
    ses.talkingTo = null
    s.talkChoices = null
  }
  social(ctx, ses)
  if (!s.talkWith && !s.shopOpen) return
  m.acc += dt; if (m.acc < 0.3) return; m.acc = 0
  const it = live(ctx, s.talkWith ?? s.shopOpen)
  if (it && !it.state?.angry?.[ctx.self.id] && flat(it.feetPosition, ctx.self.feetPosition) > T.range && s.talkWith) { // walked off mid-talk: they say so, and remember it
    const k = keyOf(ctx.self), m0 = it.state.mem?.[k] ?? { met: 1, notes: [] }
    it.state.mem = { ...(it.state.mem ?? {}), [k]: { ...m0, notes: [...(m0.notes ?? []).filter((n) => n !== 'walked off mid-conversation'), 'walked off mid-conversation'].slice(-6) } }
    say(ctx, it, BYE[Math.floor(ctx.random() * BYE.length)], 'annoyed')
  }
  if (!it || flat(it.feetPosition, ctx.self.feetPosition) > T.range || it.state?.angry?.[ctx.self.id]) close(ctx) // walk off and it closes
  else if (combat(ctx, it, ses)) { close(ctx); s.notice = { text: 'Combat! The conversation ends.', at: ctx.now() } }
  if (s.talkBusy && ctx.now() - s.talkBusy > 22000) { // the reply never came: they answer anyway instead of standing there mute
    s.talkBusy = 0
    if (it && s.talkWith) { const line = canned(ctx); say(ctx, it, line, 'calm'); logLine(ctx, it, 'n', line); getStartersLib(ctx).then(({ getChoices }) => { s.talkChoices = getChoices(ctx, it, s, line, null) }) }
  }
}

function canned(ctx) {
  const t = String(ctx.self.session.lastText ?? '').toLowerCase()
  const k = /\b(hi|hey|hello|yo|sup|morning|evening)\b/.test(t) ? 'hello'
    : /\b(bye|later|see you|goodbye|gotta go)\b/.test(t) ? 'bye'
    : /\b(trade|buy|sell|backbucks|money|cash|price)\b/.test(t) ? 'trade'
    : /\b(danger|safe|avoid|monster|entit|hound|smiler|kill)\b/.test(t) ? 'danger'
    : /\b(who are you|your name|about you|yourself|how long)\b/.test(t) ? 'you'
    : /\b(level|place|here|where|this room|lore)\b/.test(t) ? 'place' : 'other'
  const row = CANNED[k] ?? CANNED.other, safe = (CANNED.safe ?? []).includes(ctx.self.place)
  const pool = row.any ?? (safe ? row.safe : row.danger) ?? row.safe ?? T.fallback
  return pool[Math.floor(ctx.random() * pool.length)]
}
