import { expect, mock, test } from "bun:test"
import { currentTip, GUIDE_LESSONS, guideInput, guideTick, orientation } from "../scripts/lib/tutorial.js"
import { hasHalogen, canOpen, screen } from "../scripts/lib/screen.js"
import { fieldGuideUi, tutUi } from "../scripts/tutorial-ui.js"
import { ears } from "../scripts/tut0-panel.js"
import { tick as placeTick } from "../places/tutorial0/sim.js"
import { BEATS, HALO, WALLS } from "../scripts/lib/tut0.js"
import world from "../world.config.yaml"

mock.module("builtin/tween", () => ({ animate() {} }))
mock.module("builtin/physics", () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [], traverseCheck: () => null }))
mock.module("builtin/three", () => ({ MeshStandardNodeMaterial: class {} }))
mock.module("builtin/tsl", () => Object.fromEntries(
  "materialColor positionGeometry positionWorld normalWorld cameraPosition normalize dot pow saturate vec2 vec3 float abs fract floor sin mix smoothstep step max min mx_noise_float mx_fractal_noise_float mx_worley_noise_float"
    .split(" ").map((name) => [name, () => ({})]),
))
const { t0Tick } = await import("../scripts/lib/tut0-cut.js")
const { onInput: menuInput } = await import("../scripts/main-menu.js")

const tutorial = "tutorial0-solo"
function scene(place = tutorial, s = {}) {
  let now = 1000, next = 0
  const objects = new Map()
  const self = { id: "player", state: s, place, feetPosition: { x: 0, y: 0.05, z: 0 }, anim: {}, bones: { RightHand: {} }, rotation: { yaw: 0 } }
  objects.set(self.id, self)
  return {
    self, objects, place: { state: {} }, world: { state: {} }, session: {}, view: {}, now: () => now,
    wait: (ms) => { now += ms }, emit() {},
    getObject: (id) => objects.get(id),
    destroy: (id) => objects.delete(id),
    spawn: (arg, spec = arg) => { const id = typeof arg === "string" ? arg : spec.id ?? "temporary-" + ++next; objects.set(id, { ...spec, id, place }); return id },
    query: ({ anyTags }) => [...objects.values()].filter((o) => o.tags?.some((tag) => anyTags.includes(tag))),
  }
}

test("opening instructions follow movement and actual supplies, without leaking story names", () => {
  const ctx = scene(), s = ctx.self.state, render = () => tutUi(s, ctx.now(), ctx.self)
  expect(render()).toContain("Find the open doorway")
  expect(render()).toMatch(/<\/style><aside/)
  ctx.self.feetPosition.z = -12
  expect(render()).toContain("Search the supply alcove")
  expect(render()).not.toMatch(/HALOGEN|Backrooms|Smiler|Field Guide/)
  s.scrap = { wire: 1 }
  expect(render()).toContain("Check the bend")
  expect(ctx.self.feetPosition.z).toBe(-12)
  s.t0cut = { id: "encounter", at: ctx.now() }
  expect(render()).toBe("")
})

test("the supply loop has two openings and the repair bay offers a real manual and workstation", () => {
  const ctx = scene()
  placeTick(ctx)
  const wallAt = (z) => WALLS.some(([axis, x, a, b]) => axis === "x" && x === -1.5 && a < z && z < b)
  expect(wallAt(-16)).toBe(false)
  expect(wallAt(-20.5)).toBe(false)
  expect(wallAt(-18.5)).toBe(true)
  expect(ctx.getObject("t0-carton").feetPosition.x).toBeLessThan(-1.5)
  expect(ctx.getObject("t0-crate-d").state.items.split(",")).toContain("manual:tools")
  expect(ctx.getObject("t0-bench").state.station).toBe("bench")
  expect(ctx.getObject("t0-halogen").behavior).toBe("scripts/tut0-panel.js")
  placeTick(ctx)
  const count = ctx.objects.size
  placeTick(ctx)
  expect(ctx.objects.size).toBe(count)
})

test("walking the blackout keeps control, responds to the player's approach, and restores the lights", () => {
  const warningXs = []
  for (const crouch of [true, false]) {
    const s = { t0n: 1, crouch }, ctx = scene(tutorial, s)
    placeTick(ctx)
    const p = { x: 14, y: 0.05, z: -28 }
    ctx.self.feetPosition = p
    expect(t0Tick(ctx, ctx.session, s)).toBe(false)
    expect(ctx.self.feetPosition).toBe(p)
    expect(ctx.view.camera).toBeUndefined()
    expect(ctx.getObject("t0-light-11").light.intensity).toBeLessThan(1)
    p.x = 22.5
    t0Tick(ctx, ctx.session, s)
    warningXs.push(ctx.getObject(ctx.session.t0Hall.grin).feetPosition.x)
    p.x = 37
    expect(t0Tick(ctx, ctx.session, s)).toBe(false)
    expect(s.t0n).toBe(2)
    expect(ctx.getObject("t0-light-11").light.intensity).toBe(5)
    expect(ctx.session.t0Hall).toBeNull()
  }
  expect(warningXs[0]).toBeGreaterThan(warningXs[1])
})

