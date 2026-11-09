import { regrowWrecks } from "./lib/breakables.js";
import { vo } from './lib/voices.js';
import { heard } from "./lib/hear.js";
import { sitDown, standUp, seatTick, spotsOf } from './lib/seat.js'
import { rollItemL3 } from './lib/loot3.js'
import { startPick } from './lockpick.js'
import { startSpamton } from './spamton-fight.js'
import { openDialogue } from './talk.js'
// Fallout-style looting. Nothing is picked up by walking over it any more: look at an item and the HUD
// names it ("[E] Take  Pipe scrap"), press E to take it. Crates and the remains of what you kill are
// containers: look at one, press E, and a loot menu lists what is inside (take one thing, take all,
// or close it). The looked-at thing glows. scripts/player.js applies the items (takeToken);
// scripts/loot-ui.js draws the prompt and the menu from player.state (focus, lootOpen, lootList, notice).
import { getInputRay, raycast } from 'builtin/physics'
import { stripTo, SLOTS } from './lib/clothes.js'
import { rewear } from './lib/critter-model.js'
import { tokenOf, describe, itemsOf } from './lib/items.js'
import { takeToken, maxHp, maxSan, pullToken } from './player.js'
import { derived, skillsOf, SKILLS } from './lib/stats.js'
const SKN = Object.fromEntries(SKILLS.map((k) => [k.k, k.name]))
import { rollItem, rollItemL1, rollItemL2, spotCloth, poolOf, gateItems } from './lib/loot.js'

const KINDS = ['almond', 'weapon', 'ammo', 'shells', 'container', 'npc', 'door', 'bench', 'usable', 'seat'] // usable: anything with its own press ear (state.name/verb/info) // what can be looked at and used
const BIG_KINDS = new Set(['container', 'npc', 'door', 'bench', 'usable', 'seat'])
function kindOf(tags) {
  if (!tags) return null
  if (tags.includes('seat')) return 'seat'
  for (let i = 0; i < KINDS.length; i++) {
    const k = KINDS[i]
    if (k !== 'seat' && tags.includes(k)) return k
  }
  return null
}
const REACH = 3.0 // metres from the eye
const OPEN_RANGE = 4.5 // a container you walk away from closes
const mem = (ctx) => (ctx.self.session.interact ??= { ray: null, last: -1e9, acc: 0, key: '', focus: null, hl: 0 })
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
function snd(ctx, name, volume = 0.6) {
  const p = ctx.self.feetPosition
  heard(ctx, { clip: SND(name), position: { x: p.x, y: p.y + 1.2, z: p.z }, volume, maxDistance: 12 }, { audience: { player: ctx.self.id } })
}
function note(ctx, text) { ctx.self.state.notice = { text, at: ctx.now() } }

// the thing in the middle of the screen, if any: close enough, nearly on the look ray, with nothing solid between
function findFocus(ctx, ray) {
  const o = ray.origin, d = ray.direction
  let best = null, bestAng = 1e9
  for (const it of ctx.query({ anyTags: KINDS, radius: REACH + 1 })) {
    if (it.state?.taken) continue
    const tag = kindOf(it.tags)
    if (!tag) continue
    if (tag === 'usable' && it.tags?.includes?.('seat')) continue // a seat that's also usable is sat in, never pressed
    const big = BIG_KINDS.has(tag)
    // a usable hung on a parent (the boiler door's panel) reads local feet: aim at its world spot, mid-height for a door
    const wp = !it.state?.c && tag === 'usable' ? ctx.getObject(it.id)?.worldFeetPosition : null
    const p = it.state?.c ?? (wp ? { x: wp.x, y: wp.y + (it.state?.kind === 'boilerdoor' ? 0.9 : 0), z: wp.z } : it.feetPosition)
    let lift = it.state?.c ? 0 : big ? 0.28 : 0.1
    if (tag === 'npc' && !it.state?.dead && (it.state?.hp ?? 1) > 0) { // a standing person is a whole body: the look ray picks the height it crosses at their spot, shins to head
      const top = Math.max(1.1, (it.state?.build?.h ?? 1) * 1.55), hd = Math.hypot(d.x, d.z) || 1e-3
      const along = ((p.x - o.x) * d.x + (p.z - o.z) * d.z) / hd // horizontal metres to their spot along the look
      lift = Math.max(0.3, Math.min(top, o.y + d.y / hd * along - p.y))
    }
    const vx = p.x - o.x, vy = p.y + lift - o.y, vz = p.z - o.z
    const dist = Math.hypot(vx, vy, vz)
    if (dist > REACH || dist < 0.05) continue
    const ang = Math.acos(Math.max(-1, Math.min(1, (vx * d.x + vy * d.y + vz * d.z) / dist)))
    if (ang > Math.max(0.075, Math.atan((big ? 0.55 : 0.3) / dist)) || ang >= bestAng) continue
    const wall = raycast(ctx, o, { x: vx / dist, y: vy / dist, z: vz / dist }, { distance: dist - 0.05, physicsOnly: true, ignoreEntities: [it.id, ctx.self.id], bodies: 'static' })
    if (wall && ((tag !== 'usable' && tag !== 'seat' && tag !== 'door') || dist - wall.distance > 0.6)) continue // a usable set into furniture (a desk's computer) is reached through its own desk's shell
    best = { id: it.id, tag }; bestAng = ang
  }
  return best
}

