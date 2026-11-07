// HALOGEN: the seven attributes every wanderer and every creature has, plus six learnable skills and a carry weight.
// Pure data and arithmetic, shared by the player (scripts/player.js), the creatures (smilers, lurkers, hounds,
// stealers, M.E.G. agents), the character sheet (scripts/stats-ui.js) and the loot rules (scripts/lib/items.js).
//   H Hardiness   body: max HP, carry weight, melee damage
//   A Agility     move speed, reload and swing speed
//   L Luck        critical hits, better loot
//   O Observation aim: ranged damage, sight; how much you can read off a creature
//   G Grit        mind: max sanity, slower sanity drain
//   E Endurance   stamina pool and regen, a little HP regen
//   N Nous        skill points per level, XP gained
// Attributes live in player.state.attr as "5,5,5,5,5,5,5" (1 to 10) and skills in player.state.skl as the points spent.
import W from './data/weapons.yml'

export const ATTRS = [
  { k: 'h', name: 'Hardiness', short: 'HAR', info: 'Max HP, carry weight, melee damage' },
  { k: 'a', name: 'Agility', short: 'AGI', info: 'Move speed, faster reloads and swings' },
  { k: 'l', name: 'Luck', short: 'LCK', info: 'Critical hits and better loot' },
  { k: 'o', name: 'Observation', short: 'OBS', info: 'Ranged damage, seeing a creature\'s stats' },
  { k: 'g', name: 'Grit', short: 'GRT', info: 'Max sanity, resisting the halls' },
  { k: 'e', name: 'Endurance', short: 'END', info: 'Stamina and slow HP regeneration' },
  { k: 'n', name: 'Nous', short: 'NOU', info: 'Skill points per level, XP gained' },
]
export const SKILLS = [
  { k: 'brawl', name: 'Brawl', attr: 'h', info: '+1% melee damage per point' },
  { k: 'marksman', name: 'Marksman', attr: 'o', info: '+1% gun damage per point' },
  { k: 'scavenge', name: 'Scavenge', attr: 'l', info: 'Chance of an extra find in every container' },
  { k: 'sneak', name: 'Sneak', attr: 'a', info: 'Creatures notice you from less far off' },
  { k: 'survival', name: 'Survival', attr: 'g', info: 'Food and bandages heal more; the halls drain less' },
  { k: 'tinker', name: 'Tinker', attr: 'n', info: 'Reload faster' },
]
export const ATTR_MAX = 10, ATTR_MIN = 1, SKILL_MAX = 60
export const START = { attr: '5,5,5,5,5,5,5', apts: 7, skl: '0,0,0,0,0,0', spts: 6 }

const nums = (str, n, d) => { const a = String(str ?? '').split(',').map(Number); return Array.from({ length: n }, (_, i) => (Number.isFinite(a[i]) ? a[i] : d)) }

// { h, a, l, o, g, e, n } of a state that has `attr`
export function attrsOf(s) {
  const v = nums(s?.attr, ATTRS.length, 5), o = {}
  ATTRS.forEach((a, i) => { o[a.k] = v[i] })
  return o
}
export const packAttrs = (o) => ATTRS.map((a) => o[a.k]).join(',')
// skill rating: a tenth of its governing attribute scaled up, plus the points spent
export function skillsOf(s) {
  const at = attrsOf(s), sp = nums(s?.skl, SKILLS.length, 0), o = {}
  SKILLS.forEach((k, i) => { o[k.k] = at[k.attr] * 3 + sp[i] })
  return o
}
export const spentOf = (s) => nums(s?.skl, SKILLS.length, 0)

// what the attributes and skills do, as plain numbers (5 in everything is exactly the old balance)
export function derived(s) {
  const a = attrsOf(s), k = skillsOf(s)
  return {
    hpBonus: (a.h - 5) * 10,
    sanBonus: (a.g - 5) * 8,
    staMax: 100 + (a.e - 5) * 10,
    staRegen: 1 + (a.e - 5) * 0.06,
    hpRegen: Math.max(0, (a.e - 4) * 0.12), // hp per second out of a fight
    carry: 30 + a.h * 5 + (a.e - 5) * 1,
    speed: 1 + (a.a - 5) * 0.025,
    swing: 1 - (a.a - 5) * 0.03,
    reload: Math.max(0.4, 1 - (a.a - 5) * 0.03 - (k.tinker - 15) * 0.006),
    melee: (1 + (a.h - 5) * 0.06) * (1 + (k.brawl - 15) * 0.01),
    gun: (1 + (a.o - 5) * 0.06) * (1 + (k.marksman - 15) * 0.01),
    crit: 0.03 + a.l * 0.012,
    scav: Math.min(0.8, Math.max(0, (k.scavenge - 5) * 0.012 + a.l * 0.01)),
    sneak: Math.max(0.35, 1 - (k.sneak - 15) * 0.006),
    heal: 1 + (k.survival - 15) * 0.01,
    drain: Math.max(0.4, 1 - (a.g - 5) * 0.05 - (k.survival - 15) * 0.004),
    xp: 1 + (a.n - 5) * 0.06,
    skillPerLevel: 3 + Math.floor((a.n - 1) / 3),
  }
}

