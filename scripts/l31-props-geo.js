// Level 31 room furniture, one script, params.kind picks the piece. Origin = floor centre of the piece, front = -Z.
// seats (row of flip-down cinema seats, params.n), curtain (pleated velvet drape, params.w/h), bench (lacing bench, params.len),
// lockers (coin lockers 3 high, params.cols, params.hue), bin (fibreglass trash can), can (recessed ceiling can, origin = ceiling), casing (door trim, params.w/h).
import { tube, sphere, slab, rounded, face } from "./lib/shapes.js";
const VELVET = "cdn/texture-burgundy-velvet-cinema-seat-upholstery.png";
// a ctx that turns every quad by pitch (deg) about x, then moves it by [x,y,z]
function xf(ctx, pitch, off) {
  const c = Math.cos(pitch * Math.PI / 180), s = Math.sin(pitch * Math.PI / 180);
  const T = (x, y, z) => [x + off[0], y * c - z * s + off[1], y * s + z * c + off[2]];
  return { lod: ctx.lod, smooth: () => ctx.smooth(), flat: () => ctx.flat(), quad: (...v) => ctx.quad(...T(v[0], v[1], v[2]), ...T(v[3], v[4], v[5]), ...T(v[6], v[7], v[8]), ...T(v[9], v[10], v[11])) };
}
const mat = (ctx, col, rough = 0.6, metal = 0, tex = null) => { ctx.albedo(tex); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); };

function seats(ctx, n) {
  const P = 0.56, W = n * P, x0 = -W / 2;
  ctx.flat(); mat(ctx, "oklch(0.24 0.01 30)", 0.5, 0.1);
  for (let i = 0; i <= n; i++) { const x = x0 + i * P; // standards with an armrest cap
    rounded(ctx, [x, 0.33, 0.06], [0.028, 0.33, 0.27], 0.03);
    mat(ctx, "oklch(0.3 0.03 50)", 0.45); rounded(ctx, [x, 0.68, 0.0], [0.045, 0.025, 0.27], 0.02); mat(ctx, "oklch(0.24 0.01 30)", 0.5, 0.1); }
  for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * P, fold = i % 5 === 3; // one in five is folded up, like an empty house
    mat(ctx, "oklch(0.93 0.03 20)", 0.95, 0, VELVET);
    if (fold) rounded(xf(ctx, 80, [x, 0.5, 0.18]), [0, 0, 0], [0.23, 0.055, 0.2], 0.04);
    else rounded(ctx, [x, 0.45, -0.02], [0.23, 0.06, 0.22], 0.045);
    rounded(xf(ctx, -12, [x, 0.84, 0.25]), [0, 0, 0], [0.24, 0.32, 0.055], 0.045);
    mat(ctx, "oklch(0.22 0.01 30)", 0.55, 0.1); slab(xf(ctx, -12, [x, 0.84, 0.31]), [0, 0, 0], [0.245, 0.31, 0.012]);
    if (ctx.lod <= 1) { mat(ctx, "oklch(0.75 0.08 85)", 0.3, 0.8); slab(xf(ctx, -12, [x, 1.1, 0.33]), [0, 0, 0], [0.04, 0.02, 0.004]); } // brass seat plate
  }
  ctx.albedo(null);
}

function curtain(ctx, w, h) {
  const cols = Math.max(8, Math.round(w / (ctx.lod <= 1 ? 0.06 : 0.14))), rows = ctx.lod <= 1 ? 10 : 4, amp = 0.07;
  mat(ctx, "oklch(0.86 0.04 20)", 0.95, 0, VELVET); ctx.smooth();
  const P = (i, j) => { const x = -w / 2 + (i / cols) * w, y = 0.02 + (j / rows) * (h - 0.06), sway = 1 - 0.25 * (j / rows);
    return [x, y, Math.sin((i / cols) * w / 0.22 * Math.PI * 2) * amp * sway]; };
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) face(ctx, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), [0, 0, -1]);
  ctx.flat(); mat(ctx, "oklch(0.7 0.1 80)", 0.35, 0.85); // brass rod and finials
  tube(ctx, [[-w / 2 - 0.08, h, 0], [w / 2 + 0.08, h, 0]], [0.022, 0.022], 8, [1, 1], 0, 1, 1);
  for (const s of [-1, 1]) sphere(ctx, [s * (w / 2 + 0.11), h, 0], 0.04, 8);
  ctx.albedo(null);
}