// write the focus to player.state only when it changes (the HUD reads it)
function refocus(ctx, force = false) {
  const m = mem(ctx), s = ctx.self.state, now = ctx.now()
  if (!m.ray || (!force && now - m.last < 70)) return
  m.last = now
  if (s.lootOpen) { if (s.focus) s.focus = null; m.focus = null; return }
  const me = ctx.self.feetPosition, ro = m.ray.origin
  if (Math.hypot(ro.x - me.x, ro.z - me.z) > 2.5) { m.ray = null; m.focus = null; if (s.focus) s.focus = null; m.key = ''; return } // a look ray left from where you stood a moment ago: no prompt, no outline until a fresh one
  const f = findFocus(ctx, m.ray)
  m.focus = f
  let info = null
  if (f) {
    const it = ctx.getObject(f.id)
    if (it) {
      if (f.tag === 'door') {
        const lk = it.state?.lock ?? ''
        info = { id: f.id, name: it.state?.name ?? 'Door', info: it.state?.open ? 'open' : 'shut', verb: it.state?.open ? 'Close' : 'Open', color: '#d9d3b8' }
        if (lk && DOORKEY[lk]) { const have = ctx.self.state[DOORKEY[lk].f] ?? 0; info.info = `Locked · needs a ${DOORKEY[lk].n} (${have})`; info.verb = have ? `Use ${DOORKEY[lk].n}:` : 'Locked:'; info.color = have ? '#f2c14e' : '#e0644f' }
        else if (lk) { const [sk, lv] = lk.split(':'), ok = (skillsOf(ctx.self.state)[sk] ?? 0) >= Number(lv); info.info = `Locked · ${SKN[sk]} ${lv}`; info.verb = sk === 'lockpick' ? 'Pick Lock' : (ok ? 'Unlock' : 'Locked:'); info.color = ok ? '#f2c14e' : '#e0644f' }
      } else if (f.tag === 'usable') {
        info = { id: f.id, name: it.state?.name ?? 'Thing', info: it.state?.info ?? '', verb: it.state?.verb ?? 'Use', color: it.state?.tint ?? '#d9d3b8' }
      } else if (f.tag === 'seat') {
        const full = spotsOf(it).every((sp) => it.state?.by?.[sp.i] && it.state.by[sp.i] !== ctx.self.id)
        info = { id: f.id, name: it.state?.name ?? 'Chair', info: full ? 'taken' : '', verb: full ? 'Taken:' : 'Sit', color: full ? '#e0644f' : '#d9d3b8' }
      } else if (f.tag === 'bench') {
        info = { id: f.id, name: it.state?.name ?? 'Workbench', info: 'Craft ammo, repair kits, batteries, fuses', verb: 'Use', color: '#f2c14e' }
      } else if (f.tag === 'npc') {
        const fac = it.state?.faction5 === 'hotel' ? 'Homely Hotel' : it.state?.faction5 === 'orig' ? 'The Originals' : it.state?.faction5 === 'hk' ? 'M.E.G.' : (it.state?.faction ?? 'M.E.G.')
        info = { id: f.id, name: it.state?.name ?? 'Stranger', info: fac, verb: 'Talk', color: '#c6f060' }
        const pc = pickChance(ctx, it)
        if (pc != null) info = { id: f.id, name: it.state?.name ?? 'Stranger', info: `${Math.round(pc * 100)}% · Sneak`, verb: 'Pickpocket', color: pc >= 0.6 ? '#c6f060' : pc >= 0.35 ? '#f2c14e' : '#e0644f' }
      } else if (f.tag === 'container') {
        refill(ctx, it)
        const n = itemsOf(it.state?.items).length
        info = { id: f.id, name: it.state?.name ?? 'Container', info: n ? `${n} item${n > 1 ? 's' : ''}` : 'empty', verb: 'Search', color: '#d9d3b8' }
        if (it.state?.lock) { const [sk, lv] = it.state.lock.split(':'), ok = (skillsOf(ctx.self.state)[sk] ?? 0) >= Number(lv); info.info = `Locked · ${SKN[sk]} ${lv}`; info.verb = sk === 'lockpick' ? 'Pick Lock' : (ok ? 'Unlock' : 'Locked:'); info.color = ok ? '#f2c14e' : '#e0644f' }
      } else {
        const dsc = describe(tokenOf(f.tag, it))
        info = { id: f.id, name: dsc.name, info: dsc.info, verb: 'Take', color: dsc.color }
      }
    }
  }
  const key = info ? `${info.id}|${info.info}` : ''
  if (key !== m.key) { m.key = key; s.focus = info }
}

function closeLoot(ctx) {
  const s = ctx.self.state, c = s.lootOpen ? ctx.getObject(s.lootOpen) : null
  if (c) snd(ctx, 'container-close-thud', 0.35)
  if (c && c.tags?.includes('remains') && !itemsOf(c.state?.items).length) ctx.destroy(c.id) // an emptied corpse is cleared away
  s.lootOpen = ''; s.lootList = ''; s.lootName = ''; s.pocket = false; s.lootStore = false
  mem(ctx).key = ''
}

