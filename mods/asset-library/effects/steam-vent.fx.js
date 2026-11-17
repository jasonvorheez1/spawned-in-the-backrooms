// Steam Vent — pressure escaping: a narrow white jet that leaves the nozzle at 6 m/s,
// loses it to drag inside two metres, and hands off into a soft cloud that blooms and
// climbs. The spawn rate rides slow noise so it pulses like a valve breathing rather
// than a hose left on. No light — steam scatters, it doesn't emit.
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
  noise,
  time,
  spin,
  when,
  rgb,
  disc,
  sprite,
} = require("builtin/fx");

export function effect(ctx) {
  const nozzle = disc({ r: 0.07 });

  // Emitter-scope only: slow noise pushed through a smoothstep, so the valve sits
  // near-shut for a beat and then lets go — a pulse, not a sine wave.
  const valve = noise(time().mul(0.45)).smoothstep(0.28, 0.72);

  // The jet: tight 12-degree cone, fast out of the nozzle, killed by heavy drag.
  // Short lives keep it a jet — the bloom is the cloud's job, not this one's.
  const jet = pop("jet", {
    spawn: { rate: valve.mul(85).add(12), on: nozzle },
    lifetime: [0.45, 0.8],
    init: { v: up(6).add(cone(12).mul(range(0.3, 1.1))), size: range(0.09, 0.16) },
    accel: drag(3.2).add(buoyancy(0.6)).add(curl(0.7).mul(0.4)),
    size: attr("size").mul(curve([0, 0.5], [0.4, 1.4], [1, 2.6])),
    color: rgb(0.95, 0.96, 0.98),
    alpha: curve([0, 0], [0.1, 0.35], [1, 0.14]),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.5 }),
  });

  // The cloud: most spent jet particles hand their position and a quarter of their
  // run to a slow puff that widens and lifts away. Peak alpha stays low so it reads
  // as scald-white vapour instead of a fog bank.
  const cloud = pop("cloud", {
    spawn: when(jet.dies, 0.45),
    inherit: { p: jet.p, v: jet.v.mul(0.25) },
    lifetime: [1.2, 2],
    init: { size: range(0.26, 0.44) },
    accel: buoyancy(0.55).add(curl(0.35).mul(0.6)).add(drag(1)),
    size: attr("size").mul(curve([0, 1], [1, 3.2])),
    color: curve([0, rgb(0.94, 0.95, 0.97)], [1, rgb(0.78, 0.81, 0.85)]),
    alpha: curve([0, 0], [0.25, 0.3], [0.7, 0.2], [1, 0]),
    rotation: spin(0.12),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.7 }),
  });

  return fx(jet, cloud);
}
