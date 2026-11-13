import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
mock.module('../scripts/player.js', () => ({ takeToken: () => null, weaponAim: () => ({}) }))
mock.module('../scripts/interact.js', () => ({ talk: () => {} }))
mock.module('../scripts/mat-cloth.js', () => ({ PRINTS: {} }))
const { openDialogue, onInput } = await import('../scripts/talk.js')
const { errandStep, errandDone, setQuest } = await import('../scripts/lib/quests.js')
const L13 = await import('../scripts/lib/level13-quest.js')
const L70 = await import('../scripts/lib/level70-quest.js')
const L31 = await import('../scripts/lib/level31-quest.js')

const SKILLED = Array(13).fill(60).join(',') // every check passes on a top roll
function scene(id, place, state = {}) {
  let now = 10000
  const npc = { id, tags: ['npc'], state: { name: id }, feetPosition: { x: 0, y: 0, z: 0 } }
  const self = { id: 'player', userId: 'player', place, state: { level: 1, ...state }, session: {}, feetPosition: { x: 0, y: 0, z: 1 } }
  const ctx = { self, place: { id: place, players: [self], objects: { [id]: npc }, state: {} }, now: () => now, random: () => 0.99, getObject: (key) => key === id ? npc : null, emit: () => {}, query: () => [] }
  const choose = (text) => { now += 1000; onInput(ctx, { pressed: { talk: true }, actionData: { talk: { id, text } } }) }
  openDialogue(ctx, npc)
  const find = (frag) => { for (let i = 0; i < 6; i++) { const c = self.state.talkChoices.find((x) => x.text.includes(frag)); if (c) return c; const more = self.state.talkChoices.find((x) => x.node === 'page'); if (!more) return null; choose(more.text) } return null }
  return { ctx, s: self.state, p: self, choose, find, reopen: () => { self.session.talkingTo = null; openDialogue(ctx, npc) } }
}

test('an errand sits in the journal apart from quests, untracked, and is archived as an errand', () => {
  const s = {}
  setQuest(s, 'q', { name: 'Quest', step: 'Go' })
  errandStep(s, 'l21-Wire for the Compressors', 'Wire for the Compressors', 'Bring wire', { place: 'level21', id: 'l21-board' })
  expect(s.quests['errand-l21-wire-for-the-compressors']).toMatchObject({ kind: 'errand', step: 'Bring wire' })
  expect(s.qtrack).toEqual(['q'])
  errandDone(s, 'l21-Wire for the Compressors', 'Wire for the Compressors', 'Done')
  expect(s.quests['errand-l21-wire-for-the-compressors']).toBeUndefined()
  expect(s.qdone['errand-l21-wire-for-the-compressors']).toMatchObject({ kind: 'errand', text: 'Done', outcome: 'completed' })
  errandDone(s, 'l7-sonar', 'Seawatch Sonar Sweep', 'Swept')
  expect(s.qdone['errand-l7-sonar']).toMatchObject({ name: 'Seawatch Sonar Sweep', kind: 'errand' })
})

test('Still Home: retuning Bea\'s set calms the Tenant, and Noor pays once for the quiet route', () => {
  const { ctx, s, p, choose, find, reopen } = scene('l13p-noor', 'level13', { skl: SKILLED })
  choose(find('more than packing').text); choose("I'll take the job.")
  expect(s.l13q).toBe(1)
  expect(L13.tuneTv(ctx, p, 'a3')).toBe(false) // another flat's set is just a television
  expect(L13.tuneTv(ctx, p, 'a8')).toBe(true)
  expect(s.l13q).toBe(2)
  expect(s.l13calm).toBeGreaterThan(ctx.now())
  expect(s.quests['l13-still-home'].step).toContain('swaying')
  L13.takeKeepsake(ctx, p, 'counter')
  expect(s.l13route).toBe('tv')
  reopen()
  choose(find("found Bea's locket").text)
  expect(s.l13q).toBe(99)
  const cents = s.cents
  expect(s.payout.xp).toBeGreaterThan(150)
  expect(find("really going tonight")).toBeTruthy()
  choose("Are you really going tonight?")
  expect(s.sub.t).toContain('weather')
  expect(L13.handleDialogueQuest13(ctx, p, { id: 'l13p-noor' }, "I found Bea's locket.")).toBeNull()
  expect(s.cents).toBe(cents)
})

test('Pelt Tax can be settled without a fight, and Ines has a line after', () => {
  const { s, choose, find } = scene('l70-npc-ines', 'level70', { skl: SKILLED })
  choose(find('need doing').text); choose("I'll take the job.")
  expect(s.l70pelt).toBe(1)
  expect(s.quests['l70-pelt-tax'].step).toContain('Survival 45')
  choose(find('[Survival 45]').text)
  expect(s.l70pelt).toBe(99)
  expect(s.qdone['l70-pelt-tax'].text).toContain('nobody had to shoot')
  choose(find('Quiet out there').text)
  expect(s.sub.t).toContain('Gut pile')
})

test("Froston's Ledger starts from Larsson's lead and keeps the found-it step number", () => {
  const { s, choose, find } = scene('l70-npc-larsson', 'level70')
  choose(find('Froston rig').text)
  expect(s.l70led ?? 0).toBe(0)
  choose("I'll take the job.")
  expect(s.l70led).toBe(1)
  expect(s.quests['l70-ledger'].step).toContain('footlocker')
  expect(s.quests['l70-ledger'].briefing).toContain('Froston')
})

test('Side B: Marlowe and the DJ each have something to say once it is over', () => {
  expect(L31.l31Choices('l31-q-marlowe', { l31q: 99, l31route: 'dub' }).some((c) => c.text === "How's business?")).toBe(true)
  expect(L31.l31Choices('l31-q-marlowe', { l31q: 99, l31route: 'rink' }).some((c) => c.text === "How's business?")).toBe(false)
  expect(L31.l31Choices('l31-dj', { l31q: 99, l31route: 'rink' }).some((c) => c.text === 'How does it sound now?')).toBe(true)
})
