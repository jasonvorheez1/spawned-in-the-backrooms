// Level 3's finer detail, one static mesh, from the wiki's photographs of the Electrical Station: glazed tan tile
const TILE = "cdn/texture-photoreal-glazed-tan-brown-ceramic-wall-tile-grimy-grout-institutional.png";
// wainscot on some brick walls, black "OUT OF BOUNDS" plates by the bars and gates, rusty white hasps and padlocks,
// brick ribs along the crawl halls, long electrical boxes with wire fans on the wall, black sludge pipes feeding
// glossy pools, canvas art with a scribbled-out angel, notebook pages, piles of almond water bottles by the lines and
// generators, paranoia-hotspot warning plates, M.E.G. cameras round the checkpoint, the Greek-style statue with her
// theatre mask in its vault, and the violet glow of purpified bricks. Placed from the seeded layout.
import { N, S, H, TH, HALF, isOpen, isBars, isGate, openings, zoneOf, hash, cellCenter, ceilingAt, BLOCKS, SLUDGE, SPARKS, inGamma, TW, TSP, OOB, tightSpans } from "./lib/level3.js";
import { vault } from "./lib/level3-arch.js";
import { hatchAt } from "./lib/level3-hatch.js";
import { slab, tube, sphere, prism, rounded } from "./lib/shapes.js";

const T = 0.3;
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const solid = (cx, cz, d) => !isOpen(cx, cz, d) && !isBars(cx, cz, d);
const ring = (r, n, cx, cz) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.2832; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
const BOTTLES = ["oklch(0.7 0.14 220)", "oklch(0.75 0.15 150)", "oklch(0.8 0.14 90)", "oklch(0.7 0.17 20)", "oklch(0.75 0.12 300)"];

