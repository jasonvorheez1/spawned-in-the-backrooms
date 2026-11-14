// Nov 13: the Hub's main-quest step and its side quests: no lockouts, real rolls
import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
const { hubRoute } = await import('../scripts/lib/hub-route.js')
const { hubChoices, handleDialogueQuestHub } = await import('../scripts/lib/hub-quest.js')
const ctx = (r = 0.5) => ({ now: () => 1e7, random: () => r, emit: () => {}, world: { places: {} }, self: { id: 'p' } })
const say = (c, s, npc, t) => handleDialogueQuestHub(c, { id: 'p', state: s }, { id: npc, state: {} }, t)

test('arriving without Phoebe still points at the ledger, and reading it opens the tenth tunnel', () => {
  const s = { dinaQ: 9, hubPhoebe: true }
  hubRoute(ctx(), s, 'thehub')
  expect(s.quests['the-tenth-tunnel'].step).not.toContain('Phoebe')
  s.hubLedger = 1; hubRoute(ctx(), s, 'thehub')
  expect(s.quests['the-tenth-tunnel'].step).toContain('tenth tunnel')
  hubRoute(ctx(), s, 'level11'); expect(s.hubRouteDone).toBeUndefined()
  s.hubTenthCrossed = 1; hubRoute(ctx(), s, 'level11'); expect(s.hubRouteDone).toBe(1)
})

test('Okafor can be asked about Dina by anyone who knows her name', () => {
  const s = { trail: { name: 1 } }
  const c = hubChoices(ctx(), { id: 'hub-meg-okafor' }, s).find((x) => x.text.includes('Dina'))
  expect(c).toBeTruthy(); expect(say(ctx(), s, 'hub-meg-okafor', c.text).reply).toContain('tenth tunnel'); expect(s.hubDinaAsk).toBe(1)
})

test("Lin's Speech 45 is rolled; a failed lie hides the option but returning the key still works", () => {
  const s = { hubMK: 3, skl: Array(20).fill(0).join(',') }
  say(ctx(0), s, 'hub-meg-lin', "[Speech 45] It's gone. Someone used it.")
  expect(s.hubMK).toBe(3); expect(s.hubMKlie).toBe(1)
  expect(hubChoices(ctx(), { id: 'hub-meg-lin' }, s).some((c) => c.text.includes('Speech'))).toBe(false)
  say(ctx(), s, 'hub-meg-lin', "Found it. Here's your key."); expect(s.hubMK).toBe(99)
})

test('selling the tapes to Pip moves the blank-door lead to Pip, not Sato', () => {
  const s = { hubLR: 2 }
  say(ctx(), s, 'hub-amber-pip', 'Want to buy some M.E.G. recorders?')
  expect(hubChoices(ctx(), { id: 'hub-meg-sato' }, s).length).toBe(0)
  say(ctx(), s, 'hub-amber-pip', 'Anything good on those tapes?')
  say(ctx(), s, 'hub-amber-pip', "I'll go and find that door.")
  expect(s.hubUP).toBe(1)
})

test('the blank-door objective points to the actual door and repairs older saves', () => {
  const s = { hubLR: 99, hubUPask: 1 }
  say(ctx(), s, 'hub-meg-sato', "I'll go and look at it.")
  expect(s.quests['hub-uncharted'].mark.id).toBe('hub-blank')
  s.quests['hub-uncharted'].mark.id = 'hub-uncharted'
  hubRoute(ctx(), s, 'thehub')
  expect(s.quests['hub-uncharted'].mark.id).toBe('hub-blank')
})

test('Camp Amber can complete the door investigation when the post is hostile', () => {
  const s = { hubUP: 2, rep: { meg: -80 }, quests: { 'hub-uncharted': { name: 'Uncharted Passage', step: 'Report back' } } }
  expect(hubChoices(ctx(), { id: 'hub-amber-pip' }, s).some(x => x.text.includes('unmarked door you wanted'))).toBe(true)
  say(ctx(), s, 'hub-amber-pip', 'I found the unmarked door you wanted to know about.')
  expect(s.hubUP).toBe(99); expect(s.cents).toBe(12000); expect(s.qdone['hub-uncharted'].outcome).toBe('completed')
})

