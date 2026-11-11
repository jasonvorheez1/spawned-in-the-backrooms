// Level 1's clutter, one static mesh: oil drums, pallets of boxes, fallen concrete, ceiling ducts and cables
// in the halls, a painted guide line home, and the M.E.G. waypoint's tents, cots, table and map board at the
// camp. Everything is placed from the seeded layout (scripts/lib/level1.js), so it is the same every time.
import { N, S, H, HALF, zoneOf, cellCenter, hash, ARRIVE, BACK, sectorOf, hasPillar, rampCell } from "./lib/level1.js";
import { slab, prism, tube, face } from "./lib/shapes.js";

import { lathe } from "./lib/l5-hall-kit.js";
const box = (ctx, x, y, z, hx, hy, hz) => slab(ctx, [x, y, z], [hx, hy, hz]);
const ring = (r, n, cx, cz) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * 6.2832) * r, cz + Math.sin((i / n) * 6.2832) * r]);

function drum(ctx, x, z, h, hue) {
  if(ctx.lod>=3){
    ctx.metalness(.3);ctx.roughness(.6);ctx.color(hue);prism(ctx,ring(.3,10,x,z),0,h);
    ctx.color("oklch(0.3 0.02 60)");for(const y of [h*.3,h*.7])prism(ctx,ring(.312,10,x,z),y,y+.05);
    ctx.color("oklch(0.25 0.02 60)");prism(ctx,ring(.26,10,x,z),h,h+.03);ctx.metalness(0);return;
  }
  const M=16;
  ctx.metalness(.3);ctx.roughness(.6);ctx.color(hue);
  lathe(ctx,x,0,z,[[0,0],[.28,0],[.303,.018],[.303,.04],[.292,.055],[.292,h*.28],[.312,h*.30],[.312,h*.34],[.292,h*.36],[.292,h*.67],[.312,h*.69],[.312,h*.73],[.292,h*.75],[.292,h-.035],[.305,h-.02],[.305,h],[.27,h],[0,h]],M);
  ctx.color("oklch(0.25 0.02 60)");lathe(ctx,x+.13,h,z,[[0,0],[.031,0],[.031,.012],[0,.012]],ctx.lod<=2?12:6);
  ctx.metalness(0);
}
function pallet(ctx, x, z, yaw, stack) {
  const c = Math.cos(yaw), s = Math.sin(yaw), at = (a, b) => [x + a * c - b * s, z + a * s + b * c];
  ctx.color("oklch(0.55 0.06 70)");
  for (const dz of [-0.45, 0, 0.45]) { const [px, pz] = at(0, dz); box(ctx, px, 0.06, pz, 0.6 * Math.abs(c) + 0.1 * Math.abs(s), 0.06, 0.1 * Math.abs(c) + 0.6 * Math.abs(s)); }
  const [tx, tz] = at(0, 0); box(ctx, tx, 0.15, tz, 0.6 * Math.abs(c) + 0.5 * Math.abs(s), 0.03, 0.5 * Math.abs(c) + 0.6 * Math.abs(s));
  for (let i = 0; i < stack; i++) {
    ctx.color(i % 2 ? "oklch(0.7 0.07 75)" : "oklch(0.64 0.07 70)");
    const [bx, bz] = at((i % 2 ? 0.18 : -0.18), (i % 2 ? -0.1 : 0.12)); box(ctx, bx, 0.18 + 0.24 + i * 0.46, bz, 0.34 * Math.abs(c) + 0.28 * Math.abs(s), 0.22, 0.28 * Math.abs(c) + 0.34 * Math.abs(s));
  }
}
function tent(ctx, x, z, yaw, col) {
  const c = Math.cos(yaw), s = Math.sin(yaw), at = (a, b, y) => [x + a * c - b * s, y, z + a * s + b * c];
  const A = at(-1.1, -1.4, 0), B = at(1.1, -1.4, 0), C = at(1.1, 1.4, 0), D = at(-1.1, 1.4, 0), T1 = at(0, -1.4, 1.5), T2 = at(0, 1.4, 1.5);
  ctx.color(col); ctx.roughness(0.95);
  face(ctx, A, T1, T2, D, [-1, 1, 0]); face(ctx, B, C, T2, T1, [1, 1, 0]);
  ctx.color("oklch(0.3 0.03 90)"); ctx.tri(...A, ...B, ...T1); ctx.tri(...B, ...A, ...T1); ctx.tri(...D, ...T2, ...C); ctx.tri(...C, ...T2, ...D);
}
function cot(ctx, x, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), at = (a, b) => [x + a * c - b * s, z + a * s + b * c];
  ctx.color("oklch(0.4 0.02 250)"); ctx.metalness(0.5);
  for (const [a, b] of [[-0.35, -0.9], [0.35, -0.9], [-0.35, 0.9], [0.35, 0.9]]) { const [px, pz] = at(a, b); box(ctx, px, 0.2, pz, 0.03, 0.2, 0.03); }
  ctx.metalness(0); ctx.color("oklch(0.55 0.1 140)"); const [mx, mz] = at(0, 0); box(ctx, mx, 0.42, mz, 0.4 * Math.abs(c) + 0.95 * Math.abs(s), 0.04, 0.95 * Math.abs(c) + 0.4 * Math.abs(s));
  ctx.color("oklch(0.85 0.03 90)"); const [px, pz] = at(0, -0.65); box(ctx, px, 0.5, pz, 0.28 * Math.abs(c) + 0.14 * Math.abs(s), 0.06, 0.14 * Math.abs(c) + 0.28 * Math.abs(s));
}

