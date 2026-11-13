import { hostileReason } from "./lib/forgive.js";
import { l31Order } from './lib/level31-food.js'
import { plain } from './lib/plain.js'
import { actedVoice, hasCast, recordedDuration } from './lib/voices.js'
// Talk with NPCs, on the player. E on a person opens the card (interact.js sets state.talkWith). Everything they say and
// every choice you get is written by hand (scripts/lib/dialogue.js, data/dlg-*.yml): pick a line, they answer it; checks are rolled here.
// Traders open a shop from the card. Numbers: lib/data/talk.yml, lib/data/shops.yml.
import { heard as hearAt } from "./lib/hear.js";
import T from './lib/data/talk.yml'
import { nameOf, keyOf, isTrader, voiceOf, VO, rollCheck, freshStock, buyPrice, sellPrice, sellables, removeOne, SHOPS, repairables, repairPrice } from './lib/npc-talk.js'
import { takeToken, weaponAim } from './player.js'
import W from './lib/weapons.js'
import { talk as service } from './interact.js'
import { skillsOf, SKILLS } from './lib/stats.js'
import { describe } from './lib/items.js'
import { repDisc, isHated, repKind, repTrade } from './lib/rep.js'
import { recruit, adopt, dismiss, order, giveWeapon, takeWeapon, PERKS, perkOf } from './lib/companion.js'
import { addressFor, saysName } from './lib/address.js'
import { lineFor } from './lib/personality.js'
import { raycast } from 'builtin/physics'
import { handleDialogueQuest } from './lib/level11-quests.js'
import { handleDialogueQuest10 } from './lib/level10-quests.js'
import { handleDialogueQuest8 } from './lib/level8-quests.js'
import { handleDialogueQuest21 } from './lib/level21-quests.js'
import { handleDialogueQuestZ } from './lib/zenith-quest.js'
import { handleDialogueQuest1 } from './lib/level1-quests.js'
import { handleDialogueQuest02 } from './lib/remodel-quest.js'
import { handleDialogueQuest13 } from './lib/level13-quest.js'
import { handleDialogueQuest31 } from './lib/level31-quest.js'
import { handleDialogueQuest70 } from './lib/level70-quest.js'

import { greetingOf, rootChoices, childChoices, nodeOf, lineOf, barkOf, gestOf, BYE_CHOICE } from './lib/dialogue.js'
import { questChoices, realtyChoice } from './lib/npc-starters.js'
import { zenithChoice } from './lib/zenith-quest.js'
import { l1Choice } from './lib/level1-quests.js'

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
    const sees = (quiet && ses.aimReaction?.id !== o.id && dd < 5) && canSee(ctx, o, me)
    if (mem && quiet && sees && dd < 3.5 && now - (hi[o.id] ?? -1e9) > 180000) {
      hi[o.id] = now; const r = o.state.rapport?.[k] ?? 0
      o.state.talkTo = me.id; o.state.talkAt = now; say(ctx, o, r < -20 ? HI(addressFor(o, me, mem), r)[0] : (barkOf(o, 'hi', () => ctx.random(), me.place) ?? lineFor(o, 'hi', addressFor(o, me, mem))), r < -20 ? 'annoyed' : 'happy')
    } else if (sees) {
      const st = me.state, hp = st.hp ?? 100
      if (hp < (st.maxHp ?? 100) * 0.35 && dd < 4.5) react(ctx, ses, o, 'hurt', now)
      else if (st.crouch && dd < 3) react(ctx, ses, o, 'sneak', now)
    }
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
function canReact(ctx, o) {
  const s = ctx.self.state, n = o?.state
  return !!n && !s.dead && !s.talkWith && !s.shopOpen && !n.dead && !n.down && (n.hp ?? 1) > 0
    && !n.hostile && !n.fleeing && !n.target && !hostileReason(ctx, o, ctx.self)
    && !ctx.place.players.some((p) => p.state?.talkWith === o.id || p.state?.shopOpen === o.id)
}
function react(ctx, ses, o, kind, now) {
  const ra = (ses.react ??= {}), key = o.id + ':' + kind
  const cooldown = kind === 'close' ? 12000 : kind === 'drawn' ? 20000 : 60000
  if (now - (ra[key] ?? -Infinity) < cooldown) return false
  if (now - (ses.reactAny ?? -Infinity) < 6000 || !canReact(ctx, o)) return false
  ra[key] = now; ses.reactAny = now
  const me = ctx.self, name = addressFor(o, me, o.state.mem?.[keyOf(me)])
  const line = kind === 'close' ? 'Excuse me.' : (barkOf(o, kind, () => ctx.random(), me.place) ?? lineFor(o, kind, name))
  say(ctx, o, line.replaceAll('{u}', name), kind === 'drawn' ? 'scared' : 'calm')
  return true
}

