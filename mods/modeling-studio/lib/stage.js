// Spawn 3D Modeling Studio pieces. params.part:
//  "pedestal": a graphite octagon column 0.8 m tall, its top lit by a glowing ring: a made 3D thing stands on it.
//  "frame": a slim floating frame 1.9 × 1.12 m around the canvas, emitter nubs on its corners.
const TAU = Math.PI * 2;
function ringBand(ctx, n, r0, r1, y0, y1, off = 0) { // an n-sided band from r0 at y0 to r1 at y1
  for (let i = 0; i < n; i++) {
    const a0 = off + (i / n) * TAU, a1 = off + ((i + 1) / n) * TAU;
    ctx.quad(Math.cos(a0) * r0, y0, Math.sin(a0) * r0, Math.cos(a0) * r1, y1, Math.sin(a0) * r1, Math.cos(a1) * r1, y1, Math.sin(a1) * r1, Math.cos(a1) * r0, y0, Math.sin(a1) * r0);
  }
}
function disc(ctx, n, r, y, off = 0, down = false) {
  for (let i = 0; i < n; i++) {
    const a0 = off + (i / n) * TAU, a1 = off + ((i + 1) / n) * TAU;
    if (down) ctx.tri(0, y, 0, Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
    else ctx.tri(0, y, 0, Math.cos(a1) * r, y, Math.sin(a1) * r, Math.cos(a0) * r, y, Math.sin(a0) * r);
  }
}
function annulus(ctx, n, r0, r1, y) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    ctx.quad(Math.cos(a0) * r0, y, Math.sin(a0) * r0, Math.cos(a1) * r0, y, Math.sin(a1) * r0, Math.cos(a1) * r1, y, Math.sin(a1) * r1, Math.cos(a0) * r1, y, Math.sin(a0) * r1);
  }
}
function box(ctx, x0, y0, z0, x1, y1, z1) {
  ctx.quad(x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1); ctx.quad(x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0);
  ctx.quad(x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1); ctx.quad(x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0);
  ctx.quad(x0,y1,z1, x1,y1,z1, x1,y1,z0, x0,y1,z0); ctx.quad(x0,y0,z0, x1,y0,z0, x1,y0,z1, x0,y0,z1);
}
function pedestal(ctx) {
  const o = Math.PI / 8, fine = ctx.lod <= 2;
  ctx.metalness(0.6); ctx.roughness(0.35); ctx.color("oklch(0.24 0.015 260)");
  ringBand(ctx, 8, 0.40, 0.40, 0, 0.06, o); ringBand(ctx, 8, 0.40, 0.33, 0.06, 0.1, o); // plinth with a chamfer
  ctx.color("oklch(0.3 0.02 260)");
  ringBand(ctx, 8, 0.27, 0.27, 0.1, 0.66, o); // the column
  annulus(ctx, 8, 0.27, 0.33, 0.1);
  if (fine) { // vent slots down two faces, lit faintly from inside
    ctx.emissive("oklch(0.55 0.12 30)"); ctx.color("oklch(0.2 0 0)");
    for (let k = 0; k < 4; k++) for (const s of [1, -1]) { const y = 0.22 + k * 0.08; box(ctx, -0.07, y, s * 0.249 - 0.004, 0.07, y + 0.025, s * 0.249 + 0.004); }
    ctx.emissive(null);
  }
  ctx.color("oklch(0.24 0.015 260)");
  ringBand(ctx, 8, 0.27, 0.36, 0.66, 0.72, o); ringBand(ctx, 8, 0.36, 0.36, 0.72, 0.76, o); // the capital
  ctx.emissive("oklch(0.85 0.17 35)"); ctx.color("oklch(0.85 0.17 35)"); // the glowing ring savi lights
  ringBand(ctx, 32, 0.345, 0.345, 0.76, 0.78); annulus(ctx, 32, 0.30, 0.345, 0.78);
  ctx.emissive(null); ctx.color("oklch(0.18 0.01 260)"); ctx.roughness(0.2);
  disc(ctx, 32, 0.30, 0.78); // the dark glass top
  ctx.emissive("oklch(0.7 0.12 250)"); annulus(ctx, 32, 0.12, 0.135, 0.781); ctx.emissive(null);
  ctx.color("oklch(0.15 0 0)"); disc(ctx, 8, 0.40, 0, o, true);
}
function frame(ctx) {
  const W = 0.95, H = 1.12, t = 0.035, d = 0.04;
  ctx.metalness(0.5); ctx.roughness(0.4); ctx.color("oklch(0.22 0.015 260)");
  box(ctx, -W - t, -t, -d, W + t, 0, d); box(ctx, -W - t, H, -d, W + t, H + t, d);
  box(ctx, -W - t, 0, -d, -W, H, d); box(ctx, W, 0, -d, W + t, H, d);
  box(ctx, -W, 0, -d, W, H, -d + 0.01); // the back
  ctx.emissive("oklch(0.72 0.13 255)"); ctx.color("oklch(0.72 0.13 255)"); // a thin lit line around the inner edge
  const e = 0.006; box(ctx, -W, 0, d - 0.004, W, e, d); box(ctx, -W, H - e, d - 0.004, W, H, d); box(ctx, -W, 0, d - 0.004, -W + e, H, d); box(ctx, W - e, 0, d - 0.004, W, H, d);
  ctx.emissive("oklch(0.85 0.17 35)"); ctx.color("oklch(0.85 0.17 35)");
  for (const [x, y] of [[-W - t, -t], [W + t, -t], [-W - t, H + t], [W + t, H + t]]) box(ctx, x - 0.03, y - 0.03, -0.05, x + 0.03, y + 0.03, 0.05);
  ctx.emissive(null);
}
// "dais": the studio's round floor, 2 cm of dark polished stone with a lit rim, radius params.r
function dais(ctx) {
  const r = ctx.params.r ?? 2.8, n = ctx.lod <= 2 ? 64 : 24;
  ctx.roughness(0.3); ctx.metalness(0.2); ctx.color("oklch(0.4 0.015 260)");
  disc(ctx, n, r - 0.04, 0.02); ringBand(ctx, n, r, r, 0, 0.012); ringBand(ctx, n, r, r - 0.04, 0.012, 0.02);
  ctx.emissive("oklch(0.85 0.17 35)"); ctx.color("oklch(0.85 0.17 35)");
  annulus(ctx, n, r - 0.11, r - 0.09, 0.0205); ctx.emissive(null);
  ctx.color("oklch(0.32 0.015 260)"); annulus(ctx, n, 0.9, 0.92, 0.0205);
}
export function geometry(ctx) { const p = ctx.params.part; return p === "frame" ? frame(ctx) : p === "dais" ? dais(ctx) : pedestal(ctx); }
export function collider(ctx) {
  return ctx.params.part === "frame" || ctx.params.part === "dais" ? null : { kind: "cylinder", radiusTop: 0.36, radiusBottom: 0.4, height: 0.78, center: [0, 0.39, 0] };
}