const REFILL_MS = 60 * 60000 // Shelly: looted containers refill after an hour
function refill(ctx, c) { const st = c?.state; if (st?.full != null && st.refillAt && ctx.now() >= st.refillAt) { st.items = st.full; st.refillAt = 0; st.scavved = false } }
// Spamton (a key item won in Level 11): money already in the loot pays 2% more (at least 1¢); no money, a 10% chance of a backquarter. His laugh says it fired. (Savi's reading of Shelly's rule)
const SPAM_LAUGH = '/cdn/snd-spamton-laugh-glitch-sfx-7vvbohql.mp3'
function spamtonPerk(ctx, c) {
  const s = ctx.self.state
  if (!(s.keyItems ?? []).includes('spamton')) return
  const items = String(c.state.items ?? '').split(',').filter(Boolean)
  let fired = false
  if (items.some((t) => t.startsWith('cash:'))) {
    c.state.items = items.map((t) => t.startsWith('cash:') ? 'cash:' + Math.max((+t.slice(5) || 1) + 1, Math.round((+t.slice(5) || 1) * 1.02)) : t).join(',')
    fired = true
  } else if (ctx.random() < 0.1) { c.state.items = [...items, 'cash:25'].join(','); fired = true }
  if (fired) { ctx.emit('playSound', { clip: SPAM_LAUGH, volume: 0.55 }, { audience: { player: ctx.self.id } }); note(ctx, '[[SPAMTON]]: A [[Deal]] FOR YOU, KID!') }
}
export function openLoot(ctx, c) {
  const s = ctx.self.state
  refill(ctx, c)
  if (c.state.lock) { // Fallout-style lock: you need the skill level, no minigame
    const [sk, lv] = c.state.lock.split(':'), have = skillsOf(s)[sk] ?? 0
    if (have < Number(lv)) { note(ctx, `Locked: requires ${SKN[sk]} ${lv}`); snd(ctx, 'ui-denied-click', 0.35); return }
    if (sk === 'lockpick') { startPick(ctx, c, Number(lv), 'crate'); return } // the minigame (scripts/lockpick.js) opens it
    c.state.lock = ''; c.state.name = sk === 'science' ? 'Unlocked locker' : 'Opened crate'
    note(ctx, `[${SKN[sk]} ${lv}] ${sk === 'science' ? 'You crack the locker' : 'You pick the lock'}`); snd(ctx, 'lock-picking-click', 0.5)
  }
  if (!c.tags?.includes('storage') && !c.state.scavved && c.state.items !== undefined) { // Scavenge and Luck: a chance of one extra find, once per container
    c.state.scavved = true
    if (ctx.random() < derived(s).scav) c.state.items = [c.state.items, (ctx.self.place === 'level1' ? rollItemL1(ctx) : ctx.self.place === 'level2' ? rollItemL2(ctx) : ctx.self.place === 'level3' ? rollItemL3(ctx) : rollItem(ctx, poolOf(ctx.self.place)))].filter(Boolean).join(',')
    const cl = spotCloth(ctx, derived(s).clothFind) // Observation (Perception) spots a wearable tucked in the junk
    if (cl) c.state.items = [c.state.items, cl].filter(Boolean).join(',')
    spamtonPerk(ctx, c)
  }
  if (!c.tags?.includes('storage') && !c.tags?.includes('npc') && c.state.items) { // nothing rarer than this player's level allows (lib/weapons.js rarityCap)
    const g = gateItems(ctx, c.state.items, s.level ?? 1, poolOf(ctx.self.place)); if (g !== c.state.items) c.state.items = g
  }
  const own = ownerOf(ctx, c)
  s.lootOpen = c.id; s.lootName = (own ? `${c.state.ownerName ?? 'Someone'}'s · ` : '') + (c.state?.name ?? 'Container'); s.lootList = c.state?.items ?? ''; s.focus = null; s.lootStore = !!c.tags?.includes('storage') // storage (your fridge): you put things in too
  snd(ctx, 'container-open-rustle', 0.5)
}

