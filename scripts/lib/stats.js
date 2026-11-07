// HALOGEN: the seven attributes every wanderer and every creature has, and thirteen skills that work like
// Fallout: New Vegas: a skill starts at 2 + 2 x its attribute + half your Luck, three skills are tagged (+15),
// each level gives 10 + half your Nous in skill points, and a skill tops out at 100. Pure data and arithmetic,
// shared by the player (scripts/player.js), the creatures, the character sheet (scripts/stats-ui.js), the loot
// rules (scripts/lib/items.js) and the locks on containers (scripts/interact.js).
//   H Hardiness   (Strength)     carry weight, melee and unarmed damage
//   A Agility                    stamina, move speed, swing and reload speed
//   L Luck                       critical hits, every skill's start, a chance of an extra find
//   O Observation (Perception)   ranged damage, reading a creature's stats
//   G Gab         (Charisma)     Barter and Speech
//   E Endurance                  max HP, slow HP regeneration
//   N Nous        (Intelligence) skill points per level, max sanity
// Attributes live in player.state.attr as "5,5,5,5,5,5,5" (1 to 10); skills in player.state.skl as the points spent
// (13 numbers), tagged skills in player.state.tags ("guns,sneak,lockpick").
import W from './data/weapons.yml'

export const ATTRS = [
  { k: 'h', name: 'Hardiness', short: 'HAR', info: 'Carry weight, melee and unarmed damage' },
  { k: 'a', name: 'Agility', short: 'AGI', info: 'Stamina, move speed, swing and reload speed' },
  { k: 'l', name: 'Luck', short: 'LCK', info: 'Critical hits, skill starts and extra finds' },
  { k: 'o', name: 'Observation', short: 'OBS', info: "Ranged damage, reading a creature's stats" },
  { k: 'g', name: 'Gab', short: 'GAB', info: 'Barter and Speech' },
  { k: 'e', name: 'Endurance', short: 'END', info: 'Max HP and slow HP regeneration' },
  { k: 'n', name: 'Nous', short: 'NOU', info: 'Skill points per level, max sanity' },
]
// the thirteen skills, in Fallout order. `info` is what each does in this game today.
export const SKILLS = [
  { k: 'barter', name: 'Barter', attr: 'g', info: 'The quartermaster gives you more' },
  { k: 'energy', name: 'Energy Weapons', attr: 'o', info: 'No energy weapons exist yet' },
  { k: 'explosives', name: 'Explosives', attr: 'o', info: 'No explosives exist yet' },
  { k: 'guns', name: 'Guns', attr: 'a', info: 'Pistol and shotgun damage, a little faster reloads' },
  { k: 'lockpick', name: 'Lockpick', attr: 'o', info: 'Opens locked crates up to its level' },
  { k: 'medicine', name: 'Medicine', attr: 'n', info: 'Bandages and the medic heal more' },
  { k: 'melee', name: 'Melee Weapons', attr: 'h', info: 'Melee weapon damage' },
  { k: 'repair', name: 'Repair', attr: 'n', info: 'Weapons wear slower; repair kits fix more' },
  { k: 'science', name: 'Science', attr: 'n', info: 'Opens secured lockers up to its level' },
  { k: 'sneak', name: 'Sneak', attr: 'a', info: 'Creatures notice you from less far off' },
  { k: 'speech', name: 'Speech', attr: 'g', info: 'Opens extra talk with M.E.G. agents' },
  { k: 'survival', name: 'Survival', attr: 'e', info: 'Almond water and rations heal more; the halls drain less' },
  { k: 'unarmed', name: 'Unarmed', attr: 'e', info: 'Fist damage and speed' },
]
export const SKILL_KEYS = SKILLS.map((k) => k.k)
export const ATTR_MAX = 10, ATTR_MIN = 1, SKILL_MAX = 100, TAG_BONUS = 15, TAGS = 3
export const START = { attr: '5,5,5,5,5,5,5', apts: 5, skl: SKILLS.map(() => 0).join(','), spts: 0, tagsLeft: TAGS, tags: '', sver: 2 }

const nums = (str, n, d) => { const a = String(str ?? '').split(',').map(Number); return Array.from({ length: n }, (_, i) => (Number.isFinite(a[i]) ? a[i] : d)) }

