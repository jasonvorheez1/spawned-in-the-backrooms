// Level 1.1, Sector 4: black and white only, hard as a photocopy, with the dot of a cheap print in the greys.
import { grade, grain, dotScreen } from 'builtin/postfx';
import { mix } from 'builtin/tsl';
export function look(ctx) {
  let c = grade(ctx.scene, { saturation: 0, contrast: 2.6, exposure: 1.25, gamma: 0.85 });
  c = mix(c, dotScreen(c, 0.6, 1.4), 0.22);
  c = grade(c, { saturation: 0 });
  return grain(c, 0.05);
}
