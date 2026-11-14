import { test, expect, mock } from 'bun:test'

mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/nav', () => ({ findPath: () => null }))
mock.module('builtin/tsl', () => ({}))
mock.module('builtin/three', () => ({}))
mock.module('../scripts/mat-cloth.js', () => ({ PRINTS: {} }))

const os = await import('../scripts/os.js')
const lockpick = await import('../scripts/lockpick.js')
const diner = await import('../scripts/l61-diner.js')
const l11use = await import('../scripts/level11-use.js')
const l21use = await import('../scripts/l21-use.js')
const l8use = await import('../scripts/l8-use.js')
const l7use = await import('../scripts/l7-use.js')
const l61use = await import('../scripts/l61-use.js')
const l61staff = await import('../scripts/l61-staff.js')
const player = await import('../scripts/player.js')
const interact = await import('../scripts/interact.js')
const talk = await import('../scripts/talk.js')
const { EXIT, HALF, cellCenter } = await import('../scripts/lib/maze.js')

const baseState = (extra = {}) => ({
  level: 1,
  xp: 0,
  hp: 80,
  maxHp: 100,
  sanity: 80,
  hunger: 50,
  thirst: 50,
  attr: '5,5,5,5,5,5,5',
  skl: Array(13).fill(60).join(','),
  weapons: '',
  cents: 10000,
  escapes: 0,
  ...extra,
})

