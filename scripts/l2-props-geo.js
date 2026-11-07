// Level 2 side-room furniture you can loot, and the door leaves. params.kind: a container kind from level2.yml,
// or "door" (params.style steel | cage | elec). Containers: feet at the bottom centre, front faces -Z.
// Door leaf: feet at the hinge, the leaf runs +X 1.1 m, 2.15 m tall.
import { slab, tube } from "./lib/shapes.js";
import L from "./lib/data/level2.yml";
const RUSTY = "cdn/texture-scratched-worn-steel.png", WOOD = "cdn/texture-worn-hardwood-grain.png";
const box = (ctx, x0, x1, y0, y1, z0, z1) => slab(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2]);
const pick = (a, s) => a[Math.abs(Math.floor(s)) % a.length];

function door(ctx, style, seed) {
  const W = 1.1, Ht = 2.15, t = 0.03;
  ctx.albedo(RUSTY); ctx.metalness(0.45); ctx.roughness(0.6);
  if (style === "cage") {
    ctx.color("oklch(0.42 0.02 250)");
    box(ctx, 0, 0.05, 0, Ht, -t, t); box(ctx, W - 0.05, W, 0, Ht, -t, t); box(ctx, 0, W, 0, 0.05, -t, t); box(ctx, 0, W, Ht - 0.05, Ht, -t, t); box(ctx, 0, W, 1.05, 1.1, -t, t);
    ctx.color("oklch(0.55 0.015 250)");
    for (let x = 0.12; x < W - 0.05; x += 0.1) box(ctx, x - 0.008, x + 0.008, 0.05, Ht - 0.05, -0.01, 0.01);
    for (let y = 0.15; y < Ht - 0.05; y += 0.1) box(ctx, 0.05, W - 0.05, y - 0.006, y + 0.006, -0.012, 0.012);
  } else {
    const col = style === "elec" ? "oklch(0.55 0.1 250)" : pick(["oklch(0.82 0.03 90)", "oklch(0.62 0.05 160)", "oklch(0.7 0.06 55)"], seed);
    ctx.color(col); box(ctx, 0, W, 0, Ht, -t, t);
    ctx.color("oklch(0.3 0.01 250)"); box(ctx, 0.08, W - 0.08, 0.04, 0.34, -t - 0.006, t + 0.006); // kick plate
    ctx.albedo(null); ctx.color("oklch(0.05 0 0)"); box(ctx, 0.35, 0.75, 1.45, 1.85, -t - 0.004, t + 0.004); // wired window
    ctx.color("oklch(0.5 0.01 250)"); for (const y of [1.55, 1.65, 1.75]) box(ctx, 0.35, 0.75, y - 0.004, y + 0.004, -t - 0.006, t + 0.006);
    if (style === "elec") { ctx.color("oklch(0.85 0.17 95)"); ctx.emissive("oklch(0.4 0.1 95)"); box(ctx, 0.4, 0.7, 1.15, 1.35, -t - 0.006, t + 0.006); ctx.emissive(null); ctx.color("oklch(0.1 0 0)"); box(ctx, 0.52, 0.58, 1.18, 1.32, -t - 0.008, t + 0.008); }
  }
  ctx.albedo(null); ctx.color("oklch(0.7 0.01 250)"); ctx.metalness(0.8); // lever handles both sides
  for (const s of [-1, 1]) { box(ctx, W - 0.16, W - 0.1, 0.98, 1.06, s * (t + 0.005), s * (t + 0.04)); box(ctx, W - 0.32, W - 0.1, 1.0, 1.04, s * (t + 0.035), s * (t + 0.06)); }
  ctx.color("oklch(0.25 0.01 250)"); for (const y of [0.3, 1.1, 1.9]) tube(ctx, [[0, y - 0.08, 0], [0, y + 0.08, 0]], [0.025, 0.025], 6, [1, 1], 0, 1, 1); // hinges
  ctx.metalness(0);
}