test('Sato rewards a key that has an actual matching door', async () => {
  const { keyDoor } = await import('../scripts/lib/hubkeys.js')
  const s = { hubUP: 2 }
  say(ctx(), s, 'hub-meg-sato', 'I found the door with no mark.')
  const place = Object.keys(s.hubKeys)[0]
  expect(keyDoor(place)).toBeTruthy()
})

test('the missing key remains available to another player', async () => {
  const { ears } = await import('../scripts/hub-thing.js')
  const item = { state: { kind: 'keytag' }, visible: true, tags: ['usable', 'hub-thing'] }
  const a = { id: 'a', state: { hubMK: 2 } }, b = { id: 'b', state: { hubMK: 2 } }
  const c = { ...ctx(), self: item, getObject: id => id === 'a' ? a : b }
  ears.press(c, { by: 'a' }); ears.press(c, { by: 'b' })
  expect(a.state.hubMK).toBe(3); expect(b.state.hubMK).toBe(3)
  expect(item.visible).toBe(true); expect(item.tags).toContain('usable')
})

test('Hub errands require a clear offer and a deliberate hand-in', async () => {
  const { errandTick } = await import('../scripts/lib/errands.js')
  const { hubErrandChoices, handleHubErrand } = await import('../scripts/lib/hub-errands.js')
  const s = { talkWith: 'hub-amber-jo', snacks: { bandage: 2, firstaid: 1 } }
  const p = { id: 'p', state: s, session: {}, feetPosition: { x: 0, y: 0, z: 0 } }
  const c = { ...ctx(), self: p, session: {}, getObject: () => null }
  const npc = { id: 'hub-amber-jo' }
  errandTick(c, c.session, s, 'thehub')
  expect(s.errands).toBeUndefined()
  const ask = hubErrandChoices(npc, s).find(x => x.text.includes('newcomer box'))
  expect(ask).toBeTruthy(); handleHubErrand(c, p, npc, ask.text)
  expect(s.errands).toBeUndefined()
  const accept = hubErrandChoices(npc, s).find(x => x.tag === 'Quest Start')
  handleHubErrand(c, p, npc, accept.text)
  expect(s.errands['jo-supply'].stage).toBe(0)
  errandTick(c, c.session, s, 'thehub')
  c.session.errAt = 0; errandTick(c, c.session, s, 'thehub')
  expect(s.errands['jo-supply'].stage).toBe(1)
  s.talkWith = null; errandTick(c, c.session, s, 'thehub'); s.talkWith = npc.id; errandTick(c, c.session, s, 'thehub')
  expect(s.snacks).toEqual({ bandage: 2, firstaid: 1 }); expect(s.errands['jo-supply'].done).toBeUndefined()
  const hand = hubErrandChoices(npc, s).find(x => x.tag === 'Quest Turn-In')
  handleHubErrand(c, p, npc, hand.text)
  expect(s.snacks).toEqual({ bandage: 0, firstaid: 1 }); expect(s.errands['jo-supply'].done).toBe(1)
  expect(s.qdone['err-jo-supply'].outcome).toBe('completed')
})

test('the third-tunnel survey asks for an actual door rather than imaginary enemies', async () => {
  const { ERRANDS } = await import('../scripts/lib/errands.js')
  const { doorById } = await import('../scripts/lib/thehub.js')
  const stage = ERRANDS['sato-markers'].stages[0]
  expect(stage.kind).toBe('find'); expect(doorById(stage.target)).toBeTruthy()
})

test('Hub routes identify the real crossings', async () => {
  const { nextQuestExit } = await import('../scripts/lib/quest-route.js')
  const p = { place: 'level1', state: {}, feetPosition: { x: 0, y: 0, z: 0 } }
  const c = { place: { id: 'level1', objects: { 'l1-to-hub': { feetPosition: { x: 5, y: 0, z: 0 } } } } }
  expect(nextQuestExit(c, p, 'thehub')).toMatchObject({ exit: 'l1-to-hub', via: 'thehub' })
  p.place = 'thehub'; c.place = { id: 'thehub', objects: { 'hd-t10-a3': { feetPosition: { x: 8, y: 0, z: 0 } } } }
  expect(nextQuestExit(c, p, 'level11')).toMatchObject({ exit: 'hd-t10-a3', via: 'level11' })
})

