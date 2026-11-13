// Level 34 "Sewer System": the brick-over-stone sewer, drawn (Shelly, Nov 13; ref /cdn/image-u09l4juoo.webp: red brick above, grey
// stone below, a pointed arch over yellow water). Visual only: places/level34/sim.js lays the box colliders behind it.
// kind "tunnel": runs local +z from 0 to len (axis "x" turns it to run +x), inner width w, stone walls to spring, brick vault to h.
//   caps: [0|1, 0|1] closes the start / end with a brick wall. A shallow gutter of foul water runs down the middle (its own object).
// kind "room": a chamber centred on its feet, w (x) by d (z), stone to 1.1 m and brick above to h, a brick barrel vault (rise) across x
//   unless shaft (open top, walls to h). doors: [[side "n"|"s"|"e"|"w", offset]] arched openings the tunnels meet. pool: [w, d, depth].
// kind "rungs": iron step-irons set in a wall, n of them 0.3 m apart, facing local -z.
import { face, tube } from "./lib/shapes.js";

const BRICK = "cdn/texture-soot-dark-brown-industrial-brick.png";
const STONE = "cdn/texture-wet-grey-sewer-ashlar-stone-blocks-slimy.png";
const TW = 1.6, TH = 1.25, TSPRING = 0.72; // the tunnel bore: four feet floor to crown
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
// the bore's top at a lateral offset u from its centre line: walls to the spring, then a pointed (two-centred) arch to TH
const boreTop = (u) => { const a = Math.abs(u) / (TW / 2); if (a >= 1) return 0; return TSPRING + (TH - TSPRING) * Math.pow(1 - a, 0.62); };

export function geometry(ctx) {
  const P = ctx.params ?? {};
  if (P.kind === "room") return room(ctx, P);
  if (P.kind === "rungs") return rungs(ctx, P);
  return tunnel(ctx, P);
}

function tunnel(ctx, P) {
  const len = P.len ?? 10, hw = TW / 2, swap = P.axis === "x", hi = ctx.lod <= 2;
  const m = (p) => (swap ? [p[2], p[1], p[0]] : p);
  const F = (a, b, c, d, n) => face(ctx, m(a), m(b), m(c), m(d), m(n));
  const N = hi ? 10 : 6, prof = [[-hw, 0], [-hw, 0.36], [-hw, TSPRING]];
  for (let i = 1; i < N; i++) { const u = -hw + (i / N) * TW; prof.push([u, boreTop(u)]); }
  prof.push([hw, TSPRING], [hw, 0.36], [hw, 0]);
  ctx.roughness(0.9); ctx.smooth();
  for (let s = 0; s < len - 0.001; s += 1) {
    const z0 = s, z1 = Math.min(len, s + 1), wet = hash(s, 7);
    for (let i = 0; i < prof.length - 1; i++) {
      const [x0, y0] = prof[i], [x1, y1] = prof[i + 1], brick = Math.min(y0, y1) >= TSPRING - 0.01;
      ctx.albedo(brick ? BRICK : STONE);
      const tide = Math.max(y0, y1) <= 0.37; // the tide line: everything under it is slick and green-black
      ctx.color(brick ? `oklch(${(0.5 + wet * 0.08).toFixed(3)} 0.07 38)` : tide ? `oklch(${(0.3 + wet * 0.04).toFixed(3)} 0.04 110)` : `oklch(${(0.5 + wet * 0.06).toFixed(3)} 0.02 85)`);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      F([x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1], [-mx, Math.max(0.05, TSPRING - my + 0.3) * (my > TSPRING ? -1 : 0.2), 0]);
    }
    // floor: two stone ledges and the gutter between them, 6 cm down
    ctx.albedo(STONE); ctx.color(`oklch(${(0.33 + wet * 0.05).toFixed(3)} 0.03 95)`);
    F([-hw, 0, z0], [-0.32, 0, z0], [-0.32, 0, z1], [-hw, 0, z1], [0, 1, 0]);
    F([0.32, 0, z0], [hw, 0, z0], [hw, 0, z1], [0.32, 0, z1], [0, 1, 0]);
    ctx.color("oklch(0.22 0.03 100)");
    F([-0.32, -0.07, z0], [0.32, -0.07, z0], [0.32, -0.07, z1], [-0.32, -0.07, z1], [0, 1, 0]);
    for (const sd of [-1, 1]) F([sd * 0.32, 0, z0], [sd * 0.32, -0.07, z0], [sd * 0.32, -0.07, z1], [sd * 0.32, 0, z1], [-sd, 0, 0]);
  }
  // stone ribs every 3 m, hugging the arch: the old engineers' ring courses
  ctx.albedo(STONE); ctx.roughness(0.85);
  for (let s = 1.5; s < len - 0.3; s += 3) {
    ctx.color("oklch(0.56 0.02 80)");
    const pts = [];
    for (let i = 0; i <= 12; i++) { const u = -hw + 0.05 + (i / 12) * (TW - 0.1); pts.push([u, i === 0 || i === 12 ? 0.05 : Math.min(boreTop(u), TH) - 0.04, s]); }
    tube(ctx, pts.map(m), pts.map(() => 0.06), hi ? 5 : 3, [1, 1], 0, 1, 1);
  }
  // end caps: a bricked-up wall where the bore stops
  const caps = P.caps ?? [0, 0];
  for (const [k, z, nz] of [[0, 0, 1], [1, len, -1]]) {
    if (!caps[k]) continue;
    for (let i = 0; i < 16; i++) {
      const u0 = -hw + (i / 16) * TW, u1 = -hw + ((i + 1) / 16) * TW;
      ctx.albedo(BRICK); ctx.color("oklch(0.42 0.07 38)");
      F([u0, 0, z], [u1, 0, z], [u1, boreTop(u1), z], [u0, boreTop(u0), z], [0, 0, nz]);
    }
  }
}

