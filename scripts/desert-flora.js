// Level 169's ground cover, one plant file: ctx.params.kind picks the piece. Feet at y = 0, +Y up.
//   "boulder" a weathered sandstone boulder, lumpy, flat-bottomed, darker underneath
//   "pebbles" a scatter of fist-sized stones
//   "sage"    a grey-green sagebrush mound of forked twigs and leaf clumps
//   "yucca"   a spiky yucca rosette, a dry stalk on some
//   "dead"    a dead grey shrub of bare branches
const ok = (l, c, h) => `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
function lump(ctx, cx, cz, R, H, sec, rings, hue, base) {
  const k = [...Array(sec)].map(() => 0.72 + ctx.random() * 0.5), q = [...Array(sec)].map(() => 0.8 + ctx.random() * 0.4);
  const P = (r, s) => { // r 0 = crown, rings = foot
    const t = r / rings, a = (s / sec) * Math.PI * 2, ph = t * Math.PI * 0.5;
    const rr = R * Math.sin(ph) * k[s % sec] * (t > 0.85 ? 0.97 : 1), y = H * (Math.cos(ph) * 0.9 + 0.1) * q[(s + 2) % sec] ** (1 - t);
    return [cx + Math.cos(a) * rr, Math.max(-0.08, t >= 1 ? -0.08 : y), cz + Math.sin(a) * rr * 0.85];
  };
  for (let r = 0; r < rings; r++) for (let s = 0; s < sec; s++) {
    const t = (r + 0.5) / rings, a = P(r, s), b = P(r, s + 1), c = P(r + 1, s + 1), d = P(r + 1, s);
    ctx.color(ok(base - t * 0.14 + (ctx.random() - 0.5) * 0.04, 0.07 + t * 0.02, hue + (ctx.random() - 0.5) * 8));
    ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  }
}
function boulder(ctx) {
  const R = 0.5 + ctx.random() * 0.9, H = R * (0.45 + ctx.random() * 0.35), lo = ctx.lod >= 3;
  lump(ctx, 0, 0, R, H, lo ? 6 : 11, lo ? 2 : 5, 38 + ctx.random() * 14, 0.6);
  if (!lo && ctx.random() < 0.5) lump(ctx, R * 0.7, R * 0.3, R * 0.45, H * 0.6, 8, 3, 42, 0.56); // a broken-off piece leaning on it
}
function pebbles(ctx) {
  const n = ctx.lod >= 3 ? 2 : 6;
  for (let i = 0; i < n; i++) { const a = ctx.random() * 6.28, d = ctx.random() * 0.5, r = 0.05 + ctx.random() * 0.09; lump(ctx, Math.cos(a) * d, Math.sin(a) * d, r, r * 0.6, 6, 2, 40 + ctx.random() * 20, 0.58); }
}
function twig(ctx, x0, y0, z0, x1, y1, z1, r) {
  const sx = z1 - z0, sz = -(x1 - x0), L = Math.hypot(sx, sz) || 1, px = (sx / L) * r, pz = (sz / L) * r;
  ctx.quad(x0 - px, y0, z0 - pz, x0 + px, y0, z0 + pz, x1 + px * 0.4, y1, z1 + pz * 0.4, x1 - px * 0.4, y1, z1 - pz * 0.4);
  ctx.quad(x0, y0 - r, z0, x0, y0 + r, z0, x1, y1 + r * 0.4, z1, x1, y1 - r * 0.4, z1);
}
function sage(ctx) {
  const R = 0.35 + ctx.random() * 0.4, H = R * (0.9 + ctx.random() * 0.4), lo = ctx.lod >= 3;
  ctx.color(ok(0.36, 0.03, 55));
  const st = lo ? 3 : 7;
  for (let i = 0; i < st; i++) { const a = (i / st) * 6.28 + ctx.random(), d = R * (0.5 + ctx.random() * 0.4); twig(ctx, 0, 0, 0, Math.cos(a) * d, H * (0.5 + ctx.random() * 0.4), Math.sin(a) * d, 0.02); }
  const cl = lo ? 4 : 11;
  for (let i = 0; i < cl; i++) { // leaf clumps: small lumps up in the crown
    const a = ctx.random() * 6.28, d = R * Math.sqrt(ctx.random()) * 0.85, y = H * (0.45 + ctx.random() * 0.45), r = R * (0.25 + ctx.random() * 0.2);
    lump(ctx, Math.cos(a) * d, Math.sin(a) * d, r, r * 0.8, lo ? 5 : 7, 2, 120 + ctx.random() * 30, 0.6 + ctx.random() * 0.08);
    // lift the lump: lump() draws at ground; shift by drawing a second offset copy is costly, so the twigs reach it instead
    if (y > 0 && !lo) twig(ctx, 0, 0, 0, Math.cos(a) * d, y, Math.sin(a) * d, 0.012);
  }
}
function yucca(ctx) {
  const n = ctx.lod >= 3 ? 10 : 26, L = 0.5 + ctx.random() * 0.35;
  for (let i = 0; i < n; i++) {
    const a = (i * 2.399) % 6.283, up = 0.35 + (i / n) * 0.55, len = L * (0.7 + ctx.random() * 0.4);
    const dx = Math.cos(a) * Math.cos(up * 1.4) * len, dz = Math.sin(a) * Math.cos(up * 1.4) * len, dy = Math.sin(up * 1.4) * len + 0.05;
    const w = 0.025, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    ctx.color(ok(0.5 + ctx.random() * 0.08, 0.09, 115 + ctx.random() * 15));
    ctx.tri(px, 0.04, pz, -px, 0.04, -pz, dx, dy, dz); ctx.tri(-px, 0.04, -pz, px, 0.04, pz, dx, dy, dz);
  }
  if (ctx.random() < 0.4) { ctx.color(ok(0.55, 0.05, 70)); twig(ctx, 0, 0.2, 0, 0.05, 1.6 + ctx.random() * 0.8, 0.03, 0.025); }
}
function dead(ctx) {
  const H = 0.5 + ctx.random() * 0.6, lo = ctx.lod >= 3;
  ctx.color(ok(0.62, 0.015, 70));
  const br = (x, y, z, a, len, r, d) => {
    const tilt = 0.5 + ctx.random() * 0.5, x1 = x + Math.cos(a) * len * tilt, z1 = z + Math.sin(a) * len * tilt, y1 = y + len * (1 - tilt * 0.4);
    twig(ctx, x, y, z, x1, y1, z1, r);
    if (d > 0 && !(lo && d < 2)) for (let i = 0; i < 2; i++) br(x1, y1, z1, a + (ctx.random() - 0.5) * 1.8, len * 0.6, r * 0.6, d - 1);
  };
  for (let i = 0; i < 4; i++) br(0, 0, 0, i * 1.6 + ctx.random(), H * 0.6, 0.025, 2);
}
const K = { boulder, pebbles, sage, yucca, dead };
export function geometry(ctx) { ctx.smooth?.(); (K[ctx.params?.kind] ?? boulder)(ctx); }
