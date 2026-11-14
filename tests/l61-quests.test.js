import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))

const { QUESTS61, handleDialogueQuest61, l61Choices } = await import('../scripts/lib/level61-quests.js')
const { QUESTS: QUESTS11, handleDialogueQuest: handleL11, l11Choices } = await import('../scripts/lib/level11-quests.js')
const { jobOffer, questBriefing } = await import('../scripts/lib/quest-dialogue.js')
const { nextQuestExit } = await import('../scripts/lib/quest-route.js')
const { ears: propEars } = await import('../scripts/quest-prop-use.js')
const { DLG } = await import('../scripts/lib/dialogue.js')

const mkCtx = (r = 0.5, extra = {}) => ({
  now: () => 1e7,
  random: () => r,
  emit: () => {},
  world: { places: {} },
  place: { id: 'level61', ...extra.place },
  getObject: (id) => extra.objects?.[id] ?? null,
  self: extra.self ?? { id: 'npc', feetPosition: { x: 0, y: 0, z: 0 } },
})
const player = (s) => ({ id: 'p', state: s, feetPosition: { x: 0, y: 0, z: 0 }, worldFeetPosition: { x: 0, y: 0, z: 0 } })
const say61 = (c, s, npcId, t) => handleDialogueQuest61(c, player(s), { id: npcId, state: {} }, t)
const say11 = (c, s, npcId, t) => handleL11(c, player(s), { id: npcId, state: {} }, t)
const hiSkills = Array(20).fill(60).join(',')
const loSkills = Array(20).fill(0).join(',')

test('all four Level 6.1 quests register valid offers, briefings, and starter choices', () => {
  const starters = ['l61-amber-a', 'l61-guard-a', 'l61-guild-a', 'l61-sal']
  for (const id of starters) {
    const offer = jobOffer({ id }, { tag: 'Quest Start', text: '' })
    expect(offer?.briefing).toBeTruthy()
    expect(offer?.journal).toBeTruthy()
    expect(l61Choices(id, {}).some((c) => c.tag === 'Quest Start')).toBe(true)
  }
  for (const q of Object.values(QUESTS61)) {
    const slug = q.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    expect(questBriefing(slug, {})).toBeTruthy()
  }
})

test('Level 6.1 crew dialogue YAML includes cross-level hooks and Dina threads', () => {
  expect(DLG['l61-sal'].ask.some((x) => x.a.includes('Level 10'))).toBe(true)
  expect(DLG['l61-guard-a'].ask.some((x) => x.a.includes('Base Gamma'))).toBe(true)
  expect(DLG['l61-amber-a'].ask.some((x) => x.a.includes('11th Avenue'))).toBe(true)
  expect(DLG['l61-guild-a'].ask.some((x) => x.a.includes('Book of Ways'))).toBe(true)
})

