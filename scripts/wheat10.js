// One tuft of ripe wheat for Level 10's fields: params { h, n, head } = height, stalks, ear length. Feet at y 0.
// Near: a curved stem with a drooping leaf blade, and an ear built from alternating grain kernels with fine awns that nods
// over at the top. Far (lod >= 3): the old crossed-card ear, cheap.
export function geometry(ctx) {
  const h = ctx.params.h ?? 0.95, n = ctx.params.n ?? 7, head = ctx.params.head ?? 0.13, R = () => ctx.random(), lod = ctx.lod ?? 1;
  const both = (a, b, c, d) => { ctx.quad(...a, ...b, ...c, ...d); ctx.quad(...b, ...a, ...d, ...c); };
  // one ear: rings along a nodding curve, swollen in the middle, kernels bulged on alternate rings; head = 0 draws none (stubble)
  const ear = (top, ax, az, rings, sides, awns) => {
    if (head <= 0) return;
    const L = head * 1.35, W = 0.016 + head * 0.06, curve = (t) => [top[0] + ax * L * 0.45 * t * t, top[1] + L * t * (1 - 0.2 * t), top[2] + az * L * 0.45 * t * t];
    const tone = 0.7 + R() * 0.1, hue = 76 + R() * 10, ring = [];
    for (let k = 0; k <= rings; k++) {
      const t = k / rings, c = curve(t), r = W * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.7) * (k % 2 ? 1.12 : 0.92) * (k === rings ? 0.15 : 1), off = (k % 2) * Math.PI / sides, pts = [];
      for (let s = 0; s < sides; s++) { const a = off + (s / sides) * 6.283, ca = Math.cos(a), sa = Math.sin(a); pts.push([c[0] + ca * r * (-az) * 1 + sa * r * ax * 0.6, c[1] + sa * r * 0.15, c[2] + ca * r * ax + sa * r * az * 0.6]); }
      ring.push(pts);
    }
    for (let k = 0; k < rings; k++) {
      ctx.color(`oklch(${tone + (k % 2) * 0.05} 0.12 ${hue})`);
      const A = ring[k], B = ring[k + 1];
      for (let s = 0; s < sides; s++) { const s1 = (s + 1) % sides; ctx.quad(...A[s], ...A[s1], ...B[s1], ...B[s]); ctx.quad(...A[s], ...B[s], ...B[s1], ...A[s1]); }
    }
    const tip = curve(1.08); ctx.color(`oklch(${tone + 0.04} 0.12 ${hue})`);
    for (let s = 0; s < sides; s++) { const P = ring[rings][s], Q = ring[rings][(s + 1) % sides]; ctx.tri(...P, ...Q, ...tip); ctx.tri(...Q, ...P, ...tip); }
    if (!awns) return;
    ctx.color(`oklch(${tone + 0.08} 0.09 ${hue + 4})`);
    for (let k = Math.floor(rings / 3); k <= rings; k++) for (let s = 0; s < sides; s += 2) {
      const P = ring[k][s], c = curve(k / rings), dx = P[0] - c[0], dz = P[2] - c[2], len = 0.05 + R() * 0.04, aw = 0.0012;
      const end = [P[0] + dx * 3 + ax * 0.01, P[1] + len, P[2] + dz * 3 + az * 0.01];
      ctx.tri(P[0] - aw, P[1], P[2], P[0] + aw, P[1], P[2], ...end); ctx.tri(P[0] + aw, P[1], P[2], P[0] - aw, P[1], P[2], ...end);
    }
  };
  for (let i = 0; i < n; i++) {
    const a = R() * 6.283, r = R() * 0.12, x = Math.cos(a) * r, z = Math.sin(a) * r, hh = h * (0.8 + R() * 0.3);
    const lean = R() * 6.283, lx = Math.cos(lean) * 0.08 * R(), lz = Math.sin(lean) * 0.08 * R();
    const w = lod >= 3 ? 0.008 : 0.005, yaw = R() * 3.14, cx = Math.cos(yaw) * w, cz = Math.sin(yaw) * w;
    // the stem in two bends (one at far lod)
    const segs = lod >= 3 ? 1 : 3, pt = (t) => [x + lx * t * t, hh * t, z + lz * t * t];
    ctx.color(`oklch(${0.64 + R() * 0.08} 0.09 ${84 + R() * 8})`);
    for (let s = 0; s < segs; s++) {
      const p0 = pt(s / segs), p1 = pt((s + 1) / segs);
      both([p0[0] - cx, p0[1], p0[2] - cz], [p0[0] + cx, p0[1], p0[2] + cz], [p1[0] + cx, p1[1], p1[2] + cz], [p1[0] - cx, p1[1], p1[2] - cz]);
    }
    const top = pt(1), ax = Math.cos(lean), az = Math.sin(lean); // the way it nods
    if (lod >= 3) { ear(top, ax, az, 4, 3, false); continue; } // far: a slim four-sided spindle, no flat card
    // a leaf blade off the lower stem, arching out and down
    if (R() < 0.7) {
      const ly = hh * (0.3 + R() * 0.25), la = R() * 6.283, ox = Math.cos(la), oz = Math.sin(la), L = 0.18 + R() * 0.12, bw = 0.012;
      const b0 = [x + lx * 0.1, ly, z + lz * 0.1], b1 = [b0[0] + ox * L * 0.5, ly + L * 0.25, b0[2] + oz * L * 0.5], b2 = [b0[0] + ox * L, ly + L * 0.05, b0[2] + oz * L];
      const px = -oz * bw, pz = ox * bw;
      ctx.color(`oklch(${0.6 + R() * 0.06} 0.08 ${88 + R() * 10})`);
      both([b0[0] - px, b0[1], b0[2] - pz], [b0[0] + px, b0[1], b0[2] + pz], [b1[0] + px, b1[1], b1[2] + pz], [b1[0] - px, b1[1], b1[2] - pz]);
      ctx.tri(b1[0] - px, b1[1], b1[2] - pz, b1[0] + px, b1[1], b1[2] + pz, ...b2); ctx.tri(b1[0] + px, b1[1], b1[2] + pz, b1[0] - px, b1[1], b1[2] - pz, ...b2);
    }
    // the ear: a plump spindle of kernel rings that nods over, awns off its upper half (Shelly: "improve the crops")
    ear(top, ax, az, lod >= 2 ? 5 : 7, lod >= 2 ? 4 : 6, lod <= 1);
  }
}
