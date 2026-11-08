// Level 1's look: a cold, damp underground car park. Cooler and greyer than Level 0, deeper shadows,
// strong glare off the fluorescent strips and a tight vignette, like the reference photographs.
import { grade, vignette, grain, bloom } from 'builtin/postfx';
import { photoBase, photoFinish } from './lib/photo2006.js';

export function look(ctx) {
  let c = photoBase(ctx);
  c = grade(c, { exposure: 0.98, saturation: 0.95, contrast: 1.16, temperature: -0.07, lift: 0.0 });
  c = vignette(c, ctx.param('vignette', 0.34), { color: [0.005, 0.006, 0.008], roundness: 1.6, feather: 0.55 });
  c = grain(c, 0.028);
  c = bloom(c);
  return photoFinish(ctx, c);
}
