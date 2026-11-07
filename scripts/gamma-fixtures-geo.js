// Base Gamma's light fixtures, one per row of LIGHTS (scripts/lib/gamma-layout.js): troffers, atrium pendants, caged bulbs,
// cold wall lamps, the gas station's red tube. The lights themselves are spawned by places/gamma/sim.js. One static mesh.
import { LIGHTS } from "./lib/gamma-layout.js";
import { box, paint, cyl, sphere, rod } from "./lib/gamma-kit.js";
export function geometry(ctx) {
  const hi = ctx.lod <= 2;
  for (const [x, y, z, col, , , kind] of LIGHTS) {
    if (kind === "lamp") continue; // the town's lampposts are in gamma-town-geo
    const glow = col.replace(/oklch\(([\d.]+)/, (m, l) => `oklch(${Math.min(1.6, +l * 1.45).toFixed(2)}`);
    if (kind === "troffer") {
      paint(ctx, "oklch(0.85 0.01 90)", "steel", 0.5, 0.4); box(ctx, x - 0.7, x + 0.7, y + 0.12, y + 0.22, z - 0.35, z + 0.35);
      paint(ctx, col, null, 0.4, 0, glow); box(ctx, x - 0.62, x + 0.62, y + 0.1, y + 0.13, z - 0.28, z + 0.28);
    } else if (kind === "pendant") {
      paint(ctx, "oklch(0.3 0.02 250)", "steel", 0.4, 0.8); rod(ctx, [x, y + 0.4, z], [x, y + 3, z], 0.02, 4);
      cyl(ctx, x, z, y, y + 0.4, 0.6, hi ? 16 : 8);
      paint(ctx, col, null, 0.4, 0, glow); cyl(ctx, x, z, y - 0.05, y + 0.01, 0.52, hi ? 16 : 8);
    } else if (kind === "red") {
      paint(ctx, col, null, 0.4, 0, "oklch(1.1 0.25 25)"); box(ctx, x - 3, x + 3, y - 0.05, y + 0.05, z - 0.05, z + 0.05);
    } else {
      paint(ctx, "oklch(0.25 0.01 60)", "steel", 0.5, 0.7); rod(ctx, [x, y + 0.15, z], [x, y + 0.5, z], 0.015, 4);
      if (hi) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; rod(ctx, [x + Math.cos(a) * 0.1, y + 0.15, z + Math.sin(a) * 0.1], [x + Math.cos(a) * 0.1, y - 0.15, z + Math.sin(a) * 0.1], 0.006, 3); }
      paint(ctx, col, null, 0.4, 0, glow); sphere(ctx, [x, y, z], 0.08, 8);
    }
  }
}
export function collider() {}