test('Coat of Red, Bus to Nowhere: Wren -> Level 11 commuter -> Hub Jo [Medicine 35] -> turn-in once & gate', () => {
  // Standing gate when Amber is hostile
  const bad = { rep: { amber: -40 } }
  expect(l61Choices('l61-amber-a', bad).some((c) => c.tag === 'Quest Start')).toBe(false)
  expect(say61(mkCtx(), bad, 'l61-amber-a', 'That board mentions someone named Bee in a red coat.').mood).toBe('sad')

  const s = { skl: hiSkills, cents: 0 }
  const start = say61(mkCtx(), s, 'l61-amber-a', 'That board mentions someone named Bee in a red coat.')
  expect(start.reply).toContain('11th Avenue')
  expect(s.l61BeeQ).toBe(1)

  // Fail Speech 30 stays stage 1
  const low = { l61BeeQ: 1, skl: loSkills }
  say61(mkCtx(0), low, 'l11-commuter-faceling', 'Please — about the red wool coat, do you remember which tunnel she asked about?')
  expect(low.l61BeeQ).toBe(1)

  // Pass Speech 30 -> stage 2
  const c2 = say61(mkCtx(), s, 'l11-commuter-faceling', 'Please — about the red wool coat, do you remember which tunnel she asked about?')
  expect(c2.mood).toBe('happy')
  expect(s.l61BeeQ).toBe(2)

  // Hub Jo Medicine 35 path -> stage 3 with medical bonus
  const joChoice = l61Choices('hub-amber-jo', s).find((x) => x.text.includes('frostbite'))
  expect(joChoice).toBeTruthy()
  const joRes = say61(mkCtx(), s, 'hub-amber-jo', joChoice.text)
  expect(joRes.mood).toBe('happy')
  expect(s.l61BeeQ).toBe(3)
  expect(s.l61BeeSafe).toBe(1)
  expect(s.l61BeeMed).toBe(1)

  // Return to Wren & verify single turn-in
  const turnIn = l61Choices('l61-amber-a', s).find((x) => x.tag === 'Quest Turn-In')
  expect(turnIn).toBeTruthy()
  const done = say61(mkCtx(), s, 'l61-amber-a', turnIn.text)
  expect(done.mood).toBe('happy')
  expect(s.l61BeeQ).toBe(99)
  expect(s.cents).toBe(6000)
  expect(s.payout.items).toContain('firstaid')

  // No duplicate turn-in; post-quest follow-up available on both Wren and Jo
  expect(l61Choices('l61-amber-a', s).some((x) => x.tag === 'Quest Turn-In')).toBe(false)
  const postWren = l61Choices('l61-amber-a', s).find((x) => x.text.includes('settling in'))
  const postJo = l61Choices('hub-amber-jo', s).find((x) => x.text.includes("How's Bee"))
  expect(say61(mkCtx(), s, 'l61-amber-a', postWren.text).reply).toContain('corkboard')
  expect(say61(mkCtx(), s, 'hub-amber-jo', postJo.text).reply).toContain('peaches')
})

test('Sealed 6.1-02: Level 6 relay prop + Vale Base Gamma diagnostics + single turn-in', () => {
  const s = { skl: loSkills, cents: 0, l61SealQ: 0 }
  expect(say61(mkCtx(), s, 'l61-guard-a', "What's behind Seal 6.1-02 in the back stockroom?").reply).toContain('Base Gamma')
  expect(s.l61SealQ).toBe(1)

  // Simulate Level 6 relay blackbox pickup via shared prop handler
  const p = player(s)
  propEars.press(mkCtx(0.5, {
    self: { state: { kind: 'l6-meg-relay' }, feetPosition: { x: 1, y: 0, z: 1 } },
    objects: { p },
  }), { by: 'p' })
  expect(s.l61RelayTape).toBe(1)
  expect(s.payout.xp).toBe(30)

  // Move to Vale at stage 2 with relay tape -> verified ruling even on low Science
  s.l61SealQ = 2
  const valeChoice = l61Choices('gamma-vale', s).find((x) => x.text.includes('relay tape'))
  expect(valeChoice).toBeTruthy()
  const vRes = say61(mkCtx(), s, 'gamma-vale', valeChoice.text)
  expect(vRes.reply).toContain('dampener')
  expect(s.l61SealRuling).toBe('verified')
  expect(s.l61SealQ).toBe(3)

  // Turn in to M.E.G. Guard B or A
  const turn = l61Choices('l61-guard-b', s).find((x) => x.tag === 'Quest Turn-In')
  expect(turn).toBeTruthy()
  const fin = say61(mkCtx(), s, 'l61-guard-b', turn.text)
  expect(fin.mood).toBe('happy')
  expect(s.l61SealQ).toBe(99)
  expect(s.cents).toBe(8000)

  // Caution path also yields lower payout & distinct post-quest line
  const sc = { skl: loSkills, cents: 0, l61SealQ: 2 }
  const cChoice = l61Choices('gamma-vale', sc).find((x) => x.text.includes('caution dampener'))
  say61(mkCtx(), sc, 'gamma-vale', cChoice.text)
  expect(sc.l61SealRuling).toBe('caution')
  expect(sc.l61SealQ).toBe(3)
  say61(mkCtx(), sc, 'l61-guard-a', "I brought Vale's diagnostics on Seal 6.1-02.")
  expect(sc.l61SealQ).toBe(99)
  expect(sc.cents).toBe(5500)
  expect(say61(mkCtx(), sc, 'l61-guard-a', 'Is Seal 6.1-02 staying quiet?').reply).toContain('bolts')
})

