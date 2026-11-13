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

test('faction history records actual changes with their cause, and remains bounded', () => {
  const s = {}
  addRep(s, 'meg', 8, 'Returned a missing key')
  addRep(s, 'meg', -6, 'Sold survey tapes')
  expect(s.repHistory).toEqual([{ group:'meg', kind:'fame', amount:8, reason:'Returned a missing key' }, { group:'meg', kind:'infamy', amount:6, reason:'Sold survey tapes' }])
  for (let i = 0; i < 40; i++) addRep(s, 'amber', 1, 'Helped the camp')
  expect(s.repHistory).toHaveLength(30)
})


test('faction conversations require standing with the correct group', async () => {
  const { factionChoices, factionReply } = await import('../scripts/lib/faction-dialogue.js')
  const callum = { id:'meg-callum' }, voss = { id:'bntg-voss' }, s = { rep: { meg:12, bntg:0 } }
  expect(factionChoices(callum,s)).toHaveLength(1)
  expect(factionChoices(voss,s)).toHaveLength(0)
  const text = factionChoices(callum,s)[0].text
  expect(factionReply(callum,s,text).reply).toContain('routes')
  s.rep.meg = -40
  expect(factionChoices(callum,s)).toHaveLength(0)
  expect(factionReply(callum,s,text)).toBeNull()
})

