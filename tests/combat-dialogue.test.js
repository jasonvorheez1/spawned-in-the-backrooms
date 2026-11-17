import { test, expect } from 'bun:test'
import { barkOf, dlgReady } from '../scripts/lib/dialogue.js'

test('combat barks reach faction roles and named characters without losing their own lines', async () => {
  await dlgReady()
  for (const [faction, role] of [['survivor', 'default'], ['survivor', 'scout'], ['survivor', 'medic'], ['meg', 'default'], ['meg', 'scout'], ['meg', 'medic'], ['bntg', 'trader'], ['lightless', 'default']]) {
    const npc = { id: 'unnamed-' + faction + '-' + role, state: { faction, role } }
    for (const event of ['spot', 'hostile', 'hit', 'clear', 'cover', 'reload']) {
      expect(barkOf(npc, event, () => 0)).toBeTruthy()
    }
    expect(barkOf(npc, 'spot', () => 0)).not.toBe(barkOf(npc, 'spot', () => .99))
  }
  const ale = { id: 'meg-ale', state: { faction: 'meg' } }
  expect(barkOf(ale, 'spot', () => .99)).toContain('Movement')
  expect(barkOf(ale, 'reload', () => 0)).toBe("I'm dry, cover me!")
  expect(barkOf(ale, 'cover', () => 0)).toBe("I'm getting behind cover!")
})
