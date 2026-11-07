// Level 5 Main Hall fixtures and fittings, one piece per params.kind (front -Z, feet at the origin):
// light fixtures hung at the plan's LIGHTS points (params.drop = metres up to the ceiling), the valve radios,
// the sealed lore doors, guest door leaves, room placards and the old stairway's flight.
import { paint, q, t3, bx, lathe, ball, pipe, path, sheet, turned, knob, box } from "./lib/l5-hall-kit.js";
const PI = Math.PI;
const BRASS = (c) => paint(c, "oklch(0.92 0.1 85)", "brass", 0.3, 0.9);
const GLOW = (c, k = 1) => paint(c, "oklch(0.98 0.05 85)", null, 0.4, 0, `oklch(${1.3 * k} 0.1 75)`);
const GLASS = (c, a = 0.45) => { paint(c, "oklch(0.95 0.03 85)", null, 0.05, 0, "oklch(0.55 0.08 75)"); c.color("oklch(0.95 0.03 85)", a); };
const WOOD = (c, t = "mahog") => paint(c, "oklch(0.95 0.02 40)", t, 0.42);
function chain(c, y0, y1) { BRASS(c); const n = Math.max(2, Math.round((y1 - y0) / 0.06)); for (let i = 0; i < n; i++) { const y = y0 + (i + 0.5) * (y1 - y0) / n; lathe(c, 0, y - 0.022, 0, [[0.012, 0], [0.018, 0.022], [0.012, 0.044]], 6, false, i % 2 ? 1 : 0.4, i % 2 ? 0.4 : 1); } }
function canopy(c, top) { BRASS(c); lathe(c, 0, top - 0.06, 0, [[0, 0], [0.04, 0], [0.09, 0.05], [0.1, 0.06], [0, 0.06]], 16); }
function crystal(c, x, y, z, s) { const pts = [[x, y + s * 1.6, z], [x + s, y, z], [x, y, z + s], [x - s, y, z], [x, y, z - s], [x, y - s * 2.2, z]];
  for (let i = 0; i < 4; i++) { const a = pts[1 + i], b = pts[1 + (i + 1) % 4]; t3(c, pts[0], b, a, [a[0] + b[0] - 2 * x, 0.5, a[2] + b[2] - 2 * z]); t3(c, pts[5], a, b, [a[0] + b[0] - 2 * x, -0.5, a[2] + b[2] - 2 * z]); } }
