// Level 10 "Bumper Crop": Split-rail rustic wooden post-and-rail fence.
// Parametric fence: params { len = 12, rails = 2 } extending along +X from origin.
const WOOD = "cdn/texture-worn-hardwood-grain.png";

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
  try { const __q = ctx.quad.bind(ctx), __t = ctx.tri.bind(ctx); ctx.quad = (...a) => __q(...a.flat()); ctx.tri = (...a) => __t(...a.flat()); } catch (e) {} // __flat: corners as [x,y,z] arrays
  const len = ctx.params.len ?? 12;
  const numRails = ctx.params.rails ?? 2;
  const SPAN = 2.4;
  const numPosts = Math.max(2, Math.round(len / SPAN) + 1);
  const actualSpan = len / (numPosts - 1);

  ctx.roughness(0.95);
  ctx.albedo(WOOD);
  ctx.color("oklch(0.58 0.04 65)"); // Weathered rustic cedar

  // Upright fence posts
  for (let i = 0; i < numPosts; i++) {
    const x = i * actualSpan;
    const postH = 1.15;
    const pw = 0.08, pd = 0.08;
    box(ctx, x - pw, 0, -pd, x + pw, postH, pd);
  }

  // Horizontal rails
  const railH = numRails === 3 ? [0.3, 0.62, 0.95] : [0.42, 0.88];
  for (let i = 0; i < numPosts - 1; i++) {
    const x0 = i * actualSpan;
    const x1 = (i + 1) * actualSpan;
    for (const y of railH) {
      box(ctx, x0, y - 0.04, -0.035, x1, y + 0.04, 0.035);
    }
  }
}

export function collider(ctx) {
  const len = ctx.params.len ?? 12;
  return [
    { kind: "box", width: len, height: 1.1, depth: 0.2, center: [len / 2, 0.55, 0] },
  ];
}
