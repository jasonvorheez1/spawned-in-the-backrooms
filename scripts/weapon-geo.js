// Weapons lying on the carpet, laid along +Z, flat side down. params.kind picks which (weapons.yml keys).
import { tube, face } from "./lib/shapes.js";
import W from "./lib/data/weapons.yml";

const WOODTEX = "cdn/texture-worn-hardwood-grain.png", STEELTEX = "cdn/texture-scratched-worn-steel.png";
const WOOD = "oklch(0.93 0.03 70)", DARKWOOD = "oklch(0.78 0.05 50)", STEEL = "oklch(0.95 0.005 250)", BLACK = "oklch(0.24 0.01 260)";
const RUST = "oklch(0.45 0.09 45)", TAPE = "oklch(0.2 0.01 80)", EDGE = "oklch(0.9 0.01 250)";
const Y = 0.04;

// a capped tube: radii fall to nothing at both ends so no hole shows
function rod(ctx, pts, rads, M, sq) {
  const a = pts[0], b = pts[1], n = pts.length, y = pts[n - 1], z = pts[n - 2];
  const s = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
  tube(ctx, [s(a, b, -0.02), a, ...pts.slice(1, -1), y, s(y, z, -0.02)], [rads[0] * 0.6, rads[0], ...rads.slice(1, -1), rads[n - 1], rads[n - 1] * 0.6], M, sq, 0, 1, 1);
}
// a rounded-corner bar along Z: w, h half-sizes, r corner radius, capped
function bar(ctx, x, y, w, h, z0, z1, r = 0.004, C = 3) {
  const prof = [];
  for (const [cx, cy, a0] of [[w - r, h - r, 0], [-w + r, h - r, 90], [-w + r, -h + r, 180], [w - r, -h + r, 270]])
    for (let k = 0; k <= C; k++) { const a = ((a0 + (90 * k) / C) * Math.PI) / 180; prof.push([x + cx + Math.cos(a) * r, y + cy + Math.sin(a) * r]); }
  const n = prof.length;
  for (let i = 0; i < n; i++) {
    const p = prof[i], q = prof[(i + 1) % n];
    face(ctx, [p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], [(p[0] + q[0]) / 2 - x, (p[1] + q[1]) / 2 - y, 0]);
  }
  for (const [z, d] of [[z0, -1], [z1, 1]]) for (let i = 1; i < n - 1; i++) {
    const A = [...prof[0], z], B = [...prof[i], z], Cc = [...prof[i + 1], z];
    face(ctx, A, B, Cc, Cc, [0, 0, d]);
  }
}
// a ground blade in the XZ plane: thick along the spine, sharp along the edge, both faces bevelled
function blade(ctx, spine, edge, th, eth = 0.0015) {
  const n = spine.length, S = (i, s) => [spine[i][0], Y + s * th, spine[i][1]], E = (i, s) => [edge[i][0], Y + s * eth, edge[i][1]];
  for (let i = 0; i < n - 1; i++) {
    face(ctx, S(i, 1), S(i + 1, 1), E(i + 1, 1), E(i, 1), [0, 1, 0]);
    face(ctx, S(i, -1), S(i + 1, -1), E(i + 1, -1), E(i, -1), [0, -1, 0]);
    const out = [spine[i][0] - edge[i][0], 0, spine[i][1] - edge[i][1]];
    face(ctx, S(i, 1), S(i + 1, 1), S(i + 1, -1), S(i, -1), out);
    const eo = [edge[i][0] - spine[i][0], 0, edge[i][1] - spine[i][1]];
    face(ctx, E(i, 1), E(i + 1, 1), E(i + 1, -1), E(i, -1), eo);
  }
  for (const [i, d] of [[0, -1], [n - 1, 1]]) {
    const j = i - d, o = [spine[i][0] - spine[j][0], 0, spine[i][1] - spine[j][1]];
    face(ctx, S(i, 1), E(i, 1), E(i, -1), S(i, -1), o);
  }
}
const wraps = (ctx, z0, z1, r, M, step = 0.022) => { for (let z = z0; z < z1; z += step) rod(ctx, [[0, Y, z], [0, Y, z + step * 0.8]], [r, r * 1.02], M); };
const steel = (ctx, c = STEEL, rough = 0.38) => { ctx.albedo(STEELTEX); ctx.color(c); ctx.metalness(0.85); ctx.roughness(rough); };
const wood = (ctx, c = WOOD) => { ctx.albedo(WOODTEX); ctx.color(c); ctx.metalness(0); ctx.roughness(0.75); };
const plain = (ctx, c, rough = 0.7, metal = 0) => { ctx.albedo(null); ctx.color(c); ctx.metalness(metal); ctx.roughness(rough); };

