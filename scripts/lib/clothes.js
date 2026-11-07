// Clothing as loot and armor: the garments a critter wears (player.state.look, an NPC's state.look / critter params)
// as item tokens "cloth:<slot>:<kind>:<hex>", their DR, and the swaps. Data: scripts/lib/data/clothes.yml.
// Pure functions: scripts/lib/items.js names them, scripts/lib/loot.js rolls them, scripts/player.js equips them,
// scripts/lib/stats.js turns worn DR into less damage, scripts/critter.js keeps the wardrobe honest.
import CL from './data/clothes.yml'
import C from './data/critter.yml'

export const SLOTS = ['topw', 'botw', 'shoes', 'hat', 'eyew', 'neck']
export const SLOT_NAME = { topw: 'Top', botw: 'Bottom', shoes: 'Shoes', hat: 'Hat', eyew: 'Eyewear', neck: 'Neck' }
const LEGACY = { tee: ['tee', 'pants'], hoodie: ['hoodie', 'pants'], sweater: ['sweater', 'pants'], jacket: ['jacket', 'pants'], overalls: ['tee', 'overalls'], apron: ['apron', 'pants'], pajamas: ['pajamas', 'pjpants'], skirt: ['tee', 'skirt'], dress: ['dress', 'none'], none: ['none', 'none'] }
const hex = (c) => String(c || '').replace('#', '').toLowerCase().slice(0, 6) || '000000'

// a look with every slot and colour filled in, as scripts/critter2-geo.js reads it
export function fullLook(look) {
  const s = look || {}, l = { ...C.default, ...s }
  if (s.outfit && !s.topw) { const m = LEGACY[s.outfit] || LEGACY.tee; l.topw = m[0]; l.botw = m[1] }
  if (s.acc && !s.hat && !s.eyew && !s.neck) { if (C.hat.includes(s.acc)) l.hat = s.acc; else if (C.eyew.includes(s.acc)) l.eyew = s.acc; else if (C.neck.includes(s.acc)) l.neck = s.acc }
  if (!s.hatc) l.hatc = l.top
  delete l.outfit; delete l.acc
  return l
}
// the table row for a garment: a strict row (M.E.G. lime) wins when its colour matches
export function rowOf(slot, kind, colour) {
  if (!kind || kind === 'none') return null
  const c = hex(colour)
  return CL.rows.find((r) => r.slot === slot && r.kind === kind && r.strict && r.colours.includes(c))
    ?? CL.rows.find((r) => r.slot === slot && r.kind === kind && !r.strict) ?? null
}
const ALIAS = { top: 'topw', bottom: 'botw', shoe: 'shoes', shoec: 'shoes', hatc: 'hat', neckc: 'neck' }
export function parseCloth(token) {
  const [t, s0, kind, c] = String(token).split(':')
  const slot = ALIAS[s0] ?? s0 // 'cloth:top:…' and 'cloth:topw:…' are the same garment
  if (t !== 'cloth' || !SLOTS.includes(slot) || !kind) return null
  const row = rowOf(slot, kind, c)
  return row ? { slot, kind, colour: hex(c), row } : null
}
const colourOf = (l, slot) => (CL.colourKey[slot] ? hex(l[CL.colourKey[slot]]) : '000000')
export const clothToken = (slot, kind, colour) => `cloth:${slot}:${kind}:${hex(colour)}`
// every garment a critter wears, as tokens (unknown kinds, like a bare 'shirt', are skipped)
export function wornTokens(look) {
  const l = fullLook(look), out = []
  for (const slot of SLOTS) { const k = l[slot]; if (k && k !== 'none' && rowOf(slot, k, colourOf(l, slot))) out.push(clothToken(slot, k, colourOf(l, slot))) }
  return out
}
// total damage resistance of what's worn
export function wornDR(look) {
  if (!look) return 0
  const l = fullLook(look); let dr = 0
  for (const slot of SLOTS) dr += rowOf(slot, l[slot], colourOf(l, slot))?.dr ?? 0
  return dr
}
// the damage that gets through: Fallout NV threshold, a hit always keeps `floor` of itself and at least 1
export const armorFloor = CL.floor
export function afterDR(dr, dmg) { return dmg <= 0 ? dmg : Math.max(1, Math.ceil(dmg * CL.floor), Math.round(dmg - dr)) }

