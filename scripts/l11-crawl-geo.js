// Level 11 crawl: the poured-concrete tunnel shell (Shelly, Nov 10: "make it all look less blocky").
// A horseshoe bore drawn inside the old box walls: damp-stained walls up to the spring line, an elliptical vault,
// a chamfered kerb along the floor, cast ribs every few metres, and a sagging cable bundle on brackets.
// Visual only: the box walls behind it stay the colliders. Runs along local +z from 0 to len, centred on x.
// params: len, w (inner width), spring (wall height), rise (vault height), rib (spacing), axis ("z" | "x": x swaps
// local x and z so a gallery can run east), cables (side: -1 | 1 | 0), gaps: [[side, from, to]] wall openings.
import { face, tube } from "./lib/shapes.js";

const CONC = "cdn/texture-stained-wet-concrete-tunnel-wall.png";
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

export function geometry(ctx) {
  const P = ctx.params ?? {}, len = P.len ?? 20, hw = (P.w ?? 4) / 2, spring = P.spring ?? 1.9, rise = P.rise ?? 1.3;
  const swap = P.axis === "x", hi = ctx.lod <= 2;
  const m = (p) => (swap ? [p[2], p[1], p[0]] : p);
  const F = (a, b, c, d, n) => face(ctx, m(a), m(b), m(c), m(d), m(n));
  const gaps = P.gaps ?? [];
  const inGap = (side, s0, s1) => gaps.some(([g, a, b]) => g === side && s1 > a && s0 < b);
  // the profile, left wall up, over the vault, right wall down: [x, y, inward normal]
  const N = hi ? 14 : 8, prof = [];
  prof.push([-hw, 0.3, [1, 0], -1], [-hw, 0.95, [1, 0], -1], [-hw, spring, [1, 0], -1]);
  for (let i = 1; i < N; i++) { const t = Math.PI - (i / N) * Math.PI, x = Math.cos(t) * hw, y = spring + Math.sin(t) * rise; prof.push([x, y, [-Math.cos(t) / hw, -Math.sin(t) / rise], 0]); }
  prof.push([hw, spring, [-1, 0], 1], [hw, 0.95, [-1, 0], 1], [hw, 0.3, [-1, 0], 1]);
  const SEG = 2;
  ctx.albedo(CONC); ctx.roughness(0.92); ctx.smooth();
  for (let s = 0; s < len; s += SEG) {
    const z0 = s, z1 = Math.min(len, s + SEG), wet = hash(s, 3);
    for (let i = 0; i < prof.length - 1; i++) {
      const [x0, y0, n0, side0] = prof[i], [x1, y1, n1, side1] = prof[i + 1];
      const wall = side0 !== 0 && side0 === side1;
      if (wall && inGap(side0, z0, z1)) continue;
      if (!wall && side0 !== 0 && inGap(side0, z0, z1) && y0 < spring + 0.01 && y1 < spring + 0.01) continue;
      const low = Math.max(y0, y1) <= 0.96; // the damp line: the bottom metre stays dark
      ctx.color(low ? `oklch(${(0.4 + wet * 0.06).toFixed(3)} 0.025 75)` : `oklch(${(0.6 + wet * 0.08).toFixed(3)} 0.018 82)`);
      const n = [(n0[0] + n1[0]) / 2, (n0[1] + n1[1]) / 2, 0];
      F([x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1], n);
    }
    // the kerb: a chamfer from the floor up to the wall's foot
    for (const sd of [-1, 1]) {
      if (inGap(sd, z0, z1)) continue;
      ctx.color("oklch(0.36 0.02 70)");
      F([sd * (hw - 0.22), 0.001, z0], [sd * hw, 0.3, z0], [sd * hw, 0.3, z1], [sd * (hw - 0.22), 0.001, z1], [-sd * 0.8, 0.6, 0]);
    }
  }
  // cast ribs: a rounded band hugging the bore
  ctx.albedo(null); ctx.roughness(0.85);
  const rib = P.rib ?? 4;
  for (let s = rib / 2; s < len; s += rib) {
    if (inGap(-1, s - 0.3, s + 0.3) || inGap(1, s - 0.3, s + 0.3)) continue;
    ctx.color("oklch(0.48 0.02 78)");
    const pts = [[-hw + 0.06, 0, s], ...prof.map(([x, y]) => [x * 0.97, spring + (y - spring) * 0.965 - (y < spring ? 0 : 0.02), s]), [hw - 0.06, 0, s]]
      .map((p, i, a) => (i === 0 || i === a.length - 1 ? p : [Math.sign(p[0]) * Math.min(Math.abs(p[0]), hw - 0.06), p[1], p[2]]));
    tube(ctx, pts.map(m), pts.map(() => 0.1), hi ? 6 : 4, [1, 1], 0, 1, 1);
  }
  // the cable bundle: three lines sagging between wall brackets
  const cs = P.cables ?? 0;
  if (cs) {
    const x = cs * (hw - 0.12), step = 3;
    for (const [k, y, r, col] of [[0, 1.55, 0.035, "oklch(0.16 0.01 0)"], [1, 1.66, 0.028, "oklch(0.2 0.02 30)"], [2, 1.76, 0.03, "oklch(0.15 0.01 250)"]]) {
      ctx.color(col);
      for (let s = 0; s < len - 0.01; s += step) {
        const e = Math.min(len, s + step);
        if (inGap(cs, s, e)) continue;
        const sag = 0.07 + 0.05 * hash(s, k);
        const pts = [[x, y, s], [x, y - sag * 0.75, s + (e - s) * 0.25], [x, y - sag, (s + e) / 2], [x, y - sag * 0.75, s + (e - s) * 0.75], [x, y, e]];
        tube(ctx, pts.map(m), pts.map(() => r), hi ? 5 : 3, [1, 1], 0, 1, hi ? 2 : 1);
      }
    }
    ctx.color("oklch(0.32 0.03 50)"); ctx.metalness(0.6); // the brackets, rusted angle iron
    for (let s = 0; s <= len; s += step) {
      if (inGap(cs, s - 0.1, s + 0.1)) continue;
      const pts = [[cs * hw, 1.5, s], [x - cs * 0.02, 1.5, s], [x - cs * 0.02, 1.82, s]];
      tube(ctx, pts.map(m), [0.025, 0.025, 0.025], 4, [1, 1], 0, 1, 1);
    }
    ctx.metalness(0);
  }
}
