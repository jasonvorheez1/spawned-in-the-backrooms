// hold the middle mouse button: the eye pulls out behind you (scripts/camera.js reads player.state.tp)
export function onInput(ctx, input) {
  const on = !!input.held?.thirdPerson;
  if (!!ctx.self.state.tp !== on) ctx.self.state.tp = on;
}