function makePlayerCtx(state, objects = {}, extra = {}) {
  let now = 100000
  const events = []
  const self = {
    id: 'p1',
    userId: 'u1',
    place: extra.place ?? 'main',
    tags: [],
    state,
    session: {},
    feetPosition: extra.pos ?? { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: { yaw: 0 },
    anim: {},
  }
  const ctx = {
    self,
    session: {},
    place: { id: self.place, players: [self], objects, state: {}, gravity: { y: -20 } },
    now: () => now,
    advance: (ms) => { now += ms },
    random: () => 0.1,
    getObject: (id) => objects[id] ?? null,
    emit: (...args) => events.push(args),
    log: () => {},
    after: () => null,
    cancel: () => {},
    query: () => [],
    destroy: (id) => { delete objects[id] },
    spawn: (spec) => {
      const id = 'spawn-' + Object.keys(objects).length
      const obj = { id, ...spec, state: spec.state ?? {} }
      objects[id] = obj
      return id
    },
    cross: () => {},
    events,
  }
  return ctx
}

test('OS terminal unlock only awards +30 XP once per host even after alarm re-lock', () => {
  const term = { id: 'term1', feetPosition: { x: 0, y: 0, z: 0 }, state: { host: 'SEDCO-SEC-01', lock: 'science:10' } }
  const s = baseState({ os: { id: 'term1', host: 'SEDCO-SEC-01', lock: 'science:10', user: 'guest', app: 'login', at: 1000, term: [] } })
  const ctx = makePlayerCtx(s, { term1: term })

  // Unlock via hacking minigame, trip alarm, then unlock a second time
  os.onInput(ctx, { pressed: { os: true }, actionData: { os: { k: 'hack' } } })
  os.onInput(ctx, { pressed: { os: true }, actionData: { os: { k: 'hack_guess', v: s.os.hack.targetWord } } })
  expect(s.xp).toBeGreaterThan(0)
  const xpAfterFirst = s.xp

  // Trigger alarm to re-lock terminal, then hack/unlock it again
  os.onInput(ctx, { pressed: { os: true }, actionData: { os: { k: 'ctrl', v: 'alarm' } } })
  s.os = { id: 'term1', host: 'SEDCO-SEC-01', lock: 'science:10', user: 'guest', app: 'login', at: 2000, term: [] }
  os.onInput(ctx, { pressed: { os: true }, actionData: { os: { k: 'hack' } } })
  os.onInput(ctx, { pressed: { os: true }, actionData: { os: { k: 'hack_guess', v: s.os.hack.targetWord } } })
  expect(s.xp).toBe(xpAfterFirst)
})

test('Boiler door lockpicking awards XP only once per save and unlocked locks cannot re-pay', () => {
  const door = { id: 'l5-boilerdoor-ball/panel', feetPosition: { x: 0, y: 0, z: 0 }, state: { kind: 'boilerdoor', open: false } }
  const s = baseState()
  const ctx = makePlayerCtx(s, { [door.id]: door })

  s.pick = { id: door.id, lv: 25, kind: 'boiler', sweet: 90, w: 10, at: 1000 }
  lockpick.onInput(ctx, { actionData: { pick: { k: 'success' } } })
  const xpAfterFirst = s.xp
  expect(xpAfterFirst).toBeGreaterThan(0)
  expect(s.l5boilerPick).toBeTruthy()

  // Simulate door closing 4s later and picking it again
  door.state.open = false
  s.pick = { id: door.id, lv: 25, kind: 'boiler', sweet: 90, w: 10, at: 5000 }
  lockpick.onInput(ctx, { actionData: { pick: { k: 'success' } } })
  expect(s.xp).toBe(xpAfterFirst)

  // Already-unlocked crate refuses duplicate success action
  const crate = { id: 'crate1', feetPosition: { x: 0, y: 0, z: 0 }, state: { lock: 'lockpick:20', items: '' } }
  ctx.place.objects.crate1 = crate
  s.pick = { id: 'crate1', lv: 20, kind: 'crate', sweet: 90, w: 10, at: 6000 }
  lockpick.onInput(ctx, { actionData: { pick: { k: 'success' } } })
  const xpAfterCrate = s.xp
  expect(xpAfterCrate).toBeGreaterThan(xpAfterFirst)
  s.pick = { id: 'crate1', lv: 20, kind: 'crate', sweet: 90, w: 10, at: 7000 }
  lockpick.onInput(ctx, { actionData: { pick: { k: 'success' } } })
  expect(s.xp).toBe(xpAfterCrate)
})

test('Free repeatable vending machines, market crates, stills, and dredges grant 0 XP', () => {
  const w = baseState()
  const playerObj = { id: 'p1', userId: 'u1', state: w, feetPosition: { x: 0, y: 0, z: 0 }, anim: {} }
  let now = 100000
  const objs = {}
  const makeUseCtx = (kind) => {
    const obj = (objs[kind] ??= { id: 'obj-' + kind, state: { kind }, session: {}, anim: {}, feetPosition: { x: 0, y: 0, z: 0 }, children: [] })
    return {
      self: obj,
      getObject: (id) => (id === 'p1' ? playerObj : null),
      now: () => now,
      random: () => 0.1,
      emit: () => {},
      after: () => {},
    }
  }

  // l61-diner vending machines: 0 XP + cooldown
  w.payout = null
  diner.ears.press(makeUseCtx('vending-almond'), { by: 'p1' })
  expect(w.payout).toEqual({ xp: 0, items: ['almond'] })
  w.payout = null
  diner.ears.press(makeUseCtx('vending-almond'), { by: 'p1' }) // immediate spam blocked by cooldown
  expect(w.payout).toBeNull()

  diner.ears.press(makeUseCtx('vending-snack'), { by: 'p1' })
  expect(w.payout).toEqual({ xp: 0, items: ['bar', 'chips'] })

  // level11-use market-produce: 0 XP + cooldown
  w.payout = null
  l11use.ears.press(makeUseCtx('market-produce'), { by: 'p1' })
  expect(w.payout).toBeNull()

  // l21-use saltines, berries, blaster: 0 XP
  l21use.ears.press(makeUseCtx('saltines'), { by: 'p1' })
  expect(w.payout?.xp).toBe(0)
  w.payout = null
  l21use.ears.press(makeUseCtx('berries'), { by: 'p1' })
  expect(w.payout?.xp).toBe(0)
  w.payout = null
  l21use.ears.press(makeUseCtx('blaster'), { by: 'p1' })
  expect(w.payout?.xp).toBe(0)

  // l8-use dredge & l7-use still: 0 XP
  w.payout = null
  l8use.ears.press(makeUseCtx('dredge'), { by: 'p1' })
  expect(w.payout?.xp).toBe(0)
  w.payout = null
  l7use.ears.press(makeUseCtx('still'), { by: 'p1' })
  expect(w.payout?.xp).toBe(0)

  // l61-use vend / return / staff: no repeatable XP
  w.payout = null
  l61staff.ears.press(makeUseCtx('fc'), { by: 'p1' })
  expect(w.payout?.xp).toBe(0)

  w.payout = null; w.l61Tray = 1
  l61use.ears.press(makeUseCtx('return'), { by: 'p1' })
  expect(w.payout?.xp).toBe(3) // first tray return pays once
  w.payout = null; w.l61Tray = 1
  l61use.ears.press(makeUseCtx('return'), { by: 'p1' })
  expect(w.payout?.xp).toBe(0) // second tray return grants 0 XP
})

test('Errand boards do not auto-complete one-time scout quests on lap 1+', () => {
  const w21 = baseState({ l21q: 9, l21Scouted: 1 }) // lap 1, qi 4 ("Scout The Edges")
  const p21 = { id: 'p1', userId: 'u1', state: w21, feetPosition: { x: 0, y: 0, z: 0 } }
  l21use.ears.press({
    self: { id: 'b21', state: { kind: 'board' }, feetPosition: { x: 0, y: 0, z: 0 } },
    getObject: () => p21,
    now: () => 1000,
    random: () => 0.5,
    emit: () => {},
  }, { by: 'p1' })
  expect(w21.l21q).toBe(10)
  expect(w21.payout).toBeUndefined()

  const w8 = baseState({ l8q: 11, l8Exits: 1 }) // lap 1, qi 5 ("The Road's End")
  const p8 = { id: 'p1', userId: 'u1', state: w8, feetPosition: { x: 0, y: 0, z: 0 } }
  l8use.ears.press({
    self: { id: 'b8', state: { kind: 'board' }, feetPosition: { x: 0, y: 0, z: 0 } },
    getObject: () => p8,
    now: () => 1000,
    random: () => 0.5,
    emit: () => {},
  }, { by: 'p1' })
  expect(w8.l8q).toBe(12)
  expect(w8.payout).toBeUndefined()
})

test('Storage/drop/shop item transfers and repeat Level 0 exits grant 0 XP', () => {
  const s = baseState({ almonds: 2, weapons: 'pipe', equipped: 'pipe' })
  const storage = { id: 'box1', tags: ['container', 'storage'], feetPosition: { x: 0, y: 0, z: 0 }, state: { name: 'Fridge', items: '', cap: 30 } }
  const ctx = makePlayerCtx(s, { box1: storage })

  // Store an almond water into home storage, then take it back out
  s.lootOpen = 'box1'
  interact.onInput(ctx, { pressed: { loot: true }, actionData: { loot: { k: 'store', t: 'almond:grey' } } })
  expect(storage.state.items).toBe('almond:grey')
  interact.onInput(ctx, { pressed: { loot: true }, actionData: { loot: { k: 'take', i: 0 } } })
  expect(s.xp).toBe(0)
  expect(s.almonds).toBe(2)

  // Buying items from a trader gives 0 XP
  const trader = { id: 'trader1', tags: ['npc'], feetPosition: { x: 0, y: 0, z: 0 }, state: { name: 'Kade', role: 'trader', faction: 'bntg', stock: { almond: [5, 10] }, stockAt: 100000 } }
  ctx.place.objects.trader1 = trader
  s.shopOpen = 'trader1'
  talk.onInput(ctx, { pressed: { shop: true }, actionData: { shop: { k: 'buy', t: 'almond' } } })
  expect(s.xp).toBe(0)
  expect(s.almonds).toBe(3)

  // Explicitly testing { xp: false } across bread, weapon
  expect(player.takeToken(ctx, 'bread', { xp: false }).ok).toBe(true)
  expect(player.takeToken(ctx, 'weapon:pistol', { xp: false }).ok).toBe(true)
  expect(s.xp).toBe(0)

  // Normal world pickup still awards XP
  expect(player.takeToken(ctx, 'almond:grey').ok).toBe(true)
  expect(s.xp).toBeGreaterThan(0)

  // Level 0 exit awards exit XP once (escapes === 1), 0 on repeat exit
  const ex = cellCenter(EXIT.cx, EXIT.cz)
  const exitState = baseState()
  const exitCtx = makePlayerCtx(exitState, {}, { place: 'main', pos: { x: -HALF + 0.5, y: 0, z: ex.z } })
  player.update(exitCtx, 0.3)
  expect(exitState.escapes).toBe(1)
  const xpAfterExit1 = exitState.xp
  expect(xpAfterExit1).toBeGreaterThan(0)
  player.update(exitCtx, 0.3)
  expect(exitState.escapes).toBe(2)
  expect(exitState.xp).toBe(xpAfterExit1)
})
test('Level 109 BackOS controls respect skills and release only the terminal room', () => {
  const term = { id: 'term109', feetPosition: { x: 0, y: 0, z: 0 }, state: { kind: 'terminal', mode: 'supply', roomId: 'room-a', host: 'L109-STOCK-room-a', lock: 'science:25' } }
  const here = { id: 'l109o-room-a-crate', tags: ['container'], state: { lock: 'lockpick:50' } }
  const elsewhere = { id: 'l109o-room-b-crate', tags: ['container'], state: { lock: 'lockpick:50' } }
  const s = baseState({ attr: '1,1,1,1,1,1,1', skl: Array(13).fill(0).join(','), os: { id: term.id, host: term.state.host, user: 'guest', app: 'ctrl' } })
  const ctx = makePlayerCtx(s, { [term.id]: term }, { place: 'level109' }); ctx.query = () => [here, elsewhere]
  const action = { pressed: { os: true }, actionData: { os: { k: 'ctrl', v: 'release' } } }
  os.onInput(ctx, action); expect(here.state.lock).toBe('lockpick:50')
  s.skl = Array(13).fill(60).join(','); os.onInput(ctx, action)
  expect(here.state.lock).toBe(''); expect(elsewhere.state.lock).toBe('lockpick:50')
  expect(ctx.place.state.l109StockUnlocked['room-a']).toBe(true)
})
