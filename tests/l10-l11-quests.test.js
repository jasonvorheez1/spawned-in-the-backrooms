import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
mock.module('../scripts/player.js', () => ({ takeToken: () => null, weaponAim: () => ({}) }))
mock.module('../scripts/interact.js', () => ({ talk: () => {} }))
mock.module('../scripts/mat-cloth.js', () => ({ PRINTS: {} }))
mock.module('../scripts/lib/carry.js', () => ({ carryAcross: () => {} }))
const { openDialogue, onInput } = await import('../scripts/talk.js')
const L10 = await import('../scripts/level10-use.js')
const L11 = await import('../scripts/level11-use.js')
const WIN = await import('../scripts/level12-window.js')

// one player, any number of givers and props, a fixed roll (random 0.99 → a high roll passes, 0 fails)
function world(place, { roll = 0.99 } = {}) {
  let now = 10000
  const objs = {}
  const self = { id: 'player', userId: 'player', place, state: { level: 1, hp: 100, sanity: 80, ...(roll > 0.5 ? { skl: Array(13).fill(30).join(',') } : {}) }, session: {}, feetPosition: { x: 0, y: 0, z: 1 } }
  objs.player = self
  const ctx = { self, place: { id: place, players: [self], state: {} }, now: () => now, random: () => roll, getObject: (k) => objs[k] ?? null, emit: () => {}, query: () => [], cross: () => {}, destroy: () => {} }
  const npc = (id) => (objs[id] ??= { id, tags: ['npc'], state: { name: id }, feetPosition: { x: 0, y: 0, z: 0 } })
  const say = (id, t) => { now += 1000; onInput(ctx, { pressed: { talk: true }, actionData: { talk: { id, text: t } } }) }
  // the choice on the card as it stands, else on a freshly opened card, paging through "More choices"
  const find = (id, text) => {
    const look = () => { for (let i = 0; i < 6; i++) { const c = self.state.talkChoices.find((c) => c.text.includes(text)); if (c) return c; const more = self.state.talkChoices.find((c) => c.node === 'page'); if (!more) return null; say(id, more.text) } return null }
    let c = self.state.talkWith === id ? self.state.talkChoices.find((c) => c.text.includes(text)) : null
    if (!c) { self.state.talkWith = null; openDialogue(ctx, npc(id)); c = look() }
    return c
  }
  const talk = (id, text) => {
    const c = find(id, text)
    if (!c) throw new Error(`no choice "${text}" for ${id}: ${self.state.talkChoices.map((c) => c.text).join(' | ')}`)
    say(id, c.text)
    return self.state.sub?.t
  }
  const has = (id, text) => { self.state.talkWith = null; return !!find(id, text) }
  const press = (mod, id, kind) => { const o = (objs[id] ??= { id, state: { kind }, feetPosition: { x: 0, y: 0, z: 0 } }); mod.ears.press({ ...ctx, self: o }, { by: 'player' }) }
  const pay = () => { const p = self.state.payout; self.state.payout = null; return p }
  return { ctx, s: self.state, talk, has, press, pay, setRoll: (r) => { roll = r } }
}

test('The Golden Bumper: decline, accept, Cooper\'s sheaves, the mill, the hearth, paid once, then her after-line', () => {
  const w = world('level10'), C = 'l10-meg-cooper'
  w.talk(C, 'harvest'); w.talk(C, 'Not right now.'); expect(w.s.wheatQ).toBeUndefined()
  w.talk(C, 'harvest'); w.talk(C, "I'll take the job."); expect(w.s.wheatQ).toBe(2)
  expect(w.s.quests['the-golden-bumper'].step).toContain('Cut three sheaves')
  w.talk(C, 'Which ones are ripe'); expect(w.s.wheatQ).toBe(3); expect(w.s.wheat).toBe(3)
  expect(w.has(C, 'Which ones are ripe')).toBe(false)
  for (let i = 0; i < 3; i++) w.press(L10, 'l10-windmill-quern', 'windmill-quern')
  expect(w.s.wheatQ).toBe(4)
  w.press(L10, 'l10-hearth-oven', 'hearth-oven'); expect(w.s.wheatQ).toBe(5)
  w.talk(C, 'fresh loaf'); expect(w.s.wheatQ).toBe(99)
  expect(w.pay().xp).toBe(150); const cents = w.s.cents
  expect(w.has(C, 'fresh loaf')).toBe(false)
  w.s.bread = 1; expect(w.has(C, 'fresh loaf')).toBe(false)
  expect(w.talk(C, 'Did the caravan take the loaf')).toContain('signed for the whole crop')
  expect(w.s.cents).toBe(cents); expect(w.s.payout).toBeNull()
  expect(w.s.qdone['the-golden-bumper']).toBeTruthy()
})

