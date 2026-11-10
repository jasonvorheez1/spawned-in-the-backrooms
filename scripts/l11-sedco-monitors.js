// Sedco Spotlight's CCTV monitor wall (Shelly, Nov 10: "the sedco building interior could be less blocky"): a steel AV rack over a
// black cabinet, three rows of 2009 CRT monitors (beige and charcoal, chamfered bezels, tapered tubes, bulged glass, button strips,
// power LEDs) each playing one of eight painted camera feeds, two demo box cameras on top, a cable loom down the side.
// Local frame: 2.6 m along X, 0.5 m deep, screens face -Z; feet at the floor.
const FEEDS = "/cdn/value.3eceb586b136cc90b6b6d007b9749e247d10a1055a074029bb289028beb445f0.png"; // 4x2 grid of 4:3 B/W CCTV feeds, CAM 01-08
const ABS = "cdn/texture-smooth-off-white-abs-plastic.png";
const W = 2.6, ZF = -0.22, ZB = 0.24, DECKS = [0.7, 1.22, 1.62], TOP = 2.16;
// rows of monitors: [deck index, height, widths...]
const ROWS = [[0, 0.48, [0.56, 0.56, 0.56, 0.56]], [1, 0.36, [0.4, 0.4, 0.4, 0.4, 0.4]], [2, 0.46, [0.56, 0.4, 0.4, 0.56]]];

