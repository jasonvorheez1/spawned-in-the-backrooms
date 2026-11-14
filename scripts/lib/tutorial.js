import { hasHalogen } from "./screen.js"
// The first-run tutorial after the Level 0 arrival (johnadams2: "afterwards there should be a tutorial").
// state.tut = { n, at, x, z }: the step, when it started, where they stood. Steps finish on the real action
// (scripts/main-menu.js onInput marks presses) or by walking; the HUD card is scripts/tutorial-ui.js.
// Story-spine rule: no "Backrooms", no "levels", no faction or entity names before the player learns them.
export const STEPS = [
  { id: "move", key: "W A S D", text: "Walk. Get your bearings.", walk: 3.5 },
  { id: "sprint", key: "SHIFT", text: "Hold to sprint. Watch your stamina.", input: "sprint" },
  { id: "tp", key: "MIDDLE MOUSE", text: "Hold to look at yourself. Drag to orbit.", input: "thirdPerson", skip: 10 },
  { id: "use", key: "E", text: "Look at items or cartons and press E to take or search. Press R to take all.", input: "interact", skip: 16 },
  { id: "light", key: "F", text: "Toggle your flashlight when the lights go out.", input: "flashlight", skip: 12 },
  { id: "combat", key: "LEFT CLICK", text: "Tap to swing. Hold to wind up a heavy hit. X swaps weapons.", input: "attack", skip: 14 },
  { id: "crouch", key: "C", text: "Crouch to move quietly and stay harder to spot in the dark.", input: "crouch", skip: 14 },
  { id: "inv", key: "I", text: "Open your HALOGEN unit for gear, aid, and notes. P opens your journal.", input: ["inventory", "journal"], skip: 14, halogen: true },
  { id: "craft", key: "Y / E", text: "Press Y to craft by hand, or E at a Workbench for heavier gear and repairs.", input: ["craft", "interact"], skip: 18, halogen: true },
  { id: "go", key: "", text: "Follow the drawings down the hall. Find a way out.", skip: 10 },
]
const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.id, i]))
const TICK = "/cdn/moodboard-realistic-gritty/sfx-soft-pda-beep-confirm.mp3"
function advance(ctx, st) {
  const p = ctx.self.feetPosition, n = st.tut.n + 1
  ctx.emit("playSound", { clip: TICK, volume: 0.45 }, { audience: { player: ctx.self.id } })
  if (n >= STEPS.length) { st.tut = null; st.tutDone = true; return }
  // Wait for Room D's HALOGEN machine before showing any HALOGEN-unit prompts
  if (STEPS[n]?.halogen && !hasHalogen(st, ctx.self.place)) { st.tut = null; return }
  st.tut = { n, at: ctx.now(), x: p.x, z: p.z }
}
export function tutStart(ctx, st) { const p = ctx.self.feetPosition; st.tut = { n: 0, at: ctx.now(), x: p.x, z: p.z } }
// Jump the tutorial prompt forward to a specific step id when a tutorial0 beat finishes
export function tutJump(ctx, st, id) {
  if (st.tutDone) return
  const target = STEP_INDEX[id]
  if (target == null) return
  if (STEPS[target]?.halogen && !hasHalogen(st, ctx.self.place)) return
  if (st.tut && st.tut.n >= target) return
  const p = ctx.self.feetPosition
  st.tut = { n: target, at: ctx.now(), x: p.x, z: p.z }
}
// from update: walking and timed steps
export function tutTick(ctx, st) {
  const tut = st.tut, step = tut && STEPS[tut.n]; if (!step) return
  if (ctx.self.place !== "main" && !ctx.self.place?.startsWith("tutorial0")) return
  if (st.t0cut || st.sheetOpen || st.menuOpen) return
  const age = (ctx.now() - tut.at) / 1000
  if (age < 1.2) return // a beat to read it
  if (step.walk) { const p = ctx.self.feetPosition; if (Math.hypot(p.x - tut.x, p.z - tut.z) >= step.walk) advance(ctx, st) }
  else if (step.skip && age > step.skip) advance(ctx, st)
}
// from onInput: the step's own action
export function tutInput(ctx, st, input) {
  const tut = st.tut, step = tut && STEPS[tut.n]; if (!step?.input) return
  if (st.t0cut || st.sheetOpen || st.menuOpen) return
  if ((ctx.now() - tut.at) / 1000 < 0.8) return
  const keys = Array.isArray(step.input) ? step.input : [step.input]
  if (keys.some((k) => input.pressed?.[k] || input.held?.[k])) advance(ctx, st)
}
