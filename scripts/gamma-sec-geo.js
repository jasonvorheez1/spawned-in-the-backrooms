// Base Gamma's security entry (place "gamma", hall x -6..6, z 18..40, ceiling 8): three biometric booths with green retina
// and fingerprint panels, the DNA sample counter, the turnstile line, Liquid Pain hose nozzles, barbed wire coils,
// sandbag sniper nests on the catwalks, ceiling troffers. One static mesh at the origin.
import { box, paint, rod, post, tube, wire, cyl } from "./lib/gamma-kit.js";
const GREEN = "oklch(1.3 0.3 145)";
function sandbags(ctx, x0, x1, z, rows, alongX = true) { // a stacked wall of bags
  const n = Math.max(1, Math.round(Math.abs(x1 - x0) / 0.62));
  for (let r = 0; r < rows; r++) for (let i = 0; i < n - (r % 2); i++) {
    const c = Math.min(x0, x1) + (i + 0.5 + (r % 2) * 0.5) * Math.abs(x1 - x0) / n, y = 4.6 + 0.08 + r * 0.15;
    const a = alongX ? [c - 0.28, y, z] : [z, y, c - 0.28], b = alongX ? [c + 0.28, y, z] : [z, y, c + 0.28];
    tube(ctx, [a, [(a[0] + b[0]) / 2, y, (a[2] + b[2]) / 2], b], [0.05, 0.11, 0.05], 7, [1, 0.62], 0, 1, 1); }
}
function booth(ctx, z, hi) { // against the west wall, facing +x
  const x0 = -5.8;
  paint(ctx, "oklch(0.86 0.02 240)", "steel", 0.45, 0.5); // side panels and canopy
  box(ctx, x0, x0 + 1.4, 0, 2.4, z - 0.95, z - 0.9); box(ctx, x0, x0 + 1.4, 0, 2.4, z + 0.9, z + 0.95); box(ctx, x0, x0 + 1.5, 2.4, 2.55, z - 1, z + 1);
  paint(ctx, "oklch(0.3 0.02 250)", "steel", 0.4, 0.7); box(ctx, x0, x0 + 0.35, 0, 1.9, z - 0.45, z + 0.45); // the cabinet
  box(ctx, x0 + 0.35, x0 + 0.4, 1.05, 1.75, z - 0.35, z + 0.35);
  paint(ctx, "oklch(0.2 0.02 250)", null, 0.2, 0, GREEN); // retina ring, fingerprint pad, a status strip
  const N = hi ? 20 : 10, pts = []; for (let k = 0; k <= N; k++) { const t = (k / N) * Math.PI * 2; pts.push([x0 + 0.41, 1.55 + Math.sin(t) * 0.09, z + Math.cos(t) * 0.09]); }
  tube(ctx, pts, pts.map(() => 0.012), 4, [1, 1], 0, 1, 1);
  box(ctx, x0 + 0.4, x0 + 0.42, 1.52, 1.58, z - 0.03, z + 0.03);
  box(ctx, x0 + 0.35, x0 + 0.5, 1.12, 1.14, z - 0.1, z + 0.1); box(ctx, x0 + 0.41, x0 + 0.43, 1.25, 1.35, z - 0.18, z + 0.18);
  ctx.emissive(null); paint(ctx, "oklch(0.25 0.02 250)", "steel", 0.5, 0.6); box(ctx, x0 + 0.35, x0 + 0.55, 1.0, 1.12, z - 0.15, z + 0.15); // the palm shelf
  paint(ctx, "oklch(0.9 0.16 95)", null, 0.6); box(ctx, x0 + 0.2, x0 + 1.6, 0.002, 0.008, z - 0.6, z + 0.6); // a yellow foot box
  paint(ctx, "oklch(0.25 0.02 250)", null, 0.6); box(ctx, x0 + 0.3, x0 + 1.5, 0.003, 0.009, z - 0.5, z + 0.5);
}
function build(ctx, vis) {
  const hi = ctx.lod <= 2;
  if (!vis) {
    for (const z of [22, 26, 30]) { box(ctx, -5.8, -4.4, 0, 2.55, z - 0.95, z - 0.9); box(ctx, -5.8, -4.4, 0, 2.55, z + 0.9, z + 0.95); box(ctx, -5.8, -5.45, 0, 1.9, z - 0.45, z + 0.45); }
    box(ctx, 4.2, 5.8, 0, 1.05, 21, 29); // DNA counter
    for (const x of [-3, -1, 1, 3]) box(ctx, x - 0.18, x + 0.18, 0, 1.05, 33.5, 34.5);
    box(ctx, -5.8, -3.18, 0, 1.05, 33.95, 34.05); box(ctx, 3.18, 5.8, 0, 1.05, 33.95, 34.05);
    for (const s of [-1, 1]) { box(ctx, s * 4.2 - 0.2, s * 4.2 + 0.2, 4.6, 5.2, 21, 23); box(ctx, s * 4.2 - 0.2, s * 4.2 + 0.2, 4.6, 5.2, 35, 37); }
    return;
  }
  for (const z of [22, 26, 30]) booth(ctx, z, hi);
  // DNA counter on the east wall: steel body, wood top, glass guard, sample racks and a centrifuge
  paint(ctx, "oklch(0.55 0.1 145)", "steel", 0.45, 0.6); box(ctx, 4.2, 5.8, 0.1, 1.0, 21, 29);
  paint(ctx, "oklch(0.25 0.02 250)", null, 0.7); box(ctx, 4.25, 5.8, 0, 0.1, 21.05, 28.95);
  paint(ctx, "oklch(0.65 0.09 60)", "hardwood", 0.45); box(ctx, 4.1, 5.8, 1.0, 1.06, 20.9, 29.1);
  ctx.color("oklch(0.9 0.03 200 / 0.3)"); ctx.albedo(null); ctx.roughness(0.05); box(ctx, 4.12, 4.14, 1.06, 1.9, 21, 29);
  paint(ctx, "oklch(0.35 0.02 250)", "steel", 0.4, 0.8); for (const z of [21.05, 25, 28.95]) post(ctx, 4.13, z, 1.06, 1.92, 0.02, 6);
  for (let k = 0; k < 4; k++) { const z = 22 + k * 1.8; paint(ctx, "oklch(0.85 0.02 250)", "steel", 0.4, 0.6); box(ctx, 4.9, 5.5, 1.06, 1.12, z - 0.3, z + 0.3);
    for (let j = 0; j < 6; j++) { paint(ctx, j % 2 ? "oklch(0.7 0.2 25)" : "oklch(0.8 0.15 145)", null, 0.2, 0, j % 3 ? null : "oklch(0.7 0.2 145)"); post(ctx, 5.2, z - 0.25 + j * 0.1, 1.12, 1.26, 0.018, 6); } }
  ctx.emissive(null); paint(ctx, "oklch(0.92 0.01 250)", null, 0.3, 0.3); cyl(ctx, 5.2, 28.2, 1.06, 1.3, 0.22, hi ? 16 : 8);
  paint(ctx, "oklch(0.3 0.02 250)", null, 0.2, 0, GREEN); box(ctx, 4.95, 4.97, 1.15, 1.22, 28.1, 28.3); ctx.emissive(null);
  // turnstile line at z 34: rails to the walls, four cabinets, three-arm rotors
  paint(ctx, "oklch(0.75 0.02 250)", "steel", 0.3, 0.9);
  for (const [a, b] of [[-5.8, -3.18], [3.18, 5.8]]) { rod(ctx, [a, 1.0, 34], [b, 1.0, 34], 0.03, 6); rod(ctx, [a, 0.55, 34], [b, 0.55, 34], 0.025, 6); for (let x = a; x <= b + 0.01; x += (b - a) / 3) post(ctx, x, 34, 0, 1.0, 0.03, 6); }
  for (const x of [-3, -1, 1, 3]) {
    paint(ctx, "oklch(0.8 0.02 250)", "steel", 0.3, 0.8); box(ctx, x - 0.15, x + 0.15, 0, 0.95, 33.5, 34.5);
    paint(ctx, "oklch(0.3 0.02 250)", null, 0.4, 0.4); box(ctx, x - 0.17, x + 0.17, 0.95, 1.02, 33.48, 34.52);
    paint(ctx, "oklch(0.2 0.02 250)", null, 0.2, 0, GREEN); box(ctx, x - 0.06, x + 0.06, 1.02, 1.03, 34.25, 34.4); ctx.emissive(null);
    if (x < 3) { paint(ctx, "oklch(0.85 0.02 250)", "steel", 0.25, 0.9); const hx = x + 0.17; // rotor on the lane side
      for (let k = 0; k < 3; k++) { const t = k * 2.094 + 0.5; rod(ctx, [hx, 0.85, 34], [hx + 0.5 * Math.cos(t) * 0.9 + 0.3, 0.85 + 0.45 * Math.sin(t) * 0.6, 34 + 0.45 * Math.sin(t) * 0.8], 0.022, 6); } }
  }
  // Liquid Pain hose nozzles, three a side at 3.6 m: a red pressure line, a bell nozzle aimed at the lanes
  for (const s of [-1, 1]) for (const z of [24, 31, 37]) {
    const wx = s * 5.8;
    paint(ctx, "oklch(0.5 0.19 27)", "steel", 0.4, 0.6); rod(ctx, [wx, 3.6, z - 1.2], [wx, 3.6, z + 1.2], 0.05, 8); box(ctx, wx - s * 0.05, wx - s * 0.25, 3.45, 3.75, z - 0.15, z + 0.15);
    paint(ctx, "oklch(0.3 0.02 250)", "steel", 0.35, 0.9); tube(ctx, [[wx - s * 0.25, 3.6, z], [wx - s * 0.6, 3.4, z], [wx - s * 0.8, 3.3, z]], [0.05, 0.06, 0.13], 10, [1, 1], 0, 1, 1);
    paint(ctx, "oklch(0.6 0.22 27)", null, 0.6); box(ctx, wx - s * 0.005, wx - s * 0.012, 2.6, 3.2, z - 0.9, z + 0.9); // red stencil plate
    paint(ctx, "oklch(0.95 0.02 90)", null, 0.6); for (let k = 0; k < 4; k++) box(ctx, wx - s * 0.012, wx - s * 0.016, 2.75 + k * 0.1, 2.79 + k * 0.1, z - 0.7, z - 0.7 + 1.4 * (0.5 + 0.5 * ((k * 7) % 3) / 2));
  }
  // barbed wire: coils on the turnstile rails and along the catwalk lips
  paint(ctx, "oklch(0.6 0.01 250)", null, 0.35, 0.9);
  wire(ctx, [-5.8, 1.35, 34], [-3.3, 1.35, 34], 0.28); wire(ctx, [3.3, 1.35, 34], [5.8, 1.35, 34], 0.28);
  if (hi) for (const s of [-1, 1]) wire(ctx, [s * 4.1, 4.3, 19.5], [s * 4.1, 4.3, 38.5], 0.25, 1.4);
  // sniper nests at both ends of each catwalk: sandbags and a mounted spotlight
  paint(ctx, "oklch(0.66 0.06 80)", "canvas", 0.95);
  for (const s of [-1, 1]) for (const z of [22, 36]) sandbags(ctx, z - 1, z + 1, s * 4.25, 3, false);
  // ceiling troffers over the hall
  for (const z of [21, 29, 37]) { paint(ctx, "oklch(0.85 0.01 250)", "steel", 0.5, 0.5); box(ctx, -1.4, 1.4, 7.85, 8, z - 0.5, z + 0.5);
    paint(ctx, "oklch(0.98 0.02 95)", null, 0.3, 0, "oklch(1.6 0.03 95)"); box(ctx, -1.3, 1.3, 7.84, 7.86, z - 0.42, z + 0.42); ctx.emissive(null); }
  // floor guide lines toward the scan lanes
  paint(ctx, "oklch(0.72 0.17 140)", null, 0.6); for (const x of [-2, 0, 2]) box(ctx, x - 0.08, x + 0.08, 0.002, 0.008, 18.5, 33.3);
  paint(ctx, "oklch(0.85 0.16 95)", null, 0.6); box(ctx, -5.8, 5.8, 0.002, 0.008, 35.2, 35.5);
}
export function geometry(ctx) { build(ctx, true); }
export function collider(ctx) { build(ctx, false); }
