// Clean, cinematic liminal look for Level 0:
// Recreates the authentic sickly-fluorescent lighting of the original Backrooms photograph.
// Avoids heavy shader gimmicks (no artificial CRT scanlines or harsh aberration).
import { grade, vignette, grain, bloom } from 'builtin/postfx';
import { photoBase, photoFinish } from './lib/photo2006.js';

export function look(ctx) {
  let c = photoBase(ctx);

  // Natural color grade:
  // - Slightly muted saturation to capture the drab, clinical monotony of empty office space.
  // - Subtle warm-green fluorescent temperature shift in midtones.
  // - Controlled contrast with clean shadow depth.
  c = grade(c, {
    exposure: 1.02,
    saturation: 1.0,
    contrast: 1.06,
    temperature: 0.04,
    lift: 0.008,
  });

  // Soft natural lens falloff focusing attention forward
  c = vignette(c, ctx.param('vignette', 0.24), {
    color: [0.015, 0.015, 0.01],
    roundness: 1.8,
    feather: 0.5,
  });

  // Very subtle fine grain to soften flat surfaces and avoid digital banding
  c = grain(c, 0.02);

  // Soft bloom for overhead fluorescent tubes and reflections
  c = bloom(c);

  return photoFinish(ctx, c);
}
