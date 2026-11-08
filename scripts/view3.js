// the middle mouse button: in first person a press pulls the eye out behind you (scripts/camera.js reads player.state.tp).
// In third person it works like New Vegas: a quick tap comes back to first person; HOLD it and the mouse swings the eye a full
// 360 round you while your body stands still (state.orbit; turnTo 'none' stops the body turning to the look), let go and it holds.
// Anything that takes the eye (a seat, a conversation, a computer, going down) pauses third person and it returns after.
const TAP_MS = 250
export function onInput(ctx, input) {
  const st = ctx.self.state, s = ctx.self.session
  if (input.pressed?.thirdPerson) {
    if (!st.tp) { st.tp = true; s.v3Down = null }
    else s.v3Down = ctx.now()
  }
  if (s.v3Down != null && st.tp && input.held?.thirdPerson && ctx.now() - s.v3Down >= TAP_MS && !st.orbit) {
    st.orbit = true; s.v3Turn = st.turnTo ?? null; st.turnTo = 'none'
  }
  if (input.released?.thirdPerson && s.v3Down != null) {
    if (!st.orbit && ctx.now() - s.v3Down < TAP_MS) st.tp = false
    s.v3Down = null
    endOrbit(st, s)
  }
  if (!st.tp && st.orbit) endOrbit(st, s)
  // moving while orbiting hands the heading back so you walk where you look
  if (st.orbit && (Math.abs(input.axes?.moveX ?? 0) > 0.2 || Math.abs(input.axes?.moveZ ?? 0) > 0.2) && st.turnTo === 'none') st.turnTo = s.v3Turn ?? null
}
function endOrbit(st, s) {
  if (!st.orbit) return
  st.orbit = false
  if (st.turnTo === 'none') st.turnTo = s.v3Turn ?? null
  s.v3Turn = null
}
