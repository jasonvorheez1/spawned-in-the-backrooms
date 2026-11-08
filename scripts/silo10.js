// Level 10 "Bumper Crop": Corrugated galvanized steel grain silo.
// 16-sided cylinder with metal reinforcing hoops, conical dome roof, and side access ladder.
const ROOF = "cdn/texture-grey-corrugated-asbestos-cement-roof-sheets-lichen.png";
const METAL = "cdn/texture-flaking-rusted-sheet-metal-orange-brown.png";

export function geometry(ctx) {
  const R = 3.2, H = 10.5, H_ROOF = 13.0, SIDES = 16;
  const pts = [];
  for (let i = 0; i < SIDES; i++) {
    const a = (i * Math.PI * 2) / SIDES;
    pts.push([R * Math.cos(a), R * Math.sin(a)]);
  }

  ctx.roughness(0.65);
  ctx.metalness(0.7);
  ctx.albedo(ROOF);
  ctx.color("oklch(0.75 0.02 240)");

  // 16 cylinder wall facets
  for (let i = 0; i < SIDES; i++) {
    const next = (i + 1) % SIDES;
    const p0 = pts[i], p1 = pts[next];
    ctx.quad([p0[0], 0, p0[1]], [p1[0], 0, p1[1]], [p1[0], H, p1[1]], [p0[0], H, p0[1]]);
    ctx.quad([p1[0], 0, p1[1]], [p0[0], 0, p0[1]], [p0[0], H, p0[1]], [p1[0], H, p1[1]]);
  }

  // Steel reinforcing hoops around the silo every 2.5m
  ctx.albedo(null);
  ctx.color("oklch(0.45 0.02 250)");
  for (const y of [2.5, 5.0, 7.5, 10.0]) {
    for (let i = 0; i < SIDES; i++) {
      const next = (i + 1) % SIDES;
      const p0 = pts[i], p1 = pts[next];
      const r_out = 1.02;
      ctx.quad([p0[0] * r_out, y - 0.06, p0[1] * r_out], [p1[0] * r_out, y - 0.06, p1[1] * r_out], [p1[0] * r_out, y + 0.06, p1[1] * r_out], [p0[0] * r_out, y + 0.06, p0[1] * r_out]);
    }
  }

  // Conical metal roof
  ctx.albedo(ROOF);
  ctx.color("oklch(0.7 0.02 240)");
  const peak = [0, H_ROOF, 0];
  const eR = R + 0.25;
  for (let i = 0; i < SIDES; i++) {
    const next = (i + 1) % SIDES;
    const p0 = pts[i], p1 = pts[next];
    ctx.tri([p0[0] * (eR / R), H, p0[1] * (eR / R)], [p1[0] * (eR / R), H, p1[1] * (eR / R)], peak);
    ctx.tri([p1[0] * (eR / R), H, p1[1] * (eR / R)], [p0[0] * (eR / R), H, p0[1] * (eR / R)], peak);
  }

  // Exterior vertical access ladder on south side (+Z)
  const lz = R + 0.15;
  ctx.albedo(null);
  ctx.color("oklch(0.35 0.01 250)");
  // Side rails
  for (const lx of [-0.25, 0.25]) {
    ctx.quad([lx - 0.02, 0.4, lz], [lx + 0.02, 0.4, lz], [lx + 0.02, H + 0.6, lz], [lx - 0.02, H + 0.6, lz]);
    ctx.quad([lx + 0.02, 0.4, lz], [lx - 0.02, 0.4, lz], [lx - 0.02, H + 0.6, lz], [lx + 0.02, H + 0.6, lz]);
  }
  // Rungs every 0.35m
  for (let y = 0.6; y <= H + 0.4; y += 0.35) {
    ctx.quad([-0.25, y - 0.015, lz], [0.25, y - 0.015, lz], [0.25, y + 0.015, lz], [-0.25, y + 0.015, lz]);
    ctx.quad([0.25, y - 0.015, lz], [-0.25, y - 0.015, lz], [-0.25, y + 0.015, lz], [0.25, y + 0.015, lz]);
  }

  // Discharge hopper funnel & chute at the front
  ctx.albedo(METAL);
  ctx.color("oklch(0.55 0.06 50)");
  const hz = -R - 0.3;
  ctx.quad([-0.4, 0.2, hz], [0.4, 0.2, hz], [0.4, 1.2, -R], [-0.4, 1.2, -R]);
  ctx.quad([0.4, 0.2, hz], [-0.4, 0.2, hz], [-0.4, 1.2, -R], [0.4, 1.2, -R]);
}

export function collider(ctx) {
  return [
    { kind: "cylinder", radiusTop: 3.2, radiusBottom: 3.2, height: 10.5, center: [0, 5.25, 0] },
    { kind: "box", width: 6.4, height: 10.5, depth: 6.4, center: [0, 5.25, 0] },
  ];
}