function chandelier(c, p) {
  const top = p.drop ?? 0.9; canopy(c, top); chain(c, 0.35, top - 0.06);
  BRASS(c); lathe(c, 0, -0.55, 0, [[0, 0], [0.05, 0.02], [0.03, 0.08], [0.06, 0.16], [0.14, 0.3], [0.16, 0.36], [0.06, 0.42], [0.04, 0.6], [0.07, 0.66], [0.03, 0.75], [0.025, 0.9], [0, 0.9]], 18);
  for (const [tier, R, N, y] of [[0, 0.62, 8, -0.2], [1, 0.36, 6, 0.08]]) for (let i = 0; i < N; i++) {
    const a = (i + tier * 0.5) / N * 2 * PI, ca = Math.cos(a), sa = Math.sin(a), at = (r, yy) => [ca * r, yy, sa * r];
    BRASS(c); path(c, [at(0.08, y - 0.08), at(R * 0.4, y - 0.18), at(R * 0.75, y - 0.12), at(R * 0.95, y - 0.02), at(R, y + 0.05)], 0.011, 6);
    lathe(c, ca * R, y + 0.05, sa * R, [[0, 0], [0.04, 0], [0.05, 0.02], [0.02, 0.03], [0.018, 0.04], [0, 0.04]], 10);
    paint(c, "oklch(0.97 0.01 90)", null, 0.6); lathe(c, ca * R, y + 0.09, sa * R, [[0, 0], [0.013, 0], [0.013, 0.09], [0, 0.09]], 8);
    GLOW(c, 1.4); lathe(c, ca * R, y + 0.18, sa * R, [[0, 0], [0.018, 0.02], [0.016, 0.05], [0, 0.08]], 8);
    if (c.lod < 3) { GLASS(c, 0.75); for (let k = 0; k < 3; k++) crystal(c, ca * (R * 0.6) + k * 0.0, y - 0.24 - k * 0.06, sa * (R * 0.6), 0.016); crystal(c, ca * R, y - 0.06, sa * R, 0.02); }
  }
  if (c.lod < 3) { GLASS(c, 0.75); for (let i = 0; i < 24; i++) { const a = i / 24 * 2 * PI, r = 0.5 + 0.12 * Math.cos(i * 2); crystal(c, Math.cos(a) * r, -0.32 + 0.04 * Math.sin(i * 3), Math.sin(a) * r, 0.014); } for (let i = 0; i < 5; i++) crystal(c, 0, -0.6 - i * 0.07, 0, 0.022 - i * 0.002); }
}
function pendant(c, p) { const top = p.drop ?? 0.6; canopy(c, top); chain(c, 0.12, top - 0.06);
  BRASS(c); lathe(c, 0, -0.02, 0, [[0, 0.14], [0.04, 0.13], [0.06, 0.1], [0.02, 0.06], [0.015, 0.0], [0, 0]], 14); for (let i = 0; i < 3; i++) { const a = i * 2.09; pipe(c, [0, 0.1, 0], [Math.cos(a) * 0.24, -0.02, Math.sin(a) * 0.24], 0.006, 5); }
  GLASS(c, 0.7); lathe(c, 0, -0.26, 0, [[0, 0], [0.08, 0.01], [0.17, 0.06], [0.24, 0.16], [0.26, 0.24], [0.25, 0.25]], 22, true); GLOW(c, 1.2); ball(c, 0, -0.1, 0, 0.05, 10);
  BRASS(c); lathe(c, 0, -0.29, 0, [[0, 0], [0.025, 0.0], [0.02, 0.04], [0, 0.05]], 10); }
function sconce(c, p) { BRASS(c); lathe(c, 0, -0.14, 0.03, [[0, 0], [0.06, 0.01], [0.07, 0.08], [0.06, 0.2], [0.04, 0.26], [0, 0.27]], 14, true, 1, 0.3);
  for (const s of [-1, 1]) { path(c, [[0, -0.05, 0.02], [s * 0.06, -0.1, -0.05], [s * 0.13, -0.06, -0.1], [s * 0.15, 0.02, -0.12]], 0.008, 5); lathe(c, s * 0.15, 0.02, -0.12, [[0, 0], [0.03, 0], [0.035, 0.02], [0, 0.02]], 10);
    paint(c, "oklch(0.93 0.05 70)", "silk", 0.9, 0, "oklch(0.75 0.1 65)"); lathe(c, s * 0.15, 0.08, -0.12, [[0.075, 0], [0.07, 0.01], [0.045, 0.11], [0.04, 0.115]], 14, false); lathe(c, s * 0.15, 0.08, -0.12, [[0.04, 0.115], [0.045, 0.11], [0.07, 0.01], [0.075, 0]], 14, false); GLOW(c); ball(c, s * 0.15, 0.1, -0.12, 0.022, 8); BRASS(c); } }
function flush(c, p) { const top = p.drop ?? 0.3; BRASS(c); lathe(c, 0, top - 0.05, 0, [[0, 0], [0.22, 0], [0.25, 0.03], [0.24, 0.05], [0, 0.05]], 22);
  GLASS(c, 0.85); lathe(c, 0, top - 0.24, 0, [[0, 0], [0.08, 0.005], [0.17, 0.05], [0.22, 0.13], [0.235, 0.19]], 22); BRASS(c); lathe(c, 0, top - 0.27, 0, [[0, 0], [0.02, 0], [0.025, 0.02], [0.01, 0.04], [0, 0.04]], 10); pipe(c, [0, top - 0.25, 0], [0, top - 0.05, 0], 0.004, 4); GLOW(c, 1.1); ball(c, 0, top - 0.14, 0, 0.06, 10, 0.6); }
