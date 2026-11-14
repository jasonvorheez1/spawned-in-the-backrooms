import { test, expect } from 'bun:test'
import { questMark } from '../scripts/lib/quest-mark.js'

const point = (x, z, y = 0) => ({ x, y, z })
const objects = (...ids) => Object.fromEntries(ids.map((id, i) => [id, { feetPosition: point(10 + i * 60, 0) }]))
const mark = (here, goal, entities = {}, state = {}, feet = point(0, 0)) =>
  questMark({ place: { id: here, objects: entities } }, { place: here, state, feetPosition: feet },
    { step: 'Find the signal', mark: { place: goal, x: 3, z: 7 } })

test('a tracked objective changes exits as the player crosses levels', () => {
  expect(mark('main', 'level11')).toMatchObject({ exit: 'main-from-l1', via: 'level1' })
  expect(mark('level1', 'level11', objects('l1-back', 'l1-onward'))).toMatchObject({ exit: 'l1-onward', via: 'level2' })
  expect(mark('level3', 'level11', objects('l3-lift', 'l3-lift5'))).toMatchObject({ exit: 'l3-lift5', via: 'level5' })
  expect(mark('level61', 'level11', objects('l61-to-l11'))).toMatchObject({ exit: 'l61-to-l11', via: 'level11' })
  expect(mark('level11', 'level11')).toEqual(point(3, 7))
})

test('routes respect gates and pick the nearer available equivalent exit', () => {
  expect(mark('main', 'level01', objects('l0-zenith'))).toBeNull()
  expect(mark('main', 'level01', objects('l0-zenith'), { zenKey: true })).toMatchObject({ exit: 'l0-zenith' })
  expect(mark('level11', 'level12', objects('l11-win12'))).toBeNull()
  expect(mark('level11', 'level12', objects('l11-win12'), { know12: true })).toMatchObject({ exit: 'l11-win12' })
  const roads = objects('l10-road-north', 'l10-road-south')
  expect(mark('level10', 'level11', roads, {}, point(75, 0))).toMatchObject({ exit: 'l10-road-south' })
  expect(mark('level10', 'level11', roads)).toMatchObject({ exit: 'l10-road-north' })
  expect(mark('level10', 'level11')).toBeNull()
  expect(mark('level1', 'level11', objects('l1-back'))).toBeNull()
})

test('Zenith Station return guidance uses the actual return hatch', () => {
  expect(mark('level01', 'main', objects('l01-back'))).toMatchObject({ exit: 'l01-back', via: 'main' })
})

test('Snackrooms guidance points to the Level 6 checkpoint only with working night vision', () => {
  const exits = objects('l61-to-l6', 'l61-vent-in')
  expect(mark('level61', 'level6', exits)).toMatchObject({ exit: 'l61-vent-in' })
  expect(mark('level61', 'level6', exits, { nvg: true, battery: 0 })).toMatchObject({ exit: 'l61-vent-in' })
  expect(mark('level61', 'level6', exits, { nvg: true, battery: 80 })).toMatchObject({ exit: 'l61-to-l6' })
  expect(mark('level61', 'level6', exits, { nvg: true, battery: 0, nvgSpare: 1 })).toMatchObject({ exit: 'l61-to-l6' })
})

test('Level 34 sewer routing connects Level 11, Level 9, and Level 7', () => {
  expect(mark('level11', 'level34', objects('sewer11-grate'))).toMatchObject({ exit: 'sewer11-grate', via: 'level34' })
  expect(mark('level34', 'level11', objects('l34-up-l11'))).toMatchObject({ exit: 'l34-up-l11', via: 'level11' })
})
