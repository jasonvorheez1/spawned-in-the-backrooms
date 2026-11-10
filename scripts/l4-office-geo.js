// Level 4's open-plan furniture (params.kind): "island" = four desks back to back behind fabric partitions, each with a beige CRT,
// keyboard, papers and a mug, a wall clock stopped on the spine; "printer" = a tired office printer on its stand.
// Feet at the floor centre; the island runs along x. The ringing phones are their own objects (scripts/l4-office.js).
import { bx as box, lathe, path, qc, sheet } from "./lib/l5-hall-kit.js";

const FAB = "cdn/texture-worn-canvas-fabric.png";

function desk(ctx, cx, cz, face, hi, seed) { // face: +1 = the desk's user sits on +z
  ctx.albedo(null); ctx.color("oklch(0.62 0.04 70)"); ctx.roughness(0.6); box(ctx, cx - 0.78, cx + 0.78, 0.71, 0.75, cz - 0.38, cz + 0.38, 0.016); // top, edges eased
  ctx.color("oklch(0.35 0.01 250)"); ctx.metalness(0.4);
  for (const sx of [-0.72, 0.72]) box(ctx, cx + sx - 0.02, cx + sx + 0.02, 0.02, 0.71, cz - 0.34, cz + 0.34, 0.009);
  for (const sx of [-0.72, 0.72]) box(ctx, cx + sx - 0.035, cx + sx + 0.035, 0, 0.025, cz - 0.36, cz + 0.36, 0.01); // levelling feet rails
  box(ctx, cx + 0.3, cx + 0.7, 0.06, 0.69, cz - 0.33, cz + 0.31, 0.022); ctx.metalness(0);                                 // drawer pedestal body
  // three drawer fronts, each its own eased panel with a gap between, and a bar pull
  for (const [y0, y1] of [[0.08, 0.34], [0.36, 0.52], [0.54, 0.67]]) {
    ctx.color("oklch(0.38 0.01 250)"); ctx.metalness(0.35); box(ctx, cx + 0.32, cx + 0.68, y0, y1, cz + face * 0.305, cz + face * 0.33, 0.01);
    ctx.color("oklch(0.62 0.005 250)"); ctx.metalness(0.7); path(ctx, [[cx + 0.43, y1 - 0.045, cz + face * 0.335], [cx + 0.45, y1 - 0.045, cz + face * 0.352], [cx + 0.55, y1 - 0.045, cz + face * 0.352], [cx + 0.57, y1 - 0.045, cz + face * 0.335]], 0.006, hi ? 8 : 5);
  }
  ctx.metalness(0);
  // CRT monitor, pushed to the back of the desk
  const mz = cz - face * 0.12;
  ctx.color("oklch(0.82 0.03 85)");ctx.roughness(.5);
  // A CRT narrows around its tube at the back; the bezel stays broad at the user's side.
  const F=(x,y)=>[cx+x,y,mz+face*.13],B=(x,y)=>[cx+x,y,mz-face*.17],O=[cx,.94,mz];
  qc(ctx,O,F(-.22,.78),F(.22,.78),B(.12,.82),B(-.12,.82));
  qc(ctx,O,F(-.22,1.12),B(-.12,1.04),B(.12,1.04),F(.22,1.12));
  qc(ctx,O,F(-.22,.78),B(-.12,.82),B(-.12,1.04),F(-.22,1.12));
  qc(ctx,O,F(.22,.78),F(.22,1.12),B(.12,1.04),B(.12,.82));
  qc(ctx,O,B(-.12,.82),B(.12,.82),B(.12,1.04),B(-.12,1.04));
  box(ctx,cx-.22,cx+.22,.78,1.12,mz+face*.13,mz+face*.17);
  box(ctx,cx-.15,cx+.15,.75,.79,mz-.12,mz+.12);
  ctx.color("oklch(0.7 0.18 145)"); ctx.emissive("oklch(0.8 0.2 145)"); box(ctx, cx + 0.15, cx + 0.17, 0.77, 0.785, mz + face * 0.17, mz + face * 0.173); ctx.emissive(null); // power led
  ctx.color("oklch(0.24 0.05 80)"); ctx.emissive("oklch(0.42 0.1 82)"); sheet(ctx,(u,v)=>[cx+(u-.5)*.34,.82+v*.26,mz+face*(.176+.008*Math.sin(u*Math.PI)*Math.sin(v*Math.PI))],hi?6:2,hi?4:2,()=>[0,0,face]); ctx.emissive(null);
  if (hi) { ctx.color("oklch(0.85 0.15 85)"); ctx.emissive("oklch(0.75 0.16 85)"); for (let i = 0; i < 4; i++) box(ctx, cx - 0.14, cx - 0.14 + 0.08 + ((seed * 7 + i * 3) % 5) * 0.035, 1.03 - i * 0.04, 1.045 - i * 0.04, mz + face * 0.187, mz + face * 0.189); ctx.emissive(null); }
  // keyboard, mousepad & mouse
  ctx.color("oklch(0.78 0.02 85)"); box(ctx, cx - 0.2, cx + 0.2, 0.75, 0.775, cz + face * 0.14, cz + face * 0.28);
  ctx.color("oklch(0.25 0.02 240)"); box(ctx, cx + 0.24, cx + 0.42, 0.75, 0.754, cz + face * 0.13, cz + face * 0.29);
  ctx.color("oklch(0.82 0.025 85)"); box(ctx, cx + 0.3, cx + 0.36, 0.754, 0.782, cz + face * 0.18, cz + face * 0.25);
  // PC tower beside desk pedestal
  ctx.color("oklch(0.8 0.02 85)"); box(ctx, cx - 0.68, cx - 0.46, 0.1, 0.65, cz - 0.24, cz + 0.24);
  ctx.color("oklch(0.2 0.01 250)"); box(ctx, cx - 0.66, cx - 0.48, 0.52, 0.55, cz + face * 0.23, cz + face * 0.245); // 3.5 floppy slot
  ctx.color("oklch(0.45 0.01 250)"); box(ctx, cx - 0.66, cx - 0.48, 0.42, 0.46, cz + face * 0.23, cz + face * 0.245); // CD drive
  ctx.color("oklch(0.7 0.18 145)"); ctx.emissive("oklch(0.8 0.2 145)"); box(ctx, cx - 0.52, cx - 0.5, 0.22, 0.235, cz + face * 0.24, cz + face * 0.245); ctx.emissive(null);
  // papers, a mug
  ctx.color("oklch(0.95 0.01 90)"); box(ctx, cx - 0.62, cx - 0.36, 0.75, 0.758, cz + face * 0.02, cz + face * 0.3); box(ctx, cx - 0.6, cx - 0.4, 0.758, 0.762, cz + face * 0.06, cz + face * 0.26);
  ctx.color(["oklch(0.6 0.15 25)", "oklch(0.6 0.1 250)", "oklch(0.85 0.05 90)"][seed % 3]); lathe(ctx, cx + 0.54, 0.75, cz + face * 0.22, [[0,0],[.037,0],[.042,.012],[.044,.095],[.038,.1],[.035,.09],[.032,.018],[0,.018]], hi ? 16 : 8);
  if (hi) path(ctx, [[cx+.58,.83,cz+face*.22],[cx+.615,.83,cz+face*.22],[cx+.615,.775,cz+face*.22],[cx+.58,.775,cz+face*.22]], .008, 8);
}

