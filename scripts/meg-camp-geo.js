// The M.E.G. waypoint in Level 1's Aquila Sector: a patrol camp on bare concrete. Origin = the camp's centre (cell 15,15).
// West (-x) stays open toward the flickering wall home. Tents east, barricades of crates and sandbags round the rest,
// a radio table, cots, a stove, the lime eagle banner on a scaffold pole. Faces built thin and bevelled; lod 3+ drops trim.
import { tube, sphere, slab } from "./lib/shapes.js";
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
const LIME = "oklch(0.86 0.21 125)", CANVAS = "oklch(0.62 0.06 110)", WOOD = "cdn/texture-worn-hardwood-grain.png", STEEL = "oklch(0.55 0.01 250)";

function tent(ctx, x, z, w, d, h, rot, hi) { // an A-frame ridge tent; rot 0 = ridge along z, door at -z
  const P = (u, y, v) => rot ? [x + v, y, z + u] : [x + u, y, z + v];
  ctx.albedo("cdn/texture-rough-canvas-fabric.png"); ctx.color(CANVAS);
  for (const s of [-1, 1]) { // the two slopes, sagging a little mid-span
    const a = P(s * w / 2, 0.02, -d / 2), b = P(s * w / 2, 0.02, d / 2), c = P(0, h, d / 2), e = P(0, h, -d / 2);
    ctx.quad(...a, ...b, ...c, ...e); ctx.quad(...e, ...c, ...b, ...a);
  }
  ctx.color("oklch(0.55 0.06 110)"); // back wall closed, front half-open flap
  const bk = [P(-w / 2, 0.02, d / 2), P(w / 2, 0.02, d / 2), P(0, h, d / 2)];
  ctx.tri(...bk[0], ...bk[1], ...bk[2]); ctx.tri(...bk[2], ...bk[1], ...bk[0]);
  const fr = [P(-w / 2, 0.02, -d / 2), P(-0.25, 0.02, -d / 2), P(0, h, -d / 2)];
  ctx.tri(...fr[0], ...fr[1], ...fr[2]); ctx.tri(...fr[2], ...fr[1], ...fr[0]);
  ctx.albedo(null);
  ctx.color(LIME); // a lime stripe and the ridge pole
  tube(ctx, [P(0, h + 0.03, -d / 2 - 0.15), P(0, h + 0.03, d / 2 + 0.15)], [0.03, 0.03], 6);
  ctx.color("oklch(0.3 0.01 250)"); for (const v of [-d / 2 - 0.1, d / 2 + 0.1]) tube(ctx, [P(0, 0, v), P(0, h + 0.05, v)], [0.025, 0.025], 6);
  if (hi) { ctx.color("oklch(0.75 0.02 80)"); for (const s of [-1, 1]) for (const v of [-d / 2, d / 2]) tube(ctx, [P(s * w / 2 * 0.5, h * 0.5, v), P(s * (w / 2 + 0.6), 0.02, v + Math.sign(v) * 0.4)], [0.006, 0.006], 4); } // guy lines
}
function crate(ctx, x, y, z, s, yaw = 0) {
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  ctx.albedo(WOOD); ctx.color("oklch(0.93 0.04 70)");
  slab(ctx, [x, y + s / 2, z], [s / 2, s / 2, s / 2]);
  ctx.albedo(null); ctx.color("oklch(0.5 0.05 60)");
  for (const k of [-1, 1]) slab(ctx, [x, y + s / 2 + k * s * 0.35, z - s / 2 - 0.005], [s / 2, 0.025, 0.006]);
}
function sandbags(ctx, x0, z0, x1, z1, rows) { // a low sandbag wall from (x0,z0) to (x1,z1)
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.55)), dx = (x1 - x0) / L, dz = (z1 - z0) / L;
  ctx.albedo("cdn/texture-burlap-sack-weave.png");
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const t = (i + 0.5 + (r % 2) * 0.5) / n * L; if (t > L) continue;
    ctx.color(r % 2 ? "oklch(0.92 0.04 85)" : "oklch(0.88 0.05 80)");
    sphere(ctx, [x0 + dx * t, 0.1 + r * 0.17, z0 + dz * t], 0.3, 8, [1, 0.32, 0.55]);
  }
  ctx.albedo(null);
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  ctx.roughness(0.85);
  // a tarp floor under the living space: crate planks and a worn lime groundsheet
  ctx.albedo(WOOD); ctx.color("oklch(0.8 0.04 70)");
  for (let i = 0; i < 9; i++) box(ctx, 4, 10.6, 0.005, 0.03, -4 + i * 0.95, -4 + i * 0.95 + 0.88);
  ctx.albedo(null);
  // tents: two sleeping tents and the big medical tent
  tent(ctx, 8.5, 6.5, 3.2, 4.2, 2.3, 1, hi);
  tent(ctx, 8.5, -6.5, 3.2, 4.2, 2.3, 1, hi);
  tent(ctx, 13, 0, 4.2, 6, 2.9, 0, hi);
  ctx.color("oklch(0.95 0.02 30)"); box(ctx, 12.95, 13.05, 2.3, 2.75, -3.06, -3.0); ctx.color("oklch(0.6 0.22 25)"); // a red cross over the med tent's door
  box(ctx, 12.92, 13.08, 2.4, 2.65, -3.08, -3.06); box(ctx, 12.85, 13.15, 2.48, 2.57, -3.08, -3.06);
  // cots inside the camp, olive canvas on steel legs
  for (const [x, z] of [[5.5, 3.2], [5.5, -3.2], [12, 1.5]]) {
    ctx.color(STEEL); ctx.metalness(0.6);
    for (const a of [-0.9, 0.9]) for (const b of [-0.3, 0.3]) tube(ctx, [[x + a, 0, z + b], [x + a, 0.42, z + b]], [0.018, 0.018], 6);
    ctx.metalness(0); ctx.color("oklch(0.5 0.06 120)"); box(ctx, x - 1, x + 1, 0.4, 0.46, z - 0.36, z + 0.36);
    if (hi) { ctx.color("oklch(0.4 0.05 250)"); box(ctx, x + 0.4, x + 0.95, 0.46, 0.52, z - 0.32, z + 0.32); } // a folded blanket
  }
  // the radio table: trestle, field radio with an antenna, a map pinned flat, a mug
  ctx.albedo(WOOD); ctx.color("oklch(0.9 0.05 70)"); box(ctx, 5.2, 7.6, 0.78, 0.84, -1.0, 0.0);
  ctx.albedo(null); ctx.color(STEEL); ctx.metalness(0.6);
  for (const x of [5.4, 7.4]) for (const z of [-0.9, -0.1]) tube(ctx, [[x, 0, z], [x, 0.78, z]], [0.02, 0.02], 6);
  ctx.metalness(0.3); ctx.color("oklch(0.35 0.04 120)"); box(ctx, 6.6, 7.3, 0.84, 1.18, -0.85, -0.45);
  ctx.color("oklch(0.15 0.01 250)"); for (let i = 0; i < 3; i++) sphere(ctx, [6.75 + i * 0.18, 1.06, -0.86], 0.03, 6);
  ctx.emissive("oklch(0.8 0.2 140)"); box(ctx, 6.7, 6.95, 0.95, 0.99, -0.87, -0.855); ctx.emissive(null);
  tube(ctx, [[7.2, 1.18, -0.5], [7.25, 1.9, -0.55]], [0.006, 0.002], 4);
  ctx.metalness(0); ctx.color("oklch(0.92 0.03 90)"); box(ctx, 5.4, 6.4, 0.84, 0.845, -0.9, -0.15); // the map
  if (hi) { ctx.color("oklch(0.55 0.18 25)"); for (const [mx, mz] of [[5.7, -0.4], [6.1, -0.7], [5.9, -0.3]]) sphere(ctx, [mx, 0.85, mz], 0.015, 5); }
  ctx.color("oklch(0.85 0.01 250)"); tube(ctx, [[5.3, 0.84, -0.1], [5.3, 0.94, -0.1]], [0.04, 0.04], 8);
  // camp stools: crates round the table
  crate(ctx, 6, 0, 0.6, 0.45); crate(ctx, 6.9, 0, -1.6, 0.45);
  // the stove: a steel drum with a grate and a pot (its fire is an fx on the camp root)
  ctx.color("oklch(0.35 0.02 40)"); ctx.metalness(0.5); tube(ctx, [[9.5, 0, -2.8], [9.5, 0.7, -2.8]], [0.3, 0.3], 12);
  ctx.color("oklch(0.2 0.01 40)"); for (let i = -2; i <= 2; i++) box(ctx, 9.2, 9.8, 0.7, 0.72, -2.8 + i * 0.1, -2.8 + i * 0.1 + 0.02);
  ctx.color("oklch(0.6 0.01 250)"); tube(ctx, [[9.5, 0.72, -2.8], [9.5, 0.92, -2.8]], [0.14, 0.14], 10); ctx.metalness(0);
  // supply stacks: crates stencilled RATIONS, almond water flats
  for (const [x, z, n] of [[14.5, 5.5, 3], [14.5, -5.5, 2], [11, -9, 2], [11, 9, 3]]) for (let k = 0; k < n; k++) crate(ctx, x + (k % 2) * 0.75, k > 1 ? 0.7 : 0, z + (k > 1 ? 0.35 : 0), 0.7);
  // barricades: crate walls and sandbags round the north, south and east, gaps for the patrol paths
  for (const s of [-1, 1]) {
    for (let x = -4; x <= 14; x += 0.95) if (Math.abs(x - 5) > 1.4) crate(ctx, x, 0, s * 11.4, 0.8);
    for (let x = -3.5; x <= 13.5; x += 1.9) if (Math.abs(x - 5) > 2) crate(ctx, x, 0.8, s * 11.4, 0.7);
    sandbags(ctx, -4, s * 10.5, 3, s * 10.5, 2);
  }
  for (let z = -10; z <= 10; z += 0.95) if (Math.abs(z) > 1.4) crate(ctx, 16.4, 0, z, 0.8);
  sandbags(ctx, 15.4, -9, 15.4, -2, 3); sandbags(ctx, 15.4, 2, 15.4, 9, 3);
  // the banner: a scaffold pole and a lime cloth with the eagle, catching the light
  ctx.color("oklch(0.5 0.01 250)"); ctx.metalness(0.6);
  tube(ctx, [[2, 0, -2], [2, 3.7, -2]], [0.05, 0.04], 8); tube(ctx, [[2, 3.6, -2], [3.8, 3.6, -2]], [0.03, 0.03], 6);
  ctx.metalness(0); ctx.color("oklch(0.35 0.01 250)"); box(ctx, 1.7, 2.3, 0, 0.12, -2.3, -1.7);
  ctx.color(LIME); ctx.emissive("oklch(0.4 0.12 125)");
  const W = 1.7, seg = 6;
  for (let i = 0; i < seg; i++) { // a cloth with a slow sag
    const a = 2.05 + (i / seg) * W, b = 2.05 + ((i + 1) / seg) * W, wa = Math.sin(i / seg * 3.14) * 0.06, wb = Math.sin((i + 1) / seg * 3.14) * 0.06;
    ctx.quad(a, 3.55, -2 + wa, b, 3.55, -2 + wb, b, 1.9, -2 + wb * 1.6, a, 1.9, -2 + wa * 1.6);
    ctx.quad(a, 1.9, -2 + wa * 1.6, b, 1.9, -2 + wb * 1.6, b, 3.55, -2 + wb, a, 3.55, -2 + wa);
  }
  ctx.emissive(null);
  // string lights along the tent row: warm bulbs on a sagging wire
  if (hi) for (const z of [-4.2, 4.2]) {
    ctx.color("oklch(0.2 0.01 250)"); const pts = []; for (let i = 0; i <= 8; i++) pts.push([4 + i * 1.3, 2.6 - Math.sin(i / 8 * 3.14) * 0.35, z]); tube(ctx, pts, pts.map(() => 0.008), 4);
    ctx.emissive("oklch(0.85 0.15 75)"); ctx.color("oklch(0.95 0.08 80)"); for (let i = 1; i < 8; i++) sphere(ctx, [4 + i * 1.3, 2.52 - Math.sin(i / 8 * 3.14) * 0.35, z], 0.045, 6); ctx.emissive(null);
    ctx.color(STEEL); for (const x of [4, 14.4]) tube(ctx, [[x, 0, z], [x, 2.65, z]], [0.03, 0.03], 6);
  }
}
export function collider(ctx) { // only what a body should bump: tents, barricades, table, stove, stacks
  const C = (x0, x1, y1, z0, z1) => box(ctx, x0, x1, 0, y1, z0, z1);
  C(6.9, 10.1, 2, 4.4, 8.6); C(6.9, 10.1, 2, -8.6, -4.4); C(10.9, 15.1, 2.6, -3, 3);
  C(5.2, 7.6, 0.84, -1, 0); C(9.2, 9.8, 0.7, -3.1, -2.5);
  for (const s of [-1, 1]) { C(-4.4, 3.6, 1.5, s * 11.4 - 0.4, s * 11.4 + 0.4); C(6.4, 14.4, 1.5, s * 11.4 - 0.4, s * 11.4 + 0.4); C(-4.3, 3.3, 0.45, s * 10.5 - 0.3, s * 10.5 + 0.3); }
  C(16, 16.8, 0.8, -10.4, -1.4); C(16, 16.8, 0.8, 1.4, 10.4);
  for (const [x, z] of [[14.5, 5.5], [14.5, -5.5], [11, -9], [11, 9]]) C(x - 0.4, x + 1.15, 1.4, z - 0.4, z + 0.8);
}
