// Shared RPG Modifier Engine (Fallout: New Vegas architecture):
// Single source of truth for permanent Skill Book bonuses, temporary timed effects
// (magazines, medicine, food/drinks, debuffs), and equipped armor/gear passive modifiers.
import { HOUR_MS } from './clock.js'
import { wornRows } from './clothes.js'
import { armorCnd } from './condition.js'
import BM from './data/books-magazines.yml'

export const ATTR_KEYS = ['h', 'a', 'l', 'o', 'g', 'e', 'n']
export const ATTR_NAMES = {
  h: 'Hardiness',
  a: 'Agility',
  l: 'Luck',
  o: 'Observation',
  g: 'Gab',
  e: 'Endurance',
  n: 'Noggin',
}
export const ATTR_SHORT = { h: 'HAR', a: 'AGI', l: 'LCK', o: 'OBS', g: 'GAB', e: 'END', n: 'NOG' }

export const SKILL_NAMES = {
  barter: 'Barter',
  energy: 'Energy Weapons',
  explosives: 'Explosives',
  guns: 'Guns',
  lockpick: 'Lockpicking',
  medicine: 'Medicine',
  melee: 'Melee Weapons',
  repair: 'Repair',
  science: 'Science',
  sneak: 'Sneak',
  speech: 'Speech',
  survival: 'Survival',
  unarmed: 'Unarmed',
}

export const DERIVED_LABELS = {
  maxHp: 'Max HP',
  maxSan: 'Max Sanity',
  carryMax: 'Carry Weight',
  coldResist: 'Cold Resist',
  heatResist: 'Heat Resist',
  moveSpeed: 'Move Speed',
  stamRegen: 'Stamina Regen',
  crit: 'Crit Chance',
  dr: 'Damage Resist',
  dmgMul: 'Damage',
  bleedImmune: 'Bleed Immunity',
}

export const GAME_MIN_MS = HOUR_MS / 60 // clock.js: 25,000 ms / 60 = 416.67 ms per in-game minute
export const BOOKS = BM.books ?? {}
export const UNIQUE_BOOKS = BM.uniqueBooks ?? {}
export const MAGS = BM.magazines ?? {}
export const BOOK_DEFAULT_BONUS = BM.bookBonusDefault ?? 3
export const BOOK_GENERIC_CAP = BM.bookCapPerGeneric ?? 2
export const MAG_DEFAULT_BONUS = BM.magazineBonusDefault ?? 10
export const MAG_DEFAULT_GAME_MIN = BM.magazineDurationGameMin ?? 120

export function clockNow(ctx) {
  if (typeof ctx?.now === 'function') return ctx.now() + (ctx.world?.state?.clockSkip ?? 0)
  return 0
}

export function gameMinToMs(mins) {
  return Math.max(0, Math.round((Number(mins) || 0) * GAME_MIN_MS))
}

