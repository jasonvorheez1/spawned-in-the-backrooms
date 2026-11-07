// Base Gamma's great door: two rusty white blast leaves with peeling paint, rivet rows, cross bars and a wheel lock,
// in a riveted steel I-beam frame. Origin at the sill centre, the face toward -Z. params: w (opening), h, seal (true: no gap).
import { box, paint, rod, post, tube } from "./lib/gamma-kit.js";
function build(ctx, vis) {
  const p = ctx.params ?? {}, w = p.w ?? 3.6, h = p.h ?? 4, hi = ctx.lod <= 2, hw = w / 2, F = 0.35;
  if (!vis) { box(ctx, -hw - F, hw + F, 0, h + F, -0.25, 0.25); return; }
  // frame: I-beam jambs and header, dark painted steel
  paint(ctx, "oklch(0.42 0.02 250)", "steel", 0.55, 0.7);
  for (const s of [-1, 1]) { box(ctx, s * hw, s * (hw + F), 0, h + F, -0.3, -0.22); box(ctx, s * hw, s * (hw + F), 0, h + F, 0.22, 0.3); box(ctx, s * (hw + 0.12), s * (hw + 0.22), 0, h + F, -0.22, 0.22); }
  box(ctx, -hw - F, hw + F, h, h + F, -0.3, -0.22); box(ctx, -hw - F, hw + F, h, h + F, 0.22, 0.3); box(ctx, -hw - F, hw + F, h + 0.12, h + 0.22, -0.22, 0.22);
  paint(ctx, "oklch(0.75 0.15 90)", null, 0.6); // hazard sill
  box(ctx, -hw - F, hw + F, 0, 0.06, -0.45, 0.45);
  // leaves
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -hw : 0.01, x1 = s < 0 ? -0.01 : hw;
    paint(ctx, "oklch(0.97 0.01 90)", "rustwhite", 0.75, 0.3); box(ctx, x0, x1, 0.06, h, -0.12, 0.12);
    paint(ctx, "oklch(0.88 0.03 70)", "rustwhite", 0.6, 0.4);
    for (const y of [0.6, h / 2, h - 0.6]) { box(ctx, x0 + 0.08, x1 - 0.08, y - 0.12, y + 0.12, -0.18, -0.12); box(ctx, x0 + 0.08, x1 - 0.08, y - 0.12, y + 0.12, 0.12, 0.18); }
    // a diagonal brace
    rod(ctx, [x0 + 0.15, 0.75, -0.16], [x1 - 0.15, h - 0.75, -0.16], 0.06, 4);
    if (hi) { paint(ctx, "oklch(0.55 0.08 45)", "steel", 0.5, 0.8); // rivets
      for (const y of [0.6, h / 2, h - 0.6]) for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.3) { post(ctx, x, -0.185, y - 0.03, y + 0.03, 0.025, 5); post(ctx, x, 0.185, y - 0.03, y + 0.03, 0.025, 5); }
      paint(ctx, "oklch(0.35 0.07 45)", "steel", 0.8, 0.6); // rust weeping from the bars
      for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.55) box(ctx, x, x + 0.06, 0.1, 0.48, -0.125, -0.12); }
  }
  // the wheel lock in the middle
  paint(ctx, "oklch(0.45 0.16 28)", "steel", 0.45, 0.8);
  const N = hi ? 24 : 12, R = 0.45, pts = [];
  for (let k = 0; k <= N; k++) { const t = (k / N) * Math.PI * 2; pts.push([Math.cos(t) * R, h / 2 + Math.sin(t) * R, -0.26]); }
  tube(ctx, pts, pts.map(() => 0.035), 6, [1, 1], 0, 1, 1);
  for (let k = 0; k < 4; k++) { const t = (k / 4) * Math.PI * 2 + 0.4; rod(ctx, [0, h / 2, -0.26], [Math.cos(t) * R, h / 2 + Math.sin(t) * R, -0.26], 0.025, 5); }
  rod(ctx, [0, h / 2, -0.12], [0, h / 2, -0.3], 0.08, 8);
  // a caged warning lamp over the header
  paint(ctx, "oklch(0.3 0.02 250)", "steel", 0.5, 0.7); box(ctx, -0.2, 0.2, h + F, h + F + 0.08, -0.4, -0.3);
  paint(ctx, "oklch(0.75 0.17 60)", null, 0.3, 0, "oklch(1.4 0.25 60)"); post(ctx, 0, -0.42, h + F + 0.08, h + F + 0.28, 0.1, 10);
  ctx.emissive(null);
}
export function geometry(ctx) { build(ctx, true); }
export function collider(ctx) { build(ctx, false); }
