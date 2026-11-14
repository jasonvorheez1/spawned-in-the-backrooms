import { describe, test, expect, mock } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

mock.module('builtin/physics', () => ({
  raycast: () => null,
  getInputRay: () => null,
  overlapPoint: () => [],
  traverseCheck: () => true,
}))
mock.module('builtin/tween', () => ({
  animate: () => ({ stop: () => {} }),
}))
const tslStub = () => ({ mul: tslStub, add: tslStub, sub: tslStub, div: tslStub, x: 0, y: 0, z: 0 })
mock.module('builtin/tsl', () => ({
  materialColor: {}, positionGeometry: tslStub(), positionWorld: tslStub(), normalWorld: {}, cameraPosition: {},
  normalize: tslStub, dot: tslStub, pow: tslStub, saturate: tslStub, vec2: tslStub, vec3: tslStub, float: tslStub,
  abs: tslStub, fract: tslStub, floor: tslStub, sin: tslStub, mix: tslStub, smoothstep: tslStub, step: tslStub,
  max: tslStub, min: tslStub, clamp: tslStub, sqrt: tslStub,
  mx_noise_float: tslStub, mx_fractal_noise_float: tslStub, mx_worley_noise_float: tslStub,
}))
mock.module('builtin/nav', () => ({ findPath: () => [] }))
mock.module('builtin/three', () => ({
  MeshStandardNodeMaterial: class {},
}))

const BM = (await import('../scripts/lib/data/books-magazines.yml')).default
const SNACKS = (await import('../scripts/lib/data/snacks.yml')).default
const CL = (await import('../scripts/lib/data/clothes.yml')).default
const SHOPS = (await import('../scripts/lib/data/shops.yml')).default
const L109_ROOMS = (await import('../scripts/lib/data/l109-rooms.yml')).default

const {
  ATTR_KEYS,
  SKILL_NAMES,
  BOOK_DEFAULT_BONUS,
  BOOK_GENERIC_CAP,
  MAG_DEFAULT_BONUS,
  MAG_DEFAULT_GAME_MIN,
  gameMinToMs,
  formatGameMinutes,
  getBookSpec,
  getMagSpec,
  isBookToken,
  isMagToken,
  applyEffect,
  pruneEffects,
  clearEffects,
  readSkillBook,
  collectModifiers,
  formatModsList,
} = await import('../scripts/lib/modifiers.js')

const {
  ATTRS,
  SKILLS,
  baseAttrsOf,
  attrsOf,
  permanentSkillsOf,
  skillsOf,
  derived,
  tokenWeight,
  inventoryWeight,
} = await import('../scripts/lib/stats.js')

const { spend } = await import('../scripts/stats.js')
const { onInput: restOnInput } = await import('../scripts/rest.js')
const { takeToken, readBookAction, readMagAction, useSnack, pullToken, onInput: playerOnInput } = await import('../scripts/player.js')
const { onInput: interactOnInput, openLoot } = await import('../scripts/interact.js')
const { SAVE_V, migrate } = await import('../scripts/lib/save.js')
const L2C = (await import('../scripts/lib/data/level2.yml')).default
const { clothToken, rowData } = await import('../scripts/lib/clothes.js')
const { describe: describeItem } = await import('../scripts/lib/items.js')
const {
  POOL,
  PLACE_CATEGORY,
  LOOT_CATEGORIES,
  magOf,
  rollCategoryItem,
  rollItem,
  rollItemL1,
  rollItemL2,
  rollTableL2,
  rollItemL5,
} = await import('../scripts/lib/loot.js')
const { rollItemL3 } = await import('../scripts/lib/loot3.js')
const { sectionOf, sellables, removeOne } = await import('../scripts/lib/npc-talk.js')
const { quickItems } = await import('../scripts/lib/quick-items.js')
const { statsUi } = await import('../scripts/stats-ui.js')
const { lootUi } = await import('../scripts/loot-ui.js')

const ROOT = new URL('..', import.meta.url)

