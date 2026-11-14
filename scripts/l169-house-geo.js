// Ferry's house (Level 169): the shell and every hand-built thing in it. params.part picks the piece.
import { rounded, slab, face, sphere } from "./lib/shapes.js";
import L from "./lib/data/level169.yml";
const h = L.house, b = L.houseBuild, C = h.center, r = h.rooms, F = h.floorUp, TOP = F + h.wallH, T = b.wallT, DH = b.doorH, BF = F - 3;
const X0 = r.living[0] - C.x, X1 = r.kitchen[1] - C.x, Z0 = r.bed1[2] - C.z, Z1 = r.living[3] - C.z, ZH0 = r.hall[2] - C.z, ZH1 = r.hall[3] - C.z, XM = r.living[1] - C.x;
const PX0 = r.porch[0] - C.x, PX1 = r.porch[1] - C.x, PZ1 = r.porch[3] - C.z;
const RIDGE = TOP + b.roof.ridge + 0.09, SL = b.roof.ridge / Z1, roofY = (z) => RIDGE - SL * Math.abs(z);
const TEX = { stucco: "cdn/texture-pale-adobe-stucco.png", floor: "cdn/texture-swept-wood-plank-floor.png", plaster: "cdn/texture-limewash-plaster.png", concrete: "cdn/texture-smooth-poured-concrete.png", timber: "cdn/texture-weathered-timber-planks.png", metal: "cdn/texture-corrugated-galvanized-metal.png", oak: "cdn/texture-oak-wood-grain.png", linen: "cdn/texture-linen-fabric.png", rug: "cdn/texture-woven-striped-wool-rug.png" };
const TINT = { stucco: "oklch(0.97 0.03 70)", floor: null, plaster: "oklch(0.97 0.02 85)", concrete: "oklch(0.93 0.01 80)", timber: "oklch(0.92 0.04 60)" };
const paint = (ctx, t, col) => { ctx.albedo(t ? TEX[t] ?? t : null); ctx.color(col ?? null); };
const bx = (ctx, x0, y0, z0, x1, y1, z1, rad = 0.015) => rounded(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2], rad);
function triN(ctx, a, bb, c, n) {
  const u = [bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const d = (u[1] * v[2] - u[2] * v[1]) * n[0] + (u[2] * v[0] - u[0] * v[2]) * n[1] + (u[0] * v[1] - u[1] * v[0]) * n[2];
  if (d >= 0) ctx.tri(...a, ...bb, ...c); else ctx.tri(...a, ...c, ...bb);
}
// a capped round bar from a to b
function rod(ctx, a, e, ra, M = 8, rb = ra) {
  const d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], len = Math.hypot(...d) || 1, w = d.map((v) => v / len);
  const t = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [w[1] * t[2] - w[2] * t[1], w[2] * t[0] - w[0] * t[2], w[0] * t[1] - w[1] * t[0]]; const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
  const P = (c, rr, i) => { const th = (i / M) * 6.28318, cs = Math.cos(th) * rr, sn = Math.sin(th) * rr; return [c[0] + u[0] * cs + v[0] * sn, c[1] + u[1] * cs + v[1] * sn, c[2] + u[2] * cs + v[2] * sn]; };
  ctx.smooth();
  for (let i = 0; i < M; i++) { const p0 = P(a, ra, i), p1 = P(a, ra, i + 1), q1 = P(e, rb, i + 1), q0 = P(e, rb, i); face(ctx, p0, p1, q1, q0, [(p0[0] + p1[0]) / 2 - a[0], (p0[1] + p1[1]) / 2 - a[1], (p0[2] + p1[2]) / 2 - a[2]]); }
  ctx.flat();
  for (let i = 0; i < M; i++) { triN(ctx, a, P(a, ra, i), P(a, ra, i + 1), w.map((x) => -x)); triN(ctx, e, P(e, rb, i), P(e, rb, i + 1), w); }
}
// a lathe about a vertical axis: prof = [[radius, y], ...]
function rings(ctx, cx, cz, prof, M = 12) {
  const P = (j, i) => { const th = (i / M) * 6.28318; return [cx + Math.cos(th) * prof[j][0], prof[j][1], cz + Math.sin(th) * prof[j][0]]; };
  ctx.smooth();
  for (let j = 0; j < prof.length - 1; j++) {
    const dy = prof[j + 1][1] - prof[j][1], dr = prof[j + 1][0] - prof[j][0];
    for (let i = 0; i < M; i++) {
      const th = ((i + 0.5) / M) * 6.28318, n = [Math.cos(th) * dy, -dr, Math.sin(th) * dy];
      if (prof[j][0] < 1e-5) triN(ctx, P(j, 0), P(j + 1, i), P(j + 1, i + 1), n);
      else if (prof[j + 1][0] < 1e-5) triN(ctx, P(j + 1, 0), P(j, i), P(j, i + 1), n);
      else face(ctx, P(j, i), P(j, i + 1), P(j + 1, i + 1), P(j + 1, i), n);
    }
  }
  ctx.flat();
}
// ---------------------------------------------------------------- the shell
function plan() {
  const B = [], wins = [], cas = [];
  const add = (m, x0, y0, z0, x1, y1, z1) => B.push([m, x0, y0, z0, x1, y1, z1]);
  const wall = (ax, cc, a, e, ops, y0 = F, y1 = TOP, m = "stucco") => {
    const seg = (p, q, ya, yb) => { if (q - p > 1e-3 && yb - ya > 1e-3) ax === "x" ? add(m, p, ya, cc - T / 2, q, yb, cc + T / 2) : add(m, cc - T / 2, ya, p, cc + T / 2, yb, q); };
    let cur = a;
    for (const o of [...ops].sort((p, q) => p[0] - q[0])) { seg(cur, o[0], y0, y1); seg(o[0], o[1], y0, o[2]); seg(o[0], o[1], o[3], y1); cur = o[1]; }
    seg(cur, e, y0, y1);
  };
  const dr = (k) => [b.doors[k][0] - C.x, b.doors[k][1] - C.x, F, F + DH];
  const wn = (side) => b.windows.filter((w) => w[0] === side).map((w) => { const c = w[1] - (side === "n" || side === "s" ? C.x : C.z); return [c - w[2] / 2, c + w[2] / 2, F + b.winY[0], F + b.winY[1]]; });
  const S_ = Z1 - T / 2, N_ = Z0 + T / 2, W_ = X0 + T / 2, E_ = X1 - T / 2;
  wall("x", S_, X0, X1, [dr("front"), ...wn("s")]); wall("x", N_, X0, X1, wn("n")); wall("z", W_, Z0 + T, Z1 - T, wn("w")); wall("z", E_, Z0 + T, Z1 - T, wn("e"));
  for (const o of wn("s")) wins.push(["x", S_, o, 1]); for (const o of wn("n")) wins.push(["x", N_, o, -1]);
  for (const o of wn("w")) wins.push(["z", W_, o, -1]); for (const o of wn("e")) wins.push(["z", E_, o, 1]);
  wall("x", ZH1, X0 + T, X1 - T, [dr("living"), dr("kitchen")]);
  wall("x", ZH0, X0 + T, X1 - T, [dr("bed1"), dr("bed2"), dr("bed3"), dr("den")]);
  cas.push(["x", S_, dr("front")]); for (const k of ["living", "kitchen"]) cas.push(["x", ZH1, dr(k)]); for (const k of ["bed1", "bed2", "bed3", "den"]) cas.push(["x", ZH0, dr(k)]);
  for (const k of ["bed1", "bed2", "bed3"]) wall("z", r[k][1] - C.x, Z0 + T, ZH0 - T / 2, []);
  wall("z", XM, ZH1 + T / 2, b.midWallTo - C.z, []);
  const st = b.stair, sx0 = st.x0 - C.x;
  add("floor", X0, -0.1, Z0, X1, F, ZH0); add("floor", X0, -0.1, ZH0, XM, F, Z1); add("floor", XM, -0.1, ZH0, sx0, F, ZH1); add("floor", XM, F - 0.1, ZH1, X1, F, Z1);
  add("plaster", X0, TOP, Z0, X1, TOP + 0.06, Z1);
  add("concrete", X0 - 0.04, -0.1, Z1, X1 + 0.04, F - 0.02, Z1 + 0.04); add("concrete", X0 - 0.04, -0.1, Z0 - 0.04, X1 + 0.04, F - 0.02, Z0);
  add("concrete", X0 - 0.04, -0.1, Z0, X0, F - 0.02, Z1); add("concrete", X1, -0.1, Z0, X1 + 0.04, F - 0.02, Z1);
  // the basement under the kitchen and its stair shaft
  add("concrete", XM, BF - 0.15, ZH0 - 0.1, X1 + 0.05, BF, Z1);
  add("concrete", XM, BF, ZH1 + 0.1, XM + 0.2, F - 0.1, Z1); add("concrete", XM, BF, Z1 - 0.2, X1 + 0.05, F - 0.1, Z1);
  add("concrete", X1 - 0.15, BF, ZH0 - 0.1, X1 + 0.05, F, Z1);
  const lx = sx0 + st.upN * st.upRun, yL = F - (st.upN + 1) * st.rise, tz = st.turn - C.z;
  add("concrete", XM + 0.2, BF, ZH1 - 0.1, lx, F - 0.1, ZH1 + 0.12);
  add("concrete", sx0, BF, ZH0 - 0.1, X1 - 0.15, F, ZH0 + 0.1);
  for (let i = 1; i <= st.upN; i++) { const x = sx0 + (i - 1) * st.upRun; add("concrete", x, BF, ZH0 + 0.1, x + st.upRun, F - i * st.rise, ZH1 - 0.1); }
  add("concrete", lx, BF, ZH0 + 0.1, X1 - 0.15, yL, tz);
  for (let j = 1; j <= st.lowN; j++) { const z = tz + (j - 1) * st.lowRun; add("concrete", lx, BF, z, X1 - 0.15, yL - j * st.rise, z + st.lowRun); }
  // the porch
  add("timber", PX0, 0, Z1 + 0.04, PX1, 0.15, PZ1);
  const by = roofY(PZ1 - 0.22) - 0.03;
  for (const px of b.porchPosts) add("post", px - C.x - 0.08, 0.15, PZ1 - 0.3, px - C.x + 0.08, by - 0.16, PZ1 - 0.14);
  add("post", PX0, by - 0.16, PZ1 - 0.31, PX1, by, PZ1 - 0.13);
  return { B, wins, cas };
}
function shell(ctx) {
  const { B, wins, cas } = plan();
  for (const [m, x0, y0, z0, x1, y1, z1] of B) {
    if (m === "post") { paint(ctx, "timber", TINT.timber); bx(ctx, x0, y0, z0, x1, y1, z1, 0.02); continue; }
    paint(ctx, m, TINT[m]); slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
  }
  for (const [ax, cc, o] of cas) { // door casings
    const Q = (u0, ya, u1, yb) => ax === "x" ? bx(ctx, u0, ya, cc - 0.13, u1, yb, cc + 0.13, 0.015) : bx(ctx, cc - 0.13, ya, u0, cc + 0.13, yb, u1, 0.015);
    paint(ctx, "oak", "oklch(0.9 0.05 65)"); Q(o[0] - 0.07, F, o[0], o[3] + 0.07); Q(o[1], F, o[1] + 0.07, o[3] + 0.07); Q(o[0] - 0.07, o[3], o[1] + 0.07, o[3] + 0.07);
  }
  for (const [ax, cc, o, out] of wins) {
    const [a, e, y0, y1] = o, mid = (a + e) / 2, ym = (y0 + y1) / 2;
    const Q = (u0, ya, p0, u1, yb, p1, rad = 0.012) => ax === "x" ? bx(ctx, u0, ya, cc + Math.min(p0, p1), u1, yb, cc + Math.max(p0, p1), rad) : bx(ctx, cc + Math.min(p0, p1), ya, u0, cc + Math.max(p0, p1), yb, u1, rad);
    paint(ctx, "oak", "oklch(0.9 0.05 65)");
    Q(a - 0.04, y0 - 0.04, -0.15, e + 0.04, y0 + 0.05, 0.15); Q(a, y1 - 0.06, -0.12, e, y1, 0.12); Q(a, y0, -0.12, a + 0.06, y1, 0.12); Q(e - 0.06, y0, -0.12, e, y1, 0.12);
    Q(mid - 0.02, y0, -0.03, mid + 0.02, y1, 0.03); Q(a, ym - 0.02, -0.03, e, ym + 0.02, 0.03);
    paint(ctx, null); ctx.color("oklch(0.85 0.04 220)", 0.28); ctx.roughness(0.1);
    const g = ax === "x" ? [[mid, ym, cc], [(e - a) / 2 - 0.05, (y1 - y0) / 2 - 0.05, 0.004]] : [[cc, ym, mid], [0.004, (y1 - y0) / 2 - 0.05, (e - a) / 2 - 0.05]]; slab(ctx, g[0], g[1]); ctx.roughness(null);
    paint(ctx, "plaster", "oklch(0.86 0.07 195)"); // shutters, folded open against the wall
    const w = (e - a) / 2, pa = out * (T / 2 + 0.012), pb = out * (T / 2 + 0.05);
    for (const u0 of [a - w - 0.03, e + 0.03]) {
      const u1 = u0 + w; Q(u0, y0, pa, u0 + 0.05, y1, pb); Q(u1 - 0.05, y0, pa, u1, y1, pb); Q(u0, y0, pa, u1, y0 + 0.06, pb); Q(u0, y1 - 0.06, pa, u1, y1, pb); Q(u0, ym - 0.03, pa, u1, ym + 0.03, pb);
      if (ctx.lod <= 2) for (let k = 0; k < 10; k++) { const y = y0 + 0.08 + (k * (y1 - y0 - 0.2)) / 10; Q(u0 + 0.05, y, out * (T / 2 + 0.018), u1 - 0.05, y + 0.07, out * (T / 2 + 0.042), 0.008); }
    }
  }
  // the roof: corrugated sheet both slopes, the south one running on over the porch
  paint(ctx, "metal", "oklch(0.95 0.01 230)"); ctx.metalness(0.6); ctx.roughness(0.55);
  const xa = X0 - b.roof.side, xb = X1 + b.roof.side, stp = ctx.lod <= 2 ? 0.125 : 0.5, amp = ctx.lod <= 2 ? 0.035 : 0, zN = -(Z1 + b.roof.eave), zP = PZ1 + b.roof.porchOut;
  let k = 0;
  for (let x = xa; x < xb - 1e-6; x += stp, k++) {
    const x2 = Math.min(xb, x + stp), o1 = k % 2 ? amp : 0, o2 = k % 2 ? 0 : amp;
    for (const ze of [zN, x >= PX0 - 0.45 && x2 <= PX1 + 0.45 ? zP : -zN]) face(ctx, [x, RIDGE + o1, 0], [x2, RIDGE + o2, 0], [x2, roofY(ze) + o2, ze], [x, roofY(ze) + o1, ze], [0, 1, 0]);
  }
  bx(ctx, xa - 0.03, RIDGE + 0.02, -0.16, xb + 0.03, RIDGE + 0.09, 0.16, 0.03);
  ctx.metalness(null); ctx.roughness(null);
  paint(ctx, "timber", TINT.timber);
  bx(ctx, xa, roofY(zN) - 0.15, zN - 0.03, xb, roofY(zN) - 0.01, zN + 0.03); bx(ctx, PX0 - 0.45, roofY(zP) - 0.15, zP - 0.03, PX1 + 0.45, roofY(zP) - 0.01, zP + 0.03);
  bx(ctx, xa, roofY(zN) - 0.15, -zN - 0.03, PX0 - 0.45, roofY(zN) - 0.01, -zN + 0.03); bx(ctx, PX1 + 0.45, roofY(zN) - 0.15, -zN - 0.03, xb, roofY(zN) - 0.01, -zN + 0.03);
  for (const px of b.porchPosts) { const x = px - C.x; for (const sg of [-1, 1]) rod(ctx, [x + sg * 0.5, roofY(PZ1 - 0.22) - 0.12, PZ1 - 0.22], [x, roofY(PZ1 - 0.22) - 0.75, PZ1 - 0.22], 0.04, 6); }
  paint(ctx, "stucco", TINT.stucco);
  for (const sx of [X0, X1]) triN(ctx, [sx, TOP, Z0], [sx, TOP, Z1], [sx, RIDGE - 0.02, 0], [sx, 0, 0]);
}
function shellCollider(ctx) {
  const { B, wins } = plan();
  for (const [, x0, y0, z0, x1, y1, z1] of B) slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
  for (const [ax, cc, o] of wins) { const m = (o[0] + o[1]) / 2, hw = (o[1] - o[0]) / 2, ym = (o[2] + o[3]) / 2, hy = (o[3] - o[2]) / 2; slab(ctx, ax === "x" ? [m, ym, cc] : [cc, ym, m], ax === "x" ? [hw, hy, 0.04] : [0.04, hy, hw]); }
  const xa = X0 - b.roof.side, xb = X1 + b.roof.side, zN = -(Z1 + b.roof.eave), zP = PZ1 + b.roof.porchOut;
  ctx.quad(xa, RIDGE, 0, xb, RIDGE, 0, xb, roofY(zN), zN, xa, roofY(zN), zN);
  ctx.quad(xa, RIDGE, 0, xa, roofY(zN), -zN, xb, roofY(zN), -zN, xb, RIDGE, 0);
  ctx.quad(PX0 - 0.45, roofY(zN), -zN, PX0 - 0.45, roofY(zP), zP, PX1 + 0.45, roofY(zP), zP, PX1 + 0.45, roofY(zN), -zN);
}
// ---------------------------------------------------------------- small makers
function crate(ctx, x, y, z, w, hh, d, col = "oklch(0.9 0.05 70)") {
  paint(ctx, "timber", col); bx(ctx, x - w / 2, y, z - d / 2, x + w / 2, y + hh, z + d / 2, 0.012);
  for (const yy of [y + hh * 0.2, y + hh * 0.8]) bx(ctx, x - w / 2 - 0.008, yy - 0.025, z - d / 2 - 0.008, x + w / 2 + 0.008, yy + 0.025, z + d / 2 + 0.008, 0.008);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(ctx, x + sx * (w / 2 - 0.02) - 0.03, y, z + sz * (d / 2 - 0.02) - 0.03, x + sx * (w / 2 - 0.02) + 0.03, y + hh + 0.004, z + sz * (d / 2 - 0.02) + 0.03, 0.008);
}
function tableBase(ctx, x, y, z, w, d, ht = 0.76) {
  paint(ctx, "oak", "oklch(0.9 0.05 65)");
  bx(ctx, x - w / 2, y + ht - 0.05, z - d / 2, x + w / 2, y + ht, z + d / 2, 0.02);
  bx(ctx, x - w / 2 + 0.1, y + ht - 0.15, z - d / 2 + 0.09, x + w / 2 - 0.1, y + ht - 0.05, z - d / 2 + 0.12, 0.01); bx(ctx, x - w / 2 + 0.1, y + ht - 0.15, z + d / 2 - 0.12, x + w / 2 - 0.1, y + ht - 0.05, z + d / 2 - 0.09, 0.01);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const px = x + sx * (w / 2 - 0.1), pz = z + sz * (d / 2 - 0.1); rings(ctx, px, pz, [[0.03, y], [0.035, y + 0.1], [0.05, y + 0.3], [0.04, y + 0.5], [0.05, y + ht - 0.16], [0.05, y + ht - 0.05]], 8); }
}
function mug(ctx, x, y, z, col) { paint(ctx, null, col); rings(ctx, x, z, [[0, y], [0.04, y], [0.042, y + 0.09], [0.034, y + 0.09], [0.032, y + 0.012], [0, y + 0.012]], 10); rod(ctx, [x + 0.04, y + 0.03, z], [x + 0.065, y + 0.045, z], 0.008, 5); rod(ctx, [x + 0.065, y + 0.045, z], [x + 0.04, y + 0.07, z], 0.008, 5); }
function bowl(ctx, x, y, z, rr, col) { paint(ctx, null, col); rings(ctx, x, z, [[0, y], [rr * 0.45, y], [rr, y + rr * 0.5], [rr * 0.93, y + rr * 0.5], [rr * 0.4, y + 0.015], [0, y + 0.015]], 12); }
function books(ctx, x, y, z, n = 6) {
  const cols = ["oklch(0.6 0.12 30)", "oklch(0.8 0.1 95)", "oklch(0.55 0.09 250)", "oklch(0.7 0.1 150)", "oklch(0.85 0.03 90)", "oklch(0.5 0.1 350)"];
  for (let i = 0; i < n; i++) { const ox = ((i * 37) % 5) * 0.006 - 0.012, oz = ((i * 53) % 5) * 0.006 - 0.012, y0 = y + i * 0.028; paint(ctx, null, cols[i % cols.length]); bx(ctx, x - 0.055 + ox, y0, z - 0.09 + oz, x + 0.055 + ox, y0 + 0.026, z + 0.09 + oz, 0.004); paint(ctx, null, "oklch(0.93 0.02 90)"); slab(ctx, [x + ox + 0.003, y0 + 0.013, z + oz], [0.054, 0.009, 0.0915]); }
}
function boots(ctx, x, z) {
  for (const s of [-1, 1]) { const px = x + s * 0.075; paint(ctx, null, "oklch(0.36 0.05 55)"); rings(ctx, px, z, [[0.05, 0.03], [0.05, 0.12], [0.056, 0.26], [0.05, 0.26], [0.044, 0.14]], 10); bx(ctx, px - 0.05, 0.02, z - 0.19, px + 0.05, 0.1, z + 0.05, 0.035); paint(ctx, null, "oklch(0.25 0.02 60)"); bx(ctx, px - 0.052, 0, z - 0.195, px + 0.052, 0.028, z + 0.056, 0.01); }
}
function guitar(ctx, x, z) { // leaning on the wall behind it (-z)
  paint(ctx, "oak", "oklch(0.92 0.09 70)"); sphere(ctx, [x, 0.2, z], 0.19, 14, [1, 1, 0.26]); sphere(ctx, [x, 0.44, z - 0.03], 0.145, 14, [1, 1, 0.3]);
  paint(ctx, null, "oklch(0.2 0.02 60)"); rod(ctx, [x, 0.42, z + 0.052], [x, 0.42, z + 0.03], 0.045, 12); bx(ctx, x - 0.05, 0.14, z + 0.045, x + 0.05, 0.165, z + 0.06, 0.005);
  paint(ctx, "oak", "oklch(0.7 0.06 55)"); bx(ctx, x - 0.025, 0.52, z - 0.02, x + 0.025, 0.96, z - 0.075 + 0.03, 0.01); bx(ctx, x - 0.04, 0.95, z - 0.09, x + 0.04, 1.1, z - 0.06, 0.012);
  paint(ctx, null, "oklch(0.85 0.01 90)"); for (const s of [-1, 1]) for (const k of [0, 1, 2]) rod(ctx, [x + s * 0.04, 0.98 + k * 0.04, z - 0.075], [x + s * 0.062, 0.98 + k * 0.04, z - 0.075], 0.008, 5);
}
function sewing(ctx, x, y, z) {
  paint(ctx, null, "oklch(0.62 0.1 20)"); bx(ctx, x - 0.12, y, z - 0.08, x + 0.12, y + 0.07, z + 0.08, 0.015); paint(ctx, null, "oklch(0.7 0.1 20)"); bx(ctx, x - 0.125, y + 0.07, z - 0.085, x + 0.125, y + 0.085, z + 0.085, 0.006);
  const cols = ["oklch(0.6 0.15 250)", "oklch(0.9 0.02 90)", "oklch(0.55 0.14 145)"]; cols.forEach((c, i) => { const px = x - 0.07 + i * 0.07; paint(ctx, null, "oklch(0.85 0.05 80)"); rings(ctx, px, z, [[0, y + 0.085], [0.022, y + 0.085], [0.022, y + 0.09], [0.008, y + 0.09], [0.008, y + 0.13], [0.022, y + 0.13], [0.022, y + 0.135], [0, y + 0.135]], 8); paint(ctx, null, c); rod(ctx, [px, y + 0.092, z], [px, y + 0.128, z], 0.018, 8); });
  paint(ctx, null, "oklch(0.6 0.16 25)"); sphere(ctx, [x + 0.2, y + 0.03, z + 0.02], 0.04, 10, [1, 0.8, 1]);
}
function blanket(ctx, x, y, z, col, n = 2, w = 0.3, d = 0.2) { for (let i = 0; i < n; i++) { paint(ctx, "linen", i % 2 ? "oklch(0.95 0.02 90)" : col); bx(ctx, x - w + i * 0.01, y + i * 0.05, z - d + i * 0.01, x + w - i * 0.01, y + i * 0.05 + 0.05, z + d - i * 0.01, 0.022); } }
function shelfUnit(ctx, x0, x1, y0, zb, dir, rnd, kinds = "cans") {
  const zf = zb + dir * 0.32, za = Math.min(zb, zf), ze = Math.max(zb, zf), zc = (za + ze) / 2;
  paint(ctx, "timber", TINT.timber);
  for (const x of [x0, (x0 + x1) / 2 - 0.02, x1 - 0.04]) bx(ctx, x, y0, za, x + 0.04, y0 + 1.95, ze, 0.01);
  const ys = [0.12, 0.58, 1.02, 1.46, 1.88];
  for (const yy of ys) bx(ctx, x0, y0 + yy - 0.03, za, x1, y0 + yy, ze, 0.008);
  const lab = ["oklch(0.6 0.16 28)", "oklch(0.85 0.12 95)", "oklch(0.6 0.12 150)", "oklch(0.92 0.02 90)", "oklch(0.55 0.1 250)", "oklch(0.7 0.13 55)"];
  for (let s = 0; s < 4; s++) {
    const y = y0 + ys[s];
    for (let x = x0 + 0.12; x < x1 - 0.1; ) {
      const t = rnd();
      if (kinds !== "cans" && t < 0.3) { crate(ctx, x + 0.17, y, zc, 0.34, 0.24, 0.26); x += 0.42; continue; }
      if (t < 0.12) { x += 0.14; continue; }
      if (t < 0.3) { paint(ctx, null); ctx.color("oklch(0.85 0.06 85)", 0.55); rings(ctx, x + 0.05, zc, [[0, y], [0.05, y], [0.05, y + 0.13], [0.035, y + 0.15]], 8); paint(ctx, null, "oklch(0.75 0.08 80)"); rod(ctx, [x + 0.05, y + 0.15, zc], [x + 0.05, y + 0.17, zc], 0.038, 8); x += 0.13; continue; }
      const rr = 0.038 + rnd() * 0.012, hh = 0.1 + rnd() * 0.04, c = lab[Math.floor(rnd() * lab.length)], stack = rnd() < 0.3 ? 2 : 1;
      if ((ctx.lod ?? 1) > 1) { paint(ctx, null, c); rod(ctx, [x + rr, y, zc], [x + rr, y + stack * hh - 0.002, zc], rr, 6); } else for (let q = 0; q < stack; q++) { paint(ctx, null, "oklch(0.8 0.01 240)"); ctx.metalness(0.7); rod(ctx, [x + rr, y + q * hh, zc], [x + rr, y + (q + 1) * hh - 0.002, zc], rr, 8); ctx.metalness(null); paint(ctx, null, c); rod(ctx, [x + rr, y + q * hh + 0.012, zc], [x + rr, y + (q + 1) * hh - 0.014, zc], rr + 0.002, 8); }
      x += rr * 2 + 0.012;
    }
  }
}
function bed(ctx, P) {
  if (P.cot) {
    paint(ctx, "oak", "oklch(0.88 0.05 65)"); for (const s of [-1, 1]) { rod(ctx, [s * 0.36, 0.38, -0.95], [s * 0.36, 0.38, 0.95], 0.022, 8); for (const z of [-0.7, 0.7]) rod(ctx, [s * 0.36, 0.38, z], [-s * 0.3, 0, z], 0.02, 6); }
    paint(ctx, "linen", "oklch(0.8 0.06 125)"); bx(ctx, -0.37, 0.375, -0.94, 0.37, 0.4, 0.94, 0.01);
    paint(ctx, "linen", "oklch(0.97 0.01 90)"); bx(ctx, -0.24, 0.4, -0.88, 0.24, 0.48, -0.6, 0.035); blanket(ctx, 0, 0.4, 0.62, P.col ?? "oklch(0.75 0.08 40)", 3, 0.28, 0.2); return;
  }
  paint(ctx, "oak", "oklch(0.88 0.06 60)");
  for (const s of [-1, 1]) for (const z of [-0.97, 0.97]) bx(ctx, s * 0.44 - 0.035, 0, z - 0.035, s * 0.44 + 0.035, 0.34, z + 0.035, 0.012);
  bx(ctx, -0.47, 0.2, -0.99, 0.47, 0.32, 0.99, 0.015); bx(ctx, -0.48, 0.3, -1.02, 0.48, 0.98, -0.965, 0.025); bx(ctx, -0.48, 0.3, 0.965, 0.48, 0.56, 1.01, 0.02);
  paint(ctx, "linen", "oklch(0.97 0.01 90)"); bx(ctx, -0.44, 0.32, -0.95, 0.44, 0.5, 0.95, 0.06); bx(ctx, -0.3, 0.5, -0.9, 0.3, 0.6, -0.55, 0.045);
  paint(ctx, "linen", P.col ?? "oklch(0.8 0.08 40)"); bx(ctx, -0.455, 0.36, -0.42, 0.455, 0.515, 0.955, 0.055);
  paint(ctx, "linen", "oklch(0.97 0.01 90)"); bx(ctx, -0.457, 0.4, -0.5, 0.457, 0.518, -0.38, 0.03);
  blanket(ctx, 0, 0.515, 0.66, P.col2 ?? "oklch(0.75 0.07 250)", 2, 0.3, 0.2);
}
function kit(ctx, n) {
  crate(ctx, -0.95, 0, 0, 0.42, 0.46, 0.4); crate(ctx, 0.95, 0, 0, 0.42, 0.46, 0.4);
  if (n === 0) { guitar(ctx, 0, -0.12); boots(ctx, -0.95, 1.0); mug(ctx, 0.95, 0.464, 0, "oklch(0.8 0.08 230)"); books(ctx, -0.95, 0.464, 0, 2); }
  if (n === 1) { books(ctx, -0.95, 0.464, 0, 7); sewing(ctx, 0.9, 0.464, 0); blanket(ctx, 0, 0, 0, "oklch(0.8 0.07 150)", 3); }
  if (n === 2) { boots(ctx, 0.95, 1.0); books(ctx, 0.95, 0.464, 0, 4); mug(ctx, -0.95, 0.464, 0.02, "oklch(0.9 0.03 90)"); crate(ctx, 0, 0, 0, 0.5, 0.3, 0.36, "oklch(0.85 0.06 60)"); blanket(ctx, 0, 0.304, 0, "oklch(0.78 0.09 30)", 2, 0.22, 0.15); }
}
const KX = X1 - T - 0.62, KZ0 = 1.6, KZ1 = 5.6, SHX = [4.2, 7.4], TB = [4, 4, 2.6, 1.0]; // counter, can shelves, table (house-local)
function kitchen(ctx) {
  const x1 = X1 - T, y = F;
  paint(ctx, "plaster", "oklch(0.9 0.05 150)"); bx(ctx, KX + 0.05, y + 0.1, KZ0, x1, y + 0.86, KZ1, 0.012); paint(ctx, null, "oklch(0.3 0.01 80)"); slab(ctx, [(KX + 0.08 + x1) / 2, y + 0.05, (KZ0 + KZ1) / 2], [(x1 - KX - 0.08) / 2, 0.05, (KZ1 - KZ0) / 2 - 0.01]);
  for (let i = 0; i < 5; i++) { const z0 = KZ0 + 0.05 + i * 0.79; paint(ctx, "plaster", "oklch(0.93 0.05 150)"); bx(ctx, KX + 0.025, y + 0.16, z0, KX + 0.06, y + 0.8, z0 + 0.72, 0.015); paint(ctx, null, "oklch(0.75 0.06 80)"); sphere(ctx, [KX + 0.012, y + 0.62, z0 + 0.62], 0.018, 8); }
  paint(ctx, "oak", "oklch(0.92 0.04 70)"); bx(ctx, KX, y + 0.86, KZ0 - 0.03, x1, y + 0.9, KZ1 + 0.03, 0.012);
  const sz = b.windows.find((w) => w[0] === "e")[1] - C.z; // the sink under the east window
  paint(ctx, null, "oklch(0.82 0.01 240)"); ctx.metalness(0.8); ctx.roughness(0.3);
  bx(ctx, KX + 0.1, y + 0.895, sz - 0.3, x1 - 0.1, y + 0.915, sz + 0.3, 0.008); ctx.metalness(0.3); paint(ctx, null, "oklch(0.45 0.01 240)"); slab(ctx, [(KX + x1) / 2, y + 0.916, sz], [(x1 - KX) / 2 - 0.14, 0.002, 0.26]);
  paint(ctx, null, "oklch(0.82 0.01 240)"); ctx.metalness(0.8); rod(ctx, [x1 - 0.08, y + 0.9, sz], [x1 - 0.08, y + 1.14, sz], 0.014, 8); rod(ctx, [x1 - 0.08, y + 1.14, sz], [x1 - 0.26, y + 1.1, sz], 0.012, 8);
  for (const s of [-1, 1]) rod(ctx, [x1 - 0.08, y + 0.9, sz + s * 0.12], [x1 - 0.08, y + 0.96, sz + s * 0.12], 0.02, 8);
  ctx.metalness(null); ctx.roughness(null);
  // dishes drying, a folded towel, a kettle
  const rz = sz + 0.75, cx = (KX + x1) / 2; paint(ctx, "oak", "oklch(0.92 0.05 75)"); bx(ctx, cx - 0.2, y + 0.9, rz - 0.25, cx + 0.2, y + 0.925, rz + 0.25, 0.008);
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) rod(ctx, [cx + s * 0.15, y + 0.925, rz - 0.22 + i * 0.055], [cx + s * 0.15, y + 1.02, rz - 0.22 + i * 0.055], 0.006, 5);
  for (let i = 0; i < 6; i++) { paint(ctx, null, i % 3 ? "oklch(0.95 0.01 90)" : "oklch(0.85 0.05 230)"); const z = rz - 0.19 + i * 0.055; rod(ctx, [cx, y + 1.04, z], [cx, y + 1.04, z + 0.012], 0.11, 14); }
  mug(ctx, cx - 0.05, y + 0.9, rz + 0.4, "oklch(0.85 0.06 30)"); mug(ctx, cx + 0.1, y + 0.9, rz + 0.48, "oklch(0.9 0.03 90)");
  paint(ctx, "linen", "oklch(0.9 0.08 30)"); bx(ctx, cx - 0.12, y + 0.9, sz - 0.75, cx + 0.12, y + 0.93, sz - 0.45, 0.012);
  paint(ctx, null, "oklch(0.55 0.08 30)"); ctx.metalness(0.5); rings(ctx, cx, KZ1 - 0.3, [[0, y + 0.9], [0.1, y + 0.9], [0.11, y + 0.98], [0.07, y + 1.06], [0, y + 1.07]], 12); rod(ctx, [cx - 0.09, y + 0.98, KZ1 - 0.3], [cx - 0.17, y + 1.04, KZ1 - 0.3], 0.012, 6); ctx.metalness(null);
  shelfUnit(ctx, SHX[0], SHX[1], y, ZH1 + T / 2, 1, ctx.random);
  // the table for eight
  const [tx, tz, tw, td] = TB; tableBase(ctx, tx, y, tz, tw, td);
  paint(ctx, "linen", "oklch(0.93 0.04 85)"); bx(ctx, tx - 0.9, y + 0.76, tz - 0.2, tx + 0.9, y + 0.766, tz + 0.2, 0.003);
  bowl(ctx, tx, y + 0.766, tz, 0.15, "oklch(0.8 0.08 60)"); paint(ctx, null, "oklch(0.75 0.12 85)"); for (let i = 0; i < 4; i++) sphere(ctx, [tx + Math.cos(i * 1.6) * 0.06, y + 0.82, tz + Math.sin(i * 1.6) * 0.06], 0.04, 8);
  paint(ctx, null, "oklch(0.8 0.06 230)"); rings(ctx, tx - 0.6, tz, [[0, y + 0.766], [0.07, y + 0.766], [0.09, y + 0.88], [0.05, y + 0.98], [0.055, y + 1.02], [0.045, y + 1.02], [0.04, y + 0.98], [0, y + 0.9]], 12);
  mug(ctx, tx + 0.55, y + 0.766, tz + 0.1, "oklch(0.9 0.03 90)"); mug(ctx, tx + 0.7, y + 0.766, tz - 0.12, "oklch(0.75 0.09 150)");
}
function basement(ctx) {
  const y = BF, zs = Z1 - 0.2;
  shelfUnit(ctx, XM + 0.6, XM + 3.4, y, zs, -1, ctx.random, "mixed"); shelfUnit(ctx, XM + 3.7, XM + 6.5, y, zs, -1, ctx.random);
  crate(ctx, XM + 7.3, y, zs - 0.4, 0.7, 0.5, 0.6); crate(ctx, XM + 7.25, y + 0.508, zs - 0.4, 0.55, 0.4, 0.5, "oklch(0.85 0.06 60)"); crate(ctx, XM + 8.1, y, zs - 0.35, 0.6, 0.45, 0.5);
  for (let i = 0; i < 3; i++) { paint(ctx, "linen", "oklch(0.85 0.06 80)"); sphere(ctx, [XM + 0.6, y + 0.16 + i * 0.24, 4.4 + (i % 2) * 0.1], 0.3, 10, [1, 0.55, 1.5]); }
  paint(ctx, "rug", null); bx(ctx, XM + 2.2, y, 2.6, XM + 5.4, y + 0.015, 4.4, 0.006);
}
function yard(ctx) {
  // rain barrel, full of sand, on the porch by the door
  const bxx = 1.55, bz = Z1 + 0.5, by = 0.15;
  paint(ctx, "timber", "oklch(0.85 0.05 60)"); rings(ctx, bxx, bz, [[0, by], [0.3, by], [0.36, by + 0.3], [0.37, by + 0.48], [0.36, by + 0.66], [0.31, by + 0.95], [0.28, by + 0.95], [0.3, by + 0.86]], 16);
  paint(ctx, null, "oklch(0.4 0.02 240)"); ctx.metalness(0.7); for (const [rr, yy] of [[0.325, 0.14], [0.372, 0.48], [0.33, 0.84]]) rings(ctx, bxx, bz, [[rr, by + yy - 0.025], [rr + 0.008, by + yy - 0.02], [rr + 0.008, by + yy + 0.02], [rr, by + yy + 0.025]], 16); ctx.metalness(null);
  paint(ctx, "cdn/texture-terrain-desert-sand.png", "oklch(0.95 0.05 85)"); rings(ctx, bxx, bz, [[0.3, by + 0.86], [0.2, by + 0.9], [0.08, by + 0.94], [0, by + 0.95]], 16);
  // woodpile against the west wall
  for (let row = 0; row < 5; row++) for (let i = 0; i < 13 - row; i++) { const rr = 0.085 + ctx.random() * 0.02, z = 1.2 + row * 0.1 + i * 0.2, yv = 0.1 + row * 0.172, o = ctx.random() * 0.06; paint(ctx, "timber", "oklch(0.8 0.06 55)"); const a = [X0 - 0.12 - o, yv, z], e = [X0 - 0.75 - o, yv, z]; rod(ctx, a, e, rr, 7); paint(ctx, null, "oklch(0.86 0.07 80)"); rod(ctx, [e[0] - 0.003, yv, z], [e[0], yv, z], rr * 0.82, 7); }
  paint(ctx, "timber", TINT.timber); for (const z of [1.05, 3.75]) bx(ctx, X0 - 0.5, 0, z - 0.04, X0 - 0.42, 0.95, z + 0.04, 0.012);
  // clothesline east of the house
  const cx = X1 + 3.4, za = -3.6, ze = 2.4, top = 2.0;
  paint(ctx, "timber", TINT.timber); for (const z of [za, ze]) { rod(ctx, [cx, 0, z], [cx, top + 0.1, z], 0.05, 8); rod(ctx, [cx - 0.5, top, z], [cx + 0.5, top, z], 0.035, 6); }
  paint(ctx, null, "oklch(0.9 0.01 90)");
  const sag = (t) => top - 0.02 - Math.sin(t * Math.PI) * 0.12;
  for (const ox of [-0.42, 0.42]) for (let i = 0; i < 8; i++) rod(ctx, [cx + ox, sag(i / 8), za + ((ze - za) * i) / 8], [cx + ox, sag((i + 1) / 8), za + ((ze - za) * (i + 1)) / 8], 0.006, 4);
  const cloth = (ox, t0, t1, len, col) => { paint(ctx, "linen", col); const N = 5, M = 4; ctx.smooth(); const P = (i, j) => { const t = t0 + ((t1 - t0) * i) / N; return [cx + ox + Math.sin(i * 1.9 + j * 0.8) * 0.035 * (j / M), sag(t) - (len * j) / M, za + (ze - za) * t]; }; for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) face(ctx, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), [1, 0, 0]); ctx.flat(); };
  cloth(-0.42, 0.1, 0.42, 1.1, "oklch(0.97 0.01 90)"); cloth(-0.42, 0.5, 0.68, 0.7, "oklch(0.85 0.08 30)"); cloth(0.42, 0.2, 0.36, 0.65, "oklch(0.8 0.07 240)"); cloth(0.42, 0.45, 0.85, 1.0, "oklch(0.9 0.06 90)");
  // handcart with packed crates, by the porch's east end
  const hx = PX1 + 1.6, hz = Z1 + 1.6;
  paint(ctx, "timber", TINT.timber); bx(ctx, hx - 0.45, 0.46, hz - 0.75, hx + 0.45, 0.52, hz + 0.75, 0.012);
  for (const s of [-1, 1]) { bx(ctx, hx + s * 0.45 - 0.02, 0.5, hz - 0.75, hx + s * 0.45 + 0.02, 0.72, hz + 0.75, 0.01); rod(ctx, [hx + s * 0.4, 0.5, hz + 0.7], [hx + s * 0.4, 0.86, hz + 1.55], 0.025, 6); rod(ctx, [hx + s * 0.3, 0.46, hz + 0.6], [hx + s * 0.3, 0, hz + 0.68], 0.025, 6); }
  bx(ctx, hx - 0.45, 0.5, hz - 0.77, hx + 0.45, 0.72, hz - 0.73, 0.01); rod(ctx, [hx - 0.42, 0.86, hz + 1.55], [hx + 0.42, 0.86, hz + 1.55], 0.022, 6);
  for (const s of [-1, 1]) { paint(ctx, null, "oklch(0.3 0.01 60)"); const wx = hx + s * 0.52; rod(ctx, [wx - 0.03, 0.36, hz - 0.15], [wx + 0.03, 0.36, hz - 0.15], 0.36, 18); paint(ctx, "timber", "oklch(0.8 0.05 60)"); rod(ctx, [wx - 0.034, 0.36, hz - 0.15], [wx + 0.034, 0.36, hz - 0.15], 0.3, 18); paint(ctx, null, "oklch(0.35 0.02 240)"); rod(ctx, [wx - 0.05, 0.36, hz - 0.15], [wx + 0.05, 0.36, hz - 0.15], 0.05, 8); }
  rod(ctx, [hx - 0.52, 0.36, hz - 0.15], [hx + 0.52, 0.36, hz - 0.15], 0.02, 6);
  crate(ctx, hx - 0.2, 0.52, hz - 0.4, 0.44, 0.34, 0.5); crate(ctx, hx + 0.22, 0.52, hz + 0.25, 0.4, 0.3, 0.6, "oklch(0.85 0.06 60)"); crate(ctx, hx - 0.18, 0.864, hz - 0.38, 0.38, 0.26, 0.42, "oklch(0.88 0.05 80)");
  paint(ctx, "linen", "oklch(0.8 0.06 125)"); sphere(ctx, [hx - 0.2, 0.62, hz + 0.3], 0.2, 10, [1, 0.5, 1.4]);
  // the swamp cooler on the north slope
  const sx = 4, sz = -2.6, sy = roofY(sz);
  paint(ctx, null, "oklch(0.5 0.01 240)"); ctx.metalness(0.6); for (const ox of [-0.42, 0.42]) for (const oz of [-0.42, 0.42]) rod(ctx, [sx + ox, roofY(sz + oz) - 0.02, sz + oz], [sx + ox, sy + 0.2, sz + oz], 0.025, 6);
  paint(ctx, null, "oklch(0.8 0.02 95)"); ctx.metalness(0.4); bx(ctx, sx - 0.5, sy + 0.18, sz - 0.5, sx + 0.5, sy + 1.08, sz + 0.5, 0.04);
  paint(ctx, null, "oklch(0.6 0.02 95)"); for (let k = 0; k < 9; k++) { const yy = sy + 0.3 + k * 0.075; bx(ctx, sx - 0.4, yy, sz - 0.515, sx + 0.4, yy + 0.04, sz - 0.5, 0.006); bx(ctx, sx - 0.515, yy, sz - 0.4, sx - 0.5, yy + 0.04, sz + 0.4, 0.006); bx(ctx, sx + 0.5, yy, sz - 0.4, sx + 0.515, yy + 0.04, sz + 0.4, 0.006); }
  bx(ctx, sx - 0.25, roofY(sz + 1.1) - 0.05, sz + 0.5, sx + 0.25, sy + 0.75, sz + 1.1, 0.03); ctx.metalness(null);
}
function bench(ctx) {
  paint(ctx, "timber", TINT.timber);
  for (const z of [-0.17, -0.02, 0.13]) bx(ctx, -0.8, 0.41, z - 0.065, 0.8, 0.45, z + 0.065, 0.012);
  for (const s of [-1, 1]) { bx(ctx, s * 0.7 - 0.035, 0, -0.2, s * 0.7 + 0.035, 0.41, -0.13, 0.012); bx(ctx, s * 0.7 - 0.035, 0, 0.16, s * 0.7 + 0.035, 0.95, 0.23, 0.012); bx(ctx, s * 0.7 - 0.03, 0.34, -0.2, s * 0.7 + 0.03, 0.41, 0.2, 0.01); }
  for (const yy of [0.62, 0.8]) bx(ctx, -0.8, yy, 0.165, 0.8, yy + 0.11, 0.2, 0.012);
  blanket(ctx, 0.5, 0.45, -0.02, "oklch(0.78 0.09 30)", 2, 0.2, 0.15);
}
function door(ctx, P) {
  // zo: the leaf sits off the wall's centre line toward its swing, so an open leaf clears the jamb's face instead of slicing through it (z-fight)
  const w = P.w ?? 1, hh = P.h ?? DH - 0.02, zo = P.zo ?? 0;
  paint(ctx, "oak", P.col ?? "oklch(0.92 0.05 70)"); bx(ctx, 0.005, 0.01, zo - 0.022, w - 0.005, hh, zo + 0.022, 0.008);
  for (const s of [-1, 1]) for (const [ya, yb] of [[0.15, 0.95], [1.1, hh - 0.15]]) bx(ctx, 0.13, ya, zo + s * 0.02, w - 0.13, yb, zo + s * 0.031, 0.01);
  paint(ctx, null, "oklch(0.75 0.08 85)"); ctx.metalness(0.8); for (const s of [-1, 1]) { rod(ctx, [w - 0.08, 1.0, zo + s * 0.02], [w - 0.08, 1.0, zo + s * 0.06], 0.012, 6); sphere(ctx, [w - 0.08, 1.0, zo + s * 0.075], 0.03, 10); } ctx.metalness(null);
}
function lamp(ctx, P) {
  const d = P.drop ?? 0.6; paint(ctx, null, "oklch(0.25 0.01 60)"); rod(ctx, [0, 0.1, 0], [0, d, 0], 0.008, 5); rings(ctx, 0, 0, [[0.05, d - 0.03], [0.05, d], [0, d]], 8);
  paint(ctx, null, "oklch(0.55 0.08 160)"); rings(ctx, 0, 0, [[0.03, 0.12], [0.06, 0.09], [0.2, -0.01], [0.215, -0.03]], 14);
  paint(ctx, null, "oklch(0.97 0.05 85)"); ctx.emissive("oklch(0.95 0.12 80)"); sphere(ctx, [0, 0.02, 0], 0.045, 10); ctx.emissive(null);
}
function maptable(ctx) {
  tableBase(ctx, 0, 0, 0, 1.6, 0.9);
  paint(ctx, null, "oklch(0.93 0.04 90)"); bx(ctx, -0.5, 0.76, -0.3, 0.3, 0.764, 0.3, 0.002); rod(ctx, [0.42, 0.79, -0.3], [0.62, 0.79, 0.25], 0.03, 8); rod(ctx, [0.5, 0.785, -0.32], [0.72, 0.785, 0.1], 0.025, 8);
  mug(ctx, -0.65, 0.76, 0.28, "oklch(0.7 0.1 30)"); paint(ctx, null, "oklch(0.8 0.13 90)"); rod(ctx, [-0.2, 0.772, 0.1], [0.0, 0.772, 0.2], 0.005, 5); paint(ctx, null, "oklch(0.7 0.08 80)"); ctx.metalness(0.8); rings(ctx, 0.1, -0.1, [[0, 0.764], [0.04, 0.764], [0.04, 0.78], [0, 0.782]], 12); ctx.metalness(null);
}
function mapboard(ctx) { paint(ctx, "oak", "oklch(0.85 0.06 60)"); bx(ctx, -0.95, 0, 0, 0.95, 1.3, 0.035, 0.012); paint(ctx, null, "oklch(0.93 0.04 88)"); slab(ctx, [0, 0.65, -0.002], [0.88, 0.58, 0.004]); }
function rug(ctx, P) { paint(ctx, "rug", null); bx(ctx, -(P.w ?? 2.6) / 2, 0, -(P.d ?? 1.8) / 2, (P.w ?? 2.6) / 2, 0.015, (P.d ?? 1.8) / 2, 0.006); }
function picture(ctx, P) { // a framed picture hung flat on a wall: back at z 0, face toward -z, foot at the frame's bottom edge
  const w = P.w ?? 0.8, hh = P.h ?? 0.6, f = P.f ?? 0.055, d = 0.035;
  paint(ctx, "oak", P.frame ?? "oklch(0.55 0.07 55)"); ctx.roughness(0.6);
  bx(ctx, -w / 2 - f, 0, -d, w / 2 + f, f, 0, 0.008); bx(ctx, -w / 2 - f, hh + f, -d, w / 2 + f, hh + 2 * f, 0, 0.008);
  bx(ctx, -w / 2 - f, f, -d, -w / 2, hh + f, 0, 0.008); bx(ctx, w / 2, f, -d, w / 2 + f, hh + f, 0, 0.008);
  paint(ctx, null, "oklch(0.9 0.02 85)"); ctx.roughness(0.9); bx(ctx, -w / 2, f, -0.012, w / 2, hh + f, -0.004, 0.002); // the mat behind the print
  ctx.roughness(null); // the print itself is its own thin board (scripts/lib/l169-house.js), textured once across its face

}
function roll(ctx, P) { // a bedroll on the floor: ticking pad, the quilt over it, a pillow, a blanket rolled at the foot
  paint(ctx, "cdn/texture-striped-cotton-mattress-ticking.png", "oklch(0.95 0.02 85)"); bx(ctx, -0.38, 0, -0.95, 0.38, 0.075, 0.95, 0.03);
  paint(ctx, "cdn/texture-patchwork-quilt-wool-blanket.png", P.col ?? "oklch(0.62 0.09 30)"); bx(ctx, -0.39, 0.055, -0.45, 0.39, 0.1, 0.8, 0.035); bx(ctx, -0.39, 0.075, -0.52, 0.39, 0.115, -0.4, 0.03);
  paint(ctx, "linen", "oklch(0.97 0.01 90)"); sphere(ctx, [0, 0.13, -0.74], 0.22, 14, [1.15, 0.32, 0.6]);
  paint(ctx, "linen", P.col ?? "oklch(0.62 0.09 30)"); rod(ctx, [-0.34, 0.15, 0.82], [0.34, 0.15, 0.82], 0.07, 12); ctx.color("oklch(0.4 0.03 60)"); for (const x of [-0.2, 0.2]) rod(ctx, [x, 0.15, 0.82], [x + 0.03, 0.15, 0.82], 0.075, 12);
}
function pot(ctx) { // a stock pot with a lid and two handles
  paint(ctx, null, "oklch(0.55 0.01 250)"); ctx.metalness(0.85); ctx.roughness(0.35);
  rings(ctx, 0, 0, [[0, 0], [0.12, 0], [0.13, 0.01], [0.13, 0.15], [0.138, 0.16], [0.12, 0.16], [0.118, 0.02], [0, 0.02]], 22);
  rings(ctx, 0, 0, [[0.132, 0.155], [0.1, 0.175], [0.03, 0.19], [0, 0.19]], 22); paint(ctx, null, "oklch(0.25 0.01 60)"); ctx.metalness(0.2); rings(ctx, 0, 0, [[0.025, 0.19], [0.025, 0.215], [0.03, 0.225], [0, 0.23]], 10);
  ctx.metalness(0.85); paint(ctx, null, "oklch(0.5 0.01 250)"); for (const s of [-1, 1]) { rod(ctx, [s * 0.13, 0.12, -0.03], [s * 0.17, 0.125, -0.03], 0.008, 6); rod(ctx, [s * 0.17, 0.125, -0.03], [s * 0.17, 0.125, 0.03], 0.008, 6); rod(ctx, [s * 0.17, 0.125, 0.03], [s * 0.13, 0.12, 0.03], 0.008, 6); }
  ctx.metalness(null); ctx.roughness(null);
}
export function geometry(ctx) {
  const P = ctx.params ?? {};
  const parts = { shell, yard, kitchen, basement, bench, maptable, mapboard, bed: () => bed(ctx, P), kit: () => kit(ctx, P.n ?? 0), door: () => door(ctx, P), lamp: () => lamp(ctx, P), rug: () => rug(ctx, P), picture: () => picture(ctx, P), roll: () => roll(ctx, P), pot }; (parts[P.part] ?? pot)(ctx); // no part named (a bare preview): the stock pot, never an empty mesh
}
const box = (x0, y0, z0, x1, y1, z1) => ({ kind: "box", width: x1 - x0, height: y1 - y0, depth: z1 - z0, center: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });
export function collider(ctx) {
  const P = ctx.params ?? {}, p = P.part;
  if (p === "shell") return shellCollider(ctx);
  if (p === "door") return [box(0, 0, -0.025, P.w ?? 1, P.h ?? DH - 0.02, 0.025)];
  if (p === "bed") return [box(-0.47, 0, -1, 0.47, P.cot ? 0.4 : 0.5, 1)];
  if (p === "kit") return [box(-1.16, 0, -0.2, -0.74, 0.46, 0.2), box(0.74, 0, -0.2, 1.16, 0.46, 0.2)];
  if (p === "kitchen") return [box(KX, F, KZ0, X1 - T, F + 0.9, KZ1), box(SHX[0], F, ZH1 + T / 2, SHX[1], F + 1.95, ZH1 + T / 2 + 0.32), box(TB[0] - TB[2] / 2, F + 0.66, TB[1] - TB[3] / 2, TB[0] + TB[2] / 2, F + 0.76, TB[1] + TB[3] / 2)];
  if (p === "basement") return [box(XM + 0.6, BF, Z1 - 0.52, XM + 6.5, BF + 1.95, Z1 - 0.2), box(XM + 6.9, BF, Z1 - 0.75, XM + 8.4, BF + 0.5, Z1 - 0.2), box(XM + 0.2, BF, 3.9, XM + 0.95, BF + 0.8, 5)];
  if (p === "yard") return [{ kind: "cylinder", radiusTop: 0.36, radiusBottom: 0.36, height: 0.95, center: [1.55, 0.62, Z1 + 0.5] }, box(X0 - 0.8, 0, 1.05, X0, 0.95, 3.8), box(X1 + 3.35, 0, -3.65, X1 + 3.45, 2.1, -3.55), box(X1 + 3.35, 0, 2.35, X1 + 3.45, 2.1, 2.45), box(PX1 + 1.1, 0, Z1 + 0.85, PX1 + 2.1, 1.1, Z1 + 2.4)];
  if (p === "bench") return [box(-0.8, 0, -0.2, 0.8, 0.45, 0.23)];
  if (p === "maptable") return [box(-0.8, 0.66, -0.45, 0.8, 0.76, 0.45)];
  return [];
}
