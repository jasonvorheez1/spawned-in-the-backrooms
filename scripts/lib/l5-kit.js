// Small mesh kit for the Boiler Room's machines: oriented quads, bevelled boxes, cylinders between two points,
// flanges (tori), domes, rivet rings, valve wheels, gauges. Every face is wound outward so smooth shading reads.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const V = { sub, add, mul, dot, crs, nrm };
// a quad wound so its face points along n
export function q(ctx, a, b, c, d, n) {
  const f = crs(sub(b, a), sub(c, a));
  if (dot(f, n) >= 0) ctx.quad(...a, ...b, ...c, ...d); else ctx.quad(...d, ...c, ...b, ...a);
}
export function t(ctx, a, b, c, n) { const f = crs(sub(b, a), sub(c, a)); if (dot(f, n) >= 0) ctx.tri(...a, ...b, ...c); else ctx.tri(...c, ...b, ...a); }
function basis(ax) { const w = nrm(ax), h = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = nrm(crs(h, w)), v = crs(w, u); return [u, v, w]; }
// a box centred c with half sizes h, every edge chamfered by e
export function bbox(ctx, c, h, e = 0.03) {
  const [cx, cy, cz] = c, [hx, hy, hz] = h; e = Math.min(e, hx * 0.45, hy * 0.45, hz * 0.45);
  const P = (sx, sy, sz, ix, iy, iz) => [cx + sx * (hx - (ix ? e : 0)), cy + sy * (hy - (iy ? e : 0)), cz + sz * (hz - (iz ? e : 0))];
  for (const s of [1, -1]) {
    q(ctx, P(s, -1, -1, 0, 1, 1), P(s, 1, -1, 0, 1, 1), P(s, 1, 1, 0, 1, 1), P(s, -1, 1, 0, 1, 1), [s, 0, 0]);
    q(ctx, P(-1, s, -1, 1, 0, 1), P(1, s, -1, 1, 0, 1), P(1, s, 1, 1, 0, 1), P(-1, s, 1, 1, 0, 1), [0, s, 0]);
    q(ctx, P(-1, -1, s, 1, 1, 0), P(1, -1, s, 1, 1, 0), P(1, 1, s, 1, 1, 0), P(-1, 1, s, 1, 1, 0), [0, 0, s]);
  }
  if (e <= 0.001) return;
  for (const a of [1, -1]) for (const b of [1, -1]) {
    q(ctx, P(a, b, -1, 0, 1, 1), P(a, b, 1, 0, 1, 1), P(a, b, 1, 1, 0, 1), P(a, b, -1, 1, 0, 1), [a, b, 0]);
    q(ctx, P(a, -1, b, 0, 1, 1), P(a, 1, b, 0, 1, 1), P(a, 1, b, 1, 1, 0), P(a, -1, b, 1, 1, 0), [a, 0, b]);
    q(ctx, P(-1, a, b, 1, 0, 1), P(1, a, b, 1, 0, 1), P(1, a, b, 1, 1, 0), P(-1, a, b, 1, 1, 0), [0, a, b]);
    for (const s of [1, -1]) t(ctx, P(a, b, s, 0, 1, 1), P(a, b, s, 1, 0, 1), P(a, b, s, 1, 1, 0), [a, b, s]);
  }
}
// a cylinder from a to b, radius r (or [ra, rb]), n sides, capped
export function cyl(ctx, a, b, r, n = 16, caps = true) {
  const [u, v, w] = basis(sub(b, a)), [ra, rb] = Array.isArray(r) ? r : [r, r];
  const ring = (c, rr, k) => { const g = (k / n) * Math.PI * 2; return add(c, add(mul(u, Math.cos(g) * rr), mul(v, Math.sin(g) * rr))); };
  ctx.smooth();
  for (let k = 0; k < n; k++) { const m = (k + 0.5) / n * Math.PI * 2, out = add(mul(u, Math.cos(m)), mul(v, Math.sin(m))); q(ctx, ring(a, ra, k), ring(a, ra, k + 1), ring(b, rb, k + 1), ring(b, rb, k), out); }
  ctx.flat();
  if (caps) for (let k = 0; k < n; k++) { t(ctx, a, ring(a, ra, k), ring(a, ra, k + 1), mul(w, -1)); t(ctx, b, ring(b, rb, k), ring(b, rb, k + 1), w); }
}
// a torus (flange, bandage ring, wheel rim) round centre c about axis ax
export function torus(ctx, c, ax, R, r, n = 20, m = 6) {
  const [u, v, w] = basis(ax), P = (i, j) => { const a = (i / n) * Math.PI * 2, b = (j / m) * Math.PI * 2, d = add(mul(u, Math.cos(a)), mul(v, Math.sin(a))); return [add(c, add(mul(d, R + r * Math.cos(b)), mul(w, r * Math.sin(b)))), add(mul(d, Math.cos(b)), mul(w, Math.sin(b)))]; };
  ctx.smooth();
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const [a, na] = P(i + 0.5, j + 0.5); q(ctx, P(i, j)[0], P(i + 1, j)[0], P(i + 1, j + 1)[0], P(i, j + 1)[0], na); }
  ctx.flat();
}
// a dome (half sphere, squashed by k) on centre c facing ax
export function dome(ctx, c, ax, r, k = 1, n = 14, m = 5) {
  const [u, v, w] = basis(ax), P = (i, j) => { const a = (i / n) * Math.PI * 2, b = (j / m) * Math.PI / 2; return add(c, add(mul(add(mul(u, Math.cos(a)), mul(v, Math.sin(a))), r * Math.cos(b)), mul(w, r * k * Math.sin(b)))); };
  ctx.smooth();
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) q(ctx, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), nrm(sub(P(i + 0.5, j + 0.5), c)));
  ctx.flat();
}
// rivets: little domes in a ring of radius R round c about ax (finest level only)
export function rivetRing(ctx, c, ax, R, count, rr = 0.025) {
  if (ctx.lod > 1) return;
  const [u, v, w] = basis(ax);
  for (let i = 0; i < count; i++) { const a = (i / count) * Math.PI * 2, d = add(mul(u, Math.cos(a)), mul(v, Math.sin(a))); dome(ctx, add(c, mul(d, R)), d, rr, 0.7, 5, 2); }
}
// a hand wheel: rim, hub, four spokes, on its stem
export function wheel(ctx, c, ax, R) {
  const [u, v] = basis(ax);
  torus(ctx, c, ax, R, R * 0.09, 18, 5); cyl(ctx, sub(c, mul(nrm(ax), 0.05)), add(c, mul(nrm(ax), 0.05)), R * 0.18, 8);
  for (const d of [u, v, mul(u, -1), mul(v, -1)]) cyl(ctx, c, add(c, mul(d, R)), R * 0.05, 5, false);
}
// a round gauge: brass bezel, pale face, black needle at angle a (0..1 of sweep)
export function gauge(ctx, c, ax, r, a = 0.6) {
  const [u, v, w] = basis(ax);
  ctx.color("oklch(0.72 0.11 80)"); ctx.metalness(0.8); ctx.roughness(0.35);
  cyl(ctx, sub(c, mul(w, 0.04)), c, r * 1.1, 16); torus(ctx, add(c, mul(w, 0.005)), ax, r, r * 0.1, 16, 4);
  ctx.metalness(0); ctx.roughness(0.6); ctx.color("oklch(0.9 0.03 90)"); ctx.emissive("oklch(0.25 0.03 80)");
  cyl(ctx, add(c, mul(w, 0.002)), add(c, mul(w, 0.006)), r * 0.92, 16); ctx.emissive(null);
  ctx.color("oklch(0.55 0.2 28)"); const g = Math.PI * (1.25 - a * 1.5), d = add(mul(u, Math.cos(g)), mul(v, Math.sin(g)));
  const p = add(c, mul(w, 0.012)), side = mul(crs(w, d), r * 0.04);
  t(ctx, add(p, side), sub(p, side), add(p, mul(d, r * 0.8)), w);
}
