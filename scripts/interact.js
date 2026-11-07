// Fallout-style looting. Nothing is picked up by walking over it any more: look at an item and the HUD
// names it ("[E] Take  Pipe scrap"), press E to take it. Crates and the remains of what you kill are
// containers: look at one, press E, and a loot menu lists what is inside (take one thing, take all,
// or close it). The looked-at thing glows. scripts/player.js applies the items (takeToken);
// scripts/loot-ui.js draws the prompt and the menu from player.state (focus, lootOpen, lootList, notice).
import { getInputRay, raycast } from 'builtin/physics'
import { tokenOf, describe, itemsOf } from './lib/items.js'
import { takeToken } from './player.js'

const KINDS = ['almond', 'weapon', 'ammo', 'shells', 'container'] // what can be looked at and used
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
    const big = tag === 'container'
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
      if (f.tag === 'container') {
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
  if (c && c.tags?.includes('remains') && !itemsOf(c.state?.items).length) ctx.destroy(c.id) // an emptied corpse is cleared away
  s.lootOpen = ''; s.lootList = ''; s.lootName = ''
  mem(ctx).key = ''
}

function openLoot(ctx, c) {
  const s = ctx.self.state
  s.lootOpen = c.id; s.lootName = c.state?.name ?? 'Container'; s.lootList = c.state?.items ?? ''; s.focus = null
  snd(ctx, 'container-open-rustle', 0.5)
}

function press(ctx) {
  const m = mem(ctx), s = ctx.self.state
  if (s.lootOpen) { closeLoot(ctx); return }
  const f = m.focus
  if (!f) return
  const it = ctx.getObject(f.id)
  if (!it || it.state?.taken) return
  if (f.tag === 'container') { openLoot(ctx, it); return }
  const r = takeToken(ctx, tokenOf(f.tag, it))
  if (r.ok) { it.state.taken = true; ctx.destroy(f.id); s.focus = null; m.key = ''; m.focus = null } else if (r.msg) note(ctx, r.msg)
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
    if (r.ok) items.splice(i, 1); else fail = r.msg || ''
  } else if (d.k === 'all') {
    const keep = []
    for (const t of items) { const r = takeToken(ctx, t); if (!r.ok) { keep.push(t); fail = r.msg || fail } }
    items = keep
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
