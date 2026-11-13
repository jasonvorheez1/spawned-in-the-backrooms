// shared shape helpers for the Level 31 snack bar furniture (scripted meshes)
// tube between two points
export function tube(ctx, a, b, r, seg = 10) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d), n = d.map((v) => v / L);
  const up = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [up[1] * n[2] - up[2] * n[1], up[2] * n[0] - up[0] * n[2], up[0] * n[1] - up[1] * n[0]]; const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const P = (p, k) => { const t = (k / seg) * Math.PI * 2, c = Math.cos(t) * r, s = Math.sin(t) * r; return [p[0] + u[0] * c + w[0] * s, p[1] + u[1] * c + w[1] * s, p[2] + u[2] * c + w[2] * s]; };
  ctx.smooth();
  for (let k = 0; k < seg; k++) { const a0 = P(a, k), a1 = P(a, k + 1), b0 = P(b, k), b1 = P(b, k + 1); ctx.quad(...a0, ...a1, ...b1, ...b0); }
  ctx.flat();
}
// superellipse outline point
const se = (t, w, d, n) => { const c = Math.cos(t), s = Math.sin(t); return [w * Math.sign(c) * Math.abs(c) ** (2 / n), d * Math.sign(s) * Math.abs(s) ** (2 / n)]; };
// a rounded plate of thickness th, laid by map(x, z, h) -> [X, Y, Z] (h 0 = bottom face, 1 = top face); rim colour optional
export function plate(ctx, { w, d, th, n = 4, rings = 5, seg = 40, map, rim }) {
  const pt = (r, k, h) => { const [x, z] = se((k / seg) * Math.PI * 2, w * r, d * r, n); return map(x, z, h * th); };
  ctx.smooth();
  for (const h of [1, 0]) for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) {
    const r0 = i / rings, r1 = (i + 1) / rings;
    const A = pt(r0, k, h), B = pt(r0, k + 1, h), C = pt(r1, k + 1, h), D = pt(r1, k, h);
    if (h) ctx.quad(...A, ...D, ...C, ...B); else ctx.quad(...A, ...B, ...C, ...D);
  }
  if (rim) ctx.color(rim.color), ctx.metalness(rim.metal ?? 0), ctx.roughness(rim.rough ?? 0.5);
  for (let k = 0; k < seg; k++) { const a = pt(1, k, 0), b = pt(1, k + 1, 0), c = pt(1, k + 1, 1), e = pt(1, k, 1); ctx.quad(...a, ...b, ...c, ...e); }
  ctx.flat();
}