test('Level 1 errands require explicit acceptance and do not consume supplies on greeting', async () => {
 const { errandTick } = await import('../scripts/lib/errands.js')
 const { fieldErrandChoices, handleFieldErrand } = await import('../scripts/lib/field-errands.js')
 const s = { talkWith: 'meg-ale', snacks: { stillwater: 3 } }, p = { id:'p', place:'level1', state:s, session:{}, feetPosition:{x:0,y:0,z:0} }
 const c = { ...ctx(), self:p, session:{}, getObject:()=>null }, npc={id:'meg-ale'}
 errandTick(c,c.session,s,'level1'); expect(s.errands).toBeUndefined()
 const inquiry = fieldErrandChoices(c,npc,s).find(x=>x.text.includes('Water for the Fire'))
 expect(inquiry).toBeTruthy(); handleFieldErrand(c,p,npc,inquiry.text); expect(s.errands).toBeUndefined()
 const offer=fieldErrandChoices(c,npc,s).find(x=>x.tag==='Quest Start'); handleFieldErrand(c,p,npc,offer.text)
 c.session.errAt = 0; errandTick(c,c.session,s,'level1'); expect(s.errands['ale-water'].stage).toBe(1)
 s.talkWith=null; errandTick(c,c.session,s,'level1'); s.talkWith=npc.id; errandTick(c,c.session,s,'level1')
 expect(s.snacks.stillwater).toBe(3); expect(s.errands['ale-water'].done).toBeUndefined()
 const done=fieldErrandChoices(c,npc,s).find(x=>x.tag==='Quest Turn-In'); handleFieldErrand(c,p,npc,done.text)
 expect(s.snacks.stillwater).toBe(0); expect(s.errands['ale-water'].done).toBe(1)
})

test('Lin offers named keys for built levels and never charges for sealed doors', () => {
 const c = ctx(), npc={id:'hub-meg-lin'}, s={hubMK:99,cents:50000}
 c.world.files = ['places/level6/config.yaml','places/level13/config.yaml']
 const choices = hubChoices(c,npc,s)
 const six = choices.find(x=>x.text.includes('Level 6 key'))
 const thirteen = choices.find(x=>x.text.includes('Level 13 key'))
 expect(six).toBeTruthy(); expect(thirteen).toBeTruthy(); expect(choices.some(x=>x.text.includes('Level 14 key'))).toBe(false)
 say(c,s,npc.id,six.text); expect(s.hubKeys.level6).toBe(1); expect(s.cents).toBe(35000)
 say(c,s,npc.id,thirteen.text); expect(s.hubKeys.level13).toBe(1); expect(s.cents).toBe(15000)
 say(c,s,npc.id,thirteen.text); expect(s.cents).toBe(15000); expect(s.hubKeys.level13).toBe(1)
 const result=say(c,s,npc.id,"I'd like the Level 14 key. [$225]")
 expect(result.reply).toContain('sealed'); expect(s.cents).toBe(15000)
})

test('Lin checks funds before issuing a key and requires the Missing Key quest', () => {
 const c=ctx(), s={cents:14999}; c.world.files=['places/level6/config.yaml']
 const choice="I'd like the Level 6 key. [$150]"
 expect(hubChoices(c,{id:'hub-meg-lin'},s).some(x=>x.text===choice)).toBe(false)
 s.hubMK=99; expect(say(c,s,'hub-meg-lin',choice).reply).toContain('short')
 expect(s.cents).toBe(14999); expect(s.hubKeys).toBeUndefined()
})


test('Lin gives directions for each held key independently', () => {
 const c=ctx(), s={hubMK:99, hubKeys:{level6:1,level13:1}}
 c.world.files=['places/level6/config.yaml','places/level13/config.yaml']
 const options=hubChoices(c,{id:'hub-meg-lin'},s)
 const six=options.find(x=>x.text==='Where is the door for my Level 6 key?')
 const thirteen=options.find(x=>x.text==='Where is the door for my Level 13 key?')
 expect(six).toBeTruthy(); expect(thirteen).toBeTruthy()
 expect(say(c,s,'hub-meg-lin',six.text).reply).toContain('twelfth tunnel')
 expect(say(c,s,'hub-meg-lin',thirteen.text).reply).toContain('back road')
})

