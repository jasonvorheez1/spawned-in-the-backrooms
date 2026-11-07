// small mesh helpers shared by the creatures and props
export function face(ctx, a, b, c, d, n) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) ctx.quad(...a, ...b, ...c, ...d); else ctx.quad(...d, ...c, ...b, ...a);
}
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// a tube through points with a radius per point (rx, rz squash optional)
// Catmull-Rom: a polyline of points becomes a smooth curve, `sub` rings per segment
function curve(pts, rads, sub) {
  if (sub <= 1 || pts.length < 3) return [pts, rads];
  const P = [], R = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      P.push([0, 1, 2].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
      R.push(Math.max(1e-4, rads[i] + (rads[i + 1] - rads[i]) * (3 * t2 - 2 * t3)));
    }
  }
  P.push(pts[n - 1]); R.push(rads[n - 1]);
  return [P, R];
}
export function tube(ctx, pts0, rads0, M = 10, squash = [1, 1], jitter = 0, seed = 1, sub = ctx.lod <= 2 ? 4 : 2) {
  const [pts, rads] = curve(pts0, rads0, sub);
  const rings = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const d = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const ref = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = norm(cross(d, ref)), v = cross(d, u);
    const ring = [];
    for (let k = 0; k < M; k++) {
      const t = (k / M) * Math.PI * 2;
      const j = jitter ? 1 + jitter * Math.sin(k * 12.9898 + seed * 3.1) * (0.55 + 0.45 * Math.sin((i / sub) * 1.7 + k * 0.9)) : 1;
      const r = rads[i] * j;
      ring.push([p[0] + (u[0] * Math.cos(t) * squash[0] + v[0] * Math.sin(t) * squash[1]) * r, p[1] + (u[1] * Math.cos(t) * squash[0] + v[1] * Math.sin(t) * squash[1]) * r, p[2] + (u[2] * Math.cos(t) * squash[0] + v[2] * Math.sin(t) * squash[1]) * r]);
    }
    return ring;
  });
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < M; k++) {
    const a = rings[i][k], b = rings[i][(k + 1) % M], c = rings[i + 1][(k + 1) % M], d = rings[i + 1][k];
    const cen = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2, (pts[i][2] + pts[i + 1][2]) / 2];
    const m = [(a[0] + c[0]) / 2 - cen[0], (a[1] + c[1]) / 2 - cen[1], (a[2] + c[2]) / 2 - cen[2]];
    face(ctx, a, b, c, d, m);
  }
}
export function sphere(ctx, c, r, M = 12, sq = [1, 1, 1]) {
  const pts = [], rads = [];
  for (let i = 0; i <= M / 2; i++) { const th = (i / (M / 2)) * Math.PI; pts.push([c[0], c[1] - Math.cos(th) * r * sq[1], c[2]]); rads.push(Math.max(1e-4, Math.sin(th) * r)); }
  tube(ctx, pts, rads, M, [sq[0], sq[2]], 0, 1, 1);
}
// an axis-aligned box from its centre and half-sizes
export function slab(ctx, c, h) {
  const [x, y, z] = c, [a, b, d] = h;
  face(ctx, [x - a, y - b, z - d], [x + a, y - b, z - d], [x + a, y + b, z - d], [x - a, y + b, z - d], [0, 0, -1]);
  face(ctx, [x - a, y - b, z + d], [x + a, y - b, z + d], [x + a, y + b, z + d], [x - a, y + b, z + d], [0, 0, 1]);
  face(ctx, [x - a, y - b, z - d], [x - a, y + b, z - d], [x - a, y + b, z + d], [x - a, y - b, z + d], [-1, 0, 0]);
  face(ctx, [x + a, y - b, z - d], [x + a, y + b, z - d], [x + a, y + b, z + d], [x + a, y - b, z + d], [1, 0, 0]);
  face(ctx, [x - a, y - b, z - d], [x + a, y - b, z - d], [x + a, y - b, z + d], [x - a, y - b, z + d], [0, -1, 0]);
  face(ctx, [x - a, y + b, z - d], [x + a, y + b, z - d], [x + a, y + b, z + d], [x - a, y + b, z + d], [0, 1, 0]);
}
// a flat shape: a convex polygon of [x, z] points standing from y0 to y1
export function prism(ctx, poly, y0, y1) {
  const n = poly.length, cx = poly.reduce((s, p) => s + p[0], 0) / n, cz = poly.reduce((s, p) => s + p[1], 0) / n;
  for (let i = 1; i < n - 1; i++) {
    ctx.tri(poly[0][0], y1, poly[0][1], poly[i + 1][0], y1, poly[i + 1][1], poly[i][0], y1, poly[i][1]);
    ctx.tri(poly[0][0], y0, poly[0][1], poly[i][0], y0, poly[i][1], poly[i + 1][0], y0, poly[i + 1][1]);
  }
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], mx = (a[0] + b[0]) / 2 - cx, mz = (a[1] + b[1]) / 2 - cz;
    face(ctx, [a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [mx, 0, mz]);
  }
}