// the M.E.G. agents: the scout tells you how Level 1 works, the medic patches you up, the quartermaster hands out supplies
const TIPS = [
  "when the lights flicker, get into the corridors. the green exit signs. nothing hunts in there.",
  "people call out hello in the halls. real people walk in groups. don't go to a lone voice.",
  "crates show up on the racks after every blackout. that's how we eat out here.",
  "the hounds hunt in the dark. keep your light off and walk, don't run.",
  "follow the pipes east. that's the way toward the utility halls.",
];
const TIPS2 = [
  "the lights here are wired in series. one dies, the whole block goes dark. violet means emergency power, move on.",
  "most doors are locked. don't waste your shoulder on them. the green one behind us goes back up to level one.",
  "the hounds came through here once and took everyone. stay near the camp when you hear them.",
  "toolboxes and parts bins in the warehouses. batteries, shells, the odd sledgehammer.",
  "the barred door at the east wall has a three on it. something heavy leans on the other side.",
];
const VO = (who, line) => vo(who, line)
function speak(ctx, it, who, line) {
  ctx.self.state.sub = { who: it.state.name.split(' ·')[0], t: line, at: ctx.now(), d: 1600 + line.length * 60 } // the subtitle strip shows it
  const p = it.feetPosition
  heard(ctx, { clip: VO(who, line), position: { x: p.x, y: p.y + 1.6, z: p.z }, volume: 0.9, maxDistance: 14 }, { audience: { player: ctx.self.id } })
}
export function talk(ctx, it) {
  const s = ctx.self.state, now = ctx.now(), role = it.state?.role
  if (it.state?.angry?.[ctx.self.id]) { note(ctx, `${it.state.name.split(' ·')[0]} won't talk to you.`); return }
  it.state.talkAt = now; it.state.talkTo = ctx.self.id // they gesture while they speak
  const v = it.state?.voice
  if (role === 'scout') { const tips = ctx.self.place === 'level2' ? TIPS2 : TIPS; s.megTip = ((s.megTip ?? -1) + 1) % tips.length; speak(ctx, it, v ?? 'ale', tips[s.megTip]); return }
  if (role === 'medic') {
    if (now - (s.megMedAt ?? -1e9) < 90000 * (1 - skillsOf(s).medicine / 200)) { speak(ctx, it, v ?? 'ortiz', "you're patched. give it a minute and come back."); return }
    s.megMedAt = now; s.hp = maxHp(s.level ?? 1, s); s.sanity = Math.max(s.sanity ?? 0, maxSan(s.level ?? 1, s))
    speak(ctx, it, v ?? 'ortiz', "hold still. there. you're good to walk."); snd(ctx, 'bandage-wrap-cloth', 0.6); return
  }
  if (role === 'quarter') {
    if (now - (s.megQmAt ?? -1e9) < 180000) { speak(ctx, it, v ?? 'callum', "rations are counted. come back after the next patrol."); return }
    s.megQmAt = now; takeToken(ctx, 'almond'); takeToken(ctx, 'almond'); takeToken(ctx, 'ration')
    speak(ctx, it, v ?? 'callum', "two almond waters and a ration. don't waste them.")
    const sk = skillsOf(s), extra = []
    if (sk.barter >= 40) { takeToken(ctx, 'almond'); extra.push(`[Barter 40] +1 almond water`) }
    if (sk.speech >= 50) { takeToken(ctx, 'bandage'); extra.push(`[Speech 50] +1 bandage`) }
    if (extra.length) note(ctx, `Callum: "two almond waters and a ration." ${extra.join(' · ')}`)
    return
  }
}

// Level 2 doors: E opens and shuts; a locked one takes the key item it names (fuse, valve wheel, keycard) or a skill
const DOORKEY = { fuse: { f: 'fuses', n: 'fuse' }, valve: { f: 'valves', n: 'valve wheel' }, keycard: { f: 'keycards', n: 'keycard' } }
function useDoor(ctx, it) {
  const s = ctx.self.state, lk = it.state.lock ?? '', at = it.state.c ?? it.feetPosition
  const loud = (n, v) => heard(ctx, { clip: SND(n), position: at, volume: v, maxDistance: 16 }, { audience: { nearby: at, radius: 18 } })
  if (lk) {
    const K = DOORKEY[lk]
    if (K) {
      if (!(s[K.f] > 0)) { note(ctx, `Locked. It needs a ${K.n}.`); snd(ctx, 'door-handle-locked-rattle', 0.5); return }
      s[K.f] -= 1; it.state.lock = ''; note(ctx, lk === 'fuse' ? 'You seat the fuse. The lock clunks open.' : lk === 'valve' ? 'You fit the valve wheel and crank it. The door unseals.' : 'The keycard reader blinks green.')
    } else {
      const [sk, lv] = lk.split(':'), have = skillsOf(s)[sk] ?? 0
      if (have < Number(lv)) { note(ctx, `Locked · needs ${SKN[sk]} ${lv} (you have ${Math.floor(have)})`); snd(ctx, 'door-handle-locked-rattle', 0.5); return }
      if (sk === 'lockpick') { startPick(ctx, it, Number(lv), 'door'); return }
      it.state.lock = ''; note(ctx, `[${SKN[sk]} ${lv}] You pick the lock`); snd(ctx, 'lock-picking-click', 0.5)
    }
  }
  it.state.open = !it.state.open
  loud(it.state.open ? 'heavy-metal-door-creak-open' : 'heavy-metal-door-slam-shut', 0.7)
}

