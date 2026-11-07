// Recipe checks shared by scripts/craft.js (the actions) and scripts/craft-ui.js (the menu).
import C from './data/craft.yml'
import { skillsOf } from './stats.js'
const have = (s, k) => s.scrap?.[k] ?? 0
export function recipeStatus(s, id) {
  const r = C.recipes[id], sk = skillsOf(s)
  const lack = Object.entries(r.in).filter(([k, n]) => have(s, k) < n).map(([k]) => k)
  const need = r.skill ? r.skill[1] : 0, got = r.skill ? sk[r.skill[0]] ?? 0 : 0
  return { ok: !lack.length && got >= need && (!r.bench || s.craftOpen === 'bench'), lack, skillOk: got >= need, benchOk: !r.bench || s.craftOpen === 'bench', got, need }
}

// how many times over you could make it from the scrap you carry right now
export function maxMakes(s, id) {
  const r = C.recipes[id]
  return Math.min(...Object.entries(r.in).map(([k, n]) => Math.floor(have(s, k) / n)))
}
export const CATS = [['all', 'ALL'], ['ready', 'READY'], ['weapons', 'WEAPONS'], ['ammo', 'AMMO'], ['aid', 'AID'], ['tools', 'TOOLS'], ['armor', 'ARMOR']]
