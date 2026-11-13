import { test, expect, mock } from 'bun:test'
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
mock.module('../scripts/player.js', () => ({ takeToken: () => null, weaponAim: () => ({}) }))
mock.module('../scripts/interact.js', () => ({ talk: () => {} }))
mock.module('../scripts/mat-cloth.js', () => ({ PRINTS: {} }))
const { openDialogue, onInput } = await import('../scripts/talk.js')
const G = await import('../scripts/l5-goggles.js')

function scene(id, rnd = 0.99) {
  let now = 10000
  const npc = { id, tags: ['npc'], state: { name: id }, feetPosition: { x: 0, y: 0, z: 0 } }
  const self = { id: 'player', userId: 'player', place: 'level8', state: { level: 1, cents: 0 }, session: {}, feetPosition: { x: 0, y: 0, z: 1 } }
  const ctx = { self, place: { id: 'level8', players: [], objects: { [id]: npc }, state: {} }, now: () => now, random: () => rnd, getObject: (k) => k === id ? npc : null, emit: () => {}, query: () => [] }
  const choose = (text) => { now += 1000; onInput(ctx, { pressed: { talk: true }, actionData: { talk: { id, text } } }) }
  openDialogue(ctx, npc)
  const pick = (frag) => { const c = (self.state.talkChoices ?? []).find((c) => c.text.includes(frag)); if (!c) console.log("MISSING", frag, JSON.stringify(self.state.talkChoices.map(c=>c.text))); expect(c).toBeTruthy(); choose(c.text) }
  return { s: self.state, choose, pick, reopen: () => { now += 70000; openDialogue(ctx, npc) }, has: (frag) => (self.state.talkChoices ?? []).some((c) => c.text.includes(frag)) }
}

test('Carla: decline, accept, mend the whistle, paid once, after-lines', () => {
  const { s, pick, has } = scene('l8-carla-kid')
  pick('cheer you up'); expect(s.carlaQ ?? 0).toBe(0); pick('Not right now'); expect(s.carlaQ ?? 0).toBe(0)
  pick('cheer you up'); pick("I'll take the job"); expect(s.carlaQ).toBe(2)
  expect(s.quests['carla-s-melody'].briefing).toContain('Hyperspace Lane')
  pick('tin whistle'); expect(s.carlaQ).toBe(99); expect(s.payout.xp).toBe(90)
  expect(s.qdone['carla-s-melody']).toBeTruthy()
  s.payout = null; s.kazoo = true
  expect(has('brought the kazoo')).toBe(false); pick("How's the music"); expect(s.payout).toBeNull()
  expect(s.sub.t).toContain('whistle')
})
test('Carla: kazoo route', () => {
  const { s, pick, reopen } = scene('l8-carla-kid')
  pick('cheer you up'); pick("I'll take the job"); s.kazoo = true; reopen()
  pick('brought the kazoo'); expect(s.carlaQ).toBe(99); expect(s.kazoo).toBe(false)
})
test('Hobb: silk-and-pitch Repair route, and chitin route', () => {
  const a = scene('l8-hobb')
  a.pick('plate for the perimeter'); a.pick('Not right now'); expect(a.s.spiderQ ?? 0).toBe(0)
  a.pick('plate for the perimeter'); a.pick("I'll take the job"); expect(a.s.spiderQ).toBe(2)
  a.pick('build the plates'); expect(a.s.spiderQ).toBe(2); expect(a.s.sub.t).toContain('Six silk')
  a.s.scrap = { spider_silk: 7, pitch: 3 }; a.reopen(); a.pick('build the plates'); expect(a.s.spiderQ).toBe(99)
  expect(a.s.scrap.spider_silk).toBe(1); expect(a.s.cents).toBe(6000)
  a.pick('fence holding'); expect(a.s.cents).toBe(6000)
  const b = scene('l8-hobb'); b.pick('plate for the perimeter'); b.pick("I'll take the job"); b.s.scrap = { chitin: 3 }; b.reopen()
  b.pick('Brought 3 chitin'); expect(b.s.spiderQ).toBe(99); expect(b.s.scrap.chitin).toBe(0)
})
test('Ivo: failed Science leaves the crawl; crawl pays once', () => {
  const a = scene('l8-ivo', 0.0)
  a.pick('looping karst'); a.pick("I'll take the job"); expect(a.s.karstQ).toBe(2)
  a.pick('telemetry'); expect(a.s.karstSciFailed).toBe(true); expect(a.has('telemetry')).toBe(false)
  a.s.l8Loops = 1; a.reopen(); a.pick('Face Rock twice'); expect(a.s.karstQ).toBe(99); expect(a.s.payout.xp).toBe(110)
  a.pick("Dell's map"); expect(a.s.sub.t).toBeTruthy()
  const b = scene('l8-ivo'); b.s.tags = 'science'; b.s.skl = '0,0,0,0,0,0,0,0,30,0,0,0,0'; b.pick('looping karst'); b.pick("I'll take the job"); b.pick('telemetry'); expect(b.s.karstQ).toBe(99); expect(b.s.payout.xp).toBe(125)
})
test('Ines: pitch, walk away, accept, quiet den, bridged box, once', () => {
  let now = 1000; const at = { x: 0, y: 0, z: 0 }
  const p = { id: 'p', state: { battery: 60 }, feetPosition: at }
  const ctx = (kind) => ({ self: { state: { kind }, feetPosition: at, children: [] }, getObject: (k) => k === 'p' ? p : null, now: () => now, random: () => 0.99, emit: () => {}, after: (t, f, d) => G[f](ctx(kind), d) })
  const press = (kind) => { now += 1000; G.ears.press(ctx(kind), { by: 'p' }) }
  press('radio'); expect(p.state.nvgQ ?? 0).toBe(0); expect(p.state.notice.text).toContain('Press the radio again')
  now += 60000; press('radio'); expect(p.state.nvgQ ?? 0).toBe(0) // walked away: asked again
  press('radio'); expect(p.state.nvgQ).toBe(1); expect(p.state.quests['ines-s-goggles'].briefing).toContain('Cold Room')
  press('case'); expect(p.state.nvgQ).toBe(2); expect(p.state.nvgTracks).toBe(true)
  p.state.crouch = true; press('den'); expect(p.state.nvgQ).toBe(3); expect(p.state.nvgQuiet).toBe(true); expect(p.state.loud).toBeUndefined()
  press('drop'); expect(p.state.nvgQ).toBe(4); expect(p.state.nvg).toBe(true); expect(p.state.cents).toBe(2500); expect(p.state.payout.xp).toBe(75)
  press('drop'); press('radio'); expect(p.state.cents).toBe(2500); expect(p.state.notice.text).toContain('Ines (radio)')
  expect(p.state.qdone['ines-s-goggles'].text).toContain('Boiler Room'); expect(p.state.battery).toBe(35)
})
