// Builders' god mode (Shelly, Nov 17: "builders should have access to god mode with every single weapon and armor").
// U toggles it, builders only. On: every weapon in weapons.yml, one of every armor garment (dr > 0) into the bag, ammo and
// throwables stocked, and hp/sanity/needs held full each tick so nothing hurts. Off: the gear stays, damage counts again.
// Sits before scripts/player.js in the player stack, so its refill lands before the death check reads hp.
import W from './lib/data/weapons.yml'
import CL from './lib/data/clothes.yml'
import THROW from './lib/data/throwables.yml'
import { maxHp, maxSan } from './player.js'
import { clothToken } from './lib/clothes.js'
const AMMO = ['ammo', 'shells', 'cells', 'rockets', 'latex', 'bolt325', 'flare70', 'sqfill']
function grant(s) {
  const have = new Set(String(s.weapons ?? '').split(',').filter(Boolean))
  for (const k of W.order) if (k !== 'fists' && W[k]) have.add(k)
  s.weapons = [...have].join(',')
  for (const k of AMMO) s[k] = Math.max(s[k] ?? 0, 999)
  for (const t of Object.values(THROW)) if (t && typeof t === 'object' && t.key) s[t.key] = Math.max(s[t.key] ?? 0, 20)
  const bag = String(s.clothes ?? '').split(',').filter(Boolean), seen = new Set(bag)
  for (const r of CL.rows) if ((r.dr ?? 0) > 0) { const tok = clothToken(r.slot, r.id, r.colours?.[0] ?? '2b2b33'); if (!seen.has(tok)) { seen.add(tok); bag.push(tok) } }
  s.clothes = bag.join(',')
}
export function onInput(ctx, input) {
  if (!input.pressed?.godMode) return
  const me = ctx.self, s = me.state
  if (!me.isEditor) return
  s.god = !s.god
  if (s.god) grant(s)
  s.notice = { text: s.god ? 'God mode on · every weapon and armor in your bag (I) · nothing can hurt you · U to turn off' : 'God mode off', at: ctx.now() }
  ctx.emit('playSound', { clip: s.god ? '/cdn/moodboard-toon-vibrant/sfx-power-up-shimmer-rise.mp3' : '/cdn/moodboard-toon-vibrant/sfx-power-down-soft-fall.mp3', volume: 0.5 }, { audience: { player: me.id } })
}
export function update(ctx) {
  const me = ctx.self, s = me.state
  if (!s.god) return
  if (!me.isEditor) { s.god = false; return }
  const lv = s.level ?? 1, mh = maxHp(lv, s), ms = maxSan(lv, s)
  if ((s.hp ?? mh) < mh) s.hp = mh
  if ((s.sanity ?? ms) < ms) s.sanity = ms
  if ((s.hunger ?? 100) < 100) s.hunger = 100
  if ((s.thirst ?? 100) < 100) s.thirst = 100
  if (s.equipped && s.equipped !== 'fists' && (s['cnd_' + s.equipped] ?? 100) < 100) s['cnd_' + s.equipped] = 100
}
