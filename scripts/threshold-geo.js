// What people leave at the ways between levels (scripts/lib/thresholds.js lays them): one mesh per kind (params.kind).
// Origin on the floor. Local +z points away from the threshold, into the level; local x runs across it.
// Everything is turned or tubed (shapes.js tube/sphere, lathe below) so nothing reads as a box.
import { tube, sphere } from "./lib/shapes.js";
let C;
const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
// a solid of revolution about y at (x, y, z): prof = [[r, y], ...] bottom to top, capped on top when open
function lathe(x, y, z, prof, n = 14, cap = true) {
  for (let i = 0; i < prof.length - 1; i++) for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
    C.quad(x + Math.cos(a0) * r0, y + y0, z + Math.sin(a0) * r0, x + Math.cos(a1) * r0, y + y0, z + Math.sin(a1) * r0, x + Math.cos(a1) * r1, y + y1, z + Math.sin(a1) * r1, x + Math.cos(a0) * r1, y + y1, z + Math.sin(a0) * r1);
  }
  const [rt, yt] = prof[prof.length - 1];
  if (cap && rt > 0.001) for (let k = 0; k < n; k++) { const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2; C.tri(x, y + yt, z, x + Math.cos(a1) * rt, y + yt, z + Math.sin(a1) * rt, x + Math.cos(a0) * rt, y + yt, z + Math.sin(a0) * rt); }
}
// an empty almond water bottle, standing or lying along a heading
function bottle(x, z, lying, yawDeg = 0) {
  if (!lying) { C.color("oklch(0.93 0.02 90)", 0.6); C.roughness(0.12); lathe(x, 0, z, [[0.03, 0], [0.034, 0.01], [0.034, 0.16], [0.017, 0.205], [0.014, 0.23]], 12); C.color("oklch(0.84 0.07 75)"); lathe(x, 0.07, z, [[0.0348, 0], [0.0348, 0.06]], 12, false); return; }
  const a = (yawDeg * Math.PI) / 180, dx = Math.cos(a), dz = Math.sin(a), P = (t) => [x + dx * t, 0.034, z + dz * t];
  C.color("oklch(0.93 0.02 90)", 0.6); C.roughness(0.12); tube(C, [P(-0.11), P(-0.1), P(0.05), P(0.08), P(0.12)], [0.026, 0.034, 0.034, 0.018, 0.014], 10, [1, 1], 0, 1, 1);
  C.color("oklch(0.84 0.07 75)"); tube(C, [P(-0.04), P(0.02)], [0.0352, 0.0352], 10, [1, 1], 0, 1, 1);
}
// a duffel bag, slumped and half unzipped, its strap trailing
function bag(seed) {
  C.smooth(); C.roughness(0.85); C.color(seed % 2 ? "oklch(0.42 0.05 140)" : "oklch(0.36 0.03 250)");
  tube(C, [[-0.36, 0.13, 0], [-0.3, 0.16, 0.01], [0, 0.17, 0], [0.3, 0.15, -0.01], [0.36, 0.12, 0]], [0.08, 0.15, 0.16, 0.15, 0.08], 14, [1, 0.8]);
  C.color("oklch(0.2 0.01 250)"); tube(C, [[-0.25, 0.3, -0.02], [0, 0.315, 0.0], [0.22, 0.3, 0.02]], [0.008, 0.008, 0.008], 6); // zip, open at one end
  C.color("oklch(0.25 0.02 250)"); tube(C, [[-0.12, 0.3, 0.02], [-0.06, 0.38, 0.03], [0.06, 0.38, 0.03], [0.12, 0.3, 0.02]], [0.014, 0.014, 0.014, 0.014], 6); // handle
  tube(C, [[0.32, 0.12, 0.08], [0.45, 0.02, 0.2], [0.62, 0.012, 0.15], [0.7, 0.012, -0.08], [0.6, 0.012, -0.22]], [0.012, 0.012, 0.012, 0.012, 0.012], 6, [1, 0.35]); // strap on the floor
  C.color("oklch(0.88 0.03 95)"); tube(C, [[0.18, 0.28, 0.06], [0.26, 0.31, 0.1], [0.32, 0.27, 0.15]], [0.03, 0.035, 0.02], 8, [1, 0.4]); // a shirt sleeve out of the gap
  bottle(-0.55, 0.25, true, 30); bottle(0.5, -0.32, true, 160); bottle(-0.62, -0.1, false);
}
// a traffic cone: weighted base, orange body, two reflective bands
function cone(x, z, tip) {
  C.roughness(0.6); C.color("oklch(0.25 0.01 60)"); lathe(x, 0, z, [[0.2, 0], [0.205, 0.012], [0.19, 0.03], [0.13, 0.034]], 16);
  C.color("oklch(0.66 0.2 45)"); lathe(x, 0.03, z, [[0.13, 0], [0.105, 0.14], [0.078, 0.26]], 16, false);
  C.color("oklch(0.95 0.01 90)"); lathe(x, 0.29, z, [[0.075, 0], [0.06, 0.09]], 16, false);
  C.color("oklch(0.66 0.2 45)"); lathe(x, 0.38, z, [[0.06, 0], [0.04, 0.14]], 16, false);
  C.color("oklch(0.95 0.01 90)"); lathe(x, 0.52, z, [[0.04, 0], [0.026, 0.07]], 16, false);
  C.color("oklch(0.66 0.2 45)"); lathe(x, 0.59, z, [[0.026, 0], [0.012, 0.09], [0.0, 0.095]], 16, false);
  void tip;
}
// two cones and the tape someone strung between them, sagging, one end come loose onto the floor
function cones(seed) {
  const w = 0.95; cone(-w, 0, 1); cone(w, 0.05, 1);
  C.color("oklch(0.86 0.17 95)"); C.roughness(0.5);
  const loose = seed % 2 === 0;
  const pts = loose ? [[-w, 0.6, 0], [-w * 0.5, 0.42, 0.02], [0, 0.22, 0.06], [w * 0.4, 0.03, 0.18], [w * 0.8, 0.01, 0.35]] : [[-w, 0.6, 0], [-w * 0.5, 0.5, 0.01], [0, 0.46, 0.02], [w * 0.5, 0.5, 0.04], [w, 0.6, 0.05]];
  tube(C, pts, pts.map(() => 0.022), 8, [1, 0.08]);
  C.color("oklch(0.18 0.01 90)"); for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[i + 1]; tube(C, [[(p[0] * 3 + q[0]) / 4, (p[1] * 3 + q[1]) / 4 + 0.0005, (p[2] * 3 + q[2]) / 4], [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + 0.0005, (p[2] + q[2]) / 2]], [0.0225, 0.0225], 8, [1, 0.085], 0, 1, 1); } // the black chevrons
}
// candles in a ring of their own wax, a photo leaning on a bottle: what's left where somebody didn't come back
function candles(seed) {
  C.smooth();
  for (let i = 0; i < 6; i++) {
    const a = rnd(i, seed) * 6.283, r = 0.08 + rnd(i, seed + 1) * 0.22, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.04 + rnd(i, seed + 2) * 0.16;
    C.color("oklch(0.9 0.03 90)"); C.roughness(0.5); lathe(x, 0, z, [[0.05, 0], [0.034, 0.006], [0.024, 0.014]], 12); // the puddle
    lathe(x, 0.01, z, [[0.022, 0], [0.022, h], [0.018, h + 0.006], [0.006, h + 0.008]], 12);
    C.color("oklch(0.12 0 0)"); lathe(x, h + 0.008, z, [[0.0025, 0], [0.0015, 0.012]], 4);
  }
  bottle(-0.32, 0.12, false); C.color("oklch(0.88 0.02 80)"); C.roughness(0.7); // the photograph, curling, propped on it
  C.quad(-0.25, 0.005, 0.18, -0.35, 0.005, 0.2, -0.37, 0.15, 0.135, -0.27, 0.15, 0.115);
  C.color("oklch(0.45 0.04 60)"); C.quad(-0.265, 0.025, 0.177, -0.335, 0.025, 0.192, -0.352, 0.13, 0.144, -0.282, 0.13, 0.129);
  C.color("oklch(0.75 0.12 25)"); tube(C, [[0.25, 0.004, -0.15], [0.3, 0.012, -0.1], [0.34, 0.005, -0.05]], [0.012, 0.016, 0.01], 8, [1, 0.5]); // a dried flower
  C.color("oklch(0.4 0.1 140)"); tube(C, [[0.34, 0.005, -0.05], [0.42, 0.004, 0.06]], [0.004, 0.003], 4);
}
// a camping lantern (the light itself is the object's fx)
function lantern() {
  C.smooth(); C.metalness(0.5); C.roughness(0.45); C.color("oklch(0.32 0.05 150)");
  lathe(0, 0, 0, [[0.07, 0], [0.075, 0.015], [0.07, 0.04]], 16); lathe(0, 0.2, 0, [[0.07, 0], [0.055, 0.03], [0.02, 0.045]], 16);
  C.metalness(0); C.color("oklch(0.95 0.06 85)", 0.5); C.roughness(0.1); lathe(0, 0.04, 0, [[0.052, 0], [0.06, 0.08], [0.052, 0.16]], 16, false);
  C.color("oklch(0.3 0.01 80)"); C.metalness(0.7); tube(C, [[-0.05, 0.24, 0], [-0.05, 0.3, 0], [0, 0.33, 0], [0.05, 0.3, 0], [0.05, 0.24, 0]], [0.005, 0.005, 0.005, 0.005, 0.005], 6);
  C.metalness(null);
}
// a survey stake: a pole driven into a weighted foot, flagging tape knotted at the top (the plate on it is its own vector)
function stake(seed) {
  C.smooth(); C.color("oklch(0.3 0.01 250)"); C.metalness(0.4); C.roughness(0.5);
  lathe(0, 0, 0, [[0.16, 0], [0.16, 0.03], [0.12, 0.06], [0.03, 0.07]], 16);
  lathe(0, 0.06, 0, [[0.018, 0], [0.016, 1.55], [0.012, 1.58]], 10);
  C.metalness(0); C.color(seed % 2 ? "oklch(0.72 0.2 40)" : "oklch(0.82 0.19 130)"); C.roughness(0.6);
  tube(C, [[0, 1.5, 0], [0.06, 1.45, 0.03], [0.1, 1.33, 0.08], [0.12, 1.2, 0.07]], [0.02, 0.02, 0.018, 0.012], 6, [1, 0.12]);
  tube(C, [[0, 1.5, 0], [-0.05, 1.42, -0.02], [-0.07, 1.33, -0.05]], [0.02, 0.018, 0.012], 6, [1, 0.12]);
  C.metalness(null);
}
// shoe prints: pairs from local z0 to z1 (+z is away from the threshold), walking toward it when dir < 0
function prints(p) {
  const z0 = p.z0 ?? 0, z1 = p.z1 ?? 3, col = p.col ?? "oklch(0.3 0.03 60)";
  C.color(col, p.alpha ?? 0.55); C.roughness(0.3);
  for (let i = 0, z = z1; z > z0; i++, z -= 0.38) {
    const side = i % 2 ? 1 : -1, x = side * 0.12 + Math.sin(i * 1.3) * 0.03, fade = 0.6 + 0.4 * ((z - z0) / Math.max(0.01, z1 - z0));
    sphere(C, [x, 0.002, z + 0.05], 0.045 * fade, 8, [1, 0.03, 1.5]); // ball of the foot
    sphere(C, [x, 0.002, z - 0.09], 0.035 * fade, 8, [1, 0.03, 1.1]); // heel
  }
}
// scuffs and litter where a lot of feet have gone: drag marks, a crushed can, a wrapper, butts, torn paper
function litter(seed) {
  C.smooth(); C.roughness(0.9);
  C.color("oklch(0.22 0.01 60)", 0.4); for (let i = 0; i < 3; i++) { const x = (rnd(i, seed) - 0.5) * 1.2, z = rnd(i, seed + 3) * 1.4; tube(C, [[x, 0.0015, z], [x + 0.25, 0.0015, z + 0.5], [x + 0.32, 0.0015, z + 0.95]], [0.025, 0.03, 0.01], 6, [1, 0.04]); }
  C.color("oklch(0.6 0.1 25)"); C.metalness(0.6); C.roughness(0.4); lathe(0.4, 0, 0.6, [[0.033, 0], [0.03, 0.012], [0.04, 0.02], [0.028, 0.03], [0.033, 0.04]], 12); C.metalness(0); // the can, stamped flat
  C.color("oklch(0.9 0.015 90)"); C.roughness(0.95);
  for (let i = 0; i < 4; i++) { const x = (rnd(i, seed + 5) - 0.5) * 1.6, z = rnd(i, seed + 6) * 1.6, a = rnd(i, seed + 7) * 6.283, c = Math.cos(a) * 0.1, s = Math.sin(a) * 0.1; C.quad(x - c + s * 0.7, 0.003, z - s - c * 0.7, x + c + s * 0.7, 0.006, z + s - c * 0.7, x + c - s * 0.7, 0.003, z + s + c * 0.7, x - c - s * 0.7, 0.004, z - s + c * 0.7); }
  C.color("oklch(0.92 0.01 90)"); for (let i = 0; i < 3; i++) { const x = (rnd(i, seed + 8) - 0.5), z = rnd(i, seed + 9) * 1.2; tube(C, [[x, 0.005, z], [x + 0.03, 0.005, z + 0.012]], [0.005, 0.005], 6, [1, 1], 0, 1, 1); C.color("oklch(0.7 0.08 60)"); tube(C, [[x + 0.03, 0.005, z + 0.012], [x + 0.04, 0.005, z + 0.016]], [0.0052, 0.0052], 6, [1, 1], 0, 1, 1); C.color("oklch(0.92 0.01 90)"); }
  C.color("oklch(0.55 0.15 255)"); tube(C, [[-0.5, 0.004, 0.2], [-0.44, 0.012, 0.24], [-0.38, 0.005, 0.22]], [0.02, 0.026, 0.02], 8, [1, 0.3]); // a wrapper
}
// carpet the floor you fell through brought with it: torn Level 0 carpet and a curl of yellow wallpaper on bare concrete
function carpet(seed) {
  C.smooth(); C.roughness(1);
  for (let i = 0; i < 5; i++) {
    const a = rnd(i, seed) * 6.283, r = 0.2 + rnd(i, seed + 1) * 1.1, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.12 + rnd(i, seed + 2) * 0.2;
    C.color(i % 2 ? "oklch(0.62 0.07 85)" : "oklch(0.55 0.06 80)"); sphere(C, [x, 0.006, z], s, 10, [1.3, 0.06, 0.9]);
  }
  C.color("oklch(0.85 0.09 95)"); tube(C, [[-0.4, 0.005, 0.5], [-0.25, 0.06, 0.58], [-0.1, 0.1, 0.55], [0.0, 0.06, 0.46]], [0.2, 0.2, 0.18, 0.15], 10, [1, 0.04]);
  C.color("oklch(0.3 0.03 70)", 0.5); sphere(C, [0.1, 0.003, -0.1], 0.8, 14, [1.2, 0.004, 1]); // the damp it carried
}
export function geometry(ctx) {
  C = ctx; const p = ctx.params ?? {}, k = p.kind ?? "litter", seed = p.seed ?? 1;
  if ((ctx.lod ?? 1) >= 3 && ["prints", "litter", "carpet", "candles"].includes(k)) { ctx.quad(0, 0.001, 0, 0.01, 0.001, 0, 0.01, 0.001, 0.01, 0, 0.001, 0.01); return; } // a speck far off
  if (k === "bag") bag(seed); else if (k === "cones") cones(seed); else if (k === "candles") candles(seed); else if (k === "lantern") lantern();
  else if (k === "stake") stake(seed); else if (k === "prints") prints(p); else if (k === "carpet") carpet(seed); else litter(seed);
  ctx.color(null); ctx.roughness(null); ctx.metalness(null);
}
