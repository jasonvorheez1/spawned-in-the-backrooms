import { needsMul } from './run-opts.js'

// Food and water use separate thresholds; the combined penalty never prevents recovery.
export function staminaFromNeeds(s) {
  if (!needsMul(s)) return 1
  const food = s.hunger ?? 100, water = s.thirst ?? 100
  if (food >= 75 && water >= 75) return 1.08
  const factor = n => n <= 0 ? 0.8 : n < 25 ? 0.9 : 1
  return factor(food) * factor(water)
}

export function needsStatus(s) {
  if (!needsMul(s)) return 'Needs off'
  const food = s.hunger ?? 100, water = s.thirst ?? 100
  if (food >= 75 && water >= 75) return 'Fed & hydrated · stamina recovery +8%'
  if (food <= 0 || water <= 0) return 'Depleted · stamina recovery reduced'
  if (food < 25 || water < 25) return 'Low supplies · stamina recovery reduced'
  return 'Steady'
}

// Nov 17 rebalance (Savi's pick): the hurting stage. Stamina recovery pays first (above); only an EMPTY bar costs hp, slowly, and it never kills.
// hp per second to take off; 0 while fed, off-needs, or already at the floor. Numbers: data/craft.yml needs.emptyHpPerSec / emptyHpFloor.
export function needsHpDrain(s, maxHp, N = {}) {
  if (!needsMul(s)) return 0
  const empty = ((s.hunger ?? 100) <= 0 ? 1 : 0) + ((s.thirst ?? 100) <= 0 ? 1 : 0)
  if (!empty || (s.hp ?? maxHp) <= maxHp * (N.emptyHpFloor ?? 0.25)) return 0
  return empty * (N.emptyHpPerSec ?? 0.02)
}
