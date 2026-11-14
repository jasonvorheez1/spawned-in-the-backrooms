// HALOGEN: the seven attributes every wanderer and every creature has, and thirteen skills that work like
// Fallout: New Vegas: a skill starts at 2 + 2 x its attribute + half your Luck, three skills are tagged (+15),
// each level gives 9 + half your Nous in skill points, and a skill tops out at 100. Pure data and arithmetic,
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
import W from './weapons.js'
import D from './data/difficulty.yml'
import { wornDR, afterDR, parseCloth } from './clothes.js'
import { collectModifiers, getBookSpec, getMagSpec, isBookToken, isMagToken } from './modifiers.js'

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
  { k: 'energy', name: 'Energy Weapons', attr: 'o', info: 'Laser weapons: damage, a steadier beam' },
  { k: 'explosives', name: 'Explosives', attr: 'o', info: 'Steadier throws and better launcher handling' },
  { k: 'guns', name: 'Guns', attr: 'a', info: 'Gun damage, a tighter spread, a little faster reloads' },
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

// raw stored { h, a, l, o, g, e, n } without temporary/gear modifiers
export function baseAttrsOf(s) {
  const v = nums(s?.attr, ATTRS.length, 5), o = {}
  ATTRS.forEach((a, i) => { o[a.k] = v[i] })
  return o
}
// effective { h, a, l, o, g, e, n } including active gear and consumable modifiers
export function attrsOf(s, nowMs) {
  const o = baseAttrsOf(s)
  const mod = collectModifiers(s, nowMs)
  for (const a of ATTRS) {
    const d = mod.attrs[a.k] ?? 0
    if (d) o[a.k] = Math.max(ATTR_MIN, Math.min(15, o[a.k] + d))
  }
  return o
}
export const packAttrs = (o) => ATTRS.map((a) => o[a.k]).join(',')
export const tagsOf = (s) => String(s?.tags ?? '').split(',').filter(Boolean)
export const spentOf = (s) => nums(s?.skl, SKILLS.length, 0)
// a skill's start: 2 + 2 x attribute + half your Luck (rounded up), as in Fallout: New Vegas
export const baseSkill = (at, k) => 2 + 2 * at[k.attr] + Math.ceil(at.l / 2)
// Permanent skill rating (base attributes + spent points + tags + permanent Skill Books), unaffected by temporary buffs
export function permanentSkillsOf(s) {
  const at = baseAttrsOf(s), sp = spentOf(s), tg = tagsOf(s), bk = s?.bookBonuses ?? {}, o = {}
  SKILLS.forEach((k, i) => { o[k.k] = Math.min(SKILL_MAX, baseSkill(at, k) + sp[i] + (tg.includes(k.k) ? TAG_BONUS : 0) + (bk[k.k] ?? 0)) })
  return o
}
export function skillsOf(s, nowMs) {
  const at = attrsOf(s, nowMs), sp = spentOf(s), tg = tagsOf(s), mod = collectModifiers(s, nowMs), o = {}
  SKILLS.forEach((k, i) => {
    const raw = baseSkill(at, k) + sp[i] + (tg.includes(k.k) ? TAG_BONUS : 0) + (mod.totalSkills[k.k] ?? 0)
    o[k.k] = Math.max(1, Math.min(SKILL_MAX, raw))
  })
  return o
}
export const wclass = (w) => {
  if (w?.throwable || w?.lob) return 'explosives'
  if (w?.energy) return 'energy'
  if (w?.ranged) return 'guns'
  return !w || w.unarmed || w.name === 'Fists' ? 'unarmed' : 'melee'
}
const skillMul = (v) => 0.94 + v / 250 // 15 is about the old balance, 100 is +30%
// the damage multiplier for a weapon: its skill and the attribute behind it
export function dmgMul(s, w) {
  const a = attrsOf(s), k = skillsOf(s), c = wclass(w), hd = handling(s, w).dmg
  const mod = collectModifiers(s)
  const extra = Math.max(0.5, 1 + (mod.derived.dmgMul ?? 0))
  return extra * hd * ((w?.ranged || w?.throwable) ? (1 + (a.o - 5) * 0.04) * skillMul(k[c]) : c === 'melee' ? (1 + (a.h - 5) * 0.06) * skillMul(k.melee) : (1 + (a.h - 5) * 0.05) * skillMul(k.unarmed))
}
const REQ_SKILL = { guns: 'Guns', melee: 'Melee', energy: 'Energy Weapons', explosives: 'Explosives', unarmed: 'Unarmed' }

