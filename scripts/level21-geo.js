// Level 2.1 "Locked": white painted block halls with dark vinyl baseboards under a ceiling of beige conduit, fluorescent troffers, orange wooden doors, EXIT signs,
// janitorial gear (mop buckets, brooms, fire extinguishers, fuse boxes), fully furnished room interiors (Base Alef atrium, Exploration Wing, double-decker Quarters bunks,
// Administration offices, Checkered Locker Room with benches, Restroom stalls & sinks, Break Room kitchenette, Storage shelving, Refrigerator Paradise with Saltine stockpiles),
// and in the east The Edges: rock-cut tunnels under heavy silver ducts, white block observation rooms down the south side, John Banks's blasted roof crater, and the Level 8 cave mouth.
import { N, S, H, HALF, isOpen, openings, zoneOf, roomAt, ROOMS, hash, cellCenter, heightOf, isEdge, laneCell, DOWN, CAVE, LANE, EDGE_X } from "./lib/level21.js";
import { slab, tube, prism } from "./lib/shapes.js";

const FLOOR = "cdn/texture-grimy-wet-utility-concrete-floor.png", WALL = "cdn/texture-chalky-stained-concrete-wall.png", BLOCK = "cdn/texture-painted-white-cinder-block-wall-smooth.png", VINYL = "cdn/texture-worn-grey-vinyl-composition-floor-tile.png", TILE = "cdn/texture-acoustic-drop-ceiling-tiles-water-stained.png", CEIL = "cdn/texture-dirty-concrete-ceiling-slab.png", RUSTY = "cdn/texture-scratched-worn-steel.png", WOOD = "cdn/texture-worn-hardwood-grain.png";
const T = 0.18; // half wall thickness: the walls of this level are thin
const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const pipe = (ctx, a, b, r, M) => tube(ctx, [a, b], [r, r], M, [1, 1], 0, 1, 1);
const closed = (cx, cz, d) => !isOpen(cx, cz, d);
const TILED = new Set(["lockers", "restroom", "break", "base"]);
const center = (r) => cellCenter(r.x0 + (r.w - 1) / 2, r.z0 + (r.d - 1) / 2);
const edgeOf = (r, d) => { const c = center(r); return d === 0 ? c.x + (r.w * S) / 2 : d === 2 ? c.x - (r.w * S) / 2 : d === 1 ? c.z + (r.d * S) / 2 : c.z - (r.d * S) / 2; };

function bunkBed(ctx, x, z, M) {
  // Double-decker steel frame bunk bed with mattresses, pillows, and side ladder
  ctx.albedo(RUSTY); ctx.color("oklch(0.32 0.02 250)"); ctx.metalness(0.65); ctx.roughness(0.5);
  for (const [dx, dz] of [[-0.46, -0.94], [0.46, -0.94], [-0.46, 0.94], [0.46, 0.94]]) pipe(ctx, [x + dx, 0, z + dz], [x + dx, 1.75, z + dz], 0.03, M);
  for (const y of [0.32, 1.28]) {
    box(ctx, x - 0.48, x + 0.48, y - 0.04, y, z - 0.96, z + 0.96); // steel spring deck
    box(ctx, x - 0.46, x + 0.46, y, y + 0.22, z - 0.96, z - 0.92); // headboard
    box(ctx, x - 0.46, x + 0.46, y, y + 0.16, z + 0.92, z + 0.96); // footboard
  }
  // Ladder on the side
  for (const dz of [-0.65, -0.3]) pipe(ctx, [x + 0.49, 0.32, z + dz], [x + 0.49, 1.35, z + dz], 0.018, 5);
  for (const y of [0.55, 0.8, 1.05]) box(ctx, x + 0.48, x + 0.51, y, y + 0.025, z - 0.65, z - 0.3);
  // Mattresses & pillows
  ctx.albedo(null); ctx.metalness(0); ctx.roughness(0.9);
  for (const [y, col] of [[0.32, "oklch(0.38 0.06 35)"], [1.28, "oklch(0.36 0.05 145)"]]) {
    ctx.color(col); box(ctx, x - 0.44, x + 0.44, y, y + 0.11, z - 0.9, z + 0.9);
    ctx.color("oklch(0.86 0.015 90)"); box(ctx, x - 0.3, x + 0.3, y + 0.11, y + 0.17, z - 0.84, z - 0.52);
  }
}

