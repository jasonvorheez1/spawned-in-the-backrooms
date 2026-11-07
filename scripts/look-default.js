// Level 0 "The Lobby" Look:
// Authentic Found-Footage / Analog Camcorder & Liminal Atmosphere.
// Captures the classic Wikidot Level 0 visual hallmarks:
// - Subtle chromatic aberration and scanlines simulating a wanderer's recording device.
// - Tactile film/sensor grain bringing depth to flat beige surfaces.
// - Sickly institutional mono-yellow color grade with fluorescent green-amber undertones.
// - Peripheral vignette and atmospheric bloom from overhead fluorescent fixtures.
import { grade, vignette, grain, film, scanlines, chromaticAberration, bloom } from 'builtin/postfx';

export function look(ctx) {
  let c = ctx.scene;

  // Subtle analog lens fringing at the periphery
  c = chromaticAberration(c, 0.0025);

  // Fine CRT / tape raster scanlines and sensor noise
  c = scanlines(c, 0.02, 720);
  c = film(c, 0.035);
  c = grain(c, 0.025);

  // Iconic Wikidot Level 0 mono-yellow grade:
  // Slight desaturation avoids garish cartoon yellow, while warm/greenish temperature replicates fluorescent lighting.
  c = grade(c, {
    exposure: 1.04,
    saturation: 0.86,
    contrast: 1.08,
    temperature: 0.055,
    lift: 0.012,
  });

  // Vignette framing to enhance claustrophobia and corridor depth
  c = vignette(c, ctx.param('vignette', 0.36), {
    color: [0.02, 0.018, 0.01],
    roundness: 1.7,
    feather: 0.48,
  });

  // Emissive bloom for fluorescent light tubes and smiler grins
  c = bloom(c);

  return c;
}
