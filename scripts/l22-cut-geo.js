// Level 22: a Cut. Emstable mined its own floors for concrete; these shafts are what is left. Origin = centre of the shaft's
// mouth at the upper deck's floor. Params: w, d (metres), depth (to the lower deck's floor), flights (scaffold stair flights
// winding down the walls; 0 = an open pit with no bottom to stand on), seed. The sealed floors it passes show as broken slab
// rings and dark, choked alcoves. Stairs: 1 m wide, slope 1:2, plank treads on steel tube, a rail where one survives.
const W = 1.0, FF = 3.2, T = 0.5, CLEAR = 2.7;
const TX = { broken: "cdn/texture-broken-fractured-rough-concrete-aggregate.png", plank: "cdn/texture-weathered-grey-scaffold-plank-wood.png", steel: "cdn/texture-galvanised-scaffold-steel-rust-spots.png", rust: "cdn/texture-rusty-rebar-steel.png" };
const hash = (a, b, s) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
function bar(c, a, b, r = 0.024) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1, n = d.map((v) => v / L);
  const u0 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [n[1] * u0[2] - n[2] * u0[1], n[2] * u0[0] - n[0] * u0[2], n[0] * u0[1] - n[1] * u0[0]]; const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const P = (p, k) => { const t = (k / 6) * 6.2832, cs = Math.cos(t) * r, sn = Math.sin(t) * r; return [p[0] + u[0] * cs + w[0] * sn, p[1] + u[1] * cs + w[1] * sn, p[2] + u[2] * cs + w[2] * sn]; };
  for (let k = 0; k < 6; k++) c.quad(...P(a, k), ...P(a, k + 1), ...P(b, k + 1), ...P(b, k));
}
function box(c, x0, y0, z0, x1, y1, z1) {
  c.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1); c.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);
  c.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1); c.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0);
  c.quad(x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0); c.quad(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
}
function plan(P) {
  const hw = (P.w ?? 6.8) / 2, hd = (P.d ?? 6.8) / 2, n = P.flights ?? 0, depth = P.depth ?? 20, r = n ? depth / n : 0;
  const ax = hw - W / 2 - 0.05, az = hd - W / 2 - 0.05, C = [[-ax, -az], [ax, -az], [ax, az], [-ax, az]];
  const fl = [];
  for (let i = 0; i < n; i++) { const a = C[i % 4], b = C[(i + 1) % 4], dx = Math.sign(b[0] - a[0]), dz = Math.sign(b[1] - a[1]);
    fl.push({ i, a: [a[0] + dx * W / 2, a[1] + dz * W / 2], b: [b[0] - dx * W / 2, b[1] - dz * W / 2], ya: -i * r, yb: -(i + 1) * r, dx, dz, c: a, rail: hash(i, 3, P.seed ?? 1) > 0.22 || i < 2 }); }
  return { hw, hd, n, depth, r, C, fl };
}
const inward = (c) => [-Math.sign(c[0]) || 1, -Math.sign(c[1]) || 1];
export function geometry(ctx) {
  const P = ctx.params ?? {}, seed = P.seed ?? 1, { hw, hd, n, depth, r, C, fl } = plan(P), lod = ctx.lod;
  const bottom = n ? -(depth - CLEAR) : -depth;
  // the cut faces: rough, darker the deeper it goes
  ctx.albedo(TX.broken); ctx.roughness(0.96);
  for (let y = -T; y > bottom; y -= FF) { const y1 = Math.max(bottom, y - FF), k = Math.max(70, Math.round(190 + y * 2.2)); ctx.color(`rgb(${k},${k - 3},${k - 9})`);
    ctx.quad(-hw, y1, -hd, hw, y1, -hd, hw, y, -hd, -hw, y, -hd); ctx.quad(hw, y1, hd, -hw, y1, hd, -hw, y, hd, hw, y, hd);
    ctx.quad(-hw, y1, hd, -hw, y1, -hd, -hw, y, -hd, -hw, y, hd); ctx.quad(hw, y1, -hd, hw, y1, hd, hw, y, hd, hw, y, -hd); }
  if (!n) { ctx.albedo(null); ctx.color("#050505"); ctx.quad(-hw, bottom, -hd, -hw, bottom, hd, hw, bottom, hd, hw, bottom, -hd); }
  // the floors it was cut through: ragged slab rings, and one choked dark bay per floor
  let k = 0;
  for (let y = -FF; y > bottom + 1; y -= FF, k++) {
    ctx.albedo(TX.broken);
    for (let side = 0; side < 4; side++) for (let seg = 0; seg < 4; seg++) {
      const pr = 0.12 + hash(k, side * 4 + seg, seed) * 0.34, th = 0.3 + hash(k, seg, seed + 2) * 0.2, g = 150 + Math.round(hash(seg, k, seed) * 40); ctx.color(`rgb(${g},${g - 3},${g - 8})`);
      const len = (side < 2 ? 2 * hw : 2 * hd) / 4, u0 = -(side < 2 ? hw : hd) + seg * len, u1 = u0 + len;
      if (side === 0) box(ctx, u0, y - th, -hd, u1, y, -hd + pr); else if (side === 1) box(ctx, u0, y - th, hd - pr, u1, y, hd);
      else if (side === 2) box(ctx, -hw, y - th, u0, -hw + pr, y, u1); else box(ctx, hw - pr, y - th, u0, hw, y, u1);
    }
    if (lod <= 3 && y - CLEAR > bottom) { // the bay: a black mouth, a slab fallen across it
      const side = k % 4, bw = 1.7, by0 = y - 0.5 - 2.5, by1 = y - 0.5; ctx.albedo(null); ctx.color("#070706");
      const f = 0.02;
      if (side === 0) ctx.quad(-bw, by0, -hd + f, bw, by0, -hd + f, bw, by1, -hd + f, -bw, by1, -hd + f); else if (side === 1) ctx.quad(bw, by0, hd - f, -bw, by0, hd - f, -bw, by1, hd - f, bw, by1, hd - f);
      else if (side === 2) ctx.quad(-hw + f, by0, bw, -hw + f, by0, -bw, -hw + f, by1, -bw, -hw + f, by1, bw); else ctx.quad(hw - f, by0, -bw, hw - f, by0, bw, hw - f, by1, bw, hw - f, by1, -bw);
      ctx.albedo(TX.broken); ctx.color("#8d887f"); const o = 0.06, t2 = 0.22;
      if (side === 0) ctx.quad(-bw, by0, -hd + o + t2, bw * 0.8, by0, -hd + o + t2, bw, by1 - 0.6, -hd + o, -bw * 0.7, by1 - 0.2, -hd + o);
      else if (side === 1) ctx.quad(bw, by0, hd - o - t2, -bw * 0.8, by0, hd - o - t2, -bw, by1 - 0.6, hd - o, bw * 0.7, by1 - 0.2, hd - o);
      else if (side === 2) ctx.quad(-hw + o + t2, by0, bw, -hw + o + t2, by0, -bw * 0.8, -hw + o, by1 - 0.6, -bw, -hw + o, by1 - 0.2, bw * 0.7);
      else ctx.quad(hw - o - t2, by0, -bw, hw - o - t2, by0, bw * 0.8, hw - o, by1 - 0.6, bw, hw - o, by1 - 0.2, -bw * 0.7);
    }
    if (lod <= 2) { ctx.albedo(TX.rust); ctx.color("#b98a6a"); ctx.smooth();
      for (let i = 0; i < 10; i++) { const side = i % 4, u = (hash(i, k, seed) - 0.5) * 2, L = 0.3 + hash(i, k + 1, seed) * 0.5;
        const p = side === 0 ? [u * hw, y - 0.2, -hd + 0.2] : side === 1 ? [u * hw, y - 0.2, hd - 0.2] : side === 2 ? [-hw + 0.2, y - 0.2, u * hd] : [hw - 0.2, y - 0.2, u * hd];
        const q = [p[0] + (side === 2 ? L : side === 3 ? -L : 0), p[1] - 0.2 - hash(i, 5, seed) * 0.4, p[2] + (side === 0 ? L : side === 1 ? -L : 0)]; bar(ctx, p, q, 0.014); }
      ctx.flat(); }
  }
  if (!n) return;
  // the scaffold stair
  for (let j = 0; j < n; j++) { const c = C[j % 4], y = -j * r; ctx.albedo(TX.plank); ctx.color("#cfc8b8"); box(ctx, c[0] - W / 2, y - 0.05, c[1] - W / 2, c[0] + W / 2, y, c[1] + W / 2); }
  for (const f of fl) {
    const steps = 16, run = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]);
    ctx.albedo(TX.plank); ctx.color("#cdc6b5");
    for (let s = 0; s < steps; s++) { const t = (s + 0.5) / steps, x = f.a[0] + (f.b[0] - f.a[0]) * t, z = f.a[1] + (f.b[1] - f.a[1]) * t, y = f.ya + (f.yb - f.ya) * ((s + 1) / steps) + (f.ya - f.yb) / steps;
      const hx = f.dx ? run / steps / 2 : W / 2, hz = f.dz ? run / steps / 2 : W / 2; box(ctx, x - hx, y - 0.04, z - hz, x + hx, y, z + hz); }
    if (lod > 3) continue;
    ctx.albedo(TX.steel); ctx.color("#b9bcbd"); ctx.metalness(0.6); ctx.smooth();
    const inn = inward(f.c), px = f.dz ? inn[0] * W / 2 : 0, pz = f.dx ? inn[1] * W / 2 : 0;
    for (const sgn of [1, -1]) bar(ctx, [f.a[0] + px * sgn, f.ya - 0.09, f.a[1] + pz * sgn], [f.b[0] + px * sgn, f.yb - 0.09, f.b[1] + pz * sgn], 0.03);
    if (f.rail) { for (const hgt of [1.0, 0.5]) bar(ctx, [f.a[0] + px, f.ya + hgt, f.a[1] + pz], [f.b[0] + px, f.yb + hgt, f.b[1] + pz], 0.022);
      for (let s = 0; s <= 2; s++) { const t = s / 2, x = f.a[0] + (f.b[0] - f.a[0]) * t + px, z = f.a[1] + (f.b[1] - f.a[1]) * t + pz, y = f.ya + (f.yb - f.ya) * t; bar(ctx, [x, y - 0.1, z], [x, y + 1.0, z], 0.022); } }
    ctx.flat(); ctx.metalness(null);
  }
  if (lod <= 3) { ctx.albedo(TX.steel); ctx.color("#a9acad"); ctx.metalness(0.6); ctx.smooth(); // standards the whole height, a ledger under every landing
    for (const c of C) { const i = inward(c); bar(ctx, [c[0] + i[0] * W / 2, 1.0, c[1] + i[1] * W / 2], [c[0] + i[0] * W / 2, -depth, c[1] + i[1] * W / 2], 0.024); bar(ctx, [c[0] - i[0] * W / 2 * 0.9, 0.2, c[1] - i[1] * W / 2 * 0.9], [c[0] - i[0] * W / 2 * 0.9, -depth, c[1] - i[1] * W / 2 * 0.9], 0.024); }
    for (let j = 0; j < n; j++) { const c = C[j % 4], i = inward(c), y = -j * r - 0.08; bar(ctx, [c[0] - i[0] * 0.5, y, c[1] + i[1] * 0.5], [c[0] + i[0] * 0.5, y, c[1] + i[1] * 0.5], 0.024); bar(ctx, [c[0] + i[0] * 0.5, y, c[1] - i[1] * 0.5], [c[0] + i[0] * 0.5, y, c[1] + i[1] * 0.5], 0.024); }
    // the mouth's one rail, along the open lip beside the first landing
    bar(ctx, [-hw + W + 0.1, 1.0, -hd + 0.05], [hw, 1.0, -hd + 0.05], 0.022); bar(ctx, [-hw + W + 0.1, 0.5, -hd + 0.05], [hw, 0.5, -hd + 0.05], 0.022);
    for (let x = -hw + W + 0.1; x <= hw; x += 1.9) bar(ctx, [x, 0, -hd + 0.05], [x, 1.0, -hd + 0.05], 0.022);
    ctx.flat(); ctx.metalness(null); }
}
export function collider(ctx) {
  const P = ctx.params ?? {}, { hw, hd, n, depth, r, C, fl } = plan(P), bottom = n ? -(depth - CLEAR) : -depth;
  ctx.quad(-hw, bottom, -hd, hw, bottom, -hd, hw, -T, -hd, -hw, -T, -hd); ctx.quad(hw, bottom, hd, -hw, bottom, hd, -hw, -T, hd, hw, -T, hd);
  ctx.quad(-hw, bottom, hd, -hw, bottom, -hd, -hw, -T, -hd, -hw, -T, hd); ctx.quad(hw, bottom, -hd, hw, bottom, hd, hw, -T, hd, hw, -T, -hd);
  if (!n) return;
  ctx.quad(-hw + W + 0.1, 0, -hd + 0.05, hw, 0, -hd + 0.05, hw, 1.0, -hd + 0.05, -hw + W + 0.1, 1.0, -hd + 0.05);
  for (let j = 0; j < n; j++) { const c = C[j % 4], y = -j * r; ctx.quad(c[0] - W / 2, y, c[1] - W / 2, c[0] - W / 2, y, c[1] + W / 2, c[0] + W / 2, y, c[1] + W / 2, c[0] + W / 2, y, c[1] - W / 2); }
  for (const f of fl) { const hx = f.dz ? W / 2 : 0, hz = f.dx ? W / 2 : 0;
    ctx.quad(f.a[0] - hx, f.ya, f.a[1] - hz, f.a[0] + hx, f.ya, f.a[1] + hz, f.b[0] + hx, f.yb, f.b[1] + hz, f.b[0] - hx, f.yb, f.b[1] - hz);
    ctx.quad(f.a[0] - hx, f.ya, f.a[1] - hz, f.b[0] - hx, f.yb, f.b[1] - hz, f.b[0] + hx, f.yb, f.b[1] + hz, f.a[0] + hx, f.ya, f.a[1] + hz);
    if (f.rail) { const inn = inward(f.c), px = f.dz ? inn[0] * W / 2 : 0, pz = f.dx ? inn[1] * W / 2 : 0; ctx.quad(f.a[0] + px, f.ya, f.a[1] + pz, f.b[0] + px, f.yb, f.b[1] + pz, f.b[0] + px, f.yb + 1.05, f.b[1] + pz, f.a[0] + px, f.ya + 1.05, f.a[1] + pz); } }
}
