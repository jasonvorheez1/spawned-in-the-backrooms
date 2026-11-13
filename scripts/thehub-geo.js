// The Hub's tunnels: one mesh per run (params.run), cast from scripts/lib/thehub.js.
// Section: 7 m asphalt road, a kerbed walkway each side, slab walls with open seams and a plinth, haunched flat ceiling with ribs.
// Door recesses are cut into the walls where the plan puts a door; the frame and leaf are their own objects (places/thehub/sim.js).
import { RUNS, HW, WALL_H, CEIL, ROAD, CURB, DOOR_W, DOOR_H, at } from "./lib/thehub.js";
import { slab, face } from "./lib/shapes.js";
const ASPHALT = "cdn/texture-dry-worn-asphalt-road-surface-fine-aggregate-faint-tyre-polish.png";
const WALL = "cdn/texture-board-formed-cast-concrete-tunnel-wall-panel-soot-streaks-weathered.png";
const WALK = "cdn/texture-discolored-poured-concrete-wall-water-stains.png";
const TW = 0.6, HAUNCH = 1.2, RECESS = 1.3;
// a box in the run's frame
const mk = (ctx, r) => (u0, u1, y0, y1, v0, v1) => { const a = at(r, u0, v0), b = at(r, u1, v1); slab(ctx, [(a.x + b.x) / 2, (y0 + y1) / 2, (a.z + b.z) / 2], [Math.abs(b.x - a.x) / 2, (y1 - y0) / 2, Math.abs(b.z - a.z) / 2]); };
const pt = (r, u, y, v) => { const p = at(r, u, v); return [p.x, y, p.z]; };
// [from,to] minus a list of holes
function cut(from, to, holes) {
  let out = [[from, to]];
  for (const [a, b] of holes) out = out.flatMap(([x, y]) => b <= x || a >= y ? [[x, y]] : [[x, a], [b, y]].filter(([p, q]) => q - p > 0.01));
  return out;
}
const sideV = (s) => s === "a" ? -1 : 1;
function holes(r, s) {
  return { gaps: r.gaps[s], bays: r.bays.filter((b) => b.side === s), doors: r.doors[s].map((u) => [u - DOOR_W / 2, u + DOOR_W / 2]) };
}
function shell(ctx, r, solid) {
  const B = mk(ctx, r), L = r.len;
  // floor: the road, then the walkways
  if (solid) B(0, L, -0.5, 0, -HW - 0.2, HW + 0.2);
  else { ctx.albedo(ASPHALT); ctx.color("oklch(0.9 0.004 80)"); ctx.roughness(0.92); B(0, L, -0.3, 0, -HW, HW); }
  for (const s of ["a", "b"]) {
    const sv = sideV(s), h = holes(r, s);
    // walkway and kerb, dropped where a side tunnel leaves
    for (const [u0, u1] of cut(0, L, h.gaps)) {
      if (!solid) { ctx.albedo(WALK); ctx.color("oklch(0.93 0.006 85)"); ctx.roughness(0.85); }
      B(u0, u1, 0, CURB, sv * (ROAD + 0.22), sv * HW);
      const a = pt(r, u0, 0, sv * ROAD), b = pt(r, u1, 0, sv * ROAD), c = pt(r, u1, CURB, sv * (ROAD + 0.22)), d = pt(r, u0, CURB, sv * (ROAD + 0.22));
      face(ctx, a, b, c, d, [0, 1, 0]); // the kerb's splayed face: a body walks up it
      if (!solid) { ctx.albedo(null); ctx.color("oklch(0.86 0.012 90)"); ctx.roughness(0.6); B(u0, u1, 0.001, 0.008, sv * (ROAD - 0.32), sv * (ROAD - 0.2)); } // the edge line
    }
    // the wall: slabs with open seams, a plinth, a haunch up to the ceiling
    const open = [...h.gaps, ...h.bays.map((b) => [b.from, b.to]), ...h.doors];
    for (const [u0, u1] of cut(0, L, open)) {
      if (solid) { B(u0, u1, 0, WALL_H, sv * HW, sv * (HW + TW)); continue; }
      ctx.albedo(WALL); ctx.roughness(0.88);
      B(u0, u1, 0, WALL_H, sv * (HW + 0.05), sv * (HW + TW)); // the back, seen through the seams
      for (let p = Math.floor(u0 / 4) * 4; p < u1; p += 4) {
        const a = Math.max(u0, p + 0.035), b = Math.min(u1, p + 4 - 0.035); if (b - a < 0.05) continue;
        const k = Math.abs(Math.round(p / 4 + r.x0 * 0.37 + (s === "a" ? 7 : 0))) % 5;
        ctx.color(["oklch(0.93 0.008 85)", "oklch(0.9 0.008 80)", "oklch(0.95 0.006 88)", "oklch(0.88 0.01 75)", "oklch(0.92 0.006 90)"][k]);
        B(a, b, 0.55, WALL_H, sv * HW, sv * (HW + 0.06));
        if (ctx.lod <= 2) { ctx.albedo(null); ctx.color("oklch(0.3 0.01 60)"); ctx.metalness(0.6); for (const [du, y] of [[0.3, 4.4], [3.7 - 0.07, 4.4], [0.3, 1.1], [3.63, 1.1]]) if (p + du > a && p + du + 0.07 < b) B(p + du, p + du + 0.07, y, y + 0.07, sv * (HW - 0.012), sv * HW); ctx.metalness(0); ctx.albedo(WALL); } // lifting-anchor plugs
      }
      ctx.color("oklch(0.84 0.008 80)"); B(u0, u1, CURB, 0.55, sv * (HW - 0.1), sv * (HW + 0.06)); // plinth
    }
    // over each door: the strip of wall above the frame, and the recess the frame stands in
    for (const [u0, u1] of h.doors) {
      if (solid) { B(u0, u1, 0, WALL_H, sv * (HW + RECESS), sv * (HW + RECESS + 0.3)); B(u0 - 0.3, u0, 0, WALL_H, sv * HW, sv * (HW + RECESS)); B(u1, u1 + 0.3, 0, WALL_H, sv * HW, sv * (HW + RECESS)); continue; }
      ctx.albedo(WALL); ctx.color("oklch(0.9 0.008 80)"); B(u0, u1, DOOR_H, WALL_H, sv * HW, sv * (HW + TW));
      ctx.color("oklch(0.55 0.01 70)"); B(u0, u1, CURB, DOOR_H, sv * (HW + RECESS), sv * (HW + RECESS + 0.1)); B(u0 - 0.1, u0, CURB, DOOR_H, sv * (HW + TW), sv * (HW + RECESS)); B(u1, u1 + 0.1, CURB, DOOR_H, sv * (HW + TW), sv * (HW + RECESS)); B(u0, u1, DOOR_H, DOOR_H + 0.1, sv * (HW + TW), sv * (HW + RECESS));
      B(u0, u1, 0, CURB, sv * HW, sv * (HW + RECESS));
    }
    // a bay: a room let into the wall
    for (const b of h.bays) {
      const d = b.depth, v0 = sv * HW, v1 = sv * (HW + d);
      if (!solid) { ctx.albedo(WALK); ctx.color("oklch(0.9 0.006 85)"); ctx.roughness(0.85); }
      B(b.from, b.to, solid ? -0.3 : 0, CURB, v0, v1);
      if (!solid) { ctx.albedo(WALL); ctx.color("oklch(0.9 0.008 82)"); }
      B(b.from, b.to, 0, WALL_H, v1, v1 + sv * TW); B(b.from - TW, b.from, 0, WALL_H, v0, v1 + sv * TW); B(b.to, b.to + TW, 0, WALL_H, v0, v1 + sv * TW);
      B(b.from - TW, b.to + TW, WALL_H, WALL_H + 0.4, v0, v1 + sv * TW);
      if (!solid) for (let p = b.from + 4; p < b.to - 0.5; p += 4) { ctx.color("oklch(0.5 0.01 70)"); B(p - 0.03, p + 0.03, 0.2, WALL_H, v1 - sv * 0.01, v1); }
    }
    // haunch
    if (!solid) {
      ctx.albedo(WALL); ctx.color("oklch(0.86 0.008 80)");
      face(ctx, pt(r, 0, WALL_H, sv * HW), pt(r, L, WALL_H, sv * HW), pt(r, L, CEIL, sv * (HW - HAUNCH)), pt(r, 0, CEIL, sv * (HW - HAUNCH)), [0, -1, 0]);
    }
  }
  // ceiling and its ribs
  if (solid) B(0, L, CEIL, CEIL + 0.4, -HW - 0.2, HW + 0.2);
  else {
    ctx.albedo(WALL); ctx.color("oklch(0.82 0.008 78)"); B(0, L, CEIL, CEIL + 0.3, -HW - TW, HW + TW);
    if (ctx.lod <= 3) for (let u = 4; u < L; u += 8) { ctx.color("oklch(0.78 0.008 75)"); B(u - 0.22, u + 0.22, CEIL - 0.32, CEIL, -HW + HAUNCH - 0.3, HW - HAUNCH + 0.3); }
    // the centre line: 3 m dashes, 6 m gaps, worn
    ctx.albedo(null); ctx.roughness(0.6);
    for (let u = 2; u < L - 3; u += 9) { ctx.color(Math.round(u * 7 + r.x0) % 4 ? "oklch(0.84 0.012 90)" : "oklch(0.6 0.01 85)"); B(u, u + 3, 0.001, 0.007, -0.07, 0.07); }
  }
  // the blind ends
  for (const [cap, u] of [[r.capA, 0], [r.capB, L]]) if (cap) {
    if (!solid) { ctx.albedo(WALL); ctx.color("oklch(0.9 0.008 82)"); ctx.roughness(0.88); }
    const o = u === 0 ? -1 : 1; B(Math.min(u, u + o * TW), Math.max(u, u + o * TW), 0, CEIL, -HW - TW, HW + TW);
    if (!solid) { ctx.color("oklch(0.5 0.01 70)"); for (const v of [-1.8, 1.8]) B(u - (o > 0 ? 0.01 : 0), u + (o > 0 ? 0 : 0.01), 0.2, CEIL - 0.3, v - 0.03, v + 0.03); }
  }
}
const run = (ctx) => RUNS.find((r) => r.id === ctx.params.run) ?? RUNS[0];
export function geometry(ctx) { shell(ctx, run(ctx), false); }
export function collider(ctx) { shell(ctx, run(ctx), true); }