function bench(ctx, len) {
  mat(ctx, "oklch(0.9 0.04 300)", 1, 0, "cdn/texture-black-arcade-carpet-neon-confetti-squiggles.png");
  rounded(ctx, [0, 0.44, 0], [len / 2, 0.05, 0.2], 0.035);
  mat(ctx, "oklch(0.92 0.03 75)", 0.5, 0, "cdn/texture-varnished-oak-plank-rink-barrier.png");
  rounded(ctx, [0, 0.36, 0], [len / 2 - 0.03, 0.035, 0.18], 0.015);
  ctx.albedo(null); mat(ctx, "oklch(0.7 0.01 250)", 0.35, 0.85);
  const legs = Math.max(2, Math.round(len / 1.1) + 1);
  for (let i = 0; i < legs; i++) { const x = -len / 2 + 0.12 + i * (len - 0.24) / (legs - 1);
    tube(ctx, [[x, 0.33, -0.14], [x, 0.02, -0.16]], [0.02, 0.02], 8, [1, 1], 0, 1, 1); tube(ctx, [[x, 0.33, 0.14], [x, 0.02, 0.16]], [0.02, 0.02], 8, [1, 1], 0, 1, 1);
    tube(ctx, [[x, 0.08, -0.15], [x, 0.08, 0.15]], [0.012, 0.012], 6, [1, 1], 0, 1, 1); }
  tube(ctx, [[-len / 2 + 0.12, 0.08, 0], [len / 2 - 0.12, 0.08, 0]], [0.014, 0.014], 6, [1, 1], 0, 1, 1); // foot rail
}

function lockers(ctx, cols, hue) {
  const cw = 0.4, rh = 0.62, D = 0.45, W = cols * cw, base = 0.1, H = base + 3 * rh;
  mat(ctx, "oklch(0.2 0.01 250)", 0.7); slab(ctx, [0, base / 2, 0.02], [W / 2, base / 2, D / 2 - 0.02]);
  mat(ctx, `oklch(0.62 0.09 ${hue})`, 0.45, 0.4); slab(ctx, [0, (base + H) / 2, 0], [W / 2, (H - base) / 2, D / 2]);
  rounded(ctx, [0, H + 0.02, 0], [W / 2 + 0.01, 0.025, D / 2 + 0.01], 0.012);
  for (let c = 0; c < cols; c++) for (let r = 0; r < 3; r++) {
    const x = -W / 2 + (c + 0.5) * cw, y = base + (r + 0.5) * rh;
    mat(ctx, `oklch(${r === 1 ? 0.7 : 0.66} 0.1 ${hue})`, 0.4, 0.45); slab(ctx, [x, y, -D / 2 - 0.006], [cw / 2 - 0.018, rh / 2 - 0.018, 0.006]);
    if (ctx.lod <= 2) { mat(ctx, "oklch(0.18 0.01 250)", 0.8); for (let k = 0; k < 3; k++) slab(ctx, [x, y + 0.2 - k * 0.035, -D / 2 - 0.013], [0.11, 0.006, 0.002]); }
    if (ctx.lod <= 1) { mat(ctx, "oklch(0.8 0.01 90)", 0.25, 0.9); tube(ctx, [[x + 0.12, y, -D / 2 - 0.01], [x + 0.12, y, -D / 2 - 0.04]], [0.022, 0.02], 10, [1, 1], 0, 1, 1);
      mat(ctx, "oklch(0.92 0.02 90)", 0.6); slab(ctx, [x - 0.08, y + 0.08, -D / 2 - 0.0135], [0.035, 0.02, 0.0015]); } // coin lock, number plate
  }
}

