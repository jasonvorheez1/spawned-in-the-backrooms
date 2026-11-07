// Melee weapons lying on the carpet, one silhouette each, laid along +Z. params.kind picks which.
import { tube, slab, prism } from "./lib/shapes.js";
import W from "./lib/data/weapons.yml";

const WOOD = "oklch(0.5 0.08 60)", STEEL = "oklch(0.62 0.02 250)", RUST = "oklch(0.45 0.09 45)", TAPE = "oklch(0.22 0.02 80)";
const Y = 0.04;

const builders = {
  table_leg(ctx, M) {
    ctx.roughness(0.8); ctx.color(WOOD);
    tube(ctx, [[0, Y, 0], [0, Y, 0.3], [0, Y, 0.62], [0, Y, 0.7]], [0.034, 0.03, 0.026, 0.02], M, [1, 1], 0.08, 2);
    ctx.color("oklch(0.7 0.02 250)"); ctx.metalness(0.8); ctx.roughness(0.4);
    slab(ctx, [0, Y, 0.02], [0.05, 0.012, 0.03]);   // the bracket it was torn from
    ctx.metalness(0);
  },
  pipe_scrap(ctx, M) {
    ctx.roughness(0.55); ctx.metalness(0.7); ctx.color(STEEL);
    tube(ctx, [[0, Y, 0], [0, Y, 0.4], [0, Y, 0.8]], [0.032, 0.03, 0.03], M);
    ctx.color(RUST);
    tube(ctx, [[0, Y, 0.18], [0, Y, 0.3]], [0.034, 0.034], M);
    ctx.color("oklch(0.5 0.02 250)");
    tube(ctx, [[0, Y, 0.78], [0, Y, 0.8], [0, Y, 0.82]], [0.05, 0.05, 0.05], M); // flange
    ctx.metalness(0);
  },
  crowbar(ctx, M) {
    ctx.roughness(0.45); ctx.metalness(0.85); ctx.color("oklch(0.34 0.03 260)");
    tube(ctx, [[0, Y, 0.06], [0, Y, 0.45], [0, Y, 0.78]], [0.02, 0.02, 0.02], M);
    tube(ctx, [[0, Y, 0.78], [0, Y + 0.04, 0.9], [0, Y + 0.1, 0.94], [0, Y + 0.17, 0.9]], [0.02, 0.019, 0.016, 0.01], M); // the hook
    prism(ctx, [[-0.03, 0], [0.03, 0], [0.02, 0.09], [-0.02, 0.09]], Y - 0.012, Y + 0.012); // chisel end
    ctx.color(RUST);
    tube(ctx, [[0, Y, 0.3], [0, Y, 0.4]], [0.0215, 0.0215], M);
    ctx.metalness(0);
  },
  bat(ctx, M) {
    ctx.roughness(0.7); ctx.color("oklch(0.68 0.08 70)");
    tube(ctx, [[0, Y, 0], [0, Y, 0.12], [0, Y, 0.4], [0, Y, 0.72], [0, Y, 0.9], [0, Y, 0.98], [0, Y, 1.0]], [0.032, 0.02, 0.03, 0.046, 0.05, 0.04, 0.01], M);
    ctx.color(TAPE);
    tube(ctx, [[0, Y, 0.02], [0, Y, 0.28]], [0.024, 0.022], M); // taped grip
    ctx.color("oklch(0.4 0.1 30)");
    tube(ctx, [[0, Y, 0.78], [0, Y, 0.8]], [0.051, 0.051], M); // dried stain
  },
  hatchet(ctx, M) {
    ctx.roughness(0.7); ctx.color(WOOD);
    tube(ctx, [[0, Y, 0], [0, Y, 0.3], [0, Y, 0.62], [0, Y, 0.75]], [0.026, 0.02, 0.022, 0.026], M);
    ctx.roughness(0.3); ctx.metalness(0.9); ctx.color("oklch(0.7 0.02 250)");
    slab(ctx, [0, Y + 0.0, 0.7], [0.03, 0.03, 0.05]);                      // the eye
    prism(ctx, [[0.03, 0.64], [0.2, 0.58], [0.2, 0.84], [0.03, 0.76]], Y - 0.012, Y + 0.012); // the blade
    ctx.color("oklch(0.92 0.01 250)");
    prism(ctx, [[0.19, 0.58], [0.21, 0.575], [0.21, 0.845], [0.19, 0.84]], Y - 0.006, Y + 0.006); // the edge
    ctx.metalness(0);
  },
  fire_axe(ctx, M) {
    ctx.roughness(0.45); ctx.color("oklch(0.5 0.2 25)");
    tube(ctx, [[0, Y, 0], [0, Y, 0.45], [0, Y, 0.9], [0, Y, 1.0]], [0.028, 0.024, 0.026, 0.03], M);
    ctx.metalness(0.9); ctx.roughness(0.3); ctx.color("oklch(0.72 0.02 250)");
    slab(ctx, [0, Y, 0.92], [0.034, 0.034, 0.06]);
    prism(ctx, [[0.03, 0.82], [0.26, 0.74], [0.26, 1.08], [0.03, 1.02]], Y - 0.014, Y + 0.014); // the blade
    prism(ctx, [[-0.03, 0.9], [-0.2, 0.93], [-0.03, 0.96]], Y - 0.012, Y + 0.012);              // the pick
    ctx.color("oklch(0.93 0.01 250)");
    prism(ctx, [[0.25, 0.74], [0.27, 0.735], [0.27, 1.085], [0.25, 1.08]], Y - 0.007, Y + 0.007);
    ctx.metalness(0);
  },
  pistol(ctx) {
    ctx.roughness(0.35); ctx.metalness(0.8); ctx.color("oklch(0.28 0.02 260)");
    slab(ctx, [0, Y + 0.03, 0.15], [0.016, 0.022, 0.12]);   // the slide
    ctx.color("oklch(0.2 0.02 260)");
    slab(ctx, [0, Y + 0.012, 0.06], [0.014, 0.012, 0.05]);  // the frame
    ctx.metalness(0); ctx.roughness(0.8); ctx.color("oklch(0.18 0.01 60)");
    prism(ctx, [[-0.016, 0.0], [0.016, 0.0], [0.016, -0.05], [-0.016, -0.08]], Y - 0.04, Y + 0.02); // the grip
  },
};

export function geometry(ctx) {
  const kind = W[ctx.params?.kind] ? ctx.params.kind : "table_leg", M = ctx.lod <= 2 ? 10 : 6;
  (builders[kind] ?? builders.table_leg)(ctx, M);
  ctx.color(null);
}
export function collider() { return null; }