function lamp(c, p) { // a guest room's ceiling lamp: a silk drum shade with a fringe on a brass rod
  const top = p.drop ?? 0.5; canopy(c, top); BRASS(c); pipe(c, [0, 0.1, 0], [0, top - 0.06, 0], 0.01, 8);
  const R0 = 0.24, R1 = 0.3, H = 0.26, col = p.col ?? "oklch(0.9 0.07 60)"; paint(c, col, "silk", 0.9, 0, "oklch(0.7 0.11 60)");
  lathe(c, 0, -0.12, 0, [[R1, 0], [R0, H]], 24, false); lathe(c, 0, -0.12, 0, [[R0, H], [R1, 0]], 24, false);
  BRASS(c); for (const [r, y] of [[R1, -0.12], [R0, -0.12 + H]]) { const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * 2 * PI; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); } path(c, pts, 0.006, 4); }
  if (c.lod < 3) { paint(c, "oklch(0.75 0.1 70)", "silk", 0.9); for (let i = 0; i < 48; i++) { const a = i / 48 * 2 * PI, x = Math.cos(a) * R1, z = Math.sin(a) * R1; pipe(c, [x, -0.12, z], [x * 1.01, -0.2, z * 1.01], 0.004, 3); } }
  GLOW(c, 1.2); ball(c, 0, 0.0, 0, 0.05, 10); }
function bulb(c, p) { const top = p.drop ?? 0.4; paint(c, "oklch(0.18 0.01 60)", null, 0.6); pipe(c, [0, 0.06, 0], [0, top, 0], 0.005, 5); lathe(c, 0, 0.0, 0, [[0, 0], [0.022, 0], [0.024, 0.07], [0, 0.07]], 10); GLOW(c, 1.5); lathe(c, 0, -0.12, 0, [[0, 0], [0.025, 0.01], [0.04, 0.05], [0.035, 0.1], [0.02, 0.12], [0, 0.12]], 12); }
// the cathedral valve radio: walnut arch, cloth grille behind fretwork, a lit tuning dial, bakelite knobs
function radio(c, p) { const w = 0.46, h = 0.34, d = 0.24, zf = -d / 2; WOOD(c, "walnut");
  const prof = (u) => { const x = (u - 0.5) * w; const t = Math.abs(x) / (w / 2); return [x, 0.2 + (h - 0.2) * Math.sqrt(Math.max(0, 1 - t * t * t))]; };
  sheet(c, (u, v) => { const [x, y] = prof(u); return [x, y * v, zf]; }, 16, 1, () => [0, 0, -1], false); sheet(c, (u, v) => { const [x, y] = prof(u); return [x, y * v, d / 2]; }, 16, 1, () => [0, 0, 1], false);
  sheet(c, (u, v) => { const [x, y] = prof(u); return [x, y, zf + d * v]; }, 16, 2, (u) => [prof(u)[0], 0.5, 0], true);
  for (const s of [-1, 1]) sheet(c, (u, v) => [s * w / 2, u * 0.2, zf + d * v], 1, 1, () => [s, 0, 0], false);
  bx(c, -w / 2 - 0.015, w / 2 + 0.015, 0, 0.03, zf - 0.015, d / 2 + 0.01, 0.008);
  paint(c, "oklch(0.55 0.05 60)", "grille", 0.95); sheet(c, (u, v) => { const x = (u - 0.5) * 0.3; return [x, 0.12 + v * (0.17 * Math.sqrt(Math.max(0, 1 - (2 * x / 0.3) ** 2)) + 0.02), zf - 0.002]; }, 10, 2, () => [0, 0, -1], false);
  WOOD(c, "walnut"); for (const x of [-0.08, 0, 0.08]) { const hh = 0.12 + 0.17 * Math.sqrt(1 - (2 * x / 0.3) ** 2); bx(c, x - 0.008, x + 0.008, 0.12, hh + 0.01, zf - 0.012, zf, 0.003); }
  pipe(c, [-0.15, 0.12, zf - 0.006], [0.15, 0.12, zf - 0.006], 0.008, 6);
  paint(c, "oklch(0.92 0.06 80)", null, 0.3, 0, "oklch(0.95 0.12 75)"); lathe(c, 0, 0.075, zf - 0.004, [[0, 0], [0.035, 0]], 16); bx(c, -0.04, 0.04, 0.072, 0.078, zf - 0.008, zf - 0.006, 0);
  paint(c, "oklch(0.2 0.03 40)", null, 0.25); for (const x of [-0.13, 0.13, 0.08]) { pipe(c, [x, 0.06, zf], [x, 0.06, zf - 0.02], 0.016, 12); ball(c, x, 0.06, zf - 0.02, 0.016, 8, 0.4); } }
