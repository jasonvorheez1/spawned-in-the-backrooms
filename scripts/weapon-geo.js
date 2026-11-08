// Weapons lying on the carpet, laid along +Z, flat side down. params.kind picks which (weapons.yml keys).
import { tube, face } from "./lib/shapes.js";
import W from "./lib/weapons.js";

const WOODTEX = "cdn/texture-worn-hardwood-grain.png", STEELTEX = "cdn/texture-scratched-worn-steel.png";
const WOOD = "oklch(0.93 0.03 70)", DARKWOOD = "oklch(0.78 0.05 50)", STEEL = "oklch(0.95 0.005 250)", BLACK = "oklch(0.24 0.01 260)";
const RUST = "oklch(0.45 0.09 45)", TAPE = "oklch(0.2 0.01 80)", EDGE = "oklch(0.9 0.01 250)";
const Y = 0.04;

// a capped tube: radii fall to nothing at both ends so no hole shows
function rod(ctx, pts, rads, M, sq) {
  const a = pts[0], b = pts[1], n = pts.length, y = pts[n - 1], z = pts[n - 2];
  const s = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
  tube(ctx, [s(a, b, -0.03), s(a, b, -0.02), a, ...pts.slice(1, -1), y, s(y, z, -0.02), s(y, z, -0.03)], [1e-4, rads[0] * 0.7, rads[0], ...rads.slice(1, -1), rads[n - 1], rads[n - 1] * 0.7, 1e-4], M, sq, 0, 1, 1);
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
  smg(ctx, M, hi) { // a 1930s Thompson: walnut stock, finned barrel, Cutts compensator, stick magazine, vertical foregrip; grip at z 0.14
    const B = Y + 0.03; // the bore line
    wood(ctx, "oklch(0.8 0.07 50)");
    const SN = hi ? 16 : 6; for (let k = 0; k < SN; k++) { const t0 = k / SN, t1 = (k + 1) / SN, z0 = 0.06 - t0 * 0.28, z1 = 0.06 - t1 * 0.28, tm = (t0 + t1) / 2, h = 0.016 + tm * 0.03; bar(ctx, 0, B - 0.006 - tm * 0.03, 0.016, h, z1, z0 + 0.001, 0.008); } // stock, deepening to the butt
    steel(ctx, "oklch(0.35 0.01 260)", 0.4);
    bar(ctx, 0, B - 0.036, 0.0175, 0.048, -0.232, -0.218, 0.006); // butt plate
    plain(ctx, "oklch(0.26 0.01 260)", 0.45, 0.85);
    bar(ctx, 0, B, 0.019, 0.021, 0.055, 0.36, 0.006); // receiver
    bar(ctx, 0, B - 0.026, 0.015, 0.009, 0.1, 0.32, 0.004); // lower frame
    if (hi) { plain(ctx, "oklch(0.18 0.01 260)", 0.5, 0.8); bar(ctx, 0.0192, B + 0.004, 0.0012, 0.006, 0.2, 0.3, 0.001, 1); } // ejection port
    steel(ctx, "oklch(0.6 0.01 250)", 0.3);
    rod(ctx, [[0, B + 0.021, 0.27], [0, B + 0.034, 0.27]], [0.004, 0.006], 8); // cocking knob
    plain(ctx, "oklch(0.22 0.01 260)", 0.45, 0.85);
    bar(ctx, 0, B + 0.028, 0.008, 0.008, 0.08, 0.1, 0.002, 1); // rear sight
    steel(ctx, "oklch(0.4 0.01 260)", 0.35);
    rod(ctx, [[0, B, 0.36], [0, B, 0.585]], [0.0105, 0.0105], M); // barrel
    if (hi) for (let z = 0.372; z < 0.5; z += 0.011) rod(ctx, [[0, B, z], [0, B, z + 0.004]], [0.0165, 0.0165], M); // cooling fins
    plain(ctx, "oklch(0.24 0.01 260)", 0.4, 0.85);
    rod(ctx, [[0, B, 0.578], [0, B, 0.636]], [0.0155, 0.0155], M); // Cutts compensator
    if (hi) { plain(ctx, "oklch(0.06 0 0)", 1); for (let k = 0; k < 4; k++) bar(ctx, 0, B + 0.0145, 0.006, 0.0015, 0.59 + k * 0.011, 0.595 + k * 0.011, 0.001, 1); rod(ctx, [[0, B, 0.636], [0, B, 0.637]], [0.007, 0.007], 10); } // ports and bore
    plain(ctx, "oklch(0.22 0.01 260)", 0.45, 0.85);
    bar(ctx, 0, B + 0.02, 0.0015, 0.006, 0.625, 0.632, 0.001, 1); // front blade
    rod(ctx, [[0, B - 0.03, 0.2], [0, B - 0.05, 0.198], [0, B - 0.056, 0.175], [0, B - 0.05, 0.15], [0, B - 0.03, 0.148]], [0.0032, 0.0032, 0.0032, 0.0032, 0.0032], 6); // trigger guard
    rod(ctx, [[0, B - 0.034, 0.182], [0, B - 0.046, 0.178], [0, B - 0.05, 0.172]], [0.0026, 0.0026, 0.002], 5); // trigger
    for (let k = 0; k < 8; k++) { const y0 = B - 0.04 - k * 0.012; bar(ctx, 0, y0, 0.011, 0.0065, 0.243 + k * 0.0015, 0.272 + k * 0.0015, 0.003); } // 30-round stick magazine
    plain(ctx, "oklch(0.2 0.01 260)", 0.4, 0.85); bar(ctx, 0, B - 0.138, 0.0125, 0.004, 0.252, 0.287, 0.002); // floor plate
    wood(ctx, "oklch(0.78 0.08 48)");
    const g = (t) => [0.145 - t * 0.035, B - 0.03 - t * 0.095]; // pistol grip, raked back
    for (let k = 0; k < 6; k++) { const [z, y] = g(k / 6), [, y2] = g((k + 1) / 6); bar(ctx, 0, (y + y2) / 2, 0.0145, (y - y2) / 2 + 0.002, z - 0.036, z + 0.004, 0.006); }
    for (let k = 0; k < 7; k++) { const t = k / 7, w = 0.016 + (k % 2 ? -0.002 : 0.001); bar(ctx, 0, B - 0.03 - t * 0.085 - 0.006, w, 0.0075, 0.4 - t * 0.008, 0.438 - t * 0.008, 0.007); } // vertical foregrip, finger grooves
    plain(ctx, "oklch(0.3 0.01 260)", 0.4, 0.85); bar(ctx, 0, B - 0.017, 0.011, 0.006, 0.395, 0.445, 0.003); // foregrip clamp
  },
  knife(ctx, M, hi) { // a combat knife lying flat: ridged black grip, steel pommel and guard, clip-point blade with a fuller; grip at z 0.05
    plain(ctx, "oklch(0.2 0.01 60)", 0.85, 0);
    const zs = [], rs = []; for (let k = 0; k <= 10; k++) { zs.push([0, Y, 0.012 + k * 0.0105]); rs.push(0.0115 + (hi && k % 2 ? 0.0016 : 0) + Math.sin(k / 10 * Math.PI) * 0.0015); }
    rod(ctx, zs, rs, M); // grip, ringed
    steel(ctx, "oklch(0.72 0.01 250)", 0.3);
    rod(ctx, [[0, Y, -0.004], [0, Y, 0.013]], [0.0125, 0.0105], M); // pommel
    bar(ctx, 0, Y, 0.032, 0.006, 0.12, 0.13, 0.004); // crossguard
    steel(ctx, "oklch(0.88 0.005 250)", 0.22);
    blade(ctx, [[0.011, 0.13], [0.011, 0.2], [0.0105, 0.25], [0.006, 0.28], [0.0005, 0.315]], [[-0.016, 0.13], [-0.018, 0.2], [-0.015, 0.26], [-0.008, 0.295], [-0.0005, 0.315]], 0.0032);
    if (hi) { plain(ctx, "oklch(0.55 0.01 250)", 0.3, 0.9); bar(ctx, 0.002, Y + 0.0033, 0.0022, 0.0003, 0.14, 0.235, 0.0002, 1); bar(ctx, 0.002, Y - 0.0033, 0.0022, 0.0003, 0.14, 0.235, 0.0002, 1); } // fuller, both faces
  },
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
  rebar(ctx, M, hi) { // a bent length of ribbed rebar ground to a point, concrete still crusted on the butt, a rag-and-tape grip
    ctx.albedo(STEELTEX); ctx.color(RUST); ctx.metalness(0.5); ctx.roughness(0.8);
    rod(ctx, [[0, Y, -0.05], [0, Y, 0.3], [0.01, Y, 0.7], [0.03, Y, 0.95], [0.035, Y, 1.04]], [0.011, 0.011, 0.011, 0.009, 0.001], M);
    for (let z = 0.27; z < 0.9; z += 0.035) { const x = z > 0.3 ? (z - 0.3) * 0.045 : 0; rod(ctx, [[x, Y, z], [x, Y, z + 0.008]], [0.013, 0.013], 8); } // the ribs
    if (hi) { ctx.color("oklch(0.62 0.1 50)"); for (const z of [0.12, 0.2]) rod(ctx, [[0, Y, z - 0.004], [0, Y + 0.002, z + 0.01]], [0.0135, 0.0125], 8); } // rag lumps under the tape
    ctx.albedo(null); ctx.color(EDGE); ctx.metalness(0.9); ctx.roughness(0.25);
    rod(ctx, [[0.031, Y, 0.97], [0.035, Y, 1.045]], [0.0065, 0.0008], 8); // the ground point, bright
    ctx.color("oklch(0.7 0.01 90)"); ctx.metalness(0); ctx.roughness(1);
    rod(ctx, [[0, Y, -0.08], [0.006, Y + 0.004, -0.05], [-0.004, Y, -0.02], [0, Y, 0.02]], [0.028, 0.036, 0.031, 0.02], 7); // concrete clump
    ctx.color(TAPE); ctx.roughness(0.9); wraps(ctx, 0.05, 0.26, 0.0165, M, 0.02);
  },
  screwdriver(ctx, M, hi) { // a long flathead: fluted amber handle, black ferrule, ground tip
    ctx.color("oklch(0.66 0.17 55)"); ctx.roughness(0.25); ctx.metalness(0);
    rod(ctx, [[0, Y, 0], [0, Y, 0.012], [0, Y, 0.06], [0, Y, 0.1], [0, Y, 0.112]], [0.013, 0.017, 0.0195, 0.016, 0.012], M); // handle body
    if (hi) { ctx.color("oklch(0.55 0.16 50)"); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; rod(ctx, [[Math.cos(a) * 0.0175, Y + Math.sin(a) * 0.0175, 0.02], [Math.cos(a) * 0.0195, Y + Math.sin(a) * 0.0195, 0.06], [Math.cos(a) * 0.016, Y + Math.sin(a) * 0.016, 0.095]], [0.004, 0.004, 0.003], 6); } } // flutes
    ctx.color(BLACK); ctx.roughness(0.6); rod(ctx, [[0, Y, 0.11], [0, Y, 0.128]], [0.0115, 0.008], M);
    ctx.albedo(STEELTEX); ctx.color(STEEL); ctx.metalness(0.9); ctx.roughness(0.3);
    rod(ctx, [[0, Y, 0.125], [0, Y, 0.272]], [0.0042, 0.0042], M);
    blade(ctx, [[0, 0.268], [0, 0.302]], [[0.0075, 0.268], [0.0075, 0.302]], 0.004, 0.0008); // the flat, ground
    blade(ctx, [[0, 0.268], [0, 0.302]], [[-0.0075, 0.268], [-0.0075, 0.302]], 0.004, 0.0008);
  },
  sledgehammer(ctx, M, hi) { // a hickory shaft and a heavy chamfered black head, faces worn bright, a steel wedge in the eye
    ctx.albedo(WOODTEX); ctx.color(WOOD); ctx.roughness(0.7); ctx.metalness(0);
    rod(ctx, [[0, Y, -0.02], [0, Y, 0.02], [0, Y, 0.4], [0, Y, 0.78], [0, Y, 0.88]], [0.02, 0.018, 0.015, 0.017, 0.02], M, [1.25, 1]); // oval, swelling at the knob and the head
    ctx.albedo(null); ctx.color(TAPE); ctx.roughness(0.9); wraps(ctx, 0.02, 0.22, 0.0205, M, 0.02);
    ctx.albedo(STEELTEX); ctx.color("oklch(0.3 0.01 250)"); ctx.metalness(0.7); ctx.roughness(0.6);
    bar(ctx, 0, Y, 0.042, 0.044, 0.835, 0.945, 0.012, 3); // the cheek block, chamfered
    for (const sx of [-1, 1]) {
      rod(ctx, [[sx * 0.04, Y, 0.89], [sx * 0.11, Y, 0.89], [sx * 0.125, Y, 0.89]], [0.047, 0.05, 0.046], M, [1, 1.05]); // the striking ends
      ctx.color("oklch(0.72 0.01 250)"); ctx.metalness(0.9); ctx.roughness(0.3);
      rod(ctx, [[sx * 0.125, Y, 0.89], [sx * 0.132, Y, 0.89]], [0.046, 0.04], M); // faces polished by use
      ctx.color("oklch(0.3 0.01 250)"); ctx.metalness(0.7); ctx.roughness(0.6);
    }
    if (hi) { ctx.color("oklch(0.6 0.01 250)"); bar(ctx, 0, Y, 0.004, 0.03, 0.944, 0.952, 0.001, 1); ctx.color(RUST); ctx.albedo(null); rod(ctx, [[0.06, Y + 0.045, 0.88], [0.09, Y + 0.046, 0.9]], [0.01, 0.008], 6); } // the wedge, a rust bloom
  },
  wrench(ctx, M, hi) { // a heavy red pipe wrench: I-beam handle, knurled adjusting nut, a hook jaw with teeth
    ctx.albedo(STEELTEX); ctx.color("oklch(0.5 0.18 25)"); ctx.metalness(0.4); ctx.roughness(0.5);
    bar(ctx, 0, Y, 0.017, 0.012, 0.02, 0.42, 0.006); // handle
    if (hi) { ctx.color("oklch(0.4 0.15 25)"); bar(ctx, 0, Y + 0.012, 0.009, 0.002, 0.06, 0.38, 0.001, 1); bar(ctx, 0, Y - 0.012, 0.009, 0.002, 0.06, 0.38, 0.001, 1); } // the I-beam channels
    ctx.color("oklch(0.45 0.17 25)"); rod(ctx, [[0, Y, 0], [0, Y, 0.03]], [0.008, 0.017], 10); // hang-hole end
    ctx.color(STEEL); ctx.metalness(0.85); ctx.roughness(0.4);
    bar(ctx, 0, Y, 0.022, 0.016, 0.42, 0.5, 0.005); // the frame
    rod(ctx, [[0, Y, 0.44], [0, Y, 0.485]], [0.025, 0.025], M); // adjusting nut
    if (hi) { ctx.color("oklch(0.6 0.01 250)"); for (let z = 0.444; z < 0.484; z += 0.006) rod(ctx, [[0, Y, z], [0, Y, z + 0.0025]], [0.0265, 0.0265], M); } // knurl
    ctx.color(STEEL);
    bar(ctx, -0.035, Y, 0.012, 0.014, 0.49, 0.6, 0.004); // heel jaw
    bar(ctx, 0.028, Y, 0.012, 0.014, 0.47, 0.585, 0.004); // hook jaw
    bar(ctx, 0.012, Y, 0.028, 0.014, 0.585, 0.612, 0.005); // the hook's crown
    for (let z = 0.52; z < 0.58; z += 0.01) { bar(ctx, 0.014, Y, 0.003, 0.012, z, z + 0.004, 0.001, 1); bar(ctx, -0.021, Y, 0.003, 0.012, z, z + 0.004, 0.001, 1); }
  },
  stun_baton(ctx, M, hi) { // a ridged black rubber grip, a switch collar, a steel shaft, an insulator and two copper prongs
    plain(ctx, "oklch(0.18 0.005 260)", 0.85);
    rod(ctx, [[0, Y, 0], [0, Y, 0.01], [0, Y, 0.1], [0, Y, 0.19], [0, Y, 0.2]], [0.017, 0.021, 0.019, 0.02, 0.018], M); // grip, a pommel swell
    if (hi) { ctx.color("oklch(0.24 0.005 260)"); for (let z = 0.03; z < 0.18; z += 0.014) rod(ctx, [[0, Y, z], [0, Y, z + 0.006]], [0.0205, 0.0205], M); } // finger ridges
    plain(ctx, "oklch(0.3 0.01 260)", 0.5);
    rod(ctx, [[0, Y, 0.195], [0, Y, 0.205], [0, Y, 0.24], [0, Y, 0.25]], [0.02, 0.025, 0.023, 0.016], M); // the collar
    plain(ctx, "oklch(0.55 0.2 25)", 0.4); bar(ctx, 0, Y + 0.024, 0.007, 0.004, 0.21, 0.232, 0.002, 1); // the red trigger switch on top
    if (hi) { plain(ctx, "oklch(0.85 0.12 230)", 0.2); ctx.emissive?.("oklch(0.8 0.15 230)"); rod(ctx, [[0, Y + 0.0225, 0.238], [0, Y + 0.0225, 0.243]], [0.004, 0.004], 6); ctx.emissive?.(null); } // the charge lamp
    steel(ctx, STEEL, 0.32);
    rod(ctx, [[0, Y, 0.245], [0, Y, 0.4], [0, Y, 0.545]], [0.0125, 0.0115, 0.011], M); // the shaft
    if (hi) { ctx.color("oklch(0.7 0.01 250)"); for (const z of [0.3, 0.42]) rod(ctx, [[0, Y, z], [0, Y, z + 0.004]], [0.0128, 0.0128], M); } // seam rings
    plain(ctx, "oklch(0.22 0.01 260)", 0.6);
    rod(ctx, [[0, Y, 0.54], [0, Y, 0.552], [0, Y, 0.568], [0, Y, 0.574]], [0.012, 0.0155, 0.0155, 0.012], M); // insulator cap
    ctx.albedo(null); ctx.color("oklch(0.68 0.13 50)"); ctx.metalness(1); ctx.roughness(0.28);
    for (const sx of [-1, 1]) { rod(ctx, [[sx * 0.0075, Y, 0.565], [sx * 0.0085, Y, 0.59], [sx * 0.0095, Y, 0.61]], [0.0032, 0.003, 0.0026], 7); rod(ctx, [[sx * 0.0095, Y, 0.607], [sx * 0.0095, Y, 0.614]], [0.0034, 0.0005], 6); } // copper prongs, beaded tips
  },
  lineman_machete(ctx, M, hi) { // a long dark blade with a hooked spine, a bright ground edge, an orange insulated grip bound in black tape
    plain(ctx, "oklch(0.62 0.17 50)", 0.7);
    rod(ctx, [[0, Y, 0], [0, Y, 0.012], [0, Y, 0.09], [0, Y, 0.17], [0, Y, 0.182]], [0.014, 0.0175, 0.016, 0.0175, 0.014], M, [1.3, 1]); // insulated grip, oval
    ctx.color(TAPE); ctx.roughness(0.9);
    for (const [z0, z1] of [[0.02, 0.07], [0.1, 0.16]]) for (let z = z0; z < z1; z += 0.012) rod(ctx, [[0, Y, z], [0, Y, z + 0.0105]], [0.0182, 0.0184], M, [1.3, 1]); // two bindings of black tape, a gap of orange between
    if (hi) { ctx.color("oklch(0.85 0.15 90)"); bar(ctx, 0.022, Y, 0.0015, 0.006, 0.075, 0.095, 0.001, 1); } // a yellow 1000V sticker
    steel(ctx, "oklch(0.55 0.005 250)", 0.4); bar(ctx, 0.004, Y, 0.022, 0.009, 0.175, 0.19, 0.003, 2); // the bolster
    rod(ctx, [[0, Y, -0.012], [0, Y, 0.004]], [0.006, 0.006], 8); // pommel rivet
    steel(ctx, "oklch(0.3 0.008 250)", 0.55); // the blade: blackened steel
    blade(ctx, [[-0.012, 0.185], [-0.012, 0.4], [-0.012, 0.6], [-0.01, 0.66], [-0.004, 0.705], [0, 0.722]],
      [[0.026, 0.185], [0.032, 0.4], [0.045, 0.6], [0.041, 0.66], [0.023, 0.705], [0.001, 0.722]], 0.003, 0.0008);
    blade(ctx, [[-0.011, 0.555], [-0.011, 0.6], [-0.011, 0.628]], [[-0.013, 0.555], [-0.03, 0.62], [-0.04, 0.657]], 0.0026, 0.0006); // the hooked spine
    ctx.color("oklch(0.85 0.008 250)"); ctx.metalness(1); ctx.roughness(0.15);
    blade(ctx, [[0.02, 0.2], [0.026, 0.4], [0.038, 0.6], [0.034, 0.66], [0.018, 0.703]],
      [[0.0265, 0.2], [0.0325, 0.4], [0.0455, 0.6], [0.0415, 0.66], [0.0235, 0.705]], 0.0013, 0.0009); // ground edge, bright
    if (hi) { ctx.color(RUST); ctx.roughness(1); ctx.metalness(0.1); ctx.albedo(null); rod(ctx, [[-0.002, Y + 0.0028, 0.3], [0.004, Y + 0.0028, 0.33]], [0.004, 0.003], 5); } // a rust freckle
  },
  // ---- real-world weapons added with the split loot pools (weapons.yml: pools). Guns: grip at z 0.14, bore line B = Y + 0.03, barrel toward +Z.
  golf_club(ctx, M, hi) { // a 7-iron: rubber grip, thin steel shaft, a flat-faced head turned out at the hosel
    plain(ctx, "oklch(0.2 0.01 60)", 0.9); rod(ctx, [[0, Y, -0.01], [0, Y, 0.02], [0, Y, 0.27], [0, Y, 0.3]], [0.013, 0.0145, 0.0125, 0.01], M); // grip
    steel(ctx, "oklch(0.85 0.005 250)", 0.25); rod(ctx, [[0, Y, 0.3], [0, Y, 0.6], [0, Y, 0.86]], [0.0055, 0.0048, 0.0055], M); // shaft
    steel(ctx, "oklch(0.82 0.008 250)", 0.3);
    rod(ctx, [[0, Y, 0.86], [0.012, Y, 0.9]], [0.008, 0.011], M); // hosel
    bar(ctx, 0.038, Y, 0.03, 0.019, 0.9, 0.94, 0.004); // the head, face to +x
    if (hi) { plain(ctx, "oklch(0.3 0.01 250)", 0.5, 0.9); for (let k = 0; k < 5; k++) bar(ctx, 0.038, Y, 0.026, 0.0008, 0.902 + k * 0.007, 0.904 + k * 0.007, 0.0004, 1); } // grooves
  },
  tire_iron(ctx, M, hi) { // an L-shaped lug wrench: a socket at the short end, a flat pry blade at the long end
    steel(ctx, "oklch(0.55 0.01 250)", 0.5);
    rod(ctx, [[0, Y, 0.02], [0, Y, 0.3], [0, Y, 0.52]], [0.0105, 0.0105, 0.0105], M); // the long arm
    rod(ctx, [[-0.015, Y, 0.0], [0.17, Y, 0.0]], [0.0105, 0.0105], M); // the short arm, across the base
    steel(ctx, "oklch(0.5 0.01 250)", 0.45); rod(ctx, [[0.16, Y, -0.02], [0.16, Y, 0.035]], [0.019, 0.019], M); // the socket
    bar(ctx, 0, Y, 0.02, 0.006, 0.5, 0.6, 0.003); // pry blade, flattened
    if (hi) { plain(ctx, "oklch(0.3 0.02 60)", 0.8); rod(ctx, [[0.14, Y, -0.012], [0.14, Y, 0.012]], [0.0118, 0.0118], M); }
  },
  pickaxe(ctx, M, hi) { // a hickory haft and a long curved steel head, pointed both ends
    wood(ctx, "oklch(0.88 0.05 65)"); rod(ctx, [[0, Y, -0.01], [0, Y, 0.03], [0, Y, 0.4], [0, Y, 0.8], [0, Y, 0.86]], [0.026, 0.026, 0.02, 0.022, 0.024], M, [1.2, 1]);
    steel(ctx, "oklch(0.5 0.01 250)", 0.5);
    rod(ctx, [[-0.3, Y, 0.82], [-0.16, Y, 0.865], [-0.05, Y, 0.88], [0.05, Y, 0.88], [0.16, Y, 0.865], [0.3, Y, 0.82]], [0.002, 0.011, 0.02, 0.02, 0.011, 0.002], M); // the head
    plain(ctx, "oklch(0.3 0.04 50)", 0.9); bar(ctx, 0, Y, 0.028, 0.028, 0.865, 0.895, 0.008); // the eye collar
    if (hi) { ctx.color(RUST); ctx.roughness(1); rod(ctx, [[-0.22, Y, 0.835], [-0.18, Y, 0.846]], [0.008, 0.009], 6); }
  },
  baton(ctx, M, hi) { // a side-handle police baton (PR-24): a black polycarbonate shaft, a rubber grip, the handle at right angles
    plain(ctx, "oklch(0.2 0.01 260)", 0.5, 0.1);
    rod(ctx, [[0, Y, -0.01], [0, Y, 0.02], [0, Y, 0.3], [0, Y, 0.56], [0, Y, 0.6]], [0.012, 0.0145, 0.0135, 0.0145, 0.011], M); // shaft
    plain(ctx, "oklch(0.15 0.01 260)", 0.9); for (let z = 0.025; z < 0.17; z += 0.014) rod(ctx, [[0, Y, z], [0, Y, z + 0.011]], [0.0172, 0.0174], M); // ribbed grip
    plain(ctx, "oklch(0.2 0.01 260)", 0.5, 0.1); rod(ctx, [[0.0, Y, 0.21], [0.05, Y, 0.21], [0.055, Y, 0.13], [0.05, Y, 0.1]], [0.0095, 0.0095, 0.0095, 0.0095], M); // the side handle
    steel(ctx, "oklch(0.7 0.01 250)", 0.3); rod(ctx, [[0, Y, 0.595], [0, Y, 0.605]], [0.012, 0.012], M);
  },
  cleaver(ctx, M, hi) { // a rectangular butcher's cleaver: a wooden handle riveted to a broad blade with a hang hole
    wood(ctx, "oklch(0.78 0.06 50)"); rod(ctx, [[0, Y, -0.005], [0, Y, 0.02], [0, Y, 0.11], [0, Y, 0.13]], [0.013, 0.0155, 0.0155, 0.012], M, [1.15, 1]);
    steel(ctx, "oklch(0.6 0.01 250)", 0.4); for (const z of [0.045, 0.095]) rod(ctx, [[0, Y - 0.012, z], [0, Y + 0.012, z]], [0.003, 0.003], 6); // rivets
    steel(ctx, "oklch(0.8 0.008 250)", 0.25);
    blade(ctx, [[-0.008, 0.13], [-0.008, 0.25], [-0.008, 0.33]], [[0.092, 0.13], [0.1, 0.25], [0.094, 0.34]], 0.0032, 0.001);
    plain(ctx, "oklch(0.2 0.01 260)", 0.8); rod(ctx, [[0.03, Y + 0.004, 0.31], [0.03, Y - 0.004, 0.31]], [0.009, 0.009], 8); // the hang hole, dark
    if (hi) { plain(ctx, "oklch(0.3 0.1 25)", 0.7); bar(ctx, 0.05, Y, 0.02, 0.0042, 0.15, 0.22, 0.001, 1); }
  },
  revolver(ctx, M, hi) { // a .38 service revolver: 4" barrel and rib, a fluted cylinder, ejector rod, hammer, walnut grips
    const B = Y + 0.03;
    plain(ctx, "oklch(0.24 0.012 255)", 0.35, 0.9);
    bar(ctx, 0, B - 0.004, 0.013, 0.027, 0.09, 0.205, 0.004); // frame
    rod(ctx, [[0, B + 0.002, 0.205], [0, B + 0.002, 0.3]], [0.0295, 0.0295], M); // cylinder
    if (hi) { plain(ctx, "oklch(0.12 0.01 255)", 0.6, 0.8); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; rod(ctx, [[Math.cos(a) * 0.026, B + 0.002 + Math.sin(a) * 0.026, 0.21], [Math.cos(a) * 0.026, B + 0.002 + Math.sin(a) * 0.026, 0.295]], [0.0045, 0.0045], 5); } } // flutes
    plain(ctx, "oklch(0.24 0.012 255)", 0.35, 0.9);
    rod(ctx, [[0, B + 0.016, 0.3], [0, B + 0.016, 0.52]], [0.0105, 0.0105], M); // barrel
    bar(ctx, 0, B + 0.029, 0.0035, 0.0025, 0.31, 0.52, 0.001, 1); // top rib
    rod(ctx, [[0, B - 0.012, 0.3], [0, B - 0.012, 0.47]], [0.0048, 0.0048], 7); // ejector rod
    rod(ctx, [[0, B + 0.03, 0.11], [0, B + 0.045, 0.098]], [0.006, 0.0065], 6); // hammer
    bar(ctx, 0, B + 0.03, 0.002, 0.0025, 0.5, 0.52, 0.001, 1); // front sight
    rod(ctx, [[0, B - 0.03, 0.2], [0, B - 0.055, 0.17], [0, B - 0.05, 0.13], [0, B - 0.03, 0.115]], [0.0028, 0.0028, 0.0028, 0.0028], 6); // trigger guard
    rod(ctx, [[0, B - 0.028, 0.16], [0, B - 0.044, 0.156]], [0.0024, 0.0018], 5); // trigger
    wood(ctx, "oklch(0.7 0.08 50)"); const g = (t) => [0.135 - t * 0.04, B - 0.03 - t * 0.095];
    for (let k = 0; k < 6; k++) { const [z, y] = g(k / 6), [, y2] = g((k + 1) / 6); bar(ctx, 0, (y + y2) / 2, 0.0145, (y - y2) / 2 + 0.002, z - 0.034, z + 0.006, 0.006); }
  },
  coach_gun(ctx, M, hi) { // a double-barrel coach gun: two barrels side by side, hammers, a wooden stock and fore-end; wrist at z 0.1
    const B = Y + 0.03;
    steel(ctx, "oklch(0.36 0.01 260)", 0.4);
    for (const sx of [-1, 1]) rod(ctx, [[sx * 0.0125, B, 0.2], [sx * 0.0125, B, 0.66]], [0.0135, 0.0135], M); // barrels
    bar(ctx, 0, B + 0.012, 0.004, 0.003, 0.2, 0.66, 0.001, 1); // rib between them
    if (hi) { plain(ctx, "oklch(0.06 0 0)", 1); for (const sx of [-1, 1]) rod(ctx, [[sx * 0.0125, B, 0.659], [sx * 0.0125, B, 0.661]], [0.0105, 0.0105], 8); }
    plain(ctx, "oklch(0.3 0.015 260)", 0.4, 0.85);
    bar(ctx, 0, B - 0.002, 0.021, 0.03, 0.06, 0.22, 0.006); // receiver
    for (const sx of [-1, 1]) rod(ctx, [[sx * 0.026, B + 0.026, 0.088], [sx * 0.03, B + 0.044, 0.07]], [0.0055, 0.006], 6); // two hammers
    rod(ctx, [[0, B - 0.03, 0.17], [0, B - 0.058, 0.16], [0, B - 0.058, 0.11], [0, B - 0.03, 0.095]], [0.0028, 0.0028, 0.0028, 0.0028], 6); // trigger guard
    wood(ctx, "oklch(0.78 0.07 55)");
    for (let k = 0; k < 6; k++) { const z = 0.07 - k * 0.04, top = B + 0.028 - k * 0.0015, bot = B - 0.026 - k * 0.011; bar(ctx, 0, (top + bot) / 2, 0.019 + k * 0.0008, (top - bot) / 2, z - 0.04, z, 0.008); } // stock
    bar(ctx, 0, B - 0.014, 0.024, 0.018, 0.3, 0.48, 0.008); // fore-end
    plain(ctx, "oklch(0.15 0.01 60)", 0.95); bar(ctx, 0, B - 0.04, 0.02, 0.05, -0.2, -0.18, 0.006); // butt pad
  },
  lever_rifle(ctx, M, hi) { // a lever-action .30-30 carbine: slim barrel, tube magazine, brass-toned receiver, the loop lever, straight walnut stock
    const B = Y + 0.03;
    steel(ctx, "oklch(0.34 0.01 260)", 0.4);
    rod(ctx, [[0, B + 0.012, 0.28], [0, B + 0.012, 0.64]], [0.0105, 0.0105], M); // barrel
    rod(ctx, [[0, B - 0.01, 0.28], [0, B - 0.01, 0.58]], [0.0082, 0.0082], M); // tube magazine
    rod(ctx, [[0, B - 0.0005, 0.56], [0, B - 0.0005, 0.575]], [0.016, 0.016], M); // barrel band
    plain(ctx, "oklch(0.48 0.05 80)", 0.4, 0.9);
    bar(ctx, 0, B + 0.002, 0.0145, 0.028, 0.06, 0.3, 0.005); // receiver
    plain(ctx, "oklch(0.2 0.01 260)", 0.45, 0.85);
    bar(ctx, 0, B + 0.04, 0.002, 0.003, 0.62, 0.64, 0.001, 1); bar(ctx, 0, B + 0.04, 0.007, 0.003, 0.255, 0.275, 0.001, 1); // sights
    steel(ctx, "oklch(0.4 0.01 260)", 0.4); rod(ctx, [[0, B - 0.03, 0.22], [0, B - 0.075, 0.215], [0, B - 0.08, 0.1], [0, B - 0.05, 0.065], [0, B - 0.03, 0.09]], [0.0035, 0.0035, 0.0035, 0.0035, 0.0035], 6); // the lever loop
    wood(ctx, "oklch(0.76 0.08 52)");
    for (let k = 0; k < 7; k++) { const z = 0.1 - k * 0.04, top = B + 0.026 - k * 0.002, bot = B - 0.022 - k * 0.012; bar(ctx, 0, (top + bot) / 2, 0.017 + k * 0.0009, (top - bot) / 2, z - 0.04, z, 0.007); } // stock
    bar(ctx, 0, B - 0.02, 0.019, 0.016, 0.3, 0.5, 0.007); // fore-end
    plain(ctx, "oklch(0.18 0.01 60)", 0.9); bar(ctx, 0, B - 0.052, 0.018, 0.04, -0.2, -0.185, 0.005); // butt plate
  },
  hunting_rifle(ctx, M, hi) { // a bolt-action .308 with a scope: long barrel, bolt handle, five-round box, walnut stock
    const B = Y + 0.03;
    steel(ctx, "oklch(0.3 0.01 260)", 0.4);
    rod(ctx, [[0, B + 0.008, 0.26], [0, B + 0.008, 0.52], [0, B + 0.008, 0.78]], [0.0125, 0.0105, 0.0098], M); // barrel
    plain(ctx, "oklch(0.24 0.012 260)", 0.4, 0.85);
    bar(ctx, 0, B + 0.004, 0.016, 0.022, 0.06, 0.28, 0.005); // receiver
    rod(ctx, [[0.016, B + 0.012, 0.11], [0.05, B - 0.004, 0.1]], [0.0042, 0.0042], 6); rod(ctx, [[0.05, B - 0.004, 0.1], [0.056, B - 0.008, 0.1]], [0.0095, 0.0095], 8); // bolt handle and knob
    bar(ctx, 0, B - 0.026, 0.0135, 0.014, 0.1, 0.2, 0.004); // magazine box
    plain(ctx, "oklch(0.2 0.01 260)", 0.4, 0.8); // scope: mounts, tube, bells
    for (const z of [0.1, 0.24]) bar(ctx, 0, B + 0.034, 0.008, 0.012, z - 0.012, z + 0.012, 0.003);
    rod(ctx, [[0, B + 0.058, 0.07], [0, B + 0.058, 0.17], [0, B + 0.058, 0.26], [0, B + 0.058, 0.3]], [0.0165, 0.0125, 0.0125, 0.0165], M);
    if (hi) { plain(ctx, "oklch(0.55 0.1 250)", 0.1, 0.5); rod(ctx, [[0, B + 0.058, 0.298], [0, B + 0.058, 0.3]], [0.0145, 0.0145], M); }
    rod(ctx, [[0, B - 0.03, 0.2], [0, B - 0.056, 0.185], [0, B - 0.056, 0.14], [0, B - 0.03, 0.125]], [0.0028, 0.0028, 0.0028, 0.0028], 6); // trigger guard
    wood(ctx, "oklch(0.74 0.07 55)");
    for (let k = 0; k < 7; k++) { const z = 0.1 - k * 0.042, top = B + 0.02 - k * 0.002, bot = B - 0.025 - k * 0.012; bar(ctx, 0, (top + bot) / 2, 0.0165 + k * 0.001, (top - bot) / 2, z - 0.042, z, 0.007); } // stock
    bar(ctx, 0, B - 0.014, 0.0185, 0.014, 0.28, 0.52, 0.007); // fore-end
    plain(ctx, "oklch(0.15 0.01 60)", 0.95); bar(ctx, 0, B - 0.05, 0.019, 0.045, -0.215, -0.2, 0.005);
  },
  carbine(ctx, M, hi) { // an AR-15 style carbine: flat-top upper, round handguard, a flash hider, a collapsible stock, a curved 30-round magazine
    const B = Y + 0.03;
    plain(ctx, "oklch(0.22 0.01 260)", 0.5, 0.8);
    bar(ctx, 0, B + 0.004, 0.0165, 0.024, 0.04, 0.3, 0.005); // upper receiver
    bar(ctx, 0, B + 0.03, 0.01, 0.004, 0.04, 0.3, 0.002); // flat-top rail
    rod(ctx, [[0, B + 0.006, 0.28], [0, B + 0.006, 0.4], [0, B + 0.006, 0.5]], [0.0215, 0.021, 0.021], M); // handguard
    if (hi) { plain(ctx, "oklch(0.14 0.01 260)", 0.6, 0.8); for (let z = 0.3; z < 0.48; z += 0.03) rod(ctx, [[0, B + 0.006, z], [0, B + 0.006, z + 0.008]], [0.0222, 0.0222], M); }
    plain(ctx, "oklch(0.22 0.01 260)", 0.5, 0.8);
    rod(ctx, [[0, B + 0.012, 0.5], [0, B + 0.012, 0.56]], [0.0095, 0.0095], M); // flash hider
    bar(ctx, 0, B + 0.032, 0.0025, 0.01, 0.46, 0.48, 0.001, 1); // front sight post
    bar(ctx, 0, B - 0.02, 0.0165, 0.018, -0.02, 0.1, 0.005); // lower receiver
    rod(ctx, [[0, B - 0.03, 0.16], [0, B - 0.052, 0.14], [0, B - 0.052, 0.1], [0, B - 0.03, 0.085]], [0.0028, 0.0028, 0.0028, 0.0028], 6); // trigger guard
    plain(ctx, "oklch(0.2 0.01 260)", 0.8);
    const g = (t) => [0.07 - t * 0.03, B - 0.04 - t * 0.09]; for (let k = 0; k < 5; k++) { const [z, y] = g(k / 5), [, y2] = g((k + 1) / 5); bar(ctx, 0, (y + y2) / 2, 0.0135, (y - y2) / 2 + 0.002, z - 0.03, z + 0.004, 0.005); } // pistol grip
    for (let k = 0; k < 6; k++) bar(ctx, 0, B - 0.045 - k * 0.012, 0.0115, 0.0065, 0.15 + k * 0.004, 0.19 + k * 0.004, 0.003); // curved magazine
    rod(ctx, [[0, B + 0.0, -0.02], [0, B + 0.0, -0.17]], [0.0165, 0.0175], M); // the stock's buffer tube
    bar(ctx, 0, B - 0.014, 0.0145, 0.03, -0.17, -0.1, 0.005); // the stock, adjustable
    plain(ctx, "oklch(0.14 0.01 60)", 0.95); bar(ctx, 0, B - 0.014, 0.0155, 0.036, -0.175, -0.165, 0.004); // butt pad
  },
  soup_bowl(ctx, M, hi) { // a chipped blue-rimmed enamel camp bowl, axis along +Z (the hand holds it upright): curved wall, foot ring, broth with fat beads, carrot and meat, a bent tin spoon
    const R = (z) => [0, Y, z], N = hi ? 24 : 12;
    plain(ctx, "oklch(0.93 0.015 95)", 0.22, 0.1); // white enamel, glossy
    rod(ctx, [R(0.0), R(0.006), R(0.018), R(0.034), R(0.052), R(0.068)], [0.032, 0.046, 0.062, 0.074, 0.082, 0.086], N); // the curved outer wall
    plain(ctx, "oklch(0.86 0.02 90)", 0.35);
    rod(ctx, [R(-0.004), R(0.004)], [0.034, 0.036], N); // foot ring
    plain(ctx, "oklch(0.38 0.11 255)", 0.25, 0.15);
    rod(ctx, [R(0.064), R(0.072)], [0.087, 0.087], N); // cobalt enamel rim
    plain(ctx, "oklch(0.2 0.02 60)", 0.6);
    rod(ctx, [R(0.0705), R(0.0725)], [0.022, 0.022], 6); // a chip in the rim, black iron showing
    plain(ctx, "oklch(0.52 0.12 58)", 0.15, 0.05); // broth: deep amber, wet
    rod(ctx, [R(0.058), R(0.063)], [0.079, 0.08], N);
    plain(ctx, "oklch(0.78 0.13 80)", 0.05);
    for (const [x, y] of [[0.03, 0.02], [-0.04, -0.01], [0.012, -0.045], [-0.02, 0.04], [0.05, -0.02]]) rod(ctx, [[x, Y + y, 0.0625], [x, Y + y, 0.0645]], [0.006, 0.006], 6); // fat beads
    plain(ctx, "oklch(0.66 0.17 45)", 0.5);
    for (const [x, y] of [[0.028, -0.018], [-0.035, 0.022]]) rod(ctx, [[x, Y + y, 0.06], [x, Y + y, 0.068]], [0.011, 0.011], 8); // carrot coins
    plain(ctx, "oklch(0.36 0.06 40)", 0.7);
    for (const [x, y] of [[-0.012, -0.028], [0.04, 0.03], [-0.045, -0.035]]) rod(ctx, [[x, Y + y, 0.059], [x, Y + y, 0.069]], [0.013, 0.01], 7); // meat. do not ask
    steel(ctx, "oklch(0.72 0.01 250)", 0.35);
    rod(ctx, [[0.02, Y + 0.01, 0.055], [0.06, Y + 0.05, 0.09], [0.09, Y + 0.08, 0.13]], [0.004, 0.004, 0.005], 6); // the spoon handle leaning on the rim
    rod(ctx, [[0.0, Y - 0.008, 0.05], [0.02, Y + 0.01, 0.055]], [0.014, 0.01], 8); // its bowl, sunk in the broth
  },
  fishing_rod(ctx, M, hi) { // Salvaged fiberglass & cork spinning rod: cork handle, brass & steel reel, line guides, red-and-white bobber & barbed hook
    plain(ctx, "oklch(0.18 0.01 250)", 0.85);
    rod(ctx, [[0, Y, -0.025], [0, Y, 0.005]], [0.015, 0.016], M); // rubber butt cap
    wood(ctx, "oklch(0.76 0.09 72)");
    rod(ctx, [[0, Y, 0.005], [0, Y, 0.16]], [0.015, 0.0145], M); // lower cork grip
    rod(ctx, [[0, Y, 0.25], [0, Y, 0.34]], [0.014, 0.011], M); // fore cork grip
    steel(ctx, "oklch(0.32 0.02 250)", 0.4);
    rod(ctx, [[0, Y, 0.16], [0, Y, 0.25]], [0.0155, 0.0155], M); // threaded reel seat
    // Spinning reel mounted under the reel seat
    rod(ctx, [[0, Y, 0.205], [0, Y - 0.042, 0.215]], [0.0055, 0.0065], 8); // reel stem
    plain(ctx, "oklch(0.28 0.03 235)", 0.35, 0.85);
    rod(ctx, [[0, Y - 0.048, 0.185], [0, Y - 0.048, 0.245]], [0.02, 0.022], M); // reel body & spool
    plain(ctx, "oklch(0.74 0.13 80)", 0.3, 0.9);
    rod(ctx, [[0, Y - 0.048, 0.21], [0, Y - 0.048, 0.238]], [0.023, 0.023], M); // brass line spool
    rod(ctx, [[0.02, Y - 0.048, 0.21], [0.045, Y - 0.056, 0.195]], [0.0035, 0.004], 6); // crank handle
    // Tapered fiberglass rod blank (amber-teal marine rod)
    plain(ctx, "oklch(0.52 0.09 75)", 0.35, 0.15);
    rod(ctx, [[0, Y, 0.34], [0, Y + 0.004, 0.65], [0, Y + 0.014, 0.95], [0, Y + 0.028, 1.22]], [0.0085, 0.006, 0.0038, 0.002], M);
    // Wire line guides (eyelets) along the blank
    steel(ctx, "oklch(0.82 0.01 250)", 0.25);
    for (const [gz, gy, gr] of [[0.48, 0.002, 0.012], [0.72, 0.006, 0.009], [0.96, 0.015, 0.007], [1.21, 0.028, 0.005]]) {
      rod(ctx, [[0, Y + gy - gr, gz], [0, Y + gy - gr, gz + 0.006]], [gr, gr], 8);
    }
    // Hanging monofilament line, red-white bobber float & steel fishhook at the tip
    if (hi) {
      plain(ctx, "oklch(0.88 0.02 220)", 0.2);
      rod(ctx, [[0, Y + 0.026, 1.215], [0, Y - 0.055, 1.21]], [0.0012, 0.0012], 5); // dangling line
    }
    plain(ctx, "oklch(0.58 0.22 28)", 0.3);
    rod(ctx, [[0, Y - 0.02, 1.212], [0, Y - 0.034, 1.212]], [0.006, 0.011], 8); // red bobber top
    plain(ctx, "oklch(0.95 0.01 90)", 0.3);
    rod(ctx, [[0, Y - 0.034, 1.212], [0, Y - 0.048, 1.212]], [0.011, 0.005], 8); // white bobber bottom
    steel(ctx, "oklch(0.85 0.01 250)", 0.2);
    rod(ctx, [[0, Y - 0.052, 1.21], [0, Y - 0.072, 1.21], [0.008, Y - 0.076, 1.218], [0.014, Y - 0.064, 1.22]], [0.0018, 0.0018, 0.0016, 0.0008], 6); // J-hook
  },
};

