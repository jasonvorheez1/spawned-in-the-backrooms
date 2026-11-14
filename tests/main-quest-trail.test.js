import { describe, expect, test, mock } from "bun:test"
mock.module("builtin/physics", () => ({ raycast: () => null, getInputRay: () => null, overlapPoint: () => [] }))
mock.module("builtin/tween", () => ({ animate: () => {} }))
mock.module("builtin/nav", () => ({ findPath: () => null }))

const { rootChoices } = await import("../scripts/lib/dialogue.js")
const { trailStep, learn } = await import("../scripts/lib/dina-quest.js")

describe("main quest Chapter 1 trail", () => {
  test("rootChoices hides Dina questions until trail.name is learned", () => {
    const npc = { id: "meg-callum", state: { faction: "meg" } }
    const before = rootChoices(npc, "level1", new Set(), { trail: {} })
    expect(before.some((c) => /\bdina\b/i.test(c.text))).toBe(false)
    expect(before.some((c) => /where am i/i.test(c.text))).toBe(true)

    const after = rootChoices(npc, "level1", new Set(), { trail: { name: 1 } })
    expect(after.some((c) => /\bdina\b/i.test(c.text))).toBe(true)
  })

  test("trailStep advances through all 7 clues with specific markers", () => {
    const ctx = { now: () => 1000 }
    const st = {}
    expect(trailStep(st).mark).toBeNull()

    learn(ctx, st, "name", true)
    expect(trailStep(st).step).toContain("Dina")

    learn(ctx, st, "word", true)
    expect(trailStep(st).mark).toEqual({ place: "level1", id: "meg-callum" })

    learn(ctx, st, "list", true)
    expect(trailStep(st).mark).toEqual({ place: "level3", id: "dina-cassette" })

    learn(ctx, st, "tape", true)
    expect(trailStep(st).mark).toEqual({ place: "level5", id: "l5-ambrose" })

    learn(ctx, st, "room", true)
    expect(trailStep(st).mark).toEqual({ place: "level11", id: "l11-meg-agent-vance" })

    learn(ctx, st, "radio", true)
    expect(trailStep(st).mark).toEqual({ place: "level11", id: "l11-trader-kael" })

    learn(ctx, st, "pass", true)
    expect(trailStep(st).mark).toEqual({ place: "level26", id: "l26-cabin23" })
  })
})
