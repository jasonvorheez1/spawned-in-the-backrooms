import { describe, expect, test } from "bun:test"
import { STEPS, tutStart, tutTick, tutInput, tutJump } from "../scripts/lib/tutorial.js"
import { tutUi } from "../scripts/tutorial-ui.js"
import { hasHalogen, canOpen } from "../scripts/lib/screen.js"

function makeCtx(now = 0) {
  let t = now
  const sounds = []
  return {
    now: () => t,
    advance: (ms) => { t += ms },
    self: { id: "p1", place: "tutorial0-1", feetPosition: { x: 0, y: 0, z: 0 } },
    emit: (topic, payload) => { if (topic === "playSound") sounds.push(payload) },
    sounds,
  }
}

describe("tutorial", () => {
  test("story-spine compliance: no forbidden lore words in STEPS or pre-HALOGEN UI", () => {
    const forbidden = /\b(backrooms|level\s+\d|smiler|m\.e\.g\.?|b\.n\.t\.g\.?|entity|noclip)\b/i
    for (const step of STEPS) {
      expect(forbidden.test(step.text)).toBe(false)
      expect(forbidden.test(step.key)).toBe(false)
    }
    const htmlBefore = tutUi({ tut: { n: 0, at: 0 }, t0n: 0 }, 1000, "tutorial0-1")
    expect(htmlBefore).toContain("ORIENTATION 1/10")
    expect(htmlBefore).not.toContain("HALOGEN")
  })

  test("HALOGEN UI and menus stay locked until Room D machine gives the unit", () => {
    const pre = { t0n: 0 }
    expect(hasHalogen(pre, "tutorial0-1")).toBe(false)
    expect(canOpen(pre, "tutorial0-1", "inventory")).toBe(false)
    expect(canOpen(pre, "tutorial0-1", "craft")).toBe(false)
    expect(canOpen(pre, "tutorial0-1", "journal")).toBe(false)
    expect(canOpen({ ...pre, creating: true }, "tutorial0-1", "sheet")).toBe(true)

    const post = { t0n: 3, trail: { name: 1 } }
    expect(hasHalogen(post, "tutorial0-1")).toBe(true)
    expect(canOpen(post, "tutorial0-1", "inventory")).toBe(true)
    expect(canOpen(post, "tutorial0-1", "craft")).toBe(true)
    expect(hasHalogen(pre, "main")).toBe(true)
  })

  test("crouch never auto-advances into HALOGEN prompts before Room D", () => {
    const ctx = makeCtx(1000)
    const st = { t0n: 2 }
    tutJump(ctx, st, "crouch")
    expect(STEPS[st.tut.n].id).toBe("crouch")

    ctx.advance(1000)
    tutInput(ctx, st, { pressed: { crouch: true } })
    expect(st.tut).toBeNull()
    expect(st.tutDone).toBeUndefined()

    // Once Room D's machine gives the unit, tutJump wakes up inv
    st.t0n = 3
    st.trail = { name: 1 }
    tutJump(ctx, st, "inv")
    expect(STEPS[st.tut.n].id).toBe("inv")
  })

  test("walk, input (single and array), and tutJump progression", () => {
    const ctx = makeCtx(1000)
    const st = {}
    tutStart(ctx, st)
    expect(st.tut.n).toBe(0) // move

    // Walk 4m -> advances to sprint
    ctx.advance(1500)
    ctx.self.feetPosition = { x: 0, y: 0, z: -4 }
    tutTick(ctx, st)
    expect(st.tut.n).toBe(1) // sprint

    // Press sprint after read beat -> advances to tp
    ctx.advance(1000)
    tutInput(ctx, st, { pressed: { sprint: true } })
    expect(st.tut.n).toBe(2) // tp

    // Simulate receiving HALOGEN unit in Room D
    st.t0n = 3
    st.trail = { name: 1 }
    tutJump(ctx, st, "inv")
    expect(STEPS[st.tut.n].id).toBe("inv")

    // Pressing journal ('P') also advances inv step
    ctx.advance(1000)
    tutInput(ctx, st, { pressed: { journal: true } })
    expect(STEPS[st.tut.n].id).toBe("craft")

    // Pressing craft ('Y') advances craft step to go
    ctx.advance(1000)
    tutInput(ctx, st, { pressed: { craft: true } })
    expect(STEPS[st.tut.n].id).toBe("go")

    // tutJump never moves backwards
    tutJump(ctx, st, "combat")
    expect(STEPS[st.tut.n].id).toBe("go")
  })

  test("tutUi hides during cutscenes/sheet and shows HALOGEN after Room D", () => {
    expect(tutUi({ tut: { n: 0, at: 0 }, t0cut: { id: "encounter", at: 0 } }, 100, "tutorial0-1")).toBe("")
    expect(tutUi({ tut: { n: 7, at: 0 }, sheetOpen: true }, 100, "tutorial0-1")).toBe("")
    const htmlAfter = tutUi({ tut: { n: 7, at: 0 }, trail: { name: 1 }, t0n: 3 }, 100, "tutorial0-1")
    expect(htmlAfter).toContain("HALOGEN · ORIENTATION 8/10")
  })
})
