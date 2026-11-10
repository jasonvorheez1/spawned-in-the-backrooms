// Level 11 strip mall pieces. params.kind:
//  "shell": the building (w along X, h, d along Z; storefront face is +X): stucco body with control-joint reveals, a dark plinth,
//           a projecting cornice band and coping, downspouts on the back, two rooftop AC units. Collider: the plain body.
//  "awning": a shallow sloping canvas canopy (projects along +X by p, length d along Z, drop r) on pipe arms, with a valance.
import { pipe } from "./lib/l5-hall-kit.js";
const STUCCO = "cdn/texture-weathered-cream-stucco-wall.png", CANVAS = "cdn/texture-faded-blue-canvas-awning-fabric.png";
const P = (c) => ({ kind: c.params.kind ?? "shell", w: c.params.w ?? 16, h: c.params.h ?? 5.2, d: c.params.d ?? 22, p: c.params.p ?? 2, r: c.params.r ?? 0.9 });
function boxer(ctx) {
  const q = (a, b, c, e) => ctx.quad(...a, ...b, ...c, ...e);
  return (x0, y0, z0, x1, y1, z1) => {
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  };
}
export function geometry(ctx) {
  const p = P(ctx), box = boxer(ctx), lod = ctx.lod ?? 1;
  if (p.kind === "awning") {
    const { p: pr, d, r } = p, drop=r*.4, N=lod>=3?3:8;
    ctx.albedo(CANVAS);ctx.roughness(.85);ctx.color("oklch(0.76 0.11 248)");
    // Reference 3: a shallow blue canopy, not a barrel-shaped shop awning.
    const pt=t=>[pr*t,-drop*t-.035*Math.sin(t*Math.PI)];
    for(let i=0;i<N;i++){
      const [x0,y0]=pt(i/N),[x1,y1]=pt((i+1)/N);
      ctx.quad(x0,y0,-d/2,x0,y0,d/2,x1,y1,d/2,x1,y1,-d/2);
      ctx.quad(x1,y1,-d/2,x1,y1,d/2,x0,y0,d/2,x0,y0,-d/2);
    }
    ctx.color("oklch(0.67 0.1 248)");box(pr-.01,-drop-.14,-d/2,pr+.015,-drop,d/2);
    ctx.albedo(null);ctx.color("oklch(0.78 0.02 235)");
    pipe(ctx,[pr,-drop-.14,-d/2],[pr,-drop-.14,d/2],.012,8);
    ctx.color("oklch(0.56 0.015 235)");ctx.metalness(.45);ctx.roughness(.5);
    const arms=Math.max(2,Math.round(d/2.4)+1);
    for(let i=0;i<arms;i++){
      const z=-d/2+.05+(d-.1)*i/(arms-1);
      pipe(ctx,[.015,-drop-.28,z],[pr-.015,-drop-.07,z],.022,8);
      pipe(ctx,[.015,-.08,z],[pr-.015,-drop-.07,z],.018,8);
    }
    ctx.metalness(0);
    return;
  }
  if (p.kind === "interior") return interior(ctx, box, ctx.params.shop, ctx.params.w ?? 5, ctx.params.d ?? 10, lod);
  const { w, h, d } = p, X0 = -w / 2, X1 = w / 2, Z0 = -d / 2, Z1 = d / 2;
  ctx.albedo(STUCCO); ctx.color("oklch(0.95 0.012 90)");
  { // hollow: three shops you walk into. back and side walls, a storefront head above the glass, piers between the shops, partitions, floor and ceiling
    const T = 0.25, FL = 0.42, CL = 3.3, SH = [[-9.25, -3.75], [-2.1, 2.1], [3.75, 9.25]];
    box(X0, 0, Z0, X0 + T, h, Z1); box(X0, 0, Z0, X1, h, Z0 + T); box(X0, 0, Z1 - T, X1, h, Z1);
    box(X1 - T, CL - 0.1, Z0, X1, h, Z1); box(X1 - T, 0, Z0, X1, FL, Z1);
    for (const [a, b] of [[Z0, SH[0][0]], [SH[0][1], SH[1][0]], [SH[1][1], SH[2][0]], [SH[2][1], Z1]]) box(X1 - 0.45, 0, a, X1, CL, b);
    ctx.albedo(null); ctx.color("oklch(0.93 0.01 95)");
    for (const z of [(SH[0][1] + SH[1][0]) / 2, (SH[1][1] + SH[2][0]) / 2]) box(X0 + T, FL, z - 0.1, X1 - 0.45, CL, z + 0.1);
    ctx.color("oklch(0.8 0.012 80)"); box(X0 + T, 0, Z0 + T, X1 - T, FL, Z1 - T); // the slab
    ctx.color("oklch(0.96 0.005 95)"); box(X0 + T, CL, Z0 + T, X1 - T, CL + 0.06, Z1 - T); // drop ceiling
    ctx.albedo(STUCCO); ctx.color("oklch(0.95 0.012 90)"); box(X0, CL + 0.06, Z0, X1, h, Z1); // roof mass over the ceiling
  }
  // dark plinth
  ctx.color("oklch(0.5 0.02 70)"); box(X0 - 0.04, 0, Z0 - 0.04, X1 + 0.04, 0.45, Z1 + 0.04);
  // control-joint reveals on the long side walls and the back
  ctx.albedo(null); ctx.color("oklch(0.6 0.02 80)");
  for (let z = Z0 + 3; z < Z1 - 1; z += 3) { box(X0 - 0.015, 0.45, z - 0.02, X0, h - 0.6, z + 0.02); }
  for (const y of [1.6, 3.2]) { box(X0 - 0.015, y - 0.02, Z0, X0, y + 0.02, Z1); box(X0, y - 0.02, Z0 - 0.015, X1, y + 0.02, Z0); box(X0, y - 0.02, Z1, X1, y + 0.02, Z1 + 0.015); }
  // cornice band and coping that overhang the walls
  ctx.albedo(STUCCO); ctx.color("oklch(0.8 0.035 80)"); box(X0 - 0.18, h - 0.55, Z0 - 0.18, X1 + 0.25, h - 0.2, Z1 + 0.18);
  // parapet: a ring of low walls with a metal coping cap, not a solid lid
  const T = 0.25, PX0 = X0 - 0.1, PX1 = X1 + 0.15, PZ0 = Z0 - 0.1, PZ1 = Z1 + 0.1, PT = h + 0.45;
  ctx.color("oklch(0.72 0.03 75)");
  box(PX0, h - 0.2, PZ0, PX1, PT, PZ0 + T); box(PX0, h - 0.2, PZ1 - T, PX1, PT, PZ1);
  box(PX0, h - 0.2, PZ0 + T, PX0 + T, PT, PZ1 - T); box(PX1 - T, h - 0.2, PZ0 + T, PX1, PT, PZ1 - T);
  ctx.albedo(null); ctx.color("oklch(0.6 0.01 240)");
  const C = 0.04; // the cap overhangs both faces
  box(PX0 - C, PT, PZ0 - C, PX1 + C, PT + 0.06, PZ0 + T + C); box(PX0 - C, PT, PZ1 - T - C, PX1 + C, PT + 0.06, PZ1 + C);
  box(PX0 - C, PT, PZ0 + T + C, PX0 + T + C, PT + 0.06, PZ1 - T - C); box(PX1 - T - C, PT, PZ0 + T + C, PX1 + C, PT + 0.06, PZ1 - T - C);
  // the deck: dark tar-and-gravel, a lighter flashing strip up the inside of the parapet, two drains
  ctx.color("oklch(0.36 0.012 70)"); ctx.quad(PX0 + T, h + 0.01, PZ1 - T, PX1 - T, h + 0.01, PZ1 - T, PX1 - T, h + 0.01, PZ0 + T, PX0 + T, h + 0.01, PZ0 + T);
  ctx.color("oklch(0.5 0.01 70)");
  box(PX0 + T, h, PZ0 + T, PX1 - T, h + 0.18, PZ0 + T + 0.02); box(PX0 + T, h, PZ1 - T - 0.02, PX1 - T, h + 0.18, PZ1 - T);
  box(PX0 + T, h, PZ0 + T, PX0 + T + 0.02, h + 0.18, PZ1 - T); box(PX1 - T - 0.02, h, PZ0 + T, PX1 - T, h + 0.18, PZ1 - T);
  ctx.color("oklch(0.18 0.01 70)"); for (const z of [Z0 + 1.2, Z1 - 1.2]) box(X0 + 0.25, h + 0.012, z - 0.12, X0 + 0.49, h + 0.03, z + 0.12);
  // patched seams in the membrane
  ctx.color("oklch(0.31 0.01 70)"); for (let z = Z0 + 4; z < Z1 - 2; z += 4.5) box(X0 + 0.4, h + 0.012, z - 0.15, X1 - 0.4, h + 0.02, z + 0.15);
  ctx.albedo(STUCCO);
  // downspouts on the back wall
  ctx.albedo(null); ctx.color("oklch(0.55 0.02 90)");
  for (const z of [Z0 + 1.2, 0, Z1 - 1.2]) { box(X0 - 0.16, 0.1, z - 0.06, X0 - 0.04, h - 0.2, z + 0.06); box(X0 - 0.3, 0.05, z - 0.08, X0 - 0.04, 0.15, z + 0.08); }
  if (lod >= 4) return;
  // rooftop AC units with fan grilles
  for (const [x, z] of [[-2, -5], [1.5, 4]]) {
    ctx.color("oklch(0.8 0.01 240)"); box(x - 0.9, h, z - 0.7, x + 0.9, h + 1.0, z + 0.7);
    ctx.color("oklch(0.3 0.01 240)"); box(x - 0.55, h + 1.0, z - 0.45, x + 0.55, h + 1.03, z + 0.45);
    ctx.color("oklch(0.55 0.01 240)"); for (let k = -0.6; k <= 0.6; k += 0.15) box(x - 0.905, h + 0.15, z + k - 0.02, x - 0.9, h + 0.85, z + k + 0.02);
  }
}


