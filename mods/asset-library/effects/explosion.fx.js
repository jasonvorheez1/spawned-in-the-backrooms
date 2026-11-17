// Explosion Burst — a one-shot blast on a shared clock: glare, fireball, sparks a
// beat later, and a smoke ball handed off from the fireball wisps as they burn out.
// Every population bursts once or closes a window, so the whole thing winds itself
// down and the fx object reaps itself inside ~3s. params.power scales the blast.
const {
  fx,
  pop,
  attr,
  range,
  curve,
  curl,
  envelope,
  gravity,
  buoyancy,
  drag,
  blast,
  up,
  spin,
  when,
  hdr,
  rgb,
  sphere,
  sprite,
  light,
} = require("builtin/fx");

export function effect(ctx) {
  const power = ctx.params && typeof ctx.params.power === "number" ? ctx.params.power : 1;

  // t=0, 0.15s: the glare. A handful of huge additive discs and it's gone before
  // the eye has resolved it — that's what makes the fireball behind it read as hot.
  const flash = pop("flash", {
    spawn: { burst: { count: [3, 4] }, on: sphere({ radius: 0.1 }) },
    lifetime: 0.15,
    color: curve([0, hdr(14, 12, 8)], [0.4, hdr(8, 4.5, 1.6)], [1, hdr(3, 1.2, 0.35)]),
    alpha: curve([0, 1], [0.5, 0.8], [1, 0]),
    size: curve([0, 0.7 * power], [1, 2.1 * power]),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
  });

  // t=0: the body — ~40 wisps thrown hard and dragged to a stop, cooling white ->
  // orange -> smoke red across their 0.6s.
  const fireball = pop("fireball", {
    spawn: { burst: { count: [34 * power + 6, 44 * power + 6] }, on: sphere({ radius: 0.22 }) },
    lifetime: [0.42, 0.62],
    init: { v: blast(12 * power), size: range(0.3, 0.55) },
    accel: drag(5).add(buoyancy(1.8)).add(curl(0.6).mul(1.2)),
    size: attr("size").mul(curve([0, 0.5], [0.35, 1], [1, 1.5])),
    color: curve(
      [0, hdr(9, 7.5, 4)],
      [0.25, hdr(6, 3, 0.7)],
      [0.6, hdr(2.6, 0.8, 0.15)],
      [1, hdr(0.8, 0.18, 0.05)]
    ),
    alpha: curve([0, 0], [0.08, 1], [0.7, 0.9], [1, 0]),
    render: sprite({ texture: "/cdn/effect-flame-wisp.png", blend: "add" }),
  });

  // A beat later (0.04s): ~30 spark streaks kicked out and up, falling under gravity
  // and clattering off the ground on per-particle restitution.
  const sparks = pop("sparks", {
    spawn: { burst: { count: [24 * power + 6, 34 * power + 6] }, on: sphere({ radius: 0.14 }) },
    delay: 0.04,
    lifetime: [0.6, 1.1],
    init: { v: blast(9 * power).add(up(2.6)), size: range(0.03, 0.055) },
    accel: gravity().add(drag(0.5)),
    floor: "bounce",
    bounce: range(0.25, 0.5),
    size: attr("size").mul(curve([0, 1], [1, 0.45])),
    color: hdr(7, 5, 2).to(hdr(1.6, 0.32, 0.07)),
    alpha: curve([0, 0], [0.05, 1], [0.75, 0.9], [1, 0]),
    render: sprite({ texture: "/cdn/effect-spark-streak.png", blend: "add", align: "velocity", stretch: 0.05 }),
  });

  // The payoff: half the dying fireball wisps hand their position and a slice of
  // their outward run to a smoke ball, so the cloud rolls where the fire actually
  // went instead of puffing from the middle.
  const smokeball = pop("smokeball", {
    spawn: when(fireball.dies, 0.3),
    inherit: { p: fireball.p, v: fireball.v.mul(0.25) },
    lifetime: [1.4, 2.2],
    init: { size: range(0.35, 0.6) },
    accel: buoyancy(1).add(curl(0.3).mul(0.7)).add(drag(1.2)),
    size: attr("size").mul(curve([0, 0.8], [1, 2.4])),
    color: curve([0, rgb(0.32, 0.28, 0.25)], [1, rgb(0.13, 0.12, 0.11)]),
    alpha: curve([0, 0], [0.2, 0.45], [0.65, 0.3], [1, 0]),
    rotation: spin(0.25),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha" }),
  });

  // One light, one particle, one life: an envelope that spikes in 30ms and is gone
  // by half a second. A lifetime (not a persistent count pop) is what lets the whole
  // effect prove it is finished and reap itself.
  const blastlight = pop("blastlight", {
    spawn: { burst: { count: 1 } },
    lifetime: 0.5,
    render: light({
      color: rgb(1, 0.7, 0.38),
      intensity: envelope([0, 0], [0.03, 26 * power], [0.16, 9 * power], [0.5, 0]),
      radius: 9 + 3 * power,
    }),
  });

  return fx(flash, fireball, sparks, smokeball, blastlight);
}
