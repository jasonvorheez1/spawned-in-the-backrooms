// Level 10 "Bumper Crop": M.E.G. Outpost Bountiful Farmhouse.
// Two-story rural farmstead with wrap-around front porch, pitched gabled roof, brick chimney, and framed windows.
const SIDING = "cdn/texture-weathered-grey-barn-wood-vertical-planks.png";
const ROOF = "cdn/texture-grey-corrugated-asbestos-cement-roof-sheets-lichen.png";
const DECK = "cdn/texture-worn-hardwood-grain.png";
const BRICK = "cdn/texture-weathered-red-brick-barn-wall-english-bond-moss-stains.png";
const DOOR = "cdn/texture-dark-grey-painted-steel-barn-door-weathered.png";

function box(ctx, x0, y0, z0, x1, y1, z1) {
  const q = (a, b, c, d) => ctx.quad(a, b, c, d);
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
  q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}

function cyl(ctx, cx, cz, rings, n) { // a turned post / round piece: rings [[y, r], ...]
  const P = rings.map(([y, r]) => Array.from({ length: n }, (_, j) => { const a = (j / n) * 6.2832; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]; }));
  for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < n; j++) { const k = (j + 1) % n; ctx.quad(P[i][j], P[i][k], P[i + 1][k], P[i + 1][j]); }
}
// a window on a wall facing `face` (-z front, +z back, -x/+x sides) at centre u (along the wall) and sill height y
function windowAt(ctx, face, u, y, w, h, wallOff, lod) {
  const pt = (a, b, d) => face === "-z" ? [a, b, -wallOff - d] : face === "+z" ? [-a, b, wallOff + d] : face === "-x" ? [-wallOff - d, b, -a] : [wallOff + d, b, a];
  const q = (a0, b0, a1, b1, d) => ctx.quad(pt(a0, b0, d), pt(a1, b0, d), pt(a1, b1, d), pt(a0, b1, d));
  const slab = (a0, b0, a1, b1, d0, d1) => { q(a0, b0, a1, b1, d1); ctx.quad(pt(a0, b0, d0), pt(a1, b0, d0), pt(a1, b0, d1), pt(a0, b0, d1)); ctx.quad(pt(a0, b1, d1), pt(a1, b1, d1), pt(a1, b1, d0), pt(a0, b1, d0)); ctx.quad(pt(a0, b0, d1), pt(a0, b1, d1), pt(a0, b1, d0), pt(a0, b0, d0)); ctx.quad(pt(a1, b0, d0), pt(a1, b1, d0), pt(a1, b1, d1), pt(a1, b0, d1)); };
  const a0 = u - w / 2, a1 = u + w / 2, b0 = y, b1 = y + h, f = 0.07;
  ctx.albedo(null); ctx.roughness(0.15); ctx.color("oklch(0.32 0.04 70)"); q(a0, b0, a1, b1, 0.01); // the glass, dim warm from inside
  ctx.roughness(0.8); ctx.color("oklch(0.9 0.015 85)"); // painted trim
  slab(a0 - f, b1, a1 + f, b1 + f, 0, 0.06); slab(a0 - f, b0 - f, a0, b1, 0, 0.06); slab(a1, b0 - f, a1 + f, b1, 0, 0.06);
  slab(a0 - f - 0.05, b0 - f - 0.05, a1 + f + 0.05, b0 - f + 0.02, 0, 0.12); // the sill
  if (lod <= 2) { slab(a0, b0 + h / 2 - 0.02, a1, b0 + h / 2 + 0.02, 0, 0.03); slab(u - 0.02, b0, u + 0.02, b1, 0, 0.03); } // muntins
  ctx.color("oklch(0.38 0.06 150)"); // green shutters, one a little ajar
  slab(a0 - f - w * 0.48, b0 - 0.02, a0 - f - 0.02, b1 + 0.02, 0.02, 0.06); slab(a1 + f + 0.02, b0 - 0.02, a1 + f + w * 0.48, b1 + 0.02, 0.02, 0.08);
  ctx.albedo(SIDING);
}
export function geometry(ctx) {
  try { const __q = ctx.quad.bind(ctx), __t = ctx.tri.bind(ctx); ctx.quad = (...a) => __q(...a.flat()); ctx.tri = (...a) => __t(...a.flat()); } catch (e) {} // __flat: corners as [x,y,z] arrays
  const W = 13.0, D = 8.5, H = 4.8, R = 7.6, t = 0.3;
  const PW = 13.0, PD = 2.8, PH = 0.45; // Porch dimensions
  const SEG = (ctx.lod ?? 1) <= 2 ? 10 : 6;

  // --- Brick Plinth Foundation ---
  ctx.roughness(0.9);
  ctx.albedo(BRICK);
  ctx.color("oklch(0.7 0.05 45)");
  box(ctx, -W / 2 - 0.05, 0, -D / 2 - 0.05, W / 2 + 0.05, 0.45, D / 2 + 0.05);

  // --- Main House Walls (Wood Siding) ---
  ctx.albedo(SIDING);
  ctx.color("oklch(0.85 0.02 85)"); // Weathered farmhouse off-white

  // Back wall (+Z)
  box(ctx, -W / 2, 0.45, D / 2 - t, W / 2, H, D / 2);
  // Left wall (-X)
  box(ctx, -W / 2, 0.45, -D / 2, -W / 2 + t, H, D / 2);
  // Right wall (+X)
  box(ctx, W / 2 - t, 0.45, -D / 2, W / 2, H, D / 2);

  // Front wall (-Z) with open doorway in middle (dw = 2.4, dh = 2.6)
  const dw = 2.4, dh = 2.6;
  box(ctx, -W / 2, 0.45, -D / 2, -dw / 2, H, -D / 2 + t);
  box(ctx, dw / 2, 0.45, -D / 2, W / 2, H, -D / 2 + t);
  box(ctx, -dw / 2, dh, -D / 2, dw / 2, H, -D / 2 + t);

  // Interior floor slab
  ctx.albedo(DECK);
  ctx.color("oklch(0.7 0.04 60)");
  box(ctx, -W / 2 + t, 0.45, -D / 2 + t, W / 2 - t, 0.5, D / 2 - t);

  // Gables on East and West walls
  ctx.albedo(SIDING);
  ctx.color("oklch(0.82 0.02 85)");
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - t / 2);
    ctx.tri([x, H, D / 2], [x, H, -D / 2], [x, R, 0]);
    ctx.tri([x, H, -D / 2], [x, H, D / 2], [x, R, 0]);
  }

  // --- Gabled Roof with Overhangs ---
  ctx.albedo(ROOF);
  ctx.color("oklch(0.68 0.02 240)");
  const o = 0.5, ox = W / 2 + o, oz = D / 2 + o;
  const hy = H - o * (R - H) / (D / 2);
  // South slope
  ctx.quad([-ox, hy, -oz], [ox, hy, -oz], [ox, R + 0.1, 0], [-ox, R + 0.1, 0]);
  ctx.quad([-ox, R + 0.1, 0], [ox, R + 0.1, 0], [ox, hy, -oz], [-ox, hy, -oz]);
  // North slope
  ctx.quad([ox, hy, oz], [-ox, hy, oz], [-ox, R + 0.1, 0], [ox, R + 0.1, 0]);
  ctx.quad([ox, R + 0.1, 0], [-ox, R + 0.1, 0], [-ox, hy, oz], [ox, hy, oz]);

  // --- Brick Chimney on East Wall ---
  ctx.albedo(BRICK);
  ctx.color("oklch(0.65 0.06 40)");
  box(ctx, W / 2 - 0.2, 0, -0.6, W / 2 + 0.9, R + 1.2, 0.6);

  // --- Wrap-Around Front Porch ---
  ctx.albedo(DECK);
  ctx.color("oklch(0.6 0.04 60)");
  const pz0 = -D / 2 - PD, pz1 = -D / 2;
  // Porch deck floor
  box(ctx, -PW / 2, 0, pz0, PW / 2, PH, pz1);

  // Porch roof awning
  ctx.albedo(ROOF);
  ctx.color("oklch(0.7 0.02 240)");
  const porhH = 3.2, porhH0 = 3.6;
  ctx.quad([-PW / 2 - 0.2, porhH, pz0 - 0.2], [PW / 2 + 0.2, porhH, pz0 - 0.2], [PW / 2 + 0.2, porhH0, pz1], [-PW / 2 - 0.2, porhH0, pz1]);
  ctx.quad([-PW / 2 - 0.2, porhH0, pz1], [PW / 2 + 0.2, porhH0, pz1], [PW / 2 + 0.2, porhH, pz0 - 0.2], [-PW / 2 - 0.2, porhH, pz0 - 0.2]);

  // Porch support timber posts
  ctx.albedo(SIDING);
  ctx.color("oklch(0.85 0.02 85)");
  const postX = [-PW / 2 + 0.3, -PW / 2 + 4.1, PW / 2 - 4.1, PW / 2 - 0.3];
  for (const px of postX) cyl(ctx, px, pz0 + 0.23, [[PH, 0.11], [PH + 0.18, 0.11], [PH + 0.22, 0.075], [porhH - 0.35, 0.07], [porhH - 0.25, 0.1], [porhH, 0.1]], SEG);

  // Porch handrail
  ctx.color("oklch(0.8 0.02 85)");
  box(ctx, -PW / 2 + 0.3, PH + 0.85, pz0 + 0.2, -dw / 2, PH + 0.93, pz0 + 0.26);
  box(ctx, dw / 2, PH + 0.85, pz0 + 0.2, PW / 2 - 0.3, PH + 0.93, pz0 + 0.26);

  // Front porch entrance steps (middle, dw width)
  ctx.albedo(DECK);
  ctx.color("oklch(0.55 0.04 60)");
  box(ctx, -dw / 2 - 0.2, 0, pz0 - 0.8, dw / 2 + 0.2, PH * 0.5, pz0);

  // ---- the dressing that makes it a lived-in house ----
  const lod = ctx.lod ?? 1;
  if (lod <= 3) {
    for (const u of [-4.3, -2.5, 2.5, 4.3]) windowAt(ctx, "-z", u, 1.35, 0.9, 1.3, D / 2, lod);
    for (const u of [-3.6, 0, 3.6]) windowAt(ctx, "+z", u, 1.35, 0.9, 1.3, D / 2, lod);
    for (const u of [-2]) { windowAt(ctx, "-x", u, 1.35, 0.9, 1.3, W / 2, lod); }
    windowAt(ctx, "-x", 0, 5.2, 0.7, 0.9, W / 2, lod); windowAt(ctx, "+x", 2.4, 1.35, 0.9, 1.3, W / 2, lod);
    // the front door: a panelled door hung half open in its frame
    ctx.albedo(DECK); ctx.roughness(0.7); ctx.color("oklch(0.42 0.08 35)");
    const dz = -D / 2 - 0.02, hx = -dw / 2 + 0.05;
    box(ctx, hx, PH + 0.05, dz - 0.95, hx + 0.06, dh - 0.05, dz - 0.05);
    ctx.albedo(null); ctx.color("oklch(0.9 0.015 85)");
    box(ctx, -dw / 2 - 0.12, PH, dz - 0.04, -dw / 2, dh + 0.12, dz + 0.02); box(ctx, dw / 2, PH, dz - 0.04, dw / 2 + 0.12, dh + 0.12, dz + 0.02);
    box(ctx, -dw / 2 - 0.12, dh, dz - 0.04, dw / 2 + 0.12, dh + 0.14, dz + 0.02);
    ctx.color("oklch(0.75 0.1 85)"); cyl(ctx, hx + 0.1, dz - 0.82, [[1.4, 0.025], [1.45, 0.025]], 6);
    // porch balusters under the handrail
    ctx.albedo(SIDING); ctx.color("oklch(0.82 0.02 85)");
    for (let x = -PW / 2 + 0.6; x < PW / 2 - 0.3; x += 0.35) if (Math.abs(x) > dw / 2 + 0.05) box(ctx, x - 0.025, PH, pz0 + 0.2, x + 0.025, PH + 0.85, pz0 + 0.25);
    // two steps, not one block
    ctx.albedo(DECK); ctx.color("oklch(0.5 0.04 60)");
    box(ctx, -dw / 2 - 0.2, 0, pz0 - 0.4, dw / 2 + 0.2, PH * 0.5 + 0.02, pz0 - 0.02);
  }
  // roof thickness: fascia boards along the eaves and a ridge cap
  ctx.albedo(null); ctx.roughness(0.8); ctx.color("oklch(0.88 0.015 85)");
  box(ctx, -ox, hy - 0.18, -oz - 0.03, ox, hy + 0.02, -oz + 0.03); box(ctx, -ox, hy - 0.18, oz - 0.03, ox, hy + 0.02, oz + 0.03);
  ctx.albedo(ROOF); ctx.color("oklch(0.5 0.02 240)");
  ctx.quad([-ox, R + 0.1, -0.22], [ox, R + 0.1, -0.22], [ox, R + 0.22, 0], [-ox, R + 0.22, 0]); ctx.quad([-ox, R + 0.22, 0], [ox, R + 0.22, 0], [ox, R + 0.1, 0.22], [-ox, R + 0.1, 0.22]);
  // chimney cap and pot
  ctx.albedo(null); ctx.color("oklch(0.55 0.01 80)");
  box(ctx, W / 2 - 0.3, R + 1.2, -0.7, W / 2 + 1.0, R + 1.32, 0.7);
  ctx.color("oklch(0.5 0.08 40)"); cyl(ctx, W / 2 + 0.35, 0, [[R + 1.32, 0.16], [R + 1.62, 0.13], [R + 1.66, 0.15]], 8);
}


