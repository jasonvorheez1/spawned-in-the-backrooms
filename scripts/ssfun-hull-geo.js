// The S.S. Fun =) seen from outside: a 150 m cruise liner run aground, one smooth hull, tiered white decks, a raked funnel,
// orange lifeboats, rails, and the port gangway down to the ground. params: { length, beam, deck, doorZ, doorY, run, plat, drop }
// Local frame: x along the ship (bow at -x), y up from the keel, z across (port = +z, where the gangway hangs).
let C, COL = false;
const T = { hull: "cdn/texture-weathered-white-painted-ship-hull-steel-rust-streaks.png", deck: "cdn/texture-worn-teak-ship-deck-planks.png", steel: "cdn/texture-scuffed-olive-painted-steel.png" };
function paint(tex, col) { if (COL) return; C.albedo(tex ?? null); C.color(col); }
const smooth = () => { if (!COL) C.smooth(); }, flat = () => { if (!COL) C.flat(); };
// half-beam at station u (0 bow .. 1 stern): a fine entry, a full middle, a rounded transom
const halfAt = (u, B) => B * (u < 0.3 ? Math.pow(Math.sin((u / 0.3) * Math.PI / 2), 0.85) : u > 0.92 ? 0.9 + 0.1 * Math.cos(((u - 0.92) / 0.08) * Math.PI / 2) : 1);
// the section: deck edge -> bilge -> keel, port side; z out, y up. Bilge radius r
function section(w, D, r) {
  const pts = [];
  pts.push([w, D]);
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push([w - r + Math.cos(a) * r, r - Math.sin(a) * r]); }
  pts.push([0, 0]);
  return pts;
}
function hull(P) {
  const L = P.length, B = P.beam / 2, D = P.deck, N = 40, x0 = -L / 2;
  const sec = [];
  for (let i = 0; i <= N; i++) { const u = i / N, w = Math.max(0.05, halfAt(u, B)), sheer = D + 1.6 * Math.pow(1 - u, 2) * (u < 0.35 ? 1 : 0.4); // the bow rises
    const rake = u < 0.12 ? (0.12 - u) * 1.4 : 0; // the stem leans forward at the top
    sec.push(section(w, sheer, Math.min(w * 0.55, 3.2)).map(([z, y]) => [x0 + u * L - rake * (y / D) * 8, y, z])); }
  // bands: antifouling to 3.2 m, a red boot stripe, white above
  const band = (y) => y < 3.2 ? ["oklch(0.3 0.06 160)", null] : y < 3.9 ? ["oklch(0.45 0.16 28)", null] : ["oklch(0.93 0.01 95)", T.hull];
  smooth();
  for (const side of [1, -1]) for (let i = 0; i < N; i++) {
    const a = sec[i], b = sec[i + 1];
    for (let k = 0; k < a.length - 1; k++) {
      const p = [a[k], b[k], b[k + 1], a[k + 1]].map(([x, y, z]) => [x, y, z * side]);
      const [col, tex] = band((a[k][1] + a[k + 1][1]) / 2); paint(tex, col);
      if (side > 0) C.quad(...p[0], ...p[1], ...p[2], ...p[3]); else C.quad(...p[3], ...p[2], ...p[1], ...p[0]);
    }
  }
  flat();
  // the transom
  paint(T.hull, "oklch(0.9 0.01 95)"); const t = sec[N];
  for (let k = 0; k < t.length - 1; k++) { const [x, y0, z0] = t[k], [, y1, z1] = t[k + 1]; C.quad(x, y0, z0, x, y0, -z0, x, y1, -z1, x, y1, z1); }
  // the main deck
  paint(T.deck, "oklch(0.62 0.05 60)");
  for (let i = 0; i < N; i++) { const a = sec[i][0], b = sec[i + 1][0]; C.quad(a[0], a[1], -a[2], a[0], a[1], a[2], b[0], b[1], b[2], b[0], b[1], -b[2]); }
  if (COL) return;
  // rails along the deck edge, posts every few stations
  paint(null, "oklch(0.85 0.01 95)");
  for (const side of [1, -1]) for (let i = 2; i < N; i++) { const a = sec[i][0], b = sec[i + 1][0]; tube([a[0], a[1] + 1.1, a[2] * side * 0.98], [b[0], b[1] + 1.1, b[2] * side * 0.98], 0.05, 0.05, 5, false); if (i % 2 === 0) tube([a[0], a[1], a[2] * side * 0.98], [a[0], a[1] + 1.1, a[2] * side * 0.98], 0.04, 0.04, 5, false); }
}
function tube(a, b, r0, r1, n = 10, caps = true) {
  const d = norm(sub(b, a)), u = norm(Math.abs(d[1]) < 0.99 ? cross(d, [0, 1, 0]) : cross(d, [1, 0, 0])), v = cross(d, u);
  const ring = (c, r, i) => { const t = (i / n) * 6.2832; return [c[0] + (u[0] * Math.cos(t) + v[0] * Math.sin(t)) * r, c[1] + (u[1] * Math.cos(t) + v[1] * Math.sin(t)) * r, c[2] + (u[2] * Math.cos(t) + v[2] * Math.sin(t)) * r]; };
  smooth();
  for (let i = 0; i < n; i++) { const p = [ring(a, r0, i), ring(a, r0, i + 1), ring(b, r1, i + 1), ring(b, r1, i)]; C.quad(...p[3], ...p[2], ...p[1], ...p[0]); if (caps) { C.tri(...b, ...ring(b, r1, i), ...ring(b, r1, i + 1)); C.tri(...a, ...ring(a, r0, i + 1), ...ring(a, r0, i)); } }
  flat();
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
// a deck tier: a stadium (rounded front and back) of length l, width w, from y0 to y1, with a dark window band
function tier(cx, l, w, y0, y1, win = true) {
  const r = w / 2, n = 10, ring = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI; ring.push([cx - l / 2 + r + Math.cos(a) * r, Math.sin(a) * r]); }
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; ring.push([cx + l / 2 - r + Math.cos(a) * r * 0.6, Math.sin(a) * r]); }
  const wall = (ya, yb, col) => { paint(T.hull, col); smooth(); for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; C.quad(p[0], ya, p[1], q[0], ya, q[1], q[0], yb, q[1], p[0], yb, p[1]); } flat(); };
  const h = y1 - y0;
  if (win && !COL) { wall(y0, y0 + h * 0.35, "oklch(0.93 0.01 95)"); wall(y0 + h * 0.35, y0 + h * 0.7, "oklch(0.28 0.03 220)"); wall(y0 + h * 0.7, y1, "oklch(0.93 0.01 95)"); } else wall(y0, y1, "oklch(0.93 0.01 95)");
  paint(T.deck, "oklch(0.8 0.01 95)"); const c = [cx, y1, 0];
  for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; C.tri(...c, q[0], y1, q[1], p[0], y1, p[1]); }
}
function top(P) {
  const D = P.deck, w = P.beam;
  tier(4, 96, w * 0.86, D, D + 3.2); tier(8, 80, w * 0.8, D + 3.2, D + 6.4); tier(10, 60, w * 0.72, D + 6.4, D + 9.4); tier(-14, 18, w * 0.6, D + 9.4, D + 12, true); // the bridge forward
  if (COL) return;
  // the funnel: raked aft, red with a black top
  const fa = [26, D + 9.4, 0], fb = [30, D + 21, 0];
  paint(null, "oklch(0.5 0.17 28)"); tube(fa, fb, 3.4, 2.8, 16); paint(null, "oklch(0.18 0.01 0)"); tube(fb, [30.4, D + 22.2, 0], 2.8, 2.7, 16);
  // lifeboats in davits along both sides of the second tier
  for (const side of [1, -1]) for (let i = 0; i < 7; i++) { const x = -20 + i * 9, z = side * (w * 0.43); paint(null, "oklch(0.7 0.18 50)"); tube([x - 3.4, D + 4.4, z], [x + 3.4, D + 4.4, z], 0.7, 0.7, 12); paint(null, "oklch(0.92 0.01 95)"); tube([x - 3.4, D + 5.0, z], [x + 3.4, D + 5.0, z], 0.55, 0.55, 10); }
  // the mast over the bridge
  paint(null, "oklch(0.88 0.01 95)"); tube([-14, D + 12, 0], [-13, D + 20, 0], 0.18, 0.08, 8);
}
function gangway(P) {
  const z = P.beam / 2, x = P.doorZ, y = P.doorY, run = P.run, drop = Math.max(0.5, P.drop ?? y), plat = P.plat;
  // the shell door, dark, and its landing
  if (!COL) { paint(null, "oklch(0.12 0.01 260)"); C.quad(x - 1.1, y, z + 0.06, x + 1.1, y, z + 0.06, x + 1.1, y + 2.3, z + 0.06, x - 1.1, y + 2.3, z + 0.06); }
  paint(T.steel, "oklch(0.55 0.02 230)");
  const zl = z + plat, foot = y - drop;
  const slab = (a, b, c, d, t = 0.12) => { C.quad(...a, ...b, ...c, ...d); C.quad(a[0], a[1] - t, a[2], d[0], d[1] - t, d[2], c[0], c[1] - t, c[2], b[0], b[1] - t, b[2]); };
  slab([x - 1.1, y, z], [x - 1.1, y, zl], [x + 1.1, y, zl], [x + 1.1, y, z]);
  // the ramp runs aft along the hull, down to the ground
  slab([x + 1.1, y, z + 0.2], [x + 1.1, y, zl], [x + 1.1 + run, foot, zl], [x + 1.1 + run, foot, z + 0.2]);
  if (COL) return;
  paint(null, "oklch(0.75 0.01 95)");
  for (const zz of [z + 0.25, zl - 0.05]) { tube([x + 1.1, y + 1, zz], [x + 1.1 + run, foot + 1, zz], 0.04, 0.04, 6, false); for (let i = 0; i <= 4; i++) { const f = i / 4; tube([x + 1.1 + run * f, y - drop * f, zz], [x + 1.1 + run * f, y - drop * f + 1, zz], 0.035, 0.035, 5, false); } }
}
function run(ctx, col) { C = ctx; COL = col; const P = ctx.params ?? {}; if (P.part === "gangway") gangway(P); else { hull(P); top(P); } if (!col) { ctx.albedo(null); ctx.color(null); } }
export function geometry(ctx) { run(ctx, false); }
export function collider(ctx) { run(ctx, true); }
