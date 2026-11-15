// Level 1.1, Sector 3: near black, and where there is light it burns out to pink-white. Two tones and little between.
import { grade, vignette, grain, tint } from 'builtin/postfx';
export function look(ctx) {
  let c = grade(ctx.scene, { exposure: 1.15, saturation: 0.7, contrast: 2.1, lift: -0.03, gamma: 0.8 });
  c = tint(c, "oklch(0.75 0.14 350)", 0.3);
  c = vignette(c, 0.55, { color: [0, 0, 0], roundness: 1.3, feather: 0.6 });
  return grain(c, 0.07);
}
