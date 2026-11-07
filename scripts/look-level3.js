// Level 3's look: the Electrical Station. Warm, dusty, deep blacks kept, but the mids lifted enough that a black hall
// reads as a silhouette toward its far bulb; glow only round what is truly brighter than white (bulbs, sparks).
import { grade, vignette, grain, bloom } from 'builtin/postfx';
export function look(ctx) {
  let c = grade(ctx.scene, { exposure: 1.3, saturation: 0.85, contrast: 1.1, temperature: 0.06, lift: 0.0 });
  c = vignette(c, ctx.param('vignette', 0.28), { color: [0.01, 0.006, 0.003], roundness: 1.5, feather: 0.6 });
  c = grain(c, 0.035);
  return bloom(c);
}
