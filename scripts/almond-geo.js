// A bottle of almond water: cloudy plastic you can see the milky water through, a ribbed cap, a peeling label.
import { tube } from "./lib/shapes.js";
export function geometry(ctx) {
  const hi = ctx.lod <= 2, M = hi ? 18 : 8;
  ctx.smooth();
  // the water inside: milky, a little warm
  ctx.roughness(0.4);
  ctx.color("oklch(0.9 0.035 80)");
  tube(ctx, [[0, 0.006, 0], [0, 0.01, 0], [0, 0.16, 0], [0, 0.175, 0]], [0.001, 0.044, 0.044, 0.001], M);
  // the bottle: cloudy plastic, bevelled base, shoulders, neck ring
  ctx.roughness(0.15);
  ctx.color("oklch(0.95 0.015 90)", 0.45);
  tube(ctx, [[0, 0, 0], [0, 0.004, 0], [0, 0.012, 0], [0, 0.03, 0], [0, 0.06, 0], [0, 0.14, 0], [0, 0.17, 0], [0, 0.2, 0], [0, 0.222, 0], [0, 0.232, 0], [0, 0.236, 0]], [0.001, 0.04, 0.048, 0.05, 0.047, 0.047, 0.05, 0.04, 0.022, 0.02, 0.026], M);
  // label: amber band with a dark stripe and a torn corner
  ctx.flat();
  ctx.roughness(0.7);
  ctx.color("oklch(0.66 0.13 62)");
  tube(ctx, [[0, 0.07, 0], [0, 0.13, 0]], [0.0495, 0.0495], M);
  ctx.color("oklch(0.32 0.06 50)");
  tube(ctx, [[0, 0.093, 0], [0, 0.107, 0]], [0.0505, 0.0505], M);
  ctx.color("oklch(0.93 0.02 85)");
  tube(ctx, [[0, 0.081, 0], [0, 0.086, 0]], [0.0502, 0.0502], M);
  // ribbed cap that catches the fluorescent light
  ctx.roughness(0.35);
  ctx.color("#ffffff"); ctx.emissive("oklch(0.55 0.04 90)");
  tube(ctx, [[0, 0.236, 0], [0, 0.27, 0]], [0.024, 0.024], hi ? 24 : 8, [1, 1], hi ? 0.06 : 0, 2);
  tube(ctx, [[0, 0.27, 0], [0, 0.271, 0]], [0.024, 0.001], hi ? 24 : 8);
  ctx.emissive(null); ctx.color(null);
}
export function collider() { return null; }