// the lore's sealed doors: panelled oak, riveted steel, a barred gate, a wheel airlock (state.style)
function sealed(c, p) { const st = p.style ?? "door", w = st === "gate" ? 2.2 : 1.1, h = st === "gate" ? 2.8 : 2.3, t = 0.12, hw = w / 2;
  if (st === "door") { paint(c, "oklch(0.7 0.04 40)", "mahog", 0.5); bx(c, -hw, hw, 0, h, -t / 2, t / 2, 0.01); for (const [y0, y1] of [[0.12, 0.9], [1.0, 1.55], [1.65, h - 0.12]]) for (const s of [-1, 1]) { const x0 = s < 0 ? -hw + 0.1 : 0.04, x1 = s < 0 ? -0.04 : hw - 0.1; bx(c, x0, x1, y0, y1, -t / 2 - 0.015, -t / 2, 0.01); bx(c, x0 + 0.04, x1 - 0.04, y0 + 0.04, y1 - 0.04, -t / 2 - 0.03, -t / 2, 0.01); }
    BRASS(c); knob(c, hw - 0.12, 1.0, -t / 2, 0.03); bx(c, hw - 0.15, hw - 0.09, 0.9, 1.15, -t / 2 - 0.008, -t / 2, 0.004); paint(c, "oklch(0.25 0.04 60)", null, 0.3); bx(c, -hw, hw, 0, 0.01, -t / 2 - 0.2, -t / 2, 0); return; }
  if (st === "gate") { WOOD(c, "oak"); for (let i = 0; i < 10; i++) { const x = -hw + (i + 0.5) * w / 10, top = h - 0.25 + Math.sin(PI * (i + 0.5) / 10) * 0.25; bx(c, x - w / 20 + 0.005, x + w / 20 - 0.005, 0, top, -t / 2, t / 2, 0.012); }
    paint(c, "oklch(0.3 0.02 50)", "iron", 0.55, 0.7); for (const y of [0.4, 1.4, 2.3]) bx(c, -hw, hw, y, y + 0.1, -t / 2 - 0.02, -t / 2, 0.006); bx(c, -hw - 0.1, hw + 0.1, 1.2, 1.32, -t / 2 - 0.16, -t / 2 - 0.04, 0.015); for (const x of [-hw + 0.1, hw - 0.1]) bx(c, x - 0.05, x + 0.05, 1.1, 1.42, -t / 2 - 0.18, -t / 2, 0.01);
    for (const y of [0.45, 1.45, 2.35]) for (let i = 0; i < 8; i++) ball(c, -hw + 0.15 + i * (w - 0.3) / 7, y, -t / 2 - 0.02, 0.014, 6); return; }
  paint(c, st === "airlock" ? "oklch(0.55 0.03 220)" : "oklch(0.5 0.04 60)", "steel", 0.45, 0.8); bx(c, -hw, hw, 0, h, -t / 2, t / 2, 0.02); bx(c, -hw + 0.08, hw - 0.08, 0.08, h - 0.08, -t / 2 - 0.02, -t / 2, 0.02);
  paint(c, "oklch(0.38 0.04 50)", "iron", 0.5, 0.7); for (const y of [0.1, h - 0.1]) for (let i = 0; i < 9; i++) ball(c, -hw + 0.1 + i * (w - 0.2) / 8, y, -t / 2 - 0.02, 0.013, 6); for (const x of [-hw + 0.04, hw - 0.04]) for (let i = 0; i < 14; i++) ball(c, x, 0.15 + i * (h - 0.3) / 13, -t / 2 - 0.005, 0.012, 6);
  if (st === "airlock") { paint(c, "oklch(0.55 0.15 30)", "steel", 0.4, 0.6); const y = 1.2, R = 0.28, pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * 2 * PI; pts.push([Math.cos(a) * R, y + Math.sin(a) * R, -t / 2 - 0.1]); } path(c, pts, 0.025, 8); for (let i = 0; i < 4; i++) { const a = i * PI / 2 + 0.4; pipe(c, [0, y, -t / 2 - 0.1], [Math.cos(a) * R, y + Math.sin(a) * R, -t / 2 - 0.1], 0.015, 6); } pipe(c, [0, y, -t / 2], [0, y, -t / 2 - 0.12], 0.04, 10);
    paint(c, "oklch(0.8 0.02 200)", null, 0.05, 0.3); c.color("oklch(0.8 0.02 200)", 0.5); lathe(c, 0, 1.9, -t / 2 - 0.022, [[0, 0], [0.12, 0]], 16); }
  else { paint(c, "oklch(0.3 0.03 40)", "iron", 0.5, 0.7); pipe(c, [hw - 0.15, 0.9, -t / 2 - 0.06], [hw - 0.15, 1.3, -t / 2 - 0.06], 0.02, 8); for (const y of [0.9, 1.3]) pipe(c, [hw - 0.15, y, -t / 2], [hw - 0.15, y, -t / 2 - 0.06], 0.015, 6); for (const y of [0.4, 2.0]) bx(c, -hw - 0.04, -hw + 0.3, y - 0.06, y + 0.06, -t / 2 - 0.03, -t / 2, 0.01);
    paint(c, "oklch(0.92 0.12 85)", null, 0.5); bx(c, -0.22, 0.22, 1.7, 1.86, -t / 2 - 0.03, -t / 2 - 0.02, 0.008); paint(c, "oklch(0.2 0.02 30)"); bx(c, -0.18, 0.18, 1.76, 1.8, -t / 2 - 0.034, -t / 2 - 0.03, 0); } }
