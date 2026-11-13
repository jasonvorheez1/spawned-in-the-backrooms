// Searchable soft and wall-hung loot furniture (params.kind from data/furniture-loot.yml): backpack, duffel, satchel,
// shelfbin, fuse. Feet at the bottom centre (fuse: the box's bottom), front faces -Z, back flush at +Z against the wall.
import { slab, tube, rounded } from "./lib/shapes.js";
import D from "./lib/data/furniture-loot.yml";
const CANVAS = "cdn/texture-worn-canvas-fabric.png", STEEL = "cdn/texture-scratched-worn-steel.png";
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const pick = (a, s) => a[Math.abs(Math.floor(s)) % a.length];
const strap = (ctx, pts, r = 0.012) => tube(ctx, pts, pts.map(() => r), 6, [1.6, 0.6], 0, 1, 2);

export function geometry(ctx) {
  const p = ctx.params ?? {}, kind = p.kind ?? "backpack", sd = p.seed ?? 0;
  const [w, h, d] = D.kinds[kind]?.size ?? [0.5, 0.5, 0.5], X = w / 2, Z = d / 2, F = -Z - 0.01;
  ctx.roughness(0.85); ctx.metalness(0);
  if (kind === "backpack" || kind === "duffel" || kind === "satchel") ctx.smooth();
  if (kind === "backpack") { // slumped against the wall, top flap open a crack
    ctx.albedo(CANVAS); ctx.color(pick(["oklch(0.5 0.07 145)", "oklch(0.42 0.06 250)", "oklch(0.55 0.12 35)", "oklch(0.35 0.02 60)"], sd));
    tube(ctx, [[0, 0, 0.02], [0, 0.04, 0.0], [0, h * 0.45, -0.01], [0, h * 0.85, 0.02], [0, h, 0.04]], [0.13, X * 0.95, X, X * 0.85, 0.05], 14, [1, Z / X]);
    tube(ctx, [[0, 0.05, -Z * 0.7], [0, 0.16, -Z - 0.04], [0, 0.26, -Z * 0.75]], [0.05, 0.11, 0.05], 10, [1.2, 0.6]); // front pocket
    tube(ctx, [[0, h * 0.7, -Z * 0.9], [0, h + 0.02, -0.02], [0, h * 0.85, Z * 0.6]], [0.05, 0.08, 0.06], 10, [2.2, 0.5]); // lid flap
    ctx.albedo(null); ctx.color("oklch(0.18 0.01 60)");
    for (const s of [-1, 1]) strap(ctx, [[s * X * 0.5, h * 0.9, Z * 0.8], [s * X * 0.6, h * 0.5, Z + 0.06], [s * X * 0.55, 0.1, Z * 0.9]]);
    ctx.color("oklch(0.7 0.01 250)"); ctx.metalness(0.7); box(ctx, -0.02, 0.02, h * 0.62, h * 0.7, -Z - 0.03, -Z - 0.01);
  } else if (kind === "duffel" || kind === "satchel") {
    const sat = kind === "satchel";
    ctx.albedo(CANVAS); ctx.color(sat ? pick(["oklch(0.45 0.05 70)", "oklch(0.38 0.04 50)"], sd) : pick(["oklch(0.3 0.03 250)", "oklch(0.45 0.08 140)", "oklch(0.25 0.01 0)"], sd));
    const len = sat ? 0.42 : X, r = sat ? 0.11 : h * 0.5;
    tube(ctx, [[-len, r * 0.8, 0], [-len * 0.5, r, 0.0], [len * 0.5, r, 0], [len, r * 0.8, 0]], [0.03, r, r, 0.03], 14, [1, sat ? 1 : Z / r * 0.9]);
    ctx.albedo(null); ctx.color("oklch(0.15 0.01 60)");
    strap(ctx, [[-len * 0.35, r * 1.8, 0], [-len * 0.4, r * 2.2, 0.02], [len * 0.4, r * 2.2, 0.02], [len * 0.35, r * 1.8, 0]], 0.014); // handles
    ctx.color("oklch(0.65 0.01 250)"); ctx.metalness(0.7); strap(ctx, [[-len * 0.8, r * 1.95, -0.02], [len * 0.8, r * 1.95, -0.02]], 0.006); // zip
    if (sat) { // the worker who carried it: a hi-vis vest and hard hat left slumped at the wall, a lamp spilled
      ctx.metalness(0); ctx.albedo(CANVAS); ctx.color("oklch(0.82 0.17 95)");
      tube(ctx, [[0.3, 0.02, Z - 0.05], [0.31, 0.18, Z - 0.1], [0.33, 0.36, Z - 0.06]], [0.15, 0.17, 0.13], 12, [1.2, 0.7]);
      ctx.albedo(null); ctx.color("oklch(0.75 0.16 70)"); tube(ctx, [[0.05, 0, -Z + 0.12], [0.05, 0.1, -Z + 0.12]], [0.12, 0.11], 12, [1, 1.1]);
      ctx.color("oklch(0.2 0.01 250)"); box(ctx, -0.35, -0.2, 0, 0.05, -Z + 0.02, -Z + 0.12);
      ctx.color("oklch(0.95 0.1 90)"); ctx.emissive?.("oklch(0.9 0.12 90)"); box(ctx, -0.36, -0.35, 0.005, 0.045, -Z + 0.03, -Z + 0.11); ctx.emissive?.(null);
    }
  } else if (kind === "shelfbin") { // a steel stacking bin with a label slot and lip
    ctx.albedo(STEEL); ctx.metalness(0.5); ctx.roughness(0.6); ctx.color(pick(["oklch(0.55 0.13 250)", "oklch(0.6 0.15 55)", "oklch(0.5 0.03 250)"], sd));
    box(ctx, -X, X, 0, 0.02, -Z, Z);
    box(ctx, -X, -X + 0.015, 0, h, -Z, Z); box(ctx, X - 0.015, X, 0, h, -Z, Z); box(ctx, -X, X, 0, h, Z - 0.015, Z);
    box(ctx, -X, X, 0, h * 0.55, -Z, -Z + 0.015); // low front lip, a hopper mouth
    for (const s of [-1, 1]) box(ctx, s * X - 0.01, s * X + 0.01, h - 0.02, h, -Z, Z);
    ctx.albedo(null); ctx.color("oklch(0.92 0.02 90)"); ctx.metalness(0); box(ctx, -0.09, 0.09, h * 0.2, h * 0.42, F, -Z);
    ctx.color("oklch(0.45 0.05 70)"); for (let i = 0; i < 3; i++) box(ctx, -X + 0.06 + i * 0.16, -X + 0.18 + i * 0.16, 0.02, 0.1 + (i % 2) * 0.05, -Z + 0.08, Z - 0.08); // parts inside
  } else if (kind === "fuse") { // wall-hung steel fuse cabinet: rolled edges, hinged door with louvres, latch, warning sticker, flex conduits curving into the floor
    const R = (x0, x1, y0, y1, z0, z1, r) => rounded(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2], r);
    ctx.albedo(STEEL); ctx.metalness(0.45); ctx.roughness(0.62); ctx.color(pick(["oklch(0.6 0.015 220)", "oklch(0.56 0.03 150)", "oklch(0.62 0.01 90)"], sd));
    R(-X, X, 0, h, -Z + 0.012, Z, 0.022); // the body, edges rolled like pressed sheet steel
    ctx.color("oklch(0.57 0.015 220)"); R(-X + 0.025, X - 0.025, 0.025, h - 0.025, -Z - 0.004, -Z + 0.02, 0.012); // door, a hair proud of the body
    ctx.albedo(null); ctx.color("oklch(0.18 0.005 220)"); // louvre slots, top and bottom
    for (const y0 of [h - 0.16, 0.08]) for (let i = 0; i < 4; i++) { const y = y0 + i * 0.022; tube(ctx, [[-0.12, y, -Z - 0.006], [0.12, y, -Z - 0.006]], [0.006, 0.006], 6, [1, 0.5], 0, 1, 1); }
    ctx.color("oklch(0.72 0.01 250)"); ctx.metalness(0.85); ctx.roughness(0.35);
    tube(ctx, [[-X + 0.02, 0.06, -Z - 0.006], [-X + 0.02, h - 0.06, -Z - 0.006]], [0.008, 0.008], 8, [1, 1], 0, 1, 1); // piano hinge
    R(X - 0.085, X - 0.05, h * 0.44, h * 0.6, -Z - 0.03, -Z - 0.004, 0.008); // latch handle
    tube(ctx, [[X - 0.068, h * 0.47, -Z - 0.03], [X - 0.068, h * 0.47, -Z - 0.05]], [0.009, 0.009], 8, [1, 1], 0, 1, 1); // padlock eye
    ctx.color("oklch(0.62 0.12 85)"); ctx.metalness(0.7); R(X - 0.09, X - 0.045, h * 0.36, h * 0.44, -Z - 0.065, -Z - 0.04, 0.01); // brass padlock hanging
    ctx.metalness(0); ctx.roughness(0.8);
    ctx.color("oklch(0.85 0.17 95)"); tube(ctx, [[0, h * 0.66, -Z - 0.007], [0, h * 0.66 + 0.001, -Z - 0.007]], [0.075, 0.075], 3, [1, 1], 0, 1, 1); // hazard triangle
    ctx.color("oklch(0.12 0 0)"); R(-0.008, 0.008, h * 0.645, h * 0.69, -Z - 0.011, -Z - 0.007, 0.003);
    ctx.color("oklch(0.93 0.01 90)"); R(-0.1, 0.06, h * 0.52, h * 0.57, -Z - 0.008, -Z - 0.005, 0.003); // a stencilled circuit label
    ctx.color("oklch(0.32 0.06 45)"); R(-X + 0.03, X - 0.03, 0.004, 0.03, -Z - 0.007, -Z - 0.002, 0.004); // rust bloom along the door's bottom lip
    ctx.color("oklch(0.25 0.01 250)"); ctx.metalness(0.4); ctx.roughness(0.7);
    for (const [i, s] of [-0.17, 0, 0.17].entries()) { // flexible conduit out of a gland, bowing off the wall before it dives to the floor
      const zb = Z - 0.04 - i * 0.008;
      tube(ctx, [[s, 0.01, zb], [s, -0.05, zb - 0.01], [s + 0.01, -0.3, zb - 0.025 - i * 0.01], [s - 0.01, -0.55, zb - 0.02], [s, -0.68, zb]], [0.018, 0.016, 0.016, 0.016, 0.02], 8, [1, 1], 0.002, sd + i, 3);
      ctx.metalness(0.8); ctx.color("oklch(0.7 0.01 250)"); tube(ctx, [[s, 0.012, zb], [s, -0.03, zb]], [0.024, 0.024], 8, [1, 1], 0, 1, 1); ctx.metalness(0.4); ctx.color("oklch(0.25 0.01 250)");
    }
  }
  ctx.metalness(0); ctx.albedo(null); ctx.color(null);
}
