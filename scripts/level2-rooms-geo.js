// Level 2 revamp set: the side rooms' door walls and dressing, the Boiler Hall (a huge riveted boiler, a catwalk ring,
// stairs and a bridge) and the Pipe Maze (walls that are banks of pipe). One static mesh; layout from scripts/lib/level2.js.
import { N, S, H, HALF, isOpen, hash, cellCenter, inPipes, SIDE, HALL, HALL_H, CATWALK } from "./lib/level2.js";
import { slab, tube } from "./lib/shapes.js";

const WALL = "cdn/texture-chalky-stained-concrete-wall.png", RUSTY = "cdn/texture-scratched-worn-steel.png", WOOD = "cdn/texture-worn-hardwood-grain.png";
const T = 0.4, D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const pipe = (ctx, a, b, r, M) => tube(ctx, [a, b], [r, r], M, [1, 1], 0, 1, 1);

// a room's own frame: a runs out through the door (n), b across it (t); c is the cell centre
function frame(r) {
  const c = cellCenter(r.cx, r.cz), [nx, nz] = D4[r.o], tx = -nz, tz = nx;
  const P = (a, y, b) => [c.x + nx * a + tx * b, y, c.z + nz * a + tz * b];
  const B = (ctx, a0, a1, y0, y1, b0, b1) => { const p = P(a0, 0, b0), q = P(a1, 0, b1); box(ctx, Math.min(p[0], q[0]), Math.max(p[0], q[0]), y0, y1, Math.min(p[2], q[2]), Math.max(p[2], q[2])); };
  return { P, B };
}

