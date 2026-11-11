// One escalator step: rides its loop on the room clock (state.z / state.y are the tween legs laid by the placer).
import { animate } from "builtin/tween";

export function onSpawn(ctx) {
  const s = ctx.self.state;
  if (!s || !s.z || !s.y) return;
  animate(ctx, ctx.self.id, { "feetPosition.z": s.z, "feetPosition.y": s.y }, { loop: true, easing: "linear" });
}
