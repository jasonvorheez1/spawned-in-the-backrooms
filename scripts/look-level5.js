// Level 5's look: a grand hotel lit by bulbs that should have burned out decades ago, shot on a 2006 compact camera.
// Warm amber cast and deep shadows from the hotel; the lens, clip and grain from scripts/lib/photo2006.js.
import { grade } from 'builtin/postfx';
import { photoBase, photoFinish } from './lib/photo2006.js';
export function look(ctx) {
  let c = photoBase(ctx);
  c = grade(c, { exposure: 1.08, saturation: 0.9, contrast: 1.12, temperature: 0.08, lift: 0.004 });
  return photoFinish(ctx, c);
}
