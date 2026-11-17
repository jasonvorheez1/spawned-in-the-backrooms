// Campfire — the Asset Library's reference effect. Coals under licking flame,
// crackle embers, smoke handed off from dying licks, and one light that breathes
// with how much fire is actually alive. params.heat 0..1 dims the whole thing.
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
  flicker,
  firelight,
  spin,
  hdr,
  rgb,
  count,
  when,
  disc,
  sprite,
  light,
} = require("builtin/fx");

export function effect(ctx) {
  const heat = ctx.params && typeof ctx.params.heat === "number" ? ctx.params.heat : 1;
  const bed = disc({ r: 0.26, jitter: 0.3 });

  const coals = pop("coals", {
    count: 22,
    on: bed,
    init: { size: range(0.07, 0.15) },
    size: attr("size").mul(flicker(0.5, 0.12)),
    color: range(hdr(2.6, 1.0, 0.28), hdr(1.2, 0.35, 0.09)).mul(flicker(0.8, 0.3)),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
  });

  const flame = pop("flame", {
    spawn: { rate: flicker(0.45, 0.22).mul(115 * heat), on: bed },
    lifetime: [0.5, 0.95],
    init: { v: up(1.6).add(cone(24).mul(range(0.35, 0.9))), size: range(0.2, 0.42) },
    accel: curl(0.5).mul(1.3).add(buoyancy(2.2)).add(drag(1.5)),
    size: attr("size").mul(curve([0, 0.5], [0.25, 1], [0.7, 0.72], [1, 0.14])),
    color: curve(
      [0, hdr(4.8, 3.6, 1.5)],
      [0.3, hdr(3.4, 1.5, 0.35)],
      [0.65, hdr(1.9, 0.55, 0.12)],
      [1, hdr(0.7, 0.14, 0.03)]
    ),
    alpha: curve([0, 0], [0.12, 1], [0.75, 0.85], [1, 0]),
    render: sprite({ texture: "/cdn/effect-flame-wisp.png", blend: "add" }),
  });

  const embers = pop("embers", {
    spawn: { rate: 7 * heat, on: bed, burst: { count: [3, 7], every: [0.5, 1.4] } },
    lifetime: [0.7, 1.6],
    init: { v: up(2.4).add(cone(32).mul(range(0.4, 1.3))), size: range(0.02, 0.05) },
    accel: curl(0.8).mul(1.1).add(gravity().mul(0.45)).add(drag(0.5)),
    size: attr("size").mul(curve([0, 1], [0.7, 0.8], [1, 0.3])),
    color: curve([0, hdr(5, 2.8, 0.8)], [0.6, hdr(2.4, 0.8, 0.15)], [1, hdr(1, 0.22, 0.04)]),
    alpha: curve([0, 0], [0.08, 1], [0.65, 0.9], [1, 0]).mul(flicker(11, 0.35)),
    render: sprite({ texture: "/cdn/effect-ember-glow.png", blend: "add", align: "velocity", stretch: 0.02 }),
  });

  const smoke = pop("smoke", {
    spawn: when(flame.dies, 0.09),
    inherit: { p: flame.p, v: flame.v.mul(0.4) },
    lifetime: [1.8, 3.2],
    init: { size: range(0.16, 0.26) },
    accel: buoyancy(0.9).add(curl(0.35).mul(0.5)).add(drag(0.8)),
    size: attr("size").mul(curve([0, 0.7], [1, 3.4])),
    color: curve([0, rgb(0.3, 0.28, 0.26)], [1, rgb(0.15, 0.15, 0.16)]),
    alpha: curve([0, 0], [0.25, 0.28], [0.7, 0.2], [1, 0]),
    rotation: spin(0.15),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha" }),
  });

  const hearthlight = pop("hearthlight", {
    count: 1,
    at: bed.center({ lift: 0.4 }),
    attrs: { glo: firelight().mul(count(flame).div(60).clamp01()) },
    render: light({
      color: rgb(1, 0.55, 0.24).mix(rgb(1, 0.72, 0.42), attr("glo").sub(1).clamp01()),
      intensity: attr("glo").mul(5),
      radius: 5,
    }),
  });

  return fx(coals, flame, embers, smoke, hearthlight);
}