// Requirements affect handling. Negative shortfalls mean the player exceeds the target.
export function handling(s, w) {
  const o = { str: 0, skill: 0, spread: 1, recoil: 1, sway: 0, dmg: 1, stam: 1, swing: 1, raise: 1, hold: 0, throwPower: 1, notes: [] }
  const r = w?.req; if (!r) return o
  const a = attrsOf(s), k = skillsOf(s), cls = wclass(w)
  const ds = r.h ? r.h - a.h : 0, dk = r[cls] ? r[cls] - (k[cls] ?? 0) : 0
  o.str = ds; o.skill = dk
  const sh = Math.max(0, ds), sp = Math.max(0, -ds), kh = Math.max(0, dk), kp = Math.max(0, -dk)
  o.hold = Math.min(1, sh / 4) // how badly it sags in your arms (scripts/lib/vmpose.js)
  o.dmg = Math.max(0.4, 1 - 0.04 * sh - 0.003 * kh)
  o.raise = Math.max(0.4, 1 - 0.08 * sh)
  if (w.throwable) {
    o.throwPower = Math.max(0.68, 1 - 0.045 * sh - 0.009 * kh)
    o.swing = 1 + Math.min(0.45, 0.06 * sh + 0.01 * kh)
  } else if (w.ranged) {
    o.spread = (1 + 0.17 * sh) * (1 - 0.03 * Math.min(sp, 4)) * (1 + 0.012 * kh) * (1 - 0.002 * Math.min(kp, 40))
    o.recoil = (1 + 0.14 * sh) * (1 - 0.04 * Math.min(sp, 4))
    o.sway = 0.25 * sh + 0.01 * kh // degrees the aim wanders
  } else { o.stam = 1 + 0.09 * sh; o.swing = 1 + 0.06 * sh + Math.min(0.15, 0.003 * kh) }
  if (sh > 0) o.notes.push(`Too heavy: needs HAR ${r.h} (you have ${a.h})`)
  if (kh > 0) o.notes.push(`Needs ${REQ_SKILL[cls]} ${r[cls]} (you have ${k[cls]})`)
  return o
}
export function reqText(w) {
  const r = w?.req
  if (!r) return ''
  const skill = wclass(w)
  return [r.h && 'HAR ' + r.h, r[skill] && REQ_SKILL[skill] + ' ' + r[skill]].filter(Boolean).join(' · ')
}

// what the attributes and skills do, as plain numbers (5 in everything and no points is about the old balance)
// a broken mind: at 0 sanity every attribute but Luck reads 2 lower (min 1) until sanity comes back (Savi's pick)
export const isBroken = (s) => s?.sanity != null && s.sanity <= 0
function shaken(a, s) { if (!isBroken(s)) return a; const o = { ...a }; for (const k of Object.keys(o)) if (k !== 'l') o[k] = Math.max(1, o[k] - 2); return o }
const sneakFromSkill = (skill) => Math.max(0.35, 1 - (skill - 15) * 0.0065)
export const sneakMul = (s) => sneakFromSkill(skillsOf(s).sneak)
export function derived(s, nowMs) {
  const raw = attrsOf(s, nowMs), a = shaken(raw, s), k = skillsOf(s, nowMs), mod = collectModifiers(s, nowMs), dv = mod.derived
  return {
    hpBonus: (a.e - 5) * 10 + (dv.maxHp ?? 0),
    sanBonus: (a.n - 5) * 8 + (dv.maxSan ?? 0),
    staMax: Math.max(40, 100 + (a.a - 5) * 8),
    staRegen: Math.max(0.25, (1 + (a.a - 5) * 0.05) * (1 + (dv.stamRegen ?? 0))),
    hpRegen: Math.max(0, (a.e - 4) * 0.12), // hp per second out of a fight
    carry: s?.god ? Infinity : D.carryBase + a.h * D.carryPerH + (s?.carryBonus ?? 0) + (s?.carryExtra ?? 0) + (dv.carryMax ?? 0), // carryExtra: a fixed per-player grant (Shelly asked 999999)
    speed: Math.max(0.55, (1 + (a.a - 5) * 0.025) * (1 + (dv.moveSpeed ?? 0))),
    swing: 1 - (a.a - 5) * 0.03 - (k.unarmed - 15) * 0.0015,
    reload: Math.max(0.5, 1 - (a.a - 5) * 0.03 - (k.guns - 15) * 0.002),
    // These baseline weapons have no handling requirements; reuse the sheet already calculated.
    melee: (1 + (raw.h - 5) * 0.06) * skillMul(k.melee),
    gun: (1 + (raw.o - 5) * 0.04) * skillMul(k.guns),
    crit: Math.max(0.01, 0.03 + a.l * 0.012 + (dv.crit ?? 0)),
    scav: Math.min(0.5, a.l * 0.012), // the chance of one extra find in a container
    clothFind: 0.5 + a.o * 0.07 + a.l * 0.03, // Observation (Perception) spots the wearable, Luck helps: x1 at O5 L5, x1.35 at O10 (Savi's pick)
    dr: wornDR(s?.look) + (dv.dr ?? 0), // damage resistance from worn clothes + active meds
    coldResist: Math.min(85, Math.max(-25, dv.coldResist ?? 0)),
    heatResist: Math.min(85, Math.max(-25, dv.heatResist ?? 0)),
    bleedImmune: (dv.bleedImmune ?? 0) > 0,
    sneak: sneakFromSkill(k.sneak),
    heal: D.healMul * (1 + (k.survival - 15) * 0.006), // almond water, rations
    healMed: D.healMul * (1 + (k.medicine - 15) * 0.008), // bandages and the medic
    drain: Math.max(0.4, 1 - (a.n - 5) * 0.04 - (k.survival - 15) * 0.002),
    wear: Math.max(0.5, 1.2 - k.repair * 0.007), // weapon wear per use
    repairCap: Math.min(100, 50 + k.repair / 2), // a kit cannot repair past this condition
    xp: 1,
    skillPerLevel: 9 + Math.floor(raw.n / 2),
  }
}