// Pickpocketing: crouched, seen or not (creator's rule: always available; facing them costs odds), alive and not already after you. The roll is Sneak plus Agility,
// better the more squarely behind them you are, worse each time you have lifted from them. Caught = they turn on you.
function facingAway(ctx, it) {
  const r = it.rotation, yaw = ((typeof r === 'number' ? r : r?.yaw) ?? 0) * Math.PI / 180
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), p = ctx.self.feetPosition, q = it.feetPosition
  const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz) || 1
  return (fx * dx + fz * dz) / d // 1 = right in front of their eyes, -1 = square behind them
}
function pickChance(ctx, it) {
  const s = ctx.self.state, st = it.state ?? {}
  if (!s.crouch || st.dead || st.angry?.[ctx.self.id] || st.follow === ctx.self.id || s.talkWith) return null
  const f = facingAway(ctx, it) // seen or not, you can try; being watched just makes it much harder
  const sk = skillsOf(s).sneak ?? 0, agi = Number(String(s.attr ?? '5,5,5,5,5,5,5').split(',')[5]) || 5
  const lifted = st.picked?.[ctx.self.id] ?? 0
  return Math.max(0.05, Math.min(0.95, 0.3 + sk / 160 + (agi - 5) * 0.03 + (0.35 - f) * 0.2 - (f > 0.35 ? 0.2 : 0) - (s.detect === 'danger' ? 0.1 : 0) - lifted * 0.12))
}
function pocketsOf(ctx, it) {
  if (it.state.pockets === undefined) {
    const roll = () => (ctx.self.place === 'level1' ? rollItemL1(ctx) : ctx.self.place === 'level2' ? rollItemL2(ctx) : ctx.self.place === 'level3' ? rollItemL3(ctx) : rollItem(ctx, poolOf(ctx.self.place)))
    const n = 1 + Math.floor(ctx.random() * 3), got = ['almond']
    for (let i = 0; i < n; i++) got.push(roll())
    if (ctx.random() < 0.5) got.push('ammo')
    it.state.pockets = got.filter(Boolean).join(',')
  }
  return itemsOf(it.state.pockets)
}
const CAUGHT = ["that's it. you're done.", 'i warned you, thief!', 'twice? you little thief!']
const WARN = ['what the hell do you think you\'re doing?', 'hey! hands off my stuff.', 'try that again and see what happens.']
function pickpocket(ctx, it) {
  const s = ctx.self.state, now = ctx.now(), m = mem(ctx)
  if (now - (m.pickAt ?? -1e9) < 900) return
  m.pickAt = now
  const items = pocketsOf(ctx, it), who = (it.state.name ?? 'Stranger').split(' ·')[0]
  if (!items.length) { note(ctx, `${who}'s pockets are empty.`); return }
  s.lootOpen = it.id; s.lootName = `${who}'s pockets`; s.lootList = it.state.pockets; s.pocket = true; s.focus = null
  snd(ctx, 'loot-take-all-rustle', 0.15)
}
// one grab from an open pocket: the roll happens here, per item
function liftOne(ctx, it, i) {
  const s = ctx.self.state, items = pocketsOf(ctx, it), who = (it.state.name ?? 'Stranger').split(' ·')[0]
  const chance = pickChance(ctx, it) ?? 0.5
  it.state.picked = { ...(it.state.picked ?? {}), [ctx.self.id]: (it.state.picked?.[ctx.self.id] ?? 0) + 1 }
  if (!(i >= 0 && i < items.length)) return
  if (ctx.random() < chance) {
    const t = items[i], r = takeToken(ctx, t)
    if (!r.ok) { note(ctx, r.msg || "You can't carry that."); return }
    items.splice(i, 1); it.state.pockets = items.join(','); s.lootList = it.state.pockets
    note(ctx, `Lifted ${describe(t).name} from ${who}`)
    snd(ctx, 'loot-take-all-rustle', 0.25)
    s.xp = (s.xp ?? 0) + 8
    if (!items.length) closeLoot(ctx)
    return
  }
  closeLoot(ctx)
  caught(ctx, it, who)
}
function caught(ctx, it, who) {
  const s = ctx.self.state
  // caught: they spin round. the first time they shove you off with a warning; the second, they turn on you (creator's rule)
  const p = ctx.self.feetPosition, q = it.feetPosition
  it.rotation = { yaw: Math.atan2(-(p.x - q.x), -(p.z - q.z)) * 57.2958 }
  s.crouch = false
  const warned = it.state.warned?.[ctx.self.id]
  if (!warned) {
    it.state.warned = { ...(it.state.warned ?? {}), [ctx.self.id]: true }
    const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz) || 1
    ctx.self.velocity = { x: dx / d * 7, y: 2.5, z: dz / d * 7 } // the shove
    ctx.emit('cameraPunch', { direction: { x: dx / d, y: 0, z: dz / d }, intensity: 0.5 }, { audience: { player: ctx.self.id } })
    speak(ctx, it, it.state.voice ?? `${String(it.id).split('/').pop()}#${(it.state?.wear?.sex ?? it.state?.look?.sex) === 'f' ? 'f' : 'm'}`, WARN[Math.floor(ctx.random() * WARN.length)])
    note(ctx, `${who} caught you. Next time they fight.`)
    ctx.emit('screenShake', { intensity: 0.3, duration: 0.25 }, { audience: { player: ctx.self.id } })
    snd(ctx, 'ui-denied-click', 0.5)
    return
  }
  it.state.angry = { ...(it.state.angry ?? {}), [ctx.self.id]: true }
  const line = CAUGHT[Math.floor(ctx.random() * CAUGHT.length)]
  speak(ctx, it, it.state.voice ?? `${String(it.id).split('/').pop()}#${(it.state?.wear?.sex ?? it.state?.look?.sex) === 'f' ? 'f' : 'm'}`, line)
  note(ctx, `Caught again! ${who} turns on you.`)
  ctx.emit('screenShake', { intensity: 0.25, duration: 0.25 }, { audience: { player: ctx.self.id } })
  snd(ctx, 'ui-denied-click', 0.5)
}

