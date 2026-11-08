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
const P = (c) => { const p = { w: c.params.w ?? 18, d: c.params.d ?? 9, h: c.params.h ?? 4.6, R: c.params.ridge ?? 8.4, wall: c.params.wall ?? "brick", dw: c.params.door ?? 4.2, t: 0.32 };
  p.porch = p.wall === "brick" && p.w >= 10; // the reference barn: a projecting cart porch (midstrey) round the big doors, its own gable
  p.pw = p.dw + 1.6; p.pd = p.porch ? Math.min(2.4, p.d * 0.3) : 0; p.zf = -p.d / 2 - p.pd; // front face the doors hang on
  return p; };
function boxes(p) {
  const { w, d, h, dw, t, pw, zf } = p, dh = Math.min(h - 0.5, 3.8);
  const back = [[-w / 2, 0, d / 2 - t, w / 2, h, d / 2], [-w / 2, 0, -d / 2, -w / 2 + t, h, d / 2], [w / 2 - t, 0, -d / 2, w / 2, h, d / 2]];
  if (!p.porch) return [[-w / 2, 0, -d / 2, -dw / 2, h, -d / 2 + t], [dw / 2, 0, -d / 2, w / 2, h, -d / 2 + t], [-dw / 2, dh, -d / 2, dw / 2, h, -d / 2 + t], ...back];
  return [
    [-w / 2, 0, -d / 2, -pw / 2, h, -d / 2 + t], [pw / 2, 0, -d / 2, w / 2, h, -d / 2 + t], // main front either side of the porch
    [-pw / 2, 0, zf, -pw / 2 + t, h, -d / 2 + t], [pw / 2 - t, 0, zf, pw / 2, h, -d / 2 + t], // porch side walls
    [-pw / 2 + t, 0, zf, -dw / 2, h, zf + t], [dw / 2, 0, zf, pw / 2 - t, h, zf + t], [-dw / 2, dh, zf, dw / 2, h, zf + t], // porch front round the doorway
    ...back];
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
  if ((ctx.lod ?? 1) >= 4) { // far away: a walled shell and a roof, the same silhouette in a few dozen faces
    ctx.albedo(TEX[p.wall]); ctx.color(p.wall === "brick" ? "oklch(0.78 0.04 45)" : "oklch(0.8 0.01 70)");
    box(-w / 2, 0, -d / 2, w / 2, h, d / 2);
    for (const z of [-d / 2, d / 2]) both([w / 2, h, z], [-w / 2, h, z], [0, R, z]);
    ctx.albedo(null); ctx.color("oklch(0.4 0.02 240)");
    const o = 0.4; both([-w / 2 - o, h - 0.2, -d / 2 - o], [-w / 2 - o, h - 0.2, d / 2 + o], [0, R + 0.05, d / 2 + o]); both([-w / 2 - o, h - 0.2, -d / 2 - o], [0, R + 0.05, d / 2 + o], [0, R + 0.05, -d / 2 - o]);
    both([w / 2 + o, h - 0.2, -d / 2 - o], [0, R + 0.05, d / 2 + o], [w / 2 + o, h - 0.2, d / 2 + o]); both([w / 2 + o, h - 0.2, -d / 2 - o], [0, R + 0.05, -d / 2 - o], [0, R + 0.05, d / 2 + o]);
    return;
  }
  ctx.albedo(TEX[p.wall]); ctx.color(p.wall === "brick" ? "oklch(0.78 0.04 45)" : "oklch(0.8 0.01 70)");
  for (const b of boxes(p)) box(...b);
  // gables, both faces, on the front and back walls
  for (const z of [-d / 2 + t / 2, d / 2 - t / 2]) { both([w / 2, h, z], [-w / 2, h, z], [0, R, z]); }
  const pitch = (R - h) / (w / 2);
  if (p.porch) { // the porch's own gable and pitched roof, running back into the main slope
    const Rp = h + (p.pw / 2) * pitch, zf = p.zf;
    both([p.pw / 2, h, zf + t / 2], [-p.pw / 2, h, zf + t / 2], [0, Rp, zf + t / 2]);
    // brick piers on the porch corners
    box(-p.pw / 2 - 0.14, 0, zf - 0.14, -p.pw / 2 + 0.38, h, zf + 0.38); box(p.pw / 2 - 0.38, 0, zf - 0.14, p.pw / 2 + 0.14, h, zf + 0.38);
  }
  // brick piers along the long walls every ~3.2 m, and at the corners
  const n = Math.max(2, Math.round(w / 3.2));
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (w * i) / n, x0 = Math.max(-w / 2 - 0.14, x - 0.26), x1 = Math.min(w / 2 + 0.14, x + 0.26);
    box(x0, 0, d / 2 - 0.02, x1, h - 0.05, d / 2 + 0.14);
    if (!p.porch || Math.abs(x) > p.pw / 2 + 0.3) box(x0, 0, -d / 2 - 0.14, x1, h - 0.05, -d / 2 + 0.02);
  }
  for (const sx of [-1, 1]) box(sx > 0 ? w / 2 - 0.02 : -w / 2 - 0.14, 0, -d / 2 - 0.14, sx > 0 ? w / 2 + 0.14 : w / -2 + 0.02, h - 0.05, d / 2 + 0.14);
  // ventilation slits: tall dark gaps in the brick, between the piers (the reference's barn walls have them)
  ctx.albedo(null); ctx.color("oklch(0.12 0.01 40)");
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / n;
    for (let k = -1; k <= 1; k += 2) { const vx = x + k * 0.35; box(vx - 0.05, h * 0.45, d / 2 + 0.005, vx + 0.05, h * 0.75, d / 2 + 0.02); if (!p.porch || Math.abs(vx) > p.pw / 2 + 0.3) box(vx - 0.05, h * 0.45, -d / 2 - 0.02, vx + 0.05, h * 0.75, -d / 2 - 0.005); }
  }
  ctx.albedo(TEX[p.wall]); ctx.color(p.wall === "brick" ? "oklch(0.78 0.04 45)" : "oklch(0.8 0.01 70)");
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
  if (p.porch) {
    const pw2 = p.pw / 2 + o, Rp = h + (p.pw / 2) * pitch, zf = p.zf - o, zb = -d / 2 + (Rp - h) / pitch * 0.9, phy = h - o * pitch;
    ctx.color("oklch(0.72 0.01 240)");
    slope([-pw2, phy, zf], [-pw2, phy, zb], [0, Rp + 0.08, zb], [0, Rp + 0.08, zf]);
    slope([pw2, phy, zb], [pw2, phy, zf], [0, Rp + 0.08, zf], [0, Rp + 0.08, zb]);
    ctx.color("oklch(0.55 0.01 240)"); box(-0.16, Rp, zf, 0.16, Rp + 0.18, zb);
  }
  // gutters along both eaves and a downpipe at each corner, rust-streaked cast iron
  ctx.albedo(null); ctx.color("oklch(0.28 0.02 40)"); ctx.roughness?.(0.6);
  for (const sx of [-1, 1]) {
    box(sx * W - 0.09, hy - 0.16, -D, sx * W + 0.09, hy - 0.02, D);
    for (const sz of [-1, 1]) box(sx * (w / 2 + 0.02) - 0.05, 0.15, sz * (d / 2 - 0.3) - 0.05, sx * (w / 2 + 0.02) + 0.05 + (sx > 0 ? 0.08 : -0.08) * 0, hy - 0.1, sz * (d / 2 - 0.3) + 0.05);
  }
  // fascia boards under the verges on the gables
  ctx.color("oklch(0.34 0.02 60)");
  // sliding doors: one shut across the left half, one pulled open past the right jamb
  ctx.albedo(TEX.door); ctx.color("oklch(0.62 0.02 250)");
  const dh = Math.min(h - 0.5, 3.8), z0 = p.zf - 0.22;
  box(-p.dw / 2, 0.05, z0, 0, dh + 0.15, z0 + 0.08);
  box(p.dw / 2 - 0.2, 0.05, z0, p.dw + 0.1, dh + 0.15, z0 + 0.08);
  // battens and a Z brace on each leaf, so they read as built doors, not slabs
  ctx.color("oklch(0.5 0.02 250)");
  for (const [a, b] of [[-p.dw / 2, 0], [p.dw / 2 - 0.2, p.dw + 0.1]]) {
    for (const y of [0.35, dh / 2, dh - 0.2]) box(a + 0.05, y - 0.09, z0 - 0.05, b - 0.05, y + 0.09, z0);
    const steps = 10; for (let k = 0; k < steps; k++) { const u = (k + 0.5) / steps, x = a + 0.1 + (b - a - 0.2) * u, y = 0.35 + (dh / 2 - 0.35) * u; box(x - 0.09, y - 0.08, z0 - 0.045, x + 0.09, y + 0.08, z0); }
  }
  ctx.albedo(null); ctx.color("oklch(0.3 0.01 250)"); box(-p.dw / 2 - 0.2, dh + 0.15, z0 - 0.06, p.dw + 0.3, dh + 0.3, z0); // the rail
  ctx.color("oklch(0.36 0.03 60)"); box(-p.dw / 2 - 0.12, dh, p.zf - 0.02, p.dw / 2 + 0.12, dh + 0.14, p.zf + 0.03); // the timber lintel
  // floor slab
  ctx.albedo(TEX.floor); ctx.color("oklch(0.8 0.02 80)"); box(-w / 2 + t, 0, -d / 2 + t, w / 2 - t, 0.06, d / 2 - t);
  if (p.porch) box(-p.pw / 2 + t, 0, p.zf + t, p.pw / 2 - t, 0.06, -d / 2 + t);
}
export function collider(ctx) {
  const p = P(ctx);
  return boxes(p).map(([x0, y0, z0, x1, y1, z1]) => ({ kind: "box", width: x1 - x0, height: y1 - y0, depth: z1 - z0, center: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] }));
}
