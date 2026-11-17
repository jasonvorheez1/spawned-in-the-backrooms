// Sparks Shower — a grinder biting metal, or a severed cable arcing: a continuous
// fan of hot streaks thrown out and down, clattering off the ground on per-particle
// restitution, with a small dim light and a hot contact point at the source.
const {
  fx,
  pop,
  attr,
  range,
  curve,
  gravity,
  drag,
  cone,
  vec3,
  flicker,
  count,
  hdr,
  rgb,
  disc,
  sprite,
  light,
} = require("builtin/fx");

export function effect(ctx) {
  const source = disc({ r: 0.05, lift: 0.02 });

  // The shower: a fan leaning off the contact point, thrown at 3-8 m/s. Bursts on a
  // re-sampled interval on top of the base rate give it the irregular spit of metal
  // catching. Each streak rolls its own bounce, so they clatter out of step.
  const streaks = pop("streaks", {
    spawn: { rate: flicker(1.1, 0.4).mul(80), on: source, burst: { count: [5, 13], every: [0.35, 1.1] } },
    lifetime: [0.4, 0.85],
    init: { v: cone(26).mul(range(3.2, 7.5)).add(vec3(1.9, 0.35, 0)), size: range(0.02, 0.045) },
    accel: gravity().add(drag(0.5)),
    floor: "bounce",
    bounce: range(0.22, 0.55),
    size: attr("size").mul(curve([0, 1], [0.8, 0.9], [1, 0.5])),
    color: curve([0, hdr(7, 6.2, 2.8)], [0.35, hdr(5, 2.4, 0.5)], [1, hdr(1.8, 0.25, 0.05)]),
    alpha: curve([0, 0], [0.05, 1], [0.7, 0.95], [1, 0]),
    render: sprite({ texture: "/cdn/effect-spark-streak.png", blend: "add", align: "velocity", stretch: 0.045 }),
  });

  // The contact point: one hot bead that jitters with the spit rate — the thing the
  // streaks are visibly coming OFF, so the fan has a cause.
  const contact = pop("contact", {
    count: 1,
    at: source.center({ lift: 0.02 }),
    attrs: { hot: flicker(7, 0.45).mul(count(streaks).div(45).clamp01()) },
    size: attr("hot").mul(0.1).add(0.04),
    color: hdr(6, 5, 2.2),
    alpha: attr("hot").clamp01().mul(0.9),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
  });

  // Small and dim on purpose — sparks light the metre around them, not the room.
  const sparklight = pop("sparklight", {
    count: 1,
    at: source.center({ lift: 0.1 }),
    attrs: { buzz: flicker(6, 0.35).mul(count(streaks).div(40).clamp01()) },
    render: light({ color: rgb(1, 0.86, 0.55), intensity: attr("buzz").mul(1.5), radius: 2.5 }),
  });

  return fx(streaks, contact, sparklight);
}
