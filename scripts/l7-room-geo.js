// Level 7 entrance-room furnishings and sea-rock dressing: coffee table, fluorescent troffer, boulders,
// plus the Wikidot reference photo's stacked bureau drawers, antique armoire with draped linen & silver tea service,
// stone hearth, turned pedestal table, wire rack with green vase, dried floral bouquet, and antique spindle chair.
import { tube, sphere } from "./lib/shapes.js";
import { bx } from "./lib/l5-hall-kit.js";
const slab = (ctx,c,h) => bx(ctx,c[0]-h[0],c[0]+h[0],c[1]-h[1],c[1]+h[1],c[2]-h[2],c[2]+h[2]);
const HARDWOOD = "cdn/texture-worn-hardwood-grain.png";
const ROCK = "cdn/texture-terrain-wet-dark-basalt-rock.png";
const METAL = "cdn/texture-scratched-worn-steel.png";
const LINEN = "cdn/texture-white-damask-linen-tablecloth.png";

export function geometry(ctx) {
  const k = ctx.params?.kind ?? "table", M = ctx.lod <= 2 ? 12 : 7;
  if (k === "table") { // low coffee table, water-swollen veneer, one ring stain
    ctx.albedo(HARDWOOD); ctx.roughness(0.55); ctx.color("oklch(0.65 0.05 50)");
    slab(ctx, [0, 0.42, 0], [0.55, 0.025, 0.32]);
    ctx.color("oklch(0.60 0.04 50)"); slab(ctx, [0, 0.36, 0], [0.5, 0.04, 0.27]);
    for (const sx of [-0.47, 0.47]) for (const sz of [-0.24, 0.24]) tube(ctx, [[sx, 0.34, sz], [sx, 0, sz]], [0.03, 0.022], 6);
    ctx.albedo(null); ctx.color("oklch(0.25 0.03 50)"); ctx.roughness(0.9); slab(ctx, [0, 0.12, 0], [0.45, 0.012, 0.22]);
    ctx.color("oklch(0.85 0.02 90)"); ctx.roughness(0.3); tube(ctx, [[0.2, 0.445, 0.05], [0.2, 0.54, 0.05]], [0.04, 0.045], M); // a mug, left
    ctx.color("oklch(0.75 0.03 80)"); ctx.roughness(0.8); slab(ctx, [-0.2, 0.455, -0.05], [0.11, 0.012, 0.15]); // a swollen book
    return;
  }
  if (k === "drawers") { // Wikidot reference photo: central submerged table with pyramid stack of antique bureau drawers
    // 1. Submerged table base with 4 legs and apron
    ctx.albedo(HARDWOOD); ctx.roughness(0.5); ctx.color("oklch(0.62 0.05 45)");
    slab(ctx, [0, 0.42, 0], [0.58, 0.025, 0.36]); // table top
    slab(ctx, [0, 0.36, 0], [0.52, 0.035, 0.30]); // apron
    for (const sx of [-0.50, 0.50]) for (const sz of [-0.28, 0.28]) {
      tube(ctx, [[sx, 0.35, sz], [sx, 0, sz]], [0.036, 0.028], 6); // table legs in water
    }
    // 2. Bottom Drawer: Wide antique mahogany bureau drawer with brass pulls
    ctx.color("oklch(0.64 0.06 42)"); ctx.roughness(0.48);
    slab(ctx, [0, 0.54, 0], [0.52, 0.09, 0.32]);
    // Brass drop-bail handles & keyhole on bottom drawer
    ctx.albedo(null); ctx.metalness(0.8); ctx.roughness(0.25); ctx.color("oklch(0.75 0.14 85)"); // Brass
    for (const bx of [-0.28, 0.28]) {
      slab(ctx, [bx, 0.54, 0.325], [0.035, 0.012, 0.005]); // backplate
      tube(ctx, [[bx - 0.025, 0.54, 0.33], [bx, 0.515, 0.338], [bx + 0.025, 0.54, 0.33]], [0.006, 0.006, 0.006], 6); // bail handle
    }
    slab(ctx, [0, 0.57, 0.325], [0.008, 0.015, 0.004]); // brass keyhole
    // 3. Middle Drawer: Stacked antique drawer
    ctx.albedo(HARDWOOD); ctx.color("oklch(0.60 0.05 40)"); ctx.roughness(0.5);
    slab(ctx, [0, 0.72, 0], [0.46, 0.085, 0.28]);
    ctx.albedo(null); ctx.metalness(0.8); ctx.roughness(0.25); ctx.color("oklch(0.75 0.14 85)");
    for (const bx of [-0.22, 0.22]) {
      slab(ctx, [bx, 0.72, 0.285], [0.03, 0.01, 0.005]);
      tube(ctx, [[bx - 0.02, 0.72, 0.29], [bx, 0.70, 0.296], [bx + 0.02, 0.72, 0.29]], [0.005, 0.005, 0.005], 6);
    }
    // 4. Top Drawer: Dark olive-tinted drawer, angled slightly on top, slightly open
    ctx.albedo(HARDWOOD); ctx.color("oklch(0.62 0.05 90)"); ctx.roughness(0.65);
    slab(ctx, [-0.02, 0.88, 0.04], [0.39, 0.075, 0.24]);
    // Top drawer brass knob pull
    ctx.albedo(null); ctx.metalness(0.85); ctx.roughness(0.25); ctx.color("oklch(0.78 0.14 85)");
    sphere(ctx, [-0.02, 0.88, 0.285], 0.014, 8);
    // Interior paper / antique silver fork poking out
    ctx.color("oklch(0.86 0.03 85)"); ctx.roughness(0.9);
    slab(ctx, [-0.08, 0.94, 0.12], [0.12, 0.008, 0.08]); // yellowed paper
    ctx.metalness(0.9); ctx.roughness(0.2); ctx.color("oklch(0.88 0.01 250)"); // silver cutlery
    tube(ctx, [[0.12, 0.93, 0.08], [0.16, 0.97, 0.19]], [0.005, 0.003], 6);
    return;
  }
  if (k === "armoire") { // Wikidot reference photo: tall dark antique wardrobe on the left with open doors, hanging white linen & silver tea service
    ctx.albedo(HARDWOOD); ctx.roughness(0.48); ctx.color("oklch(0.62 0.04 42)");
    // Carcass: sides, back, bottom, top crown
    slab(ctx, [-0.56, 1.15, 0], [0.025, 1.05, 0.30]); // left wall
    slab(ctx, [0.56, 1.15, 0], [0.025, 1.05, 0.30]);  // right wall
    slab(ctx, [0, 1.15, -0.28], [0.55, 1.05, 0.02]); // back panel
    slab(ctx, [0, 0.38, 0], [0.56, 0.025, 0.30]);    // bottom deck (above floodwater)
    slab(ctx, [0, 2.22, 0], [0.60, 0.035, 0.33]);    // top cornice slab
    slab(ctx, [0, 2.28, 0.02], [0.45, 0.03, 0.28]);  // decorative crown arch
    // Bracket feet standing in water
    for (const sx of [-0.54, 0.54]) for (const sz of [-0.26, 0.26]) {
      slab(ctx, [sx, 0.18, sz], [0.04, 0.18, 0.04]);
    }
    // Interior shelves
    slab(ctx, [0, 0.95, 0], [0.54, 0.018, 0.27]);
    slab(ctx, [0, 1.55, 0], [0.54, 0.018, 0.27]);
    // Left door swung open into room (~55 degrees)
    ctx.color("oklch(0.64 0.04 42)");
    slab(ctx, [-0.74, 1.18, 0.22], [0.24, 0.82, 0.018]);
    // Right door swung open (~40 degrees)
    slab(ctx, [0.72, 1.18, 0.18], [0.24, 0.82, 0.018]);
    // Draped white linen towel hanging over the left open door edge (exact from photo!)
    ctx.albedo(LINEN); ctx.roughness(0.9); ctx.color("oklch(0.94 0.01 92)");
    slab(ctx, [-0.74, 1.82, 0.22], [0.18, 0.015, 0.06]); // over the top edge
    slab(ctx, [-0.74, 1.48, 0.25], [0.17, 0.34, 0.012]); // draped down front
    slab(ctx, [-0.74, 1.52, 0.19], [0.17, 0.30, 0.012]); // draped down back
    // Antique silver tea service on bottom deck (y = 0.41)
    // Silver teapot with curved swan spout and C-handle
    ctx.albedo(null); ctx.metalness(0.88); ctx.roughness(0.18); ctx.color("oklch(0.85 0.01 250)");
    tube(ctx, [[-0.18, 0.41, 0.05], [-0.18, 0.44, 0.05], [-0.18, 0.52, 0.05], [-0.18, 0.56, 0.05]], [0.035, 0.065, 0.05, 0.025], M); // teapot body
    tube(ctx, [[-0.18, 0.56, 0.05], [-0.18, 0.585, 0.05]], [0.024, 0.008], M); // lid finial
    tube(ctx, [[-0.22, 0.45, 0.06], [-0.28, 0.51, 0.09], [-0.30, 0.54, 0.10]], [0.012, 0.008, 0.007], 6); // curved spout
    tube(ctx, [[-0.13, 0.52, 0.04], [-0.10, 0.48, 0.04], [-0.13, 0.43, 0.04]], [0.008, 0.007, 0.008], 6); // handle
    // Silver creamer & stacked porcelain saucers/cups next to teapot
    tube(ctx, [[-0.02, 0.41, 0.08], [-0.02, 0.47, 0.08]], [0.028, 0.036], M); // creamer
    ctx.metalness(0.1); ctx.roughness(0.3); ctx.color("oklch(0.92 0.02 90)"); // porcelain saucers
    tube(ctx, [[0.18, 0.41, 0.06], [0.18, 0.435, 0.06]], [0.065, 0.068], M);
    tube(ctx, [[0.18, 0.435, 0.06], [0.18, 0.49, 0.06]], [0.038, 0.042], M); // teacup on top
    // Stacked waterlogged books on middle shelf
    ctx.albedo(null); ctx.roughness(0.85); ctx.color("oklch(0.45 0.08 30)");
    slab(ctx, [-0.22, 0.99, 0.02], [0.12, 0.022, 0.16]);
    ctx.color("oklch(0.35 0.07 140)");
    slab(ctx, [-0.20, 1.03, 0.02], [0.11, 0.020, 0.15]);
    return;
  }
  if (k === "bouquet") { // Wikidot photo: large dried floral bouquet in ceramic vase sitting on sideboard
    // 1. Ceramic urn vase
    ctx.albedo(null); ctx.metalness(0.15); ctx.roughness(0.3); ctx.color("oklch(0.82 0.03 80)");
    tube(ctx, [[0, 0, 0], [0, 0.12, 0], [0, 0.28, 0], [0, 0.42, 0], [0, 0.48, 0]], [0.08, 0.14, 0.09, 0.06, 0.085], M);
    // 2. Dried hydrangeas & withered blooms in urn
    ctx.roughness(0.95);
    const blooms = [
      [0, 0.58, 0, 0.12, "oklch(0.48 0.07 35)"],      // dusty rose
      [-0.10, 0.62, 0.06, 0.095, "oklch(0.55 0.08 75)"], // dried amber
      [0.09, 0.60, -0.05, 0.09, "oklch(0.42 0.06 140)"], // sage leaf
      [-0.05, 0.70, -0.04, 0.085, "oklch(0.58 0.07 40)"], // dusty mauve
      [0.08, 0.72, 0.06, 0.075, "oklch(0.65 0.08 85)"],  // wheat
      [0, 0.80, 0.01, 0.065, "oklch(0.50 0.06 60)"],    // dried thistle
    ];
    for (const [bx, by, bz, br, col] of blooms) {
      ctx.color(col);
      sphere(ctx, [bx, by, bz], br, 8, [1.1, 0.9, 1.1]);
    }
    // Stalks and twigs
    ctx.color("oklch(0.36 0.05 60)");
    tube(ctx, [[0, 0.45, 0], [-0.14, 0.88, 0.08]], [0.008, 0.003], 6);
    tube(ctx, [[0, 0.45, 0], [0.15, 0.90, -0.06]], [0.008, 0.003], 6);
    return;
  }
  if (k === "chair") { // Wikidot photo: antique turned spindle-back chair standing in the floodwater
    ctx.albedo(HARDWOOD); ctx.roughness(0.55); ctx.color("oklch(0.35 0.06 48)");
    // 4 turned legs in water
    for (const sx of [-0.20, 0.20]) for (const sz of [-0.20, 0.20]) {
      tube(ctx, [[sx, 0.44, sz], [sx, 0, sz]], [0.024, 0.018], 6);
    }
    // Carved wooden seat
    slab(ctx, [0, 0.45, 0], [0.24, 0.018, 0.24]);
    // Spindle backrest: 2 side uprights + top curved rail + 3 spindles
    tube(ctx, [[-0.20, 0.45, -0.20], [-0.20, 0.92, -0.22]], [0.02, 0.016], 6);
    tube(ctx, [[0.20, 0.45, -0.20], [0.20, 0.92, -0.22]], [0.02, 0.016], 6);
    slab(ctx, [0, 0.90, -0.22], [0.23, 0.035, 0.015]); // top curved rail
    for (const sx of [-0.10, 0, 0.10]) {
      tube(ctx, [[sx, 0.46, -0.20], [sx, 0.87, -0.22]], [0.009, 0.007], 6);
    }
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
    ctx.albedo(HARDWOOD); ctx.roughness(0.55); ctx.color("oklch(0.63 0.06 50)");
    slab(ctx, [-0.04, 1.42, 0], [0.28, 0.05, 0.84]);
    // Turned wooden candlestick/finial on the mantel
    ctx.smooth(); ctx.color("oklch(0.45 0.08 55)");
    tube(ctx, [[-0.08, 1.47, -0.35], [-0.08, 1.62, -0.35], [-0.08, 1.78, -0.35]], [0.065, 0.03, 0.075], M);
    return;
  }
}