function aimReaction(ctx, ses, s, now) {
  if (!s.ads || s.sheathed || s.reloading || !W[s.equipped]?.ranged || s.dead || (s.downAt && now - s.downAt < 1200) || s.talkWith || s.shopOpen || s.invOpen || s.lootOpen) {
    ses.aimReaction = null
    return
  }
  if (now < (ses.aimCheckAt ?? 0)) return
  ses.aimCheckAt = now + 100
  const { eye, fwd, pitch } = weaponAim(ctx), cp = Math.cos(pitch)
  const hit = raycast(ctx, eye, { x: fwd.x * cp, y: Math.sin(pitch), z: fwd.z * cp }, {
    distance: 6.5, physicsOnly: true, ignoreEntities: [ctx.self.id],
  })
  let o = hit?.id && ctx.getObject(hit.id)
  for (let i = 0; o?.parent?.id && i < 6; i++) {
    const parent = ctx.getObject(o.parent.id)
    if (!parent) break
    o = parent
  }
  if (!o?.tags?.includes('npc')) { ses.aimReaction = null; return }
  const aim = ses.aimReaction
  if (aim?.id !== o.id) { ses.aimReaction = { id: o.id, at: now }; return }
  if (aim.spoke || now - aim.at < 250 || !react(ctx, ses, o, 'drawn', now)) return
  aim.spoke = true
  o.state.socialReaction = { kind: 'drawn', by: ctx.self.id, at: now }
}

const canBump = (npc) => npc?.tags?.includes('npc') || npc?.tags?.includes('l61fc')
export function onCollide(ctx, other, contact) {
  if (!canBump(other) || Math.abs(contact?.normal?.y ?? 0) > 0.65) return
  const me = ctx.self, ses = me.session, dir = ses['player.js']?.dir, p = me.feetPosition, q = other.feetPosition
  if (!dir || !q || dir.x * (q.x - p.x) + dir.z * (q.z - p.z) <= 0.05) return
  bump(ctx, ses, ctx.getObject(other.id), ctx.now())
}
function bump(ctx, ses, o, now) {
  if (!canBump(o) || !react(ctx, ses, o, 'close', now)) return
  o.state.socialReaction = { kind: 'close', by: ctx.self.id, at: now }
}

