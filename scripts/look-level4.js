// Level 4's look: an office lit by tubes nobody has changed in years. Cool-green fluorescent cast, washed colour,
// a soft bloom round every troffer, a light vignette and film grain like a security camera's still.
import { grade, vignette, grain, bloom } from 'builtin/postfx';
import { photoBase, photoFinish } from './lib/photo2006.js';
export function look(ctx) {
  let c = photoBase(ctx);
  c = grade(c, { exposure: 1.06, saturation: 1.0, contrast: 1.12, temperature: -0.03, lift: 0.01 });
  c = bloom(c);
  c = vignette(c, ctx.param('vignette', 0.38), { color: [0.02, 0.025, 0.02], roundness: 1.4, feather: 0.6 });
  c = grain(c, 0.035);
  return photoFinish(ctx, c);
}
