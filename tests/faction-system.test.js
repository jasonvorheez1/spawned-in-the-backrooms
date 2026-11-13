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
  expect(factionChoices(callum,s).filter(x => x.tag === 'Reputation')).toHaveLength(1)
  expect(factionChoices(voss,s)).toHaveLength(0)
  const text = factionChoices(callum,s)[0].text
  expect(factionReply(callum,s,text).reply).toContain('routes')
  s.rep.meg = -40
  expect(factionChoices(callum,s).filter(x => x.tag === 'Reputation')).toHaveLength(0)
  expect(factionReply(callum,s,text)).toBeNull()
})


test('joining the M.E.G. requires consent and enough trust, and issues one jacket', async () => {
  const { factionChoices, factionReply } = await import('../scripts/lib/faction-dialogue.js')
  const npc = { id:'meg-callum' }, s = {}
  expect(factionReply(npc,s,'How do I join the M.E.G.?').reply).toContain('trust')
  expect(factionChoices(npc,s).some(x => x.tag === 'Enlist')).toBe(false)
  s.rep = { meg: 12 }
  expect(factionChoices(npc,s).some(x => x.tag === 'Enlist')).toBe(true)
  const yes = "I'll sign on as a M.E.G. volunteer."
  factionReply(npc,s,yes)
  expect(s.megMember).toBe(true); expect(s.clothes).toContain('megjacket')
  const original = s.clothes; expect(factionReply(npc,s,yes)).toBeNull(); expect(s.clothes).toBe(original)
  expect(factionChoices(npc,s).some(x => x.text.includes('where should I report'))).toBe(true)
})

test('M.E.G. volunteers can accept, complete and receive their first assignment once', async () => {
 const { megAssignmentChoices, megAssignmentReply } = await import('../scripts/lib/meg-assignment.js')
 const c={id:'meg-callum'}, o={id:'meg-ortiz'}, s={megMember:true}
 expect(megAssignmentChoices(c,{})).toHaveLength(0)
 const ask=megAssignmentChoices(c,s)[0]; megAssignmentReply(c,s,ask.text)
 expect(s.megAssignment).toBeUndefined()
 const accept=megAssignmentChoices(c,s)[0]; megAssignmentReply(c,s,accept.text)
 expect(s.quests['meg-first-assignment'].mark.id).toBe('meg-ortiz')
 const deliver=megAssignmentChoices(o,s)[0]; megAssignmentReply(o,s,deliver.text)
 expect(s.quests['meg-first-assignment'].mark.id).toBe('meg-callum')
 const report=megAssignmentChoices(c,s)[0]; megAssignmentReply(c,s,report.text)
 expect(s.megAssignment).toBe(99); expect(s.cents).toBe(500); expect(s.qdone['meg-first-assignment'].outcome).toBe('completed')
 expect(megAssignmentReply(c,s,report.text)).toBeNull(); expect(s.cents).toBe(500)
})

