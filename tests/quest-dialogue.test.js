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

test('Hub errand offers and acceptance work on the conversation card', () => {
  const { s, choose } = scene('hub-amber-jo', 'thehub')
  choose('Could the newcomer box use supplies?')
  expect(s.errands).toBeUndefined()
  expect(s.sub.t).toContain('Two bandages')
  choose("I'll bring supplies for the box.")
  expect(s.errands['jo-supply'].stage).toBe(0)
  expect(s.quests['err-jo-supply'].step).toContain('bandages')
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
    ['l61-amber-a', 'level61', 'l61BeeQ', 'red coat'], ['l61-guard-a', 'level61', 'l61SealQ', 'Seal 6.1-02'],
    ['l61-guild-a', 'level61', 'l61GuildQ', 'Page 413'], ['l61-sal', 'level61', 'l61SalQ', 'real supplies'],
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

test('a supply note reveals Ale before or during Short Rations without starting the quest', async () => {
  const { ears } = await import('../scripts/quest-prop-use.js')
  const read = (sc) => {
    const note = { id: 'l1-ration-note', state: { kind: 'l1-ration-note' }, feetPosition: { x: 10.1, y: 1.405, z: 3.9 } }
    ears.press({ ...sc.ctx, self: note, getObject: id => id === 'player' ? sc.ctx.self : null }, { by: 'player' })
  }
  const early = scene('meg-callum', 'level1')
  read(early)
  expect(early.s.rationsQ).toBeUndefined()
  expect(early.s.reading).toBe(1101)
  read(early)
  expect(early.s.pages.split(',').filter(x => x === '1101')).toHaveLength(1)
  early.choose("You're counting those cans like they owe you money. Something wrong?")
  early.choose("I'll take the job.")
  expect(early.s.rationsQ).toBe(2)
  expect(early.s.quests['short-rations'].mark.id).toBe('meg-ale')

  const active = scene('meg-callum', 'level1')
  active.choose("You're counting those cans like they owe you money. Something wrong?")
  active.choose("I'll take the job.")
  expect(active.s.rationsQ).toBe(1)
  read(active)
  expect(active.s.rationsQ).toBe(2)
  expect(active.s.quests['short-rations'].step).toContain('Ale')
  active.s.rationsQ = 3
  read(active)
  expect(active.s.rationsQ).toBe(3)
})

test('Short Rations outcomes change later faction conversations and Bad Water', async () => {
  const { handleDialogueQuest1, l1Choice } = await import('../scripts/lib/level1-quests.js')
  const helped = scene('meg-callum', 'level1')
  Object.assign(helped.s, { rationsQ: 3, rAleTalked: 'rAid', waterQ: 1 })
  const resolve = "Ale took the cans for a family. I brought water. Can we help them instead of punishing her?"
  handleDialogueQuest1(helped.ctx, helped.ctx.self, helped.npc, resolve)
  expect(helped.s.rationsOutcome).toBe('helped')
  const trust = l1Choice(helped.ctx, helped.npc, helped.s, []).find(c => c.text.includes("We found a way"))
  expect(trust).toBeTruthy()
  openDialogue(helped.ctx, helped.npc)
  helped.choose(trust.text)
  expect(helped.s.waterQ).toBe(2)
  expect(helped.s.quests['bad-water'].step).toContain('Dr. Ortiz')
  expect(helped.s.sub.t).toContain("Ortiz's patient")

  const medic = { id: 'meg-ortiz' }
  expect(l1Choice(helped.ctx, medic, helped.s, []).some(c => c.text.includes('family in the east halls'))).toBe(true)
  const hub = scene('hub-amber-jo', 'thehub')
  Object.assign(hub.s, { rationsQ: 99, rationsOutcome: 'helped' })
  openDialogue(hub.ctx, hub.npc)
  const joLine = 'Have you heard from Ale about the family on Level 1?'
  expect(hub.s.talkChoices.some(c => c.text === joLine)).toBe(true)
  hub.choose(joLine)
  expect(hub.s.payout.items).toEqual(['almond', 'bandage'])
  expect(hub.s.talkChoices.some(c => c.text === joLine)).toBe(false)

  const sold = scene('bntg-voss', 'level1')
  Object.assign(sold.s, { rationsQ: 3, rAleTalked: 'rAleSpeech', waterQ: 1 })
  const sell = "Ale's skimming Callum's crates for a family in the east halls. What's that worth to you?"
  handleDialogueQuest1(sold.ctx, sold.ctx.self, sold.npc, sell)
  expect(sold.s.rationsOutcome).toBe('sold')
  const news = l1Choice(sold.ctx, sold.npc, sold.s, []).find(c => c.text.includes("Ale's debt"))
  expect(news).toBeTruthy()
  expect(handleDialogueQuest1(sold.ctx, sold.ctx.self, sold.npc, news.text).reply).toContain('hauling')
  expect(l1Choice(sold.ctx, { id: 'meg-callum' }, sold.s, []).some(c => c.text.includes('We found a way'))).toBe(false)

  const legacy = { rationsQ: 99, waterQ: 1, qdone: { 'short-rations': { text: "Quest completed: Short Rations · found help for Ale's family · Callum's Lucky Thirteen" } } }
  expect(l1Choice(helped.ctx, helped.npc, legacy, []).some(c => c.text.includes('We found a way'))).toBe(true)
  const unknown = { rationsQ: 3, rAleTalked: 'rAleBarter' }
  expect(l1Choice(sold.ctx, sold.npc, unknown, []).some(c => c.text === sell)).toBe(false)
  expect(handleDialogueQuest1(sold.ctx, { state: unknown }, sold.npc, sell)).toBeNull()
})

test('every quest starter from the quest choice providers has an actual briefing', () => {
  const ids = ['l11-walker-1', 'l11-trader-kael', 'l11-walker-3', 'l10-meg-cooper', 'l10-meg-maeve', 'l8-carla-kid', 'l8-hobb', 'l8-ivo', 'l21-ned', 'l21-goknar', 'l11-realty-agent', 'l13p-noor', 'l31-q-marlowe', 'l70-npc-marinerson', 'l70-npc-ines', 'l61-amber-a', 'l61-guard-a', 'l61-guild-a', 'l61-sal']
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
