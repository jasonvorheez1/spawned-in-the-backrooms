// Level 10's farm buildings: one script, params { w, d, h, ridge, wall: "brick" | "plank", door } in metres.
// Brick walls (the wiki's red brick barn), a grey corrugated cement roof with eaves, a big doorway on the front (-Z)
// with grey sliding doors, half open. A real room: the doorway is cut through the mesh and the collider.
const TEX = {
  brick: "cdn/texture-weathered-red-brick-barn-wall-english-bond-moss-stains.png",
  plank: "cdn/texture-weathered-grey-barn-wood-vertical-planks.png",
  roof: "cdn/texture-grey-corrugated-asbestos-cement-roof-sheets-lichen.png",
  door: "cdn/texture-dark-grey-painted-steel-barn-door-weathered.png",
  floor: "cdn/texture-dusty-concrete-barn-floor-with-straw.png",
};
const P = (c) => ({ w: c.params.w ?? 18, d: c.params.d ?? 9, h: c.params.h ?? 4.6, R: c.params.ridge ?? 8.4, wall: c.params.wall ?? "brick", dw: c.params.door ?? 4.2, t: 0.32 });
function boxes(p) {
  const { w, d, h, dw, t } = p, dh = Math.min(h - 0.5, 3.8), side = (w - dw) / 2;
  return [
    [-w / 2, 0, -d / 2, -dw / 2, h, -d / 2 + t], [dw / 2, 0, -d / 2, w / 2, h, -d / 2 + t], [-dw / 2, dh, -d / 2, dw / 2, h, -d / 2 + t], // front, around the door
    [-w / 2, 0, d / 2 - t, w / 2, h, d / 2], [-w / 2, 0, -d / 2, -w / 2 + t, h, d / 2], [w / 2 - t, 0, -d / 2, w / 2, h, d / 2],
  ];
}
export function geometry(ctx) {
  const p = P(ctx), { w, d, h, R, t } = p;
  const box = (x0, y0, z0, x1, y1, z1) => {
    const q = (a, b, c, e) => ctx.quad(...a, ...b, ...c, ...e);
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  };
  const both = (a, b, c) => { ctx.tri(...a, ...b, ...c); ctx.tri(...a, ...c, ...b); };
  ctx.albedo(TEX[p.wall]); ctx.color(p.wall === "brick" ? "oklch(0.78 0.04 45)" : "oklch(0.8 0.01 70)");
  for (const b of boxes(p)) box(...b);
  // gables, both faces, on the front and back walls
  for (const z of [-d / 2 + t / 2, d / 2 - t / 2]) { both([w / 2, h, z], [-w / 2, h, z], [0, R, z]); }
  // a brick plinth course in darker brick
  ctx.color(p.wall === "brick" ? "oklch(0.6 0.05 40)" : "oklch(0.6 0.01 70)");
  box(-w / 2 - 0.05, 0, -d / 2 - 0.05, -p.dw / 2, 0.45, -d / 2 + 0.02); box(p.dw / 2, 0, -d / 2 - 0.05, w / 2 + 0.05, 0.45, -d / 2 + 0.02);
  // the roof: two corrugated slopes with an overhang, top and underside
  ctx.albedo(TEX.roof); ctx.color("oklch(0.72 0.01 240)");
  const o = 0.45, W = w / 2 + o, D = d / 2 + o, hy = h - o * (R - h) / (w / 2);
  const slope = (A, B, C, E) => { ctx.quad(...A, ...B, ...C, ...E); ctx.quad(...A, ...E, ...C, ...B); };
  slope([-W, hy, -D], [-W, hy, D], [0, R + 0.08, D], [0, R + 0.08, -D]);
  slope([W, hy, D], [W, hy, -D], [0, R + 0.08, -D], [0, R + 0.08, D]);
  // ridge cap
  ctx.color("oklch(0.55 0.01 240)"); box(-0.18, R, -D, 0.18, R + 0.2, D);
  // sliding doors: one shut across the left half, one pulled open past the right jamb
  ctx.albedo(TEX.door); ctx.color("oklch(0.62 0.02 250)");
  const dh = Math.min(h - 0.5, 3.8), z0 = -d / 2 - 0.22;
  box(-p.dw / 2, 0.05, z0, 0, dh + 0.15, z0 + 0.08);
  box(p.dw / 2 - 0.2, 0.05, z0, p.dw + 0.1, dh + 0.15, z0 + 0.08);
  ctx.albedo(null); ctx.color("oklch(0.3 0.01 250)"); box(-p.dw / 2 - 0.2, dh + 0.15, z0 - 0.06, p.dw + 0.3, dh + 0.3, z0); // the rail
  // floor slab
  ctx.albedo(TEX.floor); ctx.color("oklch(0.8 0.02 80)"); box(-w / 2 + t, 0, -d / 2 + t, w / 2 - t, 0.06, d / 2 - t);
}
export function collider(ctx) {
  const p = P(ctx);
  return boxes(p).map(([x0, y0, z0, x1, y1, z1]) => ({ kind: "box", width: x1 - x0, height: y1 - y0, depth: z1 - z0, center: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] }));
}