// a guest door leaf: six panels, brass knob and escutcheon; origin at the leaf's bottom centre (hinge on its -x edge)
function leaf(c, p) { const w = (p.w ?? 1.1) - 0.04, h = 2.36, t = 0.05, hw = w / 2, col = p.col ?? "oklch(0.92 0.03 40)";
  paint(c, col, p.wood ?? "mahog", 0.45); bx(c, -hw, hw, 0.01, h, -t / 2, t / 2, 0.008);
  for (const s of [-1, 1]) for (const [y0, y1] of [[0.15, 0.85], [0.95, 1.55], [1.65, h - 0.12]]) for (const zs of [-1, 1]) { const x0 = -hw + 0.09, x1 = hw - 0.09, xm = 0; const a = s < 0 ? x0 : xm + 0.04, b = s < 0 ? xm - 0.04 : x1; bx(c, a, b, y0, y1, zs * t / 2 - (zs < 0 ? 0.012 : 0), zs * t / 2 + (zs > 0 ? 0.012 : 0), 0.006); if (c.lod < 3) bx(c, a + 0.035, b - 0.035, y0 + 0.035, y1 - 0.035, zs * t / 2 - (zs < 0 ? 0.02 : 0), zs * t / 2 + (zs > 0 ? 0.02 : 0), 0.01); }
  BRASS(c); for (const zs of [-1, 1]) { bx(c, hw - 0.13, hw - 0.07, 0.88, 1.12, zs * (t / 2 + 0.004) - 0.003, zs * (t / 2 + 0.004) + 0.003, 0.003); ball(c, hw - 0.1, 1.02, zs * (t / 2 + 0.05), 0.028, 10); pipe(c, [hw - 0.1, 1.02, zs * t / 2], [hw - 0.1, 1.02, zs * (t / 2 + 0.04)], 0.01, 6); }
  for (const y of [0.3, h - 0.3]) pipe(c, [-hw - 0.005, y - 0.05, 0], [-hw - 0.005, y + 0.05, 0], 0.01, 6); }