// Character controllers can pass through other characters without dispatching onCollide.
function contactReaction(ctx, ses, s, now) {
  if (now < (ses.contactCheckAt ?? 0)) return
  ses.contactCheckAt = now + 100
  const me = ctx.self, p = me.feetPosition, prev = ses.contactFeet, move = ses['player.js']?.dir
  ses.contactFeet = { x: p.x, y: p.y, z: p.z, place: me.place }
  if (!prev || prev.place !== me.place || !move || s.dead || s.talkWith || s.shopOpen || me.parent
    || now - (ses.reactAny ?? -Infinity) < 6000) return
  const dx = p.x - prev.x, dz = p.z - prev.z, distance = Math.hypot(dx, dz)
  if (distance < 0.02 || distance > 2 || Math.abs(p.y - prev.y) > 0.4 || dx * move.x + dz * move.z <= 0.01) return
  const capsule = me.physics?.capsule, radius = capsule?.radius ?? 0.32
  const from = { x: prev.x, y: prev.y + Math.max(radius + 0.1, (capsule?.height ?? 1.6) * 0.5), z: prev.z }
  const hit = raycast(ctx, from, { x: dx / distance, y: 0, z: dz / distance }, {
    distance: distance + 0.025, radius, physicsOnly: true, ignoreEntities: [me.id],
  })
  if (hit?.id) bump(ctx, ses, ctx.getObject(hit.id), now)
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const note = (ctx, text) => { ctx.self.state.notice = { text, at: ctx.now() } }
const skn = (k) => SKILLS.find((x) => x.k === k)?.name ?? (k[0].toUpperCase() + k.slice(1))
function live(ctx, id) { const it = id && ctx.getObject(id); return it && !it.state?.dead && (it.state?.hp ?? 1) > 0 ? it : null }
const rapportOf = (ctx, it) => it.state?.rapport?.[keyOf(ctx.self)] ?? (hostileReason(ctx, it, ctx.self) ? -60 : 0)
function setRapport(ctx, it, v) { it.state.rapport = { ...(it.state.rapport ?? {}), [keyOf(ctx.self)]: clamp(Math.round(v), -100, 100) } }

function logLine(ctx, it, w, t) {
  const s = ctx.self.state, k = short(it), all = { ...(s.talks ?? {}) }
  all[k] = [...(all[k] ?? []), [w, t]].slice(-T.memory); s.talks = all
}
// the reply: a voice at the npc everyone near hears, their speech bubble, your subtitle
function say(ctx, it, line, mood) {
  const who = voiceOf(it), direct = ctx.self.state.talkWith === it.id
  const take = actedVoice(who, line)
  // The written line is the transcript for an existing take. Plain speech cleanup applies to fallbacks.
  if (!take) line = plain(line)
  const clip = take ?? (direct && hasCast(who) ? null : VO(who, line))
  const now = ctx.now(), p = it.feetPosition, length = recordedDuration(clip)
  const d = length ? Math.max(length + 450, 1200 + line.length * 35) : 1600 + line.length * 60
  ctx.self.state.sub = { who: nameOf(it), t: line, at: now, d }
  it.state.line = { t: line, at: now, d }; it.state.talkAt = now; it.state.talkTo = ctx.self.id
  if (mood) {
    ctx.self.state.talkMood = mood
    it.state.mood = mood
  }
  hearAt(ctx, { clip, position: { x: p.x, y: p.y + 1.6, z: p.z }, volume: 0.9, maxDistance: 14 }, { audience: { nearby: p, radius: 16 } }, { listener: direct ? ctx.self.id : null, duration: d })
}
function close(ctx) { const s = ctx.self.state; ctx.self.session.tkHp = null; ctx.self.session.tkIhp = null; s.talkWith = null; s.shopOpen = null; s.talkBusy = 0; s.talkChoices = null; ctx.self.session.talkingTo = null }

export function openDialogue(ctx, it) {
  const s = ctx.self.state, ses = ctx.self.session, now = ctx.now()
  if (!it || it.state?.dead || (it.state?.hp ?? 1) <= 0 || hostileReason(ctx, it, ctx.self)) return
  s.talkWith = it.id
  s.shopOpen = null
  ses.talkingTo = it.id
  ses.askedNow = []
  it.state.talkAt = now
  it.state.talkTo = ctx.self.id
  const hist = s.talks?.[short(it)] ?? [], key = keyOf(ctx.self)
  const recent = hist.length && now - (ses.lastGreetAt ?? -1e9) < 60000
  const g = greetingOf(it, ctx.self.place, { met: hist.length > 0 || !!it.state?.mem?.[key], rapport: rapportOf(ctx, it), following: it.state?.follow === ctx.self.id, seed: Math.floor(ctx.random() * 1e9) })
  if (g && !recent) { ses.lastGreetAt = now; say(ctx, it, g.text, g.mood); logLine(ctx, it, 'n', g.text) }
  s.talkChoices = offer(ctx, it, s, null)
}
// what you can say now: the quests this person has for you, then the written choices (a reply's follow-ups, else the
// questions you haven't asked this visit), and always a way out. Nothing typed, nothing generated.
function offer(ctx, it, s, next) {
  const place = ctx.self.place, ses = ctx.self.session, asked = new Set(ses.askedNow ?? [])
  let list = next?.length ? [...next, { text: 'Back to something else.', tag: 'Back', node: 'root' }] : rootChoices(it, place, asked).filter((c) => c.node !== 'bye')
  if (!next?.length) list = [...questChoices(ctx, it, s), ...list]
  list = l1Choice(ctx, it, s, zenithChoice(ctx, it, s, realtyChoice(ctx, it, s, list))) ?? list
  list = list.filter(Boolean).slice(0, 5)
  if (list.length >= 5) list = list.slice(0, 4)
  list.push(BYE_CHOICE)
  return list
}

function send(ctx, d) {
  const s = ctx.self.state, it = live(ctx, s.talkWith), now = ctx.now(), ses = ctx.self.session
  if (!it || d.id !== it.id) return
  const text = String(d.text ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return
  if (now - (ses.talkAt ?? -1e9) < 500) return
  if (hostileReason(ctx, it, ctx.self)) { service(ctx, it); return }
  const choice = (s.talkChoices ?? []).find((c) => c && (c.text === text))
  if (!choice) return // only what's on the card can be said
  ses.talkAt = now
  const place = ctx.self.place
  if (choice.node === 'bye') { logLine(ctx, it, 'p', text); const l = lineOf(it, place, 'bye', Math.floor(ctx.random() * 1e9)); if (l) { say(ctx, it, l, 'calm'); logLine(ctx, it, 'n', l) } close(ctx); return }
  if (choice.node === 'root') { s.talkChoices = offer(ctx, it, s, null); return }
  logLine(ctx, it, 'p', text)
  if (!choice.node) { // a quest line: the quest's own handler answers it (scripts/lib/level*-quests.js, zenith-quest.js)
    const qRes = handleDialogueQuest02(ctx, ctx.self, it, text) ?? handleDialogueQuest13(ctx, ctx.self, it, text) ?? handleDialogueQuest(ctx, ctx.self, it, text) ?? handleDialogueQuest10(ctx, ctx.self, it, text) ?? handleDialogueQuest8(ctx, ctx.self, it, text)
      ?? handleDialogueQuest21(ctx, ctx.self, it, text) ?? handleDialogueQuestZ(ctx, ctx.self, it, text) ?? handleDialogueQuest1(ctx, ctx.self, it, text) ?? handleDialogueQuest31(ctx, ctx.self, it, text) ?? handleDialogueQuest70(ctx, ctx.self, it, text)
    const line = qRes?.reply ?? lineOf(it, place, 'back', 1) ?? 'Hm.'
    say(ctx, it, line, qRes?.mood ?? 'calm'); logLine(ctx, it, 'n', line)
    s.talkChoices = offer(ctx, it, s, null); return
  }
  const n = nodeOf(choice.node); if (!n) { s.talkChoices = offer(ctx, it, s, null); return }
  ;(ses.askedNow ??= []).push(n.q)
  let passed = true
  const pc = choice.check && SKILLS.some((x) => x.k === choice.check.skill) ? choice.check : null
  if (pc) {
    const c = rollCheck(ctx, s, pc), v = skillsOf(s)[pc.skill] ?? 0
    passed = c.ok
    const pct = Math.max(0, Math.min(100, Math.round((T.roll - (pc.difficulty - v) + 1) / T.roll * 100)))
    logLine(ctx, it, 'x', `[${skn(pc.skill)} ${pct}%] ${passed ? 'SUCCEEDED' : 'FAILED'}`)
    hearAt(ctx, { clip: passed ? 'cdn/sfx-soft-bright-two-note-success-chime.mp3' : 'cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3', volume: 0.5 })
  }
  const seed = Math.floor(ctx.random() * 1e9), pk = (v) => Array.isArray(v) ? v[seed % v.length] : v
  const l31 = passed && typeof n.do === 'string' && n.do.startsWith('l31:') ? l31Order(ctx, n.do.slice(4)) : null // Level 31 snack bar: the order feeds you, or the clerk refuses
  const reply = l31?.say ?? (passed ? pk(n.a) : (pk(n.fail) ?? 'No.'))
  say(ctx, it, reply, passed ? (n.mood ?? (n.do ? 'happy' : 'calm')) : 'annoyed'); logLine(ctx, it, 'n', reply)
  setRapport(ctx, it, clamp(rapportOf(ctx, it) + (passed ? (pc ? 6 : 2) : -4), -100, 100))
  if (passed && n.do === 'heal') {
    s.hp = Math.min(s.maxHp ?? 100, (s.hp ?? 80) + 25); s.sanity = Math.min(100, (s.sanity ?? 80) + 15)
    hearAt(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-bandage-wrap-cloth.mp3", volume: 0.6 })
    ctx.emit("damageNumber", { position: { x: it.feetPosition.x, y: it.feetPosition.y + 1.6, z: it.feetPosition.z }, text: "+25 HP  +15 SANITY", color: "#60ff90", size: 1.1 }, { audience: { player: ctx.self.id } })
  }
  if (passed && n.do === 'recruit' && it.state.follow !== ctx.self.id) {
    const mine = ctx.query({ tags: ['npc'] }).filter((q) => q.state?.follow === ctx.self.id).length
    if (mine < T.join.max) { adopt(ctx.self, it); logLine(ctx, it, 'x', `${nameOf(it)} is coming with you`); note(ctx, `${nameOf(it)} is coming with you. ${PERKS[perkOf(it)]?.name}: ${PERKS[perkOf(it)]?.info}.`) }
    else logLine(ctx, it, 'x', `${T.join.max} people already follow you`)
  }
  if (passed && n.do === 'discount' && isTrader(it)) {
    it.state.discount = { ...(it.state.discount ?? {}), [keyOf(ctx.self)]: Math.max(it.state.discount?.[keyOf(ctx.self)] ?? 0, 0.15) }
    logLine(ctx, it, 'x', `${nameOf(it)} knocks 15% off for you`)
  }
  { const k = keyOf(ctx.self), m0 = it.state.mem?.[k] ?? { met: 0, notes: [] }, fresh = ses.memWith !== it.id; if (fresh) ses.memWith = it.id
    it.state.mem = { ...(it.state.mem ?? {}), [k]: { ...m0, met: (m0.met ?? 0) + (fresh ? 1 : 0), at: now } } }
  s.talkChoices = offer(ctx, it, s, passed ? childChoices(choice.node) : null)
}

// kept for old saves' pending jobs: talk no longer asks a model anything
export function heard(ctx) { ctx.self.state.talkBusy = 0 }

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
  const r = rapportOf(ctx, it), place = ctx.self.place
  const answer = (kind, mood, fb) => { const l = gestOf(it, kind, place) ?? fb; say(ctx, it, l, mood); logLine(ctx, it, 'n', l) }
  if (k === 'wave') {
    ctx.self.anim.gest = { clip: 'cdn/clip-wave-loop.glb', weight: 0.9, loop: 'once', mask: { from: 'Spine' }, blendIn: 0.15, blendOut: 0.3 }
    ctx.after(2.2, 'gestEnd') // a once-clip holds its last frame until cleared: without this the arms froze mid-wave forever
    setRapport(ctx, it, r + 2); answer('wave', 'happy', 'Hey.'); return
  }
  if (k === 'gift') {
    const snack = Object.entries(s.snacks ?? {}).find(([, n]) => n > 0)
    let name
    if (snack) { s.snacks = { ...s.snacks, [snack[0]]: snack[1] - 1 }; name = describe(snack[0])?.name ?? snack[0] }
    else if ((s.almonds ?? 0) > 0) { s.almonds -= 1; name = 'bottle of Almond Water' }
    else { note(ctx, 'You have nothing to give.'); return }
    setRapport(ctx, it, r + 10); repKind(ctx, ctx.self, it, 2, 3)
    note(ctx, `Gave ${name}.`); answer('gift', 'happy', 'Oh. Thank you.'); return
  }
  if (k === 'dance') {
    const willing = r > -10 && !hostileReason(ctx, it, ctx.self) && ctx.random() < 0.55 + r / 200
    if (willing) {
      const clip = 'cdn/clip-dance-loop.glb'
      it.anim.groove = { clip, loop: 'loop', weight: 0.85, blendIn: 0.3, blendOut: 0.4 }
      ctx.self.anim.groove = { clip, loop: 'loop', weight: 0.85, blendIn: 0.3, blendOut: 0.4 }
      s.grooveEnd = now + 10000
      ctx.after(10, 'stopDance', { id: it.id })
      setRapport(ctx, it, r + 5)
    }
    answer(willing ? 'dance' : 'nodance', willing ? 'happy' : 'calm', willing ? 'Alright.' : 'No thanks.'); return
  }
  if (k === 'insult') { setRapport(ctx, it, r - 15); answer('insult', 'annoyed', 'Charming.'); return }
}
export function gestEnd(ctx) { if (ctx.self.anim?.gest) ctx.self.anim.gest = null }
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
  if (!it || !isTrader(it) || hostileReason(ctx, it, ctx.self)) { s.shopOpen = null; return }
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
    eye: { x: b.x - ux * (back + 0.9) - uz * 0.45, y: b.y + head + 0.12, z: b.z - uz * (back + 0.9) + ux * 0.45 },
    aim: { x: b.x, y: b.y + head - 0.5, z: b.z }, fov: 42, // aimed under the chin: the face rides the top third, clear of the dialogue box
  }
}