test('Four Hundred and Thirteen: Level 3 plate prop -> Base Omega -> Guild [Survival 40] vs M.E.G. branch', () => {
  const s = { skl: hiSkills, cents: 0 }
  expect(say61(mkCtx(), s, 'l61-guild-a', 'If 412 ways are written, what belongs on Page 413?').reply).toContain('east suction vent')
  expect(s.l61GuildQ).toBe(1)

  // Inspect Level 3 Guild plate via quest-prop-use
  const p = player(s)
  propEars.press(mkCtx(0.5, {
    self: { state: { kind: 'l3-guild-plate' }, feetPosition: { x: 2, y: 0, z: 2 } },
    objects: { p },
  }), { by: 'p' })
  expect(s.l61L3Logged).toBe(1)
  expect(s.l61GuildQ).toBe(2)

  // Ask Sgt. Okafor at Base Omega -> stage 3
  const okafor = l61Choices('omega-okafor', s).find((x) => x.text.includes('sensor telemetry'))
  expect(okafor).toBeTruthy()
  const oRes = say61(mkCtx(), s, 'omega-okafor', okafor.text)
  expect(oRes.reply).toContain('B4')
  expect(s.l61VendSurvey).toBe(1)
  expect(s.l61GuildQ).toBe(3)

  // Guild Survival 40 hazard marking branch
  const gCopy = { ...s }
  const surv = l61Choices('l61-guild-a', gCopy).find((x) => x.tag === 'Survival 40')
  expect(say61(mkCtx(), gCopy, 'l61-guild-a', surv.text).mood).toBe('happy')
  expect(gCopy.l61GuildQ).toBe(99)
  expect(gCopy.l61GuildTo).toBe('guild-warn')
  expect(gCopy.cents).toBe(7500)
  expect(say61(mkCtx(), gCopy, 'l61-guild-a', "How's Page 413 holding up in the Book?").reply).toContain('Page 413')

  // Alternative M.E.G. sellout branch
  const mCopy = { ...s }
  const megChoice = l61Choices('l61-guard-a', mCopy).find((x) => x.text.includes('unguarded vent'))
  expect(say61(mkCtx(), mCopy, 'l61-guard-a', megChoice.text).reply).toContain('lockboxes')
  expect(mCopy.l61GuildQ).toBe(99)
  expect(mCopy.l61GuildTo).toBe('meg')
  expect(mCopy.cents).toBe(9000)
  expect(say61(mkCtx(), mCopy, 'l61-guild-a', "How's Page 413 holding up in the Book?").mood).toBe('annoyed')
})

