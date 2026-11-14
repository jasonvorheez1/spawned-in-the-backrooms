import { test, expect, mock } from 'bun:test'

mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
mock.module('../scripts/mat-cloth.js', () => ({ PRINTS: {} }))

const { default: W, baseOf, variantOf, rarityIdx, rarityCap, rollVariant } = await import('../scripts/lib/weapons.js')
const { rollWeapon, rollWeaponL1, rollWeaponL2, rollWeaponL5, gateItems } = await import('../scripts/lib/loot.js')
const { rollWeaponL3 } = await import('../scripts/lib/loot3.js')
const { rollCloth, npcLook, wornDR, leveledRows, CLOTHES } = await import('../scripts/lib/clothes.js')
const { npcGearLevel, rollNpcWeapon, rollNpcPocketLoot, adaptNpcWear } = await import('../scripts/lib/npc-gear.js')
const { sendSquad } = await import('../scripts/lib/hit-squad.js')

function rng(seed = 4242) {
  return {
    random: () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    },
  }
}

test('leveled weapon rolls gate minLevel and progressively shift weight upward with player level', () => {
  const ctx = rng(101)
  for (let i = 0; i < 400; i++) {
    const lv1 = baseOf(rollWeapon(ctx, 'l0', rarityCap(1), 1))
    expect(W[lv1].minLevel ?? 1).toBeLessThanOrEqual(1)
    expect(rarityIdx(lv1)).toBeLessThanOrEqual(rarityCap(1))

    const lv6 = baseOf(rollWeapon(ctx, 'l0', rarityCap(6), 6))
    expect(W[lv6].minLevel ?? 1).toBeLessThanOrEqual(6)
    expect(rarityIdx(lv6)).toBeLessThanOrEqual(rarityCap(6))
  }

  let l2LowHigh = 0, l2HiHigh = 0
  for (let i = 0; i < 300; i++) {
    const kLow = baseOf(rollWeaponL2(ctx, 2))
    expect(W[kLow].minLevel ?? 1).toBeLessThanOrEqual(2)
    if ((W[kLow].minLevel ?? 1) >= 6) l2LowHigh++

    const kHi = baseOf(rollWeaponL2(ctx, 12))
    if ((W[kHi].minLevel ?? 1) >= 6) l2HiHigh++
  }
  expect(l2LowHigh).toBe(0)
  expect(l2HiHigh).toBeGreaterThan(80)

  const l3HighSet = new Set()
  for (let i = 0; i < 400; i++) {
    const k1 = baseOf(rollWeaponL1(ctx, 2))
    expect(k1).not.toBe('wrench')
    expect(k1).not.toBe('rebar')
    l3HighSet.add(baseOf(rollWeaponL3(ctx, 13)))
    const k5 = baseOf(rollWeaponL5(ctx, 3))
    expect(k5).not.toBe('smg')
    expect(k5).not.toBe('coach_gun')
  }
  expect(l3HighSet.has('carbine') || l3HighSet.has('hunting_rifle') || l3HighSet.has('stun_baton')).toBe(true)
})

test('rollVariant scales variant rarity by level and unlocks faction issue only for faction callers', () => {
  const ctx = rng(777)
  let rustyLow = 0, plusLow = 0, rustyHigh = 0, plusHigh = 0
  for (let i = 0; i < 600; i++) {
    const a = rollVariant(ctx, 'crowbar', 1)
    if (variantOf(a) === 'rusty') rustyLow++
    if (rarityIdx(a) > rarityIdx('crowbar')) plusLow++

    const b = rollVariant(ctx, 'crowbar', 12)
    if (variantOf(b) === 'rusty') rustyHigh++
    if (rarityIdx(b) > rarityIdx('crowbar')) plusHigh++
    expect(b).not.toMatch(/~(cpissue|qmissue|wwissue|bntgissue|vaultissue)$/)
  }
  expect(plusLow).toBe(0)
  expect(plusHigh).toBeGreaterThan(40)
  expect(rustyLow).toBeGreaterThan(rustyHigh)

  let megIssues = 0
  for (let i = 0; i < 400; i++) {
    const v = rollVariant(ctx, 'carbine', 12, { faction: 'meg', role: 'guard' })
    if (variantOf(v) === 'wwissue') megIssues++
  }
  expect(megIssues).toBeGreaterThan(20)
})

