import { test, expect, mock } from 'bun:test'

mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
mock.module('builtin/tsl', () => ({}))
mock.module('builtin/three', () => ({}))
mock.module('../scripts/mat-cloth.js', () => ({ PRINTS: {} }))

const { l1Choice } = await import('../scripts/lib/level1-quests.js')
const { handleDialogueQuestZ } = await import('../scripts/lib/zenith-quest.js')
const { wireCount, handleDialogueQuest21 } = await import('../scripts/lib/level21-quests.js')
const { questChoices } = await import('../scripts/lib/npc-starters.js')
const { questProgress } = await import('../scripts/lib/quest-dialogue.js')
const { queuePayout } = await import('../scripts/lib/quests.js')
const { questMark } = await import('../scripts/lib/quest-mark.js')
const l21use = await import('../scripts/l21-use.js')

const skills60 = Array(13).fill(60).join(',')

function makeNpcCtx(npcId, stateExtra = {}) {
  let now = 10000
  const npc = { id: npcId, tags: ['npc'], state: { name: npcId }, feetPosition: { x: 0, y: 0, z: 0 } }
  const self = {
    id: 'player',
    userId: 'player',
    place: 'main',
    state: { level: 5, cents: 0, attr: '5,5,5,5,5,5,5', skl: skills60, ...stateExtra },
    session: {},
    feetPosition: { x: 0, y: 0, z: 1 },
  }
  const ctx = {
    self,
    place: { id: 'main', players: [], objects: { [npcId]: npc }, state: {} },
    now: () => (now += 1000),
    random: () => 0.99,
    getObject: (k) => (k === npcId ? npc : null),
    emit: () => {},
    query: () => [],
  }
  return { ctx, npc, s: self.state }
}

test('queuePayout merges xp and items into pending s.payout and preserves latest text', () => {
  const s = {}
  queuePayout(s, { xp: 60, text: 'Read drive.' })
  queuePayout(s, { xp: 150, items: ['almond'], text: 'Turned in.' })
  expect(s.payout).toEqual({ xp: 210, items: ['almond'], text: 'Turned in.' })
})

test('l1Choice keeps Callum Short Rations visible when M.E.G. standing is positive and hides when Hated', () => {
  const s = { rationsQ: 0, rep: { meg: 5 }, fame: { meg: 5 } }
  const c1 = l1Choice({ random: () => 0.5 }, { id: 'meg-callum' }, s, [])
  expect(c1.some((c) => c.text.includes("You're counting those cans"))).toBe(true)

  const hostile = { rationsQ: 0, rep: { meg: -40 }, infamy: { meg: 40 } }
  const c2 = l1Choice({ random: () => 0.5 }, { id: 'meg-callum' }, hostile, [])
  expect(c2.some((c) => c.text.includes("You're counting those cans"))).toBe(false)
})

test('Zenith Kade haggle matches payout text and preserves read-drive + turn-in XP', () => {
  const a = makeNpcCtx('l0-bntg-kade', { zenQ: 5, zenDrive: true })
  const resA = handleDialogueQuestZ(a.ctx, a.ctx.self, a.npc, "here. let's finish this")
  expect(resA.reply).toContain("Here's your sixty.")
  expect(a.s.cents).toBe(6000)

  const b = makeNpcCtx('l0-bntg-kade', { zenQ: 5, zenDrive: true })
  expect(handleDialogueQuestZ(b.ctx, b.ctx.self, b.npc, "hold on. let me see what's on it first")?.reply).toBeTruthy()
  expect(b.s.payout.xp).toBe(60)
  b.ctx._lastCheck = { skill: 'barter', passed: true }
  expect(handleDialogueQuestZ(b.ctx, b.ctx.self, b.npc, 'sixty is light for black-box data')?.reply).toBeTruthy()
  expect(b.s.zenHaggle).toBe(4000)
  const resB = handleDialogueQuestZ(b.ctx, b.ctx.self, b.npc, "here. let's finish this")
  expect(resB.reply).toContain("Here's your hundred.")
  expect(b.s.cents).toBe(10000)
  expect(b.s.payout.xp).toBe(210)
  expect(b.s.payout.items).toContain('almond')
})

