// the middle mouse button toggles third person: press once and the eye pulls out behind you, press again to come back (scripts/camera.js reads
// player.state.tp). Anything that takes the eye (a seat, a conversation, a computer, going down) pauses it and it returns after.
export function onInput(ctx, input) {
  if (input.pressed?.thirdPerson) ctx.self.state.tp = !ctx.self.state.tp
}
