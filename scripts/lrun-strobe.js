// Level ! caged emergency strobe: the light pulses on a tween, nothing written per tick.
import { animate } from "builtin/tween";
export function onSpawn(ctx) {
  const s = ctx.self.state ?? {}, base = s.peak ?? 5.5;
  animate(ctx, ctx.self, { "light.intensity": [0.15, base, base * 0.7, 0.15] }, { duration: s.period ?? 1.2, delay: s.phase ?? 0, loop: true, easing: "easeInOutSine" });
}