function room(ctx, P) {
  const w = P.w ?? 6, d = P.d ?? 6, h = P.h ?? 2.4, rise = P.shaft ? 0 : (P.rise ?? 1), hx = w / 2, hz = d / 2;
  const doors = P.doors ?? [], hi = ctx.lod <= 2, step = hi ? 0.2 : 0.4;
  const vault = (x) => (P.shaft ? 0 : rise * Math.sqrt(Math.max(0, 1 - (x / hx) ** 2)));
  ctx.roughness(0.9); ctx.smooth();
  // walls: strips along each side; a strip inside a doorway starts at the arch's top
  const sides = { n: { len: w, at: (u) => [u, -hz], n: [0, 0, 1], top: (u) => h + vault(u) }, s: { len: w, at: (u) => [u, hz], n: [0, 0, -1], top: (u) => h + vault(u) },
    e: { len: d, at: (u) => [hx, u], n: [-1, 0, 0], top: () => h }, w: { len: d, at: (u) => [-hx, u], n: [1, 0, 0], top: () => h } };
  for (const [k, S] of Object.entries(sides)) {
    const half = S.len / 2, dk = doors.filter(([sd]) => sd === k).map(([, o]) => o);
    for (let u = -half; u < half - 1e-4; u += step) {
      const u1 = Math.min(half, u + step), um = (u + u1) / 2, door = dk.find((o) => Math.abs(um - o) < TW / 2);
      const b0 = door != null ? boreTop(u - door) : 0, b1 = door != null ? boreTop(u1 - door) : 0, wet = hash(u * 3, k.charCodeAt(0));
      const [ax, az] = S.at(u), [bx, bz] = S.at(u1), t0 = S.top(u), t1 = S.top(u1);
      const band = (y0a, y0b, y1a, y1b, brick) => {
        if (y1a <= y0a + 1e-3 && y1b <= y0b + 1e-3) return;
        ctx.albedo(brick ? BRICK : STONE);
        ctx.color(brick ? `oklch(${(0.48 + wet * 0.08).toFixed(3)} 0.07 38)` : y0a < 0.4 ? `oklch(${(0.3 + wet * 0.04).toFixed(3)} 0.04 110)` : `oklch(${(0.5 + wet * 0.05).toFixed(3)} 0.02 85)`);
        face(ctx, [ax, y0a, az], [bx, y0b, bz], [bx, y1b, bz], [ax, y1a, az], S.n);
      };
      const lo0 = Math.max(b0, 0), lo1 = Math.max(b1, 0);
      band(lo0, lo1, Math.max(lo0, Math.min(0.4, t0)), Math.max(lo1, Math.min(0.4, t1)), false);
      band(Math.max(lo0, 0.4), Math.max(lo1, 0.4), Math.max(lo0, 0.4, Math.min(1.1, t0)), Math.max(lo1, 0.4, Math.min(1.1, t1)), false);
      band(Math.max(lo0, 1.1), Math.max(lo1, 1.1), Math.max(lo0, 1.1, t0), Math.max(lo1, 1.1, t1), true);
    }
  }
  // the vault, across x, brick
  if (!P.shaft) {
    ctx.albedo(BRICK);
    for (let z = -hz; z < hz - 1e-4; z += 0.5) {
      const z1 = Math.min(hz, z + 0.5);
      for (let i = 0; i < (hi ? 14 : 8); i++) {
        const n = hi ? 14 : 8, x0 = -hx + (i / n) * w, x1 = -hx + ((i + 1) / n) * w;
        ctx.color(`oklch(${(0.44 + hash(z, i) * 0.07).toFixed(3)} 0.07 38)`);
        face(ctx, [x0, h + vault(x0), z], [x1, h + vault(x1), z], [x1, h + vault(x1), z1], [x0, h + vault(x0), z1], [-(x0 + x1) / 2, -1, 0]);
      }
    }
  }
  // the floor, with the pool's hole and its stone sides
  ctx.albedo(STONE);
  const pool = P.pool, px = pool ? pool[0] / 2 : 0, pz = pool ? pool[1] / 2 : 0, pd = pool ? pool[2] : 0;
  const fl = (x0, z0, x1, z1) => { if (x1 - x0 > 1e-3 && z1 - z0 > 1e-3) face(ctx, [x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [0, 1, 0]); };
  ctx.color("oklch(0.32 0.03 95)");
  if (!pool) fl(-hx, -hz, hx, hz);
  else {
    fl(-hx, -hz, hx, -pz); fl(-hx, pz, hx, hz); fl(-hx, -pz, -px, pz); fl(px, -pz, hx, pz);
    ctx.color("oklch(0.24 0.04 110)");
    face(ctx, [-px, 0, -pz], [px, 0, -pz], [px, -pd, -pz], [-px, -pd, -pz], [0, 0, 1]);
    face(ctx, [-px, 0, pz], [px, 0, pz], [px, -pd, pz], [-px, -pd, pz], [0, 0, -1]);
    face(ctx, [-px, 0, -pz], [-px, 0, pz], [-px, -pd, pz], [-px, -pd, -pz], [1, 0, 0]);
    face(ctx, [px, 0, -pz], [px, 0, pz], [px, -pd, pz], [px, -pd, -pz], [-1, 0, 0]);
    ctx.color("oklch(0.18 0.03 110)");
    face(ctx, [-px, -pd, -pz], [px, -pd, -pz], [px, -pd, pz], [-px, -pd, pz], [0, 1, 0]);
    // a coping of dressed stone round the pool's lip
    ctx.color("oklch(0.55 0.02 80)");
    tube(ctx, [[-px, 0.04, -pz], [px, 0.04, -pz], [px, 0.04, pz], [-px, 0.04, pz], [-px, 0.04, -pz]], [0.07, 0.07, 0.07, 0.07, 0.07], 5, [1, 1], 0, 1, 1);
  }
}

function rungs(ctx, P) {
  const n = P.n ?? 16;
  ctx.color("oklch(0.3 0.05 45)"); ctx.metalness(0.6); ctx.roughness(0.6);
  for (let i = 0; i < n; i++) {
    const y = 0.3 + i * 0.3;
    tube(ctx, [[-0.22, y, 0], [-0.2, y, -0.14], [0.2, y, -0.14], [0.22, y, 0]], [0.018, 0.018, 0.018, 0.018], 5, [1, 1], 0, 1, 1);
  }
  ctx.metalness(0);
}
