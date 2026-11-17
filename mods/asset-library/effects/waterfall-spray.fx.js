// Waterfall Spray — the foot of falling water. Fine droplets thrown up and outward
// off the plunge pool arc over and fall back, a slow mist cloud hangs above the same
// disc, and the occasional fat droplet flies further and dies on the ground, bursting
// a small crown. Cool blue-white, alpha modest — spray is bright, not opaque.
const {
  fx,
  pop,
  attr,
  range,
  curve,
  curl,
  gravity,
  buoyancy,
  drag,
  cone,
  up,
  when,
  spin,
  flicker,
  hdr,
  rgb,
  disc,
  sprite,
} = require("builtin/fx");

export function effect(ctx) {
  const plunge = disc({ r: 1, jitter: 0.45, lift: 0.15 });
  const cloud = disc({ r: 1.4, jitter: 0.35, lift: 0.5 });

  // Core: the throw. up(3.6) plus a wide cone, three quarters of gravity and a little
  // drag — apex around a metre, then back down. The rate gusts so the fall breathes.
  const spray = pop("spray", {
    spawn: { rate: flicker(0.6, 0.25).mul(240), on: plunge },
    lifetime: [0.9, 1.6],
    init: { v: up(3.6).add(cone(52).mul(range(0.8, 2.6))), size: range(0.025, 0.06) },
    accel: gravity().mul(0.75).add(drag(1)).add(curl(0.5).mul(0.45)),
    size: attr("size").mul(curve([0, 0.7], [0.3, 1], [1, 0.8])),
    color: curve([0, hdr(1.7, 2.1, 2.5)], [1, hdr(0.9, 1.2, 1.6)]),
    alpha: curve([0, 0], [0.12, 0.55], [0.7, 0.4], [1, 0]),
    render: sprite({ texture: "/cdn/effect-droplet-round-soft.png", blend: "add", align: "velocity", stretch: 0.03 }),
  });

  // Ambiance: the standing mist cloud — a handful of big dim puffs, barely lifting.
  const mist = pop("mist", {
    spawn: { rate: 5, on: cloud },
    lifetime: [2.6, 5],
    init: { v: up(0.3).add(cone(70).mul(range(0.1, 0.5))), size: range(1.1, 2.4) },
    accel: buoyancy(0.22).add(drag(0.7)).add(curl(0.2).mul(0.25)),
    size: attr("size").mul(curve([0, 0.6], [1, 1.5])),
    color: rgb(0.82, 0.88, 0.95),
    alpha: curve([0, 0], [0.25, 0.17], [0.7, 0.14], [1, 0]),
    rotation: spin(0.08),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 1.2 }),
  });

  // Accent: fat droplets that clear the pool and land — floor:"die" is what lets the
  // crown fire exactly where each one hit.
  const drops = pop("drops", {
    spawn: { rate: 26, on: plunge, burst: { count: [3, 6], every: [0.5, 1.3] } },
    lifetime: 2.5,
    init: { v: up(4.4).add(cone(42).mul(range(1, 3.2))), size: range(0.05, 0.09) },
    accel: gravity().add(drag(0.25)),
    floor: "die",
    size: attr("size"),
    color: rgb(0.78, 0.87, 0.96),
    alpha: curve([0, 0], [0.1, 0.7], [1, 0.6]),
    render: sprite({ texture: "/cdn/effect-droplet-round-soft.png", blend: "alpha", align: "velocity", stretch: 0.03 }),
  });

  const crown = pop("crown", {
    spawn: when(drops.dies, { count: 4, probability: 0.7 }),
    inherit: { p: drops.p },
    lifetime: [0.2, 0.32],
    init: { v: cone(70).mul(range(0.7, 1.5)) },
    accel: drag(4),
    size: curve([0, 0.03], [1, 0.12]),
    color: hdr(1.2, 1.5, 1.9),
    alpha: curve([0, 0.7], [1, 0]),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
  });

  return fx(spray, mist, drops, crown);
}
