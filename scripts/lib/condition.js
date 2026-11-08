// Weapon and armor condition and repair, Fallout: New Vegas style. Data: scripts/lib/data/condition.yml.
// Pure helpers: scripts/player.js applies them to swings and hits, scripts/loot-ui.js shows them, scripts/talk.js reprices a repair.
import K from './data/condition.yml'

export const CAP = 100
const clamp = (c) => Math.max(0, Math.min(CAP, Number.isFinite(c) ? c : CAP))
export const cndOf = (s, key) => clamp(s?.['cnd_' + key] ?? CAP)
export const armorCnd = (look, token) => clamp(look?.cnd?.[token] ?? CAP)
export const isBroken = (c) => c < 0.5
export const band = (c) => (K.bands.find(([lo]) => c >= lo) ?? K.bands[K.bands.length - 1])[1]
export const bandColor = (c) => (c >= 70 ? '#9bd27a' : c >= 50 ? '#d8d070' : c >= 25 ? '#e0a050' : '#e06050')
// damage multiplier of a weapon at condition c
export const wMul = (c) => K.dmgFloor + (1 - K.dmgFloor) * clamp(c) / CAP
// chance a swing or shot slips or jams
export const jamChance = (c) => (c >= K.jamBelow ? 0 : K.jamMax * (1 - clamp(c) / K.jamBelow))
// share of its DR a garment keeps at condition c
export const drMul = (c) => (c < 0.5 ? 0 : K.drFloor + (1 - K.drFloor) * clamp(c) / CAP)
// how much a weapon wears with one use (melee swing or gun shot), before the repair-skill factor
export const useWear = (wp) => (wp.ranged ? 0.3 : 0.6) * (wp.wear ?? 1)
// armor wear from one hit that got through: { token: points } for each worn piece. rows: [{ token, slot, dr }]
export function armorWearFor(rows, dmg, skillWear = 1) {
  const out = {}
  for (const r of rows) {
    const h = Math.max(K.heavyMin, 1 - (r.dr ?? 0) * K.heavy)
    out[r.token] = dmg * K.armorWear * (K.slotShare[r.slot] ?? 0.1) * h * skillWear * 2.2
  }
  return out
}
// repair maths: what a given repair gives, capped by the player's Repair skill
export const repairAmount = {
  tape: () => K.repair.tape.weapon,
  tapeCap: () => K.repair.tape.cap,
  kit: (skill) => K.repair.kit.base + skill * K.repair.kit.perSkill,
  akit: (skill) => K.repair.akit.base + skill * K.repair.akit.perSkill,
  spare: (skill) => K.repair.spare.donor + skill * K.repair.spare.perSkill,
}
// a trader's price (cents) to bring something from c to 100: itemPrice is what they would sell it for
export const vendorCost = (itemPrice, c) => Math.max(K.repair.vendor.min, Math.ceil(Math.max(0, CAP - clamp(c)) * Math.max(1, itemPrice) * K.repair.vendor.perPoint))
