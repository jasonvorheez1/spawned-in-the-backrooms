// Level 11 "office under renovation" kit (Wikidot image 5). params.kind:
//  "shell":     the gutted ground floor, 18 x 18 m, origin at the floor's centre, feet at y 0. Painted block walls west and north,
//               a half-finished steel-stud wall on the south side (studs, track, a few drywall sheets hung), a concrete ceiling
//               slab at 5.7 m with two downstand beams, four chamfered square concrete columns, a suspended T-bar grid at 4.6 m
//               with only some tiles in, a round spiral duct, and the steel storefront frame on the east (street) face:
//               mullions every 2 m, a transom bar, a door opening at z -2..0. The glass panes stay their own placements.
//  "ladder":    a 2.8 m aluminium A-frame step ladder, feet at y 0.
//  "worklight": a halogen work light on a tripod stand, 1.8 m, the lamp head facing +z.
//  "sawhorse":  a plywood work table on two steel sawhorses, 2.4 x 1.2, top at 0.86.
// Vertex colours carry the paint; the placement's material is white.
import { path } from "./lib/l5-hall-kit.js";
const BLOCK = "oklch(0.8 0.025 85)", BLOCK_DIRTY = "oklch(0.68 0.03 75)", CONC = "oklch(0.7 0.015 80)", CONC_DARK = "oklch(0.55 0.015 80)";
const STUD = "oklch(0.78 0.01 240)", DRY = "oklch(0.9 0.015 90)", DRY_TAPE = "oklch(0.95 0.01 90)", FRAME = "oklch(0.3 0.01 250)";
const GRID = "oklch(0.92 0.005 90)", TILE = "oklch(0.86 0.02 90)", DUCT = "oklch(0.8 0.005 240)", ALU = "oklch(0.82 0.01 240)";
const YEL = "oklch(0.8 0.16 85)", BLACK = "oklch(0.2 0.01 250)", PLY = "oklch(0.72 0.07 70)", RUB = "oklch(0.16 0.01 250)";

function box(ctx, x0, y0, z0, x1, y1, z1) {
  const q = (a, b, c, e) => ctx.quad(...a, ...b, ...c, ...e);
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}
function beam(ctx, a, b, t) { // a square bar from a to b
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1, u = d.map((v) => v / L);
  const ref = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let s = [u[1] * ref[2] - u[2] * ref[1], u[2] * ref[0] - u[0] * ref[2], u[0] * ref[1] - u[1] * ref[0]];
  const sl = Math.hypot(...s); s = s.map((v) => (v / sl) * t / 2);
  const w = [u[1] * s[2] - u[2] * s[1], u[2] * s[0] - u[0] * s[2], u[0] * s[1] - u[1] * s[0]];
  const c = (p, i, j) => [p[0] + s[0] * i + w[0] * j, p[1] + s[1] * i + w[1] * j, p[2] + s[2] * i + w[2] * j];
  const K = [[1, 1], [-1, 1], [-1, -1], [1, -1]], A = K.map(([i, j]) => c(a, i, j)), B = K.map(([i, j]) => c(b, i, j));
  for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; ctx.quad(...A[k], ...A[n], ...B[n], ...B[k]); }
  ctx.quad(...A[3], ...A[2], ...A[1], ...A[0]); ctx.quad(...B[0], ...B[1], ...B[2], ...B[3]);
}
// a tube along X from x0 to x1 at (y, z), radius r, n sides
function tubeX(ctx, x0, x1, y, z, r, n) {
  for (let j = 0; j < n; j++) {
    const a0 = (j / n) * 6.2832, a1 = ((j + 1) / n) * 6.2832;
    const p = (x, a) => [x, y + Math.cos(a) * r, z + Math.sin(a) * r];
    ctx.quad(...p(x0, a0), ...p(x0, a1), ...p(x1, a1), ...p(x1, a0));
  }
}
// a chamfered square column, half-size h, chamfer c
function column(ctx, x, z, h, c, y0, y1) {
  const P = [[h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c], [-h + c, -h], [h - c, -h], [h, -h + c]];
  for (let i = 0; i < 8; i++) { const a = P[i], b = P[(i + 1) % 8]; ctx.quad(x + b[0], y0, z + b[1], x + a[0], y0, z + a[1], x + a[0], y1, z + a[1], x + b[0], y1, z + b[1]); }
}

