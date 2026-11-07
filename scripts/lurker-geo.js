// A lurker: tall, pale, hairless, ribs under the skin, arms that reach past its knees and a smooth
// head with two sunken hollows where eyes should be. Rigged for a stalking walk. Faces -Z.
import { tube, sphere } from "./lib/shapes.js";

export function skeleton() {
  return {
    hips: { pivot: [0, 0.98, 0] },
    spine: { parent: "hips", pivot: [0, 1.1, 0] },
    neck: { parent: "spine", pivot: [0, 1.76, -0.14] },
    head: { parent: "neck", pivot: [0, 1.88, -0.22] },
    armL: { parent: "spine", pivot: [-0.21, 1.7, -0.11] }, foreL: { parent: "armL", pivot: [-0.3, 1.18, -0.1] },
    armR: { parent: "spine", pivot: [0.21, 1.7, -0.11] }, foreR: { parent: "armR", pivot: [0.3, 1.18, -0.1] },
    thighL: { parent: "hips", pivot: [-0.11, 0.98, 0] }, shinL: { parent: "thighL", pivot: [-0.11, 0.5, 0.01] },
    thighR: { parent: "hips", pivot: [0.11, 0.98, 0] }, shinR: { parent: "thighR", pivot: [0.11, 0.5, 0.01] },
  };
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 20 : 9, LM = hi ? 12 : 6;
  ctx.smooth(); ctx.roughness(0.62);
  const SKIN = "oklch(0.84 0.03 80)", SHADE = "oklch(0.78 0.035 70)", DARK = "oklch(0.2 0.02 40)";
  const close = (pts, rads) => { // a tube closed at both ends
    const s = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t), n = pts.length;
    return [[s(pts[0], pts[1], -0.08), ...pts, s(pts[n - 1], pts[n - 2], -0.08)], [1e-4, ...rads, 1e-4]];
  };
  const T = (pts, rads, m = LM, sq) => { const [P, R] = close(pts, rads); tube(ctx, P, R, m, sq); };
  ctx.color(SKIN);
  for (const s of [-1, 1]) {
    const L = s < 0 ? "L" : "R", x = s * 0.11;
    ctx.bone("thigh" + L); T([[x * 0.7, 1.06, 0], [x, 0.98, 0], [x * 1.08, 0.85, -0.015], [x * 1.04, 0.66, -0.01], [x, 0.52, 0.0]], [0.09, 0.09, 0.08, 0.06, 0.05]);
    ctx.bone({ ["thigh" + L]: 0.5, ["shin" + L]: 0.5 }); sphere(ctx, [x, 0.5, -0.012], 0.054, LM, [1, 1, 1.1]); // knobby knee
    ctx.bone("shin" + L);
    T([[x, 0.5, 0.01], [x, 0.38, 0.03], [x, 0.2, 0.025], [x, 0.07, 0.02]], [0.045, 0.05, 0.035, 0.03]); // calf bulge
    sphere(ctx, [x * 1.15, 0.07, 0.02], 0.026, LM); // ankle bone
    T([[x, 0.05, 0.05], [x, 0.03, -0.04], [x * 1.08, 0.02, -0.14], [x * 1.1, 0.012, -0.2]], [0.035, 0.034, 0.025, 0.012], LM, [1.3, 0.6]); // long foot
    if (hi) for (let t = -1; t <= 1; t++) T([[x * 1.1 + t * 0.016, 0.012, -0.19], [x * 1.1 + t * 0.022, 0.006, -0.24]], [0.008, 0.003], 5); // toes
  }
  ctx.bone("hips");
  T([[0, 0.86, 0.01], [0, 0.95, 0.0], [0, 1.06, -0.01], [0, 1.14, -0.02]], [0.11, 0.15, 0.13, 0.105], M, [1, 0.72]); // pelvis
  ctx.bone("spine");
  T([[0, 1.1, -0.015], [0, 1.25, -0.03], [0, 1.42, -0.07], [0, 1.6, -0.12], [0, 1.72, -0.15]], [0.1, 0.11, 0.165, 0.19, 0.12], M, [1, 0.6]); // sunken belly, deep chest
  if (hi) { // ribs, sternum and the knuckled spine
    ctx.color(SHADE);
    for (let r = 0; r < 6; r++) { const y = 1.36 + r * 0.05, f = 0.17 - Math.abs(r - 2) * 0.006; tube(ctx, [[-f, y - 0.03, -0.06 - r * 0.012], [-f * 0.6, y, -0.16 - r * 0.012], [0, y + 0.02, -0.19 - r * 0.012], [f * 0.6, y, -0.16 - r * 0.012], [f, y - 0.03, -0.06 - r * 0.012]], [0.005, 0.008, 0.004, 0.008, 0.005], 6); }
    for (let v = 0; v < 9; v++) { const t = v / 8; sphere(ctx, [0, 1.12 + t * 0.6, 0.1 - t * 0.12 + Math.sin(t * 3.1) * 0.03], 0.02, 6); }
    ctx.color(SKIN);
  }
  for (const s of [-1, 1]) { sphere(ctx, [s * 0.19, 1.68, -0.12], 0.06, LM); T([[s * 0.04, 1.73, -0.17], [s * 0.19, 1.7, -0.13]], [0.02, 0.016], 6); } // shoulders, collarbones
  ctx.bone("neck"); T([[0, 1.7, -0.12], [0, 1.82, -0.18], [0, 1.92, -0.23]], [0.055, 0.042, 0.05]);
  ctx.bone("head");
  sphere(ctx, [0, 2.02, -0.27], 0.15, M, [0.8, 1.15, 0.95]); // cranium
  sphere(ctx, [0, 1.92, -0.3], 0.075, M, [0.9, 0.9, 1]); // long jaw, tucked under the skull
  if (ctx.lod <= 3) {
    T([[-0.08, 2.07, -0.36], [0, 2.075, -0.392], [0.08, 2.07, -0.36]], [0.014, 0.018, 0.014], 8, [1, 0.6]); // brow ridge
    for (const s of [-1, 1]) sphere(ctx, [s * 0.075, 1.985, -0.335], 0.026, 8, [1, 0.55, 1]); // cheekbones
    ctx.color(DARK); ctx.roughness(1);
    for (const s of [-1, 1]) sphere(ctx, [s * 0.048, 2.03, -0.375], 0.03, hi ? 10 : 6, [1.3, 0.8, 0.3]); // eye hollows
    T([[-0.04, 1.905, -0.358], [0, 1.9, -0.372], [0.04, 1.905, -0.358]], [0.005, 0.007, 0.005], 6); // lipless mouth
    ctx.color(SKIN); ctx.roughness(0.62);
  }
  for (const s of [-1, 1]) {
    const L = s < 0 ? "L" : "R";
    ctx.bone("arm" + L); T([[s * 0.21, 1.7, -0.11], [s * 0.25, 1.52, -0.11], [s * 0.29, 1.2, -0.1]], [0.05, 0.044, 0.032]);
    ctx.bone({ ["arm" + L]: 0.5, ["fore" + L]: 0.5 }); sphere(ctx, [s * 0.3, 1.18, -0.1], 0.036, LM);
    ctx.bone("fore" + L); T([[s * 0.3, 1.18, -0.1], [s * 0.32, 0.9, -0.07], [s * 0.33, 0.62, -0.04], [s * 0.33, 0.38, -0.02]], [0.032, 0.036, 0.026, 0.02]);
    sphere(ctx, [s * 0.33, 0.33, -0.02], 0.038, LM, [0.6, 1.3, 1]); // narrow palm
    if (ctx.lod <= 3) for (let f = -2; f <= 1; f++) { // long jointed fingers, curled
      const x0 = s * (0.33 + f * 0.01), z0 = -0.02 + f * 0.012;
      T([[x0, 0.29, z0], [s * (0.335 + f * 0.016), 0.19, z0 + 0.005], [s * (0.34 + f * 0.02), 0.1, z0 + 0.02], [s * (0.34 + f * 0.022), 0.04, z0 + 0.05]], [0.01, 0.008, 0.006, 0.002], hi ? 6 : 4);
      if (hi) { ctx.color(DARK); sphere(ctx, [s * (0.34 + f * 0.022), 0.04, z0 + 0.05], 0.004, 4); ctx.color(SKIN); }
    }
  }
  ctx.bone(null); ctx.color(null);
}
export function collider() { return { kind: "capsule", radius: 0.34, halfHeight: 0.8, center: [0, 1.0, 0] }; }