// put a garment on: { look, back } where back is the token of what came off (null if the slot was bare)
export function wear(look, token) {
  const p = parseCloth(token); if (!p) return null
  const l = fullLook(look), old = l[p.slot] && l[p.slot] !== 'none' && rowOf(p.slot, l[p.slot], colourOf(l, p.slot)) ? clothToken(p.slot, l[p.slot], colourOf(l, p.slot)) : null
  const next = { ...l, [p.slot]: p.kind }
  if (CL.colourKey[p.slot]) next[CL.colourKey[p.slot]] = '#' + p.colour
  if (p.slot === 'topw' && p.kind === 'dress') next.botw = 'none' // a dress is the whole outfit
  return { look: next, back: old, extra: p.slot === 'topw' && p.kind === 'dress' && l.botw !== 'none' && rowOf('botw', l.botw, l.bottom) ? clothToken('botw', l.botw, l.bottom) : null }
}
// take a garment off: { look, back }
export function takeOff(look, slot) {
  const l = fullLook(look)
  if (!SLOTS.includes(slot) || !l[slot] || l[slot] === 'none') return null
  const back = rowOf(slot, l[slot], colourOf(l, slot)) ? clothToken(slot, l[slot], colourOf(l, slot)) : null
  return { look: { ...l, [slot]: 'none' }, back }
}
// a body's look after some of its garments were taken: any worn token not left in `items` comes off
export function stripTo(look, items) {
  const l = fullLook(look), left = [...items]
  for (const slot of SLOTS) {
    const k = l[slot]; if (!k || k === 'none' || !rowOf(slot, k, colourOf(l, slot))) continue
    const i = left.indexOf(clothToken(slot, k, colourOf(l, slot)))
    if (i >= 0) left.splice(i, 1); else l[slot] = 'none'
  }
  return l
}
// the wardrobe may restyle, never conjure armor: a slot that would gain DR over what's worn (and isn't the plain set) stays as it was
export function honest(cur, next) {
  const a = fullLook(cur), b = { ...fullLook(next) }
  for (const slot of SLOTS) {
    const r0 = rowOf(slot, a[slot], colourOf(a, slot)), r1 = rowOf(slot, b[slot], colourOf(b, slot))
    const same = r0 && r1 && r0.id === r1.id
    if (r1 && !r1.regular && !same) { b[slot] = a[slot]; if (CL.colourKey[slot]) b[CL.colourKey[slot]] = a[CL.colourKey[slot]] }
  }
  return b
}

// the level a roll is for: a player's own level, else the place's tier (a drop with nobody behind it)
export function rollLevel(ctx) {
  const lv = Number(ctx?.self?.state?.level) || 0, tier = CL.leveled.placeTier[ctx?.self?.place] ?? 1
  return Math.max(lv, tier)
}
const rowLevel = (r) => Math.max(r.level ?? 1, CL.leveled.rarityAt[r.rarity] ?? 1)
// the leveled list at a level: every row it can roll, each with its weight
export function leveledRows(level, filter = () => true) {
  return CL.rows.filter((r) => filter(r) && rowLevel(r) <= level).map((r) => [r, (CL.rarity[r.rarity]?.weight ?? 1) * (r.rarity === 'common' ? 1 : 1 + CL.leveled.lift * (level - rowLevel(r)))])
}
const pickW = (list, u) => { let x = u * list.reduce((a, [, w]) => a + w, 0); for (const [r, w] of list) { x -= w; if (x <= 0) return r } return list[list.length - 1]?.[0] }
// a random garment off the leveled list (a find in a crate or on remains); regular: true rolls only the plain set
export function rollCloth(ctx, regular = false, level) {
  const lv = level ?? rollLevel(ctx)
  const here = ctx?.self?.place, inHotel = here === 'level5'
  const list = leveledRows(regular ? 1 : lv, (r) => (r.places ? r.places.includes(here) && !regular : regular ? r.regular : true))
  if (inHotel && !regular && ctx.random() < 0.6) { const h = list.filter(([r]) => r.places); if (h.length) { const row = pickW(h, ctx.random()); return clothToken(row.slot, row.kind, row.colours[Math.floor(ctx.random() * row.colours.length)]) } } // the hotel mostly turns up its own wardrobe
  const row = pickW(list, ctx.random()) ?? CL.rows[0]
  return clothToken(row.slot, row.kind, row.colours[Math.floor(ctx.random() * row.colours.length)])
}
// an NPC dressed from its faction's leveled list, the same every time for the same id: species, fur, face and a signature
// agency top (the M.E.G. lime) stay; everything else is rolled from what that faction wears at that level
export function npcLook(id, look, faction, level) {
  const F = CL.leveled.factions[faction] ?? CL.leveled.factions.wanderer
  let h = 2166136261; for (const c of String(id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  const u = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
  const base = fullLook(look), l = { ...base }
  const keepTop = rowOf('topw', base.topw, base.top)?.rarity === 'agency'
  for (const slot of SLOTS) {
    if (slot === 'topw' && keepTop) continue
    const extra = F.extra?.[slot]
    if (extra !== undefined && u() > extra) { l[slot] = 'none'; continue }
    const list = leveledRows(level, (r) => r.slot === slot && F.rows.includes(r.id))
    if (!list.length) continue
    const row = pickW(list, u())
    l[slot] = row.kind; if (CL.colourKey[slot]) l[CL.colourKey[slot]] = '#' + row.colours[Math.floor(u() * row.colours.length)]
  }
  if (l.topw === 'dress') l.botw = 'none'
  return l
}
// a fresh critter's plain clothes: a regular top, bottom and shoes, nothing else
export function plainLook(ctx, cur) {
  const l = { ...cur, hat: 'none', eyew: 'none', neck: 'none' }, pick = (a) => a[Math.floor(ctx.random() * a.length)]
  for (const slot of ['topw', 'botw', 'shoes']) {
    const row = pick(CL.rows.filter((r) => r.regular && r.slot === slot && (slot !== 'topw' || r.kind !== 'tank')))
    l[slot] = row.kind; l[CL.colourKey[slot]] = '#' + pick(CL.regularColours)
  }
  return l
}
export const CLOTHES = CL
