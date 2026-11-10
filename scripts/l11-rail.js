// Level 11 canal promenade railing: square iron balusters between a top rail and a kick rail, a post at each end.
// params { len = 4.8 } along X, centred on the origin; 1.0 m tall.
function box(ctx, x0, y0, z0, x1, y1, z1) {
  const q = (a, b, c, d) => ctx.quad(a, b, c, d);
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
  q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}
export function geometry(ctx) {
  try { const __q = ctx.quad.bind(ctx); ctx.quad = (...a) => __q(...a.flat()); } catch (e) {}
  const L = ctx.params.len ?? 4.8, h = L / 2;
  box(ctx, -h, 0.94, -0.035, h, 1.0, 0.035);          // top rail, a flat cap
  box(ctx, -h, 0.9, -0.02, h, 0.93, 0.02);            // under-rail
  box(ctx, -h, 0.08, -0.02, h, 0.12, 0.02);           // kick rail
  for (const x of [-h + 0.04, h - 0.04]) {             // end posts with a knob
    box(ctx, x - 0.04, 0, -0.04, x + 0.04, 1.02, 0.04);
    box(ctx, x - 0.055, 1.02, -0.055, x + 0.055, 1.08, 0.055);
  }
  const n = Math.round(L / 0.14);
  for (let i = 1; i < n; i++) { const x = -h + (i * L) / n; box(ctx, x - 0.012, 0.12, -0.012, x + 0.012, 0.9, 0.012); }
}
