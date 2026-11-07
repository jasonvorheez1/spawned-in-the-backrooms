// Base Gamma's residence town, administration and tunnel dressing (place "gamma"): seven clapboard houses with porches and
// lit windows, the street's kerbs, centre line and lampposts, the red-signed gas station, the apartment block with its dim
// corridor of numbered doors, the brick conference room's long table, chairs and map board, the timbered mine tunnel and its
// locked grate. One static mesh at the origin.
import { box, paint, rod, post, tube, cyl, gable, sphere } from "./lib/gamma-kit.js";
import { HOUSES, GAS, APT, TUN, tunnelY, ROOMS } from "./lib/gamma-layout.js";
export const LAMPS = [[-5.6, -18], [5.6, -26], [-5.6, -34], [5.6, -15], [-5.6, -26], [5.6, -34]];
const WARM = "oklch(1.25 0.12 75)";
function house(ctx, [x0, x1, z0, z1, col], i, hi) {
  const east = x0 > 0 && x1 < 20, porchX = x0 < 0 ? x1 : x0, s = x0 < 0 ? 1 : -1, zc = (z0 + z1) / 2, W = 3.2; // walls 3.2 m, porch toward the street
  const wx0 = Math.min(x0, x1), wx1 = Math.max(x0, x1);
  paint(ctx, "oklch(0.55 0.02 60)", "concrete", 0.9); box(ctx, wx0 - 0.1, wx1 + 0.1, 0, 0.35, z0 - 0.1, z1 + 0.1); // footing
  paint(ctx, col, "siding", 0.8); box(ctx, wx0, wx1, 0.35, W, z0, z1);
  paint(ctx, "oklch(0.95 0.01 90)", null, 0.6); // corner boards and fascia
  for (const x of [wx0, wx1]) for (const z of [z0, z1]) box(ctx, x - 0.06, x + 0.06, 0.35, W, z - 0.06, z + 0.06);
  paint(ctx, `oklch(0.38 0.04 ${20 + i * 40})`, "shingle", 0.9); gable(ctx, wx0 - 0.4, wx1 + 0.4, z0 - 0.4, z1 + 0.4, W, W + 1.8, true);
  paint(ctx, col, "siding", 0.8); for (const x of [wx0, wx1]) tube(ctx, [[x, W, z0 + 0.01], [x, W, z1 - 0.01]], [0.01, 0.01], 3, [1, 1], 0, 1, 1);
  for (const x of [wx0, wx1]) ctx.face ? 0 : 0; // gable ends below
  for (const xe of [wx0, wx1]) { const sx = xe === wx0 ? -1 : 1; for (let k = 0; k < 6; k++) { const y = W + k * 0.3, half = (z1 - z0) / 2 * (1 - k / 6); box(ctx, xe - 0.02 * (sx < 0 ? 1 : 0), xe + 0.02 * (sx > 0 ? 1 : 0), y, y + 0.3, zc - half, zc + half); } }
  if (hi && i % 2 === 0) { paint(ctx, "oklch(0.5 0.06 30)", "brick", 0.9); box(ctx, wx0 + 1, wx0 + 1.6, W + 0.6, W + 2.6, z0 + 0.8, z0 + 1.4); } // chimney
  // windows: lit warm glass in white frames on the street face and both sides
  const win = (x, z, alongZ) => { paint(ctx, "oklch(0.95 0.01 90)", null, 0.6); alongZ ? box(ctx, x - 0.05, x + 0.05, 1.15, 2.45, z - 0.65, z + 0.65) : box(ctx, x - 0.65, x + 0.65, 1.15, 2.45, z - 0.05, z + 0.05);
    paint(ctx, "oklch(0.92 0.1 80)", null, 0.2, 0, WARM); alongZ ? box(ctx, x - 0.07, x + 0.07, 1.25, 2.35, z - 0.55, z + 0.55) : box(ctx, x - 0.55, x + 0.55, 1.25, 2.35, z - 0.07, z + 0.07);
    paint(ctx, "oklch(0.95 0.01 90)", null, 0.6); alongZ ? box(ctx, x - 0.09, x + 0.09, 1.78, 1.82, z - 0.55, z + 0.55) : box(ctx, x - 0.55, x + 0.55, 1.78, 1.82, z - 0.09, z + 0.09); ctx.emissive(null); };
  win(porchX, zc - 1.6, true); win(porchX, zc + 1.6, true); win((wx0 + wx1) / 2, z0, false); win((wx0 + wx1) / 2, z1, false);
  paint(ctx, "oklch(0.4 0.08 30)", "hardwood", 0.5); box(ctx, porchX - 0.06, porchX + 0.06, 0.35, 2.4, zc - 0.5, zc + 0.5); // front door
  paint(ctx, "oklch(0.85 0.12 85)", null, 0.3, 0.8); sphere(ctx, [porchX + s * 0.08, 1.3, zc + 0.35], 0.04, 6);
  // porch: deck, steps, posts, rail, roof, a warm porch lamp
  const px1 = porchX + s * 2;
  paint(ctx, "oklch(0.6 0.07 55)", "planks", 0.85); box(ctx, Math.min(porchX, px1), Math.max(porchX, px1), 0, 0.4, zc - 1.6, zc + 1.6);
  for (let k = 0; k < 2; k++) box(ctx, Math.min(px1, px1 + s * (0.3 + k * 0.3)), Math.max(px1, px1 + s * (0.3 + k * 0.3)), 0, 0.27 - k * 0.13, zc - 0.6, zc + 0.6);
  paint(ctx, "oklch(0.95 0.01 90)", null, 0.6); for (const z of [zc - 1.5, zc + 1.5]) post(ctx, px1 - s * 0.1, z, 0.4, 2.7, 0.07, 6);
  for (const z of [zc - 1.5, zc + 1.5]) rod(ctx, [px1 - s * 0.1, 1.2, z], [px1 - s * 0.1, 1.2, z - Math.sign(z - zc) * 0.85], 0.03, 4);
  paint(ctx, `oklch(0.38 0.04 ${20 + i * 40})`, "shingle", 0.9); tube(ctx, [[porchX, 2.95, zc], [px1 + s * 0.2, 2.65, zc]], [1.75, 1.75], 4, [0.04, 1], 0, 1, 1);
  paint(ctx, "oklch(0.95 0.1 80)", null, 0.3, 0, WARM); sphere(ctx, [porchX + s * 0.2, 2.3, zc - 0.8], 0.09, 8); ctx.emissive(null);
  if (hi) { paint(ctx, "oklch(0.9 0.01 90)", null, 0.6); for (let z = zc - 3; z <= zc + 3; z += 0.5) if (Math.abs(z - zc) > 0.7) box(ctx, px1 + s * 1.3 - 0.03, px1 + s * 1.3 + 0.03, 0, 0.9, z - 0.04, z + 0.04); } // picket fence
}
function street(ctx, hi) {
  paint(ctx, "oklch(0.72 0.01 80)", "concrete", 0.9); for (const s of [-1, 1]) box(ctx, s * 5, s * 7, 0, 0.15, -39.9, -12.1); // sidewalks
  paint(ctx, "oklch(0.88 0.15 95)", null, 0.6); for (let z = -38; z < -13; z += 3) box(ctx, -0.08, 0.08, 0.005, 0.012, z, z + 1.6);
  for (const [x, z] of LAMPS) { paint(ctx, "oklch(0.22 0.02 160)", "steel", 0.4, 0.8); post(ctx, x, z, 0.15, 4.6, 0.07, 8); post(ctx, x, z, 0.15, 0.6, 0.14, 8);
    const ax = -Math.sign(x) * 0.9; rod(ctx, [x, 4.5, z], [x + ax, 4.7, z], 0.04, 6);
    paint(ctx, "oklch(0.22 0.02 160)", "steel", 0.4, 0.8); tube(ctx, [[x + ax, 4.85, z], [x + ax, 4.55, z]], [0.06, 0.25], 10, [1, 1], 0, 1, 1);
    paint(ctx, "oklch(0.95 0.1 80)", null, 0.3, 0, "oklch(1.6 0.12 75)"); sphere(ctx, [x + ax, 4.5, z], 0.12, 8); ctx.emissive(null); }
}
function gas(ctx, hi) { const [x0, x1, z0, z1] = GAS, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
  paint(ctx, "oklch(0.6 0.01 80)", "concrete", 0.85); box(ctx, x0, x1, 0, 0.06, z0, z1);
  paint(ctx, "oklch(0.92 0.01 90)", "steel", 0.5, 0.4); for (const x of [x0 + 1.5, x1 - 5]) for (const z of [z0 + 2, z1 - 2]) post(ctx, x, z, 0, 4.6, 0.18, 10);
  box(ctx, x0 + 0.5, x1 - 4, 4.6, 5.3, z0 + 1, z1 - 1); paint(ctx, "oklch(0.5 0.2 27)", null, 0.5); box(ctx, x0 + 0.48, x1 - 3.98, 4.85, 5.1, z0 + 0.98, z1 - 0.98);
  paint(ctx, "oklch(0.95 0.02 90)", null, 0.3, 0, "oklch(1.4 0.02 90)"); box(ctx, x0 + 1, x1 - 4.5, 4.58, 4.6, z0 + 2.5, z1 - 2.5); ctx.emissive(null);
  for (const z of [zm - 3, zm + 3]) { const px = x0 + 4.5; paint(ctx, "oklch(0.5 0.01 80)", "concrete", 0.9); box(ctx, px - 1.2, px + 1.2, 0, 0.2, z - 0.5, z + 0.5);
    paint(ctx, "oklch(0.55 0.2 27)", "steel", 0.4, 0.4); box(ctx, px - 0.4, px + 0.4, 0.2, 1.9, z - 0.3, z + 0.3);
    paint(ctx, "oklch(0.95 0.02 90)", null, 0.4); box(ctx, px - 0.42, px + 0.42, 1.9, 2.15, z - 0.32, z + 0.32);
    paint(ctx, "oklch(0.2 0.02 250)", null, 0.2, 0, "oklch(0.9 0.15 140)"); box(ctx, px - 0.25, px + 0.25, 1.4, 1.7, z - 0.31, z - 0.3); ctx.emissive(null);
    paint(ctx, "oklch(0.15 0.01 250)", null, 0.6); tube(ctx, [[px + 0.4, 1.3, z], [px + 0.7, 0.6, z + 0.2], [px + 0.5, 1.0, z + 0.32]], [0.03, 0.03, 0.03], 5, [1, 1], 0, 1, 1); }
  // kiosk at the back with a hodgepodge of red signs
  const kx0 = x1 - 4, kx1 = x1 - 0.2; paint(ctx, "oklch(0.9 0.03 80)", "cinder", 0.85); box(ctx, kx0, kx1, 0, 3, z0 + 2, z1 - 2);
  paint(ctx, "oklch(0.92 0.1 80)", null, 0.2, 0, "oklch(1.0 0.1 80)"); box(ctx, kx0 - 0.02, kx0, 0.9, 2.3, zm - 2.5, zm + 1.2); ctx.emissive(null);
  paint(ctx, "oklch(0.35 0.02 250)", "steel", 0.4, 0.7); box(ctx, kx0 - 0.03, kx0, 0, 2.3, zm + 1.6, zm + 2.6);
  const signs = [[3.3, zm - 2, 2.2, 0.6, 27], [3.6, zm + 1.5, 1.4, 0.8, 15], [4.2, zm - 0.4, 3.0, 0.45, 35], [2.6, zm + 3.4, 0.9, 0.9, 5], [3.95, zm + 3.2, 1.6, 0.5, 350]];
  for (const [y, z, w, h, hue] of signs) { paint(ctx, "oklch(0.15 0.02 20)", null, 0.6); box(ctx, kx0 - 0.08, kx0 - 0.02, y - h / 2 - 0.04, y + h / 2 + 0.04, z - w / 2 - 0.04, z + w / 2 + 0.04);
    paint(ctx, `oklch(0.55 0.22 ${hue})`, null, 0.3, 0, `oklch(1.15 0.25 ${hue})`); box(ctx, kx0 - 0.1, kx0 - 0.08, y - h / 2, y + h / 2, z - w / 2, z + w / 2); }
  ctx.emissive(null); paint(ctx, "oklch(0.3 0.02 250)", "steel", 0.4, 0.8); post(ctx, x0 + 1, z1 - 0.6, 0, 6.5, 0.12, 8);
  paint(ctx, "oklch(0.55 0.22 27)", null, 0.3, 0, "oklch(1.2 0.25 27)"); box(ctx, x0 + 0.95, x0 + 1.05, 5.2, 6.8, z1 - 1.6, z1 + 0.4); ctx.emissive(null);
}
function apartments(ctx, hi) { const [x0, x1, z0, z1] = APT, cx0 = -25, cx1 = -23, H = 7, CH = 2.7;
  paint(ctx, "oklch(0.7 0.02 240)", "cinder", 0.9);
  box(ctx, x0, cx0, 0, H, z0, z1); box(ctx, cx1, x1, 0, H, z0, z1); box(ctx, cx0, cx1, CH, H, z0, z1); box(ctx, cx0, cx1, 0, CH, z0, z0 + 0.3);
  paint(ctx, "oklch(0.45 0.02 240)", "concrete", 0.9); box(ctx, x0 - 0.1, x1 + 0.1, H, H + 0.3, z0 - 0.1, z1 + 0.1); box(ctx, x0, x1, 3.4, 3.55, z1, z1 + 0.15);
  for (let k = 0; k < 4; k++) for (const fl of [1.2, 4.4]) { const x = x0 + 1.2 + k * (k < 2 ? 1.8 : 1.8) + (k >= 2 ? 3.4 : 0); // lit front windows, some dark
    paint(ctx, "oklch(0.92 0.01 90)", null, 0.6); box(ctx, x - 0.65, x + 0.65, fl, fl + 1.4, z1, z1 + 0.06);
    paint(ctx, (k + fl) % 3 < 1.5 ? "oklch(0.2 0.02 250)" : "oklch(0.9 0.08 85)", null, 0.2, 0, (k + fl) % 3 < 1.5 ? null : "oklch(0.95 0.1 80)"); box(ctx, x - 0.55, x + 0.55, fl + 0.1, fl + 1.3, z1 + 0.06, z1 + 0.07); ctx.emissive(null); }
  paint(ctx, "oklch(0.55 0.01 240)", "carpet", 0.95); box(ctx, cx0, cx1, 0, 0.02, z0 + 0.3, z1);
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const z = z1 - 2.5 - k * 3.8, x = s < 0 ? cx0 : cx1;
    paint(ctx, `oklch(0.42 0.02 ${200 + k * 8})`, "steel", 0.5, 0.3); box(ctx, x - 0.04, x + 0.04, 0, 2.1, z - 0.45, z + 0.45);
    paint(ctx, "oklch(0.75 0.1 85)", null, 0.3, 0.8); sphere(ctx, [x - s * 0.05, 1.0, z + 0.32], 0.035, 6);
    paint(ctx, "oklch(0.9 0.02 90)", null, 0.5); box(ctx, x - 0.05, x + 0.05, 1.7, 1.86, z - 0.12, z + 0.12); }
  for (const z of [-26, -34]) { paint(ctx, "oklch(0.8 0.01 240)", "steel", 0.4, 0.5); box(ctx, -24.6, -23.4, CH - 0.06, CH, z - 0.25, z + 0.25);
    paint(ctx, "oklch(0.9 0.02 220)", null, 0.3, 0, "oklch(0.9 0.03 220)"); box(ctx, -24.5, -23.5, CH - 0.07, CH - 0.06, z - 0.2, z + 0.2); ctx.emissive(null); }
}
function admin(ctx, hi) { const [x0, x1, z0, z1] = ROOMS.adm;
  paint(ctx, "oklch(0.95 0.01 60)", "brick", 0.9); box(ctx, x0 + 0.01, x0 + 0.12, 0, 3.6, z0 + 0.1, z1 - 0.1); box(ctx, x1 - 0.12, x1 - 0.01, 0, 3.6, z0 + 0.1, z1 - 0.1); box(ctx, x0 + 0.1, x1 - 0.1, 0, 3.6, z1 - 0.12, z1 - 0.01);
  box(ctx, x0 + 0.1, 12.9, 0, 3.6, z0 + 0.01, z0 + 0.12); box(ctx, 15.3, x1 - 0.1, 0, 3.6, z0 + 0.01, z0 + 0.12);
  paint(ctx, "oklch(0.45 0.08 45)", "hardwood", 0.35); box(ctx, 12, 18, 0.74, 0.8, 23.5, 26.5); // the long table
  paint(ctx, "oklch(0.3 0.04 45)", "hardwood", 0.5); for (const x of [12.6, 17.4]) box(ctx, x - 0.08, x + 0.08, 0, 0.74, 23.8, 26.2);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const x = 12.6 + i * 0.96, z = 25 + s * 2.0; // chairs
    paint(ctx, "oklch(0.3 0.02 250)", "steel", 0.4, 0.8); for (const dx of [-0.2, 0.2]) for (const dz of [-0.2, 0.2]) post(ctx, x + dx, z + dz, 0, 0.45, 0.018, 4);
    paint(ctx, "oklch(0.4 0.1 145)", "canvas", 0.9); box(ctx, x - 0.24, x + 0.24, 0.45, 0.52, z - 0.24, z + 0.24); box(ctx, x - 0.24, x + 0.24, 0.52, 1.0, z + s * 0.22, z + s * 0.27); }
  if (hi) { paint(ctx, "oklch(0.92 0.01 90)", null, 0.7); for (let i = 0; i < 8; i++) box(ctx, 12.4 + i * 0.7, 12.7 + i * 0.7, 0.8, 0.805, 24.6 + (i % 2) * 0.6, 24.95 + (i % 2) * 0.6); }
  paint(ctx, "oklch(0.3 0.04 45)", "hardwood", 0.5); box(ctx, x1 - 0.2, x1 - 0.12, 0.9, 2.8, 22, 28); // map board frame on the east wall (the map is a vector)
  paint(ctx, "oklch(0.9 0.03 85)", null, 0.8); box(ctx, x1 - 0.22, x1 - 0.2, 1.0, 2.7, 22.1, 27.9);
}
function tunnel(ctx, hi) { const { x0, x1, z0, z1, h } = TUN;
  paint(ctx, "oklch(0.75 0.03 60)", "rock", 0.95);
  for (let z = 19; z < z1; z += 1.5) { const y = tunnelY(z); box(ctx, x0, x0 + 0.25, y, y + h, z, z + 1.5); box(ctx, x1 - 0.25, x1, y, y + h, z, z + 1.5); box(ctx, x0, x1, y + h, y + h + 0.3, z, z + 1.5); }
  paint(ctx, "oklch(0.5 0.07 55)", "planks", 0.9);
  for (let z = 19.5; z < z1 - 1; z += 2.2) { const y = tunnelY(z); post(ctx, x0 + 0.4, z, y, y + h, 0.12, 6); post(ctx, x1 - 0.4, z, y, y + h, 0.12, 6); box(ctx, x0 + 0.25, x1 - 0.25, y + h - 0.25, y + h - 0.02, z - 0.13, z + 0.13); }
  paint(ctx, "oklch(0.45 0.03 60)", "steel", 0.6, 0.6); rod(ctx, [x0 + 1.2, 0.05, 19], [x0 + 1.2, TUN.depth + 0.05, TUN.rampTo], 0.03, 4); rod(ctx, [x1 - 1.2, 0.05, 19], [x1 - 1.2, TUN.depth + 0.05, TUN.rampTo], 0.03, 4);
  paint(ctx, "oklch(0.2 0.01 60)", null, 0.6); rod(ctx, [x0 + 2, h - 0.3, 19], [x0 + 2, TUN.depth + h - 0.3, TUN.rampTo], 0.01, 4);
  for (const [z, y] of [[24, tunnelY(24)], [33, TUN.depth]]) { paint(ctx, "oklch(0.95 0.1 70)", null, 0.3, 0, "oklch(1.4 0.13 65)"); sphere(ctx, [x0 + 2, y + h - 0.45, z], 0.07, 6); ctx.emissive(null); }
  const gz = 36.4, gy = TUN.depth; paint(ctx, "oklch(0.35 0.04 45)", "steel", 0.6, 0.8); // the locked grate
  box(ctx, x0 + 0.25, x1 - 0.25, gy, gy + 0.1, gz - 0.06, gz + 0.06); box(ctx, x0 + 0.25, x1 - 0.25, gy + h - 0.1, gy + h, gz - 0.06, gz + 0.06); box(ctx, x0 + 0.25, x1 - 0.25, gy + 1.2, gy + 1.28, gz - 0.06, gz + 0.06);
  for (let x = x0 + 0.35; x < x1 - 0.3; x += 0.18) post(ctx, x, gz, gy, gy + h, 0.02, 4);
  paint(ctx, "oklch(0.6 0.12 85)", "steel", 0.35, 0.9); box(ctx, (x0 + x1) / 2 - 0.08, (x0 + x1) / 2 + 0.08, gy + 1.0, gy + 1.2, gz - 0.12, gz - 0.06);
  paint(ctx, "oklch(0.15 0.01 60)", "rock", 0.95); box(ctx, x0, x1, gy, gy + h, z1 - 0.3, z1);
}
function build(ctx, vis) { const hi = ctx.lod <= 2;
  if (!vis) {
    for (const [a, b, z0, z1] of HOUSES) { box(ctx, Math.min(a, b), Math.max(a, b), 0, 5, z0, z1); const px = a < 0 ? b : a, s = a < 0 ? 1 : -1; box(ctx, Math.min(px, px + s * 2), Math.max(px, px + s * 2), 0, 0.4, (z0 + z1) / 2 - 1.6, (z0 + z1) / 2 + 1.6); }
    for (const s of [-1, 1]) box(ctx, s * 5, s * 7, 0, 0.15, -39.9, -12.1);
    const [x0, x1, z0, z1] = APT; box(ctx, x0, -25, 0, 7, z0, z1); box(ctx, -23, x1, 0, 7, z0, z1); box(ctx, -25, -23, 2.7, 7, z0, z1); box(ctx, -25, -23, 0, 2.7, z0, z0 + 0.3);
    box(ctx, GAS[1] - 4, GAS[1] - 0.2, 0, 3, GAS[2] + 2, GAS[3] - 2);
    box(ctx, 12, 18, 0, 0.8, 23.5, 26.5);
    box(ctx, TUN.x0, TUN.x1, TUN.depth, TUN.depth + TUN.h, 36.3, 36.5);
    return; }
  HOUSES.forEach((h, i) => house(ctx, h, i, hi)); street(ctx, hi); gas(ctx, hi); apartments(ctx, hi); admin(ctx, hi); tunnel(ctx, hi);
}
export function geometry(ctx) { build(ctx, true); }
export function collider(ctx) { build(ctx, false); }
