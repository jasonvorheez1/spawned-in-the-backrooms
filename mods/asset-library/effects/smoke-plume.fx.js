// Smoke Plume — a chimney or a burnt-out wreck: a tight dark throat at the source
// that hands the eye up into a wide, slow column, leaning downwind as it climbs.
// Haze, never a wall — peak alpha stays near 0.3 and density comes from overlap.
// params.rate 0..1+ scales how hard it is smoking.
const {
  fx,
  pop,
  attr,
  range,
  curve,
  curl,
  buoyancy,
  drag,
  cone,
  up,
  vec3,
  flicker,
  spin,
  rgb,
  disc,
  sprite,
} = require("builtin/fx");

export function effect(ctx) {
  const rate = ctx.params && typeof ctx.params.rate === "number" ? ctx.params.rate : 1;

  const vent = disc({ r: 0.3, jitter: 0.4 });
  // A constant sideways acceleration under drag settles into a steady drift — the
  // column leans off true instead of standing like a pillar.
  const lean = vec3(0.34, 0, 0.15);

  // The throat: small, fast, dark puffs right at the source. They give the column a
  // waist so the big body above it reads as rising, not just appearing.
  const throat = pop("throat", {
    spawn: { rate: flicker(0.4, 0.28).mul(22 * rate), on: disc({ r: 0.14, jitter: 0.3 }) },
    lifetime: [0.8, 1.4],
    init: { v: up(2).add(cone(14).mul(range(0.1, 0.45))), size: range(0.22, 0.36) },
    accel: buoyancy(1.1).add(curl(0.55).mul(0.5)).add(drag(1.4)).add(lean),
    size: attr("size").mul(curve([0, 0.55], [1, 1.9])),
    color: curve([0, rgb(0.3, 0.27, 0.25)], [1, rgb(0.24, 0.22, 0.2)]),
    alpha: curve([0, 0], [0.22, 0.3], [1, 0]),
    rotation: spin(0.22),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha" }),
  });

  // The body: long-lived puffs that climb 4-6m on a buoyancy/drag terminal of about
  // 1.1 m/s and swell from a third of a metre to two and a half as they go.
  const plume = pop("plume", {
    spawn: { rate: flicker(0.3, 0.3).mul(16 * rate), on: vent },
    lifetime: [3.2, 4.6],
    init: { v: up(1.5).add(cone(18).mul(range(0.1, 0.5))), size: range(0.85, 1.2) },
    accel: buoyancy(0.85).add(curl(0.22).mul(0.6)).add(drag(0.8)).add(lean),
    size: attr("size").mul(curve([0, 0.3], [0.35, 1.1], [1, 2.5])),
    color: curve([0, rgb(0.33, 0.3, 0.26)], [0.5, rgb(0.24, 0.22, 0.2)], [1, rgb(0.17, 0.16, 0.15)]),
    alpha: curve([0, 0], [0.18, 0.3], [0.62, 0.21], [1, 0]),
    rotation: spin(0.1),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.8 }),
  });

  return fx(throat, plume);
}
