// Props you can search: a supply crate (params.kind "crate") and a slumped body (params.kind "lurker" | "smiler").
import { tube, sphere, face } from "./lib/shapes.js";

export function geometry(ctx) {
  const kind = ctx.params?.kind ?? "crate", hi = ctx.lod <= 2;
  if (kind === "crate") {
    ctx.flat(); ctx.roughness(0.9);
    const box = (x0, y0, z0, x1, y1, z1) => {
      const p = (x, y, z) => [x, y, z];
      face(ctx, p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), [0, 0, 1]);
      face(ctx, p(x1, y0, z0), p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0), [0, 0, -1]);
      face(ctx, p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0), [-1, 0, 0]);
      face(ctx, p(x1, y0, z1), p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), [1, 0, 0]);
      face(ctx, p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0), p(x0, y1, z0), [0, 1, 0]);
      face(ctx, p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), [0, -1, 0]);
    };
    const W = 0.35, D = 0.275, H = 0.5;
    ctx.color("oklch(0.56 0.07 68)"); box(-W, 0, -D, W, H - 0.06, D);       // body
    ctx.color("oklch(0.48 0.07 64)"); box(-W - 0.012, H - 0.06, -D - 0.012, W + 0.012, H, D + 0.012); // lid
    ctx.color("oklch(0.4 0.03 250)");                                          // metal straps
    for (const x of [-0.24, 0.24]) box(x - 0.025, 0, -D - 0.014, x + 0.025, H, D + 0.014);
    ctx.color("oklch(0.82 0.1 85)"); box(-0.035, H - 0.2, D, 0.035, H - 0.14, D + 0.02); // latch
    return;
  }
  if (kind === "sack") { // a dropped canvas duffel lying on its side: a rounded tube, end caps, two straps and a zip line
    ctx.smooth(); ctx.roughness(0.95); const M = hi ? 14 : 7;
    ctx.color("oklch(0.5 0.05 95)");
    tube(ctx, [[-0.3, 0.13, 0], [-0.26, 0.15, 0.01], [0, 0.16, 0], [0.26, 0.15, -0.01], [0.3, 0.13, 0]], [0.02, 0.13, 0.15, 0.13, 0.02], M, [1, 0.8]);
    ctx.color("oklch(0.3 0.03 80)");
    for (const x of [-0.12, 0.12]) tube(ctx, [[x, 0.005, -0.16], [x, 0.13, -0.175], [x, 0.29, 0], [x, 0.13, 0.175], [x, 0.005, 0.16]], [0.012, 0.012, 0.012, 0.012, 0.012], 5);
    if (hi) { ctx.color("oklch(0.25 0.01 250)"); tube(ctx, [[-0.22, 0.285, -0.03], [0.22, 0.285, -0.03]], [0.006, 0.006], 4); tube(ctx, [[0.0, 0.29, -0.03], [-0.02, 0.36, 0.05], [0.02, 0.4, 0.12]], [0.01, 0.01, 0.01], 5); } // zip and a carry handle flopped over
    return;
  }
  // a body, seen from above: slumped torso, head, limbs splayed. The head end points -Z.
  ctx.smooth(); ctx.roughness(0.7);
  const lurker = kind === "lurker";
  const SKIN = lurker ? "oklch(0.78 0.03 80)" : "oklch(0.3 0.05 300)", SHADE = lurker ? "oklch(0.7 0.035 70)" : "oklch(0.22 0.05 300)";
  const M = hi ? 12 : 7;
  ctx.color(SKIN);
  tube(ctx, [[0, 0.07, -0.05], [0, 0.09, 0.2], [0.02, 0.07, 0.5]], [0.1, 0.13, 0.09], M, [1, 0.6]); // torso
  sphere(ctx, [0, 0.09, -0.3], lurker ? 0.1 : 0.14, M, [1, 0.8, 1]);                                   // head
  ctx.color(SHADE);
  const arm = (s, reach) => tube(ctx, [[s * 0.1, 0.05, 0.02], [s * 0.3, 0.035, -0.05 + reach * 0.4], [s * 0.5, 0.025, reach]], [0.035, 0.028, 0.02], 6);
  arm(-1, lurker ? 0.3 : 0.1); arm(1, lurker ? -0.15 : 0.2);
  const leg = (s, bend) => tube(ctx, [[s * 0.06, 0.05, 0.5], [s * 0.14, 0.04, 0.82], [s * (0.14 + bend), 0.03, 1.1]], [0.05, 0.04, 0.03], 6);
  leg(-1, 0.1); leg(1, -0.1);
  if (lurker && hi) { ctx.color("oklch(0.18 0.02 40)"); for (const s of [-1, 1]) sphere(ctx, [s * 0.04, 0.12, -0.38], 0.022, 6); }
}
