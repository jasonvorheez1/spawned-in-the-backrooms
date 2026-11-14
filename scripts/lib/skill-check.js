import T from './data/talk.yml'
import { SKILLS, skillsOf } from './stats.js'

export const SKILL_NAMES = Object.fromEntries(SKILLS.map((k) => [k.k, k.name]))

const NAME_TO_KEY = Object.fromEntries(
  SKILLS.flatMap((k) => [[k.k, k.k], [k.name.toLowerCase(), k.k]])
)

// Normalizes structured `check` objects or legacy `"Speech 30"` / `"Energy Weapons 40"` tags.
export function parseCheck(choice) {
  if (!choice || typeof choice !== 'object') return null
  if (choice.check?.skill) {
    const skill = NAME_TO_KEY[String(choice.check.skill).toLowerCase()] ?? String(choice.check.skill).toLowerCase()
    const difficulty = Number(choice.check.difficulty) || 50
    return { skill, difficulty }
  }
  const tag = String(choice.tag ?? '').trim()
  const m = tag.match(/^([a-z][a-z\s]+?)\s+(\d+)(?:\s*·.*)?$/i)
  if (!m) return null
  const skill = NAME_TO_KEY[m[1].trim().toLowerCase()]
  if (!skill) return null
  return { skill, difficulty: Number(m[2]) || 50 }
}

// Single source of truth for skill check odds and difficulty band.
export function checkOdds(s, check, roll = T.roll ?? 20) {
  const skill = NAME_TO_KEY[String(check?.skill ?? '').toLowerCase()] ?? String(check?.skill ?? '').toLowerCase()
  const difficulty = Number(check?.difficulty) || 50
  const value = skillsOf(s ?? {})[skill] ?? 0
  const pct = Math.max(0, Math.min(100, Math.round((roll - (difficulty - value) + 1) / roll * 100)))
  const band = pct === 100 ? 'guaranteed' : pct >= 65 ? 'likely' : pct >= 35 ? 'risky' : pct > 0 ? 'unlikely' : 'impossible'
  return { skill, name: SKILL_NAMES[skill] ?? (skill ? skill[0].toUpperCase() + skill.slice(1) : 'Skill'), value, difficulty, pct, band }
}

export function formatCheckBanner(skill, pct, ok) {
  const name = SKILL_NAMES[skill] ?? (skill ? skill[0].toUpperCase() + skill.slice(1) : 'Skill')
  return `[${name} ${pct}%] ${ok ? 'SUCCEEDED' : 'FAILED'}`
}

// Resolves a skill roll (`skill + 1..roll >= difficulty`) and records `ctx._lastCheck` for dialogue logging.
export function resolveCheck(ctx, s, check) {
  const rollMax = T.roll ?? 20
  const odds = checkOdds(s, check, rollMax)
  const rand = typeof ctx?.random === 'function' ? ctx.random() : Math.random()
  const r = 1 + Math.floor(rand * rollMax)
  const ok = odds.value + r >= odds.difficulty
  const res = {
    ok,
    v: odds.value,
    r,
    ...odds,
    banner: formatCheckBanner(odds.skill, odds.pct, ok),
  }
  if (ctx && typeof ctx === 'object') {
    try { ctx._lastCheck = res } catch {}
  }
  return res
}
