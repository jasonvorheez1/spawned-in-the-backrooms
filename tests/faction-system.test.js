import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null }))
const { fameOf, infamyOf, titleOf, groupOf, addRep } = await import('../scripts/lib/rep.js')
const { disguised } = await import('../scripts/lib/forgive.js')
test('mixed fame and infamy survive without a legacy net value', () => {
  const s = { fame: { meg: 40 }, infamy: { meg: 15 } }
  expect(fameOf(s, 'meg')).toBe(40); expect(infamyOf(s, 'meg')).toBe(15)
  expect(titleOf(s, 'meg')).toBe('Smiling Troublemaker')
  addRep(s, 'meg', 2); expect(fameOf(s, 'meg')).toBe(42); expect(infamyOf(s, 'meg')).toBe(15)
})
test('explicit faction membership takes priority over an unrelated id', () => {
  expect(groupOf({ id: 'person-1', state: { faction: 'amber' } })).toBe('amber')
  expect(groupOf({ id: 'person-2', state: { faction: 'survivors' } })).toBe('survivors')
})
test('disguise does not conceal a player whose position is unknown', () => {
  expect(disguised({ state: { faction: 'meg' } }, { state: { look: { topw: 'megjacket' } } })).toBe(false)
})
