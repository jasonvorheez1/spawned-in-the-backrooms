// Fireflies — a slow swarm of glow motes drifting over a ~6m patch of grass.
// Each mote rides its own curl eddy (rising, sinking, never repeating) and winks
// on its own noise clock, so the swarm blinks out of sync instead of pulsing as
// one. One gentle light under the swarm picks up the ground. params.count is a
// multiplier on how many motes are alive at once (~24 each).
const {
  fx,
  pop,
  attr,
  range,
  curve,
  curl,
  drag,
  cone,
  noise,
  time,
  flicker,
  count,
  hdr,
  rgb,
  disc,
  sprite,
  light,
} = require("builtin/fx");

export function effect(ctx) {
  const mult = ctx.params && typeof ctx.params.count === "number" ? ctx.params.count : 1;
  const census = 24 * (mult > 0 ? mult : 0);
  const swarm = disc({ r: 3, jitter: 0.35, lift: 0.9 });

  // rate × mean lifetime ≈ the alive census; the flicker on the rate keeps the
  // swarm from replenishing on a metronome.
  const motes = pop("motes", {
    spawn: { rate: flicker(0.2, 0.18).mul(census / 12), on: swarm },
    lifetime: [9, 15],
    init: { v: cone(85).mul(range(0.05, 0.22)), size: range(0.05, 0.11) },
    accel: curl(0.22).mul(0.55).add(drag(0.9)),
    size: attr("size").mul(curve([0, 0.55], [0.2, 1], [0.85, 1], [1, 0.45])),
    color: range(hdr(2.4, 2.6, 0.55), hdr(1.5, 2.9, 0.85)),
    // The wink: value noise on its own per-particle phase, squeezed by smoothstep
    // into long dark beats and short bright ones.
    alpha: curve([0, 0], [0.07, 1], [0.9, 1], [1, 0]).mul(
      noise(time().mul(0.85).add(attr("rand").mul(40))).smoothstep(0.34, 0.62).mul(0.92).add(0.08)
    ),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
  });

  // One soft light held over the patch, breathing with how much swarm is alive —
  // dim params.count and the ground goes dark with it.
  const swarmlight = pop("swarmlight", {
    count: 1,
    at: swarm.center({ lift: 1.2 }),
    attrs: { glo: flicker(0.5, 0.3).mul(count(motes).div(census > 0 ? census : 1).clamp01()) },
    render: light({ color: rgb(0.82, 1, 0.42), intensity: attr("glo").mul(1.8), radius: 5 }),
  });

  return fx(motes, swarmlight);
}