test('Cellar in the Shadows: a shored burrow and an open one pay differently, once; the cellar\'s stores come once', () => {
  for (const [roll, sealed, xp] of [[0.99, true, 95], [0, false, 70]]) {
    const w = world('level10', { roll }), C = 'l10-meg-cooper'
    w.talk(C, 'storm cellar'); w.talk(C, "I'll take the job."); expect(w.s.cellarQ).toBe(1)
    w.press(L10, 'l10-storm-cellar', 'storm-cellar')
    expect(w.s.cellarQ).toBe(2); expect(!!w.s.cellarSealed).toBe(sealed)
    expect(w.pay().items).toEqual(['ration', 'ration', 'battery'])
    w.press(L10, 'l10-storm-cellar', 'storm-cellar'); expect(w.pay()).toBeNull()
    w.talk(C, "A worm's boring in"); expect(w.s.cellarQ).toBe(99); expect(w.pay().xp).toBe(xp)
    expect(w.has(C, "A worm's boring in")).toBe(false)
    expect(w.talk(C, 'Is the cellar holding')).toBeTruthy()
  }
})

test('The Still Watcher: crouched search keeps your nerve; Science reads the log for the compass; a failed read still turns in', () => {
  const w = world('level10'), M = 'l10-meg-maeve'
  w.talk(M, 'scarecrow'); w.talk(M, "I'll take the job."); expect(w.s.watcherQ).toBe(2)
  w.s.crouch = true; w.press(L10, 'l10-scarecrow-east', 'scarecrow')
  expect(w.s.watcherQ).toBe(3); expect(w.s.sanity).toBe(80)
  w.talk(M, 'pinning it down'); expect(w.s.watcherQ).toBe(99)
  expect(w.pay().items).toContain('compass')
  expect(w.talk(M, 'more trouble from the scarecrow')).toContain('moved my desk')
  const f = world('level10', { roll: 0 })
  f.talk(M, 'scarecrow'); f.talk(M, "I'll take the job.")
  f.press(L10, 'l10-scarecrow-east', 'scarecrow'); expect(f.s.sanity).toBe(65)
  f.talk(M, 'pinning it down'); expect(f.s.watcherQ).toBe(3); expect(f.has(M, 'pinning it down')).toBe(false)
  f.talk(M, 'Found document 24'); expect(f.s.watcherQ).toBe(99); expect(f.pay().items).not.toContain('compass')
})

test('Spotlight on Sedco: the password from the courier, the vault drive for a second player, sixty-forty once', () => {
  const w = world('level11'), K = 'l11-walker-1'
  w.talk(K, 'Sedco manifest'); w.talk(K, "I'll take the job."); expect(w.s.sedcoQ).toBe(1)
  expect(w.talk(K, 'night password')).toContain('Spotlight')
  expect(w.has(K, 'night password')).toBe(false)
  w.s.sedcoQ = 4 // the terminal and the shop (scripts/os.js and the counter/monitors/spotlight presses)
  w.ctx.getObject('player') // the crate was emptied by someone else already
  w.press(L11, 'l11-vault-crate-sedco', 'supply-chest'); w.ctx.self.state.payout = null
  expect(w.s.sedcoQ).toBe(5)
  w.talk(K, 'sixty-forty'); expect(w.s.sedcoQ).toBe(99); expect(w.s.sedcoHaggle).toBe(1)
  expect(w.pay().text).toContain('$105.00')
  expect(w.has(K, 'master security drive')).toBe(false)
  expect(w.talk(K, 'Any trouble from Sedco')).toContain('signed')
})

test('Spotlight on Sedco to Vance: Beta pays, and Vance tells you what the drive showed', () => {
  const w = world('level11'), V = 'l11-meg-agent-vance'
  w.s.sedcoQ = 5
  w.talk(V, "master security drive out of Sedco's vault"); expect(w.s.sedcoQ).toBe(99); expect(w.s.sedcoTo).toBe('vance')
  expect(w.pay().xp).toBe(135)
  expect(w.talk(V, 'What did Beta find')).toContain('platform')
})