export function geometry(ctx) {
  const uvs = [], lod = ctx.lod ?? 1, rnd = ctx.random;
  const T = (a, b, c, ua = [0, 0], ub = [1, 0], uc = [1, 1]) => { ctx.tri(...a, ...b, ...c); uvs.push(...ua, ...ub, ...uc); };
  const Q = (p0, p1, p2, p3, u0 = [0, 0], u1 = [1, 0], u2 = [1, 1], u3 = [0, 1]) => { T(p0, p1, p2, u0, u1, u2); T(p0, p2, p3, u0, u2, u3); };
  const box = (x0, y0, z0, x1, y1, z1) => {
    Q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]); // front (-Z)
    Q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); // back
    Q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
    Q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    Q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
    Q([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]);
  };
  // a band of four quads joining rect a (at za) to rect b (at zb); rect = [x0, y0, x1, y1]
  const ring = (a, za, b, zb) => {
    const ca = [[a[0], a[1]], [a[2], a[1]], [a[2], a[3]], [a[0], a[3]]], cb = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; Q([ca[j][0], ca[j][1], za], [ca[i][0], ca[i][1], za], [cb[i][0], cb[i][1], zb], [cb[j][0], cb[j][1], zb]); }
  };
  const cap = (r, z) => Q([r[2], r[1], z], [r[0], r[1], z], [r[0], r[3], z], [r[2], r[3], z]);
  const inset = (r, d) => [r[0] + d, r[1] + d, r[2] - d, r[3] - d];
  const paint = (col, rough = 0.5, metal = 0, tex = null) => { ctx.albedo(tex); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); ctx.emissive(null); };

  // ---- cabinet: black laminate, two doors, a vent, a kick plate
  paint("#1d1e20", 0.55);
  box(-W / 2, 0.06, ZF + 0.02, W / 2, DECKS[0], ZB);
  paint("#111", 0.8); box(-W / 2 + 0.03, 0, ZF + 0.05, W / 2 - 0.03, 0.06, ZB - 0.02);
  if (lod < 4) {
    paint("#26282b", 0.45);
    for (const [x0, x1] of [[-W / 2 + 0.04, -0.01], [0.01, W / 2 - 0.04]]) {
      box(x0, 0.1, ZF + 0.005, x1, DECKS[0] - 0.04, ZF + 0.02); // door slab
      paint("#9a9ea3", 0.3, 0.8); const hx = x0 < 0 ? x1 - 0.06 : x0 + 0.04; box(hx, 0.4, ZF - 0.02, hx + 0.02, 0.56, ZF + 0.005); paint("#26282b", 0.45); // pull
    }
    paint("#0b0b0c", 0.9); for (let i = 0; i < 6; i++) box(-0.9, 0.16 + i * 0.03, ZF - 0.001, -0.5, 0.172 + i * 0.03, ZF + 0.006); // vent slots
  }
  // ---- steel rack: four uprights, decks with lipped fronts, top cap
  paint("#b9bec4", 0.35, 0.75);
  for (const x of [-W / 2, W / 2 - 0.04]) for (const z of [ZF, ZB - 0.04]) box(x, DECKS[0], z, x + 0.04, TOP + 0.04, z + 0.04);
  for (const y of [...DECKS.slice(1), TOP]) {
    box(-W / 2, y - 0.025, ZF, W / 2, y, ZB);
    paint("#d6d9dc", 0.3, 0.7); box(-W / 2, y - 0.05, ZF - 0.012, W / 2, y + 0.008, ZF); paint("#b9bec4", 0.35, 0.75); // lip
  }
  paint("#d6d9dc", 0.3, 0.7); box(-W / 2, DECKS[0] - 0.03, ZF - 0.012, W / 2, DECKS[0] + 0.008, ZF);
  if (lod >= 5) {
    paint("#8fb1a2", 0.2); for (const [d, h, ws] of ROWS) { const tot = ws.reduce((a, b) => a + b, 0); let x = -tot / 2; for (const w of ws) { box(x + 0.01, DECKS[d], ZF + 0.02, x + w - 0.01, DECKS[d] + h, ZB - 0.06); x += w; } }
    return { uvs };
  }

  // ---- monitors
  let feed = Math.floor(rnd() * 8);
  const crt = (cx, by, w, h, beige) => {
    const depth = Math.min(0.4, 0.8 * w), zf = ZF + 0.01;
    const R = [cx - w / 2 + 0.008, by + 0.035, cx + w / 2 - 0.008, by + h], Ri = inset(R, 0.012);
    const H = [R[0] + 0.07 * w, R[1] + 0.13 * h, R[2] - 0.07 * w, R[3] - 0.07 * h], Hi = inset(H, 0.01);
    const body = () => beige ? paint("#f0e6cc", 0.55, 0, ABS) : paint("#2b2c2f", 0.42);
    body();
    ring(Ri, zf, R, zf + 0.02); // chamfer
    ring(Ri, zf, H, zf); // bezel face
    ring(R, zf + 0.02, R, zf + 0.07); // bezel sides
    const R2 = inset(R, 0.025), sc = 0.58, mx = (R[0] + R[2]) / 2, hw = (R[2] - R[0]) * sc / 2, hh = (R[3] - R[1]) * sc;
    const Rb = [mx - hw, R[1] + 0.01, mx + hw, R[1] + 0.01 + hh];
    ring(R2, zf + 0.07, Rb, zf + 0.07 + depth); cap(Rb, zf + 0.07 + depth); // tapered tube housing
    paint(beige ? "#3a3a36" : "#121314", 0.6); ring(H, zf, Hi, zf + 0.028); // recessed lip, dark
    // vent slots on the tube's top
    if (lod < 3) { paint(beige ? "#8b836f" : "#0c0c0d", 0.8); for (let i = 0; i < 5; i++) { const z = zf + 0.14 + i * 0.035; if (z > zf + 0.05 + depth) break; const t = (z - zf - 0.07) / depth, top = R2[3] + (Rb[3] - R2[3]) * t + 0.002; box(mx - 0.25 * w * (1 - 0.4 * t), top - 0.004, z, mx + 0.25 * w * (1 - 0.4 * t), top + 0.002, z + 0.012); } }
    // the glass: a bulged grid wearing one camera feed
    const c = feed++ % 8, col = c % 4, row = Math.floor(c / 4), e = 0.012;
    const u0 = col / 4 + e, u1 = (col + 1) / 4 - e, v0 = 1 - (row + 1) / 2 + e * 2, v1 = 1 - row / 2 - e * 2;
    ctx.albedo(FEEDS); ctx.color("#e8f2ec"); ctx.roughness(0.08); ctx.metalness(0); ctx.emissive("#1c2c25");
    const n = lod >= 3 ? 2 : 6, zs = zf + 0.028, b = 0.022;
    const pt = (s, t) => { const a = 2 * s - 1, d = 2 * t - 1; return [Hi[0] + s * (Hi[2] - Hi[0]), Hi[1] + t * (Hi[3] - Hi[1]), zs - b * (1 - 0.6 * a * a) * (1 - 0.6 * d * d)]; };
    const uv = (s, t) => [u0 + s * (u1 - u0), v0 + t * (v1 - v0)];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const s0 = i / n, s1 = (i + 1) / n, t0 = j / n, t1 = (j + 1) / n;
      Q(pt(s1, t0), pt(s0, t0), pt(s0, t1), pt(s1, t1), uv(s1, t0), uv(s0, t0), uv(s0, t1), uv(s1, t1));
    }
    ctx.emissive(null);
    // button strip, power LED, brand plate
    if (lod < 3) {
      paint(beige ? "#cfc5aa" : "#1a1b1d", 0.5);
      const yb = R[1] + 0.035;
      for (let i = 0; i < 4; i++) { const x = H[2] - 0.03 - i * 0.032; box(x - 0.011, yb - 0.008, zf - 0.006, x + 0.011, yb + 0.008, zf); }
      ctx.albedo(null); ctx.color("#202020"); ctx.emissive(rnd() < 0.85 ? "#2bff6a" : "#ffb020"); box(H[0] + 0.01, yb - 0.005, zf - 0.005, H[0] + 0.02, yb + 0.005, zf); ctx.emissive(null);
      paint("#9aa0a6", 0.3, 0.8); box(mx - 0.04, yb - 0.006, zf - 0.003, mx + 0.04, yb + 0.006, zf);
    }
    // a little plinth, and a yellow Sedco price tag on the deck lip under it
    paint("#151515", 0.7); box(mx - 0.3 * w, by, zf + 0.06, mx + 0.3 * w, by + 0.035, zf + 0.06 + depth * 0.7);
    paint("#f2c51c", 0.5); box(mx - 0.05, by - 0.045, ZF - 0.016, mx + 0.05, by - 0.01, ZF - 0.012);
  };
  for (const [d, h, ws] of ROWS) {
    const tot = ws.reduce((a, b) => a + b, 0) + (ws.length - 1) * 0.025; let x = -tot / 2;
    for (const w of ws) { crt(x + w / 2, DECKS[d], w, h, rnd() < 0.55); x += w + 0.025; }
  }
  if (lod >= 3) return { uvs };
  // ---- two demo box cameras on top, sunshades and dark lenses, on wall-mount arms
  for (const x of [-0.85, 0.85]) {
    paint("#e9e9e4", 0.45); box(x - 0.05, TOP + 0.13, -0.12, x + 0.05, TOP + 0.21, 0.14);
    paint("#d8d8d2", 0.45); box(x - 0.065, TOP + 0.21, -0.17, x + 0.065, TOP + 0.222, 0.15); // sunshade
    paint("#0a0a0b", 0.1); box(x - 0.03, TOP + 0.14, -0.135, x + 0.03, TOP + 0.2, -0.12); // lens
    paint("#9aa0a6", 0.35, 0.8); box(x - 0.012, TOP + 0.04, 0.0, x + 0.012, TOP + 0.13, 0.03); box(x - 0.05, TOP + 0.04, -0.05, x + 0.05, TOP + 0.05, 0.1);
    ctx.albedo(null); ctx.color("#200"); ctx.emissive("#ff2a1a"); box(x + 0.02, TOP + 0.185, -0.123, x + 0.028, TOP + 0.193, -0.12); ctx.emissive(null);
  }
  // ---- cable loom down the right side, zip-tied
  paint("#0e0e0f", 0.6);
  for (let i = 0; i < 3; i++) box(W / 2 + 0.005 + i * 0.012, 0.05, 0.12 + i * 0.01, W / 2 + 0.015 + i * 0.012, TOP, 0.13 + i * 0.01);
  paint("#f2f2f2", 0.6); for (let y = 0.3; y < TOP; y += 0.35) box(W / 2 + 0.002, y, 0.115, W / 2 + 0.045, y + 0.012, 0.155);
  return { uvs };
}
