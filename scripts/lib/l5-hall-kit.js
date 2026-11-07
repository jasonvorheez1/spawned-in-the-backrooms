// Level 5 Main Hall mesh kit: textures by name and the solid forms every hall piece is built from
// (chamfered boxes, lathes, pipes, sheets). Faces orient themselves outward from a hint point, so convex parts never come out inside-out.
const C = (n) => `cdn/texture-${n}.png`;
export const TX = {
  mahog: C("dark-mahogany-wood-grain-polished"), walnut: C("rich-walnut-wood-grain-varnished"), oak: C("worn-hardwood-grain"),
  brass: C("brushed-aged-brass-metal"), gilt: C("ornate-gilded-gold-leaf-frame-moulding"), marble: C("white-veined-marble-polished"),
  leather: C("oxblood-chesterfield-leather-cracked"), velvet: C("deep-red-velvet-upholstery-fabric"), chintz: C("faded-floral-chintz-upholstery-fabric"),
  linen: C("white-cotton-bed-linen-wrinkled"), quilt: C("faded-rose-quilted-satin-bedspread"), damask: C("green-damask-upholstery-fabric"),
  persian: C("ornate-red-and-gold-persian-rug"), runner: C("faded-green-and-red-hotel-carpet-runner"), paper: C("aged-yellowed-paper"),
  map: C("antique-hand-drawn-map-parchment"), iron: C("black-cast-iron-stove-metal"), enamel: C("cream-enamel-stove-panel-chipped"),
  steel: C("scratched-worn-steel"), cloth: C("white-linen-tablecloth"), wicker: C("dark-rattan-wicker-weave"), soil: C("dark-potting-soil"),
  ceramic: C("glazed-blue-and-white-porcelain"), terracotta: C("aged-terracotta-clay"), grille: C("woven-gold-radio-speaker-grille-cloth"),
  rivet: C("riveted-dark-steel-plate"), tweed: C("brown-tweed-fabric"), crystal: null,
};
export function paint(ctx, color, tex = null, rough = 0.7, metal = 0, glow = null) {
  ctx.albedo(tex ? TX[tex] ?? tex : null); ctx.color(color); ctx.roughness(rough); ctx.metalness(metal); ctx.emissive(glow);
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// a quad / tri whose front faces along `out` (a direction)
export function q(ctx, a, b, c, d, out) {
  const n = crs(sub(b, a), sub(c, a));
  if (dot(n, out) >= 0) ctx.quad(...a, ...b, ...c, ...d); else ctx.quad(...d, ...c, ...b, ...a);
}
export function t3(ctx, a, b, c, out) {
  const n = crs(sub(b, a), sub(c, a));
  if (dot(n, out) >= 0) ctx.tri(...a, ...b, ...c); else ctx.tri(...c, ...b, ...a);
}
const cen = (...p) => { const s = [0, 0, 0]; for (const v of p) { s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; } return s.map((x) => x / p.length); };
// convex quad facing away from a point inside
export const qc = (ctx, inside, a, b, c, d) => q(ctx, a, b, c, d, sub(cen(a, b, c, d), inside));
export const tc = (ctx, inside, a, b, c) => t3(ctx, a, b, c, sub(cen(a, b, c), inside));
// chamfered box from min/max corners; b = bevel (m)
export function bx(ctx, x0, x1, y0, y1, z0, z1, b = 0.012) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2, hx = Math.abs(x1 - x0) / 2, hy = Math.abs(y1 - y0) / 2, hz = Math.abs(z1 - z0) / 2;
  b = Math.min(b, hx * 0.45, hy * 0.45, hz * 0.45);
  const O = [cx, cy, cz];
  if (b <= 0.002 || ctx.lod >= 3) { b = 0; }
  const P = (k, sx, sy, sz) => k === 0 ? [cx + sx * hx, cy + sy * (hy - b), cz + sz * (hz - b)] : k === 1 ? [cx + sx * (hx - b), cy + sy * hy, cz + sz * (hz - b)] : [cx + sx * (hx - b), cy + sy * (hy - b), cz + sz * hz];
  for (const s of [-1, 1]) {
    qc(ctx, O, P(0, s, -1, -1), P(0, s, 1, -1), P(0, s, 1, 1), P(0, s, -1, 1));
    qc(ctx, O, P(1, -1, s, -1), P(1, 1, s, -1), P(1, 1, s, 1), P(1, -1, s, 1));
    qc(ctx, O, P(2, -1, -1, s), P(2, 1, -1, s), P(2, 1, 1, s), P(2, -1, 1, s));
  }
  if (!b) return;
  for (const a of [-1, 1]) for (const c of [-1, 1]) {
    qc(ctx, O, P(1, -1, a, c), P(1, 1, a, c), P(2, 1, a, c), P(2, -1, a, c)); // along x
    qc(ctx, O, P(0, a, -1, c), P(0, a, 1, c), P(2, a, 1, c), P(2, a, -1, c)); // along y
    qc(ctx, O, P(0, a, c, -1), P(0, a, c, 1), P(1, a, c, 1), P(1, a, c, -1)); // along z
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) tc(ctx, O, P(0, sx, sy, sz), P(1, sx, sy, sz), P(2, sx, sy, sz));
}
// lathe about the vertical axis at (x, z): prof = [[r, y], ...] from the axis bottom, out, up, back in; smooth sides
export function lathe(ctx, x, y, z, prof, M = 16, smooth = true, sx = 1, sz = 1) {
  M = ctx.lod >= 3 ? Math.max(6, M >> 1) : M;
  if (smooth) ctx.smooth();
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1], n2 = [y1 - y0, -(r1 - r0)];
    for (let k = 0; k < M; k++) {
      const a0 = (k / M) * Math.PI * 2, a1 = ((k + 1) / M) * Math.PI * 2, am = (a0 + a1) / 2;
      const p = (r, yy, a) => [x + Math.cos(a) * r * sx, y + yy, z + Math.sin(a) * r * sz];
      const out = [n2[0] * Math.cos(am), n2[1], n2[0] * Math.sin(am)];
      if (r0 < 1e-4) t3(ctx, p(0, y0, 0), p(r1, y1, a0), p(r1, y1, a1), out);
      else if (r1 < 1e-4) t3(ctx, p(r0, y0, a0), p(r0, y0, a1), p(0, y1, 0), out);
      else q(ctx, p(r0, y0, a0), p(r0, y0, a1), p(r1, y1, a1), p(r1, y1, a0), out);
    }
  }
  if (smooth) ctx.flat();
}
// a sphere (squashable) via the lathe
export function ball(ctx, x, y, z, r, M = 10, sy = 1, sxz = 1) {
  const prof = []; const N = Math.max(4, M >> 1);
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + (i / N) * Math.PI; prof.push([Math.cos(a) * r * sxz, (Math.sin(a) * r) * sy]); }
  prof[0][0] = 0; prof[N][0] = 0; lathe(ctx, x, y, z, prof, M);
}
// a round bar from a to b (caps on), M sides
export function pipe(ctx, a, b, r, M = 8, r2 = r, caps = true) {
  M = ctx.lod >= 3 ? Math.max(4, M >> 1) : M;
  const d = sub(b, a), L = Math.hypot(...d) || 1, w = d.map((v) => v / L);
  const up = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = crs(w, up); const ul = Math.hypot(...u); u = u.map((v) => v / ul); const v = crs(w, u);
  const ring = (c, rr, k) => { const t = (k / M) * Math.PI * 2; return [c[0] + (u[0] * Math.cos(t) + v[0] * Math.sin(t)) * rr, c[1] + (u[1] * Math.cos(t) + v[1] * Math.sin(t)) * rr, c[2] + (u[2] * Math.cos(t) + v[2] * Math.sin(t)) * rr]; };
  if (M >= 8) ctx.smooth();
  for (let k = 0; k < M; k++) {
    const t = ((k + 0.5) / M) * Math.PI * 2, out = [u[0] * Math.cos(t) + v[0] * Math.sin(t), u[1] * Math.cos(t) + v[1] * Math.sin(t), u[2] * Math.cos(t) + v[2] * Math.sin(t)];
    q(ctx, ring(a, r, k), ring(a, r, k + 1), ring(b, r2, k + 1), ring(b, r2, k), out);
  }
  if (M >= 8) ctx.flat();
  if (caps) for (let k = 0; k < M; k++) { t3(ctx, a, ring(a, r, k), ring(a, r, k + 1), w.map((x) => -x)); t3(ctx, b, ring(b, r2, k), ring(b, r2, k + 1), w); }
}
// a bent bar through points (smooth joints)
export function path(ctx, pts, r, M = 6) { for (let i = 0; i < pts.length - 1; i++) { pipe(ctx, pts[i], pts[i + 1], r, M, r, false); if (i > 0) ball(ctx, ...pts[i], r, M); } ball(ctx, ...pts[0], r, M); ball(ctx, ...pts[pts.length - 1], r, M); }
// a sheet f(u, v) → point, nu × nv cells, its front facing out(u, v); both sides drawn by the engine
export function sheet(ctx, f, nu, nv, out, smooth = true) {
  if (ctx.lod >= 3) { nu = Math.max(1, nu >> 1); nv = Math.max(1, nv >> 1); }
  if (smooth) ctx.smooth();
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
    q(ctx, f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1), out((u0 + u1) / 2, (v0 + v1) / 2));
  }
  if (smooth) ctx.flat();
}
// a turned leg standing at (x, z) from y0 to y1
export function turned(ctx, x, z, y0, y1, r) {
  const h = y1 - y0, k = (f) => y0 + h * f;
  lathe(ctx, x, 0, z, [[0, k(0)], [r * 0.7, k(0)], [r * 0.9, k(0.04)], [r * 0.55, k(0.12)], [r * 0.5, k(0.45)], [r * 1.05, k(0.55)], [r * 0.6, k(0.62)], [r * 0.75, k(0.86)], [r * 1.1, k(0.9)], [r * 1.1, k(1)], [0, k(1)]], 10);
}
// a cabriole leg: a curved square-ish bar, knee out toward (dx, dz)
export function cabriole(ctx, x, z, y0, y1, r, dx, dz) {
  const h = y1 - y0, P = (f, o) => [x + dx * o, y0 + h * f, z + dz * o];
  path(ctx, [P(0, 0.03), P(0.12, 0.0), P(0.5, -0.01), P(0.82, 0.03), P(1, 0.0)], r, 7);
  ball(ctx, x + dx * 0.035, y0 + r * 0.6, z + dz * 0.035, r * 1.25, 8, 0.6);
}
// a brass knob / pull
export const knob = (ctx, x, y, z, r = 0.018, out = -1) => { ball(ctx, x, y, z + out * r, r, 8); pipe(ctx, [x, y, z], [x, y, z + out * r], r * 0.4, 6); };
export const box = (o) => ({ kind: "box", width: o[1] - o[0], height: o[3] - o[2], depth: o[5] - o[4], center: [(o[0] + o[1]) / 2, (o[2] + o[3]) / 2, (o[4] + o[5]) / 2] });
