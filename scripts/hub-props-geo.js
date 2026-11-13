// Small Hub props you press (scripts/hub-thing.js). Origin at the foot, front -z. params.kind picks one.
//   ledger   M.E.G. sign-out ledger on a folding steel stand    recorder  2019 orange survey recorder, dusty
//   keytag   a Level Key with a brass cabinet tag, lying flat    amberbox  Camp Amber's newcomer crate, GO SLOW on the lid
import { slab, rounded, tube } from "./lib/shapes.js";
const B = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2]);
const R = (ctx, c, h, r) => rounded(ctx, c, h, r);
const STEEL = "cdn/texture-dark-oiled-steel-plate-scuffed-rust-edges.png";
const PAPER = "cdn/texture-aged-ledger-paper-handwritten-columns-ink.png";
const PLY = "cdn/texture-weathered-plywood-crate-boards-stencil-scuffs.png";
const ORANGE = "cdn/texture-orange-hard-plastic-equipment-case-scuffed-dusty.png";
function ledger(ctx) {
  ctx.albedo(STEEL); ctx.color("oklch(0.62 0.02 140)"); ctx.metalness(0.8); ctx.roughness(0.5);
  ctx.color("oklch(0.72 0.02 140)"); // lighter steel so the legs read in the post's dim light; square tube, the drawn tube() came out empty here
  const w = 0.022;
  for (const sx of [-1, 1]) { const x = sx * 0.25;
    for (const z of [0.17, -0.19]) B(ctx, x - w, x + w, 0, 1.0, z - w, z + w); // legs
    B(ctx, x - w, x + w, 0.02, 0.06, -0.26, 0.24); // foot rail
    B(ctx, x - w * 0.8, x + w * 0.8, 0.42, 0.45, -0.19, 0.17); } // side brace
  B(ctx, -0.25, 0.25, 0.42, 0.45, -0.19 - w * 0.8, -0.19 + w * 0.8); // back brace
  ctx.color("oklch(0.5 0.03 140)"); R(ctx, [0, 1.0, 0], [0.32, 0.018, 0.24], 0.008); // the tray, tilted by its rim
  B(ctx, -0.32, 0.32, 1.0, 1.06, 0.22, 0.24);
  ctx.metalness(0); ctx.albedo(null); ctx.color("oklch(0.22 0.03 30)"); ctx.roughness(0.7); R(ctx, [0, 1.035, 0], [0.27, 0.014, 0.2], 0.006); // the book's boards
  ctx.albedo(PAPER); ctx.color("oklch(0.92 0.02 85)"); ctx.roughness(0.95);
  for (const sx of [-1, 1]) { B(ctx, sx < 0 ? -0.255 : 0.005, sx < 0 ? -0.005 : 0.255, 1.05, 1.062 + (sx < 0 ? 0.004 : 0), -0.185, 0.185); }
  ctx.albedo(null); ctx.color("oklch(0.35 0.12 25)"); B(ctx, -0.006, 0.006, 1.062, 1.066, -0.19, 0.19); // ribbon
  ctx.color("oklch(0.25 0.02 250)"); tube(ctx, [[0.12, 1.072, -0.05], [0.2, 1.072, 0.08]], 0.005, 6); // pen on a string
  tube(ctx, [[0.2, 1.072, 0.08], [0.24, 1.02, 0.2], [0.25, 0.9, 0.22]], 0.002, 4);
}
function recorder(ctx) {
  ctx.albedo(ORANGE); ctx.color("oklch(0.86 0.06 60)"); ctx.roughness(0.55);
  R(ctx, [0, 0.12, 0], [0.19, 0.12, 0.11], 0.025);
  ctx.color("oklch(0.74 0.05 60)"); B(ctx, -0.19, 0.19, 0.115, 0.125, -0.112, 0.112); // the shell's parting line
  ctx.albedo(null); ctx.color("oklch(0.2 0.01 250)"); ctx.roughness(0.6);
  tube(ctx, [[-0.12, 0.24, 0], [-0.1, 0.31, 0], [0.1, 0.31, 0], [0.12, 0.24, 0]], 0.014, 8); // handle
  R(ctx, [0.07, 0.15, -0.112], [0.08, 0.05, 0.006], 0.004); // tape window
  ctx.color("oklch(0.12 0 0)"); for (const x of [0.03, 0.11]) tube(ctx, [[x, 0.15, -0.118], [x, 0.15, -0.122]], 0.018, 10);
  ctx.color("oklch(0.88 0.01 90)"); B(ctx, -0.16, -0.03, 0.17, 0.205, -0.114, -0.111); // M.E.G. stencil plate
  for (let i = 0; i < 4; i++) { ctx.color(i === 0 ? "oklch(0.55 0.18 25)" : "oklch(0.25 0.01 250)"); R(ctx, [-0.15 + i * 0.04, 0.245, -0.03], [0.014, 0.008, 0.014], 0.004); } // keys, red one is REC
  ctx.color("oklch(0.6 0.03 70)"); ctx.roughness(1); B(ctx, -0.18, 0.18, 0.241, 0.243, -0.1, 0.1); // a skin of dust on top
}
function keytag(ctx) {
  ctx.albedo(STEEL); ctx.color("oklch(0.55 0.02 60)"); ctx.metalness(0.9); ctx.roughness(0.35);
  tube(ctx, [[-0.05, 0.012, 0], [0.07, 0.012, 0]], 0.009, 10); // shank
  const ring = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2; ring.push([-0.08 + Math.cos(a) * 0.03, 0.012, Math.sin(a) * 0.03]); } tube(ctx, ring, 0.007, 8); // bow
  B(ctx, 0.03, 0.045, 0.004, 0.02, 0.008, 0.03); B(ctx, 0.05, 0.062, 0.004, 0.02, 0.008, 0.022); // bit
  ctx.color("oklch(0.72 0.11 80)"); ctx.metalness(1); ctx.roughness(0.3); // brass tag on wire
  tube(ctx, [[-0.11, 0.008, 0], [-0.14, 0.006, 0.02]], 0.0015, 4); R(ctx, [-0.17, 0.004, 0.035], [0.03, 0.003, 0.018], 0.003);
}
function amberbox(ctx) {
  ctx.albedo(PLY); ctx.color("oklch(0.85 0.04 70)"); ctx.roughness(0.85);
  R(ctx, [0, 0.21, 0], [0.32, 0.2, 0.22], 0.012);
  ctx.color("oklch(0.75 0.05 65)"); for (const x of [-0.3, 0.3]) B(ctx, x - 0.025, x + 0.025, 0.02, 0.41, -0.23, 0.23); // corner battens
  ctx.color("oklch(0.88 0.04 72)"); R(ctx, [0.02, 0.43, 0.01], [0.33, 0.018, 0.23], 0.008); // lid, nudged off square
  ctx.albedo(null); ctx.color("oklch(0.7 0.16 60)"); ctx.roughness(0.9); B(ctx, -0.33, 0.33, 0.3, 0.34, -0.225, -0.22); // orange tape band
  ctx.color("oklch(0.25 0.02 40)"); // GO SLOW, marker on the lid
  const L = [[-0.2, -0.12, 0, 0.06], [-0.2, -0.2, -0.06, 0], [-0.04, -0.04, -0.06, 0.06], [0.06, 0.12, -0.06, 0.06]];
  for (const [x0, x1, z0, z1] of L) B(ctx, x0 - 0.008, x1 + 0.008, 0.449, 0.452, z0 - 0.008, z1 + 0.008);
  ctx.color("oklch(0.9 0.02 240)"); ctx.roughness(0.2); R(ctx, [0.42, 0.13, -0.05], [0.04, 0.13, 0.04], 0.03); // a water bottle stood beside it
  ctx.color("oklch(0.4 0.12 240)"); R(ctx, [0.42, 0.275, -0.05], [0.022, 0.015, 0.022], 0.006);
}
export function geometry(ctx) {
  const k = ctx.params?.kind ?? "ledger";
  ({ ledger, recorder, keytag, amberbox })[k]?.(ctx);
}
export function collider(ctx) {
  const k = ctx.params?.kind;
  if (k === "amberbox") return { kind: "box", width: 0.66, height: 0.45, depth: 0.46 };
  if (k === "ledger") return { kind: "box", width: 0.6, height: 1.08, depth: 0.45 };
  return null;
}
