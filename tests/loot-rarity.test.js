import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
mock.module('../scripts/mat-cloth.js', () => ({ PRINTS: {} }))
const { default: W, rarityIdx, rarityCap, rollVariant } = await import('../scripts/lib/weapons.js')
const { rollWeapon, rollItem, gateItems, poolOf } = await import('../scripts/lib/loot.js')
const { leveledRows } = await import('../scripts/lib/clothes.js')
const { describe } = await import('../scripts/lib/items.js')
const { sellables } = await import('../scripts/lib/npc-talk.js')
function rng(seed = 12345) { return { random: () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 } } }

test('legendary identifies a placed unique without turning starter rewards into power spikes', () => {
  expect(W.raygun.rarity).toBe('legendary'); expect(rarityIdx('raygun')).toBe(4)
  expect(describe('weapon:raygun').info).toContain('LEGENDARY'); expect(describe('weapon:raygun').info).toContain('Energy Weapons 35')
  expect(W['revolver~lucky13'].rarity).toBe('uncommon')
  expect(sellables({weapons:'raygun,pistol'}).find(x => x[0] === 'weapon:raygun')[2]).toBeGreaterThan(sellables({weapons:'pistol'}).find(x => x[0] === 'weapon:pistol')[2])
})
test('authored unique weapons and variants survive loot gating', () => {
  const ctx = rng(); const source = 'weapon:raygun,weapon:revolver~lucky13,weapon:shotgun~pipe'
  expect(gateItems(ctx, source, 1)).toBe(source)
  expect(rarityCap(1)).toBe(0); expect(rarityCap(10)).toBe(3)
})
test('random loot never selects named unique weapons or zero-chance variants', () => {
  expect(rollVariant({random: () => 0}, 'revolver')).toBe('revolver')
  expect(rollVariant({random: () => 0.999999}, 'carbine')).not.toMatch(/~(cpissue|qmissue|wwissue|bntgissue|vaultissue)$/)
  const ctx = rng()
  for (let i = 0; i < 8000; i++) {
    const k = rollWeapon(ctx, 'l0', 4)
    expect(W[k].unique).not.toBe(true); expect(k).not.toBe('raygun'); expect(W[k].rarity).not.toBe('legendary')
    const v = rollVariant(ctx, 'revolver'); expect(v).not.toContain('lucky13')
  }
})
test('level 0 loot favors supplies, and elite apparel is genuinely rare', () => {
  const ctx = rng(7); let weapons = 0, supplies = 0
  for (let i = 0; i < 10000; i++) { const t = rollItem(ctx); if (t.startsWith('weapon:')) weapons++; if (['almond','ration','beans','bar','ammo','shells'].includes(t)) supplies++ }
  expect(weapons).toBeGreaterThan(300); expect(weapons).toBeLessThan(800); expect(supplies).toBeGreaterThan(weapons * 5)
  expect(leveledRows(17).some(([r]) => r.id === 'asyncvisor')).toBe(false)
  expect(leveledRows(18).some(([r]) => r.id === 'asyncvisor')).toBe(true)
  expect(poolOf('level109')).toBe('l109'); expect(poolOf('level26')).toBe('l26')
})

test('level-specific weapons actually enter their own pools', () => {
  const ctx = rng(81), pool70 = new Set(), pool31 = new Set()
  for (let i = 0; i < 5000; i++) { pool70.add(rollWeapon(ctx, 'l70').split('~')[0]); pool31.add(rollWeapon(ctx, 'l31').split('~')[0]) }
  expect(pool70.has('scrapper70')).toBe(true); expect(pool70.has('icepick70')).toBe(true); expect(pool70.has('flaregun70')).toBe(true)
  expect(pool31.has('squirt_gun')).toBe(true); expect(pool31.has('scrapper70')).toBe(false)
})
