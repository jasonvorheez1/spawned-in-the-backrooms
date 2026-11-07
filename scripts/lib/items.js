// The items you can loot, as short text tokens so a container can keep its contents in one state string:
//   "almond"  "ammo"  "shells"  "weapon:<kind>"  "cloth:<slot>:<kind>:<hex>"  a container's state.items is "almond,weapon:bat,ammo"
// scripts/interact.js reads and writes them, scripts/loot-ui.js names them, scripts/player.js applies them.
import L from './data/level0.yml'
import W from './weapons.js'
import { tokenWeight, SKILLS } from './stats.js'
import L1 from './data/level1.yml'
import { parseCloth, CLOTHES } from './clothes.js'

export const itemsOf = (str) => (str ? String(str).split(',').filter(Boolean) : [])

// the token of a loose item on the floor, from its tag and state
export const tokenOf = (tag, o) => (tag === 'weapon' ? 'weapon:' + (o?.state?.kind ?? 'table_leg') : tag)

// what a token is called and what it does, for the prompt and the loot menu
export function describe(token) {
  const d = describe0(token)
  const kg = ['ration', 'bandage', 'battery', 'kit'].includes(token) || token.startsWith('book:') ? 0 : token === 'ammo' ? W.ammo.perPickup * 0.03 : token === 'shells' ? W.shells.perPickup * 0.07 : tokenWeight(token)
  return kg ? { ...d, info: d.info + ` · ${kg.toFixed(1)} kg` } : d
}
function describe0(token) {
  if (token === 'almond') return { name: 'Almond water', info: `+${L.almondHp} HP · +${L.almondSanity} sanity`, color: '#f3e7b0' }
  if (token === 'ammo') return { name: 'Pistol rounds', info: `x${W.ammo.perPickup}`, color: '#e9c46a' }
  if (token === 'shells') return { name: 'Shotgun shells', info: `x${W.shells.perPickup}`, color: '#e76f51' }
  if (token === 'ration') return { name: 'Canned ration', info: `+${L1.rationHp} HP · +${L1.rationSanity} sanity`, color: '#c9b48a' }
  if (token === 'bandage') return { name: 'Bandage', info: `+${L1.bandageHp} HP`, color: '#f2f2ee' }
  if (token === 'battery') return { name: 'Battery', info: `+${L1.batteryCharge}% light`, color: '#9fd3ff' }
  if (token === 'kit') return { name: 'Repair kit', info: 'Mends your weapon', color: '#d9b27a' }
  if (token.startsWith('book:')) { const k = SKILLS.find((x) => x.k === token.slice(5)); return { name: `Skill book: ${k?.name ?? '?'}`, info: `+3 ${k?.name ?? ''}`, color: '#7fd1a8' } }
  if (token.startsWith('cloth:')) { // a garment: "cloth:<slot>:<kind>:<hex>"
    const p = parseCloth(token)
    if (!p) return { name: 'Rags', info: '', color: '#cccccc' }
    const r = CLOTHES.rarity[p.row.rarity] ?? {}
    return { name: p.row.name, info: `${r.label ?? ''} · DR ${p.row.dr}`, color: r.color ?? '#cccccc' }
  }
  if (token.startsWith('weapon:')) {
    const k = token.slice(7), w = W[k]
    if (!w) return { name: 'Something', info: '', color: '#cccccc' }
    const r = W.rarities?.[w.rarity] ?? {}
    return { name: w.name, info: `${r.label ?? ''} · DMG ${w.damage} · LV ${w.minLevel}${w.ranged ? ' · ranged' : ''}`, color: r.color ?? '#cccccc' }
  }
  return { name: token, info: '', color: '#cccccc' }
}