// ---- carry weight, in kilograms
const FIXED = { almond: 0.5, ammo: 0.4, shells: 0.5, ration: 0.4, bandage: 0.1, battery: 0.3 }
export function weaponWeight(k) { const w = W[k]; return w ? (w.weight ?? (w.ranged ? 2.8 : w.damage > 30 ? 3.2 : 1.6)) : 0 }
export function tokenWeight(token) {
  if (token.startsWith('weapon:')) return weaponWeight(token.slice(7))
  return FIXED[token] ?? 0.2
}
// what the wanderer is carrying now: almond water 0.5 each, rounds 0.03 each, shells 0.07, every owned weapon
export function carried(s) {
  let kg = (s.almonds ?? 0) * FIXED.almond + (s.ammo ?? 0) * 0.03 + (s.shells ?? 0) * 0.07
  for (const k of String(s.weapons ?? '').split(',').filter(Boolean)) kg += weaponWeight(k)
  return Math.round(kg * 10) / 10
}
// can this token be taken, and if not why
export function canCarry(s, token) {
  const cap = derived(s).carry, add = token === 'ammo' ? W.ammo.perPickup * 0.03 : token === 'shells' ? W.shells.perPickup * 0.07 : tokenWeight(token)
  if (['ration', 'bandage', 'battery'].includes(token)) return { ok: true } // used on the spot, weigh nothing
  const now = carried(s)
  return now + add <= cap + 1e-6 ? { ok: true } : { ok: false, msg: `Too heavy to carry (${now.toFixed(1)}/${cap} kg)` }
}
// how much slower the weight makes you when you are over the limit
export const burden = (s) => { const cap = derived(s).carry, now = carried(s); return now <= cap ? 1 : Math.max(0.5, 1 - (now - cap) / cap) }

// ---- creatures: every individual rolls its own attributes around its species' template
const TEMPLATE = {
  smiler: { h: 5, a: 5, l: 4, o: 6, g: 8, e: 6, n: 3 },
  lurker: { h: 6, a: 7, l: 4, o: 8, g: 9, e: 7, n: 4 },
  hound: { h: 5, a: 8, l: 3, o: 7, g: 4, e: 8, n: 2 },
  stealer: { h: 8, a: 4, l: 5, o: 6, g: 9, e: 5, n: 7 },
  agent: { h: 6, a: 6, l: 5, o: 7, g: 7, e: 6, n: 6 },
}
const NICK = { h: ['Brute', 'Thick'], a: ['Swift', 'Quick'], l: ['Charmed', 'Lucky'], o: ['Keen-eyed', 'Watchful'], g: ['Unshaken', 'Hollow'], e: ['Tireless', 'Gaunt'], n: ['Cunning', 'Wise'] }
export function rollNpc(ctx, kind) {
  const t = TEMPLATE[kind] ?? TEMPLATE.smiler, o = {}
  for (const a of ATTRS) o[a.k] = Math.max(1, Math.min(10, t[a.k] + Math.round((ctx.random() + ctx.random() - 1) * 3)))
  let best = 'h'; for (const a of ATTRS) if (o[a.k] - t[a.k] > o[best] - t[best]) best = a.k
  const title = o[best] - t[best] >= 2 ? NICK[best][Math.floor(ctx.random() * 2)] : ''
  return { attr: packAttrs(o), title }
}
// multipliers for a creature from its state.attr
export function npcMul(st) {
  const a = attrsOf(st)
  return { hp: 0.5 + a.h * 0.1, dmg: 0.5 + a.h * 0.1, speed: 0.8 + a.a * 0.04, sight: 0.7 + a.o * 0.06, sanity: 0.6 + (10 - a.g) * 0.08, loot: 0.6 + a.l * 0.08, scale: 0.94 + a.h * 0.012 }
}
// state for a new creature: its hp scaled by hardiness and its own attributes and title
export function npcState(ctx, kind, baseHp, extra = {}) {
  const r = rollNpc(ctx, kind), m = npcMul({ attr: r.attr })
  const hp = Math.max(1, Math.round(baseHp * m.hp))
  return { hp, maxHp: hp, attr: r.attr, title: r.title, ...extra }
}
