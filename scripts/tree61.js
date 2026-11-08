// an indoor weeping fig: bark tube trunk with a few limbs, crown of painted ficus-spray cards. params { h }
const LEAF = "/cdn/value.dc55d8ede1560c3fa0da3c31ccd64ea264cbef7fbd243701a8158be84065b975.png";
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unit = (a) => add([0, 0, 0], a, 1 / (Math.hypot(...a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function geometry(ctx) {
  const H = ctx.params.h ?? 4.5, lod = ctx.lod ?? 1, R = () => ctx.random();
  const r0 = H * 0.022, yb = H * 0.35, W = H * 0.32, c = [0, (yb + H) / 2, 0], r = [W, (H - yb) / 2, W];
  const uvs = [], normals = [];
  const quad = (P, N, U) => [[0, 1, 2], [0, 2, 3]].forEach((t) => { ctx.tri(...t.flatMap((k) => P[k])); t.forEach((k) => (normals.push(...N[k]), uvs.push(...U[k]))); });
  const tube = (path, rad, sides = 6) => path.slice(1).forEach((b, i) => {
    const a = path[i], ax = unit(add(b, a, -1)), s = unit(cross(ax, [0, 1, 0.01])), o = cross(ax, s);
    const d = (k, t = (k * 6.2832) / sides) => add(add([0, 0, 0], s, Math.cos(t)), o, Math.sin(t));
    for (let k = 0; k < sides; k++) { const d0 = d(k), d1 = d(k + 1), u0 = k / sides, u1 = (k + 1) / sides; quad([add(a, d1, rad[i]), add(b, d1, rad[i + 1]), add(b, d0, rad[i + 1]), add(a, d0, rad[i])], [d1, d1, d0, d0], [[u1, 0], [u1, 2], [u0, 2], [u0, 0]]); }
  });
  const cn = (p) => unit([(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1] + 0.35, (p[2] - c[2]) / r[2]]);
  const card = (p, up, face, w, h) => { const m = cn(p), x = unit(cross(up, face)), e = (face[0] * m[0] + face[1] * m[1] + face[2] * m[2] < 0 ? -w : w) / 2, a = add(p, x, -e), b = add(p, x, e), P = [a, b, add(b, up, h), add(a, up, h)]; quad(P, P.map(cn), [[0, 0], [1, 0], [1, 1], [0, 1]]); };
  ctx.albedo("cdn/texture-smooth-grey-fig-tree-bark.png");
  ctx.color("oklch(0.75 0.03 70)");
  // braided ficus trunk: three twisting stems
  for (let s = 0; s < 3; s++) { const a = s * 2.09; tube([0, 0.25, 0.5, 0.75, 1].map((t) => [Math.cos(a + t * 4) * 0.06, -0.2 + t * (yb + 0.3), Math.sin(a + t * 4) * 0.06]), [1.2, 1, 0.9, 0.8, 0.6].map((k) => k * r0), 5); }
  const lw = W * 0.45, lv = r[1] * 0.5, lobes = [[0, H - lv, 0, 1], [0, c[1] - lv * 0.3, 0, 1.4]];
  for (let i = 1; i < 8; i++) { const a = i * 2.4 + R() * 0.5, y = 1 - (i / 7) * 2, ring = (W - lw) * Math.sqrt(Math.max(0, 1 - y * y) + (y < 0 ? 0.4 : 0)); const L = [Math.cos(a) * ring, c[1] + y * (r[1] - lv), Math.sin(a) * ring, 0.85 + R() * 0.3]; if (y < 0.6) tube([[0, yb, 0], [L[0] * 0.5, L[1] - 0.2, L[2] * 0.5], [L[0] * 0.85, L[1], L[2] * 0.85]], [r0 * 0.5, r0 * 0.3, r0 * 0.1], 4); lobes.push(L); }
  ctx.albedo(LEAF);
  const size = 0.55 + lod * 0.15;
  for (const L of lobes) {
    const w = lw * L[3], v = lv * L[3], cards = Math.ceil((26 / lod) * w * v);
    for (let j = 0; j < cards; j++) {
      const d = unit([R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]), up = unit(add(d, [0, 0.6, 0])), s = size * (0.75 + R() * 0.5), q = 0.3 + 0.7 * Math.sqrt(R());
      ctx.color(`oklch(${0.62 + 0.3 * q + R() * 0.06} 0.03 ${120 + R() * 20})`);
      card(add(add(L, [d[0] * w, d[1] * v, d[2] * w], q), up, -s / 2), up, [d[0] + R() - 0.5, R() * 0.5, d[2] + R() - 0.5], s, s);
    }
  }
  return { uvs, normals };
}
