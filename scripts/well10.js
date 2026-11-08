// Level 10 "Bumper Crop": Stone water well and aquifer pump.
// Round masonry stone well with timber gabled roof, winch crank, and rope bucket.
const BRICK = "cdn/texture-weathered-red-brick-barn-wall-english-bond-moss-stains.png";
const WOOD = "cdn/texture-weathered-grey-barn-wood-vertical-planks.png";
const ROOF = "cdn/texture-grey-corrugated-asbestos-cement-roof-sheets-lichen.png";
const HARDWOOD = "cdn/texture-worn-hardwood-grain.png";

export function geometry(ctx) {
  try { const __q = ctx.quad.bind(ctx), __t = ctx.tri.bind(ctx); ctx.quad = (...a) => __q(...a.flat()); ctx.tri = (...a) => __t(...a.flat()); } catch (e) {} // __flat: corners as [x,y,z] arrays
  const R_OUT = 0.95, R_IN = 0.72, H_WELL = 0.85, SIDES = 12;
  const ptsOut = [], ptsIn = [];
  for (let i = 0; i < SIDES; i++) {
    const a = (i * Math.PI * 2) / SIDES;
    ptsOut.push([R_OUT * Math.cos(a), R_OUT * Math.sin(a)]);
    ptsIn.push([R_IN * Math.cos(a), R_IN * Math.sin(a)]);
  }

  // Stone well wall
  ctx.roughness(0.9);
  ctx.albedo(BRICK);
  ctx.color("oklch(0.68 0.05 45)");
  for (let i = 0; i < SIDES; i++) {
    const next = (i + 1) % SIDES;
    const o0 = ptsOut[i], o1 = ptsOut[next];
    const n0 = ptsIn[i], n1 = ptsIn[next];
    // Outer wall
    ctx.quad([o0[0], 0, o0[1]], [o1[0], 0, o1[1]], [o1[0], H_WELL, o1[1]], [o0[0], H_WELL, o0[1]]);
    // Inner wall
    ctx.quad([n1[0], 0, n1[1]], [n0[0], 0, n0[1]], [n0[0], H_WELL, n0[1]], [n1[0], H_WELL, n1[1]]);
    // Top rim
    ctx.quad([n0[0], H_WELL, n0[1]], [n1[0], H_WELL, n1[1]], [o1[0], H_WELL, o1[1]], [o0[0], H_WELL, o0[1]]);
  }

  // Deep water inside well
  ctx.albedo(null);
  ctx.color("oklch(0.55 0.1 230)");
  for (let i = 0; i < SIDES; i++) {
    const next = (i + 1) % SIDES;
    ctx.tri([0, 0.2, 0], [ptsIn[i][0], 0.2, ptsIn[i][1]], [ptsIn[next][0], 0.2, ptsIn[next][1]]);
  }

  // Two timber roof support pillars (-X and +X)
  ctx.albedo(HARDWOOD);
  ctx.color("oklch(0.5 0.04 60)");
  const H_ROOF = 2.4, H_PEAK = 2.9;
  for (const s of [-1, 1]) {
    const x = s * 0.85;
    ctx.quad([x - 0.06, H_WELL, -0.06], [x + 0.06, H_WELL, -0.06], [x + 0.06, H_ROOF, -0.06], [x - 0.06, H_ROOF, -0.06]);
    ctx.quad([x + 0.06, H_WELL, 0.06], [x - 0.06, H_WELL, 0.06], [x - 0.06, H_ROOF, 0.06], [x + 0.06, H_ROOF, 0.06]);
    ctx.quad([x + 0.06, H_WELL, -0.06], [x + 0.06, H_WELL, 0.06], [x + 0.06, H_ROOF, 0.06], [x + 0.06, H_ROOF, -0.06]);
    ctx.quad([x - 0.06, H_WELL, 0.06], [x - 0.06, H_WELL, -0.06], [x - 0.06, H_ROOF, -0.06], [x - 0.06, H_ROOF, 0.06]);
  }

  // Winch axle and drum at y = 1.45
  ctx.albedo(HARDWOOD);
  ctx.color("oklch(0.4 0.04 50)");
  ctx.quad([-0.8, 1.4, -0.05], [0.8, 1.4, -0.05], [0.8, 1.5, -0.05], [-0.8, 1.5, -0.05]);
  // Crank handle (+X)
  ctx.albedo(null);
  ctx.color("oklch(0.3 0.01 250)");
  ctx.quad([0.85, 1.35, -0.02], [0.95, 1.35, -0.02], [0.95, 1.6, -0.02], [0.85, 1.6, -0.02]);

  // Wooden gabled roof canopy
  ctx.albedo(ROOF);
  ctx.color("oklch(0.7 0.02 240)");
  const rw = 1.15, rd = 1.1;
  // South roof slope (-Z)
  ctx.quad([-rw, H_ROOF, -rd], [rw, H_ROOF, -rd], [rw, H_PEAK, 0], [-rw, H_PEAK, 0]);
  ctx.quad([-rw, H_PEAK, 0], [rw, H_PEAK, 0], [rw, H_ROOF, -rd], [-rw, H_ROOF, -rd]);
  // North roof slope (+Z)
  ctx.quad([rw, H_ROOF, rd], [-rw, H_ROOF, rd], [-rw, H_PEAK, 0], [rw, H_PEAK, 0]);
  ctx.quad([rw, H_PEAK, 0], [-rw, H_PEAK, 0], [-rw, H_ROOF, rd], [rw, H_ROOF, rd]);
  // Gable triangles
  ctx.albedo(WOOD);
  ctx.color("oklch(0.6 0.03 70)");
  for (const s of [-1, 1]) {
    const x = s * rw;
    ctx.tri([x, H_ROOF, -rd], [x, H_ROOF, rd], [x, H_PEAK, 0]);
    ctx.tri([x, H_ROOF, rd], [x, H_ROOF, -rd], [x, H_PEAK, 0]);
  }
}

export function collider(ctx) {
  return [
    { kind: "cylinder", radiusTop: 0.95, radiusBottom: 0.95, height: 0.85, center: [0, 0.425, 0] },
    { kind: "box", width: 1.9, height: 2.9, depth: 1.9, center: [0, 1.45, 0] },
  ];
}
