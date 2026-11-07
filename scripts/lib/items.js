// The items you can loot, as short text tokens so a container can keep its contents in one state string:
//   "almond"  "ammo"  "shells"  "weapon:<kind>"        a container's state.items is "almond,weapon:bat,ammo"
// scripts/interact.js reads and writes them, scripts/loot-ui.js names them, scripts/player.js applies them.
import L from './data/level0.yml'
import W from './data/weapons.yml'

export const itemsOf = (str) => (str ? String(str).split(',').filter(Boolean) : [])

// the token of a loose item on the floor, from its tag and state
export const tokenOf = (tag, o) => (tag === 'weapon' ? 'weapon:' + (o?.state?.kind ?? 'table_leg') : tag)

// what a token is called and what it does, for the prompt and the loot menu
export function describe(token) {
  if (token === 'almond') return { name: 'Almond water', info: `+${L.almondHp} HP · +${L.almondSanity} sanity`, color: '#f3e7b0' }
  if (token === 'ammo') return { name: 'Pistol rounds', info: `x${W.ammo.perPickup}`, color: '#e9c46a' }
  if (token === 'shells') return { name: 'Shotgun shells', info: `x${W.shells.perPickup}`, color: '#e76f51' }
  if (token.startsWith('weapon:')) {
    const k = token.slice(7), w = W[k]
    if (!w) return { name: 'Something', info: '', color: '#cccccc' }
    const r = W.rarities?.[w.rarity] ?? {}
    return { name: w.name, info: `${r.label ?? ''} · DMG ${w.damage} · LV ${w.minLevel}${w.ranged ? ' · ranged' : ''}`, color: r.color ?? '#cccccc' }
  }
  return { name: token, info: '', color: '#cccccc' }
}
