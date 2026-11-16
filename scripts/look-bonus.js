// The Bonus Room's photographic realism pass: neutral architectural balance under a late-afternoon skylight,
// natural highlight rolloff via AgX, crisp uncrushed blacks, gentle bloom on actual emitters, and fine film grain.
import { grade, vignette, grain, bloom } from "builtin/postfx";
import { photoBase, photoFinish } from "./lib/photo2006.js";

export function look(ctx) {
  let c = photoBase(ctx);
  c = grade(c, {
    exposure: ctx.param("exposure", 1.01),
    saturation: ctx.param("saturation", 0.98),
    contrast: ctx.param("contrast", 1.06),
    temperature: ctx.param("temperature", 0.03),
    tint: ctx.param("tint", 0.0),
    lift: ctx.param("lift", 0.004),
  });
  c = bloom(c);
  c = vignette(c, ctx.param("vignette", 0.16), {
    color: [0.015, 0.012, 0.01],
    roundness: 1.7,
    feather: 0.65,
  });
  c = grain(c, ctx.param("grain", 0.014));
  return photoFinish(ctx, c, { clip: 0.14, grain: 0.006 });
}