function makeState(extra = {}) {
  return {
    level: 1,
    xp: 0,
    hp: 80,
    hpMax: 100,
    maxHp: 100,
    sanity: 80,
    hunger: 70,
    thirst: 70,
    chill: 40,
    attr: '5,5,5,5,5,5,5',
    skl: Array(13).fill(0).join(','),
    tags: '',
    apts: 2,
    spts: 10,
    tagsLeft: 0,
    books: {},
    mags: {},
    snacks: {},
    readBooks: {},
    genericBooksRead: {},
    bookBonuses: {},
    effects: [],
    scrap: {},
    keyItems: [],
    clothes: '',
    wear: { sex: 'm', hair: 'short', hairCol: '2c221b', skin: 'd4a886', topw: 'tee', topCol: '808080', botw: 'jeans', botCol: '3b4d63', shoes: 'sneakers', shoeCol: '333333', hat: 'none', eyew: 'none', neck: 'none' },
    ...extra,
  }
}

function makeCtx(s, nowMs = 100000, objects = {}, placeState = {}) {
  let t = nowMs
  const world = { state: { clockSkip: 0 }, places: { level1: {} } }
  const place = { id: 'level1', state: placeState, objects }
  const emitted = []
  const self = {
    id: 'player-1',
    place: 'level1',
    state: s,
    session: {},
    feetPosition: { x: 0, y: 0, z: 0 },
  }
  return {
    self,
    world,
    place,
    emitted,
    now: () => t,
    setNow: (v) => { t = v },
    random: () => 0.5,
    emit: (name, payload) => emitted.push({ name, payload }),
    getObject: (id) => objects[id] ?? null,
    query: () => [],
    destroy: (id) => { delete objects[id] },
    log: () => {},
  }
}

describe('Part I: Skill Books & Skill Magazines Data + Core Registry', () => {
  test('every one of the 13 HALOGEN skills has a Skill Book and Skill Magazine', () => {
    const skillKeys = SKILLS.map((sk) => sk.k)
    expect(skillKeys.length).toBe(13)
    for (const k of skillKeys) {
      expect(SKILL_NAMES[k]).toBeTruthy()
      const book = getBookSpec(`book:${k}`)
      expect(book).toBeTruthy()
      expect(book.skill).toBe(k)
      expect(book.bonus).toBe(BOOK_DEFAULT_BONUS)
      expect(book.value).toBeGreaterThan(50)
      expect(book.kg).toBe(0.3)

      const mag = getMagSpec(`mag:${k}`)
      expect(mag).toBeTruthy()
      expect(mag.skill).toBe(k)
      expect(mag.bonus).toBe(MAG_DEFAULT_BONUS)
      expect(mag.durationMin).toBe(MAG_DEFAULT_GAME_MIN)
      expect(mag.durationMs).toBe(gameMinToMs(120))
      expect(mag.durationMs).toBe(50000)
      expect(mag.kg).toBe(0.1)
    }
  })

  test('20 unique Skill Books are defined, valid, and each is hand-placed in the world', () => {
    const uniqueIds = Object.keys(BM.uniqueBooks ?? {})
    expect(uniqueIds.length).toBe(20)

    const validSkills = new Set(SKILLS.map((s) => s.k))
    const searchFiles = []
    for (const dir of readdirSync(join(ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'places'))) {
      const simPath = join(ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'places', dir, 'sim.js')
      try { searchFiles.push(readFileSync(simPath, 'utf8')) } catch {}
    }
    for (const f of ['l109-rooms.js', 'level70-quest.js']) {
      searchFiles.push(readFileSync(new URL(`../scripts/lib/${f}`, import.meta.url), 'utf8'))
    }
    const haystack = searchFiles.join('\n')

    for (const id of uniqueIds) {
      const spec = getBookSpec(`ubook:${id}`)
      expect(spec).toBeTruthy()
      expect(spec.kind).toBe('unique')
      expect(validSkills.has(spec.skill)).toBe(true)
      expect(spec.bonus).toBe(3)
      expect(haystack).toContain(`ubook:${id}`)
    }

    // Also verify every ubook:<id> referenced anywhere in places/ or scripts/ resolves to BM.uniqueBooks
    for (const m of haystack.matchAll(/ubook:([a-z0-9_]+)/g)) {
      expect(BM.uniqueBooks[m[1]]).toBeTruthy()
    }
  })
})