test("the wrist terminal requires a nearby press and unlocks panels after its scene", () => {
  const s = { t0n: 2, run: { story: "off" } }, ctx = scene(tutorial, s)
  placeTick(ctx)
  const panel = ctx.getObject("t0-halogen"), press = () => ears.press({ ...ctx, self: panel }, { by: ctx.self.id })
  expect(hasHalogen(s, tutorial)).toBe(false)
  for (const page of ["inventory", "craft", "journal"]) expect(canOpen(s, tutorial, page)).toBe(false)
  press()
  expect(s.t0cut).toBeUndefined()
  ctx.self.feetPosition = { ...HALO.stand, y: 0 }
  expect(t0Tick(ctx, ctx.session, s)).toBe(false)
  press()
  expect(s.t0cut.id).toBe("halogen")
  ctx.wait(7600)
  expect(t0Tick(ctx, ctx.session, s)).toBe(true)
  expect(s.sheetOpen).toBe(true)
  s.sheetOpen = false
  expect(t0Tick(ctx, ctx.session, s)).toBe(true)
  expect(s.t0n).toBe(3)
  expect(s.trail).toBeUndefined()
  expect(hasHalogen(s, tutorial)).toBe(true)
  expect(canOpen(s, tutorial, "inventory")).toBe(true)
})

test("practice adapts to recipes and slots and can be bypassed without a cut or teleport", () => {
  const ctx = scene(tutorial, { t0n: 3 }), s = ctx.self.state
  ctx.self.feetPosition = { x: 44, y: 0, z: -28 }
  const task = () => orientation(s, tutorial, ctx.self.feetPosition)
  expect(task().id).toBe("manual")
  s.recipes = "bobbypin"
  expect(task().id).toBe("bind")
  s.quickSlots = { 0: "weapon:table_leg" }
  expect(task().id).toBe("follow")
  const p = { x: 44, y: 0, z: -22.6 }
  ctx.self.feetPosition = p
  s.recipes = ""; s.quickSlots = {}
  expect(t0Tick(ctx, ctx.session, s)).toBe(false)
  expect(ctx.self.feetPosition).toBe(p)
  expect(s.t0n).toBe(4); expect(s.t0cut).toBeUndefined()
  expect(task().id).toBe("follow")
  expect(BEATS[4].id).toBe("final")
  ctx.self.feetPosition = { x: 45, y: 0, z: -1.5 }
  expect(t0Tick(ctx, ctx.session, s)).toBe(true)
  ctx.wait(40000)
  expect(t0Tick(ctx, ctx.session, s)).toBe("level1")
  expect(s.t0Done).toBe(true)
})

test("one tip at a time, with a cooldown, and no repeats after restarting the session", () => {
  const s = { t0Done: true, level: 1, recipes: "bobbypin", quickSlots: { 0: "almond" } }
  const ctx = scene("level1", s)
  expect(guideTick(ctx, s)).toBe(true)
  expect(currentTip(s, "level1", ctx.now()).id).toBe("crafting")
  expect(tutUi(s, ctx.now(), ctx.self)).toContain("Discover recipes")
  s.quests = { route: { step: "Find the station" } }
  ctx.wait(17000); guideTick(ctx, s)
  expect(s.guideSeen).toEqual(["crafting"])
  guideTick(ctx, s); expect(s.guideTip).toBeNull()
  ctx.wait(18000); guideTick(ctx, s)
  expect(s.guideTip.id).toBe("tracking")
  const rejoined = scene("level1", { ...s, guideTip: null, quests: {} })
  guideTick(rejoined, rejoined.self.state)
  expect(rejoined.self.state.guideTip).toBeNull()
})

test("a cut or dialog pauses tips and a short interruption does not mark them seen", () => {
  const s = { t0Done: true, level: 1 }, ctx = scene("thehub", s)
  guideTick(ctx, s)
  expect(s.guideTip.id).toBe("hub")
  s.talkWith = "npc"
  expect(currentTip(s, "thehub", ctx.now())).toBeNull()
  guideTick(ctx, s)
  expect(s.guideSeen).toBeUndefined()
  ctx.wait(3000); s.talkWith = ""
  guideTick(ctx, s)
  expect(s.guideTip.id).toBe("hub")
  expect(currentTip(s, "level1", ctx.now())).toBeNull()
})

test("the guide uses the real wrist screen and stays available when tips are skipped", async () => {
  const s = { t0Done: true, level: 1, run: { tutorial: "skip" }, invOpen: true }, ctx = scene("main", s)
  expect(guideTick(ctx, s)).toBe(false)
  expect(world.inputs.actions.fieldGuide.keys).toEqual(["j"])
  menuInput(ctx, { pressed: { fieldGuide: true } })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(screen(s, "main")).toBe("journal"); expect(s.invOpen).toBe(false)
  const html = fieldGuideUi(s, "main")
  expect(html).toMatch(/<\/style><div class="field-book"/)
  expect(html).toContain("Automatic tips off")
  for (const lesson of GUIDE_LESSONS) expect(html).toContain(lesson.title)
  guideInput(ctx, s, { pressed: { fieldGuide: true }, actionData: { fieldGuide: { k: "mute" } } })
  expect(s.guideMuted).toBe(false)
  guideInput(ctx, s, { pressed: { fieldGuide: true }, actionData: { fieldGuide: { k: "quests" } } })
  expect(s.jrnOpen).toBe(true)
  const pre = scene(tutorial, { t0n: 2 })
  guideInput(pre, pre.self.state, { pressed: { fieldGuide: true } })
  expect(fieldGuideUi(pre.self.state, tutorial)).toBe("")
})