export function collider(ctx) {
  const W = 13.0, D = 8.5, H = 4.8, t = 0.3, dw = 2.4, PD = 2.8, PH = 0.45;
  return [
    // Perimeter house walls
    { kind: "box", width: W, height: H, depth: t, center: [0, H / 2, D / 2 - t / 2] },
    { kind: "box", width: t, height: H, depth: D, center: [-W / 2 + t / 2, H / 2, 0] },
    { kind: "box", width: t, height: H, depth: D, center: [W / 2 - t / 2, H / 2, 0] },
    { kind: "box", width: (W - dw) / 2, height: H, depth: t, center: [-(W + dw) / 4, H / 2, -D / 2 + t / 2] },
    { kind: "box", width: (W - dw) / 2, height: H, depth: t, center: [(W + dw) / 4, H / 2, -D / 2 + t / 2] },
    // Porch floor
    { kind: "box", width: W, height: PH, depth: PD, center: [0, PH / 2, -D / 2 - PD / 2] },
    // Steps
    { kind: "box", width: dw + 0.4, height: PH * 0.5, depth: 0.8, center: [0, PH * 0.25, -D / 2 - PD - 0.4] },
    // Chimney
    { kind: "box", width: 1.1, height: 8.5, depth: 1.2, center: [W / 2 + 0.35, 4.25, 0] },
  ];
}
