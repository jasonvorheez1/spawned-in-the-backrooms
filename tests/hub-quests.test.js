// Nov 13: the Hub's main-quest step and its side quests: no lockouts, real rolls
import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
const { hubRoute } = await import('../scripts/lib/hub-route.js')
const { hubChoices, handleDialogueQuestHub } = await import('../scripts/lib/hub-quest.js')
const ctx = (r = 0.5) => ({ now: () => 1e7, random: () => r, emit: () => {}, world: { places: {} }, self: { id: 'p' } })
const say = (c, s, npc, t) => handleDialogueQuestHub(c, { id: 'p', state: s }, { id: npc, state: {} }, t)

test('arriving without Phoebe still points at the ledger, and reading it opens the tenth tunnel', () => {
  const s = { dinaQ: 9, hubPhoebe: true }
  hubRoute(ctx(), s, 'thehub')
  expect(s.quests['the-tenth-tunnel'].step).not.toContain('Phoebe')
  s.hubLedger = 1; hubRoute(ctx(), s, 'thehub')
  expect(s.quests['the-tenth-tunnel'].step).toContain('tenth tunnel')
  hubRoute(ctx(), s, 'level11'); expect(s.hubRouteDone).toBe(1)
})

test('Okafor can be asked about Dina by anyone who knows her name', () => {
  expect(hubChoices(ctx(), { id: 'hub-meg-okafor' }, { trail: { name: 1 } }).some((c) => c.text.includes('Dina'))).toBe(true)
})

test("Lin's Speech 45 is rolled; a failed lie hides the option but returning the key still works", () => {
  const s = { hubMK: 3, skl: Array(20).fill(0).join(',') }
  say(ctx(0), s, 'hub-meg-lin', "[Speech 45] It's gone. Someone used it.")
  expect(s.hubMK).toBe(3); expect(s.hubMKlie).toBe(1)
  expect(hubChoices(ctx(), { id: 'hub-meg-lin' }, s).some((c) => c.text.includes('Speech'))).toBe(false)
  say(ctx(), s, 'hub-meg-lin', "Found it. Here's your key."); expect(s.hubMK).toBe(99)
})

test('selling the tapes to Pip moves the blank-door lead to Pip, not Sato', () => {
  const s = { hubLR: 2 }
  say(ctx(), s, 'hub-amber-pip', 'Want to buy some M.E.G. recorders?')
  expect(hubChoices(ctx(), { id: 'hub-meg-sato' }, s).length).toBe(0)
  say(ctx(), s, 'hub-amber-pip', 'Anything good on those tapes?')
  say(ctx(), s, 'hub-amber-pip', "I'll go and find that door.")
  expect(s.hubUP).toBe(1)
})