const builders = {
  table_leg(ctx, M, hi) {
    wood(ctx, DARKWOOD);
    // turned leg: a bead, a taper, a foot
    rod(ctx, [[0, Y, 0.03], [0, Y, 0.1], [0, Y, 0.13], [0, Y, 0.16], [0, Y, 0.45], [0, Y, 0.64], [0, Y, 0.68], [0, Y, 0.7]],
      [0.032, 0.032, 0.038, 0.03, 0.026, 0.02, 0.024, 0.02], M);
    if (hi) { // splintered break where it tore off the table
      for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.283; rod(ctx, [[Math.cos(a) * 0.018, Y + Math.sin(a) * 0.018, 0.03], [Math.cos(a) * 0.022, Y + Math.sin(a) * 0.022, -0.01 - (k % 3) * 0.012]], [0.008, 0.001], 4); }
    }
    steel(ctx, "oklch(0.85 0.01 250)", 0.5);
    bar(ctx, 0, Y + 0.034, 0.03, 0.003, 0.04, 0.1, 0.002, 1); // bent bracket
    if (hi) { plain(ctx, BLACK, 0.4, 0.8); for (const z of [0.055, 0.085]) rod(ctx, [[0, Y + 0.036, z], [0, Y + 0.041, z]], [0.005, 0.005], 6); } // screws
  },
  pipe_scrap(ctx, M, hi) {
    steel(ctx, "oklch(0.82 0.01 240)", 0.55);
    rod(ctx, [[0, Y, 0], [0, Y, 0.4], [0, Y, 0.74]], [0.03, 0.03, 0.03], M);
    rod(ctx, [[0, Y, 0.74], [0, Y, 0.76], [0, Y, 0.84]], [0.045, 0.045, 0.045], M); // threaded elbow coupling
    if (hi) for (let z = 0.765; z < 0.84; z += 0.012) rod(ctx, [[0, Y, z], [0, Y, z + 0.004]], [0.047, 0.047], M);
    plain(ctx, RUST, 0.95);
    rod(ctx, [[0, Y, 0.2], [0, Y, 0.34]], [0.0315, 0.0315], M); rod(ctx, [[0, Y, 0.55], [0, Y, 0.6]], [0.031, 0.031], M);
    plain(ctx, TAPE, 0.9); wraps(ctx, 0.02, 0.18, 0.033, M); // electrical tape grip
  },
  crowbar(ctx, M, hi) {
    plain(ctx, "oklch(0.45 0.17 28)", 0.5, 0.5); // red enamel, chipped
    const hex = (z0, z1) => rod(ctx, [[0, Y, z0], [0, Y, z1]], [0.017, 0.017], 6);
    hex(0.08, 0.7);
    steel(ctx, "oklch(0.8 0.01 250)", 0.45);
    hex(0.7, 0.78); hex(0.0, 0.08);
    rod(ctx, [[0, Y, 0.78], [0, Y + 0.04, 0.88], [0, Y + 0.1, 0.92], [0, Y + 0.16, 0.88], [0, Y + 0.17, 0.84]], [0.017, 0.016, 0.015, 0.012, 0.006], 6); // goose neck
    blade(ctx, [[0, 0.04], [0, -0.04]], [[0, 0.04], [0, -0.04]], 0.0001, 0.0001);
    // flat pry end, a split claw
    blade(ctx, [[-0.016, 0.04], [-0.022, -0.02], [-0.006, -0.05]], [[0.016, 0.04], [0.022, -0.02], [0.006, -0.05]], 0.012, 0.004);
    if (hi) { plain(ctx, RUST, 1); hex(0.33, 0.39); }
  },
  bat(ctx, M, hi) {
    wood(ctx, "oklch(0.95 0.04 80)");
    rod(ctx, [[0, Y, -0.02], [0, Y, 0], [0, Y, 0.03], [0, Y, 0.12], [0, Y, 0.4], [0, Y, 0.72], [0, Y, 0.9], [0, Y, 0.98], [0, Y, 1.0]],
      [0.03, 0.036, 0.022, 0.02, 0.028, 0.044, 0.05, 0.046, 0.036], M); // knob, handle, barrel, cupped end
    plain(ctx, TAPE, 0.9); wraps(ctx, 0.03, 0.28, 0.023, M, 0.018);
    if (hi) { // nails hammered through the barrel
      steel(ctx, "oklch(0.7 0.01 250)", 0.6);
      for (let k = 0; k < 7; k++) { const z = 0.66 + k * 0.045, a = k * 2.4; rod(ctx, [[Math.cos(a) * 0.04, Y + Math.sin(a) * 0.04, z], [Math.cos(a) * 0.09, Y + Math.sin(a) * 0.09, z + 0.01]], [0.004, 0.002], 4); }
      plain(ctx, "oklch(0.33 0.11 25)", 0.6); rod(ctx, [[0, Y, 0.78], [0, Y, 0.86]], [0.0485, 0.0505], M); // old stain
    }
  },
  hatchet(ctx, M, hi) {
    wood(ctx, WOOD);
    rod(ctx, [[0, Y, -0.01], [0, Y, 0.02], [0, Y, 0.3], [0, Y, 0.62], [0, Y, 0.74]], [0.026, 0.028, 0.019, 0.022, 0.024], M, [1.3, 1]); // curved oval haft
    steel(ctx, "oklch(0.62 0.01 250)", 0.5);
    bar(ctx, 0, Y, 0.028, 0.026, 0.65, 0.76, 0.006); // the eye
    bar(ctx, -0.04, Y, 0.016, 0.022, 0.67, 0.74, 0.006); // poll
    steel(ctx, STEEL, 0.3);
    blade(ctx, [[0.03, 0.66], [0.08, 0.66], [0.12, 0.64]], [[0.03, 0.75], [0.12, 0.79], [0.19, 0.83]], 0.0001);
    blade(ctx, [[0.025, 0.665], [0.1, 0.655], [0.17, 0.6], [0.18, 0.6]], [[0.025, 0.745], [0.12, 0.77], [0.18, 0.84], [0.19, 0.84]], 0.014);
    if (hi) { plain(ctx, EDGE, 0.15, 1); blade(ctx, [[0.17, 0.6], [0.176, 0.72], [0.18, 0.84]], [[0.19, 0.6], [0.196, 0.72], [0.19, 0.845]], 0.004, 0.001); } // honed edge
  },
  fire_axe(ctx, M, hi) {
    plain(ctx, "oklch(0.52 0.2 27)", 0.35);
    rod(ctx, [[0, Y, -0.01], [0, Y, 0.02], [0, Y, 0.45], [0, Y, 0.9], [0, Y, 0.98]], [0.03, 0.032, 0.024, 0.026, 0.028], M, [1.25, 1]);
    plain(ctx, "oklch(0.92 0.12 95)", 0.5); rod(ctx, [[0, Y, 0.06], [0, Y, 0.09]], [0.031, 0.031], M); // yellow band
    plain(ctx, TAPE, 0.9); wraps(ctx, 0.1, 0.3, 0.026, M);
    plain(ctx, "oklch(0.5 0.2 27)", 0.45, 0.6);
    bar(ctx, 0, Y, 0.034, 0.03, 0.88, 0.98, 0.008); // painted head
    blade(ctx, [[0.03, 0.88], [0.12, 0.86], [0.23, 0.79]], [[0.03, 0.98], [0.12, 1.02], [0.24, 1.09]], 0.018);
    blade(ctx, [[-0.03, 0.9], [-0.12, 0.92], [-0.22, 0.94]], [[-0.03, 0.96], [-0.12, 0.945], [-0.22, 0.942]], 0.016, 0.003); // pick
    steel(ctx, STEEL, 0.25);
    blade(ctx, [[0.2, 0.795], [0.21, 0.94], [0.22, 1.08]], [[0.24, 0.79], [0.255, 0.94], [0.245, 1.09]], 0.006, 0.0012); // bare ground edge
  },
  pistol(ctx, M, hi) {
    plain(ctx, BLACK, 0.35, 0.8);
    bar(ctx, 0, Y + 0.034, 0.014, 0.014, 0.03, 0.22, 0.003); // slide
    if (hi) { plain(ctx, "oklch(0.16 0.01 260)", 0.5, 0.8); for (let k = 0; k < 7; k++) bar(ctx, 0, Y + 0.034, 0.0148, 0.012, 0.04 + k * 0.007, 0.043 + k * 0.007, 0.001, 1); } // rear serrations
    plain(ctx, "oklch(0.2 0.01 260)", 0.6, 0.3);
    bar(ctx, 0, Y + 0.012, 0.012, 0.01, 0.05, 0.2, 0.004); // frame and rail
    steel(ctx, "oklch(0.7 0.01 250)", 0.3);
    rod(ctx, [[0, Y + 0.036, 0.215], [0, Y + 0.036, 0.228]], [0.006, 0.006], 10); // muzzle
    plain(ctx, BLACK, 0.4, 0.8);
    bar(ctx, 0, Y + 0.051, 0.002, 0.003, 0.205, 0.212, 0.001, 1); bar(ctx, 0, Y + 0.051, 0.007, 0.003, 0.04, 0.05, 0.001, 1); // sights
    rod(ctx, [[0, Y + 0.002, 0.13], [0, Y - 0.018, 0.125], [0, Y - 0.026, 0.1], [0, Y - 0.02, 0.07], [0, Y + 0.002, 0.065]], [0.003, 0.003, 0.003, 0.003, 0.003], 6); // trigger guard
    rod(ctx, [[0, Y + 0.002, 0.1], [0, Y - 0.012, 0.096], [0, Y - 0.016, 0.09]], [0.0025, 0.0025, 0.002], 5); // trigger
    plain(ctx, "oklch(0.22 0.02 60)", 0.9);
    // angled grip with stipple panels
    const g = (t) => [0.065 - t * 0.04, Y - t * 0.1];
    for (let k = 0; k < 6; k++) { const [z, y] = g(k / 6), [z2, y2] = g((k + 1) / 6); bar(ctx, 0, (y + y2) / 2, 0.0135, (y - y2) / 2 + 0.002, z - 0.032, z + 0.012, 0.004); }
    plain(ctx, BLACK, 0.4, 0.8); bar(ctx, 0, Y - 0.1, 0.012, 0.004, 0.0, 0.05, 0.002); // magazine base
  },
  shotgun(ctx, M, hi) {
    steel(ctx, "oklch(0.42 0.01 260)", 0.35);
    rod(ctx, [[0, Y + 0.026, 0.3], [0, Y + 0.026, 0.92]], [0.019, 0.019], M); // barrel
    if (hi) { plain(ctx, "oklch(0.08 0 0)", 1); rod(ctx, [[0, Y + 0.026, 0.92], [0, Y + 0.026, 0.921]], [0.014, 0.014], M); }
    steel(ctx, "oklch(0.4 0.01 260)", 0.4);
    rod(ctx, [[0, Y, 0.32], [0, Y, 0.8]], [0.016, 0.016], M); // magazine tube
    rod(ctx, [[0, Y + 0.013, 0.84], [0, Y + 0.013, 0.86]], [0.03, 0.03], M); // barrel band
    plain(ctx, BLACK, 0.45, 0.8);
    bar(ctx, 0, Y + 0.014, 0.022, 0.03, 0.18, 0.34, 0.006); // receiver
    rod(ctx, [[0.023, Y + 0.025, 0.26], [0.034, Y + 0.025, 0.26]], [0.004, 0.006], 6); // bolt handle
    rod(ctx, [[0, Y - 0.016, 0.27], [0, Y - 0.036, 0.26], [0, Y - 0.04, 0.23], [0, Y - 0.032, 0.2], [0, Y - 0.016, 0.195]], [0.003, 0.003, 0.003, 0.003, 0.003], 6); // trigger guard
    wood(ctx, "oklch(0.86 0.06 55)");
    for (let z = 0.44; z < 0.6; z += 0.016) rod(ctx, [[0, Y + 0.002, z], [0, Y + 0.002, z + 0.011]], [0.028, 0.028], M); // ribbed pump
    // stock: comb, wrist and butt, tapering from the receiver
    for (let k = 0; k < 6; k++) { const z = 0.18 - k * 0.032, top = Y + 0.04 - k * 0.002, bot = Y - 0.012 - k * 0.012; bar(ctx, 0, (top + bot) / 2, 0.018 + k * 0.001, (top - bot) / 2, z - 0.034, z, 0.008); }
    plain(ctx, "oklch(0.15 0.01 60)", 0.95); bar(ctx, 0, Y - 0.018, 0.024, 0.045, -0.035, -0.014, 0.008); // rubber butt pad
  },
};

export function geometry(ctx) {
  const kind = W[ctx.params?.kind] ? ctx.params.kind : "table_leg", hi = ctx.lod <= 2, M = hi ? 18 : 8;
  ctx.smooth();
  (builders[kind] ?? builders.table_leg)(ctx, M, hi);
  ctx.albedo(null); ctx.color(null); ctx.metalness(0);
}
export function collider() { return null; }