// shop interiors, local frame: storefront toward +X at x = w/2, floor at y 0, back wall at x = -w/2, shop width d along Z
function rbox(box, x0, y0, z0, x1, y1, z1, r = 0.03) { // a slab with its top edges chamfered: reads as made, not a block
  box(x0, y0, z0, x1, y1 - r, z1); box(x0 + r, y1 - r, z0 + r, x1 - r, y1, z1 - r);
}
function cyl(ctx, x, y0, z, r, h, n = 10) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832, c0 = Math.cos(a0) * r, s0 = Math.sin(a0) * r, c1 = Math.cos(a1) * r, s1 = Math.sin(a1) * r;
    ctx.quad(x + c0, y0, z + s0, x + c0, y0 + h, z + s0, x + c1, y0 + h, z + s1, x + c1, y0, z + s1);
    ctx.tri(x, y0 + h, z, x + c1, y0 + h, z + s1, x + c0, y0 + h, z + s0);
  }
}
function chair(ctx, box, x, z, yaw, col) { // a waiting-room chair: chrome legs, padded seat and back
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (lx, lz) => [x + lx * c - lz * s, z + lx * s + lz * c];
  ctx.color("oklch(0.75 0.01 250)"); for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const [px, pz] = P(lx, lz); cyl(ctx, px, 0, pz, 0.018, 0.44, 6); }
  ctx.color(col); const [sx, sz] = P(0, 0); rbox(box, sx - 0.25, 0.42, sz - 0.25, sx + 0.25, 0.5, sz + 0.25, 0.025);
  const [bx, bz] = P(-0.24, 0); rbox(box, bx - 0.04 - Math.abs(s) * 0.21, 0.5, bz - 0.04 - Math.abs(c) * 0.21, bx + 0.04 + Math.abs(s) * 0.21, 0.98, bz + 0.04 + Math.abs(c) * 0.21, 0.02);
}
function plant(ctx, box, x, z) {
  ctx.color("oklch(0.35 0.03 50)"); cyl(ctx, x, 0, z, 0.2, 0.42, 10);
  ctx.color("oklch(0.45 0.12 145)"); for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.12 + (i % 3) * 0.06; ctx.tri(x, 0.4, z, x + Math.cos(a) * r * 2.4, 1.0 + (i % 3) * 0.25, z + Math.sin(a) * r * 2.4, x + Math.cos(a + 0.35) * r, 0.5, z + Math.sin(a + 0.35) * r); ctx.tri(x, 0.4, z, x + Math.cos(a + 0.35) * r, 0.5, z + Math.sin(a + 0.35) * r, x + Math.cos(a) * r * 2.4, 1.0 + (i % 3) * 0.25, z + Math.sin(a) * r * 2.4); }
}
function interior(ctx, box, shop, w, d, lod) {
  const X1 = w / 2, X0 = -w / 2, Z0 = -d / 2, Z1 = d / 2;
  ctx.albedo(null);
  if (shop === "derma") { // clinic: a mint reception desk, a row of waiting chairs, posters, a plant, a back hall door
    ctx.color("oklch(0.93 0.02 160)"); rbox(box, X1 - 4.6, 0, -1.4, X1 - 3.9, 1.05, 1.4, 0.03);
    ctx.color("oklch(0.98 0.005 95)"); rbox(box, X1 - 4.75, 1.05, -1.5, X1 - 3.8, 1.1, 1.5, 0.02);
    ctx.color("oklch(0.2 0.01 250)"); box(X1 - 4.5, 1.1, -0.3, X1 - 4.45, 1.4, 0.15); // monitor
    for (let i = 0; i < 4; i++) chair(ctx, box, X1 - 1.5, Z0 + 0.6 + i * 0.6, Math.PI / 2, "oklch(0.55 0.12 250)");
    plant(ctx, box, X1 - 1.0, Z1 - 0.6);
    ctx.color("oklch(0.62 0.13 160)"); box(X0 + 0.02, 0.9, -0.9, X0 + 0.04, 2.0, -0.1); ctx.color("oklch(0.72 0.1 30)"); box(X0 + 0.02, 0.9, 0.3, X0 + 0.04, 2.0, 1.1);
    ctx.color("oklch(0.5 0.04 60)"); box(X0 + 0.02, 0, Z1 - 1.6, X0 + 0.06, 2.1, Z1 - 0.7); // back hall door
  } else if (shop === "islab") { // lab: a white counter with a sample window, stools, a specimen fridge, blood-draw chair
    ctx.color("oklch(0.97 0.005 165)"); rbox(box, X1 - 4.2, 0, Z0 + 0.3, X1 - 3.6, 1.05, Z1 - 0.3, 0.03);
    ctx.color("oklch(0.55 0.11 165)"); box(X1 - 4.21, 0.15, Z0 + 0.3, X1 - 4.19, 0.9, Z1 - 0.3);
    ctx.color("oklch(0.85 0.02 210)"); box(X1 - 3.95, 1.05, -0.6, X1 - 3.93, 1.9, 0.6); // sample window
    ctx.color("oklch(0.75 0.01 250)"); for (const z of [-1, 0, 1]) { cyl(ctx, X1 - 3.0, 0, z * 0.9, 0.03, 0.6, 6); ctx.color("oklch(0.4 0.1 165)"); cyl(ctx, X1 - 3.0, 0.6, z * 0.9, 0.18, 0.06, 10); ctx.color("oklch(0.75 0.01 250)"); }
    ctx.color("oklch(0.92 0.005 250)"); rbox(box, X0 + 0.3, 0, Z1 - 1.0, X0 + 0.9, 1.9, Z1 - 0.3, 0.03);
    ctx.color("oklch(0.4 0.02 250)"); box(X0 + 0.91, 1.0, Z1 - 0.9, X0 + 0.93, 1.6, Z1 - 0.85);
    chair(ctx, box, X0 + 1.4, Z0 + 0.8, 0, "oklch(0.45 0.1 165)");
  } else { // bakery: a curved glass pastry case with cakes, wall shelves of bread, a register, two cafe tables
    ctx.color("oklch(0.35 0.05 50)"); rbox(box, X1 - 3.6, 0, Z0 + 0.6, X1 - 3.0, 0.9, Z1 - 1.4, 0.03);
    ctx.color("oklch(0.9 0.02 210)"); box(X1 - 3.0, 0.9, Z0 + 0.6, X1 - 2.98, 1.35, Z1 - 1.4); box(X1 - 3.6, 1.35, Z0 + 0.6, X1 - 2.98, 1.37, Z1 - 1.4);
    const cakes = ["oklch(0.85 0.08 20)", "oklch(0.55 0.1 50)", "oklch(0.92 0.06 95)", "oklch(0.8 0.1 350)", "oklch(0.6 0.12 30)"];
    for (let i = 0; i < 5; i++) { ctx.color(cakes[i]); cyl(ctx, X1 - 3.3, 0.9, Z0 + 1.0 + i * ((d - 2.4) / 5), 0.16, 0.14, 10); }
    ctx.color("oklch(0.2 0.01 250)"); rbox(box, X1 - 3.55, 0.9, Z1 - 1.3, X1 - 3.1, 1.15, Z1 - 0.9, 0.02); // register
    ctx.color("oklch(0.42 0.06 55)"); for (const y of [0.9, 1.5, 2.1]) box(X0 + 0.25, y, Z0 + 0.4, X0 + 0.7, y + 0.04, Z1 - 0.4);
    ctx.color("oklch(0.68 0.11 70)"); for (const y of [0.94, 1.54, 2.14]) for (let z = Z0 + 0.7; z < Z1 - 0.6; z += 0.55) cyl(ctx, X0 + 0.48, y, z, 0.13, 0.12, 8);
    for (const z of [Z0 + 1.4, Z1 - 1.0]) { ctx.color("oklch(0.3 0.01 60)"); cyl(ctx, X1 - 1.4, 0, z, 0.04, 0.72, 6); ctx.color("oklch(0.95 0.01 90)"); cyl(ctx, X1 - 1.4, 0.72, z, 0.36, 0.03, 12); chair(ctx, box, X1 - 0.85, z, Math.PI, "oklch(0.55 0.1 145)"); }
  }
  // the ceiling troffers: emissive panels the room's light seems to come from
  ctx.color("oklch(0.98 0.01 95)"); ctx.emissive?.("oklch(0.95 0.02 95)");
  for (let x = X0 + 1.2; x < X1 - 0.5; x += 2.4) for (const z of [-d / 4, d / 4]) box(x - 0.3, 2.86, z - 0.6, x + 0.3, 2.88, z + 0.6);
}
