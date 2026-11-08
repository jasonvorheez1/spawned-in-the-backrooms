// Every weapon the game knows: weapons.yml's kinds plus each kind's variants, keyed "<kind>~<variant>" (crowbar~taped).
// A variant entry is its base with the variant's multipliers applied, so every W[k] reader works on it unchanged.
import Y from './data/weapons.yml'

const RAR = ['common', 'uncommon', 'rare', 'elite']
export const baseOf = (k) => String(k ?? 'fists').split('~')[0]
export const variantOf = (k) => String(k ?? '').split('~')[1] ?? null
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const fits = (k, w, v) => v.for.some((f) => f === k || (f === 'melee' && !w.ranged) || (f === 'ranged' && w.ranged) || (Y[f] ?? []).includes?.(k))

const W = { ...Y }
for (const k of Y.order.slice(1)) {
  const w = Y[k]
  for (const [vk, v] of Object.entries(Y.variants ?? {})) {
    if (!fits(k, w, v)) continue
    const m = (f) => (v[f] != null && w[f] != null ? w[f] * v[f] : w[f])
    const ri = Math.max(0, Math.min(RAR.length - 1, RAR.indexOf(w.rarity) + (v.rarity ?? 0)))
    W[k + '~' + vk] = {
      ...w, base: k, variant: vk, name: `${v.name} ${w.name.toLowerCase()}`,
      damage: Math.round(m('damage')), cooldown: +(m('cooldown')).toFixed(2), stamina: Math.round(m('stamina')), xp: Math.round(m('xp')),
      rarity: RAR[ri], cnd: v.cnd ?? null, look: v.look, tint: v.tint ?? null,
      ...(w.ranged ? {
        magSize: Math.max(1, Math.round(m('magSize'))), range: +(m('range')).toFixed(1), pellets: w.pellets ? Math.round(m('pellets')) : undefined,
        reloadTime: w.reloadTime ? +(m('reloadTime')).toFixed(2) : undefined,
        cone: w.cone,
        adsCone: v.cone != null ? +(1 - (1 - w.adsCone) * (v.look === 'sawn' ? 1 / v.cone : v.cone)).toFixed(4) : w.adsCone,
        muzzle: v.short && w.muzzle ? [w.muzzle[0], w.muzzle[1], +(w.muzzle[2] * v.short).toFixed(3)] : w.muzzle,
      } : {}),
    }
    // cone: the spread multiplier (0.7 = 30% tighter); a sawed-off widens by its inverse
    if (w.ranged && v.cone != null) W[k + '~' + vk].cone = +(1 - (1 - w.cone) * (v.look === 'sawn' ? 1 / v.cone : v.cone)).toFixed(4)
  }
}
// the variants a kind can roll, with their weights
export function rollVariant(ctx, k) {
  const opts = [[k, Y.variantPlain ?? 50]]
  for (const [vk, v] of Object.entries(Y.variants ?? {})) if (W[k + '~' + vk]) opts.push([k + '~' + vk, v.chance ?? 5])
  let r = ctx.random() * opts.reduce((a, o) => a + o[1], 0)
  for (const [key, c] of opts) { r -= c; if (r <= 0) return key }
  return k
}
// What a player of this level may find (the creator, 2026-11-08: no rare+ finds at level 1). Savi's picks:
// levels 1-2 common, 3-5 uncommon, 6-9 rare, 10+ elite. Applies to found loot only; anything you own still works.
export const rarityIdx = (k) => Math.max(0, RAR.indexOf(W[k]?.rarity ?? 'common'))
export const rarityCap = (level) => (level ?? 1) < 3 ? 0 : level < 6 ? 1 : level < 10 ? 2 : 3
export default W
