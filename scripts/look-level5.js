// Level 5's look: a grand hotel lit by bulbs that should have burned out decades ago. Warm amber cast, deep crushed
// shadows, bloom round every chandelier crystal, a heavy vignette and old-film grain.
import { grade, vignette, grain, bloom } from 'builtin/postfx';
export function look(ctx) {
  let c = ctx.scene;
  c = grade(c, { exposure: 1.08, saturation: 0.9, contrast: 1.16, temperature: 0.08, lift: 0.004 });
  c = bloom(c);
  c = vignette(c, ctx.param('vignette', 0.45), { color: [0.03, 0.015, 0.01], roundness: 1.3, feather: 0.65 });
  c = grain(c, 0.045);
  return c;
}