test('Paper Bird rewrite + Two Menus Short: tray recognition, Guild waybill, Kael coffee favor, Guild dividend', () => {
  const s = { skl: hiSkills, cents: 2000, l61TraysReturned: 2, craneQ: 0 }

  // 1. Complete Kael's Paper Bird's Blessing with new Guild Barge Waybill hook
  const kaelStart = l11Choices('l11-trader-kael', s).find((c) => c.tag === 'Quest Start')
  expect(kaelStart).toBeTruthy()
  const kStart = say11(mkCtx(), s, 'l11-trader-kael', kaelStart.text)
  expect(kStart.reply).toContain('Guild')
  expect(s.craneQ).toBe(1)

  // Pick up Guild Waybill + Science 35 valve tip in Level 6.1
  const gWaybill = l61Choices('l61-guild-a', s).find((c) => c.text.includes('spillway head'))
  expect(gWaybill).toBeTruthy()
  const gwRes = say61(mkCtx(), s, 'l61-guild-a', gWaybill.text)
  expect(gwRes.reply).toContain('Guild Barge Waybill')
  expect(s.craneWaybill).toBe(1)
  expect(s.craneSci).toBe(1)

  // Reach spillway stage 4 and turn in at Kael using Guild customs choice
  s.craneQ = 4
  s.craneWheel = 1
  const kaelTurnChoice = l11Choices('l11-trader-kael', s).find((c) => c.text.includes('customs waybill'))
  expect(kaelTurnChoice).toBeTruthy()
  const kTurn = say11(mkCtx(), s, 'l11-trader-kael', kaelTurnChoice.text)
  expect(kTurn.reply).toContain('customs dividend')
  expect(s.craneQ).toBe(99)
  expect(s.craneGuildClear).toBe(1)

  // Claim one-time Guild Barge Dividend back in Level 6.1
  const divChoice = l61Choices('l61-guild-a', s).find((c) => c.text.includes('customs waybill cleared'))
  expect(divChoice).toBeTruthy()
  expect(say61(mkCtx(), s, 'l61-guild-a', divChoice.text).mood).toBe('happy')
  expect(s.craneGuildPaid).toBe(1)
  expect(l61Choices('l61-guild-a', s).some((c) => c.text.includes('customs waybill cleared'))).toBe(false)

  // 2. Sal tray bonus & Two Menus Short with free Kael coffee from Paper Bird completion
  const trayBonus = l61Choices('l61-sal', s).find((c) => c.text.includes('bus your tray'))
  expect(trayBonus).toBeTruthy()
  expect(say61(mkCtx(), s, 'l61-sal', trayBonus.text).reply).toContain('pickles')
  expect(s.l61TrayBonus).toBe(1)

  const salStart = say61(mkCtx(), s, 'l61-sal', 'Can a faceling burger ever run on real supplies?')
  expect(salStart.reply).toContain('bused your trays')
  expect(s.l61SalQ).toBe(1)

  // Level 10 Wren Speech 35 -> stage 2
  const wChoice = l61Choices('l10-meg-wren', s).find((c) => c.tag === 'Speech 35')
  expect(say61(mkCtx(), s, 'l10-meg-wren', wChoice.text).reply).toContain('double-stitched sack')
  expect(s.l61SalQ).toBe(2)

  // Level 11 Kael honors craneQ === 99 with free coffee!
  const kCoffee = l61Choices('l11-trader-kael', s).find((c) => c.text.includes('coffee for Sal'))
  expect(kCoffee.text).toContain('lock favor')
  const kFree = say61(mkCtx(), s, 'l11-trader-kael', kCoffee.text)
  expect(kFree.reply).toContain('zero charge')
  expect(s.l61SalQ).toBe(3)

  // Turn in to Sal
  const salTurn = l61Choices('l61-sal', s).find((c) => c.tag === 'Quest Turn-In')
  const salDone = say61(mkCtx(), s, 'l61-sal', salTurn.text)
  expect(salDone.reply).toContain('real wheat, real dark roast')
  expect(s.l61SalQ).toBe(99)
})

test('nextQuestExit resolves valid cross-level exit routes out of Level 6.1', () => {
  const routeCtx = {
    place: {
      id: 'level61',
      objects: {
        'l61-to-l6': { feetPosition: { x: -10, y: 0, z: 0 } },
        'l61-vent-in': { feetPosition: { x: 10, y: 0, z: -2 } },
        'l61-to-l11': { feetPosition: { x: 14, y: 0, z: 0 } },
      },
    },
  }
  const pl = (state = {}) => ({ place: 'level61', feetPosition: { x: 0, y: 0, z: 0 }, state })
  expect(nextQuestExit(routeCtx, pl(), 'level11').via).toBe('level11')
  expect(nextQuestExit(routeCtx, pl(), 'thehub').via).toBe('level3')
  expect(nextQuestExit(routeCtx, pl(), 'gamma').via).toBe('level3')
  expect(nextQuestExit(routeCtx, pl(), 'level4').via).toBe('level3')
  expect(nextQuestExit(routeCtx, pl(), 'level10').via).toBe('level11')
  expect(nextQuestExit(routeCtx, pl({ nvg: 1, battery: 10 }), 'level6').via).toBe('level6')
})
