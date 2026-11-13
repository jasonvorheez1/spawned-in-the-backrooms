import { test, expect } from 'bun:test'
import { layout, zoneAt, HOUSES } from '../scripts/lib/level9.js'
test('the same neighborhood seed preserves streets, lots and landmarks', () => {
  expect(layout(7921)).toEqual(layout(7921))
  expect(layout(7921).lots.length).toBeGreaterThan(0)
})
test('unfinished house placeholders are not treated as safe interiors', () => {
  const town=layout(7921), lot=town.lots.find(l => !HOUSES[l.kind].model)
  expect(lot).toBeTruthy(); expect(zoneAt(town,lot.x,lot.z)).toBe('l9_street')
})
