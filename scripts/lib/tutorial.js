// The first-run tutorial after the Level 0 arrival (johnadams2: "afterwards there should be a tutorial").
// state.tut = { n, at, x, z }: the step, when it started, where they stood. Steps finish on the real action
// (scripts/main-menu.js onInput marks presses) or by walking; the HUD card is scripts/tutorial-ui.js.
// no flashlight or almond water key hints (johnadams2's HUD rule)
export const STEPS = [
  { id: "move", key: "W A S D", text: "walk. get your bearings.", walk: 4 },
  { id: "sprint", key: "SHIFT", text: "hold to run. it eats stamina.", input: "sprint" },
  { id: "crouch", key: "C", text: "crouch. you're quieter and harder to spot.", input: "crouch" },
  { id: "tp", key: "MIDDLE MOUSE", text: "hold to see yourself. drag to look around.", input: "thirdPerson" },
  { id: "inv", key: "I", text: "your HALOGEN unit. gear, stats, notes.", input: "inventory" },
  { id: "use", key: "E", text: "pick things up, open doors, talk to people.", input: "interact", skip: 14 },
  { id: "go", key: "", text: "Find a way out of these rooms. Look for signs that someone else made it through.", skip: 8 },
]
const TICK = "/cdn/moodboard-realistic-gritty/sfx-soft-pda-beep-confirm.mp3"
function advance(ctx, st) {
  const p = ctx.self.feetPosition, n = st.tut.n + 1
  ctx.emit("playSound", { clip: TICK, volume: 0.45 }, { audience: { player: ctx.self.id } })
  if (n >= STEPS.length) { st.tut = null; st.tutDone = true; return }
  st.tut = { n, at: ctx.now(), x: p.x, z: p.z }
}
export function tutStart(ctx, st) { const p = ctx.self.feetPosition; st.tut = { n: 0, at: ctx.now(), x: p.x, z: p.z } }
// from update: walking and timed steps
export function tutTick(ctx, st) {
  const tut = st.tut, step = tut && STEPS[tut.n]; if (!step) return
  if (ctx.self.place !== "main" && !ctx.self.place?.startsWith("tutorial0")) return
  const age = (ctx.now() - tut.at) / 1000
  if (age < 1.2) return // a beat to read it
  if (step.walk) { const p = ctx.self.feetPosition; if (Math.hypot(p.x - tut.x, p.z - tut.z) >= step.walk) advance(ctx, st) }
  else if (step.skip && age > step.skip) advance(ctx, st)
}
// from onInput: the step's own action
export function tutInput(ctx, st, input) {
  const tut = st.tut, step = tut && STEPS[tut.n]; if (!step?.input) return
  if ((ctx.now() - tut.at) / 1000 < 0.8) return
  if (input.pressed?.[step.input] || input.held?.[step.input]) advance(ctx, st)
}
