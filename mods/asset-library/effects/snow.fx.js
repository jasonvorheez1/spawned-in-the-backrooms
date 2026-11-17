// Falling Snow — weather, not a column. follow: "player" anchors the whole field to
// each viewer's own player on their own screen, and wrap: turns the fall into a fixed
// census: a flake that leaves the 30×14×30m box silently re-enters the opposite face,
// so the snow is simply always overhead, at constant cost, however far you walk.
// params.density scales the census (the only density knob — never a bigger box).
const { fx, pop, attr, range, curve, curl, drag, vec3, flicker, rgb, box, disc, sprite } = require("builtin/fx");

export function effect(ctx) {
  const density = ctx.params && typeof ctx.params.density === "number" ? ctx.params.density : 1;
  const d = density > 0 ? density : 0;

  // The sky: a recycling census. Constant downward accel against drag settles every
  // flake at ~1.2 m/s terminal with a ~0.37 m/s sideways lean; curl is the flutter.
  const flakes = pop("flakes", {
    count: Math.round(280 * d),
    on: box({ halfExtents: [15, 7, 15] }),
    wrap: [15, 7, 15],
    init: { v: vec3(0.35, -1.2, 0), size: range(0.03, 0.1) },
    accel: vec3(0.22, -0.72, 0).add(drag(0.6)).add(curl(0.3).mul(0.5)),
    attrs: { sway: flicker(0.4, 0.3) },
    size: attr("size"),
    color: rgb(0.93, 0.95, 1),
    alpha: attr("sway").mul(0.8),
    render: sprite({ texture: "/cdn/effect-snowflake-soft.png", blend: "alpha" }),
  });

  // The settling layer is its own small rate population — a wrapped census can never
  // stick (stuck flakes would never recycle and the sky would empty). These fall from
  // the same ceiling, clamp where they land, and melt out on the tail of their life.
  const settling = pop("settling", {
    spawn: { rate: 11 * d, on: disc({ r: 14, lift: 7 }) },
    lifetime: [11, 17],
    init: { v: vec3(0.35, -1.2, 0), size: range(0.04, 0.085) },
    accel: vec3(0.22, -0.72, 0).add(drag(0.6)).add(curl(0.3).mul(0.5)),
    floor: "stick",
    size: attr("size"),
    color: rgb(0.95, 0.96, 1),
    alpha: curve([0, 0], [0.04, 0.85], [0.75, 0.8], [1, 0]),
    render: sprite({ texture: "/cdn/effect-snowflake-soft.png", blend: "alpha" }),
  });

  return fx({ follow: "player" }, flakes, settling);
}
