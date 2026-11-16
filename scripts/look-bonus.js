// The Bonus Room's AAA look: rich vaporwave atrium highlights, smooth AgX highlight rolloff,
// crisp shadow depth without black crush, subtle bloom on neon/arcade glow, and fine grain.
import { grade, vignette, grain, bloom } from "builtin/postfx";
import { photoBase, photoFinish } from "./lib/photo2006.js";

export function look(ctx) {
  let c = photoBase(ctx);
  c = grade(c, {
    exposure: ctx.param("exposure", 1.04),
    saturation: ctx.param("saturation", 1.08),
    contrast: ctx.param("contrast", 1.1),
    temperature: ctx.param("temperature", 0.02),
    tint: ctx.param("tint", -0.02),
    lift: ctx.param("lift", 0.006),
  });
  c = bloom(c);
  c = vignette(c, ctx.param("vignette", 0.22), {
    color: [0.025, 0.012, 0.032],
    roundness: 1.65,
    feather: 0.65,
  });
  c = grain(c, ctx.param("grain", 0.018));
  return photoFinish(ctx, c, { clip: 0.16, grain: 0.008 });
}