export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 8 : 5;
  ctx.smooth(); ctx.metalness(0);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const zone = zoneOf(cx, cz); if (zone === "vault") continue;
    const c = cellCenter(cx, cz), top = ceilingAt(cx, cz);
    for (const d of [0, 1, 2, 3]) {
      if (!solid(cx, cz, d) || zone === "tight" || hatchAt(cx, cz, d)) continue; // a steel door stands there (lib/level3-hatch.js, laid by the sim)
      const [nx, nz] = D4[d], tx = -nz, tz = nx, w = S / 2 - T - (zone === "tight" ? 0.75 : 0), wx = c.x + nx * w, wz = c.z + nz * w;
      // a box in (along the wall, out from the wall, height) space
      const wb = (a0, a1, o0, o1, y0, y1) => { const p = [wx + tx * a0 - nx * o0, wz + tz * a0 - nz * o0], q = [wx + tx * a1 - nx * o1, wz + tz * a1 - nz * o1]; box(ctx, Math.min(p[0], q[0]), Math.max(p[0], q[0]), y0, y1, Math.min(p[1], q[1]), Math.max(p[1], q[1])); };
      const r = hash(cx * 4 + d, cz, 401);
      // glazed tile wainscot: a tan ceramic band low on the wall with a darker cap rail
      if (zone !== "tight" && r < 0.22) { // Shelly Nov 12: the flat orange band read as a plain panel; glazed tile now, chipped, with a round cap rail and a skirting
        const a0 = -S / 2 + T, a1 = S / 2 - T, tint = ["oklch(0.86 0.05 80)", "oklch(0.8 0.045 150)", "oklch(0.88 0.03 95)"][Math.floor(hash(cx, cz, 411) * 3)];
        ctx.albedo(TILE); ctx.roughness(0.25); ctx.color(tint); wb(a0, a1, -0.004, 0.014, 0.16, 1.22);
        ctx.albedo(null); ctx.color("oklch(0.3 0.02 50)"); ctx.roughness(0.7); wb(a0, a1, -0.004, 0.03, 0, 0.16); // skirting
        ctx.color("oklch(0.45 0.05 55)"); ctx.roughness(0.35); { const P = (aa, y) => [wx + tx * aa - nx * 0.025, y, wz + tz * aa - nz * 0.025]; tube(ctx, [P(a0, 1.245), P(a1, 1.245)], [0.028, 0.028], 8, [1, 1], 0, 1, 1); } // bullnose cap
        ctx.color("oklch(0.55 0.03 60)"); ctx.roughness(0.9); for (let k = 0; k < 3; k++) { const ca = a0 + 0.3 + hash(cx * 7 + k, cz, 413) * (a1 - a0 - 0.6), cy = 0.25 + hash(cx, cz * 7 + k, 415) * 0.85, cs = 0.03 + hash(k, cx + cz, 417) * 0.04; wb(ca - cs, ca + cs, 0.012, 0.0145, cy - cs * 0.7, cy + cs * 0.7); } // chips knocked out to the bed
        ctx.roughness(0.9); }
      // a canvas sheet hung on the brick with the angel drawn on and the face scribbled out
      else if (hi && r > 0.97) {
        ctx.roughness(0.95); ctx.color("oklch(0.93 0.01 95)"); wb(-0.9, 0.9, -0.004, 0.03, 0.6, 2.3);
        ctx.color("oklch(0.2 0.01 60)"); wb(-0.12, 0.12, 0.03, 0.04, 1.7, 2.0); // the scribbled-out face
        wb(-0.03, 0.03, 0.03, 0.04, 0.95, 1.7); wb(-0.55, 0.55, 0.03, 0.04, 1.3, 1.36); wb(-0.55, -0.35, 0.03, 0.04, 1.36, 1.9); wb(0.35, 0.55, 0.03, 0.04, 1.36, 1.9); // body, arms, wings
        ctx.color("oklch(0.6 0.02 80)"); for (let k = 0; k < 4; k++) wb(-0.9 - 0.01, -0.86, 0.03, 0.045, 0.6 + k * 0.5, 0.68 + k * 0.5); // tacks
      }
      // M.E.G. paranoia-hotspot plate at the mouth of the blind halls
      if (zone === "dark" && hash(cx * 4 + d, cz, 403) < 0.12) { ctx.color("oklch(0.82 0.15 90)"); wb(-0.35, 0.35, -0.004, 0.03, 1.5, 1.9); ctx.color("oklch(0.12 0.005 60)"); wb(-0.28, 0.28, 0.03, 0.04, 1.58, 1.62); wb(-0.28, 0.28, 0.03, 0.04, 1.78, 1.82); wb(-0.05, 0.05, 0.03, 0.04, 1.62, 1.78); }
      // a long electrical box with wires fanning out of it and over the ceiling
      if (hash(cx * 4 + d, cz, 405) < 0.1 && zone !== "tight") { // Shelly Nov 13 "found a blocky": three fused safety switches on a strut rail, conduit to the ceiling
        const a = (hash(cx, cz, 407) - 0.5) * 1.4, P = (aa, o, y) => [wx + tx * aa - nx * o, y, wz + tz * aa - nz * o];
        const wr = (a0, a1, o0, o1, y0, y1, rad) => { const p = P(a0, o0, y0), q = P(a1, o1, y1); rounded(ctx, [(p[0] + q[0]) / 2, (y0 + y1) / 2, (p[2] + q[2]) / 2], [Math.abs(q[0] - p[0]) / 2, (y1 - y0) / 2, Math.abs(q[2] - p[2]) / 2], rad); };
        ctx.albedo(null); ctx.metalness(0.6); ctx.roughness(0.55); ctx.color("oklch(0.42 0.01 250)"); // galvanised strut rails behind
        wr(a - 0.8, a + 0.8, -0.01, 0.035, 1.14, 1.18, 0.006); wr(a - 0.8, a + 0.8, -0.01, 0.035, 1.56, 1.6, 0.006);
        for (let k = 0; k < 3; k++) {
          const ca = a + (k - 1) * 0.47, aged = hash(cx + k, cz, 409);
          ctx.metalness(0.25); ctx.roughness(0.6); ctx.color(aged < 0.5 ? "oklch(0.5 0.025 165)" : "oklch(0.55 0.012 240)"); // enamelled steel, one greener than the others
          wr(ca - 0.17, ca + 0.17, 0.035, 0.2, 1.1, 1.62, 0.018);
          ctx.color(aged < 0.5 ? "oklch(0.54 0.025 165)" : "oklch(0.59 0.012 240)"); wr(ca - 0.15, ca + 0.15, 0.19, 0.212, 1.13, 1.59, 0.008); // the door
          ctx.metalness(0); ctx.roughness(0.8); ctx.color("oklch(0.86 0.03 90)"); wr(ca - 0.08, ca + 0.08, 0.211, 0.215, 1.49, 1.54, 0.002); // circuit label
          ctx.color("oklch(0.2 0.01 60)"); wr(ca - 0.06, ca + 0.04, 0.214, 0.217, 1.505, 1.52, 0.001);
          ctx.color("oklch(0.78 0.16 88)"); wr(ca - 0.04, ca + 0.04, 0.211, 0.215, 1.22, 1.29, 0.004); // shock warning sticker
          ctx.color("oklch(0.18 0.01 60)"); wr(ca - 0.012, ca + 0.012, 0.214, 0.217, 1.235, 1.275, 0.001);
          if (hi) { ctx.metalness(0.7); ctx.roughness(0.4); ctx.color("oklch(0.3 0.005 250)"); for (const [da, dy] of [[-0.13, 1.15], [0.13, 1.15], [-0.13, 1.57], [0.13, 1.57]]) wr(ca + da - 0.008, ca + da + 0.008, 0.21, 0.218, dy - 0.008, dy + 0.008, 0.004); } // door screws
          // the throw lever on the right flank: a hub and a handle angled down to OFF, red grip
          ctx.metalness(0.5); ctx.roughness(0.45); ctx.color("oklch(0.24 0.01 250)");
          tube(ctx, [P(ca + 0.17, 0.12, 1.44), P(ca + 0.2, 0.12, 1.44)], [0.03, 0.03], 10, [1, 1], 0, 1, 1);
          const off = aged > 0.7, tip = off ? P(ca + 0.215, 0.2, 1.3) : P(ca + 0.215, 0.2, 1.56);
          tube(ctx, [P(ca + 0.205, 0.12, 1.44), P(ca + 0.215, 0.16, off ? 1.37 : 1.5), tip], [0.013, 0.013, 0.013], 8, [1, 1], 0, 1, 1);
          ctx.metalness(0); ctx.roughness(0.5); ctx.color("oklch(0.48 0.17 28)"); tube(ctx, [tip, off ? P(ca + 0.215, 0.235, 1.27) : P(ca + 0.215, 0.235, 1.59)], [0.019, 0.019], 8, [1, 1], 0, 1, 1);
          // rigid conduit from a top hub straight up to the ceiling, strapped twice
          ctx.metalness(0.6); ctx.roughness(0.5); ctx.color("oklch(0.5 0.008 240)");
          tube(ctx, [P(ca, 0.12, 1.6), P(ca, 0.12, 1.67)], [0.034, 0.034], 10, [1, 1], 0, 1, 1);
          tube(ctx, [P(ca, 0.12, 1.66), P(ca, 0.12, top - 0.02)], [0.022, 0.022], 8, [1, 1], 0, 1, 1);
          if (hi) { ctx.color("oklch(0.38 0.01 240)"); for (const yy of [2.1, top - 0.45]) if (yy < top - 0.1) wr(ca - 0.04, ca + 0.04, 0.0, 0.15, yy, yy + 0.025, 0.004); }
          // a rust run down the brick from the box's bottom seam
          ctx.metalness(0); ctx.roughness(0.95); ctx.color("oklch(0.35 0.07 45)"); wb(ca - 0.06 + aged * 0.08, ca - 0.03 + aged * 0.08, -0.004, 0.003, 0.75 + aged * 0.2, 1.1);
        }
        ctx.metalness(0); ctx.roughness(0.9);
      }
      // a hasp and padlock on the occasional wall hatch (a steel door with a lock, as in the doors photograph)
      if (false) { ctx.color("oklch(0.88 0.012 90)"); wb(-0.5, 0.5, -0.004, 0.06, 0, 2.15); ctx.color("oklch(0.4 0.02 60)"); wb(0.35, 0.45, 0.06, 0.1, 1.0, 1.25); wb(0.38, 0.42, 0.1, 0.12, 0.85, 1.0); wb(-0.52, -0.5, 0.06, 0.1, 0.3, 0.45); wb(-0.52, -0.5, 0.06, 0.1, 1.6, 1.75); }
    }
    // soot-dark brick ribs every metre down a crawl hall, like the round brick culvert: flush bands on the walls, a ring under the vault
    if (zone === "tight" && hi) {
      ctx.color("oklch(0.42 0.07 35)");
      for (const sp of tightSpans(cx, cz)) for (let a = sp.a0 + 0.5; a < sp.a1 - 0.1; a += 2.0) vault(ctx, cx, cz, sp, 0.035, 4, a, a + 0.12, false);
    }
    // notebook pages scattered at a dead end
    if (openings(cx, cz).length === 1 && hash(cx, cz, 411) < 0.4) {
      ctx.roughness(0.95); ctx.color("oklch(0.9 0.02 90)");
      for (let k = 0; k < 3; k++) { const px = c.x + (hash(cx, cz, 413 + k) - 0.5) * 2.2, pz = c.z + (hash(cx, cz, 417 + k) - 0.5) * 2.2; box(ctx, px - 0.1, px + 0.1, 0.002, 0.006, pz - 0.14, pz + 0.14); }
    }
  }

  // signs and hasps at every set of bars and every open cage gate: the black OUT OF BOUNDS plate, the rusty white lock
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) for (const d of [0, 1]) {
    const bar = isBars(cx, cz, d), gate = isGate(cx, cz, d); if (!bar && !gate) continue;
    if (hash(cx * 4 + d, cz, 421) > (gate ? 0.9 : 0.4) || OOB.some((o) => o.cx === cx && o.cz === cz && o.d === d)) continue;
    const e = d === 0 ? { x: (cx + 1) * S - HALF, z: cz * S - HALF + S / 2 } : { x: cx * S - HALF + S / 2, z: (cz + 1) * S - HALF };
    const sx = d === 0 ? e.x - 0.12 : e.x - 0.9, sz = d === 0 ? e.z - 0.9 : e.z - 0.12, hw = d === 0 ? 0.03 : 0.3, hd = d === 0 ? 0.3 : 0.03;
    ctx.color("oklch(0.8 0.15 88)"); box(ctx, sx - hw, sx + hw, 1.55, 1.85, sz - hd, sz + hd); // the yellow plate, a black lettering band
    ctx.color("oklch(0.14 0.005 60)"); box(ctx, sx - hw * 0.3 - (d === 0 ? 0.02 : 0), sx + hw * 0.3, 1.64, 1.76, sz - hd * 0.3, sz + hd * 0.3);
    if (bar) { ctx.color("oklch(0.45 0.07 45)"); box(ctx, e.x - (d === 0 ? 0.03 : 0.5), e.x + (d === 0 ? 0.03 : 0.5), 0.3, 0.34, e.z - (d === 0 ? 0.5 : 0.03), e.z + (d === 0 ? 0.5 : 0.03)); } // a rust stain run
  }

  // black sludge: a glossy pool, the pipe that leaks into it
  ctx.roughness(0.04); ctx.metalness(0.2); ctx.color("oklch(0.07 0.004 280)");
  for (const h of SLUDGE) {
    prism(ctx, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.2832, k = 0.8 + 0.3 * hash(i, h.cx + h.cz, 7); return [h.x + Math.cos(a) * 0.95 * k, h.z + Math.sin(a) * 0.95 * k]; }), 0.004, 0.012);
    ctx.metalness(0.4); ctx.roughness(0.3);
    tube(ctx, [[h.wx, ceilingAt(h.cx, h.cz) - 0.1, h.wz], [h.wx, 1.4, h.wz], [h.wx - (h.wx - h.x) * 0.5, 1.0, h.wz - (h.wz - h.z) * 0.5], [h.x, 0.3, h.z]], [0.06, 0.06, 0.04, 0.03], M, [1, 1], 0, 1, 1);
    ctx.metalness(0.2); ctx.roughness(0.04);
  }
  ctx.metalness(0);
  // spark boxes: a thick bundle of wires from each live box
  ctx.color("oklch(0.13 0.008 250)"); ctx.roughness(0.9);
  if (hi) for (const s of SPARKS) { tube(ctx, [[s.wx, 1.5, s.wz], [s.wx + (s.x - s.wx) * 0.4, 1.2, s.wz + (s.z - s.wz) * 0.4], [s.x, 0.6, s.z], [s.x + 0.5, 0.05, s.z + 0.2]], [0.05, 0.05, 0.05, 0.04], 5, [1, 1], 0, 1, 1); }

  // blocks: almond water by the lines and generators, a statue in its vault, violet bricks
  for (const b of BLOCKS) {
    const c0 = cellCenter(b.x0, b.z0), x0 = c0.x - S / 2, z0 = c0.z - S / 2, W = b.w * S, D = b.d * S;
    if (false) { // bottles are art/level3/bottles.glb now
      ctx.roughness(0.4); ctx.metalness(0);
      for (let k = 0; k < 14; k++) { const bx = x0 + 0.6 + hash(b.i, k, 431) * (W - 1.2), bz = z0 + D - 0.5 - hash(b.i, k, 433) * 1.2; ctx.color(BOTTLES[Math.floor(hash(b.i, k, 435) * BOTTLES.length)]); tube(ctx, [[bx, 0, bz], [bx, 0.22, bz]], [0.05, 0.05], 5, [1, 1], 0, 1, 1); }
    }
    if (b.type !== "vault") continue;
    const vx = x0 + W / 2, vz = z0 + D / 2;
    if (false) { // the marble woman is art/level3/statue.glb now; the worn marble woman on her stone plinth, an arm gone, her theatre mask at her thigh
      ctx.albedo(null); ctx.roughness(0.7); ctx.color("oklch(0.5 0.03 190)"); box(ctx, vx - 0.75, vx + 0.75, 0, 0.55, vz - 0.75, vz + 0.75); ctx.color("oklch(0.58 0.03 190)"); box(ctx, vx - 0.6, vx + 0.6, 0.55, 0.78, vz - 0.6, vz + 0.6);
      ctx.color("oklch(0.88 0.02 88)");
      tube(ctx, [[vx, 0.78, vz], [vx, 1.15, vz], [vx, 1.6, vz], [vx, 2.0, vz], [vx, 2.2, vz]], [0.34, 0.28, 0.25, 0.22, 0.1], 12, [1, 0.8], 0.03, 3, 3); // drapery body
      sphere(ctx, [vx, 2.38, vz], 0.13, 10, [0.9, 1.1, 0.95]); sphere(ctx, [vx, 2.46, vz + 0.04], 0.12, 8, [1, 0.7, 1]); // head and the knot of hair
      tube(ctx, [[vx - 0.2, 2.08, vz], [vx - 0.4, 1.9, vz + 0.04], [vx - 0.46, 1.65, vz + 0.04]], [0.07, 0.065, 0.05], 8, [1, 1], 0, 1, 1); // one arm, broken off at the elbow
      tube(ctx, [[vx + 0.2, 2.08, vz], [vx + 0.34, 1.7, vz], [vx + 0.36, 1.35, vz - 0.04]], [0.07, 0.06, 0.05], 8, [1, 1], 0, 1, 1); // the other holding the mask down
      for (let k = 0; k < 4; k++) tube(ctx, [[vx - 0.18 + k * 0.12, 1.9, vz - 0.22], [vx - 0.16 + k * 0.12, 1.2, vz - 0.27], [vx - 0.2 + k * 0.12, 0.8, vz - 0.3]], [0.035, 0.04, 0.03], 5, [1, 1], 0, 1, 1); // drapery folds
      sphere(ctx, [vx + 0.4, 1.2, vz - 0.04], 0.13, 10, [0.5, 1.1, 0.9]); // the mask
      ctx.color("oklch(0.15 0.01 60)"); box(ctx, vx + 0.45, vx + 0.47, 1.22, 1.27, vz - 0.1, vz - 0.05); box(ctx, vx + 0.45, vx + 0.47, 1.22, 1.27, vz + 0.0, vz + 0.05); box(ctx, vx + 0.45, vx + 0.47, 1.1, 1.17, vz - 0.07, vz + 0.02); // eyes and open mouth
    }
    if (b.content === "purple") { // purpified bricks: violet and glowing, a few set in the walls of the vault
      ctx.color("oklch(0.55 0.25 305)"); ctx.emissive("oklch(0.5 0.27 305)"); ctx.roughness(0.5);
      for (let k = 0; k < 26; k++) { const side = Math.floor(hash(b.i, k, 441) * 4), t = hash(b.i, k, 443), y = 0.2 + hash(b.i, k, 445) * 2.4, [wx2, wz2] = side === 0 ? [x0 + 0.05, z0 + t * D] : side === 1 ? [x0 + W - 0.05, z0 + t * D] : side === 2 ? [x0 + t * W, z0 + 0.05] : [x0 + t * W, z0 + D - 0.05]; box(ctx, wx2 - 0.09, wx2 + 0.09, y, y + 0.07, wz2 - 0.09, wz2 + 0.09); }
      ctx.emissive(null);
    }
  }

  // M.E.G. cameras round the checkpoint
  ctx.color("oklch(0.3 0.01 250)"); ctx.metalness(0.4);
  ctx.metalness(0); ctx.color(null); ctx.roughness(null);
}