function room(ctx, r, M) {
  const { P, B } = frame(r), h = (k) => hash(r.cx, r.cz, k), E = S / 2, IN = E - T;
  // the door wall: concrete either side of a 1.2 m steel frame, a lintel over it
  ctx.albedo(WALL); ctx.color("oklch(0.74 0.012 85)"); ctx.metalness(0); ctx.roughness(0.95);
  B(ctx, E - 0.12, E + 0.12, 0, H, -E - T, -0.62); B(ctx, E - 0.12, E + 0.12, 0, H, 0.62, E + T); B(ctx, E - 0.12, E + 0.12, 2.22, H, -0.62, 0.62);
  ctx.albedo(RUSTY); ctx.color(r.type === "electrical" ? "oklch(0.75 0.15 90)" : r.type === "cage" ? "oklch(0.45 0.02 250)" : "oklch(0.38 0.015 60)"); ctx.metalness(0.6); ctx.roughness(0.55);
  for (const s of [-1, 1]) B(ctx, E - 0.16, E + 0.16, 0, 2.22, s * 0.56, s * 0.66);
  B(ctx, E - 0.16, E + 0.16, 2.16, 2.3, -0.66, 0.66);
  // hazard stripe on the electrical door wall, a stencil band on the rest
  if (r.type === "electrical") { ctx.albedo(null); for (let i = 0; i < 6; i++) { ctx.color(i % 2 ? "oklch(0.2 0 0)" : "oklch(0.8 0.16 90)"); B(ctx, E + 0.12, E + 0.13, 2.36, 2.56, 0.7 + i * 0.25, 0.95 + i * 0.25); } }
  // grime: dark puddles and stains on the floor, a damp tide line on the back wall
  ctx.albedo(null); ctx.metalness(0); ctx.roughness(0.3);
  for (let i = 0; i < 3; i++) { ctx.color(`oklch(${0.2 + h(10 + i) * 0.1} 0.02 60)`); const a = (h(20 + i) - 0.5) * 3, b = (h(30 + i) - 0.5) * 3, s = 0.4 + h(40 + i) * 0.7; B(ctx, a - s, a + s, 0.004 + i * 0.002, 0.006 + i * 0.002, b - s * 0.8, b + s * 0.8); }
  ctx.color("oklch(0.32 0.03 70)"); ctx.roughness(0.9); B(ctx, -IN - 0.01, -IN + 0.005, 0, 0.35 + h(50) * 0.3, -IN, IN);
  // a lamp cage on the ceiling (the light itself is an entity) and a wall pipe run under the ceiling
  ctx.albedo(RUSTY); ctx.color("oklch(0.3 0.01 250)"); ctx.metalness(0.7); ctx.roughness(0.5);
  if (r.type !== "stair") B(ctx, -0.4, 0.4, H - 0.06, H, -0.12, 0.12);
  ctx.color(`oklch(${0.4 + h(51) * 0.2} ${0.03 + h(52) * 0.05} ${h(53) * 360})`);
  pipe(ctx, P(-IN, H - 0.3, IN - 0.15), P(E - 0.2, H - 0.3, IN - 0.15), 0.07, M); pipe(ctx, P(-IN, H - 0.5, IN - 0.15), P(E - 0.2, H - 0.5, IN - 0.15), 0.05, M);
  const t = r.type;
  if (ctx.params?.props) return; // the room's dressing is Tripo props now (scripts/lib/l2props.js)
  if (t === "boiler") { // a squat water heater on legs, gauges, a flue into the ceiling
    ctx.color("oklch(0.5 0.08 40)"); pipe(ctx, P(0.6, 0.25, -1.4), P(0.6, 1.9, -1.4), 0.62, M + 4);
    ctx.color("oklch(0.25 0.01 250)"); for (const y of [0.5, 1.2, 1.75]) pipe(ctx, P(0.6, y, -1.4), P(0.6, y + 0.06, -1.4), 0.64, M + 4);
    for (const [da, db] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) B(ctx, 0.6 + da - 0.04, 0.6 + da + 0.04, 0, 0.25, -1.4 + db - 0.04, -1.4 + db + 0.04);
    pipe(ctx, P(0.6, 1.9, -1.4), P(0.6, H, -1.4), 0.16, M);
    ctx.albedo(null); ctx.color("oklch(0.92 0.02 90)"); B(ctx, 0.0, 0.02, 1.3, 1.5, -1.5, -1.3); ctx.color("oklch(0.9 0.2 30)"); ctx.emissive("oklch(0.5 0.2 30)"); B(ctx, -0.03, 0.0, 0.5, 0.62, -1.48, -1.32); ctx.emissive(null);
  } else if (t === "locker") { // a bench, a mop bucket, coats on hooks
    ctx.albedo(WOOD); ctx.color("oklch(0.55 0.06 60)"); ctx.metalness(0); B(ctx, -0.9, 0.9, 0.42, 0.47, 1.1, 1.45);
    ctx.albedo(RUSTY); ctx.color("oklch(0.3 0.01 250)"); for (const a of [-0.8, 0.8]) B(ctx, a - 0.03, a + 0.03, 0, 0.42, 1.15, 1.4);
    ctx.color("oklch(0.65 0.15 90)"); pipe(ctx, P(1.4, 0, 1.6), P(1.4, 0.35, 1.6), 0.18, M);
    ctx.albedo(null); ctx.color("oklch(0.4 0.06 150)"); B(ctx, -0.5, 0.0, 0.9, 1.75, IN - 0.08, IN - 0.02); ctx.color("oklch(0.55 0.1 60)"); B(ctx, 0.3, 0.75, 1.0, 1.75, IN - 0.08, IN - 0.02);
  } else if (t === "pump") { // two horizontal pumps on plinths, flanged pipes into the floor
    for (const b of [-1.3, 1.3]) {
      ctx.albedo(WALL); ctx.color("oklch(0.6 0.01 80)"); B(ctx, -0.3, 1.3, 0, 0.3, b - 0.4, b + 0.4);
      ctx.albedo(RUSTY); ctx.color("oklch(0.45 0.09 240)"); pipe(ctx, P(-0.2, 0.75, b), P(1.2, 0.75, b), 0.4, M + 4);
      ctx.color("oklch(0.3 0.02 250)"); pipe(ctx, P(0.5, 0.75, b), P(0.5, H, b), 0.12, M); pipe(ctx, P(-0.2, 0.75, b), P(-0.6, 0.75, b), 0.15, M); pipe(ctx, P(-0.6, 0.0, b), P(-0.6, 0.75, b), 0.15, M);
    }
  } else if (t === "office") { // a chair, a corkboard, a shelf of binders, papers on the floor
    ctx.albedo(null); ctx.color("oklch(0.25 0.01 250)"); B(ctx, -0.9, -0.5, 0.42, 0.48, -0.25, 0.15); B(ctx, -0.9, -0.85, 0.48, 0.95, -0.25, 0.15); pipe(ctx, P(-0.7, 0, -0.05), P(-0.7, 0.42, -0.05), 0.03, 6);
    ctx.albedo(WOOD); ctx.color("oklch(0.6 0.08 60)"); B(ctx, -0.6, 0.6, 1.1, 1.9, -IN, -IN + 0.03);
    ctx.albedo(null); for (let i = 0; i < 7; i++) { ctx.color(`oklch(0.9 0.03 ${h(60 + i) * 360})`); const a = -0.5 + h(70 + i), y = 1.2 + h(80 + i) * 0.55; B(ctx, a - 0.08, a + 0.08, y - 0.1, y + 0.1, -IN + 0.03, -IN + 0.035); }
    ctx.albedo(RUSTY); ctx.color("oklch(0.4 0.01 250)"); for (const y of [0.9, 1.4]) B(ctx, 0.2, 1.6, y, y + 0.03, IN - 0.35, IN);
    ctx.albedo(null); for (let i = 0; i < 9; i++) { ctx.color(["oklch(0.5 0.15 25)", "oklch(0.4 0.1 250)", "oklch(0.3 0.02 150)"][i % 3]); B(ctx, 0.25 + i * 0.14, 0.35 + i * 0.14, 0.93, 1.2, IN - 0.3, IN - 0.02); }
    ctx.color("oklch(0.88 0.02 90)"); for (let i = 0; i < 6; i++) { const a = (h(90 + i) - 0.5) * 2.4, b = (h(100 + i) - 0.5) * 2.4; B(ctx, a - 0.11, a + 0.11, 0.008, 0.01, b - 0.15, b + 0.15); }
  } else if (t === "cage") { // chain-link pens either side, wire shelving
    ctx.albedo(RUSTY); ctx.color("oklch(0.5 0.015 250)"); ctx.metalness(0.8);
    for (const s of [-1, 1]) { for (let a = -IN; a <= 0.8; a += 0.12) B(ctx, a - 0.008, a + 0.008, 0, 2.3, s * 0.9 - 0.008, s * 0.9 + 0.008); for (let y = 0.1; y <= 2.3; y += 0.25) B(ctx, -IN, 0.8, y - 0.01, y + 0.01, s * 0.9 - 0.01, s * 0.9 + 0.01); }
    for (const s of [-1, 1]) for (const y of [0.4, 1.1, 1.8]) { B(ctx, -1.2, 0.6, y, y + 0.03, s * IN - s * 0.5, s * IN); ctx.albedo(null); ctx.color(`oklch(0.55 0.06 ${60 + y * 40})`); B(ctx, -1.0, -0.4, y + 0.03, y + 0.35, s * IN - s * 0.45, s * IN - s * 0.05); ctx.albedo(RUSTY); ctx.color("oklch(0.5 0.015 250)"); }
  } else if (t === "break") { // a table with chairs, a counter with a sink, a dead microwave
    ctx.albedo(null); ctx.color("oklch(0.8 0.02 90)"); B(ctx, -0.5, 0.5, 0.72, 0.76, -0.6, 0.6); ctx.color("oklch(0.3 0.01 250)"); pipe(ctx, P(0, 0, 0), P(0, 0.72, 0), 0.04, 6);
    for (const s of [-1, 1]) { ctx.color("oklch(0.55 0.12 30)"); B(ctx, -0.2, 0.2, 0.44, 0.48, s * 0.85 - 0.2, s * 0.85 + 0.2); B(ctx, -0.2, 0.2, 0.48, 0.9, s * 1.05 - 0.02, s * 1.05 + 0.02); }
    ctx.albedo(WOOD); ctx.color("oklch(0.5 0.05 60)"); B(ctx, -1.6, 0.8, 0, 0.9, IN - 0.6, IN); ctx.albedo(null); ctx.color("oklch(0.85 0.01 250)"); B(ctx, -1.0, -0.5, 0.86, 0.91, IN - 0.5, IN - 0.1);
    ctx.color("oklch(0.25 0.01 250)"); B(ctx, 0.1, 0.6, 0.9, 1.2, IN - 0.45, IN - 0.05);
  } else if (t === "electrical") { // breaker panels, conduit up into the ceiling, a transformer
    for (const s of [-1, 1]) for (const a of [-1.2, 0.2]) {
      ctx.albedo(RUSTY); ctx.color("oklch(0.55 0.02 150)"); B(ctx, a, a + 0.7, 0.9, 1.9, s * IN - s * 0.22, s * IN);
      ctx.color("oklch(0.35 0.01 250)"); pipe(ctx, P(a + 0.2, 1.9, s * (IN - 0.1)), P(a + 0.2, H, s * (IN - 0.1)), 0.035, 6); pipe(ctx, P(a + 0.5, 1.9, s * (IN - 0.1)), P(a + 0.5, H, s * (IN - 0.1)), 0.035, 6);
      ctx.albedo(null); ctx.color("oklch(0.85 0.16 90)"); B(ctx, a + 0.25, a + 0.45, 1.6, 1.75, s * IN - s * 0.225, s * IN - s * 0.22);
    }
    ctx.albedo(RUSTY); ctx.color("oklch(0.35 0.03 150)"); B(ctx, 0.6, 1.4, 0, 1.1, -0.5, 0.5);
    for (let i = 0; i < 5; i++) B(ctx, 0.62 + i * 0.16, 0.66 + i * 0.16, 0.1, 1.0, -0.56, 0.56);
  }
}

