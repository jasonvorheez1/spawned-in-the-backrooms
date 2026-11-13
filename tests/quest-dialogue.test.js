import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
mock.module('../scripts/player.js', () => ({ takeToken: () => null, weaponAim: () => ({}) }))
mock.module('../scripts/interact.js', () => ({ talk: () => {} }))
mock.module('../scripts/mat-cloth.js', () => ({ PRINTS: {} }))
const { openDialogue, onInput } = await import('../scripts/talk.js')
const { questChoices } = await import('../scripts/lib/npc-starters.js')
const { jobOffer, choicePage, questProgress } = await import('../scripts/lib/quest-dialogue.js')
const { setQuest, endQuest } = await import('../scripts/lib/quests.js')

function scene(id, place = 'level10') {
  let now = 10000
  const npc = { id, tags: ['npc'], state: { name: id }, feetPosition: { x: 0, y: 0, z: 0 } }
  const self = { id: 'player', userId: 'player', place, state: { level: 1 }, session: {}, feetPosition: { x: 0, y: 0, z: 1 } }
  const ctx = { self, place: { id: place, players: [], objects: { [id]: npc }, state: {} }, now: () => now, random: () => 0.5, getObject: (key) => key === id ? npc : null, emit: () => {}, query: () => [] }
  const choose = (text) => { now += 1000; onInput(ctx, { pressed: { talk: true }, actionData: { talk: { id, text } } }) }
  openDialogue(ctx, npc)
  return { ctx, npc, s: self.state, choose }
}

test('asking about a job explains it without starting it, and declining leaves it available', () => {
  const { s, choose } = scene('l10-meg-cooper')
  choose('Need another pair of hands for the harvest?')
  expect(s.wheatQ).toBeUndefined()
  expect(s.sub.t).toContain('three sheaves')
  choose('Not right now.')
  expect(s.wheatQ).toBeUndefined()
  expect(s.talkChoices.some(c => c.text.includes('harvest'))).toBe(true)
  choose('Need another pair of hands for the harvest?')
  choose("I'll take the job.")
  expect(s.wheatQ).toBe(2)
  expect(s.quests['the-golden-bumper'].briefing).toContain('windmill')
})

test('accepting one job does not accept another offer from the same person', () => {
  const { s, choose } = scene('l10-meg-cooper')
  choose("Something's rattling in the storm cellar. Want me to look?")
  expect(s.cellarQ).toBeUndefined()
  choose("I'll take the job.")
  expect(s.cellarQ).toBe(1)
  expect(s.wheatQ).toBeUndefined()
})

test('each offered job starts its own quest only after acceptance', () => {
  const cases = [
    ['meg-callum', 'level1', 'rationsQ', 'cans like'], ['meg-ortiz', 'level1', 'waterQ', 'worried, doc'],
    ['l0-bntg-kade', 'main', 'zenQ', "hiring"], ['l11-walker-1', 'level11', 'sedcoQ', 'Sedco manifest'],
    ['l11-trader-kael', 'level11', 'craneQ', 'wrong with the canal'], ['l11-walker-3', 'level11', 'maintQ', 'maintenance rounds'],
    ['l10-meg-cooper', 'level10', 'wheatQ', 'harvest'], ['l10-meg-cooper', 'level10', 'cellarQ', 'storm cellar'],
    ['l10-meg-maeve', 'level10', 'watcherQ', 'scarecrow'], ['l8-carla-kid', 'level8', 'carlaQ', 'cheer you up'],
    ['l8-hobb', 'level8', 'spiderQ', 'plate for the perimeter'], ['l8-ivo', 'level8', 'karstQ', 'looping karst'],
    ['l21-ned', 'level21', 'saltineQ', 'condenser'], ['l21-goknar', 'level21', 'edgesQ', 'patrol the hallway'],
    ['l11-realty-agent', 'level11', 'remodQ', 'work for me'], ['l13p-noor', 'level13', 'l13q', 'more than packing'],
    ['l31-q-marlowe', 'level31', 'l31q', 'Buying or selling'], ['l70-npc-marinerson', 'level70', 'l70q', 'dry kettle'],
    ['l70-npc-ines', 'level70', 'l70pelt', 'need doing'],
  ]
  for (const [id, place, key, fragment] of cases) {
    const { s, choose } = scene(id, place)
    let option
    for (let i = 0; i < 12; i++) {
      option = s.talkChoices.find(c => c.text.includes(fragment))
      if (option) break
      const more = s.talkChoices.find(c => c.node === 'page')
      if (!more) break
      choose(more.text)
    }
    expect(option).toBeTruthy()
    choose(option.text)
    expect(s[key] ?? 0).toBe(0)
    expect(s.talkChoices.some(c => c.node === 'job-accept')).toBe(true)
    choose("I'll take the job.")
    expect(s[key]).toBeGreaterThan(0)
  }
})

