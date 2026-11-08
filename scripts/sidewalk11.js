// Level 11 sidewalk slab: poured concrete panels ~1.5 m square, each with chamfered edges so the joints read as dark
// grooves, a slight tilt and tint per panel (settled, patched, stained), feet at y 0, top at params.h.
// params: w (x size), d (z size), h (thickness), panel (panel size). Vertex colours carry the tint over the placement's texture.
function hash(i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const TINTS = ["oklch(0.97 0.012 85)", "oklch(0.92 0.015 80)", "oklch(0.88 0.018 78)", "oklch(0.95 0.01 90)", "oklch(0.82 0.02 75)"];

export function geometry(ctx) {
  const p = ctx.params ?? {}, W = p.w ?? 7.6, D = p.d ?? 36, H = p.h ?? 0.25, P = p.panel ?? 1.52, lod = ctx.lod ?? 1;
  const nx = Math.max(1, Math.round(W / P)), nz = Math.max(1, Math.round(D / P)), px = W / nx, pz = D / nz, ch = 0.018;
  // the grout bed under the joints, dark
  ctx.color("oklch(0.42 0.015 70)");
  ctx.quad(-W / 2, H - 0.03, D / 2, W / 2, H - 0.03, D / 2, W / 2, H - 0.03, -D / 2, -W / 2, H - 0.03, -D / 2);
  // outer skirt faces down to the ground
  ctx.color("oklch(0.7 0.015 80)");
  ctx.quad(W / 2, 0, D / 2, W / 2, 0, -D / 2, W / 2, H, -D / 2, W / 2, H, D / 2);
  ctx.quad(-W / 2, 0, -D / 2, -W / 2, 0, D / 2, -W / 2, H, D / 2, -W / 2, H, -D / 2);
  ctx.quad(-W / 2, 0, D / 2, W / 2, 0, D / 2, W / 2, H, D / 2, -W / 2, H, D / 2);
  ctx.quad(W / 2, 0, -D / 2, -W / 2, 0, -D / 2, -W / 2, H, -D / 2, W / 2, H, -D / 2);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const r = hash(i, j, 1), x0 = -W / 2 + i * px + 0.006, x1 = x0 + px - 0.012, z0 = -D / 2 + j * pz + 0.006, z1 = z0 + pz - 0.012;
    const tilt = lod < 3 ? (r - 0.5) * 0.012 : 0, y = H - (hash(i, j, 2) < 0.12 ? 0.008 : 0); // a few panels settled
    const c = TINTS[Math.floor(hash(i, j, 3) * TINTS.length)];
    const yA = y + tilt, yB = y - tilt;
    ctx.color(c);
    ctx.quad(x0 + ch, yA, z1 - ch, x1 - ch, yB, z1 - ch, x1 - ch, yB, z0 + ch, x0 + ch, yA, z0 + ch); // top
    if (lod < 4) { // chamfers down into the joint
      ctx.color("oklch(0.74 0.015 78)");
      ctx.quad(x1 - ch, yB, z1 - ch, x1, yB - ch, z1, x1, yB - ch, z0, x1 - ch, yB, z0 + ch);
      ctx.quad(x0, yA - ch, z1, x0 + ch, yA, z1 - ch, x0 + ch, yA, z0 + ch, x0, yA - ch, z0);
      ctx.quad(x0, yA - ch, z1, x1, yB - ch, z1, x1 - ch, yB, z1 - ch, x0 + ch, yA, z1 - ch);
      ctx.quad(x0 + ch, yA, z0 + ch, x1 - ch, yB, z0 + ch, x1, yB - ch, z0, x0, yA - ch, z0);
    }
    if (lod < 3 && hash(i, j, 4) < 0.07) { // a gum spot or old stain
      const sx = x0 + 0.2 + hash(i, j, 5) * (px - 0.5), sz = z0 + 0.2 + hash(i, j, 6) * (pz - 0.5), s = 0.08 + hash(i, j, 7) * 0.25;
      ctx.color(hash(i, j, 8) < 0.5 ? "oklch(0.78 0.02 75)" : "oklch(0.82 0.03 65)");
      ctx.quad(sx - s, y + 0.002, sz + s * 0.7, sx + s, y + 0.002, sz + s * 0.7, sx + s * 0.8, y + 0.002, sz - s, sx - s * 0.9, y + 0.002, sz - s * 0.8);
    }
  }
}