function hall(ctx, M) {
  const x0 = HALL.x0 + T, x1 = HALL.x1 - T, z0 = HALL.z0 + T, z1 = HALL.z1 - T, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = 1.4, Y = CATWALK;
  ctx.albedo("cdn/texture-dirty-concrete-ceiling-slab.png"); ctx.color("oklch(0.4 0.01 70)"); ctx.metalness(0); ctx.roughness(0.95);
  ctx.quad(HALL.x0, HALL_H, HALL.z0, HALL.x1, HALL_H, HALL.z0, HALL.x1, HALL_H, HALL.z1, HALL.x0, HALL_H, HALL.z1);
  // the boiler: 11 m of riveted drum on saddles, a firebox, banded seams, a stack through the roof
  const R = 2.3, ay = 0.6 + R, bx0 = cx - 6, bx1 = cx + 4.5;
  ctx.albedo(WALL); ctx.color("oklch(0.55 0.01 80)"); for (const x of [bx0 + 1.5, cx - 0.7, bx1 - 1.5]) box(ctx, x - 0.4, x + 0.4, 0, ay - 1.2, cz - R * 0.8, cz + R * 0.8);
  ctx.albedo(RUSTY); ctx.metalness(0.55); ctx.roughness(0.6); ctx.color("oklch(0.36 0.04 40)");
  pipe(ctx, [bx0, ay, cz], [bx1, ay, cz], R, M + 14);
  ctx.color("oklch(0.25 0.02 40)"); for (let x = bx0 + 0.6; x < bx1; x += 1.6) pipe(ctx, [x, ay, cz], [x + 0.12, ay, cz], R + 0.05, M + 14);
  ctx.color("oklch(0.3 0.03 40)"); tube(ctx, [[bx1, ay, cz], [bx1 + 0.4, ay, cz], [bx1 + 0.55, ay, cz]], [R, R * 0.7, 0.01], M + 14, [1, 1], 0, 1, 1);
  tube(ctx, [[bx0, ay, cz], [bx0 - 0.35, ay, cz], [bx0 - 0.5, ay, cz]], [R, R * 0.75, 0.01], M + 14, [1, 1], 0, 1, 1);
  ctx.color("oklch(0.2 0.01 40)"); box(ctx, bx0 - 0.75, bx0 - 0.45, ay - 1.1, ay + 0.1, cz - 0.6, cz + 0.6); // firebox door
  ctx.albedo(null); ctx.color("oklch(0.75 0.2 45)"); ctx.emissive("oklch(0.6 0.22 40)"); for (let i = 0; i < 4; i++) box(ctx, bx0 - 0.77, bx0 - 0.74, ay - 0.95 + i * 0.12, ay - 0.9 + i * 0.12, cz - 0.45, cz + 0.45); ctx.emissive(null);
  ctx.albedo(RUSTY); ctx.color("oklch(0.28 0.02 40)"); pipe(ctx, [bx1 - 2, ay + R - 0.2, cz], [bx1 - 2, HALL_H, cz], 0.6, M + 4);
  ctx.color("oklch(0.45 0.06 60)"); for (const [x, s] of [[cx - 3, 1], [cx + 1, -1], [cx - 1, 1]]) tube(ctx, [[x, ay + R - 0.3, cz], [x, ay + R + 0.6, cz], [x, ay + R + 0.9, cz + s * 0.5], [x, ay + R + 0.9, cz + s * 8.5]], [0.18, 0.18, 0.18, 0.18], M, [1, 1], 0, 1, 1);
  ctx.albedo(null); ctx.color("oklch(0.92 0.02 90)"); for (const x of [cx - 4, cx]) pipe(ctx, [x, ay + 0.8, cz - R - 0.05], [x, ay + 0.8, cz - R - 0.1], 0.2, 14);
  // the catwalk ring: grated deck, posts, rails; a stair from the floor; a bridge across past the boiler's end
  ctx.albedo(RUSTY); ctx.color("oklch(0.4 0.015 250)"); ctx.metalness(0.7); ctx.roughness(0.5);
  box(ctx, x0, x1, Y - 0.08, Y, z0, z0 + W); box(ctx, x0, x1, Y - 0.08, Y, z1 - W, z1); box(ctx, x0, x0 + W, Y - 0.08, Y, z0 + W, z1 - W); box(ctx, x1 - W, x1, Y - 0.08, Y, z0 + W, z1 - W);
  const bxm = cx + 6.6; box(ctx, bxm - 0.7, bxm + 0.7, Y - 0.08, Y, z0 + W, z1 - W);
  ctx.color("oklch(0.62 0.15 70)");
  const rail = (a, b) => { pipe(ctx, [a[0], Y + 1.0, a[1]], [b[0], Y + 1.0, b[1]], 0.03, 6); pipe(ctx, [a[0], Y + 0.5, a[1]], [b[0], Y + 0.5, b[1]], 0.02, 6); const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5); for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; pipe(ctx, [x, Y, z], [x, Y + 1.0, z], 0.025, 6); } };
  const ix0 = x0 + W, ix1 = x1 - W, iz0 = z0 + W, iz1 = z1 - W, sx0 = x0 + 4, sx1 = sx0 + 6.3;
  rail([ix0, iz0], [sx0, iz0]); rail([sx1, iz0], [bxm - 0.7, iz0]); rail([bxm + 0.7, iz0], [ix1, iz0]); rail([ix0, iz1], [bxm - 0.7, iz1]); rail([bxm + 0.7, iz1], [ix1, iz1]);
  rail([ix0, iz0], [ix0, iz1]); rail([ix1, iz0], [ix1, iz1]); rail([bxm - 0.7, iz0], [bxm - 0.7, iz1]); rail([bxm + 0.7, iz0], [bxm + 0.7, iz1]);
  ctx.color("oklch(0.3 0.01 250)"); for (const [x, z] of [[ix0, iz0], [ix1, iz0], [ix0, iz1], [ix1, iz1], [bxm, cz], [(ix0 + bxm) / 2, iz0], [(ix0 + bxm) / 2, iz1]]) pipe(ctx, [x, 0, z], [x, Y - 0.08, z], 0.09, M);
  // the stair: 18 solid treads rising along the south catwalk's inner edge
  ctx.color("oklch(0.38 0.015 250)"); for (let i = 0; i < 18; i++) box(ctx, sx0 + i * 0.35, sx0 + (i + 1) * 0.35, 0, (i + 1) * (Y / 18), iz0, iz0 + 1.1);
  ctx.color("oklch(0.62 0.15 70)"); pipe(ctx, [sx0, 1.0, iz0 + 1.1], [sx1, Y + 1.0, iz0 + 1.1], 0.03, 6);
  // pipes from the boiler to the walls, overhead, and gauges on the drum
  ctx.color("oklch(0.4 0.05 200)"); for (const z of [z0 + 0.3, z1 - 0.3]) for (const y of [5.4, 6.0, 6.6]) pipe(ctx, [x0, y, z], [x1, y, z], 0.14, M);
}

