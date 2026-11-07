// Level 4's few leftovers, one per object so each stands at its own angle: params.kind = chair | chairdown | box | boxes |
// plant | panel | cabinet. Abandoned, not staged: dust on the seat, a box split at its tape, a plant dead in its pot.
import { box, paint, cyl, rod } from "./lib/gamma-kit.js";
import { sphere } from "./lib/shapes.js";
const CARD = "cdn/texture-corrugated-cardboard.png", FAB = "cdn/texture-worn-canvas-fabric.png";
function chair(ctx, hi) {
  const M = hi ? 10 : 6;
  paint(ctx, "oklch(0.2 0.005 250)", null, 0.5, 0.2);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; rod(ctx, [0, 0.07, 0], [Math.cos(a) * 0.32, 0.05, Math.sin(a) * 0.32], 0.022, 5); sphere(ctx, [Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32], 0.03, 6); }
  paint(ctx, "oklch(0.6 0.01 250)", null, 0.3, 0.9); cyl(ctx, 0, 0, 0.07, 0.42, 0.025, M);
  paint(ctx, "oklch(0.3 0.03 250)", FAB, 0.95); box(ctx, -0.24, 0.24, 0.42, 0.5, -0.22, 0.24);
  box(ctx, -0.22, 0.22, 0.58, 1.02, 0.25, 0.31);
  paint(ctx, "oklch(0.2 0.005 250)", null, 0.5, 0.2); box(ctx, -0.03, 0.03, 0.42, 0.62, 0.24, 0.27);
  for (const s of [-1, 1]) { box(ctx, s * 0.26 - 0.02, s * 0.26 + 0.02, 0.5, 0.66, 0.0, 0.04); box(ctx, s * 0.26 - 0.03, s * 0.26 + 0.03, 0.66, 0.69, -0.12, 0.18); }
}
function carton(ctx, w, h, d, y = 0, open = false) {
  paint(ctx, "oklch(0.68 0.07 70)", CARD, 0.95); box(ctx, -w / 2, w / 2, y, y + h, -d / 2, d / 2);
  paint(ctx, "oklch(0.72 0.05 80)", null, 0.4); box(ctx, -0.03, 0.03, y + h, y + h + 0.002, -d / 2 - 0.002, d / 2 + 0.002);
  if (open) { paint(ctx, "oklch(0.62 0.07 70)", CARD, 0.95); box(ctx, -w / 2, w / 2, y + h, y + h + 0.01, d / 2, d / 2 + d * 0.45); paint(ctx, "oklch(0.93 0.015 95)", null, 0.95); box(ctx, -w / 2 + 0.04, w / 2 - 0.04, y + h - 0.06, y + h - 0.01, -d / 2 + 0.04, d / 2 - 0.04); }
}
export function geometry(ctx) {
  const k = ctx.params?.kind ?? "chair", hi = ctx.lod <= 1;
  if (k === "chair") chair(ctx, hi);
  if (k === "boxes") { carton(ctx, 0.5, 0.36, 0.38); carton(ctx, 0.46, 0.32, 0.36, 0.36, true); }
  if (k === "box") carton(ctx, 0.48, 0.34, 0.36, 0, true);
  if (k === "plant") {
    paint(ctx, "oklch(0.35 0.02 40)", null, 0.8); cyl(ctx, 0, 0, 0, 0.38, 0.19, hi ? 14 : 8);
    paint(ctx, "oklch(0.2 0.02 50)", null, 1); cyl(ctx, 0, 0, 0.36, 0.381, 0.17, hi ? 14 : 8);
    paint(ctx, "oklch(0.45 0.05 75)", null, 0.9);
    for (let i = 0; i < 7; i++) { const a = i * 2.39, l = 0.5 + (i % 3) * 0.25, tip = [Math.cos(a) * 0.25, 0.38 + l, Math.sin(a) * 0.25], droop = [Math.cos(a) * 0.45, 0.38 + l * 0.65, Math.sin(a) * 0.45];
      rod(ctx, [Math.cos(a) * 0.03, 0.38, Math.sin(a) * 0.03], tip, 0.008, 4); rod(ctx, tip, droop, 0.006, 4); }
    paint(ctx, "oklch(0.55 0.06 70)", null, 1); for (let i = 0; i < 5; i++) { const a = i * 1.7; box(ctx, Math.cos(a) * 0.3 - 0.04, Math.cos(a) * 0.3 + 0.04, 0.002, 0.004, Math.sin(a) * 0.3 - 0.02, Math.sin(a) * 0.3 + 0.02); }
  }
  if (k === "panel") { // a cubicle partition, its fabric faded, steel feet
    paint(ctx, "oklch(0.55 0.02 240)", FAB, 0.95); box(ctx, -0.75, 0.75, 0.06, 1.45, -0.03, 0.03);
    paint(ctx, "oklch(0.4 0.01 250)", null, 0.4, 0.6); box(ctx, -0.78, 0.78, 1.45, 1.5, -0.035, 0.035); box(ctx, -0.78, -0.73, 0, 1.5, -0.035, 0.035); box(ctx, 0.73, 0.78, 0, 1.5, -0.035, 0.035);
    for (const s of [-0.65, 0.65]) box(ctx, s - 0.03, s + 0.03, 0, 0.03, -0.2, 0.2);
  }
  if (k === "cabinet") { // a four-drawer file cabinet, one drawer hanging open
    paint(ctx, "oklch(0.62 0.012 90)", "steel", 0.5, 0.5); box(ctx, -0.23, 0.23, 0, 1.32, -0.33, 0.33);
    for (let i = 0; i < 4; i++) { const y = 0.05 + i * 0.32, open = i === 1 ? 0.35 : 0;
      paint(ctx, "oklch(0.66 0.012 90)", "steel", 0.45, 0.5); box(ctx, -0.21, 0.21, y, y + 0.29, -0.345 - open, -0.33 - open);
      paint(ctx, "oklch(0.35 0.01 90)", null, 0.3, 0.8); box(ctx, -0.07, 0.07, y + 0.2, y + 0.225, -0.365 - open, -0.345 - open);
      if (open) { paint(ctx, "oklch(0.58 0.012 90)", "steel", 0.5, 0.5); box(ctx, -0.2, -0.19, y, y + 0.25, -0.33 - open, -0.33); box(ctx, 0.19, 0.2, y, y + 0.25, -0.33 - open, -0.33); box(ctx, -0.2, 0.2, y, y + 0.01, -0.33 - open, -0.33);
        paint(ctx, "oklch(0.8 0.07 85)", null, 0.9); for (let f = 0; f < 6; f++) box(ctx, -0.18, 0.18, y + 0.01, y + 0.22 - (f % 2) * 0.03, -0.32 - open + f * 0.055, -0.315 - open + f * 0.055); }
    }
  }
}