// combat breaks a conversation (like New Vegas): you get hurt, the one you talk to is fighting or hurt, or a hostile closes in
const FOES = ['hound', 'stealer', 'smiler', 'lurker', 'l5rat', 'l3rat', 'l5staff', 'hostile', 'moth', 'moths', 'l8spider', 'l8-hostile', 'zdrone', 'l11foe', 'l7beast', 'l10worm']
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
  const now = ctx.now()
  aimReaction(ctx, ses, s, now)
  contactReaction(ctx, ses, s, now)
  social(ctx, ses)
  if (!s.talkWith && !s.shopOpen) return
  m.acc += dt; if (m.acc < 0.3) return; m.acc = 0
  const it = live(ctx, s.talkWith ?? s.shopOpen)
  if (it && !hostileReason(ctx, it, ctx.self) && flat(it.feetPosition, ctx.self.feetPosition) > T.range && s.talkWith) { // walked off mid-talk: they say so, and remember it
    const k = keyOf(ctx.self), m0 = it.state.mem?.[k] ?? { met: 1, notes: [] }
    it.state.mem = { ...(it.state.mem ?? {}), [k]: { ...m0, notes: [...(m0.notes ?? []).filter((n) => n !== 'walked off mid-conversation'), 'walked off mid-conversation'].slice(-6) } }
    say(ctx, it, lineOf(it, ctx.self.place, 'walk', Math.floor(ctx.random() * 1e9)) ?? BYE[Math.floor(ctx.random() * BYE.length)], 'annoyed')
  }
  if (!it || flat(it.feetPosition, ctx.self.feetPosition) > T.range || hostileReason(ctx, it, ctx.self)) close(ctx) // walk off and it closes
  else if (combat(ctx, it, ses)) { close(ctx); s.notice = { text: 'Combat! The conversation ends.', at: ctx.now() } }

}
