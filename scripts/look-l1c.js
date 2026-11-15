// Level 1.1, Sector 1: a clean over-lit service hall. Cool white, the tubes glaring, a soft falloff down the length.
import { grade, vignette, grain, bloom } from 'builtin/postfx';
import { photoBase, photoFinish } from './lib/photo2006.js';
export function look(ctx) {
  let c = photoBase(ctx);
  c = grade(c, { exposure: 1.05, saturation: 0.92, contrast: 1.08, temperature: -0.05, lift: 0.01 });
  c = vignette(c, ctx.param('vignette', 0.3), { color: [0.01, 0.012, 0.02], roundness: 1.5, feather: 0.6 });
  c = grain(c, 0.02);
  c = bloom(c);
  return photoFinish(ctx, c);
}