test('Level 2.1 Ned Saltine Quota counts and deducts scrap.copper_wire uniformly', () => {
  const s = { saltineQ: 2, scrap: { copper_wire: 3 } }
  expect(wireCount(s)).toBe(3)
  expect(questProgress('the-saltine-quota', s)).toContain('Copper wire: 3/3')

  const choices = questChoices({}, { id: 'l21-ned' }, s)
  const turnIn = choices.find((c) => c.tag === 'Quest Turn-In')
  expect(turnIn).toBeTruthy()

  const ctx = { self: { state: s }, now: () => 10000, emit: () => {}, random: () => 0.5 }
  const res = handleDialogueQuest21(ctx, ctx.self, { id: 'l21-ned' }, turnIn.text)
  expect(res.reply).toBeTruthy()
  expect(s.saltineQ).toBe(99)
  expect(s.scrap.copper_wire).toBe(0)
  expect(s.payout.xp).toBe(110)
})

test('Level 2.1 Errand Board completes all 5 errands using real inventory keys', () => {
  const w = {
    l21q: 0,
    tapes: 3,
    l21Scouted: 0,
    scrap: { copper_wire: 3, scrap_metal: 4, circuit: 2 },
  }
  const playerObj = { id: 'p1', userId: 'u1', state: w, feetPosition: { x: 0, y: 0, z: 0 }, anim: {} }
  const board = { id: 'l21-board', state: { kind: 'board' }, feetPosition: { x: 0, y: 0, z: 0 } }
  let now = 10000
  const ctx = {
    self: board,
    getObject: (id) => (id === 'p1' ? playerObj : null),
    now: () => (now += 1000),
    random: () => 0.5,
    emit: () => {},
    after: () => {},
  }

  l21use.ears.press(ctx, { by: 'p1' })
  expect(w.l21q).toBe(1)
  expect(w.scrap.copper_wire).toBe(0)
  expect(w.payout.xp).toBe(65)

  l21use.ears.press(ctx, { by: 'p1' })
  expect(w.l21q).toBe(2)
  expect(w.scrap.scrap_metal).toBe(0)
  expect(w.payout.xp).toBe(80)

  l21use.ears.press(ctx, { by: 'p1' })
  expect(w.l21q).toBe(3)
  expect(w.tapes).toBe(0)
  expect(w.payout.xp).toBe(70)

  l21use.ears.press(ctx, { by: 'p1' })
  expect(w.l21q).toBe(4)
  expect(w.scrap.circuit).toBe(0)
  expect(w.payout.xp).toBe(95)

  l21use.ears.press(ctx, { by: 'p1' })
  expect(w.l21q).toBe(4)
  expect(board.ui).toContain('SCOUT THE EDGES')

  w.l21Scouted = 1
  l21use.ears.press(ctx, { by: 'p1' })
  expect(w.l21q).toBe(5)
  expect(w.payout.xp).toBe(140)
})

test('questMark avoids locked hd-t10-a3 Hub->Level 11 door without level11 hubKey', () => {
  const objects = {
    'hd-t7-b1': { feetPosition: { x: 10, y: 0, z: 0 } },
    'hd-t10-a3': { feetPosition: { x: 20, y: 0, z: 0 } },
  }
  const makeHubCtx = (state) => [
    { place: { id: 'thehub', objects } },
    { place: 'thehub', state, feetPosition: { x: 0, y: 0, z: 0 } },
    { step: 'Find', mark: { place: 'level11', x: 3, z: 7 } },
  ]

  const locked = questMark(...makeHubCtx({ hubKeys: {} }))
  expect(locked.exit).toBe('hd-t7-b1')

  const unlocked = questMark(...makeHubCtx({ hubKeys: { level11: 1 } }))
  expect(unlocked.exit).toBe('hd-t10-a3')
})
