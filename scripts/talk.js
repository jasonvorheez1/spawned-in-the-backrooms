// Free talk with NPCs, on the player. E on an M.E.G. agent or Survivor opens the card (interact.js sets
// state.talkWith); what you type goes to the built-in model as 'talk', its JSON comes back to heard().
// The model only ever picks words, a mood, a rapport nudge and one whitelisted intent; every check is rolled here.
// Traders open a shop from the card. Numbers: lib/data/talk.yml, lib/data/shops.yml.
import { heard as hearAt } from "./lib/hear.js";
import T from './lib/data/talk.yml'
import { nameOf, keyOf, isTrader, voiceOf, VO, systemPrompt, userMessage, parseReply, rollCheck, freshStock, buyPrice, sellPrice, sellables, removeOne, SHOPS } from './lib/npc-talk.js'
import { takeToken } from './player.js'
import { talk as service } from './interact.js'
import { skillsOf, SKILLS } from './lib/stats.js'
import { describe } from './lib/items.js'

const getStartersLib = (ctx) => ((ctx.session ??= {}).startersP ??= import('./lib/npc-starters.js'))

const short = (it) => String(it.id).split('/').pop()
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
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
function close(ctx) { const s = ctx.self.state; s.talkWith = null; s.shopOpen = null; s.talkBusy = 0; s.talkChoices = null; ctx.self.session.talkingTo = null }

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
  if (s.talkBusy && now - s.talkBusy < 15000) return
  if (now - (ses.talkAt ?? -1e9) < T.rate * 1000) { note(ctx, `${nameOf(it)} is still answering.`); return }
  if (it.state?.angry?.[ctx.self.id]) { service(ctx, it); return }
  ses.talkAt = now; s.talkBusy = now
  const hist = s.talks?.[short(it)] ?? []
  const system = systemPrompt({ it, place: ctx.self.place, pl: ctx.self, rapport: rapportOf(ctx, it), following: it.state?.follow === ctx.self.id })
  const message = userMessage(hist, text, ctx.self.displayName ?? 'Wanderer')
  logLine(ctx, it, 'p', text)
  it.state.talkAt = now; it.state.talkTo = ctx.self.id
  ctx.job('llm:chat', { system, message, model: T.model }, 'heard', { id: it.id })
}

// the model's answer comes back here; only whitelisted intents touch the world
export function heard(ctx, r, pay) {
  const s = ctx.self.state; s.talkBusy = 0
  const it = live(ctx, pay?.id); if (!it) return
  const text = r?.data?.text ?? r?.text ?? (typeof r?.data === 'string' ? r.data : null)
  const o = r?.ok === false ? null : parseReply(text)
  if (!o) { const line = T.fallback[Math.floor(ctx.random() * T.fallback.length)]; say(ctx, it, line, 'calm'); logLine(ctx, it, 'n', line); getStartersLib(ctx).then(({ getChoices }) => { s.talkChoices = getChoices(ctx, it, s, line, null) }); return }
  let { reply: line, rapportDelta: delta, intent } = o, passed = false
  if (o.check) {
    const c = rollCheck(ctx, s, o.check); passed = c.ok
    logLine(ctx, it, 'x', `[${skn(o.check.skill)} ${o.check.difficulty}] ${c.ok ? 'passed' : 'failed'}`)
    if (!c.ok) { line = o.failReply || "nah. not buying that."; delta = Math.min(delta, T.failHit); if (intent !== 'hostile' && intent !== 'leave') intent = 'none' }
  }
  const r1 = clamp(rapportOf(ctx, it) + delta, -100, 100); setRapport(ctx, it, r1)
  const key = keyOf(ctx.self), who = nameOf(it), now = ctx.now()
  if (intent === 'join' && it.state.follow !== ctx.self.id) {
    const mine = ctx.query({ tags: ['npc'] }).filter((q) => q.state?.follow === ctx.self.id).length
    if (r1 < T.join.rapport && !passed) {}
    else if (mine >= T.join.max) logLine(ctx, it, 'x', `${T.join.max} people already follow you`)
    else { it.state.follow = ctx.self.id; logLine(ctx, it, 'x', `${who} is coming with you`); note(ctx, `${who} is coming with you.`) }
  }
  if (intent === 'leave' && it.state.follow === ctx.self.id) { it.state.follow = null; logLine(ctx, it, 'x', `${who} stopped following you`) }
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
    if (it.state.follow === ctx.self.id) it.state.follow = null
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
  if (d.k === 'trade' && isTrader(it)) { restock(ctx, it); s.shopOpen = it.id; return }
  if (d.k === 'back') s.shopOpen = null
}

function restock(ctx, it) {
  const now = ctx.now()
  if (!it.state.stock || now - (it.state.stockAt ?? -1e12) > SHOPS.restock * 1000) { it.state.stock = freshStock(it); it.state.stockAt = now }
}
function shop(ctx, d) {
  const s = ctx.self.state, it = live(ctx, s.shopOpen)
  if (!it || !isTrader(it) || it.state?.angry?.[ctx.self.id]) { s.shopOpen = null; return }
  restock(ctx, it)
  const t = String(d.t ?? ''), barter = skillsOf(s).barter ?? 0, disc = it.state.discount?.[keyOf(ctx.self)] ?? 0
  const stock = { ...it.state.stock }
  if (d.k === 'buy') {
    const row = stock[t]; if (!row || row[0] < 1) { note(ctx, 'Sold out.'); return }
    const price = buyPrice(row[1], barter, disc)
    const cents = price * 100, cash = (s.cents ?? 0) >= cents
    if (!cash && (s.almonds ?? 0) < price) { note(ctx, `Not enough: $${price}.00 or ${price} almond water.`); return }
    if (cash) s.cents -= cents; else s.almonds -= price
    const got = takeToken(ctx, t)
    if (!got?.ok) { if (cash) s.cents += cents; else s.almonds += price; note(ctx, got?.msg ?? (got?.why ? `Can't take it: ${got.why}` : "You can't carry that.")); return }
    stock[t] = [row[0] - 1, row[1]]; it.state.stock = stock
    note(ctx, `Bought ${describe(t).name} for ${cash ? '$' + price + '.00' : price + ' almond water'}.`)
  } else if (d.k === 'sell') {
    const row = sellables(s).find((x) => x[0] === t); if (!row || !removeOne(s, t)) return
    const pay = sellPrice(row[2], barter); s.cents = (s.cents ?? 0) + pay * 100
    stock[t] = [(stock[t]?.[0] ?? 0) + 1, stock[t]?.[1] ?? Math.round(row[2] * 2)]; it.state.stock = stock
    note(ctx, `Sold ${describe(t).name} for $${pay}.00.`)
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
  if (!s.talkWith && !s.shopOpen) return
  m.acc += dt; if (m.acc < 0.3) return; m.acc = 0
  const it = live(ctx, s.talkWith ?? s.shopOpen)
  if (!it || flat(it.feetPosition, ctx.self.feetPosition) > T.range || it.state?.angry?.[ctx.self.id]) close(ctx) // walk off and it closes
  if (s.talkBusy && ctx.now() - s.talkBusy > 15000) s.talkBusy = 0
}
