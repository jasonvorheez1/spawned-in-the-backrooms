// Clothing as loot and armor: the garments a critter wears (player.state.look, an NPC's state.look / critter params)
// as item tokens "cloth:<slot>:<kind>:<hex>", their DR, and the swaps. Data: scripts/lib/data/clothes.yml.
// Pure functions: scripts/lib/items.js names them, scripts/lib/loot.js rolls them, scripts/player.js equips them,
// scripts/lib/stats.js turns worn DR into less damage, scripts/critter.js keeps the wardrobe honest.
import CL from './data/clothes.yml'
import C from './data/critter.yml'
import { drMul, armorCnd } from './condition.js'
import { mitigated } from './combat.js'

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
// a garment's fabric (data patKey/pats): the row's own list, the first its usual one; anything else reads as that first
export const patsOf = (row) => row?.pats ?? []
export const patOk = (row, pat) => patsOf(row).includes(pat) ? pat : (patsOf(row)[0] ?? null)
const patOf = (l, slot, row) => patOk(row, CL.patKey?.[slot] ? l[CL.patKey[slot]] : null)
const ALIAS = { top: 'topw', bottom: 'botw', shoe: 'shoes', shoec: 'shoes', hatc: 'hat', neckc: 'neck' }
export function parseCloth(token) {
  const [t, s0, kind, c, pt] = String(token).split(':')
  const slot = ALIAS[s0] ?? s0 // 'cloth:top:…' and 'cloth:topw:…' are the same garment
  if (t !== 'cloth' || !SLOTS.includes(slot) || !kind) return null
  const row = rowOf(slot, kind, c)
  return row ? { slot, kind, colour: hex(c), row, pat: patOk(row, pt) } : null
}
// one spelling per garment, so a bag and a body compare tokens alike (old 4-part tokens read as the usual fabric)
export const normToken = (token) => { const p = parseCloth(token); return p ? clothToken(p.slot, p.kind, p.colour, p.pat) : token }
const colourOf = (l, slot) => (CL.colourKey[slot] ? hex(l[CL.colourKey[slot]]) : '000000')
export function clothToken(slot, kind, colour, pat) {
  const row = rowOf(slot, kind, colour), pt = pat && row ? patOk(row, pat) : null
  return `cloth:${slot}:${kind}:${hex(colour)}` + (pt && pt !== patsOf(row)[0] ? ':' + pt : '')
}
const tokOf = (l, slot) => { const c = colourOf(l, slot), row = rowOf(slot, l[slot], c); return row ? clothToken(slot, l[slot], c, patOf(l, slot, row)) : null }
// every garment a critter wears, as tokens (unknown kinds, like a bare 'shirt', are skipped)
export function wornTokens(look) {
  const l = fullLook(look), out = []
  for (const slot of SLOTS) { const k = l[slot]; if (k && k !== 'none') { const t = tokOf(l, slot); if (t) out.push(t) } }
  return out
}
// total damage resistance of what's worn
export function wornDR(look) {
  if (!look) return 0
  const l = fullLook(look); let dr = 0
  for (const slot of SLOTS) { const row = rowOf(slot, l[slot], colourOf(l, slot)); if (!row) continue; dr += row.dr * (look.cnd ? drMul(armorCnd(look, tokOf(l, slot))) : 1) } // a worn-down piece gives less (lib/condition.js)
  return Math.round(Math.min(dr, CL.drCap ?? 99) * 10) / 10
}
// each worn garment with its slot, DR and condition, for wear and the inventory
export function wornRows(look) {
  if (!look) return []
  const l = fullLook(look), out = []
  for (const slot of SLOTS) { const row = rowOf(slot, l[slot], colourOf(l, slot)); if (row) { const token = tokOf(l, slot); out.push({ token, slot, dr: row.dr, cnd: armorCnd(look, token) }) } }
  return out
}
// the damage that gets through: Fallout NV threshold, a hit always keeps `floor` of itself and at least 1
export const armorFloor = CL.floor
// the damage that gets through armor: a share that grows with DR and shrinks as the hit grows, after the hit's armor penetration (scripts/lib/combat.js)
export function afterDR(dr, dmg, pen = 0) { return mitigated(dr, dmg, pen) }

