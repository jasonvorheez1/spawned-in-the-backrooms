// The game's camera: a 2006 compact digital (6 MP CCD, cheap zoom lens, auto everything).
// photoBase(ctx): the lens. a touch soft, a hair of colour fringe at the edges. Use it in place of ctx.scene.
// photoFinish(ctx, c): the sensor and the jpeg. highlights clip hard and go warm-white, blacks sit a bit murky,
// mids pop, a cheap-lens vignette and fine sensor noise. Every level's look ends with it, so every level reads as one camera.
import { blur, chromaticAberration, vignette, grain, grade } from 'builtin/postfx';
import { vec3, dot, smoothstep, mix } from 'builtin/tsl';
export function photoBase(ctx) {
  const low = ctx.quality === 'low';
  const soft = blur(ctx.scene, 0.05);
  return low ? soft : chromaticAberration(soft, 0.0012);
}
export function photoFinish(ctx, c, o = {}) {
  // jpeg tone: mids pushed, blacks lifted a little (murky, never grey), saturation a touch hot
  c = grade(c, { contrast: 1.06, lift: 0.018, saturation: 1.06, gamma: 1.02 });
  // CCD clip: past ~80% the highlight runs flat warm-white instead of rolling off
  const l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, vec3(1.0, 0.97, 0.88), smoothstep(0.72, 1.0, l).mul(o.clip ?? 0.45));
  c = vignette(c, ctx.param('vignette', 0.4), { color: [0.02, 0.015, 0.01], roundness: 1.6, feather: 0.7 });
  return grain(c, o.grain ?? 0.035);
}
