// Level 10's worm mass: a heaving clump of red-brown earthworms bursting out of a mound of wet soil.
// Each worm is a smooth ringed tube on two bones (w<i>a at the root, w<i>b at its middle) so the l10-worms clip writhes each one apart.
export const WORMS = 14;
const R = (s) => { let x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function path(i) { // a worm's centreline: out of the mound, arching up and over
  const a = (i / WORMS) * 6.283 + R(i) * 0.7, out = 0.08 + R(i + 9) * 0.22, L = 0.9 + R(i + 3) * 0.75, lean = 0.35 + R(i + 5) * 0.5;
  const pts = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16, up = Math.sin(t * 2.6) * L * 0.75, side = Math.sin(t * 5 + i) * 0.06;
    const r = out + t * L * lean;
    pts.push([Math.cos(a) * r - Math.sin(a) * side, 0.05 + up, Math.sin(a) * r + Math.cos(a) * side]);
  }
  return pts;
}
export function skeleton() {
  const b = { root: { pivot: [0, 0, 0] } };
  for (let i = 0; i < WORMS; i++) { const p = path(i); b[`w${i}a`] = { parent: "root", pivot: p[0] }; b[`w${i}b`] = { parent: `w${i}a`, pivot: p[8] }; }
  return b;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function geometry(ctx) {
  const lod = ctx.lod, sides = lod <= 1 ? 8 : lod <= 3 ? 6 : 4;
  ctx.smooth(); ctx.roughness(0.28); // wet skin
  for (let i = 0; i < (lod >= 4 ? 7 : WORMS); i++) {
    const p = path(i), rad = 0.035 + R(i + 7) * 0.025, n = p.length;
    const ring = (k) => {
      const t = k / (n - 1), ax = unit(sub(p[Math.min(n - 1, k + 1)], p[Math.max(0, k - 1)]));
      const s = unit(cross(ax, [0, 1, 0.01])), o = cross(ax, s);
      const taper = Math.min(1, t * 6 + 0.35) * (1 - Math.pow(t, 3) * 0.75), segBulge = 1 + (lod <= 2 ? 0.08 * Math.cos(k * 3.1) : 0);
      const r = rad * taper * segBulge;
      return Array.from({ length: sides }, (_, j) => { const a = (j / sides) * 6.283; return [p[k][0] + (s[0] * Math.cos(a) + o[0] * Math.sin(a)) * r, p[k][1] + (s[1] * Math.cos(a) + o[1] * Math.sin(a)) * r, p[k][2] + (s[2] * Math.cos(a) + o[2] * Math.sin(a)) * r]; });
    };
    const rings = Array.from({ length: n }, (_, k) => ring(k)), hueShift = R(i + 11) * 14;
    for (let k = 0; k < n - 1; k++) {
      const t = k / (n - 1), w = Math.min(1, Math.max(0, (t - 0.35) / 0.3));
      ctx.bone({ [`w${i}a`]: 1 - w, [`w${i}b`]: w });
      const band = t > 0.28 && t < 0.38; // the clitellum: a paler swollen band
      ctx.color(band ? `oklch(0.62 0.09 ${28 + hueShift})` : `oklch(${0.42 + (k % 2) * 0.04 + t * 0.05} 0.13 ${22 + hueShift})`);
      const A = rings[k], B = rings[k + 1];
      for (let j = 0; j < sides; j++) { const j1 = (j + 1) % sides; ctx.quad(...A[j], ...A[j1], ...B[j1], ...B[j]); }
    }
    const tip = p[n - 1], last = rings[n - 1]; // a rounded head
    for (let j = 0; j < sides; j++) ctx.tri(...last[j], ...last[(j + 1) % sides], ...tip);
  }
  // the torn mound of wet soil they burst from: a lumpy dome, crumbs scattered around its lip
  ctx.bone("root"); ctx.smooth(); ctx.roughness(0.95);
  const segs = lod <= 2 ? 20 : 10, rows = lod <= 2 ? 6 : 3, rim = 0.95;
  const h = (u, a) => { const n = 0.75 + 0.35 * Math.sin(a * 3 + 1.3) * Math.sin(a * 5 + 0.4) + 0.15 * Math.sin(a * 11); return [Math.cos(a) * rim * u * n, Math.cos(u * 1.5708) * 0.32 * (0.8 + 0.2 * n) - 0.04, Math.sin(a) * rim * u * n]; };
  for (let r = 0; r < rows; r++) for (let k = 0; k < segs; k++) {
    const u0 = r / rows, u1 = (r + 1) / rows, a0 = (k / segs) * 6.283, a1 = ((k + 1) / segs) * 6.283;
    ctx.color(`oklch(${0.2 + (1 - u1) * 0.06} 0.035 ${50 + (k % 3) * 4})`);
    ctx.quad(...h(u0, a0), ...h(u0, a1), ...h(u1, a1), ...h(u1, a0));
  }
  ctx.flat();
  const clods = lod <= 2 ? 22 : 8;
  for (let c = 0; c < clods; c++) {
    const a = R(c + 40) * 6.283, d = 0.6 + R(c + 41) * 0.75, s = 0.03 + R(c + 42) * 0.06, x = Math.cos(a) * d, z = Math.sin(a) * d, y = s * 0.3;
    ctx.color(`oklch(${0.22 + R(c + 43) * 0.07} 0.035 55)`);
    const v = [[x, y + s * 0.8, z], [x + s, y, z + s * 0.3], [x - s * 0.2, y, z + s], [x - s, y, z - s * 0.2], [x + s * 0.3, y, z - s], [x, y - s * 0.4, z]];
    for (const [a1, b1] of [[1, 2], [2, 3], [3, 4], [4, 1]]) { ctx.tri(...v[0], ...v[b1], ...v[a1]); ctx.tri(...v[5], ...v[a1], ...v[b1]); }
  }
  // small worms lying coiled over the mound, half buried
  ctx.smooth(); ctx.roughness(0.28);
  for (let i = 0; i < (lod <= 2 ? 10 : 4); i++) {
    const a0 = R(i + 70) * 6.283, d0 = 0.15 + R(i + 71) * 0.55, len = 0.5 + R(i + 72) * 0.5, rad = 0.018 + R(i + 73) * 0.012, sides = 6, n = 12;
    const pt = (t) => { const ang = a0 + t * len * 2.2 * (i % 2 ? 1 : -1), d = d0 + Math.sin(t * 9 + i) * 0.06; const x = Math.cos(ang) * d, z = Math.sin(ang) * d; const u = Math.min(1, Math.hypot(x, z) / rim); return [x, Math.cos(u * 1.5708) * 0.3 - 0.02 + Math.sin(t * 7) * 0.012, z]; };
    const P = Array.from({ length: n + 1 }, (_, k) => pt(k / n));
    const rings = P.map((p0, k) => { const ax = unit(sub(P[Math.min(n, k + 1)], P[Math.max(0, k - 1)])), s1 = unit(cross(ax, [0, 1, 0.01])), o = cross(ax, s1), t = k / n, r = rad * Math.min(1, t * 5 + 0.3) * (1 - t * t * 0.6);
      return Array.from({ length: sides }, (_, j) => { const q = (j / sides) * 6.283; return [p0[0] + (s1[0] * Math.cos(q) + o[0] * Math.sin(q)) * r, p0[1] + (s1[1] * Math.cos(q) + o[1] * Math.sin(q)) * r, p0[2] + (s1[2] * Math.cos(q) + o[2] * Math.sin(q)) * r]; }); });
    for (let k = 0; k < n; k++) { ctx.color(`oklch(${0.44 + (k % 2) * 0.04} 0.12 ${24 + R(i) * 12})`); for (let j = 0; j < sides; j++) { const j1 = (j + 1) % sides; ctx.quad(...rings[k][j], ...rings[k][j1], ...rings[k + 1][j1], ...rings[k + 1][j]); } }
  }
}
export function collider() { return { kind: "capsule", radius: 0.45, halfHeight: 0.35, center: [0, 0.8, 0] }; }
