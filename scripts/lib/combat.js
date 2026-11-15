// The combat maths in one place (data: scripts/lib/data/combat.yml). Pure functions.
import C from './data/combat.yml'
import W from './weapons.js'

const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
// the share of the target's armor a weapon's hit ignores
export function penOf(wp, key) {
  if (!wp) return 0
  if (wp.pen != null) return clamp(wp.pen, 0, C.pen.max)
  if (wp.ranged) return clamp(wp.pellets ? C.pen.pellet : C.pen.gunBase + ((wp.mv ?? 330) - 300) * C.pen.gunPerMv, 0, C.pen.max)
  if (wp.name === 'Fists') return C.pen.fists
  if (wp.sneak) return C.pen.stab
  if ((wp.damage ?? 0) >= 50) return C.pen.heavy
  return (W.blade ?? []).includes(key) ? C.pen.blade : C.pen.blunt
}
// damage through armor: DR is cut by penetration, then the hit is reduced by a share that grows with DR and shrinks as the hit grows
export function mitigated(dr, dmg, pen = 0) {
  if (!(dmg > 0)) return dmg
  const e = Number.isFinite(dr) ? Math.max(0, dr * (1 - (Number.isFinite(pen) ? pen : 0))) : 0, r = Math.min(C.armor.maxRed, e / (e + C.armor.k * dmg + C.armor.c))
  return Math.max(1, Math.round(dmg * (1 - r)))
}
// each hit's own roll: 90% to 110%
export const vary = (ctx, dmg) => dmg * (1 + (ctx.random() * 2 - 1) * C.variance)
export const headMul = (pellets) => (pellets > 1 ? C.head.pellet : C.head.bullet)
// spread multiplier from who is holding the gun and how: Observation, how long the sights have been up, breath, nerves
export function steady(s, a, now) {
  let m = 1 - ((a?.o ?? 5) - 5) * C.spread.observation
  if (s.ads) m *= 1 + C.spread.settleBloom * Math.max(0, 1 - (now - (s.adsAt ?? 0)) / 1000 / C.spread.settle)
  if (s.winded) m *= C.spread.winded
  else if ((s.stamina ?? 100) < 20) m *= C.spread.tired
  if ((s.sanity ?? 100) < 25) m *= C.spread.frayed
  return Math.max(0.5, m)
}
