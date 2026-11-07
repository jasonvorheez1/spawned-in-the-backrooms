// a made thing on the pedestal turns slowly so every side shows; state.turn is where it starts (degrees)
import { animate } from "builtin/tween";
export function onSpawn(ctx) {
  const t = ctx.self.state.turn ?? 0;
  animate(ctx, ctx.self, { "rotation.yaw": [t, t + 360] }, { duration: 20, loop: true, easing: "linear" });
}
