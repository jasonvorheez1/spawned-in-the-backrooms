// ASHLINE modular gun: one scripted body, built from the kit. Barrel along −Z, origin at the grip, sight line at
// y 0.085 (iron) / 0.105 (optic). Every attachment is a part you can see: optic on the rail, muzzle on the barrel,
// grip under the handguard, the mag, the stock.
function box(ctx, x0, y0, z0, x1, y1, z1) {
  const q = (a, b, c, d) => ctx.quad(...a, ...b, ...c, ...d);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); // +z
  q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]); // -z
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); // +x
  q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]); // -x
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); // +y
  q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]); // -y
}
function tube(ctx, cx, cy, z0, z1, r, n = 10, caps = true) { // along z, z0 > z1 (front is more negative)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2;
    const ax = cx + Math.cos(a) * r, ay = cy + Math.sin(a) * r, bx = cx + Math.cos(b) * r, by = cy + Math.sin(b) * r;
    ctx.quad(ax, ay, z0, bx, by, z0, bx, by, z1, ax, ay, z1);
    if (caps) { ctx.tri(cx, cy, z1, bx, by, z1, ax, ay, z1); ctx.tri(cx, cy, z0, ax, ay, z0, bx, by, z0); }
  }
}
function slant(ctx, x0, x1, top, bot, zt0, zt1, zb0, zb1) { // a raked block: top edge zt0..zt1 at y top, bottom zb0..zb1 at y bot
  const P = (x, y, z) => [x, y, z];
  const A = P(x0, top, zt0), B = P(x0, top, zt1), Cc = P(x0, bot, zb1), Dd = P(x0, bot, zb0);
  const E = P(x1, top, zt0), F = P(x1, top, zt1), G = P(x1, bot, zb1), H = P(x1, bot, zb0);
  const q = (a, b, c, d) => ctx.quad(...a, ...b, ...c, ...d);
  q(A, Dd, Cc, B); q(E, F, G, H); q(A, B, F, E); q(Dd, H, G, Cc); q(B, Cc, G, F); q(A, E, H, Dd);
}

