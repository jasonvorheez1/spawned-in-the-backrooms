// Level 169: "Field Office 7", the self-styled Backrooms Robotics outpost (Shelly #386655). Origin = pad centre, door end faces -x (the track).
// A galvanised quonset hut, sealed, a lattice mast with a dish, a generator, a repair bench with a gunslinger unit opened up on it,
// a wire fence with a gap to the west, floodlight poles, crates. Curved, bevelled, nothing blocky.
import { tube, sphere } from "./lib/shapes.js";
import { bx } from "./lib/l5-hall-kit.js";
const ZINC = "oklch(0.68 0.012 240)", RUST = "oklch(0.5 0.08 45)", CONC = "oklch(0.72 0.02 75)", DARK = "oklch(0.25 0.01 250)", CANVAS = "oklch(0.7 0.05 85)";
const HL = 5, R = 2.7; // hut half-length along x, arch radius
function hut(ctx, hi) {
  const N = hi ? 28 : 14;
  ctx.albedo("cdn/texture-corrugated-galvanised-steel-sheet.png");
  for (let i = 0; i < N; i++) { // the arch, both sides drawn, a darker rust band near the ground
    const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N, y0 = Math.sin(a0) * R, y1 = Math.sin(a1) * R, z0 = Math.cos(a0) * R, z1 = Math.cos(a1) * R;
    ctx.color(i < 2 || i >= N - 2 ? RUST : ZINC);
    ctx.quad(-HL, y0, z0, HL, y0, z0, HL, y1, z1, -HL, y1, z1); ctx.quad(-HL, y1, z1, HL, y1, z1, HL, y0, z0, -HL, y0, z0);
  }
  ctx.albedo(null); ctx.color("oklch(0.55 0.01 240)"); // ribs every metre
  for (let x = -HL; x <= HL + 0.01; x += 1.25) { const pts = []; for (let i = 0; i <= N; i++) { const a = Math.PI * i / N; pts.push([x, Math.sin(a) * (R + 0.04), Math.cos(a) * (R + 0.04)]); } tube(ctx, pts, pts.map(() => 0.035), 6, [1, 1], 0, 1, 1); }
  for (const sx of [-1, 1]) { // end walls: fans of plate
    const x = sx * HL; ctx.color(sx < 0 ? "oklch(0.62 0.015 240)" : ZINC);
    for (let i = 0; i < N; i++) { const a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N; const p = [x, 0, 0], q = [x, Math.sin(a0) * R, Math.cos(a0) * R], r = [x, Math.sin(a1) * R, Math.cos(a1) * R]; ctx.tri(...p, ...q, ...r); ctx.tri(...r, ...q, ...p); }
  }
  // the door: a steel slab, a red keypad eye, stencil stripe
  ctx.color(DARK); bx(ctx, -HL - 0.08, -HL - 0.02, 0, 2.15, -0.6, 0.6, 0.02);
  ctx.color("oklch(0.8 0.15 85)"); bx(ctx, -HL - 0.1, -HL - 0.08, 2.0, 2.08, -0.6, 0.6, 0.005);
  ctx.emissive("oklch(0.65 0.25 25)"); ctx.color("oklch(0.6 0.22 25)"); sphere(ctx, [-HL - 0.12, 1.25, 0.8], 0.035, 8); ctx.emissive(null);
  ctx.color("oklch(0.4 0.01 250)"); bx(ctx, -HL - 0.11, -HL - 0.06, 1.05, 1.4, 0.72, 0.9, 0.01);
  ctx.color("oklch(0.75 0.03 240)"); for (const z of [-1.6, 1.6]) { bx(ctx, -HL - 0.05, -HL, 1.4, 1.9, z - 0.35, z + 0.35, 0.01); } // shuttered windows
  ctx.color(DARK); for (const z of [-1.6, 1.6]) bx(ctx, -HL - 0.07, -HL - 0.04, 1.45, 1.85, z - 0.3, z + 0.3, 0.005);
}
function mast(ctx, x, z, h) {
  ctx.color("oklch(0.6 0.01 240)");
  const c = [[x - 0.25, z - 0.25], [x + 0.25, z - 0.25], [x + 0.25, z + 0.25], [x - 0.25, z + 0.25]];
  for (const [a, b] of c) tube(ctx, [[a, 0, b], [x + (a - x) * 0.3, h, z + (b - z) * 0.3]], [0.04, 0.025], 6, [1, 1], 0, 1, 1);
  for (let y = 0.6; y < h - 0.3; y += 0.9) for (let i = 0; i < 4; i++) { const k = 1 - 0.7 * y / h, [a, b] = c[i], [d, e] = c[(i + 1) % 4]; tube(ctx, [[x + (a - x) * k, y, z + (b - z) * k], [x + (d - x) * k, y + 0.45, z + (e - z) * k]], [0.012, 0.012], 4, [1, 1], 0, 1, 1); }
  ctx.color("oklch(0.88 0.01 240)"); sphere(ctx, [x + 0.35, h - 0.6, z], 0.55, 14, [0.3, 1, 1]); // the dish, aimed east at nothing
  ctx.color(DARK); tube(ctx, [[x + 0.2, h - 0.6, z], [x + 0.9, h - 0.6, z]], [0.02, 0.01], 5, [1, 1], 0, 1, 1);
  ctx.emissive("oklch(0.65 0.25 25)"); ctx.color("oklch(0.6 0.22 25)"); sphere(ctx, [x, h + 0.08, z], 0.07, 8); ctx.emissive(null);
}
function generator(ctx, x, z) {
  ctx.color("oklch(0.62 0.13 85)"); bx(ctx, x - 0.9, x + 0.9, 0.15, 1.15, z - 0.55, z + 0.55, 0.06);
  ctx.color(DARK); for (let i = 0; i < 6; i++) bx(ctx, x - 0.7 + i * 0.26, x - 0.6 + i * 0.26, 0.45, 0.95, z + 0.55, z + 0.57, 0.005);
  tube(ctx, [[x + 0.6, 1.15, z], [x + 0.6, 1.6, z], [x + 0.75, 1.75, z]], [0.06, 0.06, 0.055], 8);
  ctx.color(RUST); for (const sx of [-0.8, 0.8]) bx(ctx, x + sx - 0.08, x + sx + 0.08, 0, 0.15, z - 0.6, z + 0.6, 0.02);
}
function bench(ctx, x, z) { // the repair bench, a unit's tin chest open on it, its hat set aside
  ctx.albedo("cdn/texture-worn-hardwood-grain.png"); ctx.color("oklch(0.6 0.05 60)"); bx(ctx, x - 1.1, x + 1.1, 0.86, 0.92, z - 0.45, z + 0.45, 0.015); ctx.albedo(null);
  ctx.color(DARK); for (const [a, b] of [[-1, -0.38], [1, -0.38], [-1, 0.38], [1, 0.38]]) tube(ctx, [[x + a, 0, z + b], [x + a, 0.86, z + b]], [0.03, 0.03], 6, [1, 1], 0, 1, 1);
  ctx.color(ZINC); sphere(ctx, [x - 0.2, 1.12, z], 0.24, 14, [1.1, 0.8, 0.8]); sphere(ctx, [x + 0.35, 1.04, z + 0.05], 0.13, 12); // torso shell and head
  ctx.emissive("oklch(0.7 0.22 25)"); ctx.color("oklch(0.6 0.2 25)"); for (const s of [-1, 1]) sphere(ctx, [x + 0.47, 1.07, z + 0.05 + s * 0.05], 0.022, 6); ctx.emissive(null);
  ctx.color("oklch(0.5 0.08 55)"); sphere(ctx, [x + 0.8, 0.95, z - 0.1], 0.22, 14, [1, 0.12, 1]); sphere(ctx, [x + 0.8, 1.0, z - 0.1], 0.11, 10, [1, 0.6, 1]); // a gunslinger's hat
  ctx.color("oklch(0.75 0.15 30)"); tube(ctx, [[x - 0.4, 0.95, z - 0.1], [x - 0.6, 0.96, z - 0.3], [x - 0.9, 0.93, z - 0.2]], [0.012, 0.012, 0.012], 4); // wires
  ctx.color("oklch(0.65 0.18 140)"); tube(ctx, [[x - 0.3, 0.95, z + 0.1], [x - 0.7, 0.96, z + 0.3]], [0.012, 0.012], 4);
}
function fence(ctx, hi) {
  const P = [[-7, -2.2], [-7, -6], [7, -6], [7, 6], [-7, 6], [-7, 2.2]]; // a gap on the west for the way in
  ctx.color("oklch(0.5 0.02 240)");
  for (let i = 0; i < P.length - 1; i++) {
    const [a, b] = P[i], [c, d] = P[i + 1], n = Math.max(1, Math.round(Math.hypot(c - a, d - b) / 2.4));
    for (let k = 0; k <= n; k++) { const x = a + (c - a) * k / n, z = b + (d - b) * k / n; tube(ctx, [[x, 0, z], [x, 1.7, z]], [0.035, 0.03], 6, [1, 1], 0, 1, 1); }
    if (hi) for (const y of [0.5, 1.0, 1.5]) tube(ctx, [[a, y, b], [c, y - 0.05, d]], [0.006, 0.006], 3, [1, 1], 0, 1, 1);
  }
}
function awning(ctx) { // canvas over the crew's table, west of the door
  ctx.albedo("cdn/texture-rough-canvas-fabric.png"); ctx.color(CANVAS);
  const a = [-HL - 0.1, 2.5, -2.4], b = [-HL - 0.1, 2.5, 2.4], c = [-HL - 3.4, 2.1, 2.4], d = [-HL - 3.4, 2.1, -2.4];
  ctx.quad(...a, ...b, ...c, ...d); ctx.quad(...d, ...c, ...b, ...a); ctx.albedo(null);
  ctx.color(DARK); for (const z of [-2.4, 2.4]) tube(ctx, [[-HL - 3.4, 0, z], [-HL - 3.4, 2.12, z]], [0.04, 0.04], 6, [1, 1], 0, 1, 1);
}
function crates(ctx) {
  ctx.albedo("cdn/texture-worn-hardwood-grain.png");
  for (const [x, y, z, s] of [[4.2, 0.15, -4.6, 0.8], [5.1, 0.15, -4.5, 0.7], [4.6, 0.95, -4.55, 0.6], [-1.5, 0.15, 4.7, 0.75]]) { ctx.color("oklch(0.72 0.06 70)"); bx(ctx, x - s / 2, x + s / 2, y, y + s, z - s / 2, z + s / 2, 0.02); }
  ctx.albedo(null);
}
function run(ctx, col) {
  const hi = (ctx.lod ?? 0) <= 2;
  if (col) { bx(ctx, -7.5, 7.5, -0.4, 0.15, -6.5, 6.5, 0); bx(ctx, -HL, HL, 0.15, 2.2, -R + 0.3, R - 0.3, 0); bx(ctx, 2.4, 4.2, 0.15, 1.15, 3.9, 5.1, 0); bx(ctx, -HL - 4.2, -HL - 2.0, 0.15, 0.92, -0.45, 0.45, 0); return; }
  ctx.albedo("cdn/texture-cracked-weathered-concrete-slab.png"); ctx.color(CONC); bx(ctx, -7.5, 7.5, -0.4, 0.15, -6.5, 6.5, 0.04); ctx.albedo(null);
  hut(ctx, hi); mast(ctx, 4.5, -3.8, 8); generator(ctx, 3.3, 4.5); bench(ctx, -HL - 3.1, 0); fence(ctx, hi); awning(ctx); crates(ctx);
  ctx.color(DARK); for (const [x, z] of [[-6.6, -5.6], [6.6, 5.6]]) { tube(ctx, [[x, 0, z], [x, 4.2, z]], [0.06, 0.045], 6, [1, 1], 0, 1, 1); ctx.emissive("oklch(0.95 0.06 90)"); ctx.color("oklch(0.95 0.04 90)"); sphere(ctx, [x, 4.25, z], 0.18, 10, [1.4, 0.6, 1]); ctx.emissive(null); ctx.color(DARK); }
}
export function geometry(ctx) { run(ctx, false); }
export function collider(ctx) { run(ctx, true); }
