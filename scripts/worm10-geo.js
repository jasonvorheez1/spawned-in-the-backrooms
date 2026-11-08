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
  // the torn mound of wet soil they come out of
  ctx.bone("root"); ctx.flat(); ctx.roughness(0.9);
  const clods = lod <= 2 ? 26 : 10;
  for (let c = 0; c < clods; c++) {
    const a = R(c + 40) * 6.283, d = 0.15 + R(c + 41) * 0.55, s = 0.05 + R(c + 42) * 0.09, x = Math.cos(a) * d, z = Math.sin(a) * d, y = 0.02 + s * 0.4;
    ctx.color(`oklch(${0.24 + R(c + 43) * 0.06} 0.03 55)`);
    const v = [[x, y + s, z], [x + s, y, z], [x, y, z + s], [x - s, y, z], [x, y, z - s], [x, y - s * 0.5, z]];
    for (const [a1, b1] of [[1, 2], [2, 3], [3, 4], [4, 1]]) { ctx.tri(...v[0], ...v[b1], ...v[a1]); ctx.tri(...v[5], ...v[a1], ...v[b1]); }
  }
}
export function collider() { return { kind: "capsule", radius: 0.45, halfHeight: 0.35, center: [0, 0.8, 0] }; }