function optic(ctx, p, oy) {
  const box2 = box;
  // optics: lens centre on the sight line 0.105
  if (p.optic === "reddot" || p.optic === "holo") {
    ctx.color("oklch(0.18 0.01 0)");
    box(ctx, -0.018, (oy - 0.064), -0.02, 0.018, (oy - 0.03), 0.03);
    if (p.optic === "holo") { box(ctx, -0.02, (oy - 0.03), -0.02, -0.016, 0.13, 0.03); box(ctx, 0.016, (oy - 0.03), -0.02, 0.02, 0.13, 0.03); box(ctx, -0.02, 0.13, -0.02, 0.02, 0.134, 0.03); }
    else { tube(ctx, 0, oy, 0.02, -0.01, 0.022, 12, false); }
    ctx.color("oklch(0.6 0.08 200)", 0.25); ctx.quad(-0.016, oy - 0.02, -0.005, 0.016, oy - 0.02, -0.005, 0.016, oy + 0.02, -0.005, -0.016, oy + 0.02, -0.005);
  } else if (p.optic) {
    const L = { x2: 0.16, acog: 0.15, var36: 0.26, x8: 0.3, var412: 0.34, thermal: 0.2, scope: 0.3 }[p.optic] ?? 0.22;
    const R = { x2: 0.016, acog: 0.02, thermal: 0.026 }[p.optic] ?? 0.019;
    ctx.color("oklch(0.16 0.008 0)"); ctx.roughness(0.35);
    tube(ctx, 0, oy, 0.1, 0.1 - L, R, 14, false);
    tube(ctx, 0, oy, 0.1 - L + 0.04, 0.1 - L, R + 0.007, 14, false); // objective bell
    tube(ctx, 0, oy, 0.1, 0.06, R + 0.004, 14, false);
    box(ctx, -0.01, (oy - 0.064), 0.02, 0.01, oy - R + 0.002, 0.04); box(ctx, -0.01, (oy - 0.064), 0.1 - L + 0.06, 0.01, oy - R + 0.002, 0.1 - L + 0.08);
    if (p.optic.startsWith("var")) { ctx.color(worn); tube(ctx, 0, oy, 0.05, 0.03, R + 0.006, 14, false); }
    if (p.optic === "thermal") { ctx.color("oklch(0.5 0.15 30)"); box(ctx, 0.02, oy - 0.01, -0.02, 0.03, oy + 0.01, 0.02); }
    ctx.color("oklch(0.35 0.08 250)", 0.4); tube(ctx, 0, oy, 0.1 - L, 0.1 - L - 0.001, R, 14, true);
  }

}
// the barrel the geometry builds: its root, its tip and its axis height, and where fire leaves (past any muzzle device)
const DEVICE = { supp: 0.17, cansupp: 0.12, comp: 0.05, brake: 0.05, flashhider: 0.045, choke: 0.03 };
function barrelOf(p) {
  const cls = p.cls ?? "rifle", len = p.len ?? 0.45, pistol = cls === "pistol";
  const bl = pistol ? len * 0.6 : len, bz0 = pistol ? -0.03 : -0.1;
  return { pistol, bl, bz0, bz1: bz0 - bl, by: pistol ? 0.03 : 0.008 };
}
export function muzzleOf(p = {}) { const b = barrelOf(p); return { x: 0, y: b.by, z: b.bz1 - (DEVICE[p.muzzle] ?? 0) }; }
export function geometry(ctx) {
  const p = ctx.params ?? {};
  const cls = p.cls ?? "rifle", len = p.len ?? 0.45, hue = p.hue ?? 60;
  const pistol = cls === "pistol", wood = ["45", "30", "35"].includes(String(hue)) && (cls === "rifle" || cls === "shotgun");
  const metal = `oklch(0.24 0.012 ${hue})`, paint = `oklch(0.42 0.05 ${hue})`, worn = `oklch(0.55 0.03 70)`;
  const woodC = "oklch(0.48 0.09 55)";
  ctx.flat();
  ctx.metalness(0.6); ctx.roughness(0.5);
  if (p.only === "optic") { optic(ctx, p, 0); return; }

  // receiver / slide
  ctx.color(paint);
  if (pistol) { box(ctx, -0.016, -0.005, -0.03, 0.016, 0.045, 0.12); }
  else { box(ctx, -0.022, -0.03, -0.1, 0.022, 0.03, 0.14); ctx.color(metal); box(ctx, -0.024, -0.005, -0.02, -0.022, 0.018, 0.06); }
  // top rail with its teeth
  if (!pistol) { ctx.color(metal); box(ctx, -0.012, 0.03, -0.1, 0.012, 0.036, 0.13); for (let z = -0.09; z < 0.12; z += 0.02) box(ctx, -0.013, 0.036, z, 0.013, 0.041, z + 0.008); }

  // barrel (and a handguard over its root)
  const { bl, bz0, bz1 } = barrelOf(p);
  const br = cls === "shotgun" ? 0.014 : cls === "sniper" ? 0.011 : 0.009;
  ctx.color(metal);
  tube(ctx, 0, pistol ? 0.03 : 0.008, bz0, bz1, br, 10);
  if (p.pellets > 1 && cls !== "pistol") { tube(ctx, 0, -0.018, bz0, bz1 + 0.02, 0.012, 8); }
  if (!pistol) {
    const hl = Math.min(bl * 0.62, 0.34);
    ctx.color(wood ? woodC : paint); ctx.roughness(wood ? 0.8 : 0.5); ctx.metalness(wood ? 0 : 0.5);
    box(ctx, -0.024, -0.026, bz0 - hl, 0.024, 0.026, bz0);
    ctx.color(metal); for (let z = bz0 - hl + 0.02; z < bz0 - 0.02; z += 0.035) box(ctx, 0.024, -0.008, z, 0.026, 0.012, z + 0.018);
    ctx.metalness(0.6); ctx.roughness(0.5);
  }
  // iron sights: front post at the muzzle end, rear notch on the receiver (tops at the sight line 0.085)
  ctx.color(metal);
  if (!p.optic) {
    const fz = pistol ? bz1 + 0.01 : bz1 + 0.05;
    box(ctx, -0.0025, pistol ? 0.045 : 0.03, fz - 0.006, 0.0025, 0.085, fz);
    if (!pistol) box(ctx, -0.009, 0.03, fz - 0.01, 0.009, 0.05, fz + 0.004);
    box(ctx, -0.014, pistol ? 0.045 : 0.036, 0.09, -0.004, 0.085, 0.1); box(ctx, 0.004, pistol ? 0.045 : 0.036, 0.09, 0.014, 0.085, 0.1);
  }

  // muzzle devices
  const mz = bz1;
  if (p.muzzle === "supp" || p.muzzle === "cansupp") { ctx.color(p.muzzle === "cansupp" ? "oklch(0.55 0.1 70)" : "oklch(0.2 0.005 0)"); tube(ctx, 0, pistol ? 0.03 : 0.008, mz + 0.005, mz - (p.muzzle === "cansupp" ? 0.12 : 0.17), p.muzzle === "cansupp" ? 0.03 : 0.02, 12); }
  else if (p.muzzle === "comp" || p.muzzle === "brake") { ctx.color(metal); tube(ctx, 0, 0.008, mz + 0.005, mz - 0.05, 0.016, 8); ctx.color("oklch(0.1 0 0)"); box(ctx, -0.017, 0.0, mz - 0.04, 0.017, 0.016, mz - 0.03); }
  else if (p.muzzle === "flashhider") { ctx.color(metal); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; box(ctx, Math.cos(a) * 0.012 - 0.003, 0.008 + Math.sin(a) * 0.012 - 0.003, mz - 0.045, Math.cos(a) * 0.012 + 0.003, 0.008 + Math.sin(a) * 0.012 + 0.003, mz); } }
  else if (p.muzzle === "choke") { ctx.color(worn); tube(ctx, 0, pistol ? 0.03 : 0.008, mz + 0.005, mz - 0.03, br + 0.004, 10); }

  optic(ctx, p, 0.105);
  // pistol grip, trigger guard
  ctx.color(wood && cls !== "shotgun" ? woodC : "oklch(0.2 0.01 60)"); ctx.metalness(0.1); ctx.roughness(0.8);
  if (pistol) slant(ctx, -0.015, 0.015, -0.005, -0.115, 0.06, 0.12, 0.08, 0.14);
  else slant(ctx, -0.017, 0.017, -0.03, -0.13, 0.07, 0.11, 0.1, 0.14);
  ctx.color(metal); box(ctx, -0.004, pistol ? -0.035 : -0.06, 0.03, 0.004, pistol ? -0.03 : -0.055, 0.07);

  // magazine
  const magLong = p.mag === "extmag" ? 1.5 : 1, drum = p.mag === "drum";
  ctx.color(p.mag === "hollow" ? "oklch(0.5 0.12 80)" : "oklch(0.3 0.02 60)");
  if (pistol) { /* in the grip */ box(ctx, -0.012, -0.12 * magLong, 0.09, 0.012, -0.11, 0.13); }
  else if (drum) { tube(ctx, 0, -0.1, 0.03, -0.03, 0.07, 14); }
  else if (cls === "lmg") { box(ctx, -0.06, -0.12, -0.06, 0.02, -0.03, 0.04); }
  else if (cls !== "shotgun") { slant(ctx, -0.014, 0.014, -0.03, -0.03 - 0.13 * magLong, -0.06, -0.01, -0.03 - (cls === "rifle" ? 0.05 : 0.01) * magLong, 0.015 - (cls === "rifle" ? 0.04 : 0) * magLong); }
  if (p.mag === "fastmag") { ctx.color("oklch(0.3 0.02 60)"); slant(ctx, 0.016, 0.042, -0.04, -0.16, -0.06, -0.01, -0.09, -0.04); }

  // foregrip / laser
  ctx.color("oklch(0.2 0.01 60)");
  const gz = pistol ? 0 : bz0 - Math.min(bl * 0.62, 0.34) * 0.55;
  if (!pistol && p.grip === "vgrip") tube2(ctx, gz);
  else if (!pistol && p.grip === "agrip") slant(ctx, -0.013, 0.013, -0.026, -0.07, gz - 0.05, gz + 0.03, gz + 0.02, gz + 0.04);
  else if (!pistol && p.grip === "stubby") box(ctx, -0.013, -0.065, gz - 0.015, 0.013, -0.026, gz + 0.015);
  else if (!pistol && p.grip === "handstop") box(ctx, -0.012, -0.045, gz - 0.02, 0.012, -0.026, gz - 0.005);
  else if (p.grip === "laser") { box(ctx, 0.024, -0.02, gz - 0.06, 0.044, 0.0, gz); ctx.emissive(3, 0.2, 0.1); box(ctx, 0.03, -0.014, gz - 0.061, 0.038, -0.006, gz - 0.06); ctx.emissive(null); }

  // stock
  if (!pistol && cls !== "smg" || (cls === "smg" && p.stock)) {
    ctx.color(wood ? woodC : p.stock === "skelstock" ? metal : "oklch(0.22 0.01 60)");
    ctx.metalness(wood ? 0 : 0.3); ctx.roughness(0.8);
    if (p.stock === "skelstock") { box(ctx, -0.006, 0.0, 0.14, 0.006, 0.012, 0.33); box(ctx, -0.006, -0.08, 0.2, 0.006, -0.068, 0.33); box(ctx, -0.02, -0.08, 0.32, 0.02, 0.012, 0.34); }
    else { const heavy = p.stock === "heavystock" ? 0.012 : 0; slant(ctx, -0.02 - heavy, 0.02 + heavy, 0.022, -0.035, 0.14, 0.34, 0.14, 0.34); slant(ctx, -0.02 - heavy, 0.02 + heavy, -0.035, -0.095 - heavy, 0.24, 0.34, 0.3, 0.34); }
  }
  function tube2(ctx, z) { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, b = ((i + 1) / 8) * Math.PI * 2, r = 0.012; ctx.quad(Math.cos(a) * r, -0.026, z + Math.sin(a) * r, Math.cos(b) * r, -0.026, z + Math.sin(b) * r, Math.cos(b) * r, -0.1, z + Math.sin(b) * r, Math.cos(a) * r, -0.1, z + Math.sin(a) * r); } }
}
export function collider() { return null; }