function dressRooms(ctx, M) {
  for (const r of ROOMS) {
    const c = center(r), xW = edgeOf(r, 2) + T, xE = edgeOf(r, 0) - T, zN = edgeOf(r, 3) + T, zS = edgeOf(r, 1) - T;
    if (r.type === "base") {
      // Base Alef Atrium: 4 painted structural columns with olive M.E.G. bands, wall map board, and 4 steel-framed cots with mattresses
      for (const [dx, dz] of [[-3.8, -4.2], [3.8, -4.2], [-3.8, 4.2], [3.8, 4.2]]) {
        ctx.albedo(WALL); ctx.color("oklch(0.86 0.012 95)"); ctx.metalness(0); ctx.roughness(0.9);
        box(ctx, c.x + dx - 0.28, c.x + dx + 0.28, 0, H + 0.5, c.z + dz - 0.28, c.z + dz + 0.28);
        ctx.albedo(null); ctx.color("oklch(0.42 0.06 140)");
        box(ctx, c.x + dx - 0.29, c.x + dx + 0.29, 1.1, 1.45, c.z + dz - 0.29, c.z + dz + 0.29);
        ctx.color("oklch(0.26 0.01 250)");
        box(ctx, c.x + dx - 0.295, c.x + dx + 0.295, 0, 0.14, c.z + dz - 0.295, c.z + dz + 0.295);
      }
      // Briefing map board on north wall
      ctx.albedo(WOOD); ctx.color("oklch(0.55 0.07 65)"); box(ctx, c.x - 2.2, c.x + 2.2, 1.1, 2.35, zN, zN + 0.05);
      ctx.albedo(null); ctx.color("oklch(0.9 0.02 95)"); box(ctx, c.x - 2.05, c.x + 0.4, 1.22, 2.22, zN + 0.05, zN + 0.065);
      ctx.color("oklch(0.65 0.16 30)"); box(ctx, c.x + 0.6, c.x + 1.9, 1.35, 2.1, zN + 0.05, zN + 0.065);
      // Server/radio rack beside the comms desk on the south wall
      ctx.albedo(RUSTY); ctx.color("oklch(0.26 0.02 250)"); ctx.metalness(0.65); ctx.roughness(0.45);
      box(ctx, c.x + 2.5, c.x + 3.35, 0, 2.05, zS - 0.65, zS - 0.05);
      ctx.albedo(null); ctx.metalness(0);
      for (let k = 0; k < 5; k++) {
        ctx.color(k === 2 ? "oklch(0.65 0.22 30)" : "oklch(0.75 0.18 145)"); ctx.emissive(k === 2 ? "oklch(0.65 0.22 30)" : "oklch(0.75 0.18 145)");
        box(ctx, c.x + 2.62 + k * 0.13, c.x + 2.68 + k * 0.13, 1.55, 1.6, zS - 0.67, zS - 0.64);
      }
      ctx.emissive(null);
      // Base Alef's 4 cots are modeled pieces now (places/level21/sim.js, COT)
    } else if (r.type === "bunks") {
      // Quarters: 6 full double-decker bunk beds matching the 6 physics colliders in sim.js
      for (let i = 0; i < 6; i++) {
        const bx = c.x - 3.4 + (i % 3) * 3.4, bz = c.z - 2.4 + Math.floor(i / 3) * 4.2;
        bunkBed(ctx, bx, bz, M);
      }
    } else if (r.type === "explo") {
      // Exploration Wing: heavy steel gear racks on north wall & central specimen/map table
      ctx.albedo(RUSTY); ctx.color("oklch(0.38 0.02 250)"); ctx.metalness(0.65); ctx.roughness(0.5);
      for (const sx of [-3.2, -1.2, 1.2, 3.2]) pipe(ctx, [c.x + sx, 0, zN + 0.35], [c.x + sx, 2.2, zN + 0.35], 0.03, 5);
      for (const y of [0.5, 1.2, 1.9]) box(ctx, c.x - 3.3, c.x + 3.3, y, y + 0.04, zN + 0.04, zN + 0.65);
      ctx.albedo(null); ctx.metalness(0); ctx.roughness(0.85);
      for (let k = 0; k < 5; k++) {
        ctx.color(["oklch(0.48 0.1 55)", "oklch(0.38 0.06 145)", "oklch(0.55 0.14 80)"][k % 3]);
        box(ctx, c.x - 2.9 + k * 1.2, c.x - 2.1 + k * 1.2, 0.54, 0.92, zN + 0.1, zN + 0.58);
      }
    } else if (r.type === "office") {
      // Administration: corkboard with memos on north wall, bookshelf of binders on west wall, scattered floor papers
      ctx.albedo(WOOD); ctx.color("oklch(0.58 0.08 62)"); ctx.metalness(0); ctx.roughness(0.85);
      box(ctx, c.x - 2.4, c.x + 2.4, 1.15, 2.15, zN, zN + 0.05);
      ctx.albedo(null);
      for (let i = 0; i < 9; i++) {
        const px = c.x - 2.0 + (i % 5) * 0.95, py = 1.3 + Math.floor(i / 5) * 0.45;
        ctx.color(i === 2 ? "oklch(0.78 0.14 85)" : "oklch(0.92 0.015 90)");
        box(ctx, px - 0.14, px + 0.14, py - 0.16, py + 0.16, zN + 0.05, zN + 0.065);
      }
      // Bookshelf on west wall
      ctx.albedo(RUSTY); ctx.color("oklch(0.36 0.02 250)"); ctx.metalness(0.6);
      for (const y of [0.4, 0.95, 1.5, 2.05]) box(ctx, xW, xW + 0.42, y, y + 0.035, c.z - 2.2, c.z + 1.8);
      ctx.albedo(null); ctx.metalness(0);
      for (let i = 0; i < 12; i++) {
        ctx.color(["oklch(0.48 0.14 28)", "oklch(0.38 0.09 245)", "oklch(0.32 0.04 150)"][i % 3]);
        box(ctx, xW + 0.05, xW + 0.36, 0.99, 1.32, c.z - 2.0 + i * 0.28, c.z - 1.86 + i * 0.28);
      }
    } else if (r.type === "lockers") {
      // Checkered Locker Room: 2 long hardwood locker benches down the middle, coat hooks, and a yellow mop bucket
      for (const dz of [-1.2, 1.4]) {
        ctx.albedo(WOOD); ctx.color("oklch(0.58 0.07 62)"); ctx.metalness(0); ctx.roughness(0.8);
        box(ctx, c.x - 2.6, c.x + 1.8, 0.42, 0.48, c.z + dz - 0.24, c.z + dz + 0.24);
        ctx.albedo(RUSTY); ctx.color("oklch(0.3 0.01 250)"); ctx.metalness(0.7);
        for (const dx of [-2.2, -0.4, 1.4]) pipe(ctx, [c.x + dx, 0, c.z + dz], [c.x + dx, 0.42, c.z + dz], 0.04, 6);
      }
      // Yellow janitorial mop bucket & wringer in the corner
      ctx.albedo(null); ctx.metalness(0.1); ctx.roughness(0.5); ctx.color("oklch(0.78 0.16 90)");
      pipe(ctx, [xW + 0.65, 0.05, zS - 0.65], [xW + 0.65, 0.46, zS - 0.65], 0.24, 8);
      ctx.color("oklch(0.55 0.06 65)"); pipe(ctx, [xW + 0.65, 0.2, zS - 0.65], [xW + 0.4, 1.45, zS - 0.5], 0.02, 5);
    } else if (r.type === "restroom") {
      // Restroom: 3 toilet stalls along the east wall, sink vanity counter & mirrors along the west wall
      ctx.albedo(WALL); ctx.color("oklch(0.82 0.015 210)"); ctx.metalness(0.1); ctx.roughness(0.6);
      for (let k = 0; k < 3; k++) {
        const sz = zN + 1.1 + k * 1.8;
        box(ctx, xE - 1.45, xE, 0.15, 2.05, sz, sz + 0.05); // stall divider
        ctx.color("oklch(0.55 0.04 195)");
        box(ctx, xE - 1.45, xE - 1.4, 0.15, 1.95, sz - 0.85, sz - 0.12); // stall door
        // Porcelain toilet inside stall
        ctx.albedo(null); ctx.color("oklch(0.95 0.005 240)"); ctx.roughness(0.25);
        pipe(ctx, [xE - 0.55, 0, sz - 0.48], [xE - 0.55, 0.42, sz - 0.48], 0.22, 8);
        box(ctx, xE - 0.32, xE - 0.04, 0.42, 0.88, sz - 0.72, sz - 0.24);
        ctx.albedo(WALL); ctx.color("oklch(0.82 0.015 210)");
      }
      // West wall sink counter & mirrors
      ctx.albedo(null); ctx.color("oklch(0.88 0.01 230)"); ctx.roughness(0.35);
      box(ctx, xW, xW + 0.62, 0.78, 0.88, zN + 0.8, zS - 0.8);
      for (const sz of [c.z - 1.2, c.z + 0.8]) {
        ctx.color("oklch(0.96 0.005 240)"); box(ctx, xW + 0.12, xW + 0.52, 0.86, 0.92, sz - 0.32, sz + 0.32); // sink basin
        ctx.color("oklch(0.75 0.015 230)"); ctx.metalness(0.85); ctx.roughness(0.15);
        box(ctx, xW + 0.02, xW + 0.05, 1.12, 1.98, sz - 0.38, sz + 0.38); // mirror
        ctx.metalness(0);
      }
    } else if (r.type === "break") {
      // Break Room: cafeteria table with 4 chairs, counter with sink and microwave
      ctx.albedo(null); ctx.color("oklch(0.84 0.015 90)"); ctx.roughness(0.5);
      box(ctx, c.x - 0.85, c.x + 0.45, 0.72, 0.77, c.z - 1.2, c.z + 1.2);
      ctx.albedo(RUSTY); ctx.color("oklch(0.3 0.01 250)"); ctx.metalness(0.7);
      for (const dz of [-0.8, 0.8]) pipe(ctx, [c.x - 0.2, 0, c.z + dz], [c.x - 0.2, 0.72, c.z + dz], 0.045, 6);
      ctx.albedo(null); ctx.metalness(0); ctx.color("oklch(0.52 0.14 32)");
      for (const [dx, dz] of [[-1.15, -0.6], [-1.15, 0.6], [0.75, -0.6], [0.75, 0.6]]) {
        box(ctx, c.x + dx - 0.22, c.x + dx + 0.22, 0.42, 0.47, c.z + dz - 0.22, c.z + dz + 0.22);
      }
      // Kitchenette counter along north wall
      ctx.albedo(WOOD); ctx.color("oklch(0.48 0.05 60)");
      box(ctx, xW + 0.2, xE - 0.8, 0, 0.88, zN, zN + 0.62);
      ctx.albedo(null); ctx.color("oklch(0.22 0.01 250)");
      box(ctx, c.x - 0.4, c.x + 0.25, 0.88, 1.22, zN + 0.08, zN + 0.5); // microwave
    } else if (r.type === "store") {
      // Storage Rooms: industrial wire shelving & chemical drums on wooden pallets
      ctx.albedo(WOOD); ctx.color("oklch(0.55 0.07 65)"); ctx.metalness(0);
      box(ctx, xW + 0.35, xW + 1.55, 0, 0.12, zN + 0.35, zN + 1.55); // pallet
      ctx.albedo(null); ctx.roughness(0.45);
      for (const [dx, dz, col] of [[0.65, 0.65, "oklch(0.42 0.12 245)"], [1.2, 0.65, "oklch(0.42 0.12 245)"], [0.9, 1.2, "oklch(0.68 0.15 85)"]]) {
        ctx.color(col); pipe(ctx, [xW + dx, 0.12, zN + dz], [xW + dx, 0.98, zN + dz], 0.26, 8);
      }
    } else if (r.type === "fridges") {
      // Refrigerator Paradise: central survivor sorting table piled with gold-and-red boxes of Saltine crackers!
      ctx.albedo(WOOD); ctx.color("oklch(0.52 0.06 62)"); ctx.metalness(0); ctx.roughness(0.8);
      box(ctx, c.x - 2.4, c.x + 1.2, 0.74, 0.8, c.z - 0.85, c.z + 0.85);
      ctx.albedo(RUSTY); ctx.color("oklch(0.32 0.015 250)"); ctx.metalness(0.65);
      for (const [dx, dz] of [[-2.2, -0.7], [1.0, -0.7], [-2.2, 0.7], [1.0, 0.7]]) pipe(ctx, [c.x + dx, 0, c.z + dz], [c.x + dx, 0.74, c.z + dz], 0.04, 6);
      // Stacked Saltine cracker boxes on the table and atop the fridges
      ctx.albedo(null); ctx.metalness(0); ctx.roughness(0.65);
      for (let k = 0; k < 9; k++) {
        const bx = c.x - 1.9 + (k % 5) * 0.62, bz = c.z - 0.45 + Math.floor(k / 5) * 0.48, bh = 0.18 + (k % 3) * 0.08;
        ctx.color(k % 2 ? "oklch(0.82 0.14 85)" : "oklch(0.58 0.2 30)");
        box(ctx, bx - 0.16, bx + 0.16, 0.8, 0.8 + bh, bz - 0.12, bz + 0.12);
      }
    }
  }
}

