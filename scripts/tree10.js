// Hedgerow trees and shrubs of Level 10 (trees skill, broadleaf branch): params { kind: "oak" | "ash" | "hedge", h }
const SPECIES = {
  oak: { hue: 118, base: 0.2, spread: 1.15, lobes: 9, trunk: 0.03 },
  ash: { hue: 112, base: 0.32, spread: 0.8, lobes: 8, trunk: 0.022 },
  hedge: { hue: 125, base: 0.05, spread: 1.6, lobes: 7, trunk: 0.04 },
};
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unit = (a) => add([0, 0, 0], a, 1 / (Math.hypot(...a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function geometry(ctx) {
  const sp = SPECIES[ctx.params.kind] ?? SPECIES.oak, H = ctx.params.h ?? 11, lod = ctx.lod, R = () => ctx.random();
  const r0 = H * sp.trunk, yb = H * sp.base, W = (H * sp.spread) / 2, c = [0, (yb + H) / 2, 0], r = [W, (H - yb) / 2, W];
  const uvs = [], normals = [];
  const quad = (P, N, U) => [[0, 1, 2], [0, 2, 3]].forEach((t) => { ctx.tri(...t.flatMap((k) => P[k])); t.forEach((k) => (normals.push(...N[k]), uvs.push(...U[k]))); });
  const tube = (path, rad, sides = 6) => path.slice(1).forEach((b, i) => {
    const a = path[i], ax = unit(add(b, a, -1)), s = unit(cross(ax, [0, 1, 0.01])), o = cross(ax, s);
    const d = (k, t = (k * 6.2832) / sides) => add(add([0, 0, 0], s, Math.cos(t)), o, Math.sin(t));
    for (let k = 0; k < sides; k++) { const d0 = d(k), d1 = d(k + 1), u0 = k / sides, u1 = (k + 1) / sides;
      quad([add(a, d1, rad[i]), add(b, d1, rad[i + 1]), add(b, d0, rad[i + 1]), add(a, d0, rad[i])], [d1, d1, d0, d0], [[u1, 0], [u1, 4], [u0, 4], [u0, 0]]); }
  });
  const cn = (p) => unit([(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1] + 0.35, (p[2] - c[2]) / r[2]]);
  const card = (p, up, face, w, h) => { const m = cn(p), x = unit(cross(up, face)), e = (face[0] * m[0] + face[1] * m[1] + face[2] * m[2] < 0 ? -w : w) / 2, a = add(p, x, -e), b = add(p, x, e), P = [a, b, add(b, up, h), add(a, up, h)]; quad(P, P.map(cn), [[0, 0], [1, 0], [1, 1], [0, 1]]); };
  const hue = sp.hue + R() * 14 - 7, tint = (dl) => ctx.color(`oklch(${0.9 + dl} 0.03 ${hue})`);
  ctx.albedo("cdn/texture-oak-bark.png");
  const size = (1.4 + lod / 2) * Math.max(1, Math.sqrt(W / 9)), leaves = "scripts/tex-leaves.js?kind=broad";
  tube([[0, -0.3, 0], [0, 0.4, 0], [0, Math.max(yb, 0.6), 0], [R() - 0.5, c[1], R() - 0.5]], [1.9, 1.15, 0.9, 0.45].map((k) => k * r0));
  const n = lod >= 4 ? Math.ceil(sp.lobes / 2) : sp.lobes, lw = W * 0.42, lv = r[1] * 0.5, lobes = [[0, H - lv, 0, 1], [0, c[1] - lv * 0.5, 0, 1.5]];
  for (let i = 1; i < n; i++) {
    const a = i * 2.4 + R() * 0.5, y = 1 - (i / (n - 1)) * 2, ring = (W - lw) * (y < 0 ? 1 : Math.sqrt(1 - y * y));
    const L = [Math.cos(a) * ring, c[1] + y * (r[1] - lv), Math.sin(a) * ring, 0.85 + R() * 0.3], t = R();
    const from = [0, yb * 0.95 + (c[1] - yb) * t * 0.6, 0], to = add(from, add(L, from, -1), 0.85);
    if (lod <= 3 && y < 0.64) tube([from, [to[0] * 0.4, to[1] - 0.2, to[2] * 0.4], to], [r0 * (0.6 - 0.25 * t), r0 * 0.35, r0 * 0.12], 5);
    lobes.push(L);
  }
  ctx.albedo(leaves);
  for (const L of lobes) { const w = lw * L[3], v = lv * L[3], cards = Math.ceil((3 / lod) * w * v);
    for (let j = 0; j < cards; j++) { const d = unit([R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]), up = unit(add(d, [0, 1.5, 0])), s = size * (0.75 + R() * 0.5), q = 0.3 + 0.7 * Math.sqrt(R());
      tint(-0.4 + 0.26 * q + R() * 0.06); card(add(add(L, [d[0] * w, d[1] * v, d[2] * w], q), up, -s / 2), up, [d[0] + R() - 0.5, R() * 0.5, d[2] + R() - 0.5], s, s); } }
  return { uvs, normals };
}
export function collider(ctx) {
  const sp = SPECIES[ctx.params.kind] ?? SPECIES.oak, H = ctx.params.h ?? 11, r = Math.max(0.15, H * sp.trunk), h = Math.max(1.5, H * sp.base + 1);
  return { kind: "cylinder", radiusTop: r, radiusBottom: r * 1.3, height: h, center: [0, h / 2, 0] };
}