// the room's gold placard: an oval brass plate with a raised rim (the number rides as a vector beside it)
function placard(c, p) { BRASS(c); lathe(c, 0, 0, 0, [[0, 0], [0.13, 0], [0.135, 0.008], [0.12, 0.015], [0, 0.012]], 24, true, 1, 0.55); }
// the old stairway's flight: oak treads on a carpet runner with brass rods, turned balusters and a handrail, up to the landing
function stairs(c, p) { const W = p.w ?? 2.6, n = p.n ?? 6, rise = 0.18, run = 0.28, land = p.land ?? 1.4, hw = W / 2;
  for (let i = 0; i < n; i++) { const y = (i + 1) * rise, z0 = -i * run, z1 = -(i + 1) * run; WOOD(c, "oak"); bx(c, -hw, hw, y - rise, y, z1, z0 + (i ? 0 : 0), 0.008); bx(c, -hw, hw, y - 0.03, y, z0 - 0.02, z0 + 0.02 - run * 0, 0.012);
    paint(c, "oklch(0.55 0.13 25)", "persian", 0.95); bx(c, -hw + 0.35, hw - 0.35, y, y + 0.006, z1, z0, 0.002); q(c, [-hw + 0.35, y - rise + 0.03, z0 - 0.003], [hw - 0.35, y - rise + 0.03, z0 - 0.003], [hw - 0.35, y, z0 - 0.003], [-hw + 0.35, y, z0 - 0.003], [0, 0, 1]);
    BRASS(c); pipe(c, [-hw + 0.3, y - rise + 0.02, z0 - 0.01], [hw - 0.3, y - rise + 0.02, z0 - 0.01], 0.008, 6); }
  const top = n * rise, zl = -n * run; WOOD(c, "oak"); bx(c, -hw, hw, 0, top, zl - land, zl, 0.01); paint(c, "oklch(0.55 0.13 25)", "persian", 0.95); bx(c, -hw + 0.35, hw - 0.35, top, top + 0.006, zl - land + 0.1, zl, 0.002);
  for (const s of [-1, 1]) { const x = s * (hw - 0.05); WOOD(c, "mahog"); for (let i = 0; i <= n; i++) { const y = i * rise, z = -i * run - 0.14; turned(c, x, z, y, y + 0.9, 0.02); } turned(c, x, 0.05, 0, 1.15, 0.05); ball(c, x, 1.18, 0.05, 0.06, 10);
    pipe(c, [x, 1.0, 0.05], [x, top + 0.9, zl - 0.0], 0.035, 10); pipe(c, [x, top + 0.9, zl], [x, top + 0.9, zl - land + 0.1], 0.035, 10); for (let k = 1; k < 5; k++) turned(c, x, zl - k * land / 5, top, top + 0.9, 0.02); } }
const K = { chandelier, pendant, sconce, flush, lamp, bulb, radio, sealed, leaf, placard, stairs };
export function geometry(ctx) { const p = ctx.params ?? {}; (K[p.kind] ?? flush)(ctx, p); }
export function collider(ctx) { const p = ctx.params ?? {};
  if (p.kind === "radio") return box([-0.23, 0.23, 0, 0.34, -0.12, 0.12]);
  if (p.kind === "sealed") return p.style === "gate" ? box([-1.1, 1.1, 0, 2.8, -0.08, 0.08]) : box([-0.55, 0.55, 0, 2.3, -0.08, 0.08]);
  if (p.kind === "leaf") { const w = (p.w ?? 1.1) - 0.04; return box([-w / 2, w / 2, 0, 2.36, -0.03, 0.03]); }
  if (p.kind === "stairs") { const W = p.w ?? 2.6, n = p.n ?? 6, out = []; for (let i = 0; i < n; i++) out.push(box([-W / 2, W / 2, 0, (i + 1) * 0.18, -(i + 1) * 0.28, -i * 0.28])); out.push(box([-W / 2, W / 2, 0, n * 0.18, -n * 0.28 - (p.land ?? 1.4), -n * 0.28])); return out; }
  return null; }
