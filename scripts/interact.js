// Fallout-style looting. Nothing is picked up by walking over it any more: look at an item and the HUD
// names it ("[E] Take  Pipe scrap"), press E to take it. Crates and the remains of what you kill are
// containers: look at one, press E, and a loot menu lists what is inside (take one thing, take all,
// or close it). The looked-at thing glows. scripts/player.js applies the items (takeToken);
// scripts/loot-ui.js draws the prompt and the menu from player.state (focus, lootOpen, lootList, notice).
import { getInputRay, raycast } from 'builtin/physics'
import { tokenOf, describe, itemsOf } from './lib/items.js'
import { takeToken, maxHp, maxSan } from './player.js'
import { derived } from './lib/stats.js'
import { rollItem, rollItemL1 } from './lib/loot.js'

const KINDS = ['almond', 'weapon', 'ammo', 'shells', 'container', 'npc'] // what can be looked at and used
const REACH = 3.0 // metres from the eye
const OPEN_RANGE = 4.5 // a container you walk away from closes
const mem = (ctx) => (ctx.self.session.interact ??= { ray: null, last: -1e9, acc: 0, key: '', focus: null, hl: 0 })
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
function snd(ctx, name, volume = 0.6) {
  const p = ctx.self.feetPosition
  ctx.emit('playSound', { clip: SND(name), position: { x: p.x, y: p.y + 1.2, z: p.z }, volume, maxDistance: 12 }, { audience: { player: ctx.self.id } })
}
function note(ctx, text) { ctx.self.state.notice = { text, at: ctx.now() } }

// the thing in the middle of the screen, if any: close enough, nearly on the look ray, with nothing solid between
function findFocus(ctx, ray) {
  const o = ray.origin, d = ray.direction
  let best = null, bestAng = 1e9
  for (const tag of KINDS) {
    const big = tag === 'container' || tag === 'npc'
    for (const it of ctx.query({ tags: [tag], radius: REACH + 1 })) {
      if (it.state?.taken) continue
      const p = it.feetPosition, vx = p.x - o.x, vy = p.y + (big ? 0.28 : 0.1) - o.y, vz = p.z - o.z
      const dist = Math.hypot(vx, vy, vz)
      if (dist > REACH || dist < 0.05) continue
      const ang = Math.acos(Math.max(-1, Math.min(1, (vx * d.x + vy * d.y + vz * d.z) / dist)))
      if (ang > Math.max(0.075, Math.atan((big ? 0.55 : 0.3) / dist)) || ang >= bestAng) continue
      if (raycast(ctx, o, { x: vx / dist, y: vy / dist, z: vz / dist }, { distance: dist - 0.05, physicsOnly: true, ignoreEntities: [it.id, ctx.self.id], bodies: 'static' })) continue
      best = { id: it.id, tag }; bestAng = ang
    }
  }
  return best
}