test('gateItems enforces minLevel, preserves uniques, and upgrades starter junk for high-level finders', () => {
  const ctx = rng(999)
  const low = gateItems(ctx, 'weapon:shotgun,weapon:raygun,weapon:revolver~lucky13', 6, 'l0')
  const parts = low.split(',')
  expect(parts[1]).toBe('weapon:raygun')
  expect(parts[2]).toBe('weapon:revolver~lucky13')
  const rerolled = parts[0].slice(7)
  expect(W[rerolled].minLevel ?? 1).toBeLessThanOrEqual(6)

  let upgraded = 0
  for (let i = 0; i < 200; i++) {
    const out = gateItems(ctx, 'weapon:table_leg', 15, 'l0').slice(7)
    if (baseOf(out) !== 'table_leg') upgraded++
  }
  expect(upgraded).toBeGreaterThan(50)
})

test('clothes leveled lists cover newer places, exclude shop exclusives from loot, and fix npcLook NaN handling', () => {
  expect(CLOTHES.leveled.placeTier.level109).toBeGreaterThan(5)
  expect(CLOTHES.leveled.placeTier.level70).toBeGreaterThan(10)
  expect(CLOTHES.leveled.placeTier.level26).toBeGreaterThan(5)

  const ctx = rng(555)
  for (let i = 0; i < 800; i++) {
    const tok = rollCloth({ ...ctx, self: { state: { level: 12 }, place: 'main' } })
    const kind = tok.split(':')[2]
    const row = CLOTHES.rows.find((r) => r.id === kind)
    expect(row?.shop).not.toBe(true)
  }

  const undefinedLvLook = npcLook('guard-no-lv', {}, 'meg', undefined, 'guard')
  expect(undefinedLvLook.topw).not.toBe('none')
  expect(undefinedLvLook.botw).not.toBe('none')
  expect(undefinedLvLook.shoes).not.toBe('none')

  const drLow = [], drHigh = []
  for (let i = 0; i < 30; i++) {
    drLow.push(wornDR(npcLook(`g-${i}`, {}, 'meg', 3, 'guard')))
    drHigh.push(wornDR(npcLook(`g-${i}`, {}, 'meg', 16, 'guard')))
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length
  expect(avg(drHigh)).toBeGreaterThan(avg(drLow) + 2)
  expect(leveledRows(17).some(([r]) => r.id === 'asyncvisor')).toBe(false)
  expect(leveledRows(18).some(([r]) => r.id === 'asyncvisor')).toBe(true)
})

test('NPC gear level and weapon dispersion scale against player level and preserve matching corpse loot', () => {
  const l2Place = { id: 'level2' }
  const lowLv = npcGearLevel({ place: { ...l2Place, players: [{ id: 'p1', state: { level: 1 } }] } }, { id: 'guard-a', state: { role: 'guard', faction: 'meg' } })
  const midLv = npcGearLevel({ place: { ...l2Place, players: [{ id: 'p1', state: { level: 7 } }] } }, { id: 'guard-a', state: { role: 'guard', faction: 'meg' } })
  const hiLv = npcGearLevel({ place: { id: 'level1', players: [{ id: 'p1', state: { level: 14 } }] } }, { id: 'guard-a', state: { role: 'guard', faction: 'meg' } })
  expect(lowLv).toBeLessThanOrEqual(4)
  expect(midLv).toBeGreaterThan(lowLv)
  expect(hiLv).toBeGreaterThanOrEqual(10)

  const spreadVals = new Set()
  const weaponsLow = [], weaponsHigh = []
  for (let i = 0; i < 20; i++) {
    const npc = { id: `meg-guard-${i}`, tags: ['npc', 'meg'], state: { role: 'guard', faction: 'meg', nerve: 'steady' } }
    spreadVals.add(npcGearLevel({ place: { id: 'level2', players: [{ id: 'p1', state: { level: 7 } }] } }, npc))
    const wLow = rollNpcWeapon(rng(i + 1), npc, { place: 'level1', playerLevel: 1, forceArmed: true })
    const wHi = rollNpcWeapon(rng(i + 1), npc, { place: 'level3', playerLevel: 14, forceArmed: true })
    expect(W[wLow].minLevel ?? 1).toBeLessThanOrEqual(4)
    expect(variantOf(wLow)).not.toBe('wwissue')
    weaponsLow.push(W[wLow].minLevel ?? 1)
    weaponsHigh.push(W[wHi].minLevel ?? 1)
  }
  expect(spreadVals.size).toBeGreaterThanOrEqual(3)
  expect(weaponsHigh.reduce((a, b) => a + b, 0)).toBeGreaterThan(weaponsLow.reduce((a, b) => a + b, 0) * 2)

  // Shotgun NPC drops shells & held weapon using current level pool; medic carries medical aid
  const shottyNpc = {
    id: 'g-shot',
    state: { role: 'guard', faction: 'meg', arm: 'shotgun~riot', gearLevel: 11, wear: npcLook('g-shot', {}, 'meg', 11, 'guard') },
  }
  const pocket = rollNpcPocketLoot({ ...rng(88), place: { id: 'level1' } }, shottyNpc, { playerLevel: 11 })
  expect(pocket).toContain('weapon:shotgun~riot')
  expect(pocket).toContain('shells')

  const medicNpc = {
    id: 'm-1',
    state: { role: 'medic', faction: 'meg', arm: 'knife', gearLevel: 12, wear: npcLook('m-1', {}, 'meg', 12, 'medic') },
  }
  const medPocket = rollNpcPocketLoot({ ...rng(89), place: { id: 'level2' } }, medicNpc, { playerLevel: 12 })
  expect(medPocket.some((t) => ['medkit', 'firstaid', 'antiseptic', 'bandage'].includes(t))).toBe(true)
  expect(medPocket).not.toContain('shells')

  // Generic starter guard wearing over-leveled armor gets synced down cleanly for low-level player, preserving bespoke NPCs
  const rookieGuard = { id: 'g-adapt', state: { role: 'guard', faction: 'meg', wear: npcLook('g-adapt', {}, 'meg', 16, 'guard') } }
  const syncedLow = adaptNpcWear(rookieGuard, 2)
  expect(syncedLow).not.toBeNull()
  const sal = { id: 'l61-sal', state: { role: 'trader', faction: 'survivor', wearOwn: true, wear: { topw: 'jacket' } } }
  expect(adaptNpcWear(sal, 2)).toBeNull()
})

test('hit-squad sendSquad scales squad HP, armor tier, and weapons to target player level', () => {
  const spawnsLow = [], spawnsHi = []
  const mkCtx = (lv, bucket) => ({
    now: () => 50000,
    random: rng(300 + lv).random,
    self: { state: { level: lv } },
    spawn: (id, spec) => bucket.push({ id, spec }),
  })
  sendSquad(mkCtx(2, spawnsLow), 'meg', { x: 0, y: 0, z: 0 }, 'p1', { x: 5, y: 0, z: 5 }, 3)
  sendSquad(mkCtx(15, spawnsHi), 'meg', { x: 0, y: 0, z: 0 }, 'p1', { x: 5, y: 0, z: 5 }, 3)
  const npcsLow = spawnsLow.filter((x) => typeof x.id === 'string')
  const npcsHi = spawnsHi.filter((x) => typeof x.id === 'string')
  expect(npcsLow.length).toBe(3)
  expect(npcsHi.length).toBe(3)
  expect(npcsHi[0].spec.state.maxHp).toBeGreaterThan(npcsLow[0].spec.state.maxHp + 40)
  for (const n of npcsLow) {
    expect(W[n.spec.state.arm].minLevel ?? 1).toBeLessThanOrEqual(4)
  }
})
