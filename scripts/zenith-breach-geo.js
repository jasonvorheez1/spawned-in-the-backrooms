// The way into Zenith Station from Level 0: the yellow wallpaper torn open in a ragged hole on the far east wall,
// the station's steel hull behind it, ribs and a header beam, frost crawling out across the carpet, cables sagging out of the gap.
// Local frame: feet on the floor at the wall's face, the wall running along local x; -z is the room, +z the wall.
import { tube, sphere, face } from "./lib/shapes.js";
const PAPER = "/cdn/value.00a4e744acf9ab763779bbb0cc7f26fb1dd20aeafc69448c536939cd7212caeb.png";
const h3 = (a, b, c = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return v - Math.floor(v); };
// the hole's ragged outline round (0, CY): radius per angle, top clipped under the ceiling
const CY = 1.42, TOP = 2.93;
function rim(a) { const r = 1.9 + 0.16 * Math.sin(a * 5 + 1.3) + 0.1 * Math.sin(a * 11 + 0.4) + 0.07 * (h3(Math.round(a * 9), 3) - 0.5); return r; }
function at(a) { const r = rim(a); return [Math.cos(a) * r * 0.95, Math.min(TOP, CY + Math.sin(a) * r), 0]; }
export function geometry(ctx) {
  const M = ctx.lod <= 2 ? 12 : 7, SEG = ctx.lod <= 2 ? 64 : 32;
  ctx.smooth();
  // the hull plate behind the paper: a fan filling the hole (it stops at the floor), dark brushed steel
  ctx.albedo(null); ctx.color("oklch(0.52 0.01 240)"); ctx.metalness(0.6); ctx.roughness(0.45);
  const pts = []; for (let i = 0; i <= SEG; i++) { const a = -Math.PI / 2 + (i / SEG) * Math.PI * 2; const p = at(a); p[1] = Math.max(0, p[1]); pts.push(p); }
  for (let i = 0; i < SEG; i++) face(ctx, [0, CY, -0.012], pts[i].map((v, k) => k === 2 ? -0.012 : v), pts[i + 1].map((v, k) => k === 2 ? -0.012 : v), pts[i + 1].map((v, k) => k === 2 ? -0.012 : v), [0, 0, -1]);
  // plate seams and rivets: a station hull, not a wall
  ctx.color("oklch(0.24 0.008 240)");
  for (const y of [0.62, 1.38, 2.16]) { const w = Math.sqrt(Math.max(0, 1.85 ** 2 - (y - CY) ** 2)) * 0.92; tube(ctx, [[-w, y, -0.016], [w, y, -0.016]], [0.008, 0.008], 5, [1, 1], 0, 1, 1); }
  ctx.color("oklch(0.62 0.01 240)");
  for (const y of [0.62, 1.38, 2.16]) for (let x = -1.8; x <= 1.8; x += 0.14) { const w = Math.sqrt(Math.max(0, 1.85 ** 2 - (y - CY) ** 2)) * 0.9; if (Math.abs(x) < w && Math.abs(x) > 1.3) sphere(ctx, [x, y + 0.035, -0.018], 0.008, 6); }
  // the broken drywall core round the edge: grey grit where the paper's backing snapped
  ctx.color("oklch(0.7 0.012 85)"); ctx.metalness(0); ctx.roughness(1);
  for (let i = 0; i < SEG; i++) { const a = -Math.PI / 2 + (i / SEG) * Math.PI * 2 + 0.03, p = at(a); if (p[1] < 0.05) continue; sphere(ctx, [p[0], p[1], -0.03], 0.035 + 0.025 * h3(i, 1), 8, [1.6, 0.9, 0.45]); }
  // paper flaps peeling off the rim into the room, curled, the wallpaper's own pattern on them (both sides drawn)
  ctx.albedo(PAPER); ctx.color("oklch(0.96 0.02 92)"); ctx.roughness(0.9);
  const NF = ctx.lod <= 2 ? 26 : 14;
  for (let i = 0; i < NF; i++) {
    const a = -Math.PI / 2 + ((i + 0.5 * h3(i, 2)) / NF) * Math.PI * 2, p = at(a);
    if (p[1] < 0.25 || h3(i, 5) < 0.2) continue;
    const r = [Math.cos(a), Math.sin(a)], t = [-r[1], r[0]], wdt = 0.13 + 0.14 * h3(i, 7), len = 0.22 + 0.3 * h3(i, 9), curl = 0.5 + 0.9 * h3(i, 11);
    const rows = 5, strip = [];
    for (let k = 0; k <= rows; k++) {
      const s = k / rows, ang = s * curl * 2.2, out = Math.sin(ang) / (curl * 2.2) * len * (k ? 1 : 0), dz = -(1 - Math.cos(ang)) / (curl * 2.2) * len - 0.02;
      const droop = -0.05 * s * s * (r[1] > 0.3 ? 1 : 0.3), c = [p[0] - r[0] * 0.02 + r[0] * out, p[1] - r[1] * 0.02 + r[1] * out + droop, dz];
      const w = wdt * (1 - 0.55 * s);
      strip.push([[c[0] - t[0] * w, c[1] - t[1] * w, c[2]], [c[0] + t[0] * w, c[1] + t[1] * w, c[2]]]);
    }
    for (let k = 0; k < rows; k++) { const [a0, b0] = strip[k], [a1, b1] = strip[k + 1]; ctx.quad(...a0, ...b0, ...b1, ...a1); ctx.quad(...a1, ...b1, ...b0, ...a0); }
  }
  // frost: rime on the low hull and a ragged white-blue tongue out across the carpet
  ctx.albedo(null); ctx.color("oklch(0.86 0.035 225)"); ctx.roughness(0.3); ctx.emissive(0.03, 0.05, 0.08);
  for (let i = 0; i < 40; i++) { const x = (h3(i, 13) - 0.5) * 2.2, y = 0.05 + h3(i, 15) * 0.55 * (1 - Math.abs(x) / 1.3); if (y > 0) sphere(ctx, [x, y, -0.02], 0.03 + 0.05 * h3(i, 17), 6, [1.4, 0.6, 0.35]); }
  const FN = 28, fr = []; for (let i = 0; i <= FN; i++) { const a = Math.PI + (i / FN) * Math.PI, r = 0.55 + 0.12 * Math.sin(a * 3 + 0.7) + 0.25 * h3(i, 19); fr.push([Math.cos(a) * r * 1.7, 0.008, Math.sin(a) * r * 0.8 - 0.02]); }
  for (let i = 0; i < FN; i++) ctx.tri(0, 0.008, -0.02, ...fr[i + 1], ...fr[i]);
  ctx.emissive(0, 0, 0);
  // cables sagging out of the gap: two black, one with its orange jacket split
  ctx.color("oklch(0.18 0.005 240)"); ctx.roughness(0.6);
  tube(ctx, [[-0.7, 2.6, 0], [-0.85, 1.6, -0.35], [-1.0, 0.4, -0.7], [-1.15, 0.03, -1.05]], [0.018, 0.018, 0.018, 0.018], 6, [1, 1], 0, 1, 3);
  tube(ctx, [[0.55, 2.7, 0], [0.75, 2.1, -0.4], [0.95, 1.95, -0.55], [1.25, 1.1, -0.65]], [0.015, 0.015, 0.015, 0.015], 6, [1, 1], 0, 1, 3);
  ctx.color("oklch(0.62 0.17 50)");
  tube(ctx, [[0.2, 2.75, 0], [0.3, 2.2, -0.25], [0.45, 1.85, -0.3]], [0.022, 0.022, 0.02], 6, [1, 1], 0, 1, 3);
  ctx.color("oklch(0.75 0.12 70)"); sphere(ctx, [0.45, 1.83, -0.3], 0.012, 6); // bare copper at the split
  // drywall chunks and torn paper scraps on the floor
  ctx.color("oklch(0.72 0.012 85)"); ctx.roughness(1);
  for (let i = 0; i < 14; i++) sphere(ctx, [(h3(i, 21) - 0.5) * 2.6, 0.03, -0.15 - h3(i, 23) * 0.9], 0.03 + 0.05 * h3(i, 25), 6, [1.2, 0.6, 1]);
  ctx.albedo(PAPER); ctx.color("oklch(0.9 0.04 90)");
  for (let i = 0; i < 9; i++) { const x = (h3(i, 27) - 0.5) * 2.4, z = -0.3 - h3(i, 29) * 1.1, s = 0.06 + 0.06 * h3(i, 31), q = h3(i, 33) * 3; const c = Math.cos(q) * s, d = Math.sin(q) * s; ctx.quad(x - c, 0.012, z - d, x - d, 0.014, z + c, x + c, 0.012, z + d, x + d, 0.012, z - c); }
}
