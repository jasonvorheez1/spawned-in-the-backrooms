// Level 7 entrance-room furnishings and sea-rock dressing: coffee table, fluorescent troffer, boulders,
// plus the Wikidot reference photo's stone hearth, turned pedestal table, stacked drawers with brass pulls, and wire rack.
import { tube, slab, sphere } from "./lib/shapes.js";
const HARDWOOD = "cdn/texture-worn-hardwood-grain.png";
const ROCK = "cdn/texture-terrain-wet-dark-basalt-rock.png";
const METAL = "cdn/texture-scratched-worn-steel.png";

export function geometry(ctx) {
  const k = ctx.params?.kind ?? "table", M = ctx.lod <= 2 ? 12 : 7;
  if (k === "table") { // low coffee table, water-swollen veneer, one ring stain
    ctx.albedo(HARDWOOD); ctx.roughness(0.55); ctx.color("oklch(0.36 0.05 50)");
    slab(ctx, [0, 0.42, 0], [0.55, 0.025, 0.32]);
    ctx.color("oklch(0.3 0.04 50)"); slab(ctx, [0, 0.36, 0], [0.5, 0.04, 0.27]);
    for (const sx of [-0.47, 0.47]) for (const sz of [-0.24, 0.24]) tube(ctx, [[sx, 0.34, sz], [sx, 0, sz]], [0.03, 0.022], 6);
    ctx.albedo(null); ctx.color("oklch(0.25 0.03 50)"); ctx.roughness(0.9); slab(ctx, [0, 0.12, 0], [0.45, 0.012, 0.22]);
    ctx.color("oklch(0.85 0.02 90)"); ctx.roughness(0.3); tube(ctx, [[0.2, 0.445, 0.05], [0.2, 0.54, 0.05]], [0.04, 0.045], M); // a mug, left
    ctx.color("oklch(0.75 0.03 80)"); ctx.roughness(0.8); slab(ctx, [-0.2, 0.455, -0.05], [0.11, 0.012, 0.15]); // a swollen book
    return;
  }
  if (k === "troffer") { // the one fluorescent panel, buzzing
    ctx.albedo(null); ctx.color("oklch(0.75 0.01 90)"); ctx.metalness(0.4); ctx.roughness(0.5);
    slab(ctx, [0, 0.04, 0], [0.62, 0.04, 0.32]);
    ctx.metalness(0); ctx.color("#ffffff"); ctx.emissive("oklch(0.93 0.05 95)");
    slab(ctx, [0, -0.005, 0], [0.56, 0.006, 0.26]);
    ctx.emissive(null); ctx.color("oklch(0.6 0.01 90)");
    for (const x of [-0.19, 0.19]) slab(ctx, [x, -0.012, 0], [0.008, 0.006, 0.26]);
    return;
  }
  if (k === "boulder") { // wet basalt, slumped, barnacled at the foot
    const s = ctx.params.seed ?? 1;
    ctx.albedo(ROCK); ctx.roughness(0.6); ctx.color("oklch(0.34 0.012 240)"); ctx.flat();
    tube(ctx, [[0, -0.4, 0], [0, 0.25, 0], [0, 0.7, 0], [0, 0.95, 0]], [1.0, 1.05, 0.7, 0.08], M, [1, 0.8], 0.22, s);
    ctx.albedo(null); ctx.color("oklch(0.3 0.05 140)"); ctx.roughness(1);
    tube(ctx, [[0, -0.42, 0], [0, -0.1, 0]], [1.06, 1.1], M, [1, 0.8], 0.2, s);
    return;
  }
  if (k === "pedestal") { // Wikidot photo: turned-wood round pedestal table with white saucer top on the right
    ctx.smooth(); ctx.albedo(HARDWOOD); ctx.roughness(0.5); ctx.color("oklch(0.42 0.08 52)");
    // Three splayed cabriole feet
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      tube(ctx, [[0, 0.18, 0], [Math.cos(a) * 0.24, 0.02, Math.sin(a) * 0.24]], [0.035, 0.02], 6);
    }
    // Turned baluster column
    tube(ctx, [[0, 0.12, 0], [0, 0.28, 0], [0, 0.42, 0], [0, 0.62, 0], [0, 0.74, 0]], [0.05, 0.085, 0.04, 0.065, 0.045], M);
    // Round wooden tabletop
    tube(ctx, [[0, 0.74, 0], [0, 0.78, 0]], [0.3, 0.31], M);
    // White ceramic saucer/tray rim on top
    ctx.albedo(null); ctx.color("oklch(0.92 0.01 90)"); ctx.roughness(0.25);
    tube(ctx, [[0, 0.78, 0], [0, 0.805, 0]], [0.27, 0.28], M);
    return;
  }
  if (k === "wirerack") { // Wikidot photo: wire shelving unit beside the armchair with boxes & green vase
    ctx.albedo(METAL); ctx.metalness(0.6); ctx.roughness(0.45); ctx.color("oklch(0.58 0.01 240)");
    for (const sx of [-0.32, 0.32]) for (const sz of [-0.22, 0.22]) {
      tube(ctx, [[sx, 0, sz], [sx, 1.28, sz]], [0.014, 0.014], 6);
    }
    for (const y of [0.35, 0.78, 1.22]) {
      slab(ctx, [0, y, 0], [0.34, 0.012, 0.24]);
    }
    // Clutter on shelves: tin canister & emerald-green bottle vase from the photo
    ctx.albedo(null); ctx.metalness(0.2); ctx.roughness(0.2); ctx.color("oklch(0.38 0.11 155)"); // Green vase
    tube(ctx, [[0.14, 1.23, 0.04], [0.14, 1.42, 0.04], [0.14, 1.56, 0.04]], [0.07, 0.085, 0.032], M);
    ctx.color("oklch(0.88 0.02 90)"); ctx.roughness(0.6); // White ceramic pot next to it
    tube(ctx, [[0.24, 1.23, -0.05], [0.24, 1.36, -0.05]], [0.055, 0.065], M);
    return;
  }
  if (k === "hearth") { // Wikidot photo: stone/brick hearth wall on the right with timber mantel and turned finial
    ctx.albedo(ROCK); ctx.roughness(0.85); ctx.color("oklch(0.46 0.03 55)");
    slab(ctx, [0, 0.95, 0], [0.22, 0.95, 0.75]);
    // Dark hearth firebox recess
    ctx.albedo(null); ctx.color("oklch(0.14 0.01 240)");
    slab(ctx, [-0.12, 0.42, 0], [0.12, 0.42, 0.42]);
    // Carved hardwood mantel shelf
    ctx.albedo(HARDWOOD); ctx.roughness(0.55); ctx.color("oklch(0.35 0.06 50)");
    slab(ctx, [-0.04, 1.42, 0], [0.28, 0.05, 0.84]);
    // Turned wooden candlestick/finial on the mantel
    ctx.smooth(); ctx.color("oklch(0.45 0.08 55)");
    tube(ctx, [[-0.08, 1.47, -0.35], [-0.08, 1.62, -0.35], [-0.08, 1.78, -0.35]], [0.065, 0.03, 0.075], M);
    return;
  }
}
