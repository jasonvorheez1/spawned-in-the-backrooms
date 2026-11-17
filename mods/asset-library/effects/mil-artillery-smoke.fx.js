// Artillery Smoke — the column that stands over a shelled position: a tight
// black throat at the ground, a body that climbs to about 20 m, and a boiling
// grey crown that leans off downwind as it goes.
//
// Height is honest: the body climbs on a buoyancy/drag terminal, so
// params.height is solved into that terminal rather than guessed —
// terminal = height / mean lifetime, climb = terminal * drag.
//
// params.height  metres to the top of the column (default 20)
// params.heading degrees the smoke leans toward (0 = -Z, engine yaw sense)
// params.wind    0 = a dead-still pillar, 1 = a working breeze, 2 = a gale
// params.rate    how hard the position is burning (0..1+)
const { fx, pop, attr, range, curve, curl, buoyancy, drag, gravity, cone, up, vec3, flicker, spin, rgb, when, disc, sprite } = require("builtin/fx");

export function effect(ctx) {
  const p = ctx.params || {};
  const height = typeof p.height === "number" ? p.height : 20;
  const heading = typeof p.heading === "number" ? p.heading : 40;
  const wind = typeof p.wind === "number" ? p.wind : 1;
  const rate = typeof p.rate === "number" ? p.rate : 1;

  // Solve the climb out of the height the card asked for.
  const LIFE = [4.4, 6.2];
  const meanLife = (LIFE[0] + LIFE[1]) / 2;
  const dragK = 0.62;
  const climb = (height / meanLife) * dragK;

  // A constant sideways acceleration under the same drag settles into a steady
  // downwind drift: the column leans instead of standing like a chimney.
  const rad = (heading * Math.PI) / 180;
  const lean = vec3(-Math.sin(rad) * 1.5 * wind, 0, -Math.cos(rad) * 1.5 * wind);

  const seat = disc({ r: 0.9, jitter: 0.35 });

  // The throat: small, fast, near-black puffs right on the deck. They give the
  // column a waist, so everything above reads as rising out of something.
  const throat = pop("throat", {
    spawn: { rate: flicker(0.45, 0.3).mul(30 * rate), on: disc({ r: 0.45, jitter: 0.3 }) },
    lifetime: [0.9, 1.6],
    init: { v: up(4.5).add(cone(16).mul(range(0.3, 1.1))), size: range(0.5, 0.9) },
    accel: buoyancy(2.2).add(curl(0.5).mul(0.9)).add(drag(1.5)).add(lean.mul(0.4)),
    size: attr("size").mul(curve([0, 0.5], [1, 2.1])),
    color: curve([0, rgb(0.09, 0.085, 0.08)], [1, rgb(0.14, 0.13, 0.12)]),
    alpha: curve([0, 0], [0.15, 0.62], [1, 0]),
    rotation: spin(0.25),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.5 }),
  });

  // The column: long-lived puffs riding the solved terminal all the way up,
  // swelling as they climb and thinning from soot toward ash.
  const column = pop("column", {
    spawn: { rate: flicker(0.3, 0.28).mul(20 * rate), on: seat },
    lifetime: LIFE,
    init: { v: up(climb * 1.6).add(cone(20).mul(range(0.2, 0.8))), size: range(1.1, 1.8) },
    accel: buoyancy(climb).add(curl(0.18).mul(0.8)).add(drag(dragK)).add(lean),
    size: attr("size").mul(curve([0, 0.35], [0.4, 1.3], [1, 3.2])),
    color: curve([0, rgb(0.1, 0.095, 0.09)], [0.45, rgb(0.16, 0.15, 0.14)], [1, rgb(0.26, 0.25, 0.24)]),
    alpha: curve([0, 0], [0.16, 0.44], [0.66, 0.3], [1, 0]),
    rotation: spin(0.09),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 1.1 }),
  });

  // The crown: where the column runs out of lift it boils sideways and pales
  // out. Chained off the body's deaths, so it sits exactly at the top.
  const crown = pop("crown", {
    spawn: when(column.dies, 0.45),
    inherit: { p: column.p, v: column.v.mul(0.35) },
    lifetime: [2.6, 4.2],
    init: { size: range(2.2, 3.4) },
    accel: buoyancy(0.35).add(curl(0.12).mul(0.7)).add(drag(0.5)).add(lean.mul(1.4)),
    size: attr("size").mul(curve([0, 1], [1, 2.2])),
    color: curve([0, rgb(0.27, 0.26, 0.25)], [1, rgb(0.36, 0.35, 0.34)]),
    alpha: curve([0, 0], [0.2, 0.24], [0.7, 0.17], [1, 0]),
    rotation: spin(0.06),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 1.4 }),
  });

  // Dirt and shell-flecks flung out of the seat and falling back — the detail
  // that says a gun did this, not a chimney.
  const flecks = pop("flecks", {
    spawn: { rate: 6 * rate, on: seat, burst: { count: [3, 7], every: [0.9, 2.2] } },
    lifetime: [0.9, 1.7],
    init: { v: up(6).add(cone(40).mul(range(1.5, 5))), size: range(0.05, 0.12) },
    accel: gravity().add(drag(0.35)),
    size: attr("size"),
    color: rgb(0.14, 0.12, 0.1),
    alpha: curve([0, 0.9], [0.8, 0.8], [1, 0]),
    rotation: spin(1.6),
    render: sprite({ texture: "/cdn/effect-dirt-clod.png", blend: "alpha", align: "velocity", stretch: 0.02 }),
  });

  return fx(throat, column, crown, flecks);
}