function press(ctx) {
  const m = mem(ctx), s = ctx.self.state
  if (s.lootOpen) { closeLoot(ctx); return }
  if (s.sit) { standUp(ctx); m.key = ''; return }
  const f = m.focus
  if (!f) return
  const it = ctx.getObject(f.id)
  if (!it || it.state?.taken) return
  if (f.tag === 'npc' && pickChance(ctx, it) != null) { pickpocket(ctx, it); m.key = ''; refocus(ctx, true); return }
  if (f.tag === 'npc') { if (it.state?.dead) { if (it.state.items !== undefined) openLoot(ctx, it) } else if (it.state?.angry?.[ctx.self.id]) talk(ctx, it); else { openDialogue(ctx, it) } return } // the conversation card (scripts/talk.js); the old services sit on its buttons
  if (f.tag === 'usable' && it.state?.kind === 'computer') { // Back OS boots on the presser's own machine: their state, their screen
    const c = it.state, now = ctx.now()
    if (!s.os && now - (s.osClosedAt ?? 0) > 600) {
      s.os = { id: it.id, host: c.host, lock: c.unlocked ? '' : c.lock || '', user: c.unlocked ? 'admin' : 'guest', app: 'boot', at: now, term: [], sel: '' }
      heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-old-computer-boot-startup-chime.mp3', position: { ...it.feetPosition, y: (it.feetPosition?.y ?? 0) + 0.4 }, volume: 0.6, maxDistance: 10 }, { audience: { player: ctx.self.id } })
    }
    m.key = ''; return
  }
  if (f.tag === 'usable' && it.state?.kind === 'boilerdoor' && !it.state.open && !s.l5boilerKey && !ctx.query({ tags: ['npc'], radius: 60 }).some((q) => /harlan$/.test(q.id) && q.state?.follow === ctx.self.id) && (s.feetPosition?.x ?? ctx.self.feetPosition.x) < (it.worldFeetPosition?.x ?? 0) && (skillsOf(s).lockpick ?? 0) >= 25 && (s.bobbypins ?? 6) > 0) { startPick(ctx, it, 25, 'boiler'); m.key = ''; return } // no key: pick it (scripts/lockpick.js), else the door says what it wants
  if (f.tag === 'usable' && it.state?.kind === 'spamton') { if (!(s.keyItems ?? []).includes('spamton')) startSpamton(ctx); else note(ctx, 'Just trash now. Spamton rides in your pocket.'); m.key = ''; return }
  if (f.tag === 'usable' && it.tags?.includes?.('vehicle')) { // the rider seats itself (rider writes rider), the hull takes the wheel
    ctx.emit('press', { by: ctx.self.id }, { to: f.id })
    ctx.self.parent = f.id; ctx.self.feetPosition = { ...(it.state?.seat ?? { x: -0.48, y: 0.32, z: 0.25 }) }; ctx.self.rotation = { yaw: 0 }
    ctx.self.velocity = { x: 0, y: 0, z: 0 }; m.carAt = ctx.now(); m.key = ''; return
  }
  if (f.tag === 'usable' && it.state?.kind === 'salon') { s.salonOpen = true; s.salonTab = s.salonTab || 'hair'; s.wrMenu = false; s.wardrobeOpen = true; m.key = ''; return } // Glow Up Salon: its own makeover menu (scripts/salon-ui.js)
  if (f.tag === 'usable') { ctx.emit('press', { by: ctx.self.id }, { to: f.id }); if (it.tags?.includes?.('l5-elev-panel')) s.elevPanel = f.id; m.key = ''; return } // an elevator plate opens a clickable floor list (ui.js)
  if (f.tag === 'seat') { if (sitDown(ctx, it) && it.state?.boat) ctx.emit('press', { by: ctx.self.id }, { to: it.id }); m.key = ''; return } // a boat's seat also takes the oars
  if (f.tag === 'bench') { s.craftOpen = 'bench'; s.craftBench = f.id; return }
  if (f.tag === 'container') { openLoot(ctx, it); return }
  if (f.tag === 'door') { useDoor(ctx, it); m.key = ''; refocus(ctx, true); return }
  const r = takeToken(ctx, tokenOf(f.tag, it))
  if (r.ok) { it.state.taken = true; ctx.destroy(f.id); s.focus = null; m.key = ''; m.focus = null } else if (r.msg) { note(ctx, r.msg); snd(ctx, 'ui-denied-click', 0.35) }
}

