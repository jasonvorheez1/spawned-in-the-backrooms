import { vo, hasVoice } from './voices.js';
// NPC identity, skill roll delegation, and trader shop pricing.
// Pure helpers: scripts/talk.js (on the player) does the calling and the writes.
// Numbers live in data/talk.yml and data/shops.yml.
import T from './data/talk.yml'
import SH from './data/shops.yml'
import SNACKS from './data/snacks.yml'
import W from './weapons.js'
import { parseCloth, wornTokens } from './clothes.js'
import { cndOf, armorCnd, vendorCost } from './condition.js'
import { resolveCheck } from './skill-check.js'

export const TALK = T, SHOPS = SH
export const nameOf = (it) => String(it?.state?.name ?? 'Stranger').split(' ·')[0]
export const keyOf = (pl) => pl.userId ?? pl.id
export const isTrader = (it) => SH.roles.includes(it?.state?.role)
const DEFV = { scout: 'ale', medic: 'ortiz', quarter: 'callum' }
export const voiceOf = (it) => hasVoice(String(it?.id ?? '').split('/').pop()) ? String(it.id).split('/').pop() : it?.state?.voice ?? DEFV[it?.state?.role] ?? `${String(it?.id ?? 'x').split('/').pop()}#${(it?.state?.wear?.sex ?? it?.state?.look?.sex) === 'f' ? 'f' : 'm'}` // no cast voice: their own, from the pool
export const VO = (who, line) => vo(who, line)

// a skill roll: skill + 1..roll against difficulty
export function rollCheck(ctx, s, check) {
  return resolveCheck(ctx, s, check)
}

// ---- trading ----
export function stockOf(it) { const id = String(it.id).split('/').pop(); return SH.shops[id] ?? SH.shops.default }
export function freshStock(it) { return Object.fromEntries(stockOf(it).map(([t, n, p]) => [t, [n, p]])) }
export const buyPrice = (base, barter, disc = 0) => Math.max(1, Math.round(base * (SH.buyMul - barter / SH.barterDiv) * (1 - disc)))
export const sellPrice = (base, barter) => Math.max(1, Math.round(base * SH.sellShare * (0.75 + barter / SH.barterDiv)))
const csv = (v) => String(v ?? '').split(',').filter(Boolean)
// what a player can sell, one row per kind: [token, have, base]
// the shop's sections, from a token's shape
export const SECTIONS = [['weapon', 'WEAPONS'], ['ammo', 'AMMO'], ['aid', 'MEDICAL'], ['food', 'FOOD & DRINK'], ['cloth', 'APPAREL'], ['gear', 'GEAR & PARTS']]
export function sectionOf(t) {
  if (t.startsWith('weapon:')) return 'weapon'
  if (t.startsWith('cloth:')) return 'cloth'
  if (t === 'ammo' || t === 'shells') return 'ammo'
  if (['bandage', 'firstaid', 'kit', 'tape'].includes(t)) return 'aid'
  if (SNACKS[t] && (SNACKS[t].hunger || SNACKS[t].thirst)) return 'food' // any snack or drink, rink treats included
  if (t.startsWith('meat:') || t === 'almond' || ['ration', 'royal_ration', 'beans', 'bar', 'lobby_wafer'].includes(t)) return 'food'
  return 'gear'
}
// what a trader will repair for you (Fallout: New Vegas): every worn-down weapon and garment you have, with its condition and base value in $
export function repairables(s) {
  const P = SH.sell, out = [], seen = new Set()
  for (const k of csv(s.weapons)) { if (k === 'fists' || !W[k] || seen.has(k)) continue; seen.add(k); const c = cndOf(s, k); if (c < 99.5) out.push(['weapon:' + k, c, (P.weapon[W[k].rarity] ?? P.weapon.common) * 2]) }
  for (const t of [...wornTokens(s.look), ...csv(s.clothes)]) { const p = parseCloth(t); if (!p || seen.has(t)) continue; seen.add(t); const c = armorCnd(s.look, t); if (c < 99.5) out.push([t, c, (P.cloth[p.row.rarity] ?? P.cloth.common) * 2]) }
  return out
}
// dollars for a trader to bring it back to 100; Barter takes up to a quarter off
export const repairPrice = (base, c, barter) => Math.max(1, Math.round(vendorCost(base, c) * (1 - Math.min(0.25, barter / 400))))
export const money = (c) => '$' + (Math.max(0, c ?? 0) / 100).toFixed(2)
export function sellables(s) {
  const out = [], P = SH.sell
  if ((s.almonds ?? 0) > 0) out.push(['almond', s.almonds, P.almond ?? 3])
  if ((s.ammo ?? 0) >= W.ammo.perPickup) out.push(['ammo', Math.floor(s.ammo / W.ammo.perPickup), P.ammo])
  if ((s.shells ?? 0) >= W.shells.perPickup) out.push(['shells', Math.floor(s.shells / W.shells.perPickup), P.shells])
  for (const [k, f] of [['fuse', 'fuses'], ['valve', 'valves'], ['keycard', 'keycards'], ['firesalt', 'firesalt']]) if ((s[f] ?? 0) > 0) out.push([k, s[f], P[k]])
  const ws = {}; for (const k of csv(s.weapons)) if (k !== 'fists' && W[k]) ws[k] = (ws[k] ?? 0) + 1
  for (const [k, n] of Object.entries(ws)) out.push(['weapon:' + k, n, P.weapon[W[k].rarity] ?? P.weapon.common])
  const cs = {}; for (const t of csv(s.clothes)) if (parseCloth(t)) cs[t] = (cs[t] ?? 0) + 1
  for (const [t, n] of Object.entries(cs)) out.push([t, n, P.cloth[parseCloth(t).row.rarity] ?? P.cloth.common])
  return out
}
// take one of a sellable out of the player's state; false if they don't have it
export function removeOne(s, token) {
  if (token === 'almond') { if (!((s.almonds ?? 0) > 0)) return false; s.almonds -= 1; return true }
  if (token === 'ammo') { if ((s.ammo ?? 0) < W.ammo.perPickup) return false; s.ammo -= W.ammo.perPickup; return true }
  if (token === 'shells') { if ((s.shells ?? 0) < W.shells.perPickup) return false; s.shells -= W.shells.perPickup; return true }
  const F = { fuse: 'fuses', valve: 'valves', keycard: 'keycards', firesalt: 'firesalt' }[token]
  if (F) { if (!((s[F] ?? 0) > 0)) return false; s[F] -= 1; return true }
  if (token.startsWith('weapon:')) {
    const k = token.slice(7), ws = csv(s.weapons), i = ws.indexOf(k); if (i < 0) return false
    ws.splice(i, 1); s.weapons = ws.join(',')
    if (s.equipped === k && !ws.includes(k)) s.equipped = 'fists'
    return true
  }
  if (token.startsWith('cloth:')) { const cs = csv(s.clothes), i = cs.indexOf(token); if (i < 0) return false; cs.splice(i, 1); s.clothes = cs.join(','); return true }
  return false
}
