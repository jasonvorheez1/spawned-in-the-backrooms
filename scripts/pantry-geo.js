// One pantry good on Ferry's shelves (Level 169): a tin or a jar, each its own takeable object. params: kind "tin" | "tall" | "jar", label (oklch), fill (jar contents)
function lathe(ctx, prof, M) {
  for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < M; i++) {
    const a0 = (i / M) * 6.28318, a1 = ((i + 1) / M) * 6.28318, [r0, y0] = prof[j], [r1, y1] = prof[j + 1];
    const p = (r, y, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
    ctx.quad ? ctx.quad(p(r0, y0, a0), p(r0, y0, a1), p(r1, y1, a1), p(r1, y1, a0)) : (ctx.triangle(p(r0, y0, a0), p(r1, y1, a1), p(r0, y0, a1)), ctx.triangle(p(r0, y0, a0), p(r1, y1, a0), p(r1, y1, a1)));
  }
}
export function geometry(ctx) {
  const P = ctx.params ?? {}, M = (ctx.lod ?? 1) > 1 ? 8 : 16, kind = P.kind ?? "tin";
  ctx.smooth();
  if (kind === "jar") {
    const R = 0.042, H = 0.13;
    ctx.color(P.fill ?? "oklch(0.72 0.14 60)"); ctx.roughness(0.5); lathe(ctx, [[0, 0.006], [R - 0.006, 0.006], [R - 0.006, H - 0.03], [0, H - 0.03]], M); // what's preserved inside
    ctx.color("oklch(0.92 0.02 100 / 0.45)"); ctx.roughness(0.08); lathe(ctx, [[0, 0], [R - 0.004, 0], [R, 0.008], [R, H - 0.03], [R - 0.012, H - 0.012], [R - 0.012, H - 0.004]], M); // glass, a shoulder and a neck
    ctx.color("oklch(0.75 0.05 85)"); ctx.metalness(0.6); ctx.roughness(0.4); lathe(ctx, [[R - 0.01, H - 0.008], [R - 0.008, H], [R - 0.009, H + 0.012], [0, H + 0.012]], M); // lid
    ctx.metalness(0); ctx.color("oklch(0.93 0.03 85)"); ctx.roughness(0.9); lathe(ctx, [[R + 0.001, 0.045], [R + 0.001, 0.075]], M); // paper label band
    return;
  }
  const R = kind === "tall" ? 0.036 : 0.042, H = kind === "tall" ? 0.15 : 0.105;
  ctx.color("oklch(0.82 0.01 240)"); ctx.metalness(0.75); ctx.roughness(0.35);
  lathe(ctx, [[0, 0], [R - 0.004, 0], [R, 0.004], [R, 0.012], [R - 0.002, 0.016]], M); // rolled bottom rim
  lathe(ctx, [[R - 0.002, H - 0.016], [R, H - 0.012], [R, H - 0.004], [R - 0.004, H], [R - 0.008, H - 0.002], [0, H - 0.002]], M); // rim and lid
  ctx.metalness(0); ctx.roughness(0.75); ctx.color(P.label ?? "oklch(0.6 0.16 28)");
  lathe(ctx, [[R - 0.002, 0.016], [R + 0.001, 0.02], [R + 0.001, H - 0.016], [R - 0.002, H - 0.016]], M); // the paper label
  ctx.color("oklch(0.95 0.02 90)"); for (let i = 0; i < M; i++) if (i % M < 3) { const a0 = (i / M) * 6.28318, a1 = ((i + 1) / M) * 6.28318, r = R + 0.0016, y0 = H * 0.42, y1 = H * 0.62; ctx.triangle([Math.cos(a0) * r, y0, Math.sin(a0) * r], [Math.cos(a1) * r, y1, Math.sin(a1) * r], [Math.cos(a1) * r, y0, Math.sin(a1) * r]); ctx.triangle([Math.cos(a0) * r, y0, Math.sin(a0) * r], [Math.cos(a0) * r, y1, Math.sin(a0) * r], [Math.cos(a1) * r, y1, Math.sin(a1) * r]); } // a pale name panel on the label's face
}
