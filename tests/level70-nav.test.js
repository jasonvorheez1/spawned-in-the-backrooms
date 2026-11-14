import { test, expect, mock } from 'bun:test'

let findHandler = () => ({ ok: true, partial: false, points: [] })
let traverseHandler = () => null

mock.module('builtin/nav', () => ({ findPath: (...args) => findHandler(...args) }))
mock.module('builtin/physics', () => ({
  raycast: () => null,
  overlapPoint: () => [],
  traverseCheck: (...args) => traverseHandler(...args),
}))

const { route, NODES } = await import('../scripts/lib/level70-nav.js')

test('level70 route recovers after navmesh loading without permanently poisoning edges', () => {
  let now = 100
  const ctx = { now: () => now, place: { state: { v70town: 1, v70civic: 1, v70wild: 1, v70paths: 1 } } }
  findHandler = () => ({ ok: false, loading: true, partial: false, points: [] })
  traverseHandler = () => null

  const duringLoad = route(ctx, NODES.s40, NODES.s0)
  expect(duringLoad.partial).toBe(true)
  expect(Object.keys(ctx.place.state.l70nav?.e ?? {}).length).toBe(0)

  now += 100
  findHandler = (_c, a, b) => ({ ok: true, partial: false, points: [{ ...a }, { ...b }] })
  const ready = route(ctx, NODES.s40, NODES.s0)
  expect(ready.ok).toBe(true)
  expect(ready.partial).toBe(false)
  expect(Object.keys(ctx.place.state.l70nav.e).length).toBeGreaterThan(0)
})

test('level70 blocked edges expire after cooldown and traverseCheck retains node elevations', () => {
  let now = 1000
  const ctx = { now: () => now, place: { state: { v70town: 2, v70civic: 1, v70wild: 1, v70paths: 1 } } }
  // Force transient failure across every path from dock to s-120
  findHandler = () => ({ ok: false, partial: false, points: [] })
  traverseHandler = () => ({ traversable: false })

  const blocked = route(ctx, NODES.dock, NODES['s-120'])
  expect(blocked.ok).toBe(false)

  // Advance past blocked retry window and simulate traverseCheck fallback succeeding on elevated interior nodes
  now += 20000
  findHandler = () => { throw new Error('nav engine unavailable') }
  traverseHandler = () => ({ traversable: true })

  const elevated = route(ctx, NODES['house-kitchen'], NODES.cellar)
  expect(elevated.ok).toBe(true)
  const ys = elevated.points.map((p) => p.y)
  expect(ys.some((y) => Math.abs(y - 0.8) < 0.1)).toBe(true)
  expect(ys.some((y) => Math.abs(y - 0.3) < 0.1)).toBe(true)
})