export function formatGameMinutes(mins) {
  const m = Math.max(0, Math.ceil(Number(mins) || 0))
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h > 0 && rem > 0) return `${h}h ${rem}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export function getBookSpec(token) {
  if (typeof token !== 'string') return null
  if (token.startsWith('ubook:')) {
    const id = token.slice(6)
    const row = UNIQUE_BOOKS[id]
    if (!row) return null
    return {
      token,
      kind: 'unique',
      id,
      skill: row.skill,
      skillName: SKILL_NAMES[row.skill] ?? row.skill,
      bonus: row.bonus ?? BOOK_DEFAULT_BONUS,
      title: row.title,
      desc: row.desc,
      place: row.place ?? '',
      value: row.value ?? 150,
      kg: row.kg ?? 0.3,
      rarity: 'unique',
    }
  }
  if (token.startsWith('book:')) {
    const skill = token.slice(5)
    const row = BOOKS[skill]
    if (!row) return null
    return {
      token,
      kind: 'generic',
      id: skill,
      skill,
      skillName: SKILL_NAMES[skill] ?? skill,
      bonus: row.bonus ?? BOOK_DEFAULT_BONUS,
      title: row.title,
      desc: row.desc,
      place: '',
      value: row.value ?? 140,
      kg: row.kg ?? 0.3,
      rarity: row.rarity ?? 'rare',
    }
  }
  return null
}

export function getMagSpec(token) {
  if (typeof token !== 'string' || !token.startsWith('mag:')) return null
  const skill = token.slice(4)
  const row = MAGS[skill]
  if (!row) return null
  const durationMin = row.durationMin ?? MAG_DEFAULT_GAME_MIN
  return {
    token,
    skill,
    skillName: SKILL_NAMES[skill] ?? skill,
    bonus: row.bonus ?? MAG_DEFAULT_BONUS,
    durationMin,
    durationMs: gameMinToMs(durationMin),
    title: row.title,
    desc: row.desc,
    value: row.value ?? 28,
    kg: row.kg ?? 0.1,
    color: row.color ?? '#9fd3ff',
    stackingGroup: `mag_${skill}`,
  }
}

export function isBookToken(t) {
  return typeof t === 'string' && (t.startsWith('book:') || t.startsWith('ubook:'))
}

export function isMagToken(t) {
  return typeof t === 'string' && t.startsWith('mag:')
}

export function pruneEffects(s, nowMs) {
  if (!s || !Array.isArray(s.effects) || s.effects.length === 0) return false
  const before = s.effects.length
  const kept = s.effects.filter((e) => e && typeof e === 'object' && (e.expiresAt == null || Number(nowMs) < e.expiresAt))
  if (kept.length === before) return false
  s.effects = kept
  return true
}

function modMagnitudeScore(mods) {
  if (!mods || typeof mods !== 'object') return 0
  let total = 0
  for (const v of Object.values(mods)) {
    const n = Number(v)
    if (Number.isFinite(n)) total += Math.abs(n)
  }
  return total
}

export function applyEffect(ctx, s, spec) {
  if (!s || !spec) return null
  const nowMs = spec.nowMs ?? clockNow(ctx)
  pruneEffects(s, nowMs)
  const durMs = spec.durationMs != null ? spec.durationMs : gameMinToMs(spec.durationGameMin ?? 0)
  if (!durMs || durMs <= 0) return null
  const group = spec.stackingGroup ?? spec.id ?? spec.sourceItemId ?? spec.name
  const policy = spec.policy ?? 'refresh'
  const list = Array.isArray(s.effects) ? [...s.effects] : []
  const existingIdx = list.findIndex((e) => (e.stackingGroup ?? e.id) === group)
  const entry = {
    id: spec.id ?? `${group}:${nowMs}`,
    sourceItemId: spec.sourceItemId ?? '',
    name: spec.name ?? 'Effect',
    kind: spec.kind ?? 'consumable',
    stackingGroup: group,
    policy,
    startedAt: nowMs,
    expiresAt: nowMs + durMs,
    mods: { ...(spec.mods ?? {}) },
    ...(spec.debuff ? { debuff: { ...spec.debuff } } : {}),
    positive: spec.positive ?? true,
    note: spec.note ?? '',
  }
  if (existingIdx >= 0) {
    const cur = list[existingIdx]
    if (policy === 'keep') return cur
    if (policy === 'strongest' && modMagnitudeScore(cur.mods) > modMagnitudeScore(entry.mods)) return cur
    list[existingIdx] = entry
  } else {
    list.push(entry)
  }
  s.effects = list
  return entry
}

export function clearEffects(s, predicate) {
  if (!s || !Array.isArray(s.effects)) return 0
  const before = s.effects.length
  s.effects = s.effects.filter((e) => e && !predicate(e))
  return before - s.effects.length
}

export function canReadBook(s, token, permSkillValue) {
  const spec = getBookSpec(token)
  if (!spec) return { ok: false, reason: 'invalid', msg: 'Unknown skill book.' }
  if (spec.kind === 'unique' && s?.readBooks?.[spec.id]) {
    return { ok: false, reason: 'already_read', spec, msg: `You have already absorbed everything in "${spec.title}".` }
  }
  if (spec.kind === 'generic' && (s?.genericBooksRead?.[spec.skill] ?? 0) >= BOOK_GENERIC_CAP) {
    return { ok: false, reason: 'edition_limit', spec, msg: `You have already learned all you can from "${spec.title}" editions.` }
  }
  if ((permSkillValue ?? 0) >= 100) {
    return { ok: false, reason: 'maxed', spec, msg: `${spec.skillName} is already at 100.` }
  }
  return { ok: true, spec }
}

export function readSkillBook(s, token, permSkillValue, nowMs = 0) {
  const chk = canReadBook(s, token, permSkillValue)
  if (!chk.ok) return chk
  const spec = chk.spec
  const room = Math.max(0, 100 - (permSkillValue ?? 0))
  const gained = Math.min(spec.bonus, room)
  if (gained <= 0) return { ok: false, reason: 'maxed', spec, msg: `${spec.skillName} is already at 100.` }
  s.bookBonuses = { ...(s.bookBonuses ?? {}), [spec.skill]: (s.bookBonuses?.[spec.skill] ?? 0) + gained }
  if (spec.kind === 'unique') {
    s.readBooks = { ...(s.readBooks ?? {}), [spec.id]: nowMs || true }
  } else {
    s.genericBooksRead = { ...(s.genericBooksRead ?? {}), [spec.skill]: (s.genericBooksRead?.[spec.skill] ?? 0) + 1 }
  }
  return { ok: true, spec, gained }
}

function addModsInto(target, mods, sources, label, kind) {
  if (!mods || typeof mods !== 'object') return
  for (const [k, raw] of Object.entries(mods)) {
    const val = Number(raw)
    if (!Number.isFinite(val) || val === 0) continue
    target[k] = (target[k] ?? 0) + val
    if (sources) {
      sources[k] ??= []
      sources[k].push({ label, val, kind })
    }
  }
}

export function collectGearModifiers(s) {
  const mods = {}, sources = {}
  const look = s?.look
  if (look) {
    for (const row of wornRows(look)) {
      if (!row?.mods || armorCnd(look, row.token) < 0.5) continue
      addModsInto(mods, row.mods, sources, row.name, 'gear')
    }
  }
  return { mods, sources }
}

export function collectModifiers(s, nowMs) {
  const attrs = {}
  for (const k of ATTR_KEYS) attrs[k] = 0
  const bookSkills = { ...(s?.bookBonuses ?? {}) }
  const effectSkills = {}
  const gearSkills = {}
  const derived = {
    maxHp: 0,
    maxSan: 0,
    carryMax: 0,
    coldResist: 0,
    heatResist: 0,
    moveSpeed: 0,
    stamRegen: 0,
    crit: 0,
    dr: 0,
    dmgMul: 0,
    bleedImmune: 0,
    hpPerSec: 0,
    sanityPerSec: 0,
  }
  const sources = {}
  const active = []

  // 1. Equipped clothes/armor passives
  const gear = collectGearModifiers(s)
  for (const [k, v] of Object.entries(gear.mods)) {
    if (k in attrs) attrs[k] += v
    else if (k in SKILL_NAMES) gearSkills[k] = (gearSkills[k] ?? 0) + v
    else if (k in derived) derived[k] += v
  }
  for (const [k, arr] of Object.entries(gear.sources)) {
    sources[k] ??= []
    sources[k].push(...arr)
  }

  // 2. Active timed effects (magazines, medicine, consumables, debuffs)
  const rawEffects = Array.isArray(s?.effects) ? s.effects : []
  const tNow = nowMs ?? s?._clockNow ?? null
  for (const e of rawEffects) {
    if (!e || typeof e !== 'object') continue
    if (tNow != null && e.expiresAt != null && Number(tNow) >= e.expiresAt) continue
    const leftMs = e.expiresAt != null && tNow != null ? Math.max(0, e.expiresAt - Number(tNow)) : null
    const leftGameMin = leftMs != null ? Math.ceil(leftMs / GAME_MIN_MS) : null
    active.push({ ...e, leftMs, leftGameMin })
    for (const [k, raw] of Object.entries(e.mods ?? {})) {
      const v = Number(raw)
      if (!Number.isFinite(v) || v === 0) continue
      if (k in attrs) attrs[k] += v
      else if (k in SKILL_NAMES) effectSkills[k] = (effectSkills[k] ?? 0) + v
      else if (k in derived) derived[k] += v
      sources[k] ??= []
      sources[k].push({ label: e.name, val: v, kind: e.kind ?? 'effect', leftGameMin })
    }
    if (e.debuff) {
      if (Number.isFinite(e.debuff.hpPerSec)) derived.hpPerSec += e.debuff.hpPerSec
      if (Number.isFinite(e.debuff.sanityPerSec)) derived.sanityPerSec += e.debuff.sanityPerSec
    }
  }

  // 3. Total combined skill deltas
  const totalSkills = {}
  for (const k of Object.keys(SKILL_NAMES)) {
    const sum = (bookSkills[k] ?? 0) + (effectSkills[k] ?? 0) + (gearSkills[k] ?? 0)
    if (sum !== 0) totalSkills[k] = sum
    if (bookSkills[k]) {
      sources[k] ??= []
      sources[k].push({ label: 'Skill Books', val: bookSkills[k], kind: 'book' })
    }
  }

  return { attrs, bookSkills, effectSkills, gearSkills, totalSkills, derived, active, sources }
}

export function formatModPair(k, v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return ''
  const sign = n > 0 ? '+' : ''
  if (k === 'bleedImmune') return n > 0 ? 'Bleed Immune' : ''
  if (k in ATTR_SHORT) return `${ATTR_SHORT[k]} ${sign}${n}`
  if (k in SKILL_NAMES) return `${SKILL_NAMES[k]} ${sign}${n}`
  if (k === 'coldResist' || k === 'heatResist') return `${DERIVED_LABELS[k]} ${sign}${n}%`
  if (k === 'moveSpeed' || k === 'stamRegen' || k === 'dmgMul') return `${DERIVED_LABELS[k]} ${sign}${Math.round(n * 100)}%`
  if (k === 'crit') return `Crit ${sign}${Math.round(n * 100)}%`
  if (k === 'carryMax') return `Carry ${sign}${n} kg`
  return `${DERIVED_LABELS[k] ?? k} ${sign}${n}`
}

export function formatModsList(mods) {
  if (!mods || typeof mods !== 'object') return []
  const out = []
  for (const [k, v] of Object.entries(mods)) {
    const s = formatModPair(k, v)
    if (s) out.push(s)
  }
  return out
}
