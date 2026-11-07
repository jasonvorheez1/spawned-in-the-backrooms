// Level 2's look: old steam tunnels. Warm, dusty and high contrast, with a heavy glow round the bare bulbs
// and fluorescent strips, crushed shadows and a tight vignette, like the reference photographs.
import { grade, vignette, grain, bloom } from 'builtin/postfx';

export function look(ctx) {
  let c = ctx.scene;
  c = grade(c, { exposure: 1.0, saturation: 0.95, contrast: 1.2, temperature: 0.1, lift: 0.0 });
  c = vignette(c, ctx.param('vignette', 0.4), { color: [0.01, 0.006, 0.003], roundness: 1.5, feather: 0.55 });
  c = grain(c, 0.03);
  c = bloom(c);
  return c;
}
