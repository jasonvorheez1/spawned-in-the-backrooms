// Impact Dust — a shell, a mortar or a heavy round hitting dry ground: the
// crack of dust off the deck, clods thrown clear and bouncing, and the whole
// thing settling back out of the air a second later.
//
// One-shot: every population either bursts once or closes its window, so the
// effect winds itself down and removes itself. Just spawn it.
//
// params.power  0.4 = a rifle round in dirt, 1 = a mortar, 2 = a 105
const { fx, pop, attr, range, curve, curl, drag, gravity, radial, up, cone, spin, rgb, when, disc, sphere, sprite } = require("builtin/fx");

export function effect(ctx) {
  const p = ctx.params || {};
  const power = typeof p.power === "number" ? p.power : 1;

  const seat = disc({ r: 0.35 * power, jitter: 0.4 });

  // t=0: the puff. A hard shove of dust straight up and out, dragged to a stop
  // in half a second, then hanging and swelling as it dies.
  const puff = pop("puff", {
    spawn: { burst: { count: [34 * power, 52 * power] }, on: seat },
    lifetime: [1.1, 1.9],
    init: { v: up(3.2 * power).add(cone(55).mul(range(1.2, 4.5 * power))), size: range(0.3, 0.6) },
    accel: drag(3.2).add(curl(0.4).mul(0.7)),
    size: attr("size").mul(power).mul(curve([0, 0.5], [0.35, 1.4], [1, 2.6])),
    color: curve([0, rgb(0.42, 0.36, 0.28)], [1, rgb(0.32, 0.28, 0.23)]),
    alpha: curve([0, 0], [0.1, 0.55], [0.6, 0.34], [1, 0]),
    rotation: spin(0.3),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.5 }),
  });

  // t=0: the skirt — dust racing out along the ground, flat to the deck, the
  // low ring that makes an impact read as an impact and not a puff of fog.
  const skirt = pop("skirt", {
    spawn: { burst: { count: [20 * power, 30 * power] }, on: disc({ r: 0.5 * power, lift: 0.06 }) },
    lifetime: [0.5, 0.85],
    init: { v: radial(7 * power).add(up(0.6)), size: range(0.25, 0.45) },
    accel: drag(4.5),
    size: attr("size").mul(power).mul(curve([0, 0.6], [1, 2.4])),
    color: rgb(0.45, 0.39, 0.3),
    alpha: curve([0, 0], [0.12, 0.4], [1, 0]),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.4 }),
  });

  // A beat later: clods. Real chunks of earth on a real arc, tumbling, landing
  // and skipping once — floor "bounce" with a per-clod restitution so they
  // clatter down at their own times instead of all at once.
  const clods = pop("clods", {
    spawn: { burst: { count: [10 * power, 18 * power] }, on: sphere({ radius: 0.2 * power }) },
    delay: 0.03,
    lifetime: [1.3, 2.2],
    init: { v: up(6.5 * power).add(cone(48).mul(range(2, 7 * power))), size: range(0.07, 0.18) },
    accel: gravity().add(drag(0.25)),
    floor: "bounce",
    bounce: range(0.15, 0.38),
    size: attr("size").mul(power),
    color: range(rgb(0.26, 0.21, 0.15), rgb(0.16, 0.13, 0.1)),
    alpha: curve([0, 1], [0.85, 1], [1, 0]),
    rotation: spin(2.4),
    render: sprite({ texture: "/cdn/effect-dirt-clod.png", blend: "alpha" }),
  });

  // The payoff: every clod that finishes its bouncing kicks its own little
  // ground-hugging puff where it stopped. That is what "settles" looks like.
  const settle = pop("settle", {
    spawn: when(clods.dies, 0.8),
    inherit: { p: clods.p },
    lifetime: [0.5, 0.9],
    init: { v: up(0.5).add(cone(70).mul(range(0.2, 0.8))), size: range(0.12, 0.22) },
    accel: drag(3.5),
    size: attr("size").mul(curve([0, 0.6], [1, 2.2])),
    color: rgb(0.44, 0.38, 0.3),
    alpha: curve([0, 0], [0.15, 0.4], [1, 0]),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.35 }),
  });

  return fx(puff, skirt, clods, settle);
}