function shell(ctx, lod) {
  const H = 5.7, hx = 9, hz = 9, t = 0.25;
  // painted block walls: a dirty band at the foot, the block coursing as shallow joints
  ctx.color(BLOCK_DIRTY); box(ctx, -hx - t, 0, -hz - t, -hx, 0.6, hz + t); box(ctx, -hx - t, 0, -hz - t, hx, 0.6, -hz);
  ctx.color(BLOCK); box(ctx, -hx - t, 0.6, -hz - t, -hx, H, hz + t); box(ctx, -hx, 0.6, -hz - t, hx, H, -hz);
  if (lod < 3) {
    ctx.color("oklch(0.72 0.02 85)");
    for (let y = 0.8; y < H; y += 0.4) { box(ctx, -hx - 0.002, y, -hz, -hx + 0.004, y + 0.012, hz); box(ctx, -hx, y, -hz - 0.002, hx, y + 0.012, -hz + 0.004); }
  }
  // the south wall, mid-build: bottom and top track, studs every 0.6 m, drywall sheets hung on the west half only
  const zS = hz;
  ctx.color(STUD); box(ctx, -hx, 0, zS - 0.05, hx - 0.4, 0.05, zS + 0.05); box(ctx, -hx, H - 0.06, zS - 0.05, hx - 0.4, H, zS + 0.05);
  for (let x = -hx + 0.3; x < hx - 0.4; x += 0.6) box(ctx, x - 0.02, 0.05, zS - 0.045, x + 0.02, H - 0.06, zS + 0.045);
  ctx.color(DRY);
  for (const [x0, x1, y1] of [[-9, -7.8, 2.44], [-7.8, -6.6, 2.44], [-6.6, -5.4, 2.44], [-9, -7.8, 4.88], [-7.8, -6.6, 4.1], [-5.4, -4.2, 2.44]]) box(ctx, x0 + 0.005, y1 - 2.44 + 0.02, zS - 0.065, x1 - 0.005, y1, zS - 0.05);
  ctx.color(DRY_TAPE); for (const x of [-7.8, -6.6]) box(ctx, x - 0.05, 0.05, zS - 0.068, x + 0.05, 2.44, zS - 0.064);
  // ceiling slab and its downstand beams
  ctx.color(CONC_DARK); box(ctx, -hx - t, H, -hz - t, hx + 0.2, H + 0.3, hz + t);
  ctx.color(CONC); for (const z of [-5, 5]) box(ctx, -hx, H - 0.5, z - 0.25, hx + 0.2, H, z + 0.25);
  // four chamfered columns, a scuffed collar at the foot
  for (const [x, z] of [[-4, -5], [4, -5], [-4, 5], [4, 5]]) { ctx.color(CONC_DARK); column(ctx, x, z, 0.36, 0.06, 0, 0.5); ctx.color(CONC); column(ctx, x, z, 0.35, 0.06, 0.5, H - 0.5); }
  // suspended T-bar grid at 4.6 m, a third of the tiles in, the rest open to the slab
  const gy = 4.6;
  ctx.color(GRID);
  for (let x = -8.4; x <= 8.4; x += 1.2) box(ctx, x - 0.012, gy, -8.4, x + 0.012, gy + 0.04, 8.4);
  for (let z = -8.4; z <= 8.4; z += 0.6) box(ctx, -8.4, gy, z - 0.012, 8.4, gy + 0.04, z + 0.012);
  if (lod < 3) {
    ctx.color("oklch(0.4 0.01 250)");
    for (let x = -7.8; x <= 7.8; x += 2.4) for (let z = -7.8; z <= 7.8; z += 2.4) beam(ctx, [x, gy + 0.04, z], [x, H - 0.02, z], 0.006); // hanger wires
    ctx.color(TILE);
    let k = 0;
    for (let i = 0; i < 14; i++) for (let j = 0; j < 28; j++) {
      k = (k * 1103 + i * 31 + j * 17 + 7) % 97;
      if (k > 34 || (i > 3 && i < 9)) continue; // the middle bays stripped for the duct run
      const x0 = -8.4 + i * 1.2, z0 = -8.4 + j * 0.6, sag = k % 5 === 0 ? 0.04 : 0;
      box(ctx, x0 + 0.014, gy + 0.02 - sag, z0 + 0.014, x0 + 1.186, gy + 0.035 - sag, z0 + 0.586);
    }
  }
  if(lod<3){
    ctx.color(BLACK);
    for(const [x,z,sag]of [[-7.6,-6.4,1.15],[-6.4,-4.1,.85],[-5.2,-6.1,1.4],[-3.4,6.3,1.1]])
      path(ctx,[[x,gy,z],[x+.12,gy-.4,z+.08],[x+.22,gy-sag,z+.14],[x+.38,gy-sag-.12,z+.04]],.008,6);
  }
  // the main duct: round, spiral seams, hung on straps, a branch to the north wall
  const n = lod >= 3 ? 8 : 16;
  ctx.color(DUCT); tubeX(ctx, -8.8, 8.6, 5.1, 0, 0.36, n);
  ctx.color("oklch(0.7 0.005 240)"); for (let x = -8.4; x < 8.6; x += 1.5) tubeX(ctx, x, x + 0.06, 5.1, 0, 0.375, n);
  ctx.color(STUD); for (let x = -7.5; x < 8.6; x += 3) { beam(ctx, [x, 5.1, -0.4], [x, H - 0.5, -0.4], 0.03); beam(ctx, [x, 5.1, 0.4], [x, H - 0.5, 0.4], 0.03); beam(ctx, [x, 4.72, -0.4], [x, 4.72, 0.4], 0.03); }
  ctx.color(DUCT); for (let j = 0; j < n; j++) { const a0 = (j / n) * 6.2832, a1 = ((j + 1) / n) * 6.2832, r = 0.24, px = -3; ctx.quad(px + Math.cos(a0) * r, 5.1 + Math.sin(a0) * r, -0.3, px + Math.cos(a1) * r, 5.1 + Math.sin(a1) * r, -0.3, px + Math.cos(a1) * r, 5.1 + Math.sin(a1) * r, -8.9, px + Math.cos(a0) * r, 5.1 + Math.sin(a0) * r, -8.9); }
  // the storefront frame on the east face: sill, head, transom, mullions every 2 m, the door opening at z -2..0
  const xe = hx - 0.2;
  ctx.color(FRAME);
  box(ctx, xe - 0.08, 0, -hz, xe + 0.08, 0.2, -2); box(ctx, xe - 0.08, 0, 0, xe + 0.08, 0.2, hz);
  box(ctx, xe - 0.08, 4.4, -hz, xe + 0.08, 4.62, hz); box(ctx, xe - 0.06, 3.05, -hz, xe + 0.06, 3.15, hz);
  for (const z of [-9, -7, -5, -3, -2, 0, 2, 4, 6, 8, 9]) box(ctx, xe - 0.07, 0, z - 0.05, xe + 0.07, 4.4, z + 0.05);
  ctx.color(CONC_DARK); box(ctx, xe - 0.1, 4.62, -hz - t, hx + 0.2, H, hz + t); // fascia over the glass
  // a blue tarp hung over the door head
  ctx.color("oklch(0.48 0.13 250)"); box(ctx, xe + 0.1, 3.4, -2.1, xe + 0.12, 4.4, 0.1);
}

