import { test, expect, mock } from 'bun:test'

const tslFn = () => new Proxy(() => tslFn(), { get: () => tslFn })
const tslMod = Object.fromEntries(['uv','time','mix','hash','vec2','vec3','vec4','float','dot','normalize','pow','smoothstep','max','min','saturate','abs','fract','floor','sin','step','clamp','sqrt','length','dFdx','dFdy','cross','sign','oneMinus','PI','materialColor','normalWorld','normalLocal','normalView','positionWorld','positionGeometry','positionLocal','positionView','cameraPosition','texture','mx_noise_float','mx_fractal_noise_float','mx_worley_noise_float'].map(k => [k, tslFn]))
mock.module('builtin/physics', () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module('builtin/tween', () => ({ animate: () => {} }))
mock.module('builtin/tsl', () => tslMod)
mock.module('builtin/three', () => ({ Color: class {}, Vector3: class {}, MeshStandardNodeMaterial: class {} }))
mock.module('../mods/modeling-studio/hud.js', () => ({ m3dPvDown:()=>{},m3dPvWheel:()=>{},m3dPvReset:()=>{},m3dPvTool:()=>{},m3dPvDraft:()=>{},m3dPvEdit:()=>{},m3dPvClear:()=>{},m3dTkMeasure:()=>{},m3dTkDown:()=>{},m3dTkWheel:()=>{},m3dTkReset:()=>{},m3dMpvMove:()=>{},m3dMpvSize:()=>{},m3dDraft:()=>{},m3dPose:()=>{},m3dPick:()=>{},m3dPreview:()=>{},m3dUpload:()=>{},m3dAsk:()=>{},m3dClearRefs:()=>{},m3dGuide:()=>{} }))
mock.module('../mods/absolute-cinema/lib/ui-cinema.js', () => ({ default: () => '' }))
mock.module('../mods/absolute-cinema/lib/ui-cinema-overlays.js', () => ({ renderCinemaOverlays: () => '' }))

const { esc, jsStr, uiPrefsOf, uiPrefsAttrs, noticeToast } = await import('../scripts/lib/ui-kit.js')
const { talkUi } = await import('../scripts/talk-ui.js')
const { statsUi } = await import('../scripts/stats-ui.js')
const { spend } = await import('../scripts/stats.js')
const { lootUi } = await import('../scripts/loot-ui.js')
const { mainMenu } = await import('../scripts/main-menu-ui.js')
const { default: renderHud } = await import('../scripts/ui.js')

const baseState = {
  level: 4,
  xp: 120,
  hp: 85,
  sanity: 90,
  stamina: 100,
  hunger: 80,
  thirst: 75,
  attr: '5,5,5,5,5,5,5',
  skl: '30,30,30,30,30,30,30,30,30,30,30,30,30',
  cents: 2500,
  equipped: 'fists',
  weapons: 'crowbar,pistol',
  look: { species: 'human', sex: 'f' },
}

test('ui-kit escapes text, resolves preferences, and formats notifications', () => {
  expect(esc('<script>"hi"</script>')).toBe('&lt;script&gt;&quot;hi&quot;&lt;/script&gt;')
  expect(jsStr("a'b\\c")).toBe('a\\&#39;b\\\\c')
  expect(uiPrefsOf({})).toEqual({ scale: 'normal', contrast: 'standard', motion: 'system', hudMinimal: false })
  expect(uiPrefsAttrs({ uiPrefs: { scale: 'large', contrast: 'high', motion: 'reduced' } })).toContain('data-ui-contrast="high"')
  const toast = noticeToast({ notice: { text: 'Quest started: Find the Exit', at: 1000 } }, 1500)
  expect(toast).toContain('ui-toast-quest')
  expect(toast).toContain('Quest started: Find the Exit')
  expect(noticeToast({ notice: { text: 'Old', at: 1000 } }, 6000)).toBe('')
})

test('talkUi separates upper NPC speech region from lower player responses region', () => {
  const npc = { id: 'npc/guard', tags: ['npc'], state: { name: 'M.E.G. Expedition Guard', role: 'guard', factionName: 'M.E.G.', rapport: { p1: 20 } } }
  const player = {
    id: 'p1',
    userId: 'p1',
    place: 'main',
    state: {
      ...baseState,
      talkWith: npc.id,
      talks: { guard: [['n', 'You are a long way from the nearest outpost.']] },
      talkChoices: [{ text: 'I am looking for a way out.' }, { text: 'Let me through.', check: { skill: 'speech', difficulty: 40 } }],
    },
  }
  const ctx = { self: player, place: { id: 'main', objects: { [npc.id]: npc } }, getObject: (id) => (id === npc.id ? npc : null) }
  const html = talkUi(ctx, player)
  expect(html).toContain('tc-chassis')
  expect(html).toContain('tc-speech-region')
  expect(html).toContain('tc-responses-region')
  expect(html).toContain('Player responses')
  expect(html).toContain('M.E.G. Expedition Guard')
  expect(html).toContain('SPEECH 40')
  expect(html.indexOf('tc-speech-region')).toBeLessThan(html.indexOf('tc-responses-region'))
})

test('statsUi renders tabbed character sheet and spend switches tabs', () => {
  const s = { ...baseState, sheetOpen: true }
  spend(s, { k: 'tab', t: 'rep' })
  expect(s.sheetTab).toBe('rep')
  const htmlRep = statsUi({}, { state: s })
  expect(htmlRep).toContain('sh-tabs')
  expect(htmlRep).toContain('Overall Karma')
  expect(htmlRep).toContain('sh-rep-grid')

  spend(s, { k: 'tab', t: 'skills' })
  const htmlSkills = statsUi({}, { state: s })
  expect(htmlSkills).toContain('SKILLS · ★ TAGGED')

  const creatingHtml = statsUi({}, { state: { ...baseState, sheetOpen: true, creating: true, apts: 2, tagsLeft: 1 } })
  expect(creatingHtml).toContain('Create Character')
  expect(creatingHtml).not.toContain('sh-tabs')
})

test('lootUi supports search filtering, value sort, and equipment comparison', () => {
  const player = {
    id: 'p1',
    place: 'main',
    state: { ...baseState, invOpen: true, invSel: 'crowbar', invFilter: 'crow', invSort: 'val' },
  }
  const html = lootUi({ now: () => 1000, world: { inputs: {} } }, player)
  expect(html).toContain('inv-search')
  expect(html).toContain('VS EQUIPPED')
  expect(html).toContain('Crowbar')
  expect(html).not.toContain('9mm Pistol')
})

test('mainMenu renders title, pause, settings, and controls views', () => {
  const ctx = { world: { state: { bodyStyle: 'human' }, inputs: { actions: {} } } }
  const titleHtml = mainMenu(ctx, { place: 'main', state: { ...baseState, menuOpen: true, menuKind: 'title', madeChar: true } })
  expect(titleHtml).toContain('Continue')
  expect(titleHtml).toContain('Settings')
  expect(titleHtml).toContain('Controls & Guide')

  const settingsHtml = mainMenu(ctx, { place: 'main', state: { ...baseState, menuOpen: true, menuKind: 'pause', menuView: 'settings' } })
  expect(settingsHtml).toContain('Interface Scale')
  expect(settingsHtml).toContain('High Contrast')
  expect(settingsHtml).toContain('HUD Density')
})

test('renderHud applies accessibility prefs, renders journal filters, and shows notice toast', () => {
  const player = {
    id: 'p1',
    place: 'main',
    feetPosition: { x: 0, y: 0, z: 0 },
    camera: { rotation: { yaw: 0 } },
    state: {
      ...baseState,
      jrnOpen: true,
      qfilter: 'active',
      quests: { q1: { name: 'Find Outpost', step: 'Head north', at: 100 } },
      qdone: { q2: { name: 'Old Task', text: 'Done', at: 50 } },
      notice: { text: 'Saved progress', at: 900 },
      uiPrefs: { scale: 'large', contrast: 'high', motion: 'reduced' },
    },
  }
  const ctx = {
    now: () => 1000,
    self: player,
    place: { id: 'main', objects: {} },
    world: { inputs: { actions: {} } },
  }
  const html = renderHud(ctx, player)
  expect(html).toContain('data-ui-scale="large"')
  expect(html).toContain('data-ui-contrast="high"')
  expect(html).toContain('journal-filters')
  expect(html).toContain('Active (1)')
  expect(html).toContain('Find Outpost')
  expect(html).not.toContain('Old Task')
  expect(html).toContain('ui-toast')
  expect(html).toContain('Saved progress')
})