function bin(ctx) {
  mat(ctx, "oklch(0.5 0.08 55)", 0.55, 0); ctx.smooth();
  tube(ctx, [[0, 0, 0], [0, 0.3, 0], [0, 0.72, 0], [0, 0.78, 0]], [0.22, 0.235, 0.25, 0.25], 18, [1, 1], 0, 1, 2);
  mat(ctx, "oklch(0.32 0.04 55)", 0.5); tube(ctx, [[0, 0.78, 0], [0, 0.86, 0], [0, 0.95, 0]], [0.265, 0.25, 0.08], 18, [1, 1], 0, 1, 2); // domed lid
  ctx.flat(); mat(ctx, "oklch(0.1 0 0)", 0.9); slab(ctx, [0, 0.86, -0.2], [0.12, 0.04, 0.03]); // the swing flap's mouth
}

function can(ctx) {
  mat(ctx, "oklch(0.85 0.01 90)", 0.4, 0.3); ctx.smooth();
  tube(ctx, [[0, 0, 0], [0, -0.03, 0], [0, -0.05, 0]], [0.2, 0.19, 0.15], 18, [1, 1], 0, 1, 1);
  ctx.flat(); ctx.color("oklch(0.97 0.04 80)"); ctx.emissive("oklch(0.97 0.04 80)");
  tube(ctx, [[0, -0.04, 0], [0, -0.055, 0]], [0.13, 0.12], 16, [1, 1], 0, 1, 1); ctx.emissive(null);
}

function casing(ctx, w, h) {
  mat(ctx, "oklch(0.93 0.01 90)", 0.45);
  for (const s of [-1, 1]) rounded(ctx, [s * (w / 2 + 0.05), h / 2 + 0.03, 0], [0.05, h / 2 + 0.03, 0.025], 0.012);
  rounded(ctx, [0, h + 0.1, 0], [w / 2 + 0.13, 0.05, 0.03], 0.012);
  mat(ctx, "oklch(0.5 0.01 250)", 0.6, 0.7); slab(ctx, [0, 0.008, -0.03], [w / 2, 0.008, 0.08]); // threshold plate
}

export function geometry(ctx) {
  const p = ctx.params || {};
  switch (p.kind) {
    case "seats": return seats(ctx, p.n ?? 12);
    case "curtain": return curtain(ctx, p.w ?? 2.5, p.h ?? 4.5);
    case "bench": return bench(ctx, p.len ?? 2.4);
    case "lockers": return lockers(ctx, p.cols ?? 5, p.hue ?? 200);
    case "bin": return bin(ctx);
    case "can": return can(ctx);
    case "casing": return casing(ctx, p.w ?? 1.1, p.h ?? 2.2);
    default: return bench(ctx, p.len ?? 2.4); // no kind named: the lacing bench
  }
}
export function collider(ctx) {
  const p = ctx.params || {};
  switch (p.kind) {
    case "seats": return { kind: "box", width: (p.n ?? 12) * 0.56, height: 1.0, depth: 0.62, center: [0, 0.5, 0.08] };
    case "bench": default: return { kind: "box", width: p.len ?? 2.4, height: 0.5, depth: 0.42, center: [0, 0.25, 0] };
    case "lockers": return { kind: "box", width: (p.cols ?? 5) * 0.4, height: 2.0, depth: 0.46, center: [0, 1.0, 0] };
    case "bin": return { kind: "cylinder", radiusTop: 0.26, radiusBottom: 0.23, height: 0.95, center: [0, 0.475, 0] };
    case "curtain": case "can": case "casing": return null;
  }
}
