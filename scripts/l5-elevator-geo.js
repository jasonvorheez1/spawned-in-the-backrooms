// Level 5's elevator banks (scripts/l5-elevator.js drives them). params.part: "cabin" | "leaf" | "panel" | "ind"; params.style: copper | modern | freight.
// Cabin frame: origin = floor centre, -Z = the door side facing into the room, back against the room wall; 1.8 x 1.8 m inside.
// params.h = the room's ceiling: the shaft above the cabin climbs to it.
import { bbox, cyl, dome, torus, q, t } from "./lib/l5-kit.js";
const BRASS = "cdn/texture-aged-polished-brass-metal.png", STEEL = "cdn/texture-brushed-stainless-steel.png", GRIME = "cdn/texture-grimy-scratched-steel-plate.png";
const DIAMOND = "cdn/texture-worn-diamond-plate-steel-floor.png", MARBLE = "cdn/texture-black-white-checkered-marble-floor.png", PARQ = "cdn/texture-herringbone-oak-parquet.png";
const WALNUT = "cdn/texture-dark-walnut-wood-panel.png", PLANK = "cdn/texture-scuffed-oak-planks.png", IRON = "cdn/texture-black-wrought-iron.png", VELVET = "cdn/texture-red-velvet-fabric.png";
export const DIM = { IW: 0.9, O: 0.98, DW: 0.55, DH: 2.2, CH: 2.5, RT: 2.62, FW: 1.2, FH: 2.45 };
const { IW, O, DW, DH, CH, RT, FW, FH } = DIM;
function paint(ctx, tex, col, rough = 0.5, metal = 0) { ctx.albedo(tex); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); ctx.emissive(null); }
const B = (ctx, x0, x1, y0, y1, z0, z1, e = 0.008) => bbox(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2], e);
const brass = (ctx) => paint(ctx, BRASS, "oklch(0.93 0.06 85)", 0.32, 0.85);
// the cabin: floor, three walls, ceiling, the front around the doorway and the shaft above
function cabin(ctx, st, h) {
  const fine = ctx.lod <= 1, mid = ctx.lod <= 2, top = Math.max(RT + 0.3, h - 0.02);
  if (st === "modern") {
    paint(ctx, MARBLE, "oklch(0.95 0.01 80)", 0.25, 0); B(ctx, -O, O, 0, 0.05, -O, O, 0.004);
    brass(ctx); B(ctx, -DW, DW, 0, 0.05, -1.08, -O, 0.006); // the sill
    // outer skin and shaft: steel to the ceiling
    paint(ctx, STEEL, "oklch(0.9 0.01 240)", 0.35, 0.7);
    for (const s of [-1, 1]) B(ctx, s * IW, s * O, 0, top, -O, O, 0.01);
    B(ctx, -O, O, 0, top, IW, O, 0.01); B(ctx, -O, O, FH, top, -O, -IW, 0.01); B(ctx, -O, O, CH, RT, -IW, IW, 0.005);
    for (const s of [-1, 1]) B(ctx, s * DW, s * IW, 0, FH, -O, -IW + 0.02, 0.005);
    if (mid) for (let y = RT + 0.9; y < top - 0.2; y += 1.2) { brass(ctx); B(ctx, -O - 0.015, O + 0.015, y, y + 0.05, -O - 0.015, O, 0.008); } // brass bands up the shaft
    // walnut panelling inside, two tiers, framed
    paint(ctx, WALNUT, "oklch(0.92 0.03 60)", 0.45, 0);
    const panels = (x0, x1, axis, face) => { for (const [y0, y1] of [[0.12, 0.88], [1.04, 2.38]]) { const n = 2, w = (x1 - x0) / n; for (let i = 0; i < n; i++) { const a = x0 + i * w + 0.05, b = a + w - 0.1; if (axis === "x") B(ctx, face - Math.sign(face) * 0.012, face, y0, y1, a, b, 0.006); else B(ctx, a, b, y0, y1, face - 0.012, face, 0.006); } } };
    panels(-IW + 0.02, IW - 0.02, "z", IW); panels(-IW + 0.02, IW - 0.02, "x", -IW); panels(-IW + 0.02, IW - 0.02, "x", IW);
    // brass handrail round three walls on standoffs
    brass(ctx); const ry = 0.95, ri = IW - 0.06;
    cyl(ctx, [-ri, ry, ri], [ri, ry, ri], 0.018, 8); for (const s of [-1, 1]) cyl(ctx, [s * ri, ry, -0.6], [s * ri, ry, ri], 0.018, 8);
    for (const p of [[-0.5, ri], [0.5, ri], [-ri, -0.3], [ri, -0.3], [-ri, 0.5], [ri, 0.5]]) cyl(ctx, [p[0], ry, p[1]], [p[0] === -ri ? -IW : p[0] === ri ? IW : p[0], ry, p[1] === ri ? IW : p[1]], 0.01, 6);
    // ceiling: frosted glass coffer in a brass ring
    brass(ctx); B(ctx, -0.5, 0.5, CH - 0.03, CH, -0.5, 0.5, 0.01);
    paint(ctx, null, "oklch(0.97 0.03 85)", 0.3, 0); ctx.emissive("oklch(0.9 0.08 80)"); B(ctx, -0.42, 0.42, CH - 0.045, CH - 0.03, -0.42, 0.42, 0.004); ctx.emissive(null);
    // facade: steel wings, brass reveals, deco crown with a sunburst
    paint(ctx, STEEL, "oklch(0.86 0.01 240)", 0.3, 0.75);
    for (const s of [-1, 1]) B(ctx, s * DW, s * FW, 0, FH, -1.06, -O, 0.012);
    B(ctx, -FW, FW, DH, FH, -1.06, -O, 0.012);
    brass(ctx);
    for (const s of [-1, 1]) { B(ctx, s * DW, s * (DW + 0.04), 0, DH + 0.04, -1.075, -0.9, 0.006); B(ctx, s * (FW - 0.04), s * FW, 0, FH, -1.075, -1.04, 0.006); for (const y of [0.14, 2.05]) B(ctx, s * (DW + 0.04), s * (FW - 0.04), y, y + 0.025, -1.07, -1.05, 0.004); }
    B(ctx, -DW - 0.04, DW + 0.04, DH, DH + 0.04, -1.075, -0.9, 0.006);
    paint(ctx, STEEL, "oklch(0.8 0.01 240)", 0.3, 0.75); B(ctx, -FW - 0.06, FW + 0.06, FH, FH + 0.1, -1.1, -O, 0.015); B(ctx, -FW + 0.2, FW - 0.2, FH + 0.1, FH + 0.18, -1.08, -O, 0.012);
    brass(ctx); B(ctx, -FW - 0.06, FW + 0.06, FH + 0.085, FH + 0.1, -1.105, -1.09, 0.003);
    const c = [0, FH + 0.18, -1.02], R = 0.62, n = mid ? 13 : 7; // sunburst rays fanning behind the indicator
    for (let i = 0; i < n; i++) { const a0 = Math.PI * (i + 0.18) / n, a1 = Math.PI * (i + 0.82) / n; t(ctx, [c[0], c[1], c[2]], [c[0] + Math.cos(a0) * R, c[1] + Math.sin(a0) * R * 0.75, c[2]], [c[0] + Math.cos(a1) * R, c[1] + Math.sin(a1) * R * 0.75, c[2]], [0, 0, -1]); }
    if (fine) torus(ctx, [0, FH + 0.18, -1.025], [0, 0, 1], R + 0.02, 0.012, 24, 4);
  } else if (st === "copper") {
    paint(ctx, PARQ, "oklch(0.9 0.04 60)", 0.5, 0); B(ctx, -O, O, 0, 0.05, -O, O, 0.004);
    brass(ctx); B(ctx, -DW, DW, 0, 0.05, -1.04, -O, 0.006);
    // the cage: corner posts, rails, bars, a pierced kickplate and a scroll frieze
    const posts = [[-0.94, -0.94], [0.94, -0.94], [-0.94, 0.94], [0.94, 0.94], [-0.6, -0.94], [0.6, -0.94]];
    for (const [x, z] of posts) { cyl(ctx, [x, 0.05, z], [x, RT, z], 0.032, mid ? 10 : 6); if (fine) { dome(ctx, [x, RT, z], [0, 1, 0], 0.045, 1.2, 10, 3); } }
    const rails = (y0, y1) => { B(ctx, -O, O, y0, y1, 0.92, 0.96, 0.004); for (const s of [-1, 1]) B(ctx, s * 0.92, s * 0.96, y0, y1, -O, O, 0.004); for (const s of [-1, 1]) B(ctx, s * 0.6, s * 0.96, y0, y1, -0.96, -0.92, 0.004); };
    rails(0.05, 0.5); rails(0.95, 1.0); rails(2.15, 2.2); rails(CH, RT);
    paint(ctx, BRASS, "oklch(0.75 0.06 70)", 0.4, 0.8);
    if (mid) for (let i = 0; i < 7; i++) { const z = -0.8 + i * 0.27; for (const s of [-1, 1]) torus(ctx, [s * 0.965, 0.28, z], [1, 0, 0], 0.07, 0.008, 12, 3); torus(ctx, [z, 0.28, 0.965], [0, 0, 1], 0.07, 0.008, 12, 3); }
    brass(ctx); const step = mid ? 0.09 : 0.18;
    const bars = (fn) => { for (let a = -0.9; a <= 0.9; a += step) fn(a); };
    bars((a) => { for (const s of [-1, 1]) cyl(ctx, [s * 0.94, 0.5, a], [s * 0.94, 2.15, a], 0.008, 5, false); cyl(ctx, [a, 0.5, 0.94], [a, 2.15, 0.94], 0.008, 5, false); });
    for (let a = 0.62; a <= 0.92; a += step) for (const s of [-1, 1]) cyl(ctx, [s * a, 0.5, -0.94], [s * a, 2.15, -0.94], 0.008, 5, false);
    if (mid) { const X = (p0, p1) => cyl(ctx, p0, p1, 0.007, 4, false); for (let a = -0.9; a < 0.9; a += 0.15) { for (const s of [-1, 1]) { X([s * 0.94, 2.2, a], [s * 0.94, CH, a + 0.15]); X([s * 0.94, CH, a], [s * 0.94, 2.2, a + 0.15]); } X([a, 2.2, 0.94], [a + 0.15, CH, 0.94]); X([a, CH, 0.94], [a + 0.15, 2.2, 0.94]); } for (let a = -0.6; a < 0.6; a += 0.15) { X([a, DH, -0.94], [a + 0.15, CH, -0.94]); X([a, CH, -0.94], [a + 0.15, DH, -0.94]); } }
    B(ctx, -0.6, 0.6, DH - 0.02, DH + 0.02, -0.96, -0.92, 0.004);
    // roof: brass plate, a domed lamp housing, the finial, cables up the open iron shaft
    brass(ctx); B(ctx, -O, O, RT - 0.02, RT + 0.03, -O, O, 0.01); dome(ctx, [0, RT + 0.03, 0], [0, 1, 0], 0.3, 0.5, mid ? 18 : 8, 4);
    cyl(ctx, [0, RT + 0.15, 0], [0, RT + 0.42, 0], 0.03, 8); if (fine) dome(ctx, [0, RT + 0.42, 0], [0, 1, 0], 0.06, 1.4, 10, 3);
    paint(ctx, null, "oklch(0.95 0.06 85)", 0.3, 0); ctx.emissive("oklch(0.85 0.1 80)"); dome(ctx, [0, CH - 0.01, 0], [0, -1, 0], 0.16, 0.6, 12, 3); ctx.emissive(null);
    paint(ctx, IRON, "oklch(0.55 0.01 60)", 0.6, 0.6);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(ctx, x * O - 0.03, x * O + 0.03, RT, top, z * O - 0.03, z * O + 0.03, 0.005);
    for (let y = RT + 1.2; y < top - 0.1; y += 1.4) { for (const s of [-1, 1]) { B(ctx, -O, O, y, y + 0.04, s * O - 0.02, s * O + 0.02, 0.004); B(ctx, s * O - 0.02, s * O + 0.02, y, y + 0.04, -O, O, 0.004); } }
    for (const x of [-0.12, 0.12]) cyl(ctx, [x, RT + 0.3, 0], [x, top, 0], 0.012, 5, false);
    // a fold-down velvet seat on the back
    paint(ctx, VELVET, "oklch(0.75 0.12 20)", 0.85, 0); B(ctx, -0.4, 0.4, 0.5, 0.58, 0.7, 0.92, 0.03); brass(ctx); for (const s of [-1, 1]) cyl(ctx, [s * 0.36, 0.54, 0.72], [s * 0.36, 0.95, 0.94], 0.01, 6);
    // gate tracks
    brass(ctx); B(ctx, -FW, FW, DH + 0.02, DH + 0.06, -1.06, -0.98, 0.006); B(ctx, -FW, FW, 0.0, 0.03, -1.06, -0.98, 0.004);
  } else {
    paint(ctx, DIAMOND, "oklch(0.8 0.01 60)", 0.6, 0.7); B(ctx, -O, O, 0, 0.06, -O, O, 0.004);
    paint(ctx, GRIME, "oklch(0.75 0.015 70)", 0.7, 0.55);
    for (const s of [-1, 1]) B(ctx, s * IW, s * O, 0, top, -O, O, 0.01);
    B(ctx, -O, O, 0, top, IW, O, 0.01); B(ctx, -O, O, FH, top, -O, -IW, 0.01); B(ctx, -O, O, CH, RT, -IW, IW, 0.005);
    for (const s of [-1, 1]) B(ctx, s * DW, s * IW, 0, FH, -O, -IW + 0.02, 0.005);
    if (mid) { paint(ctx, GRIME, "oklch(0.65 0.015 70)", 0.7, 0.55); for (let a = -0.8; a <= 0.81; a += 0.2) { for (const s of [-1, 1]) B(ctx, s * (IW - 0.02), s * IW, 0.06, CH, a - 0.03, a + 0.03, 0.006); B(ctx, a - 0.03, a + 0.03, 0.06, CH, IW - 0.02, IW, 0.006); } }
    paint(ctx, PLANK, "oklch(0.8 0.04 60)", 0.75, 0);
    for (const y of [0.35, 0.9]) { B(ctx, -IW + 0.03, IW - 0.03, y, y + 0.14, IW - 0.07, IW - 0.02, 0.012); for (const s of [-1, 1]) B(ctx, s * (IW - 0.07), s * (IW - 0.02), y, y + 0.14, -IW + 0.12, IW - 0.03, 0.012); }
    // caged bulb in the ceiling
    paint(ctx, GRIME, "oklch(0.5 0.01 60)", 0.6, 0.6); cyl(ctx, [0, CH, 0], [0, CH - 0.06, 0], 0.07, 10);
    paint(ctx, null, "oklch(0.95 0.1 70)", 0.2, 0); ctx.emissive("oklch(1.2 0.14 70)"); dome(ctx, [0, CH - 0.06, 0], [0, -1, 0], 0.06, 1.5, 10, 4); ctx.emissive(null);
    paint(ctx, IRON, "oklch(0.4 0.01 60)", 0.5, 0.7);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = Math.cos(a) * 0.1, z = Math.sin(a) * 0.1; cyl(ctx, [x, CH - 0.05, z], [x * 0.9, CH - 0.2, z * 0.9], 0.005, 4, false); cyl(ctx, [x * 0.9, CH - 0.2, z * 0.9], [0, CH - 0.24, 0], 0.005, 4, false); }
    torus(ctx, [0, CH - 0.12, 0], [0, 1, 0], 0.1, 0.005, 14, 3);
    // facade: steel frame, rivets, hazard stripes on the head and jamb faces
    paint(ctx, GRIME, "oklch(0.7 0.015 70)", 0.65, 0.6);
    for (const s of [-1, 1]) B(ctx, s * DW, s * FW, 0, FH, -1.06, -O, 0.01);
    B(ctx, -FW, FW, DH, FH + 0.1, -1.06, -O, 0.01);
    for (const s of [-1, 1]) B(ctx, s * DW, s * (DW + 0.08), 0, DH, -1.1, -1.06, 0.01);
    const stripes = (x0, x1, y0, y1, z) => { const n = Math.round((x1 - x0) / 0.12); for (let i = 0; i < n; i++) { paint(ctx, null, i % 2 ? "oklch(0.25 0.01 60)" : "oklch(0.78 0.16 90)", 0.6, 0.1); const a = x0 + i * (x1 - x0) / n, b = a + (x1 - x0) / n, k = 0.08; q(ctx, [a, y0, z], [b, y0, z], [Math.min(x1, b + k), y1, z], [Math.min(x1, a + k), y1, z], [0, 0, -1]); } };
    stripes(-FW + 0.05, FW - 0.05, DH + 0.05, FH + 0.05, -1.062);
    if (mid) for (const s of [-1, 1]) for (let y = 0.2; y < DH; y += 0.35) { paint(ctx, null, "oklch(0.55 0.02 60)", 0.5, 0.7); bbox(ctx, [s * (FW - 0.06), y, -1.065], [0.012, 0.012, 0.008], 0.006); bbox(ctx, [s * (DW + 0.12), y, -1.065], [0.012, 0.012, 0.008], 0.006); }
    paint(ctx, null, "oklch(0.78 0.16 90)", 0.6, 0.1); for (const s of [-1, 1]) B(ctx, s * (DW + 0.08), s * (DW + 0.1), 0, DH, -1.101, -1.06, 0.002);
    paint(ctx, GRIME, "oklch(0.6 0.015 70)", 0.6, 0.6); B(ctx, -FW, FW, DH + 0.02, DH + 0.06, -1.14, -1.06, 0.006); // gate track
  }
  ctx.albedo(null);
}
// a door leaf: origin at its bottom centre, 0.58 x 2.2
function leaf(ctx, st, side) {
  const w = 0.29, H = DH, mid = ctx.lod <= 2;
  if (st === "modern") {
    paint(ctx, STEEL, "oklch(0.9 0.01 240)", 0.28, 0.8); B(ctx, -w, w, 0.01, H, -0.015, 0.015, 0.008);
    brass(ctx);
    B(ctx, -w + 0.04, w - 0.04, 0.12, 0.15, -0.022, -0.015, 0.003); B(ctx, -w + 0.04, w - 0.04, H - 0.15, H - 0.12, -0.022, -0.015, 0.003);
    for (const x of [-w + 0.04, w - 0.07]) B(ctx, x, x + 0.03, 0.12, H - 0.12, -0.022, -0.015, 0.003);
    if (mid) { const cx = -side * 0.0, cy = 1.3; for (let i = 0; i < 6; i++) { const a = Math.PI * (0.1 + i * 0.16); B(ctx, cx - 0.008, cx + 0.008, cy, cy + 0.32 * Math.sin(a), -0.024, -0.016, 0.002); } B(ctx, -w + 0.07, w - 0.07, 1.0, 1.03, -0.022, -0.015, 0.003); }
    B(ctx, -side * w - 0.008, -side * w + 0.008, 0.01, H, -0.02, 0.02, 0.003); // meeting edge
  } else if (st === "copper") {
    brass(ctx); const nb = mid ? 4 : 2, bw = (2 * w) / nb, rows = mid ? 10 : 5, rh = (H - 0.1) / rows;
    for (let i = 0; i <= nb; i++) cyl(ctx, [-w + i * bw, 0.04, 0], [-w + i * bw, H, 0], 0.012, 6);
    for (let i = 0; i < nb; i++) for (let r = 0; r < rows; r++) { const x0 = -w + i * bw, y0 = 0.05 + r * rh; cyl(ctx, [x0, y0, -0.01], [x0 + bw, y0 + rh, -0.01], 0.006, 4, false); cyl(ctx, [x0 + bw, y0, 0.01], [x0, y0 + rh, 0.01], 0.006, 4, false); }
    B(ctx, -w, w, H - 0.04, H, -0.015, 0.015, 0.004); B(ctx, -w, w, 0.02, 0.06, -0.015, 0.015, 0.004);
    B(ctx, -side * w - 0.02, -side * w + 0.02, 1.0, 1.15, -0.03, 0.03, 0.01);
  } else {
    paint(ctx, GRIME, "oklch(0.62 0.02 70)", 0.7, 0.6);
    for (const x of [-w + 0.02, w - 0.02]) B(ctx, x - 0.02, x + 0.02, 0.02, H, -0.02, 0.02, 0.006);
    B(ctx, -w, w, H - 0.06, H, -0.02, 0.02, 0.006); B(ctx, -w, w, 0.02, 0.1, -0.02, 0.02, 0.006);
    for (let y = 0.25; y < H - 0.1; y += 0.22) B(ctx, -w + 0.03, w - 0.03, y, y + 0.1, -0.012, 0.012, 0.005);
    cyl(ctx, [-w + 0.04, 0.12, -0.02], [w - 0.04, H - 0.1, -0.02], 0.015, 6);
    paint(ctx, null, "oklch(0.78 0.16 90)", 0.6, 0.1); B(ctx, -side * w - 0.02, -side * w + 0.02, 0.9, 1.25, -0.035, 0.0, 0.006);
  }
  ctx.albedo(null);
}
// the button panel plate: origin bottom centre, 0.36 x 0.66, its face toward -Z (the ui sits on it)
function panel(ctx, st) {
  if (st === "freight") {
    paint(ctx, GRIME, "oklch(0.55 0.02 70)", 0.6, 0.6); B(ctx, -0.18, 0.18, 0, 0.66, -0.05, 0, 0.012);
    paint(ctx, null, "oklch(0.25 0.01 60)", 0.7, 0.3); B(ctx, -0.165, 0.165, 0.015, 0.645, -0.052, -0.048, 0.003);
    paint(ctx, GRIME, "oklch(0.5 0.02 70)", 0.6, 0.6); cyl(ctx, [0, 0.66, -0.025], [0, 1.6, -0.025], 0.016, 8);
  } else {
    brass(ctx); B(ctx, -0.19, 0.19, 0, 0.66, -0.03, 0, 0.012); torus(ctx, [0, 0.66, -0.03], [0, 0, 1], 0.06, 0.01, 14, 4);
    paint(ctx, st === "modern" ? WALNUT : null, st === "modern" ? "oklch(0.5 0.04 50)" : "oklch(0.22 0.03 40)", 0.5, 0.1); B(ctx, -0.17, 0.17, 0.02, 0.64, -0.032, -0.028, 0.003);
  }
  ctx.albedo(null);
}
// the floor indicator housing: origin bottom centre; copper a half-moon dial, modern a deco lightbox, freight a caged lamp box
function ind(ctx, st) {
  if (st === "copper") {
    brass(ctx); const R = 0.3, n = ctx.lod <= 2 ? 24 : 10;
    for (let i = 0; i < n; i++) { const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n; for (const z of [-0.03, 0]) t(ctx, [0, 0, z], [Math.cos(a1) * R, Math.sin(a1) * R, z], [Math.cos(a0) * R, Math.sin(a0) * R, z], [0, 0, z ? -1 : 1]); q(ctx, [Math.cos(a0) * R, Math.sin(a0) * R, -0.03], [Math.cos(a1) * R, Math.sin(a1) * R, -0.03], [Math.cos(a1) * R, Math.sin(a1) * R, 0], [Math.cos(a0) * R, Math.sin(a0) * R, 0], [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0]); }
    q(ctx, [-R, 0, -0.03], [R, 0, -0.03], [R, 0, 0], [-R, 0, 0], [0, -1, 0]);
    torus(ctx, [0, 0, -0.03], [0, 0, 1], R, 0.014, n * 2, 4);
  } else if (st === "modern") {
    brass(ctx); B(ctx, -0.26, 0.26, 0, 0.2, -0.04, 0, 0.015);
    paint(ctx, null, "oklch(0.15 0.02 60)", 0.3, 0.2); B(ctx, -0.22, 0.22, 0.03, 0.17, -0.045, -0.04, 0.003);
    brass(ctx); for (const s of [-1, 1]) t(ctx, [s * 0.26, 0.1, -0.03], [s * 0.36, 0.0, -0.03], [s * 0.36, 0.2, -0.03], [0, 0, -1]);
  } else {
    paint(ctx, GRIME, "oklch(0.5 0.02 70)", 0.6, 0.6); B(ctx, -0.16, 0.16, 0, 0.14, -0.06, 0, 0.01);
    paint(ctx, null, "oklch(0.12 0.01 60)", 0.4, 0.2); B(ctx, -0.13, 0.13, 0.02, 0.12, -0.062, -0.058, 0.002);
  }
  ctx.albedo(null);
}
export function geometry(ctx) {
  const p = ctx.params ?? {}, st = p.style ?? "modern";
  if (p.part === "leaf") leaf(ctx, st, p.side ?? 1);
  else if (p.part === "panel") panel(ctx, st);
  else if (p.part === "ind") ind(ctx, st);
  else cabin(ctx, st, p.h ?? 3.4);
}
export function collider(ctx) {
  const p = ctx.params ?? {};
  if (p.part === "leaf") return { kind: "box", width: 0.58, height: DH, depth: 0.04, center: [0, DH / 2, 0] };
  if (p.part === "panel" || p.part === "ind") return null;
  const top = Math.max(RT + 0.3, (p.h ?? 3.4) - 0.02), sw = (O - DW);
  return [
    { kind: "box", width: 2 * O, height: 0.06, depth: 2 * O, center: [0, 0.03, 0] },
    { kind: "box", width: 0.08, height: top, depth: 2 * O, center: [-0.94, top / 2, 0] },
    { kind: "box", width: 0.08, height: top, depth: 2 * O, center: [0.94, top / 2, 0] },
    { kind: "box", width: 2 * O, height: top, depth: 0.08, center: [0, top / 2, 0.94] },
    { kind: "box", width: sw, height: FH, depth: 0.16, center: [-(DW + sw / 2), FH / 2, -0.98] },
    { kind: "box", width: sw, height: FH, depth: 0.16, center: [DW + sw / 2, FH / 2, -0.98] },
    { kind: "box", width: 2 * FW, height: top - DH, depth: 0.16, center: [0, (DH + top) / 2, -0.98] },
    { kind: "box", width: 2 * O, height: 0.12, depth: 2 * O, center: [0, (CH + RT) / 2, 0] },
  ];
}