// ownership (Shelly, Nov 8): a container near a resident is theirs. take from it while they can see you and they snatch it back
// and shove you off; do it again and they fight (the same warned/angry memory as pickpocketing). Crouched past 5 m, unseen.
const OWN_R = 9, SEE_R = 14
function ownerOf(ctx, c) {
  if (c.tags?.includes('rubble') || c.tags?.includes('npc') || c.state.dead || /^remains/i.test(c.state.name ?? '')) return null
  if (c.state.owner === undefined) { // decided once, the first time anyone opens it
    const q = c.feetPosition, near = ctx.query({ tags: ['npc'], center: q, radius: OWN_R }).find((n) => !n.state.dead && !n.state.hostile && n.state.name)
    c.state.owner = near?.id ?? ''; if (near) c.state.ownerName = String(near.state.name).split(' ·')[0]
  }
  if (!c.state.owner) return null
  const o = ctx.getObject(c.state.owner); if (!o || o.state.dead) return null
  return o
}
function watching(ctx, o) {
  const p = ctx.self.feetPosition, q = o.feetPosition, d = Math.hypot(p.x - q.x, p.z - q.z)
  if (d > SEE_R) return false
  if (ctx.self.state.crouch && d > 5) return false
  return true
}
// the loot menu's buttons: take one, take all, close
function lootAction(ctx, d) {
  const s = ctx.self.state
  if (!s.lootOpen) return
  if (d.k === 'close') { closeLoot(ctx); return }
  const c = ctx.getObject(s.lootOpen)
  if (!c) { closeLoot(ctx); return }
  if (s.pocket) { if (d.k === 'take') liftOne(ctx, c, Number(d.i)); else if (d.k === 'all') { note(ctx, 'One thing at a time, or they\'ll feel it.'); snd(ctx, 'ui-denied-click', 0.3) } return }
  if (d.k === 'store') { // into your own storage: one carried thing at a time
    if (!c.tags?.includes('storage')) return
    if (itemsOf(c.state?.items).length >= (c.state.cap ?? 30)) { note(ctx, 'It\'s full.'); snd(ctx, 'ui-denied-click', 0.35); return }
    const tok = pullToken(ctx, String(d.t || '')); if (!tok) return
    c.state.items = [c.state.items, tok].filter(Boolean).join(','); s.lootList = c.state.items
    if (c.state.saveKey) s[c.state.saveKey] = c.state.items // your home's storage rides your own save
    snd(ctx, 'gun-raise-cloth-rustle', 0.4); return
  }
  let items = itemsOf(c.state?.items), fail = ''
  const own = (d.k === 'take' || d.k === 'all') ? ownerOf(ctx, c) : null
  if (own && watching(ctx, own) && !own.state.angry?.[ctx.self.id]) {
    const who = c.state.ownerName ?? String(own.state.name ?? 'Someone').split(' ·')[0]
    if (!own.state.warned?.[ctx.self.id]) { // first time: it never reaches your bag
      closeLoot(ctx); note(ctx, `${who} snatches it back out of your hands.`); caught(ctx, own, who); return
    }
    caught(ctx, own, who) // second time: you get it, and they come for you
  }
  if (d.k === 'take') {
    const i = Number(d.i)
    if (!(i >= 0 && i < items.length)) return
    const r = takeToken(ctx, items[i])
    if (r.ok) items.splice(i, 1); else { fail = r.msg || ''; snd(ctx, 'ui-denied-click', 0.35) }
  } else if (d.k === 'all') {
    const keep = []
    for (const t of items) { const r = takeToken(ctx, t); if (!r.ok) { keep.push(t); fail = r.msg || fail } }
    items = keep
    snd(ctx, 'loot-take-all-rustle', 0.55)
  } else return
  if (!c.tags?.includes('rubble') && !c.tags?.includes('npc') && !c.tags?.includes('storage') && !c.state.dead && items.join(',') !== String(c.state.items ?? '')) { // a looted container fills again in an hour
    if (c.state.full == null) c.state.full = c.state.items ?? ''
    c.state.refillAt = ctx.now() + REFILL_MS
  }
  c.state.items = items.join(',')
  s.lootList = c.state.items
  if (c.tags?.includes('storage') && c.state.saveKey) s[c.state.saveKey] = c.state.items
  if (c.state.look && (c.primitive?.params || c.model)) { // a garment taken off a body comes off the body, now, on every screen, scripted or mesh
    const l = stripTo(c.state.look, items), pr = c.primitive?.params ?? c.state.wear ?? c.state.look
    if (SLOTS.some((k) => (pr[k] ?? 'none') !== l[k])) { const next = { ...pr, ...Object.fromEntries(SLOTS.map((k) => [k, l[k]])) }; rewear(ctx, c, next); if (!c.primitive) c.state.wear = next }
  }
  if (fail) note(ctx, fail)
  if (!items.length && c.tags?.includes('rubble')) { // emptied rubble crumbles away
    const p = c.feetPosition
    ctx.emit('fx', { position: { x: p.x, y: p.y + 0.2, z: p.z }, script: RUBBLE_DUST }, { audience: { nearby: p, radius: 40 } })
    snd(ctx, 'loot-take-all-rustle', 0.3)
    closeLoot(ctx)
    ctx.destroy(c.id)
  }
}
const RUBBLE_DUST = `fx
pop dust burst=10..14 on=disc(.5) life=.7..1.3 v=up(.3..0.8)+sdir()*.5 size=.25..0.45 acc=buoy(.3)+drag(1.5) col=<.72,.66,.52> a=0>.35:.3>.7:.15>0 sz=$size*(.6>1.8) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop bits burst=6..9 on=disc(.4) life=.5..0.8 v=up(1..2)+sdir()*1 size=.04..0.08 acc=grav() col=<.6,.55,.45> a=1 sz=$size floor=stick r=sprite(soft-disc,alpha)`

