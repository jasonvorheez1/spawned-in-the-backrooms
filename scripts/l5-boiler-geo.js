// The Boiler Room's machines (params.kind, w x d footprint, front -Z): riveted fire-tube boilers, coal furnaces with a glowing
// mouth, steam turbines, duplex pumps, water tanks, gauge boards, coal bunkers, condensers, a compressor. Plan: scripts/lib/l5-boiler-plan.js
import { bbox, cyl, torus, dome, rivetRing, wheel, gauge, q } from "./lib/l5-kit.js";
const STEEL = "cdn/texture-riveted-rusty-boiler-steel-plate.png", IRON = "cdn/texture-soot-black-cast-iron.png", BRICK = "cdn/texture-soot-stained-firebrick.png";
const PAINT = "cdn/texture-peeling-green-industrial-paint-metal.png", COAL = "cdn/texture-coal-lumps.png", WOOD = "cdn/texture-worn-hardwood-grain.png", CONC = "cdn/texture-stained-concrete-floor.png";
const H = 6; // ceiling
function paint(ctx, tex, col, rough = 0.6, metal = 0.3) { ctx.albedo(tex); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); }
const brass = (ctx) => paint(ctx, null, "oklch(0.74 0.12 78)", 0.3, 0.85);
const iron = (ctx) => paint(ctx, IRON, "oklch(0.92 0.01 60)", 0.55, 0.6);
// a vertical stack from a point up to the ceiling, flanged, with a damper wheel
function stack(ctx, x, y, z, r) {
  iron(ctx); cyl(ctx, [x, y, z], [x, H, z], r, 14, false);
  for (let k = y + 0.6; k < H - 0.2; k += 1.1) torus(ctx, [x, k, z], [0, 1, 0], r + 0.02, 0.035, 16, 4);
}
function boiler(ctx, w, d) {
  const r = Math.min(w * 0.3, 1.45), cy = r + 0.75, z0 = -d / 2 + 0.35, z1 = d / 2 - 0.15;
  paint(ctx, BRICK, "oklch(0.93 0.03 40)", 0.9, 0); bbox(ctx, [0, 0.35, 0], [w / 2 - 0.05, 0.35, d / 2 - 0.05], 0.04); // brick setting
  for (const z of [z0 + 0.6, 0, z1 - 0.6]) bbox(ctx, [0, 0.75, z], [r * 0.85, 0.4, 0.25], 0.03); // saddles
  paint(ctx, STEEL, "oklch(0.95 0.02 60)", 0.5, 0.55); cyl(ctx, [0, cy, z0], [0, cy, z1], r, ctx.lod <= 2 ? 28 : 14);
  for (let z = z0 + 0.05; z <= z1; z += (z1 - z0) / 4) { torus(ctx, [0, cy, z], [0, 0, 1], r + 0.01, 0.03, 28, 4); rivetRing(ctx, [0, cy, z], [0, 0, 1], r + 0.012, 30); }
  // front plate: firebox doors, gauge glass, pressure gauges, safety plate
  iron(ctx); cyl(ctx, [0, cy, z0 - 0.08], [0, cy, z0], r + 0.08, 28); rivetRing(ctx, [0, cy, z0 - 0.09], [0, 0, -1], r - 0.05, 26, 0.03);
  for (const s of [-1, 1]) { bbox(ctx, [s * r * 0.4, cy - r * 0.35, z0 - 0.13], [r * 0.3, r * 0.25, 0.05], 0.02); paint(ctx, null, "oklch(0.75 0.17 50)", 0.4, 0); ctx.emissive("oklch(0.75 0.2 45)"); bbox(ctx, [s * r * 0.4, cy - r * 0.35, z0 - 0.185], [r * 0.18, 0.025, 0.01], 0.003); ctx.emissive(null); iron(ctx); }
  gauge(ctx, [-r * 0.35, cy + r * 0.45, z0 - 0.1], [0, 0, -1], 0.18, 0.7); gauge(ctx, [r * 0.35, cy + r * 0.45, z0 - 0.1], [0, 0, -1], 0.14, 0.92);
  paint(ctx, null, "oklch(0.85 0.05 90)", 0.1, 0); cyl(ctx, [0, cy - 0.1, z0 - 0.12], [0, cy + 0.6, z0 - 0.12], 0.035, 8); // water glass
  brass(ctx); bbox(ctx, [0, cy + 0.15, z0 - 0.1], [0.32, 0.12, 0.012], 0.01);
  // steam dome, safety valve, stack
  paint(ctx, STEEL, "oklch(0.95 0.02 60)", 0.5, 0.55); const dz = z0 + (z1 - z0) * 0.35;
  cyl(ctx, [0, cy + r * 0.8, dz], [0, cy + r + 0.45, dz], 0.45, 18, false); dome(ctx, [0, cy + r + 0.45, dz], [0, 1, 0], 0.45, 0.6); torus(ctx, [0, cy + r + 0.45, dz], [0, 1, 0], 0.47, 0.035);
  brass(ctx); cyl(ctx, [0.6, cy + r * 0.9, dz + 0.6], [0.6, cy + r + 0.55, dz + 0.6], 0.09, 10); dome(ctx, [0.6, cy + r + 0.55, dz + 0.6], [0, 1, 0], 0.13, 0.8);
  stack(ctx, 0, cy + r * 0.7, z1 - 0.7, 0.42);
  wheel(ctx, [-r - 0.12, cy + 0.2, 0.3], [-1, 0, 0], 0.32); iron(ctx); cyl(ctx, [-r + 0.1, cy + 0.2, 0.3], [-r - 0.12, cy + 0.2, 0.3], 0.06, 8);
}
function furnace(ctx, w, d) {
  const h = 3.4, fz = -d / 2 + 0.3, mw = 1.5, mh = 1.05, my = 0.65;
  paint(ctx, BRICK, "oklch(0.95 0.03 40)", 0.92, 0); bbox(ctx, [0, h / 2, 0.15], [w / 2, h / 2, d / 2 - 0.15], 0.06);
  for (let y = 0.6; y < h; y += 1.2) { iron(ctx); bbox(ctx, [0, y, 0.15], [w / 2 + 0.03, 0.06, d / 2 - 0.12], 0.015); } // iron binding bands
  // front iron face around the mouth
  iron(ctx); const pw = w / 2 - 0.2, z = fz - 0.05;
  bbox(ctx, [0, my / 2, z], [pw, my / 2, 0.06], 0.02); bbox(ctx, [0, (my + mh + h - 0.3) / 2, z], [pw, (h - 0.3 - my - mh) / 2, 0.06], 0.02);
  for (const s of [-1, 1]) bbox(ctx, [s * (mw / 2 + (pw - mw / 2) / 2), my + mh / 2, z], [(pw - mw / 2) / 2, mh / 2, 0.06], 0.02);
  rivetRing(ctx, [0, my + mh / 2, z - 0.07], [0, 0, -1], 1.15, 22, 0.03);
  bbox(ctx, [0, my + mh + 0.12, z - 0.08], [mw / 2 + 0.12, 0.08, 0.05], 0.02); // lintel
  // the mouth: dark throat, coals glowing at the back and floor
  paint(ctx, IRON, "oklch(0.35 0.02 40)", 0.9, 0);
  for (const s of [-1, 1]) bbox(ctx, [s * (mw / 2 + 0.02), my + mh / 2, z + 0.55], [0.02, mh / 2, 0.55], 0);
  bbox(ctx, [0, my + mh + 0.02, z + 0.55], [mw / 2, 0.02, 0.55], 0);
  ctx.albedo(null); ctx.color("oklch(0.7 0.19 45)"); ctx.emissive("oklch(0.9 0.2 50)"); q(ctx, [-mw / 2, my, z + 1.05], [mw / 2, my, z + 1.05], [mw / 2, my + mh, z + 1.05], [-mw / 2, my + mh, z + 1.05], [0, 0, -1]);
  for (let i = 0; i < (ctx.lod <= 2 ? 14 : 5); i++) { const a = ctx.random(); ctx.emissive(a > 0.5 ? "oklch(0.95 0.2 70)" : "oklch(0.7 0.22 35)"); bbox(ctx, [(ctx.random() - 0.5) * mw * 0.9, my + 0.08 + ctx.random() * 0.12, z + 0.2 + ctx.random() * 0.8], [0.09, 0.07, 0.08], 0.03); }
  ctx.emissive(null);
  // the door leaf hung open on its hinge, its latch, an ash door below
  iron(ctx); const hx = -mw / 2 - 0.08; bbox(ctx, [hx - 0.05, my + mh / 2, z - 0.7], [0.04, mh / 2 + 0.05, 0.75], 0.02); rivetRing(ctx, [hx - 0.1, my + mh / 2, z - 0.7], [-1, 0, 0], 0.35, 10, 0.025);
  for (const y of [my + 0.2, my + mh - 0.2]) cyl(ctx, [hx, y, z - 0.08], [hx, y + 0.12, z - 0.08], 0.05, 8);
  bbox(ctx, [0, 0.3, z - 0.07], [0.5, 0.2, 0.03], 0.015); brass(ctx); cyl(ctx, [0.35, 0.3, z - 0.12], [0.35, 0.3, z - 0.2], 0.03, 6);
  // hood and stack, a gauge and the damper wheel
  iron(ctx); cyl(ctx, [0, h, 0.15], [0, h + 0.7, 0.15], [Math.min(w, d) * 0.38, 0.5], 18); stack(ctx, 0, h + 0.7, 0.15, 0.5);
  gauge(ctx, [pw - 0.35, h - 0.6, z - 0.08], [0, 0, -1], 0.17, 0.95); wheel(ctx, [-pw + 0.4, h - 0.6, z - 0.15], [0, 0, -1], 0.26);
  // coal spilled at its feet
  paint(ctx, COAL, "oklch(0.6 0.01 60)", 0.8, 0);
  for (let i = 0; i < (ctx.lod <= 2 ? 10 : 3); i++) bbox(ctx, [(ctx.random() - 0.5) * 1.6, 0.05, fz - 0.3 - ctx.random() * 0.4], [0.07 + ctx.random() * 0.05, 0.05, 0.07], 0.03);
}
function turbine(ctx, w, d) {
  const L = w - 0.4, r = Math.min(d * 0.33, 1.1), cy = 0.55 + r;
  paint(ctx, CONC, "oklch(0.9 0.01 80)", 0.95, 0); bbox(ctx, [0, 0.25, 0], [w / 2 - 0.1, 0.25, Math.min(d / 2 - 0.1, r + 0.4)], 0.05);
  paint(ctx, PAINT, "oklch(0.95 0.03 150)", 0.5, 0.4); cyl(ctx, [-L / 2 + 0.6, cy, 0], [L / 2 - 1.2, cy, 0], [r * 0.75, r], 24);
  for (let x = -L / 2 + 0.6; x <= L / 2 - 1.2; x += (L - 1.8) / 4) { torus(ctx, [x, cy, 0], [1, 0, 0], r * (0.75 + 0.25 * (x + L / 2 - 0.6) / (L - 1.8)) + 0.02, 0.04, 24, 4); rivetRing(ctx, [x, cy, 0], [1, 0, 0], r * (0.75 + 0.25 * (x + L / 2 - 0.6) / (L - 1.8)) + 0.03, 20); }
  bbox(ctx, [0, cy, 0], [L / 2 - 0.6, 0.06, r + 0.08], 0.02); // split-casing flange
  dome(ctx, [-L / 2 + 0.6, cy, 0], [-1, 0, 0], r * 0.75, 0.35);
  // flywheel / generator end
  iron(ctx); cyl(ctx, [L / 2 - 1.2, cy, 0], [L / 2 - 0.4, cy, 0], 0.18, 10); cyl(ctx, [L / 2 - 0.85, cy, 0], [L / 2 - 0.55, cy, 0], r * 1.05, 28); torus(ctx, [L / 2 - 0.7, cy, 0], [1, 0, 0], r * 1.05, 0.06, 28, 4);
  paint(ctx, PAINT, "oklch(0.85 0.03 150)", 0.5, 0.4); bbox(ctx, [L / 2 - 0.2, cy * 0.75, 0], [0.25, cy * 0.75 - 0.1, r * 0.8], 0.06);
  // governor on top, steam inlet up to the ceiling, gauges
  brass(ctx); const gx = -L / 2 + 1.3, gy = cy + r * 0.8; cyl(ctx, [gx, gy, 0], [gx, gy + 0.8, 0], 0.04, 6);
  for (const s of [-1, 1]) { cyl(ctx, [gx, gy + 0.7, 0], [gx + s * 0.25, gy + 0.45, 0], 0.02, 5); dome(ctx, [gx + s * 0.25, gy + 0.45, 0], [0, -1, 0], 0.09, 1, 10, 3); dome(ctx, [gx + s * 0.25, gy + 0.45, 0], [0, 1, 0], 0.09, 1, 10, 3); }
  iron(ctx); const ix = -L / 2 + 2.2; cyl(ctx, [ix, cy + r * 0.6, 0], [ix, H, 0], 0.2, 14, false); wheel(ctx, [ix, cy + r + 0.9, -0.35], [0, 0, -1], 0.3);
  for (let y = cy + r + 0.4; y < H; y += 1.0) torus(ctx, [ix, y, 0], [0, 1, 0], 0.22, 0.04, 14, 4);
  gauge(ctx, [ix + 0.6, cy + r * 0.5, -r - 0.02], [0, 0, -1], 0.15, 0.4);
}
function pump(ctx, w, d) {
  paint(ctx, CONC, "oklch(0.9 0.01 80)", 0.95, 0); bbox(ctx, [0, 0.2, 0], [w / 2 - 0.15, 0.2, d / 2 - 0.15], 0.04);
  paint(ctx, PAINT, "oklch(0.92 0.04 25)", 0.55, 0.4); bbox(ctx, [0, 0.75, 0], [0.9, 0.35, 0.55], 0.06);
  for (const s of [-0.45, 0.45]) { cyl(ctx, [s, 1.1, 0], [s, 2.2, 0], 0.3, 18); torus(ctx, [s, 2.2, 0], [0, 1, 0], 0.32, 0.04); rivetRing(ctx, [s, 2.23, 0], [0, 1, 0], 0.24, 10, 0.02); iron(ctx); cyl(ctx, [s, 2.2, 0], [s, 2.75, 0], 0.05, 8); paint(ctx, PAINT, "oklch(0.92 0.04 25)", 0.55, 0.4); }
  iron(ctx); bbox(ctx, [0, 2.8, 0], [0.7, 0.05, 0.08], 0.02); cyl(ctx, [0.9, 0.8, -0.65], [0.9, 0.8, 0.65], 0.08, 10);
  cyl(ctx, [0.95, 0.8, 0.0], [1.0, 0.8, 0.0], 0.65, 24); torus(ctx, [0.98, 0.8, 0], [1, 0, 0], 0.65, 0.05, 24, 4);
  cyl(ctx, [0, 1.0, 0.55], [0, 1.0, d / 2], 0.14, 10, false); cyl(ctx, [0, 1.0, d / 2 - 0.15], [0, H, d / 2 - 0.15], 0.14, 10, false);
  gauge(ctx, [-0.6, 1.5, -0.57], [0, 0, -1], 0.13, 0.5); wheel(ctx, [-0.95, 1.0, 0], [-1, 0, 0], 0.22);
}
function tank(ctx, w, d) {
  const r = Math.min(w, d) * 0.4, h = 4.3;
  iron(ctx); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cyl(ctx, [a * r * 0.6, 0, b * r * 0.6], [a * r * 0.6, 0.8, b * r * 0.6], 0.08, 8);
  paint(ctx, STEEL, "oklch(0.93 0.03 60)", 0.5, 0.55); cyl(ctx, [0, 0.7, 0], [0, h, 0], r, 26, false); dome(ctx, [0, 0.7, 0], [0, -1, 0], r, 0.25); dome(ctx, [0, h, 0], [0, 1, 0], r, 0.3);
  for (let y = 1.0; y < h; y += 0.85) { torus(ctx, [0, y, 0], [0, 1, 0], r + 0.01, 0.03, 26, 4); rivetRing(ctx, [0, y, 0], [0, 1, 0], r + 0.015, 28); }
  paint(ctx, null, "oklch(0.88 0.06 95)", 0.1, 0); cyl(ctx, [0, 1.1, -r - 0.06], [0, 3.6, -r - 0.06], 0.04, 8); brass(ctx); for (const y of [1.1, 3.6]) cyl(ctx, [0, y, -r], [0, y, -r - 0.1], 0.03, 6);
  iron(ctx); cyl(ctx, [0, h + r * 0.25, 0], [0, H, 0], 0.16, 12, false); wheel(ctx, [r * 0.7, 1.2, -r * 0.7], [0.7, 0, -0.7], 0.22);
  brass(ctx); bbox(ctx, [0, 2.3, -r - 0.02], [0.3, 0.16, 0.01], 0.008);
}
function panel(ctx, w, d) {
  const pw = w / 2 - 0.1, h = 2.7;
  paint(ctx, PAINT, "oklch(0.88 0.04 160)", 0.55, 0.35); bbox(ctx, [0, h / 2, 0], [pw, h / 2, 0.25], 0.05); bbox(ctx, [0, 0.1, 0], [pw + 0.05, 0.1, 0.32], 0.03);
  brass(ctx); bbox(ctx, [0, h - 0.18, -0.26], [Math.min(pw - 0.1, 1.2), 0.1, 0.01], 0.008);
  const cols = Math.max(2, Math.floor(pw * 2 / 0.6));
  for (let c = 0; c < cols; c++) for (let r = 0; r < 3; r++) { const x = -pw + 0.3 + c * ((2 * pw - 0.6) / Math.max(1, cols - 1)); gauge(ctx, [x, 1.0 + r * 0.5, -0.26], [0, 0, -1], r === 1 ? 0.17 : 0.12, ctx.random()); }
  iron(ctx); for (let c = 0; c < cols; c += 2) { const x = -pw + 0.3 + c * ((2 * pw - 0.6) / Math.max(1, cols - 1)); cyl(ctx, [x, h, 0.1], [x, H, 0.1], 0.07, 8, false); }
  for (let c = 0; c < cols; c++) { const x = -pw + 0.3 + c * ((2 * pw - 0.6) / Math.max(1, cols - 1)); paint(ctx, null, c % 2 ? "oklch(0.55 0.18 28)" : "oklch(0.3 0.02 60)", 0.5, 0.3); bbox(ctx, [x, 0.65, -0.3], [0.03, 0.09, 0.04], 0.01); }
  paint(ctx, null, "oklch(0.75 0.17 30)", 0.5, 0); ctx.emissive("oklch(0.85 0.2 35)"); for (let c = 1; c < cols; c += 2) bbox(ctx, [-pw + 0.3 + c * ((2 * pw - 0.6) / Math.max(1, cols - 1)), 2.25, -0.27], [0.03, 0.03, 0.01], 0.01); ctx.emissive(null);
}
function coal(ctx, w, d) {
  const hw = w / 2 - 0.1, hd = d / 2 - 0.1, h = 1.2;
  paint(ctx, WOOD, "oklch(0.8 0.05 60)", 0.8, 0);
  for (const s of [-1, 1]) { bbox(ctx, [s * hw, h / 2, 0], [0.06, h / 2, hd], 0.02); bbox(ctx, [0, h / 2, s * hd], [hw, h / 2, 0.06], 0.02); }
  iron(ctx); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bbox(ctx, [a * hw, h / 2, b * hd], [0.08, h / 2 + 0.02, 0.08], 0.02);
  paint(ctx, COAL, "oklch(0.55 0.01 60)", 0.75, 0.1); ctx.smooth();
  const N = ctx.lod <= 2 ? 10 : 5, Y = (i, j) => { const u = i / N, v = j / N; return 0.7 + 0.55 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) + 0.08 * ctx.noise2d(u * 7, v * 7); };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const P = (a, b) => [-hw + 2 * hw * a / N, Y(a, b), -hd + 2 * hd * b / N]; q(ctx, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), [0, 1, 0]); }
  ctx.flat(); for (let i = 0; i < (ctx.lod <= 2 ? 16 : 4); i++) bbox(ctx, [(ctx.random() - 0.5) * hw * 1.6, 1.0 + ctx.random() * 0.3, (ctx.random() - 0.5) * hd * 1.6], [0.08, 0.06, 0.07], 0.03);
  // the shovel standing in it
  paint(ctx, WOOD, "oklch(0.85 0.06 60)", 0.7, 0); cyl(ctx, [hw * 0.5, 0.9, -hd * 0.3], [hw * 0.5 + 0.2, 2.0, -hd * 0.3 - 0.15], 0.025, 6); iron(ctx); bbox(ctx, [hw * 0.5 - 0.05, 0.85, -hd * 0.3 + 0.03], [0.14, 0.18, 0.015], 0.01);
}
function condenser(ctx, w, d) {
  const L = Math.max(w, d) - 0.4, r = Math.min(w, d) * 0.32, cy = r + 0.6, along = w >= d;
  const A = (s, y = cy, o = 0) => (along ? [s, y, o] : [o, y, s]), ax = along ? [1, 0, 0] : [0, 0, 1];
  iron(ctx); for (const s of [-L / 3, L / 3]) bbox(ctx, A(s, 0.4), along ? [0.18, 0.4, r * 0.8] : [r * 0.8, 0.4, 0.18], 0.03);
  paint(ctx, STEEL, "oklch(0.93 0.03 60)", 0.5, 0.55); cyl(ctx, A(-L / 2 + 0.3), A(L / 2 - 0.3), r, 24);
  for (const s of [-1, 1]) { iron(ctx); cyl(ctx, A(s * (L / 2 - 0.3)), A(s * (L / 2 - 0.12)), r + 0.08, 24); rivetRing(ctx, A(s * (L / 2 - 0.1)), ax.map((v) => v * s), r - 0.02, 16, 0.03); dome(ctx, A(s * (L / 2 - 0.12)), ax.map((v) => v * s), r * 0.8, 0.3); }
  for (let s = -L / 2 + 0.8; s < L / 2 - 0.5; s += 0.9) torus(ctx, A(s), ax, r + 0.01, 0.03, 24, 4);
  iron(ctx); cyl(ctx, A(L / 4, cy + r * 0.7), A(L / 4, H), 0.15, 12, false); cyl(ctx, A(-L / 4, cy - r * 0.7), A(-L / 4, 0.05, along ? -r - 0.3 : 0), 0.12, 10);
  gauge(ctx, along ? [0, cy + 0.2, -r - 0.03] : [-r - 0.03, cy + 0.2, 0], along ? [0, 0, -1] : [-1, 0, 0], 0.15, 0.3);
}
function compressor(ctx, w, d) {
  paint(ctx, CONC, "oklch(0.9 0.01 80)", 0.95, 0); bbox(ctx, [0, 0.2, 0], [w / 2 - 0.15, 0.2, d / 2 - 0.15], 0.04);
  paint(ctx, PAINT, "oklch(0.9 0.05 230)", 0.5, 0.4); bbox(ctx, [-w / 4, 1.0, 0], [w / 4 - 0.2, 0.6, d / 2 - 0.4], 0.12); cyl(ctx, [-w / 2 + 0.35, 1.0, 0], [-w / 2 + 0.15, 1.0, 0], 0.5, 18);
  for (let i = 0; i < 6; i++) torus(ctx, [-w / 4 - 0.6 + i * 0.25, 1.0, 0], [1, 0, 0], 0.62, 0.03, 16, 4);
  iron(ctx); for (const x of [w / 8, w / 4 + 0.3]) { cyl(ctx, [x, 0.4, 0], [x, 1.9, 0], 0.32, 16); for (let y = 1.0; y < 1.9; y += 0.12) torus(ctx, [x, y, 0], [0, 1, 0], 0.34, 0.025, 16, 3); }
  cyl(ctx, [w / 2 - 0.35, 1.1, -0.6], [w / 2 - 0.35, 1.1, 0.6], 0.07, 8); cyl(ctx, [w / 2 - 0.4, 1.1, -0.2], [w / 2 - 0.3, 1.1, -0.2], 0.6, 22);
  paint(ctx, null, "oklch(0.25 0.01 60)", 0.8, 0); for (const y of [0.55, 1.65]) bbox(ctx, [0, y, -0.2], [w / 2 - 0.4, 0.04, 0.03], 0.01);
  cyl(ctx, [w / 8, 1.9, 0], [w / 8, H, 0], 0.1, 10, false); gauge(ctx, [-w / 4, 1.3, -d / 2 + 0.38], [0, 0, -1], 0.14, 0.8);
}
const KINDS = { boiler, furnace, turbine, pump, tank, panel, coal, condenser, compressor };
export function geometry(ctx) {
  const p = ctx.params ?? {}, f = KINDS[p.kind] ?? boiler;
  f(ctx, p.w ?? 2.5, p.d ?? 2.5);
}
const HT = { boiler: 3.6, furnace: 3.4, turbine: 2.8, pump: 2.8, tank: 4.5, panel: 2.7, coal: 1.3, condenser: 2.4, compressor: 2.0 };
export function collider(ctx) {
  const p = ctx.params ?? {}, w = p.w ?? 2.5, d = p.d ?? 2.5, h = HT[p.kind] ?? 3;
  if (p.kind === "panel") return { kind: "box", width: w - 0.1, height: h, depth: 0.7, center: [0, h / 2, 0] };
  if (p.kind === "tank") return { kind: "cylinder", radiusTop: Math.min(w, d) * 0.4, radiusBottom: Math.min(w, d) * 0.4, height: h, center: [0, h / 2, 0] };
  return { kind: "box", width: w - 0.1, height: h, depth: d - 0.1, center: [0, h / 2, 0] };
}
