// Rainfall — weather around the viewer. follow: "player" keeps the ceiling overhead
// on every screen from this one object; drops spawn on a 30m disc 8m up, fall fast
// enough that align:"velocity" stretches them into lines, and end at the ground
// through floor:"die" so the splash population can fire exactly where they landed.
// params.density scales how hard it comes down.
const { fx, pop, attr, range, curve, cone, vec3, when, curl, drag, hdr, rgb, disc, sprite } = require("builtin/fx");

export function effect(ctx) {
  const density = ctx.params && typeof ctx.params.density === "number" ? ctx.params.density : 1;
  const d = density > 0 ? density : 0;

  // ~12 m/s down: long axis = size + |v| · stretch, so each drop reads as a streak
  // head-on and eases back to an honest dot when you look straight up it.
  const drops = pop("drops", {
    spawn: { rate: 620 * d, on: disc({ r: 15, lift: 8 }) },
    lifetime: 2,
    init: { v: vec3(0.9, -12, 0).add(cone(4).mul(range(0.2, 0.9))), size: range(0.035, 0.055) },
    accel: curl(0.2).mul(0.3),
    floor: "die",
    size: attr("size"),
    color: rgb(0.6, 0.7, 0.85),
    alpha: 0.45,
    render: sprite({ texture: "/cdn/effect-droplet-round-soft.png", blend: "alpha", align: "velocity", stretch: 0.055 }),
  });

  // The payoff: a fifth of the landings burst a small crown, brighter and bigger than
  // the drop that made it, with drag only — no gravity — so it blooms on the surface
  // instead of sinking back through it.
  const splash = pop("splash", {
    spawn: when(drops.dies, { count: 5, probability: 0.2 }),
    inherit: { p: drops.p },
    lifetime: [0.22, 0.34],
    init: { v: cone(72).mul(range(0.8, 1.6)) },
    accel: drag(4.5),
    size: curve([0, 0.04], [1, 0.14]),
    color: hdr(1.1, 1.45, 1.9),
    alpha: curve([0, 0.75], [1, 0]),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
  });

  return fx({ follow: "player" }, drops, splash);
}
