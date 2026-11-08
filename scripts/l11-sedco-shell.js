// Sedco Spotlight's walls as one building: params { w (X), d (Z), h, t, door } in metres, storefront on -X
// (piers 1.1 m at each end, a header from 2.9 m, low sills either side of the door gap). Brick body with corner pilasters,
// a dark stone base, a corbelled brick cornice and a stone coping. Collider: the walls only, so the shop stays walkable.
const BRICK = "cdn/texture-weathered-red-brick-barn-wall-english-bond-moss-stains.png", STONE = "cdn/texture-weathered-grey-granite-ashlar-blocks.png";
const P = (c) => ({ w: c.params.w ?? 10, d: c.params.d ?? 8, h: c.params.h ?? 4.4, t: c.params.t ?? 0.3, door: c.params.door ?? 1.6 });
function walls(p) {
  const { w, d, h, t, door } = p, X0 = -w / 2, X1 = w / 2, Z0 = -d / 2, Z1 = d / 2, sill = (d - door) / 2 - 1.1;
  return [
    [X1 - t, 0, Z0, X1, h, Z1], [X0, 0, Z0, X1, h, Z0 + t], [X0, 0, Z1 - t, X1, h, Z1], // back, north, south
    [X0, 0, Z0, X0 + t, h, Z0 + 1.1], [X0, 0, Z1 - 1.1, X0 + t, h, Z1], // piers
    [X0, 2.9, Z0, X0 + t, h, Z1], // header over the glass
    [X0, 0, Z0 + 1.1, X0 + t, 0.3, Z0 + 1.1 + sill], [X0, 0, Z1 - 1.1 - sill, X0 + t, 0.3, Z1 - 1.1], // sills
  ];
}
function boxer(ctx) {
  const q = (a, b, c, e) => ctx.quad(...a, ...b, ...c, ...e);
  return (x0, y0, z0, x1, y1, z1) => {
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  };
}
export function geometry(ctx) {
  const p = P(ctx), box = boxer(ctx), lod = ctx.lod ?? 1, { w, d, h } = p, X0 = -w / 2, X1 = w / 2, Z0 = -d / 2, Z1 = d / 2;
  ctx.albedo(BRICK); ctx.color("oklch(0.74 0.05 40)");
  for (const b of walls(p)) box(...b);
  // stone base course on the outside faces
  ctx.albedo(STONE); ctx.color("oklch(0.55 0.01 70)"); const o = 0.06;
  box(X1, 0, Z0 - o, X1 + o, 0.55, Z1 + o); box(X0 - o, 0, Z0 - o, X1 + o, 0.55, Z0); box(X0 - o, 0, Z1, X1 + o, 0.55, Z1 + o);
  box(X0 - o, 0, Z0 - o, X0, 0.55, Z0 + 1.1); box(X0 - o, 0, Z1 - 1.1, X0, 0.55, Z1 + o);
  // corner pilasters, proud of the brick
  ctx.albedo(BRICK); ctx.color("oklch(0.66 0.06 38)"); const pw = 0.5, pp = 0.12;
  for (const [x, z, sx, sz] of [[X0, Z0, -1, -1], [X0, Z1, -1, 1], [X1, Z0, 1, -1], [X1, Z1, 1, 1]]) {
    box(Math.min(x, x + sx * pp) - (sx < 0 ? 0 : pw - pp), 0.55, Math.min(z, z + sz * pp) - (sz < 0 ? 0 : pw - pp), Math.max(x, x + sx * pp) + (sx < 0 ? pw - pp : 0), h - 0.5, Math.max(z, z + sz * pp) + (sz < 0 ? pw - pp : 0));
  }
  // corbelled cornice: two stepped brick courses, then stone coping
  for (const [y0, y1, e] of [[h - 0.5, h - 0.35, 0.08], [h - 0.35, h - 0.2, 0.16]]) {
    box(X0 - e, y0, Z0 - e, X1 + e, y1, Z0); box(X0 - e, y0, Z1, X1 + e, y1, Z1 + e); box(X1, y0, Z0 - e, X1 + e, y1, Z1 + e); box(X0 - e, y0, Z0 - e, X0, y1, Z1 + e);
  }
  ctx.albedo(STONE); ctx.color("oklch(0.7 0.01 80)"); box(X0 - 0.22, h - 0.2, Z0 - 0.22, X1 + 0.22, h + 0.05, Z1 + 0.22);
  if (lod >= 4) return;
  // the glass line's black anodised frame head and a downspout at the back
  ctx.albedo(null); ctx.color("oklch(0.2 0.01 250)"); box(X0 - 0.05, 2.82, Z0 + 1.1, X0 + 0.02, 2.9, Z1 - 1.1);
  ctx.color("oklch(0.45 0.02 90)"); box(X1 + 0.02, 0.1, Z1 - 0.7, X1 + 0.14, h - 0.2, Z1 - 0.58);
}
export function collider(ctx) {
  return walls(P(ctx)).map(([x0, y0, z0, x1, y1, z1]) => ({ kind: "box", width: x1 - x0, height: y1 - y0, depth: z1 - z0, center: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] }));
}
