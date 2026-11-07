// Free talk with NPCs, on the player. E on an M.E.G. agent or Survivor opens the card (interact.js sets
// state.talkWith); what you type goes to the built-in model as 'talk', its JSON comes back to heard().
// The model only ever picks words, a mood, a rapport nudge and one whitelisted intent; every check is rolled here.
// Traders open a shop from the card. Numbers: lib/data/talk.yml, lib/data/shops.yml.
import T from './lib/data/talk.yml'
import { nameOf, keyOf, isTrader, voiceOf, VO, systemPrompt, userMessage, parseReply, rollCheck, freshStock, buyPrice, sellPrice, sellables, removeOne, SHOPS } from './lib/npc-talk.js'
import { takeToken } from './player.js'
import { talk as service } from './interact.js'
import { skillsOf, SKILLS } from './lib/stats.js'
import { describe } from './lib/items.js'

const short = (it) => String(it.id).split('/').pop()
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const note = (ctx, text) => { ctx.self.state.notice = { text, at: ctx.now() } }
const skn = (k) => SKILLS?.[k]?.name ?? (k[0].toUpperCase() + k.slice(1))
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
  ctx.emit('playSound', { clip: VO(voiceOf(it), line), position: { x: p.x, y: p.y + 1.6, z: p.z }, volume: 0.9, maxDistance: 14 }, { audience: { nearby: p, radius: 16 } })
}
function close(ctx) { const s = ctx.self.state; s.talkWith = null; s.shopOpen = null; s.talkBusy = 0 }

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
  if (!o) { const line = T.fallback[Math.floor(ctx.random() * T.fallback.length)]; say(ctx, it, line, 'calm'); logLine(ctx, it, 'n', line); return }
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
}

function act(ctx, d) {
  const s = ctx.self.state, it = live(ctx, s.talkWith)
  if (d.k === 'leave' || !it) { close(ctx); return }
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
    if ((s.almonds ?? 0) < price) { note(ctx, `Not enough almond water: ${price} needed.`); return }
    s.almonds -= price
    const got = takeToken(ctx, t)
    if (!got?.ok) { s.almonds += price; note(ctx, got?.msg ?? (got?.why ? `Can't take it: ${got.why}` : "You can't carry that.")); return }
    stock[t] = [row[0] - 1, row[1]]; it.state.stock = stock
    note(ctx, `Bought ${describe(t).name} for ${price} almond water.`)
  } else if (d.k === 'sell') {
    const row = sellables(s).find((x) => x[0] === t); if (!row || !removeOne(s, t)) return
    const pay = sellPrice(row[2], barter); s.almonds = (s.almonds ?? 0) + pay
    stock[t] = [(stock[t]?.[0] ?? 0) + 1, stock[t]?.[1] ?? Math.round(row[2] * 2)]; it.state.stock = stock
    note(ctx, `Sold ${describe(t).name} for ${pay} almond water.`)
  }
}

export function onInput(ctx, input) {
  const P = input.pressed ?? {}, A = input.actionData ?? {}
  if (P.talk && A.talk) send(ctx, A.talk)
  if (P.talkdo && A.talkdo) act(ctx, A.talkdo)
  if (P.shop && A.shop) shop(ctx, A.shop)
}

export function update(ctx, dt) {
  const s = ctx.self.state, m = (ctx.self.session.tk ??= { acc: 0 })
  if (!s.talkWith && !s.shopOpen) return
  m.acc += dt; if (m.acc < 0.3) return; m.acc = 0
  const it = live(ctx, s.talkWith ?? s.shopOpen)
  if (!it || flat(it.feetPosition, ctx.self.feetPosition) > T.range || it.state?.angry?.[ctx.self.id]) close(ctx) // walk off and it closes
  if (s.talkBusy && ctx.now() - s.talkBusy > 15000) s.talkBusy = 0
}