test("The Paper Bird's Blessing: the crane's XP comes once, the valve, the sample, Kael's cut once", () => {
  const w = world('level11'), K = 'l11-trader-kael'
  w.talk(K, 'wrong with the canal'); w.talk(K, "I'll take the job."); expect(w.s.craneQ).toBe(1)
  w.press(L11, 'l11-lucky-crane', 'lucky-crane'); expect(w.s.craneQ).toBe(2); expect(w.pay().xp).toBe(20)
  w.press(L11, 'l11-lucky-crane', 'lucky-crane'); expect(w.pay()).toBeNull()
  w.press(L11, 'l11-canal-pump', 'canal-pump'); expect(w.s.craneQ).toBe(3); expect(w.s.hp).toBe(100)
  w.press(L11, 'l11-canal-pump', 'canal-pump'); expect(w.s.craneQ).toBe(4); w.pay()
  w.talk(K, 'cut of the cargo'); expect(w.s.craneQ).toBe(99); expect(w.pay().text).toContain('$65.00')
  expect(w.has(K, 'cleared the canal lock')).toBe(false)
  expect(w.talk(K, 'barge come in')).toBeTruthy()
})

test('The Night Shift: a failed bleed scalds but goes on; tap and radio; paid once', () => {
  const w = world('level11', { roll: 0 }), J = 'l11-walker-3'
  w.talk(J, 'maintenance rounds'); w.talk(J, "I'll take the job."); expect(w.s.maintQ).toBe(1)
  w.press(L11, 'l11-roadwork-gen', 'roadwork-gen'); expect(w.s.maintQ).toBe(2); expect(w.s.hp).toBe(90)
  w.press(L11, 'l11-apt-radiator', 'apt-radiator'); expect(w.s.maintQ).toBe(3)
  w.press(L11, 'l11-apt-sink', 'apt-tap'); w.press(L11, 'l11-apt-radio', 'apt-radio'); expect(w.s.maintQ).toBe(4)
  expect(w.talk(J, 'hot water again')).toContain('scalded'); expect(w.s.maintQ).toBe(99); expect(w.pay().xp).toBe(90)
  expect(w.has(J, 'hot water again')).toBe(false)
  expect(w.talk(J, '11-B still warm')).toBeTruthy()
})

test('The Lit Window: Vance offers it, Speech skips the tape, the window pays once, then his after-line', () => {
  const w = world('level11'), V = 'l11-meg-agent-vance'
  w.talk(V, "don't look in that window"); w.talk(V, 'Not right now.'); expect(w.s.quests?.['the-lit-window']).toBeUndefined()
  w.talk(V, "don't look in that window"); w.talk(V, "I'll take the job.")
  expect(w.s.quests['the-lit-window'].step).toContain('MATRIX')
  expect(w.s.quests['the-lit-window'].briefing).toContain('Harris')
  w.talk(V, 'What did Harris say'); expect(w.s.know12).toBe(true)
  expect(w.s.quests['the-lit-window'].step).toContain('Walk straight into')
  const win = { id: 'l11-win12', state: {}, feetPosition: { x: 0, y: 1, z: 0 } }
  WIN.onTriggerEnter({ ...w.ctx, self: win }, { id: 'player' })
  expect(w.pay().xp).toBe(150); expect(w.s.qdone['the-lit-window']).toBeTruthy()
  WIN.onTriggerEnter({ ...w.ctx, self: win }, { id: 'player' }); expect(w.s.payout).toBeNull()
  expect(w.has(V, "don't look in that window")).toBe(false)
  expect(w.talk(V, 'I walked through that window')).toContain('came back')
})

test('Fresh Paint: Mara and Cap\'n each have a line for after, by who got the fresheners', async () => {
  const w = world('level11'), M = 'l11-realty-agent'
  w.talk(M, 'work for me'); w.talk(M, "I'll take the job."); expect(w.s.remodQ).toBe(1)
  w.s.remodQ = 3; w.s.fresh = 3
  w.talk(M, 'three fresheners'); expect(w.s.remodQ).toBe(99); expect(w.pay().xp).toBe(220)
  expect(w.has(M, 'three fresheners')).toBe(false)
  expect(w.talk(M, 'listings holding up')).toContain('sales')
})
