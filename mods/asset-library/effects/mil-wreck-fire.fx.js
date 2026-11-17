// Wreck Fire — a burning armoured vehicle: fuel-fed orange flame across a
// couple of metres of hull, oily black smoke stacking off the top of it, and
// the air over the fire bending with the heat.
//
// Sized for a tank by default (params.size 1 ≈ a 2.6 m fire seat); drop it to
// 0.4 for a burning truck cab, push it to 1.6 for a fuel dump.
//
// params.size  the fire's footprint (default 1)
// params.heat  0..1+ — fuel left. Patch it down and flame, smoke and light all
//              dim together, because the whole program re-runs on a param write.
const { fx, pop, attr, range, curve, curl, buoyancy, drag, gravity, cone, up, vec3, flicker, firelight, spin, count, when, hdr, rgb, disc, sprite, light } = require("builtin/fx");

export function effect(ctx) {
  const p = ctx.params || {};
  const size = typeof p.size === "number" ? p.size : 1;
  const heat = typeof p.heat === "number" ? p.heat : 1;

  const seat = disc({ r: 1.3 * size, jitter: 0.35 });
  const drift = vec3(0.35, 0, -0.2); // the smoke walks off the wreck as it climbs

  // Bed: the hull itself glowing through — persistent, breathing on its own
  // slow clock, no churn.
  const coals = pop("coals", {
    count: 26,
    on: seat,
    init: { size: range(0.18, 0.42) },
    size: attr("size").mul(size).mul(flicker(0.5, 0.14)),
    color: range(hdr(2.4, 0.85, 0.2), hdr(1.0, 0.28, 0.06)).mul(flicker(0.9, 0.35)).mul(heat),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
  });

  // Core: tall licking flame. Rate rides flicker so the fire gusts; every wisp
  // rolls its own size and rise so no two are the same.
  const flame = pop("flame", {
    spawn: { rate: flicker(0.5, 0.24).mul(150 * heat), on: seat },
    lifetime: [0.6, 1.15],
    init: { v: up(3.4).add(cone(22).mul(range(0.5, 1.6))), size: range(0.4, 0.85) },
    accel: curl(0.45).mul(1.8).add(buoyancy(3.4)).add(drag(1.4)),
    size: attr("size").mul(size).mul(curve([0, 0.45], [0.25, 1], [0.7, 0.78], [1, 0.15])),
    color: curve([0, hdr(5.2, 3.4, 1.1)], [0.3, hdr(3.6, 1.4, 0.25)], [0.68, hdr(2.0, 0.5, 0.08)], [1, hdr(0.7, 0.12, 0.02)]),
    alpha: curve([0, 0], [0.1, 1], [0.75, 0.85], [1, 0]),
    render: sprite({ texture: "/cdn/effect-flame-wisp.png", blend: "add" }),
  });

  // Ambiance: heavy oily smoke, chained off the flames that burned out, so the
  // black starts exactly where the orange stops. Peak alpha stays a haze — the
  // weight comes from overlap and the near-black colour, never from one wall.
  const smoke = pop("smoke", {
    spawn: when(flame.dies, 0.5),
    inherit: { p: flame.p, v: flame.v.mul(0.45) },
    lifetime: [2.6, 4.4],
    init: { size: range(0.7, 1.3) },
    accel: buoyancy(1.5).add(curl(0.25).mul(0.9)).add(drag(0.75)).add(drift),
    size: attr("size").mul(size).mul(curve([0, 0.8], [1, 3.6])),
    color: curve([0, rgb(0.1, 0.09, 0.085)], [0.5, rgb(0.13, 0.12, 0.11)], [1, rgb(0.2, 0.19, 0.18)]),
    alpha: curve([0, 0], [0.2, 0.42], [0.7, 0.3], [1, 0]),
    rotation: spin(0.12),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.9 }),
  });

  // Heat shimmer: no texture sheet needed — a soft blob under "distort" turns
  // its colour into a screen-space refraction offset, so the curl field IS the
  // wobble in the air above the fire.
  const shimmer = pop("shimmer", {
    spawn: { rate: 26 * heat, on: disc({ r: 1.1 * size, lift: 0.5 }) },
    lifetime: [0.7, 1.2],
    init: { v: up(2.2).add(cone(18).mul(range(0.2, 0.7))), size: range(0.8, 1.5) },
    accel: buoyancy(1.6).add(drag(1.1)),
    size: attr("size").mul(size).mul(curve([0, 0.7], [1, 2.2])),
    color: curl(1.4).mul(0.045),
    alpha: curve([0, 0], [0.25, 0.55], [1, 0]),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "distort" }),
  });

  // Accent: burning fragments popping out of the hull and falling back.
  const embers = pop("embers", {
    spawn: { rate: 14 * heat, on: seat, burst: { count: [4, 9], every: [0.6, 1.6] } },
    lifetime: [0.9, 1.8],
    init: { v: up(4.5).add(cone(34).mul(range(0.6, 2.2))), size: range(0.03, 0.07) },
    accel: curl(0.7).mul(1.2).add(gravity().mul(0.4)).add(drag(0.5)),
    size: attr("size").mul(curve([0, 1], [0.7, 0.8], [1, 0.25])),
    color: curve([0, hdr(5, 2.6, 0.7)], [0.6, hdr(2.2, 0.7, 0.12)], [1, hdr(0.9, 0.18, 0.03)]),
    alpha: curve([0, 0], [0.08, 1], [0.7, 0.9], [1, 0]).mul(flicker(9, 0.3)),
    render: sprite({ texture: "/cdn/effect-ember-glow.png", blend: "add", align: "velocity", stretch: 0.02 }),
  });

  // One light for the whole wreck, breathing with how much flame is alive.
  const firelit = pop("firelit", {
    count: 1,
    at: seat.center({ lift: 1 * size }),
    attrs: { glo: firelight().mul(count(flame).div(90).clamp01()) },
    render: light({
      color: rgb(1, 0.5, 0.2).mix(rgb(1, 0.7, 0.4), attr("glo").sub(1).clamp01()),
      intensity: attr("glo").mul(7 * heat),
      radius: 14 * size,
    }),
  });

  return fx(coals, flame, smoke, shimmer, embers, firelit);
}
