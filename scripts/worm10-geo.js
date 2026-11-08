// Level 10's worms (Shelly: "regular worms not abominations"): ~30 ordinary earthworms writhing over a patch of churned wet soil.
// Each worm is a ringed tube on two bones (w<i>a near its tail, w<i>b at its middle) so the l10-worms clip writhes each one apart.
export const WORMS = 30;
const R = (s) => { let x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const RIM = 0.85; // the churned patch's radius
const soilY = (x, z) => { const u = Math.min(1, Math.hypot(x, z) / RIM); return 0.04 * Math.cos(u * 1.5708) + 0.008 * Math.sin(x * 23) * Math.sin(z * 19); };
// a regular earthworm: 20-38 cm, lying across the soil in loose S-curves, diving in and out of it; a few lift their heads
function path(i) {
  const a0 = R(i) * 6.283, d0 = Math.sqrt(R(i + 9)) * RIM * 0.8, L = 0.2 + R(i + 3) * 0.18, head = R(i + 5) < 0.3;
  const x0 = Math.cos(a0) * d0, z0 = Math.sin(a0) * d0, dir = R(i + 13) * 6.283, curl = (R(i + 17) - 0.5) * 9, n = 14;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, ang = dir + Math.sin(t * 6.283 * (0.8 + R(i + 21)) + i) * 0.9 + curl * t * 0.3;
    const prev = pts[k - 1] ?? [x0, 0, z0], st = L / n;
    const x = k ? prev[0] + Math.cos(ang) * st : x0, z = k ? prev[2] + Math.sin(ang) * st : z0;
    const dive = -0.012 + Math.max(0, Math.sin(t * 3.14 * (1 + (i % 3)) + R(i + 25) * 3)) * 0.022; // in and out of the dirt
    const lift = head ? Math.pow(Math.max(0, t - 0.7) / 0.3, 2) * 0.07 : 0;
    pts.push([x, soilY(x, z) + dive + lift, z]);
  }
  return pts;
}
export function skeleton() {
  const b = { root: { pivot: [0, 0, 0] } };
  for (let i = 0; i < WORMS; i++) { const p = path(i); b[`w${i}a`] = { parent: "root", pivot: p[3] }; b[`w${i}b`] = { parent: `w${i}a`, pivot: p[9] }; }
  return b;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function geometry(ctx) {
  const lod = ctx.lod, sides = lod <= 1 ? 7 : lod <= 3 ? 5 : 4;
  // the churned patch: dark wet soil, low and lumpy, wheat flattened out of it
  ctx.bone("root"); ctx.smooth(); ctx.roughness(0.95);
  const segs = lod <= 2 ? 22 : 10, rows = lod <= 2 ? 5 : 2;
  const h = (u, a) => { const n = 1 + 0.18 * Math.sin(a * 3 + 1.3) * Math.sin(a * 5 + 0.4) + 0.07 * Math.sin(a * 11); const x = Math.cos(a) * RIM * u * n, z = Math.sin(a) * RIM * u * n; return [x, soilY(x, z) - 0.006, z]; };
  for (let r = 0; r < rows; r++) for (let k = 0; k < segs; k++) {
    const u0 = r / rows, u1 = (r + 1) / rows, a0 = (k / segs) * 6.283, a1 = ((k + 1) / segs) * 6.283;
    ctx.color(`oklch(${0.17 + u1 * 0.05} 0.03 ${50 + (k % 3) * 4})`);
    ctx.quad(...h(u0, a0), ...h(u0, a1), ...h(u1, a1), ...h(u1, a0));
  }
  ctx.flat();
  const clods = lod <= 2 ? 34 : 10; // crumbs and clods, some on top of the worms
  for (let c = 0; c < clods; c++) {
    const a = R(c + 40) * 6.283, d = Math.sqrt(R(c + 41)) * RIM * 1.15, s = 0.012 + R(c + 42) * 0.03, x = Math.cos(a) * d, z = Math.sin(a) * d, y = soilY(x, z) + s * 0.2;
    ctx.color(`oklch(${0.2 + R(c + 43) * 0.08} 0.035 55)`);
    const v = [[x, y + s * 0.8, z], [x + s, y, z + s * 0.3], [x - s * 0.2, y, z + s], [x - s, y, z - s * 0.2], [x + s * 0.3, y, z - s], [x, y - s * 0.4, z]];
    for (const [a1, b1] of [[1, 2], [2, 3], [3, 4], [4, 1]]) { ctx.tri(...v[0], ...v[b1], ...v[a1]); ctx.tri(...v[5], ...v[a1], ...v[b1]); }
  }
  // the worms: wet, glossy, ringed, red-brown to purplish, a paler saddle a third of the way back
  ctx.smooth(); ctx.roughness(0.2); ctx.metalness(0.04);
  const count = lod >= 4 ? 12 : lod >= 3 ? 20 : WORMS;
  for (let i = 0; i < count; i++) {
    const p = path(i), rad = 0.009 + R(i + 7) * 0.006, n = p.length, hue = 14 + R(i + 11) * 22, lum = 0.36 + R(i + 15) * 0.08;
    const ring = (k) => {
      const t = k / (n - 1), ax = unit(sub(p[Math.min(n - 1, k + 1)], p[Math.max(0, k - 1)]));
      const s1 = unit(cross(ax, [0, 1, 0.01])), o = cross(ax, s1);
      const taper = Math.min(1, 0.45 + t * 5) * (1 - Math.pow(Math.max(0, t - 0.55) / 0.45, 2) * 0.55); // blunt head, thinner tail end
      const r = rad * taper * (t > 0.25 && t < 0.36 ? 1.25 : 1);
      return Array.from({ length: sides }, (_, j) => { const a = (j / sides) * 6.283; return [p[k][0] + (s1[0] * Math.cos(a) + o[0] * Math.sin(a)) * r, p[k][1] + (s1[1] * Math.cos(a) + o[1] * Math.sin(a)) * r * 0.85, p[k][2] + (s1[2] * Math.cos(a) + o[2] * Math.sin(a)) * r]; });
    };
    const rings = Array.from({ length: n }, (_, k) => ring(k));
    for (let k = 0; k < n - 1; k++) {
      const t = k / (n - 1), w = Math.min(1, Math.max(0, (t - 0.3) / 0.35));
      ctx.bone({ [`w${i}a`]: 1 - w, [`w${i}b`]: w });
      const band = t > 0.25 && t < 0.36;
      ctx.color(band ? `oklch(${lum + 0.12} 0.07 ${hue + 14})` : `oklch(${lum + (k % 2) * 0.03 - t * 0.03} 0.09 ${hue})`);
      const A = rings[k], B = rings[k + 1];
      for (let j = 0; j < sides; j++) { const j1 = (j + 1) % sides; ctx.quad(...A[j], ...A[j1], ...B[j1], ...B[j]); }
    }
    const tip = p[n - 1], last = rings[n - 1], c0 = rings[0], tail = p[0];
    for (let j = 0; j < sides; j++) { ctx.tri(...last[j], ...last[(j + 1) % sides], ...tip); ctx.tri(...c0[(j + 1) % sides], ...c0[j], ...tail); }
  }
}
export function collider() { return { kind: "box", width: 1.5, height: 0.25, depth: 1.5, center: [0, 0.12, 0] }; }