// the dory hands your keys back when you press E in it: you stand up out of the boat
export const ears = { boatOff: (ctx) => standUp(ctx) }
export function onInput(ctx, input) {
  const m = mem(ctx)
  const ray = getInputRay(ctx, input)
  if (ray) m.ray = ray
  if (input.pressed?.elevdo) { // the floor list: a floor, 'yes'/'no' for the deadly ones, '' to close
    const s = ctx.self.state, f = String(input.actionData?.elevdo?.f ?? ''), id = s.elevPanel
    if (id && f === 'yes') ctx.emit('ui:yes', { by: ctx.self.id }, { to: id })
    else if (id && f === 'no') ctx.emit('ui:no', { by: ctx.self.id }, { to: id })
    else if (id && f) { ctx.emit('ui:f' + f, { by: ctx.self.id }, { to: id }); if (['13', '66', '382'].includes(f)) { s.elevAsk = f; return } }
    s.elevPanel = null; s.elevAsk = null; return
  }
  { const s = ctx.self.state; if (s.elevPanel) { const pn = ctx.getObject(s.elevPanel)?.worldFeetPosition; if (!pn || Math.hypot(pn.x - ctx.self.feetPosition.x, pn.z - ctx.self.feetPosition.z) > 3) { s.elevPanel = null; s.elevAsk = null } } }
  const d = input.actionData?.loot
  if (input.pressed?.loot && d && typeof d.k === 'string') { lootAction(ctx, d); return }
  if (ctx.self.state.lootOpen && input.pressed?.reload) { lootAction(ctx, { k: 'all' }); return } // R takes everything, as in Fallout
  if (ctx.self.state.sit?.phase === 'sat' && (Math.abs(input.axes?.moveX ?? 0) > 0.3 || Math.abs(input.axes?.moveZ ?? 0) > 0.3 || input.pressed?.jump)) { standUp(ctx); return }
  refocus(ctx)
  if (input.pressed?.interact) press(ctx)
}

export function update(ctx, dt) {
  { // in a car the wheel went back (E inside, or the car let go): step out beside the driver's door
    const car = ctx.self.parent, mm = mem(ctx)
    if (car?.tags?.includes?.('vehicle') && car.controller !== ctx.self.id && ctx.now() - (mm.carAt ?? 0) > 1200) {
      const y = (car.rotation?.w !== undefined ? 2 * Math.atan2(car.rotation.y, car.rotation.w) : (car.rotation?.yaw ?? 0) * Math.PI / 180)
      const c = car.feetPosition, side = -1.9
      ctx.self.parent = null
      ctx.self.feetPosition = { x: c.x + Math.cos(y) * side, y: c.y + 0.2, z: c.z - Math.sin(y) * side }
      ctx.self.velocity = { x: 0, y: 0, z: 0 }
    }
  }
  if (ctx.self.isLocal !== false && ctx.now() - (ctx.self.session.wreckAt ?? 0) > 5000) { ctx.self.session.wreckAt = ctx.now(); try { regrowWrecks(ctx) } catch (e) { ctx.log('[wreck] ' + e) } } // smashed props near a player stand again after their hour
  const m = mem(ctx), s = ctx.self.state
  if (s.focus && ctx.getObject(s.focus.id)?.place !== ctx.self.place) { s.focus = null; m.focus = null; m.key = '' } // a prompt left behind in another level (or a thing gone) clears
  seatTick(ctx)
  { // the look outline: one thing at a time; the old one is cleared the moment the focus moves, loot opens or the level changes
    const want = (s.level == null || s.lootOpen || s.sit) ? null : (m.focus?.id ?? null)
    if (m.lit && m.lit !== want) { ctx.emit('highlightClear', { target: m.lit }, { audience: { player: ctx.self.id } }); m.lit = null }
    if (want && m.lit !== want) { m.lit = want; m.litAt = 0 }
  }
  if (s.level == null) return
  m.acc += dt
  if (m.acc < 0.2) return
  m.acc = 0
  if (s.lootOpen) { // walk away and it closes; if it was destroyed it closes too
    const c = ctx.getObject(s.lootOpen), p = ctx.self.feetPosition
    if (!c || Math.hypot(c.feetPosition.x - p.x, c.feetPosition.z - p.z) > OPEN_RANGE) closeLoot(ctx)
    return
  }
  refocus(ctx, true) // a standing player with the mouse still: the world changed under the look ray
  if (m.lit && m.lit === m.focus?.id) ctx.emit('highlightSet', { target: m.lit, color: '#fff0b0', style: 'outline', duration: 0.45, width: 3 }, { audience: { player: ctx.self.id } })
}
