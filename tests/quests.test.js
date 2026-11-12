import { test, expect } from 'bun:test'
import { setQuest, endQuest } from '../scripts/lib/quests.js'

test('an objective can clear a previous location without losing its tracked quest', () => {
  const s = {}
  setQuest(s, 'delivery', { name: 'Delivery', step: 'Find it', mark: { place: 'main', id: 'box' } })
  setQuest(s, 'delivery', { name: 'Delivery', step: 'Wait for a reply', mark: null })
  expect(s.quests.delivery.mark).toBeNull()
  expect(s.qtrack).toEqual(['delivery'])
  setQuest(s, 'delivery', { name: 'Delivery', step: 'Wait for a reply', main: true })
  expect(s.quests.delivery.main).toBe(true)
})

test('a failed quest leaves a failed journal record and stops tracking', () => {
  const s = {}
  setQuest(s, 'delivery', { name: 'Delivery', step: 'Find it', mark: { place: 'main' } })
  endQuest(s, 'delivery', 'Contact is dead', 'failed')
  expect(s.qdone.delivery).toMatchObject({ name: 'Delivery', outcome: 'failed', place: 'main' })
  expect(s.qtrack).toEqual([])
})

test('the journal keeps prior objectives after a quest is archived', () => {
  const s = {}
  setQuest(s, 'delivery', { name: 'Delivery', step: 'Find it' })
  setQuest(s, 'delivery', { name: 'Delivery', step: 'Bring it back' })
  setQuest(s, 'delivery', { name: 'Delivery', step: 'Bring it back', mark: { place: 'main' } })
  expect(s.quests.delivery.history).toEqual(['Find it'])
  endQuest(s, 'delivery', 'Delivered')
  expect(s.qdone.delivery.history).toEqual(['Find it'])
})