// fallen concrete (Shelly: "found a blocky"): a jagged broken slab, its spalled underside chunks around it, rebar bent out of the break, grit
const jag = (x, z, rx, rz, n, seed, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * 6.2832, k = 0.62 + 0.5 * hash(i, seed, 17); return [x + Math.cos(a) * rx * k, z + Math.sin(a) * rz * k]; });
function rubble(ctx, x, z, seed, hi) {
  const k = 0.16 + hash(seed, 1, 213) * 0.14, rot = hash(seed, 2, 5) * 6.28;
  ctx.albedo("cdn/texture-broken-concrete-rubble-exposed-aggregate.png"); ctx.color("oklch(0.78 0.008 250)"); ctx.roughness(0.95);
  prism(ctx, jag(x, z, 0.62, 0.42, 9, seed, rot), 0, k); // the slab
  prism(ctx, jag(x + 0.08, z - 0.04, 0.42, 0.28, 7, seed + 3, rot + 0.4), k, k + 0.05); // its stepped broken top
  for (let i = 0; i < (hi ? 7 : 3); i++) { // chunks thrown off it, smaller the farther out
    const a = hash(seed, i, 41) * 6.28, d = 0.6 + hash(seed, i, 43) * 0.7, s = 0.07 + hash(seed, i, 47) * 0.12 * (1.4 - d / 1.3);
    prism(ctx, jag(x + Math.cos(a) * d, z + Math.sin(a) * d, s, s * 0.8, 6, seed + i * 7, a), 0, s * 0.9);
  }
  if (hi) {
    ctx.albedo(null); ctx.color("oklch(0.42 0.06 45)"); ctx.metalness(0.6); ctx.roughness(0.7); // rusted rebar out of the break, bent where it tore
    for (let i = 0; i < 3; i++) { const a = rot + 0.3 + i * 0.35, bx = x + Math.cos(a) * 0.45, bz = z + Math.sin(a) * 0.3, up = 0.25 + hash(seed, i, 51) * 0.3;
      tube(ctx, [[bx, k * 0.6, bz], [bx + Math.cos(a) * 0.12, k + up * 0.5, bz + Math.sin(a) * 0.12], [bx + Math.cos(a + 0.6) * 0.2, k + up, bz + Math.sin(a + 0.6) * 0.2]], [0.008, 0.008, 0.007], 5, [1, 1], 0, 1, 1); }
    ctx.metalness(0); ctx.color("oklch(0.48 0.01 80)"); ctx.roughness(1); // grit and dust spread under it
    prism(ctx, jag(x, z, 1.1, 0.9, 12, seed + 9, rot), 0.002, 0.004);
  }
  ctx.albedo(null); ctx.roughness(0.85);
}
export function geometry(ctx) {
  const hi = ctx.lod <= 2, real = !!ctx.params?.tripo; // real: drums and pallets stand as their own models (places/level1/sim.js l1Tripo)
  ctx.smooth(); ctx.roughness(0.85); ctx.metalness(0);
  // halls and storage: a drum cluster, a pallet of boxes or a fallen chunk in some cells
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) {
    const zone = zoneOf(cx, cz); if (zone !== "halls" && zone !== "storage") continue;
    const r = hash(cx, cz, 201), c = cellCenter(cx, cz), ox = (hash(cx, cz, 203) - 0.5) * 3.2, oz = zone === "storage" ? 0 : (hash(cx, cz, 205) - 0.5) * 3.2;
    const x = c.x + ox, z = c.z + oz;
    if (real && r < 0.19) {}
    else if (r < 0.1) { const hue = ["oklch(0.45 0.13 28)", "oklch(0.42 0.1 250)", "oklch(0.5 0.1 145)"][Math.floor(hash(cx, cz, 207) * 3)]; drum(ctx, x, z, 0.9, hue); drum(ctx, x + 0.68, z + 0.1, 0.9, hue); if (r < 0.05) drum(ctx, x + 0.3, z + 0.65, 0.9, hue); }
    else if (r < 0.19) pallet(ctx, x, z, hash(cx, cz, 209) * 3.14, 1 + Math.floor(hash(cx, cz, 211) * 3));
    else if (r < 0.23 && zone === "halls") rubble(ctx, x, z, cx * 13 + cz, hi); // a chunk of ceiling slab that came down
    // ceiling ducts across the hall rows
    if (hi && zone === "halls" && cz % 3 === 1 && cx % 2 === 0 && !rampCell(cx, cz)) { ctx.color("oklch(0.62 0.01 250)"); ctx.metalness(0.6); box(ctx, c.x, H - 0.55, c.z, S / 2, 0.22, 0.42); ctx.color("oklch(0.4 0.01 250)"); for (let g = -3; g <= 3; g += 2) box(ctx, c.x + g, H - 0.33, c.z, 0.04, 0.02, 0.4); ctx.metalness(0); }
  }
  // cables sagging between ceiling hooks
  if (hi) {
    ctx.color("oklch(0.2 0.01 250)");
    for (let cz = 2; cz < N; cz += 3) for (let cx = 0; cx < N - 2; cx += 2) {
      if (zoneOf(cx, cz) === "corridors" || zoneOf(cx + 2, cz) === "corridors" || hash(cx, cz, 215) < 0.4 || rampCell(cx, cz) || rampCell(cx + 1, cz) || rampCell(cx + 2, cz)) continue;
      const a = cellCenter(cx, cz), z = a.z + (hash(cx, cz, 217) - 0.5) * 4;
      tube(ctx, [[a.x, H - 0.1, z], [a.x + S * 0.5, H - 0.55, z], [a.x + S, H - 0.75, z], [a.x + S * 1.5, H - 0.55, z], [a.x + S * 2, H - 0.1, z]], [0.025, 0.025, 0.025, 0.025, 0.025], 5);
    }
  }
  // a yellow guide line painted from the camp to the flickering wall home, and arrows on it
  const a = cellCenter(ARRIVE.cx, ARRIVE.cz);
  ctx.color("oklch(0.85 0.17 95)"); ctx.roughness(0.7);
  for (let x = BACK.x + 1.6; x < a.x - 3; x += 1.6) box(ctx, x, 0.012, a.z, 0.5, 0.004, 0.09);
  for (const [x, dir] of [[BACK.x + 3.5, -1], [BACK.x + 7, -1]]) { box(ctx, x, 0.012, a.z, 0.25, 0.004, 0.09); for (const sd of [-1, 1]) box(ctx, x + dir * 0.18, 0.012, a.z + sd * 0.12, 0.2, 0.004, 0.05); }
  // the camp: M.E.G. waypoint (real mode: the Tripo camp in places/level1/sim.js holds the tents, cots and table; these flat ones doubled it, Nov 11)
  if (!real) {
  tent(ctx, a.x - 4.8, a.z - 5, 0.3, "oklch(0.5 0.08 135)");
  tent(ctx, a.x - 5.4, a.z + 5.2, -0.2, "oklch(0.62 0.09 70)");
  cot(ctx, a.x + 4.8, a.z + 5.5, 0); cot(ctx, a.x + 6, a.z + 5.5, 0); cot(ctx, a.x + 4.8, a.z - 5.5, 1.57);
  ctx.color("oklch(0.5 0.05 70)"); box(ctx, a.x + 3, 0.4, a.z + 3.4, 0.9, 0.04, 0.45); for (const [dx, dz] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]]) box(ctx, a.x + 3 + dx, 0.2, a.z + 3.4 + dz, 0.04, 0.2, 0.04);
  ctx.color("oklch(0.6 0.15 120)"); box(ctx, a.x + 2.7, 0.52, a.z + 3.4, 0.2, 0.08, 0.14); // a tin box
  ctx.color("oklch(0.4 0.02 250)"); box(ctx, a.x + 3.4, 0.5, a.z + 3.4, 0.08, 0.1, 0.08); // lantern body
  }
  if (!real) { pallet(ctx, a.x - 2.5, a.z + 7.4, 0.2, 2); drum(ctx, a.x + 5.6, a.z - 1.4, 0.9, "oklch(0.5 0.1 145)"); }
  ctx.color(null); ctx.roughness(null);
}