describe('Part I & II: Reading Books, Magazines, Stacking, Caps & Non-Respawn', () => {
  test('unique Skill Book grants +3 permanent skill once and refuses duplicate reading', () => {
    const s = makeState({ spts: 0 })
    const ctx = makeCtx(s, 10000)
    expect(takeToken(ctx, 'ubook:l1_warehouse_repair').ok).toBe(true)
    expect(takeToken(ctx, 'ubook:l1_warehouse_repair').ok).toBe(true)
    expect(s.books['ubook:l1_warehouse_repair']).toBe(2)

    const first = readBookAction(ctx, 'ubook:l1_warehouse_repair')
    expect(first.ok).toBe(true)
    expect(first.gained).toBe(3)
    expect(permanentSkillsOf(s).repair).toBe(skillsOf(makeState()).repair + 3)
    expect(s.readBooks['l1_warehouse_repair']).toBeTruthy()
    expect(s.books['ubook:l1_warehouse_repair']).toBe(1)
    expect(s.notice.text).toContain('permanently increased by 3')

    const second = readBookAction(ctx, 'ubook:l1_warehouse_repair')
    expect(second.ok).toBe(false)
    expect(s.books['ubook:l1_warehouse_repair']).toBe(1)
  })

  test('generic Skill Book caps at BOOK_GENERIC_CAP per skill and respects 100 skill ceiling', () => {
    const s = makeState({ books: { 'book:medicine': 3 } })
    const ctx = makeCtx(s)
    const baseMed = permanentSkillsOf(s).medicine
    expect(readBookAction(ctx, 'book:medicine').ok).toBe(true)
    expect(readBookAction(ctx, 'book:medicine').ok).toBe(true)
    expect(s.genericBooksRead.medicine).toBe(BOOK_GENERIC_CAP)
    expect(permanentSkillsOf(s).medicine).toBe(baseMed + 6)

    const third = readBookAction(ctx, 'book:medicine')
    expect(third.ok).toBe(false)

    // Near cap 100: only remaining points up to 100 are added cleanly (lockpick is index 4, starts at 15)
    const sCap = makeState({ skl: Array(13).fill(0).map((_, i) => i === 4 ? 84 : 0).join(',') })
    expect(permanentSkillsOf(sCap).lockpick).toBe(99)
    const res = readSkillBook(sCap, 'book:lockpick', 99, 0)
    expect(res.ok).toBe(true)
    expect(res.gained).toBe(1)
    expect(permanentSkillsOf(sCap).lockpick).toBe(100)
  })

  test('Skill Magazine gives +10 for 120 in-game minutes, refreshes rather than stacking same skill, and expires via clock and rest', () => {
    const s = makeState({ mags: { 'mag:lockpick': 2, 'mag:science': 1 } })
    const ctx = makeCtx(s, 100000)
    const baseLock = skillsOf(s, 100000).lockpick
    const baseSci = skillsOf(s, 100000).science

    expect(readMagAction(ctx, 'mag:lockpick').ok).toBe(true)
    expect(skillsOf(s, 100000).lockpick).toBe(baseLock + 10)

    // Advance 60 in-game minutes (1 hour = 25000 ms), read second Locksmith Monthly -> refreshes duration, does NOT become +20
    ctx.setNow(125000)
    expect(readMagAction(ctx, 'mag:lockpick').ok).toBe(true)
    expect(skillsOf(s, 125000).lockpick).toBe(baseLock + 10)

    // Different skill magazine stacks cleanly alongside lockpick
    expect(readMagAction(ctx, 'mag:science').ok).toBe(true)
    expect(skillsOf(s, 125000).science).toBe(baseSci + 10)
    expect(skillsOf(s, 125000).lockpick).toBe(baseLock + 10)

    // Resting 2 hours (2 * 25000 = 50000 ms) expires both 120m magazines
    restOnInput(ctx, { pressed: { waitdo: true }, actionData: { waitdo: { h: 2 } } })
    expect(s.effects.length).toBe(0)
    expect(skillsOf(s, s._clockNow).lockpick).toBe(baseLock)
    expect(skillsOf(s, s._clockNow).science).toBe(baseSci)
  })

  test('looting a Skill Book from a container excludes it from refill c.state.full while keeping other items', () => {
    const s = makeState({ lootOpen: 'crate-1' })
    const crate = {
      id: 'crate-1',
      tags: ['container'],
      feetPosition: { x: 0, y: 0, z: 0 },
      state: { name: 'Toolbox', items: 'ubook:l1_warehouse_repair,ammo,almond:grey' },
    }
    const ctx = makeCtx(s, 5000, { 'crate-1': crate })
    interactOnInput(ctx, { pressed: { loot: true }, actionData: { loot: { k: 'take', i: 0 } } })
    expect(s.books['ubook:l1_warehouse_repair']).toBe(1)
    expect(crate.state.full).toBe('ammo,almond:grey')
    expect(crate.state.items).toBe('ammo,almond:grey')
  })

  test('spend() raises base stats and skills even when temporary buffs are active', () => {
    const s = makeState({ apts: 1, spts: 2 })
    const ctx = makeCtx(s, 1000)
    applyEffect(ctx, s, { sourceItemId: 'stim_shot', name: 'Stim Shot', mods: { a: 2, lockpick: 15 }, durationGameMin: 60, stackingGroup: 'stim', nowMs: 1000 })
    expect(baseAttrsOf(s).a).toBe(5)
    expect(attrsOf(s, 1000).a).toBe(7)

    spend(s, { k: 'attr', i: 1 }) // Agility
    expect(baseAttrsOf(s).a).toBe(6)
    expect(attrsOf(s, 1000).a).toBe(8)

    const beforeLock = permanentSkillsOf(s).lockpick
    spend(s, { k: 'skill', i: SKILLS.findIndex((sk) => sk.k === 'lockpick') })
    expect(permanentSkillsOf(s).lockpick).toBe(beforeLock + 1)
    expect(skillsOf(s, 1000).lockpick).toBe(beforeLock + 16)
  })
})

