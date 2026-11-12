// Level 0.2's shifting partition (scripts/lib/l02-grid.js): a half-framed 2x4 wall, studs every 0.4 m, OSB on part of one face,
// a rough doorway (king studs, doubled header, cripples) wherever params.door says. Local X runs along the wall, Z through it.
// params: { len, h, door: centre offset in m or null, sheath: [side, from, to], seed }
const STUD = "cdn/texture-planed-pine-2x4-lumber-grain.png", OSB = "cdn/texture-osb-plywood-subfloor-sheet.png";
const T = 0.045, SW = 0.04, DW = 0.55, DH = 2.12; // half depth of a 2x4, stud width, half door width, door head (Savi's picks)
function cube(ctx, x0, x1, y0, y1, z0, z1) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const f = (px, py, pz, ux, uy, uz, vx, vy, vz) => ctx.quad(px, py, pz, px + ux, py + uy, pz + uz, px + ux + vx, py + uy + vy, pz + uz + vz, px + vx, py + vy, pz + vz);
  f(x1, y0, z1, 0, 0, -dz, 0, dy, 0); f(x0, y0, z0, 0, 0, dz, 0, dy, 0);
  f(x0, y1, z1, dx, 0, 0, 0, 0, -dz); f(x0, y0, z0, dx, 0, 0, 0, 0, dz);
  f(x0, y0, z1, dx, 0, 0, 0, dy, 0); f(x1, y0, z0, -dx, 0, 0, 0, dy, 0);
}
const gapOf = (p) => (p.door == null ? null : [p.door - DW, p.door + DW]);
export function geometry(ctx) {
  const p = ctx.params, L = p.len ?? 4, H = p.h ?? 3.3, a = -L / 2, gap = gapOf(p);
  const inGap = (x0, x1) => gap && x1 > gap[0] - 0.005 && x0 < gap[1] + 0.005;
  ctx.albedo(STUD); ctx.color("oklch(0.93 0.04 80)"); ctx.roughness(0.85);
  // plates: bottom (cut at the door), doubled top
  if (gap) { cube(ctx, a, gap[0], 0, 0.04, -T, T); cube(ctx, gap[1], -a, 0, 0.04, -T, T); } else cube(ctx, a, -a, 0, 0.04, -T, T);
  cube(ctx, a, -a, H - 0.08, H - 0.04, -T, T);
  if (ctx.lod <= 2) cube(ctx, a, -a, H - 0.04, H, -T, T);
  // studs every 0.4 m, both ends; the doorway's kings, jacks, header and cripples
  const xs = []; for (let x = a; x < -a - 0.02; x += 0.4) xs.push(x); xs.push(-a - SW);
  for (const x of xs) {
    if (inGap(x, x + SW)) { if (ctx.lod <= 2) cube(ctx, x, x + SW, DH + 0.2, H - 0.08, -T, T); continue; }
    cube(ctx, x, x + SW, 0.04, H - 0.08, -T, T);
  }
  if (gap) {
    for (const [k, s] of [[gap[0] - SW, 1], [gap[1], -1]]) { cube(ctx, k, k + SW, 0.04, H - 0.08, -T, T); if (ctx.lod <= 2) cube(ctx, k + s * SW, k + s * SW + SW, 0.04, DH, -T, T); }
    cube(ctx, gap[0] - SW, gap[1] + SW, DH, DH + 0.2, -T, T);
  }
  if (ctx.lod <= 1) for (let x = a + 0.2; x < -a - 0.2; x += 0.8) if (!inGap(x - 0.2, x + 0.2)) cube(ctx, x - 0.18, x + 0.18, 1.18, 1.22, -T, T); // fire blocking, staggered
  // OSB sheets on one face: 1.22 m sheets, a hair apart, cut around the doorway
  const [side, from, to] = p.sheath ?? [0, 0, 0];
  if (side && to > from) {
    ctx.albedo(OSB); ctx.color("oklch(0.9 0.05 75)"); ctx.roughness(0.92);
    const z0 = side > 0 ? T : -T - 0.012, z1 = z0 + 0.012, s0 = a + L * from, s1 = a + L * to;
    for (let x = s0; x < s1 - 0.05; x += 1.22) {
      const x1 = Math.min(s1, x + 1.215);
      for (const [y0, y1] of [[0.02, 2.44], [2.445, H - 0.02]]) {
        if (gap && x1 > gap[0] && x < gap[1]) {
          if (x < gap[0]) cube(ctx, x, gap[0], y0, y1, z0, z1);
          if (x1 > gap[1]) cube(ctx, gap[1], x1, y0, y1, z0, z1);
          if (y1 > DH + 0.2) cube(ctx, Math.max(x, gap[0]), Math.min(x1, gap[1]), Math.max(y0, DH + 0.2), y1, z0, z1);
        } else cube(ctx, x, x1, y0, y1, z0, z1);
      }
    }
    if (ctx.lod <= 1) { ctx.albedo(null); ctx.color("oklch(0.32 0.03 60)"); // the crew's pencil marks along the stud lines
      for (const x of xs) if (x > s0 && x < s1 && !inGap(x, x + SW)) cube(ctx, x + 0.015, x + 0.025, 0.3, H - 0.3, side > 0 ? z1 : z0 - 0.001, side > 0 ? z1 + 0.001 : z0); }
  }
  return { uvProjection: "box" };
}
export function collider(ctx) {
  const p = ctx.params, L = p.len ?? 4, H = p.h ?? 3.3, a = -L / 2, gap = gapOf(p), d = 2 * T + 0.03;
  const seg = (x0, x1, y0 = 0, y1 = H) => ({ kind: "box", width: x1 - x0, height: y1 - y0, depth: d, center: [(x0 + x1) / 2, (y0 + y1) / 2, 0] });
  if (!gap) return [seg(a, -a)];
  return [seg(a, gap[0]), seg(gap[1], -a), seg(gap[0], gap[1], DH, H)];
}