// ---- carry weight, in kilograms
const FIXED = { almond: 0.5, ammo: 0.4, shells: 0.5, ration: 0.4, bandage: 0.1, battery: 0.3, kit: 1.0, book: 0.3, mag: 0.1, firesalt: 0.3 }
export function weaponWeight(k) { const w = W[k]; return w ? (w.kg ?? w.weight ?? (w.ranged ? 2.8 : w.damage > 30 ? 3.2 : 1.6)) : 0 }
import BRK from './data/breakables.yml'
export function tokenWeight(token) {
  if (BRK.scrap[token]) return BRK.scrap[token].kg
  if (token.startsWith('weapon:')) return weaponWeight(token.slice(7))
  if (isBookToken(token)) return getBookSpec(token)?.kg ?? FIXED.book
  if (isMagToken(token)) return getMagSpec(token)?.kg ?? FIXED.mag
  if (token.startsWith('cloth:')) return parseCloth(token)?.row.kg ?? 0.3
  return FIXED[token] ?? 0.2
}
// what the wanderer is carrying now: almond water 0.5 each, rounds 0.03 each, shells 0.07, every owned weapon
export function inventoryWeight(s) {
  let kg = ((s.almonds ?? 0) + (s.almondsG ?? 0) + (s.almondsR ?? 0) + (s.almondsB ?? 0)) * FIXED.almond + (s.ammo ?? 0) * 0.03 + (s.shells ?? 0) * 0.07 + (s.firesalt ?? 0) * FIXED.firesalt + (s.fsIngot ?? 0) * 0.1 + (s.repellent ?? 0) * 0.15 + (s.cashew ?? 0) * 0.8
  for (const k of String(s.weapons ?? '').split(',').filter(Boolean)) kg += weaponWeight(k)
  for (const [t, n] of Object.entries(s.scrap ?? {})) kg += (BRK.scrap[t]?.kg ?? 0.2) * n // building scrap
  for (const [t, n] of Object.entries(s.books ?? {})) kg += (getBookSpec(t)?.kg ?? FIXED.book) * n
  for (const [t, n] of Object.entries(s.mags ?? {})) kg += (getMagSpec(t)?.kg ?? FIXED.mag) * n
  for (const t of String(s.clothes ?? '').split(',').filter(Boolean)) kg += tokenWeight(t) // spare clothes; what's worn weighs nothing
  return kg
}
export const carried = (s) => Math.round(inventoryWeight(s) * 10) / 10
// The amount one pickup adds; crafting uses this same rule for complete recipe outputs.
export function pickupWeight(token) {
  if (['ration', 'bandage', 'battery', 'kit', 'akit', 'beans', 'bar', 'firstaid', 'tape', 'fuse', 'valve', 'keycard', 'royal_ration', 'bobbypin', 'compass', 'nvg', 'skates'].includes(token) || token.startsWith('page:') || token.startsWith('manual:')) return 0
  return token === 'ammo' ? W.ammo.perPickup * .03 : token === 'shells' ? W.shells.perPickup * .07 : tokenWeight(token)
}
export function canCarry(s, token) {
  const cap = derived(s).carry, add = pickupWeight(token)
  if (!add) return { ok: true }
  const now = inventoryWeight(s)
  return now + add <= cap + 1e-6 ? { ok: true } : { ok: false, msg: `Too heavy to carry (${now.toFixed(1)}/${cap} kg)` }
}
// Batch callers share the same precise pickup weights as individual grants.
export function canCarryAll(s,tokens) {
  const cap=derived(s).carry,now=inventoryWeight(s),add=tokens.reduce((kg,t)=>kg+pickupWeight(t),0)
  return !add||now+add<=cap+1e-6?{ok:true}:{ok:false,msg:`Too heavy to carry (${now.toFixed(1)} + ${add.toFixed(1)} of ${cap} kg)`}
}
// how much slower the weight makes you when you are over the limit
export const burden = (s) => { const cap = derived(s).carry, now = carried(s); return now <= cap ? 1 : Math.max(0.5, 1 - (now - cap) / cap) }

