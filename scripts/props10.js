// Level 10 small props, one script by kind: params { kind: "oven" | "sheaves" | "hopper" | "radio" | "crate" }
const BRICK = "cdn/texture-weathered-red-brick-barn-wall-english-bond-moss-stains.png";
const WOOD = "cdn/texture-worn-hardwood-grain.png";
const ring = (n, r, y, cx = 0, cz = 0, sx = 1) => Array.from({ length: n }, (_, j) => { const a = (j / n) * 6.2832; return [cx + Math.cos(a) * r * sx, y, cz + Math.sin(a) * r]; });
function lathe(ctx, rings, n, cx = 0, cz = 0, sx = 1) { // rings [[y, r]...], closed caps where r = 0
  const P = rings.map(([y, r]) => ring(n, r, y, cx, cz, sx));
  for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < n; j++) { const k = (j + 1) % n; ctx.quad(P[i][j], P[i][k], P[i + 1][k], P[i + 1][j]); }
}
function box(ctx, x0, y0, z0, x1, y1, z1) {
  const q = (a, b, c, d) => ctx.quad(a, b, c, d);
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}
export function geometry(ctx) {
  try { const __q = ctx.quad.bind(ctx), __t = ctx.tri.bind(ctx); ctx.quad = (...a) => __q(...a.flat()); ctx.tri = (...a) => __t(...a.flat()); } catch (e) {}
  const kind = ctx.params?.kind ?? "crate", lod = ctx.lod ?? 1, N = lod <= 2 ? 16 : lod <= 3 ? 10 : 6, R = () => ctx.random();
  if (kind === "oven") { // a domed brick bread oven on a stone plinth, arched mouth facing -z, a flue at the back
    ctx.albedo(null); ctx.roughness(0.95); ctx.color("oklch(0.55 0.015 80)");
    box(ctx, -0.95, 0, -0.8, 0.95, 0.75, 0.8);
    ctx.albedo(BRICK); ctx.color("oklch(0.66 0.07 40)");
    const dome = []; for (let i = 0; i <= 6; i++) { const t = i / 6; dome.push([0.75 + Math.sin(t * 1.5708) * 0.75, Math.cos(t * 1.5708) * 0.78 + (i === 6 ? 0 : 0.0)]); }
    lathe(ctx, dome.map(([y, r]) => [y, Math.max(0.001, r)]), N, 0, 0.05, 1.1);
    // the mouth: an arch of soot-black with a brick lip
    ctx.albedo(null); ctx.color("oklch(0.12 0.01 40)"); ctx.emissive?.("oklch(0.35 0.12 50)");
    const m = []; for (let j = 0; j <= 8; j++) { const a = (j / 8) * 3.1416; m.push([Math.cos(a) * 0.32, 0.78 + Math.sin(a) * 0.3]); }
    for (let j = 0; j < 8; j++) ctx.tri([0, 0.78, -0.79], [m[j + 1][0], m[j + 1][1], -0.79], [m[j][0], m[j][1], -0.79]);
    ctx.quad([-0.32, 0.76, -0.79], [0.32, 0.76, -0.79], [0.32, 0.78, -0.79], [-0.32, 0.78, -0.79]);
    ctx.emissive?.(null);
    ctx.albedo(BRICK); ctx.color("oklch(0.55 0.07 40)");
    lathe(ctx, [[1.25, 0.13], [1.95, 0.11], [2.0, 0.14], [2.05, 0.001]], 8, 0, 0.55);
    ctx.albedo(WOOD); ctx.color("oklch(0.45 0.05 60)"); // the peel leaning on it
    box(ctx, 0.75, 0.0, -0.95, 0.8, 1.5, -0.91); box(ctx, 0.62, 0.0, -0.98, 0.93, 0.25, -0.9);
    return;
  }
  if (kind === "sheaves") { // stooks of bound wheat: 5 sheaves leaning in a ring, heads up
    const S = lod <= 2 ? 5 : 3;
    for (let s = 0; s < S; s++) {
      const a = (s / S) * 6.2832 + R() * 0.4, d = 0.32, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      ctx.albedo(null); ctx.roughness(1); ctx.color(`oklch(${0.74 + R() * 0.06} 0.12 ${82 + R() * 6})`);
      const lean = -0.22, tx = cx * (1 + lean * 2), tz = cz * (1 + lean * 2);
      const rings = [[0, 0.14], [0.45, 0.11], [0.55, 0.07], [0.62, 0.11], [1.05, 0.2], [1.25, 0.12], [1.35, 0.001]];
      const P = rings.map(([y, r]) => { const t = y / 1.35; return ring(N > 8 ? 9 : 6, r, y, cx + (tx - cx) * t, cz + (tz - cz) * t); });
      for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < P[i].length; j++) { const k = (j + 1) % P[i].length; ctx.quad(P[i][j], P[i][k], P[i + 1][k], P[i + 1][j]); }
      ctx.color("oklch(0.5 0.08 60)"); // the twine band
      const bx = cx + (tx - cx) * 0.4, bz = cz + (tz - cz) * 0.4;
      lathe(ctx, [[0.52, 0.08], [0.6, 0.08]], 8, bx, bz);
    }
    return;
  }
  if (kind === "hopper") { // a galvanised discharge chute on legs, a hand wheel on the gate
    ctx.albedo(null); ctx.roughness(0.45); ctx.metalness?.(0.7); ctx.color("oklch(0.68 0.01 240)");
    const sq = (y, h) => [[-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h]];
    const A = sq(1.6, 0.55), B = sq(0.75, 0.15);
    for (let j = 0; j < 4; j++) { const k = (j + 1) % 4; ctx.quad(A[j], A[k], B[k], B[j]); ctx.quad(B[j], B[k], A[k], A[j]); }
    box(ctx, -0.15, 0.55, -0.15, 0.15, 0.75, 0.15);
    ctx.color("oklch(0.4 0.02 60)"); for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) box(ctx, x - 0.04, 0, z - 0.04, x + 0.04, 1.6, z + 0.04);
    ctx.color("oklch(0.45 0.14 30)"); lathe(ctx, [[0.6, 0.0], [0.6, 0.14], [0.64, 0.14], [0.64, 0.0]], 12, 0, -0.2); // red hand wheel
    ctx.metalness?.(0);
    return;
  }
  if (kind === "radio") { // a field shortwave set: rounded steel case, dials, a whip antenna
    ctx.albedo(null); ctx.roughness(0.6); ctx.color("oklch(0.4 0.03 140)");
    box(ctx, -0.22, 0, -0.14, 0.22, 0.24, 0.14);
    ctx.color("oklch(0.18 0.01 140)"); box(ctx, -0.2, 0.03, -0.145, 0.2, 0.21, -0.14);
    ctx.color("oklch(0.85 0.05 85)"); box(ctx, -0.17, 0.13, -0.15, 0.0, 0.19, -0.145); // the tuning window
    ctx.color("oklch(0.25 0.01 0)"); for (const x of [0.07, 0.15]) lathe(ctx, [[0.0, 0.03], [0.0, 0.03]], 10, x, -0.15);
    for (const x of [0.07, 0.15]) { const c = ring(10, 0.03, 0, x, 0); for (let j = 0; j < 10; j++) { const k = (j + 1) % 10; ctx.quad([c[j][0], 0.06 + c[j][2], -0.145], [c[k][0], 0.06 + c[k][2], -0.145], [c[k][0], 0.06 + c[k][2], -0.17], [c[j][0], 0.06 + c[j][2], -0.17]); } }
    ctx.color("oklch(0.75 0.01 240)"); lathe(ctx, [[0.24, 0.006], [0.95, 0.003], [0.97, 0.01]], 5, 0.18, 0.1);
    ctx.color("oklch(0.3 0.02 60)"); box(ctx, -0.18, 0.24, -0.02, -0.16, 0.3, 0.02); box(ctx, 0.08, 0.24, -0.02, 0.1, 0.3, 0.02); box(ctx, -0.18, 0.28, -0.02, 0.1, 0.3, 0.02); // handle
    return;
  }
  // crate: a plank crate with gaps, corner battens, a lid slightly askew
  ctx.albedo(WOOD); ctx.roughness(0.9); ctx.color(`oklch(${0.55 + R() * 0.08} 0.06 65)`);
  const W = 0.45, D = 0.35, H = 0.62;
  for (let i = 0; i < 3; i++) { const y0 = 0.02 + i * 0.205, y1 = y0 + 0.18; box(ctx, -W, y0, -D, W, y1, -D + 0.025); box(ctx, -W, y0, D - 0.025, W, y1, D); box(ctx, -W, y0, -D, -W + 0.025, y1, D); box(ctx, W - 0.025, y0, -D, W, y1, D); }
  box(ctx, -W + 0.02, 0, -D + 0.02, W - 0.02, 0.03, D - 0.02);
  ctx.color("oklch(0.42 0.05 60)");
  for (const [x, z] of [[-W, -D], [W, -D], [-W, D], [W, D]]) box(ctx, x - 0.035, 0, z - 0.035, x + 0.035, H, z + 0.035);
  ctx.color(`oklch(${0.5 + R() * 0.06} 0.06 65)`); box(ctx, -W - 0.02, H, -D - 0.02, W + 0.04, H + 0.04, D + 0.02);
}
export function collider(ctx) {
  const k = ctx.params?.kind ?? "crate";
  if (k === "oven") return [{ kind: "box", width: 1.9, height: 1.5, depth: 1.6, center: [0, 0.75, 0] }];
  if (k === "hopper") return [{ kind: "box", width: 1.1, height: 1.6, depth: 1.1, center: [0, 0.8, 0] }];
  if (k === "sheaves") return [{ kind: "cylinder", radiusTop: 0.45, radiusBottom: 0.5, height: 1.3, center: [0, 0.65, 0] }];
  if (k === "radio") return [{ kind: "box", width: 0.45, height: 0.25, depth: 0.3, center: [0, 0.12, 0] }];
  return [{ kind: "box", width: 0.92, height: 0.66, depth: 0.72, center: [0, 0.33, 0] }];
}
