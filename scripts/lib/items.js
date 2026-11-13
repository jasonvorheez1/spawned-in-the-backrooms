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
  const kg = token.startsWith('cash:') ? 0 : token.startsWith('meat:') ? 0.3 : ['ration', 'bandage', 'battery', 'kit', 'akit', 'bobbypin', 'compass', 'nvg', 'skates', 'royal_ration', ...L2_NOW].includes(token) || token.startsWith('book:') || token.startsWith('page:') ? 0 : token === 'ammo' ? W.ammo.perPickup * 0.03 : token === 'shells' ? W.shells.perPickup * 0.07 : tokenWeight(token)
  return kg ? { ...d, info: d.info + ` · ${kg.toFixed(1)} kg` } : d
}
// Level 2's finds: eaten, wrapped or taped on the spot, or keys you carry (fuse, valve wheel, keycard) that open its doors
import L2 from './data/level2.yml'
import BRK from './data/breakables.yml'
import L3I from './data/l3items.yml'
import SNACKS from './data/snacks.yml'
export const L2_NOW = ['lobby_wafer', 'beans', 'bar', 'firstaid', 'tape', ...Object.keys(SNACKS)]
export const L2_KEYS = { fuse: 'fuses', valve: 'valves', keycard: 'keycards' }
const L2_DESC = {
  ...Object.fromEntries(Object.entries(SNACKS).map(([k, v]) => [k, () => ({ name: v.name, info: `${v.info} · ${v.drink ? `+${v.thirst} thirst` : `+${v.hunger} hunger`}`, color: v.color })])),
  lobby_wafer: () => ({ name: 'Lobby Wafers', info: `A damp sleeve of yellow vanilla wafers. They taste like the wallpaper looks. +${L2.use.waferHp} HP · +${L2.use.waferSanity} sanity`, color: '#f2d36b' }),
  beans: () => ({ name: 'Canned beans', info: `+${L2.use.beansHp} HP · +${L2.use.beansSanity} sanity`, color: '#d9a35a' }),
  bar: () => ({ name: 'Energy bar', info: `+${L2.use.barHp} HP · stamina`, color: '#e8c44a' }),
  firstaid: () => ({ name: 'First aid kit', info: `+${L2.use.firstaidHp} HP`, color: '#f05a4f' }),
  tape: () => ({ name: 'Duct tape', info: 'Patches a weapon +15%, never past 45% (I menu > REPAIR)', color: '#b8c0c8' }),
  fuse: () => ({ name: 'Fuse', info: 'Opens an ELECTRICAL door', color: '#7fc8ff' }),
  valve: () => ({ name: 'Valve wheel', info: 'Opens a PUMP ROOM door', color: '#e05a3a' }),
  frag: () => ({ name: 'Frag grenade', info: 'G throws it. Bounces, 2 s fuse, 6 m blast', color: '#9aa58a' }),
  bauble: () => ({ name: 'Glass Bauble', info: 'G throws it. Shatters into glitter, dazes what stands near for 3 s', color: '#d8323c' }),
  stuffing: () => ({ name: 'Stuffing', info: 'White, clean, cold. It came out of something that looked like you', color: '#f2efe6' }),
  molotov: () => ({ name: 'Molotov cocktail', info: 'G throws it. Shatters into a 7 s fire', color: '#e08a3a' }),
  keycard: () => ({ name: 'Keycard', info: 'Opens a STORAGE cage', color: '#9ff0b0' }),
}
// Meat: what Samantha takes for a reading (Level 5). Eaten from I > Aid for a little HP; quality tiers premium/good/poor.
export const MEAT = {
  steak:    { name: 'Raw steak',        tier: 'premium', hp: 18, food: 30, color: '#e0524a' },
  fish:     { name: 'Fresh fish',       tier: 'premium', hp: 14, food: 25, color: '#8fc6d8' },
  chicken:  { name: 'Chicken thigh',    tier: 'good',    hp: 12, food: 22, color: '#f0c49a' },
  spam:     { name: 'Tin of spam',      tier: 'good',    hp: 9,  food: 18, color: '#d98aa0' },
  sardines: { name: 'Tin of sardines',  tier: 'poor',    hp: 7,  food: 14, color: '#b8c4c8' },
  crab:     { name: 'Crawler leg meat', tier: 'good',    hp: 10, food: 20, color: '#e8a08a' },
  rat:      { name: 'Dead rat',         tier: 'poor',    hp: 3,  food: 8,  color: '#8a7a6a' },
}
const TIER = { premium: 'PREMIUM', good: 'GOOD', poor: 'POOR' }
// Backdollars: "cash:<cents>". A bill or a coin by its value; a wad is several bills (Savi's picks for the look)
export const CASH = { 100: ['Backdollar', '#9fcf8a'], 25: ['Backquarter', '#d8d8d0'], 5: ['Backnickel', '#c8c8c0'], 1: ['Backpenny', '#d08a5a'] }
export const money = (c) => '$' + (Math.max(0, c ?? 0) / 100).toFixed(2)
function describe0(token) {
  if (token.startsWith('cash:')) { const c = +token.slice(5) || 1, k = CASH[c]; return { name: k ? k[0] : `Backdollars (${money(c)})`, info: money(c) + ' · NPCs take it', color: k ? k[1] : '#9fcf8a' } }
  if (token.startsWith('meat:')) { const m = MEAT[token.slice(5)]; return m ? { name: m.name, info: `${TIER[m.tier]} meat · +${m.hp} HP eaten · Samantha's price`, color: m.color } : { name: 'Spoiled meat', info: '', color: '#777' } }
  if (BRK.scrap[token]) return { name: BRK.scrap[token].name, info: 'Building scrap · B to build', color: BRK.scrap[token].color }
  if (L2_DESC[token]) return L2_DESC[token]()
  if (token === 'royal_ration') return { name: 'Royal ration', info: `Full HP · +${L3I.royal_ration.sanity} sanity · rare`, color: '#ffd36a' }
  if (token === 'firesalt') return { name: 'Firesalt', info: `Rub on a melee weapon: x${L3I.firesalt.damage} damage for ${L3I.firesalt.seconds}s`, color: '#ff8a3a' }
  if (token === 'holo:matrix') return { name: 'Tape: "Expedition Log: Matrix"', info: 'Cmdr. Harris, his own voice. Play it on HALOGEN (I > Tapes)', color: '#ff9a6a' }
  if (token === 'holo:dina4') return { name: 'Tape: "Dina, Tape Four"', info: 'A cassette in Dina\'s handwriting, left at the checkpoint. Play it on HALOGEN (I > Misc)', color: '#ff9a6a' }
  if (token === 'holo:b8') return { name: 'Tape: "B8, Night Forty"', info: 'A cassette with a hallway count written on the label, crossed out and rewritten. Play it on HALOGEN (I > Tapes)', color: '#ff9a6a' }
  if (token === 'holo:walt41') return { name: 'Tape: "Field Test 41"', info: 'A reel labelled in pencil: KESSLER, R-55, TEST 41. Play it on HALOGEN (I > Misc)', color: '#ff9a6a' }
  if (token.startsWith('holo:')) return { name: 'Tape: "Atomic Age Defender"', info: 'A scuffed 1950s Backrooms Robotics ad reel. Play it on HALOGEN (I > Misc)', color: '#ff9a6a' }
  if (token.startsWith('page:')) { const n = +token.slice(5); return n === 24 ? { name: `Level 10 field log (${n})`, info: 'M.E.G. Scarecrow observation report from Level 10', color: '#ffd36a' } : n >= 21 && n <= 23 ? { name: `Level 0 field document (${n - 20})`, info: 'Survey report & survivor notes from Level 0', color: '#ded3a0' } : n >= 11 && n <= 17 ? { name: `Base Alef papers (${n - 10})`, info: 'Written by someone locked in Level 2.1', color: '#e8e0a8' } : { name: `Torn notebook page (${token.slice(5)})`, info: 'Someone wrote this in a hurry', color: '#e8dcc0' } }
  if (token === 'wheat_sheaf') return { name: 'Golden Wheat Sheaf', info: 'Reaped from Level 10 fields · Grind at the Windmill Quern', color: '#ffd36a' }
  if (token === 'flour_sack') return { name: 'Sack of Fresh Flour', info: 'Ground Backrooms grain · Bake at the Farmhouse Hearth', color: '#f5f6fa' }
  if (token === 'bread') return { name: 'Warm Homestead Loaf', info: 'Freshly baked Level 10 bread · +35 HP · +25 Sanity', color: '#e67e22' }
  if (token === 'sedco_drive') return { name: 'Sedco Master Security Drive', info: 'Encrypted CCTV & deposit records from Sedco Spotlight · Return to Courier', color: '#00d2d3' }
  if (token === 'crane_feather') return { name: 'Origami Lucky Crane Feather', info: "Imbued with Entity 14's calming presence · Sanity protection", color: '#ffffff' }
  if (token === 'canal_water') return { name: 'Canal Lock Almond Water', info: 'Fresh Almond Water drawn from the Grand Canal spillway', color: '#74b9ff' }
  if (token === 'nvg') return { name: 'Night vision goggles', info: 'See in the dark of Level 6 · F · drains battery', color: '#7cf08a' }
  if (token === 'skates') return { name: 'Roller skates', info: 'Quad skates from the Coach · roll on the rink instead of slipping', color: '#ff9a4a' }
  if (token === 'compass') return { name: 'Old compass', info: 'Senses what is near · wears out', color: '#d8b56a' }
  if (token === 'almond') return { name: 'Almond water', info: `+${L.almondHp} HP · +${L.almondSanity} sanity`, color: '#f3e7b0' }
  if (token === 'ammo') return { name: 'Pistol rounds', info: `x${W.ammo.perPickup}`, color: '#e9c46a' }
  if (token === 'cells') return { name: 'Energy cells', info: `x${W.cells.perPickup}`, color: '#7fe3ff' }
  if (token === 'shells') return { name: 'Shotgun shells', info: `x${W.shells.perPickup}`, color: '#e76f51' }
  if (token === 'ration') return { name: 'Canned ration', info: `+${L1.rationHp} HP · +${L1.rationSanity} sanity`, color: '#c9b48a' }
  if (token === 'bandage') return { name: 'Bandage', info: `+${L1.bandageHp} HP`, color: '#f2f2ee' }
  if (token === 'battery') return { name: 'Battery', info: `+${L1.batteryCharge}% light`, color: '#9fd3ff' }
  if (token === 'bobbypin' || token === 'pin' || token === 'bobby_pin') return { name: 'Bobby pin', info: 'Picks locks · snaps under strain', color: '#c8c4b8' }
  if (token === 'kit') return { name: 'Weapon repair kit', info: 'Mends a weapon (I menu > REPAIR) · up to your Repair skill', color: '#d9b27a' }
  if (token === 'akit') return { name: 'Armor repair kit', info: 'Mends every piece you wear · up to your Repair skill', color: '#9fb89a' }
  if (token.startsWith('book:')) { const k = SKILLS.find((x) => x.k === token.slice(5)); return { name: `Skill book: ${k?.name ?? '?'}`, info: `+3 ${k?.name ?? ''}`, color: '#7fd1a8' } }
  if (token.startsWith('cloth:')) { // a garment: "cloth:<slot>:<kind>:<hex>"
    const p = parseCloth(token)
    if (!p) return { name: 'Rags', info: '', color: '#cccccc' }
    const r = CLOTHES.rarity[p.row.rarity] ?? {}
    const fab = p.pat && p.pat !== p.row.pats?.[0] ? CLOTHES.patterns?.[p.pat] : '' // a texture variant names its cloth: "Plaid Long-sleeve shirt"
    return { name: fab ? `${fab} ${p.row.name}` : p.row.name, info: `${r.label ?? ''} · DR ${p.row.dr}`, color: r.color ?? '#cccccc' }
  }
  if (token.startsWith('weapon:')) {
    const k = token.slice(7), w = W[k]
    if (!w) return { name: 'Something', info: '', color: '#cccccc' }
    const r = W.rarities?.[w.rarity] ?? {}
    const rq = w.req ? ` · REQ ${[w.req.h && 'HAR ' + w.req.h, w.req.guns && 'GUNS ' + w.req.guns, w.req.melee && 'MELEE ' + w.req.melee].filter(Boolean).join(' ')}` : '' // what it takes to use it well (scripts/lib/stats.js handling)
    const fishHint = k.startsWith('fishing_rod') ? ' · Cast at lakes, canals or sea to fish' : ''
    return { name: w.name, info: `${r.label ?? ''} · DMG ${w.damage}${w.ranged ? ' · ranged' : ''}${w.two ? ' · two-handed' : ''}${fishHint}${rq}`, color: r.color ?? '#cccccc' }
  }
  return { name: token, info: '', color: '#cccccc' }
}