export function geometry(ctx) {
  const p = ctx.params ?? {}, kind = p.kind ?? "locker", sd = p.seed ?? 0;
  if (kind === "door") return door(ctx, p.style ?? "steel", sd);
  const [w, h, d] = L.containers[kind]?.size ?? [0.6, 0.6, 0.6], X = w / 2, Z = d / 2, F = -Z - 0.01;
  ctx.albedo(RUSTY); ctx.metalness(0.4); ctx.roughness(0.65);
  if (kind === "locker") {
    ctx.color(pick(["oklch(0.55 0.04 160)", "oklch(0.5 0.05 240)", "oklch(0.62 0.02 90)", "oklch(0.48 0.07 40)"], sd));
    box(ctx, -X, X, 0, h, -Z, Z); box(ctx, -X + 0.03, X - 0.03, 0.05, h - 0.05, F, -Z);
    ctx.albedo(null); ctx.color("oklch(0.1 0 0)");
    for (const y0 of [h - 0.35, 0.25]) for (let i = 0; i < 5; i++) box(ctx, -X + 0.1, X - 0.1, y0 + i * 0.04, y0 + i * 0.04 + 0.015, F - 0.004, F);
    ctx.color("oklch(0.75 0.01 250)"); ctx.metalness(0.8); box(ctx, X - 0.1, X - 0.06, h * 0.5 - 0.08, h * 0.5 + 0.08, F - 0.03, F);
    ctx.color("oklch(0.85 0.03 90)"); ctx.metalness(0); box(ctx, -0.08, 0.08, h - 0.5, h - 0.44, F - 0.003, F); // name card
  } else if (kind === "toolbox") {
    ctx.color(pick(["oklch(0.52 0.18 28)", "oklch(0.5 0.12 250)", "oklch(0.65 0.14 75)"], sd));
    box(ctx, -X, X, 0, h * 0.7, -Z, Z);
    box(ctx, -X - 0.01, X + 0.01, h * 0.7, h * 0.78, -Z - 0.01, Z + 0.01);
    box(ctx, -X + 0.04, X - 0.04, h * 0.78, h * 0.84, -Z + 0.04, Z - 0.04);
    ctx.albedo(null); ctx.color("oklch(0.15 0 0)"); ctx.metalness(0.7);
    tube(ctx, [[-X * 0.5, h * 0.84, 0], [-X * 0.45, h + 0.06, 0], [X * 0.45, h + 0.06, 0], [X * 0.5, h * 0.84, 0]], [0.015, 0.015, 0.015, 0.015], 6, [1, 1], 0, 1, 1);
    ctx.color("oklch(0.7 0.01 250)"); for (const s of [-1, 1]) box(ctx, s * X * 0.6 - 0.03, s * X * 0.6 + 0.03, h * 0.6, h * 0.74, F - 0.015, F);
  } else if (kind === "cabinet") {
    ctx.color(pick(["oklch(0.6 0.03 150)", "oklch(0.55 0.02 250)"], sd));
    box(ctx, -X, X, 0.06, h, -Z, Z); ctx.color("oklch(0.25 0.01 250)"); box(ctx, -X + 0.02, X - 0.02, 0, 0.06, -Z + 0.02, Z - 0.02);
    ctx.albedo(null); ctx.color("oklch(0.15 0 0)"); box(ctx, -0.005, 0.005, 0.1, h - 0.04, F - 0.004, F);
    ctx.color("oklch(0.75 0.01 250)"); ctx.metalness(0.8); for (const s of [-1, 1]) box(ctx, s * 0.06 - 0.012, s * 0.06 + 0.012, h * 0.5, h * 0.5 + 0.18, F - 0.03, F);
    ctx.color("oklch(0.85 0.17 90)"); ctx.metalness(0); box(ctx, -0.2, 0.2, h - 0.2, h - 0.12, F - 0.003, F); // hazard label
  } else if (kind === "filing") {
    ctx.color(pick(["oklch(0.6 0.02 80)", "oklch(0.5 0.03 140)", "oklch(0.7 0.01 250)"], sd));
    box(ctx, -X, X, 0, h, -Z, Z);
    for (let i = 0; i < 4; i++) {
      const y0 = 0.04 + i * (h - 0.06) / 4, y1 = y0 + (h - 0.06) / 4 - 0.025, out = i === (sd % 4) ? 0.12 : 0.012; // one drawer hangs open
      ctx.albedo(RUSTY); ctx.color(pick(["oklch(0.6 0.02 80)", "oklch(0.5 0.03 140)", "oklch(0.7 0.01 250)"], sd)); box(ctx, -X + 0.025, X - 0.025, y0, y1, F - out, F + 0.02);
      ctx.albedo(null); ctx.color("oklch(0.78 0.01 250)"); ctx.metalness(0.8); box(ctx, -0.07, 0.07, y1 - 0.09, y1 - 0.06, F - out - 0.025, F - out);
      ctx.color("oklch(0.92 0.02 90)"); ctx.metalness(0); box(ctx, -0.05, 0.05, y1 - 0.05, y1 - 0.02, F - out - 0.004, F - out);
      if (out > 0.05) { ctx.color("oklch(0.85 0.06 85)"); for (let k = 0; k < 6; k++) box(ctx, -X + 0.05, X - 0.05, y0 + 0.03, y1 + 0.03 - (k % 2) * 0.02, F - out + 0.02 + k * 0.016, F - out + 0.025 + k * 0.016); }
      ctx.metalness(0.4);
    }
  } else if (kind === "desk") {
    ctx.albedo(WOOD); ctx.color("oklch(0.62 0.06 60)"); ctx.metalness(0);
    box(ctx, -X, X, h - 0.04, h, -Z, Z);
    ctx.albedo(RUSTY); ctx.color("oklch(0.55 0.02 250)"); ctx.metalness(0.4);
    box(ctx, X - 0.45, X - 0.02, 0, h - 0.04, -Z + 0.02, Z - 0.02); box(ctx, -X + 0.02, -X + 0.06, 0, h - 0.04, -Z + 0.05, Z - 0.05); box(ctx, -X + 0.06, X - 0.45, 0.25, h - 0.04, Z - 0.05, Z - 0.02);
    ctx.albedo(null); ctx.color("oklch(0.78 0.01 250)"); ctx.metalness(0.8);
    for (let i = 0; i < 3; i++) { const y = 0.15 + i * 0.22; box(ctx, X - 0.3, X - 0.17, y + 0.08, y + 0.1, F - 0.02, F); }
    ctx.metalness(0); ctx.color("oklch(0.93 0.01 90)"); box(ctx, -0.3, 0.05, h, h + 0.04, -0.15, 0.15); // a ream of paper
    ctx.color("oklch(0.25 0.01 60)"); box(ctx, 0.15, 0.6, h, h + 0.3, 0, 0.3); ctx.color("oklch(0.1 0.01 160)"); box(ctx, 0.18, 0.57, h + 0.04, h + 0.27, -0.002, 0); // a dead CRT
  } else if (kind === "vending") {
    ctx.color("oklch(0.45 0.16 25)"); box(ctx, -X, X, 0, h, -Z, Z);
    ctx.albedo(null); ctx.color("oklch(0.12 0.01 250)"); box(ctx, -X + 0.06, X * 0.35, 0.45, h - 0.12, F - 0.005, F);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { ctx.color(pick(["oklch(0.7 0.18 30)", "oklch(0.75 0.15 90)", "oklch(0.6 0.15 250)", "oklch(0.7 0.15 150)", "oklch(0.85 0.05 80)"], r * 7 + c * 3 + sd)); const x = -X + 0.1 + c * (X * 1.35 - 0.04) / 4, y = 0.55 + r * 0.24; box(ctx, x, x + 0.1, y, y + 0.14, F + 0.04, F + 0.12); }
    ctx.color("oklch(0.5 0.01 250)"); for (let r = 0; r < 5; r++) box(ctx, -X + 0.06, X * 0.35, 0.53 + r * 0.24, 0.55 + r * 0.24, F + 0.02, F + 0.2);
    ctx.emissive("oklch(0.5 0.12 90)"); ctx.color("oklch(0.9 0.1 90)"); box(ctx, X * 0.45, X - 0.06, h - 0.45, h - 0.3, F - 0.006, F); ctx.emissive(null); // the coin panel still glows
    ctx.color("oklch(0.15 0 0)"); box(ctx, X * 0.45, X - 0.06, h - 0.9, h - 0.5, F - 0.004, F); box(ctx, -X + 0.06, X * 0.35, 0.12, 0.35, F - 0.006, F);
    ctx.color("oklch(0.85 0.02 250 / 0.3)"); box(ctx, -X + 0.06, X * 0.35, 0.45, h - 0.12, F - 0.012, F - 0.006); // glass
  } else if (kind === "fridge") {
    ctx.color("oklch(0.88 0.02 95)"); box(ctx, -X, X, 0, h, -Z, Z);
    ctx.albedo(null); ctx.color("oklch(0.2 0.01 250)"); box(ctx, -X, X, h * 0.66, h * 0.66 + 0.012, F - 0.003, F);
    ctx.color("oklch(0.7 0.01 250)"); ctx.metalness(0.8); box(ctx, X - 0.1, X - 0.07, h * 0.72, h * 0.9, F - 0.04, F); box(ctx, X - 0.1, X - 0.07, h * 0.35, h * 0.6, F - 0.04, F);
    ctx.metalness(0); ctx.color("oklch(0.45 0.05 60)"); box(ctx, -X + 0.08, -X + 0.3, h * 0.2, h * 0.5, F - 0.002, F); // rust stain
  } else if (kind === "cagecrate" || kind === "lockbox") {
    if (kind === "cagecrate") { ctx.albedo(WOOD); ctx.color("oklch(0.66 0.07 70)"); ctx.metalness(0); } else ctx.color("oklch(0.4 0.03 250)");
    box(ctx, -X, X, 0, h, -Z, Z);
    ctx.albedo(RUSTY); ctx.color("oklch(0.35 0.02 250)"); ctx.metalness(0.6);
    for (const s of [-1, 1]) box(ctx, s * X * 0.6 - 0.03, s * X * 0.6 + 0.03, -0.005, h + 0.005, -Z - 0.005, Z + 0.005);
    ctx.albedo(null); ctx.color("oklch(0.85 0.15 90)"); ctx.metalness(0); box(ctx, -0.12, 0.12, h * 0.4, h * 0.65, F - 0.003, F); // stencil plate
  }
  ctx.metalness(0); ctx.albedo(null); ctx.color(null);
}
