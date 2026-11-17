// Level 69 "The Road Trip of Affliction": one 40 m slice of the endless highway, walls and all.
// Origin at the slice's start, road runs toward -Z. 4 lanes (14 m) + 2 m shoulders, kerbs, drainage grates,
// tall weathered concrete walls cast in 8 m panels with expansion joints, a coping on top. Params: { seed, tunnel }
// tunnel: "left" | "right" cuts a 9 m opening in that wall at the slice's middle (the perpendicular exit tunnel's mouth).
const L = 40, HW = 7, SH = 9, WALL_IN = 9.4, WALL_T = 0.7, WALL_H = 11;
const T = {
  asphalt: "cdn/texture-worn-cracked-highway-asphalt-dark-grey.png",
  shoulder: "cdn/texture-weathered-asphalt-shoulder-gravel-edge.png",
  concrete: "cdn/texture-weathered-stained-poured-concrete-wall-panels.png",
  kerb: "cdn/texture-old-concrete-kerb-stone.png",
  grate: "cdn/texture-rusty-steel-drain-grate.png",
};
function box(ctx, x0, y0, z0, x1, y1, z1, faces = "all") {
  const q = (a, b, c, d) => ctx.quad(...a, ...b, ...c, ...d);
  const p = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  if (faces.includes("t") || faces === "all") q(p[3], p[2], p[6], p[7]);
  if (faces === "all") { q(p[0], p[4], p[5], p[1]); }
  q(p[1], p[5], p[6], p[2]); q(p[4], p[0], p[3], p[7]);
  q(p[0], p[1], p[2], p[3]); q(p[5], p[4], p[7], p[6]);
}
export function geometry(ctx) {
  const P = ctx.params ?? {}, lod = ctx.lod, tun = P.tunnel;
  ctx.roughness(0.92);
  // road deck: a slight crown so it reads as engineering, not a plane
  ctx.albedo(T.asphalt); ctx.color("#cfcfcf");
  const N = lod <= 2 ? 8 : 2;
  for (let i = 0; i < N; i++) {
    const xa = -HW + (2 * HW * i) / N, xb = -HW + (2 * HW * (i + 1)) / N;
    const ya = 0.06 * (1 - (xa / HW) ** 2), yb = 0.06 * (1 - (xb / HW) ** 2);
    ctx.quad(xa, ya, 0, xb, yb, 0, xb, yb, -L, xa, ya, -L);
  }
  // shoulders, a hair lower, rougher
  ctx.albedo(T.shoulder); ctx.color("#b8b4ac");
  for (const s of [-1, 1]) { const a = s * HW, b = s * SH; ctx.quad(Math.min(a, b), -0.02, 0, Math.max(a, b), -0.02, 0, Math.max(a, b), -0.02, -L, Math.min(a, b), -0.02, -L); }
  // markings: painted strips a few mm proud, worn (gaps and fading by seed)
  ctx.albedo(null); ctx.roughness(0.7);
  const mark = (x, w, z0, z1, col) => { ctx.color(col); const y = 0.065 * (1 - (x / HW) ** 2) + 0.006; ctx.quad(x - w, y, z0, x + w, y, z0, x + w, y, z1, x - w, y, z1); };
  for (const s of [-1, 1]) mark(s * (HW - 0.2), 0.08, 0, -L, "#c9c6b4");
  mark(-0.12, 0.06, 0, -L, "#b8962e"); mark(0.12, 0.06, 0, -L, "#b8962e");
  for (const s of [-1, 1]) for (let z = -2; z > -L; z -= 12) mark(s * 3.5, 0.07, z, z - 4.5, "#bdb9a8");
  if (lod <= 2) { // reflector studs on the centre line
    ctx.color("#d8b040"); ctx.emissive("#3a2a08");
    for (let z = -6; z > -L; z -= 12) box(ctx, -0.08, 0.06, z, 0.08, 0.1, z - 0.12);
    ctx.emissive(null);
  }
  // kerbs and drainage grates against each wall
  ctx.albedo(T.kerb); ctx.color("#bcb8ae"); ctx.roughness(0.9);
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -WALL_IN : WALL_IN - 0.35, x1 = x0 + 0.35;
    if (tun && ((tun === "left") === (s < 0))) { box(ctx, x0, -0.02, 0, x1, 0.18, -15.5); box(ctx, x0, -0.02, -24.5, x1, 0.18, -L); }
    else box(ctx, x0, -0.02, 0, x1, 0.18, -L);
  }
  if (lod <= 2) {
    ctx.albedo(T.grate); ctx.color("#8a8378"); ctx.metalness(0.6); ctx.roughness(0.6);
    for (const s of [-1, 1]) for (let z = -9; z > -L; z -= 20) { const x = s * (SH - 0.35); ctx.quad(x - 0.3, -0.01, z, x + 0.3, -0.01, z, x + 0.3, -0.01, z - 0.9, x - 0.3, -0.01, z - 0.9); }
    ctx.metalness(null);
  }
  // the walls: 8 m cast panels, a dark joint between, weathering streaks via tint per panel
  ctx.albedo(T.concrete); ctx.roughness(0.95);
  for (const s of [-1, 1]) {
    const xi = s * WALL_IN, xo = s * (WALL_IN + WALL_T);
    for (let p = 0; p < L / 8; p++) {
      const z0 = -p * 8 - 0.04, z1 = -(p + 1) * 8 + 0.04;
      if (tun && ((tun === "left") === (s < 0)) && z0 < -15 && z1 > -25) continue; // the tunnel mouth
      const k = Math.abs(Math.sin((P.seed ?? 1) * 12.9 + p * 7.3 + s));
      const g = Math.round(150 + k * 40); ctx.color(`rgb(${g},${g - 4},${g - 12})`);
      box(ctx, Math.min(xi, xo), 0, z0, Math.max(xi, xo), WALL_H, z1, "sides");
      if (lod <= 2) { // the panel's form-tie holes and a horizontal lift line
        ctx.color("#3a3834");
        const face = xi - s * 0.01;
        for (const y of [2.2, 5.6, 9]) for (const dz of [-1.5, -4, -6.5]) ctx.quad(face, y - 0.05, z0 + dz + 0.05 * s, face, y - 0.05, z0 + dz - 0.05 * s, face, y + 0.05, z0 + dz - 0.05 * s, face, y + 0.05, z0 + dz + 0.05 * s);
      }
    }
    // the joints: recessed dark strips
    ctx.color("#2a2824");
    for (let p = 0; p <= L / 8; p++) { const z = -p * 8, f = xi + s * 0.12; ctx.quad(f, 0, z + 0.04 * s, f, 0, z - 0.04 * s, f, WALL_H, z - 0.04 * s, f, WALL_H, z + 0.04 * s); }
    // coping: a lip on the top edge
    ctx.color("#a7a29a");
    box(ctx, Math.min(xi, xo) - 0.15, WALL_H, 0, Math.max(xi, xo) + 0.15, WALL_H + 0.35, -L, "tsides");
  }
  if (tun) { // the mouth: a heavy lintel and two cheeks so it reads as a cut tunnel, not a gap
    const s = tun === "left" ? -1 : 1, xi = s * WALL_IN, xo = s * (WALL_IN + 3);
    ctx.color("#8c877e");
    box(ctx, Math.min(xi, xo), 5.2, -15, Math.max(xi, xo), WALL_H, -25, "sides");
  }
}
export function collider(ctx) {
  const P = ctx.params ?? {}, tun = P.tunnel, out = [];
  out.push({ kind: "box", width: 2 * SH + 2, height: 0.4, depth: L, center: [0, -0.2, -L / 2] });
  for (const s of [-1, 1]) {
    const cx = s * (WALL_IN + WALL_T / 2);
    if (tun && ((tun === "left") === (s < 0))) {
      out.push({ kind: "box", width: WALL_T, height: WALL_H, depth: 15, center: [cx, WALL_H / 2, -7.5] });
      out.push({ kind: "box", width: WALL_T, height: WALL_H, depth: 15, center: [cx, WALL_H / 2, -32.5] });
    } else out.push({ kind: "box", width: WALL_T, height: WALL_H, depth: L, center: [cx, WALL_H / 2, -L / 2] });
    // the kerb stops a car gently before the wall
    out.push({ kind: "box", width: 0.35, height: 0.18, depth: L, center: [s * (WALL_IN - 0.18), 0.09, -L / 2] });
  }
  return out;
}
