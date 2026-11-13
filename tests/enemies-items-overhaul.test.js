import { test, expect, mock } from 'bun:test'
import { readFileSync } from 'node:fs'
let wall = false
mock.module('builtin/physics', () => ({ raycast: () => (wall ? { id: 'wall', distance: 0.5, normal: { x: 1, y: 0, z: 0 } } : null), getInputRay: () => null, overlapPoint: () => [] }))
const { canStrike } = await import('../scripts/lib/hunt.js')
const W = (await import('../scripts/lib/weapons.js')).default

const P = (x, y, z) => ({ id: 'p', feetPosition: { x, y, z } })
test('a foe lands a blow only in reach, on the same floor, with nothing solid between', () => {
  wall = false
  expect(canStrike({}, { x: 0, y: 0, z: 0 }, P(1, 0, 0), 1.5)).toBe(true)
  expect(canStrike({}, { x: 0, y: 0, z: 0 }, P(2, 0, 0), 1.5)).toBe(false) // out of reach
  expect(canStrike({}, { x: 0, y: 0, z: 0 }, P(0.5, 3, 0), 1.5)).toBe(false) // the floor above
  wall = true
  expect(canStrike({}, { x: 0, y: 0, z: 0 }, P(1, 0, 0), 1.5)).toBe(false) // through a wall
  wall = false
})

test('every close-range enemy attack asks canStrike before it hurts', () => {
  for (const f of ['l70-foes', 'l8-life', 'l5-rats', 'stealers', 'deathmoths']) {
    const src = readFileSync(new URL(`../scripts/${f}.js`, import.meta.url), 'utf8')
    expect(src).toContain('canStrike(ctx')
  }
})

test('cave spiders need a sighting to start a hunt and give it up', () => {
  const src = readFileSync(new URL('../scripts/l8-life.js', import.meta.url), 'utf8')
  expect(src).toContain('mm.seenAt')
  expect(src).toMatch(/now - \(mm\.seenAt \?\? now\) > 6000/)
})

test("the intro quest's revolver is a keepsake, not an elite gun", () => {
  const k = W['revolver~lucky13']
  expect(k.rarity).toBe('uncommon')
  expect(k.damage).toBeLessThan(W.govt45.damage + 6)
  expect(k.damage).toBeLessThanOrEqual(Math.round(W.revolver.damage * 1.1))
})

test('no quest reward hands out a rare-or-better gun from an introductory giver', () => {
  const RAR = ['common', 'uncommon', 'rare', 'elite']
  for (const f of ['level1-quests', 'level10-quests', 'level11-quests', 'level21-quests', 'level8-quests', 'zenith-quest', 'remodel-quest', 'dina-quest']) {
    const src = readFileSync(new URL(`../scripts/lib/${f}.js`, import.meta.url), 'utf8')
    for (const m of src.matchAll(/"weapon:([a-z0-9_~]+)"/g)) expect(RAR.indexOf(W[m[1]]?.rarity)).toBeLessThan(2)
  }
})

test('every weapon is a valid definition with a real trade-off', () => {
  for (const k of W.order) {
    const w = W[k]; expect(w?.name).toBeTruthy()
    expect(w.damage).toBeGreaterThan(0); expect(w.cooldown).toBeGreaterThan(0)
    if (w.ranged) { expect(w.magSize).toBeGreaterThan(0); expect(w.range).toBeGreaterThan(0) }
  }
})
