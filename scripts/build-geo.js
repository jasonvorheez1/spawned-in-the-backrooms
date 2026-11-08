// Built and breakable pieces (params.kind): plank_wall, metal_wall, barricade, crate, ramp (B mode) and Level 0's office
// furniture desk, chair, shelf; rubble is what a broken thing leaves. params.dmg 0..3 draws cracks. Feet at the bottom centre.
const WOOD = "cdn/texture-weathered-wood-planks.png", METAL = "cdn/texture-corrugated-rusty-metal-sheet.png";
function slab(ctx, x0, y0, z0, x1, y1, z1) {
  ctx.quad(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0);
  ctx.quad(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
  ctx.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
  ctx.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);
  ctx.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0);
  ctx.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1);
}
const box = (ctx, cx, y0, cz, w, h, d) => slab(ctx, cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2);
// dark crack lines on both faces of a thin panel (z = ±d)
function cracks(ctx, n, w, h, d, seed) {
  if (!n) return;
  ctx.albedo(null); ctx.color("oklch(0.16 0.02 60)");
  let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n * 3; i++) {
    let x = (rnd() - 0.5) * w * 0.8, y = h * (0.2 + rnd() * 0.6);
    for (let k = 0; k < 4; k++) {
      const a = rnd() * 6.28, L = 0.12 + rnd() * 0.22, x2 = x + Math.cos(a) * L, y2 = Math.max(0.05, Math.min(h - 0.05, y + Math.sin(a) * L)), t = 0.012;
      for (const z of [d / 2 + 0.004, -d / 2 - 0.004]) {
        const s = z > 0 ? 1 : -1, nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1, ox = nx / nl * t, oy = ny / nl * t;
        if (s > 0) ctx.quad(x - ox, y - oy, z, x2 - ox, y2 - oy, z, x2 + ox, y2 + oy, z, x + ox, y + oy, z);
        else ctx.quad(x + ox, y + oy, z, x2 + ox, y2 + oy, z, x2 - ox, y2 - oy, z, x - ox, y - oy, z);
      }
      x = x2; y = y2;
    }
  }
}

const CONC = "cdn/texture-rough-concrete.png";
// a squared timber or bar from a to b (w across, h up)
function beam(ctx, ax, ay, az, bx, by, bz, w, h) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1, fx = dx / L, fy = dy / L, fz = dz / L;
  let sx = -fz, sz = fx, sl = Math.hypot(sx, sz); if (sl < 1e-4) { sx = 1; sz = 0; sl = 1; } sx /= sl; sz /= sl;
  const ux = -sz * fy, uy = sz * fx - sx * fz, uz = sx * fy;
  const c = (px, py, pz, a, b) => [px + sx * a * w / 2 + ux * b * h / 2, py + uy * b * h / 2, pz + sz * a * w / 2 + uz * b * h / 2];
  const ring = [[-1, -1], [1, -1], [1, 1], [-1, 1]], A = ring.map(([a, b]) => c(ax, ay, az, a, b)), Bq = ring.map(([a, b]) => c(bx, by, bz, a, b));
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; ctx.quad(...A[i], ...Bq[i], ...Bq[j], ...A[j]); }
  ctx.quad(...A[0], ...A[1], ...A[2], ...A[3]); ctx.quad(...Bq[3], ...Bq[2], ...Bq[1], ...Bq[0]);
}
// a sharpened stake: square base at b, point at t
function stake(ctx, bx, by, bz, tx, ty, tz, r) {
  const dx = tx - bx, dy = ty - by, dz = tz - bz, L = Math.hypot(dx, dy, dz) || 1, fx = dx / L, fy = dy / L, fz = dz / L;
  let sx = -fz, sz = fx, sl = Math.hypot(sx, sz); if (sl < 1e-4) { sx = 1; sz = 0; sl = 1; } sx /= sl; sz /= sl;
  const ux = -sz * fy, uy = sz * fx - sx * fz, uz = sx * fy;
  const A = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [bx + sx * a * r + ux * b * r, by + uy * b * r, bz + sz * a * r + uz * b * r]);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; ctx.tri(...A[i], tx, ty, tz, ...A[j]); }
  ctx.quad(...A[0], ...A[1], ...A[2], ...A[3]);
}
const tone = (l, c, h, i, spread = 0.035) => `oklch(${(l + (((i * 37) % 7) - 3) * spread / 3).toFixed(3)} ${c} ${h})`;
function planks(ctx, x0, x1, y0, y1, z, d, seed) { // horizontal boards filling x0..x1, y0..y1
  const n = Math.max(1, Math.round((y1 - y0) / 0.4)), h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) { ctx.color(tone(0.62, 0.06, 65, i + seed)); slab(ctx, x0, y0 + i * h + 0.01, z - d / 2, x1, y0 + (i + 1) * h - 0.01, z + d / 2); }
}
function nails(ctx, xs, y0, y1, z, step = 0.4) { ctx.albedo(null); ctx.color("oklch(0.3 0.01 250)"); for (const x of xs) for (let y = y0 + step / 2; y < y1; y += step) box(ctx, x, y, z, 0.022, 0.022, 0.008); }

