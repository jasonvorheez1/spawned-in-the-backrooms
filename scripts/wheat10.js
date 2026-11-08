// One tuft of ripe wheat for Level 10's fields: params { h, n, head } = height, stalks, ear length. Feet at y 0.
// Near: a curved stem with a drooping leaf blade, and an ear built from alternating grain kernels with fine awns that nods
// over at the top. Far (lod >= 3): the old crossed-card ear, cheap.
export function geometry(ctx) {
  const h = ctx.params.h ?? 0.95, n = ctx.params.n ?? 7, head = ctx.params.head ?? 0.13, R = () => ctx.random(), lod = ctx.lod ?? 1;
  const both = (a, b, c, d) => { ctx.quad(...a, ...b, ...c, ...d); ctx.quad(...b, ...a, ...d, ...c); };
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
    if (lod >= 3) {
      const ew = 0.028, dx = ax * head * 0.4, dz = az * head * 0.4;
      ctx.color(`oklch(${0.74 + R() * 0.06} 0.11 ${78 + R() * 6})`);
      for (const [ux, uz] of [[ew, 0], [0, ew]]) both([top[0] - ux, top[1], top[2] - uz], [top[0] + ux, top[1], top[2] + uz], [top[0] + dx + ux * 0.4, top[1] + head, top[2] + dz + uz * 0.4], [top[0] + dx - ux * 0.4, top[1] + head, top[2] + dz - uz * 0.4]);
      continue;
    }
    // a leaf blade off the lower stem, arching out and down
    if (R() < 0.7) {
      const ly = hh * (0.3 + R() * 0.25), la = R() * 6.283, ox = Math.cos(la), oz = Math.sin(la), L = 0.18 + R() * 0.12, bw = 0.012;
      const b0 = [x + lx * 0.1, ly, z + lz * 0.1], b1 = [b0[0] + ox * L * 0.5, ly + L * 0.25, b0[2] + oz * L * 0.5], b2 = [b0[0] + ox * L, ly + L * 0.05, b0[2] + oz * L];
      const px = -oz * bw, pz = ox * bw;
      ctx.color(`oklch(${0.6 + R() * 0.06} 0.08 ${88 + R() * 10})`);
      both([b0[0] - px, b0[1], b0[2] - pz], [b0[0] + px, b0[1], b0[2] + pz], [b1[0] + px, b1[1], b1[2] + pz], [b1[0] - px, b1[1], b1[2] - pz]);
      ctx.tri(b1[0] - px, b1[1], b1[2] - pz, b1[0] + px, b1[1], b1[2] + pz, ...b2); ctx.tri(b1[0] + px, b1[1], b1[2] + pz, b1[0] - px, b1[1], b1[2] - pz, ...b2);
    }
    // the ear: kernels in two alternating rows along a nodding curve, awns off the upper ones
    const K = lod >= 2 ? 5 : 8, ep = (t) => [top[0] + ax * head * 0.5 * t * t, top[1] + head * t * (1 - 0.25 * t), top[2] + az * head * 0.5 * t * t];
    ctx.color(`oklch(${0.76 + R() * 0.06} 0.11 ${78 + R() * 6})`);
    for (let k = 0; k < K; k++) {
      const t0 = k / K, t1 = (k + 1.4) / K, c0 = ep(Math.min(1, t0)), c1 = ep(Math.min(1, t1)), side = k % 2 ? 1 : -1;
      const kw = 0.011 * (1 - 0.35 * t0), sx = -az * kw * side, sz = ax * kw * side, mid = [(c0[0] + c1[0]) / 2 + sx, (c0[1] + c1[1]) / 2, (c0[2] + c1[2]) / 2 + sz];
      ctx.tri(...c0, ...mid, ...c1); ctx.tri(...c0, ...c1, ...mid);
      // the same kernel seen from the side, so the ear has thickness
      const mid2 = [(c0[0] + c1[0]) / 2 + ax * kw * 0.6, (c0[1] + c1[1]) / 2, (c0[2] + c1[2]) / 2 + az * kw * 0.6];
      ctx.tri(...c0, ...mid2, ...c1); ctx.tri(...c0, ...c1, ...mid2);
      if (lod <= 1 && k >= K / 3) { // a whisker-thin awn
        const tip = [mid[0] + sx * 3 + ax * 0.02, mid[1] + 0.06, mid[2] + sz * 3 + az * 0.02], aw = 0.0015;
        ctx.tri(mid[0] - aw, mid[1], mid[2], mid[0] + aw, mid[1], mid[2], ...tip); ctx.tri(mid[0] + aw, mid[1], mid[2], mid[0] - aw, mid[1], mid[2], ...tip);
      }
    }
  }
}
