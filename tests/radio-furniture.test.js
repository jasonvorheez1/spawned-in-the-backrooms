import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null }))
mock.module('../scripts/lib/radio.js', () => ({ onAir: () => ({ seg: { kind: 'music' } }) }))
mock.module('../scripts/lib/level-kit.js', () => ({ keepPeople: () => {} }))
mock.module('../scripts/lib/critter-model.js', () => ({ critterSpec: () => ({}) }))
mock.module('../scripts/lib/clothes.js', () => ({ npcLook: () => ({}) }))
const { tick } = await import('../places/radio/sim.js')

test('existing room furniture is aligned without moving an occupied seat', () => {
  const ids = ['radio-pc', 'radio-chair', 'radio-armchair-1', 'radio-armchair-2', 'radio-armchair-3']
  const objects = Object.fromEntries(ids.map(id => [id, { id, tags: id === 'radio-pc' ? ['usable'] : ['seat'], state: {}, feetPosition: { x: 0, y: 0, z: 0 }, rotation: { yaw: 0 } }]))
  const seat = objects['radio-armchair-1']
  seat.state.by = { 0: 'player' }
  objects.player = { state: { sit: { id: seat.id } } }
  const ctx = { place: { objects, state: { builtV: 7, ralphLaid: true, live: false, tvLine: '' } }, now: () => 5000, getObject: id => objects[id], query: () => [] }
  tick(ctx)
  expect(seat.rotation.yaw).toBe(0)
  expect(ctx.place.state.furnitureAligned).toBeUndefined()
  expect(objects['radio-pc'].rotation.yaw).toBe(90)
  expect(objects['radio-chair'].feetPosition).toEqual({ x: 1.2, y: 0.1, z: -1.9 })
  objects.player.state.sit = null
  tick(ctx)
  expect(seat.rotation.yaw).toBe(270)
  expect(objects['radio-armchair-2'].rotation.yaw).toBe(180)
  expect(objects['radio-armchair-3'].rotation.yaw).toBe(0)
  expect(ctx.place.state.furnitureAligned).toBe(true)
})