export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 6 : 4;
  // ---- floors and ceilings, a cell at a time: tiles in the locker rooms, carpet runners in some halls, poured concrete in The Edges
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const x0 = cx * S - HALF, z0 = cz * S - HALF, z = zoneOf(cx, cz), h = heightOf(cx, cz), r = hash(cx, cz, 5);
    ctx.albedo(isEdge(cx, cz) ? FLOOR : VINYL);
    if (TILED.has(z)) { // black and grey vinyl, in 1 m squares like a school
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const a = x0 + i, b = z0 + j; ctx.color((i + j + cx + cz) % 2 ? "oklch(0.28 0.01 270)" : "oklch(0.78 0.01 250)"); ctx.quad(a, 0, b, a, 0, b + 1, a + 1, 0, b + 1, a + 1, 0, b); }
    } else if (z === "edge" || z === "edgecave") { ctx.color("oklch(0.72 0.035 105)"); ctx.quad(x0, 0, z0, x0, 0, z0 + S, x0 + S, 0, z0 + S, x0 + S, 0, z0); }
    else if (z === "fridges") {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const a = x0 + i, b = z0 + j; ctx.color((i + j) % 2 ? "oklch(0.86 0.015 95)" : "oklch(0.76 0.025 195)"); ctx.quad(a, 0, b, a, 0, b + 1, a + 1, 0, b + 1, a + 1, 0, b); }
    }
    else { // bare vinyl tile in 1 m squares, two close tones with grime between them; some cells carry a threadbare teal carpet instead
      ctx.albedo(null); const base = r < 0.18 ? [0.6, 0.04, 200] : r < 0.3 ? [0.7, 0.03, 60] : [0.86, 0.02, 85];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const a = x0 + i, b = z0 + j, tone = base[0] + (((i + j + cx * 3 + cz) % 2) ? 0.03 : -0.02) + (hash(cx * 4 + i, cz * 4 + j, 9) - 0.5) * 0.05; ctx.color(`oklch(${tone} ${base[1]} ${base[2]})`); ctx.quad(a, 0, b, a, 0, b + 1, a + 1, 0, b + 1, a + 1, 0, b); }
    } // a threadbare carpet, or bare grime
    ctx.albedo(isEdge(cx, cz) ? CEIL : TILE); ctx.color(isEdge(cx, cz) ? "oklch(0.38 0.01 150)" : z === "fridges" || z === "restroom" ? "oklch(0.95 0.01 90)" : "oklch(0.9 0.014 90)");
    ctx.quad(x0, h, z0, x0 + S, h, z0, x0 + S, h, z0 + S, x0, h, z0 + S);
  }

  // ---- walls on every closed edge. Hall walls are painted block with dark vinyl baseboards; The Edges are rock, except the white block rooms down the south side
  const wallH = (cx, cz, nx, nz) => Math.max(heightOf(cx, cz), heightOf(nx, nz));
  const rockWall = (xa, xb, za, zb, h, seed) => { // a stretch of raw rock: jittered prisms, some wider at the foot
    const along = Math.abs(xb - xa) > Math.abs(zb - za) ? "x" : "z", len = along === "x" ? Math.abs(xb - xa) : Math.abs(zb - za), n = Math.max(2, Math.round(len / 1.1));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n; if (along === "z" && Math.abs(xa - CAVE.x) < 0.01 && Math.abs(za + (zb - za) * (t0 + t1) / 2 - CAVE.z) < 1.6) continue; // the cave mouth is open
      const r1 = hash(seed + k, 1, 71), r2 = hash(seed + k, 2, 72), r3 = hash(seed + k, 3, 73), r4 = hash(seed + k, 4, 74);
      const A = (t, o) => along === "x" ? [xa + (xb - xa) * t, za + o] : [xa + o, za + (zb - za) * t];
      const th = 0.25 + r1 * 0.45;
      const pts = [A(t0, -th * (0.6 + r2 * 0.6)), A((t0 + t1) / 2, -th * (0.8 + r3 * 0.9)), A(t1, -th * (0.6 + r4 * 0.6)), A(t1, th * (0.6 + r2 * 0.6)), A((t0 + t1) / 2, th * (0.8 + r4 * 0.9)), A(t0, th * (0.6 + r3 * 0.6))];
      prism(ctx, pts, 0, h * (0.82 + r1 * 0.18));
      if (r2 > 0.4) prism(ctx, pts.map(([x, z]) => [x + (hash(seed + k, 5, 75) - 0.5) * 0.3, z + (hash(seed + k, 6, 76) - 0.5) * 0.3]), h * 0.5, h);
    }
  };
  for (let cx = -1; cx < N; cx++) for (let cz = -1; cz < N; cz++) {
    for (const d of [0, 1]) {
      const nx = cx + (d === 0 ? 1 : 0), nz = cz + (d === 1 ? 1 : 0);
      if ((d === 0 && cz < 0) || (d === 1 && cx < 0)) continue;
      if (!(cx < 0 || cz < 0 || closed(cx, cz, d))) continue;
      if (cx < 0 && d === 1) continue;
      if (cz < 0 && d === 0) continue;
      const xe = (cx + 1) * S - HALF, ze = (cz + 1) * S - HALF, x0 = cx * S - HALF, z0 = cz * S - HALF;
      const rock = (isEdge(cx, cz) || isEdge(nx, nz)) && !(cz === LANE.z0 + LANE.d - 1 && d === 1 && cx >= 21) && !(cx === 20 && d === 0);
      const h = wallH(cx, cz, nx, nz);
      if (rock) {
        ctx.albedo(WALL); ctx.color("oklch(0.48 0.015 110)"); ctx.roughness(0.95);
        if (d === 0) rockWall(xe, xe, z0, z0 + S, h, cx * 131 + cz * 17 + 3); else rockWall(x0, x0 + S, ze, ze, h, cx * 91 + cz * 31 + 9);
      } else {
        ctx.albedo(WALL); ctx.color(isEdge(cx, cz) || isEdge(nx, nz) ? "oklch(0.93 0.008 95)" : "oklch(0.9 0.014 95)"); ctx.roughness(0.9);
        if (d === 0) {
          ctx.albedo(null); ctx.color("oklch(0.6 0.04 165)"); box(ctx, xe - T, xe + T, 0, 1.12, z0 - T, z0 + S + T); // the lower wall: satin institutional green
          ctx.albedo(BLOCK); ctx.color(isEdge(cx, cz) || isEdge(nx, nz) ? "oklch(0.97 0.006 95)" : "oklch(0.95 0.016 92)"); box(ctx, xe - T, xe + T, 1.12, h, z0 - T, z0 + S + T);
          ctx.albedo(null); ctx.color("oklch(0.85 0.02 90)"); box(ctx, xe - T - 0.025, xe + T + 0.025, 1.08, 1.17, z0 - T, z0 + S + T); // chair rail
          ctx.color("oklch(0.24 0.01 250)"); box(ctx, xe - T - 0.02, xe + T + 0.02, 0, 0.12, z0 - T, z0 + S + T); // vinyl baseboard
        } else {
          ctx.albedo(null); ctx.color("oklch(0.6 0.04 165)"); box(ctx, x0 - T, x0 + S + T, 0, 1.12, ze - T, ze + T);
          ctx.albedo(BLOCK); ctx.color(isEdge(cx, cz) || isEdge(nx, nz) ? "oklch(0.97 0.006 95)" : "oklch(0.95 0.016 92)"); box(ctx, x0 - T, x0 + S + T, 1.12, h, ze - T, ze + T);
          ctx.albedo(null); ctx.color("oklch(0.85 0.02 90)"); box(ctx, x0 - T, x0 + S + T, 1.08, 1.17, ze - T - 0.025, ze + T + 0.025);
          ctx.color("oklch(0.24 0.01 250)"); box(ctx, x0 - T, x0 + S + T, 0, 0.12, ze - T - 0.02, ze + T + 0.02);
        }
      }
    }
  }
  // the world's edge: the stairwell door in the west wall (with blasted steel shutter remnants and hazard stripes), the cave mouth in the east wall
  ctx.albedo(RUSTY); ctx.color("oklch(0.45 0.01 250)"); ctx.metalness(0.5); box(ctx, DOWN.x + T, DOWN.x + T + 0.06, 0, 2.4, DOWN.z - 0.85, DOWN.z + 0.85);
  ctx.color("oklch(0.4 0.02 140)"); box(ctx, DOWN.x + T, DOWN.x + T + 0.1, 0, 2.25, DOWN.z - 0.68, DOWN.z + 0.68);
  // Torn steel lockout shutter header over the Level 2 stairwell door
  ctx.color("oklch(0.32 0.02 250)"); box(ctx, DOWN.x + T, DOWN.x + T + 0.24, 2.15, 2.55, DOWN.z - 0.95, DOWN.z + 0.95);
  ctx.albedo(null); ctx.metalness(0);
  for (let i = 0; i < 6; i++) {
    ctx.color(i % 2 ? "oklch(0.18 0 0)" : "oklch(0.8 0.16 88)");
    box(ctx, DOWN.x + T + 0.11, DOWN.x + T + 0.12, 2.28, 2.44, DOWN.z - 0.84 + i * 0.28, DOWN.z - 0.56 + i * 0.28);
  }
  ctx.color("oklch(0.01 0 0)"); box(ctx, CAVE.x - 0.1, CAVE.x + 0.3, 0, 3.4, CAVE.z - 1.7, CAVE.z + 1.7); // the dark of the cave

  // ---- the ceiling: bundles of beige conduit down every hall, red sprinkler mains, cable trays, and big silver ducts with hangers over The Edges
  const run = (c, d, y, off, r) => { const a = d === 0 ? [[c.x, y, c.z + off], [c.x + S, y, c.z + off]] : [[c.x + off, y, c.z], [c.x + off, y, c.z + S]]; tube(ctx, a, [r, r], M, [1, 1], 0, 1, 1); };
  ctx.albedo(null); ctx.metalness(0.2); ctx.roughness(0.7);
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz), c = cellCenter(cx, cz), h = heightOf(cx, cz);
    if (z === "fridges" || z === "restroom" || z === "landing") continue;
    if (isEdge(cx, cz)) {
      if (!isOpen(cx, cz, 0)) continue;
      ctx.color("oklch(0.72 0.01 230)"); ctx.metalness(0.72); ctx.roughness(0.38);
      if (laneCell(cx, cz) && cz === LANE.z0 + LANE.d - 1) {
        run(c, 0, h - 0.9, 1.2, 0.5); run(c, 0, h - 0.5, 0.2, 0.28);
        // Steel duct collar straps & ceiling hangers every cell
        ctx.color("oklch(0.35 0.01 250)");
        pipe(ctx, [c.x + S * 0.5, h - 0.9, c.z + 1.2], [c.x + S * 0.5, h, c.z + 1.2], 0.035, 5);
        pipe(ctx, [c.x + S * 0.5, h - 0.9, c.z + 1.2], [c.x + S * 0.5 + 0.08, h - 0.9, c.z + 1.2], 0.53, M + 2);
      }
      ctx.color("oklch(0.4 0.01 250)"); box(ctx, c.x, c.x + S, h - 0.12, h - 0.06, c.z + 0.55, c.z + 1.0); ctx.metalness(0.2); ctx.roughness(0.7);
      continue;
    }
    for (const d of [0, 1]) if (isOpen(cx, cz, d)) for (let k = 0; k < 5; k++) {
      ctx.color(["oklch(0.68 0.04 80)", "oklch(0.64 0.05 70)", "oklch(0.72 0.03 85)"][(k + cx) % 3]);
      run(c, d, h - 0.14 - (k % 2) * 0.06, (k - 2) * 0.17, 0.07);
    }
    if (hash(cx, cz, 15) < 0.18) { ctx.color("oklch(0.48 0.18 28)"); const d = isOpen(cx, cz, 0) ? 0 : 1; run(c, d, h - 0.32, 1.1, 0.1); } // red fire sprinkler main
  }

  // ---- doors, janitorial props (fire extinguishers, fuse boxes, mop buckets, vents), and EXIT signs in the halls
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const z = zoneOf(cx, cz); if (z !== "hall" && z !== "base") continue; const c = cellCenter(cx, cz);
    for (const d of [0, 1, 2, 3]) {
      if (!closed(cx, cz, d)) continue;
      const [nx, nz] = D4[d], tx = -nz, tz = nx, w = S / 2 - T, fx = c.x + nx * w, fz = c.z + nz * w;
      const plate = (a, b, y0, y1, out, color) => { ctx.color(color); const p = [fx + tx * a - nx * out, fz + tz * a - nz * out], q = [fx + tx * b, fz + tz * b]; box(ctx, Math.min(p[0], q[0]), Math.max(p[0], q[0]), y0, y1, Math.min(p[1], q[1]), Math.max(p[1], q[1])); };
      const rDoor = hash(cx * 4 + d, cz, 51);
      if (rDoor <= 0.16) {
        ctx.albedo(null); ctx.roughness(0.7);
        plate(-0.55, 0.55, 0, 2.2, 0.04, "oklch(0.88 0.02 90)"); // the frame
        plate(-0.47, 0.47, 0, 2.12, 0.07, hash(cx, cz, 53) < 0.8 ? "oklch(0.62 0.13 58)" : "oklch(0.55 0.04 150)"); // orange wood or green steel leaf
        plate(0.3, 0.4, 0.95, 1.02, 0.12, "oklch(0.7 0.01 250)"); // lever handle
        if (hash(cx, cz, 57) < 0.5) plate(-0.2, 0.2, 1.4, 1.7, 0.08, "oklch(0.1 0.005 250)"); // narrow wire-glass window
      } else if (rDoor < 0.22) {
        // Wall-mounted red fire extinguisher on bracket
        const p = [fx - nx * 0.12, fz - nz * 0.12];
        ctx.albedo(null); ctx.color("oklch(0.52 0.22 27)"); ctx.metalness(0.4); ctx.roughness(0.35);
        pipe(ctx, [p[0], 0.95, p[1]], [p[0], 1.42, p[1]], 0.085, 7);
        ctx.color("oklch(0.2 0.01 250)"); pipe(ctx, [p[0], 1.42, p[1]], [p[0], 1.5, p[1]], 0.035, 5);
        ctx.metalness(0);
      } else if (rDoor < 0.28) {
        // Grey steel electrical breaker box with yellow high-voltage decal
        ctx.albedo(RUSTY); ctx.metalness(0.5); ctx.roughness(0.5);
        plate(-0.28, 0.28, 1.15, 1.75, 0.1, "oklch(0.52 0.02 240)");
        ctx.albedo(null); ctx.metalness(0);
        plate(-0.1, 0.1, 1.45, 1.6, 0.11, "oklch(0.82 0.16 88)");
      } else if (rDoor < 0.33) {
        // Lower wall louver air vent
        ctx.albedo(RUSTY); ctx.metalness(0.6);
        plate(-0.38, 0.38, 0.25, 0.62, 0.03, "oklch(0.58 0.01 240)");
        ctx.metalness(0);
      }
    }
    if (hash(cx, cz, 61) < 0.09 && isOpen(cx, cz, 0) !== isOpen(cx, cz, 1)) { // an EXIT sign, red, over the way on
      const d = isOpen(cx, cz, 0) ? 0 : 1; ctx.albedo(null); ctx.color("oklch(0.55 0.25 28)"); ctx.emissive("oklch(0.6 0.26 28)");
      if (d === 0) box(ctx, c.x + 1.4 - 0.03, c.x + 1.4 + 0.03, 2.5, 2.75, c.z - 0.25, c.z + 0.25); else box(ctx, c.x - 0.25, c.x + 0.25, 2.5, 2.75, c.z + 1.4 - 0.03, c.z + 1.4 + 0.03);
      ctx.emissive(null);
    }
  }

  // ---- Furnished interiors for all named rooms
  dressRooms(ctx, M);

  // ---- The Edges: green exit signs down the roof, observation windows/doors in the south block rooms, John Banks's blast rubble, and the Level 8 cave mouth
  for (let cx = EDGE_X + 1; cx < N; cx += 3) {
    const c = cellCenter(cx, LANE.z0 + LANE.d - 1);
    ctx.albedo(null); ctx.color("oklch(0.7 0.25 150)"); ctx.emissive("oklch(0.7 0.25 150)");
    box(ctx, c.x - 0.22, c.x + 0.22, 3.4, 3.58, c.z + 1.4, c.z + 1.46);
    ctx.emissive(null);
  }
  // Windows and doors in the white block rooms along the lane's south wall
  for (let cx = EDGE_X + 1; cx < N - 1; cx++) {
    const c = cellCenter(cx, LANE.z0 + LANE.d - 1), zf = c.z + S / 2 - T - 0.03;
    ctx.albedo(null);
    if (cx % 3 === 0) {
      ctx.color("oklch(0.35 0.01 250)"); box(ctx, c.x - 0.96, c.x + 0.96, 1.14, 2.06, zf - 0.05, zf); // window frame & sill
      ctx.color("oklch(0.12 0.01 230)"); ctx.roughness(0.15); box(ctx, c.x - 0.88, c.x + 0.88, 1.2, 2.0, zf - 0.06, zf - 0.01);
    } else if (cx % 3 === 1) {
      ctx.color("oklch(0.85 0.015 90)"); box(ctx, c.x - 0.56, c.x + 0.56, 0, 2.26, zf - 0.04, zf); // frame
      ctx.color("oklch(0.55 0.02 200)"); ctx.roughness(0.6); box(ctx, c.x - 0.48, c.x + 0.48, 0, 2.18, zf - 0.06, zf - 0.01);
    }
  }
  // John Banks's dynamite blast site at the entrance to The Edges (cell EDGE_X, LANE.z0): scorched ceiling crater & fallen concrete rubble
  const jb = cellCenter(EDGE_X, LANE.z0);
  ctx.albedo(WALL); ctx.color("oklch(0.34 0.02 80)"); ctx.roughness(0.95);
  for (let k = 0; k < 6; k++) {
    const rx = jb.x - 0.8 + (k % 3) * 0.75, rz = jb.z - 0.7 + Math.floor(k / 3) * 0.85, rh = 0.22 + (k % 3) * 0.14;
    box(ctx, rx - 0.32, rx + 0.32, 0, rh, rz - 0.28, rz + 0.28);
  }
  // the dark mouth of the cave: a karst fissure in the rock the lane runs into, edged with wet stalactites & climbing rope pitons
  ctx.albedo(WALL); ctx.color("oklch(0.42 0.012 110)");
  for (let k = 0; k < 9; k++) {
    const a = hash(k, 3, 91) * 0.5, b = k < 4 ? -1.45 - a : 1.45 + a, y1 = 1.4 + hash(k, 4, 92) * 2.8;
    prism(ctx, [[CAVE.x - 0.95, CAVE.z + b - 0.32], [CAVE.x + 0.1, CAVE.z + b - 0.32], [CAVE.x + 0.1, CAVE.z + b + 0.32], [CAVE.x - 0.95, CAVE.z + b + 0.32]], 0, y1);
  }
  // Hanging stalactite teeth over the Level 8 cave threshold
  for (let k = 0; k < 5; k++) {
    const sz = CAVE.z - 1.2 + k * 0.6;
    tube(ctx, [[CAVE.x - 0.35, 3.45, sz], [CAVE.x - 0.35, 2.55 - (k % 2) * 0.25, sz]], [0.22, 0.02], 6, [1, 1], 0, 1, 1);
  }
  ctx.albedo(null); ctx.color(null); ctx.metalness(0); ctx.roughness(0.85);
}
