// Level 22: one deck of the Emstable car park (48 x 72 m, origin = centre of its floor). Params (scripts/lib/l22-layout.js):
// holes [[x0,z0,x1,z1,guard?]] cut in this floor (guard: sides n/s/w/e that still carry a parapet), ceilHoles in the slab
// above, ramps [{ r, dir, gap?, fallen? }] rising 3.2 m to the deck above, stripped/missing column indices (mined for
// their concrete), mouth (the choked exit-ramp mouth in the south wall), seed.
const HX = 24, HZ = 36, H = 2.7, T = 0.5, FF = 3.2, WT = 0.35;
const COLX = [-20, -12, -4, 4, 12, 20], COLZ = [-32, -24, -16, -8, 0, 8, 16, 24, 32];
const TX = {
  floor: "cdn/texture-parking-garage-concrete-floor-oil-stained-dusty.png",
  ceil: "cdn/texture-board-formed-concrete-ceiling-water-stained.png",
  wall: "cdn/texture-weathered-stained-poured-concrete-wall-panels.png",
  broken: "cdn/texture-broken-fractured-rough-concrete-aggregate.png",
  rust: "cdn/texture-rusty-rebar-steel.png",
};
const inR = (x, z, r) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
function cells(holes) {
  const xs = [...new Set([-HX, HX, ...holes.flatMap((h) => [h[0], h[2]])])].sort((a, b) => a - b);
  const zs = [...new Set([-HZ, HZ, ...holes.flatMap((h) => [h[1], h[3]])])].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const mx = (xs[i] + xs[i + 1]) / 2, mz = (zs[j] + zs[j + 1]) / 2;
    if (!holes.some((h) => inR(mx, mz, h))) out.push([xs[i], zs[j], xs[i + 1], zs[j + 1]]);
  }
  return out;
}
const up = (c, y, a) => c.quad(a[0], y, a[1], a[0], y, a[3], a[2], y, a[3], a[2], y, a[1]);
const dn = (c, y, a) => c.quad(a[0], y, a[1], a[2], y, a[1], a[2], y, a[3], a[0], y, a[3]);
function box(c, x0, y0, z0, x1, y1, z1, top = true, bot = true) {
  c.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1); c.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);
  c.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1); c.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0);
  if (top) c.quad(x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0);
  if (bot) c.quad(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
}
// a round bar between two points (rebar, rails): 6 sides, smooth
function bar(c, a, b, r = 0.014) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1, n = d.map((v) => v / L);
  const u0 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [n[1] * u0[2] - n[2] * u0[1], n[2] * u0[0] - n[0] * u0[2], n[0] * u0[1] - n[1] * u0[0]]; const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const P = (p, k) => { const t = (k / 6) * 6.2832, cs = Math.cos(t) * r, sn = Math.sin(t) * r; return [p[0] + u[0] * cs + w[0] * sn, p[1] + u[1] * cs + w[1] * sn, p[2] + u[2] * cs + w[2] * sn]; };
  for (let k = 0; k < 6; k++) c.quad(...P(a, k), ...P(a, k + 1), ...P(b, k + 1), ...P(b, k));
}
const hash = (a, b, s) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
function rampFrame(R) { // local param t 0..1 along the rise; returns point fn(t, s) with s 0..1 across
  const [x0, z0, x1, z1] = R.r;
  if (R.dir === "+z") return (t, s) => [x0 + (x1 - x0) * s, z0 + (z1 - z0) * t];
  if (R.dir === "-z") return (t, s) => [x0 + (x1 - x0) * s, z1 + (z0 - z1) * t];
  if (R.dir === "+x") return (t, s) => [x0 + (x1 - x0) * t, z0 + (z1 - z0) * s];
  return (t, s) => [x1 + (x0 - x1) * t, z0 + (z1 - z0) * s];
}
function rampPieces(R) { return R.gap ? [[0, R.gap[0]], [R.gap[1], 1]] : [[0, 1]]; }
function rampTop(c, R) {
  const f = rampFrame(R);
  for (const [a, b] of rampPieces(R)) { const p = f(a, 0), q = f(a, 1), r = f(b, 1), s = f(b, 0); c.quad(p[0], a * FF, p[1], q[0], a * FF, q[1], r[0], b * FF, r[1], s[0], b * FF, s[1]); c.quad(p[0], a * FF, p[1], s[0], b * FF, s[1], r[0], b * FF, r[1], q[0], a * FF, q[1]); }
}
export function geometry(ctx) {
  const P = ctx.params ?? {}, lod = ctx.lod, seed = P.seed ?? 1;
  const holes = P.holes ?? [], ceilH = P.ceilHoles ?? [], stripped = new Set(P.stripped ?? []), missing = new Set(P.missing ?? []);
  const grime = P.grime ?? 0; // 0 kept-up .. 1 abandoned to the miners
  const g = (v) => { const k = Math.round(v * (1 - grime * 0.22)); return `rgb(${k},${k - 2},${k - 7})`; };
  ctx.roughness(0.93);
  // floor slab: top, and the broken rim of every hole with its rebar fringe
  ctx.albedo(TX.floor); ctx.color(g(232));
  for (const a of cells(holes)) up(ctx, 0, a);
  ctx.albedo(TX.broken); ctx.color(g(205));
  for (const h of holes) {
    ctx.quad(h[0], -T, h[1], h[2], -T, h[1], h[2], 0, h[1], h[0], 0, h[1]); ctx.quad(h[2], -T, h[3], h[0], -T, h[3], h[0], 0, h[3], h[2], 0, h[3]);
    ctx.quad(h[0], -T, h[3], h[0], -T, h[1], h[0], 0, h[1], h[0], 0, h[3]); ctx.quad(h[2], -T, h[1], h[2], -T, h[3], h[2], 0, h[3], h[2], 0, h[1]);
  }
  // ceiling: the underside of the slab above, board-formed, and downstand beams on every column line
  ctx.albedo(TX.ceil); ctx.color(g(214));
  for (const a of cells(ceilH)) dn(ctx, H, a);
  ctx.albedo(TX.broken); ctx.color(g(190));
  for (const h of ceilH) { // the hole's throat up through the slab
    ctx.quad(h[0], H, h[1], h[0], H + T, h[1], h[2], H + T, h[1], h[2], H, h[1]); ctx.quad(h[2], H, h[3], h[2], H + T, h[3], h[0], H + T, h[3], h[0], H, h[3]);
    ctx.quad(h[0], H, h[3], h[0], H + T, h[3], h[0], H + T, h[1], h[0], H, h[1]); ctx.quad(h[2], H, h[1], h[2], H + T, h[1], h[2], H + T, h[3], h[2], H, h[3]);
  }
  ctx.albedo(TX.wall); ctx.color(g(200));
  for (const z of COLZ) for (let i = -1; i < COLX.length; i++) {
    const xa = i < 0 ? -HX : COLX[i], xb = i + 1 >= COLX.length ? HX : COLX[i + 1];
    if (ceilH.some((h) => inR((xa + xb) / 2, z, [h[0] - 0.3, h[1] - 0.3, h[2] + 0.3, h[3] + 0.3]))) continue;
    box(ctx, xa, H - 0.42, z - 0.2, xb, H, z + 0.2, false, true);
  }
  // perimeter walls, cast in 8 m panels with dark joints; the south wall opens for the choked exit-ramp mouth
  for (let p = 0; p < 9; p++) for (const s of [-1, 1]) {
    const z0 = -HZ + p * 8 + 0.03, z1 = z0 + 7.94, k = 186 + Math.round(hash(p, s, seed) * 34); ctx.color(g(k));
    box(ctx, s < 0 ? -HX - WT : HX, -T, z0, s < 0 ? -HX : HX + WT, H + T, z1, false, false);
  }
  for (let p = 0; p < 6; p++) for (const s of [-1, 1]) {
    const x0 = -HX + p * 8 + 0.03, x1 = x0 + 7.94, k = 186 + Math.round(hash(p, s + 5, seed) * 34); ctx.color(g(k));
    if (P.mouth && s > 0 && (p === 2 || p === 3)) continue;
    box(ctx, x0, -T, s < 0 ? -HZ - WT : HZ, x1, H + T, s < 0 ? -HZ : HZ + WT, false, false);
  }
  if (P.mouth) { // the exit ramp you came up: 8 m wide, climbing away south into a collapse (the dress lane chokes it with rubble)
    ctx.color(g(150));
    ctx.albedo(TX.floor); ctx.quad(-8, 0, HZ, -8, -1.6, HZ + 12, 8, -1.6, HZ + 12, 8, 0, HZ);
    ctx.albedo(TX.wall);
    ctx.quad(-8, -2, HZ + 12, -8, -2, HZ, -8, H, HZ, -8, H, HZ + 12); ctx.quad(8, -2, HZ, 8, -2, HZ + 12, 8, H, HZ + 12, 8, H, HZ);
    ctx.quad(-8, H, HZ, 8, H, HZ, 8, H - 1.2, HZ + 12, -8, H - 1.2, HZ + 12); ctx.color("#0c0b0a"); ctx.quad(-8, -2, HZ + 12, 8, -2, HZ + 12, 8, H, HZ + 12, -8, H, HZ + 12);
  }
  if (lod <= 3) { // joints and the lift line every wall carries
    ctx.albedo(null); ctx.color("#2b2925");
    for (let p = 1; p < 9; p++) for (const s of [-1, 1]) { const z = -HZ + p * 8, x = s * (HX - 0.006); ctx.quad(x, 0, z - 0.03, x, 0, z + 0.03, x, H, z + 0.03, x, H, z - 0.03); }
    ctx.quad(-HX, 0.004, -0.06, -HX, 0.004, 0.06, HX, 0.004, 0.06, HX, 0.004, -0.06); // the deck's expansion joint
  }
  // columns: whole, mined to an hourglass with the rebar cage showing, or gone but for stumps
  COLX.forEach((x, ix) => COLZ.forEach((z, iz) => {
    const id = ix * 9 + iz, inFloor = holes.some((h) => inR(x, z, h)), inCeil = ceilH.some((h) => inR(x, z, h));
    if (inFloor && inCeil) return;
    const y0 = inFloor ? H - 0.9 - hash(ix, iz, seed) * 0.8 : 0, y1 = inCeil ? 1.1 + hash(iz, ix, seed) * 0.7 : H, r = 0.3;
    const cage = (ya, yb) => { if (lod > 2) return; ctx.albedo(TX.rust); ctx.color("#b98a6a"); ctx.metalness(0.5); ctx.smooth();
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bar(ctx, [x + dx * 0.21, ya, z + dz * 0.21], [x + dx * 0.21 + (hash(dx, dz, id) - 0.5) * 0.05, yb, z + dz * 0.21], 0.016);
      for (let y = ya + 0.15; y < yb; y += 0.3) { const q = 0.225; bar(ctx, [x - q, y, z - q], [x + q, y, z - q], 0.007); bar(ctx, [x + q, y, z - q], [x + q, y, z + q], 0.007); bar(ctx, [x + q, y, z + q], [x - q, y, z + q], 0.007); bar(ctx, [x - q, y, z + q], [x - q, y, z - q], 0.007); }
      ctx.flat(); ctx.metalness(null); };
    if (missing.has(id) || inFloor || inCeil) { // stumps: ragged ends, whiskers of rebar
      ctx.albedo(TX.broken); ctx.color(g(196));
      if (!inFloor) { box(ctx, x - r, 0, z - r, x + r, 0.35, z + r, false, false); ctx.quad(x - r, 0.35, z - r, x - r, 0.5, z + r, x + r, 0.3, z + r, x + r, 0.42, z - r); }
      if (!inCeil) { const yb = inFloor ? y0 : H - 0.5; box(ctx, x - r, yb, z - r, x + r, H, z + r, false, false); ctx.quad(x - r, yb, z - r, x + r, yb + 0.1, z - r, x + r, yb - 0.08, z + r, x - r, yb + 0.06, z + r); cage(yb - 0.5 - hash(id, 2, seed) * 0.5, yb + 0.05); }
      if (!inFloor) cage(0.3, 0.75 + hash(id, 3, seed) * 0.5);
      return;
    }
    if (stripped.has(id)) {
      ctx.albedo(TX.broken); ctx.color(g(202));
      const lv = [0, 0.5, 0.9, 1.35, 1.8, 2.2, H], hw = [r, r * 0.98, 0.17 + hash(id, 1, seed) * 0.05, 0.1 + hash(id, 4, seed) * 0.05, 0.15 + hash(id, 5, seed) * 0.06, r * 0.95, r];
      for (let k = 0; k < 6; k++) { const a = hw[k], b = hw[k + 1], ya = lv[k], yb = lv[k + 1], ox = (hash(id, k, 9) - 0.5) * 0.05;
        const A = [[x - a, z - a], [x + a, z - a], [x + a, z + a], [x - a, z + a]], B = [[x - b + ox, z - b], [x + b + ox, z - b], [x + b + ox, z + b], [x - b + ox, z + b]];
        for (let e = 0; e < 4; e++) { const n = (e + 1) % 4; ctx.quad(A[n][0], ya, A[n][1], A[e][0], ya, A[e][1], B[e][0], yb, B[e][1], B[n][0], yb, B[n][1]); } }
      cage(0.45, 2.25);
      return;
    }
    ctx.albedo(TX.wall); ctx.color(g(206));
    box(ctx, x - r, y0, z - r, x + r, y1, z + r, false, false);
    if (lod <= 3 && grime < 0.9) { ctx.albedo(null); ctx.color(grime > 0.5 ? "#6d5f2c" : "#b89a2a"); const e = r + 0.004; box(ctx, x - e, 0.02, z - e, x + e, 1.05, z + e, false, false); ctx.color("#1d1c1a"); box(ctx, x - e - 0.002, 0.02, z - e - 0.002, x + e + 0.002, 0.2, z + e + 0.002, false, false); }
  }));
  // parapets round the holes that still have them
  ctx.albedo(TX.wall); ctx.color(g(196));
  for (const h of holes) { const gd = h[4] ?? ""; const t = 0.2, hh = 1.0;
    if (gd.includes("n")) box(ctx, h[0] - t, 0, h[1] - t, h[2] + t, hh, h[1]);
    if (gd.includes("s")) box(ctx, h[0] - t, 0, h[3], h[2] + t, hh, h[3] + t);
    if (gd.includes("w")) box(ctx, h[0] - t, 0, h[1], h[0], hh, h[3]);
    if (gd.includes("e")) box(ctx, h[2], 0, h[1], h[2] + t, hh, h[3]);
  }
  // ramps: the cast car ramp with kerbs, or a slab that fell and now leans as the only way
  for (const R of P.ramps ?? []) {
    const f = rampFrame(R), th = R.fallen ? 0.5 : 0.35;
    for (const [a, b] of rampPieces(R)) {
      const p = f(a, 0), q = f(a, 1), r2 = f(b, 1), s = f(b, 0), ya = a * FF, yb = b * FF;
      ctx.albedo(R.fallen ? TX.floor : TX.floor); ctx.color(g(R.fallen ? 205 : 218));
      ctx.quad(p[0], ya, p[1], q[0], ya, q[1], r2[0], yb, r2[1], s[0], yb, s[1]); ctx.quad(p[0], ya, p[1], s[0], yb, s[1], r2[0], yb, r2[1], q[0], ya, q[1]);
      ctx.albedo(TX.broken); ctx.color(g(188));
      ctx.quad(p[0], ya - th, p[1], s[0], yb - th, s[1], r2[0], yb - th, r2[1], q[0], ya - th, q[1]); ctx.quad(p[0], ya - th, p[1], q[0], ya - th, q[1], r2[0], yb - th, r2[1], s[0], yb - th, s[1]);
      ctx.quad(p[0], ya - th, p[1], p[0], ya, p[1], s[0], yb, s[1], s[0], yb - th, s[1]); ctx.quad(p[0], ya, p[1], p[0], ya - th, p[1], s[0], yb - th, s[1], s[0], yb, s[1]);
      ctx.quad(q[0], ya - th, q[1], q[0], ya, q[1], r2[0], yb, r2[1], r2[0], yb - th, r2[1]); ctx.quad(q[0], ya, q[1], q[0], ya - th, q[1], r2[0], yb - th, r2[1], r2[0], yb, r2[1]);
      ctx.quad(p[0], ya - th, p[1], q[0], ya - th, q[1], q[0], ya, q[1], p[0], ya, p[1]); ctx.quad(s[0], yb, s[1], r2[0], yb, r2[1], r2[0], yb - th, r2[1], s[0], yb - th, s[1]);
      if (lod <= 2) { ctx.albedo(TX.rust); ctx.color("#b98a6a"); ctx.smooth(); // rebar hanging out of the broken ends
        for (let i = 0; i < 7; i++) { const u = 0.08 + i * 0.14, e1 = f(b, u), e0 = f(a, u), d = f(1, u), o = f(0, u), dx = (d[0] - o[0]), dz = (d[1] - o[1]), dl = Math.hypot(dx, dz) || 1;
          if (R.gap || R.fallen) { const L = 0.25 + hash(i, a, seed) * 0.5; if (b < 1 || R.fallen) bar(ctx, [e1[0], yb - 0.2, e1[1]], [e1[0] + (dx / dl) * L, yb - 0.25 - hash(i, 3, seed) * 0.4, e1[1] + (dz / dl) * L]); if (a > 0) bar(ctx, [e0[0], ya - 0.2, e0[1]], [e0[0] - (dx / dl) * L, ya - 0.3 - hash(i, 5, seed) * 0.4, e0[1] - (dz / dl) * L]); } }
        ctx.flat(); }
      if (!R.fallen) { ctx.albedo(TX.wall); ctx.color(g(196)); // kerb walls riding the slope
        for (const u of [[0, 0.03], [0.97, 1]]) { const A = f(a, u[0]), B = f(a, u[1]), C = f(b, u[1]), D = f(b, u[0]);
          ctx.quad(A[0], ya, A[1], A[0], ya + 0.5, A[1], D[0], yb + 0.5, D[1], D[0], yb, D[1]); ctx.quad(B[0], ya + 0.5, B[1], B[0], ya, B[1], C[0], yb, C[1], C[0], yb + 0.5, C[1]);
          ctx.quad(A[0], ya + 0.5, A[1], B[0], ya + 0.5, B[1], C[0], yb + 0.5, C[1], D[0], yb + 0.5, D[1]); ctx.quad(A[0], ya, A[1], D[0], yb, D[1], D[0], yb + 0.5, D[1], A[0], ya + 0.5, A[1]); ctx.quad(B[0], ya, B[1], B[0], ya + 0.5, B[1], C[0], yb + 0.5, C[1], C[0], yb, C[1]); } }
    }
  }
  if (lod > 2) return;
  // rebar fringe on every broken hole edge
  ctx.albedo(TX.rust); ctx.color("#b98a6a"); ctx.metalness(0.5); ctx.smooth();
  for (const h of holes) if (!h[4] || h[4].length < 3) for (let i = 0; i < 26; i++) {
    const side = i % 4, u = hash(i, h[0], seed), L = 0.2 + hash(i, h[1], seed) * 0.55, d = 0.15 + hash(i, 7, seed) * 0.5, y = -0.12 - hash(i, 9, seed) * 0.28;
    const x = side < 2 ? h[0] + (h[2] - h[0]) * u : side === 2 ? h[0] : h[2], z = side < 2 ? (side ? h[3] : h[1]) : h[1] + (h[3] - h[1]) * u;
    const nx = side === 2 ? 1 : side === 3 ? -1 : 0, nz = side === 0 ? 1 : side === 1 ? -1 : 0;
    bar(ctx, [x, y, z], [x + nx * L, y - d, z + nz * L]);
  }
  ctx.flat(); ctx.metalness(null);
  // parking bays: paint a few mm proud, worn away in patches, never across a hole
  ctx.albedo(null); ctx.roughness(0.75);
  const paint = (x0, z0, x1, z1) => { const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2; if (holes.some((h) => inR(mx, mz, [h[0] - 0.3, h[1] - 0.3, h[2] + 0.3, h[3] + 0.3])) || hash(mx, mz, seed) < grime * 0.6) return; ctx.quad(x0, 0.005, z0, x0, 0.005, z1, x1, 0.005, z1, x1, 0.005, z0); };
  ctx.color(grime > 0.5 ? "#8b8878" : "#c9c6b6");
  for (let z = -HZ + 2; z < HZ - 1; z += 2.5) for (const [xa, xb] of [[-23.6, -18.8], [18.8, 23.6], [-4.8, 4.8]]) for (let x = xa; x < xb - 0.01; x += 0.8) paint(x, z - 0.05, Math.min(x + 0.8, xb), z + 0.05);
  for (let z = -HZ + 2; z < HZ - 3; z += 0.8) paint(-0.05, z, 0.05, z + 0.8);
  // strip-light housings on the ceiling (the sim hangs the light on the ones that still work)
  ctx.color("#8f9092"); ctx.metalness(0.4);
  const litSet = new Set(P.lit ?? []); let n = 0;
  for (const x of [-16, -8, 0, 8, 16]) for (let z = -28; z <= 28; z += 8) { const me = n++; if (ceilH.some((h) => inR(x, z, [h[0] - 1, h[1] - 1, h[2] + 1, h[3] + 1]))) continue;
    ctx.color("#8f9092"); ctx.emissive(null); box(ctx, x - 0.09, H - 0.5, z - 0.62, x + 0.09, H - 0.43, z + 0.62);
    ctx.color(litSet.has(me) ? "#f4f7ea" : "#55564f"); if (litSet.has(me)) ctx.emissive("#e8f0d0"); ctx.smooth(); bar(ctx, [x, H - 0.53, z - 0.58], [x, H - 0.53, z + 0.58], 0.02); ctx.flat(); ctx.emissive(null); }
  ctx.metalness(null);
}
export function collider(ctx) {
  const P = ctx.params ?? {}, holes = P.holes ?? [], ceilH = P.ceilHoles ?? [], missing = new Set(P.missing ?? []);
  for (const a of cells(holes)) { up(ctx, 0, a); dn(ctx, -T, a); }
  for (const a of cells(ceilH)) dn(ctx, H, a);
  const wall = (x0, z0, x1, z1) => ctx.quad(x0, -T, z0, x1, -T, z1, x1, H + T, z1, x0, H + T, z0);
  wall(-HX, -HZ, -HX, HZ); wall(HX, -HZ, HX, HZ); wall(-HX, -HZ, HX, -HZ);
  if (P.mouth) { wall(-HX, HZ, -8, HZ); wall(8, HZ, HX, HZ); wall(-8, HZ, -8, HZ + 12); wall(8, HZ, 8, HZ + 12); wall(-8, HZ + 9, 8, HZ + 9); ctx.quad(-8, 0, HZ, -8, -1.6, HZ + 12, 8, -1.6, HZ + 12, 8, 0, HZ); }
  else wall(-HX, HZ, HX, HZ);
  for (const h of holes) { ctx.quad(h[0], -T, h[1], h[2], -T, h[1], h[2], 0, h[1], h[0], 0, h[1]); ctx.quad(h[2], -T, h[3], h[0], -T, h[3], h[0], 0, h[3], h[2], 0, h[3]); ctx.quad(h[0], -T, h[3], h[0], -T, h[1], h[0], 0, h[1], h[0], 0, h[3]); ctx.quad(h[2], -T, h[1], h[2], -T, h[3], h[2], 0, h[3], h[2], 0, h[1]);
    const gd = h[4] ?? "", hh = 1.0;
    if (gd.includes("n")) ctx.quad(h[0], 0, h[1], h[2], 0, h[1], h[2], hh, h[1], h[0], hh, h[1]);
    if (gd.includes("s")) ctx.quad(h[0], 0, h[3], h[2], 0, h[3], h[2], hh, h[3], h[0], hh, h[3]);
    if (gd.includes("w")) ctx.quad(h[0], 0, h[1], h[0], 0, h[3], h[0], hh, h[3], h[0], hh, h[1]);
    if (gd.includes("e")) ctx.quad(h[2], 0, h[1], h[2], 0, h[3], h[2], hh, h[3], h[2], hh, h[1]);
  }
  COLX.forEach((x, ix) => COLZ.forEach((z, iz) => {
    if (missing.has(ix * 9 + iz) || holes.some((h) => inR(x, z, h)) || ceilH.some((h) => inR(x, z, h))) return;
    box(ctx, x - 0.3, 0, z - 0.3, x + 0.3, H, z + 0.3, false, false);
  }));
  for (const R of P.ramps ?? []) { rampTop(ctx, R);
    if (!R.fallen) { const f = rampFrame(R); for (const [a, b] of rampPieces(R)) for (const u of [0.015, 0.985]) { const A = f(a, u), D = f(b, u); ctx.quad(A[0], a * FF, A[1], D[0], b * FF, D[1], D[0], b * FF + 0.5, D[1], A[0], a * FF + 0.5, A[1]); } } }
}