// { h, a, l, o, g, e, n } of a state that has `attr`
export function attrsOf(s) {
  const v = nums(s?.attr, ATTRS.length, 5), o = {}
  ATTRS.forEach((a, i) => { o[a.k] = v[i] })
  return o
}
export const packAttrs = (o) => ATTRS.map((a) => o[a.k]).join(',')
export const tagsOf = (s) => String(s?.tags ?? '').split(',').filter(Boolean)
export const spentOf = (s) => nums(s?.skl, SKILLS.length, 0)
// a skill's start: 2 + 2 x attribute + half your Luck (rounded up), as in Fallout: New Vegas
export const baseSkill = (at, k) => 2 + 2 * at[k.attr] + Math.ceil(at.l / 2)
export function skillsOf(s) {
  const at = attrsOf(s), sp = spentOf(s), tg = tagsOf(s), o = {}
  SKILLS.forEach((k, i) => { o[k.k] = Math.min(SKILL_MAX, baseSkill(at, k) + sp[i] + (tg.includes(k.k) ? TAG_BONUS : 0)) })
  return o
}
// a weapon's class: fists are Unarmed, guns are Guns, everything else Melee Weapons
export const wclass = (w) => (w?.ranged ? 'guns' : w && w.name !== 'Fists' ? 'melee' : 'unarmed')
const skillMul = (v) => 0.9 + v / 250 // 15 is about the old balance, 100 is +30%
// the damage multiplier for a weapon: its skill and the attribute behind it
export function dmgMul(s, w) {
  const a = attrsOf(s), k = skillsOf(s), c = wclass(w)
  return c === 'guns' ? (1 + (a.o - 5) * 0.04) * skillMul(k.guns) : c === 'melee' ? (1 + (a.h - 5) * 0.06) * skillMul(k.melee) : (1 + (a.h - 5) * 0.05) * skillMul(k.unarmed)
}

// what the attributes and skills do, as plain numbers (5 in everything and no points is about the old balance)
export function derived(s) {
  const a = attrsOf(s), k = skillsOf(s)
  return {
    hpBonus: (a.e - 5) * 10,
    sanBonus: (a.n - 5) * 8,
    staMax: 100 + (a.a - 5) * 8,
    staRegen: 1 + (a.a - 5) * 0.05,
    hpRegen: Math.max(0, (a.e - 4) * 0.12), // hp per second out of a fight
    carry: 30 + a.h * 5,
    speed: 1 + (a.a - 5) * 0.025,
    swing: 1 - (a.a - 5) * 0.03 - (k.unarmed - 15) * 0.0015,
    reload: Math.max(0.5, 1 - (a.a - 5) * 0.03 - (k.guns - 15) * 0.002),
    melee: dmgMul(s, { damage: 1 }),
    gun: dmgMul(s, { ranged: true }),
    crit: 0.03 + a.l * 0.012,
    scav: Math.min(0.5, a.l * 0.012), // the chance of one extra find in a container
    sneak: Math.max(0.35, 1 - (k.sneak - 15) * 0.0065),
    heal: 1 + (k.survival - 15) * 0.006, // almond water, rations
    healMed: 1 + (k.medicine - 15) * 0.008, // bandages and the medic
    drain: Math.max(0.4, 1 - (a.n - 5) * 0.04 - (k.survival - 15) * 0.002),
    wear: Math.max(0.5, 1.2 - k.repair * 0.007), // weapon wear per use
    repairCap: Math.min(100, 50 + k.repair / 2), // a kit cannot repair past this condition
    xp: 1,
    skillPerLevel: 10 + Math.floor(a.n / 2),
  }
}

// ---- carry weight, in kilograms
const FIXED = { almond: 0.5, ammo: 0.4, shells: 0.5, ration: 0.4, bandage: 0.1, battery: 0.3, kit: 1.0, book: 0.3 }
export function weaponWeight(k) { const w = W[k]; return w ? (w.weight ?? (w.ranged ? 2.8 : w.damage > 30 ? 3.2 : 1.6)) : 0 }
export function tokenWeight(token) {
  if (token.startsWith('weapon:')) return weaponWeight(token.slice(7))
  if (token.startsWith('book:')) return FIXED.book
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
  if (['ration', 'bandage', 'battery', 'kit'].includes(token) || token.startsWith('book:')) return { ok: true } // used on the spot, weigh nothing
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
  return { hp: 0.5 + a.h * 0.1, dmg: 0.5 + a.h * 0.1, speed: 0.8 + a.a * 0.04, sight: 0.7 + a.o * 0.06, loot: 0.6 + a.l * 0.08, scale: 0.94 + a.h * 0.012 }
}
// state for a new creature: its hp scaled by hardiness and its own attributes and title
export function npcState(ctx, kind, baseHp, extra = {}) {
  const r = rollNpc(ctx, kind), m = npcMul({ attr: r.attr })
  const hp = Math.max(1, Math.round(baseHp * m.hp))
  return { hp, maxHp: hp, attr: r.attr, title: r.title, ...extra }
}
