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
export function geometry(ctx) {
  const P = ctx.params ?? {}, kind = P.kind ?? "crate", dmg = P.dmg ?? 0, hi = ctx.lod <= 2;
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
