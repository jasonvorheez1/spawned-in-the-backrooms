import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))

const { SKILL_NAMES, parseCheck, checkOdds, formatCheckBanner, resolveCheck } = await import('../scripts/lib/skill-check.js')
const { rollCheck } = await import('../scripts/lib/npc-talk.js')
const { talkUi } = await import('../scripts/talk-ui.js')

const skWith = (idx, val) => {
  const arr = Array(13).fill(0)
  arr[idx] = val
  return arr.join(',')
}

test('parseCheck normalizes structured checks and parses legacy skill tags', () => {
  expect(parseCheck({ check: { skill: 'SPEECH', difficulty: '35' } })).toEqual({ skill: 'speech', difficulty: 35 })
  expect(parseCheck({ text: 'Negotiate', tag: 'Speech 30' })).toEqual({ skill: 'speech', difficulty: 30 })
  expect(parseCheck({ text: 'Laser', tag: 'Energy Weapons 45' })).toEqual({ skill: 'energy', difficulty: 45 })
  expect(parseCheck({ text: 'Fix', tag: 'Repair 40' })).toEqual({ skill: 'repair', difficulty: 40 })
  expect(parseCheck({ text: 'Job', tag: 'Quest Start' })).toBeNull()
  expect(parseCheck({ text: 'Hi', tag: 'Talk' })).toBeNull()
})

test('checkOdds computes accurate percentages and difficulty bands', () => {
  // Base speech with 5 Gab, 5 Luck = 2 + 10 + 3 = 15
  const base = { attr: '5,5,5,5,5,5,5', skl: skWith(10, 0) }
  expect(checkOdds(base, { skill: 'speech', difficulty: 15 }).pct).toBe(100)
  expect(checkOdds(base, { skill: 'speech', difficulty: 15 }).band).toBe('guaranteed')
  expect(checkOdds(base, { skill: 'speech', difficulty: 25 }).pct).toBe(55)
  expect(checkOdds(base, { skill: 'speech', difficulty: 25 }).band).toBe('risky')
  expect(checkOdds(base, { skill: 'speech', difficulty: 34 }).pct).toBe(10)
  expect(checkOdds(base, { skill: 'speech', difficulty: 34 }).band).toBe('unlikely')
  expect(checkOdds(base, { skill: 'speech', difficulty: 40 }).pct).toBe(0)
  expect(checkOdds(base, { skill: 'speech', difficulty: 40 }).band).toBe('impossible')
  expect(SKILL_NAMES.energy).toBe('Energy Weapons')
})

test('resolveCheck and rollCheck share banner format and record ctx._lastCheck', () => {
  const ctx = { random: () => 0.99 }
  const s = { attr: '5,5,5,5,5,5,5', skl: skWith(10, 10) } // speech = 25
  const res = resolveCheck(ctx, s, { skill: 'speech', difficulty: 35 }) // 25 + 20 >= 35 -> pass, pct = 55%
  expect(res.ok).toBe(true)
  expect(res.pct).toBe(55)
  expect(res.banner).toBe('[Speech 55%] SUCCEEDED')
  expect(ctx._lastCheck).toEqual(res)

  const ctxFail = { random: () => 0 }
  const failRes = rollCheck(ctxFail, s, { skill: 'speech', difficulty: 35 }) // 25 + 1 < 35 -> fail
  expect(failRes.ok).toBe(false)
  expect(failRes.banner).toBe(formatCheckBanner('speech', 55, false))
  expect(ctxFail._lastCheck.ok).toBe(false)
})

test('talkUi renders legacy skill tags with live % odds, band classes, and check banners', () => {
  const npc = { id: 'l11-walker-1', state: { name: 'Courier', role: 'survivor' } }
  const player = {
    id: 'p',
    state: {
      talkWith: 'l11-walker-1',
      attr: '5,5,5,5,5,5,5',
      skl: skWith(10, 20), // speech = 35
      talks: {
        'l11-walker-1': [
          ['p', 'Tell me the password.'],
          ['x', '[Speech 100%] SUCCEEDED'],
          ['n', 'Alright, keep your voice down.'],
        ],
      },
      talkChoices: [
        { text: 'You know the password.', tag: 'Speech 30' }, // 100% -> tc-tag-pass
        { text: 'Give me a massive cut.', tag: 'Speech 54' }, // (20-(54-35)+1)/20 = 10% -> tc-tag-fail + is-unlikely
        { text: 'Good talk.', tag: 'Leave' },
      ],
    },
  }
  const html = talkUi({ place: { objects: { 'l11-walker-1': npc } } }, player)
  expect(html).toContain('tc-chk-pass')
  expect(html).toContain('[Speech 100%] SUCCEEDED')
  expect(html).toContain('tc-tag-pass')
  expect(html).toContain('[SPEECH 30 · 100%]')
  expect(html).toContain('tc-tag-fail')
  expect(html).toContain('is-unlikely')
  expect(html).toContain('[SPEECH 54 · 10%]')
})
