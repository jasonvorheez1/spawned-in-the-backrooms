import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
const road = await import('../scripts/lib/level69-quest.js')
const line = await import('../scripts/lib/level1c-quest.js')
const l11 = await import('../scripts/lib/level11-quests.js')

function world() {
  const p = { id: 'p', userId: 'p', state: { level: 5, cents: 50000, attr: '5,5,5,5,5,5,5', skl: Array(13).fill(60).join(',') }, feetPosition: { x: 0, y: 0, z: 0 } }
  return { p, ctx: { self: p, now: () => 1000, random: () => .99, emit: () => {}, query: () => [], getObject: () => null, place: { id: 'level1c', players: [p], objects: {}, state: {} } } }
}

test('Mile Markers choices still lead through all three posts and back to Wren', () => {
  const { p, ctx } = world(), npc = { id: road.WREN }
  const start = road.l69Choices(road.WREN, p.state)[0]
  expect(road.handleDialogueQuest69(ctx, p, npc, start.text).reply).toContain('right wall')
  for (const km of ['0.6', '1.2', '1.8']) road.plantBeacon(ctx, p, { id: 'post-' + km, state: { km } })
  expect(p.state.l69q).toBe(3)
  expect(p.state.quests['mile-markers'].step).toContain('tunnel')
  const turnIn = road.l69Choices(road.WREN, p.state).find(c => c.tag === 'Quest Turn-In')
  expect(road.handleDialogueQuest69(ctx, p, npc, turnIn.text)).toBeTruthy()
  expect(p.state.l69q).toBe(99)
})

test('Walk the Line retains its toll route, logger and turn-in', () => {
  const { p, ctx } = world(), ines = { id: line.INES }, blade = { id: line.BLADE }
  expect(line.handleDialogueQuest1c(ctx, p, ines, line.l1cChoices(line.INES, p.state)[0].text)).toBeTruthy()
  const pay = line.l1cChoices(line.BLADE, p.state).find(c => c.tag.startsWith('Pay'))
  expect(line.handleDialogueQuest1c(ctx, p, blade, pay.text)).toBeTruthy()
  expect(p.state.l1cq).toBe(2)
  line.readLogger(ctx, p)
  const turnIn = line.l1cChoices(line.INES, p.state).find(c => c.tag === 'Quest Turn-In')
  expect(line.handleDialogueQuest1c(ctx, p, ines, turnIn.text).reply).toContain('Forty-one')
  expect(p.state.l1cq).toBe(99)
})

test('Vance can still start Ground Rent from both displayed choices', () => {
  for (const tag of ['Quest Start', 'Barter 35']) {
    const { p, ctx } = world(), npc = { id: 'l11-meg-agent-vance' }
    const choice = l11.l11Choices(npc.id, p.state).find(c => c.tag === tag && (c.text.includes('runner') || c.text.includes('hazard pay')))
    expect(choice).toBeTruthy()
    expect(l11.handleDialogueQuest(ctx, p, npc, choice.text)).toBeTruthy()
    expect(p.state.boomQ).toBe(1)
  }
})
