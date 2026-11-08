// Level 7's look: Thalassophobia — an infinite, abyssal ocean subterranean expanse.
// Cold oceanic cyan-teal cast, deep crushed oceanic blacks, glistening specular bloom on water ripples,
// heavy maritime mist vignette, and fine sea-mist film grain.
import { grade, vignette, grain, bloom } from 'builtin/postfx';
import { photoBase, photoFinish } from './lib/photo2006.js';

export function look(ctx) {
  let c = photoBase(ctx);

  // Oceanic maritime grade:
  // - Cool oceanic color temperature (-0.14) emphasizing deep naval blues and emerald seafoam.
  // - High contrast to preserve abyssal black water while giving wet wood and lanterns pop.
  // - Enhanced saturation for rich oceanic teal tones.
  c = grade(c, {
    exposure: 1.12,
    saturation: 1.15,
    contrast: 1.22,
    temperature: -0.14,
    lift: 0.005,
  });

  // Glistening specular bloom on rippling water, brass lanterns, and distant warning beacons
  c = bloom(c);

  // Atmospheric oceanic vignette: dark vignette framing the abyss
  c = vignette(c, ctx.param('vignette', 0.42), {
    color: [0.005, 0.015, 0.03],
    roundness: 1.35,
    feather: 0.65,
  });

  // Sea-mist grain to disperse digital banding over fog and water surfaces
  c = grain(c, 0.036);

  return photoFinish(ctx, c);
}
