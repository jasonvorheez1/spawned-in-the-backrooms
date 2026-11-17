import { test, expect } from 'bun:test'
import TOP from '../scripts/lib/data/l22-dress-top.yml'
import MID from '../scripts/lib/data/l22-dress-mid.yml'
import LOW from '../scripts/lib/data/l22-dress-low.yml'
import { DECKS } from '../scripts/lib/l22-layout.js'

const rows = [...TOP.rows, ...MID.rows, ...LOW.rows]
const get = id => rows.find(r => r.id === id)
function bounds(r) {
  const [w, , d] = r.size, a = (r.yaw ?? 0) * Math.PI / 180
  const x = (Math.abs(w * Math.cos(a)) + Math.abs(d * Math.sin(a))) / 2
  const z = (Math.abs(w * Math.sin(a)) + Math.abs(d * Math.cos(a))) / 2
  return [r.x - x, r.z - z, r.x + x, r.z + z]
}
const overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]

test('the moved tent and transcript have floor beneath their full footprints', () => {
  for (const id of ['f13-tent2', 'paper-hilda-2']) {
    const r = get(id), deck = DECKS.find(d => d.floor === r.floor)
    expect(r).toBeTruthy()
    for (const hole of deck.p.holes) expect(overlaps(bounds(r), hole)).toBe(false)
  }
})

test('moved rubble clears furnishings and the miner’s searchable pack', () => {
  for (const [a, b] of [['deb1-17', 'f1-tool'], ['deb2-20', 'f2-shelf'], ['deb2-21', 'f2-car1'], ['deb13-1', 'f13-sew2'], ['deb13-24', 'f13-tent1'], ['deb20-18', 'f20-tentc'], ['deb21-19', 'f21-alone'], ['deb21-19', 'f21-pack'], ['deb21-37', 'f21-slab'], ['deb21-58', 'f21-slab']]) {
    expect(overlaps(bounds(get(a)), bounds(get(b))), a + ' / ' + b).toBe(false)
  }
  expect(get('f21-pack').items).toContain('weapon:knuckles22')
  expect(get('paper-hilda-2').rec).toBe('l22-rec-hilda-2')
})