describe('Part III & IV: Consumables, Gear Passives & Survival Integration', () => {
  test('medical aid items and foods/drinks apply distinct buffs, cures, and debuffs', () => {
    const s = makeState({
      hp: 40,
      thirst: 40,
      hunger: 40,
      chill: 50,
      snacks: {
        painkillers: 1,
        antiseptic: 1,
        splint: 1,
        medkit: 1,
        stim_shot: 1,
        charcoal: 1,
        stale_ration: 1,
        cloudy_almond: 1,
        warm_tea: 1,
      },
    })
    const ctx = makeCtx(s, 50000)
    useSnack(ctx, 'stale_ration')
    expect(s.hunger).toBeGreaterThan(40)
    expect(attrsOf(s, 50000).e).toBe(4) // Endurance -1 debuff

    useSnack(ctx, 'cloudy_almond')
    expect(s.thirst).toBeGreaterThan(40)
    expect(attrsOf(s, 50000).n).toBe(4) // Nous -1 debuff (and replaces stale_ration in sickness_gut group)

    // Charcoal clears negative debuffs while leaving positive buffs intact
    useSnack(ctx, 'painkillers')
    expect(attrsOf(s, 50000).e).toBeGreaterThan(5) // Painkillers boosts Endurance +1, DR +4
    useSnack(ctx, 'charcoal')
    expect(attrsOf(s, 50000).n).toBe(5)
    expect(attrsOf(s, 50000).e).toBeGreaterThan(5)

    // Antiseptic stops bleeding
    useSnack(ctx, 'antiseptic')
    expect(s.bleedStopAt).toBe(50000)

    // Warm tea lowers Level 70 chill and increases Cold Resist
    const baseCold = derived(s, 50000).coldResist
    useSnack(ctx, 'warm_tea')
    expect(s.chill).toBeLessThan(50)
    expect(derived(s, 50000).coldResist).toBeGreaterThan(baseCold)

    // Stim shot buffs Agility and restores stamina
    useSnack(ctx, 'stim_shot')
    expect(attrsOf(s, 50000).a).toBeGreaterThan(5)
  })

  test('apparel passive modifiers apply when worn and increase carry/skills/resistances', () => {
    const jacketToken = clothToken('topw', 'padjacket', '5a4a3a')
    const bootsToken = clothToken('shoes', 'steeltoe', '3a3a30')
    expect(rowData('topw', 'padjacket', '5a4a3a')?.mods?.coldResist).toBeGreaterThan(0)
    expect(rowData('shoes', 'steeltoe', '3a3a30')?.mods).toBeTruthy()

    const s = makeState({
      look: {
        sex: 'm', hair: 'short', hairc: '2c221b', skin: 'd4a886',
        topw: 'padjacket', top: '5a4a3a',
        botw: 'cargo', bottom: '6a6a4a',
        shoes: 'steeltoe', shoec: '3a3a30',
        hat: 'padbeanie', hatc: '4a5a3a',
        eyew: 'asyncvisor',
        neck: 'carpetponcho', neckc: 'b39a4e',
      },
    })
    const mods = collectModifiers(s, 0)
    expect(mods.derived.coldResist).toBeGreaterThanOrEqual(70)
    expect(derived(s, 0).coldResist).toBe(mods.derived.coldResist)
    expect(mods.gearSkills.science).toBeGreaterThan(0)
    expect(skillsOf(s, 0).science).toBeGreaterThan(skillsOf(makeState(), 0).science)
    expect(mods.derived.carryMax).toBeGreaterThan(0)
    expect(jacketToken.startsWith('cloth:')).toBe(true)
    expect(bootsToken.startsWith('cloth:')).toBe(true)
  })

  test('bleedStopAt and coldResist integration are wired in combat and Level 70 scripts', () => {
    for (const file of ['stealers.js', 'deathmoths.js']) {
      const src = readFileSync(new URL(`../scripts/${file}`, import.meta.url), 'utf8')
      expect(src).toContain('bleedStopAt')
    }
    const l70Src = readFileSync(new URL('../scripts/lib/level70-quest.js', import.meta.url), 'utf8')
    expect(l70Src).toContain('coldResist')
  })
})

