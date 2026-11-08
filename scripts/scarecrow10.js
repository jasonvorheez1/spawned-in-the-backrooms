// Level 10 "Bumper Crop": Anomalous Scarecrows (Entity 17 / The Watchers).
// Wooden cross stake, stuffed burlap coat, straw stuffing, stitched burlap head, and ragged straw hat.
const WOOD = "cdn/texture-worn-hardwood-grain.png";
const BURLAP = "cdn/texture-burlap-sack-weave.png";
const CANVAS = "cdn/texture-rough-canvas-fabric.png";

function box(ctx, x0, y0, z0, x1, y1, z1) {
  const q = (a, b, c, d) => ctx.quad(a, b, c, d);
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
  q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}

// a surface of revolution about a vertical axis: rings [[y, r], ...], squash x/z, wobble for rag
function lathe(ctx, cx, cz, rings, sides, sx = 1, sz = 1, wob = 0, seed = 0) {
  const P = rings.map(([y, r], i) => Array.from({ length: sides }, (_, j) => { const a = (j / sides) * 6.2832, w = 1 + wob * Math.sin(a * 3 + seed + i * 1.7) * Math.sin(a * 5 + i);
    return [cx + Math.cos(a) * r * sx * w, y, cz + Math.sin(a) * r * sz * w]; }));
  for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < sides; j++) { const k = (j + 1) % sides; ctx.quad(...P[i][j], ...P[i][k], ...P[i + 1][k], ...P[i + 1][j]); }
  const top = rings[rings.length - 1], bot = rings[0];
  if (top[1] > 0.001) for (let j = 0; j < sides; j++) ctx.tri(...P[P.length - 1][j], ...P[P.length - 1][(j + 1) % sides], cx, top[0], cz);
  if (bot[1] > 0.001) for (let j = 0; j < sides; j++) ctx.tri(...P[0][(j + 1) % sides], ...P[0][j], cx, bot[0], cz);
}
// a tube along x (sleeves, arm beam): rings [[x, r], ...] at height y, sagging dy at the middle
function tubeX(ctx, y, z, rings, sides, sag = 0) {
  const n = rings.length, P = rings.map(([x, r], i) => { const t = i / (n - 1), yy = y - sag * Math.sin(t * 3.1416); return Array.from({ length: sides }, (_, j) => { const a = (j / sides) * 6.2832; return [x, yy + Math.cos(a) * r, z + Math.sin(a) * r]; }); });
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) { const k = (j + 1) % sides; ctx.quad(...P[i][j], ...P[i + 1][j], ...P[i + 1][k], ...P[i][k]); }
}
// a straw tuft: a fan of thin blades from a point
function tuft(ctx, x, y, z, dx, dy, dz, n, len, seed) {
  for (let i = 0; i < n; i++) { const r = (k) => { const v = Math.sin((seed + i) * 12.9898 + k * 78.233) * 43758.5; return v - Math.floor(v) - 0.5; };
    const ex = x + (dx + r(1) * 0.9) * len, ey = y + (dy + r(2) * 0.9) * len, ez = z + (dz + r(3) * 0.9) * len, w = 0.008;
    ctx.tri(x - w, y, z, x + w, y, z, ex, ey, ez); ctx.tri(x, y, z - w, x, y, z + w, ex, ey, ez); }
}
export function geometry(ctx) {
  const lod = ctx.lod ?? 1, S = lod <= 2 ? 12 : lod <= 3 ? 8 : 5;
  ctx.roughness(0.95); ctx.smooth?.();
  // the stake: a split, slightly leaning pole and a cross arm under the sleeves
  ctx.albedo(WOOD); ctx.color("oklch(0.4 0.035 60)");
  lathe(ctx, 0, 0.02, [[0, 0.06], [1.2, 0.052], [2.05, 0.045], [2.08, 0]], Math.max(5, S - 4));
  tubeX(ctx, 1.5, 0.0, [[-0.72, 0.035], [0, 0.04], [0.72, 0.035]], Math.max(5, S - 4));
  // the coat: slumped, wider at the hem, belted with twine, hanging off the frame
  ctx.albedo(CANVAS); ctx.color("oklch(0.36 0.06 38)");
  lathe(ctx, 0, 0, [[0.78, 0.25], [0.86, 0.29], [1.05, 0.26], [1.25, 0.24], [1.45, 0.25], [1.55, 0.2], [1.6, 0.08]], S, 1.15, 0.72, 0.09, 2);
  ctx.color("oklch(0.55 0.06 80)"); lathe(ctx, 0, 0, [[1.06, 0.272], [1.1, 0.272]], S, 1.15, 0.72);
  // sleeves: baggy, tapering to ragged cuffs, sagging a little off the beam
  ctx.albedo(CANVAS); ctx.color("oklch(0.34 0.06 36)");
  tubeX(ctx, 1.47, 0, [[-0.66, 0.075], [-0.5, 0.1], [-0.3, 0.12], [-0.18, 0.11]], S, 0.03);
  tubeX(ctx, 1.47, 0, [[0.18, 0.11], [0.3, 0.12], [0.5, 0.1], [0.66, 0.075]], S, 0.03);
  // a patch on the chest
  ctx.color("oklch(0.5 0.07 120)"); ctx.quad(0.04, 1.2, -0.215, 0.18, 1.2, -0.2, 0.18, 1.34, -0.2, 0.04, 1.34, -0.215);
  // the head: a sack stuffed round, cinched with twine at the neck, the loose top flopped
  ctx.albedo(BURLAP); ctx.color("oklch(0.72 0.05 75)");
  lathe(ctx, 0, 0, [[1.58, 0.05], [1.62, 0.07], [1.67, 0.15], [1.76, 0.18], [1.86, 0.165], [1.93, 0.12], [1.97, 0.04]], S, 1, 0.95, 0.06, 5);
  ctx.albedo(null); ctx.color("oklch(0.5 0.05 70)"); lathe(ctx, 0, 0, [[1.61, 0.075], [1.635, 0.075]], S);
  // stitched face: X eyes and a sewn grin, on the sack's front curve
  ctx.color("oklch(0.18 0.01 250)");
  const fz = -0.168, st = (x0, y0, x1, y1) => { const w = 0.006; ctx.quad(x0 - w, y0, fz, x1 - w, y1, fz, x1 + w, y1, fz, x0 + w, y0, fz); };
  for (const ex of [-0.065, 0.065]) { st(ex - 0.025, 1.8, ex + 0.025, 1.84); st(ex - 0.025, 1.84, ex + 0.025, 1.8); }
  for (let k = 0; k < 6; k++) { const x0 = -0.08 + k * 0.032, y0 = 1.705 + Math.sin(k * 0.6) * 0.004; st(x0, y0, x0 + 0.032, y0 - 0.006 + (k % 2) * 0.012); st(x0 + 0.016, y0 - 0.02, x0 + 0.016, y0 + 0.02); }
  // the hat: a floppy brim drooping at the sides, a dented crown
  ctx.albedo(CANVAS); ctx.color("oklch(0.68 0.08 82)");
  const B = 18, br = []; for (let j = 0; j < B; j++) { const a = (j / B) * 6.2832; br.push([Math.cos(a), Math.sin(a), a]); }
  for (let j = 0; j < B; j++) { const [c0, s0, a0] = br[j], [c1, s1, a1] = br[(j + 1) % B], d = (a) => 1.94 - 0.05 * Math.abs(Math.cos(a)) - 0.02 * Math.sin(a * 3);
    ctx.quad(c0 * 0.17, 1.96, s0 * 0.17, c1 * 0.17, 1.96, s1 * 0.17, c1 * 0.34, d(a1), s1 * 0.34, c0 * 0.34, d(a0), s0 * 0.34);
    ctx.quad(c0 * 0.34, d(a0) - 0.012, s0 * 0.34, c1 * 0.34, d(a1) - 0.012, s1 * 0.34, c1 * 0.17, 1.948, s1 * 0.17, c0 * 0.17, 1.948, s0 * 0.17); }
  lathe(ctx, 0.01, 0, [[1.95, 0.175], [2.04, 0.165], [2.1, 0.14], [2.13, 0.06]], S, 1, 1, 0.07, 9);
  ctx.color("oklch(0.28 0.03 30)"); lathe(ctx, 0.01, 0, [[1.955, 0.178], [1.99, 0.172]], S);
  // straw: spilling from the cuffs, the hem and under the hat
  if (lod <= 3) { ctx.color("oklch(0.8 0.12 85)"); ctx.flat?.();
    tuft(ctx, -0.66, 1.47, 0, -1, -0.3, 0, 9, 0.14, 1); tuft(ctx, 0.66, 1.47, 0, 1, -0.3, 0, 9, 0.14, 2);
    for (let k = 0; k < 6; k++) { const a = k * 1.05; tuft(ctx, Math.cos(a) * 0.26, 0.8, Math.sin(a) * 0.18, Math.cos(a) * 0.3, -1, Math.sin(a) * 0.3, 4, 0.12, 10 + k); }
    for (let k = 0; k < 5; k++) { const a = k * 1.25 + 0.4; tuft(ctx, Math.cos(a) * 0.15, 1.93, Math.sin(a) * 0.15, Math.cos(a), -0.5, Math.sin(a), 3, 0.08, 30 + k); } }
}

export function collider(ctx) {
  return [
    { kind: "box", width: 1.5, height: 2.2, depth: 0.4, center: [0, 1.1, 0] },
  ];
}