function pipeMaze(ctx, M) {
  ctx.albedo(RUSTY); ctx.metalness(0.6); ctx.roughness(0.55);
  const tones = ["oklch(0.42 0.05 40)", "oklch(0.45 0.06 200)", "oklch(0.5 0.03 90)", "oklch(0.38 0.08 150)", "oklch(0.55 0.12 60)"];
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) for (const d of [0, 1]) {
    const nx = cx + D4[d][0], nz = cz + D4[d][1];
    if (!inPipes(cx, cz) || !inPipes(nx, nz) || isOpen(cx, cz, d)) continue;
    const xe = (cx + 1) * S - HALF, ze = (cz + 1) * S - HALF, a0 = (d === 0 ? cz : cx) * S - HALF - 0.25, a1 = a0 + S + 0.5;
    const P = (a, y, o) => (d === 0 ? [xe + o, y, a] : [a, y, ze + o]);
    for (let i = 0; i < 6; i++) { const r = 0.12 + hash(cx * 7 + i, cz, d + 3) * 0.08, y = 0.18 + i * 0.44, o = (hash(cx, cz * 5 + i, d) - 0.5) * 0.12; ctx.color(tones[Math.floor(hash(cx + i, cz, d + 9) * 5)]); pipe(ctx, P(a0, y, o), P(a1, y, o), r, M); }
    ctx.color("oklch(0.25 0.01 250)"); for (const f of [0.25, 0.75]) { const a = a0 + (a1 - a0) * f; box(ctx, ...(d === 0 ? [xe - 0.25, xe + 0.25, 0, H, a - 0.04, a + 0.04] : [a - 0.04, a + 0.04, 0, H, ze - 0.25, ze + 0.25])); }
    ctx.color("oklch(0.5 0.18 25)"); if (hash(cx, cz, d + 31) < 0.4) { const p = P((a0 + a1) / 2, 1.3, 0.32); tube(ctx, [[p[0] - (d ? 0 : 0.02), p[1], p[2] - (d ? 0.02 : 0)], [p[0] + (d ? 0 : 0.02), p[1], p[2] + (d ? 0.02 : 0)]], [0.22, 0.22], 12, [1, 1], 0, 1, 1); }
  }
  // overhead runs across every pipe-maze cell
  ctx.color("oklch(0.35 0.03 60)");
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) if (inPipes(cx, cz)) { const c = cellCenter(cx, cz); pipe(ctx, [c.x - S / 2, H - 0.25, c.z + 0.6], [c.x + S / 2, H - 0.25, c.z + 0.6], 0.1, M); pipe(ctx, [c.x - 0.8, H - 0.4, c.z - S / 2], [c.x - 0.8, H - 0.4, c.z + S / 2], 0.08, M); }
}

export function geometry(ctx) {
  const M = ctx.lod <= 2 ? 10 : 6;
  for (const r of SIDE) room(ctx, r, M);
  hall(ctx, M);
  pipeMaze(ctx, M);
  ctx.albedo(null); ctx.metalness(0);
}
