// small mesh helpers shared by the creatures and props
export function face(ctx, a, b, c, d, n) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) ctx.quad(...a, ...b, ...c, ...d); else ctx.quad(...d, ...c, ...b, ...a);
}
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// a tube through points with a radius per point (rx, rz squash optional)
export function tube(ctx, pts, rads, M = 10, squash = [1, 1], jitter = 0, seed = 1) {
  const rings = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const d = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const ref = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = norm(cross(d, ref)), v = cross(d, u);
    const ring = [];
    for (let k = 0; k < M; k++) {
      const t = (k / M) * Math.PI * 2;
      const j = jitter ? 1 + jitter * Math.sin(k * 12.9898 + i * 78.233 + seed * 3.1) : 1;
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
  tube(ctx, pts, rads, M, [sq[0], sq[2]]);
}