// the island's walls as their own piece: padded fabric panels in steel frames with round posts and a bullnose top rail, a wall clock
function panelRun(ctx, x0, x1, z0, z1, h, hi) { // one padded panel inside its frame; runs along x or z
  const M = hi ? 10 : 6, alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  ctx.albedo(FAB); ctx.color("oklch(0.5 0.03 240)"); ctx.roughness(0.95); ctx.metalness(0);
  if (alongX) box(ctx, x0 + 0.03, x1 - 0.03, 0.07, h - 0.03, z0, z1, 0.022); else box(ctx, x0, x1, 0.07, h - 0.03, z0 + 0.03, z1 - 0.03, 0.022);
  ctx.albedo(null); ctx.color("oklch(0.4 0.01 250)"); ctx.metalness(0.55); ctx.roughness(0.45);
  const ends = alongX ? [[x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2]] : [[(x0 + x1) / 2, z0], [(x0 + x1) / 2, z1]];
  for (const [ex, ez] of ends) { path(ctx, [[ex, 0.02, ez], [ex, h, ez]], 0.032, M); }                 // round posts
  path(ctx, alongX ? [[x0, h, (z0 + z1) / 2], [x1, h, (z0 + z1) / 2]] : [[(x0 + x1) / 2, h, z0], [(x0 + x1) / 2, h, z1]], 0.034, M); // bullnose top rail
  ctx.color("oklch(0.3 0.01 250)"); ctx.metalness(0.4);
  box(ctx, alongX ? x0 + 0.03 : x0 - 0.008, alongX ? x1 - 0.03 : x1 + 0.008, 0.02, 0.07, alongX ? z0 - 0.008 : z0 + 0.03, alongX ? z1 + 0.008 : z1 - 0.03, 0.012); // kick base
  for (const [ex, ez] of ends) box(ctx, ex - (alongX ? 0.03 : 0.18), ex + (alongX ? 0.03 : 0.18), 0, 0.022, ez - (alongX ? 0.18 : 0.03), ez + (alongX ? 0.18 : 0.03), 0.01); // feet
}
function partition(ctx, hi) {
  panelRun(ctx, -1.65, 0, -0.03, 0.03, 1.25, hi); panelRun(ctx, 0, 1.65, -0.03, 0.03, 1.25, hi);   // the spine, two panels
  for (const x of [-1.65, 0, 1.65]) for (const s of [-1, 1]) panelRun(ctx, x - 0.03, x + 0.03, s > 0 ? 0.03 : -0.85, s > 0 ? 0.85 : -0.03, 1.15, hi); // side wings
  // a wall clock on the spine, stopped at twenty to four
  ctx.metalness(0); ctx.roughness(0.6);
  ctx.color("oklch(0.25 0.01 250)"); lathe(ctx, 0, 1.46, 0.035, [[0, 0], [0.135, 0], [0.135, 0.025], [0, 0.025]], hi ? 24 : 12);
  ctx.color("oklch(0.95 0.01 90)"); lathe(ctx, 0, 1.46, 0.04, [[0, 0], [0.12, 0], [0.12, 0.022], [0, 0.022]], hi ? 24 : 12);
  ctx.color("oklch(0.2 0.01 250)"); box(ctx, -0.004, 0.004, 1.46, 1.555, 0.03, 0.07, 0); box(ctx, -0.07, 0, 1.425, 1.462, 0.03, 0.07, 0);
  for (const [x, z, c] of [[-1.2, 0.035, "oklch(0.9 0.12 95)"], [0.5, -0.035, "oklch(0.85 0.1 200)"], [1.1, 0.035, "oklch(0.9 0.1 20)"]]) { ctx.color(c); box(ctx, x - 0.07, x + 0.07, 0.95, 1.09, z - 0.003, z + 0.003, 0); }
}

