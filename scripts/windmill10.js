// Level 10 "Bumper Crop": Historic octagonal wooden windmill tower.
// 8-sided tapered tower with weathered wood siding, walkway balcony, conical roof, and 4 lattice sail blades.
const WOOD = "cdn/texture-weathered-grey-barn-wood-vertical-planks.png";
const ROOF = "cdn/texture-grey-corrugated-asbestos-cement-roof-sheets-lichen.png";
const HARDWOOD = "cdn/texture-worn-hardwood-grain.png";
const CANVAS = "cdn/texture-rough-canvas-fabric.png";

function octPoints(r, y) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    pts.push([r * Math.cos(a), y, r * Math.sin(a)]);
  }
  return pts;
}

export function geometry(ctx) {
  try { const __q = ctx.quad.bind(ctx), __t = ctx.tri.bind(ctx); ctx.quad = (...a) => __q(...a.flat()); ctx.tri = (...a) => __t(...a.flat()); } catch (e) {} // __flat: corners as [x,y,z] arrays
  const R_BASE = 3.2, R_MID = 2.6, R_TOP = 2.0;
  const H_BALC = 5.8, H_TOP = 11.5, H_ROOF = 14.2;

  const bot = octPoints(R_BASE, 0);
  const mid = octPoints(R_MID, H_BALC);
  const top = octPoints(R_TOP, H_TOP);

  ctx.roughness(0.9);
  ctx.albedo(WOOD);
  ctx.color("oklch(0.72 0.03 80)");

  // Lower tower walls (except front door at index 6-7 which is front -Z)
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    if (i === 6) {
      // Doorway cut on front wall
      const dw = 1.2, dh = 2.4;
      const b0 = bot[i], b1 = bot[next], m0 = mid[i], m1 = mid[next];
      // Side pillars
      ctx.quad(b0, [b0[0] * 0.7 + b1[0] * 0.3, 0, b0[2] * 0.7 + b1[2] * 0.3], [m0[0] * 0.7 + m1[0] * 0.3, H_BALC, m0[2] * 0.7 + m1[2] * 0.3], m0);
      ctx.quad([b0[0] * 0.3 + b1[0] * 0.7, 0, b0[2] * 0.3 + b1[2] * 0.7], b1, m1, [m0[0] * 0.3 + m1[0] * 0.7, H_BALC, m0[2] * 0.3 + m1[2] * 0.7]);
      // Lintle above door
      ctx.quad([b0[0] * 0.7 + b1[0] * 0.3, dh, b0[2] * 0.7 + b1[2] * 0.3], [b0[0] * 0.3 + b1[0] * 0.7, dh, b0[2] * 0.3 + b1[2] * 0.7], [m0[0] * 0.3 + m1[0] * 0.7, H_BALC, m0[2] * 0.3 + m1[2] * 0.7], [m0[0] * 0.7 + m1[0] * 0.3, H_BALC, m0[2] * 0.7 + m1[2] * 0.3]);
    } else {
      ctx.quad(bot[i], bot[next], mid[next], mid[i]);
      ctx.quad(bot[next], bot[i], mid[i], mid[next]);
    }
  }

  // Upper tower walls
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    ctx.quad(mid[i], mid[next], top[next], top[i]);
    ctx.quad(mid[next], mid[i], top[i], top[next]);
  }

  // Balcony walkway at H_BALC
  ctx.albedo(HARDWOOD);
  ctx.color("oklch(0.55 0.04 60)");
  const balcIn = octPoints(R_MID - 0.1, H_BALC);
  const balcOut = octPoints(R_MID + 1.1, H_BALC);
  const railTop = octPoints(R_MID + 1.05, H_BALC + 1.0);
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    // Deck floor
    ctx.quad(balcIn[i], balcOut[i], balcOut[next], balcIn[next]);
    ctx.quad(balcIn[next], balcOut[next], balcOut[i], balcIn[i]);
    // Railing
    ctx.quad(balcOut[i], balcOut[next], railTop[next], railTop[i]);
    ctx.quad(balcOut[next], balcOut[i], railTop[i], railTop[next]);
  }

  // Conical shingled roof cap
  ctx.albedo(ROOF);
  ctx.color("oklch(0.68 0.02 240)");
  const roofEaves = octPoints(R_TOP + 0.45, H_TOP);
  const peak = [0, H_ROOF, 0];
  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8;
    ctx.tri(roofEaves[i], roofEaves[next], peak);
    ctx.tri(roofEaves[next], roofEaves[i], peak);
  }

  // Central hub / windshaft facing -Z
  ctx.albedo(null);
  ctx.color("oklch(0.4 0.02 50)");
  const hubZ = -R_TOP - 0.7;
  const hubY = H_TOP + 0.9;
  // Axle box
  ctx.quad([-0.3, hubY - 0.3, hubZ], [0.3, hubY - 0.3, hubZ], [0.3, hubY + 0.3, hubZ], [-0.3, hubY + 0.3, hubZ]);
  ctx.quad([0.3, hubY - 0.3, hubZ], [-0.3, hubY - 0.3, hubZ], [-0.3, hubY + 0.3, hubZ], [0.3, hubY + 0.3, hubZ]);

  // 4 Windmill Sail Blades
  const BLADE_LEN = 5.2, BLADE_W = 1.1;
  for (let b = 0; b < 4; b++) {
    const ang = (b * Math.PI) / 2 + Math.PI / 4;
    const cos = Math.cos(ang), sin = Math.sin(ang);
    // Spar line
    const xEnd = cos * BLADE_LEN;
    const yEnd = hubY + sin * BLADE_LEN;
    // Wooden spar beam
    ctx.albedo(HARDWOOD);
    ctx.color("oklch(0.5 0.05 60)");
    const nx = -sin * 0.08, ny = cos * 0.08;
    ctx.quad([0 - nx, hubY - ny, hubZ - 0.05], [xEnd - nx, yEnd - ny, hubZ - 0.05], [xEnd + nx, yEnd + ny, hubZ - 0.05], [0 + nx, hubY + ny, hubZ - 0.05]);

    // Canvas sail cloth on one side of spar
    ctx.albedo(CANVAS);
    ctx.color("oklch(0.85 0.04 80)");
    const cw = BLADE_W;
    const cx = -sin * cw, cy = cos * cw;
    const x0 = cos * 1.0, y0 = hubY + sin * 1.0;
    ctx.quad([x0, y0, hubZ], [xEnd, yEnd, hubZ], [xEnd + cx, yEnd + cy, hubZ], [x0 + cx * 0.7, y0 + cy * 0.7, hubZ]);
    ctx.quad([x0 + cx * 0.7, y0 + cy * 0.7, hubZ], [xEnd + cx, yEnd + cy, hubZ], [xEnd, yEnd, hubZ], [x0, y0, hubZ]);
  }
}

export function collider(ctx) {
  // Octagonal base bounding colliders
  return [
    { kind: "box", width: 5.6, height: 12, depth: 5.6, center: [0, 6, 0] },
    { kind: "box", width: 2.5, height: 3.5, depth: 2.5, center: [0, 13, 0] },
  ];
}