// ---- armor: one rule for every hit on a critter (player or NPC) from what it wears. look = player.state.look or an NPC's look
// every hit on someone goes through here: enemyDmg turns what creatures and people do up (the player hitting an npc opts out: scripts/player.js)
export const dmgAfterArmor = (look, dmg, scale = true, pen = 0) => afterDR(wornDR(look), scale ? dmg * D.enemyDmg : dmg, pen)
// an NPC's look: its state.look, else the params its critter body was drawn from
export const lookOfNpc = (o) => o?.state?.look ?? o?.state?.wear ?? (o?.primitive?.params?.species && o?.primitive?.params?.topw ? o.primitive.params : null) // either critter body's params carry the worn slots

// ---- creatures: every individual rolls its own attributes around its species' template
const TEMPLATE = {
  smiler: { h: 5, a: 5, l: 4, o: 6, g: 8, e: 6, n: 3 },
  lurker: { h: 6, a: 7, l: 4, o: 8, g: 9, e: 7, n: 4 },
  hound: { h: 5, a: 8, l: 3, o: 7, g: 4, e: 8, n: 2 },
  stealer: { h: 8, a: 4, l: 5, o: 6, g: 9, e: 5, n: 7 },
  agent: { h: 6, a: 6, l: 5, o: 7, g: 7, e: 6, n: 6 },
}
const NICK = { h: ['Brute', 'Thick'], a: ['Swift', 'Quick'], l: ['Charmed', 'Lucky'], o: ['Keen-eyed', 'Watchful'], g: ['Smooth', 'Silver-tongued'], e: ['Tireless', 'Gaunt'], n: ['Cunning', 'Wise'] }
export function rollNpc(ctx, kind) {
  const t = TEMPLATE[kind] ?? TEMPLATE.smiler, o = {}
  for (const a of ATTRS) o[a.k] = Math.max(1, Math.min(10, t[a.k] + Math.round((ctx.random() + ctx.random() - 1) * 3)))
  let best = 'h'; for (const a of ATTRS) if (a.k !== 'g' && o[a.k] - t[a.k] > o[best] - t[best]) best = a.k
  const title = o[best] - t[best] >= 2 ? NICK[best][Math.floor(ctx.random() * 2)] : ''
  return { attr: packAttrs(o), title }
}
// multipliers for a creature from its state.attr
export function npcMul(st) {
  const a = attrsOf(st)
  return { hp: 0.5 + a.h * 0.1, dmg: (0.5 + a.h * 0.1) * (st?.follow && st.cperk === 'gunhand' ? 1.4 * (1 + (st.loyal ?? 50) / 400) : 1) * (st?.vdmg ?? 1), speed: (0.8 + a.a * 0.04) * (st?.vspd ?? 1), sight: 0.7 + a.o * 0.06, loot: 0.6 + a.l * 0.08, scale: 0.94 + a.h * 0.012 }
}
// state for a new creature: its hp scaled by hardiness and its own attributes and title
export function npcState(ctx, kind, baseHp, extra = {}) {
  const r = rollNpc(ctx, kind), m = npcMul({ attr: r.attr })
  const hp = Math.max(1, Math.round(baseHp * m.hp * D.enemyHp)) // data/difficulty.yml
  return { hp, maxHp: hp, attr: r.attr, title: r.title, ...extra }
}
