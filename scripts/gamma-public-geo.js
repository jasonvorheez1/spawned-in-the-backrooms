// rebound with gamma-kit sphere
// Base Gamma's public sector dressing (place "gamma"): shopfronts under the balcony ring, two food trucks, trader tents,
// benches, planters, hanging banners, the TV lounge (sofas, CRT sets, a rug) and the old wing's plank stalls and brick stubs.
// One static mesh at the origin; shop words are vector signs placed by places/gamma/sim.js.
import { box, paint, rod, post, tube, cyl, gable, sphere } from "./lib/gamma-kit.js";
export const SHOPS = [ // wall axis, wall at, from, to, facing sign (+1/-1 into the atrium), glow colour, name
  ["z", -12, -20, -9, 1, "oklch(0.8 0.15 70)", "CANTEEN"], ["z", -12, 9, 20, 1, "oklch(0.82 0.12 200)", "ALMOND WATER BAR"],
  ["x", -22, -11, -3.5, 1, "oklch(0.75 0.14 330)", "TAILOR"], ["x", -22, 7.5, 16.5, 1, "oklch(0.75 0.16 30)", "GUNSMITH"],
  ["x", 22, -11, -1, -1, "oklch(0.85 0.1 150)", "MED BAY"],
];
export const TRUCKS = [[-7, 6.5, "oklch(0.7 0.16 25)"], [6, -2.5, "oklch(0.78 0.13 220)"]];
export const TENTS = [[-8, -2, "oklch(0.62 0.12 140)"], [8.5, 7.5, "oklch(0.7 0.12 60)"]];
const BENCHES = [[-3, 2, 0], [3, 2, 0], [-3, 11, 0], [3, 11, 0], [-12, -4, 1], [12, 4, 1]];
const PLANTERS = [[-12, -4.5 + 8, 0.9], [12, 10, 0.9], [-13.5, -5, 0.7], [13.5, -5, 0.7], [0, 6.5, 1.1]];
const XF = (ax, w, s) => ax === "z" ? (u, d) => [u, w + s * d] : (u, d) => [w + s * d, u];
function boxL(ctx, f, u0, u1, y0, y1, d0, d1) { const a = f(u0, d0), b = f(u1, d1); box(ctx, a[0], b[0], y0, y1, a[1], b[1]); }
function shop(ctx, [ax, w, u0, u1, s, glow], hi) {
  const f = XF(ax, w, s), mid = (u0 + u1) / 2;
  paint(ctx, "oklch(0.35 0.02 250)", "steel", 0.4, 0.7); // frame
  for (const u of [u0, u1, mid - 0.8, mid + 0.8]) boxL(ctx, f, u - 0.08, u + 0.08, 0, 3.6, 0, 0.22);
  boxL(ctx, f, u0, u1, 3.5, 3.6, 0, 0.22); boxL(ctx, f, u0, u1, 0, 0.5, 0, 0.18);
  paint(ctx, "oklch(0.9 0.08 80)", null, 0.6, 0, "oklch(0.75 0.08 75)"); // the lit room behind the glass
  boxL(ctx, f, u0 + 0.1, u1 - 0.1, 0.5, 3.5, 0.01, 0.02);
  paint(ctx, "oklch(0.32 0.04 60)", "hardwood", 0.6); // shelves and a counter silhouetted behind
  for (const y of [1.2, 1.9, 2.6]) { boxL(ctx, f, u0 + 0.3, mid - 1, y, y + 0.04, 0.02, 0.06); boxL(ctx, f, mid + 1, u1 - 0.3, y, y + 0.04, 0.02, 0.06); }
  ctx.color("oklch(0.9 0.02 210 / 0.25)"); ctx.albedo(null); ctx.roughness(0.05); ctx.emissive(null);
  boxL(ctx, f, u0 + 0.08, mid - 0.88, 0.5, 3.5, 0.14, 0.15); boxL(ctx, f, mid + 0.88, u1 - 0.08, 0.5, 3.5, 0.14, 0.15);
  paint(ctx, "oklch(0.15 0.02 250)", null, 0.5, 0, null); boxL(ctx, f, u0 + 0.2, u1 - 0.2, 3.65, 4.3, 0, 0.12); // sign board
  paint(ctx, glow, null, 0.3, 0, glow.replace(/oklch\(([\d.]+)/, "oklch(1.3")); // neon rim
  boxL(ctx, f, u0 + 0.2, u1 - 0.2, 3.62, 3.67, 0.1, 0.16); boxL(ctx, f, u0 + 0.2, u1 - 0.2, 4.28, 4.33, 0.1, 0.16);
  ctx.emissive(null); // striped awning, sloped out over the door
  const n = Math.max(4, Math.round((u1 - u0) / 0.6)), du = (u1 - u0) / n;
  for (let i = 0; i < n; i++) { paint(ctx, i % 2 ? "oklch(0.95 0.02 90)" : glow, "canvas", 0.9);
    const a = f(u0 + i * du, 0.22), b = f(u0 + (i + 1) * du, 0.22), c = f(u0 + (i + 1) * du, 1.3), d = f(u0 + i * du, 1.3);
    tube(ctx, [[(a[0] + b[0]) / 2, 3.45, (a[1] + b[1]) / 2], [(c[0] + d[0]) / 2, 2.95, (c[1] + d[1]) / 2]], [du / 2, du / 2], 4, [1, 0.06], 0, 1, 1); }
  if (hi) { paint(ctx, "oklch(0.55 0.08 55)", "hardwood", 0.5); boxL(ctx, f, mid - 1.6, mid - 0.9, 0, 0.9, 0.4, 0.9); boxL(ctx, f, mid + 0.9, mid + 1.6, 0, 0.9, 0.4, 0.9); } // crates out front
}
function truck(ctx, [x, z, col], hi) { // along x, serving hatch on +z
  const L = 5, W = 2.1, x0 = x - L / 2;
  paint(ctx, col, "steel", 0.45, 0.4);
  tube(ctx, [[x0 + 1.2, 1.55, z], [x0 + L - 0.2, 1.55, z]], [W / 2, W / 2], 8, [1, 1.15], 0, 1, 1); // the box body, rounded
  tube(ctx, [[x0, 1.05, z], [x0 + 1.3, 1.25, z]], [0.85, 0.95], 8, [1.2, 0.85], 0, 1, 1); // the cab nose
  paint(ctx, "oklch(0.2 0.02 250)", null, 0.1, 0.5); box(ctx, x0 + 0.25, x0 + 0.4, 1.35, 1.9, z - 0.8, z + 0.8); // windscreen
  paint(ctx, "oklch(0.95 0.02 90)", null, 0.5); box(ctx, x0 + 1.3, x0 + L - 0.2, 0.62, 0.78, z - 1.07, z + 1.07); // white stripe
  paint(ctx, "oklch(0.95 0.06 85)", null, 0.5, 0, "oklch(0.9 0.1 80)"); box(ctx, x0 + 2.0, x0 + 4.2, 1.35, 2.3, z + 1.0, z + 1.06); // lit hatch
  paint(ctx, "oklch(0.3 0.03 60)", "steel", 0.5, 0.6); box(ctx, x0 + 1.9, x0 + 4.3, 1.25, 1.33, z + 1.0, z + 1.45); // counter shelf
  paint(ctx, col, "steel", 0.45, 0.4); tube(ctx, [[x0 + 1.9, 2.35, z + 1.05], [x0 + 1.9, 2.75, z + 1.8]], [0.04, 0.04], 4, [1, 1], 0, 1, 1);
  box(ctx, x0 + 1.9, x0 + 4.3, 2.36, 2.42, z + 1.05, z + 1.75); // hatch lid propped open
  paint(ctx, "oklch(0.15 0.01 250)", null, 0.8); for (const wx of [x0 + 0.9, x0 + 3.9]) for (const s of [-1, 1]) tube(ctx, [[wx, 0.4, z + s * 0.95], [wx, 0.4, z + s * 1.1]], [0.4, 0.4], hi ? 14 : 8, [1, 1], 0, 1, 1);
  paint(ctx, "oklch(0.75 0.02 250)", "steel", 0.3, 0.9); for (const wx of [x0 + 0.9, x0 + 3.9]) for (const s of [-1, 1]) tube(ctx, [[wx, 0.4, z + s * 1.1], [wx, 0.4, z + s * 1.12]], [0.22, 0.22], 10, [1, 1], 0, 1, 1);
  if (hi) { paint(ctx, "oklch(0.6 0.01 250)", "steel", 0.4, 0.8); post(ctx, x0 + 4.5, z - 0.6, 2.7, 3.1, 0.08, 8); } // chimney
}
function tent(ctx, [x, z, col], hi) {
  paint(ctx, "oklch(0.4 0.03 60)", "steel", 0.5, 0.6); for (const sx of [-1.5, 1.5]) for (const sz of [-1.5, 1.5]) post(ctx, x + sx, z + sz, 0, 2.2, 0.04, 6);
  paint(ctx, col, "canvas", 0.95); gable(ctx, x - 1.7, x + 1.7, z - 1.7, z + 1.7, 2.2, 3.2, true);
  paint(ctx, "oklch(0.95 0.03 90)", "canvas", 0.95); box(ctx, x - 1.7, x + 1.7, 1.9, 2.2, z + 1.68, z + 1.72); // valance
  paint(ctx, "oklch(0.55 0.08 55)", "hardwood", 0.5); box(ctx, x - 1.3, x + 1.3, 0.85, 0.9, z + 0.6, z + 1.3); for (const sx of [-1.2, 1.2]) box(ctx, x + sx - 0.04, x + sx + 0.04, 0, 0.85, z + 0.65, z + 1.25);
  if (hi) for (let i = 0; i < 9; i++) { paint(ctx, ["oklch(0.85 0.05 90)", "oklch(0.5 0.12 145)", "oklch(0.6 0.15 30)"][i % 3], null, 0.4); post(ctx, x - 1.1 + i * 0.27, z + 0.95, 0.9, 1.15 + (i % 2) * 0.06, 0.05, 8); }
  paint(ctx, "oklch(0.95 0.1 85)", null, 0.3, 0, "oklch(1.4 0.12 80)"); sphere(ctx, [x, 2.95, z], 0.1, 8); ctx.emissive(null);
}
function bench(ctx, [x, z, rot]) { const along = rot ? (u, d) => [x + d, z + u] : (u, d) => [x + u, z + d];
  paint(ctx, "oklch(0.3 0.02 250)", "steel", 0.4, 0.8); for (const u of [-0.8, 0.8]) boxL(ctx, along, u - 0.04, u + 0.04, 0, 0.45, -0.22, 0.22);
  paint(ctx, "oklch(0.6 0.1 55)", "hardwood", 0.5); for (const d of [-0.18, -0.06, 0.06, 0.18]) boxL(ctx, along, -1, 1, 0.45, 0.49, d - 0.05, d + 0.05);
  for (const y of [0.62, 0.78]) boxL(ctx, along, -1, 1, y, y + 0.1, 0.22, 0.25); }
function planter(ctx, [x, z, r], hi) {
  paint(ctx, "oklch(0.75 0.02 80)", "terrazzo", 0.6); cyl(ctx, x, z, 0, 0.6, r, hi ? 18 : 10); paint(ctx, "oklch(0.3 0.05 60)", null, 1); cyl(ctx, x, z, 0.6, 0.62, r - 0.06, hi ? 18 : 10);
  for (let k = 0; k < (hi ? 7 : 3); k++) { const t = k * 2.4, rr = (k % 3) * 0.2; paint(ctx, `oklch(${0.45 + (k % 3) * 0.06} 0.12 ${135 + k * 4})`, null, 0.8);
    sphere(ctx, [x + Math.cos(t) * rr * r, 0.95 + (k % 2) * 0.35 + r * 0.3, z + Math.sin(t) * rr * r], r * 0.55, 8, [1, 0.8, 1]); } }
function lounge(ctx, hi) { // x 22..30, z 4..18
  paint(ctx, "oklch(0.45 0.12 25)", "carpet", 0.95); box(ctx, 23.5, 28.5, 0.005, 0.02, 7, 15); // rug
  for (const [x0, x1, z0, z1, rot] of [[23, 25, 8, 12, 1], [27, 29, 8, 12, -1], [24.5, 27.5, 14.5, 16, 0]]) { // sofas
    paint(ctx, "oklch(0.5 0.08 140)", "canvas", 0.9); box(ctx, x0, x1, 0.15, 0.48, z0, z1);
    if (rot === 1) box(ctx, x0, x0 + 0.3, 0.48, 0.95, z0, z1); else if (rot === -1) box(ctx, x1 - 0.3, x1, 0.48, 0.95, z0, z1); else box(ctx, x0, x1, 0.48, 0.95, z1 - 0.3, z1);
    if (rot) for (const z of [z0, z1 - 0.25]) box(ctx, x0, x1, 0.48, 0.7, z, z + 0.25); else for (const x of [x0, x1 - 0.25]) box(ctx, x, x + 0.25, 0.48, 0.7, z0, z1);
    paint(ctx, "oklch(0.25 0.03 60)", "hardwood", 0.5); for (const x of [x0 + 0.1, x1 - 0.1]) for (const z of [z0 + 0.1, z1 - 0.1]) post(ctx, x, z, 0, 0.15, 0.04, 5); }
  paint(ctx, "oklch(0.5 0.09 55)", "hardwood", 0.45); box(ctx, 25.5, 26.5, 0.38, 0.43, 9, 11); for (const x of [25.6, 26.4]) for (const z of [9.1, 10.9]) post(ctx, x, z, 0, 0.38, 0.03, 5);
  for (const [x, z, ry] of [[26, 4.6, 0], [29.4, 13, 1], [23.5, 4.6, 0]]) { // CRT sets on cabinets, screens toward the room
    const f = ry ? (u, d) => [x - d, z + u] : (u, d) => [x + u, z + d];
    paint(ctx, "oklch(0.35 0.06 55)", "hardwood", 0.5); boxL(ctx, f, -0.6, 0.6, 0, 0.7, 0, 0.5);
    paint(ctx, "oklch(0.25 0.01 60)", null, 0.6); boxL(ctx, f, -0.45, 0.45, 0.7, 1.4, 0.05, 0.6);
    paint(ctx, "oklch(0.7 0.06 200)", null, 0.2, 0, "oklch(1.1 0.1 200)"); boxL(ctx, f, -0.34, 0.3, 0.8, 1.3, 0.6, 0.62); ctx.emissive(null);
    if (hi) { paint(ctx, "oklch(0.5 0.01 60)", "steel", 0.3, 0.8); const a = f(0, 0.3); rod(ctx, [a[0], 1.4, a[1]], [a[0] - 0.25, 1.75, a[1]], 0.01, 4); rod(ctx, [a[0], 1.4, a[1]], [a[0] + 0.25, 1.75, a[1]], 0.01, 4); } }
  paint(ctx, "oklch(0.95 0.08 85)", null, 0.3, 0, "oklch(1.3 0.1 80)"); for (const [x, z] of [[26, 8], [26, 15]]) { box(ctx, x - 0.3, x + 0.3, 3.3, 3.38, z - 0.3, z + 0.3); } ctx.emissive(null);
}
function oldWing(ctx, hi) { // x -30..-22, z -12..18: plank stalls under tin awnings, brick stubs, crates, hanging bulbs
  for (const [z0, z1] of [[-11, -6], [8, 13]]) {
    paint(ctx, "oklch(0.55 0.06 55)", "planks", 0.9); box(ctx, -29.9, -29.7, 0, 2.6, z0, z1); box(ctx, -29.9, -27, 0, 2.6, z0 - 0.1, z0); box(ctx, -29.9, -27, 0, 2.6, z1, z1 + 0.1);
    box(ctx, -27.5, -27.1, 0, 1.0, z0, z1); paint(ctx, "oklch(0.5 0.04 60)", "tin", 0.7, 0.5);
    tube(ctx, [[-29.9, 2.8, (z0 + z1) / 2], [-26.3, 2.3, (z0 + z1) / 2]], [(z1 - z0) / 2 + 0.3, (z1 - z0) / 2 + 0.3], 4, [1, 0.04], 0, 1, 1);
    paint(ctx, "oklch(0.4 0.05 50)", "planks", 0.9); for (const z of [z0 + 0.1, z1 - 0.1]) post(ctx, -26.4, z, 0, 2.3, 0.06, 5);
  }
  paint(ctx, "oklch(0.95 0.01 60)", "brick", 0.95); // makeshift brick partitions, ragged tops
  for (const [z, len] of [[-1, 3], [14.5, 2.5]]) for (let k = 0; k < 6; k++) box(ctx, -29.9, -29.9 + len - (k % 3) * 0.4, 0, 0.6 + k * 0.32, z, z + 0.3);
  paint(ctx, "oklch(0.95 0.01 60)", "brick", 0.95); for (let k = 0; k < 7; k++) box(ctx, -22.3, -22, 0, 4.5 - (k % 2) * 0.3, -12 + k * 0.6, -11.7 + k * 0.6);
  paint(ctx, "oklch(0.6 0.08 60)", "planks", 0.85); for (const [x, z, s] of [[-24, -9, 0.9], [-23.6, -7.8, 0.6], [-24.5, 15, 0.8], [-28, 3, 0.7], [-28.3, 4.4, 0.5]]) box(ctx, x - s / 2, x + s / 2, 0, s, z - s / 2, z + s / 2);
  paint(ctx, "oklch(0.2 0.01 60)", null, 0.6); for (const z of [-4, 10]) rod(ctx, [-26, 4.5, z], [-26, 4.3, z], 0.006, 4);
}
function banners(ctx, hi) { // long cloth drops from the atrium roof, lime and olive with a white band
  for (const [x, z, c] of [[-10, -6, "oklch(0.72 0.17 125)"], [10, -6, "oklch(0.45 0.08 125)"], [-10, 12, "oklch(0.45 0.08 125)"], [10, 12, "oklch(0.72 0.17 125)"], [0, -6, "oklch(0.72 0.17 125)"], [0, 12, "oklch(0.45 0.08 125)"]]) {
    paint(ctx, "oklch(0.3 0.02 250)", "steel", 0.4, 0.8); rod(ctx, [x - 1.1, 11.2, z], [x + 1.1, 11.2, z], 0.03, 6); rod(ctx, [x, 11.2, z], [x, 12, z], 0.01, 4);
    paint(ctx, c, "canvas", 0.95); box(ctx, x - 1, x + 1, 6.6, 11.15, z - 0.015, z + 0.015);
    paint(ctx, "oklch(0.95 0.02 90)", "canvas", 0.95); box(ctx, x - 1, x + 1, 9.4, 9.8, z - 0.02, z + 0.02);
    if (hi) for (let i = 0; i < 5; i++) { paint(ctx, c, "canvas", 0.95); const u = x - 0.8 + i * 0.4; tube(ctx, [[u - 0.2, 6.6, z], [u, 6.2, z], [u + 0.2, 6.6, z]], [0.01, 0.02, 0.01], 3, [1, 1], 0, 1, 1); }
  } }
function build(ctx, vis) {
  const hi = ctx.lod <= 2;
  if (!vis) {
    for (const [x, z] of TRUCKS) box(ctx, x - 2.5, x + 2.5, 0, 2.6, z - 1.1, z + 1.1);
    for (const [x, z] of TENTS) box(ctx, x - 1.3, x + 1.3, 0, 0.9, z + 0.6, z + 1.3);
    for (const [x, z, r] of PLANTERS) cyl(ctx, x, z, 0, 0.6, r, 8);
    for (const [x, z, rot] of BENCHES) rot ? box(ctx, x - 0.25, x + 0.25, 0, 0.5, z - 1, z + 1) : box(ctx, x - 1, x + 1, 0, 0.5, z - 0.25, z + 0.25);
    for (const [x0, x1, z0, z1] of [[23, 25, 8, 12], [27, 29, 8, 12], [24.5, 27.5, 14.5, 16]]) box(ctx, x0, x1, 0, 0.5, z0, z1);
    box(ctx, -29.9, -27.1, 0, 1.0, -11, -6); box(ctx, -29.9, -27.1, 0, 1.0, 8, 13);
    return;
  }
  for (const s of SHOPS) shop(ctx, s, hi);
  for (const t of TRUCKS) truck(ctx, t, hi);
  for (const t of TENTS) tent(ctx, t, hi);
  for (const b of BENCHES) bench(ctx, b);
  for (const p of PLANTERS) planter(ctx, p, hi);
  banners(ctx, hi); lounge(ctx, hi); oldWing(ctx, hi);
}
export function geometry(ctx) { build(ctx, true); }
export function collider(ctx) { build(ctx, false); }
