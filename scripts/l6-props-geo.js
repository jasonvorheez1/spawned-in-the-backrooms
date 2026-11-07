// Level 6 leftovers: what the lost ones dropped in the dark. params.kind: backpack | jacket | shoe | stain | torch | chalk | tally
import { tube, sphere, slab } from "./lib/shapes.js";
export function geometry(ctx) {
  const k = ctx.params?.kind ?? "backpack", hi = ctx.lod <= 2, M = hi ? 12 : 7;
  ctx.roughness(0.9);
  if (k === "backpack") { // slumped on its side, one strap flung out
    ctx.smooth(); ctx.color("oklch(0.34 0.05 145)");
    tube(ctx, [[0, 0.02, -0.16], [0, 0.17, -0.12], [0, 0.2, 0.05], [0, 0.14, 0.17]], [0.06, 0.17, 0.18, 0.12], M, [1.3, 0.8]);
    ctx.color("oklch(0.29 0.05 145)"); tube(ctx, [[0.02, 0.06, 0.18], [0.03, 0.13, 0.27], [0.02, 0.16, 0.3]], [0.07, 0.09, 0.05], M, [1.2, 0.9]); // front pocket
    ctx.color("oklch(0.18 0.01 250)"); tube(ctx, [[-0.16, 0.18, -0.05], [-0.3, 0.03, 0.05], [-0.42, 0.015, 0.2], [-0.36, 0.015, 0.32]], [0.018, 0.016, 0.016, 0.016], 6, [2.2, 0.4]); // strap
    ctx.color("oklch(0.6 0.02 80)"); slab(ctx, [0.19, 0.2, 0.02], [0.012, 0.03, 0.02]); // zip pull
    return;
  }
  if (k === "jacket") { // a work jacket dropped flat, sleeves out
    ctx.smooth(); ctx.color("oklch(0.32 0.06 40)");
    tube(ctx, [[0, 0.03, -0.32], [0, 0.04, 0], [0, 0.035, 0.32]], [0.22, 0.25, 0.24], M, [1.2, 0.12]);
    for (const s of [-1, 1]) tube(ctx, [[s * 0.24, 0.035, -0.25], [s * 0.45, 0.03, -0.1], [s * 0.55, 0.025, 0.2]], [0.07, 0.06, 0.055], 6, [1, 0.35]);
    ctx.color("oklch(0.55 0.08 70)"); slab(ctx, [0, 0.075, -0.28], [0.12, 0.012, 0.04]); // collar
    return;
  }
  if (k === "shoe") { // one sneaker, laces still tied
    ctx.smooth(); ctx.color("oklch(0.8 0.01 90)"); tube(ctx, [[0, 0.04, -0.13], [0, 0.05, 0.02], [0, 0.04, 0.13]], [0.045, 0.05, 0.04], M, [1.1, 0.8]);
    ctx.color("oklch(0.22 0.01 250)"); slab(ctx, [0, 0.008, 0], [0.05, 0.008, 0.14]);
    return;
  }
  if (k === "stain") { // a dried pool and the smear dragging away from it
    ctx.flat(); ctx.roughness(0.35); ctx.color("oklch(0.2 0.08 25)");
    const disc = (cx, cz, r, sx) => { const n = hi ? 18 : 10; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, b = ((i + 1) / n) * 6.283, w = 1 + 0.25 * Math.sin(i * 2.7); ctx.quad(cx, 0.004, cz, cx + Math.cos(b) * r * sx * w, 0.004, cz + Math.sin(b) * r, cx + Math.cos(a) * r * sx * w, 0.004, cz + Math.sin(a) * r, cx, 0.004, cz); } };
    disc(0, 0, 0.42, 1.2); disc(0.3, 0.35, 0.16, 1); disc(-0.35, -0.2, 0.1, 1);
    ctx.color("oklch(0.17 0.06 25)"); for (let i = 0; i < 6; i++) disc(0.05 * Math.sin(i), 0.55 + i * 0.22, 0.13 - i * 0.012, 0.8); // the drag
    return;
  }
  if (k === "torch") { // a dead flashlight, lens cracked
    ctx.smooth(); ctx.color("oklch(0.25 0.01 250)"); tube(ctx, [[0, 0.025, -0.11], [0, 0.025, 0.07], [0, 0.03, 0.1], [0, 0.03, 0.12]], [0.022, 0.022, 0.032, 0.032], M);
    ctx.color("oklch(0.5 0.01 90)"); slab(ctx, [0, 0.03, 0.123], [0.025, 0.025, 0.003]);
    return;
  }
  if (k === "chalk") { ctx.smooth(); ctx.color("oklch(0.9 0.01 90)"); tube(ctx, [[0, 0.008, -0.03], [0, 0.008, 0.03]], [0.008, 0.007], 6); return; }
}
