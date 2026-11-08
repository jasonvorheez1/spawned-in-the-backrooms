// Level 3's look: the Electrical Station. Warm, dusty, deep blacks kept, but the mids lifted enough that a black hall
// reads as a silhouette toward its far bulb; glow only round what is truly brighter than white (bulbs, sparks).
import { grade, vignette, grain, bloom } from 'builtin/postfx';
import { photoBase, photoFinish } from './lib/photo2006.js';
export function look(ctx) {
  let c = grade(photoBase(ctx), { exposure: 1.3, saturation: 1.0, contrast: 1.1, temperature: 0.06, lift: 0.0 });
  c = vignette(c, ctx.param('vignette', 0.28), { color: [0.01, 0.006, 0.003], roundness: 1.5, feather: 0.6 });
  c = grain(c, 0.035);
  return photoFinish(ctx, bloom(c));
}
