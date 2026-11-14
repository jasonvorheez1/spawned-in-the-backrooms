// Every weapon the game knows: weapons.yml's kinds plus each kind's variants, keyed "<kind>~<variant>" (crowbar~taped).
// A variant entry is its base with the variant's multipliers applied, so every W[k] reader works on it unchanged.
import Y from './data/weapons.yml'

export const RARITIES = ['common', 'uncommon', 'rare', 'elite', 'legendary']
const RAR = RARITIES
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
    const ri = Math.max(0, Math.min(w.rarity === 'legendary' ? 4 : 3, RAR.indexOf(w.rarity) + (v.rarity ?? 0)))
    const req = v.reqDelta && w.req
      ? Object.fromEntries(Object.entries(w.req).map(([key, target]) => [key, Math.max(1, target + (v.reqDelta[key] ?? 0))]))
      : w.req
    W[k + '~' + vk] = {
      ...w, req, base: k, variant: vk, name: `${v.name} ${/^[A-Z.]{2,}/.test(w.name) ? w.name : w.name.toLowerCase()}`,
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
const FACTION_VARIANTS = {
  meg: { scout: 'cpissue', agent: 'qmissue', medic: 'qmissue', quarter: 'qmissue', guard: 'wwissue', captain: 'wwissue', default: 'qmissue' },
  bntg: { guard: 'vaultissue', captain: 'vaultissue', default: 'bntgissue' },
  trader: { guard: 'vaultissue', captain: 'vaultissue', default: 'bntgissue' },
  vault: { default: 'vaultissue' },
  surrender: { default: 'wwissue' },
  froid: { default: 'cpissue' },
}
function variantWeight(vk, v, lv, opts) {
  const f = opts?.faction
  if (f && FACTION_VARIANTS[f]) {
    const map = FACTION_VARIANTS[f], target = map[opts?.role] ?? map.default
    if (vk === target) return lv == null ? 14 : lv < 5 ? 0 : Math.min(36, 8 + (lv - 5) * 2.8)
  }
  if (v.unique || !(v.chance > 0)) return 0
  const base = v.chance ?? 5
  if (lv == null) return base
  const dr = v.rarity ?? 0
  if (dr < 0) return base * (lv <= 3 ? 1.45 : Math.max(0.22, 1.45 - (lv - 3) * 0.1))
  if (dr === 0) return base * (lv < 2 ? 0.65 : Math.min(1.25, 0.75 + (lv - 2) * 0.08))
  if (dr === 1) return lv < 3 ? 0 : base * (lv < 5 ? 0.55 : Math.min(2.1, 0.75 + (lv - 5) * 0.14))
  return lv < 6 ? 0 : base * Math.min(2.2, 0.5 + (lv - 6) * 0.18)
}
// the variants a kind can roll, with their weights scaled by level and optional faction affiliation
export function rollVariant(ctx, k, level, opts = {}) {
  const base = baseOf(k)
  if (!W[base] || W[base].unique) return k
  const lv = level != null ? Number(level) : opts?.level != null ? Number(opts.level) : (ctx?.self?.state?.level != null ? Number(ctx.self.state.level) : null)
  const cap = opts?.cap ?? (lv != null ? rarityCap(lv) : 3)
  const plainScale = lv == null ? 1 : lv <= 2 ? 1.15 : lv >= 10 ? 0.85 : 1
  const optsList = [[base, (Y.variantPlain ?? 50) * plainScale]]
  for (const [vk, v] of Object.entries(Y.variants ?? {})) {
    const full = base + '~' + vk
    if (!W[full]) continue
    const wt = variantWeight(vk, v, lv, opts)
    if (wt <= 0) continue
    if (lv != null && rarityIdx(full) > cap && !(opts?.faction && !v.unique && (v.chance ?? 0) === 0)) continue
    optsList.push([full, wt])
  }
  let r = ctx.random() * optsList.reduce((a, o) => a + o[1], 0)
  for (const [key, c] of optsList) { r -= c; if (r <= 0) return key }
  return base
}
// What a player of this level may find (the creator, 2026-11-08: no rare+ finds at level 1). Savi's picks:
// levels 1-2 common, 3-5 uncommon, 6-9 rare, 10+ elite. Applies to found loot only; anything you own still works.
export const authoredVariant = (k) => !!Y.variants?.[variantOf(k)]?.unique
export const rarityIdx = (k) => Math.max(0, RAR.indexOf(W[k]?.rarity ?? 'common'))
export const rarityCap = (level) => (level ?? 1) < 3 ? 0 : level < 6 ? 1 : level < 10 ? 2 : 3
export default W