export function geometry(ctx) {
  const kind = ctx.params?.kind ?? "island", hi = ctx.lod <= 2;
  ctx.smooth(); ctx.metalness(0);
  if (kind === "terminal") { desk(ctx, 0, 0, 1, hi, 3); ctx.color(null); return; } // one desk with a CRT: Base Omega and Base Gamma's machines
  if (kind === "desk") { desk(ctx, 0, 0, 1, hi, ctx.params?.seed ?? 0); ctx.color(null); ctx.roughness(null); return; } // one island desk, its own object (Shelly: split the meshes)
  if (kind === "partition") { partition(ctx, hi); ctx.color(null); ctx.roughness(null); return; } // the island's fabric walls and clock alone
  if (kind === "printer") {
    ctx.color("oklch(0.4 0.01 250)"); ctx.metalness(0.4); box(ctx, -0.35, 0.35, 0, 0.62, -0.28, 0.28); ctx.metalness(0);
    ctx.color("oklch(0.85 0.01 90)"); box(ctx, -0.32, 0.32, 0.62, 0.95, -0.26, 0.26);
    ctx.color("oklch(0.3 0.01 250)"); box(ctx, -0.26, 0.26, 0.95, 0.98, -0.2, 0.1);
    ctx.color("oklch(0.95 0.01 90)"); box(ctx, -0.18, 0.18, 0.8, 0.805, 0.26, 0.45); // a page half out
    ctx.color("oklch(0.65 0.18 145)"); ctx.emissive("oklch(0.6 0.2 145)"); box(ctx, 0.2, 0.24, 0.9, 0.92, 0.26, 0.265); ctx.emissive(null);
    ctx.color(null); return;
  }
  // the spine and the side partitions, faded blue-grey fabric on steel feet
  ctx.albedo(FAB); ctx.color("oklch(0.58 0.03 240)"); ctx.roughness(0.95);
  box(ctx, -1.65, 1.65, 0, 1.25, -0.03, 0.03);
  for (const x of [-1.65, 0, 1.65]) box(ctx, x - 0.03, x + 0.03, 0, 1.15, -0.85, 0.85);
  ctx.albedo(null); ctx.color("oklch(0.4 0.01 250)"); ctx.metalness(0.5);
  box(ctx, -1.68, 1.68, 1.25, 1.28, -0.05, 0.05); for (const x of [-1.65, 0, 1.65]) box(ctx, x - 0.05, x + 0.05, 1.15, 1.18, -0.87, 0.87);
  ctx.metalness(0);
  let seed = 0;
  for (const face of [-1, 1]) for (const cx of [-0.82, 0.82]) desk(ctx, cx, face * 0.45, face, hi, seed++);
  // a wall clock on the spine, stopped at twenty to four
  ctx.color("oklch(0.95 0.01 90)"); box(ctx, -0.13, 0.13, 1.33, 1.59, 0.03, 0.06); ctx.color("oklch(0.2 0.01 250)");
  box(ctx, -0.005, 0.005, 1.46, 1.56, 0.06, 0.065); box(ctx, -0.07, 0, 1.43, 1.465, 0.06, 0.065);
  // pinned notes on the partitions
  for (const [x, z, c] of [[-1.2, 0.04, "oklch(0.9 0.12 95)"], [0.5, -0.04, "oklch(0.85 0.1 200)"], [1.1, 0.04, "oklch(0.9 0.1 20)"]]) { ctx.color(c); box(ctx, x - 0.07, x + 0.07, 0.95, 1.09, z - 0.003, z + 0.003); }
  ctx.color(null); ctx.roughness(null);
}