// write the focus to player.state only when it changes (the HUD reads it)
function refocus(ctx, force = false) {
  const m = mem(ctx), s = ctx.self.state, now = ctx.now()
  if (!m.ray || (!force && now - m.last < 70)) return
  m.last = now
  if (s.lootOpen) { if (s.focus) s.focus = null; m.focus = null; return }
  const f = findFocus(ctx, m.ray)
  m.focus = f
  let info = null
  if (f) {
    const it = ctx.getObject(f.id)
    if (it) {
      if (f.tag === 'npc') {
        info = { id: f.id, name: it.state?.name ?? 'Stranger', info: 'M.E.G.', verb: 'Talk', color: '#c6f060' }
      } else if (f.tag === 'container') {
        const n = itemsOf(it.state?.items).length
        info = { id: f.id, name: it.state?.name ?? 'Container', info: n ? `${n} item${n > 1 ? 's' : ''}` : 'empty', verb: 'Search', color: '#d9d3b8' }
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
  s.lootOpen = ''; s.lootList = ''; s.lootName = ''
  mem(ctx).key = ''
}

function openLoot(ctx, c) {
  const s = ctx.self.state
  if (!c.state.scavved && c.state.items !== undefined) { // Scavenge and Luck: a chance of one extra find, once per container
    c.state.scavved = true
    if (ctx.random() < derived(s).scav) c.state.items = [c.state.items, (ctx.self.place === 'level1' ? rollItemL1(ctx) : rollItem(ctx))].filter(Boolean).join(',')
  }
  s.lootOpen = c.id; s.lootName = c.state?.name ?? 'Container'; s.lootList = c.state?.items ?? ''; s.focus = null
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
const VO = (who, line) => `/cdn/voice-meg-${who}-saying-${line.replace(/[^a-z ]/gi, '').trim().toLowerCase().replace(/ +/g, '-')}.mp3`
function speak(ctx, it, who, line) {
  note(ctx, `${it.state.name.split(' ·')[0]}: "${line}"`)
  const p = it.feetPosition
  ctx.emit('playSound', { clip: VO(who, line), position: { x: p.x, y: p.y + 1.6, z: p.z }, volume: 0.9, maxDistance: 14 }, { audience: { player: ctx.self.id } })
}
function talk(ctx, it) {
  const s = ctx.self.state, now = ctx.now(), role = it.state?.role
  if (role === 'scout') { s.megTip = ((s.megTip ?? -1) + 1) % TIPS.length; speak(ctx, it, 'ale', TIPS[s.megTip]); return }
  if (role === 'medic') {
    if (now - (s.megMedAt ?? -1e9) < 90000) { speak(ctx, it, 'ortiz', "you're patched. give it a minute and come back."); return }
    s.megMedAt = now; s.hp = maxHp(s.level ?? 1, s); s.sanity = Math.max(s.sanity ?? 0, maxSan(s.level ?? 1, s))
    speak(ctx, it, 'ortiz', "hold still. there. you're good to walk."); snd(ctx, 'bandage-wrap-cloth', 0.6); return
  }
  if (role === 'quarter') {
    if (now - (s.megQmAt ?? -1e9) < 180000) { speak(ctx, it, 'callum', "rations are counted. come back after the next patrol."); return }
    s.megQmAt = now; takeToken(ctx, 'almond'); takeToken(ctx, 'almond'); takeToken(ctx, 'ration')
    speak(ctx, it, 'callum', "two almond waters and a ration. don't waste them."); return
  }
}

function press(ctx) {
  const m = mem(ctx), s = ctx.self.state
  if (s.lootOpen) { closeLoot(ctx); return }
  const f = m.focus
  if (!f) return
  const it = ctx.getObject(f.id)
  if (!it || it.state?.taken) return
  if (f.tag === 'npc') { talk(ctx, it); return }
  if (f.tag === 'container') { openLoot(ctx, it); return }
  const r = takeToken(ctx, tokenOf(f.tag, it))
  if (r.ok) { it.state.taken = true; ctx.destroy(f.id); s.focus = null; m.key = ''; m.focus = null } else if (r.msg) { note(ctx, r.msg); snd(ctx, 'ui-denied-click', 0.35) }
}

// the loot menu's buttons: take one, take all, close
function lootAction(ctx, d) {
  const s = ctx.self.state
  if (!s.lootOpen) return
  if (d.k === 'close') { closeLoot(ctx); return }
  const c = ctx.getObject(s.lootOpen)
  if (!c) { closeLoot(ctx); return }
  let items = itemsOf(c.state?.items), fail = ''
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
  c.state.items = items.join(',')
  s.lootList = c.state.items
  if (fail) note(ctx, fail)
}

export function onInput(ctx, input) {
  const m = mem(ctx)
  const ray = getInputRay(ctx, input)
  if (ray) m.ray = ray
  const d = input.actionData?.loot
  if (input.pressed?.loot && d && typeof d.k === 'string') { lootAction(ctx, d); return }
  if (ctx.self.state.lootOpen && input.pressed?.reload) { lootAction(ctx, { k: 'all' }); return } // R takes everything, as in Fallout
  refocus(ctx)
  if (input.pressed?.interact) press(ctx)
}

export function update(ctx, dt) {
  const m = mem(ctx), s = ctx.self.state
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
  if (m.focus) ctx.emit('highlightSet', { target: m.focus.id, color: '#fff0b0', style: 'outline', duration: 0.45, width: 3 }, { audience: { player: ctx.self.id } })
}
