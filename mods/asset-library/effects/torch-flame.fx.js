// Torch Flame — a wall-torch lick: one tight column about a third of a campfire's
// height, a few lazy embers peeling off the tip, and one light that breathes with
// how much flame is actually alive. params.heat 0..1+ scales the whole thing.
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
  count,
  hdr,
  rgb,
  disc,
  sprite,
  light,
} = require("builtin/fx");

export function effect(ctx) {
  const heat = ctx.params && typeof ctx.params.heat === "number" ? ctx.params.heat : 1;

  // A wick, not a fire bed — 8cm across, so the column stays a hand's width.
  const wick = disc({ r: 0.08, jitter: 0.25 });

  // Core: short-lived licks. Heavy drag against a modest buoyancy caps the column
  // at roughly 0.35m — a torch, never a bonfire. Rate gusts so it never metronomes.
  const flame = pop("flame", {
    spawn: { rate: flicker(0.6, 0.24).mul(120 * heat), on: wick },
    lifetime: [0.32, 0.55],
    init: { v: up(1.1).add(cone(12).mul(range(0.05, 0.2))), size: range(0.22, 0.34) },
    accel: curl(1.1).mul(0.35).add(buoyancy(1.4)).add(drag(2)),
    size: attr("size").mul(curve([0, 0.55], [0.3, 1.1], [0.7, 0.8], [1, 0.15])),
    color: curve(
      [0, hdr(4.6, 3.4, 1.4)],
      [0.35, hdr(3.2, 1.4, 0.32)],
      [0.7, hdr(1.8, 0.5, 0.1)],
      [1, hdr(0.6, 0.12, 0.03)]
    ),
    alpha: curve([0, 0], [0.14, 1], [0.75, 0.85], [1, 0]),
    render: sprite({ texture: "/cdn/effect-flame-wisp.png", blend: "add" }),
  });

  // Accent: the odd ember drifting off the tip — a slow trickle plus rare handfuls,
  // so it reads as a torch guttering rather than a shower.
  const embers = pop("embers", {
    spawn: { rate: 3 * heat, on: wick, burst: { count: [1, 3], every: [0.9, 2.4] } },
    lifetime: [0.6, 1.2],
    init: { v: up(1.5).add(cone(30).mul(range(0.15, 0.55))), size: range(0.012, 0.03) },
    accel: curl(0.7).mul(0.9).add(gravity().mul(0.35)).add(drag(0.6)),
    size: attr("size").mul(curve([0, 1], [0.7, 0.8], [1, 0.3])),
    color: curve([0, hdr(5, 2.8, 0.8)], [0.6, hdr(2.2, 0.7, 0.14)], [1, hdr(0.9, 0.2, 0.04)]),
    alpha: curve([0, 0], [0.1, 1], [0.65, 0.9], [1, 0]).mul(flicker(10, 0.35)),
    render: sprite({ texture: "/cdn/effect-ember-glow.png", blend: "add", align: "velocity", stretch: 0.02 }),
  });

  // The one light: held at the wick, breathing on firelight() and scaled by how much
  // flame is alive — snuff the heat and the wall goes dark with it.
  const torchlight = pop("torchlight", {
    count: 1,
    at: wick.center({ lift: 0.22 }),
    attrs: { glo: firelight().mul(count(flame).div(24).clamp01()) },
    render: light({
      color: rgb(1, 0.58, 0.26).mix(rgb(1, 0.74, 0.44), attr("glo").sub(1).clamp01()),
      intensity: attr("glo").mul(3.2),
      radius: 4,
    }),
  });

  return fx(flame, embers, torchlight);
}