function ladder(ctx) {
  const H = 2.8, w0 = 0.5, w1 = 0.36, sf = 0.55, sb = 0.6;
  ctx.color(ALU);
  for (const s of [-1, 1]) { beam(ctx, [s * w0 / 2, 0.02, sf], [s * w1 / 2, H - 0.05, 0.02], 0.05); beam(ctx, [s * w0 / 2, 0.02, -sb], [s * w1 / 2, H - 0.05, -0.02], 0.04); }
  for (let i = 1; i <= 7; i++) { const t = i / 8, y = t * (H - 0.1), z = sf * (1 - t), w = w0 + (w1 - w0) * t; box(ctx, -w / 2, y - 0.02, z - 0.05, w / 2, y + 0.02, z + 0.05); }
  beam(ctx, [-0.2, 1.0, -sb * 0.64], [0.2, 1.0, -sb * 0.64], 0.025);
  ctx.color(YEL); box(ctx, -w1 / 2 - 0.03, H - 0.08, -0.14, w1 / 2 + 0.03, H, 0.14); // the yellow top cap
  ctx.color(BLACK); beam(ctx, [0.18, 1.2, 0.25], [0.18, 1.2, -0.3], 0.012); beam(ctx, [-0.18, 1.2, 0.25], [-0.18, 1.2, -0.3], 0.012); // spreader bars
  ctx.color(RUB); for (const s of [-1, 1]) { box(ctx, s * w0 / 2 - 0.04, 0, sf - 0.04, s * w0 / 2 + 0.04, 0.04, sf + 0.04); box(ctx, s * w0 / 2 - 0.035, 0, -sb - 0.035, s * w0 / 2 + 0.035, 0.04, -sb + 0.035); }
}
function worklight(ctx) {
  ctx.color(YEL);
  for (let i = 0; i < 3; i++) { const a = i * 2.094; beam(ctx, [Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55], [0, 0.75, 0], 0.03); }
  ctx.color(BLACK); beam(ctx, [0, 0.7, 0], [0, 1.65, 0], 0.035); box(ctx, -0.05, 0.72, -0.05, 0.05, 0.8, 0.05);
  beam(ctx, [-0.25, 1.65, 0], [0.25, 1.65, 0], 0.03);
  for (const s of [-1, 1]) { ctx.color(YEL); box(ctx, s * 0.25 - 0.13, 1.6, -0.08, s * 0.25 + 0.13, 1.84, 0.08); ctx.color(BLACK); for (let k = 0; k < 4; k++) box(ctx, s * 0.25 - 0.12 + k * 0.07, 1.62, -0.1, s * 0.25 - 0.1 + k * 0.07, 1.82, -0.08); ctx.color("oklch(0.98 0.05 90)"); box(ctx, s * 0.25 - 0.11, 1.62, 0.08, s * 0.25 + 0.11, 1.82, 0.095); }
  ctx.color(RUB); for (let i = 0; i < 3; i++) { const a = i * 2.094; box(ctx, Math.cos(a) * 0.55 - 0.04, 0, Math.sin(a) * 0.55 - 0.04, Math.cos(a) * 0.55 + 0.04, 0.03, Math.sin(a) * 0.55 + 0.04); }
}
function sawhorse(ctx) {
  ctx.color(PLY); box(ctx, -1.2, 0.82, -0.6, 1.2, 0.86, 0.6);
  ctx.color("oklch(0.6 0.06 65)"); box(ctx, -1.2, 0.82, -0.6, 1.2, 0.86, -0.59);
  for (const x of [-0.85, 0.85]) {
    ctx.color("oklch(0.62 0.17 40)"); box(ctx, x - 0.04, 0.74, -0.55, x + 0.04, 0.82, 0.55);
    ctx.color(BLACK); for (const z of [-0.45, 0.45]) { beam(ctx, [x - 0.28, 0, z], [x, 0.76, z * 0.9], 0.035); beam(ctx, [x + 0.28, 0, z], [x, 0.76, z * 0.9], 0.035); }
  }
}

export function geometry(ctx) {
  const p = ctx.params ?? {}, lod = ctx.lod ?? 1;
  ctx.smooth?.();
  if (p.kind === "ladder") return ladder(ctx);
  if (p.kind === "worklight") return worklight(ctx);
  if (p.kind === "sawhorse") return sawhorse(ctx);
  return shell(ctx, lod);
}
