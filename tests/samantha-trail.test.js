// Samantha's part in The Way Back (Nov 13): a good meal buys Dina's hotel clue, a second one the road to the city.
import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
const { trailBeat, dinaRead } = await import('../scripts/samantha.js')
const { trailStep } = await import('../scripts/lib/dina-quest.js')

function room(state) {
  const p = { id: 'p', state, feetPosition: { x: 0, y: 0, z: 0 } }
  const self = { id: 'l5-samantha', state: {}, session: { reading: 1 }, feetPosition: { x: 0, y: 0, z: 0 } }
  const ctx = { self, now: () => 1000, getObject: (id) => (id === 'p' ? p : null), emit: () => {}, place: { players: [p] }, random: () => 0.5 }
  return { ctx, p }
}

test('no beat before the player knows Dina, or once the trail is past the city', () => {
  expect(trailBeat({})).toBe(null)
  expect(trailBeat({ trail: { name: 1, room: 1, radio: 1 } })).toBe(null)
  expect(trailBeat({ trail: { name: 1 }, dinaQ: 3 })).toBe(null)
})

test('the first good meal teaches Dina\'s room, the second the road to the city, then she reads as usual', () => {
  const s = { trail: { name: 1, word: 1, list: 1, tape: 1 } }
  expect(trailBeat(s)).toBe('dina')
  const { ctx } = room(s)
  dinaRead(ctx, { by: 'p', beat: 'dina' })
  expect(s.trail.room).toBe(1)
  expect(s.sub.t).toContain('three-oh-seven')
  expect(trailBeat(s)).toBe('route')
  dinaRead(ctx, { by: 'p', beat: 'route' })
  expect(s.samRoute).toBe(1)
  expect(trailStep(s).step).toContain('Snackrooms')
  expect(trailBeat(s)).toBe(null)
})

test('without Samantha the journal keeps the plain city step', () => {
  expect(trailStep({ trail: { name: 1, word: 1, list: 1, tape: 1, room: 1 } }).step).not.toContain('Samantha')
})

// Nov 13: the unseen voice after SS Fun: one unnamed whisper per step from 6 on, played on the player's own tick
test('each step after the ship queues one whisper, played once, never naming her', async () => {
  const { setDinaStep, dinaTick, WHISPER } = await import('../scripts/lib/dina-quest.js')
  let now = 1000; const out = []
  const st = { dinaQ: 5, trail: { name: 1, word: 1, list: 1, tape: 1, room: 1, radio: 1, pass: 1 }, level: 1 }
  const ctx = { self: { id: 'p', place: 'level1', feetPosition: { x: 0, y: 0, z: 0 } }, now: () => now, emit: (k, d) => out.push([k, d]) }
  expect(setDinaStep(ctx, st, 6, 'x')).toBe(true)
  dinaTick(ctx, {}, st)
  expect(out.some(([k]) => k === 'uiEvent')).toBe(false)
  now += 4000; dinaTick(ctx, {}, st)
  const cap = out.find(([k]) => k === 'uiEvent')[1].payload
  expect(cap.text).toBe(WHISPER[6]); expect(cap.who).toBe('???')
  now += 4000; out.length = 0; dinaTick(ctx, {}, st)
  expect(out.some(([k]) => k === 'uiEvent')).toBe(false)
  for (const w of Object.values(WHISPER)) expect(w.toLowerCase()).not.toContain('phoebe')
})