test('Level 11 door (t10-a3) is locked behind a key rather than always open', async () => {
  const { OPEN, KEYED } = await import('../scripts/lib/thehub.js')
  expect(OPEN['t10-a3']).toBeUndefined()
  expect(KEYED['t10-a3']).toBe('level11')
})

test('Phoebe offers branching dialogue choices with different outcomes for the Level 11 key', () => {
  const ask = "I'm looking for Dina. Did she come through here?"

  // 1. Speech 40 persuasion outcome
  const s1 = { skl: Array(20).fill(50).join(',') }
  expect(hubChoices(ctx(), { id: 'hub-phoebe' }, s1).some(x => x.text === ask)).toBe(true)
  say(ctx(), s1, 'hub-phoebe', ask)
  const sp = hubChoices(ctx(), { id: 'hub-phoebe' }, s1).find(x => x.tag === 'speech')
  expect(sp).toBeTruthy()
  say(ctx(0.99), s1, 'hub-phoebe', sp.text)
  expect(s1.hubPhoebeDeal).toBe('persuaded'); expect(s1.hubKeys.level11).toBe(1)

  // 2. Buy for $150 outcome
  const s2 = { cents: 20000 }
  say(ctx(), s2, 'hub-phoebe', ask)
  const buy = hubChoices(ctx(), { id: 'hub-phoebe' }, s2).find(x => x.text.includes('$150'))
  say(ctx(), s2, 'hub-phoebe', buy.text)
  expect(s2.hubPhoebeDeal).toBe('bought'); expect(s2.cents).toBe(5000); expect(s2.hubKeys.level11).toBe(1)

  // 3. Favor (M.E.G. ledger) outcome
  const s3 = { dinaQ: 9 }
  say(ctx(), s3, 'hub-phoebe', ask)
  const fav = hubChoices(ctx(), { id: 'hub-phoebe' }, s3).find(x => x.text.includes('What do you want for it'))
  say(ctx(), s3, 'hub-phoebe', fav.text)
  expect(s3.hubPhoebeDeal).toBe('favor_pending')
  hubRoute(ctx(), s3, 'thehub'); expect(s3.quests['the-tenth-tunnel'].mark.id).toBe('hub-ledger')
  s3.hubLedger = 1
  const turnIn = hubChoices(ctx(), { id: 'hub-phoebe' }, s3).find(x => x.tag === 'Quest Turn-In')
  say(ctx(), s3, 'hub-phoebe', turnIn.text)
  expect(s3.hubPhoebeDeal).toBe('favor'); expect(s3.hubKeys.level11).toBe(1)
  hubRoute(ctx(), s3, 'thehub'); expect(s3.quests['the-tenth-tunnel'].mark.id).toBe('hd-t10-a3')

  // 4. Hostile demand cuts off Phoebe and opens M.E.G. / Camp Amber backup key
  const s4 = { cents: 25000 }
  say(ctx(), s4, 'hub-phoebe', ask)
  const dem = hubChoices(ctx(), { id: 'hub-phoebe' }, s4).find(x => x.tag === 'Demand')
  say(ctx(), s4, 'hub-phoebe', dem.text)
  expect(s4.hubPhoebeDeal).toBe('hostile'); expect(s4.hubKeys).toBeUndefined()
  const okOffer = hubChoices(ctx(), { id: 'hub-meg-okafor' }, s4).find(x => x.text.includes('Level 11 key'))
  expect(okOffer).toBeTruthy()
  say(ctx(), s4, 'hub-meg-okafor', okOffer.text)
  expect(s4.hubKeys.level11).toBe(1); expect(s4.cents).toBe(5000)
})

test('Phoebe dialogue lets the player ask if she is a Partygoer and reveals she is the last Mimic', async () => {
  const { DLG } = await import('../scripts/lib/dialogue.js')
  const ask = DLG['hub-phoebe']?.ask ?? []
  const pg = ask.find(x => /partygoer/i.test(x.q))
  expect(pg).toBeTruthy()
  const mimic = pg.then?.find(x => /what are you/i.test(x.q))
  expect(mimic?.a).toMatch(/mimic/i)
  expect(mimic?.a).toMatch(/last one of my kind/i)
})

