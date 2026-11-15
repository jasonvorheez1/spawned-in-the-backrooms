// Level 1.1's hall: one mesh per 40 m chunk (params.c), cast from scripts/lib/level1c.js slice by slice.
// Each slice is open across some stretches of v; a wall stands wherever open meets closed, so bays, the widened rooms,
// the service gap and Sector 4's sway all come out of the same pass. Sector 4's missing floor is drawn and left out of the collider.
import { slice, minus, floorY, ceilY, DX, CHUNK, DEEP, SLICES, S4, DROPS, BLOCKS, voidLane, hash } from "./lib/level1c.js";
import { face as face0, slab as slab0 } from "./lib/shapes.js";
// each chunk is its own object standing at its middle (visibleRange is measured from there), so every x is taken off that
let OX = 0;
const sh = (p) => [p[0] - OX, p[1], p[2]];
const face = (ctx, a, b, c, d, n) => face0(ctx, sh(a), sh(b), sh(c), sh(d), n);
const slab = (ctx, c, h) => slab0(ctx, sh(c), h);
const BLOCK = "cdn/texture-painted-cinder-block-wall-clean.png", TILE = "cdn/texture-small-white-square-bathroom-floor-tiles-grey-grout.png", CEIL = "cdn/texture-white-acoustic-drop-ceiling-tile-grid.png";
const E = 1e-4, GREEN = "oklch(0.86 0.27 145)", MAG = "oklch(0.7 0.3 330)", WHITE = "oklch(1 0 0)";
const TINT2 = ["oklch(0.97 0.005 240)", "oklch(0.96 0.05 150)", "oklch(0.97 0.005 240)", "oklch(0.94 0.06 330)", "oklch(0.95 0.04 200)"];
function paint(ctx, s, part) {
  ctx.emissive(null); ctx.metalness(0);
  if (s.sec === 1) {
    if (part === "wall") { ctx.albedo(BLOCK); ctx.color("oklch(0.97 0.004 240)"); ctx.roughness(0.7); }
    else if (part === "floor") { ctx.albedo(TILE); ctx.color("oklch(0.5 0.11 250)"); ctx.roughness(0.3); }
    else { ctx.albedo(CEIL); ctx.color("oklch(0.95 0.004 240)"); ctx.roughness(0.9); }
  } else if (s.sec === 2) {
    const t = TINT2[Math.floor(hash(Math.floor(s.um / 10), 21, 3) * TINT2.length)];
    if (part === "wall") { ctx.albedo(BLOCK); ctx.color(t); ctx.roughness(0.55); }
    else if (part === "floor") { ctx.albedo(TILE); ctx.color(hash(Math.floor(s.um / 10), 22, 3) < 0.3 ? "oklch(0.8 0.1 330)" : "oklch(0.9 0.03 190)"); ctx.roughness(0.15); }
    else { ctx.albedo(CEIL); ctx.color(t); ctx.roughness(0.9); }
  } else if (s.sec === 3) {
    if (part === "wall") { ctx.albedo(BLOCK); ctx.color("oklch(0.3 0.03 340)"); ctx.roughness(0.6); }
    else if (part === "floor") { ctx.albedo(null); ctx.color("oklch(0.12 0.015 320)"); ctx.roughness(0.35); }
    else { ctx.albedo(null); ctx.color("oklch(0.1 0.01 320)"); ctx.roughness(0.9); }
  } else { ctx.albedo(null); ctx.color(part === "void" ? "oklch(0.012 0 0)" : part === "floor" ? "oklch(0.05 0 0)" : "oklch(0.03 0 0)"); ctx.roughness(part === "floor" ? 0.5 : 0.95); }
}
// the floor of a slice as pieces: [a, b, lane] (lane only in Sector 4's hall)
function pieces(s) {
  const out = [];
  for (const [a, b] of s.open) {
    const main = a <= s.c && b >= s.c;
    if (s.um >= S4 && main) { const w = (b - a) / 3; for (let l = 0; l < 3; l++) out.push([a + l * w, a + (l + 1) * w, l]); }
    else if (s.sec === 2 && main && DROPS.some((d) => s.um > d.from && s.um < d.to)) out.push([a, 0, -1, 1], [0, b, -1, 1]);
    else out.push([a, b, -1]);
  }
  return out;
}
const line = (ctx, u0, y0, u1, y1, va, vb, n = [0, 1, 0]) => face(ctx, [u0, y0, va], [u1, y1, va], [u1, y1, vb], [u0, y0, vb], n);
function build(ctx, i, solid) {
  const s = slice(i), p = slice(i - 1);
  const u0 = i * DX, topA = Math.max(i > 0 ? ceilY(u0 - E) : 0, i < SLICES ? ceilY(u0 + E) : 0);
  // where this slice and the last disagree: a wall across the hall
  if (!solid) paint(ctx, s.open.length ? s : p, "wall");
  for (const [a, b] of minus(s.open, p.open)) face(ctx, [u0, DEEP, a], [u0, DEEP, b], [u0, topA, b], [u0, topA, a], [1, 0, 0]);
  for (const [a, b] of minus(p.open, s.open)) face(ctx, [u0, DEEP, a], [u0, DEEP, b], [u0, topA, b], [u0, topA, a], [-1, 0, 0]);
  if (!s.open.length) return;
  const u1 = s.u1, c0 = ceilY(u0 + E), c1 = ceilY(u1 - E);
  if (!solid && p.open.length) { const cp = ceilY(u0 - E); if (Math.abs(cp - c0) > 0.02) for (const [a, b] of minus(s.open, minus(s.open, p.open))) face(ctx, [u0, Math.min(cp, c0), a], [u0, Math.min(cp, c0), b], [u0, Math.max(cp, c0), b], [u0, Math.max(cp, c0), a], [c0 > cp ? 1 : -1, 0, 0]); }
  // side walls
  for (const [a, b] of s.open) {
    face(ctx, [u0, DEEP, a], [u1, DEEP, a], [u1, c1, a], [u0, c0, a], [0, 0, 1]);
    face(ctx, [u0, DEEP, b], [u1, DEEP, b], [u1, c1, b], [u0, c0, b], [0, 0, -1]);
  }
  // floor
  for (const [a, b, lane, cut] of pieces(s)) {
    const vm = (a + b) / 2, y0 = floorY(u0 + E, vm), y1 = floorY(u1 - E, vm), gone = lane >= 0 && voidLane(i, lane);
    if (solid && gone) continue;
    if (!solid) paint(ctx, s, gone ? "void" : "floor");
    line(ctx, u0, y0, u1, y1, a, b);
    if (s.sec === 2) { // the drops' risers
      face(ctx, [u1, DEEP, a], [u1, DEEP, b], [u1, y1, b], [u1, y1, a], [1, 0, 0]);
      face(ctx, [u0, DEEP, a], [u0, DEEP, b], [u0, y0, b], [u0, y0, a], [-1, 0, 0]);
      if (cut) { const v = a === 0 ? a : b, n = a === 0 ? -1 : 1; face(ctx, [u0, DEEP, v], [u1, DEEP, v], [u1, y1, v], [u0, y0, v], [0, 0, n]); }
    }
  }
  // a duct riser and its pipes across half the hall
  for (const [bu, side] of BLOCKS) if (bu >= u0 && bu < u1) {
    const y = floorY(bu, 0), h = ceilY(bu) - y, w = s.w;
    if (solid) { slab(ctx, [bu, y + h / 2, side * (w - (w + 0.35) / 2)], [0.5, h / 2, (w + 0.35) / 2]); continue; }
    ctx.albedo(null); ctx.emissive(null); ctx.color("oklch(0.62 0.01 240)"); ctx.metalness(0.7); ctx.roughness(0.45);
    slab(ctx, [bu, y + h / 2, side * (w - 0.45)], [0.45, h / 2, 0.45]);
    [[0.45, "oklch(0.45 0.09 40)"], [1.05, "oklch(0.55 0.02 240)"], [1.7, "oklch(0.4 0.08 150)"], [2.3, "oklch(0.5 0.02 240)"]].forEach(([py, col], k) => { ctx.color(col); slab(ctx, [bu - 0.3 + k * 0.2, y + py, side * (w - 0.9 - (w - 0.55) / 2)], [0.13, 0.13, (w - 0.55) / 2]); slab(ctx, [bu - 0.3 + k * 0.2, y + py / 2, side * -0.22], [0.13, py / 2, 0.13]); });
  }
  if (solid) return;
  // ceiling
  paint(ctx, s, "ceil");
  for (const [a, b] of s.open) line(ctx, u0, c0, u1, c1, a, b, [0, -1, 0]);
  // dressing, on the hall proper
  const a = s.c - s.w, b = s.c + s.w, hasA = s.open.some(([x]) => Math.abs(x - a) < 0.01), hasB = s.open.some(([, y]) => Math.abs(y - b) < 0.01);
  const f0 = floorY(u0 + E, s.c), f1 = floorY(u1 - E, s.c), fm = (f0 + f1) / 2, cm = (c0 + c1) / 2;
  const sides = [[a, 1, hasA], [b, -1, hasB]];
  ctx.albedo(null);
  if (s.sec <= 3) for (const [v, n, has] of sides) if (has) { // panel seams
    ctx.emissive(null); ctx.color(s.sec === 3 ? "oklch(0.2 0.02 340)" : "oklch(0.5 0.03 250)"); ctx.roughness(0.6);
    slab(ctx, [u0 + 0.03, (f0 + c0) / 2, v + n * 0.004], [0.02, (c0 - f0) / 2, 0.006]);
    if (s.sec === 1) { ctx.color("oklch(0.32 0.04 250)"); slab(ctx, [s.um, 0.06, v + n * 0.006], [DX / 2, 0.06, 0.008]); }
    if (s.sec === 2) { // the colour has come apart at every edge: green to one side, magenta to the other
      ctx.color(GREEN); ctx.emissive(GREEN); slab(ctx, [u0 - 0.05, (f0 + c0) / 2, v + n * 0.004], [0.022, (c0 - f0) / 2, 0.005]); line(ctx, u0, f0 + 0.006, u1, f1 + 0.006, v + n * 0.02, v + n * 0.09);
      ctx.color(MAG); ctx.emissive(MAG); slab(ctx, [u0 + 0.11, (f0 + c0) / 2, v + n * 0.004], [0.022, (c0 - f0) / 2, 0.005]); line(ctx, u0, c0 - 0.006, u1, c1 - 0.006, v + n * 0.02, v + n * 0.09, [0, -1, 0]);
    }
  }
  if (s.sec === 1 && i > 6 && hasA && hasB && hash(i, 5, 2) < 0.16) { // a crack in the block: pipes and a duct behind it
    const [v, n] = hash(i, 6, 2) < 0.5 ? sides[0] : sides[1], y = 0.9 + hash(i, 7, 2) * 0.8;
    ctx.emissive(null); ctx.color("oklch(0.1 0.01 250)"); ctx.roughness(1);
    [[0.42, 0.0], [0.78, 0.3], [0.6, 0.62], [0.3, 0.9]].forEach(([hw, dy], k) => face(ctx, [s.um - hw + k * 0.07, y + dy, v + n * 0.005], [s.um + hw - (3 - k) * 0.05, y + dy, v + n * 0.005], [s.um + hw - (3 - k) * 0.05, y + dy + 0.32, v + n * 0.005], [s.um - hw + k * 0.07, y + dy + 0.32, v + n * 0.005], [0, 0, n]));
    ctx.metalness(0.7); ctx.roughness(0.5);
    ctx.color("oklch(0.5 0.1 40)"); slab(ctx, [s.um, y + 0.5, v + n * 0.03], [0.6, 0.04, 0.03]);
    ctx.color("oklch(0.6 0.01 240)"); slab(ctx, [s.um + 0.05, y + 0.72, v + n * 0.035], [0.55, 0.06, 0.035]);
    ctx.color("oklch(0.45 0.07 150)"); slab(ctx, [s.um - 0.05, y + 0.28, v + n * 0.025], [0.45, 0.03, 0.025]);
    ctx.metalness(0);
  }
  // lights
  if (s.sec === 1 && i % 4 === 1) { ctx.color(WHITE); ctx.emissive("oklch(0.97 0.02 230)"); slab(ctx, [s.um, cm - 0.04, s.c], [0.75, 0.035, 0.14]); }
  if (s.sec === 2 && i % 4 === 1) { const r = hash(i, 31, 8), col = r < 0.35 ? null : r < 0.55 ? GREEN : r < 0.75 ? MAG : "oklch(0.97 0.02 230)"; ctx.color(col ?? "oklch(0.5 0.01 240)"); ctx.emissive(col); slab(ctx, [s.um, cm - 0.04, s.c], [0.75, 0.035, 0.14]); }
  if (s.um >= S4) { // Sector 4 is drawn in lines
    ctx.color(WHITE); ctx.emissive(WHITE); ctx.roughness(1);
    for (const [v, n, has] of sides) if (has) {
      line(ctx, u0, f0 + 0.008, u1, f1 + 0.008, v + n * 0.02, v + n * 0.07); line(ctx, u0, c0 - 0.008, u1, c1 - 0.008, v + n * 0.02, v + n * 0.07, [0, -1, 0]);
      face(ctx, [u0, f0, v + n * 0.006], [u0 + 0.035, f0, v + n * 0.006], [u0 + 0.035, c0, v + n * 0.006], [u0, c0, v + n * 0.006], [0, 0, n]);
    }
    line(ctx, u0, c0 - 0.008, u0 + 0.035, c0 - 0.008, a, b, [0, -1, 0]);
    if (i % 6 === 1) slab(ctx, [s.um, cm - 0.03, s.c], [1.5, 0.02, 0.32]);
    for (const k of [-1, 0, 1]) for (let d = 0; d < 4; d++) { const ua = u0 + d * 0.5 + 0.1, ub = ua + 0.28, ya = f0 + ((ua - u0) / DX) * (f1 - f0) + 0.008, yb = f0 + ((ub - u0) / DX) * (f1 - f0) + 0.008; line(ctx, ua, ya, ub, yb, s.c + k * 0.16 - 0.03, s.c + k * 0.16 + 0.03); }
  }
}
function run(ctx, solid) {
  const c = Number(ctx.params.c ?? 0); OX = c * CHUNK + CHUNK / 2;
  const i0 = (c * CHUNK) / DX, i1 = Math.min(SLICES, i0 + CHUNK / DX);
  for (let i = i0; i < i1; i++) build(ctx, i, solid);
  if (i1 === SLICES) build(ctx, SLICES, solid); // the far cap
}
export function geometry(ctx) { run(ctx, false); }
export function collider(ctx) { run(ctx, true); }
