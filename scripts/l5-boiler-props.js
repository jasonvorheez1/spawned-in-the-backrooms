// The Boiler Room's smaller built things (params.kind): the pipe web (one mesh in room coordinates, origin at 0,0,0),
// caged bulbs, the foreman's high desk, the Level 40 arcade cabinet, the foreman's locker, toolboxes, floor steam grates,
// almond-water puddles under the leaking joints. Plan: scripts/lib/l5-boiler-plan.js
import { bbox, cyl, torus, dome, wheel, gauge, q } from "./lib/l5-kit.js";
import { RUNS_X, RUNS_Z, LEAKS } from "./lib/l5-boiler-plan.js";
const IRON = "cdn/texture-soot-black-cast-iron.png", RUST = "cdn/texture-rusty-corroded-steel-pipe.png", LAG = "cdn/texture-dirty-canvas-pipe-lagging.png";
const WOOD = "cdn/texture-worn-hardwood-grain.png", PAINT = "cdn/texture-peeling-green-industrial-paint-metal.png", CHIPRED = "cdn/texture-chipped-red-paint-metal.png";
function paint(ctx, tex, col, rough = 0.6, metal = 0.3) { ctx.albedo(tex); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); }
const brass = (ctx) => paint(ctx, null, "oklch(0.74 0.12 78)", 0.3, 0.85);
const X0 = 18.25, X1 = 45.75, Z0 = -25.75, Z1 = 25.75;
function run(ctx, a, b, r, lag, leakAt = []) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L];
  lag ? paint(ctx, LAG, "oklch(0.95 0.02 85)", 0.9, 0) : paint(ctx, RUST, "oklch(0.92 0.02 60)", 0.6, 0.5);
  cyl(ctx, a, b, r, ctx.lod <= 2 ? 12 : 6, false);
  paint(ctx, IRON, "oklch(0.8 0.01 60)", 0.5, 0.6);
  const step = lag ? 1.6 : 2.4;
  for (let s = 0.8; s < L - 0.4; s += step) {
    const p = [a[0] + d[0] * s, a[1] + d[1] * s, a[2] + d[2] * s];
    if (lag) { paint(ctx, null, "oklch(0.3 0.02 60)", 0.8, 0); torus(ctx, p, d, r + 0.005, 0.02, 12, 3); }
    else { torus(ctx, p, d, r + 0.02, 0.035, 12, 4); }
    paint(ctx, IRON, "oklch(0.8 0.01 60)", 0.5, 0.6);
  }
  // hangers up to the ceiling every ~3 m
  for (let s = 1.5; s < L; s += 3.1) { const p = [a[0] + d[0] * s, a[1] + d[1] * s, a[2] + d[2] * s]; if (p[1] < 5.85) { cyl(ctx, [p[0], p[1] + r, p[2]], [p[0], 6, p[2]], 0.015, 4, false); torus(ctx, p, d, r + 0.03, 0.012, 10, 3); } }
  // exhaust valves: a stub up with a wheel and a flared mouth, a brass tag
  for (let s = 2.9; s < L - 1; s += 6.3) {
    const p = [a[0] + d[0] * s, a[1] + d[1] * s, a[2] + d[2] * s], up = Math.min(0.45, 5.9 - p[1] - 0.1);
    if (up < 0.2) continue;
    cyl(ctx, p, [p[0], p[1] + up * 0.5, p[2]], r * 0.5, 8); bbox(ctx, [p[0], p[1] + up * 0.5, p[2]], [r * 0.7, 0.06, r * 0.7], 0.015);
    cyl(ctx, [p[0], p[1] + up * 0.5, p[2]], [p[0], p[1] + up, p[2]], [r * 0.4, r * 0.75], 8, false);
    paint(ctx, CHIPRED, "oklch(0.9 0.05 30)", 0.5, 0.4); const side = Math.abs(d[0]) > 0.5 ? [0, 0, 1] : [1, 0, 0];
    wheel(ctx, [p[0] + side[0] * (r + 0.12), p[1] + up * 0.5, p[2] + side[2] * (r + 0.12)], side, 0.16);
    brass(ctx); bbox(ctx, [p[0] + side[0] * (r + 0.02), p[1] - r - 0.1, p[2] + side[2] * (r + 0.02)], [side[2] * 0.06 + 0.006, 0.05, side[0] * 0.06 + 0.006], 0.004);
    paint(ctx, IRON, "oklch(0.8 0.01 60)", 0.5, 0.6);
  }
  // leaking joints: a fat sweating union with a green crust
  for (const k of leakAt) {
    paint(ctx, IRON, "oklch(0.75 0.02 60)", 0.3, 0.6); torus(ctx, k, d, r + 0.05, 0.06, 14, 5); torus(ctx, k.map((v, i) => v + d[i] * 0.14), d, r + 0.04, 0.045, 14, 4);
    paint(ctx, null, "oklch(0.72 0.09 150)", 0.15, 0); for (let i = 0; i < 4; i++) bbox(ctx, [k[0] + (i - 1.5) * 0.04 * (1 - Math.abs(d[0])) , k[1] - r - 0.02 - i * 0.012, k[2] + (i - 1.5) * 0.04 * Math.abs(d[0])], [0.03, 0.02, 0.03], 0.012);
  }
}
function pipes(ctx) {
  ctx.seed?.(5);
  const near = (p, axis, v) => LEAKS.filter((l) => Math.abs((axis === "z" ? l.z : l.x) - v) < 0.6).map((l) => [l.x, l.y, l.z]);
  for (const r of RUNS_X) { run(ctx, [X0, r.y, r.z], [X1, r.y, r.z], 0.16, false, near(0, "z", r.z).map((p) => [p[0], r.y, r.z])); run(ctx, [X0, r.y + 0.3, r.z + 0.5], [X1, r.y + 0.3, r.z + 0.5], 0.09, false); }
  for (const r of RUNS_Z) { run(ctx, [r.x, r.y, Z0], [r.x, r.y, Z1], 0.2, true, near(0, "x", r.x).map((p) => [r.x, r.y, p[2]])); }
  // the wall bundles: three runs along each wall, above every door head (3.0+), lagged and bare, bending at the corners
  const walls = [[[X0 + 0.25, 0, Z0 + 0.3], [X0 + 0.25, 0, Z1 - 0.3]], [[X1 - 0.25, 0, Z0 + 0.3], [X1 - 0.25, 0, Z1 - 0.3]], [[X0 + 0.3, 0, Z0 + 0.25], [X1 - 0.3, 0, Z0 + 0.25]], [[X0 + 0.3, 0, Z1 - 0.25], [X1 - 0.3, 0, Z1 - 0.25]]];
  for (const [a, b] of walls) for (const [y, r, lag, off] of [[3.15, 0.14, true, 0], [3.55, 0.09, false, 0.12], [4.3, 0.18, false, 0.05]]) {
    const n = Math.abs(a[0] - b[0]) < 0.1 ? [Math.sign(32 - a[0]), 0, 0] : [0, 0, Math.sign(-a[2])];
    run(ctx, [a[0] + n[0] * off, y, a[2] + n[2] * off], [b[0] + n[0] * off, y, b[2] + n[2] * off], r, lag);
  }
  // risers from the wall bundle to the ceiling web, twisting round one another
  paint(ctx, RUST, "oklch(0.92 0.02 60)", 0.6, 0.5);
  for (let i = 0; i < 10; i++) { const z = -22 + i * 4.9, x = i % 2 ? X1 - 0.35 : X0 + 0.35; const pts = []; for (let k = 0; k <= 6; k++) pts.push([x + Math.sin(k * 1.1) * 0.12, 3.15 + k * 0.45, z + Math.cos(k * 1.1) * 0.12]); for (let k = 0; k < 6; k++) cyl(ctx, pts[k], pts[k + 1], 0.07, 7, false); }
  // big gauges on the walls by the doors
  gauge(ctx, [X0 + 0.12, 2.8, -2.2], [1, 0, 0], 0.22, 0.85); gauge(ctx, [X1 - 0.12, 2.8, 2.6], [-1, 0, 0], 0.22, 0.95); gauge(ctx, [X0 + 0.12, 2.8, 16.2], [1, 0, 0], 0.18, 0.5);
}
function cage(ctx) { // hangs from the ceiling: origin at the bulb's centre minus 0.1
  paint(ctx, IRON, "oklch(0.8 0.01 60)", 0.5, 0.6); cyl(ctx, [0, 0.38, 0], [0, 0.85, 0], 0.02, 6); dome(ctx, [0, 0.85, 0], [0, -1, 0], 0.07, 0.5, 8, 2);
  paint(ctx, CHIPRED, "oklch(0.55 0.09 150)", 0.5, 0.4); cyl(ctx, [0, 0.38, 0], [0, 0.26, 0], [0.04, 0.24], 16, false); ctx.color("oklch(0.85 0.02 90)"); cyl(ctx, [0, 0.263, 0], [0, 0.375, 0], [0.235, 0.035], 16, false);
  paint(ctx, null, "oklch(0.9 0.1 70)", 0.3, 0); ctx.emissive("oklch(0.95 0.13 70)"); ctx.smooth(); dome(ctx, [0, 0.15, 0], [0, -1, 0], 0.07, 1.2, 10, 4); cyl(ctx, [0, 0.15, 0], [0, 0.27, 0], [0.07, 0.04], 10, false); ctx.emissive(null);
  paint(ctx, IRON, "oklch(0.6 0.01 60)", 0.4, 0.7);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); cyl(ctx, [c * 0.12, 0.27, s * 0.12], [c * 0.13, 0.12, s * 0.13], 0.007, 3, false); cyl(ctx, [c * 0.13, 0.12, s * 0.13], [0, -0.02, 0], 0.007, 3, false); }
  torus(ctx, [0, 0.17, 0], [0, 1, 0], 0.13, 0.008, 14, 3); torus(ctx, [0, 0.27, 0], [0, 1, 0], 0.12, 0.008, 14, 3);
}
function desk(ctx) { // clerk's high desk, 0.8 deep (x) by 1.8 wide (z), slanted top at 1.15, front -Z when yawed
  paint(ctx, WOOD, "oklch(0.75 0.06 55)", 0.6, 0);
  for (const [x, z] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]]) cyl(ctx, [x, 0, z], [x, 1.05, z], 0.045, 8);
  bbox(ctx, [0, 1.08, 0], [0.92, 0.04, 0.42], 0.015); bbox(ctx, [0, 0.82, 0.05], [0.88, 0.22, 0.34], 0.02); bbox(ctx, [0, 0.18, 0], [0.86, 0.025, 0.36], 0.01);
  for (const x of [-0.45, 0.45]) { bbox(ctx, [x, 0.82, -0.3], [0.38, 0.17, 0.012], 0.01); brass(ctx); cyl(ctx, [x, 0.84, -0.32], [x, 0.84, -0.36], 0.025, 6); paint(ctx, WOOD, "oklch(0.75 0.06 55)", 0.6, 0); }
  bbox(ctx, [0, 1.2, 0.38], [0.92, 0.09, 0.04], 0.015); // back rail
  paint(ctx, null, "oklch(0.92 0.03 90)", 0.9, 0); for (let i = 0; i < 4; i++) bbox(ctx, [-0.5 + i * 0.12, 1.125 + i * 0.004, -0.05 + (i % 2) * 0.04], [0.105, 0.002, 0.145], 0.001);
  paint(ctx, null, "oklch(0.35 0.03 60)", 0.8, 0); bbox(ctx, [-0.3, 1.13, 0.1], [0.2, 0.012, 0.15], 0.005); // ledger
  // a green banker's lamp
  brass(ctx); cyl(ctx, [-0.7, 1.12, 0.2], [-0.7, 1.14, 0.2], 0.09, 12); cyl(ctx, [-0.7, 1.14, 0.2], [-0.7, 1.45, 0.2], 0.015, 6);
  paint(ctx, null, "oklch(0.45 0.12 155)", 0.2, 0.2); cyl(ctx, [-0.7, 1.45, 0.05], [-0.7, 1.45, 0.35], [0.06, 0.06], 12);
  ctx.emissive("oklch(0.9 0.12 80)"); ctx.color("oklch(0.9 0.1 80)"); bbox(ctx, [-0.7, 1.4, 0.2], [0.03, 0.01, 0.12], 0.005); ctx.emissive(null);
  // tin mug and a wrench
  paint(ctx, null, "oklch(0.8 0.01 230)", 0.4, 0.7); cyl(ctx, [0.6, 1.12, -0.1], [0.6, 1.24, -0.1], 0.045, 10);
  paint(ctx, IRON, "oklch(0.8 0.01 60)", 0.4, 0.8); bbox(ctx, [0.3, 1.13, -0.2], [0.17, 0.01, 0.02], 0.005);
}
function arcade(ctx) { // 0.7 wide, 0.8 deep, 1.85 tall; screen on -Z
  paint(ctx, WOOD, "oklch(0.35 0.05 290)", 0.6, 0); const w = 0.35;
  for (const s of [-1, 1]) { // side panels: a profile with a cut-in control deck
    const P = [[0, 0.4], [0, 1.85], [-0.25, 1.85], [-0.4, 1.55], [-0.28, 1.15], [-0.42, 1.0], [-0.4, 0], [0.4, 0]].map(([z, y]) => [s * w, y, z]);
    for (let i = 1; i < P.length - 1; i++) { const n = [s, 0, 0]; const a = P[0], b = P[i], c = P[i + 1]; const f = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]); if (f * s >= 0) ctx.tri(...a, ...b, ...c); else ctx.tri(...c, ...b, ...a); }
  }
  bbox(ctx, [0, 0.925, 0.38], [w, 0.925, 0.02], 0.01); bbox(ctx, [0, 1.84, 0.07], [w, 0.02, 0.32], 0.01); bbox(ctx, [0, 0.5, -0.39], [w - 0.02, 0.5, 0.02], 0.01);
  paint(ctx, null, "oklch(0.25 0.02 290)", 0.5, 0); bbox(ctx, [0, 1.03, -0.36], [w - 0.02, 0.04, 0.08], 0.02); // control deck
  paint(ctx, null, "oklch(0.2 0.01 0)", 0.4, 0.3); cyl(ctx, [-0.12, 1.07, -0.36], [-0.12, 1.16, -0.36], 0.012, 6); paint(ctx, null, "oklch(0.55 0.2 28)", 0.3, 0); dome(ctx, [-0.12, 1.16, -0.36], [0, 1, 0], 0.03, 1, 8, 3);
  for (const [x, c] of [[0.05, "oklch(0.6 0.18 250)"], [0.13, "oklch(0.8 0.16 95)"], [0.21, "oklch(0.6 0.2 28)"]]) { paint(ctx, null, c, 0.3, 0); cyl(ctx, [x, 1.07, -0.36], [x, 1.085, -0.36], 0.022, 8); }
  // the screen: a dead green CRT that flickers INSERT COIN (drawn faint)
  paint(ctx, null, "oklch(0.2 0.03 160)", 0.15, 0); ctx.emissive("oklch(0.35 0.08 160)"); q(ctx, [-0.28, 1.17, -0.3], [0.28, 1.17, -0.3], [0.28, 1.53, -0.38], [-0.28, 1.53, -0.38], [0, 0.3, -1]);
  ctx.emissive("oklch(0.8 0.15 150)"); ctx.color("oklch(0.8 0.15 150)"); for (let i = 0; i < 9; i++) bbox(ctx, [-0.16 + i * 0.04, 1.35, -0.345], [0.013, 0.02, 0.003], 0); ctx.emissive(null);
  // marquee: lit LEVEL 40
  paint(ctx, null, "oklch(0.75 0.15 60)", 0.3, 0); ctx.emissive("oklch(0.75 0.17 50)"); q(ctx, [-0.32, 1.6, -0.3], [0.32, 1.6, -0.3], [0.32, 1.8, -0.24], [-0.32, 1.8, -0.24], [0, 0.2, -1]); ctx.emissive(null);
  paint(ctx, null, "oklch(0.15 0.02 30)", 0.5, 0); for (let i = 0; i < 7; i++) bbox(ctx, [-0.21 + i * 0.07, 1.7, -0.29 + 0.01], [0.022, 0.05, 0.004], 0);
  brass(ctx); bbox(ctx, [0, 0.6, -0.41], [0.08, 0.1, 0.01], 0.005); paint(ctx, null, "oklch(0.15 0.01 0)", 0.5, 0); bbox(ctx, [0, 0.63, -0.42], [0.008, 0.035, 0.004], 0);
}
function locker(ctx) { // 0.9 wide, 0.5 deep, 1.95 tall; doors on -Z, dented, padlocked
  paint(ctx, PAINT, "oklch(0.88 0.04 160)", 0.55, 0.45); const w = 0.45, d = 0.25;
  bbox(ctx, [0, 0.975, 0], [w, 0.975, d], 0.02); bbox(ctx, [0, 1.97, 0], [w + 0.02, 0.025, d + 0.02], 0.01);
  for (const s of [-1, 1]) { const x = s * w / 2; paint(ctx, PAINT, "oklch(0.83 0.05 160)", 0.55, 0.45); bbox(ctx, [x, 1.0, -d - 0.01], [w / 2 - 0.02, 0.9, 0.012], 0.008);
    paint(ctx, null, "oklch(0.2 0.01 160)", 0.8, 0); for (let i = 0; i < 4; i++) bbox(ctx, [x, 1.7 - i * 0.05, -d - 0.024], [0.13, 0.008, 0.003], 0);
    paint(ctx, null, "oklch(0.75 0.01 60)", 0.3, 0.9); bbox(ctx, [x - s * 0.15, 1.05, -d - 0.04], [0.012, 0.1, 0.015], 0.005); }
  brass(ctx); bbox(ctx, [0, 1.05, -d - 0.07], [0.04, 0.05, 0.015], 0.01); torus(ctx, [0, 1.12, -d - 0.07], [0, 0, 1], 0.03, 0.006, 10, 3);
  paint(ctx, null, "oklch(0.92 0.03 90)", 0.9, 0); bbox(ctx, [-w / 2, 1.45, -d - 0.025], [0.09, 0.05, 0.002], 0); // FOREMAN card
  paint(ctx, null, "oklch(0.2 0.01 60)", 0.6, 0.4); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cyl(ctx, [a * (w - 0.04), 0, b * (d - 0.04)], [a * (w - 0.04), 0.05, b * (d - 0.04)], 0.025, 6);
}
function toolbox(ctx) { // 0.55 x 0.25 x 0.3, red cantilever box
  paint(ctx, CHIPRED, "oklch(0.95 0.03 30)", 0.45, 0.5); bbox(ctx, [0, 0.12, 0], [0.27, 0.12, 0.12], 0.015);
  ctx.color("oklch(0.88 0.04 30)"); for (const s of [-1, 1]) q(ctx, [-0.27, 0.24, s * 0.12], [0.27, 0.24, s * 0.12], [0.25, 0.3, s * 0.03], [-0.25, 0.3, s * 0.03], [0, 0.4, s]);
  bbox(ctx, [0, 0.3, 0], [0.25, 0.006, 0.035], 0.003);
  paint(ctx, null, "oklch(0.75 0.01 60)", 0.3, 0.9); for (const x of [-0.18, 0.18]) cyl(ctx, [x, 0.3, 0], [x, 0.37, 0], 0.008, 5); cyl(ctx, [-0.18, 0.37, 0], [0.18, 0.37, 0], 0.014, 8);
  for (const x of [-0.2, 0.2]) bbox(ctx, [x, 0.2, -0.125], [0.02, 0.025, 0.006], 0.003);
  paint(ctx, null, "oklch(0.55 0.01 60)", 0.35, 0.85); bbox(ctx, [0.3, 0.015, 0.05], [0.13, 0.012, 0.018], 0.006); // a spanner beside it
}
function grate(ctx) { // a 1 m floor steam grate with hazard paint and a pressure stub
  paint(ctx, null, "oklch(0.75 0.14 85)", 0.7, 0); for (let i = 0; i < 8; i++) { ctx.color(i % 2 ? "oklch(0.2 0.01 60)" : "oklch(0.75 0.14 85)"); const a = (i / 8) * Math.PI * 2; bbox(ctx, [Math.cos(a) * 0.62, 0.006, Math.sin(a) * 0.62], [0.1, 0.006, 0.1], 0.002); }
  paint(ctx, IRON, "oklch(0.7 0.01 60)", 0.5, 0.7); torus(ctx, [0, 0.02, 0], [0, 1, 0], 0.5, 0.03, 20, 4);
  for (let i = -4; i <= 4; i++) bbox(ctx, [i * 0.1, 0.02, 0], [0.012, 0.018, Math.sqrt(Math.max(0, 0.25 - (i * 0.1) ** 2)) - 0.01], 0.004);
  paint(ctx, null, "oklch(0.1 0 0)", 1, 0); ctx.tri(-0.48, 0.002, 0, 0, 0.002, -0.48, 0.48, 0.002, 0); ctx.tri(-0.48, 0.002, 0, 0.48, 0.002, 0, 0, 0.002, 0.48);
}
function puddle(ctx) { // a glossy pale-green almond water puddle, irregular
  paint(ctx, null, "oklch(0.5 0.04 140)", 0.03, 0.2); ctx.smooth();
  const n = 20, R = (a) => 0.55 + 0.18 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 5 + 2);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2; ctx.tri(0, 0.006, 0, Math.cos(b) * R(b), 0.004, Math.sin(b) * R(b), Math.cos(a) * R(a), 0.004, Math.sin(a) * R(a)); }
  ctx.flat();
}
const KINDS = { pipes, cage, desk, arcade, locker, toolbox, grate, puddle };
export function geometry(ctx) { (KINDS[ctx.params?.kind] ?? toolbox)(ctx); }
const COL = { desk: [1.85, 1.3, 0.85], arcade: [0.72, 1.85, 0.82], locker: [0.92, 2.0, 0.54], toolbox: [0.6, 0.38, 0.28] };
export function collider(ctx) { const c = COL[ctx.params?.kind]; return c ? { kind: "box", width: c[0], height: c[1], depth: c[2], center: [0, c[1] / 2, 0] } : null; }