function kit(ctx, kind, dmg, hi) {
  if (kind === "foundation_wood") { // a timber deck on cribbing, its posts sunk into the ground
    ctx.albedo(WOOD); ctx.color("oklch(0.42 0.05 55)");
    for (const x of [-0.85, 0, 0.85]) for (const z of [-0.85, 0.85]) box(ctx, x, -0.5, z, 0.2, 0.56, 0.2);
    ctx.color("oklch(0.5 0.06 58)"); box(ctx, 0, 0.04, 0.92, 2, 0.17, 0.16); box(ctx, 0, 0.04, -0.92, 2, 0.17, 0.16);
    box(ctx, 0.92, 0.04, 0, 0.16, 0.17, 1.68); box(ctx, -0.92, 0.04, 0, 0.16, 0.17, 1.68); box(ctx, 0, 0.04, 0, 0.12, 0.17, 1.68);
    for (let i = 0; i < 9; i++) { ctx.color(tone(0.64, 0.065, 66, i)); box(ctx, -1 + 0.111 + i * 0.2222, 0.21, 0, 0.214, 0.09, 2); }
    if (hi) { ctx.albedo(null); ctx.color("oklch(0.3 0.01 250)"); for (let i = 0; i < 9; i++) for (const z of [-0.92, 0, 0.92]) for (const o of [-0.05, 0.05]) box(ctx, -1 + 0.111 + i * 0.2222 + o, 0.3, z, 0.02, 0.004, 0.02); }
    cracks(ctx, dmg, 2, 0.3, 2, 21); return true;
  }
  if (kind === "foundation_concrete") { // a poured pad: a skirt into the ground, a chamfered top, rebar stubs where walls tie in
    ctx.albedo(CONC); ctx.color("oklch(0.78 0.008 90)"); box(ctx, 0, -0.5, 0, 1.96, 0.55, 1.96);
    ctx.color("oklch(0.88 0.006 90)"); box(ctx, 0, 0.04, 0, 2, 0.22, 2); box(ctx, 0, 0.26, 0, 1.94, 0.04, 1.94);
    ctx.color("oklch(0.84 0.006 90)"); for (const s of [-1, 1]) { ctx.quad(-1, 0.26, s * 1, 1, 0.26, s * 1, 0.97, 0.3, s * 0.97, -0.97, 0.3, s * 0.97); }
    if (hi) { ctx.albedo(null); ctx.color("oklch(0.4 0.01 250)"); for (const s of [-1, 1]) for (const p of [-0.6, 0, 0.6]) { box(ctx, p, 0.14, s * 1.003, 0.04, 0.04, 0.006); box(ctx, s * 1.003, 0.14, p, 0.006, 0.04, 0.04); }
      ctx.color("oklch(0.42 0.07 45)"); for (const [x, z] of [[-0.6, -0.97], [0.6, -0.97], [-0.6, 0.97], [0.6, 0.97], [-0.97, 0], [0.97, 0]]) box(ctx, x, 0.3, z, 0.02, 0.05, 0.02); }
    cracks(ctx, dmg, 2, 0.3, 2, 23); return true;
  }
  if (kind === "floor_wood") { // boards over three joists
    ctx.albedo(WOOD); ctx.color("oklch(0.48 0.05 58)"); for (const x of [-0.85, 0, 0.85]) box(ctx, x, 0, 0, 0.09, 0.06, 1.96);
    for (let i = 0; i < 9; i++) { ctx.color(tone(0.63, 0.06, 64, i + 3)); box(ctx, 0, 0.06, -1 + 0.111 + i * 0.2222, 2, 0.06, 0.214); }
    if (hi) nails(ctx, [], 0, 0, 0);
    cracks(ctx, dmg, 2, 0.12, 2, 25); return true;
  }
  if (kind === "floor_metal") { // diamond-tread steel deck in an angle-iron frame
    ctx.albedo(METAL); ctx.color("oklch(0.58 0.015 240)"); box(ctx, 0, 0.06, 0, 1.9, 0.05, 1.9);
    ctx.color("oklch(0.45 0.02 240)"); for (const s of [-1, 1]) { box(ctx, 0, 0, s * 0.97, 2, 0.12, 0.06); box(ctx, s * 0.97, 0, 0, 0.06, 0.12, 1.88); }
    if (hi) { ctx.albedo(null); ctx.color("oklch(0.66 0.012 240)"); for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { const x = -0.8 + i * 0.2, z = -0.8 + j * 0.2; if ((i + j) % 2) box(ctx, x, 0.11, z, 0.09, 0.008, 0.025); else box(ctx, x, 0.11, z, 0.025, 0.008, 0.09); }
      ctx.color("oklch(0.35 0.01 250)"); for (const s of [-1, 1]) for (const p of [-0.75, 0, 0.75]) { box(ctx, p, 0.12, s * 0.97, 0.035, 0.012, 0.035); box(ctx, s * 0.97, 0.12, p, 0.035, 0.012, 0.035); } }
    cracks(ctx, dmg, 2, 0.12, 2, 27); return true;
  }
  if (kind === "half_wall") {
    ctx.albedo(WOOD); planks(ctx, -1, 1, 0, 1.14, 0, 0.06, 2);
    ctx.color("oklch(0.5 0.06 60)"); for (const x of [-0.92, 0.92]) box(ctx, x, 0, 0.06, 0.1, 1.14, 0.06);
    beam(ctx, -0.85, 0.1, -0.06, 0.85, 1.05, -0.06, 0.1, 0.05);
    ctx.color("oklch(0.56 0.06 62)"); box(ctx, 0, 1.14, 0, 2.04, 0.06, 0.2);
    if (hi) nails(ctx, [-0.92, 0.92], 0, 1.14, 0.095);
    cracks(ctx, dmg, 2, 1.2, 0.06, 29); return true;
  }
  if (kind === "doorway_wood") { // a plank wall with a framed opening 1.1 m wide, 2.15 m tall
    ctx.albedo(WOOD);
    for (const sd of [-1, 1]) planks(ctx, sd < 0 ? -1 : 0.62, sd < 0 ? -0.62 : 1, 0, 2.4, 0, 0.06, sd < 0 ? 1 : 4);
    planks(ctx, -0.62, 0.62, 2.2, 2.4, 0, 0.06, 6);
    ctx.color("oklch(0.5 0.06 58)"); for (const sd of [-1, 1]) box(ctx, sd * 0.585, 0, 0, 0.07, 2.2, 0.17); box(ctx, 0, 2.15, 0, 1.24, 0.08, 0.17);
    for (const x of [-0.92, 0.92]) box(ctx, x, 0, 0.06, 0.1, 2.4, 0.06); box(ctx, 0, 2.28, -0.06, 2, 0.1, 0.05);
    ctx.color("oklch(0.4 0.04 55)"); box(ctx, 0, 0, 0, 1.1, 0.025, 0.17);
    if (hi) nails(ctx, [-0.92, 0.92], 0, 2.4, 0.095);
    cracks(ctx, dmg, 2, 2.4, 0.06, 31); return true;
  }
  if (kind === "window_wood") { // a plank wall with a framed window at chest height
    ctx.albedo(WOOD);
    planks(ctx, -1, 1, 0, 0.92, 0, 0.06, 1); planks(ctx, -1, 1, 1.78, 2.4, 0, 0.06, 5);
    for (const sd of [-1, 1]) planks(ctx, sd < 0 ? -1 : 0.6, sd < 0 ? -0.6 : 1, 0.92, 1.78, 0, 0.06, sd < 0 ? 2 : 3);
    ctx.color("oklch(0.5 0.06 58)"); for (const sd of [-1, 1]) box(ctx, sd * 0.57, 0.92, 0, 0.06, 0.86, 0.15); box(ctx, 0, 1.74, 0, 1.2, 0.06, 0.15);
    ctx.color("oklch(0.56 0.06 62)"); box(ctx, 0, 0.88, -0.03, 1.3, 0.05, 0.27);
    for (const x of [-0.92, 0.92]) box(ctx, x, 0, 0.06, 0.1, 2.4, 0.06);
    if (hi) nails(ctx, [-0.92, 0.92], 0, 2.4, 0.095);
    cracks(ctx, dmg, 2, 2.4, 0.06, 33); return true;
  }
  if (kind === "door_wood") { // hinge at the origin, the leaf out along +x
    ctx.albedo(WOOD); for (let i = 0; i < 4; i++) { ctx.color(tone(0.6, 0.06, 62, i + 7)); box(ctx, 0.14 + i * 0.235, 0.03, 0, 0.228, 2.05, 0.05); }
    ctx.color("oklch(0.5 0.06 58)"); for (const y of [0.25, 1.0, 1.75]) box(ctx, 0.49, y, 0.04, 0.88, 0.13, 0.03);
    beam(ctx, 0.12, 0.38, 0.04, 0.86, 1.0, 0.04, 0.1, 0.03); beam(ctx, 0.12, 1.13, 0.04, 0.86, 1.75, 0.04, 0.1, 0.03);
    ctx.albedo(null); ctx.color("oklch(0.25 0.01 250)"); for (const y of [0.3, 1.8]) for (const z of [-0.03, 0.06]) box(ctx, 0.2, y, z, 0.4, 0.05, 0.008);
    ctx.color("oklch(0.35 0.02 70)"); for (const z of [-0.045, 0.045]) { box(ctx, 0.88, 0.92, z, 0.035, 0.2, 0.03); box(ctx, 0.88, 1.0, z * 1.6, 0.03, 0.03, 0.03); }
    cracks(ctx, dmg, 1, 2.1, 0.05, 35); return true;
  }
  if (kind === "door_metal") { // a steel slab door: rolled edges, rivets, a sight slot, a pull handle
    ctx.albedo(METAL); ctx.color("oklch(0.55 0.02 230)"); box(ctx, 0.5, 0.03, 0, 0.94, 2.05, 0.05);
    ctx.color("oklch(0.45 0.02 235)"); for (const x of [0.04, 0.96]) box(ctx, x, 0.03, 0, 0.05, 2.05, 0.07); for (const y of [0.03, 2.03]) box(ctx, 0.5, y, 0, 0.96, 0.05, 0.07); box(ctx, 0.5, 1.0, 0, 0.92, 0.08, 0.065);
    ctx.albedo(null); ctx.color("oklch(0.1 0.005 250)"); box(ctx, 0.5, 1.55, 0, 0.3, 0.06, 0.072);
    if (hi) { ctx.color("oklch(0.68 0.015 240)"); for (const z of [-0.036, 0.036]) for (let i = 0; i < 8; i++) for (const x of [0.1, 0.9]) box(ctx, x, 0.15 + i * 0.26, z, 0.025, 0.025, 0.008); }
    ctx.color("oklch(0.3 0.01 250)"); for (const z of [-0.06, 0.06]) { box(ctx, 0.86, 0.85, z, 0.04, 0.3, 0.04); }
    cracks(ctx, dmg, 1, 2.1, 0.05, 37); return true;
  }
  if (kind === "stairs_wood") { // ten 24 cm steps over two squares, rising toward -z, stringers and a rail
    ctx.albedo(WOOD);
    for (let i = 0; i < 10; i++) { const zf = 2 - i * 0.4, zb = zf - 0.4, top = (i + 1) * 0.24;
      ctx.color("oklch(0.45 0.05 58)"); slab(ctx, -0.8, 0, zb, 0.8, top - 0.04, zf);
      ctx.color(tone(0.64, 0.065, 66, i)); slab(ctx, -0.84, top - 0.045, zb, 0.84, top, zf + 0.035); }
    ctx.color("oklch(0.5 0.06 60)"); for (const x of [-0.87, 0.87]) beam(ctx, x, 0.1, 2.05, x, 2.3, -1.95, 0.06, 0.32);
    ctx.color("oklch(0.56 0.06 62)"); for (const z of [1.6, 0, -1.6]) { const y = (2 - z) / 4 * 2.4; box(ctx, 0.87, y, z, 0.07, 0.95, 0.07); }
    beam(ctx, 0.87, 0.24 + 0.95, 1.95, 0.87, 2.4 + 0.95, -1.95, 0.08, 0.06);
    cracks(ctx, dmg, 1.8, 2.4, 4, 39); return true;
  }
  if (kind === "spikes") { // two rows of sharpened stakes on runners, leaning out at whatever comes
    ctx.albedo(WOOD); ctx.color("oklch(0.45 0.05 55)"); for (const z of [-0.32, 0.32]) box(ctx, 0, 0, z, 2, 0.09, 0.12); for (const x of [-0.9, 0, 0.9]) box(ctx, x, 0.02, 0, 0.1, 0.07, 0.8);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) { const x = -0.84 + i * 0.28 + r * 0.14, z0 = r ? 0.3 : -0.3; if (x > 0.95) continue;
      ctx.color(tone(0.6, 0.06, 66, i + r * 3)); stake(ctx, x, 0.06, z0, x + ((i % 3) - 1) * 0.04, 0.5 - (i % 2) * 0.06, z0 - 0.26, 0.035);
      ctx.color("oklch(0.82 0.04 80)"); }
    if (hi) { ctx.albedo(null); ctx.color("oklch(0.5 0.02 250)"); for (const z of [-0.3, 0.3]) beam(ctx, -0.95, 0.14, z - 0.06, 0.95, 0.14, z - 0.06, 0.012, 0.012); }
    cracks(ctx, dmg, 2, 0.4, 1, 41); return true;
  }
  if (kind === "storage_locker") { // an army-green steel locker, its doors facing -z
    ctx.albedo(METAL); ctx.color("oklch(0.48 0.05 135)"); slab(ctx, -0.45, 0.07, -0.27, 0.45, 1.9, 0.275);
    ctx.color("oklch(0.52 0.055 135)"); for (const x of [-0.222, 0.222]) box(ctx, x, 0.12, -0.285, 0.43, 1.72, 0.02);
    ctx.albedo(null); ctx.color("oklch(0.2 0.02 135)"); for (const x of [-0.222, 0.222]) for (let k = 0; k < 5; k++) box(ctx, x, 1.52 + k * 0.05, -0.297, 0.26, 0.016, 0.006);
    ctx.color("oklch(0.7 0.01 250)"); for (const x of [-0.04, 0.04]) box(ctx, x, 0.95, -0.305, 0.025, 0.16, 0.025);
    ctx.color("oklch(0.72 0.12 85)"); box(ctx, 0, 0.82, -0.315, 0.06, 0.07, 0.02);
    ctx.color("oklch(0.25 0.01 250)"); for (const x of [-0.4, 0.4]) for (const z of [-0.22, 0.22]) box(ctx, x, 0, z, 0.05, 0.07, 0.05);
    ctx.color("oklch(0.9 0.02 90)"); box(ctx, 0.222, 1.38, -0.297, 0.16, 0.06, 0.004);
    cracks(ctx, dmg, 0.9, 1.9, 0.55, 43); return true;
  }
  if (kind === "lamp") { // a tripod work lamp; the light itself is the piece's child
    ctx.albedo(null); ctx.color("oklch(0.3 0.01 250)");
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; beam(ctx, Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36, 0, 0.85, 0, 0.03, 0.03); }
    box(ctx, 0, 0.8, 0, 0.04, 0.62, 0.04); box(ctx, 0, 1.38, 0, 0.36, 0.03, 0.03);
    ctx.color("oklch(0.72 0.14 85)"); box(ctx, 0, 1.4, 0, 0.32, 0.26, 0.16);
    ctx.emissive("oklch(0.97 0.06 90)"); ctx.color("oklch(0.98 0.03 90)"); box(ctx, 0, 1.43, -0.085, 0.27, 0.2, 0.012); ctx.emissive(null);
    ctx.color("oklch(0.25 0.01 250)"); for (let i = 0; i < 4; i++) box(ctx, -0.1 + i * 0.067, 1.42, -0.1, 0.01, 0.22, 0.01);
    ctx.color("oklch(0.2 0.01 250)"); beam(ctx, 0.12, 1.42, 0.08, 0.5, 0.01, 0.4, 0.015, 0.015);
    return true;
  }
  return false;
}
export function geometry(ctx) {
  const P = ctx.params ?? {}, kind = P.kind ?? "crate", dmg = P.dmg ?? 0, hi = ctx.lod <= 2;
  if (kit(ctx, kind, dmg, hi)) { ctx.albedo(null); return; }
  if (kind === "workbench") { // a heavy plank top on trestle legs, a vise, a pegboard of tools
    ctx.albedo(WOOD); ctx.color("oklch(0.6 0.06 62)"); box(ctx, 0, 0.88, 0, 1.6, 0.1, 0.8);
    ctx.color("oklch(0.45 0.06 60)"); for (const x of [-0.7, 0.7]) for (const z of [-0.32, 0.32]) box(ctx, x, 0, z, 0.1, 0.88, 0.1);
    box(ctx, 0, 0.25, 0, 1.4, 0.06, 0.06); box(ctx, 0, 0.12, -0.32, 1.4, 0.06, 0.06); box(ctx, 0, 0.12, 0.32, 1.4, 0.06, 0.06);
    ctx.albedo(METAL); ctx.color("oklch(0.4 0.03 250)"); box(ctx, -0.55, 0.98, 0.22, 0.2, 0.14, 0.22); box(ctx, -0.55, 1.1, 0.22, 0.12, 0.04, 0.3);
    ctx.albedo(WOOD); ctx.color("oklch(0.52 0.05 60)"); box(ctx, 0, 1.55, -0.4, 1.5, 0.8, 0.04);
    ctx.albedo(null); ctx.color("oklch(0.55 0.02 250)"); for (let i = 0; i < 5; i++) box(ctx, -0.6 + i * 0.3, 1.45 + (i % 2) * 0.18, -0.37, 0.05, 0.3, 0.02);
    ctx.color("oklch(0.5 0.15 30)"); box(ctx, 0.35, 0.98, 0.1, 0.18, 0.1, 0.12);
    return;
  }
  if (kind === "plank_wall") {
    ctx.albedo(WOOD);
    for (let i = 0; i < 6; i++) { ctx.color(`oklch(${0.62 + ((i * 37) % 7) * 0.02} 0.06 65)`); box(ctx, 0, 0.02 + i * 0.4, 0, 2, 0.37, 0.06); }
    ctx.color("oklch(0.5 0.06 60)");
    for (const x of [-0.85, 0.85]) box(ctx, x, 0, 0.06, 0.12, 2.4, 0.06);
    box(ctx, 0, 0.6, -0.06, 2, 0.12, 0.06); box(ctx, 0, 1.75, -0.06, 2, 0.12, 0.06);
    if (hi) { ctx.albedo(null); ctx.color("oklch(0.35 0.01 250)"); for (let i = 0; i < 6; i++) for (const x of [-0.85, 0.85]) box(ctx, x, 0.18 + i * 0.4, 0.095, 0.025, 0.025, 0.01); }
    cracks(ctx, dmg, 2, 2.4, 0.06, 3);
  } else if (kind === "metal_wall") {
    ctx.albedo(METAL);
    ctx.color("oklch(0.7 0.02 230)"); box(ctx, -0.5, 0, 0, 1.02, 2.4, 0.04); ctx.color("oklch(0.62 0.04 50)"); box(ctx, 0.5, 0, 0.01, 1.02, 2.4, 0.04);
    ctx.albedo(null); ctx.color("oklch(0.38 0.02 240)");
    for (const x of [-0.98, 0, 0.98]) box(ctx, x, 0, -0.04, 0.06, 2.4, 0.05);
    box(ctx, 0, 2.3, -0.04, 2, 0.08, 0.05); box(ctx, 0, 0.05, -0.04, 2, 0.08, 0.05);
    cracks(ctx, dmg, 2, 2.4, 0.06, 5);
  } else if (kind === "barricade") {
    ctx.albedo(WOOD); ctx.color("oklch(0.6 0.06 62)");
    for (const x of [-0.8, 0.8]) slab(ctx, x - 0.07, 0, -0.25, x + 0.07, 1.2, 0.25);
    for (let i = 0; i < 3; i++) box(ctx, 0, 0.2 + i * 0.36, 0.1, 2, 0.24, 0.05);
    ctx.color("oklch(0.55 0.06 58)");
    ctx.quad(-1, 0.1, -0.14, 1, 1.0, -0.14, 1, 1.18, -0.14, -1, 0.28, -0.14); ctx.quad(-1, 0.28, -0.08, 1, 1.18, -0.08, 1, 1.0, -0.08, -1, 0.1, -0.08);
    cracks(ctx, dmg, 2, 1.2, 0.3, 7);
  } else if (kind === "crate") {
    ctx.albedo(WOOD); ctx.color("oklch(0.66 0.07 68)"); box(ctx, 0, 0, 0, 0.96, 0.96, 0.96);
    ctx.color("oklch(0.52 0.07 60)");
    for (const s of [-1, 1]) { box(ctx, 0, 0.0, s * 0.49, 1, 0.1, 0.03); box(ctx, 0, 0.88, s * 0.49, 1, 0.1, 0.03); box(ctx, s * 0.49, 0, 0, 0.03, 1, 1); }
    cracks(ctx, dmg, 0.96, 0.96, 0.98, 11);
  } else if (kind === "ramp") {
    ctx.albedo(WOOD); ctx.color("oklch(0.63 0.06 64)");
    const w = 0.6, h = 1, z0 = -1, z1 = 1; // climbs toward -z
    ctx.quad(-w, 0, z1, w, 0, z1, w, h, z0, -w, h, z0);
    ctx.quad(-w, 0, z0, w, 0, z0, w, 0, z1, -w, 0, z1);
    ctx.quad(w, 0, z0, -w, 0, z0, -w, h, z0, w, h, z0);
    ctx.tri(-w, 0, z0, -w, 0, z1, -w, h, z0); ctx.tri(w, 0, z1, w, 0, z0, w, h, z0);
    ctx.color("oklch(0.5 0.06 60)");
    if (hi) for (let i = 1; i < 8; i++) { const t = i / 8, y = h * (1 - t), z = z0 + (z1 - z0) * t; ctx.quad(-w, y + 0.02, z + 0.03, w, y + 0.02, z + 0.03, w, y + 0.035 + 0.02, z - 0.04, -w, y + 0.035 + 0.02, z - 0.04); }
  } else if (kind === "desk") {
    ctx.albedo(WOOD); ctx.color("oklch(0.7 0.05 75)"); box(ctx, 0, 0.72, 0, 1.4, 0.04, 0.7);
    ctx.albedo(null); ctx.color("oklch(0.55 0.02 90)"); box(ctx, -0.5, 0, 0, 0.4, 0.72, 0.66);
    for (const s of [-1, 1]) box(ctx, 0.66, 0, s * 0.3, 0.04, 0.72, 0.04);
    ctx.color("oklch(0.42 0.02 90)"); for (let i = 0; i < 3; i++) box(ctx, -0.5, 0.08 + i * 0.22, 0.335, 0.34, 0.18, 0.01);
    cracks(ctx, dmg, 1.4, 0.7, 0.72, 13);
  } else if (kind === "chair") {
    ctx.albedo(null); ctx.color("oklch(0.4 0.03 250)");
    box(ctx, 0, 0.44, 0, 0.46, 0.07, 0.46); box(ctx, 0, 0.5, 0.21, 0.44, 0.48, 0.05);
    ctx.color("oklch(0.3 0.01 250)"); box(ctx, 0, 0.08, 0, 0.05, 0.36, 0.05);
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) box(ctx, x * 0.15, 0.04, z * 0.15, x ? 0.3 : 0.05, 0.04, z ? 0.3 : 0.05);
  } else if (kind === "shelf") {
    ctx.albedo(null); ctx.color("oklch(0.6 0.02 240)");
    for (const x of [-0.48, 0.48]) for (const z of [-0.18, 0.18]) box(ctx, x, 0, z, 0.04, 1.9, 0.04);
    for (let i = 0; i < 5; i++) box(ctx, 0, 0.1 + i * 0.44, 0, 1, 0.03, 0.4);
    if (hi) { ctx.color("oklch(0.62 0.07 70)"); for (let i = 0; i < 4; i++) if ((i * 7) % 3) box(ctx, -0.2 + (i % 2) * 0.35, 0.13 + i * 0.44, 0, 0.32, 0.26, 0.3); }
  } else if (kind === "copier") { // a beige office copier, the kind that jams on purpose
    ctx.albedo(null); ctx.color("oklch(0.82 0.03 85)"); box(ctx, 0, 0, 0, 0.9, 0.95, 0.65);
    ctx.color("oklch(0.4 0.01 250)"); box(ctx, 0, 0.95, 0, 0.92, 0.08, 0.67); box(ctx, 0.25, 0.6, -0.34, 0.3, 0.2, 0.03);
    ctx.color("oklch(0.7 0.02 85)"); box(ctx, 0, 1.03, 0.02, 0.85, 0.05, 0.55); box(ctx, -0.55, 0.55, 0, 0.2, 0.04, 0.4);
    ctx.color("oklch(0.6 0.15 145)"); box(ctx, 0.3, 0.75, -0.34, 0.04, 0.04, 0.02);
    ctx.color("oklch(0.3 0.01 250)"); for (let i = 0; i < 4; i++) box(ctx, -0.2, 0.15 + i * 0.12, -0.33, 0.5, 0.015, 0.02);
  } else if (kind === "steel_barricade") { // riveted plates bolted onto a geared frame
    ctx.albedo(METAL); ctx.color("oklch(0.62 0.02 240)");
    for (let i = 0; i < 3; i++) box(ctx, -0.66 + i * 0.66, 0, 0, 0.62, 1.3 - (i % 2) * 0.1, 0.08);
    ctx.albedo(null); ctx.color("oklch(0.35 0.01 250)"); for (const x of [-0.95, 0.95]) box(ctx, x, 0, 0.1, 0.1, 1.3, 0.3);
    ctx.color("oklch(0.75 0.1 85)"); for (let i = 0; i < 6; i++) box(ctx, -0.8 + i * 0.32, 1.0, -0.05, 0.05, 0.05, 0.02);
    cracks(ctx, dmg, 2, 1.3, 0.08, 9);
  } else if (kind === "brick_wall") { // running-bond red brick, mortar showing in the joints, a concrete cap
    ctx.albedo(null); ctx.color("oklch(0.78 0.02 85)"); box(ctx, 0, 0, 0, 1.98, 2.3, 0.2);
    ctx.albedo("cdn/texture-old-red-brick-wall.png");
    for (let r = 0; r < (hi ? 30 : 10); r++) {
      const rows = hi ? 30 : 10, h = 2.3 / rows, off = r % 2 ? 0.125 : 0, n = hi ? 8 : 3, bw = 2 / n;
      for (let i = -1; i < n; i++) {
        const x0 = Math.max(-1, -1 + off + i * bw + 0.006), x1 = Math.min(1, -1 + off + (i + 1) * bw - 0.006); if (x1 - x0 < 0.03) continue;
        ctx.color(`oklch(${0.8 + ((r * 7 + i * 13) % 5) * 0.03} 0.03 40)`); slab(ctx, x0, r * h + 0.006, -0.12, x1, (r + 1) * h - 0.006, 0.12);
      }
    }
    ctx.albedo("cdn/texture-rough-concrete.png"); ctx.color("oklch(0.9 0.01 90)"); box(ctx, 0, 2.3, 0, 2.04, 0.1, 0.28);
    cracks(ctx, dmg, 2, 2.4, 0.24, 11);
  } else if (kind === "rebar_barricade") { // poured concrete jersey block, rebar stubs bristling from its top
    ctx.albedo("cdn/texture-rough-concrete.png"); ctx.color("oklch(0.92 0.005 90)");
    box(ctx, 0, 0, 0, 2, 0.25, 0.6); box(ctx, 0, 0.25, 0, 2, 0.35, 0.42); box(ctx, 0, 0.6, 0, 2, 0.6, 0.24);
    ctx.albedo(null); ctx.color("oklch(0.42 0.07 45)");
    for (let i = 0; i < 6; i++) { const x = -0.85 + i * 0.34; box(ctx, x, 1.2, (i % 2 ? 0.05 : -0.05), 0.025, 0.18 + (i % 3) * 0.08, 0.025); }
    for (const z of [0.125, -0.125]) box(ctx, 0, 0.85, z, 1.9, 0.02, 0.01);
    cracks(ctx, dmg, 2, 1.2, 0.24, 13);
  } else if (kind === "pipe_grate") { // welded steel pipe uprights, two rails, a valve wheel
    ctx.albedo(METAL); ctx.color("oklch(0.62 0.02 240)");
    for (let i = 0; i < 9; i++) box(ctx, -0.9 + i * 0.225, 0, 0, 0.06, 2.2, 0.06);
    for (const y of [0.3, 1.9]) box(ctx, 0, y, 0, 2, 0.08, 0.08);
    ctx.albedo(null); ctx.color("oklch(0.72 0.12 80)"); box(ctx, 0.45, 1.05, 0.06, 0.24, 0.24, 0.03);
    cracks(ctx, dmg, 2, 2.2, 0.06, 15);
  } else { // rubble: a low heap of chunks and splinters
    ctx.albedo(null);
    let r = 7; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * 6.28, d = rnd() * 0.55, s = 0.08 + rnd() * 0.18;
      ctx.color(i % 3 ? "oklch(0.86 0.04 90)" : "oklch(0.58 0.06 62)");
      box(ctx, Math.cos(a) * d, 0, Math.sin(a) * d, s * (1 + rnd()), s * 0.6, s);
    }
  }
  ctx.albedo(null);
}
