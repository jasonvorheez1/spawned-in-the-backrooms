// Level 1.1, Sector 2: the picture is over-exposed and its colour has slipped. Green and magenta fringe every edge.
import { grade, chromaticAberration, grain, tint, scanlines } from 'builtin/postfx';
export function look(ctx) {
  let c = chromaticAberration(ctx.scene, 0.012);
  c = grade(c, { exposure: 1.12, saturation: 1.35, contrast: 1.1, tint: -0.12, lift: 0.01 });
  c = tint(c, "oklch(0.9 0.12 150)", 0.1);
  c = scanlines(c, 0.035, 500);
  return grain(c, 0.035);
}
