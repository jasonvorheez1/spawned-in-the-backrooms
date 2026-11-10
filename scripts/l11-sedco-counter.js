// Sedco Spotlight's sales counter, a 2009 corner-store checkout (Shelly, Nov 10: "the sedco building interior could be less blocky"):
// wood-laminate front in raised panels with steel trim, a formica top with a rounded bullnose, a recessed kick plate, a candy rack
// on the customer face, and on top: an angled POS register with a real key grid and cash drawer, a pole display facing the customer,
// a receipt printer with paper, a card swiper on a stand, a scratch-off lottery dispenser and a penny tray.
// Local frame: 2.7 m along X, 0.75 m deep; customer side faces -Z, cashier +Z; feet at the floor.
const WOOD = "cdn/texture-wood-grain-laminate.png", TOPT = "cdn/texture-white-formica-countertop.png";
const L = 2.7, D = 0.75, H = 1.0, TOPH = 0.04;

export function geometry(ctx) {
  const lod = ctx.lod ?? 1, rnd = ctx.random;
  const Q = (a, b, c, d) => { ctx.tri(...a, ...b, ...c); ctx.tri(...a, ...c, ...d); };
  const box = (x0, y0, z0, x1, y1, z1) => {
    Q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]); Q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    Q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); Q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    Q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]); Q([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]);
  };
  // a box tipped back by `tilt` degrees about its front-bottom edge (a keypad, a screen)
  const tbox = (x0, x1, y, z, w, h, d, tilt) => {
    const t = (tilt * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t); // w unused: x0..x1 set it
    const p = (x, v, n) => [x, y + v * s + n * c, z + v * c - n * s]; // v along the slope (toward +z, up), n its thickness
    const a = [x0, x1];
    Q(p(a[1], 0, h), p(a[0], 0, h), p(a[0], d, h), p(a[1], d, h)); // top face (sloped)
    Q(p(a[0], 0, 0), p(a[1], 0, 0), p(a[1], d, 0), p(a[0], d, 0));
    Q(p(a[0], 0, 0), p(a[0], 0, h), p(a[1], 0, h), p(a[1], 0, 0));
    Q(p(a[1], d, 0), p(a[1], d, h), p(a[0], d, h), p(a[0], d, 0));
    Q(p(a[0], d, 0), p(a[0], d, h), p(a[0], 0, h), p(a[0], 0, 0));
    Q(p(a[1], 0, 0), p(a[1], 0, h), p(a[1], d, h), p(a[1], d, 0));
    return p;
  };
  const paint = (col, rough = 0.5, metal = 0, tex = null) => { ctx.albedo(tex); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); ctx.emissive(null); };
  const z0 = -D / 2, z1 = D / 2, yTop = H - TOPH;

  // ---- carcass: kick plate recessed, front and ends in wood laminate, cashier side open shelving
  paint("#151515", 0.8); box(-L / 2 + 0.06, 0, z0 + 0.07, L / 2 - 0.06, 0.1, z1 - 0.02);
  paint("#f2e2c8", 0.6, 0, WOOD);
  box(-L / 2 + 0.02, 0.1, z0 + 0.02, L / 2 - 0.02, yTop, z0 + 0.06); // front skin
  for (const x of [-L / 2 + 0.02, L / 2 - 0.06]) box(x, 0.1, z0 + 0.02, x + 0.04, yTop, z1 - 0.02); // end panels
  paint("#d8d2c4", 0.7); box(-L / 2 + 0.06, 0.1, z1 - 0.06, L / 2 - 0.06, 0.13, z1 - 0.02); // cashier shelf
  box(-L / 2 + 0.06, 0.48, z0 + 0.06, L / 2 - 0.06, 0.5, z1 - 0.02);
  // raised front panels with steel reveal strips between
  const NP = 4, pw = (L - 0.04) / NP;
  for (let i = 0; i < NP; i++) {
    const xa = -L / 2 + 0.02 + i * pw + 0.035, xb = xa + pw - 0.07;
    paint("#e8d6b8", 0.55, 0, WOOD); box(xa, 0.16, z0 + 0.005, xb, yTop - 0.06, z0 + 0.02);
    if (lod < 3) { paint("#c8a882", 0.6, 0, WOOD); box(xa + 0.02, 0.18, z0 - 0.002, xb - 0.02, 0.2, z0 + 0.005); box(xa + 0.02, yTop - 0.1, z0 - 0.002, xb - 0.02, yTop - 0.08, z0 + 0.005); }
    if (i) { paint("#c4c8cc", 0.3, 0.85); box(xa - 0.045, 0.12, z0 + 0.008, xa - 0.025, yTop - 0.02, z0 + 0.02); }
  }
  paint("#c4c8cc", 0.3, 0.85); box(-L / 2 + 0.02, 0.1, z0 + 0.008, L / 2 - 0.02, 0.12, z0 + 0.02); // base trim

  // ---- formica top with a rounded bullnose on the customer edge (and both ends)
  paint("#ffffff", 0.35, 0, TOPT);
  const ov = 0.04, n = lod >= 3 ? 2 : 6, xa = -L / 2 - 0.02, xb = L / 2 + 0.02, zf = z0 - ov;
  ctx.smooth();
  const prof = []; for (let k = 0; k <= n; k++) { const a = -Math.PI / 2 + (k / n) * Math.PI; prof.push([TOPH / 2 * Math.cos(a), yTop + TOPH / 2 + TOPH / 2 * Math.sin(a)]); } // half-round, out toward -z
  for (let k = 0; k < n; k++) { const [o0, y0] = prof[k], [o1, y1] = prof[k + 1]; Q([xb, y0, zf + 0.02 - o0], [xa, y0, zf + 0.02 - o0], [xa, y1, zf + 0.02 - o1], [xb, y1, zf + 0.02 - o1]); }
  box(xa, yTop, zf + 0.02, xb, H, z1);
  // a rubber bumper strip on the cashier edge
  paint("#2a2a2a", 0.8); box(xa, yTop - 0.005, z1, xb, H, z1 + 0.012);
  if (lod >= 5) return;

  // ---- candy rack on the customer face: three wire tiers of bright little boxes
  if (lod < 4) {
    const cx = -0.65, cw = 0.7;
    paint("#c4c8cc", 0.3, 0.85);
    for (const x of [cx - cw / 2, cx + cw / 2]) box(x - 0.006, 0.18, z0 - 0.2, x + 0.006, 0.78, z0 - 0.188);
    const CANDY = ["#b8241c", "#4a2a14", "#f2c51c", "#1c5fb4", "#e8622a", "#2a8a3a", "#7a1e6a", "#ffffff", "#d81b60"];
    for (let t = 0; t < 3; t++) {
      const y = 0.22 + t * 0.2, zz = z0 - 0.19 + t * 0.05;
      paint("#c4c8cc", 0.3, 0.85); box(cx - cw / 2, y - 0.01, zz, cx + cw / 2, y, z0 - 0.002); box(cx - cw / 2, y, zz - 0.006, cx + cw / 2, y + 0.04, zz);
      for (let x = cx - cw / 2 + 0.02; x < cx + cw / 2 - 0.06; x += 0.065) {
        const c = CANDY[Math.floor(rnd() * CANDY.length)]; paint(c, 0.35);
        const h = 0.1 + rnd() * 0.05; box(x, y, zz + 0.008, x + 0.055, y + h, zz + 0.04);
        if (lod < 3) { paint(rnd() < 0.5 ? "#ffffff" : "#f2c51c", 0.4); box(x + 0.008, y + h * 0.45, zz + 0.006, x + 0.047, y + h * 0.7, zz + 0.008); }
      }
    }
  }

  // ---- the POS register: base with cash drawer, sloped key deck facing the cashier, receipt slot, rear display
  const rx = 0.35;
  paint("#e9e2d0", 0.5); box(rx - 0.22, H, -0.12, rx + 0.22, H + 0.11, 0.26); // base
  paint("#cfc6b0", 0.5); box(rx - 0.2, H + 0.015, 0.26, rx + 0.2, H + 0.095, 0.27); // drawer face
  paint("#8a8578", 0.4, 0.6); box(rx - 0.05, H + 0.04, 0.27, rx + 0.05, H + 0.055, 0.285); // drawer lock/handle
  paint("#e9e2d0", 0.5);
  const kp = tbox(rx - 0.21, rx + 0.21, H + 0.11, -0.02, 0.42, 0.05, 0.25, 22); // key deck, rising toward the back
  if (lod < 3) {
    // key grid: 6 x 10, a few coloured function keys
    for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) {
      const u0 = rx - 0.19 + c * 0.038, v0 = 0.02 + r * 0.035;
      const red = (c >= 8 && r < 2) || (c === 0 && r === 5), grn = c === 9 && r === 0;
      paint(red ? "#c0282a" : grn ? "#2a8a3a" : r > 3 ? "#5a5a5a" : "#3a3a3a", 0.45);
      const a = kp(u0, v0, 0.05), b = kp(u0 + 0.03, v0, 0.05), c2 = kp(u0 + 0.03, v0 + 0.028, 0.05), d = kp(u0, v0 + 0.028, 0.05);
      const a2 = kp(u0, v0, 0.058), b2 = kp(u0 + 0.03, v0, 0.058), c3 = kp(u0 + 0.03, v0 + 0.028, 0.058), d2 = kp(u0, v0 + 0.028, 0.058);
      Q(a2, b2, c3, d2); Q(a, b, b2, a2); Q(d, d2, c3, c2); Q(a, a2, d2, d); Q(b, c2, c3, b2);
    }
  }
  // cashier display: a small green VFD on a short neck behind the keys
  paint("#2a2a2a", 0.5); box(rx - 0.02, H + 0.2, -0.1, rx + 0.02, H + 0.3, -0.07);
  paint("#1a1a1a", 0.4); box(rx - 0.16, H + 0.3, -0.12, rx + 0.16, H + 0.38, -0.06);
  ctx.albedo(null); ctx.color("#0b2a1a"); ctx.emissive("#3fffa0"); box(rx - 0.14, H + 0.31, -0.06, rx + 0.14, H + 0.37, -0.055); ctx.emissive(null);
  // customer pole display, facing -Z
  paint("#2a2a2a", 0.4, 0.5); box(rx + 0.15, H + 0.11, -0.1, rx + 0.18, H + 0.52, -0.07);
  paint("#1a1a1a", 0.4); box(rx + 0.04, H + 0.5, -0.13, rx + 0.3, H + 0.6, -0.06);
  ctx.albedo(null); ctx.color("#0b2a1a"); ctx.emissive("#3fffa0"); box(rx + 0.055, H + 0.515, -0.135, rx + 0.285, H + 0.585, -0.13); ctx.emissive(null);

  // ---- receipt printer, paper curling out
  const px = 0.85;
  paint("#2e2f31", 0.5); box(px - 0.08, H, -0.05, px + 0.08, H + 0.13, 0.16);
  paint("#3a3b3e", 0.45); box(px - 0.08, H + 0.13, -0.05, px + 0.08, H + 0.15, 0.08);
  paint("#f4f2ea", 0.8); box(px - 0.04, H + 0.14, 0.08, px + 0.04, H + 0.2, 0.082); box(px - 0.04, H + 0.2, 0.082, px + 0.04, H + 0.202, 0.13);
  // ---- card swiper on its tilted stand, facing the customer
  const sx = -0.15;
  paint("#9aa0a6", 0.3, 0.8); box(sx - 0.015, H, -0.2, sx + 0.015, H + 0.12, -0.17);
  paint("#232425", 0.5); tbox(sx - 0.06, sx + 0.06, H + 0.1, -0.28, 0.12, 0.04, 0.16, -35);
  if (lod < 3) { ctx.albedo(null); ctx.color("#111"); ctx.emissive("#7fd0ff"); box(sx - 0.035, H + 0.165, -0.262, sx + 0.035, H + 0.19, -0.255); ctx.emissive(null); }
  // ---- scratch-off lottery dispenser: a clear acrylic case of tickets in a row
  if (lod < 4) {
    const lx = -1.0;
    paint("#d81b60", 0.4); box(lx - 0.24, H, -0.25, lx + 0.24, H + 0.04, 0.05);
    const T = ["#f2c51c", "#2a8a3a", "#1c5fb4", "#e8622a", "#b8241c", "#7a1e6a"];
    for (let i = 0; i < 6; i++) { paint(T[i], 0.45); box(lx - 0.22 + i * 0.075, H + 0.04, -0.23, lx - 0.16 + i * 0.075, H + 0.2, -0.2); }
    paint("#ffffff", 0.4); for (let i = 0; i < 6; i++) box(lx - 0.21 + i * 0.075, H + 0.13, -0.232, lx - 0.17 + i * 0.075, H + 0.16, -0.23);
    ctx.albedo(null); ctx.color("#dfefff80"); ctx.roughness(0.05); box(lx - 0.24, H + 0.04, -0.25, lx + 0.24, H + 0.22, -0.18);
  }
  // ---- penny tray: take a penny, leave a penny
  paint("#c9a227", 0.35, 0.8); box(-0.45, H, -0.3, -0.33, H + 0.012, -0.22);
  paint("#b87333", 0.3, 0.9); for (let i = 0; i < 5; i++) { const x = -0.43 + rnd() * 0.08, z = -0.29 + rnd() * 0.06; box(x, H + 0.012, z, x + 0.018, H + 0.016, z + 0.018); }
}

export function collider() { return { kind: "box", width: 2.74, height: 1.05, depth: 0.81, center: [0, 0.525, -0.015] }; }