test('the early reward agrees with the dialogue and does not give a unique gun', async () => {
  const { handleDialogueQuest1 } = await import('../scripts/lib/level1-quests.js')
  const { ctx, npc, s } = scene('meg-callum', 'level1')
  s.rationsQ = 3; s.rAleTalked = 'rAleSpeech'
  const result = handleDialogueQuest1(ctx, ctx.self, npc, "It was Ale. She's been taking your cans.")
  expect(s.rationsQ).toBe(99)
  expect(s.payout.items).toEqual(['ration', 'bandage'])
  expect(result.reply).toContain('ration')
  expect(result.reply).not.toContain('thirty-eight')
})

test('every quest starter from the quest choice providers has an actual briefing', () => {
  const ids = ['l11-walker-1', 'l11-trader-kael', 'l11-walker-3', 'l10-meg-cooper', 'l10-meg-maeve', 'l8-carla-kid', 'l8-hobb', 'l8-ivo', 'l21-ned', 'l21-goknar', 'l11-realty-agent', 'l13p-noor', 'l31-q-marlowe', 'l70-npc-marinerson', 'l70-npc-ines']
  for (const id of ids) {
    const npc = { id }
    const choices = questChoices({ now: () => 1000 }, npc, {})
    expect(choices.filter(c => c.tag === 'Quest Start').length).toBeGreaterThan(0)
    for (const c of choices.filter(c => c.tag === 'Quest Start')) expect(jobOffer(npc, c)?.journal).toBeTruthy()
  }
})

test('pages expose every option and retain the leave control', () => {
  const choices = Array.from({ length: 8 }, (_, i) => ({ text: `choice ${i}` }))
  const bye = { node: 'bye' }
  const pages = [0, 1, 2].map(i => choicePage(choices, i, bye))
  expect(pages.flat().filter(x => x.text?.startsWith('choice ')).map(x => x.text)).toEqual(choices.map(x => x.text))
  for (const p of pages) expect(p.at(-1)).toBe(bye)
  expect(choicePage(choices, 3, bye)).toEqual(pages[0])
})

test('briefings survive objective updates and completion; counters reflect inventory', () => {
  const s = {}
  setQuest(s, 'job', { name: 'Job', step: 'Find it', briefing: 'Look behind the desk.' })
  setQuest(s, 'job', { name: 'Job', step: 'Return it' })
  endQuest(s, 'job', 'Done')
  expect(s.qdone.job.briefing).toBe('Look behind the desk.')
  expect(questProgress('the-saltine-quota', { saltineQ: 2, items: 'wire,copper', scrap: { wire: 1 } })).toBe('Copper wire: 3/3')
})

// Nov 13: the Edges Sentry and Zenith Survey endings (skill routes, haggling, lines after the job)
function at(id, place, st) { const sc = scene(id, place); Object.assign(sc.s, st); openDialogue(sc.ctx, sc.npc); return sc }

test('the Edges Sentry has a Survival route at the report, and Goknar remembers the job', () => {
  const { s, choose } = at('l21-goknar', 'level21', { edgesQ: 3, l21Scouted: 1, skl: Array(20).fill(100).join(',') })
  choose('The Smilers stop where the light stops. Keep the tubes lit and they stay put.')
  expect(s.edgesQ).toBe(99)
  expect(s.payout.xp).toBe(180)
  choose("How's the line holding?")
  expect(s.sub.t).toContain('Lamp')
})

test('the Edges Sentry report no longer mentions a breaker that is not there', () => {
  const { s, choose } = at('l21-goknar', 'level21', { edgesQ: 3, l21Scouted: 1 })
  choose("Walked the dark corridor to the Edges. Nothing's crossing the line.")
  expect(s.edgesQ).toBe(99)
  expect(JSON.stringify(s.qdone ?? {}).toLowerCase()).not.toContain('breaker')
})

test('Kade pays more after a won haggle, once, and talks about Zenith after the job', () => {
  const { s, choose } = at('l0-bntg-kade', 'main', { zenQ: 5, zenV: 2, zenDrive: true, skl: Array(20).fill(100).join(',') })
  choose('Sixty is light for a walk past armed drones.')
  expect(s.zenHaggle).toBe(4000)
  expect(s.talkChoices.some((c) => c.text.startsWith('Sixty'))).toBe(false)
  choose('I found the drive. Here it is.')
  expect(s.zenQ).toBe(99)
  expect(s.cents).toBe(10000)
  choose('Any more work in Zenith?')
  expect(s.sub.t).toContain('Guild')
})