// put a garment on: { look, back } where back is the token of what came off (null if the slot was bare)
export function wear(look, token) {
  const p = parseCloth(token); if (!p) return null
  const l = fullLook(look), old = l[p.slot] && l[p.slot] !== 'none' ? tokOf(l, p.slot) : null
  const next = { ...l, [p.slot]: p.kind }
  if (CL.colourKey[p.slot]) next[CL.colourKey[p.slot]] = '#' + p.colour
  if (CL.patKey?.[p.slot]) next[CL.patKey[p.slot]] = p.pat ?? ''
  if (p.slot === 'topw' && p.kind === 'dress') next.botw = 'none' // a dress is the whole outfit
  return { look: next, back: old, extra: p.slot === 'topw' && p.kind === 'dress' && l.botw !== 'none' && rowOf('botw', l.botw, l.bottom) ? tokOf(l, 'botw') : null }
}
// take a garment off: { look, back }
export function takeOff(look, slot) {
  const l = fullLook(look)
  if (!SLOTS.includes(slot) || !l[slot] || l[slot] === 'none') return null
  const back = tokOf(l, slot)
  return { look: { ...l, [slot]: 'none' }, back }
}
// a body's look after some of its garments were taken: any worn token not left in `items` comes off
export function stripTo(look, items) {
  const l = fullLook(look), left = items.map(normToken)
  for (const slot of SLOTS) {
    const k = l[slot]; if (!k || k === 'none' || !rowOf(slot, k, colourOf(l, slot))) continue
    const i = left.indexOf(tokOf(l, slot))
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
    // hats, glasses and neckwear that are only dress-up (scarf, cape, bow tie, bell, hair bow...) are free to wear in the creator; armour, crafted and place-bound gear stays earned
    const free = r1 && !r1.strict && !r1.crafted && !r1.places && (slot === 'hat' || slot === 'eyew' || slot === 'neck')
    if (r1 && !r1.regular && !same && !free) { b[slot] = a[slot]; if (CL.colourKey[slot]) b[CL.colourKey[slot]] = a[CL.colourKey[slot]]; if (CL.patKey?.[slot]) b[CL.patKey[slot]] = a[CL.patKey[slot]] }
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
const pickPat = (row, u, lean) => { const ps = patsOf(row); if (!ps.length) return null; const fav = lean ? ps.filter((x) => lean.includes(x)) : []; return fav.length && u() < 0.6 ? fav[Math.floor(u() * fav.length)] : ps[Math.floor(u() * ps.length)] }
const pickW = (list, u) => { let x = u * list.reduce((a, [, w]) => a + w, 0); for (const [r, w] of list) { x -= w; if (x <= 0) return r } return list[list.length - 1]?.[0] }
// a random garment off the leveled list (a find in a crate or on remains); regular: true rolls only the plain set
export function rollCloth(ctx, regular = false, level) {
  const lv = level ?? rollLevel(ctx)
  const here = ctx?.self?.place, inSpecial = here === 'level5' || here === 'level7'
  const list = leveledRows(regular ? 1 : lv, (r) => (r.places ? r.places.includes(here) && !regular : regular ? r.regular : true))
  if (inSpecial && !regular && ctx.random() < 0.65) { const h = list.filter(([r]) => r.places); if (h.length) { const row = pickW(h, ctx.random()); return clothToken(row.slot, row.kind, row.colours[Math.floor(ctx.random() * row.colours.length)], pickPat(row, () => ctx.random())) } } // Level 5 & Level 7 mostly turn up their own wardrobe
  const row = pickW(list, ctx.random()) ?? CL.rows[0]
  return clothToken(row.slot, row.kind, row.colours[Math.floor(ctx.random() * row.colours.length)], pickPat(row, () => ctx.random()))
}
// an NPC dressed from its faction's leveled list, the same every time for the same id: species, fur, face and a signature
// agency top (the M.E.G. lime) stay; everything else is rolled from what that faction wears at that level
const hashOf = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const NEWSP = ['rat', 'squirrel', 'leopard', 'jackal', 'badger', 'ferret', 'beaver', 'capybara', 'lop', 'fennec'].filter((k) => C.species.includes(k))
const OLDSP = C.species.filter((k) => !NEWSP.includes(k))
const speciesFor = (id) => (NEWSP.length && hashOf(id + ':sp2') % 100 < 34 ? NEWSP[hashOf(id + ':sp3') % NEWSP.length] : OLDSP[hashOf(id + ':sp') % OLDSP.length])

// bump NPC_GEN to reroll every NPC's clothes, fur, body and face at once (sex and species stay: stories and pronouns name them)
export const NPC_GEN = 'g2'
// an NPC's outfit reads as chosen: one accent colour it likes, the rest neutrals (Savi's picks)
const NEUTRAL = ['2b2b33', '3a3a40', '4a4a52', 'f4f1ea', '8a8278', '5a4a3a', '1f2a3a', 'c8bca8', '6a6a72', '3a3020']
export function npcLook(id, look, faction, level, role) {
  const sid = String(id) + '|' + NPC_GEN
  const F = CL.leveled.factions[faction] ?? CL.leveled.factions.wanderer
  const J = F.rows.length ? (CL.leveled.roles?.[role] ?? CL.leveled.roles?.[faction]) : null // a job's wardrobe (bespoke factions keep their own clothes)
  let h = 2166136261; for (const c of sid) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  const h0 = h >>> 0
  const u = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
  const base = fullLook(look), l = { ...base }
  const accent = DYES[(h0 >>> 3) % DYES.length], neutral = () => NEUTRAL[Math.floor(u() * NEUTRAL.length)]

  // If look did not specify sex, roll 50/50 from seed so we don't end up with 100% male NPCs
  if (!look?.sex) l.sex = (hashOf(id + ':sex') % 100 < 50) ? 'f' : 'm'

  // If look did not specify species, roll across all 30 species so we don't end up with 100% cats
  if (!look?.species) l.species = speciesFor(id)

  l.role = role || (['guard', 'medic', 'trader', 'scout', 'quarter', 'scavenger', 'clerk', 'captain', 'keeper', 'psychic', 'pilgrim'].includes(faction) ? faction : (look?.role ?? 'survivor'))
  l.faction = faction || (look?.faction ?? 'wanderer')

  const keepTop = rowOf('topw', base.topw, base.top)?.rarity === 'agency'
  const keepClothes = look?.clothesOwn || look?.wearOwn

  for (const slot of SLOTS) {
    if (keepClothes) continue
    // If look explicitly provided an authored garment for this slot, preserve it
    if (look && look[slot] !== undefined && look[slot] !== 'none') continue
    if (slot === 'topw' && keepTop) continue
    const extra = J?.extra?.[slot] ?? F.extra?.[slot]
    if (extra !== undefined && u() > extra) { l[slot] = 'none'; continue }
    const jl = J ? leveledRows(Math.max(level, 14), (r) => r.slot === slot && J.rows.includes(r.id) && !r.places) : []
    const list = jl.length ? jl : leveledRows(level, (r) => r.slot === slot && F.rows.includes(r.id))
    if (!list.length) { if (CL.patKey[slot] && l[slot] && l[slot] !== 'none') { const r0 = rowOf(slot, l[slot], l[CL.colourKey[slot]]); if (r0 && !l[CL.patKey[slot]]) l[CL.patKey[slot]] = pickPat(r0, u) ?? '' } continue }
    const row = pickW(list, u())
    l[slot] = row.kind; if (CL.colourKey[slot]) { const cu = u(), own = row.colours[Math.floor(u() * row.colours.length)] // the top wears the accent, legs and feet go neutral, small pieces echo the accent now and then
      l[CL.colourKey[slot]] = '#' + (row.strict ? own : slot === 'topw' ? (cu < 0.6 ? accent : own) : (slot === 'botw' || slot === 'shoes') ? (cu < 0.65 ? neutral() : own) : (cu < 0.35 ? accent : own)) }: colour variety (Shelly)
    if (CL.patKey[slot]) l[CL.patKey[slot]] = pickPat(row, u, J?.pats) ?? ''
  }
  if (l.topw === 'dress') l.botw = 'none'
  if (F.rows.length && l.neck === 'none' && !look?.neck && u() < 0.24) { // some NPCs just wear a scarf, a cape, a bow tie or a bell collar, whatever the faction's list says
    const row = CL.rows.find((r) => r.id === ['scarf', 'cape', 'cape', 'bowtie', 'bell', 'cape'][Math.floor(u() * 6)])
    if (row) { l.neck = row.kind; l.neckc = '#' + row.colours[Math.floor(u() * row.colours.length)] }
  }
  if (!look?.bodyOwn) bodyRoll(sid, l, look) // a fresh body per NPC: fur, markings, height, build, proportions (species and sex stay: their stories name them)
  l.fseed = h0 // the face (scripts/lib/critter-model.js faceFill) rolls from the id, so it never changes with the clothes
  if (!look?.trait) l.trait = '' // fullLook gave the player default; an NPC rolls its own
  return l
}
// a fresh critter's plain clothes: a regular top, bottom and shoes, nothing else
export function plainLook(ctx, cur) {
  const l = { ...cur, hat: 'none', eyew: 'none', neck: 'none' }, pick = (a) => a[Math.floor(ctx.random() * a.length)]
  for (const slot of ['topw', 'botw', 'shoes']) {
    const row = pick(CL.rows.filter((r) => r.regular && r.slot === slot && (slot !== 'topw' || r.kind !== 'tank')))
    l[slot] = row.kind; l[CL.colourKey[slot]] = '#' + pick(CL.regularColours)
    l[CL.patKey[slot]] = pickPat(row, () => ctx.random()) ?? ''
  }
  return l
}
export const CLOTHES = CL

// an NPC's body from its id alone, so it is the same every spawn and nobody shares one. Savi's picks: mostly natural coats, now and then a pastel one
const NATURAL = { cat: ['f2a65a', 'c98b55', '3b3440', 'f4efe9', 'b9b3c2', '9a6440'], dog: ['c98b55', '9a6440', 'f4efe9', '3b3440', 'e0c090'], fox: ['f07a2e', 'd8602a', 'b9b3c2', 'f4efe9'], bunny: ['f4efe9', 'b9b3c2', 'c98b55', 'e8d8c8', '9a8478'],
  bear: ['9a6440', '6a4630', '3b3440', 'c98b55'], deer: ['c98b55', 'b07a4a', '9a6440'], mouse: ['b9b3c2', '9a8478', 'f4efe9', 'c98b55'], wolf: ['6f7d93', 'b9b3c2', '3b3440', '8a8278'], raccoon: ['6f7d93', '8a8278', 'b9b3c2'],
  panda: ['f4efe9'], pig: ['ffb3cf', 'f0a0a8', 'e8c0b0'], sheep: ['f4efe9', 'e8e0d0', '3b3440'], lion: ['e0a850', 'c98b55'], tiger: ['f07a2e', 'f4efe9'], redpanda: ['c8502a', 'b04a2a'], skunk: ['3b3440', '2b2633'],
  hamster: ['f2a65a', 'e8c090', 'f4efe9'], otter: ['7a5236', '9a6440', '6a4630'], koala: ['8a909a', 'b9b3c2'],
  rat: ['8a8078', '6a5a50', 'f4efe9', '3b3440'], squirrel: ['b8683a', '8a5a3a', '9a9aa4', 'c98b55'], leopard: ['e8b24a', 'd89a3a', '3b3440'], jackal: ['c89a5a', 'b08a5a', '8a8278'], badger: ['5c5864', '7a7480', '3b3440'],
  ferret: ['c9a47c', '8a6a4a', 'f4efe9'], beaver: ['7a4a2c', '9a6440', '6a4630'], capybara: ['a07848', '8a6a40', 'b08a5a'], lop: ['d8c4a8', 'f4efe9', '9a8478', 'c98b55'], fennec: ['e8c898', 'f0d8b0', 'd8b888'] }
const COMMON = ['e8c890', 'd89060', '7a4a30', '5a5a6a', 'a89080', 'f0e0c8', 'c87040', '484050']
const PASTEL = ['ffb3cf', '9fd3ff', 'b8e986', 'c9a0ff', 'ffe066', 'ffc8a0', 'a0e8d8', 'e8a0e0', 'f8f0a0', 'a8c0ff']
// dyes a plain garment may come in: Savi's picks, wide on purpose
const DYES = ['e85d75', 'ff9f43', 'ffd93d', '6bcb77', '4d96ff', '3d5a98', '9b5de5', 'ff8fc7', '5ec7c7', 'c0392b', '2f6b4a', '7a3b5e', 'd4a24a', '4a5a8a', 'a8d8a0', 'f2c4a0', '1f3a5a', '8a2a2a', 'e0e070', '6a4a8a', '2aa08a', 'ff6a3a', 'b0b8c8', '5a3a2a', 'f4f1ea', '2b2b33']
// body types instead of independent sliders, so waist, hips, build and height agree (Savi's picks; women stay curvy per Shelly)
const BODY_F = [['slim', 0.9, 0.82, 1.05, 0.9, 1.0], ['average', 1.0, 0.9, 1.14, 1.0, 1.0], ['curvy', 1.0, 0.82, 1.28, 1.22, 1.0], ['soft', 1.08, 1.0, 1.24, 1.18, 0.97], ['athletic', 0.98, 0.85, 1.1, 0.95, 1.03], ['petite', 0.92, 0.84, 1.12, 1.0, 0.9]]
const BODY_M = [['slim', 0.92, 0.92, 0.88, 0, 1.0], ['average', 1.0, 1.0, 0.92, 0, 1.0], ['stocky', 1.14, 1.15, 0.98, 0, 0.95], ['athletic', 1.05, 0.94, 0.9, 0, 1.03], ['lanky', 0.9, 0.93, 0.85, 0, 1.1], ['big', 1.18, 1.22, 1.0, 0, 1.06]]
const SPECIES_MARKS = { tiger: ['stripes'], skunk: ['stripes'], raccoon: ['patch'], panda: ['patch'], redpanda: ['patch'], leopard: ['freckles'], badger: ['stripes', 'patch'], hamster: ['patch', 'none'], cow: ['patch'] }
function bodyRoll(id, l, look) {
  let h = 2166136261; for (const c of String(id) + '|body') { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  const u = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }, pick = (a) => a[Math.floor(u() * a.length)], r = (a, b) => Math.round((a + u() * (b - a)) * 100) / 100
  const j = (v, d = 0.05) => Math.round((v + (u() * 2 - 1) * d) * 100) / 100
  const nat = NATURAL[l.species] ?? NATURAL.cat
  if (!look?.fur) l.fur = '#' + (u() < 0.12 ? pick(PASTEL) : u() < 0.75 ? pick(nat) : pick(COMMON))
  if (!look?.marks) l.marks = SPECIES_MARKS[l.species] ? pick(SPECIES_MARKS[l.species]) : pick(['none', 'none', 'none', 'none', 'freckles', 'stripes', 'patch', 'heart'])
  const f = l.sex === 'f', [kind, build, waist, hip, bust, tall] = pick(f ? BODY_F : BODY_M)
  l.bodyType = kind
  if (!look?.heightS) l.heightS = j(tall, 0.06)
  if (!look?.buildS) l.buildS = j(build)
  if (!look?.headS) l.headS = r(0.9, 1.12)
  if (!look?.earS) l.earS = r(0.8, 1.3)
  if (!look?.snoutS) l.snoutS = r(0.8, 1.2)
  if (!look?.tailS) l.tailS = r(0.75, 1.35)
  if (!look?.waistS) l.waistS = j(waist)
  if (!look?.hipS) l.hipS = j(hip)
  if (f && !look?.bustS) l.bustS = j(bust, 0.15) // still random (Shelly), centred on the body type
  return l
}
