import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
const { ears: record } = await import('../scripts/l22-record.js')
const { ears: door } = await import('../scripts/l21d-door.js')
const { noteFloor, startL22 } = await import('../scripts/lib/level22-quest.js')
const { nextQuestExit } = await import('../scripts/lib/quest-route.js')
const { closestWanderer } = await import('../scripts/lib/l21d-layout.js')

function world() {
  const p = { id: 'player/p', place: 'level22', feetPosition: { x: 0, y: 0, z: 0 }, state: { level: 1 }, session: {} }
  const ctx = { self: null, place: { id: 'level22', players: [p], objects: {}, state: {} }, getObject: (id) => id === p.id ? p : null, emit: () => {}, now: () => 10000, random: () => .5 }
  return { p, ctx }
}

test('Emstable records can be reread and progress survives repeated interaction', () => {
  const { p, ctx } = world()
  ctx.self = { id: 'record', state: { page: 2201, rec: 'l22-rec-hilda-1' }, feetPosition: p.feetPosition }
  record.press(ctx, { by: p.id }); record.press(ctx, { by: p.id })
  expect(p.state.pages).toBe('2201')
  expect(p.state.reading).toBe(2201)
  expect(p.state.l22q.read).toEqual(['l22-rec-hilda-1'])
})

test('finished floor survey has a working route to Wren and respects the exit gate', () => {
  const { p, ctx } = world()
  startL22(ctx, p)
  for (const floor of [2, 13, 21]) noteFloor(ctx, p, floor)
  const q = p.state.quests['ruins-left-behind']
  expect(q.mark).toEqual({ place: 'level325', id: 'l69-npc-wren' })
  p.state.quests['ruins-left-behind'].mark = null
  startL22(ctx, p)
  expect(p.state.quests['ruins-left-behind'].mark).toEqual({ place: 'level325', id: 'l69-npc-wren' })
  expect(nextQuestExit(ctx, p, 'level325')).toBeNull()
  p.state.l22 = { floors: [21] }
  ctx.place.objects['l22-exit'] = { feetPosition: { x: 0, y: 2.9, z: -32.4 } }
  expect(nextQuestExit(ctx, p, 'level325').exit).toBe('l22-exit')
  p.place = 'doors21'; ctx.place.objects['l21d-door-e14'] = { feetPosition: { x: 124, y: 0, z: 2 } }
  expect(nextQuestExit(ctx, p, 'level325').exit).toBe('l21d-door-e14')
  p.place = 'level11'; ctx.place.objects['l11-site-noclip'] = { feetPosition: { x: 22, y: 0, z: 31 } }
  expect(nextQuestExit(ctx, p, 'level325').exit).toBe('l11-site-noclip')
})

test('only distinct numbered doors count and multiplayer credit goes to the closest living player', () => {
  const { p, ctx } = world()
  const open = (id, label) => { ctx.self = { id, state: { kind: 'dead', label, yaw0: 0 }, feetPosition: p.feetPosition }; door.press(ctx, { by: p.id }) }
  open('unnumbered', ''); open('exit', 'EXIT')
  expect(p.state.l21d).toBeUndefined()
  open('one', '13'); open('one', '13')
  expect(p.state.l21d.doors).toBe(1)
  const a = { id: 'a', feetPosition: { x: 0, z: 0 }, state: {} }, b = { id: 'b', feetPosition: { x: 20, z: 0 }, state: {} }
  expect(closestWanderer([a, b], { x: 19, z: 0 }).id).toBe('b')
  b.state.dead = true
  expect(closestWanderer([a, b], { x: 19, z: 0 }).id).toBe('a')
  expect(closestWanderer([a, b], null)).toBeNull()
})