// Tripo meshes, sampled along their length in their own file frame: rows [z, x, y, r] (r: the thinner half-width there).
// The look on a mesh follows these; a kind whose mesh lies on a slant (fire axe, shotgun) wears no drawn look, its name and stats carry it.
import { MESHPROF } from './lib/weapon-prof.js'
const SCRIPTED = { // grip and head along +Z, and the radius there, for the kinds drawn by the builders above
  table_leg: { grip: [0.02, 0.2, 0.036], head: [0.45, 0.68, 0.04] }, pipe_scrap: { grip: [0.2, 0.34, 0.033], head: [0.5, 0.74, 0.032] },
  crowbar: { grip: [0.06, 0.26, 0.019], head: [0.5, 0.7, 0.018] }, bat: { grip: [0.03, 0.28, 0.025], head: [0.66, 0.95, 0.05] },
  hatchet: { grip: [0.02, 0.26, 0.022], head: [0.4, 0.6, 0.021] }, fire_axe: { grip: [0.1, 0.3, 0.028], head: [0.5, 0.8, 0.025] },
  rebar: { grip: [0.05, 0.26, 0.018], head: [0.4, 0.8, 0.013] }, wrench: { grip: [0.04, 0.32, 0.019], head: [0.3, 0.4, 0.019] },
  screwdriver: { grip: [0.0, 0.11, 0.021], head: [0.14, 0.26, 0.006] }, sledgehammer: { grip: [0.0, 0.24, 0.022], head: [0.6, 0.82, 0.018] },
  stun_baton: { grip: [0.0, 0.19, 0.02], head: [0.4, 0.54, 0.012] }, lineman_machete: { grip: [0.01, 0.17, 0.017], head: [0.4, 0.66, 0.004] },
  golf_club: { grip: [0.0, 0.3, 0.014], head: [0.86, 0.94, 0.02] }, tire_iron: { grip: [0.0, 0.3, 0.0105], head: [0.5, 0.6, 0.012] },
  pickaxe: { grip: [0.0, 0.3, 0.022], head: [0.8, 0.9, 0.02] }, baton: { grip: [0.02, 0.17, 0.0165], head: [0.4, 0.6, 0.0145] },
  cleaver: { grip: [0.0, 0.13, 0.0155], head: [0.14, 0.33, 0.01] },
  revolver: { grip: [0.02, 0.1, 0.016], head: [0.2, 0.3, 0.03], mag: [0.2, 0.3, -0.03] }, coach_gun: { grip: [0.0, 0.1, 0.02], head: [0.3, 0.6, 0.0135] },
  lever_rifle: { grip: [0.0, 0.1, 0.02], head: [0.3, 0.6, 0.011] }, hunting_rifle: { grip: [0.0, 0.1, 0.02], head: [0.3, 0.7, 0.012] },
  carbine: { grip: [0.0, 0.1, 0.02], head: [0.3, 0.5, 0.021] }, fishing_rod: { grip: [0.0, 0.28, 0.015], head: [0.7, 1.22, 0.005] }, soup_bowl: { grip: [0.0, 0.03, 0.06], head: [0.04, 0.07, 0.086] },
  pistol: { grip: [0.02, 0.06, 0.016], head: [0.08, 0.2, 0.016], mag: [0.018, 0.05, -0.085] }, shotgun: { grip: [0.44, 0.6, 0.03], head: [0.62, 0.8, 0.02] },
};
// where the shaft is at z: [x, y, r]
function shaftAt(z, mp, r0) {
  if (!mp?.p) return [0, Y, r0];
  const p = mp.p; if (z <= p[0][0]) return p[0].slice(1); if (z >= p[p.length - 1][0]) return p[p.length - 1].slice(1);
  for (let i = 1; i < p.length; i++) if (z <= p[i][0]) { const a = p[i - 1], b = p[i], t = (z - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; }
}
const LIME = "oklch(0.84 0.2 128)", DUCT = "oklch(0.62 0.01 250)", LEATHER = "oklch(0.42 0.07 50)";
// one band around the shaft from z0 to z1, r scaled
function band(ctx, z0, z1, mp, r0, k, M) { const [x, y, r] = shaftAt((z0 + z1) / 2, mp, r0); rod(ctx, [[x, y, z0], [x, y, z1]], [r * k, r * k], M); }
function overlay(ctx, kind, look, mesh, M, hi) {
  const mp = mesh ? MESHPROF[kind] : null;
  if (mesh && (!mp || (!mp.p && look !== "mag"))) return; // a slanted mesh, or a pistol's only drawn look is its magazine
  // a scripted shape stands on its lowest point: a speck at the origin keeps the look in the weapon's own frame
  // (a look reaching below 0, the pistol's magazine, is lifted back by its child's feetPosition in weapon-look.js)
  ctx.color(BLACK); rod(ctx, [[0, 0, 0], [0, 0.0004, 0]], [0.0002, 0.0002], 3);
  const sz = SCRIPTED[kind] ?? SCRIPTED.table_leg, [g0, g1] = mp?.grip ?? sz.grip, [h0, h1] = mp?.head ?? sz.head, gr = sz.grip[2], hr = sz.head[2];
  if (look === "rust") { // flaking rust blooms down the shaft
    ctx.albedo(null); ctx.color(RUST); ctx.roughness(1); ctx.metalness(0.1);
    for (const t of [0.1, 0.4, 0.65, 0.9]) { const z = g1 + (h1 - g1) * t; band(ctx, z, z + 0.02 + t * 0.02, mp, gr + (hr - gr) * t, 1.08, M); }
  } else if (look === "tape") { // grey duct tape wound over the grip
    ctx.albedo(null); ctx.color(DUCT); ctx.roughness(0.55);
    for (let z = g0; z < g1; z += 0.016) band(ctx, z, z + 0.013, mp, gr, 1.12, M);
  } else if (look === "nails") { // nails hammered through the head, a few bent
    ctx.albedo(STEELTEX); ctx.color("oklch(0.72 0.01 250)"); ctx.metalness(0.8); ctx.roughness(0.4);
    const n = hi ? 10 : 6;
    for (let k = 0; k < n; k++) { const z = h0 + ((k + 0.5) / n) * (h1 - h0), [x, y, r] = shaftAt(z, mp, hr), a = k * 2.4, b = k % 3 === 0 ? 0.02 : 0; rod(ctx, [[x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, z], [x + Math.cos(a) * (r + 0.045), y + Math.sin(a) * (r + 0.045), z + 0.008 + b]], [0.0035, 0.0015], 4); }
    ctx.albedo(null); ctx.color("oklch(0.3 0.1 25)"); ctx.roughness(0.7); band(ctx, h0 + (h1 - h0) * 0.3, h0 + (h1 - h0) * 0.55, mp, hr, 1.04, M); // an old stain
  } else if (look === "edge") { // a leather-wrapped grip; scripted blades also get a freshly ground edge
    ctx.albedo(null); ctx.color(LEATHER); ctx.roughness(0.8);
    for (let z = g0; z < g1; z += 0.014) band(ctx, z, z + 0.012, mp, gr, 1.1, M);
    const e = !mp && { hatchet: [0.185, 0.62, 0.84], fire_axe: [0.235, 0.8, 1.08], rebar: [0.032, 0.94, 1.04], screwdriver: [0, 0.27, 0.3], lineman_machete: [0.042, 0.3, 0.62] }[kind];
    if (e) { ctx.color("oklch(0.97 0.005 250)"); ctx.metalness(1); ctx.roughness(0.08); bar(ctx, e[0], Y, 0.0025, 0.004, e[1], e[2], 0.001, 1); }
  } else if (look === "meg") { // M.E.G. property: lime paint bands and a stamped tag
    ctx.albedo(null); ctx.color(LIME); ctx.roughness(0.45);
    band(ctx, g1 + 0.005, g1 + 0.025, mp, gr, 1.08, M); band(ctx, h0, h0 + 0.015, mp, hr, 1.08, M);
    const [x, y, r] = shaftAt(g0 + 0.045, mp, gr);
    ctx.color("oklch(0.75 0.01 250)"); ctx.metalness(0.9); ctx.roughness(0.35); bar(ctx, x + r * 1.1 + 0.002, y, 0.0015, 0.012, g0 + 0.03, g0 + 0.06, 0.0008, 1);
  } else if (look === "mag") { // an extended magazine out of the grip, brass base plate
    const [m0, m1, my] = mp?.mag ?? sz.mag ?? [0.02, 0.05, -0.085];
    ctx.albedo(STEELTEX); ctx.color("oklch(0.22 0.01 260)"); ctx.metalness(0.6); ctx.roughness(0.45); bar(ctx, 0, my, 0.0115, 0.035, m0, m1, 0.003);
    ctx.color("oklch(0.75 0.13 85)"); ctx.metalness(0.9); bar(ctx, 0, my - 0.035, 0.0125, 0.004, m0 - 0.002, m1 + 0.002, 0.002);
  } else if (look === "sawn" && !mp) { // the hacksawn muzzle, bright at the cut
    ctx.albedo(null); ctx.color("oklch(0.8 0.01 250)"); ctx.metalness(1); ctx.roughness(0.2); rod(ctx, [[0, Y + 0.026, 0.917], [0, Y + 0.026, 0.925]], [0.02, 0.02], M);
  }
}

export function geometry(ctx) {
  const k0 = String(ctx.params?.kind ?? "").split("~")[0], kind = W[k0] ? k0 : "table_leg", hi = ctx.lod <= 2, M = hi ? 18 : 8;
  ctx.smooth();
  if (ctx.params?.look) overlay(ctx, kind, ctx.params.look, !!ctx.params.mesh, M, hi);
  else (builders[kind] ?? builders.table_leg)(ctx, M, hi);
  ctx.albedo(null); ctx.color(null); ctx.metalness(0);
}
export function collider() { return null; }