describe('Part V: Contextual Loot, Shops, Save v3, Pull/Drop & UI Integration', () => {
  test('random loot generators never drop permanent Skill Books and every rolled token is valid', () => {
    let i = 0
    const fakeCtx = { random: () => ((i++ * 7 + 3) % 97) / 97 }
    for (let n = 0; n < 400; n++) {
      for (const fn of [() => rollItem(fakeCtx), () => rollItemL1(fakeCtx), () => rollItemL2(fakeCtx), () => rollItemL5(fakeCtx), () => rollItemL3(fakeCtx)]) {
        const tok = fn()
        if (!tok) continue
        expect(isBookToken(tok)).toBe(false)
        expect(describeItem(tok).name).not.toBe('Unknown')
      }
      for (const cat of Object.keys(LOOT_CATEGORIES)) {
        const tok = rollCategoryItem(fakeCtx, cat)
        expect(isBookToken(tok)).toBe(false)
        expect(describeItem(tok).name).not.toBe('Unknown')
      }
    }
    for (const [k, pool] of Object.entries(POOL)) {
      expect(pool.length).toBeGreaterThan(0)
      expect(PLACE_CATEGORY[k]).toBeTruthy()
      expect(magOf(fakeCtx, pool)).toMatch(/^mag:/)
    }
    for (const tbl of Object.keys(L2C.tables ?? {})) {
      const tok = rollTableL2(fakeCtx, tbl)
      expect(isBookToken(tok)).toBe(false)
      expect(describeItem(tok).name).not.toBe('Unknown')
    }
  })

  test('shops.yml and l109-rooms.yml items resolve cleanly and classify into vendor sections', () => {
    for (const [vendor, items] of Object.entries(SHOPS.shops ?? {})) {
      for (const [tok] of items) {
        expect(describeItem(tok).name).not.toBe('Unknown')
        expect(sectionOf(tok)).toBeTruthy()
      }
    }
    expect(sectionOf('medkit')).toBe('aid')
    expect(sectionOf('painkillers')).toBe('aid')
    expect(sectionOf('splint')).toBe('aid')
    expect(sectionOf('warm_tea')).toBe('food')
    expect(sectionOf('mag:medicine')).toBe('gear')
    for (const list of Object.values(L109_ROOMS.loot ?? {})) {
      for (const tok of String(list).split(',').filter(Boolean)) {
        expect(isBookToken(tok)).toBe(false)
        expect(describeItem(tok).name).not.toBe('Unknown')
      }
    }

    const s = makeState({ books: { 'book:guns': 1 }, mags: { 'mag:lockpick': 2 }, snacks: { medkit: 1 } })
    const rows = sellables(s)
    expect(rows.some((r) => r[0] === 'book:guns')).toBe(true)
    expect(rows.some((r) => r[0] === 'mag:lockpick')).toBe(true)
    expect(rows.some((r) => r[0] === 'medkit')).toBe(true)
    expect(removeOne(s, 'mag:lockpick')).toBe(true)
    expect(s.mags['mag:lockpick']).toBe(1)
    expect(removeOne(s, 'book:guns')).toBe(true)
    expect(s.books['book:guns']).toBeUndefined()
  })

  test('save migration preserves existing stats while initializing SAVE_V = 3 containers', () => {
    expect(SAVE_V).toBe(3)
    const oldSave = { saveV: 2, level: 4, xp: 520, attr: '6,5,5,5,5,6,5', snacks: { bandage: 3 }, savePlace: 'level1' }
    const from = migrate({ world: { places: { level1: {} } } }, oldSave)
    expect(from).toBe(2)
    expect(oldSave.saveV).toBe(3)
    expect(oldSave.level).toBe(4)
    expect(oldSave.snacks.bandage).toBe(3)
    expect(oldSave.books).toEqual({})
    expect(oldSave.mags).toEqual({})
    expect(oldSave.readBooks).toEqual({})
    expect(oldSave.genericBooksRead).toEqual({})
    expect(oldSave.bookBonuses).toEqual({})
    expect(oldSave.effects).toEqual([])
  })

  test('pullToken, inv action, weights, quickItems, statsUi, and lootUi support books, magazines, and modifiers', () => {
    const jacketToken = clothToken('topw', 'padjacket', '5a4a3a')
    const s = makeState({
      books: { 'book:science': 1 },
      mags: { 'mag:guns': 1 },
      snacks: { painkillers: 1, stale_ration: 1 },
      clothes: jacketToken,
      readBooks: { 'l1_warehouse_repair': true },
      sheetOpen: true,
      sheetTab: 'status',
      invOpen: true,
      invTab: 'misc',
      look: {
        sex: 'm', topw: 'padjacket', top: '5a4a3a',
        botw: 'pants', bottom: '3d5a98', shoes: 'sneakers', shoec: 'f4f1ea',
        hat: 'none', eyew: 'none', neck: 'none',
      },
    })
    const ctx = makeCtx(s, 80000)
    expect(tokenWeight('book:science')).toBe(0.3)
    expect(tokenWeight('mag:guns')).toBe(0.1)
    expect(inventoryWeight(s)).toBeGreaterThan(0.4)

    const qi = quickItems(s)
    expect(qi.find((x) => x.id === 'mag:guns')?.action).toEqual({ k: 'readMag', t: 'mag:guns' })
    expect(qi.find((x) => x.id === 'book:science')?.action).toEqual({ k: 'readBook', t: 'book:science' })

    playerOnInput(ctx, { axes: {}, held: {}, released: {}, pressed: { inv: true }, actionData: { inv: { k: 'readMag', t: 'mag:guns' } } })
    expect(s.effects.length).toBe(1)

    const statsRendered = statsUi({ now: () => 80000 }, { state: s })
    expect(statsRendered).toContain('Cold Resist')
    expect(statsRendered).toContain('Skill Books Read')
    expect(statsRendered).toContain('Range &amp; Ballistics Issue')

    s.invTab = 'app'
    s.invSel = jacketToken
    const lootRendered = lootUi(ctx, { state: s, place: 'level1', feetPosition: { x: 0, y: 0, z: 0 } })
    expect(lootRendered).toContain('Padded jacket')
    expect(lootRendered).toContain('Cold Resist')

    s.invTab = 'aid'
    s.invSel = 'snack:painkillers'
    const aidRendered = lootUi(ctx, { state: s, place: 'level1', feetPosition: { x: 0, y: 0, z: 0 } })
    expect(aidRendered).toContain('Hospital painkillers')

    s.invTab = 'misc'
    s.invSel = 'book:science'
    const bookRendered = lootUi(ctx, { state: s, place: 'level1', feetPosition: { x: 0, y: 0, z: 0 } })
    expect(bookRendered).toContain('readBook')

    expect(pullToken(ctx, 'book:science')).toBe('book:science')
    expect(s.books['book:science']).toBeUndefined()
  })
})
